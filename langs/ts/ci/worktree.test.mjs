import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { prReport } from '../pr.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const tmp = fs.mkdtempSync(path.join(root, '.worktree-test-'));
const git = (...args) => {
  const r = spawnSync('git', ['-C', tmp, ...args], { encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'test', GIT_AUTHOR_EMAIL: 'test@localhost', GIT_COMMITTER_NAME: 'test', GIT_COMMITTER_EMAIL: 'test@localhost' } });
  assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
};
try {
  git('init', '-q'); fs.writeFileSync(path.join(tmp, 'old.ts'), 'export function old() { return 1; }\n');
  git('add', '-A'); git('commit', '-qm', 'base'); const base = git('rev-parse', 'HEAD');
  fs.writeFileSync(path.join(tmp, 'added.ts'), 'export function added(x: number) { return x + 1; }\n'); git('add', 'added.ts');
  const before = git('status', '--porcelain');
  const rows = await prReport({ repo: tmp, base, head: 'WORKTREE', preview: true, project: false, runsDir: path.join(tmp, '.runs'), cacheDir: path.join(tmp, '.cache') });
  assert(rows.some(r => r.unit === 'added' && r.coverage === 'skipped:preview'), 'staged added source is present in the private WORKTREE snapshot');
  assert.equal(rows.reconciliation.complete, true);
  assert(!fs.existsSync(path.join(rows.runDir, 'sources')), 'the private source snapshot is removed once the run is terminal');
  assert(fs.existsSync(path.join(rows.runDir, 'terminal.json')), 'the durable ledger stays');
  assert(!fs.readdirSync(tmp).some(f => f.startsWith('.lean_')), 'no temporary source siblings in the input checkout');
  assert(git('status', '--porcelain').includes(before));
  const listed = JSON.parse(fs.readFileSync(path.join(rows.runDir, 'sources.json'), 'utf8'));
  assert(listed.files.some(f => f.file === 'added.ts' && /^[a-f0-9]{64}$/.test(f.sha256)), 'the snapshot leaves its hash list');
  // A snapshot over the cap is refused before a byte is written: a named terminal state, a complete reconciliation.
  const capped = await prReport({ repo: tmp, base, head: 'WORKTREE', preview: true, project: false, runsDir: path.join(tmp, '.runs-cap'), cacheDir: path.join(tmp, '.cache'), snapshotCapBytes: 1 });
  const unitRow = capped.find(r => r.unit === 'added');
  assert.equal(unitRow?.coverage, 'failed:snapshot-cap', 'a unit whose snapshot was refused ends failed:snapshot-cap');
  assert.equal(capped.reconciliation.complete, true);
  assert(!fs.existsSync(path.join(capped.runDir, 'sources')), 'nothing written past the cap');
  console.log('worktree.test: all assertions pass');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
