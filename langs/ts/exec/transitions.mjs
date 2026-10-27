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
const ser = (v) => JSON.stringify(v, (k, x) => (typeof x === 'bigint' ? `${x}n` : typeof x === 'symbol' ? `Symbol(${x.description ?? ''})` : x === undefined ? '$undefined' : typeof x === 'number' && Object.is(x, -0) ? '-0' : typeof x === 'number' && Number.isNaN(x) ? 'NaN' : x)); // every primitive the engine can hold, written so that two different values never read the same
const same = (a, b) => ser(a) === ser(b);
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
export function startRecording(records, realm = { Array, Map, Set, Object }, { keep = null } = {}) {
  inside = false; // a vm timeout terminates execution without running finally blocks: a window opens with the guard down, whatever the last one left
  active = { records, keep };
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
      const receiver = receiverIsFirstArg ? args[0] : this;
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
      const resultKind = threw ? 'throw' : result === receiver ? 'receiver' : isObj(result) ? (seen(result) ? 'existing' : 'fresh') : 'primitive';
      const resultId = threw || !isObj(result) ? null : idOf(result);
      const afterArgs = []; for (let i = 0; i < argList.length; i++) afterArgs[i] = snap(argList[i]);
      records[records.length] = ({ op, receiverId, argIds, before, after: snap(receiver), beforeArgs, afterArgs, resultKind, resultId, resultValue: isObj(result) ? undefined : result, threw: threw ? String(threw && threw.name) : null });
      } finally { inside = false; }
      if (threw) throw threw;
      return result;
    };
    proto[name] = wrapper;
  };
  const already = (proto) => ORIGINALS.some((o) => o[0] === proto); // the host's realm shared by a context: patched once
  if (realm.Array && !already(realm.Array.prototype)) for (const name of ['push', 'unshift', 'pop', 'shift', 'splice', 'reverse', 'sort', 'slice', 'concat', 'map', 'filter']) patch(realm.Array.prototype, name, `Array.prototype.${name}`);
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
  for (const d of defects) { const k = `${d.op}|${d.why}|${d.expected}`; const e = distinct.get(k); if (e) e.count++; else distinct.set(k, { op: d.op, why: d.why, expected: d.expected, count: 1, record: { before: d.record.before, after: d.record.after, args: d.record.beforeArgs, resultKind: d.record.resultKind, resultValue: d.record.resultValue } }); }
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
const noopAllowed = (r) => (((r.op === 'Array.prototype.push' || r.op === 'Array.prototype.unshift') && r.argIds.length === 0) || r.op === 'Set.prototype.add' || r.op === 'Map.prototype.delete' || r.op === 'Set.prototype.delete' || (r.op === 'Array.prototype.pop' && items(r.before)?.length === 0) || (r.op === 'Array.prototype.shift' && items(r.before)?.length === 0) || (r.op === 'Array.prototype.reverse' && items(r.before)?.length <= 1) || r.op === 'Array.prototype.sort' || r.op === 'Object.assign' || (r.op === 'Array.prototype.splice' && same(r.before, r.after)) || r.op === 'Map.prototype.set');
function contentCheck(r) {
  const b = r.before, a = r.after; const prim = (s) => (s.kind === 'primitive' ? s.value : { id: null, ref: true, s });
  const argVal = (i) => (r.beforeArgs[i] && r.beforeArgs[i].kind === 'primitive' ? r.beforeArgs[i].value : r.argIds[i] !== null ? { id: r.argIds[i] } : undefined);
  const keyVal = (i) => { const v = argVal(i); return typeof v === 'number' && Object.is(v, -0) ? 0 : v; }; // CanonicalizeKeyedCollectionKey: -0 is +0
  switch (r.op) {
    case 'Array.prototype.push': { const want = items(b).concat(r.argIds.map((_, i) => argVal(i))); return same(items(a), want) && r.resultValue === want.length ? null : { why: 'push contents or length', expected: JSON.stringify(want) }; }
    case 'Array.prototype.unshift': { const want = r.argIds.map((_, i) => argVal(i)).concat(items(b)); return same(items(a), want) && r.resultValue === want.length ? null : { why: 'unshift contents or length', expected: JSON.stringify(want) }; }
    case 'Array.prototype.pop': { const bi = items(b); const want = bi.slice(0, Math.max(0, bi.length - 1)); return same(items(a), want) ? null : { why: 'pop contents', expected: JSON.stringify(want) }; }
    case 'Array.prototype.splice': { // 23.1.3.31: a negative start counts from the end; the delete count is clamped to what remains; the removed elements are the fresh result
      const bi = items(b); const n = bi.length; const st = argVal(0), dc = argVal(1);
      const rel = typeof st === 'number' ? Math.trunc(st) : 0; const s0 = rel < 0 ? Math.max(n + rel, 0) : Math.min(rel, n);
      const d = r.argIds.length < 2 ? n - s0 : Math.min(Math.max(typeof dc === 'number' ? Math.trunc(dc) : 0, 0), n - s0);
      const ins = r.argIds.slice(2).map((_, i) => argVal(i + 2)); const want = bi.slice(0, s0).concat(ins, bi.slice(s0 + d));
      return same(items(a), want) && r.resultKind === 'fresh' ? null : { why: 'splice contents or result', expected: JSON.stringify(want) }; }
    case 'Array.prototype.shift': { const want = items(b).slice(1); return same(items(a), want) ? null : { why: 'shift contents', expected: JSON.stringify(want) }; }
    case 'Array.prototype.reverse': { const want = items(b).slice().reverse(); return same(items(a), want) ? null : { why: 'reverse contents', expected: JSON.stringify(want) }; }
    case 'Array.prototype.concat': case 'Array.prototype.slice': case 'Array.prototype.map': case 'Array.prototype.filter': return same(b, a) ? null : { why: 'receiver changed', expected: 'unchanged' };
    case 'Map.prototype.set': { const k = keyVal(0), v = argVal(1); const es = b.entries.slice(); let found = false; for (let i = 0; i < es.length; i++) if (same(es[i][0], k)) { es[i] = [k, v]; found = true; } if (!found) es.push([k, v]); return same(a.entries, es) ? null : { why: 'Map.set entries', expected: JSON.stringify(es) }; }
    case 'Set.prototype.add': { const v = keyVal(0); const xs = b.items.slice(); let has = false; for (const x of xs) if (same(x, v)) has = true; if (!has) xs.push(v); return same(a.items, xs) ? null : { why: 'Set.add items', expected: JSON.stringify(xs) }; }
    case 'Object.assign': { const want = Object.assign({}, b.fields); for (let i = 0; i < r.beforeArgs.length; i++) if (r.beforeArgs[i].kind === 'record') Object.assign(want, r.beforeArgs[i].fields); return same(a.fields, want) ? null : { why: 'Object.assign fields', expected: JSON.stringify(want) }; }
    default: return null;
  }
}
