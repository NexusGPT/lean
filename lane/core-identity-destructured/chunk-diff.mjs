// chunk-diff.mjs <before records.jsonl> <after records.jsonl>: a census journal's finished chunks compared one by one
// (the same file order on both runs; each chunk's counts are cumulative): files, units, entered, failed files and every reading's admitted and refused
import fs from 'node:fs';
const chunks = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.kind === 'chunk');
const [b, a] = process.argv.slice(2).map(chunks);
const n = Math.min(b.length, a.length); let files = 0, units = 0, entered = 0; const diffs = [];
const key = (c) => JSON.stringify({ files: c.files, units: c.units, entered: c.entered, failedFiles: c.failedFiles, readings: [...(c.readings ?? [])].sort((x, y) => x.id.localeCompare(y.id)) });
for (let i = 0; i < n; i++) if (key(b[i]) !== key(a[i])) diffs.push(i);
if (n) ({ files, units, entered } = b[n - 1]); // the journal's counts are cumulative: the last chunk compared holds them
console.log(JSON.stringify({ chunksBefore: b.length, chunksAfter: a.length, compared: n, files, units, entered, differing: diffs }));
