#!/usr/bin/env node
// The pin every lean run states (solve/pin.mjs): Z3 4.12.1 and LC_ALL en_US.UTF-8 or C.UTF-8. Z3 5.3.2 flipped the
// verdicts of heap_shapes and opaque_string_code_unit; LC_ALL=fr_BE.UTF-8 broke Dafny's counterexample parser on four
// cex_ pairs. A fake Z3 (a script that answers --version with the version given) stands in for the binary, so the
// test holds on any machine:
// 1. the check itself: each wrong version and each wrong or missing LC_ALL is named, the pinned pair is not;
// 2. tests/run.mjs refuses a wrong Z3 and a wrong locale at startup (exit 2, the refusal names both values) and,
//    under LEAN_PIN=warn, only warns;
// 3. pr.mjs warns on both, before anything else it prints.
// Exit 1 on any difference.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const lean = path.resolve(here, '..');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-pin-'));
const bad = [];
const expect = (ok, what) => { if (!ok) bad.push(what); };
const fakeZ3 = (version) => { const f = path.join(dir, `z3-${version}`); fs.writeFileSync(f, `#!/bin/sh\necho "Z3 version ${version} - 64 bit"\n`, { mode: 0o755 }); return f; };
const z3Good = fakeZ3('4.12.1'), z3Bad = fakeZ3('5.3.2');
const node = (script, args, env) => { const r = spawnSync(process.execPath, [path.join(lean, script), ...args], { encoding: 'utf8', timeout: 120000, env: { ...process.env, ...env } }); return { status: r.status, out: (r.stdout ?? '') + (r.stderr ?? ''), stderr: r.stderr ?? '' }; };
try {
  // 1. the check
  let pin = null;
  try { pin = await import(path.join(lean, 'solve/pin.mjs')); } catch (e) { bad.push(`solve/pin.mjs: ${e.message.split('\n')[0]}`); }
  if (pin) {
    const p = (z3Version, env) => pin.pinProblems({ z3Version, env });
    expect(p('Z3 version 4.12.1 - 64 bit', { LC_ALL: 'en_US.UTF-8' }).length === 0, 'the pinned pair (4.12.1, en_US.UTF-8) named a problem');
    expect(p('Z3 version 4.12.1 - 64 bit', { LC_ALL: 'C.UTF-8' }).length === 0, 'the pinned pair (4.12.1, C.UTF-8) named a problem');
    expect(p('Z3 version 4.12.1 - 64 bit', { LC_ALL: 'C.utf8' }).length === 0, 'C.utf8, the same locale spelled as glibc lists it, named a problem');
    const z = p('Z3 version 5.3.2 - 64 bit', { LC_ALL: 'en_US.UTF-8' });
    expect(z.length === 1 && /5\.3\.2/.test(z[0]) && /4\.12\.1/.test(z[0]), `z3 5.3.2 not named against 4.12.1: ${JSON.stringify(z)}`);
    expect(p('Z3 version 4.12.10 - 64 bit', { LC_ALL: 'en_US.UTF-8' }).length === 1, 'z3 4.12.10 passed as 4.12.1');
    expect(p('Z3 version 4.8.12 - 64 bit', { LC_ALL: 'en_US.UTF-8' }).length === 1, 'z3 4.8.12 passed');
    expect(p(null, { LC_ALL: 'en_US.UTF-8' }).length === 1, 'no z3 passed');
    const l = p('Z3 version 4.12.1 - 64 bit', { LC_ALL: 'fr_BE.UTF-8' });
    expect(l.length === 1 && /fr_BE\.UTF-8/.test(l[0]), `LC_ALL=fr_BE.UTF-8 not named: ${JSON.stringify(l)}`);
    // LANG alone leaves every LC_<category> the shell sets in force (LC_NUMERIC=fr_BE is the decimal comma): LC_ALL must be set
    expect(p('Z3 version 4.12.1 - 64 bit', { LANG: 'en_US.UTF-8', LC_NUMERIC: 'fr_BE.UTF-8' }).length === 1, 'LC_ALL unset (LANG en_US, LC_NUMERIC fr_BE) passed');
    expect(p('Z3 version 4.12.1 - 64 bit', { LC_ALL: '' }).length === 1, 'LC_ALL empty passed');
    expect(p('Z3 version 5.3.2 - 64 bit', { LC_ALL: 'fr_BE.UTF-8' }).length === 2, 'a wrong z3 and a wrong locale together not both named');
  }
  // 2. the test runner refuses at startup: the pair named does not exist, so a run past the check is a failure of its own
  const probe = ['--pair', '__pin_probe_no_such_pair__'];
  const r1 = node('tests/run.mjs', probe, { LEAN_Z3: z3Bad, LC_ALL: 'en_US.UTF-8', LEAN_PIN: '' });
  expect(r1.status === 2 && /5\.3\.2/.test(r1.stderr) && /4\.12\.1/.test(r1.stderr) && /refus/.test(r1.stderr), `run.mjs under z3 5.3.2: exit ${r1.status}, ${r1.out.trim().split('\n').slice(-3).join(' / ')}`);
  const r2 = node('tests/run.mjs', probe, { LEAN_Z3: z3Good, LC_ALL: 'fr_BE.UTF-8', LEAN_PIN: '' });
  expect(r2.status === 2 && /fr_BE\.UTF-8/.test(r2.stderr) && /refus/.test(r2.stderr), `run.mjs under LC_ALL=fr_BE.UTF-8: exit ${r2.status}, ${r2.out.trim().split('\n').slice(-3).join(' / ')}`);
  const r3 = node('tests/run.mjs', probe, { LEAN_Z3: z3Bad, LC_ALL: 'fr_BE.UTF-8', LEAN_PIN: 'warn' });
  expect(r3.status !== 2 && /5\.3\.2/.test(r3.stderr) && /fr_BE\.UTF-8/.test(r3.stderr) && !/refus/.test(r3.stderr), `run.mjs under LEAN_PIN=warn: exit ${r3.status}, ${r3.out.trim().split('\n').slice(-3).join(' / ')}`);
  const r4 = node('tests/run.mjs', probe, { LEAN_Z3: z3Good, LC_ALL: 'C.UTF-8', LEAN_PIN: '' });
  expect(!/4\.12\.1/.test(r4.stderr) && !/refus/.test(r4.stderr), `run.mjs under the pin named a problem: ${r4.stderr.trim().split('\n').slice(0, 3).join(' / ')}`);
  // 3. pr.mjs warns, first: with no --base it then prints its usage and exits 2
  const p1 = node('pr.mjs', [], { LEAN_Z3: z3Bad, LC_ALL: 'fr_BE.UTF-8', LEAN_PIN: '' });
  const first = p1.stderr.split('\n')[0] ?? '';
  expect(/5\.3\.2/.test(p1.stderr) && /fr_BE\.UTF-8/.test(p1.stderr) && /^lean: warning/.test(first) && /usage: pr\.mjs/.test(p1.stderr), `pr.mjs under z3 5.3.2 and fr_BE: exit ${p1.status}, ${p1.stderr.trim().split('\n').join(' / ').slice(0, 400)}`);
} finally { fs.rmSync(dir, { recursive: true, force: true }); }

if (bad.length) { console.log(`pin: ${bad.length} wrong\n  ${bad.join('\n  ')}`); process.exit(1); }
console.log('pin: run.mjs refuses and pr.mjs warns on a Z3 other than 4.12.1 and an LC_ALL other than en_US.UTF-8 or C.UTF-8');
