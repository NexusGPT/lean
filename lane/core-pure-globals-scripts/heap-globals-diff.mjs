// heap-globals-diff.mjs <before.json> <after.json>: units by (file, unit, occurrence); entered the core, left it, and
// the first reason before against after for every unit whose reasons changed
import fs from 'node:fs';
const [a, b] = process.argv.slice(2).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
const key = (rows) => { const seen = new Map(); return new Map(rows.map((r) => { const k = `${r.file}\0${r.unit}`; const i = seen.get(k) ?? 0; seen.set(k, i + 1); return [`${k}\0${i}`, r]; })); };
const A = key(a.rows), B = key(b.rows);
const out = { before: { units: a.units, core: a.core, planErrors: a.planErrors }, after: { units: b.units, core: b.core, planErrors: b.planErrors }, entered: 0, left: 0, moved: {}, enteredFrom: {}, examples: [] };
const tally = (o, k) => { o[k] = (o[k] ?? 0) + 1; };
for (const [k, x] of A) { const y = B.get(k); if (!y) continue;
  if (!x.core && y.core) { out.entered++; tally(out.enteredFrom, x.why[0] ?? '(none)'); if (out.examples.length < 12) out.examples.push(`${x.file} ${x.unit}: ${x.why[0]}`); }
  else if (x.core && !y.core) { out.left++; tally(out.moved, `core -> ${y.why[0]}`); }
  else if (!x.core && !y.core && JSON.stringify(x.why) !== JSON.stringify(y.why)) tally(out.moved, `${x.why[0]} -> ${y.why[0]}`);
}
const sort = (o) => Object.fromEntries(Object.entries(o).sort((p, q) => q[1] - p[1]));
out.enteredFrom = sort(out.enteredFrom); out.moved = sort(out.moved);
const stopsBefore = {}; for (const x of a.rows) if (!x.core && /Number|JSON|call \.(isInteger|isFinite|isNaN|isSafeInteger|stringify)|call outside the file/.test(x.why[0] ?? '')) tally(stopsBefore, x.why[0]);
out.firstStopBefore_globalsLike = sort(stopsBefore);
console.log(JSON.stringify(out, null, 1));
