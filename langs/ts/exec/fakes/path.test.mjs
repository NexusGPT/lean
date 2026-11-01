// The path fake's protocol against Node's path (design/w2b-node-fakes.md): on a grid of parts, every function answers
// what node:path (POSIX) answers; resolve and relative answer it with the fake's working directory /app. `--break`:
// the recording proxy alone answers, and the protocols fail.
import test from 'node:test';
import assert from 'node:assert/strict';
import nodePath from 'node:path';
import { world, moduleOf, opsSince } from './protocol.mjs';

const P = nodePath.posix;
const PARTS = ['', '.', '..', 'a', 'a/b', '/abs', '/abs/', 'x.ts', 'dir/index.ts', '.hidden', 'a//b/../c', 'ÄÖü', 'a.b.c', '/'];
test('join-equals-node: join, normalize, basename, dirname, extname, isAbsolute, parse/format', () => {
  const env = world(1); const path = moduleOf(env, 'node:path');
  for (const a of PARTS) {
    for (const b of PARTS) assert.equal(path.join(a, b), P.join(a, b), `join(${a}, ${b})`);
    assert.equal(path.normalize(a || '.'), P.normalize(a || '.'));
    assert.equal(path.basename(a), P.basename(a)); assert.equal(path.basename(a, '.ts'), P.basename(a, '.ts'));
    assert.equal(path.dirname(a), P.dirname(a)); assert.equal(path.extname(a), P.extname(a)); assert.equal(path.isAbsolute(a), P.isAbsolute(a));
    assert.deepEqual({ ...path.parse(a) }, P.parse(a)); assert.equal(path.format(path.parse(a)), P.format(P.parse(a)), `parse-format-roundtrip ${a}`);
  }
  assert.equal(path.sep, '/'); assert.equal(path.delimiter, ':'); assert.equal(path.posix.join('a', 'b'), 'a/b');
});
test('resolve and relative read the fake working directory, never the host one', () => {
  const env = world(1); const path = moduleOf(env, 'path');
  for (const a of PARTS) { assert.equal(path.resolve(a), P.resolve('/app', a)); for (const b of PARTS) assert.equal(path.relative(a, b), P.relative(P.resolve('/app', a), P.resolve('/app', b))); }
  assert.equal(path.resolve('x'), '/app/x');
});
test('a wrong argument throws as Node throws: a TypeError', () => {
  const env = world(1); const path = moduleOf(env, 'path');
  assert.throws(() => path.join('a', 3), TypeError); assert.throws(() => P.join('a', 3), TypeError);
});
test('a call of path is computed, not a request: kept with its arguments beside the trace, never on it', () => {
  const env = world(1); const path = moduleOf(env, 'node:path'); const m = env.trace.length;
  path.join('a', 'b'); path.extname('x.ts');
  assert.deepEqual(opsSince(env, m), [], 'nothing asked of the world');
  assert.deepEqual((env.computed ?? []).map((r) => `${r.op} ${r.path}`), ['get module:node:path.join', 'call module:node:path.join', 'get module:node:path.extname', 'call module:node:path.extname']);
  assert.deepEqual(env.computed.at(-1).args, ['x.ts']);
});
