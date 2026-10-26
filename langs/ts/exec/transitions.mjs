// Lane B validates the library transition table (translate/library.json) on every run: while a unit runs, each built-in
// call of the table is recorded (receiver identity and contents before and after, argument identities, result identity
// and kind), and every record is checked against its row. A mismatch is a model defect: the engine is the oracle, the
// table is the claim. The recorder patches the HOST prototypes, which the sandbox shares (run.mjs passes the host's
// Array, Map, Set and Object into the vm context), and restores them in `finally`; it never calls a patched method
// itself, so the harness's own arrays are unaffected while the window is open.
const ORIGINALS = [];
const ids = new WeakMap(); let nextId = 1;
const idOf = (x) => { if (x === null || (typeof x !== 'object' && typeof x !== 'function')) return null; if (!ids.has(x)) ids.set(x, nextId++); return ids.get(x); };
const seen = (x) => x !== null && (typeof x === 'object' || typeof x === 'function') && ids.has(x);
const isObj = (x) => x !== null && (typeof x === 'object' || typeof x === 'function');
const snap = (x) => { // the contents of a receiver or argument: primitives by value, objects by id
  if (Array.isArray(x)) { const out = []; for (let i = 0; i < x.length; i++) out[i] = i in x ? (isObj(x[i]) ? { id: idOf(x[i]) } : x[i]) : { hole: true }; return { kind: 'array', items: out }; }
  if (x instanceof Map) { const out = []; for (const [k, v] of Map.prototype.entries.call(x)) out[out.length] = [isObj(k) ? { id: idOf(k) } : k, isObj(v) ? { id: idOf(v) } : v]; return { kind: 'map', entries: out }; }
  if (x instanceof Set) { const out = []; for (const v of Set.prototype.values.call(x)) out[out.length] = isObj(v) ? { id: idOf(v) } : v; return { kind: 'set', items: out }; }
  if (isObj(x)) { const out = {}; for (const k of Object.keys(x)) out[k] = isObj(x[k]) ? { id: idOf(x[k]) } : x[k]; return { kind: 'record', fields: out }; }
  return { kind: 'primitive', value: x };
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function startRecording(records) {
  const patch = (proto, name, op, { receiverIsFirstArg = false } = {}) => {
    const original = proto[name];
    if (typeof original !== 'function') return;
    ORIGINALS.push([proto, name, original]);
    proto[name] = function (...args) {
      const receiver = receiverIsFirstArg ? args[0] : this;
      const argList = []; for (let i = receiverIsFirstArg ? 1 : 0; i < args.length; i++) argList[argList.length] = args[i]; // no array method here: they are patched
      const before = snap(receiver), beforeArgs = []; for (let i = 0; i < argList.length; i++) beforeArgs[i] = snap(argList[i]);
      const argIds = []; for (let i = 0; i < argList.length; i++) argIds[i] = idOf(argList[i]);
      const receiverId = idOf(receiver);
      const knownBefore = []; for (let i = 0; i < argList.length; i++) knownBefore[i] = seen(argList[i]);
      let result, threw = null;
      try { result = Reflect.apply(original, this, args); } catch (e) { threw = e; }
      const resultKind = threw ? 'throw' : result === receiver ? 'receiver' : isObj(result) ? (seen(result) ? 'existing' : 'fresh') : 'primitive';
      const resultId = threw || !isObj(result) ? null : idOf(result);
      const afterArgs = []; for (let i = 0; i < argList.length; i++) afterArgs[i] = snap(argList[i]);
      records[records.length] = ({ op, receiverId, argIds, before, after: snap(receiver), beforeArgs, afterArgs, resultKind, resultId, resultValue: isObj(result) ? undefined : result, threw: threw ? String(threw && threw.name) : null });
      if (threw) throw threw;
      return result;
    };
  };
  for (const name of ['push', 'unshift', 'pop', 'shift', 'splice', 'reverse', 'sort', 'slice', 'concat', 'map', 'filter']) patch(Array.prototype, name, `Array.prototype.${name}`);
  for (const name of ['set', 'get', 'has', 'delete']) patch(Map.prototype, name, `Map.prototype.${name}`);
  for (const name of ['add', 'has', 'delete']) patch(Set.prototype, name, `Set.prototype.${name}`);
  patch(Object, 'assign', 'Object.assign', { receiverIsFirstArg: true });
}
export function stopRecording() { while (ORIGINALS.length) { const [proto, name, original] = ORIGINALS.pop(); proto[name] = original; } }
export async function withRecording(records, fn) { startRecording(records); try { return await fn(); } finally { stopRecording(); } }

// ----- the check: every record against its row -----
const items = (s) => (s.kind === 'array' ? s.items : s.kind === 'set' ? s.items : null);
export function checkRecords(records, table) {
  const rows = new Map(); for (const o of table.operations) rows.set(o.op, o);
  const defects = [];
  for (const r of records) {
    const row = rows.get(r.op); if (!row || row.status !== 'generated') continue;
    const bad = (why, expected) => defects.push({ op: r.op, why, expected, record: r });
    if (r.threw) continue; // a throw is outside the total model: the lint refuses the shapes that throw
    const mutated = !same(r.before, r.after);
    if (row.mutatesReceiver !== mutated && !(row.mutatesReceiver && !mutated && noopAllowed(r))) bad(`receiver ${mutated ? 'changed' : 'unchanged'}`, `mutatesReceiver ${row.mutatesReceiver}`);
    if (row.result === 'receiver' && r.resultKind !== 'receiver') bad(`result ${r.resultKind}`, 'result is the receiver');
    if (row.result === 'fresh' && r.resultKind !== 'fresh') bad(`result ${r.resultKind}`, 'result is a fresh object');
    if (row.result === 'primitive' && r.resultKind !== 'primitive') bad(`result ${r.resultKind}`, 'result is a primitive');
    if (row.fresh && r.resultKind !== 'fresh' && row.result === 'fresh') bad('no fresh object', 'fresh true');
    const content = contentCheck(r); if (content) bad(content.why, content.expected);
  }
  return defects;
}
const noopAllowed = (r) => (r.op === 'Set.prototype.add' || r.op === 'Map.prototype.delete' || r.op === 'Set.prototype.delete' || (r.op === 'Array.prototype.pop' && items(r.before)?.length === 0) || (r.op === 'Array.prototype.shift' && items(r.before)?.length === 0) || (r.op === 'Array.prototype.reverse' && items(r.before)?.length <= 1) || r.op === 'Array.prototype.sort' || r.op === 'Object.assign' || (r.op === 'Array.prototype.splice' && same(r.before, r.after)) || r.op === 'Map.prototype.set');
function contentCheck(r) {
  const b = r.before, a = r.after; const prim = (s) => (s.kind === 'primitive' ? s.value : { id: null, ref: true, s });
  const argVal = (i) => (r.beforeArgs[i] && r.beforeArgs[i].kind === 'primitive' ? r.beforeArgs[i].value : r.argIds[i] !== null ? { id: r.argIds[i] } : undefined);
  switch (r.op) {
    case 'Array.prototype.push': { const want = items(b).concat(r.argIds.map((_, i) => argVal(i))); return same(items(a), want) && r.resultValue === want.length ? null : { why: 'push contents or length', expected: JSON.stringify(want) }; }
    case 'Array.prototype.unshift': { const want = r.argIds.map((_, i) => argVal(i)).concat(items(b)); return same(items(a), want) && r.resultValue === want.length ? null : { why: 'unshift contents or length', expected: JSON.stringify(want) }; }
    case 'Array.prototype.pop': { const bi = items(b); const want = bi.slice(0, Math.max(0, bi.length - 1)); return same(items(a), want) ? null : { why: 'pop contents', expected: JSON.stringify(want) }; }
    case 'Array.prototype.shift': { const want = items(b).slice(1); return same(items(a), want) ? null : { why: 'shift contents', expected: JSON.stringify(want) }; }
    case 'Array.prototype.reverse': { const want = items(b).slice().reverse(); return same(items(a), want) ? null : { why: 'reverse contents', expected: JSON.stringify(want) }; }
    case 'Array.prototype.concat': case 'Array.prototype.slice': case 'Array.prototype.map': case 'Array.prototype.filter': return same(b, a) ? null : { why: 'receiver changed', expected: 'unchanged' };
    case 'Map.prototype.set': { const k = argVal(0), v = argVal(1); const es = b.entries.slice(); let found = false; for (let i = 0; i < es.length; i++) if (same(es[i][0], k)) { es[i] = [k, v]; found = true; } if (!found) es.push([k, v]); return same(a.entries, es) ? null : { why: 'Map.set entries', expected: JSON.stringify(es) }; }
    case 'Set.prototype.add': { const v = argVal(0); const xs = b.items.slice(); let has = false; for (const x of xs) if (same(x, v)) has = true; if (!has) xs.push(v); return same(a.items, xs) ? null : { why: 'Set.add items', expected: JSON.stringify(xs) }; }
    case 'Object.assign': { const want = Object.assign({}, b.fields); for (let i = 0; i < r.beforeArgs.length; i++) if (r.beforeArgs[i].kind === 'record') Object.assign(want, r.beforeArgs[i].fields); return same(a.fields, want) ? null : { why: 'Object.assign fields', expected: JSON.stringify(want) }; }
    default: return null;
  }
}
