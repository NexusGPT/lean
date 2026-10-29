import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const lean = path.resolve(process.env.CALLBACK_TEST_LEAN ?? '.');
const { lintFile } = await import(pathToFileURL(path.join(lean, 'langs/ts/lint/lint.mjs')));
test('independent units on one source line own their own findings', () => {
  const file = path.resolve('.lean/cache/callback-units/shared-line.ts');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, 'export function first(n: number) { return n; } export function second(n: number) { return new Proxy({}, {}); }\n');
  const findings = lintFile(file, null, { project: false }).filter(f => !f.env);
  assert.ok(findings.length > 0);
  assert.deepEqual([...new Set(findings.map(f => f.unit))], ['second']);
});
