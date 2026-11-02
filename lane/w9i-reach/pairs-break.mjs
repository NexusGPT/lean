// The reach pairs and the earlier site pairs under each break (design/w9i-reach.md): tests/pr-pair.mjs prPair, plain and
// under LEAN_BREAK=w9i-reach (and the w8n and w7a breaks, which must still go red on their own pairs). One line per check.
//   node lane/w9i-reach/pairs-break.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const { prPair } = await import(path.join(here, '../../langs/ts/tests/pr-pair.mjs'));
const pairs = path.join(here, '../../langs/ts/tests/pairs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'w9i-pairs-'));
const REACH = ['reach_statements', 'reach_site', 'reach_lead', 'reach_lead_site'], SITES = ['three_sites', 'field_sites', 'two_sites'];
const runs = [['', [...REACH, ...SITES]], ['w9i-reach', REACH], ['w8n-all-sites', ['three_sites', 'field_sites']], ['w8n-fields', ['field_sites']], ['w7a-witnesses', ['two_sites']]];
let bad = 0;
for (const [brk, list] of runs) for (const pair of list) {
  const rows = await prPair(path.join(pairs, pair), { tmp, env: brk ? { LEAN_BREAK: brk } : {} });
  const ok = rows.every((r) => r.ok);
  if (brk ? ok : !ok) bad++; // plain: every pair green; under a break: every listed pair red
  console.log(`LEAN_BREAK=${brk || '(none)'} ${pair}: ${ok ? 'PASS' : 'RED'}`);
  for (const r of rows) if (!r.ok || /site|line|lead|completed/.test(r.check)) console.log(`  ${r.ok ? 'ok ' : 'NO '} ${r.check}: ${r.detail ?? ''}`);
}
console.log(bad ? `${bad} unexpected` : 'every pair green plain, red under its break');
process.exit(bad ? 1 : 0);
