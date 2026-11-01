// `crypto`: what is random comes from the seeded generator (randomUUID, randomBytes, randomInt, getRandomValues), the
// k-th draw of a run the same on both sides; what is a function of its input is Node's own (createHash, createHmac,
// timingSafeEqual, hash), so a digest is the digest Node computes. The objects a hash returns are Node's: their
// update/digest are the unit's own computation on a value, not requests to the world.
import nodeCrypto from 'node:crypto';
import { bytesOf, entries, worldError, nodeCallback } from './common.mjs';

export function cryptoModel(env) {
  let draws = 0; // the order of random draws in this run: the k-th draw is fixed by the seed and k
  const next = (n) => bytesOf(env, `crypto:${++draws}`, n);
  const uuid = () => { const b = next(16); b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80; const h = b.toString('hex'); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`; };
  const randomInt = (a) => {
    const cb = typeof a[a.length - 1] === 'function' ? a[a.length - 1] : null; const r = cb ? a.slice(0, -1) : a;
    const [min, max] = r.length >= 2 ? [r[0], r[1]] : [0, r[0]];
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || max <= min) throw worldError(RangeError, `The value of "max" is out of range. It must be greater than the value of "min" (${min}). Received ${max}`, { code: 'ERR_OUT_OF_RANGE' });
    const v = min + Number(next(6).readUIntBE(0, 6) % (max - min));
    return cb ? (nodeCallback(env, 'crypto.randomInt', cb, () => v), undefined) : v;
  };
  const randomBytes = (a, self, k, path) => {
    const n = a[0];
    if (!Number.isInteger(n) || n < 0 || n > 2 ** 31 - 1) throw worldError(RangeError, `The value of "size" is out of range. It must be >= 0 && <= 2147483647. Received ${n}`, { code: 'ERR_OUT_OF_RANGE' });
    const v = next(n);
    if (typeof a[1] === 'function') { nodeCallback(env, path, a[1], () => v); return undefined; }
    return v;
  };
  const getRandomValues = (a) => { const x = a[0]; if (!ArrayBuffer.isView(x)) throw worldError(TypeError, 'The "typedArray" argument must be an instance of Int8Array, Uint8Array, ...', { code: 'ERR_INVALID_ARG_TYPE' }); new Uint8Array(x.buffer, x.byteOffset, x.byteLength).set(next(x.byteLength)); return x; };
  const calls = {
    randomUUID: () => uuid(), randomBytes, randomInt, getRandomValues, 'webcrypto.getRandomValues': getRandomValues, 'webcrypto.randomUUID': () => uuid(),
    createHash: (a) => nodeCrypto.createHash(...a), createHmac: (a) => nodeCrypto.createHmac(...a), timingSafeEqual: (a) => nodeCrypto.timingSafeEqual(...a),
    getHashes: () => nodeCrypto.getHashes(), ...(nodeCrypto.hash ? { hash: (a) => nodeCrypto.hash(...a) } : {}),
  };
  // the random draws never fault (a draw of the generator is no request that can fail); the pure ones neither
  return entries({ name: 'crypto', calls, pure: Object.keys(calls), objects: ['webcrypto'], quiet: ['createHash', 'createHmac', 'timingSafeEqual', 'hash', 'getHashes'] });
}
