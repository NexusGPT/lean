#!/usr/bin/env node
// lean-ts lint, version 2: refuses any function outside the TypeScript subset (see langs/ts/subset.md).
// Version 2 admits real idioms the translator can model: imports and module constants as externals,
// arrow-const functions, async functions whose awaited calls are externals, null as "absent", literal
// unions, destructuring, switch, optional chaining, template literals, Set and Map as values, the common
// array and string methods, integer division under Math.floor, and `%`. What stays refused is what no
// deterministic translation can model: any, casts, prototype access, dynamic keys, mutation of what the
// function does not own, effects reached through globals, throw, generics on the function itself.
// Usage: node lint.mjs <file.ts> [--changed <ranges.json>] [--json] [--project <tsconfig>|--no-project]
// Exit 0: every checked function is inside the subset. Exit 1: violations printed. Exit 2: usage error.
import fs from 'node:fs';
import path from 'node:path';
import { ts, loadProgram, lineOf, colOf, overlaps, hintsOf, topLevelFunctions, isArrayLike, unitOf, originOf, RESOLUTION_CODES } from '../common.mjs';

const K = ts.SyntaxKind;
const TF = ts.TypeFlags;

// globals that are effects or nondeterminism: never externals
const EFFECT_GLOBALS = {
  eval: 'dynamic-eval', Function: 'dynamic-eval', Date: 'nondeterminism', Math_random: 'nondeterminism',
  Object: 'prototype', Reflect: 'prototype', Proxy: 'prototype', Symbol: 'prototype', globalThis: 'global-read',
  console: 'effect', process: 'effect', window: 'effect', document: 'effect', fetch: 'effect', setTimeout: 'effect',
  setInterval: 'effect', require: 'effect', import: 'effect', localStorage: 'effect', crypto: 'nondeterminism',
};
// modules whose exports are effects by nature; everything else imported is an uninterpreted external
const EFFECT_MODULES = /^(node:.*|fs|fs\/promises|path|os|http|https|http2|net|dns|tls|child_process|cluster|worker_threads|process|stream|crypto|readline|zlib|util|events|timers|timers\/promises|axios|node-fetch|undici|got|ioredis|redis|pg|mysql2?|mongodb|mongoose|@prisma\/client|knex|typeorm|sequelize|nodemailer|ws|socket\.io|express|fastify|@nestjs\/.*|@aws-sdk\/.*|aws-sdk|@google-cloud\/.*|openai|@anthropic-ai\/.*|stripe|twilio)$/;
// pure library globals the translator models as externals (uninterpreted functions)
const PURE_GLOBALS = new Set(['String', 'Number', 'Boolean', 'Array', 'JSON', 'Buffer', 'Math', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'Set', 'Map', 'Promise', 'BigInt']);
const ARRAY_METHODS = new Set(['map', 'filter', 'reduce', 'some', 'every', 'find', 'findIndex', 'includes', 'indexOf', 'slice', 'concat', 'join', 'flatMap', 'flat', 'at', 'push', 'sort', 'reverse', 'entries', 'keys', 'values', 'forEach']);
const STRING_METHODS = new Set(['includes', 'startsWith', 'endsWith', 'trim', 'trimStart', 'trimEnd', 'toLowerCase', 'toUpperCase', 'slice', 'substring', 'indexOf', 'lastIndexOf', 'split', 'replace', 'replaceAll', 'padStart', 'padEnd', 'charAt', 'charCodeAt', 'codePointAt', 'at', 'localeCompare', 'normalize', 'repeat', 'match', 'test', 'concat']);
const SET_METHODS = new Set(['has', 'add', 'delete', 'size', 'values', 'keys', 'entries', 'forEach', 'clear']);
const MAP_METHODS = new Set(['has', 'get', 'set', 'delete', 'size', 'values', 'keys', 'entries', 'forEach', 'clear']);

export function lintFile(file, ranges = null, opts = {}) {
  const { sf, checker, diagnostics } = loadProgram(file, { project: opts.project ?? true });
  const out = [];
  const units = topLevelFunctions(sf);
  let current = null; // current unit's declaration statement, for locality tests
  let currentFn = null;
  let switchDepth = 0;
  let loopDepth = 0;
  const callbackStack = []; // the arrow functions being checked, innermost last
  const ownedHere = (decl) => { const cb = callbackStack[callbackStack.length - 1]; return !cb || (decl && decl.pos >= cb.pos && decl.end <= cb.end); };

  const v = (node, rule, msg) => {
    const pos = node.getStart(sf);
    out.push({ file, line: lineOf(sf, pos), col: colOf(sf, pos), rule, msg });
  };
  const tOf = (n) => checker.getTypeAtLocation(n);
  const isStr = (t) => !!(t.flags & TF.StringLike);
  const isNum = (t) => !!(t.flags & (TF.NumberLike | TF.BigIntLike));
  const isSetT = (t) => t.symbol?.name === 'Set' || t.symbol?.name === 'ReadonlySet';
  const isMapT = (t) => t.symbol?.name === 'Map' || t.symbol?.name === 'ReadonlyMap';
  const isPromiseT = (t) => t.symbol?.name === 'Promise';
  const isAny = (t) => !!(t.flags & (TF.Any | TF.Unknown));
  const isRecordish = (t) => !!(t.flags & (TF.Object | TF.Intersection)) && !isArrayLike(checker, t) && !isSetT(t) && !isMapT(t) && !isPromiseT(t);
  const hasStringIndex = (t) => !!(t.flags & TF.Object) && !!checker.getIndexInfoOfType(t, ts.IndexKind.String);
  const nonNull = (t) => (t.flags & TF.Union ? t.types.filter((x) => !(x.flags & (TF.Undefined | TF.Null))) : [t]);
  const isArrayExpr = (e) => nonNull(tOf(e)).every((t) => isArrayLike(checker, t));
  const isLitUnion = (t) => !!(t.flags & TF.Union) && nonNull(t).every((x) => x.flags & (TF.StringLiteral | TF.NumberLiteral | TF.BooleanLiteral | TF.StringLike | TF.NumberLike | TF.BooleanLike));

  // ---------- types (as the checker resolved them; syntax matters less in v2) ----------
  const seenTypes = new Set();
  function checkType(t, n, depth = 0) {
    if (depth > 6) return;
    const f = t.flags;
    if (f & (TF.Any | TF.Unknown)) return; // opaque: every operation on it is an uninterpreted external
    if (f & (TF.NumberLike | TF.BigIntLike | TF.BooleanLike | TF.StringLike | TF.Undefined | TF.Null | TF.Void | TF.Never)) return;
    if (f & TF.Union) {
      const parts = nonNull(t);
      if (isLitUnion(t)) return;
      if (parts.length === 1) return checkType(parts[0], n, depth + 1);
      // a discriminated union of records: each member must be a record
      if (parts.every((x) => (x.flags & (TF.Object | TF.Intersection)) && !isArrayLike(checker, x))) { parts.forEach((x) => checkType(x, n, depth + 1)); return; }
      if (parts.some((x) => x.flags & TF.Any)) return; // any absorbs the union
      return v(n, 'union-type', `union ${checker.typeToString(t)} is outside the subset`);
    }
    if (f & TF.TypeParameter) return v(n, 'generic', `type parameter ${checker.typeToString(t)} is outside the subset`);
    if (f & TF.Intersection) { for (const p of checker.getPropertiesOfType(t)) checkType(checker.getTypeOfSymbolAtLocation(p, n), n, depth + 1); return; }
    if (f & TF.Object) {
      if (checker.isTupleType(t)) { checker.getTypeArguments(t).forEach((a) => checkType(a, n, depth + 1)); return; }
      if (checker.isArrayType(t)) return checkType(checker.getTypeArguments(t)[0], n, depth + 1);
      if (isSetT(t) || isPromiseT(t)) { checker.getTypeArguments(t).forEach((a) => checkType(a, n, depth + 1)); return; }
      if (isMapT(t)) { checker.getTypeArguments(t).forEach((a) => checkType(a, n, depth + 1)); return; }
      if (checker.getSignaturesOfType(t, ts.SignatureKind.Call).length) {
        // a function value: its parameters and result must be translatable; it is called, never inspected
        for (const sg of checker.getSignaturesOfType(t, ts.SignatureKind.Call)) { sg.getParameters().forEach((p) => checkType(checker.getTypeOfSymbolAtLocation(p, n), n, depth + 1)); checkType(sg.getReturnType(), n, depth + 1); }
        return;
      }
      if (checker.getIndexInfoOfType(t, ts.IndexKind.String)) { checkType(checker.getIndexInfoOfType(t, ts.IndexKind.String).type, n, depth + 1); return; } // a dictionary
      const key = checker.typeToString(t);
      if (seenTypes.has(key)) return;
      seenTypes.add(key);
      for (const p of checker.getPropertiesOfType(t)) {
        const pt = checker.getTypeOfSymbolAtLocation(p, n);
        if (checker.getSignaturesOfType(pt, ts.SignatureKind.Call).length) continue; // methods on imported types become accessors the translator ignores
        checkType(pt, n, depth + 1);
      }
      return;
    }
    if (f & TF.EnumLike) return;
    return v(n, 'unsupported-type', `type ${checker.typeToString(t)} is not translatable`);
  }

  // ---------- identifier resolution ----------
  const inFunction = (decl) => { for (let p = decl; p; p = p.parent) if (p === current) return true; return false; };
  function checkIdent(id, asCallee = false) {
    const name = id.text;
    if (name === 'undefined') return;
    const o = originOf(checker, id, sf, current);
    if (o.kind === 'local' || o.kind === 'unit') return;
    if (o.kind === 'module' || o.kind === 'import' || o.kind === 'other' || o.kind === 'type') return; // externals
    if (o.kind === 'module-mutable') return v(id, 'global-read', `\`${name}\` is module state that can change; the subset reads constants only`);
    if (EFFECT_GLOBALS[name]) return v(id, EFFECT_GLOBALS[name], `\`${name}\` is outside the subset`);
    if (PURE_GLOBALS.has(name)) return;
    if (o.kind === 'global') return v(id, 'global-read', `global \`${name}\` is outside the subset`);
    return v(id, 'global-read', `\`${name}\` cannot be resolved`);
  }

  // ---------- statements ----------
  const isParam = (decl) => !!decl && ts.isParameter(decl);
  const declOf = (id) => originOf(checker, id, sf, current);

  function stmts(list) { for (const s of list) stmt(s); }
  function stmt(s) {
    switch (s.kind) {
      case K.Block: return stmts(s.statements);
      case K.EmptyStatement: return;
      case K.VariableStatement: {
        const list = s.declarationList;
        if (!(list.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const))) v(s, 'var', '`var` is outside the subset; use let or const');
        for (const d of list.declarations) varDecl(d);
        return;
      }
      case K.ExpressionStatement: return exprStmt(s.expression);
      case K.IfStatement:
        expr(s.expression); stmt(s.thenStatement); if (s.elseStatement) stmt(s.elseStatement); return;
      case K.ReturnStatement:
        if (!s.expression) { if (!returnsVoid()) v(s, 'bare-return', 'return needs a value'); return; }
        return expr(s.expression);
      case K.ForOfStatement: {
        if (s.awaitModifier) v(s, 'async', '`for await` is outside the subset');
        const init = s.initializer;
        if (!ts.isVariableDeclarationList(init) || init.declarations.length !== 1) v(s, 'destructuring', 'for-of binds one name or one pattern');
        const it = nonNull(tOf(s.expression));
        if (!it.every((t) => isArrayLike(checker, t) || isStr(t) || isSetT(t) || isMapT(t) || isAny(t) || isRecordish(t))) v(s.expression, 'for-of-non-array', 'for-of runs over arrays, strings, sets, maps and iterable values');
        expr(s.expression); loopDepth++; stmt(s.statement); loopDepth--; return;
      }
      case K.ForStatement: return forStmt(s);
      case K.WhileStatement: {
        const h = hintsOf(sf, s);
        if (!h.decreases) v(s, 'unbounded-loop', 'a while loop needs a bound: put `// @decreases <expr>` before it');
        expr(s.expression); loopDepth++; stmt(s.statement); loopDepth--; return;
      }
      case K.DoStatement: return v(s, 'do-while', 'do-while is outside the subset');
      case K.ForInStatement: return v(s, 'for-in', 'for-in reads dynamic property names');
      case K.BreakStatement: if (switchDepth > 0 || loopDepth > 0) return; return v(s, 'break-continue', 'break outside a loop or switch');
      case K.ContinueStatement: if (loopDepth > 0) return; return v(s, 'break-continue', 'continue outside a loop');
      case K.ThrowStatement: return expr(s.expression); // modelled as an uninterpreted result of the function
      case K.TryStatement: return v(s, 'try-catch', 'try/catch is outside the subset');
      case K.SwitchStatement: return switchStmt(s);
      case K.LabeledStatement: return v(s, 'label', 'labels are outside the subset');
      case K.FunctionDeclaration: return v(s, 'nested-function', 'nested functions are outside the subset');
      case K.ClassDeclaration: return v(s, 'class', 'classes are outside the subset');
      default: return v(s, 'unsupported-syntax', `statement ${ts.SyntaxKind[s.kind]} is outside the subset`);
    }
  }
  function returnsVoid() {
    const sig = currentFn && checker.getSignatureFromDeclaration(currentFn);
    const rt = sig && sig.getReturnType();
    const inner = rt && isPromiseT(rt) ? checker.getTypeArguments(rt)[0] : rt;
    return !!inner && !!(inner.flags & (TF.Void | TF.Undefined));
  }
  function switchStmt(s) {
    expr(s.expression);
    switchDepth++;
    for (const c of s.caseBlock.clauses) {
      if (ts.isCaseClause(c)) expr(c.expression);
      const body = c.statements;
      const last = body[body.length - 1];
      const ends = last && (ts.isReturnStatement(last) || ts.isBreakStatement(last) || ts.isThrowStatement(last) || ts.isContinueStatement(last) || ts.isBlock(last));
      if (body.length && !ends) v(c, 'switch-fallthrough', 'each case ends with return or break');
      stmts(body);
    }
    switchDepth--;
  }
  function bindingNames(name, outNames) {
    if (ts.isIdentifier(name)) { outNames.push(name); return; }
    for (const el of name.elements) {
      if (ts.isOmittedExpression(el)) continue;
      if (el.dotDotDotToken) { v(el, 'destructuring', 'rest patterns are outside the subset'); continue; }
      if (el.initializer) { v(el, 'destructuring', 'default values in patterns are outside the subset'); continue; }
      bindingNames(el.name, outNames);
    }
  }
  function varDecl(d) {
    const names = [];
    bindingNames(d.name, names);
    if (!d.initializer) return v(d, 'uninitialised', 'a variable needs an initial value');
    for (const n of names) {
      const t = tOf(n);
      checkType(t, n);
    }
    expr(d.initializer);
  }
  function exprStmt(e) {
    while (ts.isParenthesizedExpression(e)) e = e.expression;
    if (ts.isAwaitExpression(e)) return awaitExpr(e, true);
    if (ts.isBinaryExpression(e)) {
      const op = e.operatorToken.kind;
      if (op === K.EqualsToken || op === K.PlusEqualsToken || op === K.MinusEqualsToken || op === K.AsteriskEqualsToken) {
        const l = e.left;
        if (ts.isIdentifier(l)) {
          const o = declOf(l);
          if (o.kind !== 'local') v(l, 'global-mutation', `assignment to \`${l.text}\`, which this function does not own`);
          else if (isParam(o.decl)) v(l, 'param-assign', `parameter \`${l.text}\` is assigned; copy it to a local first`);
          else if (!ownedHere(o.decl)) v(l, 'closure-mutation', `\`${l.text}\` is declared outside this callback; a callback cannot change it`);
        } else if (ts.isElementAccessExpression(l) && ts.isIdentifier(l.expression) && isArrayExpr(l.expression)) {
          const o = declOf(l.expression);
          if (o.kind !== 'local' || isParam(o.decl)) v(l, 'index-assign', `index assignment into \`${l.expression.text}\`, which this function does not own`);
          else if (!ownedHere(o.decl)) v(l, 'closure-mutation', 'a callback cannot change an outer array');
          else if (op !== K.EqualsToken) v(l, 'index-assign', 'compound assignment on an element is outside the subset');
          expr(l.argumentExpression);
        } else if (ts.isPropertyAccessExpression(l)) {
          let root = l; while (ts.isPropertyAccessExpression(root)) root = root.expression;
          const o = ts.isIdentifier(root) ? declOf(root) : { kind: null };
          if (!ts.isIdentifier(root) || o.kind !== 'local' || isParam(o.decl)) v(l, 'property-assign', `assignment into \`${root.getText(sf)}\`, which this function does not own; records it owns are updated in place`);
          else if (!ownedHere(o.decl)) v(l, 'closure-mutation', 'a callback cannot change an outer record');
          else if (op !== K.EqualsToken) v(l, 'property-assign', 'compound assignment on a field is outside the subset');
        }
        else if (ts.isElementAccessExpression(l)) v(l, 'index-assign', 'arrays change by push on a local only');
        else v(l, 'unsupported-syntax', 'assignment target');
        return expr(e.right);
      }
      if (op === K.SlashEqualsToken || op === K.PercentEqualsToken) return v(e, 'division', 'compound division is outside the subset');
      if (op >= K.FirstAssignment && op <= K.LastAssignment) return v(e, 'unsupported-operator', 'assignment operator is outside the subset');
    }
    if ((ts.isPostfixUnaryExpression(e) || ts.isPrefixUnaryExpression(e)) && (e.operator === K.PlusPlusToken || e.operator === K.MinusMinusToken)) {
      if (!ts.isIdentifier(e.operand)) return v(e, 'unsupported-syntax', 'increment of a non-name');
      const o = declOf(e.operand);
      if (o.kind !== 'local') v(e, 'global-mutation', `update of \`${e.operand.text}\`, which this function does not own`);
      else if (isParam(o.decl)) v(e, 'param-assign', 'parameter is assigned; copy it to a local first');
      else if (!ownedHere(o.decl)) v(e, 'closure-mutation', 'a callback cannot change an outer variable');
      return;
    }
    if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression)) {
      const name = e.expression.name.text, r = e.expression.expression;
      const rt = tOf(r);
      const localOwned = ts.isIdentifier(r) && declOf(r).kind === 'local' && !isParam(declOf(r).decl) && ownedHere(declOf(r).decl);
      if (nonNull(rt).some(isAny)) return v(e, 'param-mutation', `.${name}() as a statement on an opaque value may mutate it`);
      if ((name === 'push' || name === 'unshift') && isArrayExpr(r)) {
        if (!localOwned) v(e, 'param-mutation', `${name} on \`${ts.isIdentifier(r) ? r.text : '…'}\`, which is not a local array`);
        if (e.arguments.length !== 1) v(e, 'unsupported-call', `${name} takes exactly one value (or one spread array)`);
        return e.arguments.forEach((a) => expr(ts.isSpreadElement(a) ? a.expression : a));
      }
      if ((name === 'add' || name === 'delete') && nonNull(rt).every(isSetT)) { if (!localOwned) v(e, 'param-mutation', 'set mutation on a non-local'); return e.arguments.forEach(expr); }
      if ((name === 'set' || name === 'delete') && nonNull(rt).every(isMapT)) { if (!localOwned) v(e, 'param-mutation', 'map mutation on a non-local'); return e.arguments.forEach(expr); }
      return v(e, 'unsupported-syntax', `.${name}() as a statement is outside the subset (only push, add, set, delete on a local)`);
    }
    return v(e, 'unsupported-syntax', 'only assignments, ++/--, push/add/set/delete on a local, and await may stand as statements');
  }
  function forStmt(s) {
    const i = s.initializer, c = s.condition, u = s.incrementor;
    let name = null;
    if (i && ts.isVariableDeclarationList(i) && (i.flags & ts.NodeFlags.Let) && i.declarations.length === 1 && ts.isIdentifier(i.declarations[0].name) && i.declarations[0].initializer) {
      name = i.declarations[0].name.text; expr(i.declarations[0].initializer);
    } else v(s, 'loop-form', 'for needs `let i = <expr>; i < <expr>; i++`');
    if (c && ts.isBinaryExpression(c) && ts.isIdentifier(c.left) && c.left.text === name && (c.operatorToken.kind === K.LessThanToken || c.operatorToken.kind === K.LessThanEqualsToken)) expr(c.right);
    else v(s, 'loop-form', 'for needs the condition `i < <expr>` or `i <= <expr>`');
    const okInc = u && ((ts.isPostfixUnaryExpression(u) || ts.isPrefixUnaryExpression(u)) && u.operator === K.PlusPlusToken && ts.isIdentifier(u.operand) && u.operand.text === name
      || ts.isBinaryExpression(u) && u.operatorToken.kind === K.PlusEqualsToken && ts.isIdentifier(u.left) && u.left.text === name && ts.isNumericLiteral(u.right) && u.right.text === '1');
    if (!okInc) v(s, 'loop-form', 'for needs the step `i++` or `i += 1`');
    const scan = (n) => {
      if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment && ts.isIdentifier(n.left) && n.left.text === name) v(n, 'loop-var-assign', 'the loop variable is assigned in the body');
      if ((ts.isPostfixUnaryExpression(n) || ts.isPrefixUnaryExpression(n)) && (n.operator === K.PlusPlusToken || n.operator === K.MinusMinusToken) && ts.isIdentifier(n.operand) && n.operand.text === name) v(n, 'loop-var-assign', 'the loop variable is assigned in the body');
      ts.forEachChild(n, scan);
    };
    scan(s.statement);
    loopDepth++; stmt(s.statement); loopDepth--;
  }

  // ---------- expressions ----------
  const ARITH = new Set([K.PlusToken, K.MinusToken, K.AsteriskToken, K.PercentToken]);
  const CMP = new Set([K.LessThanToken, K.LessThanEqualsToken, K.GreaterThanToken, K.GreaterThanEqualsToken]);
  const EQ = new Set([K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken]);
  const LOGIC = new Set([K.AmpersandAmpersandToken, K.BarBarToken, K.QuestionQuestionToken]);
  const isPrim = (t) => !!(t.flags & (TF.NumberLike | TF.BigIntLike | TF.StringLike | TF.BooleanLike | TF.Undefined | TF.Null | TF.EnumLike));

  function awaitExpr(e, asStatement = false) {
    if (!currentFn || !currentFn.modifiers?.some((m) => m.kind === K.AsyncKeyword)) return v(e, 'async', '`await` outside an async function');
    const inner = ts.isParenthesizedExpression(e.expression) ? e.expression.expression : e.expression;
    if (!ts.isCallExpression(inner)) return v(e, 'async', 'await applies to a call only');
    // the awaited call is an external (or a local async unit): its arguments are checked, the call itself is uninterpreted
    inner.arguments.forEach((a) => ts.isArrowFunction(a) || ts.isSpreadElement(a) ? v(a, 'unsupported-call', 'awaited call arguments are plain values') : expr(a));
    if (ts.isPropertyAccessExpression(inner.expression) && !ts.isIdentifier(inner.expression.expression)) { expr(inner.expression.expression); return; }
    const f = inner.expression;
    if (ts.isIdentifier(f)) return checkIdent(f, true);
    if (ts.isPropertyAccessExpression(f)) { if (f.questionDotToken) v(f, 'optional-chain', 'optional call'); return expr(f.expression); }
    return v(e, 'async', 'awaited callee form is outside the subset');
  }

  function expr(e) {
    switch (e.kind) {
      case K.Identifier: return checkIdent(e);
      case K.NumericLiteral: case K.BigIntLiteral: case K.StringLiteral: case K.TrueKeyword: case K.FalseKeyword: case K.NullKeyword: return;
      case K.NoSubstitutionTemplateLiteral: return;
      case K.TemplateExpression: return e.templateSpans.forEach((sp) => expr(sp.expression));
      case K.TaggedTemplateExpression: { // an uninterpreted function of its parts, keyed by the tag
        if (ts.isPropertyAccessExpression(e.tag)) expr(e.tag.expression); else if (!ts.isIdentifier(e.tag)) v(e, 'template', 'the tag must be a name');
        if (ts.isTemplateExpression(e.template)) e.template.templateSpans.forEach((sp) => expr(sp.expression));
        return;
      }
      case K.RegularExpressionLiteral: return; // an opaque constant: the same literal on both sides is the same value
      case K.ParenthesizedExpression: return expr(e.expression);
      case K.AsExpression: case K.TypeAssertionExpression: case K.SatisfiesExpression: {
        const tn = e.type;
        // `as T` is identity at run time: the translator keeps the value when the types agree and otherwise
        // passes it through an uninterpreted conversion, the same on both sides
        return expr(e.expression);
      }
      case K.NonNullExpression: return expr(e.expression); // absence becomes an uninterpreted value
      case K.PrefixUnaryExpression:
        if (e.operator === K.ExclamationToken || e.operator === K.MinusToken) return expr(e.operand);
        if (e.operator === K.PlusPlusToken || e.operator === K.MinusMinusToken) return v(e, 'update-expression', '++/-- is a statement only');
        if (e.operator === K.TildeToken) return v(e, 'bitwise', 'bitwise operators are outside the subset');
        return v(e, 'unary-coercion', 'unary + coerces; it is outside the subset');
      case K.PostfixUnaryExpression: return v(e, 'update-expression', '++/-- is a statement only');
      case K.TypeOfExpression: return expr(e.expression); // an uninterpreted read of the run-time type
      case K.DeleteExpression: return v(e, 'delete', '`delete` is outside the subset');
      case K.VoidExpression: return v(e, 'void', '`void` is outside the subset');
      case K.AwaitExpression: return awaitExpr(e);
      case K.YieldExpression: return v(e, 'generator', 'generators are outside the subset');
      case K.ThisKeyword: return v(e, 'this', '`this` is outside the subset');
      case K.SuperKeyword: return v(e, 'class', '`super` is outside the subset');
      case K.ClassExpression: return v(e, 'class', 'classes are outside the subset');
      case K.FunctionExpression: case K.ArrowFunction: return v(e, 'function-value', 'function values are allowed only as callbacks of array methods');
      case K.NewExpression: {
        const n = e.expression.getText(sf);
        if (n === 'Set' || n === 'Map' || n === 'RegExp') return e.arguments?.forEach(expr);
        if (n === 'Function') return v(e, 'dynamic-eval', '`new Function` is outside the subset');
        if (n === 'Date' && !e.arguments?.length) return v(e, 'nondeterminism', '`new Date()` reads the clock');
        if (n === 'Promise') return v(e, 'async', '`new Promise` is outside the subset');
        // any other constructor: an uninterpreted value built from its arguments (Error, a class, a library object)
        if (ts.isPropertyAccessExpression(e.expression)) expr(e.expression.expression);
        else if (ts.isIdentifier(e.expression) && EFFECT_GLOBALS[n] && EFFECT_GLOBALS[n] !== 'global-read') return v(e, EFFECT_GLOBALS[n], `\`new ${n}\` is outside the subset`);
        return argsOf(e);
      }
      case K.ConditionalExpression: expr(e.condition); expr(e.whenTrue); return expr(e.whenFalse);
      case K.BinaryExpression: return binary(e);
      case K.CallExpression: return call(e);
      case K.PropertyAccessExpression: return propAccess(e);
      case K.ElementAccessExpression: return elemAccess(e);
      case K.ArrayLiteralExpression:
        for (const el of e.elements) {
          if (ts.isSpreadElement(el)) { if (!isArrayExpr(el.expression) && !nonNull(tOf(el.expression)).every(isSetT)) v(el, 'spread', 'spread works on arrays and sets only'); expr(el.expression); }
          else if (ts.isOmittedExpression(el)) v(el, 'unsupported-syntax', 'array holes are outside the subset');
          else expr(el);
        }
        return;
      case K.ObjectLiteralExpression:
        e.properties.forEach((p) => {
          if (ts.isSpreadAssignment(p)) return expr(p.expression);
          if (ts.isShorthandPropertyAssignment(p)) return checkIdent(p.name);
          if (ts.isPropertyAssignment(p)) {
            if (ts.isComputedPropertyName(p.name)) v(p, 'dynamic-key', 'computed property names are outside the subset');
            return expr(p.initializer);
          }
          return v(p, 'unsupported-syntax', 'methods and accessors are outside the subset');
        });
        return;
      case K.SpreadElement: return v(e, 'spread', 'spread is allowed in array and record literals only');
      case K.CommaListExpression: return v(e, 'comma', 'the comma operator is outside the subset');
      default: return v(e, 'unsupported-syntax', `expression ${ts.SyntaxKind[e.kind]} is outside the subset`);
    }
  }

  const isFloorDiv = (n) => ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === 'Math' && (n.expression.name.text === 'floor' || n.expression.name.text === 'trunc');
  let floorDepth = 0;
  function binary(e) {
    const op = e.operatorToken.kind;
    if (op === K.EqualsToken || (op >= K.FirstAssignment && op <= K.LastAssignment)) return v(e, 'assignment-expression', 'assignment is a statement only');
    if (op === K.SlashToken) {
      const lt = tOf(e.left), rt = tOf(e.right);
      if (floorDepth === 0 && !(lt.flags & TF.BigIntLike)) return v(e, 'division', '`/` on numbers is real division; write Math.floor(a / b) for integer division');
      expr(e.left); return expr(e.right);
    }
    if (op === K.AsteriskAsteriskToken) return v(e, 'unsupported-operator', '`**` is outside the subset');
    if (op === K.EqualsEqualsToken || op === K.ExclamationEqualsToken) {
      const nul = (x) => x.kind === K.NullKeyword || (ts.isIdentifier(x) && x.text === 'undefined');
      if (nul(e.left) || nul(e.right)) { expr(e.left); return expr(e.right); } // `x == null` is the absence test
      return v(e, 'loose-equality', 'use === and !==');
    }
    if (op === K.InKeyword || op === K.InstanceOfKeyword) return v(e, 'in-instanceof', '`in` and `instanceof` read the prototype chain');
    if (op === K.CommaToken) return v(e, 'comma', 'the comma operator is outside the subset');
    if (!(ARITH.has(op) || CMP.has(op) || EQ.has(op) || LOGIC.has(op))) return v(e, 'bitwise', 'bitwise and shift operators are outside the subset');
    expr(e.left); expr(e.right);
    const lt = tOf(e.left), rt = tOf(e.right);
    if (op === K.PlusToken) {
      const ok = (isNum(lt) && isNum(rt)) || isStr(lt) || isStr(rt) || isAny(lt) || isAny(rt);
      if (!ok) v(e, 'mixed-types', '+ adds two numbers or joins to a string');
    }
    if (CMP.has(op) && (isStr(lt) || isStr(rt)) && !(isAny(lt) || isAny(rt))) v(e, 'string-order', 'string ordering is outside the subset');
    if (EQ.has(op)) {
      const prim = (t) => nonNull(t).every((x) => isPrim(x) || isAny(x));
      if (!prim(lt) || !prim(rt)) v(e, 'reference-equality', '=== on arrays and records compares references; compare fields');
    }
  }

  function call(e) {
    const f = e.expression;
    if (e.questionDotToken) v(e, 'optional-chain', 'optional calls are outside the subset');
    if (ts.isIdentifier(f)) {
      checkIdent(f, true);
      const o = declOf(f);
      if (o.kind === 'local') return argsOf(e); // a function-typed parameter or local
      if (o.kind === 'unit') {
        const u = units.get(f.text);
        if (u && u.params.length !== e.arguments.length) v(e, 'unsupported-call', `${f.text} takes ${u.params.length} arguments`);
        if (u && u.isAsync && !(e.parent && ts.isAwaitExpression(e.parent))) v(e, 'async', 'an async unit is called without await');
      }
      if (o.kind === 'unit') { e.arguments.forEach((a) => { if (ts.isSpreadElement(a)) v(a, 'spread', 'spread arguments are outside the subset'); else if (!ts.isArrowFunction(a)) expr(a); else v(a, 'function-value', 'a same-file function takes values, not callbacks'); }); return; }
      return argsOf(e);
    }
    if (ts.isPropertyAccessExpression(f)) {
      if (f.questionDotToken) return v(e, 'optional-chain', 'optional calls are outside the subset');
      const recv = f.expression, name = f.name.text;
      const rt = tOf(recv);
      if (ts.isIdentifier(recv) && recv.text === 'Math') {
        if (name === 'random') return v(e, 'nondeterminism', 'Math.random is outside the subset');
        if (name === 'floor' || name === 'trunc') { floorDepth++; e.arguments.forEach(expr); floorDepth--; return; }
        return e.arguments.forEach(expr);
      }
      if (ts.isIdentifier(recv) && PURE_GLOBALS.has(recv.text) && declOf(recv).kind === 'global') return argsOf(e);
      const parts = nonNull(rt);
      if (parts.some(isAny)) {
        // an opaque receiver: the call is an uninterpreted external of (receiver, arguments); no callbacks, no mutation names
        if (['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'set', 'add', 'delete', 'clear', 'fill', 'copyWithin'].includes(name)) return v(e, 'param-mutation', `.${name}() on an opaque value may mutate it`);
        expr(recv);
        return argsOf(e);
      }
      if (parts.every((t) => isArrayLike(checker, t)) && ARRAY_METHODS.has(name)) {
        if (name === 'forEach') return v(e, 'unsupported-call', 'forEach is an effect loop; use for-of');
        if (name === 'sort' || name === 'reverse') {
          // in place on a value nobody else holds (a literal, a spread copy, a call result): the result is a new sequence
          if (ts.isIdentifier(recv) || ts.isPropertyAccessExpression(recv) || ts.isElementAccessExpression(recv)) return v(e, 'param-mutation', `${name} mutates in place; sort a copy: [...xs].${name}()`);
          expr(recv); if (e.arguments[0]) callback(e.arguments[0], 2); return;
        }
        if (name === 'push') return v(e, 'param-mutation', 'push is a statement on a local only');
        expr(recv);
        const cbNames = { map: 1, filter: 1, some: 1, every: 1, find: 1, findIndex: 1, flatMap: 1, reduce: 2 };
        if (cbNames[name] !== undefined) {
          if (!e.arguments.length) return v(e, 'unsupported-call', `${name} needs a callback`);
          callback(e.arguments[0], cbNames[name]);
          if (name === 'reduce') { if (e.arguments.length !== 2) return v(e, 'unsupported-call', 'reduce needs a callback and an initial value'); expr(e.arguments[1]); }
          return;
        }
        return e.arguments.forEach((a) => ts.isArrowFunction(a) ? v(a, 'function-value', 'unexpected callback') : expr(a));
      }
      if (parts.every(isStr) && STRING_METHODS.has(name)) { expr(recv); return argsOf(e); }
      if (parts.every(isSetT) && SET_METHODS.has(name)) { if (name === 'forEach' || name === 'clear') return v(e, 'unsupported-call', `Set.${name} is outside the subset`); expr(recv); return e.arguments.forEach(expr); }
      if (parts.every(isMapT) && MAP_METHODS.has(name)) { if (name === 'forEach' || name === 'clear') return v(e, 'unsupported-call', `Map.${name} is outside the subset`); expr(recv); return e.arguments.forEach(expr); }
      // a method call on an external value (an imported object or a record with methods): uninterpreted
      if (ts.isIdentifier(recv)) { const o = declOf(recv); if (o.kind === 'import' || o.kind === 'other' || o.kind === 'module') return argsOf(e); }
      expr(recv);
      if (parts.every(isRecordish)) return argsOf(e); // a method of a record type (an interface with methods, a class instance): uninterpreted, keyed by the type
      return v(e, 'unsupported-call', `method .${name}() on ${checker.typeToString(rt)} is outside the subset`);
    }
    return v(e, 'unsupported-call', 'calls through computed callees are outside the subset');
  }
  function callback(a, arity) {
    if (!ts.isArrowFunction(a)) return v(a, 'callback-form', 'the callback must be an arrow function');
    if (a.modifiers?.some((m) => m.kind === K.AsyncKeyword)) v(a, 'async', 'async callbacks are outside the subset');
    if (arity !== null && (a.parameters.length > arity || a.parameters.some((p) => p.initializer || p.dotDotDotToken || p.questionToken))) v(a, 'callback-form', `the callback takes at most ${arity} plain parameter(s)`);
    for (const p of a.parameters) { const names = []; bindingNames(p.name, names); checkType(tOf(p.name), p); }
    callbackStack.push(a);
    const savedLoop = loopDepth, savedSwitch = switchDepth; loopDepth = 0; switchDepth = 0;
    try {
      if (ts.isBlock(a.body)) { const prev = current; stmts(a.body.statements); current = prev; }
      else expr(a.body);
    } finally { callbackStack.pop(); loopDepth = savedLoop; switchDepth = savedSwitch; }
  }
  // an argument list of an external, a local function value, a record method or an opaque receiver: values, or callbacks
  const argsOf = (e) => e.arguments.forEach((a) => ts.isSpreadElement(a) ? v(a, 'spread', 'spread arguments are outside the subset') : ts.isArrowFunction(a) ? callback(a, null) : expr(a));
  function propAccess(e) {
    const name = e.name.text;
    if (name === 'prototype' || name === '__proto__' || name === 'constructor') return v(e, 'prototype', `\`.${name}\` reaches the prototype chain`);
    const rt = tOf(e.expression);
    if (ts.isIdentifier(e.expression)) {
      const o = declOf(e.expression);
      if (o.kind === 'import' || o.kind === 'other' || o.kind === 'module' || (o.kind === 'global' && PURE_GLOBALS.has(e.expression.text))) return; // external member: uninterpreted accessor
      if (o.kind === 'global') return checkIdent(e.expression);
    }
    expr(e.expression);
    const parts = nonNull(rt);
    if (parts.some(isAny)) return; // a read on an opaque value: uninterpreted accessor
    if (name === 'length' && parts.every((t) => isArrayLike(checker, t) || isStr(t))) return;
    if (name === 'size' && parts.every((t) => isSetT(t) || isMapT(t))) return;
    for (const t of parts) {
      if (!isRecordish(t)) return v(e, 'unsupported-member', `property .${name} on ${checker.typeToString(t)} is outside the subset`);
      if (!checker.getPropertyOfType(t, name) && !hasStringIndex(t) && checker.getPropertiesOfType(t).length) return v(e, 'unsupported-member', `property .${name} is not declared on ${checker.typeToString(t)}`);
    }
  }
  function elemAccess(e) {
    expr(e.expression); expr(e.argumentExpression);
    const rt = tOf(e.expression), at = tOf(e.argumentExpression);
    const parts = nonNull(rt);
    if (parts.every(isStr) && isNum(at)) return; // s[i] is a char
    if (parts.every((t) => isArrayLike(checker, t)) && isNum(at)) return;
    if (parts.some(isAny) || isAny(at)) return; // opaque: uninterpreted
    if (parts.every(isRecordish) && ts.isStringLiteral(e.argumentExpression)) return; // r["field"]
    const litKeys = (t) => (t.flags & TF.Union ? t.types : [t]).every((x) => x.flags & TF.StringLiteral);
    if (parts.every(isRecordish) && litKeys(at)) {
      // r[k] with k from a finite set of literal keys: a chain of field reads
      const keys = (at.flags & TF.Union ? at.types : [at]).map((x) => x.value);
      const missing = keys.filter((k) => parts.some((t) => !checker.getPropertyOfType(t, k) && !hasStringIndex(t)));
      if (missing.length) return v(e, 'dynamic-key', `key ${missing.map((k) => JSON.stringify(k)).join(', ')} is not declared on ${checker.typeToString(rt)}`);
      return;
    }
    if (parts.every(hasStringIndex) && isStr(at)) return; // a dictionary read
    return v(e, 'dynamic-key', 'only arrays indexed by a number and strings indexed by a number are allowed; other keys are dynamic');
  }

  // ---------- top level ----------
  const checkedDiagSpans = [];
  for (const st of sf.statements) {
    const inScope = overlaps(sf, st, ranges);
    if (ts.isImportDeclaration(st) || ts.isImportEqualsDeclaration(st)) {
      // externals, except modules whose whole purpose is an effect: those cannot be a pure function of their arguments
      const spec = ts.isImportDeclaration(st) ? st.moduleSpecifier.text : (st.moduleReference.expression?.text ?? '');
      const typeOnly = ts.isImportDeclaration(st) && (st.importClause?.isTypeOnly || (st.importClause?.namedBindings && ts.isNamedImports(st.importClause.namedBindings) && st.importClause.namedBindings.elements.every((e) => e.isTypeOnly)));
      if (!typeOnly && EFFECT_MODULES.test(spec)) v(st, 'import', `module \`${spec}\` is an effect (I/O, process, network); its values cannot be modelled as pure externals`);
      continue;
    }
    if (ts.isTypeAliasDeclaration(st) || ts.isInterfaceDeclaration(st) || ts.isEnumDeclaration(st)) continue; // types are read through the checker
    const u = unitOf(st);
    if (u) {
      if (!inScope) continue;
      checkedDiagSpans.push(st);
      current = st; currentFn = u.fn;
      if (u.fn.asteriskToken) v(st, 'generator', 'generators are outside the subset');
      if (u.generics?.length) v(st, 'generic', 'generic functions are outside the subset');
      if (!u.body) v(st, 'unsupported-syntax', 'function without a body');
      const sig = checker.getSignatureFromDeclaration(u.fn);
      const rt = sig.getReturnType();
      const inner = isPromiseT(rt) ? checker.getTypeArguments(rt)[0] : rt;
      if (!u.isAsync && isPromiseT(rt)) v(st, 'promise', 'a Promise-returning function must be async');
      checkType(inner, u.typeNode ?? st);
      for (const p of u.params) {
        if (p.initializer || p.dotDotDotToken) v(p, 'param-form', 'parameters have no defaults and no rest');
        const names = []; bindingNames(p.name, names);
        checkType(tOf(p.name), p);
      }
      if (u.body) { if (ts.isBlock(u.body)) stmts(u.body.statements); else expr(u.body); }
      current = null; currentFn = null;
      continue;
    }
    if (ts.isExportDeclaration(st) || ts.isExportAssignment(st)) continue;
    if (ts.isVariableStatement(st)) {
      if (st.declarationList.flags & ts.NodeFlags.Const) { if (inScope) { checkedDiagSpans.push(st); /* module constants are externals; their initialisers are not checked */ } continue; }
      if (inScope) v(st, 'toplevel-state', 'module-level `let`/`var` is outside the subset');
      continue;
    }
    if (!inScope) continue;
    checkedDiagSpans.push(st);
    if (ts.isClassDeclaration(st)) v(st, 'class', 'classes are outside the subset');
    else v(st, 'toplevel-effect', 'code at module level runs on import; it is outside the subset');
  }
  // compiler diagnostics (strict mode) that fall inside a checked region; unresolved-module codes get their own rule
  for (const d of diagnostics) {
    if (d.file !== sf || d.start === undefined) continue;
    const hit = !ranges || checkedDiagSpans.some((n) => d.start >= n.getStart(sf) && d.start <= n.getEnd());
    if (!hit) continue;
    if (d.code === 7006 || d.code === 7031 || d.code === 7053) continue; // implicit any: opaque, admitted
    const rule = RESOLUTION_CODES.has(d.code) ? 'unresolved-module' : 'ts-strict';
    out.push({ file, line: lineOf(sf, d.start), col: colOf(sf, d.start), rule, msg: `TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}` });
  }
  out.sort((a, b) => a.line - b.line || a.col - b.col);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}` || path.resolve(process.argv[1] ?? '') === new URL(import.meta.url).pathname) {
  const args = process.argv.slice(2);
  const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--changed' && args[i - 1] !== '--project');
  if (!file) { console.error('usage: lint.mjs <file.ts> [--changed <ranges.json>] [--json] [--project <tsconfig>|--no-project]'); process.exit(2); }
  const ci = args.indexOf('--changed');
  let ranges = null;
  if (ci >= 0) {
    if (!args[ci + 1]) { console.error('--changed needs a file'); process.exit(2); }
    ranges = (await import('../common.mjs')).readRanges(fs, args[ci + 1]);
  }
  const pi = args.indexOf('--project');
  const project = args.includes('--no-project') ? false : pi >= 0 ? args[pi + 1] : true;
  const res = lintFile(file, ranges, { project });
  if (args.includes('--json')) console.log(JSON.stringify(res, null, 2));
  else for (const r of res) console.log(`${r.file}:${r.line}:${r.col}  ${r.rule}  ${r.msg}`);
  if (res.length) { if (!args.includes('--json')) console.log(`${res.length} violation(s)`); process.exit(1); }
  if (!args.includes('--json')) console.log(`${file}: inside the subset`);
  process.exit(0);
}
