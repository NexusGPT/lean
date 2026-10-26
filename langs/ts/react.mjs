// react imports and closure facts shared by the lint and translator
import { ts } from './common.mjs';
const K = ts.SyntaxKind;
export function reactHook(checker, n) {
  if (!ts.isCallExpression(n)) return null;
  const f = n.expression;
  const id = ts.isIdentifier(f) ? f : ts.isPropertyAccessExpression(f) && ts.isIdentifier(f.expression) ? f.expression : null;
  if (!id) return null;
  const d = checker.getSymbolAtLocation(id)?.declarations?.[0];
  let imp = d; while (imp && !ts.isImportDeclaration(imp)) imp = imp.parent;
  if (!imp || imp.moduleSpecifier.text !== 'react') return null;
  if (ts.isIdentifier(f) && ts.isImportSpecifier(d)) return (d.propertyName ?? d.name).text;
  if (ts.isPropertyAccessExpression(f) && (ts.isNamespaceImport(d) || ts.isImportClause(d))) return f.name.text;
  return null;
}
export function arrowOf(checker, n, seen = new Set()) {
  if (!n || seen.has(n)) return null;
  seen.add(n);
  if (ts.isParenthesizedExpression(n)) return arrowOf(checker, n.expression, seen);
  if (ts.isArrowFunction(n)) return n;
  if (reactHook(checker, n) === 'useCallback') return arrowOf(checker, n.arguments[0], seen);
  if (ts.isIdentifier(n)) {
    const d = checker.getSymbolAtLocation(n)?.valueDeclaration;
    if (d && ts.isVariableDeclaration(d) && (ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const)) return arrowOf(checker, d.initializer, seen);
  }
  return null;
}
export function closureReads(checker, cb) {
  const found = new Map();
  const walk = (n) => {
    if (ts.isTypeNode(n)) return;
    if (ts.isIdentifier(n)) {
      const p = n.parent;
      if ((ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n) || (ts.isBindingElement(p) && p.propertyName === n)) return;
      const s = checker.getSymbolAtLocation(n), d = s?.valueDeclaration ?? s?.declarations?.[0];
      if (d && d.getSourceFile() === cb.getSourceFile() && !(d.pos >= cb.pos && d.end <= cb.end)) {
        let local = false;
        for (let a = d.parent; a; a = a.parent) if (ts.isFunctionLike(a)) { local = true; break; }
        if (local && !found.has(s)) found.set(s, n);
      }
    }
    ts.forEachChild(n, walk);
  };
  walk(cb.body);
  return [...found.values()];
}
// a pure scalar expression has no calls, allocation, mutable globals or deferred evaluation
export function renderPure(checker, n) {
  if (!n) return false;
  if (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isNonNullExpression(n)) return renderPure(checker, n.expression);
  if (ts.isNumericLiteral(n) || ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || [K.TrueKeyword, K.FalseKeyword, K.NullKeyword].includes(n.kind)) return true;
  if (ts.isIdentifier(n)) {
    if (n.text === 'undefined') return true;
    const d = checker.getSymbolAtLocation(n)?.valueDeclaration;
    return !!d && (ts.isParameter(d) || ts.isVariableDeclaration(d) || ts.isBindingElement(d));
  }
  if (ts.isPropertyAccessExpression(n) && !n.questionDotToken) return renderPure(checker, n.expression);
  if (ts.isPrefixUnaryExpression(n)) return [K.MinusToken, K.ExclamationToken].includes(n.operator) && renderPure(checker, n.operand);
  if (ts.isBinaryExpression(n)) return [K.PlusToken, K.MinusToken, K.AsteriskToken, K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.LessThanToken, K.LessThanEqualsToken, K.GreaterThanToken, K.GreaterThanEqualsToken, K.AmpersandAmpersandToken, K.BarBarToken, K.QuestionQuestionToken].includes(n.operatorToken.kind) && renderPure(checker, n.left) && renderPure(checker, n.right);
  if (ts.isConditionalExpression(n)) return [n.condition, n.whenTrue, n.whenFalse].every((e) => renderPure(checker, e));
  if (ts.isTemplateExpression(n)) return n.templateSpans.every((s) => renderPure(checker, s.expression));
  return false;
}
export function exactReactHook(checker, n) {
  const kind = reactHook(checker, n);
  if (!['useMemo', 'useCallback'].includes(kind) || ![1, 2].includes(n.arguments.length)) return null;
  const cb = arrowOf(checker, n.arguments[0]);
  if (!cb || cb.modifiers?.some((m) => m.kind === K.AsyncKeyword)) return null;
  const deps = n.arguments[1];
  if (deps && (!ts.isArrayLiteralExpression(deps) || !deps.elements.every((e) => renderPure(checker, e)))) return null;
  // covering a root also covers its properties; a property dependency covers that same read
  if (deps) {
    let covered = true;
    const depText = new Set(deps.elements.map((e) => e.getText().replace(/\s+/g, '')));
    for (const id of closureReads(checker, cb)) {
      const s = checker.getSymbolAtLocation(id);
      const walk = (e) => {
        if (ts.isTypeNode(e)) return;
        if (ts.isIdentifier(e) && checker.getSymbolAtLocation(e) === s) {
          let r = e;
          while (ts.isPropertyAccessExpression(r.parent) && r.parent.expression === r) r = r.parent;
          if (!depText.has(e.text) && !depText.has(r.getText().replace(/\s+/g, ''))) covered = false;
        }
        ts.forEachChild(e, walk);
      };
      walk(cb.body);
    }
    if (!covered) return null;
  }
  if (kind === 'useCallback') return { kind, cb, value: n.arguments[0] };
  const body = ts.isBlock(cb.body) && cb.body.statements.length === 1 && ts.isReturnStatement(cb.body.statements[0]) ? cb.body.statements[0].expression : cb.body;
  const t = body && checker.getTypeAtLocation(body);
  if (cb.parameters.length || !renderPure(checker, body) || !(t.flags & (ts.TypeFlags.NumberLike | ts.TypeFlags.StringLike | ts.TypeFlags.BooleanLike))) return null;
  return { kind, cb, value: body };
}
