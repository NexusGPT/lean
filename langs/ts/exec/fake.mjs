// Lane B fakes: the environment both versions run against.
//
// A fake is a proxy that stands for anything the function reaches outside its own file: an imported module, a
// value returned by an external call, a field of the receiver. Every operation on it is recorded on the trace
// (get, call, construct, set) with the path of the value and a rendering of the arguments. Primitive demands
// (arithmetic, string joining, truth tests) are answered from a seeded generator so both versions see the same
// numbers and strings for the same demand sequence. A fake is never thenable: `await fake` yields the fake.
//
// The trace is the oracle: two versions that ask the environment the same things in the same order, and return
// structurally equal outcomes, agree. A candidate that asks something new, or reads a field the parent never read,
// diverges on the trace.
import { createHash } from 'node:crypto';

export class BudgetError extends Error {}
const depthOf = (path) => (path.match(/[.\[(]/g) || []).length;
export function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'set', 'add', 'delete', 'clear', 'fill', 'copyWithin', 'assign', 'write', 'save', 'create', 'update', 'remove', 'send', 'emit', 'log', 'warn', 'error', 'info']);

export class Environment {
  constructor(seed = 1) {
    this.seed = seed;
    this.trace = [];       // [{op, path, args}]
    this.pending = [];     // timers and jobs armed and not run
    this.demand = 0;       // count of primitive demands, drives the generator
    this.rng = makeRng(seed);
    this.cache = new Map(); // path -> fake, so the same handle is one handle
    this.calls = new Map(); // path -> number of calls so far
    this.loading = false;   // true while modules load: every answer is a handle
  }
  record(op, path, args) {
    this.trace.push({ op, path, args: args ?? [] });
    if (this.trace.length > 20000) throw new BudgetError('more than 20000 environment operations');
  }
  primitive(kind, path) {
    // deterministic per (seed, demand index): the same demand sequence gives the same value on both sides
    const h = createHash('sha256').update(`${this.seed}:${this.demand++}:${kind}:${path}`).digest();
    const u = h.readUInt32BE(0) / 4294967296;
    if (kind === 'number') return Math.floor(u * 200) - 50;
    if (kind === 'string') return `s${h.readUInt16BE(4).toString(36)}`;
    return u > 0.5;
  }
  // What a request answers: mostly another fake, sometimes a concrete empty or falsy value, so that null checks,
  // empty lists and error branches run. The choice depends on the seed and the path only, so both sides see the same
  // answer to the same question; a field read twice answers the same way.
  answer(path) {
    if (this.cache.has(path)) return this.cache.get(path);
    // while a module loads (schemas, decorators, constants), and for a module's own members, the answer is always
    // a handle: varied answers are for what the unit itself asks at run time
    if (this.loading || (path.startsWith('module:') && !path.includes('('))) return this.fake(path);
    const h = createHash('sha256').update(`${this.seed}:answer:${path}`).digest();
    const u = h.readUInt32BE(0) / 4294967296;
    const d = depthOf(path);
    let v;
    if (d === 0 || u < 0.55) v = this.fake(path);
    else if (u < 0.65) v = null;
    else if (u < 0.72) v = undefined;
    else if (u < 0.79) v = [];
    else if (u < 0.85) v = '';
    else if (u < 0.90) v = 0;
    else if (u < 0.95) v = false;
    else v = true;
    this.cache.set(path, v);
    return v;
  }
  fake(path, hint = null) {
    if (path.length > 400) throw new BudgetError('a fake path longer than 400 characters (unbounded recursion through the environment)');
    const key = path;
    if (this.cache.has(key)) return this.cache.get(key);
    const env = this;
    const target = function fakeTarget() {};
    target.__fakePath = path;
    const handler = {
      get(t, prop) {
        if (prop === '__isFake') return true;
        if (prop === '__fakePath') return path;
        if (prop === 'then') return undefined; // never thenable
        if (prop === Symbol.toPrimitive) return (h) => (h === 'number' ? env.primitive('number', path) : h === 'string' ? env.primitive('string', path) : env.primitive('number', path));
        if (prop === 'valueOf') return () => env.primitive('number', path);
        if (prop === 'toString') return () => env.primitive('string', path);
        if (prop === Symbol.iterator) return function* () { const n = depthOf(path) > 8 ? 0 : 2; for (let i = 0; i < n; i++) yield env.answer(`${path}[${i}]`); }; // a fake tree is finite: deep levels are empty
        if (prop === Symbol.asyncIterator) return undefined;
        if (prop === 'length') { env.record('get', `${path}.length`); return depthOf(path) > 8 ? 0 : 2; }
        if (prop === 'constructor') return Object;
        if (typeof prop === 'symbol') return undefined;
        env.record('get', `${path}.${String(prop)}`);
        return env.answer(`${path}.${String(prop)}`);
      },
      set(t, prop, value) { env.record('set', `${path}.${String(prop)}`, [render(value)]); return true; },
      has(t, prop) { env.record('has', `${path}.${String(prop)}`); return false; },
      deleteProperty(t, prop) { env.record('delete', `${path}.${String(prop)}`); return true; },
      apply(t, thisArg, args) {
        env.record('call', path, args.map((x) => render(x)));
        // called with a real function first (a class or member decorator, a wrapper): the callee keeps what it was
        // given, so the result is undefined and the decorated class stays the class
        if (env.loading && args.length && typeof args[0] === 'function' && !args[0].__isFake) { // decorators run while the module loads
          for (const a of args) if (typeof a === 'function' && !a.__isFake && a.length <= 2 && !/^class\s/.test(Function.prototype.toString.call(a))) { try { const r = a(env.fake(`${path}#cb.arg0`), env.fake(`${path}#cb.arg1`)); if (r && typeof r.then === 'function') r.catch(() => {}); } catch (e) { env.record('callback-throw', path, [String(e && e.message)]); } }
          return undefined;
        }
        const k = (env.calls.get(path) ?? 0) + 1; env.calls.set(path, k); // every call is its own transition: two reads of a clock are two values
        // at run time a callback argument is invoked once with fakes, so its own reads reach the trace
        if (!env.loading) for (const a of args) if (typeof a === 'function' && !a.__isFake && a.length <= 2 && !/^class\s/.test(Function.prototype.toString.call(a))) { try { const r = a(env.fake(`${path}#cb.arg0`), env.fake(`${path}#cb.arg1`)); if (r && typeof r.then === 'function') r.catch(() => {}); } catch (e) { env.record('callback-throw', path, [String(e && e.message)]); } }
        return env.answer(`${path}()#${k}`);
      },
      construct(t, args) { env.record('new', path, args.map((x) => render(x))); const k = (env.calls.get(path) ?? 0) + 1; env.calls.set(path, k); return env.fake(`new ${path}#${k}`); },
      getPrototypeOf() { return Function.prototype; },
      ownKeys(t) { env.record('keys', path); return Reflect.ownKeys(t); },
      getOwnPropertyDescriptor(t, prop) { return Reflect.getOwnPropertyDescriptor(t, prop); },
    };
    const p = new Proxy(target, handler);
    this.cache.set(key, p);
    return p;
  }
  // the module fake: `require('x')` gives a fake whose members are fakes; default export is itself
  module(name) { const m = this.fake(`module:${name}`); return m; }
}

// A rendering of a value for the trace and for outcome comparison: fakes by path, objects structurally, functions by name.
export function render(v, depth = 0, seen = new Set()) {
  if (v === null) return null;
  if (v === undefined) return { $undefined: true };
  const t = typeof v;
  if (t === 'number') return Number.isNaN(v) ? { $nan: true } : v;
  if (t === 'string' || t === 'boolean') return v;
  if (t === 'bigint') return { $bigint: v.toString() };
  if (t === 'symbol') return { $symbol: String(v) };
  if (t === 'function') return v.__isFake ? { $fake: v.__fakePath } : { $fn: v.name || 'anonymous' };
  if (v.__isFake) return { $fake: v.__fakePath };
  if (depth > 6) return { $deep: true };
  if (seen.has(v)) return { $cycle: true };
  seen.add(v);
  if (Array.isArray(v)) return v.map((x) => render(x, depth + 1, seen));
  if (v instanceof Date) return { $date: Number.isNaN(v.getTime()) ? 'invalid' : v.toISOString() };
  if (v instanceof Map) return { $map: [...v.entries()].map(([k, x]) => [render(k, depth + 1, seen), render(x, depth + 1, seen)]) };
  if (v instanceof Set) return { $set: [...v].map((x) => render(x, depth + 1, seen)) };
  if (v instanceof Error) return { $error: v.constructor.name, message: v.message };
  if (v instanceof RegExp) return { $regex: String(v) };
  if (typeof v.then === 'function') return { $promise: true };
  const out = {};
  for (const k of Object.keys(v).sort()) out[k] = render(v[k], depth + 1, seen);
  return out;
}

export function stable(v) { return JSON.stringify(render(v)); }
