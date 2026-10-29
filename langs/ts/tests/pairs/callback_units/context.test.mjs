import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
const { lintFile } = await import(process.env.LEAN_CALLBACK_BASE ? path.resolve(process.env.LEAN_CALLBACK_BASE, 'langs/ts/lint/lint.mjs') : '../../../lint/lint.mjs');
test('contextual JavaScript inputs are typed; an untyped callback is refused by name', () => {
  const findings = lintFile(new URL('./context.js', import.meta.url).pathname, null, { project: false });
  assert.deepEqual(findings.filter(f => f.unit === 'xs.map()#0' && !f.env), []);
  assert.ok(findings.some(f => f.unit === 'unknownFn()#0' && f.rule === 'untyped-js'));
});
