#!/usr/bin/env node
// The faithful number reading (translate/faithful.mjs, design/doubles.md, rule C) on its own: each case of
// faithful.json is translated both ways (--core, the reading lane A uses), the theorem made, Dafny run, and the lemma
// read. The six false proofs the doubles reading caught in the pair suite, and the 2^53 case, must stay unproved
// here too (red tests); the positive cases must prove, by exact integers or by congruence as stated.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), ts = path.join(here, '../..'), root = path.join(ts, '../..');
const { faithfulPlacement } = await import(path.join(ts, 'check.mjs'));
const cases = JSON.parse(fs.readFileSync(path.join(here, 'faithful.json'), 'utf8'));
const run = (cmd, args) => spawnSync(cmd, args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
let fails = 0;
for (const c of cases) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-faithful-'));
  for (const side of ['parent', 'candidate']) { fs.writeFileSync(path.join(d, `${side}.ts`), c[side] + '\n'); run('node', [path.join(ts, 'translate/translate.mjs'), path.join(d, `${side}.ts`), '--core', '--suffix', side, '--out', path.join(d, `${side}.dfy`), '--prelude', path.join(d, `${side}.pre.dfy`), '--no-project']); }
  fs.writeFileSync(path.join(d, 'scope.json'), JSON.stringify({ functions: { f: { in_scope: 'false' } }, summaries: true })); fs.writeFileSync(path.join(d, 'edit.json'), '{}');
  const th = run('python3', ['-I', path.join(root, 'spec/theorem.py'), '--parent', path.join(d, 'parent.dfy'), '--candidate', path.join(d, 'candidate.dfy'), '--scope', path.join(d, 'scope.json'), '--edit', path.join(d, 'edit.json'), '--out', path.join(d, 'theorem.dfy')]);
  let proved = false, detail = '';
  if (th.status !== 0) detail = 'theorem: ' + (th.stderr || th.stdout).trim().slice(-120);
  else { const v = run('dafny', ['verify', '--verification-time-limit', '30', path.join(d, 'theorem.dfy')]); const out = v.stdout + v.stderr; const lines = fs.readFileSync(path.join(d, 'theorem.dfy'), 'utf8').split('\n'); const a = lines.findIndex((l) => /^lemma .*Equal_f\(/.test(l)) + 1, b = lines.findIndex((l) => /^\} \/\/ END Equal_f\b/.test(l)) + 1; const errs = [...out.matchAll(/theorem\.dfy\((\d+),\d+\): Error/g)].map((m) => Number(m[1])); proved = /finished with \d+ verified/.test(out) && a > 0 && !errs.some((L) => a <= L && L <= b); detail = (out.match(/finished with[^\n]*/) ?? [''])[0]; }
  const pl = faithfulPlacement(d, 'f');
  const reading = pl.placed ? (pl.congruence ? 'congruence' : 'exact') : 'unplaced';
  const got = proved && pl.placed ? 'proved' : 'not proved';
  const ok = got === c.expect && (!c.reading || c.reading === reading);
  if (!ok) fails++;
  console.log(`| ${c.name} | ${c.expect}${c.reading ? ' (' + c.reading + ')' : ''} | ${got} (${reading}; lemma ${proved ? 'proved' : 'not proved'}) | ${ok ? 'PASS' : 'FAIL'} | ${c.why} |`);
  fs.rmSync(d, { recursive: true, force: true });
}
console.log(`${cases.length - fails} of ${cases.length} faithful cases as expected`);
process.exit(fails ? 1 : 0);
