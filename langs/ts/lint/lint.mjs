#!/usr/bin/env node
// lean-ts lint, version 2: refuses any function outside the TypeScript subset (see langs/ts/subset.md).
// Version 2 admits real idioms the translator can model: imports and module constants as externals,
// arrow-const functions, async functions whose awaited calls are externals, null as "absent", literal
// unions, destructuring, switch, optional chaining, template literals, Set and Map as values, the common
// array and string methods, integer division under Math.floor, and `%`. What stays refused is what no
// deterministic translation can model: any, casts, prototype access, dynamic keys, mutation of what the
// function does not own, effects reached through globals, throw, generics on the function itself.
// Usage: node lint.mjs <file.ts> [--changed <ranges.json>] [--json] [--advice] [--any-type] [--project <tsconfig>|--no-project]
// Exit 0: every checked function is inside the subset. Exit 1: violations printed. Exit 2: usage error.
import fs from 'node:fs';
import path from 'node:path';
import { ts, loadProgram, lineOf, colOf, overlaps, hintsOf, topLevelFunctions, isArrayLike, unitOf, originOf, RESOLUTION_CODES, classMethodUnits, methodLiteralOf, receiverRecordPath } from '../common.mjs';
import { fileUsesReals, countedFor, syncLoopCallback, syncLoopCall, localProcedure, bucketMaps, prototypeMaker, literalProtoMember, thisParamPath, protoKeyWrite, inPrototypeReach } from '../common.mjs';
import { moduleState, moduleLoader, inertModuleInit, outsideRoot } from '../module-forms.mjs';
import { promiseForm, promiseConsumed, executorShape, unparen, isNativePromise } from '../promise-forms.mjs';
import { ADVICE, labelTag } from './advice.mjs';
import { anyTypeFindings } from './any-type.mjs';
// what a built-in call returns, from the library transition table (translate/library.json, its `result` fact, which lane B
// checks on every run): `fresh` is a new object, `receiver` and `element-or-undefined` an object another name may reach
const LIBRARY_RESULT = new Map(JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '../translate/library.json'), 'utf8')).operations.map((o) => [o.op, o.result]));
// the built-ins the table has no row for yet, by ECMA-262: a new array, record or iterator, or an object the caller may already hold
const LIBRARY_RESULT_MORE = {
  'Array.prototype.flat': 'fresh', 'Array.prototype.flatMap': 'fresh', 'Array.prototype.toSpliced': 'fresh', 'Array.prototype.with': 'fresh',
  'Array.prototype.keys': 'fresh', 'Array.prototype.values': 'fresh', 'Array.prototype.entries': 'fresh', 'Map.prototype.keys': 'fresh', 'Map.prototype.values': 'fresh', 'Map.prototype.entries': 'fresh', 'Set.prototype.keys': 'fresh', 'Set.prototype.values': 'fresh', 'Set.prototype.entries': 'fresh',
  'Array.from': 'fresh', 'Array.of': 'fresh', 'Object.keys': 'fresh', 'Object.values': 'fresh', 'Object.entries': 'fresh', 'Object.fromEntries': 'fresh', 'Object.create': 'fresh', 'JSON.parse': 'fresh', 'Promise.all': 'fresh', 'Promise.allSettled': 'fresh',
  'Array.prototype.find': 'element-or-undefined', 'Array.prototype.at': 'element-or-undefined', 'Array.prototype.reduce': 'element-or-undefined', 'Array.prototype.reduceRight': 'element-or-undefined', 'Promise.resolve': 'element-or-undefined', 'Promise.race': 'element-or-undefined', 'Promise.any': 'element-or-undefined',
};
import { ARRAY_VALUE_MUTATORS, LOCALE_READS, freshArray, unconditionalSite, readsOf, primitiveText } from '../library-rows.mjs';
import { reactHook, arrowOf, closureReads } from '../react.mjs';
import { metadataCall, ownKeyTest, plainObjectTest } from '../decorators.mjs';
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

// a lib or runtime global: a name every declaration of which lives in a default lib file or an @types package (navigator,
// getComputedStyle, AbortSignal, btoa, __dirname); its reads are world reads, its calls transitions. The names with their
// own reading (the tables above), `require` (a module loader) and a name only the project declares stay out.
const LIB_FILE = /[\\/](typescript[\\/]lib[\\/]lib\.[\w.-]+\.d\.ts|node_modules[\\/]@types[\\/].+\.d\.ts)$/;
const globalScope = (c) => !!c && (ts.isSourceFile(c) || (ts.isModuleBlock(c) && ts.isModuleDeclaration(c.parent) && !!(c.parent.flags & ts.NodeFlags.GlobalAugmentation)));
const globalDecl = (d) => globalScope(ts.isVariableDeclaration(d) ? d.parent?.parent?.parent : d.parent) && (ts.isVariableDeclaration(d) || ts.isFunctionDeclaration(d) || ts.isInterfaceDeclaration(d) || ts.isModuleDeclaration(d) || ts.isClassDeclaration(d) || ts.isTypeAliasDeclaration(d));
export function libGlobalRoot(checker, n, sf, current) {
  if (!n || !ts.isIdentifier(n) || ['require', 'undefined', 'arguments', 'NaN', 'Infinity'].includes(n.text) || PURE_GLOBALS.has(n.text) || Object.hasOwn(EFFECT_GLOBALS, n.text)) return false;
  const o = originOf(checker, n, sf, current);
  const decls = o.sym?.declarations ?? [];
  return o.kind === 'global' && decls.some((d) => ts.isVariableDeclaration(d) || ts.isFunctionDeclaration(d) || ts.isModuleDeclaration(d) || ts.isClassDeclaration(d)) && decls.every((d) => LIB_FILE.test(d.getSourceFile().fileName) && globalDecl(d));
}

// throwing units and their callers share the outcome channel; ordinary callees keep their reading
export function exceptionUnitsOf(sf, checker, units = topLevelFunctions(sf)) {
  const out = new Set();
  const byDecl = new Map([...units.values()].map((u) => [u.fn, u.name]));
  const edges = new Map([...units.keys()].map((name) => [name, new Set()]));
  for (const u of units.values()) {
    if (!u.body) continue;
    const walk = (n) => {
      if (ts.isFunctionLike(n) && !syncLoopCallback(n, checker)) return; // a synchronous array-method callback throws for its unit (stage 5 rank 20)
      if (ts.isThrowStatement(n) || ts.isTryStatement(n) || mayFaultPure(n, checker, sf)) out.add(u.name);
      if (ts.isCallExpression(n) || ts.isNewExpression(n)) {
        const callee = byDecl.get(checker.getResolvedSignature(n)?.declaration);
        if (callee) edges.get(callee).add(u.name);
        if (syncLoopCall(n, checker)) for (const a of n.arguments) if (ts.isIdentifier(a)) { const d = checker.getSymbolAtLocation(a)?.valueDeclaration; const named = d && byDecl.get(d); if (named) edges.get(named).add(u.name); } // stage 5 rank 20: a throwing unit handed to an array method runs here, so its throw is this unit's
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

// a delete in the body of `for (const k in o)` that may remove a key of o other than the current one, or a call of a
// same-file function that deletes and is handed o itself or reads o from outside its own body: the loop then skips the
// deleted key, while the reading holds the keys o had when the loop started. `delete o[k]` of the current key of a
// const k leaves the rest as they were; an element of o handed to a call is another object.
function forInDelete(s, checker, sf) {
  const root = (x) => { x = unparen(x); while (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x) || ts.isNonNullExpression(x)) x = unparen(x.expression); return x; };
  const r = root(s.expression);
  const sym = ts.isIdentifier(r) ? checker.getSymbolAtLocation(r) : null;
  if (!sym) return null;
  const same = (x) => ts.isIdentifier(x) && checker.getSymbolAtLocation(x) === sym;
  const k = s.initializer.declarations[0].name;
  const kSym = (s.initializer.flags & ts.NodeFlags.Const) ? checker.getSymbolAtLocation(k) : null;
  const sameFileFn = (f) => { f = unparen(f); const d = ts.isIdentifier(f) ? checker.getSymbolAtLocation(f)?.valueDeclaration : null; return d && d.getSourceFile() === sf && (ts.isFunctionDeclaration(d) || (ts.isVariableDeclaration(d) && !!d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer)))) ? d : null; };
  const some = (node, test) => { let found = false; const w2 = (x) => { if (test(x)) found = true; if (!found) ts.forEachChild(x, w2); }; w2(node); return found; };
  const xDecl = sym.valueDeclaration;
  const deletingCall = (call) => {
    const d = sameFileFn(call.expression);
    if (!d || !some(d, ts.isDeleteExpression)) return false;
    if (call.arguments.some((a) => same(unparen(a)))) return true; // o itself, handed over
    const own = !!xDecl && xDecl.pos >= d.pos && xDecl.end <= d.end; // o declared inside the callee: a recursive call's own local
    return !own && some(d, same); // o read from outside the callee's body
  };
  let hit = null;
  const w = (x) => {
    if (hit) return;
    if (ts.isDeleteExpression(x)) {
      const t = unparen(x.expression);
      if ((ts.isElementAccessExpression(t) || ts.isPropertyAccessExpression(t)) && same(root(t))) {
        const current = !!kSym && ts.isElementAccessExpression(t) && same(unparen(t.expression)) && ts.isIdentifier(unparen(t.argumentExpression)) && checker.getSymbolAtLocation(unparen(t.argumentExpression)) === kSym;
        if (!current) hit = x;
      }
    }
    if (!hit && ts.isCallExpression(x) && deletingCall(x)) hit = x;
    if (!hit) ts.forEachChild(x, w);
  };
  w(s.statement);
  return hit;
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
  const RECEIVER_WRITE = 'a write through the declared `this` of a free function rebuilds a nonoptional data record; a class, array, dictionary or optional receiver (or a container on the path) has no such value: take the value as a parameter and return the new one';
  let forEachDepth = 0; // inside a forEach callback read as a loop body: a `return` ends one step
  let switchDepth = 0;
  let loopDepth = 0;
  const promiseCallbacks = new Set(); // inline promise bodies have their own fault channel
  const callbackStack = []; // the arrow functions being checked, innermost last
  const aliasLocals = new Set(); // declarations of locals bound to another name's object (an alias): never mutated here
  const aliasCalls = new Map(); // alias declarations bound to a call's result or a loop element -> what they hold, for the message
  const aliasMsg = (name, decl, tail = true) => aliasCalls.has(decl) ? `\`${name}\` holds ${aliasCalls.get(decl)}, which may be a field, a parameter, an element or a module object under another name; copy it (return a copy from a same-file callee), or change that object through its own name` : `\`${name}\` is another name for a value this function was handed${tail ? '; change it through that name, or copy it first' : ''}`;
  const MUT_NAMES = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'set', 'add', 'delete', 'clear', 'fill', 'copyWithin']);
  const handedCallbacks = new Set(); // stage 5 rank 20: arrows handed to an outside call (opaque values)
  const loopCallbacks = new Set(); // stage 5 rank 19: an array-method callback read as a loop body (the array method runs it once per element, in order, before returning): a cell declared outside it is the loop's state, owned by the enclosing function
  const ownedHere = (decl) => { let i = callbackStack.length - 1; while (i >= 0 && loopCallbacks.has(callbackStack[i])) i--; const cb = i >= 0 ? callbackStack[i] : null; return !cb || (decl && decl.pos >= cb.pos && decl.end <= cb.end); };
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
    if (name === 'create' && e.arguments.length === 1 && e.arguments[0].kind === K.NullKeyword) return v(e, 'prototype', '`Object.create(null)` makes an object without a prototype; a plain object\'s reads and `in` go through Object.prototype and the ordinary lane has one dictionary for both; write `{}` and test own keys with `Object.prototype.hasOwnProperty.call(d, k)`');
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
  // a computed key in a literal whose type has declared keys: why it is refused, or null when the translator reads it as a
  // case split over the key's literal members (one member names the field outright)
  // the record type the translator builds a literal as (translate.mjs objectLit recT): the spread's type when the first
  // property is a spread, else the contextual type without its absent members, else (a union, a non-object) the literal's own type
  const literalRecordType = (lit) => {
    const first = lit.properties[0];
    const ctx = checker.getContextualType(lit);
    let rt = first && ts.isSpreadAssignment(first) ? tOf(first.expression) : ctx ? (nonNull(ctx).length === 1 ? nonNull(ctx)[0] : ctx) : null;
    if (!rt || !(rt.flags & (TF.Object | TF.Intersection))) rt = tOf(lit);
    return rt;
  };
  const literalKeyWhy = (p, lt, lit) => {
    const parts = nonNull(lt);
    if (parts.length !== 1 || !(parts[0].flags & (TF.Object | TF.Intersection))) return `narrow the literal (${checker.typeToString(lt)}) to one record type before a computed key`;
    let keyCall = false; const visitKey = (x) => { if (ts.isCallExpression(x) || ts.isNewExpression(x)) keyCall = true; ts.forEachChild(x, visitKey); }; visitKey(p.name.expression);
    if (keyCall) return 'bind the computed key before the literal; a key call may mutate its receiver';
    const ks = nonNull(tOf(p.name.expression));
    if (!ks.length || !ks.every((t) => t.flags & (TF.StringLiteral | TF.NumberLiteral))) return 'a computed key on a record with declared keys is a literal or a union of literals; give the literal a Record<string, T> type for an open key';
    const names = ks.map((t) => String(t.value));
    if (names.some((k) => ['constructor', 'prototype', '__proto__'].includes(k))) return 'this computed key reaches the prototype chain; name a declared data field';
    const missing = names.filter((k) => !checker.getPropertyOfType(parts[0], k));
    if (missing.length) return `key ${missing.map((k) => JSON.stringify(k)).join(', ')} is not declared on ${checker.typeToString(lt)}`;
    if (lit.properties.some((q) => ts.isMethodDeclaration(q) || ts.isGetAccessorDeclaration(q) || ts.isSetAccessorDeclaration(q))) return 'a computed key needs a data-only literal; use a class for methods';
    const fts = [...new Set(names.map((k) => checker.typeToString(checker.getTypeOfSymbolAtLocation(checker.getPropertyOfType(parts[0], k), p))))];
    if (fts.length > 1) return `the fields of the key union have different types (${fts.join(', ')}); write one literal per key`;
    return null;
  };
  // a type that may hold undefined (void, undefined, any, unknown, or a union with one of them): a default on a value of it may apply
  const typeAdmitsUndefined = (t) => !!(t.flags & (TF.Void | TF.Undefined | TF.Any | TF.Unknown)) || (!!(t.flags & TF.Union) && t.types.some((x) => !!(x.flags & (TF.Void | TF.Undefined | TF.Any | TF.Unknown))));
  // stage 5 rank 13: why an effectful callback's parameter stays out, or null. The element parameter may be an object or
  // array pattern without a rest element (the loop binds it from the element as `for (const { id } of xs)` does), and
  // may carry a default only when the element type never holds undefined (the default then never applies and the
  // reading is the element itself); a rest parameter, an optional marker, a nested rest, or a default the element may
  // take stays refused. The index and reduce's accumulator are plain names.
  const effectfulParamWhy = (p, isElement, method) => {
    if (p.dotDotDotToken) return `a rest parameter of the ${method} callback is outside the subset; name the element`;
    if (p.questionToken) return `an optional parameter of the ${method} callback is outside the subset`;
    if (!isElement) return ts.isIdentifier(p.name) && !p.initializer ? null : `the ${method === 'reduce' ? 'accumulator' : 'index'} of the ${method} callback is a plain name`;
    if (p.initializer && typeAdmitsUndefined(tOf(p.name))) return `a default on the ${method} callback's element applies when the element is undefined; the element type admits it, so the default is not read: destructure with the default inside the pattern, or narrow the array`;
    if (ts.isIdentifier(p.name)) return null;
    const nestedRest = (pat) => (ts.isObjectBindingPattern(pat) || ts.isArrayBindingPattern(pat)) && pat.elements.some((el) => ts.isBindingElement(el) && (el.dotDotDotToken || nestedRest(el.name)));
    if (nestedRest(p.name)) return `a rest element inside the ${method} callback's destructured element is outside the subset; name the fields you read`;
    return null;
  };
  const isArrayExpr = (e) => nonNull(tOf(e)).every((t) => isArrayLike(checker, t));
  // a Map or Set iterator made where it is read (`m.keys()`, `m.values()`, `m.entries()`, the same on a Set)
  const collectionIterator = (e) => { e = unparenX(e); return ts.isCallExpression(e) && !e.arguments.length && ts.isPropertyAccessExpression(e.expression) && ['keys', 'values', 'entries'].includes(e.expression.name.text) && nonNull(tOf(e.expression.expression)).length > 0 && (nonNull(tOf(e.expression.expression)).every(isSetT) || nonNull(tOf(e.expression.expression)).every(isMapT)); };
  // the places that consume such an iterator at once, in order: a spread in an array literal, a for-of, Array.from of it
  // alone, a Map or Set constructor; anywhere else the iterator is a value that its first read uses up
  const iteratorConsumed = (e) => {
    let use = e; while (use.parent && ts.isParenthesizedExpression(use.parent)) use = use.parent;
    const p = use.parent;
    if (!p) return false;
    if (ts.isSpreadElement(p)) return !!p.parent && ts.isArrayLiteralExpression(p.parent);
    if (ts.isForOfStatement(p)) return p.expression === use && !p.awaitModifier;
    if (ts.isCallExpression(p)) return p.arguments.length === 1 && p.arguments[0] === use && ts.isPropertyAccessExpression(p.expression) && ts.isIdentifier(p.expression.expression) && p.expression.expression.text === 'Array' && p.expression.name.text === 'from' && declOf(p.expression.expression).kind === 'global';
    if (ts.isNewExpression(p)) return (p.arguments ?? []).length === 1 && p.arguments[0] === use && ts.isIdentifier(p.expression) && ['Map', 'Set'].includes(p.expression.text);
    return false;
  };
  // what `new Map(x)` and `new Set(x)` read in order: an array, a Map, a Set, one of their iterators, a pure generator,
  // an opaque value (its own iteration, an uninterpreted sequence)
  const orderedSource = (x) => isArrayExpr(x) || nonNull(tOf(x)).every((t) => isSetT(t) || isMapT(t)) || nonNull(tOf(x)).some(isAny) || collectionIterator(x) || generators.pureCall(x);
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
    if (!asCallee && o.kind === 'unit' && exceptionUnits.has(name) && !enclosingOpaqueTry(id) && !(id.parent && ts.isCallExpression(id.parent) && id.parent.arguments.includes(id))) return v(id, 'exception-callback', 'call the throwing unit directly, or pass it to a call; a stored function value has no fault channel'); // stage 5 rank 20: as a call argument it is an opaque value (outside) or a loop body (array method)
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
    if (libGlobalRoot(checker, id, sf, current)) return; // a lib or runtime global: a world read
    if (o.kind === 'global') return v(id, 'global-read', `global \`${name}\` is outside the subset`);
    return v(id, 'global-read', `\`${name}\` cannot be resolved`);
  }

  // ---------- class statics ----------
  // `C.m(x)` and `C.K` for a class C declared at the top of this file: the class is named by its declaration, not a
  // module cell. A static method is the unit `C.m`; a static field is a module cell (a constant, or a world cell when it is
  // written or holds an object). Static accessors, function-valued fields, private names and inherited statics stay out.
  function sameFileStatic(e) {
    if (!ts.isPropertyAccessExpression(e) || !ts.isIdentifier(e.expression) || !ts.isIdentifier(e.name)) return null;
    const o = declOf(e.expression);
    if (o.kind !== 'module-mutable' || !o.decl || !ts.isClassDeclaration(o.decl) || o.decl.parent !== sf || !o.decl.name) return null;
    if (o.decl.members.some(ts.isClassStaticBlockDeclaration)) return null; // a static block sets statics on import, outside every unit
    const own = o.decl.members.filter((m) => m.name && ts.isIdentifier(m.name) && m.name.text === e.name.text && m.modifiers?.some((k) => k.kind === K.StaticKeyword));
    if (!own.length) return null;
    if (own.every(ts.isMethodDeclaration)) return units.get(`${o.decl.name.text}.${e.name.text}`)?.isStatic ? { cls: o.decl, member: own.find((m) => m.body) ?? own[0], kind: 'method' } : null;
    if (own.length === 1 && ts.isPropertyDeclaration(own[0]) && !own[0].modifiers?.some((k) => k.kind === K.DeclareKeyword || k.kind === K.AbstractKeyword)) return { cls: o.decl, member: own[0], kind: 'field' };
    return null;
  }
  // `this` and `super` in a static method name whichever class the call went through (a subclass too), not the class
  // that declares the method, so the unit is read as one opaque transition keyed by the file's text; that reading names
  // each parameter, so a destructured parameter beside them is refused. Arrows inherit them, nested functions do not
  function staticThis(body) {
    const w = (x) => {
      if (ts.isFunctionDeclaration(x) || ts.isFunctionExpression(x) || ts.isClassLike(x)) return;
      if (x.kind === K.ThisKeyword || x.kind === K.SuperKeyword) v(x, 'static-this', `\`${x.kind === K.ThisKeyword ? 'this' : 'super'}\` in a static method is the class the call names, a subclass too; name the class itself, or give the method plain parameter names`);
      ts.forEachChild(x, w);
    };
    w(body);
  }
  // a static field read: refused when it holds a function (a call through it has no unit) or is the receiver of an in-place mutator
  function staticFieldRead(e) {
    const t = tOf(e);
    if (nonNull(t).some((x) => checker.getSignaturesOfType(x, ts.SignatureKind.Call).length)) return v(e, 'global-read', `\`${e.getText(sf)}\` holds a function; call a static method of the class instead`);
    const p = e.parent;
    if (p && ts.isPropertyAccessExpression(p) && p.expression === e && MUT_NAMES.has(p.name.text) && p.parent && ts.isCallExpression(p.parent) && p.parent.expression === p) return v(p.parent, 'global-read', `\`.${p.name.text}()\` changes the static \`${e.getText(sf)}\` in place; assign a new value to the field instead`);
    checkType(t, e);
  }

  // ---------- statements ----------
  const isParam = (decl) => !!decl && ts.isParameter(decl);
  // param-rebind: a parameter the unit reassigns in its own body is a local that starts as the argument (modules are
  // strict, so no `arguments` slot aliases it, and the lint refuses `arguments`). Each read sees the latest write before
  // it, as for a `let`. Refused by name (param-assign): a write inside a callback or a local function, the own parameter
  // of a callback or a local function, a rest parameter, a parameter of a generator, a parameter the unit also changes
  // in place (an output: the caller would take back the rebound object), and one a closure reads before a later write
  // or inside a loop that writes it (the closure would keep the old value).
  const PARAM_MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'set', 'add', 'delete', 'clear', 'fill', 'copyWithin']);
  let mutatedParamSets = null; // unit name -> names of its parameters it changes in place, same-file calls followed (the translator's outputs)
  const paramRootOf = (x) => { while (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x) || ts.isNonNullExpression(x) || ts.isParenthesizedExpression(x)) x = x.expression; return x; };
  const mutatedParams = (name) => {
    if (!mutatedParamSets) {
      const all = [...units.values()].filter((u) => u.body);
      const namesOf = (u) => new Set(u.params.filter((p) => ts.isIdentifier(p.name)).map((p) => p.name.text));
      mutatedParamSets = new Map(all.map((u) => {
        const ps = namesOf(u), out = new Set();
        const hit = (x) => { const r = paramRootOf(x); if (ts.isIdentifier(r) && ps.has(r.text) && r !== x) out.add(r.text); };
        const w = (n) => {
          if (ts.isFunctionLike(n) && n !== u.fn) return;
          if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment) hit(n.left);
          if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && [K.PlusPlusToken, K.MinusMinusToken].includes(n.operator)) hit(n.operand);
          if (ts.isDeleteExpression(n)) hit(n.expression);
          if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && PARAM_MUTATORS.has(n.expression.name.text)) { const r = paramRootOf(n.expression.expression); if (ts.isIdentifier(r) && ps.has(r.text)) out.add(r.text); }
          if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === 'Object' && n.expression.name.text === 'assign' && n.arguments[0]) { const r = paramRootOf(n.arguments[0]); if (ts.isIdentifier(r) && ps.has(r.text)) out.add(r.text); }
          ts.forEachChild(n, w);
        };
        w(u.body);
        return [u.name, out];
      }));
      for (let changed = true; changed;) {
        changed = false;
        for (const u of all) {
          const ps = namesOf(u), mine = mutatedParamSets.get(u.name);
          const w = (n) => {
            if (ts.isFunctionLike(n) && n !== u.fn) return;
            if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && mutatedParamSets.has(n.expression.text)) {
              const callee = units.get(n.expression.text), cm = mutatedParamSets.get(callee.name);
              callee.params.forEach((cp, i) => { const a = n.arguments[i] && paramRootOf(n.arguments[i]); if (ts.isIdentifier(cp.name) && cm.has(cp.name.text) && a && ts.isIdentifier(a) && ps.has(a.text) && !mine.has(a.text)) { mine.add(a.text); changed = true; } });
            }
            ts.forEachChild(n, w);
          };
          w(u.body);
        }
      }
    }
    return mutatedParamSets.get(name) ?? new Set();
  };
  const paramRebindRefusal = (decl) => {
    const name = decl.name.getText(sf);
    if (decl.parent !== currentFn) return `\`${name}\` is a parameter of a callback or a local function; copy it to a local first`;
    if (callbackStack.length || objectMethod || forEachDepth) return `parameter \`${name}\` is assigned inside a callback or a local function; a callback cannot change it`;
    if (decl.dotDotDotToken) return `\`${name}\` is a rest parameter; copy it to a local first`;
    if (currentFn.asteriskToken) return `parameter \`${name}\` of a generator is assigned; copy it to a local first`;
    const u = [...units.values()].find((x) => x.fn === currentFn);
    if (!u || mutatedParams(u.name).has(name)) return `parameter \`${name}\` is rebound and also changed in place, which hands the change back to the caller; copy it to a local first`;
    const sym = checker.getSymbolAtLocation(decl.name);
    const symOf = (id) => (id.parent && ts.isShorthandPropertyAssignment(id.parent) && id.parent.name === id ? checker.getShorthandAssignmentValueSymbol(id.parent) : checker.getSymbolAtLocation(id));
    const isTarget = (id) => { let x = id; while (x.parent && ts.isParenthesizedExpression(x.parent)) x = x.parent; const p = x.parent; return !!p && ((ts.isBinaryExpression(p) && p.left === x && p.operatorToken.kind >= K.FirstAssignment && p.operatorToken.kind <= K.LastAssignment) || ((ts.isPrefixUnaryExpression(p) || ts.isPostfixUnaryExpression(p)) && [K.PlusPlusToken, K.MinusMinusToken].includes(p.operator))); };
    const writes = [], closures = [];
    const w = (n) => {
      if (ts.isFunctionLike(n) && n !== currentFn) { let reads = false; const r = (x) => { if (reads) return; if (ts.isIdentifier(x) && symOf(x) === sym) reads = true; ts.forEachChild(x, r); }; r(n); if (reads) closures.push(n); return; }
      if (ts.isIdentifier(n) && symOf(n) === sym && isTarget(n)) writes.push(n);
      ts.forEachChild(n, w);
    };
    w(currentFn.body);
    const loopHolding = (a, b) => { for (let p = a.parent; p && p !== currentFn; p = p.parent) if (ts.isIterationStatement(p, false) && b.pos >= p.pos && b.end <= p.end) return true; return false; };
    for (const c of closures) for (const x of writes) if (c.getStart(sf) < x.getStart(sf) || loopHolding(c, x)) return `a closure reads parameter \`${name}\` and a later write rebinds it; copy it to a local first`;
    return null;
  };
  const declOf = (id) => originOf(checker, id, sf, current);
  // what a value may be another name for: true (a name, a field, an element, a declared `this`), a description (the result
  // of a call that may return an existing object), or null (a value the function built here)
  function heldBy(x) {
    while (ts.isParenthesizedExpression(x) || ts.isNonNullExpression(x) || ts.isAsExpression(x) || ts.isSatisfiesExpression(x) || ts.isTypeAssertionExpression(x) || (ts.isAwaitExpression(x) && ts.isCallExpression(unparenX(x.expression)))) x = x.expression;
    if (ts.isIdentifier(x) || ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x) || (x.kind === K.ThisKeyword && !!thisParam)) return x.kind === K.ThisKeyword || nonNull(tOf(x)).some((y) => !isPrim(y) && !isAny(y)) ? true : null; // `undefined` or a number names no object
    if (ts.isCallExpression(x)) { const callee = sameFileCallee(x, currentClass); return (callee ? !returnsFresh(callee) : libraryFresh(x) === false) ? `the result of \`${callee ? callee.name : libraryOp(x)}\`` : null; }
    if (ts.isBinaryExpression(x) && [K.QuestionQuestionToken, K.BarBarToken, K.AmpersandAmpersandToken].includes(x.operatorToken.kind)) return heldBy(x.left) ?? heldBy(x.right);
    if (ts.isBinaryExpression(x) && x.operatorToken.kind === K.CommaToken) return heldBy(x.right);
    if (ts.isConditionalExpression(x)) return heldBy(x.whenTrue) ?? heldBy(x.whenFalse);
    return null;
  }
  // an alias local rebound: `let flat = merged; if (g) { flat = []; flat.push(h) }` changes the fresh array, not the
  // value it was handed. A change at a site goes to the alias only when no earlier statement of an enclosing list rebinds
  // the name to a fresh value (a literal, `new`, a fresh call) with nothing in between that writes it again; a rebinding
  // outside a loop the site sits in counts only when the loop never assigns the name
  const freshRebind = (x) => !heldBy(x);
  const assignsName = (node, sym) => { let hit = false; const w = (x) => { if (hit) return; if (ts.isBinaryExpression(x) && x.operatorToken.kind >= K.FirstAssignment && x.operatorToken.kind <= K.LastAssignment) { const l = unparenX(x.left); if ((ts.isIdentifier(l) && checker.getSymbolAtLocation(l) === sym) || ((ts.isArrayLiteralExpression(l) || ts.isObjectLiteralExpression(l)) && l.getText(sf).includes(sym.name))) hit = true; } if ((ts.isPrefixUnaryExpression(x) || ts.isPostfixUnaryExpression(x)) && ts.isIdentifier(unparenX(x.operand)) && checker.getSymbolAtLocation(unparenX(x.operand)) === sym) hit = true; ts.forEachChild(x, w); }; w(node); return hit; };
  const aliasAt = (decl, site) => {
    const sym = decl && ts.isIdentifier(decl.name) ? checker.getSymbolAtLocation(decl.name) : null;
    if (!sym || !site) return true;
    const loops = [];
    for (let child = site, p = site.parent; p; child = p, p = p.parent) {
      if (p === decl || ts.isFunctionLike(p)) return true; // reached the declaration, or a function boundary: the handed value may hold
      if (ts.isIterationStatement(p, false) && child === p.statement) loops.push(p);
      const list = ts.isBlock(p) || ts.isCaseClause(p) || ts.isDefaultClause(p) || ts.isSourceFile(p) ? p.statements : null;
      if (!list) { for (const c of p.getChildren(sf)) { if (c === child || c.pos >= child.pos) break; if (assignsName(c, sym)) return true; } continue; } // a write in a head before the site
      for (let i = list.indexOf(child) - 1; i >= 0; i--) {
        const st = list[i];
        if (st.pos <= decl.pos && decl.end <= st.end) return true; // the declaration itself: the handed value
        if (!assignsName(st, sym)) continue;
        const ex = ts.isExpressionStatement(st) ? unparenX(st.expression) : null;
        const fresh = ex && ts.isBinaryExpression(ex) && ex.operatorToken.kind === K.EqualsToken && ts.isIdentifier(unparenX(ex.left)) && checker.getSymbolAtLocation(unparenX(ex.left)) === sym && freshRebind(ex.right) && !assignsName(ex.right, sym);
        return !fresh || loops.some((L) => assignsName(L, sym));
      }
    }
    return true;
  };
  const aliasHere = (decl, site) => aliasLocals.has(decl) && !bucketMaps(currentFn, checker).locals.has(decl) && aliasAt(decl, site); // a bucket local's push writes its map (common.mjs bucketMaps)

  function stmts(list) { for (const s of list) stmt(s); }
  function stmt(s) {
    switch (s.kind) {
      case K.Block: return stmts(s.statements);
      case K.EmptyStatement: return;
      case K.TypeAliasDeclaration: case K.InterfaceDeclaration: return; // stage 5 rank 16: erased at run time; every use is read through the checker
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
        { // `for (const r of rs) r.n = 1`: each element is another name for an object the iterated value holds
          const d0 = ts.isVariableDeclarationList(init) ? init.declarations[0] : null;
          if (d0 && ts.isIdentifier(d0.name) && nonNull(tOf(d0.name)).some((x) => !isPrim(x) && !isAny(x))) { aliasLocals.add(d0); aliasCalls.set(d0, `an element of \`${s.expression.getText(sf).slice(0, 40)}\``); }
        }
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
        { const del = forInDelete(s, checker, sf); if (del) v(del, 'for-in-delete', 'a for-in skips a key deleted before its visit (ECMA-262 14.7.5.9), and the reading visits the keys the object held at the start; delete only the current key inside the loop, or delete after the loop'); }
        expr(s.expression); loopDepth++; stmt(s.statement); loopDepth--; return;
      }
      case K.BreakStatement: if (switchDepth > 0 || loopDepth > 0) return; return v(s, 'break-continue', 'break outside a loop or switch');
      case K.ContinueStatement: if (loopDepth > 0) return; return v(s, 'break-continue', 'continue outside a loop');
      case K.ThrowStatement:
        if (callbackStack.length && !promiseCallbacks.has(callbackStack[callbackStack.length - 1]) && !loopCallbacks.has(callbackStack.at(-1)) && !handedCallbacks.has(callbackStack.at(-1)) && !callbackStack.at(-1).modifiers?.some((m) => m.kind === K.AsyncKeyword) && !enclosingOpaqueTry(s)) return v(s, 'exception-callback', 'move the throw to a same-file unit and call it directly'); // stage 5 rank 20: a loop callback's throw is the unit's (an opaque block); a handed callback's is the outside's
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
        const proc = localProcedure(s, checker, currentFn);
        if (proc) loopCallbacks.add(s); // stage 5 rank 21: a local procedure's body is the unit's own
        callbackStack.push(s);
        if (proc) for (const p of s.parameters) if (p.initializer) expr(p.initializer); // a default runs at a call that leaves its parameter out
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
    if (fn && ts.isConstructorDeclaration(fn)) return true; // a constructor's bare return ends it; `new` yields the receiver
    // a bare return yields `undefined`, the value every path without a return yields: admitted where the result admits it
    const admitsUndefined = (t) => !!(t.flags & (TF.Void | TF.Undefined | TF.Any | TF.Unknown)) || (!!(t.flags & TF.Union) && t.types.some((x) => !!(x.flags & (TF.Void | TF.Undefined))));
    return !!fn?.asteriskToken || (!!inner && admitsUndefined(inner));
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
  // the record rest of a parameter, any field types: an uninterpreted function of the source record named by the
  // excluded keys; the source is a plain record, an intersection of plain records or untyped, the keys are written names
  function paramRecordRest(pattern, rest) {
    let p = pattern; while (p && (ts.isObjectBindingPattern(p) || ts.isArrayBindingPattern(p) || ts.isBindingElement(p))) p = p.parent;
    if (!p || !ts.isParameter(p) || !ts.isIdentifier(rest.name)) return false;
    const src = tOf(pattern), dst = tOf(rest.name);
    const plain = (t) => !!(t.flags & TF.Object) && !(t.objectFlags & ts.ObjectFlags.Class) && !t.symbol?.declarations?.some((d) => ts.isClassDeclaration(d) || ts.isClassExpression(d)) && !isArrayLike(checker, t) && !checker.getSignaturesOfType(t, ts.SignatureKind.Call).length && !checker.getIndexInfosOfType(t).length;
    const plainAll = (t) => (t.flags & TF.Intersection ? t.types.every(plain) : plain(t));
    const anyT = (t) => !!(t.flags & TF.Any); // an unresolved or untyped source: the remainder is as opaque as the source
    if (!(anyT(src) && anyT(dst)) && (!plainAll(src) || !plain(dst))) return false;
    if (pattern.elements.some((el) => !el.dotDotDotToken && el.propertyName ? !ts.isIdentifier(el.propertyName) && !ts.isStringLiteral(el.propertyName) : !el.dotDotDotToken && !ts.isIdentifier(el.name))) return false;
    return checker.getPropertiesOfType(src).every((q) => !q.name.startsWith('__@') && !q.declarations?.some((d) => ts.isGetAccessorDeclaration(d) || ts.isSetAccessorDeclaration(d)));
  }
  function bindingNames(name, outNames) {
    if (ts.isIdentifier(name)) { outNames.push(name); return; }
    if (ts.isObjectBindingPattern(name) && localMethodLiteral(tOf(name))) v(name, 'object-method-mutation', 'read named fields on the literal object; copying accessors or detached methods needs a receiver');
    for (const el of name.elements) {
      if (ts.isOmittedExpression(el)) continue;
      if (el.dotDotDotToken) { if (!ts.isArrayBindingPattern(name) && !recordRestShape(name, el) && !paramRecordRest(name, el)) { v(el, 'record-rest', 'record rest needs a parameter of a plain record with written keys, or a fixed nonempty scalar record without defaults; copy named fields explicitly'); continue; } if (!ts.isArrayBindingPattern(name) && !recordRestShape(name, el)) aliasLocals.add(el); bindingNames(el.name, outNames); continue; } // `[a, ...rest]`: the tail of the sequence
      if (el.initializer) { expr(el.initializer); } // `{ a = d }` / `[a = d]`: the default applies when the field is absent
      bindingNames(el.name, outNames);
    }
  }
  // a same-file call's result is fresh when no other name can reach it: every return of the callee is a primitive, a
  // literal whose reference parts are fresh, `new` of fresh arguments, a copy whose members are primitives (a spread,
  // `slice`, `filter`, `map`), the fresh result of another same-file call, or a local built that way and never shared.
  // A field, a parameter, an element, an outside call, a generator, a cycle of callees: not fresh (another name may hold it)
  const freshMemo = new Map();
  const membersPrim = (t) => nonNull(t).every((x) => {
    if (isPrim(x)) return true;
    if (isAny(x) || x.flags & TF.TypeParameter) return false;
    if (isArrayLike(checker, x)) { const el = checker.getIndexTypeOfType(x, ts.IndexKind.Number); return !!el && nonNull(el).every(isPrim); }
    if (isSetT(x) || isMapT(x)) { const args = checker.getTypeArguments ? checker.getTypeArguments(x) : (x.typeArguments ?? []); return args.length > 0 && args.every((a) => nonNull(a).every(isPrim)); }
    if (!isRecordish(x) || checker.getSignaturesOfType(x, ts.SignatureKind.Call).length) return false;
    const si = checker.getIndexInfoOfType(x, ts.IndexKind.String);
    if (si && !nonNull(si.type).every(isPrim)) return false;
    return checker.getPropertiesOfType(x).every((p) => nonNull(checker.getTypeOfSymbol(p)).every(isPrim));
  });
  const sameFileCallee = (call, cls) => { // the unit a call names: `this.m()` inside a class, or a same-file function
    const f = unparenX(call.expression);
    if (ts.isPropertyAccessExpression(f) && f.expression.kind === K.ThisKeyword && cls?.name) return units.get(`${cls.name.text}.${f.name.text}`) ?? null;
    if (ts.isIdentifier(f)) { const sym = checker.getSymbolAtLocation(f); const decl = sym?.valueDeclaration ?? sym?.declarations?.[0]; return [...units.values()].find((u) => !u.cls && decl && (u.node === decl || u.fn === decl || (ts.isVariableDeclaration(decl) && decl.initializer === u.fn))) ?? null; }
    return null;
  };
  // a built-in call by its table name (`Array.prototype.find`, `Map.prototype.get`, `Object.assign`, `structuredClone`)
  const libraryOp = (call) => {
    const f = unparenX(call.expression);
    if (ts.isIdentifier(f)) return f.text === 'structuredClone' && declOf(f).kind === 'global' ? f.text : null;
    if (!ts.isPropertyAccessExpression(f)) return null;
    const r = f.expression, name = f.name.text;
    if (ts.isIdentifier(r) && ['Object', 'Array', 'Promise', 'JSON'].includes(r.text) && declOf(r).kind === 'global') return `${r.text}.${name}`;
    const rt = nonNull(tOf(r)); if (!rt.length || rt.some(isAny)) return null;
    const kind = rt.every((x) => isArrayLike(checker, x)) ? 'Array' : rt.every(isSetT) ? 'Set' : rt.every(isMapT) ? 'Map' : rt.every(isStr) ? 'String' : rt.every(isPromiseT) ? 'Promise' : null;
    return kind ? `${kind}.prototype.${name}` : null;
  };
  // true: the call returns a new object no other name reaches (an array copy's elements may be shared, and every change
  // below an element is refused on its own); false: it may return an object the caller can reach; null: not a built-in call
  const libraryFresh = (call) => {
    const op = libraryOp(call); if (!op) return null;
    if (op === 'Promise.resolve') { const a = call.arguments[0] && unparenX(call.arguments[0]); return !!a && (ts.isArrayLiteralExpression(a) || ts.isObjectLiteralExpression(a) || ts.isNewExpression(a)) && freshShallowLiteral(a); }
    const res = LIBRARY_RESULT.get(op) ?? LIBRARY_RESULT_MORE[op] ?? (op.startsWith('String.prototype.') ? 'fresh' : null); // a string method never returns an object the caller holds
    if (res === 'primitive') return true; // a primitive result is no object the caller could hold
    if (res !== 'fresh') return false; // an unknown built-in counts as returning an existing object
    if (op === 'structuredClone' || op === 'JSON.parse' || op === 'Object.create') return true; // a whole new graph; `Object.create(null)` (a prototype argument is refused as `prototype`) an empty object
    const t = checker.getAwaitedType?.(tOf(call)) ?? tOf(call);
    return nonNull(t).every((x) => isPrim(x) || isArrayLike(checker, x)) || membersPrim(t) || /^(Array|Map|Set)\.prototype\.(keys|values|entries)$/.test(op);
  };
  const freshShallowLiteral = (a) => (ts.isArrayLiteralExpression(a) ? a.elements : ts.isObjectLiteralExpression(a) ? a.properties : (a.arguments ?? [])).every((x) => { const v = ts.isPropertyAssignment(x) ? x.initializer : ts.isSpreadElement(x) || ts.isSpreadAssignment(x) ? null : x; return !!v && nonNull(tOf(v)).every(isPrim); });
  function returnsFresh(u) {
    if (freshMemo.has(u)) return freshMemo.get(u) === true; // a callee still being read (a cycle) is unknown: not fresh
    freshMemo.set(u, 'reading');
    let fresh = !u.fn.asteriskToken && !!u.body;
    const inUnit = (decl) => !!decl && decl.pos >= u.fn.pos && decl.end <= u.fn.end;
    const strip = (x) => { while (ts.isParenthesizedExpression(x) || ts.isAsExpression(x) || ts.isNonNullExpression(x) || ts.isSatisfiesExpression(x) || ts.isAwaitExpression(x) || ts.isTypeAssertionExpression(x)) x = x.expression; return x; };
    const localsSeen = new Set();
    const freshLocal = (decl) => {
      if (localsSeen.has(decl)) return false; // a local read again while it is being read: not fresh
      localsSeen.add(decl);
      if (!decl.initializer || !ts.isIdentifier(decl.name) || !freshExpr(decl.initializer)) return false;
      const sym = checker.getSymbolAtLocation(decl.name);
      let ok = true;
      const rootOf = (x) => { while (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x) || ts.isParenthesizedExpression(x) || ts.isNonNullExpression(x)) x = x.expression; return x; };
      const w = (x) => {
        if (!ok) return;
        if (ts.isIdentifier(x) && x !== decl.name && checker.getSymbolAtLocation(x) === sym && !(x.parent && ts.isPropertyAccessExpression(x.parent) && x.parent.name === x)) {
          let top = x; // the use, widened over the member reads it is the receiver of
          while (top.parent && ((ts.isPropertyAccessExpression(top.parent) && top.parent.expression === top) || (ts.isElementAccessExpression(top.parent) && top.parent.expression === top) || ts.isNonNullExpression(top.parent) || ts.isParenthesizedExpression(top.parent))) top = top.parent;
          const p = top.parent;
          let inReturn = false; for (let q = x.parent; q && q !== u.fn; q = q.parent) { if (ts.isFunctionLike(q)) break; if (ts.isReturnStatement(q)) { inReturn = true; break; } }
          if (top === x && inReturn) return; // returned, or read inside a returned expression the return check reads itself
          if (p && ts.isBinaryExpression(p) && p.left === top && p.operatorToken.kind >= K.FirstAssignment && p.operatorToken.kind <= K.LastAssignment) { if (!(nonNull(tOf(p.right)).every(isPrim) || freshExpr(p.right))) ok = false; return; } // a write into it (or a rebinding) of a fresh value
          if (p && ts.isCallExpression(p) && p.expression === top && top !== x) { if (!p.arguments.every((a) => nonNull(tOf(a)).every(isPrim) || freshExpr(a))) ok = false; return; } // a method call on it with fresh arguments
          if (top !== x && nonNull(tOf(top)).every(isPrim)) return; // a primitive read through it
          if (p && (ts.isPrefixUnaryExpression(p) || ts.isPostfixUnaryExpression(p))) return;
          ok = false; return; // any other use may share it
        }
        ts.forEachChild(x, w);
      };
      w(u.body);
      return ok;
    };
    function freshExpr(e) {
      e = strip(e);
      if (nonNull(tOf(e)).every(isPrim)) return true;
      if (ts.isArrayLiteralExpression(e)) return e.elements.every((x) => ts.isSpreadElement(x) ? membersPrim(tOf(x.expression)) : freshExpr(x));
      if (ts.isObjectLiteralExpression(e)) return e.properties.every((q) => ts.isPropertyAssignment(q) ? freshExpr(q.initializer) : ts.isShorthandPropertyAssignment(q) ? freshExpr(q.name) : ts.isSpreadAssignment(q) ? membersPrim(tOf(q.expression)) : ts.isMethodDeclaration(q) || ts.isAccessor(q));
      if (ts.isNewExpression(e)) return (e.arguments ?? []).every((a) => !ts.isSpreadElement(a) && freshExpr(a));
      if (ts.isConditionalExpression(e)) return freshExpr(e.whenTrue) && freshExpr(e.whenFalse);
      if (ts.isBinaryExpression(e) && [K.QuestionQuestionToken, K.BarBarToken, K.AmpersandAmpersandToken].includes(e.operatorToken.kind)) return freshExpr(e.left) && freshExpr(e.right);
      if (ts.isBinaryExpression(e) && e.operatorToken.kind === K.CommaToken) return freshExpr(e.right);
      if (ts.isCallExpression(e)) {
        const callee = sameFileCallee(e, u.cls);
        if (callee) return returnsFresh(callee);
        const f = unparenX(e.expression);
        return libraryFresh(e) === true; // a built-in: its table row says whether the result is new
      }
      if (ts.isIdentifier(e)) { const sym = checker.getSymbolAtLocation(e); const decl = sym?.valueDeclaration; return !!decl && ts.isVariableDeclaration(decl) && inUnit(decl) && freshLocal(decl); }
      return false;
    }
    if (fresh && !ts.isBlock(u.body)) fresh = freshExpr(u.body); // an expression-bodied arrow returns its body
    else if (fresh) { const w = (x) => { if (!fresh || (ts.isFunctionLike(x) && x !== u.fn)) return; if (ts.isReturnStatement(x) && x.expression && !freshExpr(x.expression)) fresh = false; ts.forEachChild(x, w); }; ts.forEachChild(u.body, w); }
    freshMemo.set(u, fresh);
    return fresh;
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
      // `const s = this.held()`, `const t = pick(user)`: the result of a same-file call may be a field, a parameter or a module
      // object under another name, unless the callee is fresh (returnsFresh); a change through it is a change of that object
      // `const t = rs.find(...)`, `m.get(k)`, `Promise.resolve(x)`: a built-in whose table row returns an existing object (libraryFresh)
      // `m.get(k) ?? []`, `a || b`, `c ? a : b`: the value is one of the operands, so it holds what either operand holds
      const objish = (t) => nonNull(t).some((x) => !isPrim(x) && !isAny(x));
      const held = heldBy(d.initializer);
      if (held && ts.isIdentifier(d.name) && objish(tOf(d.name))) { aliasLocals.add(d); if (held !== true) aliasCalls.set(d, held); }
    }
    if (ts.isArrowFunction(d.initializer) && ts.isIdentifier(d.name) && localProcedure(d, checker, currentFn)) { // stage 5 rank 21: a local procedure, its body spliced at each call: checked as the unit's own statements
      const fn = d.initializer; loopCallbacks.add(fn);
      for (const p of fn.parameters) checkType(tOf(p.name), p);
      callbackStack.push(fn);
      for (const p of fn.parameters) if (p.initializer) expr(p.initializer); // a default runs at a call that leaves its parameter out
      const savedLoop = loopDepth, savedSwitch = switchDepth, savedEach = forEachDepth; loopDepth = 0; switchDepth = 0; forEachDepth = 0;
      try { const prev = current; stmts(fn.body.statements); current = prev; } finally { callbackStack.pop(); loopDepth = savedLoop; switchDepth = savedSwitch; forEachDepth = savedEach; }
      return;
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
          else if (isParam(o.decl)) { const why = paramRebindRefusal(o.decl); if (why) v(l, 'param-assign', why); }
          else if (!ownedHere(o.decl)) v(l, 'closure-mutation', `\`${l.text}\` is declared outside this callback; a callback cannot change it`);
        } else if (ts.isElementAccessExpression(l) && ts.isIdentifier(l.expression) && (isArrayExpr(l.expression) || nonNull(tOf(l.expression)).every(hasStringIndex))) {
          // an element of a local array, or a key of a local dictionary (a record with a string index): the local is rebuilt
          const dict = !isArrayExpr(l.expression);
          const o = declOf(l.expression);
          if (o.kind !== 'local') v(l, 'index-assign', `index assignment into \`${l.expression.text}\`, which this function does not own`);
          else if (aliasHere(o.decl, l)) v(l, 'alias-mutation', aliasMsg(l.expression.text, o.decl));
          else if (!ownedHere(o.decl)) v(l, 'closure-mutation', `a callback cannot change an outer ${dict ? 'dictionary' : 'array'}`);
          else if (op !== K.EqualsToken) v(l, 'index-assign', 'compound assignment on an element is outside the subset');
          else if (dict && !nonNull(tOf(l.argumentExpression)).every(isStr)) v(l, 'dynamic-key', 'a dictionary key is a string');
          else if (dict && protoKeyWrite(checker, l.argumentExpression, e.right) === 'prototype') v(l, 'prototype', 'a key that may be \'__proto__\' with an object or null value replaces the dictionary\'s prototype (the setter of Object.prototype.__proto__) and makes no key; write `d = { ...d, [k]: v }`, which makes an own key, or use a Map');
          expr(l.argumentExpression);
        } else if (ts.isPropertyAccessExpression(l) && sameFileStatic(l)?.kind === 'field') {
          // a write of a static field of a same-file class: the field is a world cell, written as a module \`let\` is
          if (nonNull(tOf(l)).some((x) => checker.getSignaturesOfType(x, ts.SignatureKind.Call).length)) v(l, 'global-read', `\`${l.getText(sf)}\` holds a function; call a static method of the class instead`);
          else if (op !== K.EqualsToken && op !== K.PlusEqualsToken && op !== K.MinusEqualsToken && op !== K.AsteriskEqualsToken) v(l, 'property-assign', 'only =, +=, -=, *= on a static field');
        } else if (ts.isPropertyAccessExpression(l)) {
          let root = l; while (ts.isPropertyAccessExpression(root)) root = root.expression;
          if (root.kind === K.ThisKeyword && !thisParam) { if (objectMethod) return v(l, 'object-method-mutation', 'literal methods keep immutable data fields; use a class for mutable receiver state'); if (l.expression.kind !== K.ThisKeyword && !receiverRecordPath(checker, l)) return v(l, 'receiver-mutation', 'a receiver path needs nonoptional data records; assign a field itself for class or opaque handles'); if (op !== K.EqualsToken && op !== K.PlusEqualsToken && op !== K.MinusEqualsToken && op !== K.AsteriskEqualsToken) return v(l, 'receiver-mutation', 'only =, +=, -=, *= on a field of `this`'); return expr(e.right); } // a receiver write checks its right side, including exact promise forms
          if (root.kind === K.ThisKeyword && thisParam && !thisParamPath(checker, l)) { v(l, 'receiver-write', RECEIVER_WRITE); return expr(e.right); } // a free function's receiver is written as a parameter is, when it is a data record
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
          else if (aliasHere(o.decl, l)) v(l, 'alias-mutation', aliasMsg(root.text, o.decl));
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
      if (ts.isPropertyAccessExpression(e.operand)) { let root = e.operand; while (ts.isPropertyAccessExpression(root)) root = root.expression; if ((root.kind === K.ThisKeyword && objectMethod) || methodLiteralPath(e.operand)) return v(e, 'object-method-mutation', 'literal method fields are immutable; use a class for mutable receiver state'); if (root.kind === K.ThisKeyword && !thisParam && e.operand.expression.kind !== K.ThisKeyword) return receiverRecordPath(checker, e.operand) ? undefined : v(e, 'receiver-mutation', 'a receiver path needs nonoptional data records'); if (root.kind === K.ThisKeyword && thisParam && !thisParamPath(checker, e.operand)) return v(e, 'receiver-write', RECEIVER_WRITE); }
      if (ts.isPropertyAccessExpression(e.operand) && e.operand.expression.kind === K.ThisKeyword && currentClass) return; // a field of the receiver: a world transition
      if (ts.isPropertyAccessExpression(e.operand) && sameFileStatic(e.operand)?.kind === 'field') return; // a static field of a same-file class: a world cell
      if (ts.isPropertyAccessExpression(e.operand)) { let r = e.operand; while (ts.isPropertyAccessExpression(r)) r = r.expression; const o = r.kind === K.ThisKeyword && thisParam ? { kind: 'local', decl: thisParam } : ts.isIdentifier(r) ? declOf(r) : { kind: null }; if (o.kind === 'local' && !aliasHere(o.decl, e) && ownedHere(o.decl)) return; return v(e, 'property-assign', `update of a field of \`${r.getText(sf)}\`, which this function does not own`); }
      if (!ts.isIdentifier(e.operand)) return v(e, 'unsupported-syntax', 'increment of a non-name');
      const o = declOf(e.operand);
      if (moduleState(checker, e.operand, sf)) checkIdent(e.operand);
      if (o.kind !== 'local' && !moduleState(checker, e.operand, sf)) v(e, 'global-mutation', `update of \`${e.operand.text}\`, which this function does not own`);
      else if (o.kind !== 'local' && ownedHere(o.decl) && unitUsesHooks()) v(e, 'render-impure', `a render function updates \`${e.operand.text}\`, a variable outside it; move the write into an event handler or an effect`);
      else if (isParam(o.decl)) { const why = paramRebindRefusal(o.decl); if (why) v(e, 'param-assign', why); }
      else if (!ownedHere(o.decl)) v(e, 'closure-mutation', 'a callback cannot change an outer variable');
      return;
    }
    if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression)) {
      const name = e.expression.name.text, r = e.expression.expression;
      const rt = tOf(r);
      if (name === 'assign' && ts.isIdentifier(r) && r.text === 'Object' && e.arguments.length >= 2) { // Object.assign(t, s…) as a statement on a record the function owns: t is rebuilt with every declared field of each source (the ordinary lane) or the Assign_ row (the heap core); a parameter target is an output
        const t0 = unparenX(e.arguments[0]);
        const ownedTarget = ts.isIdentifier(t0) && declOf(t0).kind === 'local' && ownedHere(declOf(t0).decl) && !aliasHere(declOf(t0).decl, e);
        const plainRecord = (x) => { const t = tOf(x); if (!isRecordish(t) || nonNull(t).length !== 1 || t.flags & (TF.Null | TF.Undefined)) return false; return checker.getPropertiesOfType(t).every((p) => !(p.flags & (ts.SymbolFlags.GetAccessor | ts.SymbolFlags.SetAccessor | ts.SymbolFlags.Method))); };
        const targetProps = ownedTarget && plainRecord(t0) ? new Set(checker.getPropertiesOfType(tOf(t0)).map((p) => p.name)) : null;
        const sourcesFit = !!targetProps && e.arguments.slice(1).every((s) => plainRecord(s) && checker.getPropertiesOfType(tOf(s)).every((p) => targetProps.has(p.name)));
        if (ownedTarget && sourcesFit) { checkIdent(t0); return e.arguments.slice(1).forEach((a) => expr(a)); }
      }
      { const refused = objectCallRefusal(e, r, name); if (refused) return refused; }
      // a Date setter changes the Date in place; the value reading returns the number and leaves the Date unchanged (research element 16)
      // a Date setter is a method call like any other: a world transition (the Date's state lives in the world since the clock-read lane), so no refusal and no rebinding
      if (moduleState(checker, r, sf) && MUT_NAMES.has(name)) { checkIdent(r); return argsOf(e); }
      const localOwned = ts.isIdentifier(r) && declOf(r).kind === 'local' && ownedHere(declOf(r).decl) && !aliasHere(declOf(r).decl, e);
      if (ts.isIdentifier(r) && declOf(r).kind === 'local' && aliasHere(declOf(r).decl, e) && MUT_NAMES.has(name)) return v(e, 'alias-mutation', aliasMsg(r.text, declOf(r).decl));
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
      const pathOwned = (ts.isPropertyAccessExpression(r) && ts.isIdentifier(pr) && declOf(pr).kind === 'local' && ownedHere(declOf(pr).decl) && !aliasHere(declOf(pr).decl, e)) || (ts.isPropertyAccessExpression(r) && pr.kind === K.ThisKeyword && !!thisParam && ownedHere(thisParam) && !!thisParamPath(checker, r)); // a container on a free function's data record receiver is owned as a parameter's is
      if (ts.isPropertyAccessExpression(r) && pr.kind === K.ThisKeyword && thisParam && MUT_NAMES.has(name) && !thisParamPath(checker, r)) return v(e, 'receiver-write', RECEIVER_WRITE);
      if (ts.isPropertyAccessExpression(r) && ts.isIdentifier(pr) && declOf(pr).kind === 'local' && aliasHere(declOf(pr).decl, e) && MUT_NAMES.has(name)) return v(e, 'alias-mutation', aliasMsg(pr.text, declOf(pr).decl));
      if ((name === 'push' || name === 'unshift') && isArrayExpr(r)) {
        const bucket = bucketMaps(currentFn, checker).pushes.has(e); // `m.get(k)?.push(x)` on a map this unit built: a write of the map at k
        if (!localOwned && !pathOwned && !bucket) v(e, 'param-mutation', `${name} on \`${r.getText(sf)}\`, which is not a local array${ts.isCallExpression(unparenX(r)) ? '; a push into an array a Map holds is read on a Map this function builds with `new Map()` and fills with array literals, through `m.get(k)?.push(x)`, while no other name holds its arrays' : ''}`);
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
      if ((name === 'add' || name === 'delete' || name === 'clear') && nonNull(rt).every(isSetT)) { if (!localOwned && !pathOwned) v(e, 'param-mutation', 'set mutation on a non-local'); return e.arguments.forEach(expr); }
      if ((name === 'set' || name === 'delete' || name === 'clear') && nonNull(rt).every(isMapT)) { if (!localOwned && !pathOwned) v(e, 'param-mutation', 'map mutation on a non-local'); return e.arguments.forEach(expr); }
      return expr(e); // a method call as a statement: a world transition (or a dropped value)
    }
    if (ts.isCallExpression(e) || ts.isNewExpression(e)) return expr(e);
    return v(e, 'unsupported-syntax', 'only assignments, ++/--, calls, and await may stand as statements');
  }
  function forStmt(s) {
    const i = s.initializer, c = s.condition, u = s.incrementor;
    if (!i && !c && !u) { loopDepth++; stmt(s.statement); loopDepth--; return; }
    if (!countedFor(s)) { // stage 5 rank 15: any other header is init; while (cond) { body; step }, continue running the step; the translator derives a bound from the condition and the step, else reads the loop as an opaque block
      if (i) {
        if (ts.isVariableDeclarationList(i)) { if (!(i.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const))) v(s, 'var', '`var` is outside the subset; use let or const'); for (const d of i.declarations) varDecl(d); }
        else for (const e of commaParts(i)) exprStmt(e);
      }
      if (c) expr(c);
      if (u) for (const e of commaParts(u)) exprStmt(e);
      loopDepth++; stmt(s.statement); loopDepth--; return;
    }
    expr(i.declarations[0].initializer); expr(c.right);
    loopDepth++; stmt(s.statement); loopDepth--;
  }
  const commaParts = (e) => { while (ts.isParenthesizedExpression(e)) e = e.expression; return ts.isBinaryExpression(e) && e.operatorToken.kind === K.CommaToken ? [...commaParts(e.left), ...commaParts(e.right)] : [e]; };

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
        if (ts.isElementAccessExpression(t)) { const r = t.expression; if (r.kind === K.ThisKeyword && thisParam) return v(e, 'receiver-write', RECEIVER_WRITE); if (r.kind === K.ThisKeyword || (ts.isPropertyAccessExpression(r) && r.expression.kind === K.ThisKeyword && currentClass)) { expr(t.argumentExpression); return; } let root = r; while (ts.isPropertyAccessExpression(root)) root = root.expression; const o = ts.isIdentifier(root) ? declOf(root) : { kind: null }; if (o.kind !== 'local') return v(e, 'delete', `delete on \`${root.getText(sf)}\`, which this function does not own`); if (aliasHere(o.decl, e)) return v(e, 'alias-mutation', aliasMsg(root.text, o.decl, false)); if (!nonNull(tOf(t.argumentExpression)).every(isStr)) return v(e, 'dynamic-key', 'a dictionary key is a string'); expr(t.argumentExpression); return; }
        if (ts.isPropertyAccessExpression(t)) { let root = t; while (ts.isPropertyAccessExpression(root)) root = root.expression; if (root.kind === K.ThisKeyword) return v(e, 'delete', 'delete of a field of this is outside the subset; assign undefined'); const o = ts.isIdentifier(root) ? declOf(root) : { kind: null }; if (o.kind !== 'local') return v(e, 'delete', `delete on \`${root.getText(sf)}\`, which this function does not own`); if (aliasHere(o.decl, e)) return v(e, 'alias-mutation', aliasMsg(root.text, o.decl, false)); return; }
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
        if ((n === 'Set' || n === 'Map') && e.arguments?.length && (e.arguments.length > 1 || ts.isSpreadElement(e.arguments[0]) || !orderedSource(e.arguments[0]))) return v(e, 'unsupported-call', `new ${n}(...) reads an array, a Map, a Set or one of their iterators; build the entries as an array first`);
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
      case K.MetaProperty: { // stage 5 rank 16: `import.meta` is a fact of the world (a world read); `import.meta.env` is build-injected and `new.target` reads how the function was called
        if (e.keywordToken !== K.ImportKeyword) return v(e, 'unsupported-syntax', '`new.target` reads how the function was called; it is outside the subset');
        let top = e; while (top.parent && ((ts.isParenthesizedExpression(top.parent) || ts.isAsExpression(top.parent) || ts.isNonNullExpression(top.parent) || ts.isTypeAssertionExpression(top.parent)) && top.parent.expression === top)) top = top.parent; // the access may go through a cast: `(import.meta as { url: string }).url`
        if (top.parent && ts.isPropertyAccessExpression(top.parent) && top.parent.expression === top && top.parent.name.text === 'env') return v(top.parent, 'unsupported-syntax', '`import.meta.env` is injected at build time; read it outside the subset');
        return;
      }
      case K.ElementAccessExpression: return elemAccess(e);
      case K.ArrayLiteralExpression:
        for (const el of e.elements) {
          if (ts.isSpreadElement(el)) { if (!isArrayExpr(el.expression) && !generators.pureCall(el.expression) && !collectionIterator(el.expression) && !nonNull(tOf(el.expression)).every((t) => isSetT(t) || isMapT(t))) v(el, 'spread', 'spread works on arrays, sets, maps and their keys(), values() and entries()'); expr(el.expression); }
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
            if (literalProtoMember(p)) return v(p, 'prototype', '`__proto__:` in a literal sets the object\'s prototype, not a key; the value reading has only plain objects (prototype Object.prototype); write the key computed as `[\'__proto__\']` for an own key, or leave it out');
            if (ts.isComputedPropertyName(p.name)) { // a dictionary takes any string key; a record with declared keys takes a literal or a union of literals, read as a case split (translate.mjs objectLit keyMembers)
              const lt = literalRecordType(e); const dict = nonNull(lt).every((t) => !!(t.flags & TF.Object) && !!checker.getIndexInfoOfType(t, ts.IndexKind.String) && !checker.getPropertiesOfType(t).length);
              const why = dict ? (nonNull(tOf(p.name.expression)).every(isStr) ? null : 'a dictionary key is a string') : literalKeyWhy(p, lt, e);
              if (why) v(p, 'dynamic-key', why); else expr(p.name.expression);
            }
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
    { const po = plainObjectTest(checker, e, sf); if (po) { if (po.refuse) return v(e, 'prototype', po.refuse); return expr(po.subject); } } // the plain-object test on a record value
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
    if (op === K.InKeyword) { // required properties and dictionaries are exact (an own key or a name of Object.prototype); open-record absence stays uninterpreted
      const pr = inPrototypeReach(checker, sf, e); // the made object reaches this unit (common.mjs prototypeReach); other units keep the reading
      if (pr) return v(e, 'prototype', `this file makes an object whose prototype is not Object.prototype (line ${lineOf(sf, pr.maker.getStart(sf))}), and ${pr.why}; \`in\` reads the prototype; test an own key with \`Object.prototype.hasOwnProperty.call(o, k)\``);
      expr(e.left); expr(e.right); return;
    }
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
      // against a literal (a negated number included) === is true only on the literal's primitive arm holding its value
      const eqLit = (x) => { x = unparenX(x); return litSide(x) || (ts.isPrefixUnaryExpression(x) && x.operator === K.MinusToken && ts.isNumericLiteral(x.operand)); };
      if (!nul(e.left) && !nul(e.right) && (mixed(lt) || mixed(rt)) && !eqLit(e.left) && !eqLit(e.right)) v(e, 'mixed-types', 'a value that is sometimes a primitive and sometimes a record or array compares with === only against a literal; narrow it before comparing it with another value');
      else if (!nul(e.left) && !nul(e.right) && !litSide(e.left) && !litSide(e.right) && !prim(lt) && !prim(rt)) v(e, 'reference-equality', '=== on arrays and records compares references; compare fields');
    }
  }

  // `h.call(o, a)` / `h.apply(o, [a])` on a same-file function: its declaration and the argument nodes in parameter order
  // (the receiver first when it declares `this`, else dropped), so a receiver or argument it changes is followed
  function receiverCall(n) {
    const f = n.expression;
    if (!ts.isPropertyAccessExpression(f) || !ts.isIdentifier(f.expression) || (f.name.text !== 'call' && f.name.text !== 'apply')) return null;
    const vd = checker.getSymbolAtLocation(f.expression)?.valueDeclaration;
    const decl = vd && ts.isFunctionDeclaration(vd) ? vd : vd && ts.isVariableDeclaration(vd) && vd.initializer && (ts.isFunctionExpression(vd.initializer) || ts.isArrowFunction(vd.initializer)) ? vd.initializer : null;
    if (!decl || decl.getSourceFile() !== sf) return null;
    let arr = n.arguments[1]; while (arr && ts.isParenthesizedExpression(arr)) arr = arr.expression;
    const args = f.name.text === 'call' ? [...n.arguments] : [n.arguments[0], ...(arr && ts.isArrayLiteralExpression(arr) ? arr.elements : [])];
    const p0 = decl.parameters[0];
    return { decl, args: p0 && ts.isIdentifier(p0.name) && p0.name.text === 'this' ? args : args.slice(1) };
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
      const hit = (n) => { let root = n; while (ts.isPropertyAccessExpression(root) || ts.isElementAccessExpression(root) || ts.isNonNullExpression(root) || ts.isParenthesizedExpression(root)) root = root.expression; if (ts.isIdentifier(root) && params.includes(root.text)) changed.add(params.indexOf(root.text)); if (root.kind === K.ThisKeyword && params[0] === 'this') changed.add(0); }; // a write through a declared `this` changes the receiver operand
      const walk = (n) => {
        if (ts.isFunctionLike(n)) return;
        if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment && !ts.isIdentifier(n.left)) hit(n.left);
        if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && [K.PlusPlusToken, K.MinusMinusToken].includes(n.operator) && !ts.isIdentifier(n.operand)) hit(n.operand);
        if (ts.isDeleteExpression(n)) hit(n.expression);
        if (ts.isCallExpression(n)) {
          if (ts.isPropertyAccessExpression(n.expression) && MUT_NAMES.has(n.expression.name.text)) hit(n.expression.expression);
          const via = receiverCall(n);
          for (const i of mutations(via ? via.decl : checker.getResolvedSignature(n)?.declaration, seen)) { const a = via ? via.args[i] : n.arguments[i]; if (a) hit(a); }
        }
        ts.forEachChild(n, walk);
      };
      walk(decl.body); return changed;
    };
    const via = receiverCall(e);
    if (mutations(via ? via.decl : checker.getResolvedSignature(e)?.declaration).size) v(e, 'conditional-effect', 'move a call that changes its arguments into an explicit if branch so the updated values leave the branch');
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
    { const md = metadataCall(checker, e, sf); if (md) { if (!(ts.isIdentifier(f.expression) && f.expression.text === 'Reflect')) expr(f.expression); return e.arguments.forEach((a) => expr(a)); } } // a metadata API of the decorator table (translate/decorators.json): the one admitted use of Reflect, a cell of the world
    { const ok = ownKeyTest(checker, e, sf); if (ok) { if (ok.refuse) return v(e, 'prototype', ok.refuse); expr(ok.obj); return expr(ok.key); } } // the own-key test on a dictionary or a record of required fields
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
      { // `C.m(args)`: a static method of a same-file class is the unit `C.m`, called as a top-level unit is
        const st = sameFileStatic(f);
        if (st?.kind === 'method') {
          const u = units.get(`${st.cls.name.text}.${name}`);
          if (!e.arguments.some(ts.isSpreadElement) && !u.params.some((p) => p.dotDotDotToken)) { const req = u.params.filter((p) => !p.initializer && !p.questionToken && !p.dotDotDotToken).length; if (e.arguments.length < req || e.arguments.length > u.params.length) v(e, 'unsupported-call', `${st.cls.name.text}.${name} takes ${req === u.params.length ? req : `${req} to ${u.params.length}`} arguments`); }
          if (u.fn.asteriskToken) return v(e, 'generator-use', 'consume a static generator through a top-level generator function');
          if (u.isAsync && !(e.parent && ts.isAwaitExpression(e.parent)) && !promiseConsumed(e, checker, sf)) v(e, 'async', 'an async unit is called without await');
          return argsOf(e);
        }
      }
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
          if (cb && ts.isIdentifier(cb) && (!['unit', 'local'].includes(declOf(cb).kind) || callbackNeedsLoop(cb))) return namedCallback(e, cb, name, recv, asyncCb); // a body read elsewhere is a transition
          if (cb && ts.isArrowFunction(cb)) {
            if (cb.type && ts.isTypePredicateNode(cb.type) && callbackNeedsLoop(cb)) return v(cb, 'callback-result', 'an effectful type-predicate callback needs an explicit for-of loop with a type guard');
            if (sig.getReturnType().symbol?.name === 'PromiseLike') return v(cb, 'callback-result', 'a thenable callback needs an async arrow with an explicit await');
            if (name === 'flatMap' && !asyncCb && callbackNeedsLoop(cb)) { const parts = nonNull(sig.getReturnType()); if (parts.some((t) => isArrayLike(checker, t)) && !parts.every((t) => isArrayLike(checker, t))) return v(cb, 'callback-result', 'an effectful flatMap callback returns either arrays on every path or scalar values on every path; use a for-of loop for mixed results'); }
            if (callbackNeedsLoop(cb)) { loopCallbacks.add(cb); // stage 5 rank 19: its body is a loop body (outer cells are its state); stage 5 rank 13: the element may be a destructured pattern (no rest) or carry a default the element type never takes; the index and the accumulator stay plain names
              const elemAt = name === 'reduce' ? 1 : 0; const nParams = cb.parameters.length;
              if (nParams < elemAt + 1 || nParams > 2) return v(cb, 'callback-form', 'an effectful array callback takes the element (and an index), or the accumulator and the element; an extra parameter is outside the subset');
              const bad = cb.parameters.map((p, i) => effectfulParamWhy(p, i === elemAt, name)).find(Boolean);
              if (bad) return v(cb, 'callback-form', bad);
            }
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
      if (parts.every(isSetT) && SET_METHODS.has(name)) { if (name === 'forEach' || name === 'clear') return v(e, 'unsupported-call', name === 'forEach' ? 'Set.forEach is outside the subset; write for (const x of s)' : 'Set.clear is a statement on a local'); if (['keys', 'values', 'entries'].includes(name) && !iteratorConsumed(e)) return v(e, 'collection-iterator', `s.${name}() is an iterator its first read uses up; spread it, loop over it with for-of or pass it to Array.from where it is made`); expr(recv); return e.arguments.forEach(expr); }
      if (parts.every(isMapT) && MAP_METHODS.has(name)) { if (name === 'forEach' || name === 'clear') return v(e, 'unsupported-call', name === 'forEach' ? 'Map.forEach is outside the subset; write for (const [k, v] of m)' : 'Map.clear is a statement on a local'); if (['keys', 'values', 'entries'].includes(name) && !iteratorConsumed(e)) return v(e, 'collection-iterator', `m.${name}() is an iterator its first read uses up; spread it, loop over it with for-of or pass it to Array.from where it is made`); expr(recv); return e.arguments.forEach(expr); }
      if (libraryRowCall(e, recv, name, rt)) return; // the stage 5 library rows (design/library-rows.md)
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
  // the stage 5 library rows (translate/library.json, `lane: ordinary`; design/library-rows.md): true when the call is one
  // of them, admitted or refused by name
  function libraryRowCall(e, recv, name, rt) {
    const parts = nonNull(rt); if (!parts.length) return false;
    const arr = parts.every((t) => isArrayLike(checker, t)), str = parts.every(isStr);
    const isGlobal = (id) => declOf(id).kind === 'global';
    const noSpread = () => !e.arguments.some(ts.isSpreadElement);
    const refuse = (rule, msg) => { v(e, rule, msg); return true; };
    const admit = () => { expr(recv); e.arguments.forEach((a) => expr(a)); return true; };
    if (arr && ARRAY_VALUE_MUTATORS.has(name)) {
      if (!noSpread() || (name !== 'splice' && e.arguments.length)) return refuse('unsupported-call', name === 'splice' ? 'splice as a value takes plain arguments' : `${name} takes no argument`);
      if (e.flags & ts.NodeFlags.OptionalChain) return refuse('unsupported-call', `.${name}() in an optional chain changes a receiver that may be absent; check it first`);
      if (freshArray(checker, recv, isGlobal)) return admit(); // nobody else holds the receiver: only the value is read
      const r = unparenX(recv);
      const o = ts.isIdentifier(r) ? declOf(r) : null;
      if (!o || o.kind !== 'local') return refuse('unsupported-call', `.${name}() as a value changes \`${recv.getText(sf).slice(0, 40)}\`; call it on a local array or on a fresh one`);
      if (isParam(o.decl)) return refuse('param-mutation', `.${name}() as a value changes the parameter \`${r.text}\`; copy it to a local first`);
      if (aliasHere(o.decl, e)) return refuse('alias-mutation', `\`${r.text}\` is another name for a value this function was handed; copy it first`);
      if (!ownedHere(o.decl) || callbackStack.length || forEachDepth) return refuse('closure-mutation', `.${name}() as a value inside a callback changes \`${r.text}\`; use a for-of loop`);
      const site = unconditionalSite(e);
      if (!site) return refuse('mutator-value', `.${name}() as a value runs only on some paths here (a condition, a short circuit, a loop header); bind it to a const in its own statement first`);
      if (readsOf(checker, site.scope, checker.getSymbolAtLocation(r)) !== 1) return refuse('mutator-value', `\`${r.text}\` is read again in the statement that calls .${name}() on it; read it in its own statement`);
      return admit();
    }
    if (arr && name === 'fill') {
      if (!noSpread() || !e.arguments.length || e.arguments.length > 3) return refuse('unsupported-call', 'fill takes a value and an optional start and end');
      if (!freshArray(checker, recv, isGlobal)) return refuse('in-place-mutation', 'fill changes its receiver in place and returns it; fill a fresh array (`new Array(n).fill(v)`, `[...xs].fill(v)`)');
      return admit();
    }
    if (arr && (name === 'toSorted' || name === 'toReversed')) {
      if (name === 'toReversed' && e.arguments.length) return refuse('unsupported-call', 'toReversed takes no argument');
      if (e.arguments.length > 1) return refuse('unsupported-call', 'toSorted takes one comparator');
      expr(recv); if (e.arguments[0]) { const cb = e.arguments[0]; if (callbackNeedsLoop(cb)) return refuse('callback-form', 'the comparator of toSorted is a pure function of two elements'); callback(cb, 2); }
      return true;
    }
    if (arr && (name === 'findLast' || name === 'findLastIndex')) {
      const cb = e.arguments[0];
      if (e.arguments.length !== 1 || !(ts.isArrowFunction(cb) || ts.isIdentifier(cb))) return refuse('unsupported-call', `${name} takes one callback`);
      if (ts.isArrowFunction(cb) && (cb.parameters.length !== 1 || cb.modifiers?.some((m) => m.kind === K.AsyncKeyword))) return refuse('callback-form', `the callback of ${name} takes the element only (an index counts from the end); use a for loop over the indices`);
      if (callbackNeedsLoop(cb)) return refuse('callback-form', `the callback of ${name} is a pure predicate; an effect needs a for loop`);
      expr(recv); callback(cb, 1); return true;
    }
    if (arr && name === 'lastIndexOf') {
      if (e.arguments.length !== 1 || !noSpread()) return refuse('unsupported-call', 'lastIndexOf takes one value (a start index stays out)');
      const el = checker.getIndexTypeOfType?.(parts[0], ts.IndexKind.Number);
      if (!el || !nonNull(el).every(isPrim)) return refuse('unsupported-call', 'lastIndexOf compares by identity; on objects it is outside the subset');
      return admit();
    }
    if (arr && name === 'toString') return e.arguments.length ? refuse('unsupported-call', 'toString on an array takes no argument') : admit();
    if (name === 'toString' && primitiveText(rt) && !parts.every((t) => !!(t.flags & TF.NumberLike))) return e.arguments.length ? refuse('unsupported-call', 'toString with a radix is read on numbers only') : admit();
    if (LOCALE_READS.has(name) && (str || parts.every((t) => !!(t.flags & (TF.NumberLike | TF.BigIntLike))))) {
      if (str && name === 'toLocaleString') return false;
      if (!str && name !== 'toLocaleString') return false;
      if (callbackStack.length) return refuse('unsupported-call', `.${name}() reads the host's locale (a world read); call it outside the callback`);
      if (!noSpread()) return refuse('unsupported-call', `.${name}() takes plain arguments`);
      return admit();
    }
    if (str && name === 'substr') return noSpread() && e.arguments.length <= 2 && e.arguments.every((a) => !!(tOf(a).flags & TF.NumberLike)) ? admit() : refuse('unsupported-call', 'substr takes a numeric start and an optional numeric length');
    if (str && name === 'matchAll') { // the matches start at the pattern's lastIndex: a literal (a new object) or a string pattern starts at 0
      const a = e.arguments[0] && unparenX(e.arguments[0]);
      if (e.arguments.length !== 1 || !noSpread()) return refuse('unsupported-call', 'matchAll takes one pattern');
      if (ts.isRegularExpressionLiteral(a)) return a.text.slice(a.text.lastIndexOf('/') + 1).includes('g') ? admit() : refuse('unsupported-call', 'matchAll needs the g flag; without it the call throws a TypeError');
      if (isStr(tOf(a))) return admit();
      return refuse('unsupported-call', "matchAll starts at its pattern's lastIndex, which another call may have moved; pass a regular expression literal with the g flag, or a string");
    }
    if (str && name === 'search') return e.arguments.length === 1 && noSpread() ? admit() : refuse('unsupported-call', 'search takes one pattern');
    return false;
  }
  // `.map(cb)` directly under an awaited `Promise.all(...)`: the callback is a loop body (its returns are collected values)
  const underPromiseAll = (call) => { let arg = call; while (arg.parent && ts.isParenthesizedExpression(arg.parent)) arg = arg.parent; const p = arg.parent; if (!(p && ts.isCallExpression(p) && p.arguments.length === 1 && p.arguments[0] === arg && ts.isPropertyAccessExpression(p.expression) && p.expression.name.text === 'all' && ts.isIdentifier(p.expression.expression) && p.expression.expression.text === 'Promise')) return false; let q = p.parent; while (q && ts.isParenthesizedExpression(q)) q = q.parent; return !!(q && ts.isAwaitExpression(q)); };
  // a named function passed to an array method is the arrow JavaScript calls with (element, index, array), or with the
  // accumulator first for reduce: the translator reads it as that eta-expansion, an effectful callback loop when the
  // call makes a transition. Boolean, String, Number, parseInt and parseFloat read as their direct calls do.
  const NAMED_GLOBALS = new Set(['Boolean', 'String', 'Number', 'parseInt', 'parseFloat']);
  function namedCallback(e, cb, name, recv, asyncCb) {
    const o = declOf(cb);
    if (o.kind === 'global') {
      if (!NAMED_GLOBALS.has(cb.text)) return v(cb, 'callback-form', `${cb.text} is read as a callback only through an arrow; write \`(x) => ${cb.text}(x)\` with the arguments it reads`);
      if (!(name === 'map' || (cb.text === 'Boolean' && ['filter', 'find', 'findIndex', 'some', 'every'].includes(name)))) return v(cb, 'callback-form', `${cb.text} as a callback is read for map${cb.text === 'Boolean' ? ' and the predicate methods' : ''}; write an inline arrow for ${name}`);
      return expr(recv);
    }
    checkIdent(cb, true);
    if (asyncCb) return v(cb, 'async-callback', `Promise.all over the named async function \`${cb.text}\` needs an inline async arrow so its awaits are read in order`);
    const full = name === 'reduce' ? 4 : 3;
    const plain = (ps) => ps.length <= full && ps.every((p) => ts.isIdentifier(p.name) && p.name.text !== 'this' && !p.initializer && !p.dotDotDotToken && !p.questionToken);
    let fn = null;
    if (o.kind === 'unit') {
      const u = units.get(cb.text);
      if (!u) return v(cb, 'callback-form', 'a class method passed as a callback loses its receiver; write an inline arrow');
      if (u.isAsync) return v(cb, 'async', 'an async function cannot be a callback');
      if (u.fn.asteriskToken) return v(cb, 'callback-form', 'a generator passed as a callback returns its iterator; write an inline arrow');
      if (u.generics?.length || u.fn.typeParameters?.length) return v(cb, 'callback-form', `\`${cb.text}\` is generic; pass it through an inline arrow so its type arguments are fixed`);
      if (!plain(u.params)) return v(cb, 'callback-form', `a named effectful callback takes plain parameters, at most ${full} (what ${name} passes); write an inline arrow`);
      if (mutatesParam(u)) return v(cb, 'callback-form', `\`${cb.text}\` changes its argument, which here is the array's element; write an inline arrow that copies it`);
      fn = u.fn;
    } else if (o.kind === 'local' && o.decl && ts.isVariableDeclaration(o.decl) && o.decl.initializer && ts.isArrowFunction(o.decl.initializer)) {
      fn = o.decl.initializer;
      if (!plain(fn.parameters)) return v(cb, 'callback-form', `a named effectful callback takes plain parameters, at most ${full} (what ${name} passes); write an inline arrow`);
    } else if (o.kind === 'local' && !(o.decl && ts.isParameter(o.decl))) return v(cb, 'callback-form', 'an effectful array callback needs an inline arrow so its world transitions are read in array order'); // a local function value built here: its effects are not read by name
    const sig = checker.getSignaturesOfType(tOf(cb), ts.SignatureKind.Call);
    if (fn?.type && ts.isTypePredicateNode(fn.type)) return v(cb, 'callback-result', 'an effectful type-predicate callback needs an explicit for-of loop with a type guard');
    if (name === 'flatMap' && sig.length) { const parts = nonNull(sig[0].getReturnType()); if (parts.some((t) => isArrayLike(checker, t)) && !parts.every((t) => isArrayLike(checker, t))) return v(cb, 'callback-result', 'an effectful flatMap callback returns either arrays on every path or scalar values on every path; use a for-of loop for mixed results'); }
    expr(recv);
    if (name === 'reduce') { if (e.arguments.length !== 2) return v(e, 'unsupported-call', 'reduce needs a callback and an initial value'); expr(e.arguments[1]); }
  }
  // a same-file unit that writes through one of its parameters (the translator returns the new value beside the result)
  function mutatesParam(u, seen = new Set()) {
    if (seen.has(u)) return false; seen.add(u);
    const params = new Set(u.params.filter((p) => ts.isIdentifier(p.name)).map((p) => p.name.text));
    const rootOf = (x) => { while (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x) || ts.isNonNullExpression(x) || ts.isParenthesizedExpression(x)) x = x.expression; return x; };
    const through = (x) => { const r = rootOf(x); return r !== x && ts.isIdentifier(r) && params.has(r.text); };
    let found = false;
    const w = (n) => {
      if (found || ts.isArrowFunction(n) || ts.isFunctionExpression(n)) return;
      if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment && through(n.left)) found = true;
      if ((ts.isPostfixUnaryExpression(n) || ts.isPrefixUnaryExpression(n)) && (n.operator === K.PlusPlusToken || n.operator === K.MinusMinusToken) && through(n.operand)) found = true;
      if (ts.isDeleteExpression(n) && through(n.expression)) found = true;
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) { const r = rootOf(n.expression.expression); if (ts.isIdentifier(r) && params.has(r.text) && MUT_NAMES.has(n.expression.name.text)) found = true; if (ts.isIdentifier(n.expression.expression) && n.expression.expression.text === 'Object' && n.expression.name.text === 'assign' && n.arguments[0]) { const t = rootOf(n.arguments[0]); if (ts.isIdentifier(t) && params.has(t.text)) found = true; } }
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && units.has(n.expression.text) && n.arguments.some((a) => ts.isIdentifier(a) && params.has(a.text)) && mutatesParam(units.get(n.expression.text), seen)) found = true;
      ts.forEachChild(n, w);
    };
    if (u.body) w(u.body);
    return found;
  }
  // named effectful callbacks must enter the loop reading through an inline arrow
  // stage 5 rank 19: a callback that assigns, updates or mutates (push, set, delete, ...) a local, an array or a record declared
  // outside it (in the enclosing function) is a loop body threading that cell: the lint reads it as the effectful form
  const writesOuterCell = (cb) => {
    if (!cb || !ts.isArrowFunction(cb) || !currentFn) return false;
    let found = false;
    const rootOf = (x) => { while (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x) || ts.isParenthesizedExpression(x)) x = x.expression; return x; };
    const outer = (id) => { const o = declOf(id); const d = o.decl; return o.kind === 'local' && d && !(d.pos >= cb.pos && d.end <= cb.end) && d.pos >= currentFn.pos && d.end <= currentFn.end && !isParam(d); };
    const w = (x) => {
      if (found) return;
      if (ts.isBinaryExpression(x) && x.operatorToken.kind >= K.FirstAssignment && x.operatorToken.kind <= K.LastAssignment) { const r = rootOf(x.left); if (ts.isIdentifier(r) && outer(r)) { found = true; return; } }
      if ((ts.isPostfixUnaryExpression(x) || ts.isPrefixUnaryExpression(x)) && (x.operator === K.PlusPlusToken || x.operator === K.MinusMinusToken)) { const r = rootOf(x.operand); if (ts.isIdentifier(r) && outer(r)) { found = true; return; } }
      if (ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && MUT_NAMES.has(x.expression.name.text)) { const r = rootOf(x.expression.expression); if (ts.isIdentifier(r) && outer(r)) { found = true; return; } }
      ts.forEachChild(x, w);
    };
    w(cb.body); return found;
  };
  function callbackNeedsLoop(cb, seen = new Set()) {
    if (seen.has(cb)) return false;
    seen.add(cb);
    if (ts.isArrowFunction(cb) && writesOuterCell(cb)) return true; // stage 5 rank 19
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
      if (ts.isTryStatement(n) || (ts.isThrowStatement(n) && !syncLoopCallback(cb, checker)) || (ts.isReturnStatement(n) && depth > 0)) v(n, 'callback-control', 'try, throw or a return from an inner loop in a callback needs an explicit for-of loop'); // stage 5 rank 20: a throw in a synchronous array callback is the unit's throw (an opaque block)
      const next = depth + (ts.isIterationStatement(n, false) ? 1 : 0);
      ts.forEachChild(n, (c) => w(c, next));
    };
    w(cb.body);
  }
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
    if (arity !== null && (a.parameters.length > arity || a.parameters.some((p) => (p.initializer && typeAdmitsUndefined(tOf(p.name))) || p.dotDotDotToken || p.questionToken))) v(a, 'callback-form', `the callback takes at most ${arity} plain parameter(s); a default is read only where the parameter's type never holds undefined`); // stage 5 rank 13: a default the type never takes is not read
    for (const p of a.parameters) { const names = []; bindingNames(p.name, names); checkType(tOf(p.name), p); }
    if (arity === null) handedCallbacks.add(a); // stage 5 rank 20: an opaque value keyed by its text; a throw inside it happens inside the outside's transition
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
  const spreadArray = (a) => { if (ts.isArrayLiteralExpression(a.expression)) return a.expression.elements.forEach((el) => ts.isSpreadElement(el) ? spreadArray(el) : expr(el)); const st = tOf(a.expression); if (!checker.isArrayType(st) && !(checker.isTupleType(st) && !st.target?.hasRestElement && st.target?.minLength === st.target?.fixedLength && checker.getTypeArguments(st).length > 0)) v(a, 'spread', 'spread arguments need an ordinary array or a fixed tuple; open tuples and custom iterables are outside the subset'); expr(a.expression); }; // stage 5 rank 18: a fixed tuple spreads as its elements in order
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
  // Math.min/max over a spread is read on a nonempty list (MinSeq/MaxSeq require it): the spread's length is the length of
  // a name (the name itself, `xs.map(f)`, `xs.slice()`, `[...xs]`), and a test that dominates the call says that length is
  // not zero: a conditional, an if, `&&` / `||`, or an earlier `if (...) return` (or throw, break, continue) in the same
  // statement list, in any equivalent form (`xs.length`, `> 0`, `>= 1`, `!== 0`, `0 < xs.length`, `!xs.length` and
  // `=== 0` on the other branch); the name is not written between the test and the call
  function nonemptyMathArgs(e) {
    const filled = (a) => !ts.isSpreadElement(a) || (ts.isArrayLiteralExpression(a.expression) && a.expression.elements.some(filled));
    if (e.arguments.some(filled)) return true;
    if (e.arguments.length !== 1 || !ts.isSpreadElement(e.arguments[0])) return false;
    const lengthName = (x) => { // the name whose length the value's length is
      x = unparenX(x);
      if (ts.isIdentifier(x)) return isArrayExpr(x) ? checker.getSymbolAtLocation(x) : null;
      if (ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && !x.expression.questionDotToken && isArrayExpr(x.expression.expression) && ((x.expression.name.text === 'map' && x.arguments.length === 1) || (x.expression.name.text === 'slice' && !x.arguments.length))) return lengthName(x.expression.expression);
      if (ts.isArrayLiteralExpression(x) && x.elements.length === 1 && ts.isSpreadElement(x.elements[0])) return lengthName(x.elements[0].expression);
      return null;
    };
    const sym = lengthName(e.arguments[0].expression);
    if (!sym) return false;
    const isLen = (x) => { x = unparenX(x); return ts.isPropertyAccessExpression(x) && x.name.text === 'length' && !x.questionDotToken && ts.isIdentifier(unparenX(x.expression)) && checker.getSymbolAtLocation(unparenX(x.expression)) === sym; };
    // the test c, known to be `truth`, says the length is above zero
    const implies = (c, truth) => {
      c = unparenX(c);
      if (ts.isPrefixUnaryExpression(c) && c.operator === K.ExclamationToken) return implies(c.operand, !truth);
      if (ts.isBinaryExpression(c) && c.operatorToken.kind === K.AmpersandAmpersandToken) return truth && (implies(c.left, true) || implies(c.right, true));
      if (ts.isBinaryExpression(c) && c.operatorToken.kind === K.BarBarToken) return !truth && (implies(c.left, false) || implies(c.right, false));
      if (isLen(c)) return truth;
      if (!ts.isBinaryExpression(c)) return false;
      let op = c.operatorToken.kind, lit = unparenX(c.right);
      if (!isLen(c.left)) { if (!isLen(c.right)) return false; lit = unparenX(c.left); op = { [K.LessThanToken]: K.GreaterThanToken, [K.LessThanEqualsToken]: K.GreaterThanEqualsToken, [K.GreaterThanToken]: K.LessThanToken, [K.GreaterThanEqualsToken]: K.LessThanEqualsToken }[op] ?? op; }
      if (!ts.isNumericLiteral(lit)) return false;
      const n = Number(lit.text);
      if (truth) return (op === K.GreaterThanToken && n >= 0) || (op === K.GreaterThanEqualsToken && n >= 1) || ((op === K.ExclamationEqualsEqualsToken || op === K.ExclamationEqualsToken) && n === 0);
      return (op === K.LessThanEqualsToken && n >= 0) || (op === K.LessThanToken && n >= 1) || ((op === K.EqualsEqualsEqualsToken || op === K.EqualsEqualsToken) && n === 0);
    };
    const writes = (node, from, to) => { // a write of the name inside node between two positions
      let hit = false;
      const w = (x) => {
        if (hit || x.end <= from || x.pos >= to) return;
        if (ts.isIdentifier(x) && checker.getSymbolAtLocation(x) === sym) {
          let top = x; while (top.parent && (ts.isParenthesizedExpression(top.parent) || ts.isNonNullExpression(top.parent))) top = top.parent;
          const p = top.parent;
          if (p && ts.isBinaryExpression(p) && p.left === top && p.operatorToken.kind >= K.FirstAssignment && p.operatorToken.kind <= K.LastAssignment) hit = true;
          if (p && ts.isPropertyAccessExpression(p) && p.expression === top && (MUT_NAMES.has(p.name.text) || (p.name.text === 'length' && p.parent && ts.isBinaryExpression(p.parent) && p.parent.left === p))) hit = true;
        }
        ts.forEachChild(x, w);
      };
      w(node);
      return hit;
    };
    const exits = (st) => { st = ts.isBlock(st) && st.statements.length === 1 ? st.statements[0] : st; return ts.isReturnStatement(st) || ts.isThrowStatement(st) || ts.isBreakStatement(st) || ts.isContinueStatement(st); };
    for (let child = e, p = e.parent; p && !ts.isFunctionLike(p); child = p, p = p.parent) {
      if (ts.isConditionalExpression(p) && child !== p.condition && implies(p.condition, p.whenTrue === child) && !writes(p, p.condition.end, e.pos)) return true;
      if (ts.isIfStatement(p) && child !== p.expression && implies(p.expression, p.thenStatement === child) && !writes(p, p.expression.end, e.pos)) return true;
      if (ts.isBinaryExpression(p) && child === p.right && ((p.operatorToken.kind === K.AmpersandAmpersandToken && implies(p.left, true)) || (p.operatorToken.kind === K.BarBarToken && implies(p.left, false))) && !writes(p, p.left.end, e.pos)) return true;
      if ((ts.isBlock(p) || ts.isSourceFile(p) || ts.isCaseClause(p) || ts.isDefaultClause(p)) && p.statements) {
        const k = p.statements.indexOf(child);
        for (let i = k - 1; i >= 0; i--) { const g = p.statements[i]; if (ts.isIfStatement(g) && !g.elseStatement && exits(g.thenStatement) && implies(g.expression, false) && !writes(p, g.end, e.pos)) return true; }
      }
    }
    return false;
  }
  const argsOf = (e) => (e.arguments ?? []).forEach((a) => ts.isSpreadElement(a) ? (outsideSpread(e) ? spreadArray(a) : v(a, 'spread', 'spread arguments need an outside callee or a supported sequence operation')) : ts.isArrowFunction(a) ? callback(a, null) : expr(a));
  function propAccess(e) {
    const name = e.name.text;
    const obj = localMethodLiteral(tOf(e.expression));
    const method = obj?.properties.find((p) => ts.isMethodDeclaration(p) && p.name?.text === name);
    if (method && !(e.parent && ts.isCallExpression(e.parent) && e.parent.expression === e)) return v(e, 'object-method-mutation', 'call a literal method on its object; detached methods need an explicit receiver');
    if (e.expression.kind === K.ThisKeyword && name === 'constructor') { // the receiver's run-time class: its name, or a value passed on, is opaque; a member read through it is a static of an unknown class
      let u = e; while (u.parent && (ts.isParenthesizedExpression(u.parent) || ts.isAsExpression(u.parent) || ts.isNonNullExpression(u.parent) || ts.isTypeAssertionExpression(u.parent) || ts.isSatisfiesExpression(u.parent))) u = u.parent;
      const p = u.parent;
      if (p && (ts.isPropertyAccessExpression(p) || ts.isElementAccessExpression(p)) && p.expression === u && !(ts.isPropertyAccessExpression(p) && p.name.text === 'name')) return v(p, 'prototype', '`this.constructor` is the run-time class of the receiver, a subclass too; name the class to read its statics');
    }
    if (e.expression.kind === K.ThisKeyword) return; // a field or method of the receiver: read through an accessor
    if (name === 'prototype' || name === '__proto__' || name === 'constructor') return v(e, 'prototype', `\`.${name}\` reaches the prototype chain`);
    { const st = sameFileStatic(e); if (st) { if (st.kind === 'field') return staticFieldRead(e); if (!(e.parent && ts.isCallExpression(e.parent) && e.parent.expression === e)) return v(e, 'global-read', `\`${e.getText(sf)}\` is a static method used as a value; call it, or pass an arrow that calls it`); return; } } // a static of a same-file class
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
      if (t.flags & TF.Never) continue; // stage 5 rank 17: a read on never is unreachable; any reading is sound
      if (t.flags & TF.IndexedAccess) continue; // an indexed this type (`this["options"]`): an opaque value, read through an uninterpreted accessor (the translator types it Any)
      if (t.flags & TF.TypeParameter) { // a member of a type parameter goes through its declared constraint: one record declaring the member
        const c = checker.getBaseConstraintOfType(t); const cs = c ? nonNull(c) : [];
        if (cs.length === 1 && isRecordish(cs[0]) && (checker.getPropertyOfType(cs[0], name) || hasStringIndex(cs[0]))) continue;
        return v(e, 'unsupported-member', `property .${name} on ${checker.typeToString(t)}: constrain the type parameter to one record declaring it`);
      }
      if (!isRecordish(t)) return v(e, 'unsupported-member', `property .${name} on ${checker.typeToString(t)} is outside the subset`);
      if (!checker.getPropertyOfType(t, name) && !hasStringIndex(t) && checker.getPropertiesOfType(t).length) return v(e, 'unsupported-member', `property .${name} is not declared on ${checker.typeToString(t)}`);
    }
  }
  // an open key (a string, a number, an unknown) on a plain record of data fields, or a number-keyed dictionary, reads as one
  // uninterpreted lookup of the value and the key; a key call, a method, a getter, a class instance or a symbol stays out
  function openKeyRefusal(e, t, at) {
    let keyCall = false;
    const visitKey = (n) => { if (ts.isCallExpression(n) || ts.isNewExpression(n)) keyCall = true; ts.forEachChild(n, visitKey); };
    visitKey(e.argumentExpression);
    if (keyCall) return 'bind the computed key before reading the record; a key call may mutate its receiver';
    if (nonNull(at).some((x) => x.flags & (TF.ESSymbolLike | TF.UniqueESSymbol))) return 'read a symbol-keyed member by a declared string key; a symbol key is outside the open-key reading';
    const props = checker.getPropertiesOfType(t);
    if (!(t.flags & TF.Object) || (!props.length && !checker.getIndexInfoOfType(t, ts.IndexKind.Number))) return 'use a finite union of declared string keys, or a Record<string, T> dictionary';
    const rt = tOf(e); // an absent key reads undefined: the read's type must hold it (any, unknown, or a union with undefined)
    if (!isAny(rt) && !(rt.flags & TF.Unknown) && !(rt.flags & TF.Union ? rt.types : [rt]).some((x) => x.flags & TF.Undefined)) return 'an absent key reads undefined, which this value type leaves out; type the values `T | undefined`, or read a declared key';
    if (t.symbol && (t.symbol.flags & ts.SymbolFlags.Class)) return 'an open key on a class instance may select a prototype member; read a declared field by name';
    if (props.some((p) => nonNull(checker.getTypeOfSymbolAtLocation(p, e)).some((x) => checker.getSignaturesOfType(x, ts.SignatureKind.Call).length))) return 'an open key may select a method; call a method by its declared name, and index records of data fields';
    if (props.some((p) => p.declarations?.some((d) => ts.isGetAccessorDeclaration(d) || ts.isSetAccessorDeclaration(d)))) return 'an open key may run a getter; read an accessor by its declared property name';
    return null;
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
      if (!keys) { const why = openKeyRefusal(e, parts[0], at); return why ? v(e, 'dynamic-key', why) : undefined; } // an open key: an uninterpreted lookup of the record value and the key
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

  // a promise handle: a non-async unit returns a promise it did not build (an outside call, a Promise static, a chain, a
  // name, a conditional of these); the result is the handle that call returned, a transition's value, never settled here
  function promiseHandle(u, at) {
    const leaves = [];
    const collect = (e) => { e = unparen(e); if (ts.isConditionalExpression(e)) { collect(e.whenTrue); collect(e.whenFalse); } else leaves.push(e); };
    if (!u.body) return;
    if (ts.isBlock(u.body)) { const w = (x) => { if (ts.isFunctionLike(x) || ts.isClassLike(x)) return; if (ts.isReturnStatement(x) && x.expression) collect(x.expression); ts.forEachChild(x, w); }; w(u.body); } else collect(u.body);
    if (!leaves.length) return v(at, 'promise', 'a Promise-returning function must return a promise or be async');
    for (const e of leaves) {
      if (ts.isNewExpression(e)) { v(e, 'promise', 'a promise built with new Promise is not a handle; make the function async'); continue; }
      if (ts.isCallExpression(e)) {
        const d = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(e.expression) ? e.expression.name : e.expression)?.declarations?.[0];
        const fn = d && d.getSourceFile() === sf ? (ts.isVariableDeclaration(d) ? d.initializer : d) : null;
        if (fn && ts.isFunctionLike(fn) && fn.body && fn.modifiers?.some((m) => m.kind === K.AsyncKeyword)) v(e, 'promise', 'a same-file async function runs on after its first await; return it from an async function with await');
        else if (ts.isPropertyAccessExpression(e.expression) && nonNull(tOf(e.expression.expression)).some((t) => isArrayLike(checker, t) || isSetT(t) || isMapT(t) || (t.flags & TF.StringLike))) v(e, 'promise', 'a promise read out of a collection has no identity in the reading; return the call that made it');
        continue;
      }
      if (ts.isIdentifier(e)) {
        const t = checker.getAwaitedType(tOf(e)) ?? tOf(e);
        if (!(t.flags & (TF.String | TF.Number | TF.Boolean | TF.BigInt)) && !isArrayLike(checker, t)) v(e, 'promise', 'a held promise of this result type has no identity in the reading; return the call itself');
        continue;
      }
      v(e, 'promise', 'return the promise from a call, a name or a conditional, or make the function async');
    }
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
      if (!u.isAsync && isPromiseT(rt)) promiseHandle(u, st);
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
        if (!u.isAsync && isPromiseT(rt)) promiseHandle(u, u.node);
        checkType(inner, u.typeNode ?? u.node);
        for (const p of u.params) {
          if (p.dotDotDotToken && !isArrayExpr(p.name)) v(p, 'param-form', 'a rest parameter is an array');
          if (p.initializer) expr(p.initializer);
          const names = []; bindingNames(p.name, names);
          checkType(tOf(p.name), p);
        }
        checkStringLiterals(u.node);
        if (u.isStatic && !u.params.every((p) => ts.isIdentifier(p.name))) staticThis(u.body); // with plain parameters the unit is one opaque transition keyed by the file
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
  // Optional mechanical advice never enters the proof gate. The editor and --advice ask for it.
  if (opts.advisory) {
    const note = (node, rule, msg) => {
      if (!overlaps(sf, node, ranges)) return;
      v(node, rule, msg);
      out[out.length - 1].advisory = true;
    };
    const memberName = (node) => {
      node = unparenX(node);
      if (ts.isPropertyAccessExpression(node)) return node.name.text;
      if (ts.isElementAccessExpression(node) && node.argumentExpression) {
        const key = unparenX(node.argumentExpression);
        if (ts.isStringLiteral(key) || ts.isNoSubstitutionTemplateLiteral(key)) return key.text;
      }
      return null;
    };
    const literal = (node) => {
      node = unparenX(node);
      return ts.isLiteralExpression(node) || [K.TrueKeyword, K.FalseKeyword, K.NullKeyword].includes(node.kind);
    };
    const walkAdvice = (node) => {
      if (ts.isConditionalExpression(node) && [node.whenTrue, node.whenFalse].some((branch) => ts.isConditionalExpression(unparenX(branch)))) {
        note(node, 'nested-ternary', 'a branch contains another conditional expression; nested if statements preserve its evaluation order');
      }
      if (ts.isBinaryExpression(node) && node.operatorToken.kind >= K.FirstAssignment && node.operatorToken.kind <= K.LastAssignment && ['innerHTML', 'outerHTML'].includes(memberName(node.left)) && !literal(node.right)) {
        note(node, 'inner-html', 'this HTML property receives a value that is not a literal; use textContent if the intent is plain text');
      }
      if (ts.isCallExpression(node) && memberName(node.expression) === 'write') {
        const receiver = unparenX(unparenX(node.expression).expression);
        if (ts.isIdentifier(receiver) && receiver.text === 'document' && [null, 'global'].includes(originOf(checker, receiver, sf, null).kind)) {
          note(node, 'inner-html', 'document.write parses HTML and changes the document; choose an element for textContent');
        }
      }
      if (ts.isForOfStatement(node) && !node.awaitModifier) {
        const body = ts.isBlock(node.statement) && node.statement.statements.length === 1 ? node.statement.statements[0] : node.statement;
        const value = ts.isExpressionStatement(body) ? unparenX(body.expression) : null;
        if (value && ts.isAwaitExpression(value) && ts.isCallExpression(unparenX(value.expression))) {
          note(node, 'promise-all-order', 'this loop awaits one call per element; Promise.all needs independent calls that commute in the world');
        }
      }
      ts.forEachChild(node, walkAdvice);
    };
    walkAdvice(sf);
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
  // any-type, when asked (opts.anyType): every declaration typed any or unknown in the file, with a type proposed from
  // its uses and callers, or a flag; opts.anyTypeSkipped collects the ones another finding owns; an advisory finding beside the refusals, so the gate, the census and the pull-request table never ask for it
  if (opts.anyType) {
    try { out.push(...anyTypeFindings(sf, checker, { file, ranges, unitSpans, skipped: opts.anyTypeSkipped ?? null })); } catch (e) { out.push({ file, line: 1, col: 1, endLine: 1, endCol: 1, rule: 'any-type', msg: `any-type could not read this file: ${String(e.message).slice(0, 160)}`, text: '', unit: null, label: 'flag-only', labelDecided: true, advice: null }); }
    out.sort((a, b) => a.line - b.line || a.col - b.col);
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
  if (!file) { console.error('usage: lint.mjs <file.ts> [--changed <ranges.json>] [--json | --agent] [--advice] [--any-type] [--project <tsconfig>|--no-project]'); process.exit(2); }
  const ci = args.indexOf('--changed');
  let ranges = null;
  if (ci >= 0) {
    if (!args[ci + 1]) { console.error('--changed needs a file'); process.exit(2); }
    ranges = (await import('../common.mjs')).readRanges(fs, args[ci + 1]);
  }
  const pi = args.indexOf('--project');
  const project = args.includes('--no-project') ? false : pi >= 0 ? args[pi + 1] : true;
  const res = lintFile(file, ranges, { project, advisory: args.includes('--advice'), anyType: args.includes('--any-type') });
  if (args.includes('--json')) console.log(JSON.stringify(res, null, 2));
  else if (args.includes('--agent')) console.log(agentReport(file, res));
  else for (const r of res) console.log(`${r.file}:${r.line}:${r.col}  ${r.rule}  ${r.msg}`);
  if (res.length) { if (!args.includes('--json')) console.log(`${res.length} violation(s)`); process.exit(1); }
  if (!args.includes('--json')) console.log(`${file}: inside the subset`);
  process.exit(0);
}
