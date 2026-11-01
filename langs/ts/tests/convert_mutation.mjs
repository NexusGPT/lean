#!/usr/bin/env node
// The mutation family's transforms (design/w4a-convert-mutation.md): closure-counter, hoist-update, rebuild-by-spread,
// param-copy, explicit-return.
//   1. each fixture of tests/fixtures/convert/<transform> as the suite's convert section reads it: before.ts converted
//      with --narrowed is after.ts exactly; after.ts against before.ts proves with no WITNESS (PASS-proved, PASS-bounded
//      or PASS-erased); wrong.ts against before.ts is a WITNESS;
//   2. each guard of tests/fixtures/convert_mutation/<transform>: parent.ts (a near shape the guard refuses) is left as it
//      is and listed with the guard's reason; unguarded.ts, the text the transform would write without that guard, is a
//      WITNESS against parent.ts (the guard is what keeps behaviour). explicit-return has no unguarded text: its edit is
//      erased, so what the guard keeps is the type the callers in other modules read, which no run observes.
// --break removes the mechanism: the five transforms are taken out of the converter's table, so every fixture of part 1
// stays as it was and the run fails.
// Run: node langs/ts/tests/convert_mutation.mjs [--break]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTransforms, convertFile } from '../convert.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const BREAK = process.argv.includes('--break');
const MINE = ['closure-counter', 'hoist-update', 'rebuild-by-spread', 'param-copy', 'explicit-return'];
const pr = path.join(here, '..', 'pr.mjs');
const cache = fs.mkdtempSync(path.join(os.tmpdir(), 'convert-mutation-cache-'));
let fail = 0;
const say = (ok, what, saw) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${saw ? ': ' + saw : ''}`); if (!ok) fail++; };

const transforms = await loadTransforms();
// the file a loaded transform came from: each file's default export, compared by identity with the rule table's
const files = new Map();
for (const f of fs.readdirSync(path.join(here, '..', 'convert')).filter((x) => x.endsWith('.mjs') && x !== 'util.mjs')) files.set((await import(path.join(here, '..', 'convert', f))).default, path.basename(f, '.mjs'));
const fileOf = (t) => files.get(t);
if (BREAK) for (const [rule, t] of [...transforms]) if (MINE.includes(t.name)) transforms.delete(rule);

// a scratch repository holding `text` as unit.ts, committed
function repoWith(text) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'convert-mutation-'));
  fs.writeFileSync(path.join(repo, 'unit.ts'), text);
  const git = (...a) => spawnSync('git', ['-C', repo, ...a], { encoding: 'utf8' });
  git('init', '-q'); git('add', '.'); git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  return repo;
}
// pr.mjs on the working tree against HEAD: the rows
function prove(repo) {
  const json = path.join(repo, '..', `${path.basename(repo)}.json`);
  const r = spawnSync(process.execPath, [pr, '--repo', repo, '--base', 'HEAD', '--no-project', '--n', '30', '--dafny-seconds', '30', '--cache-dir', cache, '--json', json, '--out', `${json}.md`], { encoding: 'utf8', maxBuffer: 1 << 26 });
  let rows = null; try { rows = JSON.parse(fs.readFileSync(json, 'utf8')).rows; } catch { /* no rows: the caller fails */ }
  fs.rmSync(json, { force: true }); fs.rmSync(`${json}.md`, { force: true });
  return { rows, err: (r.stderr || r.stdout || '').trim().slice(-200) };
}
// a nested callback the rewrite removed is covered by its enclosing unit's verdict, as convert.mjs prove() reads it
const covered = (rows) => { const out = rows.map((r) => ({ ...r })); for (const r of out) if (r.decision === 'removed' && r['covered-by']) r.verdict = out.find((x) => x.unit === r['covered-by'] && x.verdict !== null)?.verdict ?? null; return out; };
const count = (rs) => Object.entries(rs.reduce((c, r) => ({ ...c, [r.verdict ?? 'none']: (c[r.verdict ?? 'none'] ?? 0) + 1 }), {})).map(([k, v]) => `${v} ${k}`).join(', ');
// the strict family's edits are proved by erasure in convert.mjs; pr.mjs answers PASS for an unchanged emit as well
const passed = (v) => v === 'PASS-proved' || v === 'PASS-bounded' || v === 'PASS-erased';

// part 0: the advice table names, for each entry a transform rewrites, the file whose rules hold that entry
{
  const { ADVICE } = await import('../lint/advice.mjs');
  const byFile = new Map([...(await loadTransforms())].map(([rule, t]) => [rule, t]));
  const bad = Object.entries(ADVICE).filter(([rule, a]) => a.transform && !(byFile.get(rule) && path.basename(a.transform, '.mjs') === fileOf(byFile.get(rule))));
  say(bad.length === 0, 'advice: every entry marked with a transform is that transform\'s rule', bad.map(([r, a]) => `${r} -> ${a.transform}`).join(', ') || `${Object.values(ADVICE).filter((a) => a.transform).length} entries`);
}

// part 1: the fixtures
for (const name of MINE) {
  const d = path.join(here, 'fixtures', 'convert', name);
  const before = fs.readFileSync(path.join(d, 'before.ts'), 'utf8'), after = fs.readFileSync(path.join(d, 'after.ts'), 'utf8'), wrong = fs.readFileSync(path.join(d, 'wrong.ts'), 'utf8');
  const repo = repoWith(before);
  const unit = path.join(repo, 'unit.ts');
  let res = null;
  try { res = convertFile(unit, { transforms, project: false, narrowed: true }); } catch (e) { say(false, `${name}: converts`, e.message.slice(0, 160)); }
  const got = fs.readFileSync(unit, 'utf8');
  const at = got.split('\n').findIndex((l, i) => l !== after.split('\n')[i]);
  say(got === after, `${name}: before converts to after.ts`, got === after ? `${res?.applied.length ?? 0} applied (${[...new Set(res?.applied.map((a) => a.transform))].join(', ')})` : `differs at line ${at + 1}: ${JSON.stringify(got.split('\n')[at] ?? '')}`);
  if (BREAK) { fs.rmSync(repo, { recursive: true, force: true }); continue; }
  fs.writeFileSync(unit, after);
  const a = prove(repo), rs = covered(a.rows ?? []).filter((r) => !r.caller);
  say(!!a.rows && rs.length > 0 && rs.every((r) => passed(r.verdict)), `${name}: after.ts proves, no WITNESS`, a.rows ? count(rs) : a.err);
  fs.writeFileSync(unit, wrong);
  const w = prove(repo), hit = (w.rows ?? []).filter((r) => r.verdict === 'WITNESS');
  say(hit.length > 0, `${name}: wrong.ts is a WITNESS`, hit.length ? hit.map((r) => `${r.unit} at input ${r.witness?.input ?? '?'}`).join(', ') : w.rows ? `no WITNESS: ${count(w.rows)}` : w.err);
  fs.rmSync(repo, { recursive: true, force: true });
}

// part 2: the guards
if (!BREAK) for (const name of MINE) {
  const d = path.join(here, 'fixtures', 'convert_mutation', name);
  const parent = fs.readFileSync(path.join(d, 'parent.ts'), 'utf8');
  const want = JSON.parse(fs.readFileSync(path.join(d, 'expect.json'), 'utf8'));
  const repo = repoWith(parent);
  const unit = path.join(repo, 'unit.ts');
  const res = convertFile(unit, { transforms, project: false, narrowed: true });
  const row = res.listed.find((l) => l.rule === want.rule && (l.why ?? '').includes(want.why));
  const kept = fs.readFileSync(unit, 'utf8') === parent;
  say(kept && !!row, `${name}: the guard refuses (${want.why})`, kept ? (row ? row.why.slice(0, 110) : `listed: ${res.listed.filter((l) => l.rule === want.rule).map((l) => l.why).join(' | ').slice(0, 160)}`) : 'rewritten');
  if (fs.existsSync(path.join(d, 'unguarded.ts'))) {
    fs.writeFileSync(unit, fs.readFileSync(path.join(d, 'unguarded.ts'), 'utf8'));
    const w = prove(repo), hit = (w.rows ?? []).filter((r) => r.verdict === 'WITNESS');
    say(hit.length > 0, `${name}: the rewrite without the guard is a WITNESS`, hit.length ? hit.map((r) => `${r.unit} at input ${r.witness?.input ?? '?'}`).join(', ') : w.rows ? `no WITNESS: ${count(w.rows)}` : w.err);
  }
  fs.rmSync(repo, { recursive: true, force: true });
}
fs.rmSync(cache, { recursive: true, force: true });
console.log(fail ? `${fail} failed${BREAK ? ' (--break: the five transforms removed)' : ''}` : 'all passed');
process.exit(fail ? 1 : 0);
