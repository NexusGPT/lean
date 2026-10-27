import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { intakeRepo } from './build.mjs';
import { secretPath, selectUnits, coverageOf } from '../../../pr.mjs';

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
    const rows = JSON.parse(fs.readFileSync(json, 'utf8'));
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
    return '6 rows; 6 coverage values; preview has no lane process; refusal keeps WITNESS';
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log('PASS pr intake: ' + testIntake()); }
  catch (e) { console.error(e.stack); process.exitCode = 1; }
}
