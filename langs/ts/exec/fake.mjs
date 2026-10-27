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
const depthOf = (path) => (path.match(/[.\[(]/g) || []).length;
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
        if (prop === 'catch' || prop === 'finally') { return (h) => { env.record('call', `${path}.${prop}`, [typeof h === 'function' ? `fn:${fnHash(h)}` : String(h)]); return receiver; }; } // a promise-shaped chain on a fake: the handler is recorded, the fake flows on
        if (prop === Symbol.toPrimitive) return (h) => (h === 'number' ? env.primitive('number', path) : h === 'string' ? env.primitive('string', path) : env.primitive('number', path));
        if (prop === 'valueOf') return () => env.primitive('number', path);
        if (prop === 'toString') return () => env.primitive('string', path);
        if (prop === Symbol.iterator) return function* () { const n = depthOf(path) > 8 ? 0 : 2; for (let i = 0; i < n; i++) yield env.answer(`${path}[${i}]`); }; // a fake tree is finite: deep levels are empty
        if (prop === Symbol.asyncIterator) return undefined;
        if (typeof prop === 'string' && typedMember(prop)) { env.record('get', `${path}.${prop}`); return env.member(path, prop, tspec); }
        if (prop === 'length') { env.record('get', `${path}.length`); return depthOf(path) > 8 ? 0 : 2; }
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
        if (!env.loading && env.cbDepth === 0 && env.faultDraw(`${path}()#${k}`)) { env.record('fault', path, []); const error = new Error(`fault: ${path}`); if (tspec?.returns?.kind === 'promise') { const r = Promise.reject(error); return namePromise(env, env.scheduler ? env.scheduler.hold(r, `${path}()#${k}`) : r, `${path}()#${k}`, { reason: error }); } throw error; }
        // at run time a callback argument is invoked once with fakes, so its own reads reach the trace
        if (!env.loading) {
          const cbs = [];
          for (const a of args) {
            if (typeof a === 'function' && !a.__isFake) cbs.push([a, '']);
            else if (a && typeof a === 'object' && !a.__isFake && !Array.isArray(a)) for (const k of Object.keys(a)) if (typeof a[k] === 'function' && !a[k].__isFake) cbs.push([a[k], '.' + k]);
          }
          for (const [a, tag] of cbs) if (env.knownCallables && !/^class\s/.test(Function.prototype.toString.call(a))) env.knownCallables.push({ path: path + tag, fn: a }); // a callback handed to the environment: a program may fire it again
          for (const [a, tag] of cbs) if (a.length <= 2 && !/^class\s/.test(Function.prototype.toString.call(a))) {
            // a callback that recurses through the environment (a visitor over fakes) is bounded: past the depth it is a budget, not a behaviour
            if (env.cbDepth >= 40) throw new BudgetError('callback recursion deeper than 40 through the environment');
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

// A rendering of a value for the trace and for outcome comparison: fakes by path, objects structurally, functions by name.
// With `share` (renderDrawn), an object reached more than once is named: its first sight is `{ $ref: k, value }`, every
// later sight `{ $ref: k }`, so two positions holding one object show the same name; without it, nothing changes.
export function render(v, depth = 0, seen = new Set(), share = null) {
  if (v === null) return null;
  if (v === undefined) return { $undefined: true };
  const t = typeof v;
  if (t === 'number') return Number.isNaN(v) ? { $nan: true } : v === Infinity ? { $infinity: 1 } : v === -Infinity ? { $infinity: -1 } : Object.is(v, -0) ? { $negativeZero: true } : v;
  if (t === 'string' || t === 'boolean') return v;
  if (t === 'bigint') return { $bigint: v.toString() };
  if (t === 'symbol') return { $symbol: String(v) };
  if (t === 'function') return v.__isFake ? { $fake: v.__fakePath } : { $fn: v.name || 'anonymous', src: fnHash(v) };
  if (v.__isFake) return { $fake: v.__fakePath };
  if (depth > 6) return { $deep: true };
  if (share && share.multi.has(v)) { if (share.ids.has(v)) return { $ref: share.ids.get(v) }; share.ids.set(v, share.ids.size); return { $ref: share.ids.get(v), value: renderBody(v, depth, seen, share) }; }
  if (seen.has(v)) return { $cycle: true };
  seen.add(v);
  return renderBody(v, depth, seen, share);
}
function renderBody(v, depth, seen, share) {
  if (Array.isArray(v)) return v.map((x) => render(x, depth + 1, seen, share));
  if (v instanceof Date) return { $date: Number.isNaN(v.getTime()) ? 'invalid' : v.toISOString() };
  if (v instanceof Map) return { $map: [...v.entries()].map(([k, x]) => [render(k, depth + 1, seen, share), render(x, depth + 1, seen, share)]) };
  if (v instanceof Set) return { $set: [...v].map((x) => render(x, depth + 1, seen, share)) };
  if (v instanceof Error) return { $error: v.constructor.name, message: v.message };
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
    if (v === null || typeof v !== 'object' || v.__isFake || v instanceof Date || v instanceof Error || v instanceof RegExp || typeof v.then === 'function') return;
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
// the hash of a function's own source text, comments and whitespace folded
const functionSources = new Map();
export function rememberFunctionSource(marked, original) { functionSources.set(marked, original); }
export function withSite(record, site) { return Object.defineProperty(record, 'site', { value: site ?? null }); }

export function fnHash(f) { try { const emitted = Function.prototype.toString.call(f); const src = (functionSources.get(emitted) ?? emitted).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ' '); return createHash('sha256').update(src).digest('hex').slice(0, 12); } catch { return 'native'; } }
