import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import * as common from '../../../common.mjs';
import { check } from '../../../check.mjs';
const file = new URL('./unit-list-source.ts', import.meta.url).pathname;
const sf = common.ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), common.ts.ScriptTarget.Latest, true);
const name = [...common.topLevelFunctions(sf).values()].find(u => u.form === 'callback').name;
test('unit-list inverse preserves callee source comments and newlines without changing ordinary names', () => {
  assert.equal(typeof common.formatUnitList, 'function');
  const names = ['a', name, "app.get('/a',1)#2", 'call\u2028.get()#0', 'call\u2029.get()#0', 'b'];
  const text = common.formatUnitList(names);
  assert.doesNotMatch(text, /[\r\n\u2028\u2029]/);
  assert.deepEqual(common.parseUnitList(text), names);
  assert.equal(common.formatUnitList(['a', "app.get('/a',1)#2", 'b']), "a,app.get('/a',1)#2,b");
});
test('HEAP and certificate round-trip the exact multiline source identity', async () => {
  const result = await check({ parent: file, candidate: file, unit: name, project: false, n: 3, dafnySeconds: 30 });
  const out = path.resolve('.lean/cache/callback-units/source-list-certificate.json');
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  assert.deepEqual(result.certificate.lanes.A.heapCore, [name], JSON.stringify(result.certificate.lanes.A));
  assert.equal(result.certificate.unit, name);
  assert.equal(result.verdict, 'PASS-proved');
});

test('--fn transports the source identity safely in generated comments', () => {
  const out = path.resolve('.lean/cache/callback-units/source-fn.dfy');
  const t = spawnSync(process.execPath, ['langs/ts/translate/translate.mjs', file, '--core', '--no-project', '--fn', name, '--out', out], { encoding: 'utf8' });
  assert.equal(t.status, 0, `${t.stdout}${t.stderr}\nexit=${t.status}`);
  const d = spawnSync('dafny', ['verify', '--verification-time-limit', '30', out], { encoding: 'utf8' });
  assert.equal(d.status, 0, `${d.stdout}${d.stderr}\nexit=${d.status}`);
});
