import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve('langs/ts/design/callback-units-evidence');
const read = file => JSON.parse(fs.readFileSync(file));
// Reproduce each saved census's own attribution; the baseline schema predates named findings.
const outcomes = result => {
  const out = new Map();
  for (const f of result.records) {
    if (f.error) continue;
    const first = new Map();
    for (const g of f.findings) if (!g.env) {
      const unit = Object.hasOwn(g, 'unit') ? g.unit : f.units.find(u => u.lines[0] <= g.line && g.line <= u.lines[1])?.name;
      if (unit && !first.has(unit)) first.set(unit, g.rule);
    }
    for (const u of f.units) out.set(`${f.file}\0${u.name}`, { file: f.file, unit: u.name, language: /\.(js|jsx|mjs|cjs)$/.test(f.file) ? 'js' : 'ts', verdict: first.has(u.name) ? 'refused' : 'inside', rule: first.get(u.name) ?? null });
  }
  return out;
};
const rows = [], moved = [], changedRules = [], missing = [], newUnits = [], fileErrors = [];
for (const file of fs.readdirSync(path.join(dir, 'prediction')).filter(f => f.endsWith('.json') && f !== 'commands.json')) {
  const prediction = read(path.join(dir, 'prediction', file));
  const bp = path.join(dir, 'before', file), ap = path.join(dir, 'after', file);
  if (!fs.existsSync(bp) || !fs.existsSync(ap)) { rows.push({ root: file, status: file === 'census-langchainjs.json' ? 'awaits the census memory fix' : 'pending', prediction: Object.fromEntries(Object.entries(prediction.totals).map(([k,v]) => [k,v.callbacks.predicted])) }); continue; }
  const before = read(bp), after = read(ap), a = outcomes(before), b = outcomes(after);
  for (const [key, u] of a) {
    if (!b.has(key)) missing.push({ root: file, ...u });
    else if (u.verdict !== b.get(key).verdict) moved.push({ root: file, before: u, after: b.get(key) });
    else if (u.rule !== b.get(key).rule) changedRules.push({ root: file, before: u, after: b.get(key) });
  }
  for (const [key,u] of b) if (!a.has(key)) newUnits.push({ root: file, ...u });
  for (const [phase, result] of [['before', before], ['after', after]]) for (const r of result.records) if (r.error) fileErrors.push({ root: file, phase, ...r });
  for (const lang of ['ts','js']) {
    const B = before.languages[lang]?.units ?? 0, A = after.languages[lang]?.units ?? 0;
    const predicted = prediction.totals[lang]?.callbacks.predicted ?? 0;
    rows.push({ root: file, language: lang, before: B, after: A, gain: A-B, predicted, difference: A-B-predicted });
  }
}
const refusals = {};
for (const u of newUnits) { const cohort = u.root.startsWith('bugsjs-') ? 'bugsjs' : 'census'; const key = `${cohort} ${u.language}`; const counts = refusals[key] ??= {}; counts[u.rule ?? 'inside'] = (counts[u.rule ?? 'inside'] ?? 0) + 1; }
const result = { rows, moved, changedRules, missing, newUnits, fileErrors, refusals };
fs.writeFileSync(path.join(dir, 'compare.json'), JSON.stringify(result, null, 1));
console.log(JSON.stringify({ rootsCompared: rows.filter(r=>r.language==='ts').length, pending: rows.filter(r=>r.status), moved: moved.length, changedRules: changedRules.length, missing: missing.length, newUnits: newUnits.length, fileErrors: fileErrors.length, differences: rows.filter(r=>r.difference), refusals }, null, 2));
if (moved.length || missing.length || rows.some(r => r.difference)) process.exitCode = 1;
