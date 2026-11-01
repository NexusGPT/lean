#!/usr/bin/env node
// The opacity ladder of the statement and expression rules (design/w1b-opaque-statements.md): every pair
// tests/pairs/opaque_<rule>/ (written by tests/opaque-statements-pairs.mjs) and tests/pairs/opaque_statement_mechanisms/
// through the suite's pair runner, both lanes: the construct unchanged and a change outside it PASS-proved with the
// step listed; a change inside not proved and lane B's WITNESS; a planted mutate.mjs change inside a WITNESS; a change
// outside that flows through what the step reads, writes or reaches not proved.
//   node tests/opaque-statements.mjs                      exit 0 when every row passes
//   node tests/opaque-statements.mjs --break <mechanism>  the mechanism removed for the whole run (LEAN_BREAK, tests/break.mjs,
//                                                         the one convention); the rows it guards must go red, and the
//                                                         run exits 1 naming them (exit 3: it did not bite)
//   node tests/opaque-statements.mjs --break all          each mechanism in turn
// Each pair's own `break` rows (tests/run.mjs) check the same flips inside the ordinary run. The mechanisms and the
// units whose `not proved` row each guards (a false PASS-proved without it):
//   opaque-drop-read     the first read of a step (its read-only values first)   upstream (every rule's pair)
//   opaque-drop-write    the first name a step writes                            stale (opaque_statement_mechanisms)
//   opaque-drop-callees  the reached callees' texts and the CALLS guard          callee (opaque_statement_callee, per unit)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ENVELOPE } from '../translate/opaque-statements.mjs';
import { BREAK_ENV, MECHANISMS } from './break.mjs'; // the one --break convention (A6)

const here = path.dirname(fileURLToPath(import.meta.url));
const GUARDS = { 'opaque-drop-read': 'upstream', 'opaque-drop-write': 'stale', 'opaque-drop-callees': 'callee' }; // opaque-drop-sharing has no guarded row: the heap identity guard refuses first (design/w1b-opaque-statements.md)
// the row a guarded unit fails on: its `not proved` row, or, checked per unit (opaque_statement_refused), its verdict row
const guardRow = (unit) => new RegExp(`Equal_${unit} not proved|candidate\\.ts ${unit} `);
const bi = process.argv.indexOf('--break');
const BREAK = bi >= 0 ? (process.argv[bi + 1] ?? 'all') : null;
for (const m of Object.keys(GUARDS)) if (!MECHANISMS[m]) throw new Error(`${m} is not registered in tests/break.mjs`);
if (BREAK && BREAK !== 'all' && !GUARDS[BREAK]) { console.error(`--break: one of ${Object.keys(GUARDS).join(', ')}, all`); process.exit(2); }
// this family's pairs: an opaque_<rule> pair whose rules are graded here (opaque-statements.mjs ENVELOPE), and the
// opaque_statement_* pairs of its mechanisms; another lane's opaque pairs are its own test's
const expectOf = (n) => { const f = path.join(here, 'pairs', n, 'expect.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const pairs = fs.readdirSync(path.join(here, 'pairs')).filter((n) => { const e = /^opaque_/.test(n) ? expectOf(n) : null; return !!e?.opaque && (/^opaque_statement_/.test(n) || Object.values(e.opaque).flat().some((r) => r in ENVELOPE)); }).sort();

// a mechanism's run reads the pairs that hold its guarded unit only (in the scope, or checked per unit)
const holds = (n, unit) => { const e = expectOf(n); return (e.scope ?? []).includes(unit) || (e.candidateOnly ?? []).some((c) => c.unit === unit); };
function runOnce(mechanism) {
  const these = mechanism ? pairs.filter((n) => holds(n, GUARDS[mechanism])) : pairs;
  const env = { ...process.env, LEAN_PAIRS: these.join(','), JOBS: String(Math.min(4, Number(process.env.JOBS ?? 4))), ...(mechanism ? { [BREAK_ENV]: mechanism, LEAN_STEP_CACHE: '0' } : {}) };
  const r = spawnSync('node', [path.join(here, 'run.mjs')], { env, encoding: 'utf8', maxBuffer: 1 << 28 });
  const out = (r.stdout ?? '') + (r.stderr ?? '');
  const rows = out.split('\n').filter((l) => /^\|\s*pair\s*\|\s*opaque_/.test(l)); // the runner pads its columns
  const log = path.join(os.tmpdir(), `opaque-statements${mechanism ? '-' + mechanism : ''}.log`); fs.writeFileSync(log, out); console.log(`full output: ${log}`);
  const failed = rows.filter((l) => /\|\s*FAIL\s*\|/.test(l));
  if (!rows.length) { console.log(out.trim().split('\n').slice(-20).join('\n')); process.exit(2); }
  return { rows, failed };
}

if (!BREAK) {
  const { rows, failed } = runOnce(null);
  for (const l of failed) console.log(l.replace(/\s+\|/g, ' |').slice(0, 220));
  console.log(`${pairs.length} pairs, ${rows.length} rows, ${failed.length} failed`);
  process.exit(failed.length ? 1 : 0);
}
let bit = 0;
const mechanisms = BREAK === 'all' ? Object.keys(GUARDS) : [BREAK];
for (const m of mechanisms) {
  const { rows, failed } = runOnce(m);
  const guarded = failed.filter((l) => guardRow(GUARDS[m]).test(l));
  for (const l of guarded) console.log(`${m}: ${l.replace(/\s+\|/g, ' |').slice(0, 200)}`);
  console.log(`--break ${m}: ${pairs.filter((n) => holds(n, GUARDS[m])).length} pairs, ${rows.length} rows, ${failed.length} failed, ${guarded.length} \`${GUARDS[m]}\` units proved falsely without the mechanism`);
  if (guarded.length) bit++;
}
process.exit(bit === mechanisms.length ? 1 : 3);
