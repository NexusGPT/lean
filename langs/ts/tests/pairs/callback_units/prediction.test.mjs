import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { ts } from '../../../common.mjs';
import { gapOfFile } from '../../../reach-gap.mjs';
const parse = (s) => ts.createSourceFile('fixture.ts', s, ts.ScriptTarget.Latest, true);
test('prediction partitions the five call shapes and nested callback', () => {
  const g = gapOfFile(parse(fs.readFileSync(new URL('./listing.ts', import.meta.url), 'utf8')));
  assert.deepEqual(g.callbacks, {
    moduleArrowBlock: 1, moduleArrowExpression: 2, moduleFunctionBlock: 1, moduleFunctionExpression: 0,
    bodyArrowBlock: 0, bodyArrowExpression: 2, bodyFunctionBlock: 0, bodyFunctionExpression: 0,
    orderNamed: 0, otherScope: 0, predicted: 6,
  });
});
test('only colliding names in the same scope are order named', () => {
  const g = gapOfFile(parse(`f('a', () => 1); f('b', () => 2); f('a', () => 3); f(() => 4); f(() => 5); function outer(){f('a', () => 6)}`));
  assert.equal(g.callbacks.predicted, 6);
  assert.equal(g.callbacks.orderNamed, 4);
});
