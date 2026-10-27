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
import { ts, loadProgram, lineOf, colOf, overlaps, hintsOf, topLevelFunctions, isArrayLike, unitOf, originOf, RESOLUTION_CODES, classMethodUnits, methodLiteralOf, receiverRecordPath } from '../common.mjs';
import { fileUsesReals } from '../common.mjs';
import { moduleState, moduleLoader, inertModuleInit, outsideRoot } from '../module-forms.mjs';
import { promiseForm, promiseConsumed, executorShape, unparen, isNativePromise } from '../promise-forms.mjs';
import { ADVICE, labelTag } from './advice.mjs';
import { reactHook, arrowOf, closureReads } from '../react.mjs';
import { generatorReading, asyncGenerator, immediateGeneratorConsumer } from '../generators.mjs';

const K = ts.SyntaxKind;
const TF = ts.TypeFlags;

// globals that are effects or nondeterminism: never externals
// version 3: an effect is a world transition, so I/O, the clock, randomness and the console are admitted as effects;
// what stays out is dynamic code and the prototype chain, which no transition models
const OBJECT_PROTOTYPE_FUNCTIONS = new Set(['getPrototypeOf', 'setPrototypeOf', 'create', 'defineProperty', 'defineProperties', 'getOwnPropertyDescriptor', 'getOwnPropertyDescriptors']);
const unparenX = (x) => { while (ts.isParenthesizedExpression(x)) x = x.expression; return x; };
const EFFECT_GLOBALS = {
  eval: 'dynamic-eval', Function: 'dynamic-eval', Reflect: 'prototype', Proxy: 'prototype',
};
const EFFECT_WORLD = new Set(['globalThis', 'global', 'Date', 'performance', 'console', 'process', 'window', 'document', 'fetch', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'setImmediate', 'clearImmediate', 'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback', 'localStorage', 'sessionStorage', 'crypto', 'queueMicrotask', 'structuredClone', 'Object', 'Promise', 'Intl', 'TextEncoder', 'TextDecoder', 'URL', 'URLSearchParams', 'AbortController', 'Error', 'TypeError', 'RangeError', 'Symbol']);
// modules whose exports are effects by nature; everything else imported is an uninterpreted external
const EFFECT_MODULES = /^(node:.*|fs|fs\/promises|path|os|http|https|http2|net|dns|tls|child_process|cluster|worker_threads|process|stream|crypto|readline|zlib|util|events|timers|timers\/promises|axios|node-fetch|undici|got|ioredis|redis|pg|mysql2?|mongodb|mongoose|@prisma\/client|knex|typeorm|sequelize|nodemailer|ws|socket\.io|express|fastify|@nestjs\/.*|@aws-sdk\/.*|aws-sdk|@google-cloud\/.*|openai|@anthropic-ai\/.*|stripe|twilio)$/;
// pure library globals the translator models as externals (uninterpreted functions)
const PURE_GLOBALS = new Set(['String', 'Number', 'Boolean', 'Array', 'JSON', 'Buffer', 'Math', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'decodeURI', 'encodeURIComponent', 'decodeURIComponent', 'structuredClone', 'Set', 'Map', 'BigInt', ...EFFECT_WORLD]);
const ARRAY_METHODS = new Set(['map', 'filter', 'reduce', 'some', 'every', 'find', 'findIndex', 'includes', 'indexOf', 'slice', 'concat', 'join', 'flatMap', 'flat', 'at', 'push', 'sort', 'reverse', 'entries', 'keys', 'values', 'forEach']);
const NUMBER_METHODS = new Set(['toFixed', 'toString', 'toPrecision', 'toExponential']);
const STRING_METHODS = new Set(['includes', 'startsWith', 'endsWith', 'trim', 'trimStart', 'trimEnd', 'toLowerCase', 'toUpperCase', 'slice', 'substring', 'indexOf', 'lastIndexOf', 'split', 'replace', 'replaceAll', 'padStart', 'padEnd', 'charAt', 'charCodeAt', 'codePointAt', 'at', 'localeCompare', 'normalize', 'repeat', 'match', 'test', 'concat']);
const SET_METHODS = new Set(['has', 'add', 'delete', 'size', 'values', 'keys', 'entries', 'forEach', 'clear']);
const MAP_METHODS = new Set(['has', 'get', 'set', 'delete', 'size', 'values', 'keys', 'entries', 'forEach', 'clear']);

// these argument-only library operations can fail even on correctly typed inputs
export function mayFaultPure(n, checker, sf) {
  const f = (ts.isCallExpression(n) || ts.isNewExpression(n)) ? n.expression : null;
  if (!f) return false;
  if (ts.isNewExpression(n)) return ts.isIdentifier(f) && ['URL', 'RegExp'].includes(f.text) && originOf(checker, f, sf, null).kind === 'global';
  if (ts.isIdentifier(f)) return ['BigInt', 'encodeURI', 'encodeURIComponent', 'decodeURI', 'decodeURIComponent'].includes(f.text) && originOf(checker, f, sf, null).kind === 'global';
  return ts.isPropertyAccessExpression(f) && ts.isIdentifier(f.expression) && f.expression.text === 'JSON' && ['parse', 'stringify'].includes(f.name.text) && originOf(checker, f.expression, sf, null).kind === 'global';
}

// throwing units and their callers share the outcome channel; ordinary callees keep their reading
export function exceptionUnitsOf(sf, checker, units = topLevelFunctions(sf)) {
  const out = new Set();
  const byDecl = new Map([...units.values()].map((u) => [u.fn, u.name]));
  const edges = new Map([...units.keys()].map((name) => [name, new Set()]));
  for (const u of units.values()) {
    if (!u.body) continue;
    const walk = (n) => {
      if (ts.isFunctionLike(n)) return;
      if (ts.isThrowStatement(n) || ts.isTryStatement(n) || mayFaultPure(n, checker, sf)) out.add(u.name);
      if (ts.isCallExpression(n) || ts.isNewExpression(n)) {
        const callee = byDecl.get(checker.getResolvedSignature(n)?.declaration);
        if (callee) edges.get(callee).add(u.name);
      }
      if (ts.isPropertyAccessExpression(n)) {
        const parent = n.parent;
        const assign = ts.isBinaryExpression(parent) && parent.left === n && parent.operatorToken.kind >= K.FirstAssignment && parent.operatorToken.kind <= K.LastAssignment;
        const update = (ts.isPrefixUnaryExpression(parent) || ts.isPostfixUnaryExpression(parent)) && [K.PlusPlusToken, K.MinusMinusToken].includes(parent.operator);
        for (const decl of checker.getSymbolAtLocation(n.name)?.declarations ?? []) {
          const reads = ts.isGetAccessorDeclaration(decl) && !(assign && parent.operatorToken.kind === K.EqualsToken);
          const writes = ts.isSetAccessorDeclaration(decl) && (assign || update);
          const callee = (reads || writes) && byDecl.get(decl);
          if (callee) edges.get(callee).add(u.name);
        }
      }
      ts.forEachChild(n, walk);
    };
    walk(u.body);
  }
  for (const name of out) for (const adjacent of edges.get(name)) out.add(adjacent);
  return out;
}

// a complex try retains its text-keyed transition; its callers are still admitted
export function opaqueExceptionTry(n, checker) {
  let opaque = false;
  const names = new Set();
  if (ts.isTryStatement(n)) {
    let fn = n.parent;
    while (fn && !ts.isFunctionLike(fn)) fn = fn.parent;
    const outside = (x) => {
      if (x === n || (ts.isFunctionLike(x) && x !== fn)) return;
      if ((ts.isParameter(x) || ts.isVariableDeclaration(x) || ts.isBindingElement(x)) && ts.isIdentifier(x.name)) names.add(x.name.text);
      ts.forEachChild(x, outside);
    };
    if (fn) outside(fn);
  }
  const hasCall = (x) => { let found = false; const w = (a) => { if (ts.isCallExpression(a) || ts.isNewExpression(a) || ts.isAwaitExpression(a) || (ts.isPropertyAccessExpression(a) && a.expression.kind === K.ThisKeyword)) found = true; ts.forEachChild(a, w); }; w(x); return found; };
  const walk = (x) => {
    if (opaque) return;
    if (ts.isIterationStatement(x, false) || ts.isFunctionLike(x)) { opaque = true; return; }
    if (ts.isCallExpression(x)) {
      const f = x.expression;
      if (ts.isPropertyAccessExpression(f) && ['map', 'flatMap', 'filter', 'reduce', 'forEach', 'some', 'every', 'find', 'findIndex', 'sort'].includes(f.name.text) && x.arguments.length) opaque = true;
      const d = checker.getResolvedSignature(x)?.declaration;
      if (d && (ts.isFunctionTypeNode(d) || ts.isCallSignatureDeclaration(d))) opaque = true;
    }
    if ((ts.isVariableDeclaration(x) || ts.isBindingElement(x)) && ts.isIdentifier(x.name)) {
      if (names.has(x.name.text)) opaque = true;
      names.add(x.name.text);
    }
    if ((ts.isConditionalExpression(x) && hasCall(x)) ||
        (ts.isBinaryExpression(x) && [K.AmpersandAmpersandToken, K.BarBarToken, K.QuestionQuestionToken, K.QuestionQuestionEqualsToken, K.BarBarEqualsToken, K.AmpersandAmpersandEqualsToken].includes(x.operatorToken.kind) && hasCall(x)) ||
        (ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && x.expression.questionDotToken && x.arguments.some(hasCall)) ||
        ((ts.isSwitchStatement(x) || ts.isCaseClause(x)) && hasCall(x.expression)) ||
        (ts.isBindingElement(x) && x.initializer && hasCall(x.initializer))) opaque = true;
    if (n.finallyBlock && ts.isReturnStatement(x) && x.expression) {
      const t = checker.getTypeAtLocation(x.expression);
      const parts = t.isUnion() ? t.types : [t];
      if (!parts.every((p) => p.flags & (TF.StringLike | TF.NumberLike | TF.BooleanLike | TF.BigIntLike | TF.Null | TF.Undefined | TF.Void | TF.Never))) opaque = true;
    }
    ts.forEachChild(x, walk);
  };
  walk(n);
  return opaque;
}

export function lintFile(file, ranges = null, opts = {}) {
  // opts.loaded: a {sf, checker, diagnostics} already built (a census shares one program across a project)
  const { sf, checker, diagnostics } = opts.loaded ?? loadProgram(file, { project: opts.project ?? true });
  const out = [];
  const units = topLevelFunctions(sf);
  const exceptionUnits = exceptionUnitsOf(sf, checker, units);
  const generators = generatorReading(checker, sf, units);
  let current = null; // current unit's declaration statement, for locality tests
  let currentFn = null;
  let currentClass = null; // the class whose method is being checked; `this` is its receiver
  let objectMethod = null;
  let thisParam = null; // the current free function's declared `this` parameter: its receiver operand, written and read like any parameter
  let forEachDepth = 0; // inside a forEach callback read as a loop body: a `return` ends one step
  let switchDepth = 0;
  let loopDepth = 0;
  const promiseCallbacks = new Set(); // inline promise bodies have their own fault channel
  const callbackStack = []; // the arrow functions being checked, innermost last
  const aliasLocals = new Set(); // declarations of locals bound to another name's object (an alias): never mutated here
  const MUT_NAMES = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'set', 'add', 'delete', 'clear', 'fill', 'copyWithin']);
  const ownedHere = (decl) => { const cb = callbackStack[callbackStack.length - 1]; return !cb || (decl && decl.pos >= cb.pos && decl.end <= cb.end); };
  // the Rules of React, as refusals: a unit that calls a hook is a render function (a component or a custom hook)
  const unitUsesHooks = () => { if (!currentFn?.body) return false; let found = false; const w = (n) => { if (found) return; if (ts.isCallExpression(n) && reactHook(checker, n)) { found = true; return; } ts.forEachChild(n, w); }; w(currentFn.body); return found; };
  const hasReturn = (n) => { let found = false; const w = (x) => { if (found) return; if (ts.isReturnStatement(x)) { found = true; return; } if (ts.isFunctionLike(x)) return; ts.forEachChild(x, w); }; w(n); return found; };
  // a hook call under a branch, a loop, a logical operator, a nested function, or after an earlier return of the render
  const hookOutOfOrder = (e) => {
    if (!currentFn?.body || !ts.isBlock(currentFn.body)) return false;
    let top = e; while (top.parent && top.parent !== currentFn.body) { const p = top.parent; if (ts.isIfStatement(p) || ts.isConditionalExpression(p) || ts.isForStatement(p) || ts.isForOfStatement(p) || ts.isForInStatement(p) || ts.isWhileStatement(p) || ts.isDoStatement(p) || ts.isSwitchStatement(p) || ts.isCatchClause(p) || ts.isArrowFunction(p) || ts.isFunctionExpression(p) || ts.isFunctionDeclaration(p) || (ts.isBinaryExpression(p) && [K.AmpersandAmpersandToken, K.BarBarToken, K.QuestionQuestionToken].includes(p.operatorToken.kind)) || (ts.isCallExpression(p) && p.questionDotToken)) return true; top = p; }
    for (const st of currentFn.body.statements) { if (st === top) break; if (ts.isReturnStatement(st) || ts.isThrowStatement(st) || (ts.isIfStatement(st) && hasReturn(st))) return true; }
    return false;
  };

  const enclosingOpaqueTry = (n) => {
    for (let p = n.parent; p; p = p.parent) if (ts.isTryStatement(p) && opaqueExceptionTry(p, checker)) return true;
    return false;
  };

  // the Object functions that reach the prototype chain or the property descriptors have no reading (research element 17: a prototype read reached PASS-bounded);
  // Object.assign writes into its first argument while the value reading returns a fresh record and leaves the target unchanged (research element 16); a fresh literal target is a copy and keeps its reading
  const objectCallRefusal = (e, r, name) => {
    if (!(ts.isIdentifier(r) && r.text === 'Object')) return null;
    if (name === 'create' && e.arguments.length === 1 && e.arguments[0].kind === K.NullKeyword) { const ct = checker.getContextualType(e); if (ct && hasStringIndex(ct) && checker.getPropertiesOfType(ct).length === 0) return null; } // `Object.create(null)` typed as a dictionary: the empty dictionary, nothing to inherit
    if (OBJECT_PROTOTYPE_FUNCTIONS.has(name)) return v(e, 'prototype', `\`Object.${name}\` reaches the prototype chain or the property descriptors; no transition models it`);
    if (name === 'freeze' || name === 'seal' || name === 'preventExtensions') return v(e, 'freeze', `\`Object.${name}\` makes a later write throw in strict code; the value reading has no fault for that write, so no transition models it yet`);
    if (name === 'assign' && !(e.arguments[0] && ts.isObjectLiteralExpression(unparenX(e.arguments[0])))) return v(e, 'assign-target', '`Object.assign` writes into its first argument; pass a fresh literal `{}` as the target or spread the sources into a new object');
    return null;
  };
  // site: the label of the advised rewrite as decided at this site ({ label, precondition }), for the rules that decide it
  const v = (node, rule, msg, site) => {
    const pos = node.getStart(sf), end = node.getEnd();
    out.push({ file, line: lineOf(sf, pos), col: colOf(sf, pos), endLine: lineOf(sf, end), endCol: colOf(sf, end), rule, msg, text: sf.text.slice(pos, end).slice(0, 200), ...(site ? { site } : {}) });
  };
  // eqeqeq: `==` is `===` when one side is `typeof x` against a string literal, both sides are literals of one primitive
  // type, or both operands have one static primitive type (a type parameter through its constraint) with no null or
  // undefined: the coercion table's identity row, where the translator writes == and === alike
  const litKind = (x) => { x = unparenX(x); if (ts.isPrefixUnaryExpression(x) && x.operator === K.MinusToken) x = x.operand; return ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x) ? 'string' : ts.isNumericLiteral(x) ? 'number' : (x.kind === K.TrueKeyword || x.kind === K.FalseKeyword) ? 'boolean' : null; };
  const eqKind = (t) => {
    const c = t.flags & TF.TypeParameter ? checker.getBaseConstraintOfType(t) : t;
    if (!c) return null;
    const kinds = new Set((c.flags & TF.Union ? c.types : [c]).map((x) => (x.flags & (TF.BigIntLike | TF.Null | TF.Undefined | TF.Void | TF.Any | TF.Unknown)) ? null : x.flags & TF.NumberLike ? 'number' : x.flags & TF.StringLike ? 'string' : x.flags & TF.BooleanLike ? 'boolean' : null));
    return kinds.size === 1 && !kinds.has(null) ? [...kinds][0] : null;
  };
  const eqeqeqSite = (e) => {
    const l = unparenX(e.left), r = unparenX(e.right);
    const typeofLit = (a, b) => ts.isTypeOfExpression(a) && litKind(b) === 'string';
    const proved = typeofLit(l, r) || typeofLit(r, l) || (!!litKind(l) && litKind(l) === litKind(r)) || (!!eqKind(tOf(l)) && eqKind(tOf(l)) === eqKind(tOf(r)));
    return proved ? { label: 'proved' } : { label: 'conditional', precondition: ADVICE['loose-equality'].precondition };
  };
  // no-useless-call: `f.bind(r, a)(b)` is `f(a, b)` when f is a same-file function with no `this` token (its parameters
  // included) and r is undefined, null or this; a bound value that is held, not called at once, differs from any
  // rewrite in identity, name, length and `new`
  const uselessCallSite = (e, u) => {
    let hasThis = false;
    const w = (x) => { if (hasThis) return; if (x.kind === K.ThisKeyword || (ts.isParameter(x) && ts.isIdentifier(x.name) && x.name.text === 'this')) { hasThis = true; return; } ts.forEachChild(x, w); };
    if (u?.fn) w(u.fn);
    const r = e.arguments[0] && unparenX(e.arguments[0]);
    const unused = !r || r.kind === K.NullKeyword || r.kind === K.ThisKeyword || (ts.isIdentifier(r) && r.text === 'undefined' && declOf(r).kind === 'global');
    let use = e; while (use.parent && ts.isParenthesizedExpression(use.parent)) use = use.parent;
    const calledAtOnce = !!use.parent && ts.isCallExpression(use.parent) && use.parent.expression === use;
    return { label: u?.fn && !hasThis && unused && calledAtOnce ? 'proved' : 'migration' };
  };
  // prefer-rest-params: `arguments` becomes `...args` when every use in its function (arrows inside included) is
  // `arguments.length` or `arguments[<integer literal>]` read as a value, and no parameter is reassigned (a sloppy-mode
  // `arguments` slot aliases its parameter; a rest array never does)
  const restParamsSite = (id) => {
    let fn = id.parent; while (fn && !(ts.isFunctionLike(fn) && !ts.isArrowFunction(fn))) fn = fn.parent;
    if (!fn?.body) return { label: 'migration' };
    const params = new Set(fn.parameters.flatMap((p) => ts.isIdentifier(p.name) ? [p.name.text] : []));
    const target = (x) => { const p = x.parent; return (ts.isBinaryExpression(p) && p.left === x && p.operatorToken.kind >= K.FirstAssignment && p.operatorToken.kind <= K.LastAssignment) || ((ts.isPrefixUnaryExpression(p) || ts.isPostfixUnaryExpression(p)) && [K.PlusPlusToken, K.MinusMinusToken].includes(p.operator)) || ts.isDeleteExpression(p); };
    let ok = true;
    const w = (x) => {
      if (!ok || (ts.isFunctionLike(x) && !ts.isArrowFunction(x))) return;
      if (ts.isIdentifier(x) && x.text === 'arguments' && !(x.parent && ts.isPropertyAccessExpression(x.parent) && x.parent.name === x)) {
        const p = x.parent;
        const length = ts.isPropertyAccessExpression(p) && p.expression === x && p.name.text === 'length';
        const index = ts.isElementAccessExpression(p) && p.expression === x && ts.isNumericLiteral(p.argumentExpression) && Number.isInteger(Number(p.argumentExpression.text));
        if (!(length || index) || target(p)) ok = false;
      }
      if (ts.isIdentifier(x) && params.has(x.text) && target(x)) ok = false;
      ts.forEachChild(x, w);
    };
    w(fn.body);
    return { label: ok ? 'proved' : 'migration' };
  };
  const tOf = (n) => checker.getTypeAtLocation(n);
  const localMethodLiteral = (t) => { const obj = methodLiteralOf(checker, t); return obj?.getSourceFile() === sf ? obj : null; };
  const methodLiteralPath = (n) => { for (;;) { if (localMethodLiteral(tOf(n))) return true; if (!(ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n) || ts.isParenthesizedExpression(n))) return false; n = n.expression; } };
  const fileReal = fileUsesReals(sf); // a real file: `/` is real division, the translator's numbers are reals
  // a union of literals ("" | "-") is as much a string as `string` is
  const isStr = (t) => !!(t.flags & TF.StringLike) || (!!(t.flags & TF.Union) && t.types.length > 0 && t.types.every((x) => x.flags & TF.StringLike));
  const isNum = (t) => !!(t.flags & (TF.NumberLike | TF.BigIntLike)) || (!!(t.flags & TF.Union) && t.types.length > 0 && t.types.every((x) => x.flags & (TF.NumberLike | TF.BigIntLike)));
  const numberOnly = (t) => (t.flags & TF.Union ? t.types : [t]).every((x) => !!(x.flags & TF.NumberLike));
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
    if (name === 'arguments' && originOf(checker, id, sf, current).kind === 'global') return v(id, 'arguments', '`arguments` is the actual argument vector, not the declared one; name the parameter, or declare a rest parameter', restParamsSite(id));
    const o = originOf(checker, id, sf, current);
    if (!asCallee && o.kind === 'unit' && exceptionUnits.has(name) && !enclosingOpaqueTry(id)) return v(id, 'exception-callback', 'call the throwing unit directly; a function value has no fault channel');
    if (o.kind === 'unit' && units.get(name)?.fn.asteriskToken && !asyncGenerator(units.get(name)) && !(id.parent && ts.isCallExpression(id.parent) && id.parent.expression === id)) return v(id, 'generator-use', 'consume a pure generator directly in for-of, spread, Array.from or yield*');
    if (o.kind === 'local' && localMethodLiteral(tOf(id)) && id.parent && ts.isCallExpression(id.parent) && id.parent.arguments.includes(id)) return v(id, 'object-method-mutation', 'pass a fresh literal handler or keep calls on the local object; sharing a named method object needs a heap');
    if (o.kind === 'local' || o.kind === 'unit') return;
    if (o.kind === 'module' || o.kind === 'import' || o.kind === 'other' || o.kind === 'type') return; // externals
    if (moduleState(checker, id, sf)) {
      if (!(ts.getCombinedNodeFlags(o.decl) & ts.NodeFlags.Const) && !inertModuleInit(o.decl.initializer)) v(id, 'toplevel-effect', 'move the effectful module initializer into a function');
      return;
    }
    if (o.kind === 'module-mutable') return v(id, 'global-read', `\`${name}\` is module state that can change; the subset reads constants only`);
    if (o.kind === 'global' && ['NaN', 'Infinity'].includes(name)) return v(id, 'number-special', 'the finite number model has no NaN or infinity; use lane B for special-value arithmetic');
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
        // for-await obtains each next value through the world, then runs one consumer step
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
      case K.ThrowStatement:
        if (callbackStack.length && !promiseCallbacks.has(callbackStack[callbackStack.length - 1]) && !callbackStack.at(-1).modifiers?.some((m) => m.kind === K.AsyncKeyword) && !enclosingOpaqueTry(s)) return v(s, 'exception-callback', 'move the throw to a same-file unit and call it directly');
        return expr(s.expression);
      case K.TryStatement: {
        // an opaque block (version 3): its text names it; what it reads and writes are its inputs and outputs
        stmt(s.tryBlock);
        if (s.catchClause) { if (s.catchClause.variableDeclaration && !ts.isIdentifier(s.catchClause.variableDeclaration.name)) v(s.catchClause, 'destructuring', 'catch binds one name'); stmt(s.catchClause.block); }
        if (s.finallyBlock) stmt(s.finallyBlock);
        return;
      }
      case K.SwitchStatement: return switchStmt(s);
      case K.LabeledStatement: {
        if (!(ts.isForStatement(s.statement) || ts.isForOfStatement(s.statement) || ts.isForInStatement(s.statement) || ts.isWhileStatement(s.statement) || ts.isDoStatement(s.statement))) return v(s, 'label', 'a label must name a loop; replace a labelled block with conditional control');
        return stmt(s.statement);
      }
      case K.FunctionDeclaration: { // a nested function declaration: a local function value, checked as a callback value
        if (s.asteriskToken) return v(s, 'generator', 'generators are outside the subset');
        if (!s.body) return;
        for (const p of s.parameters) { if (p.dotDotDotToken) v(p, 'param-form', 'rest parameters are outside the subset'); checkType(tOf(p.name), p); }
        callbackStack.push(s);
        const savedLoop = loopDepth, savedSwitch = switchDepth, savedEach = forEachDepth; loopDepth = 0; switchDepth = 0; forEachDepth = 0;
        try { const prev = current; stmts(s.body.statements); current = prev; } finally { callbackStack.pop(); loopDepth = savedLoop; switchDepth = savedSwitch; forEachDepth = savedEach; }
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
    return !!fn?.asteriskToken || (!!inner && !!(inner.flags & (TF.Void | TF.Undefined)));
  }
  function switchStmt(s) {
    expr(s.expression);
    switchDepth++;
    for (const c of s.caseBlock.clauses) {
      if (ts.isCaseClause(c)) expr(c.expression);
      const body = c.statements;
      stmts(body);
    }
    switchDepth--;
  }
  // a scalar record rest has no shallow reference aliases or unknown enumerable keys
  function recordRestShape(pattern, rest) {
    const src = tOf(pattern), dst = tOf(rest.name);
    const plain = (t) => !!(t.flags & TF.Object) && !(t.objectFlags & ts.ObjectFlags.Class) && !t.symbol?.declarations?.some((d) => ts.isClassDeclaration(d) || ts.isClassExpression(d)) && !isArrayLike(checker, t) && !checker.getIndexInfosOfType(t).length;
    const scalar = (t) => (t.flags & TF.Union ? t.types : [t]).every((x) => !!(x.flags & (TF.StringLike | TF.NumberLike | TF.BooleanLike | TF.BigIntLike | TF.Null | TF.Undefined)));
    if (!plain(src) || !plain(dst) || !ts.isIdentifier(rest.name)) return false;
    if (!checker.getPropertiesOfType(dst).length) return false;
    if (pattern.elements.some((el) => el.initializer || (!el.dotDotDotToken && (!ts.isIdentifier(el.name) || (el.propertyName && !ts.isIdentifier(el.propertyName) && !ts.isStringLiteral(el.propertyName)))))) return false;
    return checker.getPropertiesOfType(src).every((p) => !p.name.startsWith('__@') && !p.declarations?.some((d) => ts.isGetAccessorDeclaration(d) || ts.isSetAccessorDeclaration(d)) && scalar(checker.getTypeOfSymbolAtLocation(p, pattern)));
  }
  function bindingNames(name, outNames) {
    if (ts.isIdentifier(name)) { outNames.push(name); return; }
    if (ts.isObjectBindingPattern(name) && localMethodLiteral(tOf(name))) v(name, 'object-method-mutation', 'read named fields on the literal object; copying accessors or detached methods needs a receiver');
    for (const el of name.elements) {
      if (ts.isOmittedExpression(el)) continue;
      if (el.dotDotDotToken) { if (!ts.isArrayBindingPattern(name) && !recordRestShape(name, el)) { v(el, 'record-rest', 'record rest needs a fixed nonempty scalar record without defaults; copy named fields explicitly'); continue; } bindingNames(el.name, outNames); continue; } // `[a, ...rest]`: the tail of the sequence
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
  const outsideWriteStatement = (e) => { let x = e; while (x.parent && ts.isParenthesizedExpression(x.parent)) x = x.parent; return !!x.parent && ts.isExpressionStatement(x.parent); };
  function exprStmt(e) {
    if (ts.isYieldExpression(e)) return expr(e);
    while (ts.isParenthesizedExpression(e)) e = e.expression;
    if (ts.isVoidExpression(e)) { e = e.expression; while (ts.isParenthesizedExpression(e)) e = e.expression; } // `void f()` as a statement is the call f()
    if (ts.isAwaitExpression(e)) return awaitExpr(e, true);
    const assigned = ts.isBinaryExpression(e) && e.operatorToken.kind >= K.FirstAssignment && e.operatorToken.kind <= K.LastAssignment ? e.left : ts.isDeleteExpression(e) ? e.expression : null;
    if (assigned && !ts.isIdentifier(assigned)) { let root = assigned; while (ts.isPropertyAccessExpression(root) || ts.isElementAccessExpression(root) || ts.isParenthesizedExpression(root)) root = root.expression; if (methodLiteralPath(assigned)) return v(assigned, 'object-method-mutation', 'literal method fields are immutable; use a class for mutable receiver state'); }
    if (ts.isDeleteExpression(e)) return expr(e); // `delete r.f` as a statement
    if (ts.isBinaryExpression(e)) {
      const op = e.operatorToken.kind;
      if (op === K.EqualsToken || op === K.PlusEqualsToken || op === K.MinusEqualsToken || op === K.AsteriskEqualsToken || op === K.QuestionQuestionEqualsToken || op === K.BarBarEqualsToken || op === K.AmpersandAmpersandEqualsToken) {
        const l = e.left;
        if (ts.isIdentifier(l)) {
          const o = declOf(l);
          if (moduleState(checker, l, sf)) checkIdent(l);
          if (o.kind !== 'local' && !moduleState(checker, l, sf)) v(l, 'global-mutation', `assignment to \`${l.text}\`, which this function does not own`);
          else if (o.kind !== 'local' && ownedHere(o.decl) && unitUsesHooks()) v(l, 'render-impure', `a render function writes \`${l.text}\`, a variable outside it; move the write into an event handler or an effect`);
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
          if (root.kind === K.ThisKeyword && !thisParam) { if (objectMethod) return v(l, 'object-method-mutation', 'literal methods keep immutable data fields; use a class for mutable receiver state'); if (l.expression.kind !== K.ThisKeyword && !receiverRecordPath(checker, l)) return v(l, 'receiver-mutation', 'a receiver path needs nonoptional data records; assign a field itself for class or opaque handles'); if (op !== K.EqualsToken && op !== K.PlusEqualsToken && op !== K.MinusEqualsToken && op !== K.AsteriskEqualsToken) return v(l, 'receiver-mutation', 'only =, +=, -=, *= on a field of `this`'); return expr(e.right); } // a receiver write checks its right side, including exact promise forms
          const o = root.kind === K.ThisKeyword && thisParam ? { kind: 'local', decl: thisParam } : ts.isIdentifier(root) ? declOf(root) : { kind: null };
          if (localMethodLiteral(tOf(root))) return v(l, 'object-method-mutation', 'literal method fields are immutable; use a class for mutable receiver state');
          // a field of `process` (`process.exitCode = 1`, `process.env.K = v`): a write to the world, one transition after the
          // receiver and the value, as a read of that path is one; a plain `=` of a data value as a statement. Lane B records
          // these writes on its process fake; the other outside roots (globalThis, window) keep property-assign
          if (ts.isIdentifier(root) && root.text === 'process' && outsideRoot(checker, root, sf, current)) {
            if (op !== K.EqualsToken || !outsideWriteStatement(e)) { v(l, 'property-assign', `a field of \`${root.text}\` is written by a plain \`=\` statement; read the old value into a local first`); return expr(e.right); }
            if (nonNull(tOf(e.right)).some((t) => checker.getSignaturesOfType(t, ts.SignatureKind.Call).length)) { v(l, 'property-assign', `a function installed into \`${root.text}\` is called by the outside later; no transition reads that call`); return expr(e.right); }
            if (l.expression !== root) expr(l.expression);
            return expr(e.right);
          }
          if (!(ts.isIdentifier(root) || (root.kind === K.ThisKeyword && thisParam)) || o.kind !== 'local') v(l, 'property-assign', `assignment into \`${root.getText(sf)}\`, which this function does not own; records it owns are updated in place`);
          else if (aliasLocals.has(o.decl)) v(l, 'alias-mutation', `\`${root.text}\` is another name for a value this function was handed; change it through that name, or copy it first`);
          else if (!ownedHere(o.decl)) v(l, 'closure-mutation', 'a callback cannot change an outer record');
          else if (op !== K.EqualsToken && op !== K.PlusEqualsToken && op !== K.MinusEqualsToken && op !== K.AsteriskEqualsToken) v(l, 'property-assign', 'only =, +=, -=, *= on a field');
        }
        else if (ts.isElementAccessExpression(l)) v(l, 'index-assign', 'write a record field by name, or use a local Record<string, T> dictionary');
        else v(l, 'unsupported-syntax', 'assignment target');
        return expr(e.right);
      }
      if (op === K.SlashEqualsToken || op === K.PercentEqualsToken) return v(e, 'division', 'compound division is outside the subset');
      if (op >= K.FirstAssignment && op <= K.LastAssignment) return v(e, 'unsupported-operator', 'assignment operator is outside the subset');
    }
    if ((ts.isPostfixUnaryExpression(e) || ts.isPrefixUnaryExpression(e)) && (e.operator === K.PlusPlusToken || e.operator === K.MinusMinusToken)) {
      if (ts.isPropertyAccessExpression(e.operand)) { let root = e.operand; while (ts.isPropertyAccessExpression(root)) root = root.expression; if ((root.kind === K.ThisKeyword && objectMethod) || methodLiteralPath(e.operand)) return v(e, 'object-method-mutation', 'literal method fields are immutable; use a class for mutable receiver state'); if (root.kind === K.ThisKeyword && !thisParam && e.operand.expression.kind !== K.ThisKeyword) return receiverRecordPath(checker, e.operand) ? undefined : v(e, 'receiver-mutation', 'a receiver path needs nonoptional data records'); }
      if (ts.isPropertyAccessExpression(e.operand) && e.operand.expression.kind === K.ThisKeyword && currentClass) return; // a field of the receiver: a world transition
      if (ts.isPropertyAccessExpression(e.operand)) { let r = e.operand; while (ts.isPropertyAccessExpression(r)) r = r.expression; const o = r.kind === K.ThisKeyword && thisParam ? { kind: 'local', decl: thisParam } : ts.isIdentifier(r) ? declOf(r) : { kind: null }; if (o.kind === 'local' && !aliasLocals.has(o.decl) && ownedHere(o.decl)) return; return v(e, 'property-assign', `update of a field of \`${r.getText(sf)}\`, which this function does not own`); }
      if (!ts.isIdentifier(e.operand)) return v(e, 'unsupported-syntax', 'increment of a non-name');
      const o = declOf(e.operand);
      if (moduleState(checker, e.operand, sf)) checkIdent(e.operand);
      if (o.kind !== 'local' && !moduleState(checker, e.operand, sf)) v(e, 'global-mutation', `update of \`${e.operand.text}\`, which this function does not own`);
      else if (o.kind !== 'local' && ownedHere(o.decl) && unitUsesHooks()) v(e, 'render-impure', `a render function updates \`${e.operand.text}\`, a variable outside it; move the write into an event handler or an effect`);
      else if (isParam(o.decl)) v(e, 'param-assign', 'parameter is assigned; copy it to a local first');
      else if (!ownedHere(o.decl)) v(e, 'closure-mutation', 'a callback cannot change an outer variable');
      return;
    }
    if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression)) {
      const name = e.expression.name.text, r = e.expression.expression;
      const rt = tOf(r);
      if (name === 'assign' && ts.isIdentifier(r) && r.text === 'Object' && e.arguments.length >= 2) { // Object.assign(t, s…) as a statement on a record the function owns: t is rebuilt with every declared field of each source (the ordinary lane) or the Assign_ row (the heap core); a parameter target is an output
        const t0 = unparenX(e.arguments[0]);
        const ownedTarget = ts.isIdentifier(t0) && declOf(t0).kind === 'local' && ownedHere(declOf(t0).decl) && !aliasLocals.has(declOf(t0).decl);
        const plainRecord = (x) => { const t = tOf(x); if (!isRecordish(t) || nonNull(t).length !== 1 || t.flags & (TF.Null | TF.Undefined)) return false; return checker.getPropertiesOfType(t).every((p) => !(p.flags & (ts.SymbolFlags.GetAccessor | ts.SymbolFlags.SetAccessor | ts.SymbolFlags.Method))); };
        const targetProps = ownedTarget && plainRecord(t0) ? new Set(checker.getPropertiesOfType(tOf(t0)).map((p) => p.name)) : null;
        const sourcesFit = !!targetProps && e.arguments.slice(1).every((s) => plainRecord(s) && checker.getPropertiesOfType(tOf(s)).every((p) => targetProps.has(p.name)));
        if (ownedTarget && sourcesFit) { checkIdent(t0); return e.arguments.slice(1).forEach((a) => expr(a)); }
      }
      { const refused = objectCallRefusal(e, r, name); if (refused) return refused; }
      // a Date setter changes the Date in place; the value reading returns the number and leaves the Date unchanged (research element 16)
      // a Date setter is a method call like any other: a world transition (the Date's state lives in the world since the clock-read lane), so no refusal and no rebinding
      if (moduleState(checker, r, sf) && MUT_NAMES.has(name)) { checkIdent(r); return argsOf(e); }
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
        conditionalSpreadArgs(e);
        return e.arguments.forEach((a) => ts.isSpreadElement(a) ? spreadArray(a) : expr(a));
      }
      if ((name === 'shift' || name === 'reverse' || name === 'splice' || name === 'sort' || name === 'pop') && isArrayExpr(r)) { // the in-place rows of the library table, as statements whose result is dropped
        if (!localOwned && !pathOwned) v(e, 'param-mutation', `${name} on \`${r.getText(sf)}\`, which is not a local array`);
        if (name === 'pop' && e.arguments.length) v(e, 'unsupported-call', 'pop takes no argument');
        if (name === 'sort') { const cb = e.arguments[0]; if (e.arguments.length !== 1 || !ts.isArrowFunction(cb) || cb.parameters.length !== 2) return v(e, 'unsupported-call', 'sort as a statement needs one comparator, an arrow of two parameters (the default order compares strings)'); return callback(cb, 2); }
        if ((name === 'shift' || name === 'reverse') && e.arguments.length) v(e, 'unsupported-call', `${name} takes no argument`);
        if (name === 'splice' && (e.arguments.length < 2 || e.arguments.some(ts.isSpreadElement))) v(e, 'unsupported-call', 'splice as a statement needs a start, a count and plain items');
        return e.arguments.forEach((a) => expr(a));
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
    if (!i && !c && !u) { loopDepth++; stmt(s.statement); loopDepth--; return; }
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

  // the gate selects exact continuations; other existing forms keep their outside-call reading
  const promiseReadings = opts.promiseReadings ?? new Set();
  let opaquePromiseDepth = 0;
  function opaquePromise(read) { opaquePromiseDepth++; try { return read(); } finally { opaquePromiseDepth--; } }
  function readPromise(e, form) {
    if (form.kind !== 'executor' && (['race', 'allSettled', 'any'].includes(form.kind) || !promiseConsumed(e, checker, sf))) return false;
    const start = out.length, aliases = new Set(aliasLocals), types = new Set(seenTypes), selected = new Set(promiseReadings);
    readExactPromise(e, form);
    if (out.length === start) { promiseReadings.add(`${e.pos}:${e.end}`); return true; }
    if (form.kind === 'executor') return true; // constructors had no older reading to fall back to
    out.length = start;
    for (const [target, saved] of [[aliasLocals, aliases], [seenTypes, types], [promiseReadings, selected]]) { target.clear(); for (const value of saved) target.add(value); }
    return false;
  }
  function unsafePromiseCallee(u, seen = new Set()) {
    if (!u || seen.has(u.name)) return false;
    seen.add(u.name); let unsafe = false;
    const w = (x) => {
      if (ts.isThrowStatement(x) || (ts.isBinaryExpression(x) && x.operatorToken.kind >= K.FirstAssignment && x.operatorToken.kind <= K.LastAssignment) || (ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && MUT_NAMES.has(x.expression.name.text))) unsafe = true;
      if (ts.isCallExpression(x) && ts.isIdentifier(x.expression) && declOf(x.expression).kind === 'unit' && unsafePromiseCallee(units.get(x.expression.text), seen)) unsafe = true;
      ts.forEachChild(x, w);
    };
    w(u.body); return unsafe;
  }
  function promiseCallback(cb) {
    promiseCallbacks.add(cb);
    try { return callback(cb, null); } finally { promiseCallbacks.delete(cb); }
  }
  function promiseHandler(a, arity) {
    if (ts.isIdentifier(a)) {
      const o = declOf(a), u = units.get(a.text);
      const sg = checker.getSignaturesOfType(tOf(a), ts.SignatureKind.Call)[0];
      if (!sg || sg.typeParameters?.length || checker.getSignaturesOfType(tOf(a), ts.SignatureKind.Call).length !== 1 || sg.parameters.some((p) => p.valueDeclaration && ts.isParameter(p.valueDeclaration) && (p.valueDeclaration.dotDotDotToken || p.valueDeclaration.initializer || p.valueDeclaration.questionToken)) || sg.parameters.length > arity || (o.kind !== 'unit' && o.kind !== 'import' && o.kind !== 'other')) return v(a, 'promise-handler', 'use an arrow or a named same-file or imported function with at most one plain parameter');
      if (u) {
        if (unsafePromiseCallee(u) || u.params.some((p) => p.initializer || p.dotDotDotToken || p.questionToken || !ts.isIdentifier(p.name))) return v(a, 'promise-handler', 'inline a handler that throws or mutates so its fault and state are visible');
      }
      const rt = sg.getReturnType();
      if (isAny(rt) || (!isNativePromise(rt, checker) && checker.getPropertyOfType(rt, 'then'))) return v(a, 'promise-thenable', 'give a named handler a plain or native Promise return type');
      return checkIdent(a, true);
    }
    if (!ts.isArrowFunction(a) || a.typeParameters?.length || a.parameters.length > arity || a.parameters.some((p) => !ts.isIdentifier(p.name) || p.initializer || p.dotDotDotToken || p.questionToken)) return v(a, 'promise-handler', 'use an arrow with plain parameters');
    promiseBody(a.body);
    const values = (x) => { if (ts.isFunctionLike(x)) return; if (ts.isReturnStatement(x) && x.expression) promiseValueType(x.expression); ts.forEachChild(x, values); };
    if (ts.isBlock(a.body)) values(a.body); else promiseValueType(a.body);
    promiseCallback(a);
  }
  function promiseBody(body) {
    const w = (x) => {
      if (ts.isFunctionLike(x)) return;
      if (ts.isCallExpression(x) && ts.isIdentifier(x.expression) && declOf(x.expression).kind === 'unit' && unsafePromiseCallee(units.get(x.expression.text))) v(x, 'promise-handler', 'inline a same-file call that throws or mutates so its fault and state are visible');
      if (ts.isStatement(x) && ![K.Block, K.VariableStatement, K.ExpressionStatement, K.IfStatement, K.ReturnStatement, K.ThrowStatement, K.EmptyStatement].includes(x.kind)) v(x, 'promise-handler', 'use declarations, conditionals, calls, return and throw in an inline promise body');
      ts.forEachChild(x, w);
    };
    w(body);
  }
  function promiseValueType(e) {
    const t = tOf(e);
    if (isAny(t) || (!isNativePromise(t, checker) && checker.getPropertyOfType(t, 'then'))) v(e, 'promise-thenable', 'use a plain value or a statically typed native Promise; custom thenable adoption is not read');
  }
  function promiseValue(e) { promiseValueType(e); expr(e); }
  function readExactPromise(e, form) {
    if (!promiseConsumed(e, checker, sf)) return v(e, 'promise-pending', 'await or return the promise directly; a dangling or stored continuation leaves observable pending work');
    if (form.kind === 'executor') {
      const shape = executorShape(e, checker, sf);
      if (shape.rule) return v(e, shape.rule, shape.message);
      promiseBody(shape.cb.body);
      if (shape.bridge) {
        const f = shape.bridge.expression;
        if (ts.isIdentifier(f) && declOf(f).kind === 'unit') return v(e, 'promise-executor', 'a callback bridge must call an outside API');
      }
      const scan = (x) => { if (ts.isCallExpression(x)) { const st = shape.settlement(x); if (st?.kind === 'resolve' && x.arguments[0]) promiseValue(x.arguments[0]); } ts.forEachChild(x, scan); };
      scan(shape.cb.body);
      return promiseCallback(shape.cb);
    }
    if (form.kind === 'resolve' || form.kind === 'reject') {
      if (e.arguments.length > 1) return v(e, 'promise-handler', 'Promise.resolve and Promise.reject take at most one value');
      if (e.arguments[0]) return form.kind === 'resolve' ? promiseValue(e.arguments[0]) : expr(e.arguments[0]);
      return;
    }
    if (e.arguments.length !== 1 || !form.handler || e.questionDotToken || e.expression.questionDotToken) return v(e, 'promise-handler', 'use one explicit handler per link; use catch for rejection');
    expr(form.source);
    return promiseHandler(form.handler, form.kind === 'finally' ? 0 : 1);
  }
  function awaitExpr(e, asStatement = false) {
    const fnHere = callbackStack.length ? callbackStack[callbackStack.length - 1] : currentFn;
    if (!fnHere || !fnHere.modifiers?.some((m) => m.kind === K.AsyncKeyword)) return v(e, 'async', '`await` outside an async function');
    const inner = unparen(e.expression);
    const form = promiseForm(inner, checker, sf);
    if (form && !opaquePromiseDepth) { if (readPromise(inner, form)) return; return opaquePromise(() => awaitExpr(e, asStatement)); }
    if (ts.isCallExpression(inner) && ts.isPropertyAccessExpression(inner.expression) && ARRAY_METHODS.has(inner.expression.name.text) && nonNull(tOf(inner.expression.expression)).every((t) => isArrayLike(checker, t))) return call(inner);
    if (!ts.isCallExpression(inner)) return expr(inner); // awaiting a held promise: a transition of the world on that value
    // the awaited call is an external (or a local async unit): its arguments are checked, the call itself is uninterpreted
    if (inner.arguments.some(ts.isSpreadElement)) return call(inner);
    inner.arguments.forEach((a) => ts.isArrowFunction(a) ? callback(a, null) : expr(a));
    if (ts.isPropertyAccessExpression(inner.expression) && !ts.isIdentifier(inner.expression.expression)) { expr(inner.expression.expression); return; }
    const f = inner.expression;
    if (moduleLoader(checker, inner, sf, current)) return;
    if (ts.isIdentifier(f)) return checkIdent(f, true);
    if (ts.isPropertyAccessExpression(f)) return expr(f.expression); // `await a?.m()`: the awaited call happens when a is present
    return v(e, 'async', 'awaited callee form is outside the subset');
  }

  function checkStringLiterals(n) {
    if ((ts.isStringLiteral(n) || ts.isTemplateLiteralToken(n) || ts.isJsxText(n)) && /[\uD800-\uDFFF]/.test(n.text)) v(n, 'string-code-unit', 'use BMP scalar literals within the string model; astral and surrogate strings need lane B');
    ts.forEachChild(n, checkStringLiterals);
  }
  // value steps keep the statement ownership checks and reject conditional execution
  function operatorContext(e) {
    for (let p = e.parent, child = e; p && !ts.isFunctionLike(p); child = p, p = p.parent) {
      const logical = ts.isBinaryExpression(p) && [K.AmpersandAmpersandToken, K.BarBarToken, K.QuestionQuestionToken, K.QuestionQuestionEqualsToken, K.BarBarEqualsToken, K.AmpersandAmpersandEqualsToken].includes(p.operatorToken.kind);
      let closure = false;
      if (ts.isCallExpression(p) || ts.isArrayLiteralExpression(p) || ts.isObjectLiteralExpression(p)) { const w = (n) => { if (ts.isFunctionLike(n)) { closure = true; return; } ts.forEachChild(n, w); }; w(p); }
      const optionalCall = ts.isCallExpression(p) && ts.isPropertyAccessExpression(p.expression) && p.expression.questionDotToken;
      if ((logical && child === p.right) || (ts.isConditionalExpression(p) && child !== p.condition) || p.questionDotToken || optionalCall || closure || (ts.isNewExpression(p) && child === p.expression) || (ts.isTaggedTemplateExpression(p) && child === p.tag) || ts.isBindingElement(p) || ts.isParameter(p) || ts.isCaseClause(p) || ts.isJsxExpression(p) || (ts.isForStatement(p) && child !== p.statement)) {
        v(e, 'operator-value-context', 'move this value step into an explicit statement and conditional branch'); return false;
      }
      if (ts.isStatement(p)) break;
    }
    return true;
  }
  function commaValue(e) {
    if (!operatorContext(e)) return;
    const parts = ts.isCommaListExpression(e) ? e.elements : [e.left, e.right];
    for (const part of parts.slice(0, -1)) {
      let p = part; while (ts.isParenthesizedExpression(p)) p = p.expression;
      if (ts.isCallExpression(p) && ts.isPropertyAccessExpression(p.expression) && MUT_NAMES.has(p.expression.name.text) && (isArrayExpr(p.expression.expression) || nonNull(tOf(p.expression.expression)).some((t) => isSetT(t) || isMapT(t)))) return v(p, 'operator-value-context', 'write this mutating method call as a separate statement');
    }
    parts.forEach(expr);
  }
  function operatorValue(e) {
    if (!operatorContext(e)) return;
    const update = ts.isPrefixUnaryExpression(e) || ts.isPostfixUnaryExpression(e);
    const target = update ? e.operand : e.left;
    const rule = update ? 'update-expression' : 'assignment-expression';
    if (update && !isNum(tOf(target))) return v(e, rule, 'increment a numeric local or numeric field');
    if (!update && ![K.EqualsToken, K.PlusEqualsToken, K.MinusEqualsToken, K.AsteriskEqualsToken].includes(e.operatorToken.kind)) return v(e, rule, 'write this assignment as a statement');
    if (!update && e.operatorToken.kind !== K.EqualsToken && !isNum(tOf(target)) && !(e.operatorToken.kind === K.PlusEqualsToken && isStr(tOf(target)) && isStr(tOf(e.right)))) return v(e, rule, 'use numeric compound assignment or string += with a string value');
    let root = target;
    while (ts.isPropertyAccessExpression(root) || ts.isElementAccessExpression(root)) root = root.expression;
    if (root !== target && ts.isIdentifier(root)) {
      let conflict = false;
      const w = (n) => {
        if (ts.isFunctionLike(n)) return;
        if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment) {
          let r = n.left; while (ts.isPropertyAccessExpression(r) || ts.isElementAccessExpression(r)) r = r.expression;
          if (ts.isIdentifier(r) && r.text === root.text) conflict = true;
        }
        if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && [K.PlusPlusToken, K.MinusMinusToken].includes(n.operator)) {
          let r = n.operand; while (ts.isPropertyAccessExpression(r) || ts.isElementAccessExpression(r)) r = r.expression;
          if (ts.isIdentifier(r) && r.text === root.text) conflict = true;
        }
        ts.forEachChild(n, w);
      };
      if (!update) w(e.right);
      if (ts.isElementAccessExpression(target)) w(target.argumentExpression);
      if (conflict) return v(e, 'operator-value-context', 'keep the target root unchanged while evaluating the assignment reference and right side');
    }
    for (let p = e.parent; p && !ts.isFunctionLike(p); p = p.parent) {
      if (ts.isBinaryExpression(p) && p.operatorToken.kind >= K.FirstAssignment && p.operatorToken.kind <= K.LastAssignment && (ts.isPropertyAccessExpression(p.left) || ts.isElementAccessExpression(p.left))) {
        let r = p.left; while (ts.isPropertyAccessExpression(r) || ts.isElementAccessExpression(r)) r = r.expression;
        if (ts.isIdentifier(r) && ts.isIdentifier(root) && r.text === root.text) return v(e, 'operator-value-context', 'keep the target root unchanged while evaluating an enclosing assignment');
      }
      if (ts.isStatement(p)) break;
    }
    if (ts.isPropertyAccessExpression(target) && root.kind !== K.ThisKeyword) {
      let t = target.expression;
      while (ts.isPropertyAccessExpression(t)) { if (nonNull(tOf(t)).length !== (tOf(t).types?.length ?? 1)) return v(e, rule, 'narrow optional paths before assigning'); t = t.expression; }
    }
    exprStmt(e);
    // the statement receiver rule returns early; a value assignment must still check its right side
    if (!update && ts.isPropertyAccessExpression(target) && root.kind === K.ThisKeyword) expr(e.right);
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
        // `as T` is identity at run time: the translator keeps the value when the types agree and otherwise
        // passes it through an uninterpreted conversion, the same on both sides
        return expr(e.expression);
      }
      case K.NonNullExpression: return expr(e.expression); // absence becomes an uninterpreted value
      case K.PrefixUnaryExpression:
        if (e.operator === K.ExclamationToken || e.operator === K.MinusToken) return expr(e.operand);
        if (e.operator === K.PlusPlusToken || e.operator === K.MinusMinusToken) return operatorValue(e);
        if (e.operator === K.TildeToken) { if (!numberOnly(tOf(e.operand))) return v(e, 'bitwise', 'bitwise operands must be numbers; BigInt and opaque coercions need lane B'); return expr(e.operand); }
        if (e.operator === K.PlusToken && (tOf(e.operand).flags & (TF.NumberLike | TF.StringLike | TF.BooleanLike))) return expr(e.operand);
        return v(e, 'unary-coercion', 'unary + coerces; it is outside the subset');
      case K.PostfixUnaryExpression: return operatorValue(e);
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
      case K.YieldExpression:
        if (currentFn?.asteriskToken && !callbackStack.length && ts.isExpressionStatement(e.parent)) return e.expression ? expr(e.expression) : undefined;
        return v(e, 'generator-use', 'yield is a statement; sent values need a step reading');
      case K.ThisKeyword: if (currentClass || objectMethod || thisParam) return; return v(e, 'this', '`this` outside a class method; a free function declares its receiver as a `this` parameter');
      case K.SuperKeyword: { if (currentClass && e.parent && ts.isPropertyAccessExpression(e.parent) && e.parent.parent && ts.isCallExpression(e.parent.parent) && e.parent.parent.expression === e.parent) return; if (currentClass && currentFn && ts.isConstructorDeclaration(currentFn) && e.parent && ts.isCallExpression(e.parent) && e.parent.expression === e) return; return v(e, 'class', '`super` is read only as `super.m(...)` or `super(...)` in a constructor, a call of the parent\'s method'); }
      case K.ClassExpression: return v(e, 'class', 'classes are outside the subset');
      case K.FunctionExpression: case K.ArrowFunction: return callback(e, null); // a function value anywhere: checked as a callback value (its body in the subset; it may hold effects, then it is an opaque value by its text);
      case K.NewExpression: {
        const n = e.expression.getText(sf);
        if (n === 'Set' || n === 'Map' || n === 'RegExp') return e.arguments?.forEach(expr);
        if (n === 'Function') return v(e, 'dynamic-eval', '`new Function` is outside the subset');
        const form = promiseForm(e, checker, sf);
        if (form) { if (opaquePromiseDepth) return v(e, 'async', '`new Promise` inside an opaque promise call has no reading'); return readPromise(e, form); }
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
          if (ts.isSpreadElement(el)) { if (!isArrayExpr(el.expression) && !generators.pureCall(el.expression) && !nonNull(tOf(el.expression)).every(isSetT)) v(el, 'spread', 'spread works on arrays and sets only'); expr(el.expression); }
          else if (ts.isOmittedExpression(el)) v(el, 'unsupported-syntax', 'array holes are outside the subset');
          else expr(el);
        }
        return;
      case K.ObjectLiteralExpression:
        if (e.properties.some(ts.isGetAccessorDeclaration) && !e.properties.every((p) => (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p) || ts.isMethodDeclaration(p) || ts.isGetAccessorDeclaration(p)) && p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)))) return v(e, 'unsupported-syntax', 'literal getters need fixed named fields; use a class for spread or computed accessors');
        e.properties.forEach((p) => {
          if (ts.isSpreadAssignment(p)) { if (localMethodLiteral(tOf(p.expression))) return v(p, 'object-method-mutation', 'spreading a method object rebinds its receiver and evaluates getters; copy data fields explicitly'); return expr(p.expression); }
          if (ts.isShorthandPropertyAssignment(p)) return checkIdent(p.name);
          if (ts.isPropertyAssignment(p)) {
            if (ts.isComputedPropertyName(p.name)) { const lt = checker.getContextualType(e) ?? tOf(e); const dict = nonNull(lt).every((t) => !!(t.flags & TF.Object) && !!checker.getIndexInfoOfType(t, ts.IndexKind.String) && !checker.getPropertiesOfType(t).length); if (!dict) v(p, 'dynamic-key', 'a computed property name builds a dictionary; give the literal a Record<string, T> type'); else if (!nonNull(tOf(p.name.expression)).every(isStr)) v(p, 'dynamic-key', 'a dictionary key is a string'); else expr(p.name.expression); }
            if (ts.isArrowFunction(p.initializer)) return callback(p.initializer, null); // a handler in a record: a callback value
            return expr(p.initializer);
          }
          if (p.name && ts.isComputedPropertyName(p.name) && /^Symbol\.(asyncIterator|iterator)$/.test(p.name.expression.getText(sf))) return v(p, 'iterator-protocol', 'custom iterator protocol methods need a step reading; use a generator or an array');
          if ((ts.isMethodDeclaration(p) || ts.isGetAccessorDeclaration(p)) && p.body && p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) {
            // a method is deferred; its body may be opaque, but receiver mutation needs a heap
            const saved = objectMethod; objectMethod = p;
            const rootOf = (x) => { while (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x) || ts.isParenthesizedExpression(x)) x = x.expression; return x; };
            const scan = (x) => {
              const target = ts.isBinaryExpression(x) && x.operatorToken.kind >= K.FirstAssignment && x.operatorToken.kind <= K.LastAssignment ? x.left : (ts.isPrefixUnaryExpression(x) || ts.isPostfixUnaryExpression(x)) && [K.PlusPlusToken, K.MinusMinusToken].includes(x.operator) ? x.operand : ts.isDeleteExpression(x) ? x.expression : null;
              if (target && ts.isIdentifier(rootOf(target))) { const id = rootOf(target), d = checker.getSymbolAtLocation(id)?.valueDeclaration; if (d && !(d.pos >= p.pos && d.end <= p.end)) v(target, 'closure-mutation', 'a literal method cannot change a captured binding; use a class for shared state'); }
              if (ts.isPropertyAccessExpression(x) && x.expression.kind === K.ThisKeyword && !nonNull(tOf(x)).every(isPrim) && !e.properties.some((q) => ts.isMethodDeclaration(q) && q.name?.text === x.name.text)) v(x, 'object-method-mutation', 'literal this reads scalar fields; reference-valued receiver state needs a class');
              if (x.kind === K.ThisKeyword && !(x.parent && ts.isPropertyAccessExpression(x.parent) && x.parent.expression === x)) v(x, 'object-method-mutation', 'keep literal this as a direct data-field read; use a class for aliases or rebinding');
              if (target && rootOf(target).kind === K.ThisKeyword) v(target, 'object-method-mutation', 'literal method fields are immutable; use a class for mutable receiver state');
              if (ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && MUT_NAMES.has(x.expression.name.text) && rootOf(x.expression.expression).kind === K.ThisKeyword) v(x, 'object-method-mutation', 'literal method fields are immutable; use a class for mutable receiver state');
              ts.forEachChild(x, scan);
            };
            scan(p.body);
            for (const id of closureReads(checker, p)) {
              const sym = checker.getSymbolAtLocation(id), d = sym?.valueDeclaration;
              if (d && ts.isVariableDeclaration(d) && !(ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const)) v(id, 'object-method-capture', 'a literal method needs stable captured bindings; use a class for shared changing state');
              let owner = p.parent; while (owner && !ts.isFunctionLike(owner)) owner = owner.parent;
              let changed = false;
              const writesCapture = (x) => {
                const target = ts.isBinaryExpression(x) && x.operatorToken.kind >= K.FirstAssignment && x.operatorToken.kind <= K.LastAssignment ? x.left : (ts.isPrefixUnaryExpression(x) || ts.isPostfixUnaryExpression(x)) && [K.PlusPlusToken, K.MinusMinusToken].includes(x.operator) ? x.operand : ts.isDeleteExpression(x) ? x.expression : ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && MUT_NAMES.has(x.expression.name.text) ? x.expression.expression : null;
                if (target && ts.isIdentifier(rootOf(target)) && checker.getSymbolAtLocation(rootOf(target)) === sym) changed = true;
                ts.forEachChild(x, writesCapture);
              };
              if (owner) writesCapture(owner.body);
              if (changed) v(id, 'object-method-capture', 'a literal method captures an unchanging value; copy mutable data before capturing it');
            }
            objectMethod = saved; return;
          }
          return v(p, 'unsupported-syntax', 'literal setters and computed methods need a class accessor or a named method');
        });
        return;
      case K.SpreadElement: return v(e, 'spread', 'spread is allowed in array and record literals only');
      case K.CommaListExpression: return commaValue(e);
      default: return v(e, 'unsupported-syntax', `expression ${ts.SyntaxKind[e.kind]} is outside the subset`);
    }
  }

  const isFloorDiv = (n) => ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === 'Math' && (n.expression.name.text === 'floor' || n.expression.name.text === 'trunc');
  let floorDepth = 0;
  function binary(e) {
    const op = e.operatorToken.kind;
    if (op === K.EqualsToken || (op >= K.FirstAssignment && op <= K.LastAssignment)) return operatorValue(e);
    if (op === K.SlashToken) {
      const lt = tOf(e.left), rt = tOf(e.right);
      if (floorDepth === 0 && !(lt.flags & TF.BigIntLike) && !fileReal) return v(e, 'division', '`/` on numbers is real division; write Math.floor(a / b) for integer division');
      expr(e.left); return expr(e.right);
    }
    if (op === K.AsteriskAsteriskToken) { expr(e.left); expr(e.right); return; } // a power: an uninterpreted function of both sides
    if ([K.AmpersandToken, K.BarToken, K.CaretToken, K.LessThanLessThanToken, K.GreaterThanGreaterThanToken, K.GreaterThanGreaterThanGreaterThanToken].includes(op)) {
      if (![e.left, e.right].every((x) => numberOnly(tOf(x)))) return v(e, 'bitwise', 'bitwise operands must be numbers; BigInt and opaque coercions need lane B');
      expr(e.left); return expr(e.right);
    }
    if (op === K.EqualsEqualsToken || op === K.ExclamationEqualsToken) {
      const nul = (x) => { while (ts.isParenthesizedExpression(x)) x = x.expression; return x.kind === K.NullKeyword || (ts.isIdentifier(x) && x.text === 'undefined'); };
      if (nul(e.left) || nul(e.right)) { expr(e.left); return expr(e.right); } // loose nullish equality tests both tags; strict equality tests only its own tag
      const prim = (t) => (t.flags & TF.Union ? t.types : [t]).every((x) => !!(x.flags & (TF.NumberLike | TF.StringLike | TF.BooleanLike | TF.Null | TF.Undefined)) && !(x.flags & TF.BigIntLike));
      if (prim(tOf(e.left)) && prim(tOf(e.right))) { expr(e.left); return expr(e.right); } // between primitives == follows the coercion table (number, string, boolean, null, undefined), member by member on a union
      return v(e, 'loose-equality', 'use === and !== with an object, bigint or symbol operand; between primitives == follows the coercion table', eqeqeqSite(e));
    }
    if (op === K.InstanceOfKeyword) {
      expr(e.left);
      if (!ts.isIdentifier(e.right)) return v(e.right, 'instanceof-constructor', 'use a named ordinary constructor for instanceof; dynamic constructors may run effects');
      const symbol = checker.getSymbolAtLocation(e.right);
      const d = (symbol && symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol)?.valueDeclaration;
      if (d && (ts.isParameter(d) || ts.isVariableDeclaration(d)) && !d.getSourceFile().isDeclarationFile) return v(e.right, 'instanceof-constructor', 'use a class declaration for instanceof; a constructor value needs a runtime identity');
      const visited = new Set();
      const custom = (c) => {
        if (!c || !ts.isClassDeclaration(c) || visited.has(c)) return false;
        visited.add(c);
        return c.members.some((m) => m.name && ts.isComputedPropertyName(m.name) && /hasInstance/.test(m.name.getText())) || c.heritageClauses?.some((h) => h.types.some((t) => { const s = checker.getSymbolAtLocation(t.expression); return custom((s && s.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(s) : s)?.valueDeclaration); }));
      };
      if (custom(d)) v(e.right, 'instanceof-constructor', 'a custom Symbol.hasInstance may run effects; use an ordinary constructor');
      return;
    }
    if (op === K.InKeyword) { expr(e.left); expr(e.right); return; } // required properties and dictionaries are exact; open-record absence stays uninterpreted
    if (op === K.CommaToken) return commaValue(e);
    if (!(ARITH.has(op) || CMP.has(op) || EQ.has(op) || LOGIC.has(op))) return v(e, 'bitwise', 'bitwise and shift operators are outside the subset');
    expr(e.left); expr(e.right);
    if (LOGIC.has(op) && (isJsxNode(e.left) || isJsxNode(e.right))) return; // `cond && <X/>`: a conditional element
    const lt = tOf(e.left), rt = tOf(e.right);
    if (op === K.PlusToken) {
      const ok = (isNum(lt) && isNum(rt)) || isStr(lt) || isStr(rt) || isAny(lt) || isAny(rt);
      if (!ok) v(e, 'mixed-types', '+ adds two numbers or joins to a string');
    }
    if (CMP.has(op) && (isStr(lt) || isStr(rt)) && !(isStr(lt) && isStr(rt)) && !(isAny(lt) || isAny(rt))) v(e, 'string-order', 'compare two strings, or convert both operands explicitly');
    if (EQ.has(op)) {
      const nul = (x) => { while (ts.isParenthesizedExpression(x)) x = x.expression; return x.kind === K.NullKeyword || (ts.isIdentifier(x) && x.text === 'undefined'); };
      const prim = (t) => nonNull(t).every((x) => isPrim(x) || isAny(x) || !!(x.flags & TF.TypeParameter)); // a type parameter is compared by value
      const litSide = (x) => ts.isStringLiteral(x) || ts.isNumericLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x) || x.kind === K.TrueKeyword || x.kind === K.FalseKeyword;
      // a comparison with a primitive on either side is a value comparison; only record against record (or array against array) compares references
      const mixed = (t) => { const ps = nonNull(t); return ps.some((x) => isPrim(x)) && ps.some((x) => !isPrim(x) && !isAny(x)); };
      if (!nul(e.left) && !nul(e.right) && (mixed(lt) || mixed(rt))) v(e, 'mixed-types', 'a value that is sometimes a primitive and sometimes a record or array is opaque; narrow it before comparing');
      else if (!nul(e.left) && !nul(e.right) && !litSide(e.left) && !litSide(e.right) && !prim(lt) && !prim(rt)) v(e, 'reference-equality', '=== on arrays and records compares references; compare fields');
    }
  }

  // branch results carry the world and value, but not a callee's parameter updates
  function conditionalEffect(e) {
    let branch = false;
    for (let child = e, p = e.parent; p && !ts.isFunctionLike(p); child = p, p = p.parent) {
      if ((ts.isConditionalExpression(p) && child !== p.condition) || (ts.isBinaryExpression(p) && LOGIC.has(p.operatorToken.kind) && child === p.right)) branch = true;
    }
    if (!branch) return;
    const mutations = (decl, seen = new Set()) => {
      if (!decl?.body || decl.getSourceFile() !== sf || seen.has(decl)) return new Set();
      seen = new Set(seen).add(decl);
      const params = decl.parameters.map((p) => ts.isIdentifier(p.name) ? p.name.text : null), changed = new Set();
      const hit = (n) => { let root = n; while (ts.isPropertyAccessExpression(root) || ts.isElementAccessExpression(root) || ts.isNonNullExpression(root) || ts.isParenthesizedExpression(root)) root = root.expression; if (ts.isIdentifier(root) && params.includes(root.text)) changed.add(params.indexOf(root.text)); };
      const walk = (n) => {
        if (ts.isFunctionLike(n)) return;
        if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment && !ts.isIdentifier(n.left)) hit(n.left);
        if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && [K.PlusPlusToken, K.MinusMinusToken].includes(n.operator) && !ts.isIdentifier(n.operand)) hit(n.operand);
        if (ts.isDeleteExpression(n)) hit(n.expression);
        if (ts.isCallExpression(n)) {
          if (ts.isPropertyAccessExpression(n.expression) && MUT_NAMES.has(n.expression.name.text)) hit(n.expression.expression);
          for (const i of mutations(checker.getResolvedSignature(n)?.declaration, seen)) if (n.arguments[i]) hit(n.arguments[i]);
        }
        ts.forEachChild(n, walk);
      };
      walk(decl.body); return changed;
    };
    if (mutations(checker.getResolvedSignature(e)?.declaration).size) v(e, 'conditional-effect', 'move a call that changes its arguments into an explicit if branch so the updated values leave the branch');
  }
  // an optional call `f?.(x)` is `if f is absent then absent else f(x)`: the arguments and the call run only when the
  // callee is present. The callee is a local function value, a function field of a record path rooted at a local (each
  // link a plain record, the last one optional under `?.`), or a function field of `this` in a class; the expression
  // around it holds no assignment, update or comma, whose value reading evaluates every operand before any branch
  const sameFileClassT = (t) => !!t.symbol?.declarations?.some((d) => (ts.isClassDeclaration(d) || ts.isClassExpression(d)) && d.getSourceFile() === sf);
  const valueStepIn = (n) => { if (!n || ts.isFunctionLike(n)) return false; if ((ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment) || ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && [K.PlusPlusToken, K.MinusMinusToken].includes(n.operator)) || ts.isCommaListExpression(n) || (ts.isBinaryExpression(n) && n.operatorToken.kind === K.CommaToken)) return true; let found = false; ts.forEachChild(n, (c) => { if (!found && valueStepIn(c)) found = true; }); return found; };
  function optionalCallRefusal(e) {
    let top = e;
    for (let p = e.parent; p && !ts.isStatement(p) && !ts.isFunctionLike(p) && !ts.isVariableDeclaration(p) && !ts.isParameter(p) && !ts.isCaseClause(p) && !ts.isSourceFile(p); p = p.parent) top = p;
    const root = ts.isBinaryExpression(top) && top.operatorToken.kind >= K.FirstAssignment && top.operatorToken.kind <= K.LastAssignment && top.parent && ts.isExpressionStatement(top.parent) ? top.right : top;
    if (valueStepIn(root)) return 'write the optional call in its own statement; an assignment, update or comma beside it evaluates every operand before the call decides';
    let f = e.expression;
    const plainRecord = (t) => nonNull(t).length === 1 && isRecordish(nonNull(t)[0]) && !isAny(nonNull(t)[0]) && !sameFileClassT(nonNull(t)[0]) && !localMethodLiteral(nonNull(t)[0]);
    const fnType = (t) => { const parts = nonNull(t); if (parts.length !== 1 || isAny(parts[0])) return false; const sg = checker.getSignaturesOfType(parts[0], ts.SignatureKind.Call); return sg.length === 1 && !sg[0].typeParameters?.length; }; // one signature, not generic: its result is the present branch's
    if (ts.isIdentifier(f)) {
      if (declOf(f).kind !== 'local') return 'an optional call reads a local function value; bind an imported or global callee to a local first';
      return fnType(tOf(f)) ? null : 'an optional call needs a callee typed as one nongeneric function or undefined; narrow an opaque or overloaded value first';
    }
    if (!ts.isPropertyAccessExpression(f)) return 'an optional call reads a named callee; bind a computed callee to a local first';
    const recv = f.expression, name = f.name.text;
    if (recv.kind === K.ThisKeyword) {
      if (!currentClass || objectMethod || thisParam) return 'an optional call on `this` reads a field of a class receiver';
      if (units.has(`${currentClass.name?.text}.${name}`)) return null; // a method of the class: never absent
      const p = checker.getPropertyOfType(tOf(recv), name);
      return p && fnType(checker.getTypeOfSymbolAtLocation(p, f)) && !p.declarations?.some((d) => ts.isGetAccessorDeclaration(d) || ts.isSetAccessorDeclaration(d)) ? null : 'an optional call on `this` reads a function field of the class';
    }
    // the receiver: a path of plain records from a local; `?.` before the field allows an absent last record
    let link = recv;
    for (;;) {
      if (ts.isPropertyAccessExpression(link) && link.questionDotToken) return 'an optional call reads a field of a nonoptional record path; narrow the path first';
      if (ts.isIdentifier(link)) { if (declOf(link).kind !== 'local') return 'an optional call reads a function field of a record held in a local or a parameter'; break; }
      if (!ts.isPropertyAccessExpression(link)) return 'an optional call reads a function field of a record path; bind the receiver to a local first';
      link = link.expression;
    }
    for (let x = recv; ts.isPropertyAccessExpression(x); x = x.expression) if (!plainRecord(tOf(x.expression)) || nonNull(tOf(x.expression)).length !== (tOf(x.expression).types?.length ?? 1)) return 'an optional call reads a field of a nonoptional record path; narrow the path first';
    const rt = tOf(recv);
    if (!plainRecord(rt)) return 'an optional call reads a function field of a plain record; narrow an opaque, class or union receiver first';
    if (isOptional(rt) && !f.questionDotToken) return 'an optional call reads a field of a present record';
    const p = checker.getPropertyOfType(nonNull(rt)[0], name);
    if (!p || !fnType(checker.getTypeOfSymbolAtLocation(p, f))) return 'an optional call reads a declared function field of the record';
    return null;
  }
  const isOptional = (t) => !!(t.flags & TF.Union) && t.types.some((x) => x.flags & (TF.Undefined | TF.Null));
  function call(e) {
    conditionalEffect(e);
    const generatorDecl = checker.getResolvedSignature(e)?.declaration;
    const producer = [...units.values()].find((u) => u.fn === generatorDecl && u.fn.asteriskToken);
    if (producer) { const shape = generators.shape(producer); if (shape.rule) v(e, shape.rule, shape.message); }
    conditionalSpreadArgs(e);
    if (reactHook(checker, e) && hookOutOfOrder(e)) v(e, 'hook-order', 'a hook is called under a branch, a loop, a nested function or after an early return; hooks run at the top of the render in a fixed order');
    if (['useMemo', 'useCallback', 'useEffect'].includes(reactHook(checker, e))) reactCapture(e.arguments[0]);
    const form = promiseForm(e, checker, sf);
    if (form && !opaquePromiseDepth) { if (readPromise(e, form)) return; return opaquePromise(() => call(e)); }
    const f = e.expression;
    if (moduleLoader(checker, e, sf, current)) return argsOf(e);
    if (e.questionDotToken) { const why = optionalCallRefusal(e); if (why) v(e, 'optional-chain', why); }
    if (ts.isIdentifier(f)) {
      checkIdent(f, true);
      const o = declOf(f);
      if (o.kind === 'local') return argsOf(e);
      if (o.kind === 'unit') {
        const u = units.get(f.text);
        if (u && !e.arguments.some(ts.isSpreadElement) && !u.params.some((p) => p.dotDotDotToken)) { const req = u.params.filter((p) => !p.initializer && !p.questionToken && !p.dotDotDotToken).length; if (e.arguments.length < req || e.arguments.length > u.params.length) v(e, 'unsupported-call', `${f.text} takes ${req === u.params.length ? req : `${req} to ${u.params.length}`} arguments`); }
        if (u?.fn.asteriskToken && !u.isAsync && !immediateGeneratorConsumer(e, checker, sf)) v(e, 'generator-use', 'consume a pure generator directly in for-of, spread, Array.from or yield*');
        if (u && u.isAsync && !u.fn.asteriskToken && !(e.parent && ts.isAwaitExpression(e.parent)) && !promiseConsumed(e, checker, sf)) v(e, 'async', 'an async unit is called without await');
      }
      if (o.kind === 'unit') { const uRest = units.get(e.expression.text); const restOk = !!(uRest && uRest.params.some((p) => p.dotDotDotToken)); e.arguments.forEach((a, i) => { if (ts.isSpreadElement(a)) { if (restOk && i === uRest.params.length - 1 && isArrayExpr(a.expression)) expr(a.expression); else v(a, 'spread', 'a spread argument goes to a rest parameter, as the last argument'); } else if (!ts.isArrowFunction(a)) expr(a); else v(a, 'function-value', 'a same-file function takes values, not callbacks'); }); return; }
      return argsOf(e);
    }
    if (ts.isPropertyAccessExpression(f)) {
      // `a?.m()`: the call happens when a is present; the result is an Option (the receiver's type says whether it may be absent)
      const recv = f.expression, name = f.name.text;
      const rt = tOf(recv);
      if (recv.kind === K.ThisKeyword) { if (!currentClass && !objectMethod && !thisParam) return v(e, 'this', '`this` outside a class method'); return argsOf(e); }
      if (ts.isIdentifier(recv) && (name === 'call' || name === 'apply' || name === 'bind') && declOf(recv).kind === 'unit') { // `h.call(o, a)` / `h.apply(o, [a])` on a same-file function: the receiver is its first operand (the declared `this` parameter, else ignored); `bind` fixes a receiver for a later call, outside the subset
        if (name === 'bind') return v(e, 'bound-function', '`bind` fixes a receiver for a later call; call the function with its receiver instead', uselessCallSite(e, units.get(recv.text)));
        if (!e.arguments.length) return v(e, 'unsupported-call', '`call` and `apply` take the receiver first');
        if (name === 'apply' && (e.arguments.length > 2 || (e.arguments[1] && !(ts.isArrayLiteralExpression(unparenX(e.arguments[1])) && !unparenX(e.arguments[1]).elements.some(ts.isSpreadElement))))) return v(e, 'unsupported-call', '`apply` takes its arguments as one array literal');
        return argsOf(e);
      } // a method of this class, or a function-typed field
      if (ts.isIdentifier(recv) && recv.text === 'Math' && declOf(recv).kind === 'global') {
        void 0; // Math.random is a world transition (version 3)
        if (name === 'floor' || name === 'trunc') { floorDepth++; e.arguments.forEach(expr); floorDepth--; return; }
        if (name === 'max' || name === 'min') {
          if (!nonemptyMathArgs(e)) v(e, 'math-empty', 'Math.min/max need a nonempty list; use xs.length > 0 ? Math.max(...xs) : a fallback');
          if (e.arguments.some(ts.isSpreadElement) || e.arguments.length !== 2) { const numeric = (a) => { if (ts.isSpreadElement(a) && ts.isArrayLiteralExpression(a.expression)) return a.expression.elements.every(numeric); const t = ts.isSpreadElement(a) ? checker.getTypeArguments(tOf(a.expression))[0] : tOf(a); return !!t && (t.flags & TF.Union ? t.types : [t]).every((x) => !!(x.flags & TF.NumberLike)); }; if (!e.arguments.every(numeric)) v(e, 'spread', 'Math sequence arguments must be numbers; narrow opaque values before spreading'); }
          return e.arguments.forEach((a) => ts.isSpreadElement(a) ? spreadArray(a) : expr(a));
        }
        return argsOf(e);
      }
      if (ts.isIdentifier(recv) && PURE_GLOBALS.has(recv.text) && declOf(recv).kind === 'global') { const refused = objectCallRefusal(e, recv, f.name.text); if (refused) return refused; return argsOf(e); }
      const parts = nonNull(rt);
      if (parts.some(isAny)) {
        // an opaque receiver: the call is an uninterpreted external of (receiver, arguments); no callbacks, no mutation names
        if (['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'set', 'add', 'delete', 'clear', 'fill', 'copyWithin'].includes(name) && e.parent && !ts.isExpressionStatement(e.parent)) { const own = ts.isIdentifier(recv) && declOf(recv).kind === 'local' && !isParam(declOf(recv).decl); return v(e, own ? 'opaque-mutation' : 'param-mutation', `.${name}() on \`${recv.getText(sf).slice(0, 40)}\`, an opaque value${own ? ' this function holds' : ''}, used as a value: the call may mutate it`); } // as a statement it is a transition (checked above)
        expr(recv);
        return argsOf(e);
      }
      if (parts.every((t) => isArrayLike(checker, t)) && ARRAY_METHODS.has(name)) {
        if (['map', 'filter', 'find', 'findIndex', 'some', 'every', 'flatMap', 'reduce'].includes(name)) {
          const cb = e.arguments[0];
          const sig = cb && checker.getSignaturesOfType(tOf(cb), ts.SignatureKind.Call)[0];
          const asyncCb = !!(cb?.modifiers?.some((m) => m.kind === K.AsyncKeyword) || (sig && nonNull(sig.getReturnType()).some((t) => isPromiseT(t) || t.symbol?.name === 'PromiseLike')));
          if (asyncCb && ['filter', 'find', 'findIndex', 'some', 'every'].includes(name)) return v(e, 'async-predicate', `${name} does not await its predicate: a Promise is truthy even when it resolves false; await values with Promise.all(map(...)), then use a synchronous predicate`);
          if (asyncCb && name === 'reduce') return v(e, 'async-reduce', 'reduce passes a Promise accumulator without waiting; use a for-of loop with await');
          if (asyncCb && !underPromiseAll(e)) return v(e, 'async-callback', `${name} does not await its callbacks; use await Promise.all(xs.${name}(...))`);
          if (e.arguments.length > (name === 'reduce' ? 2 : 1)) return v(e, 'callback-form', 'a callback thisArg is outside the subset; capture the receiver in an arrow');
          if (cb && ts.isIdentifier(cb) && callbackNeedsLoop(cb)) return v(cb, 'callback-form', 'an effectful array callback needs an inline arrow so its world transitions are read in array order');
          if (cb && ts.isArrowFunction(cb)) {
            if (cb.type && ts.isTypePredicateNode(cb.type) && callbackNeedsLoop(cb)) return v(cb, 'callback-result', 'an effectful type-predicate callback needs an explicit for-of loop with a type guard');
            if (sig.getReturnType().symbol?.name === 'PromiseLike') return v(cb, 'callback-result', 'a thenable callback needs an async arrow with an explicit await');
            if (name === 'flatMap' && !asyncCb && callbackNeedsLoop(cb)) { const parts = nonNull(sig.getReturnType()); if (parts.some((t) => isArrayLike(checker, t)) && !parts.every((t) => isArrayLike(checker, t))) return v(cb, 'callback-result', 'an effectful flatMap callback returns either arrays on every path or scalar values on every path; use a for-of loop for mixed results'); }
            if (callbackNeedsLoop(cb) && (cb.parameters.length < (name === 'reduce' ? 2 : 1) || cb.parameters.length > 2 || cb.parameters.some((p) => !ts.isIdentifier(p.name)))) return v(cb, 'callback-form', 'an effectful array callback takes plain element/index names, or accumulator/element names for reduce');
            if (asyncCb && !orderedAsyncCallback(cb)) return v(cb, 'promise-all-order', 'Promise.all does not order work after await; use a for-of loop with await for ordered effects');
            checkCallbackControl(cb);
            if (underPromiseAll(e) && ['map', 'flatMap'].includes(name)) {
              if (cb.parameters.length < 1 || cb.parameters.length > 2 || cb.parameters.some((p) => !ts.isIdentifier(p.name) || p.initializer || p.dotDotDotToken || p.questionToken)) return v(cb, 'callback-form', 'Promise.all callback loops take one element name and an optional index name');
              expr(recv);
              callbackStack.push(cb);
              const savedLoop = loopDepth, savedEach = forEachDepth; loopDepth = 0; forEachDepth = 0;
              try { for (const p of cb.parameters) checkType(tOf(p.name), p); if (ts.isBlock(cb.body)) stmts(cb.body.statements); else expr(cb.body); }
              finally { callbackStack.pop(); loopDepth = savedLoop; forEachDepth = savedEach; }
              return;
            }
          }
        }
        if (name === 'forEach') {
          // `xs.forEach((x) => body)` is a loop over xs: the body is checked as a loop body (an outer local may change)
          const cb = e.arguments[0]; const r0 = e.expression.expression; const rt0 = tOf(r0);
          const iterable = isArrayExpr(r0) || nonNull(rt0).every((t) => isSetT(t) || isMapT(t)) || nonNull(rt0).some(isAny);
          if (e.arguments.length === 1 && ts.isArrowFunction(cb) && (cb.modifiers?.some((m) => m.kind === K.AsyncKeyword) || isPromiseT(checker.getSignatureFromDeclaration(cb).getReturnType()))) return v(e, 'foreach', 'forEach does not wait for an async callback: the function returns before the steps finish; write `for (const x of xs)` and await inside');
          if (e.arguments.length === 1 && ts.isArrowFunction(cb) && cb.parameters.length === 1 && ts.isIdentifier(cb.parameters[0].name) && iterable) {
            let use = e; while (use.parent && ts.isParenthesizedExpression(use.parent)) use = use.parent;
            const outer = use.parent;
            if (!(outer && (ts.isExpressionStatement(outer) || (ts.isArrowFunction(outer) && outer.body === use && outer.parent && ts.isCallExpression(outer.parent) && ts.isPropertyAccessExpression(outer.parent.expression) && outer.parent.expression.name.text === 'forEach')))) return v(e, 'foreach', 'forEach is read as a statement; put it in a block before returning a value');
            expr(recv); checkCallbackControl(cb);
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
    if (e.expression.kind === K.SuperKeyword && currentClass && currentFn && ts.isConstructorDeclaration(currentFn)) return argsOf(e); // `super(args)` in a constructor: the parent's constructor on this handle, a transition
    { const b = unparenX(f); if (ts.isCallExpression(b) && ts.isPropertyAccessExpression(b.expression) && b.expression.name.text === 'bind' && ts.isIdentifier(b.expression.expression) && declOf(b.expression.expression).kind === 'unit') return call(b); } // `f.bind(r, a)(b)` on a same-file function: the bind is the refusal, and its site decides the label
    return v(e, 'unsupported-call', 'calls through computed callees are outside the subset');
  }
  // `.map(cb)` directly under an awaited `Promise.all(...)`: the callback is a loop body (its returns are collected values)
  const underPromiseAll = (call) => { let arg = call; while (arg.parent && ts.isParenthesizedExpression(arg.parent)) arg = arg.parent; const p = arg.parent; if (!(p && ts.isCallExpression(p) && p.arguments.length === 1 && p.arguments[0] === arg && ts.isPropertyAccessExpression(p.expression) && p.expression.name.text === 'all' && ts.isIdentifier(p.expression.expression) && p.expression.expression.text === 'Promise')) return false; let q = p.parent; while (q && ts.isParenthesizedExpression(q)) q = q.parent; return !!(q && ts.isAwaitExpression(q)); };
  // named effectful callbacks must enter the loop reading through an inline arrow
  function callbackNeedsLoop(cb, seen = new Set()) {
    if (seen.has(cb)) return false;
    seen.add(cb);
    if (ts.isIdentifier(cb)) {
      const d = declOf(cb).decl;
      if (d && ts.isVariableDeclaration(d) && d.initializer) return callbackNeedsLoop(d.initializer, seen);
      if (d && ts.isFunctionDeclaration(d) && d.body) return callbackNeedsLoop(d, seen);
      return true;
    }
    let found = false;
    const w = (n) => {
      if (found) return;
      if (ts.isFunctionLike(n) && n !== cb) return;
      if (ts.isAwaitExpression(n) || ts.isNewExpression(n) || (ts.isPropertyAccessExpression(n) && n.expression.kind === K.ThisKeyword)) { found = true; return; }
      if (ts.isCallExpression(n)) {
        const f = n.expression;
        if (ts.isIdentifier(f)) {
          const o = declOf(f);
          if (o.kind === 'unit' || o.kind === 'local') found = callbackNeedsLoop(f, seen);
          else if (!(o.kind === 'global' && ['String', 'Number', 'Boolean', 'parseInt', 'parseFloat', 'isNaN', 'isFinite'].includes(f.text))) found = true;
        } else if (ts.isPropertyAccessExpression(f)) {
          const r = f.expression, t = nonNull(tOf(r));
          const pureGlobal = ts.isIdentifier(r) && ['Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean'].includes(r.text) && declOf(r).kind === 'global' && !(r.text === 'Math' && f.name.text === 'random');
          if (!pureGlobal && !t.every((x) => isArrayLike(checker, x) || isStr(x) || isNum(x) || isSetT(x) || isMapT(x))) found = true;
          if (['map', 'filter', 'find', 'findIndex', 'some', 'every', 'flatMap', 'reduce', 'forEach'].includes(f.name.text) && n.arguments[0]) found ||= callbackNeedsLoop(n.arguments[0], seen);
        } else found = true;
      }
      ts.forEachChild(n, w);
    };
    w(cb); return found;
  }
  // a single suspension with a pure local continuation has no inter-iteration effect ordering to invent
  function orderedAsyncCallback(cb, seen = new Set()) {
    if (seen.has(cb)) return false;
    seen.add(cb);
    const awaits = []; let bad = false;
    const collect = (n) => {
      if (ts.isFunctionLike(n)) return;
      if (ts.isAwaitExpression(n)) awaits.push(n);
      if (ts.isCallExpression(n)) {
        const f = n.expression, id = ts.isPropertyAccessExpression(f) ? f.name : f;
        let d = checker.getSymbolAtLocation(id)?.valueDeclaration;
        if (d && ts.isVariableDeclaration(d)) d = d.initializer;
        if (d && d.getSourceFile() === sf && ts.isFunctionLike(d) && d.body && d.modifiers?.some((m) => m.kind === K.AsyncKeyword) && !orderedAsyncCallback(d, new Set(seen))) bad = true;
      }
      ts.forEachChild(n, collect);
    };
    collect(cb.body);
    if (bad) return false;
    if (!awaits.length) return true;
    if (awaits.length !== 1) return false;
    const aw = awaits[0];
    for (let p = aw.parent; p && p !== cb; p = p.parent) if (ts.isIterationStatement(p, false) || ts.isTryStatement(p)) return false;
    const w = (n) => {
      if (ts.isFunctionLike(n)) { if (n.end > aw.end) bad = true; return; }
      if (n.end > aw.end) {
        if (ts.isCallExpression(n)) {
          const primitive = ts.isIdentifier(n.expression) && ['String', 'Number', 'Boolean'].includes(n.expression.text) && declOf(n.expression).kind === 'global' && n.arguments.every((a) => nonNull(tOf(a)).every(isPrim));
          if (!primitive) bad = true;
        }
        if (ts.isNewExpression(n) || n.kind === K.ThisKeyword || ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n) || ts.isDeleteExpression(n) || ts.isThrowStatement(n)) bad = true;
        if (ts.isIdentifier(n) && n.pos >= aw.end && !(n.parent && ts.isPropertyAccessExpression(n.parent) && n.parent.name === n)) {
          const o = declOf(n); const d = o.decl;
          if (o.kind === 'local' && d && !(d.pos >= cb.pos && d.end <= cb.end) && !(ts.isVariableDeclaration(d) && (ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const) && nonNull(tOf(n)).every(isPrim))) bad = true;
        }
      }
      ts.forEachChild(n, w);
    };
    w(cb.body); return !bad;
  }
  function checkCallbackControl(cb) {
    if (enclosingOpaqueTry(cb)) return; // the enclosing try owns this completion as one opaque transition
    const w = (n, depth = 0) => {
      if (ts.isFunctionLike(n)) return;
      if (ts.isTryStatement(n) || ts.isThrowStatement(n) || (ts.isReturnStatement(n) && depth > 0)) v(n, 'callback-control', 'try, throw or a return from an inner loop in a callback needs an explicit for-of loop');
      const next = depth + (ts.isIterationStatement(n, false) ? 1 : 0);
      ts.forEachChild(n, (c) => w(c, next));
    };
    w(cb.body);
  }
  function callback(a, arity) {
    if (ts.isIdentifier(a) && exceptionUnits.has(a.text) && !enclosingOpaqueTry(a)) return v(a, 'exception-callback', 'call the throwing unit directly; a function value has no fault channel');
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
    const savedLoop = loopDepth, savedSwitch = switchDepth, savedEach = forEachDepth; loopDepth = 0; switchDepth = 0; forEachDepth = 0;
    try {
      if (ts.isBlock(a.body)) { const prev = current; stmts(a.body.statements); current = prev; }
      else expr(a.body);
    } finally { callbackStack.pop(); loopDepth = savedLoop; switchDepth = savedSwitch; forEachDepth = savedEach; }
  }
  // JSX: an element is a value (a tag, a record of attributes, a list of children). A tag names a component or an
  // intrinsic element; a handler attribute is a callback value keyed by its text; every other attribute and every child
  // expression is an ordinary expression
  // a deferred handler captures values; a mutable render binding would need a shared cell
  function reactCapture(e) {
    const cb = arrowOf(checker, e);
    if (!cb) return;
    for (const id of closureReads(checker, cb)) {
      const sym = checker.getSymbolAtLocation(id), d = sym?.valueDeclaration;
      let unsafe = d && (d.pos > cb.pos || (ts.isVariableDeclaration(d) && !(ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const)));
      const root = (n) => { while (ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n) || ts.isParenthesizedExpression(n)) n = n.expression; return n; };
      const hits = (n) => { const r = root(n); return ts.isIdentifier(r) && checker.getSymbolAtLocation(r) === sym; };
      const walk = (n) => {
        if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment && hits(n.left)) unsafe = true;
        if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && [K.PlusPlusToken, K.MinusMinusToken].includes(n.operator) && hits(n.operand)) unsafe = true;
        if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && MUT_NAMES.has(n.expression.name.text) && hits(n.expression.expression)) unsafe = true;
        ts.forEachChild(n, walk);
      };
      if (currentFn?.body) walk(currentFn.body);
      if (unsafe) v(id, 'react-handler-capture', 'a React closure captures a changing local; capture a const value or use a state setter');
    }
  }
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
      if (ts.isJsxExpression(init)) { const x = init.expression; if (!x) continue; reactCapture(x); if (ts.isArrowFunction(x) || ts.isFunctionExpression(x)) { if (ts.isArrowFunction(x)) callback(x, null); else v(x, 'callback-form', 'a handler is an arrow function'); } else expr(x); continue; }
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
  const spreadArray = (a) => { if (ts.isArrayLiteralExpression(a.expression)) return a.expression.elements.forEach((el) => ts.isSpreadElement(el) ? spreadArray(el) : expr(el)); if (!checker.isArrayType(tOf(a.expression))) v(a, 'spread', 'spread arguments need an ordinary array; tuples and custom iterables are outside the subset'); expr(a.expression); };
  // conditional expressions do not carry a same-file callee's mutated parameters out of the branch
  function conditionalSpreadArgs(e) {
    const mathSequence = ts.isPropertyAccessExpression(e.expression) && ts.isIdentifier(e.expression.expression) && e.expression.expression.text === 'Math' && ['min', 'max'].includes(e.expression.name.text) && e.arguments.length !== 2;
    if (!e.arguments.some(ts.isSpreadElement) && !mathSequence) return;
    let conditional = false;
    for (let child = e, p = e.parent; p && !ts.isFunctionLike(p); child = p, p = p.parent) {
      if ((ts.isConditionalExpression(p) && p.condition !== child) || (ts.isBinaryExpression(p) && LOGIC.has(p.operatorToken.kind) && p.right === child)) conditional = true;
    }
    if (!conditional) return;
    const w = (n) => { if (ts.isFunctionLike(n)) return; if (ts.isCallExpression(n) && ((ts.isIdentifier(n.expression) && declOf(n.expression).kind === 'unit') || (ts.isPropertyAccessExpression(n.expression) && n.expression.expression.kind === K.ThisKeyword))) v(n, 'spread', 'bind same-file call arguments inside an if statement before spreading; conditional expressions do not return parameter updates'); ts.forEachChild(n, w); };
    e.arguments.forEach(w);
  }
  function outsideSpread(e) {
    if (!ts.isCallExpression(e)) return false;
    const f = e.expression;
    if (e.questionDotToken || f.questionDotToken) return false;
    if (ts.isIdentifier(f)) return !['local', 'unit'].includes(declOf(f).kind);
    if (!ts.isPropertyAccessExpression(f)) return false;
    const r = f.expression;
    if (r.kind === K.ThisKeyword) return !units.has(`${currentClass?.name?.text}.${f.name.text}`);
    if (ts.isIdentifier(r) && r.text === 'Math' && ['floor', 'trunc', 'abs'].includes(f.name.text)) return false;
    return !nonNull(tOf(r)).some((t) => isArrayLike(checker, t) || isStr(t) || isSetT(t) || isMapT(t));
  }
  // a directly enclosing conditional proves a sole array spread nonempty on the chosen branch
  function nonemptyMathArgs(e) {
    const filled = (a) => !ts.isSpreadElement(a) || (ts.isArrayLiteralExpression(a.expression) && a.expression.elements.some(filled));
    if (e.arguments.some(filled)) return true;
    if (e.arguments.length !== 1 || !ts.isSpreadElement(e.arguments[0]) || !ts.isIdentifier(e.arguments[0].expression)) return false;
    let child = e, p = e.parent;
    while (p && ts.isParenthesizedExpression(p)) { child = p; p = p.parent; }
    if (!p || !ts.isConditionalExpression(p) || p.condition === child) return false;
    let c = p.condition; while (ts.isParenthesizedExpression(c)) c = c.expression;
    if (!ts.isBinaryExpression(c) || !ts.isPropertyAccessExpression(c.left) || c.left.name.text !== 'length' || !ts.isIdentifier(c.left.expression) || !ts.isNumericLiteral(c.right)) return false;
    if (checker.getSymbolAtLocation(c.left.expression) !== checker.getSymbolAtLocation(e.arguments[0].expression)) return false;
    const n = Number(c.right.text), op = c.operatorToken.kind, yes = p.whenTrue === child;
    return yes ? (op === K.GreaterThanToken && n >= 0) || (op === K.GreaterThanEqualsToken && n >= 1) || (op === K.ExclamationEqualsEqualsToken && n === 0)
      : (op === K.LessThanEqualsToken && n >= 0) || (op === K.LessThanToken && n >= 1) || (op === K.EqualsEqualsEqualsToken && n === 0);
  }
  const argsOf = (e) => (e.arguments ?? []).forEach((a) => ts.isSpreadElement(a) ? (outsideSpread(e) ? spreadArray(a) : v(a, 'spread', 'spread arguments need an outside callee or a supported sequence operation')) : ts.isArrowFunction(a) ? callback(a, null) : expr(a));
  function propAccess(e) {
    const name = e.name.text;
    const obj = localMethodLiteral(tOf(e.expression));
    const method = obj?.properties.find((p) => ts.isMethodDeclaration(p) && p.name?.text === name);
    if (method && !(e.parent && ts.isCallExpression(e.parent) && e.parent.expression === e)) return v(e, 'object-method-mutation', 'call a literal method on its object; detached methods need an explicit receiver');
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
    if (ts.isIdentifier(e.expression) && e.expression.text === 'arguments' && declOf(e.expression).kind === 'global') { // `arguments[k]` with a literal k below the declared parameters is that parameter; anything else of `arguments` is the actual vector, which the declaration does not fix
      const ps = (currentFn?.parameters ?? []).filter((p) => !(ts.isIdentifier(p.name) && p.name.text === 'this'));
      const k = ts.isNumericLiteral(e.argumentExpression) ? Number(e.argumentExpression.text) : NaN;
      const q = ps[k];
      if (Number.isInteger(k) && q && ts.isIdentifier(q.name) && !q.dotDotDotToken && !q.questionToken && !q.initializer && !ps.slice(0, k).some((x) => x.dotDotDotToken)) return;
      return v(e, 'arguments', '`arguments` is the actual argument vector, not the declared one; name the parameter, or declare a rest parameter', restParamsSite(e.expression));
    }
    expr(e.expression); expr(e.argumentExpression);
    const rt = tOf(e.expression), at = tOf(e.argumentExpression);
    const parts = nonNull(rt);
    if (parts.every(isStr) && isNum(at)) return; // s[i] is a char
    if (parts.every((t) => isArrayLike(checker, t)) && isNum(at)) return;
    const keyParts = at.flags & TF.Union ? at.types : [at];
    const keys = keyParts.every((x) => x.flags & TF.StringLiteral) ? keyParts.map((x) => x.value) : null;
    if (keys?.some((k) => ['constructor', 'prototype', '__proto__'].includes(k))) return v(e, 'prototype', 'this bracket key reaches the prototype chain; read a declared data field');
    if (parts.some(isAny)) return; // opaque: uninterpreted
    const dict = parts.every((t) => hasStringIndex(t) && !checker.getPropertiesOfType(t).length);
    if (dict && (isStr(at) || isAny(at))) return;
    if (parts.every(isRecordish)) {
      if (parts.length !== 1 || parts.length !== (rt.flags & TF.Union ? rt.types.length : 1)) return v(e, 'dynamic-key', 'narrow the record receiver before indexing it');
      if (!keys) return v(e, 'dynamic-key', 'use a finite union of declared string keys, or a Record<string, T> dictionary');
      let keyCall = false;
      const visitKey = (n) => { if (ts.isCallExpression(n) || ts.isNewExpression(n)) keyCall = true; ts.forEachChild(n, visitKey); };
      visitKey(e.argumentExpression);
      if (keyCall) return v(e, 'dynamic-key', 'bind the computed key before reading the record; a key call may mutate its receiver');
      if (localMethodLiteral(parts[0]) && keys.some((k) => checker.getPropertyOfType(parts[0], k)?.declarations?.some(ts.isGetAccessorDeclaration))) return v(e, 'dynamic-key', 'read a literal getter by its declared property name');
      const missing = keys.filter((k) => !checker.getPropertyOfType(parts[0], k));
      if (missing.length) return v(e, 'dynamic-key', `key ${missing.map((k) => JSON.stringify(k)).join(', ')} is not declared on ${checker.typeToString(rt)}`);
      if (keys.some((k) => nonNull(checker.getTypeOfSymbolAtLocation(checker.getPropertyOfType(parts[0], k), e)).some((t) => checker.getSignaturesOfType(t, ts.SignatureKind.Call).length))) return v(e, 'dynamic-key', 'call a method by its declared name; computed record reads select data fields');
      return;
    }
    if (isAny(at)) return; // opaque key on a non-record
    return v(e, 'dynamic-key', 'index an array or string by a number, or a record by declared string keys');
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
      current = st; currentFn = u.fn; thisParam = (u.params[0] && ts.isIdentifier(u.params[0].name) && u.params[0].name.text === 'this') ? u.params[0] : null; // a free function's declared `this` parameter is its receiver operand
      if (u.fn.asteriskToken) { const shape = generators.shape(u); if (shape.rule) v(st, shape.rule, shape.message); }
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
      checkStringLiterals(u.node);
      if (u.body) { if (ts.isBlock(u.body)) stmts(u.body.statements); else expr(u.body); }
      current = null; currentFn = null;
      continue;
    }
    if (ts.isExportDeclaration(st) || ts.isExportAssignment(st)) continue;
    if (ts.isVariableStatement(st)) {
      if (st.declarationList.flags & ts.NodeFlags.Const) { if (inScope) { checkedDiagSpans.push(st); /* module constants are externals; their initialisers are not checked */ } continue; }
      if (inScope) for (const d of st.declarationList.declarations) {
        if (!ts.isIdentifier(d.name)) v(d, 'toplevel-state', 'bind module state to a plain name');
        else if (!inertModuleInit(d.initializer)) v(d, 'toplevel-effect', 'move the effectful module initializer into a function');
      }
      continue;
    }
    if (!inScope) continue;
    checkedDiagSpans.push(st);
    if (ts.isClassDeclaration(st)) {
      if (!st.name) { v(st, 'class', 'an anonymous class is outside the subset'); continue; }
      // a class that extends another: inherited members are read through opaque accessors; `super` stays refused
      for (const u of classMethodUnits(st)) {
        if (!overlaps(sf, u.node, ranges)) continue;
        if (u.accessor && !opts.accessorBodies) continue; // unreadable accessor bodies retain their opaque unit reading
        checkedDiagSpans.push(u.node);
        current = u.node; currentFn = u.fn; currentClass = st; thisParam = null; // a method's receiver is its class
        if (u.fn.asteriskToken) { const shape = generators.shape(u); if (shape.rule) v(u.node, shape.rule, shape.message); }
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
        checkStringLiterals(u.node);
        stmts(u.body.statements);
        current = null; currentFn = null; currentClass = null; thisParam = null;
      }
      continue;
    }
    else if (ts.isExpressionStatement(st) && (ts.isStringLiteral(st.expression) || ts.isNoSubstitutionTemplateLiteral(st.expression))) continue; // a directive ("use client", "use strict") is not code
    else v(st, 'toplevel-effect', 'code at module level runs on import; it is outside the subset');
  }
  // only a finally that reads an alias or a shadowed binding needs these refusals
  const finallyGate = (n) => {
    if (ts.isTryStatement(n) && n.finallyBlock && overlaps(sf, n, ranges)) {
      const reads = new Map();
      const cleanup = (x) => { if (ts.isIdentifier(x)) reads.set(checker.getSymbolAtLocation(x), x.text); ts.forEachChild(x, cleanup); };
      cleanup(n.finallyBlock);
      const body = (x) => {
        if (ts.isFunctionLike(x)) return;
        if ((ts.isVariableDeclaration(x) || ts.isBindingElement(x)) && ts.isIdentifier(x.name)) {
          const sym = checker.getSymbolAtLocation(x.name);
          if ([...reads].some(([other, name]) => name === x.name.text && other !== sym)) v(x.name, 'exception-binding', 'use a distinct name for a local that shadows a value read by finally');
        }
        if (ts.isReturnStatement(x) && x.expression) {
          let value = x.expression;
          while (ts.isParenthesizedExpression(value) || ts.isAsExpression(value) || ts.isNonNullExpression(value)) value = value.expression;
          if (ts.isIdentifier(value) && !nonNull(tOf(value)).every((t) => isPrim(t)) && reads.has(checker.getSymbolAtLocation(value))) v(value, 'exception-return', 'return a primitive or copy the value; finally can change the returned alias');
        }
        ts.forEachChild(x, body);
      };
      body(n.tryBlock); if (n.catchClause) body(n.catchClause);
    }
    ts.forEachChild(n, finallyGate);
  };
  finallyGate(sf);
  // the implicit-any policy: the codes only the forced strict flags produce for a value TypeScript would otherwise type
  // `any`. Such a value is opaque (an uninterpreted accessor, the same on both sides, never a type the proof relies on),
  // so the code is admitted and the any-type finding proposes the value's type
  const IMPLICIT_ANY = new Set([7005, 7006, 7008, 7010, 7011, 7015, 7018, 7019, 7022, 7023, 7024, 7031, 7034, 7053]);
  const identAt = (pos) => { let hit = null; const w = (n) => { if (pos >= n.getStart(sf) && pos < n.getEnd()) { if (ts.isIdentifier(n)) hit = n; ts.forEachChild(n, w); } }; w(sf); return hit; };
  // a read of an `unknown` value (TS18046) is the unit's own type error when the unit wrote the keyword `unknown` on the
  // binding and nothing in its function tests the binding with a guard the checkout cannot resolve (an `instanceof` or a
  // call whose callee is typed any): TypeScript without strict reports that read too (TS2339). A catch binding is
  // unknown only under strict; a value typed unknown by its source (a call, a field, a callback, a named type) or
  // narrowed by an unresolved guard is the environment's, and opaque
  const ownUnknown = (d) => {
    const id = identAt(d.start), named = /'([^']+)' is of type 'unknown'/.exec(ts.flattenDiagnosticMessageText(d.messageText, ' '))?.[1];
    if (!id || id.text !== named) return false; // a field path (`r.value`): the unknown comes from the field's source
    const sym = checker.getSymbolAtLocation(id), decl = sym?.valueDeclaration;
    if (!decl || (ts.isVariableDeclaration(decl) && decl.parent && ts.isCatchClause(decl.parent))) return false;
    let written = decl.type; while (written && ts.isParenthesizedTypeNode(written)) written = written.type;
    if (!written || written.kind !== K.UnknownKeyword) return false; // a named type that resolves to unknown is its source's
    let scope = decl.parent; while (scope && !ts.isFunctionLike(scope)) scope = scope.parent;
    const anyT = (x) => !!(checker.getTypeAtLocation(x).flags & TF.Any);
    const same = (x) => { while (ts.isParenthesizedExpression(x)) x = x.expression; return ts.isIdentifier(x) && checker.getSymbolAtLocation(x) === sym; };
    let guarded = false;
    const w = (n) => {
      if (guarded) return;
      if (ts.isBinaryExpression(n) && n.operatorToken.kind === K.InstanceOfKeyword && same(n.left) && anyT(n.right)) guarded = true;
      else if (ts.isCallExpression(n) && n.arguments.some(same) && anyT(n.expression)) guarded = true;
      ts.forEachChild(n, w);
    };
    w(scope ?? sf);
    return !guarded;
  };
  // compiler diagnostics (strict mode) that fall inside a checked region; unresolved-module codes get their own rule
  for (const d of diagnostics) {
    if (d.file !== sf || d.start === undefined) continue;
    const hit = !ranges || checkedDiagSpans.some((n) => d.start >= n.getStart(sf) && d.start <= n.getEnd());
    if (!hit) continue;
    if (d.code === 7029) continue; // switch fall-through is an ordered clause continuation
    if (IMPLICIT_ANY.has(d.code)) continue; // implicit any: opaque, admitted
    if (d.code === 18046 && !ownUnknown(d)) continue; // an unknown the unit did not write: opaque, admitted
    if (d.code === 2683 || d.code === 7041) { // an implicit receiver: an input the function does not declare, which the translator refuses
      out.push({ file, line: lineOf(sf, d.start), col: colOf(sf, d.start), rule: 'implicit-this', msg: `TS${d.code}: \`this\` the function does not declare; declare the receiver as a \`this\` parameter`, text: sf.text.slice(d.start, d.start + (d.length ?? 4)) });
      continue;
    }
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
  // the label of the advised rewrite: decided at the site for the three deciding rules (labelDecided), else the rule's own;
  // a rule with no advice entry suggests nothing, so its label is migration
  for (const f of out) {
    const u = unitSpans.find(([, a, b]) => a <= f.line && f.line <= b); f.unit = u ? u[0] : null;
    const a = ADVICE[f.rule], site = f.site; delete f.site;
    f.label = site?.label ?? a?.label ?? 'migration'; f.labelDecided = !!site;
    if (f.label === 'conditional') f.precondition = site?.precondition ?? a.precondition;
    f.advice = a ? `${labelTag(f.label, f.precondition)} ${a.text}` : null;
  }
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
  // candidate-only admission is an execution reading, not admission to a proof
  if (args.includes('--candidate')) {
    const opt = (k, d) => args.includes(k) ? args[args.indexOf(k) + 1] : d;
    const { runPair } = await import('../exec/run.mjs');
    const result = await runPair({ parent: opt('--parent'), candidate: opt('--candidate'), unit: opt('--unit'), n: Number(opt('--n', 30)), seed: Number(opt('--seed', 1)), project: args.includes('--no-project') ? false : opt('--project', true) });
    if (args.includes('--json')) console.log(JSON.stringify(result, null, 2));
    else console.log(`${opt('--candidate')}:1:1  ${result.kind ?? result.verdict}  ${result.reason ?? 'candidate-only execution; no equality claim'}`);
    process.exit(result.verdict === 'NEW' ? 0 : result.verdict === 'REFUSE' ? 1 : 2);
  }

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
