// Lane B, heap layer stage 2: Korat-style enumeration of small heaps (research brief 13 §28).
//
// The random generator draws values; it rarely draws STRUCTURE: two arguments that are one object, a record whose field
// points back at it, a list holding the same record twice. This enumerator finitizes the structure of a unit's record
// shapes and walks every assignment: a pool of k objects per record shape (the shape key is the one aliasInputs groups
// by); every reference-typed field of every pool object, and every argument of record shape, ranges over the pool
// (and null where the field admits null); an array of records ranges over the lengths 0..k with elements from the
// pool, a Set of records and a Map keyed by records over the sequences of distinct pool objects up to k (their items and
// keys in insertion order), a Map whose values are records over the sequences of pool objects of its entries' length (a
// side that is no record drawn by the seeded generator), and a nullable item, key or value takes the absent value as one
// more letter, so an item, a key or a value may be the very object an argument holds: they compare by identity
// (SameValueZero), and a fresh record would never be one. The order is breadth-first first: every slot takes a pool
// object once, on the shallowest object of its shape, before the odometer (heap-stage5.md 16c). Primitive fields take the seeded generator's values once per pool object, so only the structure varies. Each
// assignment is instantiated into fresh objects and its reachable graph serialised by graph.mjs; a graph seen before
// is dropped, so what remains is one representative per non-isomorphic small heap reachable from the arguments. The
// result is a list of BUILDERS: a builder makes a fresh copy of its heap, so each side of a pair receives its own
// objects and the two copies serialise the same.
import { generator } from './gen.mjs';
import { Graph } from './graph.mjs';

const DEPTH = 4;

export function enumerateHeaps(spec, k = 2, seed = 1, cap = 48, maxAssignments = 20000) {
  const defs = spec.defs ?? {};
  const resolve = (s, d = 0) => (s && s.kind === 'ref' && defs[s.key] && d < DEPTH ? resolve(defs[s.key], d + 1) : s);
  const nullable = (s) => !!(s && s.kind === 'union' && s.options.some((o) => o.kind === 'null' || o.kind === 'undefined'));
  const inner = (s) => { const r = resolve(s); if (r && r.kind === 'union') { const os = r.options.filter((o) => o.kind !== 'null' && o.kind !== 'undefined'); return os.length === 1 ? resolve(os[0]) : null; } return r; }; // the record behind `T | null`
  const shapeKey = (s) => { const r = inner(s); return r && r.kind === 'record' ? JSON.stringify(Object.keys(r.fields).sort().map((f) => [f, (inner(r.fields[f].spec ?? r.fields[f]) ?? {}).kind ?? null])) : null; }; // structural: two records with the same fields and kinds are one shape, whatever their names, since the one may alias the other
  // a Set whose items are records, a Map whose keys or values are records (a record or `T | null`: the absent item, key or
  // value is one more letter of the slot's alphabet); a side that is no record (a Map's primitive keys or values) is drawn
  // by the seeded generator
  const absentOf = (s) => { const r = resolve(s); return r && r.kind === 'union' && r.options.some((o) => o.kind === 'null') ? null : undefined; };
  const side = (s) => (inner(s)?.kind === 'record' ? { of: s, nul: nullable(resolve(s)), none: absentOf(s) } : null);
  const collOf = (s) => { const r = resolve(s); if (r && r.kind === 'set' && side(r.of)) return { kind: 'set', key: side(r.of), value: null }; if (r && r.kind === 'map' && (side(r.key) || side(r.value))) return { kind: 'map', key: side(r.key), value: side(r.value), keySpec: r.key, valueSpec: r.value }; return null; };
  const sideSlot = (x) => x && { shape: shapeKey(x.of), nul: x.nul, none: x.none };
  const collSlot = (c) => ({ kind: c.kind, key: sideSlot(c.key), value: sideSlot(c.value), keySpec: c.keySpec, valueSpec: c.valueSpec });
  const visitColl = (c, d) => { for (const x of [c.key, c.value]) if (x) visit(x.of, d); };
  // the record shapes reachable from the parameters, each with its fields classified
  const shapes = new Map(); // key -> { spec, slots: [{name, kind: 'ref'|'list', shape, nullable}], prims: [name] }
  const visit = (s, d) => {
    if (d > DEPTH) return;
    const r = inner(s); if (!r) return;
    if (r.kind === 'record') {
      const key = shapeKey(s); if (shapes.has(key)) return;
      const entry = { spec: r, slots: [], prims: [] }; shapes.set(key, entry);
      for (const [name, f] of Object.entries(r.fields)) {
        const fs = f.spec ?? f; const fr = inner(fs);
        if (d + 1 > DEPTH) entry.prims.push(name); // past the depth the field is no pool slot (its shape is never enumerated): the seeded generator draws it, as a primitive field
        else if (fr && fr.kind === 'record') { entry.slots.push({ name, kind: 'ref', shape: shapeKey(fs), nullable: nullable(resolve(fs)) || !!f.optional }); visit(fs, d + 1); }
        else if (fr && fr.kind === 'array' && inner(fr.of) && inner(fr.of).kind === 'record') { entry.slots.push({ name, kind: 'list', shape: shapeKey(fr.of) }); visit(fr.of, d + 1); }
        else if (collOf(fs) && !f.optional && !nullable(resolve(fs))) { const c = collOf(fs); entry.slots.push({ name, ...collSlot(c) }); visitColl(c, d + 1); }
        else entry.prims.push(name);
      }
    } else if (r.kind === 'array') visit(r.of, d + 1);
  };
  const opaque = (s) => { const r = resolve(s); return !!r && (r.kind === 'opaque' || (r.kind === 'union' && r.options.some((o) => resolve(o)?.kind === 'opaque'))); }; // any or unknown, a shape its reads refined included
  const paramSlots = spec.params.map((p) => { const r = inner(p.spec); if (r && r.kind === 'record') { visit(p.spec, 0); return { kind: 'ref', shape: shapeKey(p.spec), nullable: nullable(resolve(p.spec)) }; } if (r && r.kind === 'array' && inner(r.of) && inner(r.of).kind === 'record') { visit(r.of, 1); return { kind: 'list', shape: shapeKey(r.of) }; } const c = collOf(p.spec); if (c) { visitColl(c, 1); return collSlot(c); } return null; });
  if (!paramSlots.some(Boolean)) return { builders: [], assignments: 0, shapes: {}, pool: k };
  const keys = [...shapes.keys()];
  // an any or unknown argument may be one of the pool's records too (SEMANTICS.md: aliasing counts): its own draw, or a
  // view of a pool object (fake.mjs view: the record's fields, a member it lacks a fake that may write it)
  spec.params.forEach((p, ai) => { if (!paramSlots[ai] && opaque(p.spec)) paramSlots[ai] = { kind: 'view' }; });
  // the dimensions of the odometer: one per argument slot and per pool-object slot; each names its owner (null for an
  // argument, [shape, index] for a pool object), its slot (`argN` or `heapN.field`: one per field of a shape, whatever
  // the object) and the pool objects each choice puts in it (targets), which the breadth-first prefix below follows
  const dims = []; // { choices, apply: (objs, args, c, env) => void, owner, slot, targets: (c) => [[shape, j]], nullAt }
  const NONE = -1; // the absent item, key or value of a nullable side, a letter of its alphabet
  const lists = (alpha = Array.from({ length: k }, (_, j) => j)) => { const out = [[]]; for (let L = 1; L <= k; L++) { const prev = out.filter((x) => x.length === L - 1); for (const p of prev) for (const j of alpha) out.push([...p, j]); } return out; }; // every tuple over the alphabet up to length k
  // a nullable side's alphabet places the absent letter second, so the slot's first three choices are [], [o0], [absent]
  const alphabet = (x) => (x.nul ? [0, NONE, ...Array.from({ length: k - 1 }, (_, j) => j + 1)] : Array.from({ length: k }, (_, j) => j));
  // a Set's items or a Map's keys: every sequence of distinct letters up to length k, in insertion order (a pooled key or
  // item is one object: two distinct letters are two keys); a Map's pooled values: every sequence of letters of the
  // entries' length (two keys may hold one object). A side the pool does not hold is drawn per entry position by a
  // generator seeded by the slot, so a structure draws the same keys and values on every build (generated keys distinct)
  const cell = (slot, at, path) => {
    const K = slot.key, V = slot.value, opts = [];
    const keySeqs = K ? lists(alphabet(K)).filter((xs) => new Set(xs).size === xs.length) : Array.from({ length: k + 1 }, (_, L) => Array(L).fill(null));
    for (const ks of keySeqs) for (const vs of V ? lists(alphabet(V)).filter((xs) => xs.length === ks.length) : [null]) opts.push({ ks, vs });
    const letter = (x, j, objs) => (j === NONE ? x.none : objs.get(x.shape)[j]);
    const targets = (c) => [...(K ? opts[c].ks.filter((j) => j !== NONE).map((j) => [K.shape, j]) : []), ...(V ? opts[c].vs.filter((j) => j !== NONE).map((j) => [V.shape, j]) : [])];
    const nullAt = opts.findIndex((o) => (K && o.ks.includes(NONE)) || (V && o.vs.includes(NONE)));
    return { choices: opts.length, targets, nullAt, make: (objs, c, env) => {
      const { ks, vs } = opts[c];
      if (slot.kind === 'set') return new Set(ks.map((j) => letter(K, j, objs)));
      const g = generator(seed * 7919 + at, defs, spec.literals ?? [], 0, spec.strings ?? [], spec.regexes ?? []);
      let keysOut = K ? ks.map((j) => letter(K, j, objs)) : [];
      if (!K) { const gk = generator(seed * 7919 + at + 1, defs, spec.literals ?? [], 0, spec.strings ?? [], spec.regexes ?? []); const got = []; for (let i = 0; i < ks.length; i++) for (let t = 0; t < 8; t++) { const x = gk.gen(slot.keySpec, 1, env, `${path}<k${i}>`); if (!got.some((y) => Object.is(y, x) || (x === 0 && y === 0))) { got.push(x); break; } } keysOut = got; } // a key drawn twice is drawn again, at most eight times: a Map holds distinct keys
      return new Map(keysOut.map((key, i) => [key, V ? letter(V, vs[i], objs) : g.gen(slot.valueSpec, 1, env, `${path}<v${i}>`)]));
    } };
  };
  const refDim = (nul, shape, owner, slotName, put) => { const opts = [...(nul ? [null] : []), ...Array.from({ length: k }, (_, j) => j)]; return { choices: opts.length, owner, slot: slotName, nullAt: -1, targets: (c) => (opts[c] === null ? [] : [[shape, opts[c]]]), apply: (objs, args, c) => put(objs, args, opts[c] === null ? null : objs.get(shape)[opts[c]]) }; };
  const listDim = (shape, owner, slotName, put) => { const opts = lists(); return { choices: opts.length, owner, slot: slotName, nullAt: -1, targets: (c) => opts[c].map((j) => [shape, j]), apply: (objs, args, c) => put(objs, args, opts[c].map((j) => objs.get(shape)[j])) }; };
  const cellDim = (slot, owner, slotName, path, put) => { const m = cell(slot, dims.length, path); return { choices: m.choices, owner, slot: slotName, nullAt: m.nullAt, targets: m.targets, apply: (objs, args, c, env) => put(objs, args, m.make(objs, c, env)) }; };
  paramSlots.forEach((ps, ai) => {
    if (!ps) return;
    const putArg = (objs, args, v) => { args[ai] = v; };
    if (ps.kind === 'view') { // a member the any value is read for, which the object holds only as an undeclared extra key, is left to the view (the object lacks it, as a record of its type may)
      const r = resolve(spec.params[ai].spec), members = new Set((r.kind === 'union' ? r.options : [r]).flatMap((o) => { const x = resolve(o); return x && x.kind === 'record' ? Object.keys(x.fields) : []; }));
      const opts = [null, ...keys.flatMap((key) => Array.from({ length: k }, (_, j) => [key, j]))];
      dims.push({ choices: opts.length, owner: null, slot: `arg${ai}`, nullAt: -1, targets: (c) => (opts[c] ? [opts[c]] : []), apply: (objs, args, c, env) => { if (!opts[c]) return; const [key, j] = opts[c], o = objs.get(key)[j]; for (const m of members) if (shapes.get(key).spec.fields[m]?.extra) delete o[m]; args[ai] = env ? env.view(`arg${ai}`, o) : o; } });
    }
    else if (ps.kind === 'ref') dims.push(refDim(ps.nullable, ps.shape, null, `arg${ai}`, putArg));
    else if (ps.kind === 'set' || ps.kind === 'map') dims.push(cellDim(ps, null, `arg${ai}`, `arg${ai}`, putArg));
    else dims.push(listDim(ps.shape, null, `arg${ai}`, putArg));
  });
  for (const key of keys) for (let o = 0; o < k; o++) for (const slot of shapes.get(key).slots) {
    const put = (objs, args, v) => { objs.get(key)[o][slot.name] = v; }, owner = [key, o], name = `heap${keys.indexOf(key)}.${slot.name}`;
    if (slot.kind === 'ref') dims.push(refDim(slot.nullable, slot.shape, owner, name, put));
    else if (slot.kind === 'set' || slot.kind === 'map') dims.push(cellDim(slot, owner, name, name, put));
    else dims.push(listDim(slot.shape, owner, name, put));
  }
  // primitive fields and every non-record argument: the seeded generator, drawn per (shape, field) with one seed per
  // shape, so every object of a shape carries the same values and two assignments with the same structure draw the
  // same picture; drawn afresh for every build, so no array, Map or Date is shared between two copies (a side's
  // mutation would otherwise reach the other side: measured on a push into a shared field)
  // a generated field's path names its shape by its index (heapN): the shape key is the record's field list, thousands of
  // characters on a wide record, and a fake's path past 400 characters is a budget stop
  const primsFor = (key, env) => { const g = generator(seed * 7 + keys.indexOf(key) * 97, defs, spec.literals ?? [], 0, spec.strings ?? [], spec.regexes ?? []); const vals = {}; for (const name of shapes.get(key).prims) vals[name] = g.gen(shapes.get(key).spec.fields[name].spec ?? shapes.get(key).spec.fields[name], 1, env, `heap${keys.indexOf(key)}.${name}`); return vals; };
  const build = (choice, env) => { // fresh objects for one assignment
    const objs = new Map(); for (const key of keys) objs.set(key, Array.from({ length: k }, () => primsFor(key, env)));
    const g = generator(seed * 1000003, defs, spec.literals ?? [], 0, spec.strings ?? [], spec.regexes ?? []);
    const args = spec.params.map((p, ai) => (paramSlots[ai] && paramSlots[ai].kind !== 'view' ? undefined : g.gen(p.spec, 0, env, `arg${ai}`)));
    dims.forEach((d, i) => d.apply(objs, args, choice[i], env));
    return args;
  };
  const total = dims.reduce((n, d) => n * d.choices, 1);
  const builders = []; const seen = new Set(); let assignments = 0; const perShape = {};
  const tried = new Set(); // the assignments the prefix already built, which the odometer then skips
  const visitOne = (choice) => {
    assignments++;
    const args = build(choice, null);
    const g = new Graph(); const pic = g.after(args, {}, null, false);
    const key = JSON.stringify({ roots: pic.roots, heap: pic.heap.map((h) => ({ kind: h.kind, edges: h.edges })) });
    if (!seen.has(key)) { seen.add(key); const c = choice.slice(); builders.push((env) => build(c, env)); for (const h of pic.heap) if (h.kind === 'record') perShape[Object.keys(h.edges).sort().join(',')] = (perShape[Object.keys(h.edges).sort().join(',')] ?? 0) + 1; }
  };
  const full = () => assignments >= maxAssignments || builders.length >= cap;
  // the breadth-first prefix: after the all-default assignment, every slot (one per argument, one per field of a shape)
  // takes a value that holds a pool object, on the shallowest pool object of its shape the arguments reach, with the
  // assignment that reaches that object (found breadth-first: the arguments' slots, then the slots of the objects they
  // reach, by the number of links); then every slot whose item, key or value admits null takes its first choice holding
  // the absent value. So with a argument slots and S fields that are slots over the reachable shapes, N of them nullable
  // sides, every slot is drawn within the first 1 + a + S + N inputs (an assignment whose heap an earlier input already
  // drew is no input: that earlier one drew the slot); then the odometer, the last slot fastest
  const vector = (P, i, c) => { const v = dims.map(() => 0); for (const [d, x] of P) v[d] = x; if (i >= 0) v[i] = c; return v; };
  const prefix = [vector(new Map(), -1, 0)], nulls = [], drawn = new Set(), nulled = new Set();
  const reach = new Map(), queue = []; const idOf = ([key, j]) => `${keys.indexOf(key)}#${j}`;
  const byOwner = new Map(); dims.forEach((d, i) => { const o = d.owner ? idOf(d.owner) : 'args'; if (!byOwner.has(o)) byOwner.set(o, []); byOwner.get(o).push(i); });
  const discover = (t, P) => { const id = idOf(t); if (!reach.has(id)) { reach.set(id, P); queue.push(id); } };
  const visitDims = (list, P) => {
    for (const i of list) { const d = dims[i];
      const at = Array.from({ length: d.choices }, (_, c) => c).find((c) => c > 0 && d.targets(c).length > 0);
      if (at !== undefined && !drawn.has(d.slot)) { drawn.add(d.slot); prefix.push(vector(P, i, at)); }
      if (d.nullAt > 0 && !nulled.has(d.slot)) { nulled.add(d.slot); nulls.push(vector(P, i, d.nullAt)); }
    }
    for (const i of list) for (const t of dims[i].targets(0)) discover(t, P); // a default link adds nothing to the assignment
    for (const i of list) for (let c = 1; c < dims[i].choices; c++) for (const t of dims[i].targets(c)) discover(t, new Map([...P, [i, c]]));
  };
  visitDims(byOwner.get('args') ?? [], new Map());
  while (queue.length) { const id = queue.shift(); visitDims(byOwner.get(id) ?? [], reach.get(id)); }
  for (const v of [...prefix, ...nulls]) { if (full()) break; const s = v.join(','); if (tried.has(s)) continue; tried.add(s); visitOne(v); }
  const choice = dims.map(() => 0);
  outer: for (;;) {
    if (full()) break;
    if (!tried.has(choice.join(','))) visitOne(choice);
    for (let i = dims.length - 1; i >= 0; i--) { choice[i]++; if (choice[i] < dims[i].choices) continue outer; choice[i] = 0; }
    break;
  }
  return { builders, assignments, space: total, shapes: Object.fromEntries(keys.map((key) => [key, { slots: shapes.get(key).slots.length, prims: shapes.get(key).prims.length }])), distinct: builders.length, pool: k };
}
