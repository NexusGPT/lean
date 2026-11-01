// w1c measurement over census pairs (base, head) of the lane's roots:
//   node measure.mjs <root>...   (reads census/<root>-base.json and census/<root>-head.json, their records files)
// prints, per root and summed: units, entered (base, head); the units each of the lane's rules stopped (the first refusing
// finding, the census partition refusalRules) at base and at head; the units newly entered at head and, for those, the
// opaque fraction (statements of the unit's own body inside a step over all of them, A5), its distribution per rule, and
// the step spans against their findings' spans.
import fs from 'node:fs';
import path from 'node:path';
const T = '/root/lanes/w1c-opaque-calls/tree/langs/ts';
const { ts, topLevelFunctions } = await import(`${T}/common.mjs`);
const { OPAQUE_CALLS } = await import(`${T}/lint/opaque-calls.mjs`);
const { statementCount } = await import(`${T}/translate/opaque-calls.mjs`);
const MINE = new Set(Object.keys(OPAQUE_CALLS));
const dir = '/root/lanes/w1c-opaque-calls/scratch/census';
const roots = process.argv.slice(2);
const readRecords = (j) => { const out = []; if (j.recordsFile && fs.existsSync(j.recordsFile)) { for (const line of fs.readFileSync(j.recordsFile, 'utf8').split('\n')) { if (!line.trim()) continue; const r = JSON.parse(line); if (r.kind === 'chunk') out.push(...(r.records ?? [])); } } return out.length ? out : (j.records ?? []); };
const ruleCounts = (j) => Object.fromEntries((j.refusalRules ?? []).map((r) => [r.rule, r.units]));
const sum = { units: [0, 0], entered: [0, 0], rules: {}, newly: 0, fractions: [], byRule: {} };
for (const root of roots) {
  const B = JSON.parse(fs.readFileSync(path.join(dir, `${root}-base.json`), 'utf8')), H = JSON.parse(fs.readFileSync(path.join(dir, `${root}-head.json`), 'utf8'));
  const rb = ruleCounts(B), rh = ruleCounts(H);
  console.log(`\n## ${root}: units ${B.units} -> ${H.units}; entered ${B.entered} (${B.share}%) -> ${H.entered} (${H.share}%)`);
  sum.units[0] += B.units; sum.units[1] += H.units; sum.entered[0] += B.entered; sum.entered[1] += H.entered;
  for (const r of MINE) { const a = rb[r] ?? 0, z = rh[r] ?? 0; if (a || z) console.log(`  ${r}: stopped ${a} -> ${z}`); sum.rules[r] = [(sum.rules[r]?.[0] ?? 0) + a, (sum.rules[r]?.[1] ?? 0) + z]; }
  // newly entered: a unit refused at base (its lowering refusal) and entered at head, by file and unit name
  const recB = new Map(readRecords(B).map((r) => [r.file, r])), recH = readRecords(H);
  for (const rh_ of recH) {
    const rb_ = recB.get(rh_.file); if (!rb_) continue;
    const refusedB = new Map((rb_.lowering ?? []).map((u) => [u.unit, u.refusal]));
    const newly = (rh_.lowering ?? []).filter((u) => !u.refusal && refusedB.get(u.unit));
    if (!newly.length) continue;
    let sf = null; try { sf = ts.createSourceFile(rh_.file, fs.readFileSync(path.join(H.root, rh_.file), 'utf8'), ts.ScriptTarget.Latest, true, rh_.file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS); } catch { continue; }
    const units = topLevelFunctions(sf);
    for (const u of newly) {
      const firstRule = (rb_.findings ?? []).find((f) => f.unit === u.unit && !f.env && !f.opaque)?.rule; // the base's first finding of the unit
      const un = units.get(u.unit); if (!un) continue;
      const sites = (rh_.findings ?? []).filter((f) => f.unit === u.unit && f.opaque && f.opaqueSite);
      const stmts = [...new Set(sites.map((f) => f.opaqueSite))].map((k) => { const [a, z] = k.split(':').map(Number); let hit = null; const w = (n) => { if (!hit && ts.isStatement(n) && n.getStart(sf) === a && n.getEnd() === z) hit = n; if (!hit) ts.forEachChild(n, w); }; w(sf); return hit; }).filter(Boolean);
      const c = statementCount(un.fn ?? un.node, stmts);
      const fr = c.statements ? c.opaque / c.statements : 0;
      sum.newly++; sum.fractions.push(fr);
      const key = MINE.has(firstRule) ? firstRule : `other:${firstRule}`;
      (sum.byRule[key] ??= []).push(fr);
    }
  }
}
const med = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const r3 = (x) => (x === null ? '-' : Math.round(x * 1000) / 1000);
console.log(`\n## summed over ${roots.join(', ')}: units ${sum.units[0]} -> ${sum.units[1]}; entered ${sum.entered[0]} -> ${sum.entered[1]} (+${sum.entered[1] - sum.entered[0]})`);
for (const [r, [a, z]] of Object.entries(sum.rules)) if (a || z) console.log(`  ${r}: stopped ${a} -> ${z}`);
console.log(`  stopped by the lane's rules: ${Object.values(sum.rules).reduce((n, [a]) => n + a, 0)} -> ${Object.values(sum.rules).reduce((n, [, z]) => n + z, 0)}`);
console.log(`  newly entered units: ${sum.newly}; opaque fraction median ${r3(med(sum.fractions))}, mean ${r3(sum.fractions.reduce((a, b) => a + b, 0) / (sum.fractions.length || 1))}, max ${r3(Math.max(0, ...sum.fractions))}; with no step (entered for another reason) ${sum.fractions.filter((x) => x === 0).length}`);
const withStep = sum.fractions.filter((x) => x > 0);
console.log(`  of those holding a step: ${withStep.length}, median ${r3(med(withStep))}; fraction 1.0 (every statement a step): ${withStep.filter((x) => x === 1).length}`);
for (const [r, xs] of Object.entries(sum.byRule).sort((a, b) => b[1].length - a[1].length)) console.log(`  base rule ${r}: ${xs.length} units, median fraction ${r3(med(xs))}`);
