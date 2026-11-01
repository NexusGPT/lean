// update-expression, assignment-expression, operator-value-context, in-place-mutation (narrowed): a step used as a
// value (an assignment, an update, or an array method that changes its receiver and returns it) becomes a statement
// just before the statement that held it, and the value is read back where the step was:
//
//     const v = (o.n ??= 3);              o.n ??= 3;  const v = o.n;
//     return s.cache || (s.cache = 'x');  s.cache ||= 'x';  return s.cache;
//     return ys.sort(cmp)[0];             ys.sort(cmp);  return ys[0];
//     const id = m ? m.id : next++;       let id2: number; if (m) { id2 = m.id; } else { id2 = next++; }  const id = id2;
//
// The four shapes and why each keeps behaviour:
//   - hoist: a step on every path of its statement moves before it. Everything the statement evaluates before the step
//     (its earlier operands, in source order, which is JavaScript's order of evaluation for these forms) is inert: names,
//     literals, `this`, typeof, operators on primitives and field reads of plain data records (nothing that calls, writes
//     or throws under the types), and none of it names the step's target, so moving the step first changes nothing they
//     read. The value is the target read back: an assignment's value is the value it stored (ECMA-262 13.15.2), which a
//     name or a plain data field gives back unchanged.
//   - the logical idiom `T || (T = V)` (and `??`, `&&`) is `T ||= V` when T is a pure path (a name or plain field
//     reads), which reads T's base once instead of twice and otherwise evaluates alike (ECMA-262 13.15.2, the short
//     circuit and the PutValue); it is then hoisted as above.
//   - a conditional `c ? A : B` (or `A && B`, `A || B` with A a boolean) whose branch holds a step, itself on every path
//     of its statement, becomes `let v: T;` and an if statement assigning v in each branch, before the statement; v
//     replaces it. The condition and each branch are evaluated once and only on their path, and the inert rule above
//     covers what the statement evaluated before them. T is the checker's type of the conditional.
//   - `R.sort(f)`, `R.reverse()`, `R.fill(...)`, `R.copyWithin(...)` return their receiver (ECMA-262 23.1.3: each returns
//     O, the ToObject of this); `R.push(...)`, `R.unshift(...)` return its new length. On an array R that is a pure path,
//     the call becomes a statement and its value `R` or `R.length`; the arguments assign nothing R's path names.
// A step inside a function's expression body, a loop head, a closure, an optional chain, or after a call in its
// statement: listed. What lane B cannot see: a field that is an accessor on a type the checker reads as plain data
// (a class field hidden by an interface), and a frozen record (its write throws in both forms; a hoisted write throws
// before the earlier operands run, which are inert, so no effect is reordered).
import { ts, K, src, unparen, indentAt, freshName, symbolOf, purePath, sameTree, rootOf, typeText, plainRecordType, isWritten, contains } from './util.mjs';

const ASSIGN = (k) => k >= K.FirstAssignment && k <= K.LastAssignment;
const LOGICAL = new Map([[K.BarBarToken, '||='], [K.QuestionQuestionToken, '??='], [K.AmpersandAmpersandToken, '&&=']]);
const RETURNS_RECEIVER = new Set(['sort', 'reverse']); // fill and copyWithin also return O, but lean reads them only on a fresh array
const RETURNS_LENGTH = new Set(['push', 'unshift']);

const up = (n) => { let p = n.parent; while (p && ts.isParenthesizedExpression(p)) p = p.parent; return p; };
const outer = (n) => { while (n.parent && ts.isParenthesizedExpression(n.parent)) n = n.parent; return n; };
const isStep = (x) => { x = unparen(x); return (ts.isBinaryExpression(x) && ASSIGN(x.operatorToken.kind)) || ((ts.isPrefixUnaryExpression(x) || ts.isPostfixUnaryExpression(x)) && (x.operator === K.PlusPlusToken || x.operator === K.MinusMinusToken)); };

// the statement a value sits in, and whether the walk from the value to it passes only forms that evaluate the value
// on every path; `cond` collects the conditional forms passed (their branch holds the value)
function placeOf(e) {
  const conds = [];
  let c = e;
  for (let p = e.parent; p; c = p, p = p.parent) {
    if (ts.isParenthesizedExpression(p) || ts.isAsExpression(p) || ts.isNonNullExpression(p) || ts.isSatisfiesExpression?.(p) || ts.isTypeAssertionExpression(p)) continue;
    if (ts.isConditionalExpression(p)) { if (c !== p.condition) conds.push(p); continue; }
    if (ts.isBinaryExpression(p)) { if (LOGICAL.has(p.operatorToken.kind) && c === p.right) conds.push(p); continue; }
    if (ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) { if (p.questionDotToken && c !== p.expression) return { why: 'the step is after an optional chain' }; continue; }
    if (ts.isCallExpression(p) || ts.isNewExpression(p)) { if (p.questionDotToken) return { why: 'the step is in an optional call' }; continue; }
    if (ts.isPrefixUnaryExpression(p) || ts.isPostfixUnaryExpression(p) || ts.isTypeOfExpression(p) || ts.isVoidExpression(p)) continue;
    if (ts.isTemplateSpan(p) || ts.isTemplateExpression(p) || ts.isArrayLiteralExpression(p) || ts.isSpreadElement(p) || ts.isSpreadAssignment(p)) continue;
    if (ts.isObjectLiteralExpression(p) || ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) { if (ts.isPropertyAssignment(p) && c === p.name) return { why: 'the step is a computed key' }; continue; }
    if (ts.isVariableDeclaration(p)) { if (c !== p.initializer) return { why: 'not an initializer' }; continue; }
    if (ts.isVariableDeclarationList(p)) continue;
    if (ts.isVariableStatement(p) && !(ts.isBlock(p.parent) || ts.isSourceFile(p.parent) || ts.isCaseClause(p.parent) || ts.isDefaultClause(p.parent) || ts.isModuleBlock(p.parent))) return { why: 'a declaration outside a statement list' };
    if (ts.isVariableStatement(p) || ts.isExpressionStatement(p) || ts.isReturnStatement(p) || ts.isThrowStatement(p)) return { stmt: p, conds };
    if (ts.isIfStatement(p) || ts.isSwitchStatement(p)) return c === p.expression ? { stmt: p, conds } : { why: 'not the condition' };
    if (ts.isForOfStatement(p) && !p.awaitModifier) return c === p.expression ? { stmt: p, conds } : { why: 'the step is in a for-of head or body' }; // the list is evaluated once, before the first pass
    if (ts.isFunctionLike(p)) return { why: 'the step is in a function\'s expression body or a parameter default' };
    return { why: `the step is under a ${ts.SyntaxKind[p.kind]}, which does not evaluate it once on every path` };
  }
  return { why: 'no statement' };
}

// what the statement evaluates before `e`: the earlier children, in source order, of every node on the path from e up
// to the statement (JavaScript evaluates these forms left to right); a declaration's or a property's name and the
// punctuation are not evaluated, and a type is erased
function before(e, stmt) {
  const out = [];
  for (let c = e, p = e.parent; p && p !== stmt; c = p, p = p.parent) {
    if (ts.isVariableDeclarationList(p)) continue; // the declarators before run first: the list is split there (splitAt)
    // an assignment evaluates the base of its target before its right side
    if (ts.isBinaryExpression(p) && ASSIGN(p.operatorToken.kind) && c === p.right) { const t = unparen(p.left); if (!ts.isIdentifier(t)) out.push(t); continue; }
    ts.forEachChild(p, (x) => {
      if (x === c || x.end > c.getStart()) return;
      if (ts.isTypeNode(x) || (x.kind >= K.FirstPunctuation && x.kind <= K.LastPunctuation)) return;
      if ((ts.isVariableDeclaration(p) || ts.isPropertyAssignment(p) || ts.isBindingElement(p)) && x === p.name && !ts.isComputedPropertyName(x)) return;
      out.push(x);
    });
  }
  return out;
}

// an expression whose evaluation calls, writes and throws nothing under its types, and names no binding in `avoid`
function inert(checker, x, avoid, field) {
  let bad = null;
  const w = (n) => {
    if (bad) return;
    if (n.kind >= K.FirstPunctuation && n.kind <= K.LastPunctuation) return;
    if (ts.isIdentifier(n)) { const s = symbolOf(checker, n); if (s && avoid.has(s)) bad = `it reads \`${n.text}\` before the step`; return; }
    if (ts.isLiteralExpression(n) || ts.isNoSubstitutionTemplateLiteral(n) || [K.TrueKeyword, K.FalseKeyword, K.NullKeyword, K.ThisKeyword, K.UndefinedKeyword].includes(n.kind)) return;
    if (ts.isVariableDeclaration(n)) { if (!ts.isIdentifier(n.name)) { bad = 'an earlier declaration binds a pattern'; return; } if (n.initializer) w(n.initializer); return; }
    if (ts.isParenthesizedExpression(n) || ts.isTypeOfExpression(n) || ts.isNonNullExpression(n) || ts.isAsExpression(n) || ts.isTemplateExpression(n) || ts.isTemplateSpan(n) || ts.isShorthandPropertyAssignment(n) || ts.isPropertyAssignment(n)) { ts.forEachChild(n, w); return; }
    if (ts.isTypeNode(n)) return;
    if (ts.isPropertyAccessExpression(n)) {
      if (field && n.name.text === field) { bad = `it reads a field \`${field}\` before the step`; return; }
      const t = checker.getTypeAtLocation(n.expression), nn = checker.getNonNullableType(t);
      // a member declared as a method is read as a function value (no accessor runs): the callee of a call
      const member = checker.getSymbolAtLocation(n.name);
      if (member && member.flags & ts.SymbolFlags.Method && nn === t) { w(n.expression); return; }
      if (!(plainRecordType(checker, nn) || checker.isArrayType(nn) || checker.isTupleType(nn))) { bad = 'it reads a field of a value that is not a plain data record'; return; }
      if (!n.questionDotToken && nn !== t) { bad = 'it reads a field of a value that may be null or undefined'; return; }
      w(n.expression); return;
    }
    if (ts.isElementAccessExpression(n)) { const t = checker.getTypeAtLocation(n.expression); if (!checker.isArrayType(t) && !checker.isTupleType(t)) { bad = 'it reads an element of a value that is not an array'; return; } ts.forEachChild(n, w); return; }
    if (ts.isBinaryExpression(n) && !ASSIGN(n.operatorToken.kind) && n.operatorToken.kind !== K.CommaToken && n.operatorToken.kind !== K.InKeyword && n.operatorToken.kind !== K.InstanceOfKeyword) {
      const prim = (y) => !!(checker.getTypeAtLocation(y).flags & (ts.TypeFlags.NumberLike | ts.TypeFlags.StringLike | ts.TypeFlags.BooleanLike | ts.TypeFlags.Null | ts.TypeFlags.Undefined));
      if (!prim(n.left) || !prim(n.right)) { bad = 'an operator on a value that is not a primitive'; return; }
      ts.forEachChild(n, w); return;
    }
    if (ts.isPrefixUnaryExpression(n) && n.operator !== K.PlusPlusToken && n.operator !== K.MinusMinusToken) { ts.forEachChild(n, w); return; }
    if (ts.isConditionalExpression(n) || ts.isArrayLiteralExpression(n) || ts.isObjectLiteralExpression(n)) { ts.forEachChild(n, w); return; }
    bad = `it evaluates \`${n.getText().replace(/\s+/g, ' ').slice(0, 40)}\` before the step`;
  };
  w(x);
  return bad;
}

// the target a step writes: its root binding and, for a field, the field's name; null when it cannot be read back
function targetOf(checker, t) {
  t = unparen(t);
  if (ts.isIdentifier(t)) { const s = symbolOf(checker, t); return s ? { root: s, field: null } : null; }
  if (ts.isPropertyAccessExpression(t) && purePath(t)) {
    const base = checker.getTypeAtLocation(t.expression);
    if (!plainRecordType(checker, base) || t.name.text === 'length') return null;
    const r = rootOf(t), s = r && symbolOf(checker, r);
    return { root: s ?? null, field: t.name.text };
  }
  if (ts.isElementAccessExpression(t) && purePath(t.expression)) {
    const k = unparen(t.argumentExpression);
    if (!(purePath(k) || ts.isLiteralExpression(k))) return null;
    const bt = checker.getTypeAtLocation(t.expression);
    if (!checker.isArrayType(bt) && !(bt.getStringIndexType() && plainRecordType(checker, bt))) return null;
    const r = rootOf(t.expression), s = r && symbolOf(checker, r);
    return { root: s ?? null, field: null, key: k };
  }
  return null;
}

// where the hoisted text goes: before the statement, or, inside a declaration list, between the declarator that holds
// `e` and the ones before it (they run to the end first, so the list is split there and they are not "before")
function splitAt(stmt, e) {
  if (!ts.isVariableStatement(stmt)) return null;
  const ds = stmt.declarationList.declarations;
  const j = ds.findIndex((d) => e.pos >= d.pos && e.end <= d.end);
  return j > 0 ? { list: stmt.declarationList, j } : null;
}

// the edits: the text placed before the statement (or the split), and the replacement of `e`
function hoistEdits(sf, stmt, e, pre, value) {
  const ind = indentAt(sf, stmt.getStart(sf));
  const inList = stmt.parent && (ts.isBlock(stmt.parent) || ts.isSourceFile(stmt.parent) || ts.isCaseClause(stmt.parent) || ts.isDefaultClause(stmt.parent) || ts.isModuleBlock(stmt.parent));
  const lines = pre.split('\n');
  const split = inList && splitAt(stmt, e);
  if (split) {
    const { list, j } = split;
    const head = sf.text.slice(stmt.getStart(sf), list.declarations[0].getStart(sf)); // `const `, `export let `
    const from = list.declarations[j].getStart(sf);
    const restText = sf.text.slice(from, e.getStart(sf)) + value + sf.text.slice(e.end, stmt.end);
    return [{ start: list.declarations[j - 1].end, end: stmt.end, text: `;\n${lines.map((l) => ind + l).join('\n')}\n${ind}${head}${restText}` }];
  }
  const s0 = stmt.getStart(sf);
  const stmtText = sf.text.slice(s0, e.getStart(sf)) + value + sf.text.slice(e.end, stmt.end);
  if (inList) return [{ start: s0, end: stmt.end, text: `${lines.map((l, i) => (i ? ind + l : l)).join('\n')}\n${ind}${stmtText}` }];
  return [{ start: s0, end: stmt.end, text: `{\n${lines.map((l) => `${ind}  ${l}`).join('\n')}\n${ind}  ${stmtText}\n${ind}}` }];
}

function planStep(sf, checker, e) {
  // the logical idiom first: `T || (T = V)` is `T ||= V`, then hoisted
  let step = unparen(e), whole = step, stepText = null;
  {
    const p = up(step);
    if (ts.isBinaryExpression(step) && step.operatorToken.kind === K.EqualsToken && p && ts.isBinaryExpression(p) && LOGICAL.has(p.operatorToken.kind) && unparen(p.right) === step && purePath(step.left) && sameTree(p.left, step.left)) {
      whole = p; stepText = `${src(sf, step.left)} ${LOGICAL.get(p.operatorToken.kind)} ${src(sf, step.right)}`;
    }
  }
  const place = placeOf(outer(whole));
  if (place.why) return { list: place.why };
  const { stmt, conds } = place;
  if (conds.length) return planBranch(sf, checker, conds[conds.length - 1], stmt);
  if (!isStep(whole) && !stepText) return { list: 'not a step' };
  const target = ts.isBinaryExpression(step) ? step.left : step.operand;
  const tg = targetOf(checker, target);
  if (!tg) return { list: 'the target is not a name, a plain data field or an element of an array read by a pure key' };
  if (ts.isPostfixUnaryExpression(step) && !stepText) return { list: 'a postfix update used as a value gives the old value; it stays where it is' };
  const avoid = new Set([tg.root].filter(Boolean));
  for (const x of before(outer(whole), stmt)) { const why = inert(checker, x, avoid, tg.field); if (why) return { list: `the statement evaluates something before the step: ${why}` }; }
  const pre = logicalAsIf(sf, step, stepText) ?? `${stepText ?? src(sf, step)};`;
  return { edits: hoistEdits(sf, stmt, outer(whole), pre, src(sf, unparen(target))), guard: 'the step runs on every path of its statement, after inert operands only; its value is its target read back' };
}

// a logical assignment to a field, `T ??= V`, is the test and a plain write, `if (T === undefined || T === null) { T = V; }`
// (ECMA-262 13.15.2: T's base is evaluated once, which a pure path makes the same as twice; V only when the test
// passes); lean reads a field written by `=` and not by a logical assignment. A name keeps its logical assignment
function logicalAsIf(sf, step, stepText) {
  let t, op, v;
  if (stepText) { const p = up(step); t = step.left; op = LOGICAL.get(p.operatorToken.kind); v = step.right; }
  else if (ts.isBinaryExpression(step) && [K.BarBarEqualsToken, K.QuestionQuestionEqualsToken, K.AmpersandAmpersandEqualsToken].includes(step.operatorToken.kind)) { t = step.left; op = ts.tokenToString(step.operatorToken.kind); v = step.right; }
  else return null;
  if (ts.isIdentifier(unparen(t))) return null;
  const T = src(sf, t);
  const test = op === '??=' ? `${T} === undefined || ${T} === null` : op === '||=' ? `!${T}` : T;
  return `if (${test}) {\n  ${T} = ${src(sf, v)};\n}`;
}

// a conditional whose branch holds a step, made an if statement assigning a fresh local
function planBranch(sf, checker, q, stmt) {
  const qo = outer(q);
  const place = placeOf(qo);
  if (place.why || place.conds.length || place.stmt !== stmt) return { list: 'the conditional is itself under a branch' };
  const t = typeText(checker, checker.getTypeAtLocation(q), stmt);
  if (!t) return { list: 'the conditional\'s type cannot be written here' };
  for (const x of before(qo, stmt)) { const why = inert(checker, x, new Set(), null); if (why) return { list: `the statement evaluates something before the conditional: ${why}` }; }
  const v = freshName(sf, 'value');
  let body;
  if (ts.isConditionalExpression(q)) body = [`if (${src(sf, q.condition)}) {`, `  ${v} = ${src(sf, q.whenTrue)};`, '} else {', `  ${v} = ${src(sf, q.whenFalse)};`, '}'];
  else {
    if (!(checker.getTypeAtLocation(q.left).flags & ts.TypeFlags.BooleanLike) || q.operatorToken.kind === K.QuestionQuestionToken) return { list: 'a logical operator whose left side is not a boolean' };
    const and = q.operatorToken.kind === K.AmpersandAmpersandToken;
    body = [`if (${src(sf, q.left)}) {`, `  ${v} = ${and ? src(sf, q.right) : 'true'};`, '} else {', `  ${v} = ${and ? 'false' : src(sf, q.right)};`, '}'];
  }
  return { edits: hoistEdits(sf, stmt, qo, [`let ${v}: ${t};`, ...body].join('\n'), v), guard: 'the conditional runs on every path of its statement, after inert operands only; each branch assigns a fresh local' };
}

// an array method that changes its receiver, used as a value: the call becomes a statement, its value the receiver
// (sort, reverse, fill, copyWithin) or its length (push, unshift)
export function planReceiverCall(sf, checker, call) {
  if (!call || !ts.isCallExpression(call) || !ts.isPropertyAccessExpression(call.expression) || call.questionDotToken || call.expression.questionDotToken) return { list: 'not a method call' };
  const m = call.expression.name.text, r = unparen(call.expression.expression);
  if (!RETURNS_RECEIVER.has(m) && !RETURNS_LENGTH.has(m)) return { list: `${m} does not return its receiver or its length` };
  const rt = checker.getTypeAtLocation(r);
  if (!checker.isArrayType(rt) && !checker.isTupleType(rt)) return { list: 'the receiver is not typed as an array' };
  if (!purePath(r)) return { list: 'the receiver is not a name or a path of plain fields' };
  if (!ts.isIdentifier(r) && !plainRecordType(checker, checker.getTypeAtLocation(r.expression))) return { list: 'the receiver is a field of a value that is not a plain data record' };
  const top = outer(call);
  if (top.parent && ts.isExpressionStatement(top.parent)) return { list: 'the call is already a statement' };
  const place = placeOf(top);
  if (place.why) return { list: place.why };
  if (place.conds.length) return planBranch(sf, checker, place.conds[place.conds.length - 1], place.stmt);
  const root = rootOf(r), rs = root && symbolOf(checker, root);
  if (rs && call.arguments.some((a) => contains(a, (x) => ts.isIdentifier(x) && isWritten(x) && symbolOf(checker, x) === rs, true))) return { list: 'an argument writes the receiver\'s name' };
  const avoid = new Set([rs].filter(Boolean));
  for (const x of before(top, place.stmt)) { const why = inert(checker, x, avoid, ts.isIdentifier(r) ? null : r.name.text); if (why) return { list: `the statement evaluates something before the call: ${why}` }; }
  const value = RETURNS_RECEIVER.has(m) ? src(sf, r) : `${src(sf, r)}.length`;
  return { edits: hoistEdits(sf, place.stmt, top, `${src(sf, call)};`, value), guard: `${m} returns ${RETURNS_RECEIVER.has(m) ? 'its receiver' : 'its new length'}; the call runs on every path of its statement, after inert operands only` };
}

export default {
  name: 'hoist-update',
  rules: ['update-expression', 'assignment-expression', 'operator-value-context', 'in-place-mutation'],
  plan({ sf, checker, node }) {
    if (!node) return { list: 'no node at the finding' };
    const n = unparen(node);
    if (ts.isCallExpression(n)) return planReceiverCall(sf, checker, n);
    if (!isStep(n)) return { list: 'the finding is not on an assignment, an update or a method call' };
    return planStep(sf, checker, n);
  },
};
