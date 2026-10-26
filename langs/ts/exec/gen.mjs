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
      case 'number': return number();
      case 'string': { if (spool.length && rng() < 0.3) return spool[Math.floor(rng() * spool.length)]; return pick(STR_EDGE, () => `v${Math.floor(rng() * 1e6).toString(36)}`); }
      case 'boolean': return rng() < 0.5;
      case 'bigint': return BigInt(Math.floor(rng() * 1000));
      case 'null': return null;
      case 'undefined': return undefined;
      case 'literal': return spec.values[Math.floor(rng() * spec.values.length)];
      case 'array': { const n = leaf ? 0 : pick([0, 1, 2, 3, 5], () => Math.floor(rng() * 6)); return Array.from({ length: n }, (_, i) => gen(spec.of, depth + 1, env, `${path}[${i}]`, leaf)); }
      case 'tuple': return spec.items.map((s, i) => gen(s, depth + 1, env, `${path}[${i}]`));
      case 'set': return new Set(Array.from({ length: Math.floor(rng() * 4) }, (_, i) => gen(spec.of, depth + 1, env, `${path}{${i}}`)));
      case 'map': return new Map(Array.from({ length: Math.floor(rng() * 4) }, (_, i) => [gen(spec.key, depth + 1, env, `${path}<k${i}>`), gen(spec.value, depth + 1, env, `${path}<v${i}>`)]));
      case 'dict': { const o = {}; for (let i = 0, n = Math.floor(rng() * 4); i < n; i++) o[`k${i}`] = gen(spec.value, depth + 1, env, `${path}.k${i}`); return o; }
      case 'record': { const o = {}; for (const [k, f] of Object.entries(spec.fields)) { if (f.optional && rng() < 0.3) continue; o[k] = gen(f.spec, depth + 1, env, `${path}.${k}`, leaf); } return o; }
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
  function pick(edges, random) {
    if (edge < edges.length && rng() < 0.6) return edges[edge++ % edges.length];
    return random();
  }
  return { gen, rng };
}

// the i-th input set for a unit: a list of argument values; each call gets a fresh generator seeded by (seed, i)
export function inputsFor(spec, seed, i, env) {
  const g = generator(seed * 1000003 + i, spec.defs ?? {}, spec.literals ?? [], i, spec.strings ?? [], spec.regexes ?? []);
  return spec.params.map((p, k) => (p.optional && g.rng() < 0.3 ? undefined : g.gen(p.spec, 0, env, `arg${k}`)));
}
