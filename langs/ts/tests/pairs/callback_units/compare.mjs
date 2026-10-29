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
    for (const u of f.units) out.set(`${f.file}\0${u.name}`, { file: f.file, unit: u.name, lines: u.lines, language: /\.(js|jsx|mjs|cjs)$/.test(f.file) ? 'js' : 'ts', verdict: first.has(u.name) ? 'refused' : 'inside', rule: first.get(u.name) ?? null });
  }
  return out;
};
const rows = [], moved = [], attributionMoves = [], ruleAttributions = [], sharedLineMoves = [], sharedLineRuleChanges = [], changedRules = [], missing = [], newUnits = [], fileErrors = [];
const attributionClass = 'attribution: a refusal inside a nested callback now belongs to the callback';
// Classify only exact retained findings that moved from the baseline owner into newly listed nested units.
// A disappeared diagnostic, changed rule/message, or newly refused old unit is never hidden by this classification.
function attributionOf(before, after, unit, allowRetained = false) {
  if (unit.verdict !== 'refused') return null;
  const old = before.records.find(r => r.file === unit.file), next = after.records.find(r => r.file === unit.file);
  if (!old || !next) return null;
  const findings = old.findings.filter(f => !f.env && (Object.hasOwn(f, 'unit') ? f.unit : old.units.find(u => u.lines[0] <= f.line && f.line <= u.lines[1])?.name) === unit.unit);
  const sameFinding = (f, g) => !g.env && g.line === f.line && g.rule === f.rule && g.msg === f.msg;
  const mapped = findings.map(f => {
    const own = next.findings.find(g => sameFinding(f, g) && g.unit === unit.unit);
    const retained = own ?? next.findings.find(g => sameFinding(f, g) && g.unit?.startsWith(`${unit.unit}/`) && !old.units.some(u => u.name === g.unit));
    return retained ? { line: f.line, rule: f.rule, code: f.msg.match(/^TS\d+/)?.[0] ?? null, message: f.msg, to: retained.unit } : null;
  });
  if (!mapped.length || !mapped.every(Boolean)) return null;
  const moved = mapped.filter(f => f.to !== unit.unit), kept = mapped.filter(f => f.to === unit.unit);
  if (!moved.length || !allowRetained && kept.length) return null;
  const afterOwn = next.findings.filter(g => !g.env && g.unit === unit.unit);
  if (afterOwn.some(g => !findings.some(f => sameFinding(f, g)))) return null;
  return { class: attributionClass, file: unit.file, unit: unit.unit, lines: unit.lines, findings: moved, retainedRules: [...new Set(kept.map(f => f.rule))].sort() };

}
const sharedIndexes = new WeakMap();
function sharedLineAttributionOf(before, after, unit, nextUnit) {
  let indexes = sharedIndexes.get(before);
  if (!indexes) { indexes = new Map(); sharedIndexes.set(before, indexes); }
  let index = indexes.get(unit.file);
  if (!index) {
    const old = before.records.find(r => r.file === unit.file), next = after.records.find(r => r.file === unit.file);
    if (!old || !next) return null;
    const key = f => JSON.stringify([f.line, f.rule, f.msg]);
    const oldOwner = f => Object.hasOwn(f, 'unit') ? f.unit : old.units.find(u => u.lines[0] <= f.line && f.line <= u.lines[1])?.name ?? null;
    const oldKeys = new Map(), nextKeys = new Map();
    for (const f of old.findings.filter(f => !f.env)) oldKeys.set(key(f), { ...f, oldOwner: oldOwner(f) });
    for (const f of next.findings.filter(f => !f.env)) { const k = key(f), row = nextKeys.get(k) ?? { finding: f, newOwners: new Set() }; row.newOwners.add(f.unit ?? null); nextKeys.set(k, row); }
    index = { old, next, key, oldOwner, oldKeys, nextKeys }; indexes.set(unit.file, index);
  }
  const { old, next, key, oldOwner, oldKeys, nextKeys } = index;
  const beforeOwn = old.findings.filter(f => !f.env && oldOwner(f) === unit.unit);
  const afterOwn = next.findings.filter(f => !f.env && f.unit === unit.unit);
  // Prove both directions: no finding of an affected old unit appeared or vanished.
  if (beforeOwn.some(f => !nextKeys.has(key(f))) || afterOwn.some(f => !oldKeys.has(key(f)))) return null;
  const links = new Map();
  for (const f of [...beforeOwn, ...afterOwn]) {
    const k = key(f), b = oldKeys.get(k), a = nextKeys.get(k);
    links.set(k, { line: f.line, rule: f.rule, message: f.msg, oldOwner: b.oldOwner, newOwners: [...a.newOwners] });
  }
  const changes = [...links.values()].filter(f => f.newOwners.some(n => n !== f.oldOwner));
  if (!changes.length) return null;
  // This is a shared source-line repair, not permission to classify arbitrary reading changes.
  if (!changes.every(f => old.units.filter(u => u.lines[0] <= f.line && f.line <= u.lines[1]).length > 1 ||
    f.newOwners.every(n => n === f.oldOwner || n?.startsWith(`${f.oldOwner}/`) && !old.units.some(u => u.name === n)))) return null;
  return { class: 'attribution: shared-line independent units now own their findings', file: unit.file, unit: unit.unit, lines: unit.lines,
    before: unit.verdict, after: nextUnit.verdict, beforeRule: unit.rule, afterRule: nextUnit.rule,
    beforeFindings: beforeOwn.length, afterFindings: afterOwn.length, newFindingTriples: 0, vanishedFindingTriples: 0, findings: [...links.values()] };
}
for (const file of fs.readdirSync(path.join(dir, 'prediction')).filter(f => f.endsWith('.json') && f !== 'commands.json')) {
  const prediction = read(path.join(dir, 'prediction', file));
  const bp = path.join(dir, 'before', file), ap = path.join(dir, 'after', file);
  if (!fs.existsSync(bp) || !fs.existsSync(ap)) { rows.push({ root: file, status: file === 'census-langchainjs.json' ? 'awaits the census memory fix' : 'pending', prediction: Object.fromEntries(Object.entries(prediction.totals).map(([k,v]) => [k,v.callbacks.predicted])) }); continue; }
  const before = read(bp), after = read(ap), a = outcomes(before), b = outcomes(after);
  for (const [key, u] of a) {
    if (!b.has(key)) missing.push({ root: file, ...u });
    else if (u.verdict !== b.get(key).verdict) {
      const move = { root: file, before: u, after: b.get(key) }; moved.push(move);
      const attribution = b.get(key).verdict === 'inside' ? attributionOf(before, after, u) : null;
      if (attribution) attributionMoves.push({ root: file, ...attribution });
      else { const shared = sharedLineAttributionOf(before, after, u, b.get(key)); if (shared) sharedLineMoves.push({ root: file, ...shared }); }
    }
    else if (u.rule !== b.get(key).rule) {
      changedRules.push({ root: file, before: u, after: b.get(key) });
      const attribution = attributionOf(before, after, u, true);
      if (attribution) ruleAttributions.push({ root: file, beforeRule: u.rule, afterRule: b.get(key).rule, ...attribution });
      else { const shared = sharedLineAttributionOf(before, after, u, b.get(key)); if (shared) sharedLineRuleChanges.push({ root: file, ...shared }); }
    }
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
const unexplainedMoves = moved.filter(m => ![...attributionMoves, ...sharedLineMoves].some(a => a.root === m.root && a.file === m.before.file && a.unit === m.before.unit));
const unexplainedRuleChanges = changedRules.filter(m => ![...ruleAttributions, ...sharedLineRuleChanges].some(a => a.root === m.root && a.file === m.before.file && a.unit === m.before.unit));
const result = { rows, moved, attributionMoves, sharedLineMoves, unexplainedMoves, changedRules, ruleAttributions, sharedLineRuleChanges, unexplainedRuleChanges, missing, newUnits, fileErrors, refusals };
fs.writeFileSync(path.join(dir, 'compare.json'), JSON.stringify(result, null, 1));
fs.writeFileSync(path.join(dir, 'shared-line-attribution.json'), JSON.stringify([...sharedLineMoves, ...sharedLineRuleChanges], null, 1));
console.log(JSON.stringify({ rootsCompared: rows.filter(r=>r.language==='ts').length, pending: rows.filter(r=>r.status), moved: moved.length, attributionMoves: attributionMoves.length, sharedLineMoves: sharedLineMoves.length, unexplainedMoves: unexplainedMoves.length, changedRules: changedRules.length, ruleAttributions: ruleAttributions.length, sharedLineRuleChanges: sharedLineRuleChanges.length, unexplainedRuleChanges: unexplainedRuleChanges.length, missing: missing.length, newUnits: newUnits.length, fileErrors: fileErrors.length, differences: rows.filter(r=>r.difference), refusals }, null, 2));
if (unexplainedMoves.length || unexplainedRuleChanges.length || missing.length || rows.some(r => r.difference)) process.exitCode = 1;
