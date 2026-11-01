// captured-mutable and closure-mutation (narrowed): a forEach statement whose callback writes exactly one local of the
// function around it, a counter or an accumulator,
//
//     let centroid = 0;
//     c.forEach((n) => { centroid += n.cy; });
//
// becomes a reduce that carries the local through the steps and hands it back to the statement:
//
//     centroid = c.reduce<number>((acc, n) => {
//       let centroid = acc;
//       centroid += n.cy;
//       return centroid;
//     }, centroid);
//
// Array.prototype.forEach and Array.prototype.reduce with an initial value read the length once, visit the same
// indices in the same order and skip the same holes (ECMA-262 23.1.3.15 and 23.1.3.24: HasProperty before each call),
// and reduce never throws on an empty list when it is given an initial value. The step's `let` starts from the
// accumulator, which is the value the local had after the step before, so every read and write of the local inside the
// callback sees what it saw before; the statement writes the last value back. The two differ only for code that reads
// the local while the loop runs, or after a throw part way through it, and the guard rules both out on the tree:
//   - the callback writes no other binding declared outside it (one carried value), and no function inside the
//     callback names the local (a closure made in a step could run later and see the step's copy);
//   - every other reference to the local sits in the function that declares it or in an inline callback of a
//     synchronous array method around the statement (nobody holds such a callback, so the step cannot call it);
//   - no try statement stands between the statement and that function, so a throw leaves the local unread;
//   - the receiver is typed an array whose type rests on no type assertion (a NodeList or a Map has forEach and no
//     reduce), the callback is a synchronous arrow with at most one plain parameter (lean reads a reduce callback of
//     two parameters; an index parameter is foreach.mjs's counted loop), and it returns no value.
// A bare `return;` (the end of one step) becomes `return <local>;`. The accumulator's type is the local's declared
// type, written as reduce's type argument when it can be pasted.
// What lane B cannot see: a receiver that is an Array subclass overriding reduce or forEach, and a local read through
// `eval`; the tree rules out neither, and pr.mjs runs the unit on the array its parameter types describe.
import { ts, K, src, unparen, indentAt, freshName, usesOf, symbolOf, isWritten, functionOf, contains, typeText, castOnPath, inlineArrayCallback, tryBetween } from './util.mjs';

// the identifier a finding marks: a captured read or write (captured-mutable), the target of an assignment or the
// operand of an update (closure-mutation)
function bindingAt(node) {
  let x = node;
  while (x && ts.isParenthesizedExpression(x)) x = x.expression;
  if (!x) return null;
  if (ts.isIdentifier(x)) return x;
  if (ts.isBinaryExpression(x) && ts.isIdentifier(unparen(x.left))) return unparen(x.left);
  if ((ts.isPrefixUnaryExpression(x) || ts.isPostfixUnaryExpression(x)) && ts.isIdentifier(unparen(x.operand))) return unparen(x.operand);
  return null;
}

// the innermost function-like around a node
const innermostFunction = (n) => { for (let p = n.parent; p; p = p.parent) if (ts.isFunctionLike(p)) return p; return null; };

export default {
  name: 'closure-counter',
  rules: ['captured-mutable', 'closure-mutation'],
  plan({ sf, checker, node }) {
    const id = node && bindingAt(node);
    if (!id) return { list: 'the finding is not on a name' };
    const sym = symbolOf(checker, id), decl = sym?.valueDeclaration;
    if (!decl || !ts.isVariableDeclaration(decl) || !ts.isIdentifier(decl.name) || !(decl.parent.flags & ts.NodeFlags.Let)) return { list: 'the written name is not a `let` local' };
    const owner = functionOf(decl);
    if (!owner) return { list: 'the written name is module state' };
    const name = decl.name.text;
    // the callback: the innermost function around the finding, handed inline to a forEach that is a statement
    const cb = innermostFunction(id);
    if (!cb || !ts.isArrowFunction(cb)) return { list: 'the name is not used in an arrow callback' };
    if (cb.modifiers?.some((m) => m.kind === K.AsyncKeyword)) return { list: 'an async callback: forEach does not wait for it' };
    let top = cb; while (top.parent && ts.isParenthesizedExpression(top.parent)) top = top.parent;
    const call = top.parent;
    if (!call || !ts.isCallExpression(call) || call.arguments.length !== 1 || call.arguments[0] !== top) return { list: 'the callback is not the one argument of a call' };
    if (!ts.isPropertyAccessExpression(call.expression) || call.expression.name.text !== 'forEach' || call.expression.questionDotToken || call.questionDotToken) return { list: 'the callback is not handed to forEach' };
    let stmt = call; while (stmt.parent && ts.isParenthesizedExpression(stmt.parent)) stmt = stmt.parent;
    stmt = stmt.parent;
    if (!stmt || !ts.isExpressionStatement(stmt)) return { list: 'the forEach call is used as a value' };
    if (cb.parameters.length > 1) return { list: 'the callback takes an index or the array: a reduce callback here takes the accumulator and the element' };
    const xp = cb.parameters[0];
    if (xp && (!ts.isIdentifier(xp.name) || xp.dotDotDotToken || xp.initializer || xp.questionToken)) return { list: 'the callback takes a pattern, a default or a rest parameter' };
    // the receiver is an array, and its type rests on no assertion
    const recv = unparen(call.expression.expression);
    const rt = checker.getTypeAtLocation(recv);
    if (!(checker.isArrayType(rt) || checker.isTupleType(rt))) return { list: 'the receiver is not typed as an array (a Map, a Set or a NodeList has forEach and no reduce)' };
    const cast = castOnPath(checker, recv);
    if (cast) return { list: `the list's array type rests on a type assertion (\`${cast.getText().replace(/\s+/g, ' ').slice(0, 60)}\`)` };
    // one carried value: the callback writes no other binding declared outside it
    const written = new Set();
    const ww = (n) => { if (ts.isIdentifier(n) && isWritten(n)) { const s = symbolOf(checker, n), d = s?.valueDeclaration; if (s && !(d && d.pos >= cb.pos && d.end <= cb.end)) written.add(s); } ts.forEachChild(n, ww); };
    ww(cb.body);
    if (!written.has(sym)) return { list: `the callback does not write \`${name}\`` };
    if (written.size > 1) return { list: `the callback writes ${written.size} bindings declared outside it; one carried value is rewritten` };
    // nothing but the callback reads or writes the local while the loop runs
    const around = new Set();
    for (let p = stmt.parent; p && p !== owner; p = p.parent) if (ts.isFunctionLike(p)) { if (!inlineArrayCallback(p)) return { list: 'the forEach statement is inside a function someone else may call' }; around.add(p); }
    for (const u of usesOf(checker, sym, owner)) {
      const inCb = u.pos >= cb.pos && u.end <= cb.end;
      const fn = innermostFunction(u);
      if (inCb) { if (fn !== cb) return { list: `a function inside the callback names \`${name}\` at line ${sf.getLineAndCharacterOfPosition(u.getStart(sf)).line + 1}` }; continue; }
      if (fn !== owner && !around.has(fn)) return { list: `another function names \`${name}\` at line ${sf.getLineAndCharacterOfPosition(u.getStart(sf)).line + 1}; it could run while the loop runs` };
    }
    if (tryBetween(stmt, owner)) return { list: 'a try statement around the loop: after a throw part way through, the local would be read with its value before the loop' };
    if (contains(cb.body, (x) => ts.isIdentifier(x) && x.text === 'eval')) return { list: 'the callback calls eval' };
    // the body: no value returned; a bare return ends one step
    const returns = [];
    let bad = null;
    const rw = (n) => { if (bad || ts.isFunctionLike(n)) return; if (ts.isReturnStatement(n)) { if (n.expression) bad = 'the callback returns a value'; else returns.push(n); return; } ts.forEachChild(n, rw); };
    if (ts.isBlock(cb.body)) {
      ts.forEachChild(cb.body, rw);
      for (const st of cb.body.statements) if (ts.isVariableStatement(st) && st.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && d.name.text === name)) bad = `the callback declares its own \`${name}\``;
    }
    if (bad) return { list: bad };
    const acc = freshName(sf, 'acc');
    const ind = indentAt(sf, stmt.getStart(sf));
    let bodyText;
    if (ts.isBlock(cb.body)) {
      const from = cb.body.getStart(sf) + 1, to = cb.body.end - 1;
      let t = sf.text.slice(from, to);
      for (const r of [...returns].sort((a, b) => b.getStart(sf) - a.getStart(sf))) t = t.slice(0, r.getStart(sf) - from) + `return ${name};` + t.slice(r.end - from);
      const lines = t.split('\n');
      if (lines[0].trim() === '') lines.shift(); else lines[0] = `${ind}  ${lines[0].trim()}`;
      while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
      bodyText = lines.join('\n').trimEnd();
    } else bodyText = `${ind}  ${src(sf, cb.body)};`;
    const declared = checker.getTypeAtLocation(decl.name);
    const t = decl.type ? src(sf, decl.type) : typeText(checker, checker.getBaseTypeOfLiteralType(declared), stmt);
    const params = xp ? `${acc}, ${src(sf, xp)}` : acc;
    const text = [
      `${name} = ${src(sf, call.expression.expression)}.reduce${t ? `<${t}>` : ''}((${params}) => {`,
      `${ind}  let ${name} = ${acc};`,
      bodyText,
      `${ind}  return ${name};`,
      `${ind}}, ${name});`,
    ].join('\n');
    return { edits: [{ start: stmt.getStart(sf), end: stmt.end, text }], guard: `forEach to reduce carrying \`${name}\`: the callback writes only it, nothing else reads it while the loop runs, no try around the loop, an array receiver with no assertion` };
  },
};
