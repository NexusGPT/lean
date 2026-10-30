// The step cache (the owner's rule, 29 Oct: the tests run as fast as possible on merges). A command the suite runs is
// cached by the content it depends on: the program and its arguments (temporary and repository paths normalised), the
// content of every file it reads, the environment it is given, and a producer hash over lean's own sources (every .mjs,
// .json, .py and .d.ts under langs/ts except tests, design, audit and vendor, plus spec/ and the pinned TypeScript); a
// Dafny verification by the theorem text and the Dafny version alone. A hit returns the stored result and rewrites the
// files the command wrote. A result that may change on a rerun (a timeout, a bound hit, a harness error, a killed
// process, a missing output) is never stored. LEAN_STEP_CACHE=0 turns it off; LEAN_STEP_CACHE_DIR moves it.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

export const CACHE_DIR = process.env.LEAN_STEP_CACHE_DIR || path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'lean', 'steps');
export const stepCacheOn = process.env.LEAN_STEP_CACHE !== '0';
const sha = (s) => createHash('sha256').update(s).digest('hex');
const producers = new Map();
// the sources that can change what a command answers, hashed once per process and per kind: 'exec' is lane B's runner
// (exec/, the shared readers it imports, the pinned TypeScript), 'translate' the proof lane's translator and lint,
// 'spec' the theorem generator, 'all' every one of them (check.mjs runs both lanes). A translator change must not
// rerun a thousand sandbox runs, and a runner change must not re-verify a thousand theorems.
export function producerHash(root, kind = 'all') {
  if (producers.has(kind)) return producers.get(kind);
  const files = [];
  const skip = new Set(['tests', 'design', 'audit', 'vendor', 'node_modules', '.lean']);
  const walk = (dir) => { if (!fs.existsSync(dir)) return; for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) { if (!skip.has(e.name)) walk(p); } else if (/\.(mjs|json|py|d\.ts)$/.test(e.name)) files.push(p); } };
  const ts = path.join(root, 'langs/ts');
  const top = () => { for (const e of fs.readdirSync(ts, { withFileTypes: true })) if (e.isFile() && /\.(mjs|json|d\.ts)$/.test(e.name) && !/^(census|census-env|pr|lower)\.mjs$/.test(e.name)) files.push(path.join(ts, e.name)); }; // the shared readers (common, patch, handlers, readings, ...)
  if (kind === 'exec' || kind === 'all') { walk(path.join(ts, 'exec')); top(); }
  if (kind === 'translate' || kind === 'all') { walk(path.join(ts, 'translate')); walk(path.join(ts, 'lint')); top(); files.push(path.join(ts, 'lower.mjs')); }
  if (kind === 'spec' || kind === 'all') walk(path.join(root, 'spec'));
  if (kind === 'all') for (const d of fs.readdirSync(ts, { withFileTypes: true })) if (d.isDirectory() && !skip.has(d.name) && !['exec', 'translate', 'lint'].includes(d.name)) walk(path.join(ts, d.name));
  const tsLib = path.join(ts, 'vendor/typescript/lib/typescript.js'); if (fs.existsSync(tsLib)) files.push(tsLib);
  const h = createHash('sha256');
  for (const f of [...new Set(files)].sort()) if (fs.existsSync(f)) h.update(path.relative(root, f)).update('\0').update(fs.readFileSync(f)).update('\0');
  const digest = h.digest('hex'); producers.set(kind, digest); return digest;
}
// which sources a command depends on, read off the command line
export function producerKind(cmd, args) {
  const text = args.join(' ');
  if (cmd === 'dafny') return 'dafny';
  if (cmd === 'python3' && /spec\/theorem\.py/.test(text)) return 'spec';
  if (/exec\/run\.mjs/.test(text)) return 'exec';
  if (/translate\/translate\.mjs/.test(text)) return 'translate';
  return 'all';
}
let dafnyVersion = null;
export const dafnyVersionString = () => dafnyVersion ??= (spawnSync('dafny', ['--version'], { encoding: 'utf8' }).stdout ?? '').trim() || 'dafny version unknown';
const UNSTABLE = /timed out|out of resource|spin-bound|__timeout__|harness timeout|ASK:harness|"harness":|killed \(|ENOSPC|EAGAIN/i;
let hits = 0, misses = 0, stored = 0;
export const stepCacheStats = () => ({ on: stepCacheOn, hits, misses, stored, dir: CACHE_DIR });
// the key of one command, and the stored entry when there is one (a hit); shared by the sync and the async runner
function lookup(cmd, args, { root, files = [], outs = [], env = null, normalise = [] }) {
  const norm = (s) => normalise.reduce((t, [from, to]) => (from ? t.split(from).join(to) : t), String(s));
  const denorm = (s) => normalise.reduce((t, [from, to]) => (from ? t.split(to).join(from) : t), String(s)); // a stored output names this run's paths again: a result replayed in another checkout or temp folder must point at that checkout (the witness-lines check compares the site's file to the pair's)
  const inputs = files.map((f) => { try { return [norm(f), sha(fs.readFileSync(f))]; } catch { return [norm(f), null]; } });
  if (env) for (const v of Object.values(env)) { if (typeof v === 'string' && fs.existsSync(v) && fs.statSync(v).isFile()) inputs.push([norm(v), sha(fs.readFileSync(v))]); } // a table or fixture named by the environment
  const kind = producerKind(cmd, args);
  const keyObj = { v: 2, cmd, args: args.map(norm), env: env ?? {}, inputs, kind, producer: kind === 'dafny' ? dafnyVersionString() : producerHash(root, kind) }; // v2: outputs stored normalised
  const key = sha(JSON.stringify(keyObj)), file = path.join(CACHE_DIR, key.slice(0, 2), key + '.json');
  const step = { norm, denorm, keyObj, key, file, outs };
  try {
    const e = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (e.key === key && e.digest === sha(JSON.stringify(e.outs))) {
      for (const [rel, content] of Object.entries(e.outs)) { const p = outs.find((o) => norm(o) === rel); if (p) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, denorm(content)); } }
      hits++; return { step, hit: { status: e.status, stdout: denorm(e.stdout), stderr: denorm(e.stderr), signal: null, cached: true } };
    }
  } catch (err) { if (err.code && err.code !== 'ENOENT') console.error(`step cache read ${err.code}: ${file}`); }
  return { step, hit: null };
}
let nextSeq = 0; // two commands of one process may store at once (the async runner): each writes its own temporary file
function store({ norm, keyObj, key, file, outs }, r) {
  misses++;
  const text = (r.stdout ?? '') + (r.stderr ?? '');
  const outContents = {}; let complete = true;
  for (const o of outs) { try { outContents[norm(o)] = norm(fs.readFileSync(o, 'utf8')); } catch { complete = false; } }
  const stable = complete && !r.signal && !r.error && r.status !== null && !UNSTABLE.test(text) && Object.values(outContents).every((c) => !UNSTABLE.test(c));
  if (stable) {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
      const next = `${file}.${process.pid}.${nextSeq++}.next`;
      fs.writeFileSync(next, JSON.stringify({ key, cmd: keyObj.cmd, args: keyObj.args, status: r.status, stdout: norm(r.stdout ?? ''), stderr: norm(r.stderr ?? ''), outs: outContents, digest: sha(JSON.stringify(outContents)), date: new Date().toISOString() }), { mode: 0o600, flag: 'wx' });
      fs.renameSync(next, file); stored++;
    } catch (err) { console.error(`step cache write ${err.code ?? err.message}: ${file}`); }
  }
  return r;
}
// run(cmd, args, env) is the suite's own runner; files: what the command reads; outs: what it writes (restored on a hit)
export function cachedRun(run, cmd, args, opts = {}) {
  if (!stepCacheOn) return run(cmd, args, opts.env ?? undefined);
  const { step, hit } = lookup(cmd, args, opts);
  if (hit) return hit;
  return store(step, run(cmd, args, opts.env ?? undefined));
}
// the same around an async runner (a child process the suite's pool runs): the key, the hit and the store are the sync ones
export async function cachedRunAsync(runAsync, cmd, args, opts = {}) {
  if (!stepCacheOn) return runAsync(cmd, args, opts.env ?? undefined);
  const { step, hit } = lookup(cmd, args, opts);
  if (hit) return hit;
  return store(step, await runAsync(cmd, args, opts.env ?? undefined));
}
