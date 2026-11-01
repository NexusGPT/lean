#!/usr/bin/env node
// The w1e pairs and their breaks (design/w1e-opaque-this-globals.md).
//   node langs/ts/tests/w1e-opaque-this-globals.mjs            each pair passes with its mechanism
//   node langs/ts/tests/w1e-opaque-this-globals.mjs --break    each pair, its mechanism switched off (LEAN_BREAK), must fail
// A mechanism the pair does not need would leave the pair green under --break: the test then fails, so every pair
// is shown to rest on the mechanism it names.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PAIRS = {
  opaque_this: 'lexical-this',
  opaque_global_read: 'unresolved-global',
  opaque_ts_strict: 'incomplete-member',
  opaque_toplevel_effect: 'effectful-cell',
};
const brk = process.argv.includes('--break');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
let bad = 0;
for (const [pair, mechanism] of Object.entries(PAIRS)) {
  if (only.length && !only.includes(pair)) continue;
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
console.log(bad ? `${bad} pair(s) wrong` : brk ? 'every break turns its pair red' : 'every pair green');
process.exit(bad ? 1 : 0);
