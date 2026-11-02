#!/usr/bin/env node
// The opaque fraction of the units the async family's steps let enter (amendment A5; design/w1d-opaque-async.md).
//   node langs/ts/tests/w1d-opaque-fraction.mjs <root> <before.json> <after.json>
// A unit newly entered: one a census before held a refusal of, and the census after does not. Its file is lowered as the
// census loads it (loadManyChunks), its findings are the lint's on that program (labelled ones included), and per unit:
//   steps      the findings labelled opaque, each with its span (the finding's own node, never its statement)
//   statements every statement of the unit, those of functions nested in it included
//   opaque     the statements inside a step's span, and the innermost statement holding each step
//   fraction   opaque / statements
// Prints one JSON line per unit and a summary line: the units, the units holding a step, the median and the maximum
// fraction over the units holding a step, the per-rule counts.
import path from 'node:path';
import fs from 'node:fs';
import { loadManyChunks, topLevelFunctions, findingUnit, ts } from '../common.mjs';
import { admissionFindings } from '../lint/lint.mjs';

const [root, beforeFile, afterFile] = process.argv.slice(2);
const before = JSON.parse(fs.readFileSync(beforeFile, 'utf8')), after = JSON.parse(fs.readFileSync(afterFile, 'utf8'));
const refused = (census) => { const s = new Set(); for (const r of census.records ?? []) for (const u of r.lowering ?? []) if (u.refusal) s.add(`${r.file}\u0000${u.unit}`); return s; };
const lowered = (census) => { const s = new Set(); for (const r of census.records ?? []) for (const u of r.lowering ?? []) s.add(`${r.file}\u0000${u.unit}`); return s; };
const was = refused(before), now = refused(after), seen = lowered(after);
const fresh = [...was].filter((k) => !now.has(k) && seen.has(k));
const byFile = new Map(); for (const k of fresh) { const [f, u] = k.split('\u0000'); if (!byFile.has(f)) byFile.set(f, []); byFile.get(f).push(u); }
const rows = [];
const files = [...byFile.keys()].map((f) => path.join(root, f));
for (const loaded of loadManyChunks(files, {})) {
  for (const abs of loaded.keys()) {
    const rel = path.relative(root, abs); const units = byFile.get(rel); if (!units) continue;
    const L = loaded.get(abs); if (!L || L.error) { for (const u of units) rows.push({ file: rel, unit: u, error: L?.error ?? 'not loaded' }); continue; }
    const { sf } = L;
    const inv = topLevelFunctions(sf);
    const found = admissionFindings(abs, null, { project: true, loaded: L }); // the lint's findings, the labelled ones too (lowerFile keeps the refusing ones)
    for (const f of found) f.unit = findingUnit(sf, inv, f)?.name ?? f.unit ?? null; // the census's unit of a finding
    for (const name of units) {
      const u = inv.get(name);
      if (!u) { rows.push({ file: rel, unit: name, error: 'unit not found' }); continue; }
      const pos = (line, col) => sf.getPositionOfLineAndCharacter(line - 1, col - 1);
      const steps = found.filter((f) => f.opaque && f.unit === name).map((f) => ({ rule: f.rule, line: f.line, span: [pos(f.line, f.col), pos(f.endLine, f.endCol)] }));
      const stmts = []; const w = (x) => { if (ts.isStatement(x) && !ts.isBlock(x)) stmts.push(x); ts.forEachChild(x, w); }; ts.forEachChild(u.node, w);
      const holding = new Set(steps.map((s) => { let best = null; for (const st of stmts) if (st.getStart(sf) <= s.span[0] && s.span[1] <= st.end && (!best || st.end - st.pos < best.end - best.pos)) best = st; return best; }).filter(Boolean));
      const opaque = stmts.filter((st) => holding.has(st) || steps.some((s) => s.span[0] <= st.getStart(sf) && st.end <= s.span[1]));
      rows.push({ file: rel, unit: name, steps: steps.length, rules: [...new Set(steps.map((s) => s.rule))], statements: stmts.length, opaque: opaque.length, fraction: stmts.length ? opaque.length / stmts.length : 0 });
    }
  }
}
for (const r of rows) console.log(JSON.stringify(r));
const withSteps = rows.filter((r) => r.steps > 0).map((r) => r.fraction).sort((a, b) => a - b);
const median = withSteps.length ? (withSteps.length % 2 ? withSteps[(withSteps.length - 1) / 2] : (withSteps[withSteps.length / 2 - 1] + withSteps[withSteps.length / 2]) / 2) : null;
const perRule = {}; for (const r of rows) for (const x of r.rules ?? []) perRule[x] = (perRule[x] ?? 0) + 1;
console.log(JSON.stringify({ root: path.basename(root), newlyEntered: rows.length, withSteps: withSteps.length, median, max: withSteps.length ? withSteps[withSteps.length - 1] : null, perRule }));
