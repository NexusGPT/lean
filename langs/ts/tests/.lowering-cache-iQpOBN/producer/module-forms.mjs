// module bindings and outside roots are resolved by declaration, never by spelling alone
import { ts, originOf } from './common.mjs';
const K = ts.SyntaxKind;
export function moduleState(checker, n, sf) {
  if (!n || !ts.isIdentifier(n)) return null;
  const d = checker.getSymbolAtLocation(n)?.valueDeclaration;
  if (!d || !ts.isVariableDeclaration(d) || d.getSourceFile() !== sf || d.parent?.parent?.parent !== sf || ts.getCombinedModifierFlags(d) & ts.ModifierFlags.Ambient) return null;
  if (!(ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const)) return d;
  const t = checker.getTypeAtLocation(d.name);
  if (checker.getSignaturesOfType(t, ts.SignatureKind.Call).length) return null;
  const init = d.initializer;
  return (t.flags & ts.TypeFlags.Union ? t.types : [t]).some((p) => p.flags & ts.TypeFlags.Object) || (init && (ts.isArrayLiteralExpression(init) || ts.isObjectLiteralExpression(init) || (ts.isNewExpression(init) && ['Map', 'Set'].includes(init.expression.getText(sf))))) ? d : null;
}
export function outsideRoot(checker, n, sf, current) {
  if (!n || !ts.isIdentifier(n) || !['globalThis', 'global', 'window', 'process', 'require'].includes(n.text)) return false;
  const o = originOf(checker, n, sf, current);
  return o.kind === 'global' || !!(o.decl && ts.getCombinedModifierFlags(o.decl) & ts.ModifierFlags.Ambient);
}
export function worldRead(checker, n, sf, current) {
  if (!n || !(ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n))) return false;
  let root = n;
  while (ts.isPropertyAccessExpression(root) || ts.isElementAccessExpression(root) || ts.isParenthesizedExpression(root) || ts.isAsExpression(root) || ts.isNonNullExpression(root)) root = root.expression;
  return outsideRoot(checker, root, sf, current) && root.text !== 'require';
}
export function moduleLoader(checker, n, sf, current) {
  return ts.isCallExpression(n) && !n.questionDotToken && (n.expression.kind === K.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === 'require' && outsideRoot(checker, n.expression, sf, current)));
}
export function inertModuleInit(n) {
  if (!n) return true;
  if (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isSatisfiesExpression(n)) return inertModuleInit(n.expression);
  if (ts.isLiteralExpression(n) || [K.TrueKeyword, K.FalseKeyword, K.NullKeyword].includes(n.kind) || (ts.isIdentifier(n) && n.text === 'undefined')) return true;
  if (ts.isPrefixUnaryExpression(n) && [K.MinusToken, K.PlusToken].includes(n.operator)) return inertModuleInit(n.operand);
  if (ts.isArrayLiteralExpression(n)) return n.elements.every(inertModuleInit);
  if (ts.isObjectLiteralExpression(n)) return n.properties.every((p) => ts.isPropertyAssignment(p) && !ts.isComputedPropertyName(p.name) && inertModuleInit(p.initializer));
  return ts.isNewExpression(n) && ['Map', 'Set'].includes(n.expression.getText()) && (n.arguments ?? []).every(inertModuleInit);
}
