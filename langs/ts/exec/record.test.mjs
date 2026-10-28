import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Environment } from './fake.mjs';
import { captureEnvironment, snapshot, witnessRecord } from './record.mjs';

test('capture preserves answers, throws, clock, rng and the original trace', () => {
  function exercise(env, capture) {
    if (capture) captureEnvironment(env);
    const x = env.fake('arg0', { kind: 'service', members: { foo: { kind: 'method', returns: { kind: 'number' } } } });
    const args = capture ? snapshot(env, [x, -0]) : null;
    const result = [];
    for (let k = 0; k < 20; k++) { try { result.push(x.foo(k)); } catch (e) { result.push(e.message); } }
    result.push(Number(x), env.clock('Date.now'), env.clock('Date.now'), env.rng(), env.rng());
    return { env, args, result: result.map(x => x?.__isFake ? x.__fakePath : x), trace: JSON.stringify(env.trace) };
  }
  const a = exercise(new Environment(17), false), b = exercise(new Environment(17), true);
  assert.deepEqual(b.result, a.result); assert.equal(b.trace, a.trace);
  const r = witnessRecord({ seed: 1, leanHead: 'test-head', input: 0, sides: { parent: b, candidate: b } });
  assert.equal(r.schema, 'witness-record/v2');
  assert.equal(r.sides.parent.clock.length, 2);
  assert.equal(r.sides.parent.random.length, 2);
  assert.equal(r.sides.parent.events.filter(e => e.op === 'call').length, 20);
  assert.ok(r.sides.parent.events.some(e => e.outcome?.kind === 'throw'));
  assert.doesNotThrow(() => JSON.stringify(r));
});

test('captures load answers before the v1 trace is cleared and keeps cycles', () => {
  const env = new Environment(1); captureEnvironment(env); env.loading = true;
  env.module('port').ready(); env.loading = false; env.trace.length = 0;
  const a = {}; a.self = a;
  const args = snapshot(env, [a, a]);
  const r = witnessRecord({ seed: 1, leanHead: 'head', input: 0, sides: { parent: { env, args }, candidate: { env, args } } });
  assert.ok(r.sides.parent.events.some(e => e.phase === 'load'));
  assert.ok(r.sides.parent.imports.includes('port'));
  assert.equal(r.sides.parent.args.v[1].t, 'ref');
});

test('runPair emits a separate v2 record including the head and drawn input', async () => {
  const { runPair } = await import('./run.mjs');
  const fs = await import('node:fs'); const os = await import('node:os'); const path = await import('node:path');
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'witness-record-test-'));
  try {
    fs.writeFileSync(path.join(d, 'parent.ts'), 'export function f(x: number) { return Date.now() + Math.random() + x; }');
    fs.writeFileSync(path.join(d, 'candidate.ts'), 'export function f(x: number) { return Date.now() + Math.random() + x + 1; }');
    const r = await runPair({ parent: path.join(d, 'parent.ts'), candidate: path.join(d, 'candidate.ts'), unit: 'f', project: false, n: 1 });
    assert.equal(r.verdict, 'WITNESS');
    assert.equal(r.witnesses[0].record?.schema, 'witness-record/v2');
    assert.match(r.witnesses[0].record.leanHead, /^[a-f0-9]{40}$/);
    assert.equal(r.witnesses[0].record.sides.parent.clock.length, 1);
    assert.equal(r.witnesses[0].record.sides.parent.random.length, 1);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
});
