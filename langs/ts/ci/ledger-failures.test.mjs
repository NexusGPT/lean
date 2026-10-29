import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { buildChangeManifest, routeChanges } from './ledger.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const tmp = fs.mkdtempSync(path.join(root, '.ledger-failures-'));
const git = (...args) => {
  const r = spawnSync('git', ['-C', tmp, ...args], { encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'test', GIT_AUTHOR_EMAIL: 'test@localhost', GIT_COMMITTER_NAME: 'test', GIT_COMMITTER_EMAIL: 'test@localhost' } });
  assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
};
const failures = [];
try {
  git('init', '-q');
  fs.writeFileSync(path.join(tmp, 'deep.ts'), 'const value = 1;\n');
  fs.writeFileSync(path.join(tmp, '.gitattributes'), 'binary.dat -diff\n');
  fs.writeFileSync(path.join(tmp, 'binary.dat'), 'old\n');
  fs.writeFileSync(path.join(tmp, 'wide.ts'), 'const value = 1;\n');
  git('add', '-A'); git('commit', '-qm', 'base'); const base = git('rev-parse', 'HEAD');
  fs.writeFileSync(path.join(tmp, 'deep.ts'), 'const value = ' + '('.repeat(10000) + '2' + ')'.repeat(10000) + ';\n');
  fs.writeFileSync(path.join(tmp, 'binary.dat'), 'new\n');
  const m = buildChangeManifest({ repo: tmp, base, head: 'WORKTREE' });
  try { assert.equal(m.files.find(f => f.file === 'binary.dat').kind, 'binary'); }
  catch (e) { failures.push('Git-declared binary: ' + e.message); }
  try {
    const routed = routeChanges(m);
    assert(routed.edits.some(e => e.file === 'deep.ts' && e.primary.reason === 'parse-failure'));
    assert.equal(routed.reconciliation.complete, true);
  } catch (e) { failures.push('parser exception must become a record: ' + e.message); }
  fs.writeFileSync(path.join(tmp, 'deep.ts'), 'const value = 1;\n');
  fs.writeFileSync(path.join(tmp, 'wide.ts'), 'const value = ' + Array(10000).fill('1').join(' + ') + ';\n');
  try {
    const routed = routeChanges(buildChangeManifest({ repo: tmp, base, head: 'WORKTREE' }));
    assert.equal(routed.reconciliation.complete, true);
    assert(routed.edits.some(e => e.file === 'wide.ts' && e.primary.kind === 'unassigned'));
  } catch (e) { failures.push('syntax traversal exception must become a record: ' + e.message); }
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
for (const f of failures) console.error(f);
console.log(`ledger-failures.test: ${failures.length ? 'FAIL' : 'all assertions pass'}`);
process.exitCode = failures.length ? 1 : 0;
