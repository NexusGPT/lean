import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import * as specs from '../../../exec/spec.mjs';
import { sandbox, pickUnit, observe, inputPlan, runPair } from '../../../exec/run.mjs';
import { Environment } from '../../../exec/fake.mjs';
import { runPrograms, runClassRaces } from '../../../exec/programs.mjs';
import { runEnvironmentPrograms, runFreeRaces } from '../../../exec/program.mjs';
const file = fileURLToPath(new URL('paths.ts', import.meta.url));
const root = fileURLToPath(new URL('.', import.meta.url));
const signature = unit => specs.specOf(file, unit, { project: false });
const plain = x => JSON.parse(JSON.stringify(x));
const call = (unit, drawn) => {
  const spec = signature(unit), env = new Environment(1);
  return pickUnit(sandbox(env, root).load(file), spec, env).call(drawn);
};
test('helper expands only the declared rest slot without cloning its values', () => {
  const ordinary = ['a'], item = { value: 1 }, rest = [item];
  const drawn = [ordinary, undefined, rest];
  const got = specs.argsFor({ params: [{}, { optional: true }, { rest: true }] }, drawn);
  assert.deepEqual(got, [ordinary, undefined, item]);
  assert.equal(got[0], ordinary); assert.equal(got[2], item);
  assert.deepEqual(drawn, [ordinary, undefined, rest]);
  assert.deepEqual(specs.argsFor({ params: [{}, { rest: true }] }, [undefined, []]), [undefined]);
  assert.equal(specs.argsFor({ params: [{}, {}] }, drawn), drawn);
});
for (const unit of ['free', 'Direct.staticCall']) test(`${unit}: default followed by empty or multiple rest elements`, () => {
  assert.deepEqual(plain(call(unit, [undefined, ['a', 'b']])), ['ready', ['a', 'b']]);
  assert.deepEqual(plain(call(unit, ['', []])), ['', []]);
});
test('constructor and instance method', () => {
  const inst = call('Direct.constructor', [undefined, ['a', 'b']]);
  assert.deepEqual(plain(inst.items), ['ready', 'a', 'b']);
  const spec = { ...signature('Direct.call'), isStatic: false }, env = new Environment(1);
  const u = pickUnit(sandbox(env, root).load(file), spec, env);
  assert.deepEqual(plain(u.call([undefined, ['a', 'b']])), ['ready', ['a', 'b']]);
});
test('explicit this stays the receiver and ordinary optional arrays stay positional', () => {
  assert.deepEqual(plain(call('explicitThis', [{ label: 'receiver' }, ['a', 'b']])), ['receiver', ['a', 'b']]);
  const xs = ['a', 'b']; const result = call('ordinary', [xs, undefined]);
  assert.equal(result[0], xs); assert.equal(result[1], undefined);
});
test('tuple rest, array-valued rest elements, and reachable mutations', () => {
  assert.deepEqual(plain(call('tuple', [['x', 7]])), ['x', 7]);
  const nested = [['a'], ['b']]; const result = call('nested', [nested]);
  assert.deepEqual(plain(result), nested); assert.equal(result[0], nested[0]);
  const item = { value: 1 }, rest = [item];
  assert.equal(call('mutate', [rest]), 2);
  assert.equal(item.value, 2); assert.equal(rest.length, 1);
});
function runtime() {
  const observations = [], pending = [];
  const rt = {
    sandbox, pickUnit,
    guardedCall: (_env, fn) => { const v = fn(); if (v && typeof v.then === 'function') pending.push(v.then(x => observations.push(x))); else observations.push(v); return v; },
    awaitUnit: (_env, p) => p,
    runTimers: async () => {},
    observe: async (...a) => { const o = await observe(...a); observations.push(o.outcome?.returned); assert.equal(o.harness, undefined); assert.equal(o.outcome?.threw, undefined); return o; },
    firstDifference: () => ({ field: 'outcome' }),
  };
  return { rt, async check() { await Promise.all(pending); assert.ok(observations.includes(true), 'the path really called the unit'); assert.ok(!observations.includes(false), 'every drawn rest element reached a separate parameter'); assert.ok(observations.every(x => x?.valid !== false), 'constructor received spread rest elements'); } };
}
const options = (unit, rt) => ({ files: { parent: file, candidate: file }, roots: { parent: root, candidate: root }, spec: signature(unit), seed: 1, ms: 2000, project: false, rt });
for (const name of ['RestConstructor', 'RestMethod']) {
  test(`${name}: retained commands`, async () => {
    const t = runtime(); const r = await runPrograms(options(`${name}.check`, t.rt));
    assert.equal(r.verdict, 'PASS-bounded'); await t.check();
  });
  test(`${name}: both class-race arrivals`, async () => {
    const t = runtime(); const r = await runClassRaces(options(`${name}.race`, t.rt));
    assert.equal(r.verdict, 'PASS-bounded'); await t.check();
  });
}
test('environment commands', async () => {
  const t = runtime(); const r = await runEnvironmentPrograms(options('environment', t.rt));
  assert.equal(r.verdict, 'PASS-bounded'); await t.check();
});
test('both free-race arrivals', async () => {
  const t = runtime(); const r = await runFreeRaces(options('freeRace', t.rt));
  assert.equal(r.verdict, 'PASS-bounded'); await t.check();
});
test('new pair detects the changed rest-length threshold and its draw replays', async () => {
  const parent = fileURLToPath(new URL('parent.ts', import.meta.url));
  const candidate = fileURLToPath(new URL('candidate.ts', import.meta.url));
  const r = await runPair({ parent, candidate, unit: 'changed', n: 30, project: false });
  assert.equal(r.verdict, 'WITNESS');
  const plan = inputPlan(parent, candidate, 'changed', { project: false });
  for (const w of r.witnesses) {
    const env = new Environment(7919 + w.input); env.shapes = plan.spec;
    const unit = pickUnit(sandbox(env, root).load(parent), plan.spec, env);
    env.trace.length = 0; env.pending.length = 0; env.calls.clear();
    const inputs = plan.draw(w.input, env);
    const o = await observe({ env, unit }, plan.spec, inputs, 2000);
    assert.deepEqual(JSON.parse(JSON.stringify(o)), w.parent);
  }
});
