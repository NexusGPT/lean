import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Environment, render } from './fake.mjs';
import { bridgeGlobal, bridgeFake, bridgeCounts, isBridgeName, bridgePresent, BRIDGE_DENY } from './bridge.mjs';

// the first seed on which the input sets `name` (or leaves it unset)
const seedWhere = (name, present) => { for (let s = 1; ; s++) if (bridgePresent({ seed: s }, name) === present) return s; };

test('an unset global no lib declares is a bridge fake; a lib-declared or denied one stays absent; a held one is the sandbox\'s', () => {
  const env = new Environment(seedWhere('api', true)), g = { held: 7 };
  const w = bridgeGlobal(env, g);
  assert.equal(w.api.__fakePath, 'global:api');
  assert.equal(w.api, w.api); // one object per path
  assert.equal(w.held, 7);
  for (const host of ['navigator', 'localStorage', 'location', 'addEventListener', 'matchMedia', 'document']) { assert.equal(isBridgeName(host), false, host); assert.equal(w[host], undefined, host); }
  for (const name of BRIDGE_DENY) assert.equal(w[name], undefined, name);
  assert.equal('api' in w, true);
  assert.equal('navigator' in w, false);
  w.api2 = 3; assert.equal(w.api2, 3); // a write is the app's value
});

test('whether the host set a bridge name is drawn per input: on some inputs it is absent, the same on both sides', () => {
  const absent = seedWhere('api', false);
  const a = bridgeGlobal(new Environment(absent), {}), b = bridgeGlobal(new Environment(absent), {});
  assert.equal(a.api, undefined); assert.equal(b.api, undefined); assert.equal('api' in a, false);
  let present = 0; for (let s = 1; s <= 200; s++) if (bridgePresent({ seed: s }, 'api')) present++;
  assert.ok(present > 100 && present < 200, `present on ${present} of 200 inputs`);
});

test('a property read is a fake; a call answers a thenable that resolves after the turn to the fake at the call\'s path', async () => {
  const env = new Environment(1);
  const api = bridgeFake(env, 'global:api');
  assert.equal(api.file.read.__fakePath, 'global:api.file.read');
  const t = api.file.read('a.txt');
  assert.equal(typeof t.then, 'function');
  let settled = null; t.then((v) => { settled = v; });
  assert.equal(settled, null); // not in this turn
  await new Promise((r) => setImmediate(r));
  assert.equal(settled.__fakePath, 'global:api.file.read()#1');
  assert.equal(settled.then, undefined); // the settled value is not thenable
  assert.deepEqual(render(t), { $fake: 'global:api.file.read()#1' });
  assert.deepEqual(render(await api.file.read('b.txt')), { $fake: 'global:api.file.read()#2' });
  assert.equal(String(settled), 'global:api.file.read()#1');
  assert.deepEqual([...settled], []);
});

test('a callback handed to a bridge fake is called once, after the turn, with one fake argument; the calls and callbacks are counted', async () => {
  const env = new Environment(1);
  const on = bridgeFake(env, 'global:electron.ipcRenderer.on');
  const seen = [];
  on('theme', (...a) => { seen.push(a.map((x) => x.__fakePath)); });
  assert.deepEqual(seen, []);
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(seen, [['global:electron.ipcRenderer.on()#1#cb1.arg0']]);
  on('boom', () => { throw new Error('inside'); });
  await new Promise((r) => setImmediate(r));
  assert.ok(env.trace.some((x) => x.op === 'callback-throw' && /inside/.test(x.args[0])));
  assert.deepEqual(bridgeCounts(env), { calls: ['global:electron.ipcRenderer.on()#1', 'global:electron.ipcRenderer.on()#2'], callbacks: ['global:electron.ipcRenderer.on()#1#cb1', 'global:electron.ipcRenderer.on()#2#cb1'] });
});

test('two environments of one seed answer the same calls with the same paths and the same trace', async () => {
  const run = async () => { const env = new Environment(seedWhere('api', true)); const w = bridgeGlobal(env, {}); const v = await w.api.user.get(1); await w.api.user.get(2); return [v.__fakePath, JSON.stringify(env.trace)]; };
  assert.deepEqual(await run(), await run());
});
