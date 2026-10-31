// Versioned evidence, separate from the v1 observation. No answer is generated here.
import { types } from 'node:util';
const captures = new WeakMap();
let currentUnit = null;
export function beginUnitRecord(record) { currentUnit = { record, environments: [] }; }
export function finishUnitRecord(record) {
  const session = currentUnit; currentUnit = null;
  if (!session || session.record !== record) return;
  record.auxiliaryEnvironments = session.environments.filter(env => !captures.get(env).claimed).map(env => {
    const c = captures.get(env);
    return { seed: env.seed, ...answered(c.events, [...c.imports]), invocation: { status: 'not recorded', reason: 'auxiliary program/sequence generator outside the single-draw output boundary' } };
  });
}
const KEY_QUERY = 'key query on a fake: wrapping it would query the fake twice (Proxy invariant check), so its answer is not recorded';
const knownHandles = new WeakMap();
const special = new Set(['__isFake', '__fakePath', 'then', 'valueOf', 'toString', 'constructor']);
const keyOf = p => typeof p === 'symbol' ? `@@${p.description}` : String(p);

function encode(value, seen = new Map()) {
  if (value === undefined) return { t: 'undefined' };
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return { t: 'value', v: value };
  if (typeof value === 'number') return { t: 'number', v: Object.is(value, -0) ? '-0' : String(value) };
  if (typeof value === 'bigint') return { t: 'bigint', v: String(value) };
  if (typeof value === 'symbol') return { t: 'unrecorded', reason: 'symbol identity' };
  const handle = knownHandles.get(value);
  if (handle) return { t: 'handle', v: handle };
  if (typeof value === 'function') return { t: 'unrecorded', reason: 'real function or callback (source and invocation protocol absent)' };
  if (seen.has(value)) return { t: 'ref', v: seen.get(value) };
  if (seen.size > 20000) return { t: 'unrecorded', reason: 'value graph exceeds capture bound' };
  const id = seen.size; seen.set(value, id);
  if (types.isProxy(value)) return { t: 'unrecorded', reason: 'real proxy: inspecting it would invoke user traps' };
  if (Object.getOwnPropertySymbols(value).length) return { t: 'unrecorded', reason: 'symbol-keyed properties' };
  if (types.isDate(value)) return { t: 'date', id, v: String(Date.prototype.getTime.call(value)) };
  if (types.isRegExp(value)) {
    const get = key => Object.getOwnPropertyDescriptor(RegExp.prototype, key).get.call(value);
    return { t: 'regexp', id, source: get('source'), flags: [['hasIndices','d'],['global','g'],['ignoreCase','i'],['multiline','m'],['dotAll','s'],['unicode','u'],['unicodeSets','v'],['sticky','y']].filter(([key]) => get(key)).map(([,flag]) => flag).join(''), lastIndex: Object.getOwnPropertyDescriptor(value,'lastIndex').value };
  }
  if (types.isNativeError(value)) {
    const message = Object.getOwnPropertyDescriptor(value, 'message'), ctor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(value), 'constructor');
    if ((message && (!('value' in message) || typeof message.value !== 'string')) || !ctor || !('value' in ctor) || types.isProxy(ctor.value) || Object.keys(value).length) return { t: 'unrecorded', reason: 'error with accessor or own fields' };
    return { t: 'error', id, name: Object.getOwnPropertyDescriptor(ctor.value, 'name')?.value ?? 'Error', message: message?.value ?? '' };
  }
  if (types.isPromise(value)) return { t: 'unrecorded', reason: 'promise settlement requires an asynchronous capture protocol' };
  if (types.isMap(value)) return { t: 'map', id, v: [...Map.prototype.entries.call(value)].map(([k, v]) => [encode(k, seen), encode(v, seen)]) };
  if (types.isSet(value)) return { t: 'set', id, v: [...Set.prototype.values.call(value)].map(v => encode(v, seen)) };
  if (Array.isArray(value)) {
    const ds = Object.getOwnPropertyDescriptors(value), n = ds.length.value;
    if (n > 20000 || Object.keys(ds).some(k => k !== 'length' && !/^(0|[1-9][0-9]*)$/.test(k))) return { t: 'unrecorded', reason: 'extended or oversized array' };
    const v = [];
    for (let i = 0; i < n; i++) { if (!ds[i] || !('value' in ds[i])) return { t: 'unrecorded', reason: 'sparse array or array accessor' }; v.push(encode(ds[i].value, seen)); }
    return { t: 'array', id, v };
  }
  const proto = Object.getPrototypeOf(value);
  if (proto && (types.isProxy(proto) || Object.getPrototypeOf(proto) !== null)) return { t: 'unrecorded', reason: 'class instance prototype' };
  if (Object.getOwnPropertyNames(value).length !== Object.keys(value).length) return { t: 'unrecorded', reason: 'non-enumerable object fields' };
  const entries = [];
  for (const k of Object.keys(value)) {
    const d = Object.getOwnPropertyDescriptor(value, k);
    entries.push([k, d && 'value' in d ? encode(d.value, seen) : { t: 'unrecorded', reason: 'accessor' }]);
  }
  return { t: 'object', id, nullPrototype: proto === null, v: entries };
}
export function snapshot(env, value) {
  const c = captures.get(env); if (c) c.silent++;
  try { return encode(value, c?.references ?? new Map()); } catch (e) { return { t: 'unrecorded', reason: `capture: ${e.name}` }; }
  finally { if (c) c.silent--; }
}

export function captureEnvironment(env) {
  if (captures.has(env)) return;
  const c = { events: [], imports: new Set(), silent: 0, stack: [], active: true, references: new Map() };
  captures.set(env, c);
  currentUnit?.environments.push(env);
  const event = (op, path, args, fn) => {
    if (c.silent || !c.active) return fn();
    const e = { index: c.events.length, parent: c.stack.at(-1) ?? null, phase: env.loading ? 'load' : 'run', op, path, args: snapshot(env, args), site: env.siteState?.current?.site ?? null };
    c.events.push(e); c.stack.push(e.index);
    try { const v = fn(); e.outcome = { kind: 'return', value: snapshot(env, v) }; return v; }
    catch (error) { e.outcome = { kind: 'throw', value: snapshot(env, error) }; throw error; }
    finally { c.stack.pop(); }
  };
  const originalFake = env.fake;
  env.fake = function (...args) {
    const value = Reflect.apply(originalFake, this, args);
    if (knownHandles.has(value)) return value;
    // Cache hits can be concrete values (typed() and answer() share the cache).
    if (!value || (typeof value !== 'function' && typeof value !== 'object') || !value.__isFake) return value;
    const path = value.__fakePath;
    knownHandles.set(value, path);
    const p = new Proxy(value, {
      get(t, key, receiver) {
        if (special.has(key) || key === Symbol.toPrimitive || key === Symbol.iterator || key === Symbol.asyncIterator) return Reflect.get(t, key, receiver);
        return event('get', path, [keyOf(key)], () => Reflect.get(t, key, receiver));
      },
      apply: (t, self, a) => event('call', path, a, () => Reflect.apply(t, self, a)),
      construct: (t, a, nt) => event('new', path, a, () => Reflect.construct(t, a, nt)),
      set: (t, k, v, r) => event('set', path, [keyOf(k), v], () => Reflect.set(t, k, v, r)),
      has: (t, k) => event('has', path, [keyOf(k)], () => Reflect.has(t, k)),
      deleteProperty: (t, k) => event('delete', path, [keyOf(k)], () => Reflect.deleteProperty(t, k)),
      // no ownKeys trap: after an ownKeys trap the engine queries the target's keys again to check the Proxy invariants,
      // and the target is the fake, which logs every query, so a trap here doubled `keys` in the v1 trace. A key query
      // reaches the fake once; witnessRecord marks it unrecorded from the trace (KEY_QUERY).
    });
    knownHandles.set(p, path); env.cache.set(path, p); return p;
  };
  for (const name of ['clock', 'primitive', 'rng']) {
    const original = env[name];
    env[name] = function (...args) { return event(name, name === 'rng' ? 'Math.random' : name === 'primitive' ? args[1] : args[0], name === 'primitive' ? [args[0]] : name === 'rng' ? [] : args.slice(1), () => Reflect.apply(original, this, args)); };
  }
  // Iterator yields bypass fake.get; capture the actual answer at that public boundary.
  const answer = env.answer;
  env.answer = function (path) { return /\[\d+\]$/.test(path) && !c.stack.length ? event('iterator', path, [], () => Reflect.apply(answer, this, [path])) : Reflect.apply(answer, this, [path]); };
  const member = env.member;
  env.member = function (path, prop, spec) { return path === 'this' ? event('member', path, [prop], () => Reflect.apply(member, this, [path, prop, spec])) : Reflect.apply(member, this, [path, prop, spec]); };
  const module = env.module;
  env.module = function (name) { c.imports.add(name); return Reflect.apply(module, this, [name]); };
}
// Stop observing harness serialization; no v1 field or trace entry is added.
export function captureActive(env, active) { const c = captures.get(env); if (c) c.active = active; }
// the instant lean's recorded clock starts at: the sandbox's Date and Date.now count from it (exec/run.mjs sandbox), the
// witness record names it, and the render row carries it (bound.render.clock.epoch)
export const CLOCK_EPOCH = 1700000000000;
export function witnessRecord({ seed, leanHead, input, sides, invocation = { kind: 'call' } }) {
  const record = { schema: 'witness-record/v2', version: 2, seed, leanHead, input, invocation, clockEpoch: CLOCK_EPOCH, compiler: { target: 'ES2020', esModuleInterop: true, experimentalDecorators: true, useDefineForClassFields: !!Object.values(sides)[0]?.env?.classFieldsDefine, jsx: 'react-jsx' }, // the unit file's emit mode (common.mjs classFieldsDefine)
    sides: Object.fromEntries(Object.entries(sides).map(([name, side]) => {
      const c = captures.get(side.env);
      const events = c?.events ?? [];
      if (c) c.claimed = true;
      return [name, { graphScope: 'environment', seed: side.env.seed, ...(side.commands ? { commands: side.commands } : {}), args: side.args ?? snapshot(side.env, side.inputs), events, imports: [...(c?.imports ?? [])],
        clock: events.filter(e => e.op === 'clock'), random: events.filter(e => e.op === 'rng'),
        timeline: side.env.trace.filter(e => e.op === 'fire').map(e => ({ ...e })),
        unrecorded: c ? side.env.trace.filter(e => e.op === 'keys').map(e => ({ site: `record.mjs fake wrapper: keys ${e.path}`, reason: KEY_QUERY })) : [{ site: 'environment setup', reason: 'capture not installed' }] }];
    })) };
  if (invocation.kind === 'program' && currentUnit) (currentUnit.record.programRuns ??= []).push(drawSummary(record));
  return record;
}

// The unit certificate is accounting, not a second transcript: per side, how many answers each fake gave, by operation
// and by path, and which answers were not recorded. A replayable transcript rides only in a witness record; carrying one
// per draw made a bounded row up to 3.8 MB (eslint:105 resolve, 100 draws) for no reader that replays it.
const unrecordedReasons = (x, out) => {
  if (Array.isArray(x)) { for (const y of x) unrecordedReasons(y, out); return out; }
  if (!x || typeof x !== 'object') return out;
  if (x.t === 'unrecorded') { out[x.reason] = (out[x.reason] ?? 0) + 1; return out; }
  for (const k of ['v', 'value']) if (k in x) unrecordedReasons(x[k], out);
  return out;
};
function answered(events, imports) {
  const ops = {}, fakes = {}, unrecorded = {};
  for (const e of events) {
    ops[e.op] = (ops[e.op] ?? 0) + 1;
    fakes[e.path] = (fakes[e.path] ?? 0) + 1;
    unrecordedReasons(e.outcome?.value, unrecorded);
  }
  return { events: events.length, ops, fakes, imports, unrecorded };
}
export function drawSummary(record) {
  const sides = Object.fromEntries(Object.entries(record.sides).map(([name, s]) => [name, { ...answered(s.events, s.imports), ...(s.unrecorded.length ? { setup: s.unrecorded } : {}) }]));
  const p = record.sides.parent, c = record.sides.candidate;
  return { input: record.input, invocation: record.invocation, args: p.args, ...(JSON.stringify(p.args) !== JSON.stringify(c.args) ? { argsCandidate: c.args } : {}), ...(p.commands ? { commands: p.commands.length } : {}), sides };
}

// A worker can stop before it can return its local recorder. Preserve that absence as data.
export function incompleteUnitRecord(opts, reason) {
  return { schema: 'witness-record/v2', version: 2, invocation: { kind: 'unit' }, unit: opts.unit, seed: opts.seed ?? 1, leanHead: opts.recordHead ?? 'unknown', draws: [], auxiliaryEnvironments: [], drawDomain: { parameters: [], status: 'not recorded', reason }, reach: { status: 'not recorded', reason }, unrecorded: [{ site: 'run.mjs runPair worker completion', reason }] };
}
