// Lane B representation generators (design/lane-b-reach.md): runtime forms a declared type admits and does not name.
// A TypeScript type says which members a value has, never how they are held: a value typed `{ x: number }` may carry
// more own keys, hold `x` on its prototype, behind a getter or as a non-enumerable property, have no prototype at all;
// an array may have holes and own keys beside its indices; a value of an unread type may convert itself with
// valueOf, toString or Symbol.toPrimitive; a value that is awaited may be a thenable and not a Promise. Two versions of
// a unit that agree on every plain value can disagree on these forms (a spread against fields copied one by one, `in`
// against Object.hasOwn, forEach against an index loop), so lane B draws them on inputs of their own.
//
// A representation input keeps every value the declared draw made (its streams are not touched): the families only
// add structure around those values, except the three that replace a leaf (a string key, an unread value, an input
// promise), whose replacement holds the same value where one exists. Each family is on its own switch: LEAN_REACH
// unset or `all` is every family, `none` turns the tier off, `a,b` names the families on, `-a,-b` the families off.
// The generated inputs of the tier are every REACH-th one from the second period on (gen.mjs reachTurn); of their
// turns every third holds every family the unit's spec admits (applicableFamilies) at once, and the others one family
// alone, cycling through them in the order below, so a family that another one masks still meets the unit by itself.
// A minimised witness (minimizeWitness below) names the fewest families it needs.
import path from 'node:path';
import { makeRng } from './fake.mjs';

export const FAMILIES = [
  { name: 'extra-key', on: 'record', why: 'an own key the type does not declare: a spread, Object.assign, Object.keys, for-in and JSON.stringify carry it, fields copied one by one drop it' },
  { name: 'inherited-key', on: 'record, dictionary', why: 'a key held on the prototype (an optional field left off the object itself): a read and `in` see it, Object.hasOwn, Object.keys, a spread and JSON.stringify do not' },
  { name: 'accessor-key', on: 'record, dictionary', why: 'a field held by a getter with no setter: a read sees its value, a write to it throws a TypeError in strict code, a descriptor copy keeps the getter' },
  { name: 'non-enumerable-key', on: 'record, dictionary', why: 'a field that is not enumerable: a read sees it, a spread, Object.assign, Object.keys, for-in and JSON.stringify skip it' },
  { name: 'symbol-key', on: 'record', why: 'an own symbol key: a spread and Object.assign copy it, Object.keys, for-in and JSON.stringify skip it' },
  { name: 'null-prototype', on: 'record, dictionary', why: 'an object with no prototype: `x.hasOwnProperty(k)`, `String(x)` and a template literal throw, `instanceof Object` is false, `k in x` sees own keys only' },
  { name: 'proto-name-key', on: 'dictionary, a string parameter', why: 'a key that names an Object.prototype member (constructor, toString, __proto__): `k in d` and `d[k]` read the prototype where Object.hasOwn and a Map do not; `o[k] = v` with `__proto__` sets the prototype' },
  { name: 'sparse-array', on: 'array', why: 'an array with a hole: forEach, map, filter and for-in skip it, an index loop and for-of read undefined there, its length counts it' },
  { name: 'array-extra-property', on: 'array', why: 'an own key beside the indices: for-in, Object.keys, Object.assign and a spread into an object carry it, for-of, map and forEach do not' },
  { name: 'shared-reference', on: 'arguments', why: 'every position of one shape holds one object, and a record links to every object of the shapes its fields name (cycles across arguments): a write through one name is seen through the other' },
  { name: 'coercion-hooks', on: 'a value of an unread type (any, unknown, a bare type parameter)', why: 'an object with valueOf and toString, or with Symbol.toPrimitive: `x + ""`, `${x}`, String(x), `+x` and `==` each take a different hint' },
  { name: 'thenable', on: 'an input promise', why: 'an object with `then` and no `catch` or `finally`, settling to the same value: await and Promise.resolve accept it, `instanceof Promise` is false, `.catch` throws, and it settles two microtasks later than a promise' },
  { name: 'settlement-order', on: 'input promises', why: 'the caller decides when its promises settle: they stay pending when the call starts and settle after the unit first waits on one, one per macrotask, in an order the turn picks among every order of up to four (the declared draw settles them at once, in position order); `Promise.race`, a first-come loop and work done between two awaits see the order' },
  { name: 'timer-order', on: 'timers armed for one instant', why: 'the timers due at one instant fire in another order the event loop allows: a timer may run before an earlier-armed one of another kind (an immediate before a timeout); two timeouts or intervals keep their arm order, which Node guarantees for equal delays and lean cannot tell apart (run.mjs runTimers, legal)' },
];
const NAMES = FAMILIES.map((f) => f.name);

// the families switched on, from LEAN_REACH (read at each draw, so a minimisation can narrow them per run)
export function familiesOn(text = process.env.LEAN_REACH) {
  if (text === undefined || text === '' || text === 'all') return NAMES.slice();
  if (text === 'none') return [];
  const parts = text.split(',').map((x) => x.trim()).filter(Boolean);
  for (const p of parts) if (!NAMES.includes(p.replace(/^-/, ''))) throw new Error(`LEAN_REACH: unknown family ${p.replace(/^-/, '')} (${NAMES.join(', ')})`);
  if (parts.every((p) => p.startsWith('-'))) { const off = new Set(parts.map((p) => p.slice(1))); return NAMES.filter((n) => !off.has(n)); }
  return NAMES.filter((n) => parts.includes(n));
}
// the families of turn j of the tier, among `on` (switched on and admitted by the spec): every one at once on every
// third turn, else one alone, cycling
export function familiesAt(j, on = familiesOn()) {
  if (!on.length) return [];
  return j % 3 === 0 ? on.slice() : [on[(j - 1 - Math.floor(j / 3)) % on.length]];
}
// the families a spec admits: a family whose kind of value the unit's inputs never hold would leave its turn a plain draw
export function applicableFamilies(spec) {
  const kinds = new Set(); let objects = 0; const seen = new Set();
  const visit = (x, top = false, d = 0) => {
    if (!x || typeof x !== 'object' || d > 30 || seen.has(x)) return; seen.add(x);
    if (x.kind === 'ref') return visit(spec.defs?.[x.key], top, d + 1);
    if (['record', 'dict', 'array', 'tuple'].includes(x.kind)) objects++;
    if (x.kind === 'string' && top) kinds.add('key-string');
    kinds.add(x.kind);
    for (const o of x.options ?? []) visit(o, top, d + 1);
    for (const it of x.items ?? []) visit(it, false, d + 1);
    if (x.fields) for (const f of Object.values(x.fields)) visit(f.spec, false, d + 1);
    for (const k of ['of', 'value']) if (x[k]) visit(x[k], false, d + 1);
  };
  for (const p of spec.params ?? []) visit(p.spec, true);
  const out = new Set();
  if (kinds.has('record')) for (const f of ['extra-key', 'inherited-key', 'accessor-key', 'non-enumerable-key', 'symbol-key', 'null-prototype']) out.add(f);
  if (kinds.has('dict')) for (const f of ['inherited-key', 'accessor-key', 'non-enumerable-key', 'null-prototype', 'proto-name-key']) out.add(f);
  if (kinds.has('key-string')) out.add('proto-name-key');
  if (kinds.has('array')) { out.add('sparse-array'); out.add('array-extra-property'); }
  if (objects >= 2) out.add('shared-reference');
  if (kinds.has('opaque') || kinds.has('tparam')) out.add('coercion-hooks');
  if (kinds.has('promise')) { out.add('thenable'); out.add('settlement-order'); }
  if (spec.timers) out.add('timer-order');
  return NAMES.filter((n) => out.has(n));
}

export const PROTO_NAMES = ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf'];
const EXTRA = Symbol.for('lean.reach.extra');
const plainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && !v.__isFake && typeof v.then !== 'function' && !(v instanceof Date) && !(v instanceof Map) && !(v instanceof Set) && !(v instanceof RegExp) && !(v instanceof Error) && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
// a copy of an object's own properties (descriptors, symbols included) onto a fresh object of the given prototype
const rebase = (v, proto) => Object.defineProperties(Object.create(proto), Object.getOwnPropertyDescriptors(v));

// the reshaper of one representation input: `families` the switched-on families of this turn, `rng` its own stream
export function reshaper(families, seed, extraNames = []) {
  const on = new Set(families);
  const rng = makeRng((seed ^ 0x7f4a7c15) >>> 0);
  const pick = (xs) => xs[Math.floor(rng() * xs.length)];
  const applied = new Set();
  const mark = (name) => { applied.add(name); };
  // a name the unit mentions and the record does not declare, else a generic one
  const extraName = (declared) => extraNames.find((k) => /^[A-Za-z_$][\w$]*$/.test(k) && !declared.includes(k) && !PROTO_NAMES.includes(k)) ?? 'extra';
  function record(v, spec) {
    if (!plainObject(v)) return v;
    const declared = Object.keys(spec.fields ?? {});
    const present = declared.filter((k) => Object.hasOwn(v, k) && !spec.fields[k].extra);
    let o = v;
    if (on.has('extra-key')) { const k = extraName(declared); if (!Object.hasOwn(o, k)) { o[k] = 'extra'; mark('extra-key'); } }
    if (on.has('symbol-key')) { o[EXTRA] = 'extra'; mark('symbol-key'); }
    const fields = present.slice();
    if (on.has('accessor-key') && fields.length) { const k = fields.splice(Math.floor(rng() * fields.length), 1)[0]; const x = o[k]; Object.defineProperty(o, k, { get: () => x, enumerable: true, configurable: true }); mark('accessor-key'); }
    if (on.has('non-enumerable-key') && fields.length) { const k = fields.splice(Math.floor(rng() * fields.length), 1)[0]; Object.defineProperty(o, k, { value: o[k], enumerable: false, writable: true, configurable: true }); mark('non-enumerable-key'); }
    // the prototype: none, or one holding a key; with both families on, the stream picks one per object
    const wantNull = on.has('null-prototype'), wantInherit = on.has('inherited-key');
    const mode = wantNull && wantInherit ? (rng() < 0.5 ? 'null' : 'inherit') : wantNull ? 'null' : wantInherit ? 'inherit' : null;
    if (mode === 'null') { o = rebase(o, null); mark('null-prototype'); }
    if (mode === 'inherit') {
      const absent = declared.filter((k) => spec.fields[k].optional && !Object.hasOwn(o, k) && !spec.fields[k].extra);
      const own = fields.length ? fields : present;
      let proto;
      if (absent.length) { const k = pick(absent); proto = { [k]: leafLike(spec.fields[k].spec) }; } // an optional field left off: the prototype holds it
      else if (own.length) { const k = pick(own); proto = { [k]: o[k] }; const d = Object.getOwnPropertyDescriptor(o, k); if (d && d.configurable) delete o[k]; } // a declared field moved to the prototype: a read still sees its value
      else proto = { [extraName(declared)]: 'inherited' };
      o = rebase(o, proto); mark('inherited-key');
    }
    return o;
  }
  function dict(v) {
    if (!plainObject(v)) return v;
    let o = v;
    const keys = Object.keys(o);
    if (on.has('proto-name-key') && keys.length) { const k = pick(PROTO_NAMES.filter((x) => x !== '__proto__')); Object.defineProperty(o, k, { value: o[keys[0]], enumerable: true, writable: true, configurable: true }); mark('proto-name-key'); } // an own entry under a prototype name, holding a value of the entry type
    const entries = Object.keys(o).filter((k) => !PROTO_NAMES.includes(k));
    if (on.has('accessor-key') && entries.length) { const k = pick(entries); const x = o[k]; Object.defineProperty(o, k, { get: () => x, enumerable: true, configurable: true }); mark('accessor-key'); }
    if (on.has('non-enumerable-key') && entries.length > 1) { const k = entries[entries.length - 1]; Object.defineProperty(o, k, { value: o[k], enumerable: false, writable: true, configurable: true }); mark('non-enumerable-key'); }
    const mode = on.has('null-prototype') && on.has('inherited-key') ? (rng() < 0.5 ? 'null' : 'inherit') : on.has('null-prototype') ? 'null' : on.has('inherited-key') ? 'inherit' : null;
    if (mode === 'null') { o = rebase(o, null); mark('null-prototype'); }
    if (mode === 'inherit' && entries.length) { const k = entries[0]; const x = o[k]; delete o[k]; o = rebase(o, { [k]: x }); mark('inherited-key'); }
    return o;
  }
  function array(v) {
    if (!Array.isArray(v)) return v;
    if (on.has('sparse-array')) { if (v.length) delete v[Math.floor(rng() * v.length)]; else v.length = 1; mark('sparse-array'); }
    if (on.has('array-extra-property')) { v.extra = 'extra'; mark('array-extra-property'); }
    return v;
  }
  // a value of an unread type: an object that converts itself, two forms turning with the stream
  function coercible() {
    mark('coercion-hooks');
    if (rng() < 0.5) return { valueOf() { return 7; }, toString() { return 'seven'; } };
    return { [Symbol.toPrimitive](hint) { return hint === 'number' ? 7 : hint === 'string' ? 'seven' : 'default'; } };
  }
  // an input promise as a thenable settling to the same value (resolved through the host's own promise, so a rejection
  // the input carries stays a rejection)
  function thenable(value) { mark('thenable'); return { then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } }; }
  function keyString(s) { if (typeof s !== 'string') return s; mark('proto-name-key'); return pick(PROTO_NAMES); }
  // an input promise the caller settles later: a promise (instanceof Promise holds) that stays pending until the unit
  // first subscribes to one of this input's held promises; then every held promise settles, one per host macrotask, in
  // the order `order` (an index into every order of the held promises, up to four of them; beyond four the reverse)
  const held = []; let started = false;
  function settleLater(value, order) {
    mark('settlement-order');
    let res; const entry = { value, settle: () => res(value) };
    class Held extends Promise { then(a, b) { start(order); return super.then(a, b); } }
    const p = new Held((r) => { res = r; }); held.push(entry);
    return p;
  }
  function start(order) {
    if (started) return; started = true;
    const k = held.length, perms = k <= 4 ? permutations(k) : [Array.from({ length: k }, (_, i) => k - 1 - i)];
    const seq = perms[order % perms.length];
    let i = 0; const next = () => { if (i >= seq.length) return; held[seq[i++]].settle(); setImmediate(next); };
    setImmediate(next);
  }
  return { on, record, dict, array, coercible, thenable, keyString, settleLater, applied };
}
// every order of k items, the identity last (the declared draw's own order)
function permutations(k) {
  const out = []; const go = (pre, rest) => { if (!rest.length) { out.push(pre); return; } rest.forEach((x, i) => go([...pre, x], rest.filter((_, j) => j !== i))); };
  go([], Array.from({ length: k }, (_, i) => i));
  return out.length > 1 ? [...out.slice(1), out[0]] : out;
}
// a value standing for a field the prototype holds: the type's own kind of value, so a read through the prototype is
// still a value of the declared type
function leafLike(spec) {
  const s = spec && spec.kind === 'union' ? (spec.options.find((o) => o && !['undefined', 'null'].includes(o.kind)) ?? spec.options[0]) : spec;
  switch (s?.kind) {
    case 'number': return 7;
    case 'boolean': return true;
    case 'literal': return s.values[0];
    case 'array': return [];
    case 'record': case 'dict': return {};
    case 'null': return null;
    case 'undefined': return undefined;
    default: return 'inherited';
  }
}

// ---- minimisation: the fewest families a witness on one input still needs -------------------------------------
// A witness found on a representation input carries every family of its turn. The minimiser re-runs lane B on that
// input with one family switched off at a time (LEAN_REACH), keeping a removal while the input still witnesses, within
// its own budget of runs (Hypothesis's rule: shrink the generating decisions, keep a step only when the same
// difference reproduces). `run(families)` answers whether input `input` still witnesses with those families on.
export async function minimizeFamilies(start, run, budget = 16) {
  let cur = start.slice(), runs = 0;
  for (let changed = true; changed && runs < budget;) {
    changed = false;
    for (const f of cur.slice()) {
      if (runs >= budget) break;
      const next = cur.filter((x) => x !== f);
      runs++;
      if (await run(next)) { cur = next; changed = true; }
    }
  }
  return { families: cur, runs, complete: runs < budget };
}

// a witness on input `input` of a pair, re-run with fewer families: lane B runs inputs 0..input (runPair, n = input + 1)
// with LEAN_REACH naming the families kept; the input still witnesses when one of the run's witnesses is that input
export async function minimizeWitness({ parent, candidate, unit, input, project = true, budget = 16, seed = 1 }) {
  const { runPair, inputPlan } = await import('./run.mjs');
  const { reachTurn } = await import('./gen.mjs');
  const t0 = Date.now();
  const plan = inputPlan(parent, candidate, unit, { project, seed });
  const j = reachTurn(plan.spec, input);
  if (j === null) return { input, reach: false, why: 'not a representation input: the witness needs no family' };
  const start = familiesAt(j, familiesOn().filter((f) => applicableFamilies(plan.spec).includes(f)));
  const saved = process.env.LEAN_REACH;
  const run = async (fams) => { process.env.LEAN_REACH = fams.length ? fams.join(',') : 'none'; const r = await runPair({ parent, candidate, unit, n: input + 1, seed, project }); return r.verdict === 'WITNESS' && (r.witnesses ?? []).some((w) => w.input === input); };
  try {
    if (!(await run(start))) return { input, reach: true, before: start, reproduced: false, seconds: (Date.now() - t0) / 1000 };
    const m = await minimizeFamilies(start, run, budget);
    return { input, reach: true, before: start, after: m.families, runs: m.runs + 1, complete: m.complete, seconds: (Date.now() - t0) / 1000 };
  } finally { if (saved === undefined) delete process.env.LEAN_REACH; else process.env.LEAN_REACH = saved; }
}

// CLI: node repr.mjs --list | --minimize --parent p.ts --candidate c.ts --unit u --input i [--no-project] [--budget 16]
// --minimize prints { input, before, after, runs, complete, seconds }: the families of the input's turn and the fewest
// that still give a witness on that input
// the CLI runs after this module has loaded (no top-level await): run.mjs, which minimisation loads, imports this module
if (process.argv[1] && new URL(import.meta.url).pathname === path.resolve(process.argv[1])) (async () => {
  const a = process.argv.slice(2); const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  if (a.includes('--list')) { for (const f of FAMILIES) console.log(`${f.name} (${f.on}): ${f.why}`); process.exit(0); }
  if (a.includes('--minimize')) {
    const res = await minimizeWitness({ parent: opt('--parent'), candidate: opt('--candidate'), unit: opt('--unit'), input: Number(opt('--input')), project: a.includes('--no-project') ? false : true, budget: Number(opt('--budget', 16)) });
    console.log(JSON.stringify(res));
    process.exit(0);
  }
  console.log('usage: node repr.mjs --list | --minimize --parent p.ts --candidate c.ts --unit u --input i [--no-project] [--budget 16]');
  process.exit(2);
})().catch((e) => { console.log(JSON.stringify({ error: String(e && e.message || e).slice(0, 300) })); process.exit(1); });
