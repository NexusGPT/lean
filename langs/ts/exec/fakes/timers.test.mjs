// The timers fakes' protocol (design/w2b-node-fakes.md): node:timers arms on lane B's virtual clock and fires nothing
// inside the call; node:timers/promises settles in due order, a race won by the shorter delay, with the value given.
// `--break`: the recording proxy alone answers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, moduleOf } from './protocol.mjs';

test('fires-in-due-order: a callback timer is armed, not run in the call; a cleared one never fires', () => {
  const env = world(1); const timers = moduleOf(env, 'node:timers'); let ran = 0;
  const a = timers.setTimeout(() => ran++, 30); const b = timers.setTimeout(() => ran++, 10);
  assert.equal(ran, 0, 'nothing runs inside the call');
  assert.deepEqual(env.timers.queue.map((e) => e.due), [30, 10]);
  timers.clearTimeout(a);
  assert.deepEqual(env.timers.queue.map((e) => e.id), [b], 'cleared-never-fires');
  assert.equal(env.pending.length, 1);
});
test('the awaited forms resolve with their value, in due order', async () => {
  const env = world(1); const tp = moduleOf(env, 'node:timers/promises');
  assert.equal(await tp.setTimeout(5, 'v'), 'v');
  assert.equal(await Promise.race([tp.setTimeout(20, 'slow'), tp.setTimeout(10, 'fast')]), 'fast');
  const order = []; await Promise.all([tp.setTimeout(9).then(() => order.push(9)), tp.setImmediate().then(() => order.push(0)), tp.setTimeout(3).then(() => order.push(3))]);
  assert.deepEqual(order, [0, 3, 9]);
  await tp.setTimeout(100); // past every timer armed above: the race's loser has fired too
  assert.equal(env.trace.filter((r) => r.op === 'fire').length, 7, 'each firing is on the trace');
  const t2 = moduleOf(env, 'timers'); assert.equal(await t2.promises.setTimeout(1, 'p'), 'p');
});
