// Lane B input generation from a spec (spec.mjs), seeded. Boundary values come first, then random ones.
import { makeRng } from './fake.mjs';
import { sampleRegex } from './regex-sample.mjs';

const STR_EDGE = ['', 'a', 'abc', ' ', 'x y', '0', '-1', 'ÄÖü', '日本', 'a'.repeat(64), 'twelve-chars', 'Hello, World! 2024-01-31 10:30', 'abcdefghijklmnopqrstuvwxyz'.repeat(8), 'line one\nline two', 'null', 'undefined', '  padded  ', 'a,b,c', '/path/to/file.txt', 'user@example.com'];
const NUM_EDGE = [0, 1, -1, 2, 10, 100, -100, 0.5, 1e9, Number.MAX_SAFE_INTEGER];

export function generator(seed, defs = {}, literals = [], startEdge = 0, strings = [], regexes = []) {
  const rng = makeRng(seed);
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
  function gen(spec, depth = 0, env = null, path = 'in', leaf = false) {
    if (!spec || depth > 8) return env ? env.fake(path) : null;
    switch (spec.kind) {
      case 'promise': return Promise.resolve(gen(spec.of, depth + 1, env, path));
      case 'number': return number();
      case 'string': { if (spool.length && rng() < 0.3) return spool[Math.floor(rng() * spool.length)]; return pick(STR_EDGE, () => `v${Math.floor(rng() * 1e6).toString(36)}`); }
      case 'boolean': return rng() < 0.5;
      case 'bigint': return BigInt(Math.floor(rng() * 1000));
      case 'null': return null;
      case 'undefined': return undefined;
      case 'literal': return spec.values[Math.floor(rng() * spec.values.length)];
      case 'array': { const n = leaf ? 0 : pick([0, 1, 2, 3, 5], () => Math.floor(rng() * 6)); return Array.from({ length: n }, (_, i) => gen(spec.of, depth + 1, env, `${path}[${i}]`, leaf)); }
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
      case 'dict': { const o = {}; for (let i = 0, n = Math.floor(rng() * 4); i < n; i++) o[`k${i}`] = gen(spec.value, depth + 1, env, `${path}.k${i}`); return o; }
      case 'record': { const o = {}; for (const [k, f] of Object.entries(spec.fields)) { if (f.optional && rng() < 0.3) continue; o[k] = gen(f.optional && f.spec.kind === 'union' ? present(f.spec) : f.spec, depth + 1, env, `${path}.${k}`, leaf); } return o; }
      case 'union': return gen(spec.options[Math.floor(rng() * spec.options.length)], depth + 1, env, path);
      case 'ref': return defs[spec.key] ? gen(defs[spec.key], depth + 1, env, path, leaf || depth >= 3) : (env ? env.fake(path) : null); // a recursive shape unfolds to depth 3, then ends in leaves (empty lists, no deeper refs)
      case 'date': return new Date(1700000000000 + Math.floor(rng() * 1e9));
      case 'function': return env ? env.fake(`${path}#fn`, spec.returns ? { kind: 'method', returns: spec.returns } : null) : () => undefined;
      case 'service': return env ? (env.argPool?.length && rng() < 0.5 ? env.argPool[Math.floor(rng() * env.argPool.length)] : env.fake(path, spec)) : {}; // a handle: often one the unit was handed, so a lookup keyed by an argument can hit
      case 'class': return env ? env.fake(path, spec) : function () {};
      case 'tparam': { const pool = [0, 1, 2, 'a', 'b', '', true, false, 7]; return pool[Math.floor(rng() * pool.length)]; }
      case 'opaque': default: return env ? (env.argPool?.length && rng() < 0.5 ? env.argPool[Math.floor(rng() * env.argPool.length)] : env.fake(path)) : {};
    }
  }
  // nullable optional fields draw both absent tags as well as omission
  function present(u) { if (u.options.some((o) => o.kind === 'null')) return u; const opts = u.options.filter((o) => o.kind !== 'undefined'); return opts.length && opts.length < u.options.length ? (opts.length === 1 ? opts[0] : { kind: 'union', options: opts }) : u; }
  function pick(edges, random) {
    if (rng() < 0.6) return edges[(edge + leafIx++) % edges.length];
    return random();
  }
  return { gen, rng };
}

// the i-th input set for a unit: a list of argument values; each call gets a fresh generator seeded by (seed, i)
export function inputsFor(spec, seed, i, env) {
  const g = generator(seed * 1000003 + i, spec.defs ?? {}, spec.literals ?? [], i, spec.strings ?? [], spec.regexes ?? []);
  return spec.params.map((p, k) => (p.optional && g.rng() < 0.3 ? undefined : g.gen(p.spec, 0, env, `arg${k}`)));
}

// Heap layer, stage 1: the i-th input set may alias. Positions of one declared shape (an argument, a record field, an
// array element, to depth 3) are grouped; a seeded draw makes some later positions the SAME object as an earlier one,
// and a record whose shape names its own definition may point at itself. The draw depends on (seed, i) and on the
// shapes only, so both sides receive the same sharing; fakes and primitives are never aliased.
export function aliasInputs(args, spec, seed, i) {
  const rng = makeRng(seed * 31337 + i * 101 + 7);
  if (rng() < 0.4) return args; // most inputs stay unshared, so a behaviour that needs no aliasing is exercised too
  const defs = spec.defs ?? {};
  const resolve = (s, d = 0) => (s && s.kind === 'ref' && defs[s.key] && d < 4 ? resolve(defs[s.key], d + 1) : s);
  const shapeKey = (s) => { const r = resolve(s); return r ? JSON.stringify({ kind: r.kind, of: r.of ? shapeKey(r.of) : undefined, fields: r.fields ? Object.keys(r.fields).sort() : undefined, key: s && s.kind === 'ref' ? s.key : undefined }) : null; };
  const isObj = (v) => v !== null && typeof v === 'object' && !v.__isFake && !(v instanceof Date) && !(v instanceof RegExp) && !(v instanceof Map) && !(v instanceof Set) && typeof v.then !== 'function';
  const positions = []; // {get, set, shape, self: the record's own shape key when it is a record}
  const visit = (holder, key, s, depth) => {
    const v = holder[key]; if (!isObj(v) || depth > 3) return;
    const r = resolve(s); if (!r) return;
    positions.push({ get: () => holder[key], set: (x) => { holder[key] = x; }, shape: shapeKey(s), refKey: s && s.kind === 'ref' ? s.key : null });
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
    for (let j = 1; j < group.length; j++) if (rng() < 0.5) group[j].set(first); // two names, one object
  }
  // a self-referencing shape: a record whose field can be the record itself
  for (const pos of positions) {
    if (!pos.refKey) continue;
    const v = pos.get(); const r = resolve({ kind: 'ref', key: pos.refKey });
    if (!r || r.kind !== 'record' || !r.fields) continue;
    for (const [k, f] of Object.entries(r.fields)) { const fs = f.spec ?? f; if (fs && fs.kind === 'ref' && fs.key === pos.refKey && Object.hasOwn(v, k) && isObj(v[k]) && rng() < 0.2) v[k] = v; }
  }
  return args;
}
