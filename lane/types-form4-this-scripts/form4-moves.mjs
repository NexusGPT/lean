// node form4-moves.mjs <before.json> <after.json>: the units a form-4 refusal (the polymorphic `this`, classified as
// design/types-inventory.mjs does) stopped before, and what stops each after (its first non-environment finding's
// rule, or "entered"); and every unit entered before and stopped after (a regression), with its rule and message
import fs from 'node:fs';
import path from 'node:path';
const load = (p) => { const r = JSON.parse(fs.readFileSync(p, 'utf8')); if (r.complete === false) r.records = fs.readFileSync(r.recordsFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((o) => o.kind === 'chunk').flatMap((c) => c.records); return r; };
const stops = (res) => {
  const m = new Map(); // file:unit -> finding or null (entered) ; only units with a record of units
  for (const rec of res.records ?? []) {
    const first = new Map();
    for (const f of rec.findings ?? []) if (f.rule === 'unresolved-module' && f.unit && !first.has(f.unit)) first.set(f.unit, { rule: 'environment', msg: f.msg });
    for (const f of rec.findings ?? []) if (f.unit && !f.env && !first.has(f.unit)) first.set(f.unit, f);
    // a nested unit (its lines inside another unit's) is covered by a stopped enclosing unit, as census.mjs counts it
    const us = rec.units ?? [];
    const enclosing = (u) => us.filter((o) => o !== u && o.lines && u.lines && o.lines[0] <= u.lines[0] && u.lines[1] <= o.lines[1] && (o.lines[0] < u.lines[0] || u.lines[1] < o.lines[1]));
    for (const u of us) { const f = first.get(u.name) ?? (enclosing(u).some((o) => first.get(o.name)) ? { rule: 'covered-by', msg: '' } : null); m.set(`${rec.file}\u0000${u.name}`, f); }
    for (const [u, f] of first) if (!m.has(`${rec.file}\u0000${u}`)) m.set(`${rec.file}\u0000${u}`, f);
  }
  return m;
};
const A = load(process.argv[2]), B = load(process.argv[3]);
const sa = stops(A), sb = stops(B);
const texts = new Map(); const text = (file) => { if (!texts.has(file)) texts.set(file, fs.readFileSync(path.join(A.root, file), 'utf8')); return texts.get(file); };
const form4 = (k, f) => { if (!f || f.rule !== 'types') return false; const m = /^type parameter (.+) is not one of this function's/.exec(f.msg); return !!m && new RegExp(`\\bclass\\s+${m[1].replace(/[^\w$]/g, '')}\\b`).test(text(k.slice(0, k.indexOf("\u0000")))); };
const moved = new Map(); let n = 0, n4after = 0;
for (const [k, f] of sa) { if (!form4(k, f)) continue; n++; const g = sb.has(k) ? sb.get(k) : undefined; const to = g === undefined ? 'unit absent after' : g === null ? 'entered' : form4(k, g) ? 'form 4 still' : `${g.rule}`; moved.set(to, (moved.get(to) ?? 0) + 1); }
for (const [k, g] of sb) if (form4(k, g)) n4after++;
console.log(`form-4 units before: ${n}; after: ${n4after}`);
for (const [to, c] of [...moved].sort((a, b) => b[1] - a[1])) console.log(`  -> ${to}: ${c}`);
const lost = [...sb].filter(([k, g]) => g && sa.has(k) && sa.get(k) === null);
console.log(`entered before, stopped after: ${lost.length}`);
for (const [k, g] of lost) console.log(`  ${k.replace("\u0000", ":")}  ${g.rule}: ${String(g.msg).slice(0, 160)}`);
const count = (s) => { let e = 0, r = 0; for (const v of s.values()) v ? r++ : e++; return [e, r]; };
console.log(`units entered/stopped before: ${count(sa)}; after: ${count(sb)}`);
