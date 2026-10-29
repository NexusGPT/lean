// The suite's one worker pool (the owner, 29 Oct: "We can have also more workers and parallelise section better"). Every
// child process the suite starts takes its slots here, so the machine runs JOBS children at once whichever section they
// belong to. A job is one item of work (a fixture, a case, a pair, a script); its children run one after another, each
// taking a slot while it runs. A job that runs its own workers (a runner given --jobs) takes several slots at once.
// The order: the job measured longest on the last run first (LPT: the long jobs must not start last and hold the
// end of the run); a job never measured takes the mean of its group (the items of one fan-out: the escapes, the
// pairs), a job of no group or of a group never measured goes first;
// a job holding several slots before a job holding one (it waits for its slots while the pool fills otherwise);
// then the order the jobs were made in. A started job's next child goes before a later job's first. The measurements
// are the wall seconds of the children a job really ran (a step-cache hit runs none), kept in one JSON file; the order
// never changes a result, only when it is computed.
// A job's weight is the cores its children keep busy, measured (tests/measure-weights.mjs: the 90th percentile of the
// %CPU of a job's child and every process under it): each of its children holds that many slots, a fraction of one
// included, and the pool admits children while the weights of those running stay at or under JOBS, so the busy cores
// stay near JOBS and a CPU second does the same work as it does alone (lane B's bounds are CPU seconds). The weights
// live in suite-weights.json: { keys: { <job key>: cores }, groups: { <fan-out>: cores } }; a job's own key first, then
// its group, then 1; no job weighs under a quarter of a slot (MIN_WEIGHT), so at most 4 x JOBS children run at once.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

// a child's output collected as spawnSync collects it ({ status, signal, stdout, stderr, error }). The child writes
// its stdout and stderr to two files in `dir`, read when it exits: a child that ends with process.exit loses no output
// whatever this process is doing meanwhile (a pipe this process is slow to read holds the child's writes in its own
// memory, and process.exit drops them; spawnSync reads its pipe at once, this process reads many children's). Past
// maxBuffer on stdout or stderr the result is spawnSync's: the text cut there, error ENOBUFS, status null, SIGTERM
// (spawnSync kills the child at that point; here it has run to its end). A spawn failure is `error` with status null.
let named = 0;
export function spawnCollect(cmd, args, { cwd, env, maxBuffer = 1024 * 1024, dir = os.tmpdir(), onSpawn = null } = {}) {
  return new Promise((resolve) => {
    const base = path.join(dir, `child-${process.pid}-${named++}`), files = [`${base}.out`, `${base}.err`];
    const read = () => files.map((f) => { try { const b = fs.readFileSync(f); fs.rmSync(f, { force: true }); return b; } catch { return Buffer.alloc(0); } });
    let fds = [], child, error, done = false;
    const finish = (status, signal) => {
      if (done) return; done = true;
      const [out, err] = read();
      if (out.length > maxBuffer || err.length > maxBuffer) { error ??= Object.assign(new Error(`spawn ${cmd} ENOBUFS`), { code: 'ENOBUFS' }); status = null; signal = 'SIGTERM'; }
      resolve({ status, signal, stdout: out.subarray(0, maxBuffer).toString('utf8'), stderr: err.subarray(0, maxBuffer).toString('utf8'), ...(error ? { error } : {}) });
    };
    try {
      fds = files.map((f) => fs.openSync(f, 'w', 0o600));
      child = spawn(cmd, args, { cwd, env, stdio: ['ignore', fds[0], fds[1]] });
    } catch (e) { error = e; for (const fd of fds) fs.closeSync(fd); finish(null, null); return; }
    for (const fd of fds) fs.closeSync(fd); // the child holds its own copies
    if (onSpawn && child.pid !== undefined) onSpawn(child.pid);
    child.on('error', (e) => { error ??= e; if (child.pid === undefined) finish(null, null); });
    child.on('close', (code, signal) => finish(code, signal));
  });
}

// outDir: where the children's output files go while they run
// weightsFile: the measured weights; traceFile: a line `<pid> <job key>` per child started (what measure-weights reads)
export const MIN_WEIGHT = 0.25;
export function createPool(width, { historyFile = null, outDir = os.tmpdir(), weightsFile = null, traceFile = null } = {}) {
  let weights = { keys: {}, groups: {} };
  if (weightsFile) try { weights = { keys: {}, groups: {}, ...JSON.parse(fs.readFileSync(weightsFile, 'utf8')) }; } catch (e) { console.error(`suite weights unreadable (${e.code ?? e.message}): ${weightsFile}; every job weighs 1`); }
  const trace = (key) => (pid) => { if (traceFile) fs.appendFileSync(traceFile, `${pid} ${key}\n`); };
  const U = 100; // slots are counted in hundredths
  let free = width * U, made = 0;
  const queue = [];
  let history = {};
  if (historyFile) try { history = JSON.parse(fs.readFileSync(historyFile, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') console.error(`suite durations unreadable (${e.code ?? e.message}): ${historyFile}`); }
  const measured = {}; // key -> wall seconds of the children this run really ran
  const groupMean = (group) => { const xs = Object.entries(history).filter(([k]) => k.startsWith(group + '/')).map(([, v]) => v); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };
  const before = (a, b) => (b.estimate - a.estimate) || (b.min - a.min) || (b.started - a.started) || (a.seq - b.seq);
  let pending = false; // the grants wait for the end of the current tick: the jobs made together are ordered together
  const schedule = () => { if (!pending) { pending = true; setImmediate(pump); } };
  const pump = () => {
    pending = false;
    queue.sort(before);
    while (queue.length && free >= queue[0].min) { const h = queue.shift(); const n = Math.min(h.max, free); free -= n; h.resolve(n); }
  };
  // key: unique in the run and stable across runs; group: a fan-out's name, the prefix of its items' keys (`<group>/<item>`)
  function job(key, { group = null } = {}) {
    const seq = made++;
    const estimate = history[key] ?? (group ? groupMean(group) : null) ?? Infinity;
    const weight = Math.min(width, Math.max(MIN_WEIGHT, Math.round((weights.keys[key] ?? (group ? weights.groups[group] : null) ?? 1) * 20) / 20)); // to a twentieth
    let started = 0, spent = 0;
    // hold `need` slots ({ min, max } or a count, fractions included) while fn(granted) runs
    async function slots(need, fn) {
      const min = typeof need === 'number' ? need : need.min, max = typeof need === 'number' ? need : need.max;
      const units = (x) => Math.round(Math.min(x, width) * U);
      const n = await new Promise((resolve) => { queue.push({ min: units(min), max: units(max), estimate, started, seq, resolve }); schedule(); });
      started = 1;
      const t = Date.now();
      try { return await fn(n / U); } finally { spent += (Date.now() - t) / 1000; measured[key] = Math.round(spent * 10) / 10; free += n; schedule(); }
    }
    return { key, weight, slots, onSpawn: trace(key), run: (cmd, args, opts) => slots(weight, () => spawnCollect(cmd, args, { dir: outDir, onSpawn: trace(key), ...opts })) };
  }
  // the measurements back to the file: this run's jobs replace their old values, the others are kept
  function save() {
    if (!historyFile) return;
    try {
      let now = {}; try { now = JSON.parse(fs.readFileSync(historyFile, 'utf8')); } catch { /* a first run */ }
      fs.mkdirSync(path.dirname(historyFile), { recursive: true });
      const next = `${historyFile}.${process.pid}.next`;
      fs.writeFileSync(next, JSON.stringify({ ...now, ...measured }, null, 1));
      fs.renameSync(next, historyFile);
    } catch (e) { console.error(`suite durations not saved (${e.code ?? e.message}): ${historyFile}`); }
  }
  return { job, save, get width() { return width; } };
}
