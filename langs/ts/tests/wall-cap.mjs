// The suite's wall cap on a child (pool.mjs spawnCollect, design/suite.md 2026-10-31): a solver that does not honour its
// own time limit never holds the run. A fake `dafny` that starts a child sleeping 600 s is capped at 2 s: the fake and its
// child are both gone within 5 s of the cap, and the result reads as spawnSync's own timeout (status null, SIGKILL,
// ETIMEDOUT, the last stderr line `wall cap 2 s exceeded`). A fake `dafny` that ends under its default cap passes
// through unchanged. The cap's default is three times the call's --verification-time-limit plus 60 s.
// The checker's own Dafny call takes the same cap (tests/capped.mjs, shared): check.mjs run with a fake `dafny` first on
// PATH whose `verify` starts a child sleeping 600 s, and --dafny-wall-seconds 2: the fake and its child are both gone
// within 5 s of the cap, and the check's JSON is a verdict whose reason and lane A name the cap, never a crash. Run
// through the step cache (a cache of this test alone), the capped check is not stored: the next run tries it again.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { spawnCollect, dafnyWallCapMs, DAFNY_DEFAULT_TIME_LIMIT_S } from './pool.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-wall-cap-'));
process.env.LEAN_STEP_CACHE_DIR = path.join(dir, 'step-cache'); delete process.env.LEAN_STEP_CACHE;
const { cachedRunAsync, stepCacheStats } = await import('./stepcache.mjs');
const bin = path.join(dir, 'bin'); fs.mkdirSync(bin);
const pidFile = path.join(dir, 'pids'), checkPidFile = path.join(dir, 'check-pids');
const fake = path.join(bin, 'dafny');
// the fake Dafny: records its own pid and its child's, then waits on the child (as Dafny waits on z3)
fs.writeFileSync(fake, `#!/bin/sh
if [ "$1" = "hang" ]; then
  sleep 600 &
  echo "$$ $!" > "${pidFile}"
  echo "solver started" >&2
  wait
fi
echo "Dafny program verifier finished with 3 verified, 0 errors"
echo "a warning" >&2
exit 0
`, { mode: 0o700 });

// a process is gone when ps no longer lists it, or lists it as a zombie (dead, its exit status not yet collected)
const alive = (pid) => { const r = spawnSync('ps', ['-o', 'stat=', '-p', String(pid)], { encoding: 'utf8' }); if (r.error) throw r.error; const st = r.stdout.trim(); return st !== '' && !st.startsWith('Z'); };
const recorded = (f = pidFile) => { try { return fs.readFileSync(f, 'utf8').trim().split(/\s+/).filter(Boolean).map(Number); } catch { return []; } };

// the processes the fake started, killed by the pids it recorded when the test fails (never by name: the machine is shared)
let checker = null; // the check.mjs child of part 4, killed by its pid on a failure
const sweep = () => { for (const p of [...recorded(), ...recorded(checkPidFile), ...(checker ? [checker] : [])]) try { process.kill(p, 'SIGKILL'); } catch (e) { if (e.code !== 'ESRCH') console.error(e.message); } };
// a test that waits forever is the defect itself: past 20 s it fails
let guard = setTimeout(() => { sweep(); console.error('wall cap: FAIL, the capped child was still running after 20 s'); process.exit(1); }, 20000);
process.on('uncaughtException', (e) => { sweep(); console.error(e); process.exit(1); });

// 1. the cap's rule
assert.equal(dafnyWallCapMs(['verify', '--verification-time-limit', '90', 'x.dfy']), (3 * 90 + 60) * 1000);
assert.equal(dafnyWallCapMs(['verify', '--verification-time-limit=30', 'x.dfy']), (3 * 30 + 60) * 1000);
assert.equal(dafnyWallCapMs(['translate', 'js', '--no-verify', 'x.dfy']), (3 * DAFNY_DEFAULT_TIME_LIMIT_S + 60) * 1000);

// 2. capped at 2 s: both processes gone within 5 s of the cap, the result shaped as a timeout
const t0 = Date.now();
const r = await spawnCollect(fake, ['hang', '--verification-time-limit', '90'], { dir, wallCapMs: 2000 });
const pids = recorded();
assert.equal(pids.length, 2, `the fake recorded its pid and its child's: ${JSON.stringify(pids)}`);
const deadline = t0 + 2000 + 5000;
while (pids.some(alive) && Date.now() < deadline) await new Promise((res) => setTimeout(res, 100));
assert.deepEqual(pids.filter(alive), [], `still running ${(Date.now() - t0) / 1000} s after the start: ${pids.filter(alive).join(' ')}`);
const capSeconds = (Date.now() - t0) / 1000;
assert.equal(r.status, null);
assert.equal(r.signal, 'SIGKILL');
assert.equal(r.error?.code, 'ETIMEDOUT');
assert.equal(r.stderr.trim().split('\n').pop(), 'wall cap 2 s exceeded');
assert.match(r.stderr, /^solver started\n/, 'the output written before the cap is kept');

// 3. under the cap (the default one, a Dafny call): the result as the child gave it
const u = await spawnCollect(fake, ['verify', '--verification-time-limit', '1', 'x.dfy'], { dir });
assert.deepEqual({ status: u.status, signal: u.signal, error: u.error, stdout: u.stdout, stderr: u.stderr }, { status: 0, signal: null, error: undefined, stdout: 'Dafny program verifier finished with 3 verified, 0 errors\n', stderr: 'a warning\n' });

clearTimeout(guard);

// 4. the checker's own Dafny call (check.mjs): capped at 2 s, Dafny and its solver gone, the cap the unit's reason. The
// whole check (lane B, the translations, the theorem) takes its own seconds first: past 120 s the test fails
guard = setTimeout(() => { sweep(); console.error('wall cap: FAIL, the check or its capped Dafny was still running after 120 s'); process.exit(1); }, 120000);
const bin2 = path.join(dir, 'bin2'); fs.mkdirSync(bin2);
fs.writeFileSync(path.join(bin2, 'dafny'), `#!/bin/sh
if [ "$1" = "verify" ]; then
  sleep 600 &
  echo "$$ $!" > "${checkPidFile}"
  wait
fi
if [ "$1" = "--version" ]; then echo "4.0.0-fake"; fi
exit 0
`, { mode: 0o700 });
fs.writeFileSync(path.join(dir, 'parent.ts'), 'export function flip(b: boolean): boolean { return !b; }\n');
fs.writeFileSync(path.join(dir, 'candidate.ts'), 'export function flip(b: boolean): boolean { return b ? false : true; }\n');
const out = path.join(dir, 'check.json');
const checkMjs = path.join(path.dirname(fileURLToPath(import.meta.url)), '../check.mjs');
let seen = null; // when the fake's pids appeared: the cap fires 2 s after
const runChecker = (cmd, args) => new Promise((resolve) => {
  const c = spawn(cmd, args, { env: { ...process.env, PATH: `${bin2}${path.delimiter}${process.env.PATH}` }, stdio: ['ignore', 'inherit', 'inherit'] });
  checker = c.pid;
  c.on('close', (status, signal) => resolve({ status, signal, stdout: '', stderr: '' }));
});
const exited = cachedRunAsync(runChecker, 'node', [checkMjs, '--parent', path.join(dir, 'parent.ts'), '--candidate', path.join(dir, 'candidate.ts'), '--unit', 'flip', '--n', '3', '--no-project', '--dafny-wall-seconds', '2', '--out', out], { root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'), files: [path.join(dir, 'parent.ts'), path.join(dir, 'candidate.ts')], outs: [out] });
const watch = setInterval(() => { if (!seen && recorded(checkPidFile).length === 2) seen = Date.now(); }, 50);
const ended = await exited;
clearInterval(watch); checker = null;
const cpids = recorded(checkPidFile);
assert.equal(cpids.length, 2, `the fake dafny recorded its pid and its child's: ${JSON.stringify(cpids)}`);
seen ??= Date.now();
while (cpids.some(alive) && Date.now() < seen + 2000 + 5000) await new Promise((res) => setTimeout(res, 100));
assert.deepEqual(cpids.filter(alive), [], `the checker's capped Dafny left running ${((Date.now() - seen) / 1000).toFixed(1)} s after it started: ${cpids.filter(alive).join(' ')}`);
assert.deepEqual({ status: ended.status, signal: ended.signal }, { status: 0, signal: null }, 'the check ends on its own, not by a crash');
const got = JSON.parse(fs.readFileSync(out, 'utf8'));
assert.equal(got.certificate?.lanes?.A?.verdict, 'ASK:timeout');
assert.equal(got.certificate?.lanes?.A?.wallCap, 'wall cap 2 s exceeded');
assert.match(got.reason ?? '', /not proved: wall cap 2 s exceeded/, `the unit's reason names the cap: ${got.verdict} ${got.reason}`);
assert.equal(stepCacheStats().stored, 0, 'a check its wall cap cut short is never stored in the step cache');

clearTimeout(guard);
fs.rmSync(dir, { recursive: true, force: true });
console.log(`wall cap: a 2 s cap killed the child and its descendant in ${capSeconds.toFixed(1)} s with the timeout's shape; a run under the cap passed through unchanged; the checker's own Dafny was capped the same way (${got.verdict}: ${got.reason})`);
