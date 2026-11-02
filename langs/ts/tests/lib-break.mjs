#!/usr/bin/env node
// The --break rows of the library pairs (design/w2d-library-rows.md; the one convention of amendment A6: the code under
// test reads LEAN_BREAK=<mechanism> and skips that mechanism). Every lane B row of a pair's `break` (tests/break.mjs
// breakRows: a row's `b`, { "<unit>": "<verdict>" }) runs lane B (check.mjs) on its unit twice: as is, where the verdict
// must be the pair's `b` verdict, and with LEAN_BREAK=<mechanism>, where it must be the break verdict and differ from
// it. Lane A's rows (a row's `equal`) are tests/run.mjs's. A mechanism whose removal leaves a verdict unchanged is no mechanism of that verdict.
//   node langs/ts/tests/lib-break.mjs [--pair lib_x] [--jobs N]   (N at most 4)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { breakRows } from './break.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const pairsDir = path.join(here, 'pairs');
const checkMjs = path.join(here, '../check.mjs');
const arg = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : null; };
const only = arg('--pair');
const jobs = Math.min(4, Math.max(1, Number(arg('--jobs') ?? 2)));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-lib-break-'));

const tasks = [];
for (const name of fs.readdirSync(pairsDir).sort()) {
  if (only && name !== only) continue;
  const f = path.join(pairsDir, name, 'expect.json'); if (!fs.existsSync(f)) continue;
  const exp = JSON.parse(fs.readFileSync(f, 'utf8')); if (!exp.break) continue;
  const d = path.join(pairsDir, name);
  const project = exp.project ? ['--project', path.join(d, exp.project)] : ['--no-project'];
  for (const { mechanism: mech, unit, verdict: broken } of breakRows(exp).filter((r) => r.lane === 'B')) {
    for (const env of [null, mech]) tasks.push({ name, unit, mech, env, want: env ? broken : exp.b[unit], args: ['--parent', path.join(d, 'parent.ts'), '--candidate', path.join(d, 'candidate.ts'), '--unit', unit, '--n', '30', ...project] });
  }
}
const run = (t, i) => new Promise((resolve) => {
  const out = path.join(tmp, `${i}.json`);
  const env = { ...process.env }; delete env.LEAN_BREAK; if (t.env) env.LEAN_BREAK = t.env;
  const c = spawn(process.execPath, [checkMjs, ...t.args, '--out', out], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let err = ''; c.stdout.on('data', () => {}); c.stderr.on('data', (b) => { err += b; });
  c.on('close', () => { let got = null; try { got = JSON.parse(fs.readFileSync(out, 'utf8')).verdict; } catch { got = `no output: ${err.trim().split('\n').pop()}`; } resolve({ ...t, got }); });
});
const results = [];
let next = 0;
await Promise.all(Array.from({ length: jobs }, async () => { while (next < tasks.length) { const i = next++; results[i] = await run(tasks[i], i); } }));
fs.rmSync(tmp, { recursive: true, force: true });
let failed = 0;
const rows = [];
for (let i = 0; i < results.length; i += 2) {
  const a = results[i], b = results[i + 1];
  const ok = a.got === a.want && b.got === b.want && a.got !== b.got;
  if (!ok) failed++;
  rows.push(`| ${a.name} | ${a.unit} | LEAN_BREAK=${a.mech} | ${a.got} -> ${b.got} | ${ok ? 'PASS' : `FAIL (want ${a.want} -> ${b.want})`} |`);
}
console.log('| pair | unit | break | verdict as is -> broken | res |\n| --- | --- | --- | --- | --- |\n' + rows.join('\n'));
console.log(`lib-break: ${rows.length} rows, ${failed} failed`);
process.exit(failed ? 1 : 0);
