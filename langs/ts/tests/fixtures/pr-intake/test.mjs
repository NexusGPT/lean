import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { intakeRepo } from './build.mjs';
import { secretPath, selectUnits, coverageOf, budgetValue, runIdentity, unitKey } from '../../../pr.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const pr = path.resolve(here, '../../../pr.mjs');
export function testIntake() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-intake-test-'));
  try {
    const refs = intakeRepo(path.join(tmp, 'repo'), { removeMissing: true });
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
      'gone.ts': 'removed',
    };
    console.log('JSON rows: ' + JSON.stringify(rows.map(({ file, unit, coverage }) => ({ file, unit, coverage }))));
    assert.equal(rows.length, 7, 'every changed fixture unit has a row, including .env and the deleted gone.ts');
    assert.deepEqual(Object.fromEntries(rows.map((r) => [r.file, r.coverage])), want);
    assert.equal(new Set(rows.map((r) => r.coverage)).size, 7);
    // a unit of a deleted file is a row of its own: the parent's name and lines, no lane, no verdict, no unit spent
    const gone = rows.find((r) => r.file === 'gone.ts');
    assert.deepEqual([gone.unit, gone.lines, gone.decision, gone.verdict, gone.reason], ['gone', [1, 1], 'removed', null, 'present at the parent, absent at the head']);
    assert.ok(gone.laneA === undefined && gone.laneB === undefined && gone.certificate === undefined, 'no lane ran on it');
    assert.ok(!report.order.some((g) => g.units.some((u) => u.unit === 'gone')), 'a removed unit is not in the spending list');
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
    assert.deepEqual(intake.find((r) => r.file === 'gone.ts'), { file: 'gone.ts', unit: 'gone', lines: [1, 1], coverage: 'removed', decision: 'removed', verdict: null, reason: 'present at the parent, absent at the head', advice: [] });
    assert.equal(fs.readFileSync(audit, 'utf8'), '', 'no lane process, sandbox, or secret read');
    assert.ok(!preview.stdout.includes('## Verdicts') && preview.stdout.includes('| coverage | decision | reason |'));
    console.log('Preview: 7 matching rows; 2 pending; 0 lane processes; 0 sandbox executions; 0 secret reads');
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
    // a function deleted from a file that stays is a removed row too; the unit beside the deleted lines is not a changed unit
    fs.writeFileSync(path.join(ordered.repo, 'z.ts'), 'export function other(x: number): number { return x; }\nexport function last(x: number): number { return x + 1; }\n');
    git('add', 'z.ts');
    git('commit', '-qm', 'Read two units in z.ts');
    const twoUnits = git('rev-parse', 'HEAD');
    fs.writeFileSync(path.join(ordered.repo, 'z.ts'), 'export function other(x: number): number { return x; }\n');
    const goneJSON = path.join(tmp, 'removed-function.json');
    const gonePreview = spawnSync(process.execPath, ['--import', path.join(here, 'preview-audit.mjs'), pr, '--repo', ordered.repo, '--base', twoUnits, '--preview', '--json', goneJSON], { encoding: 'utf8', env: { ...process.env, LEAN_INTAKE_AUDIT: audit } });
    assert.equal(gonePreview.status, 0, gonePreview.stderr);
    const goneRows = JSON.parse(fs.readFileSync(goneJSON, 'utf8')).filter((r) => r.file === 'z.ts'); // inside.ts still holds the earlier uncommitted edit
    assert.deepEqual(goneRows.map((r) => [r.file, r.unit, r.coverage, r.lines]), [['z.ts', 'last', 'removed', [2, 2]]], 'the deleted function is the only row; other is untouched');
    console.log('Removed function: ' + JSON.stringify(goneRows.map(({ file, unit, lines, coverage }) => ({ file, unit, lines, coverage }))));
    const identityParts = { base: 'base', head: 'head', unitSet: [{ file: 'a.ts', unit: 'a' }, { file: 'b.ts', unit: 'b' }],
      leanVersion: 'lean', libraryTableHash: 'library', adviceTableHash: 'advice', dafnyVersion: 'dafny' };
    assert.equal(runIdentity(identityParts), runIdentity({ ...identityParts, unitSet: [...identityParts.unitSet].reverse() }));
    for (const key of ['base', 'head', 'leanVersion', 'libraryTableHash', 'adviceTableHash', 'dafnyVersion']) {
      assert.notEqual(runIdentity(identityParts), runIdentity({ ...identityParts, [key]: 'changed' }), key);
    }
    const keyParts = { parentText: 'parent', candidateText: 'candidate', calleeSummaries: { parent: [], candidate: [] }, fileContext: {}, imports: {}, tsconfig: {},
      flags: { n: 100, seed: 1, dafnySeconds: 30, project: true, deep: false, scope: false, adapters: {} } };
    for (const key of ['parentText', 'candidateText', 'calleeSummaries', 'fileContext', 'imports', 'tsconfig']) {
      assert.notEqual(unitKey(keyParts), unitKey({ ...keyParts, [key]: 'changed' }), key);
    }
    for (const key of Object.keys(keyParts.flags)) {
      assert.notEqual(unitKey(keyParts), unitKey({ ...keyParts, flags: { ...keyParts.flags, [key]: 'changed' } }), key);
    }
    testRunIdentity();
    return '7 rows; 7 coverage values; preview has no lane process; refusal keeps WITNESS; budgets and comment stops pass';
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log('PASS pr intake: ' + testIntake()); }
  catch (e) { console.error(e.stack); process.exitCode = 1; }
}

// This fixture keeps one unrelated unit beside a chain of callers.
export function testRunIdentity() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-identity-test-'));
  const program = process.env.LEAN_IDENTITY_PR ? fs.realpathSync(process.env.LEAN_IDENTITY_PR) : pr;
  try {
    const refs = intakeRepo(path.join(tmp, 'repo'));
    const git = (...args) => {
      const result = spawnSync('git', ['-C', refs.repo, ...args], { encoding: 'utf8', env: { ...process.env,
        GIT_AUTHOR_NAME: 'lean', GIT_AUTHOR_EMAIL: 'lean@localhost', GIT_COMMITTER_NAME: 'lean',
        GIT_COMMITTER_EMAIL: 'lean@localhost', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' } });
      assert.equal(result.status, 0, result.stderr);
      return result.stdout.trim();
    };
    const source = path.join(refs.repo, 'chain.ts');
    fs.writeFileSync(path.join(refs.repo, 'types.ts'), 'export type Marker = number;\n');
    const config = path.join(refs.repo, 'tsconfig.json');
    fs.writeFileSync(config, JSON.stringify({ compilerOptions: { baseUrl: '.', paths: { '@local/*': ['./*'] } } }));
    fs.writeFileSync(source, [
      "import type { Marker } from '@local/types';",
      'type Local = number;',
      'const offset: Local = 0;',
      'export function leaf(x: number): number { return x + 1; }',
      'export function middle(x: number): number { return leaf(x); }',
      'export function caller(x: number): number { return middle(x); }',
      'export function other(x: number): number { return x + 1; }',
      '',
    ].join('\n'));
    git('add', 'chain.ts', 'types.ts', 'tsconfig.json');
    git('commit', '-qm', 'Read the original call chain');
    const base = git('rev-parse', 'HEAD');
    fs.writeFileSync(source, fs.readFileSync(source, 'utf8').replace('x + 1', 'x + 2').replace('x + 1', 'x + 3'));
    git('add', 'chain.ts');
    git('commit', '-qm', 'Read the changed leaf and unrelated unit');
    const cache = path.join(tmp, 'cache');
    const run = (label, extra = []) => {
      const json = path.join(tmp, label + '.json');
      const start = performance.now();
      const result = spawnSync(process.execPath, [program, '--repo', refs.repo, '--base', base, '--head', 'HEAD',
        '--n', '10', '--dafny-seconds', '1', '--cache-dir', cache, '--json', json, ...extra], { encoding: 'utf8' });
      const ms = performance.now() - start;
      assert.equal(result.status, 0, result.stderr + result.stdout);
      if (result.stderr) console.log(result.stderr.trim());
      const report = JSON.parse(fs.readFileSync(json, 'utf8'));
      console.log('Identity ' + label + ' rows: ' + report.rows.map((r) => r.unit + '=' + r.coverage).join(', '));
      console.log('Identity ' + label + ' wall ms: ' + ms.toFixed(3));
      assert.match(report.identity, /^[a-f0-9]{64}$/);
      assert.ok(result.stdout.includes('Identity: ' + report.identity));
      for (const row of report.rows) assert.ok(row.certificate?.identity);
      return { report, ms };
    };
    const cacheBytes = () => Object.fromEntries(fs.readdirSync(cache).filter((name) => name.endsWith('.json')).sort().map((name) => [name, fs.readFileSync(path.join(cache, name), 'utf8')]));
    const first = run('first');
    assert.deepEqual(first.report.rows.map((r) => r.unit), ['leaf', 'other', 'middle', 'caller']);
    assert.ok(first.report.rows.every((r) => r.coverage === 'checked'));
    assert.ok(first.report.rows.every((r) => r.certificate.identity === first.report.identity));
    const bytes = cacheBytes();
    const second = run('second', ['--reuse']);
    assert.equal(first.report.identity, second.report.identity);
    assert.ok(second.report.rows.every((r) => r.coverage === 'reused'));
    assert.deepEqual(cacheBytes(), bytes, 'cache files must remain byte identical on a hit');
    for (const row of first.report.rows) {
      const reused = second.report.rows.find((r) => r.unit === row.unit);
      assert.equal(JSON.stringify(reused.certificate), JSON.stringify(row.certificate));
      console.log('Identity certificate ' + row.unit + ': ' + createHash('sha256').update(JSON.stringify(row.certificate)).digest('hex') + ' byte identical');
      assert.match(reused.note, /^reused from [a-f0-9]{12}$/);
    }
    console.log('Identity first report and certificates: ' + first.report.identity);
    console.log('Identity certificates: 4 byte identical; cache files: 4 byte identical');
    console.log('Identity second percent of first: ' + (100 * second.ms / first.ms).toFixed(3));
    fs.writeFileSync(source, fs.readFileSync(source, 'utf8').replace('x + 2', 'x + 4'));
    git('add', 'chain.ts');
    git('commit', '-qm', 'Read the next leaf change');
    const changed = run('callee');
    assert.notEqual(changed.report.identity, first.report.identity);
    const actual = Object.fromEntries(changed.report.rows.map((r) => [r.unit, r.coverage]));
    assert.deepEqual(actual, { leaf: 'checked', other: 'reused', middle: 'checked', caller: 'checked' },
      'Changed callee texts must invalidate both direct and transitive callers');
    const fresh = run('fresh', ['--fresh']);
    assert.ok(fresh.report.rows.every((r) => r.coverage === 'checked'));
    assert.ok(fresh.report.rows.every((r) => r.certificate.identity === fresh.report.identity));
    console.log('Identity fresh: 0 reused; report and new certificate identities agree');
    fs.writeFileSync(path.join(refs.repo, 'types.ts'), 'export type Marker = string;\n');
    const imported = run('import');
    assert.ok(imported.report.rows.every((r) => r.coverage === 'checked'), 'a direct project import must invalidate the file');
    fs.appendFileSync(config, '\n');
    const configured = run('config');
    assert.ok(configured.report.rows.every((r) => r.coverage === 'checked'), 'resolved config contents must invalidate the file');
    fs.writeFileSync(source, fs.readFileSync(source, 'utf8').replace('offset: Local = 0', 'offset: Local = 1'));
    git('add', 'chain.ts');
    git('commit', '-qm', 'Read the changed module constant');
    const outside = run('outside');
    assert.ok(outside.report.rows.every((r) => r.coverage === 'checked'), 'text outside functions must invalidate the file');
    console.log('Identity dependency guards: direct import, resolved config and module constant each invalidate all 4 rows');
    return 'run identity and cache pass';
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
