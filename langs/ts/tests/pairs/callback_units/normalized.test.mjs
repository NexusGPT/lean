import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadProgram, normaliseApplyCalls, topLevelFunctions } from '../../../common.mjs';
import { translate } from '../../../translate/translate.mjs';
test('normalizing call/apply preserves callback source identity', () => {
  const file = new URL('./normalized.ts', import.meta.url).pathname;
  const before = loadProgram(file, { project: false }), after = normaliseApplyCalls(before);
  assert.notEqual(after.sf.text, before.sf.text);
  assert.deepEqual([...topLevelFunctions(after.sf).keys()], [...topLevelFunctions(before.sf).keys()]);
  assert.ok(topLevelFunctions(after.sf).has('values.map()#0')); // after the rewritten call
  const result = translate(file, null, { core: true, project: false, only: ['throughCall/xs.map.call()#1'] });
  assert.match(result.main, /n: int/);
});
