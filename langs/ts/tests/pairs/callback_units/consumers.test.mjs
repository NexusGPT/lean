import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadProgram, topLevelFunctions, findingUnit } from '../../../common.mjs';
import { lintFile } from '../../../lint/lint.mjs';
const root = path.resolve('langs/ts/tests');
const selected = JSON.parse(fs.readFileSync(path.join(root, 'cases.json'))).filter(c => /^(callback_cells|lint_misfires|index_callbacks)/.test(c.name));
const out = path.resolve('.lean/cache/callback-units/consumer.dfy');
test('named construct/differential consumers select the named unit', () => {
  for (const c of selected) {
    const file = path.join(root, 'cases', c.file), loaded = loadProgram(file), units = topLevelFunctions(loaded.sf);
    assert.deepEqual(lintFile(file, null, { loaded }).filter(f => findingUnit(loaded.sf, units, f)?.name === c.fn), [], c.name);
    const r = spawnSync(process.execPath, ['langs/ts/translate/translate.mjs', file, '--core', '--only', c.fn, '--out', out], { encoding: 'utf8' });
    assert.equal(r.status, 0, `${c.name}\n${r.stdout}${r.stderr}\nexit=${r.status}`);
    const d = spawnSync('dafny', ['run', '--no-verify', '--target:py', out], { encoding: 'utf8' });
    assert.equal(d.status, 0, `${c.name}\n${d.stdout}${d.stderr}\nexit=${d.status}`);
  }
});
