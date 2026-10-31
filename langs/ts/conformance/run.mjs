#!/usr/bin/env node
// The model conformance step (design/model-conformance.md): every pair lane A translates, each unit's two Dafny models
// run on every input lane B draws and compared with Node's result under SameValue, plus the product check for shared
// parts with no body.
//
//   node run.mjs [--pairs <dir>] [--work <dir>] [--known <json>] [--n 30] [--jobs 3] [--pair-seconds 3600] [--json <out>]
//
// LEAN_PAIRS=a,b limits the pairs, as in tests/run.mjs. Prints one row per unit, the totals, every disagreement and
// coupling finding grouped by cause; exits 1 when a disagreement or a coupling finding is not listed in the known
// findings file (each listed one names its board row), 0 otherwise. The last line is the TOTAL line.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const a = process.argv.slice(2);
const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
const pairsDir = path.resolve(opt('--pairs', path.join(here, '../tests/pairs')));
const work = path.resolve(opt('--work', fs.mkdtempSync(path.join(os.tmpdir(), 'lean-conformance-'))));
const knownFile = path.resolve(opt('--known', path.join(here, 'known-findings.json')));
const N = Number(opt('--n', 30)), JOBS = Number(opt('--jobs', 3)), PAIR_SECONDS = Number(opt('--pair-seconds', 3600)); // each unit has its own bound inside (pair.mjs)
const jsonOut = opt('--json', null);
const only = process.env.LEAN_PAIRS ? new Set(process.env.LEAN_PAIRS.split(',').map((x) => x.trim()).filter(Boolean)) : null;
const known = fs.existsSync(knownFile) ? JSON.parse(fs.readFileSync(knownFile, 'utf8')).findings ?? [] : [];

const pairs = fs.readdirSync(pairsDir).filter((n) => fs.existsSync(path.join(pairsDir, n, 'expect.json')) && (!only || only.has(n))).sort();
fs.mkdirSync(work, { recursive: true });

// one pair in its own process group under a wall-clock bound. The group: the bound kills the pair's process AND what it
// started (its current unit's process, dafny, the translator), which a kill of the pair's process alone left running.
// /usr/bin/time -p (POSIX) reports the CPU of the pair and every descendant it waited for: the pair's cost (row d7e54baf).
const TIME = fs.existsSync('/usr/bin/time') ? '/usr/bin/time' : null;
const live = new Set();
const killGroup = (pid) => { try { process.kill(-pid, 'SIGKILL'); } catch (e) { if (e.code !== 'ESRCH') throw e; } }; // ESRCH: the group already ended
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { for (const pid of live) killGroup(pid); process.exit(sig === 'SIGINT' ? 130 : 143); });
const timeLine = (text, k) => { const m = text.match(new RegExp(`^${k} ([0-9]+[.,]?[0-9]*)$`, 'm')); return m ? Number(m[1].replace(',', '.')) : null; }; // the decimal mark follows the locale
const runPair = (name) => new Promise((resolve) => {
  const out = path.join(work, name); fs.rmSync(path.join(out, 'result.json'), { force: true });
  const argv = [process.execPath, path.join(here, 'pair.mjs'), path.join(pairsDir, name), out, '--n', String(N)];
  const t0 = performance.now();
  const child = TIME ? spawn(TIME, ['-p', ...argv], { stdio: ['ignore', 'pipe', 'pipe'], detached: true }) : spawn(argv[0], argv.slice(1), { stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  live.add(child.pid);
  let text = ''; child.stdout.on('data', (d) => { text += d; }); child.stderr.on('data', (d) => { text += d; });
  const timer = setTimeout(() => killGroup(child.pid), PAIR_SECONDS * 1000);
  child.on('close', (code, signal) => {
    clearTimeout(timer); live.delete(child.pid);
    const wallS = Math.round((performance.now() - t0) / 10) / 100;
    const user = TIME ? timeLine(text, 'user') : null, sys = TIME ? timeLine(text, 'sys') : null;
    if (TIME) text = text.replace(/^(real|user|sys) [0-9]+[.,]?[0-9]*$/gm, '');
    let r = null; try { r = JSON.parse(fs.readFileSync(path.join(out, 'result.json'), 'utf8')); } catch { /* none: below */ }
    if (!r) r = { pair: name, units: [], notes: [], skipped: null };
    r.timing = { ...(r.timing ?? {}), wallS, cpuS: user === null ? null : Math.round((user + sys) * 100) / 100 };
    // time(1) exits with its command's status; a command killed by a signal makes it exit 128+n or die itself
    if (code !== 0 || signal) r.harness = signal || (TIME && code > 128) ? `killed (${signal ?? `signal ${code - 128}`}) after ${wallS} s (bound ${PAIR_SECONDS} s)` : `exit ${code}: ${text.trim().split('\n').slice(-2).join(' ').slice(0, 300)}`;
    resolve(r);
  });
});
const loadStart = os.loadavg(), tStep = performance.now();
const results = new Array(pairs.length);
{ let next = 0; await Promise.all(Array.from({ length: Math.min(JOBS, pairs.length) }, async () => { while (next < pairs.length) { const i = next++; results[i] = await runPair(pairs[i]); } })); }
const stepWallS = Math.round((performance.now() - tStep) / 10) / 100, loadEnd = os.loadavg();

// ----- per unit: one status -----
const sum = (o, re) => Object.entries(o ?? {}).filter(([k]) => re.test(k)).reduce((n, [, v]) => n + v, 0);
const rows = [], findings = [], couplings = [];
const totals = { pairs: pairs.length, pairsSkipped: 0, pairsFailed: 0, units: 0, executable: 0, agree: 0, disagree: 0, notExecutable: 0, outsideDomain: 0, notBridged: 0, modelError: 0, unitsSkipped: 0, inputs: 0, coupled: 0, productInputs: 0, unseen: 0 };
const inputTally = {};
for (const r of results) {
  if (r.harness) { totals.pairsFailed++; rows.push({ pair: r.pair, unit: '-', status: 'HARNESS', detail: r.harness }); }
  if (r.skipped) { totals.pairsSkipped++; rows.push({ pair: r.pair, unit: '-', status: 'skipped', detail: r.skipped }); continue; }
  for (const u of r.units) {
    totals.units++;
    if (u.skipped) { totals.unitsSkipped++; rows.push({ pair: r.pair, unit: u.unit, status: 'skipped', detail: u.skipped }); continue; }
    totals.inputs += u.inputs; totals.productInputs += u.product.inputs; totals.unseen += u.unseen ?? 0;
    const both = {}; for (const side of ['parent', 'candidate']) for (const [k, v] of Object.entries(u.sides[side])) { both[k] = (both[k] ?? 0) + v; inputTally[k.split(':')[0]] = (inputTally[k.split(':')[0]] ?? 0) + v; }
    const ag = sum(both, /^agree/), dis = sum(both, /^disagree/), ne = sum(both, /^not executable/), od = sum(both, /^outside/), nb = sum(both, /^not bridged/), me = sum(both, /^model error/), nn = sum(both, /^Node did not/);
    let status;
    if (dis) { status = 'DISAGREE'; totals.disagree++; totals.executable++; }
    else if (ag) { status = 'agree'; totals.agree++; totals.executable++; }
    else if (me) { status = 'model error'; totals.modelError++; }
    else if (ne) { status = 'not executable'; totals.notExecutable++; }
    else if (od) { status = 'outside domain'; totals.outsideDomain++; }
    else { status = 'not bridged'; totals.notBridged++; }
    const top = Object.entries(both).filter(([k]) => !/^agree$|^disagree$/.test(k)).sort((x, y) => y[1] - x[1])[0];
    rows.push({ pair: r.pair, unit: u.unit, status, detail: `${ag} agree, ${dis} disagree, ${ne} not executable, ${od} outside, ${nb} not bridged${me ? `, ${me} model error` : ''}${nn ? `, ${nn} Node did not answer` : ''} of ${u.inputs * 2}${top ? `; most: ${top[0].slice(0, 90)}` : ''}` });
    for (const d of u.disagreements) findings.push({ pair: r.pair, unit: u.unit, laneA: u.laneA, ...d });
    for (const c of u.coupling) { totals.coupled++; couplings.push({ pair: r.pair, unit: u.unit, laneA: u.laneA, ...c }); }
  }
}
const laneAText = (x) => (x === true ? 'proved' : x === false ? 'not proved' : x === 'withheld' ? 'withheld' : x === 'obligation' ? 'proved, withheld by a cell obligation' : 'unlisted');
const isKnown = (f, kind) => known.find((k) => k.kind === kind && k.pair === f.pair && k.unit === f.unit && (!k.cause || k.cause === f.cause) && (!k.side || k.side === f.side));

// ----- the table -----
const w = (k) => Math.max(k.length, ...rows.map((x) => String(x[k]).length));
const W = { pair: w('pair'), unit: w('unit'), status: w('status') };
console.log(`| ${'pair'.padEnd(W.pair)} | ${'unit'.padEnd(W.unit)} | ${'status'.padEnd(W.status)} | detail`);
for (const x of rows) console.log(`| ${x.pair.padEnd(W.pair)} | ${x.unit.padEnd(W.unit)} | ${x.status.padEnd(W.status)} | ${x.detail}`);

// ----- findings, grouped by cause -----
const groups = new Map();
for (const f of findings) { const g = groups.get(f.cause) ?? []; g.push(f); groups.set(f.cause, g); }
console.log(`\n## Disagreements: ${findings.length} (input, side), ${new Set(findings.map((f) => `${f.pair}/${f.unit}`)).size} units, ${groups.size} causes`);
let unknown = 0;
for (const [cause, fs_] of [...groups].sort((x, y) => y[1].length - x[1].length)) {
  console.log(`\n### ${cause}: ${fs_.length}`);
  const byUnit = new Map(); for (const f of fs_) { const k = `${f.pair}/${f.unit}`; if (!byUnit.has(k)) byUnit.set(k, []); byUnit.get(k).push(f); }
  for (const [k, list] of byUnit) {
    const f = list[0]; const kn = isKnown(f, 'disagree');
    if (!kn) unknown += 1;
    console.log(`- ${k} (${list.length}: ${[...new Set(list.map((x) => x.side))].join(', ')}; the pair expects lane A ${laneAText(f.laneA)})${kn ? ` [known: ${kn.row}${kn.class ? `; class ${kn.class.split(' (')[0]}` : ''}]` : ' [NEW]'}: input ${f.input} ${JSON.stringify(f.args).slice(0, 140)}; Node ${JSON.stringify(f.node).slice(0, 100)}; ${f.diff.slice(0, 200)}`);
  }
}
console.log(`\n## The product check: ${couplings.length} inputs where both models agree under every seed and Node differs, of ${totals.productInputs} inputs that reached a part with no body`);
// a coupling is a defect under a lemma lane A proves: the theorem holds for every reading of the shared symbols, and the
// sampled seeds only stand in for that; under a lemma lane A does not prove or withholds, Dafny already found the reading
// the seeds missed, so the sampled agreement is listed and is no finding
const sampledOnly = couplings.filter((c) => c.laneA !== true);
console.log(`(${couplings.length - sampledOnly.length} under a lemma lane A proves: findings; ${sampledOnly.length} under a lemma lane A does not prove or withholds: sampled agreement, no finding, by unit: ${[...new Set(sampledOnly.map((c) => `${c.pair}/${c.unit}`))].join(', ') || 'none'})`);
for (const c of couplings.filter((x) => x.laneA === true)) { const kn = isKnown(c, 'coupling'); if (!kn) unknown++; console.log(`- ${c.pair}/${c.unit} (the pair expects lane A ${laneAText(c.laneA)})${kn ? ` [known: ${kn.row}]` : ' [NEW]'}: input ${c.input} ${JSON.stringify(c.args).slice(0, 120)}; ${c.why}; Node parent ${JSON.stringify(c.node.parent).slice(0, 80)}, candidate ${JSON.stringify(c.node.candidate).slice(0, 80)}`); }
// a known finding of a pair that ran and no longer seen: a fix or a moved translation; listed so the baseline is rewritten,
// never a failure (a fix must not fail the step)
const ranPairs = new Set(results.filter((r) => !r.harness && !r.skipped).map((r) => r.pair));
const seen = [...findings.map((f) => ({ ...f, kind: 'disagree' })), ...couplings.filter((c) => c.laneA === true).map((c) => ({ ...c, kind: 'coupling' }))];
const vanished = known.filter((k) => ranPairs.has(k.pair) && !seen.some((f) => f.kind === k.kind && f.pair === k.pair && f.unit === k.unit && (!k.cause || k.cause === f.cause) && (!k.side || k.side === f.side)));
console.log(`\n## Known findings not seen in a pair that ran: ${vanished.length}${vanished.length ? ' (rewrite known-findings.json with the reason)' : ''}`);
for (const k of vanished) console.log(`- ${k.pair}/${k.unit}: ${k.cause} [${k.row}]`);
console.log(`\n## Inputs: ${totals.inputs} drawn, ${totals.inputs * 2} model runs; ${totals.unseen} positions of Node's result lane B rendered as a second sight, not compared`);
console.log(`\n## Inputs by status (both sides): ${Object.entries(inputTally).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`);
// ----- the cost: per pair wall and CPU (pair and descendants), the slowest pairs, the load the machine was under -----
const cost = results.map((r) => ({ pair: r.pair, wallS: r.timing?.wallS ?? null, cpuS: r.timing?.cpuS ?? null, translateS: r.timing?.translateS ?? null, compileS: (r.timing?.compile_parentS ?? 0) + (r.timing?.compile_candidateS ?? 0), units: r.units.length, slowestUnit: r.units.reduce((b, u) => (u.wallS ?? 0) > (b?.wallS ?? -1) ? u : b, null), status: r.harness ? 'HARNESS' : r.skipped ? 'skipped' : 'ran' }));
const r2 = (x) => Math.round(x * 100) / 100, sumOf = (k) => r2(cost.reduce((n, c) => n + (c[k] ?? 0), 0));
const la = (l) => l.map((x) => x.toFixed(2)).join(' ');
console.log(`\n## Cost: ${stepWallS} s wall for ${pairs.length} pairs at --jobs ${JOBS} (n ${N}); sum of pair walls ${sumOf('wallS')} s; CPU ${TIME ? `${sumOf('cpuS')} s (user+sys, each pair with its descendants, /usr/bin/time -p)` : 'not measured (no /usr/bin/time)'}; load average ${la(loadStart)} at start, ${la(loadEnd)} at end, ${os.cpus().length} CPUs`);
console.log(`| pair | wall s | cpu s | translate s | compile s | units | slowest unit (wall s, cpu s) | status`);
for (const c of [...cost].sort((x, y) => (y.wallS ?? 0) - (x.wallS ?? 0)).slice(0, 20)) console.log(`| ${c.pair} | ${c.wallS} | ${c.cpuS ?? '-'} | ${c.translateS ?? '-'} | ${r2(c.compileS)} | ${c.units} | ${c.slowestUnit ? `${c.slowestUnit.unit} (${c.slowestUnit.wallS ?? '-'}, ${c.slowestUnit.cpuS ?? '-'})` : '-'} | ${c.status}`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ totals, inputTally, rows, findings, couplings, work, cost: { stepWallS, jobs: JOBS, n: N, loadStart, loadEnd, cpus: os.cpus().length, cpuMeasured: !!TIME, pairs: cost.map(({ slowestUnit, ...c }) => c), units: results.flatMap((r) => r.units.map((u) => ({ pair: r.pair, unit: u.unit, wallS: u.wallS ?? null, cpuS: u.cpuS ?? null, skipped: u.skipped ?? null }))) } }, null, 1));
const t = totals;
console.log(`| MODEL-CONFORMANCE TOTAL | ${t.units} units in ${t.pairs - t.pairsSkipped} pairs (${t.pairsSkipped} skipped${t.pairsFailed ? `, ${t.pairsFailed} HARNESS` : ''}) | ${t.executable} executable: ${t.agree} agree, ${t.disagree} disagree | ${t.notExecutable} not executable, ${t.outsideDomain} outside domain, ${t.notBridged} not bridged, ${t.modelError} model error, ${t.unitsSkipped} skipped | ${couplings.filter((c) => c.laneA === true).length} coupling finding(s) (${t.coupled} sampled) | ${unknown === 0 && !t.pairsFailed ? 'NO NEW FINDING' : `${unknown} NEW FINDING(S)${t.pairsFailed ? `, ${t.pairsFailed} pair(s) failed` : ''}`} |`);
process.exit(unknown === 0 && !t.pairsFailed ? 0 : 1);
