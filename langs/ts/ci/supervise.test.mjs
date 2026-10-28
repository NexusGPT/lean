import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const tmp = fs.mkdtempSync(path.join(root, '.supervise-test-'));
const git = (...args) => {
  const r = spawnSync('git', ['-C', tmp, ...args], { encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'test', GIT_AUTHOR_EMAIL: 'test@localhost', GIT_COMMITTER_NAME: 'test', GIT_COMMITTER_EMAIL: 'test@localhost' } });
  assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
};
try {
  git('init', '-q'); fs.writeFileSync(path.join(tmp, 'a.ts'), 'export function f(x: number) { return x + 1; }\n');
  git('add', '-A'); git('commit', '-qm', 'base'); const base = git('rev-parse', 'HEAD');
  fs.writeFileSync(path.join(tmp, 'a.ts'), 'export function f(x: number) { return x + 2; }\n');
  git('add', '-A'); git('commit', '-qm', 'head'); const head = git('rev-parse', 'HEAD');
  const run = fault => spawnSync(process.execPath, [path.join(root, 'langs/ts/pr.mjs'), '--repo', tmp, '--base', base, '--head', head, '--no-project', '--n', '1', '--dafny-seconds', '1', '--runs-dir', path.join(tmp, fault), '--json', path.join(tmp, `${fault}.json`)], { encoding: 'utf8', env: { ...process.env, LEAN_LEDGER_TEST_FAULT: fault }, timeout: 60000 });
  for (const fault of ['worker-crash', 'report-crash']) {
    const r = run(fault);
    const dirs = fs.readdirSync(path.join(tmp, fault)).filter(n => n.startsWith('run-'));
    assert.equal(dirs.length, 1, 'one private run directory');
    const terminal = JSON.parse(fs.readFileSync(path.join(tmp, fault, dirs[0], 'terminal.json')));
    assert.equal(terminal.reconciliation.complete, true);
    assert.deepEqual(terminal.reconciliation.expected.slice().sort(), terminal.reconciliation.terminal.slice().sort());
    assert.equal(terminal.tasks.length, 1);
    if (fault === 'worker-crash') {
      assert.equal(terminal.tasks[0].state, 'crash');
      assert.equal(terminal.rows[0].coverage, 'failed:crash');
      assert.equal(r.status, 0, r.stderr);
    } else {
      assert.equal(r.status, 1, r.stderr);
      assert.equal(terminal.tasks[0].state, 'done');
      assert.equal(terminal.rows[0].verdict, 'WITNESS');
      assert(terminal.tasks[0].artifact.sha256);
    }
  }
  const { supervise, createRun, reconcileTasks, commitArtifact } = await import('./supervise.mjs');
  const manifest = { id: 'test', files: [], edits: [] };
  for (const [label, code, state] of [
    ['timeout', 'setTimeout(() => {}, 60000)', 'timeout'],
    ['missing', '', 'incomplete-artifact'],
    ['crash', 'process.exit(7)', 'crash'],
  ]) {
    const run = createRun(path.join(tmp, label), manifest, [{ id: 't', file: 'a.ts', unit: 'f', lanes: ['B', 'A'], lines: [1, 1] }]);
    const result = await supervise(run, { command: process.execPath, args: ['-e', code], timeoutMs: label === 'timeout' ? 100 : 10000 });
    assert.equal(result.tasks[0].state, state);
    assert.equal(result.reconciliation.complete, true);
  }
  const abandoned = createRun(path.join(tmp, 'lost'), manifest, [{ id: 't', file: 'a.ts', unit: 'f', lanes: ['B', 'A'], lines: [1, 1] }]);
  assert.equal(reconcileTasks(abandoned, { state: 'lost-worker' }).tasks[0].state, 'lost-worker');
  const tampered = createRun(path.join(tmp, 'tampered'), manifest, [{ id: 't', file: 'a.ts', unit: 'f', lanes: [], lines: [1, 1] }]);
  const a = commitArtifact(tampered, 't', { file: 'a.ts', unit: 'f', lines: [1, 1], verdict: 'ASK', coverage: 'checked' });
  fs.appendFileSync(a.path, 'corrupt');
  assert.equal(reconcileTasks(tampered, { state: 'incomplete-artifact' }).tasks[0].state, 'incomplete-artifact');
  console.log('supervise.test: all assertions pass');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
