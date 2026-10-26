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
import { ts } from '../common.mjs';

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

const LSC = process.env.LSC_BIN || '/Users/assem/nexus/nexus-organisation/work/lean-tools/node_modules/.bin/lsc';
// "lsc accepts": does LemmaScript's `lsc gen --backend=dafny` take the file (exit 0)? Reach comparison only.
function lscAccepts(file) {
  if (!fs.existsSync(LSC)) return 'no binary';
  const d = fs.mkdtempSync(path.join(tmp, 'lsc-'));
  const f = path.join(d, 'x.ts');
  fs.copyFileSync(file, f);
  const r = spawnSync(LSC, ['gen', '--backend=dafny', f], { cwd: d, encoding: 'utf8' });
  return r.status === 0 ? 'yes' : 'no';
}
const rows = [];
const add = (kind, name, check, ok, detail, lsc = '') => rows.push({ kind, name, check, ok, detail, lsc });

// ----- shared fixtures -----
const sharedDir = path.join(root, 'fixtures/shared');
for (const name of fs.readdirSync(sharedDir).sort()) {
  const ts = path.join(sharedDir, name, 'ts.ts');
  if (!fs.existsSync(ts)) continue;
  const th = theorems[name];
  if (!th) { add('shared', name, 'theorem', false, 'no entry in tests/theorems.json'); continue; }
  const l = run('node', [lint, ts]);
  add('shared', name, 'lint', l.status === 0, l.status === 0 ? 'inside the subset' : l.stdout.trim().split('\n')[0], lscAccepts(ts));
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

// ----- constructs: one small function per construct, translated both ways -----
const casesDir = path.join(here, 'cases');
const cases = JSON.parse(fs.readFileSync(path.join(here, 'cases.json'), 'utf8'));
const tflags = (c, withInv) => {
  const a = [...(c.flags ?? [])];
  for (const e of c.ensures ?? []) a.push('--ensures', e);
  for (const r of c.requires ?? []) a.push('--requires', r);
  if (withInv) for (const i of c.invariants ?? []) a.push('--invariant', i);
  return a;
};
for (const c of cases) {
  const file = path.join(casesDir, c.file);
  const l = run('node', [lint, file]);
  add('construct', c.name, 'lint', l.status === 0, l.status === 0 ? 'inside the subset' : l.stdout.trim().split('\n')[0], lscAccepts(file));
  const out = path.join(tmp, `case_${c.name}.dfy`);
  if (!c.coreOnly) { // the proof-shape mode (methods for loops) cannot call a unit that assigns from an expression; the gate runs --core
    const t = run('node', [translate, file, '--fn', c.fn, '--out', out, ...tflags(c, true)]);
    if (t.status !== 0) { add('construct', c.name, 'translate', false, (t.stderr || t.stdout).trim().split('\n')[0]); continue; }
    const dv = dafny(out);
    add('construct', c.name, 'verify (proof shape)', dv.ok, dv.summary);
  }
  if (c.core) {
    const oc = path.join(tmp, `case_${c.name}_core.dfy`);
    const tc = run('node', [translate, file, '--core', '--fn', c.fn, '--out', oc, ...tflags(c, false)]);
    if (tc.status !== 0) { add('construct', c.name, 'translate --core', false, (tc.stderr || tc.stdout).trim().split('\n')[0]); continue; }
    const dc = dafny(oc);
    add('construct', c.name, 'verify (--core)', dc.ok, dc.summary);
  }
}

// ----- the number-as-int gap: a float literal is refused unless --real -----
{
  const f = path.join(casesDir, 'float_literal.ts');
  const t = run('node', [translate, f, '--fn', 'drift', '--out', path.join(tmp, 'drift.dfy')]);
  add('construct', 'float_literal', 'int mode refuses 0.1', t.status === 1 && /not an integer/.test(t.stderr), t.status === 1 ? 'refused' : 'TRANSLATED');
  const r = run('node', [translate, f, '--fn', 'drift', '--out', path.join(tmp, 'drift_real.dfy'), '--real']);
  add('construct', 'float_literal', '--real accepts 0.1', r.status === 0, r.status === 0 ? 'translated' : r.stderr.trim());
}

// ----- differential run: the translation and the TypeScript give the same answers on sample inputs -----
const snake = (n) => n.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').toLowerCase();
const dfyLit = (v) => (Array.isArray(v) ? `[${v.map(dfyLit).join(', ')}]` : typeof v === 'string' ? JSON.stringify(v) : String(v));
const show = (v) => (Array.isArray(v) ? `[${v.map(show).join(', ')}]` : String(v));
function differential(label, tsFile, entries) {
  const src = fs.readFileSync(tsFile, 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function('exports', 'module', js)(mod.exports, mod);
  const dfy = path.join(tmp, `diff_${label}.dfy`);
  const t = run('node', [translate, tsFile, '--core', '--out', dfy]);
  if (t.status !== 0) { add('differential', label, 'translate --core', false, (t.stderr || t.stdout).trim().split('\n')[0]); return; }
  const lines = [], want = [];
  for (const { fn, samples } of entries) for (const args of samples) {
    lines.push(`  print ${snake(fn)}(${args.map(dfyLit).join(', ')}), "\\n";`);
    want.push(show(mod.exports[fn](...args)));
  }
  fs.appendFileSync(dfy, `\nmethod Main() {\n${lines.join('\n')}\n}\n`);
  const r = run('dafny', ['run', '--no-verify', '--target:py', dfy]);
  const got = (r.stdout ?? '').trim().split('\n').slice(-want.length);
  const same = r.status === 0 && got.length === want.length && got.every((g, i) => g.trim() === want[i]);
  add('differential', label, `${want.length} inputs, TS vs Dafny`, same, same ? 'same answers' : `want ${want.join('|')} got ${got.join('|')} ${r.status === 0 ? '' : (r.stderr || '').trim().split('\n')[0]}`);
}
for (const f of ['sum_positive', 'filter_then_sum']) differential(f, path.join(sharedDir, f, 'ts.ts'), [{ fn: theorems[f].fn, samples: theorems[f].samples }]);
for (const c of cases.filter((x) => x.samples)) differential(c.name, path.join(casesDir, c.file), [{ fn: c.fn, samples: c.samples }]);

// ----- negative controls: a false theorem must NOT verify, in both shapes -----
{
  const ts = path.join(root, 'fixtures/shared/sum_positive/ts.ts');
  const out = path.join(tmp, 'neg_sum.dfy');
  run('node', [translate, ts, '--fn', 'sumPositive', '--out', out, '--ensures', 'result > 0', '--invariant', 'total >= 0']);
  const d1 = dafny(out);
  add('control', 'false theorem', 'proof shape refuted', !d1.ok, d1.ok ? 'VERIFIED A FALSE THEOREM' : d1.summary);
  const outc = path.join(tmp, 'neg_sum_core.dfy');
  run('node', [translate, ts, '--core', '--fn', 'sumPositive', '--out', outc, '--ensures', 'result > 0']);
  const d2 = dafny(outc);
  add('control', 'false theorem', '--core refuted', !d2.ok, d2.ok ? 'VERIFIED A FALSE THEOREM' : d2.summary);
  // an invariant that the proof needs: without it the loop proof must fail
  const cd = fs.readFileSync(path.join(casesDir, 'count_down.ts'), 'utf8').split('\n').filter((l) => !l.includes('@invariant')).join('\n');
  const cdFile = path.join(tmp, 'count_down_nohint.ts');
  fs.writeFileSync(cdFile, cd);
  const outn = path.join(tmp, 'neg_nohint.dfy');
  run('node', [translate, cdFile, '--fn', 'countDown', '--out', outn, '--requires', 'n >= 0', '--ensures', 'result == n']);
  const d3 = dafny(outn);
  add('control', 'missing invariant', 'proof shape refuted', !d3.ok, d3.ok ? 'VERIFIED WITHOUT AN INVARIANT' : d3.summary);
}

// ----- --changed: only the changed functions are checked -----
{
  const f = path.join(casesDir, 'mixed.ts');
  const unchanged = run('node', [lint, f, '--changed', path.join(casesDir, 'mixed_good.json')]);
  add('changed', 'mixed.ts', 'bad function untouched: accepted', unchanged.status === 0, unchanged.status === 0 ? 'exit 0' : unchanged.stdout.trim().split('\n')[0]);
  const touched = run('node', [lint, f, '--changed', path.join(casesDir, 'mixed_bad.json')]);
  add('changed', 'mixed.ts', 'bad function changed: refused', touched.status === 1 && /\sdynamic-eval\s/.test(touched.stdout), touched.status === 1 ? 'exit 1, dynamic-eval' : 'ACCEPTED');
  const all = run('node', [lint, f]);
  add('changed', 'mixed.ts', 'no ranges: refused', all.status === 1, all.status === 1 ? 'exit 1' : 'ACCEPTED');
}

// ----- pairs: parent against candidate through the theorem and Dafny -----
const pairsDir = path.join(here, 'pairs');
for (const name of fs.existsSync(pairsDir) ? fs.readdirSync(pairsDir).sort() : []) {
  const d = path.join(pairsDir, name);
  const exp = JSON.parse(fs.readFileSync(path.join(d, 'expect.json'), 'utf8'));
  const tmpd = path.join(tmp, `pair_${name}`); fs.mkdirSync(tmpd, { recursive: true });
  const tr = (which, extra) => run('node', [translate, path.join(d, `${which}.ts`), '--core', '--suffix', which, '--out', path.join(tmpd, `${which}.dfy`), '--prelude', path.join(tmpd, `${which}.pre.dfy`), '--no-project', ...extra]);
  const p1 = tr('parent', []);
  const eff = p1.status === 0 ? (fs.readFileSync(path.join(tmpd, 'parent.dfy'), 'utf8').match(/^\/\/ EFFECTFUL: (.*)$/m)?.[1] ?? '') : '';
  const c1 = tr('candidate', eff ? ['--effectful', eff] : []);
  const eff2 = c1.status === 0 ? (fs.readFileSync(path.join(tmpd, 'candidate.dfy'), 'utf8').match(/^\/\/ EFFECTFUL: (.*)$/m)?.[1] ?? '') : '';
  if (eff2 !== eff) tr('parent', eff2 ? ['--effectful', eff2] : []);
  fs.writeFileSync(path.join(tmpd, 'scope.json'), JSON.stringify({ functions: Object.fromEntries(exp.scope.map((f) => [f, { in_scope: 'false' }])) }));
  fs.writeFileSync(path.join(tmpd, 'edit.json'), '{}');
  const th = run('python3', ['-I', path.join(root, 'spec/theorem.py'), '--parent', path.join(tmpd, 'parent.dfy'), '--candidate', path.join(tmpd, 'candidate.dfy'), '--scope', path.join(tmpd, 'scope.json'), '--edit', path.join(tmpd, 'edit.json'), '--out', path.join(tmpd, 'theorem.dfy')]);
  add('pair', name, 'theorem generated', th.status === 0, th.status === 0 ? 'ok' : (th.stderr || th.stdout).trim().slice(-160));
  if (th.status !== 0) continue;
  const v = run('dafny', ['verify', '--verification-time-limit', '30', path.join(tmpd, 'theorem.dfy')]);
  const text = v.stdout + v.stderr;
  const lines = fs.readFileSync(path.join(tmpd, 'theorem.dfy'), 'utf8').split('\n');
  const spans = {}; let cur = null;
  lines.forEach((ln, i) => { const m = ln.match(/^lemma (Equal_\w+)\(/); if (m) { cur = m[1]; spans[cur] = [i + 1, null]; } if (ln.startsWith('} // END Equal_') && cur) spans[cur][1] = i + 1; });
  const errs = [...text.matchAll(/theorem\.dfy\((\d+),\d+\): Error/g)].map((m) => Number(m[1]));
  const finished = /finished with \d+ verified/.test(text); // no verdict line: a resolution error, nothing is proved
  for (const [f, want] of Object.entries(exp.equal)) {
    const sp = spans[`Equal_${f}`];
    const proved = finished && !!sp && !errs.some((L) => sp[0] <= L && L <= sp[1]);
    add('pair', name, `Equal_${f} ${want ? 'proved' : 'not proved'}`, proved === want, sp ? (proved ? 'proved' : 'not proved') : 'lemma missing');
  }
  // lane B on the same pair
  for (const [unit, want] of Object.entries(exp.b ?? {})) {
    const r = run('node', [path.join(here, '../exec/run.mjs'), '--parent', path.join(d, 'parent.ts'), '--candidate', path.join(d, 'candidate.ts'), '--unit', unit, '--n', '30', '--no-project', '--out', path.join(tmpd, `b_${unit}.json`)]);
    let got = 'no result';
    try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${unit}.json`), 'utf8')).verdict; } catch { /* keep */ }
    add('pair', name, `lane B ${unit} ${want}`, got === want, got);
  }
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
  add('escape', name, 'lint refuses', l.status === 1 && hit, l.status === 1 ? (hit ? `refused: ${want}` : `refused, but not for ${want}`) : 'ACCEPTED', lscAccepts(file));
  const fn = (src.match(/^export (?:async )?function (\w+)/m) ?? [])[1];
  if (fn) {
    const t = run('node', [translate, file, '--fn', fn, '--out', path.join(tmp, `esc_${name}.dfy`)]);
    add('escape', name, 'translate refuses', t.status === 1, t.status === 1 ? 'refused' : 'TRANSLATED');
  }
}

// ----- the repository's own conformance run, when present -----
if (fs.existsSync(path.join(root, 'conformance/run.py')) && fs.existsSync(path.join(root, 'langs/ts/conformance.json'))) {
  const c = run('python3', ['-I', 'conformance/run.py', 'ts']);
  const last = (c.stdout ?? '').trim().split('\n').pop();
  add('repo', 'conformance/run.py ts', 'runner', c.status === 0, last);
}

// ----- table -----
const w = (k, s) => Math.max(s.length, ...rows.map((r) => String(r[k]).length));
const cols = ['kind', 'name', 'check'];
const widths = Object.fromEntries(cols.map((c) => [c, w(c, c)]));
const line = (r) => `| ${cols.map((c) => String(r[c]).padEnd(widths[c])).join(' | ')} | ${r.ok ? 'PASS' : 'FAIL'} | ${r.lsc.padEnd(11)} | ${r.detail}`;
console.log(`| ${cols.map((c) => c.padEnd(widths[c])).join(' | ')} | res  | lsc accepts | detail`);
for (const r of rows) console.log(line(r));
const failed = rows.filter((r) => !r.ok).length;
console.log(`| TOTAL | ${rows.length} checks | ${failed === 0 ? 'ALL PASS' : `${failed} FAILED`} |`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(failed === 0 ? 0 : 1);
