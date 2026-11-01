// The mutant study's runner (tests/mutants.mjs, design/w3b-mutant-study.md) on its fixture pair, tests/fixtures/mutants:
// two units whose every planted change lane B shows.
// 1. Every site `exec/mutate.mjs --list` names in each unit is a row of the study, of the same kind, in the same order:
//    the study's denominators are mutate.mjs's sites, none dropped and none added.
// 2. Every row is planted and its verdict is WITNESS, found by lane B with a named source; the table's `all` line says so.
// 3. The study's JSON holds no seconds and no path of its work folder, so two runs can compare byte for byte.
// --break: the runner drops mutate.mjs's dropped-effect sites (--without-kind dropped-effect); part 1 fails.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), ts = path.join(here, '..');
const BREAK = process.argv.includes('--break');
const pairs = path.join(here, 'fixtures', 'mutants');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-mutants-fixture-'));
try {
  const out = path.join(work, 'study.json'), md = path.join(work, 'study.md');
  const r = spawnSync(process.execPath, [path.join(here, 'mutants.mjs'), '--pairs', pairs, '--jobs', '2', '--work', path.join(work, 'w'), '--out', out, '--report', md, ...(BREAK ? ['--without-kind', 'dropped-effect'] : [])], { cwd: ts, encoding: 'utf8' });
  assert.equal(r.status, 0, `mutants.mjs exited ${r.status}: ${r.stderr}`);
  const study = JSON.parse(fs.readFileSync(out, 'utf8'));
  // 1. the sites, as mutate.mjs lists them
  const file = path.join(pairs, 'two_units', 'candidate.ts');
  const listed = [];
  for (const unit of ['label', 'total']) {
    const l = spawnSync(process.execPath, [path.join(ts, 'exec', 'mutate.mjs'), file, '--unit', unit, '--no-project', '--list'], { cwd: ts, encoding: 'utf8' });
    assert.equal(l.status, 0, l.stderr);
    for (const s of JSON.parse(l.stdout)) listed.push(`${unit} ${s.i} ${s.kind}`);
  }
  assert.ok(listed.some((s) => s.endsWith(' dropped-effect')), 'the fixture has dropped-effect sites');
  const rows = study.rows.map((x) => `${x.unit} ${x.index} ${x.kind}`);
  assert.deepEqual(rows, listed, 'every site mutate.mjs lists is a row of the study, in its order');
  // 2. all planted, all caught by lane B
  for (const x of study.rows) {
    assert.equal(x.verdict, 'WITNESS', `${x.unit} site ${x.index} (${x.kind}: ${x.was} -> ${x.text}) is caught; got ${x.verdict} (lane A ${x.laneA})`);
    assert.equal(x.foundLane, 'B'); assert.ok(x.foundBy && x.foundBy !== 'other', `${x.unit} site ${x.index}: the witness names its source`);
  }
  const all = fs.readFileSync(md, 'utf8').split('\n').find((l) => l.startsWith('| **all** |'));
  assert.equal(all, `| **all** | ${listed.length} | ${listed.length} | 0 | 0 | 0 | 0 | 0 | 100% | 0% | 0% | 0 |`, 'the table counts every mutant caught');
  // 3. nothing machine-dependent in the JSON
  const text = fs.readFileSync(out, 'utf8');
  assert.ok(!text.includes(work) && !/"seconds"/.test(text), 'the study JSON names no work path and no seconds');
  console.log(`mutants fixture: ${listed.length} sites of 2 units, every one planted and caught (lane B)`);
} finally { fs.rmSync(work, { recursive: true, force: true }); }
