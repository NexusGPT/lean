import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { prReport } from '../pr.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const tmp = fs.mkdtempSync(path.join(root, '.ledger-test-'));
const git = (...args) => {
  const r = spawnSync('git', ['-C', tmp, ...args], { encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 'test', GIT_AUTHOR_EMAIL: 'test@localhost', GIT_COMMITTER_NAME: 'test', GIT_COMMITTER_EMAIL: 'test@localhost' } });
  assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
};
const write = (name, text) => { fs.mkdirSync(path.dirname(path.join(tmp, name)), { recursive: true }); fs.writeFileSync(path.join(tmp, name), text); };
try {
  git('init', '-q');
  write('object.ts', 'module.exports = { method(x: number) { return x + 1; } };\n');
  write('package-lock.json', '{"lockfileVersion":1}\n'); write('asset.bin', Buffer.from([0, 1]));
  write('mode.txt', 'mode\n'); write('move.ts', 'export function moved(x: number) { return x; }\n');
  write('deleted.ts', 'export function gone() { return 1; }\n');
  git('add', '-A'); git('commit', '-qm', 'base'); const base = git('rev-parse', 'HEAD');
  write('object.ts', 'module.exports = { method(x: number) { return x + 2; } };\n');
  write('package-lock.json', '{"lockfileVersion":2}\n'); write('asset.bin', Buffer.from([0, 2]));
  fs.chmodSync(path.join(tmp, 'mode.txt'), 0o755); git('mv', 'move.ts', 'moved.ts');
  git('rm', 'deleted.ts'); write('empty.ts', ''); write('bad.ts', 'export function ( {\n');
  git('add', '-A'); git('commit', '-qm', 'head'); const head = git('rev-parse', 'HEAD');
  if (!process.argv.includes('--frame-only')) {
  const rows = await prReport({ repo: tmp, base, head, preview: true, project: false });
  assert(rows.some(r => r.file === 'object.ts' && r.verdict === 'ASK' && /object-literal member/.test(r.reason)), 'an unlisted object member must have a named ASK');
  assert(rows.some(r => r.file === 'asset.bin' && r.coverage === 'artifact:binary'), 'binary artifact row');
  assert(rows.some(r => r.file === 'package-lock.json' && r.coverage === 'artifact:lockfile'), 'lockfile artifact row');
  }
  const { buildChangeManifest, routeChanges, reconcileEdits } = await import('./ledger.mjs');
  const m = buildChangeManifest({ repo: tmp, base, head });
  assert.equal(m.files.length, 8);
  assert(m.files.some(f => f.kind === 'mode-only'));
  assert(m.files.some(f => f.kind === 'rename/move' && f.oldPath === 'move.ts' && f.newPath === 'moved.ts'));
  if (!process.argv.includes('--frame-only')) {
  routeChanges(m);
  assert(m.edits.some(e => e.primary.reason === 'parse-failure'));
  assert(m.edits.some(e => e.primary.kind === 'unit' && e.primary.unit === 'gone' && e.primary.side === 'old'));
  const r = reconcileEdits(m);
  assert.equal(r.complete, true); assert.deepEqual([...r.unit, ...r.artifact, ...r.unassigned].sort(), r.expected.slice().sort());
  assert.throws(() => reconcileEdits({ ...m, edits: [...m.edits, m.edits[0]] }), /duplicate/);
  assert.deepEqual(routeChanges(buildChangeManifest({ repo: tmp, base, head })).edits, m.edits, 'identities are reproducible');
  }
  write('mixed.ts', 'export function f() { return 1; } module.exports.x = 1;\n');
  git('add', '-A'); git('commit', '-qm', 'mixed base'); const mixedBase = git('rev-parse', 'HEAD');
  write('mixed.ts', 'export function f() { return 2; } module.exports.x = 2;\n');
  const mixed = routeChanges(buildChangeManifest({ repo: tmp, base: mixedBase, head: 'WORKTREE' }));
  assert(mixed.edits.some(e => e.primary.kind === 'unit' && e.primary.unit === 'f'));
  assert(mixed.edits.some(e => e.primary.reason === 'exported property assignment'), 'a same-line unit must not swallow a module-level edit');
  assert.equal(reconcileEdits(mixed).complete, true);
  console.log('ledger.test: all assertions pass');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
