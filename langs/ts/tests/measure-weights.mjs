#!/usr/bin/env node
// Measures the suite's job weights: the cores each job's children keep busy. It runs the suite (run.mjs, with the
// environment it is given: LEAN_PAIRS, JOBS, LEAN_STEP_CACHE_DIR...) with LEAN_SUITE_TRACE set, so the pool writes the
// pid and job key of every child it starts, and reads `ps` four times a second: a job's busy cores at one reading are
// the %CPU of its child and of every live process under it, over 100 (a CPU-time difference between readings would
// miss the short processes a job starts and ends in between: a translate, a Dafny run). A job's weight is the 90th
// percentile of its readings (cores, to a hundredth); a group's (the items of one fan-out: `pairs`, `escapes`) is the same
// over all its jobs' readings, for the jobs a small run does not hold. A job seen in fewer than two readings gets no
// weight of its own.
//   node measure-weights.mjs <weights.json>    (the suite's own output goes to <weights.json>.suite.log)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2];
if (!out) { console.error('usage: measure-weights.mjs <weights.json>'); process.exit(2); }
const trace = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lean-weights-')), 'trace.txt');
fs.writeFileSync(trace, '');
const log = fs.openSync(`${out}.suite.log`, 'w');
const suite = spawn(process.execPath, [path.join(here, 'run.mjs')], { stdio: ['ignore', log, log], env: { ...process.env, LEAN_SUITE_TRACE: trace } });
let running = true; suite.on('close', () => { running = false; });

const readings = new Map(); // job key -> busy cores at each reading
while (running) {
  await new Promise((r) => setTimeout(r, 250));
  const ps = spawnSync('ps', ['-Ao', 'pid=,ppid=,pcpu='], { encoding: 'utf8' });
  if (ps.status !== 0) { console.error(`ps exit ${ps.status}: ${ps.stderr}`); continue; }
  const pcpu = new Map(), kids = new Map();
  for (const line of ps.stdout.split('\n')) {
    const m = line.trim().match(/^(\d+)\s+(\d+)\s+([\d.,]+)$/); if (!m) continue;
    const [pid, ppid] = [Number(m[1]), Number(m[2])];
    pcpu.set(pid, Number(m[3].replace(',', '.')));
    if (!kids.has(ppid)) kids.set(ppid, []); kids.get(ppid).push(pid);
  }
  for (const l of fs.readFileSync(trace, 'utf8').split('\n')) {
    const i = l.indexOf(' '); if (i <= 0) continue;
    const pid = Number(l.slice(0, i)), key = l.slice(i + 1);
    if (!pcpu.has(pid)) continue;
    let busy = 0; const stack = [pid];
    while (stack.length) { const p = stack.pop(); busy += pcpu.get(p) ?? 0; for (const k of kids.get(p) ?? []) stack.push(k); }
    if (!readings.has(key)) readings.set(key, []); readings.get(key).push(busy / 100);
  }
}
const p90 = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(0.9 * s.length))]; };
const keys = {}, groups = {}, byGroup = new Map(), report = [];
for (const [key, xs] of readings) {
  if (xs.length < 2) continue;
  const w = p90(xs);
  keys[key] = Math.round(w * 100) / 100;
  report.push([key, xs.length, w]);
  const g = key.slice(0, key.indexOf('/'));
  if (!byGroup.has(g)) byGroup.set(g, []); byGroup.get(g).push(...xs);
}
for (const [g, xs] of byGroup) groups[g] = Math.round(p90(xs) * 100) / 100;
fs.writeFileSync(out, JSON.stringify({ measured: new Date().toISOString(), cpus: os.cpus().length, lean_pairs: process.env.LEAN_PAIRS ?? null, keys, groups }, null, 1) + '\n');
for (const [key, n, w] of report.sort((a, b) => b[2] - a[2])) console.log(`${w.toFixed(2).padStart(6)} cores (p90 of ${n} readings)  ${key}`);
console.log(`groups: ${JSON.stringify(groups)}`);
console.log(`weights: ${out}`);
