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
  assert(!fs.readdirSync(tmp).some(f => f.startsWith('.lean_')), 'no temporary source siblings in the input checkout');
  assert(git('status', '--porcelain').includes(before));
  console.log('worktree.test: all assertions pass');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
