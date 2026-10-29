import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runPairInProcess, sandbox } from '../../../exec/run.mjs';
import { Environment } from '../../../exec/fake.mjs';
const parent = new URL('./parent.ts', import.meta.url).pathname;
const candidate = new URL('./candidate.ts', import.meta.url).pathname;
test('module callbacks are reachable; nested callbacks inherit the enclosing verdict', async () => {
  for (const [unit, verdict] of [["app.get('/changed')#1", 'WITNESS'], ["app.get('/same')#1", 'PASS-bounded'], ['outer/xs.map()#0', 'PASS-bounded']]) {
    const result = await runPairInProcess({ parent, candidate, unit, n: 12, project: false, values: null });
    assert.equal(result.verdict, verdict, JSON.stringify(result));
    if (unit.startsWith('outer/')) assert.equal(result['covered-by'], 'outer');
  }
});
test('callback capture does not add observable module exports', () => {
  const exports = sandbox(new Environment(1), null).load(parent);
  assert.deepEqual(Object.keys(exports).sort(), ['__lean_units', 'outer']);
});
