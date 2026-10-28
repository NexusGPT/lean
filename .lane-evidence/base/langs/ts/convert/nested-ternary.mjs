// nested-ternary (proved): a conditional expression whose branch is another conditional becomes nested if
// statements, when the conditional is the whole value of its statement: a return, the body of an arrow, the
// initializer of a single declaration, or the value assigned to a name. Each condition is evaluated once and only in
// its original branch, so the order of evaluation is the conditional's own. A conditional inside a larger expression
// (an argument, an operand, a template) needs a fresh local and a choice of where to evaluate it: listed for a person.
import { ts, K, src, unparen, indentAt, statementOf, functionOf, typeText } from './util.mjs';

const isCond = (x) => ts.isConditionalExpression(unparen(x));

// the lines of nested if statements that end every branch with `leaf(text)`; the first line carries no indent, every
// other line carries its own
function expand(sf, e, leaf, ind) {
  const c = unparen(e);
  const branch = (b) => {
    if (!isCond(b)) return [`${ind}  ${leaf(src(sf, b))}`];
    const inner = expand(sf, b, leaf, ind + '  ');
    return [`${ind}  ${inner[0]}`, ...inner.slice(1)];
  };
  const lines = [`if (${src(sf, c.condition)}) {`, ...branch(c.whenTrue)];
  if (isCond(c.whenFalse)) {
    const rest = expand(sf, c.whenFalse, leaf, ind);
    lines.push(`${ind}} else ${rest[0]}`, ...rest.slice(1));
  } else lines.push(`${ind}} else {`, ...branch(c.whenFalse), `${ind}}`);
  return lines;
}

export default {
  name: 'nested-ternary',
  rules: ['nested-ternary'],
  plan({ sf, checker, node }) {
    if (!node || !ts.isConditionalExpression(node)) return { list: 'the finding is not on a conditional expression' };
    let top = node; while (top.parent && ts.isParenthesizedExpression(top.parent)) top = top.parent;
    const p = top.parent;
    // a return: every branch returns its value
    if (p && ts.isReturnStatement(p) && p.expression === top) {
      const ind = indentAt(sf, p.getStart(sf));
      const wrap = !(ts.isBlock(p.parent) || ts.isSourceFile(p.parent) || ts.isCaseClause(p.parent) || ts.isDefaultClause(p.parent));
      const lines = expand(sf, node, (t) => `return ${t};`, wrap ? ind + '  ' : ind);
      return { edits: [{ start: p.getStart(sf), end: p.end, text: wrap ? `{\n${ind}  ${lines.join('\n')}\n${ind}}` : lines.join('\n') }], guard: 'the conditional is the whole returned value' };
    }
    // the body of an arrow: a block that returns each branch
    if (p && ts.isArrowFunction(p) && p.body === top) {
      const ind = indentAt(sf, p.getStart(sf));
      const lines = expand(sf, node, (t) => `return ${t};`, ind + '  ');
      return { edits: [{ start: top.getStart(sf), end: top.end, text: `{\n${ind}  ${lines.join('\n')}\n${ind}}` }], guard: 'the conditional is the whole body of the arrow' };
    }
    // the initializer of the only declaration of a statement inside a function: `let x: T;` then assignments
    if (p && ts.isVariableDeclaration(p) && p.initializer === top && ts.isIdentifier(p.name)) {
      const list = p.parent, stmt = list?.parent;
      if (!stmt || !ts.isVariableStatement(stmt) || list.declarations.length !== 1 || !functionOf(stmt) || statementOf(stmt) !== stmt) return { list: 'a declaration with several names, or outside a function' };
      if (stmt.modifiers?.length) return { list: 'an exported or declared statement' };
      const type = p.type ? src(sf, p.type) : typeText(checker, checker.getTypeAtLocation(p.name), p);
      if (!type) return { list: 'the declared value has no type the converter can write' };
      const ind = indentAt(sf, stmt.getStart(sf));
      const name = p.name.text;
      const lines = expand(sf, node, (t) => `${name} = ${t};`, ind);
      return { edits: [{ start: stmt.getStart(sf), end: stmt.end, text: `let ${name}: ${type};\n${ind}${lines.join('\n')}` }], guard: 'the conditional is the whole initializer of one declaration; the name is assigned once on every path' };
    }
    // the value assigned to a plain name, as a statement
    if (p && ts.isBinaryExpression(p) && p.operatorToken.kind === K.EqualsToken && p.right === top && ts.isIdentifier(p.left) && p.parent && ts.isExpressionStatement(p.parent)) {
      const stmt = p.parent;
      if (statementOf(stmt) !== stmt) return { list: 'the assignment is the body of a control statement' };
      const ind = indentAt(sf, stmt.getStart(sf));
      const lines = expand(sf, node, (t) => `${p.left.text} = ${t};`, ind);
      return { edits: [{ start: stmt.getStart(sf), end: stmt.end, text: lines.join('\n') }], guard: 'the conditional is the whole value assigned to a name' };
    }
    return { list: 'the conditional sits inside a larger expression; expanding it needs a fresh local and a choice of where to evaluate it' };
  },
};
