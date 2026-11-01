#!/usr/bin/env node
// The web fakes' measurement on real code (design/w2c-web-fakes.md, the measurement): lane B on the units of a
// repository that reach the web platform, with the behavioural fakes and with the recording proxy (LEAN_FAKES=recording).
//   node exec/fakes/web/measure.mjs --root <copy of a repository> --name <label> [--units N] [--sites K] [--jobs J] --out <json>
//   node exec/fakes/web/measure.mjs --root <repository> --units Infinity --count    the selection only (read-only: no file written)
// The root must be a scratch copy: each planted change is written beside its file (as `<file>.lean-mut<k>.ts`) so its
// relative imports resolve, and removed after its runs. A unit is selected when its own text names a web global the
// fakes answer (WEB below), in sorted (file, unit) order, the first N. Per unit: a self-pair (the file against itself:
// any WITNESS is a false difference, a determinism or fake defect) and up to K planted changes (exec/mutate.mjs, sites
// 0, 1, ... in source order: one behaviour-changing edit each), each run in both modes. A planted change is detected
// when its verdict is WITNESS. Nothing here reads a verdict to choose a unit, a site or a seed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadProgram, topLevelFunctions } from '../../../common.mjs';
import { mutate } from '../../mutate.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const runMjs = path.resolve(here, '../../run.mjs');
export const WEB = /\bfetch\s*\(|\blocalStorage\b|\bsessionStorage\b|\bnew\s+(?:URL|URLSearchParams|Headers|Request|Response|AbortController|TextEncoder|TextDecoder|FormData|Blob)\b|\bResponse\.(?:json|error|redirect)\b|\bAbortSignal\.|\bstructuredClone\s*\(/;
const SKIP = new Set(['node_modules', 'dist', 'build', '.next', 'coverage', 'test', 'tests', '__tests__', '.git', 'out']);

const a = process.argv.slice(2);
const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
const root = path.resolve(opt('--root')), name = opt('--name', path.basename(root)), N = Number(opt('--units', 40)), K = Number(opt('--sites', 3)), JOBS = Math.min(4, Number(opt('--jobs', 4))), out = opt('--out');

function files(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') && e.name !== '.') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name)) files(p, acc); }
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.d\.ts$|\.(test|spec|stories)\.tsx?$|\.lean-mut\d+\.tsx?$/.test(e.name)) acc.push(p);
  }
  return acc;
}

const selected = [];
for (const f of files(root).sort()) {
  let text; try { text = fs.readFileSync(f, 'utf8'); } catch { continue; }
  if (!WEB.test(text)) continue;
  let units; try { const { sf } = loadProgram(f, { project: false }); units = [...topLevelFunctions(sf).values()].map((u) => ({ name: u.name, text: u.fn?.getText?.(sf) ?? '' })); } catch { continue; }
  for (const u of units.sort((x, y) => (x.name < y.name ? -1 : x.name > y.name ? 1 : 0))) if (WEB.test(u.text)) selected.push({ file: f, unit: u.name });
  if (selected.length >= N) break;
}
selected.length = Math.min(selected.length, N);
if (a.includes('--count')) { console.log(JSON.stringify({ name, files: new Set(selected.map((s) => s.file)).size, units: selected.length })); process.exit(0); } // the selection alone: how many units the fakes reach

const runOne = (parent, candidate, unit, mode) => new Promise((resolve) => {
  const tmpOut = `${candidate}.${mode}.${process.pid}.json`;
  const c = spawn(process.execPath, [runMjs, '--parent', parent, '--candidate', candidate, '--unit', unit, '--n', '30', '--no-project', '--out', tmpOut], { env: { ...process.env, LEAN_FAKES: mode }, stdio: ['ignore', 'ignore', 'pipe'] });
  let err = ''; c.stderr.on('data', (d) => { err += d; });
  c.on('close', () => { let r = null; try { r = JSON.parse(fs.readFileSync(tmpOut, 'utf8')); fs.rmSync(tmpOut); } catch { /* none */ } resolve({ verdict: r?.verdict ?? 'no result', reason: (r?.reason ?? (r ? '' : err.trim().split('\n').pop() ?? '')).slice(0, 160), where: r?.witnesses?.[0]?.where?.field ?? null }); });
});

const tasks = [];
for (const s of selected) {
  tasks.push({ ...s, kind: 'self', candidate: s.file });
  for (let k = 0; k < K; k++) tasks.push({ ...s, kind: 'planted', index: k });
}
const results = [];
let next = 0;
// the machine is shared: no task starts while the one-minute load is above LOAD_CAP (a run under a far higher load would
// spend its time budgets waiting, and an ASK of contention is no verdict of the fakes)
const LOAD_CAP = 40;
const calm = async () => { while (os.loadavg()[0] > LOAD_CAP) await new Promise((r) => setTimeout(r, 30000)); };
async function worker() {
  while (next < tasks.length) {
    await calm();
    if (next >= tasks.length) break;
    const t = tasks[next++];
    let candidate = t.candidate, site = null, mutFile = null;
    if (t.kind === 'planted') {
      let m = null; try { m = mutate(t.file, t.unit, t.index, { project: false, typecheck: false }); } catch { m = null; }
      if (!m || (t.index > 0 && t.index >= m.count)) { results.push({ ...t, file: path.relative(root, t.file), skipped: m ? 'fewer sites' : 'no site' }); continue; }
      mutFile = t.file.replace(/\.(tsx?)$/, `.lean-mut${t.index}.$1`); fs.writeFileSync(mutFile, m.source); candidate = mutFile; site = { kind: m.site.kind, was: m.site.was, text: m.site.text };
    }
    const fakes = await runOne(t.file, candidate, t.unit, 'on');
    const recording = await runOne(t.file, candidate, t.unit, 'recording');
    if (mutFile) fs.rmSync(mutFile, { force: true });
    results.push({ file: path.relative(root, t.file), unit: t.unit, kind: t.kind, index: t.index ?? null, site, fakes, recording });
  }
}
await Promise.all(Array.from({ length: JOBS }, worker));

const count = (rows, side, v) => rows.filter((r) => r[side]?.verdict === v).length;
const self = results.filter((r) => r.kind === 'self'), planted = results.filter((r) => r.kind === 'planted' && !r.skipped);
const summary = {
  name, units: selected.length, sites: K,
  self: { runs: self.length, witnessFakes: count(self, 'fakes', 'WITNESS'), witnessRecording: count(self, 'recording', 'WITNESS'), askFakes: count(self, 'fakes', 'ASK'), askRecording: count(self, 'recording', 'ASK') },
  planted: {
    runs: planted.length,
    witnessFakes: count(planted, 'fakes', 'WITNESS'), witnessRecording: count(planted, 'recording', 'WITNESS'),
    onlyFakes: planted.filter((r) => r.fakes.verdict === 'WITNESS' && r.recording.verdict !== 'WITNESS').length,
    onlyRecording: planted.filter((r) => r.recording.verdict === 'WITNESS' && r.fakes.verdict !== 'WITNESS').length,
    askFakes: count(planted, 'fakes', 'ASK'), askRecording: count(planted, 'recording', 'ASK'),
  },
};
fs.writeFileSync(out, JSON.stringify({ summary, results }, null, 1));
console.log(JSON.stringify(summary));
