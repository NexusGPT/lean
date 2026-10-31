// The suite's wall cap on a child (pool.mjs spawnCollect, design/suite.md 2026-10-31): a solver that does not honour its
// own time limit never holds the run. A fake `dafny` that starts a child sleeping 600 s is capped at 2 s: the fake and its
// child are both gone within 5 s of the cap, and the result reads as spawnSync's own timeout (status null, SIGKILL,
// ETIMEDOUT, the last stderr line `wall cap 2 s exceeded`). A fake `dafny` that ends under its default cap passes
// through unchanged. The cap's default is three times the call's --verification-time-limit plus 60 s.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { spawnCollect, dafnyWallCapMs, DAFNY_DEFAULT_TIME_LIMIT_S } from './pool.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-wall-cap-'));
const bin = path.join(dir, 'bin'); fs.mkdirSync(bin);
const pidFile = path.join(dir, 'pids');
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
const recorded = () => { try { return fs.readFileSync(pidFile, 'utf8').trim().split(/\s+/).map(Number); } catch { return []; } };

// the processes the fake started, killed by the pids it recorded when the test fails (never by name: the machine is shared)
const sweep = () => { for (const p of recorded()) try { process.kill(p, 'SIGKILL'); } catch (e) { if (e.code !== 'ESRCH') console.error(e.message); } };
// a test that waits forever is the defect itself: past 20 s it fails
const guard = setTimeout(() => { sweep(); console.error('wall cap: FAIL, the capped child was still running after 20 s'); process.exit(1); }, 20000);
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
assert.equal(r.status, null);
assert.equal(r.signal, 'SIGKILL');
assert.equal(r.error?.code, 'ETIMEDOUT');
assert.equal(r.stderr.trim().split('\n').pop(), 'wall cap 2 s exceeded');
assert.match(r.stderr, /^solver started\n/, 'the output written before the cap is kept');

// 3. under the cap (the default one, a Dafny call): the result as the child gave it
const u = await spawnCollect(fake, ['verify', '--verification-time-limit', '1', 'x.dfy'], { dir });
assert.deepEqual({ status: u.status, signal: u.signal, error: u.error, stdout: u.stdout, stderr: u.stderr }, { status: 0, signal: null, error: undefined, stdout: 'Dafny program verifier finished with 3 verified, 0 errors\n', stderr: 'a warning\n' });

clearTimeout(guard);
fs.rmSync(dir, { recursive: true, force: true });
console.log(`wall cap: a 2 s cap killed the child and its descendant in ${((Date.now() - t0) / 1000).toFixed(1)} s with the timeout's shape; a run under the cap passed through unchanged`);
