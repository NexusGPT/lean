#!/usr/bin/env node
// The units each library row and fake reaches on a repository root (design/w2d-library-rows.md, the measurement;
// amendment A14: the units whose code touches a faked module). Read-only over the root; parse only, no type checker.
//   node library-units.mjs <root> [--json out.json]
// Per library: `files` importing it, `units` (a top-level function, a method, a function-valued const) that reference a
// binding imported from it (a call, a type annotation: what lane B answers with the fake instead of the recording
// proxy), and `rowCalls`, the call sites of an export the table lists under `pure` (library.json packages): an upper
// bound of the calls lane A reads without the world, since pureLibraryCall also asks the arrows and the result type.
// The walk skips what census.mjs skips: node_modules, dist, build, .next, coverage, test and story files, declarations.
import fs from 'node:fs';
import path from 'node:path';
import { ts } from './common.mjs';
import { packageOfSpecifier } from './library-rows.mjs';

const root = path.resolve(process.argv[2] ?? '.');
const jsonAt = process.argv.indexOf('--json');
// the library a specifier reaches: the fakes' table (exec/fakes/lib/index.mjs ROWS), by package
const LIB = [
  ['lodash', /^lodash(-es)?(\/[A-Za-z]+)?$|^lodash\.[a-z]+$/], ['zod', /^zod(\/.*)?$/], ['dayjs', /^dayjs(\/.*)?$/], ['luxon', /^luxon$/],
  ['date-fns', /^date-fns(\/.*)?$/], ['uuid', /^uuid$/], ['axios', /^axios$/], ['express', /^express(-serve-static-core)?$/], ['vscode', /^vscode$/],
];
const libOf = (s) => LIB.find(([, re]) => re.test(s))?.[0] ?? null;
const SKIP_DIR = new Set(['node_modules', 'dist', 'build', '.next', 'coverage', '.git', 'out']);
const SKIP_FILE = /\.(test|spec|stories)\.[cm]?tsx?$|\.d\.ts$|(^|\/)(__tests__|tests?|__mocks__)\//;
function* walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name.startsWith('._')) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!SKIP_DIR.has(e.name)) yield* walk(p); }
    else if (/\.(m?ts|tsx)$/.test(e.name) && !SKIP_FILE.test(path.relative(root, p))) yield p;
  }
}
const isUnit = (n) => ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n) || ts.isConstructorDeclaration(n) || ts.isGetAccessor(n) || ts.isSetAccessor(n)
  || ((ts.isArrowFunction(n) || ts.isFunctionExpression(n)) && (ts.isVariableDeclaration(n.parent) || ts.isPropertyDeclaration(n.parent) || ts.isPropertyAssignment(n.parent)));
const out = Object.fromEntries(LIB.map(([l]) => [l, { files: 0, units: 0, rowCalls: 0 }]));
let filesRead = 0, unitsAll = 0;
for (const f of walk(root)) {
  const text = fs.readFileSync(f, 'utf8');
  if (!/from\s+['"]|require\(/.test(text)) continue;
  const sf = ts.createSourceFile(f, text, ts.ScriptTarget.Latest, true, f.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  filesRead++;
  const binds = new Map(); // local name -> { lib, export (a named import), whole (default or namespace of the package) }
  for (const s of sf.statements) {
    if (!ts.isImportDeclaration(s) || !ts.isStringLiteral(s.moduleSpecifier) || !s.importClause) continue;
    const spec = s.moduleSpecifier.text, lib = libOf(spec); if (!lib) continue;
    const pkg = packageOfSpecifier(spec), c = s.importClause;
    if (c.name) binds.set(c.name.text, { lib, pkg, export: pkg?.export ?? null, whole: !!pkg?.whole });
    const nb = c.namedBindings;
    if (nb && ts.isNamespaceImport(nb)) binds.set(nb.name.text, { lib, pkg, export: null, whole: !!pkg?.whole });
    if (nb && ts.isNamedImports(nb)) for (const e of nb.elements) binds.set(e.name.text, { lib, pkg, export: pkg?.whole ? (e.propertyName ?? e.name).text : null, whole: false });
  }
  const libsHere = new Set([...binds.values()].map((b) => b.lib));
  for (const l of libsHere) out[l].files++;
  const pureOf = (b, name) => !!b.pkg && Object.values(b.pkg.row.pure ?? {}).some((xs) => xs.includes(name));
  const visit = (n, unitLibs) => {
    if (isUnit(n)) { unitsAll++; const mine = new Set(); ts.forEachChild(n, (c) => visit(c, mine)); for (const l of mine) out[l].units++; for (const l of mine) unitLibs?.add(l); return; }
    if (ts.isIdentifier(n) && binds.has(n.text) && unitLibs && !ts.isImportSpecifier(n.parent) && !ts.isImportClause(n.parent)) unitLibs.add(binds.get(n.text).lib);
    if (ts.isCallExpression(n)) {
      const e = n.expression;
      if (ts.isIdentifier(e) && binds.has(e.text)) { const b = binds.get(e.text); if (b.export && pureOf(b, b.export)) out[b.lib].rowCalls++; }
      else if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && binds.has(e.expression.text)) { const b = binds.get(e.expression.text); if (b.whole && pureOf(b, e.name.text)) out[b.lib].rowCalls++; }
    }
    ts.forEachChild(n, (c) => visit(c, unitLibs));
  };
  visit(sf, null);
}
const res = { root, filesRead, units: unitsAll, libraries: out };
if (jsonAt > 0) fs.writeFileSync(process.argv[jsonAt + 1], JSON.stringify(res, null, 1) + '\n');
console.log(`${path.basename(root)}: ${filesRead} files with imports, ${unitsAll} units`);
for (const [l, o] of Object.entries(out)) if (o.files) console.log(`  ${l}: ${o.files} files, ${o.units} units, ${o.rowCalls} row call sites`);
