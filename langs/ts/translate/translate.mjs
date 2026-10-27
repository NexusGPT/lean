#!/usr/bin/env node
// lean-ts translate, version 2: turns the functions of a TypeScript file into Dafny, the shared core form.
//
// What is new in version 2 (the real-code idioms the first trial refused, 0 of 27 functions):
//   externals   an imported value, a module constant, a value from another file, a pure library global:
//               an uninterpreted Dafny function in the PRELUDE, identical for parent and candidate.
//               Equality outside the scope then means: the same calls, the same results.
//   arrows      `export const f = (a: T): R => ...` is a function.
//   async       an async unit returns T, not Promise<T>; `await call(...)` is an external call.
//   null        single-absence unions use Option<T>; unions allowing both use Nullish<T> with distinct tags.
//   records     any object type the checker can list, from any file, becomes a datatype in the prelude;
//               a type with methods becomes an opaque type with accessor externals.
//   strings     seq<char>: concat, length, index, slice, includes, startsWith, endsWith, indexOf,
//               template literals; trim, case changes, split, replace stay externals.
//   sets, maps  set<T> and map<K,V>, with add/delete/set on locals as functional updates.
//   arrays      includes, some, every, find, findIndex, indexOf, slice, concat, join, flat, flatMap, at.
//   division    Math.floor(a / b) and a % b on integers through JavaScript-faithful helpers.
//   switch      an if/else chain; destructuring becomes field reads; literal unions become their base type.
//
// Output: the main file (functions of this file; loops as private recursive helpers) and a prelude
// (datatypes, opaque types, helpers with bodies, bodiless externals) written with --prelude. The gate
// merges the parent's and the candidate's preludes; a declaration that differs between them is refused.
//
// Usage: node translate.mjs <file.ts> --core --out <file.dfy> [--prelude <file.dfy>] [--suffix parent|candidate]
//          [--real] [--only f,g] [--project <tsconfig>|--no-project]
//        node translate.mjs <file.ts> --fn <name> --out <file.dfy> [--real] [--requires E]... [--ensures E]...
//          [--invariant [N:]E]...      (proof shape: one function, loops as a Dafny method; kept for the fixtures)
// Exit 0: file written. Exit 1: outside the subset, or not covered by the translator.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ts, loadProgram, lineOf, hintsOf, topLevelFunctions, isArrayLike, unitOf, originOf, fileUsesReals, methodLiteralOf, receiverRecordPath } from '../common.mjs';
import { moduleState, moduleLoader, outsideRoot, worldRead } from '../module-forms.mjs';
import { libraryHook, hookDatatype, fieldKind } from '../hooks.mjs';
import { lintFile, exceptionUnitsOf, mayFaultPure, opaqueExceptionTry } from '../lint/lint.mjs';
import { promiseForm, promiseConsumed, executorShape, unparen } from '../promise-forms.mjs';
import { reactHook, exactReactHook, closureReads, renderPure, arrowOf } from '../react.mjs';
import { readHandler, mentionsParam, localsOf } from '../handlers.mjs';
import { generatorReading, asyncGenerator, steppedAsyncLoop } from '../generators.mjs';
import { makeHeap } from './heap.mjs';

const K = ts.SyntaxKind;
const TF = ts.TypeFlags;

class Unsupported extends Error {}

const RESERVED = new Set(['abstract', 'allocated', 'as', 'assert', 'assume', 'bool', 'break', 'by', 'calc', 'case', 'char', 'class', 'codatatype',
  'const', 'constructor', 'datatype', 'decreases', 'else', 'ensures', 'exists', 'expect', 'export', 'extends', 'false', 'forall', 'fp', 'function',
  'ghost', 'if', 'import', 'in', 'include', 'inductive', 'int', 'invariant', 'is', 'iterator', 'label', 'lemma', 'map', 'match', 'method', 'modifies',
  'modify', 'module', 'multiset', 'nameonly', 'nat', 'new', 'newtype', 'null', 'object', 'old', 'opaque', 'predicate', 'print', 'provides', 'reads',
  'real', 'refines', 'requires', 'return', 'returns', 'reveal', 'seq', 'set', 'static', 'string', 'then', 'this', 'trait', 'true', 'type', 'unchanged',
  'var', 'while', 'witness', 'yield', 'yields', 'result', 'Option', 'None', 'Some', 'value', 'Nullish', 'Absent', 'Null', 'Undef',
  'fresh', 'twostate', 'ORDINAL', 'array', 'iset', 'imap', 'bv', 'least', 'greatest', 'continue', 'default', 'extern', 'exports', 'synthesize']);
const dn = (name) => { let n = name.replace(/[^A-Za-z0-9_]/g, '_'); if (n.startsWith('_')) n = 'u' + n; return RESERVED.has(n) ? `${n}_` : n; };
const snake = (n) => n.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').toLowerCase();
const mangle = (t) => t.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
const indentBlock = (s, n = 1) => s.split('\n').map((l) => '  '.repeat(n) + l).join('\n');
const wrapLet = (s) => (/^\s*var /.test(s) ? `(\n${indentBlock(s)}\n)` : s);
const hash = (s) => { let h = 5381; for (const c of s) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; return h.toString(36); };

export function translate(file, fnName, opts = {}) {
  const { real: realFlag = false, requires = [], ensures = [], invariants = [], core = false, suffix = '', only = null, project = true, effectful = [], tolerant = false, reportOut = null, heap = false, heapUnits = null } = opts;
  const sfx = core && suffix ? `_${suffix}` : '';
  const loaded = loadProgram(file, { project });
  const { sf, checker } = loaded;
  const real = realFlag || fileUsesReals(sf); // a file with a float literal or a bare `/` is a real file (see common.mjs)
  const fns = topLevelFunctions(sf);
  const exceptionUnits = exceptionUnitsOf(sf, checker, fns);
  const generators = generatorReading(checker, sf, fns);
  let yieldState = null;
  const target = fnName ? fns.get(fnName) : null;
  if (fnName && !target) throw new Unsupported(`no top-level function named ${fnName} in ${file}`);
  if (!fnName && !core) throw new Unsupported('--fn is required unless --core is given');

  const where = (n) => `${path.basename(file)}:${lineOf(sf, n.getStart(sf))}`;
  const fail = (n, msg) => { throw new Unsupported(`${where(n)}: ${msg}`); };

  // ----- which units to emit: the target (or all / --only), plus same-file callees, callees first -----
  const classDecls = new Map(); for (const st of sf.statements) if (ts.isClassDeclaration(st) && st.name) classDecls.set(st.name.text, st); // the file's own classes, by name
  const classOfType = (t) => { const sym = t && t.symbol; const d = sym?.declarations?.[0]; return d && ts.isClassDeclaration(d) && d.getSourceFile() === sf && d.name ? (classDecls.get(d.name.text) ?? null) : null; };
  // accessors retain an opaque unit when their body is outside the subset
  const accessorOpaque = new Set();
  if ([...fns.values()].some((u) => u.accessor)) {
    const findings = lintFile(file, null, { project, loaded, accessorBodies: true }).filter((g) => !g.env);
    for (const u of fns.values()) if (u.accessor) { let staticThis = false; const walk = (n) => { if (u.isStatic && n.kind === K.ThisKeyword) staticThis = true; ts.forEachChild(n, walk); }; walk(u.body); if (staticThis || findings.some((g) => g.line >= lineOf(sf, u.node.getStart(sf)) && g.line <= lineOf(sf, u.node.getEnd()))) accessorOpaque.add(u.name); }
  }
  function accessorOf(n, kind, owner = currentUnit) {
    if (!ts.isPropertyAccessExpression(n)) return null;
    const cls = n.expression.kind === K.ThisKeyword ? owner?.cls : classOfType(checker.getTypeAtLocation(n.expression));
    const u = cls && fns.get(`${cls.name.text}.${kind}_${n.name.text}`);
    return u?.accessor === kind ? u : null;
  }
  const propertyWrite = (n) => n.parent && ((ts.isBinaryExpression(n.parent) && n.parent.left === n && n.parent.operatorToken.kind >= K.FirstAssignment && n.parent.operatorToken.kind <= K.LastAssignment) || ((ts.isPrefixUnaryExpression(n.parent) || ts.isPostfixUnaryExpression(n.parent)) && [K.PlusPlusToken, K.MinusMinusToken].includes(n.parent.operator)));
  let order = [];
  const visiting = new Set();
  const visitStack = [];
  const recursiveUnits = new Set();
  const FUEL = 'fuel';
  let currentUnit = null;
  function collect(u) {
    if (order.includes(u)) return;
    if (visiting.has(u)) { for (let i = visitStack.lastIndexOf(u); i < visitStack.length; i++) recursiveUnits.add(visitStack[i].name); return; } // a cycle: every unit on it takes fuel
    visiting.add(u); visitStack.push(u);
    const walk = (n) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
        const callee = fns.get(n.expression.text);
        if (callee && originOf(checker, n.expression, sf, null).kind === 'unit') collect(callee);
      } else if (ts.isIdentifier(n) && fns.has(n.text) && !(n.parent && ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) && !(n.parent && (ts.isJsxOpeningElement(n.parent) || ts.isJsxSelfClosingElement(n.parent) || ts.isJsxClosingElement(n.parent)))) {
        // a same-file function named as a value (a callback): emitted like a callee
        const callee = fns.get(n.text);
        if (callee && originOf(checker, n, sf, null).kind === 'unit') collect(callee);
      }
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.expression.kind === K.ThisKeyword && u.cls) {
        const callee = fns.get(`${u.className}.${n.expression.name.text}`);
        if (callee) collect(callee);
      }
      if (ts.isNewExpression(n) && ts.isIdentifier(n.expression) && classDecls.has(n.expression.text)) { const ctor = fns.get(`${n.expression.text}.constructor`); if (ctor) collect(ctor); } // `new C()`: the constructor runs
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.expression.kind !== K.ThisKeyword && n.expression.expression.kind !== K.SuperKeyword) {
        const sfc = (ts.isIdentifier(n.expression.expression) && classDecls.has(n.expression.expression.text)) ? classDecls.get(n.expression.expression.text) : classOfType(checker.getTypeAtLocation(n.expression.expression));
        if (sfc) { const callee = fns.get(`${sfc.name.text}.${n.expression.name.text}`); if (callee) collect(callee); }
      }
      if (ts.isPropertyAccessExpression(n)) {
        const get = accessorOf(n, 'get', u), set = propertyWrite(n) && accessorOf(n, 'set', u);
        if (get && !(propertyWrite(n) && ts.isBinaryExpression(n.parent) && n.parent.operatorToken.kind === K.EqualsToken)) collect(get);
        if (set) collect(set);
      }
      ts.forEachChild(n, walk);
    };
    if (!asyncGenerator(u) && !accessorOpaque.has(u.name)) walk(u.body);
    visiting.delete(u); visitStack.pop();
    order.push(u);
  }
  if (target) collect(target);
  else if (only) { for (const name of only) { const u = fns.get(name); if (!u) fail(sf, `no top-level function or class method named ${name}`); collect(u); } }
  else for (const u of fns.values()) collect(u);

  // ----- the subset gate: refuse before translating -----
  const promiseReadings = new Set();
  const gate0 = lintFile(file, order.map((u) => [lineOf(sf, u.node.getStart(sf)), lineOf(sf, u.node.getEnd())]), { project, promiseReadings }).filter((g) => !g.env); // an unresolved module is the checkout's finding, not the code's: its values are opaque
  const report = { lintedOut: [], translated: [], failed: [] }; // --tolerant: per-unit outcomes for a census
  const failedUnits = new Set();
  let gate = gate0;
  if (tolerant) {
    for (const u of order) {
      const a = lineOf(sf, u.node.getStart(sf)), b = lineOf(sf, u.node.getEnd());
      const hits = gate0.filter((g) => g.line >= a && g.line <= b);
      if (hits.length) { report.lintedOut.push({ unit: u.name, rule: hits[0].rule, msg: String(hits[0].msg).slice(0, 140) }); failedUnits.add(u.name); }
    }
    order = order.filter((u) => !failedUnits.has(u.name));
    gate = [];
  }
  if (gate.length) {
    throw new Unsupported(`outside the subset:\n${gate.map((g) => `  ${g.file}:${g.line}:${g.col}  ${g.rule}  ${g.msg}`).join('\n')}`);
  }
  // ----- references, layer 2: the heap core (heap.mjs) is planned over the final order; its units are emitted there -----
  const heapT = core ? makeHeap({ ts, checker, sf, fns, dn, fname: (n) => fname(n), isReal: real, recursive: recursiveUnits, typeOf: (n) => typeOf(n) }) : null; // every unit's identity guard (layer 1) is read through the heap translator; its core is planned only under --heap
  const heapHyps = [];
  const cellLines = []; // `// CELLS <unit>: <json>`: the persistent cells the unit touches (module cells, fields of this, outside roots), each read or written, each matched against the transition the emitted text carries; a touched cell with no transition is an obligation, and lane A says ASK:obligation
  // the state-completeness audit (research 14 design (c)): what a unit reads and writes outside its own frame. A module
  // cell is a module-level `let` or an object-valued const (moduleState); a field of `this` is a class method's world;
  // an outside root is globalThis, process, window. A use is modelled when the emitted Dafny names its transition
  // (Module_file_get_/set_, the class's _get_/_set_ accessors or the heap core's Get_/Set_, global_handle_/global_get_);
  // a module object changed through a mutator (cache.set) is an effect the unit carries as a whole, counted as modelled.
  const MUTATOR_NAMES = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin', 'set', 'add', 'delete', 'clear']);
  const cellsOf = (u, text) => {
    const cells = new Map();
    const touch = (kind, name, how) => { const key = `${kind}:${name}`; const c = cells.get(key) ?? { kind, name, read: false, write: false, mutator: false }; c[how] = true; cells.set(key, c); };
    const isWrite = (n) => { const p = n.parent; if (!p) return false; if (ts.isBinaryExpression(p) && p.left === n && p.operatorToken.kind >= K.FirstAssignment && p.operatorToken.kind <= K.LastAssignment) return true; if ((ts.isPrefixUnaryExpression(p) || ts.isPostfixUnaryExpression(p)) && (p.operator === K.PlusPlusToken || p.operator === K.MinusMinusToken)) return true; return ts.isDeleteExpression(p); };
    const isMutated = (n) => !!(n.parent && ts.isPropertyAccessExpression(n.parent) && n.parent.expression === n && n.parent.parent && ts.isCallExpression(n.parent.parent) && n.parent.parent.expression === n.parent && MUTATOR_NAMES.has(n.parent.name.text));
    const constantField = (name) => !!(u.cls && u.cls.members.some((m) => ts.isPropertyDeclaration(m) && ts.isIdentifier(m.name) && m.name.text === name && (ts.getCombinedModifierFlags(m) & ts.ModifierFlags.Readonly) && m.initializer && (ts.isLiteralExpression(m.initializer) || [K.TrueKeyword, K.FalseKeyword].includes(m.initializer.kind)))); // a readonly field with a literal initializer is a constant the translator folds, not a cell
    const walk = (n) => {
      if (ts.isIdentifier(n) && !(n.parent && ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) && !(n.parent && ts.isPropertyAssignment(n.parent) && n.parent.name === n)) {
        if (moduleState(checker, n, sf)) touch('module', n.text, isWrite(n) ? 'write' : isMutated(n) ? 'mutator' : 'read');
        else if (outsideRoot(checker, n, sf, u.node) && n.text !== 'require') touch('outside', n.text, isWrite(n) ? 'write' : 'read');
      }
      if (ts.isPropertyAccessExpression(n) && n.expression.kind === K.ThisKeyword && u.cls && !constantField(n.name.text)) touch('this', n.name.text, isWrite(n) ? 'write' : isMutated(n) ? 'mutator' : 'read');
      ts.forEachChild(n, walk);
    };
    walk(u.body ?? u.fn);
    const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const has = (re) => re.test(text);
    const modelled = (c) => {
      if (/_block_/.test(text)) return true; // an opaque unit: one uninterpreted transition of the world, every cell inside it rides in that transition
      if (c.kind === 'module') return (!c.read || has(new RegExp(`Module_file_get_${esc(c.name)}_`))) && (!c.write || has(new RegExp(`Module_file_set_${esc(c.name)}_`))) && (!c.mutator || /\bWorld\b/.test(text));
      if (c.kind === 'this') return (!c.read || has(new RegExp(`(_get_${esc(c.name)}(_|\\()|Get_\\w+_${esc(c.name)}\\(|\\.${esc(c.name)}_f\\b|_${esc(c.name)}_Ext_\\w+\\(self\\))`))) && (!c.write || has(new RegExp(`(_set_${esc(c.name)}(_|\\()|Set_\\w+_${esc(c.name)}\\(|${esc(c.name)}_f :=)`))) && (!c.mutator || /\bWorld\b/.test(text));
      return (!c.read || has(/(global_handle_|global_get_|module_require|module_import)/)) && !c.write;
    };
    const list = [...cells.values()].map((c) => ({ ...c, modelled: modelled(c) }));
    return { cells: list, obligations: list.filter((c) => !c.modelled).map((c) => `${c.kind} ${c.name}: ${[c.read && 'read', c.write && 'write', c.mutator && 'mutator'].filter(Boolean).join('+')} without a transition`) };
  };
  const fnIdsOf = new Map(); // unit name -> the code ids of the function values it emits (`// FN <unit>: [...]`)
  const fnLines = [];
  const sigLines = []; // `// SIG <unit>: <json>`: the TypeScript signature a caller sees (the method's decorators, the `this` type if declared, per position the parameter's decorators, type, optionality, rest-ness and default, the return type); the theorem compares it across the two sides before writing a lemma. Parameter names sit in `names`, which the theorem never compares: a caller passes by position
  const fold = (t) => String(t ?? '').replace(/\s+/g, ' ').trim();
  const sigOf = (u) => { const fn = u.fn; const decs = (n) => (ts.canHaveDecorators && ts.canHaveDecorators(n) ? (ts.getDecorators(n) ?? []) : []).map((d) => fold(d.getText(sf))); const isThis = (p) => ts.isIdentifier(p.name) && p.name.text === 'this'; const thisP = fn.parameters.find(isThis); const ps = fn.parameters.filter((p) => !isThis(p)); return JSON.stringify({ decorators: decs(fn), ...(thisP ? { this: thisP.type ? fold(thisP.type.getText(sf)) : null } : {}), params: ps.map((p) => ({ decorators: decs(p), type: p.type ? fold(p.type.getText(sf)) : null, optional: !!p.questionToken, rest: !!p.dotDotDotToken, init: p.initializer ? fold(p.initializer.getText(sf)) : null })), ret: fn.type ? fold(fn.type.getText(sf)) : null, names: ps.map((p) => fold(p.name.getText(sf))) }); };
  const heapGuards = []; // layer-1 units: exposure and identity skeleton, for the theorem's identity guard

  // ----- the world: every effectful call is a transition of an explicit world token -----
  // An effect is any call that may depend on or change something outside the function: an imported function, an
  // awaited call, a method of an opaque or record value, a constructor of an unknown class. It takes the current
  // world and returns the next one with its result. Two calls of the same operation are two transitions: a clock read
  // twice may differ. A pure library call (strings, arrays, Math, JSON) and a module constant stay world-free.
  const WORLD = 'wld';
  let pending = []; // hoisted `var (wld, tN) := ...;` lines of the statement being translated, in source order
  let tempCount = 0;
  let faultMode = false;
  let completionMode = false;
  const FAULT_CHECK = '// fault checkpoint';
  const effectfulUnits = new Set(); // same-file units that take and return the world
  // ----- hook slots: a plain unit whose top-level statements call React's useState, and that no other unit of the
  // file calls, is read as a function of its props AND its slots (one per useState call, in order): the render reads
  // slot i, a handler's setter call becomes a ReactSet step carrying the next value of slot i, and the unit also
  // returns its initial slots. Equal renders for every slots value, equal next slots for every handler and equal
  // initial slots make every click sequence equal (the induction is in design/moonshots/02-step-lemma). A unit called
  // by another unit (a custom hook) keeps the world reading: its slots would belong to its caller's list.
  const slotUnits = new Map(); // unit name -> [{ call, index }]
  const slotOfCall = new Map(); // useState call node -> { unit, index }
  const setterSlot = new Map(); // the setter local's symbol -> slot index (filled when the call is translated)
  {
    const calledUnits = new Set();
    for (const [, u] of fns) { const w = (n) => { if (ts.isIdentifier(n) && fns.has(n.text) && n.text !== u.name) { const d = checker.getSymbolAtLocation(n)?.declarations?.[0]; if (d && d.getSourceFile() === sf) calledUnits.add(n.text); } ts.forEachChild(n, w); }; if (u.body) w(u.body); }
    for (const [name, u] of fns) {
      if (!u.body || !ts.isBlock(u.body) || u.cls || u.fn.asteriskToken || calledUnits.has(name)) continue;
      const calls = [];
      for (const st of u.body.statements) if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) { const init = d.initializer; if (init && ts.isCallExpression(init) && reactHook(checker, init) === 'useState' && ts.isArrayBindingPattern(d.name)) calls.push(init); }
      if (!calls.length || calls.some((c) => { const st = checker.getTypeArguments(checker.getTypeAtLocation(c))[0]; return !st || !!(st.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)); })) continue; // a state type the reader cannot see keeps the world reading
      slotUnits.set(name, calls.map((call, index) => ({ call, index })));
      calls.forEach((call, index) => slotOfCall.set(call, { unit: name, index }));
    }
  }
  let currentSlots = null; // while a slot unit is emitted: { T: the Slots datatype, n: slot count, types: [D] }
  const PURE_RECEIVERS = new Set(['Math', 'JSON', 'String', 'Number', 'Boolean', 'Buffer', 'Array', 'BigInt', 'Symbol', 'Object']); // Object.keys/values/entries/assign/fromEntries: pure functions of their arguments (the lint refuses the prototype ones)
  const PURE_CTORS = new Set(['Set', 'Map', 'RegExp', 'Error', 'TypeError', 'RangeError', 'Date', 'URL', 'Uint8Array', 'Array']);
  const localEffectScan = new Set();
  function isEffectCall(n) {
    if (mayFaultPure(n, checker, sf)) return true;
    if (ts.isPropertyAccessExpression(n)) {
      const literal = literalGetter(n); if (literal) return !exactObjectMethod(literal);
      const get = accessorOf(n, 'get'), set = propertyWrite(n) && accessorOf(n, 'set');
      if (set || (get && (accessorOpaque.has(get.name) || effectfulUnits.has(get.name)))) return true;
    }
    if (ts.isAwaitExpression(n) || (ts.isForOfStatement(n) && n.awaitModifier)) return true;
    if (ts.isNewExpression(n)) { const c = n.expression.getText(sf); if (c === 'Date' && !(n.arguments && n.arguments.length)) return true; return !PURE_CTORS.has(c); } // `new Date()` with no argument reads the clock
    if (!ts.isCallExpression(n)) return false;
    if (exactReactHook(checker, n)) return false;
    const f = n.expression;
    if (ts.isIdentifier(f)) {
      const o = originOf(checker, f, sf, currentUnit?.node ?? null);
      if (o.kind === 'unit') return effectfulUnits.has(f.text);
      if (o.kind === 'global') return !PURE_RECEIVERS.has(f.text) && !['parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'String', 'Number', 'Boolean', 'structuredClone'].includes(f.text);
      // a local bound to an arrow literal is a pure lambda (an effect inside it is refused by lambda()); any other local function value is opaque
      if (o.kind === 'local' && o.decl && ts.isVariableDeclaration(o.decl) && o.decl.initializer && ts.isArrowFunction(o.decl.initializer)) {
        if (localEffectScan.has(o.decl)) return true;
        localEffectScan.add(o.decl);
        try { return containsEffect(o.decl.initializer.body); } finally { localEffectScan.delete(o.decl); }
      }
      return true; // an import, a value from another file, a module const holding a function, a function-typed parameter
    }
    if (ts.isPropertyAccessExpression(f)) {
      const recv = f.expression;
      // clock methods read the world even when their result is a primitive
      if (ts.isIdentifier(recv) && ((recv.text === 'Date' || recv.text === 'performance') && f.name.text === 'now' || recv.text === 'process' && f.name.text === 'hrtime') && originOf(checker, recv, sf, currentUnit?.node ?? null).kind === 'global') return true;
      const om = literalMethod(f);
      if (om) return !exactObjectMethod(om);
      if (recv.kind === K.SuperKeyword) return true; // the parent's method: a transition on the receiver
      if (recv.kind === K.ThisKeyword && currentUnit?.cls) { const callee = fns.get(`${currentUnit.className}.${f.name.text}`); if (callee) return effectfulUnits.has(callee.name); return true; }
      if (moduleState(checker, recv, sf) && MUTATORS.has(f.name.text)) return true;
      if (isWorldField(recv)) return true; // the field lives in the world; a method on it may change it
      if (ts.isIdentifier(recv) && recv.text === 'Object' && originOf(checker, recv, sf, currentUnit?.node ?? null).kind === 'global' && ['keys', 'values', 'entries'].includes(f.name.text) && n.arguments.length === 1 && enumerationRecord(n.arguments[0])) return !recordEnumerationLiteral(n.arguments[0]);
      if (ts.isIdentifier(recv) && PURE_RECEIVERS.has(recv.text) && originOf(checker, recv, sf, currentUnit?.node ?? null).kind === 'global') return !(recv.text !== 'Math' || f.name.text !== 'random'); // Math.random reads the world
      { const sfc = classRef(recv) ?? sameFileClassOf(typeOf(recv)); if (sfc) { const callee = fns.get(`${sfc.name.text}.${f.name.text}`); if (callee && !callee.isCtor) return effectfulUnits.has(callee.name); return true; } } // a same-file class: its own unit's flag; an inherited method is a transition
      const t = baseOf(typeOf(recv));
      if (isArrayLike(checker, t) || (t.flags & TF.StringLike) || isSetT(t) || isMapT(t) || (t.flags & (TF.NumberLike | TF.BooleanLike))) return false;
      return true; // opaque, record method, imported object, any
    }
    return true;
  }
  // try/catch, exact: an effect inside the body may fault; the fault is a flag on the world, checked after each statement
  // of the body that makes a transition (or throws); the catch path binds the fault value and runs with the flag cleared.
  // complex try statements keep their text-keyed opaque transition; the gate is local to the statement.
  const loopsOverEffect = (node) => { let f = false; const w = (x) => { if (f) return; if ((ts.isArrowFunction(x) || ts.isFunctionExpression(x)) && !isLoopCallback(x)) return; if ((isLoopCallback(x) || ts.isForOfStatement(x) || ts.isForStatement(x) || ts.isWhileStatement(x) || ts.isForInStatement(x)) && containsEffect(x)) { f = true; return; } ts.forEachChild(x, w); }; w(node); return f; };
  const exactTry = (x) => core && ts.isTryStatement(x) && !opaqueExceptionTry(x, checker) && !escapingLabels(x).length;
  const emptyFor = (s) => ts.isForStatement(s) && !s.initializer && !s.condition && !s.incrementor;
  const boundCache = new WeakMap();
  // a bound is derived only when every next iteration moves one integer local toward a stable limit
  function derivedBound(s) {
    if (boundCache.has(s)) return boundCache.get(s);
    boundCache.set(s, null);
    if (real || !(ts.isWhileStatement(s) || emptyFor(s))) return null;
    const unwrap = (e) => { while (e && ts.isParenthesizedExpression(e)) e = e.expression; return e; };
    let condition = emptyFor(s) ? null : unwrap(s.expression), negate = false;
    let body = ts.isBlock(s.statement) ? [...s.statement.statements] : [s.statement];
    if (!condition || condition.kind === K.TrueKeyword) {
      const first = body[0];
      if (!first || !ts.isIfStatement(first) || first.elseStatement) return null;
      const exit = ts.isBlock(first.thenStatement) ? first.thenStatement.statements : [first.thenStatement];
      if (exit.length !== 1 || !ts.isBreakStatement(exit[0]) || (exit[0].label && !(ts.isLabeledStatement(s.parent) && s.parent.label.text === exit[0].label.text))) return null;
      condition = unwrap(first.expression); negate = true; body = body.slice(1);
    }
    while (condition && ts.isPrefixUnaryExpression(condition) && condition.operator === K.ExclamationToken) { negate = !negate; condition = unwrap(condition.operand); }
    if (!condition || !ts.isBinaryExpression(condition) || !ts.isIdentifier(condition.left)) return null;
    const inverse = { [K.LessThanToken]: K.GreaterThanEqualsToken, [K.LessThanEqualsToken]: K.GreaterThanToken, [K.GreaterThanToken]: K.LessThanEqualsToken, [K.GreaterThanEqualsToken]: K.LessThanToken };
    const kind = negate ? inverse[condition.operatorToken.kind] : condition.operatorToken.kind;
    const op = { [K.LessThanToken]: '<', [K.LessThanEqualsToken]: '<=', [K.GreaterThanToken]: '>', [K.GreaterThanEqualsToken]: '>=' }[kind];
    if (!op) return null;
    const counter = condition.left, sym = checker.getSymbolAtLocation(counter), decl = sym?.valueDeclaration;
    if (!decl || !ts.isVariableDeclaration(decl) || decl.end > s.pos || originOf(checker, counter, sf, currentUnit?.node).kind !== 'local' || !(checker.getTypeAtLocation(counter).flags & TF.NumberLike)) return null;
    const limit = unwrap(condition.right), boundNames = new Set();
    const integer = (e) => ts.isNumericLiteral(e) && Number.isSafeInteger(Number(e.text)) || ts.isPrefixUnaryExpression(e) && e.operator === K.MinusToken && ts.isNumericLiteral(e.operand) && Number.isSafeInteger(Number(e.operand.text));
    if (ts.isIdentifier(limit)) {
      const d = checker.getSymbolAtLocation(limit)?.valueDeclaration;
      if (!d || !ts.isVariableDeclaration(d) || !(ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const) || !d.initializer || !integer(d.initializer)) return null;
      boundNames.add(limit.text);
    } else if (ts.isPropertyAccessExpression(limit) && limit.name.text === 'length' && ts.isIdentifier(limit.expression)) {
      const t = checker.getTypeAtLocation(limit.expression);
      if (!(isArrayLike(checker, t) || t.flags & TF.StringLike) || originOf(checker, limit.expression, sf, currentUnit?.node).kind !== 'local') return null;
      boundNames.add(limit.expression.text);
    } else if (!integer(limit)) return null;
    const last = body[body.length - 1];
    if (!last || !ts.isExpressionStatement(last)) return null;
    const step = last.expression; const down = kind === K.GreaterThanToken || kind === K.GreaterThanEqualsToken;
    let target, delta;
    if ((ts.isPostfixUnaryExpression(step) || ts.isPrefixUnaryExpression(step)) && [K.PlusPlusToken, K.MinusMinusToken].includes(step.operator)) { target = step.operand; delta = step.operator === K.PlusPlusToken ? 1 : -1; }
    else if (ts.isBinaryExpression(step) && [K.PlusEqualsToken, K.MinusEqualsToken].includes(step.operatorToken.kind) && ts.isNumericLiteral(step.right)) { target = step.left; delta = Number(step.right.text) * (step.operatorToken.kind === K.PlusEqualsToken ? 1 : -1); }
    if (!target || !ts.isIdentifier(target) || checker.getSymbolAtLocation(target) !== sym || !Number.isSafeInteger(delta) || (down ? delta >= 0 : delta <= 0)) return null;
    let safe = true;
    const scan = (n) => {
      if (!safe || n === step) return;
      if (ts.isCallExpression(n) || ts.isNewExpression(n) || ts.isFunctionLike(n) || ts.isIterationStatement(n, false) || ts.isTryStatement(n) || ts.isContinueStatement(n)) { safe = false; return; }
      let lhs = ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment ? n.left : (ts.isPostfixUnaryExpression(n) || ts.isPrefixUnaryExpression(n)) && [K.PlusPlusToken, K.MinusMinusToken].includes(n.operator) ? n.operand : null;
      while (lhs && (ts.isPropertyAccessExpression(lhs) || ts.isElementAccessExpression(lhs))) lhs = lhs.expression;
      if (lhs && ts.isIdentifier(lhs) && (lhs.text === counter.text || boundNames.has(lhs.text))) { safe = false; return; }
      ts.forEachChild(n, scan);
    };
    body.forEach(scan);
    if (!safe) return null;
    const result = { counter, limit, op, down, body };
    boundCache.set(s, result); return result;
  }
  const opaqueSwitch = (s) => { const t = checker.getTypeAtLocation(s.expression); return (t.flags & TF.Union ? t.types : [t]).some((p) => !(p.flags & (TF.StringLike | TF.NumberLike | TF.BooleanLike | TF.BigIntLike | TF.Null | TF.Undefined | TF.Never))); };
  const isOpaqueStmt = (x) => (ts.isForOfStatement(x) && x.awaitModifier && !steppedAsyncLoop(x, checker)) || (ts.isSwitchStatement(x) && opaqueSwitch(x)) || (ts.isTryStatement(x) && !exactTry(x)) || ((ts.isWhileStatement(x) || ts.isDoStatement(x) || emptyFor(x)) && (!hintsOf(sf, x).decreases && !derivedBound(x)));
  // `xs.forEach((x) => body)` as a statement: a loop over xs whose body is the callback's body, each iteration's transitions
  // in order. The callback takes one plain parameter and returns nothing (a `return` inside it would end one step).
  const forEachShape = (st) => {
    if (!ts.isExpressionStatement(st)) return null;
    let e = st.expression; while (ts.isParenthesizedExpression(e)) e = e.expression;
    if (!ts.isCallExpression(e) || !ts.isPropertyAccessExpression(e.expression) || e.expression.name.text !== 'forEach' || e.arguments.length !== 1) return null;
    const cb = e.arguments[0];
    if (!ts.isArrowFunction(cb) || cb.parameters.length !== 1 || !ts.isIdentifier(cb.parameters[0].name) || cb.modifiers?.some((m) => m.kind === K.AsyncKeyword)) return null; // an async callback is not awaited by forEach: not a loop
    let recvT; try { recvT = baseOf(typeOf(e.expression.expression)); } catch { return null; }
    if (!(isArrayLike(checker, recvT) || isSetT(recvT) || isMapT(recvT) || isAny(recvT))) return null;
    return { call: e, cb };
  };
  // an inline array callback is a loop body; its return supplies the method's result
  const callbackMethods = new Set(['map', 'filter', 'find', 'findIndex', 'some', 'every', 'flatMap', 'reduce']);
  const arrayCallbackShape = (e0) => {
    let e = e0; while (ts.isParenthesizedExpression(e)) e = e.expression;
    if (!ts.isCallExpression(e) || !ts.isPropertyAccessExpression(e.expression) || !callbackMethods.has(e.expression.name.text)) return null;
    const method = e.expression.name.text, cb = e.arguments[0];
    if (!cb || !ts.isArrowFunction(cb) || cb.parameters.length < (method === 'reduce' ? 2 : 1) || cb.parameters.length > 2 || cb.parameters.some((p) => !ts.isIdentifier(p.name) || p.initializer || p.dotDotDotToken || p.questionToken)) return null;
    if (e.arguments.length !== (method === 'reduce' ? 2 : 1) || !isArrayLike(checker, baseOf(typeOf(e.expression.expression)))) return null;
    return { call: e, cb, method };
  };
  // Promise.all collects results by index; the lint excludes observable work after suspension
  const promiseAllMapShape = (e0) => {
    let e = e0; while (ts.isParenthesizedExpression(e)) e = e.expression;
    if (!ts.isAwaitExpression(e)) return null; e = e.expression; while (ts.isParenthesizedExpression(e)) e = e.expression;
    if (!ts.isCallExpression(e) || !ts.isPropertyAccessExpression(e.expression) || e.expression.name.text !== 'all' || !ts.isIdentifier(e.expression.expression) || e.expression.expression.text !== 'Promise' || e.arguments.length !== 1) return null;
    const shape = arrayCallbackShape(e.arguments[0]);
    if (!shape || !['map', 'flatMap'].includes(shape.method)) return null;
    // flatMap does not flatten a promise; its resolved array remains one collected element
    const rt = checker.getSignatureFromDeclaration(shape.cb).getReturnType();
    if (shape.method === 'flatMap' && !isPromiseT(rt)) return null;
    return { ...shape, method: 'map', all: e };
  };
  const isLoopCallback = (x) => !!(x && x.parent && ts.isCallExpression(x.parent) && x.parent.arguments[0] === x && (arrayCallbackShape(x.parent) || forEachShape({ kind: K.ExpressionStatement, expression: x.parent })));
  function fakeForOf(st, fe, collect = null) {
    const { call, cb } = fe; const name = cb.parameters[fe.method === 'reduce' ? 1 : 0].name;
    const body = ts.isBlock(cb.body) ? cb.body : { kind: collect ? K.ReturnStatement : K.ExpressionStatement, expression: cb.body, parent: cb, pos: cb.body.pos, end: cb.body.end, getStart: () => cb.body.getStart(sf), getEnd: () => cb.body.getEnd(), getText: () => cb.body.getText(sf), getFullStart: () => cb.body.getFullStart() };
    const decl = { kind: K.VariableDeclaration, name, pos: name.pos, end: name.end, parent: null };
    const list = { kind: K.VariableDeclarationList, declarations: [decl], flags: ts.NodeFlags.Const, pos: name.pos, end: name.end, parent: null };
    decl.parent = list;
    const fake = { kind: K.ForOfStatement, expression: call.expression.expression, initializer: list, statement: body, parent: st.parent, pos: st.pos, end: st.end, getStart: () => st.getStart(sf), getEnd: () => st.getEnd(), getText: () => st.getText(sf), getFullStart: () => st.getFullStart(), __forEach: true, __collect: collect, __callback: fe };
    list.parent = fake;
    return fake;
  }
  // the innermost exact try whose BODY holds the statement, within the same function
  const tryOf = (st) => { let n = st; let child = null; while (n && !ts.isFunctionLike(n)) { if (ts.isTryStatement(n) && exactTry(n) && child === n.tryBlock) return n; child = n; n = n.parent; } return null; };
  const faultPreds = () => {
    addPrelude('World', 'type World');
    const defs = [
      ['faulted', ['World'], 'bool', 'a0.fault.Some?'],
      ['fault_value', ['World'], anyType(), 'if a0.fault.Some? then a0.fault.value else ext_no_fault_value()'],
      ['clear_fault', ['World'], 'World', 'World(a0.history, None)'],
      ['raise', ['World', anyType()], 'World', 'World(a0.history, Some(a1))'],
    ];
    external('no_fault_value', [], anyType());
    const ids = defs.map(([name, ps, ret, body]) => { const id = external(name, ps, ret); if (!prelude.get(id).includes('{')) prelude.set(id, `${prelude.get(id)} { ${body} }`); return id; });
    return { faulted: ids[0], value: ids[1], clear: ids[2], raise: ids[3] };
  };
  const containsEffect = (node) => { let f = false; const w = (x) => { if (f) return; if ((ts.isArrowFunction(x) || ts.isFunctionExpression(x) || ts.isMethodDeclaration(x) || ts.isGetAccessorDeclaration(x) || ts.isSetAccessorDeclaration(x)) && !isLoopCallback(x)) return; if (isEffectCall(x) || isOpaqueStmt(x) || isWorldField(x) || isInstanceWorldField(x) || moduleState(checker, x, sf) || (outsideRoot(checker, x, sf, currentUnit?.node) && x.text !== 'require') || worldRead(checker, x, sf, currentUnit?.node) || (ts.isTryStatement(x) && exactTry(x))) { f = true; return; } ts.forEachChild(x, w); }; w(node); return f; };
  const unitEffectful = () => !!currentUnit && effectfulUnits.has(currentUnit.name);
  // ----- references, layer 1: a parameter the function mutates is an OUTPUT of the function -----
  // A parameter whose field, slot or contents the function assigns (p.f = v, p[i] = v, p.push(x), p.f.g = v) is read as a
  // local that starts as the argument; the function returns its final value beside the result, and a caller that passed
  // a name takes the new value back into that name. Two parameters are distinct objects (the stated axiom; the lint
  // refuses a mutation through a local alias). A parameter passed to a same-file function that mutates it is mutated too.
  const mutatedByUnit = new Map(); // unit name -> [param names] in parameter order
  const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'set', 'add', 'delete', 'clear', 'fill', 'copyWithin']);
  function syntacticMutations(u) {
    if (asyncGenerator(u)) return new Set(); // the suspended body has not run at construction
    const params = new Set(u.params.filter((p) => ts.isIdentifier(p.name)).map((p) => p.name.text));
    const out = new Set();
    const rootOf = (x) => { while (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x) || ts.isNonNullExpression(x) || ts.isParenthesizedExpression(x)) x = x.expression; return x; };
    const hit = (x) => { const r = rootOf(x); if (ts.isIdentifier(r) && params.has(r.text) && r !== x) out.add(r.text); };
    const walk = (n) => {
      if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) return; // a callback cannot mutate an outer value (lint)
      if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment) hit(n.left);
      if ((ts.isPostfixUnaryExpression(n) || ts.isPrefixUnaryExpression(n)) && (n.operator === K.PlusPlusToken || n.operator === K.MinusMinusToken)) hit(n.operand);
      if (ts.isExpressionStatement(n)) { let e = n.expression; while (ts.isParenthesizedExpression(e)) e = e.expression; if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && MUTATORS.has(e.expression.name.text)) { const r = rootOf(e.expression.expression); if (ts.isIdentifier(r) && params.has(r.text)) out.add(r.text); } }
      if (ts.isExpressionStatement(n)) { let e = n.expression; while (ts.isParenthesizedExpression(e)) e = e.expression; if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && ts.isIdentifier(e.expression.expression) && e.expression.expression.text === 'Object' && e.expression.name.text === 'assign' && e.arguments.length >= 2) { const r = rootOf(e.arguments[0]); if (ts.isIdentifier(r) && params.has(r.text)) out.add(r.text); } } // Object.assign(t, …) writes t: a parameter t is an output
      if (ts.isDeleteExpression(n)) hit(n.expression);
      ts.forEachChild(n, walk);
    };
    walk(u.body);
    return out;
  }
  function computeMutations() {
    const all = [...fns.values()];
    const sets = new Map(all.map((u) => [u.name, syntacticMutations(u)]));
    let changed = true;
    while (changed) {
      changed = false;
      for (const u of all) {
        if (asyncGenerator(u)) continue;
        const params = new Set(u.params.filter((p) => ts.isIdentifier(p.name)).map((p) => p.name.text));
        const walk = (n) => {
          if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) return;
          if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && fns.has(n.expression.text)) {
            const callee = fns.get(n.expression.text); const cm = sets.get(callee.name);
            callee.params.forEach((cp, i) => { if (ts.isIdentifier(cp.name) && cm.has(cp.name.text)) { const a = n.arguments[i]; if (a && ts.isIdentifier(a) && params.has(a.text) && !sets.get(u.name).has(a.text)) { sets.get(u.name).add(a.text); changed = true; } } });
          }
          ts.forEachChild(n, walk);
        };
        walk(u.body);
      }
    }
    for (const u of all) mutatedByUnit.set(u.name, u.params.filter((p) => ts.isIdentifier(p.name) && sets.get(u.name).has(p.name.text)).map((p) => p.name.text));
  }
  const mutatedOf = (u) => mutatedByUnit.get(u.name) ?? [];
  // the final value of a unit: the result, with the world first when effectful, and the mutated parameters after it
  function wrapRet(code) {
    const outs = currentUnit ? mutatedOf(currentUnit).map(dn) : [];
    const parts = [...(unitEffectful() ? [WORLD] : []), outerParens(code), ...outs, ...(currentSlots ? [`${currentSlots.T}(${Array.from({ length: currentSlots.n }, (_, i) => `init${i}_`).join(', ')})`] : [])];
    return parts.length === 1 ? code : `(${parts.join(', ')})`;
  }
  // ----- world fields: a field of `this` that a method of the class assigns, updates, or mutates through a method-call
  // statement lives in the world. Every read is a transition (ext_<C>_get_<f>(wld, self)), every write a transition
  // (ext_<C>_set_<f>(wld, self, v)); the method becomes effectful. A field no method changes stays a pure accessor of self.
  const mutatedByClass = new Map(); // class declaration -> Set of field names
  function mutatedFields(cls) {
    if (mutatedByClass.has(cls)) return mutatedByClass.get(cls);
    const out = new Set(); mutatedByClass.set(cls, out);
    const thisField = (x) => { while (ts.isPropertyAccessExpression(x) && ts.isPropertyAccessExpression(x.expression)) x = x.expression; return ts.isPropertyAccessExpression(x) && x.expression.kind === K.ThisKeyword ? x.name.text : null; };
    const walk = (n) => {
      if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment) { const f = thisField(n.left); if (f) out.add(f); }
      if ((ts.isPostfixUnaryExpression(n) || ts.isPrefixUnaryExpression(n)) && (n.operator === K.PlusPlusToken || n.operator === K.MinusMinusToken)) { const f = thisField(n.operand); if (f) out.add(f); }
      if (ts.isExpressionStatement(n)) { let e = n.expression; while (ts.isParenthesizedExpression(e) || ts.isAwaitExpression(e) || ts.isVoidExpression(e)) e = e.expression; if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && MUTATORS.has(e.expression.name.text)) { const f = thisField(e.expression.expression); if (f) out.add(f); } } // this.items.push(x): the field's contents change; a service call on a field is a transition of the world, not of the field
      if (ts.isDeleteExpression(n)) { let t = n.expression; while (ts.isParenthesizedExpression(t)) t = t.expression; if (ts.isElementAccessExpression(t)) { const f = thisField(t.expression); if (f) out.add(f); } }
      ts.forEachChild(n, walk);
    };
    for (const m of cls.members) if (!ts.isConstructorDeclaration(m)) walk(m);
    return out;
  }
  const isWorldField = (n) => !!(ts.isPropertyAccessExpression(n) && n.expression.kind === K.ThisKeyword && currentUnit?.cls && !accessorOf(n, 'get') && !accessorOf(n, 'set') && !fns.has(`${currentUnit.className}.${n.name.text}`) && (mutatedFields(currentUnit.cls).has(n.name.text) || currentUnit.isCtor)); // in a constructor every field of this is written through the world: that is what the constructor does
  // `a.f` where a is typed by a same-file class and f is a field one of its methods assigns: the field lives in the world
  const isInstanceWorldField = (n) => { if (!ts.isPropertyAccessExpression(n) || n.expression.kind === K.ThisKeyword || n.expression.kind === K.SuperKeyword) return false; let t; try { t = typeOf(n.expression); } catch { return false; } if (isOptional(t)) return false; const cls = sameFileClassOf(t); return !!(cls && !accessorOf(n, 'get') && !accessorOf(n, 'set') && !fns.has(`${cls.name.text}.${n.name.text}`) && mutatedFields(cls).has(n.name.text)); };
  const worldFieldAccessor = (n, kind, extra = []) => { const T = selfType(currentUnit); addPrelude('World', 'type World'); return external(`${T}_${kind}_${n.name.text}`, kind === 'get' ? ['World', T] : ['World', T, ...extra.map((e) => e.d)], kind === 'get' ? `(World, ${extra[0].d})` : '(World, Unit)'); };
  // one logical file is paired by the theorem; declaration fingerprints preserve initializer changes
  function moduleAccessor(n, kind, d) {
    const decl = moduleState(checker, n, sf);
    addPrelude('World', 'type World');
    const tag = hash(decl.getText(sf));
    return external(`Module_file_${kind}_${n.text}_${tag}`, kind === 'get' ? ['World'] : ['World', d], `(World, ${kind === 'get' ? d : 'Unit'})`);
  }
  function globalRead(n) {
    const recv = n.expression;
    const root = outsideRoot(checker, recv, sf, currentUnit?.node);
    const rd = dtype(typeOf(n), n);
    const rt = root ? anyType() : dtype(typeOf(recv), recv);
    const value = root ? `${external(`global_handle_${recv.text}`, [], rt)}()` : expr(recv);
    const key = ts.isPropertyAccessExpression(n) ? strEsc(n.name.text) : expr(n.argumentExpression, anyTarget());
    const kt = ts.isPropertyAccessExpression(n) ? 'string' : anyType();
    addPrelude('World', 'type World');
    return hoist(`${external(`global_get_${mangle(rd)}`, ['World', rt, kt], `(World, ${rd})`)}(${WORLD}, ${value}, ${key})`, rd);
  }
  function hoist(code, rd) {
    // the call text already takes the world first; bind the next world and the result, return the result name
    const t = valueOperands ? valueName() : `t${tempCount++}_`;
    pending.push(`var (${WORLD}, ${t}) := ${code};`);
    if (faultMode) pending.push(FAULT_CHECK);
    return t;
  }
  // run `f` and return its text with the effects it hoisted placed before it
  function capture(f) {
    const saved = pending; pending = [];
    let text;
    try { text = f(); } finally { const h = pending; pending = saved; text = h.length ? `${h.join('\n')}\n${text}` : text; }
    return text;
  }
  function captureParts(f) {
    const saved = pending; pending = [];
    let text, lines;
    try { text = f(); } finally { lines = pending; pending = saved; }
    return { lines, text };
  }
  // a branch with transitions inside, as one Dafny expression of type (World, T): the hoisted lines, then the pair
  function branchWithWorld(f, d) {
    const { lines, text } = captureParts(f);
    const body = `(${WORLD}, ${outerParens(text)})`;
    return lines.length ? `(\n${indentBlock(`${lines.join('\n')}\n${body}`)}\n)` : body;
  }

  // (effectful units are computed after the subset gate, below)
  // ----- prelude registry (shared declarations) -----
  const prelude = new Map(); // name -> text
  const recordByShape = new Map(); // 'a: int, b: string' -> datatype name
  const recordAlias = new Map(); // a name folded into another datatype with the same fields
  const addPrelude = (name, text) => {
    if (name === 'World') {
      usesOption = true;
      if (!prelude.has('WorldHistory')) prelude.set('WorldHistory', 'type WorldHistory');
      if (!prelude.has('Any')) prelude.set('Any', 'type Any(==)');
      text = 'datatype World = World(history: WorldHistory, fault: Option<Any>)';
    }
    if (!prelude.has(name)) prelude.set(name, text); return name;
  };
  let usesOption = false;
  let usesNullish = false;
  const NUM = real ? 'real' : 'int';
  const curUnitName = () => (currentUnit ? dn(snake(currentUnit.name)) : 'g');
  let loopCount = 0;
  const intVars = new Set();
  const fname = (tsName) => (core ? dn(snake(tsName.replace('.', '_'))) + sfx : dn(tsName.replace('.', '_')));
  const SELF = 'self';
  const classOf = (u) => (u && u.cls ? u : null);
  // the receiver's Dafny type: the class instance type, opaque (its methods make it so)
  const selfType = (u) => dtype(checker.getTypeAtLocation(u.cls.name), u.node);
  // ----- same-file classes: an instance built here (`new C(args)`) is a fresh handle from the world; its methods are the
  // file's own units, its fields live in the world (get/set transitions), as for `this` inside the class -----
  const sameFileClassOf = (t) => (t ? classOfType(isOptional(t) ? baseOf(t) : t) : null);
  const classRef = (e) => (ts.isIdentifier(e) && classDecls.has(e.text) && originOf(checker, e, sf, currentUnit?.node ?? null).kind !== 'local' ? classDecls.get(e.text) : null); // the class itself, named (a static call, `new`)
  const classTypeD = (cls) => dtype(checker.getTypeAtLocation(cls.name), cls);
  const fieldAccessor = (Tn, field, kind, d) => { addPrelude('World', 'type World'); return external(`${Tn}_${kind}_${field}`, kind === 'get' ? ['World', Tn] : ['World', Tn, d], kind === 'get' ? `(World, ${d})` : '(World, Unit)'); };

  // ----- types -----
  const isSetT = (t) => !!t.symbol && (t.symbol.name === 'Set' || t.symbol.name === 'ReadonlySet');
  const isMapT = (t) => !!t.symbol && (t.symbol.name === 'Map' || t.symbol.name === 'ReadonlyMap');
  const isPromiseT = (t) => !!t.symbol && t.symbol.name === 'Promise';
  const nonNull = (t) => (t.flags & TF.Union ? t.types.filter((x) => !(x.flags & (TF.Undefined | TF.Null))) : [t]);
  const nonUndefined = (t) => { const parts = nonNull(t); return parts.length === 1 ? parts[0] : t; }; // the type with undefined and null removed, when that leaves one
  const isOptional = (t) => !!(t.flags & TF.Union) && t.types.some((x) => x.flags & (TF.Undefined | TF.Null));
  const isNullish = (t) => !!(t.flags & (TF.Undefined | TF.Null));
  const hasAbsence = (t, flag) => (t.flags & TF.Union ? t.types : [t]).some((x) => x.flags & flag);
  const bothAbsent = (t) => hasAbsence(t, TF.Null) && hasAbsence(t, TF.Undefined);
  const optionalD = (d) => d.startsWith('Option<') || d.startsWith('Nullish<');
  const nullishType = (inner) => { usesNullish = true; usesOption = true; return `Nullish<${inner}>`; };
  const absentType = () => { addPrelude('Absent', 'datatype Absent = Null | Undef'); return 'Absent'; };
  const absentValue = (t) => { absentType(); return t.flags & TF.Null ? 'Absent.Null' : 'Absent.Undef'; };
  const missingD = (d, kind = 'Undef') => d.startsWith('Nullish<') ? `Nullish.${kind}` : 'None';
  const someD = (code, d) => `${d.startsWith('Nullish<') ? 'Nullish.' : ''}Some(${code})`;
  const inputType = (p) => checker.getUnionType([typeOf(p.name), checker.getUndefinedType()]);
  // the type of storage before a flow guard narrows a read
  function storedType(n) {
    while (ts.isParenthesizedExpression(n)) n = n.expression;
    if (ts.isIdentifier(n)) { const o = originOf(checker, n, sf, currentUnit?.node ?? null); if (o.kind === 'local' && o.sym) return symType(o.sym, n); }
    if (ts.isPropertyAccessExpression(n)) { const p = checker.getPropertyOfType(baseOf(typeOf(n.expression)), n.name.text); if (p) return checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? n); }
    return typeOf(n);
  }
  function narrowed(code, declared, here, n) {
    if (isNullish(here)) return absentValue(here);
    if (isOptional(declared) && !isOptional(here)) return `${code}.value`;
    if (bothAbsent(declared) && !bothAbsent(here)) return convert(code, declared, here, n);
    return code;
  }

  const baseOf = (t) => { const p = nonNull(t); if (p.length === 1) return p[0]; if (p.every((x) => x.flags & TF.BooleanLiteral)) return checker.getBooleanType ? checker.getBooleanType() : p[0]; return t; };
  const isCallable = (t) => checker.getSignaturesOfType(t, ts.SignatureKind.Call).length > 0;
  const isAny = (t) => !!(t.flags & (TF.Any | TF.Unknown));
  const isRecordish = (t) => !!(t.flags & (TF.Object | TF.Intersection)) && !isArrayLike(checker, t) && !isSetT(t) && !isMapT(t) && !isPromiseT(t);
  const stringIndex = (t) => (t.flags & TF.Object ? checker.getIndexInfoOfType(t, ts.IndexKind.String) : null);
  const anyType = () => { addPrelude('Any', 'type Any(==)'); return 'Any'; };
  // JSX: an element is a value. JsxElem(tag, props, children): the tag name, the attributes as a string-keyed map of
  // boxed values (including deferred handler values), the children in order. A string child is
  // JsxText; false, null and undefined render nothing; an array child is JsxList.
  const jsxType = () => { anyType(); addPrelude('JsxNode', 'datatype JsxNode = JsxElem(tag: string, props: map<string, Any>, children: seq<JsxNode>) | JsxText(s: string) | JsxNothing | JsxList(items: seq<JsxNode>)'); return 'JsxNode'; };
  const isElementSym = (sym) => { if (!sym) return false; const nm = sym.name; if (!['ReactElement', 'Element', 'ReactPortal', 'JSXElementConstructor'].includes(nm)) return false; if (sym.parent && sym.parent.name === 'JSX') return true; const f = sym.declarations?.[0]?.getSourceFile().fileName ?? ''; return /react|jsx/i.test(f); };
  const isNodeT = (t) => ((t.flags & TF.Union) ? t.types : [t]).some((p) => isElementSym(p.symbol) || (p.aliasSymbol && ['ReactNode', 'ReactElement', 'JSX.Element'].includes(p.aliasSymbol.name)));

  function dtype(t, n, depth = 0) {
    if (depth > 8) fail(n, 'type nesting too deep');
    { const id = n && ts.isIdentifier(n) ? n : n && ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) ? n.name : null; const hb = id && hookBinding(id); if (hb && !hb.field) return hookDatatype(hb.row, NUM).name; } // a name bound to a hook result: the table's datatype, whatever the checker says
    const f = t.flags;
    if (f & (TF.Any | TF.Unknown)) return anyType();
    if (isNodeT(t)) return jsxType();
    if (f & (TF.NumberLike)) return NUM;
    if (f & TF.BigIntLike) return 'int';
    if (f & TF.BooleanLike) return 'bool';
    if (f & TF.StringLike) return 'string';
    if (f & TF.EnumLike) return (t.flags & TF.NumberLike) ? 'int' : 'string';
    if (f & (TF.Undefined | TF.Null)) return absentType();
    if (f & TF.Void) return 'Unit';
    if (f & TF.TypeParameter) { const nm = t.symbol?.name ?? checker.typeToString(t); if (!currentUnit || !(currentUnit.generics ?? []).some((g) => g.name.text === nm)) fail(n, `type parameter ${nm} is not one of this function's`); return dn(nm); }
    if (f & TF.Union) {
      const parts = nonNull(t);
      if (parts.length !== t.types.length) {
        usesOption = true;
        if (!parts.length) return bothAbsent(t) ? nullishType('Unit') : 'Option<Unit>';
        const inner = parts.every((x) => x.flags & TF.BooleanLiteral) ? 'bool' : parts.length === 1 ? dtype(parts[0], n, depth + 1) : unionType(parts, n, depth);
        return bothAbsent(t) ? nullishType(inner) : `Option<${inner}>`;
      }
      return unionType(parts, n, depth);
    }
    if (f & TF.Intersection) return recordType(t, n, depth);
    if (f & TF.Object) {
      if (checker.isTupleType(t)) {
        const ds = checker.getTypeArguments(t).map((a) => dtype(a, n, depth + 1));
        const lit = checker.getTypeArguments(t).every((a) => a.flags & (TF.StringLiteral | TF.NumberLiteral | TF.BooleanLiteral));
        const rest = !!t.target?.hasRestElement;
        const ro = !!t.target?.readonly;
        if (ds.length && (lit || rest || (ro && ds.length >= 2 && !/^(int|real|bool|string|char)$/.test(ds[0]))) && ds.every((d) => d === ds[0])) return `seq<${ds[0]}>`; // a literal list (`as const`), a readonly table or an open tuple [T, ...T[]]: a sequence
        return `(${ds.join(', ')})`;
      }
      if (isArrayLike(checker, t)) { const et = checker.getTypeArguments(t)[0] ?? checker.getIndexTypeOfType(t, ts.IndexKind.Number); if (!et) fail(n, `array-like type ${checker.typeToString(t)} has no element type`); return `seq<${dtype(et, n, depth + 1)}>`; } // arrays, tuples and interfaces that extend an array (a match result)
      if (isSetT(t)) return `set<${dtype(checker.getTypeArguments(t)[0], n, depth + 1)}>`;
      if (isMapT(t)) { const [k, vv] = checker.getTypeArguments(t); return `map<${dtype(k, n, depth + 1)}, ${dtype(vv, n, depth + 1)}>`; }
      if (isPromiseT(t)) return dtype(checker.getTypeArguments(t)[0], n, depth + 1);
      if (isCallable(t)) {
        const sg = checker.getSignaturesOfType(t, ts.SignatureKind.Call)[0];
        const ps = sg.getParameters().map((p) => dtype(checker.getTypeOfSymbolAtLocation(p, n), n, depth + 1));
        let rt = sg.getReturnType(); if (isPromiseT(rt)) rt = checker.getTypeArguments(rt)[0];
        return `(${ps.join(', ')}) -> ${dtype(rt, n, depth + 1)}`;
      }
      const ix = stringIndex(t);
      if (ix && !checker.getPropertiesOfType(t).length) return `map<string, ${dtype(ix.type, n, depth + 1)}>`;
      return recordType(t, n, depth);
    }
    // a type with no value reading of its own: an indexed access on a type parameter, a conditional or mapped form, a
    // symbol, `object`, `never`: opaque, every operation on it an uninterpreted function
    if (f & (TF.IndexedAccess | TF.Conditional | TF.Substitution | TF.TemplateLiteral | TF.StringMapping | TF.Index | TF.ESSymbol | TF.UniqueESSymbol | TF.NonPrimitive | TF.Never)) return anyType();
    return fail(n, `type ${checker.typeToString(t)} is not translatable`);
  }
  // disjoint runtime alternatives retain their member values instead of erasing to Any
  const sums = new Map();
  const opaqueSums = new Set();
  const literalValue = (t) => t.flags & TF.StringLiteral ? JSON.stringify(t.value) : t.flags & TF.NumberLiteral ? (real && Number.isInteger(t.value) ? `${t.value}.0` : String(t.value)) : t.flags & TF.BooleanLiteral ? t.intrinsicName : null;
  const arrayBrand = (t) => checker.isArrayType(t) || checker.isTupleType(t) || t.symbol?.name === 'ReadonlyArray';
  const runtimeTag = (t) => { const f = t.flags; if (f & TF.StringLike) return 'string'; if (f & TF.NumberLike) return 'number'; if (f & TF.BigIntLike) return 'bigint'; if (f & TF.BooleanLike) return 'boolean'; if (f & TF.Undefined) return 'undefined'; if (f & TF.Null) return 'object'; if (f & TF.ESSymbolLike) return 'symbol'; if (f & TF.Object) return isCallable(t) ? 'function' : 'object'; return null; };
  function disjointTags(a, b, n) {
    return checker.getPropertiesOfType(a).some((p) => {
      const q = checker.getPropertyOfType(b, p.name);
      if (!q || (p.flags | q.flags) & ts.SymbolFlags.Optional) return false;
      const x = literalValue(checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? n));
      const y = literalValue(checker.getTypeOfSymbolAtLocation(q, q.valueDeclaration ?? n));
      return x !== null && y !== null && x !== y;
    });
  }
  function sumType(parts, n, depth) {
    if (parts.filter((t) => t.flags & TF.BooleanLike).length > 1) parts = [...parts.filter((t) => !(t.flags & TF.BooleanLike)), checker.getBooleanType()];
    const category = (t) => arrayBrand(t) ? 'array' : t.flags & (TF.StringLike | TF.NumberLike | TF.BooleanLike | TF.BigIntLike) ? runtimeTag(t) : null;
    const records = parts.every(isRecordish) && parts.every((t) => checker.getPropertiesOfType(t).length && !checker.getPropertiesOfType(t).some((p) => isCallable(checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? n))));
    const cats = parts.map(category);
    if (!(records && parts.every((t, i) => parts.slice(i + 1).every((u) => disjointTags(t, u, n)))) && !(cats.every(Boolean) && new Set(cats).size === cats.length)) return null;
    const ordered = [...parts].sort((a, b) => checker.typeToString(a).localeCompare(checker.typeToString(b)));
    const name = `Union_${hash(ordered.map((t) => checker.typeToString(t)).join('|'))}`;
    if (opaqueSums.has(name)) return null;
    if (sums.has(name)) return name;
    // a union whose members cannot be represented keeps its prior opaque reading
    const saved = [prelude, sums, recordAlias, recordByShape].map((m) => new Map(m));
    const optionBefore = usesOption, nullishBefore = usesNullish;
    const restore = () => { [prelude, sums, recordAlias, recordByShape].forEach((m, i) => { m.clear(); for (const [k, v] of saved[i]) m.set(k, v); }); usesOption = optionBefore; usesNullish = nullishBefore; };
    try {
      const members = ordered.map((t, i) => ({ t, ctor: `${name}_${i}`, field: `item${i}`, d: dtype(t, n, depth + 1) }));
      if (opaqueSums.has(name)) { restore(); return null; }
      sums.set(name, members);
      addPrelude(name, `datatype ${name} = ${members.map((m) => `${m.ctor}(${m.field}: ${m.d})`).join(' | ')}`);
      return name;
    } catch (e) {
      if (!(e instanceof Unsupported)) throw e;
      restore(); opaqueSums.add(name); return null;
    }
  }
  function sumCases(code, members, read) {
    const v = `u_${hash(code)}`;
    let out = read(members[members.length - 1], v);
    for (let i = members.length - 2; i >= 0; i--) out = `(if ${v}.${members[i].ctor}? then ${read(members[i], v)} else ${out})`;
    return `(var ${v} := ${code}; ${out})`;
  }
  function sumTruth(code, members) {
    return sumCases(code, members, (m, v) => {
      const value = `${v}.${m.field}`;
      if (m.t.flags & TF.BooleanLike) return value;
      if (m.t.flags & TF.StringLike) return `|${value}| > 0`;
      if (m.t.flags & (TF.NumberLike | TF.BigIntLike)) return `${value} != 0`;
      return 'true';
    });
  }
  // assertions change a static type without establishing a runtime tag
  const assertionWrites = new Map();
  const assertionRoot = (n) => { while (ts.isParenthesizedExpression(n) || ts.isNonNullExpression(n) || ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n)) n = n.expression; return ts.isIdentifier(n) ? checker.getSymbolAtLocation(n) : null; };
  const assertionWrite = (n, value) => { if (ts.isObjectBindingPattern(n) || ts.isArrayBindingPattern(n)) { for (const e of n.elements) if (ts.isBindingElement(e)) assertionWrite(e.name, value); return; } const sym = assertionRoot(n); if (sym) { if (!assertionWrites.has(sym)) assertionWrites.set(sym, []); assertionWrites.get(sym).push(value); } };
  function collectAssertionWrites(n) {
    if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment) assertionWrite(n.left, n.right);
    if (ts.isVariableDeclaration(n) && n.initializer && ts.isIdentifier(n.name) && ts.isIdentifier(n.initializer)) assertionWrite(n.initializer, n.name);
    if (ts.isCallExpression(n)) {
      if (ts.isPropertyAccessExpression(n.expression) && ['push', 'unshift', 'splice', 'set', 'add', 'fill'].includes(n.expression.name.text)) for (const arg of n.arguments) assertionWrite(n.expression.expression, arg);
      if (n.expression.getText(sf) === 'Object.assign' && n.arguments.length >= 2) for (const arg of n.arguments.slice(1)) assertionWrite(n.arguments[0], arg); // the target holds what the sources held
      const callee = checker.getResolvedSignature(n)?.declaration;
      if (callee?.getSourceFile() === sf) for (let i = 0; i < callee.parameters.length; i++) { const p = callee.parameters[i]; for (const arg of p.dotDotDotToken ? n.arguments.slice(i) : n.arguments.slice(i, i + 1)) assertionWrite(p.name, arg); }
    }
    ts.forEachChild(n, collectAssertionWrites);
  }
  collectAssertionWrites(sf);
  function assertionDerived(n, seen = new Set()) {
    if (!n || seen.has(n)) return false;
    seen.add(n);
    if (ts.isAsExpression(n) || ts.isTypeAssertionExpression(n)) return true;
    if (ts.isIdentifier(n)) {
      let sym = checker.getSymbolAtLocation(n);
      if (sym && sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
      if ((assertionWrites.get(sym) ?? []).some((v) => assertionDerived(v, seen))) return true;
      for (let d of sym?.declarations ?? []) {
        if (ts.isBindingElement(d)) { while (d.parent && !ts.isVariableDeclaration(d) && !ts.isParameter(d)) d = d.parent; }
        if (d.initializer && assertionDerived(d.initializer, seen)) return true;
        if (ts.isFunctionLike(d) && d.body) {
          const returnsAssertion = (b) => ts.isReturnStatement(b) ? assertionDerived(b.expression, seen) : ts.isFunctionLike(b) ? false : !!ts.forEachChild(b, returnsAssertion);
          if (ts.isBlock(d.body) ? returnsAssertion(d.body) : assertionDerived(d.body, seen)) return true;
        }
      }
    }
    return !!ts.forEachChild(n, (c) => !ts.isTypeNode(c) && assertionDerived(c, seen));
  }
  function staticTest(node, decide, fallback) {
    const t = typeOf(node), d = dtype(t, node), members = sums.get(d);
    if (assertionDerived(node)) return fallback(expr(node), d);
    if (members) return sumCases(expr(node), members, (m, v) => decide(m.t) ?? fallback(`${v}.${m.field}`, m.d));
    if (isOptional(t) && optionalD(d)) {
      const absent = t.types.filter(isNullish).map((t) => ({ t, value: decide(t) }));
      if (absent.every((a) => a.value !== null)) {
        const v = `test_${hash(node.getText(sf))}`, inner = innerOf(d), choices = sums.get(inner);
        const decisions = nonNull(t).map(decide);
        const known = decisions.length && decisions[0] !== null && decisions.every((x) => x === decisions[0]) ? decisions[0] : null;
        const present = choices ? sumCases(`${v}.value`, choices, (m, u) => decide(m.t) ?? fallback(`${u}.${m.field}`, m.d)) : known ?? fallback(`${v}.value`, inner);
        const missing = d.startsWith('Nullish<') ? `(if ${v}.Null? then ${absent.find((a) => a.t.flags & TF.Null).value} else ${absent.find((a) => a.t.flags & TF.Undefined).value})` : absent[0].value;
        return `(var ${v} := ${expr(node)}; if ${v}.Some? then ${present} else ${missing})`;
      }
    }
    const decisions = t.flags & TF.Union ? t.types.map(decide) : [];
    const decision = decisions.length && decisions[0] !== null && decisions.every((d) => d === decisions[0]) ? decisions[0] : decide(t);
    if (decision !== null) { expr(node); return decision; }
    return fallback(expr(node), d);
  }
  function nominalClass(t) {
    const d = t.symbol?.declarations?.find(ts.isClassDeclaration);
    if (!d) return null;
    const nominal = checker.getPropertiesOfType(t).some((p) => p.declarations?.some((v) => (v.name && ts.isPrivateIdentifier(v.name)) || v.modifiers?.some((m) => m.kind === K.PrivateKeyword || m.kind === K.ProtectedKeyword)));
    return nominal ? d : null;
  }
  function instanceDecision(t, target, n) {
    if (t.flags & (TF.StringLike | TF.NumberLike | TF.BigIntLike | TF.BooleanLike | TF.ESSymbolLike | TF.Null | TF.Undefined)) return 'false';
    if (!nominalClass(t)) return null;
    const ancestry = (a, b) => a.symbol === b.symbol || (a.getBaseTypes?.() ?? []).some((v) => ancestry(v, b));
    if (ancestry(t, target)) return 'true';
    if (ancestry(target, t)) return null;
    return disjointTags(t, target, n) ? 'false' : null;
  }
  function unionType(parts, n, depth) {
    if (parts.every((x) => x.flags & (TF.StringLiteral | TF.StringLike))) return 'string';
    if (parts.every((x) => x.flags & (TF.NumberLiteral | TF.NumberLike))) return NUM;
    if (parts.every((x) => x.flags & TF.BooleanLike)) return 'bool';
    if (parts.some(isAny)) return anyType();
    const sum = sumType(parts, n, depth); if (sum) return sum;
    // overlapping unions and unions without a runtime discriminator stay opaque. Every read on it is an
    // uninterpreted accessor, every construction an uninterpreted injection; the proof asks the same calls on both sides
    if (parts.every((x) => isRecordish(x) || isArrayLike(checker, x) || isSetT(x) || isMapT(x) || isPromiseT(x) || !!(x.flags & (TF.StringLike | TF.NumberLike | TF.BooleanLike | TF.EnumLike | TF.Null | TF.Undefined | TF.Void | TF.TypeParameter | TF.IndexedAccess | TF.Conditional | TF.Index | TF.NonPrimitive | TF.Never)))) return anyType();
    return fail(n, `union type ${parts.map((x) => checker.typeToString(x)).join(' | ')} is not translatable`);
  }
  const typeNameOf = (t) => t.aliasSymbol?.name ?? (t.symbol && t.symbol.name !== '__type' && t.symbol.name !== '__object' ? t.symbol.name : null);
  function recordType(t, n, depth) {
    const props = checker.getPropertiesOfType(t);
    const hasMethods = props.some((p) => isCallable(checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? n)));
    let name = typeNameOf(t);
    if (name && /^(Pick|Omit|Partial|Required|Readonly|Record|__type|__object|type|default)$/.test(name)) name = null;
    if ((hasMethods && !literalRecord(t)) || !props.length || t.symbol?.declarations?.some((d) => ts.isClassDeclaration(d) && d.members.some((m) => ts.isGetAccessorDeclaration(m) || ts.isSetAccessorDeclaration(m)))) {
      // opaque: values pass through untouched; reads become accessor externals
      const base = mangle(name ?? checker.typeToString(t));
      name = `Ext_${base || 'T' + hash(checker.typeToString(t))}`;
      addPrelude(name, `type ${name}`);
      return name;
    }
    const fields = props.map((p) => ({ name: p.name, type: checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? n), optional: !!(p.flags & ts.SymbolFlags.Optional) })).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    if (t.symbol?.declarations?.some((d) => ts.isBindingElement(d) && d.dotDotDotToken)) name = `Rest_${hash(fields.map((f) => `${f.name}:${checker.typeToString(f.type)}`).join(','))}`;
    if (literalRecord(t)) name = `Literal_${hash(fields.map((f) => f.name + ':' + checker.typeToString(f.type)).join(','))}`;
    if (!name) name = `Rec_${hash(fields.map((f) => f.name).join(','))}`;
    name = dn(mangle(name));
    if (recordAlias.has(name)) return recordAlias.get(name);
    const key = `datatype ${name}`;
    if (!prelude.has(key)) {
      prelude.set(key, ''); // reserve for nested use
      const fs_ = fields.map((f) => {
        let d = dtype(f.type, n, depth + 1);
        if (literalRecord(t)?.properties.some((p) => ts.isGetAccessorDeclaration(p) && p.name.text === f.name)) d = `() -> ${d}`;
        if (f.optional && !optionalD(d)) { usesOption = true; d = `Option<${d}>`; }
        return `${dn(f.name)}: ${d}`;
      });
      // two types with the same fields are one datatype: a structural literal is an Account when Account has its fields
      const shape = fs_.join(', ');
      const canon = recordByShape.get(shape);
      if (canon && canon !== name && prelude.get(key) === '') { prelude.delete(key); recordAlias.set(name, canon); return canon; }
      recordByShape.set(shape, name);
      prelude.set(key, `datatype ${name} = ${name}(${shape})`);
    }
    return name;
  }
  // two explicit operands read with the type the program gives them, not the `any` the checker reports: `arguments[k]`
  // with a literal k below the declared parameters is the k-th parameter; `Object.create(null)` typed as a dictionary
  // (a string index and no declared field) is the empty dictionary
  const argumentsParam = (n) => { if (!(ts.isElementAccessExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'arguments' && ts.isNumericLiteral(n.argumentExpression) && currentUnit && currentUnit.params)) return null; if (originOf(checker, n.expression, sf, currentUnit.node ?? null).kind !== 'global') return null; const k = Number(n.argumentExpression.text); const ps = currentUnit.params.filter((p) => !(ts.isIdentifier(p.name) && p.name.text === 'this')); const q = ps[k]; return Number.isInteger(k) && q && ts.isIdentifier(q.name) && !q.dotDotDotToken && !q.questionToken && !q.initializer && !ps.slice(0, k).some((x) => x.dotDotDotToken) ? q : null; };
  const isNullCreate = (n) => ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === 'Object' && n.expression.name.text === 'create' && n.arguments.length === 1 && n.arguments[0].kind === K.NullKeyword && originOf(checker, n.expression.expression, sf, currentUnit?.node ?? null).kind === 'global';
  const dictionaryT = (t) => !!t && !!(t.flags & TF.Object) && !!checker.getIndexInfoOfType(t, ts.IndexKind.String) && checker.getPropertiesOfType(t).length === 0;
  // the hook table (moonshot 8): a listed library hook call is a transition of the world returning the table's record;
  // the names bound to its result (a variable, a destructured field) carry the fields' kinds, which the type reading
  // below answers where the checker says any
  const hookBound = new Map(); // symbol -> { row, field | null }
  const hookResultOf = new Map(); // call node -> row
  { const walk = (n) => { if (ts.isVariableDeclaration(n) && n.initializer) { let init = n.initializer; while (ts.isParenthesizedExpression(init) || ts.isAsExpression(init) || ts.isNonNullExpression(init)) init = init.expression; const h = libraryHook(checker, init); if (h) { hookResultOf.set(init, h.row); if (ts.isIdentifier(n.name)) { const sy = checker.getSymbolAtLocation(n.name); if (sy) hookBound.set(sy, { row: h.row, field: null }); } else if (ts.isObjectBindingPattern(n.name)) for (const el of n.name.elements) { if (!ts.isIdentifier(el.name) || el.dotDotDotToken) continue; const prop = el.propertyName ? el.propertyName.getText(sf) : el.name.text; const sy = checker.getSymbolAtLocation(el.name); if (sy && Object.hasOwn(h.row.result, prop)) hookBound.set(sy, { row: h.row, field: prop }); } } } ts.forEachChild(n, walk); }; walk(sf); }
  const hookTsType = (row, field) => { const k = fieldKind(row.result[field] ?? ''); return k === 'boolean' ? checker.getBooleanType() : k === 'string' ? checker.getStringType() : k === 'number' ? checker.getNumberType() : null; };
  const hookBinding = (n) => { if (!ts.isIdentifier(n)) return null; const sy = checker.getSymbolAtLocation(n); return sy && hookBound.get(sy) || null; };
  const hookType = (n) => { // the table's type for a name bound to a hook result, or a field read on one
    const b = hookBinding(n); if (b && b.field) return hookTsType(b.row, b.field);
    if (ts.isPropertyAccessExpression(n)) { const rb = hookBinding(n.expression); if (rb && !rb.field && Object.hasOwn(rb.row.result, n.name.text)) return hookTsType(rb.row, n.name.text); }
    return null;
  };
  const anyRetype = (n) => { // an any-typed expression whose operands the program types (an `arguments[k]` read among them): typed by its operator
    const anyT = (t) => !!(t.flags & (TF.Any | TF.Unknown));
    if (ts.isParenthesizedExpression(n)) return typeOf(n.expression);
    if (ts.isBinaryExpression(n)) {
      const op = n.operatorToken.kind; const L = typeOf(n.left), R = typeOf(n.right); if (anyT(L) || anyT(R)) return null;
      if ([K.LessThanToken, K.LessThanEqualsToken, K.GreaterThanToken, K.GreaterThanEqualsToken, K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.EqualsEqualsToken, K.ExclamationEqualsToken].includes(op)) return checker.getBooleanType();
      if (op === K.PlusToken) return (L.flags & TF.StringLike) || (R.flags & TF.StringLike) ? checker.getStringType() : (L.flags & TF.NumberLike) && (R.flags & TF.NumberLike) ? checker.getNumberType() : null;
      if ([K.MinusToken, K.AsteriskToken, K.SlashToken, K.PercentToken, K.AsteriskAsteriskToken].includes(op)) return (L.flags & TF.NumberLike) && (R.flags & TF.NumberLike) ? checker.getNumberType() : null;
      return null;
    }
    if (ts.isPrefixUnaryExpression(n)) { const T = typeOf(n.operand); if (anyT(T)) return null; if (n.operator === K.ExclamationToken) return checker.getBooleanType(); if (n.operator === K.MinusToken || n.operator === K.PlusToken) return (T.flags & TF.NumberLike) ? checker.getNumberType() : null; }
    return null;
  };
  const typeOf = (n) => { const u = generators.pureCall(n); if (u) return checker.createArrayType(generators.shape(u).element); const q = argumentsParam(n); if (q) return checker.getTypeAtLocation(q.name); if (isNullCreate(n)) { const ct = checker.getContextualType(n); if (dictionaryT(ct)) return ct; } const t = checker.getTypeAtLocation(n); if (t.flags & TF.Any) { const ht = hookType(n); if (ht) return ht; const r = anyRetype(n); if (r) return r; } return t; };
  if (heapT && heap) heapT.plan(order, heapUnits); // after the type reading it relies on exists
  const anyTarget = () => checker.getAnyType();
  const symType = (sym, n) => (checker.getTypeOfSymbol ? checker.getTypeOfSymbol(sym) : checker.getTypeOfSymbolAtLocation(sym, sym.valueDeclaration ?? n));

  // ----- externals -----
  const unitTParams = () => (currentUnit?.generics ?? []).map((g) => dn(g.name.text));
  const tclause = (types) => { const ps = unitTParams().filter((p) => types.some((t) => new RegExp(`\\b${p}\\b`).test(t))); return ps.length ? `<${ps.map((p) => `${p}(==)`).join(', ')}>` : ''; };
  function external(name, paramTypes, retType) {
    const id = `ext_${mangle(name)}${paramTypes.length ? '_' + paramTypes.map(mangle).join('_') : ''}`;
    const ps = paramTypes.map((t, i) => `a${i}: ${t}`).join(', ');
    addPrelude(id, `function ${id}${tclause([...paramTypes, retType])}(${ps}): ${retType}`); // generic when a type parameter of the unit appears
    return id;
  }
  function externalValue(id) {
    const t = typeOf(id);
    if (isCallable(t)) fail(id, `${id.text} is a function value; call it`);
    const rt = dtype(t, id);
    return `${external(id.text, [], rt)}()`;
  }
  function externalCall(calleeName, n, args, recvCode = null, recvType = null, eff = null, cond = null) {
    const isEff = eff ?? isEffectCall(n);
    if (isEff && !unitEffectful()) fail(n, `internal: an effect in a unit not marked effectful (${calleeName})`);
    const sig = checker.getResolvedSignature(n);
    const params = sig ? sig.getParameters() : [];
    const loose = !sig || (recvType === 'Any');
    const ptype = (a, i) => {
      const p = params[Math.min(i, params.length - 1)]; if (loose || !p) return undefined;
      if (ts.isObjectLiteralExpression(a)) return typeOf(a); // a literal argument is typed by its own fields, not by a generic parameter's instantiation
      let t = checker.getTypeOfSymbolAtLocation(p, a);
      const decl = p.valueDeclaration;
      if (decl && ts.isParameter(decl) && decl.dotDotDotToken && (checker.isArrayType(t) || checker.isTupleType(t))) t = checker.getTypeArguments(t)[0] ?? t; // a rest parameter: each extra argument has the element type
      return isAny(t) && !isAny(typeOf(a)) ? typeOf(a) : t;
    };
    const spread = args.some(ts.isSpreadElement);
    if (spread && recvCode !== null) { const v = `sr${tempCount++}_`; pending.push(`var ${v}: ${recvType} := ${recvCode};`); recvCode = v; }
    // an outside method is looked up before its arguments; a throwing argument still observes that lookup
    if (faultMode && isEff && ts.isPropertyAccessExpression(n.expression)) {
      const ps = ['World', ...(recvCode !== null ? [recvType] : [])];
      const args = [WORLD, ...(recvCode !== null ? [recvCode] : [])];
      const lookup = `${external(`lookup_${calleeName}`, ps, '(World, Unit)')}(${args.join(', ')})`;
      hoist(cond ? `(if ${cond} then ${lookup} else (${WORLD}, Unit))` : lookup, 'Unit');
    }
    const sequence = spread ? callSequence(args) : null;
    const pts = spread ? [sequence.type] : args.map((a, i) => { const t = ptype(a, i); return t ? dtype(t, a) : dtype(typeOf(a), a); });
    let rt = sig ? sig.getReturnType() : typeOf(n);
    if (isPromiseT(rt)) rt = checker.getTypeArguments(rt)[0];
    else if (calleeName.startsWith('await_') || calleeName.includes('await_')) { const aw = checker.getAwaitedType ? checker.getAwaitedType(rt) : null; if (aw) rt = aw; }
    let rd = dtype(rt, n);
    const chainedType = cond ? typeOf(n) : null; // the signature result excludes absence introduced by the call chain
    calleeName = `${spread ? 'call_seq' : 'call_args'}_${calleeName}`; // disjoint call forms: f(...xs) never collides with a function named f_seq(xs)
    const codes = spread ? [sequence.code] : args.map((a, i) => (reactHook(checker, n) === 'useEffect' && i === 0 && ts.isArrowFunction(a)) ? opaqueFn(a) : (ts.isArrowFunction(a) || ts.isFunctionExpression(a)) ? (ts.isArrowFunction(a) ? lambda(a, a.parameters.length, [], true) : opaqueFn(a)) : (ts.isIdentifier(a) && a.text === 'undefined' && pts[i] === 'Unit') ? 'Unit' : expr(a, ptype(a, i)));
    if (!isEff) {
      let code;
      if (recvCode !== null) { const id = external(calleeName, [recvType, ...pts], rd); code = `${id}(${[recvCode, ...codes].join(', ')})`; }
      else { const id = external(calleeName, pts, rd); code = `${id}(${codes.join(', ')})`; }
      if (cond) { usesOption = true; return `(if ${cond} then ${convert(code, rt, chainedType, n)} else ${missingD(dtype(chainedType, n))})`; } // an optional call: the value when the receiver is present
      return code;
    }
    addPrelude('World', 'type World');
    const ptsW = recvCode !== null ? ['World', recvType, ...pts] : ['World', ...pts];
    const argsW = recvCode !== null ? [WORLD, recvCode, ...codes] : [WORLD, ...codes];
    const id = external(calleeName, ptsW, `(World, ${rd})`);
    if (cond) { usesOption = true; const w = `w${tempCount}_`, x = `x${tempCount}_`, D = dtype(chainedType, n); return hoist(`(if ${cond} then (var (${w}, ${x}) := ${id}(${argsW.join(', ')}); (${w}, ${convert(x, rt, chainedType, n)})) else (${WORLD}, ${missingD(D)}))`, D); } // an optional call: the transition happens only when the receiver is present
    return hoist(`${id}(${argsW.join(', ')})`, rd);
  }

  // a call's complete argument list: spread segments and singleton values in source order
  function callSequence(args, element = null) {
    const flatten = (a) => ts.isSpreadElement(a) && ts.isArrayLiteralExpression(a.expression) ? a.expression.elements.flatMap(flatten) : [a];
    args = args.flatMap(flatten);
    const types = args.map((a) => {
      if (!ts.isSpreadElement(a)) return typeOf(a);
      const t = typeOf(a.expression);
      if (!checker.isArrayType(t)) fail(a, 'spread arguments need an ordinary array');
      return checker.getTypeArguments(t)[0];
    });
    const ds = types.map((t, i) => dtype(t, args[i]));
    const A = element ?? (ds.length && ds.every((d) => d === ds[0]) ? ds[0] : anyType());
    const pieces = args.map((a, i) => captureParts(() => {
      let code;
      if (ts.isSpreadElement(a)) {
        code = seqOf(a.expression);
        if (ds[i] !== A) {
          const v = `sa${tempCount++}_`;
          code = `(var ${v} := ${code}; seq(|${v}|, (i: int) requires 0 <= i < |${v}| => ${convertToD(`${v}[i]`, types[i], A, a)}))`;
        }
      } else { const raw = expr(a); const value = convertToD(raw, types[i], A, a); code = `[${value}]`; }
      return code;
    }));
    // a later argument can rebind a parameter via a same-file call; freeze earlier values first
    const snapshots = args.length > 1 && pieces.slice(1).some((p) => p.lines.length); // one argument, or no later argument with a transition, needs no freezing
    const parts = pieces.map(({ lines, text }) => {
      pending.push(...lines);
      if (!snapshots) return text;
      const v = `sa${tempCount++}_`; pending.push(`var ${v}: seq<${A}> := ${text};`); return v;
    });
    return { type: `seq<${A}>`, code: parts.length === 1 ? parts[0] : parts.length ? `(${parts.join(' + ')})` : `([] : seq<${A}>)` }; // a single piece keeps its own text, so `out.push(v)` reads as `out + [v]`, the same as a collecting loop
  }

  // ----- prelude helpers with bodies -----
  function helper(kind, types) {
    const name = `${kind}_${types.map(mangle).join('_')}`;
    if (prelude.has(name)) return name;
    const [A, B] = types;
    let text;
    switch (kind) {
      case 'Filter': text = `function ${name}(s: seq<${A}>, p: ${A} -> bool): (r: seq<${A}>)
  ensures |r| <= |s|
  ensures forall i :: 0 <= i < |r| ==> p(r[i])
  decreases |s|
{ if |s| == 0 then [] else (if p(s[0]) then [s[0]] else []) + ${name}(s[1..], p) }`; break;
      case 'MapIdx': text = `function ${name}(s: seq<${A}>, f: (${A}, int) -> ${B}, i: int): (r: seq<${B}>)
  ensures |r| == |s|
  decreases |s|
{ if |s| == 0 then [] else [f(s[0], i)] + ${name}(s[1..], f, i + 1) }`; break;
      case 'FilterIdx': text = `function ${name}(s: seq<${A}>, p: (${A}, int) -> bool, i: int): (r: seq<${A}>)
  decreases |s|
{ if |s| == 0 then [] else (if p(s[0], i) then [s[0]] else []) + ${name}(s[1..], p, i + 1) }`; break;
      case 'FindIdx': usesOption = true; text = `function ${name}(s: seq<${A}>, p: (${A}, int) -> bool, i: int): Option<${A}>
  decreases |s|
{ if |s| == 0 then None else if p(s[0], i) then Some(s[0]) else ${name}(s[1..], p, i + 1) }`; break;
      case 'FindIndexIdx': text = `function ${name}(s: seq<${A}>, p: (${A}, int) -> bool, i: int): int
  decreases |s|
{ if |s| == 0 then -1 else if p(s[0], i) then i else ${name}(s[1..], p, i + 1) }`; break;
      case 'Map': text = `function ${name}(s: seq<${A}>, f: ${A} -> ${B}): (r: seq<${B}>)
  ensures |r| == |s|
  ensures forall i :: 0 <= i < |s| ==> r[i] == f(s[i])
  decreases |s|
{ if |s| == 0 then [] else [f(s[0])] + ${name}(s[1..], f) }`; break;
      case 'Fold': text = `function ${name}(s: seq<${A}>, f: (${B}, ${A}) -> ${B}, init: ${B}): ${B}
  decreases |s|
{ if |s| == 0 then init else ${name}(s[1..], f, f(init, s[0])) }`; break;
      case 'Find': usesOption = true; text = `function ${name}(s: seq<${A}>, p: ${A} -> bool): Option<${A}>
  decreases |s|
{ if |s| == 0 then None else if p(s[0]) then Some(s[0]) else ${name}(s[1..], p) }`; break;
      case 'FindIndex': text = `function ${name}(s: seq<${A}>, p: ${A} -> bool): int
  decreases |s|
{ if |s| == 0 then -1 else if p(s[0]) then 0 else (var r := ${name}(s[1..], p); if r < 0 then -1 else r + 1) }`; break;
      case 'IndexOf': text = `function ${name}(s: seq<${A}>, x: ${A}): int
  decreases |s|
{ if |s| == 0 then -1 else if s[0] == x then 0 else (var r := ${name}(s[1..], x); if r < 0 then -1 else r + 1) }`; break;
      case 'Slice': text = `function ${name}(s: seq<${A}>, a: int, b: int): seq<${A}>
{ var n := |s|; var lo := if a < 0 then (if n + a < 0 then 0 else n + a) else (if a > n then n else a);
  var hi := if b < 0 then (if n + b < 0 then 0 else n + b) else (if b > n then n else b);
  if lo < hi then s[lo..hi] else [] }`; break;
      case 'At': usesOption = true; text = `function ${name}(s: seq<${A}>, i: int): Option<${A}>
{ var j := if i < 0 then |s| + i else i; if 0 <= j < |s| then Some(s[j]) else None }`; break;
      case 'Join': text = `function ${name}(s: seq<string>, sep: string): string
  decreases |s|
{ if |s| == 0 then "" else if |s| == 1 then s[0] else s[0] + sep + ${name}(s[1..], sep) }`; break;
      case 'Flat': text = `function ${name}(s: seq<seq<${A}>>): seq<${A}>
  decreases |s|
{ if |s| == 0 then [] else s[0] + ${name}(s[1..]) }`; break;
      case 'StrSpace': text = `function ${name}(c: char): bool
{ var n := c as int; 9 <= n <= 13 || n in {32, 160, 5760, 8232, 8233, 8239, 8287, 12288, 65279} || 8192 <= n <= 8202 }`; break;
      case 'TrimStart': text = `function ${name}(s: string): string decreases |s|
{ if |s| > 0 && ${helper('StrSpace', ['char'])}(s[0]) then ${name}(s[1..]) else s }`; break;
      case 'TrimEnd': text = `function ${name}(s: string): string decreases |s|
{ if |s| > 0 && ${helper('StrSpace', ['char'])}(s[|s| - 1]) then ${name}(s[..|s| - 1]) else s }`; break;
      case 'Trim': text = `function ${name}(s: string): string
{ ${helper('TrimEnd', ['string'])}(${helper('TrimStart', ['string'])}(s)) }`; break;
      case 'IsAscii': text = `function ${name}(s: string): bool
{ forall c :: c in s ==> (c as int) < 128 }`; break;
      case 'AsciiLower': case 'AsciiUpper': {
        const lower = kind === 'AsciiLower';
        text = `function ${name}(s: string): string decreases |s|
{ if |s| == 0 then "" else [if '${lower ? 'A' : 'a'}' <= s[0] <= '${lower ? 'Z' : 'z'}' then ((s[0] as int) ${lower ? '+' : '-'} 32) as char else s[0]] + ${name}(s[1..]) }`; break;
      }
      case 'Lower': case 'Upper': text = `function ${name}(s: string): string
{ if ${helper('IsAscii', ['string'])}(s) then ${helper(kind === 'Lower' ? 'AsciiLower' : 'AsciiUpper', ['string'])}(s) else ${external(kind === 'Lower' ? 'str_toLowerCase' : 'str_toUpperCase', ['string'], 'string')}(s) }`; break;
      case 'StrLt': text = `function ${name}(s: string, t: string): bool decreases |s| + |t|
{ if |t| == 0 then false else if |s| == 0 then true else if s[0] == t[0] then ${name}(s[1..], t[1..]) else (s[0] as int) < (t[0] as int) }`; break;
      case 'StrClamp': text = `function ${name}(p: int, n: nat): (r: nat)
  ensures r <= n
{ if p < 0 then 0 else if p > n then n else p }`; break;
      case 'StrFind': text = `function ${name}(s: string, t: string, p: nat): (r: int)
  ensures r == -1 || p <= r <= |s| - |t|
  decreases |s| - p
{ if p + |t| > |s| then -1 else if s[p..p + |t|] == t then p else ${name}(s, t, p + 1) }`; break;
      case 'StrLast': text = `function ${name}(s: string, t: string, p: int): (r: int)
  requires p <= |s|
  ensures r == -1 || (0 <= r <= p && r + |t| <= |s|)
  decreases p
{ if p < 0 then -1 else if p + |t| <= |s| && s[p..p + |t|] == t then p else ${name}(s, t, p - 1) }`; break;
      case 'StrEnds': text = `function ${name}(s: string, t: string, p: int): bool
{ var e := ${helper('StrClamp', ['int'])}(p, |s|); |t| <= e && s[e - |t|..e] == t }`; break;
      case 'StrSplit': text = `function ${name}(s: string, sep: string): seq<string> decreases |s|
{ if |sep| == 0 then seq(|s|, (i: int) requires 0 <= i < |s| => [s[i]])
  else var p := ${helper('StrFind', ['string'])}(s, sep, 0);
    if p < 0 then [s] else [s[..p]] + ${name}(s[p + |sep|..], sep) }`; break;
      case 'PadFill': text = `function ${name}(pad: string, n: nat): (r: string)
  requires |pad| > 0
  ensures |r| == n
{ seq(n, (i: int) requires 0 <= i < n => pad[i % |pad|]) }`; break;
      case 'PadStart': case 'PadEnd': {
        const fill = `${helper('PadFill', ['string'])}(pad, target - |s|)`;
        text = `function ${name}(s: string, n: int, pad: string): string
{ var target := if n > 9007199254740991 then 9007199254740991 else n; if target <= |s| || |pad| == 0 then s else ${kind === 'PadStart' ? `${fill} + s` : `s + ${fill}`} }`; break;
      }
      case 'StrSubstitution': text = `function ${name}(s: string, p: nat, width: nat, r: string): string
  requires p + width <= |s|
  decreases |r|
{ if |r| == 0 then "" else if |r| >= 2 && r[0] == '$' && (r[1] as int) in {36, 38, 96, 39} then
    (if r[1] == '$' then "$" else if r[1] == '&' then s[p..p + width] else if (r[1] as int) == 96 then s[..p] else s[p + width..]) + ${name}(s, p, width, r[2..])
  else [r[0]] + ${name}(s, p, width, r[1..]) }`; break;
      case 'StrReplace': text = `function ${name}(s: string, pat: string, r: string, start: nat, all: bool): string
  requires start <= |s|
  decreases |s| - start
{ var p := ${helper('StrFind', ['string'])}(s, pat, start); if p < 0 then s[start..] else s[start..p] + ${helper('StrSubstitution', ['string'])}(s, p, |pat|, r) + (if !all then s[p + |pat|..] else if |pat| > 0 then ${name}(s, pat, r, p + |pat|, all) else if p == |s| then "" else [s[p]] + ${name}(s, pat, r, p + 1, all)) }`; break;
      case 'StrSubstring': text = `function ${name}(s: string, a: int, b: int): string
{ var lo := ${helper('StrClamp', ['int'])}(a, |s|); var hi := ${helper('StrClamp', ['int'])}(b, |s|);
  if lo <= hi then s[lo..hi] else s[hi..lo] }`; break;
      case 'StrCharAt': text = `function ${name}(s: string, p: int): string
{ if 0 <= p < |s| then [s[p]] else "" }`; break;
      case 'StrAt': usesOption = true; text = `function ${name}(s: string, p: int): Option<string>
{ var i := if p < 0 then |s| + p else p; if 0 <= i < |s| then Some([s[i]]) else None }`; break;
      case 'Includes': text = `function ${name}(s: string, t: string): bool
{ exists i :: 0 <= i <= |s| - |t| && s[i..i + |t|] == t }`; break;
      case 'IndexOfStr': text = `function ${name}(s: string, t: string): int
{ if exists i :: 0 <= i <= |s| - |t| && s[i..i + |t|] == t then (var i :| 0 <= i <= |s| - |t| && s[i..i + |t|] == t && forall j :: 0 <= j < i ==> s[j..j + |t|] != t; i) else -1 }`; break;
      case 'FloorDiv': text = `function ${name}(a: int, b: int): int
  requires b != 0
{ var q := ${helper('TruncDiv', ['int'])}(a, b); if a - b * q != 0 && (a < 0) != (b < 0) then q - 1 else q }`; break;
      case 'TruncDiv': text = `function ${name}(a: int, b: int): int
  requires b != 0
{ var q := (if a >= 0 then a else -a) / (if b >= 0 then b else -b); if (a >= 0) == (b >= 0) then q else -q }`; break;
      case 'JsRem': text = `function ${name}(a: int, b: int): int
  requires b != 0
{ a - b * ${helper('TruncDiv', ['int'])}(a, b) }`; break;
      case 'JsTrunc': text = `function ${name}(a: real): int
{ if a < 0.0 then -(-a).Floor else a.Floor }`; break;
      case 'JsRealRem': text = `function ${name}(a: real, b: real): real
  requires b != 0.0
{ a - b * (${helper('JsTrunc', ['real'])}(a / b) as real) }`; break;
      case 'JsUint32': text = `function ${name}(a: ${A}): bv32
{ ((${A === 'real' ? `${helper('JsTrunc', ['real'])}(a)` : 'a'}) % 4294967296) as bv32 }`; break;
      case 'JsSigned': text = `function ${name}(a: bv32): int
{ var u := a as int; if u < 2147483648 then u else u - 4294967296 }`; break;
      case 'JsInt32': text = `function ${name}(a: ${A}): ${A}
{ ${helper('JsSigned', ['bv32'])}(${helper('JsUint32', [A])}(a))${A === 'real' ? ' as real' : ''} }`; break;
      case 'JsBitAnd': case 'JsBitOr': case 'JsBitXor': case 'JsBitNot': case 'JsShl': case 'JsShr': case 'JsUshr': {
        const uint = helper('JsUint32', [A]), signed = helper('JsSigned', ['bv32']);
        const op = { JsBitAnd: '&', JsBitOr: '|', JsBitXor: '^' }[kind];
        const value = op ? `(u ${op} v)` : kind === 'JsBitNot' ? '(!u)' : kind === 'JsShl' ? '(u << k)' : kind === 'JsUshr' ? '(u >> k)' : '(if u < (2147483648 as bv32) then u >> k else !((!u) >> k))';
        const result = kind === 'JsUshr' ? `(${value} as int)` : `${signed}(${value})`;
        text = `function ${name}(a: ${A}${kind === 'JsBitNot' ? '' : `, b: ${A}`}): ${A}
{ var u := ${uint}(a); ${kind === 'JsBitNot' ? '' : op ? `var v := ${uint}(b); ` : `var k := (${uint}(b) as int) % 32; `}${result}${A === 'real' ? ' as real' : ''} }`; break;
      }
      case 'JsCeil': case 'JsRound': case 'JsSign': {
        const zero = A === 'real' ? '0.0' : '0', one = A === 'real' ? '1.0' : '1';
        const value = kind === 'JsSign' ? `if a < ${zero} then -${one} else if a > ${zero} then ${one} else ${zero}` : A === 'int' ? 'a' : kind === 'JsCeil' ? '(-(-a).Floor) as real' : '((a + 0.5).Floor as real)';
        text = `function ${name}(a: ${A}): ${A} { ${value} }`; break;
      }
      case 'MinSeq': case 'MaxSeq': text = `function ${name}(s: seq<${A}>): ${A}
  requires |s| > 0
  decreases |s|
{ if |s| == 1 then s[0] else ${helper(kind === 'MinSeq' ? 'Min' : 'Max', [A])}(s[0], ${name}(s[1..])) }`; break;
      case 'Min': text = `function ${name}(a: ${A}, b: ${A}): ${A} { if a < b then a else b }`; break;
      case 'Max': text = `function ${name}(a: ${A}, b: ${A}): ${A} { if a > b then a else b }`; break;
      case 'Abs': text = `function ${name}(a: ${A}): ${A} { if a < ${A === 'real' ? '0.0' : '0'} then -a else a }`; break;
      case 'SetOf': text = `function ${name}(s: seq<${A}>): set<${A}> { set x | x in s }`; break;
      case 'Repeat': text = `function ${name}(s: string, n: int): string decreases n { if n <= 0 then "" else s + ${name}(s, n - 1) }`; break;
      case 'Reverse': text = `function ${name}(s: seq<${A}>): seq<${A}> decreases |s| { if |s| == 0 then [] else ${name}(s[1..]) + [s[0]] }`; break;
      default: fail(sf, `no helper ${kind}`);
    }
    prelude.set(name, text);
    return name;
  }

  // ----- literals / coercion -----
  function numLit(text, n) {
    const v = Number(text);
    if (!Number.isFinite(v)) fail(n, 'number-special: a non-finite literal needs the opaque numeric reading');
    if (Number.isInteger(v)) return BigInt(v).toString() + (real ? '.0' : '');
    if (!real) fail(n, `number literal ${text} is not an integer; use --real`);
    const [mantissa, exponent] = String(v).split('e');
    if (exponent === undefined) return mantissa;
    const digits = mantissa.replace('.', ''), point = (mantissa.indexOf('.') < 0 ? mantissa.length : mantissa.indexOf('.')) + Number(exponent);
    return point <= 0 ? '0.' + '0'.repeat(-point) + digits : point >= digits.length ? digits + '0'.repeat(point - digits.length) + '.0' : digits.slice(0, point) + '.' + digits.slice(point);
  }
  function numberOf(n) {
    const t = typeOf(n), code = expr(n);
    if (t.flags & TF.NumberLike) return code;
    if (t.flags & TF.BooleanLike) return `(if ${code} then ${real ? '1.0' : '1'} else ${real ? '0.0' : '0'})`;
    return `${external('number_of', [dtype(t, n)], NUM)}(${code})`;
  }
  const outerParens = (s) => {
    if (!s.startsWith('(') || !s.endsWith(')')) return s;
    let d = 0;
    for (let i = 0; i < s.length; i++) { if (s[i] === '(') d++; else if (s[i] === ')') d--; if (d === 0 && i < s.length - 1) return s; }
    if (/^\(map\[\] : /.test(s) || /^\(var \w+: set</.test(s)) return s; // a typed empty literal keeps its parentheses
    return s.slice(1, -1);
  };
  const isLiteralish = (node) => { while (ts.isParenthesizedExpression(node)) node = node.expression; return ts.isArrayLiteralExpression(node) || ts.isObjectLiteralExpression(node) || ts.isNumericLiteral(node) || ts.isStringLiteral(node) || ts.isTemplateExpression(node) || ts.isNoSubstitutionTemplateLiteral(node) || node.kind === K.TrueKeyword || node.kind === K.FalseKeyword; };
  function coerce(code, node, expected) {
    if (!expected) return code;
    const sourceT = typeOf(node), nt = isPromiseT(sourceT) ? promiseResultType(node) : sourceT;
    const members = sums.get(dtype(expected, node));
    if (members && dtype(nt, node) !== dtype(expected, node)) {
      const matches = members.filter((m) => checker.isTypeAssignableTo(nt, m.t));
      if (matches.length === 1) { const m = matches[0]; return `${m.ctor}(${convertD(code, dtype(nt, node), m.d)})`; }
    }
    if (isNullish(nt)) return convert(code, nt, expected, node);
    if ((expected.flags & TF.Void) && !(expected.flags & TF.Union)) return 'Unit'; // a void slot takes Unit, whatever was written
    if (isLiteralish(node)) {
      // a literal is already built in the expected shape; only absence needs lifting
      if (isOptional(expected) && !isOptional(nt) && !isNullish(nt)) { usesOption = true; return someD(convertD(code, dtype(nt, node), innerOf(dtype(expected, node))), dtype(expected, node)); }
      if (dtype(expected, node) === 'Any' && dtype(nt, node) !== 'Any') return convert(code, nt, expected, node);
      return code;
    }
    if (isOptional(expected)) {
      if (isOptional(nt)) return convert(code, nt, expected, node);
      if (isNullish(nt)) return missingD(dtype(expected, node), nt.flags & TF.Null ? 'Null' : 'Undef');
      usesOption = true;
      return someD(convertD(code, dtype(nt, node), innerOf(dtype(expected, node))), dtype(expected, node)); // the union may flatten several literals beside null
    }
    return convert(code, nt, expected, node);
  }
  // a value of type `from` where a value of type `to` is expected: identity when the Dafny types agree,
  // otherwise an uninterpreted conversion (opaque in or out of Any, a cast between record shapes)
  function convert(code, from, to, node) {
    if (!from || !to) return code;
    return convertToD(code, from, dtype(to, node), node);
  }
  // a Dafny target still needs the source type to identify Option.None
  function convertToD(code, from, td, node) {
    const fd = dtype(from, node);
    if (isNullish(from)) {
      if (optionalD(td)) return missingD(td, from.flags & TF.Null ? 'Null' : 'Undef');
      if (td === 'Any') return `${external(from.flags & TF.Null ? 'Any_null' : 'Any_undefined', [], anyType())}()`;
      if (td === 'Absent') return absentValue(from);
    }
    if (fd.startsWith('Option<') && td.startsWith('Nullish<')) {
      const v = `no_${hash(code).slice(0, 4)}`;
      return `(var ${v} := ${code}; if ${v}.Some? then Nullish.Some(${convertD(`${v}.value`, innerOf(fd), innerOf(td))}) else Nullish.${hasAbsence(from, TF.Null) ? 'Null' : 'Undef'})`;
    }
    return convertD(code, fd, td);
  }
  const innerOf = (d) => d.slice(d.indexOf('<') + 1, -1);
  function convertD(code, fd, td) {
    if (fd === td) return code;
    const targetMembers = sums.get(td);
    const sourceMembers = sums.get(fd);
    if (sourceMembers && targetMembers && sourceMembers.every((m) => targetMembers.filter((v) => v.d === m.d).length === 1)) return sumCases(code, sourceMembers, (m, v) => convertD(`${v}.${m.field}`, m.d, td));
    if (targetMembers) { const matches = targetMembers.filter((m) => m.d === fd); if (matches.length === 1) return `${matches[0].ctor}(${code})`; }
    if (fd === 'Absent' && optionalD(td)) return td.startsWith('Nullish<') ? `(if (${code}).Null? then Nullish.Null else Nullish.Undef)` : 'None';
    if (fd === 'Any' && td.startsWith('Nullish<')) return `${external(`Any_as_${mangle(td)}`, ['Any'], td)}(${code})`;
    if (td.startsWith('Nullish<')) {
      if (optionalD(fd)) { const v = `no_${hash(code).slice(0, 4)}`; return `(var ${v} := ${code}; if ${v}.Some? then Nullish.Some(${convertD(`${v}.value`, innerOf(fd), innerOf(td))}) else ${fd.startsWith('Nullish<') ? `if ${v}.Null? then Nullish.Null else Nullish.Undef` : 'Nullish.Undef'})`; }
      return `Nullish.Some(${convertD(code, fd, innerOf(td))})`;
    }
    if (fd.startsWith('Nullish<') && td.startsWith('Option<')) {
      const v = `no_${hash(code).slice(0, 4)}`;
      return `(var ${v} := ${code}; if ${v}.Some? then Some(${convertD(`${v}.value`, innerOf(fd), innerOf(td))}) else None)`;
    }
    if (td === 'JsxNode') {
      jsxType();
      if (fd === 'string') return `JsxText(${code})`;
      if (fd === 'int' || fd === 'real') return `JsxText(${external('text_of_number', [fd], 'string')}(${code}))`;
      if (fd === 'bool' || fd === 'Unit' || fd === 'Absent') return 'JsxNothing';
      if (fd === 'Any') return `${external('node_of_Any', ['Any'], 'JsxNode')}(${code})`;
      if (optionalD(fd)) { usesOption = true; const v = `jn_${hash(code).slice(0, 4)}`; return `(var ${v} := ${code}; if ${v}.Some? then ${convertD(`${v}.value`, innerOf(fd), 'JsxNode')} else JsxNothing)`; }
      if (fd.startsWith('seq<')) { const el = fd.slice(4, -1); if (el === 'JsxNode') return `JsxList(${code})`; const v = `js_${hash(code).slice(0, 4)}`; return `(var ${v} := ${code}; JsxList(seq(|${v}|, (i: int) requires 0 <= i < |${v}| => ${convertD(`${v}[i]`, el, 'JsxNode')})))`; }
    }
    if (td === 'Unit') return 'Unit';
    if (td === 'Any' && code === 'None') return `${external('Any_undefined', [], 'Any')}()`; // `undefined` as an opaque value
    if (td === 'Any') return `${external(`Any_of_${fd.includes('->') ? 'fn_' : ''}${mangle(fd)}`, [fd], 'Any')}(${code})`;
    if (fd === 'Any') return `${external(`Any_as_${td.includes('->') ? 'fn_' : ''}${mangle(td)}`, ['Any'], td)}(${code})`;
    if (td.startsWith('Option<') && !fd.startsWith('Option<')) { usesOption = true; return `Some(${convertD(code, fd, innerOf(td))})`; }
    if (td.startsWith('Option<') && fd.startsWith('Option<')) { usesOption = true; const v = `o_${hash(code).slice(0, 4)}`; return `(var ${v} := ${code}; if ${v}.Some? then Some(${convertD(`${v}.value`, innerOf(fd), innerOf(td))}) else None)`; }
    return `${external(`cast_${mangle(fd)}_${mangle(td)}`, [fd], td)}(${code})`;
  }
  const strEsc = (s) => {
    if (/[\uD800-\uDFFF]/.test(s)) fail(sf, 'string-code-unit: use BMP scalar literals within the string model');
    return '"' + Array.from(s, (c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) > 126 ? `\\U{${c.charCodeAt(0).toString(16)}}` : JSON.stringify(c).slice(1, -1)).join('') + '"';
  };

  // JavaScript truthiness of a value used as a condition, by its static type
  function truthy(n) {
    while (ts.isParenthesizedExpression(n)) n = n.expression;
    if (containsValueStep(n) || (containsEffect(n) && !isAny(typeOf(n)))) return valueTruth(expr(n), dtype(typeOf(n), n));
    if (ts.isBinaryExpression(n) && (n.operatorToken.kind === K.AmpersandAmpersandToken || n.operatorToken.kind === K.BarBarToken)) {
      return `(${truthy(n.left)} ${n.operatorToken.kind === K.AmpersandAmpersandToken ? '&&' : '||'} ${truthy(n.right)})`;
    }
    if (ts.isPrefixUnaryExpression(n) && n.operator === K.ExclamationToken) return `!(${outerParens(truthy(n.operand))})`;
    const t = typeOf(n);
    if (isOptional(t)) {
      const inner = baseOf(t);
      const v = rawOperand(n);
      const choices = sums.get(innerOf(dtype(t, n)));
      if (choices) return `(${v}.Some? && ${sumTruth(`${v}.value`, choices)})`;
      if (inner.flags & TF.BooleanLike) return `(${v}.Some? && ${v}.value)`;
      if (inner.flags & TF.StringLike) return `(${v}.Some? && |${v}.value| > 0)`;
      if (inner.flags & TF.NumberLike) return `(${v}.Some? && ${v}.value != ${real ? '0.0' : '0'})`;
      return `${v}.Some?`;
    }
    if (isAny(t)) {
      // `a?.b` whose field is `any`: TypeScript collapses the type to any, the translation still lifts the chain to an Option
      const chained = (() => { let e = n; while (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e) || ts.isCallExpression(e)) { if (e.questionDotToken) return true; e = e.expression; } return false; })();
      if (chained) { usesOption = true; const v = `ot_${hash(n.getText(sf)).slice(0, 4)}`; return `(var ${v} := ${expr(n)}; ${v}.Some? && ${external('truthy_Any', ['Any'], 'bool')}(${v}.value))`; }
      return `${external('truthy_Any', ['Any'], 'bool')}(${expr(n)})`;
    }
    const members = sums.get(dtype(t, n));
    if (members) return sumTruth(expr(n), members);
    if (t.flags & TF.BooleanLike) return expr(n);
    if (t.flags & TF.StringLike) return `(|${expr(n)}| > 0)`;
    if (t.flags & (TF.NumberLike | TF.BigIntLike)) return `(${expr(n)} != ${real ? '0.0' : '0'})`;
    if (isNullish(t)) return 'false';
    return 'true';
  }

  // ----- expressions -----
  // a value step fixes the evaluation point of every operand in its enclosing expression
  let valueOperands = null;
  let valueNames = null;
  function valueName() {
    if (!valueNames) {
      valueNames = new Set();
      const walk = (n) => { if (ts.isIdentifier(n)) { const name = dn(n.text); valueNames.add(name.match(/^ov[0-9]+_/)?.[0] ?? name); } ts.forEachChild(n, walk); };
      walk(sf);
    }
    let name;
    do { name = `ov${tempCount++}_`; } while (valueNames.has(name));
    return name;
  }
  function containsValueStep(n) {
    if (!n || ts.isFunctionLike(n)) return false;
    if (isAssign(n) || isUpdate(n) || ts.isCommaListExpression(n) || (ts.isBinaryExpression(n) && n.operatorToken.kind === K.CommaToken)) return true;
    let found = false; ts.forEachChild(n, (c) => { if (containsValueStep(c)) found = true; }); return found;
  }
  // truthiness uses the captured value, including the union reading's member tags
  function valueTruth(value, d) {
    if (optionalD(d)) return `(${value}.Some? && ${valueTruth(`${value}.value`, innerOf(d))})`;
    const members = sums.get(d);
    if (members) return sumTruth(value, members);
    if (d === 'bool') return value;
    if (d === 'string') return `(|${value}| > 0)`;
    if (d === 'int' || d === 'real') return `(${value} != ${d === 'real' ? '0.0' : '0'})`;
    if (d === 'Unit' || d === 'Absent') return 'false';
    if (d === 'Any' || unitTParams().includes(d)) return `${external(`truthy_${mangle(d)}`, [d], 'bool')}(${value})`;
    return 'true';
  }
  // unknown truthiness keeps the source text in its uninterpreted predicate
  function logicalTruth(value, d, node) {
    if (optionalD(d)) return `(${value}.Some? && ${logicalTruth(`${value}.value`, innerOf(d), node)})`;
    if (d === 'Any' || d.startsWith('Ext_') || unitTParams().includes(d)) return `${external(`logic_truth_${hash(node.getText(sf))}`, [d], 'bool')}(${value})`;
    return valueTruth(value, d);
  }
  function valueBranch(read) {
    const saved = valueOperands;
    valueOperands = saved ? new Map(saved) : null;
    try { return wrapLet(capture(read)); } finally { valueOperands = saved; }
  }
  function valueBind(code) {
    const name = valueName();
    pending.push(`var ${name} := ${outerParens(code)};`);
    return name;
  }
  function operatorValue(n) {
    if (!core) fail(n, 'value updates need --core');
    const update = isUpdate(n), target = update ? n.operand : n.left;
    const op = update ? n.operator : n.operatorToken.kind;
    const world = isWorldField(target) || isInstanceWorldField(target);
    const setter = accessorOf(target, 'set');
    // a receiver path captures its record before the right side can make transitions
    if (ts.isPropertyAccessExpression(target) && receiverRecordPath(checker, target)) {
      let field = target; while (field.expression.kind !== K.ThisKeyword) field = field.expression;
      expr(field);
    }
    if (setter && !setter.isStatic && target.expression.kind !== K.ThisKeyword) expr(target.expression);
    let key = null, receiver = null;
    if (ts.isElementAccessExpression(target)) {
      if (!ts.isIdentifier(target.expression)) fail(target, 'assignment value needs a named array or dictionary');
      receiver = valueBind(expr(target.expression));
      key = valueBind(isArrayLike(checker, baseOf(typeOf(target.expression))) ? index(target.argumentExpression) : expr(target.argumentExpression));
    } else if (world) receiver = target.expression.kind === K.ThisKeyword ? SELF : valueBind(expr(target.expression));
    const old = update || op !== K.EqualsToken ? valueBind(expr(target)) : null;
    const rhs = update ? (typeOf(target).flags & TF.BigIntLike ? '1' : one()) : expr(n.right);
    const symbol = update ? (op === K.PlusPlusToken ? '+' : '-') : op === K.PlusEqualsToken ? '+' : op === K.MinusEqualsToken ? '-' : op === K.AsteriskEqualsToken ? '*' : null;
    if (!update && op !== K.EqualsToken && !symbol) fail(n, 'assignment-expression: write this assignment as a statement');
    const value = valueBind(symbol ? `${old} ${symbol} ${rhs}` : rhs);
    const storedAs = (d) => convertToD(value, typeOf(n), d, n);
    const moduleDecl = moduleState(checker, target, sf);
    if (moduleDecl) {
      const d = dtype(typeOf(moduleDecl.name), target);
      hoist(`${moduleAccessor(target, 'set', d)}(${WORLD}, ${storedAs(d)})`, 'Unit');
    } else if (setter) {
      accessorCall(setter, target, [storedAs(dtype(typeOf(setter.params[0].name), target))]);
    } else if (world) {
      const onThis = isWorldField(target), cls = onThis ? currentUnit.cls : sameFileClassOf(typeOf(target.expression));
      const p = checker.getPropertyOfType(checker.getTypeAtLocation(cls.name), target.name.text);
      const dt = p ? checker.getTypeOfSymbolAtLocation(p, target) : typeOf(target), d = dtype(dt, target);
      const stored = storedAs(d);
      hoist(`${onThis ? worldFieldAccessor(target, 'set', [{ d }]) : fieldAccessor(classTypeD(cls), target.name.text, 'set', d)}(${WORLD}, ${receiver}, ${stored})`, 'Unit');
    } else {
      let binding;
      if (ts.isElementAccessExpression(target)) {
        const root = target.expression;
        binding = [root.text, `${receiver}[${key} := ${storedAs(dtype(typeOf(target), target))}]`, root];
      } else binding = pathUpdate(target, (cur, p, ft) => storedAs(dtype(ft, target)));
      if (!binding) return update && ts.isPostfixUnaryExpression(n) ? old : value;
      const [name, code, root] = binding, sym = checker.getSymbolAtLocation(root);
      const d = letTypeOf(sym) ?? dtype(symType(sym, root), root);
      const from = ts.isIdentifier(target) ? dtype(typeOf(n), n) : d;
      pending.push(`var ${dn(name)}: ${d} := ${ts.isIdentifier(target) ? storedAs(d) : convertD(code, from, d)};`);
    }
    return update && ts.isPostfixUnaryExpression(n) ? old : value;
  }
  function expr(n, expected) {
    const start = !valueOperands && containsValueStep(n);
    if (start) valueOperands = new Map();
    try {
      if (!valueOperands) return expressionValue(n, expected);
      if (ts.isParenthesizedExpression(n)) return expr(n.expression, expected);
      const cached = valueOperands.get(n);
      const d = dtype(expected ?? typeOf(n), n);
      if (cached) return convertToD(cached.code, cached.t, d, n);
      // eager binary operands are captured in source order, even when a specialised rule reuses them
      if (ts.isBinaryExpression(n) && !isAssign(n) && ![K.AmpersandAmpersandToken, K.BarBarToken, K.QuestionQuestionToken, K.InstanceOfKeyword].includes(n.operatorToken.kind)) {
        expr(n.left); expr(n.right);
      }
      if (ts.isObjectLiteralExpression(n) && n.properties.some(ts.isSpreadAssignment)) {
        for (const p of n.properties) {
          if (ts.isSpreadAssignment(p)) expr(p.expression);
          else if (ts.isShorthandPropertyAssignment(p)) expr(p.name);
          else if (ts.isPropertyAssignment(p)) { if (ts.isComputedPropertyName(p.name)) expr(p.name.expression); expr(p.initializer); }
        }
      }
      let code = isAssign(n) || isUpdate(n) ? coerce(operatorValue(n), n, expected) : expressionValue(n, expected);
      // null literals carry their enclosing target type; None alone has no inferable type
      if (n.kind !== K.NullKeyword && !(ts.isIdentifier(n) && n.text === 'undefined')) code = valueBind(code);
      valueOperands.set(n, { code, d, t: expected ?? typeOf(n) });
      return code;
    } finally { if (start) valueOperands = null; }
  }
  function expressionValue(n, expected) {
    switch (n.kind) {
      case K.ParenthesizedExpression: return expr(n.expression, expected);
      case K.ConditionalExpression:
        if (containsEffect(n.whenTrue) || containsEffect(n.whenFalse)) {
          // `cond ? await a() : b`: the branch's transitions happen only when it is taken; the world and the value come out as one pair
          if (!unitEffectful()) fail(n, 'internal: an effect in a conditional branch of a pure unit');
          const tt = expected ?? typeOf(n); const d = isAny(tt) ? anyType() : dtype(tt, n);
          const cond = outerParens(truthy(n.condition));
          const a = branchWithWorld(() => expr(n.whenTrue, tt), d), b = branchWithWorld(() => expr(n.whenFalse, tt), d);
          const tv = valueOperands ? valueName() : `t${tempCount++}_`;
          pending.push(`var (${WORLD}, ${tv}) := if ${cond} then ${a} else ${b};`);
          return tv;
        }
        if (valueOperands) {
          const cond = truthy(n.condition);
          return `(if ${cond} then ${valueBranch(() => expr(n.whenTrue, expected ?? typeOf(n)))} else ${valueBranch(() => expr(n.whenFalse, expected ?? typeOf(n)))})`;
        }
        return `(if ${outerParens(truthy(n.condition))} then ${outerParens(expr(n.whenTrue, expected ?? typeOf(n)))} else ${outerParens(expr(n.whenFalse, expected ?? typeOf(n)))})`;
      default: return coerce(rawExpr(n, expected), n, expected);
    }
  }
  function ident(n) {
    if (n.text === 'undefined') return absentValue(typeOf(n));
    const o = originOf(checker, n, sf, currentUnit?.node ?? null);
    const state = moduleState(checker, n, sf);
    if (state) {
      const dt = checker.getTypeAtLocation(state.name), d = dtype(dt, n);
      const code = hoist(`${moduleAccessor(n, 'get', d)}(${WORLD})`, d);
      return isOptional(dt) && !isOptional(typeOf(n)) && !isNullish(typeOf(n)) ? `${code}.value` : code;
    }
    if (outsideRoot(checker, n, sf, currentUnit?.node) && n.text !== 'require') { const d = dtype(typeOf(n), n); addPrelude('World', 'type World'); return hoist(`${external(`global_read_${n.text}`, ['World'], `(World, ${d})`)}(${WORLD})`, d); }
    if (o.kind === 'module' && o.decl?.initializer && (ts.isLiteralExpression(o.decl.initializer) || [K.TrueKeyword, K.FalseKeyword].includes(o.decl.initializer.kind) || (ts.isPrefixUnaryExpression(o.decl.initializer) && o.decl.initializer.operator === K.MinusToken && ts.isNumericLiteral(o.decl.initializer.operand))) && !(typeOf(n).flags & TF.Object)) return expr(o.decl.initializer);
    if (o.kind === 'module' && o.decl?.initializer && !isCallable(typeOf(n))) return `${external(`${n.text}_${hash(o.decl.getText(sf))}`, [], dtype(typeOf(n), n))}()`;
    if (o.kind === 'import' || o.kind === 'other' || o.kind === 'module') return externalValue(n);
    if (o.kind === 'global') return externalValue(n);
    let code = dn(n.text);
    const LT = letTypeOf(o.sym);
    if (LT) { if (LT.startsWith('Option<') && !isOptional(typeOf(n)) && !isNullish(typeOf(n))) code += '.value'; return code; }
    if (o.sym && o.sym.valueDeclaration && o.kind === 'local') {
      const dt = symType(o.sym, n);
      code = narrowed(code, dt, typeOf(n), n);
      if (isNullish(typeOf(n))) return code;
      const declaredD = dtype(dt, n);
      const members = sums.get(optionalD(declaredD) ? innerOf(declaredD) : declaredD);
      const valueD = optionalD(declaredD) && !isOptional(typeOf(n)) && !isNullish(typeOf(n)) ? innerOf(declaredD) : declaredD;
      if (members && dtype(typeOf(n), n) !== valueD) {
        const matches = members.filter((m) => checker.isTypeAssignableTo(m.t, typeOf(n)));
        if (matches.length === 1) return `${code}.${matches[0].field}`;
        return convertD(code, valueD, dtype(typeOf(n), n));
      }
    }
    if (real && intVars.has(n.text)) return `(${code} as real)`;
    return code;
  }
  function index(arg) {
    if (ts.isIdentifier(arg) && intVars.has(arg.text)) return dn(arg.text);
    return real ? `(${expr(arg)}).Floor` : outerParens(expr(arg));
  }
  const lenOf = (s) => (real ? `(|${s}| as real)` : `|${s}|`);
  function stringOf(e) {
    const t = typeOf(e);
    if ((t.flags & TF.StringLike) || ((t.flags & TF.Union) && t.types.length > 0 && t.types.every((x) => x.flags & TF.StringLike))) return expr(e);
    if (t.flags & TF.BooleanLike) return `(if ${expr(e)} then "true" else "false")`;
    let lit = e; while (ts.isParenthesizedExpression(lit)) lit = lit.expression;
    if (ts.isNumericLiteral(lit)) return strEsc(String(Number(lit.text)));
    if (ts.isPrefixUnaryExpression(lit) && lit.operator === K.MinusToken && ts.isNumericLiteral(lit.operand)) return strEsc(String(-Number(lit.operand.text)));
    const id = external('to_string', [dtype(t, e)], 'string');
    return `${id}(${expr(e)})`;
  }

  function rawExpr(n, expected) {
    switch (n.kind) {
      case K.Identifier: return ident(n);
      case K.NumericLiteral: return numLit(n.text, n);
      case K.BigIntLiteral: return n.text.replace(/n$/, '');
      case K.StringLiteral: case K.NoSubstitutionTemplateLiteral: return strEsc(n.text);
      case K.TemplateExpression: {
        const parts = [strEsc(n.head.text)];
        for (const sp of n.templateSpans) { parts.push(stringOf(sp.expression)); if (sp.literal.text) parts.push(strEsc(sp.literal.text)); }
        return `(${parts.join(' + ')})`;
      }
      case K.TrueKeyword: return 'true';
      case K.FalseKeyword: return 'false';
      case K.NullKeyword: return absentValue(typeOf(n));
      case K.ThisKeyword: if (thisParamOf(currentUnit)) return dn('this'); if (!classOf(currentUnit)) fail(n, '`this` outside a class method'); return SELF; // a free function's declared `this` parameter is its receiver operand, an ordinary first parameter
      case K.SatisfiesExpression: return expr(n.expression, expected);
      case K.AsExpression: case K.TypeAssertionExpression: {
        // identity at run time; the types may differ, so the value is converted (opaque when they do)
        const tn = n.type;
        if (tn && ts.isTypeReferenceNode(tn) && tn.typeName.getText(sf) === 'const') return expr(n.expression, expected);
        const from = typeOf(n.expression), to = typeOf(n), code = expr(n.expression);
        if (bothAbsent(from) && !bothAbsent(to) && isOptional(to)) { const fd = dtype(from, n), td = dtype(to, n); return `${external(`cast_${mangle(fd)}_${mangle(td)}`, [fd], td)}(${code})`; }
        return convert(code, from, to, n);
      }
      case K.AwaitExpression: return awaitExpr(n);
      case K.ArrowFunction: case K.FunctionExpression: {
        if (n.modifiers?.some((m) => m.kind === K.AsyncKeyword)) return opaqueFn(n);
        // a pure lambda when the body is in the subset without effects; otherwise an opaque value keyed by its text (a
        // handler, a thunk with calls inside): the same text on both sides is the same value, a changed one differs
        try { return lambda(n, n.parameters.length); } catch (e) { if (!(e instanceof Unsupported)) throw e; return reactHandler(n) ?? opaqueFn(n); }
      }
      case K.TaggedTemplateExpression: {
        // tag`a${x}b`: an uninterpreted function of the literal parts and the holes, keyed by the tag
        const tpl = n.template;
        const strs = ts.isNoSubstitutionTemplateLiteral(tpl) ? [tpl.text] : [tpl.head.text, ...tpl.templateSpans.map((sp) => sp.literal.text)];
        const holes = ts.isNoSubstitutionTemplateLiteral(tpl) ? [] : tpl.templateSpans.map((sp) => sp.expression);
        const rd = isAny(typeOf(n)) ? anyType() : dtype(typeOf(n), n);
        const id = external(`tag_${mangle(n.tag.getText(sf))}_${holes.length}`, ['seq<string>', ...holes.map(() => anyType())], rd);
        return `${id}(${[`[${strs.map(strEsc).join(', ')}]`, ...holes.map((h) => expr(h, anyTarget()))].join(', ')})`;
      }
      case K.RegularExpressionLiteral: { addPrelude('Ext_RegExp', 'type Ext_RegExp'); return `${external(`regex_${hash(n.text)}`, [], 'Ext_RegExp')}()`; }
      case K.TypeOfExpression: {
        // represented alternatives decide the tag; assertion-derived values stay uninterpreted
        return staticTest(n.expression, (t) => { const tag = runtimeTag(t); return tag ? strEsc(tag) : null; }, (v, d) => `${external('typeof', [d], 'string')}(${v})`);
      }
      case K.NonNullExpression: {
        const t = typeOf(n.expression);
        if (!isOptional(t)) return expr(n.expression);
        const d = dtype(baseOf(t), n); const v = `nn_${hash(n.getText(sf)).slice(0, 4)}`;
        return `(var ${v} := ${rawOperand(n.expression)}; if ${v}.Some? then ${v}.value else ${external(`absent_${mangle(d)}`, [], d)}())`;
      }
      case K.PrefixUnaryExpression:
        if (n.operator === K.ExclamationToken) return `!(${outerParens(truthy(n.operand))})`;
        if (n.operator === K.PlusToken) return numberOf(n.operand);
        if (n.operator === K.TildeToken) {
          let inner = n.operand; while (ts.isParenthesizedExpression(inner)) inner = inner.expression;
          if (ts.isPrefixUnaryExpression(inner) && inner.operator === K.TildeToken) return `${helper('JsInt32', [NUM])}(${expr(inner.operand)})`;
          return `${helper('JsBitNot', [NUM])}(${expr(n.operand)})`;
        }
        return `(-${expr(n.operand)})`;
      case K.CommaListExpression: { let value; for (const e of n.elements) value = expr(e); return value; }
      case K.BinaryExpression: return binary(n);
      case K.JsxElement: case K.JsxSelfClosingElement: case K.JsxFragment: { const code = jsxNode(n); return isAny(typeOf(n)) ? convertD(code, 'JsxNode', 'Any') : code; }
      case K.PropertyAccessExpression: return propAccess(n);
      case K.ElementAccessExpression: return elemAccess(n);
      case K.ArrayLiteralExpression: {
        const ctx = expected ?? checker.getContextualType(n) ?? typeOf(n);
        if ((checker.isTupleType(typeOf(n)) || checker.isTupleType(ctx)) && !dtype(checker.isTupleType(ctx) ? ctx : typeOf(n), n).startsWith('seq<')) {
          const targs = checker.isTupleType(ctx) ? checker.getTypeArguments(ctx) : [];
          return `(${n.elements.map((e, i) => expr(e, targs[i])).join(', ')})`;
        }
        const base = baseOf(ctx);
        const et = checker.isArrayType(base) ? checker.getTypeArguments(base)[0] : checker.isTupleType(base) ? checker.getTypeArguments(base)[0] : undefined;
        const segs = []; let cur = [];
        for (const e of n.elements) {
          if (ts.isSpreadElement(e)) { if (cur.length) segs.push(`[${cur.join(', ')}]`); cur = []; segs.push(seqOf(e.expression)); }
          else cur.push(expr(e, et));
        }
        if (cur.length || !segs.length) segs.push(`[${cur.join(', ')}]`);
        return segs.length === 1 ? segs[0] : `(${segs.join(' + ')})`;
      }
      case K.ObjectLiteralExpression: return objectLit(n, expected);
      case K.CallExpression: return call(n);
      case K.NewExpression: return newExpr(n);
      default: return fail(n, `expression ${ts.SyntaxKind[n.kind]} is not translated`);
    }
  }
  // an iterable as a sequence (arrays stay; sets go through an external order)
  function seqOf(e) {
    const t = baseOf(typeOf(e));
    if (isAny(t)) return `${external('Any_to_seq', [anyType()], 'seq<Any>')}(${expr(e, anyTarget())})`;
    if (isSetT(t)) { const A = dtype(checker.getTypeArguments(t)[0], e); return `${external('set_to_seq', [`set<${A}>`], `seq<${A}>`)}(${expr(e)})`; }
    if (isMapT(t)) fail(e, 'spreading a map is not translated');
    return expr(e);
  }
  const exactPromiseForm = (n) => promiseReadings.has(`${unparen(n).pos}:${unparen(n).end}`) ? promiseForm(unparen(n), checker, sf) : null;
  // an opaque promise call evaluates its receiver and arguments, then records one outside transition
  function promiseOutsideCall(n, form, awaited) {
    if (!unitEffectful()) fail(n, 'an opaque promise call requires an effectful unit');
    const R = dtype(promiseResultType(n), n), types = [], values = [], spread = n.arguments.some(ts.isSpreadElement);
    if (form.source) {
      const D = dtype(typeOf(form.source), form.source); let value = expr(form.source);
      if (spread) { const saved = `pr${tempCount++}_`; pending.push(`var ${saved}: ${D} := ${value};`); value = saved; }
      types.push(D); values.push(value);
    }
    if (spread) { const sequence = callSequence([...n.arguments]); types.push(sequence.type); values.push(sequence.code); }
    else for (const a of n.arguments) {
      types.push(dtype(typeOf(a), a));
      values.push(ts.isArrowFunction(a) || ts.isFunctionExpression(a) ? opaqueFn(a) : expr(a));
    }
    // captures and same-file dependencies remain observable when a handler body is opaque
    const free = freeVars(n, null), calls = new Set(); let usesSelf = false;
    const scan = (x) => {
      if (x.kind === K.ThisKeyword) usesSelf = true;
      if (ts.isIdentifier(x) && originOf(checker, x, sf, currentUnit?.node ?? null).kind === 'unit' && fns.has(x.text)) calls.add(x.text);
      if (ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && x.expression.expression.kind === K.ThisKeyword && currentUnit?.cls && fns.has(`${currentUnit.className}.${x.expression.name.text}`)) calls.add(`${currentUnit.className}.${x.expression.name.text}`);
      ts.forEachChild(x, scan);
    };
    scan(n);
    if (usesSelf) { types.push(selfType(currentUnit)); values.push(SELF); }
    for (const v of free) { types.push(dtype(symType(v.sym, v.node), v.node)); values.push(dn(v.name)); }
    const callees = [...calls].sort().map((c) => fname(c).replace(new RegExp(`${sfx}$`), ''));
    const name = external(`${spread ? 'call_seq' : 'call_args'}_${awaited ? 'await_' : ''}promise_${form.kind}_${mangle(R)}${callees.length ? '_calls_' + callees.join('_') : ''}`, ['World', ...types], `(World, ${R})`);
    if (calls.size) prelude.set(name, `${prelude.get(name)}\n// CALLS: ${callees.join(',')}`);
    return hoist(`${name}(${[WORLD, ...values].join(', ')})`, R);
  }
  // promise reactions are continuations of the settled source, sharing the exact try fault channel
  const promiseResultType = (n) => checker.getAwaitedType(typeOf(n)) ?? typeOf(n);
  const promiseFailure = (R) => { const P = faultPreds(); return `${external(`throw_${mangle(R)}`, [anyType()], R)}(${P.value}(${WORLD}))`; };
  const promisePair = (v) => `(${WORLD}, ${outerParens(v)})`;
  const promiseGuard = (code, R) => `if ${faultPreds().faulted}(${WORLD}) then ${promisePair(promiseFailure(R))} else ${wrapLet(code)}`;
  function promiseAbsent(rt, n) {
    const R = dtype(rt, n);
    if (R === 'Unit') return 'Unit';
    const missing = checker.getUndefinedType();
    return convert(absentValue(missing), missing, rt, n);
  }
  function promiseValueCode(n, rt) {
    if (!isPromiseT(typeOf(n)) && !exactPromiseForm(n)) {
      return expr(n, rt);
    }
    return convert(settledPromise(n), promiseResultType(n), rt, n);
  }
  function settledPromise(n) {
    n = unparen(n);
    const form = exactPromiseForm(n);
    if (form) return promiseExpression(n, form);
    if (!isPromiseT(typeOf(n))) return expr(n);
    if (ts.isCallExpression(n)) return call(n, true);
    const R = dtype(promiseResultType(n), n), D = dtype(typeOf(n), n);
    const value = expr(n);
    return hoist(`${external('await_value', ['World', D], `(World, ${R})`)}(${WORLD}, ${value})`, R);
  }
  function promiseStatements(list, rt, done, settlement = null) {
    const R = dtype(rt, list[0] ?? currentUnit.node);
    if (!list.length) return done();
    const [s, ...rest] = list;
    const more = () => promiseStatements(rest, rt, done, settlement);
    const after = (lines) => `${lines}${lines ? '\n' : ''}${containsEffect(s) ? promiseGuard(more(), R) : more()}`;
    const resolveCall = (e) => settlement && settlement(unparen(e));
    const end = (e) => {
      const st = e && resolveCall(e);
      if (st?.kind === 'reject') return rejectedPromise(st.call.arguments[0], R);
      const value = st ? st.call.arguments[0] : e;
      return capture(() => {
        const code = value ? promiseValueCode(value, rt) : promiseAbsent(rt, s);
        return value && containsEffect(value) ? promiseGuard(promisePair(code), R) : promisePair(code);
      });
    };
    if (ts.isBlock(s)) return promiseStatements([...s.statements, ...rest], rt, done, settlement);
    if (ts.isEmptyStatement(s)) return more();
    if (ts.isReturnStatement(s)) return end(s.expression);
    if (ts.isThrowStatement(s)) return rejectedPromise(s.expression, R);
    if (ts.isIfStatement(s)) return capture(() => {
      const cond = truthy(s.expression);
      const yes = promiseStatements([...flatten(s.thenStatement), ...rest], rt, done, settlement);
      const no = promiseStatements([...(s.elseStatement ? flatten(s.elseStatement) : []), ...rest], rt, done, settlement);
      const branch = `if ${cond} then ${wrapLet(yes)} else ${wrapLet(no)}`;
      return containsEffect(s.expression) ? promiseGuard(branch, R) : branch;
    });
    if (ts.isVariableStatement(s)) {
      const decls = [...s.declarationList.declarations];
      const bind = (i) => {
        if (i === decls.length) return more();
        const d = decls[i];
        return capture(() => {
          const t = typeOf(d.name), D = dtype(t, d);
          const value = d.initializer ? outerParens(expr(d.initializer, t)) : `${external(`uninit_${mangle(D)}`, [], D)}()`;
          const line = ts.isIdentifier(d.name) ? `var ${dn(d.name.text)}${hookResultOf.has(d.initializer) ? '' : `: ${D}`} := ${value};` : destructure(d.name, value, typeOf(d.initializer), hookResultOf.get(d.initializer) ?? null).join('\n');
          return `${line}\n${d.initializer && containsEffect(d.initializer) ? promiseGuard(bind(i + 1), R) : bind(i + 1)}`;
        });
      };
      return bind(0);
    }
    if (ts.isExpressionStatement(s)) {
      if (resolveCall(s.expression)) return end(s.expression);
      const line = capture(() => {
        const nv = newValue(s.expression);
        return nv ? `var ${dn(nv[0])} := ${nv[1]};` : '';
      });
      return after(line);
    }
    return fail(s, 'promise-handler: this statement has no inline continuation reading');
  }
  function rejectedPromise(e, R) {
    return capture(() => {
      const value = e ? expr(e, anyTarget()) : `${external('Any_undefined', [], anyType())}()`;
      return `var ${WORLD} := ${faultPreds().raise}(${WORLD}, ${value});\n${promisePair(promiseFailure(R))}`;
    });
  }
  function promiseHandlerBody(cb, argument, argumentD, outputT, argumentT = null) {
    const R = dtype(outputT, cb);
    const argumentAs = (D) => argumentT ? convertToD(argument, argumentT, D, cb) : convertD(argument, argumentD, D);
    if (ts.isIdentifier(cb)) {
      const sg = checker.getSignaturesOfType(typeOf(cb), ts.SignatureKind.Call)[0];
      const params = sg.getParameters();
      const args = params.map((p) => argumentAs(dtype(checker.getTypeOfSymbolAtLocation(p, cb), cb)));
      const u = fns.get(cb.text), origin = originOf(checker, cb, sf, currentUnit?.node ?? null);
      const ownR = dtype(checker.getAwaitedType(sg.getReturnType()) ?? sg.getReturnType(), cb);
      return capture(() => {
        let value;
        if (u && origin.kind === 'unit') {
          if (mutatedOf(u).length) fail(cb, 'promise-handler: a named handler mutates its argument');
          const eff = effectfulUnits.has(u.name);
          const callCode = `${fname(u.name)}(${[...(eff ? [WORLD] : []), ...fuelArg(u), ...args].join(', ')})`;
          value = eff ? hoist(callCode, ownR) : callCode;
        } else value = hoist(`${external(`call_args_${isPromiseT(sg.getReturnType()) ? 'await_' : ''}${cb.text}`, ['World', ...params.map((p) => dtype(checker.getTypeOfSymbolAtLocation(p, cb), cb))], `(World, ${ownR})`)}(${[WORLD, ...args].join(', ')})`, ownR);
        return promiseGuard(promisePair(convert(value, checker.getAwaitedType(sg.getReturnType()) ?? sg.getReturnType(), outputT, cb)), R);
      });
    }
    const bindings = cb.parameters.map((p) => `var ${dn(p.name.text)}: ${dtype(typeOf(p.name), p)} := ${argumentAs(dtype(typeOf(p.name), p))};`).join('\n');
    const done = () => promisePair(promiseAbsent(outputT, cb));
    const body = ts.isBlock(cb.body) ? promiseStatements([...cb.body.statements], outputT, done) : capture(() => {
      const value = promiseValueCode(cb.body, outputT);
      return containsEffect(cb.body) ? promiseGuard(promisePair(value), R) : promisePair(value);
    });
    return `${bindings}${bindings ? '\n' : ''}${body}`;
  }
  function opaquePromiseExecutor(n, rt) {
    // an outside callback controls settlement and pending work; captures are arguments, never hidden constants
    const R = dtype(rt, n), free = freeVars(n, null);
    const types = free.map((v) => dtype(symType(v.sym, v.node), v.node));
    let usesSelf = false; const calls = new Set();
    const scan = (x) => {
      if (x.kind === K.ThisKeyword) usesSelf = true;
      if (ts.isIdentifier(x) && originOf(checker, x, sf, currentUnit?.node ?? null).kind === 'unit' && fns.has(x.text)) calls.add(x.text);
      if (ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && x.expression.expression.kind === K.ThisKeyword && currentUnit?.cls && fns.has(`${currentUnit.className}.${x.expression.name.text}`)) calls.add(`${currentUnit.className}.${x.expression.name.text}`);
      ts.forEachChild(x, scan);
    };
    scan(n);
    const tag = [...calls].sort().map((c) => fname(c).replace(new RegExp(`${sfx}$`), '')).join('_');
    const name = external(`block_promise_${iteratorProgram(n)}${tag ? '_calls_' + tag : ''}`, ['World', ...(usesSelf ? [selfType(currentUnit)] : []), ...types], `(World, ${R})`);
    if (calls.size) prelude.set(name, `${prelude.get(name)}\n// CALLS: ${[...calls].sort().map((c) => fname(c).replace(new RegExp(`${sfx}$`), '')).join(',')}`);
    return hoist(`${name}(${[WORLD, ...(usesSelf ? [SELF] : []), ...free.map((v) => dn(v.name))].join(', ')})`, R);
  }
  function promiseExpression(n, form) {
    if (!promiseConsumed(n, checker, sf)) fail(n, 'promise-pending: await or return the promise directly');
    if (!core || !unitEffectful()) fail(n, 'promise forms require an effectful core unit');
    const rt = promiseResultType(n), R = dtype(rt, n), P = faultPreds();
    // a chain handles its own faults before the enclosing try observes its final outcome
    if (faultMode || completionMode) {
      const savedFault = faultMode, savedCompletion = completionMode;
      faultMode = false; completionMode = false;
      let body;
      try { body = capture(() => promisePair(promiseExpression(n, form))); }
      finally { faultMode = savedFault; completionMode = savedCompletion; }
      const value = hoist(`(${body})`, R);
      if (!faultMode && completionMode) pending.push(FAULT_CHECK);
      return value;
    }
    if (form.kind === 'resolve') return n.arguments[0] ? promiseValueCode(n.arguments[0], rt) : promiseAbsent(rt, n);
    if (form.kind === 'reject') return hoist(`(${rejectedPromise(n.arguments[0], R)})`, R);
    if (form.kind === 'executor') {
      const shape = executorShape(n, checker, sf);
      if (shape.rule) fail(n, `${shape.rule}: ${shape.message}`);
      if (shape.bridge) return opaquePromiseExecutor(n, rt);
      const body = ts.isBlock(shape.cb.body) ? [...shape.cb.body.statements] : [{ kind: K.ExpressionStatement, expression: shape.cb.body }];
      return hoist(`(${promiseStatements(body, rt, () => fail(n, 'promise-unsettled: an executor path does not settle'), shape.settlement)})`, R);
    }
    if (!form.source) fail(n, 'promise-combinator: completion order is not read');
    const sourceT = promiseResultType(form.source), source = settledPromise(form.source), D = dtype(sourceT, form.source);
    const cb = form.handler;
    if (form.kind === 'then') return hoist(`(${promiseGuard(promiseHandlerBody(cb, source, D, rt, sourceT), R)})`, R);
    if (form.kind === 'catch') {
      const caught = `err${tempCount++}_`;
      const body = `var ${caught} := ${P.value}(${WORLD});\nvar ${WORLD} := ${P.clear}(${WORLD});\n${promiseHandlerBody(cb, caught, 'Any', rt)}`;
      return hoist(`(if ${P.faulted}(${WORLD}) then (${body}) else ${promisePair(convert(source, sourceT, rt, n))})`, R);
    }
    const old = `pw${tempCount++}_`, was = `pf${tempCount++}_`, error = `pe${tempCount++}_`;
    const sg = checker.getSignaturesOfType(typeOf(cb), ts.SignatureKind.Call)[0];
    const ownT = checker.getAwaitedType(sg.getReturnType()) ?? sg.getReturnType();
    const body = promiseHandlerBody(cb, 'Unit', 'Unit', ownT);
    return hoist(`(var ${old} := ${WORLD}; var ${was} := ${P.faulted}(${old}); var ${error} := ${P.value}(${old});\nvar ${WORLD} := if ${was} then ${P.clear}(${WORLD}) else ${WORLD};\nvar (${WORLD}, ignored${tempCount++}_) := (${body});\nif ${P.faulted}(${WORLD}) then ${promisePair(promiseFailure(R))} else (var ${WORLD} := if ${was} then ${P.raise}(${WORLD}, ${error}) else ${WORLD}; ${promisePair(convert(source, sourceT, rt, n))}))`, R);
  }
  // an async await exits on a fault before its following statements, just like a promise reaction
  const awaitsHere = (n) => { let found = false; const w = (x) => { if (ts.isFunctionLike(x)) return; if (ts.isAwaitExpression(x) || exactPromiseForm(x)) found = true; if (!found) ts.forEachChild(x, w); }; w(n); return found; };
  const asyncFailure = (u) => retIn(promiseFailure(dtype(retType(u), u.node)));
  function awaitExpr(n) {
    const shape = promiseAllMapShape(n);
    if (shape) return callbackValue(n, shape);
    let inner = n.expression; while (ts.isParenthesizedExpression(inner)) inner = inner.expression;
    const form = exactPromiseForm(inner);
    if (form) return promiseExpression(inner, form);
    if (ts.isCallExpression(inner) && ts.isPropertyAccessExpression(inner.expression) && ts.isIdentifier(inner.expression.expression) && inner.expression.expression.text === 'Promise' && inner.expression.name.text === 'all' && inner.arguments.length === 1) {
      let arr = inner.arguments[0]; while (ts.isParenthesizedExpression(arr)) arr = arr.expression;
      if (ts.isArrayLiteralExpression(arr) && arr.elements.every((el) => !ts.isSpreadElement(el))) {
        // the awaited values in array order: each element is awaited as a transition, the result is the sequence
        const vals = arr.elements.map((el) => { let x = el; while (ts.isParenthesizedExpression(x)) x = x.expression; if (ts.isCallExpression(x)) return outerParens(call(x, true)); if (!unitEffectful()) fail(n, 'internal: await in a unit not marked effectful'); addPrelude('World', 'type World'); const pt = typeOf(x); const aw = checker.getAwaitedType ? checker.getAwaitedType(pt) : null; const rd = aw ? (isAny(aw) ? anyType() : dtype(aw, n)) : anyType(); const pd = (() => { try { return dtype(pt, n); } catch { return anyType(); } })(); return hoist(`${external('await_value', ['World', pd], `(World, ${rd})`)}(${WORLD}, ${expr(x)})`, rd); });
        const awAll = checker.getAwaitedType ? checker.getAwaitedType(typeOf(inner)) : null;
        if (awAll && checker.isTupleType(baseOf(awAll)) && vals.length >= 2 && !dtype(baseOf(awAll), n).startsWith('seq<')) { const tv = `t${tempCount++}_`; pending.push(`var ${tv} := (${vals.join(', ')});`); return tv; } // a tuple when the elements differ in type, bound to a name (a bare tuple loses its parentheses in a pattern)
        return `[${vals.join(', ')}]`;
      }
    }
    if (!ts.isCallExpression(inner)) {
      // awaiting a held promise: a transition of the world on that value, returning the awaited type
      if (!unitEffectful()) fail(n, 'internal: await in a unit not marked effectful');
      addPrelude('World', 'type World');
      const pt = typeOf(inner); const aw = checker.getAwaitedType ? checker.getAwaitedType(pt) : null; const rd = aw ? dtype(aw, n) : anyType();
      const pd = (() => { try { return dtype(pt, n); } catch { return anyType(); } })();
      const id = external('await_value', ['World', pd], `(World, ${rd})`);
      return hoist(`${id}(${WORLD}, ${expr(inner)})`, rd);
    }
    return call(inner, true);
  }
  function binary(n) {
    const op = n.operatorToken.kind;
    if (op === K.CommaToken) { expr(n.left); return expr(n.right); }
    const bit = { [K.AmpersandToken]: 'JsBitAnd', [K.BarToken]: 'JsBitOr', [K.CaretToken]: 'JsBitXor', [K.LessThanLessThanToken]: 'JsShl', [K.GreaterThanGreaterThanToken]: 'JsShr', [K.GreaterThanGreaterThanGreaterThanToken]: 'JsUshr' }[op];
    if (bit) {
      if (op === K.BarToken && ts.isNumericLiteral(n.right) && Number(n.right.text) === 0) return `${helper('JsInt32', [NUM])}(${expr(n.left)})`;
      const left = expr(n.left), count = finiteLiteral(n.right);
      const right = ['JsShl', 'JsShr', 'JsUshr'].includes(bit) && count !== null && Number.isFinite(count) ? numLit(String((count >>> 0) & 31), n.right) : expr(n.right);
      return `${helper(bit, [NUM])}(${left}, ${right})`;
    }
    if (op === K.AsteriskAsteriskToken) return `${external('pow', [NUM, NUM], NUM)}(${expr(n.left)}, ${expr(n.right)})`; // a power: uninterpreted, the same on both sides
    const isNul = (e) => { while (ts.isParenthesizedExpression(e)) e = e.expression; return e.kind === K.NullKeyword || (ts.isIdentifier(e) && e.text === 'undefined'); };
    const eqOps = new Set([K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.EqualsEqualsToken, K.ExclamationEqualsToken]);
    if (eqOps.has(op) && (isNul(n.left) || isNul(n.right))) {
      const other = isNul(n.left) ? n.right : n.left, absent = isNul(n.left) ? n.left : n.right;
      const neg = op === K.ExclamationEqualsEqualsToken || op === K.ExclamationEqualsToken;
      const loose = op === K.EqualsEqualsToken || op === K.ExclamationEqualsToken;
      const kind = typeOf(absent).flags & TF.Null ? 'Null' : 'Undef';
      const t = typeOf(other), dt = storedType(other);
      let test;
      const dict = dictRead(other);
      if (dict) {
        const present = `${dict.key} in ${dict.map}`, value = `${dict.map}[${dict.key}]`;
        const vt = dict.valueType;
        let hit = 'false';
        if (isAny(vt)) { const N = external('is_null_Any', ['Any'], 'bool'), U = external('is_undefined_Any', ['Any'], 'bool'); hit = loose ? `(${N}(${value}) || ${U}(${value}))` : `${kind === 'Null' ? N : U}(${value})`; }
        else if (isNullish(vt)) hit = loose || hasAbsence(vt, kind === 'Null' ? TF.Null : TF.Undefined) ? 'true' : 'false';
        else if (bothAbsent(vt)) hit = loose ? `!${value}.Some?` : `${value}.${kind}?`;
        else if (isOptional(vt) && (loose || hasAbsence(vt, kind === 'Null' ? TF.Null : TF.Undefined))) hit = `${value}.None?`;
        test = `(if ${present} then ${hit} else ${loose || kind === 'Undef'})`;
      } else if (isAny(t) || isAny(dt)) {
        const value = isAny(dt) ? rawOperand(other) : expr(other), id = `na${tempCount++}_`;
        const N = external('is_null_Any', ['Any'], 'bool'), U = external('is_undefined_Any', ['Any'], 'bool');
        test = `(var ${id} := ${value}; ${loose ? `${N}(${id}) || ${U}(${id})` : `${kind === 'Null' ? N : U}(${id})`})`;
      } else if (isNullish(t)) { expr(other); test = loose || !!(t.flags & (kind === 'Null' ? TF.Null : TF.Undefined)) ? 'true' : 'false'; }
      else if (bothAbsent(dt)) { const value = rawOperand(other); test = loose ? `!${value}.Some?` : `${value}.${kind}?`; }
      else if (isOptional(t)) { const value = rawOperand(other); test = loose || hasAbsence(t, kind === 'Null' ? TF.Null : TF.Undefined) ? `${value}.None?` : 'false'; }
      else { expr(other); test = 'false'; }
      return neg ? `!(${test})` : test;
    }
    if (op === K.QuestionQuestionToken && !bothAbsent(storedType(n.left)) && !isNullish(typeOf(n.left)) && !isNullish(typeOf(n.right)) && !containsEffect(n.right)) {
      const lt = typeOf(n.left);
      if (!isOptional(lt)) return expr(n.left);
      const l = rawOperand(n.left);
      const t = typeOf(n); const td = isAny(t) ? anyType() : dtype(t, n); const inner = isAny(baseOf(lt)) ? anyType() : dtype(baseOf(lt), n); const rtp = typeOf(n.right); const rd = isAny(rtp) ? anyType() : dtype(rtp, n);
      if (valueOperands) return `(if ${l}.Some? then ${convertD(`${l}.value`, inner, td)} else ${valueBranch(() => expr(n.right, t))})`;
      if (td !== inner || td !== rd) return `(if ${l}.Some? then ${convertD(`${l}.value`, inner, td)} else ${convert(outerParens(expr(n.right)), typeOf(n.right), t, n)})`; // `x ?? "none"` with x: number | undefined: both sides lifted to the result type
      return `(if ${l}.Some? then ${l}.value else ${outerParens(expr(n.right, baseOf(lt)))})`;
    }
    if (op === K.QuestionQuestionToken) {
      const lt = typeOf(n.left), t = typeOf(n);
      if (isNullish(lt)) { expr(n.left); return expr(n.right, t); }
      if (!isOptional(lt)) return expr(n.left, t);
      if (valueOperands) {
        const left = expr(n.left), chosen = dtype(lt, n) === dtype(t, n) ? left : convert(`${left}.value`, baseOf(lt), t, n);
        if (!containsEffect(n.right)) return `(if ${left}.Some? then ${chosen} else ${valueBranch(() => expr(n.right, t))})`;
        const right = branchWithWorld(() => expr(n.right, t), dtype(t, n)), value = valueName();
        pending.push(`var (${WORLD}, ${value}) := if ${left}.Some? then (${WORLD}, ${chosen}) else ${right};`);
        return value;
      }
      const l = `nc${tempCount++}_`, left = expr(n.left);
      const chosen = convert(`${l}.value`, baseOf(lt), t, n);
      if (containsEffect(n.right)) {
        const right = branchWithWorld(() => expr(n.right, t), dtype(t, n));
        return hoist(`(var ${l} := ${left}; if ${l}.Some? then (${WORLD}, ${chosen}) else ${right})`, dtype(t, n));
      }
      return `(var ${l} := ${left}; if ${l}.Some? then ${chosen} else ${expr(n.right, t)})`;
    }
    if (op === K.AmpersandAmpersandToken || op === K.BarBarToken) {
      const t = typeOf(n);
      if (!containsEffect(n) && !valueOperands && (isNodeT(t) || isJsxLit(n.left) || isJsxLit(n.right))) return jsxChild(n);
      const lt = typeOf(n.left), ld = dtype(lt, n), td = dtype(t, n);
      // the deciding operand is evaluated once, before either branch is translated
      const saved = valueName(), first = expr(n.left);
      const and = op === K.AmpersandAmpersandToken;
      const cond = logicalTruth(saved, ld, n);
      const left = !and && isOptional(lt) ? convertD(`${saved}.value`, innerOf(ld), td) : convert(saved, lt, t, n);
      const choose = (right) => and ? `if ${cond} then ${right} else ${left}` : `if ${cond} then ${left} else ${right}`;
      if (containsEffect(n.right)) {
        if (!unitEffectful()) fail(n, 'conditional-effect: move the effect into an explicit if statement');
        pending.push(`var ${saved}: ${ld} := ${first};`);
        const right = branchWithWorld(() => expr(n.right, t), td);
        return hoist(and ? `(if ${cond} then ${right} else (${WORLD}, ${left}))` : `(if ${cond} then (${WORLD}, ${left}) else ${right})`, td);
      }
      return `(var ${saved}: ${ld} := ${first}; ${choose(valueBranch(() => expr(n.right, t)))})`;
    }
    if (op === K.InstanceOfKeyword) {
      const decl = checker.getSymbolAtLocation(n.right)?.valueDeclaration;
      const target = decl && ts.isClassDeclaration(decl) ? checker.getTypeAtLocation(decl.name) : null;
      return staticTest(n.left, (t) => target ? instanceDecision(t, target, n) : null, (v, d) => `${external(`instanceof_${mangle(n.right.getText(sf))}`, [d], 'bool')}(${v})`);
    }
    if (op === K.InKeyword) {
      const rt0 = typeOf(n.right); const rd = (() => { try { return isAny(rt0) ? 'Any' : dtype(rt0, n); } catch { return 'Any'; } })();
      if (assertionDerived(n.left) || assertionDerived(n.right)) return `${external('in_Any', [anyType(), anyType()], 'bool')}(${expr(n.left, anyTarget())}, ${expr(n.right, anyTarget())})`;
      if (rd.startsWith('map<string') && (typeOf(n.left).flags & TF.StringLike)) return `(${expr(n.left)} in ${expr(n.right)})`; // a key test on a dictionary is exact
      if (ts.isStringLiteral(n.left)) {
        const key = n.left.text;
        return staticTest(n.right, (t) => { const p = checker.getPropertyOfType(t, key); return p && !(p.flags & ts.SymbolFlags.Optional) ? 'true' : null; }, (v, d) => `${external('in_record', [d, 'string'], 'bool')}(${v}, ${strEsc(key)})`);
      }
      return `${external('in_Any', [anyType(), anyType()], 'bool')}(${expr(n.left, anyTarget())}, ${expr(n.right, anyTarget())})`;
    }
    if (op === K.PercentToken) {
      if (real && !(typeOf(n.left).flags & TF.BigIntLike)) return `${helper('JsRealRem', ['real'])}(${expr(n.left)}, ${expr(n.right)})`;
      return `${helper('JsRem', ['int'])}(${expr(n.left)}, ${expr(n.right)})`;
    }
    if (op === K.SlashToken) {
      const lt = typeOf(n.left);
      if (lt.flags & TF.BigIntLike) return `${helper('TruncDiv', ['int'])}(${expr(n.left)}, ${expr(n.right)})`;
      if (real) return `(${expr(n.left)} / ${expr(n.right)})`;
      // reached only under Math.floor / Math.trunc (the lint refuses bare `/` on numbers)
      return `__DIV__(${expr(n.left)}, ${expr(n.right)})`;
    }
    const map = { [K.EqualsEqualsEqualsToken]: '==', [K.ExclamationEqualsEqualsToken]: '!=', [K.EqualsEqualsToken]: '==', [K.ExclamationEqualsToken]: '!=' };
    const o = map[op] ?? n.operatorToken.getText(sf);
    const lt0 = typeOf(n.left), rt0 = typeOf(n.right);
    if ((op === K.EqualsEqualsToken || op === K.ExclamationEqualsToken) && !(isAny(lt0) || isAny(rt0))) { // loose equality between primitives: the ECMAScript coercion table (7.2.14), member by member on a union, with the one uninterpreted ToNumber that Number(s) uses
      const dl = dtype(lt0, n.left), dr = dtype(rt0, n.right);
      if (dl !== dr || isOptional(lt0) || isOptional(rt0) || sums.has(dl)) {
        const kindOfT = (t) => (t.flags & TF.NumberLike ? 'number' : t.flags & TF.StringLike ? 'string' : t.flags & TF.BooleanLike ? 'boolean' : (t.flags & (TF.Null | TF.Undefined)) ? 'absent' : null);
        const toNum = (code, t) => (t.flags & TF.NumberLike ? code : t.flags & TF.BooleanLike ? `(if ${code} then ${real ? '1.0' : '1'} else ${real ? '0.0' : '0'})` : `${external('number_of', [dtype(t, n)], NUM)}(${code})`);
        const absentOf = (code, t) => (isOptional(t) ? `!${code}.Some?` : kindOfT(t) === 'absent' ? 'true' : 'false');
        const cmp = (a, ta, b, tb) => {
          if (isOptional(ta)) return `(if ${a}.Some? then ${cmp(`${a}.value`, baseOf(ta), b, tb)} else ${absentOf(b, tb)})`;
          if (isOptional(tb)) return `(if ${b}.Some? then ${cmp(a, ta, `${b}.value`, baseOf(tb))} else ${absentOf(a, ta)})`;
          const ma = sums.get(dtype(ta, n)); if (ma) return sumCases(a, ma, (m, v) => cmp(`${v}.${m.field}`, m.t, b, tb));
          const mb = sums.get(dtype(tb, n)); if (mb) return sumCases(b, mb, (m, v) => cmp(a, ta, `${v}.${m.field}`, m.t));
          const ka = kindOfT(ta), kb = kindOfT(tb);
          if (!ka || !kb) fail(n, 'loose equality on a non-primitive operand is not translated');
          if (ka === 'absent' || kb === 'absent') return ka === kb ? 'true' : 'false';
          if (ka === kb) return `(${a} == ${b})`;
          return `(${toNum(a, ta)} == ${toNum(b, tb)})`;
        };
        const l = `le${tempCount++}_`, r = `re${tempCount++}_`;
        const code = `(var ${l} := ${expr(n.left)}; var ${r} := ${expr(n.right)}; ${cmp(l, lt0, r, rt0)})`;
        return op === K.ExclamationEqualsToken ? `!${code}` : code;
      }
    }
    if ((isAny(lt0) || isAny(rt0)) && !map[op]) {
      // arithmetic or ordering on an opaque value: an uninterpreted operator over Any, typed by the result
      const names = { '+': 'plus', '-': 'minus', '*': 'times', '<': 'lt', '<=': 'le', '>': 'gt', '>=': 'ge' };
      const rd = (o === '+' || o === '-' || o === '*') ? (isAny(typeOf(n)) ? anyType() : dtype(typeOf(n), n)) : 'bool';
      const A = anyType();
      return `${external(`op_${names[o] ?? mangle(o)}_Any`, [A, A], rd)}(${expr(n.left, anyTarget())}, ${expr(n.right, anyTarget())})`;
    }
    const strT = (t) => !!(t.flags & TF.StringLike) || (!!(t.flags & TF.Union) && t.types.length > 0 && t.types.every((x) => x.flags & TF.StringLike));
    if (['<', '>', '<=', '>='].includes(o) && strT(lt0) && strT(rt0)) {
      const L = expr(n.left), R = expr(n.right), H = helper('StrLt', ['string']);
      return o === '<' ? `${H}(${L}, ${R})` : o === '>' ? `${H}(${R}, ${L})` : o === '<=' ? `!${H}(${R}, ${L})` : `!${H}(${L}, ${R})`;
    }
    if (o === '+' && !(isAny(lt0) || isAny(rt0)) && (strT(lt0) || strT(rt0)) && !(strT(lt0) && strT(rt0))) {
      return `(${stringOf(n.left)} + ${stringOf(n.right)})`;
    }
    if (map[op]) {
      // comparing an Option with a plain value: lift the plain side
      const lt = typeOf(n.left), rt = typeOf(n.right);
      if (isAny(lt) || isAny(rt)) return `(${expr(n.left, anyTarget())} ${o} ${expr(n.right, anyTarget())})`;
      if ((isOptional(lt) || isNullish(lt)) && (isOptional(rt) || isNullish(rt))) {
        const joined = checker.getUnionType([lt, rt]);
        if (bothAbsent(joined)) return `(${expr(n.left, joined)} ${o} ${expr(n.right, joined)})`;
      }
      const l = isOptional(lt) ? rawOperand(n.left) : expr(n.left, isOptional(rt) ? rt : undefined);
      const r = isOptional(rt) ? rawOperand(n.right) : expr(n.right, isOptional(lt) ? lt : undefined);
      return `(${l} ${o} ${r})`;
    }
    return `(${expr(n.left)} ${o} ${expr(n.right)})`;
  }
  // an operand kept in its declared (Option) form
  function rawOperand(e) {
    while (ts.isParenthesizedExpression(e)) e = e.expression;
    if (valueOperands && !ts.isIdentifier(e)) return expr(e);
    if (ts.isIdentifier(e)) {
      const o = originOf(checker, e, sf, currentUnit?.node ?? null);
      if (o.kind === 'local' || o.kind === 'unit') return dn(e.text);
      return ident(e);
    }
    if (ts.isPropertyAccessExpression(e)) return propAccess(e, true);
    if (ts.isElementAccessExpression(e) || ts.isCallExpression(e)) return rawExpr(e);
    return expr(e);
  }
  // fixed literal methods are function fields; their immutable data is captured once
  let objectData = null;
  function literalRecord(t) {
    const obj = methodLiteralOf(checker, t);
    return obj?.getSourceFile() === sf && obj.properties.every((p) => (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p) || ts.isMethodDeclaration(p) || ts.isGetAccessorDeclaration(p)) && p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) ? obj : null;
  }
  function literalMethod(prop) {
    const obj = literalRecord(typeOf(prop.expression));
    return obj?.properties.find((p) => ts.isMethodDeclaration(p) && p.name.text === prop.name.text) ?? null;
  }
  function literalGetter(prop) {
    const obj = literalRecord(typeOf(prop.expression));
    return obj?.properties.find((p) => ts.isGetAccessorDeclaration(p) && p.name.text === prop.name.text) ?? null;
  }
  const literalFunctionType = (m) => ts.isGetAccessorDeclaration(m) ? `() -> ${dtype(checker.getSignatureFromDeclaration(m).getReturnType(), m)}` : dtype(typeOf(m), m);
  function exactObjectMethod(m) {
    if (!m.body || m.asteriskToken || m.modifiers?.some((x) => x.kind === K.AsyncKeyword) || m.parameters.some((p) => !ts.isIdentifier(p.name) || p.initializer || p.dotDotDotToken || p.questionToken)) return false;
    const scalar = (t) => !!(t.flags & (TF.NumberLike | TF.StringLike | TF.BooleanLike | TF.BigIntLike));
    if (m.body.statements.length !== 1 || !ts.isReturnStatement(m.body.statements[0]) || !m.body.statements[0].expression) return false;
    const pure = (e) => {
      if (ts.isParenthesizedExpression(e)) return pure(e.expression);
      if (ts.isNumericLiteral(e) || ts.isStringLiteral(e) || [K.TrueKeyword, K.FalseKeyword].includes(e.kind)) return true;
      if (ts.isIdentifier(e)) { const d = checker.getSymbolAtLocation(e)?.valueDeclaration; return !!d && ts.isParameter(d) && d.parent === m && scalar(typeOf(e)); }
      if (ts.isPropertyAccessExpression(e) && e.expression.kind === K.ThisKeyword) return m.parent.properties.some((p) => (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && p.name.text === e.name.text) && scalar(typeOf(e));
      if (ts.isPrefixUnaryExpression(e) && [K.MinusToken, K.ExclamationToken].includes(e.operator)) return pure(e.operand);
      if (ts.isBinaryExpression(e) && [K.PlusToken, K.MinusToken, K.AsteriskToken, K.LessThanToken, K.LessThanEqualsToken, K.GreaterThanToken, K.GreaterThanEqualsToken, K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken].includes(e.operatorToken.kind)) return pure(e.left) && pure(e.right);
      return false;
    };
    return pure(m.body.statements[0].expression);
  }
  function methodValue(m, fields) {
    const prev = objectData; objectData = fields;
    try {
      if (exactObjectMethod(m)) {
        const ps = m.parameters.map((p) => `${dn(p.name.text)}: ${dtype(typeOf(p.name), p)}`);
        return `((${ps.join(', ')}) => ${expr(m.body.statements[0].expression)})`;
      }
      const d = literalFunctionType(m);
      const captured = closureReads(checker, m).map((n) => expr(n, anyTarget()));
      for (const f of fields.values()) captured.push(convertD(f.code, f.d, anyType()));
      const text = m.parent.properties.filter((p) => ts.isMethodDeclaration(p) || ts.isGetAccessorDeclaration(p)).map((p) => p.getText(sf)).join('\n') + '\nmember:' + m.name.text;
      // the existing opaque closure supplies dependency markers and imported bindings
      const opaque = opaqueFn(m);
      for (const sibling of m.parent.properties) if (sibling !== m && (ts.isMethodDeclaration(sibling) || ts.isGetAccessorDeclaration(sibling))) captured.push(convertD(opaqueFn(sibling), literalFunctionType(sibling), anyType()));
      return `${external('method_value', [d, 'string', 'seq<Any>'], d)}(${opaque}, ${strEsc(Buffer.from(text).toString('hex'))}, [${captured.join(', ')}])`;
    } finally { objectData = prev; }
  }
  function objectLit(n, expected) {
    if (literalRecord(typeOf(n))) {
      const t = typeOf(n), d = dtype(t, n), fields = new Map();
      for (const p of n.properties) if (!ts.isMethodDeclaration(p) && !ts.isGetAccessorDeclaration(p)) {
        const e = ts.isShorthandPropertyAssignment(p) ? p.name : p.initializer;
        const code = expr(e), name = `od${tempCount++}_`, fd = dtype(typeOf(e), e);
        pending.push(`var ${name}: ${fd} := ${code};`);
        fields.set(p.name.text, { code: name, d: fd });
      }
      const values = n.properties.map((p) => `${dn(p.name.text)} := ${(ts.isMethodDeclaration(p) || ts.isGetAccessorDeclaration(p)) ? methodValue(p, fields) : fields.get(p.name.text).code}`);
      const value = `${d}(${values.join(', ')})`;
      const ctx = expected ?? checker.getContextualType(n);
      return ctx ? convertD(value, d, dtype(isOptional(ctx) ? baseOf(ctx) : ctx, n)) : value;
    }
    const ctx = expected ?? checker.getContextualType(n) ?? typeOf(n);
    let recT = ctx && !isOptional(ctx) ? ctx : null;
    if (ctx && isOptional(ctx)) recT = baseOf(ctx);
    const first = n.properties[0];
    if (first && ts.isSpreadAssignment(first)) recT = typeOf(first.expression);
    if (!recT || !isRecordish(recT)) recT = typeOf(n);
    const rname = dtype(recT, n);
    if (rname.startsWith('Ext_') || rname === 'Any') {
      const vals = [];
      for (const p of n.properties) {
        if (ts.isSpreadAssignment(p)) vals.push(expr(p.expression));
        else if (ts.isShorthandPropertyAssignment(p)) vals.push(expr(p.name));
        else if (ts.isPropertyAssignment(p)) vals.push(ts.isArrowFunction(p.initializer) ? lambda(p.initializer, p.initializer.parameters.length, [], true) : expr(p.initializer));
        else if (ts.isMethodDeclaration(p)) vals.push(opaqueFn(p));
      }
      const types = vals.map((v, i) => { const p = n.properties[i]; const t = ts.isPropertyAssignment(p) ? typeOf(p.initializer) : ts.isShorthandPropertyAssignment(p) ? typeOf(p.name) : ts.isMethodDeclaration(p) ? typeOf(p) : typeOf(p.expression); try { return dtype(t, p); } catch { return anyType(); } });
      const id = external(`lit_${mangle(rname)}_${hash(n.properties.map((p) => p.name ? p.name.getText(sf) : '...').join(','))}`, types, rname);
      return `${id}(${vals.join(', ')})`;
    }
    if (rname.startsWith('map<')) {
      const ix = stringIndex(recT);
      const vt = ix ? ix.type : undefined;
      const entries = []; const pieces = [];
      for (const p of n.properties) {
        if (ts.isSpreadAssignment(p)) { // `{ ...m, k: v }` on a dictionary: a map merge, later keys winning
          pieces.push(entries.length ? `map[${entries.join(', ')}]` : null); entries.length = 0; pieces.push(outerParens(expr(p.expression))); continue;
        }
        const keyCode = ts.isPropertyAssignment(p) && ts.isComputedPropertyName(p.name) ? outerParens(expr(p.name.expression)) : strEsc(ts.isShorthandPropertyAssignment(p) ? p.name.text : ts.isIdentifier(p.name) ? p.name.text : p.name.getText(sf).replace(/^["']|["']$/g, ''));
        const val = ts.isShorthandPropertyAssignment(p) ? expr(p.name, vt) : expr(p.initializer, vt);
        entries.push(`${keyCode} := ${outerParens(val)}`);
      }
      if (pieces.length) { if (entries.length) pieces.push(`map[${entries.join(', ')}]`); const ps = pieces.filter(Boolean); return ps.length === 1 ? ps[0] : ps.map((x) => `(${x})`).join(' + '); }
      return entries.length ? `map[${entries.join(', ')}]` : `map[]`;
    }
    const propT = (name) => { const p = checker.getPropertyOfType(recT, name); return p ? checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? n) : undefined; };
    const propOpt = (name) => { const p = checker.getPropertyOfType(recT, name); return !!p && !!(p.flags & ts.SymbolFlags.Optional); };
    const keyOf = (p) => (ts.isIdentifier(p.name) ? p.name.text : p.name.getText(sf).replace(/^["']|["']$/g, ''));
    const fieldCode = (key, valueNode) => {
      const pt = propT(key);
      let code = expr(valueNode, pt);
      if (propOpt(key) && !isOptional(pt ?? typeOf(valueNode)) && !isOptional(typeOf(valueNode))) { usesOption = true; code = `Some(${code})`; }
      return [key, code];
    };
    const fields = [];
    for (const p of n.properties) {
      if (ts.isSpreadAssignment(p)) continue;
      if (ts.isShorthandPropertyAssignment(p)) fields.push(fieldCode(p.name.text, p.name));
      else if (ts.isPropertyAssignment(p)) fields.push(fieldCode(keyOf(p), p.initializer));
    }
    if (first && ts.isSpreadAssignment(first)) {
      const base = expr(first.expression);
      if (!fields.length) return base;
      return `${base}.(${fields.map(([k, v]) => `${dn(k)} := ${outerParens(v)}`).join(', ')})`;
    }
    // missing optional fields are None
    const given = new Set(fields.map(([k]) => k));
    for (const p of checker.getPropertiesOfType(recT)) if (!given.has(p.name) && (p.flags & ts.SymbolFlags.Optional)) { usesOption = true; fields.push([p.name, missingD(dtype(checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? n), n))]); }
    return `${rname}(${fields.map(([k, v]) => `${dn(k)} := ${outerParens(v)}`).join(', ')})`;
  }
  // a function value the gate does not interpret: a constant named by the hash of its normalised text, so the same text on
  // both sides is the same value and any change to it is a different one; used for callbacks handed to outside calls
  const isJsxLit = (x) => { while (ts.isParenthesizedExpression(x)) x = x.expression; return ts.isJsxElement(x) || ts.isJsxSelfClosingElement(x) || ts.isJsxFragment(x); };
  // the text of a JSX text child, by the JSX rule: lines are trimmed, blank lines dropped, the rest joined by one space;
  // text on one line keeps its spaces. Null when nothing is left
  function jsxTextOf(c) {
    const raw = c.text;
    if (!raw.includes('\n')) return raw.length ? raw : null;
    const lines = raw.split('\n').map((l) => l.trim()).filter((l) => l.length);
    return lines.length ? lines.join(' ') : null;
  }
  // a child expression as a JsxNode: an element, a conditional of elements, or a value converted by its type
  function jsxChild(e) {
    while (ts.isParenthesizedExpression(e)) e = e.expression;
    jsxType();
    if (isJsxLit(e)) return jsxNode(e);
    if (ts.isBinaryExpression(e) && e.operatorToken.kind === K.AmpersandAmpersandToken) return `(if ${outerParens(truthy(e.left))} then ${jsxChild(e.right)} else JsxNothing)`;
    if (ts.isBinaryExpression(e) && e.operatorToken.kind === K.BarBarToken) return `(if ${outerParens(truthy(e.left))} then ${jsxChild(e.left)} else ${jsxChild(e.right)})`;
    if (ts.isConditionalExpression(e)) return `(if ${outerParens(truthy(e.condition))} then ${jsxChild(e.whenTrue)} else ${jsxChild(e.whenFalse)})`;
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e) || ts.isTemplateExpression(e)) return `JsxText(${expr(e)})`;
    if (e.kind === K.NullKeyword || (ts.isIdentifier(e) && e.text === 'undefined') || e.kind === K.TrueKeyword || e.kind === K.FalseKeyword) return 'JsxNothing';
    const t = typeOf(e);
    const d = isAny(t) ? anyType() : dtype(t, e);
    return convertD(expr(e), d, 'JsxNode');
  }
  // an attribute boxes its value; a handler retains its lambda or deferred closure reading
  function jsxAttrValue(x) {
    while (ts.isParenthesizedExpression(x)) x = x.expression;
    if (ts.isArrowFunction(x)) return convertD(expr(x), dtype(typeOf(x), x), anyType());
    if (isJsxLit(x)) return convertD(jsxNode(x), 'JsxNode', 'Any');
    const t = typeOf(x);
    if (isAny(t)) return expr(x);
    return convertD(expr(x), dtype(t, x), 'Any');
  }
  function jsxNode(n) {
    jsxType();
    let tagCode, attrs, kids;
    if (ts.isJsxFragment(n)) { tagCode = '""'; attrs = []; kids = n.children; }
    else {
      const open = ts.isJsxSelfClosingElement(n) ? n : n.openingElement;
      const tag = open.tagName;
      if (ts.isIdentifier(tag)) {
        const o = /^[a-z]/.test(tag.text) ? { kind: null } : originOf(checker, tag, sf, currentUnit?.node ?? null);
        tagCode = o.kind === 'local' && (typeOf(tag).flags & TF.StringLike) ? expr(tag) : strEsc(tag.text); // a component is named; a local string tag is its value
      } else tagCode = strEsc(tag.getText(sf));
      attrs = open.attributes.properties; kids = ts.isJsxElement(n) ? n.children : [];
    }
    // props: map literals and spreads merged in source order; a later key wins, as in JavaScript
    const pieces = []; let entries = [];
    const flush = () => { if (entries.length) { pieces.push(`map[${entries.join(', ')}]`); entries = []; } };
    for (const a of attrs) {
      if (ts.isJsxSpreadAttribute(a)) { flush(); const t = typeOf(a.expression); const d = isAny(t) ? anyType() : dtype(t, a); pieces.push(`${external(`props_of_${mangle(d)}`, [d], 'map<string, Any>')}(${expr(a.expression)})`); continue; }
      const name = a.name.getText(sf);
      let val;
      if (!a.initializer) val = convertD('true', 'bool', 'Any');
      else if (ts.isStringLiteral(a.initializer)) val = convertD(strEsc(a.initializer.text), 'string', 'Any');
      else if (ts.isJsxExpression(a.initializer)) { if (!a.initializer.expression) continue; val = jsxAttrValue(a.initializer.expression); }
      else val = convertD(jsxNode(a.initializer), 'JsxNode', 'Any');
      entries.push(`${strEsc(name)} := ${val}`);
    }
    flush();
    const props = pieces.length === 0 ? 'map[]' : pieces.length === 1 ? pieces[0] : pieces.map(outerParens).join(' + ');
    const items = [];
    for (const c of kids) {
      if (ts.isJsxText(c)) { const t = jsxTextOf(c); if (t !== null) items.push(`JsxText(${strEsc(t)})`); }
      else if (ts.isJsxExpression(c)) { if (!c.expression) continue; items.push(c.dotDotDotToken ? `JsxList(${seqOf(c.expression)})` : jsxChild(c.expression)); }
      else items.push(jsxNode(c));
    }
    return `JsxElem(${tagCode}, ${props}, [${items.join(', ')}])`;
  }
  // `let x;` with no type: the type the checker gives the value of its first assignment in the unit (an evolving let)
  const letTypes = new Map(); // symbol of an untyped `let x;` -> its Dafny type (Option<T> of the first assigned type)
  const letTypeOf = (sym) => (sym && letTypes.has(sym) ? letTypes.get(sym) : null);
  function firstAssignedType(nameNode) {
    const sym = checker.getSymbolAtLocation(nameNode); if (!sym) return null;
    let found = null;
    const w = (x) => { if (found) return; if (ts.isBinaryExpression(x) && x.operatorToken.kind === K.EqualsToken && ts.isIdentifier(x.left) && checker.getSymbolAtLocation(x.left) === sym) { found = typeOf(x.right); return; } ts.forEachChild(x, w); };
    if (currentUnit) w(currentUnit.body);
    return found;
  }
  // deferred calls are data: their callee, arguments, order and return behavior, without running the world. The arrow
  // is read by handlers.mjs (shared with lane B's interpreter); here its steps are rendered as Dafny values
  function reactHandler(cb) {
    const h = readHandler(checker, sf, cb, { isSetter: (s) => (currentSlots && setterSlot.has(s) ? setterSlot.get(s) : null), unitBody: currentUnit?.body ?? null, unitNode: currentUnit?.node ?? null });
    if (!h) return null;
    anyType();
    addPrelude('ReactExpr', 'datatype ReactExpr = ReactAtom(atom: Any) | ReactExpr(op: string, operands: seq<ReactExpr>) | ReactParam(index: int)');
    addPrelude('ReactStep', 'datatype ReactStep = ReactCall(callee: string, receiver: seq<ReactExpr>, args: seq<ReactExpr>, returnsResult: bool) | ReactReturn(value: ReactExpr) | ReactSet(slot: int, next: Any) | ReactSetExpr(slot: int, nextExpr: ReactExpr)');
    addPrelude('ReactHandler', 'datatype ReactHandler = ReactHandler(steps: seq<ReactStep>)');
    const symOf = (e) => (ts.isIdentifier(e) ? checker.getSymbolAtLocation(e) : null);
    // a parameter of the handler is the atom ReactParam(k); a local stands for its initializer
    const box = (e) => {
      if (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e)) return box(e.expression);
      const s = symOf(e);
      if (s && h.params.includes(s)) return `ReactParam(${h.params.indexOf(s)})`;
      if (s && h.locals.has(s)) return box(h.locals.get(s));
      if (ts.isPropertyAccessExpression(e)) return `ReactExpr(${strEsc('get:' + e.name.text)}, [${box(e.expression)}])`;
      if (ts.isBinaryExpression(e)) return `ReactExpr(${strEsc('binary:' + ts.tokenToString(e.operatorToken.kind))}, [${box(e.left)}, ${box(e.right)}])`;
      if (ts.isPrefixUnaryExpression(e)) return `ReactExpr(${strEsc('unary:' + ts.tokenToString(e.operator))}, [${box(e.operand)}])`;
      if (ts.isConditionalExpression(e)) return `ReactExpr("conditional", [${[e.condition, e.whenTrue, e.whenFalse].map(box).join(', ')}])`;
      if (ts.isTemplateExpression(e)) return `ReactExpr(${strEsc('template:' + JSON.stringify([e.head.text, ...e.templateSpans.map((s) => s.literal.text)]))}, [${e.templateSpans.map((s) => box(s.expression)).join(', ')}])`;
      return `ReactAtom(${expr(e, anyTarget())})`;
    };
    // the handler's locals a value reads, bound as a Dafny let before it (as lambda binds its parameters)
    const withLocals = (node, code) => { const ls = localsOf(checker, node, h); return ls.length ? `(${ls.map((s) => { const init = h.locals.get(s); return `var ${dn(s.name)} := ${expr(init, checker.getTypeAtLocation(s.valueDeclaration.name))};`; }).join(' ')} ${code})` : code; };
    // a setter of a slot unit: the step carries the NEXT value of the slot (the handler captured this render's values; an
    // updater is applied to the slot's running value, so chained updaters compose), not the setter's descriptor; a next
    // value that reads a parameter of the handler is the symbolic tree ReactSetExpr, and the slot's running value is
    // then unknown to a later updater
    const cur = currentSlots ? Array.from({ length: currentSlots.n }, (_, i) => `slots.s${i}`) : null;
    let refused = false;
    const setStep = (sp) => {
      if (!cur || sp.kind !== 'set') return null;
      const i = sp.slot, D = currentSlots.types[i], a = sp.args[0];
      if (mentionsParam(checker, a, h)) {
        if (sp.updater) { refused = true; return null; } // an updater over the event: no Dafny value and no tree for it
        cur[i] = null;
        return `ReactSetExpr(${i}, ${box(a)})`;
      }
      let code;
      try {
        if (ts.isArrowFunction(a) && a.parameters.length <= 1 && !a.modifiers?.some((m) => m.kind === K.AsyncKeyword)) { if (cur[i] === null) { refused = true; return null; } code = withLocals(a, `(${lambda(a, 1, [checker.getTypeAtLocation(a.parameters[0]?.name ?? a)])})(${cur[i]})`); }
        else code = withLocals(a, outerParens(expr(a, checker.getTypeAtLocation(a))));
      } catch (e) { if (!(e instanceof Unsupported)) throw e; return null; }
      cur[i] = code;
      return `ReactSet(${i}, ${convertD(code, D, anyType())})`;
    };
    const callOf = (s) => (s.kind === 'set' ? { name: 'value', recv: [s.callee], args: s.args, returns: s.returns } : s);
    const codes = h.steps.map((s) => s.kind !== 'return' ? (setStep(s) ?? ((c) => `ReactCall(${strEsc(c.name)}, [${c.recv.map(box).join(', ')}], [${c.args.map(box).join(', ')}], ${c.returns})`)(callOf(s))) : `ReactReturn(${s.value ? box(s.value) : `ReactAtom(${convertD('Unit', 'Unit', anyType())})`})`);
    if (refused) return null;
    const d = dtype(typeOf(cb), cb);
    return `${external(`react_handler_${mangle(d)}`, ['ReactHandler'], d)}(ReactHandler([${codes.join(', ')}]))`;
  }
  function opaqueFn(cb) {
    const text = cb.getText(sf);
    const t = typeOf(cb); let d;
    try { d = ts.isGetAccessorDeclaration(cb) && ts.isObjectLiteralExpression(cb.parent) ? literalFunctionType(cb) : dtype(t, cb); } catch { d = anyType(); }
    const reads = closureReads(checker, cb);
    const calls = new Set(), imports = new Set(), accessorKeys = new Set(); let capturesThis = false;
    const walk = (n) => {
      if (ts.isPropertyAccessExpression(n)) for (const decl of checker.getSymbolAtLocation(n.name)?.declarations ?? []) {
        if ((ts.isGetAccessorDeclaration(decl) || ts.isSetAccessorDeclaration(decl)) && decl.getSourceFile() === sf) accessorKeys.add(iteratorProgram(decl));
      }
      if (n.kind === K.ThisKeyword) capturesThis = true;
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.expression.kind === K.ThisKeyword && currentUnit?.className) {
        const name = `${currentUnit.className}.${n.expression.name.text}`;
        if (fns.has(name)) calls.add(dn(snake(name.replace('.', '_'))));
      }
      if (ts.isIdentifier(n)) {
        const o = originOf(checker, n, sf, currentUnit?.node ?? null);
        if (o.kind === 'unit' && fns.has(n.text)) calls.add(dn(snake(n.text)));
        if (o.kind === 'import') {
          const d = checker.getSymbolAtLocation(n)?.declarations?.[0];
          let imp = d; while (imp && !ts.isImportDeclaration(imp)) imp = imp.parent;
          if (imp) imports.add(`${n.text}:${imp.moduleSpecifier.text}:${ts.isImportSpecifier(d) ? (d.propertyName ?? d.name).text : '*'}`);
        }
      }
      ts.forEachChild(n, walk);
    };
    walk(cb.body);
    if (calls.size) addPrelude(`fn_calls_${hash(text)}`, `// CALLS: ${[...calls].sort().join(',')}`);
    const captures = reads.map((r) => expr(r, anyTarget()));
    if (capturesThis && objectData) for (const f of objectData.values()) captures.push(convertD(f.code, f.d, anyType()));
    else if (capturesThis && classOf(currentUnit)) captures.push(convertD(SELF, selfType(currentUnit), anyType()));
    // a function value is its code and its captured cells (research 15 §5, Fn(code, env)): the code id is the closure's
    // text with the imports and accessors it reaches; two closures are equal when their code ids and captured cells
    // agree, and nothing else makes them so. The unit's code ids are listed in its `// FN` header, which the theorem
    // checks every Fn literal of the unit against: a body outside the file's list is refused.
    addPrelude('Fn', 'datatype Fn = Fn(code: string, env: seq<Any>)');
    const code = Buffer.from(JSON.stringify([text, [...imports].sort(), [...accessorKeys].sort()]), 'utf8').toString('hex');
    if (currentUnit) { const set = fnIdsOf.get(currentUnit.name) ?? new Set(); set.add(code); fnIdsOf.set(currentUnit.name, set); }
    return `${external(`fn_${mangle(d)}`, ['Fn'], d)}(Fn(${strEsc(code)}, [${captures.join(', ')}]))`;
  }
  function lambda(cb, arity, paramTypes = [], opaqueOk = false) {
    if (opaqueOk && !ts.isIdentifier(cb) && (containsEffect(cb.body) || cb.modifiers?.some((m) => m.kind === K.AsyncKeyword))) return reactHandler(cb) ?? opaqueFn(cb);
    if (ts.isIdentifier(cb)) {
      // a named callback: a same-file function or a local function value, applied through a lambda of the expected shape
      const o = originOf(checker, cb, sf, currentUnit?.node ?? null);
      const sg = checker.getSignaturesOfType(typeOf(cb), ts.SignatureKind.Call)[0];
      if (!sg) fail(cb, `${cb.text} is not a function`);
      const ps = sg.getParameters();
      const names = ps.map((p, i) => `a${i}_: ${dtype(paramTypes[i] ?? checker.getTypeOfSymbolAtLocation(p, cb), cb)}`);
      for (let i = ps.length; i < arity; i++) names.push(`uu${i}_: int`);
      const argList = ps.map((_, i) => `a${i}_`).join(', ');
      if (o.kind === 'unit' && fns.get(cb.text)) {
        if (effectfulUnits.has(cb.text)) fail(cb, `${cb.text} has effects; it cannot be a callback`);
        return `((${names.join(', ')}) => ${fname(cb.text)}(${[...fuelArg(fns.get(cb.text)), argList].filter(Boolean).join(', ')}))`;
      }
      if (o.kind === 'local') return `((${names.join(', ')}) => ${ident(cb)}(${argList}))`;
      fail(cb, `${cb.text} is not a same-file function or a local function value`);
    }
    if (containsEffect(cb.body)) fail(cb, 'an effect inside a callback; the order of its world transitions is not defined');
    const names = [];
    const lets = [];
    cb.parameters.forEach((p, i) => {
      const pt = paramTypes[i] ?? typeOf(p.name);
      if (ts.isIdentifier(p.name)) names.push(`${dn(p.name.text)}: ${dtype(pt, p)}`);
      else { const pn = `pp${i}_`; names.push(`${pn}: ${dtype(typeOf(p.name), p)}`); lets.push(...destructure(p.name, pn, typeOf(p.name))); }
    });
    for (let i = cb.parameters.length; i < arity; i++) names.push(`uu${i}_: int`);
    let body;
    if (ts.isBlock(cb.body)) {
      // a callback body is its own function: its returns are its own, not the enclosing loop's
      const saved = loopCtx.splice(0, loopCtx.length);
      try { body = tr([...cb.body.statements], () => fail(cb, 'callback path ends without a return'), { fn: cb, node: cb, name: 'callback', params: cb.parameters, body: cb.body }); }
      finally { loopCtx.push(...saved); }
    } else body = outerParens(capture(() => expr(cb.body)));
    return `((${names.join(', ')}) => ${lets.length ? `(${lets.join(' ')} ${body})` : body})`;
  }
  // `const {a, b: c} = e` → let-lines binding each name
  // srcType: the TypeScript type of the value being taken apart (so a default applies where the field is optional)
  function destructure(pattern, sourceCode, srcType = null, hookRow = null) {
    const out = [];
    if (ts.isIdentifier(pattern)) return [`var ${dn(pattern.text)} := ${sourceCode};`];
    if (ts.isObjectBindingPattern(pattern) && hookRow && !hookRow.result['*']) { // the table's record: each field as the datatype carries it
      for (const el of pattern.elements) { if (el.dotDotDotToken || !ts.isIdentifier(el.name)) fail(el, 'a hook result is taken apart field by field'); const prop = el.propertyName ? el.propertyName.getText(sf) : el.name.text; if (!Object.hasOwn(hookRow.result, prop)) fail(el, `${prop} is not a field the hook table declares for ${hookRow.hook}`); out.push(`var ${dn(el.name.text)} := ${sourceCode}.${prop};`); }
      return out;
    }
    if (ts.isObjectBindingPattern(pattern)) {
      for (const el of pattern.elements) {
        if (el.dotDotDotToken) {
          const rt = typeOf(el.name), rd = dtype(rt, el);
          const props = checker.getPropertiesOfType(rt).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
          if (!props.length || rd.startsWith('Ext_') || rd === 'Any') fail(el, 'record rest needs a fixed nonempty scalar field set');
          out.push(`var ${dn(el.name.text)} := ${rd}(${props.map((p) => `${sourceCode}.${dn(p.name)}`).join(', ')});`);
          continue;
        }
        const prop = el.propertyName ? (ts.isStringLiteral(el.propertyName) ? el.propertyName.text : el.propertyName.getText(sf)) : el.name.text;
        const pt = srcType ? checker.getTypeOfPropertyOfType(baseOf(srcType), prop) : null;
        let code = `${sourceCode}.${dn(prop)}`;
        if (srcType) { const sd = (() => { try { return dtype(baseOf(srcType), el); } catch { return null; } })(); if (sd === 'Any' || (sd && sd.startsWith('Ext_'))) { const fd = pt ? (() => { try { return dtype(pt, el); } catch { return anyType(); } })() : anyType(); code = sd === 'Any' ? `${external(`Any_${prop}`, [anyType()], fd)}(${sourceCode})` : `${external(`${sd}_${prop}`, [sd], fd)}(${sourceCode})`; } } // a field of an opaque value: an accessor
        if (el.initializer) {
          // `{ a = d }`: the field's value when present, the default when the field is absent or undefined
          const pd = pt ? dtype(pt, el) : null;
          if (pd && optionalD(pd)) {
            usesOption = true;
            const target = typeOf(el.name), dflt = outerParens(expr(el.initializer, target));
            const v = `nd${tempCount++}_`;
            if (bothAbsent(pt)) code = `(var ${v} := ${code}; if ${v}.Undef? then ${dflt} else ${convert(v, pt, target, el)})`;
            else if (hasAbsence(pt, TF.Undefined)) code = `(if ${code}.Some? then ${convert(`${code}.value`, baseOf(pt), target, el)} else ${dflt})`;
          }
          // a required field never takes the default
        }
        if (ts.isIdentifier(el.name)) out.push(`var ${dn(el.name.text)} := ${code};`);
        else out.push(...destructure(el.name, code, pt));
      }
      return out;
    }
    if (ts.isArrayBindingPattern(pattern)) {
      const tuple = srcType && checker.isTupleType(baseOf(srcType)) && !dtype(baseOf(srcType), pattern).startsWith('seq<');
      pattern.elements.forEach((el, i) => {
        if (ts.isOmittedExpression(el)) return;
        const opaque = srcType && isAny(srcType);
        const elT = ts.isIdentifier(el.name) ? typeOf(el.name) : null;
        if (el.dotDotDotToken) { if (tuple || opaque) fail(el, 'a rest element of a tuple or an opaque value is not translated'); if (ts.isIdentifier(el.name)) out.push(`var ${dn(el.name.text)} := if ${i} <= |${sourceCode}| then ${sourceCode}[${i}..] else [];`); else out.push(...destructure(el.name, `${sourceCode}[${i}..]`)); return; }
        let code = opaque ? `${external(`Any_at_${i}`, ['Any'], elT && !isAny(elT) ? dtype(elT, el) : anyType())}(${sourceCode})` : tuple ? `${sourceCode}.${i}` : `${sourceCode}[${i}]`; // an opaque source: element i is an uninterpreted accessor
        if (el.initializer && !tuple && !opaque) { const dT = elT ?? typeOf(el.initializer); code = `(if ${i} < |${sourceCode}| then ${sourceCode}[${i}] else ${outerParens(expr(el.initializer, dT))})`; } // `[a = d]`: the default past the end
        if (ts.isIdentifier(el.name)) out.push(`var ${dn(el.name.text)} := ${code};`);
        else out.push(...destructure(el.name, code));
      });
      return out;
    }
    return fail(pattern, 'pattern is not translated');
  }
  const elemType = (arrNode) => { const t = baseOf(typeOf(arrNode)); return checker.getTypeArguments(t)[0] ?? checker.getIndexTypeOfType(t, ts.IndexKind.Number); };
  function propAccess(n, keepOption = false) {
    { const rb = hookBinding(n.expression); if (rb && !rb.field && Object.hasOwn(rb.row.result, n.name.text) && !rb.row.result['*']) return `${expr(n.expression)}.${n.name.text}`; } // a field of a hook result: the table's datatype
    if (worldRead(checker, n, sf, currentUnit?.node)) return globalRead(n);
    const name = n.name.text;
    if (objectData && n.expression.kind === K.ThisKeyword && objectData.has(name)) return objectData.get(name).code;
    const literal = literalGetter(n);
    if (literal) { const value = `${expr(n.expression)}.${dn(name)}`; if (exactObjectMethod(literal)) return `(${value})()`; const rd = dtype(typeOf(n), n); return hoist(`${external('get_literal', ['World', literalFunctionType(literal)], `(World, ${rd})`)}(${WORLD}, ${value})`, rd); }
    const getter = accessorOf(n, 'get');
    if (getter) return accessorCall(getter, n, []);
    if (ts.isIdentifier(n.expression)) {
      const o = originOf(checker, n.expression, sf, currentUnit?.node ?? null);
      if (o.kind === 'global' && n.expression.text === 'Number' && name === 'MAX_SAFE_INTEGER') return numLit('9007199254740991', n);
      if (!moduleState(checker, n.expression, sf) && (o.kind === 'import' || o.kind === 'other' || o.kind === 'module' || o.kind === 'global')) {
        // a member of an external object: ext_<obj>_<member>()
        const t = typeOf(n);
        if (isCallable(t)) fail(n, `${n.expression.text}.${name} is a function; call it`);
        return `${external(`${n.expression.text}_${name}`, [], dtype(t, n))}()`;
      }
    }
    if (isWorldField(n)) {
      if (!unitEffectful()) fail(n, 'internal: a world field read in a pure method');
      const ft = typeOf(n); const d = isAny(ft) ? anyType() : dtype(ft, n);
      return hoist(`${worldFieldAccessor(n, 'get', [{ d }])}(${WORLD}, ${SELF})`, d);
    }
    if (isInstanceWorldField(n)) {
      if (!unitEffectful()) fail(n, 'internal: a world field read in a pure unit');
      const ft = typeOf(n); const d = isAny(ft) ? anyType() : dtype(ft, n);
      return hoist(`${fieldAccessor(classTypeD(sameFileClassOf(typeOf(n.expression))), name, 'get', d)}(${WORLD}, ${outerParens(expr(n.expression))})`, d);
    }
    const recvT = n.expression.kind === K.ThisKeyword && classOf(currentUnit) ? checker.getTypeAtLocation(currentUnit.cls.name) : typeOf(n.expression);
    const declaredOpaque = (() => { let e = n.expression; while (ts.isParenthesizedExpression(e)) e = e.expression; if (!ts.isIdentifier(e)) return false; const o = originOf(checker, e, sf, currentUnit?.node ?? null); if (!o.sym || o.kind !== 'local') return false; const dt = symType(o.sym, e); try { return dtype(isOptional(dt) ? baseOf(dt) : dt, n) === 'Any'; } catch { return false; } })();
    const recvD = (() => { try { return dtype(isOptional(recvT) ? baseOf(recvT) : recvT, n); } catch { return null; } })();
    if (isAny(recvT) || (isOptional(recvT) && isAny(baseOf(recvT))) || declaredOpaque || recvD === 'Any') {
      const rd = isAny(typeOf(n)) ? anyType() : dtype(typeOf(n), n);
      let rv;
      if (declaredOpaque) {
        rv = rawOperand(n.expression);
        let e = n.expression; while (ts.isParenthesizedExpression(e)) e = e.expression;
        const o = originOf(checker, e, sf, currentUnit?.node ?? null);
        if (o.sym && isOptional(symType(o.sym, e)) && !isOptional(typeOf(e)) && !isNullish(typeOf(e))) rv += '.value';
      } else rv = expr(n.expression, anyTarget());
      return `${external(`Any_${name}`, [anyType()], rd)}(${rv})`;
    }
    if (n.questionDotToken && !isOptional(recvT) && !isAny(recvT)) return fieldOf(expr(n.expression), recvT, name, n); // ?. on a value that cannot be absent
    if (n.questionDotToken) {
      // a?.b : Option propagation
      const r = `np${tempCount++}_`, receiver = expr(n.expression);
      const inner = baseOf(recvT), fieldT = typeOf(n), D = dtype(fieldT, n);
      usesOption = true;
      const p = checker.getPropertyOfType(inner, name);
      const pt = p ? checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? n) : fieldT;
      const fieldCode = fieldOf(`${r}.value`, inner, name, n);
      return `(var ${r} := ${receiver}; if ${r}.Some? then ${convert(fieldCode, pt, fieldT, n)} else ${missingD(D)})`;
    }
    if (name === 'length' && (isArrayLike(checker, recvT) || recvT.flags & TF.StringLike)) return lenOf(expr(n.expression));
    if (name === 'size' && (isSetT(recvT) || isMapT(recvT))) return lenOf(expr(n.expression));
    if ((name === 'length' || name === 'size') && isOptional(recvT) && (isArrayLike(checker, baseOf(recvT)) || baseOf(recvT).flags & TF.StringLike || isSetT(baseOf(recvT)) || isMapT(baseOf(recvT)))) { usesOption = true; const v = `ol_${hash(n.getText(sf)).slice(0, 4)}`; return `(var ${v} := ${rawOperand(n.expression)}; if ${v}.Some? then Some(|${v}.value|) else None)`; } // `a?.b.length`: the length when the chain holds
    if (keepOption) n.__keepOption = true;
    const base = fieldOf(expr(n.expression), recvT, name, n);
    n.__keepOption = false;
    return base;
  }
  function fieldOf(recvCode, recvT, name, n) {
    const members = sums.get(dtype(recvT, n));
    if (members) return sumCases(recvCode, members, (m, v) => { const ft = checker.getTypeOfPropertyOfType(m.t, name); return convert(fieldOf(`${v}.${m.field}`, m.t, name, n), ft, typeOf(n), n); });
    const prop = checker.getPropertyOfType(recvT, name);
    if (prop && !(prop.flags & ts.SymbolFlags.Optional) && !assertionDerived(n.expression)) {
      const literal = literalValue(checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration ?? n));
      if (literal !== null) return literal;
    }
    // a local narrowed by a type guard is still the value of its declared type in Dafny
    { let e = n.expression; while (e && ts.isParenthesizedExpression(e)) e = e.expression;
      if (e && ts.isIdentifier(e)) { const o = originOf(checker, e, sf, currentUnit?.node ?? null); if (o.kind === 'local' && o.sym) { const dt = symType(o.sym, e); const bd = isOptional(dt) ? baseOf(dt) : dt; if (isRecordish(bd) && dtype(bd, n) !== dtype(recvT, n)) recvT = bd; } } }
    if (isRecordish(recvT)) {
      const props = checker.getPropertiesOfType(recvT);
      const hasMethods = props.some((p) => isCallable(checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? n)));
      const T = dtype(recvT, n);
      const ft = typeOf(n);
      if ((hasMethods && !literalRecord(recvT)) || T.startsWith('Ext_') || !props.length || !checker.getPropertyOfType(recvT, name)) {
        // an opaque type, or a field reached through an index signature: an uninterpreted accessor of the DECLARED field
        // type (one declaration per accessor); a read narrowed by a guard takes `.value`
        if (T.startsWith('map<')) return `(if ${strEsc(name)} in ${recvCode} then Some(${recvCode}[${strEsc(name)}]) else None)`;
        const pr = checker.getPropertyOfType(recvT, name);
        const declared = pr ? checker.getTypeOfSymbolAtLocation(pr, pr.valueDeclaration ?? n) : ft;
        const dOpt = pr ? (isOptional(declared) || !!(pr.flags & ts.SymbolFlags.Optional)) : false;
        let rd = isAny(declared) ? anyType() : dtype(declared, n);
        if (dOpt && !optionalD(rd)) { usesOption = true; rd = `Option<${rd}>`; }
        const code = `${external(`${T}_${name}`, [T], rd)}(${recvCode})`;
        if (dOpt && !isOptional(ft) && !isNullish(ft) && !n.__keepOption) return `${code}.value`;
        return n.__keepOption ? code : narrowed(code, declared, ft, n);
      }
    }
    const p = isRecordish(recvT) ? checker.getPropertyOfType(recvT, name) : null;
    if (p) {
      const declared = checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? n);
      const here = typeOf(n);
      if (!n.__keepOption) {
        const value = narrowed(`${recvCode}.${dn(name)}`, declared, here, n);
        if (isNullish(here) || isOptional(here)) return value;
        const declaredD = dtype(isOptional(declared) ? baseOf(declared) : declared, n), hereD = dtype(here, n);
        if (declaredD !== hereD) {
          const members = sums.get(declaredD);
          if (members) { const matches = members.filter((m) => checker.isTypeAssignableTo(m.t, here)); return matches.length === 1 ? `${value}.${matches[0].field}` : convertD(value, declaredD, hereD); }
          if (declaredD === 'Any') return convertD(value, declaredD, hereD);
        }
        return value;
      }
    }
    return `${recvCode}.${dn(name)}`;
  }
  // `m[k]` on a string-indexed object: {map, key} or null
  function dictRead(e) {
    while (ts.isParenthesizedExpression(e)) e = e.expression;
    if (!ts.isElementAccessExpression(e)) return null;
    const rt = baseOf(typeOf(e.expression));
    const ix = stringIndex(rt);
    if (!ix || checker.getPropertiesOfType(rt).length) return null;
    return { map: expr(e.expression), key: expr(e.argumentExpression), valueType: ix.type };
  }
  function elemAccess(n) {
    const q = argumentsParam(n); if (q) return dn(q.name.text); // `arguments[k]`: the k-th parameter itself
    if (worldRead(checker, n, sf, currentUnit?.node)) return globalRead(n);
    const recvT = typeOf(n.expression);
    if (checker.isTupleType(recvT) && !dtype(recvT, n).startsWith('seq<')) {
      if (!ts.isNumericLiteral(n.argumentExpression)) fail(n, 'tuple index must be a literal');
      return `${expr(n.expression)}.${n.argumentExpression.text}`;
    }
    const at = typeOf(n.argumentExpression);
    if (isAny(recvT) || isAny(at)) {
      const rd = isAny(typeOf(n)) ? anyType() : dtype(typeOf(n), n);
      return `${external('Any_index', [anyType(), anyType()], rd)}(${expr(n.expression, anyTarget())}, ${expr(n.argumentExpression, anyTarget())})`;
    }
    const base = baseOf(recvT);
    if (ts.isStringLiteral(n.argumentExpression) && isRecordish(base)) return fieldOf(expr(n.expression), base, n.argumentExpression.text, n);
    const d = dictRead(n);
    if (d) { const V = dtype(stringIndex(base).type, n); return `(if ${d.key} in ${d.map} then ${d.map}[${d.key}] else ${external(`absent_${V}`, [], V)}())`; }
    if (isRecordish(base)) {
      // a finite key selects a declared field; receiver and key are evaluated once, in that order
      const keyParts = at.flags & TF.Union ? at.types : [at];
      if (!keyParts.every((x) => x.flags & TF.StringLiteral)) fail(n, 'use a finite union of declared string keys');
      const keys = keyParts.map((x) => x.value);
      const R = `rr${tempCount++}_`, Kc = `rk${tempCount++}_`;
      const receiver = expr(n.expression);
      const key = expr(n.argumentExpression);
      const td = dtype(typeOf(n), n);
      const read = (k) => {
        const p = checker.getPropertyOfType(base, k);
        if (!p) fail(n, `key ${k} is not a declared data field`);
        const pt = checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? n);
        let fd = dtype(pt, n);
        if ((p.flags & ts.SymbolFlags.Optional) && !optionalD(fd)) { usesOption = true; fd = `Option<${fd}>`; }
        n.__keepOption = true;
        let code;
        try { code = fieldOf(R, base, k, n); } finally { n.__keepOption = false; }
        // a guard may narrow the selected optional value; selection still starts with its declared type
        if (optionalD(fd) && !optionalD(td) && td !== 'Any') return isNullish(typeOf(n)) ? absentValue(typeOf(n)) : convertD(`${code}.value`, innerOf(fd), td);
        return convert(code, pt, typeOf(n), n);
      };
      let out = read(keys[keys.length - 1]);
      for (let i = keys.length - 2; i >= 0; i--) out = `(if ${Kc} == ${strEsc(keys[i])} then ${read(keys[i])} else ${out})`;
      return `(var ${R} := ${receiver}; var ${Kc} := ${key}; ${out})`;
    }
    if (recvT.flags & TF.StringLike) return `[${expr(n.expression)}[${index(n.argumentExpression)}]]`; // s[i] is a one-char string
    return `${expr(n.expression)}[${index(n.argumentExpression)}]`;
  }
  function newExpr(n) {
    const form = exactPromiseForm(n);
    if (form) return promiseExpression(n, form);
    const name = n.expression.getText(sf);
    const t = typeOf(n);
    if (name === 'Set') {
      const A = dtype(checker.getTypeArguments(t)[0], n);
      if (!n.arguments?.length) return `(var s0: set<${A}> := {}; s0)`;
      return `${helper('SetOf', [A])}(${seqOf(n.arguments[0])})`;
    }
    if (name === 'RegExp') { addPrelude('Ext_RegExp', 'type Ext_RegExp'); return externalCall('RegExp_new', n, [...(n.arguments ?? [])]); }
    if (name === 'Map') {
      const [kt, vt] = checker.getTypeArguments(t);
      const Kd = dtype(kt, n), Vd = dtype(vt, n);
      if (!n.arguments?.length) return `map[]`;
      const id = external('map_of_pairs', [`seq<(${Kd}, ${Vd})>`], `map<${Kd}, ${Vd}>`);
      return `${id}(${seqOf(n.arguments[0])})`;
    }
    const cls = classRef(n.expression);
    if (cls) {
      // `new C(args)` of a same-file class: a fresh handle from the world; then the constructor unit on it, or, when the
      // class declares none, its field initialisers written in declaration order
      if (!unitEffectful()) fail(n, 'internal: a same-file constructor called from a pure unit');
      const Tn = classTypeD(cls);
      const h = hoist(`${external(`alloc_${mangle(Tn)}`, ['World'], `(World, ${Tn})`)}(${WORLD})`, Tn);
      const ctor = fns.get(`${cls.name.text}.constructor`);
      if (ctor) { if (failedUnits.has(ctor.name)) fail(n, `the constructor of ${cls.name.text} was not translated`); const args = unitArgs(ctor, n); hoist(`${fname(ctor.name)}(${[WORLD, ...fuelArg(ctor), h, ...args].join(', ')})`, 'Unit'); if (!faultMode && completionMode && exceptionUnits.has(ctor.name)) pending.push(FAULT_CHECK); }
      else initFields(cls, h);
      return h;
    }
    // any other constructor: an uninterpreted external of its arguments, typed by what it builds
    return externalCall(`new_${mangle(name)}`, n, [...(n.arguments ?? [])]);
  }
  // the field initialisers of a class (`total = 0`), written on a handle in declaration order
  function initFields(cls, h) {
    const Tn = classTypeD(cls);
    for (const m of cls.members) {
      if (!ts.isPropertyDeclaration(m) || !m.initializer || !ts.isIdentifier(m.name) || m.modifiers?.some((x) => x.kind === K.StaticKeyword)) continue;
      const ft = typeOf(m.name); const d = isAny(ft) ? anyType() : dtype(ft, m);
      hoist(`${fieldAccessor(Tn, m.name.text, 'set', d)}(${WORLD}, ${h}, ${outerParens(expr(m.initializer, ft))})`, 'Unit');
    }
  }
  // the start of a constructor unit: the initialisers, then the parameter properties (`constructor(private x: T)`), then the body
  function ctorPrefix(u) {
    return capture(() => {
      initFields(u.cls, SELF);
      const Tn = selfType(u);
      for (const p of u.params) {
        if (!ts.isIdentifier(p.name) || !p.modifiers?.some((x) => x.kind === K.PublicKeyword || x.kind === K.PrivateKeyword || x.kind === K.ProtectedKeyword || x.kind === K.ReadonlyKeyword)) continue;
        const ft = typeOf(p.name); const d = isAny(ft) ? anyType() : dtype(ft, p);
        hoist(`${fieldAccessor(Tn, p.name.text, 'set', d)}(${WORLD}, ${SELF}, ${dn(p.name.text)})`, 'Unit');
      }
      return '';
    });
  }
  function foundValue(code, element, result, n) {
    if (!isOptional(element) && !isNullish(element)) return code;
    const v = `nf${tempCount++}_`, D = dtype(result, n);
    return `(var ${v} := ${code}; if ${v}.Some? then ${convert(`${v}.value`, element, result, n)} else ${missingD(D)})`;
  }
  const cbArity = { map: 2, filter: 2, some: 2, every: 2, find: 2, findIndex: 2, flatMap: 2, reduce: 3 };
  // the fuel a call passes: one less inside the cycle, an uninterpreted start value from outside it
  function fuelArg(callee) {
    if (!recursiveUnits.has(callee.name)) return [];
    if (currentUnit && recursiveUnits.has(currentUnit.name)) return [`${FUEL} - 1`];
    return [`${external('fuel_start', [], 'nat')}()`];
  }
  // the arguments of a call to a same-file unit, shaped to its parameters: a defaulted parameter takes Some(v) or None
  const thisParamOf = (u) => !!(u && u.params && u.params[0] && ts.isIdentifier(u.params[0].name) && u.params[0].name.text === 'this') && u.params[0]; // the declared receiver of a free function (TypeScript's `this` parameter)
  function unitArgs(callee, n, argNodes = n.arguments, sig = checker.getResolvedSignature(n), shift = 0) { // shift: how many leading parameters of the callee the signature does not list (its `this`)
    const out = [];
    callee.params.forEach((p, i) => {
      if (p.dotDotDotToken) { // a rest parameter: the remaining arguments as one sequence (a single spread passes it as it is)
        const restArgs = argNodes.slice(i);
        const rt = typeOf(p.name); const et = isArrayLike(checker, rt) ? (checker.getTypeArguments(rt)[0] ?? checker.getIndexTypeOfType(rt, ts.IndexKind.Number)) : null;
        if (restArgs.length === 1 && ts.isSpreadElement(restArgs[0])) { out.push(seqOf(restArgs[0].expression)); return; }
        if (restArgs.some((x) => ts.isSpreadElement(x))) fail(n, 'a spread among other arguments is not translated');
        out.push(`[${restArgs.map((x) => outerParens(expr(x, et ?? undefined))).join(', ')}]`); return;
      }
      const a = argNodes[i];
      const pt = sig && sig.parameters[i - shift] ? checker.getTypeOfSymbolAtLocation(sig.parameters[i - shift], a ?? n) : typeOf(p.name);
      if (p.initializer && ts.isIdentifier(p.name)) {
        usesOption = true;
        const bodyT = typeOf(p.name), incoming = inputType(p);
        if (hasAbsence(bodyT, TF.Null)) { dtype(incoming, p); out.push(a ? expr(a, incoming) : 'Nullish.Undef'); return; }
        if (!a || (typeOf(a).flags & TF.Undefined)) { if (a) expr(a); out.push('None'); return; }
        if (hasAbsence(typeOf(a), TF.Undefined)) {
          const v = `nd${tempCount++}_`, value = expr(a);
          out.push(`(var ${v} := ${value}; if ${v}.Some? then Some(${convert(`${v}.value`, baseOf(typeOf(a)), bodyT, a)}) else None)`);
        } else out.push(`Some(${outerParens(expr(a, bodyT))})`);
        return;
      }
      if (!a) { if (p.questionToken) { usesOption = true; out.push(missingD(dtype(pt, p))); return; } fail(n, `${callee.name} needs ${callee.params.length} arguments`); }
      out.push(expr(a, pt));
    });
    return out;
  }
  // enumeration of a fresh plain literal has its own keys, independent of the datatype's sorted fields
  const enumerationRecord = (arg) => { const t = typeOf(arg); return isRecordish(t) && !(stringIndex(t) && !checker.getPropertiesOfType(t).length); };
  function recordEnumerationLiteral(arg) {
    let literal = arg, local = false;
    while (ts.isParenthesizedExpression(literal)) literal = literal.expression;
    if (ts.isIdentifier(literal)) {
      const sym = checker.getSymbolAtLocation(literal), d = sym?.valueDeclaration;
      if (d && currentUnit && d.pos >= currentUnit.body.pos && d.end <= currentUnit.body.end && ts.isVariableDeclaration(d) && !d.type && d.initializer && (d.parent.flags & ts.NodeFlags.Const) && ts.isObjectLiteralExpression(d.initializer)) {
        let safe = true;
        const walk = (x) => {
          if (ts.isIdentifier(x) && x !== d.name && checker.getSymbolAtLocation(x) === sym) {
            const c = x.parent;
            if (!(ts.isCallExpression(c) && c.arguments.length === 1 && c.arguments[0] === x && ts.isPropertyAccessExpression(c.expression) && ts.isIdentifier(c.expression.expression) && c.expression.expression.text === 'Object' && originOf(checker, c.expression.expression, sf, currentUnit?.node ?? null).kind === 'global' && ['keys', 'values', 'entries'].includes(c.expression.name.text))) safe = false;
          }
          ts.forEachChild(x, walk);
        };
        walk(currentUnit.body);
        if (safe && !containsEffect(d.initializer)) { literal = d.initializer; local = true; }
      }
    }
    const plain = ts.isObjectLiteralExpression(literal) && literal.properties.every((p) => (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && !ts.isComputedPropertyName(p.name) && p.name.text !== '__proto__');
    const opaqueLocal = local && checker.getPropertiesOfType(typeOf(arg)).some((p) => isCallable(checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? arg)));
    return plain && !opaqueLocal ? { literal, local } : null;
  }
  function recordEnumeration(n, name) {
    const arg = n.arguments[0];
    if (!arg || n.arguments.length !== 1 || !enumerationRecord(arg)) return null;
    const t = typeOf(arg), shape = recordEnumerationLiteral(arg);
    if (!shape) {
      // forgotten own keys and order live in the world; separate reads cannot identify distinct objects
      if (!unitEffectful()) fail(n, 'unknown record enumeration needs the world; use --core');
      const D = dtype(t, n), rd = dtype(typeOf(n), n);
      const value = expr(arg);
      return hoist(`${external(`Object_${name}_source_${hash(sf.text)}`, ['World', D], `(World, ${rd})`)}(${WORLD}, ${value})`, rd);
    }
    const { literal, local } = shape;
    const et = checker.getTypeArguments(typeOf(n))[0];
    const vt = name === 'entries' ? checker.getTypeArguments(et)[1] : et;
    const fields = new Map(), binds = [];
    const effectLiteral = !local && containsEffect(literal);
    const R = local ? expr(arg) : null;
    for (const p of literal.properties) {
      const key = p.name.text;
      const value = ts.isShorthandPropertyAssignment(p) ? p.name : p.initializer;
      let code;
      if (local) {
        const pt = checker.getTypeOfPropertyOfType(t, key);
        code = name === 'keys' ? null : convert(`${R}.${dn(key)}`, pt, vt, n);
      } else {
        const v = `ev${tempCount++}_`;
        const target = name === 'keys' ? typeOf(value) : vt;
        const D = dtype(target, n);
        const valueCode = D === 'Unit' ? 'Unit' : expr(value, target);
        const binding = `var ${v}: ${D} := ${valueCode};`;
        if (effectLiteral) pending.push(binding); else binds.push(binding);
        code = name === 'keys' ? null : v;
      }
      fields.set(key, code);
    }
    const isIndex = (k) => /^(0|[1-9][0-9]*)$/.test(k) && Number(k) < 4294967295;
    const keys = [...fields.keys()].sort((a, b) => isIndex(a) ? (isIndex(b) ? Number(a) - Number(b) : -1) : (isIndex(b) ? 1 : 0));
    const values = keys.map((k) => name === 'keys' ? strEsc(k) : name === 'values' ? fields.get(k) : `(${strEsc(k)}, ${fields.get(k)})`);
    const seq = `[${values.join(', ')}]`;
    return binds.length ? `(${binds.join(' ')} ${seq})` : seq;
  }
  // a serialization's static absence schema distinguishes the two meanings of Option.None
  function absenceSchema(t, seen = new Set(), depth = 0) {
    if (depth > 8 || seen.has(t)) return '';
    seen = new Set(seen).add(t);
    const tag = `${hasAbsence(t, TF.Null) ? 'n' : ''}${hasAbsence(t, TF.Undefined) ? 'u' : ''}`;
    const parts = nonNull(t);
    const fields = parts.flatMap((part) => {
      if (isArrayLike(checker, part)) return checker.getTypeArguments(part).map((a) => absenceSchema(a, seen, depth + 1)).filter(Boolean).map((x) => `[]${x}`);
      if (!isRecordish(part)) return [];
      return checker.getPropertiesOfType(part).map((p) => { const child = absenceSchema(checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? sf), seen, depth + 1); return child ? `${p.name}:${child}` : ''; }).filter(Boolean);
    });
    return tag + (fields.length ? `{${fields.sort().join(',')}}` : '');
  }
  function accessorCall(u, n, args) {
    if (failedUnits.has(u.name)) fail(n, `callee ${u.name} was not translated`);
    const recv = u.isStatic ? [] : [n.expression.kind === K.ThisKeyword ? SELF : expr(n.expression)];
    const eff = effectfulUnits.has(u.name);
    const code = `${fname(u.name)}(${[...(eff ? [WORLD] : []), ...fuelArg(u), ...recv, ...args].join(', ')})`;
    if (!eff) return code;
    const value = hoist(code, u.accessor === 'set' ? 'Unit' : dtype(retType(u), n));
    if (!faultMode && completionMode && exceptionUnits.has(u.name)) pending.push(FAULT_CHECK);
    return value;
  }
  function unitCall(f, callee, n, argNodes, sig, shift) { // a same-file unit applied to argument nodes (its own arguments, or a receiver put first by call/apply)
        if (failedUnits.has(callee.name)) fail(n, `callee ${callee.name} was not translated`);
        if (!core && kindOf.get(callee) === 'method') fail(n, `${f.text} loops, so it is a Dafny method and cannot be called inside an expression`);
        const args = unitArgs(callee, n, argNodes, sig, shift);
        const muts = mutatedOf(callee);
        if (muts.length) {
          // the callee returns (world?, result, p1', ...): bind each new value back to the name that was passed
          const names = muts.map((m) => { const i = callee.params.findIndex((p) => ts.isIdentifier(p.name) && p.name.text === m); let a = argNodes[i]; while (a && ts.isParenthesizedExpression(a)) a = a.expression; if (!a) return null; if (ts.isIdentifier(a)) return dn(a.text); if (ts.isArrayLiteralExpression(a) || ts.isObjectLiteralExpression(a) || ts.isNewExpression(a)) return `_`; fail(a, `the argument for \`${m}\`, which ${f.text} changes, must be a name or a fresh literal`); });
          const eff = effectfulUnits.has(f.text);
          if (eff && !unitEffectful()) fail(n, 'internal: effectful callee in a pure unit');
          let rt = checker.getSignatureFromDeclaration(callee.fn).getReturnType(); if (isPromiseT(rt)) rt = checker.getTypeArguments(rt)[0];
          const t = valueOperands ? valueName() : `t${tempCount++}_`;
          const temps = names.map((nm, k) => (nm === '_' || nm === null ? `_` : `${t}m${k}`));
          pending.push(`var (${[...(eff ? [WORLD] : []), t, ...temps].join(', ')}) := ${fname(f.text)}(${[...(eff ? [WORLD] : []), ...fuelArg(callee), ...args].join(', ')});`);
          names.forEach((nm, k) => { if (nm && nm !== '_') pending.push(`var ${nm} := ${t}m${k};`); });
          if (eff && (faultMode || (completionMode && exceptionUnits.has(callee.name)))) pending.push(FAULT_CHECK);
          return t;
        }
        if (effectfulUnits.has(f.text)) {
          if (!unitEffectful()) fail(n, 'internal: effectful callee in a pure unit');
          let rt = checker.getSignatureFromDeclaration(callee.fn).getReturnType(); if (isPromiseT(rt)) rt = checker.getTypeArguments(rt)[0];
          const value = hoist(`${fname(f.text)}(${[WORLD, ...fuelArg(callee), ...args].join(', ')})`, dtype(rt, n));
          if (!faultMode && completionMode && exceptionUnits.has(callee.name)) pending.push(FAULT_CHECK);
          return value;
        }
        return `${fname(f.text)}(${[...fuelArg(callee), ...args].join(', ')})`;
  }
  const stripParens = (e) => { while (ts.isParenthesizedExpression(e)) e = e.expression; return e; };
  function call(n, awaited = false) {
    // the receiver precedes the arguments, including when await calls this reader directly
    if (valueOperands) {
      const callee = n.expression;
      if (ts.isIdentifier(callee) && originOf(checker, callee, sf, currentUnit?.node ?? null).kind === 'local') expr(callee);
      if (ts.isPropertyAccessExpression(callee)) {
        const recv = callee.expression;
        if (recv.kind !== K.SuperKeyword && !(ts.isIdentifier(recv) && ((PURE_RECEIVERS.has(recv.text) && originOf(checker, recv, sf, currentUnit?.node ?? null).kind === 'global') || classRef(recv)))) expr(recv);
      }
      const floor = ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && callee.expression.text === 'Math' && ['floor', 'trunc'].includes(callee.name.text);
      if (!floor) for (const arg of n.arguments) {
        if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) continue;
        expr(ts.isSpreadElement(arg) ? arg.expression : arg);
      }
    }
    if (ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === 'Array' && n.expression.name.text === 'from' && n.arguments.length === 1 && generators.pureCall(n.arguments[0]) && originOf(checker, n.expression.expression, sf, currentUnit?.node ?? null).kind === 'global') return seqOf(n.arguments[0]);
    if (currentSlots && slotOfCall.has(n) && slotOfCall.get(n).unit === currentUnit?.name) { // useState in a slot unit: (slots.s_i, setter_i), and the initial value bound for the returned slots
      const { index } = slotOfCall.get(n); const D = currentSlots.types[index];
      const a0 = n.arguments[0];
      const initCode = !a0 ? `${external(`uninit_${mangle(D)}`, [], D)}()` : ts.isArrowFunction(a0) && a0.parameters.length === 0 ? outerParens(expr(ts.isBlock(a0.body) ? (a0.body.statements.length === 1 && ts.isReturnStatement(a0.body.statements[0]) ? a0.body.statements[0].expression : fail(a0, 'a lazy initializer with more than a return is not read')) : a0.body, checker.getTypeArguments(typeOf(n))[0])) : outerParens(expr(a0, checker.getTypeArguments(typeOf(n))[0]));
      pending.push(`var init${index}_: ${D} := ${initCode};`);
      const decl = n.parent; if (ts.isVariableDeclaration(decl) && ts.isArrayBindingPattern(decl.name)) { const el = decl.name.elements[1]; if (el && ts.isBindingElement(el) && ts.isIdentifier(el.name)) { const sym = checker.getSymbolAtLocation(el.name); if (sym) setterSlot.set(sym, index); } }
      const setterT = checker.getTypeArguments(typeOf(n))[1]; const setterD = setterT ? dtype(setterT, n) : `(${D}) -> Unit`; // the setter's own type (an updater union reads as Any -> Unit), so a capture boxes it as the ordinary lane does
      const setter = external(`setter_${currentUnit.name}_${index}`, [], setterD);
      pending.push(`var hook${index}_: (${D}, ${setterD}) := (slots.s${index}, ${setter}());`); // a named tuple: the destructuring reads .0 and .1
      return `hook${index}_`;
    }
    const hook = exactReactHook(checker, n);
    if (hook) return convert(expr(hook.value), typeOf(hook.value), typeOf(n), n);
    const form = exactPromiseForm(n);
    if (form) return promiseExpression(n, form);
    const outside = promiseForm(n, checker, sf);
    if (outside) return promiseOutsideCall(n, outside, awaited);
    const f = n.expression;
    if (moduleLoader(checker, n, sf, currentUnit?.node)) {
      addPrelude('World', 'type World'); addPrelude('Ext_Module', 'type Ext_Module');
      const args = n.arguments.map((a) => expr(a));
      const pts = n.arguments.map((a) => dtype(typeOf(a), a));
      const op = f.kind === K.ImportKeyword ? 'module_import' : awaited ? 'module_await_require' : 'module_require';
      const value = hoist(`${external(op, ['World', ...pts], '(World, Ext_Module)')}(${[WORLD, ...args].join(', ')})`, 'Ext_Module');
      const rt = checker.getAwaitedType(typeOf(n)) ?? typeOf(n);
      return convertD(value, 'Ext_Module', dtype(rt, n));
    }
    if (ts.isPropertyAccessExpression(f) && ts.isIdentifier(f.expression) && (f.name.text === 'call' || f.name.text === 'apply') && fns.has(f.expression.text) && originOf(checker, f.expression, sf, currentUnit?.node ?? null).kind === 'unit') { // `h.call(o, a)` and `h.apply(o, [a])` on a same-file function: the call with the receiver as its first operand, the callee's declared `this`; a callee without one ignores the receiver
      const callee = fns.get(f.expression.text);
      let argNodes;
      if (f.name.text === 'call') argNodes = [...n.arguments];
      else { const arr = n.arguments[1] ? stripParens(n.arguments[1]) : null; if (n.arguments.length > 2 || (arr && (!ts.isArrayLiteralExpression(arr) || arr.elements.some(ts.isSpreadElement)))) fail(n, '`apply` takes its arguments as one array literal'); argNodes = [n.arguments[0], ...(arr ? arr.elements : [])]; }
      if (!argNodes.length) fail(n, '`call` and `apply` take the receiver first');
      const hasThis = thisParamOf(callee);
      if (!hasThis) { expr(argNodes[0]); argNodes = argNodes.slice(1); }
      return unitCall(f.expression, callee, n, argNodes, checker.getSignatureFromDeclaration(callee.fn), hasThis ? 1 : 0);
    }
    { const h = libraryHook(checker, n); if (h) { // a listed library hook: a transition of the world returning the table's record (translate/hooks.json)
      const dt = hookDatatype(h.row, NUM); addPrelude(dt.name, dt.text); addPrelude('World', 'type World');
      if (!unitEffectful()) fail(n, `hook ${h.name} is a world transition in a unit not marked effectful`);
      const args = n.arguments.map((a) => expr(a, anyTarget())); const pts = n.arguments.map(() => anyType());
      return hoist(`${external(`hook_${h.name}`, ['World', ...pts], `(World, ${dt.name})`)}(${[WORLD, ...args].join(', ')})`, dt.name);
    } }
    if (isNullCreate(n) && dictionaryT(checker.getContextualType(n))) return 'map[]'; // `Object.create(null)` as a dictionary: empty, no prototype to read
    if (ts.isIdentifier(f)) {
      const o = originOf(checker, f, sf, currentUnit?.node ?? null);
      const callee = fns.get(f.text);
      if (o.kind === 'unit' && callee) return unitCall(f, callee, n, n.arguments, checker.getResolvedSignature(n), 0);
      if (o.kind === 'local') {
        if (isEffectCall(n)) return externalCall('invoke', n, [...n.arguments], valueOperands ? expr(f) : ident(f), dtype(typeOf(f), f), true);
        // a function-typed parameter or local: applied as a Dafny function value
        const sig = checker.getResolvedSignature(n);
        const args = n.arguments.map((a, i) => expr(a, sig && sig.parameters[i] ? checker.getTypeOfSymbolAtLocation(sig.parameters[i], a) : undefined));
        return `${valueOperands ? expr(f) : ident(f)}(${args.join(', ')})`;
      }
      if (o.kind === 'global' && f.text === 'String' && n.arguments.length === 1 && typeOf(n.arguments[0]).flags & (TF.StringLike | TF.NumberLike | TF.BooleanLike)) return stringOf(n.arguments[0]);
      if (o.kind === 'global' && f.text === 'Number' && n.arguments.length === 1 && typeOf(n.arguments[0]).flags & (TF.NumberLike | TF.BooleanLike)) return numberOf(n.arguments[0]);
      if (o.kind === 'global' && f.text === 'structuredClone' && n.arguments.length === 1) return expr(n.arguments[0]); // HTML 2.7.4: a copy of a value is the value in the value reading (the heap core allocates a fresh cell)
      return externalCall(awaited ? `await_${f.text}` : f.text, n, [...n.arguments]);
    }
    if (f.kind === K.SuperKeyword && currentUnit?.isCtor) { const Tn = selfType(currentUnit); return externalCall(`super_init_${mangle(Tn)}`, n, [...n.arguments], SELF, Tn, true); } // `super(args)`: the parent's constructor on this handle, a transition
    if (!ts.isPropertyAccessExpression(f)) fail(n, 'call through a computed callee is not translated');
    const recv = f.expression, name = f.name.text;
    if (ts.isIdentifier(recv) && recv.text === 'Array' && name === 'isArray' && originOf(checker, recv, sf, currentUnit?.node ?? null).kind === 'global' && n.arguments.length === 1) {
      return staticTest(n.arguments[0], (t) => arrayBrand(t) ? 'true' : t.flags & (TF.StringLike | TF.NumberLike | TF.BigIntLike | TF.BooleanLike | TF.ESSymbolLike | TF.Null | TF.Undefined) ? 'false' : null, (v, d) => `${external('Array_isArray', [d], 'bool')}(${v})`);
    }
    const om = literalMethod(f);
    if (om) {
      const value = fieldOf(expr(recv), typeOf(recv), name, f);
      if (!exactObjectMethod(om)) return externalCall('invoke_method', n, [...n.arguments], value, dtype(typeOf(om), om), true);
      return `(${value})(${n.arguments.map((a, i) => expr(a, om.parameters[i] ? typeOf(om.parameters[i].name) : undefined)).join(', ')})`;
    }
    if ((f.questionDotToken || n.questionDotToken) && isOptional(typeOf(recv)) && recv.kind !== K.ThisKeyword) {
      // `a?.m(args)`: the call, and its transition, only when a is present; the result is an Option
      const base = baseOf(typeOf(recv));
      const v = `oc${tempCount++}_`;
      pending.push(`var ${v} := ${rawOperand(recv)};`);
      const Td = isAny(base) ? anyType() : dtype(base, n);
      return externalCall(`${awaited ? 'await_' : ''}${isAny(base) ? 'Any' : Td}_${name}`, n, [...n.arguments], `${v}.value`, Td, null, `${v}.Some?`);
    }
    if (recv.kind === K.SuperKeyword && classOf(currentUnit)) {
      // `super.m(args)`: the parent class's method on this receiver, a transition of the world (its body is not read here)
      const T = selfType(currentUnit);
      return externalCall(`${awaited ? 'await_' : ''}super_${mangle(T)}_${name}`, n, [...n.arguments], SELF, T, true);
    }
    if (recv.kind === K.ThisKeyword && classOf(currentUnit)) {
      const callee = fns.get(`${currentUnit.className}.${name}`);
      if (callee) {
        const args = unitArgs(callee, n);
        const selfArg = callee.isStatic ? [] : [SELF];
        if (effectfulUnits.has(callee.name)) {
          if (!unitEffectful()) fail(n, 'internal: effectful method called from a pure method');
          let rt = checker.getSignatureFromDeclaration(callee.fn).getReturnType(); if (isPromiseT(rt)) rt = checker.getTypeArguments(rt)[0];
          const value = hoist(`${fname(callee.name)}(${[WORLD, ...fuelArg(callee), ...selfArg, ...args].join(', ')})`, dtype(rt, n));
          if (!faultMode && completionMode && exceptionUnits.has(callee.name)) pending.push(FAULT_CHECK);
          return value;
        }
        return `${fname(callee.name)}(${[...fuelArg(callee), ...selfArg, ...args].join(', ')})`;
      }
      // an inherited method or a function-typed field: an uninterpreted external of the receiver and the arguments
      const T = selfType(currentUnit);
      return externalCall(`${awaited ? 'await_' : ''}${mangle(T)}_${name}`, n, [...n.arguments], SELF, T, true);
    }
    {
      // a method of a same-file class: on the class itself (static) or on a receiver typed by it; the file's own unit
      const asClass = classRef(recv); const sfc = asClass ?? (isOptional(typeOf(recv)) ? null : sameFileClassOf(typeOf(recv)));
      const callee = sfc ? fns.get(`${sfc.name.text}.${name}`) : null;
      if (callee && !callee.isCtor && !!asClass === !!callee.isStatic) {
        if (failedUnits.has(callee.name)) fail(n, `callee ${callee.name} was not translated`);
        const args = unitArgs(callee, n);
        const selfArg = callee.isStatic ? [] : [outerParens(expr(recv))];
        if (effectfulUnits.has(callee.name)) {
          if (!unitEffectful()) fail(n, 'internal: effectful method called from a pure unit');
          let rt = checker.getSignatureFromDeclaration(callee.fn).getReturnType(); if (isPromiseT(rt)) rt = checker.getTypeArguments(rt)[0];
          const value = hoist(`${fname(callee.name)}(${[WORLD, ...fuelArg(callee), ...selfArg, ...args].join(', ')})`, dtype(rt, n));
          if (!faultMode && completionMode && exceptionUnits.has(callee.name)) pending.push(FAULT_CHECK);
          return value;
        }
        return `${fname(callee.name)}(${[...fuelArg(callee), ...selfArg, ...args].join(', ')})`;
      }
    }
    if (moduleState(checker, recv, sf) && MUTATORS.has(name)) {
      const d = dtype(typeOf(recv), recv);
      return externalCall(`Module_file_${recv.text}_${name}`, n, [...n.arguments], expr(recv), d, true);
    }
    if (isInstanceWorldField(recv)) {
      // a method on a world field of an instance (`a.items.push(x)`): the field is read (a transition), the call is a transition on it
      const ft = typeOf(recv); const Td = isAny(ft) ? anyType() : dtype(ft, n);
      return externalCall(`${awaited ? 'await_' : ''}${mangle(classTypeD(sameFileClassOf(typeOf(recv.expression))))}_${recv.name.text}_${name}`, n, [...n.arguments], expr(recv), Td);
    }
    if (isWorldField(recv)) {
      // a method on a field that lives in the world: the field's value is read (a transition), the call is a transition on it
      const ft = typeOf(recv); const Td = isAny(ft) ? anyType() : dtype(ft, n);
      return externalCall(`${awaited ? 'await_' : ''}${mangle(selfType(currentUnit))}_${recv.name.text}_${name}`, n, [...n.arguments], expr(recv), Td);
    }
    const recvT = typeOf(recv);
    const base = baseOf(recvT);
    if (isAny(base)) return externalCall(`${awaited ? 'await_' : ''}Any_${name}`, n, [...n.arguments], expr(recv, anyTarget()), anyType());
    if (ts.isIdentifier(recv) && recv.text === 'Math' && name !== 'random' && originOf(checker, recv, sf, currentUnit?.node ?? null).kind === 'global') {
      const [a, b] = n.arguments;
      if (name === 'floor' || name === 'trunc') {
        if (n.arguments.length !== 1 || !(typeOf(a).flags & TF.NumberLike)) return externalCall(`Math_${name}`, n, [...n.arguments]);
        if (real) return name === 'floor' ? `((${expr(a)}).Floor as real)` : `(${helper('JsTrunc', ['real'])}(${expr(a)}) as real)`;
        const inner = ts.isParenthesizedExpression(a) ? a.expression : a;
        if (ts.isBinaryExpression(inner) && inner.operatorToken.kind === K.SlashToken) {
          return `${helper(name === 'floor' ? 'FloorDiv' : 'TruncDiv', ['int'])}(${expr(inner.left)}, ${expr(inner.right)})`;
        }
        return expr(a);
      }
      if (['ceil', 'round', 'sign'].includes(name) && n.arguments.length === 1 && (typeOf(a).flags & TF.NumberLike)) return `${helper({ ceil: 'JsCeil', round: 'JsRound', sign: 'JsSign' }[name], [NUM])}(${expr(a)})`;
      if (name === 'min' || name === 'max') {
        if (!n.arguments.length) fail(n, 'math-empty: provide a nonempty argument list');
        if (n.arguments.length === 2 && !n.arguments.some(ts.isSpreadElement)) return `${helper(name === 'min' ? 'Min' : 'Max', [NUM])}(${expr(a)}, ${expr(b)})`;
        if (n.arguments.length === 1 && !ts.isSpreadElement(a)) return expr(a);
        return `${helper(name === 'min' ? 'MinSeq' : 'MaxSeq', [NUM])}(${callSequence([...n.arguments], NUM).code})`;
      }
      if (name === 'abs') return `${helper('Abs', [NUM])}(${expr(a)})`;
      return externalCall(`Math_${name}`, n, [...n.arguments]);
    }
    if (!awaited && ts.isIdentifier(recv) && recv.text === 'JSON' && name === 'stringify' && originOf(checker, recv, sf, currentUnit?.node ?? null).kind === 'global') {
      const schema = n.arguments.map((a) => absenceSchema(typeOf(a))).join('|');
      return externalCall(`JSON_stringify${schema.replace(/\|/g, '') ? '_absence_' + hash(schema) : ''}`, n, [...n.arguments]);
    }
    if (!awaited && ts.isIdentifier(recv) && recv.text === 'Object' && originOf(checker, recv, sf, currentUnit?.node ?? null).kind === 'global' && ['keys', 'values', 'entries'].includes(name)) {
      const enumeration = recordEnumeration(n, name);
      if (enumeration !== null) return enumeration;
    }
    if (ts.isIdentifier(recv)) {
      const o = originOf(checker, recv, sf, currentUnit?.node ?? null);
      if (!moduleState(checker, recv, sf) && (o.kind === 'import' || o.kind === 'other' || o.kind === 'module' || o.kind === 'global') && !(isArrayLike(checker, base) || base.flags & TF.StringLike || isSetT(base) || isMapT(base))) {
        return externalCall(`${awaited ? 'await_' : ''}${recv.text}_${name}`, n, [...n.arguments]);
      }
    }
    if (isArrayLike(checker, base)) {
      const shape = arrayCallbackShape(n);
      if (shape && containsEffect(shape.cb.body)) return callbackValue(n, shape);
      const A = () => dtype(elemType(recv), n);
      const R = expr(recv);
      const cb0 = n.arguments[0];
      const cb = cb0;
      const et = () => elemType(recv);
      const lambda1 = (c, k) => lambda(c, k, [et()]);
      // a callback that also takes the index: the indexed helper, the lambda typed (A, int)
      const withIdx = cb && ts.isArrowFunction(cb) && cb.parameters.length === 2 && ['map', 'filter', 'some', 'every', 'find', 'findIndex', 'flatMap'].includes(name);
      const lambda2 = (c) => lambda(c, 2, [et(), checker.getNumberType ? checker.getNumberType() : typeOf(c.parameters[1].name)]);
      if (withIdx) {
        switch (name) {
          case 'map': return `${helper('MapIdx', [A(), dtype(typeOf(n), n).replace(/^seq<(.*)>$/, '$1')])}(${R}, ${lambda2(cb)}, 0)`;
          case 'filter': return `${helper('FilterIdx', [A()])}(${R}, ${lambda2(cb)}, 0)`;
          case 'some': return `(exists ii_ :: 0 <= ii_ < |${R}| && ${lambda2(cb)}(${R}[ii_], ii_))`;
          case 'every': return `(forall ii_ :: 0 <= ii_ < |${R}| ==> ${lambda2(cb)}(${R}[ii_], ii_))`;
          case 'find': return foundValue(`${helper('FindIdx', [A()])}(${R}, ${lambda2(cb)}, 0)`, et(), typeOf(n), n);
          case 'findIndex': return `${helper('FindIndexIdx', [A()])}(${R}, ${lambda2(cb)}, 0)`;
          case 'flatMap': { const inner = dtype(typeOf(n), n); return `${helper('Flat', [inner.replace(/^seq<(.*)>$/, '$1')])}(${helper('MapIdx', [A(), inner])}(${R}, ${lambda2(cb)}, 0))`; }
        }
      }
      switch (name) {
        case 'filter': return `${helper('Filter', [A()])}(${R}, ${lambda1(cb, 1)})`;
        case 'map': return `${helper('Map', [A(), dtype(typeOf(n), n).replace(/^seq<(.*)>$/, '$1')])}(${R}, ${lambda1(cb, 1)})`;
        case 'flatMap': { const inner = dtype(typeOf(n), n); return `${helper('Flat', [inner.replace(/^seq<(.*)>$/, '$1')])}(${helper('Map', [A(), inner])}(${R}, ${lambda1(cb, 1)}))`; }
        case 'reduce': { const U = dtype(typeOf(cb.parameters[0].name), cb); return `${helper('Fold', [A(), U])}(${R}, ${lambda(cb, 2, [typeOf(cb.parameters[0].name), et()])}, ${expr(n.arguments[1], typeOf(cb.parameters[0].name))})`; }
        case 'some': return `(exists ii_ :: 0 <= ii_ < |${R}| && ${lambda1(cb, 1)}(${R}[ii_]))`;
        case 'every': return `(forall ii_ :: 0 <= ii_ < |${R}| ==> ${lambda1(cb, 1)}(${R}[ii_]))`;
        case 'find': return foundValue(`${helper('Find', [A()])}(${R}, ${lambda1(cb, 1)})`, et(), typeOf(n), n);
        case 'findIndex': return `${helper('FindIndex', [A()])}(${R}, ${lambda1(cb, 1)})`;
        case 'includes': return `(${expr(n.arguments[0], elemType(recv))} in ${R})`;
        case 'indexOf': return `${helper('IndexOf', [A()])}(${R}, ${expr(n.arguments[0], elemType(recv))})`;
        case 'slice': return `${helper('Slice', [A()])}(${R}, ${n.arguments[0] ? expr(n.arguments[0]) : '0'}, ${n.arguments[1] ? expr(n.arguments[1]) : `|${R}|`})`;
        case 'concat': return `(${[R, ...n.arguments.map(seqOf)].join(' + ')})`;
        case 'join':
          return A() === 'string' && n.arguments.length <= 1 && (!n.arguments[0] || typeOf(n.arguments[0]).flags & TF.StringLike)
            ? `${helper('Join', ['string'])}(${R}, ${n.arguments[0] ? expr(n.arguments[0]) : '","'})`
            : externalCall('array_join', n, [...n.arguments], R, dtype(base, recv));
        case 'flat': return `${helper('Flat', [A().replace(/^seq<(.*)>$/, '$1')])}(${R})`;
        case 'at': return foundValue(`${helper('At', [A()])}(${R}, ${expr(n.arguments[0])})`, et(), typeOf(n), n);
        case 'sort': return cb ? `${external(`sort_${mangle(A())}`, [`seq<${A()}>`, `(${A()}, ${A()}) -> ${NUM}`], `seq<${A()}>`)}(${R}, ${lambda(cb, 2)})` : `${external(`sort_default_${mangle(A())}`, [`seq<${A()}>`], `seq<${A()}>`)}(${R})`;
        case 'reverse': return `${helper('Reverse', [A()])}(${R})`;
        default: return fail(n, `array method .${name}() is not translated`);
      }
    }
    if ((base.flags & TF.StringLike) || (base.flags & TF.Union && base.types.every((t) => t.flags & TF.StringLike))) {
      const S = expr(recv);
      let args;
      // an exact call evaluates all arguments once, in source order
      const arg = (i) => { if (!args) args = n.arguments.map((a) => expr(a)); return args[i]; };
      const a0 = () => arg(0);
      const str = (a) => a && !!(typeOf(a).flags & TF.StringLike);
      const literal = (a) => a && (ts.isStringLiteral(a) || ts.isNoSubstitutionTemplateLiteral(a));
      const absent = (a) => !a || (ts.isIdentifier(a) && a.text === 'undefined');
      const integer = (i) => real ? `(var p_ := ${arg(i)}; if p_ < 0.0 then -(-p_).Floor else p_.Floor)` : arg(i);
      const pos = (i, fallback) => absent(n.arguments[i]) ? fallback : integer(i);
      const numeric = (i) => absent(n.arguments[i]) || !!(typeOf(n.arguments[i]).flags & TF.NumberLike);
      const fallback = () => externalCall(`str_${name}`, n, [...n.arguments], S, 'string');
      switch (name) {
        case 'trim': case 'trimStart': case 'trimEnd':
          return n.arguments.length ? fallback() : `${helper(name[0].toUpperCase() + name.slice(1), ['string'])}(${S})`;
        case 'toLowerCase': case 'toUpperCase':
          return n.arguments.length ? fallback() : `${helper(name === 'toLowerCase' ? 'Lower' : 'Upper', ['string'])}(${S})`;
        case 'split':
          return literal(n.arguments[0]) && n.arguments.length === 1 ? `${helper('StrSplit', ['string'])}(${S}, ${a0()})` : fallback();
        case 'padStart': case 'padEnd':
          if (!n.arguments[0] || !numeric(0) || !(absent(n.arguments[1]) || str(n.arguments[1])) || n.arguments.length > 2) return fallback();
          return `${helper(name === 'padStart' ? 'PadStart' : 'PadEnd', ['string'])}(${S}, ${pos(0, '0')}, ${absent(n.arguments[1]) ? '" "' : arg(1)})`;
        case 'replace': case 'replaceAll':
          return n.arguments.length === 2 && literal(n.arguments[0]) && str(n.arguments[1]) ? `${helper('StrReplace', ['string'])}(${S}, ${a0()}, ${arg(1)}, 0, ${name === 'replaceAll'})` : fallback();
        case 'includes': case 'indexOf': case 'lastIndexOf': case 'startsWith': case 'endsWith': {
          if (!str(n.arguments[0]) || !numeric(1) || n.arguments.length > 2) return fallback();
          const P = `${helper('StrClamp', ['int'])}(${pos(1, ['lastIndexOf', 'endsWith'].includes(name) ? `|${S}|` : '0')}, |${S}|)`;
          if (name === 'endsWith') return `${helper('StrEnds', ['string'])}(${S}, ${a0()}, ${P})`;
          if (name === 'startsWith') return `(var ss_ := ${S}; var tt_ := ${a0()}; var pp_ := ${P}; pp_ + |tt_| <= |ss_| && ss_[pp_..pp_ + |tt_|] == tt_)`;
          const search = `${helper(name === 'lastIndexOf' ? 'StrLast' : 'StrFind', ['string'])}(${S}, ${a0()}, ${P})`;
          return name === 'includes' ? `(${search} >= 0)` : real ? `(${search} as real)` : search;
        }
        case 'slice': case 'substring':
          if (!numeric(0) || !numeric(1) || n.arguments.length > 2) return fallback();
          return `${helper(name === 'slice' ? 'Slice' : 'StrSubstring', [name === 'slice' ? 'char' : 'string'])}(${S}, ${pos(0, '0')}, ${pos(1, `|${S}|`)})`;
        case 'charAt': case 'at':
          if (!numeric(0) || n.arguments.length > 1) return fallback();
          return `${helper(name === 'at' ? 'StrAt' : 'StrCharAt', ['string'])}(${S}, ${pos(0, '0')})`;
        case 'concat': return `(${[S, ...n.arguments.map(stringOf)].join(' + ')})`;
        case 'repeat': return `${helper('Repeat', ['string'])}(${S}, ${a0()})`;
        default: return fallback();
      }
    }
    if (isSetT(base)) {
      const S = expr(recv);
      const A = dtype(checker.getTypeArguments(base)[0], n);
      if (name === 'has') return `(${expr(n.arguments[0], checker.getTypeArguments(base)[0])} in ${S})`;
      if (name === 'values' || name === 'keys') return `${external('set_to_seq', [`set<${A}>`], `seq<${A}>`)}(${S})`;
      return fail(n, `Set.${name}() is not translated as an expression`);
    }
    if (isMapT(base)) {
      const M = expr(recv);
      const [kt, vt] = checker.getTypeArguments(base);
      const Kd = dtype(kt, n), Vd = dtype(vt, n);
      if (name === 'has') return `(${expr(n.arguments[0], kt)} in ${M})`;
      if (name === 'get') { usesOption = true; const k = expr(n.arguments[0], kt); return foundValue(`(if ${k} in ${M} then Some(${M}[${k}]) else None)`, vt, typeOf(n), n); }
      if (name === 'keys') return `${external('map_keys', [`map<${Kd}, ${Vd}>`], `seq<${Kd}>`)}(${M})`;
      if (name === 'values') return `${external('map_values', [`map<${Kd}, ${Vd}>`], `seq<${Vd}>`)}(${M})`;
      if (name === 'entries') return `${external('map_entries', [`map<${Kd}, ${Vd}>`], `seq<(${Kd}, ${Vd})>`)}(${M})`;
      return fail(n, `Map.${name}() is not translated as an expression`);
    }
    // a method on a record or an opaque value: uninterpreted, keyed by the receiver type
    const T = dtype(base, n);
    return externalCall(`${awaited ? 'await_' : ''}${T}_${name}`, n, [...n.arguments], expr(recv), T);
  }

  // ----- shared statement analysis -----
  const retType = (u) => { if (u.fn.asteriskToken && !u.isAsync) return checker.createArrayType(generators.shape(u).element); let t = checker.getSignatureFromDeclaration(u.fn).getReturnType(); if (isPromiseT(t)) t = checker.getTypeArguments(t)[0]; else if (u.isAsync && checker.getAwaitedType) { const aw = checker.getAwaitedType(t); if (aw) t = aw; } return t; };
  const isAssign = (x) => ts.isBinaryExpression(x) && x.operatorToken.kind >= K.FirstAssignment && x.operatorToken.kind <= K.LastAssignment;
  const isUpdate = (x) => (ts.isPostfixUnaryExpression(x) || ts.isPrefixUnaryExpression(x)) && (x.operator === K.PlusPlusToken || x.operator === K.MinusMinusToken);
  const MUT = new Set(['push', 'unshift', 'add', 'delete', 'set', 'shift', 'reverse', 'splice', 'sort', 'pop']);
  const isAssignStmt = (x) => ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && ts.isIdentifier(x.expression.expression) && x.expression.expression.text === 'Object' && x.expression.name.text === 'assign' && x.arguments.length >= 2 && ts.isIdentifier(pathRoot(x.arguments[0])); // Object.assign(t, s…) as a statement: the lint admits it on an owned record
  const pathRoot = (x) => { while (ts.isPropertyAccessExpression(x)) x = x.expression; return x; };
  const isMutCall = (x) => ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && MUT.has(x.expression.name.text) && ts.isIdentifier(pathRoot(x.expression.expression)) && !isWorldField(x.expression.expression) && !(ts.isPropertyAccessExpression(x.expression.expression) && pathRoot(x.expression.expression).kind === K.ThisKeyword);
  const hasLoopOrMutation = (body) => {
    if (!ts.isBlock(body)) return false;
    let found = false;
    const walk = (x) => {
      if (ts.isForStatement(x) || ts.isForOfStatement(x) || ts.isWhileStatement(x) || isAssign(x) || isUpdate(x) || isMutCall(x) || isAssignStmt(x)) found = true;
      if (!found) ts.forEachChild(x, walk);
    };
    ts.forEachChild(body, walk);
    return found;
  };
  const containsReturn = (node) => { let f = false; const w = (x) => { if (ts.isReturnStatement(x) || ts.isThrowStatement(x)) f = true; if (!f && !ts.isArrowFunction(x)) ts.forEachChild(x, w); }; w(node); return f; };
  const flatten = (s) => (ts.isBlock(s) ? [...s.statements] : [s]);
  const terminates = (s) => {
    if (ts.isReturnStatement(s) || ts.isContinueStatement(s) || ts.isBreakStatement(s) || ts.isThrowStatement(s)) return true;
    if (ts.isBlock(s)) return s.statements.length > 0 && terminates(s.statements[s.statements.length - 1]);
    if (ts.isIfStatement(s)) return !!s.elseStatement && terminates(s.thenStatement) && terminates(s.elseStatement);
    if (ts.isSwitchStatement(s)) { const cl = s.caseBlock.clauses; return cl.some((c) => ts.isDefaultClause(c)) && cl.every((c) => c.statements.length && terminates(c.statements[c.statements.length - 1])); }
    return false;
  };
  const insideNode = (decl, node) => decl.pos >= node.pos && decl.end <= node.end;
  function assignedOutside(node) {
    const names = [];
    if (yieldState) { let yields = false; const w = (x) => { if (ts.isYieldExpression(x)) yields = true; if (!ts.isFunctionLike(x)) ts.forEachChild(x, w); }; w(node); if (yields) names.push(yieldState); }
    if (unitEffectful() && containsEffect(node)) names.push({ name: WORLD, sym: null, node, synthetic: true, d: 'World' });
    if (node.__collect) names.push(node.__collect); // the callback's result state
    const note = (id) => {
      if (moduleState(checker, id, sf)) return; // module writes travel through the world
      if (names.some((m) => m.name === id.text)) return;
      const sym = checker.getSymbolAtLocation(id);
      const d = sym?.valueDeclaration;
      if (!d || insideNode(d, node)) return;
      names.push({ name: id.text, sym, node: id });
    };
    const walk = (x) => {
      if (isAssign(x) && ts.isIdentifier(x.left)) note(x.left);
      if (isAssign(x) && ts.isPropertyAccessExpression(x.left)) { let r = x.left; while (ts.isPropertyAccessExpression(r)) r = r.expression; if (ts.isIdentifier(r)) note(r); }
      if (isAssign(x) && ts.isElementAccessExpression(x.left) && ts.isIdentifier(x.left.expression)) note(x.left.expression);
      if (isUpdate(x) && ts.isIdentifier(x.operand)) note(x.operand);
      if (isMutCall(x)) { const r = pathRoot(x.expression.expression); if (ts.isIdentifier(r)) note(r); }
      if (isAssignStmt(x)) { const r = pathRoot(x.arguments[0]); if (ts.isIdentifier(r)) note(r); } // Object.assign(t, …): t is written, so a parameter t is an output
      if (isUpdate(x) && ts.isPropertyAccessExpression(x.operand)) { const r = pathRoot(x.operand); if (ts.isIdentifier(r)) note(r); }
      ts.forEachChild(x, walk);
    };
    walk(node);
    return names;
  }
  // the first matching case selects a suffix; default is used only after every case test failed
  function coreSwitch(s, rest, fin, u, ctx = null) {
    const clauses = [...s.caseBlock.clauses];
    if (ctx && (opaqueSwitch(s) || containsEffect(s.expression) || clauses.some((c) => ts.isCaseClause(c) && containsEffect(c.expression)))) return opaqueCompletion(s, () => faultTr(rest, fin, u, ctx), u, ctx);
    const value = `switch${tempCount++}_`, start = `start${tempCount++}_`;
    const head = capture(() => `var ${value} := ${outerParens(expr(s.expression))};`);
    const d = clauses.findIndex((c) => ts.isDefaultClause(c));
    let fallback = d;
    // a literal union exhausted by case literals has no unmatched path
    if (d < 0 && !rest.length && !(retType(u).flags & (TF.Void | TF.Undefined))) {
      const t = typeOf(s.expression), parts = t.flags & TF.Union ? t.types : [t];
      const literals = clauses.filter(ts.isCaseClause).map((c) => typeOf(c.expression));
      if (parts.every((p) => (p.flags & (TF.StringLiteral | TF.NumberLiteral | TF.BooleanLiteral)) && literals.some((q) => p.flags === q.flags && (p.value ?? p.intrinsicName) === (q.value ?? q.intrinsicName)))) fallback = clauses.length - 1;
    }
    const caseNames = new Set();
    const note = (n) => { if (ts.isIdentifier(n)) caseNames.add(n.text); ts.forEachChild(n, note); };
    clauses.filter(ts.isCaseClause).forEach((c) => note(c.expression));
    const searchState = [...(unitEffectful() ? [WORLD] : []), ...freeVars(s, null).filter((v) => caseNames.has(v.name)).map((v) => dn(v.name))];
    const selected = (i) => tupleOf([...searchState, String(i)]);
    let search = selected(fallback);
    for (let i = clauses.length - 1; i >= 0; i--) {
      const c = clauses[i]; if (!ts.isCaseClause(c)) continue;
      const tail = search;
      search = capture(() => `if ${value} == ${outerParens(expr(c.expression, typeOf(s.expression)))} then ${selected(i)} else ${wrapLet(tail)}`);
    }
    const switchDepth = switchCtx.length;
    const after = () => { const saved = switchCtx.splice(switchDepth); try { return ctx ? faultTr(rest, fin, u, ctx) : tr(rest, fin, u); } finally { switchCtx.push(...saved); } };
    const run = (i) => {
      if (i === clauses.length) return after();
      switchCtx.push({ depth: loopCtx.length, label: labelId(s), brk: after });
      try { return ctx ? faultTr([...clauses[i].statements], () => run(i + 1), u, ctx) : tr([...clauses[i].statements], () => run(i + 1), u); } finally { switchCtx.pop(); }
    };
    let body = fallback < 0 ? after() : run(fallback);
    for (let i = clauses.length - 1; i >= 0; i--) {
      if (i === fallback) continue;
      body = `if ${start} == ${i} then\n${indentBlock(wrapLet(run(i)))}\nelse\n${indentBlock(wrapLet(body))}`;
    }
    return `${head}\nvar ${tupleOf([...searchState, start])} := ${wrapLet(search)};\n${body}`;
  }

  // ===== proof shape (methods with loops): unchanged from version 1, used by the fixtures =====
  const kindOf = new Map();
  const bodyExpr = (list, u) => {
    if (!list.length) fail(u.node, 'a path ends without a return');
    const [s, ...rest] = list;
    if (ts.isReturnStatement(s)) return expr(s.expression, retType(u));
    if (ts.isVariableStatement(s)) {
      const d = s.declarationList.declarations[0];
      if (!ts.isIdentifier(d.name)) return `${destructure(d.name, outerParens(expr(d.initializer)), typeOf(d.initializer), hookResultOf.get(d.initializer) ?? null).join('\n')}\n${bodyExpr(rest, u)}`;
      const t = typeOf(d.name);
      return `var ${dn(d.name.text)}${hookResultOf.has(d.initializer) ? '' : `: ${dtype(t, d)}`} := ${outerParens(expr(d.initializer, t))};\n${bodyExpr(rest, u)}`;
    }
    if (ts.isIfStatement(s)) {
      const thenL = [...flatten(s.thenStatement), ...(terminates(s.thenStatement) ? [] : rest)];
      const elseS = s.elseStatement;
      const elseL = [...(elseS ? flatten(elseS) : []), ...(elseS && terminates(elseS) ? [] : rest)];
      return `if ${outerParens(truthy(s.expression))} then\n${indentBlock(wrapLet(bodyExpr(thenL, u)))}\nelse\n${indentBlock(wrapLet(bodyExpr(elseL, u)))}`;
    }
    if (ts.isBlock(s)) return bodyExpr([...s.statements, ...rest], u);
    return fail(s, `statement ${ts.SyntaxKind[s.kind]} cannot be an expression`);
  };
  const one = () => (real ? '1.0' : '1');
  function stmts(list, ind, u, out) { for (const s of list) stmt(s, ind, u, out); }
  function stmt(s, ind, u, out) {
    const pad = '  '.repeat(ind);
    const emit = (line) => out.push(pad + line);
    switch (s.kind) {
      case K.Block: return stmts(s.statements, ind, u, out);
      case K.EmptyStatement: return;
      case K.VariableStatement: {
        const d = s.declarationList.declarations[0];
        const t = typeOf(d.name);
        if (!ts.isIdentifier(d.name)) return destructure(d.name, outerParens(expr(d.initializer)), typeOf(d.initializer), hookResultOf.get(d.initializer) ?? null).forEach(emit);
        return emit(`var ${dn(d.name.text)}${hookResultOf.has(d.initializer) ? '' : `: ${dtype(t, d)}`} := ${outerParens(expr(d.initializer, t))};`);
      }
      case K.ExpressionStatement: return emit(assignText(s.expression));
      case K.ThrowStatement: return fail(s, 'throw is translated in --core mode only');
      case K.ReturnStatement: return emit(`return ${outerParens(expr(s.expression, retType(u)))};`);
      case K.IfStatement: {
        emit(`if ${outerParens(truthy(s.expression))} {`);
        stmts(flatten(s.thenStatement), ind + 1, u, out);
        let e = s.elseStatement;
        while (e && ts.isIfStatement(e)) {
          emit(`} else if ${outerParens(truthy(e.expression))} {`);
          stmts(flatten(e.thenStatement), ind + 1, u, out);
          e = e.elseStatement;
        }
        if (e) { emit('} else {'); stmts(flatten(e), ind + 1, u, out); }
        return emit('}');
      }
      case K.ForOfStatement: {
        const id = loopCount++;
        const x = s.initializer.declarations[0].name;
        emit(`var seq${id} := ${outerParens(seqOf(s.expression))};`);
        emit(`var idx${id} := 0;`);
        loopHeader(id, s, ind, out, [`0 <= idx${id} <= |seq${id}|`], `|seq${id}| - idx${id}`, `idx${id} < |seq${id}|`, new Set([x.text]));
        emit(`  var ${dn(x.text)}: ${dtype(typeOf(x), x)} := seq${id}[idx${id}];`);
        stmts(flatten(s.statement), ind + 1, u, out);
        emit(`  idx${id} := idx${id} + 1;`);
        return emit('}');
      }
      case K.ForStatement: {
        const id = loopCount++;
        const L = forParts(s);
        emit(`var ${dn(L.i)}: int := ${L.start};`);
        const wasInt = intVars.has(L.i);
        if (real) intVars.add(L.i);
        const cond = forCond(L);
        const dec = forDecreases(L, cond);
        loopHeader(id, s, ind, out, [`${dn(L.i)} ${L.down ? '<=' : '>='} ${L.start}`], dec, cond, new Set([L.i]));
        stmts(flatten(s.statement), ind + 1, u, out);
        emit(`  ${dn(L.i)} := ${dn(L.i)} ${L.down ? '-' : '+'} ${L.step};`);
        emit('}');
        if (real && !wasInt) intVars.delete(L.i);
        return;
      }
      case K.WhileStatement: {
        const id = loopCount++;
        const h = hintsOf(sf, s);
        loopHeader(id, s, ind, out, h.invariants, h.decreases, outerParens(truthy(s.expression)), new Set());
        stmts(flatten(s.statement), ind + 1, u, out);
        return emit('}');
      }
      default: return fail(s, `statement ${ts.SyntaxKind[s.kind]} is not translated`);
    }
  }
  function loopHeader(id, s, ind, out, auto, decreases, cond, skip) {
    const pad = '  '.repeat(ind);
    out.push(`${pad}while ${cond}`);
    for (const a of auto) out.push(`${pad}  invariant ${a}`);
    const given = [...invariants.filter((x) => x.loop === null || x.loop === id).map((x) => x.expr), ...hintsOf(sf, s).invariants.filter((x) => !auto.includes(x))];
    for (const g of given) out.push(`${pad}  invariant ${g}`);
    const changed = assignedOutside(s).map((m) => m.name).filter((v) => !skip.has(v));
    if (!given.length && changed.length) out.push(`${pad}  // INVARIANT NEEDED: say what the loop keeps true about ${changed.map(dn).join(', ')}`);
    out.push(`${pad}  decreases ${decreases ?? '/* DECREASES NEEDED */ 0'}`);
    out.push(`${pad}{`);
  }
  // text of `x = e`, `x += e`, `x++`, `xs.push(e)`, `s.add(e)`, `m.set(k, v)`, `s.delete(e)` as `name := new value`
    function pathUpdate(target, leaf) {
      const chain = []; let root = target;
      while (ts.isPropertyAccessExpression(root)) { chain.unshift(root); root = root.expression; }
      const worldPath = root.kind === K.ThisKeyword && receiverRecordPath(checker, target);
      const field = worldPath ? chain.shift() : null;
      if (!ts.isIdentifier(root) && !field) fail(target, 'receiver-mutation: a receiver path needs nonoptional data records');
      const rootCode = field ? expr(field) : dn(root.text);
      const rootT = field ? typeOf(field) : typeOf(root);
      if (!chain.length) return [root.text, leaf(dn(root.text), null, typeOf(root)), root];
      const build = (i, recvCode, recvT) => {
        const pa = chain[i]; const fname_ = pa.name.text;
        if (!isRecordish(recvT) || !checker.getPropertyOfType(recvT, fname_)) fail(pa, `field ${fname_} is not a declared field of a record`);
        const p = checker.getPropertyOfType(recvT, fname_);
        const ft = checker.getTypeOfSymbolAtLocation(p, pa);
        const cur = `${recvCode}.${dn(fname_)}`;
        let inner;
        if (i === chain.length - 1) inner = leaf(cur, p, ft);
        else { if (isOptional(ft)) fail(pa, 'assignment through an optional field is not translated'); inner = build(i + 1, cur, ft); }
        return `${recvCode}.(${dn(fname_)} := ${inner})`;
      };
      const value = build(0, rootCode, rootT);
      if (field) { const d = dtype(rootT, field); hoist(`${worldFieldAccessor(field, 'set', [{ d }])}(${WORLD}, ${SELF}, ${value})`, 'Unit'); return null; }
      return [root.text, value, root];
    }
  function newValue(e) {
    while (ts.isParenthesizedExpression(e)) e = e.expression;
    if (ts.isVoidExpression(e)) { e = e.expression; while (ts.isParenthesizedExpression(e)) e = e.expression; } // `void f()` is the call f()
    if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && moduleState(checker, e.expression.expression, sf)) {
      const recv = e.expression.expression, method = e.expression.name.text, t = baseOf(typeOf(recv));
      const exact = (isMapT(t) && ['set', 'delete', 'clear'].includes(method)) || (isSetT(t) && ['add', 'delete', 'clear'].includes(method)) || (isArrayLike(checker, t) && ['push', 'unshift'].includes(method));
      if (exact) {
        const d = dtype(t, recv), cur = expr(recv), args = checker.getTypeArguments(t);
        let value;
        if (method === 'clear') value = isMapT(t) ? 'map[]' : '{}';
        else if (isMapT(t)) { const key = expr(e.arguments[0], args[0]); value = method === 'set' ? `${cur}[${key} := ${expr(e.arguments[1], args[1])}]` : `${cur} - {${key}}`; }
        else if (isSetT(t)) value = `${cur} ${method === 'add' ? '+' : '-'} {${expr(e.arguments[0], args[0])}}`;
        else { const values = callSequence([...e.arguments], dtype(args[0], recv)).code; value = method === 'push' ? `${cur} + ${values}` : `${values} + ${cur}`; }
        hoist(`${moduleAccessor(recv, 'set', d)}(${WORLD}, ${value})`, 'Unit');
        return null;
      }
    }
    if ((isAssign(e) && containsValueStep(e.right)) || (ts.isBinaryExpression(e) && e.operatorToken.kind === K.CommaToken)) { expr(e); return null; }
    if (ts.isAwaitExpression(e) || (ts.isCallExpression(e) && isEffectCall(e)) || (ts.isNewExpression(e) && isEffectCall(e))) { expr(e); return null; } // the transition is hoisted
    if (ts.isCallExpression(e) && ts.isIdentifier(e.expression) && fns.has(e.expression.text) && mutatedOf(fns.get(e.expression.text)).length) { expr(e); return null; } // a call that changes what was passed: the new values are bound by the call
    if (ts.isCallExpression(e) && ts.isIdentifier(e.expression)) { expr(e); return null; }
    const moduleTarget = ts.isBinaryExpression(e) ? e.left : isUpdate(e) ? e.operand : null;
    const moduleDecl = moduleState(checker, moduleTarget, sf);
    if (moduleDecl) {
      const dt = typeOf(moduleDecl.name), d = dtype(dt, moduleTarget);
      let value;
      if (isUpdate(e)) value = `${expr(moduleTarget)} ${e.operator === K.PlusPlusToken ? '+' : '-'} ${one()}`;
      else if (e.operatorToken.kind === K.EqualsToken) value = expr(e.right, dt);
      else if ([K.PlusEqualsToken, K.MinusEqualsToken, K.AsteriskEqualsToken].includes(e.operatorToken.kind)) value = `${expr(moduleTarget)} ${e.operatorToken.kind === K.PlusEqualsToken ? '+' : e.operatorToken.kind === K.MinusEqualsToken ? '-' : '*'} ${expr(e.right)}`;
      else fail(e, 'a logical module assignment uses the opaque unit reading');
      hoist(`${moduleAccessor(moduleTarget, 'set', d)}(${WORLD}, ${outerParens(value)})`, 'Unit');
      return null;
    }
    if (ts.isBinaryExpression(e) && ts.isElementAccessExpression(e.left) && ts.isIdentifier(e.left.expression)) {
      const arr = e.left.expression; const t = baseOf(typeOf(arr));
      const ix = !isArrayLike(checker, t) ? stringIndex(t) : null;
      if (ix) return [arr.text, `${dn(arr.text)}[${outerParens(expr(e.left.argumentExpression))} := ${outerParens(expr(e.right, ix.type))}]`, arr]; // a local dictionary: the map gains or replaces a key
      if (!isArrayLike(checker, t)) fail(e, 'index assignment on a non-array');
      return [arr.text, `${dn(arr.text)}[${index(e.left.argumentExpression)} := ${outerParens(expr(e.right, checker.getTypeArguments(t)[0]))}]`, arr];
    }
    const assigned = ts.isBinaryExpression(e) ? e.left : isUpdate(e) ? e.operand : null;
    const setter = assigned && accessorOf(assigned, 'set');
    if (setter) {
      const pt = typeOf(setter.params[0].name);
      let value;
      if (isUpdate(e)) value = `${propAccess(assigned)} ${e.operator === K.PlusPlusToken ? '+' : '-'} ${one()}`;
      else if (e.operatorToken.kind === K.EqualsToken) value = expr(e.right, pt);
      else { const before = propAccess(assigned); const right = expr(e.right, pt); const op = e.operatorToken.kind === K.PlusEqualsToken ? '+' : e.operatorToken.kind === K.MinusEqualsToken ? '-' : '*'; value = `${before} ${op} ${right}`; }
      accessorCall(setter, assigned, [value]); return null;
    }
    if ((ts.isBinaryExpression(e) && (isWorldField(e.left) || isInstanceWorldField(e.left))) || (isUpdate(e) && (isWorldField(e.operand) || isInstanceWorldField(e.operand)))) {
      // a write to a world field (of this, or of an instance of a same-file class): one transition, its result unused
      const target = ts.isBinaryExpression(e) ? e.left : e.operand;
      if (!unitEffectful()) fail(e, 'internal: a world field written in a pure unit');
      const onThis = isWorldField(target);
      const cls = onThis ? currentUnit.cls : sameFileClassOf(typeOf(target.expression));
      const p = checker.getPropertyOfType(checker.getTypeAtLocation(cls.name), target.name.text);
      const dt = p ? checker.getTypeOfSymbolAtLocation(p, target) : typeOf(target);
      const d = isAny(dt) ? anyType() : dtype(dt, target);
      let value;
      if (isUpdate(e)) value = `${expr(target)} ${e.operator === K.PlusPlusToken ? '+' : '-'} ${one()}`;
      else if (e.operatorToken.kind === K.EqualsToken) value = outerParens(expr(e.right, dt));
      else { const sym = e.operatorToken.kind === K.PlusEqualsToken ? '+' : e.operatorToken.kind === K.MinusEqualsToken ? '-' : '*'; value = `${expr(target)} ${sym} ${expr(e.right)}`; }
      const recvCode = onThis ? SELF : outerParens(expr(target.expression));
      hoist(`${onThis ? worldFieldAccessor(target, 'set', [{ d }]) : fieldAccessor(classTypeD(cls), target.name.text, 'set', d)}(${WORLD}, ${recvCode}, ${value})`, 'Unit');
      return null;
    }
    // a path x.a.b rooted at a local or a parameter, rebuilt with a new leaf: x := x.(a := x.a.(b := leaf(x.a.b)))
    if (ts.isBinaryExpression(e) && ts.isPropertyAccessExpression(e.left)) {
      const op = e.operatorToken.kind;
      return pathUpdate(e.left, (cur, p, ft) => {
        const value = outerParens(expr(e.right, ft));
        if (op === K.EqualsToken) return value;
        if (p && (isOptional(ft) || (p.flags & ts.SymbolFlags.Optional))) fail(e, 'a compound assignment on an optional field is not translated');
        const sym = op === K.PlusEqualsToken ? '+' : op === K.MinusEqualsToken ? '-' : op === K.AsteriskEqualsToken ? '*' : fail(e, 'assignment operator is not translated');
        return `${cur} ${sym} ${value}`;
      });
    }
    if (isUpdate(e) && ts.isPropertyAccessExpression(e.operand)) return pathUpdate(e.operand, (cur) => `${cur} ${e.operator === K.PlusPlusToken ? '+' : '-'} ${one()}`);
    if (ts.isDeleteExpression(e)) {
      // `delete r.f`: the optional field is absent; `delete m[k]`: the key leaves the dictionary; on a field of this: a world write
      let tgt = e.expression; while (ts.isParenthesizedExpression(tgt)) tgt = tgt.expression;
      if (ts.isElementAccessExpression(tgt)) {
        const recv = tgt.expression; const key = outerParens(expr(tgt.argumentExpression));
        if (isWorldField(recv)) { if (!unitEffectful()) fail(e, 'internal: a world field written in a pure method'); const d = isAny(typeOf(recv)) ? anyType() : dtype(typeOf(recv), recv); hoist(`${worldFieldAccessor(recv, 'set', [{ d }])}(${WORLD}, ${SELF}, ${expr(recv)} - {${key}})`, 'Unit'); return null; }
        return pathUpdate(recv, (cur) => `${cur} - {${key}}`);
      }
      if (ts.isPropertyAccessExpression(tgt)) {
        if (tgt.expression.kind === K.ThisKeyword) fail(e, 'delete of a field of this is not translated; assign undefined');
        return pathUpdate(tgt, (cur, p, ft) => { if (!p || !((p.flags & ts.SymbolFlags.Optional) || isOptional(ft))) fail(e, `delete of \`${tgt.name.text}\`, a field that is not optional`); usesOption = true; return missingD(dtype(ft, tgt)); });
      }
      fail(e, 'delete target is not translated');
    }
    if (ts.isBinaryExpression(e)) {
      const name = dn(e.left.text);
      const op = e.operatorToken.kind;
      if (op === K.EqualsToken) { const LT = letTypeOf(checker.getSymbolAtLocation(e.left)); return [e.left.text, outerParens(LT ? expr(e.right) : expr(e.right, typeOf(e.left)))]; } // an untyped let takes the value as it is; the var line lifts it
      if (op === K.QuestionQuestionEqualsToken || op === K.BarBarEqualsToken || op === K.AmpersandAmpersandEqualsToken) {
        // `x ??= v` keeps x when present; `x ||= v` keeps x when truthy; `x &&= v` takes v when x is truthy
        const lt = typeOf(e.left); const td = isAny(lt) ? anyType() : dtype(lt, e); const rtp = typeOf(e.right); const rd = isAny(rtp) ? anyType() : dtype(rtp, e);
        const cur = ident(e.left); const val = convert(outerParens(expr(e.right)), rtp, lt, e);
        if (op === K.QuestionQuestionEqualsToken) { if (!isOptional(lt)) return [e.left.text, cur]; return [e.left.text, `(if ${name}.Some? then ${name} else ${val})`]; }
        const t = truthy(e.left);
        return [e.left.text, op === K.BarBarEqualsToken ? `(if ${outerParens(t)} then ${name} else ${val})` : `(if ${outerParens(t)} then ${val} else ${name})`];
      }
      const sym = op === K.PlusEqualsToken ? '+' : op === K.MinusEqualsToken ? '-' : '*';
      return [e.left.text, `${name} ${sym} ${expr(e.right)}`];
    }
    if (isUpdate(e)) { const name = dn(e.operand.text); return [e.operand.text, `${name} ${e.operator === K.PlusPlusToken ? '+' : '-'} ${one()}`]; }
    if (isAssignStmt(e)) { // 20.1.2.1: every own enumerable key of each source, in order, written onto the target; later sources win. The lint admits plain records only, so the keys are the declared fields
      const srcs = e.arguments.slice(1);
      return pathUpdate(e.arguments[0], (cur) => srcs.reduce((acc, s) => { const props = checker.getPropertiesOfType(baseOf(typeOf(s))).filter((p) => !(p.flags & (ts.SymbolFlags.GetAccessor | ts.SymbolFlags.SetAccessor | ts.SymbolFlags.Method))); const sc = outerParens(expr(s)); return props.length ? `${acc}.(${props.map((p) => `${dn(p.name)} := ${sc}.${dn(p.name)}`).join(', ')})` : acc; }, cur));
    }
    if (isMutCall(e)) {
      // push/unshift/add/set/delete on a local, a parameter, or a path on one: the path is rebuilt with the new contents
      const r = e.expression.expression, m = e.expression.name.text;
      const t = baseOf(typeOf(r));
      const a0 = e.arguments[0];
      const piece = (m === 'push' || m === 'unshift') ? callSequence([...e.arguments], dtype(checker.getTypeArguments(t)[0], r)).code : null;
      return pathUpdate(r, (cur) => {
        if (m === 'push') return `${cur} + ${piece}`;
        if (m === 'unshift') return `${piece} + ${cur}`;
        if (m === 'shift') return `(if |${cur}| > 0 then ${cur}[1..] else ${cur})`; // ECMA-262 23.1.3.27: the first element leaves; an empty array stays
        if (m === 'pop') return `(if |${cur}| > 0 then ${cur}[..|${cur}| - 1] else ${cur})`; // 23.1.3.22: the last element leaves; an empty array stays
        if (m === 'sort') { const A = dtype(checker.getTypeArguments(t)[0], r); return `${external(`sort_${mangle(A)}`, [`seq<${A}>`, `(${A}, ${A}) -> ${NUM}`], `seq<${A}>`)}(${cur}, ${lambda(e.arguments[0], 2)})`; } // 23.1.3.30: an uninterpreted stable sort by the comparator, the same function as the expression form
        if (m === 'reverse') { addPrelude('SeqRev', 'function SeqRev<T>(xs: seq<T>): seq<T> decreases |xs| { if |xs| == 0 then [] else SeqRev(xs[1..]) + [xs[0]] }'); return `SeqRev(${cur})`; } // 23.1.3.26
        if (m === 'splice') { // 23.1.3.31: start and count clamped as ToIntegerOrInfinity does; the removed run is replaced by the items
          addPrelude('SeqClamp', 'function SeqClamp(i: int, lo: int, hi: int): int { if i < lo then lo else if i > hi then hi else i }');
          const E = dtype(checker.getTypeArguments(t)[0], r); const toInt = (c) => (isReal ? `(${c}).Floor` : c);
          const start = toInt(expr(e.arguments[0])), count = toInt(expr(e.arguments[1]));
          const items = e.arguments.length > 2 ? callSequence(e.arguments.slice(2), E).code : `([] : seq<${E}>)`;
          return `(var xs_ := ${cur}; var s_ := SeqClamp(${start}, 0, |xs_|); var d_ := SeqClamp(${count}, 0, |xs_| - s_); xs_[..s_] + ${items} + xs_[s_ + d_..])`;
        }
        if (isSetT(t)) { const A = checker.getTypeArguments(t)[0]; return m === 'add' ? `${cur} + {${expr(e.arguments[0], A)}}` : `${cur} - {${expr(e.arguments[0], A)}}`; }
        if (isMapT(t)) { const [kt, vt] = checker.getTypeArguments(t); return m === 'set' ? `${cur}[${expr(e.arguments[0], kt)} := ${expr(e.arguments[1], vt)}]` : `${cur} - {${expr(e.arguments[0], kt)}}`; }
        return fail(e, `.${m}() is not translated here`);
      });
    }
    return fail(e, 'statement expression is not translated');
  }
  function assignText(e) { const nv = newValue(e); if (!nv) fail(e, 'a bare await statement has no effect in the core'); const [n, v] = nv; return `${dn(n)} := ${v};`; }
  function forParts(s) {
    const decl = s.initializer.declarations[0];
    const i = decl.name.text;
    const init = decl.initializer;
    let start;
    if (real) { if (!ts.isNumericLiteral(init) || !/^\d+$/.test(init.text)) fail(init, 'in --real mode a for-loop counter starts at an integer literal'); start = init.text; }
    else start = outerParens(expr(init));
    const u = s.incrementor; const ck = s.condition.operatorToken.kind;
    const down = ck === K.GreaterThanToken || ck === K.GreaterThanEqualsToken;
    const step = ts.isBinaryExpression(u) && ts.isNumericLiteral(u.right) ? u.right.text : '1';
    const op = { [K.LessThanToken]: '<', [K.LessThanEqualsToken]: '<=', [K.GreaterThanToken]: '>', [K.GreaterThanEqualsToken]: '>=' }[ck];
    return { i, start, upper: s.condition.right, le: ck === K.LessThanEqualsToken, op, down, step };
  }
  function forCond(L) {
    return `${real ? `(${dn(L.i)} as real)` : dn(L.i)} ${L.op} ${outerParens(expr(L.upper))}`;
  }
  function forDecreases(L, cond) {
    const up = outerParens(expr(L.upper));
    if (L.down) return real ? `if ${cond} then ((${dn(L.i)} as real) - ${up}).Floor + 1 else 0` : `if ${cond} then ${dn(L.i)} - ${up} + 1 else 0`;
    return real ? `if ${cond} then (${up} - (${dn(L.i)} as real)).Floor + 1 else 0` : `if ${cond} then ${up} - ${dn(L.i)} + 1 else 0`;
  }

  // ===== --core shape: pure functions, loops as recursive helpers =====
  const coreHelpers = [];
  const loopCtx = []; // {cont, brk, ret, jump} of the enclosing core loop
  const switchCtx = []; // a switch break belongs to the current helper depth
  const labelIds = new Map();
  const labelId = (target) => { if (!labelIds.has(target)) labelIds.set(target, labelIds.size + 1); return labelIds.get(target); };
  function jumpTarget(x) {
    for (let p = x.parent; p; p = p.parent) {
      if (ts.isFunctionLike(p)) return null;
      if (x.label ? ts.isLabeledStatement(p) && p.label.text === x.label.text : ts.isIterationStatement(p, false) || ts.isBreakStatement(x) && ts.isSwitchStatement(p)) return x.label ? p.statement : p;
    }
    return null;
  }
  function escapingLabels(node) {
    const out = new Set();
    const scan = (x) => {
      if (ts.isFunctionLike(x)) return;
      if (ts.isBreakStatement(x) || ts.isContinueStatement(x)) {
        const target = jumpTarget(x);
        if (target && target !== node && !insideNode(target, node)) out.add((ts.isBreakStatement(x) ? 1 : -1) * labelId(target));
      }
      ts.forEachChild(x, scan);
    };
    scan(node); return [...out];
  }
  function dispatchJump(code, choices) {
    const ctx = loopCtx[loopCtx.length - 1];
    const branch = (choice) => {
      const sw = switchCtx[switchCtx.length - 1];
      if (choice > 0 && sw && sw.depth === loopCtx.length && sw.label === choice) return sw.brk();
      if (!ctx) fail(currentUnit.node, 'an abrupt exit has no enclosing loop or switch');
      return Math.abs(choice) === ctx.label ? (choice > 0 ? ctx.brk() : ctx.cont()) : ctx.jump(String(choice));
    };
    let out = branch(choices[choices.length - 1]);
    for (let i = choices.length - 2; i >= 0; i--) out = `if ${code} == ${choices[i]} then\n${indentBlock(wrapLet(branch(choices[i])))}\nelse\n${indentBlock(wrapLet(out))}`;
    return out;
  }
  // a `return v` inside a loop helper becomes (Some(v), state...); outside any loop it is the value itself
  const retIn = (code) => (loopCtx.length ? loopCtx[loopCtx.length - 1].ret(code) : wrapRet(code));
  const guardFacts = (c) => {
    const out = new Set();
    const lit = (e) => ts.isNumericLiteral(e) && Number(e.text) >= 0;
    const walk = (e) => {
      while (ts.isParenthesizedExpression(e)) e = e.expression;
      if (!ts.isBinaryExpression(e)) return;
      const op = e.operatorToken.kind;
      if (op === K.AmpersandAmpersandToken) { walk(e.left); walk(e.right); return; }
      if ((op === K.GreaterThanToken || op === K.GreaterThanEqualsToken) && ts.isIdentifier(e.left) && lit(e.right)) out.add(e.left.text);
      if ((op === K.LessThanToken || op === K.LessThanEqualsToken) && ts.isIdentifier(e.right) && lit(e.left)) out.add(e.right.text);
    };
    walk(c);
    return out;
  };
  const nonneg = (e, facts) => {
    while (ts.isParenthesizedExpression(e)) e = e.expression;
    if (ts.isNumericLiteral(e)) return true;
    if (ts.isIdentifier(e)) return facts.has(e.text);
    if (ts.isPropertyAccessExpression(e)) return e.name.text === 'length' || e.name.text === 'size';
    if (ts.isBinaryExpression(e)) {
      const op = e.operatorToken.kind;
      if (op === K.PlusToken || op === K.AsteriskToken) return nonneg(e.left, facts) && nonneg(e.right, facts);
    }
    if (ts.isConditionalExpression(e)) return nonneg(e.whenTrue, facts) && nonneg(e.whenFalse, facts);
    if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && ts.isIdentifier(e.expression.expression) && e.expression.expression.text === 'Math') {
      const [a, b] = e.arguments;
      if (e.expression.name.text === 'max') return nonneg(a, facts) || nonneg(b, facts);
      if (e.expression.name.text === 'min') return nonneg(a, facts) && nonneg(b, facts);
    }
    return false;
  };
  function filterProvenance(iterNode) {
    if (!ts.isIdentifier(iterNode)) return null;
    const sym = checker.getSymbolAtLocation(iterNode);
    const d = sym?.valueDeclaration;
    if (!d || !ts.isVariableDeclaration(d) || !(ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const)) return null;
    const init = d.initializer;
    if (!init || !ts.isCallExpression(init) || !ts.isPropertyAccessExpression(init.expression) || init.expression.name.text !== 'filter') return null;
    const cb = init.arguments[0];
    if (!ts.isArrowFunction(cb) || cb.parameters.length !== 1 || !ts.isIdentifier(cb.parameters[0].name) || containsEffect(cb.body)) return null;
    return cb;
  }
  function elementFacts(s) {
    const facts = new Set();
    const cb = filterProvenance(s.expression);
    if (cb) { const p = cb.parameters[0].name.text; for (const f of guardFacts(cb.body)) if (f === p && ts.isIdentifier(s.initializer.declarations[0].name)) facts.add(s.initializer.declarations[0].name.text); }
    return facts;
  }
  function keepsNonneg(v, node, facts) {
    let ok = true, seen = false;
    const visit = (x, f) => {
      if (!ok) return;
      if (ts.isIfStatement(x)) { visit(x.thenStatement, new Set([...f, ...guardFacts(x.expression)])); if (x.elseStatement) visit(x.elseStatement, f); return; }
      if (ts.isForOfStatement(x)) { visit(x.statement, new Set([...f, ...elementFacts(x)])); return; }
      if (ts.isForStatement(x)) {
        const L = x.initializer.declarations[0]; const nf = new Set(f);
        if (ts.isNumericLiteral(L.initializer)) nf.add(L.name.text);
        visit(x.statement, nf); return;
      }
      if (ts.isExpressionStatement(x)) {
        let e = x.expression; while (ts.isParenthesizedExpression(e)) e = e.expression;
        if (ts.isBinaryExpression(e) && ts.isIdentifier(e.left) && e.left.text === v) {
          seen = true;
          const op = e.operatorToken.kind;
          if (op === K.PlusEqualsToken) ok = nonneg(e.right, f);
          else if (op === K.EqualsToken) {
            const r = (() => { let y = e.right; while (ts.isParenthesizedExpression(y)) y = y.expression; return y; })();
            if (ts.isBinaryExpression(r) && r.operatorToken.kind === K.PlusToken) {
              const isV = (z) => ts.isIdentifier(z) && z.text === v;
              ok = (isV(r.left) && nonneg(r.right, f)) || (isV(r.right) && nonneg(r.left, f)) || nonneg(r, f);
            } else ok = nonneg(r, f);
          } else ok = false;
        } else if (isUpdate(e) && ts.isIdentifier(e.operand) && e.operand.text === v) { seen = true; ok = e.operator === K.PlusPlusToken; }
        return;
      }
      ts.forEachChild(x, (c) => visit(c, f));
    };
    visit(node, facts);
    return ok && seen;
  }
  function freeVars(node, skipNode) {
    const out = [];
    const walk = (x) => {
      if (x === skipNode || ts.isTypeNode(x)) return;
      if (ts.isIdentifier(x) && x.text !== 'undefined') {
        const par = x.parent;
        const isName = (ts.isPropertyAccessExpression(par) && par.name === x) || (ts.isPropertyAssignment(par) && par.name === x) || (ts.isParameter(par) && par.name === x) || (ts.isVariableDeclaration(par) && par.name === x) || (ts.isBindingElement(par) && (par.name === x || par.propertyName === x));
        if (!isName) {
          const o = originOf(checker, x, sf, currentUnit?.node ?? null);
          const d = o.decl;
          if (o.kind === 'local' && d && !insideNode(d, node) && !out.some((q) => q.name === x.text)) out.push({ name: x.text, sym: o.sym, node: x });
        }
      }
      ts.forEachChild(x, walk);
    };
    ts.forEachChild(node, walk);
    return out;
  }
  const tupleOf = (names) => (names.length === 1 ? names[0] : `(${names.join(', ')})`);

  // translate a statement list to ONE Dafny expression; `fin()` gives the value when the list ends
  // the catch path of an exact try, from a statement inside its body: bind the fault value, clear the flag, run the
  // handler, the finally block, and what follows the try
  function catchPath(t, u, thrown = null) {
    const P = faultPreds();
    const cc = t.catchClause;
    const lines = [];
    if (thrown) lines.push(`var ${WORLD} := ${P.raise}(${WORLD}, ${thrown});`);
    if (cc.variableDeclaration && ts.isIdentifier(cc.variableDeclaration.name)) lines.push(`var ${dn(cc.variableDeclaration.name.text)}: Any := ${P.value}(${WORLD});`);
    lines.push(`var ${WORLD} := ${P.clear}(${WORLD});`);
    const cont = t.__cont;
    const after = [...cc.block.statements, ...(t.finallyBlock ? t.finallyBlock.statements : []), ...cont.rest];
    return `${lines.join('\n')}\n${tr(after, cont.fin, u)}`;
  }
  const unitNameOfCall = (n) => {
    const decl = checker.getResolvedSignature(n)?.declaration;
    return [...fns.values()].find((u) => u.fn === decl)?.name;
  };
  // a transition completes before its result is used; a fault resumes the enclosing handler
  function faultEval(read, next, ctx) {
    const oldFault = faultMode, oldCompletion = completionMode;
    faultMode = !!ctx.check; completionMode = true;
    let parts;
    try { parts = captureParts(read); } finally { faultMode = oldFault; completionMode = oldCompletion; }
    const { lines, text } = parts;
    let out = next(text);
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i] === FAULT_CHECK) out = `if ${faultPreds().faulted}(${WORLD}) then\n${indentBlock(wrapLet(ctx.fault()))}\nelse\n${indentBlock(wrapLet(out))}`;
      else out = `${lines[i]}\n${out}`;
    }
    return out;
  }
  function faultValue(u) {
    const R = u.isCtor ? 'Unit' : dtype(retType(u), u.node);
    return `${external(`fault_result_${mangle(R)}`, [], R)}()`;
  }
  function faultResult(u) { return wrapRet(faultValue(u)); }
  // normal, return and throw are separate continuations; finally runs before the saved completion
  function faultTry(s, next, u, ctx) {
    const P = faultPreds();
    const cleanup = (resume) => s.finallyBlock ? faultTr([...s.finallyBlock.statements], resume, u, { ...ctx, check: true }) : resume();
    const ret = (code) => {
      const saved = `return${tempCount++}_`;
      return `var ${saved} := ${code};\n${cleanup(() => ctx.ret(saved))}`;
    };
    const fault = () => {
      const saved = `fault${tempCount++}_`;
      return `var ${saved} := ${P.value}(${WORLD});\nvar ${WORLD} := ${P.clear}(${WORLD});\n${cleanup(() => `var ${WORLD} := ${P.raise}(${WORLD}, ${saved});\n${ctx.fault()}`)}`;
    };
    const done = () => cleanup(next);
    const caught = () => {
      const cc = s.catchClause;
      if (!cc) return fault();
      const binding = cc.variableDeclaration ? `var ${dn(cc.variableDeclaration.name.text)}: Any := ${P.value}(${WORLD});\n` : '';
      return `${binding}var ${WORLD} := ${P.clear}(${WORLD});\n${faultTr([...cc.block.statements], done, u, { ret, fault, check: !!s.finallyBlock || !!ctx.check })}`;
    };
    return faultTr([...s.tryBlock.statements], done, u, { ret, fault: caught, check: true });
  }
  function faultTr(list, fin, u, ctx) {
    if (!list.length) return fin();
    const [s, ...rest] = list;
    const next = () => faultTr(rest, fin, u, ctx);
    if (!ts.isTryStatement(s) && opaqueExceptionTry(s, checker)) {
      let propagates = false;
      const scan = (n) => {
        if (ts.isFunctionLike(n)) return;
        if (ts.isThrowStatement(n) || ts.isTryStatement(n) || ((ts.isCallExpression(n) || ts.isNewExpression(n)) && exceptionUnits.has(unitNameOfCall(n)))) propagates = true;
        ts.forEachChild(n, scan);
      };
      scan(s);
      return propagates ? opaqueCompletion(s, next, u, ctx) : tr([s], next, u);
    }
    switch (s.kind) {
      case K.Block: return faultTr([...s.statements, ...rest], fin, u, ctx);
      case K.EmptyStatement: return next();
      case K.TryStatement: return exactTry(s) ? faultTry(s, next, u, ctx) : opaqueCompletion(s, next, u, ctx);
      case K.ReturnStatement: return faultEval(() => s.expression ? expr(s.expression, retType(u)) : retType(u).flags & TF.Undefined ? absentValue(retType(u)) : 'Unit', ctx.ret, ctx);
      case K.ThrowStatement: return faultEval(() => expr(s.expression, anyTarget()), (value) => `var ${WORLD} := ${faultPreds().raise}(${WORLD}, ${value});\n${ctx.fault()}`, ctx);
      case K.IfStatement: return faultEval(() => truthy(s.expression), (cond) => {
        const yes = faultTr(flatten(s.thenStatement), next, u, ctx);
        const no = s.elseStatement ? faultTr(flatten(s.elseStatement), next, u, ctx) : next();
        return `if ${outerParens(cond)} then\n${indentBlock(wrapLet(yes))}\nelse\n${indentBlock(wrapLet(no))}`;
      }, ctx);
      case K.SwitchStatement: return coreSwitch(s, rest, fin, u, ctx);
      case K.VariableStatement: {
        const bind = (ds) => {
          if (!ds.length) return next();
          const [d, ...tail] = ds;
          const more = () => bind(tail);
          if (!ts.isIdentifier(d.name)) return faultEval(() => expr(d.initializer), (code) => `${destructure(d.name, outerParens(code), typeOf(d.initializer), hookResultOf.get(d.initializer) ?? null).join('\n')}\n${more()}`, ctx);
          const t = typeOf(d.name);
          if (!d.initializer) {
            if (!d.type) {
              const at = firstAssignedType(d.name); const sym = checker.getSymbolAtLocation(d.name);
              if (at && !isAny(at)) { usesOption = true; const inner = dtype(at, d); const D = inner.startsWith('Option<') ? inner : `Option<${inner}>`; letTypes.set(sym, D); return `var ${dn(d.name.text)}: ${D} := None;\n${more()}`; }
              letTypes.set(sym, anyType());
            }
            const D = dtype(t, d);
            return `var ${dn(d.name.text)}: ${D} := ${external(`uninit_${mangle(D)}`, [], D)}();\n${more()}`;
          }
          return faultEval(() => expr(d.initializer, t), (code) => `var ${dn(d.name.text)}${hookResultOf.has(d.initializer) ? '' : `: ${dtype(t, d)}`} := ${outerParens(code)};\n${more()}`, ctx);
        };
        return bind([...s.declarationList.declarations]);
      }
      case K.ExpressionStatement: return faultEval(() => newValue(s.expression), (nv) => {
        if (!nv) return next();
        const [n, value, root] = nv;
        const e = ts.isParenthesizedExpression(s.expression) ? s.expression.expression : s.expression;
        const target = root ?? e.left ?? e.operand ?? e.expression.expression;
        const sym = checker.getSymbolAtLocation(target); const LT = letTypeOf(sym);
        const td = LT ?? dtype(symType(sym, s), s);
        const fd = LT && e.right ? dtype(typeOf(e.right), e) : td;
        return `var ${dn(n)}: ${td} := ${convertD(value, fd, td)};\n${next()}`;
      }, ctx);
      default: return tr([s], next, u);
    }
  }
  function tr(list, fin, u) {
    if (!list.length) return fin();
    const [s, ...rest] = list;
    const more0 = (r = rest) => tr(r, fin, u);
    // after a statement of an exact try body that may fault: the catch path, else what follows
    const guard = (code, r = rest) => { const t = tryOf(s); if (!t || !(containsEffect(s) || ts.isThrowStatement(s))) { const next = tr(r, fin, u); return `${code}${code ? '\n' : ''}${u.isAsync && !loopCtx.length && awaitsHere(s) ? `if ${faultPreds().faulted}(${WORLD}) then ${asyncFailure(u)} else ${wrapLet(next)}` : next}`; } const P = faultPreds(); return `${code}${code ? '\n' : ''}if ${P.faulted}(${WORLD}) then\n${indentBlock(wrapLet(catchPath(t, u)))}\nelse\n${indentBlock(wrapLet(tr(r, fin, u)))}`; };
    const more = (r = rest) => (tryOf(s) && containsEffect(s) ? guard('', r) : more0(r));
    switch (s.kind) {
      case K.TryStatement: return exactTry(s) ? faultTry(s, () => tr(rest, fin, u), u, { ret: retIn, fault: () => retIn(faultValue(u)) }) : opaqueBlock(s, rest, fin, u);
      case K.Block: return tr([...s.statements, ...rest], fin, u);
      case K.EmptyStatement: return more();
      case K.ReturnStatement: {
        if (yieldState) return retIn(wrapRet(yieldState.name));
        const top = loopCtx[loopCtx.length - 1];
        if (top && top.forEach && top.collect) return callbackStep(s.expression, top); // a callback return supplies the next result state
        if (top && top.forEach) return capture(() => { if (s.expression && containsEffect(s.expression)) expr(s.expression); return top.cont(); }); // a return inside forEach ends one step
        return capture(() => { const rt = retType(u); const code = !s.expression ? (rt.flags & TF.Undefined ? absentValue(rt) : rt.flags & TF.Void ? 'Unit' : fail(s, 'bare return')) : expr(s.expression, rt); return u.isAsync && !loopCtx.length && s.expression && awaitsHere(s.expression) ? `if ${faultPreds().faulted}(${WORLD}) then ${wrapLet(tryOf(s) && ts.isAwaitExpression(unparen(s.expression)) ? catchPath(tryOf(s), u) : asyncFailure(u))} else ${retIn(code)}` : retIn(code); });
      }
      case K.ThrowStatement: return capture(() => `var ${WORLD} := ${faultPreds().raise}(${WORLD}, ${expr(s.expression, anyTarget())});\n${retIn(faultValue(u))}`);
      case K.VariableStatement: {
        const d0 = s.declarationList.declarations[0];
        const pam = s.declarationList.declarations.length === 1 && ts.isIdentifier(d0.name) && d0.initializer ? (promiseAllMapShape(d0.initializer) || arrayCallbackShape(d0.initializer)) : null;
        if (pam && !callbackShadows(pam.cb, d0.name.text) && (pam.all || containsEffect(pam.cb.body)) && dtype(typeOf(d0.name), d0) === dtype(pam.all ? checker.getAwaitedType(typeOf(pam.all)) : typeOf(pam.call), d0)) return capture(() => callbackLoop(s, pam, d0.name.text, typeOf(d0.name), rest, fin, u));
        const out = [];
        for (const d of s.declarationList.declarations) {
          out.push(capture(() => {
            if (!ts.isIdentifier(d.name)) return destructure(d.name, outerParens(expr(d.initializer)), typeOf(d.initializer), hookResultOf.get(d.initializer) ?? null).join('\n');
            const t = typeOf(d.name);
            if (!d.initializer) {
              if (!d.type) { // `let x;`: absent until its first assignment; Option of the first assigned type, or opaque
                const at = firstAssignedType(d.name); const sym = checker.getSymbolAtLocation(d.name);
                if (at && !isAny(at)) { usesOption = true; const inner = dtype(at, d); const D = inner.startsWith('Option<') ? inner : `Option<${inner}>`; letTypes.set(sym, D); return `var ${dn(d.name.text)}: ${D} := None;`; }
                letTypes.set(sym, anyType()); return `var ${dn(d.name.text)}: Any := ${external('uninit_Any', [], 'Any')}();`;
              }
              const D = dtype(t, d); return `var ${dn(d.name.text)}: ${D} := ${external(`uninit_${mangle(D)}`, [], D)}();`; // assigned before any read (TypeScript checks it); the value here is never observed
            }
            return `var ${dn(d.name.text)}: ${dtype(t, d)} := ${outerParens(expr(d.initializer, t))};`;
          }));
        }
        return (tryOf(s) && containsEffect(s)) || (u.isAsync && !loopCtx.length && awaitsHere(s)) ? guard(out.join('\n')) : `${out.join('\n')}\n${more0()}`;
      }
      case K.ExpressionStatement: {
        if (yieldState && ts.isYieldExpression(s.expression)) { const y = s.expression; const code = y.asteriskToken ? seqOf(y.expression) : `[${expr(y.expression, yieldState.element)}]`; return `var ${yieldState.name}: ${yieldState.d} := ${yieldState.name} + ${code};\n${more0()}`; }
        const pam0 = promiseAllMapShape(s.expression) || arrayCallbackShape(s.expression);
        if (pam0 && (pam0.all || containsEffect(pam0.cb.body))) return capture(() => { callbackValue(s.expression, pam0); return more0(); });
        const fe = forEachShape(s);
        if (fe) { const fake = fakeForOf(s, fe); let body; const h = capture(() => { body = coreLoop(fake, rest, fin, u); return ''; }); return h.trim() ? `${h.trim()}\n${body}` : body; }
        const line = capture(() => {
          const nv = newValue(s.expression);
          if (!nv) return ''; // a bare effect call: its world transition was hoisted; nothing else to bind
          const [n, v, rootNode] = nv;
          const e = ts.isParenthesizedExpression(s.expression) ? s.expression.expression : s.expression;
          const target = rootNode ?? e.left ?? e.operand ?? e.expression.expression;
          const sym = checker.getSymbolAtLocation(target);
          const LT = letTypeOf(sym);
          if (LT) { const rt0 = e.right ? typeOf(e.right) : null; const vd = rt0 ? (isAny(rt0) ? anyType() : dtype(rt0, s)) : LT; return `var ${dn(n)}: ${LT} := ${convertD(v, vd, LT)};`; }
          return `var ${dn(n)}: ${dtype(symType(sym, s), s)} := ${v};`;
        });
        if ((tryOf(s) && containsEffect(s)) || (u.isAsync && !loopCtx.length && awaitsHere(s))) return guard(line.trim() ? line : '');
        return line.trim() ? `${line}\n${more0()}` : more0();
      }
      case K.IfStatement: { let cond; const h = capture(() => { cond = truthy(s.expression); return ''; }); const body = ifChain([{ cond, stmts: flatten(s.thenStatement) }], s.elseStatement ? flatten(s.elseStatement) : [], s, rest, fin, u); return h.trim() ? `${h.trim()}\n${body}` : body; }
      case K.SwitchStatement: return isOpaqueStmt(s) ? opaqueBlock(s, rest, fin, u) : coreSwitch(s, rest, fin, u);
      case K.LabeledStatement: return isOpaqueStmt(s.statement) ? opaqueBlock(s, rest, fin, u) : tr([s.statement, ...rest], fin, u);
      case K.FunctionDeclaration: {
        // a nested `function f(...) {...}`: a local function value, like `const f = (...) => {...}`
        if (!s.name) fail(s, 'a nested function needs a name');
        const code = capture(() => lambda(s, s.parameters.length, [], true));
        return `var ${dn(s.name.text)} := ${outerParens(code)};\n${tr(rest, fin, u)}`;
      }
      case K.DoStatement: case K.ForInStatement: case K.ForOfStatement: case K.ForStatement: case K.WhileStatement: {
        if (isOpaqueStmt(s)) return opaqueBlock(s, rest, fin, u);
        let body; const h = capture(() => { body = coreLoop(s, rest, fin, u); return ''; }); return h.trim() ? `${h.trim()}\n${body}` : body;
      }
      case K.ContinueStatement: case K.BreakStatement: {
        const isBreak = ts.isBreakStatement(s);
        if (s.label) return dispatchJump(String((isBreak ? 1 : -1) * labelId(jumpTarget(s))), [(isBreak ? 1 : -1) * labelId(jumpTarget(s))]);
        const sw = switchCtx[switchCtx.length - 1];
        if (isBreak && sw && sw.depth === loopCtx.length) return sw.brk();
        if (!loopCtx.length) fail(s, 'break or continue outside a loop');
        return isBreak ? loopCtx[loopCtx.length - 1].brk() : loopCtx[loopCtx.length - 1].cont();
      }
      default: return fail(s, `statement ${ts.SyntaxKind[s.kind]} is not translated`);
    }
  }
  // an if/else-if chain (or a switch) as an expression; branches that return end the path
  // a break or continue of the ENCLOSING loop inside this statement (not one of a nested loop)
  const containsJump = (node) => { let f = false; const w = (x) => { if (ts.isContinueStatement(x) || ts.isBreakStatement(x)) f = true; if (!f && !ts.isArrowFunction(x) && !ts.isForStatement(x) && !ts.isForOfStatement(x) && !ts.isWhileStatement(x) && !ts.isSwitchStatement(x)) ts.forEachChild(x, w); }; w(node); return f; };
  function ifChain(chain, dflt, node, rest, fin, u) {
    const anyReturn = containsReturn(node) || escapingLabels(node).length > 0 || ((loopCtx.length > 0 || switchCtx.length > 0) && containsJump(node));
    const allTerminate = chain.every((c) => c.stmts.length && terminates(c.stmts[c.stmts.length - 1])) && dflt.length && terminates(dflt[dflt.length - 1]);
    if (anyReturn) {
      const branch = (ss) => tr([...ss, ...(ss.length && terminates(ss[ss.length - 1]) ? [] : rest)], fin, u);
      let out = indentBlock(wrapLet(branch(dflt)));
      for (let i = chain.length - 1; i >= 0; i--) out = `if ${outerParens(chain[i].cond)} then\n${indentBlock(wrapLet(branch(chain[i].stmts)))}\nelse\n${out}`;
      return out.replace(/^if/, 'if');
    }
    const M = assignedOutside(node);
    if (!M.length) return tr(rest, fin, u);
    const names = M.map((m) => dn(m.name));
    const state = () => tupleOf(names);
    let out = indentBlock(wrapLet(dflt.length ? tr(dflt, state, u) : state()));
    for (let i = chain.length - 1; i >= 0; i--) out = `if ${outerParens(chain[i].cond)} then\n${indentBlock(wrapLet(tr(chain[i].stmts, state, u)))}\nelse\n${out}`;
    return `var ${tupleOf(names)} := ${out};\n${tr(rest, fin, u)}`;
  }

  // An opaque block: a statement the translator does not model (try/catch, a loop without a bound). It becomes an
  // uninterpreted transition of the world named by the block's own text: inputs are the locals it reads (and the
  // receiver), outputs are the locals it assigns and, when it may return, the function's result. The same text on both
  // sides is the same transition; a changed text is a different one, so a changed block is never provably equal. The
  // name also lists the same-file functions the block calls: the theorem refuses the block when one of them changed.
  // an opaque statement that cannot fall through returns its completion directly
  const alwaysLeaves = (s) => {
    if (ts.isReturnStatement(s) || ts.isThrowStatement(s)) return true;
    if (ts.isBlock(s)) return s.statements.some(alwaysLeaves);
    if (ts.isSwitchStatement(s) && s.caseBlock.clauses.some(ts.isDefaultClause)) return s.caseBlock.clauses.every((c) => c.statements.some(alwaysLeaves));
    if (ts.isIfStatement(s)) return !!s.elseStatement && alwaysLeaves(s.thenStatement) && alwaysLeaves(s.elseStatement);
    if (ts.isTryStatement(s)) return (s.finallyBlock && alwaysLeaves(s.finallyBlock)) || (alwaysLeaves(s.tryBlock) && (!s.catchClause || alwaysLeaves(s.catchClause.block)));
    return false;
  };
  function opaqueStep(s, u) {
    if (!unitEffectful()) fail(s, 'internal: an opaque block in a unit not marked effectful');
    const returns = containsReturn(s);
    const jumps = escapingLabels(s);
    const loop = ts.isLabeledStatement(s) ? s.statement : s;
    let hasBreak = false;
    const scanBreak = (n) => { if (ts.isFunctionLike(n)) return; if (ts.isBreakStatement(n)) hasBreak = true; ts.forEachChild(n, scanBreak); };
    scanBreak(loop);
    const closed = returns && !jumps.length && !hasBreak && (emptyFor(loop) || ts.isWhileStatement(loop) && loop.expression.kind === K.TrueKeyword);
    const terminal = returns && !jumps.length && (closed || alwaysLeaves(s));
    const M = assignedOutside(s).filter((m) => !m.synthetic).map((m) => ({ ...m, d: letTypeOf(m.sym) ?? dtype(symType(m.sym, m.node), m.node) }));
    // inputs: every local the block reads, and every local it assigns (it may read it first)
    const free = [...M, ...freeVars(s, null).filter((v) => !M.some((m) => m.name === v.name)).map((v) => ({ ...v, d: letTypeOf(v.sym) ?? dtype(symType(v.sym, v.node), v.node) }))];
    let usesSelf = false; const calls = new Set(), moduleBindings = new Set();
    const w = (x) => {
      const binding = moduleState(checker, x, sf);
      if (binding) moduleBindings.add(binding.getText(sf));
      if (x.kind === K.ThisKeyword) usesSelf = true;
      if (ts.isCallExpression(x) || ts.isNewExpression(x)) { const name = unitNameOfCall(x); if (name) calls.add(name); }
      if (ts.isCallExpression(x) && ts.isIdentifier(x.expression) && fns.has(x.expression.text) && originOf(checker, x.expression, sf, currentUnit?.node ?? null).kind === 'unit') calls.add(x.expression.text);
      if (ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && x.expression.expression.kind === K.ThisKeyword && currentUnit?.cls && fns.has(`${currentUnit.className}.${x.expression.name.text}`)) calls.add(`${currentUnit.className}.${x.expression.name.text}`);
      ts.forEachChild(x, w);
    };
    w(s);
    const text = s.getText(sf).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ' ').trim();
    const RD = u.isCtor ? 'Unit' : dtype(retType(u), s);
    const calleeTag = [...calls].sort().map((c) => fname(c).replace(new RegExp(`${sfx}$`), '')).join('_');
    const jumpTag = jumps.length ? '_exits_' + jumps.map((j) => `${j > 0 ? 'b' : 'c'}${Math.abs(j)}`).join('_') : '';
    const moduleTag = moduleBindings.size ? `_modules_${hash([...moduleBindings].sort().join('|'))}` : '';
    const id = `block_${hash(text)}${jumpTag}${moduleTag}${calleeTag ? '_calls_' + calleeTag : ''}`;
    const inTypes = ['World', ...(usesSelf ? [selfType(u)] : []), ...free.map((v) => v.d)];
    const outTypes = ['World', ...(jumps.length ? ['int'] : []), ...(returns ? [terminal ? RD : `Option<${RD}>`] : []), ...M.map((m) => m.d)];
    if (returns && !terminal) usesOption = true;
    const name = external(id, inTypes, outTypes.length === 1 ? outTypes[0] : `(${outTypes.join(', ')})`);
    // record the callees on the prelude block so the theorem can refuse a block whose callee changed
    const key = [...prelude.keys()].find((k) => k === name);
    if (key && calls.size) prelude.set(key, `${prelude.get(key)}\n// CALLS: ${[...calls].sort().map((c) => fname(c).replace(new RegExp(`${sfx}$`), '')).join(',')}`);
    const args = [WORLD, ...(usesSelf ? [SELF] : []), ...free.map((v) => dn(v.name))];
    const jumpName = `jumpb${loopCount}_`;
    const outs = [WORLD, ...(jumps.length ? [jumpName] : []), ...(returns ? ['retb'] : []), ...M.map((m) => dn(m.name))];
    const line = outs.length === 1 ? `var ${outs[0]} := ${name}(${args.join(', ')});` : `var (${outs.join(', ')}) := ${name}(${args.join(', ')});`;
    return { line, returns, terminal, jumps, jumpName };
  }
  function opaqueBlock(s, rest, fin, u) {
    const { line, returns, terminal, jumps, jumpName } = opaqueStep(s, u);
    if (terminal) return `${line}\n${retIn('retb')}`;
    let after = tr(rest, fin, u);
    if (returns) after = `if retb.Some? then\n${indentBlock(retIn('retb.value'))}\nelse\n${indentBlock(wrapLet(after))}`;
    if (jumps.length) after = `if ${jumpName} != 0 then\n${indentBlock(wrapLet(dispatchJump(jumpName, jumps)))}\nelse\n${indentBlock(wrapLet(after))}`;
    return `${line}\n${after}`;
  }
  // a callback local may shadow the variable that receives the method's result
  function callbackShadows(cb, name) {
    let found = false;
    const w = (n) => { if (found) return; if ((ts.isParameter(n) || ts.isVariableDeclaration(n) || ts.isBindingElement(n) || ts.isFunctionDeclaration(n)) && n.name && ts.isIdentifier(n.name) && n.name.text === name) { found = true; return; } ts.forEachChild(n, w); };
    w(cb); return found;
  }
  function callbackStep(value, top) {
    return capture(() => {
      const c = top.collect, name = dn(c.name), method = c.method;
      const predicate = ['filter', 'find', 'findIndex', 'some', 'every'].includes(method);
      const code = value ? outerParens(predicate ? truthy(value) : expr(value, c.valueType)) : (predicate ? 'false' : c.valueD === 'Unit' ? 'Unit' : 'None');
      if (method === 'map' || method === 'flatMap') return `var ${name}: ${c.d} := ${name} + ${method === 'map' || !c.flatSequence ? `[${code}]` : code};\n${top.cont()}`;
      if (method === 'reduce') return `var ${name} := ${code};\n${top.cont()}`;
      const hit = method === 'every' ? `!(${code})` : code;
      const result = method === 'filter' ? `${name} + [${c.element}]` : method === 'find' ? convert(c.element, c.elementType, c.resultType, c.node) : method === 'findIndex' ? (real ? `(${c.index} as real)` : c.index) : method === 'some' ? 'true' : 'false';
      return `if ${hit} then\n${indentBlock(wrapLet(`var ${name} := ${result};\n${method === 'filter' ? top.cont() : top.brk()}`))}\nelse\n${indentBlock(top.cont())}`;
    });
  }
  function callbackLoop(node, shape, name, resultType, rest, fin, u) {
    const D = dtype(resultType, node), method = shape.method;
    const rt = checker.getSignatureFromDeclaration(shape.cb).getReturnType();
    const valueType = shape.all && checker.getAwaitedType ? checker.getAwaitedType(rt) : rt;
    const valueD = dtype(valueType, shape.cb);
    const collect = { name, node, sym: null, synthetic: true, d: D, method, valueType, valueD, flatSequence: isArrayLike(checker, baseOf(valueType)), elementType: elemType(shape.call.expression.expression), resultType };
    const fake = fakeForOf(shape.call, shape, collect);
    if (method === 'find') usesOption = true;
    // the receiver is evaluated before reduce's initial value
    const receiver = outerParens(expr(shape.call.expression.expression));
    let init = ['map', 'filter', 'flatMap'].includes(method) ? '[]' : method === 'find' ? missingD(D) : method === 'findIndex' ? (real ? '-1.0' : '-1') : method === 'every' ? 'true' : 'false';
    if (method === 'reduce') init = outerParens(expr(shape.call.arguments[1], resultType));
    fake.__source = receiver;
    let body; const h = capture(() => { body = coreLoop(fake, rest, fin, u); return ''; });
    return `var ${dn(name)}: ${D} := ${init};\n${h.trim() ? h.trim() + '\n' : ''}${body}`;
  }
  function callbackValue(node, shape) {
    if (!core) fail(node, 'effectful callbacks need --core');
    const resultType = shape.all ? checker.getAwaitedType(typeOf(shape.all)) : typeOf(shape.call);
    const name = `cb${tempCount++}_`;
    const body = capture(() => callbackLoop(node, shape, name, resultType, [], () => `(${WORLD}, ${name})`, currentUnit));
    return hoist(wrapLet(body), dtype(resultType, node));
  }
  function opaqueCompletion(s, next, u, ctx) {
    const { line, returns, terminal, jumps, jumpName } = opaqueStep(s, u);
    let after = terminal ? ctx.ret('retb') : returns ? `if retb.Some? then\n${indentBlock(wrapLet(ctx.ret('retb.value')))}\nelse\n${indentBlock(wrapLet(next()))}` : next();
    if (jumps.length) after = `if ${jumpName} != 0 then\n${indentBlock(wrapLet(dispatchJump(jumpName, jumps)))}\nelse\n${indentBlock(wrapLet(after))}`;
    return `${line}\nif ${faultPreds().faulted}(${WORLD}) then\n${indentBlock(wrapLet(ctx.fault()))}\nelse\n${indentBlock(wrapLet(after))}`;
  }
  // suspended programs and opaque tails include their same-file dependencies in their identity
  function iteratorProgram(node) {
    const seen = new Set([node]), texts = [node.getText(sf)];
    const walk = (n) => {
      if (ts.isPropertyAccessExpression(n)) {
        for (const decl of checker.getSymbolAtLocation(n.name)?.declarations ?? []) {
          if ((ts.isGetAccessorDeclaration(decl) || ts.isSetAccessorDeclaration(decl)) && decl.getSourceFile() === sf && !seen.has(decl)) { seen.add(decl); texts.push(decl.getText(sf)); ts.forEachChild(decl, walk); }
        }
      }
      if (ts.isIdentifier(n)) {
        const o = originOf(checker, n, sf, currentUnit?.node ?? null);
        let decl = ['unit', 'module', 'module-mutable'].includes(o.kind) ? o.decl : null;
        if (o.kind === 'import') { decl = checker.getSymbolAtLocation(n)?.declarations?.[0]; while (decl?.parent && !ts.isImportDeclaration(decl) && !ts.isImportEqualsDeclaration(decl)) decl = decl.parent; }
        if (decl && decl.getSourceFile() === sf && !seen.has(decl)) { seen.add(decl); texts.push(decl.getText(sf)); ts.forEachChild(decl, walk); }
        // a dynamic module initializer can refer to any declaration through source text
        if (['eval', 'Function', 'Reflect', 'Proxy'].includes(n.text) && o.kind === 'global') texts.push(sf.text);
      }
      ts.forEachChild(n, walk);
    };
    walk(node);
    return createHash('sha256').update(texts.join('\n')).digest('hex');
  }
  function emitAsyncGenerator(u) {
    addPrelude('World', 'type World');
    const sp = sigParams(u), D = dtype(retType(u), u.node);
    const self = u.cls && !u.isStatic ? [`${SELF}: ${selfType(u)}`] : [];
    const params = [...self, ...(sp.text ? [sp.text] : [])];
    const names = [...(self.length ? [SELF] : []), ...u.params.map((p, i) => ts.isIdentifier(p.name) ? dn(p.name.text) : `arg${i}_`)];
    const types = [...(self.length ? [selfType(u)] : []), ...u.params.map((p) => dtype(typeOf(p.name), p))];
    const create = external(`async_generator_${iteratorProgram(u.node)}`, ['World', ...types], `(World, ${D})`);
    const tp = unitTParams().length ? `<${unitTParams().map((p) => `${p}(==)`).join(', ')}>` : '';
    chunks.push(`function ${fname(u.name)}${tp}(${[`${WORLD}: World`, ...params].join(', ')}): (World, ${D})\n{\n${indentBlock([...sp.lets, `${create}(${[WORLD, ...names].join(', ')})`].join('\n'))}\n}`);
  }
  // one next transition precedes each consumer step; fuel exhaustion abstracts the remaining loop
  function asyncIteratorLoop(s, rest, fin, u) {
    const id = loopCount++, hn = `${curUnitName()}_loop${id}${sfx}`;
    const fresh = (base) => { let name = base; while (new RegExp(`\\b${name}\\b`).test(sf.text)) name += '_'; return name; };
    const iter = fresh(`iter${id}_`), remaining = fresh(`remaining${id}_`), answer = fresh(`next${id}_`);
    const M = assignedOutside(s).map((m) => m.synthetic ? m : { ...m, d: letTypeOf(m.sym) ?? dtype(symType(m.sym, m.node), m.node) });
    const free = freeVars(s, s.expression).filter((v) => !M.some((m) => m.name === v.name)).map((v) => ({ ...v, d: letTypeOf(v.sym) ?? dtype(symType(v.sym, v.node), v.node) }));
    if (u.cls && !u.isStatic) free.unshift({ name: SELF, d: selfType(u) });
    const vars = [...free, ...M], names = vars.map((v) => dn(v.name));
    const state = () => tupleOf(M.map((v) => dn(v.name)));
    const result = M.length === 1 ? M[0].d : `(${M.map((v) => v.d).join(', ')})`;
    const x = s.initializer.declarations[0].name, T = dtype(typeOf(x), x);
    const IT = addPrelude('AsyncIteratorState', 'type AsyncIteratorState');
    const source = expr(s.expression), SD = dtype(typeOf(s.expression), s.expression);
    const opened = hoist(`${external('async_iterator_open', ['World', SD], `(World, ${IT})`)}(${WORLD}, ${source})`, IT);
    usesOption = true;
    const nextOp = external(`async_iterator_next_${mangle(T)}`, ['World', IT], `(World, Option<${T}>)`);
    const tail = external(`async_iterator_tail_${iteratorProgram(s)}`, [IT, ...vars.map((v) => v.d)], result);
    const next = () => `${hn}(${iter}, ${remaining} - 1, ${names.join(', ')})`;
    loopCtx.push({ cont: next, brk: state, ret: () => fail(s, 'async iterator abrupt completion needs an opaque loop') });
    let step;
    try { step = tr(flatten(s.statement), next, u); } finally { loopCtx.pop(); }
    coreHelpers.push(`function ${hn}${tclause([...vars.map((v) => v.d), T])}(${iter}: ${IT}, ${remaining}: nat, ${vars.map((v) => `${dn(v.name)}: ${v.d}`).join(', ')}): ${result}
  decreases ${remaining}
{
${indentBlock(`if ${remaining} == 0 then ${tail}(${iter}, ${names.join(', ')}) else
  (var (${WORLD}, ${answer}) := ${nextOp}(${WORLD}, ${iter});
   if ${answer}.None? then ${state()} else
${indentBlock(wrapLet(`var ${dn(x.text)}: ${T} := ${answer}.value;\n${step}`), 2)})`)}
}`);
    const fuel = `${external('async_iterator_fuel', [], 'nat')}()`;
    return `var ${state()} := ${hn}(${opened}, ${fuel}, ${names.join(', ')});\n${tr(rest, fin, u)}`;
  }
  function coreLoop(s, rest, fin, u) {
    if (s.awaitModifier) return asyncIteratorLoop(s, rest, fin, u);
    const id = loopCount++;
    const jumps = escapingLabels(s);
    const returns = !s.__forEach && containsReturn(s); // a return inside a forEach callback ends one step, never the function
    const M = assignedOutside(s).map((m) => (m.synthetic ? m : { ...m, d: letTypeOf(m.sym) ?? dtype(symType(m.sym, m.node), m.node) }));
    if (!M.length && !returns && !jumps.length) return tr(rest, fin, u);
    if (ts.isForStatement(s) && !emptyFor(s) && (containsEffect(s.condition) || containsEffect(s.incrementor))) fail(s, 'an effect in a for header');
    const RD = u.isCtor ? 'Unit' : dtype(retType(u), s);
    if (returns) usesOption = true;
    const isIn = ts.isForInStatement(s); const isOf = ts.isForOfStatement(s) || isIn, isFor = ts.isForStatement(s) && !emptyFor(s); // `for (k in o)` is a for-of over the keys of o
    const userHints = [...hintsOf(sf, s).invariants, ...invariants.filter((x) => x.loop === null || x.loop === id).map((x) => x.expr)];
    const hintWords = new Set(userHints.flatMap((h) => h.match(/[A-Za-z_]\w*/g) ?? []));
    const inScopeVars = [];
    const scan = (x) => {
      if (ts.isParameter(x) || ts.isVariableDeclaration(x) || ts.isBindingElement(x)) {
        if (ts.isIdentifier(x.name) && x.end <= s.pos && !insideNode(x, s)) inScopeVars.push({ name: x.name.text, sym: checker.getSymbolAtLocation(x.name), node: x.name });
      }
      ts.forEachChild(x, scan);
    };
    scan(u.fn);
    const free = freeVars(s, isOf ? s.expression : null);
    for (const v of inScopeVars) if (hintWords.has(v.name) && !free.some((f) => f.name === v.name)) free.push(v);
    const freeTyped = free.filter((v) => !M.some((m) => m.name === v.name)).map((v) => ({ ...v, d: letTypeOf(v.sym) ?? dtype(symType(v.sym, v.node), v.node) }));
    free.length = 0; free.push(...freeTyped);
    const hn = `${curUnitName()}_loop${id}${sfx}`;
    const mNames = M.map((m) => dn(m.name));
    const retName = `ret${id}`;
    const jumpName = `jump${id}`;
    const outNames = [...(jumps.length ? [jumpName] : []), ...(returns ? [retName] : []), ...mNames]; // what the helper returns
    let loopUsesSelf = false; { const w = (x) => { if (x.kind === K.ThisKeyword) loopUsesSelf = true; if (!loopUsesSelf) ts.forEachChild(x, w); }; w(s); }
    const constParams = [...(loopUsesSelf && classOf(u) ? [`${SELF}: ${selfType(u)}`] : []), ...free.map((v) => `${dn(v.name)}: ${v.d}`)];
    const stateParams = M.map((m) => `${dn(m.name)}: ${m.d}`);
    const constArgs = [...(loopUsesSelf && classOf(u) ? [SELF] : []), ...free.map((v) => dn(v.name))];
    const requiresL = [];
    let lead = [], leadArgsNext = [], leadArgsFirst = [], exit, bind = '', decreases, factsIn = new Set();
    let conditionLines = [];
    let lp = null;
    if (isOf) {
      const x = s.initializer.declarations[0].name;
      const itT = baseOf(typeOf(s.expression));
      let T, src;
      if (isIn) { const D = isAny(itT) ? anyType() : dtype(itT, s); T = 'string'; src = `${external('Object_keys', [D], 'seq<string>')}(${expr(s.expression)})`; } // the keys of the object, an uninterpreted sequence of the value (JavaScript's insertion order is a fact of the value)
      else if (isAny(itT)) { T = anyType(); src = seqOf(s.expression); }
      else if (isRecordish(itT)) { T = dtype(typeOf(x), x); const IT = dtype(itT, s); src = `${external(`${mangle(IT)}_to_seq`, [IT], `seq<${T}>`)}(${expr(s.expression)})`; }
      else if (itT.flags & TF.StringLike) { T = 'string'; src = `${helper('Map', ['char', 'string'])}(${expr(s.expression)}, ((c: char) => [c]))`; }
      else if (isSetT(itT)) { T = dtype(checker.getTypeArguments(itT)[0], s); src = seqOf(s.expression); }
      else if (isMapT(itT)) { const [kt, vt] = checker.getTypeArguments(itT); const Kd = dtype(kt, s), Vd = dtype(vt, s); T = `(${Kd}, ${Vd})`; src = `${external('map_entries', [`map<${Kd}, ${Vd}>`], `seq<(${Kd}, ${Vd})>`)}(${expr(s.expression)})`; }
      else { T = dtype(typeOf(x), x); src = s.__source ?? outerParens(expr(s.expression)); }
      const sq = `seq${id}`, ix = `idx${id}`;
      lead = [`${sq}: seq<${T}>`, `${ix}: int`];
      leadArgsNext = [sq, `${ix} + 1`];
      leadArgsFirst = [s.__source ?? src, '0'];
      requiresL.push(`0 <= ${ix} <= |${sq}|`);
      const cb = filterProvenance(s.expression);
      if (cb) requiresL.push(`forall k :: 0 <= k < |${sq}| ==> ${lambda(cb, 1)}(${sq}[k])`);
      exit = `${ix} >= |${sq}|`;
      bind = ts.isIdentifier(x) ? `var ${dn(x.text)}: ${T} := ${sq}[${ix}];\n` : destructure(x, `${sq}[${ix}]`, typeOf(x)).join('\n') + '\n';
      decreases = `|${sq}| - ${ix}`;
      if (s.__callback?.method === 'reduce') bind += `var ${dn(s.__callback.cb.parameters[0].name.text)} := ${dn(s.__collect.name)};\n`;
      else if (s.__callback?.cb.parameters.length === 2) bind += `var ${dn(s.__callback.cb.parameters[1].name.text)} := ${real ? `(${ix} as real)` : ix};\n`;
      factsIn = elementFacts(s);
    } else if (isFor) {
      lp = forParts(s);
      lead = [`${dn(lp.i)}: int`];
      leadArgsNext = [`${dn(lp.i)} ${lp.down ? '-' : '+'} ${lp.step}`];
      leadArgsFirst = [lp.start];
      if (real) intVars.add(lp.i);
      const cond = forCond(lp);
      exit = `!(${cond})`;
      decreases = forDecreases(lp, cond);
      if (ts.isNumericLiteral(s.initializer.declarations[0].initializer)) { factsIn = new Set([lp.i]); if (!lp.down && !real) requiresL.push(`${dn(lp.i)} >= ${lp.start}`); }
    } else {
      const h = hintsOf(sf, s), bound = derivedBound(s);
      const condition = captureParts(() => bound ? `${dn(bound.counter.text)} ${bound.op} ${outerParens(expr(bound.limit))}` : emptyFor(s) ? 'true' : truthy(s.expression));
      conditionLines = condition.lines;
      const cond = outerParens(condition.text);
      exit = `!(${cond})`;
      decreases = h.decreases ?? (bound ? `if ${cond} then ${bound.down ? `${dn(bound.counter.text)} - ${outerParens(expr(bound.limit))}` : `${outerParens(expr(bound.limit))} - ${dn(bound.counter.text)}`} + 1 else 0` : fail(s, 'while needs `// @decreases <expr>`'));
      if (ts.isDoStatement(s)) {
        lead = [`first${id}: bool`]; leadArgsFirst = ['true']; leadArgsNext = ['false'];
        if (conditionLines.length) {
          const stop = `stop${id}`;
          conditionLines = [`var ${tupleOf([...mNames, stop])} := if first${id} then ${tupleOf([...mNames, 'false'])} else ${wrapLet([...conditionLines, tupleOf([...mNames, exit])].join('\n'))};`];
          exit = stop;
        } else exit = `!first${id} && (${exit})`;
        decreases = `(if first${id} then 1 else 0), ${decreases}`;
      }
    }
    const next = () => `${hn}(${[...leadArgsNext, ...constArgs, ...mNames].join(', ')})`;
    const completed = (jump = '0', ret = 'None') => tupleOf([...(jumps.length ? [jump] : []), ...(returns ? [ret] : []), ...mNames]);
    const exitVal = () => completed();
    loopCtx.push({ label: labelId(s), jump: (code) => jumps.length ? completed(code) : fail(s, 'a labelled exit lacks its completion channel'), cont: next, brk: exitVal, forEach: !!s.__forEach, collect: s.__collect ? { ...s.__collect, element: dn(s.initializer.declarations[0].name.text), index: `idx${id}` } : null, ret: (code) => (returns ? completed('0', `Some(${code})`) : fail(s, 'internal: return in a loop without the return shape')) });
    let bodyE;
    try { bodyE = tr(derivedBound(s)?.body ?? flatten(s.statement), s.__collect ? () => callbackStep(null, loopCtx[loopCtx.length - 1]) : next, u); } finally { loopCtx.pop(); }
    const params = [...lead, ...constParams, ...stateParams];
    const selfArgs = [...lead.map((p) => p.split(':')[0]), ...constArgs, ...mNames];
    const callS = `${hn}(${selfArgs.join(', ')})`;
    const outTypes = [...(jumps.length ? ['int'] : []), ...(returns ? [`Option<${RD}>`] : []), ...M.map((m) => m.d)];
    const resT = outTypes.length === 1 ? outTypes[0] : `(${outTypes.join(', ')})`;
    const hints = [...userHints];
    for (const m of M) {
      if ((m.d === 'int' || m.d === 'real') && keepsNonneg(m.name, s.statement, factsIn)) hints.push(`${dn(m.name)} >= ${m.d === 'real' ? '0.0' : '0'}`);
    }
    const exitFact = !isOf && !isFor && !returns && !conditionLines.length && !jumps.length && !ts.isDoStatement(s) && !(derivedBound(s)?.body ?? [s.statement]).some((b) => escapingLabels(b).length > 0) ? [`  ensures (var ${tupleOf(outNames)} := ${callS}; ${exit})`] : [];
    const specs = [...requiresL.map((r) => `  requires ${r}`),
      ...hints.map((h) => `  ensures (${h}) ==> (var ${tupleOf(outNames)} := ${callS}; ${h})`),
      ...exitFact,
      `  decreases ${decreases}`];
    coreHelpers.push([`function ${hn}${tclause([...params, resT])}(${params.join(', ')}): ${resT}`, ...specs, '{',
      indentBlock(`${conditionLines.length ? conditionLines.join('\n') + '\n' : ''}if ${exit} then ${exitVal()}\nelse\n${indentBlock(wrapLet(bind + bodyE))}`), '}'].join('\n'));
    if (isFor && real) intVars.delete(lp.i);
    const first = `${hn}(${[...leadArgsFirst, ...constArgs, ...mNames].join(', ')})`;
    let after = tr(rest, fin, u);
    if (returns) after = `if ${retName}.Some? then\n${indentBlock(retIn(`${retName}.value`))}\nelse\n${indentBlock(wrapLet(after))}`;
    if (jumps.length) after = `if ${jumpName} != 0 then\n${indentBlock(wrapLet(dispatchJump(jumpName, jumps)))}\nelse\n${indentBlock(wrapLet(after))}`;
    return `var ${tupleOf(outNames)} := ${first};\n${after}`;
  }

  // special-producing arithmetic keeps its entire observer opaque, including same-file callers
  const numericOpaque = new Set(), numericDeps = new Map(), numericSources = new Map();
  const unitByDecl = new Map([...fns.values()].flatMap((u) => [[u.fn, u], [u.node, u]]));
  const finiteLiteral = (n) => {
    while (ts.isParenthesizedExpression(n)) n = n.expression;
    if (ts.isNumericLiteral(n)) return Number(n.text);
    if (ts.isPrefixUnaryExpression(n) && [K.MinusToken, K.PlusToken].includes(n.operator)) { const v = finiteLiteral(n.operand); return v === null ? null : n.operator === K.MinusToken ? -v : v; }
    return null;
  };
  for (const u of order) {
    const deps = new Set(); numericDeps.set(u.name, deps);
    const sources = new Set(), seen = new Set(); numericSources.set(u.name, sources);
    const scan = (n) => {
      if (ts.isTypeNode(n) || seen.has(n)) return;
      // a numeric literal in a template is rendered directly as its JavaScript string
      if (ts.isTemplateSpan(n) && finiteLiteral(n.expression) !== null) return;
      seen.add(n);
      // high-resolution clock observers need reals or a source-sensitive opaque unit
      if (!real && ts.isIdentifier(n) && n.text === 'performance' && originOf(checker, n, sf, u.node).kind === 'global') numericOpaque.add(u.name);
      if (!real && ts.isPropertyAccessExpression(n) && n.name.text === 'hrtime' && ts.isIdentifier(n.expression) && n.expression.text === 'process' && outsideRoot(checker, n.expression, sf, u.node)) numericOpaque.add(u.name);
      if (ts.isPropertyAccessExpression(n)) {
        const get = accessorOf(n, 'get', u), set = propertyWrite(n) && accessorOf(n, 'set', u);
        for (const dep of [get, set]) if (dep && dep !== u) deps.add(dep.name);
      }
      if (ts.isIdentifier(n)) {
        const d = checker.getSymbolAtLocation(n)?.valueDeclaration;
        const other = unitByDecl.get(d) ?? (d && ts.isVariableDeclaration(d) ? unitByDecl.get(d.initializer) : null);
        if (other && other !== u) deps.add(other.name);
        if (d && ts.isVariableDeclaration(d) && d.parent?.parent?.parent === sf && d.initializer && !other) { sources.add(d.getText(sf)); scan(d.initializer); }
        if (['NaN', 'Infinity'].includes(n.text) && originOf(checker, n, sf, u.node).kind === 'global') numericOpaque.add(u.name);
      }
      if (ts.isBinaryExpression(n) && [K.SlashToken, K.PercentToken].includes(n.operatorToken.kind)) {
        const divisor = finiteLiteral(n.right);
        if (divisor === null || !Number.isFinite(divisor) || divisor === 0) numericOpaque.add(u.name);
      }
      if (ts.isNumericLiteral(n) && !Number.isFinite(Number(n.text))) numericOpaque.add(u.name);
      if (ts.isPrefixUnaryExpression(n) && n.operator === K.MinusToken && Object.is(finiteLiteral(n), -0)) numericOpaque.add(u.name);
      if (ts.isPrefixUnaryExpression(n) && n.operator === K.PlusToken && !(typeOf(n.operand).flags & (TF.NumberLike | TF.BooleanLike))) numericOpaque.add(u.name);
      if (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'Number' && originOf(checker, n.expression, sf, u.node).kind === 'global' && ['NaN', 'POSITIVE_INFINITY', 'NEGATIVE_INFINITY'].includes(n.name.text)) numericOpaque.add(u.name);
      if (ts.isCallExpression(n)) {
        const f = n.expression;
        if (ts.isIdentifier(f) && originOf(checker, f, sf, u.node).kind === 'global' && (['parseInt', 'parseFloat'].includes(f.text) || (f.text === 'Number' && n.arguments.some((a) => !(typeOf(a).flags & (TF.NumberLike | TF.BooleanLike)))))) numericOpaque.add(u.name);
        if (ts.isPropertyAccessExpression(f) && ts.isIdentifier(f.expression) && f.expression.text === 'Number' && originOf(checker, f.expression, sf, u.node).kind === 'global' && ['parseInt', 'parseFloat'].includes(f.name.text)) numericOpaque.add(u.name);
      }
      ts.forEachChild(n, scan);
    };
    scan(u.fn);
  }
  for (let changed = true; changed;) {
    changed = false;
    for (const [name, deps] of numericDeps) if (!numericOpaque.has(name) && [...deps].some((d) => numericOpaque.has(d))) { numericOpaque.add(name); changed = true; }
  }
  function numericKey(u) {
    const seen = new Set();
    const visit = (name) => { if (seen.has(name)) return; seen.add(name); for (const dep of numericDeps.get(name) ?? []) visit(dep); };
    visit(u.name);
    if (moduleUnitShape(u).reads) return createHash('sha256').update(sf.text + '\n' + u.name).digest('hex');
    return createHash('sha256').update([...seen].sort().map((name) => `${name}:${fns.get(name).fn.getText(sf)}\n${[...(numericSources.get(name) ?? [])].sort().join('\n')}`).join('\n')).digest('hex');
  }
  function opaqueNumericUnit(u, rt, specs) {
    const params = [], args = [];
    const add = (name, d) => { params.push(`${name}: ${d}`); args.push({ name, d }); };
    const eff = core && effectfulUnits.has(u.name);
    if (eff) { addPrelude('World', 'type World'); add(WORLD, 'World'); }
    if (core && recursiveUnits.has(u.name)) add(FUEL, 'nat');
    if (classOf(u) && !u.isStatic) add(SELF, selfType(u));
    u.params.forEach((p, i) => {
      let d = dtype(typeOf(p.name), p), name = ts.isIdentifier(p.name) ? dn(p.name.text) : `arg${i}_`;
      if (p.initializer && ts.isIdentifier(p.name)) { usesOption = true; d = hasAbsence(typeOf(p.name), TF.Null) ? dtype(inputType(p), p) : `Option<${d}>`; name += '_opt'; }
      else if (p.questionToken && !optionalD(d)) { usesOption = true; d = `Option<${d}>`; }
      add(name, d);
    });
    const outs = [...(eff ? ['World'] : []), rt, ...(core ? mutatedOf(u).map((m) => dtype(typeOf(u.params.find((p) => ts.isIdentifier(p.name) && p.name.text === m).name), u.node)) : [])];
    const out = outs.length === 1 ? rt : `(${outs.join(', ')})`;
    const ext = external(`number_special_${numericKey(u)}`, args.map((a) => a.d), out);
    const tp = unitTParams().length ? `<${unitTParams().map((p) => `${p}(==)`).join(', ')}>` : '';
    return [`function ${fname(u.name)}${tp}(${params.join(', ')}): ${core ? out : `(result: ${out})`}`, ...specs, `{ ${ext}(${args.map((a) => a.name).join(', ')}) }`].join('\n');
  }

  // ----- which units are effectful: callees come first in `order`, so a caller sees its callee's flag -----
  for (const name of effectful) effectfulUnits.add(name); // forced by the other side of a pair: both sides thread the world
  if (core) for (const name of exceptionUnits) effectfulUnits.add(name);
  let effectsChanged = true;
  while (effectsChanged) {
    const before = effectfulUnits.size;
    for (const u of order) {
      currentUnit = u;
      if (core && (u.isCtor || asyncGenerator(u) || u.accessor === 'set' || accessorOpaque.has(u.name) || containsEffect(u.body) || moduleUnitShape(u).reads)) effectfulUnits.add(u.name);
      currentUnit = null;
    }
    effectsChanged = effectfulUnits.size !== before;
  }
  if (core) computeMutations();
  // ----- emit functions -----
  for (const u of order) kindOf.set(u, hasLoopOrMutation(u.body) ? 'method' : 'function');
  function sigParams(u) {
    const parts = []; const lets = [];
    const opaqueDefaults = core && moduleUnitShape(u).opaque;
    u.params.forEach((p, i) => {
      const t = typeOf(p.name);
      let d = dtype(t, p);
      if (p.initializer && ts.isIdentifier(p.name)) {
        // a nullable default has three input states; only Undef runs the initializer
        if (hasAbsence(t, TF.Null)) {
          const incoming = inputType(p), D = dtype(incoming, p), pn = `${dn(p.name.text)}_opt`;
          parts.push(`${pn}: ${D}`);
          lets.push(`var ${dn(p.name.text)}: ${d} := if ${pn}.Undef? then ${outerParens(expr(p.initializer, t))} else ${convert(pn, incoming, t, p)};`);
          return;
        }
        // a nonnullable default retains its existing Option input
        usesOption = true;
        const pn = `${dn(p.name.text)}_opt`;
        parts.push(`${pn}: Option<${d}>`);
        if (!opaqueDefaults) lets.push(`var ${dn(p.name.text)}: ${d} := if ${pn}.Some? then ${pn}.value else ${outerParens(expr(p.initializer, t))};`);
        return;
      }
      if (p.questionToken && !optionalD(d)) { usesOption = true; d = `Option<${d}>`; }
      if (ts.isIdentifier(p.name)) parts.push(`${dn(p.name.text)}: ${d}`);
      else { const pn = `arg${i}_`; parts.push(`${pn}: ${d}`); lets.push(...destructure(p.name, pn, typeOf(p.name))); }
    });
    return { text: parts.join(', '), lets };
  }
  const chunks = [];
  for (const u of order) {
    if (tolerant) {
      const before = chunks.length; const savedPending = pending;
      try { sigLines.push(`// SIG ${fname(u.name)}: ${sigOf(u)}`); if (heapT?.isCore(u)) { const h = heapT.emit(u); chunks.push(h.text); heapHyps.push(`// HYP ${fname(u.name)}: ${h.hyp}`); } else { emitUnit(u); if (heapT) heapGuards.push(`// GUARD ${fname(u.name)}: ${JSON.stringify(heapT.guard(u))}`); } cellLines.push(`// CELLS ${fname(u.name)}: ${JSON.stringify(cellsOf(u, chunks.slice(before).join('\n')))}`); fnLines.push(`// FN ${fname(u.name)}: ${JSON.stringify([...(fnIdsOf.get(u.name) ?? [])].sort())}`); report.translated.push(u.name); }
      catch (e) { if (!(e instanceof Unsupported)) throw e; chunks.length = before; pending = savedPending; failedUnits.add(u.name); report.failed.push({ unit: u.name, message: String(e.message).split('\n')[0].slice(0, 160) }); currentUnit = null; yieldState = null; }
      continue;
    }
    sigLines.push(`// SIG ${fname(u.name)}: ${sigOf(u)}`);
    const before = chunks.length;
    if (heapT?.isCore(u)) { const h = heapT.emit(u); chunks.push(h.text); heapHyps.push(`// HYP ${fname(u.name)}: ${h.hyp}`); }
    else { emitUnit(u); if (heapT) heapGuards.push(`// GUARD ${fname(u.name)}: ${JSON.stringify(heapT.guard(u))}`); }
    cellLines.push(`// CELLS ${fname(u.name)}: ${JSON.stringify(cellsOf(u, chunks.slice(before).join('\n')))}`);
    fnLines.push(`// FN ${fname(u.name)}: ${JSON.stringify([...(fnIdsOf.get(u.name) ?? [])].sort())}`);
  }
  function moduleUnitShape(u) {
    let reads = false, alias = false, effects = false, collection = false, outsideEffect = false, guarded = false, nestedRead = false, globalAlias = false, moduleData = false, moduleCall = false;
    const reference = (t) => nonNull(t).some((p) => p.flags & (TF.Object | TF.Any | TF.Unknown));
    const unwrap = (n) => { while (n && (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isNonNullExpression(n))) n = n.expression; return n; };
    const walk = (n, nested = false) => {
      const state = moduleState(checker, n, sf), global = worldRead(checker, n, sf, u.node) || (outsideRoot(checker, n, sf, u.node) && n.text !== 'require');
      if (state || global || moduleLoader(checker, n, sf, u.node)) { reads = true; if (nested) nestedRead = true; }
      if (state && reference(typeOf(state.name))) collection = true;
      if (state && checker.getPropertiesOfType(baseOf(typeOf(state.name))).some((p) => p.declarations?.some((d) => ts.isGetAccessorDeclaration(d) || ts.isSetAccessorDeclaration(d)))) guarded = true;
      if (global && (n.questionDotToken || (n.flags & ts.NodeFlags.OptionalChain))) guarded = true;
      if (ts.isVariableDeclaration(n) && n.initializer) {
        const init = unwrap(n.initializer);
        if (reference(typeOf(init))) {
          if (moduleState(checker, init, sf)) alias = true;
          if (worldRead(checker, init, sf, u.node) || outsideRoot(checker, init, sf, u.node)) globalAlias = true;
        }
      }
      if (ts.isBinaryExpression(n)) {
        const op = n.operatorToken.kind;
        if (([K.AmpersandAmpersandToken, K.BarBarToken].includes(op) && containsEffect(n.left)) || (op === K.QuestionQuestionToken && containsEffect(n.right)) || (op === K.SlashToken && containsEffect(n))) guarded = true;
        if ([K.EqualsEqualsToken, K.ExclamationEqualsToken, K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken].includes(op) && (isNullish(typeOf(n.left)) || isNullish(typeOf(n.right))) && containsEffect(n)) guarded = true;
      }
      if ((ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n)) && !(ts.isCallExpression(n.parent) && n.parent.expression === n)) {
        let recv = unwrap(n.expression);
        if (ts.isIdentifier(recv)) { const decl = checker.getSymbolAtLocation(recv)?.valueDeclaration; if (decl && ts.isVariableDeclaration(decl) && decl.initializer) recv = unwrap(decl.initializer); }
        if (ts.isAwaitExpression(recv)) recv = unwrap(recv.expression);
        if (moduleLoader(checker, recv, sf, u.node)) moduleData = true;
      }
      if (ts.isCallExpression(n) && !moduleLoader(checker, n, sf, u.node) && isEffectCall(n)) moduleCall = true;
      if (ts.isCallExpression(n) && n.expression.getText(sf) === 'Object.assign') guarded = true;
      if (ts.isObjectLiteralExpression(n) && n.properties.some(ts.isSpreadAssignment) && containsEffect(n)) guarded = true;
      if (isEffectCall(n)) {
        effects = true;
        const ownMutation = ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && moduleState(checker, n.expression.expression, sf) && MUTATORS.has(n.expression.name.text);
        if (!ownMutation || n.arguments.some((a) => containsEffect(a))) outsideEffect = true;
      }
      ts.forEachChild(n, (x) => walk(x, nested || ts.isArrowFunction(n) || ts.isFunctionExpression(n)));
    };
    walk(u.body);
    for (const p of u.params) if (p.initializer) walk(p.initializer);
    return { reads, opaque: reads && (guarded || globalAlias || nestedRead || (moduleData && moduleCall) || u.params.some((p) => p.initializer) || (collection && (outsideEffect || (alias && effects)))) };
  }
  function opaqueModuleBody(u) {
    const inputs = [WORLD, ...(u.cls && !u.isStatic ? [SELF] : []), ...u.params.map((p, i) => ts.isIdentifier(p.name) ? `${dn(p.name.text)}${p.initializer ? '_opt' : ''}` : `arg${i}_`)];
    const types = ['World', ...(u.cls && !u.isStatic ? [selfType(u)] : []), ...u.params.map((p) => { const d = dtype(typeOf(p.name), p); return p.initializer ? `Option<${d}>` : p.questionToken && !d.startsWith('Option<') ? `Option<${d}>` : d; })];
    const outputs = ['World', u.isCtor ? 'Unit' : dtype(retType(u), u.node), ...mutatedOf(u).map((m) => dtype(typeOf(u.params.find((p) => ts.isIdentifier(p.name) && p.name.text === m).name), u.node))];
    // the complete source keeps every module initializer and same-file dependency in the opaque identity
    return `${external(`Module_file_block_${hash(sf.text)}_${u.name}`, types, `(${outputs.join(', ')})`)}(${inputs.join(', ')})`;
  }
  function emitUnit(u) {
    currentUnit = u;
    faultMode = false;
    loopCount = 0; labelIds.clear();
    if (asyncGenerator(u)) { if (!core) fail(u.node, 'async generators need --core'); emitAsyncGenerator(u); currentUnit = null; return; }
    if (u.fn.asteriskToken) { if (!core) fail(u.node, 'generators need --core'); let name = 'yielded_'; while (new RegExp(`\\b${name}\\b`).test(sf.text)) name += '_'; yieldState = { name, sym: null, node: u.node, synthetic: true, element: generators.shape(u).element, d: dtype(retType(u), u.node) }; }
    const rt = u.isCtor ? 'Unit' : dtype(retType(u), u.node);
    const name = fname(u.name);
    const specs = [];
    const argNames = u.params.map((p, i) => (ts.isIdentifier(p.name) ? dn(p.name.text) : `arg${i}_`)).join(', ');
    const sub = (e) => (core ? e.replace(/\bresult\b/g, `${name}(${argNames})`) : e);
    if (u === target) {
      for (const r of requires) specs.push(`  requires ${sub(r)}`);
      for (const e of ensures) specs.push(`  ensures ${sub(e)}`);
    }
    if (numericOpaque.has(u.name)) { chunks.push(opaqueNumericUnit(u, rt, specs)); currentUnit = null; return; }
    const sp = sigParams(u);
    const bodyList = ts.isBlock(u.body) ? [...u.body.statements] : null;
    if (core) {
      const eff = effectfulUnits.has(u.name);
      if (eff) addPrelude('World', 'type World');
      currentSlots = null;
      if (slotUnits.has(u.name) && !exceptionUnits.has(u.name) && !recursiveUnits.has(u.name) && !u.isCtor) {
        const types = slotUnits.get(u.name).map(({ call }) => dtype(checker.getTypeArguments(typeOf(call))[0], call));
        const T = `Slots_${hash(types.join(','))}`;
        addPrelude(T, `datatype ${T} = ${T}(${types.map((d, i) => `s${i}: ${d}`).join(', ')})`);
        currentSlots = { T, n: types.length, types };
      }
      const endVal = () => yieldState ? wrapRet(yieldState.name) : (u.isCtor || (retType(u).flags & TF.Void) ? wrapRet('Unit') : retType(u).flags & TF.Undefined ? wrapRet(absentValue(retType(u))) : fail(u.node, 'a path ends without a return'));
      const ctx = { ret: wrapRet, fault: () => faultResult(u) };
      const opaqueBody = () => { const ps = [...(eff ? ['World'] : []), ...(!u.isStatic ? [selfType(u)] : []), ...u.params.map((p) => dtype(typeOf(p.name), p)), 'seq<string>']; const args = [...(eff ? [WORLD] : []), ...(!u.isStatic ? [SELF] : []), ...u.params.map((p) => dn(p.name.text)), `[${(Buffer.from(sf.text).toString('hex').match(/.{1,128}/g) ?? []).map(strEsc).join(', ')}]`]; return `${external(`accessor_${u.name}`, ps, eff ? `(World, ${rt})` : rt)}(${args.join(', ')})`; };
      const moduleShape = moduleUnitShape(u);
      let body0, usedModuleOpaque = moduleShape.opaque;
      const savedPending = pending, savedHelpers = coreHelpers.length;
      try { body0 = moduleShape.opaque ? opaqueModuleBody(u) : u.accessor && accessorOpaque.has(u.name) ? opaqueBody() : exceptionUnits.has(u.name) ? (bodyList ? faultTr(bodyList, endVal, u, ctx) : faultEval(() => expr(u.body, retType(u)), wrapRet, ctx)) : (bodyList ? tr(bodyList, endVal, u) : capture(() => wrapRet(expr(u.body, retType(u))))); }
      catch (e) { if (!(e instanceof Unsupported) || !moduleShape.reads || !eff || u.isCtor) throw e; pending = savedPending; coreHelpers.length = savedHelpers; usedModuleOpaque = true; body0 = opaqueModuleBody(u); }
      const cleared = exceptionUnits.has(u.name) ? `var ${WORLD} := ${faultPreds().clear}(${WORLD});\n${body0}` : body0;
      const body = u.isCtor && !usedModuleOpaque ? `${ctorPrefix(u)}${cleared}` : yieldState ? `var ${yieldState.name}: ${yieldState.d} := [];\n${cleared}` : cleared;
      const mutLets = mutatedOf(u).map((m) => `var ${dn(m)} := ${dn(m)};`); // a mutated parameter starts as the argument and is rebound by the body
      const full = usedModuleOpaque ? body : [...sp.lets, ...mutLets].length ? `${[...sp.lets, ...mutLets].join('\n')}\n${body}` : body;
      const selfParam = classOf(u) && !u.isStatic ? `${SELF}: ${selfType(u)}` : '';
      const plain = [selfParam, sp.text, ...(currentSlots ? [`slots: ${currentSlots.T}`] : [])].filter(Boolean).join(', ');
      const rec = recursiveUnits.has(u.name);
      const plain2 = rec ? [`${FUEL}: nat`, plain].filter(Boolean).join(', ') : plain;
      const sig = eff ? `${WORLD}: World${plain2 ? ', ' + plain2 : ''}` : plain2;
      const mutTypes = mutatedOf(u).map((m) => { const pr = u.params.find((p) => ts.isIdentifier(p.name) && p.name.text === m); return dtype(typeOf(pr.name), pr); });
      const rparts = [...(eff ? ['World'] : []), rt, ...mutTypes, ...(currentSlots ? [currentSlots.T] : [])];
      const rtype = rparts.length === 1 ? rt : `(${rparts.join(', ')})`;
      const outOfFuel = rec ? wrapRet(`${external(`fuel_out_${mangle(rt)}`, [], rt)}()`) : null;
      const full2 = rec ? `if ${FUEL} == 0 then ${outOfFuel} else\n${indentBlock(wrapLet(full))}` : full;
      const specs2 = rec ? [...specs, `  decreases ${FUEL}`] : specs;
      const tp = unitTParams().length ? `<${unitTParams().map((p) => `${p}(==)`).join(', ')}>` : '';
      chunks.push(...coreHelpers.splice(0), [`function ${name}${tp}(${sig}): ${rtype}`, ...specs2, '{', indentBlock(full2), '}'].join('\n'));
    } else if (kindOf.get(u) === 'function') {
      const body = bodyList ? bodyExpr(bodyList, u) : expr(u.body, retType(u));
      const full = sp.lets.length ? `${sp.lets.join('\n')}\n${body}` : body;
      chunks.push([`function ${name}(${sp.text}): (result: ${rt})`, ...specs, '{', indentBlock(full), '}'].join('\n'));
    } else {
      const lines = [];
      for (const l of sp.lets) lines.push('  ' + l);
      stmts(bodyList, 1, u, lines);
      chunks.push([`method ${name}(${sp.text}) returns (result: ${rt})`, ...specs, '{', ...lines, '}'].join('\n'));
    }
    yieldState = null;
    currentUnit = null;
    currentSlots = null;
    faultMode = false;
  }
  if (heapT) report.heap = { core: [...heapT.core()].sort(), whyNot: Object.fromEntries(order.filter((u) => !heapT.isCore(u)).map((u) => [u.name, heapT.whyNot(u.name)])), layer1Risk: Object.fromEntries(order.filter((u) => !heapT.isCore(u)).map((u) => [u.name, heapT.layer1Risk(u)]).filter(([, r]) => r.length)) };
  if (tolerant && reportOut) fs.writeFileSync(reportOut, JSON.stringify(report, null, 1));

  // integer division placeholders left by `/` under Math.floor are resolved in call(); a leftover is a defect
  const qualify = (text) => usesNullish ? text.replace(/("(?:\\.|[^"\\])*")|(?<![.\w])Some\(/g, (m, literal) => literal ?? 'Option.Some(') : text;
  const main = qualify(chunks.join('\n\n'));
  if (main.includes('__DIV__')) throw new Unsupported('internal: an integer division was not placed under Math.floor');

  const pre = [];
  const heapPre = heapT ? heapT.prelude() : [];
  if (heapPre.some((l) => l.includes('Option<'))) usesOption = true; // the table's Map.get answers an Option
  if (prelude.size || usesOption || heapPre.length) {
    pre.push('datatype Unit = Unit');
    if (usesOption) pre.push('datatype Option<T> = None | Some(value: T)');
    if (usesNullish) pre.push('datatype Nullish<T> = Null | Undef | Some(value: T)');
    for (const [k, text] of prelude) pre.push(qualify(text));
    for (const text of heapPre) pre.push(text);
  }
  const header = `// Generated by lean-ts translate (version 3) from ${path.basename(file)}, ${fnName ? `function ${fnName}` : 'all functions'}. number is ${NUM}.\n// Do not edit: the gate regenerates this file.\n// EFFECTFUL: ${[...effectfulUnits].sort().join(',')}${heapT ? `\n// HEAP: ${[...heapT.core()].sort().join(',')}\n// SHAPES: ${heapT.shapeLegend()}\n${[...heapHyps, ...heapGuards].join('\n')}` : ''}${sigLines.length ? '\n' + sigLines.join('\n') : ''}${cellLines.length ? '\n' + cellLines.join('\n') : ''}${fnLines.some((l) => !l.endsWith('[]')) ? '\n' + fnLines.filter((l) => !l.endsWith('[]')).join('\n') : ''}`;
  if (opts.preludeOut) {
    const preludeText = `// Generated by lean-ts translate (version 2): shared declarations. Identical for parent and candidate, or the gate refuses.\n` + pre.map((t) => `// PRELUDE ${t.match(/^(?:datatype|type|function|predicate)\s+([A-Za-z0-9_]+)/)?.[1] ?? hash(t)}\n${t}\n// END PRELUDE`).join('\n') + '\n';
    return { main: `${header}\ninclude "${path.basename(opts.preludeOut)}"\n\n${main}\n`, prelude: preludeText };
  }
  return { main: [header, ...pre, main].join('\n\n') + '\n', prelude: null };
}

const isMain = path.resolve(process.argv[1] ?? '') === new URL(import.meta.url).pathname;
if (isMain) {
  const args = process.argv.slice(2);
  const opts = { real: false, requires: [], ensures: [], invariants: [], core: false, suffix: '', only: null, project: true, preludeOut: null, heap: false, heapUnits: null };
  let file = null, fn = null, out = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--fn') fn = args[++i];
    else if (a === '--out') out = args[++i];
    else if (a === '--prelude') opts.preludeOut = args[++i];
    else if (a === '--real') opts.real = true;
    else if (a === '--core') opts.core = true;
    else if (a === '--suffix') opts.suffix = args[++i] ?? '';
    else if (a === '--only') opts.only = args[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--effectful') opts.effectful = args[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--project') opts.project = args[++i];
    else if (a === '--no-project') opts.project = false;
    else if (a === '--tolerant') opts.tolerant = true;
    else if (a === '--heap') opts.heap = true;
    else if (a === '--heap-units') { opts.heap = true; opts.heapUnits = args[++i].split(',').map((s) => s.trim()).filter(Boolean); }
    else if (a === '--report') opts.reportOut = args[++i];
    else if (a === '--requires') opts.requires.push(args[++i]);
    else if (a === '--ensures') opts.ensures.push(args[++i]);
    else if (a === '--invariant') {
      const v = args[++i]; const m = v.match(/^(\d+):(.*)$/);
      opts.invariants.push(m ? { loop: Number(m[1]), expr: m[2] } : { loop: null, expr: v });
    } else if (!a.startsWith('--') && !file) file = a;
    else { console.error(`unknown argument ${a}`); process.exit(2); }
  }
  if (!file || !out || (!fn && !opts.core)) {
    console.error('usage: translate.mjs <file.ts> --core --out <file.dfy> [--prelude <file.dfy>] [--suffix parent|candidate] [--only f,g] [--real] [--project <tsconfig>|--no-project]\n       translate.mjs <file.ts> --fn <name> --out <file.dfy> [--real] [--requires E] [--ensures E] [--invariant [N:]E]');
    process.exit(2);
  }
  try {
    const res = translate(file, fn, opts);
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, res.main);
    if (opts.preludeOut) { fs.mkdirSync(path.dirname(path.resolve(opts.preludeOut)), { recursive: true }); fs.writeFileSync(opts.preludeOut, res.prelude); }
    console.log(`wrote ${out}${opts.preludeOut ? ` and ${opts.preludeOut}` : ''}`);
  } catch (e) {
    if (e instanceof Unsupported) { console.error(`translate: ${e.message}`); process.exit(1); }
    throw e;
  }
}
