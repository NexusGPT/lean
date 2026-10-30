#!/usr/bin/env node
// The finite explorer reports ASK, naming the error, when every handler it fired threw the same error on both sides
// (design/microtask-worker.md, 2026-10-30). Fixture tests/fixtures/same-error: Copier's only handler reaches a global
// the sandbox does not hold (ASK; it read PASS-decided before), Partial has one handler that throws and one that runs
// (PASS-decided), Toggle throws nothing (PASS-decided).
//   node tests/same-error.mjs        exit 0 when every row holds, 1 otherwise
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const here = path.dirname(new URL(import.meta.url).pathname), fx = path.join(here, 'fixtures/same-error');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lean-same-error-'));
const rows = [['Copier', 'ASK', 'every explored handler threw the same error on both sides (ReferenceError: missingClipboard is not defined'], ['Partial', 'PASS-decided', null], ['Toggle', 'PASS-decided', null]];
let failed = 0;
for (const [unit, verdict, reason] of rows) {
  const out = path.join(tmp, `${unit}.json`);
  const r = spawnSync(process.execPath, [path.join(here, '../exec/run.mjs'), '--parent', path.join(fx, 'parent.tsx'), '--candidate', path.join(fx, 'candidate.tsx'), '--unit', unit, '--n', '30', '--no-project', '--out', out], { encoding: 'utf8' });
  let got = {}; try { got = JSON.parse(fs.readFileSync(out, 'utf8')); } catch { got = { verdict: 'no result', reason: (r.stdout + r.stderr).slice(-300) }; }
  const ok = got.verdict === verdict && (!reason || String(got.reason ?? '').includes(reason));
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${unit} ${verdict}: got ${got.verdict}${got.reason ? ' (' + String(got.reason).slice(0, 200) + ')' : ''}`);
}
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
