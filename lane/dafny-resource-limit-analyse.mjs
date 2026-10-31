// the resource counts of every `dafny verify` the measurement wrapper logged: one CSV per call, one row per
// verification condition (assertion batch). Usage: node analyse.mjs <rlog dir>
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
const index = new Map(fs.readFileSync(path.join(dir, 'index.tsv'), 'utf8').trim().split('\n').map((l) => { const [id, cwd, args] = l.split('\t'); return [id, { cwd, args }]; }));
const rows = [];
let calls = 0, missing = 0;
for (const [id, { args }] of index) {
  const f = path.join(dir, `${id}.csv`);
  if (!fs.existsSync(f)) { missing++; continue; }
  calls++;
  const file = args.split(' ').pop();
  for (const line of fs.readFileSync(f, 'utf8').trim().split('\n').slice(1)) {
    const m = line.match(/^(.*),([A-Za-z]+),(\d\d):(\d\d):([\d.]+),(\d+),(\d+)$/);
    if (!m) { console.error('unread row', f, line); continue; }
    rows.push({ name: m[1], outcome: m[2], seconds: Number(m[3]) * 3600 + Number(m[4]) * 60 + Number(m[5]), rc: Number(m[6]), file, args });
  }
}
// the maximum per condition: a condition is its name in its file (the same theorem run twice is one condition)
const byVc = new Map();
for (const r of rows) { const k = `${r.file}\0${r.name}`; const o = byVc.get(k); if (!o || r.rc > o.rc) byVc.set(k, r); }
const vcs = [...byVc.values()].sort((a, b) => a.rc - b.rc);
const q = (p) => vcs[Math.min(vcs.length - 1, Math.floor(p * vcs.length))].rc;
const outcomes = {}; for (const r of rows) outcomes[r.outcome] = (outcomes[r.outcome] ?? 0) + 1;
console.log(`calls ${calls} (index ${index.size}, no CSV ${missing}); rows ${rows.length}; conditions ${vcs.length}; outcomes ${JSON.stringify(outcomes)}`);
console.log(`max ${vcs.at(-1).rc}  p99 ${q(0.99)}  p90 ${q(0.9)}  median ${q(0.5)}`);
console.log('ten largest (resource count, seconds at that run, outcome, condition, file):');
for (const r of vcs.slice(-10).reverse()) console.log(`  ${r.rc}\t${r.seconds.toFixed(1)} s\t${r.outcome}\t${r.name}\t${r.file}`);
// the slowest rate among the large conditions: resources per wall second under the run's load
const big = rows.filter((r) => r.rc >= 1e6 && r.seconds > 0).map((r) => ({ ...r, rate: r.rc / r.seconds })).sort((a, b) => a.rate - b.rate);
if (big.length) console.log(`rate over ${big.length} rows >= 1e6 resources: slowest ${Math.round(big[0].rate)}/s (${big[0].name}, ${big[0].seconds.toFixed(1)} s), median ${Math.round(big[Math.floor(big.length / 2)].rate)}/s, fastest ${Math.round(big.at(-1).rate)}/s`);
const notPassed = rows.filter((r) => r.outcome !== 'Passed');
for (const r of notPassed.slice(0, 20)) console.log(`  not passed: ${r.outcome}\t${r.rc}\t${r.seconds.toFixed(1)} s\t${r.name}\t${r.file}`);
// the proved conditions alone: the limit must hold every one of them
const passed = [...byVc.values()].filter((r) => r.outcome === 'Passed').sort((a, b) => a.rc - b.rc);
const pq = (p) => passed[Math.min(passed.length - 1, Math.floor(p * passed.length))].rc;
console.log(`\nproved conditions ${passed.length}: max ${passed.at(-1).rc}  p99 ${pq(0.99)}  p90 ${pq(0.9)}  median ${pq(0.5)}`);
for (const r of passed.slice(-10).reverse()) console.log(`  ${r.rc}\t${r.seconds.toFixed(1)} s\t${r.name}\t${r.file.replace(/^\/tmp\/lean-ts-\w+\//, '')}`);
const failed = [...byVc.values()].filter((r) => r.outcome !== 'Passed').sort((a, b) => b.rc - a.rc);
console.log(`\nnot proved conditions ${failed.length}; the ten largest:`);
for (const r of failed.slice(0, 10)) console.log(`  ${r.rc}\t${r.seconds.toFixed(1)} s\t${r.name}\t${r.file.replace(/^\/tmp\/lean-ts-\w+\//, '')}\t${r.args.match(/--verification-time-limit (\d+)/)?.[1] ?? '30'}`);
