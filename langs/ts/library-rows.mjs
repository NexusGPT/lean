// The library rows of stage 5 (design/library-rows.md): built-ins the ordinary lane reads from the rows of
// translate/library.json whose `lane` is `ordinary`. The lint and the translator share these predicates, so the lint
// admits exactly the calls the translator reads.
import { ts, isArrayLike } from './common.mjs';

// in-place rows used as values: the removed element or run is the value, and the receiver changes
export const ARRAY_VALUE_MUTATORS = new Set(['pop', 'shift', 'splice']);
// the text depends on the host's locale data (ECMA-402): a world read, never a pure function
export const LOCALE_READS = new Set(['toLocaleString', 'toLocaleLowerCase', 'toLocaleUpperCase']);

const strip = (x) => { while (ts.isParenthesizedExpression(x) || ts.isAsExpression(x) || ts.isNonNullExpression(x) || ts.isSatisfiesExpression(x) || ts.isTypeAssertionExpression(x)) x = x.expression; return x; };
const nonNull = (t) => (t.flags & ts.TypeFlags.Union ? t.types.filter((x) => !(x.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null))) : [t]);
const FRESH_ARRAY_METHODS = new Set(['slice', 'concat', 'map', 'filter', 'flat', 'flatMap', 'toSorted', 'toReversed']);

// an array no other name reaches: a literal, `new Array(n)`, `Array(n)`, `Array.from`, `Array.of`, `Object.keys`,
// `Object.values`, `Object.entries`, a string's `split`, or an array method whose row returns a fresh array; `fill`
// returns its receiver, so it is fresh when its receiver is. isGlobal(id): the name is the global built-in.
export function freshArray(checker, x, isGlobal) {
  x = strip(x);
  if (x.flags & ts.NodeFlags.OptionalChain) return false;
  if (ts.isArrayLiteralExpression(x)) return !x.elements.some(ts.isSpreadElement) || x.elements.every((el) => !ts.isSpreadElement(el) || nonNull(checker.getTypeAtLocation(el.expression)).every((t) => isArrayLike(checker, t)));
  if (ts.isNewExpression(x)) return ts.isIdentifier(x.expression) && x.expression.text === 'Array' && isGlobal(x.expression);
  if (!ts.isCallExpression(x)) return false;
  const f = strip(x.expression);
  if (ts.isIdentifier(f)) return f.text === 'Array' && isGlobal(f);
  if (!ts.isPropertyAccessExpression(f)) return false;
  const r = f.expression, name = f.name.text;
  if (ts.isIdentifier(r) && isGlobal(r)) return (r.text === 'Array' && (name === 'from' || name === 'of')) || (r.text === 'Object' && ['keys', 'values', 'entries'].includes(name));
  const parts = nonNull(checker.getTypeAtLocation(r));
  if (!parts.length) return false;
  if (name === 'split') return parts.every((t) => !!(t.flags & ts.TypeFlags.StringLike));
  if (!parts.every((t) => isArrayLike(checker, t))) return false;
  if (FRESH_ARRAY_METHODS.has(name)) return true;
  return name === 'fill' && freshArray(checker, r, isGlobal);
}

// where a mutator used as a value runs: the statement that runs it on every path, and the part of that statement in
// which no other read of the receiver may appear (the change is bound before the statement). null when the call sits
// under a condition, a short circuit's right side, an optional chain, a loop header or a callback.
export function unconditionalSite(e) {
  const K = ts.SyntaxKind;
  const shortCircuit = new Set([K.AmpersandAmpersandToken, K.BarBarToken, K.QuestionQuestionToken, K.AmpersandAmpersandEqualsToken, K.BarBarEqualsToken, K.QuestionQuestionEqualsToken]);
  let x = e;
  for (;;) {
    const p = x.parent;
    if (!p) return null;
    if (ts.isParenthesizedExpression(p) || ts.isAsExpression(p) || ts.isNonNullExpression(p) || ts.isSatisfiesExpression(p) || ts.isTypeAssertionExpression(p) || ts.isAwaitExpression(p) || ts.isTemplateSpan(p) || ts.isTemplateExpression(p) || ts.isArrayLiteralExpression(p) || ts.isTypeOfExpression(p) || (ts.isPrefixUnaryExpression(p) && p.operator !== K.PlusPlusToken && p.operator !== K.MinusMinusToken)) { x = p; continue; }
    if (ts.isBinaryExpression(p)) { if (p.right === x && shortCircuit.has(p.operatorToken.kind)) return null; if (p.left === x && p.operatorToken.kind >= K.FirstAssignment && p.operatorToken.kind <= K.LastAssignment) return null; x = p; continue; }
    if (ts.isConditionalExpression(p)) { if (p.condition !== x) return null; x = p; continue; }
    if (ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p) || ts.isCallExpression(p)) { if (p.questionDotToken || (p.flags & ts.NodeFlags.OptionalChain)) return null; x = p; continue; }
    if (ts.isPropertyAssignment(p) && p.initializer === x) { x = p.parent; continue; }
    if (ts.isVariableDeclaration(p) && p.initializer === x) { const st = p.parent?.parent; return st && ts.isVariableStatement(st) ? { stmt: st, scope: p } : null; }
    if (ts.isExpressionStatement(p) || ts.isReturnStatement(p)) return { stmt: p, scope: p };
    if (ts.isIfStatement(p) && p.expression === x) return { stmt: p, scope: x };
    return null;
  }
}

// how often a name with this symbol is read inside a node (the receiver itself counts once)
export function readsOf(checker, node, sym) {
  let k = 0;
  const w = (x) => { if (ts.isIdentifier(x) && checker.getSymbolAtLocation(x) === sym) k++; ts.forEachChild(x, w); };
  w(node);
  return k;
}

// a value whose JavaScript ToString is fixed by its own value: string, number, bigint, boolean (and their literals)
export const primitiveText = (t) => nonNull(t).length > 0 && !(t.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)) && nonNull(t).every((x) => !!(x.flags & (ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.BigIntLike | ts.TypeFlags.BooleanLike | ts.TypeFlags.EnumLike)));
