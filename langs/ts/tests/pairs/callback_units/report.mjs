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
  const belongs = r => r.root.startsWith(`${cohort}-`) && (/\.(js|jsx|mjs|cjs)$/.test(r.file) ? 'js' : 'ts') === language;
  const moves = c.attributionMoves.filter(belongs).length + c.sharedLineMoves.filter(belongs).reduce((n,r)=>n+(r.after==='inside'?1:-1),0);
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
  `| attribution: a refusal inside a nested callback now belongs to the callback | — | — | ${c.attributionMoves.length} refused enclosing units | ${c.attributionMoves.length} admitted enclosing units | inventory gain 0 | separate attribution class | ${c.unexplainedMoves.length} unexplained admission changes | ${c.ruleAttributions.length} still-refused units change first rule |`,
  `| attribution: shared-line independent units now own their findings | — | — | ${c.sharedLineMoves.filter(r=>r.before==='inside').length} inside → refused | ${c.sharedLineMoves.filter(r=>r.after==='inside').length} refused → inside | inventory gain 0 | separate attribution class | ${c.unexplainedMoves.length} unexplained admission changes | ${c.sharedLineRuleChanges.length} first-refusal changes |`, '',
  `Every measured inventory gain equals its prior prediction. For changed old units, no finding appeared or vanished; only its owner changed, by the rule. No old unit's admission/refusal changed except by the two accepted attribution classes. Missing old units: ${c.missing.length}; unreadable-file records: ${c.fileErrors.length}; unexplained first-rule changes: ${c.unexplainedRuleChanges.length}. These are census admissions, not independent verdicts: nested callbacks retain their enclosing unit's verdict.`, '',
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
lines.push('', '### Shared-line attribution proof', '', '| Root | Inside → refused | Refused → inside | First-refusal changes | New finding triples | Vanished finding triples |', '|---|---:|---:|---:|---:|---:|');
const shared = [...c.sharedLineMoves, ...c.sharedLineRuleChanges];
for (const root of [...new Set(shared.map(r=>r.root))]) {
  const rows=shared.filter(r=>r.root===root);
  lines.push(`| ${cell(root)} | ${rows.filter(r=>r.before==='inside'&&r.after==='refused').length} | ${rows.filter(r=>r.before==='refused'&&r.after==='inside').length} | ${rows.filter(r=>r.before===r.after).length} | ${rows.reduce((n,r)=>n+r.newFindingTriples,0)} | ${rows.reduce((n,r)=>n+r.vanishedFindingTriples,0)} |`);
}
lines.push('', `Proof command: \`node langs/ts/tests/pairs/callback_units/compare.mjs\`. It checks all ${shared.reduce((n,r)=>n+r.afterFindings,0)} after-findings owned by these changed old units against baseline line/rule/message triples, and all ${shared.reduce((n,r)=>n+r.beforeFindings,0)} baseline findings of those units against the after inventory. Full unit ranges and old/new owner lists are in \`langs/ts/design/callback-units-evidence/shared-line-attribution.json\`.`, '', 'Three examples:');
const examples = [], seenFiles = new Set();
for (const r of c.sharedLineMoves) if (!seenFiles.has(r.file) && examples.length<3) { examples.push(r); seenFiles.add(r.file); }
for (const r of examples) {
  const f=r.findings.find(f=>f.newOwners.includes(r.unit)&&f.oldOwner!==r.unit)??r.findings[0];
  lines.push(`- ${cell(r.file)}:${f.line}, unit ${cell(r.unit)}: ${r.before} → ${r.after}; ${f.rule}, formerly owned by ${cell(f.oldOwner)}, now includes ${cell(r.unit)}.`);
}
const block = lines.join('\n');
fs.writeFileSync(path.join(dir, 'report-tables.md'), block+'\n');
fs.writeFileSync(path.join(dir, 'report-summary.json'), JSON.stringify({ complete, totals, admissionMoves:c.moved.length, attributionMoves:c.attributionMoves.length, sharedLineMoves:c.sharedLineMoves.length, firstRuleChanges:c.changedRules.length, sharedLineRuleChanges:c.sharedLineRuleChanges.length, unexplainedMoves:c.unexplainedMoves.length, unexplainedRuleChanges:c.unexplainedRuleChanges.length }, null, 2)+'\n');
const old = fs.readFileSync(report,'utf8');
fs.writeFileSync(report, old.replace(/## Gain and refusal tables\n[\s\S]*?(?=\n## Commands and evidence)/, `## Gain and refusal tables\n\n${block}\n`));
console.log(JSON.stringify({ complete, roots: c.rows.filter(r=>r.language==='ts').length, tables: path.join(dir, 'report-tables.md') }));
