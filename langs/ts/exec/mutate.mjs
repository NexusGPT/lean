#!/usr/bin/env node
// Planted changes for the validator: one behaviour-changing edit inside one unit, chosen by index.
//   node mutate.mjs <file.ts> --unit <name|Class.method> --index k [--out mutated.ts] [--list]
// Mutation sites inside the unit's body, in source order; the k-th site (modulo the count) is applied:
//   operator flip        < <= > >= === !== + - && ||
//   boundary shift       a numeric literal n becomes n + 1
//   string change        a string literal gets a suffix
//   dropped branch       an if with an else loses its else; an if without else gets its condition negated
//   swapped arguments    a call with two or more arguments swaps the first two
//   dropped effect       a call statement is removed
//   changed return       a returned expression is wrapped: boolean -> negated, number -> + 1, string -> + "x", else unchanged
// --list prints the sites. The mutation is a text edit; the rest of the file is untouched.
import fs from 'node:fs';
import path from 'node:path';
import { ts, loadProgram, topLevelFunctions } from '../common.mjs';

const K = ts.SyntaxKind;
const FLIP = { [K.LessThanToken]: '<=', [K.LessThanEqualsToken]: '<', [K.GreaterThanToken]: '>=', [K.GreaterThanEqualsToken]: '>', [K.EqualsEqualsEqualsToken]: '!==', [K.ExclamationEqualsEqualsToken]: '===', [K.PlusToken]: '-', [K.MinusToken]: '+', [K.AmpersandAmpersandToken]: '||', [K.BarBarToken]: '&&', [K.AsteriskToken]: '+' };

export function sitesOf(file, unitName, opts = {}) {
  const { sf, checker } = loadProgram(file, { project: opts.project ?? true });
  const u = topLevelFunctions(sf).get(unitName);
  if (!u) throw new Error(`no unit ${unitName}`);
  const text = sf.text;
  const sites = [];
  // a literal in a type position, a decorator or an enum member changes no behaviour: not a site
  const inType = (n) => { for (let p = n.parent; p; p = p.parent) { if (ts.isTypeNode(p) || ts.isDecorator(p) || ts.isEnumMember(p) || ts.isTypeAliasDeclaration(p) || ts.isInterfaceDeclaration(p)) return true; if (ts.isStatement(p) || ts.isFunctionLike(p)) return false; } return false; };
  const walk = (n) => {
    if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) { ts.forEachChild(n, walk); return; }
    if (ts.isTypeNode(n) || ts.isDecorator(n)) return;
    if ((ts.isNumericLiteral(n) || ts.isStringLiteral(n) || ts.isBinaryExpression(n)) && inType(n)) { return; }
    if (ts.isBinaryExpression(n) && FLIP[n.operatorToken.kind]) sites.push({ kind: 'operator', start: n.operatorToken.getStart(sf), end: n.operatorToken.getEnd(), text: FLIP[n.operatorToken.kind], was: n.operatorToken.getText(sf) });
    if (ts.isNumericLiteral(n)) sites.push({ kind: 'boundary', start: n.getStart(sf), end: n.getEnd(), text: String(Number(n.text) + 1), was: n.text });
    if (ts.isStringLiteral(n) && !(n.parent && ts.isImportDeclaration(n.parent)) && !(n.parent && ts.isPropertyAssignment(n.parent) && n.parent.name === n)) sites.push({ kind: 'string', start: n.getStart(sf), end: n.getEnd(), text: JSON.stringify(n.text + 'x'), was: n.getText(sf) });
    if (ts.isIfStatement(n)) {
      if (n.elseStatement) sites.push({ kind: 'dropped-else', start: n.thenStatement.getEnd(), end: n.elseStatement.getEnd(), text: '', was: 'else ...' });
      else sites.push({ kind: 'negated-if', start: n.expression.getStart(sf), end: n.expression.getEnd(), text: `!(${n.expression.getText(sf)})`, was: n.expression.getText(sf) });
    }
    // a swap of two arguments is a mutation only where order matters: not for a commutative callee (Math.min, Math.max), nor
    // for two arguments of identical text; such a mutant is equivalent to its parent and would count as a miss unfairly
    const commutative = ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === 'Math' && ['min', 'max', 'hypot'].includes(n.expression.name.text);
    if (ts.isCallExpression(n) && n.arguments.length >= 2 && !commutative && !ts.isSpreadElement(n.arguments[0]) && !ts.isSpreadElement(n.arguments[1]) && n.arguments[0].getText(sf) !== n.arguments[1].getText(sf)) {
      const [a, b] = n.arguments;
      sites.push({ kind: 'swapped-args', start: a.getStart(sf), end: b.getEnd(), text: `${b.getText(sf)}, ${a.getText(sf)}`, was: `${a.getText(sf)}, ${b.getText(sf)}` });
    }
    if (ts.isExpressionStatement(n) && (ts.isCallExpression(n.expression) || ts.isAwaitExpression(n.expression))) sites.push({ kind: 'dropped-effect', start: n.getStart(sf), end: n.getEnd(), text: '', was: n.getText(sf).slice(0, 60) });
    if (ts.isReturnStatement(n) && n.expression) {
      const t = checker.getTypeAtLocation(n.expression); const f = t.flags;
      const e = n.expression.getText(sf);
      const rep = (f & ts.TypeFlags.BooleanLike) ? `!(${e})` : (f & ts.TypeFlags.NumberLike) ? `(${e}) + 1` : (f & ts.TypeFlags.StringLike) ? `(${e}) + "x"` : null;
      if (rep) sites.push({ kind: 'changed-return', start: n.expression.getStart(sf), end: n.expression.getEnd(), text: rep, was: e.slice(0, 60) });
    }
    ts.forEachChild(n, walk);
  };
  walk(u.body);
  sites.sort((a, b) => a.start - b.start);
  return { sites, text, unit: u };
}

// the count of type errors of a source placed beside the parent (same imports, same project); a mutant that adds
// errors is not a candidate anyone could ship, so it is not planted
function typeErrors(file, source, opts) {
  const tmp = path.join(path.dirname(file), `.lean_typecheck_${process.pid}${path.extname(file)}`);
  try { fs.writeFileSync(tmp, source); const { diagnostics } = loadProgram(tmp, { project: opts.project ?? true }); return diagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error).length; }
  catch { return Infinity; }
  finally { try { fs.rmSync(tmp, { force: true }); } catch { /* already gone */ } }
}
export function mutate(file, unitName, index, opts = {}) {
  const { sites, text } = sitesOf(file, unitName, opts);
  if (!sites.length) return null;
  const baseErrors = opts.typecheck === false ? 0 : typeErrors(file, text, opts);
  // the k-th site whose edit still parses; a site that breaks the syntax is skipped (it would be an ASK, not a change)
  for (let tries = 0; tries < sites.length; tries++) {
    const s = sites[(index + tries) % sites.length];
    const source = text.slice(0, s.start) + s.text + text.slice(s.end);
    const sf2 = ts.createSourceFile('m.ts', source, ts.ScriptTarget.ES2020, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    if (sf2.parseDiagnostics && sf2.parseDiagnostics.length) continue;
    if (opts.typecheck !== false && typeErrors(file, source, opts) > baseErrors) continue; // a mutant that breaks the types is not a candidate
    return { source, site: s, count: sites.length, skipped: tries };
  }
  return null;
}

if (process.argv[1] && new URL(import.meta.url).pathname === path.resolve(process.argv[1])) {
  const a = process.argv.slice(2);
  const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const file = a[0], unit = opt('--unit'), index = Number(opt('--index', 0));
  const project = a.includes('--no-project') ? false : opt('--project', true);
  if (a.includes('--list')) { const { sites } = sitesOf(file, unit, { project }); console.log(JSON.stringify(sites.map((s, i) => ({ i, kind: s.kind, was: s.was, text: s.text })), null, 1)); process.exit(0); }
  const m = mutate(file, unit, index, { project });
  if (!m) { console.error('no mutation site'); process.exit(1); }
  const out = opt('--out', null);
  if (out) { fs.writeFileSync(out, m.source); console.log(JSON.stringify({ site: m.site, count: m.count })); } else process.stdout.write(m.source);
}
