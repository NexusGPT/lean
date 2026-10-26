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
import { Environment, render, BudgetError } from './fake.mjs';
import { specOf } from './spec.mjs';
import { inputsFor, aliasInputs } from './gen.mjs';
import { runNew } from './new-unit.mjs';
import { Graph } from './graph.mjs';

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

class RenderLoop extends Error { constructor(why) { super(`render-loop: ${why}`); this.name = 'RenderLoop'; } } // React's own limits: 25 re-renders from a setter during render, then it throws; effects that keep setting state re-render without end
// one commit: render until a setter during render stops changing the state (React re-renders at once, up to 25 times)
async function commitRender(env, call, ms) {
  let v, renders = 0;
  do { env.stateDirty = false; env.react?.__beginRender?.(); renders++; const r = call(); v = (r && typeof r.then === 'function') ? await withTimeout(r, ms) : r; if (env.stateDirty && renders >= 25) throw new RenderLoop('a setter during render re-rendered 25 times'); } while (env.stateDirty && env.react);
  return v;
}
// after a commit: effects run (settleEffects), and an effect that set the state re-renders and settles again, bounded
async function commitEffects(env, call, ms, v) {
  for (let rounds = 0; ; rounds++) {
    env.stateDirty = false; await settleEffects(env, ms);
    if (!env.stateDirty) return v;
    if (rounds >= 1000) throw new RenderLoop('effects re-rendered 1000 times');
    v = await commitRender(env, call, ms);
  }
}
class Suspended extends Error { constructor(why) { super(`suspense: ${why}`); this.name = 'Suspended'; } } // a render that suspends (a thrown thenable, use(promise)): React would show a fallback and retry; lean has no model of that schedule
// hooks belong to React's render protocol, rather than the generic external callback fake
function reactRuntime(env) {
  let slot = 0;
  // an effect is a slot too: its body and deps from the latest render, the deps it last ran with, its cleanup. At the
  // first render it joins the mount list (run once after the render); afterwards `settleEffects` re-runs it when a dep
  // changed by Object.is, cleanup first (React's rule)
  const effectSlot = (fn, deps, kind) => {
    const i = slot++; const key = `${kind}:${i}`; const es = (env.effectSlots ??= []); const prev = es[i];
    es[i] = { key, fn, deps, lastDeps: prev ? prev.lastDeps : undefined, cleanup: prev ? prev.cleanup : null, ran: prev ? prev.ran : false };
    if (!prev) { env.pending.push({ op: key, deps: render(deps) }); (env.reactEffects ??= []).push(fn); }
  };
  const runtime = {
    useMemo: (fn) => fn(),
    useCallback: (fn) => fn,
    useState: (initial) => { // slots are retained on the environment, keyed by call order, as React keys them: a second render reads the same slot
      const i = slot++; const key = `react:state:${i}`;
      const slots = (env.hookSlots ??= []);
      if (!(i in slots)) { slots[i] = typeof initial === 'function' ? initial() : initial; env.record('hook', key, [render(slots[i])]); }
      const value = slots[i];
      const setter = (next) => { const v = typeof next === 'function' ? next(slots[i]) : next; if (!Object.is(v, slots[i])) env.stateDirty = true; slots[i] = v; env.record('set', key, [render(slots[i])]); };
      return [value, setter];
    },
    useEffect: (fn, deps) => effectSlot(fn, deps, 'react:effect'),
    use: (x) => { if (x && typeof x.then === 'function') throw new Suspended('use(promise)'); return x; }, // a suspended render: no model of the fallback and the retry; the run ends as ASK:suspense
    useRef: (initial) => { const i = slot++; const slots = (env.hookSlots ??= []); if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; }, // one box per slot, the same box on every render
    useId: () => { const i = slot++; const slots = (env.hookSlots ??= []); if (!(i in slots)) slots[i] = `:r${i}:`; return slots[i]; }, // a stable id per slot
    useContext: (ctx) => { const i = slot++; const slots = (env.hookSlots ??= []); if (!(i in slots)) slots[i] = env.fake(`react:context:${ctx && ctx.__fakePath ? ctx.__fakePath : ctx && ctx.displayName ? ctx.displayName : 'anonymous'}`); env.record('get', `react:context:${i}`); return slots[i]; }, // the provided value is outside the unit: one fake per context, the same on every render
    useReducer: (reducer, initialArg, init) => { const i = slot++; const key = `react:state:${i}`; const slots = (env.hookSlots ??= []); if (!(i in slots)) { slots[i] = init ? init(initialArg) : initialArg; env.record('hook', key, [render(slots[i])]); } const dispatch = (action) => { const v = reducer(slots[i], action); if (!Object.is(v, slots[i])) env.stateDirty = true; slots[i] = v; env.record('set', key, [render(slots[i])]); }; return [slots[i], dispatch]; },
    useLayoutEffect: (fn, deps) => effectSlot(fn, deps, 'react:layout-effect'), // as useEffect: after the render, in registration order (layout effects run first in React; one component, one order)
  };
  runtime.__beginRender = () => { slot = 0; }; // a render starts at slot 0 (React's call-order keying)
  const proxy = new Proxy(runtime, { get(t, p) { if (p === '__esModule') return true; if (p === 'default') return proxy; return p in t ? t[p] : env.module('react')[p]; } });
  env.react = runtime;
  return proxy;
}
const isJsxValue = (v) => (Array.isArray(v) ? v.some(isJsxValue) : !!v && typeof v === 'object' && !v.__isFake && Object.hasOwn(v, '$el'));
// the layer a front-end verdict names (research 18, 19: every verdict names its layer and its admitted set)
export const FRONT_END_OBSERVATION = Object.freeze({ layer: 'element tree', renders: 'one', handlers: 'each invoked once on a fake event, its result and requests recorded', effects: 'run once after the render, in registration order; cleanups recorded as pending', schedule: 'synchronous; microtasks drained after the call; timers recorded as pending, never fired' });
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
  const epoch = 1700000000000;
  const dateNow = (...args) => epoch + env.clock('Date.now', args);
  const FakeDate = new Proxy(Date, {
    construct(t, args, newTarget) { return Reflect.construct(t, args.length ? args : [epoch + env.clock('Date', [], 'new')], newTarget); },
    get(t, p) { return p === 'now' ? dateNow : Reflect.get(t, p); },
    apply(t, receiver, args) { return new Date(epoch + env.clock('Date', args)).toString(); },
  });
  const hrtime = (...args) => {
    const ns = BigInt(env.clock('process.hrtime', args)) * 1000000n;
    const previous = args[0];
    const delta = previous === undefined ? ns : ns - (BigInt(previous[0]) * 1000000000n + BigInt(previous[1]));
    const nanos = (delta % 1000000000n + 1000000000n) % 1000000000n;
    return [Number((delta - nanos) / 1000000000n), Number(nanos)];
  };
  hrtime.bigint = (...args) => BigInt(env.clock('process.hrtime.bigint', args)) * 1000000n;
  const fakeProcess = new Proxy(env.module('process'), { get(t, p) { return p === 'hrtime' ? hrtime : Reflect.get(t, p); } });
  const performanceNow = (...args) => env.clock('performance.now', args) / 1000;
  const fakePerformance = new Proxy(env.module('performance'), { get(t, p) { return p === 'now' ? performanceNow : Reflect.get(t, p); } });
  const g = {
    console: env.module('console'), process: fakeProcess, fetch: env.fake('global:fetch'), Date: FakeDate,
    setTimeout: (fn, ms, ...a) => { env.pending.push({ op: 'setTimeout', ms: Number(ms) || 0 }); return env.pending.length; },
    setInterval: (fn, ms) => { env.pending.push({ op: 'setInterval', ms: Number(ms) || 0 }); return env.pending.length; },
    setImmediate: (fn) => { env.pending.push({ op: 'setImmediate' }); return env.pending.length; },
    clearTimeout: (id) => { env.record('call', 'global:clearTimeout', [render(id)]); }, clearInterval: (id) => { env.record('call', 'global:clearInterval', [render(id)]); }, queueMicrotask: (fn) => Promise.resolve().then(fn),
    Math: Object.assign(Object.create(Math), { random: () => env.rng() }),
    Buffer, JSON, Object, Array, String, Number, Boolean, Map, Set, WeakMap, WeakSet, Symbol, Promise, Error, TypeError, RangeError, SyntaxError, RegExp, parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, encodeURI, decodeURI, URL, URLSearchParams, TextEncoder, TextDecoder, BigInt, Reflect, Proxy, structuredClone,
    globalThis: null, crypto: env.module('crypto'), performance: fakePerformance, React: react,
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
  // the heap layer, stage 1: the object graph reachable from the arguments is named before the call (graph.mjs)
  let graph;
  try { graph = new Graph().before(args); } catch (e) { if (e instanceof BudgetError) return { harness: `budget: ${e.message}` }; throw e; }
  let outcome, outcomeValue, hasOutcome = false;
  lateErrors.length = 0;
  try {
    const slotsBefore = (env.hookSlots ?? []).slice(), traceBefore = env.trace.length, callsBefore = new Map(env.calls), demandBefore = env.demand; // the environment's answers are seeded by path and call index: with the same counters the second render asks the same questions and gets the same answers; the clock and the random stream are not restored (a read of them in a render is the impurity the check is for)
    let v = await commitRender(env, () => unit.call(args), ms);
    if (isJsxValue(v) && env.react) { // a rendered unit renders twice from the same slots (Strict Mode's rule, run by lean alone): a differing tree or request trace is an impure render, REFUSE with both renders
      const traceAfter = env.trace.length, pendingAfter = env.pending.length, effectsAfter = (env.reactEffects ?? []).length, slotsAfter = (env.hookSlots ?? []).slice();
      const callsAfter = new Map(env.calls), demandAfter = env.demand;
      env.hookSlots = slotsBefore.slice(); env.calls = new Map(callsBefore); env.demand = demandBefore;
      const v2 = await commitRender(env, () => unit.call(args), ms);
      const first = { tree: render(v), trace: env.trace.slice(traceBefore, traceAfter) }, second = { tree: render(v2), trace: env.trace.slice(traceAfter) };
      env.trace.length = traceAfter; env.pending.length = pendingAfter; if (env.reactEffects) env.reactEffects.length = effectsAfter; env.hookSlots = slotsAfter; env.calls = callsAfter; env.demand = demandAfter; // the second render leaves nothing behind
      if (JSON.stringify(first) !== JSON.stringify(second)) return { impure: { first, second } };
    }
    for (const effect of env.reactEffects ?? []) { // the mount's effects, once, in registration order (the pending records of their cleanups are part of the one-render observation)
      const es = (env.effectSlots ?? []).find((x) => x && x.fn === effect);
      try { const cleanup = await withTimeout(Promise.resolve(effect()), ms); if (typeof cleanup === 'function') env.pending.push({ op: 'react:cleanup', handler: render(cleanup) }); if (es) { es.ran = true; es.lastDeps = es.deps; es.cleanup = typeof cleanup === 'function' ? cleanup : null; } }
      catch (e) { if (e instanceof BudgetError || e?.message === '__timeout__') throw e; env.record('effect-throw', 'react', [render(e)]); if (es) { es.ran = true; es.lastDeps = es.deps; } }
    }
    if (isJsxValue(v) && env.react && env.stateDirty) v = await commitEffects(env, () => unit.call(args), ms, await commitRender(env, () => unit.call(args), ms)); // an effect set the state: React re-renders and settles again
    outcomeValue = await withTimeout(observeJsx(v, env), ms); hasOutcome = true;
    if (isJsxValue(outcomeValue)) side.sawJsx = true; // the unit rendered: the certificate names the front-end layer of this observation
    outcome = { returned: render(outcomeValue) };
  } catch (e) {
    if (e && e.message === '__timeout__') return { harness: 'timeout' };
    if (e instanceof BudgetError) return { harness: `budget: ${e.message}` };
    if (e instanceof Suspended || (e && typeof e.then === 'function')) return { harness: `suspense: ${e instanceof Suspended ? e.message.slice(10) : 'a thenable thrown during render'}` }; // ASK:suspense, never a crash and never a thrown-value outcome
    if (e instanceof RenderLoop) return { harness: e.message }; // ASK:render-loop: React would throw or never settle
    if (e instanceof RangeError && /call stack/.test(String(e.message))) return { harness: 'stack overflow' };
    outcome = { threw: render(e) };
  }
  // drain microtasks so pending work settles
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r)); // let a fire-and-forget continuation fail now rather than during the next side
  for (const m of lateErrors.splice(0)) env.record('late-error', 'process', [m.slice(0, 200)]);
  // the receiver's own state after the call: every field of `this` the run touched, rendered (a typed field such as a
  // Map or a counter is a real value, so a change to it is seen here, not on the trace)
  const receiver = {};
  let own = {};
  if (side.unit && side.unit.receiver) { for (const [k, v] of env.cache) if (k.startsWith('this.') && !k.includes('(') && !k.includes('#') && !k.includes('.', 5)) receiver[k] = render(v); own = side.unit.receiver.__own ? side.unit.receiver.__own() : {}; for (const k of Object.keys(own)) receiver[`this.${k}`] = render(own[k]); }
  // the graph after the call: the arguments, the receiver's own fields and the outcome as roots, then every pre-call
  // object; a fresh object is named by its first sight, so two runs equal up to a renaming serialise the same
  let heap;
  try { heap = graph.after(args, own, outcomeValue, hasOutcome); } catch (e) { if (e instanceof BudgetError) return { harness: `budget: ${e.message}` }; throw e; }
  return { outcome, heap, receiver, trace: env.trace, pending: env.pending };
}

// ----- re-render sequences: the component as a machine over its hook slots -----
// After the mount, a bounded set of command sequences runs on both sides from a fresh mount each: `fire` a handler of
// the current tree on a fake event, `settle` (effects whose deps changed by Object.is, cleanup first; microtasks
// drained), re-render, compare the tree, the requests and the pending work; `unmount` closes every path (every
// cleanup). A divergence is a WITNESS with the sequence; a clean run states its depth and breadth in the bound.
const sameDeps = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
async function settleEffects(env, ms) {
  for (const es of env.effectSlots ?? []) {
    if (!es) continue;
    if (es.ran && es.deps !== undefined && sameDeps(es.deps, es.lastDeps)) continue;
    if (es.cleanup) { env.record('call', `${es.key}.cleanup`, []); try { await withTimeout(Promise.resolve(es.cleanup()), ms); } catch (e) { if (e instanceof BudgetError || e?.message === '__timeout__') throw e; env.record('effect-throw', es.key, [render(e)]); } es.cleanup = null; }
    env.record('call', es.key, []);
    try { const c = await withTimeout(Promise.resolve(es.fn()), ms); es.cleanup = typeof c === 'function' ? c : null; } catch (e) { if (e instanceof BudgetError || e?.message === '__timeout__') throw e; env.record('effect-throw', es.key, [render(e)]); }
    es.ran = true; es.lastDeps = es.deps;
  }
  await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r));
}
const eraseHandlers = (v) => (Array.isArray(v) ? v.map(eraseHandlers) : v && typeof v === 'object' && !v.__isFake && Object.hasOwn(v, '$el') ? { $el: v.$el, props: Object.fromEntries(Object.entries(v.props).map(([k, x]) => [k, typeof x === 'function' ? 'fn' : eraseHandlers(x)])), children: v.children.map(eraseHandlers) } : v);
const treeHandlers = (v, at = [], out = []) => { if (Array.isArray(v)) { v.forEach((c, i) => treeHandlers(c, [...at, `[${i}]`], out)); return out; } if (!v || typeof v !== 'object' || v.__isFake || !Object.hasOwn(v, '$el')) return out; for (const [k, x] of Object.entries(v.props)) if (/^on[A-Z]/.test(k) && typeof x === 'function') out.push({ label: `${at.join('/')}:${k}`, fn: x }); v.children.forEach((c, i) => treeHandlers(c, [...at, `${typeof v.$el === 'string' ? v.$el : 'C'}[${i}]`], out)); return out; };
async function runSequences({ files, roots, spec, unit, seed, inputIndex, ms, depth, breadth }) {
  const mount = async (name) => { // a fresh mount: the same seed gives the same fakes and the same inputs as the pair's run of this input
    const env = new Environment(seed * 7919 + inputIndex); env.shapes = spec;
    const exportsObj = sandbox(env, roots[name]).load(files[name]); const u = pickUnit(exportsObj, spec, env); if (!u) throw new Error(`${name}: unit ${unit} not exported`);
    await new Promise((r) => setImmediate(r)); env.trace.length = 0; env.pending.length = 0; env.calls.clear();
    const inputs = aliasInputs(inputsFor(spec, seed, inputIndex, env), spec, seed, inputIndex); env.argPool = inputs.filter((x) => x && (typeof x === 'object' || typeof x === 'function') && x.__isFake);
    return { env, u, inputs };
  };
  const renderOnce = async (s) => commitRender(s.env, () => s.u.call(s.inputs), ms);
  const commit = async (s) => commitEffects(s.env, () => s.u.call(s.inputs), ms, await renderOnce(s)); // render, effects, and again while an effect changes the state
  // run one command path on one side; returns the observation after every command
  const runPath = async (name, labels) => {
    const s = await mount(name); const obs = [];
    let tree = await commit(s); // the mount, its effects, and the re-renders they cause
    for (const label of labels) {
      const from = s.env.trace.length;
      const h = treeHandlers(tree).find((x) => x.label === label);
      if (!h) { obs.push({ command: label, missing: true, handlers: treeHandlers(tree).map((x) => x.label) }); return { obs, s }; }
      try { const r = h.fn(s.env.fake(`react:event:${label}`)); if (r && typeof r.then === 'function') await withTimeout(r, ms); } catch (e) { if (e instanceof BudgetError || e?.message === '__timeout__') throw e; s.env.record('handler-throw', label, [render(e)]); }
      tree = await commit(s);
      obs.push({ command: label, tree: eraseHandlers(tree), trace: s.env.trace.slice(from).map((x) => render(x)), pending: render(s.env.pending) });
    }
    // unmount: every cleanup, in slot order
    const from = s.env.trace.length;
    for (const es of s.env.effectSlots ?? []) if (es && es.cleanup) { s.env.record('call', `${es.key}.cleanup`, []); try { await withTimeout(Promise.resolve(es.cleanup()), ms); } catch (e) { if (e instanceof BudgetError || e?.message === '__timeout__') throw e; s.env.record('effect-throw', es.key, [render(e)]); } es.cleanup = null; }
    obs.push({ command: 'unmount', trace: s.env.trace.slice(from).map((x) => render(x)) });
    return { obs, s, handlers: treeHandlers(tree).map((x) => x.label) };
  };
  let paths = 0; let frontier = [[]]; const done = new Set();
  for (let level = 0; level <= depth; level++) {
    const next = [];
    for (const labels of frontier) {
      const key = labels.join('>'); if (done.has(key)) continue; done.add(key); paths++;
      let P, C;
      try { P = await runPath('parent', labels); C = await runPath('candidate', labels); } catch (e) { if (e instanceof BudgetError || e?.message === '__timeout__' || e instanceof Suspended || e instanceof RenderLoop) return { ask: `sequence ${JSON.stringify(labels)}: ${e.message}` }; throw e; }
      for (let k = 0; k < Math.max(P.obs.length, C.obs.length); k++) {
        const a = JSON.stringify(P.obs[k] ?? null), b = JSON.stringify(C.obs[k] ?? null);
        if (a !== b) return { witness: { input: inputIndex, sequence: [...labels, ...(labels.length > k ? [] : [])].slice(0, k + 1).concat(k >= labels.length ? ['unmount'] : []), step: k, parent: P.obs[k] ?? null, candidate: C.obs[k] ?? null } };
      }
      if (level < depth) for (const label of (P.handlers ?? []).slice(0, breadth)) next.push([...labels, label]);
    }
    frontier = next;
  }
  return { paths };
}

export { commitRender, commitEffects, settleEffects, treeHandlers, RenderLoop };
export async function runPair(opts) {
  const { parent, candidate, unit, n = 200, seed = 1, ms = 2000, project = true, sequenceDepth = 2, sequenceBreadth = 4, sequenceInputs = 2 } = opts;
  // a missing parent unit has no equality question
  if (!parent || !fs.existsSync(parent) || !topLevelFunctions(ts.createSourceFile(parent, fs.readFileSync(parent, 'utf8'), ts.ScriptTarget.Latest, true)).has(unit)) {
    return runNew(opts);
  }
  let spec;
  try { spec = specOf(candidate, unit, { project }); } catch (e) { return { verdict: 'ASK', reason: `spec: ${e.message}` }; }
  const roots = { parent: findRoot(parent), candidate: findRoot(candidate) };
  const diffs = [];
  let harnessAsk = null, sawJsx = false;
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
      const inputs = aliasInputs(inputsFor(spec, seed, i, env), spec, seed, i); // the i-th input set may share objects between positions of one shape (heap layer, stage 1)
      env.argPool = inputs.filter((x) => x && (typeof x === 'object' || typeof x === 'function') && x.__isFake); // handles the unit was handed: a generated key or member may be one of them
      sides[name] = { env, unit: u, inputs };
    }
    if (harnessAsk) break;
    const oP = await observe(sides.parent, spec, sides.parent.inputs, ms);
    const oC = await observe(sides.candidate, spec, sides.candidate.inputs, ms);
    if (sides.parent.sawJsx || sides.candidate.sawJsx) sawJsx = true;
    if (oP.impure || oC.impure) return { verdict: 'REFUSE', kind: 'render-impure', unit, side: oP.impure ? 'parent' : 'candidate', input: i, args: sides.parent.inputs.map((a) => render(a)), renders: (oP.impure ?? oC.impure), reason: `render-impure: the ${oP.impure ? 'parent' : 'candidate'} renders two different trees or request traces from the same state (Rules of React: a render is pure)`, bound: { n, seed, ms } };
    if (oP.harness || oC.harness) { harnessAsk = `input ${i}: ${oP.harness ? 'parent ' + oP.harness : 'candidate ' + oC.harness}`; break; }
    const sP = JSON.stringify(oP), sC = JSON.stringify(oC);
    if (sP !== sC) {
      diffs.push({ input: i, args: sides.parent.inputs.map((a) => render(a)), parent: oP, candidate: oC, where: firstDifference(oP, oC) });
      if (diffs.length >= 3) break;
    }
  }
  const bound = { n, seed, ms, fakes: 'demand-driven proxies, seeded primitives, seeded recorded clocks', inputs: 'from parameter types with boundary values first; positions of one shape sometimes share one object', observation: 'outcome, the reachable object graph (identity up to a renaming of fresh objects), receiver fields, trace, pending work' };
  if (sawJsx) bound.frontEnd = { ...FRONT_END_OBSERVATION, notObserved: 'committed DOM, computed styles, layout, pixels, accessibility tree, re-renders after a state change' }; // a rendered unit: the layer this verdict holds at, and the layers it says nothing about
  if (diffs.length) return { verdict: 'WITNESS', unit, witnesses: diffs, bound, spec: { params: spec.params, returns: spec.returns, literals: spec.literals, strings: spec.strings } };
  if (harnessAsk) return { verdict: 'ASK', reason: harnessAsk, unit, bound, ran: diffs.length };
  if (sawJsx && sequenceDepth > 0) { // the one-render check found no difference: re-render sequences from a fresh mount, on the first inputs
    let paths = 0;
    for (let i = 0; i < Math.min(sequenceInputs, n); i++) {
      const r = await runSequences({ files: { parent, candidate }, roots, spec, unit, seed, inputIndex: i, ms, depth: sequenceDepth, breadth: sequenceBreadth });
      if (r.ask) return { verdict: 'ASK', reason: `input ${i}: ${r.ask}`, unit, bound };
      if (r.witness) { bound.frontEnd.renders = `one, then command sequences of up to ${sequenceDepth} clicks`; return { verdict: 'WITNESS', unit, witnesses: [{ input: i, sequence: r.witness.sequence, step: r.witness.step, parent: r.witness.parent, candidate: r.witness.candidate, where: { field: 'sequence', command: r.witness.sequence[r.witness.step] ?? 'unmount' } }], bound, spec: { params: spec.params, returns: spec.returns, literals: spec.literals, strings: spec.strings } }; }
      paths += r.paths ?? 0;
    }
    bound.frontEnd.renders = `one, then every command sequence of up to ${sequenceDepth} clicks over at most ${sequenceBreadth} handlers per step, from a fresh mount, on ${Math.min(sequenceInputs, n)} inputs (${paths} paths); effects re-run by Object.is deps with cleanup first; unmount runs every cleanup`;
    bound.frontEnd.notObserved = 'committed DOM, computed styles, layout, pixels, accessibility tree; timers never fire; sequences beyond the depth';
  }
  return { verdict: 'PASS-bounded', unit, bound, spec: { params: spec.params, returns: spec.returns, literals: spec.literals, strings: spec.strings } };
}

function firstDifference(a, b) {
  for (const k of ['outcome', 'heap', 'receiver', 'trace', 'pending']) {
    const x = JSON.stringify(a[k]), y = JSON.stringify(b[k]);
    if (x !== y) {
      if (k === 'trace') { const i = a.trace.findIndex((e, j) => JSON.stringify(e) !== JSON.stringify(b.trace[j])); return { field: k, index: i, parent: a.trace[i] ?? null, candidate: b.trace[i] ?? null }; }
      if (k === 'heap') { const h = a.heap ?? {}, g = b.heap ?? {}; for (const part of ['roots', 'outcome', 'own']) if (JSON.stringify(h[part]) !== JSON.stringify(g[part])) return { field: 'heap', part }; const n = Math.max((h.heap ?? []).length, (g.heap ?? []).length); for (let j = 0; j < n; j++) if (JSON.stringify((h.heap ?? [])[j]) !== JSON.stringify((g.heap ?? [])[j])) return { field: 'heap', object: j, anchor: j < (h.anchors ?? 0), parent: (h.heap ?? [])[j] ?? null, candidate: (g.heap ?? [])[j] ?? null }; return { field: 'heap' }; }
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
  const res = await runPair({ parent: opt('--parent'), candidate: opt('--candidate'), unit: opt('--unit'), n: Number(opt('--n', 200)), seed: Number(opt('--seed', 1)), ms: Number(opt('--ms', 2000)), project: a.includes('--no-project') ? false : opt('--project', true), sequenceDepth: Number(opt('--sequence-depth', 2)), sequenceBreadth: Number(opt('--sequence-breadth', 4)), sequenceInputs: Number(opt('--sequence-inputs', 2)) });
  const out = opt('--out', null);
  const text = JSON.stringify(res, null, 1);
  if (out) fs.writeFileSync(out, text); else console.log(text);
  if (out) console.log(`${res.verdict}${res.reason ? ': ' + res.reason : ''} -> ${out}`);
  process.exit(res.verdict === 'ASK' ? 2 : 0);
}
