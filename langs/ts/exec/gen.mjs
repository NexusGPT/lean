// Lane B input generation from a spec (spec.mjs), seeded. Boundary values come first, then random ones.
import { makeRng, namePromise } from './fake.mjs';
import { sampleRegex } from './regex-sample.mjs';
import { reshaper, familiesOn, familiesAt, applicableFamilies } from './repr.mjs';
import { fits } from './spec.mjs';

const STR_EDGE = ['', 'a', 'abc', ' ', 'x y', '0', '-1', 'ÄÖü', '日本', 'a'.repeat(64), 'twelve-chars', 'Hello, World! 2024-01-31 10:30', 'abcdefghijklmnopqrstuvwxyz'.repeat(8), 'line one\nline two', 'null', 'undefined', '  padded  ', 'a,b,c', '/path/to/file.txt', 'user@example.com'];
const NUM_EDGE = [0, 1, -1, 2, 10, 100, -100, 0.5, 1e9, Number.MAX_SAFE_INTEGER];

// the walk: the generated inputs of a shaped spec (spec.mjs) that take its boundaries in order, every combination of
// them once. Its length is the product of the boundary sizes (the largest radix times its own size), never more than
// WALK inputs, half of the 60 the concept bench runs per mutant; after it every input is a free draw. The cap is a
// constant, so input i is the same whatever the number of inputs a run asks for (a replay that knows the seed draws it)
export const WALK = 30;
const walkLengths = new WeakMap();
export function walkLength(spec) {
  if (!spec || typeof spec !== 'object') return 0;
  if (walkLengths.has(spec)) return walkLengths.get(spec);
  let product = 1; const seen = new Set();
  const visit = (x, d = 0) => {
    if (!x || typeof x !== 'object' || d > 60 || seen.has(x)) return; seen.add(x);
    if (Array.isArray(x)) { x.forEach((y) => visit(y, d + 1)); return; }
    for (const key of ['boundary', 'lengths']) { const b = x[key]; if (b && Array.isArray(b.cmp) && b.cmp.length) product = Math.max(product, (b.radix ?? 1) * b.cmp.length); }
    for (const v of Object.values(x)) visit(v, d + 1);
  };
  visit([spec.params, spec.receiver, spec.defs]);
  const n = Math.min(product, WALK);
  walkLengths.set(spec, n);
  return n;
}
// the known phase: a spec whose parameters or record fields carry listed values (spec.mjs, the project's values file)
// draws them on its first generated inputs, before the walk. Input k of the phase gives every listed leaf its value
// k (each list cycles on its own), and the walk's digit k divided by the longest list, so every listed value meets every
// combination of the compared boundaries; the phase lasts the longest list times the walk length (at least one), never
// more than KNOWN inputs. After it, the walk and the free draws run as they would without the file. A spec without
// listed values has no phase, so its inputs are the ones it always drew
export const KNOWN = 30;
const knownWidths = new WeakMap();
export function knownWidth(spec) { // the longest list of listed values
  if (!spec || typeof spec !== 'object') return 0;
  if (knownWidths.has(spec)) return knownWidths.get(spec);
  let w = 0; const seen = new Set();
  const visit = (x, d = 0) => {
    if (!x || typeof x !== 'object' || d > 60 || seen.has(x)) return; seen.add(x);
    if (Array.isArray(x)) { x.forEach((y) => visit(y, d + 1)); return; }
    if (x.known && Array.isArray(x.known)) w = Math.max(w, x.known.length);
    for (const [k, v] of Object.entries(x)) if (k !== 'known') visit(v, d + 1);
  };
  visit([spec.params, spec.defs]);
  knownWidths.set(spec, w);
  return w;
}
export function knownLength(spec) { const w = knownWidth(spec); return w ? Math.min(w * Math.max(1, spec.shaped ? walkLength(spec) : 0), KNOWN) : 0; }
// whether generated input i of a spec is in its known phase (the inputs before `walkFrom` are enumerated heaps)
export const knownInput = (spec, i) => { const g = i - (spec.walkFrom ?? 0); return g >= 0 && g < knownLength(spec); };
// NaN and the two infinities are numbers (ECMA-262 6.1.6.1): a declared number admits them, and lane A's finite model
// leaves them out, so lane B draws them. Every SPECIAL-th generated input is a special-number input (the first one
// after the inputs that lean on 0, 1 and -1): in it the first number leaf, walked or drawn, is replaced by a special
// value, and every later one too (one time in two in every other special-number input), NaN, then Infinity, then
// -Infinity, turning from one special-number input to the next; the decisions use a stream of their own, so every
// other value of every input is the one drawn before. Negative zero is the fourth special value (6.1.6.1: a number
// of its own, told from zero by Object.is and by a division, design/signed-zero.md): the fourth special-number input
// (generated input 15) and every fourth after it start from it.
// INVARIANT (special slots). In an even special-number input (turns 0, 2, 4, ...) the value of a number leaf depends
// only on the turn and on its SLOT, the leaf's declared place with array and set indices erased (`in[3].k` and `in[0].k`
// are one slot): the n-th distinct slot met takes NUM_SPECIAL[(turn + n) % 4], never a value counted over the leaves
// drawn before it. So (1) siblings of one array hold the same special value at the same field, and a comparator over
// them reaches its later keys (NaN - NaN, Infinity - Infinity and -0 - -0 all tie); (2) every array of such an input
// holds two elements or more (a shorter draw is extended, its draw made first); (3) a slot that admits a number and an
// absent option (null or undefined in a union) alternates the two along its siblings, the absent one first on turns
// 0, 4, 8, ... and second on turns 2, 6, ..., so the absent value and the special one meet side by side in both orders:
// the two values a default (`x ?? Infinity`, `x ?? 0`) or a nulls-last comparator tells apart. Before it, a leaf's
// value was counted over every number leaf drawn before it in the input, so one more special value (merge 3d1bb1f2,
// -0) or one more leaf moved every later value, and a class of input that separated a unit could vanish
// (special_numbers order, lost at 3d1bb1f2). Odd special-number inputs keep that count, so siblings holding two
// different specials (Infinity beside -Infinity) and a special beside a finite value stay reached
export const SPECIAL = 4;
const NUM_SPECIAL = [NaN, Infinity, -Infinity, -0];
// whether a spec admits a number of any value: a number, or a union with a number option (a literal type does not)
const admitsNumber = (spec) => !!spec && (spec.kind === 'number' || (spec.kind === 'union' && spec.options.some((o) => o && o.kind === 'number')));
// the representation tier (repr.mjs): every REACH-th generated input from the second period on, outside the known phase,
// is turn j of the tier, whose families reshape the values the declared draw made (records, dictionaries, arrays, input
// promises, values of an unread type, string parameters); the two turns before it in each period are the plain draw and
// the special-number input stays the last one, so the inputs that lean on 0, 1 and -1 and the first walk keep their place
export const REACH = 4;
export function reachTurn(spec, i) {
  const g = i - (spec.walkFrom ?? 0);
  if (g < REACH + 1 || g % REACH !== 1 || knownInput(spec, i)) return null;
  return (g - REACH - 1) / REACH;
}
// the changed-path tier (spec.mjs changedTargets): for a unit whose two versions differ in a comparison or a condition,
// the generated input two after each period start (outside the known phase) is turn t of the tier: every target leaf
// takes value t of its list (a constant of a changed comparison and its neighbours, cycling), or a copy of the other
// parameter path it is compared with, plus 0, 1 or -1; a `.length` target cuts or extends its string or array to that
// length. Every other leaf keeps its declared draw
export function changedTurn(spec, i) {
  if (!spec.changed || !spec.changed.length || process.env.LEAN_CHANGED === 'off') return null; // LEAN_CHANGED=off switches the tier off
  const g = i - (spec.walkFrom ?? 0);
  if (g < 2 || g % REACH !== 2 || knownInput(spec, i)) return null;
  return (g - 2) / REACH;
}
// the full-world tier (fake.mjs enterWorld, design/world-reach.md): every WORLD-th generated input from the WORLD/2-th on,
// outside the known phase, is turn w of the tier, an input whose world answers every read with a handle (no dead value
// along a chain of reads), holds the caller's key in a field of that name, and reads a handle as a list of 1, 2 or 3
// elements by turn. The parameters are drawn as on every other input; LEAN_WORLD=off switches the tier off
export const WORLD = 8;
export function worldTurn(spec, i) {
  if (process.env.LEAN_WORLD === 'off') return null;
  const g = i - (spec.walkFrom ?? 0);
  if (g < WORLD / 2 || g % WORLD !== WORLD / 2 || knownInput(spec, i)) return null;
  return (g - WORLD / 2) / WORLD;
}
const isUndefTag = (v) => !!v && typeof v === 'object' && v.t === 'undefined';
function reachChanged(args, targets, t, defs = {}) {
  const locate = (at) => { // the holder of a target's leaf and its key, or null when a container on the way is absent
    let holder = args, key = at.param;
    for (const name of at.chain) { const o = holder[key]; if (o === null || typeof o !== 'object' || o.__isFake || Array.isArray(o) && !/^\d+$/.test(name)) return null; holder = o; key = name; }
    return { holder, key };
  };
  const read = (at) => { const l = locate(at); if (!l) return undefined; const v = l.holder[l.key]; return at.length ? (typeof v === 'string' || Array.isArray(v) ? v.length : undefined) : v; };
  const write = (at, v) => {
    const l = locate(at); if (!l) return;
    try {
      if (!at.length) { l.holder[l.key] = isUndefTag(v) ? undefined : v; return; }
      const cur = l.holder[l.key]; if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 4096) return;
      if (typeof cur === 'string') l.holder[l.key] = (cur + 'x'.repeat(v)).slice(0, v);
      else if (Array.isArray(cur) && v <= 256) { if (v <= cur.length) cur.length = v; else if (cur.length) while (cur.length < v) cur.push(cur[cur.length - 1]); }
    } catch { /* a leaf the draw made read-only stays as drawn */ }
  };
  for (const tg of targets) if (tg.values && tg.values.length) write(tg.at, tg.values[t % tg.values.length]);
  const admitted = (tg, v) => tg.at.length || !tg.leaf || fits(tg.leaf, v, defs); // a copied value only where the target's declared type admits it
  for (const tg of targets) if (tg.from) { const v = read(tg.from), d = tg.deltas[t % tg.deltas.length]; const x = typeof v === 'number' ? v + d : d === 0 ? v : undefined; if (x !== undefined && admitted(tg, x)) write(tg.at, x); }
}
// a spec that admits any string: a string, or a union with a string option (a literal type admits its members only)
const admitsAnyString = (s) => !!s && (s.kind === 'string' || (s.kind === 'union' && s.options.some((o) => o && o.kind === 'string')));
// the families of input i: null outside the tier, else the families its turn holds among those switched on and admitted
export function reachFamilies(spec, i) {
  const j = reachTurn(spec, i); if (j === null) return null;
  const admitted = applicableFamilies(spec), on = familiesOn().filter((f) => admitted.includes(f));
  return familiesAt(j, on);
}

export function generator(seed, defs = {}, literals = [], startEdge = 0, strings = [], regexes = [], walk = null, special = null, walkLen = WALK, known = null, reach = null) {
  const rng = makeRng(seed); // `reach`: the reshaper of a representation input (repr.mjs), else null
  // a listed value of a leaf in the known phase (`known` the phase index, inputsFor): a fresh copy, so neither side's call
  // writes into the other's input; undefined outside the phase or for a leaf with no list
  const listed = (holder) => (known != null && holder && Array.isArray(holder.known) && holder.known.length ? structuredClone(holder.known[known % holder.known.length]) : undefined);
  const isListed = (holder) => known != null && !!holder && Array.isArray(holder.known) && holder.known.length > 0;
  // a special-number input (`special` its turn: 0 for the first one, 1 for the next, ...): its own stream decides
  const srng = special != null ? makeRng((seed ^ 0x2545f491) >>> 0) : null;
  let replaced = 0; // number leaves of this input made special so far (in an even one: distinct slots met so far)
  const tie = special != null && special % 2 === 0; // an even special-number input: the special-slots invariant (header)
  const slotValues = new Map(); // slot -> its special value, in an even special-number input
  const slotOf = (path) => path.replace(/\[\d+\]/g, '[]').replace(/\{\d+\}/g, '{}');
  const specialOf = (spec, x, path = 'in', untyped = false) => { // untyped: an opaque leaf (any, unknown), x undefined; undefined back means it keeps its draw
    if (!srng || (!untyped && (typeof x !== 'number' || !admitsNumber(spec)))) return x;
    if (tie) { const k = slotOf(path); if (!slotValues.has(k)) slotValues.set(k, NUM_SPECIAL[(special + replaced++) % NUM_SPECIAL.length]); return slotValues.get(k); }
    if (replaced > 0 && special % 2 === 1 && srng() < 0.5) return x; // every other special-number input keeps some later leaves finite
    return NUM_SPECIAL[(special + replaced++) % NUM_SPECIAL.length];
  };
  // the sibling index of a leaf (its innermost array index), or -1 outside an array
  const siblingOf = (path) => { const m = path.match(/\[(\d+)\][^[]*$/); return m ? Number(m[1]) : -1; };
  const isAbsent = (o) => !!o && (o.kind === 'null' || o.kind === 'undefined');
  // a shaped spec's boundaries: in the walk (`walk` set by inputsFor) each boundary takes its digit of the walk index,
  // the first boundary turning fastest; after it, a boundary value is mixed in at random. The declared draw is made
  // first in every case and the boundary decisions use their own stream, so the declared draws of every other leaf
  // are the ones an unshaped spec makes
  const brng = makeRng((seed ^ 0x5bd1e995) >>> 0);
  const walking = walk != null && walk >= 0 && walk < WALK; // inputsFor ends the walk earlier, at walkLength(spec)
  const spool = [...strings];
  for (const re of regexes) { const xs = sampleRegex(re, rng, 2); if (xs) spool.push(...xs); } // strings that match the unit's own patterns // string literals of the unit: a comparison against a constant should go both ways
  let edge = startEdge; // the i-th generated input leans on the i-th boundary value: the caller passes i, so the first
  // inputs of a run walk the boundary list instead of every run starting at its first value
  let leafIx = 0; // each leaf of one input leans on a different boundary, and the same leaf walks the list across inputs
  const pool = [...NUM_EDGE, ...literals]; // numbers already seen join the pool, so fields coincide
  function number() {
    const u = rng();
    if (u < 0.35 && pool.length) return pool[Math.floor(rng() * pool.length)];
    const v = pick(NUM_EDGE, () => Math.floor(rng() * 2000) - 1000);
    if (pool.length < 64) pool.push(v, v + 1, v - 1);
    return v;
  }
  const materialize = (x, v, env, path) => (x && typeof x === 'object' ? (x.t === 'undefined' ? undefined : x.t === 'object' ? {} : x.t === 'array' ? [] : x.t === 'fn' ? (env ? env.fake(`${path}#fn`) : () => undefined) : v) : x);
  const choose = (b) => { // an index into b.cmp, or -1
    if (!b || !b.cmp || !b.cmp.length) return -1;
    if (walking) { const q = Math.floor(walk / (b.radix ?? 1)); return b.rank === 1 && q === 0 && (b.radix ?? 1) >= walkLen ? -1 : q % b.cmp.length; } // a truthiness-only leaf whose digit never turns within the walk mixes its falsy values in at random
    return brng() < 0.3 ? Math.floor(brng() * b.cmp.length) : -1;
  };
  // the declared-draw digit of a truthiness-only leaf is the truthy side of its test (its other digits are the falsy
  // values): a falsy draw there becomes a truthy value of a primitive option, chosen on the boundary stream
  const isDraw = (x) => !!x && typeof x === 'object' && x.t === 'draw';
  function truthyOf(spec, v) {
    if (v || !spec) return v;
    for (const o of spec.kind === 'union' ? spec.options : [spec]) {
      if (!o) continue;
      if (o.kind === 'boolean') return true;
      if (o.kind === 'number') { const xs = pool.filter((x) => x); return xs[Math.floor(brng() * xs.length)]; }
      if (o.kind === 'string') { const xs = [...spool, ...STR_EDGE].filter((x) => x.trim()); return xs[Math.floor(brng() * xs.length)]; }
      if (o.kind === 'literal') { const xs = o.values.filter((x) => x); if (xs.length) return xs[Math.floor(brng() * xs.length)]; }
    }
    return v;
  }
  let membersRead = false; // inside a union whose options the unit's reads shaped (an array, a record): the opaque option stands for that reader, not for a value it only converts
  function gen(spec, depth = 0, env = null, path = 'in', leaf = false) {
    return genBoundary(spec, depth, env, path, leaf);
  }
  function genBoundary(spec, depth = 0, env = null, path = 'in', leaf = false) {
    const v = gen0(spec, depth, env, path, leaf);
    const b = spec && spec.boundary; if (!b) return spec && spec.kind === 'number' ? specialOf(spec, v, path) : v;
    const c = choose(b); if (c >= 0) { const x = materialize(b.cmp[c], v, env, path); if (walking && b.rank === 1 && isDraw(b.cmp[c])) return truthyOf(spec, x); if (typeof x === 'number' && pool.length < 64) pool.push(x); return typeof b.cmp[c] === 'number' ? specialOf(spec, x, path) : x; } // a compared number the input holds joins the pool, as a drawn one does; it may be NaN or infinite in a special-number input
    if (b.falsy && b.falsy.length && brng() < (walking ? 0.5 : 0.25)) return materialize(b.falsy[Math.floor(brng() * b.falsy.length)], v, env, path);
    return spec.kind === 'number' ? specialOf(spec, v, path) : v;
  }
  function gen0(spec, depth = 0, env = null, path = 'in', leaf = false) {
    if (!spec || depth > 8) return env ? env.fake(path) : null;
    switch (spec.kind) {
      case 'promise': { const value = gen(spec.of, depth + 1, env, path); return namePromise(env, reach && reach.on.has('thenable') ? reach.thenable(value) : reach && reach.on.has('settlement-order') ? reach.settleLater(value, reach.turn ?? 0) : Promise.resolve(value), path, { value }); } // an input promise is named by its position; on a representation input, a thenable settling to the same value, or a promise the caller settles later in the turn's order
      case 'number': return number();
      case 'string': { if (spool.length && rng() < 0.3) return spool[Math.floor(rng() * spool.length)]; return pick(STR_EDGE, () => `v${Math.floor(rng() * 1e6).toString(36)}`); }
      case 'boolean': return rng() < 0.5;
      case 'bigint': return BigInt(Math.floor(rng() * 1000));
      case 'null': return null;
      case 'undefined': return undefined;
      case 'literal': return spec.values[Math.floor(rng() * spec.values.length)];
      case 'array': { let n = leaf ? 0 : pick([0, 1, 2, 3, 5], () => Math.floor(rng() * 6)); const c = choose(spec.lengths); if (c >= 0) n = spec.lengths.cmp[c]; if (tie && !leaf && n < 2) n = 2; const xs = Array.from({ length: n }, (_, i) => gen(spec.of, depth + 1, env, `${path}[${i}]`, leaf)); return reach ? reach.array(xs) : xs; } // an even special-number input holds two siblings or more (special slots, header), the length drawn first
      case 'async-iterable': {
        const values = gen({ kind: 'array', of: spec.of }, depth + 1, env, path, leaf);
        return { [Symbol.asyncIterator]() {
          env?.record('call', `${path}.asyncIterator`, []);
          let i = 0;
          return {
            async next() { env?.record('call', `${path}.next`, []); return i < values.length ? { done: false, value: values[i++] } : { done: true, value: undefined }; },
            async return() { env?.record('call', `${path}.return`, []); i = values.length; return { done: true, value: undefined }; },
          };
        } };
      }
      case 'tuple': return spec.items.map((s, i) => gen(s, depth + 1, env, `${path}[${i}]`));
      case 'set': return new Set(Array.from({ length: Math.floor(rng() * 4) }, (_, i) => gen(spec.of, depth + 1, env, `${path}{${i}}`)));
      case 'map': return new Map(Array.from({ length: Math.floor(rng() * 4) }, (_, i) => [gen(spec.key, depth + 1, env, `${path}<k${i}>`), gen(spec.value, depth + 1, env, `${path}<v${i}>`)]));
      case 'dict': { const o = {}; for (let i = 0, n = Math.floor(rng() * 4); i < n; i++) o[`k${i}`] = gen(spec.value, depth + 1, env, `${path}.k${i}`); return reach ? reach.dict(o) : o; }
      // a record: a field leading to a compared leaf stays present while walking, unless the unit tests its key with `in`
      case 'record': { const o = {}; for (const [k, f] of Object.entries(spec.fields)) { if (f.optional && rng() < 0.3 && !((spec.refined || f.shaped) && walking && !f.presence) && !isListed(f)) continue; o[k] = gen(f.optional && f.spec.kind === 'union' ? present(f.spec) : f.spec, depth + 1, env, `${path}.${k}`, leaf); if (isListed(f)) o[k] = listed(f); } return reach ? reach.record(o, spec) : o; } // a listed field holds its listed value in the known phase (its declared draw made first)
      case 'union': { const j = Math.floor(rng() * spec.options.length); let o = spec.options[spec.prefer != null && walking && brng() >= 1 / 3 ? spec.prefer : j]; const k = tie ? siblingOf(path) : -1; if (k >= 0 && spec.options.some(isAbsent) && spec.options.some((x) => x && x.kind === 'number')) o = (k % 2 === 0) === (special % 4 === 0) ? spec.options.find(isAbsent) : spec.options.find((x) => x && x.kind === 'number'); const read = spec.options.some((x) => x && ['array', 'record', 'dict', 'function', 'service', 'ref'].includes(x.kind)); const was = membersRead; if (read) membersRead = true; try { return gen(o, depth + 1, env, path); } finally { membersRead = was; } } // while walking, the option leading to a compared leaf two times in three; the declared draw stays reachable // an even special-number input: a sibling's absent option beside another's special number (special slots, header), the option drawn first
      case 'ref': return defs[spec.key] ? gen(defs[spec.key], depth + 1, env, path, leaf || depth >= 3) : (env ? env.fake(path) : null); // a recursive shape unfolds to depth 3, then ends in leaves (empty lists, no deeper refs)
      case 'date': return new Date(1700000000000 + Math.floor(rng() * 1e9));
      // an Error whose `cause` is another Error, `chain` links at most: the links a unit walks through `.cause`; the last
      // link has no cause (the option bag is omitted, so `'cause' in e` is false there)
      case 'error': { const n = pick([0, 1, 2, 3, spec.chain ?? 6], () => Math.floor(rng() * ((spec.chain ?? 6) + 1))); let e; for (let i = n; i >= 0; i--) { const m = gen({ kind: 'string' }, depth + 1, env, `${path}.cause${i}.message`); e = e === undefined ? new Error(m) : new Error(m, { cause: e }); } return e; }
      case 'function': return env ? env.fake(`${path}#fn`, spec.returns ? { kind: 'method', returns: spec.returns } : null) : () => undefined;
      case 'service': return env ? (env.argPool?.length && rng() < 0.5 ? env.argPool[Math.floor(rng() * env.argPool.length)] : env.fake(path, spec)) : {}; // a handle: often one the unit was handed, so a lookup keyed by an argument can hit
      case 'class': return env ? env.fake(path, spec) : function () {};
      case 'tparam': { const pool = [0, 1, 2, 'a', 'b', '', true, false, 7]; const x = pool[Math.floor(rng() * pool.length)]; return reach && reach.on.has('coercion-hooks') ? reach.coercible() : x; }
      // a special-number input: an opaque leaf (any, unknown) whose members the unit does not read takes its slot's special
      // value, as a number leaf does: any and unknown admit NaN and -0, which equality tells apart (design/gen-walk.md)
      case 'opaque': default: { if (spec?.kind === 'opaque' && !membersRead && !leaf) { const sp = specialOf(spec, undefined, path, true); if (sp !== undefined) return sp; } const x = env ? (env.argPool?.length && rng() < 0.5 ? env.argPool[Math.floor(rng() * env.argPool.length)] : env.fake(path)) : {}; return reach && reach.on.has('coercion-hooks') && (spec?.kind === 'opaque') && !membersRead ? reach.coercible() : x; } // a value of an unread type converts itself on a representation input, its declared draw made first; one whose members or elements the unit reads (a union the reads shaped, usage.mjs) keeps its fake
    }
  }
  // nullable optional fields draw both absent tags as well as omission
  function present(u) { if (u.options.some((o) => o.kind === 'null')) return u; const opts = u.options.filter((o) => o.kind !== 'undefined'); const r = opts.length && opts.length < u.options.length ? (opts.length === 1 ? opts[0] : { kind: 'union', options: opts }) : u; return r !== u && u.boundary ? { ...r, boundary: u.boundary } : r; } // a shaped union keeps its boundary
  function pick(edges, random) {
    if (rng() < 0.6) return edges[(edge + leafIx++) % edges.length];
    return random();
  }
  return { gen, rng, listed, isListed };
}

// the i-th input set for a unit: a list of argument values; each call gets a fresh generator seeded by (seed, i)
export function inputsFor(spec, seed, i, env) {
  // a shaped spec walks its boundaries from its first generated input (`walkFrom`: the inputs before it are enumerated
  // heaps) for walkLength(spec) inputs, every combination of its boundaries once; the inputs after it are free draws
  // with listed values (knownLength) the known phase comes first and the walk after it (knownWidth: the walk's digit under
  // the listed values' digit); without them the phase is empty and nothing moves
  const generated = i - (spec.walkFrom ?? 0); // the index among the generated inputs (the enumerated heaps come first)
  const K = knownLength(spec), known = generated >= 0 && generated < K ? generated : null;
  const walk = known != null ? (spec.shaped && walkLength(spec) ? Math.floor(known / knownWidth(spec)) : null) : spec.shaped && generated >= K && generated - K < walkLength(spec) ? generated - K : null;
  const fams = reachFamilies(spec, i); // a representation input: the families of its turn reshape what the declared draw made
  const shaper = fams && fams.length ? Object.assign(reshaper(fams, seed * 1000003 + i, spec.strings ?? []), { turn: reachTurn(spec, i) }) : null;
  if (shaper && env && shaper.on.has('timer-order')) env.timerPerm = 1 + (reachTurn(spec, i) % 5); // the timers due at one instant fire in a legal order other than arm order (run.mjs observe and runTimers)
  const g = generator(seed * 1000003 + i, spec.defs ?? {}, spec.literals ?? [], i, spec.strings ?? [], spec.regexes ?? [], walk, generated >= 0 && generated % SPECIAL === SPECIAL - 1 ? Math.floor(generated / SPECIAL) : null, walkLength(spec), known, shaper);
  const args = spec.params.map((p, k) => { const v = p.optional && g.rng() < 0.3 ? undefined : g.gen(p.spec, 0, env, `arg${k}`); return g.isListed(p) ? g.listed(p) : v; }); // a listed parameter takes its listed value in the known phase, its declared draw made first
  if (shaper && shaper.on.has('proto-name-key')) spec.params.forEach((p, k) => { if (p.inputKey && typeof args[k] === 'string' && admitsAnyString(p.spec)) args[k] = shaper.keyString(args[k]); }); // a key into an object the caller passes names an Object.prototype member, its declared draw made first; a key of a literal type keeps its member
  const t = changedTurn(spec, i); if (t !== null) reachChanged(args, spec.changed, t, spec.defs ?? {}); // a changed-path input: the changed comparisons' targets after the declared draw
  return args;
}

// Heap layer, stage 1: the i-th input set may alias. Positions of one declared shape (an argument, a record field, an
// array element, to depth 3) are grouped; a seeded draw makes some later positions the SAME object as an earlier one,
// and a record whose shape names its own definition may point at itself. The draw depends on (seed, i) and on the
// shapes only, so both sides receive the same sharing; fakes and primitives are never aliased.
export function aliasInputs(args, spec, seed, i) {
  const rng = makeRng(seed * 31337 + i * 101 + 7);
  const force = (reachFamilies(spec, i) ?? []).includes('shared-reference'); // a representation input of the shared-reference family: every sharing the shapes allow, and links across shapes
  if (rng() < 0.4 && !force) return args; // most inputs stay unshared, so a behaviour that needs no aliasing is exercised too
  const defs = spec.defs ?? {};
  const resolve = (s, d = 0) => (s && s.kind === 'ref' && defs[s.key] && d < 4 ? resolve(defs[s.key], d + 1) : s);
  const shapeKey = (s) => { const r = resolve(s); return r ? JSON.stringify({ kind: r.kind, of: r.of ? shapeKey(r.of) : undefined, fields: r.fields ? Object.keys(r.fields).sort() : undefined, key: s && s.kind === 'ref' ? s.key : undefined }) : null; };
  const isObj = (v) => v !== null && typeof v === 'object' && !v.__isFake && !(v instanceof Date) && !(v instanceof RegExp) && !(v instanceof Map) && !(v instanceof Set) && typeof v.then !== 'function';
  // a write of a position: a field a representation input holds behind a getter keeps a getter, now of the shared object
  const put = (holder, key, x) => { const d = Object.getOwnPropertyDescriptor(holder, key); if (d && !Object.hasOwn(d, 'value')) Object.defineProperty(holder, key, { get: () => x, enumerable: d.enumerable, configurable: true }); else holder[key] = x; };
  const positions = []; // {get, set, shape, self: the record's own shape key when it is a record}
  const visit = (holder, key, s, depth) => {
    const v = holder[key]; if (!isObj(v) || depth > 3) return;
    const r = resolve(s); if (!r) return;
    positions.push({ get: () => holder[key], set: (x) => { put(holder, key, x); }, shape: shapeKey(s), refKey: s && s.kind === 'ref' ? s.key : null });
    if (r.kind === 'record' && r.fields) for (const [k, f] of Object.entries(r.fields)) if (Object.hasOwn(v, k)) visit(v, k, f.spec ?? f, depth + 1);
    else if (r.kind === 'array' && Array.isArray(v)) for (let j = 0; j < v.length; j++) visit(v, j, r.of, depth + 1);
    else if (r.kind === 'tuple' && Array.isArray(v)) for (let j = 0; j < Math.min(v.length, r.items.length); j++) visit(v, j, r.items[j], depth + 1);
  };
  spec.params.forEach((p, k) => visit(args, k, p.spec, 0));
  const groups = new Map();
  for (const pos of positions) { if (!pos.shape) continue; if (!groups.has(pos.shape)) groups.set(pos.shape, []); groups.get(pos.shape).push(pos); }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const first = group[0].get();
    for (let j = 1; j < group.length; j++) if (rng() < 0.5 || force) group[j].set(first); // two names, one object
  }
  // a self-referencing shape: a record whose field can be the record itself
  for (const pos of positions) {
    if (!pos.refKey) continue;
    const v = pos.get(); const r = resolve({ kind: 'ref', key: pos.refKey });
    if (!r || r.kind !== 'record' || !r.fields) continue;
    for (const [k, f] of Object.entries(r.fields)) { const fs = f.spec ?? f; if (fs && fs.kind === 'ref' && fs.key === pos.refKey && Object.hasOwn(v, k) && isObj(v[k]) && (rng() < 0.2 || force)) put(v, k, v); }
  }
  // the shared-reference family links across shapes too: a record field of a shape another position holds points at
  // that position's object, so a write through one argument is seen through another, and two records may hold each other
  if (force) for (const pos of positions) {
    if (!pos.refKey) continue;
    const v = pos.get(); const r = resolve({ kind: 'ref', key: pos.refKey });
    if (!r || r.kind !== 'record' || !r.fields || !isObj(v)) continue;
    for (const [k, f] of Object.entries(r.fields)) {
      const fs = f.spec ?? f; if (!fs || fs.kind !== 'ref' || fs.key === pos.refKey || !Object.hasOwn(v, k) || !isObj(v[k])) continue;
      const other = positions.find((q) => q.refKey === fs.key && q.get() !== v[k] && isObj(q.get()));
      if (other) put(v, k, other.get());
    }
  }
  return args;
}
