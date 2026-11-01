// The seeded draws the web fakes share (design/w2c-web-fakes.md). A draw depends on the input's seed and on the
// question's own key (a request, a storage key), never on the order the unit asks: both sides of an input draw the same
// answer to the same question, and a refactor that asks the same questions in another order sees the same world.
import { createHash } from 'node:crypto';

export const hashOf = (text) => createHash('sha256').update(text).digest();
export const unitDraw = (env, tag, key) => hashOf(`${env.seed}:${tag}:${key}`).readUInt32BE(0) / 4294967296;
// a short stable name for a key, for fake paths: a URL's dots and brackets would count as nesting levels (fake.mjs depthOf)
export const keyName = (key) => hashOf(key).toString('hex').slice(0, 12);
// a text the world holds (a stored item, a response body): one of the unit's own strings (spec.mjs: the strings its source
// compares against), the empty text, or a JSON text of each kind, so `=== 'dark'`, `JSON.parse` and the empty case all run
export const TEXT_EDGES = ['', '{}', '[]', 'null', 'true', 'false', '0', '1', '"x"'];
export function drawText(env, tag, key) {
  const pool = [...new Set([...(env.shapes?.strings ?? []).filter((s) => typeof s === 'string'), ...TEXT_EDGES])];
  return pool[Math.min(pool.length - 1, Math.floor(unitDraw(env, tag, key) * pool.length))];
}
