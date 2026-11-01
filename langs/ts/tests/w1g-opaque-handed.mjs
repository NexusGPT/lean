#!/usr/bin/env node
// The w1g checks a pair row cannot hold (design/w1g-opaque-handed.md): each case stays refused, and a refused unit stops
// its file, so no pair can list it beside graded units. The pairs opaque_read_after_call, opaque_copied_argument and
// opaque_type_assertion carry their own break rows (tests/break.mjs, the pair runner).
//   node langs/ts/tests/w1g-opaque-handed.mjs            every case is refused by its rule
//   node langs/ts/tests/w1g-opaque-handed.mjs --break    each case with its mechanism switched off (LEAN_BREAK): it is
//                                                        translated, so every check must go red
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const brk = process.argv.includes('--break');
const CASES = [
  { name: 'a held value handed to a same-file callee with a body', mechanism: 'outside-slot', rule: 'type-assertion',
    text: 'function inc(n: number): number {\n  return n + 1;\n}\nfunction back(n: number): number {\n  return inc(n) - 1;\n}\nexport function viaCallee(x: unknown): number {\n  return back(x as number);\n}\n' },
  { name: 'a collection a call was handed, changed after the call', mechanism: 'unhanded-collection', rule: 'read-after-call',
    text: 'export type Box = { n: number };\nexport function grow(keep: (xs: Box[]) => void, report: () => number, b: Box): number {\n  const xs: Box[] = [];\n  keep(xs);\n  xs.push(b);\n  return report();\n}\n' },
];
let bad = 0;
for (const c of CASES) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'w1g-case-'));
  const f = path.join(dir, 'case.ts');
  fs.writeFileSync(f, c.text);
  const env = { ...process.env };
  if (brk) env.LEAN_BREAK = c.mechanism; else delete env.LEAN_BREAK;
  const r = spawnSync('node', [path.join(here, '..', 'translate', 'translate.mjs'), f, '--core', '--heap', '--no-project', '--out', path.join(dir, 'c.dfy'), '--prelude', path.join(dir, 'c.pre.dfy')], { encoding: 'utf8', env });
  const refused = r.status !== 0 && new RegExp(c.rule).test((r.stdout ?? '') + (r.stderr ?? ''));
  fs.rmSync(dir, { recursive: true, force: true });
  if (!refused) bad++;
  console.log(`${refused ? 'ok  ' : 'FAIL'} ${c.name}${brk ? ` (LEAN_BREAK=${c.mechanism})` : ''}: ${refused ? `refused ${c.rule}` : `translated (exit ${r.status})`}`);
}
process.exit(bad ? 1 : 0);
