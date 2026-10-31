// Lane B, heap layer stage 2: Korat-style enumeration of small heaps (research brief 13 §28).
//
// The random generator draws values; it rarely draws STRUCTURE: two arguments that are one object, a record whose field
// points back at it, a list holding the same record twice. This enumerator finitizes the structure of a unit's record
// shapes and walks every assignment: a pool of k objects per record shape (the shape key is the one aliasInputs groups
// by); every reference-typed field of every pool object, and every argument of record shape, ranges over the pool
// (and null where the field admits null); an array of records ranges over the lengths 0..k with elements from the
// pool, a Set of records and a Map keyed by records over the sequences of distinct pool objects up to k (their items and
// keys in insertion order; a Map's values drawn by the seeded generator), so an item or a key may be the very object an
// argument holds: they compare by identity (SameValueZero), and a fresh record would never be one. Primitive fields take the seeded generator's values once per pool object, so only the structure varies. Each
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
  // a Set of records or a Map keyed by records (exactly a record: an item or key that may be absent is drawn as before)
  const collOf = (s) => { const r = resolve(s); if (r && r.kind === 'set' && resolve(r.of)?.kind === 'record') return { kind: 'set', of: r.of, value: null }; if (r && r.kind === 'map' && resolve(r.key)?.kind === 'record') return { kind: 'map', of: r.key, value: r.value }; return null; };
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
        else if (collOf(fs) && !f.optional && !nullable(resolve(fs))) { const c = collOf(fs); entry.slots.push({ name, kind: c.kind, shape: shapeKey(c.of), value: c.value }); visit(c.of, d + 1); }
        else entry.prims.push(name);
      }
    } else if (r.kind === 'array') visit(r.of, d + 1);
  };
  const opaque = (s) => { const r = resolve(s); return !!r && (r.kind === 'opaque' || (r.kind === 'union' && r.options.some((o) => resolve(o)?.kind === 'opaque'))); }; // any or unknown, a shape its reads refined included
  const paramSlots = spec.params.map((p) => { const r = inner(p.spec); if (r && r.kind === 'record') { visit(p.spec, 0); return { kind: 'ref', shape: shapeKey(p.spec), nullable: nullable(resolve(p.spec)) }; } if (r && r.kind === 'array' && inner(r.of) && inner(r.of).kind === 'record') { visit(r.of, 1); return { kind: 'list', shape: shapeKey(r.of) }; } const c = collOf(p.spec); if (c) { visit(c.of, 1); return { kind: c.kind, shape: shapeKey(c.of), value: c.value }; } return null; });
  if (!paramSlots.some(Boolean)) return { builders: [], assignments: 0, shapes: {}, pool: k };
  const keys = [...shapes.keys()];
  // an any or unknown argument may be one of the pool's records too (SEMANTICS.md: aliasing counts): its own draw, or a
  // view of a pool object (fake.mjs view: the record's fields, a member it lacks a fake that may write it)
  spec.params.forEach((p, ai) => { if (!paramSlots[ai] && opaque(p.spec)) paramSlots[ai] = { kind: 'view' }; });
  // the dimensions of the odometer: one per argument slot and per pool-object slot
  const dims = []; // { set: (objs, args, choice) => void, choices: n, shape }
  // a Set's items or a Map's keys: every sequence of distinct pool indices up to length k, in insertion order; a Map's
  // values drawn per entry position by a generator seeded by the slot, so a structure draws the same values on every build
  const distinct = () => lists().filter((xs) => new Set(xs).size === xs.length);
  const cell = (slot, at, path) => { const opts = distinct(); return { choices: opts.length, make: (objs, c, env) => { const items = opts[c].map((j) => objs.get(slot.shape)[j]); if (slot.kind === 'set') return new Set(items); const g = generator(seed * 7919 + at, defs, spec.literals ?? [], 0, spec.strings ?? [], spec.regexes ?? []); return new Map(items.map((o, i) => [o, g.gen(slot.value, 1, env, `${path}<v${i}>`)])); } }; };
  const lists = (shape) => { const out = [[]]; for (let L = 1; L <= k; L++) { const prev = out.filter((x) => x.length === L - 1); for (const p of prev) for (let j = 0; j < k; j++) out.push([...p, j]); } return out; }; // every tuple of pool indices up to length k
  paramSlots.forEach((ps, ai) => {
    if (!ps) return;
    if (ps.kind === 'view') { // a member the any value is read for, which the object holds only as an undeclared extra key, is left to the view (the object lacks it, as a record of its type may)
      const r = resolve(spec.params[ai].spec), members = new Set((r.kind === 'union' ? r.options : [r]).flatMap((o) => { const x = resolve(o); return x && x.kind === 'record' ? Object.keys(x.fields) : []; }));
      const opts = [null, ...keys.flatMap((key) => Array.from({ length: k }, (_, j) => [key, j]))];
      dims.push({ choices: opts.length, apply: (objs, args, c, env) => { if (!opts[c]) return; const [key, j] = opts[c], o = objs.get(key)[j]; for (const m of members) if (shapes.get(key).spec.fields[m]?.extra) delete o[m]; args[ai] = env ? env.view(`arg${ai}`, o) : o; } });
    }
    else if (ps.kind === 'ref') { const opts = [...(ps.nullable ? [null] : []), ...Array.from({ length: k }, (_, j) => j)]; dims.push({ choices: opts.length, apply: (objs, args, c) => { args[ai] = opts[c] === null ? null : objs.get(ps.shape)[opts[c]]; } }); }
    else if (ps.kind === 'set' || ps.kind === 'map') { const m = cell(ps, dims.length, `arg${ai}`); dims.push({ choices: m.choices, apply: (objs, args, c, env) => { args[ai] = m.make(objs, c, env); } }); }
    else { const opts = lists(ps.shape); dims.push({ choices: opts.length, apply: (objs, args, c) => { args[ai] = opts[c].map((j) => objs.get(ps.shape)[j]); } }); }
  });
  for (const key of keys) for (let o = 0; o < k; o++) for (const slot of shapes.get(key).slots) {
    if (slot.kind === 'ref') { const opts = [...(slot.nullable ? [null] : []), ...Array.from({ length: k }, (_, j) => j)]; dims.push({ choices: opts.length, apply: (objs, args, c) => { objs.get(key)[o][slot.name] = opts[c] === null ? null : objs.get(slot.shape)[opts[c]]; } }); }
    else if (slot.kind === 'set' || slot.kind === 'map') { const m = cell(slot, dims.length, `heap${keys.indexOf(key)}.${slot.name}`); dims.push({ choices: m.choices, apply: (objs, args, c, env) => { objs.get(key)[o][slot.name] = m.make(objs, c, env); } }); }
    else { const opts = lists(slot.shape); dims.push({ choices: opts.length, apply: (objs, args, c) => { objs.get(key)[o][slot.name] = opts[c].map((j) => objs.get(slot.shape)[j]); } }); }
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
  const choice = dims.map(() => 0);
  outer: for (;;) {
    if (assignments >= maxAssignments || builders.length >= cap) break;
    assignments++;
    const args = build(choice, null);
    const g = new Graph(); const pic = g.after(args, {}, null, false);
    const key = JSON.stringify({ roots: pic.roots, heap: pic.heap.map((h) => ({ kind: h.kind, edges: h.edges })) });
    if (!seen.has(key)) { seen.add(key); const c = choice.slice(); builders.push((env) => build(c, env)); for (const h of pic.heap) if (h.kind === 'record') perShape[Object.keys(h.edges).sort().join(',')] = (perShape[Object.keys(h.edges).sort().join(',')] ?? 0) + 1; }
    for (let i = dims.length - 1; i >= 0; i--) { choice[i]++; if (choice[i] < dims[i].choices) continue outer; choice[i] = 0; }
    break;
  }
  return { builders, assignments, space: total, shapes: Object.fromEntries(keys.map((key) => [key, { slots: shapes.get(key).slots.length, prims: shapes.get(key).prims.length }])), distinct: builders.length, pool: k };
}
