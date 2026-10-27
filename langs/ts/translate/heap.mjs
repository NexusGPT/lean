// References, layer 2: the heap core of the proof lane (`--heap`).
//
// A unit in the heap core reads and writes plain records and arrays through one heap in a heap world:
//   type Ref = nat
//   datatype Obj = R_<shape>(f1: .., f2: ..) | A_<elem>(items: seq<..>) | Dead      (one constructor per shape used)
//   datatype HWorld = HWorld(heap: map<Ref, Obj>, next: nat)
// A parameter of record or array type is a Ref. A read of a field goes through a TOTAL function of the prelude
// (`Get_<shape>_<field>`): a reference that is not in the heap, or holds another shape, reads as a default; a write
// (`Set_<shape>_<field>`, `Push_`, `Unshift_`, `Pop_`) through a bad reference leaves the heap as it is. A literal, a
// spread copy or a slice allocates the next reference (`Alloc_<shape>`) and increments `next`. Every unit is a total
// function `(hw_: HWorld, params) -> (HWorld, result)` with no precondition: nothing in a body can fail to verify.
// The hypothesis a unit's inputs satisfy in the typed program (`WF(hw_)`: every cell well typed and below `next`;
// each reference parameter of its declared shape) is written in the translated file as `// HYP <unit>: <expr>`;
// the theorem copies it into the equality lemma. So the lemma proves equality over well-formed heaps only, and a
// false proof needs a difference that no well-formed heap exhibits. Equality is of the whole final heap, `next`
// included: corresponding allocations in the same order give the same references (design/heap-layer.md, the
// identity certificate); two versions allocating on different schedules are unproved, an ASK, never a WITNESS.
// Nothing assumes two parameters are two objects: `user` and `tags` may be one cell, `user.tags` may be `tags`.
//
// The core, by syntax: parameters, locals and results typed as primitives, plain records (fields primitive, record
// or array) or arrays of those; statements `const`/`let` with an initializer, assignment and `+=`/`-=` to a local or
// a field path, `push`/`unshift`/`pop` statements on an array path, `return`, `if`/`else` whose branches return, calls
// of same-file core units; expressions over those values (`.length`, `+ - *`, comparisons, `&& || !`, literals, a
// spread array or record literal, `.slice()`). A unit is in the core when its own syntax fits and every same-file
// unit it calls, and every same-file unit that calls it, is in the core. Everything else keeps the existing
// translation. Element access `a[i]` stays out of the core in this stage.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
// the library transition table: one verified Dafny form per built-in (translate/library.json, forms checked in
// design/library-ops.dfy and against the engine by exec/transitions.mjs on Test262); the prelude instantiates a row's
// form per shape by substituting <K> (the shape key) and <E> (its element type)
const LIBRARY = JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'library.json'), 'utf8'));
const LIB_ROW = Object.fromEntries(LIBRARY.operations.map((o) => [o.op, o]));
const ARRAY_ROWS = { push: 'Array.prototype.push', unshift: 'Array.prototype.unshift', pop: 'Array.prototype.pop', shift: 'Array.prototype.shift', splice: 'Array.prototype.splice', reverse: 'Array.prototype.reverse', slice: 'Array.prototype.slice', concat: 'Array.prototype.concat' };
const instantiate = (form, k, E, KT = null, k2 = null, E2 = null) => form.replace(/<K2>/g, k2 ?? '').replace(/<E2>/g, E2 ?? '').replace(/<KT>/g, KT ?? '').replace(/<K>/g, k).replace(/<E>/g, E).replace(/\.items\b/g, `.items_${k}`).replace(/\.entries\b/g, `.entries_${k}`); // the table writes `.items` and `.entries`; each shape has its own destructor

export const HW = 'hw_';

export function makeHeap({ ts, checker, sf, fns, dn, fname, isReal, recursive }) {
  const TF = ts.TypeFlags, K = ts.SyntaxKind;
  const NUM = isReal ? 'real' : 'int';
  const shapes = new Map(); // key -> shape
  const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 8);
  const nonNull = (t) => (t.flags & TF.Union ? t.types.filter((x) => !(x.flags & (TF.Undefined | TF.Null))) : [t]);

  // ----- shapes: structural, so an alias and the anonymous type it names are one constructor -----
  function shapeOf(t, depth = 0) {
    if (!t || depth > 6) return null;
    if (t.flags & TF.BooleanLike) return { kind: 'prim', d: 'bool' }; // `boolean` is the union true | false: one shape
    const parts = nonNull(t);
    if (parts.length !== 1) return null;
    t = parts[0];
    if (t.flags & TF.NumberLike) return { kind: 'prim', d: NUM };
    if (t.flags & TF.StringLike) return { kind: 'prim', d: 'string' };
    if (t.flags & TF.BooleanLike) return { kind: 'prim', d: 'bool' };
    if (checker.isArrayType(t)) { const e = shapeOf(checker.getTypeArguments(t)[0], depth + 1); return e ? { kind: 'arr', elem: e, key: `A_${keyOf(e)}` } : null; }
    const symName = t.symbol?.name;
    if (symName === 'Map' && checker.getTypeArguments(t).length === 2) { const [kt, vt] = checker.getTypeArguments(t); const k = shapeOf(kt, depth + 1), v = shapeOf(vt, depth + 1); return k && k.kind === 'prim' && v ? { kind: 'map', k, v, key: `M_${keyOf(k)}_${keyOf(v)}` } : null; } // a Map cell: insertion-ordered entries, keys primitive (SameValueZero on primitives is ==)
    if (symName === 'Set' && checker.getTypeArguments(t).length === 1) { const e = shapeOf(checker.getTypeArguments(t)[0], depth + 1); return e && e.kind === 'prim' ? { kind: 'set', elem: e, key: `S_${keyOf(e)}` } : null; } // a Set cell of primitives
    if (t.flags & TF.Object) {
      if (t.getCallSignatures().length || t.getConstructSignatures().length) return null;
      const props = checker.getPropertiesOfType(t);
      if (!props.length) return null;
      const fields = [];
      for (const p of props) {
        if (p.flags & (ts.SymbolFlags.Method | ts.SymbolFlags.Optional | ts.SymbolFlags.Accessor)) return null;
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(p.name)) return null;
        const ft = checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? sf);
        if (ft.getCallSignatures().length) return null;
        const s = shapeOf(ft, depth + 1); if (!s) return null;
        fields.push({ name: p.name, shape: s });
      }
      fields.sort((a, b) => (a.name < b.name ? -1 : 1));
      return { kind: 'rec', fields, key: `R_${hash(fields.map((f) => `${f.name}:${keyOf(f.shape)}`).join(','))}` };
    }
    return null;
  }
  const keyOf = (s) => (s.kind === 'prim' ? s.d : s.key);
  const valD = (s) => (s.kind === 'prim' ? s.d : 'Ref');
  const dflt = (s) => (s.kind === 'prim' ? (s.d === 'string' ? '""' : s.d === 'bool' ? 'false' : isReal ? '0.0' : '0') : '0');
  function register(s) { if (!s || s.kind === 'prim') return; if (!shapes.has(s.key)) { shapes.set(s.key, s); if (s.kind === 'arr' || s.kind === 'set') register(s.elem); else if (s.kind === 'map') register(s.v); else for (const f of s.fields) register(f.shape); } }
  const mapInstances = new Set(); // 'K|K2' pairs of Array.prototype.map seen in the core, each its own Map_K_K2
  const typeOf = (n) => checker.getTypeAtLocation(n);
  const fieldOf = (s, name) => (s.kind === 'rec' ? s.fields.find((f) => f.name === name) : null);

  // ----- the core, by syntax -----
  const MUTATORS = new Set(['push', 'unshift', 'pop', 'shift', 'reverse', 'splice']); // in-place array operations of the table, as statements
  const MUTATOR_ARITY = { push: [1, 1], unshift: [1, 1], pop: [0, 0], shift: [0, 0], reverse: [0, 0], splice: [2, Infinity] }; // splice: start, delete count, then insertions
  const BINOPS = new Set([K.PlusToken, K.MinusToken, K.LessThanToken, K.LessThanEqualsToken, K.GreaterThanToken, K.GreaterThanEqualsToken, K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.AmpersandAmpersandToken, K.BarBarToken]);
  const unparen = (e) => { while (ts.isParenthesizedExpression(e)) e = e.expression; return e; };
  const isBoolT = (t) => !!(t.flags & ts.TypeFlags.BooleanLike); // `&&` and `||` in the core are the boolean connectives; a value on either side is the ordinary translation's mixed logic
  const sameFileCall = (e) => ts.isCallExpression(e) && ts.isIdentifier(e.expression) && fns.has(e.expression.text) && !e.typeArguments;
  const block = (s) => (ts.isBlock(s) ? [...s.statements] : [s]);
  const endsWithReturn = (list) => {
    const s = list[list.length - 1]; if (!s) return false;
    if (ts.isReturnStatement(s)) return true;
    if (ts.isIfStatement(s) && s.elseStatement) return endsWithReturn(block(s.thenStatement)) && endsWithReturn(block(s.elseStatement));
    return false;
  };
  const whyNot = new Map(); // unit name -> the reasons it is out of the core (the first reason met on each path)
  function coreUnit(u) {
    const reasons = new Set();
    whyNot.set(u.name, reasons);
    let ok = true;
    const no = (why) => { ok = false; reasons.add(why); };
    if (u.cls || u.accessor || u.isCtor) no('method, accessor or constructor');
    if (u.fn.asteriskToken || u.isAsync) no('generator or async');
    if (u.generics?.length) no('generic');
    if (recursive.has(u.name)) no('recursive');
    if (!ts.isBlock(u.body)) no('expression body');
    if (!ok) return false;
    const names = new Set(); let lambdaDepth = 0;
    for (const p of u.params) { if (!ts.isIdentifier(p.name) || p.initializer || p.questionToken || p.dotDotDotToken) no('parameter form'); else if (!shapeOf(typeOf(p.name))) no(`parameter type: ${shapeWhy(typeOf(p.name))}`); else names.add(p.name.text); }
    const rt = checker.getSignatureFromDeclaration(u.fn)?.getReturnType();
    if (!rt || !shapeOf(rt)) no(`return type: ${shapeWhy(rt)}`);
    if (!ok) return false;
    const declaredInside = (id) => { const s = checker.getSymbolAtLocation(id); const d = s?.valueDeclaration ?? s?.declarations?.[0]; return !!d && d.getSourceFile() === sf && d.pos >= u.fn.pos && d.end <= u.fn.end; };
    const checkExpr = (e0) => {
      if (!ok) return;
      const e = unparen(e0);
      if (ts.isIdentifier(e)) { if (e.text === HW) no('name hw_'); else if (!declaredInside(e)) no(`outside name ${e.text}`); else if (!shapeOf(typeOf(e))) no(`value type: ${shapeWhy(typeOf(e))}`); return; }
      if (ts.isNumericLiteral(e) || ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e) || e.kind === K.TrueKeyword || e.kind === K.FalseKeyword) return;
      if (ts.isPropertyAccessExpression(e)) {
        const s = shapeOf(typeOf(e.expression)); if (!s) return no(`receiver type: ${shapeWhy(typeOf(e.expression))}`);
        if (s.kind === 'arr' ? e.name.text !== 'length' : (s.kind === 'map' || s.kind === 'set') ? e.name.text !== 'size' : !fieldOf(s, e.name.text)) return no(`property ${e.name.text}`);
        return checkExpr(e.expression);
      }
      if (ts.isNewExpression(e) && ts.isIdentifier(e.expression) && (e.expression.text === 'Map' || e.expression.text === 'Set') && !(e.arguments ?? []).length) { if (!shapeOf(typeOf(e))) return no(`new ${e.expression.text} type: ${shapeWhy(typeOf(e))}`); return; } // an empty cell
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && e.expression.name.text === 'has' && e.arguments.length === 1) { const s = shapeOf(typeOf(e.expression.expression)); if (!s || (s.kind !== 'map' && s.kind !== 'set')) return no('has on a non-cell'); checkExpr(e.expression.expression); return checkExpr(e.arguments[0]); }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && (e.expression.name.text === 'map' || e.expression.name.text === 'filter') && e.arguments.length === 1 && ts.isArrowFunction(e.arguments[0])) { // the table's map and filter rows: a pure one-parameter arrow with an expression body
        const s = shapeOf(typeOf(e.expression.expression)); if (!s || s.kind !== 'arr') return no(`${e.expression.name.text} of a non-array`);
        const cb = e.arguments[0]; if (cb.parameters.length !== 1 || !ts.isIdentifier(cb.parameters[0].name) || ts.isBlock(cb.body) || cb.modifiers?.length) return no('callback form');
        if (e.expression.name.text === 'map') { const rs = shapeOf(typeOf(e)); if (!rs || rs.kind !== 'arr') return no(`map result type: ${shapeWhy(typeOf(e))}`); }
        const x = cb.parameters[0].name.text; if (names.has(x) || x === HW) return no('name reused'); if (!shapeOf(typeOf(cb.parameters[0].name))) return no('callback parameter type');
        checkExpr(e.expression.expression); names.add(x); lambdaDepth++; checkExpr(cb.body); lambdaDepth--; names.delete(x); return;
      }
      if (ts.isBinaryExpression(e)) { if (!BINOPS.has(e.operatorToken.kind)) return no(`operator ${e.operatorToken.getText(sf)}`); if ((e.operatorToken.kind === K.AmpersandAmpersandToken || e.operatorToken.kind === K.BarBarToken) && !(isBoolT(typeOf(e.left)) && isBoolT(typeOf(e.right)))) return no('logic on values'); checkExpr(e.left); checkExpr(e.right); return; }
      if (ts.isPrefixUnaryExpression(e)) { if (e.operator !== K.ExclamationToken) return no('prefix operator (a negation can make a negative zero the int reading does not see)'); return checkExpr(e.operand); }
      if ((ts.isArrayLiteralExpression(e) || ts.isObjectLiteralExpression(e) || ts.isNewExpression(e)) && lambdaDepth) return no('allocation inside a callback');
      if (ts.isArrayLiteralExpression(e)) { if (!shapeOf(typeOf(e))) return no(`array literal type: ${shapeWhy(typeOf(e))}`); for (const x of e.elements) checkExpr(ts.isSpreadElement(x) ? x.expression : x); return; }
      if (ts.isObjectLiteralExpression(e)) {
        const s = shapeOf(typeOf(e)); if (!s || s.kind !== 'rec') return no(`object literal type: ${shapeWhy(typeOf(e))}`);
        const given = new Set(); let spread = false;
        for (const p of e.properties) {
          if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) { given.add(p.name.text); checkExpr(p.initializer); }
          else if (ts.isShorthandPropertyAssignment(p)) { given.add(p.name.text); checkExpr(p.name); }
          else if (ts.isSpreadAssignment(p)) { spread = true; const ss = shapeOf(typeOf(p.expression)); if (!ss || ss.kind !== 'rec') return no('spread of a non-record'); checkExpr(p.expression); }
          else return no('object member form');
        }
        if (!spread && s.fields.some((f) => !given.has(f.name))) return no('object literal misses a field');
        return;
      }
      if (sameFileCall(e)) { for (const a of e.arguments) checkExpr(a); return; }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && ['slice', 'concat', 'reverse', 'splice'].includes(e.expression.name.text)) { // the table's rows that yield a reference: a fresh array (slice, concat, splice) or the receiver (reverse)
        const m = e.expression.name.text; const s = shapeOf(typeOf(e.expression.expression)); if (!s || s.kind !== 'arr') return no(`${m} of a non-array`);
        if ((m === 'slice' || m === 'splice') && isReal) return no(`${m} index in a real file`);
        if (m === 'slice' && e.arguments.length > 2) return no('slice arity');
        if (m === 'reverse' && e.arguments.length !== 0) return no('reverse arity');
        if (m === 'splice' && e.arguments.length < 2) return no('splice arity');
        if (m === 'concat') { if (e.arguments.length !== 1) return no('concat arity'); const q = shapeOf(typeOf(e.arguments[0])); if (!q || q.kind !== 'arr' || q.key !== s.key) return no('concat of a different shape'); }
        checkExpr(e.expression.expression); for (const a of e.arguments) checkExpr(a); return;
      }
      if (ts.isCallExpression(e)) return no(ts.isPropertyAccessExpression(e.expression) ? `call .${e.expression.name.text}` : 'call outside the file');
      if (ts.isElementAccessExpression(e)) return no('element access');
      no(`expression ${K[e.kind]}`);
    };
    const checkTarget = (t0) => {
      const t = unparen(t0);
      if (ts.isIdentifier(t)) return checkExpr(t);
      if (ts.isPropertyAccessExpression(t)) { const s = shapeOf(typeOf(t.expression)); if (!s || s.kind !== 'rec' || !fieldOf(s, t.name.text)) return no('write target'); return checkExpr(t.expression); }
      no(ts.isElementAccessExpression(t) ? 'element write' : 'write target');
    };
    const checkStmts = (list) => {
      for (let i = 0; i < list.length && ok; i++) {
        const s = list[i];
        if (ts.isVariableStatement(s)) {
          for (const d of s.declarationList.declarations) { if (!ts.isIdentifier(d.name) || !d.initializer) return no('binding form'); if (d.name.text === HW || names.has(d.name.text)) return no('name reused'); if (!shapeOf(typeOf(d.name))) return no(`local type: ${shapeWhy(typeOf(d.name))}`); names.add(d.name.text); checkExpr(d.initializer); }
          continue;
        }
        if (ts.isReturnStatement(s)) { if (!s.expression) return no('bare return'); if (i !== list.length - 1) return no('statement after return'); return checkExpr(s.expression); }
        if (ts.isIfStatement(s)) {
          checkExpr(s.expression);
          const t = block(s.thenStatement); checkStmts(t); if (!endsWithReturn(t)) return no('if branch without return');
          if (s.elseStatement) { const el = block(s.elseStatement); checkStmts(el); if (!endsWithReturn(el)) return no('if branch without return'); if (i !== list.length - 1) return no('statement after if/else'); }
          continue;
        }
        if (ts.isExpressionStatement(s)) {
          const e = unparen(s.expression);
          if (ts.isBinaryExpression(e) && [K.EqualsToken, K.PlusEqualsToken, K.MinusEqualsToken].includes(e.operatorToken.kind)) { checkTarget(e.left); checkExpr(e.right); continue; }
          if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && ['set', 'add', 'delete'].includes(e.expression.name.text) && (() => { const sc = shapeOf(typeOf(e.expression.expression)); return sc && (sc.kind === 'map' || sc.kind === 'set'); })()) { // the table's cell rows as statements
            const sc = shapeOf(typeOf(e.expression.expression)); const m = e.expression.name.text;
            if (sc.kind === 'map' ? !((m === 'set' && e.arguments.length === 2) || (m === 'delete' && e.arguments.length === 1)) : !((m === 'add' || m === 'delete') && e.arguments.length === 1)) return no('cell mutator arity');
            checkExpr(e.expression.expression); for (const a of e.arguments) checkExpr(a); continue;
          }
          if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && MUTATORS.has(e.expression.name.text)) {
            const s2 = shapeOf(typeOf(e.expression.expression)); if (!s2 || s2.kind !== 'arr') return no('mutator on a non-array');
            const m = e.expression.name.text; const [lo, hi] = MUTATOR_ARITY[m]; if (e.arguments.length < lo || e.arguments.length > hi) return no('mutator arity');
            if (m === 'splice' && isReal) return no('splice index in a real file');
            checkExpr(e.expression.expression); for (const a of e.arguments) checkExpr(a); continue;
          }
          if (sameFileCall(e)) { for (const a of e.arguments) checkExpr(a); continue; }
          return no(ts.isCallExpression(e) ? (ts.isPropertyAccessExpression(e.expression) ? `call .${e.expression.name.text}` : 'call outside the file') : `expression statement ${K[e.kind]}`);
        }
        return no(`statement ${K[s.kind]}`);
      }
    };
    const body = [...u.body.statements];
    checkStmts(body);
    if (!endsWithReturn(body)) no('path without return');
    return ok;
  }
  // why a type has no shape: the first offending part, for the census
  function shapeWhy(t) {
    if (!t) return 'none';
    const parts = nonNull(t);
    if (parts.length !== 1) return parts.length === 0 ? 'null or undefined only' : 'union';
    t = parts[0];
    if (t.flags & (TF.Any | TF.Unknown)) return 'any or unknown';
    if (t.flags & TF.TypeParameter) return 'type parameter';
    if (t.flags & (TF.NumberLike | TF.StringLike | TF.BooleanLike)) return 'primitive';
    if (t.flags & (TF.Void | TF.Undefined | TF.Null | TF.Never)) return 'void';
    if (t.flags & TF.EnumLike) return 'enum';
    if (checker.isTupleType(t)) return 'tuple';
    if (checker.isArrayType(t)) return `array of ${shapeWhy(checker.getTypeArguments(t)[0])}`;
    if (t.flags & TF.Object) {
      if (t.getCallSignatures().length) return 'function';
      if (t.getConstructSignatures().length) return 'class';
      const name = t.symbol?.name;
      if (name && !['__type', '__object'].includes(name) && /^(Map|Set|Date|Promise|RegExp|WeakMap|WeakSet|Record)$/.test(name)) return name;
      if (checker.getIndexInfoOfType(t, ts.IndexKind.String) || checker.getIndexInfoOfType(t, ts.IndexKind.Number)) return 'dictionary';
      const props = checker.getPropertiesOfType(t);
      if (!props.length) return 'empty object';
      for (const p of props) {
        if (p.flags & ts.SymbolFlags.Method) return 'method field';
        if (p.flags & ts.SymbolFlags.Optional) return 'optional field';
        if (p.flags & ts.SymbolFlags.Accessor) return 'accessor field';
        const ft = checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? sf);
        if (!shapeOf(ft, 1)) return `field ${p.name}: ${shapeWhy(ft)}`;
      }
      return 'depth';
    }
    return 'other';
  }
  let core = new Set();
  const callsOf = (u) => { const calls = new Set(); const w = (n) => { if (sameFileCall(n)) calls.add(n.expression.text); ts.forEachChild(n, w); }; w(u.body); return calls; };
  function plan(order, only) {
    const own = new Set(order.filter((u) => coreUnit(u) && (!only || only.includes(u.name))).map((u) => u.name));
    // a unit named as a VALUE anywhere (`.then(bump)`, a callback argument, a stored function) keeps its layer-1 signature: out of the core
    const asValue = new Set();
    for (const u of order) { const w = (n) => { if (ts.isIdentifier(n) && fns.has(n.text) && !(n.parent && ts.isCallExpression(n.parent) && n.parent.expression === n) && !(n.parent && ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) && !(n.parent && (ts.isFunctionDeclaration(n.parent) || ts.isVariableDeclaration(n.parent)) && n.parent.name === n)) asValue.add(n.text); ts.forEachChild(n, w); }; w(u.body); }
    for (const name of asValue) if (own.has(name)) { own.delete(name); whyNot.get(name)?.add('named as a value'); }
    const graph = new Map(order.map((u) => [u.name, callsOf(u)]));
    let changed = true;
    while (changed) {
      changed = false;
      for (const u of order) {
        if (!own.has(u.name)) continue;
        const calls = graph.get(u.name);
        const out = [...calls].find((c) => !own.has(c));
        if (out !== undefined) { own.delete(u.name); whyNot.get(u.name)?.add(`calls ${out}, outside the core`); changed = true; continue; }
        for (const [caller, cs] of graph) if (cs.has(u.name) && !own.has(caller)) { own.delete(u.name); whyNot.get(u.name)?.add(`called by ${caller}, outside the core`); changed = true; break; } // a caller outside the core would call with the other convention
      }
    }
    core = own;
    for (const u of order) {
      if (!core.has(u.name)) continue;
      for (const p of u.params) register(shapeOf(typeOf(p.name)));
      register(shapeOf(checker.getSignatureFromDeclaration(u.fn).getReturnType()));
      const w = (n) => { if (ts.isArrayLiteralExpression(n) || ts.isObjectLiteralExpression(n) || ts.isIdentifier(n) || ts.isPropertyAccessExpression(n)) register(shapeOf(typeOf(n))); ts.forEachChild(n, w); };
      w(u.body);
    }
    return core;
  }
  const isCore = (u) => core.has(u.name);

  // ----- the prelude: Ref, Obj, HWorld, the well-formedness hypothesis, total reads and writes -----
  function prelude() {
    if (!core.size) return [];
    const keys = [...shapes.keys()].sort();
    const fld = (name) => `${dn(name)}_f`; // a record field's destructor: suffixed, so a field named items, heap or next never meets the array constructor's items
    const ctor = (k) => { const s = shapes.get(k); return s.kind === 'arr' ? `${k}(items_${k}: seq<${valD(s.elem)}>)` : s.kind === 'set' ? `${k}(items_${k}: seq<${valD(s.elem)}>)` : s.kind === 'map' ? `${k}(entries_${k}: seq<Entry_${k}>)` : `${k}(${s.fields.map((f) => `${fld(f.name)}: ${valD(f.shape)}`).join(', ')})`; };
    const out = [];
    out.push('type Ref = nat');
    for (const k of keys) { const s = shapes.get(k); if (s.kind === 'map') out.push(`datatype Entry_${k} = Entry_${k}(k: ${valD(s.k)}, v: ${valD(s.v)})`); }
    out.push(`datatype Obj = ${keys.length ? keys.map(ctor).join(' | ') + ' | ' : ''}Dead`);
    out.push('datatype HWorld = HWorld(heap: map<Ref, Obj>, next: nat)');
    for (const k of keys) out.push(`predicate Is${k}(hw: HWorld, r: Ref) { r in hw.heap && hw.heap[r].${k}? }`);
    const cellOk = (k) => { const s = shapes.get(k); const conds = []; if (s.kind === 'arr') { if (s.elem.kind !== 'prim') conds.push(`(forall i :: 0 <= i < |o.items_${k}| ==> Is${keyOf(s.elem)}(hw, o.items_${k}[i]))`); } else if (s.kind === 'set') { /* primitive items */ } else if (s.kind === 'map') { if (s.v.kind !== 'prim') conds.push(`(forall i :: 0 <= i < |o.entries_${k}| ==> Is${keyOf(s.v)}(hw, o.entries_${k}[i].v))`); } else for (const f of s.fields) if (f.shape.kind !== 'prim') conds.push(`Is${keyOf(f.shape)}(hw, o.${fld(f.name)})`); return conds.length ? conds.join(' && ') : 'true'; };
    out.push(`predicate WFCell(hw: HWorld, o: Obj) { match o ${keys.map((k) => `case ${k}(${(shapes.get(k).kind === 'rec' ? shapes.get(k).fields.map(() => '_') : ['_']).join(', ')}) => ${cellOk(k)}`).join(' ')} case Dead => false }`);
    out.push('predicate WF(hw: HWorld) { (forall r :: r in hw.heap ==> r < hw.next) && (forall r :: r in hw.heap ==> WFCell(hw, hw.heap[r])) }');
    if (!isReal && keys.some((k) => shapes.get(k).kind === 'arr')) out.push(LIBRARY.helpers.Clamp); // the index clamp of slice and splice
    for (const k of keys) {
      const s = shapes.get(k);
      const ps = s.kind === 'arr' || s.kind === 'set' ? [`items: seq<${valD(s.elem)}>`] : s.kind === 'map' ? [`entries: seq<Entry_${k}>`] : s.fields.map((f) => `${fld(f.name)}: ${valD(f.shape)}`);
      const args = s.kind === 'arr' || s.kind === 'set' ? ['items'] : s.kind === 'map' ? ['entries'] : s.fields.map((f) => fld(f.name));
      out.push(`function Alloc_${k}(hw: HWorld, ${ps.join(', ')}): (HWorld, Ref) { (HWorld(hw.heap[hw.next := ${k}(${args.join(', ')})], hw.next + 1), hw.next) }`);
      if (s.kind === 'arr') {
        const E = valD(s.elem);
        out.push(`function Len_${k}(hw: HWorld, r: Ref): ${NUM} { if Is${k}(hw, r) then |hw.heap[r].items_${k}|${isReal ? ' as real' : ''} else ${isReal ? '0.0' : '0'} }`);
        out.push(`function Items_${k}(hw: HWorld, r: Ref): seq<${E}> { if Is${k}(hw, r) then hw.heap[r].items_${k} else [] }`);
        for (const op of Object.values(ARRAY_ROWS)) { const row = LIB_ROW[op]; if (!row || row.status !== 'generated') throw new Error(`library table: ${op} has no generated form`); if ((op.endsWith('.splice') || op.endsWith('.slice')) && isReal) continue; out.push(instantiate(row.dafny, k, E)); } // the table's forms, per shape
        out.push(instantiate(LIBRARY.helpers['Rev_<K>'], k, E));
        out.push(instantiate(LIBRARY.helpers['Keep_<K>'], k, E)); out.push(instantiate(LIB_ROW['Array.prototype.filter'].dafny, k, E));
        for (const inst of mapInstances) { const [k1, k2] = inst.split('|'); if (k1 === k && shapes.has(k2)) out.push(instantiate(LIB_ROW['Array.prototype.map'].dafny, k, E, null, k2, valD(shapes.get(k2).elem))); }
      } else if (s.kind === 'map') {
        const KT = valD(s.k), E = valD(s.v);
        for (const h of ['SetEntry_<K>', 'Lookup_<K>', 'RemoveKey_<K>']) out.push(instantiate(LIBRARY.helpers[h], k, E, KT));
        for (const op of ['Map.prototype.set', 'Map.prototype.get', 'Map.prototype.has', 'Map.prototype.delete']) out.push(instantiate(LIB_ROW[op].dafny, k, E, KT));
        out.push(`function MapSize_${k}(hw: HWorld, r: Ref): ${NUM} { if Is${k}(hw, r) then |hw.heap[r].entries_${k}|${isReal ? ' as real' : ''} else ${isReal ? '0.0' : '0'} }`);
      } else if (s.kind === 'set') {
        const E = valD(s.elem);
        out.push(instantiate(LIBRARY.helpers['RemoveItem_<K>'], k, E));
        for (const op of ['Set.prototype.add', 'Set.prototype.has', 'Set.prototype.delete']) out.push(instantiate(LIB_ROW[op].dafny, k, E));
        out.push(`function SetSize_${k}(hw: HWorld, r: Ref): ${NUM} { if Is${k}(hw, r) then |hw.heap[r].items_${k}|${isReal ? ' as real' : ''} else ${isReal ? '0.0' : '0'} }`);
      } else {
        for (const f of s.fields) {
          const F = dn(f.name), T = valD(f.shape);
          out.push(`function Get_${k}_${F}(hw: HWorld, r: Ref): ${T} { if Is${k}(hw, r) then hw.heap[r].${fld(f.name)} else ${dflt(f.shape)} }`);
          out.push(`function Set_${k}_${F}(hw: HWorld, r: Ref, v: ${T}): HWorld { if Is${k}(hw, r) then hw.(heap := hw.heap[r := hw.heap[r].(${fld(f.name)} := v)]) else hw }`);
        }
      }
    }
    return out;
  }

  // ----- emission -----
  function emit(u) {
    let temp = 0;
    const lines = []; // hoisted let lines of the region being built
    const fresh = (p) => `${p}${temp++}_`;
    const sig = checker.getSignatureFromDeclaration(u.fn);
    const rt = shapeOf(sig.getReturnType());
    const shapeExpr = (e) => shapeOf(typeOf(e));
    const strEsc = (s) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
    const num = (text) => { const t = text.replace(/_/g, ''); if (/^0[xob]/i.test(t)) return String(Number(t)) + (isReal ? '.0' : ''); return isReal && !t.includes('.') ? `${t}.0` : t; };
    function expr(e0) {
      const e = unparen(e0);
      if (ts.isIdentifier(e)) return dn(e.text);
      if (ts.isNumericLiteral(e)) return num(e.text);
      if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return strEsc(e.text);
      if (e.kind === K.TrueKeyword) return 'true';
      if (e.kind === K.FalseKeyword) return 'false';
      if (ts.isPropertyAccessExpression(e)) {
        const s = shapeExpr(e.expression);
        const r = expr(e.expression);
        if (s.kind === 'arr') return `Len_${s.key}(${HW}, ${r})`;
        if (s.kind === 'map') return `MapSize_${s.key}(${HW}, ${r})`;
        if (s.kind === 'set') return `SetSize_${s.key}(${HW}, ${r})`;
        return `Get_${s.key}_${dn(e.name.text)}(${HW}, ${r})`;
      }
      if (ts.isNewExpression(e) && ts.isIdentifier(e.expression) && (e.expression.text === 'Map' || e.expression.text === 'Set')) { const s = shapeExpr(e); const r = fresh('r'); lines.push(`var (${HW}, ${r}) := Alloc_${s.key}(${HW}, []);`); return r; }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && e.expression.name.text === 'has') { const s = shapeExpr(e.expression.expression); const r = expr(e.expression.expression); return `${s.kind === 'map' ? 'MapHas' : 'SetHas'}_${s.key}(${HW}, ${r}, ${expr(e.arguments[0])})`; }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && (e.expression.name.text === 'map' || e.expression.name.text === 'filter') && ts.isArrowFunction(e.arguments[0])) {
        const s = shapeExpr(e.expression.expression); const r = expr(e.expression.expression); const cb = e.arguments[0]; const x = cb.parameters[0].name.text; const xs = shapeOf(typeOf(cb.parameters[0].name));
        const body = expr(cb.body); const lam = `((${dn(x)}: ${valD(xs)}) => ${body})`; const out = fresh('r');
        if (e.expression.name.text === 'filter') { lines.push(`var (${HW}, ${out}) := Filter_${s.key}(${HW}, ${r}, ${lam});`); return out; }
        const rs = shapeExpr(e); mapInstances.add(`${s.key}|${rs.key}`);
        lines.push(`var (${HW}, ${out}) := Map_${s.key}_${rs.key}(${HW}, ${r}, ${lam});`); return out;
      }
      if (ts.isPrefixUnaryExpression(e)) return e.operator === K.ExclamationToken ? `!(${expr(e.operand)})` : `(-(${expr(e.operand)}))`;
      if (ts.isBinaryExpression(e)) {
        const op = { [K.PlusToken]: '+', [K.MinusToken]: '-', [K.LessThanToken]: '<', [K.LessThanEqualsToken]: '<=', [K.GreaterThanToken]: '>', [K.GreaterThanEqualsToken]: '>=', [K.EqualsEqualsEqualsToken]: '==', [K.ExclamationEqualsEqualsToken]: '!=', [K.AmpersandAmpersandToken]: '&&', [K.BarBarToken]: '||' }[e.operatorToken.kind];
        const l = expr(e.left), r = expr(e.right); // source order: the left operand's allocations come first
        return `(${l} ${op} ${r})`;
      }
      if (ts.isArrayLiteralExpression(e)) {
        const s = shapeExpr(e);
        const parts = e.elements.map((x) => (ts.isSpreadElement(x) ? `Items_${shapeExpr(x.expression).key}(${HW}, ${expr(x.expression)})` : `[${expr(x)}]`));
        const items = parts.length ? parts.join(' + ') : `[]`;
        const r = fresh('r'); lines.push(`var (${HW}, ${r}) := Alloc_${s.key}(${HW}, ${items});`); return r;
      }
      if (ts.isObjectLiteralExpression(e)) {
        const s = shapeExpr(e);
        const given = new Map(); let base = null, baseShape = null;
        for (const p of e.properties) {
          if (ts.isSpreadAssignment(p)) { baseShape = shapeExpr(p.expression); base = expr(p.expression); given.clear(); }
          else if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) given.set(p.name.text, expr(p.initializer));
          else if (ts.isShorthandPropertyAssignment(p)) given.set(p.name.text, dn(p.name.text));
        }
        const args = s.fields.map((f) => (given.has(f.name) ? given.get(f.name) : base !== null ? `Get_${baseShape.key}_${dn(f.name)}(${HW}, ${base})` : (() => { throw new Error(`heap: field ${f.name} not given`); })()));
        const r = fresh('r'); lines.push(`var (${HW}, ${r}) := Alloc_${s.key}(${HW}, ${args.join(', ')});`); return r;
      }
      if (sameFileCall(e)) {
        const args = e.arguments.map((a) => expr(a));
        const r = fresh('c'); lines.push(`var (${HW}, ${r}) := ${fname(e.expression.text)}(${[HW, ...args].join(', ')});`); return r;
      }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && ['slice', 'concat', 'reverse', 'splice'].includes(e.expression.name.text)) {
        const s = shapeExpr(e.expression.expression); const r = expr(e.expression.expression);
        return libCall(e, s, r);
      }
      throw new Error(`heap: unsupported expression ${e.getText(sf)}`);
    }
    // a call of a table row that yields a reference: Slice_/Concat_/Splice_ allocate (a fresh ref), Reverse_ returns the receiver
    function libCall(e, s, r) {
      const m = e.expression.name.text; const out = fresh('r');
      if (m === 'slice') { const a = e.arguments[0] ? expr(e.arguments[0]) : '0'; const b = e.arguments[1] ? expr(e.arguments[1]) : `Len_${s.key}(${HW}, ${r})`; lines.push(`var (${HW}, ${out}) := Slice_${s.key}(${HW}, ${r}, ${a}, ${b});`); return out; }
      if (m === 'concat') { const q = expr(e.arguments[0]); lines.push(`var (${HW}, ${out}) := Concat_${s.key}(${HW}, ${r}, ${q});`); return out; }
      if (m === 'reverse') { lines.push(`var (${HW}, ${out}) := Reverse_${s.key}(${HW}, ${r});`); return out; }
      if (m === 'splice') { const a = expr(e.arguments[0]), d = expr(e.arguments[1]); const ins = e.arguments.slice(2).map((x) => `[${expr(x)}]`); lines.push(`var (${HW}, ${out}) := Splice_${s.key}(${HW}, ${r}, ${a}, ${d}, ${ins.length ? ins.join(' + ') : `[]`});`); return out; }
      throw new Error(`heap: no table row for .${m}`);
    }
    function assign(target0, valueCode) {
      const target = unparen(target0);
      if (ts.isIdentifier(target)) { lines.push(`var ${dn(target.text)} := ${valueCode};`); return; }
      const s = shapeExpr(target.expression); const r = expr(target.expression);
      lines.push(`var ${HW} := Set_${s.key}_${dn(target.name.text)}(${HW}, ${r}, ${valueCode});`);
    }
    const flush = () => lines.splice(0).join('\n');
    const indent = (t) => t.split('\n').map((l) => '  ' + l).join('\n');
    function stmts(list) {
      const out = [];
      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        if (ts.isVariableStatement(s)) { for (const d of s.declarationList.declarations) { const v = expr(d.initializer); lines.push(`var ${dn(d.name.text)} := ${v};`); } out.push(flush()); continue; }
        if (ts.isReturnStatement(s)) { const v = expr(s.expression); const pre = flush(); out.push(`${pre ? pre + '\n' : ''}(${HW}, ${v})`); return out.filter(Boolean).join('\n'); }
        if (ts.isIfStatement(s)) {
          const c = expr(s.expression); const pre = flush();
          const t = stmts(block(s.thenStatement));
          const rest = s.elseStatement ? stmts(block(s.elseStatement)) : stmts(list.slice(i + 1));
          out.push(`${pre ? pre + '\n' : ''}if ${c} then\n${indent(t)}\nelse\n${indent(rest)}`);
          return out.filter(Boolean).join('\n');
        }
        const e = unparen(s.expression);
        if (ts.isBinaryExpression(e)) {
          const op = e.operatorToken.kind;
          if (op === K.EqualsToken) { const v = expr(e.right); assign(e.left, v); }
          else { const cur = expr(e.left); const v = expr(e.right); assign(e.left, `(${cur} ${op === K.PlusEqualsToken ? '+' : '-'} ${v})`); }
          out.push(flush()); continue;
        }
        if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && ['set', 'add', 'delete'].includes(e.expression.name.text) && ['map', 'set'].includes(shapeExpr(e.expression.expression)?.kind)) { // cell statements
          const sc = shapeExpr(e.expression.expression); const r = expr(e.expression.expression); const m = e.expression.name.text; const args = e.arguments.map((a) => expr(a));
          if (sc.kind === 'map' && m === 'set') { const d = fresh('d'); lines.push(`var (${HW}, ${d}) := MapSet_${sc.key}(${HW}, ${r}, ${args.join(', ')});`); }
          else if (sc.kind === 'set' && m === 'add') { const d = fresh('d'); lines.push(`var (${HW}, ${d}) := SetAdd_${sc.key}(${HW}, ${r}, ${args[0]});`); }
          else lines.push(`var ${HW} := ${sc.kind === 'map' ? 'MapDelete' : 'SetDelete'}_${sc.key}(${HW}, ${r}, ${args[0]});`);
          out.push(flush()); continue;
        }
        if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && MUTATORS.has(e.expression.name.text)) {
          const s2 = shapeExpr(e.expression.expression); const r = expr(e.expression.expression); const m = e.expression.name.text;
          if (m === 'reverse' || m === 'splice') { libCall(e, s2, r); out.push(flush()); continue; } // the result (the receiver, a fresh array) is dropped
          const args = (m === 'pop' || m === 'shift') ? [HW, r] : [HW, r, expr(e.arguments[0])];
          lines.push(`var ${HW} := ${m[0].toUpperCase() + m.slice(1)}_${s2.key}(${args.join(', ')});`);
          out.push(flush()); continue;
        }
        expr(e); out.push(flush()); // a same-file call as a statement: its heap effect
      }
      throw new Error('heap: a path ends without a return');
    }
    const body = stmts([...u.body.statements]);
    const params = u.params.map((p) => `${dn(p.name.text)}: ${valD(shapeOf(typeOf(p.name)))}`);
    const hyp = [`WF(${HW})`, ...u.params.map((p) => { const s = shapeOf(typeOf(p.name)); return s.kind === 'prim' ? null : `Is${s.key}(${HW}, ${dn(p.name.text)})`; }).filter(Boolean)].join(' && ');
    const text = [`function ${fname(u.name)}(${[`${HW}: HWorld`, ...params].join(', ')}): (HWorld, ${valD(rt)})`, '{', indent(body), '}'].join('\n');
    return { text, hyp };
  }
  const shapeLegend = () => [...shapes.keys()].sort().map((k) => { const s = shapes.get(k); return `${k} = ${s.kind === 'arr' ? `[${keyOf(s.elem)}]` : s.kind === 'set' ? `Set<${keyOf(s.elem)}>` : s.kind === 'map' ? `Map<${keyOf(s.k)}, ${keyOf(s.v)}>` : `{${s.fields.map((f) => `${f.name}: ${keyOf(f.shape)}`).join(', ')}}`}`; }).join('; ');
  const whyNotOf = (name) => [...(whyNot.get(name) ?? [])];

  // ----- the exposure of references, layer 1, measured per unit -----
  // Layer 1 reads an object as a value tree and a mutated parameter as an output. SEMANTICS item 2 observes the graph:
  // every object reachable before the call, field by field, after it, and the result up to a renaming of fresh objects.
  // Tree equality is weaker than graph equality exactly where a unit (a) writes through a nested reference path of an
  // input (the old inner object differs from a fresh replacement), or (b) returns a value that may hold an input
  // reference or share a reference twice (the same tree, another graph). A unit with neither is one layer 1 reads
  // soundly under item 2. This reports the two classes; it changes no verdict.
  const isRefType = (t) => nonNull(t).some((x) => (x.flags & TF.Object) && !x.getCallSignatures().length) || nonNull(t).some((x) => x.flags & (TF.Any | TF.Unknown));
  const rootOf = (x) => { x = unparen(x); while (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x) || ts.isNonNullExpression(x) || ts.isParenthesizedExpression(x)) x = x.expression; return x; };
  const depth = (x) => { let d = 0; x = unparen(x); while (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x) || ts.isNonNullExpression(x) || ts.isParenthesizedExpression(x)) { if (!ts.isParenthesizedExpression(x) && !ts.isNonNullExpression(x)) d++; x = x.expression; } return d; };
  function layer1Risk(u) {
    const risks = new Set();
    const params = new Set(u.params.map((p) => (ts.isIdentifier(p.name) ? p.name.text : null)).filter(Boolean));
    const aliases = new Map(); // local -> the depth of the input path it was bound to (`c = p` is 0, `c = p.inner` is 1)
    const inputRooted = (x) => { const r = rootOf(x); return (ts.isIdentifier(r) && (params.has(r.text) || aliases.has(r.text))) || r.kind === K.ThisKeyword; };
    const effDepth = (x) => { const r = rootOf(x); return depth(x) + (ts.isIdentifier(r) && aliases.has(r.text) ? aliases.get(r.text) : 0); }; // the depth of a write below its input root, aliases unfolded
    const fresh = (e) => { // a tree whose reference-typed parts are all literals: no input reference, no shared reference
      e = unparen(e);
      if (!isRefType(typeOf(e))) return true;
      if (ts.isObjectLiteralExpression(e)) return e.properties.every((p) => (ts.isPropertyAssignment(p) ? fresh(p.initializer) : ts.isShorthandPropertyAssignment(p) ? fresh(p.name) : ts.isSpreadAssignment(p) ? spreadFresh(p.expression) : false));
      if (ts.isArrayLiteralExpression(e)) return e.elements.every((x) => (ts.isSpreadElement(x) ? spreadFresh(x.expression) : fresh(x)));
      if (ts.isConditionalExpression(e)) return fresh(e.whenTrue) && fresh(e.whenFalse);
      if (ts.isTemplateExpression(e) || ts.isStringLiteral(e) || ts.isNumericLiteral(e)) return true;
      return false;
    };
    const spreadFresh = (src) => { // spreading copies the source's reference-typed members: fresh only when it has none
      const t = typeOf(src); const s = shapeOf(t);
      if (checker.isArrayType(nonNull(t)[0] ?? t)) { const el = checker.getTypeArguments(nonNull(t)[0])[0]; return !!el && !isRefType(el); }
      if (!s || s.kind !== 'rec') return false;
      return s.fields.every((f) => f.shape.kind === 'prim');
    };
    const walk = (n) => {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && isRefType(typeOf(n.name)) && inputRooted(n.initializer) && (ts.isIdentifier(unparen(n.initializer)) || ts.isPropertyAccessExpression(unparen(n.initializer)) || unparen(n.initializer).kind === K.ThisKeyword)) aliases.set(n.name.text, effDepth(n.initializer));
      if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment) {
        const L = unparen(n.left);
        if ((ts.isPropertyAccessExpression(L) || ts.isElementAccessExpression(L)) && inputRooted(L)) { if (effDepth(L) >= 2) risks.add('nested write through an input'); else if (n.operatorToken.kind === K.EqualsToken && isRefType(typeOf(n.right)) && !fresh(n.right)) risks.add('input field assigned a reference'); }
      }
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && MUTATORS_ALL.has(n.expression.name.text) && inputRooted(n.expression.expression)) { const recv = unparen(n.expression.expression); if (effDepth(recv) >= 1) risks.add('nested write through an input'); }
      if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && (n.operator === K.PlusPlusToken || n.operator === K.MinusMinusToken)) { const L = unparen(n.operand); if ((ts.isPropertyAccessExpression(L) || ts.isElementAccessExpression(L)) && inputRooted(L) && effDepth(L) >= 2) risks.add('nested write through an input'); }
      if (ts.isReturnStatement(n) && n.expression && !fresh(n.expression)) risks.add('result may carry an input or shared reference');
      if (ts.isArrowFunction(n) && !ts.isBlock(n.body) && n.parent && ts.isCallExpression(n.parent) === false && n === u.fn.body) { /* unreachable: units with expression bodies are handled below */ }
      ts.forEachChild(n, walk);
    };
    if (ts.isBlock(u.body)) walk(u.body); else { walk(u.body); if (!fresh(u.body)) risks.add('result may carry an input or shared reference'); }
    return [...risks];
  }
  const MUTATORS_ALL = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin', 'set', 'add', 'delete', 'clear']);

  // ----- identity skeletons: where tree equality would imply graph equality -----
  // For a unit with no nested write through an input, the graph of its result is fixed by the identity of every
  // reference node of the result: an input path (`p`, `p.tags`), a fresh literal (numbered per binding, so a local used
  // twice is one shared node), or unknown (a call's result, a method's result, an element of an input array). When
  // every return site has a skeleton with no unknown node, and the two versions' skeletons agree site by site, a
  // value-tree equality proved by layer 1 is a graph equality under SEMANTICS item 2. This measures determinacy; the
  // cross-side comparison is the theorem's, not yet written.
  function identitySkeleton(u) {
    const params = new Set(u.params.map((p) => (ts.isIdentifier(p.name) ? p.name.text : null)).filter(Boolean));
    const bound = new Map(); // local -> its skeleton term, when its initializer has one
    let freshId = 0;
    const path = (e) => { // an input path as a string, or null
      e = unparen(e);
      if (e.kind === K.ThisKeyword) return 'this';
      if (ts.isIdentifier(e)) return params.has(e.text) ? e.text : bound.has(e.text) ? bound.get(e.text) : null;
      if (ts.isPropertyAccessExpression(e)) { const b = path(e.expression); return typeof b === 'string' ? `${b}.${e.name.text}` : null; }
      if (ts.isNonNullExpression(e)) return path(e.expression);
      return null;
    };
    const term = (e) => { // the skeleton of a reference-typed expression; a non-reference expression is a leaf
      e = unparen(e);
      if (!isRefType(typeOf(e))) return '.';
      const pth = path(e); if (pth !== null) return typeof pth === 'string' ? (/^[#@(]/.test(pth) ? pth : `@${pth}`) : pth; // a bound local carries its own term; an input path gets the @ mark
      if (ts.isObjectLiteralExpression(e)) {
        const parts = [];
        for (const p of e.properties) {
          if (ts.isPropertyAssignment(p) && !ts.isComputedPropertyName(p.name)) parts.push(`${p.name.getText(sf)}:${term(p.initializer)}`);
          else if (ts.isShorthandPropertyAssignment(p)) parts.push(`${p.name.text}:${term(p.name)}`);
          else if (ts.isSpreadAssignment(p)) { const src = path(p.expression); const s = shapeOf(typeOf(p.expression)); if (!spreadFreshOrPath(p.expression, s)) return null; parts.push(src === null ? '...fresh' : `...${typeof src === 'string' ? '@' + src : src}`); }
          else return null;
        }
        return `#${freshId++}{${parts.join(',')}}`;
      }
      if (ts.isArrayLiteralExpression(e)) {
        const parts = [];
        for (const x of e.elements) { if (ts.isSpreadElement(x)) { if (!spreadFreshOrPath(x.expression, null)) return null; const src = path(x.expression); parts.push(src === null ? '...fresh' : `...${typeof src === 'string' ? '@' + src : src}`); } else { const tm = term(x); if (tm === null) return null; parts.push(tm); } }
        return `#${freshId++}[${parts.join(',')}]`;
      }
      if (ts.isConditionalExpression(e)) { const a = term(e.whenTrue), b = term(e.whenFalse); return a === null || b === null ? null : `(?${a}:${b})`; }
      if (ts.isJsxElement(e) || ts.isJsxSelfClosingElement(e) || ts.isJsxFragment(e)) { // an element is a fresh node: its attributes and children are its parts
        const open = ts.isJsxElement(e) ? e.openingElement : ts.isJsxFragment(e) ? null : e;
        const parts = [];
        if (open) for (const a of open.attributes.properties) {
          if (ts.isJsxSpreadAttribute(a)) { const tm = term(a.expression); if (tm === null) return null; parts.push(`...${tm}`); }
          else if (ts.isJsxAttribute(a)) { const init = a.initializer; if (!init) { parts.push(`${a.name.getText(sf)}:.`); continue; } if (ts.isJsxExpression(init)) { if (!init.expression) continue; const tm = term(init.expression); if (tm === null) return null; parts.push(`${a.name.getText(sf)}:${tm}`); } else parts.push(`${a.name.getText(sf)}:.`); }
        }
        const kids = ts.isJsxSelfClosingElement(e) ? [] : e.children;
        for (const c of kids) {
          if (ts.isJsxText(c)) { if (c.text.trim()) parts.push('.'); continue; }
          if (ts.isJsxExpression(c)) { if (!c.expression) continue; const tm = term(c.expression); if (tm === null) return null; parts.push(tm); continue; }
          const tm = term(c); if (tm === null) return null; parts.push(tm);
        }
        const tag = open ? open.tagName.getText(sf) : '';
        return `#${freshId++}<${tag}>{${parts.join(',')}}`;
      }
      if (ts.isTemplateExpression(e)) return '.';
      if (ts.isNewExpression(e)) { const parts = []; for (const a of e.arguments ?? []) { const tm = term(a); if (tm === null) return null; parts.push(tm); } return `#${freshId++}new<${e.expression.getText(sf)}>(${parts.join(',')})`; } // a construction is a fresh node whose parts are its arguments: a constructor may keep what it is handed
      return null; // a call, a method result, an element read: the identity is not visible here
    };
    const spreadFreshOrPath = (src, s) => { // spreading copies members: fine when they are primitive, or when the source is an input path (its members are that path's members)
      const t = typeOf(src);
      const arrT = nonNull(t)[0] ?? t;
      if (checker.isArrayType(arrT)) { const el = checker.getTypeArguments(arrT)[0]; if (el && !isRefType(el)) return true; return path(src) !== null; }
      const sh = s ?? shapeOf(t);
      if (sh && sh.kind === 'rec' && sh.fields.every((f) => f.shape.kind === 'prim')) return true;
      return path(src) !== null;
    };
    const canon = (s) => { if (s === null) return null; const ids = new Map(); return s.replace(/#(\d+)/g, (m, d) => { if (!ids.has(d)) ids.set(d, ids.size); return `#${ids.get(d)}`; }); };
    const sites = [], writes = []; let nestedWrite = false; // nestedWrite: a write through an input whose target path could not be read
    const paramsOrThis = (x) => { const r = rootOf(x); return (ts.isIdentifier(r) && params.has(r.text)) || r.kind === K.ThisKeyword || (ts.isIdentifier(r) && bound.has(r.text)); };
    // a local written after its binding (a mutator, an assignment through it, a let rebound) has no fixed skeleton
    const written = new Set();
    const scan = (n) => {
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && MUTATORS_ALL.has(n.expression.name.text)) { const r = rootOf(n.expression.expression); if (ts.isIdentifier(r)) written.add(r.text); }
      if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment) { const r = rootOf(n.left); if (ts.isIdentifier(r)) written.add(r.text); }
      if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && (n.operator === K.PlusPlusToken || n.operator === K.MinusMinusToken)) { const r = rootOf(n.operand); if (ts.isIdentifier(r)) written.add(r.text); }
      ts.forEachChild(n, scan);
    };
    scan(u.body);
    const walk = (n) => {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && isRefType(typeOf(n.name)) && (n.parent.flags & ts.NodeFlags.Const) && !written.has(n.name.text)) { const tm = term(n.initializer); if (tm !== null) bound.set(n.name.text, tm); }
      if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment) {
        const L = unparen(n.left);
        if ((ts.isPropertyAccessExpression(L) || ts.isElementAccessExpression(L)) && paramsOrThis(L)) {
          const pth = ts.isPropertyAccessExpression(L) ? path(L) : null;
          if (pth === null || typeof pth !== 'string') nestedWrite = true; // an element write or an unreadable path
          else if (isRefType(typeOf(n.right))) { const tm = n.operatorToken.kind === K.EqualsToken ? term(n.right) : null; if (tm === null) nestedWrite = true; else writes.push(`@${pth}:=${tm}`); }
          else writes.push(`@${pth}:=.`);
        }
      }
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && MUTATORS_ALL.has(n.expression.name.text) && paramsOrThis(n.expression.expression)) {
        const pth = path(n.expression.expression);
        if (typeof pth !== 'string') nestedWrite = true;
        else { const args = n.arguments.map((a) => (isRefType(typeOf(a)) ? term(a) : '.')); if (args.some((a) => a === null)) nestedWrite = true; else writes.push(`@${pth}.${n.expression.name.text}(${args.join(',')})`); }
      }
      if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && (n.operator === K.PlusPlusToken || n.operator === K.MinusMinusToken)) { const L = unparen(n.operand); if ((ts.isPropertyAccessExpression(L) || ts.isElementAccessExpression(L)) && paramsOrThis(L)) { const pth = ts.isPropertyAccessExpression(L) ? path(L) : null; if (typeof pth !== 'string') nestedWrite = true; else writes.push(`@${pth}:=.`); } }
      if (ts.isReturnStatement(n) && n.expression) sites.push(term(n.expression));
      if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) return; // a nested function's returns are its own
      ts.forEachChild(n, walk);
    };
    if (ts.isBlock(u.body)) walk(u.body); else sites.push(term(u.body));
    const cs = sites.map(canon), cw = writes.map(canon);
    // one identity for the result whatever path runs: every site the same skeleton, every conditional both branches the same
    const oneSite = cs.length > 0 && cs.every((s) => s !== null && s === cs[0] && !/\(\?/.test(s) || (s !== null && s === cs[0] && condAgrees(s)));
    const determinate = !nestedWrite && oneSite && cw.every((w) => w !== null);
    return { determinate, nestedWrite, sites: cs, writes: cw };
  }
  // a conditional skeleton `(?a:b)` fixes the identity only when a and b are the same skeleton
  function condAgrees(s) { let ok = true; s.replace(/\(\?([^()]*):([^()]*)\)/g, (m, a, b) => { if (a !== b) ok = false; return m; }); return ok && !/\(\?[^()]*\(/.test(s); }
  // the identity guard's input for a layer-1 unit: is the value reading exposed, and what identity shape does the unit have
  function guard(u) {
    let exposed = [], sk = { determinate: false, sites: [], writes: [] };
    try { exposed = layer1Risk(u); } catch (e) { exposed = [`unreadable: ${String(e.message).slice(0, 80)}`]; }
    if (exposed.length) { try { sk = identitySkeleton(u); } catch (e) { sk = { determinate: false, sites: [], writes: [], error: String(e.message).slice(0, 80) }; } }
    return { exposed, determinate: !!sk.determinate, sites: sk.sites ?? [], writes: sk.writes ?? [] };
  }
  return { plan, isCore, emit, prelude, shapes, shapeLegend, core: () => core, whyNot: whyNotOf, layer1Risk, identitySkeleton, guard };
}
