// the refusals file pr.mjs writes: one record per refused or failed row of the pr-intake fixture (six rows), plus one
// per WITNESS row; none for a skipped row. One pr.mjs process at a time.
//
//   node --test langs/ts/tests/ci/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { intakeRepo } from '../fixtures/pr-intake/build.mjs';
import { refusalRecords } from '../../pr.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const pr = path.resolve(here, '../../pr.mjs');
const KINDS = ['witness', 'refuse', 'coverage'];

function shape(record) {
  assert.equal(typeof record.check, 'string');
  assert.equal(typeof record.unit, 'string');
  assert.equal(typeof record.file, 'string');
  assert.ok(Number.isInteger(record.location.start) && Number.isInteger(record.location.end) && record.location.start <= record.location.end);
  assert.ok(KINDS.includes(record.kind), record.kind);
  assert.equal(typeof record.reason, 'string');
  for (const key of Object.keys(record)) assert.ok(['check', 'unit', 'file', 'location', 'kind', 'input', 'lines', 'advice', 'reason'].includes(key), key);
}

test('pr.mjs writes <identity>.refusals.json for the pr-intake fixture, in --runs-dir and by default in .lean/runs', { timeout: 300000 }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-refusals-'));
  try {
    const refs = intakeRepo(path.join(tmp, 'repo'));
    const runs = path.join(tmp, 'gate-runs');
    const json = path.join(tmp, 'report.json');
    const args = ['--repo', refs.repo, '--base', refs.base, '--head', refs.head, '--dafny-seconds', '1'];
    const run = spawnSync(process.execPath, [pr, ...args, '--runs-dir', runs, '--json', json], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const report = JSON.parse(fs.readFileSync(json, 'utf8'));
    assert.equal(report.rows.length, 6);
    const file = path.join(runs, `${report.identity}.refusals.json`);
    assert.deepEqual(fs.readdirSync(runs), [path.basename(file)]);
    const written = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(written.identity, report.identity);
    const { records } = written;
    console.log('refusals: ' + JSON.stringify(records.map(({ check, unit, file, location, kind, reason }) => ({ check, unit, file, location, kind, reason: reason.slice(0, 60) }))));
    records.forEach(shape);
    const refusedOrFailed = report.rows.filter((r) => /^(refused|failed):/.test(r.coverage));
    const witnesses = report.rows.filter((r) => r.verdict === 'WITNESS');
    assert.deepEqual(refusedOrFailed.map((r) => r.file), ['loader.ts', 'refused.ts']);
    assert.deepEqual(witnesses.map((r) => r.file), ['inside.ts', 'refused.ts']);
    assert.equal(records.length, refusedOrFailed.length + witnesses.length);
    assert.deepEqual(records.map((r) => [r.file, r.kind, r.check]), [
      ['inside.ts', 'witness', 'lane-B'],
      ['loader.ts', 'coverage', 'failed:loader'],
      ['refused.ts', 'coverage', 'refused:alias-mutation'],
      ['refused.ts', 'witness', 'lane-B'],
    ]);
    assert.ok(!records.some((r) => ['.env', 'image.bin', 'plain.js'].includes(r.file)), 'a skipped row is not a refusal');
    const [inside, loader, aliased, aliasWitness] = records;
    assert.deepEqual(inside.location, { start: 1, end: 1 });
    assert.deepEqual(inside.input, report.rows.find((r) => r.file === 'inside.ts').witness.args);
    assert.equal(inside.lines.candidate.file, 'inside.ts');
    assert.equal(inside.lines.candidate.text, 'return x + 2;');
    assert.equal(inside.lines.parent.text, 'return x + 1;');
    assert.match(inside.reason, /^the two versions differ on outcome/);
    assert.deepEqual(loader.location, { start: 2, end: 2 });
    assert.match(loader.reason, /load failed/);
    assert.deepEqual(aliased.location, { start: 1, end: 1 });
    assert.equal(aliased.advice[0].rule, 'alias-mutation');
    assert.match(aliased.advice[0].do, /^\[migration\]/);
    assert.ok(aliasWitness.input !== undefined && aliasWitness.lines.candidate.file === 'refused.ts');
    assert.match(aliasWitness.reason, /^the two versions differ on heap/);
    // the default folder, on a run that reuses the cache: the same identity and the same records
    const again = spawnSync(process.execPath, [pr, ...args, '--json', json], { encoding: 'utf8' });
    assert.equal(again.status, 0, again.stderr);
    const second = JSON.parse(fs.readFileSync(json, 'utf8'));
    assert.equal(second.identity, report.identity);
    const defaultFile = path.join(refs.repo, '.lean', 'runs', `${report.identity}.refusals.json`);
    assert.deepEqual(JSON.parse(fs.readFileSync(defaultFile, 'utf8')).records, records);
    // a preview starts no lane and writes no refusals file
    const previewRuns = path.join(tmp, 'preview-runs');
    const preview = spawnSync(process.execPath, [pr, ...args, '--preview', '--runs-dir', previewRuns, '--json', path.join(tmp, 'preview.json')], { encoding: 'utf8' });
    assert.equal(preview.status, 0, preview.stderr);
    assert.ok(!fs.existsSync(previewRuns));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('refusalRecords: a REFUSE row is one record, a caller WITNESS counts, a skipped or passing row gives none', () => {
  const rows = [
    { file: 'a.ts', unit: '(file)', lines: [1, 1], coverage: 'skipped:binary', verdict: null, reason: 'binary', advice: [] },
    { file: 'a.ts', unit: 'ok', lines: [2, 4], coverage: 'checked', verdict: 'PASS-proved', reason: null, advice: [] },
    { file: 'a.ts', unit: 'bad', lines: [5, 9], coverage: 'failed:loader', verdict: 'REFUSE', reason: 'load failed: x', certificate: { lanes: { B: { kind: 'load' } } }, advice: [] },
    { file: 'a.ts', unit: 'asked', lines: [10, 12], coverage: 'checked', verdict: 'ASK', reason: 'unproved', advice: [{ line: 11, rule: 'r', msg: 'm', do: 'd' }] },
    { file: 'a.ts', unit: 'caller', lines: [13, 15], coverage: 'checked', verdict: 'WITNESS', caller: true, reason: null, advice: [],
      witness: { input: 2, args: [7], where: { field: 'outcome', cause: 'callee' }, through: [{ callee: 'leaf' }] } },
    { file: 'a.ts', unit: 'gone', lines: [16, 16], coverage: 'skipped:budget', verdict: null, reason: 'stop at unit 3 of 3', advice: [] },
  ];
  const records = refusalRecords(rows);
  records.forEach(shape);
  assert.deepEqual(records.map((r) => [r.unit, r.kind, r.check]), [['bad', 'refuse', 'lane-B:load'], ['caller', 'witness', 'lane-B']]);
  assert.match(records[0].reason, /\(failed:loader\)$/);
  assert.deepEqual(records[1].location, { start: 13, end: 15 }, 'a witness with no site keeps the unit range');
  assert.deepEqual(records[1].input, [7]);
  assert.match(records[1].reason, /through leaf$/);
});

test('a file absent at base is read as absent whatever language git speaks', { timeout: 120000 }, () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-locale-'));
  try {
    const repo = path.join(tmp, 'repo');
    const env = { ...process.env, GIT_AUTHOR_NAME: 'lean', GIT_AUTHOR_EMAIL: 'lean@localhost', GIT_COMMITTER_NAME: 'lean', GIT_COMMITTER_EMAIL: 'lean@localhost', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' };
    const git = (...args) => { const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', env }); assert.equal(r.status, 0, r.stderr); };
    fs.mkdirSync(repo);
    git('init', '-q', '-b', 'main');
    git('commit', '-q', '--allow-empty', '-m', 'Read the empty base');
    fs.writeFileSync(path.join(repo, 'fresh.ts'), 'export function fresh(x: number): number { return x + 1; }\n');
    git('add', 'fresh.ts');
    git('commit', '-q', '-m', 'Read the new file');
    const json = path.join(tmp, 'report.json');
    const french = { ...process.env, LANG: 'fr_BE.UTF-8', LANGUAGE: 'fr', LC_MESSAGES: 'fr_BE.UTF-8' };
    delete french.LC_ALL;
    const run = spawnSync(process.execPath, [pr, '--repo', repo, '--base', 'HEAD~1', '--head', 'HEAD', '--dafny-seconds', '1', '--runs-dir', path.join(tmp, 'runs'), '--json', json], { encoding: 'utf8', env: french });
    assert.equal(run.status, 0, run.stderr);
    const [row] = JSON.parse(fs.readFileSync(json, 'utf8')).rows;
    assert.deepEqual([row.unit, row.coverage, row.verdict], ['fresh', 'checked', 'ASK']);
    assert.match(row.reason, /^new file/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
