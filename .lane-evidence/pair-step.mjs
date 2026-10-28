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
import { ts, dn } from '/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/langs/ts/common.mjs';
import { restsOf, restsClosure, provedLemma, commentAdapters, agreeCore, canonPartsOf, dafnyName } from '/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/langs/ts/check.mjs';

const here = '/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param/langs/ts/tests';
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

const pairFile = (d, side) => fs.existsSync(path.join(d, side + '.tsx')) ? path.join(d, side + '.tsx') : path.join(d, side + '.ts');
// ----- pairs: parent against candidate through the theorem and Dafny -----
const pairsDir = path.join(here, 'pairs');
// LEAN_PAIRS=a,b runs these pairs only (a merge smoke); the full suite is the gate, this is never it
const huntA = new Map(); // pair name -> lane A's reading of each lemma, for the proof-hunt step
const onlyPairs = process.env.LEAN_PAIRS ? new Set(process.env.LEAN_PAIRS.split(',').map((x) => x.trim()).filter(Boolean)) : null;
for (const name of fs.existsSync(pairsDir) ? fs.readdirSync(pairsDir).sort().filter((n) => !onlyPairs || onlyPairs.has(n)) : []) {
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
  // the heap core agreed on the units both sides hold (check.mjs agreeCore): a unit in the core on one side only would change its signature; a unit one side holds alone (a callee inlined away) takes its own side's core
  agreeCore({ files: { parent: pairFile(d, 'parent'), candidate: pairFile(d, 'candidate') }, dfyOf: (which) => path.join(tmpd, `${which}.dfy`), heap: exp.heap !== false, tr: (which, eff, units) => tr(which, [...(eff ? ['--effectful', eff] : []), ...(units !== undefined ? ['--heap-units', units || '-'] : [])]) });
  const adapters = typeof exp.adapters === 'string' ? JSON.parse(fs.readFileSync(path.join(d, exp.adapters), 'utf8')).adapters : exp.adapters; // a changed signature proves through the adapter the pair's scope file declares, the comment door included (check.mjs reads it from the candidate)
  const commentDoor = commentAdapters(pairFile(d, 'candidate'));
  const allAdapters = { ...commentDoor, ...(adapters ?? {}) };
  fs.writeFileSync(path.join(tmpd, 'scope.json'), JSON.stringify({ functions: Object.fromEntries(exp.scope.map((f) => [f, { in_scope: 'false' }])), summaries: true, ...(Object.keys(allAdapters).length ? { adapters: allAdapters } : {}) }));
  fs.writeFileSync(path.join(tmpd, 'edit.json'), '{}');
  const th = run('python3', ['-I', path.join(root, 'spec/theorem.py'), '--parent', path.join(tmpd, 'parent.dfy'), '--candidate', path.join(tmpd, 'candidate.dfy'), '--scope', path.join(tmpd, 'scope.json'), '--edit', path.join(tmpd, 'edit.json'), '--out', path.join(tmpd, 'theorem.dfy')]);
  add('pair', name, 'theorem generated', th.status === 0, th.status === 0 ? 'ok' : (th.stderr || th.stdout).trim().slice(-160));
  if (th.status !== 0) continue;
  const v = run('dafny', ['verify', '--verification-time-limit', '30', path.join(tmpd, 'theorem.dfy')]);
  const text = v.stdout + v.stderr;
  const lines = fs.readFileSync(path.join(tmpd, 'theorem.dfy'), 'utf8').split('\n');
  const spans = {}; let cur = null;
  lines.forEach((ln, i) => { const m = ln.match(/^lemma (?:\{[^}]*\}\s+)*(Equal(?:Canon|Direct)?_\w+)(?:<[^>]*>)?\(/); if (m) { cur = m[1]; spans[cur] = [i + 1, null]; } if (/^\} \/\/ END Equal(Canon|Direct)?_/.test(ln) && cur) spans[cur][1] = i + 1; });
  const errs = [...text.matchAll(/theorem\.dfy\((\d+),\d+\): Error/g)].map((m) => Number(m[1]));
  const finished = /finished with \d+ verified/.test(text); // no verdict line: a resolution error, nothing is proved
  const rests = restsOf(lines); // a caller's lemma rests on its callees' summaries: proved only when every lemma it rests on is proved
  const spanClean = (k) => finished && !!spans[k] && !errs.some((L) => spans[k][0] <= L && L <= spans[k][1]);
  for (const [f, want] of Object.entries(exp.equal)) {
    const sp = spans[`Equal_${f}`];
    const viaRests = provedLemma(`Equal_${f}`, spanClean, rests);
    const through = viaRests || !spanClean(`Equal_${f}`) ? [] : restsClosure(rests, `Equal_${f}`).filter((k) => !provedLemma(k, spanClean, rests));
    const whole = finished && !!sp && viaRests;
    const parts = canonPartsOf(Object.keys(spans), f); // the canonical-heap certificate: every part must hold (check.mjs canonPartsOf: this unit's parts only)
    const canon = finished && parts.length > 0 && parts.every((k) => !errs.some((L) => spans[k][0] <= L && L <= spans[k][1]));
    const proved = whole || canon;
    const withheld = lines.find((ln) => ln.startsWith(`// UNGUARDED Equal_${f}: `));
    const got = sp ? (proved ? (whole ? 'proved' : 'proved (canonical heap)') : through.length ? `not proved through ${through.map((k) => k.slice(6)).join(', ')}` : 'not proved') : withheld ? `withheld: ${withheld.slice(withheld.indexOf(': ') + 2, withheld.indexOf(': ') + 120)}` : 'lemma missing';
    const ok = want === 'withheld' ? !!withheld : proved === want && !(want && withheld); // "withheld": the identity guard must have withheld the lemma
    add('pair', name, `Equal_${f} ${want === 'withheld' ? 'withheld' : want ? 'proved' : 'not proved'}`, ok, got);
    if (exp.canon && f in exp.canon) add('pair', name, `EqualCanon_${f} ${exp.canon[f] ? 'proved' : 'not proved'}`, canon === exp.canon[f] && (!exp.canon[f] || !whole), `${parts.length} parts: ${parts.filter((k) => errs.some((L) => spans[k][0] <= L && L <= spans[k][1])).map((k) => k.slice(k.lastIndexOf('_') + 1)).join(', ') || 'all hold'}${whole ? '; whole heap also proved' : ''}`); // "canon": the canonical reading alone proves it (the whole-heap lemma fails)
  }
  // the proof-hunt step reads lane A's result on every lemma of the pair, listed in expect.json or not (below)
  huntA.set(name, { adapters: Object.keys(allAdapters), proved: (f) => { if (!finished || !spans[`Equal_${f}`]) return null; const parts = canonPartsOf(Object.keys(spans), f); return provedLemma(`Equal_${f}`, spanClean, rests) || (parts.length > 0 && parts.every((k) => !errs.some((L) => spans[k][0] <= L && L <= spans[k][1]))); } });
  }
  // lane B on the same pair
  for (const [unit, want] of Object.entries(exp.b ?? {})) {
    const r = run('node', [path.join(here, '../exec/run.mjs'), '--parent', pairFile(d, 'parent'), '--candidate', pairFile(d, 'candidate'), '--unit', unit, '--n', '30', '--no-project', '--out', path.join(tmpd, `b_${unit}.json`)]);
    let got = 'no result';
    try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${unit}.json`), 'utf8')).verdict; } catch { /* keep */ }
    add('pair', name, `lane B ${unit} ${want}`, got === want, got);
  }
  // the states lane B reached (bound.states, for the gate's rendering check): one per input that ran on both sides, each
  // with its index and its arguments as drawn; `states` in expect.json names the unit and the count of inputs it ran
  for (const [unit, want] of Object.entries(exp.states ?? {})) {
    let got = null; try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${unit}.json`), 'utf8')); } catch { /* keep */ }
    const st = got?.bound?.states;
    const ok = Array.isArray(st) && st.length === want && st.every((x, i) => x.input === i && Array.isArray(x.args));
    add('pair', name, `states ${unit} ${want}`, ok, Array.isArray(st) ? `${st.length} states, first ${JSON.stringify(st[0] ?? null).slice(0, 80)}` : `no states (${got?.verdict ?? 'no result'})`);
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
  // races (design/schedules.md): two callers on one receiver, every promise the world answers held by the scheduler, the
  // orders bounded by conflicts; a WITNESS carries both orders, the dependent pair and its replay; a clean run its order count
  for (const [unit, want] of Object.entries(exp.races ?? {})) {
    let got = null; try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${unit}.json`), 'utf8')); } catch { /* keep */ }
    const rc = got?.bound?.races ?? null; const w = got?.witnesses?.find((x) => x.race) ?? null; const runs = rc?.orders ? rc.orders.parent + rc.orders.candidate : null;
    const pairOk = (x) => !!x && (want.pair === undefined || (x.dependentPair?.moved === want.pair[0] && x.dependentPair?.before === want.pair[1])) && (want.cells === undefined || JSON.stringify(x.dependentPair?.cells) === JSON.stringify(want.cells));
    const ok = !!rc && got.verdict === want.verdict && rc.liveCalls === 2 && /complete only within the stated bound/.test(rc.bound ?? '') && (want.verdict === 'WITNESS' ? pairOk(w) && w.replayed === true && w.orders?.default?.order?.length > 0 && JSON.stringify(w.orders.default.order) !== JSON.stringify(w.orders.distinguishing?.order) && (want.side === undefined || w.side === want.side) && (want.lines === undefined || ['parent', 'candidate'].every((k) => w.where?.lines?.[k]?.file?.endsWith(`/${k}.ts`) && w.where.lines[k].start >= 1 && w.where.lines[k].text.includes(want.lines[k]))) : !w && rc.complete === true && (want.orders === undefined || runs === want.orders));
    add('pair', name, `races ${unit} ${want.verdict}${want.pair ? ' by ' + want.pair.join(' before ') : ''}${want.orders ? ' in ' + want.orders + ' orders' : ''}`, ok, rc ? (w ? `${w.side}: ${w.orders.distinguishing.order.join(', ')} against ${w.orders.default.order.join(', ')}; pair ${w.dependentPair.moved} before ${w.dependentPair.before} on ${w.dependentPair.cells.join(', ')}; replayed ${w.replayed}` : `${runs} orders over ${rc.programs} programs (b ${rc.preemptions}, ${rc.dependentPairs} dependent pairs, ${rc.drawn} drawn), complete ${rc.complete}${rc.ask ? '; ' + rc.ask : ''}`) : 'no races summary');
  }
  // the element-tree patch a front-end WITNESS carries (patch.mjs): the kinds of its ops, in order, and its summary line
  for (const [unit, want] of Object.entries(exp.patch ?? {})) {
    let got = null; try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${unit}.json`), 'utf8')); } catch { /* keep */ }
    const w = got?.witnesses?.[0] ?? null; const kinds = Array.isArray(w?.patch) ? w.patch.map((o) => o.kind) : null;
    const ok = got?.verdict === 'WITNESS' && !!kinds && JSON.stringify(kinds) === JSON.stringify(want.kinds) && (want.summary === undefined || w.patchSummary === want.summary);
    add('pair', name, `patch ${unit} ${want.kinds.join(', ') || 'empty'}`, ok, w ? `${w.patchSummary ?? 'no summary'}; ${kinds ? kinds.join(', ') || 'no ops' : 'no patch'}` : `no witness (${got?.verdict ?? 'no result'})`);
  }
  // the whole verdict of check.mjs for a unit (both lanes, the pair's scope file with its adapters): an adapted unit is
  // PASS-proved through its adapter, a changed signature without one is ASK:interface naming the door whatever lane B found
  for (const [unit, want] of Object.entries(exp.check ?? {})) {
    const out = path.join(tmpd, `check_${unit}.json`);
    run('node', [path.join(here, '../check.mjs'), '--parent', pairFile(d, 'parent'), '--candidate', pairFile(d, 'candidate'), '--unit', unit, '--n', '30', '--no-project', '--dafny-seconds', '30', ...(typeof exp.adapters === 'string' ? ['--scope', path.join(d, exp.adapters)] : []), '--out', out]);
    let got = {}; try { got = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { /* missing output fails */ }
    const A = got.certificate?.lanes?.A ?? {};
    const ok = got.verdict === want.verdict && (!want.laneA || A.verdict === want.laneA) && (!want.reason || (got.reason ?? '').includes(want.reason)) && (!want.door || A.adapter?.door === want.door);
    add('pair', name, `check ${unit} ${want.verdict}${want.laneA ? ' (' + want.laneA + ')' : ''}`, ok, `${got.verdict ?? 'no result'} | A: ${A.verdict ?? '-'} | B: ${got.certificate?.lanes?.B?.verdict ?? '-'} | ${(got.reason ?? '').slice(0, 140)}`);
  }
  // the layered UI certificate (design/ui-layers.md): check.mjs on the unit, at the stated depth; the tree layer (its verdict,
  // the depth, the children rendered and left as handles, each context read and where it came from) and the styles layer
  // (its verdict, the classes it could not read), each carrying its assumptions
  for (const [i, want] of (exp.layers ?? []).entries()) {
    const out = path.join(tmpd, `layers_${i}_${want.unit}.json`);
    run('node', [path.join(here, '../check.mjs'), '--parent', pairFile(d, 'parent'), '--candidate', pairFile(d, 'candidate'), '--unit', want.unit, '--n', '30', '--no-project', '--dafny-seconds', '30', ...(want.deep ? [`--deep=${want.deep}`] : []), '--out', out]);
    let got = {}; try { got = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { /* missing output fails */ }
    const L = got.certificate?.layers ?? null, T = L?.tree ?? {}, S = L?.styles ?? {};
    const names = (xs) => JSON.stringify((xs ?? []).map((x) => x.component).sort());
    const ok = !!L && (want.verdict === undefined || got.verdict === want.verdict) && (want.tree === undefined || T.verdict === want.tree) && T.depth === (want.deep ?? 0) && (want.rendered === undefined || names(T.rendered) === JSON.stringify([...want.rendered].sort())) && (want.handles === undefined || names(T.handles) === JSON.stringify([...want.handles].sort())) && (want.contexts ?? []).every((c) => (T.contexts ?? []).some((x) => x.frame === c.frame && x.from === c.from)) && (want.styles === undefined || S.verdict === want.styles) && (want.unsupported ?? []).every((c) => (S.unsupported ?? []).some((x) => x.class === c)) && (T.assumptions ?? []).length > 0 && (S.assumptions ?? []).length > 0 && /pixels/.test(L.notObserved ?? '');
    add('pair', name, `layers ${want.unit}${want.deep ? ' deep ' + want.deep : ''}: tree ${want.tree ?? '-'}, styles ${want.styles ?? '-'}`, ok, L ? `${got.verdict} | tree ${T.verdict} depth ${T.depth}, rendered ${names(T.rendered)}, handles ${names(T.handles)}, contexts ${(T.contexts ?? []).map((x) => `${x.frame}:${x.from}`).join(' ') || 'none'} | styles ${S.verdict}${(S.unsupported ?? []).length ? ', unsupported ' + S.unsupported.map((x) => x.class).join(' ') : ''}` : `no layers (${got.verdict ?? 'no result'})`);
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

// ----- proof hunt: lane A beside lane B on every unit the pair step ran (langs/ts/design/proof-hunt.md) -----
// check.mjs answers lane B first, so a lane A proof of two different behaviours is hidden whenever lane B witnesses.
// Here both are read: a unit lane B witnessed whose lemma lane A proved is a hidden false proof and fails, unless the
// pair declares an adapter for that unit (the scope file's adapters or a // lean-adapter comment: the adapted claim
// f_candidate(A(x)) == f_parent(x) is not the raw same-input comparison lane B ran), or lane B witnessed on special
// numbers only. The step prints its own TOTAL line.
{
  let both = 0, hidden = 0, exempt = 0;
  for (const [name, A] of huntA) {
    const d = path.join(pairsDir, name), exp = JSON.parse(fs.readFileSync(path.join(d, 'expect.json'), 'utf8'));
    for (const unit of Object.keys(exp.b ?? {})) {
      let B = null; try { B = JSON.parse(fs.readFileSync(path.join(tmp, `pair_${name}`, `b_${unit}.json`), 'utf8')); } catch { /* no lane B result: not counted */ }
      const f = dafnyName(unit), a = A.proved(f), b = B?.verdict;
      if (!b || a === null) continue;
      both++;
      if (!(a && b === 'WITNESS')) continue;
      // two doors only: a declared adapter, and a witness whose every input holds NaN, an infinity or a negative zero
      // (lane A's number model is finite and holds no -0 input, so its hypothesis excludes them: design/special-numbers.md,
      // design/signed-zero.md; the doubles reading, row 0d8976c3, closes this door); any other witness is hidden
      const door = A.adapters.includes(f) ? 'the pair declares an adapter door for this unit' : (B.witnesses ?? []).length && B.witnesses.every((w) => /"\$(nan|infinity|negativeZero)"/.test(JSON.stringify(w.args ?? w.input ?? null))) ? 'every witness input holds NaN, an infinity or -0, outside the finite number model (-0: row 0d8976c3)' : null;
      if (door) exempt++; else hidden++;
      add('proof-hunt', name, `${unit}: lane A proved, lane B WITNESS`, !!door, door ? `exempt: ${door}` : `HIDDEN FALSE PROOF: lane A proved a unit lane B witnessed at ${JSON.stringify(B.witnesses?.[0]?.args ?? null).slice(0, 120)}`);
    }
  }
  add('proof-hunt', 'all pairs', `${both} units read by both lanes`, hidden === 0, `${hidden} hidden false proofs, ${exempt} exempt by a door (adapter, special numbers incl. -0)`);
  console.log(`| PROOF-HUNT TOTAL | ${both} units read by both lanes | ${hidden === 0 ? 'NO HIDDEN FALSE PROOF' : `${hidden} HIDDEN FALSE PROOFS`} | ${exempt} exempt by a door (adapter, special numbers incl. -0) |`);
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
