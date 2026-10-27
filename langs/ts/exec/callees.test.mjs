// callees.mjs on small files written to a temporary folder: normalised unit text, the transitive same-file callees,
// and the witness annotation.
//   node --test langs/ts/exec/callees.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ts, loadProgram } from '../common.mjs';
import { unitText, calleesOf, callersOf, calleeWitness, unitTextEqual, annotateWitness } from './callees.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-callees-'));
let k = 0;
const file = (src) => { const p = path.join(dir, `f${k++}.ts`); fs.writeFileSync(p, src); return p; };
const sfOf = (src) => ts.createSourceFile('x.ts', src, ts.ScriptTarget.Latest, true);
const program = (src) => loadProgram(file(src), { project: false });

test('a unit text drops comments and whitespace, and keeps every token', () => {
  const a = unitText(sfOf('export function f(x: number): number {\n  // one more\n  return x + 1;\n}'), 'f');
  const b = unitText(sfOf('export function f(x: number): number { return x  +  1; } // trailing'), 'f');
  const c = unitText(sfOf('export function f(x: number): number { return x + 2; }'), 'f');
  assert.equal(a.sha256, b.sha256);
  assert.notEqual(a.sha256, c.sha256);
  assert.equal(unitText(sfOf('const g = 1;'), 'f'), null);
});

test('callees are transitive, in the order first met, each with the path that reaches it', () => {
  const { sf, checker } = program('function c(x: number) { return x; }\nfunction b(x: number) { return c(x) + 1; }\nconst d = (x: number) => x * 2;\nexport function a(xs: number[]) { return xs.map(d).length + b(1); }\nfunction unused() { return 0; }');
  const got = calleesOf(sf, checker, 'a');
  assert.deepEqual(got.map((x) => x.callee), ['d', 'b', 'c']);
  assert.deepEqual(got.find((x) => x.callee === 'c').path, ['a', 'b', 'c']);
});

test('a method reaches another method of its class through this, and recursion is not a callee', () => {
  const { sf, checker } = program('export class K {\n  step(n: number): number { return n <= 0 ? 0 : this.step(n - 1) + this.unit(); }\n  unit(): number { return 1; }\n}');
  assert.deepEqual(calleesOf(sf, checker, 'K.step').map((x) => x.callee), ['K.unit']);
});

test('the callers of changed units, directly or through same-file calls, in file order, the changed ones excluded', () => {
  const { sf, checker } = program('function leaf(x: number) { return x; }\nfunction mid(x: number) { return leaf(x); }\nexport function top(x: number) { return mid(x); }\nexport function other(x: number) { return x; }\nexport function side(x: number) { return leaf(x) + mid(x); }');
  assert.deepEqual(callersOf(sf, checker, ['leaf']), ['mid', 'top', 'side']);
  assert.deepEqual(callersOf(sf, checker, ['mid', 'leaf']), ['top', 'side']);
  assert.deepEqual(callersOf(sf, checker, ['other']), []);
});

test('a caller whose text is equal names the changed callee behind an unchanged one', () => {
  const body = (inner) => `function leaf(x: number) { return ${inner}; }\nfunction mid(x: number) { return leaf(x); }\nexport function top(x: number) { return mid(x) * 2; }`;
  const cw = calleeWitness(file(body('x + 1')), file(body('x + 2')), 'top');
  assert.equal(cw.unitTextEqual, true);
  assert.deepEqual(cw.through.map((t) => [t.callee, t.changed, t.path.join('>')]), [['leaf', true, 'top>mid>leaf']]);
});

test('a callee on one side only is changed and says which side', () => {
  const cw = calleeWitness(file('export function f(x: number) { return x; }'), file('function g(x: number) { return x; }\nexport function f(x: number) { return g(x); }'), 'f');
  assert.equal(cw.unitTextEqual, false);
  assert.deepEqual(cw.through.map((t) => [t.callee, t.side]), [['g', 'candidate only']]);
});

test('unitTextEqual reads the unit alone, without a checker', () => {
  const p = file('export function f() { return 1; }\nexport function h() { return 1; }'), c = file('export function f() { /* same */ return 1; }\nexport function h() { return 2; }');
  assert.equal(unitTextEqual(p, c, 'f'), true);
  assert.equal(unitTextEqual(p, c, 'h'), false);
  assert.equal(unitTextEqual(p, c, 'nope'), null);
});

test('the annotation: cause callee only when the unit text is equal; through kept either way; other verdicts untouched', () => {
  const p = file('function h(x: number) { return x + 1; }\nexport function f(x: number) { return h(x); }\nexport function g(x: number) { return h(x); }');
  const c = file('function h(x: number) { return x + 2; }\nexport function f(x: number) { return h(x); }\nexport function g(x: number) { return h(x) + 0; }');
  const f = annotateWitness({ verdict: 'WITNESS', witnesses: [{ input: 0, where: { field: 'outcome' } }] }, p, c, 'f');
  assert.equal(f.unitTextEqual, true);
  assert.deepEqual(f.witnesses[0].where, { field: 'outcome', cause: 'callee' });
  assert.deepEqual(f.witnesses[0].through.map((t) => t.callee), ['h']);
  const g = annotateWitness({ verdict: 'WITNESS', witnesses: [{ input: 0, where: { field: 'outcome' } }] }, p, c, 'g');
  assert.equal(g.unitTextEqual, false);
  assert.deepEqual(g.witnesses[0].where, { field: 'outcome' });
  assert.deepEqual(g.witnesses[0].through.map((t) => t.callee), ['h']);
  const pass = { verdict: 'PASS-bounded' };
  assert.deepEqual(annotateWitness(pass, p, c, 'f'), { verdict: 'PASS-bounded' });
});

test.after(() => fs.rmSync(dir, { recursive: true, force: true }));
