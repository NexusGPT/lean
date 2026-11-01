// The opacity ladder for the statement and expression rules (lane w1b-opaque-statements, design/w1b-opaque-statements.md).
//
// A construct of one of these rules has no exact reading. It is not refused: the innermost statement of its unit's own
// body that holds it becomes one opaque step (translate.mjs opaqueStep), an uninterpreted transition of the world keyed
// by the statement's text and the definitions it names, reading every local it mentions and writing every local it
// assigns, with a result and a loop-control channel when it can return or jump. Where no statement of the unit's body
// holds the site (a parameter, a concise arrow body) the unit is one opaque function of its inputs instead.
//
// The column (which rules grade, and how) is translate/opaque.mjs OPAQUE, one table for every W1 lane; this file holds
// what the statement family adds to it, and is no copy of that helper. ENVELOPE, per graded rule of this family: `value`
// when every value the construct can make is a value of the model (a boolean, a number of the file's kind, a string of
// BMP scalars, a record...), `boundary` when it can make a value outside it (an astral string, NaN or an infinity, a
// fraction in an integer file, a key compared by reference, an iterator used up by its first read). A boundary step may
// write the world and jump, never a local or the result: a value outside the envelope must not meet an exact reading.
// Where it would, the unit joins the translator's value boundary (numericOpaque): the unit and every same-file unit that
// reaches it are each one opaque function keyed by their source, so no exact reading sees the value.
import { opaqueGrade, gradedRule, isReference, heapOperation } from './opaque.mjs';
import { calleesOf, unitText } from '../exec/callees.mjs';
import { topLevelFunctions, originOf } from '../common.mjs';

const BOUNDARY = new Set(['collection-iterator', 'reference-key', 'math-empty', 'division', 'unary-coercion', 'number-special', 'string-code-unit']);
export const ENVELOPE = Object.freeze(Object.fromEntries(['assignment-expression', 'bare-return', 'bitwise', 'collection-iterator', 'destructuring', 'division', 'for-in', 'for-of-non-array', 'label', 'loose-equality', 'math-empty', 'mixed-types', 'number-special', 'param-form', 'record-rest', 'reference-key', 'spread', 'string-code-unit', 'string-order', 'template', 'unary-coercion', 'uninitialised', 'update-expression'].map((r) => [r, BOUNDARY.has(r) ? 'boundary' : 'value'])));
// a load-time check: this family's rows of the column and its envelope name one set of rules
for (const r of Object.keys(ENVELOPE)) if (opaqueGrade(r) !== 'statement') throw new Error(`opaque-statements: ${r} has an envelope but its column is ${opaqueGrade(r)}`);

// the statement-family reading of a rule, or null when the rule is not graded `statement` (another family's, or none)
export function statementSite(rule) {
  return opaqueGrade(rule) === 'statement' ? { form: 'statement', envelope: ENVELOPE[rule] } : null;
}

// the rule a translator refusal names (`<file>:<line>: <rule>: <message>`), when it is graded `statement`
export function statementRefusalRule(message) {
  const r = gradedRule(message);
  return r && statementSite(r) ? r : null;
}

// the innermost statement of `fn`'s own body (not of a function inside it) that holds `node`, or null when none does
// (the node is a parameter, a concise body, or not inside fn at all)
export function siteStatement(ts, node, fn) {
  let st = null;
  for (let p = node; p; p = p.parent) {
    if (p === fn) return st;
    if (ts.isFunctionLike(p) || ts.isClassLike(p)) st = isStatementNode(ts, p) ? p : null; // a statement of an inner function is not fn's own: the statement holding that function is (a nested declaration is one)
    else if (!st && isStatementNode(ts, p)) st = p;
  }
  return null;
}
function isStatementNode(ts, n) {
  if (ts.isBlock(n)) return false; // a block's own statements are the steps; a block alone is never the innermost
  return ts.isStatement(n) || ts.isVariableStatement(n);
}

// the deepest node of sf spanning [start, end)
export function nodeAt(ts, sf, start, end) {
  let best = sf;
  const walk = (n) => { if (n.getStart(sf) <= start && end <= n.getEnd()) { best = n; ts.forEachChild(n, walk); } };
  ts.forEachChild(sf, walk);
  return best;
}

// every identifier a statement assigns through a pattern or a loop header: `[a, b] = [b, a]`, `({ x: o.f, y } = r)`,
// `for (k in o)`, `for (x of xs)` (the roots of the targets; a declaration inside the statement is filtered by the caller)
export function patternTargets(ts, node) {
  const out = [];
  const root = (e) => { while (e && (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e) || ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e))) e = e.expression; return e; };
  const target = (e) => {
    if (!e) return;
    if (ts.isParenthesizedExpression(e)) return target(e.expression);
    if (ts.isArrayLiteralExpression(e)) { for (const x of e.elements) target(ts.isSpreadElement(x) ? x.expression : x); return; }
    if (ts.isObjectLiteralExpression(e)) {
      for (const p of e.properties) {
        if (ts.isPropertyAssignment(p)) target(p.initializer);
        else if (ts.isShorthandPropertyAssignment(p)) out.push(p.name);
        else if (ts.isSpreadAssignment(p)) target(p.expression);
      }
      return;
    }
    if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.EqualsToken) return target(e.left); // a target with a default
    const r = root(e);
    if (r && ts.isIdentifier(r)) out.push(r);
  };
  const walk = (x) => {
    if (ts.isBinaryExpression(x) && x.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && x.operatorToken.kind <= ts.SyntaxKind.LastAssignment) target(x.left);
    if ((ts.isForInStatement(x) || ts.isForOfStatement(x)) && !ts.isVariableDeclarationList(x.initializer)) target(x.initializer);
    if ((ts.isPrefixUnaryExpression(x) || ts.isPostfixUnaryExpression(x)) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(x.operator)) target(x.operand);
    ts.forEachChild(x, walk);
  };
  walk(node);
  return out;
}

// every name a declaration binds, patterns included (`const { a, b: [c, ...d] } = r` binds a, c, d)
export function boundNames(ts, name) {
  if (ts.isIdentifier(name)) return [name];
  const out = [];
  for (const e of name.elements) if (!ts.isOmittedExpression(e)) out.push(...boundNames(ts, e.name));
  return out;
}

// what an opaque statement's meaning depends on besides the values it reads: the text of every declaration of this file,
// outside the unit, that it names (a module constant, a same-file function passed as a value, a class it constructs, an
// enum it reads). The step is keyed by its text and these: the same text naming a changed definition is another symbol
// (the effect axiom's `op` is the construct, and a name's definition is part of the construct)
export function namedDefinitions(ts, checker, sf, node, unitNode) {
  const texts = new Set();
  const inside = (d, n) => { for (let p = d; p; p = p.parent) if (p === n) return true; return false; };
  const walk = (x) => {
    if (ts.isIdentifier(x)) {
      let sym = null;
      try { sym = x.parent && ts.isShorthandPropertyAssignment(x.parent) && x.parent.name === x ? checker.getShorthandAssignmentValueSymbol(x.parent) : checker.getSymbolAtLocation(x); } catch { sym = null; }
      if (sym && sym.flags & ts.SymbolFlags.Alias) { try { sym = checker.getAliasedSymbol(sym); } catch { /* keep */ } }
      for (const d of sym?.declarations ?? []) {
        if (d.getSourceFile() !== sf || inside(d, unitNode)) continue;
        let top = d; while (top.parent && top.parent !== sf) top = top.parent; // the top-level statement that holds the declaration
        if (ts.isImportDeclaration(top)) continue; // an import names another file: its value is an outside value, as everywhere
        texts.add(top.getText(sf));
      }
    }
    ts.forEachChild(x, walk);
  };
  walk(node);
  return [...texts].sort();
}

// the code an opaque statement reaches through the same-file units it names (exec/callees.mjs: directly, then every unit
// those reach, breadth first): each as `<name> <text>`, the text as the printer writes it without comments. The step is
// keyed by these too (A3): the same statement calling a callee changed anywhere, at one input only, is another symbol.
// The theorem's `// CALLS` guard refuses the same case by name for a translated callee; this holds for every callee,
// translated or not (a callee read whole, a function handed on as a value)
export function reachedUnitTexts(ts, checker, sf, node, unitNode) {
  const units = topLevelFunctions(sf);
  const nameOf = (decl) => ts.isMethodDeclaration(decl) && ts.isIdentifier(decl.name) && decl.parent?.name ? `${decl.parent.name.text}.${decl.name.text}` : decl.name && ts.isIdentifier(decl.name) ? decl.name.text : null; // exec/callees.mjs unitNameOf
  const named = new Set();
  const walk = (x) => {
    if (ts.isIdentifier(x)) { const o = originOf(checker, x, sf, unitNode); const n = o.kind === 'unit' ? nameOf(o.decl) : null; if (n && units.has(n) && units.get(n).node !== unitNode) named.add(n); }
    ts.forEachChild(x, walk);
  };
  walk(node);
  const all = new Set(named);
  for (const n of named) for (const c of calleesOf(sf, checker, n)) all.add(c.callee);
  return [...all].sort().map((n) => `${n} ${unitText(sf, units.get(n))?.text ?? ''}`);
}

// ----- the step's state is its reads' values only when no object is shared (design/w1b-opaque-statements.md) -----
// The step is keyed by its text and takes its reads by value. Two runs reading equal values are in equal states as long
// as what the step does depends on values alone; it also depends on which names share an object when the step changes
// an object or compares two by identity (design/w1a-opaque-mutation.md, "Why the opaque step cannot be one statement
// here"): `same = x === t` reads equal values whether t is x or a copy of it, and JavaScript answers true and false.
// stepHazard names the first operation of the statement that depends on more than values; null when there is none.
const NO_CONVERSION = (ts) => new Set([ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken, ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.CommaToken, ts.SyntaxKind.InstanceOfKeyword]);
const IDENTITY = (ts) => new Set([ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken, ts.SyntaxKind.ExclamationEqualsToken]);
// array and string methods that read their receiver and make a new value (their arguments are tested on their own)
const VALUE_METHODS = new Set(['join', 'slice', 'at', 'includes', 'indexOf', 'lastIndexOf', 'concat', 'charAt', 'charCodeAt', 'codePointAt', 'startsWith', 'endsWith', 'trim', 'toUpperCase', 'toLowerCase', 'padStart', 'padEnd', 'repeat', 'split', 'substring']);
export function stepHazard(ts, checker, node) {
  const K = ts.SyntaxKind;
  const ref = (x) => { let t = null; try { t = checker.getTypeAtLocation(x); } catch { t = null; } return isReference(t); };
  const ASSIGN = (k) => k >= K.FirstAssignment && k <= K.LastAssignment;
  const noConv = NO_CONVERSION(ts), identity = IDENTITY(ts);
  let hit = null;
  const walk = (x) => {
    if (hit || ts.isTypeNode(x)) return;
    const found = (why) => { hit = { node: x, why }; };
    if (x !== node && (ts.isFunctionLike(x) || ts.isClassLike(x))) return found('builds a closure');
    if (ts.isBinaryExpression(x)) {
      const k = x.operatorToken.kind;
      if (ASSIGN(k) && !ts.isIdentifier(x.left) && !ts.isArrayLiteralExpression(x.left) && !ts.isObjectLiteralExpression(x.left)) return found('writes a field or an element');
      if (identity.has(k) && (ref(x.left) || ref(x.right))) return found('compares an object by identity');
      if (!ASSIGN(k) && !noConv.has(k) && (ref(x.left) || ref(x.right))) return found('converts an object implicitly');
    }
    if ((ts.isPrefixUnaryExpression(x) || ts.isPostfixUnaryExpression(x)) && (x.operator === K.PlusPlusToken || x.operator === K.MinusMinusToken) && !ts.isIdentifier(x.operand)) return found('writes a field or an element');
    if (ts.isPrefixUnaryExpression(x) && [K.PlusToken, K.MinusToken, K.TildeToken].includes(x.operator) && ref(x.operand)) return found('converts an object implicitly');
    if (ts.isTemplateSpan(x) && ref(x.expression)) return found('converts an object implicitly');
    if (ts.isDeleteExpression(x)) return found('deletes a field');
    if (ts.isCallExpression(x) || ts.isNewExpression(x) || ts.isTaggedTemplateExpression(x)) {
      const callee = ts.isTaggedTemplateExpression(x) ? x.tag : x.expression;
      const args = ts.isTaggedTemplateExpression(x) ? [] : (x.arguments ?? []);
      if (args.some((a) => ref(ts.isSpreadElement(a) ? a.expression : a))) return found('hands an object to a call');
      if ((ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee)) && ref(callee.expression) && !(ts.isPropertyAccessExpression(callee) && VALUE_METHODS.has(callee.name.text))) return found('calls a method on an object');
      if (ts.isNewExpression(x) && ts.isIdentifier(callee) && /^(Weak)?(Map|Set)$/.test(callee.text)) return found('builds a collection keyed by identity');
    }
    if ((ts.isForInStatement(x) || ts.isForOfStatement(x)) && !ts.isVariableDeclarationList(x.initializer) && !ts.isIdentifier(x.initializer)) return found('writes a loop target field');
    ts.forEachChild(x, walk);
  };
  walk(node);
  return hit;
}
// the first statement (or header) run before `s` in its unit that may touch a reference (translate/opaque.mjs
// heapOperation, the test w1a's block starts from: one argument for both lanes): the statements before it in each list
// that holds it, the headers of the statements around it, and every other statement of a loop around it (an earlier
// pass runs them first). null when none may: every object is then as the caller handed it, the parameters two by two
// distinct trees and no local holding one (subset.md "Modelling axioms"), so equal reads are equal states.
export function sharedBefore(ts, checker, s, root) {
  const contains = (a, b) => { for (let p = b; p; p = p.parent) if (p === a) return true; return false; };
  const parts = [];
  for (let c = s; c && c !== root && c.parent; c = c.parent) {
    const p = c.parent;
    if (ts.isBlock(p) || ts.isCaseClause(p) || ts.isDefaultClause(p)) { for (const st of p.statements) { if (st === c) break; parts.push(st); } }
    else if (ts.isCaseBlock(p)) { for (const cl of p.clauses) { if (cl === c) break; parts.push(cl); } }
    else if (p !== root) ts.forEachChild(p, (k) => { if (k !== c && !(ts.isStatement(k) || ts.isBlock(k) || ts.isCaseBlock(k))) parts.push(k); });
    if (ts.isIterationStatement(p, false)) { const w = (x) => { if (x === s || contains(x, s)) { if (x !== s) ts.forEachChild(x, w); return; } if (ts.isStatement(x) || ts.isExpression(x)) { parts.push(x); return; } ts.forEachChild(x, w); }; ts.forEachChild(p, w); }
    if (p === root) break;
  }
  for (const x of parts) { const h = heapOperation(checker, x); if (h) return h; }
  return null;
}
