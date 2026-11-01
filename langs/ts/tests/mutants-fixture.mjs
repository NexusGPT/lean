// The mutant study's runner (tests/mutants.mjs, design/w3b-mutant-study.md) on its fixture pairs, tests/fixtures/mutants:
// two_units (the first kinds) and new_kinds (one unit per later kind of exec/mutate.mjs), whose every planted change lane
// B shows.
// 1. Every site `exec/mutate.mjs --list` names in each unit is a row of the study, of the same kind, in the same order,
//    with the same edited lines: the study's denominators are mutate.mjs's sites, none dropped and none added. Every kind
//    the runner counts (mutants.mjs KINDS) has a site in the fixture.
// 2. Every row is planted and its verdict is WITNESS, found by lane B with a named source; the table's `all` line says so.
// 3. The study's JSON holds no seconds and no path of its work folder, so two runs can compare byte for byte.
// 4. An equivalent mutant is not a site: `s ?? ""` on a string has no coalesce site (new_kinds orEmpty).
// 5. A site of a later kind is the file's own text: `was` is the text in [start, end), and the mutant mutate.mjs plants is
//    text[:start] + text + text[end:].
// --break [kind]: the runner drops mutate.mjs's sites of that kind (--without-kind; dropped-effect by default); part 1 fails.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadProgram, topLevelFunctions } from '../common.mjs';
import { sitesOf, mutate } from '../exec/mutate.mjs';
import { KINDS } from './mutants.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), ts = path.join(here, '..');
const bi = process.argv.indexOf('--break');
const BREAK = bi < 0 ? null : (process.argv[bi + 1] && !process.argv[bi + 1].startsWith('--') ? process.argv[bi + 1] : 'dropped-effect');
const LATER = new Set(KINDS.slice(KINDS.indexOf('boolean')));
const pairs = path.join(here, 'fixtures', 'mutants');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-mutants-fixture-'));
try {
  const out = path.join(work, 'study.json'), md = path.join(work, 'study.md');
  const r = spawnSync(process.execPath, [path.join(here, 'mutants.mjs'), '--pairs', pairs, '--jobs', '2', '--work', path.join(work, 'w'), '--out', out, '--report', md, ...(BREAK ? ['--without-kind', BREAK] : [])], { cwd: ts, encoding: 'utf8' });
  assert.equal(r.status, 0, `mutants.mjs exited ${r.status}: ${r.stderr}`);
  const study = JSON.parse(fs.readFileSync(out, 'utf8'));
  // 1. the sites, as mutate.mjs lists them, pair by pair and unit by unit in the study's order
  const listed = [], kinds = new Set();
  let units = 0;
  for (const p of fs.readdirSync(pairs).sort()) {
    const file = path.join(pairs, p, 'candidate.ts');
    const names = [...topLevelFunctions(loadProgram(file, { project: false }).sf).values()].filter((u) => !u.enclosingUnit).map((u) => u.name).sort();
    for (const unit of names) {
      units++;
      const l = spawnSync(process.execPath, [path.join(ts, 'exec', 'mutate.mjs'), file, '--unit', unit, '--no-project', '--list'], { cwd: ts, encoding: 'utf8' });
      assert.equal(l.status, 0, l.stderr);
      for (const s of JSON.parse(l.stdout)) { listed.push(`${p} ${unit} ${s.i} ${s.kind} ${s.lines.join('-')}`); kinds.add(s.kind); }
      // 5. a later kind's site is the file's text, and its mutant is that edit and nothing else
      const { sites, text } = sitesOf(file, unit, { project: false });
      sites.forEach((s, i) => {
        if (!LATER.has(s.kind)) return;
        assert.equal(text.slice(s.start, s.end), s.was, `${unit} site ${i} (${s.kind}): was is the file's text`);
        const m = mutate(file, unit, i, { project: false });
        assert.ok(m && m.skipped === 0, `${unit} site ${i} (${s.kind}) is planted`);
        assert.equal(m.source, text.slice(0, s.start) + s.text + text.slice(s.end), `${unit} site ${i} (${s.kind}): the mutant is text[:start] + text + text[end:]`);
      });
    }
  }
  for (const k of KINDS) assert.ok(kinds.has(k), `the fixture has a ${k} site`);
  // an equivalent coalesce is not a site: new_kinds orEmpty is s ?? "" on a string
  assert.ok(!listed.some((x) => x.startsWith('new_kinds orEmpty ') && x.includes(' coalesce ')), 'orEmpty (s ?? "" on a string) has no coalesce site');
  const rows = study.rows.map((x) => `${x.where} ${x.unit} ${x.index} ${x.kind} ${x.lines.join('-')}`);
  assert.deepEqual(rows, listed, 'every site mutate.mjs lists is a row of the study, in its order');
  // 2. all planted, all caught by lane B
  for (const x of study.rows) {
    assert.equal(x.verdict, 'WITNESS', `${x.unit} site ${x.index} (${x.kind}: ${x.was} -> ${x.text}) is caught; got ${x.verdict} (lane A ${x.laneA})`);
    assert.equal(x.foundLane, 'B'); assert.ok(x.foundBy && x.foundBy !== 'other', `${x.unit} site ${x.index}: the witness names its source`);
  }
  const all = fs.readFileSync(md, 'utf8').split('\n').find((l) => l.startsWith('| **all** |'));
  assert.equal(all, `| **all** | ${listed.length} | ${listed.length} | 0 | 0 | 0 | 0 | 0 | 100% | 0% | 0% | 0 |`, 'the table counts every mutant caught');
  // 3. nothing machine-dependent in the JSON
  const json = fs.readFileSync(out, 'utf8');
  assert.ok(!json.includes(work) && !/"seconds"/.test(json), 'the study JSON names no work path and no seconds');
  console.log(`mutants fixture: ${listed.length} sites of ${units} units, ${kinds.size} kinds, every one planted and caught (lane B)`);
} finally { fs.rmSync(work, { recursive: true, force: true }); }
