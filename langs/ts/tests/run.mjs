#!/usr/bin/env node
// lean-ts test run: lints and translates every fixture under fixtures/shared and fixtures/escapes.
//  - shared fixtures: ts.ts must lint clean, translate with the gate-written theorem (theorems.json),
//    and the result must verify in Dafny; the hand-written core.dfy must verify with the same theorem
//    and carry the same signature as the translation.
//  - escapes: lint must exit 1 and name the expected rule (first line `// expect: <rule>`);
//    translate must refuse too when the file has a function.
// Prints a table; exit 0 only when every row passes.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const lint = path.join(here, '../lint/lint.mjs');
const translate = path.join(here, '../translate/translate.mjs');
const theorems = JSON.parse(fs.readFileSync(path.join(here, 'theorems.json'), 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-ts-'));

const run = (cmd, args) => spawnSync(cmd, args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
const dafny = (file) => {
  const r = run('dafny', ['verify', '--verification-time-limit', '60', file]);
  const text = (r.stdout ?? '') + (r.stderr ?? '');
  const m = text.match(/finished with (\d+) verified, (\d+) errors?/);
  return { ok: r.status === 0 && !!m && m[2] === '0', text, summary: m ? `${m[1]} verified, ${m[2]} errors` : (text.trim().split('\n').pop() || 'no output') };
};
const signature = (dfy) => {
  const m = dfy.match(/^(?:function|method)\s+(\w+)\s*\(([^)]*)\)\s*(?::|returns)\s*\(result:\s*([^)]+)\)/m);
  return m ? `${m[1]}(${m[2].replace(/\s+/g, ' ').trim()}) -> ${m[3].trim()}` : null;
};

const rows = [];
const add = (kind, name, check, ok, detail) => rows.push({ kind, name, check, ok, detail });

// ----- shared fixtures -----
const sharedDir = path.join(root, 'fixtures/shared');
for (const name of fs.readdirSync(sharedDir).sort()) {
  const ts = path.join(sharedDir, name, 'ts.ts');
  if (!fs.existsSync(ts)) continue;
  const th = theorems[name];
  if (!th) { add('shared', name, 'theorem', false, 'no entry in tests/theorems.json'); continue; }
  const l = run('node', [lint, ts]);
  add('shared', name, 'lint', l.status === 0, l.status === 0 ? 'inside the subset' : l.stdout.trim().split('\n')[0]);
  const out = path.join(tmp, `${name}.dfy`);
  const args = [translate, ts, '--fn', th.fn, '--out', out];
  for (const e of th.ensures ?? []) args.push('--ensures', e);
  for (const r of th.requires ?? []) args.push('--requires', r);
  for (const i of th.invariants ?? []) args.push('--invariant', i);
  const t = run('node', args);
  add('shared', name, 'translate', t.status === 0, t.status === 0 ? `${th.fn} -> Dafny` : (t.stderr || t.stdout).trim().split('\n')[0]);
  if (t.status !== 0) continue;
  const dv = dafny(out);
  add('shared', name, 'verify translation', dv.ok, dv.summary);
  const core = path.join(sharedDir, name, 'core.dfy');
  if (!fs.existsSync(core)) { add('shared', name, 'reference core.dfy', false, 'missing'); continue; }
  const rv = dafny(core);
  add('shared', name, 'verify core.dfy', rv.ok, rv.summary);
  const s1 = signature(fs.readFileSync(out, 'utf8')), s2 = signature(fs.readFileSync(core, 'utf8'));
  add('shared', name, 'same signature', !!s1 && s1 === s2, s1 === s2 ? s1 : `${s1} vs ${s2}`);
}

// ----- escapes -----
const escDir = path.join(root, 'fixtures/escapes/ts');
for (const f of fs.readdirSync(escDir).filter((x) => x.endsWith('.ts')).sort()) {
  const file = path.join(escDir, f);
  const src = fs.readFileSync(file, 'utf8');
  const want = (src.match(/^\/\/ expect:\s*(\S+)/m) ?? [])[1];
  const name = f.replace(/\.ts$/, '');
  if (!want) { add('escape', name, 'expect line', false, 'missing `// expect: <rule>`'); continue; }
  const l = run('node', [lint, file]);
  const hit = l.stdout.split('\n').some((line) => new RegExp(`\\s${want}\\s`).test(line));
  add('escape', name, 'lint refuses', l.status === 1 && hit, l.status === 1 ? (hit ? `refused: ${want}` : `refused, but not for ${want}`) : 'ACCEPTED');
  const fn = (src.match(/^export (?:async )?function (\w+)/m) ?? [])[1];
  if (fn) {
    const t = run('node', [translate, file, '--fn', fn, '--out', path.join(tmp, `esc_${name}.dfy`)]);
    add('escape', name, 'translate refuses', t.status === 1, t.status === 1 ? 'refused' : 'TRANSLATED');
  }
}

// ----- table -----
const w = (k, s) => Math.max(s.length, ...rows.map((r) => String(r[k]).length));
const cols = ['kind', 'name', 'check'];
const widths = Object.fromEntries(cols.map((c) => [c, w(c, c)]));
const line = (r) => `| ${cols.map((c) => String(r[c]).padEnd(widths[c])).join(' | ')} | ${r.ok ? 'PASS' : 'FAIL'} | ${r.detail}`;
console.log(`| ${cols.map((c) => c.padEnd(widths[c])).join(' | ')} | res  | detail`);
for (const r of rows) console.log(line(r));
const failed = rows.filter((r) => !r.ok).length;
console.log(`| TOTAL | ${rows.length} checks | ${failed === 0 ? 'ALL PASS' : `${failed} FAILED`} |`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(failed === 0 ? 0 : 1);
