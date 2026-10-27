#!/usr/bin/env node
// The census of the two UI layers (design/ui-layers.md) over source roots, syntax only:
//   node langs/ts/design/ui-layers-census.mjs <root> [<root> ...] [--out census.json]
// A front-end unit is a top-level function or arrow const of a .tsx file whose body holds JSX. Per root it counts the
// units the tree layer reaches (a component tag declared in the same file or imported by a relative or `@/` path, which
// --deep renders; a useContext call; a provider element), and the units the styles layer reads (a className given as a
// string literal), with every class token of those literals resolved against the pinned table (exec/styles.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { ts } from '../common.mjs';
import { resolveClasses } from '../exec/styles.mjs';

const SKIP = new Set(['node_modules', 'dist', 'build', '.next', 'out', '.git', 'coverage']);
function* files(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { if (SKIP.has(e.name)) continue; const p = path.join(dir, e.name); if (e.isDirectory()) yield* files(p); else if (e.isFile() && p.endsWith('.tsx') && !p.endsWith('.d.tsx')) yield p; } }
const hasJsx = (n) => { let f = false; const w = (x) => { if (f) return; if (ts.isJsxElement(x) || ts.isJsxSelfClosingElement(x) || ts.isJsxFragment(x)) { f = true; return; } ts.forEachChild(x, w); }; w(n); return f; };

function census(root) {
  const c = { root, files: 0, units: 0, deepReach: 0, contextReaders: 0, providers: 0, styled: 0, literalClassNames: 0, tokens: 0, tokensResolved: 0, literalsResolved: 0, unknownTop: {} };
  for (const file of files(root)) {
    c.files++;
    const sf = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const local = new Set(); const relative = new Set();
    for (const st of sf.statements) {
      if (ts.isFunctionDeclaration(st) && st.name) local.add(st.name.text);
      if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) local.add(d.name.text);
      if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier) && /^(\.|@\/|~\/)/.test(st.moduleSpecifier.text) && st.importClause) { if (st.importClause.name) relative.add(st.importClause.name.text); const nb = st.importClause.namedBindings; if (nb && ts.isNamedImports(nb)) for (const el of nb.elements) relative.add(el.name.text); }
    }
    const units = [];
    for (const st of sf.statements) {
      const node = ts.isFunctionDeclaration(st) ? st : ts.isVariableStatement(st) ? st.declarationList.declarations.find((d) => d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)))?.initializer : ts.isExportAssignment(st) ? st.expression : null;
      if (node && node.body && hasJsx(node.body)) units.push(node);
    }
    for (const u of units) {
      c.units++;
      let deep = false, ctx = false, prov = false, styled = false;
      const w = (n) => {
        if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
          const tag = n.tagName.getText(sf);
          if (/\.Provider$/.test(tag)) prov = true;
          else if (/^[A-Z]/.test(tag) && (local.has(tag) || relative.has(tag))) deep = true;
          for (const a of n.attributes.properties) {
            if (!ts.isJsxAttribute(a) || !ts.isIdentifier(a.name) || a.name.text !== 'className' || !a.initializer) continue;
            const lit = ts.isStringLiteral(a.initializer) ? a.initializer : ts.isJsxExpression(a.initializer) && a.initializer.expression && (ts.isStringLiteral(a.initializer.expression) || ts.isNoSubstitutionTemplateLiteral(a.initializer.expression)) ? a.initializer.expression : null;
            if (!lit) continue;
            styled = true; c.literalClassNames++;
            const r = resolveClasses(lit.text); const toks = lit.text.split(/\s+/).filter(Boolean);
            c.tokens += toks.length; c.tokensResolved += toks.length - r.unknown.length;
            if (!r.unknown.length && !r.conflicts.length) c.literalsResolved++;
            for (const t of r.unknown) { const k = t.replace(/-[^-:]+$/, '-*'); c.unknownTop[k] = (c.unknownTop[k] ?? 0) + 1; }
          }
        }
        if (ts.isCallExpression(n) && ((ts.isIdentifier(n.expression) && n.expression.text === 'useContext') || (ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'useContext'))) ctx = true;
        ts.forEachChild(n, w);
      };
      w(u.body);
      if (deep) c.deepReach++; if (ctx) c.contextReaders++; if (prov) c.providers++; if (styled) c.styled++;
    }
  }
  c.unknownTop = Object.fromEntries(Object.entries(c.unknownTop).sort((a, b) => b[1] - a[1]).slice(0, 12));
  return c;
}

const a = process.argv.slice(2); const out = a.includes('--out') ? a[a.indexOf('--out') + 1] : null;
const roots = a.filter((x, i) => !x.startsWith('--') && a[i - 1] !== '--out');
const res = roots.map(census);
for (const c of res) console.log(`${c.root}: ${c.files} .tsx files, ${c.units} front-end units; tree layer: ${c.deepReach} render a same-package component, ${c.contextReaders} call useContext, ${c.providers} render a provider; styles layer: ${c.styled} units with ${c.literalClassNames} literal classNames, ${c.tokensResolved} of ${c.tokens} class tokens resolved, ${c.literalsResolved} literals fully resolved`);
if (out) fs.writeFileSync(out, JSON.stringify(res, null, 1));
