// Certified correspondence, independent of the translator and the bounded runner.
// The decidable fragment and the three simulation theorems are in design/cheap-rungs.md.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ts, loadProgram, topLevelFunctions } from './common.mjs';
const K = ts.SyntaxKind;
const hash = s => createHash('sha256').update(s).digest('hex');
const no = why => ({ status: 'undecided', why });
const yes = (rung, evidence) => ({ status: 'decided-equal', rung, evidence: { theorem: `cheap-rungs/v1/${rung}`, ...evidence } });
const walk = (n, f) => { f(n); ts.forEachChild(n, c => { walk(c, f); }); };

// Compare the PARSED grammar, including operator/declaration tokens and empty statements.
// Only punctuation semicolons are omitted; EmptyStatement remains a distinct grammar node.
// Literal spelling (including template raw text and JSX whitespace) is retained.
export function parsedTree(n, replacements = new Map()) {
  if (replacements.has(n)) return replacements.get(n);
  if (n.kind === K.EndOfFileToken || n.kind === K.SemicolonToken) return null;
  if (ts.isJSDoc(n) || ts.isJsxText(n)) return [n.kind, n.getFullText()];
  const children = n.getChildren().map(c => parsedTree(c, replacements)).filter(c => c !== null);
  return children.length ? [n.kind, children] : [n.kind, n.getText()];
}
const tree = (n, replacements) => JSON.stringify(parsedTree(n, replacements));
// Names that reach the dynamic scope, the calling function, or a member's function object without naming its key.
// Not here, measured or argued in design/cheap-rungs.md: `toString` (a changed function object never flows as a value,
// so no toString can reach one), `stack` (stack frames are not part of the contract, design/stack-text.md), `require`
// (only a self require is a container, refused below), `__filename`/`__dirname` (rendered as the unit file by lane B).
const BAD_NAMES = new Set(['eval', 'Function', 'Reflect', 'Proxy', 'arguments', 'caller', 'callee',
  'getOwnPropertyDescriptor', 'getOwnPropertyDescriptors', 'getOwnPropertyNames', '__lookupGetter__', '__lookupSetter__', 'getPrototypeOf', '__proto__']);
function common(P, C, env) {
  if (env?.sameEnvironment !== true) return 'module environment not established';
  if (!P?.unit?.body || !C?.unit?.body) return 'unit missing or has no body';
  if (P.sf.parseDiagnostics.length || C.sf.parseDiagnostics.length) return 'parse diagnostics';
  if (JSON.stringify([...P.sf.pragmas]) !== JSON.stringify([...C.sf.pragmas]) ||
      JSON.stringify(P.sf.referencedFiles) !== JSON.stringify(C.sf.referencedFiles) ||
      JSON.stringify(P.sf.typeReferenceDirectives) !== JSON.stringify(C.sf.typeReferenceDirectives) ||
      JSON.stringify(P.sf.libReferenceDirectives) !== JSON.stringify(C.sf.libReferenceDirectives)) return 'compiler directives differ';
  if (P.unit.name !== C.unit.name) return 'unit identity changed';
  let why = null;
  for (const S of [P, C]) walk(S.sf, n => {
    if ((ts.isIdentifier(n) || ts.isStringLiteral(n)) && BAD_NAMES.has(n.text)) why = `source reflection or dynamic environment (${n.text})`;
    if (ts.isMetaProperty(n) || ts.isWithStatement(n)) why = 'source or dynamic scope observation';
  });
  return why;
}

// Invariant restored by the source guard: no expression of the module evaluates to a changed function object, or to a
// class whose source holds one, except where the object is invoked (a direct callee, a `new` target). Lean observes a
// function value by its name and its source (exec/fake.mjs render: `src: fnHash`), and module code can coerce it, so a
// changed function object that flows as a value is a possible difference; one that is only ever invoked is not.
// Ways a function object is reached, each closed:
// - by its binding (a top-level declaration): every reference is a direct callee; shorthand and export specifiers are
//   resolved to the binding they name;
// - through a container holding the binding (global object, exports, module namespace, a receiver outside a class):
//   any container handle refuses (containerHandle);
// - by its member key (a class method): every read of a property with that name, anywhere in the module, is a direct
//   callee; no string spelling the name (a key handed to the world); no computed read on a value whose type is open or
//   holds the name; no destructuring of the name; class methods are not enumerable, so key-free enumeration
//   (Object.values, spread, for-in) never yields them; descriptor and prototype reflection names are refused (BAD_NAMES);
// - through its class (whose source holds the method): the class binding is only a `new` target, a member-access base,
//   an `instanceof` right side, a heritage clause, an export, or a type; no `.constructor` read; no static `this`; no
//   decorator declared in this module (which would receive the class);
// - any other changed function (a closure, a function expression, an object-literal method, a class expression): refused.
const CONTAINER_NAMES = new Set(['globalThis', 'window', 'self', 'global', 'exports', 'module']);
const isCallee = n => { let x = n; while (ts.isParenthesizedExpression(x.parent)) x = x.parent; return (ts.isCallExpression(x.parent) || ts.isNewExpression(x.parent)) && x.parent.expression === x; };
const isTypePosition = n => { for (let x = n.parent; x && !ts.isSourceFile(x); x = x.parent) { if (ts.isTypeNode(x) || ts.isExpressionWithTypeArguments(x) && ts.isHeritageClause(x.parent) && x.parent.token === K.ImplementsKeyword) return true; if (ts.isStatement(x) || ts.isExpression(x) && !ts.isIdentifier(x) && !ts.isQualifiedName(x)) return false; } return false; };
const cjsWriteHead = n => { // `module.exports = …`, `module.exports.x = …`, `exports.x = …`: a write into the container, never a read of it
  let x = n; while (ts.isPropertyAccessExpression(x.parent) && x.parent.expression === x) x = x.parent;
  return x !== n && ts.isBinaryExpression(x.parent) && x.parent.left === x && x.parent.operatorToken.kind === K.EqualsToken;
};
function containerHandle(S) {
  let why = null;
  walk(S.sf, n => {
    if (why) return;
    if (ts.isIdentifier(n) && CONTAINER_NAMES.has(n.text) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) && !(ts.isPropertyAssignment(n.parent) && n.parent.name === n) && !isTypePosition(n) && !cjsWriteHead(n)) why = `container handle ${n.text}`;
    else if (n.kind === K.ThisKeyword) {
      const c = ts.getThisContainer(n, false, false); // arrows are looked through: their `this` is the enclosing one
      const inClass = c && ts.isClassLike(c.parent) && (ts.isMethodDeclaration(c) || ts.isConstructorDeclaration(c) || ts.isGetAccessor(c) || ts.isSetAccessor(c) || ts.isPropertyDeclaration(c) || ts.isClassStaticBlockDeclaration(c));
      if (!inClass) why = 'receiver outside a class body';
    } else if (ts.isCallExpression(n) && n.expression.kind === K.ImportKeyword) why = 'dynamic import';
    else if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'require' && (!n.arguments[0] || !ts.isStringLiteralLike(n.arguments[0]) || selfSpecifier(S, n.arguments[0].text))) why = 'self or computed require';
    else if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier) {
      const m = S.checker?.getSymbolAtLocation(n.moduleSpecifier);
      if (m?.valueDeclaration === S.sf || selfSpecifier(S, n.moduleSpecifier.text ?? '')) why = 'self import';
    }
  });
  return why;
}
const moduleBase = f => path.basename(f).replace(/\.[jt]sx?$/, '');
const selfSpecifier = (S, spec) => { const t = spec.replace(/\.[jt]sx?$/, ''); return t === './' + moduleBase(S.sf.fileName) || t === '.' && moduleBase(S.sf.fileName) === 'index' || t === './' && moduleBase(S.sf.fileName) === 'index'; };
function referencedSymbol(S, n) {
  if (ts.isShorthandPropertyAssignment(n.parent) && n.parent.name === n) return S.checker.getShorthandAssignmentValueSymbol(n.parent);
  if (ts.isExportSpecifier(n.parent)) return S.checker.getExportSpecifierLocalTargetSymbol(n.parent);
  return S.checker.getSymbolAtLocation(n);
}
const memberName = m => (m.name && (ts.isIdentifier(m.name) || ts.isPrivateIdentifier(m.name) || ts.isStringLiteral(m.name) || ts.isNumericLiteral(m.name)) ? m.name.text : null);
const typeHolds = (S, t, name) => {
  const ts_ = t.isUnion() || t.isIntersection() ? t.types : [t];
  // an open type (any, unknown, object, a type parameter) may hold anything; a closed one holds the name if it declares it
  return ts_.some(x => (x.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.NonPrimitive | ts.TypeFlags.TypeParameter)) || !!S.checker.getPropertyOfType(S.checker.getApparentType(x), name));
};
// the key of a changed method: no read of it as a value anywhere in the module
function memberEscape(S, name, decl) {
  let why = null;
  walk(S.sf, n => {
    if (why || n === decl.name) return;
    if (ts.isPropertyAccessExpression(n) && n.name.text === name && !isCallee(n)) why = `member ${name} read as a value`;
    else if (ts.isElementAccessExpression(n)) {
      const k = n.argumentExpression;
      if (ts.isStringLiteralLike(k) || ts.isNumericLiteral(k)) { if (k.text === name && !isCallee(n)) why = `member ${name} read as a value`; }
      else if (typeHolds(S, S.checker.getTypeAtLocation(n.expression), name)) why = `computed read on a value that may hold ${name}`;
    } else if (ts.isStringLiteralLike(n) && n.text === name && !(ts.isElementAccessExpression(n.parent) && n.parent.argumentExpression === n) && !(ts.isPropertyAssignment(n.parent) && n.parent.name === n) && !ts.isModuleDeclaration(n.parent) && !(n.parent.moduleSpecifier === n) && !isTypePosition(n)) why = `key ${name} spelled as a string`; // a key handed to the world (a path, a method name) can come back as the member
    else if (ts.isBindingElement(n) && ts.isObjectBindingPattern(n.parent) && ((n.propertyName && memberName({ name: n.propertyName }) === name) || (!n.propertyName && ts.isIdentifier(n.name) && n.name.text === name))) why = `member ${name} destructured`;
  });
  return why;
}
// the class whose source holds a changed member: never a value that module code can coerce
function classEscape(S, cls) {
  if (!ts.isClassDeclaration(cls) || !cls.name) return 'class expression holds a changed member';
  const symbol = S.checker.getSymbolAtLocation(cls.name);
  if (!symbol) return 'class binding unresolved';
  let why = null;
  walk(S.sf, n => {
    if (why) return;
    if (ts.isIdentifier(n) && n !== cls.name && referencedSymbol(S, n) === symbol) {
      const p = n.parent;
      const ok = isTypePosition(n) || ts.isNewExpression(p) && p.expression === n || ts.isPropertyAccessExpression(p) && p.expression === n ||
        ts.isBinaryExpression(p) && p.right === n && p.operatorToken.kind === K.InstanceOfKeyword ||
        ts.isExpressionWithTypeArguments(p) && ts.isHeritageClause(p.parent) || ts.isExportSpecifier(p) || ts.isExportAssignment(p) && p.expression === n ||
        ts.isBinaryExpression(p) && p.right === n && p.operatorToken.kind === K.EqualsToken && cjsWriteHead(p.left.expression ?? p.left) ||
        ts.isTypeQueryNode(p) || ts.isQualifiedName(p);
      if (!ok) why = `class ${cls.name.text} used as a value`;
    } else if ((ts.isPropertyAccessExpression(n) && n.name.text === 'constructor') || (ts.isElementAccessExpression(n) && ts.isStringLiteralLike(n.argumentExpression) && n.argumentExpression.text === 'constructor')) why = '.constructor read';
    else if (n.kind === K.ThisKeyword) { const c = ts.getThisContainer(n, false, false); if (c && c.modifiers?.some(m => m.kind === K.StaticKeyword) || c && ts.isClassStaticBlockDeclaration(c)) why = 'static receiver is the class'; }
    else if (ts.isDecorator(n)) { const e = ts.isCallExpression(n.expression) ? n.expression.expression : n.expression; const id = ts.isIdentifier(e) ? e : ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) ? e.expression : null; const d = id && S.checker.getSymbolAtLocation(id)?.declarations?.[0]; if (!id || d && d.getSourceFile() === S.sf && !ts.isImportSpecifier(d) && !ts.isImportClause(d) && !ts.isNamespaceImport(d)) why = 'decorator declared in this module receives the class'; }
  });
  return why;
}
const isMethodLike = fn => (ts.isMethodDeclaration(fn) || ts.isGetAccessor(fn) || ts.isSetAccessor(fn) || ts.isConstructorDeclaration(fn)) && ts.isClassLike(fn.parent);
// The changed functions, matched by position on the two sides (same count, same nesting order): those whose source
// text differs, outermost first. A function nested in a changed method whose own text also changed is a changed closure.
function changedFunctions(P, C) {
  const functions = S => { const out = []; walk(S.sf, n => { if (ts.isFunctionLike(n) && n.body) out.push(n); }); return out; };
  const ps = functions(P), cs = functions(C);
  if (ps.length !== cs.length) return null;
  const out = [];
  for (let i = 0; i < ps.length; i++) if (ps[i].getText() !== cs[i].getText()) out.push([ps[i], cs[i]]);
  return out;
}
function sourceGuard(P, C) {
  const changed = changedFunctions(P, C);
  if (!changed) return 'function structure changed';
  if (!changed.length) return null;
  for (const pair of changed) {
    for (const [S, fn] of [[P, pair[0]], [C, pair[1]]]) {
      if (ts.isFunctionDeclaration(fn) && ts.isSourceFile(fn.parent) && fn.name) {
        const symbol = S.checker.getSymbolAtLocation(fn.name);
        if (!symbol) return 'function binding unresolved';
        let bad = false;
        walk(S.sf, n => {
          if (!ts.isIdentifier(n) || n === fn.name || referencedSymbol(S, n) !== symbol) return;
          if (!ts.isCallExpression(n.parent) || n.parent.expression !== n) bad = true;
        });
        if (bad) return 'changed function used as a value or reflected';
        const why = memberEscape(S, fn.name.text, fn); // the same binding as a property of a container
        if (why) return `changed function reachable by its name (${why})`;
      } else if (isMethodLike(fn)) {
        const name = ts.isConstructorDeclaration(fn) ? null : memberName(fn);
        if (!ts.isConstructorDeclaration(fn) && name === null) return 'changed member has a computed name';
        if (name !== null && ts.isMethodDeclaration(fn)) { const why = memberEscape(S, name, fn); if (why) return `changed method escapes (${why})`; }
        const why = classEscape(S, fn.parent);
        if (why) return `changed method escapes through its class (${why})`;
      } else return 'changed function source may escape (closure, function expression or object-literal method)';
    }
  }
  for (const S of [P, C]) { const why = containerHandle(S); if (why) return `changed function reachable through a container (${why})`; }
  return null;
}

export function parsedEqual(P, C, env) {
  const why = common(P, C, env);
  if (why) return no(why);
  const p = tree(P.sf), c = tree(C.sf);
  if (p !== c) return no('parsed module differs');
  const source = sourceGuard(P, C);
  if (source) return no(source);
  return yes('parsed-equal', { moduleTreeSha256: hash(p), environment: env.evidence ?? 'caller-established identical environment', source: 'changed functions are only invoked: no changed function object or class holding one flows as a value', exceptions: 'engine messages are printed from the parsed tree (node ' + process.version + '), never from source spelling' });
}

// A deliberately small total expression language. No property read, callable input, allocation,
// implicit object coercion, write, closure, throw or TDZ can reach a renamed identifier in an error.
const primitive = n => n && [K.NumberKeyword, K.StringKeyword, K.BooleanKeyword].includes(n.kind);
const OPS = new Set([K.PlusToken, K.MinusToken, K.AsteriskToken, K.SlashToken, K.PercentToken,
  K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.LessThanToken, K.LessThanEqualsToken,
  K.GreaterThanToken, K.GreaterThanEqualsToken, K.AmpersandAmpersandToken, K.BarBarToken, K.QuestionQuestionToken]);
function normalForm(S, callees = new Map()) {
  const u = S.unit, fn = u.fn;
  if (!ts.isFunctionDeclaration(fn) || !ts.isSourceFile(fn.parent) || u.isAsync || fn.asteriskToken || fn.typeParameters?.length || !ts.isBlock(u.body)) return null;
  const names = new Map(), bound = new Map(), replacements = new Map(), declarations = [];
  const bind = (id, kind, index) => {
    if (!ts.isIdentifier(id) || names.has(id.text)) return false;
    const sym = S.checker.getSymbolAtLocation(id);
    if (!sym || sym.declarations?.length !== 1) return false;
    names.set(id.text, sym); bound.set(sym, [kind, index]); replacements.set(id, ['binding', kind, index]); return true;
  };
  for (const [i, p] of u.params.entries()) {
    if (!primitive(p.type) || p.initializer || p.questionToken || p.dotDotDotToken || p.modifiers?.length || !bind(p.name, 'parameter', i)) return null;
  }
  const expr = (n, available = bound) => {
    if (ts.isParenthesizedExpression(n)) return expr(n.expression, available);
    if (ts.isNumericLiteral(n) || ts.isStringLiteral(n) || n.kind === K.TrueKeyword || n.kind === K.FalseKeyword) return true;
    if (ts.isIdentifier(n)) {
      const b = available.get(S.checker.getSymbolAtLocation(n));
      if (!b) return false;
      replacements.set(n, ['binding', ...b]); return true;
    }
    if (ts.isPrefixUnaryExpression(n) && [K.PlusToken,K.MinusToken,K.ExclamationToken,K.TildeToken].includes(n.operator)) return expr(n.operand, available);
    if (ts.isBinaryExpression(n) && OPS.has(n.operatorToken.kind)) return expr(n.left, available) && expr(n.right, available);
    if (ts.isConditionalExpression(n)) return expr(n.condition, available) && expr(n.whenTrue, available) && expr(n.whenFalse, available);
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && !n.questionDotToken && !n.typeArguments?.length) {
      const target = callees.get(S.checker.getSymbolAtLocation(n.expression));
      return !!target && n.arguments.length === target.params.length && n.arguments.every(a => expr(a, available));
    }
    return false;
  };
  const sts = [...u.body.statements];
  if (!sts.length || !ts.isReturnStatement(sts.at(-1)) || !sts.at(-1).expression) return null;
  const locals = sts.slice(0,-1);
  // Reorder only an initial block of immutable declarations whose initializers depend on parameters
  // and literals, never on one another. Sorting by binding name happens BEFORE alpha numbering.
  const independent = locals.every(st => ts.isVariableStatement(st) && !st.modifiers?.length && st.declarationList.declarations.length === 1 &&
    st.declarationList.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let) && ts.isIdentifier(st.declarationList.declarations[0].name) &&
    st.declarationList.declarations[0].initializer && expr(st.declarationList.declarations[0].initializer, new Map(bound)));
  const ordered = independent ? [...locals].sort((a,b) => a.declarationList.declarations[0].name.text.localeCompare(b.declarationList.declarations[0].name.text)) : locals;
  for (const [i, st] of ordered.entries()) {
    if (!ts.isVariableStatement(st) || st.modifiers?.length || st.declarationList.declarations.length !== 1 || !(st.declarationList.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let))) return null;
    const d = st.declarationList.declarations[0];
    if (!d.initializer || (d.type && !primitive(d.type)) || d.exclamationToken || !expr(d.initializer) || !bind(d.name, 'local', i)) return null;
    // Replace the declaration list's const/let token only after the no-write grammar was checked.
    for (const child of st.declarationList.getChildren()) if ([K.ConstKeyword,K.LetKeyword].includes(child.kind)) replacements.set(child, ['immutable-lexical']);
    declarations.push(st);
  }
  if (!expr(sts.at(-1).expression)) return null;
  // Signatures preserve type annotations, function name, modifiers, arity and parameter position.
  replacements.set(u.body, ['body', [...declarations, sts.at(-1)].map(st => parsedTree(st, replacements))]);
  return { text: tree(fn, replacements), rules: ['binding-bijection', 'immutable-lexical', ...(independent && locals.length > 1 ? ['independent-declaration-order'] : [])] };
}
// Alpha conversion of the unit's own variable, parameter and catch bindings, in any code. Each renamable binding is
// replaced by its declaration index, so two units with equal canonical trees differ only by a bijection of those
// bindings, and every reference resolves (by the checker's symbol, never by text) to the corresponding binding: a
// capture-changing rename resolves elsewhere and the trees differ. A binding whose NAME is observable keeps its text,
// at that occurrence or everywhere, so a rename there makes the trees differ and the rung undecided:
// - an expression V8 prints in an engine message (`x.y is not a function`, `v is not iterable`, `Cannot destructure
//   ... of 'v'`): callees of calls, `new` and tagged templates, for-of and spread operands, destructuring sources, a
//   heritage clause, a JSX tag; the message is compared (design/stack-text.md);
// - a key: a shorthand property `{ x }` and a shorthand destructuring `{ x } = o` (the checker names the property there);
// - a function's inferred name: a binding initialised or assigned with an anonymous function or class (`.name`);
// - a parameter property (`constructor(private x)`), which is also a field;
// - a lexical binding that may be read before its initialisation (`Cannot access 'x' before initialization`): a
//   reference before the declaration ends, inside a function created before it ends, or a declaration in a switch case.
// The unit's source changes, so the source guard (only invoked, never a value) applies as for parsed correspondence.
const skipWrappers = e => { while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isSatisfiesExpression?.(e) || ts.isNonNullExpression(e) || ts.isTypeAssertionExpression(e))) e = e.expression; return e; };
const anonymousDefinition = e => { e = skipWrappers(e); return !!e && (ts.isArrowFunction(e) || (ts.isFunctionExpression(e) || ts.isClassExpression(e)) && !e.name); };
const printedRoots = n => {
  if ((ts.isCallExpression(n) || ts.isNewExpression(n))) return [n.expression];
  if (ts.isTaggedTemplateExpression(n)) return [n.tag];
  if (ts.isForOfStatement(n) || ts.isSpreadElement(n) || ts.isSpreadAssignment(n) || ts.isYieldExpression(n) && n.asteriskToken) return [n.expression];
  if ((ts.isVariableDeclaration(n) || ts.isBindingElement(n) || ts.isParameter(n)) && n.initializer && !ts.isIdentifier(n.name)) return [n.initializer];
  if (ts.isBinaryExpression(n) && n.operatorToken.kind === K.EqualsToken && (ts.isObjectLiteralExpression(n.left) || ts.isArrayLiteralExpression(n.left))) return [n.right];
  if (ts.isHeritageClause(n)) return [...n.types];
  if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxClosingElement(n)) return [n.tagName];
  return [];
};
function alphaForm(S) {
  const unit = S.unit.node, index = new Map(), keep = new Set(), printed = new Set(), lexicalEnd = new Map();
  const declare = (id, observable) => {
    const sym = S.checker.getSymbolAtLocation(id);
    if (!sym) return false;
    if (!index.has(sym)) index.set(sym, index.size);
    if (observable) keep.add(sym);
    return true;
  };
  let ok = true;
  walk(unit, n => {
    for (const r of printedRoots(n)) walk(r, x => { if (ts.isIdentifier(x)) printed.add(x); });
    if (ts.isParameter(n) && ts.isIdentifier(n.name)) ok = declare(n.name, !!n.modifiers?.some(m => ts.isModifier(m) && m.kind !== K.Decorator) || n.name.text === 'this' || anonymousDefinition(n.initializer)) && ok;
    else if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)) {
      const list = n.parent, lexical = ts.isVariableDeclarationList(list) && (list.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const | ts.NodeFlags.Using | ts.NodeFlags.AwaitUsing));
      const inCase = lexical && ts.isVariableStatement(list.parent) && (ts.isCaseClause(list.parent.parent) || ts.isDefaultClause(list.parent.parent));
      ok = declare(n.name, anonymousDefinition(n.initializer) || inCase) && ok;
      const sym = S.checker.getSymbolAtLocation(n.name);
      if (lexical && sym) lexicalEnd.set(sym, n.end);
    } else if (ts.isBindingElement(n) && ts.isIdentifier(n.name)) ok = declare(n.name, ts.isObjectBindingPattern(n.parent) && !n.propertyName || anonymousDefinition(n.initializer)) && ok;
    else if (ts.isBinaryExpression(n) && [K.EqualsToken, K.BarBarEqualsToken, K.AmpersandAmpersandEqualsToken, K.QuestionQuestionEqualsToken].includes(n.operatorToken.kind) && ts.isIdentifier(skipWrappers(n.left)) && anonymousDefinition(n.right)) {
      const sym = S.checker.getSymbolAtLocation(skipWrappers(n.left)); if (sym) keep.add(sym);
    }
  });
  if (!ok) return null;
  // a lexical binding read where it may not be initialised keeps its name
  walk(unit, n => {
    if (!ts.isIdentifier(n)) return;
    const sym = S.checker.getSymbolAtLocation(n), end = sym && lexicalEnd.get(sym);
    if (end === undefined || sym.declarations?.some(d => d.name === n)) return;
    if (n.pos < end) keep.add(sym);
    for (let x = n.parent; x && x !== unit; x = x.parent) if (ts.isFunctionLike(x) && x.pos < end) keep.add(sym);
  });
  const replacements = new Map();
  walk(unit, n => {
    // a shorthand `{ x }` needs no rule: the checker resolves its name to the property, never to the binding
    if (!ts.isIdentifier(n) || printed.has(n)) return;
    const sym = S.checker.getSymbolAtLocation(n);
    if (sym && index.has(sym) && !keep.has(sym)) replacements.set(n, ['binding', index.get(sym)]);
  });
  return { text: tree(unit, replacements), renamable: [...index.keys()].filter(s => !keep.has(s)).length };
}
export function normalised(P, C, env) {
  const why = common(P,C,env) || sourceGuard(P,C);
  if (why) return no(why);
  // Only this unit changes; every other declaration, initializer and import must correspond.
  const context = S => tree(S.sf, new Map([[S.unit.node, ['unit', S.unit.name]]]));
  if (context(P) !== context(C)) return no('module outside the unit differs');
  const a = alphaForm(P), b = alphaForm(C);
  if (a && b && a.text === b.text) return yes('normalised', { normalFormSha256: hash(a.text), rewrites: ['binding-bijection'], environment: env.evidence ?? 'caller-established identical environment', contract: 'renamed bindings never printed by the engine, never a key, never a function name, never read before initialisation' });
  const p = normalForm(P), c = normalForm(C);
  if (!p || !c) return no('alpha forms differ and the primitive rewrite conditions are not established');
  if (p.text !== c.text) return no('certified normal forms differ');
  return yes('normalised', { normalFormSha256: hash(p.text), rewrites: [...new Set([...p.rules,...c.rules])], environment: env.evidence ?? 'caller-established identical environment', contract: 'total primitive expressions; no writes, aliases, callbacks or engine errors' });
}
export function congruence(P, C, env) {
  const why = common(P,C,env) || sourceGuard(P,C);
  if (why) return no(why);
  if (tree(P.unit.node) !== tree(C.unit.node)) return no('caller program points or arguments differ');
  const all = [topLevelFunctions(P.sf), topLevelFunctions(C.sf)];
  const reached = new Set(), visiting = new Set(), proofs = [], masks = [new Map(),new Map()], calls = [new Map(),new Map()];
  function prove(name) {
    if (visiting.has(name)) return false; // no circular summary premises
    if (reached.has(name)) return true;
    const us = all.map(m => m.get(name));
    if (us.some(u => !u || !ts.isFunctionDeclaration(u.fn))) return false;
    visiting.add(name);
    const sub = [];
    for (const [i,S] of [P,C].entries()) walk(us[i].body, n => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
        const g = all[i].get(n.expression.text);
        if (g && S.checker.getSymbolAtLocation(n.expression) === S.checker.getSymbolAtLocation(g.fn.name)) sub.push(g.name);
      }
    });
    for (const g of new Set(sub)) if (!prove(g)) return false;
    const ss = [P,C].map((S,i) => ({ ...S, unit: us[i] }));
    const forms = ss.map((S,i) => normalForm(S,calls[i]));
    if (!forms[0] || !forms[1]) return false; // empty effects, no alias-bearing parameter, no exceptional exit
    let proof;
    if (tree(us[0].node) === tree(us[1].node)) proof = { rung: 'parsed-equal', evidence: { unitTreeSha256: hash(tree(us[0].node)) } };
    else if (!sub.length && forms[0].text === forms[1].text) proof = { rung: 'normalised', evidence: { normalFormSha256: hash(forms[0].text), rewrites: forms[0].rules } };
    else return false;
    if (name !== P.unit.name) proofs.push({ unit: name, provedBy: proof.rung, evidence: proof.evidence, contract: { effects: [], aliases: 'primitive parameters and results only', exceptions: 'total; no exceptional exit' } });
    for (const [i,S] of [P,C].entries()) { masks[i].set(us[i].node,['proved-unit',name]); calls[i].set(S.checker.getSymbolAtLocation(us[i].fn.name),us[i]); }
    visiting.delete(name); reached.add(name); return true;
  }
  if (!prove(P.unit.name) || !proofs.length) return no('callee contract or proof missing (effects, alias, exceptions, recursion)');
  if (tree(P.sf,masks[0]) !== tree(C.sf,masks[1])) return no('unproved module context differs');
  if (!proofs.some(p => p.provedBy !== 'parsed-equal')) return no('no changed callee discharged');
  return yes('congruence', { callees: proofs, callerTreeSha256: hash(tree(P.unit.node)), environment: env.evidence ?? 'caller-established identical environment', contract: 'same ordered call sites and arguments; total primitive callee transitions' });
}
export function decideRungs(P,C,env) {
  const attempts = [];
  for (const rung of [parsedEqual,normalised,congruence]) {
    const result = rung(P,C,env);
    if (result.status === 'decided-equal') return result;
    attempts.push(result.why);
  }
  return no(attempts.join('; '));
}

// I/O boundary shared by check.mjs and pr.mjs. The three detectors above never read files,
// run code or invoke a solver. Imports on both sides must resolve in the SAME directory with
// identical compiler options, and the complete parsed module context is checked by each rung.
export function certifyCorrespondence({ parent, candidate, unit, project = true, adapters = null }) {
  if (!parent || !candidate || (adapters && Object.keys(adapters).length)) return no('missing side or adapted equality');
  try {
    if (path.dirname(path.resolve(parent)) !== path.dirname(path.resolve(candidate))) return no('different module resolution directories');
    const loaded = [parent,candidate].map(f => loadProgram(f,{project}));
    const [P,C] = loaded.map(S => ({ ...S, unit: topLevelFunctions(S.sf).get(unit) }));
    if (P.projectFile !== C.projectFile || JSON.stringify(P.program.getCompilerOptions()) !== JSON.stringify(C.program.getCompilerOptions())) return no('compiler environment differs');
    // A comment adapter changes the proposition, even though comments are trivia to the parser.
    if ([P,C].some(S => /lean-adapter/.test(S.sf.text))) return no('comment adapter');
    const env = { sameEnvironment: true, evidence: { resolutionDirectory: path.dirname(path.resolve(candidate)), project: P.projectFile, compilerOptionsSha256: hash(JSON.stringify(P.program.getCompilerOptions())) } };
    const result = decideRungs(P,C,env);
    if (result.status !== 'decided-equal') return result;
    return { ...result, certificate: { tool: 'lean-ts v3', unit, provedBy: result.rung,
      parent: { file: parent, sha256: hash(P.sf.text).slice(0,16) }, candidate: { file: candidate, sha256: hash(C.sf.text).slice(0,16) },
      tools: { node: process.version, typescript: ts.version }, lanes: { A: { verdict: 'PASS-proved', provedBy: result.rung, evidence: result.evidence } } } };
  } catch (e) { return no(`correspondence unavailable: ${e.name}: ${e.message}`); }
}
