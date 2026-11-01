// The os fake's protocol (design/w2b-node-fakes.md): one stated machine, the same on every seed. `--break`: the
// recording proxy alone answers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, moduleOf } from './protocol.mjs';

test('the stated machine, the same on every seed', () => {
  const read = (seed) => { const env = world(seed); const os = moduleOf(env, 'node:os'); return [os.platform(), os.homedir(), os.tmpdir(), os.EOL, os.cpus().length, os.userInfo().username, os.availableParallelism()]; };
  assert.deepEqual(read(1), ['linux', '/home/lean', '/tmp', '\n', 4, 'lean', 4]);
  assert.deepEqual(read(1), read(99));
});
