#!/usr/bin/env node
// The opacity ladder of the statement and expression rules (design/w1b-opaque-statements.md): every pair
// tests/pairs/opaque_<rule>/ (written by tests/opaque-statements-pairs.mjs) through the suite's pair runner, both lanes:
// the construct unchanged and a change outside it PASS-proved with the step listed; a change inside not proved and lane
// B's WITNESS; a planted mutate.mjs change inside a WITNESS; a change upstream of a value the step reads not proved.
//   node tests/opaque-statements.mjs            exit 0 when every row passes
//   node tests/opaque-statements.mjs --break    the mechanism removed: every site's step loses one read it does not write
//                                               (translate.mjs LEAN_OPAQUE_BREAK=reads), so the `upstream` units prove
//                                               falsely; this run must go red, naming those rows
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const BREAK = process.argv.includes('--break');
const pairs = fs.readdirSync(path.join(here, 'pairs')).filter((n) => /^opaque_/.test(n) && fs.existsSync(path.join(here, 'pairs', n, 'expect.json')) && JSON.parse(fs.readFileSync(path.join(here, 'pairs', n, 'expect.json'), 'utf8')).opaque).sort();
const env = { ...process.env, LEAN_PAIRS: pairs.join(','), JOBS: String(Math.min(4, Number(process.env.JOBS ?? 4))), ...(BREAK ? { LEAN_OPAQUE_BREAK: 'reads', LEAN_STEP_CACHE: '0' } : {}) };
const r = spawnSync('node', [path.join(here, 'run.mjs')], { env, encoding: 'utf8', maxBuffer: 1 << 28 });
const out = (r.stdout ?? '') + (r.stderr ?? '');
const rows = out.split('\n').filter((l) => /^\| pair \| opaque_/.test(l));
const failed = rows.filter((l) => /\| FAIL \|/.test(l));
for (const l of failed) console.log(l.replace(/\s+\|/g, ' |').slice(0, 220));
const flipped = failed.filter((l) => /Equal_upstream not proved/.test(l)).length;
console.log(`${BREAK ? '--break: ' : ''}${pairs.length} pairs, ${rows.length} rows, ${failed.length} failed${BREAK ? `, ${flipped} upstream units proved falsely without the read` : ''}`);
if (!rows.length) { console.log(out.trim().split('\n').slice(-20).join('\n')); process.exit(2); }
process.exit(failed.length ? 1 : 0);
