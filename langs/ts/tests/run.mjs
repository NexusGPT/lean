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
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ts, dn, artifactName, loadProgram, topLevelFunctions, formatUnitList } from '../common.mjs';
import { restsOf, restsClosure, provedLemma, commentAdapters, agreeCore, canonPartsOf, dafnyName } from '../check.mjs';
import { restsOnFunctionText } from '../exec/fake.mjs';
import { cachedRun, cachedRunAsync, stepCacheStats, CACHE_DIR } from './stepcache.mjs'; // the step cache: a command keyed by what it reads (design: the owner's rule, the tests run fast on merges)
import { createPool, spawnCollect } from './pool.mjs';
import { faithfulPlacement } from '../check.mjs';
import { solveUnit } from '../solve/fp.mjs';
import { dafnySolverArgs } from '../solve/z3.mjs'; // the one Z3 (solve/z3.mjs): the Z3 the certificate names is the one the suite's Dafny runs
import { topLevelFunctions as unitsOfFile, loadProgram as loadForUnits } from '../common.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const lint = path.join(here, '../lint/lint.mjs');
const translate = path.join(here, '../translate/translate.mjs');
const theorems = JSON.parse(fs.readFileSync(path.join(here, 'theorems.json'), 'utf8'));
// The run: every section at once on one pool of JOBS child processes (tests/pool.mjs; default: the CPU count minus one,
// the owner, 29 Oct: "We can have also more workers and parallelise section better"); each pair in a child of this
// script (`--pair <name>`) that writes its rows to `--result`; each section keeps its own rows and the table prints the
// sections in their order, each in its own order, so the table is the same as a sequential run.
// The pool admits a child while the weights of the children running stay at or under JOBS; a job's weight is the cores
// its children keep busy, measured by tests/measure-weights.mjs into suite-weights.json (read from LEAN_SUITE_WEIGHTS,
// else beside the durations file, else tests/suite-weights.json, committed). The environment: JOBS, LEAN_PAIRS,
// LEAN_CONFORMANCE, LEAN_STEP_CACHE_DIR, LEAN_STEP_CACHE=0, LEAN_SUITE_DURATIONS (default: suite-durations.json in the
// step cache folder), LEAN_SUITE_WEIGHTS, LEAN_SUITE_TRACE (a `<pid> <job key>` line per child, for measure-weights).
const argvAt = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : null; };
const PAIR_ONLY = argvAt('--pair');
const RESULT_FILE = argvAt('--result');
const JOBS = Math.max(1, Number(process.env.JOBS ?? Math.max(1, os.cpus().length - 1)) || 1);
const tmp = argvAt('--tmp') ?? fs.mkdtempSync(path.join(os.tmpdir(), 'lean-ts-'));
// the idle-core CPU rate, measured once before any child runs and handed to every child: lane B stretches a unit's
// CPU bound by the unit's own measured slowdown against it (exec/run.mjs cpuContention), so a unit near its bound keeps
// its verdict when the pool shares the cores
if (!process.env.LEAN_CPU_BASELINE && !PAIR_ONLY) { const { cpuRateNsPerIter } = await import('../exec/run.mjs'); process.env.LEAN_CPU_BASELINE = String(cpuRateNsPerIter()); }
// every lane B worker's heap is its equal share of 60 percent of the machine (exec/run.mjs workerFlags): the heaps of JOBS workers must fit, or the operating system, not V8's limit, ends a spinning unit
if (!process.env.LEAN_WORKER_HEAP_MB && !PAIR_ONLY) process.env.LEAN_WORKER_HEAP_MB = String(Math.max(1024, Math.floor(os.totalmem() * 0.6 / JOBS / 1048576)));
const t0 = Date.now();

const run = (cmd, args, env) => spawnSync(cmd, args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26, env: env ? { ...process.env, ...env } : process.env });
const NORMALISE = [[tmp, '<tmp>'], [path.join(here, 'pairs'), '<pairs>'], [root, '<root>']];
// the same, through the step cache: `files` what the command reads, `outs` what it writes (restored on a hit)
const crun = (cmd, args, { files = [], outs = [], env = null } = {}) => cachedRun(run, cmd, args, { root, files, outs, env, normalise: NORMALISE });
const dafnyResult = (r) => {
  const text = (r.stdout ?? '') + (r.stderr ?? '');
  const m = text.match(/finished with (\d+) verified, (\d+) errors?/);
  return { ok: r.status === 0 && !!m && m[2] === '0', text, summary: m ? `${m[1]} verified, ${m[2]} errors` : (text.trim().split('\n').pop() || 'no output') };
};
const signature = (dfy) => {
  const m = dfy.match(/^(?:function|method)\s+(\w+)\s*\(([^)]*)\)\s*(?::|returns)\s*\(result:\s*([^)]+)\)/m);
  return m ? `${m[1]}(${m[2].replace(/\s+/g, ' ').trim()}) -> ${m[3].trim()}` : null;
};

const LSC = process.env.LSC_BIN || '/Users/assem/nexus/nexus-organisation/work/lean-tools/node_modules/.bin/lsc';
const row = (kind, name, check, ok, detail, lsc = '') => ({ kind, name, check, ok, detail, lsc });
const rows = []; // the rows of a `--pair` child (its result file)
const addChildRow = (...a) => rows.push(row(...a));

const sharedDir = path.join(root, 'fixtures/shared');
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
const snake = (n) => n.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').toLowerCase();
const dfyLit = (v) => (Array.isArray(v) ? `[${v.map(dfyLit).join(', ')}]` : typeof v === 'string' ? JSON.stringify(v) : String(v));
const show = (v) => (Array.isArray(v) ? `[${v.map(show).join(', ')}]` : String(v));

// ----- pairs: parent against candidate through the theorem and Dafny (one pair: runPairStep) -----
const pairsDir = path.join(here, 'pairs');
// LEAN_PAIRS=a,b runs these pairs only (a merge smoke); the full suite is the gate, this is never it
const huntA = new Map(); // pair name -> lane A's reading of each lemma, for the proof-hunt step
const onlyPairs = process.env.LEAN_PAIRS ? new Set(process.env.LEAN_PAIRS.split(',').map((x) => x.trim()).filter(Boolean)) : null;
const pairNames = fs.existsSync(pairsDir) ? fs.readdirSync(pairsDir).sort().filter((n) => !onlyPairs || onlyPairs.has(n)) : [];
async function runPairStep(name, add = addChildRow) { // add: where its rows go (a `--pair` child's rows, or the pairs section when the pairs run in this process)
  const d = path.join(pairsDir, name);
  const exp = JSON.parse(fs.readFileSync(path.join(d, 'expect.json'), 'utf8'));
  const tmpd = path.join(tmp, `pair_${name}`); fs.mkdirSync(tmpd, { recursive: true });
  if (exp.candidateOnly) {
    for (const [i, want] of exp.candidateOnly.entries()) {
      const out = path.join(tmpd, `new_${i}.json`);
      crun('node', [path.join(here, '../check.mjs'), ...(want.parent ? ['--parent', path.join(d, want.parent)] : []), '--candidate', path.join(d, want.file), '--unit', want.unit, '--n', '30', ...(want.project ? [] : ['--no-project']), '--out', out], { files: [...(want.parent ? [path.join(d, want.parent)] : []), path.join(d, want.file)], outs: [out] });
      let got = {}; try { got = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { /* missing output fails */ }
      const ok = got.verdict === want.verdict && (!want.kind || got.kind === want.kind) && (!want.environmentClass || got.environmentClass === want.environmentClass) && (!want.phase || got.phase === want.phase) && (!want.linkKind || got.link?.kind === want.linkKind) && (!want.reason || got.reason?.includes(want.reason)) && (!want.laneA || JSON.stringify(got.certificate?.lanes?.A ?? null).includes(want.laneA)) && (want.inputs === undefined || got.inputs === want.inputs) && (want.faults === undefined || got.faults === want.faults) && (got.verdict !== 'NEW' || (got.loaded === true && got.seed === 1 && Array.isArray(got.fakes) && got.traceShape?.reduce((n, s) => n + s.inputs, 0) === got.inputs && !got.certificate?.lanes?.A));
      add('pair', name, `${want.file} ${want.unit} ${want.verdict}${want.laneA ? ' (lane A ' + want.laneA + ')' : ''}`, ok, JSON.stringify({ verdict: got.verdict, inputs: got.inputs, faults: got.faults, reason: got.reason, ...(want.laneA ? { laneA: String(got.certificate?.lanes?.A?.detail ?? got.certificate?.lanes?.A?.verdict ?? '').slice(-160) } : {}) }));
    }
    return;
  }
  if (!exp.laneBOnly) { // a pair whose units lane A refuses by design (closures over mutable cells) checks lane B alone
  const tr = (which, extra) => crun('node', [translate, pairFile(d, which), '--core', '--suffix', which, '--out', path.join(tmpd, `${which}.dfy`), '--prelude', path.join(tmpd, `${which}.pre.dfy`), '--no-project', ...(exp.heap !== false ? ['--heap'] : []), ...extra], { files: [pairFile(d, which)], outs: [path.join(tmpd, `${which}.dfy`), path.join(tmpd, `${which}.pre.dfy`)] });
  // the heap core agreed on the units both sides hold (check.mjs agreeCore): a unit in the core on one side only would change its signature; a unit one side holds alone (a callee inlined away) takes its own side's core
  agreeCore({ files: { parent: pairFile(d, 'parent'), candidate: pairFile(d, 'candidate') }, dfyOf: (which) => path.join(tmpd, `${which}.dfy`), heap: exp.heap !== false, tr: (which, eff, units) => tr(which, [...(eff ? ['--effectful', eff] : []), ...(units !== undefined ? ['--heap-units', units || '-'] : [])]) });
  const adapters = typeof exp.adapters === 'string' ? JSON.parse(fs.readFileSync(path.join(d, exp.adapters), 'utf8')).adapters : exp.adapters; // a changed signature proves through the adapter the pair's scope file declares, the comment door included (check.mjs reads it from the candidate)
  const commentDoor = commentAdapters(pairFile(d, 'candidate'));
  const allAdapters = { ...commentDoor, ...(adapters ?? {}) };
  fs.writeFileSync(path.join(tmpd, 'scope.json'), JSON.stringify({ functions: Object.fromEntries(exp.scope.map((f) => [f, { in_scope: 'false' }])), summaries: true, ...(Object.keys(allAdapters).length ? { adapters: allAdapters } : {}) }));
  fs.writeFileSync(path.join(tmpd, 'edit.json'), '{}');
  const th = crun('python3', ['-I', path.join(root, 'spec/theorem.py'), '--parent', path.join(tmpd, 'parent.dfy'), '--candidate', path.join(tmpd, 'candidate.dfy'), '--scope', path.join(tmpd, 'scope.json'), '--edit', path.join(tmpd, 'edit.json'), '--out', path.join(tmpd, 'theorem.dfy')], { files: ['parent.dfy', 'candidate.dfy', 'scope.json', 'edit.json'].map((f) => path.join(tmpd, f)), outs: [path.join(tmpd, 'theorem.dfy')] });
  add('pair', name, 'theorem generated', th.status === 0, th.status === 0 ? 'ok' : (th.stderr || th.stdout).trim().slice(-160));
  if (th.status !== 0) return;
  // lane A's time limit stretches with the share of the machine one Dafny process gets: alone it verifies a lemma's parts
  // across the cores (--cores above), under JOBS neighbours it holds floor(cpus / JOBS) cores and the same parts run in
  // sequence, so the wall a lemma needs grows by that ratio. The stretch is that ratio, capped at 4 (heap_canonical's
  // EqualCanon_pair runs in 4 parts: 13 of 13 alone on 11 cores, 2 rows red twice under JOBS 28 on 32 cores at 30 s)
  const coresEach = Math.max(1, Math.floor(os.cpus().length / JOBS));
  const dafnyStretch = Math.min(4, Math.max(1, os.cpus().length / coresEach / 4));
  const v = crun('dafny', ['verify', '--verification-time-limit', String(Math.round(30 * dafnyStretch)), ...dafnySolverArgs(), '--cores', String(Math.max(1, Math.floor(os.cpus().length / JOBS))), path.join(tmpd, 'theorem.dfy')], { files: [path.join(tmpd, 'theorem.dfy')] }); // the cores split across the pairs running at once
  const text = v.stdout + v.stderr;
  const lines = fs.readFileSync(path.join(tmpd, 'theorem.dfy'), 'utf8').split('\n');
  const spans = {}; let cur = null;
  lines.forEach((ln, i) => { const m = ln.match(/^lemma (?:\{[^}]*\}\s+)*(Equal(?:Canon|Direct)?_\w+)(?:<[^>]*>)?\(/); if (m) { cur = m[1]; spans[cur] = [i + 1, null]; } if (/^\} \/\/ END Equal(Canon|Direct)?_/.test(ln) && cur) spans[cur][1] = i + 1; });
  const errs = [...text.matchAll(/theorem\.dfy\((\d+),\d+\): Error/g)].map((m) => Number(m[1]));
  const finished = /finished with \d+ verified/.test(text); // no verdict line: a resolution error, nothing is proved
  const rests = restsOf(lines); // a caller's lemma rests on its callees' summaries: proved only when every lemma it rests on is proved
  const spanClean = (k) => finished && !!spans[k] && !errs.some((L) => spans[k][0] <= L && L <= spans[k][1]);
  // the doubles reading (check.mjs, design/doubles.md): a number-bearing unit's lemma is decided over IEEE-754 binary64,
  // the real lemma alone proves it no longer; `witness` in expect.json: the solver's counterexample, replayed in Node
  const unitByLemma = (() => { try { return new Map([...unitsOfFile(loadForUnits(pairFile(d, 'candidate'), { project: false }).sf).keys()].map((u) => [dafnyName(u), u])); } catch { return new Map(); } })();
  const doublesOf = new Map();
  const doubles = async (f) => { if (!doublesOf.has(f)) { const u = unitByLemma.get(f); doublesOf.set(f, u ? await solveUnit({ parent: pairFile(d, 'parent'), candidate: pairFile(d, 'candidate'), unit: u, project: false, keep: tmpd }) : { bearing: null }); } return doublesOf.get(f); };
  for (const [f, want] of Object.entries(exp.equal)) {
    const sp = spans[`Equal_${f}`];
    const viaRests = provedLemma(`Equal_${f}`, spanClean, rests);
    const through = viaRests || !spanClean(`Equal_${f}`) ? [] : restsClosure(rests, `Equal_${f}`).filter((k) => !provedLemma(k, spanClean, rests));
    const whole = finished && !!sp && viaRests;
    const parts = canonPartsOf(Object.keys(spans), f); // the canonical-heap certificate: every part must hold (check.mjs canonPartsOf: this unit's parts only)
    const canon = finished && parts.length > 0 && parts.every((k) => !errs.some((L) => spans[k][0] <= L && L <= spans[k][1]));
    const real = whole || canon;
    const withheld = lines.find((ln) => ln.startsWith(`// UNGUARDED Equal_${f}: `));
    const fp = await doubles(f);
    const faithful = faithfulPlacement(tmpd, f); // rule C: the real lemma was read faithfully; placed on both sides, it decides a unit the doubles reading leaves unknown
    const proved = fp.bearing ? finished && !!sp && (fp.verdict === 'proved' || (fp.verdict === 'unknown' && faithful.placed && real)) : real;
    const realText = real ? (whole ? 'proved' : 'proved (canonical heap)') : through.length ? `not proved through ${through.map((k) => k.slice(6)).join(', ')}` : 'not proved';
    const got = sp ? (fp.bearing ? `${fp.verdict === 'unknown' && faithful.placed && real ? `faithful ${faithful.congruence ? 'congruence' : 'exact'} proved; ` : fp.verdict === 'unknown' && !faithful.placed ? `unplaced (${(faithful.reasons ?? [])[0] ?? ''}); ` : ''}doubles ${fp.verdict}${fp.verdict === 'witness' ? ' at ' + JSON.stringify(fp.input).slice(0, 60) : fp.reason ? ': ' + fp.reason.slice(0, 80) : ''} (${fp.seconds ?? 0} s); real lemma ${realText}` : realText) : withheld ? `withheld: ${withheld.slice(withheld.indexOf(': ') + 2, withheld.indexOf(': ') + 120)}` : 'lemma missing';
    // "withheld": the identity guard must have withheld the lemma; "witness": the doubles reading's replayed counterexample;
    // "real-only": the real lemma proves, the doubles reading does not read the unit whole (unknown) and the faithful
    // reading does not place it, so lane A does not prove it (design/doubles.md): the row keeps the proof under test
    const ok = want === 'withheld' ? !!withheld : want === 'witness' ? !!sp && fp.verdict === 'witness' : want === 'real-only' ? real && fp.bearing && fp.verdict === 'unknown' && !faithful.placed && !withheld : proved === want && !(want && withheld);
    add('pair', name, `Equal_${f} ${want === 'withheld' ? 'withheld' : want === 'witness' ? 'witness (doubles)' : want === 'real-only' ? 'real only (doubles unknown)' : want ? 'proved' : 'not proved'}`, ok, got);
    if (exp.canon && f in exp.canon) add('pair', name, `EqualCanon_${f} ${exp.canon[f] ? 'proved' : 'not proved'}`, canon === exp.canon[f] && (!exp.canon[f] || !whole), `${parts.length} parts: ${parts.filter((k) => errs.some((L) => spans[k][0] <= L && L <= spans[k][1])).map((k) => k.slice(k.lastIndexOf('_') + 1)).join(', ') || 'all hold'}${whole ? '; whole heap also proved' : ''}`); // "canon": the canonical reading alone proves it (the whole-heap lemma fails)
  }
  // the proof-hunt step reads lane A's result on every lemma of the pair, listed in expect.json or not (below)
  for (const unit of Object.keys(exp.b ?? {})) if (finished && spans[`Equal_${dafnyName(unit)}`]) await doubles(dafnyName(unit)); // the proof-hunt step reads the doubles reading of every unit lane B ran
  huntA.set(name, { adapters: Object.keys(allAdapters), bearing: (f) => !!doublesOf.get(f)?.bearing, proved: (f) => { if (!finished || !spans[`Equal_${f}`]) return null; const fp = doublesOf.get(f); if (fp?.bearing && fp.verdict !== 'unknown') return fp.verdict === 'proved'; if (fp?.bearing && !faithfulPlacement(tmpd, f).placed) return false; const parts = canonPartsOf(Object.keys(spans), f); return provedLemma(`Equal_${f}`, spanClean, rests) || (parts.length > 0 && parts.every((k) => !errs.some((L) => spans[k][0] <= L && L <= spans[k][1]))); } });
  }
  // lane B on the same pair
  for (const [unit, want] of Object.entries(exp.b ?? {})) {
    const r = crun('node', [path.join(here, '../exec/run.mjs'), '--parent', pairFile(d, 'parent'), '--candidate', pairFile(d, 'candidate'), '--unit', unit, '--n', '30', '--no-project', '--out', path.join(tmpd, `b_${artifactName(unit)}.json`)], { files: [pairFile(d, 'parent'), pairFile(d, 'candidate')], outs: [path.join(tmpd, `b_${artifactName(unit)}.json`)] });
    let got = 'no result';
    try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${artifactName(unit)}.json`), 'utf8')).verdict; } catch { /* keep */ }
    add('pair', name, `lane B ${unit} ${want}`, got === want, got);
  }
  // lane B under the network-denied mode (LEAN_NET=deny, design/sandbox-boundary.md): the verdict, and the record's
  // sandbox entry naming the mode and every connection attempt it refused, each as `<api> <host>:<port>`
  for (const [unit, want] of Object.entries(exp.netDeny ?? {})) {
    const out = path.join(tmpd, `bnet_${artifactName(unit)}.json`);
    crun('node', [path.join(here, '../exec/run.mjs'), '--parent', pairFile(d, 'parent'), '--candidate', pairFile(d, 'candidate'), '--unit', unit, '--n', '30', '--no-project', '--out', out], { files: [pairFile(d, 'parent'), pairFile(d, 'candidate')], outs: [out], env: { LEAN_NET: 'deny' } });
    let got = null; try { got = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { /* keep */ }
    const sb = got?.record?.sandbox;
    const denied = [...new Set((sb?.denied ?? []).map((a) => `${a.api} ${a.target}`))].sort();
    const ok = got?.verdict === want.verdict && sb?.network === 'deny' && JSON.stringify(denied) === JSON.stringify([...want.denied].sort());
    add('pair', name, `lane B ${unit} under LEAN_NET=deny: ${want.verdict}, denied ${JSON.stringify(want.denied)}`, ok, `${got?.verdict ?? 'no result'}; sandbox ${sb ? `${sb.network}, denied ${JSON.stringify(denied)}` : 'not recorded'}`);
  }
  // the states lane B reached (bound.states, for the gate's rendering check): one per input that ran on both sides, each
  // with its index and its arguments as drawn; `states` in expect.json names the unit and the count of inputs it ran
  for (const [unit, want] of Object.entries(exp.states ?? {})) {
    let got = null; try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${artifactName(unit)}.json`), 'utf8')); } catch { /* keep */ }
    const st = got?.bound?.states;
    const ok = Array.isArray(st) && st.length === want && st.every((x, i) => x.input === i && Array.isArray(x.args));
    add('pair', name, `states ${unit} ${want}`, ok, Array.isArray(st) ? `${st.length} states, first ${JSON.stringify(st[0] ?? null).slice(0, 80)}` : `no states (${got?.verdict ?? 'no result'})`);
  }
  // the retained-state programs lane B ran for a class unit (programs.mjs): the verdict, the shrunk program's length, whether the divergence names this unit
  for (const [unit, want] of Object.entries(exp.programs ?? {})) {
    let got = null; try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${artifactName(unit)}.json`), 'utf8')); } catch { /* keep */ }
    const pr = got?.bound?.programs ?? null; const div = pr?.divergence ?? null;
    const ok = !!pr && (want.verdict !== 'WITNESS' ? got.verdict === want.verdict && !div : !!div) && (want.commands === undefined || div?.commands === want.commands) && (want.mine === undefined || div?.mine === want.mine);
    add('pair', name, `programs ${unit} ${want.verdict}${want.commands ? ' in ' + want.commands : ''}`, ok, pr ? `${pr.programs} programs, ${pr.commands} commands${div ? `; divergence at ${div.method} after ${div.commands} command(s)${div.mine ? '' : ' (another unit)'}` : ''}` : 'no programs summary');
  }
  // the environment programs lane B ran for a free function (program.mjs on fast-check): the verdict, the shrunk program's length, the replay
  for (const [unit, want] of Object.entries(exp.envPrograms ?? {})) {
    let got = null; try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${artifactName(unit)}.json`), 'utf8')); } catch { /* keep */ }
    const ep = got?.bound?.environmentPrograms ?? null; const w = got?.witnesses?.find((x) => x.input === 'environment program') ?? null;
    const ok = !!ep && got.verdict === want.verdict && (want.verdict !== 'WITNESS' || (!!w && w.replayed === true && (want.commands === undefined || w.program.length === want.commands)));
    add('pair', name, `environment programs ${unit} ${want.verdict}${want.commands ? ' in ' + want.commands : ''}`, ok, ep ? (w ? `${w.program.join(', ')}; seed ${w.seed}, path ${w.path}, replayed ${w.replayed}` : `${ep.runs} programs of up to ${ep.maxCommands} commands, no divergence`) : 'no environment-programs summary');
  }
  // deep render (moonshot 7): the unit run twice by lane B, with --deep (same-package children rendered one level down) and without (a tree of names)
  for (const [unit, want] of Object.entries(exp.deep ?? {})) {
    const got = {};
    for (const mode of ['deep', 'names']) { const out = path.join(tmpd, `deep_${mode}_${artifactName(unit)}.json`); run('node', [path.join(here, '../exec/run.mjs'), '--parent', pairFile(d, 'parent'), '--candidate', pairFile(d, 'candidate'), '--unit', unit, '--n', '20', '--no-project', ...(mode === 'deep' ? ['--deep'] : []), '--out', out]); try { got[mode] = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { got[mode] = null; } }
    const ok = !!got.deep && !!got.names && got.deep.verdict === want.deep && got.names.verdict === want.names && /one level down/.test(got.deep.bound?.frontEnd?.components ?? '');
    add('pair', name, `deep render ${unit} ${want.deep} / names ${want.names}`, ok, `deep ${got.deep?.verdict ?? 'no result'}, names ${got.names?.verdict ?? 'no result'}`);
  }
  // the schedule explorer (moonshot 9): the clock as a command, every order of the timers due at one instant; the verdict, the witness sequence, the timer bound
  for (const [unit, want] of Object.entries(exp.schedules ?? {})) {
    let got = null; try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${artifactName(unit)}.json`), 'utf8')); } catch { /* keep */ }
    const sc = got?.bound?.schedules ?? null; const w = got?.witnesses?.find((x) => x.schedule) ?? null;
    const ok = !!sc && got.verdict === want.verdict && (want.sequence === undefined || JSON.stringify(w?.sequence ?? null) === JSON.stringify(want.sequence)) && (want.timers === undefined || sc.timers === want.timers);
    add('pair', name, `schedules ${unit} ${want.verdict}${want.sequence ? ' by ' + want.sequence.join(', ') : ''}`, ok, sc ? `${sc.timers} timer(s), ${sc.paths ?? '?'} paths${w ? `; witness ${w.sequence.join(', ')} at step ${w.step}` : ''}` : 'no schedules summary');
  }
  // races (design/schedules.md): two callers on one receiver, every promise the world answers held by the scheduler, the
  // orders bounded by conflicts; a WITNESS carries both orders, the dependent pair and its replay; a clean run its order count
  for (const [unit, want] of Object.entries(exp.races ?? {})) {
    let got = null; try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${artifactName(unit)}.json`), 'utf8')); } catch { /* keep */ }
    const rc = got?.bound?.races ?? null; const w = got?.witnesses?.find((x) => x.race) ?? null; const runs = rc?.orders ? rc.orders.parent + rc.orders.candidate : null;
    const pairOk = (x) => !!x && (want.pair === undefined || (x.dependentPair?.moved === want.pair[0] && x.dependentPair?.before === want.pair[1])) && (want.cells === undefined || JSON.stringify(x.dependentPair?.cells) === JSON.stringify(want.cells));
    const ok = !!rc && got.verdict === want.verdict && rc.liveCalls === 2 && /complete only within the stated bound/.test(rc.bound ?? '') && (want.verdict === 'WITNESS' ? pairOk(w) && w.replayed === true && w.orders?.default?.order?.length > 0 && JSON.stringify(w.orders.default.order) !== JSON.stringify(w.orders.distinguishing?.order) && (want.side === undefined || w.side === want.side) && (want.lines === undefined || ['parent', 'candidate'].every((k) => w.where?.lines?.[k]?.file?.endsWith(`/${k}.ts`) && w.where.lines[k].start >= 1 && w.where.lines[k].text.includes(want.lines[k]))) : !w && rc.complete === true && (want.orders === undefined || runs === want.orders));
    add('pair', name, `races ${unit} ${want.verdict}${want.pair ? ' by ' + want.pair.join(' before ') : ''}${want.orders ? ' in ' + want.orders + ' orders' : ''}`, ok, rc ? (w ? `${w.side}: ${w.orders.distinguishing.order.join(', ')} against ${w.orders.default.order.join(', ')}; pair ${w.dependentPair.moved} before ${w.dependentPair.before} on ${w.dependentPair.cells.join(', ')}; replayed ${w.replayed}` : `${runs} orders over ${rc.programs} programs (b ${rc.preemptions}, ${rc.dependentPairs} dependent pairs, ${rc.drawn} drawn), complete ${rc.complete}${rc.ask ? '; ' + rc.ask : ''}`) : 'no races summary');
  }
  // the element-tree patch a front-end WITNESS carries (patch.mjs): the kinds of its ops, in order, and its summary line
  for (const [unit, want] of Object.entries(exp.patch ?? {})) {
    let got = null; try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${artifactName(unit)}.json`), 'utf8')); } catch { /* keep */ }
    const w = got?.witnesses?.[0] ?? null; const kinds = Array.isArray(w?.patch) ? w.patch.map((o) => o.kind) : null;
    const ok = got?.verdict === 'WITNESS' && !!kinds && JSON.stringify(kinds) === JSON.stringify(want.kinds) && (want.summary === undefined || w.patchSummary === want.summary);
    add('pair', name, `patch ${unit} ${want.kinds.join(', ') || 'empty'}`, ok, w ? `${w.patchSummary ?? 'no summary'}; ${kinds ? kinds.join(', ') || 'no ops' : 'no patch'}` : `no witness (${got?.verdict ?? 'no result'})`);
  }
  // the whole verdict of check.mjs for a unit (both lanes, the pair's scope file with its adapters): an adapted unit is
  // PASS-proved through its adapter, a changed signature without one is ASK:interface naming the door whatever lane B found
  for (const [unit, want] of Object.entries(exp.check ?? {})) {
    const out = path.join(tmpd, `check_${artifactName(unit)}.json`);
    crun('node', [path.join(here, '../check.mjs'), '--parent', pairFile(d, 'parent'), '--candidate', pairFile(d, 'candidate'), '--unit', unit, '--n', '30', '--no-project', '--dafny-seconds', '30', ...(typeof exp.adapters === 'string' ? ['--scope', path.join(d, exp.adapters)] : []), '--out', out], { files: [pairFile(d, 'parent'), pairFile(d, 'candidate'), ...(typeof exp.adapters === 'string' ? [path.join(d, exp.adapters)] : [])], outs: [out] });
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
    let got = null; try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${artifactName(unit)}.json`), 'utf8')); } catch { /* keep */ }
    const w = got?.witnesses?.[0] ?? null; const names = (w?.through ?? []).map((t) => t.callee);
    const ok = got?.verdict === 'WITNESS' && JSON.stringify(names) === JSON.stringify(want) && (want.length ? w.where?.cause === 'callee' && got.unitTextEqual === true : w.where?.cause !== 'callee');
    add('pair', name, `through ${unit} ${want.join(', ') || 'none'}`, ok, w ? `${names.join(', ') || 'no callee'}; cause ${w.where?.cause ?? w.where?.field ?? 'none'}; unit text ${got.unitTextEqual ? 'equal' : 'changed'}` : `no witness (${got?.verdict ?? 'no result'})`);
  }
  // the small heaps lane B enumerated for the unit (korat.mjs): at least `min` non-isomorphic graphs, reported in bound.heaps
  for (const [unit, want] of Object.entries(exp.heaps ?? {})) {
    let got = null; try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${artifactName(unit)}.json`), 'utf8')).bound?.heaps ?? null; } catch { /* keep */ }
    add('pair', name, `heaps ${unit} enumerated`, !!got && got.enumerated >= want.min, got ? `${got.enumerated} distinct of ${got.assignments} assignments (space ${got.space}, pool ${got.pool})` : 'no heaps summary');
  }
  // the handler interpreter (moonshot 6b): at every fire of the sequences and the finite lane, each readable descriptor applied to the slots agrees with the real invocation
  for (const [unit, want] of Object.entries(exp.handlers ?? {})) {
    let got = null; try { got = JSON.parse(fs.readFileSync(path.join(tmpd, `b_${artifactName(unit)}.json`), 'utf8')).bound?.frontEnd?.handlers ?? null; } catch { /* keep */ }
    const ok = !!got && typeof got === 'object' && Array.isArray(got.defects) && got.defects.length === 0 && got.agreed === got.interpretable && got.interpretable >= (want.interpretable ?? 0);
    add('pair', name, `handlers ${unit} agree`, ok, got && typeof got === 'object' ? `${got.agreed} of ${got.interpretable} interpretable agreed (${got.readable} readable, ${got.fired} fired); ${got.defects?.length ?? '?'} defects` : 'no handlers summary');
  }
  // the library table validated by the run: the built-in calls made from the unit's files, each checked against its row
  const libraryOf = (unit, env, out) => { run('node', [path.join(here, '../exec/run.mjs'), '--parent', pairFile(d, 'parent'), '--candidate', pairFile(d, 'candidate'), '--unit', unit, '--n', '30', '--no-project', '--out', out], env); try { return JSON.parse(fs.readFileSync(out, 'utf8')).bound?.library ?? null; } catch { return null; } };
  for (const [unit, want] of Object.entries(exp.library ?? {})) {
    const L = libraryOf(unit, undefined, path.join(tmpd, `lib_${artifactName(unit)}.json`));
    const ok = !!L && (want.ops ?? []).every((op) => (L.ops[op] ?? 0) > 0) && L.defects.length === (want.defects ?? 0);
    add('pair', name, `library ${unit} recorded`, ok, L ? `${L.records} records: ${Object.keys(L.ops).join(', ')}; ${L.defects.length} defects` : 'no library summary');
  }
  for (const [unit, want] of Object.entries(exp.libraryWrong ?? {})) { // a row the engine contradicts is a defect naming its operation
    const L = libraryOf(unit, { LEAN_LIBRARY_TABLE: path.join(here, want.table) }, path.join(tmpd, `libw_${artifactName(unit)}.json`));
    const hit = L ? L.defects.find((x) => x.op === want.op) : null;
    add('pair', name, `library ${unit} wrong table refuted`, !!hit, hit ? `${hit.op}: ${hit.why} (expected ${hit.expected})` : (L ? `${L.defects.length} defects, none on ${want.op}` : 'no library summary'));
  }
  for (const [unit, want] of Object.entries(exp.libraryCheck ?? {})) { // the proof lane refuses the operation while the row is wrong; lane B's own verdict stands
    const out = path.join(tmpd, `libc_${artifactName(unit)}.json`);
    run('node', [path.join(here, '../check.mjs'), '--parent', pairFile(d, 'parent'), '--candidate', pairFile(d, 'candidate'), '--unit', unit, '--n', '30', '--no-project', '--dafny-seconds', '30', '--out', out], { LEAN_LIBRARY_TABLE: path.join(here, want.table) });
    let got = {}; try { got = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { /* missing output fails */ }
    const ok = got.verdict === want.verdict && new RegExp(want.reason).test(got.reason ?? '') && got.certificate?.lanes?.A?.verdict === 'ASK:library-model';
    add('pair', name, `library ${unit} proof refused on a wrong row`, ok, `${got.verdict ?? 'no result'}: ${(got.reason ?? '').slice(0, 120)} | A: ${got.certificate?.lanes?.A?.verdict ?? '-'} | B: ${got.certificate?.lanes?.B?.verdict ?? '-'}`);
  }
}

// one pair in this process (`--pair`): its rows and its lane A reading go to the result file, nothing else runs
if (PAIR_ONLY) {
  await runPairStep(PAIR_ONLY);
  const A = huntA.get(PAIR_ONLY) ?? null;
  let exp = {}; try { exp = JSON.parse(fs.readFileSync(path.join(pairsDir, PAIR_ONLY, 'expect.json'), 'utf8')); } catch { /* a pair without expectations has no hunt */ }
  const provedBy = A ? Object.fromEntries(Object.keys(exp.b ?? {}).map((u) => [dafnyName(u), A.proved(dafnyName(u))])) : null;
  if (RESULT_FILE) { fs.writeFileSync(RESULT_FILE, JSON.stringify({ rows, hunt: A ? { adapters: A.adapters, provedBy, bearing: Object.fromEntries(Object.keys(provedBy).map((f) => [f, A.bearing(f)])) } : null, cache: stepCacheStats() })); process.exit(0); } // the hunt entry crosses the process boundary whole: adapters, each lemma's proof and whether the doubles reading bears on it
  // run by hand (no `--result`): the pair's own table, as the whole suite prints it, and the exit code of its rows
  const cols = ['kind', 'name', 'check']; const widths = Object.fromEntries(cols.map((c) => [c, Math.max(c.length, ...rows.map((r) => String(r[c]).length))]));
  console.log(`| ${cols.map((c) => c.padEnd(widths[c])).join(' | ')} | res  | lsc accepts | detail`);
  for (const r of rows) console.log(`| ${cols.map((c) => String(r[c]).padEnd(widths[c])).join(' | ')} | ${r.ok ? 'PASS' : 'FAIL'} | ${r.lsc.padEnd(11)} | ${r.detail}`);
  const failed = rows.filter((r) => !r.ok).length;
  console.log(`| TOTAL | ${rows.length} checks | ${failed === 0 ? 'ALL PASS' : `${failed} FAILED`} |`);
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(failed === 0 ? 0 : 1);
}

// ----- the run: every section starts at once; their children share the pool (tests/pool.mjs) -----
// The measured wall seconds of each job are kept beside the step cache (LEAN_SUITE_DURATIONS moves them): the next run
// starts the longest jobs first. A section waits only for what it reads: the steps that read the pairs' lane B results
// wait for the pair step, witness args (which runs lane B where a pair did not) for the steps that count those results.
// the weights: LEAN_SUITE_WEIGHTS, else suite-weights.json beside the durations file, else the measured table committed
// here (tests/suite-weights.json; tests/measure-weights.mjs writes it); LEAN_SUITE_TRACE: the pid and job key of each child
const durationsFile = process.env.LEAN_SUITE_DURATIONS || path.join(CACHE_DIR, 'suite-durations.json');
const weightsFile = process.env.LEAN_SUITE_WEIGHTS || [path.join(path.dirname(durationsFile), 'suite-weights.json'), path.join(here, 'suite-weights.json')].find((f) => fs.existsSync(f)) || null;
const pool = createPool(JOBS, { historyFile: durationsFile, outDir: tmp, weightsFile, traceFile: process.env.LEAN_SUITE_TRACE || null });
// a runner given --jobs takes that many slots: half the pool, so two of them run beside each other and the rest
const WIDE = Math.max(1, Math.floor(JOBS / 2));
const withEnv = (env) => (env ? { ...process.env, ...env } : process.env);
// one job's runners: run, crun and dafny as above, each child on the pool; an item of a fan-out names its group
const runner = (key, group = null) => {
  const job = pool.job(key, { group });
  const prun = (cmd, args, env, { cwd = root, maxBuffer = 1 << 26 } = {}) => job.run(cmd, args, { cwd, env: withEnv(env), maxBuffer });
  return {
    job,
    run: prun,
    crun: (cmd, args, { files = [], outs = [], env = null } = {}) => cachedRunAsync(prun, cmd, args, { root, files, outs, env, normalise: NORMALISE }),
    dafny: async (file) => dafnyResult(await prun('dafny', ['verify', '--verification-time-limit', '60', ...dafnySolverArgs(), file])),
    // "lsc accepts": does LemmaScript's `lsc gen --backend=dafny` take the file (exit 0)? Reach comparison only.
    lsc: async (file) => {
      if (!fs.existsSync(LSC)) return 'no binary';
      const d = fs.mkdtempSync(path.join(tmp, 'lsc-'));
      const f = path.join(d, 'x.ts');
      fs.copyFileSync(file, f);
      const r = await job.run(LSC, ['gen', '--backend=dafny', f], { cwd: d, env: process.env, maxBuffer: 1024 * 1024 });
      return r.status === 0 ? 'yes' : 'no';
    },
  };
};
// the items of a section at once: each item its own rows, appended in item order
const each = async (add, items, fn) => {
  const lists = items.map(() => []);
  await Promise.all(items.map((item, i) => fn(item, (...a) => lists[i].push(a))));
  for (const list of lists) for (const a of list) add(...a);
};
const later = () => { let open; const p = new Promise((r) => { open = r; }); p.open = open; return p; };
const pairsDone = later(), countedDone = later(), witnessArgsDone = later();
const { conformanceSelection } = await import('../conformance/select.mjs');
const childCache = { hits: 0, misses: 0 };

// ----- shared fixtures -----
async function sharedFixtures(add) {
  await each(add, fs.readdirSync(sharedDir).sort(), async (name, add) => {
    const ts = path.join(sharedDir, name, 'ts.ts');
    if (!fs.existsSync(ts)) return;
    const th = theorems[name];
    if (!th) { add('shared', name, 'theorem', false, 'no entry in tests/theorems.json'); return; }
    const R = runner(`shared/${name}`, 'shared');
    const l = await R.run('node', [lint, ts]);
    add('shared', name, 'lint', l.status === 0, l.status === 0 ? 'inside the subset' : l.stdout.trim().split('\n')[0], await R.lsc(ts));
    const out = path.join(tmp, `${name}.dfy`);
    const args = [translate, ts, '--fn', th.fn, '--out', out];
    for (const e of th.ensures ?? []) args.push('--ensures', e);
    for (const r of th.requires ?? []) args.push('--requires', r);
    for (const i of th.invariants ?? []) args.push('--invariant', i);
    const t = await R.run('node', args);
    add('shared', name, 'translate', t.status === 0, t.status === 0 ? `${th.fn} -> Dafny` : (t.stderr || t.stdout).trim().split('\n')[0]);
    if (t.status !== 0) return;
    const dv = await R.dafny(out);
    add('shared', name, 'verify translation', dv.ok, dv.summary);
    const core = path.join(sharedDir, name, 'core.dfy');
    if (!fs.existsSync(core)) { add('shared', name, 'reference core.dfy', false, 'missing'); return; }
    const rv = await R.dafny(core);
    add('shared', name, 'verify core.dfy', rv.ok, rv.summary);
    const s1 = signature(fs.readFileSync(out, 'utf8')), s2 = signature(fs.readFileSync(core, 'utf8'));
    add('shared', name, 'same signature', !!s1 && s1 === s2, s1 === s2 ? s1 : `${s1} vs ${s2}`);
  });
}

// ----- constructs: one small function per construct, translated both ways -----
async function constructs(add) {
  await each(add, cases, async (c, add) => {
    const file = path.join(casesDir, c.file);
    const R = runner(`constructs/${c.name}`, 'constructs');
    const l = await R.run('node', [path.join(here, 'construct-lint.mjs'), file, c.fn]); // lintFile on the case, its unit's findings (construct-lint.mjs)
    let found; try { found = JSON.parse(l.stdout); } catch { throw new Error(`construct lint ${c.name}: exit ${l.status}: ${(l.stderr || l.stdout).trim().slice(-400)}`); }
    add('construct', c.name, 'lint', found.count === 0, found.count ? `${found.first.rule}: ${found.first.msg}` : 'inside the subset', await R.lsc(file));
    const out = path.join(tmp, `case_${c.name}.dfy`);
    if (!c.coreOnly) { // the proof-shape mode (methods for loops) cannot call a unit that assigns from an expression; the gate runs --core
      const t = await R.run('node', [translate, file, '--fn', c.fn, '--out', out, ...tflags(c, true)]);
      if (t.status !== 0) { add('construct', c.name, 'translate', false, (t.stderr || t.stdout).trim().split('\n')[0]); return; }
      const dv = await R.dafny(out);
      add('construct', c.name, 'verify (proof shape)', dv.ok, dv.summary);
    }
    if (c.core) {
      const oc = path.join(tmp, `case_${c.name}_core.dfy`);
      const tc = await R.run('node', [translate, file, '--core', '--exact-numbers', '--fn', c.fn, '--out', oc, ...tflags(c, false)]); // a spec proof of one program: the exact reading (design/doubles.md)
      if (tc.status !== 0) { add('construct', c.name, 'translate --core', false, (tc.stderr || tc.stdout).trim().split('\n')[0]); return; }
      const dc = await R.dafny(oc);
      add('construct', c.name, 'verify (--core)', dc.ok, dc.summary);
    }
  });
}

// ----- numbers per file: a float literal makes the file real; --real forces it -----
async function numbersPerFile(add) {
  const f = path.join(casesDir, 'float_literal.ts');
  await each(add, ['literal', 'real'], async (step, add) => {
    const R = runner(`numbers/${step}`, 'numbers');
    if (step === 'literal') {
      const t = await R.run('node', [translate, f, '--fn', 'drift', '--out', path.join(tmp, 'drift.dfy')]);
      const driftDfy = t.status === 0 && fs.existsSync(path.join(tmp, 'drift.dfy')) ? fs.readFileSync(path.join(tmp, 'drift.dfy'), 'utf8') : '';
      add('construct', 'float_literal', 'a float literal makes the file real', t.status === 0 && /:\s*real\b/.test(driftDfy), t.status === 0 ? (/:\s*real\b/.test(driftDfy) ? 'real' : 'int') : 'refused');
    } else {
      const r = await R.run('node', [translate, f, '--fn', 'drift', '--out', path.join(tmp, 'drift_real.dfy'), '--real']);
      add('construct', 'float_literal', '--real accepts 0.1', r.status === 0, r.status === 0 ? 'translated' : r.stderr.trim());
    }
  });
}

// ----- differential run: the translation and the TypeScript give the same answers on sample inputs -----
async function differential(R, add, label, tsFile, entries) {
  const src = fs.readFileSync(tsFile, 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} };
  new Function('exports', 'module', js)(mod.exports, mod);
  const dfy = path.join(tmp, `diff_${label}.dfy`);
  const t = await R.run('node', [translate, tsFile, '--core', '--exact-numbers', '--only', formatUnitList(entries.map(e => e.fn)), '--out', dfy]); // executed by Dafny: the exact reading
  if (t.status !== 0) { add('differential', label, 'translate --core', false, (t.stderr || t.stdout).trim().split('\n')[0]); return; }
  const lines = [], want = [];
  for (const { fn, samples } of entries) for (const args of samples) {
    lines.push(`  print ${dn(snake(fn))}(${args.map(dfyLit).join(', ')}), "\\n";`); // the unit's Dafny name as the translator writes it (common.mjs dn)
    want.push(show(mod.exports[fn](...args)));
  }
  fs.appendFileSync(dfy, `\nmethod Main() {\n${lines.join('\n')}\n}\n`);
  const r = await R.run('dafny', ['run', '--no-verify', '--target:py', dfy]);
  const got = (r.stdout ?? '').trim().split('\n').slice(-want.length);
  const same = r.status === 0 && got.length === want.length && got.every((g, i) => g.trim() === want[i]);
  add('differential', label, `${want.length} inputs, TS vs Dafny`, same, same ? 'same answers' : `want ${want.join('|')} got ${got.join('|')} ${r.status === 0 ? '' : (r.stderr || '').trim().split('\n')[0]}`);
}
async function differentialRun(add) {
  const items = [
    ...['sum_positive', 'filter_then_sum'].map((f) => ({ key: f, go: (R, add) => differential(R, add, f, path.join(sharedDir, f, 'ts.ts'), [{ fn: theorems[f].fn, samples: theorems[f].samples }]) })),
    ...cases.filter((x) => x.samples).map((c) => ({ key: c.name, go: (R, add) => differential(R, add, c.name, path.join(casesDir, c.file), [{ fn: c.fn, samples: c.samples }]) })),
    // concrete string helpers, including whitespace, empty separators and replacement tokens
    { key: 'string_helpers', go: async (R, add) => {
      const r = await R.run('node', [path.join(here, 'strings/run.mjs'), path.join(tmp, 'string_helpers.dfy')]);
      const text = (r.stdout ?? '') + (r.stderr ?? '');
      add('construct', 'string_helpers', 'concrete Dafny assertions', r.status === 0, text.trim().split('\n').pop());
    } },
    // concrete numeric helpers, including sign bits, shift masking and real truncation
    { key: 'number_helpers', go: async (R, add) => {
      const r = await R.run('node', [path.join(here, 'numbers_bits/run.mjs'), path.join(tmp, 'number_helpers.dfy')]);
      const text = (r.stdout ?? '') + (r.stderr ?? '');
      add('construct', 'number_helpers', 'concrete Dafny execution', r.status === 0, text.trim().split('\n').pop());
    } },
  ];
  await each(add, items, (it, add) => it.go(runner(`differential/${it.key}`, 'differential'), add));
}

// ----- negative controls: a false theorem must NOT verify, in both shapes -----
async function negativeControls(add) {
  const ts = path.join(root, 'fixtures/shared/sum_positive/ts.ts');
  const items = [
    async (R, add) => {
      const out = path.join(tmp, 'neg_sum.dfy');
      await R.run('node', [translate, ts, '--fn', 'sumPositive', '--out', out, '--ensures', 'result > 0', '--invariant', 'total >= 0']);
      const d1 = await R.dafny(out);
      add('control', 'false theorem', 'proof shape refuted', !d1.ok, d1.ok ? 'VERIFIED A FALSE THEOREM' : d1.summary);
    },
    async (R, add) => {
      const outc = path.join(tmp, 'neg_sum_core.dfy');
      await R.run('node', [translate, ts, '--core', '--exact-numbers', '--fn', 'sumPositive', '--out', outc, '--ensures', 'result > 0']);
      const d2 = await R.dafny(outc);
      add('control', 'false theorem', '--core refuted', !d2.ok, d2.ok ? 'VERIFIED A FALSE THEOREM' : d2.summary);
    },
    // an invariant that the proof needs: without it the loop proof must fail
    async (R, add) => {
      const cd = fs.readFileSync(path.join(casesDir, 'count_down.ts'), 'utf8').split('\n').filter((l) => !l.includes('@invariant')).join('\n');
      const cdFile = path.join(tmp, 'count_down_nohint.ts');
      fs.writeFileSync(cdFile, cd);
      const outn = path.join(tmp, 'neg_nohint.dfy');
      await R.run('node', [translate, cdFile, '--fn', 'countDown', '--out', outn, '--requires', 'n >= 0', '--ensures', 'result == n']);
      const d3 = await R.dafny(outn);
      add('control', 'missing invariant', 'proof shape refuted', !d3.ok, d3.ok ? 'VERIFIED WITHOUT AN INVARIANT' : d3.summary);
    },
  ];
  await each(add, items, (go, add) => go(runner(`negative/${items.indexOf(go)}`, 'negative'), add));
}

// ----- --changed: only the changed functions are checked -----
async function changedOnly(add) {
  const f = path.join(casesDir, 'mixed.ts');
  const items = [
    async (R, add) => { const unchanged = await R.run('node', [lint, f, '--changed', path.join(casesDir, 'mixed_good.json')]); add('changed', 'mixed.ts', 'bad function untouched: accepted', unchanged.status === 0, unchanged.status === 0 ? 'exit 0' : unchanged.stdout.trim().split('\n')[0]); },
    async (R, add) => { const touched = await R.run('node', [lint, f, '--changed', path.join(casesDir, 'mixed_bad.json')]); add('changed', 'mixed.ts', 'bad function changed: refused', touched.status === 1 && /\sdynamic-eval\s/.test(touched.stdout), touched.status === 1 ? 'exit 1, dynamic-eval' : 'ACCEPTED'); },
    async (R, add) => { const all = await R.run('node', [lint, f]); add('changed', 'mixed.ts', 'no ranges: refused', all.status === 1, all.status === 1 ? 'exit 1' : 'ACCEPTED'); },
  ];
  await each(add, items, (go, add) => go(runner(`changed/${items.indexOf(go)}`, 'changed'), add));
}

// ----- pairs: one child per pair on the pool, the rows replayed in pair order -----
const spawnPair = (args, onSpawn) => new Promise((resolve) => { const c = spawn(process.execPath, args, { cwd: root, stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, LEAN_PAIRS: '' } }); if (c.pid !== undefined) onSpawn(c.pid); c.on('close', (code, signal) => resolve({ code, signal })); c.on('error', () => resolve({ code: null, signal: 'spawn-error' })); });
async function pairs(add) {
  try {
    if (JOBS > 1 && pairNames.length > 1) {
      await Promise.all(pairNames.map((name) => { const result = path.join(tmp, `pair_${name}.result.json`); fs.rmSync(result, { force: true }); const job = pool.job(`pairs/${name}`, { group: 'pairs' }); return job.slots(job.weight, () => spawnPair([fileURLToPath(import.meta.url), '--pair', name, '--result', result, '--tmp', tmp], job.onSpawn)); }));
      for (const name of pairNames) {
        let res = null; try { res = JSON.parse(fs.readFileSync(path.join(tmp, `pair_${name}.result.json`), 'utf8')); } catch { /* no result: the worker died */ }
        if (!res) { add('pair', name, 'pair worker', false, 'the pair worker wrote no result (it died or was killed)'); continue; }
        for (const r of res.rows) add(r.kind, r.name, r.check, r.ok, r.detail, r.lsc);
        if (res.hunt) huntA.set(name, { adapters: res.hunt.adapters, bearing: (f) => !!res.hunt.bearing?.[f], proved: (f) => (f in res.hunt.provedBy ? res.hunt.provedBy[f] : null) });
        childCache.hits += res.cache?.hits ?? 0; childCache.misses += res.cache?.misses ?? 0;
      }
    } else await pool.job('pairs/in-process').slots(1, async () => { for (const name of pairNames) await runPairStep(name, add); }); // its children run synchronously in this process: it holds one slot throughout
  } finally { pairsDone.open(); }
}

// ----- proof hunt: lane A beside lane B on every unit the pair step ran (langs/ts/design/proof-hunt.md) -----
async function proofHunt(add) {
  await pairsDone;
// check.mjs answers lane B first, so a lane A proof of two different behaviours is hidden whenever lane B witnesses.
// Here both are read: a unit lane B witnessed whose lemma lane A proved is a hidden false proof and fails, unless the
// pair declares an adapter for that unit (the scope file's adapters or a // lean-adapter comment: the adapted claim
// f_candidate(A(x)) == f_parent(x) is not the raw same-input comparison lane B ran), or lane B witnessed on special
// numbers only. The step prints its own TOTAL line.
{
  let both = 0, hidden = 0, exempt = 0;
  for (const [name, A] of huntA) if (typeof A.bearing !== 'function' || typeof A.proved !== 'function' || !Array.isArray(A.adapters)) add('proof-hunt', name, 'hunt entry shape', false, 'the pair step handed the hunt an entry without adapters, bearing or proved: the two paths that build it (in-process and the pair worker) must agree'); // a shape defect is a failing row, never an uncaught exception that ends the suite with no table
  for (const [name, A] of huntA) {
    if (typeof A.bearing !== 'function' || typeof A.proved !== 'function') continue;
    const d = path.join(pairsDir, name), exp = JSON.parse(fs.readFileSync(path.join(d, 'expect.json'), 'utf8'));
    for (const unit of Object.keys(exp.b ?? {})) {
      let B = null; try { B = JSON.parse(fs.readFileSync(path.join(tmp, `pair_${name}`, `b_${artifactName(unit)}.json`), 'utf8')); } catch { /* no lane B result: not counted */ }
      const f = dafnyName(unit), a = A.proved(f), b = B?.verdict;
      if (!b || a === null) continue;
      both++;
      if (!(a && b === 'WITNESS')) continue;
      // two doors only: a declared adapter, and, on a unit the doubles reading does not decide (no number operation:
      // its lemma is the real one), a witness whose every input holds NaN or an infinity (design/special-numbers.md). A
      // number-bearing unit is decided over binary64, which holds -0, NaN and the infinities, so it has no door; the -0
      // door (row 0d8976c3) is closed by the doubles reading (design/doubles.md); any other witness is hidden
      const door = A.adapters.includes(f) ? 'the pair declares an adapter door for this unit' : !A.bearing(f) && (B.witnesses ?? []).length && B.witnesses.every((w) => /"\$(nan|infinity)"/.test(JSON.stringify(w.args ?? w.input ?? null))) ? 'every witness input holds NaN or an infinity, and the unit has no number operation (its lemma is the real reading)' : null;
      if (door) exempt++; else hidden++;
      add('proof-hunt', name, `${unit}: lane A proved, lane B WITNESS`, !!door, door ? `exempt: ${door}` : `HIDDEN FALSE PROOF: lane A proved a unit lane B witnessed at ${JSON.stringify(B.witnesses?.[0]?.args ?? null).slice(0, 120)}`);
    }
  }
  add('proof-hunt', 'all pairs', `${both} units read by both lanes`, hidden === 0, `${hidden} hidden false proofs, ${exempt} exempt by a door (adapter, NaN or infinity on a unit with no number operation)`);
  console.log(`| PROOF-HUNT TOTAL | ${both} units read by both lanes | ${hidden === 0 ? 'NO HIDDEN FALSE PROOF' : `${hidden} HIDDEN FALSE PROOFS`} | ${exempt} exempt by a door (adapter, NaN or infinity on a unit with no number operation) |`);
}
}

// ----- model conformance (design/model-conformance.md): its running rule (conformance/select.mjs), tested first, then the
// step on the pairs the rule selects: LEAN_PAIRS as given, every pair under LEAN_CONFORMANCE=full (the admission suite),
// else the pairs changed since the baseline commit; the selection is printed and stands in the row's detail. The rule's
// test and the step run at once (the step reads the rule, never its test); the step's own workers take WIDE slots -----
async function modelConformance(add) {
  const selectTest = runner('conformance/select').run('node', [path.join(here, '../conformance/select.test.mjs')]);
  let sel; try { sel = conformanceSelection({ root, pairsDir: path.join(here, 'pairs'), knownFile: path.join(here, '../conformance/known-findings.json') }); } catch (e) { sel = { error: e.message }; }
  console.log(`conformance: ${sel.error ?? sel.why}`);
  const modelJob = sel.error || (sel.pairs && !sel.pairs.length) ? null : pool.job(`conformance/model ${sel.pairs ? sel.pairs.join(',') : 'every pair'}`);
  const step = !modelJob ? null : modelJob.slots(WIDE, (n) => spawnCollect('node', [path.join(here, '../conformance/run.mjs'), '--jobs', String(n), '--work', path.join(tmp, 'conformance'), '--json', path.join(tmp, 'model-conformance.json')], { cwd: root, env: withEnv({ LEAN_PAIRS: sel.pairs ? sel.pairs.join(',') : '' }), maxBuffer: 1 << 26, dir: tmp, onSpawn: modelJob.onSpawn }));
  const t = await selectTest;
  add('conformance', 'select', 'the running rule: a changed pair runs, an unchanged one is skipped (conformance/select.test.mjs)', t.status === 0, (t.stdout ?? '').trim().split('\n').pop() || (t.stderr ?? '').trim().slice(-200));
  if (sel.error) add('conformance', 'model', "each unit's two Dafny models against Node on lane B's inputs (conformance/run.mjs)", false, sel.error);
  else if (sel.pairs && !sel.pairs.length) add('conformance', 'model', "each unit's two Dafny models against Node on lane B's inputs (conformance/run.mjs)", true, `not run: ${sel.why}`);
  else {
    const r = await step;
    // the TOTAL line is the step's last line; when it is missing the step died before it, and its stderr says why
    const last = (r.stdout ?? '').trim().split('\n').pop() ?? '';
    const detail = last.startsWith('| MODEL-CONFORMANCE TOTAL') ? last : `exit ${r.status}${r.signal ? ` (${r.signal})` : ''}, no TOTAL line: ${(r.stderr ?? '').trim().split('\n').slice(-3).join(' ').slice(-300)}`;
    add('conformance', 'model', `each unit's two Dafny models against Node on lane B's inputs (conformance/run.mjs) on ${sel.mode === 'changed' ? `the ${sel.pairs.length} changed pair(s)` : sel.mode === 'named' ? 'the LEAN_PAIRS set' : 'every pair'}`, r.status === 0, detail);
  }
}

// ----- text-only witnesses: a WITNESS rests on an observable the specification defines (design/callbacks.md) -----
async function textOnlyWitnesses(add) {
  await pairsDone;
// A lane B WITNESS must carry a difference in the outcome, the trace, the tree, the heap or a drive; a function's source
// text is none of these. Every WITNESS the pair step wrote is read: with the `src` of every `$fn` rendering removed, the
// parent's and the candidate's observations must still differ. A planted witness that differs only there must be caught.
{
  const textOnly = (w) => restsOnFunctionText(w.parent ?? null, w.candidate ?? null);
  const planted = { parent: { outcome: { returned: { $undefined: true } }, trace: [{ op: 'call', path: 'module:lib.on', args: [{ $fn: 'anonymous', src: 'aaaaaaaaaaaa' }] }] }, candidate: { outcome: { returned: { $undefined: true } }, trace: [{ op: 'call', path: 'module:lib.on', args: [{ $fn: 'anonymous', src: 'bbbbbbbbbbbb' }] }] } };
  const real = { parent: { trace: [{ op: 'call', path: 'module:lib.on', args: [1, { $fn: 'anonymous', src: 'aaaaaaaaaaaa' }] }] }, candidate: { trace: [{ op: 'call', path: 'module:lib.on', args: [2, { $fn: 'anonymous', src: 'bbbbbbbbbbbb' }] }] } };
  add('text-only witness', 'planted', 'a witness resting on $fn.src alone is caught', textOnly(planted) === true, textOnly(planted) ? 'caught' : 'MISSED: the detector accepted a text-only witness');
  add('text-only witness', 'planted', 'a witness with another difference beside the text is kept', textOnly(real) === false, textOnly(real) ? 'WRONG: a real difference read as text-only' : 'kept');
  let read = 0, bad = 0;
  for (const name of fs.existsSync(pairsDir) ? fs.readdirSync(pairsDir).sort().filter((n) => !onlyPairs || onlyPairs.has(n)) : []) {
    let exp = null; try { exp = JSON.parse(fs.readFileSync(path.join(pairsDir, name, 'expect.json'), 'utf8')); } catch { continue; }
    for (const unit of Object.keys(exp.b ?? {})) {
      let B = null; try { B = JSON.parse(fs.readFileSync(path.join(tmp, `pair_${name}`, `b_${unit}.json`), 'utf8')); } catch { continue; }
      if (B.verdict !== 'WITNESS') continue;
      for (const w of B.witnesses ?? []) { read++; if (textOnly(w)) { bad++; add('text-only witness', name, `${unit}: a witness rests on function text alone`, false, `input ${JSON.stringify(w.input)}`); } }
    }
  }
  add('text-only witness', 'all pairs', `${read} witnesses read`, bad === 0, `${bad} rest on function text alone`);
  console.log(`| TEXT-ONLY WITNESS TOTAL | ${read} witnesses read | ${bad === 0 ? 'NONE RESTS ON FUNCTION TEXT' : `${bad} REST ON FUNCTION TEXT`} |`);
}
}

// ----- escapes -----
async function escapes(add) {
  const escDir = path.join(root, 'fixtures/escapes/ts');
  await each(add, fs.readdirSync(escDir).filter((x) => x.endsWith('.ts')).sort(), async (f, add) => {
    const file = path.join(escDir, f);
    const src = fs.readFileSync(file, 'utf8');
    const want = (src.match(/^\/\/ expect:\s*(\S+)/m) ?? [])[1];
    const name = f.replace(/\.ts$/, '');
    if (!want) { add('escape', name, 'expect line', false, 'missing `// expect: <rule>`'); return; }
    const R = runner(`escapes/${name}`, 'escapes');
    const candidateUnit = (src.match(/^\/\/ candidate-unit:\s*(\S+)/m) ?? [])[1];
    const l = await R.run('node', [lint, ...(candidateUnit ? ['--candidate', file, '--unit', candidateUnit, '--n', '1', '--no-project'] : [file])]);
    const hit = l.stdout.split('\n').some((line) => new RegExp(`\\s${want}\\s`).test(line));
    add('escape', name, 'lint refuses', l.status === 1 && hit, l.status === 1 ? (hit ? `refused: ${want}` : `refused, but not for ${want}`) : 'ACCEPTED', await R.lsc(file));
    const fn = (src.match(/^export (?:async )?function (\w+)/m) ?? [])[1];
    if (fn && !candidateUnit) {
      const t = await R.run('node', [translate, file, '--fn', fn, '--out', path.join(tmp, `esc_${name}.dfy`)]);
      add('escape', name, 'translate refuses', t.status === 1, t.status === 1 ? 'refused' : 'TRANSLATED');
    }
  });
}

// ----- advice labels: the label of the rewrite the lint advises, as --json reports it (first line `// expect: <rule> <label>`) -----
// then the runtime scripts, each a job of its own, their rows in this order
const scriptRow = (kind, name, check, args, detail, { env, echoStderr = false } = {}) => async (R, add) => {
  const r = await R.run('node', args, env);
  if (echoStderr && r.stderr) process.stderr.write(r.stderr);
  add(kind, name, check, r.status === 0, detail(r));
};
const lastLine = (r) => (r.stdout + r.stderr).trim().split('\n').pop();
async function adviceLabels(add) {
  const advDir = path.join(here, 'fixtures/advice');
  const advice = (fs.existsSync(advDir) ? fs.readdirSync(advDir).filter((x) => x.endsWith('.ts')).sort() : []).map((f) => ({ key: `advice/${f}`, group: 'advice', go: async (R, add) => {
    const src = fs.readFileSync(path.join(advDir, f), 'utf8');
    const [, rule, label] = src.match(/^\/\/ expect:\s*(\S+)\s+(proved|conditional|migration|flag-only)(?![\w-])/m) ?? [];
    const name = f.replace(/\.ts$/, '');
    if (!rule) { add('advice', name, 'expect line', false, 'missing `// expect: <rule> <label>`'); return; }
    // an any_* fixture runs with --any-type; `// expect-none: <rule>` names a rule that must not fire (an any from an
    // unresolved import is unresolved-module only)
    const none = (src.match(/^\/\/ expect-none:\s*(\S+)/m) ?? [])[1];
    const l = await R.run('node', [lint, path.join(advDir, f), '--json', '--advice', ...(f.startsWith('any_') ? ['--any-type'] : [])]);
    let all = [], found = []; try { all = JSON.parse(l.stdout); found = all.filter((x) => x.rule === rule); } catch { /* not JSON: fails below */ }
    const tag = label === 'conditional' ? '[conditional: ' : `[${label}]`;
    const ok = l.status === 1 && found.length > 0 && found.every((x) => x.label === label && (x.advice ?? '').startsWith(tag) && (label !== 'conditional' || !!x.precondition)) && (!none || !all.some((x) => x.rule === none));
    add('advice', name, `${rule} ${label}${none ? `, no ${none}` : ''}`, ok, found.length ? found.map((x) => `${x.label}${x.labelDecided ? ' (decided at the site)' : ''}`).join(', ') + (none && all.some((x) => x.rule === none) ? `; ${none} fired` : '') : `no ${rule} finding (exit ${l.status})`);
  } }));
  const runtime = [
    // seeded clock values retain their native shapes and ordered observations
    ['clock-read', scriptRow('runtime', 'clock-read', 'seeded recording fakes', [path.join(here, 'clock-read.mjs')], (r) => (r.stdout + r.stderr).trim())],
    ['rest_param-paths', async (R, add) => { const r = await R.run('node', ['--test', path.join(here, 'pairs/rest_param/paths.test.mjs')]); const t = r.stdout + r.stderr; const pass = t.match(/ℹ pass (\d+)/), fail = t.match(/ℹ fail (\d+)/); add('runtime', 'rest_param/paths.test.mjs', 'drawn rest slot spread at every call boundary', r.status === 0, pass ? `${pass[1]} pass, ${fail ? fail[1] : '?'} fail` : t.trim().slice(-160)); }],
    // a run never ends without a verdict: a drained loop and a budget stop are ASK, exit 2; a wide record, a deep nesting and an `@/` alias get verdicts
    // an element's children read one way (kidsOf) by every reader: a single object or a string child is diffed, printed and
    // handler-compared, and the op printer is total (a witness is never lost to its rendering)
    ['patch-children', scriptRow('runtime', 'patch-children', 'single-object and string children diffed and printed; the printer is total', [path.join(here, 'patch-children.mjs')], lastLine)],
    // every children shape (array, element, text, number, a depth-cut {$deep}, null, undefined) read as kidsOf reads it by every
    // exported reader, and every element-tree `.children` in lean's source read through kidsOf or a named exception
    ['children-shapes', scriptRow('runtime', 'children-shapes', 'seven children shapes read one way; no raw children reader outside the named exceptions', [path.join(here, 'children-shapes.mjs')], lastLine)],
    // lane B's input generator keeps its stated invariants (a special number's value depends on the input's turn and its field, arrays
    // of two or more, null beside the special value), so a witness found once is found again (lane lost-witnesses)
    ['gen-invariants', scriptRow('runtime', 'gen-invariants', 'the input generator keeps its stated invariants over seeds 1 to 20', [path.join(here, '../exec/gen.test.mjs')], lastLine)],
    ['no-silent-exit', scriptRow('runtime', 'no-silent-exit', 'ASK on a drained loop or a budget stop; verdicts on wide, nested and aliased inputs', [path.join(here, 'no-silent-exit.mjs')], lastLine)],
    // an importer's error outside a unit run exits 1; pr.mjs without git history names lean unknown
    ['no-silent-exit-importers', scriptRow('runtime', 'no-silent-exit-importers', 'exit 1 outside a unit run; late error recorded inside; pr.mjs lean unknown', [path.join(here, 'no-silent-exit-importers.mjs')], lastLine)],
    ['lowering-cache', scriptRow('runtime', 'lowering-cache', 'shared file analyses and content/source-keyed lowering', [path.join(here, 'lowering-cache.mjs')], (r) => (r.stdout + r.stderr).trim())],
    // the admission contract: a reading withdrawn by name is refused alike by the lint, the translator and the record, and proves nothing (design/admission-contract.md)
    ['withdrawal', scriptRow('runtime', 'withdrawal', 'a withdrawn reading refused identically; no proof; every decision site catalogued', [path.join(here, 'withdrawal.mjs')], lastLine)],
    ['translator-crashes', scriptRow('runtime', 'translator-crashes', 'node shapes read without translator crashes', [path.join(here, 'translator-crashes.mjs')], (r) => `exit ${r.status}: ${r.stdout.trim()}`, { echoStderr: true })],
    // a module literal's member is named by the path code reaches it by; a same-named class keeps its own units (design/exported-units.md)
    ['unit-listing', scriptRow('runtime', 'unit-listing', 'a class and an exports-property literal sharing a name list two units, each refusal attributed to its own', [path.join(here, 'unit-listing.mjs')], lastLine)],
    // lane B's child reads the node_modules folders module resolution visits, a link out of the tree included (exec/run.mjs workerReads; design/microtask-worker.md)
    ['linked-dependencies', scriptRow('runtime', 'linked-dependencies', 'a declaration behind a node_modules link out of the tree reaches the lane B child', [path.join(here, 'linked-dependencies.mjs')], lastLine)],
    // a finite exploration where every handler fire threw one same error on both sides is ASK naming it, never PASS-decided (exec/finite.mjs; design/microtask-worker.md)
    ['same-error', scriptRow('runtime', 'same-error', 'a component whose every handler threw the same sandbox error is ASK, not PASS-decided', [path.join(here, 'same-error.mjs')], lastLine)],
    // the converter: a dry run writes no source file even when killed mid-round; census.mjs answers --help; a forEach rewrite is refused when the list's type rests on an assertion (converter lane, 2026-10-30)
    ['convert-dry-run-kill', scriptRow('runtime', 'convert-dry-run-kill', 'a converter dry run killed mid-round leaves the tree byte-identical', [path.join(here, 'convert_dry_run_kill.mjs')], lastLine)],
    ['census-usage', scriptRow('runtime', 'census-usage', 'census.mjs prints usage on --help (exit 0) and on no arguments (exit 2)', [path.join(here, 'census_usage.mjs')], lastLine)],
    // a census refusal example carries the finding's message, the form the rule refused (types inventory lane, 2026-10-30)
    ['census-example-message', scriptRow('runtime', 'census-example-message', 'each refusal example carries its finding\'s message', [path.join(here, 'census_example_message.mjs')], lastLine)],
    ['refusal-path-space', scriptRow('runtime', 'refusal-path-space', 'a translator refusal in a path with a space keeps its rule', [path.join(here, 'refusal-path-space.mjs')], lastLine)],
    ['convert-async-foreach', scriptRow('runtime', 'convert-async-foreach', 'a forEach over a list whose array type rests on a cast is listed, never rewritten', [path.join(here, 'convert_async_foreach.mjs')], lastLine)],
    // a proof under a declared fact (a @sealed receiver) names it in the certificate (design/conformance-readings.md)
    ['sealed-assumption', scriptRow('runtime', 'sealed-assumption', 'a proof under a @sealed receiver names the assumption in the certificate and its reason', [path.join(here, 'sealed-assumption.mjs')], lastLine)],
    // the certificate records the seconds of each lane that ran, a lane that did not run absent (check.mjs certificate.timing)
    ['certificate-timing', scriptRow('runtime', 'certificate-timing', 'certificate.timing holds positive seconds per lane that ran on numbers::average, readme_ledger::applyAll and component::Counter', [path.join(here, 'certificate-timing.mjs')], lastLine)],
    ['z3-pinned', scriptRow('runtime', 'z3-pinned', 'the doubles reading and Dafny run the one Z3 the certificate names (solve/z3.mjs), by default and under LEAN_Z3', [path.join(here, 'z3-pinned.mjs')], lastLine)],
    // one entry point: bin/lean check | lint | pr | census, arguments and exit codes passed through; the README quickstart through it
    ['bin-lean', scriptRow('runtime', 'bin-lean', 'bin/lean check reproduces the README quickstart; lint, pr and census dispatched with their exit codes', [path.join(here, 'bin-lean.mjs')], lastLine)],
  ].map(([key, go]) => ({ key: `runtime/${key}`, go }));
  // Every selected pair's parent, the self-pair fixtures, and an optional challenge
  // manifest (LEAN_SELF_PAIR_SAMPLE) run against themselves. No model or proof lane. Its own workers take WIDE slots.
  const selfPair = { key: `runtime/self-pair ${process.env.LEAN_PAIRS || 'every pair'}${process.env.LEAN_SELF_PAIR_SAMPLE ? ' + sample' : ''}`, wide: true, go: async (job, add) => {
    const r = await job.slots(WIDE, (n) => spawnCollect('node', [path.join(here, 'self-pair.mjs'), '--out', path.join(tmp, 'self-pair.json'), '--jobs', String(n)], { cwd: root, env: process.env, maxBuffer: 1 << 26, dir: tmp, onSpawn: job.onSpawn }));
    if (r.stderr) process.stderr.write(r.stderr);
    const text = (r.stdout ?? '') + (r.stderr ?? '');
    add('runtime', 'self-pair', 'every parent against itself: zero WITNESS; refusals counted', r.status === 0, text.trim().split('\n').pop());
  } };
  // a project's `paths` alias without a baseUrl resolves from its tsconfig's folder, a workspace package to its source, a declared baseUrl is kept
  const pathsAlias = { key: 'runtime/paths-alias', inline: true, go: async (_, add) => {
    await new Promise((resolve) => setImmediate(resolve)); // in this process: after the pool has started the children
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
  } };
  await each(add, [...advice, ...runtime, selfPair, pathsAlias], (it, add) => it.go(it.inline ? null : it.wide ? pool.job(it.key) : runner(it.key, it.group ?? null), add));
}

// ----- lane B's hook runtime against React-tRace's scenarios (langs/ts/exec/react-trace.mjs) -----
async function reactTrace(add) {
  const R = runner('repo/react-trace');
  const r = await R.run('node', [path.join(here, '../exec/react-trace.mjs'), '--json']);
  let summary = null; try { summary = JSON.parse(r.stdout).summary; } catch { /* no JSON: the runner crashed */ }
  add('repo', 'react-trace scenarios', 'runner', !!summary && summary.disagree.length === 0, summary ? `${summary.agree} of ${summary.scenarios} agree${summary.disagree.length ? '; ' + summary.disagree.map((d) => d.scenario).join(', ') : ''}` : (r.stderr || r.stdout).trim().slice(-160));
}
// ----- the element-tree patch of a front-end WITNESS on hand-built trees (langs/ts/patch.test.mjs, node:test) -----
async function patchTest(add) {
  const R = runner('repo/patch.test');
  const r = await R.run('node', ['--test', path.join(here, '../patch.test.mjs')]);
  const text = (r.stdout ?? '') + (r.stderr ?? ''); const pass = text.match(/^\S+ pass (\d+)$/m), fail = text.match(/^\S+ fail (\d+)$/m);
  add('repo', 'patch.test.mjs', 'node:test', r.status === 0, pass ? `${pass[1]} pass, ${fail ? fail[1] : '?'} fail` : text.trim().slice(-160));
}
// ----- the same-file callees of a unit and its normalised text (langs/ts/exec/callees.test.mjs, node:test) -----
async function calleesTest(add) {
  const R = runner('repo/callees.test');
  const r = await R.run('node', ['--test', path.join(here, '../exec/callees.test.mjs')]);
  const text = (r.stdout ?? '') + (r.stderr ?? ''); const pass = text.match(/^\S+ pass (\d+)$/m), fail = text.match(/^\S+ fail (\d+)$/m);
  add('repo', 'callees.test.mjs', 'node:test', r.status === 0, pass ? `${pass[1]} pass, ${fail ? fail[1] : '?'} fail` : text.trim().slice(-160));
}

// ----- what a unit reads off its inputs and compares against, on hand-written units (langs/ts/exec/usage.test.mjs, node:test) -----
// with the repository's conformance run, the census report checks and the intake fixture: one job each, their rows in this order
async function unitReads(add) {
  const items = [
    ['usage.test', async (R, add) => {
      const r = await R.run('node', ['--test', path.join(here, '../exec/usage.test.mjs')]);
      const text = (r.stdout ?? '') + (r.stderr ?? ''); const pass = text.match(/^\S+ pass (\d+)$/m), fail = text.match(/^\S+ fail (\d+)$/m);
      add('repo', 'usage.test.mjs', 'node:test', r.status === 0, pass ? `${pass[1]} pass, ${fail ? fail[1] : '?'} fail` : text.trim().slice(-160));
    }],
    ...(fs.existsSync(path.join(root, 'conformance/run.py')) && fs.existsSync(path.join(root, 'langs/ts/conformance.json')) ? [['conformance-run.py', async (R, add) => {
      const c = await R.run('python3', ['-I', 'conformance/run.py', 'ts']);
      const last = (c.stdout ?? '').trim().split('\n').pop();
      add('repo', 'conformance/run.py ts', 'runner', c.status === 0, last);
    }]] : []),
    // Census report checks.
    ['census', async (R, add) => {
      const assert = (await import('node:assert/strict')).default;
      const script = path.join(here, '../census.mjs');
      // The census skips paths under tests or fixtures. Copy this tree outside those folders.
      const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-census-'));
      fs.cpSync(path.join(here, 'fixtures/census-report'), repo, { recursive: true });
      try {
        const scan = async (name, flags = []) => {
          const json = path.join(tmp, `census-${name}.json`), md = path.join(tmp, `census-${name}.md`);
          const r = await R.run(process.execPath, [script, repo, '--out', json, '--report', md, ...flags]);
          assert.equal(r.status, 0, (r.stdout ?? '') + (r.stderr ?? '') + (r.error ?? ''));
          return { result: JSON.parse(fs.readFileSync(json, 'utf8')), report: fs.readFileSync(md, 'utf8') };
        };
        const { result: result, report } = await scan('default');
        const sections = [...report.matchAll(/^## Rule: <code>([^<]+)<\/code>\n\nUnits stopped: (\d+)\.\n([\s\S]*?)(?=^## |$(?![\s\S]))/gm)].map((m) => ({
          rule: m[1], units: Number(m[2]),
          directories: [...m[3].matchAll(/^\| <code>([^<]+)<\/code> \| (\d+) \| <code>(.*)<\/code> \|$/gm)].map((d) => ({ directory: d[1], units: Number(d[2]), example: d[3] })),
        }));
        // Rebuild the expected attribution from the file findings, independently of the report groups.
        const expected = new Map();
        for (const record of result.records) for (const unit of record.units ?? []) {
          const first = record.findings.find((f) => !f.env && unit.lines[0] <= f.line && f.line <= unit.lines[1]);
          if (first) expected.set(first.rule, (expected.get(first.rule) ?? 0) + 1);
        }
        const sums = sections.map((s) => ({ ...s, sum: s.directories.reduce((n, d) => n + d.units, 0) }));
        const directoryOK = sums.length === expected.size && new Set(sums.map((s) => s.rule)).size === expected.size && sums.every((s) => s.sum === s.units && s.units === expected.get(s.rule) && s.units === result.refusalRules.find((r) => r.rule === s.rule)?.units);
        add('census', 'report', 'directory sums equal rule totals', directoryOK, sums.map((s) => `${s.rule}: ${s.sum} = ${s.units}`).join('; '));
        const stopped = sections.reduce((n, s) => n + s.units, 0);
        add('census', 'report', 'rule totals equal JSON refused', stopped === result.refused && stopped === result.units - result.entered, `${sections.map((s) => s.units).join(' + ')} = ${result.refused}`);
        const header = report.match(/Units: (\d+)\. Inside the subset: (\d+) \(([^)]+) percent\)\. Refused: (\d+)\. Files unreadable: (\d+)\./);
        assert.ok(header, 'report header is present');
        add('census', 'report', 'refused plus inside equal JSON units', Number(header[1]) === result.units && Number(header[2]) === result.entered && Number(header[4]) === result.refused && Number(header[4]) + Number(header[2]) === result.units, `${header[4]} + ${header[2]} = ${result.units}`);
        assert.deepEqual([result.files, result.units, result.entered, result.failedFiles], [8, 8, 2, 0]);
        assert.deepEqual(sections.map((s) => [s.rule, s.units]), [['alias-mutation', 2], ['reference-equality', 2], ['var', 2]]);
        assert.equal(result.rules.find((r) => r.rule === 'reference-equality').units, 3, 'the fixture also has a unit with two rules');
        assert.equal(header[3], String(result.share));
        assert.equal(Number(header[5]), result.failedFiles);
        assert.ok(report.startsWith(`# Census: <code>${path.basename(repo)}</code>\n`));
        assert.match(result.date, /^\d{4}-\d{2}-\d{2}$/);
        assert.ok(report.includes(`Date: ${result.date} (UTC)`));
        assert.ok(report.includes('Each refused unit is counted once, under the first rule the lint names for it.'));
        const top = report.split('## Top five rules by units stopped\n')[1].split('## Rule:')[0];
        assert.deepEqual([...top.matchAll(/^\| <code>([^<]+)<\/code> \| (\d+) \|$/gm)].map((m) => [m[1], Number(m[2])]), sections.slice(0, 5).map((s) => [s.rule, s.units]));
        for (const s of sections) {
          assert.deepEqual(s.directories.map((d) => d.directory), ['alpha', 'alpha/beta']);
          for (const d of s.directories) {
            const saved = result.refusalRules.find((r) => r.rule === s.rule).directories.find((r) => r.directory === d.directory);
            assert.equal(d.units, saved.units);
            assert.equal(d.example, `${saved.example.file}:${saved.example.line}  ${saved.example.code}`);
            assert.ok(saved.example.code.length <= 120);
            const record = result.records.find((r) => r.file === saved.example.file);
            assert.equal(saved.example.line, record.findings.find((f) => f.rule === s.rule).line);
            assert.ok(fs.readFileSync(path.join(repo, saved.example.file), 'utf8').split('\n')[saved.example.line - 1].includes(saved.example.code));
          }
        }
        add('census', 'report', 'header order examples and first rule', true, '8 files; 8 units; 25 percent; depth 2');
        for (const depth of [0, 1]) {
          const folded = await scan(`depth${depth}`, ['--depth', String(depth)]);
          assert.equal(folded.result.depth, depth);
          assert.ok(folded.report.includes(`Directory depth: ${depth}.`));
          for (const r of folded.result.refusalRules) {
            assert.equal(r.directories.length, 1);
            assert.equal(r.directories[0].directory, depth === 0 ? '.' : 'alpha');
            assert.equal(r.directories[0].units, r.units);
          }
        }
        const clean = await scan('clean', ['--include', 'clean.ts']);
        assert.deepEqual([clean.result.units, clean.result.entered, clean.result.refused], [1, 1, 0]);
        assert.deepEqual(clean.result.refusalRules, []);
        assert.ok(clean.report.includes('No units were refused.'));
        const invalid = await R.run(process.execPath, [script, repo, '--depth', '-1']);
        assert.notEqual(invalid.status, 0);
        assert.match(invalid.stderr, /depth must be a nonnegative integer/);
        add('census', 'report', 'depth and clean report', true, 'depth 0 and 1 fold; negative depth refuses; clean report has zero refusals');
      } catch (e) {
        add('census', 'report', 'report assertions', false, String(e.stack ?? e));
      } finally {
        fs.rmSync(repo, { recursive: true, force: true });
      }
    }],
    // The intake fixture covers every changed unit and proves that preview runs no lane.
    ['pr-intake', async (R, add) => {
      const r = await R.run('node', [path.join(here, 'fixtures/pr-intake/test.mjs')]);
      const text = (r.stdout ?? '') + (r.stderr ?? '');
      add('repo', 'pr intake', 'coverage and preview', r.status === 0, text.trim().split('\n').pop());
    }],
  ];
  await each(add, items, ([key, go], add) => go(runner(`reads/${key}`), add));
}

// ----- witness args: a WITNESS's args are the input as drawn, before either side ran (langs/ts/design/witness-args.md) -----
// every witness lane B wrote above for a listed unit is replayed (exec/replay-args.mjs): input i drawn again as the
// parent's side drew it, the parent run on it; the args must equal the draw, the replay must give the parent's
// observation, and every argument the parent's call wrote must show its value before the write. `witnessArgs` in a
// pair's expect.json lists the units (`writes`: some witness has a written argument; `pure`: none has); readme_ledger
// applyAll is listed here, its pair untouched
// It runs lane B where a pair's own step did not, so it waits for the steps that count the pairs' lane B results.
async function witnessArgs(add) {
  await countedDone;
  try {
    const listed = { readme_ledger: { applyAll: 'writes' } };
    const items = [];
    for (const name of fs.existsSync(pairsDir) ? fs.readdirSync(pairsDir).sort().filter((n) => !onlyPairs || onlyPairs.has(n)) : []) {
      const d = path.join(pairsDir, name);
      let exp = {}; try { exp = JSON.parse(fs.readFileSync(path.join(d, 'expect.json'), 'utf8')); } catch { /* no expect: nothing listed */ }
      for (const [unit, kind] of Object.entries({ ...(listed[name] ?? {}), ...(exp.witnessArgs ?? {}) })) items.push({ name, d, unit, kind });
    }
    await each(add, items, async ({ name, d, unit, kind }, add) => {
      const R = runner(`witness-args/${name} ${unit}`, 'witness-args');
      const result = path.join(tmp, `pair_${name}`, `b_${artifactName(unit)}.json`);
      if (!fs.existsSync(result)) { fs.mkdirSync(path.dirname(result), { recursive: true }); await R.run('node', [path.join(here, '../exec/run.mjs'), '--parent', pairFile(d, 'parent'), '--candidate', pairFile(d, 'candidate'), '--unit', unit, '--n', '30', '--no-project', '--out', result]); } // the pair's own lane B step did not run (its theorem stopped it): lane B runs here, as that step runs it
      if (!fs.existsSync(result)) { add('witness-args', name, `${unit} ${kind}`, false, 'no lane B result for the unit'); return; }
      const r = await R.run('node', [path.join(here, '../exec/replay-args.mjs'), '--parent', pairFile(d, 'parent'), '--candidate', pairFile(d, 'candidate'), '--unit', unit, '--result', result, '--kind', kind]);
      let got = null; try { got = JSON.parse((r.stdout ?? '').trim().split('\n').pop()); } catch { /* no JSON fails */ }
      const detail = got ? (got.error ?? `${got.witnesses.map((w) => `input ${w.input}: draw ${w.sameDraw ? 'kept' : 'LOST'}, replay ${w.sameObservation ? 'agrees' : 'DIFFERS'}${w.written?.length ? `, written ${w.written.map((x) => `arg${x.position} (${x.gained.join(', ') || 'changed'}) shown ${x.shownBefore ? 'before' : 'AFTER'} the write`).join('; ')}` : ''}`).join(' | ')}${got.why ? '; ' + got.why : ''}`) : (r.stderr || r.stdout || '').trim().slice(-160);
      add('witness-args', name, `${unit} ${kind}: args are the draw`, r.status === 0 && got?.ok === true, detail);
    });
  } finally { witnessArgsDone.open(); }
}

// A witness names the statement that returned or requested the differing value. The listed units read (and, where a
// pair's own step did not run lane B, write) the pairs' lane B results: they wait for witness args; the advice check does not.
async function witnessLines(add) {
  const listed = [
    ['proto_write', 'own', 'hasOwnProperty'],
    ['dict_order', 'keyList', 'Object.keys'],
    ['witness_args', 'scaled', '+ 1'],
    ['map_block', 'sizes', 's + 2'],
    ['callback_patterns', 'above', 'sink.note(id)'],
    ['branch_types', 'isFive', 'y === 5'],
    ['void_promise', 'handout', 'done: b'],
    ['operands_coercion', 'absent', '=== undefined'],
    ['numbers_bits', 'flags', '| 8'],
    ['optional_calls', 'labelOf', '": "'],
  ];
  const { topLevelFunctions } = await import('../common.mjs');
  const items = [
    ...listed.filter(([name]) => !onlyPairs || onlyPairs.has(name)).map(([name, unit, token]) => async (add) => {
      await witnessArgsDone;
      const R = runner(`witness-lines/${name} ${unit}`, 'witness-lines');
      const d = path.join(pairsDir, name), candidate = pairFile(d, 'candidate');
      const result = path.join(tmp, `pair_${name}`, `b_${artifactName(unit)}.json`);
      if (!fs.existsSync(result)) {
        fs.mkdirSync(path.dirname(result), { recursive: true });
        await R.run('node', [path.join(here, '../exec/run.mjs'), '--parent', pairFile(d, 'parent'), '--candidate', candidate, '--unit', unit, '--n', '30', '--no-project', '--out', result]);
      }
      let got = null; try { got = JSON.parse(fs.readFileSync(result, 'utf8')); } catch { /* A missing result fails. */ }
      const sf = ts.createSourceFile(candidate, fs.readFileSync(candidate, 'utf8'), ts.ScriptTarget.Latest, true);
      const u = topLevelFunctions(sf).get(unit);
      const start = sf.getLineAndCharacterOfPosition(u.node.getStart(sf)).line + 1;
      const end = sf.getLineAndCharacterOfPosition(u.node.end - 1).line + 1;
      const site = got?.witnesses?.[0]?.where?.lines?.candidate;
      const parentSite = got?.witnesses?.[0]?.where?.lines?.parent;
      const ok = got?.verdict === 'WITNESS' && site && parentSite && path.resolve(site.file) === path.resolve(candidate)
        && start <= site.start && site.start <= site.end && site.end <= end && site.text.includes(token)
        && !/^export\s/.test(site.text);
      add('witness-lines', name, `${unit} contains ${token}`, !!ok, site ? `${site.file}:${site.start} ${JSON.stringify(site.text)}` : 'no statement site');
    }),
    async (add) => {
      const R = runner('witness-lines/advice');
      const fixture = path.join(here, 'fixtures/witness-lines');
      const result = path.join(tmp, 'witness-lines-advice.json');
      const r = await R.run('node', [path.join(here, '../check.mjs'), '--parent', path.join(fixture, 'parent.ts'), '--candidate', path.join(fixture, 'candidate.ts'), '--unit', 'frozen', '--n', '3', '--no-project', '--out', result]);
      let got = null; try { got = JSON.parse(fs.readFileSync(result, 'utf8')); } catch { /* A missing certificate fails. */ }
      const advice = got?.witness?.where?.advice;
      const expected = '[migration] A later write to a frozen object throws in strict code, and the proof lane has no fault for it. Keep the object unfrozen inside the function, or freeze a copy you never write.';
      add('witness-lines', 'advice', 'the site supplies the lint rewrite', r.status === 0 && got?.verdict === 'WITNESS' && advice?.rule === 'freeze' && advice?.label === 'migration' && advice?.advice === expected, JSON.stringify(advice) ?? 'no advice');
    },
  ];
  await each(add, items, (go, add) => go(add));
}

// ----- convert: each transform's fixture through the converter and pr.mjs (langs/ts/design/converter.md) -----
// before.ts is committed in a scratch repository and converted; the result must be after.ts, applied with every
// changed function PASS-proved or PASS-bounded; then wrong.ts (a near rewrite that changes behaviour) must be a WITNESS
async function convert(add) {
  const convDir = path.join(here, 'fixtures/convert');
  const converter = path.join(here, '../convert.mjs'), prTool = path.join(here, '../pr.mjs');
  const cache = path.join(tmp, 'convert-cache');
  const count = (rs) => Object.entries(rs.reduce((c, r) => ({ ...c, [r.verdict ?? 'none']: (c[r.verdict ?? 'none'] ?? 0) + 1 }), {})).map(([k, v]) => `${v} ${k}`).join(', ');
  await each(add, fs.existsSync(convDir) ? fs.readdirSync(convDir).sort() : [], async (name, add) => {
    const R = runner(`convert/${name}`, 'convert');
    const d = path.join(convDir, name);
    const work = fs.mkdtempSync(path.join(tmp, `convert-${name}-`));
    const unit = path.join(work, 'unit.ts');
    fs.copyFileSync(path.join(d, 'before.ts'), unit);
    const g = [['init', '-q'], ['add', '-A'], ['-c', 'user.email=lean@local', '-c', 'user.name=lean', 'commit', '-qm', 'before']].map((a) => spawnSync('git', ['-C', work, ...a], { encoding: 'utf8' }));
    if (g.some((r) => r.status !== 0)) { add('convert', name, 'scratch repository', false, g.map((r) => r.stderr).join(' ').trim().slice(0, 160)); return; }
    const json = path.join(tmp, `convert-${name}.json`);
    // expect.json may name the converter's options for the fixture ({"args": ["--narrowed"]}: a door a person opens)
    const opts_ = fs.existsSync(path.join(d, 'expect.json')) ? JSON.parse(fs.readFileSync(path.join(d, 'expect.json'), 'utf8')).args ?? [] : [];
    const c = await R.run('node', [converter, work, '--no-project', ...opts_, '--n', '30', '--dafny-seconds', '30', '--cache-dir', cache, '--json', json]);
    const got = fs.readFileSync(unit, 'utf8'), want = fs.readFileSync(path.join(d, 'after.ts'), 'utf8');
    const at = got.split('\n').findIndex((l, i) => l !== want.split('\n')[i]);
    add('convert', name, 'before converts to after.ts', got === want, got === want ? 'same text' : `differs at line ${at + 1}: ${JSON.stringify(got.split('\n')[at] ?? '')}`);
    let rep = null; try { rep = JSON.parse(fs.readFileSync(json, 'utf8'))[0]; } catch { /* no report fails below */ }
    const file = rep?.files?.[0], rs = (rep?.rows ?? []).filter((r) => !r.caller);
    // an optional expect.json per fixture holds the counts ({"applied": N, "listed": M}): 0 applied is a pass when the lint admits every site
    const want_ = fs.existsSync(path.join(d, 'expect.json')) ? JSON.parse(fs.readFileSync(path.join(d, 'expect.json'), 'utf8')) : null;
    const nApplied = file?.applied?.length ?? 0;
    const counted = want_ && 'applied' in want_ ? nApplied === want_.applied && (file?.listed?.length ?? 0) === want_.listed && (nApplied === 0 || rs.length > 0) : nApplied > 0 && rs.length > 0;
    const ok = c.status === 0 && counted && !file?.reverted && rs.every((r) => r.verdict === 'PASS-proved' || r.verdict === 'PASS-bounded');
    add('convert', name, 'applied and proved, no WITNESS', ok, rep ? `${file?.applied?.length ?? 0} applied, ${file?.listed?.length ?? 0} listed; ${count(rs)}${file?.reverted ? '; reverted: ' + file.reverted : ''}` : (c.stderr || c.stdout).trim().slice(-160));
    fs.writeFileSync(unit, fs.readFileSync(path.join(d, 'wrong.ts'), 'utf8'));
    const wj = path.join(tmp, `convert-${name}-wrong.json`);
    const w = await R.run('node', [prTool, '--repo', work, '--base', 'HEAD', '--no-project', '--n', '30', '--dafny-seconds', '30', '--cache-dir', cache, '--json', wj, '--out', path.join(tmp, `convert-${name}-wrong.md`)]);
    let wr = null; try { wr = JSON.parse(fs.readFileSync(wj, 'utf8')).rows; } catch { /* no rows fails below */ }
    const hit = (wr ?? []).filter((r) => r.verdict === 'WITNESS');
    add('convert', name, 'wrong after refuted', hit.length > 0, hit.length ? hit.map((r) => `${r.unit} WITNESS at input ${r.witness?.input ?? '?'}`).join(', ') : `no WITNESS: ${wr ? count(wr) : (w.stderr || w.stdout).trim().slice(-160)}`);
  });
}

// ----- the sections, in the table's order: each one's mark (the label of its time row) and its steps -----
const sections = [
  ['shared fixtures', sharedFixtures],
  ['constructs: one small function per const', constructs],
  ['numbers per file: a float literal makes ', numbersPerFile],
  ['differential run: the translation and th', differentialRun],
  ['negative controls: a false theorem must ', negativeControls],
  ['--changed: only the changed functions ar', changedOnly],
  ['pairs: parent against candidate through ', pairs],
  ['proof hunt: lane A beside lane B on ever', proofHunt],
  ['model conformance (design/model-conforma', modelConformance],
  ['text-only witnesses: a WITNESS rests on ', textOnlyWitnesses],
  ['escapes', escapes],
  ['advice labels: the label of the rewrite ', adviceLabels],
  ["the repository's own conformance run, wh"],
  ["lane B's hook runtime against React-tRac", reactTrace],
  ['the element-tree patch of a front-end WI', patchTest],
  ['the same-file callees of a unit and its ', calleesTest],
  ['what a unit reads off its inputs and com', unitReads],
  ["witness args: a WITNESS's args are the i", witnessArgs, witnessLines],
  ["convert: each transform's fixture throug", convert],
];
// every section starts now; a section's time row is its own wall time, start to end
const running = sections.map(([label, ...steps]) => {
  const start = Date.now(), lists = steps.map(() => []);
  return Promise.all(steps.map((step, i) => step((...a) => lists[i].push(row(...a))))).then(() => ({ label, rows: lists.flat(), seconds: Math.round((Date.now() - start) / 1000) }));
});
const at = (label) => running[sections.findIndex(([l]) => l === label)];
Promise.allSettled([at('proof hunt: lane A beside lane B on ever'), at('text-only witnesses: a WITNESS rests on ')]).then(() => countedDone.open());
for (const s of await Promise.all(running)) { rows.push(...s.rows); rows.push(row('time', s.label, 'wall', true, `${s.seconds} s`)); }
pool.save();

// ----- table -----
const tableStart = Date.now();
const w = (k, s) => Math.max(s.length, ...rows.map((r) => String(r[k]).length));
const cols = ['kind', 'name', 'check'];
const widths = Object.fromEntries(cols.map((c) => [c, w(c, c)]));
const line = (r) => `| ${cols.map((c) => String(r[c]).padEnd(widths[c])).join(' | ')} | ${r.ok ? 'PASS' : 'FAIL'} | ${r.lsc.padEnd(11)} | ${r.detail}`;
console.log(`| ${cols.map((c) => c.padEnd(widths[c])).join(' | ')} | res  | lsc accepts | detail`);
for (const r of rows) console.log(line(r));
rows.push(row('time', 'table', 'wall', true, `${Math.round((Date.now() - tableStart) / 1000)} s`)); // the table's own time row: counted in TOTAL, printed nowhere (each section's time row is added after its rows)
const failed = rows.filter((r) => !r.ok).length;
const sc = stepCacheStats();
console.log(`| STEP CACHE | ${sc.on ? `${sc.hits + childCache.hits} hits, ${sc.misses + childCache.misses} misses` : 'off'} | ${sc.dir} |`);
console.log(`| WALL | ${Math.round((Date.now() - t0) / 1000)} s | JOBS ${JOBS} |`);
console.log(`| TOTAL | ${rows.length} checks | ${failed === 0 ? 'ALL PASS' : `${failed} FAILED`} |`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(failed === 0 ? 0 : 1);
