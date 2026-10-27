// Lane B validates the library transition table (translate/library.json) on every run: while a unit runs, each built-in
// call of the table is recorded (receiver identity and contents before and after, argument identities, result identity
// and kind), and every record is checked against its row. A mismatch is a model defect: the engine is the oracle, the
// table is the claim. The recorder patches the HOST prototypes, which the sandbox shares (run.mjs passes the host's
// Array, Map, Set and Object into the vm context), and restores them in `finally`; it never calls a patched method
// itself, so the harness's own arrays are unaffected while the window is open.
const ORIGINALS = [];
let inside = false; // the recorder's own bookkeeping (the keep filter, the snapshots) may call a patched method: such a call passes through, never recorded, never recursed into
const ids = new WeakMap(); let nextId = 1;
const idOf = (x) => { if (x === null || (typeof x !== 'object' && typeof x !== 'function')) return null; if (!ids.has(x)) ids.set(x, nextId++); return ids.get(x); };
const seen = (x) => x !== null && (typeof x === 'object' || typeof x === 'function') && ids.has(x);
const isObj = (x) => x !== null && (typeof x === 'object' || typeof x === 'function');
const MAX_PER_OP = 256; // records kept per operation per run; the calls beyond it are counted (summary.calls), never snapshotted
const snap = (x) => { // the contents of a receiver or argument: primitives by value, objects by id
  if (Array.isArray(x)) { const out = []; let accessor = false; for (let i = 0; i < x.length; i++) { const dsc = Object.getOwnPropertyDescriptor(x, i); if (dsc && (dsc.get || dsc.set)) accessor = true; out[i] = i in x ? (isObj(x[i]) ? { id: idOf(x[i]) } : x[i]) : { hole: true }; } return accessor ? { kind: 'array', items: out, accessor: true } : { kind: 'array', items: out }; }
  if (isMapLike(x)) { const out = []; for (const [k, v] of Object.getPrototypeOf(x).entries.call(x)) out[out.length] = [isObj(k) ? { id: idOf(k) } : k, isObj(v) ? { id: idOf(v) } : v]; return { kind: 'map', entries: out }; }
  if (isSetLike(x)) { const out = []; for (const v of Object.getPrototypeOf(x).values.call(x)) out[out.length] = isObj(v) ? { id: idOf(v) } : v; return { kind: 'set', items: out }; }
  if (isObj(x)) { const out = {}; let accessor = false; for (const k of Object.keys(x)) { const dsc = Object.getOwnPropertyDescriptor(x, k); if (dsc && (dsc.get || dsc.set)) accessor = true; out[k] = isObj(x[k]) ? { id: idOf(x[k]) } : x[k]; } if (Object.getOwnPropertySymbols(x).length) accessor = true; return accessor ? { kind: 'record', fields: out, accessor: true } : { kind: 'record', fields: out }; }
  return { kind: 'primitive', value: x };
};
// every primitive the engine can hold, tagged by its type so that two different values never read the same: a string is
// never a number's spelling, Infinity, -Infinity and null are three values (JSON alone writes all three as null), and
// NaN reads as itself, so the comparison is SameValue (NaN equals NaN; -0 stays apart from +0, since a copy keeps it;
// a keyed collection's key is canonicalized before the comparison, see keyVal)
const ser = (v) => JSON.stringify(v, (k, x) => (typeof x === 'string' ? `s:${x}` : typeof x === 'number' ? `n:${Object.is(x, -0) ? '-0' : String(x)}` : typeof x === 'bigint' ? `b:${x}` : typeof x === 'symbol' ? `y:${x.description ?? ''}` : x === undefined ? 'u:' : x));
const same = (a, b) => ser(a) === ser(b);
// a recorded value written for a reader: NaN, the infinities and -0 as lane B's renderer writes them (exec/fake.mjs), never JSON's null
const shown = (v) => JSON.stringify(v, function (k, x) { return typeof x !== 'number' ? (x === undefined && Array.isArray(this) ? { $undefined: true } : typeof x === 'bigint' ? { $bigint: String(x) } : x) : Number.isNaN(x) ? { $nan: true } : x === Infinity ? { $infinity: 1 } : x === -Infinity ? { $infinity: -1 } : Object.is(x, -0) ? { $negativeZero: true } : x; }); // an undefined field is left out, as JSON leaves it; an undefined element is written, never null
const plain = (v) => JSON.parse(shown(v));
// ToIntegerOrInfinity (7.1.5) of a recorded primitive argument, after ToNumber (7.1.4): NaN, +0 and -0 are 0, an infinity
// stays infinite, the rest truncates toward zero
const toIntegerOrInfinity = (v) => { const x = Number(v); if (Number.isNaN(x) || x === 0) return 0; if (!Number.isFinite(x)) return x; return Math.trunc(x); };
const tag = (x) => Object.prototype.toString.call(x);
const isMapLike = (x) => tag(x) === '[object Map]';
const isSetLike = (x) => tag(x) === '[object Set]';

// The caller's file: the nearest stack frame that has one (a native builtin such as `new Map(iterable)` calling `set` has
// none and is skipped). Lane B keeps a record only when that file is one the sandbox loaded, so the harness's own
// arrays (the fakes, the renderer, the graph) never enter the record set while the window is open.
const FRAME = /\((.*?):\d+:\d+\)\s*$|at (\S+?):\d+:\d+\s*$/; // `at fn (file:line:col)` or `at file:line:col`; a native builtin prints `(<anonymous>)` and has no file
const callerFile = (skip) => {
  const lim = Error.stackTraceLimit; Error.stackTraceLimit = 10;
  const o = {}; Error.captureStackTrace(o, skip); const text = o.stack; // the string form: a prepareStackTrace override would also format every other error raised in the window
  Error.stackTraceLimit = lim;
  if (typeof text !== 'string') return null;
  let i = text.indexOf('\n');
  while (i >= 0) { const j = text.indexOf('\n', i + 1); const line = j >= 0 ? text.slice(i + 1, j) : text.slice(i + 1); const m = FRAME.exec(line); if (m) { const f = m[1] ?? m[2]; if (f && f !== '<anonymous>' && !f.startsWith('node:')) return f.startsWith('file://') ? f.slice(7) : f; } i = j; }
  return null;
};
let active = null; // the open window: { records, keep }, so a realm created inside it (a vm context for a fresh mount) can join
export function startRecording(records, realm = { Array, Map, Set, Object }, { keep = null, site = null } = {}) {
  inside = false; // a vm timeout terminates execution without running finally blocks: a window opens with the guard down, whatever the last one left
  active = { records, keep, site };
  patchRealm(realm, records, keep);
}
// A vm context has its own intrinsic Array and Object: an array literal or a slice made inside it uses the context's
// prototype, whatever `Array` its globals name. Lane B's sandbox adds each context's intrinsics while a window is open.
export function addRealm(realm) { if (active) patchRealm(realm, active.records, active.keep); }
function patchRealm(realm, records, keep) { // realm: the constructors whose prototypes carry the calls (the host's for lane B's sandbox, a vm context's own for a foreign corpus); keep(file): record only calls whose caller's file passes (lane B: the sandbox's loaded files)
  const patch = (proto, name, op, { receiverIsFirstArg = false } = {}) => {
    const original = proto[name];
    if (typeof original !== 'function') return;
    ORIGINALS[ORIGINALS.length] = [proto, name, original]; // not push: it may already be patched
    const wrapper = function (...args) {
      if (inside) return Reflect.apply(original, this, args);
      inside = true; let kept = true; try { if (keep) kept = !!keep(callerFile(wrapper)); } finally { inside = false; }
      if (!kept) return Reflect.apply(original, this, args); // the harness's own call: not a record
      const calls = records.calls ?? (records.calls = {}); calls[op] = (calls[op] ?? 0) + 1; // every call from the unit's files is counted; past the cap the call runs unrecorded: a record is one check of the row on real data, the first MAX_PER_OP of an operation are the run's sample, and an unbounded loop would otherwise fill the run with ever larger snapshots (measured: 20,370 push records of a growing array, 38 minutes to check)
      if (calls[op] > MAX_PER_OP) return Reflect.apply(original, this, args);
      const site = active?.site?.() ?? null;
      const receiver = receiverIsFirstArg ? args[0] : this; // an ES module function is strict: `this` of a method called on a primitive is the primitive itself, never boxed
      const argList = []; for (let i = receiverIsFirstArg ? 1 : 0; i < args.length; i++) argList[argList.length] = args[i]; // no array method here: they are patched
      inside = true; let before, beforeArgs, argIds, receiverId, knownBefore;
      try {
      before = snap(receiver); beforeArgs = []; for (let i = 0; i < argList.length; i++) beforeArgs[i] = snap(argList[i]);
      argIds = []; for (let i = 0; i < argList.length; i++) argIds[i] = idOf(argList[i]);
      receiverId = idOf(receiver);
      knownBefore = []; for (let i = 0; i < argList.length; i++) knownBefore[i] = seen(argList[i]);
      } finally { inside = false; }
      let result, threw = null;
      try { result = Reflect.apply(original, this, args); } catch (e) { threw = e; }
      inside = true;
      try {
      const resultKind = threw ? 'throw' : !isObj(result) ? 'primitive' : result === receiver ? 'receiver' : seen(result) ? 'existing' : 'fresh'; // a primitive first: a string method on a string may return the receiver's own value
      const resultId = threw || !isObj(result) ? null : idOf(result);
      const afterArgs = []; for (let i = 0; i < argList.length; i++) afterArgs[i] = snap(argList[i]);
      records[records.length] = ({ op, site, receiverId, argIds, before, after: snap(receiver), beforeArgs, afterArgs, resultKind, resultId, resultValue: isObj(result) ? undefined : result, threw: threw ? String(threw && threw.name) : null });
      } finally { inside = false; }
      if (threw) throw threw;
      return result;
    };
    proto[name] = wrapper;
  };
  const already = (proto) => ORIGINALS.some((o) => o[0] === proto); // the host's realm shared by a context: patched once
  if (realm.Array && !already(realm.Array.prototype)) for (const name of ['push', 'unshift', 'pop', 'shift', 'splice', 'reverse', 'sort', 'slice', 'concat', 'map', 'filter', 'fill', 'toSorted', 'toReversed', 'findLast', 'findLastIndex', 'lastIndexOf', 'toString']) if (typeof realm.Array.prototype[name] === 'function') patch(realm.Array.prototype, name, `Array.prototype.${name}`);
  // the stage 5 rows on primitives: the receiver is the primitive itself (snap reads it by value); the wrapper's `this` is the boxed value, so the record's receiver is its primitive
  if (realm.String && !already(realm.String.prototype)) for (const name of ['toString', 'toLocaleLowerCase', 'substr', 'search', 'matchAll']) if (typeof realm.String.prototype[name] === 'function') patch(realm.String.prototype, name, `String.prototype.${name}`);
  if (realm.Number && !already(realm.Number.prototype)) for (const name of ['toString', 'toLocaleString']) patch(realm.Number.prototype, name, `Number.prototype.${name}`);
  if (realm.Boolean && !already(realm.Boolean.prototype)) patch(realm.Boolean.prototype, 'toString', 'Boolean.prototype.toString');
  if (realm.BigInt && !already(realm.BigInt.prototype)) patch(realm.BigInt.prototype, 'toString', 'BigInt.prototype.toString');
  if (realm.Map && !already(realm.Map.prototype)) for (const name of ['set', 'get', 'has', 'delete']) patch(realm.Map.prototype, name, `Map.prototype.${name}`);
  if (realm.Set && !already(realm.Set.prototype)) for (const name of ['add', 'has', 'delete']) patch(realm.Set.prototype, name, `Set.prototype.${name}`);
  if (realm.Object && !already(realm.Object)) patch(realm.Object, 'assign', 'Object.assign', { receiverIsFirstArg: true });
}
export function stopRecording() { inside = false; active = null; for (let i = ORIGINALS.length - 1; i >= 0; i--) { const [proto, name, original] = ORIGINALS[i]; try { proto[name] = original; } catch { /* a test froze or sealed its realm's prototype: that realm dies with the test, and the next window must still open */ } } ORIGINALS.length = 0; } // not pop: it is patched until the last restore
export async function withRecording(records, fn) { startRecording(records); try { return await fn(); } finally { stopRecording(); } }
// What a certificate carries about the table: how many built-in calls of the table the unit made, how many fell outside
// the model (an array-like receiver, an accessor), how many callbacks wrote into their receiver, and every defect, each
// with the record that contradicts its row. A defect is a model defect of translate/library.json: the proof lane's
// transition for that operation is refused until the row is corrected (check.mjs reads this).
export function summarizeRecords(records, table) {
  const defects = checkRecords(records, table);
  const ops = {}; for (const r of records) ops[r.op] = (ops[r.op] ?? 0) + 1;
  const distinct = new Map(); // one entry per (operation, contradiction), with the first record and how many records showed it
  for (const d of defects) { const k = `${d.op}|${d.why}|${d.expected}`; const e = distinct.get(k); if (e) e.count++; else distinct.set(k, { op: d.op, why: d.why, expected: d.expected, count: 1, record: plain({ before: d.record.before, after: d.record.after, args: d.record.beforeArgs, resultKind: d.record.resultKind, resultValue: d.record.resultValue }) }); }
  const calls = records.calls ?? {}; const sampled = Object.keys(calls).filter((op) => calls[op] > (ops[op] ?? 0)); // an operation called more often than it was recorded
  return { records: records.length, ops, calls, sampled, outOfModel: defects.outOfModel, callbackEffects: defects.callbackEffects, defectRecords: defects.length, defects: [...distinct.values()] };
}

// ----- the check: every record against its row -----
const items = (s) => (s.kind === 'array' ? s.items : s.kind === 'set' ? s.items : null);
export function checkRecords(records, table) {
  const rows = new Map(); for (const o of table.operations) rows.set(o.op, o);
  const defects = [], outOfModel = [], callbackEffects = [];
  for (const r of records) {
    const row = rows.get(r.op); if (!row || row.status !== 'generated') continue;
    const bad = (why, expected) => defects.push({ op: r.op, why, expected, record: r });
    if (r.threw) continue; // a throw is outside the total model: the lint refuses the shapes that throw
    const kind = { array: 'array', map: 'map', set: 'set', record: 'record' }[row.receiver];
    if (kind && r.before.kind !== kind) { outOfModel.push(r); continue; } // an array-like, a subclass or a primitive receiver: the typed subset never passes one
    if (r.before.accessor || r.beforeArgs.some((a) => a && a.accessor)) { outOfModel.push(r); continue; } // an accessor or a symbol key on the receiver or an argument: refused by the lint
    if (r.op === 'Object.assign' && r.beforeArgs.some((a) => a && a.kind === 'primitive' && a.value !== null && a.value !== undefined)) { outOfModel.push(r); continue; } // a string source spreads its indices: outside the record model
    if (r.op === 'Array.prototype.splice' && r.beforeArgs.some((a, i) => i < 2 && a && a.kind !== 'primitive')) { outOfModel.push(r); continue; } // an object start or count is converted by ToPrimitive, which can run its own code: the record holds its id, not its number
    if ((r.op === 'Array.prototype.map' || r.op === 'Array.prototype.filter') && !same(r.before, r.after)) { callbackEffects.push(r); continue; } // the callback wrote into the receiver: the row requires a pure callback, which the lint checks
    const mutated = !same(r.before, r.after);
    if (row.mutatesReceiver !== mutated && !(row.mutatesReceiver && !mutated && noopAllowed(r))) bad(`receiver ${mutated ? 'changed' : 'unchanged'}`, `mutatesReceiver ${row.mutatesReceiver}`);
    if (row.result === 'receiver' && r.resultKind !== 'receiver') bad(`result ${r.resultKind}`, 'result is the receiver');
    if (row.result === 'fresh' && r.resultKind !== 'fresh') bad(`result ${r.resultKind}`, 'result is a fresh object');
    if (row.result === 'primitive' && r.resultKind !== 'primitive') bad(`result ${r.resultKind}`, 'result is a primitive');
    if (row.fresh && r.resultKind !== 'fresh' && row.result === 'fresh') bad('no fresh object', 'fresh true');
    const content = contentCheck(r); if (content) bad(content.why, content.expected);
  }
  defects.outOfModel = outOfModel.length; defects.callbackEffects = callbackEffects.length;
  return defects;
}
const noopAllowed = (r) => (((r.op === 'Array.prototype.push' || r.op === 'Array.prototype.unshift') && r.argIds.length === 0) || r.op === 'Set.prototype.add' || r.op === 'Map.prototype.delete' || r.op === 'Set.prototype.delete' || (r.op === 'Array.prototype.fill') || (r.op === 'Array.prototype.reverse' && items(r.before) && same(items(r.before), items(r.before).slice().reverse())) || (r.op === 'Array.prototype.pop' && items(r.before)?.length === 0) || (r.op === 'Array.prototype.shift' && items(r.before)?.length === 0) || (r.op === 'Array.prototype.reverse' && items(r.before)?.length <= 1) || r.op === 'Array.prototype.sort' || r.op === 'Object.assign' || (r.op === 'Array.prototype.splice' && same(r.before, r.after)) || r.op === 'Map.prototype.set');
function contentCheck(r) {
  const b = r.before, a = r.after; const prim = (s) => (s.kind === 'primitive' ? s.value : { id: null, ref: true, s });
  const argVal = (i) => (r.beforeArgs[i] && r.beforeArgs[i].kind === 'primitive' ? r.beforeArgs[i].value : r.argIds[i] !== null ? { id: r.argIds[i] } : undefined);
  const keyVal = (i) => { const v = argVal(i); return typeof v === 'number' && Object.is(v, -0) ? 0 : v; }; // CanonicalizeKeyedCollectionKey: -0 is +0
  switch (r.op) {
    case 'Array.prototype.push': { const want = items(b).concat(r.argIds.map((_, i) => argVal(i))); return same(items(a), want) && r.resultValue === want.length ? null : { why: 'push contents or length', expected: shown(want) }; }
    case 'Array.prototype.unshift': { const want = r.argIds.map((_, i) => argVal(i)).concat(items(b)); return same(items(a), want) && r.resultValue === want.length ? null : { why: 'unshift contents or length', expected: shown(want) }; }
    case 'Array.prototype.pop': { const bi = items(b); const want = bi.slice(0, Math.max(0, bi.length - 1)); return same(items(a), want) ? null : { why: 'pop contents', expected: shown(want) }; }
    case 'Array.prototype.splice': { // 23.1.3.31: start and delete count read by ToIntegerOrInfinity (NaN is 0, an infinite start clamps to an end); a negative start counts from the end; no start removes nothing, a start alone removes the rest; the delete count is clamped to what remains; the removed elements are the fresh result
      const bi = items(b); const n = bi.length; const argc = r.argIds.length;
      const rel = argc === 0 ? 0 : toIntegerOrInfinity(argVal(0)); const s0 = rel < 0 ? Math.max(n + rel, 0) : Math.min(rel, n);
      const d = argc === 0 ? 0 : argc === 1 ? n - s0 : Math.min(Math.max(toIntegerOrInfinity(argVal(1)), 0), n - s0);
      const ins = r.argIds.slice(2).map((_, i) => argVal(i + 2)); const want = bi.slice(0, s0).concat(ins, bi.slice(s0 + d));
      return same(items(a), want) && r.resultKind === 'fresh' ? null : { why: 'splice contents or result', expected: shown(want) }; }
    case 'Array.prototype.shift': { const want = items(b).slice(1); return same(items(a), want) ? null : { why: 'shift contents', expected: shown(want) }; }
    case 'Array.prototype.reverse': { const want = items(b).slice().reverse(); return same(items(a), want) ? null : { why: 'reverse contents', expected: shown(want) }; }
    case 'Array.prototype.concat': case 'Array.prototype.slice': case 'Array.prototype.map': case 'Array.prototype.filter': return same(b, a) ? null : { why: 'receiver changed', expected: 'unchanged' };
    case 'Map.prototype.set': { const k = keyVal(0), v = argVal(1); const es = b.entries.slice(); let found = false; for (let i = 0; i < es.length; i++) if (same(es[i][0], k)) { es[i] = [k, v]; found = true; } if (!found) es.push([k, v]); return same(a.entries, es) ? null : { why: 'Map.set entries', expected: shown(es) }; }
    case 'Set.prototype.add': { const v = keyVal(0); const xs = b.items.slice(); let has = false; for (const x of xs) if (same(x, v)) has = true; if (!has) xs.push(v); return same(a.items, xs) ? null : { why: 'Set.add items', expected: shown(xs) }; }
    case 'Object.assign': { const want = Object.assign({}, b.fields); for (let i = 0; i < r.beforeArgs.length; i++) if (r.beforeArgs[i].kind === 'record') Object.assign(want, r.beforeArgs[i].fields); return same(a.fields, want) ? null : { why: 'Object.assign fields', expected: shown(want) }; }
    default: return null;
  }
}
