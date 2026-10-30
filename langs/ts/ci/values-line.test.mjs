// The report's Values line, both branches, through both renderers: pr.mjs's markdown and the CI comment (comment.mjs),
// which re-wraps the rows after filtering by path and capping. The rows are an array, so a run without a values file
// must not read Array.prototype.values as one.
//   node langs/ts/ci/values-line.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { markdown, reportJSON, listedValues, valuesLine, withRecord, WHOLE_SET_FIELDS } from '../pr.mjs';
import { main } from './comment.mjs';
import { pairsRepo } from './pairs-repo.mjs';
import { materializeSources } from './supervise.mjs';
import { sensitivePath } from './ledger.mjs';

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

// the CI comment: the same lines after the path filter and the cap. The report record (identity, lean version, values,
// and any field added later) rides through each re-wrap whole.
const RECORD = { identity: 'id-0123', leanVersion: 'v-4567', stop: null, order: [], callersChecked: 0 };
const comment = async (values, extra = []) => {
  const report = async () => Object.assign([row(), { ...row(), unit: 'b' }], RECORD, values !== undefined ? { values } : {});
  const out = []; const code = await main(['--repo', '.', '--base', 'b'.repeat(40), '--head', 'c'.repeat(40), ...extra], {}, (m) => out.push(m), () => {}, report);
  assert.equal(code, 0); return out.join('\n');
};
for (const extra of [[], ['--paths', 'a.ts'], ['--max-functions', '1']]) {
  const label = extra.length ? extra.join(' ') : 'unfiltered';
  const body = await comment(undefined, extra);
  assert.deepEqual(valuesLines(body), [NONE], `comment ${label}: ${JSON.stringify(valuesLines(body))}`); passed++; console.log(`ok: comment, ${label}, no values file: the none line`);
  assert.ok(body.split('\n').includes('Identity: id-0123; lean v-4567'), `comment ${label}: no Identity line with the lean version`); passed++; console.log(`ok: comment, ${label}: the Identity line with the lean version`);
  const got = valuesLines(await comment(listed, extra));
  assert.ok(got.length === 1 && got[0].startsWith(LISTED + ';'), `comment ${label}: ${JSON.stringify(got)}`); passed++; console.log(`ok: comment, ${label}, a values file: path, ref and hash`);
}
check('withRecord carries every field of the record and no row', () => {
  const rows = Object.assign([row(), row()], RECORD, { values: listed, later: { any: 1 } });
  const part = withRecord(rows, rows.slice(0, 1));
  assert.equal(part.length, 1);
  for (const k of [...Object.keys(RECORD), 'values', 'later']) assert.deepEqual(part[k], rows[k], k);
  const whole = Object.assign([row()], Object.fromEntries(WHOLE_SET_FIELDS.map((k) => [k, { of: 'every row' }])));
  for (const k of WHOLE_SET_FIELDS) assert.ok(!Object.hasOwn(withRecord(whole, []), k), `${k} describes the whole set`);
});

// the function cap counts function rows only: intake rows (artifact, unassigned) outnumber the cap and fill none of it
const intake = (i) => ({ file: `cfg${i}.json`, unit: `(edits from e${i} artifact:config)`, lines: [1, 1], verdict: 'ASK', coverage: 'artifact:config', decision: 'artifact', reason: 'config' });
const capRun = async (cap) => {
  const fns = ['f1', 'f2', 'f3'].map((u) => ({ ...row(), unit: u }));
  const report = async () => Object.assign([...[0, 1, 2, 3, 4].map(intake), { ...intake(5), decision: 'unassigned', coverage: 'unassigned:comment' }, ...fns], RECORD);
  const out = []; assert.equal(await main(['--repo', '.', '--base', 'b'.repeat(40), '--head', 'c'.repeat(40), '--max-functions', String(cap)], {}, (m) => out.push(m), () => {}, report), 0);
  const body = out.join('\n'), verdicts = body.split('## Verdicts')[1] ?? '', intakeTable = body.split('## Intake')[1]?.split('## Verdicts')[0] ?? '';
  return { tabled: ['f1', 'f2', 'f3'].filter((u) => verdicts.includes(`| \`${u}\` (`)), intakeCount: (intakeTable.match(/^\| `cfg\d\.json` \|/gm) ?? []).length, capped: body.includes('cap was reached') };
};
for (const [cap, want, capped] of [[3, ['f1', 'f2', 'f3'], true], [4, ['f1', 'f2', 'f3'], false], [2, ['f1', 'f2'], true]]) {
  const got = await capRun(cap);
  assert.deepEqual(got.tabled, want, `--max-functions ${cap}: tabled ${JSON.stringify(got.tabled)}`);
  assert.equal(got.intakeCount, 6, `--max-functions ${cap}: intake lists ${got.intakeCount} of 6 intake rows`);
  assert.equal(got.capped, capped, `--max-functions ${cap}: cap note`);
  passed++; console.log(`ok: --max-functions ${cap} with 6 intake rows: function rows ${want.join(', ')} tabled, every intake row listed`);
}

// without a root file, the nearer files lane B drew
const nearest = [{ file: 'known_values/.lean/values.json', from: 'abc1234', sha256: '12b6be4ec136f067' }];
check('markdown, nearer files only: each named by path, ref and hash', () => {
  const lines = valuesLines(markdown(Object.assign([row()], { values: undefined, valuesNearest: nearest }), 'base', 'head'));
  assert.equal(lines.length, 1);
  assert.ok(lines[0].startsWith('Values: known_values/.lean/values.json at abc1234, sha256 12b6be4ec136f067;'), lines[0]);
  assert.deepEqual(reportJSON(Object.assign([row()], { valuesNearest: nearest })).valuesNearest, nearest);
});

// the CI pairs repository keeps a pair's values file beside its index file, and the run's source snapshot keeps it too
check('pairsRepo and the snapshot keep a pair\'s .lean/values.json', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const src = path.join(here, '..', 'tests', 'pairs', 'known_values', '.lean', 'values.json');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'values-line-'));
  try {
    const r = pairsRepo({ out: path.join(tmp, 'pairs'), pairs: ['known_values'] });
    const shown = spawnSync('git', ['-C', path.join(tmp, 'pairs'), 'show', `${r.head}:known_values/.lean/values.json`], { encoding: 'utf8' });
    assert.equal(shown.status, 0, shown.stderr);
    assert.equal(shown.stdout, fs.readFileSync(src, 'utf8'));
    materializeSources({ repo: path.join(tmp, 'pairs'), head: r.head, dir: path.join(tmp, 'sources'), sensitivePath });
    assert.equal(fs.readFileSync(path.join(tmp, 'sources', 'known_values', '.lean', 'values.json'), 'utf8'), fs.readFileSync(src, 'utf8'));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
console.log(`values-line.test: ${passed} checks pass`);
