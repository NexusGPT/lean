// The report's Values line, both branches, through both renderers: pr.mjs's markdown and the CI comment (comment.mjs),
// which re-wraps the rows after filtering by path and capping. The rows are an array, so a run without a values file
// must not read Array.prototype.values as one.
//   node langs/ts/ci/values-line.test.mjs
import assert from 'node:assert/strict';
import { markdown, reportJSON, listedValues, valuesLine } from '../pr.mjs';
import { main } from './comment.mjs';

const NONE = 'Values: none listed (lane B draws from the types)';
const row = () => ({ file: 'a.ts', unit: 'a', lines: [1, 1], verdict: 'PASS-proved', coverage: 'checked', laneA: 'PASS-proved' });
const listed = { file: '.lean/values.json', from: 'abc1234', sha256: '0123456789abcdef' };
const LISTED = 'Values: .lean/values.json at abc1234, sha256 0123456789abcdef';
const valuesLines = (text) => text.split('\n').filter((l) => l.startsWith('Values:'));
let passed = 0;
const check = (name, fn) => { fn(); passed++; console.log(`ok: ${name}`); };

// the none branch: no own property, an own undefined (prReport's Object.assign of a worker without a file), an own null
for (const [label, rows] of [['no property', [row()]], ['own undefined', Object.assign([row()], { values: undefined })], ['own null', Object.assign([row()], { values: null })]]) {
  check(`markdown, ${label}: the none line`, () => {
    assert.equal(listedValues(rows), null);
    assert.deepEqual(valuesLines(markdown(rows, 'base', 'head')), [NONE]);
    assert.ok(!('values' in reportJSON(rows)), 'the JSON report carries no values key');
  });
}
// the listed branch
check('markdown, a values file: path, ref and hash', () => {
  const rows = Object.assign([row()], { values: listed });
  const lines = valuesLines(markdown(rows, 'base', 'head'));
  assert.equal(lines.length, 1);
  assert.ok(lines[0].startsWith(LISTED + ';'), lines[0]);
  assert.deepEqual(reportJSON(rows).values, listed);
});
check('valuesLine never prints undefined', () => {
  assert.equal(valuesLine(null), NONE);
  assert.doesNotMatch(valuesLine(listed), /undefined/);
});

// the CI comment: the same line after the path filter and the cap
const comment = async (values, extra = []) => {
  const report = async () => Object.assign([row(), { ...row(), unit: 'b' }], { stop: null, order: [], callersChecked: 0, ...(values !== undefined ? { values } : {}) });
  const out = []; const code = await main(['--repo', '.', '--base', 'b'.repeat(40), '--head', 'c'.repeat(40), ...extra], {}, (m) => out.push(m), () => {}, report);
  assert.equal(code, 0); return out.join('\n');
};
for (const extra of [[], ['--paths', 'a.ts'], ['--max-functions', '1']]) {
  const label = extra.length ? extra.join(' ') : 'unfiltered';
  const none = valuesLines(await comment(undefined, extra));
  assert.deepEqual(none, [NONE], `comment ${label}: ${JSON.stringify(none)}`); passed++; console.log(`ok: comment, ${label}, no values file: the none line`);
  const got = valuesLines(await comment(listed, extra));
  assert.ok(got.length === 1 && got[0].startsWith(LISTED + ';'), `comment ${label}: ${JSON.stringify(got)}`); passed++; console.log(`ok: comment, ${label}, a values file: path, ref and hash`);
}
console.log(`values-line.test: ${passed} checks pass`);
