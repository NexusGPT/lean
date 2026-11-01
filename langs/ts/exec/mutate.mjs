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
// and, listed after all of those (so a site of the kinds above keeps its index), in source order:
//   boolean              true <-> false
//   nullish              a returned value, a variable's initializer, an argument of a required parameter or the value of
//                        a required property becomes undefined (null where the expected type admits null and not
//                        undefined); only where the expected type admits one of them
//   dropped-assignment   an assignment, compound assignment, property write or ++/-- statement is removed
//   compound             += -= *= /= %= **= <<= >>= >>>= &= |= ^= &&= ||= ??= flipped
//   arithmetic           / % ** become *
//   equality             == <-> !=
//   coalesce             ?? becomes ||
//   bitwise              & <-> |, ^ -> &, << <-> >>, >>> -> >>
//   unary                a prefix ! - ~ is removed
//   template             a template literal gets a suffix
//   object-return        a returned array loses its first element (.slice(1)); a returned object literal its last property
// Every site has `lines` (the first and last line of the edited span, 1-based, counted by \n). A site of these later
// kinds has `was` = the file's text in [start, end) and `text` its replacement, so the mutant is
// text.slice(0, start) + text + text.slice(end).
// --list prints the sites. The mutation is a text edit; the rest of the file is untouched.
import fs from 'node:fs';
import path from 'node:path';
import { ts, loadProgram, topLevelFunctions } from '../common.mjs';

const K = ts.SyntaxKind;
const FLIP = { [K.LessThanToken]: '<=', [K.LessThanEqualsToken]: '<', [K.GreaterThanToken]: '>=', [K.GreaterThanEqualsToken]: '>', [K.EqualsEqualsEqualsToken]: '!==', [K.ExclamationEqualsEqualsToken]: '===', [K.PlusToken]: '-', [K.MinusToken]: '+', [K.AmpersandAmpersandToken]: '||', [K.BarBarToken]: '&&', [K.AsteriskToken]: '+' };
// the later binary kinds: operator token -> [kind, replacement]
const FLIP2 = {
  [K.SlashToken]: ['arithmetic', '*'], [K.PercentToken]: ['arithmetic', '*'], [K.AsteriskAsteriskToken]: ['arithmetic', '*'],
  [K.EqualsEqualsToken]: ['equality', '!='], [K.ExclamationEqualsToken]: ['equality', '=='],
  [K.QuestionQuestionToken]: ['coalesce', '||'],
  [K.AmpersandToken]: ['bitwise', '|'], [K.BarToken]: ['bitwise', '&'], [K.CaretToken]: ['bitwise', '&'], [K.LessThanLessThanToken]: ['bitwise', '>>'], [K.GreaterThanGreaterThanToken]: ['bitwise', '<<'], [K.GreaterThanGreaterThanGreaterThanToken]: ['bitwise', '>>'],
  [K.PlusEqualsToken]: ['compound', '-='], [K.MinusEqualsToken]: ['compound', '+='], [K.AsteriskEqualsToken]: ['compound', '/='], [K.SlashEqualsToken]: ['compound', '*='], [K.PercentEqualsToken]: ['compound', '*='], [K.AsteriskAsteriskEqualsToken]: ['compound', '*='],
  [K.LessThanLessThanEqualsToken]: ['compound', '>>='], [K.GreaterThanGreaterThanEqualsToken]: ['compound', '<<='], [K.GreaterThanGreaterThanGreaterThanEqualsToken]: ['compound', '>>='],
  [K.AmpersandEqualsToken]: ['compound', '|='], [K.BarEqualsToken]: ['compound', '&='], [K.CaretEqualsToken]: ['compound', '&='],
  [K.AmpersandAmpersandEqualsToken]: ['compound', '||='], [K.BarBarEqualsToken]: ['compound', '&&='], [K.QuestionQuestionEqualsToken]: ['compound', '||='],
};
const isAssignment = (k) => k === K.EqualsToken || (k >= K.FirstCompoundAssignment && k <= K.LastCompoundAssignment);
const UNARY = new Set([K.ExclamationToken, K.MinusToken, K.TildeToken]);
const PRIMITIVE = ts.TypeFlags.BooleanLike | ts.TypeFlags.NumberLike | ts.TypeFlags.StringLike | ts.TypeFlags.BigIntLike | ts.TypeFlags.ESSymbolLike | ts.TypeFlags.Void | ts.TypeFlags.Undefined | ts.TypeFlags.Null | ts.TypeFlags.Never | ts.TypeFlags.Any | ts.TypeFlags.Unknown;

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
    later(n);
    ts.forEachChild(n, walk);
  };
  // the later kinds: their own list, appended after the kinds above, so those keep their indices
  const extra = [];
  const put = (kind, start, end, rep) => extra.push({ kind, start, end, text: rep, was: text.slice(start, end) });
  // null or undefined where the expected type admits it (strict null checks: elsewhere it is a type error, never planted)
  const nullOf = (e) => {
    if (e.kind === K.NullKeyword || (ts.isIdentifier(e) && e.text === 'undefined') || ts.isVoidExpression(e)) return null;
    const t = checker.getContextualType(e);
    if (!t) return null;
    const ms = t.isUnion() ? t.types : [t];
    if (ms.some((m) => m.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void))) return 'undefined';
    if (ms.some((m) => m.flags & ts.TypeFlags.Null)) return 'null';
    return null;
  };
  const nullish = (e) => { const rep = e && !ts.isSpreadElement(e) ? nullOf(e) : null; if (rep) put('nullish', e.getStart(sf), e.getEnd(), rep); };
  const later = (n) => {
    if ((n.kind === K.TrueKeyword || n.kind === K.FalseKeyword) && !inType(n)) put('boolean', n.getStart(sf), n.getEnd(), n.kind === K.TrueKeyword ? 'false' : 'true');
    if (ts.isBinaryExpression(n) && FLIP2[n.operatorToken.kind]) { const [kind, rep] = FLIP2[n.operatorToken.kind]; put(kind, n.operatorToken.getStart(sf), n.operatorToken.getEnd(), rep); }
    // !!x: the inner ! only (removing either gives the same text)
    if (ts.isPrefixUnaryExpression(n) && UNARY.has(n.operator) && !(ts.isPrefixUnaryExpression(n.operand) && n.operand.operator === n.operator) && !inType(n)) put('unary', n.getStart(sf), n.operand.getStart(sf), '');
    if ((ts.isTemplateExpression(n) || ts.isNoSubstitutionTemplateLiteral(n)) && !inType(n) && text[n.getEnd() - 1] === '`') put('template', n.getEnd() - 1, n.getEnd(), 'x`');
    if (ts.isExpressionStatement(n)) {
      const e = ts.skipParentheses(n.expression);
      const write = (ts.isBinaryExpression(e) && isAssignment(e.operatorToken.kind)) || ((ts.isPrefixUnaryExpression(e) || ts.isPostfixUnaryExpression(e)) && (e.operator === K.PlusPlusToken || e.operator === K.MinusMinusToken));
      // a statement that is the whole body of an if or a loop becomes an empty statement, so the next one stays outside it
      const inList = ts.isBlock(n.parent) || ts.isSourceFile(n.parent) || ts.isCaseClause(n.parent) || ts.isDefaultClause(n.parent) || ts.isModuleBlock(n.parent);
      if (write) put('dropped-assignment', n.getStart(sf), n.getEnd(), inList ? '' : ';');
    }
    if (ts.isReturnStatement(n) && n.expression) nullish(n.expression);
    if (ts.isVariableDeclaration(n) && n.initializer) nullish(n.initializer);
    // an argument or a property value only where the receiver keeps it as a value: undefined passed to an optional, defaulted
    // or rest parameter, or as an optional property, is the receiver's default (join(",") and join(undefined) are equal)
    if ((ts.isCallExpression(n) || ts.isNewExpression(n)) && n.arguments) {
      const sig = checker.getResolvedSignature(n);
      n.arguments.forEach((e, i) => {
        const d = sig?.parameters[i]?.valueDeclaration;
        if (d && ts.isParameter(d) && !d.questionToken && !d.initializer && !d.dotDotDotToken) nullish(e);
      });
    }
    if (ts.isPropertyAssignment(n) && ts.isObjectLiteralExpression(n.parent)) {
      const t = checker.getContextualType(n.parent), name = n.name && (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name)) ? n.name.text : null;
      const p = t && name !== null && !t.isUnion() ? checker.getPropertyOfType(t, name) : null;
      if (p && !(p.flags & ts.SymbolFlags.Optional)) nullish(n.initializer);
    }
    if (ts.isReturnStatement(n) && n.expression) {
      const e = ts.skipParentheses(n.expression);
      if (ts.isObjectLiteralExpression(e) && e.properties.length) {
        const ps = e.properties, last = ps[ps.length - 1];
        // the last property and the comma before it; a lone property with its trailing comma
        if (ps.length > 1) put('object-return', ps[ps.length - 2].getEnd(), last.getEnd(), '');
        else put('object-return', last.getStart(sf), ps.hasTrailingComma ? text.indexOf(',', last.getEnd()) + 1 : last.getEnd(), '');
      } else {
        const t = checker.getTypeAtLocation(n.expression);
        if (!(t.flags & PRIMITIVE) && !t.isUnion() && checker.isArrayType(t)) { const x = n.expression.getText(sf); put('object-return', n.expression.getStart(sf), n.expression.getEnd(), `(${x}).slice(1)`); }
      }
    }
  };
  walk(u.body);
  sites.sort((a, b) => a.start - b.start);
  extra.sort((a, b) => a.start - b.start);
  sites.push(...extra);
  // the edited lines, 1-based, counted by \n (DA-Bench's M truth: file, lines, kind)
  const nl = []; for (let i = text.indexOf('\n'); i >= 0; i = text.indexOf('\n', i + 1)) nl.push(i);
  const lineAt = (pos) => { let lo = 0, hi = nl.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (nl[mid] < pos) lo = mid + 1; else hi = mid; } return lo + 1; };
  for (const s of sites) s.lines = [lineAt(s.start), lineAt(s.end)];
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
  if (a.includes('--list')) { const { sites } = sitesOf(file, unit, { project }); console.log(JSON.stringify(sites.map((s, i) => ({ i, kind: s.kind, was: s.was, text: s.text, lines: s.lines })), null, 1)); process.exit(0); }
  const m = mutate(file, unit, index, { project });
  if (!m) { console.error('no mutation site'); process.exit(1); }
  const out = opt('--out', null);
  if (out) { fs.writeFileSync(out, m.source); console.log(JSON.stringify({ site: m.site, count: m.count })); } else process.stdout.write(m.source);
}
