// Lane B's record of the per-callee fact "writes none of its arguments" (lane w8e, callee-facts.mjs). Every call site of
// the unit's file (factMarks rewrites `f(a)` and `o.m(a)` into `__lean_site.f(file, pos, receiver, callee, a)`, the
// order of evaluation unchanged) is recorded while the unit runs: the graph reachable from what the call is handed (its
// receiver, its arguments, and what the run handed the recorded calls before it at any site, which an earlier callee
// may have kept and this one may reach)
// before and after the call, compared object by object; and what the call answers, against that graph. Per site:
//   calls       the calls made while the unit ran
//   checked     the calls recorded (the first CHECKED_PER_SITE of each side's run; the rest run unrecorded)
//   wrote       recorded calls after which an object of the graph changed (a field set, added or deleted, an element,
//               a Map or Set entry, a Date's time)
//   shared      recorded calls whose answer is or reaches an object of the graph
//   outside     calls of a fake (the environment's code: it writes what it is handed, exec/fake.mjs writeHanded)
//   unrecorded  calls whose graph held what the record cannot read (an accessor, a proxy, a typed array, a WeakMap, an
//               instance of a class with private fields, more than GRAPH_LIMIT objects)
//   async       calls that answered a promise or a thenable (the callee's work goes on after it answered)
// The comparison reads own data properties only (Reflect, never a getter, never a patched prototype method), so the record
// asks nothing of the unit or the world: the run is the same with or without it.
import { types } from 'node:util';
import { ts } from '../common.mjs';
import { broken } from '../break.mjs'; // the one --break convention (A6; names in tests/break.mjs)

export const CHECKED_PER_SITE = 64, GRAPH_LIMIT = 5000, PRIOR_LIMIT = 512;
const mapEntries = Map.prototype.entries, setValues = Set.prototype.values, dateTime = Date.prototype.getTime, fnText = Function.prototype.toString;
const isObj = (x) => x !== null && (typeof x === 'object' || typeof x === 'function');
const prim = (v) => (typeof v === 'number' ? (Object.is(v, -0) ? 'n:-0' : `n:${v}`) : typeof v === 'string' ? `s:${v}` : typeof v === 'bigint' ? `b:${v}` : typeof v === 'symbol' ? `y:${String(v.description)}` : `${typeof v}:${String(v)}`);
// an instance of a class whose text declares a private name: a write to it no own property shows
const privateFields = (o) => { for (let p = Object.getPrototypeOf(o); p && Object.getPrototypeOf(p); p = Object.getPrototypeOf(p)) { const c = Reflect.getOwnPropertyDescriptor(p, 'constructor')?.value; if (typeof c === 'function') { let t = ''; try { t = fnText.call(c); } catch { return true; } if (/#[A-Za-z_$]/.test(t)) return true; } } return false; };
// the state of every object reachable from the roots, by identity: Map(object -> text), or { unreadable }
function graph(roots) {
  const state = new Map(), queue = [];
  const ref = (v) => { if (isObj(v) && !state.has(v)) { state.set(v, null); queue.push(v); } };
  for (const r of roots) ref(r);
  const ids = new Map(); let next = 0; const idOf = (v) => { if (!ids.has(v)) ids.set(v, next++); return ids.get(v); };
  const val = (v) => (isObj(v) ? (ref(v), `@${idOf(v)}`) : prim(v));
  while (queue.length) {
    const o = queue.shift();
    if (state.size > GRAPH_LIMIT) return { unreadable: `more than ${GRAPH_LIMIT} objects` };
    if (typeof o === 'function') { state.set(o, 'function'); continue; } // a function value: its identity, never its fields
    if (types.isProxy(o)) { let fake = false; try { fake = o.__isFake === true; } catch { fake = false; } if (fake) { state.set(o, 'fake'); continue; } return { unreadable: 'a proxy' }; } // a fake is the world's: its answers are its own, never a field the unit holds
    if (types.isTypedArray(o) || types.isArrayBuffer(o) || types.isSharedArrayBuffer(o) || types.isDataView(o) || types.isWeakMap(o) || types.isWeakSet(o) || types.isWeakRef?.(o)) return { unreadable: 'a value whose state no own property shows' };
    if (types.isPromise(o)) { state.set(o, 'promise'); continue; } // a promise is a handle: its settlement is read through then or await
    const parts = [];
    if (types.isDate(o)) parts.push(`time=${prim(dateTime.call(o))}`);
    if (types.isMap(o)) for (const [k, v] of mapEntries.call(o)) parts.push(`k ${val(k)}=${val(v)}`);
    if (types.isSet(o)) for (const v of setValues.call(o)) parts.push(`i ${val(v)}`);
    const proto = Object.getPrototypeOf(o);
    if (proto && Object.getPrototypeOf(proto) && !Array.isArray(o) && !types.isMap(o) && !types.isSet(o) && !types.isDate(o) && !types.isNativeError(o) && !types.isRegExp(o) && privateFields(o)) return { unreadable: 'an instance of a class with private fields' };
    for (const k of Reflect.ownKeys(o)) {
      const d = Reflect.getOwnPropertyDescriptor(o, k);
      if (!d) continue;
      if (!('value' in d)) return { unreadable: `an accessor ${String(k)}` };
      parts.push(`${typeof k === 'symbol' ? `@@${String(k.description)}` : k}=${val(d.value)}`);
    }
    state.set(o, `${Object.isExtensible(o) ? '' : 'sealed '}${parts.join(',')}`);
  }
  return { state }; // identity numbers by first reach from the same roots: an unchanged graph numbers alike
}
const natives = new WeakMap();
const native = (fn) => { if (!natives.has(fn)) { let t = ''; try { t = fnText.call(fn); } catch { t = ''; } natives.set(fn, /\{\s*\[native code\]\s*\}$/.test(t)); } return natives.get(fn); };
const reachesAny = (v, objects) => { if (!isObj(v)) return false; const g = graph([v]); if (g.unreadable) return null; for (const o of g.state.keys()) if (objects.has(o)) return true; return false; };

// one recorded call: `log` is the side's record (pos -> counts), `prior` the run's earlier handed roots per site
export function factCall(env, pos, receiver, fn, args) {
  const log = env.factLog;
  const call = () => Reflect.apply(fn, receiver, args);
  if (!log || env.loading) return call();
  const r = (log[pos] ??= { calls: 0, checked: 0, wrote: 0, shared: 0, outside: 0, unrecorded: 0, async: 0 });
  r.calls++;
  let fake = false; try { fake = typeof fn === 'function' && types.isProxy(fn) && fn.__isFake === true; } catch { fake = false; }
  if (fake) { r.outside++; return call(); }
  if (typeof fn !== 'function' || native(fn) || r.checked >= CHECKED_PER_SITE) return call(); // a built-in is no callee the fact names (callee-facts.mjs: a function of the package's files); it runs unrecorded
  r.checked++;
  const prior = (env.factPrior ??= []); // what the run handed the recorded calls before this one (any site): the callee may reach what an earlier callee kept
  const roots = [receiver, ...args, ...(broken('callee-fact-prior') ? [] : prior)].filter(isObj); // tests/break.mjs: only this call's own receiver and arguments read
  const before = env.factOverflow ? { unreadable: `more than ${PRIOR_LIMIT} objects handed in the run` } : graph(roots);
  if (before.unreadable) { r.unrecorded++; return call(); }
  const keep = () => { for (const o of [receiver, ...args]) if (isObj(o) && !prior.includes(o)) prior.push(o); if (prior.length > PRIOR_LIMIT) env.factOverflow = true; }; // past the limit the run's earlier roots are no longer all read: no later call confirms
  const compare = () => {
    if (broken('callee-fact-trace')) return; // tests/break.mjs: the record sees no write
    const after = graph(roots);
    if (after.unreadable) { r.unrecorded++; return; }
    for (const [o, s] of before.state) if (after.state.get(o) !== s) { r.wrote++; return; }
  };
  let out;
  try { out = call(); }
  catch (e) { compare(); keep(); throw e; }
  compare(); keep();
  if (types.isPromise(out) || (isObj(out) && !types.isProxy(out) && typeof Reflect.getOwnPropertyDescriptor(out, 'then')?.value === 'function')) r.async++;
  else { const s = reachesAny(out, before.state); if (s === null) r.unrecorded++; else if (s && !broken('callee-fact-trace')) r.shared++; }
  return out;
}

// the hook the sandbox hands the compiled file as `__lean_site.f` (exec/run.mjs sandbox): defined here so that a built-in
// called through it still names the unit's file as its caller (transitions.mjs callerFile skips this file's frames)
export const factHook = (env) => (pos, receiver, fn, ...args) => factCall(env, pos, receiver, fn, args);
export const TRACE_FILE = new URL(import.meta.url).pathname;

// The loader's mark of the unit's file (exec/run.mjs compileWithSites): `f(a)` becomes
// `typeof f === "function" ? S.f(pos, void 0, f, a) : f(a)` and `o.m(a)` becomes
// `(t = o, typeof (g = t.m) === "function" ? S.f(pos, t, g, a) : t.m(a))`: the callee, the receiver and the arguments are
// evaluated once and in their order; a callee that is no function is called as written, so its TypeError is the
// engine's own. pos is the call's start in the source (the position callee-facts.mjs confirmedFacts reads). Not marked: an
// optional call, a call of super, require, eval or import, an element access callee, a private name, and a call whose
// arguments hold a function, class or object method written inline (the fallback repeats the arguments' text, and the
// loader counts the file's functions; such a call is never a fact's call, callee-facts.mjs factCallee)
export const factMarks = (stateName) => (context) => {
  const f = context.factory;
  const inlineFn = (n) => { let hit = false; const w = (x) => { if (hit) return; if (ts.isFunctionLike(x) || ts.isClassLike(x)) { hit = true; return; } ts.forEachChild(x, w); }; w(n); return hit; };
  return (sf) => {
    const base = ts.getOriginalNode(sf); // the parsed file: earlier marks may have updated sf
    const visit = (node) => {
      const o = ts.getOriginalNode(node);
      const marked = ts.isCallExpression(node) && ts.isCallExpression(o) && o.pos >= 0 && o.getSourceFile?.() === base && !node.questionDotToken && !(node.flags & ts.NodeFlags.OptionalChain) && !(o.flags & ts.NodeFlags.OptionalChain);
      const v = ts.visitEachChild(node, visit, context);
      if (!marked || !ts.isCallExpression(v)) return v;
      const callee = v.expression;
      if (o.arguments.some(inlineFn)) return v;
      const pos = f.createNumericLiteral(ts.skipTrivia(base.text, o.pos));
      const S = f.createPropertyAccessExpression(f.createIdentifier(stateName), 'f');
      const isFn = (x) => f.createStrictEquality(f.createTypeOfExpression(x), f.createStringLiteral('function'));
      if (ts.isIdentifier(callee)) {
        if (['require', 'eval', 'import', 'arguments'].includes(callee.text) || callee.text.startsWith('__lean')) return v;
        return f.createParenthesizedExpression(f.createConditionalExpression(isFn(callee), undefined, f.createCallExpression(S, undefined, [pos, f.createVoidZero(), callee, ...v.arguments]), undefined, v));
      }
      if (ts.isPropertyAccessExpression(callee) && !ts.isPrivateIdentifier(callee.name) && callee.expression.kind !== ts.SyntaxKind.SuperKeyword && !(callee.flags & ts.NodeFlags.OptionalChain)) {
        const t = f.createTempVariable(context.hoistVariableDeclaration), g = f.createTempVariable(context.hoistVariableDeclaration);
        const read = f.createPropertyAccessExpression(t, callee.name);
        return f.createParenthesizedExpression(f.createCommaListExpression([
          f.createAssignment(t, callee.expression),
          f.createConditionalExpression(isFn(f.createParenthesizedExpression(f.createAssignment(g, read))), undefined, f.createCallExpression(S, undefined, [pos, t, g, ...v.arguments]), undefined, f.createCallExpression(f.createPropertyAccessExpression(t, callee.name), undefined, v.arguments)),
        ]));
      }
      return v;
    };
    return ts.visitNode(sf, visit);
  };
};
