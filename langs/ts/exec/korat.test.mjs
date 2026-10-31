// The enumerated small heaps (korat.mjs) on synthetic specs: the breadth-first prefix draws every slot within the suite's
// 30 inputs, a nullable item or key draws the absent value among a slot's first three choices, and a Map whose values
// are records draws them from the pool.
//   node --test langs/ts/exec/korat.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { enumerateHeaps } from './korat.mjs';

const N = 30; // the suite's lane B inputs (tests/run.mjs --n 30)
const str = { kind: 'string' }, num = { kind: 'number' }, nul = { kind: 'null' };
const tagRef = { kind: 'ref', key: 'Tag' };
const orNull = (s) => ({ kind: 'union', options: [s, nul] });
const field = (spec, optional = false) => ({ spec, optional });
const defs = { Tag: { kind: 'record', fields: { name: field(str), next: field(orNull(tagRef)) } } };
const inputs = (spec) => { const h = enumerateHeaps(spec, 2, 1); return h.builders.slice(0, N).map((b) => b(null)); };
const holdsRecord = (v) => (v instanceof Map ? [...v].some(([a, b]) => typeof a === 'object' && a !== null || typeof b === 'object' && b !== null) : v instanceof Set ? [...v].some((x) => x && typeof x === 'object') : Array.isArray(v) ? v.length > 0 : !!v && typeof v === 'object');

test('the breadth-first prefix: a Map field placed first in a record of four slots holds the argument\'s own key, and every slot holds a record, within 30 inputs', () => {
  const box = { kind: 'record', fields: { m: field({ kind: 'map', key: tagRef, value: num }), a: field(tagRef), b: field(orNull(tagRef)), c: field({ kind: 'array', of: tagRef }) } };
  const ins = inputs({ params: [{ name: 'r', spec: box }, { name: 't', spec: tagRef }], defs });
  assert.ok(ins.length === N, `${ins.length} enumerated inputs`);
  assert.ok(ins.some(([r, t]) => r.m.has(r.a) || r.m.has(t)), 'no input whose Map holds an object the arguments hold as a key');
  for (const f of ['m', 'a', 'b', 'c']) assert.ok(ins.some(([r]) => holdsRecord(r[f])), `the slot ${f} never holds a record`);
  assert.ok(ins.some(([r, t]) => [r.a, r.b, t].some((x) => x && x.next)), 'the slot Tag.next never holds a record');
});

test('a deep chain: every field of every shape down to depth 4 holds a record within 30 inputs', () => {
  const lvl = (d) => (d === 0 ? tagRef : { kind: 'record', fields: { [`down${d}`]: field(orNull(lvl(d - 1))), [`side${d}`]: field(orNull(tagRef)) } });
  const ins = inputs({ params: [{ name: 'x', spec: orNull(lvl(3)) }], defs });
  const seenAt = new Set();
  const walk = (o, d) => { if (!o || typeof o !== 'object' || d > 6) return; for (const [k, v] of Object.entries(o)) if (v && typeof v === 'object') { seenAt.add(k); walk(v, d + 1); } };
  for (const [x] of ins) walk(x, 0);
  for (const f of ['down3', 'side3', 'down2', 'side2', 'down1', 'side1', 'next']) assert.ok(seenAt.has(f), `the slot ${f} never holds a record (${[...seenAt].join(', ')})`);
});

test('a nullable item or key: the absent value among the first three choices, drawn within the first inputs', () => {
  const ins = inputs({ params: [{ name: 's', spec: { kind: 'set', of: orNull(tagRef) } }, { name: 't', spec: tagRef }], defs });
  assert.ok(ins.slice(0, 4).some(([s]) => s.has(null)), `no Set holding null among the first inputs: ${ins.slice(0, 4).map(([s]) => [...s].map((x) => (x === null ? 'null' : 'o')).join('')).join(' | ')}`);
  assert.ok(ins.some(([s, t]) => s.has(t)), 'no Set holding the argument itself');
  assert.ok(ins.some(([s]) => s.has(null) && [...s].some((x) => x !== null)), 'no Set holding null beside a record');
  const keyed = inputs({ params: [{ name: 'm', spec: { kind: 'map', key: orNull(tagRef), value: num } }], defs });
  assert.ok(keyed.slice(0, 4).some(([m]) => m.has(null)), 'no Map keyed by null among the first inputs');
});

test('a Map whose values are records: the values drawn from the pool, the argument itself among them; generated keys distinct', () => {
  const ins = inputs({ params: [{ name: 'm', spec: { kind: 'map', key: str, value: tagRef } }, { name: 't', spec: tagRef }], defs });
  assert.ok(ins.some(([m, t]) => [...m.values()].includes(t)), 'no Map holding the argument as a value');
  assert.ok(ins.some(([m]) => m.size === 2 && new Set(m.values()).size === 1), 'no Map holding one record under two keys');
  for (const [m] of ins) for (const k of m.keys()) assert.equal(typeof k, 'string');
  const both = inputs({ params: [{ name: 'm', spec: { kind: 'map', key: tagRef, value: orNull(tagRef) } }], defs });
  assert.ok(both.some(([m]) => [...m].some(([a, b]) => a === b)), 'no Map whose key is its own value');
  assert.ok(both.slice(0, 4).some(([m]) => [...m.values()].includes(null)), 'no Map holding a null value among the first inputs');
  const h = enumerateHeaps({ params: [{ name: 'm', spec: { kind: 'map', key: str, value: tagRef } }], defs }, 2, 1);
  const [a, b] = [h.builders[2](null), h.builders[2](null)];
  assert.notEqual([...a[0].values()][0], [...b[0].values()][0], 'two builds share an object');
  assert.deepEqual([...a[0].keys()], [...b[0].keys()], 'two builds draw different keys');
});
