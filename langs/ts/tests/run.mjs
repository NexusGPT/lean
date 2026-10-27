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

const run = (cmd, args, env) => spawnSync(cmd, args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26, env: env ? { ...process.env, ...env } : process.env });
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
const pairFile = (d, side) => fs.existsSync(path.join(d, side + '.tsx')) ? path.join(d, side + '.tsx') : path.join(d, side + '.ts');
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

// ----- numbers per file: a float literal makes the file real; --real forces it -----
{
  const f = path.join(casesDir, 'float_literal.ts');
  const t = run('node', [translate, f, '--fn', 'drift', '--out', path.join(tmp, 'drift.dfy')]);
  const driftDfy = t.status === 0 && fs.existsSync(path.join(tmp, 'drift.dfy')) ? fs.readFileSync(path.join(tmp, 'drift.dfy'), 'utf8') : '';
  add('construct', 'float_literal', 'a float literal makes the file real', t.status === 0 && /:\s*real\b/.test(driftDfy), t.status === 0 ? (/:\s*real\b/.test(driftDfy) ? 'real' : 'int') : 'refused');
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

// concrete string helpers, including whitespace, empty separators and replacement tokens
{
  const r = run('node', [path.join(here, 'strings/run.mjs'), path.join(tmp, 'string_helpers.dfy')]);
  const text = (r.stdout ?? '') + (r.stderr ?? '');
  add('construct', 'string_helpers', 'concrete Dafny assertions', r.status === 0, text.trim().split('\n').pop());
}

// concrete numeric helpers, including sign bits, shift masking and real truncation
{
  const r = run('node', [path.join(here, 'numbers_bits/run.mjs'), path.join(tmp, 'number_helpers.dfy')]);
  const text = (r.stdout ?? '') + (r.stderr ?? '');
  add('construct', 'number_helpers', 'concrete Dafny execution', r.status === 0, text.trim().split('\n').pop());
}

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
  if (exp.candidateOnly) {
    for (const [i, want] of exp.candidateOnly.entries()) {
      const out = path.join(tmpd, `new_${i}.json`);
      run('node', [path.join(here, '../check.mjs'), ...(want.parent ? ['--parent', path.join(d, want.parent)] : []), '--candidate', path.join(d, want.file), '--unit', want.unit, '--n', '30', ...(want.project ? [] : ['--no-project']), '--out', out]);
      let got = {}; try { got = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { /* missing output fails */ }
      const ok = got.verdict === want.verdict && (!want.kind || got.kind === want.kind) && (!want.environmentClass || got.environmentClass === want.environmentClass) && (!want.phase || got.phase === want.phase) && (!want.linkKind || got.link?.kind === want.linkKind) && (!want.reason || got.reason?.includes(want.reason)) && (want.inputs === undefined || got.inputs === want.inputs) && (want.faults === undefined || got.faults === want.faults) && (got.verdict !== 'NEW' || (got.loaded === true && got.seed === 1 && Array.isArray(got.fakes) && got.traceShape?.reduce((n, s) => n + s.inputs, 0) === got.inputs && !got.certificate?.lanes?.A));
      add('pair', name, `${want.file} ${want.unit} ${want.verdict}`, ok, JSON.stringify({ verdict: got.verdict, inputs: got.inputs, faults: got.faults, reason: got.reason }));
    }
    continue;
  }
  if (!exp.laneBOnly) { // a pair whose units lane A refuses by design (closures over mutable cells) checks lane B alone
  const tr = (which, extra) => run('node', [translate, pairFile(d, which), '--core', '--suffix', which, '--out', path.join(tmpd, `${which}.dfy`), '--prelude', path.join(tmpd, `${which}.pre.dfy`), '--no-project', ...(exp.heap !== false ? ['--heap'] : []), ...extra]);
  const headerOf = (which, key) => fs.readFileSync(path.join(tmpd, `${which}.dfy`), 'utf8').match(new RegExp(`^// ${key}: (.*)$`, 'm'))?.[1] ?? '';
  const p1 = tr('parent', []);
  const eff = p1.status === 0 ? headerOf('parent', 'EFFECTFUL') : '';
  const hp = p1.status === 0 && exp.heap !== false ? headerOf('parent', 'HEAP') : '';
  const heapArgs = (units) => (exp.heap !== false ? ['--heap-units', units || '-'] : []); // the heap core agreed on both sides: a unit in the core on one side only would change its signature
  const c1 = tr('candidate', [...(eff ? ['--effectful', eff] : []), ...heapArgs(hp)]);
  const eff2 = c1.status === 0 ? headerOf('candidate', 'EFFECTFUL') : '';
  const hc = c1.status === 0 && exp.heap !== false ? headerOf('candidate', 'HEAP') : '';
  if (eff2 !== eff || hc !== hp) tr('parent', [...(eff2 ? ['--effectful', eff2] : []), ...heapArgs(hc)]);
  fs.writeFileSync(path.join(tmpd, 'scope.json'), JSON.stringify({ functions: Object.fromEntries(exp.scope.map((f) => [f, { in_scope: 'false' }])) }));
  fs.writeFileSync(path.join(tmpd, 'edit.json'), '{}');
  const th = run('python3', ['-I', path.join(root, 'spec/theorem.py'), '--parent', path.join(tmpd, 'parent.dfy'), '--candidate', path.join(tmpd, 'candidate.dfy'), '--scope', path.join(tmpd, 'scope.json'), '--edit', path.join(tmpd, 'edit.json'), '--out', path.join(tmpd, 'theorem.dfy')]);
  add('pair', name, 'theorem generated', th.status === 0, th.status === 0 ? 'ok' : (th.stderr || th.stdout).trim().slice(-160));
  if (th.status !== 0) continue;
  const v = run('dafny', ['verify', '--verification-time-limit', '30', path.join(tmpd, 'theorem.dfy')]);
  const text = v.stdout + v.stderr;
  const lines = fs.readFileSync(path.join(tmpd, 'theorem.dfy'), 'utf8').split('\n');
  const spans = {}; let cur = null;
  lines.forEach((ln, i) => { const m = ln.match(/^lemma (?:\{[^}]*\}\s+)*(Equal(?:Canon)?_\w+)(?:<[^>]*>)?\(/); if (m) { cur = m[1]; spans[cur] = [i + 1, null]; } if (/^\} \/\/ END Equal(Canon)?_/.test(ln) && cur) spans[cur][1] = i + 1; });
  const errs = [...text.matchAll(/theorem\.dfy\((\d+),\d+\): Error/g)].map((m) => Number(m[1]));
  const finished = /finished with \d+ verified/.test(text); // no verdict line: a resolution error, nothing is proved
  for (const [f, want] of Object.entries(exp.equal)) {
    const sp = spans[`Equal_${f}`];
    const whole = finished && !!sp && !errs.some((L) => sp[0] <= L && L <= sp[1]);
    const parts = Object.keys(spans).filter((k) => k.startsWith(`EqualCanon_${f}_`)); // the canonical-heap certificate: every part must hold
    const canon = finished && parts.length > 0 && parts.every((k) => !errs.some((L) => spans[k][0] <= L && L <= spans[k][1]));
    const proved = whole || canon;
    const withheld = lines.find((ln) => ln.startsWith(`// UNGUARDED Equal_${f}: `));
    const got = sp ? (proved ? (whole ? 'proved' : 'proved (canonical heap)') : 'not proved') : withheld ? `withheld: ${withheld.slice(withheld.indexOf(': ') + 2, withheld.indexOf(': ') + 120)}` : 'lemma missing';
    const ok = want === 'withheld' ? !!withheld : proved === want && !(want && withheld); // "withheld": the identity guard must have withheld the lemma
    add('pair', name, `Equal_${f} ${want === 'withheld' ? 'withheld' : want ? 'proved' : 'not proved'}`, ok, got);
    if (exp.canon && f in exp.canon) add('pair', name, `EqualCanon_${f} ${exp.canon[f] ? 'proved' : 'not proved'}`, canon === exp.canon[f] && (!exp.canon[f] || !whole), `${parts.length} parts: ${parts.filter((k) => errs.some((L) => spans[k][0] <= L && L <= spans[k][1])).map((k) => k.slice(k.lastIndexOf('_') + 1)).join(', ') || 'all hold'}${whole ? '; whole heap also proved' : ''}`); // "canon": the canonical reading alone proves it (the whole-heap lemma fails)
  }
  }
  // lane B on the same pair
  for (const [unit, want] of Object.entries(exp.b ?? {})) {
    const r = run('node', [path.join(here, '../exec/run.mjs'), '--parent', pairFile(d, 'parent'), '--candidate', pairFile(d, 'candidate'), '--unit', unit, '--n', '30', '--no-project', '--out', path.join(tmpd, `b_${unit}.json`)]);
    let got = 'no result';
    try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${unit}.json`), 'utf8')).verdict; } catch { /* keep */ }
    add('pair', name, `lane B ${unit} ${want}`, got === want, got);
  }
  // the retained-state programs lane B ran for a class unit (programs.mjs): the verdict, the shrunk program's length, whether the divergence names this unit
  for (const [unit, want] of Object.entries(exp.programs ?? {})) {
    let got = null; try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${unit}.json`), 'utf8')); } catch { /* keep */ }
    const pr = got?.bound?.programs ?? null; const div = pr?.divergence ?? null;
    const ok = !!pr && (want.verdict !== 'WITNESS' ? got.verdict === want.verdict && !div : !!div) && (want.commands === undefined || div?.commands === want.commands) && (want.mine === undefined || div?.mine === want.mine);
    add('pair', name, `programs ${unit} ${want.verdict}${want.commands ? ' in ' + want.commands : ''}`, ok, pr ? `${pr.programs} programs, ${pr.commands} commands${div ? `; divergence at ${div.method} after ${div.commands} command(s)${div.mine ? '' : ' (another unit)'}` : ''}` : 'no programs summary');
  }
  // the environment programs lane B ran for a free function (program.mjs on fast-check): the verdict, the shrunk program's length, the replay
  for (const [unit, want] of Object.entries(exp.envPrograms ?? {})) {
    let got = null; try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${unit}.json`), 'utf8')); } catch { /* keep */ }
    const ep = got?.bound?.environmentPrograms ?? null; const w = got?.witnesses?.find((x) => x.input === 'environment program') ?? null;
    const ok = !!ep && got.verdict === want.verdict && (want.verdict !== 'WITNESS' || (!!w && w.replayed === true && (want.commands === undefined || w.program.length === want.commands)));
    add('pair', name, `environment programs ${unit} ${want.verdict}${want.commands ? ' in ' + want.commands : ''}`, ok, ep ? (w ? `${w.program.join(', ')}; seed ${w.seed}, path ${w.path}, replayed ${w.replayed}` : `${ep.runs} programs of up to ${ep.maxCommands} commands, no divergence`) : 'no environment-programs summary');
  }
  // deep render (moonshot 7): the unit run twice by lane B, with --deep (same-package children rendered one level down) and without (a tree of names)
  for (const [unit, want] of Object.entries(exp.deep ?? {})) {
    const got = {};
    for (const mode of ['deep', 'names']) { const out = path.join(tmpd, `deep_${mode}_${unit}.json`); run('node', [path.join(here, '../exec/run.mjs'), '--parent', pairFile(d, 'parent'), '--candidate', pairFile(d, 'candidate'), '--unit', unit, '--n', '20', '--no-project', ...(mode === 'deep' ? ['--deep'] : []), '--out', out]); try { got[mode] = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { got[mode] = null; } }
    const ok = !!got.deep && !!got.names && got.deep.verdict === want.deep && got.names.verdict === want.names && /one level down/.test(got.deep.bound?.frontEnd?.components ?? '');
    add('pair', name, `deep render ${unit} ${want.deep} / names ${want.names}`, ok, `deep ${got.deep?.verdict ?? 'no result'}, names ${got.names?.verdict ?? 'no result'}`);
  }
  // the schedule explorer (moonshot 9): the clock as a command, every order of the timers due at one instant; the verdict, the witness sequence, the timer bound
  for (const [unit, want] of Object.entries(exp.schedules ?? {})) {
    let got = null; try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${unit}.json`), 'utf8')); } catch { /* keep */ }
    const sc = got?.bound?.schedules ?? null; const w = got?.witnesses?.find((x) => x.schedule) ?? null;
    const ok = !!sc && got.verdict === want.verdict && (want.sequence === undefined || JSON.stringify(w?.sequence ?? null) === JSON.stringify(want.sequence)) && (want.timers === undefined || sc.timers === want.timers);
    add('pair', name, `schedules ${unit} ${want.verdict}${want.sequence ? ' by ' + want.sequence.join(', ') : ''}`, ok, sc ? `${sc.timers} timer(s), ${sc.paths ?? '?'} paths${w ? `; witness ${w.sequence.join(', ')} at step ${w.step}` : ''}` : 'no schedules summary');
  }
  // the element-tree patch a front-end WITNESS carries (patch.mjs): the kinds of its ops, in order, and its summary line
  for (const [unit, want] of Object.entries(exp.patch ?? {})) {
    let got = null; try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${unit}.json`), 'utf8')); } catch { /* keep */ }
    const w = got?.witnesses?.[0] ?? null; const kinds = Array.isArray(w?.patch) ? w.patch.map((o) => o.kind) : null;
    const ok = got?.verdict === 'WITNESS' && !!kinds && JSON.stringify(kinds) === JSON.stringify(want.kinds) && (want.summary === undefined || w.patchSummary === want.summary);
    add('pair', name, `patch ${unit} ${want.kinds.join(', ') || 'empty'}`, ok, w ? `${w.patchSummary ?? 'no summary'}; ${kinds ? kinds.join(', ') || 'no ops' : 'no patch'}` : `no witness (${got?.verdict ?? 'no result'})`);
  }
  // the callee a WITNESS came through (exec/callees.mjs): a unit whose own text is equal on both sides names the changed same-file callees on its call path, with where.cause 'callee'; an empty list: the witness names none and keeps its own cause
  for (const [unit, want] of Object.entries(exp.through ?? {})) {
    let got = null; try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${unit}.json`), 'utf8')); } catch { /* keep */ }
    const w = got?.witnesses?.[0] ?? null; const names = (w?.through ?? []).map((t) => t.callee);
    const ok = got?.verdict === 'WITNESS' && JSON.stringify(names) === JSON.stringify(want) && (want.length ? w.where?.cause === 'callee' && got.unitTextEqual === true : w.where?.cause !== 'callee');
    add('pair', name, `through ${unit} ${want.join(', ') || 'none'}`, ok, w ? `${names.join(', ') || 'no callee'}; cause ${w.where?.cause ?? w.where?.field ?? 'none'}; unit text ${got.unitTextEqual ? 'equal' : 'changed'}` : `no witness (${got?.verdict ?? 'no result'})`);
  }
  // the small heaps lane B enumerated for the unit (korat.mjs): at least `min` non-isomorphic graphs, reported in bound.heaps
  for (const [unit, want] of Object.entries(exp.heaps ?? {})) {
    let got = null; try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${unit}.json`), 'utf8')).bound?.heaps ?? null; } catch { /* keep */ }
    add('pair', name, `heaps ${unit} enumerated`, !!got && got.enumerated >= want.min, got ? `${got.enumerated} distinct of ${got.assignments} assignments (space ${got.space}, pool ${got.pool})` : 'no heaps summary');
  }
  // the handler interpreter (moonshot 6b): at every fire of the sequences and the finite lane, each readable descriptor applied to the slots agrees with the real invocation
  for (const [unit, want] of Object.entries(exp.handlers ?? {})) {
    let got = null; try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${unit}.json`), 'utf8')).bound?.frontEnd?.handlers ?? null; } catch { /* keep */ }
    const ok = !!got && typeof got === 'object' && Array.isArray(got.defects) && got.defects.length === 0 && got.agreed === got.interpretable && got.interpretable >= (want.interpretable ?? 0);
    add('pair', name, `handlers ${unit} agree`, ok, got && typeof got === 'object' ? `${got.agreed} of ${got.interpretable} interpretable agreed (${got.readable} readable, ${got.fired} fired); ${got.defects?.length ?? '?'} defects` : 'no handlers summary');
  }
  // the library table validated by the run: the built-in calls made from the unit's files, each checked against its row
  const libraryOf = (unit, env, out) => { run('node', [path.join(here, '../exec/run.mjs'), '--parent', pairFile(d, 'parent'), '--candidate', pairFile(d, 'candidate'), '--unit', unit, '--n', '30', '--no-project', '--out', out], env); try { return JSON.parse(fs.readFileSync(out, 'utf8')).bound?.library ?? null; } catch { return null; } };
  for (const [unit, want] of Object.entries(exp.library ?? {})) {
    const L = libraryOf(unit, undefined, path.join(tmpd, `lib_${unit}.json`));
    const ok = !!L && (want.ops ?? []).every((op) => (L.ops[op] ?? 0) > 0) && L.defects.length === (want.defects ?? 0);
    add('pair', name, `library ${unit} recorded`, ok, L ? `${L.records} records: ${Object.keys(L.ops).join(', ')}; ${L.defects.length} defects` : 'no library summary');
  }
  for (const [unit, want] of Object.entries(exp.libraryWrong ?? {})) { // a row the engine contradicts is a defect naming its operation
    const L = libraryOf(unit, { LEAN_LIBRARY_TABLE: path.join(here, want.table) }, path.join(tmpd, `libw_${unit}.json`));
    const hit = L ? L.defects.find((x) => x.op === want.op) : null;
    add('pair', name, `library ${unit} wrong table refuted`, !!hit, hit ? `${hit.op}: ${hit.why} (expected ${hit.expected})` : (L ? `${L.defects.length} defects, none on ${want.op}` : 'no library summary'));
  }
  for (const [unit, want] of Object.entries(exp.libraryCheck ?? {})) { // the proof lane refuses the operation while the row is wrong; lane B's own verdict stands
    const out = path.join(tmpd, `libc_${unit}.json`);
    run('node', [path.join(here, '../check.mjs'), '--parent', pairFile(d, 'parent'), '--candidate', pairFile(d, 'candidate'), '--unit', unit, '--n', '30', '--no-project', '--dafny-seconds', '30', '--out', out], { LEAN_LIBRARY_TABLE: path.join(here, want.table) });
    let got = {}; try { got = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { /* missing output fails */ }
    const ok = got.verdict === want.verdict && new RegExp(want.reason).test(got.reason ?? '') && got.certificate?.lanes?.A?.verdict === 'ASK:library-model';
    add('pair', name, `library ${unit} proof refused on a wrong row`, ok, `${got.verdict ?? 'no result'}: ${(got.reason ?? '').slice(0, 120)} | A: ${got.certificate?.lanes?.A?.verdict ?? '-'} | B: ${got.certificate?.lanes?.B?.verdict ?? '-'}`);
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
  const candidateUnit = (src.match(/^\/\/ candidate-unit:\s*(\S+)/m) ?? [])[1];
  const l = run('node', [lint, ...(candidateUnit ? ['--candidate', file, '--unit', candidateUnit, '--n', '1', '--no-project'] : [file])]);
  const hit = l.stdout.split('\n').some((line) => new RegExp(`\\s${want}\\s`).test(line));
  add('escape', name, 'lint refuses', l.status === 1 && hit, l.status === 1 ? (hit ? `refused: ${want}` : `refused, but not for ${want}`) : 'ACCEPTED', lscAccepts(file));
  const fn = (src.match(/^export (?:async )?function (\w+)/m) ?? [])[1];
  if (fn && !candidateUnit) {
    const t = run('node', [translate, file, '--fn', fn, '--out', path.join(tmp, `esc_${name}.dfy`)]);
    add('escape', name, 'translate refuses', t.status === 1, t.status === 1 ? 'refused' : 'TRANSLATED');
  }
}

// ----- advice labels: the label of the rewrite the lint advises, as --json reports it (first line `// expect: <rule> <label>`) -----
const advDir = path.join(here, 'fixtures/advice');
for (const f of fs.existsSync(advDir) ? fs.readdirSync(advDir).filter((x) => x.endsWith('.ts')).sort() : []) {
  const src = fs.readFileSync(path.join(advDir, f), 'utf8');
  const [, rule, label] = src.match(/^\/\/ expect:\s*(\S+)\s+(proved|conditional|migration)\b/m) ?? [];
  const name = f.replace(/\.ts$/, '');
  if (!rule) { add('advice', name, 'expect line', false, 'missing `// expect: <rule> <label>`'); continue; }
  const l = run('node', [lint, path.join(advDir, f), '--json']);
  let found = []; try { found = JSON.parse(l.stdout).filter((x) => x.rule === rule); } catch { /* not JSON: fails below */ }
  const tag = label === 'conditional' ? '[conditional: ' : `[${label}]`;
  const ok = l.status === 1 && found.length > 0 && found.every((x) => x.label === label && (x.advice ?? '').startsWith(tag) && (label !== 'conditional' || !!x.precondition));
  add('advice', name, `${rule} ${label}`, ok, found.length ? found.map((x) => `${x.label}${x.labelDecided ? ' (decided at the site)' : ''}`).join(', ') : `no ${rule} finding (exit ${l.status})`);
}

// seeded clock values retain their native shapes and ordered observations
const clocks = run('node', [path.join(here, 'clock-read.mjs')]);
add('runtime', 'clock-read', 'seeded recording fakes', clocks.status === 0, (clocks.stdout + clocks.stderr).trim());
// a run never ends without a verdict: a drained loop and a budget stop are ASK, exit 2; a wide record, a deep nesting and an `@/` alias get verdicts
const silent = run('node', [path.join(here, 'no-silent-exit.mjs')]);
add('runtime', 'no-silent-exit', 'ASK on a drained loop or a budget stop; verdicts on wide, nested and aliased inputs', silent.status === 0, (silent.stdout + silent.stderr).trim().split('\n').pop());

// a self-pair never witnesses: a file compared against itself through lane B is PASS-bounded (a module that starts
// asynchronous work while it loads is the case that broke it: that work is the starting state of both sides)
for (const f of fs.readdirSync(path.join(here, 'fixtures/self-pair')).filter((x) => /\.tsx?$/.test(x)).sort()) {
  const file = path.join(here, 'fixtures/self-pair', f), unit = (fs.readFileSync(file, 'utf8').match(/^export function (\w+)/m) ?? [])[1];
  const r = run('node', [path.join(here, '../exec/run.mjs'), '--parent', file, '--candidate', file, '--unit', unit, '--n', '30', '--no-project']);
  let verdict = null, detail = (r.stdout + r.stderr).trim().slice(-200); try { const o = JSON.parse(r.stdout); verdict = o.verdict; detail = verdict === 'WITNESS' ? `WITNESS at ${JSON.stringify(o.witnesses[0].where)}` : verdict; } catch { /* not JSON: fails below */ }
  add('runtime', 'self-pair', `${f}: ${unit} against itself is PASS-bounded`, verdict === 'PASS-bounded', detail);
}

// a project's `paths` alias without a baseUrl resolves from its tsconfig's folder, a workspace package to its source, a declared baseUrl is kept
{
  const { loadProgram, RESOLUTION_CODES } = await import('../common.mjs');
  const web = path.join(here, 'fixtures/paths-alias/apps/web');
  for (const [cfg, wantBase] of [['tsconfig.json', null], ['tsconfig.base-url.json', web]]) {
    let detail, ok = false;
    try {
      const L = loadProgram(path.join(web, 'src/index.ts'), { project: path.join(web, cfg) });
      const unresolved = L.diagnostics.filter((d) => RESOLUTION_CODES.has(d.code)).map((d) => `TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
      const base = L.program.getCompilerOptions().baseUrl ?? null;
      ok = unresolved.length === 0 && L.diagnostics.length === 0 && (base && path.resolve(base)) === (wantBase && path.resolve(wantBase));
      detail = `baseUrl ${base ? path.relative(here, base) : 'none'}; ${L.diagnostics.length} diagnostics${unresolved.length ? ': ' + unresolved.join('; ') : ''}`;
    } catch (e) { detail = String(e.message).slice(0, 160); }
    add('runtime', 'paths-alias', `${cfg}: @/ alias and workspace package resolve`, ok, detail);
  }
}

// ----- the repository's own conformance run, when present -----
// ----- lane B's hook runtime against React-tRace's scenarios (langs/ts/exec/react-trace.mjs) -----
{
  const r = run('node', [path.join(here, '../exec/react-trace.mjs'), '--json']);
  let summary = null; try { summary = JSON.parse(r.stdout).summary; } catch { /* no JSON: the runner crashed */ }
  add('repo', 'react-trace scenarios', 'runner', !!summary && summary.disagree.length === 0, summary ? `${summary.agree} of ${summary.scenarios} agree${summary.disagree.length ? '; ' + summary.disagree.map((d) => d.scenario).join(', ') : ''}` : (r.stderr || r.stdout).trim().slice(-160));
}
// ----- the element-tree patch of a front-end WITNESS on hand-built trees (langs/ts/patch.test.mjs, node:test) -----
{
  const r = run('node', ['--test', path.join(here, '../patch.test.mjs')]);
  const text = (r.stdout ?? '') + (r.stderr ?? ''); const pass = text.match(/^\S+ pass (\d+)$/m), fail = text.match(/^\S+ fail (\d+)$/m);
  add('repo', 'patch.test.mjs', 'node:test', r.status === 0, pass ? `${pass[1]} pass, ${fail ? fail[1] : '?'} fail` : text.trim().slice(-160));
}
// ----- the same-file callees of a unit and its normalised text (langs/ts/exec/callees.test.mjs, node:test) -----
{
  const r = run('node', ['--test', path.join(here, '../exec/callees.test.mjs')]);
  const text = (r.stdout ?? '') + (r.stderr ?? ''); const pass = text.match(/^\S+ pass (\d+)$/m), fail = text.match(/^\S+ fail (\d+)$/m);
  add('repo', 'callees.test.mjs', 'node:test', r.status === 0, pass ? `${pass[1]} pass, ${fail ? fail[1] : '?'} fail` : text.trim().slice(-160));
}
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
