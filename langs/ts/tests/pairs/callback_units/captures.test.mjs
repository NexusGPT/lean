import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { lintFile } from '../../../lint/lint.mjs';
import { translate } from '../../../translate/translate.mjs';
import { acquire, release } from './census-lock.mjs';
import { census } from '../../../census.mjs';
const file = new URL('./captures.ts', import.meta.url).pathname;
const scratch = path.resolve('.lean/cache/callback-units/probes');
fs.mkdirSync(scratch, { recursive: true });
test('captured input is explicit; a later write refuses only the callback', () => {
  const findings = lintFile(file, null, { project: false }).filter(f => !f.env);
  assert.deepEqual(findings.filter(f => f.rule === 'captured-mutable').map(f => f.unit), ['mutable/xs.map()#0']);
  assert.deepEqual(findings.filter(f => ['stable', 'mutable', 'stable/xs.map()#0'].includes(f.unit)), []);
  const result = translate(file, null, { core: true, project: false, only: ['stable/xs.map()#0'] });
  assert.match(result.main, /n: int, p: int, c: int, k: int/);
  assert.match(result.main, /n.*\+.*p.*\+.*c.*\+.*k/);
  const reportOut = path.join(scratch, 'gate.json');
  translate(file, null, { core: true, project: false, only: ['mutable', 'mutable/xs.map()#0'], tolerant: true, reportOut });
  const report = JSON.parse(fs.readFileSync(reportOut));
  assert.deepEqual(report.lintedOut.map(r => [r.unit, r.rule]), [['mutable/xs.map()#0', 'captured-mutable']]);
  assert.ok(report.translated.includes('mutable'));
});
test('census respects the named finding and keeps the enclosing unit admitted', async () => {
  // A tiny dedicated root, outside the census walk's excluded tests directory.
  const root = path.join(scratch, 'census'); fs.mkdirSync(root, { recursive: true });
  fs.copyFileSync(file, path.join(root, 'source.ts'));
  await acquire();
  let result;
  try {
  const disk = spawnSync('df', ['-k', '/'], { encoding: 'utf8' }); process.stdout.write(disk.stdout); process.stderr.write(disk.stderr); console.log(`exit=${disk.status}`);
  assert.equal(disk.status, 0); assert.ok(Number(disk.stdout.trim().split('\n').at(-1).trim().split(/\s+/)[3]) >= 10 * 1024 * 1024);
  result = census(root);
  } finally { release(); }
  const hits = result.records[0].findings.filter(f => f.rule === 'captured-mutable');
  assert.deepEqual(hits.map(f => f.unit), ['mutable/xs.map()#0']);
  assert.equal(result.refused, 1);
});
test('--only splits lists at top-level commas, including a name in any position', () => {
  for (const only of ["app.get('/a',1)#2", "a,b", "a,app.get('/a',1)#2,b"]) {
    const run = spawnSync(process.execPath, ['langs/ts/translate/translate.mjs', file, '--core', '--no-project', '--only', only, '--out', path.join(scratch, 'only.dfy')], { encoding: 'utf8' });
    assert.equal(run.status, 0, `only=${only}\nstdout=${run.stdout}\nstderr=${run.stderr}\nexit=${run.status}`);
  }
});
