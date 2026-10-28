// the heap core's world, built from a drawn input and read back against Node (translate/heap.mjs is the reading):
// every object a heap-typed argument reaches is one cell of `HWorld.heap`, its constructor the object's shape (the
// `// SHAPES` legend: arrays [E], sets Set<E>, dictionaries Record<string, V>, maps Map<K, V>, dates, records {f: S}),
// a field or element of an object shape is a Ref to its own cell, and an object reached twice is one cell. A Ref
// parameter's shape is the one its hypothesis names (`// HYP <unit>: WF(hw_) && IsK(hw_, p)`).
import { BigNumber, canon } from './model.mjs';
import { NoBridge, OutOfDomain, Opaque, show } from './bridge.mjs';
import { render } from '../exec/fake.mjs';
import { splitTop } from './dafny-text.mjs';

// the legend: shape key -> {kind, elem | k, v | fields}; an element key is a primitive (int, real, string, bool), an
// absent-able primitive (Ou_int: T | undefined, On_int: T | null) or a shape key
export function legendOf(text) {
  const line = (text.match(/^\/\/ SHAPES: (.*)$/m) ?? [])[1] ?? '';
  const shapes = new Map();
  for (const part of splitTop(line, ';')) {
    const m = part.match(/^([A-Za-z0-9_]+) = (.*)$/); if (!m) continue;
    const [, key, body] = m;
    let s;
    if (body.startsWith('[')) s = { kind: 'arr', elem: body.slice(1, -1) };
    else if (body.startsWith('Set<')) s = { kind: 'set', elem: body.slice(4, -1) };
    else if (body.startsWith('Record<string, ')) s = { kind: 'dict', v: body.slice(15, -1) === 'undefined' && key.startsWith('Dk_') ? key.slice(3) : body.slice(15, -1) }; // the legend prints a dictionary of objects as Record<string, undefined>: its key Dk_<value shape> names the value
    else if (body.startsWith('Map<')) { const [k, v] = splitTop(body.slice(4, -1)); s = { kind: 'map', k, v }; }
    else if (body === 'Date') s = { kind: 'date' };
    else if (body.startsWith('{')) s = { kind: 'rec', fields: body.slice(1, -1).trim() === '' ? [] : splitTop(body.slice(1, -1)).map((f) => { const i = f.indexOf(':'); return { name: f.slice(0, i).trim(), key: f.slice(i + 1).trim() }; }) };
    else s = { kind: 'unknown', body };
    shapes.set(key, s);
  }
  return shapes;
}
const PRIMS = new Set(['int', 'real', 'string', 'bool']);
const optOf = (k) => { const m = k.match(/^O([un])_(int|real|string|bool)$/); return m ? { absent: m[1], inner: m[2] } : null; };

export function heapBridge(model) {
  const { M, D, decls, text } = model;
  const shapes = legendOf(text);
  const obj = decls.datatypes.get('Obj');
  const ctorIndex = (key) => (obj ? obj.ctors.findIndex((c) => c.name === key) : -1);
  const Obj = M.Obj, HW = M.HWorld;
  const mk = (C, i, args) => C[Object.getOwnPropertyNames(C).filter((k) => k.startsWith('create_'))[i]](...args);
  const some = (v) => M.Option.create_Some(v), none = () => M.Option.create_None();
  const pres = (i, v) => mk(M.Pres, i, i === 2 ? [v] : []);
  const prim = (v, d) => model.bridge.into(v, { k: 'name', name: d, args: [], text: d });
  const fields = (x) => Object.keys(x).filter((k) => k !== '$tag').map((k) => x[k]);
  const hypShapes = (fname) => { const h = (text.match(new RegExp(`^// HYP ${fname}: (.+)$`, 'm')) ?? [])[1] ?? ''; return new Map([...h.matchAll(/\bIs([A-Za-z0-9_]+)\(hw_, ([A-Za-z_][A-Za-z0-9_]*)\)/g)].map((m) => [m[2], m[1]])); };

  // ----- into: allocate the graph -----
  function fill(args, hwIndex, live, fname, paramNames) {
    const byParam = hypShapes(fname); const positions = [];
    const cells = new Map(); const ids = new Map(); let next = 0; const extras = new Map();
    const alloc = (v, key) => {
      const s = shapes.get(key); if (!s || s.kind === 'unknown') throw new NoBridge(`heap shape ${key}`);
      if (v === null || typeof v !== 'object' || v.__isFake) throw new OutOfDomain(`a ${v === null ? 'null' : v?.__isFake ? 'fake' : typeof v} where the heap reads a ${key} object`);
      if (ids.has(v)) { if (ids.get(v).key !== key) throw new OutOfDomain(`one object read as two shapes (${ids.get(v).key}, ${key})`); return ids.get(v).ref; }
      const ref = next++; ids.set(v, { ref, key });
      const ci = ctorIndex(key); if (ci < 0) throw new NoBridge(`no heap constructor ${key}`);
      let parts;
      if (s.kind === 'arr') { if (!Array.isArray(v)) throw new OutOfDomain(`not an array (${key})`); parts = [D.Seq.of(...Array.from(v, (x) => elem(x, s.elem)))]; }
      else if (s.kind === 'set') { if (!(v instanceof Set)) throw new OutOfDomain(`not a Set (${key})`); parts = [D.Seq.of(...[...v].map((x) => elem(x, s.elem)))]; }
      else if (s.kind === 'dict') { if (Array.isArray(v) || v instanceof Map || v instanceof Set) throw new OutOfDomain(`not a dictionary (${key})`); const ks = Object.keys(v); parts = [D.Seq.of(...ks.map((k) => prim(k, 'string'))), ks.reduce((m, k) => m.update(prim(k, 'string'), elem(v[k], s.v)), D.Map.Empty), Object.getPrototypeOf(v) !== null]; }
      else if (s.kind === 'map') { if (!(v instanceof Map)) throw new OutOfDomain(`not a Map (${key})`); const es = [...v.entries()]; parts = [D.Seq.of(...es.map(([k]) => elem(k, s.k))), es.reduce((m, [k, x]) => m.update(elem(k, s.k), elem(x, s.v)), D.Map.Empty)]; }
      else if (s.kind === 'date') { if (!(v instanceof Date) || Number.isNaN(v.getTime())) throw new OutOfDomain(`not a valid Date (${key})`); parts = [prim(v.getTime(), 'int')]; }
      else { // a record: its declared fields; a key it does not declare stays as it was (the core never reads it)
        if (Array.isArray(v) || v instanceof Map || v instanceof Set) throw new OutOfDomain(`not a record (${key})`);
        parts = s.fields.map((f) => field(v, f));
        const extra = Object.keys(v).filter((k) => !s.fields.some((f) => f.name === k)); if (extra.length) extras.set(ref, Object.fromEntries(extra.map((k) => [k, v[k]])));
      }
      cells.set(ref, mk(Obj, ci, parts));
      return ref;
    };
    const elem = (x, k) => { if (PRIMS.has(k)) return prim(x, k); const o = optOf(k); if (o) return (o.absent === 'u' ? x === undefined : x === null) ? none() : some(prim(x, o.inner)); return new BigNumber(alloc(x, k)); };
    const field = (v, f) => { const o = optOf(f.key); if (o && o.absent === 'u') return !(f.name in v) ? pres(0) : v[f.name] === undefined ? pres(1) : pres(2, prim(v[f.name], o.inner)); if (!(f.name in v)) throw new OutOfDomain(`the record has no ${f.name}`); return elem(v[f.name], f.key); };
    for (let i = 0; i < args.length; i++) {
      const a = args[i]; if (!a || a.heapArg === undefined) continue;
      const key = byParam.get(a.name);
      const t = model.bridge.resolve(a.type);
      if (a.type.text === 'Ref') { if (!key) throw new NoBridge(`the Ref parameter ${a.name} has no shape in the hypothesis`); const ref = alloc(live[a.heapArg], key); positions.push([a.heapArg, { ref, name: a.name }]); args[i] = new BigNumber(ref); continue; }
      args[i] = model.bridge.into(live[a.heapArg], t);
    }
    const heap = [...cells.entries()].reduce((m, [r, o]) => m.update(new BigNumber(r), o), D.Map.Empty);
    args[hwIndex] = mk(HW, 0, [heap, new BigNumber(next), false]);
    return { extras, positions, byParam };
  }

  // ----- out: the model's cell rebuilt as the JavaScript value it stands for, then rendered by lane B's own render -----
  // (fake.mjs: keys sorted, a second sight of an object rendered {$cycle: true}, six levels deep), so the comparison is
  // lane B's observation itself. An int the double cannot hold exactly is rebuilt as a bigint: it renders unlike any number
  function rebuild(hw, ref, extras, memo = new Map()) {
    if (memo.has(ref)) return memo.get(ref);
    const o = heapGet(hw, ref); if (!o) throw new Opaque(`the model's reference ${ref} is not in its heap`);
    const key = obj.ctors[o.$tag].name, s = shapes.get(key), parts = fields(o);
    if (!s || s.kind === 'unknown') throw new Opaque(`heap shape ${key} not in the legend`);
    const el = (x, k) => { if (PRIMS.has(k)) return jsPrim(x, k); const op = optOf(k); if (op) return x.$tag === 0 ? (op.absent === 'u' ? undefined : null) : jsPrim(fields(x)[0], op.inner); return rebuild(hw, Number(x.toFixed()), extras, memo); };
    let v;
    if (s.kind === 'arr') { v = []; memo.set(ref, v); for (const x of parts[0]) v.push(el(x, s.elem)); }
    else if (s.kind === 'set') { v = new Set(); memo.set(ref, v); for (const x of parts[0]) v.add(el(x, s.elem)); }
    else if (s.kind === 'dict') { v = parts[2] ? {} : Object.create(null); memo.set(ref, v); for (const k of parts[0]) v[k.toVerbatimString(false)] = el(parts[1].get(k), s.v); }
    else if (s.kind === 'map') { v = new Map(); memo.set(ref, v); for (const k of parts[0]) v.set(el(k, s.k), el(parts[1].get(k), s.v)); }
    else if (s.kind === 'date') { v = new Date(Number(parts[0].toFixed())); memo.set(ref, v); }
    else { v = {}; memo.set(ref, v); s.fields.forEach((f, i) => { const x = parts[i], op = optOf(f.key); if (op && op.absent === 'u') { if (x.$tag === 1) v[f.name] = undefined; else if (x.$tag === 2) v[f.name] = jsPrim(fields(x)[0], op.inner); return; } v[f.name] = el(x, f.key); }); Object.assign(v, extras.get(ref) ?? {}); }
    return v;
  }
  const jsPrim = (x, k) => { if (k === 'int') { const n = Number(x.toFixed()); return BigInt(n) === BigInt(x.toFixed()) ? n : BigInt(x.toFixed()); } if (k === 'real') return Number(x.num.dividedBy(x.den).toPrecision(40)); if (k === 'string') return x.toVerbatimString(false); return x; };
  const sameRendering = (hw, ref, r, at) => { const mine = render(rebuild(hw, ref, last.extras)); return JSON.stringify(mine) === JSON.stringify(r) ? null : `${at}: ${firstDiff(mine, r)}`; };
  const heapGet = (hw, ref) => { const heap = fields(hw)[0]; return heap.get(new BigNumber(ref)); };
  let last = null;
  return {
    BigNumber,
    fill(args, hwIndex, live, fname, paramNames) { last = fill(args, hwIndex, live, fname, paramNames); return last; },
    oob: (hw) => fields(hw)[2] === true,
    agreeResult(hw, x, t, r) { if (t.text === 'Ref') return sameRendering(hw, Number(x.toFixed()), r, 'result'); return model.bridge.agree(x, t, r); },
    agreeArgs(hw, args, after) { // every heap argument after the call: the model's cell at its reference against Node's rendering of that argument
      for (const [k, p] of last.positions) { const d = sameRendering(hw, p.ref, after[k], `argument ${p.name} after the call`); if (d) return d; }
      return null;
    },
  };
}
export { canon };
// the first place two renderings differ, as a path and both values
export function firstDiff(a, b, at = '') {
  if (JSON.stringify(a) === JSON.stringify(b)) return null;
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    const ks = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    for (const k of ks) { if (!(k in a)) return `${at}.${k}: the model has no key, Node ${show(b[k])}`; if (!(k in b)) return `${at}.${k}: model ${show(a[k])}, Node has no key`; const d = firstDiff(a[k], b[k], `${at}.${k}`); if (d) return d; }
  }
  return `${at || 'value'}: model ${show(a)} against ${show(b)}`;
}
