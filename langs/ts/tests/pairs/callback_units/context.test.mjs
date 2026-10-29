import assert from 'node:assert/strict';
import { test } from 'node:test';
import path from 'node:path';
import { translate } from '../../../translate/translate.mjs';
const { lintFile } = await import(process.env.LEAN_CALLBACK_BASE ? path.resolve(process.env.LEAN_CALLBACK_BASE, 'langs/ts/lint/lint.mjs') : '../../../lint/lint.mjs');
test('contextual JavaScript inputs are typed; an untyped callback is refused by name', () => {
  const findings = lintFile(new URL('./context.js', import.meta.url).pathname, null, { project: false });
  assert.deepEqual(findings.filter(f => f.unit === 'xs.map()#0' && !f.env), []);
  assert.ok(findings.some(f => f.unit === 'unknownFn()#0' && f.rule === 'untyped-js'));
});
test('a contextual JS callback reads an opaque capture without reclassifying it as an untyped own argument', () => {
  const file = new URL('./captured-js.js', import.meta.url).pathname;
  const result = translate(file, null, { core: true, project: false, only: ['outer/[1].map()#0'] });
  assert.match(result.main, /n: int, p: Any/);
});
