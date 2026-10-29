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
  const result = await check({ parent: file, candidate: file, unit, project: false, n: 3, dafnySeconds: 30, scope });
  fs.writeFileSync(path.join(scratch, 'certificate.json'), JSON.stringify(result, null, 2));
  assert.deepEqual(result.certificate.lanes.A.heapCore, [unit], JSON.stringify(result.certificate.lanes.A));
  assert.equal(result.certificate.unit, unit);
});
