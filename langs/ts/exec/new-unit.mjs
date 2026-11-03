// a unit without a parent is loaded and observed, never compared for equality
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire, isBuiltin } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ts, loadProgram, loadProgramOptions, parseProjectConfig, topLevelFunctions, resolveFrom } from '../common.mjs';
import { sandbox, pickUnit, observe, workerSandbox, workerFlagsFrom, workerEnv, absentOutsideReads, scrubEnv, boundedChild, stderrCause, inUnitRun } from './run.mjs';
import { guardSpawn, spawnRefusals } from './sandbox-list.mjs';
import { Environment, BudgetError, render, programBuilt, escapeEntry } from './fake.mjs';
import { admitted, member, mismatch, declaration, declaredThrow, edgePlan, edgeInput } from './declared.mjs';
import { runTests, TEST_MODULES } from './new-tests.mjs';
import { specOf, HANDED_CALL } from './spec.mjs';
import { inputsFor } from './gen.mjs';
import { branchTable, reachTable, probeKeys, branchMarks, unitBranches } from './search.mjs';
import { setProbes } from './run.mjs';
import { writeNewTest } from './new-test.mjs';
import { netMode, denyNetwork, networkDenied, sandboxEntry } from './net-deny.mjs';
import { broken } from '../break.mjs'; // the one --break convention (A6; names in tests/break.mjs)
import { makeReach } from '../reach.mjs'; // the code a unit's run executes (unitWorld)

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
  const found = resolveFrom(specifier, from, options).resolvedModule; // (lane w9au) the file's own project, a workspace package's source
  // a declared package is provided by the recording environment, without running installed code
  const packageOf = name => name.startsWith('@') ? name.split('/').slice(0, 2).join('/') : /^[a-z][\w-]*:/.test(name) && !broken('w9bb-types-declared') ? name.split(':')[0] : name.split('/')[0]; // `bun:sqlite`: the runtime's package, bun
  // a module the project declares through its types package (lane w9bb): `@types/bun` declares `bun` and `bun:*`,
  // `@types/vscode` declares `vscode`: a module the host runtime supplies, never installed (DefinitelyTyped's names: `@a/b`
  // is `@types/a__b`). LEAN_BREAK=w9bb-types-declared: the package's own name only, `Cannot find module 'bun'`
  const typesOf = name => broken('w9bb-types-declared') ? [] : [`@types/${name.startsWith('@') ? name.slice(1).replace('/', '__') : name}`];
  const packageNames = [packageOf(specifier), ...aliasTargets(specifier, options).filter(installedPath).map(target => packageOf(target.split(/node_modules[/\\]/).at(-1)))].flatMap(name => [name, ...typesOf(name)]);
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

// the position of the first top-level statement of an emitted module that awaits (an await expression or a for await
// outside every function), or null: the module evaluates up to there before it waits on anything
const BODY_TURNS = 8;
function topLevelAwait(sf) {
  const awaits = (n) => { if (ts.isFunctionLike(n) || ts.isClassLike(n)) return false; if (ts.isAwaitExpression(n) || (ts.isForOfStatement(n) && n.awaitModifier)) return true; return !!ts.forEachChild(n, (c) => awaits(c) || undefined); };
  for (const st of sf.statements) if (awaits(st)) return st.getStart(sf);
  return null;
}
const lastWorld = (env) => { const t = env.trace[env.trace.length - 1]; return t ? `${t.op} ${t.path}` : 'none'; };

// (new-unit tests, design/new-unit-test.md) the reach probes of a candidate-only run: every line of the unit counts as
// changed, so its branches and statements are probed as the pair path probes a changed unit (search.mjs branchMarks,
// run.mjs siteState.b/.r through the probes map); the hooks read the state through a global of the module's context.
// LEAN_BREAK=new-reach: no probe, no statement reached
let newProbes = null;
// a file given by its text, under a path that holds no file: a proposed test (new-test.mjs), compiled as a module beside the unit
const virtualFiles = new Map();
export const setVirtual = (abs, text) => { virtualFiles.set(path.resolve(abs), text); };
function newUnitProbes(abs, unit) {
  if (broken('new-reach')) return null;
  const src = fs.readFileSync(abs, 'utf8');
  const sf = ts.createSourceFile(abs, src, ts.ScriptTarget.Latest, true, abs.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const u = topLevelFunctions(sf).get(unit); const node = u && (u.node ?? u.fn);
  if (!node) return null;
  const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
  const changed = new Set(); for (let L = lineOf(node.getStart(sf)); L <= lineOf(node.end); L++) changed.add(L);
  const table = branchTable(sf), statements = reachTable(sf, changed, table);
  for (const e of table) e.probe = e.start >= node.getStart(sf) && e.end <= node.end;
  const entry = { tag: 'C', table, reach: statements, keys: probeKeys('C', table, statements) };
  const own = unitBranches(sf, unit, table, changed, statements, true).statements.map((t) => `C:${t}`);
  const lines = Object.fromEntries(statements.map((r) => [`C:s${r.id}`, r.line]));
  let stateName = '__lean_site'; while (src.includes(stateName)) stateName += '_';
  return { abs, entry, statements: own, lines, stateName };
}

// ----- (lane w9am, design/w9am-handed-functions.md) what a test needs of a call that handed out a function or called one -----
// The formal parameters a handed-out function can see: a driven function is called on DRIVE_ARGS drawn arguments
// (run.mjs driveOne), and an argument past its formals is one no code of it can read when it declares no rest parameter
// and never names `arguments`; so a test passes the formals' arguments alone and calls it as lean did. null: every
// argument counts (a rest parameter, `arguments`, a text that does not parse)
const formalsSeen = new Map(); // the function's text -> its formals: a closure is made anew on every input
export function formalsOf(fn) {
  let src; try { src = Function.prototype.toString.call(fn); } catch { return null; }
  if (!formalsSeen.has(src)) { if (formalsSeen.size > 5000) formalsSeen.clear(); formalsSeen.set(src, formalsOfText(src)); }
  return formalsSeen.get(src);
}
function formalsOfText(src) {
  if (/\barguments\b/.test(src) || /\[native code\]/.test(src)) return null;
  for (const text of [`(${src})`, `({ ${src} })`, `(class { ${src} })`]) {
    const sf = ts.createSourceFile('formals.js', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    if (sf.parseDiagnostics?.length) continue;
    let fnNode = null; const find = (n) => { if (fnNode) return; if (ts.isFunctionLike(n) && n.parameters) { fnNode = n; return; } ts.forEachChild(n, find); }; find(sf);
    if (!fnNode) continue;
    if (fnNode.parameters.some((p) => p.dotDotDotToken)) return null;
    return fnNode.parameters.length;
  }
  return null;
}
const asyncFn = (fn) => { try { return /^Async/.test(Object.getPrototypeOf(fn)?.constructor?.name ?? ''); } catch { return false; } };
// the observation's drives as a test restates them: each record with its function's formals and whether it is async
// (LEAN_BREAK=new-test-drives: the writer keeps no case whose call handed out a function, new-test.mjs usableCase)
function drivesOf(drives, env) {
  return (drives ?? []).map((rec) => { const k = /^#(\d+)$/.exec(rec.$fn ?? '')?.[1]; const fn = k === undefined ? null : escapeEntry(env, Number(k))?.fn ?? null; return { ...rec, formals: fn ? formalsOf(fn) : null, async: fn ? asyncFn(fn) : false }; });
}
// The drive's draws by type: on the candidate-only path a driven function is found in what the unit returned (by
// identity, through own data members and elements), or in what a drive of a function found so returned, and its
// arguments are drawn by the declared parameter types at that route (spec.mjs handedParams, run.mjs driveOne), so a
// test can call it as its type lets a caller; a method is called on the value that holds it (`out.m()` binds `out`), as
// the test calls it. A function found nowhere (held by the module, handed to the world) keeps lean's drawn arguments and
// its drawn `this`. No pair sets the hook. LEAN_BREAK=new-test-drive-types: none
export function handedDraws(env, handedParams) {
  if (!handedParams || broken('new-test-drive-types')) return;
  const results = []; // [{ value, route }]: what each call of a found function returned, the route a call of it starts
  const find = (root, base, fn) => {
    const seen = new Set(), queue = [[root, base, undefined]];
    while (queue.length) {
      const [v, at, holder] = queue.shift();
      if (v === fn) return { route: at, holder };
      if (!v || typeof v !== 'object' || v.__isFake || seen.has(v) || at.length - base.length > 6 || seen.size > 2000) continue;
      seen.add(v);
      if (Array.isArray(v)) { v.forEach((x, i) => queue.push([x, [...at, i], v])); continue; }
      let keys; try { keys = Object.keys(v); } catch { continue; }
      for (const k of keys) { let d; try { d = Object.getOwnPropertyDescriptor(v, k); } catch { continue; } if (d && Object.hasOwn(d, 'value')) queue.push([d.value, [...at, k], v]); }
    }
    return null;
  };
  const routes = new Map();
  const locate = (fn) => { if (routes.has(fn)) return routes.get(fn); let r = find(env.handedRoot, [], fn); for (let j = 0; !r && j < results.length; j++) r = find(results[j].value, results[j].route, fn); routes.set(fn, r); return r; };
  env.handedAt = (fn) => { const r = locate(fn); return r ? { params: handedParams(r.route), holder: r.holder } : null; };
  env.handedResult = (fn, value) => { const r = routes.get(fn); if (r && value && (typeof value === 'object' || typeof value === 'function')) results.push({ value, route: [...r.route, HANDED_CALL] }); };
}
// The callbacks a call was handed: every function argument lean drew is a fake (gen.mjs `function`: a path ending `#fn`),
// and a call of it is a request of the world, so such a call is not closed. When every request the call made is a call
// of one of them, on arguments that print as values and hold no function of the unit's (lean's fake runs a function it is
// handed, a spy does not), and each answer wrote nothing into what it was handed, the call is
// a case a test restates with a spy per callback that answers what lean's fake answered, in call order, and asserts the
// calls (new-test.mjs). The case is the test's alone: it is not a closed call, so no other fact of the unit reads it.
// null: some request is not such a call. LEAN_BREAK=new-test-callbacks: no callback case
const FN_FAKE = /#fn$/;
// every request a case made, in time order: the call's own, then each drive's (its calls, then its omitted forms')
export const requestsOf = (o) => [...(o.trace ?? []), ...(o.drives ?? []).flatMap((d) => [...(d.trace ?? []), ...(d.omitted ?? []).flatMap((x) => x.trace ?? [])])];
function fakePathsOf(v, out = new Set(), depth = 0) {
  if (!v || typeof v !== 'object' || depth > 12) return out;
  if (typeof v.$fake === 'string') { out.add(v.$fake); return out; }
  for (const x of Array.isArray(v) ? v : Object.values(v)) fakePathsOf(x, out, depth + 1);
  return out;
}
// `others` (lane w9as): a request that is no call of a drawn callback is left to the world's stubs (new-test.mjs worldOf),
// which answer it or refuse the case; without it such a request makes the call no callback case.
// LEAN_BREAK=new-test-callback-stubs: never `others`, so a callback's calls beside a stubbed request get no spy
export function callbackCalls(shown, trace, env, { others = false } = {}) {
  if (broken('new-test-callbacks')) return trace.length ? null : [];
  const paths = [...fakePathsOf(shown)].filter((p) => FN_FAKE.test(p));
  const calls = new Map(paths.map((p) => [p, []])), seen = new Map();
  for (const t of trace) {
    if (t.op !== 'call' || !calls.has(t.path)) { if (others) continue; return null; }
    if (JSON.stringify(t.args ?? []).includes('"$fn"')) return null; // the unit hands the callback a function: lean's fake runs it, a spy would not
    const k = (seen.get(t.path) ?? 0) + 1; seen.set(t.path, k);
    const a = env.callAnswers?.get(`${t.path}()#${k}`);
    if (!a || a.wrote) return null;
    calls.get(t.path).push({ args: t.args, returned: render(a.value) });
  }
  return paths.map((p) => ({ path: p, calls: calls.get(p) }));
}

// `extra`: a test file read as the unit's PR-added test (new-tests.mjs): `allow` the test modules it may load, `globals`
// the runner's globals (describe, it, expect) set on the context, `modules` the runner's own modules ('vitest' and its kin)
export async function loadCandidate(file, env, options, ms, sources = new Map(), extra = {}) {
  const host = sandbox(env, path.dirname(file));
  if (newProbes) vm.runInContext('globalThis', host.ctx)[newProbes.stateName] = env.siteState; // the probes' state (new-unit tests)
  if (extra.globals) { const g = vm.runInContext('globalThis', host.ctx); for (const [k, v] of Object.entries(extra.globals)) g[k] = v; }
  extra.onContext?.(vm.runInContext('globalThis', host.ctx)); // (lane w9al) a proposed test's stubs set the unit's globals (new-tests.mjs makeMocks)
  const cache = new Map(), fakeNames = new Set(), edges = [];
  extra.onReset?.(() => { for (const k of [...cache.keys()]) if (k !== path.resolve(file)) cache.delete(k); }); // (lane w9bg) a test's `vi.resetModules()`: every module but the test's own evaluates afresh when next imported
  // external modules keep the recording fakes and React protocol of paired execution
  function fake(specifier, names) {
    fakeNames.add(specifier);
    const value = specifier === 'react' ? host.react : /^react\/jsx(-dev)?-runtime$/.test(specifier) ? host.jsxRuntime : env.module(specifier);
    const keys = [...new Set(['default', ...names])];
    return new vm.SyntheticModule(keys, function () { for (const key of keys) this.setExport(key, key === 'default' ? value : value[key]); }, { context: host.ctx, identifier: `fake:${specifier}` });
  }
  function moduleFor(abs) {
    abs = path.resolve(abs);
    if (testModule(abs) && !extra.allow?.has(abs)) throw new LoadFailure(new Error(`test module: ${abs}`), { phase: 'scope', environmentClass: 'test module' });
    if (cache.has(abs)) return cache.get(abs);
    if (/\.json$/.test(abs)) {
      const value = JSON.parse(fs.readFileSync(abs, 'utf8'));
      const mod = new vm.SyntheticModule(['default'], function () { this.setExport('default', value); }, { context: host.ctx, identifier: abs });
      cache.set(abs, mod); return mod;
    }
    let compiled = sources.get(abs);
    if (!compiled) {
      const src = virtualFiles.get(abs) ?? fs.readFileSync(abs, 'utf8');
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
      let js = ts.transpileModule(src, { compilerOptions: compile, fileName: abs, ...(newProbes && newProbes.abs === abs ? { transformers: { before: [branchMarks(newProbes.entry.table, abs, newProbes.stateName, newProbes.entry.reach)] } } : {}) }).outputText;
      let unitSlot = '__lean_units'; while (src.includes(unitSlot)) unitSlot += '_';
      // a module whose top level awaits (a script that asks a server, then polls it): the harness reads its units while
      // the body waits at an await, as run.mjs's loader does (lane w9ab). The surface is a function declaration, which the
      // module holds from its link on, each unit a getter that reads its binding when picked (one still uninitialised reads
      // as undefined); `awaitFlag` is set just before the first top-level statement that awaits, so a rejection after it is
      // the body's reaction to what the world answered, never its load. LEAN_BREAK=await-units: the surface is a constant
      // written at the body's end, and the whole evaluation is awaited, as before
      const firstAwait = broken('await-units') ? null : topLevelAwait(ts.createSourceFile(abs, js, ts.ScriptTarget.Latest, true));
      let awaitFlag = null;
      if (firstAwait) { awaitFlag = `${unitSlot}_awaited`; js = `${js.slice(0, firstAwait)}${awaitFlag} = true; ${js.slice(firstAwait)}\nvar ${awaitFlag};\nexport function ${awaitFlag}_at() { return ${awaitFlag} === true; }\n`; }
      if (broken('await-units')) js += `\nexport const ${unitSlot} = {${names.map(name => `${JSON.stringify(name)}: typeof ${name} === 'undefined' ? undefined : ${name}`).join(',')}};\n`;
      else js += `\nexport function ${unitSlot}() { const u = {}; ${names.map(name => `Object.defineProperty(u, ${JSON.stringify(name)}, { enumerable: true, configurable: true, get: () => { try { return typeof ${name} === 'undefined' ? undefined : ${name}; } catch (e) { return undefined; } } });`).join(' ')} return u; }\n`;
      // decorators are observed but cannot replace the code being checked
      js = js.replace(/var __decorate = \(this && this\.__decorate\) \|\| function \(decorators, target, key, desc\) \{[\s\S]*?\n\};/,
        'var __decorate = function (decorators, target, key, desc) { var c = arguments.length, r = c < 3 ? target : desc === null ? Object.getOwnPropertyDescriptor(target, key) : desc; for (var i = decorators.length - 1; i >= 0; i--) { var d = decorators[i]; if (d) { try { c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key); } catch (e) { if (!(e && e.__isFake)) throw e; } } } return r; };');
      compiled = { js, unitSlot, awaitFlag, commonjs, sf: ts.createSourceFile(abs, js, ts.ScriptTarget.Latest, true) };
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
    mod.leanSource = compiled.sf; mod.leanUnitSlot = compiled.unitSlot; mod.leanAwaitFlag = compiled.awaitFlag; mod.leanCommonJs = compiled.commonjs;
    cache.set(abs, mod); return mod;
  }
  async function link(specifier, referencing) {
    if (extra.modules && Object.hasOwn(extra.modules, specifier)) { const value = extra.modules[specifier]; const keys = [...new Set(['default', ...Object.keys(value)])]; return new vm.SyntheticModule(keys, function () { for (const key of keys) this.setExport(key, key === 'default' ? value.default ?? value : value[key]); }, { context: host.ctx, identifier: `runner:${specifier}` }); }
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
    // (lane w9bg) a script's body observed as its unit's run (scriptCases): the world answers it as it answers a call,
    // every request entered among the answers, the body awaited until it settles or waits on work no turn runs
    if (extra.body) {
      env.loading = false; if (newProbes) env.siteState.hits = new Set(); // the statements the body completes
      let state = 0, failure;
      try { mod.evaluate({ timeout: ms }).then(() => { state = 1; }, (e) => { state = 2; failure = e; }); } catch (e) { state = 2; failure = e; }
      for (let turn = 0; turn < BODY_TURNS * 4 && !state; turn++) await new Promise((r) => setImmediate(r));
      return { exports: {}, fakes: [...fakeNames], loadTrace: [], graph: [...cache.keys()], body: state === 1 ? { state: 'fulfilled' } : state === 2 ? { state: 'rejected', error: failure } : { state: 'pending', at: lastWorld(env) } };
    }
    const evaluation = mod.evaluate({ timeout: ms });
    let body = null; // a body that awaits at its top level: 'pending' (it waits on the world still), or the error it rejected with after its first await
    if (mod.leanAwaitFlag) {
      let state = 0, failure;
      evaluation.then(() => { state = 1; }, (e) => { state = 2; failure = e; });
      for (let turn = 0; turn < BODY_TURNS && !state; turn++) await new Promise((r) => setImmediate(r)); // the world's answers settle in turns
      if (state === 2 && !mod.namespace[`${mod.leanAwaitFlag}_at`]()) throw failure; // it failed before its first await: the load's failure, classified below
      if (state === 0) { body = { state: 'pending', at: lastWorld(env) }; env.timers.queue.length = 0; } // what it armed while loading is its paused continuation: never resumed inside a unit's observation
      else if (state === 2) body = { state: 'rejected', reason: String(failure?.message ?? failure).slice(0, 200) };
    } else await evaluation;
    const slot = mod.namespace[mod.leanUnitSlot];
    return { exports: { ...mod.namespace, __lean_units: typeof slot === 'function' ? slot() : slot }, fakes: [...fakeNames], loadTrace: env.trace.slice(), graph: [...cache.keys()], ...(body ? { body } : {}) };
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

// ----- (lane w9bg, design/w9bg-scripts.md) a script: a module that exports nothing -----
// No runner imports a binding of a script, so no test calls its units by name; the module's body is what runs them (a
// script reads its environment, builds requests and makes them, through the functions it defines). A test of such a unit
// imports the script itself under the stubs of lean's answers to the body's requests and asserts the requests it made.
// The cases are the body's own runs: the module evaluated SCRIPT_RUNS times, each in an environment seeded as an input
// is, the world answering the body as it answers a unit's call (every request entered among its answers, fake.mjs
// answerOf), the statements of the unit the body's calls complete recorded by the unit's probes.
// LEAN_BREAK=new-test-script: a script's unit is refused as before (not exported)
export const SCRIPT_RUNS = 40;
export function isScript(sf) {
  for (const st of sf.statements) {
    if (ts.isExportDeclaration(st) || ts.isExportAssignment(st)) return false;
    if (ts.canHaveModifiers(st) && (ts.getModifiers(st) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) return false;
  }
  let commonjs = false; // `module.exports = …`, `exports.x = …`: a CommonJS module exports through its wrapper
  const w = (n) => { if (commonjs) return; if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression) && (n.expression.text === 'exports' || (n.expression.text === 'module' && n.name.text === 'exports'))) commonjs = true; else ts.forEachChild(n, w); };
  w(sf);
  return !commonjs;
}
// the body's runs as cases (new-test.mjs writeNewTest `script`): the outcome is the import's (it completed, or the error
// it rejected with); a body that still waits after its turns (a timer it armed, a promise no answer settles) carries what
// it waits on as armed work, which no stub fires (worldOf refuses it, with that reason)
export async function scriptCases({ abs, options, ms, sources, seed, runs = SCRIPT_RUNS }) {
  const cases = [];
  for (let i = 0; i < runs; i++) {
    const env = new Environment(seed * 7919 + i); env.answers = [];
    let loaded; try { loaded = await loadCandidate(abs, env, options, ms, sources, { body: true }); } catch (e) { return { cases, refused: `the script did not link: ${String(e?.message ?? e).slice(0, 160)}` }; }
    const b = loaded.body;
    if (b.state === 'rejected' && (b.error instanceof BudgetError || b.error?.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT')) continue; // lean's bound, not the body's outcome
    const graph = graphWorld(loaded, sources); // the module graph's world a stub does not answer (a global read without a trap)
    const pending = [...env.pending.map((x) => x.op), ...(b.state === 'pending' ? [`nothing the body awaits at ${b.at}`] : [])];
    cases.push({ i, script: true, step: null, args: [], reached: newProbes ? newProbes.statements.filter((t) => env.siteState.hits?.has(t)) : null, outcome: b.state === 'rejected' ? { threw: render(b.error) } : { returned: { $undefined: true } }, drives: [], thenable: true, sync: false,
      world: { answers: env.answers, trace: env.trace.map(({ op, path: p, args }) => ({ op, path: p, args })), pending, graph } });
    env.answers = null;
  }
  return { cases };
}

// why the new unit's runner gave no result (lane w9bb): the bound lean stopped it at, with what that budget is made of, the
// CPU and wall time spent and the load; else its exit and the last words of its stderr (a heap's FATAL ERROR, an uncaught
// error), never an empty `exited 1:`. LEAN_BREAK=w9bb-runner-reason: the spawn's own message and the stdout, as before
export function runnerReason(child, { n, ms, seconds }) {
  if (broken('w9bb-runner-reason')) return child.stop ? 'spawnSync ' + process.execPath + ' ETIMEDOUT' : child.error?.message ?? `candidate runner exited ${child.status}: ${child.stdout}`;
  const s = child.stop;
  if (s) return `runner-bound: the candidate runner passed its ${s.why} bound of ${s.seconds} s (max(30 s, (n ${n} + ${TRIAL_RUNS} trial runs) x ${ms} ms + 10 s)) after ${s.wallSeconds} s of wall time and ${s.cpuSeconds} s of CPU time, one-minute load ${s.load} on ${s.cores} cores`;
  if (child.error) return `candidate runner did not start: ${child.error.message}`;
  const cause = stderrCause(child.stderr);
  return `candidate runner exited ${child.status ?? child.signal}${cause ? `: ${cause}` : ' with no stderr'}${String(child.stdout ?? '').trim() ? `; stdout: ${String(child.stdout).trim().slice(0, 200)}` : ''}`;
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
    const box = workerSandbox(opts); // the project's list (sandbox-list.mjs) holds this child as it holds the worker
    // the draws and the parameter trials (lane w9k) bound the runner's CPU time, the paired lane B's rule (run.mjs
    // boundedChild, lane w9bb); a stop or an exit with no result is ASK with the budget it hit or the child's own last words
    const seconds = Math.max(30, ((n + TRIAL_RUNS) * ms + 10000) / 1000);
    const child = await boundedChild(process.execPath, [...workerFlagsFrom(box.flags), '--experimental-vm-modules', here, JSON.stringify({ ...opts, sandboxList: undefined, ...(box.spawn ? { sandboxSpawn: box.spawn } : {}) })], { seconds, env: workerEnv(), maxBuffer: 16 * 1024 * 1024 });
    if (child.stderr) process.stderr.write(child.stderr);
    try { const r = JSON.parse(child.stdout); if (box.entry) r.sandboxList = box.entry(r.sandboxSpawned); delete r.sandboxSpawned; return r; }
    catch { return { ...base, verdict: 'ASK', reason: runnerReason(child, { n, ms, seconds }), ...(child.stop ? { bound: { ...child.stop, n, ms, trialRuns: TRIAL_RUNS } } : {}), loaded: false, inputs: 0 }; }
  }
  const bound = { n, seed, ms, fakes: 'demand-driven proxies, seeded primitives, frozen clock', inputs: 'from parameter types with boundary values first' };
  if (netMode() === 'deny') denyNetwork(); // the network-denied mode (net-deny.mjs), under the permission model of this child; the result's sandbox entry says what holds it
  if (opts.sandboxSpawn) guardSpawn(opts.sandboxSpawn); // the programs the project's list allows, named when refused
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
    newProbes = newUnitProbes(abs, unit); setProbes(newProbes ? new Map([[abs, newProbes.entry]]) : null);
    await loadCandidate(abs, new Environment(seed * 7919), options, ms, sources);
  } catch (e) { const r = loadFailure(base, e, 0, bound); return { ...r, records: [coverage('load', r.reason)] }; }
  let spec, reading, decl, nullable = false, exactOptional = false;
  try {
    reading = typeof opts.loaded === 'function' ? opts.loaded() : opts.loaded ?? loadProgram(candidate, { project });
    spec = specOf(candidate, unit, { project, loaded: reading });
  } catch (e) { return { ...base, verdict: 'ASK', reason: `spec: ${e.message}`, loaded: true, inputs: 0, bound, records: [coverage('spec', `the declaration could not be read: ${e.message}`)] }; }
  try {
    decl = declaration(reading.sf, unit, reading.checker);
    // the project's own null discipline: without strictNullChecks null and undefined are values of every declared type
    const own = reading.projectFile ? parseProjectConfig(reading.projectFile)?.options : null;
    nullable = !!own && !(own.strictNullChecks ?? own.strict ?? false);
    exactOptional = !!own?.exactOptionalPropertyTypes;
  } catch { decl = null; }
  const declared = decl?.overloaded ? null : spec.declared; // an overloaded unit is admitted through its overloads, which this reading does not take one by one
  const plan = declared ? edgePlan(declared) : [];
  const edges = Math.min(plan.length, Math.floor(n / 2)); // the edge inputs come first, at most half the inputs: the generator's draws keep the rest
  let faults = 0;
  const shapes = new Map(), fakes = new Set(), faultExamples = [];
  const book = recordBook();
  const bases = []; // closed calls that returned a value (the parameter trials, lane w9k)
  const cases = []; // every closed call, as a test restates it (new-test.mjs): its input, its outcome, the statements it completed
  const reach = { inputs: 0, admitted: 0, closed: 0, notAdmitted: 0, world: 0, worldOps: new Map(), graphWorld: null };
  const refused = []; let refusedReason = null; // the inputs whose drawn world the module's evaluation refused
  const stop = (extra) => ({ ...base, verdict: 'ASK', loaded: true, faults, bound, ...extra, records: [...book.list(), coverage('draw', extra.reason)], declaration: declarationRecord(decl, reach, nullable, edges) });
  for (let i = 0; i < n; i++) {
    const env = new Environment(seed * 7919 + i); env.shapes = spec;
    let loaded;
    try { loaded = await loadCandidate(path.resolve(candidate), env, options, ms, sources); }
    catch (e) {
      // the module loaded in the first environment (above) and its evaluation refuses this input's drawn world (a script
      // whose top level throws when a drawn variable is absent): not an input the unit can be called on, so it is skipped
      // and counted, never the unit's verdict; every input refused is the load's ASK, as before (lane w9ab)
      if (e instanceof LoadFailure && e.phase === 'evaluation' && !(e.original instanceof BudgetError) && !broken('await-units')) { refused.push(i); refusedReason ??= loadFailure(base, e, i, bound).reason; if (refused.length < n) continue; }
      const r = loadFailure(base, e, i, bound); return { ...r, records: [...book.list(), coverage('load', r.reason)] };
    }
    for (const f of loaded.fakes) fakes.add(f);
    if (loaded.body && !bound.moduleBody) bound.moduleBody = loaded.body; // the module's top level waits at an await, or rejected after it: its units ran all the same (lane w9ab)
    // the module graph holds world values when it links a package lean fakes, its evaluation asked the world, or its code
    // names a global the sandbox answers with a handle (a test of a handle's truth or type runs no trap, so no trace sees it)
    // (lane w9k) the unit's own reach decides when it is read; the module graph's rule stands where it is not
    if (reach.graphWorld === null) { let own = null; try { own = unitWorld(reading, unit, loaded, options); } catch { own = null; } reach.rule = own ? 'unit' : 'graph'; reach.graphWorld = own ?? graphWorld(loaded, sources); }
    const picked0 = pickUnit(loaded.exports, spec, env);
    if (!picked0) return { ...base, verdict: 'ASK', loaded: true, inputs: i, reason: `unit ${unit} not callable`, bound, records: [...book.list(), coverage('draw', `unit ${unit} not callable`)] };
    let sync = false, thenable = false; // a throw before the call returned, or a promise it returned: a rejection is a fault too
    const picked = { ...picked0, call: (args) => { let r; try { r = picked0.call(args); } catch (e) { sync = true; throw e; } try { thenable = !!r && (typeof r === 'object' || typeof r === 'function') && typeof r.then === 'function'; } catch { /* a value that refuses its members */ } return r; } };
    await new Promise(r => setImmediate(r));
    env.trace.length = 0; env.pending.length = 0; env.calls.clear();
    const step = i < edges ? plan[i] : null;
    const drawn = inputsFor(spec, seed, i, env);
    const inputs = step ? edgeInput(drawn, step) : drawn;
    env.argPool = inputs.filter(x => x && (typeof x === 'object' || typeof x === 'function') && x.__isFake);
    const shown = inputs.map((x) => render(x)); // the input as the record names it, before the call may write into it
    if (newProbes) env.siteState.hits = new Set(); // the statements the call completes, not the load
    env.callAnswers = new Map(); // what each call of a fake answered (lane w9am: a callback's spy answers the same)
    handedDraws(env, spec.handedParams);
    if (!broken('new-test-world')) env.answers = []; // (lane w9al) the world's answers to this call, its drives' included, in request order (fake.mjs answerOf)
    const observation = await observe({ env, unit: picked }, spec, inputs, ms);
    const answers = env.answers ?? []; env.answers = null;
    if (observation.harness) return stop({ inputs: i, reason: `input ${i}: ${observation.harness}` });
    const threw = Object.hasOwn(observation.outcome, 'threw');
    if (threw) { faults++; if (faultExamples.length < 3) faultExamples.push({ input: i, error: observation.outcome.threw }); }
    for (const [key, value] of env.cache) if (value && value.__isFake) fakes.add(key);
    const shape = { outcome: threw ? 'threw' : 'returned', trace: observation.trace.map(({ op, path }) => ({ op, path })), pending: observation.pending.map(x => x.op) };
    const key = JSON.stringify(shape); const entry = shapes.get(key) ?? { ...shape, inputs: 0 }; entry.inputs++; shapes.set(key, entry);
    // the declaration's reading of this input (design/w1h-new-units.md): a record is a fact only about a call the
    // declaration admits and the world did not answer
    reach.inputs++;
    const ok = !declared ? 'unknown' : broken('admitted-input') ? 'yes' : admitted(declared, inputs, { nullable, exactOptional });
    if (ok !== 'yes') { reach.notAdmitted++; continue; }
    reach.admitted++;
    const world = broken('closed-call') ? [] : [...reach.graphWorld, ...observation.trace.map(({ op, path }) => `${op} ${path}`)];
    // every admitted call is a case (new-test.mjs): a closed one as it ran; one that asked the world with what the world
    // answered (lane w9al), so its test stubs those answers; the drives of what it handed out (lane w9am), whose requests
    // are the case's world too (lane w9as: the stubs answer them in request order); the calls of a callback it was handed
    // (lane w9am), which the test's spy answers. A case's value is the one the call returned, before the drives called what
    // it handed out (they may write into it). A closed call that drew Math.random carries its draws in its world.
    const requests = requestsOf(observation);
    const caseOf = (callbacks) => ({ i, step, args: shown, reached: newProbes ? newProbes.statements.filter((t) => env.siteState.hits?.has(t)) : null, outcome: threw ? { threw: render(observation.raw?.threw), declared: !!declaredThrow(decl, observation.raw?.threw) } : { returned: observation.drives?.length ? observation.outcome.returned : render(observation.raw?.returned) }, drives: drivesOf(observation.drives, env), ...(callbacks?.length ? { callbacks } : {}), thenable, sync,
      ...(world.length || answers.length || requests.length ? { world: { answers, trace: requests.map(({ op, path: p, args }) => ({ op, path: p, args })), pending: [...observation.pending.map((x) => x.op), ...(observation.drives ?? []).flatMap((d) => (Array.isArray(d.pending) ? d.pending.map((x) => x?.op ?? 'pending') : d.pending ? ['pending'] : []))], graph: reach.graphWorld } } : {}) });
    const joint = !broken('new-test-world') && !broken('new-test-callback-stubs'); // (lane w9as) a callback's calls beside requests the world's stubs answer
    if (world.length) {
      reach.world++; for (const w of world.slice(0, 3)) reach.worldOps.set(w, (reach.worldOps.get(w) ?? 0) + 1);
      if (broken('new-test-cases')) continue;
      const callbacks = reach.graphWorld.length && !joint ? null : callbackCalls(shown, requests, env, { others: joint }); // (lane w9am) the calls of a callback it was handed: the spy's
      if (!broken('new-test-world') || callbacks?.some((c) => c.calls.length)) cases.push(caseOf(callbacks)); // (lane w9al) LEAN_BREAK=new-test-world: only a case whose every request is a callback's
      continue;
    }
    reach.closed++;
    if (!broken('new-test-cases')) cases.push(caseOf(callbackCalls(shown, requests, env, { others: joint }) ?? []));
    const named = { input: i, args: shown, ...(step ? { edge: declared.params[step.param]?.name ?? `arg${step.param}` } : {}) };
    const wide = declared.params.some((p, k) => p.spec?.all && !(p.optional && inputs[k] === undefined)); // admitted only because a parameter's type is any or unknown, which admit every value: a validator's own rejection reads so
    if (threw) {
      if (declaredThrow(decl, observation.raw?.threw)) continue; // a throw the declaration names (`@throws {T}`, `asserts`, `never`) is the declared behaviour
      const missing = platformGap(observation.raw?.threw);
      if (missing) { book.add(coverage('draw', `the unit reads the global \`${missing}\`, which lean's sandbox does not define (${missing in globalThis ? 'Node holds it' : 'the build or the host defines it, or no binding does'})`), `coverage global ${missing}`); continue; } // lean's sandbox, not the unit
      const error = thrownText(observation.raw?.threw, observation.outcome.threw);
      const built = broken('fault-origin') ? 'engine' : builtBy(observation.raw?.threw); // (lane w9k) the unit's own `throw new E(...)`, or an error the engine raised
      book.add({ kind: 'new:fault', ...named, ...(wide ? { wide: true } : {}), error, built, how: !sync && thenable ? 'rejected' : 'threw', claim: 'on this input, which the declared parameter types admit, the unit threw (or its promise rejected); no claim that the unit is wrong to' }, `fault ${error.name ?? ''} ${template(withoutInputs(rawMessage(observation.raw?.threw) ?? error.message ?? JSON.stringify(error), inputs))}`); // one record per error and message template: a message that quotes the input is one outcome
      continue;
    }
    if (observation.drives?.length && !broken('shape-drives')) continue; // the observer drove functions the unit handed out (run.mjs driveWindow), after the return: they may have written into the value
    const promised = (decl?.returns && !decl.inferred ? /^Promise(?:Like)?</.test(decl.returns.replace(/\s+/g, '')) : false) || spec.isAsync;
    if (promised !== thenable) continue; // the awaited value is what the declaration's argument types; a promise the type does not name is not read
    const value = observation.raw?.returned;
    if (holdsElement(value)) continue; // a rendered element is lean's own representation of JSX, not the value React would return
    const shapeRead = !(broken('declared-shape') || !decl || decl.inferred || decl.voidLike || !declared?.returns);
    if (shapeRead && member(declared.returns, value, declared.defs, { nullable, side: 'output' }) === 'no') {
      book.add({ kind: 'new:shape', ...named, returned: render(value), declared: decl.returns, mismatch: mismatch(declared.returns, value, declared.defs, { nullable, side: 'output' }), claim: 'on this input the unit returned a value that is not one of its declared return type' }, `shape ${value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value}`); // one record per kind of value returned outside the type, its first input named
      continue;
    }
    // (lane w9k) NaN out of an input that holds none: no number the call was handed is NaN or infinite, and the value it
    // returned is NaN or holds one (a field or element, within three levels of plain arrays and objects). -0 is not read:
    // it equals 0 under every comparison but Object.is and a division, so a -0 is a fact no reader acts on
    const nan = broken('nan-fact') || decl?.voidLike ? null : nanAt(value);
    if (nan !== null && finiteInputs(inputs)) { book.add({ kind: 'new:nan', ...named, returned: render(value), at: nan, claim: 'on this input, which holds no NaN and no infinite number, the unit returned NaN (or a value holding NaN at `at`)' }, `nan ${nan.replace(/\[\d+\]/g, '[]')}`); continue; }
    if (value !== undefined) bases.push({ i, step, shown, returned: rendered(value), after: inputs.map(rendered) }); // a closed call that returned a value: a candidate base of the parameter trials below
  }
  // (lane w9k) a parameter the returned value does not depend on: each base input run again, then with that parameter
  // alone replaced by a different drawn value; when every trial returns the same value and leaves the other arguments
  // as the base left them, the record names the parameter (new:unread when the body never names it, new:ignored when it
  // does). A base whose second run differs from its first refuses the trials: the unit is not deterministic here
  // the bases: the first input of each distinct returned value, then the rest in order, at most BASES. One returned value
  // on every closed call shows no parameter's effect at all (a predicate the draws never satisfy): no trial is made
  const outcomes = new Set(bases.map((b) => b.returned));
  const chosen = [...bases.filter((b, k) => bases.findIndex((x) => x.returned === b.returned) === k), ...bases.filter((b, k) => bases.findIndex((x) => x.returned === b.returned) !== k)].slice(0, BASES);
  if (!broken('ignored-param') && declared && chosen.length >= MIN_TRIALS && (outcomes.size > 1 || broken('trials-constant'))) {
    for (const r of await parameterTrials({ candidate, unit, options, ms, sources, spec, seed, n, declared, nullable, exactOptional, bases: chosen, reading })) book.add(r, `${r.kind} ${r.param ?? ''}`);
  }
  // the PR's own tests that call the unit (new-tests.mjs): each is run against the candidate under the same sandbox
  let tests = null;
  if (opts.tests?.length && !broken('pr-tests')) {
    // a test read at its checkout path imports the unit's file there: that file is the candidate when its bytes are the candidate's
    const aliases = opts.candidateAlias && path.resolve(opts.candidateAlias) !== abs && (() => { try { return fs.readFileSync(opts.candidateAlias).equals(fs.readFileSync(abs)); } catch { return false; } })() ? [path.resolve(opts.candidateAlias)] : [];
    tests = await runTests({ candidate: abs, aliases, unit, testFiles: opts.tests.map((t) => path.resolve(t)), ms, seed, load: (file, env, extra) => loadCandidate(file, env, options, ms, sources, extra), graphWorld: (loaded) => graphWorld(loaded, sources, TEST_MODULES), options });
    for (const r of tests.records) book.add(r, `${r.kind} ${r.file}:${r.test}`);
  }
  // (new-unit tests) a test for the unit from its closed calls: the record new:proposed-test, or a coverage record naming why none
  if (!broken('new-test')) {
    let proposed;
    try {
      const exported = exportKind(reading, unit);
      const script = exported === false && !broken('new-test-script') && isScript(reading.sf) ? await scriptCases({ abs, options, ms, sources, seed, runs: Math.min(n, SCRIPT_RUNS) }) : null; // (lane w9bg) the body's runs are the unit's cases
      proposed = await writeNewTest({ candidate: abs, unit, spec: { ...spec, exported }, script, decl, declared, handedParams: spec.handedParams ?? null, nullable, cases, specifiers: [...fakes].filter((f) => !/^(?:module|global):/.test(f)), statements: newProbes?.statements ?? null, lines: newProbes?.lines ?? null, seed, n, ms, options, sources, load: (file, env, extra) => loadCandidate(file, env, options, ms, sources, extra), reading, project }); }
    catch (e) { proposed = { kind: 'new:coverage', phase: 'test', reason: `the test writer failed: ${String(e?.message ?? e).slice(0, 200)}` }; }
    if (proposed) book.add(proposed, `${proposed.kind} proposed`);
  }
  if (refused.length) { bound.refusedWorlds = { inputs: refused.length, first: refused[0], reason: refusedReason }; book.add(coverage('load', `${refused.length} of ${n} inputs skipped: the module's evaluation refused their drawn world (first, input ${refused[0]}: ${refusedReason})`)); }
  if (!reach.closed) book.add(coverage('draw', decl?.overloaded ? 'the unit is overloaded: its callers are admitted by its overload signatures, which this reading does not take one by one' : !declared ? 'the declaration was not read' : reach.admitted === 0 ? `no drawn input is one the declared types say they admit (${reach.notAdmitted} of ${reach.inputs}: a parameter type lean reads as opaque, a type parameter, or a draw wider than the declaration)` : `every admitted input reached the world (${reach.world} of ${reach.admitted}): ${[...reach.worldOps.keys()].slice(0, 4).join('; ')}`), 'coverage draw');
  return { ...base, verdict: 'NEW', loaded: true, inputs: n, seed, fakes: [...fakes].sort(), faults, faultExamples, traceShape: [...shapes.values()], bound, records: book.list(), declaration: declarationRecord(decl, reach, nullable, edges), ...(tests ? { tests: tests.summary } : {}), ...(networkDenied() ? { sandbox: sandboxEntry() } : {}), ...(opts.sandboxSpawn ? { sandboxSpawned: spawnRefusals() } : {}) };
}

// the records of a unit no parent holds (design/w1h-new-units.md): `new:fault`, `new:shape`, `new:test`, `new:coverage`.
// One record per distinct outcome (the error, the returned shape, the test), with the first input that showed it and the
// count of inputs that did; at most RECORDS per kind, the rest counted
const RECORDS = 5;
function recordBook() {
  const byKey = new Map(), list = [], over = {};
  return {
    add(r, key) { const had = byKey.get(key); if (had) { had.inputs = (had.inputs ?? 1) + 1; return; } if (list.filter((x) => x.kind === r.kind).length >= RECORDS) { over[r.kind] = (over[r.kind] ?? 0) + 1; return; } const rec = { ...r, inputs: 1 }; byKey.set(key, rec); list.push(rec); },
    list: () => [...list, ...Object.entries(over).map(([kind, more]) => ({ kind, more, note: `${more} further distinct outcome(s) of this kind, not listed` }))],
  };
}
const coverage = (phase, reason) => ({ kind: 'new:coverage', phase, reason });

// ----- lane w9k: outcome facts of a unit no parent holds, past a throw and a shape -----
const BASES = 6, MIN_TRIALS = 4, DONORS = 3, TRIAL_PARAMS = 4, TRIAL_RUNS = BASES * (1 + TRIAL_PARAMS * DONORS);
// a plain object of any realm (the sandbox's values are its own realm's): its prototype is an Object.prototype, or null
const plainObject = (v) => { try { const p = Object.getPrototypeOf(v); return p === null || (Object.getPrototypeOf(p) === null && Object.hasOwn(p, 'hasOwnProperty')); } catch { return false; } };
const rendered = (v) => JSON.stringify(render(v)); // a value as one comparable text
const isFake = (v) => { try { return !!(v && v.__isFake); } catch { return true; } };
// where a value holds NaN: '' for the value itself, else the first path (`.a`, `[0]`) within three levels of plain arrays
// and objects; null when it holds none
function nanAt(v, depth = 0, at = '') {
  if (typeof v === 'number') return Number.isNaN(v) ? at : null;
  if (!v || typeof v !== 'object' || depth >= 3 || isFake(v)) return null;
  let entries = [];
  try { entries = Array.isArray(v) ? v.slice(0, 50).map((x, k) => [`[${k}]`, x]) : plainObject(v) ? Object.entries(v).slice(0, 50).map(([k, x]) => [`.${k}`, x]) : []; } catch { return null; }
  for (const [k, x] of entries) { const r = nanAt(x, depth + 1, at + k); if (r !== null) return r; }
  return null;
}
// whether an input holds no NaN, no infinite number and no invalid date, within four levels (a handle's members are read
// through its traps, and a closed call read none)
function finiteInputs(inputs) {
  const ok = (v, depth) => {
    if (typeof v === 'number') return Number.isFinite(v);
    if (!v || typeof v !== 'object' || depth >= 4 || isFake(v)) return true;
    try {
      if (Object.prototype.toString.call(v) === '[object Date]') return Number.isFinite(v.getTime());
      const xs = Array.isArray(v) ? v.slice(0, 200) : v instanceof Map || Object.prototype.toString.call(v) === '[object Map]' ? [...v.entries()].flat() : Object.prototype.toString.call(v) === '[object Set]' ? [...v] : Object.values(v).slice(0, 200);
      return xs.every((x) => ok(x, depth + 1));
    } catch { return false; }
  };
  return inputs.every((x) => ok(x, 0));
}
// whether the unit's body names its parameter k (a binding pattern reads its argument; `arguments` may read any): null
// when the declaration's node is not read
function namesParameter(reading, unit, k) {
  const u = reading?.sf ? topLevelFunctions(reading.sf).get(unit) : null;
  const param = u?.params?.[k]; const body = u?.body ?? u?.fn?.body;
  if (!param || !body) return null;
  if (!ts.isIdentifier(param.name)) return true;
  const sym = reading.checker.getSymbolAtLocation(param.name);
  let hit = false;
  const w = (n) => { if (hit) return; if (ts.isIdentifier(n) && (n.text === 'arguments' || (n !== param.name && n.text === param.name.text && (!sym || reading.checker.getSymbolAtLocation(n) === sym)))) { hit = true; return; } ts.forEachChild(n, w); };
  w(body);
  for (const p of u.params) if (p !== param && p.initializer) w(p.initializer); // a later parameter's default may read it
  return hit;
}
// the parameter trials: for each declared parameter (its name not `_`-led, not a rest), each base input is run again and
// then with that parameter alone replaced by a drawn value that renders differently (a donor input's value at the same
// position, drawn in the same environment after the base's own draw, so both runs draw the same), each in a fresh
// environment seeded as the base was. A trial counts when the replaced input is one the declaration admits and the call
// asked the world nothing; the parameter is a record when MIN_TRIALS trials count and every one returned the base's value
// and left every other argument as the base left it. A base that does not return its first value again refuses them all
async function parameterTrials({ candidate, unit, options, ms, sources, spec, seed, n, declared, nullable, exactOptional, bases, reading }) {
  const run = async (b, k, donorIndex) => {
    const env = new Environment(seed * 7919 + b.i); env.shapes = spec;
    const loaded = await loadCandidate(path.resolve(candidate), env, options, ms, sources);
    const picked = pickUnit(loaded.exports, spec, env); if (!picked) return null;
    await new Promise((r) => setImmediate(r));
    env.trace.length = 0; env.pending.length = 0; env.calls.clear();
    const drawn = inputsFor(spec, seed, b.i, env);
    const inputs = b.step ? edgeInput(drawn, b.step) : drawn;
    const donor = donorIndex === null ? null : inputsFor(spec, seed, donorIndex, env)[k];
    if (donorIndex !== null) { if (isFake(donor) || rendered(donor) === b.after[k] || rendered(donor) === rendered(inputs[k])) return { same: true }; inputs[k] = donor; }
    if (donorIndex !== null && admitted(declared, inputs, { nullable, exactOptional }) !== 'yes') return { refused: 'not admitted' };
    env.argPool = inputs.filter((x) => x && (typeof x === 'object' || typeof x === 'function') && x.__isFake);
    const shown = inputs.map((x) => render(x));
    const o = await observe({ env, unit: picked }, spec, inputs, ms);
    if (o.harness) return { refused: o.harness };
    if (o.trace.length || o.drives?.length) return { refused: 'world' };
    if (Object.hasOwn(o.outcome, 'threw')) return { shown, threw: true };
    return { shown, returned: rendered(o.raw?.returned), after: inputs.map(rendered) };
  };
  for (const b of bases) { const again = await run(b, 0, null); if (!again || again.threw || again.returned !== b.returned || JSON.stringify(again.after) !== JSON.stringify(b.after)) return []; } // the same input, the same outcome, or no trial
  const out = [];
  for (let k = 0; k < Math.min(declared.params.length, TRIAL_PARAMS); k++) {
    const p = declared.params[k]; const name = p.name ?? `arg${k}`;
    if (/^_/.test(name) || p.rest) continue;
    let trials = 0, depends = false, example = null;
    for (const [t, b] of bases.entries()) {
      let r = null;
      for (let a = 0; a < DONORS; a++) { r = await run(b, k, n + 1 + t + BASES * (k + TRIAL_PARAMS * a)); if (!r?.same) break; }
      if (!r || r.same || r.refused) continue;
      if (r.threw || r.returned !== b.returned || r.after.some((x, j) => j !== k && x !== b.after[j])) { depends = true; break; }
      trials++; if (!example) example = { input: b.i, args: b.shown, variant: r.shown, returned: JSON.parse(b.returned) };
    }
    if (depends || trials < MIN_TRIALS) continue;
    const read = namesParameter(reading, unit, k);
    out.push(read === false
      ? { kind: 'new:unread', param: name, index: k, trials, ...example, claim: `the body never names the parameter \`${name}\`; on ${trials} drawn inputs, replacing it alone left the returned value and the other arguments unchanged` }
      : { kind: 'new:ignored', param: name, index: k, trials, ...example, claim: `on ${trials} drawn inputs the declaration admits, replacing \`${name}\` alone left the returned value and the other arguments unchanged` });
  }
  return out;
}
// how the module exports the unit: its own name, 'default', or false (a top-level binding no export names)
function exportKind(reading, unit) {
  try {
    const sf = reading?.sf; if (!sf) return null;
    const u = topLevelFunctions(sf).get(unit); const node = u && (u.node ?? u.fn); if (!node) return null;
    const name = unit.includes('.') ? unit.split('.')[0] : unit;
    const mods = (n) => (ts.canHaveModifiers(n) ? ts.getModifiers(n) ?? [] : []);
    const decl = ts.isVariableDeclaration(node) ? node.parent.parent : node;
    if (mods(decl).some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) return mods(decl).some((m) => m.kind === ts.SyntaxKind.DefaultKeyword) ? 'default' : name;
    for (const st of sf.statements) {
      if (ts.isExportAssignment(st) && !st.isExportEquals && ts.isIdentifier(st.expression) && st.expression.text === name) return 'default';
      if (ts.isExportDeclaration(st) && st.exportClause && ts.isNamedExports(st.exportClause) && !st.moduleSpecifier) for (const el of st.exportClause.elements) if ((el.propertyName ?? el.name).text === name) return el.name.text;
    }
    return false;
  } catch { return null; }
}
function declarationRecord(decl, reach, nullable, edges) {
  return { returns: decl?.returns ?? null, inferred: decl ? decl.inferred : null, throws: decl?.throws ?? null, jsdoc: decl?.jsdoc ?? null, strictNullChecks: !nullable, edgeInputs: edges,
    inputs: { drawn: reach.inputs, admitted: reach.admitted, closed: reach.closed, notAdmitted: reach.notAdmitted, world: reach.world }, ...(reach.rule ? { worldRule: reach.rule } : {}) };
}
// the globals the sandbox answers with a handle (run.mjs sandbox): a program that names one can branch on it with no trap.
// `Buffer` is Node's own in the sandbox (run.mjs sandbox), no handle: its answers are the platform's (lane w9k;
// LEAN_BREAK=real-buffer reads it as a handle again)
const HANDLE_GLOBALS = ['window', 'globalThis', 'global', 'self', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage', 'process', 'fetch', 'crypto', 'performance', 'require', 'module', 'exports'];
const worldGlobal = (name) => HANDLE_GLOBALS.includes(name) || (name === 'Buffer' && broken('real-buffer'));
// (lane w9bg) `process.env.NAME` (or `process.env[k]`): a member read of the environment, a trap that answers the
// variable (fake.mjs, process model), which a test stubs by its value (new-test.mjs surfaceOf `env`); the global named
// so is no world value read without a trap. LEAN_BREAK=new-test-env: every naming of process is world, as before
const envRead = (n) => !broken('new-test-env') && n.text === 'process' && ts.isPropertyAccessExpression(n.parent) && n.parent.expression === n && n.parent.name.text === 'env' && (ts.isPropertyAccessExpression(n.parent.parent) || ts.isElementAccessExpression(n.parent.parent)) && n.parent.parent.expression === n.parent;
// the reads loading made past the linker's own (the linker reads each name it binds once, `get module:<package>.<name>`):
// a second read, a call or anything else at load is the program asking the world
function loadReads(loaded, faked) {
  const linkReads = new Set(), out = [];
  for (const { op, path: p } of loaded.loadTrace ?? []) {
    const link = op === 'get' && [...faked].some((f) => p.startsWith(`module:${f}.`) && !p.slice(`module:${f}.`.length).includes('.'));
    if (link && !linkReads.has(p)) { linkReads.add(p); continue; }
    out.push(`loading: ${op} ${p}`); if (out.length >= 3) break;
  }
  return out;
}
// the bindings of a file a package reaches: its imports of a package lean fakes, and the module constants initialised
// from them, transitively
function taintedNames(sf, faked) {
  const tainted = new Set();
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteralLike(st.moduleSpecifier) || !faked.has(st.moduleSpecifier.text) || !st.importClause || st.importClause.isTypeOnly) continue;
    const c = st.importClause; if (c.name) tainted.add(c.name.text);
    const nb = c.namedBindings; if (nb && ts.isNamespaceImport(nb)) tainted.add(nb.name.text); if (nb && ts.isNamedImports(nb)) for (const el of nb.elements) if (!el.isTypeOnly) tainted.add(el.name.text);
  }
  const mentions = (node) => { let hit = false; const w = (n) => { if (hit) return; if (ts.isIdentifier(n) && tainted.has(n.text)) hit = true; else ts.forEachChild(n, w); }; if (node) w(node); return hit; };
  if (tainted.size) for (let grew = true; grew;) { grew = false; for (const st of sf.statements) if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && !tainted.has(d.name.text) && mentions(d.initializer)) { tainted.add(d.name.text); grew = true; } }
  return tainted;
}
// a use of a value that runs a trap when it runs (a callee, a member's object, `new`'s target, a tag): a trace entry
const trapUse = (n) => { const p = n.parent; return !!p && ((ts.isCallExpression(p) && p.expression === n) || (ts.isPropertyAccessExpression(p) && p.expression === n) || (ts.isElementAccessExpression(p) && p.expression === n) || (ts.isNewExpression(p) && p.expression === n) || (ts.isTaggedTemplateExpression(p) && p.tag === n)); };
// an identifier that names a member or a declaration, not a value the code reads
const memberName = (n) => { const p = n.parent; return !!p && ((ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n) || ts.isPropertyDeclaration(p) || ts.isMethodDeclaration(p) || ts.isPropertySignature(p) || ts.isMethodSignature(p) || ts.isImportSpecifier(p) || ts.isImportClause(p) || ts.isNamespaceImport(p) || ts.isExportSpecifier(p) || ts.isQualifiedName(p) || ts.isJsxAttribute(p) || ts.isBindingElement(p) && p.propertyName === n || ts.isLabeledStatement(p) || ts.isBreakOrContinueStatement(p)); };
const bindsName = (n) => { const p = n.parent; return !!p && (ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isFunctionDeclaration(p) || ts.isClassDeclaration(p) || ts.isBindingElement(p) || ts.isFunctionExpression(p) || ts.isClassExpression(p) || ts.isEnumDeclaration(p) || ts.isEnumMember(p) || ts.isTypeAliasDeclaration(p) || ts.isInterfaceDeclaration(p) || ts.isTypeParameterDeclaration(p)) && p.name === n; };
const inType = (n) => { for (let p = n.parent; p && !ts.isSourceFile(p); p = p.parent) { if (p.kind >= ts.SyntaxKind.FirstTypeNode && p.kind <= ts.SyntaxKind.LastTypeNode) return true; if (ts.isHeritageClause(p) && p.token === ts.SyntaxKind.ImplementsKeyword) return true; if (ts.isTypeAliasDeclaration(p) || ts.isInterfaceDeclaration(p)) return true; if (ts.isStatement(p) || ts.isClassElement(p)) return false; } return false; };
const runsAtLoad = (node) => { let hit = false; const w = (n) => { if (hit || ts.isFunctionLike(n) || ts.isClassLike(n) && n !== node) return; if (ts.isCallExpression(n) || ts.isNewExpression(n) || ts.isTaggedTemplateExpression(n) || ts.isAwaitExpression(n)) { hit = true; return; } ts.forEachChild(n, w); }; if (node) w(node); return hit; };
// the top-level statement or class member a declaration belongs to: a root of reach.mjs
function rootOf(d) {
  for (let p = d; p && !ts.isSourceFile(p); p = p.parent) {
    if (p.parent && ts.isClassLike(p.parent) && ts.isClassElement(p) && p.parent.parent && ts.isSourceFile(p.parent.parent)) return p;
    if (p.parent && ts.isSourceFile(p.parent)) return p;
  }
  return null;
}
const sourceOf = (f) => !f.isDeclarationFile && !/[\\/]node_modules[\\/]/.test(f.fileName);
// (lane w9au) an import the checker does not follow (no declaration behind it: a checkout without an install, a builtin
// without Node's declarations), read as lean's loader links it (resolveModule): a Node builtin, a world surface lean's
// node fakes answer by name ({builtin}); a package lean fakes ({package}); a source file the loader reads ({file}); else
// why it resolves to nothing ({why}), so the refusal names its cause. LEAN_BREAK=reach-builtins: a builtin is not read
// as a surface; LEAN_BREAK=reach-packages: a package is not read as one lean fakes; LEAN_BREAK=reach-reason: no cause
function importSurface(spec, fromAbs, options) {
  const bare = spec.replace(/^node:/, '');
  if (isBuiltin(spec) && (spec.startsWith('node:') || isBuiltin(bare))) { if (!broken('reach-builtins')) return { builtin: spec.startsWith('node:') ? spec : `node:${spec}` }; }
  else if (options) {
    let r = null, failure = null;
    try { r = resolveModule(spec, fromAbs, options); } catch (e) { failure = e; }
    if (r?.external) { if (!broken('reach-packages')) return { package: spec }; }
    else if (r?.file) return { file: r.file, why: `the loader reads ${path.basename(r.file)}, which the checker's program does not hold` };
    else if (failure) {
      const link = failure.link ?? {};
      const relative = spec.startsWith('.') || path.isAbsolute(spec);
      const why = failure.environmentClass === 'build asset' ? `'${spec}' is a build asset` : failure.environmentClass === 'missing generated output' ? `'${spec}' names generated output the checkout does not hold` : relative ? `no file '${spec}' beside ${path.basename(fromAbs)}` : link.local ? `the tsconfig path for '${spec}' names no file` : `no tsconfig path for '${spec}', and no package '${spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]}' is declared or installed`;
      return { why };
    }
  }
  if (isBuiltin(spec)) return { why: `'${spec}' is a Node builtin without its declarations` };
  return { why: `package '${spec}' has no declarations the checker reads` };
}
// the world one unit's run can read without a trap (lane w9k): what the code it reaches names (reach.mjs, followed
// across the program's source files through the imports and members it uses), not the whole module graph. World: a
// package binding (an import of a package lean fakes, or a module constant initialised from one) read other than as a
// callee, a member's object, `new`'s target or a tag; a global the sandbox answers with a handle; a dynamic import; an
// import the checker cannot follow. When loading asked the world anything past the linker's reads, a module binding the
// run may read that loading could have set is world too: a `let` or `var`, a constant or class whose initialiser runs
// code at load, and any file of the reach holding a top-level statement that is no declaration. null: the unit's
// declaration is not read, and the graph's rule (graphWorld) stands. LEAN_BREAK=unit-reach: the graph's rule always
function unitWorld(reading, unit, loaded, options = null) {
  if (broken('unit-reach') || !reading?.checker || !reading.sf) return null;
  const u = topLevelFunctions(reading.sf).get(unit);
  const start = u?.node ? rootOf(u.node) ?? u.node : null;
  if (!start) return null;
  const checker = reading.checker;
  const faked = new Set(loaded.fakes);
  const asked = loadReads(loaded, faked);
  // (lane w9au) an import of a file the run did not link is what the loader would link it as (importSurface)
  const surfaces = new Map();
  const surfaceOf = (spec, f) => { const k = `${f.fileName}\0${spec}`; if (!surfaces.has(k)) surfaces.set(k, importSurface(spec, f.fileName, options)); return surfaces.get(k); };
  const fakedIn = (f) => ({ has: (spec) => { if (faked.has(spec)) return true; if (spec.startsWith('.') || path.isAbsolute(spec)) return false; const s = surfaceOf(spec, f); return !!(s.package || s.builtin); } });
  const reaches = new Map(), taints = new Map();
  const reachFor = (f) => { if (!reaches.has(f)) reaches.set(f, makeReach(checker, f)); return reaches.get(f); };
  const taintOf = (f) => { if (!taints.has(f)) taints.set(f, taintedNames(f, fakedIn(f))); return taints.get(f); };
  const out = [], walked = new Set(), roots = new Set(), files = new Set();
  const at = (n) => `${path.basename(n.getSourceFile().fileName)}:${n.getSourceFile().getLineAndCharacterOfPosition(n.getStart()).line + 1}`;
  const queue = [];
  const enqueue = (root) => { if (!root || roots.has(root)) return; roots.add(root); const f = root.getSourceFile(); if (!sourceOf(f)) return; files.add(f); const owners = reachFor(f).owners(root); for (const o of owners ?? f.statements) queue.push(o); };
  enqueue(start);
  while (queue.length && out.length < 3) {
    const o = queue.shift();
    if (walked.has(o)) continue; walked.add(o);
    const f = o.getSourceFile();
    if (asked.length && rootOf(o) === o) {
      if (ts.isVariableStatement(o) && (!(o.declarationList.flags & ts.NodeFlags.Const) || o.declarationList.declarations.some((d) => runsAtLoad(d.initializer)))) out.push(`a module binding the call reads was set at load, and loading asked the world (${at(o)}; ${asked[0]})`);
      if (ts.isClassDeclaration(o) && (o.heritageClauses?.some((h) => runsAtLoad(h)) || o.members.some((m) => ts.isPropertyDeclaration(m) && m.modifiers?.some((x) => x.kind === ts.SyntaxKind.StaticKeyword) && runsAtLoad(m.initializer)) || o.members.some((m) => ts.isClassStaticBlockDeclaration(m)))) out.push(`a class the call reaches runs code at load, and loading asked the world (${at(o)}; ${asked[0]})`);
    }
    const w = (n) => {
      if (out.length >= 3) return;
      if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) out.push(`imports a module dynamically (${at(n)})`);
      if (ts.isIdentifier(n) && !bindsName(n) && !inType(n)) {
        const member = memberName(n);
        let sym; try { sym = checker.getSymbolAtLocation(n); } catch { sym = undefined; }
        if (!sym) { if (!member && worldGlobal(n.text) && !envRead(n)) out.push(`names ${n.text} (${at(n)})`); }
        else if (sym.flags & ts.SymbolFlags.Alias) {
          if (!member || ts.isPropertyAccessExpression(n.parent)) {
            const imp = sym.declarations?.[0]; let decl = imp; while (decl && !ts.isImportDeclaration(decl) && !ts.isExportDeclaration(decl) && !ts.isImportEqualsDeclaration(decl)) decl = decl.parent;
            const spec = decl?.moduleSpecifier && ts.isStringLiteralLike(decl.moduleSpecifier) ? decl.moduleSpecifier.text : null;
            let target = null; try { target = checker.getAliasedSymbol(sym); } catch { target = null; }
            const targets = (target?.declarations ?? []);
            const surface = spec !== null && !faked.has(spec) && !targets.length ? surfaceOf(spec, f) : null;
            if (spec !== null && (faked.has(spec) || surface?.package)) { if (!member && !trapUse(n)) out.push(`a package binding \`${n.text}\` is read without a trap (${at(n)})`); }
            else if (surface?.builtin) { if (!member && !trapUse(n)) out.push(`a ${surface.builtin} binding \`${n.text}\` is read without a trap (${at(n)})`); }
            else if (!targets.length) { if (!member) out.push(`an import lean cannot follow: \`${n.text}\` (${at(n)})${surface?.why && !broken('reach-reason') ? `: ${surface.why}` : ''}`); }
            else for (const d of targets) {
              const df = d.getSourceFile();
              if (ts.isSourceFile(d)) { if (sourceOf(df)) for (const s of df.statements) enqueue(s); continue; } // a namespace import: the module's statements
              if (!sourceOf(df)) { if (!member && !trapUse(n)) out.push(`a package binding \`${n.text}\` is read without a trap (${at(n)})`); continue; }
              enqueue(rootOf(d));
              const name = d.name && ts.isIdentifier(d.name) ? d.name.text : null;
              if (name && taintOf(df).has(name) && !trapUse(n)) out.push(`a package binding \`${n.text}\` is read without a trap (${at(n)})`);
            }
          }
        } else {
          for (const d of sym.declarations ?? []) {
            const df = d.getSourceFile();
            if (!sourceOf(df)) { if (!member && worldGlobal(n.text) && !envRead(n)) out.push(`names ${n.text} (${at(n)})`); continue; } // a global the platform declares
            if (df !== f) enqueue(rootOf(d)); // a member of another file's class, a value of another file
            else if (!member && taintOf(df).has(n.text) && rootOf(d) && ts.isSourceFile(rootOf(d).parent) && !trapUse(n)) out.push(`a package binding \`${n.text}\` is read without a trap (${at(n)})`);
          }
        }
      }
      ts.forEachChild(n, w);
    };
    w(o);
  }
  if (asked.length) for (const file of files) for (const st of file.statements) {
    if (out.length >= 3) break;
    if (ts.isImportDeclaration(st) || ts.isExportDeclaration(st) || ts.isFunctionDeclaration(st) || ts.isVariableStatement(st) || ts.isClassDeclaration(st) || ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st) || ts.isEnumDeclaration(st) || ts.isModuleDeclaration(st) || ts.isEmptyStatement(st) || ts.isImportEqualsDeclaration(st) || (ts.isExportAssignment(st) && !runsAtLoad(st.expression))) continue;
    out.push(`a top-level statement of a file the call reaches runs at load, and loading asked the world (${at(st)}; ${asked[0]})`);
  }
  return [...new Set(out)];
}
// whether the module graph holds a world value a program could read without a trap. A package lean fakes is linked as a
// handle, and a handle's truth, type or identity is read with no trap, so no trace sees it. The link is harmless when
// every use of every binding the package reaches traps: its imports, and the module constants initialised from them
// (the bindings it taints), are used only as a callee, the object of a member read, the target of `new` or a tag, each
// a trace entry when it runs. Any other use, a re-export of one, a top-level statement other than a declaration that
// names one, or a dynamic import of the package keeps the graph a world graph. Loading asks nothing but the linker's reads:
// a value the world answered at load (through a helper, a clock read, a random read) may be kept where no trap guards it.
// LEAN_BREAK=closed-call switches the whole check off (new-unit.mjs)
function graphWorld(loaded, sources, runner = new Set()) {
  const faked = new Set(loaded.fakes.filter((f) => !runner.has(f)));
  // what loading asked the world may be kept anywhere (a constant built through a helper)
  const out = loadReads(loaded, faked);
  for (const abs of loaded.graph ?? []) {
    const sf = sources.get(abs)?.sf; if (!sf) continue;
    const where = path.basename(abs);
    const declared = new Set(), named = new Set();
    const tainted = new Set();
    const fakedSpecifier = (n) => n && ts.isStringLiteralLike(n) && faked.has(n.text);
    for (const st of sf.statements) {
      if (ts.isImportDeclaration(st) && fakedSpecifier(st.moduleSpecifier) && st.importClause) {
        const c = st.importClause; if (c.name) tainted.add(c.name.text);
        const nb = c.namedBindings; if (nb && ts.isNamespaceImport(nb)) tainted.add(nb.name.text); if (nb && ts.isNamedImports(nb)) for (const el of nb.elements) tainted.add(el.name.text);
      }
      if (ts.isExportDeclaration(st) && fakedSpecifier(st.moduleSpecifier)) out.push(`re-exports ${st.moduleSpecifier.text} (${where})`);
    }
    const mentions = (node) => { let hit = false; const w = (n) => { if (hit) return; if (ts.isIdentifier(n) && tainted.has(n.text)) hit = true; else ts.forEachChild(n, w); }; if (node) w(node); return hit; };
    if (tainted.size) for (let grew = true; grew;) { grew = false; for (const st of sf.statements) if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && !tainted.has(d.name.text) && mentions(d.initializer)) { tainted.add(d.name.text); grew = true; } }
    // a binding the package reaches, exported, is read by its importers, whose uses this file's walk does not see
    if (tainted.size) for (const st of sf.statements) {
      const exported = !!st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      if (exported && ts.isVariableStatement(st) && st.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && tainted.has(d.name.text))) out.push(`exports a package binding (${where})`);
      if ((ts.isExportDeclaration(st) && !st.moduleSpecifier && st.exportClause && ts.isNamedExports(st.exportClause) && st.exportClause.elements.some((el) => tainted.has((el.propertyName ?? el.name).text))) || (ts.isExportAssignment(st) && mentions(st.expression))) out.push(`exports a package binding (${where})`);
    }
    if (tainted.size) for (const st of sf.statements) {
      if (ts.isImportDeclaration(st) || ts.isFunctionDeclaration(st) || ts.isVariableStatement(st) || ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st)) continue;
      if (ts.isClassDeclaration(st) && !st.heritageClauses?.some((h) => mentions(h))) continue; // a class body runs when called; its heritage when it loads
      if (mentions(st)) out.push(`a top-level statement names a package binding (${where}:${sf.getLineAndCharacterOfPosition(st.getStart(sf)).line + 1})`);
    }
    const walk = (n) => {
      if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && (!n.arguments.length || !ts.isStringLiteralLike(n.arguments[0]) || faked.has(n.arguments[0].text))) out.push(`imports a package dynamically (${where})`);
      if (ts.isIdentifier(n)) {
        const p = n.parent;
        const isName = p && ((ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n) || ts.isPropertyDeclaration(p) || ts.isMethodDeclaration(p) || ts.isImportSpecifier(p) || ts.isImportClause(p) || ts.isNamespaceImport(p) || (ts.isExportSpecifier(p) && p.propertyName === n && false));
        const binds = p && (ts.isVariableDeclaration(p) || ts.isParameter(p) || ts.isFunctionDeclaration(p) || ts.isClassDeclaration(p) || ts.isBindingElement(p)) && p.name === n;
        if (binds) declared.add(n.text);
        else if (!isName && worldGlobal(n.text) && !envRead(n)) named.add(n.text);
        if (!isName && !binds && tainted.has(n.text)) {
          const traps = (ts.isCallExpression(p) && p.expression === n) || (ts.isPropertyAccessExpression(p) && p.expression === n) || (ts.isElementAccessExpression(p) && p.expression === n) || (ts.isNewExpression(p) && p.expression === n) || (ts.isTaggedTemplateExpression(p) && p.tag === n);
          const initialiser = ts.isVariableDeclaration(p) && p.initializer === n && ts.isVariableStatement(p.parent?.parent) && p.parent.parent.parent === sf; // a module constant that is the binding itself: tainted in turn, its own uses read
          if (!traps && !initialiser) out.push(`a package binding \`${n.text}\` is read without a trap (${where}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1})`);
        }
      }
      ts.forEachChild(n, walk);
    };
    walk(sf);
    for (const g of named) if (!declared.has(g)) out.push(`names ${g} (${where})`);
  }
  return [...new Set(out)];
}
// a message with what it quotes and its numbers taken out: `Unexpected token 'x', "x..." is not valid JSON` is one template
const template = (m) => String(m).replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`/g, '<q>').replace(/-?\d+(?:\.\d+)?/g, '<n>');
// a message with the input's own text taken out (`cannot plan this statement: <the input>` is one outcome over its inputs)
function withoutInputs(m, inputs) {
  let out = String(m); const seen = new Set();
  const strings = (v, d = 0) => { if (typeof v === 'string') { if (v.trim().length >= 1) seen.add(v); } else if (v && typeof v === 'object' && d < 3 && !v.__isFake) { try { for (const x of Array.isArray(v) ? v.slice(0, 20) : Object.values(v).slice(0, 20)) strings(x, d + 1); } catch { /* none */ } } };
  for (const x of inputs) strings(x);
  for (const x of [...seen].sort((a, b) => b.length - a.length)) out = out.replace(new RegExp(`(?<![\\w$])${x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w$])`, 'g'), '<in>'); // where it stands as a token
  return out.replace(/:\s*$/, ': <in>');
}
const rawMessage = (e) => { try { return e && typeof e === 'object' && typeof e.message === 'string' ? e.message : null; } catch { return null; } };
// a thrown value as a record names it: an error by its name and message (lean's own paths rendered as tokens), else rendered
function thrownText(raw, rendered) {
  try { if (raw && typeof raw === 'object' && typeof raw.message === 'string') return { name: String(raw.name ?? 'Error'), message: render(raw.message.slice(0, 300)) }; } catch { /* a value that refuses its members */ }
  return { value: rendered };
}
// a ReferenceError naming a global Node holds: the sandbox lacks it (a gap of lean's world, never the unit's fault)
function platformGap(thrown) {
  if (broken('platform-gap')) return null;
  // (lane w9k) any name: one Node holds, or one the build or the host defines (React's `__DEV__`); a misspelt binding is
  // the compiler's to name. LEAN_BREAK=undefined-global reads only the names Node holds
  try { const m = thrown && thrown.name === 'ReferenceError' && /^([A-Za-z_$][\w$]*) is not defined$/.exec(String(thrown.message)); return m && (m[1] in globalThis || !broken('undefined-global')) ? m[1] : null; } catch { return null; }
}
// an error the unit's own code built (`new Error(m)`, a class extending one: fake.mjs programConstructor), else one the
// engine raised (a property of undefined, an unknown encoding, an invalid date)
const builtBy = (thrown) => { try { return thrown && typeof thrown === 'object' && programBuilt.has(thrown) ? 'program' : 'engine'; } catch { return 'engine'; } };
const holdsElement = (v, d = 0) => { if (!v || typeof v !== 'object' || d > 3) return false; try { if (Object.hasOwn(v, '$el')) return true; return Array.isArray(v) ? v.some((x) => holdsElement(x, d + 1)) : false; } catch { return true; } };

// every unit of one file in one child (the census's new-unit pass, exec/new-census.mjs): the file's program is read once,
// and each unit's result is a line of its own as it ends, so a child stopped at its bound keeps the units it finished
export function runNewFile(opts) {
  const { candidate, units, seconds = 300 } = opts;
  const box = workerSandbox(opts);
  const done = new Map();
  // a child that dies (out of memory on a drawn size, past its bound) is resumed past the unit it was running: that unit
  // is harness coverage with the child's end, the units after it run in a fresh child
  for (let left = units.filter((u) => !done.has(u)); left.length; left = units.filter((u) => !done.has(u))) {
    const child = spawnSync(process.execPath, [...workerFlagsFrom(box.flags), '--experimental-vm-modules', here, JSON.stringify({ ...opts, units: left, sandboxList: undefined, batch: true, ...(box.spawn ? { sandboxSpawn: box.spawn } : {}) })], { encoding: 'utf8', env: workerEnv(), timeout: seconds * 1000, maxBuffer: 64 * 1024 * 1024 });
    for (const line of (child.stdout ?? '').split('\n')) { if (!line.trim()) continue; try { const r = JSON.parse(line); if (r && r.unit && left.includes(r.unit)) done.set(r.unit, r); } catch { /* a line the stop cut */ } }
    const next = left.find((u) => !done.has(u));
    if (!next) break;
    const tail = (child.stderr ?? '').split('\n').filter((l) => l.trim() && !/ExperimentalWarning|trace-warnings/.test(l));
    const why = child.error?.code === 'ETIMEDOUT' ? `the file's child passed its bound of ${seconds} s` : `the file's child ended (${child.status ?? child.signal})${tail.find((l) => /FATAL ERROR/.test(l)) ? ': ' + tail.find((l) => /FATAL ERROR/.test(l)).trim() : ''}`;
    done.set(next, { candidateOnly: true, unit: next, file: candidate, verdict: 'ASK', loaded: false, inputs: 0, reason: `harness: ${why}`, records: [{ kind: 'new:coverage', phase: 'harness', reason: why }] });
  }
  return units.map((unit) => done.get(unit));
}

if (process.argv[1] && path.resolve(process.argv[1]) === here) {
  scrubEnv(); absentOutsideReads();
  const opts = JSON.parse(process.argv[2]);
  if (!opts.batch) console.log(JSON.stringify(await inUnitRun(() => runNew(opts)))); // the run is the unit's: its late errors are records (run.mjs inUnitRun)
  else {
    let loaded = null; try { loaded = loadProgram(opts.candidate, { project: opts.project ?? true }); } catch { /* each unit says so */ }
    for (const unit of opts.units) { let r; try { r = await inUnitRun(() => runNew({ ...opts, unit, units: undefined, batch: undefined, ...(loaded ? { loaded } : {}) })); } catch (e) { r = { candidateOnly: true, unit, file: opts.candidate, verdict: 'ASK', reason: `harness: ${String(e?.message ?? e).slice(0, 200)}`, records: [{ kind: 'new:coverage', phase: 'harness', reason: String(e?.message ?? e).slice(0, 200) }] }; } process.stdout.write(JSON.stringify({ ...r, unit }) + '\n'); }
  }
}
