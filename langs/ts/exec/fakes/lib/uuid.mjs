// uuid as a library fake: the package's own code (vendor/uuid, 9.0.1), so v1, v3, v5, validate, version, parse,
// stringify and NIL are uuid's; the one module uuid asks the world for, `crypto`, is answered by a model whose random
// bytes are the side's seeded draws (design/w2d-library-rows.md). Randomness is a read of the world: every draw is
// recorded on the trace (`call module:uuid#crypto.randomFillSync`, `call module:uuid#crypto.randomUUID`), and the bytes
// of the k-th draw are a hash of (seed, k), so the same request sequence gives the same identifiers on both sides and a
// candidate that draws once more, or once less, differs on the trace. md5 and sha1 (v3, v5) are Node's own hashes.
import { createHash } from 'node:crypto';
import { requireVendored, overrideRequire, manifestOf } from './load.mjs';

function seededBytes(env, n) {
  const k = (env.uuidDraws = (env.uuidDraws ?? 0) + 1);
  const out = [];
  for (let i = 0; out.length < n; i++) out.push(...createHash('sha256').update(`${env.seed}:uuid:${k}:${i}`).digest());
  return out.slice(0, n);
}
const hex = (b) => b.map((x) => x.toString(16).padStart(2, '0')).join('');
overrideRequire('uuid', 'crypto', (env) => ({
  randomFillSync(buf) { env.record('call', 'module:uuid#crypto.randomFillSync', [buf.length]); const b = seededBytes(env, buf.length); for (let i = 0; i < buf.length; i++) buf[i] = b[i]; return buf; },
  randomUUID() {
    env.record('call', 'module:uuid#crypto.randomUUID', []);
    const b = seededBytes(env, 16); b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80; // RFC 4122 4.4: version 4, variant 10
    const h = hex(b); return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  },
  createHash: (alg) => createHash(alg),
}));
export const uuidModule = (env) => (manifestOf('uuid') ? requireVendored(env, 'uuid', manifestOf('uuid').main) : null);
