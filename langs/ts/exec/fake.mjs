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
import { generator } from './gen.mjs';

export class BudgetError extends Error {}
const EMPTY_LIST = Symbol('an empty list');
const depthOf = (path) => (path.match(/[.\[(]/g) || []).length;
export const CB_DEPTH = 40; // the nesting of callbacks the world runs: a callback handed to a fake past it is not run (the tree ends there)
export function makeRng(seed) {
  // the seed is scrambled first: two xorshift states from nearby seeds give nearly the same first outputs, so every
  // run's first draw (the branch of a union, an optional's presence) would fall the same way for every input
  let s = (seed >>> 0) ^ 0x9e3779b9; s = Math.imul(s ^ (s >>> 16), 0x85ebca6b) >>> 0; s = Math.imul(s ^ (s >>> 13), 0xc2b2ae35) >>> 0; s ^= s >>> 16; s >>>= 0; s = s || 1;
  const next = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  for (let i = 0; i < 4; i++) next();
  return next;
}

const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'set', 'add', 'delete', 'clear', 'fill', 'copyWithin', 'assign', 'write', 'save', 'create', 'update', 'remove', 'send', 'emit', 'log', 'warn', 'error', 'info']);

export class Environment {
  constructor(seed = 1) {
    this.seed = seed;
    this.trace = [];       // [{op, path, args}]
    this.pending = [];     // timers and jobs armed and not run
    this.timers = { now: 0, queue: [], nextId: 1 }; // the virtual clock: armed callbacks with their due instant; run.mjs fires them in due order (ties by arm order), intervals re-arm, a cleared one leaves no trace
    this.demand = 0;       // count of primitive demands, drives the generator
    this.rng = makeRng(seed);
    this.cache = new Map(); // path -> fake, so the same handle is one handle
    this.calls = new Map(); // path -> number of calls so far
    this.loading = false;   // true while modules load: every answer is a handle
    this.cbDepth = 0;       // nesting of callbacks the environment is running
    this.shapes = null;     // the unit's spec (defs, literals, strings, regexes, receiver, imports): typed answers draw from it
    this.scheduler = null;  // the race explorer's hold (program.mjs): every promise the world answers waits for its release; null is the default schedule
  }
  // clock answers advance with the seeded history and are recorded beside port requests
  clock(path, args = [], op = 'call') {
    this.clockRng ??= makeRng(this.seed ^ 0x636c6f63);
    this.clockMillis = (this.clockMillis ?? (this.seed >>> 0) % 1000000) + 1 + Math.floor(this.clockRng() * 17);
    this.record(op, path, args.map((x) => render(x)));
    return this.clockMillis;
  }
  // A typed answer: the value at `path` generated from its declared shape, seeded by (seed, path) so the same question
  // has the same answer on both sides and in any order. A method member is a callable fake that answers its return
  // type; a service is a fake with typed members.
  typed(path, tspec, optional = false) {
    if (tspec?.kind === 'promise') { const value = this.typed(path, tspec.of); const v = Promise.resolve(value); const held = this.scheduler ? this.scheduler.hold(v, path) : v; return namePromise(this, held, path, { value }); } // under the race explorer a promise the world answers is held until the scheduler releases it; otherwise it resolves at once, in call order
    if (this.cache.has(path)) return this.cache.get(path);
    if (!tspec) return this.answer(path);
    if (tspec.kind === 'service' && tspec.awaits) return this.typed(path, tspec.awaits); // a thenable answers what awaiting it yields
    if (tspec.kind === 'service' && !Object.keys(tspec.members ?? {}).length) return this.answer(path); // a handle with no typed member: the varied answer
    if (tspec.kind === 'method' || tspec.kind === 'service' || tspec.kind === 'class') return this.fake(path, tspec);
    if (tspec.kind === 'opaque') return this.answer(path); // a shape the spec could not read: the varied answer (a handle, null, an empty list, ...), so null checks and empty cases still run
    if (tspec.kind === 'field') return this.typed(path, tspec.spec, tspec.optional);
    if (tspec.kind === 'function') return this.fake(`${path}#fn`, tspec.returns ? { kind: 'method', returns: tspec.returns } : null);
    const sh = this.shapes ?? {};
    const h = createHash('sha256').update(`${this.seed}:typed:${path}`).digest().readUInt32BE(0);
    const g = generator(h, sh.defs ?? {}, sh.literals ?? [], 0, sh.strings ?? [], sh.regexes ?? []);
    const v = optional && g.rng() < 0.3 ? undefined : g.gen(tspec, 0, this, path);
    this.cache.set(path, v);
    return v;
  }
  // whether a call faults: about one call in twelve, decided by the seed and the call's path
  faultDraw(path) { const h = createHash('sha256').update(`${this.seed}:fault:${path}`).digest(); return h.readUInt32BE(0) / 4294967296 < 1 / 12; }
  // a member of a handle: typed when the handle's shape names it, a plain answer otherwise
  member(path, prop, tspec) {
    const m = tspec && tspec.kind === 'service' && tspec.members && Object.hasOwn(tspec.members, prop) ? tspec.members[prop] : null;
    return m ? this.typed(`${path}.${prop}`, m) : this.answer(`${path}.${prop}`);
  }
  // arm a timer: kind timeout | interval | immediate | frame | idle; the pending record is the observation (a cleared
  // timer removes it, so a timer that never fires is unobservable, as it is to the outside world)
  arm(kind, fn, ms, args = []) {
    const t = this.timers; const id = t.nextId++;
    const delay = kind === 'immediate' ? 0 : kind === 'frame' ? 16 : kind === 'idle' ? 1 : Math.max(0, Number(ms) || 0);
    const entry = { site: this.siteState?.current?.site ?? null, id, kind, fn, args, due: t.now + delay, interval: kind === 'interval' ? Math.max(1, Number(ms) || 0) : null, order: id, fired: 0 };
    t.queue.push(entry);
    this.pending.push(withSite({ op: { timeout: 'setTimeout', interval: 'setInterval', immediate: 'setImmediate', frame: 'requestAnimationFrame', idle: 'requestIdleCallback' }[kind], ms: kind === 'immediate' ? undefined : delay, id }, this.siteState?.current?.site));
    return id;
  }
  clearTimer(id, op = 'clearTimeout') {
    const t = this.timers; const i = t.queue.findIndex((e) => e.id === id);
    if (i < 0) { this.record('call', op, [typeof id === 'number' ? id : render(id)]); return; } // a handle this run did not arm (a field, an argument, a value from the world): clearing it is a request to the world, observed; a candidate that drops it differs
    t.queue.splice(i, 1); const j = this.pending.findIndex((e) => e.id === id); if (j >= 0) this.pending.splice(j, 1); // armed and cleared in this run: nothing, as it is to the outside world
  }
  record(op, path, args) {
    this.trace.push(withSite({ op, path, args: args ?? [] }, this.siteState?.current?.site));
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
    if (path.startsWith('drive#')) return this.drawn(path); // a read through a drive's argument draws like the argument
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
  // A drawn argument of a drive (exec/run.mjs driveWindow) and every answer read through it: about two times in five a
  // fake (an object of the world, whose reads draw again), otherwise a value of the unit's own pools (the strings and
  // numbers its source compares against, spec.mjs) or a plain edge (null, undefined, true, false, 0, '', an empty
  // list); chosen by the seed and the path only, so both sides are handed the same values, and another input (another
  // seed) hands other ones: a callback that compares against a constant meets that constant on some input.
  drawn(path) {
    if (this.cache.has(path)) return this.cache.get(path);
    if (this.loading || depthOf(path) > 8) return this.fake(path);
    const sh = this.shapes ?? {};
    const pool = [...(sh.strings ?? []), ...(sh.literals ?? []), null, undefined, true, false, 0, '', EMPTY_LIST];
    const u = createHash('sha256').update(`${this.seed}:drawn:${path}`).digest().readUInt32BE(0) / 4294967296;
    let v = u < 0.4 ? this.fake(path) : pool[Math.min(pool.length - 1, Math.floor(((u - 0.4) / 0.6) * pool.length))];
    if (v === EMPTY_LIST) v = [];
    this.cache.set(path, v);
    return v;
  }
  fake(path, tspec = null) {
    if (path.length > 400) throw new BudgetError('a fake path longer than 400 characters (unbounded recursion through the environment)');
    const key = path;
    if (this.cache.has(key)) return this.cache.get(key);
    const typedMember = tspec && tspec.kind === 'service' && tspec.members ? (prop) => Object.hasOwn(tspec.members, prop) : () => false;
    const env = this;
    const target = function fakeTarget() {};
    target.__fakePath = path;
    const handler = {
      get(t, prop, receiver) {
        if (prop === '__isFake') return true;
        if (prop === '__fakePath') return path;
        if (prop === 'then') return undefined; // never thenable
        if (prop === 'catch' || prop === 'finally') { return (h) => { env.record('call', `${path}.${prop}`, [typeof h === 'function' ? render(h) : String(h)]); return receiver; }; } // a promise-shaped chain on a fake: the handler is recorded by its handle (and driven like every escaped function), the fake flows on
        if (prop === Symbol.toPrimitive) return fakeMember(`${path}[Symbol.toPrimitive]`, (h) => (h === 'number' ? env.primitive('number', path) : h === 'string' ? env.primitive('string', path) : env.primitive('number', path)));
        if (prop === 'valueOf') return fakeMember(`${path}.valueOf`, () => env.primitive('number', path));
        if (prop === 'toString') return fakeMember(`${path}.toString`, () => env.primitive('string', path));
        if (prop === Symbol.iterator) return function* () { const n = depthOf(path) > 8 ? 0 : 2; for (let i = 0; i < n; i++) yield env.answer(`${path}[${i}]`); }; // a fake tree is finite: deep levels are empty
        if (prop === Symbol.asyncIterator) return undefined;
        if (typeof prop === 'string' && typedMember(prop)) { env.record('get', `${path}.${prop}`); return env.member(path, prop, tspec); }
        if (typeof prop === 'string' && Object.hasOwn(ITERATION, prop) && !env.loading) return iterationMethod(env, receiver, path, prop); // an iteration method: the fake is read as an array when the call hands it a callback
        if (prop === 'length') return depthOf(path) > 8 ? 0 : 2; // the length of the array a fake stands for is its drawn shape and asks nothing of the world, as the iterator asks nothing: a loop that reads it once (forEach) and one that reads it per step (a counted for) make the same requests
        if (prop === 'constructor') return Object;
        if (typeof prop === 'symbol') return undefined;
        env.record('get', `${path}.${String(prop)}`);
        return env.answer(`${path}.${String(prop)}`);
      },
      set(t, prop, value) { env.record('set', `${path}.${String(prop)}`, [render(value)]); if (typeof value === 'function' && !value.__isFake && env.knownCallables) env.knownCallables.push({ path: `${path}.${String(prop)}`, fn: value }); return true; }, // a handler assigned to the environment: a program may call it later
      has(t, prop) { env.record('has', `${path}.${String(prop)}`); return false; },
      deleteProperty(t, prop) { env.record('delete', `${path}.${String(prop)}`); return true; },
      apply(t, thisArg, args) {
        env.record('call', path, args.map((x) => render(x)));
        // called with a real function first (a class or member decorator, a wrapper): the callee keeps what it was
        // given, so the result is undefined and the decorated class stays the class
        if (env.loading && args.length && typeof args[0] === 'function' && !args[0].__isFake) { // a wrapper or a decorator run while the module loads
          for (const a of args) if (typeof a === 'function' && !a.__isFake && a.length <= 2 && !/^class\s/.test(Function.prototype.toString.call(a))) { try { const r = a(env.fake(`${path}#cb.arg0`), env.fake(`${path}#cb.arg1`)); if (r && typeof r.then === 'function') r.catch(() => {}); } catch (e) { env.record('callback-throw', path, [String(e && e.message)]); } }
          // the result is a callable fake: a decorator factory's product can be applied by __param, and the loader's
          // own __decorate never lets a decorator's result replace the class
        }
        const k = (env.calls.get(path) ?? 0) + 1; env.calls.set(path, k); // every call is its own transition: two reads of a clock are two values
        // a call into the world may fault: on a seeded draw (the same on both sides for the same call) it throws, so that
        // catch paths and error handling run and a dropped or changed handler is a difference the trace shows
        if (!env.loading && env.cbDepth === 0 && env.faultDraw(`${path}()#${k}`)) { env.record('fault', path, []); const error = new Error(`fault: ${path}`); programBuilt.add(error); if (tspec?.returns?.kind === 'promise') { const r = Promise.reject(error); return namePromise(env, env.scheduler ? env.scheduler.hold(r, `${path}()#${k}`) : r, `${path}()#${k}`, { reason: error }); } throw error; }
        // at run time a callback argument is invoked once with fakes, so its own reads reach the trace
        if (!env.loading) {
          const cbs = [];
          for (const a of args) {
            if (typeof a === 'function' && !a.__isFake) cbs.push([a, '']);
            else if (a && typeof a === 'object' && !a.__isFake && !Array.isArray(a)) for (const k of Object.keys(a)) if (typeof a[k] === 'function' && !a[k].__isFake) cbs.push([a[k], '.' + k]);
          }
          for (const [a, tag] of cbs) if (env.knownCallables && !/^class\s/.test(Function.prototype.toString.call(a))) env.knownCallables.push({ path: path + tag, fn: a }); // a callback handed to the environment: a program may fire it again
          for (const [a, tag] of cbs) if (a.length <= 2 && !/^class\s/.test(Function.prototype.toString.call(a))) {
            // a callback that recurses through the environment (a visitor over fakes, `forEachChild(node, visit)`) meets a
            // finite world: past CB_DEPTH nested callbacks the fake runs no further callback, as its iterator yields nothing
            // past depth 8, so the visitor returns at the leaves, the same on both sides (design/fake-recursion.md)
            if (env.cbDepth >= CB_DEPTH) continue;
            env.cbDepth++;
            try { const r = a(env.fake(`${path}#cb${tag}.arg0`), env.fake(`${path}#cb${tag}.arg1`)); if (r && typeof r.then === 'function') r.catch(() => {}); }
            catch (e) { if (e instanceof BudgetError) throw e; if (e instanceof RangeError) throw new BudgetError('stack overflow inside a callback'); env.record('callback-throw', path + tag, [String(e && e.message)]); }
            finally { env.cbDepth--; }
          }
        }
        if (tspec && tspec.kind === 'method') return env.typed(`${path}()#${k}`, tspec.returns); // the declared return type answers
        return env.answer(`${path}()#${k}`);
      },
      construct(t, args) { env.record('new', path, args.map((x) => render(x))); const k = (env.calls.get(path) ?? 0) + 1; env.calls.set(path, k); if (tspec && tspec.kind === 'class') return env.typed(`new ${path}#${k}`, tspec.instance); return env.fake(`new ${path}#${k}`); },
      getPrototypeOf() { return Function.prototype; },
      ownKeys(t) { env.record('keys', path); return Reflect.ownKeys(t); },
      getOwnPropertyDescriptor(t, prop) { return Reflect.getOwnPropertyDescriptor(t, prop); },
    };
    const p = new Proxy(target, handler);
    this.cache.set(key, p);
    return p;
  }
  // the module fake: `require('x')` gives a fake whose members are fakes; default export is itself
  module(name) { return this.fake(`module:${name}`, this.shapes?.imports?.[name] ?? null); }
}

// The iteration methods a fake answers like an array. Called with a function, the fake is read as an array: its length
// and its elements are reads of the fake (`get X.length`, `get X.0`, ...), the same reads an indexed loop over it makes,
// and the callback runs over those elements in order, as Array.prototype runs it over an array-like. A throw inside the
// callback is the unit's throw, never caught here; `some`, `every` and `find` stop where a real array stops. Called
// otherwise (a service's `find(query)`), the member is the fake's plain answer, read and called as before. While a
// module loads the member is the plain answer too.
const elementsOf = (self) => { const n = Number(self.length); return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0; };
const ITERATION = {
  forEach(self, [cb, thisArg]) { const n = elementsOf(self); for (let k = 0; k < n; k++) Reflect.apply(cb, thisArg, [self[k], k, self]); return undefined; },
  map(self, [cb, thisArg]) { const n = elementsOf(self), out = []; for (let k = 0; k < n; k++) out.push(Reflect.apply(cb, thisArg, [self[k], k, self])); return out; },
  filter(self, [cb, thisArg]) { const n = elementsOf(self), out = []; for (let k = 0; k < n; k++) { const v = self[k]; if (Reflect.apply(cb, thisArg, [v, k, self])) out.push(v); } return out; },
  some(self, [cb, thisArg]) { const n = elementsOf(self); for (let k = 0; k < n; k++) if (Reflect.apply(cb, thisArg, [self[k], k, self])) return true; return false; },
  every(self, [cb, thisArg]) { const n = elementsOf(self); for (let k = 0; k < n; k++) if (!Reflect.apply(cb, thisArg, [self[k], k, self])) return false; return true; },
  find(self, [cb, thisArg]) { const n = elementsOf(self); for (let k = 0; k < n; k++) { const v = self[k]; if (Reflect.apply(cb, thisArg, [v, k, self])) return v; } return undefined; },
  flatMap(self, [cb, thisArg]) { const n = elementsOf(self), out = []; for (let k = 0; k < n; k++) { const r = Reflect.apply(cb, thisArg, [self[k], k, self]); if (Array.isArray(r)) out.push(...r); else out.push(r); } return out; },
  reduce(self, args) {
    const [cb] = args; const n = elementsOf(self); let k = 0, acc;
    if (args.length >= 2) acc = args[1];
    else { if (n === 0) throw new TypeError('Reduce of empty array with no initial value'); acc = self[0]; k = 1; }
    for (; k < n; k++) acc = Reflect.apply(cb, undefined, [acc, self[k], k, self]);
    return acc;
  },
};
function iterationMethod(env, self, path, name) {
  const key = `${path}.${name}`;
  const memo = (env.iterationMethods ??= new Map()); // one function per member, so a member read twice is one value
  if (memo.has(key)) return memo.get(key);
  const method = function (...args) {
    if (typeof args[0] === 'function' && !args[0].__isFake) return ITERATION[name](self, args);
    env.record('get', key);
    const member = env.answer(key);
    if (typeof member !== 'function') throw new TypeError(`${name} is not a function`);
    return Reflect.apply(member, this, args);
  };
  memo.set(key, method);
  return method;
}

// A promise object the world answers (a typed call or field, a faulted call) or the input holds is named by its
// creation: `promise#N from <path>`, N the order in which its path first made a promise in this run, the path the
// fake's own (call counter included). Two runs that hand the outside, or return, a different promise object at the
// same position differ, even when both settle to the same value; the name never depends on a memory address, so one
// side's runs are deterministic. A promise the unit makes itself (an async function's result, a `.then` product, a
// `new Promise`) stays anonymous.
const promiseNames = new WeakMap(); // promise -> { label, value } or { label, reason }
export function namePromise(env, p, path, settled) {
  if (!p || typeof p !== 'object' || promiseNames.has(p)) return p;
  let label = `promise from ${path}`;
  if (env) { const seq = (env.promiseSeq ??= new Map()); if (!seq.has(path)) seq.set(path, seq.size + 1); label = `promise#${seq.get(path)} from ${path}`; }
  promiseNames.set(p, { label, ...settled });
  return p;
}
// the name of a promise the world or the input made, or null (not a promise, or one the unit made)
export const promiseName = (v) => (v && (typeof v === 'object' || typeof v === 'function') && typeof v.then === 'function' ? promiseNames.get(v)?.label ?? null : null);

// An error is observed by its class and own fields, and by its message only when the PROGRAM built it (owner, 29 Oct):
// an error the engine raises (`null.size`, a failed JSON.parse, a bad RegExp) carries a message ECMA-262 leaves to the
// implementation, V8 prints source text into it (its CallPrinter: `n.toUpperCase is not a function`), so the text is no
// outcome; a message a `new Error(m)` wrote is program data. The sandbox hands the unit its Error classes wrapped in
// programConstructor (exec/run.mjs sandbox): an error made through them, `new`, called, or as the `super()` of a class
// extending them, is marked program-built; every other value with the internal [[ErrorData]] slot was raised by the
// engine, in either realm (the context's intrinsics raise `TypeError`s of their own realm; a host built-in handed to the
// unit, JSON or RegExp, raises the host's). The fake world's own faults (a drawn `fault:` error) are lean's text and are
// marked too. The wrapper forwards everything else: `instanceof`, the prototype chain, the statics; `Error.prototype.constructor`
// stays the engine's own class, so `e.constructor === Error` inside the unit reads false where a bare engine reads true.
export const programBuilt = new WeakSet();
const isError = (v) => v instanceof Error || Object.prototype.toString.call(v) === '[object Error]';
export const programConstructor = (C) => new Proxy(C, {
  construct(t, args, nt) { const e = Reflect.construct(t, args, nt); if (isError(e)) programBuilt.add(e); return e; },
  apply(t, self, args) { const e = Reflect.apply(t, self, args); if (isError(e)) programBuilt.add(e); return e; },
});
const engineRaised = (v) => !programBuilt.has(v);
// A V8 stack frame line: four spaces, `at`, then a location the engine writes (`file:line:column`, `<anonymous>`,
// `native`, `index N`, `unknown location`). A stack names the file and the columns of the copy that ran, which differ
// between a parent and a candidate by construction; the header (class and message) is the Error's behaviour, the frames
// are not. A line that only starts with `at` and has no such location is the unit's own text and stays.
const FRAME = /^ {4}at [^\n]*(?::\d+:\d+\)?|<anonymous>\)?|\(native\)|\(index \d+\)|\(unknown location\))$/;
// Where lean put the two copies is not a behaviour of the unit. A path the unit reads (`__filename`, `__dirname`,
// `import.meta.url`, a file name inside a message) names the directory each side was loaded from, and the two differ by
// construction (a temporary folder beside the project, a candidate file under another name). `setRoots` is told both
// sides' directories once per pair; a rendered string shows each as `<root>`, and each side's unit file, when the two
// are named differently, as `<unit file>`. A path of another place is untouched.
let rootPatterns = [];
export function setRoots({ dirs = [], files = [] } = {}) {
  const make = (list, token) => {
    const all = [...new Set(list.filter((x) => typeof x === 'string' && x.length > 1 && x !== '/'))].sort((a, b) => b.length - a.length);
    return all.length ? { re: new RegExp(`(?<![A-Za-z0-9_.~-])(?:${all.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![A-Za-z0-9_-])`, 'g'), token } : null;
  };
  rootPatterns = [make(files, '<unit file>'), make(dirs, '<root>')].filter(Boolean);
}
export const withoutRoots = (s) => { for (const { re, token } of rootPatterns) s = s.replace(re, token); return s; };
export function withoutFrames(s) {
  if (!s.includes('\n    at ')) return s;
  const lines = s.split('\n'), kept = lines.filter((l, i) => i === 0 || !FRAME.test(l));
  return kept.length === lines.length ? s : kept.join('\n');
}

// A rendering of a value for the trace and for outcome comparison: fakes by path, objects structurally, a function by its
// handle (escapeHandle below: never its text; what it does is the drive's observation, exec/run.mjs driveWindow).
// With `share` (renderDrawn), an object reached more than once is named: its first sight is `{ $ref: k, value }`, every
// later sight `{ $ref: k }`, so two positions holding one object show the same name; without it, nothing changes.
export function render(v, depth = 0, seen = new Set(), share = null) {
  if (v === null) return null;
  if (v === undefined) return { $undefined: true };
  const t = typeof v;
  if (t === 'number') return Number.isNaN(v) ? { $nan: true } : v === Infinity ? { $infinity: 1 } : v === -Infinity ? { $infinity: -1 } : Object.is(v, -0) ? { $negativeZero: true } : v;
  if (t === 'boolean') return v;
  if (t === 'string') return withoutRoots(withoutFrames(v));
  if (t === 'bigint') return { $bigint: v.toString() };
  if (t === 'symbol') return { $symbol: String(v) };
  if (t === 'function') return v.__isFake ? { $fake: v.__fakePath } : escapeHandle(v);
  if (v.__isFake) return { $fake: v.__fakePath };
  if (depth > 6) return { $deep: true };
  if (share && share.multi.has(v)) { if (share.ids.has(v)) return { $ref: share.ids.get(v) }; share.ids.set(v, share.ids.size); return { $ref: share.ids.get(v), value: renderBody(v, depth, seen, share) }; }
  if (seen.has(v)) return { $cycle: true };
  seen.add(v);
  return renderBody(v, depth, seen, share);
}

// an element tree rendered element by element: the depth bound of render restarts at every element, so a deep tree keeps its
// shape where render alone cuts a deep element's children to one {$deep} object; a value inside a prop keeps the bound. The one
// definition, read by lane B's outcome (exec/run.mjs) and the op-tree patch (patch.mjs): the two print the same tree.
export const renderTree = (v) => (Array.isArray(v) ? v.map(renderTree) : v && typeof v === 'object' && !v.__isFake && Object.hasOwn(v, '$el') ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, k === 'children' && Array.isArray(v.children) ? v.children.map(renderTree) : k === 'rendered' ? renderTree(v.rendered) : render(v[k])])) : render(v));
function renderBody(v, depth, seen, share) {
  if (Array.isArray(v)) return v.map((x) => render(x, depth + 1, seen, share));
  if (v instanceof Date) return { $date: Number.isNaN(v.getTime()) ? 'invalid' : v.toISOString() };
  if (v instanceof Map) return { $map: [...v.entries()].map(([k, x]) => [render(k, depth + 1, seen, share), render(x, depth + 1, seen, share)]) };
  if (v instanceof Set) return { $set: [...v].map((x) => render(x, depth + 1, seen, share)) };
  if (isError(v)) return { $error: v.constructor?.name ?? 'Error', ...(engineRaised(v) ? {} : { message: typeof v.message === 'string' ? withoutRoots(v.message) : v.message }) }; // the class and its own fields; a program-built message is program data; an engine-made message is implementation-defined (ECMA-262) and no outcome (owner 29 Oct, row f0d879ac); the stack never (design/stack-text.md)
  if (v instanceof RegExp) return { $regex: String(v) };
  if (typeof v.then === 'function') { const n = promiseNames.get(v); return n ? { $promise: n.label, settled: Object.hasOwn(n, 'reason') ? { rejected: render(n.reason, depth + 1, seen, share) } : render(n.value, depth + 1, seen, share) } : { $promise: true }; } // a promise the world or the input made is named by its creation; one the unit made is anonymous
  const out = {};
  for (const k of Object.keys(v).sort()) out[k] = render(v[k], depth + 1, seen, share);
  return out;
}

// The input as drawn: every position rendered before either side runs, so a witness replayed from its certificate starts
// where both runs started (a call that writes its arguments changes them after this rendering, never in it). Positions
// that hold one object, and an object that holds itself, keep that sharing: the object is named by `$ref` in order of
// first sight (render's `share`). The objects counted are the ones render walks into: fakes, dates, errors, regular
// expressions and promises are leaves, named by what they are.
export function renderDrawn(args) {
  const count = new Set(), multi = new Set();
  const visit = (v) => {
    if (v === null || typeof v !== 'object' || v.__isFake || v instanceof Date || isError(v) || v instanceof RegExp || typeof v.then === 'function') return;
    if (count.has(v)) { multi.add(v); return; }
    count.add(v);
    if (Array.isArray(v)) v.forEach(visit);
    else if (v instanceof Map) for (const [k, x] of v) { visit(k); visit(x); }
    else if (v instanceof Set) for (const x of v) visit(x);
    else for (const k of Object.keys(v)) visit(v[k]);
  };
  args.forEach(visit);
  const share = { multi, ids: new Map() };
  return args.map((a) => render(a, 0, new Set(), share));
}

export function stable(v) { return JSON.stringify(render(v)); }

// ----- escaped functions: a handle per side, driven, never read (design/callbacks.md) -----
// A function value of the unit that reaches an observation (an argument of a request, a field it sets, a value it
// returns or throws, a prop of its tree, a cleanup, a handler handed to `.catch`) is shown as a HANDLE: its side's
// number for that function object, in order of first sight after the module loaded, so two positions holding one
// function show one number and the same code on both sides numbers its functions alike. What the function does is
// observed by calling it (exec/run.mjs driveWindow): every function first seen inside an observation window is driven
// once at its end, on the same drawn arguments on both sides, and the drive's result, requests and throw are the
// observation. A function's side is its realm (each side's sandbox has its own Function.prototype) or, for a function
// lean's harness makes for one side (a state setter, a dispatch), the side that made it. A function of no side is
// lean's own or the host's (a built-in handed on: `Math.max`): it is named, never driven, the same code on both sides.
const realmEnvs = new WeakMap();  // a sandbox realm's Function.prototype -> its environment
const hostOwners = new WeakMap(); // a function the harness made for one environment -> that environment
let windowEnv = null;             // the environment whose observation window is open: the side of a function whose realm chain leaves the sandbox (a class extending a host built-in such as Error)
export function bindRealm(fnProto, env) { if (fnProto) realmEnvs.set(fnProto, env); }
export function ownFunction(fn, env) { if (typeof fn === 'function') hostOwners.set(fn, env); return fn; }
const nativeText = (f) => { try { return /\{\s*\[native code\]\s*\}\s*$/.test(Function.prototype.toString.call(f)); } catch { return true; } };
function sideOf(fn) {
  const own = hostOwners.get(fn); if (own) return own;
  let p; try { p = Object.getPrototypeOf(fn); } catch { return null; }
  for (let i = 0; p && i < 16; i++) { const e = realmEnvs.get(p); if (e) return e; try { p = Object.getPrototypeOf(p); } catch { return null; } }
  return windowEnv?.escapes?.window && !nativeText(fn) ? windowEnv : null;
}
const escapesOf = (env) => (env.escapes ??= { ids: new Map(), list: [], window: null });
// a function the fake world itself hands the unit (a fake's valueOf, toString or Symbol.toPrimitive; a drawn coercible
// object's methods, a drawn thenable's then: exec/repr.mjs) is the world's, rendered by its name on every rendering: it is
// never the unit's own function, so it takes no handle. Inside an observation window it was numbered as an escape
// (sideOf's window fallback reads a host-realm closure as the window's), and outside one it read as host:toString, so
// the render-purity check saw two different trees of one state.
const worldFns = new WeakMap();
export const worldFunction = (name, fn) => { worldFns.set(fn, name); return fn; };
const fakeMember = worldFunction;
export function escapeHandle(fn) {
  const world = worldFns.get(fn); if (world) return { $fn: `fake:${world}` };
  const env = sideOf(fn);
  if (!env) return { $fn: `host:${fn.name || 'anonymous'}` };
  const reg = escapesOf(env);
  let k = reg.ids.get(fn);
  if (k === undefined) { k = reg.list.length; reg.ids.set(fn, k); reg.list.push({ fn, driven: false }); }
  if (reg.window && !reg.window.seen.has(k)) { reg.window.seen.add(k); reg.window.order.push(k); }
  return { $fn: `#${k}` };
}
// the numbering starts after the module loaded: what the module handed out while loading is not the unit's (a decorator
// given its class), and a module whose top level hands out one function more must not renumber the unit's functions
export function resetEscapes(env) { if (env.escapes && !env.escapes.window) env.escapes = null; }
// an observation window: every function first rendered between open and close is driven at its close
export function openEscapes(env) { escapesOf(env).window = { seen: new Set(), order: [] }; windowEnv = env; }
export function closeEscapes(env) { const reg = escapesOf(env); const w = reg.window; reg.window = null; if (windowEnv === env) windowEnv = null; return w ? w.order : []; }
export const escapeEntry = (env, k) => env.escapes?.list[k] ?? null;
// a stretch of the run whose functions the observation never shows (the render-purity check's second render): numbered, not driven
export function pauseEscapes(env) { const reg = escapesOf(env); const w = reg.window; reg.window = null; return w; }
export function resumeEscapes(env, w) { escapesOf(env).window = w; }
// a rendering with its handles renamed by first sight: two renderings of runs that made their own closures compare by
// where each function stands, not by which object it is (the two renders of one state)
export function canonHandles(v) {
  const names = new Map();
  const walk = (x) => (Array.isArray(x) ? x.map(walk) : x && typeof x === 'object' ? (typeof x.$fn === 'string' && x.$fn.startsWith('#') && Object.keys(x).length === 1 ? { $fn: `#${names.has(x.$fn) ? names.get(x.$fn) : (names.set(x.$fn, names.size), names.size - 1)}` } : Object.fromEntries(Object.entries(x).map(([k, y]) => [k, walk(y)]))) : x);
  return walk(JSON.parse(JSON.stringify(v)));
}
// the internal key of a handle for a reader (a witness names where the driven function is): its text hash, never compared
export const escapeKey = (env, k) => { const e = escapeEntry(env, k); return e ? fnHash(e.fn) : null; };

// Undecided is not a difference. A drive that could not run (exec/run.mjs driveWindow: the budget spent, a timeout, a
// stop of the harness) is `{ $fn, undriven: why }`; from the first such record on either side the two sides' drives are
// undecided, never a difference. `undecidedDrives(a, b)` -> the reasons when the two observations differ only there (each
// observation of a sequence is read the same way), else null; `undrivenOf(o)` -> the first reason an observation holds.
const undrivenList = (ds) => (Array.isArray(ds) ? ds.filter((d) => d && d.undriven).map((d) => d.undriven) : []);
export function undrivenOf(o) {
  if (!o || typeof o !== 'object') return null;
  if (Array.isArray(o)) { for (const x of o) { const r = undrivenOf(x); if (r) return r; } return null; }
  return undrivenList(o.drives)[0] ?? null;
}
function maskDrives(x, y) {
  const cut = (ds, i) => (Array.isArray(ds) ? [...ds.slice(0, i), { undecided: true }] : ds);
  const first = (ds) => (Array.isArray(ds) ? ds.findIndex((d) => d && d.undriven) : -1);
  const i = first(x?.drives), j = first(y?.drives);
  if (i < 0 && j < 0) return [x, y];
  const at = Math.min(...[i, j].filter((n) => n >= 0));
  return [{ ...x, drives: cut(x.drives, at) }, { ...y, drives: cut(y.drives, at) }];
}
export function undecidedDrives(a, b) {
  const pair = (x, y) => (Array.isArray(x) && Array.isArray(y) && x.length === y.length ? x.map((v, i) => maskDrives(v, y[i])) : [maskDrives(x, y)]);
  const pairs = pair(a, b);
  const reasons = [...new Set([a, b].flatMap((o) => (Array.isArray(o) ? o : [o]).flatMap((v) => undrivenList(v?.drives))))];
  if (!reasons.length) return null;
  return pairs.every(([x, y]) => JSON.stringify(x) === JSON.stringify(y)) ? reasons : null;
}

// The detector of a text-only witness (tests/run.mjs, the proof-hunt step): a WITNESS must rest on an observable the
// specification defines (outcome, trace, tree, a drive); with every `src` of a `$fn` rendering removed, the two
// observations must still differ. True when they differ and stop differing once function text is removed.
export function restsOnFunctionText(parent, candidate) {
  const strip = (v) => (Array.isArray(v) ? v.map(strip) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([k]) => !(k === 'src' && Object.hasOwn(v, '$fn'))).map(([k, x]) => [k, strip(x)])) : typeof v === 'string' && /^fn:[0-9a-f]{12}$/.test(v) ? 'fn' : v); // `fn:<hash>`: the trace form a fake's `.catch` handler had
  const a = JSON.stringify(parent ?? null), b = JSON.stringify(candidate ?? null);
  return a !== b && JSON.stringify(strip(JSON.parse(a))) === JSON.stringify(strip(JSON.parse(b)));
}

// the hash of a function's own source text, comments and whitespace folded: an internal key only (escapeKey), never
// part of an observation
const functionSources = new Map();
export function rememberFunctionSource(marked, original) { functionSources.set(marked, original); }
export function withSite(record, site) { return Object.defineProperty(record, 'site', { value: site ?? null }); }

export function fnHash(f) { try { const emitted = Function.prototype.toString.call(f); const src = (functionSources.get(emitted) ?? emitted).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ' '); return createHash('sha256').update(src).digest('hex').slice(0, 12); } catch { return 'native'; } }
