import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as common from '../../../common.mjs';
test('--only tokenization protects parentheses and quoted commas in every position', () => {
  assert.deepEqual(common.parseUnitList("app.get('/a', 1)#1"), ["app.get('/a', 1)#1"]);
  assert.deepEqual(common.parseUnitList('a,b'), ['a', 'b']);
  assert.deepEqual(common.parseUnitList('outer/[1,2].map()#0,a'), ['outer/[1,2].map()#0', 'a']);
  assert.deepEqual(common.parseUnitList("a,app.get('/a', 1)#1,b"), ['a', "app.get('/a', 1)#1", 'b']);
  assert.deepEqual(common.parseUnitList("a,f('a,b(\\\'c',1)#2,b"), ['a', "f('a,b(\\\'c',1)#2", 'b']);
});
