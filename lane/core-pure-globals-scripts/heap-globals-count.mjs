// heap-globals-count.mjs <lean-langs-ts-dir> <repo-root> <out.json>
// Every unit of every .ts file under the root (the heap-reach census's walk and skip rules, modules resolved by each
// file's tsconfig), planned by <dir>/translate/heap.mjs as the translator plans it (helper and external stubs: the
// translator hands both). Records per unit: in the core, and heap.mjs's own reasons (whyNot).
import fs from 'node:fs';
import path from 'node:path';
const [dir, root, out] = process.argv.slice(2);
const { ts, topLevelFunctions, COMPILER_OPTIONS, loadProgramOptions } = await import(path.join(dir, 'common.mjs'));
const { makeHeap } = await import(path.join(dir, 'translate/heap.mjs'));
const SKIP_DIR = new Set(['node_modules', 'dist', 'build', '.next', 'coverage', '.git', 'out', 'generated', '__generated__', 'storybook-static', 'vendor', '.turbo', '.cache']);
const SKIP_FILE = /\.(test|spec|stories|d|e2e|cy)\.(ts|tsx|mts)$|(^|\/)(tests?|__tests__|__mocks__|e2e|fixtures?|__fixtures__|stories|cypress|playwright)(\/|$)/;
function* walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.isDirectory()) { if (!SKIP_DIR.has(e.name) && !e.name.startsWith('.')) yield* walk(path.join(d, e.name)); continue; } if (/\.(ts|tsx|mts)$/.test(e.name)) { const p = path.join(d, e.name); if (!SKIP_FILE.test(p)) yield p; } } }
const list = [...walk(root)];
const groups = new Map();
for (const f of list) { const cfg = ts.findConfigFile(path.dirname(f), ts.sys.fileExists, 'tsconfig.json') ?? ''; if (!groups.has(cfg)) groups.set(cfg, []); groups.get(cfg).push(f); }
const rows = []; let planErrors = 0;
for (const [cfg, fl] of groups) for (let i = 0; i < fl.length; i += 80) {
  const chunk = fl.slice(i, i + 80);
  let options = { ...COMPILER_OPTIONS };
  try { if (cfg) options = loadProgramOptions(chunk[0], cfg).options; } catch (e) { process.stderr.write(`options ${cfg}: ${e.message}\n`); }
  let program; try { program = ts.createProgram(chunk, options, ts.createCompilerHost(options)); } catch (e) { process.stderr.write(`program ${chunk[0]}: ${e.message}\n`); continue; }
  const checker = program.getTypeChecker();
  for (const file of chunk) {
    const sf = program.getSourceFile(file); if (!sf) continue;
    const fns = topLevelFunctions(sf); const order = [...fns.values()];
    let h; try { h = makeHeap({ ts, checker, sf, fns, dn: (x) => x, fname: (x) => x, isReal: false, recursive: new Set(), helper: (k) => k, external: (n) => `ext_${n}` }); h.plan(order); } catch (e) { planErrors++; process.stderr.write(`plan ${file}: ${String(e.message).slice(0, 100)}\n`); continue; }
    for (const u of order) rows.push({ file: path.relative(root, file), unit: u.name, core: h.isCore(u), why: h.whyNot(u.name) });
  }
}
fs.writeFileSync(out, JSON.stringify({ root, files: list.length, units: rows.length, core: rows.filter((r) => r.core).length, planErrors, rows }));
console.log(JSON.stringify({ root, files: list.length, units: rows.length, core: rows.filter((r) => r.core).length, planErrors }));
