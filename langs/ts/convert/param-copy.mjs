// param-assign (conditional; decided here, applied under --narrowed): a parameter lean refuses to see rebound (the own
// parameter of a callback or a local function, a rest parameter, a generator's parameter, one also changed in place,
// one a closure reads before a later write) is copied to a local at entry:
//
//     (line) => { line = line.trim(); ... }            (lineArg) => { let line = lineArg; line = line.trim(); ... }
//
// The parameter takes a fresh name and a `let` of the old name, made from it, opens the body; every use in the body,
// nested functions included, now names the local, which starts as the argument and is changed as the parameter was.
// In strict code a parameter is a plain binding (no `arguments` slot mirrors it, ECMA-262 10.4.4.6), so a `let` that
// starts as it reads and writes alike; the guard: the function reads no `arguments` (in sloppy code a mapped
// `arguments` would mirror the parameter), no other parameter's default names it (a default is evaluated in the
// parameter scope, where only the fresh name remains), it is a plain name (no pattern, no `this`, no parameter
// property, no decorator), and the function has a body to open (an expression body becomes a block returning it). The
// function's `length` and the order in which arguments are bound are unchanged. A generator's body runs at its first
// step, after the call bound the parameter; nothing else names the fresh parameter, so the `let` reads the argument.
// Why not a copy of the value (`p = { ...p }`): the caller sees a parameter changed in place (lane B compares the
// arguments after the call), so a copy changes behaviour wherever the change runs; that stays a person's choice.
// What lane B cannot see: a function whose source text is read (`f.toString()`), which names the new parameter.
import { ts, K, src, freshName, indentAt, contains } from './util.mjs';

// the expression is the name or holds it (contains() looks below its root only)
const names = (x, name) => (ts.isIdentifier(x) && x.text === name) || contains(x, (y) => ts.isIdentifier(y) && y.text === name, true);

export default {
  name: 'param-copy',
  rules: ['param-assign'],
  plan({ sf, checker, node }) {
    if (!node) return { list: 'no node at the finding' };
    // the written name: the finding sits on the target of an assignment or on an update
    let id = node;
    while (id && ts.isParenthesizedExpression(id)) id = id.expression;
    if (id && ts.isBinaryExpression(id)) id = id.left;
    if (id && (ts.isPrefixUnaryExpression(id) || ts.isPostfixUnaryExpression(id))) id = id.operand;
    while (id && ts.isParenthesizedExpression(id)) id = id.expression;
    if (!id || !ts.isIdentifier(id)) return { list: 'the finding is not on a name' };
    const sym = checker.getSymbolAtLocation(id), p = sym?.valueDeclaration;
    if (!p || !ts.isParameter(p) || !ts.isIdentifier(p.name)) return { list: 'the name is not a plain parameter' };
    const fn = p.parent;
    if (!fn.body) return { list: 'the function has no body' };
    if (p.name.text === 'this' || p.modifiers?.length || (ts.canHaveDecorators?.(p) && ts.getDecorators?.(p)?.length)) return { list: 'a receiver, a parameter property or a decorated parameter' };
    if (ts.isConstructorDeclaration(fn) && fn.parameters.some((q) => q.modifiers?.length)) return { list: 'a constructor with parameter properties' };
    if (!ts.isArrowFunction(fn) && contains(fn.body, (x) => ts.isIdentifier(x) && x.text === 'arguments')) return { list: 'the function reads `arguments`' };
    if (contains(fn.body, (x) => ts.isIdentifier(x) && x.text === 'eval', true)) return { list: 'the function calls eval' };
    const name = p.name.text;
    for (const q of fn.parameters) if (q !== p && q.initializer && names(q.initializer, name)) return { list: `the default of another parameter names \`${name}\`` };
    const fresh = freshName(sf, `${name}Arg`);
    const edits = [{ start: p.name.getStart(sf), end: p.name.end, text: fresh }];
    const ind = indentAt(sf, fn.getStart(sf));
    if (ts.isBlock(fn.body)) {
      const first = fn.body.statements[0];
      // a directive prologue (`'use strict'`) stays first
      const prologue = fn.body.statements.filter((s, i) => fn.body.statements.slice(0, i + 1).every((x) => ts.isExpressionStatement(x) && ts.isStringLiteral(x.expression)));
      const after = prologue.length ? prologue[prologue.length - 1] : null;
      if (after) edits.push({ start: after.end, end: after.end, text: `\n${indentAt(sf, after.getStart(sf))}let ${name} = ${fresh};` });
      else if (first) edits.push({ start: first.getStart(sf), end: first.getStart(sf), text: `let ${name} = ${fresh};\n${indentAt(sf, first.getStart(sf))}` });
      else edits.push({ start: fn.body.getStart(sf) + 1, end: fn.body.getStart(sf) + 1, text: ` let ${name} = ${fresh}; ` });
    } else {
      const body = fn.body;
      edits.push({ start: body.getStart(sf), end: body.end, text: `{\n${ind}  let ${name} = ${fresh};\n${ind}  return ${src(sf, body)};\n${ind}}` });
    }
    return { edits, guard: `the parameter is renamed \`${fresh}\` and a \`let ${name}\` made from it opens the body: no \`arguments\`, no default names it` };
  },
};
