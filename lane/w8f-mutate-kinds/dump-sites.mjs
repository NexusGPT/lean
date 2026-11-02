// dump-sites.mjs <mutate.mjs path> <pairs dir> <out.json>: every site sitesOf lists in every top-level unit of every pair
// (the candidate file, the pair's project or none), as {pair, unit, i, kind, start, end, was, text, lines?}. Used to compare
// the old kinds' sites before and after a change to mutate.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [mutPath, pairsDir, outFile] = process.argv.slice(2);
const { sitesOf } = await import(pathToFileURL(path.resolve(mutPath)).href);
const common = await import(pathToFileURL(path.join(path.dirname(path.resolve(mutPath)), '..', 'common.mjs')).href);
const out = [];
for (const p of fs.readdirSync(pairsDir).sort()) {
  const d = path.join(pairsDir, p);
  if (!fs.existsSync(path.join(d, 'expect.json'))) continue;
  const file = fs.existsSync(path.join(d, 'candidate.tsx')) ? path.join(d, 'candidate.tsx') : path.join(d, 'candidate.ts');
  if (!fs.existsSync(file)) continue;
  const exp = JSON.parse(fs.readFileSync(path.join(d, 'expect.json'), 'utf8'));
  const project = exp.project ? path.join(d, exp.project) : false;
  let names = [];
  try { names = [...common.topLevelFunctions(common.loadProgram(file, { project: false }).sf).values()].filter((u) => !u.enclosingUnit).map((u) => u.name); } catch (e) { out.push({ pair: p, error: String(e.message).slice(0, 100) }); continue; }
  for (const u of names) {
    try {
      const { sites } = sitesOf(file, u, { project });
      sites.forEach((s, i) => out.push({ pair: p, unit: u, i, kind: s.kind, start: s.start, end: s.end, was: s.was, text: s.text, ...(s.lines ? { lines: s.lines } : {}) }));
    } catch (e) { out.push({ pair: p, unit: u, error: String(e.message).slice(0, 100) }); }
  }
}
fs.writeFileSync(outFile, JSON.stringify(out, null, 1) + '\n');
console.error(`${out.length} entries`);
