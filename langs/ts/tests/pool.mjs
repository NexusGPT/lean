// The suite's one worker pool (the owner, 29 Oct: "We can have also more workers and parallelise section better"). Every
// child process the suite starts takes its slots here, so the machine runs JOBS children at once whichever section they
// belong to. A job is one item of work (a fixture, a case, a pair, a script); its children run one after another, each
// taking a slot while it runs. A job that runs its own workers (a runner given --jobs) takes several slots at once.
// The order: the job measured longest on the last run first (LPT: the long jobs must not start last and hold the
// end of the run), a job never measured with the mean of its section's measured jobs, a section never measured first;
// a job holding several slots before a job holding one (it waits for its slots while the pool fills otherwise);
// then the order the jobs were made in. A started job's next child goes before a later job's first. The measurements
// are the wall seconds of the children a job really ran (a step-cache hit runs none), kept in one JSON file; the order
// never changes a result, only when it is computed.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

// a child's output collected as spawnSync collects it ({ status, signal, stdout, stderr, error }): the bytes decoded once
// at the end, the child killed when stdout or stderr passes maxBuffer (error ENOBUFS), a spawn failure as `error` with
// status null
export function spawnCollect(cmd, args, { cwd, env, maxBuffer = 1024 * 1024 } = {}) {
  return new Promise((resolve) => {
    const out = [], err = []; let error, done = false;
    const finish = (status, signal) => { if (done) return; done = true; resolve({ status, signal, stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8'), ...(error ? { error } : {}) }); };
    let child;
    try { child = spawn(cmd, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { error = e; finish(null, null); return; }
    const take = (list) => { let size = 0; return (b) => { size += b.length; if (size > maxBuffer) { if (!error) { error = Object.assign(new Error(`spawn ${cmd} ENOBUFS`), { code: 'ENOBUFS' }); child.kill('SIGTERM'); } return; } list.push(b); }; };
    child.stdout.on('data', take(out)); child.stderr.on('data', take(err));
    child.on('error', (e) => { error ??= e; if (child.pid === undefined) finish(null, null); });
    child.on('close', (code, signal) => finish(code, signal));
  });
}

export function createPool(width, { historyFile = null } = {}) {
  let free = width, made = 0;
  const queue = [];
  let history = {};
  if (historyFile) try { history = JSON.parse(fs.readFileSync(historyFile, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') console.error(`suite durations unreadable (${e.code ?? e.message}): ${historyFile}`); }
  const measured = {}; // key -> wall seconds of the children this run really ran
  const sectionMean = (section) => { const xs = Object.entries(history).filter(([k]) => k.startsWith(section + '/')).map(([, v]) => v); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };
  const before = (a, b) => (b.estimate - a.estimate) || (b.min - a.min) || (b.started - a.started) || (a.seq - b.seq);
  let pending = false; // the grants wait for the end of the current tick: the jobs made together are ordered together
  const schedule = () => { if (!pending) { pending = true; setImmediate(pump); } };
  const pump = () => {
    pending = false;
    queue.sort(before);
    while (queue.length && free >= queue[0].min) { const h = queue.shift(); const n = Math.min(h.max, free); free -= n; h.resolve(n); }
  };
  // key: `<section>/<item>`, unique in the run and stable across runs
  function job(key) {
    const seq = made++, section = key.slice(0, key.indexOf('/'));
    const estimate = history[key] ?? sectionMean(section) ?? Infinity;
    let started = 0, spent = 0;
    // hold `need` slots ({ min, max } or a count) while fn(granted) runs
    async function slots(need, fn) {
      const min = typeof need === 'number' ? need : need.min, max = typeof need === 'number' ? need : need.max;
      const n = await new Promise((resolve) => { queue.push({ min: Math.min(min, width), max: Math.min(max, width), estimate, started, seq, resolve }); schedule(); });
      started = 1;
      const t = Date.now();
      try { return await fn(n); } finally { spent += (Date.now() - t) / 1000; measured[key] = Math.round(spent * 10) / 10; free += n; schedule(); }
    }
    return { key, slots, run: (cmd, args, opts) => slots(1, () => spawnCollect(cmd, args, opts)) };
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
