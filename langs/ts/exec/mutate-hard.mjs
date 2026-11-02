// The hard kinds of planted change (lane w8q, DA-Bench's hard set): edits a reader of the diff sees as plausible and an
// execution separates, each from a shape real later fixes repair (the escapes' repairs, lane w8l's
// bench/escape_shapes.md). exec/mutate.mjs lists them only when asked (sitesOf / mutate with `hard: true`, the CLI's
// --hard), after every site of its own kinds, so its own sites and indices are unchanged with or without them.
//   callback-effect     a call statement inside a callback (a function passed as an argument) is removed
//   effect-after-exit   a call statement after an early exit (an if without else whose branch returns, throws, breaks
//                       or continues) in the same block is removed
//   dropped-cleanup     a call or write statement inside a catch or a finally block is removed (the throw path's work)
//   deep-boundary       < <= > >= flipped (< <-> <=, > <-> >=) at least DEEP_LINES lines below the unit's first line, in
//                       a unit of at least LONG_LINES lines, outside a loop's condition
//   loop-bound          the < <= > >= of a loop's condition flipped, where the loop writes state declared outside it
//                       (an assignment, ++/--, or a method call on an outer name: the off-by-one with accumulated state)
//   option-variant      a string literal passed to a call (an argument, or a property of an object literal argument)
//                       whose expected type is a union of string literals becomes the next member of that union
//   numeric-conversion  Number(x) <-> parseFloat(x), parseInt(x, r) -> Number(x), Math.floor/ceil/round <-> trunc,
//                       isNaN/isFinite <-> Number.isNaN/isFinite, `a || <number>` -> `a ?? <number>`: equal on plain
//                       inputs, apart on NaN, -0, '', '1e3', negatives and junk
//   changed-default     the literal default of a parameter (the unit's or a nested function's) or of a destructured
//                       binding: number n -> n + 1, true <-> false, string s -> s + "x"
//   swapped-effects     two adjacent effect statements (call, await, write) of one block that name a common identifier
//                       are swapped
// Every site is {kind, start, end, text, was, lines}: `was` is the file's text in [start, end), the mutant is
// text.slice(0, start) + text + text.slice(end), `lines` the first and last line of [start, end) (1-based, by \n).
// LEAN_BREAK=hard-kind:<kind> (comma-separated with others) lists no site of that kind: the fixture test's red check.
import { ts } from '../common.mjs';

const K = ts.SyntaxKind;
export const HARD_KINDS = ['callback-effect', 'effect-after-exit', 'dropped-cleanup', 'deep-boundary', 'loop-bound', 'option-variant', 'numeric-conversion', 'changed-default', 'swapped-effects'];
export const DEEP_LINES = 15, LONG_LINES = 25;
const REL = { [K.LessThanToken]: '<=', [K.LessThanEqualsToken]: '<', [K.GreaterThanToken]: '>=', [K.GreaterThanEqualsToken]: '>' };
const isAssign = (k) => k === K.EqualsToken || (k >= K.FirstCompoundAssignment && k <= K.LastCompoundAssignment);
const isFn = (n) => ts.isFunctionLike(n) && !ts.isTypeNode(n);
const isLoop = (n) => ts.isForStatement(n) || ts.isWhileStatement(n) || ts.isDoStatement(n) || ts.isForOfStatement(n) || ts.isForInStatement(n);
const broken = () => new Set(String(process.env.LEAN_BREAK ?? '').split(',').map((x) => x.trim()).filter((x) => x.startsWith('hard-kind:')).map((x) => x.slice('hard-kind:'.length)));

// an expression statement that is an effect: a call, an await, an assignment, ++ or --
function effectOf(n) {
  if (!ts.isExpressionStatement(n)) return null;
  const e = ts.skipParentheses(n.expression);
  if (ts.isCallExpression(e) || ts.isAwaitExpression(e)) return 'call';
  if (ts.isBinaryExpression(e) && isAssign(e.operatorToken.kind)) return 'write';
  if ((ts.isPrefixUnaryExpression(e) || ts.isPostfixUnaryExpression(e)) && (e.operator === K.PlusPlusToken || e.operator === K.MinusMinusToken)) return 'write';
  return null;
}
// a statement in a statement list can go; the whole body of an if or a loop becomes an empty statement
const inList = (n) => ts.isBlock(n.parent) || ts.isSourceFile(n.parent) || ts.isCaseClause(n.parent) || ts.isDefaultClause(n.parent) || ts.isModuleBlock(n.parent);
const exits = (s) => !!s && (ts.isReturnStatement(s) || ts.isThrowStatement(s) || ts.isBreakStatement(s) || ts.isContinueStatement(s) || (ts.isBlock(s) && s.statements.length > 0 && exits(s.statements[s.statements.length - 1])));
const earlyExit = (s) => ts.isIfStatement(s) && !s.elseStatement && exits(s.thenStatement);
// the names an expression reads or writes: identifiers outside property names, and `this`
function namesOf(n, out = new Set()) {
  const go = (x) => {
    if (ts.isIdentifier(x)) { if (!(ts.isPropertyAccessExpression(x.parent) && x.parent.name === x) && !(ts.isPropertyAssignment(x.parent) && x.parent.name === x)) out.add(x.text); return; }
    if (x.kind === K.ThisKeyword) { out.add('this'); return; }
    if (ts.isTypeNode(x)) return;
    ts.forEachChild(x, go);
  };
  go(n);
  return out;
}
// the identifiers a loop writes, or calls a method on, that are declared outside it (its own header's bindings aside)
function writesOuter(loop, sf) {
  const own = new Set();
  const bind = (name) => { if (ts.isIdentifier(name)) own.add(name.text); else for (const e of name.elements ?? []) if (!ts.isOmittedExpression(e)) bind(e.name); };
  const decl = (x) => { if (ts.isVariableDeclaration(x) || ts.isParameter(x) || ts.isBindingElement(x)) bind(x.name); ts.forEachChild(x, decl); };
  decl(loop);
  const root = (e) => { e = ts.skipParentheses(e); while (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e) || ts.isNonNullExpression(e)) e = ts.skipParentheses(e.expression); return ts.isIdentifier(e) ? e.text : e.kind === K.ThisKeyword ? 'this' : null; };
  let found = false;
  const go = (x) => {
    if (found || ts.isTypeNode(x)) return;
    let r = null;
    if (ts.isBinaryExpression(x) && isAssign(x.operatorToken.kind)) r = root(x.left);
    else if ((ts.isPrefixUnaryExpression(x) || ts.isPostfixUnaryExpression(x)) && (x.operator === K.PlusPlusToken || x.operator === K.MinusMinusToken)) r = root(x.operand);
    else if (ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression)) r = root(x.expression.expression);
    if (r && !own.has(r)) { found = true; return; }
    ts.forEachChild(x, go);
  };
  go(loop.statement);
  if (!found && ts.isForStatement(loop) && loop.incrementor) go(loop.incrementor);
  return found;
}
// the string-literal members of a union type, in the checker's order; null when the type is not such a union
function literalUnion(t) {
  if (!t || !t.isUnion()) return null;
  const ms = t.types.filter((m) => m.flags & ts.TypeFlags.StringLiteral).map((m) => m.value);
  return ms.length >= 2 ? ms : null;
}
const callName = (c) => {
  const e = c.expression;
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && ts.isIdentifier(e.name)) return `${e.expression.text}.${e.name.text}`;
  return null;
};
// numeric-conversion: callee name -> replacement callee (the call's own arguments kept), or a function of the call
const CONVERT = { 'Number': 'parseFloat', 'parseFloat': 'Number', 'Number.parseFloat': 'Number', 'Math.floor': 'Math.trunc', 'Math.trunc': 'Math.floor', 'Math.round': 'Math.trunc', 'Math.ceil': 'Math.trunc', 'isNaN': 'Number.isNaN', 'Number.isNaN': 'isNaN', 'isFinite': 'Number.isFinite', 'Number.isFinite': 'isFinite' };
const PARSE_INT = new Set(['parseInt', 'Number.parseInt']);

export function hardSites(sf, checker, u) {
  const text = sf.text;
  const off = broken();
  const out = [];
  const put = (kind, start, end, rep) => { if (!off.has(kind)) out.push({ kind, start, end, text: rep, was: text.slice(start, end) }); };
  const lineOf = (pos) => sf.getLineAndCharacterOfPosition(pos).line + 1;
  const first = lineOf(u.node.getStart(sf)), long = lineOf(u.node.getEnd()) - first + 1 >= LONG_LINES;
  const inType = (n) => { for (let p = n.parent; p; p = p.parent) { if (ts.isTypeNode(p) || ts.isDecorator(p) || ts.isEnumMember(p)) return true; if (ts.isStatement(p) || ts.isFunctionLike(p)) return false; } return false; };
  // the enclosing function of a node inside the unit, and the catch or finally block it sits in (within that function)
  const enclosingFn = (n) => { for (let p = n.parent; p; p = p.parent) if (isFn(p)) return p; return null; };
  const onThrowPath = (n) => { for (let p = n.parent; p && !isFn(p); p = p.parent) { if (ts.isCatchClause(p)) return true; if (ts.isBlock(p) && ts.isTryStatement(p.parent) && p.parent.finallyBlock === p) return true; } return false; };
  const loopConds = new Set();
  const defaultOf = (init) => {
    if (!init) return;
    if (ts.isNumericLiteral(init)) put('changed-default', init.getStart(sf), init.getEnd(), String(Number(init.text) + 1));
    else if (init.kind === K.TrueKeyword || init.kind === K.FalseKeyword) put('changed-default', init.getStart(sf), init.getEnd(), init.kind === K.TrueKeyword ? 'false' : 'true');
    else if (ts.isStringLiteral(init)) put('changed-default', init.getStart(sf), init.getEnd(), JSON.stringify(init.text + 'x'));
    else if (ts.isPrefixUnaryExpression(init) && init.operator === K.MinusToken && ts.isNumericLiteral(init.operand)) put('changed-default', init.operand.getStart(sf), init.operand.getEnd(), String(Number(init.operand.text) + 1));
  };
  for (const p of u.params ?? []) { defaultOf(p.initializer); ts.forEachChild(p.name, function bind(x) { if (ts.isBindingElement(x)) defaultOf(x.initializer); ts.forEachChild(x, bind); }); }
  const walk = (n) => {
    if (ts.isTypeNode(n) || ts.isDecorator(n)) return;
    const eff = effectOf(n);
    if (eff) {
      const rm = inList(n) ? '' : ';';
      const f = enclosingFn(n);
      if (eff === 'call' && f && f !== u.fn && (ts.isArrowFunction(f) || ts.isFunctionExpression(f)) && f.parent && (ts.isCallExpression(f.parent) || ts.isNewExpression(f.parent)) && f.parent.arguments?.includes(f)) put('callback-effect', n.getStart(sf), n.getEnd(), rm);
      if (eff === 'call' && inList(n)) { const ss = n.parent.statements, i = ss.indexOf(n); if (ss.slice(0, i).some(earlyExit)) put('effect-after-exit', n.getStart(sf), n.getEnd(), rm); }
      if (onThrowPath(n)) put('dropped-cleanup', n.getStart(sf), n.getEnd(), rm);
    }
    if (isLoop(n) && !ts.isForOfStatement(n) && !ts.isForInStatement(n)) {
      const c = n.condition ?? n.expression;
      if (c && ts.isBinaryExpression(c) && REL[c.operatorToken.kind]) { loopConds.add(c); if (writesOuter(n, sf)) put('loop-bound', c.operatorToken.getStart(sf), c.operatorToken.getEnd(), REL[c.operatorToken.kind]); }
    }
    if (ts.isBinaryExpression(n) && REL[n.operatorToken.kind] && !loopConds.has(n) && long && !inType(n) && lineOf(n.operatorToken.getStart(sf)) - first >= DEEP_LINES) put('deep-boundary', n.operatorToken.getStart(sf), n.operatorToken.getEnd(), REL[n.operatorToken.kind]);
    if ((ts.isCallExpression(n) || ts.isNewExpression(n)) && n.arguments) {
      const variant = (e) => {
        if (!ts.isStringLiteral(e) || inType(e)) return;
        const ms = literalUnion(checker.getContextualType(e));
        if (!ms || !ms.includes(e.text)) return;
        put('option-variant', e.getStart(sf), e.getEnd(), JSON.stringify(ms[(ms.indexOf(e.text) + 1) % ms.length]));
      };
      for (const e of n.arguments) {
        variant(e);
        if (ts.isObjectLiteralExpression(e)) for (const p of e.properties) if (ts.isPropertyAssignment(p)) variant(p.initializer);
      }
    }
    if (ts.isCallExpression(n)) {
      const name = callName(n);
      if (name && CONVERT[name] && n.arguments.length === 1) put('numeric-conversion', n.expression.getStart(sf), n.expression.getEnd(), CONVERT[name]);
      else if (name && PARSE_INT.has(name) && n.arguments.length >= 1 && !ts.isSpreadElement(n.arguments[0])) put('numeric-conversion', n.getStart(sf), n.getEnd(), `Number(${n.arguments[0].getText(sf)})`);
    }
    if (ts.isBinaryExpression(n) && n.operatorToken.kind === K.BarBarToken) {
      const r = ts.skipParentheses(n.right);
      if (ts.isNumericLiteral(r) || (ts.isPrefixUnaryExpression(r) && r.operator === K.MinusToken && ts.isNumericLiteral(r.operand))) put('numeric-conversion', n.operatorToken.getStart(sf), n.operatorToken.getEnd(), '??');
    }
    if ((ts.isParameter(n) || ts.isBindingElement(n)) && n.initializer) defaultOf(n.initializer);
    if (ts.isBlock(n) || ts.isCaseClause(n) || ts.isDefaultClause(n)) {
      const ss = n.statements;
      for (let i = 0; i + 1 < ss.length; i++) {
        const a = ss[i], b = ss[i + 1];
        if (!effectOf(a) || !effectOf(b)) continue;
        const ta = a.getText(sf), tb = b.getText(sf);
        if (ta === tb) continue;
        const na = namesOf(a.expression), nb = namesOf(b.expression);
        if (![...na].some((x) => nb.has(x))) continue;
        const s = a.getStart(sf), e = b.getEnd();
        put('swapped-effects', s, e, tb + text.slice(a.getEnd(), b.getStart(sf)) + ta);
      }
    }
    ts.forEachChild(n, walk);
  };
  walk(u.body);
  out.sort((a, b) => a.start - b.start || a.end - b.end || HARD_KINDS.indexOf(a.kind) - HARD_KINDS.indexOf(b.kind));
  for (const s of out) s.lines = [lineOf(s.start), lineOf(s.end)];
  return out;
}
