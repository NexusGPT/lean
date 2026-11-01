// w8d measurement: the units of a census root that hold an opaque site, each checked as a self-pair (parent = candidate =
// the file) at base and at head with check.mjs; counts the PASS-proved ones.
//   node proved.mjs <root> [--jobs 4]
// Units: entered (the lowering's refusal null) at base or at head, holding an opaque step (the census record's opaque[unit].steps) or an
// opaque finding (f.opaque) at either. Writes census/<root>-proved.jsonl (one row per unit and side) and prints the counts.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
const W = '/root/da-bench/w8d-translator-gaps';
const TREES = { base: `${W}/base/langs/ts`, head: '/root/lanes/w8d-translator-gaps/tree/langs/ts' };
const root = process.argv[2];
const jobs = Math.min(4, Number(process.argv[process.argv.indexOf('--jobs') + 1]) || 4);
const read = (side) => { const j = JSON.parse(fs.readFileSync(`${W}/census/${root}-${side}.json`, 'utf8')); const out = []; if (j.recordsFile && fs.existsSync(j.recordsFile)) for (const l of fs.readFileSync(j.recordsFile, 'utf8').split('\n')) { if (!l.trim()) continue; const r = JSON.parse(l); if (r.kind === 'chunk') out.push(...(r.records ?? [])); } return { j, recs: out.length ? out : (j.records ?? []) }; };
const sides = { base: read('base'), head: read('head') };
const units = new Map(); // `${file}\u0000${unit}` -> { file, unit, sites: { base, head }, entered: { base, head } }
for (const [side, { recs }] of Object.entries(sides)) for (const r of recs) for (const u of r.lowering ?? []) {
  const k = `${r.file}\u0000${u.unit}`;
  const opaqueFindings = (r.findings ?? []).filter((f) => f.unit === u.unit && f.opaque);
  const steps = r.opaque?.[u.unit]?.steps?.length ?? 0; // census.mjs: the steps the lowering's translation emitted, per unit
  const e = units.get(k) ?? { file: r.file, unit: u.unit, sites: {}, entered: {}, rules: new Set() };
  e.entered[side] = !u.refusal; e.sites[side] = steps + opaqueFindings.length;
  for (const f of opaqueFindings) e.rules.add(f.rule);
  for (const x of r.opaque?.[u.unit]?.steps ?? []) e.rules.add(x.rule);
  units.set(k, e);
}
const picked = [...units.values()].filter((e) => (e.entered.base || e.entered.head) && (e.sites.base || e.sites.head));
console.log(`${root}: ${picked.length} entered units holding an opaque site (base or head)`);
const rootDir = sides.head.j.root;
const outFile = `${W}/census/${root}-proved.jsonl`;
fs.writeFileSync(outFile, '');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `w8d-proved-${root}-`));
const loadOk = () => Number(fs.readFileSync('/proc/loadavg', 'utf8').split(' ')[0]) <= 64;
const waitLoad = async () => { while (!loadOk()) await new Promise((r) => setTimeout(r, 15000)); };
const run = (side, e, i) => new Promise((resolve) => {
  const out = path.join(tmp, `${side}-${i}.json`);
  const args = [`${TREES[side]}/check.mjs`, '--parent', path.join(rootDir, e.file), '--candidate', path.join(rootDir, e.file), '--unit', e.unit, '--n', '30', '--out', out];
  const t0 = Date.now();
  const c = spawn('node', args, { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, LEAN_WORKER_HEAP_MB: '6144' } });
  let err = ''; c.stderr.on('data', (d) => { err += d; }); c.stdout.on('data', () => {});
  c.on('close', (code, signal) => {
    let v = null; try { v = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { v = null; }
    const A = v?.certificate?.lanes?.A;
    const row = { side, file: e.file, unit: e.unit, rules: [...e.rules], entered: e.entered[side] ?? null, sites: e.sites[side] ?? 0, code, signal, verdict: v?.verdict ?? null, kind: v?.kind ?? null, laneA: A ? { verdict: A.verdict ?? null, detail: String(A.detail ?? A.reason ?? '').slice(0, 300), numbers: A.doubles ? { verdict: A.doubles.verdict ?? null, faithful: A.faithful ?? A.doubles.faithful ?? null } : null } : null, reason: v?.reason ?? (v ? null : err.trim().split('\n').slice(-2).join(' | ').slice(0, 300)), seconds: Math.round((Date.now() - t0) / 1000) };
    fs.appendFileSync(outFile, JSON.stringify(row) + '\n');
    resolve(row);
  });
});
const queue = picked.flatMap((e, i) => ['base', 'head'].map((side) => [side, e, i]));
const rows = [];
let next = 0;
await Promise.all(Array.from({ length: jobs }, async () => { while (next < queue.length) { const q = queue[next++]; await waitLoad(); rows.push(await run(...q)); } }));
const proved = (side) => rows.filter((r) => r.side === side && r.verdict === 'PASS-proved');
for (const side of ['base', 'head']) console.log(`${root} ${side}: PASS-proved ${proved(side).length} of ${picked.length} (verdicts: ${JSON.stringify(rows.filter((r) => r.side === side).reduce((m, r) => { const k = r.verdict ?? `none(${r.code})`; m[k] = (m[k] ?? 0) + 1; return m; }, {}))})`);
const key = (r) => `${r.file}\u0000${r.unit}`;
const pb = new Set(proved('base').map(key)), ph = new Set(proved('head').map(key));
for (const r of proved('head')) if (!pb.has(key(r))) console.log(`  gained: ${r.file} ${JSON.stringify(r.unit)} [${r.rules.join(',')}]`);
for (const r of proved('base')) if (!ph.has(key(r))) console.log(`  LOST: ${r.file} ${JSON.stringify(r.unit)} [${r.rules.join(',')}]`);
fs.rmSync(tmp, { recursive: true, force: true });
