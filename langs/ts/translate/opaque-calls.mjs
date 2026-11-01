// The statement form of the opacity ladder for lane w1c-opaque-calls (design/w1c-opaque-calls.md): the rule a translator
// refusal names, the names a step may change beyond those it assigns, the declarations a boundary step makes handles,
// and the same-file code its key holds. The step itself is translate/opaque.mjs (lane w1a's shared helper: the key, the
// form, the certificate row); the column and the site decision are lint/opaque-calls.mjs.
import { ts, originOf, topLevelFunctions } from '../common.mjs';
import { isReference } from './opaque.mjs';
import { calleesOf, unitText } from '../exec/callees.mjs';
import { opaqueCallsForm, siteStatement, callsOpaqueSite } from '../lint/opaque-calls.mjs';

export { opaqueCallsForm, siteStatement, callsOpaqueSite };

const K = ts.SyntaxKind;

// The mechanisms the pair tests break (LEAN_OPAQUE_BREAK, the convention translate/opaque.mjs set for drop-read): each
// removes one half of the step's interface, and the --break row of tests/opaque-calls.mjs asserts the verdict it guards
// flips to a false proof. Never set outside them.
//   drop-write    the step writes only the names it assigns: no reference in scope, no closure-written name (A2)
//   drop-callees  the step's key is its own text alone, not the text of the same-file units it reaches (A3)
export const broken = (mechanism) => process.env.LEAN_OPAQUE_BREAK === mechanism;

// the rule a translator refusal names (`<file>:<line>: <rule>: <message>`), when the column grades it
export function callsRefusalRule(message) {
  const m = /^[^\n]*?:\d+: ([a-z][a-z0-9-]*): /.exec(String(message));
  return m && opaqueCallsForm(m[1]) ? m[1] : null;
}

// the deepest node of sf whose span holds [start, end)
export function nodeAt(sf, start, end) {
  let best = sf;
  const walk = (n) => { if (n.getStart(sf) <= start && end <= n.getEnd()) { best = n; ts.forEachChild(n, walk); } };
  ts.forEachChild(sf, walk);
  return best;
}

// the names a binding pattern binds
const bound = (b, out) => {
  if (ts.isIdentifier(b)) out.push(b);
  else if (b && (ts.isObjectBindingPattern(b) || ts.isArrayBindingPattern(b))) for (const e of b.elements) if (!ts.isOmittedExpression(e)) bound(e.name, out);
  return out;
};
// The declarations (their name nodes) in scope at statement s of fn's own body and made before it: fn's parameters,
// the declarations of every enclosing statement list before s, an enclosing for's, for-of's or for-in's variables, a
// catch clause's variable. A nested function's declarations are not in scope; a `var` declared later holds undefined.
export function scopeAt(s, fn) {
  const out = [];
  for (const p of fn.parameters ?? []) bound(p.name, out);
  for (let c = s; c && c !== fn; c = c.parent) {
    const p = c.parent; if (!p) break;
    const list = ts.isBlock(p) || ts.isCaseClause(p) || ts.isDefaultClause(p) ? p.statements : null;
    if (list) for (const st of list) { if (st.pos >= c.pos) break; if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) bound(d.name, out); }
    if (ts.isCaseClause(p) || ts.isDefaultClause(p)) for (const cl of p.parent.clauses) { if (cl === p) break; for (const st of cl.statements) if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) bound(d.name, out); } // a case block is one scope
    if ((ts.isForStatement(p) || ts.isForOfStatement(p) || ts.isForInStatement(p)) && p.initializer && ts.isVariableDeclarationList(p.initializer) && c !== p.initializer) for (const d of p.initializer.declarations) bound(d.name, out);
    if (ts.isCatchClause(p) && p.variableDeclaration && c === p.block) bound(p.variableDeclaration.name, out);
  }
  return out;
}

const ASSIGN = (k) => k >= K.FirstAssignment && k <= K.LastAssignment;
const isFunctionType = (t) => !!t && !t.isUnion() && t.getCallSignatures().length > 0 && t.getProperties().length === 0;
// The names the step at s may change beyond the names it assigns (A2: the writes closed under the alias origin):
//   every reference-typed name in scope: a construct lean cannot read may change any object it can reach, and through
//   an alias it made earlier (`const t = user.tags`) or one a callee keeps, the object any name holds; the origin of an
//   alias is one of these names, so the set holds every origin the lint could name and every one it could not;
//   every name in scope a function nested in the unit assigns: the step may call that function.
// A name of a function type holds no field lean reads and is never rebound. `this` (a free function's declared
// receiver) is a parameter like any other. drop-write (the --break) returns none.
export function reachWrites(checker, s, fn) {
  if (broken('drop-write')) return [];
  const scope = scopeAt(s, fn);
  const decls = new Map(scope.map((id) => [checker.getSymbolAtLocation(id)?.valueDeclaration, id]).filter(([d]) => !!d));
  const out = [];
  const add = (id) => { if (!out.includes(id)) out.push(id); };
  for (const id of scope) {
    let t = null; try { t = checker.getTypeAtLocation(id); } catch { /* no type: a reference */ }
    if (isReference(t) && !isFunctionType(t)) add(id);
  }
  const closureWrites = (x, inNested) => {
    if (ts.isFunctionLike(x) && x !== fn) inNested = true;
    if (inNested) {
      const target = ts.isBinaryExpression(x) && ASSIGN(x.operatorToken.kind) ? x.left : (ts.isPrefixUnaryExpression(x) || ts.isPostfixUnaryExpression(x)) && (x.operator === K.PlusPlusToken || x.operator === K.MinusMinusToken) ? x.operand : null;
      const roots = [];
      const rootsOf = (e) => { while (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) e = e.expression; if (ts.isIdentifier(e)) roots.push(e); else if (ts.isObjectLiteralExpression(e) || ts.isArrayLiteralExpression(e)) ts.forEachChild(e, (k) => rootsOf(ts.isPropertyAssignment(k) ? k.initializer : ts.isShorthandPropertyAssignment(k) ? k.name : ts.isSpreadElement(k) || ts.isSpreadAssignment(k) ? k.expression : k)); };
      if (target) rootsOf(target);
      for (const r of roots) { const d = checker.getSymbolAtLocation(r)?.valueDeclaration; if (d && decls.has(d)) add(decls.get(d)); }
    }
    ts.forEachChild(x, (k) => closureWrites(k, inNested));
  };
  if (fn.body) closureWrites(fn.body, false);
  return out;
}

// The declarations a boundary step makes handles (common.mjs holdOpaque): the names whose value the construct itself
// makes: the names the statement declares, the root of every target it assigns, updates or deletes (a field written
// with the construct's value leaves its object outside the type as much as a name does). Each is read at the opaque Any
// at every read of the unit, before and after the step: the construct may have made a value outside the declared type
// (a prototype function read by a computed key, an undefined match item), so no exact reading takes it at that type.
// An object the step may only change through a typed call (reachWrites: a receiver, an argument, an alias origin) keeps
// its type: such a call keeps the values it writes in their types as any typed code does (subset.md, "Modelling
// axioms"); it is written, never held.
export function heldDecls(checker, s, fn) {
  const ids = [];
  const root = (e) => { while (e && (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e) || ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e))) e = e.expression; if (e && ts.isIdentifier(e)) ids.push(e); };
  const walk = (x) => {
    if (ts.isVariableDeclaration(x)) bound(x.name, ids);
    if (ts.isBinaryExpression(x) && ASSIGN(x.operatorToken.kind)) { if (ts.isObjectLiteralExpression(x.left) || ts.isArrayLiteralExpression(x.left)) ts.forEachChild(x.left, function w(k) { if (ts.isIdentifier(k)) ids.push(k); else ts.forEachChild(k, w); }); else root(x.left); }
    if ((ts.isPrefixUnaryExpression(x) || ts.isPostfixUnaryExpression(x)) && (x.operator === K.PlusPlusToken || x.operator === K.MinusMinusToken)) root(x.operand);
    if (ts.isDeleteExpression(x)) root(x.expression);
    if ((ts.isForOfStatement(x) || ts.isForInStatement(x)) && !ts.isVariableDeclarationList(x.initializer)) root(x.initializer);
    ts.forEachChild(x, walk);
  };
  walk(s);
  const out = new Set();
  for (const id of ids) {
    const d = checker.getSymbolAtLocation(id)?.valueDeclaration;
    if (d && fn.pos <= d.pos && d.end <= fn.end) out.add(d); // a name of the unit: a module binding is a world field already
  }
  return [...out];
}

// The same-file code the step's key holds (A3): every unit of the file the statement names (a call, a callback handed
// by name, a sibling `this.m()` the translator resolved, passed in `named`), and every unit those reach (exec/callees.mjs
// calleesOf), each as `<name> <normalised text>`, sorted. Two steps with one text whose callees differ are two symbols:
// a callee changed only at `x === 7919` behind an identical statement is a changed step. drop-callees (the --break)
// returns none.
export function calleeTexts(checker, sf, s, named = []) {
  if (broken('drop-callees')) return [];
  const units = topLevelFunctions(sf);
  const byDecl = new Map(); for (const [name, u] of units) { byDecl.set(u.node, name); if (u.fn) byDecl.set(u.fn, name); }
  const direct = new Set(named.filter((n) => units.has(n)));
  const visit = (n) => {
    if (ts.isIdentifier(n)) {
      let o = null; try { o = originOf(checker, n, sf, null); } catch { o = null; }
      if (o?.kind === 'unit' && o.decl) { const name = byDecl.get(o.decl) ?? (o.decl.name && ts.isIdentifier(o.decl.name) && units.has(o.decl.name.text) ? o.decl.name.text : null); if (name) direct.add(name); }
    }
    ts.forEachChild(n, visit);
  };
  visit(s);
  const all = new Set(direct);
  for (const name of direct) for (const c of calleesOf(sf, checker, name)) all.add(c.callee);
  return [...all].sort().map((name) => `${name} ${unitText(sf, name)?.text ?? ''}`);
}

// the statements of fn's own body (a nested function's are not), and how many of them lie inside the given ones
export function statementCount(fn, inside = []) {
  let all = 0, opaque = 0;
  const walk = (x, under) => {
    if (ts.isFunctionLike(x) && x !== fn) return;
    const st = ts.isStatement(x) && !ts.isBlock(x);
    const here = under || inside.includes(x);
    if (st) { all++; if (here) opaque++; }
    ts.forEachChild(x, (k) => walk(k, here));
  };
  if (fn.body) walk(fn.body, false);
  return { statements: all, opaque };
}
