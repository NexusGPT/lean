// promise shapes shared by the gate and the reader
import { ts, originOf } from './common.mjs';
const K = ts.SyntaxKind;
export const unparen = (n) => { while (ts.isParenthesizedExpression(n)) n = n.expression; return n; };
export const isNativePromise = (t, checker) => !!t.symbol && t.symbol === checker.resolveName('Promise', undefined, ts.SymbolFlags.Type, false);
export function promiseForm(n, checker, sf) {
  n = unparen(n);
  const globalPromise = (x) => ts.isIdentifier(x) && x.text === 'Promise' && originOf(checker, x, sf, null).kind === 'global';
  if (ts.isNewExpression(n) && globalPromise(n.expression)) return { kind: 'executor', node: n };
  if (!ts.isCallExpression(n) || !ts.isPropertyAccessExpression(n.expression)) return null;
  const f = n.expression, name = f.name.text;
  if (globalPromise(f.expression) && ['resolve', 'reject', 'race', 'allSettled', 'any'].includes(name)) return { kind: name, node: n };
  if (['then', 'catch', 'finally'].includes(name) && isNativePromise(checker.getTypeAtLocation(f.expression), checker)) return { kind: name, node: n, source: f.expression, handler: n.arguments[0] };
  return null;
}
export function promiseConsumed(n, checker, sf) {
  for (let a = n.parent; a; a = a.parent) if (ts.isIterationStatement(a, false)) return false;
  let p = n.parent;
  while (p && ts.isParenthesizedExpression(p)) { n = p; p = p.parent; }
  if (p && ts.isPropertyAccessExpression(p) && p.expression === n && p.parent && promiseForm(p.parent, checker, sf)?.source === n) return promiseConsumed(p.parent, checker, sf);
  if (p && ts.isAwaitExpression(p)) {
    let a = p; while (a.parent && ts.isParenthesizedExpression(a.parent)) a = a.parent;
    return !!a.parent && (ts.isReturnStatement(a.parent) || ts.isExpressionStatement(a.parent) || ts.isVariableDeclaration(a.parent) || (ts.isArrowFunction(a.parent) && a.parent.body === a));
  }
  if (p && (ts.isReturnStatement(p) || (ts.isArrowFunction(p) && p.body === n))) {
    while (p && !ts.isFunctionLike(p)) p = p.parent;
    return !!p?.modifiers?.some((m) => m.kind === K.AsyncKeyword) || !!(p && ts.isArrowFunction(p) && p.parent && promiseForm(p.parent, checker, sf)?.handler === p);
  }
  return false;
}
// settlement is terminal in this reading: no effects after the first resolution are discarded
export function executorShape(n, checker, sf) {
  const cb = n.arguments?.[0];
  const bad = (rule, message) => ({ rule, message });
  if (n.arguments?.length !== 1 || !ts.isArrowFunction(cb) || cb.modifiers?.some((m) => m.kind === K.AsyncKeyword) || cb.parameters.length < 1 || cb.parameters.length > 2 || cb.parameters.some((p) => !ts.isIdentifier(p.name) || p.initializer || p.dotDotDotToken || p.questionToken)) return bad('promise-executor', 'use a synchronous arrow executor with plain resolve and reject parameters');
  const symbols = cb.parameters.map((p) => checker.getSymbolAtLocation(p.name));
  const settlement = (e) => {
    e = unparen(e);
    if (!ts.isCallExpression(e) || !ts.isIdentifier(e.expression)) return null;
    const i = symbols.indexOf(checker.getSymbolAtLocation(e.expression));
    return i < 0 ? null : { kind: i === 0 ? 'resolve' : 'reject', call: e };
  };
  let escaped = false, nested = false, misplaced = false;
  const scan = (x, depth = 0) => {
    if (ts.isIdentifier(x) && symbols.includes(checker.getSymbolAtLocation(x)) && !cb.parameters.some((p) => p.name === x)) {
      if (!(ts.isCallExpression(x.parent) && x.parent.expression === x && x.parent.arguments.length <= 1)) escaped = true;
      if (depth) nested = true;
      if (ts.isCallExpression(x.parent) && x.parent.expression === x) {
        let use = x.parent; while (use.parent && ts.isParenthesizedExpression(use.parent)) use = use.parent;
        const p = use.parent;
        if (!(p && (ts.isExpressionStatement(p) || ts.isReturnStatement(p) || (ts.isArrowFunction(p) && p.body === use)))) misplaced = true;
      }
    }
    ts.forEachChild(x, (y) => scan(y, depth + (ts.isFunctionLike(y) ? 1 : 0)));
  };
  scan(cb.body);
  if (misplaced) return bad('promise-executor', 'settlement must be a terminal statement, not part of another expression');
  if (escaped) return bad('promise-executor-escape', 'resolve and reject cannot be stored or passed away; call them at the end of each executor path');
  const flow = (list) => {
    if (!list.length) return false;
    const [s, ...rest] = list;
    if (ts.isBlock(s)) return flow([...s.statements, ...rest]);
    if (ts.isThrowStatement(s)) return rest.length === 0;
    if (ts.isExpressionStatement(s) && settlement(s.expression)) return rest.length === 0;
    if (ts.isReturnStatement(s)) return !!s.expression && !!settlement(s.expression) && rest.length === 0;
    if (ts.isIfStatement(s)) return flow([s.thenStatement, ...rest]) && flow([...(s.elseStatement ? [s.elseStatement] : []), ...rest]);
    if (ts.isVariableStatement(s) || ts.isExpressionStatement(s) || ts.isEmptyStatement(s)) return flow(rest);
    return false;
  };
  let bridge = null;
  if (nested) {
    const body = ts.isBlock(cb.body) ? [...cb.body.statements] : [{ kind: K.ExpressionStatement, expression: cb.body }];
    const st = body[0]; const e = st && ts.isExpressionStatement(st) ? unparen(st.expression) : null;
    const arrows = e && ts.isCallExpression(e) ? e.arguments.filter(ts.isArrowFunction) : [];
    if (body.length === 1 && arrows.length === 1 && !arrows[0].modifiers?.some((m) => m.kind === K.AsyncKeyword)) {
      const a = arrows[0];
      if (ts.isBlock(a.body) ? flow([...a.body.statements]) : !!settlement(a.body)) bridge = e;
    }
    if (!bridge) return bad('promise-executor-escape', 'a deferred resolver needs a single outside callback bridge; stored resolvers are not read');
  } else if (!(ts.isBlock(cb.body) ? flow([...cb.body.statements]) : !!settlement(cb.body))) return bad('promise-unsettled', 'every executor path must end with resolve, reject or throw, with no statements after settlement');
  return { cb, settlement, bridge };
}
