// How far the heap core (translate/heap.mjs, stage 2) reaches over the census repositories, and what keeps the rest out.
// In-process: one TypeScript program per chunk of files, modules deliberately unresolved (an imported shape is unknown and
// excluded, never guessed), the core planned per file exactly as the translator plans it. This counts units the core
// would read; it translates and proves nothing.
//   node heap-core-census.mjs <census/concepts-all.json> <output.json>
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ts, topLevelFunctions, COMPILER_OPTIONS } from '../common.mjs';
import { makeHeap } from '../translate/heap.mjs';

const census = process.argv[2];
const output = process.argv[3];
const resolve = process.argv.includes('--resolve'); // modules resolved with the repository's tsconfig, as the gate reads them; default: unresolved, imported shapes unknown
if (!census || !output || !path.isAbsolute(census) || !path.isAbsolute(output)) throw Error('pass absolute census and output paths');
const baseline = JSON.parse(fs.readFileSync(census, 'utf8'));
const SKIP_DIR = new Set(['node_modules', 'dist', 'build', '.next', 'coverage', '.git', 'out', 'generated', '__generated__', 'storybook-static', 'vendor', '.turbo', '.cache']);
const SKIP_FILE = /\.(test|spec|stories|d|e2e|cy)\.(ts|tsx|mts)$|(^|\/)(tests?|__tests__|__mocks__|e2e|fixtures?|__fixtures__|stories|cypress|playwright)(\/|$)/;
function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP_DIR.has(e.name) && !e.name.startsWith('.')) yield* walk(path.join(dir, e.name)); continue; }
    if (/\.(ts|tsx|mts)$/.test(e.name)) { const p = path.join(dir, e.name); if (!SKIP_FILE.test(p)) yield p; }
  }
}
const repos = [];
for (const name of Object.keys(baseline.perRepo).sort()) {
  const report = JSON.parse(fs.readFileSync(path.join(path.dirname(census), 'concepts', name + '.json'), 'utf8'));
  repos.push({ name, roots: report.roots });
}
const K = ts.SyntaxKind;
const coarse = (r) => r.replace(/^(calls|called by) .*, outside the core$/, '$1 a unit outside the core').replace(/^(parameter type|return type|value type|local type|receiver type|array literal type|object literal type): .*$/, '$1').replace(/^property \S+$/, 'property outside the shape').replace(/^operator .*$/, 'operator outside the core').replace(/^call \.\S+$/, 'method call').replace(/^(expression|statement|expression statement) \S+$/, '$1 outside the core');
const leaf = (r) => { const m = r.match(/: (.*)$/); if (!m) return null; const parts = m[1].split(': '); return parts[parts.length - 1].replace(/^array of /, ''); };
const perRepo = {}, reasons = Object.create(null), leaves = Object.create(null), methodCalls = Object.create(null), sample = []; // null prototypes: a method named toString must not meet Object.prototype
let files = 0, units = 0, core = 0, own = 0;
const risk = Object.create(null); let risky = 0, sound = 0; // layer-1 exposure outside the core
for (const repo of repos) {
  const list = []; for (const root of repo.roots) if (fs.existsSync(root)) list.push(...walk(root));
  const row = { files: list.length, units: 0, core: 0, own: 0 };
  for (let offset = 0; offset < list.length; offset += 80) {
    const chunk = list.slice(offset, offset + 80);
    let options = { ...COMPILER_OPTIONS };
    if (resolve) { const cfg = ts.findConfigFile(path.dirname(chunk[0]), ts.sys.fileExists); if (cfg) { const parsed = ts.getParsedCommandLineOfConfigFile(cfg, {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} }); if (parsed) options = { ...parsed.options, noEmit: true, skipLibCheck: true }; } }
    const host = ts.createCompilerHost(options);
    if (!resolve) host.resolveModuleNames = (names) => names.map(() => undefined);
    const program = ts.createProgram(chunk, options, host);
    const checker = program.getTypeChecker();
    for (const file of chunk) {
      const sf = program.getSourceFile(file); if (!sf) continue;
      const fns = topLevelFunctions(sf);
      const order = [...fns.values()];
      // same-file call cycles: the translator gives those units fuel; the core leaves them out
      const calls = new Map(order.map((u) => [u.name, new Set()]));
      for (const u of order) { const w = (n) => { if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && fns.has(n.expression.text)) calls.get(u.name).add(n.expression.text); ts.forEachChild(n, w); }; w(u.body); }
      const recursive = new Set();
      for (const u of order) { const seen = new Set(); const stack = [...calls.get(u.name)]; while (stack.length) { const c = stack.pop(); if (c === u.name) { recursive.add(u.name); break; } if (!seen.has(c)) { seen.add(c); for (const d of calls.get(c) ?? []) stack.push(d); } } }
      let heapT;
      try { heapT = makeHeap({ ts, checker, sf, fns, dn: (x) => x, fname: (x) => x, isReal: false, recursive }); heapT.plan(order); }
      catch (e) { console.error(`${file}: ${String(e.message).slice(0, 120)}`); continue; }
      for (const u of order) {
        units++; row.units++;
        if (heapT.isCore(u)) { core++; row.core++; if (sample.length < 200) sample.push(`${path.relative(path.dirname(census), file)}:${u.name}`); continue; }
        const rk = heapT.layer1Risk(u); if (rk.length) { risky++; for (const r of rk) risk[r] = (risk[r] ?? 0) + 1; } else sound++;
        const why = heapT.whyNot(u.name);
        if (why.every((r) => /outside the core$/.test(r) && /^(calls|called by) /.test(r))) { own++; row.own++; } // its own syntax fits; the call graph keeps it out
        const first = why[0] ?? 'unknown';
        const c = coarse(first); reasons[c] = (reasons[c] ?? 0) + 1;
        const l = leaf(first); if (l) leaves[l] = (leaves[l] ?? 0) + 1;
        const m = first.match(/^call \.(\S+)$/); if (m) methodCalls[m[1]] = (methodCalls[m[1]] ?? 0) + 1;
      }
    }
    files += chunk.length;
    console.error(`${repo.name}: ${Math.min(offset + 80, list.length)}/${list.length} files, core ${row.core}/${row.units}`);
  }
  perRepo[repo.name] = row;
}
const sortDesc = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]));
const result = { census, resolve, layer1: { outsideCore: units - core, exposed: risky, notExposed: sound, byClass: sortDesc(risk) }, policy: `heap core as planned by translate/heap.mjs (stage 2): structural membership per unit, modules ${resolve ? 'resolved with each repository tsconfig' : 'unresolved'}; a count of units the core reads, not of proofs`, files, units, core, ownSyntaxFitsCallGraphExcludes: own, perRepo, firstReasonCoarse: sortDesc(reasons), typeLeaves: sortDesc(leaves), methodCalls: sortDesc(methodCalls), coreSample: sample, manifestSha256: createHash('sha256').update(JSON.stringify({ perRepo, reasons, leaves })).digest('hex') };
fs.writeFileSync(output, JSON.stringify(result, null, 1) + '\n');
console.log(JSON.stringify({ files, units, core, ownSyntaxFitsCallGraphExcludes: own, layer1: result.layer1, firstReasonCoarse: sortDesc(reasons) }, null, 1));
