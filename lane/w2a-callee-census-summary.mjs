#!/usr/bin/env node
// Per root of one population of --callees runs: units, entered, environment-blocked, language-refused, callee-only units,
// the install's status, the seconds (w2a-callee-census lane, 2026-11-01).
//   node lane/w2a-callee-census-summary.mjs <runs-dir>
import fs from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
const rows = [];
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (r.complete === false || r.partial) { rows.push(`| ${f.replace(/\.json$/, '')} | partial | | | | | | |`); continue; }
  const t = r.calleeTable, st = r.environment?.install;
  rows.push(`| ${f.replace(/\.json$/, '')} | ${r.units} | ${r.entered} | ${r.environmentBlocked} | ${r.languageRefused} | ${t.calleeOnly} | ${st?.status ?? ''}${st?.manager ? ` (${st.manager})` : ''} | ${r.seconds} |`);
}
console.log(['| Root | Units | Entered | Environment-blocked | Language-refused | Callee-only | Install | Seconds |', '| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |', ...rows].join('\n'));
