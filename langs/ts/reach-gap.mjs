#!/usr/bin/env node
// lean reach-gap: every function-like node of a repository that lean does NOT list as a unit, counted by its syntactic
// parent. A function outside the unit list is outside every census denominator, so this is the structural reach gap.
//   node reach-gap.mjs <root>... [--roots manifest.json] [--js] [--lean <checkout>] [--out gap.json] [--report gap.md] [--examples N]
// Files are the census's own walk (census.mjs `walk`, TypeScript extensions; `--js` also reads .js/.jsx/.mjs/.cjs and
// reports them apart). Listed means listed by `topLevelFunctions` in common.mjs, the one listing function the census,
// pr.mjs, the lint and the translator read; nothing here keeps a second list. --lean <checkout> reads that checkout's
// listing instead (a before and after over the same walk). Syntax only: no program, no checker.
// Read-only: nothing is written into a repository.
import fs from 'node:fs';
import path from 'node:path';
import { ts, topLevelFunctions as ownListing, callbackUnits } from './common.mjs';
import { pathToFileURL } from 'node:url';
import { walk, TS_EXT, JS_EXT } from './census.mjs';

// The parent kinds, one per unlisted function, decided in this order by the function's own syntactic position.
export const KINDS = [
  ['objlit-exported', 'a direct method or function-valued property of an object literal that is exported (export const X = {...}, export default {...}, module.exports = {...}, exports.x = {...})'],
  ['objlit-module-const', 'the same, of an object literal bound to a module-level const that is not exported'],
  ['objlit-other', 'a method or function-valued property of any other object literal (nested literal, local literal, argument, let)'],
  ['exports-assign', 'the right side of module.exports = f, exports.x = f, module.exports.x = f'],
  ['prop-assign', 'the right side of any other property assignment a.b = f, a[k] = f'],
  ['class-field', 'a class field initialised with a function or arrow'],
  ['class-other', 'a class member not listed (a class expression, a nested or unnamed class, a computed or private name)'],
  ['callback', 'an argument of a call or new'],
  ['iife', 'the callee of a call (an immediately invoked function)'],
  ['nested', 'a function declaration or a variable initialiser inside another function'],
  ['top-other', 'a module-level declaration not listed (let or var, several declarators, an anonymous default export)'],
  ['other', 'anything else (a return value, an array element, a JSX attribute, a default parameter, a conditional)'],
];

const upParens = (n) => { let c = n; while (c.parent && (ts.isParenthesizedExpression(c.parent) || ts.isAsExpression(c.parent) || ts.isSatisfiesExpression?.(c.parent) || ts.isTypeAssertionExpression(c.parent) || ts.isNonNullExpression(c.parent))) c = c.parent; return c; };
const isModuleExports = (e) => ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'module' && e.name.text === 'exports';
const isExportsTarget = (e) => isModuleExports(e) || (ts.isIdentifier(e) && e.text === 'exports')
  || (ts.isPropertyAccessExpression(e) && (isModuleExports(e.expression) || (ts.isIdentifier(e.expression) && e.expression.text === 'exports')));
const isFunctionLike = (n) => ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) || ts.isMethodDeclaration(n) || ts.isGetAccessorDeclaration(n) || ts.isSetAccessorDeclaration(n) || ts.isConstructorDeclaration(n);
const enclosingFunction = (n) => { for (let p = n.parent; p; p = p.parent) if (isFunctionLike(p) || ts.isClassStaticBlockDeclaration(p)) return p; return null; };
const hasExport = (st) => !!st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

/** Where an object literal lives: 'exported', 'module-const', or 'other'. */
export function literalHome(obj) {
  const at = upParens(obj), p = at.parent;
  if (!p) return 'other';
  if (ts.isVariableDeclaration(p) && p.initializer === at && ts.isIdentifier(p.name)) {
    const st = p.parent?.parent;
    if (st && ts.isVariableStatement(st) && ts.isSourceFile(st.parent) && (p.parent.flags & ts.NodeFlags.Const)) return hasExport(st) ? 'exported' : 'module-const';
    return 'other';
  }
  if (ts.isExportAssignment(p) && ts.isSourceFile(p.parent)) return 'exported';
  if (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.EqualsToken && p.right === at && isExportsTarget(p.left) && ts.isExpressionStatement(p.parent) && ts.isSourceFile(p.parent.parent)) return 'exported';
  return 'other';
}

/** The parent kind of one unlisted function-like node. */
export function kindOf(fn) {
  const at = upParens(fn), p = at.parent;
  // an object-literal member: a method or accessor, or a property whose value is the function
  const literal = (ts.isMethodDeclaration(fn) || ts.isGetAccessorDeclaration(fn) || ts.isSetAccessorDeclaration(fn)) && ts.isObjectLiteralExpression(fn.parent) ? fn.parent
    : p && ts.isPropertyAssignment(p) && p.initializer === at && ts.isObjectLiteralExpression(p.parent) ? p.parent : null;
  if (literal) { const h = literalHome(literal); return h === 'exported' ? 'objlit-exported' : h === 'module-const' ? 'objlit-module-const' : 'objlit-other'; }
  if (p && ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.EqualsToken && p.right === at) {
    if (isExportsTarget(p.left)) return 'exports-assign';
    if (ts.isPropertyAccessExpression(p.left) || ts.isElementAccessExpression(p.left)) return 'prop-assign';
  }
  if (p && ts.isPropertyDeclaration(p) && p.initializer === at && (ts.isClassDeclaration(p.parent) || ts.isClassExpression(p.parent))) return 'class-field';
  if (ts.isMethodDeclaration(fn) || ts.isGetAccessorDeclaration(fn) || ts.isSetAccessorDeclaration(fn) || ts.isConstructorDeclaration(fn)) return 'class-other';
  if (p && (ts.isCallExpression(p) || ts.isNewExpression(p)) && p.arguments?.includes(at)) return 'callback';
  if (p && ts.isCallExpression(p) && p.expression === at) return 'iife';
  const inFunction = !!enclosingFunction(fn);
  const declared = ts.isFunctionDeclaration(fn) || (p && ts.isVariableDeclaration(p) && p.initializer === at);
  if (inFunction && declared) return 'nested';
  if (!inFunction && (declared || (p && ts.isExportAssignment(p)))) return 'top-other';
  return 'other';
}

// the key of an object-literal member a unit can carry: a method or a function-valued property (not a getter or setter,
// whose key is read, not called) whose key is a static name (an identifier, or a string that is one)
export const staticKey = (fn) => { if (ts.isGetAccessorDeclaration(fn) || ts.isSetAccessorDeclaration(fn)) return null; const m = ts.isPropertyAssignment(upParens(fn).parent) ? upParens(fn).parent : fn; const n = m.name; return n && (ts.isIdentifier(n) || (ts.isStringLiteral(n) && /^[A-Za-z_$][\w$]*$/.test(n.text))) ? n.text : null; };
let topLevelFunctions = ownListing;
const callbackCounts = () => Object.fromEntries([
  ...['module', 'body'].flatMap((scope) => ['Arrow', 'Function'].flatMap((form) => ['Block', 'Expression'].map((body) => scope + form + body))),
  'orderNamed', 'otherScope', 'predicted',
].map((k) => [k, 0]));

/** Every function-like node with a body, of one parsed file, against the listed units. */
export function gapOfFile(sf, listing = topLevelFunctions) {
  const units = listing(sf);
  const listed = new Set([...units.values()].map((u) => u.fn));
  const callbacks = callbackCounts(), predicted = callbackUnits(sf, units), eligible = new Set(predicted.map((u) => u.fn));
  for (const u of predicted) if (!listed.has(u.fn)) {
    callbacks.predicted++;
    callbacks[(u.enclosingUnit ? 'body' : 'module') + (u.isArrow ? 'Arrow' : 'Function') + (ts.isBlock(u.body) ? 'Block' : 'Expression')]++;
    if (u.orderNamed) callbacks.orderNamed++;
  }
  const counts = Object.fromEntries(KINDS.map(([k]) => [k, 0]));
  const examples = [];
  let functions = 0, listable = 0; // listable: the exported and module-const literal members with a static key (the reading of design/exported-units.md)
  const visit = (n) => {
    if (isFunctionLike(n) && n.body) {
      functions++;
      if (!listed.has(n)) { const k = kindOf(n); counts[k]++; if (k === 'callback' && !eligible.has(n)) callbacks.otherScope++; if ((k === 'objlit-exported' || k === 'objlit-module-const') && staticKey(n)) listable++; examples.push({ kind: k, line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1 }); }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return { listed: listed.size, functions, listable, counts, examples, callbacks };
}

const kindOfFile = (f) => (/\.tsx$/.test(f) ? ts.ScriptKind.TSX : /\.(ts|mts|cts)$/.test(f) ? ts.ScriptKind.TS : /\.jsx$/.test(f) ? ts.ScriptKind.JSX : ts.ScriptKind.JS);

export function reachGap(root, { js = false, examples: keep = 3 } = {}) {
  const side = () => ({ files: 0, unreadable: 0, functions: 0, listed: 0, unlisted: 0, listable: 0, callbacks: callbackCounts(), kinds: Object.fromEntries(KINDS.map(([k]) => [k, 0])), examples: Object.fromEntries(KINDS.map(([k]) => [k, []])) });
  const out = { root, ts: side(), ...(js ? { js: side() } : {}) };
  const sides = [['ts', TS_EXT], ...(js ? [['js', JS_EXT]] : [])];
  for (const [lang, ext] of sides) for (const file of walk(root, ext)) {
    const S = out[lang];
    let text; try { text = fs.readFileSync(file, 'utf8'); } catch { S.unreadable++; continue; }
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kindOfFile(file));
    const g = gapOfFile(sf);
    for (const [k, v] of Object.entries(g.callbacks)) S.callbacks[k] += v;
    S.files++; S.functions += g.functions; S.listed += g.listed; S.listable += g.listable;
    for (const [k, v] of Object.entries(g.counts)) { S.kinds[k] += v; S.unlisted += v; }
    for (const e of g.examples) if (S.examples[e.kind].length < keep) S.examples[e.kind].push(`${path.relative(root, file)}:${e.line}`);
  }
  return out;
}

export function gapReport(rows, lang) {
  const head = ['repository', 'files', 'listed', 'unlisted', ...KINDS.map(([k]) => k), 'objlit static key', ...Object.keys(callbackCounts())];
  const lines = [`| ${head.join(' | ')} |`, `| --- |${head.slice(1).map(() => ' ---: |').join('')}`];
  const total = { files: 0, listed: 0, unlisted: 0, listable: 0, callbacks: callbackCounts(), kinds: Object.fromEntries(KINDS.map(([k]) => [k, 0])) };
  for (const r of rows) {
    const S = r[lang]; if (!S || !S.files) continue;
    for (const [k, v] of Object.entries(S.callbacks)) total.callbacks[k] += v;
    total.files += S.files; total.listed += S.listed; total.unlisted += S.unlisted; total.listable += S.listable;
    for (const [k] of KINDS) total.kinds[k] += S.kinds[k];
    lines.push(`| ${r.name ?? path.basename(r.root)} | ${S.files} | ${S.listed} | ${S.unlisted} | ${KINDS.map(([k]) => S.kinds[k]).join(' | ')} | ${S.listable} | ${Object.values(S.callbacks).join(' | ')} |`);
  }
  lines.push(`| TOTAL | ${total.files} | ${total.listed} | ${total.unlisted} | ${KINDS.map(([k]) => total.kinds[k]).join(' | ')} | ${total.listable} | ${Object.values(total.callbacks).join(' | ')} |`);
  return { table: lines.join('\n'), total };
}

if (process.argv[1] && new URL(import.meta.url).pathname === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const valued = new Set(['--out', '--report', '--examples', '--roots', '--lean']);
  const roots = a.filter((x, i) => !x.startsWith('--') && !valued.has(a[i - 1]));
  // --roots <manifest.json>: the harness's census cohort ({roots:[{name, root}]})
  const manifest = opt('--roots', null);
  const named = manifest ? JSON.parse(fs.readFileSync(manifest, 'utf8')).roots.map((r) => ({ name: r.name, root: r.root })) : [];
  for (const r of roots) named.push({ name: path.basename(path.resolve(r)), root: path.resolve(r) });
  const js = a.includes('--js');
  if (opt('--lean', null)) topLevelFunctions = (await import(pathToFileURL(path.join(path.resolve(opt('--lean', null)), 'langs/ts/common.mjs')).href)).topLevelFunctions; // that checkout's listing, this walk and these kinds
  const rows = [];
  for (const { name, root } of named) {
    if (!fs.existsSync(root)) { console.error(`! ${name}: ${root} missing`); rows.push({ name, root, missing: true }); continue; }
    const r = { name, ...reachGap(root, { js, examples: Number(opt('--examples', 3)) }) };
    rows.push(r);
    console.error(`${name}: ts ${r.ts.files} files ${r.ts.listed} listed ${r.ts.unlisted} unlisted${js ? `; js ${r.js.files} files ${r.js.listed} listed ${r.js.unlisted} unlisted` : ''}`);
  }
  const ts_ = gapReport(rows, 'ts'), js_ = js ? gapReport(rows, 'js') : null;
  if (opt('--out', null)) fs.writeFileSync(opt('--out', null), JSON.stringify({ kinds: KINDS, rows, totals: { ts: ts_.total, ...(js_ ? { js: js_.total } : {}) } }, null, 1));
  const md = ['## TypeScript files (the census walk)', '', ts_.table, '', ...(js_ ? ['## JavaScript files (the same walk, .js/.jsx/.mjs/.cjs)', '', js_.table, ''] : []), '## Kinds', '', ...KINDS.map(([k, d]) => `- \`${k}\`: ${d}.`), '- `objlit static key`: of `objlit-exported` and `objlit-module-const`, the methods and function-valued properties whose key is a static name (an identifier, or a string that is one; getters and setters excluded): what the exported-units reading lists.', ''].join('\n');
  if (opt('--report', null)) fs.writeFileSync(opt('--report', null), md);
  process.stdout.write(md);
}
