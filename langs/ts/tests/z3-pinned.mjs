#!/usr/bin/env node
// One Z3 for lean (solve/z3.mjs): the doubles reading runs it, Dafny verifies with it, and the certificate names it.
// 1. The default lookup, one unit through both (number-bearing, then Dafny): lanes.A.doubles.solverVersion and
//    tools.z3 are the same text, the version of the binary the lookup names.
// 2. LEAN_Z3 names a wrapper that logs each run and execs that binary: the doubles record and tools name the wrapper,
//    and the wrapper's log holds both the doubles query and Dafny's run, so the binary named is the binary that ran.
// Exit 1 on any difference.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const lean = path.resolve(here, '..');
const { z3Binary } = await import(path.join(lean, 'solve/z3.mjs'));

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-z3-pinned-'));
const bad = [];
const expect = (ok, what) => { if (!ok) bad.push(what); };
try {
  // a unit the doubles reading encodes (two numbers, exact operations) and whose verdict Dafny gives
  const parent = path.join(dir, 'parent.ts'), candidate = path.join(dir, 'candidate.ts');
  fs.writeFileSync(parent, 'export function f(a: number, b: number): number { return a + b; }\n');
  fs.writeFileSync(candidate, 'export function f(a: number, b: number): number { return b + a; }\n');
  const checkOnce = (env, tag) => {
    const out = path.join(dir, `verdict-${tag}.json`);
    const r = spawnSync(process.execPath, [path.join(lean, 'check.mjs'), '--parent', parent, '--candidate', candidate, '--unit', 'f', '--n', '5', '--no-project', '--dafny-seconds', '30', '--out', out], { encoding: 'utf8', env });
    if (r.status !== 0 && !fs.existsSync(out)) { bad.push(`${tag}: check.mjs exit ${r.status}: ${((r.stdout ?? '') + (r.stderr ?? '')).slice(-400)}`); return null; }
    return JSON.parse(fs.readFileSync(out, 'utf8')).certificate;
  };

  const env0 = { ...process.env }; delete env0.LEAN_Z3;
  const saved = process.env.LEAN_Z3; delete process.env.LEAN_Z3;
  const z = z3Binary();
  if (saved !== undefined) process.env.LEAN_Z3 = saved;
  expect(z.path && z.version, `the default lookup found no Z3: ${z.source}`);

  const c0 = checkOnce(env0, 'default');
  if (c0) {
    const d = c0.lanes?.A?.doubles, t = c0.tools;
    expect(!!d?.query, `default: the doubles reading did not run Z3: ${JSON.stringify(d)}`);
    expect(t && t.z3, `default: no tools.z3: ${JSON.stringify(t)}`);
    expect(d?.solverVersion === t?.z3, `default: doubles ran ${d?.solverVersion}, tools records ${t?.z3}`);
    expect(t?.z3 === z.version, `default: tools records ${t?.z3}, the lookup names ${z.version} (${z.path})`);
    expect(d?.solverPath === z.path && t?.z3Path === z.path, `default: paths ${d?.solverPath}, ${t?.z3Path}, the lookup ${z.path}`);
  }

  if (z.path) {
    const log = path.join(dir, 'runs.log'), wrap = path.join(dir, 'z3-wrapper');
    fs.writeFileSync(wrap, `#!/bin/sh\nprintf '%s\\n' "$*" >> '${log}'\nexec '${z.path}' "$@"\n`, { mode: 0o755 });
    const c1 = checkOnce({ ...env0, LEAN_Z3: wrap }, 'pinned');
    if (c1) {
      const d = c1.lanes?.A?.doubles, t = c1.tools;
      const runs = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').split('\n').filter(Boolean) : [];
      expect(d?.solverPath === wrap && d?.solverVersion === z.version, `pinned: doubles names ${d?.solverPath} ${d?.solverVersion}`);
      expect(t?.z3Path === wrap && t?.z3Source === 'LEAN_Z3' && t?.z3 === z.version, `pinned: tools ${JSON.stringify(t)}`);
      expect(d?.query && runs.some((l) => l.includes(d.query)), `pinned: the doubles query ${d?.query} did not run through LEAN_Z3: ${JSON.stringify(runs)}`);
      expect(c1.lanes?.A?.dafny && runs.some((l) => !l.includes('--version') && !(d?.query && l.includes(d.query))), `pinned: Dafny did not run through LEAN_Z3 (${c1.lanes?.A?.dafny}): ${JSON.stringify(runs)}`);
    }
  }
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
if (bad.length) { for (const b of bad) console.error(`FAIL ${b}`); process.exit(1); }
console.log('z3-pinned: the doubles reading and Dafny run the Z3 the certificate names, by default and under LEAN_Z3');
