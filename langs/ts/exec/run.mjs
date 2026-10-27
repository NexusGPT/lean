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
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { ts, loadProgram, topLevelFunctions } from '../common.mjs';
import { Environment, render, BudgetError } from './fake.mjs';
import { specOf } from './spec.mjs';
import { inputsFor, aliasInputs } from './gen.mjs';
import { enumerateHeaps } from './korat.mjs';
import { runNew } from './new-unit.mjs';
import { Graph } from './graph.mjs';
import { startRecording, stopRecording, addRealm, summarizeRecords } from './transitions.mjs';
import { descriptorsOf, interpretFire, newHandlerStats } from './handlers-interp.mjs';

const require = createRequire(import.meta.url);
// The library transition table (translate/library.json) is validated on every run: while the unit runs, each built-in
// call of the table made from the sandbox's files is recorded (transitions.mjs) and checked against its row; the
// certificate carries the counts and every defect. LEAN_LIBRARY_TABLE names another table (the suite's negative
// check); LEAN_LIBRARY_CASES names a directory where each defect is written as a case.
const loadedFiles = new Set(); // every file a sandbox loaded: a built-in call is the unit's when its caller's file is one of them
let libraryTable = null;
const libraryTableOf = () => libraryTable ??= JSON.parse(fs.readFileSync(process.env.LEAN_LIBRARY_TABLE || path.join(path.dirname(new URL(import.meta.url).pathname), '../translate/library.json'), 'utf8'));
let activeRecords = null, windowDepth = 0; // a run's record set, and the window: the prototypes are patched only while unit code runs (guardedCall, an effect, a cleanup, the await of a promise the unit returned), so the harness's own work between calls costs nothing
const recording = async (records, fn) => { const prev = activeRecords; activeRecords = records; try { return await fn(); } finally { activeRecords = prev; } };
const openWindow = (env) => { if (!activeRecords) return false; if (windowDepth++ === 0) { startRecording(activeRecords, undefined, { keep: (f) => loadedFiles.has(f) }); } if (env && env.realm) addRealm(env.realm); return true; };
const closeWindow = (opened) => { if (!opened) return; if (--windowDepth === 0) stopRecording(); };
const awaitUnit = async (env, p, ms) => { const w = openWindow(env); try { return await withTimeout(p, ms); } finally { closeWindow(w); } }; // a promise the unit returned: its continuations are unit code
const libraryCases = (summary) => {
  const dir = process.env.LEAN_LIBRARY_CASES; if (!dir || !summary.defects.length) return;
  fs.mkdirSync(dir, { recursive: true });
  for (const d of summary.defects) { const name = `${d.op.replace(/[^A-Za-z0-9]+/g, '_')}-${crypto.createHash('sha256').update(JSON.stringify(d)).digest('hex').slice(0, 12)}.json`; fs.writeFileSync(path.join(dir, name), JSON.stringify(d, null, 1)); }
};

const COMPILE = { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true, emitDecoratorMetadata: false, esModuleInterop: true, importHelpers: false, strict: false, sourceMap: false, removeComments: true, jsx: ts.JsxEmit.ReactJSX, allowJs: true, moduleDetection: ts.ModuleDetectionKind.Force };

// the loader's marks: every `on[A-Z]` JSX attribute value becomes `__lean_h(pos, value, file)` and every `useState(...)`
// or `x.useState(...)` call `__lean_s(pos, call, file)`, where pos is the node's position in the source; both return
// their value unchanged and record the function or the slot under that position (handlers-interp.mjs meets them with
// the static descriptors there). The positions are the source file's unless the file uses import.meta before the node
// (src2 replaces it before transpiling)
const leanMarks = (file) => (context) => {
  const f = context.factory;
  const visit = (node) => {
    if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name) && /^on[A-Z]/.test(node.name.text) && node.initializer && ts.isJsxExpression(node.initializer) && node.initializer.expression) {
      const e = node.initializer.expression;
      return f.updateJsxAttribute(node, node.name, f.updateJsxExpression(node.initializer, f.createCallExpression(f.createIdentifier('__lean_h'), undefined, [f.createNumericLiteral(e.pos), ts.visitNode(e, visit), f.createStringLiteral(file)])));
    }
    if (ts.isCallExpression(node) && ((ts.isIdentifier(node.expression) && node.expression.text === 'useState') || (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'useState'))) {
      return f.createCallExpression(f.createIdentifier('__lean_s'), undefined, [f.createNumericLiteral(node.pos), ts.visitEachChild(node, visit, context), f.createStringLiteral(file)]);
    }
    return ts.visitEachChild(node, visit, context);
  };
  return (sf) => ts.visitNode(sf, visit);
};

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
const deepMode = { on: false }; // --deep: a same-package function component is rendered one level down (moonshot 7); off, a component tag is its name and props (a tree of names)
function jsxValue(type, props, key, env = null) {
  const tag = typeof type === 'string' ? type : type && type.__isFake ? { $fake: type.__fakePath } : typeof type === 'function' ? { $component: type.name || 'anonymous' } : type === JSX_FRAGMENT ? '' : String(type);
  const rest = {}; let children = [];
  for (const k of Object.keys(props ?? {})) { if (k === 'children') children = jsxChildren(props[k]); else rest[k] = props[k]; }
  if (key !== undefined && key !== null) rest.key = key;
  const el = { $el: tag, props: rest, children };
  // deep render: a same-package component (a real function the sandbox linked, never a fake) is called with its props
  // inside the parent's render, on its own hook frame keyed by its order among the parent's component tags (React keys
  // by position); one level only, so a component tag inside the child is a name again; no context
  if (deepMode.on && env && env.react && typeof type === 'function' && !type.__isFake && !(env.deepDepth > 0)) {
    const frameKey = `${type.name || 'anonymous'}#${env.deepSeq = (env.deepSeq ?? 0) + 1}`;
    const frames = (env.childFrames ??= new Map()); if (!frames.has(frameKey)) frames.set(frameKey, { hookSlots: [], effectSlots: [] });
    const frame = frames.get(frameKey);
    const saved = env.react.__pushFrame(frame); env.deepDepth = (env.deepDepth ?? 0) + 1;
    try { el.rendered = type({ ...rest, ...(children.length ? { children: children.length === 1 ? children[0] : children } : {}) }); }
    catch (e) { if (e instanceof BudgetError || e?.message === '__timeout__' || e instanceof Suspended || e instanceof RenderLoop) throw e; el.rendered = { threw: render(e) }; }
    finally { env.deepDepth -= 1; env.react.__popFrame(saved); }
    el.deep = frameKey;
  }
  return el;
}
const JSX_FRAGMENT = '';
const jsxRuntimeFor = (env) => { const j = (type, props, key) => jsxValue(type, props, key, env); return { jsx: j, jsxs: j, jsxDEV: j, Fragment: JSX_FRAGMENT, __esModule: true }; };

class RenderLoop extends Error { constructor(why) { super(`render-loop: ${why}`); this.name = 'RenderLoop'; } } // React's own limits: 25 re-renders from a setter during render, then it throws; effects that keep setting state re-render without end
// one commit: render until a setter during render stops changing the state (React re-renders at once, up to 25 times)
async function commitRender(env, call, ms) {
  let v, renders = 0;
  do { env.stateDirty = false; env.react?.__beginRender?.(); renders++; const r = call(); v = (r && typeof r.then === 'function') ? await awaitUnit(env, r, ms) : r; if (env.stateDirty && renders >= 25) throw new RenderLoop('a setter during render re-rendered 25 times'); } while (env.stateDirty && env.react);
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
      const setter = (next) => { const v = typeof next === 'function' ? next(slots[i]) : next; if (!Object.is(v, slots[i])) env.stateDirty = true; slots[i] = v; }; // no trace record: the slots after the handler are the observation (observeJsx), so the order of setter calls inside one handler, React's batching, is not
      (env.setterIndex ??= new WeakMap()).set(setter, i); // the slot a setter writes: the loader's __lean_s mark turns it into position -> slot on the current frame
      return [value, setter];
    },
    useEffect: (fn, deps) => effectSlot(fn, deps, 'react:effect'),
    use: (x) => { if (x && typeof x.then === 'function') throw new Suspended('use(promise)'); return x; }, // a suspended render: no model of the fallback and the retry; the run ends as ASK:suspense
    useRef: (initial) => { const i = slot++; const slots = (env.hookSlots ??= []); if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; }, // one box per slot, the same box on every render
    useId: () => { const i = slot++; const slots = (env.hookSlots ??= []); if (!(i in slots)) slots[i] = `:r${i}:`; return slots[i]; }, // a stable id per slot
    useContext: (ctx) => { const i = slot++; const slots = (env.hookSlots ??= []); if (!(i in slots)) slots[i] = env.fake(`react:context:${ctx && ctx.__fakePath ? ctx.__fakePath : ctx && ctx.displayName ? ctx.displayName : 'anonymous'}`); env.record('get', `react:context:${i}`); return slots[i]; }, // the provided value is outside the unit: one fake per context, the same on every render
    useReducer: (reducer, initialArg, init) => { const i = slot++; const key = `react:state:${i}`; const slots = (env.hookSlots ??= []); if (!(i in slots)) { slots[i] = init ? init(initialArg) : initialArg; env.record('hook', key, [render(slots[i])]); } const dispatch = (action) => { const v = reducer(slots[i], action); if (!Object.is(v, slots[i])) env.stateDirty = true; slots[i] = v; }; return [slots[i], dispatch]; },
    useLayoutEffect: (fn, deps) => effectSlot(fn, deps, 'react:layout-effect'), // as useEffect: after the render, in registration order (layout effects run first in React; one component, one order)
  };
  runtime.__beginRender = () => { slot = 0; env.deepSeq = 0; }; // a render starts at slot 0 (React's call-order keying); the deep children restart their order too
  runtime.__pushFrame = (frame) => { const saved = { slot, hookSlots: env.hookSlots, effectSlots: env.effectSlots, hookFrame: env.hookFrame }; slot = 0; env.hookSlots = frame.hookSlots; env.effectSlots = frame.effectSlots; env.hookFrame = frame; return saved; }; // a child's own hook frame (its own position -> slot map too)
  runtime.__popFrame = (saved) => { slot = saved.slot; env.hookSlots = saved.hookSlots; env.effectSlots = saved.effectSlots; env.hookFrame = saved.hookFrame; };
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
    try { const returned = render(await props[k](env.fake(`react:event:${k}`))); props[k] = { $handler: { returned, slots: render(env.hookSlots ?? []) } }; } // the state the handler leaves, whatever the order of its setter calls
    catch (e) { if (e instanceof BudgetError) throw e; props[k] = { $handler: { threw: render(e), slots: render(env.hookSlots ?? []) } }; }
  }
  const children = [];
  for (const c of v.children) children.push(await observeJsx(c, env));
  const out = { ...v, props, children };
  if (Object.hasOwn(v, 'rendered')) out.rendered = await observeJsx(v.rendered, env); // the deep child's own tree, its handlers invoked like the parent's
  return out;
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
    setTimeout: (fn, ms, ...a) => env.arm('timeout', fn, ms, a), setInterval: (fn, ms, ...a) => env.arm('interval', fn, ms, a), setImmediate: (fn, ...a) => env.arm('immediate', fn, 0, a),
    requestAnimationFrame: (fn) => env.arm('frame', fn, 16), requestIdleCallback: (fn) => env.arm('idle', fn, 1),
    clearTimeout: (id) => env.clearTimer(id, 'clearTimeout'), clearInterval: (id) => env.clearTimer(id, 'clearInterval'), clearImmediate: (id) => env.clearTimer(id, 'clearImmediate'), cancelAnimationFrame: (id) => env.clearTimer(id, 'cancelAnimationFrame'), cancelIdleCallback: (id) => env.clearTimer(id, 'cancelIdleCallback'), queueMicrotask: (fn) => Promise.resolve().then(fn),
    Math: Object.assign(Object.create(Math), { random: () => env.rng() }),
    Buffer, JSON, Object, Array, String, Number, Boolean, Map, Set, WeakMap, WeakSet, Symbol, Promise, Error, TypeError, RangeError, SyntaxError, RegExp, parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent, encodeURI, decodeURI, URL, URLSearchParams, TextEncoder, TextDecoder, BigInt, Reflect, Proxy, structuredClone,
    globalThis: null, crypto: env.module('crypto'), performance: fakePerformance, React: react,
  };
  g.globalThis = g; g.global = g; g.window = undefined;
  // the loader's marks (leanMarks): a handler attribute's function value and a useState pair, each with its source position
  g.__lean_h = (pos, fn, file) => { if (typeof fn === 'function') (env.handlerPos ??= new WeakMap()).set(fn, { pos, file }); return fn; };
  g.__lean_s = (pos, pair, file) => { const i = Array.isArray(pair) && typeof pair[1] === 'function' ? env.setterIndex?.get(pair[1]) : undefined; if (i !== undefined) { const holder = env.hookFrame ?? env; (holder.statePos ??= new Map()).set(`${file}:${pos}`, i); } return pair; };
  const ctx = vm.createContext(g);
  env.realm = vm.runInContext('({ Array: [].constructor, Object: ({}).constructor })', ctx); // the context's own intrinsics: an array literal in the unit uses them, not the host's Array; patched while a recording window is open
  env.ctx = ctx; // a unit call runs under this context's watchdog (guardedCall): a synchronous loop that never ends is a timeout, never a hang or a native crash
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
    let js = ts.transpileModule(src2, { compilerOptions: COMPILE, fileName: tsName, transformers: { before: [leanMarks(abs)] } }).outputText + unitShim(src2, tsName);
    // a decorator is run (so its reads and calls are recorded) but its result never replaces the class or the member:
    // the decorated code stays the code under test, whatever the fake decorator returned
    js = js.replace(/var __decorate = \(this && this\.__decorate\) \|\| function \(decorators, target, key, desc\) \{[\s\S]*?\n\};/,
      'var __decorate = function (decorators, target, key, desc) { var c = arguments.length, r = c < 3 ? target : desc === null ? Object.getOwnPropertyDescriptor(target, key) : desc; for (var i = decorators.length - 1; i >= 0; i--) { var d = decorators[i]; if (d) { try { c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key); } catch (e) { if (!(e && e.__isFake)) throw e; } } } return r; };');
    const mod = { exports: {} };
    cache.set(abs, mod);
    loadedFiles.add(abs);
    const req = (spec) => {
      if (spec.startsWith('.') ) {
        if (/\.(css|scss|sass|less|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|md|txt|html|wasm)(\?.*)?$/i.test(spec)) return env.module(spec); // an asset, not code: a fake module
        const r = resolveRelative(abs, spec);
        if (r && /\.json$/i.test(r)) { try { return JSON.parse(fs.readFileSync(r, 'utf8')); } catch { return env.module(spec); } }
        if (r && (!root || r.startsWith(root))) return load(r);
        return env.module(spec);
      }
      if (spec === 'react') return react;
      if (spec === 'react/jsx-runtime' || spec === 'react/jsx-dev-runtime') return jsxRuntimeFor(env); // an element is a value tree, by React's rules for children
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
  return { load, ctx, react, jsxRuntime: jsxRuntimeFor(env) };
}

export function pickUnit(exportsObj, spec, env) {
  const units = exportsObj.__lean_units ?? {};
  if (!spec.isMethod) {
    const f = units[spec.unit] ?? exportsObj[spec.unit];
    if (typeof f !== 'function') return null;
    return { call: (args) => (spec.thisParam ? f.call(args[0], ...args.slice(1)) : f(...args)), receiver: null }; // a free function with a declared `this` parameter takes its receiver first
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

// a synchronous call under the vm's watchdog: JavaScript cannot be preempted, so an unbounded loop (an input aliased
// into the array it grows, a mutant that breaks a bound) is interrupted by the isolate and reported as a timeout
class CallTimeout extends Error { constructor(ms) { super(`__timeout__`); this.ms = ms; } }
function guardedCall(env, fn, ms) {
  if (!env.ctx) return fn();
  env.ctx.__leanCall = fn;
  const w = openWindow(env);
  try { return vm.runInContext('__leanCall()', env.ctx, { timeout: Math.max(1, ms) }); }
  catch (e) { if (e && e.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') throw new CallTimeout(ms); throw e; }
  finally { delete env.ctx.__leanCall; closeWindow(w); }
}
const callUnit = (env, fn) => { const w = openWindow(env); try { return fn(); } finally { closeWindow(w); } }; // an effect or a cleanup called directly: unit code, inside a window
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
    const call = () => guardedCall(env, () => unit.call(args), ms);
    let v = await commitRender(env, call, ms);
    if (isJsxValue(v) && env.react) { // a rendered unit renders twice from the same slots (Strict Mode's rule, run by lean alone): a differing tree or request trace is an impure render, REFUSE with both renders
      const traceAfter = env.trace.length, pendingAfter = env.pending.length, effectsAfter = (env.reactEffects ?? []).length, slotsAfter = (env.hookSlots ?? []).slice();
      const callsAfter = new Map(env.calls), demandAfter = env.demand;
      env.hookSlots = slotsBefore.slice(); env.calls = new Map(callsBefore); env.demand = demandBefore;
      const v2 = await commitRender(env, call, ms);
      const first = { tree: render(v), trace: env.trace.slice(traceBefore, traceAfter) }, second = { tree: render(v2), trace: env.trace.slice(traceAfter) };
      env.trace.length = traceAfter; env.pending.length = pendingAfter; if (env.reactEffects) env.reactEffects.length = effectsAfter; env.hookSlots = slotsAfter; env.calls = callsAfter; env.demand = demandAfter; // the second render leaves nothing behind
      if (JSON.stringify(first) !== JSON.stringify(second)) return { impure: { first, second } };
    }
    for (const effect of env.reactEffects ?? []) { // the mount's effects, once, in registration order (the pending records of their cleanups are part of the one-render observation)
      const es = (env.effectSlots ?? []).find((x) => x && x.fn === effect);
      try { const cleanup = await awaitUnit(env, Promise.resolve(callUnit(env, effect)), ms); if (typeof cleanup === 'function') env.pending.push({ op: 'react:cleanup', handler: render(cleanup) }); if (es) { es.ran = true; es.lastDeps = es.deps; es.cleanup = typeof cleanup === 'function' ? cleanup : null; } }
      catch (e) { if (e instanceof BudgetError || e?.message === '__timeout__') throw e; env.record('effect-throw', 'react', [render(e)]); if (es) { es.ran = true; es.lastDeps = es.deps; } }
    }
    if (isJsxValue(v) && env.react && env.stateDirty) v = await commitEffects(env, call, ms, await commitRender(env, call, ms)); // an effect set the state: React re-renders and settles again
    outcomeValue = await withTimeout(observeJsx(v, env), ms); hasOutcome = true;
    if (env.timers.queue.length) await runTimers(env, ms); // every timer the call armed, once, in due order; what they ask of the environment lands in the trace
    if (isJsxValue(outcomeValue)) side.sawJsx = true; // the unit rendered: the certificate names the front-end layer of this observation
    outcome = { returned: render(outcomeValue) };
  } catch (e) {
    if (e && e.message === '__timeout__') return { harness: 'timeout' };
    if (e instanceof BudgetError) return { harness: `budget: ${e.message}` };
    if (e instanceof Suspended || (e && typeof e.then === 'function')) return { harness: `suspense: ${e instanceof Suspended ? e.message.slice(10) : 'a thenable thrown during render'}` }; // ASK:suspense, never a crash and never a thrown-value outcome
    if (e instanceof RenderLoop) return { harness: e.message }; // ASK:render-loop: React would throw or never settle
    if (e instanceof CallTimeout) return { harness: 'timeout' };
    if (e && (e instanceof RangeError || e.name === 'RangeError') && /call stack/i.test(String(e.message))) return { harness: 'stack overflow' }; // whichever realm threw it: the host's (a fake, a patched intrinsic) or the sandbox's (the unit's own recursion)
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
  return { outcome, heap, receiver, trace: env.trace, pending: env.pending.map(({ id, ...rest }) => rest) }; // a timer id is an arm counter, not an observation
}

// ----- the virtual clock: armed timers fire in due order -----
// runTimers fires every armed timer once, in due order (ties by arm order), moving the clock to each due instant; an
// interval re-arms after its run and stays pending; a timer that arms another runs it too, up to the limit (then a
// budget: ASK). The observation holds the fired order (a 'fire' record per timer) and what each callback asked of
// the environment.
const PERMS = { 1: [[0]], 2: [[0, 1], [1, 0]], 3: [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]] }; // the firing orders of up to three timers due at one instant
async function runTimers(env, ms, limit = 50, { until = Infinity, perm = 0 } = {}) { // until: fire what is due up to this instant (the schedule explorer advances the clock step by step); perm: which order the timers due at one instant fire in (the event loop fixes none for equal instants)
  const t = env.timers; let fired = 0;
  for (;;) {
    const due = t.queue.filter((e) => e.fired === 0 && e.due <= until).sort((a, b) => a.due - b.due || a.order - b.order);
    if (!due.length) break;
    const ties = due.filter((x) => x.due === due[0].due); const pick = perm && PERMS[ties.length] ? ties[PERMS[ties.length][perm % PERMS[ties.length].length][0]] : due[0];
    const e = pick; if (e.due > t.now) t.now = e.due;
    const i = t.queue.indexOf(e); t.queue.splice(i, 1); const j = env.pending.findIndex((x) => x.id === e.id); if (j >= 0) env.pending.splice(j, 1);
    if (++fired > limit) throw new BudgetError(`more than ${limit} timers fired`);
    env.record('fire', { timeout: 'setTimeout', interval: 'setInterval', immediate: 'setImmediate', frame: 'requestAnimationFrame', idle: 'requestIdleCallback' }[e.kind], [e.due]); // the instant, never the id: an id is an arm counter nobody outside sees
    try { const r = guardedCall(env, () => e.fn(...e.args), ms); if (r && typeof r.then === 'function') await awaitUnit(env, r, ms); } catch (x) { if (x instanceof BudgetError || x?.message === '__timeout__') throw x; env.record('timer-throw', e.kind, [render(x)]); }
    if (e.interval) { e.fired = 1; e.due = t.now + e.interval; e.order = t.nextId++; t.queue.push(e); env.pending.push({ op: 'setInterval', ms: e.interval, id: e.id }); } // once per run: the interval stays pending for the next tick
    await new Promise((r) => setImmediate(r));
  }
  for (const e of t.queue) e.fired = 0; // the next run may fire the intervals again
  await new Promise((r) => setImmediate(r));
}
export { runTimers };
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
    if (es.cleanup) { env.record('call', `${es.key}.cleanup`, []); try { await awaitUnit(env, Promise.resolve(callUnit(env, es.cleanup)), ms); } catch (e) { if (e instanceof BudgetError || e?.message === '__timeout__') throw e; env.record('effect-throw', es.key, [render(e)]); } es.cleanup = null; }
    env.record('call', es.key, []);
    try { const c = await awaitUnit(env, Promise.resolve(callUnit(env, es.fn)), ms); es.cleanup = typeof c === 'function' ? c : null; } catch (e) { if (e instanceof BudgetError || e?.message === '__timeout__') throw e; env.record('effect-throw', es.key, [render(e)]); }
    es.ran = true; es.lastDeps = es.deps;
  }
  await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r));
}
const eraseHandlers = (v) => (Array.isArray(v) ? v.map(eraseHandlers) : v && typeof v === 'object' && !v.__isFake && Object.hasOwn(v, '$el') ? { $el: v.$el, props: Object.fromEntries(Object.entries(v.props).map(([k, x]) => [k, typeof x === 'function' ? 'fn' : eraseHandlers(x)])), children: v.children.map(eraseHandlers) } : v);
const treeHandlers = (v, at = [], out = []) => { if (Array.isArray(v)) { v.forEach((c, i) => treeHandlers(c, [...at, `[${i}]`], out)); return out; } if (!v || typeof v !== 'object' || v.__isFake || !Object.hasOwn(v, '$el')) return out; for (const [k, x] of Object.entries(v.props)) if (/^on[A-Z]/.test(k) && typeof x === 'function') out.push({ label: `${at.join('/')}:${k}`, fn: x }); v.children.forEach((c, i) => treeHandlers(c, [...at, `${typeof v.$el === 'string' ? v.$el : 'C'}[${i}]`], out)); return out; };
async function runSequences({ files, roots, spec, unit, seed, inputIndex, ms, depth, breadth, schedules = false, handlers = null }) { // schedules: the clock is a command (moonshot 9): a tick fires what is due at the next instant, ties in every order, and a handler may arrive before a timer fires
  const mount = async (name) => { // a fresh mount: the same seed gives the same fakes and the same inputs as the pair's run of this input
    const env = new Environment(seed * 7919 + inputIndex); env.shapes = spec;
    const exportsObj = sandbox(env, roots[name]).load(files[name]); const u = pickUnit(exportsObj, spec, env); if (!u) throw new Error(`${name}: unit ${unit} not exported`);
    await new Promise((r) => setImmediate(r)); env.trace.length = 0; env.pending.length = 0; env.calls.clear();
    const inputs = aliasInputs(inputsFor(spec, seed, inputIndex, env), spec, seed, inputIndex); env.argPool = inputs.filter((x) => x && (typeof x === 'object' || typeof x === 'function') && x.__isFake);
    return { env, u, inputs };
  };
  const callOf = (s) => () => guardedCall(s.env, () => s.u.call(s.inputs), ms);
  const renderOnce = async (s) => commitRender(s.env, callOf(s), ms);
  const commit = async (s) => commitEffects(s.env, callOf(s), ms, await renderOnce(s)); // render, effects, and again while an effect changes the state
  // run one command path on one side; returns the observation after every command
  const runPath = async (name, labels) => {
    const s = await mount(name); const obs = [];
    const harness = (e) => e instanceof BudgetError || e?.message === '__timeout__' || e instanceof Suspended || e instanceof RenderLoop || e instanceof CallTimeout; // the harness's own stops end the sequence run as ASK; anything else a render throws is an observation
    const settle = async () => { let t = await commit(s); if (!schedules && s.env.timers.queue.length) { await runTimers(s.env, ms); t = await commit(s); } return t; }; // a commit, its effects, the re-renders they cause, and (outside the schedule explorer) the timers they armed
    const tick = async (perm) => { const q = s.env.timers.queue.filter((e) => e.fired === 0); if (!q.length) return null; const next = Math.min(...q.map((e) => e.due)); await runTimers(s.env, ms, 50, { until: next, perm }); return commit(s); }; // the clock advances to the next due instant; the timers due there fire in the chosen order
    let tree;
    try { tree = await settle(); } catch (e) { if (harness(e)) throw e; obs.push({ command: 'mount', threw: render(e), trace: s.env.trace.map((x) => render(x)) }); return { obs, s }; } // a render that throws at the mount: the path ends on that observation, compared like any other
    for (const label of labels) {
      const from = s.env.trace.length;
      if (label.startsWith('tick@')) { // a clock step: the instant it reaches and what fired are the observation
        const perm = Number(label.slice(5)) || 0; const before = s.env.timers.now;
        try { const t2 = await tick(perm); if (t2 !== null) tree = t2; } catch (e) { if (harness(e)) throw e; obs.push({ command: label, threw: render(e), trace: s.env.trace.slice(from).map((x) => render(x)) }); return { obs, s }; }
        obs.push({ command: label, clock: [before, s.env.timers.now], tree: eraseHandlers(tree), trace: s.env.trace.slice(from).map((x) => render(x)), pending: render(s.env.pending.map(({ id, ...rest }) => rest)) });
        continue;
      }
      const h = treeHandlers(tree).find((x) => x.label === label);
      if (!h) { obs.push({ command: label, missing: true, handlers: treeHandlers(tree).map((x) => x.label) }); return { obs, s }; }
      const event = s.env.fake(`react:event:${label}`), slotsBefore = (s.env.hookSlots ?? []).slice(); let threw = false;
      try { const r = guardedCall(s.env, () => h.fn(event), ms); if (r && typeof r.then === 'function') await awaitUnit(s.env, r, ms); } catch (e) { if (harness(e)) throw e; threw = true; s.env.record('handler-throw', label, [render(e)]); }
      if (handlers) interpretFire(handlers.stats, handlers.models[name], { fn: h.fn, label, args: [event], env: s.env, slotsBefore, props: s.inputs[0], threw }); // a readable descriptor applied to the slots before the handler must give the slots the handler left
      try { tree = await settle(); } catch (e) { if (harness(e)) throw e; obs.push({ command: label, threw: render(e), trace: s.env.trace.slice(from).map((x) => render(x)) }); return { obs, s }; } // a render that throws after a click (a state the one-render check never reached): an observation, never a crash
      obs.push({ command: label, tree: eraseHandlers(tree), trace: s.env.trace.slice(from).map((x) => render(x)), pending: render(s.env.pending.map(({ id, ...rest }) => rest)) });
    }
    const pendingTimers = s.env.timers.queue.filter((e) => e.fired === 0); const ties = pendingTimers.length ? pendingTimers.filter((e) => e.due === Math.min(...pendingTimers.map((x) => x.due))).length : 0; // read before the unmount clears them: the clock steps the next level may take
    const ticks = schedules && pendingTimers.length && pendingTimers.length <= 3 ? Array.from({ length: Math.min(PERMS[ties]?.length ?? 1, 6) }, (_, k) => `tick@${k}`) : [];
    // unmount: every cleanup, in slot order
    const from = s.env.trace.length;
    for (const es of s.env.effectSlots ?? []) if (es && es.cleanup) { s.env.record('call', `${es.key}.cleanup`, []); try { await awaitUnit(s.env, Promise.resolve(callUnit(s.env, es.cleanup)), ms); } catch (e) { if (e instanceof BudgetError || e?.message === '__timeout__') throw e; s.env.record('effect-throw', es.key, [render(e)]); } es.cleanup = null; }
    obs.push({ command: 'unmount', trace: s.env.trace.slice(from).map((x) => render(x)) });
    return { obs, s, handlers: treeHandlers(tree).map((x) => x.label), ticks, timers: pendingTimers.length };
  };
  let paths = 0; let frontier = [[]]; const done = new Set(); let maxTimers = 0;
  for (let level = 0; level <= depth; level++) {
    const next = [];
    for (const labels of frontier) {
      const key = labels.join('>'); if (done.has(key)) continue; done.add(key); paths++;
      let P, C;
      try { P = await runPath('parent', labels); C = await runPath('candidate', labels); } catch (e) { if (e instanceof BudgetError || e?.message === '__timeout__' || e instanceof Suspended || e instanceof RenderLoop) return { ask: `sequence ${JSON.stringify(labels)}: ${e.message}` }; throw e; }
      maxTimers = Math.max(maxTimers, P.timers ?? 0);
      for (let k = 0; k < Math.max(P.obs.length, C.obs.length); k++) {
        const a = JSON.stringify(P.obs[k] ?? null), b = JSON.stringify(C.obs[k] ?? null);
        if (a !== b) return { timers: maxTimers, witness: { input: inputIndex, sequence: [...labels, ...(labels.length > k ? [] : [])].slice(0, k + 1).concat(k >= labels.length ? ['unmount'] : []), step: k, parent: P.obs[k] ?? null, candidate: C.obs[k] ?? null } };
      }
      if (level < depth) for (const label of [...(P.handlers ?? []).slice(0, breadth), ...(P.ticks ?? [])]) next.push([...labels, label]);
    }
    frontier = next;
  }
  return { paths, timers: maxTimers };
}

export { commitRender, commitEffects, settleEffects, treeHandlers, RenderLoop };
export async function runPair(opts) {
  const { parent, candidate, unit, n = 200, seed = 1, ms = 2000, project = true, sequenceDepth = 2, sequenceBreadth = 4, sequenceInputs = 2, deep = false } = opts;
  deepMode.on = !!deep;
  // a missing parent unit has no equality question
  if (!parent || !fs.existsSync(parent) || !topLevelFunctions(ts.createSourceFile(parent, fs.readFileSync(parent, 'utf8'), ts.ScriptTarget.Latest, true)).has(unit)) {
    return runNew(opts);
  }
  let spec;
  try { spec = specOf(candidate, unit, { project }); } catch (e) { return { verdict: 'ASK', reason: `spec: ${e.message}` }; }
  const heaps = enumerateHeaps(spec, 2, seed); // the small heaps of the unit's record shapes, enumerated once; a builder makes a fresh copy per side
  const roots = { parent: findRoot(parent), candidate: findRoot(candidate) };
  const diffs = [], records = []; // records: the unit's built-in calls of the library table, checked against it at the end
  let harnessAsk = null, sawJsx = false; const skipped = [], oneSided = [];
  let recorderRetries = 0; // inputs re-run without the recorder after a harness stop under it (its wrapper deepens the stack and costs a little time); the verdict never depends on the recorder
  const mountSides = async (i) => { // a fresh environment per side for input i, the unit picked, the inputs drawn
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
      const inputs = i < heaps.builders.length ? heaps.builders[i](env) : aliasInputs(inputsFor(spec, seed, i, env), spec, seed, i); // the first inputs are the enumerated small heaps (stage 2: every sharing and cycle of the record shapes over a pool of two objects per shape, one input per non-isomorphic graph), then the i-th seeded input set, which may share objects between positions of one shape (stage 1)
      env.argPool = inputs.filter((x) => x && (typeof x === 'object' || typeof x === 'function') && x.__isFake); // handles the unit was handed: a generated key or member may be one of them
      sides[name] = { env, unit: u, inputs };
    }
    return sides;
  };
  const observeBoth = (sides, record) => (record ? recording(records, async () => [await observe(sides.parent, spec, sides.parent.inputs, ms), await observe(sides.candidate, spec, sides.candidate.inputs, ms)]) : (async () => [await observe(sides.parent, spec, sides.parent.inputs, ms), await observe(sides.candidate, spec, sides.candidate.inputs, ms)])());
  // retained state: for a class unit, programs of method calls on one constructed instance per side run first (programs.mjs); a divergence in a program that calls this unit is its WITNESS, one elsewhere rides in the certificate for the unit it names
  let programRun = null;
  if (spec.isMethod && !spec.isStatic && !spec.accessor && spec.unit.split('.')[1] !== 'constructor') {
    const { runPrograms } = await import('./programs.mjs');
    try { programRun = await recording(records, () => runPrograms({ files: { parent, candidate }, roots, spec, seed, ms, project, rt: { sandbox, observe, guardedCall, firstDifference } })); } catch (e) { if (e instanceof BudgetError) programRun = { verdict: 'ASK', reason: `budget: ${e.message}`, programs: 0, commands: 0 }; else throw e; }
  }
  for (let i = 0; i < n; i++) {
    let sides = await mountSides(i);
    if (harnessAsk) break;
    let [oP, oC] = await observeBoth(sides, true);
    if (oP.harness === 'stack overflow' || oC.harness === 'stack overflow' || oP.harness === 'timeout' || oC.harness === 'timeout') { // the stop may be the recorder's: once more without it, on fresh environments; a second stop stands
      recorderRetries++; sides = await mountSides(i); if (harnessAsk) break; [oP, oC] = await observeBoth(sides, false);
    }
    if (sides.parent.sawJsx || sides.candidate.sawJsx) sawJsx = true;
    if (oP.impure || oC.impure) return { verdict: 'REFUSE', kind: 'render-impure', unit, side: oP.impure ? 'parent' : 'candidate', input: i, args: sides.parent.inputs.map((a) => render(a)), renders: (oP.impure ?? oC.impure), reason: `render-impure: the ${oP.impure ? 'parent' : 'candidate'} renders two different trees or request traces from the same state (Rules of React: a render is pure)`, bound: { n, seed, ms } };
    if (oP.harness === 'timeout' || oC.harness === 'timeout') { skipped.push(i); if (oP.harness !== oC.harness) oneSided.push({ input: i, side: oP.harness ? 'parent' : 'candidate' }); continue; } // a side did not return within the limit (an unbounded loop, often on an aliased input): a timeout proves nothing, so the input is skipped; the other inputs still run, a witness among them counts, and no witness is ASK when only one side timed out
    if (oP.harness === 'stack overflow' && oC.harness === 'stack overflow') { skipped.push(i); continue; } // both sides exhausted the call stack on this input, with and without the recorder: the input proves nothing
    if ((oP.harness === 'stack overflow' && !oC.harness) || (oC.harness === 'stack overflow' && !oP.harness)) { // one side recursed past the stack where the other returned: the thrown RangeError is that side's outcome (SEMANTICS item 1), observed on the same stack without the recorder
      const side = oP.harness ? 'parent' : 'candidate';
      diffs.push({ input: i, args: sides.parent.inputs.map((a) => render(a)), parent: oP, candidate: oC, where: { field: 'outcome', note: `the ${side} exceeded the call stack (RangeError); the other side returned` } });
      if (diffs.length >= 3) break;
      continue;
    }
    if (oP.harness || oC.harness) { harnessAsk = `input ${i}: ${oP.harness ? 'parent ' + oP.harness : 'candidate ' + oC.harness}`; break; }
    const sP = JSON.stringify(oP), sC = JSON.stringify(oC);
    if (sP !== sC) {
      diffs.push({ input: i, args: sides.parent.inputs.map((a) => render(a)), parent: oP, candidate: oC, where: firstDifference(oP, oC) });
      if (diffs.length >= 3) break;
    }
  }
  const bound = { n, seed, ms, heaps: { enumerated: heaps.distinct, assignments: heaps.assignments, space: heaps.space, pool: heaps.pool, shapes: heaps.shapes }, fakes: 'demand-driven proxies, seeded primitives, seeded recorded clocks', inputs: 'from parameter types with boundary values first; positions of one shape sometimes share one object', observation: 'outcome, the reachable object graph (identity up to a renaming of fresh objects), receiver fields, trace, pending work', schedule: 'after the call: every armed timer once, in due order (ties by arm order), intervals re-armed and left pending, at most 50 fired' };
  Object.defineProperty(bound, 'library', { enumerable: true, get: () => { const sm = summarizeRecords(records, libraryTableOf()); libraryCases(sm); if (recorderRetries) sm.retriedWithoutRecorder = recorderRetries; return sm; } }); // read when the result is written, after every rung
  if (skipped.length) bound.skipped = { inputs: skipped.length, oneSided: oneSided.length, reason: 'a side timed out on that input (an unbounded loop), or both sides exhausted the call stack; the input proves nothing' };
  if (!diffs.length && oneSided.length) return { verdict: 'ASK', reason: `one side timed out on ${oneSided.length} input(s) (first: input ${oneSided[0].input}, ${oneSided[0].side}); the other inputs showed no difference`, unit, bound, ran: n - skipped.length };
  if (skipped.length && skipped.length >= n - (harnessAsk ? 1 : 0) && !diffs.length) return { verdict: 'ASK', reason: `every input timed out (${skipped.length} of ${n})`, unit, bound };
  const handlerRun = sawJsx ? { models: { parent: descriptorsOf(parent, unit, { project }), candidate: descriptorsOf(candidate, unit, { project }) }, stats: newHandlerStats() } : null; // the descriptors of the unit's handlers, read once per side, applied at every fire of the sequences and the finite lane
  if (sawJsx) bound.frontEnd = { ...FRONT_END_OBSERVATION, components: deep ? 'same-package function components rendered one level down on their own hook frames, no context (--deep)' : 'a tree of names: a component tag is its name and props', notObserved: 'committed DOM, computed styles, layout, pixels, accessibility tree, re-renders after a state change' }; // a rendered unit: the layer this verdict holds at, and the layers it says nothing about
  if (handlerRun) bound.frontEnd.handlers = Object.assign(handlerRun.stats, { observed: FRONT_END_OBSERVATION.handlers }); // how a handler is observed, and the descriptor interpreter's counts: fired, readable, interpretable, agreed, and every defect
  if (programRun) {
    const member = spec.member ?? unit.split('.')[1];
    bound.programs = { programs: programRun.programs, commands: programRun.commands, methods: programRun.methods, maxLen: 5, seed, ...(programRun.skipped ? { skipped: programRun.skipped } : {}) };
    if (programRun.verdict === 'ASK') bound.programs.ask = programRun.reason;
    if (programRun.verdict === 'WITNESS') {
      const mine = programRun.program.some((c) => c.method === member);
      bound.programs.divergence = { method: programRun.divergence.method, commands: programRun.program.length, program: programRun.program, mine };
      if (mine) return { verdict: 'WITNESS', unit, witnesses: [{ input: `program ${programRun.programIndex}`, program: programRun.program, args: programRun.program.map((c) => c.args), parent: programRun.divergence.parent, candidate: programRun.divergence.candidate, where: { ...programRun.divergence.where, command: programRun.divergence.command, method: programRun.divergence.method } }, ...diffs], bound, spec: { params: spec.params, returns: spec.returns, literals: spec.literals, strings: spec.strings } };
    }
  }
  if (diffs.length) return { verdict: 'WITNESS', unit, witnesses: diffs, bound, spec: { params: spec.params, returns: spec.returns, literals: spec.literals, strings: spec.strings } };
  if (!spec.isMethod && !sawJsx && !harnessAsk && !diffs.length) { // environment programs with retained handles (program.mjs): what the environment may do later with what the unit handed it
    const { runEnvironmentPrograms } = await import('./program.mjs');
    let r = null;
    try { r = await recording(records, () => runEnvironmentPrograms({ files: { parent, candidate }, roots, spec, seed, ms, rt: { sandbox, pickUnit, guardedCall, awaitUnit, runTimers } })); } catch (e) { if (e instanceof BudgetError) r = { verdict: 'ASK', reason: `budget: ${e.message}` }; else throw e; }
    if (r) {
      bound.environmentPrograms = { runs: r.runs ?? 0, maxCommands: r.maxCommands ?? 6, seed: r.seed ?? seed, commands: 'call, invoke, fire, tick, settle, next, throw, return', observation: 'the outcome, the requests since the previous command, the pending count; never the graph' };
      if (r.verdict === 'ASK') bound.environmentPrograms.ask = r.reason;
      if (r.verdict === 'WITNESS') return { verdict: 'WITNESS', unit, witnesses: [{ input: 'environment program', program: r.program, step: r.step, seed: r.seed, path: r.path, replayPath: r.replayPath, replayed: r.replayed, parent: r.parent, candidate: r.candidate, where: { field: 'program', step: r.step } }], bound, spec: { params: spec.params, returns: spec.returns, literals: spec.literals, strings: spec.strings } };
    }
  }
  if (harnessAsk) return { verdict: 'ASK', reason: harnessAsk, unit, bound, ran: diffs.length };
  if (sawJsx) { // the one-render check found no difference: a finite component is decided over every click order (rung 2); the rest runs re-render sequences (rung 3)
    const { finiteDomain, exploreFinite } = await import('./finite.mjs'); const rt = { sandbox, pickUnit, commitRender, commitEffects, treeHandlers, runTimers, RenderLoop, guardedCall, awaitUnit };
    let domain = null; try { domain = finiteDomain(candidate, unit, { project }); } catch (e) { domain = { why: `finiteness: ${String(e && e.message).slice(0, 120)}` }; }
    if (domain && !domain.why) {
      const r = await recording(records, () => exploreFinite({ files: { parent, candidate }, roots, spec, unit, domain, seed, ms, rt, handlers: handlerRun }));
      bound.frontEnd.finite = { slots: domain.slots.map((x) => x.values.length), props: domain.props.map((p) => `${p.name}:${p.opaque ? p.opaque : p.values.length}`), assignments: domain.assignments.length };
      if (r.verdict === 'ASK') return { verdict: 'ASK', reason: `finite exploration: ${r.reason}`, unit, bound };
      if (r.verdict === 'WITNESS') { bound.frontEnd.renders = 'every click order from every prop assignment, explored'; return { verdict: 'WITNESS', unit, witnesses: [{ input: r.witness.props, sequence: r.witness.clicks, step: r.witness.step ?? null, parent: r.witness.parent ?? null, candidate: r.witness.candidate ?? null, reason: r.witness.reason ?? null, where: { field: 'sequence', command: (r.witness.clicks ?? [])[r.witness.step ?? 0] ?? null } }], bound, spec: { params: spec.params, returns: spec.returns, literals: spec.literals, strings: spec.strings } }; }
      bound.frontEnd.renders = `every click order from every prop assignment, decided: ${r.pairs} state pairs over ${r.assignments} assignment(s); effects and armed timers inside each step; a function or element prop is one opaque input; handler descriptors agreed on ${handlerRun.stats.agreed} of ${handlerRun.stats.fired} fired`;
      bound.frontEnd.notObserved = 'committed DOM, computed styles, layout, pixels, accessibility tree; other values of opaque props';
      return { verdict: 'PASS-decided', unit, bound, spec: { params: spec.params, returns: spec.returns, literals: spec.literals, strings: spec.strings } };
    }
    bound.frontEnd.finite = { why: domain ? domain.why : 'no domain' };
  }
  if (sawJsx && sequenceDepth > 0) { // not finite: re-render sequences from a fresh mount, on the first inputs
    let paths = 0;
    for (let i = 0; i < Math.min(sequenceInputs, n); i++) {
      const r = await recording(records, () => runSequences({ files: { parent, candidate }, roots, spec, unit, seed, inputIndex: i, ms, depth: sequenceDepth, breadth: sequenceBreadth, handlers: handlerRun }));
      if (r.ask === undefined && !r.witness) { // the schedule explorer (moonshot 9): the same machine with the clock as a command, when the mount armed at most three timers
      const r2 = await recording(records, () => runSequences({ files: { parent, candidate }, roots, spec, unit, seed, inputIndex: i, ms, schedules: true, depth: Math.max(sequenceDepth, 2), breadth: sequenceBreadth, handlers: handlerRun }));
        if (r2.witness) return { verdict: 'WITNESS', unit, witnesses: [{ ...r2.witness, schedule: true }], bound: { ...bound, schedules: { timers: r2.timers, paths: r2.paths, orders: 'every order of the timers due at one instant, up to three' } }, spec: { params: spec.params, returns: spec.returns, literals: spec.literals, strings: spec.strings } };
        if (r2.ask) bound.schedulesAsk = r2.ask; else bound.schedules = { timers: r2.timers ?? 0, paths: r2.paths, orders: 'every order of the timers due at one instant, up to three' };
      }
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
  const res = await runPair({ parent: opt('--parent'), candidate: opt('--candidate'), unit: opt('--unit'), n: Number(opt('--n', 200)), seed: Number(opt('--seed', 1)), ms: Number(opt('--ms', 2000)), deep: a.includes('--deep'), project: a.includes('--no-project') ? false : opt('--project', true), sequenceDepth: Number(opt('--sequence-depth', 2)), sequenceBreadth: Number(opt('--sequence-breadth', 4)), sequenceInputs: Number(opt('--sequence-inputs', 2)) });
  const out = opt('--out', null);
  const text = JSON.stringify(res, null, 1);
  if (out) fs.writeFileSync(out, text); else console.log(text);
  if (out) console.log(`${res.verdict}${res.reason ? ': ' + res.reason : ''} -> ${out}`);
  process.exit(res.verdict === 'ASK' ? 2 : 0);
}
