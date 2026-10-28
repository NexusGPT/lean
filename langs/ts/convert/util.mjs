// Shared syntax-tree helpers for the converter's transforms. Every edit is a span of the source file taken from a
// node of the TypeScript syntax tree and the text that replaces it; the replacement is built from the source text of
// other nodes, never from a pattern over the text.
import { ts } from '../common.mjs';

const K = ts.SyntaxKind;

// the node a lint finding marks: the finding carries the start and end of the node it was raised on
export function nodeAt(sf, finding) {
  const pos = sf.getPositionOfLineAndCharacter(finding.line - 1, finding.col - 1);
  const end = finding.endLine ? sf.getPositionOfLineAndCharacter(finding.endLine - 1, finding.endCol - 1) : null;
  let best = null;
  const visit = (n) => {
    const s = n.getStart(sf);
    if (s > pos || n.end < pos) return;
    if (s === pos && (end === null || n.end === end)) best = n; // the outermost exact match wins first, a deeper one replaces it
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return best;
}

export const src = (sf, n) => sf.text.slice(n.getStart(sf), n.end);
export const unparen = (x) => { while (x && ts.isParenthesizedExpression(x)) x = x.expression; return x; };

// the leading white space of the line a position is on
export function indentAt(sf, pos) {
  const start = sf.getLineStarts()[sf.getLineAndCharacterOfPosition(pos).line];
  let i = start; while (i < sf.text.length && (sf.text[i] === ' ' || sf.text[i] === '\t')) i++;
  return sf.text.slice(start, i);
}

// a name no identifier of the file uses yet; the names handed out in this run are remembered on the source file
export function freshName(sf, base) {
  if (!sf.__names) { sf.__names = new Set(); const w = (n) => { if (ts.isIdentifier(n) || ts.isPrivateIdentifier(n)) sf.__names.add(n.text); ts.forEachChild(n, w); }; w(sf); }
  const clean = base.replace(/[^A-Za-z0-9_$]/g, '') || 'value';
  let name = /^[0-9]/.test(clean) ? '_' + clean : clean, k = 2;
  while (sf.__names.has(name) || RESERVED.has(name)) name = clean + k++;
  sf.__names.add(name);
  return name;
}
const RESERVED = new Set(['break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield', 'let', 'static', 'implements', 'interface', 'package', 'private', 'protected', 'public', 'await', 'async', 'of', 'type']);

// the statement that holds a node directly in a statement list (a block, a case clause, the file)
export function statementOf(n) {
  while (n && n.parent && !(ts.isBlock(n.parent) || ts.isSourceFile(n.parent) || ts.isCaseClause(n.parent) || ts.isDefaultClause(n.parent) || ts.isModuleBlock(n.parent))) n = n.parent;
  return n && n.parent ? n : null;
}

// the nearest enclosing function of a node (an arrow included)
export function functionOf(n) {
  for (let p = n.parent; p; p = p.parent) if (ts.isFunctionLike(p) && p.body) return p;
  return null;
}

// a pure path: a name, `this`, or a chain of plain field reads off one; reading it twice gives the same value when
// nothing between the two reads writes it (no call, no getter: the type is a plain data record, decided by the caller)
export function purePath(x) {
  x = unparen(x);
  if (ts.isIdentifier(x) || x.kind === K.ThisKeyword) return true;
  if (ts.isPropertyAccessExpression(x) && !x.questionDotToken) return purePath(x.expression);
  return false;
}

// the root name of a pure path
export function rootOf(x) {
  x = unparen(x);
  while (ts.isPropertyAccessExpression(x)) x = unparen(x.expression);
  return ts.isIdentifier(x) ? x : null;
}

// every identifier under `scope` that names the symbol `sym`
export function symbolOf(checker, id) {
  const p = id.parent;
  if (p && ts.isShorthandPropertyAssignment(p) && p.name === id) return checker.getShorthandAssignmentValueSymbol(p);
  return checker.getSymbolAtLocation(id);
}
export function usesOf(checker, sym, scope) {
  const out = [];
  if (!sym) return out;
  const w = (n) => { if (ts.isIdentifier(n) && symbolOf(checker, n) === sym) out.push(n); ts.forEachChild(n, w); };
  w(scope);
  return out;
}

// two expressions are the same syntax tree (the same kinds, names and literals), whatever their spacing
export function sameTree(a, b) {
  a = unparen(a); b = unparen(b);
  if (!a || !b || a.kind !== b.kind) return false;
  if (ts.isIdentifier(a) || ts.isPrivateIdentifier(a)) return a.text === b.text;
  if (ts.isLiteralExpression(a) || ts.isNoSubstitutionTemplateLiteral(a)) return a.text === b.text;
  const ca = [], cb = [];
  ts.forEachChild(a, (x) => { ca.push(x); }); ts.forEachChild(b, (x) => { cb.push(x); });
  if (ca.length !== cb.length) return false;
  if ((a.operatorToken?.kind ?? null) !== (b.operatorToken?.kind ?? null) || (a.operator ?? null) !== (b.operator ?? null)) return false;
  return ca.every((x, i) => sameTree(x, cb[i]));
}

// an identifier is written: the target of an assignment, an update, a delete, or a binding of a for-in/of head
export function isWritten(id) {
  let x = id; while (x.parent && ts.isParenthesizedExpression(x.parent)) x = x.parent;
  const p = x.parent;
  if (!p) return false;
  if (ts.isBinaryExpression(p) && p.left === x && p.operatorToken.kind >= K.FirstAssignment && p.operatorToken.kind <= K.LastAssignment) return true;
  if ((ts.isPrefixUnaryExpression(p) || ts.isPostfixUnaryExpression(p)) && (p.operator === K.PlusPlusToken || p.operator === K.MinusMinusToken)) return true;
  if (ts.isDeleteExpression(p)) return true;
  if ((ts.isShorthandPropertyAssignment(p) || ts.isPropertyAssignment(p)) && p.parent && ts.isObjectLiteralExpression(p.parent) && isAssignmentPattern(p.parent)) return true;
  if (ts.isArrayLiteralExpression(p) && isAssignmentPattern(p)) return true;
  return false;
}
function isAssignmentPattern(lit) {
  let x = lit;
  while (x.parent && (ts.isObjectLiteralExpression(x.parent) || ts.isArrayLiteralExpression(x.parent) || ts.isPropertyAssignment(x.parent) || ts.isShorthandPropertyAssignment(x.parent) || ts.isSpreadElement(x.parent) || ts.isSpreadAssignment(x.parent))) x = x.parent;
  return !!x.parent && ts.isBinaryExpression(x.parent) && x.parent.left === x && x.parent.operatorToken.kind === K.EqualsToken;
}

// a type with no undefined (and no any or unknown) in it
export function excludesUndefined(t) {
  return !(t.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void | ts.TypeFlags.Any | ts.TypeFlags.Unknown)) && !(t.flags & ts.TypeFlags.Union && t.types.some((x) => x.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Void | ts.TypeFlags.Any | ts.TypeFlags.Unknown)));
}

// a plain data record: an object type that is not a class instance, has no call or construct signature, and whose
// properties carry no methods or accessors (a spread copy of it holds the same fields)
export function plainRecordType(checker, t) {
  if (!t || !(t.flags & ts.TypeFlags.Object)) return false;
  if (checker.isArrayType(t) || checker.isTupleType(t)) return false;
  if (t.getCallSignatures().length || t.getConstructSignatures().length) return false;
  const sym = t.getSymbol();
  if (sym && sym.flags & ts.SymbolFlags.Class) return false;
  for (const p of t.getProperties()) {
    if (p.flags & (ts.SymbolFlags.Method | ts.SymbolFlags.GetAccessor | ts.SymbolFlags.SetAccessor)) return false;
  }
  if (sym && ['Map', 'Set', 'Date', 'RegExp', 'Promise', 'WeakMap', 'WeakSet'].includes(sym.getName())) return false;
  return true;
}

// a statement always leaves its block: return, throw, break, continue, or a block whose last statement does
export function exits(s) {
  if (!s) return false;
  if (ts.isReturnStatement(s) || ts.isThrowStatement(s) || ts.isBreakStatement(s) || ts.isContinueStatement(s)) return true;
  if (ts.isBlock(s)) return s.statements.length > 0 && exits(s.statements[s.statements.length - 1]);
  return false;
}

// the statement just before `s` in its statement list, or null
export function previousStatement(s) {
  const list = s.parent && (s.parent.statements ?? null);
  if (!list) return null;
  const i = list.indexOf(s);
  return i > 0 ? list[i - 1] : null;
}

// a node contains a node of one of these kinds, not looking inside nested functions
export function contains(n, pred, intoFunctions = false) {
  let hit = false;
  const w = (x) => { if (hit) return; if (pred(x)) { hit = true; return; } if (!intoFunctions && ts.isFunctionLike(x)) return; ts.forEachChild(x, w); };
  ts.forEachChild(n, w);
  return hit;
}

// the source text of a type at a node, written so it can be pasted at that node; null when it would not be a type
// the reader can paste (an import type, an anonymous type too long to read, any)
export function typeText(checker, t, at) {
  if (!t || t.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return null;
  const s = checker.typeToString(t, at, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope | ts.TypeFormatFlags.WriteArrowStyleSignature);
  if (/\bimport\(|\bany\b|\.\.\.|typeof /.test(s) || s.length > 160) return null;
  return s;
}

export { ts, K };
