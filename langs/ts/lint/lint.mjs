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
import { ts, loadProgram, lineOf, colOf, overlaps, hintsOf, topLevelFunctions, isArrayLike, unitOf, originOf, RESOLUTION_CODES, classMethodUnits } from '../common.mjs';
import { fileUsesReals } from '../common.mjs';
import { ADVICE } from './advice.mjs';

const K = ts.SyntaxKind;
const TF = ts.TypeFlags;

// globals that are effects or nondeterminism: never externals
// version 3: an effect is a world transition, so I/O, the clock, randomness and the console are admitted as effects;
// what stays out is dynamic code and the prototype chain, which no transition models
const EFFECT_GLOBALS = {
  eval: 'dynamic-eval', Function: 'dynamic-eval', Reflect: 'prototype', Proxy: 'prototype', globalThis: 'global-read', require: 'dynamic-eval', import: 'dynamic-eval',
};
const EFFECT_WORLD = new Set(['Date', 'console', 'process', 'window', 'document', 'fetch', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'localStorage', 'sessionStorage', 'crypto', 'queueMicrotask', 'structuredClone', 'Object', 'Promise', 'Intl', 'TextEncoder', 'TextDecoder', 'URL', 'URLSearchParams', 'AbortController', 'Error', 'TypeError', 'RangeError', 'Symbol']);
// modules whose exports are effects by nature; everything else imported is an uninterpreted external
const EFFECT_MODULES = /^(node:.*|fs|fs\/promises|path|os|http|https|http2|net|dns|tls|child_process|cluster|worker_threads|process|stream|crypto|readline|zlib|util|events|timers|timers\/promises|axios|node-fetch|undici|got|ioredis|redis|pg|mysql2?|mongodb|mongoose|@prisma\/client|knex|typeorm|sequelize|nodemailer|ws|socket\.io|express|fastify|@nestjs\/.*|@aws-sdk\/.*|aws-sdk|@google-cloud\/.*|openai|@anthropic-ai\/.*|stripe|twilio)$/;
// pure library globals the translator models as externals (uninterpreted functions)
const PURE_GLOBALS = new Set(['String', 'Number', 'Boolean', 'Array', 'JSON', 'Buffer', 'Math', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'Set', 'Map', 'BigInt', ...EFFECT_WORLD]);
const ARRAY_METHODS = new Set(['map', 'filter', 'reduce', 'some', 'every', 'find', 'findIndex', 'includes', 'indexOf', 'slice', 'concat', 'join', 'flatMap', 'flat', 'at', 'push', 'sort', 'reverse', 'entries', 'keys', 'values', 'forEach']);
const NUMBER_METHODS = new Set(['toFixed', 'toString', 'toPrecision', 'toExponential']);
const STRING_METHODS = new Set(['includes', 'startsWith', 'endsWith', 'trim', 'trimStart', 'trimEnd', 'toLowerCase', 'toUpperCase', 'slice', 'substring', 'indexOf', 'lastIndexOf', 'split', 'replace', 'replaceAll', 'padStart', 'padEnd', 'charAt', 'charCodeAt', 'codePointAt', 'at', 'localeCompare', 'normalize', 'repeat', 'match', 'test', 'concat']);
const SET_METHODS = new Set(['has', 'add', 'delete', 'size', 'values', 'keys', 'entries', 'forEach', 'clear']);
const MAP_METHODS = new Set(['has', 'get', 'set', 'delete', 'size', 'values', 'keys', 'entries', 'forEach', 'clear']);

export function lintFile(file, ranges = null, opts = {}) {
  // opts.loaded: a {sf, checker, diagnostics} already built (a census shares one program across a project)
  const { sf, checker, diagnostics } = opts.loaded ?? loadProgram(file, { project: opts.project ?? true });
  const out = [];
  const units = topLevelFunctions(sf);
  let current = null; // current unit's declaration statement, for locality tests
  let currentFn = null;
  let currentClass = null; // the class whose method is being checked; `this` is its receiver
  let forEachDepth = 0; // inside a forEach callback read as a loop body: a `return` ends one step
  let switchDepth = 0;
  let loopDepth = 0;
  const callbackStack = []; // the arrow functions being checked, innermost last
  const aliasLocals = new Set(); // declarations of locals bound to another name's object (an alias): never mutated here
  const MUT_NAMES = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'set', 'add', 'delete', 'clear', 'fill', 'copyWithin']);
  const ownedHere = (decl) => { const cb = callbackStack[callbackStack.length - 1]; return !cb || (decl && decl.pos >= cb.pos && decl.end <= cb.end); };

  const v = (node, rule, msg) => {
    const pos = node.getStart(sf), end = node.getEnd();
    out.push({ file, line: lineOf(sf, pos), col: colOf(sf, pos), endLine: lineOf(sf, end), endCol: colOf(sf, end), rule, msg, text: sf.text.slice(pos, end).slice(0, 200) });
  };
  const tOf = (n) => checker.getTypeAtLocation(n);
  const fileReal = fileUsesReals(sf); // a real file: `/` is real division, the translator's numbers are reals
  // a union of literals ("" | "-") is as much a string as `string` is
  const isStr = (t) => !!(t.flags & TF.StringLike) || (!!(t.flags & TF.Union) && t.types.length > 0 && t.types.every((x) => x.flags & TF.StringLike));
  const isNum = (t) => !!(t.flags & (TF.NumberLike | TF.BigIntLike)) || (!!(t.flags & TF.Union) && t.types.length > 0 && t.types.every((x) => x.flags & (TF.NumberLike | TF.BigIntLike)));
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
      return; // any other union is opaque (version 3): reads and operations on it are uninterpreted
    }
    if (f & TF.TypeParameter) return; // a type parameter: a value compared only by equality; reads on it go through its constraint
    if (f & (TF.IndexedAccess | TF.Conditional | TF.Substitution | TF.TemplateLiteral | TF.StringMapping | TF.Index | TF.ESSymbol | TF.UniqueESSymbol | TF.NonPrimitive)) return; // no value reading of its own: opaque
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
    if ((Object.hasOwn(EFFECT_GLOBALS, name) ? EFFECT_GLOBALS[name] : undefined)) return v(id, (Object.hasOwn(EFFECT_GLOBALS, name) ? EFFECT_GLOBALS[name] : undefined), `\`${name}\` is outside the subset`);
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
        if (forEachDepth > 0) { if (s.expression) expr(s.expression); return; } // one step of a forEach ends
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
        // with a bound it is translated; without one it becomes an opaque block (version 3), so its inside is still checked
        expr(s.expression); loopDepth++; stmt(s.statement); loopDepth--; return;
      }
      case K.DoStatement: { expr(s.expression); loopDepth++; stmt(s.statement); loopDepth--; return; } // `do B while (c)` is B then a while; without a bound it is an opaque block
      case K.ForInStatement: { // `for (const k in o)`: a loop over the keys of o, each a string
        const init = s.initializer;
        if (!(ts.isVariableDeclarationList(init) && init.declarations.length === 1 && ts.isIdentifier(init.declarations[0].name))) return v(s, 'for-in', 'for-in takes `const k`');
        expr(s.expression); loopDepth++; stmt(s.statement); loopDepth--; return;
      }
      case K.BreakStatement: if (switchDepth > 0 || loopDepth > 0) return; return v(s, 'break-continue', 'break outside a loop or switch');
      case K.ContinueStatement: if (loopDepth > 0) return; return v(s, 'break-continue', 'continue outside a loop');
      case K.ThrowStatement: return expr(s.expression); // modelled as an uninterpreted result of the function
      case K.TryStatement: {
        // an opaque block (version 3): its text names it; what it reads and writes are its inputs and outputs
        stmt(s.tryBlock);
        if (s.catchClause) { if (s.catchClause.variableDeclaration && !ts.isIdentifier(s.catchClause.variableDeclaration.name)) v(s.catchClause, 'destructuring', 'catch binds one name'); stmt(s.catchClause.block); }
        if (s.finallyBlock) stmt(s.finallyBlock);
        return;
      }
      case K.SwitchStatement: return switchStmt(s);
      case K.LabeledStatement: return v(s, 'label', 'labels are outside the subset');
      case K.FunctionDeclaration: { // a nested function declaration: a local function value, checked as a callback value
        if (s.asteriskToken) return v(s, 'generator', 'generators are outside the subset');
        if (!s.body) return;
        for (const p of s.parameters) { if (p.dotDotDotToken) v(p, 'param-form', 'rest parameters are outside the subset'); checkType(tOf(p.name), p); }
        callbackStack.push(s);
        const savedLoop = loopDepth, savedSwitch = switchDepth; loopDepth = 0; switchDepth = 0;
        try { const prev = current; stmts(s.body.statements); current = prev; } finally { callbackStack.pop(); loopDepth = savedLoop; switchDepth = savedSwitch; }
        return;
      }
      case K.ClassDeclaration: return v(s, 'class', 'classes are outside the subset');
      default: return v(s, 'unsupported-syntax', `statement ${ts.SyntaxKind[s.kind]} is outside the subset`);
    }
  }
  function returnsVoid() {
    const fn = callbackStack.length ? callbackStack[callbackStack.length - 1] : currentFn; // a bare return inside a callback is the callback's
    const sig = fn && checker.getSignatureFromDeclaration(fn);
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
      if (el.dotDotDotToken) { if (!ts.isArrayBindingPattern(name)) { v(el, 'destructuring', 'a rest pattern on a record is outside the subset'); continue; } bindingNames(el.name, outNames); continue; } // `[a, ...rest]`: the tail of the sequence
      if (el.initializer) { expr(el.initializer); } // `{ a = d }` / `[a = d]`: the default applies when the field is absent
      bindingNames(el.name, outNames);
    }
  }
  function varDecl(d) {
    const names = [];
    bindingNames(d.name, names);
    if (!d.initializer) {
      // `let x: T;` with a written type: TypeScript proves every read follows an assignment; the value before it is unobservable
      if (!ts.isIdentifier(d.name)) return v(d, 'uninitialised', 'a pattern needs an initial value');
      if (!d.type) return; // `let x;`: the type of its first assignment (an evolving let); TypeScript checks every read follows an assignment
      checkType(tOf(d.name), d.name); return;
    }
    for (const n of names) {
      const t = tOf(n);
      checkType(t, n);
    }
    { // `const u = user`, `const t = user.tags`, `const x = xs[i]`: another name for an object the function did not build
      let init = d.initializer; while (ts.isParenthesizedExpression(init) || ts.isNonNullExpression(init) || ts.isAsExpression(init)) init = init.expression;
      const ref = ts.isIdentifier(init) || ts.isPropertyAccessExpression(init) || ts.isElementAccessExpression(init);
      const objish = (t) => nonNull(t).some((x) => !isPrim(x) && !isAny(x));
      if (ref && ts.isIdentifier(d.name) && objish(tOf(d.name))) aliasLocals.add(d);
    }
    if (ts.isArrowFunction(d.initializer) && ts.isIdentifier(d.name)) return callback(d.initializer, null); // a local function value: a pure lambda, called by name or passed as a callback
    expr(d.initializer);
  }
  function exprStmt(e) {
    while (ts.isParenthesizedExpression(e)) e = e.expression;
    if (ts.isVoidExpression(e)) { e = e.expression; while (ts.isParenthesizedExpression(e)) e = e.expression; } // `void f()` as a statement is the call f()
    if (ts.isAwaitExpression(e)) return awaitExpr(e, true);
    if (ts.isDeleteExpression(e)) return expr(e); // `delete r.f` as a statement
    if (ts.isBinaryExpression(e)) {
      const op = e.operatorToken.kind;
      if (op === K.EqualsToken || op === K.PlusEqualsToken || op === K.MinusEqualsToken || op === K.AsteriskEqualsToken || op === K.QuestionQuestionEqualsToken || op === K.BarBarEqualsToken || op === K.AmpersandAmpersandEqualsToken) {
        const l = e.left;
        if (ts.isIdentifier(l)) {
          const o = declOf(l);
          if (o.kind !== 'local') v(l, 'global-mutation', `assignment to \`${l.text}\`, which this function does not own`);
          else if (isParam(o.decl)) v(l, 'param-assign', `parameter \`${l.text}\` is assigned; copy it to a local first`);
          else if (!ownedHere(o.decl)) v(l, 'closure-mutation', `\`${l.text}\` is declared outside this callback; a callback cannot change it`);
        } else if (ts.isElementAccessExpression(l) && ts.isIdentifier(l.expression) && (isArrayExpr(l.expression) || nonNull(tOf(l.expression)).every(hasStringIndex))) {
          // an element of a local array, or a key of a local dictionary (a record with a string index): the local is rebuilt
          const dict = !isArrayExpr(l.expression);
          const o = declOf(l.expression);
          if (o.kind !== 'local') v(l, 'index-assign', `index assignment into \`${l.expression.text}\`, which this function does not own`);
          else if (aliasLocals.has(o.decl)) v(l, 'alias-mutation', `\`${l.expression.text}\` is another name for a value this function was handed; change it through that name, or copy it first`);
          else if (!ownedHere(o.decl)) v(l, 'closure-mutation', `a callback cannot change an outer ${dict ? 'dictionary' : 'array'}`);
          else if (op !== K.EqualsToken) v(l, 'index-assign', 'compound assignment on an element is outside the subset');
          else if (dict && !nonNull(tOf(l.argumentExpression)).every(isStr)) v(l, 'dynamic-key', 'a dictionary key is a string');
          expr(l.argumentExpression);
        } else if (ts.isPropertyAccessExpression(l)) {
          let root = l; while (ts.isPropertyAccessExpression(root)) root = root.expression;
          if (root.kind === K.ThisKeyword) { if (l.expression.kind !== K.ThisKeyword) return v(l, 'receiver-mutation', 'assignment through a field of `this` changes a value the receiver holds; assign the field itself'); if (op !== K.EqualsToken && op !== K.PlusEqualsToken && op !== K.MinusEqualsToken && op !== K.AsteriskEqualsToken) return v(l, 'receiver-mutation', 'only =, +=, -=, *= on a field of `this`'); return; } // a field of the receiver: a world transition (the right side is checked below)
          const o = ts.isIdentifier(root) ? declOf(root) : { kind: null };
          if (!ts.isIdentifier(root) || o.kind !== 'local') v(l, 'property-assign', `assignment into \`${root.getText(sf)}\`, which this function does not own; records it owns are updated in place`);
          else if (aliasLocals.has(o.decl)) v(l, 'alias-mutation', `\`${root.text}\` is another name for a value this function was handed; change it through that name, or copy it first`);
          else if (!ownedHere(o.decl)) v(l, 'closure-mutation', 'a callback cannot change an outer record');
          else if (op !== K.EqualsToken && op !== K.PlusEqualsToken && op !== K.MinusEqualsToken && op !== K.AsteriskEqualsToken) v(l, 'property-assign', 'only =, +=, -=, *= on a field');
        }
        else if (ts.isElementAccessExpression(l)) v(l, 'index-assign', 'arrays change by push on a local only');
        else v(l, 'unsupported-syntax', 'assignment target');
        return expr(e.right);
      }
      if (op === K.SlashEqualsToken || op === K.PercentEqualsToken) return v(e, 'division', 'compound division is outside the subset');
      if (op >= K.FirstAssignment && op <= K.LastAssignment) return v(e, 'unsupported-operator', 'assignment operator is outside the subset');
    }
    if ((ts.isPostfixUnaryExpression(e) || ts.isPrefixUnaryExpression(e)) && (e.operator === K.PlusPlusToken || e.operator === K.MinusMinusToken)) {
      if (ts.isPropertyAccessExpression(e.operand) && e.operand.expression.kind === K.ThisKeyword && currentClass) return; // a field of the receiver: a world transition
      if (ts.isPropertyAccessExpression(e.operand)) { let r = e.operand; while (ts.isPropertyAccessExpression(r)) r = r.expression; const o = ts.isIdentifier(r) ? declOf(r) : { kind: null }; if (o.kind === 'local' && !aliasLocals.has(o.decl) && ownedHere(o.decl)) return; return v(e, 'property-assign', `update of a field of \`${r.getText(sf)}\`, which this function does not own`); }
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
      const localOwned = ts.isIdentifier(r) && declOf(r).kind === 'local' && ownedHere(declOf(r).decl) && !aliasLocals.has(declOf(r).decl);
      if (ts.isIdentifier(r) && declOf(r).kind === 'local' && aliasLocals.has(declOf(r).decl) && MUT_NAMES.has(name)) return v(e, 'alias-mutation', `\`${r.text}\` is another name for a value this function was handed; change it through that name, or copy it first`);
      if (ts.isPropertyAccessExpression(r) && r.expression.kind === K.ThisKeyword && currentClass) return argsOf(e); // a field of the receiver: the field lives in the world, the call is a transition
      if (nonNull(rt).some(isAny)) {
        // the call is a transition of the world; a later method call on the receiver is a transition too and sees it. A later
        // plain field read would not (reads are pure), so that is the one shape refused
        if (currentFn) {
          // a fresh value as receiver (a call result, an element) cannot be read again later: the call is a plain transition
          const rtext = (ts.isIdentifier(r) || ts.isPropertyAccessExpression(r) || r.kind === K.ThisKeyword) ? r.getText(sf) : null;
          if (rtext === null) return expr(e);
          let later = false; const walk = (x) => { if (later) return; if (x.getStart(sf) > e.getEnd() && ts.isPropertyAccessExpression(x) && x.expression.getText(sf) === rtext && !(x.parent && ts.isCallExpression(x.parent) && x.parent.expression === x)) later = true; ts.forEachChild(x, walk); };
          walk(currentFn.body);
          if (later) return v(e, 'opaque-mutation', `.${name}() on \`${rtext.slice(0, 40)}\` may change it, and \`${rtext.slice(0, 40)}\` is read later; read it before the call or through a method`);
          return expr(e);
        }
        return v(e, 'opaque-mutation', `.${name}() as a statement on an opaque value may mutate it; name the receiver first`);
      }
      // a path on a local or a parameter (user.tags): the owner of the root owns the path
      const pathRootOf = (x) => { while (ts.isPropertyAccessExpression(x)) x = x.expression; return x; };
      const pr = pathRootOf(r);
      const pathOwned = ts.isPropertyAccessExpression(r) && ts.isIdentifier(pr) && declOf(pr).kind === 'local' && ownedHere(declOf(pr).decl) && !aliasLocals.has(declOf(pr).decl);
      if (ts.isPropertyAccessExpression(r) && ts.isIdentifier(pr) && declOf(pr).kind === 'local' && aliasLocals.has(declOf(pr).decl) && MUT_NAMES.has(name)) return v(e, 'alias-mutation', `\`${pr.text}\` is another name for a value this function was handed; change it through that name, or copy it first`);
      if ((name === 'push' || name === 'unshift') && isArrayExpr(r)) {
        if (!localOwned && !pathOwned) v(e, 'param-mutation', `${name} on \`${r.getText(sf)}\`, which is not a local array`);
        if (e.arguments.length !== 1) v(e, 'unsupported-call', `${name} takes exactly one value (or one spread array)`);
        return e.arguments.forEach((a) => expr(ts.isSpreadElement(a) ? a.expression : a));
      }
      if ((name === 'add' || name === 'delete') && nonNull(rt).every(isSetT)) { if (!localOwned && !pathOwned) v(e, 'param-mutation', 'set mutation on a non-local'); return e.arguments.forEach(expr); }
      if ((name === 'set' || name === 'delete') && nonNull(rt).every(isMapT)) { if (!localOwned && !pathOwned) v(e, 'param-mutation', 'map mutation on a non-local'); return e.arguments.forEach(expr); }
      return expr(e); // a method call as a statement: a world transition (or a dropped value)
    }
    if (ts.isCallExpression(e) || ts.isNewExpression(e)) return expr(e);
    return v(e, 'unsupported-syntax', 'only assignments, ++/--, calls, and await may stand as statements');
  }
  function forStmt(s) {
    const i = s.initializer, c = s.condition, u = s.incrementor;
    let name = null;
    if (i && ts.isVariableDeclarationList(i) && (i.flags & ts.NodeFlags.Let) && i.declarations.length === 1 && ts.isIdentifier(i.declarations[0].name) && i.declarations[0].initializer) {
      name = i.declarations[0].name.text; expr(i.declarations[0].initializer);
    } else v(s, 'loop-form', 'for needs `let i = <expr>; i < <expr>; i++`');
    // the counter moves by a positive literal step, up (`<`, `<=`) or down (`>`, `>=`); the direction must match the step
    const up = u && (((ts.isPostfixUnaryExpression(u) || ts.isPrefixUnaryExpression(u)) && u.operator === K.PlusPlusToken && ts.isIdentifier(u.operand) && u.operand.text === name)
      || (ts.isBinaryExpression(u) && u.operatorToken.kind === K.PlusEqualsToken && ts.isIdentifier(u.left) && u.left.text === name && ts.isNumericLiteral(u.right) && Number(u.right.text) > 0));
    const down = u && (((ts.isPostfixUnaryExpression(u) || ts.isPrefixUnaryExpression(u)) && u.operator === K.MinusMinusToken && ts.isIdentifier(u.operand) && u.operand.text === name)
      || (ts.isBinaryExpression(u) && u.operatorToken.kind === K.MinusEqualsToken && ts.isIdentifier(u.left) && u.left.text === name && ts.isNumericLiteral(u.right) && Number(u.right.text) > 0));
    const ck = c && ts.isBinaryExpression(c) && ts.isIdentifier(c.left) && c.left.text === name ? c.operatorToken.kind : null;
    const condUp = ck === K.LessThanToken || ck === K.LessThanEqualsToken, condDown = ck === K.GreaterThanToken || ck === K.GreaterThanEqualsToken;
    if (condUp || condDown) expr(c.right);
    else v(s, 'loop-form', 'for needs the condition `i < <expr>`, `i <= <expr>`, `i > <expr>` or `i >= <expr>`');
    const okInc = (up && condUp) || (down && condDown);
    if (!okInc) v(s, 'loop-form', 'for needs the step `i++`, `i += k`, `i--` or `i -= k` (k a positive literal), in the direction of the condition');
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
  const isJsxNode = (x) => { while (ts.isParenthesizedExpression(x)) x = x.expression; return ts.isJsxElement(x) || ts.isJsxSelfClosingElement(x) || ts.isJsxFragment(x); };
  const isPrim = (t) => !!(t.flags & (TF.NumberLike | TF.BigIntLike | TF.StringLike | TF.BooleanLike | TF.Undefined | TF.Null | TF.EnumLike));

  function awaitExpr(e, asStatement = false) {
    const fnHere = callbackStack.length ? callbackStack[callbackStack.length - 1] : currentFn;
    if (!fnHere || !fnHere.modifiers?.some((m) => m.kind === K.AsyncKeyword)) return v(e, 'async', '`await` outside an async function');
    const inner = ts.isParenthesizedExpression(e.expression) ? e.expression.expression : e.expression;
    if (!ts.isCallExpression(inner)) return expr(inner); // awaiting a held promise: a transition of the world on that value
    // the awaited call is an external (or a local async unit): its arguments are checked, the call itself is uninterpreted
    inner.arguments.forEach((a) => ts.isSpreadElement(a) ? v(a, 'spread', 'spread arguments are outside the subset') : ts.isArrowFunction(a) ? callback(a, null) : expr(a));
    if (ts.isPropertyAccessExpression(inner.expression) && !ts.isIdentifier(inner.expression.expression)) { expr(inner.expression.expression); return; }
    const f = inner.expression;
    if (ts.isIdentifier(f)) return checkIdent(f, true);
    if (ts.isPropertyAccessExpression(f)) return expr(f.expression); // `await a?.m()`: the awaited call happens when a is present
    return v(e, 'async', 'awaited callee form is outside the subset');
  }

  function expr(e) {
    switch (e.kind) {
      case K.Identifier: return checkIdent(e);
      case K.NumericLiteral: case K.BigIntLiteral: case K.StringLiteral: case K.TrueKeyword: case K.FalseKeyword: case K.NullKeyword: return;
      case K.JsxElement: case K.JsxSelfClosingElement: case K.JsxFragment: return jsx(e);
      case K.JsxExpression: return e.expression ? expr(e.expression) : undefined;
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
      case K.DeleteExpression: {
        // `delete r.f` on an optional field, `delete m[k]` on a dictionary, on a local, a parameter or a field of this
        let t = e.expression; while (ts.isParenthesizedExpression(t)) t = t.expression;
        if (!(e.parent && ts.isExpressionStatement(e.parent))) return v(e, 'delete', '`delete` is a statement, not a value');
        if (ts.isElementAccessExpression(t)) { const r = t.expression; if (r.kind === K.ThisKeyword || (ts.isPropertyAccessExpression(r) && r.expression.kind === K.ThisKeyword && currentClass)) { expr(t.argumentExpression); return; } let root = r; while (ts.isPropertyAccessExpression(root)) root = root.expression; const o = ts.isIdentifier(root) ? declOf(root) : { kind: null }; if (o.kind !== 'local') return v(e, 'delete', `delete on \`${root.getText(sf)}\`, which this function does not own`); if (aliasLocals.has(o.decl)) return v(e, 'alias-mutation', `\`${root.text}\` is another name for a value this function was handed`); if (!nonNull(tOf(t.argumentExpression)).every(isStr)) return v(e, 'dynamic-key', 'a dictionary key is a string'); expr(t.argumentExpression); return; }
        if (ts.isPropertyAccessExpression(t)) { let root = t; while (ts.isPropertyAccessExpression(root)) root = root.expression; if (root.kind === K.ThisKeyword) return v(e, 'delete', 'delete of a field of this is outside the subset; assign undefined'); const o = ts.isIdentifier(root) ? declOf(root) : { kind: null }; if (o.kind !== 'local') return v(e, 'delete', `delete on \`${root.getText(sf)}\`, which this function does not own`); if (aliasLocals.has(o.decl)) return v(e, 'alias-mutation', `\`${root.text}\` is another name for a value this function was handed`); return; }
        return v(e, 'delete', 'delete of this target is outside the subset');
      }
      case K.VoidExpression: return v(e, 'void', '`void` is outside the subset');
      case K.AwaitExpression: return awaitExpr(e);
      case K.YieldExpression: return v(e, 'generator', 'generators are outside the subset');
      case K.ThisKeyword: if (currentClass) return; return v(e, 'this', '`this` outside a class method');
      case K.SuperKeyword: return v(e, 'class', '`super` is outside the subset');
      case K.ClassExpression: return v(e, 'class', 'classes are outside the subset');
      case K.FunctionExpression: case K.ArrowFunction: return callback(e, null); // a function value anywhere: checked as a callback value (its body in the subset; it may hold effects, then it is an opaque value by its text);
      case K.NewExpression: {
        const n = e.expression.getText(sf);
        if (n === 'Set' || n === 'Map' || n === 'RegExp') return e.arguments?.forEach(expr);
        if (n === 'Function') return v(e, 'dynamic-eval', '`new Function` is outside the subset');
        if (n === 'Promise') return v(e, 'async', '`new Promise` is outside the subset');
        // any other constructor: an uninterpreted value built from its arguments (Error, a class, a library object)
        if (ts.isPropertyAccessExpression(e.expression)) expr(e.expression.expression);
        else if (ts.isIdentifier(e.expression) && (Object.hasOwn(EFFECT_GLOBALS, n) ? EFFECT_GLOBALS[n] : undefined) && (Object.hasOwn(EFFECT_GLOBALS, n) ? EFFECT_GLOBALS[n] : undefined) !== 'global-read') return v(e, (Object.hasOwn(EFFECT_GLOBALS, n) ? EFFECT_GLOBALS[n] : undefined), `\`new ${n}\` is outside the subset`);
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
            if (ts.isComputedPropertyName(p.name)) { const lt = checker.getContextualType(e) ?? tOf(e); const dict = nonNull(lt).every((t) => !!(t.flags & TF.Object) && !!checker.getIndexInfoOfType(t, ts.IndexKind.String) && !checker.getPropertiesOfType(t).length); if (!dict) v(p, 'dynamic-key', 'a computed property name builds a dictionary; give the literal a Record<string, T> type'); else if (!nonNull(tOf(p.name.expression)).every(isStr)) v(p, 'dynamic-key', 'a dictionary key is a string'); else expr(p.name.expression); }
            if (ts.isArrowFunction(p.initializer)) return callback(p.initializer, null); // a handler in a record: a callback value
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
      if (floorDepth === 0 && !(lt.flags & TF.BigIntLike) && !fileReal) return v(e, 'division', '`/` on numbers is real division; write Math.floor(a / b) for integer division');
      expr(e.left); return expr(e.right);
    }
    if (op === K.AsteriskAsteriskToken) { expr(e.left); expr(e.right); return; } // a power: an uninterpreted function of both sides
    if (op === K.EqualsEqualsToken || op === K.ExclamationEqualsToken) {
      const nul = (x) => x.kind === K.NullKeyword || (ts.isIdentifier(x) && x.text === 'undefined');
      if (nul(e.left) || nul(e.right)) { expr(e.left); return expr(e.right); } // `x == null` is the absence test
      return v(e, 'loose-equality', 'use === and !==');
    }
    if (op === K.InKeyword || op === K.InstanceOfKeyword) { expr(e.left); if (op === K.InKeyword) expr(e.right); return; } // uninterpreted boolean tests (version 3)
    if (op === K.CommaToken) return v(e, 'comma', 'the comma operator is outside the subset');
    if (!(ARITH.has(op) || CMP.has(op) || EQ.has(op) || LOGIC.has(op))) return v(e, 'bitwise', 'bitwise and shift operators are outside the subset');
    expr(e.left); expr(e.right);
    if (LOGIC.has(op) && (isJsxNode(e.left) || isJsxNode(e.right))) return; // `cond && <X/>`: a conditional element
    const lt = tOf(e.left), rt = tOf(e.right);
    if (op === K.PlusToken) {
      const ok = (isNum(lt) && isNum(rt)) || isStr(lt) || isStr(rt) || isAny(lt) || isAny(rt);
      if (!ok) v(e, 'mixed-types', '+ adds two numbers or joins to a string');
    }
    if (CMP.has(op) && (isStr(lt) || isStr(rt)) && !(isAny(lt) || isAny(rt))) v(e, 'string-order', 'string ordering is outside the subset');
    if (EQ.has(op)) {
      const nul = (x) => x.kind === K.NullKeyword || (ts.isIdentifier(x) && x.text === 'undefined');
      const prim = (t) => nonNull(t).every((x) => isPrim(x) || isAny(x) || !!(x.flags & TF.TypeParameter)); // a type parameter is compared by value
      const litSide = (x) => ts.isStringLiteral(x) || ts.isNumericLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x) || x.kind === K.TrueKeyword || x.kind === K.FalseKeyword;
      // a comparison with a primitive on either side is a value comparison; only record against record (or array against array) compares references
      const mixed = (t) => { const ps = nonNull(t); return ps.some((x) => isPrim(x)) && ps.some((x) => !isPrim(x) && !isAny(x)); };
      if (mixed(lt) || mixed(rt)) v(e, 'mixed-types', 'a value that is sometimes a primitive and sometimes a record or array is opaque; narrow it before comparing');
      else if (!nul(e.left) && !nul(e.right) && !litSide(e.left) && !litSide(e.right) && !prim(lt) && !prim(rt)) v(e, 'reference-equality', '=== on arrays and records compares references; compare fields');
    }
  }

  function call(e) {
    const f = e.expression;
    if (e.questionDotToken) v(e, 'optional-chain', 'calling an optional function value is outside the subset');
    if (ts.isIdentifier(f)) {
      checkIdent(f, true);
      const o = declOf(f);
      if (o.kind === 'local') return argsOf(e); // a function-typed parameter or local
      if (o.kind === 'unit') {
        const u = units.get(f.text);
        if (u && !e.arguments.some(ts.isSpreadElement) && !u.params.some((p) => p.dotDotDotToken)) { const req = u.params.filter((p) => !p.initializer && !p.questionToken && !p.dotDotDotToken).length; if (e.arguments.length < req || e.arguments.length > u.params.length) v(e, 'unsupported-call', `${f.text} takes ${req === u.params.length ? req : `${req} to ${u.params.length}`} arguments`); }
        if (u && u.isAsync && !(e.parent && ts.isAwaitExpression(e.parent))) v(e, 'async', 'an async unit is called without await');
      }
      if (o.kind === 'unit') { const uRest = units.get(e.expression.text); const restOk = !!(uRest && uRest.params.some((p) => p.dotDotDotToken)); e.arguments.forEach((a, i) => { if (ts.isSpreadElement(a)) { if (restOk && i === uRest.params.length - 1 && isArrayExpr(a.expression)) expr(a.expression); else v(a, 'spread', 'a spread argument goes to a rest parameter, as the last argument'); } else if (!ts.isArrowFunction(a)) expr(a); else v(a, 'function-value', 'a same-file function takes values, not callbacks'); }); return; }
      return argsOf(e);
    }
    if (ts.isPropertyAccessExpression(f)) {
      // `a?.m()`: the call happens when a is present; the result is an Option (the receiver's type says whether it may be absent)
      const recv = f.expression, name = f.name.text;
      const rt = tOf(recv);
      if (recv.kind === K.ThisKeyword) { if (!currentClass) return v(e, 'this', '`this` outside a class method'); return argsOf(e); } // a method of this class, or a function-typed field
      if (ts.isIdentifier(recv) && recv.text === 'Math') {
        void 0; // Math.random is a world transition (version 3)
        if (name === 'floor' || name === 'trunc') { floorDepth++; e.arguments.forEach(expr); floorDepth--; return; }
        return e.arguments.forEach(expr);
      }
      if (ts.isIdentifier(recv) && PURE_GLOBALS.has(recv.text) && declOf(recv).kind === 'global') return argsOf(e);
      const parts = nonNull(rt);
      if (parts.some(isAny)) {
        // an opaque receiver: the call is an uninterpreted external of (receiver, arguments); no callbacks, no mutation names
        if (['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'set', 'add', 'delete', 'clear', 'fill', 'copyWithin'].includes(name) && e.parent && !ts.isExpressionStatement(e.parent)) { const own = ts.isIdentifier(recv) && declOf(recv).kind === 'local' && !isParam(declOf(recv).decl); return v(e, own ? 'opaque-mutation' : 'param-mutation', `.${name}() on \`${recv.getText(sf).slice(0, 40)}\`, an opaque value${own ? ' this function holds' : ''}, used as a value: the call may mutate it`); } // as a statement it is a transition (checked above)
        expr(recv);
        return argsOf(e);
      }
      if (parts.every((t) => isArrayLike(checker, t)) && ARRAY_METHODS.has(name)) {
        if (name === 'map' && e.arguments.length === 1 && ts.isArrowFunction(e.arguments[0]) && e.arguments[0].parameters.length === 1 && ts.isIdentifier(e.arguments[0].parameters[0].name) && underPromiseAll(e)) {
          const cb = e.arguments[0];
          checkType(tOf(cb.parameters[0].name), cb.parameters[0]);
          loopDepth++; forEachDepth++;
          try { if (ts.isBlock(cb.body)) stmts(cb.body.statements); else expr(cb.body); } finally { loopDepth--; forEachDepth--; }
          return;
        }
        if (name === 'forEach') {
          // `xs.forEach((x) => body)` is a loop over xs: the body is checked as a loop body (an outer local may change)
          const cb = e.arguments[0]; const r0 = e.expression.expression; const rt0 = tOf(r0);
          const iterable = isArrayExpr(r0) || nonNull(rt0).every((t) => isSetT(t) || isMapT(t)) || nonNull(rt0).some(isAny);
          if (e.arguments.length === 1 && ts.isArrowFunction(cb) && cb.modifiers?.some((m) => m.kind === K.AsyncKeyword)) return v(e, 'foreach', 'forEach does not wait for an async callback: the function returns before the steps finish; write `for (const x of xs)` and await inside');
          if (e.arguments.length === 1 && ts.isArrowFunction(cb) && cb.parameters.length === 1 && ts.isIdentifier(cb.parameters[0].name) && iterable) {
            checkType(tOf(cb.parameters[0].name), cb.parameters[0]);
            loopDepth++; forEachDepth++;
            try { if (ts.isBlock(cb.body)) stmts(cb.body.statements); else exprStmt(cb.body); } finally { loopDepth--; forEachDepth--; }
            return;
          }
          return v(e, 'foreach', 'forEach runs a callback for its effects; write `for (const x of xs)` so the state comes out of the loop, or pass an arrow with one parameter');
        }
        if (name === 'sort' || name === 'reverse') {
          // in place on a value nobody else holds (a literal, a spread copy, a call result): the result is a new sequence
          if (ts.isIdentifier(recv) || ts.isPropertyAccessExpression(recv) || ts.isElementAccessExpression(recv)) { const own = ts.isIdentifier(recv) && declOf(recv).kind === 'local' && !isParam(declOf(recv).decl); return v(e, own ? 'in-place-mutation' : 'param-mutation', own ? `${name} changes \`${recv.text}\` in place; write \`${recv.text} = [...${recv.text}].${name}(...)\`` : `${name} mutates in place; sort a copy: [...xs].${name}()`); }
          expr(recv); if (e.arguments[0]) callback(e.arguments[0], 2); return;
        }
        if (name === 'push') return v(e, 'param-mutation', 'push is a statement on a local only');
        expr(recv);
        const cbNames = { map: 2, filter: 2, some: 2, every: 2, find: 2, findIndex: 2, flatMap: 2, reduce: 2 }; // the element, and the index when the callback takes two parameters
        if (Object.hasOwn(cbNames, name)) {
          if (!e.arguments.length) return v(e, 'unsupported-call', `${name} needs a callback`);
          callback(e.arguments[0], cbNames[name]);
          if (name === 'reduce') { if (e.arguments.length !== 2) return v(e, 'unsupported-call', 'reduce needs a callback and an initial value'); expr(e.arguments[1]); }
          return;
        }
        return e.arguments.forEach((a) => ts.isArrowFunction(a) ? v(a, 'function-value', 'unexpected callback') : expr(a));
      }
      if (parts.every(isStr) && STRING_METHODS.has(name)) { expr(recv); return argsOf(e); }
      if (parts.every((t) => !!(t.flags & TF.NumberLike)) && NUMBER_METHODS.has(name)) { expr(recv); return argsOf(e); } // a formatting of a number: pure
      if (parts.every(isSetT) && SET_METHODS.has(name)) { if (name === 'forEach' || name === 'clear') return v(e, 'unsupported-call', `Set.${name} is outside the subset`); expr(recv); return e.arguments.forEach(expr); }
      if (parts.every(isMapT) && MAP_METHODS.has(name)) { if (name === 'forEach' || name === 'clear') return v(e, 'unsupported-call', `Map.${name} is outside the subset`); expr(recv); return e.arguments.forEach(expr); }
      // a method call on an external value (an imported object or a record with methods): uninterpreted
      if (ts.isIdentifier(recv)) { const o = declOf(recv); if (o.kind === 'import' || o.kind === 'other' || o.kind === 'module') return argsOf(e); }
      expr(recv);
      if (parts.every(isPromiseT) && ['then', 'catch', 'finally'].includes(name)) return argsOf(e); // a promise chain: an outside call; its handlers are opaque callbacks
      if (parts.every(isRecordish)) return argsOf(e); // a method of a record type (an interface with methods, a class instance): uninterpreted, keyed by the type
      return v(e, 'unsupported-call', `method .${name}() on ${checker.typeToString(rt)} is outside the subset`);
    }
    return v(e, 'unsupported-call', 'calls through computed callees are outside the subset');
  }
  // `.map(cb)` directly under an awaited `Promise.all(...)`: the callback is a loop body (its returns are collected values)
  const underPromiseAll = (call) => { let p = call.parent; while (p && ts.isParenthesizedExpression(p)) p = p.parent; if (!(p && ts.isCallExpression(p) && p.arguments[0] === call && ts.isPropertyAccessExpression(p.expression) && p.expression.name.text === 'all' && ts.isIdentifier(p.expression.expression) && p.expression.expression.text === 'Promise')) return false; let q = p.parent; while (q && ts.isParenthesizedExpression(q)) q = q.parent; return !!(q && ts.isAwaitExpression(q)); };
  function callback(a, arity) {
    if (ts.isIdentifier(a)) {
      // a named callback: a same-file function (not async, not a method) or a local function value
      const o = declOf(a); checkIdent(a, true);
      if (o.kind === 'unit') { const u = units.get(a.text); if (!u) return v(a, 'callback-form', 'a class method cannot be passed as a callback'); if (u.isAsync) return v(a, 'async', 'an async function cannot be a callback'); if (arity !== null && u.params.length > arity) return v(a, 'callback-form', `the callback takes at most ${arity} plain parameter(s)`); return; }
      if (o.kind === 'local') return;
      return v(a, 'callback-form', 'a callback is an arrow function, a same-file function or a local function value');
    }
    if (!ts.isArrowFunction(a)) return v(a, 'callback-form', 'the callback must be an arrow function');
    // arity null: a callback handed to an outside call or stored in a record, an opaque value keyed by its text; it may be async
    if (arity !== null && a.modifiers?.some((m) => m.kind === K.AsyncKeyword)) v(a, 'async', 'async callbacks are outside the subset');
    if (arity !== null && (a.parameters.length > arity || a.parameters.some((p) => p.initializer || p.dotDotDotToken || p.questionToken))) v(a, 'callback-form', `the callback takes at most ${arity} plain parameter(s)`);
    for (const p of a.parameters) { const names = []; bindingNames(p.name, names); checkType(tOf(p.name), p); }
    callbackStack.push(a);
    const savedLoop = loopDepth, savedSwitch = switchDepth; loopDepth = 0; switchDepth = 0;
    try {
      if (ts.isBlock(a.body)) { const prev = current; stmts(a.body.statements); current = prev; }
      else expr(a.body);
    } finally { callbackStack.pop(); loopDepth = savedLoop; switchDepth = savedSwitch; }
  }
  // JSX: an element is a value (a tag, a record of attributes, a list of children). A tag names a component or an
  // intrinsic element; a handler attribute is a callback value keyed by its text; every other attribute and every child
  // expression is an ordinary expression
  function jsx(e) {
    if (ts.isJsxFragment(e)) return e.children.forEach(jsxChild);
    const open = ts.isJsxSelfClosingElement(e) ? e : e.openingElement;
    const tag = open.tagName;
    if (ts.isIdentifier(tag) && /^[a-z]/.test(tag.text)) { /* an intrinsic element: a string */ }
    else if (ts.isIdentifier(tag)) { const o = declOf(tag); if (o.kind === 'local' && !isParam(o.decl) && !nonNull(tOf(tag)).every(isStr)) v(tag, 'unsupported-syntax', 'a local component value must be a string tag name or a named component'); }
    else if (!ts.isPropertyAccessExpression(tag) && !ts.isJsxNamespacedName(tag)) v(tag, 'unsupported-syntax', `tag form ${ts.SyntaxKind[tag.kind]} is outside the subset`);
    for (const a of open.attributes.properties) {
      if (ts.isJsxSpreadAttribute(a)) { expr(a.expression); continue; }
      const init = a.initializer;
      if (!init || ts.isStringLiteral(init)) continue;
      if (ts.isJsxExpression(init)) { const x = init.expression; if (!x) continue; if (ts.isArrowFunction(x) || ts.isFunctionExpression(x)) { if (ts.isArrowFunction(x)) callback(x, null); else v(x, 'callback-form', 'a handler is an arrow function'); } else expr(x); continue; }
      jsx(init);
    }
    if (ts.isJsxElement(e)) e.children.forEach(jsxChild);
  }
  function jsxChild(c) {
    if (ts.isJsxText(c)) return;
    if (ts.isJsxExpression(c)) { if (c.expression) expr(c.expression); return; }
    jsx(c);
  }
  // an argument list of an external, a local function value, a record method or an opaque receiver: values, or callbacks
  const argsOf = (e) => e.arguments.forEach((a) => ts.isSpreadElement(a) ? v(a, 'spread', 'spread arguments are outside the subset') : ts.isArrowFunction(a) ? callback(a, null) : expr(a));
  function propAccess(e) {
    const name = e.name.text;
    if (e.expression.kind === K.ThisKeyword) return; // a field or method of the receiver: read through an accessor
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
    if (parts.every(isRecordish) && isStr(at)) return; // a record read by a computed string key: an uninterpreted lookup of (record, key)
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
      void typeOnly; void spec; // version 3: every import is an external; a call into it is a world transition
      continue;
    }
    if (ts.isTypeAliasDeclaration(st) || ts.isInterfaceDeclaration(st) || ts.isEnumDeclaration(st)) continue; // types are read through the checker
    const u = unitOf(st);
    if (u) {
      if (!inScope) continue;
      checkedDiagSpans.push(st);
      current = st; currentFn = u.fn;
      if (u.fn.asteriskToken) v(st, 'generator', 'generators are outside the subset');
      if (!u.body) v(st, 'unsupported-syntax', 'function without a body');
      const sig = checker.getSignatureFromDeclaration(u.fn);
      const rt = sig.getReturnType();
      const inner = isPromiseT(rt) ? checker.getTypeArguments(rt)[0] : rt;
      if (!u.isAsync && isPromiseT(rt)) v(st, 'promise', 'a Promise-returning function must be async');
      checkType(inner, u.typeNode ?? st);
      for (const p of u.params) {
        if (p.dotDotDotToken && !isArrayExpr(p.name)) v(p, 'param-form', 'a rest parameter is an array');
        if (p.initializer) expr(p.initializer);
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
    if (ts.isClassDeclaration(st)) {
      if (!st.name) { v(st, 'class', 'an anonymous class is outside the subset'); continue; }
      // a class that extends another: inherited members are read through opaque accessors; `super` stays refused
      for (const u of classMethodUnits(st)) {
        if (!overlaps(sf, u.node, ranges)) continue;
        checkedDiagSpans.push(u.node);
        current = u.node; currentFn = u.fn; currentClass = st;
        if (u.fn.asteriskToken) v(u.node, 'generator', 'generators are outside the subset');
        const sig = checker.getSignatureFromDeclaration(u.fn);
        const rt = sig.getReturnType();
        const inner = isPromiseT(rt) ? checker.getTypeArguments(rt)[0] : rt;
        if (!u.isAsync && isPromiseT(rt)) v(u.node, 'promise', 'a Promise-returning method must be async');
        checkType(inner, u.typeNode ?? u.node);
        for (const p of u.params) {
          if (p.dotDotDotToken && !isArrayExpr(p.name)) v(p, 'param-form', 'a rest parameter is an array');
          if (p.initializer) expr(p.initializer);
          const names = []; bindingNames(p.name, names);
          checkType(tOf(p.name), p);
        }
        stmts(u.body.statements);
        current = null; currentFn = null; currentClass = null;
      }
      continue;
    }
    else if (ts.isExpressionStatement(st) && (ts.isStringLiteral(st.expression) || ts.isNoSubstitutionTemplateLiteral(st.expression))) continue; // a directive ("use client", "use strict") is not code
    else v(st, 'toplevel-effect', 'code at module level runs on import; it is outside the subset');
  }
  // compiler diagnostics (strict mode) that fall inside a checked region; unresolved-module codes get their own rule
  for (const d of diagnostics) {
    if (d.file !== sf || d.start === undefined) continue;
    const hit = !ranges || checkedDiagSpans.some((n) => d.start >= n.getStart(sf) && d.start <= n.getEnd());
    if (!hit) continue;
    if (d.code === 7006 || d.code === 7031 || d.code === 7053) continue; // implicit any: opaque, admitted
    if (d.code === 2339 || d.code === 2551) {
      // a property missing on a type that lives in node_modules: the dependency's version may differ from the commit's; the read is opaque
      const at = (function find(n) { if (d.start >= n.getStart(sf) && d.start < n.getEnd()) { let hit = n; ts.forEachChild(n, (c) => { const r = find(c); if (r) hit = r; }); return hit; } return null; })(sf);
      let pa = at; while (pa && !ts.isPropertyAccessExpression(pa)) pa = pa.parent;
      if (pa) { const rt = checker.getTypeAtLocation(pa.expression); const decl = rt.symbol?.declarations?.[0] ?? rt.aliasSymbol?.declarations?.[0]; if (decl && /node_modules/.test(decl.getSourceFile().fileName)) continue; }
    }
    const rule = RESOLUTION_CODES.has(d.code) ? 'unresolved-module' : 'ts-strict';
    const msg = `TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`;
    if (rule === 'ts-strict' && /JSX\.IntrinsicElements|JSX element implicitly has type 'any'|JSX element type/.test(msg)) continue; // missing React types: one environment cause; the JSX itself is already reported
    out.push({ file, line: lineOf(sf, d.start), col: colOf(sf, d.start), rule, msg, env: rule === 'unresolved-module' });
  }
  out.sort((a, b) => a.line - b.line || a.col - b.col);
  for (let i = out.length - 1; i > 0; i--) if (out[i].line === out[i - 1].line && out[i].col === out[i - 1].col && out[i].rule === out[i - 1].rule && out[i].msg === out[i - 1].msg) out.splice(i, 1);
  // the unit each finding sits in, and the advice for its rule
  const unitSpans = [...units.values()].map((u) => [u.name, lineOf(sf, u.node.getStart(sf)), lineOf(sf, u.node.getEnd())]);
  for (const st of sf.statements) for (const m of classMethodUnits(st)) unitSpans.push([m.name, lineOf(sf, m.node.getStart(sf)), lineOf(sf, m.node.getEnd())]);
  for (const f of out) { const u = unitSpans.find(([, a, b]) => a <= f.line && f.line <= b); f.unit = u ? u[0] : null; f.advice = ADVICE[f.rule] ?? null; }
  return out;
}

// A work list for a person or a coding agent: per function, every finding with the rule, the line, the text and what
// to write instead; then the order to take them in. Markdown.
export function agentReport(file, findings) {
  const byUnit = new Map();
  for (const f of findings) { const k = f.unit ?? '(module level)'; if (!byUnit.has(k)) byUnit.set(k, []); byUnit.get(k).push(f); }
  const lines = [`# lean: what keeps ${file} from being proved`, '', `${findings.length} finding(s) in ${byUnit.size} place(s). Each item is one construct the proof lane refuses; fix the item, rerun \`node langs/ts/lint/lint.mjs ${file} --agent\`, and the function is provable when its list is empty.`, ''];
  for (const [unit, fs] of byUnit) {
    lines.push(`## ${unit}`, '');
    for (const f of fs) {
      lines.push(`- [ ] line ${f.line}, \`${f.rule}\`: ${f.msg}`);
      if (f.text) lines.push(`      code: \`${f.text.replace(/\s+/g, ' ').slice(0, 120)}\``);
      if (f.advice) lines.push(`      do: ${f.advice}`);
    }
    lines.push('');
  }
  lines.push('## Order', '', '1. Mutations first (`param-mutation`, `closure-mutation`, `receiver-mutation`, `property-assign`, `index-assign`): they change the shape of the function.', '2. Then equality and arithmetic (`reference-equality`, `division`, `loose-equality`): local rewrites.', '3. Then anything the project cannot resolve (`ts-strict`, `unresolved-module`, `global-read`): types the proof needs.', '4. Rerun `node langs/ts/check.mjs --parent <old> --candidate <new> --unit <name>` and read the verdict, not the lint, as the result.', '');
  return lines.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}` || path.resolve(process.argv[1] ?? '') === new URL(import.meta.url).pathname) {
  const args = process.argv.slice(2);
  const file = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--changed' && args[i - 1] !== '--project');
  if (!file) { console.error('usage: lint.mjs <file.ts> [--changed <ranges.json>] [--json | --agent] [--project <tsconfig>|--no-project]'); process.exit(2); }
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
  else if (args.includes('--agent')) console.log(agentReport(file, res));
  else for (const r of res) console.log(`${r.file}:${r.line}:${r.col}  ${r.rule}  ${r.msg}`);
  if (res.length) { if (!args.includes('--json')) console.log(`${res.length} violation(s)`); process.exit(1); }
  if (!args.includes('--json')) console.log(`${file}: inside the subset`);
  process.exit(0);
}
