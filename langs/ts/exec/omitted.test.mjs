// which trailing parameters a caller may leave out (patch.mjs parameterReads) and the calls a drive adds for them
// (exec/run.mjs omittedForms); design/w9af-omitted-args.md
//   node --test langs/ts/exec/omitted.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { ts } from '../common.mjs';
import { parameterReads } from '../patch.mjs';
import { omittedForms } from './run.mjs';

const read = (src) => {
  const sf = ts.createSourceFile('a.ts', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS), out = {};
  const siteValue = (n) => ({ start: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, text: n.getText(sf).split('\n')[0] });
  const walk = (n) => { if (ts.isFunctionDeclaration(n) && n.body) out[n.name.text] = parameterReads(ts, n, sf, siteValue); ts.forEachChild(n, walk); };
  walk(sf); return out;
};

test('a caller may leave out a defaulted, `?`, undefined-tested, `??`, `arguments` or under-passed parameter', () => {
  const p = read([
    'function d(a: number, b = 1) { return a + b; }',
    'function q(a: number, b?: number) { return a; }',
    'function u(a: number, b: number) { if (b === undefined) return a; return b; }',
    'function n(a: number, b: number) { return b ?? a; }',
    'function g(a: number, b: number) { return arguments.length; }',
    'function c(a: number, b: number) { return a + b; }',
    'function plain(a: number, b: number) { return a * b; }',
    'function r(...xs: number[]) { return xs; }',
    'c(1);',
    'plain(1, 2);',
  ].join('\n'));
  const opt = (f) => p[f].map((x) => x.optional);
  assert.deepEqual(opt('d'), [false, true]);
  assert.deepEqual(opt('q'), [false, true]);
  assert.deepEqual(opt('u'), [false, true]);
  assert.deepEqual(opt('n'), [false, true]);
  assert.deepEqual(opt('g'), [true, true]);
  assert.deepEqual(opt('c'), [false, true]); // c(1) in the file passes one
  assert.deepEqual(opt('plain'), [false, false]);
  assert.deepEqual(p.r.map((x) => x.name), [null]); // a rest parameter is never left out alone
});

test('the read of a parameter is the innermost statement around its first read', () => {
  const p = read(['function get(scene: object, depth = 0) {', '  const list = [scene];', '  if (list.length) {', '    if (depth >= list.length) return 1;', '  }', '  return depth;', '}'].join('\n'));
  assert.equal(p.get[1].read.start, 4);
  assert.equal(p.get[1].read.text, 'if (depth >= list.length) return 1;');
  assert.equal(p.get[1].initializer, '0');
});

test('the forms: the first call\'s leading arguments, each optional trailing one left out, then an explicit undefined', () => {
  const P = (...o) => o.map((x, i) => ({ name: `p${i}`, optional: x, read: x ? { start: 10 + i } : null }));
  const f = omittedForms(P(false, true), ['s', 7, 'z']);
  assert.deepEqual(f.map((x) => x.args), [['s'], ['s', undefined]]);
  assert.equal(f[0].read.start, 11);
  assert.deepEqual(omittedForms(P(false, true, true), ['s', 7, 'z']).map((x) => x.args), [['s', 7], ['s'], ['s', undefined]]);
  assert.deepEqual(omittedForms(P(false, false), ['s', 7, 'z']), []); // nothing optional: no extra call
  assert.deepEqual(omittedForms(null, ['s', 7, 'z']), []); // a function lean did not mark
  assert.deepEqual(omittedForms(P(false, true, true, true, true), [1, 2, 3]).map((x) => x.args), [[1, 2], [1], [1, undefined]]); // past DRIVE_ARGS the drawn calls leave them out already
});

test('LEAN_BREAK=w9af-omitted-drives: no form', () => {
  const was = process.env.LEAN_BREAK; process.env.LEAN_BREAK = 'w9af-omitted-drives';
  try { assert.deepEqual(omittedForms([{ name: 'a', optional: false }, { name: 'b', optional: true }], [1, 2, 3]), []); } finally { if (was === undefined) delete process.env.LEAN_BREAK; else process.env.LEAN_BREAK = was; }
});
