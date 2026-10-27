import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { intakeRepo } from './build.mjs';
import { secretPath, selectUnits, coverageOf, budgetValue } from '../../../pr.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const pr = path.resolve(here, '../../../pr.mjs');
export function testIntake() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-intake-test-'));
  try {
    const refs = intakeRepo(path.join(tmp, 'repo'));
    const json = path.join(tmp, 'report.json'), previewJson = path.join(tmp, 'preview.json'), audit = path.join(tmp, 'audit.log');
    const args = ['--repo', refs.repo, '--base', refs.base, '--head', refs.head, '--dafny-seconds', '1'];
    const run = spawnSync(process.execPath, [pr, ...args, '--json', json], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const report = JSON.parse(fs.readFileSync(json, 'utf8'));
    const rows = report.rows;
    assert.deepEqual(report.stop, { reason: 'none', reached: 3, total: 3 });
    const want = {
      '.env': 'skipped:secret-path', 'image.bin': 'skipped:binary', 'inside.ts': 'checked',
      'loader.ts': 'failed:loader', 'plain.js': 'skipped:not-typescript', 'refused.ts': 'refused:alias-mutation',
    };
    console.log('JSON rows: ' + JSON.stringify(rows.map(({ file, unit, coverage }) => ({ file, unit, coverage }))));
    assert.equal(rows.length, 6, 'every changed fixture unit has a row, including .env');
    assert.deepEqual(Object.fromEntries(rows.map((r) => [r.file, r.coverage])), want);
    assert.equal(new Set(rows.map((r) => r.coverage)).size, 6);
    const refused = rows.find((r) => r.file === 'refused.ts');
    assert.equal(refused.laneA, null);
    assert.equal(refused.laneB, 'WITNESS');
    assert.equal(refused.verdict, 'WITNESS');
    fs.writeFileSync(audit, '');
    const preview = spawnSync(process.execPath, ['--import', path.join(here, 'preview-audit.mjs'), pr, ...args, '--preview', '--json', previewJson], { encoding: 'utf8', env: { ...process.env, LEAN_INTAKE_AUDIT: audit } });
    assert.equal(preview.status, 0, preview.stderr);
    const intake = JSON.parse(fs.readFileSync(previewJson, 'utf8'));
    assert.deepEqual(intake.map((r) => [r.file, r.unit]), rows.map((r) => [r.file, r.unit]));
    assert.ok(intake.every((r) => r.coverage && r.decision && r.reason && r.verdict === null));
    assert.equal(intake.filter((r) => r.coverage === 'pending').length, 2);
    assert.equal(fs.readFileSync(audit, 'utf8'), '', 'no lane process, sandbox, or secret read');
    assert.ok(!preview.stdout.includes('## Verdicts') && preview.stdout.includes('| coverage | decision | reason |'));
    console.log('Preview: 6 matching rows; 2 pending; 0 lane processes; 0 sandbox executions; 0 secret reads');
    for (const file of ['.env', 'nested/.env.local', 'a.pem', 'a.key', 'id_rsa.pub', 'a.p12', 'a.pfx', 'a.jks']) assert.ok(secretPath(file), file);
    assert.ok(!secretPath('environment.ts'));
    const changes = Object.freeze([Object.freeze({ file: 'a.ts', units: Object.freeze([Object.freeze({ name: 'a', start: 1, end: 1, findings: Object.freeze([]) })]) })]);
    assert.deepEqual(selectUnits(changes), selectUnits(changes));
    assert.equal(coverageOf({ verdict: 'PASS-bounded', certificate: { lanes: { A: { verdict: 'ASK:timeout' } } } }), 'checked');
    assert.equal(coverageOf({ verdict: 'ASK', certificate: { lanes: { B: { verdict: 'ASK', reason: 'input 0: timeout' } } } }), 'failed:timeout');
    assert.equal(coverageOf({ verdict: 'ASK', certificate: { lanes: { B: { verdict: 'ASK:harness' } } } }), 'failed:harness');
    assert.equal(coverageOf({ verdict: 'ASK', certificate: { lanes: { A: { verdict: 'ASK:translation-defect' } } } }), 'failed:translation-defect');
    assert.equal(coverageOf({ verdict: 'ASK', certificate: { lanes: { A: { verdict: 'ASK:interface' } } } }), 'checked');
    for (const value of [-1, Infinity, NaN, '', undefined]) assert.throws(() => budgetValue(value, '--time-budget'));
    assert.throws(() => budgetValue(1.5, '--unit-budget', true));
    assert.equal(budgetValue(null, '--time-budget'), null);
    assert.equal(budgetValue(0, '--unit-budget', true), 0);
    assert.equal(budgetValue(0.5, '--time-budget'), 0.5);
    const budgets = [
      ['time', '--time-budget', '1', 'time-budget'],
      ['unit', '--unit-budget', '2', 'unit-budget'],
    ];
    for (const [label, flag, value, reason] of budgets) {
      const target = path.join(tmp, label + '.json');
      const result = spawnSync(process.execPath, [pr, ...args, flag, value, '--json', target], { encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      const partial = JSON.parse(fs.readFileSync(target, 'utf8'));
      const skipped = partial.rows.filter((r) => r.coverage === 'skipped:budget');
      assert.equal(partial.stop.reason, reason);
      assert.ok(partial.stop.reached < partial.stop.total);
      if (label === 'unit') assert.equal(partial.stop.reached, 2);
      assert.ok(skipped.length > 0);
      assert.ok(skipped.every((r) => r.reason === `stop at unit ${partial.stop.reached + 1} of ${partial.stop.total}`));
      assert.match(result.stdout, new RegExp(`stopped: ${reason} after ${partial.stop.reached} of ${partial.stop.total} units`));
      assert.deepEqual(partial.order.map((g) => g.group), ['changed', 'callers', 'heap']);
      assert.deepEqual(partial.order[0].units.map((u) => u.unit), ['inside', 'loader', 'refused']);
      assert.deepEqual(partial.order[2].units, []);
      console.log(label + ' budget JSON: ' + JSON.stringify({ stop: partial.stop, skipped: skipped.map(({ file, unit, coverage, reason }) => ({ file, unit, coverage, reason })) }));
    }
    const comment = path.resolve(here, '../../../ci/comment.mjs');
    const stoppedJSON = path.join(tmp, 'comment.json');
    for (const [block, code] of [['ask', 1], ['witness', 1], ['none', 0]]) {
      const result = spawnSync(process.execPath, [comment, ...args, '--unit-budget', '0', '--max-functions', '1', '--block', block, '--json', stoppedJSON], { encoding: 'utf8' });
      assert.equal(result.status, code, result.stderr);
      assert.match(result.stdout, /<sub>.*stopped: unit-budget after 0 of 3 units/);
      if (block !== 'none') assert.match(result.stderr, /::error::lean stopped: unit-budget/);
      console.log('comment --block ' + block + ': EXIT ' + result.status);
    }
    const commentCases = spawnSync(process.execPath, [path.resolve(here, '../../../ci/comment.test.mjs'), '--budget-only', '--budget-report', stoppedJSON], { encoding: 'utf8' });
    console.log(commentCases.stdout);
    assert.equal(commentCases.status, 0, commentCases.stderr + commentCases.stdout);
    const budgetPreview = spawnSync(process.execPath, ['--import', path.join(here, 'preview-audit.mjs'), pr, ...args, '--preview', '--time-budget', '0', '--unit-budget', '0', '--json', previewJson], { encoding: 'utf8', env: { ...process.env, LEAN_INTAKE_AUDIT: audit } });
    assert.equal(budgetPreview.status, 0, budgetPreview.stderr);
    assert.deepEqual(JSON.parse(fs.readFileSync(previewJson, 'utf8')), intake);
    assert.equal(fs.readFileSync(audit, 'utf8'), '');
    const ordered = intakeRepo(path.join(tmp, 'ordered'));
    const git = (...command) => {
      const r = spawnSync('git', ['-C', ordered.repo, ...command], { encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'lean', GIT_AUTHOR_EMAIL: 'lean@localhost', GIT_COMMITTER_NAME: 'lean', GIT_COMMITTER_EMAIL: 'lean@localhost', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' } });
      assert.equal(r.status, 0, r.stderr);
      return r.stdout.trim();
    };
    const insideFile = path.join(ordered.repo, 'inside.ts');
    fs.appendFileSync(insideFile, 'export function caller(x: number): number { return inside(x); }\n');
    fs.writeFileSync(path.join(ordered.repo, 'z.ts'), 'export function last(x: number): number { return x + 1; }\n');
    git('add', '.');
    git('commit', '-qm', 'Read the caller before the changed files');
    const before = git('rev-parse', 'HEAD');
    fs.writeFileSync(insideFile, fs.readFileSync(insideFile, 'utf8').replace('x + 2', 'x + 3'));
    fs.writeFileSync(path.join(ordered.repo, 'z.ts'), 'export function last(x: number): number { return x + 2; }\n');
    const orderJSON = path.join(tmp, 'order.json');
    const orderRun = spawnSync(process.execPath, [pr, '--repo', ordered.repo, '--base', before, '--unit-budget', '0', '--json', orderJSON], { encoding: 'utf8' });
    assert.equal(orderRun.status, 0, orderRun.stderr);
    const orderedReport = JSON.parse(fs.readFileSync(orderJSON, 'utf8'));
    assert.deepEqual(orderedReport.order.map((g) => [g.group, g.units.map((u) => u.unit)]), [['changed', ['inside', 'last']], ['callers', ['caller']], ['heap', []]]);
    assert.deepEqual(orderedReport.stop, { reason: 'unit-budget', reached: 0, total: 3 });
    assert.ok(orderedReport.rows.some((r) => r.unit === 'caller' && r.caller && r.coverage === 'skipped:budget'));
    console.log('Order: changed inside,last; callers caller; heap empty; all three rows skipped at zero units');
    return '6 rows; 6 coverage values; preview has no lane process; refusal keeps WITNESS; budgets and comment stops pass';
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log('PASS pr intake: ' + testIntake()); }
  catch (e) { console.error(e.stack); process.exitCode = 1; }
}
