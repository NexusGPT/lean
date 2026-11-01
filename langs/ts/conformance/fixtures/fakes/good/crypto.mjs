// A minimal crypto fake (fixture until w2b's exec/fakes/crypto.mjs lands): createHash is the real hash, randomUUID and
// randomBytes draw from the environment's seeded generator; every call recorded.
import realCrypto from 'node:crypto';
import { makeRng } from '../../../../exec/fake.mjs';

export const specifier = 'node:crypto';
export function create(env) {
  const rng = makeRng(env.seed ^ 0x63727970);
  const bytes = (n) => { const b = Buffer.alloc(n); for (let i = 0; i < n; i++) b[i] = Math.floor(rng() * 256); return b; };
  return {
    createHash(alg, opts) { env.record('call', 'module:crypto.createHash', [alg]); return realCrypto.createHash(alg, opts); },
    randomBytes(n) { env.record('call', 'module:crypto.randomBytes', [n]); return bytes(n); },
    randomUUID() {
      env.record('call', 'module:crypto.randomUUID', []);
      const b = bytes(16); b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
      const h = b.toString('hex'); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    },
  };
}
