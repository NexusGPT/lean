#!/usr/bin/env node
// The measurement of lane w3a-counterexample (design/w3a-counterexample.md): check.mjs on a list of pair units, each a
// child under its wall cap, at most --jobs at once (4 at most), and one row per unit: the verdict, lane A's and lane B's,
// the seconds the child took, the counterexample record (lanes.A.counterexample) when lane A made one.
//
//   node solve/cex-measure.mjs --population [--jobs 4] --out rows.json        the units lane B passes bounded whose
//                                                                             lemma expect.json says is not proved
//   node solve/cex-measure.mjs --pairs a,b,c [--jobs 4] --out rows.json       every unit of `b` and `check` in those pairs
//
// The population is read from the pairs' expect.json alone (`b[unit] === 'PASS-bounded'` and `equal[f] === false`), never
// from a run, so the same list is measured before and after the change.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnCollect } from '../exec/capped.mjs';
import { dafnyName, checkWallCapMs } from '../check.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const pairsDir = path.join(here, '../tests/pairs');
const a = process.argv.slice(2);
const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
const jobs = Math.min(4, Math.max(1, Number(opt('--jobs', 4)) || 1));
const pairFile = (d, side) => (fs.existsSync(path.join(d, `${side}.tsx`)) ? path.join(d, `${side}.tsx`) : path.join(d, `${side}.ts`));
const expectOf = (p) => { try { return JSON.parse(fs.readFileSync(path.join(pairsDir, p, 'expect.json'), 'utf8')); } catch { return null; } };

export function population() {
  const out = [];
  for (const p of fs.readdirSync(pairsDir).sort()) {
    const e = expectOf(p); if (!e?.equal || !e.b) continue;
    for (const [u, v] of Object.entries(e.b)) if (v === 'PASS-bounded' && e.equal[dafnyName(u)] === false) out.push({ pair: p, unit: u });
  }
  return out;
}
const unitsOf = (p) => { const e = expectOf(p) ?? {}; return [...new Set([...Object.keys(e.b ?? {}), ...Object.keys(e.check ?? {})])].map((u) => ({ pair: p, unit: u })); };

const list = a.includes('--population') ? population() : (opt('--pairs', '') || '').split(',').filter(Boolean).flatMap(unitsOf);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-cex-measure-'));
const rows = new Array(list.length);
let next = 0;
async function worker() {
  while (next < list.length) {
    const i = next++, { pair, unit } = list[i], d = path.join(pairsDir, pair), e = expectOf(pair) ?? {};
    const out = path.join(tmp, `${i}.json`);
    const args = ['--parent', pairFile(d, 'parent'), '--candidate', pairFile(d, 'candidate'), '--unit', unit, '--n', '30', ...(e.project ? ['--project', path.join(d, e.project)] : ['--no-project']), '--dafny-seconds', '30', '--out', out];
    const t0 = performance.now();
    const r = await spawnCollect(process.execPath, [path.join(here, '../check.mjs'), ...args], { dir: tmp, maxBuffer: 1 << 26, wallCapMs: checkWallCapMs(args), env: process.env });
    const seconds = (performance.now() - t0) / 1000;
    let got = null; try { got = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { /* the row says no result */ }
    const A = got?.certificate?.lanes?.A ?? {};
    rows[i] = { pair, unit, verdict: got?.verdict ?? null, laneA: A.verdict ?? null, laneB: got?.certificate?.lanes?.B?.verdict ?? null, seconds: Number(seconds.toFixed(2)), timing: got?.certificate?.timing ?? null, ...(A.counterexample ? { counterexample: A.counterexample } : {}), ...(got?.witness?.source ? { source: got.witness.source, input: got.witness.args } : {}), ...(got?.unconfirmed ? { unconfirmed: got.unconfirmed } : {}), ...(got ? {} : { error: (r.stderr || r.stdout).trim().split('\n').slice(-2).join(' | ').slice(0, 300) }) };
    process.stderr.write(`${i + 1}/${list.length} ${pair}:${unit} ${rows[i].verdict} (${rows[i].laneA}) ${rows[i].seconds} s\n`);
  }
}
await Promise.all(Array.from({ length: jobs }, worker));
fs.rmSync(tmp, { recursive: true, force: true });
const by = (k) => rows.reduce((m, r) => { m[r[k]] = (m[r[k]] ?? 0) + 1; return m; }, {});
const secs = rows.map((r) => r.seconds);
const summary = { units: rows.length, verdicts: by('verdict'), laneA: by('laneA'), totalSeconds: Number(secs.reduce((x, y) => x + y, 0).toFixed(1)), meanSeconds: Number((secs.reduce((x, y) => x + y, 0) / Math.max(1, secs.length)).toFixed(2)), jobs };
const text = JSON.stringify({ summary, rows }, null, 1);
if (opt('--out', null)) fs.writeFileSync(opt('--out'), text);
console.log(JSON.stringify(summary));
