// a scalar generator has no reference whose contents can change between yields
import { ts, originOf } from './common.mjs';
const K = ts.SyntaxKind, TF = ts.TypeFlags;
export const asyncGenerator = (u) => !!(u?.fn.asteriskToken && u.isAsync);
export function generatorReading(checker, sf, units) {
  const cache = new Map(), active = new Set();
  const scalar = (t) => !!t && [TF.NumberLike, TF.BigIntLike, TF.StringLike, TF.BooleanLike].some((flag) => (t.flags & TF.Union ? t.types : [t]).every((p) => !!(p.flags & flag)));
  const callee = (e) => ts.isCallExpression(e) && ts.isIdentifier(e.expression) && originOf(checker, e.expression, sf, null).kind === 'unit' ? units.get(e.expression.text) : null;
  function shape(u) {
    if (!u?.fn.asteriskToken) return null;
    if (cache.has(u)) return cache.get(u);
    if (active.has(u)) return { rule: 'generator-bound', message: 'recursive generators need a step reading; use a finite counted producer' };
    if (asyncGenerator(u)) {
      const rt = checker.getSignatureFromDeclaration(u.fn).getReturnType(), element = checker.getTypeArguments(rt)[0];
      const handle = (t) => ['AsyncIterable', 'AsyncIterator', 'AsyncIterableIterator', 'AsyncGenerator'].includes(t.symbol?.name) && scalar(checker.getTypeArguments(t)[0]);
      if (!element || !scalar(element) || u.generics?.length || u.params.some((p) => !ts.isIdentifier(p.name) || p.initializer || p.dotDotDotToken || !(scalar(checker.getTypeAtLocation(p.name)) || handle(checker.getTypeAtLocation(p.name))))) return { rule: 'generator-effect', message: 'an async suspended program captures scalar values or scalar async iterator handles and yields scalars; mutable value captures need a heap step reading' };
      return { async: true };
    }
    active.add(u);
    let error = null;
    const bad = (rule, message) => { error ??= { rule, message }; };
    const expression = (n) => {
      if (!n) return;
      if (ts.isYieldExpression(n)) return bad('generator-use', 'yield is a statement; sent values need a step reading');
      if (ts.isIdentifier(n)) { if (originOf(checker, n, sf, u.node).kind !== 'local') bad('generator-effect', 'a sequence generator reads only its scalar inputs and locals'); return; }
      if (ts.isNumericLiteral(n) || ts.isBigIntLiteral(n) || ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || [K.TrueKeyword, K.FalseKeyword].includes(n.kind)) return;
      if (ts.isParenthesizedExpression(n)) return expression(n.expression);
      if (ts.isBinaryExpression(n) && n.operatorToken.kind < K.FirstAssignment) { if ((checker.getTypeAtLocation(n.left).flags & TF.BigIntLike) && [K.SlashToken, K.PercentToken, K.AsteriskAsteriskToken].includes(n.operatorToken.kind)) return bad('generator-effect', 'potentially throwing bigint arithmetic needs a step reading'); expression(n.left); expression(n.right); return; }
      if (ts.isPrefixUnaryExpression(n) && [K.MinusToken, K.ExclamationToken].includes(n.operator)) return expression(n.operand);
      if (ts.isConditionalExpression(n)) { expression(n.condition); expression(n.whenTrue); expression(n.whenFalse); return; }
      bad('generator-effect', 'a sequence generator uses scalar expressions without calls or property reads');
    };
    const sequence = (n) => {
      if (ts.isArrayLiteralExpression(n)) { for (const e of n.elements) { if (ts.isSpreadElement(e)) sequence(e.expression); else { expression(e); if (!scalar(checker.getTypeAtLocation(e))) bad('generator-effect', 'yield scalar values instead of mutable references'); } } return; }
      const target = callee(n), sh = target && shape(target);
      if (sh && !sh.rule && !sh.async) { n.arguments.forEach(expression); return; }
      if (sh?.rule) return bad(sh.rule, sh.message);
      bad('generator-effect', 'yield* needs a literal scalar array or a pure same-file generator');
    };
    const statement = (s) => {
      if (ts.isBlock(s)) return s.statements.forEach(statement);
      if (ts.isEmptyStatement(s)) return;
      if (ts.isVariableStatement(s)) { for (const d of s.declarationList.declarations) { if (!ts.isIdentifier(d.name) || !scalar(checker.getTypeAtLocation(d.name)) || !d.initializer) bad('generator-effect', 'a sequence generator binds initialized scalar locals'); else expression(d.initializer); } return; }
      if (ts.isExpressionStatement(s)) {
        const e = s.expression;
        if (ts.isYieldExpression(e)) { if (!e.expression) return bad('generator-use', 'yield an explicit scalar value'); if (e.asteriskToken) sequence(e.expression); else { expression(e.expression); if (!scalar(checker.getTypeAtLocation(e.expression))) bad('generator-effect', 'yield scalar values instead of mutable references'); } return; }
        if (ts.isBinaryExpression(e) && e.operatorToken.kind >= K.FirstAssignment && e.operatorToken.kind <= K.LastAssignment && ts.isIdentifier(e.left)) { expression(e.left); expression(e.right); return; }
        if ((ts.isPostfixUnaryExpression(e) || ts.isPrefixUnaryExpression(e)) && [K.PlusPlusToken, K.MinusMinusToken].includes(e.operator) && ts.isIdentifier(e.operand)) return expression(e.operand);
        return bad('generator-effect', 'producer effects need a step reading; use an async generator or a pure scalar producer');
      }
      if (ts.isIfStatement(s)) { expression(s.expression); statement(s.thenStatement); if (s.elseStatement) statement(s.elseStatement); return; }
      if (ts.isForStatement(s)) {
        if (!s.condition || !s.initializer || !s.incrementor) return bad('generator-bound', 'an infinite generator needs a step reading; use a finite counted loop');
        if (!ts.isVariableDeclarationList(s.initializer)) return bad('generator-bound', 'use a counted loop with a local counter');
        s.initializer.declarations.forEach((d) => expression(d.initializer)); expression(s.condition);
        statement(s.statement); return;
      }
      if (ts.isForOfStatement(s) && !s.awaitModifier) { sequence(s.expression); statement(s.statement); return; }
      if (ts.isReturnStatement(s) && !s.expression) return;
      if (ts.isBreakStatement(s) || ts.isContinueStatement(s)) return;
      if (ts.isWhileStatement(s) || ts.isDoStatement(s)) return bad('generator-bound', 'an unbounded generator needs a step reading; use a finite counted loop');
      bad('generator-use', 'use statement yields, scalar locals and finite loops; sent values and generator return values need a step reading');
    };
    if (u.cls || u.generics?.length || u.params.some((p) => !ts.isIdentifier(p.name) || p.initializer || p.dotDotDotToken || p.questionToken || !scalar(checker.getTypeAtLocation(p.name)))) bad('generator-effect', 'a sequence generator is top-level with plain scalar parameters');
    const rt = checker.getSignatureFromDeclaration(u.fn).getReturnType();
    const element = checker.getTypeArguments(rt)[0];
    if (!element || !scalar(element)) bad('generator-effect', 'a sequence generator yields scalar values');
    if (u.body) statement(u.body); else bad('generator-use', 'a generator needs a body');
    active.delete(u);
    const result = error ?? { element };
    cache.set(u, result); return result;
  }
  const pureCall = (n) => { const u = callee(n), s = u && shape(u); return s && !s.rule && !s.async ? u : null; };
  return { shape, callee, pureCall };
}
export function immediateGeneratorConsumer(call, checker, sf) {
  const p = call.parent;
  return (ts.isForOfStatement(p) && !p.awaitModifier && p.expression === call) ||
    (ts.isSpreadElement(p) && ts.isArrayLiteralExpression(p.parent)) ||
    (ts.isYieldExpression(p) && p.asteriskToken && ts.isExpressionStatement(p.parent)) ||
    (ts.isCallExpression(p) && p.arguments.length === 1 && p.arguments[0] === call && ts.isPropertyAccessExpression(p.expression) && ts.isIdentifier(p.expression.expression) && p.expression.expression.text === 'Array' && p.expression.name.text === 'from' && originOf(checker, p.expression.expression, sf, null).kind === 'global');
}
// abrupt iteration needs closing and exception propagation; the whole loop remains opaque
export function steppedAsyncLoop(s, checker) {
  const source = checker.getTypeAtLocation(s.expression);
  if (!checker.getPropertiesOfType(source).some((p) => p.name.startsWith('__@asyncIterator'))) return false;
  if (!s.awaitModifier || !ts.isVariableDeclarationList(s.initializer) || s.initializer.declarations.length !== 1 || !ts.isIdentifier(s.initializer.declarations[0].name)) return false;
  let simple = true;
  const walk = (n) => { if (ts.isFunctionLike(n)) return; if (ts.isReturnStatement(n) || ts.isBreakStatement(n) || (ts.isContinueStatement(n) && n.label) || ts.isThrowStatement(n) || ts.isTryStatement(n)) simple = false; ts.forEachChild(n, walk); };
  walk(s.statement); return simple;
}
