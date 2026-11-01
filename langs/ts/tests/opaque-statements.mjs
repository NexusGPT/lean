#!/usr/bin/env node
// The opacity ladder of the statement and expression rules (design/w1b-opaque-statements.md): every pair
// tests/pairs/opaque_<rule>/ (written by tests/opaque-statements-pairs.mjs) and tests/pairs/opaque_statement_mechanisms/
// through the suite's pair runner, both lanes: the construct unchanged and a change outside it PASS-proved with the
// step listed; a change inside not proved and lane B's WITNESS; a planted mutate.mjs change inside a WITNESS; a change
// outside that flows through what the step reads, writes or reaches not proved.
//   node tests/opaque-statements.mjs                      exit 0 when every row passes
//   node tests/opaque-statements.mjs --break <mechanism>  the mechanism removed (translate/opaque.mjs's LEAN_OPAQUE_BREAK,
//                                                         read by translate.mjs opaqueStep); the rows it guards must go
//                                                         red, and the run exits 1 naming them (exit 3: it did not bite)
//   node tests/opaque-statements.mjs --break all          each mechanism in turn
// The mechanisms and the units whose `not proved` row each guards (a false PASS-proved without it):
//   drop-read     one read the step takes and does not write          upstream (every rule's pair)
//   drop-write    every name the step writes                          stale (opaque_statement_mechanisms)
//   drop-callees  the reached callees' texts and the CALLS guard      callee (opaque_statement_mechanisms)
//   drop-sharing  no shared object when the step changes or compares  identity (opaque_statement_refused)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ENVELOPE } from '../translate/opaque-statements.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const GUARDS = { 'drop-read': 'upstream', 'drop-write': 'stale', 'drop-callees': 'callee', 'drop-sharing': 'identity' };
// the row a guarded unit fails on: its `not proved` row, or, checked per unit (opaque_statement_refused), its verdict row
const guardRow = (unit) => new RegExp(`Equal_${unit} not proved|candidate\\.ts ${unit} `);
const bi = process.argv.indexOf('--break');
const BREAK = bi >= 0 ? (process.argv[bi + 1] ?? 'all') : null;
if (BREAK && BREAK !== 'all' && !GUARDS[BREAK]) { console.error(`--break: one of ${Object.keys(GUARDS).join(', ')}, all`); process.exit(2); }
// this family's pairs: an opaque_<rule> pair whose rules are graded here (opaque-statements.mjs ENVELOPE), and the
// opaque_statement_* pairs of its mechanisms; another lane's opaque pairs are its own test's
const expectOf = (n) => { const f = path.join(here, 'pairs', n, 'expect.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const pairs = fs.readdirSync(path.join(here, 'pairs')).filter((n) => { const e = /^opaque_/.test(n) ? expectOf(n) : null; return !!e?.opaque && (/^opaque_statement_/.test(n) || Object.values(e.opaque).flat().some((r) => r in ENVELOPE)); }).sort();

function runOnce(mechanism) {
  const env = { ...process.env, LEAN_PAIRS: pairs.join(','), JOBS: String(Math.min(4, Number(process.env.JOBS ?? 4))), ...(mechanism ? { LEAN_OPAQUE_BREAK: mechanism, LEAN_STEP_CACHE: '0' } : {}) };
  const r = spawnSync('node', [path.join(here, 'run.mjs')], { env, encoding: 'utf8', maxBuffer: 1 << 28 });
  const out = (r.stdout ?? '') + (r.stderr ?? '');
  const rows = out.split('\n').filter((l) => /^\| pair \| opaque_/.test(l));
  const failed = rows.filter((l) => /\| FAIL \|/.test(l));
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
  console.log(`--break ${m}: ${pairs.length} pairs, ${rows.length} rows, ${failed.length} failed, ${guarded.length} \`${GUARDS[m]}\` units proved falsely without the mechanism`);
  if (guarded.length) bit++;
}
process.exit(bit === mechanisms.length ? 1 : 3);
