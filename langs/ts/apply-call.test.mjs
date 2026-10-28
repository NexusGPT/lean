// The apply/call normalisation (common.mjs applyCall, normaliseApplyCalls; design/push-apply.md) keeps every position:
// the normalised text has the original's length and line breaks, it differs only inside the rewritten calls, and a
// lint finding quotes what the owner wrote at the owner's line and column. Run: node --test langs/ts/apply-call.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ts, loadProgram, normaliseApplyCalls, applyCall } from './common.mjs';
import { lintFile } from './lint/lint.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apply-call-'));
let k = 0;
const write = (src) => { const f = path.join(dir, `u${k++}.ts`); fs.writeFileSync(f, src); return f; };

const SOURCE = `export function forms(a: string[], c: string[], b: string[], x: string): number {
  a.push.apply(a, b); a.push.call(a, x);
  a.unshift.apply(
    a,
    b,
  );
  Array.prototype.push.apply(c, b);
  [].push.call(c, x);
  a.push.apply(a, b.concat.apply(b, [c]));
  return a.length + c.length;
}
`;

test('the normalised text keeps the length, the line breaks, and every character outside the rewritten calls', () => {
  const f = write(SOURCE);
  const loaded = loadProgram(f, { project: false });
  const calls = []; const walk = (n) => { if (applyCall(n, loaded.checker)?.exact) calls.push([n.getStart(loaded.sf), n.end]); ts.forEachChild(n, walk); }; walk(loaded.sf);
  assert.equal(calls.length, 7, 'seven exact calls (the nested one counted)');
  const norm = normaliseApplyCalls(loaded);
  const before = loaded.sf.text, after = norm.sf.text;
  assert.notEqual(after, before);
  assert.equal(after.length, before.length);
  const breaks = (t) => [...t].flatMap((ch, i) => (ch === '\n' ? [i] : []));
  assert.deepEqual(breaks(after).length, breaks(before).length);
  for (let i = 0; i < before.length; i++) if (before[i] !== after[i]) assert.ok(calls.some(([s, e]) => s <= i && i < e), `position ${i} changed outside a rewritten call`);
  // the line of every statement after a multi-line call is unchanged
  assert.equal(norm.sf.getLineAndCharacterOfPosition(after.indexOf('return a.length')).line, loaded.sf.getLineAndCharacterOfPosition(before.indexOf('return a.length')).line);
  assert.match(after, /a\.push\(\s*\.\.\.b\); a\.push\(\s*x\);/);
  assert.match(after, /c\.push\(\s*\.\.\.b\);/);
  assert.match(after, /c\.push\(\s*x\);/);
  assert.doesNotMatch(after, /\.(apply|call)\(/, 'the nested call is rewritten on the next round');
});

test('a finding at a rewritten site quotes the owner\'s text at the owner\'s line and column', () => {
  const src = `export function n(b: string[]): number {\n  const a: string[] = [];\n  const m = a.push.apply(a, b);\n  return m;\n}\n`;
  const f = write(src);
  const hit = lintFile(f, null, { project: false }).find((x) => x.rule === 'param-mutation');
  assert.ok(hit, 'the direct form\'s own rule refuses push used as a value');
  const at = src.indexOf('a.push.apply');
  assert.equal(hit.line, 3);
  assert.equal(hit.col, at - src.lastIndexOf('\n', at));
  assert.equal(hit.text, 'a.push.apply(a, b)');
});

test('a call that is not the direct call is left as written and named', () => {
  const f = write(`export function g(a: string[], c: { length: number; [i: number]: string }, b: string[] | undefined): void {\n  a.push.apply(c, b ?? []);\n  a.push.apply(a, b!);\n}\n`);
  const loaded = loadProgram(f, { project: false });
  const found = []; const walk = (n) => { const r = applyCall(n, loaded.checker); if (r) found.push(r); ts.forEachChild(n, walk); }; walk(loaded.sf);
  assert.equal(found.length, 2);
  assert.equal(found[0].exact, false);
  assert.match(found[0].why, /not an array reached by a plain path/);
  assert.equal(found[1].exact, true, 'b! is a non-nullable array type; the non-null assertion is the lint\'s own finding');
  assert.equal(normaliseApplyCalls(loaded).sf.text.includes('a.push.apply(c, b ?? [])'), true);
});
