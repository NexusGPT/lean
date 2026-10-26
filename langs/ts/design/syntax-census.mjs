// The syntax half of the coverage matrix: for every top-level unit of every .ts/.tsx file of the census roots, the set
// of TypeScript syntax kinds its body uses; one row per kind with the number of units using it. An AST census
// independent of the lint (the lint's refusals are a separate column of the matrix). Usage:
//   node syntax-census.mjs <absolute concepts-all.json> <absolute output.json>
import fs from 'node:fs';
import path from 'node:path';
import { ts, topLevelFunctions } from '../common.mjs';
const census = process.argv[2], output = process.argv[3];
if (!census || !output || !path.isAbsolute(census) || !path.isAbsolute(output)) throw Error('pass absolute census and output paths');
const baseline = JSON.parse(fs.readFileSync(census, 'utf8'));
const roots = [];
for (const name of Object.keys(baseline.perRepo).sort()) {
  const report = JSON.parse(fs.readFileSync(path.join(path.dirname(census), 'concepts', name + '.json'), 'utf8'));
  for (const root of report.roots) if (!roots.includes(root)) roots.push(root);
}
const files = [];
const walk = (d) => { let ents; try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } for (const e of ents) { if (e.name === 'node_modules' || e.name === 'dist' || e.name === 'build' || e.name === '.next' || e.name.startsWith('.')) continue; const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.isFile() && /\.tsx?$/.test(p) && !p.endsWith('.d.ts')) files.push(p); } };
for (const r of roots) walk(r);
files.sort();
const K = ts.SyntaxKind;
const kindCounts = {}; let units = 0, filesRead = 0; const perRepo = {};
const repoOf = (f) => roots.find((r) => f.startsWith(r)) ?? '?';
for (const file of files) {
  let src; try { src = fs.readFileSync(file, 'utf8'); } catch { continue; }
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  filesRead++;
  const repo = path.basename(repoOf(file)); perRepo[repo] = perRepo[repo] ?? { units: 0, files: 0 }; perRepo[repo].files++;
  for (const [, u] of topLevelFunctions(sf)) {
    const body = u.body ?? u.fn?.body; if (!body) continue;
    units++; perRepo[repo].units++;
    const kinds = new Set();
    const w = (n) => { kinds.add(n.kind); ts.forEachChild(n, w); };
    w(body);
    for (const k of kinds) { const name = K[k]; kindCounts[name] = (kindCounts[name] ?? 0) + 1; }
  }
  if (filesRead % 500 === 0) process.stderr.write(`${filesRead}/${files.length} files, ${units} units\r`);
}
const rows = Object.entries(kindCounts).sort((a, b) => b[1] - a[1]).map(([kind, n]) => ({ kind, units: n, share: Math.round(1000 * n / units) / 10 }));
fs.writeFileSync(output, JSON.stringify({ census, generatedAt: new Date().toISOString(), roots: roots.length, files: filesRead, units, perRepo, rows }, null, 1));
console.log(JSON.stringify({ roots: roots.length, files: filesRead, units, kinds: rows.length }));
for (const r of rows.slice(0, 60)) console.log(`${String(r.units).padStart(6)} ${String(r.share).padStart(5)}%  ${r.kind}`);
