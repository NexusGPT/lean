// param-mutation (narrowed): a push into an array held under a key of a container the function makes, a dictionary or
// an array of arrays,
//
//     const perBand: Record<string, string[]> = {};      const parts: string[][] = group.map(() => []);
//     (perBand[b] = perBand[b] || []).push(id);          if (said !== undefined) parts[slot]?.push(said);
//
// becomes a rebuild of that array by spread, written back under its key:
//
//     perBand[b] = [...(perBand[b] || []), id];          if (said !== undefined) { const slotParts = parts[slot]; if (slotParts !== undefined) parts[slot] = [...slotParts, said]; }
//
// The spread copies the elements in order and the new ones follow (ECMA-262 13.2.4.1 ArrayAccumulation over the
// array's iterator, which reads indices 0 to length-1, as push appends at length), so the array under the key holds the
// same elements afterwards; only its identity differs. Nobody sees the identity when every array the container holds
// is one it made (an array literal, a `|| []` default, a rebuild) and no array is ever held outside the container:
//   - the container is a `const` or `let` of this function made by `{}`, `[]`, an array literal of array literals, or a
//     `map` whose callback returns an array literal; it is never handed to a call, returned, spread or held under another
//     name, and no other function than an inline array callback names it;
//   - every write under a key is a fresh array, the key's own array (`d[k] || []`), or a rebuild;
//   - every read of an array under a key is used at once: an element, its length, a method that reads it
//     (join, slice, map, filter, some, every, find, includes, indexOf, reduce, forEach, at, concat) with a callback of
//     at most two parameters, or a push being rebuilt; a callback over the container's arrays (`parts.map((p) =>
//     p.join())`) uses its parameter the same way;
//   - the key is a name, a literal or a pure path (it is read twice), the push has no spread argument and its value is
//     dropped.
// The holes: an array that has holes reads them as undefined in the spread (a hole is never made here: literals,
// defaults and rebuilds have none). The other shape of param-mutation, a sort or a push used as a value, is
// hoist-update's (the converter maps one rule to one transform, convert.mjs loadTransforms).
// What lane B cannot see: a container whose arrays a callee reads back through a prototype or a getter (the container
// is a literal of this function, so none).
import { ts, K, src, unparen, indentAt, freshName, usesOf, symbolOf, purePath, sameTree, functionOf, isWritten, inlineArrayCallback, tryBetween } from './util.mjs';
import { planReceiverCall } from './hoist-update.mjs';

const READERS = new Set(['join', 'slice', 'map', 'filter', 'some', 'every', 'find', 'findIndex', 'includes', 'indexOf', 'lastIndexOf', 'reduce', 'forEach', 'at', 'concat', 'flatMap', 'toString']);
const line = (sf, n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
const up = (n) => { while (n.parent && ts.isParenthesizedExpression(n.parent)) n = n.parent; return n; };

// a fresh array: a literal (its elements anything), or a rebuild by spread
const freshArray = (x) => ts.isArrayLiteralExpression(unparen(x));
// the container's initializer: `{}`, `[]`, an array literal of array literals, `xs.map(() => [])`
function freshContainer(init) {
  let x = unparen(init);
  while (ts.isAsExpression(x) || ts.isSatisfiesExpression?.(x)) x = unparen(x.expression);
  if (ts.isObjectLiteralExpression(x)) return x.properties.length === 0 ? 'dict' : null;
  if (ts.isArrayLiteralExpression(x)) return x.elements.every(freshArray) ? 'list' : null;
  if (ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && x.expression.name.text === 'map' && x.arguments.length === 1) {
    const cb = x.arguments[0];
    if ((ts.isArrowFunction(cb) || ts.isFunctionExpression(cb)) && !ts.isBlock(cb.body) && freshArray(cb.body)) return 'list';
  }
  return null;
}

// a read of one of the container's arrays used at once (`a` is the expression that holds the array)
function usedAtOnce(a) {
  const top = up(a), p = top.parent;
  if (!p) return false;
  if (ts.isElementAccessExpression(p) && p.expression === top && !isWritten(p) && !(p.parent && ts.isBinaryExpression(p.parent) && p.parent.left === p)) return true;
  if (ts.isPropertyAccessExpression(p) && p.expression === top) {
    if (p.name.text === 'length' && !isWritten(p) && !(p.parent && ts.isBinaryExpression(p.parent) && p.parent.left === p)) return true;
    if (READERS.has(p.name.text) && p.parent && ts.isCallExpression(p.parent) && p.parent.expression === p) return p.parent.arguments.every((g) => !ts.isFunctionLike(g) || g.parameters.length <= 2);
  }
  if (ts.isSpreadElement(p) && p.parent && ts.isArrayLiteralExpression(p.parent)) return true;
  return false;
}

// the push site: `C[k].push(v)`, `C[k]?.push(v)`, or `(C[k] = C[k] || [])`, `(C[k] ||= [])`, `(C[k] ??= [])` as receiver
function pushSite(node) {
  const call = node && ts.isCallExpression(node) ? node : null;
  if (!call || !ts.isPropertyAccessExpression(call.expression) || call.expression.name.text !== 'push') return null;
  if (call.arguments.some(ts.isSpreadElement) || !call.arguments.length) return null;
  const stmt = up(call).parent;
  if (!stmt || !ts.isExpressionStatement(stmt)) return null;
  const recv = unparen(call.expression.expression);
  if (ts.isElementAccessExpression(recv) && !recv.questionDotToken) return { call, stmt, slot: recv, fallback: null, optional: !!call.expression.questionDotToken };
  if (ts.isBinaryExpression(recv) && ts.isElementAccessExpression(unparen(recv.left))) {
    const slot = unparen(recv.left), op = recv.operatorToken.kind;
    if ((op === K.BarBarEqualsToken || op === K.QuestionQuestionEqualsToken) && freshArray(recv.right)) return { call, stmt, slot, fallback: { op: op === K.BarBarEqualsToken ? '||' : '??', value: recv.right }, optional: false };
    if (op === K.EqualsToken) {
      const r = unparen(recv.right);
      if (ts.isBinaryExpression(r) && (r.operatorToken.kind === K.BarBarToken || r.operatorToken.kind === K.QuestionQuestionToken) && sameTree(r.left, slot) && freshArray(r.right)) return { call, stmt, slot, fallback: { op: r.operatorToken.kind === K.BarBarToken ? '||' : '??', value: r.right }, optional: false };
    }
  }
  return null;
}

function planBucket(sf, checker, site) {
  const { call, stmt, slot, fallback, optional } = site;
  if (call.expression.questionDotToken && fallback) return { list: 'an optional push on a defaulted array' };
  const C = unparen(slot.expression), k = unparen(slot.argumentExpression);
  if (!ts.isIdentifier(C)) return { list: 'the container is not a name' };
  if (!(purePath(k) || ts.isLiteralExpression(k))) return { list: 'the key is not a name, a literal or a pure path; it is read twice' };
  const csym = symbolOf(checker, C), decl = csym?.valueDeclaration;
  if (!decl || !ts.isVariableDeclaration(decl) || !ts.isIdentifier(decl.name) || !decl.initializer) return { list: 'the container is not a local made here' };
  const owner = functionOf(decl);
  if (!owner) return { list: 'the container is module state' };
  if (owner.asteriskToken) return { list: 'a generator: its consumer may hold an array between two pushes' };
  // a throw while the pushed values are evaluated leaves a defaulted key unwritten in the rebuild; nothing reads the
  // container after a throw when no try stands between the push and the function
  if (tryBetween(stmt, owner)) return { list: 'a try statement around the push' };
  const kind = freshContainer(decl.initializer);
  if (!kind) return { list: 'the container is not made here empty, or of fresh arrays' };
  const ct = checker.getTypeAtLocation(C);
  if (kind === 'dict' && !(ct.getStringIndexType() || ct.getNumberIndexType())) return { list: 'the container is not typed as a dictionary' };
  if (kind === 'list' && !checker.isArrayType(ct)) return { list: 'the container is not typed as an array' };
  // the key's root is not written by the pushed values (the key is read again)
  const ksym = ts.isIdentifier(k) ? symbolOf(checker, k) : null;
  if (ksym && call.arguments.some((a) => usesOf(checker, ksym, a).some(isWritten))) return { list: 'a pushed value writes the key' };
  // every use of the container
  for (const u of usesOf(checker, csym, owner)) {
    if (u === decl.name) continue;
    const fn = (() => { for (let p = u.parent; p; p = p.parent) if (ts.isFunctionLike(p)) return p; return null; })();
    for (let f = fn; f && f !== owner; f = (() => { for (let p = f.parent; p; p = p.parent) if (ts.isFunctionLike(p)) return p; return null; })()) if (!inlineArrayCallback(f)) return { list: `a function that someone may call later names the container at line ${line(sf, u)}` };
    const top = up(u), p = top.parent;
    // C[k] ...
    if (p && ts.isElementAccessExpression(p) && p.expression === top) {
      const q = up(p).parent;
      // a write under a key: a fresh array, the key's own array defaulted, or a rebuild
      // the key's own array read as a default's left side (`C[k] = C[k] || []`)
      if (q && ts.isBinaryExpression(q) && (q.operatorToken.kind === K.BarBarToken || q.operatorToken.kind === K.QuestionQuestionToken) && unparen(q.left) === p) {
        const a = up(q).parent;
        if (a && ts.isBinaryExpression(a) && a.operatorToken.kind === K.EqualsToken && unparen(a.right) === q && sameTree(a.left, p) && freshArray(q.right)) continue;
        return { list: `an array of the container is read into an expression at line ${line(sf, u)}` };
      }
      if (q && ts.isBinaryExpression(q) && q.operatorToken.kind >= K.FirstAssignment && q.operatorToken.kind <= K.LastAssignment && unparen(q.left) === p) {
        const op = q.operatorToken.kind, r = unparen(q.right);
        const own = ts.isBinaryExpression(r) && (r.operatorToken.kind === K.BarBarToken || r.operatorToken.kind === K.QuestionQuestionToken) && sameTree(r.left, p) && freshArray(r.right);
        if (op === K.EqualsToken && (freshArray(r) || own)) continue;
        if ((op === K.BarBarEqualsToken || op === K.QuestionQuestionEqualsToken) && freshArray(r)) continue;
        return { list: `a value that is not a fresh array is put into the container at line ${line(sf, u)}` };
      }
      if (q && ts.isPropertyAccessExpression(q) && q.name.text === 'push' && q.parent && ts.isCallExpression(q.parent) && up(q.parent).parent && ts.isExpressionStatement(up(q.parent).parent)) continue; // another push: rebuilt in its turn
      if (usedAtOnce(p)) continue;
      return { list: `an array of the container is held or handed on at line ${line(sf, u)}` };
    }
    // a callback over the container's arrays: forEach and map, whose parameter is used at once
    if (p && ts.isPropertyAccessExpression(p) && p.expression === top && ['forEach', 'map', 'some', 'every'].includes(p.name.text) && p.parent && ts.isCallExpression(p.parent) && p.parent.expression === p) {
      const cb = p.parent.arguments[0];
      if (!cb || !(ts.isArrowFunction(cb) || ts.isFunctionExpression(cb)) || cb.parameters.length > 2 || p.parent.arguments.length > 1) return { list: `the container's arrays are handed to a callback that may keep them at line ${line(sf, u)}` };
      const ap = cb.parameters[0];
      if (ap && !ts.isIdentifier(ap.name)) return { list: 'a callback over the container takes a pattern' };
      if (ap) for (const a of usesOf(checker, symbolOf(checker, ap.name), cb.body)) if (!usedAtOnce(a)) return { list: `a callback over the container holds one of its arrays at line ${line(sf, a)}` };
      if (p.name.text === 'map' && !ts.isBlock(cb.body) && ap && ts.isIdentifier(unparen(cb.body)) && unparen(cb.body).text === ap.name.text) return { list: 'a map returns the container\'s arrays' };
      continue;
    }
    if (p && ts.isPropertyAccessExpression(p) && p.expression === top && p.name.text === 'length' && !isWritten(p)) continue;
    // returned (alone, or as a field of the returned literal): the function ends there, so no push follows
    if (p && ts.isReturnStatement(p) && functionOf(p) === owner) continue;
    if (p && (ts.isShorthandPropertyAssignment(p) || ts.isPropertyAssignment(p)) && p.parent && ts.isObjectLiteralExpression(p.parent) && up(p.parent).parent && ts.isReturnStatement(up(p.parent).parent) && functionOf(up(p.parent).parent) === owner) continue;
    return { list: `the container is handed on or held at line ${line(sf, u)}` };
  }
  const ind = indentAt(sf, stmt.getStart(sf));
  const S = src(sf, slot), vals = call.arguments.map((a) => src(sf, a)).join(', ');
  let text;
  if (fallback) text = `${S} = [...(${S} ${fallback.op} ${src(sf, fallback.value)}), ${vals}];`;
  else if (optional) {
    const b = freshName(sf, ts.isIdentifier(k) ? `${k.text}Items` : 'items');
    text = `{\n${ind}  const ${b} = ${S};\n${ind}  if (${b} !== undefined && ${b} !== null) ${S} = [...${b}, ${vals}];\n${ind}}`;
    if (stmt.parent && (ts.isBlock(stmt.parent) || ts.isSourceFile(stmt.parent) || ts.isCaseClause(stmt.parent) || ts.isDefaultClause(stmt.parent))) text = `const ${b} = ${S};\n${ind}if (${b} !== undefined && ${b} !== null) ${S} = [...${b}, ${vals}];`;
  } else text = `${S} = [...${S}, ${vals}];`;
  return { edits: [{ start: stmt.getStart(sf), end: stmt.end, text }], guard: `the ${kind === 'dict' ? 'dictionary' : 'list'} \`${C.text}\` is made here of fresh arrays, and none of its arrays is ever held outside it` };
}

export default {
  name: 'rebuild-by-spread',
  rules: ['param-mutation'],
  plan({ sf, checker, node }) {
    if (!node) return { list: 'no node at the finding' };
    const n = unparen(node);
    const site = pushSite(n);
    if (site) return planBucket(sf, checker, site);
    if (ts.isCallExpression(n)) return planReceiverCall(sf, checker, n); // a sort or a push used as a value (hoist-update)
    return { list: 'neither a push into a container\'s array nor a mutating method used as a value' };
  },
};
