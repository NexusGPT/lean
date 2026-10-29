// react imports and closure facts shared by the lint and translator
import { ts, isArrayLike, faithfulOp } from './common.mjs';
const K = ts.SyntaxKind;
export function reactHook(checker, n) {
  if (!ts.isCallExpression(n)) return null;
  const f = n.expression;
  const id = ts.isIdentifier(f) ? f : ts.isPropertyAccessExpression(f) && ts.isIdentifier(f.expression) ? f.expression : null;
  if (!id) return null;
  const d = checker.getSymbolAtLocation(id)?.declarations?.[0];
  let imp = d; while (imp && !ts.isImportDeclaration(imp)) imp = imp.parent;
  if (!imp || imp.moduleSpecifier.text !== 'react') return null;
  if (ts.isIdentifier(f) && ts.isImportSpecifier(d)) return (d.propertyName ?? d.name).text;
  if (ts.isPropertyAccessExpression(f) && (ts.isNamespaceImport(d) || ts.isImportClause(d))) return f.name.text;
  return null;
}
export function arrowOf(checker, n, seen = new Set()) {
  if (!n || seen.has(n)) return null;
  seen.add(n);
  if (ts.isParenthesizedExpression(n)) return arrowOf(checker, n.expression, seen);
  if (ts.isArrowFunction(n)) return n;
  if (reactHook(checker, n) === 'useCallback') return arrowOf(checker, n.arguments[0], seen);
  if (ts.isIdentifier(n)) {
    const d = checker.getSymbolAtLocation(n)?.valueDeclaration;
    if (d && ts.isVariableDeclaration(d) && (ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const)) return arrowOf(checker, d.initializer, seen);
  }
  return null;
}
export function closureReads(checker, cb) {
  const found = new Map();
  const walk = (n) => {
    if (ts.isTypeNode(n)) return;
    if (ts.isIdentifier(n)) {
      const p = n.parent;
      if ((ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n) || (ts.isBindingElement(p) && p.propertyName === n)) return;
      const s = checker.getSymbolAtLocation(n), d = s?.valueDeclaration ?? s?.declarations?.[0];
      if (d && d.getSourceFile() === cb.getSourceFile() && !(d.pos >= cb.pos && d.end <= cb.end)) {
        let local = false;
        for (let a = d.parent; a; a = a.parent) if (ts.isFunctionLike(a)) { local = true; break; }
        if (local && !found.has(s)) found.set(s, n);
      }
    }
    ts.forEachChild(n, walk);
  };
  walk(cb.body);
  return [...found.values()];
}
// a pure scalar expression has no calls, allocation, mutable globals or deferred evaluation
export function renderPure(checker, n) {
  if (!n) return false;
  if (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isNonNullExpression(n)) return renderPure(checker, n.expression);
  if (ts.isNumericLiteral(n) || ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || [K.TrueKeyword, K.FalseKeyword, K.NullKeyword].includes(n.kind)) return true;
  if (ts.isIdentifier(n)) {
    if (n.text === 'undefined') return true;
    const d = checker.getSymbolAtLocation(n)?.valueDeclaration;
    return !!d && (ts.isParameter(d) || ts.isVariableDeclaration(d) || ts.isBindingElement(d));
  }
  if (ts.isPropertyAccessExpression(n) && !n.questionDotToken) return renderPure(checker, n.expression);
  if (ts.isPrefixUnaryExpression(n)) return [K.MinusToken, K.ExclamationToken].includes(n.operator) && renderPure(checker, n.operand);
  if (ts.isBinaryExpression(n)) return [K.PlusToken, K.MinusToken, K.AsteriskToken, K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.LessThanToken, K.LessThanEqualsToken, K.GreaterThanToken, K.GreaterThanEqualsToken, K.AmpersandAmpersandToken, K.BarBarToken, K.QuestionQuestionToken].includes(n.operatorToken.kind) && renderPure(checker, n.left) && renderPure(checker, n.right);
  if (ts.isConditionalExpression(n)) return [n.condition, n.whenTrue, n.whenFalse].every((e) => renderPure(checker, e));
  if (faithfulOp(n)) return n.arguments.every((a) => renderPure(checker, a)); // an uninterpreted number operation of the faithful reading: the operator it stands for
  if (ts.isTemplateExpression(n)) return n.templateSpans.every((s) => renderPure(checker, s.expression));
  return false;
}
export function exactReactHook(checker, n) {
  const kind = reactHook(checker, n);
  if (!['useMemo', 'useCallback'].includes(kind) || ![1, 2].includes(n.arguments.length)) return null;
  const cb = arrowOf(checker, n.arguments[0]);
  if (!cb || cb.modifiers?.some((m) => m.kind === K.AsyncKeyword)) return null;
  const deps = n.arguments[1];
  if (deps && (!ts.isArrayLiteralExpression(deps) || !deps.elements.every((e) => renderPure(checker, e)))) return null;
  // covering a root also covers its properties; a property dependency covers that same read
  if (deps) {
    let covered = true;
    const depText = new Set(deps.elements.map((e) => e.getText().replace(/\s+/g, '')));
    for (const id of closureReads(checker, cb)) {
      const s = checker.getSymbolAtLocation(id);
      const walk = (e) => {
        if (ts.isTypeNode(e)) return;
        if (ts.isIdentifier(e) && checker.getSymbolAtLocation(e) === s) {
          let r = e;
          while (ts.isPropertyAccessExpression(r.parent) && r.parent.expression === r) r = r.parent;
          if (!depText.has(e.text) && !depText.has(r.getText().replace(/\s+/g, ''))) covered = false;
        }
        ts.forEachChild(e, walk);
      };
      walk(cb.body);
    }
    if (!covered) return null;
  }
  if (kind === 'useCallback') return { kind, cb, value: n.arguments[0] };
  const body = ts.isBlock(cb.body) && cb.body.statements.length === 1 && ts.isReturnStatement(cb.body.statements[0]) ? cb.body.statements[0].expression : cb.body;
  const t = body && checker.getTypeAtLocation(body);
  if (cb.parameters.length || !renderPure(checker, body) || !(t.flags & (ts.TypeFlags.NumberLike | ts.TypeFlags.StringLike | ts.TypeFlags.BooleanLike))) return null;
  return { kind, cb, value: body };
}

// ----- the capture table (design/handler-descriptors.md, "Capture kinds", 2026-10-28) -----
// A value a React closure captures is carried when it is one of three kinds, read alike by the lint (lint.mjs,
// reactCapture) and by lane B's interpreter (exec/handlers-interp.mjs): the descriptor reader (handlers.mjs) attaches the
// entry of each capture, so the two never decide apart.
//   hook-result: `const x = useH(...)` with H imported from outside React; the unit only calls its methods (`x.push(p)`,
//     a request to the outside named by the hook and the method), reads its fields, or lists it as a dependency.
//   record-read: a binding element of the props parameter, of a state value, or of a `const` destructuring of a pure
//     value, at any depth (`({ user: { id } })`), never written through.
//   ref-cell: `const r = useRef(...)` from React; the unit uses it only as `r.current`, as a `ref={r}` attribute or a
//     dependency, every write through it lies inside a function React holds (an effect, a callback, a JSX handler),
//     the closure's own writes included; a write during the render is no entry.
// Anything else is no entry: the lint's own changing-local check decides, and the interpreter does not read it.
const SLOT_EFFECTS = new Set(['useEffect', 'useLayoutEffect', 'useInsertionEffect', 'useCallback']);
const MUTATING = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'set', 'add', 'delete', 'clear', 'fill', 'copyWithin']);
const rootOf = (n) => { while (ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n) || ts.isParenthesizedExpression(n) || ts.isNonNullExpression(n) || ts.isAsExpression(n)) n = n.expression; return n; };
// every reference to a symbol inside a node, the declaring name excluded
function referencesOf(checker, node, sym) {
  const out = [];
  const walk = (n) => { if (ts.isIdentifier(n) && checker.getSymbolAtLocation(n) === sym && !(n.parent && (ts.isVariableDeclaration(n.parent) || ts.isBindingElement(n.parent) || ts.isParameter(n.parent)) && n.parent.name === n)) out.push(n); ts.forEachChild(n, walk); };
  if (node) walk(node);
  return out;
}
// the writes a node makes through a symbol: an assignment or update whose target is rooted at it, a `delete`, a
// mutating method on it or on a path from it; `direct` marks a mutating method called on the symbol itself (`x.push(p)`)
function writesThrough(checker, node, sym) {
  const out = [];
  const hits = (n) => { const r = rootOf(n); return ts.isIdentifier(r) && checker.getSymbolAtLocation(r) === sym; };
  const walk = (n) => {
    if (ts.isBinaryExpression(n) && n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && n.operatorToken.kind <= ts.SyntaxKind.LastAssignment && hits(n.left)) out.push({ node: n, direct: false });
    if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && [K.PlusPlusToken, K.MinusMinusToken].includes(n.operator) && hits(n.operand)) out.push({ node: n, direct: false });
    if (ts.isDeleteExpression(n) && hits(n.expression)) out.push({ node: n, direct: false });
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && MUTATING.has(n.expression.name.text) && hits(n.expression.expression)) {
      const recv = n.expression.expression;
      out.push({ node: n, direct: ts.isIdentifier(recv) && checker.getSymbolAtLocation(recv) === sym });
    }
    ts.forEachChild(n, walk);
  };
  if (node) walk(node);
  return out;
}
// a dependency list element of a React hook call (`useEffect(f, [x])`)
const isDependency = (checker, ref) => ts.isArrayLiteralExpression(ref.parent) && ts.isCallExpression(ref.parent.parent) && ref.parent.parent.arguments[1] === ref.parent && !!reactHook(checker, ref.parent.parent);
// whether a function React holds runs this node later than the render: an ancestor function of the node is a JSX
// attribute value, the first argument of an effect or of useCallback, or a `const` function every reference of which
// is held so (or lies in such a function); useMemo and a synchronous callback run during the render and hold nothing
export function deferredByReact(checker, node, unitBody, seen = new Set()) {
  for (let p = node.parent; p && p !== unitBody; p = p.parent) {
    if (!ts.isFunctionLike(p)) continue;
    if (heldByReact(checker, p, unitBody, seen)) return true;
  }
  return false;
}
// whether a function value itself is held by React (a JSX attribute value, an effect or useCallback argument, a const
// held so), not merely nested inside one
export const heldFunction = (checker, fn, unitBody) => !!unitBody && heldByReact(checker, fn, unitBody, new Set());
function heldByReact(checker, fn, unitBody, seen) {
  if (seen.has(fn)) return false;
  seen.add(fn);
  const at = (e) => { let x = e; while (x.parent && ts.isParenthesizedExpression(x.parent)) x = x.parent; const p = x.parent; return (ts.isJsxExpression(p) && ts.isJsxAttribute(p.parent)) || (ts.isCallExpression(p) && p.arguments[0] === x && SLOT_EFFECTS.has(reactHook(checker, p))); };
  if (at(fn)) return true;
  const d = fn.parent;
  if (ts.isVariableDeclaration(d) && d.initializer === fn && ts.isIdentifier(d.name) && (ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const)) {
    const refs = referencesOf(checker, unitBody, checker.getSymbolAtLocation(d.name));
    return refs.length > 0 && refs.every((r) => at(r) || isDependency(checker, r) || deferredByReact(checker, r, unitBody, seen));
  }
  return false;
}
// the props parameter's or a state value's binding element, or one of a const destructuring of a pure value
function recordBinding(checker, d, unitBody) {
  let top = d, p = d;
  while (p && ts.isBindingElement(p)) { if (p.dotDotDotToken) return false; top = p; p = p.parent.parent; }
  if (!p || p === d) return false;
  if (ts.isParameter(p)) return p.parent === unitBody.parent && p.parent.parameters[0] === p; // the props parameter of the unit
  if (!ts.isVariableDeclaration(p) || !(ts.getCombinedNodeFlags(p) & ts.NodeFlags.Const) || !p.initializer) return false;
  if (ts.isCallExpression(p.initializer) && reactHook(checker, p.initializer) === 'useState') return ts.isArrayBindingPattern(p.name) && p.name.elements[0] === top; // the state value, never the setter
  return renderPure(checker, p.initializer);
}
// a useRef cell of the unit: used only as `r.current`, a `ref` attribute or a dependency, every write through it inside
// a function React holds (the closure's own writes included); a write during the render, or in useMemo, is no entry
function refCell(checker, d, refs, writes, unitBody) {
  const used = refs.every((r) => isDependency(checker, r) || (ts.isPropertyAccessExpression(r.parent) && r.parent.expression === r && r.parent.name.text === 'current' && !r.parent.questionDotToken) || (ts.isJsxExpression(r.parent) && ts.isJsxAttribute(r.parent.parent) && r.parent.parent.name.getText() === 'ref'));
  if (!used || writes.some((w) => !deferredByReact(checker, w.node, unitBody))) return null;
  const calls = []; const walk = (n) => { if (reactHook(checker, n) === 'useRef') calls.push(n); ts.forEachChild(n, walk); }; walk(unitBody);
  return { kind: 'ref-cell', at: calls.indexOf(d.initializer) };
}
// the write `r.current = v` is a cell step of the component machine (no re-render) when `r` is a ref cell of the unit
// and the write lies inside a function React holds: the lint admits it there, lane B's interpreter steps it
export function cellWrite(checker, target, unitBody) {
  if (!unitBody || !ts.isPropertyAccessExpression(target) || target.questionDotToken || target.name.text !== 'current' || !ts.isIdentifier(target.expression)) return null;
  const sym = checker.getSymbolAtLocation(target.expression), d = sym?.valueDeclaration;
  if (!d || !ts.isVariableDeclaration(d) || !ts.isIdentifier(d.name) || !(ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const) || !d.initializer || !ts.isCallExpression(d.initializer) || reactHook(checker, d.initializer) !== 'useRef') return null;
  if (!(d.pos >= unitBody.pos && d.end <= unitBody.end) || !deferredByReact(checker, target, unitBody)) return null;
  // the translator reads a held function holding the write as its steps, the write a cell step (a JSX handler, an effect,
  // a useCallback argument alike: translate.mjs cellWriter), or, when its statements are not read, as one function value
  // keyed by its text and captures (design/ref-cell.md)
  return refCell(checker, d, referencesOf(checker, unitBody, sym), writesThrough(checker, unitBody, sym), unitBody);
}
// captureKind(checker, id, cb, unitBody) -> null | { kind: 'hook-result', hook, at } | { kind: 'record-read' } | { kind: 'ref-cell', at }
export function captureKind(checker, id, cb, unitBody) {
  const sym = checker.getSymbolAtLocation(id), d = sym?.valueDeclaration;
  if (!d || !unitBody || d.pos > cb.pos) return null;
  const refs = referencesOf(checker, unitBody, sym), writes = writesThrough(checker, unitBody, sym);
  const constCall = ts.isVariableDeclaration(d) && ts.isIdentifier(d.name) && (ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const) && d.initializer && ts.isCallExpression(d.initializer) ? d.initializer : null;
  if (constCall && ts.isIdentifier(constCall.expression) && /^use[A-Z0-9]/.test(constCall.expression.text) && !reactHook(checker, constCall)) {
    const hd = checker.getSymbolAtLocation(constCall.expression)?.declarations?.[0];
    let imp = hd; while (imp && !ts.isImportDeclaration(imp)) imp = imp.parent;
    if (!imp || !ts.isImportSpecifier(hd)) return null;
    // a method call, a field read that writes nothing, a dependency; never a value handed on, never written through
    const used = refs.every((r) => isDependency(checker, r) || (ts.isPropertyAccessExpression(r.parent) && r.parent.expression === r && !r.parent.questionDotToken));
    if (!used || writes.some((w) => !w.direct)) return null;
    // a value the translator reads as data (an array, a Map or Set and their kin) is updated in place by these methods:
    // a closure keyed by that value would miss a later update, so such a result is no request handle
    const t = checker.getTypeAtLocation(d.name), tn = (t.aliasSymbol ?? t.symbol)?.name;
    if (writes.length && (isArrayLike(checker, t) || ['Map', 'Set', 'WeakMap', 'WeakSet', 'URLSearchParams', 'Headers', 'FormData'].includes(tn))) return null;
    const hookSym = checker.getSymbolAtLocation(constCall.expression);
    const calls = []; const walk = (n) => { if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && checker.getSymbolAtLocation(n.expression) === hookSym) calls.push(n); ts.forEachChild(n, walk); }; walk(unitBody);
    return { kind: 'hook-result', hook: `import:${imp.moduleSpecifier.text}:${(hd.propertyName ?? hd.name).text}`, at: calls.indexOf(constCall) };
  }
  if (constCall && reactHook(checker, constCall) === 'useRef') return refCell(checker, d, refs, writes, unitBody);
  if (ts.isBindingElement(d) && ts.isIdentifier(d.name) && recordBinding(checker, d, unitBody) && !writes.length) return { kind: 'record-read' };
  return null;
}
