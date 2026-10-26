#!/usr/bin/env node
// Lane B: bounded differential execution of one unit, parent against candidate.
//
//   node run.mjs --parent <file.ts> --candidate <file.ts> --unit <name|Class.method> [--n 200] [--seed 1]
//                [--out result.json] [--project <tsconfig>|--no-project] [--ms 2000]
//
// Both files are compiled with the vendored TypeScript compiler and loaded in their own sandbox (node:vm) with the
// same fakes (fake.mjs): relative imports inside the same package are compiled and loaded too; every other import,
// every global that reaches the outside (the clock, random, timers, the console, fetch, process) is a fake that
// records what is asked of it. Inputs come from the parameter types (spec.mjs, gen.mjs), the same on both sides;
// opaque inputs are fakes. The observation of one call is the outcome (returned or thrown value), the arguments after
// the call (reachable mutation), the trace of environment requests, and the pending work. The verdict:
//   WITNESS      an input on which the observations differ (the input index, both observations)
//   PASS-bounded no difference on n inputs; the bound is stated (n, seed, the fake policy, the per-input time limit)
//   ASK          a side could not be loaded or run (the reason), or the unit is not found
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { ts, loadProgram, topLevelFunctions } from '../common.mjs';
import { Environment, render, stable, BudgetError } from './fake.mjs';
import { specOf } from './spec.mjs';
import { inputsFor } from './gen.mjs';

const require = createRequire(import.meta.url);

const COMPILE = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true, emitDecoratorMetadata: false, esModuleInterop: true, importHelpers: false, strict: false, sourceMap: false, removeComments: true, jsx: ts.JsxEmit.ReactJSX, allowJs: true, moduleDetection: ts.ModuleDetectionKind.Force };

// every top-level function and class of the file, exported or not, reachable for the harness
function unitShim(src, abs) {
  const sf = ts.createSourceFile(abs, src, ts.ScriptTarget.ES2020, true, abs.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const names = [];
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name) names.push(st.name.text);
    else if (ts.isClassDeclaration(st) && st.name) names.push(st.name.text);
    else if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) names.push(d.name.text);
  }
  return `\n;try { module.exports.__lean_units = { ${names.map((n) => `${JSON.stringify(n)}: (typeof ${n} === 'undefined' ? undefined : ${n})`).join(', ')} }; } catch (e) {}\n`;
}

function resolveRelative(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const c of [base, base + '.ts', base + '.tsx', base + '.mts', base + '.js', base + '.mjs', path.join(base, 'index.ts'), path.join(base, 'index.tsx'), path.join(base, 'index.js')]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

// one sandbox per side: a module cache, the fakes, the frozen globals
export function sandbox(env, root) {
  const cache = new Map();
  const fixedNow = 1700000000000;
  const FakeDate = new Proxy(Date, { construct(t, args) { return args.length ? new Date(...args) : new Date(fixedNow); }, get(t, p) { if (p === 'now') return () => fixedNow; return t[p]; }, apply() { return new Date(fixedNow).toString(); } });
  const g = {
    console: env.module('console'), process: env.module('process'), fetch: env.fake('global:fetch'), Date: FakeDate,
    setTimeout: (fn, ms, ...a) => { env.pending.push({ op: 'setTimeout', ms: Number(ms) || 0 }); return env.pending.length; },
    setInterval: (fn, ms) => { env.pending.push({ op: 'setInterval', ms: Number(ms) || 0 }); return env.pending.length; },
    setImmediate: (fn) => { env.pending.push({ op: 'setImmediate' }); return env.pending.length; },
    clearTimeout: () => {}, clearInterval: () => {}, queueMicrotask: (fn) => Promise.resolve().then(fn),
    Math: Object.assign(Object.create(Math), { random: () => env.rng() }),
    Buffer, JSON, Object, Array, String, Number, Boolean, Map, Set, WeakMap, WeakSet, Symbol, Promise, Error, TypeError, RangeError, SyntaxError, RegExp, parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, encodeURI, decodeURI, URL, URLSearchParams, TextEncoder, TextDecoder, BigInt, Reflect, Proxy, structuredClone,
    globalThis: null, crypto: env.module('crypto'), performance: env.module('performance'), React: env.module('react'),
  };
  g.globalThis = g; g.global = g; g.window = undefined;
  const ctx = vm.createContext(g);
  function load(file) {
    const abs = path.resolve(file);
    if (cache.has(abs)) return cache.get(abs).exports;
    const wasLoading = env.loading; env.loading = true;
    try { return loadInner(abs); } finally { env.loading = wasLoading; }
  }
  function loadInner(abs) {
    const src = fs.readFileSync(abs, 'utf8');
    const tsName = /\.(mjs|cjs|js)$/.test(abs) ? abs.replace(/\.(mjs|cjs|js)$/, '.ts') : abs; // a script file is read as TypeScript so its imports become requires
    const src2 = src.replace(/\bimport\.meta\.url\b/g, JSON.stringify('file://' + abs)).replace(/\bimport\.meta\b/g, '({})'); // a script's import.meta under CommonJS
    const js = ts.transpileModule(src2, { compilerOptions: COMPILE, fileName: tsName }).outputText + unitShim(src2, tsName);
    const mod = { exports: {} };
    cache.set(abs, mod);
    const req = (spec) => {
      if (spec.startsWith('.') ) {
        const r = resolveRelative(abs, spec);
        if (r && (!root || r.startsWith(root))) return load(r);
        return env.module(spec);
      }
      return env.module(spec); // packages, builtins, path aliases: the environment
    };
    // a script may declare its own __filename from import.meta.url; the wrapper's names must not clash
    const wrapper = vm.compileFunction(js, ['exports', 'require', 'module', '__lean_filename', '__lean_dirname'], { parsingContext: ctx, filename: abs });
    wrapper.call(mod.exports, mod.exports, req, mod, abs, path.dirname(abs));
    return mod.exports;
  }
  return { load, ctx };
}

function pickUnit(exportsObj, spec, env) {
  const units = exportsObj.__lean_units ?? {};
  if (!spec.isMethod) {
    const f = units[spec.unit] ?? exportsObj[spec.unit];
    if (typeof f !== 'function') return null;
    return { call: (args) => f(...args), receiver: null };
  }
  const Cls = units[spec.className] ?? exportsObj[spec.className];
  if (typeof Cls !== 'function') return null;
  const method = Cls.prototype[spec.unit.split('.')[1]];
  if (typeof method !== 'function' && !spec.isStatic) return null;
  if (spec.isStatic) { const sm = Cls[spec.unit.split('.')[1]]; return typeof sm === 'function' ? { call: (args) => sm.apply(Cls, args), receiver: null } : null; }
  // the receiver: real prototype methods, every field a fake
  const base = Object.create(Cls.prototype);
  const self = new Proxy(base, {
    get(t, p) {
      if (p === '__isFake') return false;
      if (typeof p === 'symbol') return t[p];
      if (p in Cls.prototype) { const v = Cls.prototype[p]; return typeof v === 'function' ? v.bind(self) : v; }
      env.record('get', `this.${String(p)}`);
      return env.fake(`this.${String(p)}`); // a field of the receiver is a service or a value: always a handle, its own answers vary
    },
    set(t, p, v) { env.record('set', `this.${String(p)}`, [render(v)]); t[p] = v; return true; },
  });
  return { call: (args) => method.apply(self, args), receiver: self };
}

async function withTimeout(p, ms) {
  let timer;
  const t = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('__timeout__')), ms); });
  try { return await Promise.race([p, t]); } finally { clearTimeout(timer); }
}

export async function observe(side, spec, args, ms) {
  const { env, unit } = side;
  const before = args.map((a) => stable(a));
  let outcome;
  try {
    const r = unit.call(args);
    const v = (r && typeof r.then === 'function') ? await withTimeout(r, ms) : r;
    outcome = { returned: render(v) };
  } catch (e) {
    if (e && e.message === '__timeout__') return { harness: 'timeout' };
    if (e instanceof BudgetError) return { harness: `budget: ${e.message}` };
    if (e instanceof RangeError && /call stack/.test(String(e.message))) return { harness: 'stack overflow' };
    outcome = { threw: render(e) };
  }
  // drain microtasks so pending work settles
  await new Promise((r) => setImmediate(r));
  const after = args.map((a) => stable(a));
  const mutated = args.map((a, i) => (before[i] === after[i] ? null : JSON.parse(after[i])));
  return { outcome, mutated, trace: env.trace, pending: env.pending };
}

export async function runPair(opts) {
  const { parent, candidate, unit, n = 200, seed = 1, ms = 2000, project = true } = opts;
  let spec;
  try { spec = specOf(candidate, unit, { project }); } catch (e) { return { verdict: 'ASK', reason: `spec: ${e.message}` }; }
  const roots = { parent: findRoot(parent), candidate: findRoot(candidate) };
  const diffs = [];
  let harnessAsk = null;
  for (let i = 0; i < n; i++) {
    const sides = {};
    for (const [name, file] of [['parent', parent], ['candidate', candidate]]) {
      const env = new Environment(seed * 7919 + i);
      let exportsObj;
      try { exportsObj = sandbox(env, roots[name]).load(file); } catch (e) { harnessAsk = `${name}: load failed: ${String(e && e.message).slice(0, 200)}`; break; }
      const u = pickUnit(exportsObj, spec, env);
      if (!u) { harnessAsk = `${name}: unit ${unit} not exported`; break; }
      sides[name] = { env, unit: u, inputs: inputsFor(spec, seed, i, env) };
    }
    if (harnessAsk) break;
    const oP = await observe(sides.parent, spec, sides.parent.inputs, ms);
    const oC = await observe(sides.candidate, spec, sides.candidate.inputs, ms);
    if (oP.harness || oC.harness) { harnessAsk = `input ${i}: ${oP.harness ? 'parent ' + oP.harness : 'candidate ' + oC.harness}`; break; }
    const sP = JSON.stringify(oP), sC = JSON.stringify(oC);
    if (sP !== sC) {
      diffs.push({ input: i, args: sides.parent.inputs.map((a) => render(a)), parent: oP, candidate: oC, where: firstDifference(oP, oC) });
      if (diffs.length >= 3) break;
    }
  }
  const bound = { n, seed, ms, fakes: 'demand-driven proxies, seeded primitives, frozen clock', inputs: 'from parameter types with boundary values first' };
  if (diffs.length) return { verdict: 'WITNESS', unit, witnesses: diffs, bound, spec };
  if (harnessAsk) return { verdict: 'ASK', reason: harnessAsk, unit, bound, ran: diffs.length };
  return { verdict: 'PASS-bounded', unit, bound, spec };
}

function firstDifference(a, b) {
  for (const k of ['outcome', 'mutated', 'trace', 'pending']) {
    const x = JSON.stringify(a[k]), y = JSON.stringify(b[k]);
    if (x !== y) {
      if (k === 'trace') { const i = a.trace.findIndex((e, j) => JSON.stringify(e) !== JSON.stringify(b.trace[j])); return { field: k, index: i, parent: a.trace[i] ?? null, candidate: b.trace[i] ?? null }; }
      return { field: k };
    }
  }
  return null;
}

// the package root: the nearest package.json above the file (relative imports inside it are compiled, others faked)
function findRoot(file) {
  let d = path.dirname(path.resolve(file));
  for (let i = 0; i < 10; i++) { if (fs.existsSync(path.join(d, 'package.json'))) return d; const up = path.dirname(d); if (up === d) break; d = up; }
  return path.dirname(path.resolve(file));
}

if (process.argv[1] && new URL(import.meta.url).pathname === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const res = await runPair({ parent: opt('--parent'), candidate: opt('--candidate'), unit: opt('--unit'), n: Number(opt('--n', 200)), seed: Number(opt('--seed', 1)), ms: Number(opt('--ms', 2000)), project: a.includes('--no-project') ? false : opt('--project', true) });
  const out = opt('--out', null);
  const text = JSON.stringify(res, null, 1);
  if (out) fs.writeFileSync(out, text); else console.log(text);
  if (out) console.log(`${res.verdict}${res.reason ? ': ' + res.reason : ''} -> ${out}`);
  process.exit(res.verdict === 'ASK' ? 2 : 0);
}
