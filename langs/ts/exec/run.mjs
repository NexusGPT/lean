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
//   NEW          a candidate-only unit loaded and ran; no equality claim
//   REFUSE       a repository-owned local source link failed (kind: load)
//   ASK          a side could not be loaded or run (the reason), or the unit is not found
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { ts, loadProgram, topLevelFunctions } from '../common.mjs';
import { Environment, render, stable, BudgetError } from './fake.mjs';
import { specOf } from './spec.mjs';
import { inputsFor } from './gen.mjs';
import { runNew } from './new-unit.mjs';

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

// The JSX runtime of the sandbox: an element is a plain value {$el, props, children}, never a fake, so that two versions
// are compared on the tree they render, by React's rules: null, undefined and booleans render nothing; arrays are
// flattened; numbers render as text; the key is a prop. A component tag is named, not called: the tree holds its name.
function jsxChildren(c) {
  const out = [];
  const add = (x) => { if (x === null || x === undefined || typeof x === 'boolean') return; if (Array.isArray(x)) { x.forEach(add); return; } if (typeof x === 'number' || typeof x === 'bigint') { out.push(String(x)); return; } out.push(x); };
  add(c);
  return out;
}
function jsxValue(type, props, key) {
  const tag = typeof type === 'string' ? type : type && type.__isFake ? { $fake: type.__fakePath } : typeof type === 'function' ? { $component: type.name || 'anonymous' } : type === JSX_FRAGMENT ? '' : String(type);
  const rest = {}; let children = [];
  for (const k of Object.keys(props ?? {})) { if (k === 'children') children = jsxChildren(props[k]); else rest[k] = props[k]; }
  if (key !== undefined && key !== null) rest.key = key;
  return { $el: tag, props: rest, children };
}
const JSX_FRAGMENT = '';
const jsxRuntime = { jsx: jsxValue, jsxs: jsxValue, jsxDEV: jsxValue, Fragment: JSX_FRAGMENT, __esModule: true };

// hooks belong to React's render protocol, rather than the generic external callback fake
function reactRuntime(env) {
  let slot = 0;
  const runtime = {
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useState: (initial) => {
      const key = `react:state:${slot++}`;
      const value = typeof initial === 'function' ? initial() : initial;
      env.record('hook', key, [render(value)]);
      let current = value;
      const setter = (next) => { current = typeof next === 'function' ? next(current) : next; env.record('set', key, [render(current)]); };
      return [value, setter];
    },
    useEffect: (fn, deps) => {
      const key = `react:effect:${slot++}`;
      env.pending.push({ op: key, deps: render(deps) });
      (env.reactEffects ??= []).push(fn);
    },
  };
  const proxy = new Proxy(runtime, { get(t, p) { if (p === '__esModule') return true; if (p === 'default') return proxy; return p in t ? t[p] : env.module('react')[p]; } });
  return proxy;
}
// handlers are observed after render and registered effects, in tree order, on a bounded event input
async function observeJsx(v, env) {
  if (Array.isArray(v)) { const items = []; for (const x of v) items.push(await observeJsx(x, env)); return items; }
  if (!v || typeof v !== 'object' || v.__isFake || !Object.hasOwn(v, '$el')) return v;
  const props = { ...v.props };
  for (const k of Object.keys(props)) if (/^on[A-Z]/.test(k) && typeof props[k] === 'function') {
    try { props[k] = { $handler: { returned: render(await props[k](env.fake(`react:event:${k}`))) } }; }
    catch (e) { if (e instanceof BudgetError) throw e; props[k] = { $handler: { threw: render(e) } }; }
  }
  const children = [];
  for (const c of v.children) children.push(await observeJsx(c, env));
  return { ...v, props, children };
}

// one sandbox per side: a module cache, the fakes, the frozen globals
export function sandbox(env, root) {
  const cache = new Map();
  const react = reactRuntime(env);
  const fixedNow = 1700000000000;
  const FakeDate = new Proxy(Date, { construct(t, args) { return args.length ? new Date(...args) : new Date(fixedNow); }, get(t, p) { if (p === 'now') return () => fixedNow; return t[p]; }, apply() { return new Date(fixedNow).toString(); } });
  const g = {
    console: env.module('console'), process: env.module('process'), fetch: env.fake('global:fetch'), Date: FakeDate,
    setTimeout: (fn, ms, ...a) => { env.pending.push({ op: 'setTimeout', ms: Number(ms) || 0 }); return env.pending.length; },
    setInterval: (fn, ms) => { env.pending.push({ op: 'setInterval', ms: Number(ms) || 0 }); return env.pending.length; },
    setImmediate: (fn) => { env.pending.push({ op: 'setImmediate' }); return env.pending.length; },
    clearTimeout: (id) => { env.record('call', 'global:clearTimeout', [render(id)]); }, clearInterval: (id) => { env.record('call', 'global:clearInterval', [render(id)]); }, queueMicrotask: (fn) => Promise.resolve().then(fn),
    Math: Object.assign(Object.create(Math), { random: () => env.rng() }),
    Buffer, JSON, Object, Array, String, Number, Boolean, Map, Set, WeakMap, WeakSet, Symbol, Promise, Error, TypeError, RangeError, SyntaxError, RegExp, parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, encodeURI, decodeURI, URL, URLSearchParams, TextEncoder, TextDecoder, BigInt, Reflect, Proxy, structuredClone,
    globalThis: null, crypto: env.module('crypto'), performance: env.module('performance'), React: react,
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
    let js = ts.transpileModule(src2, { compilerOptions: COMPILE, fileName: tsName }).outputText + unitShim(src2, tsName);
    // a decorator is run (so its reads and calls are recorded) but its result never replaces the class or the member:
    // the decorated code stays the code under test, whatever the fake decorator returned
    js = js.replace(/var __decorate = \(this && this\.__decorate\) \|\| function \(decorators, target, key, desc\) \{[\s\S]*?\n\};/,
      'var __decorate = function (decorators, target, key, desc) { var c = arguments.length, r = c < 3 ? target : desc === null ? Object.getOwnPropertyDescriptor(target, key) : desc; for (var i = decorators.length - 1; i >= 0; i--) { var d = decorators[i]; if (d) { try { c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key); } catch (e) { if (!(e && e.__isFake)) throw e; } } } return r; };');
    const mod = { exports: {} };
    cache.set(abs, mod);
    const req = (spec) => {
      if (spec.startsWith('.') ) {
        if (/\.(css|scss|sass|less|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|md|txt|html|wasm)(\?.*)?$/i.test(spec)) return env.module(spec); // an asset, not code: a fake module
        const r = resolveRelative(abs, spec);
        if (r && /\.json$/i.test(r)) { try { return JSON.parse(fs.readFileSync(r, 'utf8')); } catch { return env.module(spec); } }
        if (r && (!root || r.startsWith(root))) return load(r);
        return env.module(spec);
      }
      if (spec === 'react') return react;
      if (spec === 'react/jsx-runtime' || spec === 'react/jsx-dev-runtime') return jsxRuntime; // an element is a value tree, by React's rules for children
      return env.module(spec); // packages, builtins, path aliases: the environment
    };
    // CommonJS gives __filename and __dirname; a script that declares its own gets them under other names
    const declares = /\b(const|let|var)\s+(__filename|__dirname)\b/.test(js);
    let wrapper;
    try { wrapper = vm.compileFunction(js, ['exports', 'require', 'module', declares ? '__lean_filename' : '__filename', declares ? '__lean_dirname' : '__dirname'], { parsingContext: ctx, filename: abs }); }
    catch (e) { throw new Error(`${path.relative(root || path.dirname(abs), abs)}: ${e.message}`); } // the file that failed to compile is named
    wrapper.call(mod.exports, mod.exports, req, mod, abs, path.dirname(abs));
    return mod.exports;
  }
  return { load, ctx, react, jsxRuntime };
}

export function pickUnit(exportsObj, spec, env) {
  const units = exportsObj.__lean_units ?? {};
  if (!spec.isMethod) {
    const f = units[spec.unit] ?? exportsObj[spec.unit];
    if (typeof f !== 'function') return null;
    return { call: (args) => f(...args), receiver: null };
  }
  const Cls = units[spec.className] ?? exportsObj[spec.className];
  if (typeof Cls !== 'function') return null;
  if (spec.unit.split('.')[1] === 'constructor') {
    // the constructor unit: the instance it builds is both the receiver observed after the call and the value returned
    const holder = { inst: null };
    return { call: (args) => { holder.inst = Reflect.construct(Cls, args); return holder.inst; }, receiver: { __own: () => (holder.inst ? { ...holder.inst } : {}) } };
  }
  const member = spec.member ?? spec.unit.split('.')[1];
  const descriptor = Object.getOwnPropertyDescriptor(spec.isStatic ? Cls : Cls.prototype, member);
  const method = descriptor?.value;
  if (typeof method !== 'function' && !spec.accessor && !spec.isStatic) return null;
  if (spec.isStatic && spec.accessor) return { call: (args) => spec.accessor === 'get' ? Reflect.get(Cls, member, Cls) : (Reflect.set(Cls, member, args[0], Cls), undefined), receiver: null };
  if (spec.isStatic) { const sm = Cls[member]; return typeof sm === 'function' ? { call: (args) => sm.apply(Cls, args), receiver: null } : null; }
  // the receiver: real prototype methods, every field a fake
  const base = Object.create(Cls.prototype);
  const self = new Proxy(base, {
    get(t, p) {
      if (p === '__isFake') return false;
      if (p === '__own') return () => ({ ...t }); // the fields this run assigned
      if (typeof p === 'symbol') return t[p];
      if (p in Cls.prototype) { const v = Reflect.get(Cls.prototype, p, self); return typeof v === 'function' ? v.bind(self) : v; }
      if (Object.prototype.hasOwnProperty.call(t, p)) return t[p]; // a field this run assigned: its value
      env.record('get', `this.${String(p)}`);
      return env.member('this', p, spec.receiver); // a field of the receiver: typed by the class (a service handle, a value of the field's type)
    },
    set(t, p, v) { const d = Object.getOwnPropertyDescriptor(Cls.prototype, p); if (d?.set) { d.set.call(self, v); return true; } env.record('set', `this.${String(p)}`, [render(v)]); t[p] = v; return true; },
  });
  return { call: (args) => spec.accessor === 'get' ? self[member] : spec.accessor === 'set' ? (self[member] = args[0], undefined) : method.apply(self, args), receiver: self };
}

async function withTimeout(p, ms) {
  let timer;
  const t = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('__timeout__')), ms); });
  try { return await Promise.race([p, t]); } finally { clearTimeout(timer); }
}

// an error raised after the unit returned (a fire-and-forget promise, a timer): recorded as an observation, never a crash
const lateErrors = [];
if (!globalThis.__leanLateHooks) { globalThis.__leanLateHooks = true; process.on('unhandledRejection', (e) => lateErrors.push(String(e && e.message || e))); process.on('uncaughtException', (e) => lateErrors.push(String(e && e.message || e))); }
export async function observe(side, spec, args, ms) {
  const { env, unit } = side;
  const before = args.map((a) => stable(a));
  let outcome;
  lateErrors.length = 0;
  try {
    const r = unit.call(args);
    const v = (r && typeof r.then === 'function') ? await withTimeout(r, ms) : r;
    for (const effect of env.reactEffects ?? []) {
      try { const cleanup = await withTimeout(Promise.resolve(effect()), ms); if (typeof cleanup === 'function') env.pending.push({ op: 'react:cleanup', handler: render(cleanup) }); }
      catch (e) { if (e instanceof BudgetError || e?.message === '__timeout__') throw e; env.record('effect-throw', 'react', [render(e)]); }
    }
    outcome = { returned: render(await withTimeout(observeJsx(v, env), ms)) };
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
  await new Promise((r) => setImmediate(r)); // let a fire-and-forget continuation fail now rather than during the next side
  for (const m of lateErrors.splice(0)) env.record('late-error', 'process', [m.slice(0, 200)]);
  // the receiver's own state after the call: every field of `this` the run touched, rendered (a typed field such as a
  // Map or a counter is a real value, so a change to it is seen here, not on the trace)
  const receiver = {};
  if (side.unit && side.unit.receiver) { for (const [k, v] of env.cache) if (k.startsWith('this.') && !k.includes('(') && !k.includes('#') && !k.includes('.', 5)) receiver[k] = render(v); const own = side.unit.receiver.__own ? side.unit.receiver.__own() : {}; for (const k of Object.keys(own)) receiver[`this.${k}`] = render(own[k]); }
  return { outcome, mutated, receiver, trace: env.trace, pending: env.pending };
}

export async function runPair(opts) {
  const { parent, candidate, unit, n = 200, seed = 1, ms = 2000, project = true } = opts;
  // a missing parent unit has no equality question
  if (!parent || !fs.existsSync(parent) || !topLevelFunctions(ts.createSourceFile(parent, fs.readFileSync(parent, 'utf8'), ts.ScriptTarget.Latest, true)).has(unit)) {
    return runNew(opts);
  }
  let spec;
  try { spec = specOf(candidate, unit, { project }); } catch (e) { return { verdict: 'ASK', reason: `spec: ${e.message}` }; }
  const roots = { parent: findRoot(parent), candidate: findRoot(candidate) };
  const diffs = [];
  let harnessAsk = null;
  for (let i = 0; i < n; i++) {
    const sides = {};
    for (const [name, file] of [['parent', parent], ['candidate', candidate]]) {
      const env = new Environment(seed * 7919 + i);
      env.shapes = spec;
      let exportsObj;
      try { exportsObj = sandbox(env, roots[name]).load(file); } catch (e) { harnessAsk = `${name}: load failed: ${String(e && e.message).slice(0, 200)}`; break; }
      const u = pickUnit(exportsObj, spec, env);
      if (!u) { harnessAsk = `${name}: unit ${unit} not exported`; break; }
      await new Promise((r) => setImmediate(r)); // let load-time continuations settle
      env.trace.length = 0; env.pending.length = 0; env.calls.clear(); // what the module did while loading is not the unit's behaviour
      const inputs = inputsFor(spec, seed, i, env);
      env.argPool = inputs.filter((x) => x && (typeof x === 'object' || typeof x === 'function') && x.__isFake); // handles the unit was handed: a generated key or member may be one of them
      sides[name] = { env, unit: u, inputs };
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
  if (diffs.length) return { verdict: 'WITNESS', unit, witnesses: diffs, bound, spec: { params: spec.params, returns: spec.returns, literals: spec.literals, strings: spec.strings } };
  if (harnessAsk) return { verdict: 'ASK', reason: harnessAsk, unit, bound, ran: diffs.length };
  return { verdict: 'PASS-bounded', unit, bound, spec: { params: spec.params, returns: spec.returns, literals: spec.literals, strings: spec.strings } };
}

function firstDifference(a, b) {
  for (const k of ['outcome', 'mutated', 'receiver', 'trace', 'pending']) {
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
