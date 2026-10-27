// foreach (narrowed): `xs.forEach((x, i) => body)` as a statement, over an array whose element type has no
// undefined, becomes a counted for:
//
//     for (let i = 0; i < xs.length; i++) {
//       const x = xs[i];
//       if (x === undefined) continue;
//       body
//     }
//
// Array.prototype.forEach reads the length once and skips holes (ECMA-262 23.1.3.15: HasProperty before each call);
// the loop reads the length each turn and skips an undefined element, which on this element type is a hole. The two
// agree when the body never changes the list (no write to its name, no mutating method on it, no call handed the
// list), the callback is a synchronous arrow with plain parameters it never assigns, and a bare `return;` in the
// body (the end of one step) is not inside a nested loop or switch, where it becomes `continue;`. A receiver that is
// not a name is read once into a fresh local first, as forEach reads it once. A Map or Set forEach, an async
// callback, a `return <value>`, a three-parameter callback: listed for a person.
import { ts, K, src, unparen, indentAt, statementOf, freshName, usesOf, symbolOf, isWritten, excludesUndefined, contains, purePath, sameTree, rootOf } from './util.mjs';

const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin', 'length']);

export default {
  name: 'foreach',
  rules: ['foreach'],
  plan({ sf, checker, node }) {
    if (!node || !ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression) || node.expression.name.text !== 'forEach') return { list: 'the finding is not on a forEach call' };
    let top = node; while (top.parent && ts.isParenthesizedExpression(top.parent)) top = top.parent;
    const stmt = top.parent;
    if (!stmt || !ts.isExpressionStatement(stmt)) return { list: 'the forEach call is used as a value' };
    const cb = node.arguments[0];
    if (node.arguments.length !== 1 || !cb || !ts.isArrowFunction(cb)) return { list: 'the callback is not an inline arrow (or a this argument is passed)' };
    if (cb.modifiers?.some((m) => m.kind === K.AsyncKeyword)) return { list: 'an async callback: forEach does not wait for it; an awaited loop changes when the steps run' };
    if (cb.parameters.length < 1 || cb.parameters.length > 2 || !cb.parameters.every((p) => ts.isIdentifier(p.name) && !p.dotDotDotToken && !p.initializer && !p.questionToken)) return { list: 'the callback takes the array itself, a pattern, a default or a rest parameter' };
    const recv = unparen(node.expression.expression);
    const rt = checker.getTypeAtLocation(recv);
    if (!(checker.isArrayType(rt) || checker.isTupleType(rt))) return { list: 'the receiver is not typed as an array (a Map or Set forEach passes the key, not an index)' };
    const elementType = checker.getIndexTypeOfType(rt, ts.IndexKind.Number) ?? checker.getTypeArguments(rt)?.[0];
    if (!elementType || !excludesUndefined(elementType)) return { list: 'the element type holds undefined: a hole and an undefined element would read alike' };
    const [xp, ip] = cb.parameters;
    // the parameters are never assigned in the body: in the loop they are a const and the counter
    for (const p of cb.parameters) for (const u of usesOf(checker, symbolOf(checker, p.name), cb.body)) if (isWritten(u)) return { list: `the callback assigns its parameter \`${p.name.text}\`` };
    // the body never changes the list: no write to the name, no mutating method on it, no call handed it
    const recvSym = ts.isIdentifier(recv) ? symbolOf(checker, recv) : null;
    if (!purePath(recv) && !ts.isCallExpression(recv)) return { list: 'the receiver is neither a name, a field path nor a call' };
    const touches = (x) => { x = unparen(x); return recvSym ? ts.isIdentifier(x) && symbolOf(checker, x) === recvSym : sameTree(x, recv); };
    let changed = null;
    const walk = (n) => {
      if (changed) return;
      if (ts.isExpression(n) && touches(n)) {
        let top = n; while (top.parent && ts.isParenthesizedExpression(top.parent)) top = top.parent;
        const pa = top.parent;
        if (isWritten(top) || (pa && ts.isBinaryExpression(pa) && pa.left === top && pa.operatorToken.kind >= K.FirstAssignment && pa.operatorToken.kind <= K.LastAssignment)) changed = 'the body assigns the list';
        else if (pa && ts.isPropertyAccessExpression(pa) && pa.expression === top && MUTATORS.has(pa.name.text)) changed = `the body calls ${pa.name.text} on the list`;
        else if (pa && ts.isElementAccessExpression(pa) && pa.expression === top && (isWritten(pa) || (pa.parent && ts.isBinaryExpression(pa.parent) && pa.parent.left === pa && pa.parent.operatorToken.kind >= K.FirstAssignment && pa.parent.operatorToken.kind <= K.LastAssignment))) changed = 'the body writes an element of the list';
        else if (pa && (ts.isCallExpression(pa) || ts.isNewExpression(pa)) && (pa.arguments ?? []).includes(top)) changed = 'the body hands the list to a call';
      }
      ts.forEachChild(n, walk);
    };
    walk(cb.body);
    if (changed) return { list: changed };
    if (!recvSym && !ts.isCallExpression(recv)) {
      // a field path: a call handed its root may change the list through it
      const root = rootOf(recv), rootSym = root && symbolOf(checker, root);
      if (rootSym && contains(cb.body, (x) => (ts.isCallExpression(x) || ts.isNewExpression(x)) && (x.arguments ?? []).some((a) => ts.isIdentifier(unparen(a)) && symbolOf(checker, unparen(a)) === rootSym), true)) return { list: 'the body hands the object that holds the list to a call' };
    }
    // returns in the body: a bare return ends one step; one under a nested loop or switch, or one with a value, stays
    const returns = [];
    let bad = null;
    const rw = (n, nested) => {
      if (bad || (ts.isFunctionLike(n) && n !== cb)) return;
      if (ts.isReturnStatement(n)) { if (n.expression) bad = 'the body returns a value'; else if (nested) bad = 'a return inside a nested loop or switch'; else returns.push(n); return; }
      const deeper = nested || ts.isForStatement(n) || ts.isForOfStatement(n) || ts.isForInStatement(n) || ts.isWhileStatement(n) || ts.isDoStatement(n) || ts.isSwitchStatement(n);
      ts.forEachChild(n, (c) => rw(c, deeper));
    };
    if (ts.isBlock(cb.body)) ts.forEachChild(cb.body, (c) => rw(c, false));
    if (bad) return { list: bad };
    if (contains(cb.body, (x) => x.kind === K.ThisKeyword || (ts.isIdentifier(x) && x.text === 'arguments'))) return { list: 'the body reads this or arguments' };
    if (contains(cb.body, (x) => ts.isLabeledStatement(x))) return { list: 'a labelled statement in the body' };
    const ind = indentAt(sf, stmt.getStart(sf));
    const pre = [];
    let list;
    if (ts.isIdentifier(recv)) list = recv.text;
    else {
      const base = ts.isPropertyAccessExpression(recv) ? recv.name.text : 'items';
      list = freshName(sf, base);
      pre.push(`const ${list} = ${src(sf, recv)};`);
    }
    const i = ip ? ip.name.text : freshName(sf, 'i');
    const x = xp.name.text;
    // the body text, with each bare return made a continue
    let bodyText;
    if (ts.isBlock(cb.body)) {
      const from = cb.body.getStart(sf) + 1, to = cb.body.end - 1;
      let t = sf.text.slice(from, to);
      for (const r of [...returns].sort((a, b) => b.getStart(sf) - a.getStart(sf))) t = t.slice(0, r.getStart(sf) - from) + 'continue;' + t.slice(r.end - from);
      const lines = t.split('\n');
      if (lines[0].trim() === '') lines.shift(); else lines[0] = `${ind}  ${lines[0].trim()}`;
      while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
      bodyText = lines.join('\n').trimEnd();
    } else bodyText = `${ind}  ${src(sf, cb.body)};`;
    const loop = [
      ...pre.map((l, k) => (k === 0 ? l : ind + l)),
      `${pre.length ? ind : ''}for (let ${i} = 0; ${i} < ${list}.length; ${i}++) {`,
      `${ind}  const ${x} = ${list}[${i}];`,
      `${ind}  if (${x} === undefined) continue;`,
      bodyText,
      `${ind}}`,
    ].join('\n');
    return { edits: [{ start: stmt.getStart(sf), end: stmt.end, text: loop }], guard: 'an array with no undefined element, a body that never changes the list, a synchronous arrow with plain parameters' };
  },
};
