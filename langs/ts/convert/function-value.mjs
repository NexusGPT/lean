// function-value (narrowed): an arrow written inline as the argument of a same-file function becomes a named local
// declared just before the statement, and the call passes the name:
//
//     const weigh = (h: Hit): number => conf.get(h.id) ?? 0;
//     const c = candidatesFor(hits, weigh);
//
// Making an arrow has no effect and it captures the same bindings when it is made in the same scope just before the
// statement, so the call receives an equal function made once per run of the statement, as before. The statement
// must hold the arrow directly (an expression, a declaration or a return, no loop head, no nested function between),
// so the name is made exactly when the arrow was. The one thing that differs is the function's own text and its
// name (`f.name` is the local's name, where the inline arrow had ""): the callee must only call the parameter or
// pass it on, never read its name or its text. The parameters and the result take the types the call gave them, so
// the program types as before; a type the converter cannot write, or a callee outside the file: listed.
import { ts, K, src, unparen, indentAt, statementOf, functionOf, freshName, typeText, usesOf, symbolOf, contains } from './util.mjs';

export default {
  name: 'function-value',
  rules: ['function-value'],
  plan({ sf, checker, node }) {
    if (!node || !ts.isArrowFunction(node)) return { list: 'the finding is not on an arrow' };
    const call = node.parent;
    if (!call || !ts.isCallExpression(call) || !call.arguments.includes(node)) return { list: 'the arrow is not a call argument' };
    if (node.typeParameters?.length) return { list: 'a generic arrow' };
    const stmt = statementOf(call);
    if (!stmt || !(ts.isExpressionStatement(stmt) || ts.isVariableStatement(stmt) || ts.isReturnStatement(stmt))) return { list: 'the call is not held by an expression, a declaration or a return' };
    for (let p = call.parent; p && p !== stmt; p = p.parent) if (ts.isFunctionLike(p) || (ts.isStatement(p) && p !== stmt) || ts.isConditionalExpression(p) || (ts.isBinaryExpression(p) && [K.AmpersandAmpersandToken, K.BarBarToken, K.QuestionQuestionToken].includes(p.operatorToken.kind))) return { list: 'the arrow is made only on some paths of its statement, or inside a nested function' };
    if (!functionOf(stmt)) return { list: 'a module-level statement' };
    // the callee: a same-file function that only calls the parameter or passes it on
    const callee = unparen(call.expression);
    const csym = ts.isIdentifier(callee) ? symbolOf(checker, callee) : null;
    let cdecl = csym?.valueDeclaration;
    if (cdecl && ts.isVariableDeclaration(cdecl) && cdecl.initializer && (ts.isArrowFunction(cdecl.initializer) || ts.isFunctionExpression(cdecl.initializer))) cdecl = cdecl.initializer;
    if (!cdecl || !(ts.isFunctionDeclaration(cdecl) || ts.isArrowFunction(cdecl) || ts.isFunctionExpression(cdecl)) || cdecl.getSourceFile() !== sf || !cdecl.body) return { list: 'the callee is not a function of this file' };
    const index = call.arguments.indexOf(node);
    const param = cdecl.parameters[index];
    if (!param || !ts.isIdentifier(param.name) || param.dotDotDotToken) return { list: 'the callee takes this argument through a pattern or a rest parameter' };
    for (const u of usesOf(checker, symbolOf(checker, param.name), cdecl.body)) {
      let top = u; while (top.parent && ts.isParenthesizedExpression(top.parent)) top = top.parent;
      const pa = top.parent;
      const called = pa && ts.isCallExpression(pa) && pa.expression === top;
      const passed = pa && ts.isCallExpression(pa) && pa.arguments.includes(top);
      if (!called && !passed) return { list: `the callee reads its parameter \`${param.name.text}\` as a value (its name or text may be read)` };
    }
    // the arrow, with the types the call gave it written out
    const sig = checker.getSignatureFromDeclaration(node);
    const ctx = checker.getContextualType(node);
    const csig = ctx && ctx.getCallSignatures().length === 1 ? ctx.getCallSignatures()[0] : null;
    const params = [];
    for (const p of node.parameters) {
      if (p.type) { params.push(src(sf, p)); continue; }
      const t = typeText(checker, checker.getTypeAtLocation(p.name), node);
      if (!t) return { list: `the parameter ${src(sf, p.name)} has no type the converter can write` };
      const name = src(sf, p.name) + (p.questionToken ? '?' : '');
      params.push(`${p.dotDotDotToken ? '...' : ''}${name}: ${t}${p.initializer ? ' = ' + src(sf, p.initializer) : ''}`);
    }
    let ret = node.type ? src(sf, node.type) : null;
    if (!ret) {
      const rt = csig ? csig.getReturnType() : sig?.getReturnType();
      ret = rt ? typeText(checker, rt, node) : null;
      // a contextual result of void accepts any body; the arrow's own result keeps what it returns
      if (ret === 'void' && sig) ret = typeText(checker, sig.getReturnType(), node);
      if (!ret) return { list: 'the result has no type the converter can write' };
    }
    const isAsync = node.modifiers?.some((m) => m.kind === K.AsyncKeyword);
    const name = freshName(sf, param.name.text);
    const ind = indentAt(sf, stmt.getStart(sf));
    // the body moves to the statement's indentation, unless a multi-line literal would change with it
    let body = src(sf, node.body);
    const multiLineLiteral = (x) => (ts.isTemplateLiteral(x) || ts.isStringLiteral(x) || ts.isTemplateLiteralToken?.(x)) && src(sf, x).includes('\n');
    const shift = ind.length - indentAt(sf, node.getStart(sf)).length;
    if (shift !== 0 && !multiLineLiteral(node.body) && !contains(node.body, multiLineLiteral, true)) {
      body = body.split('\n').map((l, k) => (k === 0 ? l : shift > 0 ? ' '.repeat(shift) + l : l.slice(Math.min(-shift, l.length - l.trimStart().length)))).join('\n');
    }
    const text = `const ${name} = ${isAsync ? 'async ' : ''}(${params.join(', ')}): ${ret} => ${body};\n${ind}`;
    return {
      edits: [
        { start: stmt.getStart(sf), end: stmt.getStart(sf), text },
        { start: node.getStart(sf), end: node.end, text: name },
      ],
      guard: 'the arrow is made unconditionally by its statement, and the same-file callee only calls it or passes it on',
    };
  },
};
