// w8d: lane A alone (lanea.mjs) at base and head on the census units each measure picked: the entered units holding an
// opaque site (<root>-proved.jsonl) and the entered async units with an await inside an if (<root>-awaitif.jsonl).
//   node measure-a.mjs <root>... [--jobs 4]   writes census/<root>-lanea.jsonl, prints the counts per set and side
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
const W = '/root/da-bench/w8d-translator-gaps';
const TREES = { base: `${W}/base/langs/ts`, head: '/root/lanes/w8d-translator-gaps/tree/langs/ts' };
const args = process.argv.slice(2), ji = args.indexOf('--jobs');
const jobs = Math.min(4, ji >= 0 ? Number(args[ji + 1]) : 4), roots = args.filter((a, i) => !a.startsWith('--') && i !== ji + 1);
const loadOk = () => Number(fs.readFileSync('/proc/loadavg', 'utf8').split(' ')[0]) <= 64;
const waitLoad = async () => { while (!loadOk()) await new Promise((r) => setTimeout(r, 15000)); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'w8d-lanea-'));
const units = (f) => { const seen = new Map(); for (const l of fs.readFileSync(f, 'utf8').split('\n')) { if (!l) continue; const x = JSON.parse(l); seen.set(`${x.file}\u0000${x.unit}`, { file: x.file, unit: x.unit, rules: x.rules ?? [] }); } return [...seen.values()]; };
const total = {};
for (const root of roots) {
  const rootDir = JSON.parse(fs.readFileSync(`${W}/census/${root}-head.json`, 'utf8')).root;
  const sets = { sites: units(`${W}/census/${root}-proved.jsonl`), awaitif: units(`${W}/census/${root}-awaitif.jsonl`) };
  const outFile = `${W}/census/${root}-lanea.jsonl`; fs.writeFileSync(outFile, '');
  const queue = []; let k = 0;
  for (const [set, us] of Object.entries(sets)) for (const u of us) for (const side of ['base', 'head']) queue.push({ set, side, ...u, i: k++ });
  const rows = []; let next = 0;
  await Promise.all(Array.from({ length: jobs }, async () => { while (next < queue.length) { const q = queue[next++]; await waitLoad(); rows.push(await new Promise((resolve) => {
    const f = path.join(rootDir, q.file);
    const c = spawn('node', [path.join(W, 'census/lanea.mjs'), TREES[q.side], f, f, q.unit, path.join(tmp, `${root}-${q.i}`)], { stdio: ['ignore', 'pipe', 'pipe'] });
    let o = '', e = ''; c.stdout.on('data', (d) => { o += d; }); c.stderr.on('data', (d) => { e += d; });
    c.on('close', (code) => { let r = null; try { r = JSON.parse(o.trim().split('\n').pop()); } catch { r = { verdict: `none(${code})`, error: e.trim().split('\n').slice(-2).join(' | ').slice(0, 200) }; } const row = { root, set: q.set, side: q.side, file: q.file, unit: q.unit, rules: q.rules, ...r, code }; fs.appendFileSync(outFile, JSON.stringify(row) + '\n'); resolve(row); });
  })); } }));
  for (const set of Object.keys(sets)) for (const side of ['base', 'head']) {
    const rs = rows.filter((r) => r.set === set && r.side === side), p = rs.filter((r) => r.verdict === 'PASS-proved').length;
    const t = (total[`${set} ${side}`] ??= [0, 0]); t[0] += p; t[1] += rs.length;
    console.log(`${root} ${set} ${side}: PASS-proved ${p} of ${rs.length} ${JSON.stringify(rs.reduce((m, r) => { m[r.verdict] = (m[r.verdict] ?? 0) + 1; return m; }, {}))}`);
  }
  const key = (r) => `${r.set}\u0000${r.file}\u0000${r.unit}`, P = (s) => new Set(rows.filter((r) => r.side === s && r.verdict === 'PASS-proved').map(key));
  const pb = P('base'), ph = P('head');
  for (const r of rows) if (r.side === 'head' && ph.has(key(r)) && !pb.has(key(r))) console.log(`  gained (${r.set}): ${r.file} ${JSON.stringify(r.unit)}; base: ${rows.find((x) => x.side === 'base' && key(x) === key(r))?.verdict} ${rows.find((x) => x.side === 'base' && key(x) === key(r))?.error ?? ''}`);
  for (const r of rows) if (r.side === 'base' && pb.has(key(r)) && !ph.has(key(r))) console.log(`  LOST (${r.set}): ${r.file} ${JSON.stringify(r.unit)}; head: ${rows.find((x) => x.side === 'head' && key(x) === key(r))?.verdict}`);
}
for (const [k, [p, n]] of Object.entries(total)) console.log(`sum ${k}: PASS-proved ${p} of ${n}`);
fs.rmSync(tmp, { recursive: true, force: true });
