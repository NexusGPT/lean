// The buffer fake's protocol (design/w2b-node-fakes.md): Node's own Buffer. `--break`: the recording proxy alone answers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, moduleOf } from './protocol.mjs';

test('byteLength, from, concat and the encodings as Node', () => {
  const env = world(1); const b = moduleOf(env, 'node:buffer');
  for (const s of ['', 'a', 'é', '日本', '😀']) assert.equal(b.Buffer.byteLength(s), Buffer.byteLength(s));
  assert.equal(b.Buffer.from('aGk=', 'base64').toString(), 'hi');
  assert.equal(b.Buffer.concat([Buffer.from('a'), Buffer.from('b')]).toString(), 'ab');
  assert.equal(b.btoa('hi'), 'aGk='); assert.equal(b.atob('aGk='), 'hi');
});
