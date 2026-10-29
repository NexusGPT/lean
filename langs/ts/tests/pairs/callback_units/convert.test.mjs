import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const scratch = path.resolve('.lean/cache/callback-units/conversions');
fs.mkdirSync(scratch, { recursive: true });
test('foreach conversion keeps enclosing verdicts when nested callbacks disappear', () => {
  const fixture = path.resolve('langs/ts/tests/fixtures/convert/foreach'), repo = fs.mkdtempSync(path.join(scratch, 'repo-'));
  fs.copyFileSync(path.join(fixture, 'before.ts'), path.join(repo, 'unit.ts'));
  for (const args of [['init', '-q'], ['add', '-A'], ['-c', 'user.email=lean@example.invalid', '-c', 'user.name=lean', 'commit', '-qm', 'base']]) {
    const r = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8' }); assert.equal(r.status, 0, `${r.stdout}${r.stderr}\nexit=${r.status}`);
  }
  const out = path.join(repo, 'result.json');
  const r = spawnSync(process.execPath, ['langs/ts/convert.mjs', repo, '--no-project', '--n', '5', '--dafny-seconds', '30', '--json', out], { encoding: 'utf8' });
  process.stdout.write(r.stdout); process.stderr.write(r.stderr); console.log(`exit=${r.status}`);
  assert.equal(r.status, 0);
  const result = JSON.parse(fs.readFileSync(out))[0];
  assert.equal(result.files[0].reverted, null);
  assert.equal(fs.readFileSync(path.join(repo, 'unit.ts'), 'utf8'), fs.readFileSync(path.join(fixture, 'after.ts'), 'utf8'));
  for (const row of result.rows.filter(r => r.unit.includes('/'))) {
    assert.ok(row.verdict.startsWith('PASS'), JSON.stringify(row));
    assert.match(row.reason, /^covered-by: /);
  }
});
