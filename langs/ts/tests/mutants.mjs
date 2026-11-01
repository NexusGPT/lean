#!/usr/bin/env node
// The mutant study (W3b, design/w3b-mutant-study.md): how many planted changes lean catches, by mutation kind.
//
//   node tests/mutants.mjs [--pairs <dir>] [--pair a,b] [--no-pairs] [--census <census.json>]... [--sample 300]
//                          [--seed 1] [--jobs 4] [--work <dir>] [--out <json>] [--report <md>] [--timing <json>]
//                          [--n 30] [--dafny-seconds 30] [--without-kind <kind>]
//
// Every unit of every pair under --pairs (tests/pairs by default: the units the candidate file lists,
// common.mjs topLevelFunctions), and a seeded sample of --sample units drawn from the written, entered units of the
// census runs named by --census (each a census.mjs --out JSON; its `root` is the folder the units are read from, a
// copy, since exec/mutate.mjs writes its type-check file beside the unit's file). For each unit, every site
// exec/mutate.mjs lists, in its order: the site's edit applied to a copy of the unit's file (mutate.mjs mutate at the
// site's index; a site whose edit mutate.mjs skips, because it does not parse or adds a type error, is `not-planted`,
// never counted as another site), then `check.mjs --parent <unit's file> --candidate <mutant>` with the suite's options
// (tests/run.mjs: --n 30, --dafny-seconds 30, the pair's project or --no-project). The parent is the unmutated file, so
// every planted mutant differs from it in its text and the question is only whether lean shows the difference:
//   caught    WITNESS (the lane and the source of the separating input recorded)
//   escaped   PASS-bounded, PASS-decided, PASS-proved (a proof on a mutant: an equivalent mutant or an unsound proof,
//             counted apart so a reader can look at each)
//   ASK       any ASK, lane A's verdict kept beside it
//   other     NEW, REFUSE: outside the equality ordering
//
// --out holds one row per site, in a fixed order, and nothing that depends on the machine (no seconds, no temporary
// paths): two runs on one head are byte-equal when lean's verdicts are. --report renders it by kind. The seconds go to
// --timing (JSON with the 20 slowest; the report names the file), so the determinism check reads --out and --report.
// --without-kind drops one kind of mutate.mjs's sites before planting: the fixture test's --break, nothing else.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { spawnCollect } from '../exec/capped.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ts = path.join(here, '..');
const checkMjs = path.join(ts, 'check.mjs');
const a = process.argv.slice(2);
const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
const opts = (k) => a.flatMap((x, i) => (x === k ? [a[i + 1]] : []));
const sha = (s) => createHash('sha256').update(s).digest('hex');

export const KINDS = ['operator', 'boundary', 'string', 'negated-if', 'dropped-else', 'swapped-args', 'dropped-effect', 'changed-return'];
const ESCAPED = new Set(['PASS-bounded', 'PASS-decided', 'PASS-proved']);
export const outcomeOf = (verdict) => (verdict === 'WITNESS' ? 'caught' : ESCAPED.has(verdict) ? 'escaped' : String(verdict).startsWith('ASK') ? 'ask' : verdict === 'not-planted' ? 'not-planted' : 'other');

// the source of the separating input: the lane whose WITNESS the verdict is, and how lane B came by the input (the
// draw family its unit record gives the input's index: enumerated heaps, listed values, boundary walk, seeded
// type-directed draw), or the program kind for a witness on a program, a click sequence or a schedule. A witness that
// names its own `source` (a later lane's counterexample or search) is read by that name.
export function foundBy(res) {
  const c = res.certificate ?? {}, B = c.lanes?.B ?? {}, A = c.lanes?.A ?? {};
  if (res.verdict !== 'WITNESS') return null;
  if (B.verdict === 'WITNESS') {
    const w = (B.witnesses ?? [])[0] ?? res.witness ?? {};
    if (w.source) return { lane: 'B', source: String(w.source) };
    if (typeof w.input === 'number') return { lane: 'B', source: B.record?.draws?.find((d) => d.input === w.input)?.family ?? 'drawn input' };
    if (typeof w.input === 'string') return { lane: 'B', source: w.input.replace(/\s*\d+$/, '') };
    if (w.schedule) return { lane: 'B', source: 'schedule' };
    if (w.sequence) return { lane: 'B', source: 'click sequence' };
    return { lane: 'B', source: 'other' };
  }
  const w = res.witness ?? {};
  if (w.source) return { lane: 'A', source: String(w.source) };
  if (A.verdict === 'WITNESS' && A.doubles) return { lane: 'A', source: 'doubles counterexample' };
  return { lane: A.verdict === 'WITNESS' ? 'A' : '?', source: 'other' };
}

// ---- one unit: plant every site, check each mutant (a child process per unit, so units plan in parallel) ----
async function unitJob(job) {
  const { sitesOf, mutate } = await import('../exec/mutate.mjs');
  const { checkWallCapMs } = await import('../check.mjs');
  const project = job.project ?? false;
  const rows = [], times = [];
  let sites;
  try { sites = sitesOf(job.file, job.unit, { project }).sites; } catch (e) { return { rows: [{ ...job.key, index: null, kind: null, verdict: 'no-unit', detail: String(e.message).slice(0, 120) }], times }; }
  const ext = path.extname(job.file), stem = path.basename(job.file, ext);
  for (let k = 0; k < sites.length; k++) {
    const s = sites[k];
    const row = { ...job.key, index: k, sites: sites.length, kind: s.kind, was: String(s.was).slice(0, 60), text: String(s.text).slice(0, 60) };
    if (job.withoutKind && s.kind === job.withoutKind) continue;
    let m = null;
    try { m = mutate(job.file, job.unit, k, { project }); } catch (e) { m = null; }
    if (!m || m.skipped !== 0) { rows.push({ ...row, verdict: 'not-planted', detail: m ? 'the edit does not parse or adds a type error (mutate.mjs skips it)' : 'mutate.mjs returned no mutant' }); continue; }
    const mutant = path.join(path.dirname(job.file), `${stem}.lean-mutant-${job.id}-${k}${ext}`);
    const tmp = fs.mkdtempSync(path.join(job.scratch, 'check-'));
    const out = path.join(tmp, 'verdict.json');
    fs.writeFileSync(mutant, m.source);
    const args = [checkMjs, '--parent', job.file, '--candidate', mutant, '--unit', job.unit, '--n', String(job.n), '--dafny-seconds', String(job.dafnySeconds), ...(project ? (project === true ? [] : ['--project', project]) : ['--no-project']), '--out', out];
    const t0 = performance.now();
    const r = await spawnCollect(process.execPath, args, { cwd: ts, env: { ...process.env, TMPDIR: tmp }, dir: tmp, maxBuffer: 1 << 26, wallCapMs: checkWallCapMs(args.slice(1)) });
    const seconds = (performance.now() - t0) / 1000;
    let res = null; try { res = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { res = null; }
    fs.rmSync(mutant, { force: true }); fs.rmSync(tmp, { recursive: true, force: true });
    if (!res) { rows.push({ ...row, verdict: 'ASK:harness', laneB: null, laneA: null, detail: r.error?.code === 'ETIMEDOUT' ? 'check.mjs wall cap exceeded' : `check.mjs wrote no verdict (exit ${r.status})` }); times.push({ ...job.key, index: k, kind: s.kind, seconds }); continue; }
    const c = res.certificate ?? {};
    const found = foundBy(res);
    rows.push({ ...row, verdict: res.verdict, laneB: c.lanes?.B?.verdict ?? null, laneA: c.lanes?.A?.verdict ?? null, ...(found ? { foundLane: found.lane, foundBy: found.source } : {}) });
    times.push({ ...job.key, index: k, kind: s.kind, verdict: res.verdict, seconds: Math.round(seconds * 100) / 100, timing: c.timing ?? null });
  }
  return { rows, times };
}

// ---- the units ----
const pairFile = (d, side) => (fs.existsSync(path.join(d, side + '.tsx')) ? path.join(d, side + '.tsx') : path.join(d, side + '.ts'));
function pairUnits(pairsDir, only, work) {
  const { loadProgram, topLevelFunctions } = globalThis.__lean;
  const jobs = [];
  for (const p of fs.readdirSync(pairsDir).sort()) {
    if (only && !only.has(p)) continue;
    const d = path.join(pairsDir, p);
    if (!fs.existsSync(path.join(d, 'expect.json')) || !fs.existsSync(pairFile(d, 'candidate'))) continue;
    const exp = JSON.parse(fs.readFileSync(path.join(d, 'expect.json'), 'utf8'));
    const copy = path.join(work, 'pairs', p);
    fs.rmSync(copy, { recursive: true, force: true }); fs.mkdirSync(path.dirname(copy), { recursive: true });
    fs.cpSync(d, copy, { recursive: true });
    const file = pairFile(copy, 'candidate');
    // a unit inside another unit (a callback, `f/xs.map()#0`) is covered by it (check.mjs covered-by), and its sites are
    // the enclosing unit's sites too (mutate.mjs walks into nested functions): only the units no other unit encloses
    let names = [];
    try { names = [...topLevelFunctions(loadProgram(file, { project: false }).sf).values()].filter((u) => !u.enclosingUnit).map((u) => u.name); } catch (e) { jobs.push({ key: { source: 'pairs', where: p, unit: null }, error: String(e.message).slice(0, 120) }); continue; }
    for (const u of names) jobs.push({ key: { source: 'pairs', where: p, unit: u }, file, unit: u, project: exp.project ? path.join(copy, exp.project) : false });
  }
  return jobs;
}
// the census frame: the written units a census run entered (no finding stopped it, census.mjs `stop`: a finding that
// is not an environment note, or an unresolved type, names it), every unit of every root in one list, ordered by the
// hash of the seed and its key; the first --sample are the sample
function censusUnits(files, sample, seed) {
  const frame = [];
  for (const f of files) {
    const res = JSON.parse(fs.readFileSync(f, 'utf8'));
    const root = res.root, name = path.basename(root);
    for (const r of res.records ?? []) {
      if (!r.units || r.stratum !== 'written') continue;
      const stopped = new Set([...(r.findings ?? []).filter((x) => x.unit && !x.env).map((x) => x.unit), ...(r.unresolvedTypes ?? []).map((x) => x.unit)]);
      // a unit inside another unit's lines (a callback) is covered by that unit (census.mjs `covered-by`, check.mjs): not a unit of its own
      const inside = (u) => r.units.some((y) => y !== u && y.lines[0] <= u.lines[0] && u.lines[1] <= y.lines[1] && (y.lines[0] < u.lines[0] || u.lines[1] < y.lines[1]));
      for (const u of r.units) if (!stopped.has(u.name) && !inside(u)) frame.push({ root, name, file: r.file, unit: u.name });
    }
  }
  const order = frame.map((x) => ({ x, h: sha(`${seed}\0${x.name}\0${x.file}\0${x.unit}`) })).sort((p, q) => (p.h < q.h ? -1 : p.h > q.h ? 1 : 0));
  return { frame: frame.length, picked: order.slice(0, sample).map(({ x }) => x) };
}

// ---- the report ----
const pct = (x, n) => (n ? `${Math.round((1000 * x) / n) / 10}%` : 'n/a');
export function table(rows, title) {
  const by = new Map(KINDS.map((k) => [k, { planted: 0, caught: 0, 'PASS-bounded': 0, 'PASS-decided': 0, 'PASS-proved': 0, ask: 0, other: 0, notPlanted: 0 }]));
  for (const r of rows) {
    if (!r.kind) continue;
    if (!by.has(r.kind)) by.set(r.kind, { planted: 0, caught: 0, 'PASS-bounded': 0, 'PASS-decided': 0, 'PASS-proved': 0, ask: 0, other: 0, notPlanted: 0 });
    const t = by.get(r.kind), o = outcomeOf(r.verdict);
    if (o === 'not-planted') { t.notPlanted++; continue; }
    t.planted++;
    if (o === 'caught') t.caught++; else if (o === 'escaped') t[r.verdict]++; else if (o === 'ask') t.ask++; else t.other++;
  }
  const sum = { planted: 0, caught: 0, 'PASS-bounded': 0, 'PASS-decided': 0, 'PASS-proved': 0, ask: 0, other: 0, notPlanted: 0 };
  for (const t of by.values()) for (const k of Object.keys(sum)) sum[k] += t[k];
  const line = (k, t) => { const esc = t['PASS-bounded'] + t['PASS-decided'] + t['PASS-proved']; return `| ${k} | ${t.planted} | ${t.caught} | ${t['PASS-bounded']} | ${t['PASS-decided']} | ${t['PASS-proved']} | ${t.ask} | ${t.other} | ${pct(t.caught, t.planted)} | ${pct(esc, t.planted)} | ${pct(t.ask, t.planted)} | ${t.notPlanted} |`; };
  return [`### ${title}`, '', '| kind | planted | caught (WITNESS) | PASS-bounded | PASS-decided | PASS-proved | ASK | other | caught | escaped | ASK share | not planted |', '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |', ...[...by].map(([k, t]) => line(k, t)), line('**all**', sum), ''];
}
const tally = (rows, key) => { const m = new Map(); for (const r of rows) { const k = key(r); if (k !== null) m.set(k, (m.get(k) ?? 0) + 1); } return [...m].sort((p, q) => q[1] - p[1] || (p[0] < q[0] ? -1 : 1)); };
export function report(study) {
  const { rows, meta } = study;
  const groups = [['pairs', rows.filter((r) => r.source === 'pairs')], ['census sample', rows.filter((r) => r.source !== 'pairs')]].filter(([, g]) => g.length);
  const caught = rows.filter((r) => r.verdict === 'WITNESS');
  const asks = rows.filter((r) => outcomeOf(r.verdict) === 'ask');
  return [
    `# The mutant study (tests/mutants.mjs)`, '',
    `lean head ${meta.head}; options: check.mjs --n ${meta.n} --dafny-seconds ${meta.dafnySeconds}, each pair's project or --no-project (the suite's options); seed ${meta.seed}.`,
    `Units: ${meta.units.pairs} pair units (${meta.pairs} pairs)${meta.census ? `; census sample ${meta.census.picked} of ${meta.census.frame} written entered units from ${meta.census.roots.join(', ')}` : ''}. Units without a site: ${meta.unitsWithoutSites}; units mutate.mjs could not find: ${meta.noUnit}.`,
    `The seconds per mutant and the 20 slowest: the timing file (not part of this report, so two runs compare byte for byte).`, '',
    ...groups.flatMap(([name, g]) => table(g, name)),
    ...(groups.length > 1 ? table(rows, 'all') : []),
    '### Who found the input (caught mutants)', '', '| lane | source | mutants |', '| --- | --- | ---: |',
    ...tally(caught, (r) => `${r.foundLane}\u0000${r.foundBy}`).map(([k, n]) => { const [l, s] = k.split('\u0000'); return `| ${l} | ${s} | ${n} |`; }), '',
    '### The ASKs by lane B and lane A verdict', '', '| verdict | lane B | lane A | mutants |', '| --- | --- | --- | ---: |',
    ...tally(asks, (r) => `${r.verdict}\u0000${r.laneB}\u0000${r.laneA}`).map(([k, n]) => { const [v, b, aa] = k.split('\u0000'); return `| ${v} | ${b} | ${aa} | ${n} |`; }), '',
    '### The escapes by lane A verdict', '', '| verdict | lane A | mutants |', '| --- | --- | ---: |',
    ...tally(rows.filter((r) => outcomeOf(r.verdict) === 'escaped'), (r) => `${r.verdict}\u0000${r.laneA}`).map(([k, n]) => { const [v, aa] = k.split('\u0000'); return `| ${v} | ${aa} | ${n} |`; }), '',
  ].join('\n');
}
export function slowest(times, k = 20) { return [...times].sort((p, q) => q.seconds - p.seconds).slice(0, k); }

// ---- the run ----
async function pool(items, width, go) { let next = 0; const workers = Array.from({ length: Math.min(width, items.length) }, async () => { while (next < items.length) { const i = next++; await go(items[i], i); } }); await Promise.all(workers); }

async function main() {
  const common = await import('../common.mjs');
  globalThis.__lean = common;
  const work = path.resolve(opt('--work', fs.mkdtempSync(path.join(os.tmpdir(), 'lean-mutants-'))));
  fs.mkdirSync(work, { recursive: true });
  const jobsN = Math.min(4, Number(opt('--jobs', 4)));
  const seed = Number(opt('--seed', 1)), n = Number(opt('--n', 30)), dafnySeconds = Number(opt('--dafny-seconds', 30));
  const only = opt('--pair', null) ? new Set(opt('--pair').split(',')) : null;
  const units = a.includes('--no-pairs') ? [] : pairUnits(path.resolve(opt('--pairs', path.join(here, 'pairs'))), only, work);
  let census = null;
  const censusFiles = opts('--census');
  if (censusFiles.length) {
    const c = censusUnits(censusFiles.map((f) => path.resolve(f)), Number(opt('--sample', 300)), seed);
    census = { frame: c.frame, picked: c.picked.length, roots: [...new Set(censusFiles.map((f) => path.basename(JSON.parse(fs.readFileSync(f, 'utf8')).root)))].sort() };
    for (const x of c.picked) {
      const file = path.join(x.root, x.file);
      // a nested unit's mutation is the enclosing unit's (check.mjs answers it as covered-by); mutate.mjs lists top-level units only
      units.push({ key: { source: `census:${x.name}`, where: x.file, unit: x.unit }, file, unit: x.unit, project: true });
    }
  }
  const scratch = path.join(work, 'scratch'); fs.mkdirSync(scratch, { recursive: true });
  const results = new Array(units.length);
  let done = 0; const t0 = Date.now();
  await pool(units, jobsN, async (job, i) => {
    if (job.error) { results[i] = { rows: [{ ...job.key, index: null, kind: null, verdict: 'no-unit', detail: job.error }], times: [] }; return; }
    const spec = path.join(scratch, `job-${i}.json`), out = path.join(scratch, `job-${i}.out.json`);
    fs.writeFileSync(spec, JSON.stringify({ ...job, id: i, n, dafnySeconds, scratch, withoutKind: opt('--without-kind', null) }));
    const r = await spawnCollect(process.execPath, [fileURLToPath(import.meta.url), '--job', spec, '--job-out', out], { cwd: ts, dir: scratch, maxBuffer: 1 << 26 });
    try { results[i] = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { results[i] = { rows: [{ ...job.key, index: null, kind: null, verdict: 'job-failed', detail: `exit ${r.status}: ${r.stderr.trim().split('\n').slice(-1)[0] ?? ''}`.slice(0, 200) }], times: [] }; process.stderr.write(r.stderr); }
    fs.rmSync(spec, { force: true }); fs.rmSync(out, { force: true });
    done++; if (done % 25 === 0 || done === units.length) console.error(`${done}/${units.length} units, ${Math.round((Date.now() - t0) / 1000)} s`);
  });
  const cmp = (p, q) => (p < q ? -1 : p > q ? 1 : 0);
  const rows = results.flatMap((r) => r.rows).sort((p, q) => cmp(p.source, q.source) || cmp(p.where, q.where) || cmp(String(p.unit), String(q.unit)) || (p.index ?? -1) - (q.index ?? -1));
  const times = results.flatMap((r) => r.times);
  const head = spawnSync('git', ['-C', ts, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
  const meta = { head, seed, n, dafnySeconds, pairs: new Set(units.filter((u) => u.key.source === 'pairs').map((u) => u.key.where)).size, units: { pairs: units.filter((u) => u.key.source === 'pairs').length, census: units.filter((u) => u.key.source !== 'pairs').length }, census, unitsWithoutSites: results.filter((r) => r.rows.length === 0).length, noUnit: rows.filter((r) => r.verdict === 'no-unit').length, ...(opt('--without-kind', null) ? { withoutKind: opt('--without-kind') } : {}) };
  // a unit with no site has no row; it is counted in meta, and listed so the denominators can be read
  const study = { meta, rows };
  const outFile = opt('--out', null);
  if (outFile) fs.writeFileSync(outFile, JSON.stringify(study, null, 1) + '\n');
  const md = report(study);
  if (opt('--report', null)) fs.writeFileSync(opt('--report'), md + '\n');
  if (opt('--timing', null)) {
    const total = times.reduce((s, t) => s + t.seconds, 0);
    fs.writeFileSync(opt('--timing'), JSON.stringify({ head, wallSeconds: Math.round((Date.now() - t0) / 1000), mutants: times.length, meanSeconds: times.length ? Math.round((100 * total) / times.length) / 100 : null, slowest: slowest(times), all: times }, null, 1) + '\n');
  }
  if (!outFile && !opt('--report', null)) console.log(md);
  if (!a.includes('--keep-work') && !opt('--work', null)) fs.rmSync(work, { recursive: true, force: true });
  else fs.rmSync(scratch, { recursive: true, force: true });
  console.error(`${rows.filter((r) => outcomeOf(r.verdict) !== 'not-planted' && r.kind).length} mutants planted; ${rows.filter((r) => r.verdict === 'WITNESS').length} caught; ${Math.round((Date.now() - t0) / 1000)} s`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (opt('--job', null)) {
    const job = JSON.parse(fs.readFileSync(opt('--job'), 'utf8'));
    const res = await unitJob(job);
    fs.writeFileSync(opt('--job-out'), JSON.stringify(res));
  } else await main();
}
