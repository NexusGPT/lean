#!/usr/bin/env node
// The w9q pairs and their breaks: the cause left behind the parent-load failures w9j fixed, each class a pair.
//   node langs/ts/tests/w9q-parent-load-rest.mjs            each pair passes with its mechanisms
//   node langs/ts/tests/w9q-parent-load-rest.mjs --break    each pair once per mechanism, that mechanism switched off
//                                                      (LEAN_BREAK=<mechanism>, read by the code under test): every one must
//                                                      turn its pair red
// A mechanism the pair does not need would leave the pair green under --break: the test then fails, so every pair is
// shown to rest on each mechanism it names.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const PAIRS = {
  w9q_regex_literal_brace: ['regex-literal-brace'],
};
const brk = process.argv.includes('--break');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
let bad = 0;
for (const [pair, mechanisms] of Object.entries(PAIRS)) {
  if (only.length && !only.includes(pair)) continue;
  for (const mechanism of brk ? mechanisms : [null]) {
    const env = { ...process.env, ...(mechanism ? { LEAN_BREAK: mechanism } : {}) };
    delete env.LEAN_PAIRS;
    const r = spawnSync('node', [path.join(here, 'run.mjs'), '--pair', pair], { encoding: 'utf8', env, maxBuffer: 1 << 26 });
    const out = (r.stdout ?? '') + (r.stderr ?? '');
    const total = /\| TOTAL \| (\d+) checks \| (?:(\d+) FAILED|ALL PASS)/.exec(out);
    const failed = total ? Number(total[2] ?? 0) : null;
    const ok = failed !== null && (mechanism ? failed > 0 : failed === 0);
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${pair}${mechanism ? ` (LEAN_BREAK=${mechanism})` : ''}: ${total ? `${total[1]} checks, ${failed} failed` : `no TOTAL line (exit ${r.status})`}`);
    if (!ok || mechanism) for (const ln of out.split('\n').filter((l) => /\| FAIL \|/.test(l)).slice(0, 8)) console.log(`     ${ln.replace(/\s+/g, ' ').slice(0, 220)}`);
  }
}
console.log(bad ? `${bad} run(s) wrong` : brk ? 'every break turns its pair red' : 'every pair green');
process.exit(bad ? 1 : 0);
