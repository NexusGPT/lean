// The hard kinds of exec/mutate-hard.mjs (lane w8q) on their fixture, tests/fixtures/hard_mutants: one unit per kind.
// 1. Every hard kind has a site in the fixture, and every hard site is the file's own text: `was` is the text in
//    [start, end), `lines` its first and last line, and the mutant mutate.mjs plants (--hard, at the site's index) is
//    text[:start] + text + text[end:], planted with no site skipped.
// 2. Every hard site's mutant is caught: `check.mjs --parent <fixture> --candidate <mutant> --unit <unit>` (the mutant
//    study's options: --n 30, --dafny-seconds 30, --no-project) gives WITNESS.
// 3. The first kinds are unchanged: for every unit of every fixture pair (tests/fixtures/mutants, tests/pairs, this
//    fixture) mutate.mjs's sitesOf gives the sites lead-v4's (844ddac2, `git show`) gives, every field equal, and the
//    --hard list begins with that list (its indices hold).
// --break <kind>: LEAN_BREAK=hard-kind:<kind> (mutate-hard.mjs lists no site of that kind); part 1 fails.
// --no-check: parts 1 and 3 only (no check.mjs runs). --no-pairs: part 3 on the two fixtures only, not tests/pairs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), tsDir = path.join(here, '..');
const bi = process.argv.indexOf('--break');
if (bi >= 0) process.env.LEAN_BREAK = [process.env.LEAN_BREAK, `hard-kind:${process.argv[bi + 1]}`].filter(Boolean).join(',');
const { loadProgram, topLevelFunctions } = await import('../common.mjs');
const { sitesOf, mutate } = await import('../exec/mutate.mjs');
const { HARD_KINDS } = await import('../exec/mutate-hard.mjs');
const REF = '844ddac278'; // lead-v4: mutate.mjs before the hard kinds

const fixture = path.join(here, 'fixtures', 'hard_mutants', 'candidate.ts');
const unitsOf = (file) => [...topLevelFunctions(loadProgram(file, { project: false }).sf).values()].filter((u) => !u.enclosingUnit).map((u) => u.name).sort();
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-hard-mutants-'));
const ref = path.join(tsDir, 'exec', `.mutate-ref-${process.pid}.mjs`);
try {
  // 1. the sites
  const kinds = new Set(), planted = [];
  for (const unit of unitsOf(fixture)) {
    const { sites, text } = sitesOf(fixture, unit, { project: false, hard: true });
    sites.forEach((s, i) => {
      if (!HARD_KINDS.includes(s.kind)) return;
      kinds.add(s.kind);
      assert.equal(text.slice(s.start, s.end), s.was, `${unit} site ${i} (${s.kind}): was is the file's text`);
      const lineAt = (p) => text.slice(0, p).split('\n').length;
      assert.deepEqual(s.lines, [lineAt(s.start), lineAt(s.end)], `${unit} site ${i} (${s.kind}): its lines`);
      const m = mutate(fixture, unit, i, { project: false, hard: true });
      assert.ok(m && m.skipped === 0, `${unit} site ${i} (${s.kind}) is planted`);
      assert.equal(m.source, text.slice(0, s.start) + s.text + text.slice(s.end), `${unit} site ${i} (${s.kind}): the mutant is text[:start] + text + text[end:]`);
      planted.push({ unit, i, kind: s.kind, source: m.source });
    });
  }
  for (const k of HARD_KINDS) assert.ok(kinds.has(k), `the fixture has a ${k} site`);
  // 3. the first kinds, byte for byte
  const r0 = spawnSync('git', ['-C', tsDir, 'show', `${REF}:langs/ts/exec/mutate.mjs`], { encoding: 'utf8' });
  assert.equal(r0.status, 0, r0.stderr);
  fs.writeFileSync(ref, r0.stdout);
  const pairFiles = [fixture, ...['fixtures/mutants', ...(process.argv.includes('--no-pairs') ? [] : ['pairs'])].flatMap((d) => fs.readdirSync(path.join(here, d)).sort().map((p) => path.join(here, d, p, 'candidate.ts')).filter((f) => fs.existsSync(f)))];
  const refMod = await import(ref);
  const listOf = (fn, file, unit, opts) => { try { return JSON.stringify(fn(file, unit, { project: false, ...opts }).sites); } catch (e) { return `error: ${e.message}`; } };
  let units = 0;
  for (const file of pairFiles) {
    let names; try { names = unitsOf(file); } catch { continue; }
    for (const unit of names) {
      const where = `${path.relative(here, file)} ${unit}`;
      const a = listOf(refMod.sitesOf, file, unit, {}), b = listOf(sitesOf, file, unit, {}), h = listOf(sitesOf, file, unit, { hard: true });
      assert.equal(b, a, `${where}: the sites as lead-v4 lists them`);
      if (!a.startsWith('error')) {
        const old = JSON.parse(a), hard = JSON.parse(h);
        assert.deepEqual(hard.slice(0, old.length), old, `${where}: --hard keeps the first sites and their indices`);
        assert.ok(hard.slice(old.length).every((s) => HARD_KINDS.includes(s.kind)), `${where}: --hard adds hard kinds only`);
      }
      units++;
    }
  }
  // 2. caught
  const verdicts = [];
  if (!process.argv.includes('--no-check')) {
    for (const p of planted) {
      const mutant = path.join(work, `${p.unit}-${p.i}.ts`), out = path.join(work, `${p.unit}-${p.i}.json`);
      fs.writeFileSync(mutant, p.source);
      const r = spawnSync(process.execPath, [path.join(tsDir, 'check.mjs'), '--parent', fixture, '--candidate', mutant, '--unit', p.unit, '--n', '30', '--dafny-seconds', '30', '--no-project', '--out', out], { cwd: tsDir, encoding: 'utf8', maxBuffer: 1 << 26 });
      let v = null; try { v = JSON.parse(fs.readFileSync(out, 'utf8')).verdict; } catch { v = `no verdict (exit ${r.status})`; }
      verdicts.push(`${p.kind} ${p.unit}#${p.i} ${v}`);
    }
    const missed = verdicts.filter((v) => !v.endsWith(' WITNESS'));
    assert.deepEqual(missed, [], 'every hard mutant of the fixture is a WITNESS');
  }
  console.log(`hard mutants fixture: ${planted.length} hard sites of ${HARD_KINDS.length} kinds, ${verdicts.length ? `every one planted and caught (WITNESS)` : 'planted (no check run)'}; the first kinds byte-equal to ${REF} on ${units} units`);
} finally { fs.rmSync(work, { recursive: true, force: true }); fs.rmSync(ref, { force: true }); }
