// The crypto fake's protocol (design/w2b-node-fakes.md): digests and HMACs are Node's; random draws are version-4
// UUIDs and bytes from the seeded generator, the k-th draw the same on both sides of a seed and another on another
// seed. `--break`: the recording proxy alone answers.
import test from 'node:test';
import assert from 'node:assert/strict';
import nodeCrypto from 'node:crypto';
import { world, moduleOf, opsSince } from './protocol.mjs';

test('hash-equals-node: createHash, createHmac and hash digest as Node digests', () => {
  const env = world(1); const crypto = moduleOf(env, 'node:crypto');
  for (const s of ['', 'a', 'héllo', 'x'.repeat(1000)]) for (const alg of ['sha256', 'sha1', 'md5', 'sha512']) {
    assert.equal(crypto.createHash(alg).update(s).digest('hex'), nodeCrypto.createHash(alg).update(s).digest('hex'));
    assert.equal(crypto.createHmac(alg, 'k').update(s).digest('base64'), nodeCrypto.createHmac(alg, 'k').update(s).digest('base64'));
  }
  assert.equal(crypto.timingSafeEqual(Buffer.from('ab'), Buffer.from('ab')), true);
});
test('uuid-shape: randomUUID is a version-4 UUID, fresh per call, fixed by the seed and the draw', () => {
  const draws = (seed) => { const env = world(seed); const c = moduleOf(env, 'crypto'); return [c.randomUUID(), c.randomUUID(), c.randomBytes(8).toString('hex'), c.randomInt(10, 20)]; };
  const a = draws(5), b = draws(5), c = draws(6);
  for (const u of a.slice(0, 2)) assert.match(u, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(a[0], a[1]); assert.deepEqual(a, b); assert.notDeepEqual(a, c);
  assert.ok(a[3] >= 10 && a[3] < 20); assert.equal(a[2].length, 16);
  const env = world(1); const u8 = moduleOf(env, 'crypto').getRandomValues(new Uint8Array(4)); assert.equal(u8.length, 4);
});
test('a random draw is a request on the trace; a digest is computed beside it; the hash object\'s own methods are the unit\'s computation', () => {
  const env = world(1); const crypto = moduleOf(env, 'crypto'); const m = env.trace.length;
  crypto.createHash('sha256').update('x').digest('hex'); crypto.randomUUID();
  assert.deepEqual(opsSince(env, m), ['get module:crypto.randomUUID', 'call module:crypto.randomUUID'], 'a random draw is a request');
  assert.deepEqual((env.computed ?? []).map((r) => `${r.op} ${r.path}`), ['get module:crypto.createHash', 'call module:crypto.createHash'], 'a digest is computed');
});
