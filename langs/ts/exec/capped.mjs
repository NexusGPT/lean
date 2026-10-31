// A child process under a wall cap, shared by the suite's runners (pool.mjs, run.mjs, conformance) and the checker's own
// Dafny call (check.mjs): one mechanism, so a solver that does not honour its own time limit holds neither a run nor a
// check, and leaves no process behind (design/suite.md, 2026-10-31).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';

// a child's output collected as spawnSync collects it ({ status, signal, stdout, stderr, error }). The child writes
// its stdout and stderr to two files in `dir`, read when it exits: a child that ends with process.exit loses no output
// whatever this process is doing meanwhile (a pipe this process is slow to read holds the child's writes in its own
// memory, and process.exit drops them; spawnSync reads its pipe at once, this process reads many children's). Past
// maxBuffer on stdout or stderr the result is spawnSync's: the text cut there, error ENOBUFS, status null, SIGTERM
// (spawnSync kills the child at that point; here it has run to its end). A spawn failure is `error` with status null.
// The wall cap (design/suite.md, 2026-10-31): a child running past `wallCapMs` is stopped with its whole process
// tree and killed (killTree); the result is then spawnSync's on its own timeout: status null, signal SIGKILL, error
// ETIMEDOUT, and the last stderr line `wall cap <N> s exceeded`. Every Dafny child carries one by default: three times
// its --verification-time-limit (Dafny's default 30 s when the call names none) plus 60 seconds, so a solver that does
// not honour its own time limit never holds the run.
let named = 0;
export function spawnCollect(cmd, args, { cwd, env, maxBuffer = 1024 * 1024, dir = os.tmpdir(), onSpawn = null, wallCapMs = isDafny(cmd) ? dafnyWallCapMs(args) : null } = {}) {
  return new Promise((resolve) => {
    const base = path.join(dir, `child-${process.pid}-${named++}`), files = [`${base}.out`, `${base}.err`];
    const read = () => files.map((f) => { try { const b = fs.readFileSync(f); fs.rmSync(f, { force: true }); return b; } catch { return Buffer.alloc(0); } });
    let fds = [], child, error, done = false, timer = null, capped = false;
    const finish = (status, signal) => {
      if (done) return; done = true;
      if (timer) clearTimeout(timer);
      const [out, err] = read();
      if (out.length > maxBuffer || err.length > maxBuffer) { error ??= Object.assign(new Error(`spawn ${cmd} ENOBUFS`), { code: 'ENOBUFS' }); status = null; signal = 'SIGTERM'; }
      let stderr = err.subarray(0, maxBuffer).toString('utf8');
      if (capped) { error ??= Object.assign(new Error(`spawn ${cmd} ETIMEDOUT`), { code: 'ETIMEDOUT' }); status = null; signal = 'SIGKILL'; stderr += `${stderr && !stderr.endsWith('\n') ? '\n' : ''}wall cap ${wallCapMs / 1000} s exceeded\n`; }
      resolve({ status, signal, stdout: out.subarray(0, maxBuffer).toString('utf8'), stderr, ...(error ? { error } : {}) });
    };
    try {
      fds = files.map((f) => fs.openSync(f, 'w', 0o600));
      child = spawn(cmd, args, { cwd, env, stdio: ['ignore', fds[0], fds[1]] });
    } catch (e) { error = e; for (const fd of fds) fs.closeSync(fd); finish(null, null); return; }
    for (const fd of fds) fs.closeSync(fd); // the child holds its own copies
    if (onSpawn && child.pid !== undefined) onSpawn(child.pid);
    if (wallCapMs && child.pid !== undefined) timer = setTimeout(() => { capped = true; killTree(child.pid); }, wallCapMs);
    child.on('error', (e) => { error ??= e; if (child.pid === undefined) finish(null, null); });
    child.on('close', (code, signal) => finish(code, signal));
  });
}

// Dafny's own default --verification-time-limit (`dafny verify --help`: 30 s); 0 there means no limit, and a call that
// names 0 is capped at the default's cap all the same
export const DAFNY_DEFAULT_TIME_LIMIT_S = 30;
const isDafny = (cmd) => path.basename(String(cmd)) === 'dafny';
export function dafnyWallCapMs(args) {
  const i = args.indexOf('--verification-time-limit'), eq = args.find((a) => String(a).startsWith('--verification-time-limit='));
  const s = Number(i >= 0 ? args[i + 1] : eq ? String(eq).split('=')[1] : DAFNY_DEFAULT_TIME_LIMIT_S);
  return wallCapMs(Number.isFinite(s) && s > 0 ? s : DAFNY_DEFAULT_TIME_LIMIT_S);
}
// the children of a process, as `pgrep -P` lists them (procps on Linux, the BSD pgrep on macOS: both take -P)
const childrenOf = (pid) => {
  const r = spawnSync('pgrep', ['-P', String(pid)], { encoding: 'utf8' });
  if (r.error) { console.error(`wall cap: pgrep did not run (${r.error.code ?? r.error.message}); only the capped child itself is killed`); return []; }
  return (r.stdout ?? '').split(/\s+/).filter(Boolean).map(Number);
};
const signal = (pid, sig) => { try { process.kill(pid, sig); return true; } catch (e) { if (e.code !== 'ESRCH') console.error(`wall cap: ${sig} to ${pid}: ${e.code ?? e.message}`); return false; } };
// a process and every process under it, stopped first and killed after: each is stopped as soon as it is found and its
// children are listed only once it is stopped (a stopped process forks no more and stays the parent of its children, so
// the walk down the tree misses none), then every one of them takes SIGKILL. Returns the pids killed.
export function killTree(pid) {
  const tree = [pid], seen = new Set(tree);
  signal(pid, 'SIGSTOP');
  for (let i = 0; i < tree.length; i++) for (const c of childrenOf(tree[i])) if (!seen.has(c)) { seen.add(c); tree.push(c); signal(c, 'SIGSTOP'); }
  for (const p of tree) signal(p, 'SIGKILL');
  return tree;
}

// the wall cap of a child whose own bounds sum to `seconds`: three times them plus 60 s (a Dafny call: its time limit,
// dafnyWallCapMs; a `node check.mjs` child: the bounds its command line states, check.mjs checkWallCapMs)
export const wallCapMs = (seconds) => (3 * seconds + 60) * 1000;
