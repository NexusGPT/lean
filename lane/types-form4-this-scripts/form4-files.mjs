// the files of a census journal or JSON where a unit's first non-environment finding is a form-4 types refusal
// (the polymorphic `this`, classified as design/types-inventory.mjs does); prints file<TAB>units
import fs from 'node:fs';
import path from 'node:path';
const input = process.argv[2];
const res = JSON.parse(fs.readFileSync(input, 'utf8'));
let records = res.records;
if (res.complete === false) records = fs.readFileSync(res.recordsFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((o) => o.kind === 'chunk').flatMap((c) => c.records);
const out = new Map();
for (const rec of records ?? []) {
  if (!rec.findings) continue;
  const first = new Map();
  for (const f of rec.findings) if (f.rule === 'unresolved-module' && f.unit && !first.has(f.unit)) first.set(f.unit, null);
  for (const f of rec.findings) if (f.unit && !f.env && !first.has(f.unit)) first.set(f.unit, f);
  let text = null;
  for (const [, f] of first) {
    if (!f || f.rule !== 'types') continue;
    const m = /^type parameter (.+) is not one of this function's/.exec(f.msg); if (!m) continue;
    text ??= fs.readFileSync(path.join(res.root, rec.file), 'utf8');
    if (new RegExp(`\\bclass\\s+${m[1].replace(/[^\w$]/g, '')}\\b`).test(text)) out.set(rec.file, (out.get(rec.file) ?? 0) + 1);
  }
}
for (const [f, n] of out) console.log(`${f}\t${n}`);
