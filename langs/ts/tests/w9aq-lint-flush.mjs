#!/usr/bin/env node
// lane w9aq: the lint's --json reaches its reader whole. The command line used to end on process.exit right after printing;
// on a pipe that ends the process before a large stdout is written out, and the rule differential of the DA harness read
// a cut JSON as a tool error (2026-11-03: 986 lint outputs of the calibration corpus's rule step lost so, across its dev
// PRs). Now it waits for stdout to drain and exits with the same code.
//
//   node tests/w9aq-lint-flush.mjs            the check
//   node tests/w9aq-lint-flush.mjs --break    the same with LEAN_BREAK=lint-flush (the old exit): must go red
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const lint = path.join(here, '..', 'lint', 'lint.mjs');

function check(env) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'w9aq-flush-'));
  try {
    // 600 units, each outside the subset (it reads `arguments`): an output of several hundred kilobytes
    const n = 600, f = path.join(d, 'many.ts');
    fs.writeFileSync(f, Array.from({ length: n }, (_, i) => `export function f${i}(a: number): number { return arguments.length + a; }\n`).join(''));
    const r = spawnSync(process.execPath, [lint, f, '--json', '--advice', '--no-project'], { encoding: 'utf8', env, maxBuffer: 1 << 30 });
    let rows = null;
    try { rows = JSON.parse(r.stdout); } catch { rows = null; }
    const units = rows ? new Set(rows.map((x) => x.unit)).size : 0;
    const rowsOk = !!rows && units === n;
    console.log(`exit ${r.status} (want 1); stdout ${r.stdout.length} bytes; JSON parses: ${!!rows}; units with a finding: ${units} of ${n}`);
    return r.status === 1 && rowsOk;
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
}

if (process.argv.includes('--break')) {
  const ok = check({ ...process.env, LEAN_BREAK: 'lint-flush' });
  console.log(ok ? 'GREEN (missed): the break did not cut the output' : 'RED (caught): without the drain the output is cut');
  process.exit(ok ? 1 : 0);
}
const ok = check(process.env);
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 1);
