import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import { ts, topLevelFunctions } from '../../../common.mjs';
const parse = s => ts.createSourceFile('callbacks.ts', s, ts.ScriptTarget.Latest, true);
const names = s => [...topLevelFunctions(parse(s)).keys()];
test('one inventory lists module and enclosing-unit callbacks', () => {
  assert.deepEqual(names(fs.readFileSync(new URL('./listing.ts', import.meta.url), 'utf8')), [
    'describe', 'defineConfig', 'outer', "app.get('/a')#1", "router.post('/b')#1", "describe('parses')#1",
    "describe('parses')#1/app.get('/nested')#1", 'defineConfig()#0', 'outer/xs.map()#0',
  ]);
});
test('identity survives unrelated insertion and canonicalizes quotes; collisions alone get ordinal suffixes', () => {
  const a = names(`f('a',()=>1); f("b",()=>2);`);
  assert.deepEqual(names(`f('new',()=>3); f("a",()=>1); f('b',()=>2);`).slice(1), a);
  assert.deepEqual(names(`f('a',()=>1); f('a',()=>2); f(()=>3); f(()=>4);`), ["f('a')#1@1", "f('a')#1@2", 'f()#0@1', 'f()#0@2']);
});
