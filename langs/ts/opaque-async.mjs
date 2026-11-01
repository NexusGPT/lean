// The opacity ladder for async, promises and generators (lane w1d, design/w1d-opaque-async.md).
//
// A construct of one of these rules has no exact reading. It is not refused: the construct itself, the expression the
// lint's finding names, becomes one opaque step (translate.mjs opaqueExpression through translate/opaque.mjs
// opaqueForm), an uninterpreted transition of the world keyed by the construct's tokens and the texts of the same-file
// functions it reaches, reading the locals it mentions and writing every reference it may change together with every
// name that may share one with it (stepWrites). The step's value is its result. In an async unit, or inside an exact
// try, the statement holding a step is followed by the fault check an await gets: a rejection inside the step is the
// world's fault, routed as the existing try channel routes it. The order of two steps is the order of their
// transitions, so two awaited steps swapped are two different worlds (subset.md "Modelling axioms").
//
// Why this is sound: the step is the effect axiom `effect(world, op, args) = (world', result)` applied to a piece of the
// program, `op` its text and the texts it calls, `args` its reads. Work a step leaves pending (an unawaited call, a
// stored `.then`, an async callback map does not wait for) runs later, at the transitions that follow; it is part of
// the world the step returns, and each later transition may run it, which an uninterpreted transition allows. That holds
// only while the pending work acts on the world alone: it must change no binding and no object of the unit, and read
// none the unit changes later (pendingWork). Locality (amendment A4): a rule is opaque only where what it refuses
// happens while the construct is evaluated or in the world after it; a finding that names a value (a callback, a held
// promise, a thenable, a generator function used as a value) refuses what happens where the value is used, outside the
// finding's text, and keeps its refusal.
import { ts } from './common.mjs';
import { isReference } from './translate/opaque.mjs';
import { broken } from './tests/break.mjs'; // the one --break convention (amendment A6)

const K = ts.SyntaxKind;


// the column, per rule: `expression` (the construct the finding names is an opaque step) or `none` (the refusal stands)
export const ASYNC_OPAQUE = Object.freeze({
  'async': { form: 'expression' },
  'promise': { form: 'expression' },
  'promise-pending': { form: 'expression' },
  'promise-unsettled': { form: 'expression' },
  'promise-executor': { form: 'expression' },
  'promise-executor-escape': { form: 'expression' },
  'promise-handler': { form: 'expression' },
  'promise-thenable': { form: 'none', why: 'the finding names the value a promise adopts; the adoption (its `then` run by the settlement) happens outside the value\'s text (locality, design/w1d-opaque-async.md)' },
  'async-callback': { form: 'expression' },
  'async-predicate': { form: 'expression' },
  'async-reduce': { form: 'expression' },
  'promise-all-order': { form: 'none', why: 'the finding names the callback; its unordered work runs inside Promise.all, outside the callback\'s text (locality, design/w1d-opaque-async.md)' },
  // a generator's own body is read as the sequence it yields: a step inside it would hide a yield
  'generator': { form: 'none', why: 'a nested generator declaration is hoisted and suspends: no step holds its yields' },
  'generator-effect': { form: 'none', why: 'the body of a sequence generator is its yields; a step inside it would hide them' },
  'generator-bound': { form: 'none', why: 'a generator with an unbounded loop has no measure; an opaque reading would hide the missing measure (by design, ASK)' },
  'generator-use': { form: 'expression' },
});

export const asyncOpaqueRule = (rule) => ASYNC_OPAQUE[rule]?.form === 'expression';
export const siteKey = (n) => `${n.pos}:${n.end}`;
const inside = (d, n) => { for (let p = d; p; p = p.parent) if (p === n) return true; return false; };
const unparen = (e) => { while (e && (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e) || ts.isSatisfiesExpression?.(e))) e = e.expression; return e; };
const declOf = (checker, id) => {
  let s = null;
  try { s = id.parent && ts.isShorthandPropertyAssignment(id.parent) && id.parent.name === id ? checker.getShorthandAssignmentValueSymbol(id.parent) : checker.getSymbolAtLocation(id); } catch { s = null; }
  return s?.valueDeclaration ?? s?.declarations?.[0] ?? null;
};
// a binding of the unit `fn`: a parameter or a local of fn's own code (a declaration inside fn, not inside a function nested in it)
const bindingOfUnit = (d, fn) => {
  if (!d || d === fn || !inside(d, fn) || !(ts.isParameter(d) || ts.isVariableDeclaration(d) || ts.isBindingElement(d))) return false;
  for (let p = d.parent; p && p !== fn; p = p.parent) if (ts.isFunctionLike(p) || ts.isClassLike(p)) return false;
  return true;
};
const nameOf = (d) => (ts.isIdentifier(d.name) ? d.name.text : null);
const typeOfDecl = (checker, d) => { try { return checker.getTypeAtLocation(d.name ?? d); } catch { return null; } };

const ASSIGN = (k) => k >= K.FirstAssignment && k <= K.LastAssignment;
const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'set', 'add', 'delete', 'clear', 'fill', 'copyWithin']);
const rootName = (e) => { while (e && (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e) || ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e))) e = e.expression; return e && ts.isIdentifier(e) ? e : null; };
// every place `node` writes: { id, heap } with id the root identifier (null for `this` or a computed root) and heap true
// when it writes into an object (a field, an element, a mutator method, a delete) rather than rebinding a name
function writtenRoots(node) {
  const out = [];
  const target = (e, heap) => {
    if (!e) return;
    if (ts.isParenthesizedExpression(e)) return target(e.expression, heap);
    if (ts.isArrayLiteralExpression(e)) { for (const x of e.elements) target(ts.isSpreadElement(x) ? x.expression : x, heap); return; }
    if (ts.isObjectLiteralExpression(e)) { for (const p of e.properties) { if (ts.isPropertyAssignment(p)) target(p.initializer, heap); else if (ts.isShorthandPropertyAssignment(p)) out.push({ id: p.name, heap }); else if (ts.isSpreadAssignment(p)) target(p.expression, heap); } return; }
    if (ts.isBinaryExpression(e) && e.operatorToken.kind === K.EqualsToken) return target(e.left, heap);
    const h = heap || !ts.isIdentifier(unparen(e));
    out.push({ id: rootName(e), heap: h, at: e });
  };
  const walk = (x) => {
    if (ts.isBinaryExpression(x) && ASSIGN(x.operatorToken.kind)) target(x.left, false);
    if ((ts.isPrefixUnaryExpression(x) || ts.isPostfixUnaryExpression(x)) && [K.PlusPlusToken, K.MinusMinusToken].includes(x.operator)) target(x.operand, false);
    if (ts.isDeleteExpression(x)) target(x.expression, true);
    if (ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && MUTATORS.has(x.expression.name.text)) target(x.expression.expression, true);
    if ((ts.isForInStatement(x) || ts.isForOfStatement(x)) && !ts.isVariableDeclarationList(x.initializer)) target(x.initializer, false);
    ts.forEachChild(x, walk);
  };
  walk(node);
  return out;
}
// a declaration of the module's top level (no function around it) or of another file: a module cell or an import, a
// field of the world (its changes are transitions), never a binding of a unit
const moduleCell = (d) => { if (!d) return false; for (let p = d.parent; p; p = p.parent) if (ts.isFunctionLike(p) || ts.isClassLike(p)) return false; return true; };
const nestedFunctions = (node) => { const out = []; const w = (x) => { if (ts.isFunctionLike(x)) { out.push(x); return; } ts.forEachChild(x, w); }; ts.forEachChild(node, w); return out; };

// The step's pending work acts on the world alone: no function nested in the step (an executor, a handler, an async
// callback; any of them may run after the step ends)
//   - rebinds a binding of the unit, or reads one the unit rebinds outside the step (after it, in a loop around it, or
//     from another nested function): the step's outputs are taken when it ends;
//   - writes into an object, unless the object is a fresh literal the nested function made itself, or a module cell
//     (a field of the world, whose changes are transitions): a callback's parameter is an element of the unit's
//     value, a captured name is the unit's or an enclosing function's;
//   - hands a reference the unit holds to a call, or calls a method on one, when the unit uses that reference outside
//     the step other than as the receiver of a call (the pending call may change what the unit reads later).
// null when it holds, else the reason
export function pendingWork(checker, node, fn) {
  if (broken('async-drop-pending')) return null;
  const nested = nestedFunctions(node);
  const captured = new Map(); // a binding of the unit read by a nested function -> its name
  const handed = new Map(); // a reference binding of the unit handed to a call or used as a receiver inside a nested function -> its name
  for (const f of nested) {
    for (const { id, heap, at } of writtenRoots(f)) {
      const d = id ? declOf(checker, id) : null;
      if (!heap) { if (bindingOfUnit(d, fn)) return `\`${id.text}\` is rebound by a function the step leaves pending`; continue; }
      const fresh = d && inside(d, f) && ts.isVariableDeclaration(d) && d.initializer && [K.ObjectLiteralExpression, K.ArrayLiteralExpression].includes(unparen(d.initializer).kind) && !writtenRoots(f).some((w) => !w.heap && w.id && declOf(checker, w.id) === d);
      if (!fresh && !moduleCell(d)) return `a function the step leaves pending writes into \`${(at ?? id)?.getText().slice(0, 40) ?? 'an object'}\`, which it did not make`;
    }
    const reads = (x) => {
      if (ts.isIdentifier(x)) {
        const d = declOf(checker, x);
        if (bindingOfUnit(d, fn) && !inside(d, f)) {
          captured.set(d, x.text);
          const p = x.parent;
          const asArg = p && (ts.isCallExpression(p) || ts.isNewExpression(p)) && p.arguments?.includes(x);
          const asRecv = p && ts.isPropertyAccessExpression(p) && p.expression === x && p.parent && ts.isCallExpression(p.parent) && p.parent.expression === p;
          if ((asArg || asRecv) && isReference(typeOfDecl(checker, d))) handed.set(d, x.text);
        }
      }
      ts.forEachChild(x, reads);
    };
    reads(f);
  }
  if (!captured.size) return null;
  const loops = []; for (let p = node.parent; p && p !== fn; p = p.parent) if (ts.isIterationStatement(p, false)) loops.push(p);
  const outsideStep = []; // every rebinding of a captured binding outside the step
  for (const w of writtenRoots(fn.body ?? fn)) if (w.id && !inside(w.id, node) && !w.heap) outsideStep.push(w);
  for (const { id } of outsideStep) {
    const d = declOf(checker, id); if (!captured.has(d)) continue;
    let inFn = false; for (let p = id.parent; p && p !== fn; p = p.parent) if (ts.isFunctionLike(p)) inFn = true;
    if (id.pos >= node.end || inFn || loops.some((l) => inside(id, l))) return `\`${captured.get(d)}\` is read by work the step leaves pending and rebound outside it`;
  }
  if (handed.size) {
    let use = null;
    const w = (x) => {
      if (use || x === node) return;
      if (ts.isIdentifier(x) && handed.has(declOf(checker, x)) && !(ts.isParameter(x.parent) || (ts.isVariableDeclaration(x.parent) && x.parent.name === x))) {
        const p = x.parent;
        const asRecv = p && ts.isPropertyAccessExpression(p) && p.expression === x && p.parent && ts.isCallExpression(p.parent) && p.parent.expression === p;
        if (!asRecv) use = x.text;
      }
      ts.forEachChild(x, w);
    };
    w(fn.body ?? fn);
    if (use) return `\`${use}\` is handed to work the step leaves pending and read outside it`;
  }
  return null;
}

// The step's writes (amendment A2): every reference binding of the unit the step mentions may be changed through it,
// and so may every binding of the unit that may share an object with one of those. Two bindings may share when one's
// value (its initializer, or any value assigned to it) mentions the other: `const t = user.tags` shares with `user`, a
// value computed from `xs` shares with `xs`; the classes are closed in both directions, so a name an alias came from and
// another alias of it are written too. Parameters are two by two distinct trees (the value reading's axiom) and a call's
// result is fresh, so nothing else shares. A binding declared after the step is not in scope there and is not written.
// A binding the construct itself rebinds (`load(svc, k++)`, an assignment in an argument), of any type, is written too
// (a rebinding inside a function nested in it is pendingWork's refusal).
// Returns { writes: [declaration] } or { why } when a value shares with `this` (a receiver the step cannot name).
export function stepWrites(checker, node, fn) {
  const mentioned = new Set();
  const mention = (x) => { if (ts.isIdentifier(x)) { const d = declOf(checker, x); if (bindingOfUnit(d, fn) && !inside(d, node) && isReference(typeOfDecl(checker, d))) mentioned.add(d); } ts.forEachChild(x, mention); };
  mention(node);
  if (broken('async-drop-origins')) return { writes: [...mentioned].filter((d) => inScopeAt(d, node, fn)) }; // the --break: the references mentioned only (no sharing, no rebinding)
  const nestedIn = (x) => { for (let p = x.parent; p && p !== node; p = p.parent) if (ts.isFunctionLike(p)) return true; return false; };
  const rebound = new Set();
  for (const { id, heap } of writtenRoots(node)) { if (!id || heap || nestedIn(id)) continue; const d = declOf(checker, id); if (bindingOfUnit(d, fn) && !inside(d, node)) rebound.add(d); }
  // the unit's reference bindings and the values each receives
  const sources = new Map(); // declaration -> [expression]
  const add = (d, e) => { if (!d || !e) return; if (!sources.has(d)) sources.set(d, []); sources.get(d).push(e); };
  let why = null;
  const w = (x) => {
    if (ts.isVariableDeclaration(x) && x.initializer && bindingOfUnit(x, fn)) {
      if (ts.isIdentifier(x.name)) add(x, x.initializer);
      else { const names = []; const b = (y) => { if (ts.isBindingElement(y) && ts.isIdentifier(y.name)) names.push(y); ts.forEachChild(y, b); }; b(x.name); for (const be of names) add(be, x.initializer); }
    }
    if (ts.isBinaryExpression(x) && x.operatorToken.kind === K.EqualsToken && ts.isIdentifier(unparen(x.left))) { const d = declOf(checker, unparen(x.left)); if (bindingOfUnit(d, fn)) add(d, x.right); }
    if (ts.isForOfStatement(x) && ts.isVariableDeclarationList(x.initializer)) for (const vd of x.initializer.declarations) if (ts.isIdentifier(vd.name) && bindingOfUnit(vd, fn)) add(vd, x.expression);
    ts.forEachChild(x, w);
  };
  w(fn.body ?? fn);
  const edges = new Map(); const link = (a, b) => { for (const [x, y] of [[a, b], [b, a]]) { if (!edges.has(x)) edges.set(x, new Set()); edges.get(x).add(y); } };
  for (const [d, es] of sources) {
    if (!isReference(typeOfDecl(checker, d))) continue;
    for (const e of es) {
      const m = (x) => {
        if (x.kind === K.ThisKeyword && !why) why = `\`${nameOf(d) ?? 'a name'}\` may share an object with the receiver, which the step cannot name as a write`;
        if (ts.isIdentifier(x)) { const o = declOf(checker, x); if (o !== d && bindingOfUnit(o, fn) && isReference(typeOfDecl(checker, o))) link(d, o); }
        if (ts.isFunctionLike(x)) return; // a closure's captures are its own reads (pendingWork)
        ts.forEachChild(x, m);
      };
      m(e);
    }
  }
  const closed = new Set(mentioned); const todo = [...mentioned];
  while (todo.length) { const d = todo.pop(); for (const o of edges.get(d) ?? []) if (!closed.has(o)) { closed.add(o); todo.push(o); } }
  if (why && [...closed].some((d) => (sources.get(d) ?? []).some((e) => { let t = false; const s = (x) => { if (x.kind === K.ThisKeyword) t = true; else if (!ts.isFunctionLike(x)) ts.forEachChild(x, s); }; s(e); return t; }))) return { why };
  return { writes: [...new Set([...closed, ...rebound])].filter((d) => inScopeAt(d, node, fn)) };
}
// the declaration `d` is a name in scope at `node`: a parameter of the unit, or a local whose block holds node and that
// is declared before it
function inScopeAt(d, node, fn) {
  if (ts.isParameter(d)) return true;
  let scope = d.parent;
  while (scope && !ts.isBlock(scope) && !ts.isSourceFile(scope) && !ts.isForStatement(scope) && !ts.isForOfStatement(scope) && !ts.isForInStatement(scope) && scope !== fn) scope = scope.parent;
  return !!scope && inside(node, scope) && d.end <= node.pos;
}

// The same-file functions the step reaches (amendment A3): every function declaration, function-valued variable or
// method of this file a name in the step resolves to, and, from each, the ones its body reaches, to the fixpoint.
// Their texts are part of the step's key: a callee changed behind an unchanged construct is another transition.
export function reachedFunctions(checker, node) {
  if (broken('async-drop-callees')) return [];
  const sf = node.getSourceFile();
  const seen = new Set(); const out = [];
  const visit = (x) => {
    if (ts.isIdentifier(x) || (ts.isPropertyAccessExpression(x) && x.expression.kind === K.ThisKeyword)) {
      let s = null; try { s = checker.getSymbolAtLocation(ts.isIdentifier(x) ? x : x.name); } catch { s = null; }
      if (s && s.flags & ts.SymbolFlags.Alias) { try { s = checker.getAliasedSymbol(s); } catch { /* keep */ } }
      for (const d of s?.declarations ?? []) {
        if (d.getSourceFile() !== sf) continue;
        const body = ts.isFunctionLike(d) ? d : ts.isVariableDeclaration(d) && d.initializer && ts.isFunctionLike(unparen(d.initializer)) ? d : null;
        if (!body || seen.has(body) || inside(node, body)) continue;
        seen.add(body); out.push(body); visit(body);
      }
    }
    ts.forEachChild(x, visit);
  };
  visit(node);
  return out.sort((a, b) => a.pos - b.pos);
}

// the opaque site of a finding of rule `rule` at `node` in the unit `fn`: { node } when the construct is an opaque step,
// else { why } (the refusal stands)
export function asyncOpaqueSite(checker, rule, node, fn) {
  const c = ASYNC_OPAQUE[rule];
  if (!c) return null;
  if (c.form !== 'expression') return { why: c.why };
  if (!fn || !fn.body) return { why: 'no unit holds the construct' };
  if (fn.asteriskToken) return { why: 'a construct inside a generator body may hide a yield' };
  for (let p = node.parent; p && p !== fn; p = p.parent) if (ts.isFunctionLike(p) || ts.isClassLike(p)) return { why: 'the construct sits inside a function nested in the unit; that function runs where it is called, outside the construct (locality)' };
  if (!ts.isCallExpression(node) && !ts.isNewExpression(node) && !ts.isAwaitExpression(node)) return { why: 'the finding names a value; what the rule refuses happens where the value is used, outside its text (locality)' };
  let yields = false, self = false; const y = (x) => { if (ts.isYieldExpression(x)) yields = true; if (x.kind === K.ThisKeyword || x.kind === K.SuperKeyword) self = true; if (!(ts.isFunctionLike(x) && !ts.isArrowFunction(x))) ts.forEachChild(x, y); }; y(node);
  if (yields) return { why: 'the construct yields' };
  if (self) return { why: 'the construct names the receiver; the step cannot name it as a write' };
  const pending = pendingWork(checker, node, fn);
  if (pending) return { why: pending };
  const sw = stepWrites(checker, node, fn);
  if (sw.why) return { why: sw.why };
  // a step that writes names is evaluated where the statement around it reads nothing else: the names it rebinds are
  // rebound before the statement (translate.mjs hoist), so a read of one elsewhere in the same statement, or a branch
  // around the step, would see the value after the step where the program sees the value before it
  if (sw.writes.length) {
    let p = node, s = node.parent;
    const transparent = (q, x) => ts.isParenthesizedExpression(q) || ts.isAwaitExpression(q) || ts.isVoidExpression(q) || ts.isNonNullExpression(q) || ts.isAsExpression(q) || ts.isExpressionStatement(q) || ts.isReturnStatement(q) || (ts.isVariableDeclaration(q) && q.initializer === x) || ts.isVariableDeclarationList(q) || ts.isVariableStatement(q) || (ts.isBinaryExpression(q) && q.operatorToken.kind === K.EqualsToken && q.right === x && ts.isIdentifier(unparen(q.left)));
    while (s && !ts.isStatement(p)) { if (!transparent(s, p)) return { why: 'a step that may change a reference sits inside an expression that reads around it' }; p = s; s = s.parent; }
    const W = new Set(sw.writes);
    let other = false; const o = (x) => { if (other || x === node) return; if (ts.isIdentifier(x) && W.has(declOf(checker, x))) other = true; ts.forEachChild(x, o); }; o(p);
    if (other) return { why: 'the statement holding the step reads a name the step may change' };
  }
  return { node };
}
