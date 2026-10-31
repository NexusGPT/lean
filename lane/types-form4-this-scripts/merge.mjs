// node merge.mjs <out.json> <census.json>...: one census JSON of several scoped runs of one root, each file's record once
import fs from 'node:fs';
const [out, ...ins] = process.argv.slice(2);
const byFile = new Map(); let root = null;
for (const p of ins) { const r = JSON.parse(fs.readFileSync(p, 'utf8')); if (r.complete === false) throw new Error(`${p}: incomplete`); root ??= r.root; for (const rec of r.records) if (!byFile.has(rec.file)) byFile.set(rec.file, rec); }
fs.writeFileSync(out, JSON.stringify({ complete: true, root, records: [...byFile.values()] }));
console.log(`${ins.length} runs, ${byFile.size} files`);
