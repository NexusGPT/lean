import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { check } from '../../../check.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
test('an unchanged optional unit reports a reach key on both sides', async () => {
  const result = await check({ parent: path.join(here, 'parent.ts'), candidate: path.join(here, 'candidate.ts'), unit: 'optPlus', n: 30, project: false, dafnySeconds: 30 });
  assert.ok(result.certificate.lanes.A?.theoremSha256, JSON.stringify(result));
  assert.deepEqual(result.certificate.absentKey, {
    parent: { by: 'reach', declarations: 1 },
    candidate: { by: 'reach', declarations: 1 },
  });
});

test('an absent path through a dynamic callee reports the file fallback', async () => {
  const file = path.join(here, 'dynamic.ts');
  const result = await check({ parent: file, candidate: file, unit: 'dynamicCall', n: 30, project: false, dafnySeconds: 30 });
  assert.equal(result.verdict, 'PASS-proved', JSON.stringify(result));
  assert.deepEqual(result.certificate.absentKey, {
    parent: { by: 'file', reason: 'dynamic code' },
    candidate: { by: 'file', reason: 'dynamic code' },
  });
});
