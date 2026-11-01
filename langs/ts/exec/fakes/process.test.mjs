// The process fake's protocol (design/w2b-node-fakes.md): env is a record drawn once per name by the seed and kept,
// a write stored as Node stores it (a string) and read back, a delete removing it; argv, cwd, platform stated; exit a
// fault. `--break`: the recording proxy alone answers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, moduleOf } from './protocol.mjs';

test('env-from-record: a variable is drawn once by the seed and its name, and kept', () => {
  const read = (seed) => { const env = world(seed, ['3000']); const p = moduleOf(env, 'node:process'); return Array.from({ length: 16 }, (_, i) => p.env[`V${i}`]); };
  const a = read(2); assert.deepEqual(a, read(2));
  assert.ok(a.some((v) => v === undefined) && a.some((v) => typeof v === 'string'), `absent and present are both drawn: ${JSON.stringify(a)}`);
  const env = world(2); const p = moduleOf(env, 'process'); assert.equal(p.env.V0, p.env.V0);
});
test('write-then-read: a write is kept as Node keeps it, a string; delete removes; `in` sees it', () => {
  const env = world(3); const p = moduleOf(env, 'process');
  p.env.MODE = 'x'; assert.equal(p.env.MODE, 'x'); assert.equal('MODE' in p.env, true);
  p.env.N = 1; assert.equal(p.env.N, '1');
  const saved = process.env.LEAN_FAKE_PROBE; process.env.LEAN_FAKE_PROBE = 1; assert.equal(process.env.LEAN_FAKE_PROBE, '1', 'Node stores a string'); if (saved === undefined) delete process.env.LEAN_FAKE_PROBE; else process.env.LEAN_FAKE_PROBE = saved;
  delete p.env.MODE; assert.equal(p.env.MODE, undefined); assert.equal('MODE' in p.env, false);
  const set = env.trace.filter((r) => r.op === 'set').map((r) => r.path); assert.deepEqual(set, ['module:process.env.MODE', 'module:process.env.N'], 'every write is on the trace');
});
test('exit-faults: exit throws ProcessExit with the code; argv, cwd and platform are stated', () => {
  const env = world(4); const p = moduleOf(env, 'process');
  assert.throws(() => p.exit(3), (e) => e.name === 'ProcessExit' && e.code === 3 && e.message === 'process.exit(3)');
  assert.equal(p.cwd(), '/app'); assert.equal(p.platform, 'linux');
  assert.equal(p.argv[0], '/usr/local/bin/node'); assert.equal(p.argv[1], '/app/main.js'); assert.ok(p.argv.length >= 2 && p.argv.length <= 4);
});
