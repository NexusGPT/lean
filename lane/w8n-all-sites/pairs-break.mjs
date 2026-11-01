// The site pairs under each break (design/w8n-all-sites.md): tests/pr-pair.mjs prPair on three_sites, field_sites and
// two_sites, plain and under LEAN_BREAK=w8n-all-sites, w8n-fields and w7a-witnesses. Prints one line per check.
//   node lane/w8n-all-sites/pairs-break.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const { prPair } = await import(path.join(here, '../../langs/ts/tests/pr-pair.mjs'));
const pairs = path.join(here, '../../langs/ts/tests/pairs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'w8n-pairs-'));
let bad = 0;
for (const brk of ['', 'w8n-all-sites', 'w8n-fields', 'w7a-witnesses']) for (const pair of ['three_sites', 'field_sites', 'two_sites']) {
  const rows = await prPair(path.join(pairs, pair), { tmp, env: brk ? { LEAN_BREAK: brk } : {} });
  const ok = rows.every((r) => r.ok); if (!brk && !ok) bad++;
  console.log(`LEAN_BREAK=${brk || '(none)'} ${pair}: ${ok ? 'PASS' : 'RED'}`);
  for (const r of rows) if (!r.ok || /site|line/.test(r.check)) console.log(`  ${r.ok ? 'ok ' : 'NO '} ${r.check}: ${r.detail ?? ''}`);
}
process.exit(bad ? 1 : 0);
