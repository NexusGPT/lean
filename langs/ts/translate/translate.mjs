#!/usr/bin/env node
// lean-ts translate, version 2: turns the functions of a TypeScript file into Dafny, the shared core form.
//
// What is new in version 2 (the real-code idioms the first trial refused, 0 of 27 functions):
//   externals   an imported value, a module constant, a value from another file, a pure library global:
//               an uninterpreted Dafny function in the PRELUDE, identical for parent and candidate.
//               Equality outside the scope then means: the same calls, the same results.
//   arrows      `export const f = (a: T): R => ...` is a function.
//   async       an async unit returns T, not Promise<T>; `await call(...)` is an external call.
//   null        null and undefined are both "absent": Option<T>; `x == null`, `x?.p`, `x ?? y` translate.
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
import { ts, loadProgram, lineOf, hintsOf, topLevelFunctions, isArrayLike, unitOf, originOf } from '../common.mjs';
import { lintFile } from '../lint/lint.mjs';

const K = ts.SyntaxKind;
const TF = ts.TypeFlags;

class Unsupported extends Error {}

const RESERVED = new Set(['abstract', 'allocated', 'as', 'assert', 'assume', 'bool', 'break', 'by', 'calc', 'case', 'char', 'class', 'codatatype',
  'const', 'constructor', 'datatype', 'decreases', 'else', 'ensures', 'exists', 'expect', 'export', 'extends', 'false', 'forall', 'fp', 'function',
  'ghost', 'if', 'import', 'in', 'include', 'inductive', 'int', 'invariant', 'is', 'iterator', 'label', 'lemma', 'map', 'match', 'method', 'modifies',
  'modify', 'module', 'multiset', 'nameonly', 'nat', 'new', 'newtype', 'null', 'object', 'old', 'opaque', 'predicate', 'print', 'provides', 'reads',
  'real', 'refines', 'requires', 'return', 'returns', 'reveal', 'seq', 'set', 'static', 'string', 'then', 'this', 'trait', 'true', 'type', 'unchanged',
  'var', 'while', 'witness', 'yield', 'yields', 'result', 'Option', 'None', 'Some', 'value',
  'fresh', 'twostate', 'ORDINAL', 'array', 'iset', 'imap', 'bv', 'least', 'greatest', 'continue', 'default', 'extern', 'exports', 'synthesize']);
const dn = (name) => { let n = name.replace(/[^A-Za-z0-9_]/g, '_'); if (n.startsWith('_')) n = 'u' + n; return RESERVED.has(n) ? `${n}_` : n; };
const snake = (n) => n.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').toLowerCase();
const mangle = (t) => t.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
const indentBlock = (s, n = 1) => s.split('\n').map((l) => '  '.repeat(n) + l).join('\n');
const wrapLet = (s) => (/^\s*var /.test(s) ? `(\n${indentBlock(s)}\n)` : s);
const hash = (s) => { let h = 5381; for (const c of s) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; return h.toString(36); };

export function translate(file, fnName, opts = {}) {
  const { real = false, requires = [], ensures = [], invariants = [], core = false, suffix = '', only = null, project = true, effectful = [], tolerant = false, reportOut = null } = opts;
  const sfx = core && suffix ? `_${suffix}` : '';
  const { sf, checker } = loadProgram(file, { project });
  const fns = topLevelFunctions(sf);
  const target = fnName ? fns.get(fnName) : null;
  if (fnName && !target) throw new Unsupported(`no top-level function named ${fnName} in ${file}`);
  if (!fnName && !core) throw new Unsupported('--fn is required unless --core is given');

  const where = (n) => `${path.basename(file)}:${lineOf(sf, n.getStart(sf))}`;
  const fail = (n, msg) => { throw new Unsupported(`${where(n)}: ${msg}`); };

  // ----- which units to emit: the target (or all / --only), plus same-file callees, callees first -----
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
      ts.forEachChild(n, walk);
    };
    walk(u.body);
    visiting.delete(u); visitStack.pop();
    order.push(u);
  }
  if (target) collect(target);
  else if (only) { for (const name of only) { const u = fns.get(name); if (!u) fail(sf, `no top-level function or class method named ${name}`); collect(u); } }
  else for (const u of fns.values()) collect(u);

  // ----- the subset gate: refuse before translating -----
  const gate0 = lintFile(file, order.map((u) => [lineOf(sf, u.node.getStart(sf)), lineOf(sf, u.node.getEnd())]), { project }).filter((g) => !g.env); // an unresolved module is the checkout's finding, not the code's: its values are opaque
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

  // ----- the world: every effectful call is a transition of an explicit world token -----
  // An effect is any call that may depend on or change something outside the function: an imported function, an
  // awaited call, a method of an opaque or record value, a constructor of an unknown class. It takes the current
  // world and returns the next one with its result. Two calls of the same operation are two transitions: a clock read
  // twice may differ. A pure library call (strings, arrays, Math, JSON) and a module constant stay world-free.
  const WORLD = 'wld';
  let pending = []; // hoisted `var (wld, tN) := ...;` lines of the statement being translated, in source order
  let tempCount = 0;
  const effectfulUnits = new Set(); // same-file units that take and return the world
  const PURE_RECEIVERS = new Set(['Math', 'JSON', 'String', 'Number', 'Boolean', 'Buffer', 'Array', 'BigInt', 'Symbol']);
  const PURE_CTORS = new Set(['Set', 'Map', 'RegExp', 'Error', 'TypeError', 'RangeError', 'Date', 'URL', 'Uint8Array', 'Array']);
  function isEffectCall(n) {
    if (ts.isAwaitExpression(n)) return true;
    if (ts.isNewExpression(n)) { const c = n.expression.getText(sf); if (c === 'Date' && !(n.arguments && n.arguments.length)) return true; return !PURE_CTORS.has(c); } // `new Date()` with no argument reads the clock
    if (!ts.isCallExpression(n)) return false;
    const f = n.expression;
    if (ts.isIdentifier(f)) {
      const o = originOf(checker, f, sf, currentUnit?.node ?? null);
      if (o.kind === 'unit') return effectfulUnits.has(f.text);
      if (o.kind === 'global') return !PURE_RECEIVERS.has(f.text) && !['parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent', 'String', 'Number', 'Boolean'].includes(f.text);
      // a local bound to an arrow literal is a pure lambda (an effect inside it is refused by lambda()); any other local function value is opaque
      if (o.kind === 'local' && o.decl && ts.isVariableDeclaration(o.decl) && o.decl.initializer && ts.isArrowFunction(o.decl.initializer)) return false;
      return true; // an import, a value from another file, a module const holding a function, a function-typed parameter
    }
    if (ts.isPropertyAccessExpression(f)) {
      const recv = f.expression;
      if (recv.kind === K.ThisKeyword && currentUnit?.cls) { const callee = fns.get(`${currentUnit.className}.${f.name.text}`); if (callee) return effectfulUnits.has(callee.name); return true; }
      if (isWorldField(recv)) return true; // the field lives in the world; a method on it may change it
      if (ts.isIdentifier(recv) && PURE_RECEIVERS.has(recv.text) && originOf(checker, recv, sf, currentUnit?.node ?? null).kind === 'global') return !(recv.text !== 'Math' || f.name.text !== 'random'); // Math.random reads the world
      const t = baseOf(typeOf(recv));
      if (isArrayLike(checker, t) || (t.flags & TF.StringLike) || isSetT(t) || isMapT(t) || (t.flags & (TF.NumberLike | TF.BooleanLike))) return false;
      return true; // opaque, record method, imported object, any
    }
    return true;
  }
  // try/catch, exact: an effect inside the body may fault; the fault is a flag on the world, checked after each statement
  // of the body that makes a transition (or throws); the catch path binds the fault value and runs with the flag cleared.
  // A try without a catch, or whose body loops over an effect, stays an opaque block.
  const loopsOverEffect = (node) => { let f = false; const w = (x) => { if (f || ts.isArrowFunction(x) || ts.isFunctionExpression(x)) return; if ((ts.isForOfStatement(x) || ts.isForStatement(x) || ts.isWhileStatement(x) || ts.isForInStatement(x)) && containsEffect(x)) { f = true; return; } ts.forEachChild(x, w); }; w(node); return f; };
  const exactTry = (x) => core && ts.isTryStatement(x) && !!x.catchClause && !loopsOverEffect(x.tryBlock) && !(x.catchClause && loopsOverEffect(x.catchClause.block));
  const isOpaqueStmt = (x) => (ts.isTryStatement(x) && !exactTry(x)) || (ts.isWhileStatement(x) && !hintsOf(sf, x).decreases);
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
  const isLoopCallback = (x) => !!(x.parent && ts.isCallExpression(x.parent) && x.parent.arguments[0] === x && x.parent.parent && forEachShape(x.parent.parent));
  function fakeForOf(st, fe) {
    const { call, cb } = fe; const name = cb.parameters[0].name;
    const body = ts.isBlock(cb.body) ? cb.body : { kind: K.ExpressionStatement, expression: cb.body, parent: cb, pos: cb.body.pos, end: cb.body.end, getStart: () => cb.body.getStart(sf), getEnd: () => cb.body.getEnd(), getText: () => cb.body.getText(sf), getFullStart: () => cb.body.getFullStart() };
    const decl = { kind: K.VariableDeclaration, name, pos: name.pos, end: name.end, parent: null };
    const list = { kind: K.VariableDeclarationList, declarations: [decl], flags: ts.NodeFlags.Const, pos: name.pos, end: name.end, parent: null };
    decl.parent = list;
    const fake = { kind: K.ForOfStatement, expression: call.expression.expression, initializer: list, statement: body, parent: st.parent, pos: st.pos, end: st.end, getStart: () => st.getStart(sf), getEnd: () => st.getEnd(), getText: () => st.getText(sf), getFullStart: () => st.getFullStart(), __forEach: true };
    list.parent = fake;
    return fake;
  }
  // the innermost exact try whose BODY holds the statement, within the same function
  const tryOf = (st) => { let n = st; let child = null; while (n && !ts.isFunctionLike(n)) { if (ts.isTryStatement(n) && exactTry(n) && child === n.tryBlock) return n; child = n; n = n.parent; } return null; };
  const faultPreds = () => { addPrelude('World', 'type World'); return { faulted: external('faulted', ['World'], 'bool'), value: external('fault_value', ['World'], anyType()), clear: external('clear_fault', ['World'], 'World'), raise: external('raise', ['World', anyType()], 'World') }; };
  const containsEffect = (node) => { let f = false; const w = (x) => { if (f) return; if ((ts.isArrowFunction(x) || ts.isFunctionExpression(x)) && !isLoopCallback(x)) return; if (isEffectCall(x) || isOpaqueStmt(x) || isWorldField(x) || (ts.isTryStatement(x) && exactTry(x))) { f = true; return; } ts.forEachChild(x, w); }; w(node); return f; };
  const unitEffectful = () => !!currentUnit && effectfulUnits.has(currentUnit.name);
  // ----- references, layer 1: a parameter the function mutates is an OUTPUT of the function -----
  // A parameter whose field, slot or contents the function assigns (p.f = v, p[i] = v, p.push(x), p.f.g = v) is read as a
  // local that starts as the argument; the function returns its final value beside the result, and a caller that passed
  // a name takes the new value back into that name. Two parameters are distinct objects (the stated axiom; the lint
  // refuses a mutation through a local alias). A parameter passed to a same-file function that mutates it is mutated too.
  const mutatedByUnit = new Map(); // unit name -> [param names] in parameter order
  const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'set', 'add', 'delete', 'clear', 'fill', 'copyWithin']);
  function syntacticMutations(u) {
    const params = new Set(u.params.filter((p) => ts.isIdentifier(p.name)).map((p) => p.name.text));
    const out = new Set();
    const rootOf = (x) => { while (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x) || ts.isNonNullExpression(x) || ts.isParenthesizedExpression(x)) x = x.expression; return x; };
    const hit = (x) => { const r = rootOf(x); if (ts.isIdentifier(r) && params.has(r.text) && r !== x) out.add(r.text); };
    const walk = (n) => {
      if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) return; // a callback cannot mutate an outer value (lint)
      if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment) hit(n.left);
      if ((ts.isPostfixUnaryExpression(n) || ts.isPrefixUnaryExpression(n)) && (n.operator === K.PlusPlusToken || n.operator === K.MinusMinusToken)) hit(n.operand);
      if (ts.isExpressionStatement(n)) { let e = n.expression; while (ts.isParenthesizedExpression(e)) e = e.expression; if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && MUTATORS.has(e.expression.name.text)) { const r = rootOf(e.expression.expression); if (ts.isIdentifier(r) && params.has(r.text)) out.add(r.text); } }
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
    const parts = [...(unitEffectful() ? [WORLD] : []), outerParens(code), ...outs];
    return parts.length === 1 ? code : `(${parts.join(', ')})`;
  }
  // ----- world fields: a field of `this` that a method of the class assigns, updates, or mutates through a method-call
  // statement lives in the world. Every read is a transition (ext_<C>_get_<f>(wld, self)), every write a transition
  // (ext_<C>_set_<f>(wld, self, v)); the method becomes effectful. A field no method changes stays a pure accessor of self.
  const mutatedByClass = new Map(); // class declaration -> Set of field names
  function mutatedFields(cls) {
    if (mutatedByClass.has(cls)) return mutatedByClass.get(cls);
    const out = new Set(); mutatedByClass.set(cls, out);
    const thisField = (x) => (ts.isPropertyAccessExpression(x) && x.expression.kind === K.ThisKeyword ? x.name.text : null);
    const walk = (n) => {
      if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment) { const f = thisField(n.left); if (f) out.add(f); }
      if ((ts.isPostfixUnaryExpression(n) || ts.isPrefixUnaryExpression(n)) && (n.operator === K.PlusPlusToken || n.operator === K.MinusMinusToken)) { const f = thisField(n.operand); if (f) out.add(f); }
      if (ts.isExpressionStatement(n)) { let e = n.expression; while (ts.isParenthesizedExpression(e) || ts.isAwaitExpression(e) || ts.isVoidExpression(e)) e = e.expression; if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && MUTATORS.has(e.expression.name.text)) { const f = thisField(e.expression.expression); if (f) out.add(f); } } // this.items.push(x): the field's contents change; a service call on a field is a transition of the world, not of the field
      ts.forEachChild(n, walk);
    };
    for (const m of cls.members) if (!ts.isConstructorDeclaration(m)) walk(m);
    return out;
  }
  const isWorldField = (n) => !!(ts.isPropertyAccessExpression(n) && n.expression.kind === K.ThisKeyword && currentUnit?.cls && !fns.has(`${currentUnit.className}.${n.name.text}`) && mutatedFields(currentUnit.cls).has(n.name.text));
  const worldFieldAccessor = (n, kind, extra = []) => { const T = selfType(currentUnit); addPrelude('World', 'type World'); return external(`${T}_${kind}_${n.name.text}`, kind === 'get' ? ['World', T] : ['World', T, ...extra.map((e) => e.d)], kind === 'get' ? `(World, ${extra[0].d})` : '(World, Unit)'); };
  function hoist(code, rd) {
    // the call text already takes the world first; bind the next world and the result, return the result name
    const t = `t${tempCount++}_`;
    pending.push(`var (${WORLD}, ${t}) := ${code};`);
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
  const addPrelude = (name, text) => { if (!prelude.has(name)) prelude.set(name, text); return name; };
  let usesOption = false;
  const NUM = real ? 'real' : 'int';
  const curUnitName = () => (currentUnit ? dn(snake(currentUnit.name)) : 'g');
  let loopCount = 0;
  const intVars = new Set();
  const fname = (tsName) => (core ? dn(snake(tsName.replace('.', '_'))) + sfx : dn(tsName.replace('.', '_')));
  const SELF = 'self';
  const classOf = (u) => (u && u.cls ? u : null);
  // the receiver's Dafny type: the class instance type, opaque (its methods make it so)
  const selfType = (u) => dtype(checker.getTypeAtLocation(u.cls.name), u.node);

  // ----- types -----
  const isSetT = (t) => !!t.symbol && (t.symbol.name === 'Set' || t.symbol.name === 'ReadonlySet');
  const isMapT = (t) => !!t.symbol && (t.symbol.name === 'Map' || t.symbol.name === 'ReadonlyMap');
  const isPromiseT = (t) => !!t.symbol && t.symbol.name === 'Promise';
  const nonNull = (t) => (t.flags & TF.Union ? t.types.filter((x) => !(x.flags & (TF.Undefined | TF.Null))) : [t]);
  const nonUndefined = (t) => { const parts = nonNull(t); return parts.length === 1 ? parts[0] : t; }; // the type with undefined and null removed, when that leaves one
  const isOptional = (t) => !!(t.flags & TF.Union) && t.types.some((x) => x.flags & (TF.Undefined | TF.Null));
  const isNullish = (t) => !!(t.flags & (TF.Undefined | TF.Null));
  const baseOf = (t) => { const p = nonNull(t); if (p.length === 1) return p[0]; if (p.every((x) => x.flags & TF.BooleanLiteral)) return checker.getBooleanType ? checker.getBooleanType() : p[0]; return t; };
  const isCallable = (t) => checker.getSignaturesOfType(t, ts.SignatureKind.Call).length > 0;
  const isAny = (t) => !!(t.flags & (TF.Any | TF.Unknown));
  const isRecordish = (t) => !!(t.flags & (TF.Object | TF.Intersection)) && !isArrayLike(checker, t) && !isSetT(t) && !isMapT(t) && !isPromiseT(t);
  const stringIndex = (t) => (t.flags & TF.Object ? checker.getIndexInfoOfType(t, ts.IndexKind.String) : null);
  const anyType = () => { addPrelude('Any', 'type Any(==)'); return 'Any'; };
  // JSX: an element is a value. JsxElem(tag, props, children): the tag name, the attributes as a string-keyed map of
  // opaque values (a handler is an opaque function value keyed by its text), the children in order. A string child is
  // JsxText; false, null and undefined render nothing; an array child is JsxList.
  const jsxType = () => { anyType(); addPrelude('JsxNode', 'datatype JsxNode = JsxElem(tag: string, props: map<string, Any>, children: seq<JsxNode>) | JsxText(s: string) | JsxNothing | JsxList(items: seq<JsxNode>)'); return 'JsxNode'; };
  const isElementSym = (sym) => { if (!sym) return false; const nm = sym.name; if (!['ReactElement', 'Element', 'ReactPortal', 'JSXElementConstructor'].includes(nm)) return false; if (sym.parent && sym.parent.name === 'JSX') return true; const f = sym.declarations?.[0]?.getSourceFile().fileName ?? ''; return /react|jsx/i.test(f); };
  const isNodeT = (t) => ((t.flags & TF.Union) ? t.types : [t]).some((p) => isElementSym(p.symbol) || (p.aliasSymbol && ['ReactNode', 'ReactElement', 'JSX.Element'].includes(p.aliasSymbol.name)));

  function dtype(t, n, depth = 0) {
    if (depth > 8) fail(n, 'type nesting too deep');
    const f = t.flags;
    if (f & (TF.Any | TF.Unknown)) return anyType();
    if (isNodeT(t)) return jsxType();
    if (f & (TF.NumberLike)) return NUM;
    if (f & TF.BigIntLike) return 'int';
    if (f & TF.BooleanLike) return 'bool';
    if (f & TF.StringLike) return 'string';
    if (f & TF.EnumLike) return (t.flags & TF.NumberLike) ? 'int' : 'string';
    if (f & (TF.Void | TF.Undefined | TF.Null)) return 'Unit';
    if (f & TF.TypeParameter) { const nm = t.symbol?.name ?? checker.typeToString(t); if (!currentUnit || !(currentUnit.generics ?? []).some((g) => g.name.text === nm)) fail(n, `type parameter ${nm} is not one of this function's`); return dn(nm); }
    if (f & TF.Union) {
      const parts = nonNull(t);
      if (parts.length !== t.types.length) {
        usesOption = true;
        if (!parts.length) return 'Option<Unit>';
        const inner = parts.every((x) => x.flags & TF.BooleanLiteral) ? 'bool' : parts.length === 1 ? dtype(parts[0], n, depth + 1) : unionType(parts, n, depth);
        return `Option<${inner}>`;
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
    return fail(n, `type ${checker.typeToString(t)} is not translatable`);
  }
  function unionType(parts, n, depth) {
    if (parts.every((x) => x.flags & (TF.StringLiteral | TF.StringLike))) return 'string';
    if (parts.every((x) => x.flags & (TF.NumberLiteral | TF.NumberLike))) return NUM;
    if (parts.every((x) => x.flags & TF.BooleanLike)) return 'bool';
    if (parts.some(isAny)) return anyType();
    // a union of records (a discriminated union), or of a primitive with a record: opaque. Every read on it is an
    // uninterpreted accessor, every construction an uninterpreted injection; the proof asks the same calls on both sides
    if (parts.every((x) => isRecordish(x) || isArrayLike(checker, x) || isSetT(x) || isMapT(x) || !!(x.flags & (TF.StringLike | TF.NumberLike | TF.BooleanLike | TF.EnumLike | TF.Null | TF.Undefined)))) return anyType();
    return fail(n, `union type ${parts.map((x) => checker.typeToString(x)).join(' | ')} is not translatable`);
  }
  const typeNameOf = (t) => t.aliasSymbol?.name ?? (t.symbol && t.symbol.name !== '__type' && t.symbol.name !== '__object' ? t.symbol.name : null);
  function recordType(t, n, depth) {
    const props = checker.getPropertiesOfType(t);
    const hasMethods = props.some((p) => isCallable(checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? n)));
    let name = typeNameOf(t);
    if (name && /^(Pick|Omit|Partial|Required|Readonly|Record|__type|__object|type|default)$/.test(name)) name = null;
    if (hasMethods || !props.length) {
      // opaque: values pass through untouched; reads become accessor externals
      const base = mangle(name ?? checker.typeToString(t));
      name = `Ext_${base || 'T' + hash(checker.typeToString(t))}`;
      addPrelude(name, `type ${name}`);
      return name;
    }
    const fields = props.map((p) => ({ name: p.name, type: checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? n), optional: !!(p.flags & ts.SymbolFlags.Optional) })).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    if (!name) name = `Rec_${hash(fields.map((f) => f.name).join(','))}`;
    name = dn(mangle(name));
    if (recordAlias.has(name)) return recordAlias.get(name);
    const key = `datatype ${name}`;
    if (!prelude.has(key)) {
      prelude.set(key, ''); // reserve for nested use
      const fs_ = fields.map((f) => {
        let d = dtype(f.type, n, depth + 1);
        if (f.optional && !d.startsWith('Option<')) { usesOption = true; d = `Option<${d}>`; }
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
  const typeOf = (n) => checker.getTypeAtLocation(n);
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
    const pts = args.map((a, i) => { const t = ptype(a, i); return t ? dtype(t, a) : dtype(typeOf(a), a); });
    let rt = sig ? sig.getReturnType() : typeOf(n);
    if (isPromiseT(rt)) rt = checker.getTypeArguments(rt)[0];
    else if (calleeName.startsWith('await_') || calleeName.includes('await_')) { const aw = checker.getAwaitedType ? checker.getAwaitedType(rt) : null; if (aw) rt = aw; }
    let rd = dtype(rt, n);
    if (cond && rd.startsWith('Option<')) rd = innerOf(rd); // the signature's own result; the chain adds the Option once
    const codes = args.map((a, i) => (ts.isArrowFunction(a) || ts.isFunctionExpression(a)) ? (ts.isArrowFunction(a) ? lambda(a, a.parameters.length, [], true) : opaqueFn(a)) : (ts.isIdentifier(a) && a.text === 'undefined' && pts[i] === 'Unit') ? 'Unit' : expr(a, ptype(a, i)));
    if (!isEff) {
      let code;
      if (recvCode !== null) { const id = external(calleeName, [recvType, ...pts], rd); code = `${id}(${[recvCode, ...codes].join(', ')})`; }
      else { const id = external(calleeName, pts, rd); code = `${id}(${codes.join(', ')})`; }
      if (cond) { usesOption = true; return `(if ${cond} then Some(${code}) else None)`; } // an optional call: the value when the receiver is present
      return code;
    }
    addPrelude('World', 'type World');
    const ptsW = recvCode !== null ? ['World', recvType, ...pts] : ['World', ...pts];
    const argsW = recvCode !== null ? [WORLD, recvCode, ...codes] : [WORLD, ...codes];
    const id = external(calleeName, ptsW, `(World, ${rd})`);
    if (cond) { usesOption = true; const w = `w${tempCount}_`, x = `x${tempCount}_`; return hoist(`(if ${cond} then (var (${w}, ${x}) := ${id}(${argsW.join(', ')}); (${w}, Some(${x}))) else (${WORLD}, None))`, `Option<${rd}>`); } // an optional call: the transition happens only when the receiver is present
    return hoist(`${id}(${argsW.join(', ')})`, rd);
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
      case 'Includes': text = `function ${name}(s: string, t: string): bool
{ exists i :: 0 <= i <= |s| - |t| && s[i..i + |t|] == t }`; break;
      case 'IndexOfStr': text = `function ${name}(s: string, t: string): int
{ if exists i :: 0 <= i <= |s| - |t| && s[i..i + |t|] == t then (var i :| 0 <= i <= |s| - |t| && s[i..i + |t|] == t && forall j :: 0 <= j < i ==> s[j..j + |t|] != t; i) else -1 }`; break;
      case 'FloorDiv': text = `function ${name}(a: int, b: int): int
{ if b == 0 then 0 else if (a >= 0) == (b > 0) || a % b == 0 then (if b > 0 then a / b else -(a / -b)) else (if b > 0 then a / b else -(a / -b)) - (if b > 0 then 1 else 1) + (if (a % b == 0) then 1 else 0) }`; break;
      case 'TruncDiv': text = `function ${name}(a: int, b: int): int
{ if b == 0 then 0 else (var q := (if a >= 0 then a else -a) / (if b >= 0 then b else -b); if (a >= 0) == (b >= 0) then q else -q) }`; break;
      case 'JsRem': text = `function ${name}(a: int, b: int): int
{ if b == 0 then 0 else a - b * ${helper('TruncDiv', ['int'])}(a, b) }`; break;
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
    if (!real) { if (!/^\d+$/.test(text)) fail(n, `number literal ${text} is not an integer; use --real`); return text; }
    const v = Number(text);
    return Number.isInteger(v) ? `${v}.0` : String(v);
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
    const nt = typeOf(node);
    if ((expected.flags & (TF.Void | TF.Undefined)) && !(expected.flags & TF.Union)) return 'Unit'; // a void slot takes Unit, whatever was written
    if (isLiteralish(node)) {
      // a literal is already built in the expected shape; only absence needs lifting
      if (isOptional(expected) && !isOptional(nt) && !isNullish(nt)) { usesOption = true; return `Some(${convertD(code, dtype(nt, node), innerOf(dtype(expected, node)))})`; }
      if (dtype(expected, node) === 'Any' && dtype(nt, node) !== 'Any') return convert(code, nt, expected, node);
      return code;
    }
    if (isOptional(expected)) {
      if (isOptional(nt)) return code;
      if (isNullish(nt)) return 'None';
      usesOption = true;
      return `Some(${convertD(code, dtype(nt, node), innerOf(dtype(expected, node)))})`; // the union may flatten several literals beside null
    }
    return convert(code, nt, expected, node);
  }
  // a value of type `from` where a value of type `to` is expected: identity when the Dafny types agree,
  // otherwise an uninterpreted conversion (opaque in or out of Any, a cast between record shapes)
  function convert(code, from, to, node) {
    if (!from || !to) return code;
    return convertD(code, dtype(from, node), dtype(to, node));
  }
  const innerOf = (d) => d.slice('Option<'.length, -1);
  function convertD(code, fd, td) {
    if (fd === td) return code;
    if (td === 'JsxNode') {
      jsxType();
      if (fd === 'string') return `JsxText(${code})`;
      if (fd === 'int' || fd === 'real') return `JsxText(${external('text_of_number', [fd], 'string')}(${code}))`;
      if (fd === 'bool' || fd === 'Unit') return 'JsxNothing';
      if (fd === 'Any') return `${external('node_of_Any', ['Any'], 'JsxNode')}(${code})`;
      if (fd.startsWith('Option<')) { usesOption = true; const v = `jn_${hash(code).slice(0, 4)}`; return `(var ${v} := ${code}; if ${v}.Some? then ${convertD(`${v}.value`, innerOf(fd), 'JsxNode')} else JsxNothing)`; }
      if (fd.startsWith('seq<')) { const el = fd.slice(4, -1); if (el === 'JsxNode') return `JsxList(${code})`; const v = `js_${hash(code).slice(0, 4)}`; return `(var ${v} := ${code}; JsxList(seq(|${v}|, (i: int) requires 0 <= i < |${v}| => ${convertD(`${v}[i]`, el, 'JsxNode')})))`; }
    }
    if (td === 'Unit') return 'Unit';
    if (td === 'Any' && code === 'None') return `${external('Any_undefined', [], 'Any')}()`; // `undefined` as an opaque value
    if (td === 'Any') return `${external(`Any_of_${mangle(fd)}`, [fd], 'Any')}(${code})`;
    if (fd === 'Any') return `${external(`Any_as_${mangle(td)}`, ['Any'], td)}(${code})`;
    if (td.startsWith('Option<') && !fd.startsWith('Option<')) { usesOption = true; return `Some(${convertD(code, fd, innerOf(td))})`; }
    if (td.startsWith('Option<') && fd.startsWith('Option<')) { usesOption = true; const v = `o_${hash(code).slice(0, 4)}`; return `(var ${v} := ${code}; if ${v}.Some? then Some(${convertD(`${v}.value`, innerOf(fd), innerOf(td))}) else None)`; }
    return `${external(`cast_${mangle(fd)}_${mangle(td)}`, [fd], td)}(${code})`;
  }
  const strEsc = (s) => JSON.stringify(s);

  // JavaScript truthiness of a value used as a condition, by its static type
  function truthy(n) {
    while (ts.isParenthesizedExpression(n)) n = n.expression;
    if (ts.isBinaryExpression(n) && (n.operatorToken.kind === K.AmpersandAmpersandToken || n.operatorToken.kind === K.BarBarToken)) {
      return `(${truthy(n.left)} ${n.operatorToken.kind === K.AmpersandAmpersandToken ? '&&' : '||'} ${truthy(n.right)})`;
    }
    if (ts.isPrefixUnaryExpression(n) && n.operator === K.ExclamationToken) return `!(${outerParens(truthy(n.operand))})`;
    const t = typeOf(n);
    if (isOptional(t)) {
      const inner = baseOf(t);
      const v = rawOperand(n);
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
    if (t.flags & TF.BooleanLike) return expr(n);
    if (t.flags & TF.StringLike) return `(|${expr(n)}| > 0)`;
    if (t.flags & (TF.NumberLike | TF.BigIntLike)) return `(${expr(n)} != ${real ? '0.0' : '0'})`;
    if (isNullish(t)) return 'false';
    return 'true';
  }

  // ----- expressions -----
  function expr(n, expected) {
    switch (n.kind) {
      case K.ParenthesizedExpression: return expr(n.expression, expected);
      case K.ConditionalExpression:
        if (containsEffect(n.whenTrue) || containsEffect(n.whenFalse)) {
          // `cond ? await a() : b`: the branch's transitions happen only when it is taken; the world and the value come out as one pair
          if (!unitEffectful()) fail(n, 'internal: an effect in a conditional branch of a pure unit');
          const tt = expected ?? typeOf(n); const d = isAny(tt) ? anyType() : dtype(tt, n);
          const cond = outerParens(truthy(n.condition));
          const a = branchWithWorld(() => expr(n.whenTrue, tt), d), b = branchWithWorld(() => expr(n.whenFalse, tt), d);
          const tv = `t${tempCount++}_`;
          pending.push(`var (${WORLD}, ${tv}) := if ${cond} then ${a} else ${b};`);
          return tv;
        }
        return `(if ${outerParens(truthy(n.condition))} then ${outerParens(expr(n.whenTrue, expected))} else ${outerParens(expr(n.whenFalse, expected))})`;
      default: return coerce(rawExpr(n, expected), n, expected);
    }
  }
  function ident(n) {
    if (n.text === 'undefined') { usesOption = true; return 'None'; }
    const o = originOf(checker, n, sf, currentUnit?.node ?? null);
    if (o.kind === 'import' || o.kind === 'other' || o.kind === 'module') return externalValue(n);
    if (o.kind === 'global') return externalValue(n);
    let code = dn(n.text);
    if (o.sym && o.sym.valueDeclaration && o.kind === 'local') {
      const dt = symType(o.sym, n);
      if (isOptional(dt) && !isOptional(typeOf(n)) && !isNullish(typeOf(n))) code += '.value';
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
      case K.NullKeyword: usesOption = true; return 'None';
      case K.ThisKeyword: if (!classOf(currentUnit)) fail(n, '`this` outside a class method'); return SELF;
      case K.SatisfiesExpression: return expr(n.expression, expected);
      case K.AsExpression: case K.TypeAssertionExpression: {
        // identity at run time; the types may differ, so the value is converted (opaque when they do)
        const tn = n.type;
        if (tn && ts.isTypeReferenceNode(tn) && tn.typeName.getText(sf) === 'const') return expr(n.expression, expected);
        return convert(expr(n.expression), typeOf(n.expression), typeOf(n), n);
      }
      case K.AwaitExpression: return awaitExpr(n);
      case K.ArrowFunction: return lambda(n, n.parameters.length);
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
      case K.TypeOfExpression: return `${external('typeof_Any', [anyType()], 'string')}(${expr(n.expression, anyTarget())})`;
      case K.NonNullExpression: {
        const t = typeOf(n.expression);
        if (!isOptional(t)) return expr(n.expression);
        const d = dtype(baseOf(t), n); const v = `nn_${hash(n.getText(sf)).slice(0, 4)}`;
        return `(var ${v} := ${rawOperand(n.expression)}; if ${v}.Some? then ${v}.value else ${external(`absent_${mangle(d)}`, [], d)}())`;
      }
      case K.PrefixUnaryExpression:
        if (n.operator === K.ExclamationToken) return `!(${outerParens(truthy(n.operand))})`;
        return `(-${expr(n.operand)})`;
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
  function awaitExpr(n) {
    let inner = n.expression; while (ts.isParenthesizedExpression(inner)) inner = inner.expression;
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
    const isNul = (e) => e.kind === K.NullKeyword || (ts.isIdentifier(e) && e.text === 'undefined');
    const eqOps = new Set([K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.EqualsEqualsToken, K.ExclamationEqualsToken]);
    if (eqOps.has(op) && (isNul(n.left) || isNul(n.right))) {
      const other = isNul(n.left) ? n.right : n.left;
      const neg = op === K.ExclamationEqualsEqualsToken || op === K.ExclamationEqualsToken;
      const dict = dictRead(other);
      if (dict) return neg ? `(${dict.key} in ${dict.map})` : `!(${dict.key} in ${dict.map})`;
      if (isAny(typeOf(other))) return `${neg ? '!' : ''}${external('is_nullish_Any', ['Any'], 'bool')}(${expr(other)})`;
      if (!isOptional(typeOf(other)) && !isNullish(typeOf(other))) return neg ? 'true' : 'false';
      return `${rawOperand(other)}.${neg ? 'Some?' : 'None?'}`;
    }
    if (op === K.QuestionQuestionToken) {
      const lt = typeOf(n.left);
      if (!isOptional(lt)) return expr(n.left);
      const l = rawOperand(n.left);
      const t = typeOf(n); const td = isAny(t) ? anyType() : dtype(t, n); const inner = isAny(baseOf(lt)) ? anyType() : dtype(baseOf(lt), n); const rtp = typeOf(n.right); const rd = isAny(rtp) ? anyType() : dtype(rtp, n);
      if (td !== inner || td !== rd) return `(if ${l}.Some? then ${convertD(`${l}.value`, inner, td)} else ${convertD(outerParens(expr(n.right)), rd, td)})`; // `x ?? "none"` with x: number | undefined: both sides lifted to the result type
      return `(if ${l}.Some? then ${l}.value else ${outerParens(expr(n.right, baseOf(lt)))})`;
    }
    if (op === K.AmpersandAmpersandToken || op === K.BarBarToken) {
      const t = typeOf(n);
      if (containsEffect(n.right)) {
        // `a && await b()`: the right side's transitions happen only when a is truthy (for &&) or falsy (for ||)
        if (!unitEffectful()) fail(n, 'internal: an effect on the right of a logic operator in a pure unit');
        const td = isAny(t) ? anyType() : dtype(t, n); const ld = isAny(typeOf(n.left)) ? anyType() : dtype(typeOf(n.left), n); const rd = isAny(typeOf(n.right)) ? anyType() : dtype(typeOf(n.right), n);
        const isBool = !!(t.flags & TF.BooleanLike);
        const cond = outerParens(truthy(n.left));
        const left = isBool ? truthy(n.left) : convertD(outerParens(expr(n.left)), ld, td);
        const right = branchWithWorld(() => (isBool ? truthy(n.right) : convertD(outerParens(expr(n.right)), rd, td)), td);
        const tv = `t${tempCount++}_`;
        pending.push(op === K.AmpersandAmpersandToken ? `var (${WORLD}, ${tv}) := if ${cond} then ${right} else (${WORLD}, ${left});` : `var (${WORLD}, ${tv}) := if ${cond} then (${WORLD}, ${left}) else ${right};`);
        return tv;
      }
      if (isNodeT(t) || isJsxLit(n.left) || isJsxLit(n.right)) return jsxChild(n); // `cond && <X/>`: a conditional element
      if (!(t.flags & TF.BooleanLike)) {
        // value-returning && / ||: a && b is b when a is truthy, else a. Translated when both sides share a Dafny type
        const lt = typeOf(n.left), rtp = typeOf(n.right);
        const ld = isAny(lt) ? anyType() : dtype(lt, n), rd = isAny(rtp) ? anyType() : dtype(rtp, n), td = isAny(t) ? anyType() : dtype(t, n);
        if (ld === td && rd === td) return op === K.AmpersandAmpersandToken ? `(if ${truthy(n.left)} then ${outerParens(expr(n.right))} else ${outerParens(expr(n.left))})` : `(if ${truthy(n.left)} then ${outerParens(expr(n.left))} else ${outerParens(expr(n.right))})`;
        // mixed types: each side is lifted to the type of the whole (an Option, an Any, a JsxNode)
        const L = convertD(outerParens(expr(n.left)), ld, td), R = convertD(outerParens(expr(n.right)), rd, td);
        return op === K.AmpersandAmpersandToken ? `(if ${truthy(n.left)} then ${R} else ${L})` : `(if ${truthy(n.left)} then ${L} else ${R})`;
      }
      const o = op === K.AmpersandAmpersandToken ? '&&' : '||';
      return `(${truthy(n.left)} ${o} ${truthy(n.right)})`;
    }
    if (op === K.InstanceOfKeyword) return `${external(`instanceof_${mangle(n.right.getText(sf))}`, [anyType()], 'bool')}(${expr(n.left, anyTarget())})`;
    if (op === K.InKeyword) return `${external('in_Any', [anyType(), anyType()], 'bool')}(${expr(n.left, anyTarget())}, ${expr(n.right, anyTarget())})`;
    if (op === K.PercentToken) {
      if (real) fail(n, '`%` in real mode is not translated');
      return `${helper('JsRem', ['int'])}(${expr(n.left)}, ${expr(n.right)})`;
    }
    if (op === K.SlashToken) {
      const lt = typeOf(n.left);
      if (lt.flags & TF.BigIntLike) return `${helper('TruncDiv', ['int'])}(${expr(n.left)}, ${expr(n.right)})`;
      if (real) return `(if ${expr(n.right)} == 0.0 then 0.0 else ${expr(n.left)} / ${expr(n.right)})`;
      // reached only under Math.floor / Math.trunc (the lint refuses bare `/` on numbers)
      return `__DIV__(${expr(n.left)}, ${expr(n.right)})`;
    }
    const map = { [K.EqualsEqualsEqualsToken]: '==', [K.ExclamationEqualsEqualsToken]: '!=', [K.EqualsEqualsToken]: '==', [K.ExclamationEqualsToken]: '!=' };
    const o = map[op] ?? n.operatorToken.getText(sf);
    const lt0 = typeOf(n.left), rt0 = typeOf(n.right);
    if ((isAny(lt0) || isAny(rt0)) && !map[op]) {
      // arithmetic or ordering on an opaque value: an uninterpreted operator over Any, typed by the result
      const names = { '+': 'plus', '-': 'minus', '*': 'times', '<': 'lt', '<=': 'le', '>': 'gt', '>=': 'ge' };
      const rd = (o === '+' || o === '-' || o === '*') ? (isAny(typeOf(n)) ? anyType() : dtype(typeOf(n), n)) : 'bool';
      const A = anyType();
      return `${external(`op_${names[o] ?? mangle(o)}_Any`, [A, A], rd)}(${expr(n.left, anyTarget())}, ${expr(n.right, anyTarget())})`;
    }
    const strT = (t) => !!(t.flags & TF.StringLike) || (!!(t.flags & TF.Union) && t.types.length > 0 && t.types.every((x) => x.flags & TF.StringLike));
    if (o === '+' && !(isAny(lt0) || isAny(rt0)) && (strT(lt0) || strT(rt0)) && !(strT(lt0) && strT(rt0))) {
      return `(${stringOf(n.left)} + ${stringOf(n.right)})`;
    }
    if (map[op]) {
      // comparing an Option with a plain value: lift the plain side
      const lt = typeOf(n.left), rt = typeOf(n.right);
      if (isAny(lt) || isAny(rt)) return `(${expr(n.left, anyTarget())} ${o} ${expr(n.right, anyTarget())})`;
      const l = isOptional(lt) ? rawOperand(n.left) : expr(n.left, isOptional(rt) ? rt : undefined);
      const r = isOptional(rt) ? rawOperand(n.right) : expr(n.right, isOptional(lt) ? lt : undefined);
      return `(${l} ${o} ${r})`;
    }
    return `(${expr(n.left)} ${o} ${expr(n.right)})`;
  }
  // an operand kept in its declared (Option) form
  function rawOperand(e) {
    while (ts.isParenthesizedExpression(e)) e = e.expression;
    if (ts.isIdentifier(e)) {
      const o = originOf(checker, e, sf, currentUnit?.node ?? null);
      if (o.kind === 'local' || o.kind === 'unit') return dn(e.text);
      return ident(e);
    }
    if (ts.isPropertyAccessExpression(e)) return propAccess(e, true);
    if (ts.isElementAccessExpression(e) || ts.isCallExpression(e)) return rawExpr(e);
    return expr(e);
  }
  function objectLit(n, expected) {
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
        else if (ts.isMethodDeclaration(p)) fail(p, 'a method in an object literal is not translated');
      }
      const types = vals.map((v, i) => { const p = n.properties[i]; const t = ts.isPropertyAssignment(p) ? typeOf(p.initializer) : ts.isShorthandPropertyAssignment(p) ? typeOf(p.name) : typeOf(p.expression); try { return dtype(t, p); } catch { return anyType(); } });
      const id = external(`lit_${mangle(rname)}_${hash(n.properties.map((p) => p.name ? p.name.getText(sf) : '...').join(','))}`, types, rname);
      return `${id}(${vals.join(', ')})`;
    }
    if (rname.startsWith('map<')) {
      const ix = stringIndex(recT);
      const vt = ix ? ix.type : undefined;
      const entries = [];
      for (const p of n.properties) {
        if (ts.isSpreadAssignment(p)) fail(p, 'spread into a dictionary literal is not translated');
        const key = ts.isShorthandPropertyAssignment(p) ? p.name.text : ts.isIdentifier(p.name) ? p.name.text : p.name.getText(sf).replace(/^["']|["']$/g, '');
        const val = ts.isShorthandPropertyAssignment(p) ? expr(p.name, vt) : expr(p.initializer, vt);
        entries.push(`${strEsc(key)} := ${outerParens(val)}`);
      }
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
    for (const p of checker.getPropertiesOfType(recT)) if (!given.has(p.name) && (p.flags & ts.SymbolFlags.Optional)) { usesOption = true; fields.push([p.name, 'None']); }
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
  // an attribute value as an opaque value: a handler by its text, anything else converted to Any
  function jsxAttrValue(x) {
    while (ts.isParenthesizedExpression(x)) x = x.expression;
    if (ts.isArrowFunction(x) || ts.isFunctionExpression(x)) return `${external(`handler_${hash(x.getText(sf).replace(/\s+/g, ' '))}`, [], anyType())}()`; // a handler: an opaque value keyed by its text
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
  function opaqueFn(cb) {
    const text = cb.getText(sf).replace(/\s+/g, ' ');
    const t = typeOf(cb); let d;
    try { d = dtype(t, cb); } catch { d = 'Any'; addPrelude('Any', 'type Any(==)'); }
    return `${external(`fn_${hash(text)}`, [], d)}()`;
  }
  function lambda(cb, arity, paramTypes = [], opaqueOk = false) {
    if (opaqueOk && !ts.isIdentifier(cb) && (containsEffect(cb.body) || cb.modifiers?.some((m) => m.kind === K.AsyncKeyword))) return opaqueFn(cb);
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
    } else body = outerParens(expr(cb.body));
    return `((${names.join(', ')}) => ${lets.length ? `(${lets.join(' ')} ${body})` : body})`;
  }
  // `const {a, b: c} = e` → let-lines binding each name
  // srcType: the TypeScript type of the value being taken apart (so a default applies where the field is optional)
  function destructure(pattern, sourceCode, srcType = null) {
    const out = [];
    if (ts.isIdentifier(pattern)) return [`var ${dn(pattern.text)} := ${sourceCode};`];
    if (ts.isObjectBindingPattern(pattern)) {
      for (const el of pattern.elements) {
        if (el.dotDotDotToken) fail(el, 'a rest pattern is not translated');
        const prop = el.propertyName ? el.propertyName.getText(sf) : el.name.text;
        const pt = srcType ? checker.getTypeOfPropertyOfType(baseOf(srcType), prop) : null;
        let code = `${sourceCode}.${dn(prop)}`;
        if (srcType) { const sd = (() => { try { return dtype(baseOf(srcType), el); } catch { return null; } })(); if (sd === 'Any' || (sd && sd.startsWith('Ext_'))) { const fd = pt ? (() => { try { return dtype(pt, el); } catch { return anyType(); } })() : anyType(); code = sd === 'Any' ? `${external(`Any_${prop}`, [anyType()], fd)}(${sourceCode})` : `${external(`${sd}_${prop}`, [sd], fd)}(${sourceCode})`; } } // a field of an opaque value: an accessor
        if (el.initializer) {
          // `{ a = d }`: the field's value when present, the default when the field is absent or undefined
          const pd = pt ? dtype(pt, el) : null;
          if (pd && pd.startsWith('Option<')) { usesOption = true; const dflt = outerParens(expr(el.initializer, pt ? nonUndefined(pt) : undefined)); code = `(if ${code}.Some? then ${code}.value else ${dflt})`; }
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
        if (el.dotDotDotToken) fail(el, 'a rest element is not translated');
        const opaque = srcType && isAny(srcType);
        const elT = ts.isIdentifier(el.name) ? typeOf(el.name) : null;
        const code = opaque ? `${external(`Any_at_${i}`, ['Any'], elT && !isAny(elT) ? dtype(elT, el) : anyType())}(${sourceCode})` : tuple ? `${sourceCode}.${i}` : `${sourceCode}[${i}]`; // an opaque source: element i is an uninterpreted accessor
        if (ts.isIdentifier(el.name)) out.push(`var ${dn(el.name.text)} := ${code};`);
        else out.push(...destructure(el.name, code));
      });
      return out;
    }
    return fail(pattern, 'pattern is not translated');
  }
  const elemType = (arrNode) => { const t = baseOf(typeOf(arrNode)); return checker.getTypeArguments(t)[0] ?? checker.getIndexTypeOfType(t, ts.IndexKind.Number); };
  function propAccess(n, keepOption = false) {
    const name = n.name.text;
    if (ts.isIdentifier(n.expression)) {
      const o = originOf(checker, n.expression, sf, currentUnit?.node ?? null);
      if (o.kind === 'import' || o.kind === 'other' || o.kind === 'module' || o.kind === 'global') {
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
      const r = rawOperand(n.expression);
      const inner = baseOf(recvT);
      usesOption = true;
      const fieldT = typeOf(n);
      const fieldCode = fieldOf(`${r}.value`, inner, name, n);
      const alreadyOpt = isOptional(checker.getTypeOfPropertyOfType ? (checker.getPropertyOfType(inner, name) ? checker.getTypeOfSymbolAtLocation(checker.getPropertyOfType(inner, name), n) : fieldT) : fieldT);
      return `(if ${r}.Some? then ${alreadyOpt ? fieldCode : `Some(${fieldCode})`} else None)`;
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
    // a local narrowed by a type guard is still the value of its declared type in Dafny
    { let e = n.expression; while (e && ts.isParenthesizedExpression(e)) e = e.expression;
      if (e && ts.isIdentifier(e)) { const o = originOf(checker, e, sf, currentUnit?.node ?? null); if (o.kind === 'local' && o.sym) { const dt = symType(o.sym, e); const bd = isOptional(dt) ? baseOf(dt) : dt; if (isRecordish(bd) && dtype(bd, n) !== dtype(recvT, n)) recvT = bd; } } }
    if (isRecordish(recvT)) {
      const props = checker.getPropertiesOfType(recvT);
      const hasMethods = props.some((p) => isCallable(checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? n)));
      const T = dtype(recvT, n);
      const ft = typeOf(n);
      if (hasMethods || !props.length || !checker.getPropertyOfType(recvT, name)) {
        // an opaque type, or a field reached through an index signature: an uninterpreted accessor of the DECLARED field
        // type (one declaration per accessor); a read narrowed by a guard takes `.value`
        if (T.startsWith('map<')) return `(if ${strEsc(name)} in ${recvCode} then Some(${recvCode}[${strEsc(name)}]) else None)`;
        const pr = checker.getPropertyOfType(recvT, name);
        const declared = pr ? checker.getTypeOfSymbolAtLocation(pr, pr.valueDeclaration ?? n) : ft;
        const dOpt = pr ? (isOptional(declared) || !!(pr.flags & ts.SymbolFlags.Optional)) : false;
        let rd = isAny(declared) ? anyType() : dtype(declared, n);
        if (dOpt && !rd.startsWith('Option<')) { usesOption = true; rd = `Option<${rd}>`; }
        const code = `${external(`${T}_${name}`, [T], rd)}(${recvCode})`;
        if (dOpt && !isOptional(ft) && !isNullish(ft) && !n.__keepOption) return `${code}.value`;
        return code;
      }
    }
    const p = isRecordish(recvT) ? checker.getPropertyOfType(recvT, name) : null;
    if (p) {
      const declared = checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? n);
      const here = typeOf(n);
      if ((isOptional(declared) || (p.flags & ts.SymbolFlags.Optional)) && !isOptional(here) && !isNullish(here) && !n.__keepOption) return `${recvCode}.${dn(name)}.value`;
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
    return { map: expr(e.expression), key: expr(e.argumentExpression) };
  }
  function elemAccess(n) {
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
      // a key from a finite set of literals: a chain of field reads, each lifted to the expression's type
      const keys = (at.flags & TF.Union ? at.types : [at]).filter((x) => x.flags & TF.StringLiteral).map((x) => x.value);
      if (!keys.length) { const rd = dtype(typeOf(n), n), bd = dtype(base, n); return `${external(`index_${mangle(bd)}`, [bd, 'string'], rd)}(${expr(n.expression)}, ${expr(n.argumentExpression)})`; } // a computed key: uninterpreted lookup
      const R = expr(n.expression), Kc = expr(n.argumentExpression);
      const td = dtype(typeOf(n), n);
      const read = (k) => {
        const p = checker.getPropertyOfType(base, k);
        const pt = p ? checker.getTypeOfSymbolAtLocation(p, n) : null;
        let code = fieldOf(R, base, k, n);
        if (p && pt) { const fd = dtype(pt, n); const opt = !!(p.flags & ts.SymbolFlags.Optional) && !fd.startsWith('Option<'); const fdd = opt ? `Option<${fd}>` : fd; if (opt) usesOption = true; if (fdd !== td) code = convertD(code, fdd, td); } // every branch of the key chain is lifted to the expression's type
        return code;
      };
      if (keys.length === 1) return read(keys[0]);
      let out = read(keys[keys.length - 1]);
      for (let i = keys.length - 2; i >= 0; i--) out = `(if ${Kc} == ${strEsc(keys[i])} then ${read(keys[i])} else ${out})`;
      return out;
    }
    if (recvT.flags & TF.StringLike) return `[${expr(n.expression)}[${index(n.argumentExpression)}]]`; // s[i] is a one-char string
    return `${expr(n.expression)}[${index(n.argumentExpression)}]`;
  }
  function newExpr(n) {
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
    // any other constructor: an uninterpreted external of its arguments, typed by what it builds
    return externalCall(`new_${mangle(name)}`, n, [...(n.arguments ?? [])]);
  }
  const cbArity = { map: 2, filter: 2, some: 2, every: 2, find: 2, findIndex: 2, flatMap: 2, reduce: 3 };
  // the fuel a call passes: one less inside the cycle, an uninterpreted start value from outside it
  function fuelArg(callee) {
    if (!recursiveUnits.has(callee.name)) return [];
    if (currentUnit && recursiveUnits.has(currentUnit.name)) return [`${FUEL} - 1`];
    return [`${external('fuel_start', [], 'nat')}()`];
  }
  // the arguments of a call to a same-file unit, shaped to its parameters: a defaulted parameter takes Some(v) or None
  function unitArgs(callee, n) {
    const sig = checker.getResolvedSignature(n);
    const out = [];
    callee.params.forEach((p, i) => {
      const a = n.arguments[i];
      const pt = sig && sig.parameters[i] ? checker.getTypeOfSymbolAtLocation(sig.parameters[i], a ?? n) : typeOf(p.name);
      if (p.initializer && ts.isIdentifier(p.name)) { usesOption = true; out.push(a ? `Some(${outerParens(expr(a, pt))})` : 'None'); return; }
      if (!a) { if (p.questionToken) { usesOption = true; out.push('None'); return; } fail(n, `${callee.name} needs ${callee.params.length} arguments`); }
      out.push(expr(a, pt));
    });
    return out;
  }
  function call(n, awaited = false) {
    const f = n.expression;
    if (ts.isIdentifier(f)) {
      const o = originOf(checker, f, sf, currentUnit?.node ?? null);
      const callee = fns.get(f.text);
      if (o.kind === 'unit' && callee) {
        if (failedUnits.has(callee.name)) fail(n, `callee ${callee.name} was not translated`);
        if (!core && kindOf.get(callee) === 'method') fail(n, `${f.text} loops, so it is a Dafny method and cannot be called inside an expression`);
        const args = unitArgs(callee, n);
        const muts = mutatedOf(callee);
        if (muts.length) {
          // the callee returns (world?, result, p1', ...): bind each new value back to the name that was passed
          const names = muts.map((m) => { const i = callee.params.findIndex((p) => ts.isIdentifier(p.name) && p.name.text === m); let a = n.arguments[i]; while (a && ts.isParenthesizedExpression(a)) a = a.expression; if (!a) return null; if (ts.isIdentifier(a)) return dn(a.text); if (ts.isArrayLiteralExpression(a) || ts.isObjectLiteralExpression(a) || ts.isNewExpression(a)) return `_`; fail(a, `the argument for \`${m}\`, which ${f.text} changes, must be a name or a fresh literal`); });
          const eff = effectfulUnits.has(f.text);
          if (eff && !unitEffectful()) fail(n, 'internal: effectful callee in a pure unit');
          let rt = checker.getSignatureFromDeclaration(callee.fn).getReturnType(); if (isPromiseT(rt)) rt = checker.getTypeArguments(rt)[0];
          const t = `t${tempCount++}_`;
          const temps = names.map((nm, k) => (nm === '_' || nm === null ? `_` : `${t}m${k}`));
          pending.push(`var (${[...(eff ? [WORLD] : []), t, ...temps].join(', ')}) := ${fname(f.text)}(${[...(eff ? [WORLD] : []), ...fuelArg(callee), ...args].join(', ')});`);
          names.forEach((nm, k) => { if (nm && nm !== '_') pending.push(`var ${nm} := ${t}m${k};`); });
          return t;
        }
        if (effectfulUnits.has(f.text)) {
          if (!unitEffectful()) fail(n, 'internal: effectful callee in a pure unit');
          let rt = checker.getSignatureFromDeclaration(callee.fn).getReturnType(); if (isPromiseT(rt)) rt = checker.getTypeArguments(rt)[0];
          return hoist(`${fname(f.text)}(${[WORLD, ...fuelArg(callee), ...args].join(', ')})`, dtype(rt, n));
        }
        return `${fname(f.text)}(${[...fuelArg(callee), ...args].join(', ')})`;
      }
      if (o.kind === 'local') {
        // a function-typed parameter or local: applied as a Dafny function value
        const sig = checker.getResolvedSignature(n);
        const args = n.arguments.map((a, i) => expr(a, sig && sig.parameters[i] ? checker.getTypeOfSymbolAtLocation(sig.parameters[i], a) : undefined));
        return `${ident(f)}(${args.join(', ')})`;
      }
      return externalCall(awaited ? `await_${f.text}` : f.text, n, [...n.arguments]);
    }
    if (!ts.isPropertyAccessExpression(f)) fail(n, 'call through a computed callee is not translated');
    const recv = f.expression, name = f.name.text;
    if ((f.questionDotToken || n.questionDotToken) && isOptional(typeOf(recv)) && recv.kind !== K.ThisKeyword) {
      // `a?.m(args)`: the call, and its transition, only when a is present; the result is an Option
      const base = baseOf(typeOf(recv));
      const v = `oc${tempCount++}_`;
      pending.push(`var ${v} := ${rawOperand(recv)};`);
      const Td = isAny(base) ? anyType() : dtype(base, n);
      return externalCall(`${awaited ? 'await_' : ''}${isAny(base) ? 'Any' : Td}_${name}`, n, [...n.arguments], `${v}.value`, Td, null, `${v}.Some?`);
    }
    if (recv.kind === K.ThisKeyword && classOf(currentUnit)) {
      const callee = fns.get(`${currentUnit.className}.${name}`);
      if (callee) {
        const args = unitArgs(callee, n);
        const selfArg = callee.isStatic ? [] : [SELF];
        if (effectfulUnits.has(callee.name)) {
          if (!unitEffectful()) fail(n, 'internal: effectful method called from a pure method');
          let rt = checker.getSignatureFromDeclaration(callee.fn).getReturnType(); if (isPromiseT(rt)) rt = checker.getTypeArguments(rt)[0];
          return hoist(`${fname(callee.name)}(${[WORLD, ...fuelArg(callee), ...selfArg, ...args].join(', ')})`, dtype(rt, n));
        }
        return `${fname(callee.name)}(${[...fuelArg(callee), ...selfArg, ...args].join(', ')})`;
      }
      // an inherited method or a function-typed field: an uninterpreted external of the receiver and the arguments
      const T = selfType(currentUnit);
      return externalCall(`${awaited ? 'await_' : ''}${mangle(T)}_${name}`, n, [...n.arguments], SELF, T, true);
    }
    if (isWorldField(recv)) {
      // a method on a field that lives in the world: the field's value is read (a transition), the call is a transition on it
      const ft = typeOf(recv); const Td = isAny(ft) ? anyType() : dtype(ft, n);
      return externalCall(`${awaited ? 'await_' : ''}${mangle(selfType(currentUnit))}_${recv.name.text}_${name}`, n, [...n.arguments], expr(recv), Td);
    }
    const recvT = typeOf(recv);
    const base = baseOf(recvT);
    if (isAny(base)) return externalCall(`${awaited ? 'await_' : ''}Any_${name}`, n, [...n.arguments], expr(recv, anyTarget()), anyType());
    if (ts.isIdentifier(recv) && recv.text === 'Math' && name !== 'random') {
      const [a, b] = n.arguments;
      if (name === 'floor' || name === 'trunc') {
        if (real) return `((${expr(a)}).Floor as real)`;
        const inner = ts.isParenthesizedExpression(a) ? a.expression : a;
        if (ts.isBinaryExpression(inner) && inner.operatorToken.kind === K.SlashToken) {
          return `${helper(name === 'floor' ? 'FloorDiv' : 'TruncDiv', ['int'])}(${expr(inner.left)}, ${expr(inner.right)})`;
        }
        return expr(a);
      }
      if (name === 'min' || name === 'max') return `${helper(name === 'min' ? 'Min' : 'Max', [NUM])}(${expr(a)}, ${expr(b)})`;
      if (name === 'abs') return `${helper('Abs', [NUM])}(${expr(a)})`;
      return externalCall(`Math_${name}`, n, [...n.arguments]);
    }
    if (ts.isIdentifier(recv)) {
      const o = originOf(checker, recv, sf, currentUnit?.node ?? null);
      if ((o.kind === 'import' || o.kind === 'other' || o.kind === 'module' || o.kind === 'global') && !(isArrayLike(checker, base) || base.flags & TF.StringLike || isSetT(base) || isMapT(base))) {
        return externalCall(`${awaited ? 'await_' : ''}${recv.text}_${name}`, n, [...n.arguments]);
      }
    }
    if (isArrayLike(checker, base)) {
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
          case 'find': return `${helper('FindIdx', [A()])}(${R}, ${lambda2(cb)}, 0)`;
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
        case 'find': return `${helper('Find', [A()])}(${R}, ${lambda1(cb, 1)})`;
        case 'findIndex': return `${helper('FindIndex', [A()])}(${R}, ${lambda1(cb, 1)})`;
        case 'includes': return `(${expr(n.arguments[0], elemType(recv))} in ${R})`;
        case 'indexOf': return `${helper('IndexOf', [A()])}(${R}, ${expr(n.arguments[0], elemType(recv))})`;
        case 'slice': return `${helper('Slice', [A()])}(${R}, ${n.arguments[0] ? expr(n.arguments[0]) : '0'}, ${n.arguments[1] ? expr(n.arguments[1]) : `|${R}|`})`;
        case 'concat': return `(${[R, ...n.arguments.map(seqOf)].join(' + ')})`;
        case 'join': return `${helper('Join', ['string'])}(${R}, ${n.arguments[0] ? expr(n.arguments[0]) : '","'})`;
        case 'flat': return `${helper('Flat', [A().replace(/^seq<(.*)>$/, '$1')])}(${R})`;
        case 'at': return `${helper('At', [A()])}(${R}, ${expr(n.arguments[0])})`;
        case 'sort': return cb ? `${external(`sort_${mangle(A())}`, [`seq<${A()}>`, `(${A()}, ${A()}) -> ${NUM}`], `seq<${A()}>`)}(${R}, ${lambda(cb, 2)})` : `${external(`sort_default_${mangle(A())}`, [`seq<${A()}>`], `seq<${A()}>`)}(${R})`;
        case 'reverse': return `${helper('Reverse', [A()])}(${R})`;
        default: return fail(n, `array method .${name}() is not translated`);
      }
    }
    if (base.flags & TF.StringLike) {
      const S = expr(recv);
      const a0 = () => expr(n.arguments[0]);
      switch (name) {
        case 'includes': return `${helper('Includes', ['string'])}(${S}, ${a0()})`;
        case 'startsWith': return `(var tt_ := ${a0()}; |tt_| <= |${S}| && ${S}[..|tt_|] == tt_)`;
        case 'endsWith': return `(var tt_ := ${a0()}; |tt_| <= |${S}| && ${S}[|${S}| - |tt_|..] == tt_)`;
        case 'indexOf': return `${helper('IndexOfStr', ['string'])}(${S}, ${a0()})`;
        case 'slice': case 'substring': return `${helper('Slice', ['char'])}(${S}, ${n.arguments[0] ? expr(n.arguments[0]) : '0'}, ${n.arguments[1] ? expr(n.arguments[1]) : `|${S}|`})`;
        case 'charAt': return `${helper('Slice', ['char'])}(${S}, ${a0()}, ${a0()} + 1)`;
        case 'at': return `${helper('At', ['char'])}(${S}, ${a0()})`;
        case 'concat': return `(${[S, ...n.arguments.map((a) => expr(a))].join(' + ')})`;
        case 'repeat': return `${helper('Repeat', ['string'])}(${S}, ${a0()})`;
        default: return externalCall(`str_${name}`, n, [...n.arguments], S, 'string');
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
      if (name === 'get') { usesOption = true; const k = expr(n.arguments[0], kt); return `(if ${k} in ${M} then Some(${M}[${k}]) else None)`; }
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
  const retType = (u) => { let t = checker.getSignatureFromDeclaration(u.fn).getReturnType(); if (isPromiseT(t)) t = checker.getTypeArguments(t)[0]; else if (u.isAsync && checker.getAwaitedType) { const aw = checker.getAwaitedType(t); if (aw) t = aw; } return t; };
  const isAssign = (x) => ts.isBinaryExpression(x) && x.operatorToken.kind >= K.FirstAssignment && x.operatorToken.kind <= K.LastAssignment;
  const isUpdate = (x) => (ts.isPostfixUnaryExpression(x) || ts.isPrefixUnaryExpression(x)) && (x.operator === K.PlusPlusToken || x.operator === K.MinusMinusToken);
  const MUT = new Set(['push', 'unshift', 'add', 'delete', 'set']);
  const pathRoot = (x) => { while (ts.isPropertyAccessExpression(x)) x = x.expression; return x; };
  const isMutCall = (x) => ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && MUT.has(x.expression.name.text) && ts.isIdentifier(pathRoot(x.expression.expression)) && !isWorldField(x.expression.expression) && !(ts.isPropertyAccessExpression(x.expression.expression) && pathRoot(x.expression.expression).kind === K.ThisKeyword);
  const hasLoopOrMutation = (body) => {
    if (!ts.isBlock(body)) return false;
    let found = false;
    const walk = (x) => {
      if (ts.isForStatement(x) || ts.isForOfStatement(x) || ts.isWhileStatement(x) || isAssign(x) || isUpdate(x) || isMutCall(x)) found = true;
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
    if (unitEffectful() && containsEffect(node)) names.push({ name: WORLD, sym: null, node, synthetic: true, d: 'World' });
    const note = (id) => {
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
      if (isUpdate(x) && ts.isPropertyAccessExpression(x.operand)) { const r = pathRoot(x.operand); if (ts.isIdentifier(r)) note(r); }
      ts.forEachChild(x, walk);
    };
    walk(node);
    return names;
  }
  // switch → [{cond, stmts}], default stmts; each clause ends in return or break (lint rule); break is dropped
  function switchChain(s) {
    const scrut = s.expression;
    const chain = []; let dflt = null; let pendingConds = [];
    for (const c of s.caseBlock.clauses) {
      if (ts.isCaseClause(c)) {
        pendingConds.push(`(${expr(scrut)} == ${expr(c.expression, typeOf(scrut))})`);
        if (!c.statements.length) continue;
      }
      const body = c.statements.filter((x) => !ts.isBreakStatement(x)).flatMap((x) => (ts.isBlock(x) ? [...x.statements].filter((y) => !ts.isBreakStatement(y)) : [x]));
      if (ts.isDefaultClause(c)) { dflt = body; pendingConds = []; continue; }
      chain.push({ cond: pendingConds.join(' || '), stmts: body });
      pendingConds = [];
    }
    if (dflt === null && chain.length && !(retType(currentUnit).flags & (TF.Void | TF.Undefined))) {
      // no default and a value must come out: TypeScript accepted the switch as exhaustive, so the last case is the fall-back
      dflt = chain.pop().stmts;
    }
    return { chain, dflt: dflt ?? [] };
  }

  // ===== proof shape (methods with loops): unchanged from version 1, used by the fixtures =====
  const kindOf = new Map();
  const bodyExpr = (list, u) => {
    if (!list.length) fail(u.node, 'a path ends without a return');
    const [s, ...rest] = list;
    if (ts.isReturnStatement(s)) return expr(s.expression, retType(u));
    if (ts.isVariableStatement(s)) {
      const d = s.declarationList.declarations[0];
      if (!ts.isIdentifier(d.name)) return `${destructure(d.name, outerParens(expr(d.initializer)), typeOf(d.initializer)).join('\n')}\n${bodyExpr(rest, u)}`;
      const t = typeOf(d.name);
      return `var ${dn(d.name.text)}: ${dtype(t, d)} := ${outerParens(expr(d.initializer, t))};\n${bodyExpr(rest, u)}`;
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
        if (!ts.isIdentifier(d.name)) return destructure(d.name, outerParens(expr(d.initializer)), typeOf(d.initializer)).forEach(emit);
        return emit(`var ${dn(d.name.text)}: ${dtype(t, d)} := ${outerParens(expr(d.initializer, t))};`);
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
  function newValue(e) {
    while (ts.isParenthesizedExpression(e)) e = e.expression;
    if (ts.isVoidExpression(e)) { e = e.expression; while (ts.isParenthesizedExpression(e)) e = e.expression; } // `void f()` is the call f()
    if (ts.isAwaitExpression(e) || (ts.isCallExpression(e) && isEffectCall(e)) || (ts.isNewExpression(e) && isEffectCall(e))) { expr(e); return null; } // the transition is hoisted
    if (ts.isCallExpression(e) && ts.isIdentifier(e.expression) && fns.has(e.expression.text) && mutatedOf(fns.get(e.expression.text)).length) { expr(e); return null; } // a call that changes what was passed: the new values are bound by the call
    if (ts.isBinaryExpression(e) && ts.isElementAccessExpression(e.left) && ts.isIdentifier(e.left.expression)) {
      const arr = e.left.expression; const t = baseOf(typeOf(arr));
      const ix = !isArrayLike(checker, t) ? stringIndex(t) : null;
      if (ix) return [arr.text, `${dn(arr.text)}[${outerParens(expr(e.left.argumentExpression))} := ${outerParens(expr(e.right, ix.type))}]`, arr]; // a local dictionary: the map gains or replaces a key
      if (!isArrayLike(checker, t)) fail(e, 'index assignment on a non-array');
      return [arr.text, `${dn(arr.text)}[${index(e.left.argumentExpression)} := ${outerParens(expr(e.right, checker.getTypeArguments(t)[0]))}]`, arr];
    }
    if ((ts.isBinaryExpression(e) && isWorldField(e.left)) || (isUpdate(e) && isWorldField(e.operand))) {
      // a write to a world field: one transition, its result unused
      const target = ts.isBinaryExpression(e) ? e.left : e.operand;
      if (!unitEffectful()) fail(e, 'internal: a world field written in a pure method');
      const p = checker.getPropertyOfType(checker.getTypeAtLocation(currentUnit.cls.name), target.name.text);
      const dt = p ? checker.getTypeOfSymbolAtLocation(p, target) : typeOf(target);
      const d = isAny(dt) ? anyType() : dtype(dt, target);
      let value;
      if (isUpdate(e)) value = `${expr(target)} ${e.operator === K.PlusPlusToken ? '+' : '-'} ${one()}`;
      else if (e.operatorToken.kind === K.EqualsToken) value = outerParens(expr(e.right, dt));
      else { const sym = e.operatorToken.kind === K.PlusEqualsToken ? '+' : e.operatorToken.kind === K.MinusEqualsToken ? '-' : '*'; value = `${expr(target)} ${sym} ${expr(e.right)}`; }
      hoist(`${worldFieldAccessor(target, 'set', [{ d }])}(${WORLD}, ${SELF}, ${value})`, 'Unit');
      return null;
    }
    // a path x.a.b rooted at a local or a parameter, rebuilt with a new leaf: x := x.(a := x.a.(b := leaf(x.a.b)))
    function pathUpdate(target, leaf) {
      const chain = []; let root = target;
      while (ts.isPropertyAccessExpression(root)) { chain.unshift(root); root = root.expression; }
      if (!ts.isIdentifier(root)) fail(target, 'assignment target is not a path on a local record');
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
      return [root.text, build(0, dn(root.text), typeOf(root)), root];
    }
    if (ts.isBinaryExpression(e) && ts.isPropertyAccessExpression(e.left)) {
      const op = e.operatorToken.kind;
      const value = outerParens(expr(e.right, typeOf(e.left)));
      return pathUpdate(e.left, (cur, p, ft) => {
        if (op === K.EqualsToken) return (p && (p.flags & ts.SymbolFlags.Optional)) && !isOptional(typeOf(e.right)) ? (usesOption = true, `Some(${value})`) : value;
        if (p && (isOptional(ft) || (p.flags & ts.SymbolFlags.Optional))) fail(e, 'a compound assignment on an optional field is not translated');
        const sym = op === K.PlusEqualsToken ? '+' : op === K.MinusEqualsToken ? '-' : op === K.AsteriskEqualsToken ? '*' : fail(e, 'assignment operator is not translated');
        return `${cur} ${sym} ${value}`;
      });
    }
    if (isUpdate(e) && ts.isPropertyAccessExpression(e.operand)) return pathUpdate(e.operand, (cur) => `${cur} ${e.operator === K.PlusPlusToken ? '+' : '-'} ${one()}`);
    if (ts.isBinaryExpression(e)) {
      const name = dn(e.left.text);
      const op = e.operatorToken.kind;
      if (op === K.EqualsToken) return [e.left.text, outerParens(expr(e.right, typeOf(e.left)))];
      const sym = op === K.PlusEqualsToken ? '+' : op === K.MinusEqualsToken ? '-' : '*';
      return [e.left.text, `${name} ${sym} ${expr(e.right)}`];
    }
    if (isUpdate(e)) { const name = dn(e.operand.text); return [e.operand.text, `${name} ${e.operator === K.PlusPlusToken ? '+' : '-'} ${one()}`]; }
    if (isMutCall(e)) {
      // push/unshift/add/set/delete on a local, a parameter, or a path on one: the path is rebuilt with the new contents
      const r = e.expression.expression, m = e.expression.name.text;
      const t = baseOf(typeOf(r));
      const a0 = e.arguments[0];
      const piece = (m === 'push' || m === 'unshift') ? (ts.isSpreadElement(a0) ? seqOf(a0.expression) : `[${outerParens(expr(a0, checker.getTypeArguments(t)[0]))}]`) : null;
      return pathUpdate(r, (cur) => {
        if (m === 'push') return `${cur} + ${piece}`;
        if (m === 'unshift') return `${piece} + ${cur}`;
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
  const loopCtx = []; // {cont, brk, ret} of the enclosing core loop
  // a `return v` inside a loop helper becomes (Some(v), state...); outside any loop it is the value itself
  const retIn = (code) => (loopCtx.length ? loopCtx[loopCtx.length - 1].ret(code) : code);
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
    if (!ts.isArrowFunction(cb) || cb.parameters.length !== 1 || !ts.isIdentifier(cb.parameters[0].name)) return null;
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
      if (x === skipNode) return;
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
  function tr(list, fin, u) {
    if (!list.length) return fin();
    const [s, ...rest] = list;
    const more0 = (r = rest) => tr(r, fin, u);
    // after a statement of an exact try body that may fault: the catch path, else what follows
    const guard = (code, r = rest) => { const t = tryOf(s); if (!t || !(containsEffect(s) || ts.isThrowStatement(s))) return `${code}${code ? '\n' : ''}${tr(r, fin, u)}`; const P = faultPreds(); return `${code}${code ? '\n' : ''}if ${P.faulted}(${WORLD}) then\n${indentBlock(wrapLet(catchPath(t, u)))}\nelse\n${indentBlock(wrapLet(tr(r, fin, u)))}`; };
    const more = (r = rest) => (tryOf(s) && containsEffect(s) ? guard('', r) : more0(r));
    switch (s.kind) {
      case K.TryStatement: if (exactTry(s)) { s.__cont = { rest, fin }; return tr([...s.tryBlock.statements, ...(s.finallyBlock ? s.finallyBlock.statements : []), ...rest], fin, u); } return opaqueBlock(s, rest, fin, u);
      case K.Block: return tr([...s.statements, ...rest], fin, u);
      case K.EmptyStatement: return more();
      case K.ReturnStatement: {
        const top = loopCtx[loopCtx.length - 1];
        if (top && top.forEach) return capture(() => { if (s.expression && containsEffect(s.expression)) expr(s.expression); return top.cont(); }); // a return inside forEach ends one step
        return capture(() => { const rt = retType(u); const code = !s.expression ? (rt.flags & (TF.Void | TF.Undefined) ? 'Unit' : fail(s, 'bare return')) : expr(s.expression, rt); return retIn(wrapRet(code)); });
      }
      case K.ThrowStatement: { const t = tryOf(s); if (t) return capture(() => catchPath(t, u, expr(s.expression, anyTarget()))); return capture(() => { const R = dtype(retType(u), s); const code = `${external(`throw_${mangle(R)}`, [anyType()], R)}(${expr(s.expression, anyTarget())})`; return retIn(wrapRet(code)); }); }
      case K.VariableStatement: {
        const out = [];
        for (const d of s.declarationList.declarations) {
          out.push(capture(() => {
            if (!ts.isIdentifier(d.name)) return destructure(d.name, outerParens(expr(d.initializer)), typeOf(d.initializer)).join('\n');
            const t = typeOf(d.name);
            if (!d.initializer) { const D = dtype(t, d); return `var ${dn(d.name.text)}: ${D} := ${external(`uninit_${mangle(D)}`, [], D)}();`; } // assigned before any read (TypeScript checks it); the value here is never observed
            return `var ${dn(d.name.text)}: ${dtype(t, d)} := ${outerParens(expr(d.initializer, t))};`;
          }));
        }
        return tryOf(s) && containsEffect(s) ? guard(out.join('\n')) : `${out.join('\n')}\n${more0()}`;
      }
      case K.ExpressionStatement: {
        const fe = forEachShape(s);
        if (fe) { const fake = fakeForOf(s, fe); let body; const h = capture(() => { body = coreLoop(fake, rest, fin, u); return ''; }); return h.trim() ? `${h.trim()}\n${body}` : body; }
        const line = capture(() => {
          const nv = newValue(s.expression);
          if (!nv) return ''; // a bare effect call: its world transition was hoisted; nothing else to bind
          const [n, v, rootNode] = nv;
          const e = ts.isParenthesizedExpression(s.expression) ? s.expression.expression : s.expression;
          const target = rootNode ?? e.left ?? e.operand ?? e.expression.expression;
          const sym = checker.getSymbolAtLocation(target);
          return `var ${dn(n)}: ${dtype(symType(sym, s), s)} := ${v};`;
        });
        if (tryOf(s) && containsEffect(s)) return guard(line.trim() ? line : '');
        return line.trim() ? `${line}\n${more0()}` : more0();
      }
      case K.IfStatement: { let cond; const h = capture(() => { cond = truthy(s.expression); return ''; }); const body = ifChain([{ cond, stmts: flatten(s.thenStatement) }], s.elseStatement ? flatten(s.elseStatement) : [], s, rest, fin, u); return h.trim() ? `${h.trim()}\n${body}` : body; }
      case K.SwitchStatement: { let parts; const h = capture(() => { parts = switchChain(s); return ''; }); const body = ifChain(parts.chain, parts.dflt, s, rest, fin, u); return h.trim() ? `${h.trim()}\n${body}` : body; }
      case K.ForOfStatement: case K.ForStatement: case K.WhileStatement: {
        if (isOpaqueStmt(s)) return opaqueBlock(s, rest, fin, u);
        let body; const h = capture(() => { body = coreLoop(s, rest, fin, u); return ''; }); return h.trim() ? `${h.trim()}\n${body}` : body;
      }
      case K.ContinueStatement: if (!loopCtx.length) fail(s, 'continue outside a loop'); return loopCtx[loopCtx.length - 1].cont();
      case K.BreakStatement: if (!loopCtx.length) fail(s, 'break outside a loop'); return loopCtx[loopCtx.length - 1].brk();
      default: return fail(s, `statement ${ts.SyntaxKind[s.kind]} is not translated`);
    }
  }
  // an if/else-if chain (or a switch) as an expression; branches that return end the path
  // a break or continue of the ENCLOSING loop inside this statement (not one of a nested loop)
  const containsJump = (node) => { let f = false; const w = (x) => { if (ts.isContinueStatement(x) || ts.isBreakStatement(x)) f = true; if (!f && !ts.isArrowFunction(x) && !ts.isForStatement(x) && !ts.isForOfStatement(x) && !ts.isWhileStatement(x) && !ts.isSwitchStatement(x)) ts.forEachChild(x, w); }; w(node); return f; };
  function ifChain(chain, dflt, node, rest, fin, u) {
    const anyReturn = containsReturn(node) || (loopCtx.length > 0 && containsJump(node));
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
  function opaqueBlock(s, rest, fin, u) {
    if (!unitEffectful()) fail(s, 'internal: an opaque block in a unit not marked effectful');
    const returns = containsReturn(s);
    const M = assignedOutside(s).filter((m) => !m.synthetic).map((m) => ({ ...m, d: dtype(symType(m.sym, m.node), m.node) }));
    // inputs: every local the block reads, and every local it assigns (it may read it first)
    const free = [...M, ...freeVars(s, null).filter((v) => !M.some((m) => m.name === v.name)).map((v) => ({ ...v, d: dtype(symType(v.sym, v.node), v.node) }))];
    let usesSelf = false; const calls = new Set();
    const w = (x) => {
      if (x.kind === K.ThisKeyword) usesSelf = true;
      if (ts.isCallExpression(x) && ts.isIdentifier(x.expression) && fns.has(x.expression.text) && originOf(checker, x.expression, sf, currentUnit?.node ?? null).kind === 'unit') calls.add(x.expression.text);
      if (ts.isCallExpression(x) && ts.isPropertyAccessExpression(x.expression) && x.expression.expression.kind === K.ThisKeyword && currentUnit?.cls && fns.has(`${currentUnit.className}.${x.expression.name.text}`)) calls.add(`${currentUnit.className}.${x.expression.name.text}`);
      ts.forEachChild(x, w);
    };
    w(s);
    if (containsJump(s) && loopCtx.length) fail(s, 'a break or continue of an enclosing loop inside an opaque block');
    const text = s.getText(sf).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/\s+/g, ' ').trim();
    const RD = dtype(retType(u), s);
    const calleeTag = [...calls].sort().map((c) => fname(c).replace(new RegExp(`${sfx}$`), '')).join('_');
    const id = `block_${hash(text)}${calleeTag ? '_calls_' + calleeTag : ''}`;
    const inTypes = ['World', ...(usesSelf ? [selfType(u)] : []), ...free.map((v) => v.d)];
    const outTypes = ['World', ...(returns ? [`Option<${RD}>`] : []), ...M.map((m) => m.d)];
    if (returns) usesOption = true;
    const name = external(id, inTypes, outTypes.length === 1 ? outTypes[0] : `(${outTypes.join(', ')})`);
    // record the callees on the prelude block so the theorem can refuse a block whose callee changed
    const key = [...prelude.keys()].find((k) => k === name);
    if (key && calls.size) prelude.set(key, `${prelude.get(key)}\n// CALLS: ${[...calls].sort().map((c) => fname(c).replace(new RegExp(`${sfx}$`), '')).join(',')}`);
    const args = [WORLD, ...(usesSelf ? [SELF] : []), ...free.map((v) => dn(v.name))];
    const outs = [WORLD, ...(returns ? ['retb'] : []), ...M.map((m) => dn(m.name))];
    const line = outs.length === 1 ? `var ${outs[0]} := ${name}(${args.join(', ')});` : `var (${outs.join(', ')}) := ${name}(${args.join(', ')});`;
    if (!returns) return `${line}\n${tr(rest, fin, u)}`;
    return `${line}\nif retb.Some? then\n${indentBlock(retIn(wrapRet('retb.value')))}\nelse\n${indentBlock(wrapLet(tr(rest, fin, u)))}`;
  }
  function coreLoop(s, rest, fin, u) {
    const id = loopCount++;
    const returns = !s.__forEach && containsReturn(s); // a return inside a forEach callback ends one step, never the function
    const M = assignedOutside(s).map((m) => (m.synthetic ? m : { ...m, d: dtype(symType(m.sym, m.node), m.node) }));
    if (!M.length && !returns) return tr(rest, fin, u);
    if (ts.isWhileStatement(s) && containsEffect(s.expression)) fail(s, 'an effect in a while condition');
    if (ts.isForStatement(s) && (containsEffect(s.condition) || containsEffect(s.incrementor))) fail(s, 'an effect in a for header');
    const RD = dtype(retType(u), s);
    if (returns) usesOption = true;
    const isOf = ts.isForOfStatement(s), isFor = ts.isForStatement(s);
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
    const freeTyped = free.filter((v) => !M.some((m) => m.name === v.name)).map((v) => ({ ...v, d: dtype(symType(v.sym, v.node), v.node) }));
    free.length = 0; free.push(...freeTyped);
    const hn = `${curUnitName()}_loop${id}${sfx}`;
    const mNames = M.map((m) => dn(m.name));
    const retName = `ret${id}`;
    const outNames = returns ? [retName, ...mNames] : mNames; // what the helper returns
    let loopUsesSelf = false; { const w = (x) => { if (x.kind === K.ThisKeyword) loopUsesSelf = true; if (!loopUsesSelf) ts.forEachChild(x, w); }; w(s); }
    const constParams = [...(loopUsesSelf && classOf(u) ? [`${SELF}: ${selfType(u)}`] : []), ...free.map((v) => `${dn(v.name)}: ${v.d}`)];
    const stateParams = M.map((m) => `${dn(m.name)}: ${m.d}`);
    const constArgs = [...(loopUsesSelf && classOf(u) ? [SELF] : []), ...free.map((v) => dn(v.name))];
    const requiresL = [];
    let lead = [], leadArgsNext = [], leadArgsFirst = [], exit, bind = '', decreases, factsIn = new Set();
    let lp = null;
    if (isOf) {
      const x = s.initializer.declarations[0].name;
      const itT = baseOf(typeOf(s.expression));
      let T, src;
      if (isAny(itT)) { T = anyType(); src = seqOf(s.expression); }
      else if (isRecordish(itT)) { T = dtype(typeOf(x), x); const IT = dtype(itT, s); src = `${external(`${mangle(IT)}_to_seq`, [IT], `seq<${T}>`)}(${expr(s.expression)})`; }
      else if (itT.flags & TF.StringLike) { T = 'string'; src = `${helper('Map', ['char', 'string'])}(${expr(s.expression)}, ((c: char) => [c]))`; }
      else if (isSetT(itT)) { T = dtype(checker.getTypeArguments(itT)[0], s); src = seqOf(s.expression); }
      else if (isMapT(itT)) { const [kt, vt] = checker.getTypeArguments(itT); const Kd = dtype(kt, s), Vd = dtype(vt, s); T = `(${Kd}, ${Vd})`; src = `${external('map_entries', [`map<${Kd}, ${Vd}>`], `seq<(${Kd}, ${Vd})>`)}(${expr(s.expression)})`; }
      else { T = dtype(typeOf(x), x); src = outerParens(expr(s.expression)); }
      const sq = `seq${id}`, ix = `idx${id}`;
      lead = [`${sq}: seq<${T}>`, `${ix}: int`];
      leadArgsNext = [sq, `${ix} + 1`];
      leadArgsFirst = [src, '0'];
      requiresL.push(`0 <= ${ix} <= |${sq}|`);
      const cb = filterProvenance(s.expression);
      if (cb) requiresL.push(`forall k :: 0 <= k < |${sq}| ==> ${lambda(cb, 1)}(${sq}[k])`);
      exit = `${ix} >= |${sq}|`;
      bind = ts.isIdentifier(x) ? `var ${dn(x.text)}: ${T} := ${sq}[${ix}];\n` : destructure(x, `${sq}[${ix}]`, typeOf(x)).join('\n') + '\n';
      decreases = `|${sq}| - ${ix}`;
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
      const h = hintsOf(sf, s);
      exit = `!(${outerParens(truthy(s.expression))})`;
      decreases = h.decreases ?? fail(s, 'while needs `// @decreases <expr>`');
    }
    const next = () => `${hn}(${[...leadArgsNext, ...constArgs, ...mNames].join(', ')})`;
    const exitVal = () => (returns ? tupleOf(['None', ...mNames]) : tupleOf(mNames));
    loopCtx.push({ cont: next, brk: exitVal, forEach: !!s.__forEach, ret: (code) => (returns ? tupleOf([`Some(${code})`, ...mNames]) : fail(s, 'internal: return in a loop without the return shape')) });
    let bodyE;
    try { bodyE = tr(flatten(s.statement), next, u); } finally { loopCtx.pop(); }
    const params = [...lead, ...constParams, ...stateParams];
    const selfArgs = [...lead.map((p) => p.split(':')[0]), ...constArgs, ...mNames];
    const callS = `${hn}(${selfArgs.join(', ')})`;
    const outTypes = returns ? [`Option<${RD}>`, ...M.map((m) => m.d)] : M.map((m) => m.d);
    const resT = outTypes.length === 1 ? outTypes[0] : `(${outTypes.join(', ')})`;
    const hints = [...userHints];
    for (const m of M) {
      if ((m.d === 'int' || m.d === 'real') && keepsNonneg(m.name, s.statement, factsIn)) hints.push(`${dn(m.name)} >= ${m.d === 'real' ? '0.0' : '0'}`);
    }
    const exitFact = !isOf && !isFor && !returns ? [`  ensures (var ${tupleOf(outNames)} := ${callS}; ${exit})`] : [];
    const specs = [...requiresL.map((r) => `  requires ${r}`),
      ...hints.map((h) => `  ensures (${h}) ==> (var ${tupleOf(outNames)} := ${callS}; ${h})`),
      ...exitFact,
      `  decreases ${decreases}`];
    coreHelpers.push([`function ${hn}${tclause([...params, resT])}(${params.join(', ')}): ${resT}`, ...specs, '{',
      indentBlock(`if ${exit} then ${exitVal()}\nelse\n${indentBlock(wrapLet(bind + bodyE))}`), '}'].join('\n'));
    if (isFor && real) intVars.delete(lp.i);
    const first = `${hn}(${[...leadArgsFirst, ...constArgs, ...mNames].join(', ')})`;
    if (!returns) return `var ${tupleOf(mNames)} := ${first};\n${tr(rest, fin, u)}`;
    // a return from inside the loop ends the function (or the enclosing loop helper) with that value
    const after = tr(rest, fin, u);
    return `var ${tupleOf(outNames)} := ${first};\nif ${retName}.Some? then\n${indentBlock(retIn(wrapRet(`${retName}.value`)))}\nelse\n${indentBlock(wrapLet(after))}`;
  }

  // ----- which units are effectful: callees come first in `order`, so a caller sees its callee's flag -----
  for (const name of effectful) effectfulUnits.add(name); // forced by the other side of a pair: both sides thread the world
  for (const u of order) { // callees come first in `order`
    currentUnit = u;
    if (core && containsEffect(u.body)) effectfulUnits.add(u.name);
    currentUnit = null;
  }
  if (core) computeMutations();
  // ----- emit functions -----
  for (const u of order) kindOf.set(u, hasLoopOrMutation(u.body) ? 'method' : 'function');
  function sigParams(u) {
    const parts = []; const lets = [];
    u.params.forEach((p, i) => {
      const t = typeOf(p.name);
      let d = dtype(t, p);
      if (p.initializer && ts.isIdentifier(p.name)) {
        // a default: the caller may omit it; the parameter is an Option and the default fills None
        usesOption = true;
        const pn = `${dn(p.name.text)}_opt`;
        parts.push(`${pn}: Option<${d}>`);
        lets.push(`var ${dn(p.name.text)}: ${d} := if ${pn}.Some? then ${pn}.value else ${outerParens(expr(p.initializer, t))};`);
        return;
      }
      if (p.questionToken && !d.startsWith('Option<')) { usesOption = true; d = `Option<${d}>`; }
      if (ts.isIdentifier(p.name)) parts.push(`${dn(p.name.text)}: ${d}`);
      else { const pn = `arg${i}_`; parts.push(`${pn}: ${d}`); lets.push(...destructure(p.name, pn, typeOf(p.name))); }
    });
    return { text: parts.join(', '), lets };
  }
  const chunks = [];
  for (const u of order) {
    if (tolerant) {
      const before = chunks.length; const savedPending = pending;
      try { emitUnit(u); report.translated.push(u.name); }
      catch (e) { if (!(e instanceof Unsupported)) throw e; chunks.length = before; pending = savedPending; failedUnits.add(u.name); report.failed.push({ unit: u.name, message: String(e.message).split('\n')[0].slice(0, 160) }); currentUnit = null; }
      continue;
    }
    emitUnit(u);
  }
  function emitUnit(u) {
    currentUnit = u;
    loopCount = 0;
    const rt = dtype(retType(u), u.node);
    const name = fname(u.name);
    const specs = [];
    const argNames = u.params.map((p, i) => (ts.isIdentifier(p.name) ? dn(p.name.text) : `arg${i}_`)).join(', ');
    const sub = (e) => (core ? e.replace(/\bresult\b/g, `${name}(${argNames})`) : e);
    if (u === target) {
      for (const r of requires) specs.push(`  requires ${sub(r)}`);
      for (const e of ensures) specs.push(`  ensures ${sub(e)}`);
    }
    const sp = sigParams(u);
    const bodyList = ts.isBlock(u.body) ? [...u.body.statements] : null;
    if (core) {
      const eff = effectfulUnits.has(u.name);
      if (eff) addPrelude('World', 'type World');
      const endVal = () => (retType(u).flags & (TF.Void | TF.Undefined) ? wrapRet('Unit') : fail(u.node, 'a path ends without a return'));
      const body = bodyList ? tr(bodyList, endVal, u) : capture(() => wrapRet(expr(u.body, retType(u))));
      const mutLets = mutatedOf(u).map((m) => `var ${dn(m)} := ${dn(m)};`); // a mutated parameter starts as the argument and is rebound by the body
      const full = [...sp.lets, ...mutLets].length ? `${[...sp.lets, ...mutLets].join('\n')}\n${body}` : body;
      const selfParam = classOf(u) && !u.isStatic ? `${SELF}: ${selfType(u)}` : '';
      const plain = [selfParam, sp.text].filter(Boolean).join(', ');
      const rec = recursiveUnits.has(u.name);
      const plain2 = rec ? [`${FUEL}: nat`, plain].filter(Boolean).join(', ') : plain;
      const sig = eff ? `${WORLD}: World${plain2 ? ', ' + plain2 : ''}` : plain2;
      const mutTypes = mutatedOf(u).map((m) => { const pr = u.params.find((p) => ts.isIdentifier(p.name) && p.name.text === m); return dtype(typeOf(pr.name), pr); });
      const rtype = [...(eff ? ['World'] : []), rt, ...mutTypes].length === 1 ? rt : `(${[...(eff ? ['World'] : []), rt, ...mutTypes].join(', ')})`;
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
    currentUnit = null;
  }
  if (tolerant && reportOut) fs.writeFileSync(reportOut, JSON.stringify(report, null, 1));

  // integer division placeholders left by `/` under Math.floor are resolved in call(); a leftover is a defect
  const main = chunks.join('\n\n');
  if (main.includes('__DIV__')) throw new Unsupported('internal: an integer division was not placed under Math.floor');

  const pre = [];
  if (prelude.size || usesOption) {
    pre.push('datatype Unit = Unit');
    if (usesOption) pre.push('datatype Option<T> = None | Some(value: T)');
    for (const [k, text] of prelude) pre.push(text);
  }
  const header = `// Generated by lean-ts translate (version 3) from ${path.basename(file)}, ${fnName ? `function ${fnName}` : 'all functions'}. number is ${NUM}.\n// Do not edit: the gate regenerates this file.\n// EFFECTFUL: ${[...effectfulUnits].sort().join(',')}`;
  if (opts.preludeOut) {
    const preludeText = `// Generated by lean-ts translate (version 2): shared declarations. Identical for parent and candidate, or the gate refuses.\n` + pre.map((t) => `// PRELUDE ${t.match(/^(?:datatype|type|function)\s+([A-Za-z0-9_]+)/)?.[1] ?? hash(t)}\n${t}\n// END PRELUDE`).join('\n') + '\n';
    return { main: `${header}\ninclude "${path.basename(opts.preludeOut)}"\n\n${main}\n`, prelude: preludeText };
  }
  return { main: [header, ...pre, main].join('\n\n') + '\n', prelude: null };
}

const isMain = path.resolve(process.argv[1] ?? '') === new URL(import.meta.url).pathname;
if (isMain) {
  const args = process.argv.slice(2);
  const opts = { real: false, requires: [], ensures: [], invariants: [], core: false, suffix: '', only: null, project: true, preludeOut: null };
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
