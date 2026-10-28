// index-assign and property-assign on a record the function made (narrowed): a write into a record held in a field
// of a local record,
//
//     report.byAisle[aisle] = (report.byAisle[aisle] ?? 0) + 1;     report.totals.count += 1;
//
// becomes a rebuild of the inner record by spread, assigned to its field:
//
//     report.byAisle = { ...report.byAisle, [aisle]: (report.byAisle[aisle] ?? 0) + 1 };
//     report.totals = { ...report.totals, count: report.totals.count + 1 };
//
// A spread copies the own fields in their order and a key written again keeps its place (ECMA-262 CopyDataProperties
// and CreateDataProperty), so the inner record holds the same keys and values afterwards; only its identity differs,
// which no one sees when the outer record is a local made here by an object literal whose field is itself a fresh
// literal, never handed to a call or held under another name, and the inner record is reached only through that
// path. The inner record must be plain data (no method, accessor, class or prototype to lose). A compound write
// (`+=`, `++`) reads the key again, so its key is a name, a literal or a field path. Anything else: listed.
import { ts, K, src, unparen, functionOf, usesOf, symbolOf, purePath, sameTree, rootOf, plainRecordType } from './util.mjs';

const COMPOUND = new Map([[K.PlusEqualsToken, '+'], [K.MinusEqualsToken, '-'], [K.AsteriskEqualsToken, '*']]);

export default {
  name: 'record-spread',
  rules: ['index-assign', 'property-assign'],
  plan({ sf, checker, node }) {
    // the write: the finding sits on its target or on the update expression
    let target = node, write = node?.parent;
    if (node && (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node))) { write = node; target = unparen(node.operand); }
    if (!target || !write || !(ts.isElementAccessExpression(target) || ts.isPropertyAccessExpression(target))) return { list: 'the finding is not on a field or element write' };
    const stmt = write.parent;
    if (!stmt || !ts.isExpressionStatement(stmt)) return { list: 'the write is used as a value' };
    let op = null, rhs = null;
    if (ts.isBinaryExpression(write) && write.left === target) {
      if (write.operatorToken.kind === K.EqualsToken) op = '=';
      else if (COMPOUND.has(write.operatorToken.kind)) op = COMPOUND.get(write.operatorToken.kind);
      rhs = write.right;
    } else if ((ts.isPrefixUnaryExpression(write) || ts.isPostfixUnaryExpression(write)) && [K.PlusPlusToken, K.MinusMinusToken].includes(write.operator)) { op = write.operator === K.PlusPlusToken ? '+' : '-'; rhs = null; }
    if (!op) return { list: 'only =, +=, -=, *=, ++ and -- are rebuilt' };
    if (op !== '=' && !(checker.getTypeAtLocation(target).flags & ts.TypeFlags.NumberLike) && !(op === '+' && rhs)) return { list: 'an update of a value that is not a number' };
    const inner = unparen(target.expression);
    if (!ts.isPropertyAccessExpression(inner) || !purePath(inner)) return { list: 'the written record is not a field of a local record' };
    let keyText, readKey;
    if (ts.isElementAccessExpression(target)) {
      const k = unparen(target.argumentExpression);
      const kt = checker.getTypeAtLocation(k);
      if (!(kt.flags & (ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike))) return { list: 'the key is not a string or a number' };
      if (op !== '=' && !(purePath(k) || ts.isLiteralExpression(k))) return { list: 'a compound write reads its key twice; the key is not a name or a literal' };
      keyText = `[${src(sf, k)}]`; readKey = `${src(sf, inner)}[${src(sf, k)}]`;
    } else { keyText = target.name.text; readKey = `${src(sf, inner)}.${target.name.text}`; }
    // the inner record is plain data
    const it = checker.getTypeAtLocation(inner);
    if (!plainRecordType(checker, it) && !(it.getStringIndexType() && !it.getProperties().length)) return { list: 'the written record is not plain data' };
    // the outer record is a local made here by a literal whose field is a fresh literal
    const root = rootOf(inner), rsym = root && symbolOf(checker, root), rdecl = rsym?.valueDeclaration;
    const fn = functionOf(stmt);
    if (!fn || !rdecl || !ts.isVariableDeclaration(rdecl) || functionOf(rdecl) !== fn || !rdecl.initializer) return { list: 'the outer record is not a local of this function' };
    let lit = unparen(rdecl.initializer);
    while (ts.isAsExpression(lit) || ts.isSatisfiesExpression?.(lit)) lit = unparen(lit.expression);
    const path = []; for (let x = inner; ts.isPropertyAccessExpression(x); x = unparen(x.expression)) path.unshift(x.name.text);
    for (const f of path) {
      if (!ts.isObjectLiteralExpression(lit)) return { list: `the field ${f} is not made by a literal here` };
      const pr = lit.properties.find((q) => ts.isPropertyAssignment(q) && (ts.isIdentifier(q.name) || ts.isStringLiteral(q.name)) && q.name.text === f);
      if (!pr) return { list: `the literal does not make the field ${f}` };
      lit = unparen(pr.initializer);
    }
    if (!ts.isObjectLiteralExpression(lit)) return { list: 'the inner record is not made by a literal' };
    // every use of the outer record reads a field, is written through a field, is spread, or is returned
    for (const u of usesOf(checker, rsym, fn)) {
      if (u === rdecl.name) continue;
      let top = u; while (top.parent && ts.isParenthesizedExpression(top.parent)) top = top.parent;
      const pa = top.parent;
      if (pa && ts.isPropertyAccessExpression(pa) && pa.expression === top) {
        // a path that reaches the inner record must read through it, be written through it, or be rebuilt
        let up = pa, depth = 1;
        while (depth < path.length && up.parent && ts.isPropertyAccessExpression(up.parent) && up.parent.expression === up) { up = up.parent; depth++; }
        if (depth === path.length && sameTree(up, inner)) {
          const q = up.parent;
          const reads = q && ((ts.isPropertyAccessExpression(q) && q.expression === up) || (ts.isElementAccessExpression(q) && q.expression === up));
          const rebuilt = q && ts.isBinaryExpression(q) && q.left === up && q.operatorToken.kind === K.EqualsToken && ts.isObjectLiteralExpression(unparen(q.right));
          const spread = q && ts.isSpreadAssignment(q);
          if (!(reads || rebuilt || spread)) return { list: `the inner record is held or handed on at line ${sf.getLineAndCharacterOfPosition(up.getStart(sf)).line + 1}` };
          if (reads && q.parent && ts.isCallExpression(q.parent) && q.parent.expression === q) return { list: 'a method of the inner record is called' };
        }
        continue;
      }
      if (pa && (ts.isReturnStatement(pa) || ts.isSpreadAssignment(pa))) continue;
      if (pa && ts.isShorthandPropertyAssignment(pa) && pa.parent?.parent && ts.isReturnStatement(pa.parent.parent)) continue;
      return { list: `the outer record is handed on or held under another name at line ${sf.getLineAndCharacterOfPosition(u.getStart(sf)).line + 1}` };
    }
    const value = op === '=' ? src(sf, rhs) : rhs ? `${readKey} ${op} ${ts.isBinaryExpression(unparen(rhs)) || ts.isConditionalExpression(unparen(rhs)) ? `(${src(sf, rhs)})` : src(sf, rhs)}` : `${readKey} ${op} 1`;
    const r = src(sf, inner);
    return { edits: [{ start: stmt.getStart(sf), end: stmt.end, text: `${r} = { ...${r}, ${keyText}: ${value} };` }], guard: 'the inner record is a fresh literal in a local record, reached only through its path' };
  },
};
