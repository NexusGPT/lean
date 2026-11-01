#!/usr/bin/env node
// The measurement of lane w1b (design/w1b-opaque-statements.md): two census runs of one root, before (the lane's base)
// and after (the lane's head), read off their --out JSON only.
//   node lane/w1b-opaque-statements-measure.mjs <before.json> <after.json> [<before.json> <after.json> ...]
// Per root and in total:
//   - units, entered (the census's own counts);
//   - per rule of the statement family, the units it stopped (refusalRules, a unit counted under its first refusal),
//     before and after: the lane's threshold is that its rules stop 0 units (they grade instead);
//   - the units the family newly lets enter: stopped before by one of its rules (the unit's first finding), stopped by
//     nothing after, and holding an opaque step of one of its rules after (the census record's `opaque`); per rule,
//     their count and the distribution of their opaque fraction (statements inside steps over the unit's statements;
//     A5: median at most 0.25), and how many steps' spans equal their findings' spans (A5) or are wider (a statement
//     step around an expression finding).
import fs from 'node:fs';
import path from 'node:path';
import { OPAQUE_ENVELOPE } from '../langs/ts/lint/lint.mjs';

const FAMILY = new Set(Object.keys(OPAQUE_ENVELOPE));
const args = process.argv.slice(2);
if (!args.length || args.length % 2) { console.error('usage: measure <before.json> <after.json> [...]'); process.exit(2); }
const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
// per unit of the census record: the rule that stops it (its first finding that is not the environment's, as the census
// counts a unit under its first refusal; null when it entered) and its opaque steps (the lowering record's, census `opaque`)
const unitsOf = (c) => {
  const m = new Map();
  for (const r of c.records ?? []) {
    const first = new Map(); for (const f of r.findings ?? []) if (f.unit && !f.env && !first.has(f.unit)) first.set(f.unit, f.rule);
    for (const u of r.lowering ?? []) m.set(`${r.file}#${u.unit}`, { stoppedBy: first.get(u.unit) ?? null, opaqueSteps: r.opaque?.[u.unit] ?? null });
  }
  return m;
};
const q = (xs, p) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const i = (s.length - 1) * p; const lo = Math.floor(i), hi = Math.ceil(i); return Math.round(1000 * (s[lo] + (s[hi] - s[lo]) * (i - lo))) / 1000; };
const total = { units: [0, 0], entered: [0, 0], stopped: {}, entering: {}, fractions: [], spans: { equal: 0, wider: 0 } };
const out = [];
for (let i = 0; i < args.length; i += 2) {
  const B = read(args[i]), A = read(args[i + 1]);
  const root = path.basename(String(A.root ?? args[i + 1]));
  if (B.partial || A.partial) out.push(`! ${root}: a partial census (${B.partial ? 'before' : ''} ${A.partial ? 'after' : ''})`);
  const row = { root, units: [B.units, A.units], entered: [B.entered, A.entered], stopped: {}, entering: {}, fractions: [], spans: { equal: 0, wider: 0 } };
  const stoppedBy = (c) => Object.fromEntries((c.refusalRules ?? []).filter((r) => FAMILY.has(r.rule)).map((r) => [r.rule, r.units]));
  const sb = stoppedBy(B), sa = stoppedBy(A);
  for (const r of new Set([...Object.keys(sb), ...Object.keys(sa)])) row.stopped[r] = [sb[r] ?? 0, sa[r] ?? 0];
  const ub = unitsOf(B), ua = unitsOf(A);
  for (const [k, u] of ua) {
    const b = ub.get(k);
    if (!b?.stoppedBy || !FAMILY.has(b.stoppedBy) || u.stoppedBy) continue;
    const steps = (u.opaqueSteps?.steps ?? []).filter((s) => String(s.rule).split(',').some((r) => FAMILY.has(r)));
    if (!steps.length) continue;
    const rule = b.stoppedBy;
    row.entering[rule] = (row.entering[rule] ?? 0) + 1;
    row.fractions.push({ rule, fraction: u.opaqueSteps.fraction });
    for (const s of steps) for (const f of s.findings ?? []) { const eq = JSON.stringify(f) === JSON.stringify(s.span); row.spans[eq ? 'equal' : 'wider']++; }
  }
  out.push(`## ${root}`, `units ${row.units.join(' -> ')}, entered ${row.entered.join(' -> ')} (+${row.entered[1] - row.entered[0]})`);
  out.push('| rule | stopped before | stopped after | newly entered with its step |', '| --- | ---: | ---: | ---: |');
  for (const r of [...FAMILY].sort()) if (row.stopped[r] || row.entering[r]) out.push(`| \`${r}\` | ${row.stopped[r]?.[0] ?? 0} | ${row.stopped[r]?.[1] ?? 0} | ${row.entering[r] ?? 0} |`);
  const fr = row.fractions.map((x) => x.fraction);
  out.push(`opaque fraction of the newly entered: n ${fr.length}, median ${q(fr, 0.5)}, p25 ${q(fr, 0.25)}, p75 ${q(fr, 0.75)}, max ${fr.length ? Math.max(...fr) : null}; finding spans: ${row.spans.equal} equal to their step's, ${row.spans.wider} inside a wider step`, '');
  for (let j = 0; j < 2; j++) { total.units[j] += row.units[j] ?? 0; total.entered[j] += row.entered[j] ?? 0; }
  for (const [r, v] of Object.entries(row.stopped)) { total.stopped[r] ??= [0, 0]; total.stopped[r][0] += v[0]; total.stopped[r][1] += v[1]; }
  for (const [r, n] of Object.entries(row.entering)) total.entering[r] = (total.entering[r] ?? 0) + n;
  total.fractions.push(...row.fractions); total.spans.equal += row.spans.equal; total.spans.wider += row.spans.wider;
}
out.push('## total', `units ${total.units.join(' -> ')}, entered ${total.entered.join(' -> ')} (+${total.entered[1] - total.entered[0]})`);
out.push('| rule | stopped before | stopped after | newly entered | median fraction |', '| --- | ---: | ---: | ---: | ---: |');
for (const r of [...FAMILY].sort()) if (total.stopped[r] || total.entering[r]) out.push(`| \`${r}\` | ${total.stopped[r]?.[0] ?? 0} | ${total.stopped[r]?.[1] ?? 0} | ${total.entering[r] ?? 0} | ${q(total.fractions.filter((x) => x.rule === r).map((x) => x.fraction), 0.5) ?? ''} |`);
const fr = total.fractions.map((x) => x.fraction);
out.push(`opaque fraction of the newly entered: n ${fr.length}, median ${q(fr, 0.5)}, p25 ${q(fr, 0.25)}, p75 ${q(fr, 0.75)}; at most 0.25: ${fr.filter((x) => x <= 0.25).length}; finding spans: ${total.spans.equal} equal to their step's, ${total.spans.wider} inside a wider step`);
console.log(out.join('\n'));
