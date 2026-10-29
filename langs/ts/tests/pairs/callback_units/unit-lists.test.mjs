import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as common from '../../../common.mjs';
import { agreeCore, dafnyName, check } from '../../../check.mjs';
const unit = "app.get('/a',1)#2";
const file = new URL('./captures.ts', import.meta.url).pathname;
const scratch = path.resolve('.lean/cache/callback-units/unit-lists');
fs.mkdirSync(scratch, { recursive: true });
test('one shared parser reads emitted unit names and ordinary lists', () => {
  assert.equal(typeof common.parseUnitList, 'function');
  assert.deepEqual(common.parseUnitList(['a', unit, 'b'].join(',')), ['a', unit, 'b']);
  assert.deepEqual(common.parseUnitList('a,b'), ['a', 'b']);
});
test('translator heap/effect flags and agreeCore round-trip the HEAP writer', () => {
  const dfyOf = side => path.join(scratch, `${side}.dfy`);
  const tr = (side, eff, heapUnits) => {
    const r = spawnSync(process.execPath, ['langs/ts/translate/translate.mjs', file, '--core', '--no-project', '--only', unit, '--heap', '--heap-units', heapUnits ?? unit, '--effectful', eff || unit, '--suffix', side, '--out', dfyOf(side)], { encoding: 'utf8' });
    process.stdout.write(r.stdout); process.stderr.write(r.stderr); console.log(`exit=${r.status}`);
    return { status: r.status, out: r.stdout + r.stderr };
  };
  const result = agreeCore({ files: { parent: file, candidate: file }, dfyOf, tr });
  assert.equal(result.failed, undefined);
  assert.deepEqual(result.parent.heap, [unit]);
  assert.deepEqual(result.candidate.heap, [unit]);
  assert.equal(result.parent.eff, unit);
  assert.equal(result.agreed, true);
});
test('certificate heapCore retains the source unit name emitted in HEAP', async () => {
  const scope = path.join(scratch, 'scope.json');
  fs.writeFileSync(scope, JSON.stringify({ functions: { [dafnyName(unit)]: { in_scope: 'false' } } }));
  // the candidate's callback reads `1 + n` for `n + 1`: equal, and not by a cheap rung (no rewrite commutes), so lane A runs
  const candidate = path.join(scratch, 'captures.candidate.ts');
  fs.writeFileSync(candidate, fs.readFileSync(file, 'utf8').replace("app.get('/a', 1, n => n + 1);", "app.get('/a', 1, n => 1 + n);"));
  assert.notEqual(fs.readFileSync(candidate, 'utf8'), fs.readFileSync(file, 'utf8'));
  const result = await check({ parent: file, candidate, unit, project: false, n: 3, dafnySeconds: 30, scope });
  fs.writeFileSync(path.join(scratch, 'certificate.json'), JSON.stringify(result, null, 2));
  assert.deepEqual(result.certificate.lanes.A.heapCore, [unit], JSON.stringify(result.certificate.lanes.A));
  assert.equal(result.certificate.unit, unit);
});
test('PR --scope reads a raw callback name containing a comma', () => {
  const repo = fs.mkdtempSync(path.join(scratch, 'scope-repo-'));
  const git = (...args) => { const r = spawnSync('git', ['-C', repo, '-c', 'user.name=lean', '-c', 'user.email=lean@example.invalid', ...args], { encoding: 'utf8' }); assert.equal(r.status, 0, `${r.stdout}${r.stderr}\nexit=${r.status}`); };
  const source = n => `const app = { get(_p: string, _i: number, _cb: (x: number) => number): void {} };\napp.get('/a',1,(x: number) => x + ${n});\n`;
  git('init', '-q'); fs.writeFileSync(path.join(repo, 'a.ts'), source(1)); git('add', 'a.ts'); git('commit', '-qm', 'base');
  fs.writeFileSync(path.join(repo, 'a.ts'), source(2));
  const out = path.join(scratch, 'scope-pr.json');
  const r = spawnSync(process.execPath, ['langs/ts/pr.mjs', '--repo', repo, '--base', 'HEAD', '--no-project', '--n', '3', '--scope', unit, '--json', out, '--out', path.join(scratch, 'scope-pr.md')], { encoding: 'utf8' });
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}\nexit=${r.status}`);
  assert.equal(JSON.parse(fs.readFileSync(out)).rows.find(r => r.unit === unit)?.verdict, 'IN-SCOPE');
});
