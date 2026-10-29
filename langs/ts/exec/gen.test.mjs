// The generator's special-number invariant (gen.mjs header, "special slots") on a synthetic spec, the direct witnesses
// of four pair units whose lane B verdict moved at merge 3d1bb1f2 (NUM_SPECIAL gained -0), and lane B's verdict on them.
//   node --test langs/ts/exec/gen.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inputsFor, SPECIAL } from './gen.mjs';
import { ts } from '../common.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const pairs = path.join(here, '..', 'tests', 'pairs');
const special = (x) => typeof x === 'number' && (!Number.isFinite(x) || Object.is(x, -0));
const num = { kind: 'number' };
const nullableNum = { kind: 'union', options: [{ kind: 'null' }, num] };
// an array of records: a number key and a nullable number, the shape of a list sorted by a key then by a nullable value
const listSpec = () => ({ params: [{ name: 'xs', spec: { kind: 'array', of: { kind: 'record', fields: { k: { spec: num, optional: false }, v: { spec: nullableNum, optional: false } } } } }], defs: {} });
const SEEDS = Array.from({ length: 20 }, (_, s) => s + 1);
// the generated inputs of the even special-number turns among the first 30 (turn = floor(i / SPECIAL), i % SPECIAL = SPECIAL - 1)
const evenTurns = (spec, seed) => { const out = []; for (let i = 0; i < 30; i++) if (i % SPECIAL === SPECIAL - 1 && Math.floor(i / SPECIAL) % 2 === 0) out.push({ i, turn: Math.floor(i / SPECIAL), args: inputsFor(spec, seed, i, null) }); return out; };

test('an even special-number turn: every array holds two siblings or more, and siblings share each slot\'s special value', () => {
  for (const seed of SEEDS) for (const { i, args } of evenTurns(listSpec(), seed)) {
    const xs = args[0];
    assert.ok(xs.length >= 2, `seed ${seed} input ${i}: ${xs.length} elements`);
    for (const e of xs) { assert.ok(special(e.k), `seed ${seed} input ${i}: k=${e.k} is not special`); assert.ok(Object.is(e.k, xs[0].k), `seed ${seed} input ${i}: sibling keys ${xs.map((x) => x.k)} differ`); }
    const vs = xs.map((e) => e.v).filter((v) => v !== null);
    for (const v of vs) assert.ok(special(v) && Object.is(v, vs[0]), `seed ${seed} input ${i}: values ${xs.map((x) => x.v)}`);
  }
});

test('an even special-number turn: a nullable number slot meets its absent option in a sibling, both orders across turns', () => {
  for (const seed of SEEDS) {
    const orders = new Set();
    for (const { i, args } of evenTurns(listSpec(), seed)) {
      const xs = args[0]; let met = false;
      for (let j = 0; j + 1 < xs.length; j++) { const a = xs[j].v, b = xs[j + 1].v; if (a === null && special(b)) { met = true; orders.add('absent-first'); } if (special(a) && b === null) { met = true; orders.add('special-first'); } }
      assert.ok(met, `seed ${seed} input ${i}: ${JSON.stringify(xs.map((x) => String(x.v)))}`);
    }
    assert.deepEqual([...orders].sort(), ['absent-first', 'special-first'], `seed ${seed}`);
  }
});

test('distinct slots take consecutive special values, whatever the number of siblings before them', () => {
  // two scalar parameters: the counter of distinct slots gives them consecutive values, as before the invariant
  const two = { params: [{ name: 'x', spec: num }, { name: 'y', spec: num }], defs: {} };
  const L = 4; // NaN, Infinity, -Infinity, -0
  const rank = (v) => [NaN, Infinity, -Infinity, -0].findIndex((s) => Object.is(s, v));
  for (const seed of SEEDS) for (const { turn, args } of evenTurns(two, seed)) {
    assert.equal(rank(args[0]), turn % L); assert.equal(rank(args[1]), (turn + 1) % L);
  }
  // a list then a scalar: the list's elements are one slot, so the scalar takes the next value whatever the list's length
  const listThen = { params: [{ name: 'xs', spec: { kind: 'array', of: num } }, { name: 'y', spec: num }], defs: {} };
  for (const seed of SEEDS) for (const { i, turn, args } of evenTurns(listThen, seed)) assert.equal(rank(args[1]), (turn + 1) % L, `seed ${seed} input ${i}: ${args[0].length} elements, y=${args[1]}`);
});

// ---- the four units: a direct witness each (both sides compiled and run on one input, Object.is on the results) ----
const load = (pair, side) => { const js = ts.transpileModule(fs.readFileSync(path.join(pairs, pair, `${side}.ts`), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true } }).outputText; const exports = {}; new Function('exports', 'require', js)(exports, () => new Proxy({}, { get: () => () => () => undefined })); return exports; }; // an imported decorator factory is a no-op: the units read here never call one
const sides = (pair, unit, args) => [load(pair, 'parent')[unit](...structuredClone(args)), load(pair, 'candidate')[unit](...structuredClone(args))];
test('direct witnesses: the -0 inputs separate pad, nestedTag and width; null before Infinity separates order', () => {
  let [p, c] = sides('heap_optional', 'pad', [-0, undefined]); assert.ok(Object.is(p, 0) && Object.is(c, -0), `pad ${p} ${c}`); // -0 + (undefined ?? 0) is +0; the early return keeps -0
  [p, c] = sides('object_accessor_faults', 'nestedTag', [{ data: { kind: 'left', value: -0 } }]); assert.ok(Object.is(p, -0) && Object.is(c, 0), `nestedTag ${p} ${c}`); // value + 0 turns -0 into +0
  [p, c] = sides('rename_parameter', 'width', [null, -0]); assert.ok(Object.is(p, 0) && Object.is(c, -0), `width ${p} ${c}`); // null + -0 is +0 in the parent; the candidate returns pad
  [p, c] = sides('special_numbers', 'order', [[{ position: 0, priceCents: null }, { position: 0, priceCents: Infinity }]]); assert.deepEqual([p.map((x) => x.priceCents), c.map((x) => x.priceCents)], [[null, Infinity], [Infinity, null]]);
});

// ---- lane B on the four units, the pair step's command (exec/run.mjs --n 30 --no-project) ----
const laneB = (pair, unit) => { const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lean-gen-')), 'b.json'); const r = spawnSync('node', [path.join(here, 'run.mjs'), '--parent', path.join(pairs, pair, 'parent.ts'), '--candidate', path.join(pairs, pair, 'candidate.ts'), '--unit', unit, '--n', '30', '--no-project', '--out', out], { encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr); return JSON.parse(fs.readFileSync(out, 'utf8')); };
for (const [pair, unit] of [['special_numbers', 'order'], ['heap_optional', 'pad'], ['object_accessor_faults', 'nestedTag'], ['rename_parameter', 'width']]) {
  test(`lane B ${pair} ${unit}: WITNESS`, () => { const r = laneB(pair, unit); assert.equal(r.verdict, 'WITNESS', JSON.stringify(r).slice(0, 300)); });
}
