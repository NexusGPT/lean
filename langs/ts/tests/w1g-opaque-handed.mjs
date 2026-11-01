#!/usr/bin/env node
// The one w1g check a pair row cannot hold (design/w1g-opaque-handed.md): a value whose type nothing checked, handed to
// a same-file callee with a body, stays refused type-assertion (the callee reads its parameter as declared; a refused
// unit stops its file, so no pair can list it beside graded units). The pairs opaque_read_after_call,
// opaque_copied_argument and opaque_type_assertion carry their own break rows (tests/break.mjs, the pair runner).
//   node langs/ts/tests/w1g-opaque-handed.mjs            the callee case is refused
//   node langs/ts/tests/w1g-opaque-handed.mjs --break    LEAN_BREAK=outside-slot takes every callee for the outside:
//                                                        the case is translated, so the check must go red
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const brk = process.argv.includes('--break');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'w1g-slot-'));
const f = path.join(dir, 'callee.ts');
fs.writeFileSync(f, 'function inc(n: number): number {\n  return n + 1;\n}\nfunction back(n: number): number {\n  return inc(n) - 1;\n}\nexport function viaCallee(x: unknown): number {\n  return back(x as number);\n}\n');
const env = { ...process.env };
if (brk) env.LEAN_BREAK = 'outside-slot'; else delete env.LEAN_BREAK;
const r = spawnSync('node', [path.join(here, '..', 'translate', 'translate.mjs'), f, '--core', '--no-project', '--out', path.join(dir, 'c.dfy'), '--prelude', path.join(dir, 'c.pre.dfy')], { encoding: 'utf8', env });
const text = (r.stdout ?? '') + (r.stderr ?? '');
const refused = r.status !== 0 && /type-assertion/.test(text);
fs.rmSync(dir, { recursive: true, force: true });
console.log(`${refused ? 'ok  ' : 'FAIL'} a held value handed to a same-file callee with a body${brk ? ' (LEAN_BREAK=outside-slot)' : ''}: ${refused ? 'refused type-assertion' : `translated (exit ${r.status})`}`);
process.exit(refused ? 0 : 1);
