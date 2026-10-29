// Render only saved measurements; this does not run a census or acquire its lock.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const dir = path.resolve('langs/ts/design/callback-units-evidence');
const report = '/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/lanes/callback-units.md';
const read = p => JSON.parse(fs.readFileSync(p));
const c = read(path.join(dir, 'compare.json'));
const cell = value => `<code>${JSON.stringify(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('|', '&#124;')}</code>`;
const cohorts = ['census ts', 'census js', 'bugsjs ts', 'bugsjs js'];
const totals = Object.fromEntries(cohorts.map(k => [k, { roots: 0, files: 0, before: 0, after: 0, predicted: 0, insideBefore: 0, insideAfter: 0 }]));
for (const row of c.rows.filter(r => r.language)) {
  const cohort = row.root.startsWith('bugsjs-') ? 'bugsjs' : 'census';
  const t = totals[`${cohort} ${row.language}`];
  for (const field of ['before', 'after', 'predicted']) t[field] += row[field];
  t.roots++;
  for (const phase of ['before', 'after']) {
    const l = read(path.join(dir, phase, row.root)).languages[row.language];
    t[phase === 'before' ? 'insideBefore' : 'insideAfter'] += l?.entered ?? 0;
    if (phase === 'after') t.files += l?.files ?? 0;
  }
}
for (const [key,t] of Object.entries(totals)) {
  const [cohort, language] = key.split(' ');
  const moves = c.attributionMoves.filter(r => r.root.startsWith(`${cohort}-`) && (/\.(js|jsx|mjs|cjs)$/.test(r.file) ? 'js' : 'ts') === language).length;
  assert.equal(t.after-t.before, t.predicted, `${key}: inventory gain`);
  assert.equal(t.insideAfter-t.insideBefore, (c.refusals[key]?.inside ?? 0)+moves, `${key}: admitted-unit accounting`);
}
const complete = c.rows.filter(r => r.status === 'pending').length === 0;
const lines = [
  `Measured snapshot: ${c.rows.filter(r => r.language === 'ts').length}/48 permitted roots complete. ${complete ? 'All permitted roots complete.' : 'The following totals cover completed roots only.'}`,
  '', '| Cohort | Roots | Files | Before units | After units | Gain | Prediction | Difference | Inside before → after |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---|',
];
for (const [cohort,t] of Object.entries(totals)) lines.push(`| ${cohort} | ${t.roots} | ${t.files} | ${t.before} | ${t.after} | ${t.after-t.before} | ${t.predicted} | ${t.after-t.before-t.predicted} | ${t.insideBefore} → ${t.insideAfter} |`);
lines.push('| langchainjs | — | — | — | awaits the census memory fix | — | TS 1802 + JS 24 | unmeasured | — |',
  `| attribution: a refusal inside a nested callback now belongs to the callback | — | — | ${c.moved.length} refused enclosing units | ${c.attributionMoves.length} admitted enclosing units | inventory gain 0 | separate attribution class | ${c.unexplainedMoves.length} unexplained admission changes | ${c.changedRules.length} still-refused units change first rule |`, '',
  `Every measured inventory gain equals its prior prediction. No old unit's admission/refusal changed except by the accepted attribution class. Missing old units: ${c.missing.length}; unreadable-file records: ${c.fileErrors.length}; unexplained first-rule changes: ${c.unexplainedRuleChanges.length}. These are census admissions, not independent verdicts: nested callbacks retain their enclosing unit's verdict.`, '',
  '### Per-root gains', '', '| Root | TS before → after (gain / prediction) | JS before → after (gain / prediction) |', '|---|---|---|');
for (const root of [...new Set(c.rows.map(r=>r.root))]) {
  const rows = c.rows.filter(r=>r.root===root), pending = rows.find(r=>r.status);
  const value = lang => { const r = rows.find(r=>r.language===lang); return r ? `${r.before} → ${r.after} (${r.gain} / ${r.predicted})` : `${pending.status}; prediction ${pending.prediction[lang]}`; };
  lines.push(`| ${cell(root)} | ${value('ts')} | ${value('js')} |`);
}
lines.push('', '### New callback units by first refusal', '', '| Rule | census TS | census JS | BugsJS TS | BugsJS JS |', '|---|---:|---:|---:|---:|');
const rules = [...new Set(Object.values(c.refusals).flatMap(Object.keys))].sort((a,b)=>a==='inside'?-1:b==='inside'?1:a.localeCompare(b));
for (const rule of rules) lines.push(`| ${rule} | ${cohorts.map(k=>c.refusals[k]?.[rule]??0).join(' | ')} |`);
lines.push('', '### Every attribution move', '', 'The findings below retain exactly the same line, rule and message. Only the owner changes. Diagnostic codes are shown where present; non-TypeScript findings show their rule. Source unit names are JSON-quoted for a single-line, reversible rendering.', '', '| Change | Root / file | Enclosing unit / range | Finding lines, codes and nested destination | Remaining refusal |', '|---|---|---|---|---|');
for (const [kind, rows] of [['refused → admitted', c.attributionMoves], ['still refused; first rule changes', c.ruleAttributions]]) for (const r of rows) {
  const byDestination = new Map();
  for (const f of r.findings) { const key = f.to; const items = byDestination.get(key) ?? []; items.push(`${f.line}: ${f.code??f.rule}`); byDestination.set(key,items); }
  const findings = [...byDestination].map(([to,items])=>`${items.join(', ')} → ${cell(to)}`).join('<br>');
  lines.push(`| ${kind} | ${cell(r.root)}<br>${cell(r.file)} | ${cell(r.unit)} / ${r.lines.join('–')} | ${findings} | ${r.afterRule??'none'}${r.retainedRules.length?`; retained: ${r.retainedRules.join(', ')}`:''} |`);
}
const block = lines.join('\n');
fs.writeFileSync(path.join(dir, 'report-tables.md'), block+'\n');
fs.writeFileSync(path.join(dir, 'report-summary.json'), JSON.stringify({ complete, totals, admissionMoves:c.moved.length, attributionMoves:c.attributionMoves.length, firstRuleChanges:c.changedRules.length, unexplainedMoves:c.unexplainedMoves.length, unexplainedRuleChanges:c.unexplainedRuleChanges.length }, null, 2)+'\n');
const old = fs.readFileSync(report,'utf8');
fs.writeFileSync(report, old.replace(/## Gain and refusal tables\n[\s\S]*?(?=\n## Commands and evidence)/, `## Gain and refusal tables\n\n${block}\n`));
console.log(JSON.stringify({ complete, roots: c.rows.filter(r=>r.language==='ts').length, tables: path.join(dir, 'report-tables.md') }));
