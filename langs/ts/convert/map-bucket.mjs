// alias-mutation on a Map value (narrowed): a bucket read from a Map, grown in place when present and created when
// absent,
//
//     const bucket = m.get(k);
//     if (bucket) bucket.push(v); else m.set(k, [v]);
//
// becomes one write of a new bucket, `m.set(k, [...(m.get(k) ?? []), v]);`. The two agree on every key and every
// value the Map holds afterwards; they differ only in the identity of the bucket arrays, which no one can observe
// when the Map is the function's own: made empty here by `new Map()`, never handed to a call, every other value set
// into it a fresh array literal, and no bucket read out of it before the last time one grows (every other read sits
// after the outermost loop around the growth, or in another such growth). The key is a name or a field path, read
// twice with nothing between. Anything else (a bucket that is a record, a Map handed in, a bucket held under a name
// while it grows): listed for a person.
import { ts, K, src, unparen, statementOf, functionOf, usesOf, symbolOf, purePath, sameTree, rootOf } from './util.mjs';

const LOOP = (n) => ts.isForStatement(n) || ts.isForOfStatement(n) || ts.isForInStatement(n) || ts.isWhileStatement(n) || ts.isDoStatement(n);
const one = (s) => (s && ts.isBlock(s) ? (s.statements.length === 1 ? s.statements[0] : null) : s);

// the test of an if on the bucket: true when it reads "present", false when it reads "absent", null otherwise
function presence(c, name) {
  c = unparen(c);
  const is = (x) => ts.isIdentifier(unparen(x)) && unparen(x).text === name;
  const nil = (x) => { x = unparen(x); return x.kind === K.NullKeyword || (ts.isIdentifier(x) && x.text === 'undefined'); };
  if (is(c)) return true;
  if (ts.isPrefixUnaryExpression(c) && c.operator === K.ExclamationToken && is(c.operand)) return false;
  if (ts.isBinaryExpression(c)) {
    const op = c.operatorToken.kind, pair = (is(c.left) && nil(c.right)) || (is(c.right) && nil(c.left));
    if (!pair) return null;
    if (op === K.ExclamationEqualsToken || (op === K.ExclamationEqualsEqualsToken && [c.left, c.right].some((x) => ts.isIdentifier(unparen(x)) && unparen(x).text === 'undefined'))) return true;
    if (op === K.EqualsEqualsToken || (op === K.EqualsEqualsEqualsToken && [c.left, c.right].some((x) => ts.isIdentifier(unparen(x)) && unparen(x).text === 'undefined'))) return false;
  }
  return null;
}

export default {
  name: 'map-bucket',
  rules: ['alias-mutation'],
  plan({ sf, checker, node }) {
    // the finding sits on `bucket.push(v)`
    const call = node && ts.isCallExpression(node) ? node : node?.parent && ts.isCallExpression(node.parent) ? node.parent : null;
    if (!call || !ts.isPropertyAccessExpression(call.expression) || call.expression.name.text !== 'push' || !ts.isIdentifier(unparen(call.expression.expression))) return { list: 'not a push through a name' };
    const bucket = unparen(call.expression.expression), bsym = symbolOf(checker, bucket);
    const decl = bsym?.valueDeclaration;
    if (!decl || !ts.isVariableDeclaration(decl) || !decl.initializer || !(decl.parent.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let)) || decl.parent.declarations.length !== 1) return { list: 'the name is not a single local declaration' };
    const get = unparen(decl.initializer);
    if (!ts.isCallExpression(get) || !ts.isPropertyAccessExpression(get.expression) || get.expression.name.text !== 'get' || get.arguments.length !== 1) return { list: 'the name does not hold a Map read' };
    const mapPath = unparen(get.expression.expression), key = unparen(get.arguments[0]);
    if (!purePath(mapPath) || !purePath(key)) return { list: 'the Map or the key is not a name or a field path' };
    const mt = checker.getTypeAtLocation(mapPath);
    if (mt.getSymbol()?.getName() !== 'Map') return { list: 'the receiver is not a Map' };
    const vt = checker.getTypeArguments(mt)?.[1];
    if (!vt || !checker.isArrayType(vt)) return { list: 'the Map value is not an array' };
    const declStmt = decl.parent.parent;
    const ifs = declStmt && declStmt.parent?.statements ? declStmt.parent.statements[declStmt.parent.statements.indexOf(declStmt) + 1] : null;
    if (!ifs || !ts.isIfStatement(ifs) || !ifs.elseStatement) return { list: 'the read is not followed by an if/else on the bucket' };
    const present = presence(ifs.expression, bucket.text);
    if (present === null) return { list: 'the if does not test whether the bucket is there' };
    const grow = one(present ? ifs.thenStatement : ifs.elseStatement), make = one(present ? ifs.elseStatement : ifs.thenStatement);
    const growCall = grow && ts.isExpressionStatement(grow) ? unparen(grow.expression) : null, makeCall = make && ts.isExpressionStatement(make) ? unparen(make.expression) : null;
    if (growCall !== call) return { list: 'the push is not the whole present branch' };
    if (!makeCall || !ts.isCallExpression(makeCall) || !ts.isPropertyAccessExpression(makeCall.expression) || makeCall.expression.name.text !== 'set' || makeCall.arguments.length !== 2) return { list: 'the absent branch is not one set' };
    const lit = unparen(makeCall.arguments[1]);
    if (!sameTree(makeCall.expression.expression, mapPath) || !sameTree(makeCall.arguments[0], key) || !ts.isArrayLiteralExpression(lit) || lit.elements.length !== call.arguments.length || !lit.elements.every((e, i) => sameTree(e, call.arguments[i]))) return { list: 'the absent branch does not set the same key to an array of the same values' };
    if (usesOf(checker, bsym, functionOf(decl) ?? sf).length !== 3) return { list: 'the bucket name is used outside the read, the test and the push' };
    // the Map is the function's own
    const fn = functionOf(declStmt);
    const root = rootOf(mapPath), msym = root && symbolOf(checker, root), mdecl = msym?.valueDeclaration;
    if (!fn || !ts.isIdentifier(mapPath) || !mdecl || !ts.isVariableDeclaration(mdecl) || functionOf(mdecl) !== fn) return { list: 'the Map is not a local of this function' };
    const init = mdecl.initializer && unparen(mdecl.initializer);
    if (!init || !ts.isNewExpression(init) || !ts.isIdentifier(init.expression) || init.expression.text !== 'Map' || (init.arguments ?? []).length) return { list: 'the Map is not made empty here' };
    // the outermost loop around the growth: every other read of a bucket comes after it
    let outer = declStmt;
    for (let p = declStmt.parent; p && p !== fn; p = p.parent) if (LOOP(p)) outer = p;
    for (const u of usesOf(checker, msym, fn)) {
      if (u === mdecl.name) continue;
      if (u.pos >= declStmt.pos && u.end <= ifs.end) continue; // this growth
      const pa = u.parent;
      const method = pa && ts.isPropertyAccessExpression(pa) && pa.expression === u ? pa.name.text : null;
      if (method === 'set' && ts.isCallExpression(pa.parent)) {
        const v = pa.parent.arguments[1] && unparen(pa.parent.arguments[1]);
        if (!(v && (ts.isArrayLiteralExpression(v)))) return { list: `another set at line ${sf.getLineAndCharacterOfPosition(u.getStart(sf)).line + 1} stores a value that is not a fresh array` };
        continue;
      }
      if (['has', 'size', 'delete', 'clear'].includes(method)) continue;
      if (method === 'get' && pa.parent && ts.isCallExpression(pa.parent)) {
        // another growth of the same shape is fine; any other read must come after the loop
        const d = pa.parent.parent;
        // the set-and-spread shape itself: `m.set(k, [...(m.get(k) ?? []), v])`
        let q = pa.parent.parent; while (q && (ts.isParenthesizedExpression(q) || (ts.isBinaryExpression(q) && q.operatorToken.kind === K.QuestionQuestionToken))) q = q.parent;
        if (q && ts.isSpreadElement(q) && ts.isArrayLiteralExpression(q.parent) && ts.isCallExpression(q.parent.parent) && q.parent.parent.arguments[1] === q.parent && ts.isPropertyAccessExpression(q.parent.parent.expression) && q.parent.parent.expression.name.text === 'set' && sameTree(q.parent.parent.expression.expression, mapPath)) continue;
        if (d && ts.isVariableDeclaration(d) && d.initializer === pa.parent) {
          const nxt = d.parent.parent.parent?.statements?.[d.parent.parent.parent.statements.indexOf(d.parent.parent) + 1];
          if (nxt && ts.isIfStatement(nxt) && presence(nxt.expression, d.name.getText(sf)) !== null) continue;
        }
      }
      if (ts.isReturnStatement(pa) && u.pos >= outer.end) continue;
      if (u.pos >= outer.end && !(pa && (ts.isCallExpression(pa) || ts.isNewExpression(pa)) && (pa.arguments ?? []).includes(u))) continue;
      return { list: `the Map is read at line ${sf.getLineAndCharacterOfPosition(u.getStart(sf)).line + 1} while its buckets still grow, or handed to a call` };
    }
    const m = src(sf, mapPath), k = src(sf, key), vals = call.arguments.map((a) => src(sf, a)).join(', ');
    return { edits: [{ start: declStmt.getStart(sf), end: ifs.end, text: `${m}.set(${k}, [...(${m}.get(${k}) ?? []), ${vals}]);` }], guard: 'the Map is made empty here, never handed away, and no bucket is held while it grows' };
  },
};
