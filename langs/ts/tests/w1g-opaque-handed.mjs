#!/usr/bin/env node
// The w1g pairs and their breaks (design/w1g-opaque-handed.md).
//   node langs/ts/tests/w1g-opaque-handed.mjs            each pair passes with its mechanism
//   node langs/ts/tests/w1g-opaque-handed.mjs --break    each pair, one mechanism switched off (LEAN_BREAK), must fail
// A mechanism the pair does not need would leave the pair green under --break: the test then fails, so every pair
// is shown to rest on the mechanism it names. Each break is a change outside the graded construct whose effect flows
// through what the mechanism reads: the world the handle is read from (handle-value), the holder's reach
// (reach-closure), which handed parts are new (handed-skeleton), the value an outside slot hands (assertion-read).
// One more check, by translation: a same-file callee with a body reads its parameter as declared, so a value whose
// type nothing checked handed to it stays refused; LEAN_BREAK=outside-slot takes every callee for the outside and
// that check must go red.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const RUNS = [
  ['opaque_read_after_call', 'handle-value'],
  ['opaque_read_after_call', 'reach-closure'],
  ['opaque_copied_argument', 'handed-skeleton'],
  ['opaque_type_assertion', 'assertion-read'],
];
const brk = process.argv.includes('--break');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
let bad = 0;
const seen = new Set();
for (const [pair, mechanism] of RUNS) {
  if (only.length && !only.includes(pair)) continue;
  if (!brk && seen.has(pair)) continue; // without a break each pair runs once
  seen.add(pair);
  const env = { ...process.env, ...(brk ? { LEAN_BREAK: mechanism } : {}) };
  delete env.LEAN_PAIRS;
  const r = spawnSync('node', [path.join(here, 'run.mjs'), '--pair', pair], { encoding: 'utf8', env, maxBuffer: 1 << 26 });
  const out = (r.stdout ?? '') + (r.stderr ?? '');
  const total = /\| TOTAL \| (\d+) checks \| (?:(\d+) FAILED|ALL PASS)/.exec(out);
  const failed = total ? Number(total[2] ?? 0) : null;
  const ok = failed !== null && (brk ? failed > 0 : failed === 0);
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${pair}${brk ? ` (LEAN_BREAK=${mechanism})` : ''}: ${total ? `${total[1]} checks, ${failed} failed` : 'no TOTAL line'}`);
  if (!ok || brk) for (const ln of out.split('\n').filter((l) => /\| FAIL \|/.test(l)).slice(0, 8)) console.log(`     ${ln.replace(/\s+/g, ' ').slice(0, 200)}`);
}
// the callee exclusion of the outside slot, by translation
if (!only.length || only.includes('outside-slot')) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'w1g-slot-'));
  const f = path.join(dir, 'callee.ts');
  fs.writeFileSync(f, 'function inc(n: number): number {\n  return n + 1;\n}\nfunction back(n: number): number {\n  return inc(n) - 1;\n}\nexport function viaCallee(x: unknown): number {\n  return back(x as number);\n}\n');
  const env = { ...process.env, ...(brk ? { LEAN_BREAK: 'outside-slot' } : {}) };
  const r = spawnSync('node', [path.join(here, '..', 'translate', 'translate.mjs'), f, '--core', '--no-project', '--out', path.join(dir, 'c.dfy'), '--prelude', path.join(dir, 'c.pre.dfy')], { encoding: 'utf8', env });
  const refused = /type-assertion/.test((r.stdout ?? '') + (r.stderr ?? '')) && r.status !== 0;
  const ok = brk ? !refused : refused;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} outside-slot callee${brk ? ' (LEAN_BREAK=outside-slot)' : ''}: ${refused ? 'refused type-assertion' : 'translated'}`);
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(bad ? `${bad} check(s) wrong` : brk ? 'every break turns its check red' : 'every check green');
process.exit(bad ? 1 : 0);
