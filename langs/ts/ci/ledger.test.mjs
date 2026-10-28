import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { prReport } from '../pr.mjs';
// Reproduce the frozen former-empty cohort and terminal accounting without changing any benchmark file.
if (process.argv.includes('--measure')) {
  const arg = flag => process.argv[process.argv.indexOf(flag) + 1];
  const bm = path.resolve(arg('--measure')), results = path.resolve(arg('--results')), output = path.resolve(arg('--out'));
  const readJSON = f => JSON.parse(fs.readFileSync(f, 'utf8'));
  const caseFiles = dir => fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => readJSON(path.join(dir, f)));
  const previous = caseFiles(path.join(bm, 'runs/lanes12-92eebd9/cases'));
  const current = caseFiles(path.join(results, 'cases'));
  const empty = new Set(previous.filter(c => c.report && !c.report.rows.length).map(c => c.id));
  const defects = readJSON(path.join(bm, 'manifests/lane1-public-defects.v1.json')).records;
  const records = defects.filter(r => empty.has(r.id));
  const { buildChangeManifest, routeChanges } = await import('./ledger.mjs');
  const cases = [], incidence = {}, primary = {};
  const priority = ['object-literal member', 'exported property assignment', 'module-level statement', 'untyped JavaScript file', 'comment', 'whitespace'];
  for (const rec of records) {
    const ledger = routeChanges(buildChangeManifest({ repo: rec.repository.local_clone, base: rec.before.commit, head: rec.after.commit }));
    const reasons = [...new Set(ledger.edits.filter(e => e.primary.kind === 'unassigned').map(e => e.primary.reason))].sort();
    const artifacts = [...new Set(ledger.edits.filter(e => e.primary.kind === 'artifact').map(e => e.primary.reason))].sort();
    for (const reason of reasons) incidence[reason] = (incidence[reason] ?? 0) + 1;
    const bucket = priority.find(r => reasons.includes(r)) ?? (reasons.length ? reasons.join(' + ') : 'artifact-only');
    primary[bucket] = (primary[bucket] ?? 0) + 1;
    const actual = current.find(r => r.id === rec.id);
    cases.push({ id: rec.id, ledger: ledger.id, edits: ledger.edits.length, reasons, artifacts, primary: bucket,
      reconciled: ledger.reconciliation.complete, reported: !!actual?.report?.rows?.length });
  }
  const summaries = rs => ({ cases: rs.length, errors: rs.filter(r => r.error).map(r => ({ id: r.id, error: r.error })),
    emptyReports: rs.filter(r => r.report && !r.report.rows?.length).map(r => r.id),
    rows: rs.reduce((n, r) => n + (r.report?.rows?.length ?? 0), 0) });
  const reports = current.flatMap(r => r.report ? [r.report] : []);
  const expected = reports.reduce((n, r) => n + (r.reconciliation?.expected?.length ?? 0), 0);
  const terminal = reports.reduce((n, r) => n + (r.reconciliation?.terminal?.length ?? 0), 0);
  const result = { before: summaries(previous), after: summaries(current), cohort: cases.length, priority, primary, incidence,
    reconciliation: { reports: reports.length, complete: reports.filter(r => r.reconciliation?.complete).length,
      expected, terminal, missing: reports.flatMap(r => r.reconciliation?.missing ?? []), unexpected: reports.flatMap(r => r.reconciliation?.unexpected ?? []) },
    cases };
  fs.writeFileSync(output, JSON.stringify(result, null, 1));
  console.log(JSON.stringify({ ...result, cases: undefined }, null, 1));
  process.exit(0);
}

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
  write('configuration.ts', 'export function configure(x: number) { return x + 1; }\n');
  git('add', '-A'); git('commit', '-qm', 'classified source base'); const classifiedBase = git('rev-parse', 'HEAD');
  write('configuration.ts', 'export function configure(x: number) { return x + 2; }\n');
  const classified = routeChanges(buildChangeManifest({ repo: tmp, base: classifiedBase, head: 'WORKTREE' }));
  assert.equal(classified.files.find(f => f.file === 'configuration.ts').class, 'config');
  assert(classified.edits.some(e => e.primary.kind === 'unit' && e.primary.unit === 'configure'), 'an artifact class must not suppress an eligible listed unit');
  write('yarn.lock', Array.from({ length: 50 }, (_, i) => `entry-${i}@1`).join('\n') + '\n');
  git('add', '-A'); git('commit', '-qm', 'lock base'); const lockBase = git('rev-parse', 'HEAD');
  write('yarn.lock', Array.from({ length: 50 }, (_, i) => `entry-${i}@2`).join('\n') + '\n');
  const { ledgerRows } = await import('./ledger.mjs');
  const locked = routeChanges(buildChangeManifest({ repo: tmp, base: lockBase, head: 'WORKTREE' }));
  const lockRows = ledgerRows(locked);
  assert.equal(lockRows.length, 1, 'one hunk of one route is one ASK row, not one row per line');
  assert.equal(lockRows[0].coverage, 'artifact:lockfile');
  assert.deepEqual(lockRows.flatMap(r => r.editIds).sort(), locked.edits.filter(e => e.primary.kind !== 'unit').map(e => e.id).sort(), 'every non-unit edit identity is on exactly one row');
  // One hunk, one route (untyped JavaScript), two syntactic contexts: two rows that must not share a task identity.
  write('plain.js', '// one\nvar a = 1;\n');
  git('add', '-A'); git('commit', '-qm', 'js base'); const jsBase = git('rev-parse', 'HEAD');
  write('plain.js', '// two\nvar a = 2;\n');
  const jsRows = ledgerRows(routeChanges(buildChangeManifest({ repo: tmp, base: jsBase, head: 'WORKTREE' })));
  assert(jsRows.length >= 2, 'a comment and a statement in one hunk keep their own contexts');
  assert.equal(new Set(jsRows.map(r => r.file + '\0' + r.unit)).size, jsRows.length, 'row identities are unique within a change');
  // A recoverable diagnostic far from the edit (a legacy octal) must not hide the changed function from the checker.
  write('octal.ts', 'const mode = 0777;\nexport function g(x: number) { return x + 1; }\n');
  git('add', '-A'); git('commit', '-qm', 'octal base'); const octalBase = git('rev-parse', 'HEAD');
  write('octal.ts', 'const mode = 0777;\nexport function g(x: number) { return x + 2; }\n');
  const octal = routeChanges(buildChangeManifest({ repo: tmp, base: octalBase, head: 'WORKTREE' }));
  assert(octal.files[0].parseDiagnostics ?? octal.files[0].parseFailures, 'the fixture carries a diagnostic');
  assert(octal.edits.every(e => e.primary.kind === 'unit' && e.primary.unit === 'g'), 'a diagnostic outside the edit leaves the unit route');
  console.log('ledger.test: all assertions pass');
} finally { fs.rmSync(tmp, { recursive: true, force: true }); }
