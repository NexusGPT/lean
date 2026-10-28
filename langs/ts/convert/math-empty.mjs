// math-empty (narrowed): `Math.max(...xs)` and `Math.min(...xs)` are -Infinity and Infinity on an empty list, which
// the finite number model has no value for. When the statement just before the call leaves the block on an empty
// list (`if (xs.length === 0) return ...;`, or `!xs.length`, `xs.length < 1`, `xs.length <= 0`), the empty branch
// is dead, and the call becomes `xs.length > 0 ? Math.max(...xs) : 0`: equal on every input that reaches it. The
// spread may be the guarded name itself or `xs.map(f)` (a map has its receiver's length); a mapped list is first
// bound to a fresh local when the call is the whole value of its statement, so nothing else in the statement runs
// before it. Without such a guard the empty case is reachable, and the fallback is a choice: listed for a person.
import { ts, K, src, unparen, indentAt, statementOf, previousStatement, exits, freshName, usesOf, symbolOf, isWritten, functionOf } from './util.mjs';

// the name an emptiness test reads, or null: `n.length === 0`, `0 === n.length`, `n.length == 0`, `!n.length`,
// `n.length < 1`, `n.length <= 0`
function emptyTest(c) {
  c = unparen(c);
  const len = (x) => { x = unparen(x); return ts.isPropertyAccessExpression(x) && x.name.text === 'length' && ts.isIdentifier(unparen(x.expression)) ? unparen(x.expression) : null; };
  const lit = (x, v) => { x = unparen(x); return ts.isNumericLiteral(x) && Number(x.text) === v; };
  if (ts.isPrefixUnaryExpression(c) && c.operator === K.ExclamationToken) return len(c.operand);
  if (!ts.isBinaryExpression(c)) return null;
  const op = c.operatorToken.kind;
  if ((op === K.EqualsEqualsEqualsToken || op === K.EqualsEqualsToken) && len(c.left) && lit(c.right, 0)) return len(c.left);
  if ((op === K.EqualsEqualsEqualsToken || op === K.EqualsEqualsToken) && len(c.right) && lit(c.left, 0)) return len(c.right);
  if (op === K.LessThanToken && len(c.left) && lit(c.right, 1)) return len(c.left);
  if (op === K.LessThanEqualsToken && len(c.left) && lit(c.right, 0)) return len(c.left);
  return null;
}

export default {
  name: 'math-empty',
  rules: ['math-empty'],
  plan({ sf, checker, node }) {
    if (!node || !ts.isCallExpression(node) || node.arguments.length !== 1 || !ts.isSpreadElement(node.arguments[0])) return { list: 'not a Math call over one spread list' };
    const f = node.expression;
    if (!ts.isPropertyAccessExpression(f) || !['max', 'min'].includes(f.name.text) || !ts.isIdentifier(f.expression) || f.expression.text !== 'Math') return { list: 'not Math.max or Math.min' };
    const spread = unparen(node.arguments[0].expression);
    const stmt = statementOf(node), prev = stmt && previousStatement(stmt), fn = functionOf(node);
    if (!stmt || !fn) return { list: 'the call is not inside a statement of a function' };
    const guarded = prev && ts.isIfStatement(prev) && !prev.elseStatement && exits(prev.thenStatement) ? emptyTest(prev.expression) : null;
    // the list the call spreads: the guarded name, or a map over it
    let list = null, mapped = false;
    if (ts.isIdentifier(spread)) list = spread;
    else if (ts.isCallExpression(spread) && ts.isPropertyAccessExpression(spread.expression) && spread.expression.name.text === 'map' && ts.isIdentifier(unparen(spread.expression.expression)) && spread.arguments.length === 1 && ts.isArrowFunction(spread.arguments[0])) { list = unparen(spread.expression.expression); mapped = true; }
    if (!list) return { list: 'the spread list is neither a name nor a map over a name' };
    const listType = checker.getTypeAtLocation(list);
    if (!(checker.isArrayType(listType) || checker.isTupleType(listType))) return { list: 'the spread list is not typed as an array' };
    const sym = symbolOf(checker, list);
    if (!guarded || symbolOf(checker, guarded) !== sym) return { list: 'no emptiness test on this list just before the statement: the empty case is reachable, and its fallback (-Infinity for max, Infinity for min, or another value) is a choice' };
    // the statement neither writes the list nor mutates it before the call reads it
    for (const u of usesOf(checker, sym, stmt)) {
      if (isWritten(u)) return { list: `\`${list.text}\` is written in the statement` };
      const pa = u.parent;
      if (pa && ts.isPropertyAccessExpression(pa) && pa.expression === u && ['push', 'pop', 'shift', 'unshift', 'splice', 'length', 'fill', 'copyWithin'].includes(pa.name.text) && pa.parent && (ts.isCallExpression(pa.parent) || (ts.isBinaryExpression(pa.parent) && pa.parent.left === pa))) return { list: `\`${list.text}\` is changed in the statement` };
    }
    const call = src(sf, node);
    if (!mapped) {
      // parentheses unless the call is a whole value: an initializer, a returned value, an assigned value, an argument
      let top = node; while (top.parent && ts.isParenthesizedExpression(top.parent)) top = top.parent;
      const p = top.parent;
      const whole = (ts.isVariableDeclaration(p) && p.initializer === top) || ts.isReturnStatement(p) || (ts.isBinaryExpression(p) && p.right === top && p.operatorToken.kind >= K.FirstAssignment && p.operatorToken.kind <= K.LastAssignment) || (ts.isCallExpression(p) && p.arguments.includes(top)) || ts.isParenthesizedExpression(node.parent);
      const text = `${list.text}.length > 0 ? ${call} : 0`;
      return { edits: [{ start: node.getStart(sf), end: node.end, text: whole ? text : `(${text})` }], guard: `the statement just before leaves the block when \`${list.text}\` is empty` };
    }
    // a mapped list: bind it first, when the call is the whole value of its statement
    let top = node; while (top.parent && ts.isParenthesizedExpression(top.parent)) top = top.parent;
    const p = top.parent;
    const first = (ts.isVariableDeclaration(p) && p.initializer === top && p.parent.declarations[0] === p && ts.isVariableStatement(p.parent.parent) && p.parent.parent === stmt)
      || (ts.isReturnStatement(p) && p === stmt)
      || (ts.isBinaryExpression(p) && p.operatorToken.kind === K.EqualsToken && p.right === top && ts.isIdentifier(p.left) && ts.isExpressionStatement(p.parent) && p.parent === stmt);
    if (!first) return { list: 'the mapped list would be evaluated before other parts of its statement; bind it by hand' };
    const cb = spread.arguments[0];
    const body = ts.isBlock(cb.body) ? null : unparen(cb.body);
    const base = body && ts.isPropertyAccessExpression(body) ? `${body.name.text}Values` : 'values';
    const name = freshName(sf, base);
    const ind = indentAt(sf, stmt.getStart(sf));
    return {
      edits: [
        { start: stmt.getStart(sf), end: stmt.getStart(sf), text: `const ${name} = ${src(sf, spread)};\n${ind}` },
        { start: node.getStart(sf), end: node.end, text: `${name}.length > 0 ? ${src(sf, f)}(...${name}) : 0` },
      ],
      guard: `the statement just before leaves the block when \`${list.text}\` is empty, and a map keeps its receiver's length`,
    };
  },
};
