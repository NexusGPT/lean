// a unit without a parent is loaded and observed, never compared for equality
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire, isBuiltin } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ts, loadProgramOptions, topLevelFunctions } from '../common.mjs';
import { sandbox, pickUnit, observe, workerFlags, workerEnv, absentOutsideReads, scrubEnv } from './run.mjs';
import { Environment, BudgetError } from './fake.mjs';
import { specOf } from './spec.mjs';
import { inputsFor } from './gen.mjs';
import { netMode, denyNetwork, networkDenied, sandboxEntry } from './net-deny.mjs';

const here = fileURLToPath(import.meta.url);
const compile = { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, experimentalDecorators: true, emitDecoratorMetadata: false, importHelpers: false, jsx: ts.JsxEmit.ReactJSX };

// failure provenance separates repository linkage from the simulated execution environment
class LoadFailure extends Error {
  constructor(error, details) { super(error?.message ?? String(error)); this.original = error; Object.assign(this, details); }
}
const testModule = file => /(?:^|[/\\])__tests__(?:[/\\]|$)|\.(?:spec|test)\./.test(file);
const assetModule = file => /\.(css|scss|sass|less|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|md|txt|html|wasm)$/i.test(file);
const generatedOutput = file => /(?:^|[/\\])(?:__generated__|generated|dist|build)(?:[/\\]|$)|\.(?:generated|bundle)(?:\.[^/\\]+)?$/i.test(file);
const installedPath = file => /(?:^|[/\\])node_modules(?:[/\\]|$)/.test(file);
function aliasTargets(specifier, options) {
  return Object.entries(options.paths ?? {}).filter(([key]) => {
    const star = key.indexOf('*');
    return star < 0 ? key === specifier : specifier.startsWith(key.slice(0, star)) && specifier.endsWith(key.slice(star + 1));
  }).flatMap(([, targets]) => targets);
}
function sourceSpecifier(specifier, options) {
  if (installedPath(specifier)) return false;
  if (specifier.startsWith('.') || path.isAbsolute(specifier)) return true;
  const targets = aliasTargets(specifier, options);
  return targets.length > 0 && targets.every(target => !installedPath(target));
}

// source paths use TypeScript resolution; Node supplies errors for unresolved runtime specifiers
function resolveModule(specifier, from, options) {
  const found = ts.resolveModuleName(specifier, from, options, ts.sys).resolvedModule;
  // a declared package is provided by the recording environment, without running installed code
  const packageOf = name => name.startsWith('@') ? name.split('/').slice(0, 2).join('/') : name.split('/')[0];
  const packageNames = [packageOf(specifier), ...aliasTargets(specifier, options).filter(installedPath).map(target => packageOf(target.split(/node_modules[/\\]/).at(-1)))];
  if (!specifier.startsWith('.') && !path.isAbsolute(specifier)) {
    let dir = path.dirname(from);
    for (;;) {
      const manifest = path.join(dir, 'package.json');
      if (fs.existsSync(manifest)) {
        const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
        if (['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'].some(k => packageNames.some(name => Object.hasOwn(pkg[k] ?? {}, name)))) return { external: specifier };
      }
      const up = path.dirname(dir); if (up === dir) break; dir = up;
    }
  }
  if (found && !found.isExternalLibraryImport && !installedPath(found.resolvedFileName) && !/\.d\.[cm]?ts$/.test(found.resolvedFileName)) return { file: found.resolvedFileName };
  const req = createRequire(from);
  if (isBuiltin(specifier)) return { external: specifier };
  try {
    const file = req.resolve(specifier);
    return (specifier.startsWith('.') || path.isAbsolute(specifier)) && !installedPath(file) ? { file } : { external: specifier };
  } catch (error) {
    const local = sourceSpecifier(specifier, options);
    const environmentClass = !['MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND'].includes(error.code) ? 'module resolution' : generatedOutput(specifier) || found?.resolvedFileName.match(/\.d\.[cm]?ts$/) ? 'missing generated output' : assetModule(specifier) ? 'build asset' : !local ? 'undeclared external package' : null;
    throw new LoadFailure(error, { phase: 'link', environmentClass, link: { kind: 'unresolved source', from, specifier, local } });
  }
}

async function loadCandidate(file, env, options, ms, sources = new Map()) {
  const host = sandbox(env, path.dirname(file));
  const cache = new Map(), fakeNames = new Set(), edges = [];
  // external modules keep the recording fakes and React protocol of paired execution
  function fake(specifier, names) {
    fakeNames.add(specifier);
    const value = specifier === 'react' ? host.react : /^react\/jsx(-dev)?-runtime$/.test(specifier) ? host.jsxRuntime : env.module(specifier);
    const keys = [...new Set(['default', ...names])];
    return new vm.SyntheticModule(keys, function () { for (const key of keys) this.setExport(key, key === 'default' ? value : value[key]); }, { context: host.ctx, identifier: `fake:${specifier}` });
  }
  function moduleFor(abs) {
    abs = path.resolve(abs);
    if (testModule(abs)) throw new LoadFailure(new Error(`test module: ${abs}`), { phase: 'scope', environmentClass: 'test module' });
    if (cache.has(abs)) return cache.get(abs);
    if (/\.json$/.test(abs)) {
      const value = JSON.parse(fs.readFileSync(abs, 'utf8'));
      const mod = new vm.SyntheticModule(['default'], function () { this.setExport('default', value); }, { context: host.ctx, identifier: abs });
      cache.set(abs, mod); return mod;
    }
    let compiled = sources.get(abs);
    if (!compiled) {
      const src = fs.readFileSync(abs, 'utf8');
      const sf = ts.createSourceFile(abs, src, ts.ScriptTarget.Latest, true);
      // literal dynamic imports are checked even when their branch is not drawn; their modules are not evaluated here
      let commonjs = /\.c[jt]s$/.test(abs);
      function literals(n) {
        if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(n.left)) {
          const owner = n.left.expression;
          if ((ts.isIdentifier(owner) && owner.text === 'exports') || (ts.isIdentifier(owner) && owner.text === 'module' && n.left.name.text === 'exports')) commonjs = true;
        }
        if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments.length && ts.isStringLiteralLike(n.arguments[0])) resolveModule(n.arguments[0].text, abs, options);
        ts.forEachChild(n, literals);
      }
      literals(sf);
      const names = [...new Set([...topLevelFunctions(sf).values()].map(u => u.className ?? u.name))].filter((name) => /^[A-Za-z_$][\w$]*$/.test(name)); // the module's own bindings: a callback or a literal member (`describe()#1`, `ops.add`) is reached through its holder, never by name
      let js = ts.transpileModule(src, { compilerOptions: compile, fileName: abs }).outputText;
      let unitSlot = '__lean_units'; while (src.includes(unitSlot)) unitSlot += '_';
      js += `\nexport const ${unitSlot} = {${names.map(name => `${JSON.stringify(name)}: typeof ${name} === 'undefined' ? undefined : ${name}`).join(',')}};\n`;
      // decorators are observed but cannot replace the code being checked
      js = js.replace(/var __decorate = \(this && this\.__decorate\) \|\| function \(decorators, target, key, desc\) \{[\s\S]*?\n\};/,
        'var __decorate = function (decorators, target, key, desc) { var c = arguments.length, r = c < 3 ? target : desc === null ? Object.getOwnPropertyDescriptor(target, key) : desc; for (var i = decorators.length - 1; i >= 0; i--) { var d = decorators[i]; if (d) { try { c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key); } catch (e) { if (!(e && e.__isFake)) throw e; } } } return r; };');
      compiled = { js, unitSlot, commonjs, sf: ts.createSourceFile(abs, js, ts.ScriptTarget.Latest, true) };
      sources.set(abs, compiled);
    }
    const mod = new vm.SourceTextModule(compiled.js, {
      context: host.ctx, identifier: abs,
      initializeImportMeta(meta) {
        meta.url = pathToFileURL(abs).href;
        Object.defineProperty(meta, 'env', { get() { throw new LoadFailure(new Error(`import.meta.env is build-injected in ${abs}`), { environmentClass: 'build-injected env' }); } });
      },
      async importModuleDynamically(specifier) {
        const dep = await link(specifier, mod);
        if (dep.status === 'unlinked') await dep.link(link);
        if (dep.status === 'linked') await dep.evaluate({ timeout: ms });
        return dep;
      },
    });
    mod.leanSource = compiled.sf; mod.leanUnitSlot = compiled.unitSlot; mod.leanCommonJs = compiled.commonjs;
    cache.set(abs, mod); return mod;
  }
  async function link(specifier, referencing) {
    const resolved = resolveModule(specifier, referencing.identifier, options);
    if (resolved.file && !assetModule(resolved.file)) {
      const dependency = moduleFor(resolved.file);
      edges.push({ kind: 'missing named export', from: referencing.identifier, specifier, target: resolved.file, local: true, ...(dependency.leanCommonJs ? { commonjs: true } : {}) });
      return dependency;
    }
    const names = [];
    for (const st of referencing.leanSource?.statements ?? []) {
      if (!st.moduleSpecifier || st.moduleSpecifier.text !== specifier) continue;
      const bindings = st.importClause?.namedBindings ?? st.exportClause;
      if (bindings && (ts.isNamedImports(bindings) || ts.isNamedExports(bindings))) for (const b of bindings.elements) names.push((b.propertyName ?? b.name).text);
    }
    const walk = n => {
      if (ts.isPropertyAccessExpression(n)) names.push(n.name.text);
      if (ts.isObjectBindingPattern(n)) for (const binding of n.elements) {
        const key = binding.propertyName ?? binding.name;
        if (!binding.dotDotDotToken && (ts.isIdentifier(key) || ts.isStringLiteralLike(key))) names.push(key.text);
      }
      ts.forEachChild(n, walk);
    };
    if (referencing.leanSource) walk(referencing.leanSource);
    return fake(specifier, names);
  }
  env.loading = true;
  let phase = 'link';
  try {
    const mod = moduleFor(file);
    await mod.link(link); // the Node linker checks actual local exports, including re-export chains and cycles
    phase = 'evaluation';
    await mod.evaluate({ timeout: ms });
    return { exports: { ...mod.namespace, __lean_units: mod.namespace[mod.leanUnitSlot] }, fakes: [...fakeNames] };
  } catch (error) {
    if (phase === 'evaluation') {
      const original = error instanceof LoadFailure ? error.original : error;
      const message = original?.message ?? String(original);
      let environmentClass = error instanceof LoadFailure ? error.environmentClass : null;
      if (!environmentClass && /\b(?:require|module|exports|__dirname|__filename) is not defined\b/.test(message)) environmentClass = 'CommonJS wrapper';
      if (!environmentClass && /\b(?:describe|it|test|expect|jest|vi|beforeEach|afterEach|beforeAll|afterAll) is not defined\b/.test(message)) environmentClass = 'test-runner globals';
      if (!environmentClass && /\b[A-Za-z_$][\w$]* is not defined\b/.test(message)) environmentClass = 'platform global';
      if (!environmentClass) environmentClass = env.trace.length || env.calls.size ? 'fake answering at module evaluation' : 'module evaluation';
      throw new LoadFailure(original, { phase, environmentClass });
    }
    if (error instanceof LoadFailure) throw error;
    const missing = error?.message?.match(/requested module ['"](.+?)['"] does not provide an export named ['"](.+?)['"]/);
    const link = missing && edges.find(edge => edge.specifier === missing[1]);
    if (link?.commonjs) throw new LoadFailure(error, { phase, environmentClass: 'CommonJS wrapper', link });
    throw new LoadFailure(error, { phase, ...(link ? { link: { ...link, export: missing[2] } } : { environmentClass: 'module preparation' }) });
  } finally { env.loading = false; }
}

// only proven local linkage failures refuse; evaluation under the simulated world stays undecided
function loadFailure(base, failure, inputs, bound) {
  const error = failure instanceof LoadFailure ? failure.original : failure;
  const message = error?.message ?? String(error);
  const phase = failure.phase ?? 'preparation';
  let environmentClass = failure.environmentClass;
  if (error instanceof BudgetError || error?.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') environmentClass = 'load budget';
  const refuse = phase === 'link' && failure.link?.local && !environmentClass;
  if (!refuse) environmentClass ??= 'module preparation';
  return { ...base, verdict: refuse ? 'REFUSE' : 'ASK', kind: 'load', phase, ...(environmentClass ? { environmentClass } : {}), ...(failure.link ? { link: failure.link } : {}), loaded: false, inputs,
    reason: `${base.file}: ${refuse ? '' : `ASK(${environmentClass}): `}${message}`, error: String(error?.stack ?? error), bound };
}

export async function runNew(opts) {
  const { candidate, unit, n = 200, seed = 1, ms = 2000, project = true } = opts;
  const base = { candidateOnly: true, unit, file: candidate, assumptions: { externalPackages: 'declared packages, their aliases and resolved node_modules targets are recording fakes; declared packages need no installation', sourceImports: 'local and aliased source resolve with TypeScript; named exports link with Node', undeclaredPackages: 'Node supplies the error; missing external packages are ASK, not repository linkage refusals', dynamicImports: 'literal specifiers are resolved before inputs; computed specifiers are checked only when drawn', loadVerdicts: 'REFUSE only for local linkage; generated/build output and all evaluation failures are ASK with their environment class; test modules are excluded before loading', observation: 'bounded inputs under fakes, no equality or correctness claim' } };
  if (!candidate || !unit) return { ...base, verdict: 'ASK', reason: '--candidate and --unit are required', loaded: false, inputs: 0 };
  if (testModule(candidate)) return { ...base, verdict: 'ASK', kind: 'scope', phase: 'scope', environmentClass: 'test module', reason: `ASK(test module): ${candidate}`, loaded: false, inputs: 0 };
  if (!Number.isInteger(n) || n < 1) return { ...base, verdict: 'ASK', reason: 'n must be a positive integer', loaded: false, inputs: 0 };
  // the unit's code runs in a child of its own, under the lane B worker's sandbox (design/sandbox-boundary.md): the
  // worker's flags (the permission model, its read trees, the network flag of the mode), its reduced environment, and vm
  // modules, enabled only for this runner. Only a process that already holds both runs the unit itself (that child)
  if (!vm.SourceTextModule || !process.permission) {
    const child = spawnSync(process.execPath, [...workerFlags(opts), '--experimental-vm-modules', here, JSON.stringify(opts)], { encoding: 'utf8', env: workerEnv(), timeout: Math.max(30000, n * ms + 10000), maxBuffer: 16 * 1024 * 1024 });
    if (child.stderr) process.stderr.write(child.stderr);
    try { return JSON.parse(child.stdout); }
    catch { return { ...base, verdict: 'ASK', reason: child.error?.message ?? `candidate runner exited ${child.status}: ${child.stdout}`, loaded: false, inputs: 0 }; }
  }
  const bound = { n, seed, ms, fakes: 'demand-driven proxies, seeded primitives, frozen clock', inputs: 'from parameter types with boundary values first' };
  if (netMode() === 'deny') denyNetwork(); // the network-denied mode (net-deny.mjs), under the permission model of this child; the result's sandbox entry says what holds it
  const abs = path.resolve(candidate);
  let options;
  const sources = new Map();
  try {
    const config = project === false ? null : typeof project === 'string' ? project : ts.findConfigFile(path.dirname(abs), ts.sys.fileExists, 'tsconfig.json');
    options = loadProgramOptions(abs, config).options;
    // project aliases remain relative to their defining config when workspace paths add a baseUrl
    if (config) {
      const raw = ts.readConfigFile(config, ts.sys.readFile);
      if (!raw.error) {
        const parsed = ts.parseJsonConfigFileContent(raw.config, ts.sys, path.dirname(config));
        const base = parsed.options.baseUrl ?? parsed.options.pathsBasePath ?? path.dirname(config);
        for (const [key, targets] of Object.entries(parsed.options.paths ?? {})) options.paths[key] = targets.map(target => path.resolve(base, target));
      }
    }
    await loadCandidate(abs, new Environment(seed * 7919), options, ms, sources);
  } catch (e) { return loadFailure(base, e, 0, bound); }
  let spec;
  try { spec = specOf(candidate, unit, { project, loaded: typeof opts.loaded === 'function' ? opts.loaded() : opts.loaded }); }
  catch (e) { return { ...base, verdict: 'ASK', reason: `spec: ${e.message}`, loaded: true, inputs: 0, bound }; }
  let faults = 0;
  const shapes = new Map(), fakes = new Set(), faultExamples = [];
  for (let i = 0; i < n; i++) {
    const env = new Environment(seed * 7919 + i); env.shapes = spec;
    let loaded;
    try { loaded = await loadCandidate(path.resolve(candidate), env, options, ms, sources); }
    catch (e) { return loadFailure(base, e, i, bound); }
    for (const f of loaded.fakes) fakes.add(f);
    const picked = pickUnit(loaded.exports, spec, env);
    if (!picked) return { ...base, verdict: 'ASK', loaded: true, inputs: i, reason: `unit ${unit} not callable`, bound };
    await new Promise(r => setImmediate(r));
    env.trace.length = 0; env.pending.length = 0; env.calls.clear();
    const inputs = inputsFor(spec, seed, i, env);
    env.argPool = inputs.filter(x => x && (typeof x === 'object' || typeof x === 'function') && x.__isFake);
    const observation = await observe({ env, unit: picked }, spec, inputs, ms);
    if (observation.harness) return { ...base, verdict: 'ASK', loaded: true, inputs: i, faults, reason: `input ${i}: ${observation.harness}`, bound };
    if (Object.hasOwn(observation.outcome, 'threw')) { faults++; if (faultExamples.length < 3) faultExamples.push({ input: i, error: observation.outcome.threw }); }
    for (const [key, value] of env.cache) if (value && value.__isFake) fakes.add(key);
    const shape = { outcome: Object.hasOwn(observation.outcome, 'threw') ? 'threw' : 'returned', trace: observation.trace.map(({ op, path }) => ({ op, path })), pending: observation.pending.map(x => x.op) };
    const key = JSON.stringify(shape); const entry = shapes.get(key) ?? { ...shape, inputs: 0 }; entry.inputs++; shapes.set(key, entry);
  }
  return { ...base, verdict: 'NEW', loaded: true, inputs: n, seed, fakes: [...fakes].sort(), faults, faultExamples, traceShape: [...shapes.values()], bound, ...(networkDenied() ? { sandbox: sandboxEntry() } : {}) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === here) { scrubEnv(); absentOutsideReads(); console.log(JSON.stringify(await runNew(JSON.parse(process.argv[2])))); }
