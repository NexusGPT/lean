import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as translator from '../../../translate/translate.mjs';
test('--only tokenization protects parentheses and quoted commas in every position', () => {
  assert.deepEqual(translator.splitUnitNames("app.get('/a', 1)#1"), ["app.get('/a', 1)#1"]);
  assert.deepEqual(translator.splitUnitNames('a,b'), ['a', 'b']);
  assert.deepEqual(translator.splitUnitNames("a,app.get('/a', 1)#1,b"), ['a', "app.get('/a', 1)#1", 'b']);
  assert.deepEqual(translator.splitUnitNames("a,f('a,b(\\\'c',1)#2,b"), ['a', "f('a,b(\\\'c',1)#2", 'b']);
});
