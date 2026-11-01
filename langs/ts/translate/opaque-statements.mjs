// The opacity ladder for the statement and expression rules (lane w1b-opaque-statements, design/w1b-opaque-statements.md).
//
// A construct of one of these rules has no exact reading. It is not refused: the innermost statement of its unit's own
// body that holds it becomes one opaque step (translate.mjs opaqueStep), an uninterpreted transition of the world keyed
// by the statement's text and the definitions it names, reading every local it mentions and writing every local it
// assigns, with a result and a loop-control channel when it can return or jump. Where no statement of the unit's body
// holds the site (a parameter, a concise arrow body) the unit is one opaque function of its inputs instead.
//
// The column says, per rule, whether the opaque reading applies (`statement`) or the refusal stands (`none`), and its
// envelope: `value` when every value the construct can make is a value of the model (a boolean, a number of the file's
// kind, a string of BMP scalars, a record...), `boundary` when it can make a value outside it (an astral string, NaN or
// an infinity, a fraction in an integer file, a key compared by reference, an iterator used up by its first read). A
// boundary step may write the world and jump, never a local or the result: a value outside the envelope must not meet an
// exact reading. Where it would, the unit joins the translator's value boundary (numericOpaque): the unit and every
// same-file unit that reaches it are each one opaque function keyed by their source, so no exact reading sees the value.
export const OPAQUE_COLUMN = Object.freeze({
  'destructuring': { form: 'statement', envelope: 'value' },
  'param-form': { form: 'statement', envelope: 'value' }, // a rest parameter: never inside a statement of the unit's own body, so the unit
  'uninitialised': { form: 'statement', envelope: 'value' },
  'record-rest': { form: 'statement', envelope: 'value' },
  // break or continue with no loop or switch around it in its function: a compiler error (TS1104, TS1105); the step's
  // control result names the loop it leaves, and here there is none, so the refusal stands
  'break-continue': { form: 'none', why: 'the jump has no enclosing loop or switch, so an opaque step has no control result to give it' },
  'switch-fallthrough': { form: 'statement', envelope: 'value' }, // no site today: the switch reads fall-through (subset.md "Control")
  'bare-return': { form: 'statement', envelope: 'value' },
  'update-expression': { form: 'statement', envelope: 'value' },
  'assignment-expression': { form: 'statement', envelope: 'value' },
  'comma': { form: 'statement', envelope: 'value' }, // no site today: the comma is read (subset.md "Operators as values")
  'spread': { form: 'statement', envelope: 'value' },
  'for-in': { form: 'statement', envelope: 'value' },
  'for-of-non-array': { form: 'statement', envelope: 'value' },
  'collection-iterator': { form: 'statement', envelope: 'boundary' },
  'reference-key': { form: 'statement', envelope: 'boundary' },
  'template': { form: 'statement', envelope: 'value' },
  'label': { form: 'statement', envelope: 'value' },
  // a loop with no measure: its opaque reading would hide the measure the proof needs, so it stays a refusal by design
  // (no site today: an unbounded while is an opaque block of its own, subset.md "What is an opaque block")
  'loop-form': { form: 'none', why: 'a loop with no measure stays ASK by design: an opaque reading would hide the missing measure' },
  'math-empty': { form: 'statement', envelope: 'boundary' },
  'division': { form: 'statement', envelope: 'boundary' },
  'string-order': { form: 'statement', envelope: 'value' },
  'mixed-types': { form: 'statement', envelope: 'value' },
  'loose-equality': { form: 'statement', envelope: 'value' },
  'unary-coercion': { form: 'statement', envelope: 'boundary' },
  'bitwise': { form: 'statement', envelope: 'value' },
  'number-special': { form: 'statement', envelope: 'boundary' },
  'string-code-unit': { form: 'statement', envelope: 'boundary' },
});

// the column of a rule, or null when the rule is not this lane's or its refusal stands
export function opaqueForm(rule) {
  const c = OPAQUE_COLUMN[rule];
  return c && c.form !== 'none' ? c : null;
}

// the rule a translator refusal names (`<file>:<line>: <rule>: <message>`), when its column is opaque
export function opaqueRefusalRule(message) {
  const m = /^[^\n]*?:\d+: ([a-z][a-z0-9-]*): /.exec(String(message));
  return m && opaqueForm(m[1]) ? m[1] : null;
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
