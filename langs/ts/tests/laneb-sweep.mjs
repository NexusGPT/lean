// Lane B's verdict on every unit of the pairs (expect.json "b"), run as the suite runs it (exec/run.mjs --n 30, the
// pair's --project or --no-project), on the tree named, so two trees' verdicts compare unit by unit.
//   node langs/ts/tests/laneb-sweep.mjs --tree <lean root> --out verdicts.json [--jobs 2] [--units units.json]
// --units: a JSON list of [pair, unit] to run (the units korat-slots.mjs names; default every unit of every pair)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const tree = path.resolve(opt('--tree', path.join(here, '..', '..', '..')));
const out = opt('--out'); const jobs = Number(opt('--jobs', 2));
const pairs = path.join(here, 'pairs'); // the pairs of this tree: both runs read the same pair files
const side = (d, k) => (fs.existsSync(path.join(d, k + '.tsx')) ? path.join(d, k + '.tsx') : path.join(d, k + '.ts'));
let todo = [];
if (opt('--units')) todo = JSON.parse(fs.readFileSync(opt('--units'), 'utf8'));
else for (const name of fs.readdirSync(pairs).sort()) { const ef = path.join(pairs, name, 'expect.json'); if (!fs.existsSync(ef)) continue; for (const unit of Object.keys(JSON.parse(fs.readFileSync(ef, 'utf8')).b ?? {})) todo.push([name, unit]); }
const done = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {}; // resumable: a unit already recorded is kept
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'laneb-sweep-'));
const runOne = ([name, unit], i) => new Promise((resolve) => {
  const d = path.join(pairs, name); const exp = JSON.parse(fs.readFileSync(path.join(d, 'expect.json'), 'utf8'));
  const res = path.join(tmp, `${i}.json`);
  const args = [path.join(tree, 'langs', 'ts', 'exec', 'run.mjs'), '--parent', side(d, 'parent'), '--candidate', side(d, 'candidate'), '--unit', unit, '--n', '30', ...(exp.project ? ['--project', path.join(d, exp.project)] : ['--no-project']), '--out', res];
  const p = spawn('node', args, { stdio: ['ignore', 'ignore', 'pipe'] }); let err = '';
  p.stderr.on('data', (b) => { err += b; });
  p.on('close', (code) => {
    let r = null; try { r = JSON.parse(fs.readFileSync(res, 'utf8')); } catch { /* recorded as no result */ }
    const w = r?.witnesses?.[0];
    done[`${name} ${unit}`] = { verdict: r?.verdict ?? 'no result', code, heaps: r?.bound?.heaps?.enumerated ?? null, witnessInput: w?.input ?? null, stderr: err.slice(-300) };
    fs.writeFileSync(out, JSON.stringify(done, null, 1)); resolve();
  });
});
let next = 0; const queue = todo.filter(([n, u]) => !done[`${n} ${u}`]);
await Promise.all(Array.from({ length: jobs }, async () => { while (next < queue.length) { const i = next++; await runOne(queue[i], i); } }));
console.log(`tree ${tree}: ${Object.keys(done).length} units recorded`);
