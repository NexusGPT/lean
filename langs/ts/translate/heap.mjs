// References, layer 2: the heap core of the proof lane (`--heap`).
//
// A unit in the heap core reads and writes plain records and arrays through one heap in a heap world:
//   type Ref = nat
//   datatype Obj = R_<shape>(f1: .., f2: ..) | A_<elem>(items: seq<..>) | Dead      (one constructor per shape used)
//   datatype HWorld = HWorld(heap: map<Ref, Obj>, next: nat, oob: bool)
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
const instantiate = (form, k, E, KT = null, k2 = null, E2 = null) => form.replace(/<K2>/g, k2 ?? '').replace(/<E2>/g, E2 ?? '').replace(/<KT>/g, KT ?? '').replace(/<K>/g, k).replace(/<E>/g, E).replace(/\.items\b/g, `.items_${k}`).replace(/\.keys\b/g, `.keys_${k}`).replace(/\.m\b/g, `.m_${k}`); // the table writes `.items`, `.keys`, `.m`; the prelude suffixes them with the shape and `.entries`; each shape has its own destructor

export const HW = 'hw_';
const OBJECT_PROTO = Object.getOwnPropertyNames(Object.prototype).sort(); // the keys `in` finds on an ordinary object it does not own

export function makeHeap({ ts, checker, sf, fns, dn, fname, isReal, recursive, typeOf: typeOfIn = null, suffix = '' }) {
  const TF = ts.TypeFlags, K = ts.SyntaxKind;
  const NUM = isReal ? 'real' : 'int';
  const shapes = new Map(); // key -> shape
  const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 8);
  const nonNull = (t) => (t.flags & TF.Union ? t.types.filter((x) => !(x.flags & (TF.Undefined | TF.Null))) : [t]);

  // ----- shapes: structural, so an alias and the anonymous type it names are one constructor -----
  function shapeOf(t, depth = 0) {
    if (!t || depth > 6) return null;
    if (t.flags & TF.BooleanLike) return { kind: 'prim', d: 'bool' }; // `boolean` is the union true | false: one shape
    if (t.flags & TF.Union) { // a primitive that may be absent: `T | undefined` (an optional field or parameter) or `T | null`, never both
      const absent = t.types.filter((x) => x.flags & (TF.Undefined | TF.Null | TF.Void));
      if (!absent.length) { const l = literals(t.types); if (l) return l; }
      if (absent.length) {
        const kinds = new Set(absent.map((x) => (x.flags & TF.Null ? 'n' : 'u'))); if (kinds.size !== 1) return null;
        const rest = t.types.filter((x) => !absent.includes(x));
        const inner = rest.length && rest.every((x) => x.flags & TF.BooleanLiteral) ? { kind: 'prim', d: 'bool' } : rest.length === 1 ? shapeOf(rest[0], depth) : literals(rest);
        if (!inner || inner.kind !== 'prim') return null; // an absent reference is not read here
        const a = [...kinds][0]; return { kind: 'opt', inner, absent: a, key: `O${a}_${inner.d}` };
      }
    }
    const parts = nonNull(t);
    if (parts.length !== 1) return null;
    t = parts[0];
    if ((t.flags & TF.TypeParameter) && t.isThisType) { t = checker.getBaseConstraintOfType(t); if (!t) return null; } // `this` in an instance method: the class's instance type
    if (t.flags & TF.NumberLike) return { kind: 'prim', d: NUM };
    if (t.flags & TF.StringLike) return { kind: 'prim', d: 'string' };
    if (t.flags & TF.BooleanLike) return { kind: 'prim', d: 'bool' };
    if (checker.isArrayType(t)) { const e = shapeOf(checker.getTypeArguments(t)[0], depth + 1); return e && e.kind !== 'opt' ? { kind: 'arr', elem: e, key: `A_${keyOf(e)}` } : null; }
    const symName = t.symbol?.name;
    if (symName === 'Map' && checker.getTypeArguments(t).length === 2) { const [kt, vt] = checker.getTypeArguments(t); const k = shapeOf(kt, depth + 1), v = shapeOf(vt, depth + 1); return k && k.kind === 'prim' && v && v.kind !== 'opt' ? { kind: 'map', k, v, key: `M_${keyOf(k)}_${keyOf(v)}` } : null; } // a Map cell: insertion-ordered entries, keys primitive (SameValueZero on primitives is ==)
    if (symName === 'Date') return { kind: 'date', key: 'D' }; // a Date cell: its time value; getTime and the UTC getters read it, a setter keeps the unit out of the core (it reads the host's time zone)
    if (symName === 'Set' && checker.getTypeArguments(t).length === 1) { const e = shapeOf(checker.getTypeArguments(t)[0], depth + 1); return e && e.kind === 'prim' ? { kind: 'set', elem: e, key: `S_${keyOf(e)}` } : null; } // a Set cell of primitives
    const cd = classDeclOf(t); if (cd) return instanceShape(cd, depth); // an instance of a class of this file: the record of its fields
    if ((t.flags & TF.Object) && !t.getCallSignatures().length && checker.getIndexInfoOfType(t, ts.IndexKind.String) && !checker.getIndexInfoOfType(t, ts.IndexKind.Number) && !checker.getPropertiesOfType(t).length) { const v = shapeOf(checker.getIndexInfoOfType(t, ts.IndexKind.String).type, depth + 1); return v && v.kind === 'prim' ? { kind: 'dict', v, key: `Dk_${v.d}` } : null; } // a dictionary `Record<string, T>` of primitives: insertion-ordered keys beside a map, and whether its prototype is Object.prototype
    if (t.flags & TF.Object) {
      if (t.getCallSignatures().length || t.getConstructSignatures().length) return null;
      const props = checker.getPropertiesOfType(t);
      if (!props.length) return null;
      const fields = [];
      for (const p of props) {
        if (p.flags & (ts.SymbolFlags.Method | ts.SymbolFlags.Accessor)) return null; // an optional field is a primitive that may be absent (its type holds undefined)
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
  // `'a' | 'b'` or `1 | 2`: the primitive with its values (`values`); the shape key is the primitive's, so a field of a
  // literal union and a field of its primitive are one constructor (one object may be seen through both types)
  function literals(types) {
    if (types.length < 2 || types.some((x) => x.flags & TF.EnumLiteral)) return null;
    if (types.every((x) => x.flags & TF.StringLiteral)) return { kind: 'prim', d: 'string', values: types.map((x) => x.value).sort() };
    if (types.every((x) => x.flags & TF.NumberLiteral) && types.every((x) => Number.isInteger(x.value) && x.value >= 0)) return { kind: 'prim', d: NUM, values: types.map((x) => x.value).sort((a, b) => a - b) }; // non-negative integers: the int reading writes them as they are
    return null;
  }
  // a class of this file read as a record: its instance fields (declared, or constructor parameter properties), each
  // initialized where it is declared or by a top-level `this.f = ..` of the constructor, each of a shape. Its methods live
  // on the prototype, not in the cell, so the cell is the record of its fields and the shape key is the record's: a plain
  // record of the same fields may be the same object. A class that extends another, is abstract, generic, decorated, or
  // is extended in the file is no record here (a subclass's override would change what `this.m()` runs).
  function classDeclOf(t) {
    if (!t || !(t.flags & TF.Object) || t.getCallSignatures().length || t.getConstructSignatures().length) return null;
    const d = t.symbol?.declarations?.find((x) => ts.isClassDeclaration(x));
    return d && d.name && d.getSourceFile() === sf ? d : null;
  }
  function classWhy(cd) {
    if (cd.heritageClauses?.some((h) => h.token === K.ExtendsKeyword)) return 'extends a class';
    if (cd.typeParameters?.length) return 'generic class';
    if (cd.modifiers?.some((m) => m.kind === K.AbstractKeyword || m.kind === K.Decorator)) return 'abstract or decorated class';
    if (sf.statements.some((st) => ts.isClassDeclaration(st) && st !== cd && st.heritageClauses?.some((h) => h.token === K.ExtendsKeyword && h.types.some((x) => ts.isIdentifier(x.expression) && x.expression.text === cd.name.text)))) return 'class extended in the file';
    const ctor = cd.members.find((m) => ts.isConstructorDeclaration(m) && m.body);
    const assigned = new Set((ctor?.body.statements ?? []).map((st) => (ts.isExpressionStatement(st) && ts.isBinaryExpression(st.expression) && st.expression.operatorToken.kind === K.EqualsToken && ts.isPropertyAccessExpression(st.expression.left) && st.expression.left.expression.kind === K.ThisKeyword ? st.expression.left.name.text : null)).filter(Boolean));
    let n = 0;
    for (const m of cd.members) {
      if (ts.isPropertyDeclaration(m)) {
        if (m.modifiers?.some((x) => x.kind === K.StaticKeyword)) continue;
        if (!ts.isIdentifier(m.name)) return 'field name form';
        if (m.exclamationToken) return `field ${m.name.text}: definite`;
        if (m.questionToken) { n++; continue; } // starts missing
        if (m.modifiers?.some((x) => x.kind === K.Decorator || x.kind === K.DeclareKeyword)) return `field ${m.name.text}: decorated or declared`;
        if (!m.initializer && !assigned.has(m.name.text)) return `field ${m.name.text}: not initialized`;
        n++;
      } else if (ts.isIndexSignatureDeclaration(m)) return 'index signature';
    }
    for (const p of ctor?.parameters ?? []) if (ts.isParameterPropertyDeclaration?.(p, ctor) || p.modifiers?.some((x) => [K.PublicKeyword, K.PrivateKeyword, K.ProtectedKeyword, K.ReadonlyKeyword].includes(x.kind))) { if (!ts.isIdentifier(p.name) || p.questionToken || p.initializer) return 'parameter property form'; n++; }
    return n ? null : 'no fields';
  }
  function instanceShape(cd, depth) {
    if (classWhy(cd)) return null;
    const ctor = cd.members.find((m) => ts.isConstructorDeclaration(m) && m.body);
    const decls = [...cd.members.filter((m) => ts.isPropertyDeclaration(m) && !m.modifiers?.some((x) => x.kind === K.StaticKeyword)), ...(ctor?.parameters ?? []).filter((p) => p.modifiers?.some((x) => [K.PublicKeyword, K.PrivateKeyword, K.ProtectedKeyword, K.ReadonlyKeyword].includes(x.kind)))];
    const fields = [];
    for (const m of decls) { const ft = checker.getTypeAtLocation(m.name); if (ft.getCallSignatures().length) return null; const s = shapeOf(ft, depth + 1); if (!s) return null; fields.push({ name: m.name.text, shape: s }); }
    fields.sort((a, b) => (a.name < b.name ? -1 : 1));
    return { kind: 'rec', fields, key: `R_${hash(fields.map((f) => `${f.name}:${keyOf(f.shape)}`).join(','))}` };
  }
  const keyOf = (s) => (s.kind === 'prim' ? s.d : s.key);
  // a value: a primitive, a reference, or Option<primitive> (None is the type's one absent value); a record field that
  // may be undefined is a Pres<primitive>: PMissing (no key), PUndef (the key holds undefined) or PVal(v), since a key's
  // presence is observed (`in`, spread, the reachable graph) and a missing key is not a key holding undefined
  const valD = (s) => (s.kind === 'prim' ? s.d : s.kind === 'opt' ? `Option<${s.inner.d}>` : 'Ref');
  const fieldD = (s) => (s.kind === 'opt' && s.absent === 'u' ? `Pres<${s.inner.d}>` : valD(s));
  const isRefShape = (s) => s.kind !== 'prim' && s.kind !== 'opt'; // a field or element that is an edge of the heap graph
  let optUsed = false; // the Option and Pres helpers are written when a core unit or a shape needs them
  const dflt = (s) => (s.kind === 'prim' ? (s.d === 'string' ? '""' : s.d === 'bool' ? 'false' : isReal ? '0.0' : '0') : s.kind === 'opt' ? `Option<${s.inner.d}>.None` : '0');
  const fieldDflt = (s) => (s.kind === 'opt' && s.absent === 'u' ? `Pres<${s.inner.d}>.PMissing` : dflt(s));
  function register(s) { if (!s || s.kind === 'prim') return; if (s.kind === 'opt') { optUsed = true; return; } if (!shapes.has(s.key)) { shapes.set(s.key, s); if (s.kind === 'arr' || s.kind === 'set') register(s.elem); else if (s.kind === 'map') register(s.v); else if (s.kind === 'rec') for (const f of s.fields) register(f.shape); } }
  const dateGetters = new Set(); // the UTC getters a core unit reads: each a bodiless function of the time value in the prelude
  const mapInstances = new Set(); // 'K|K2' pairs of Array.prototype.map seen in the core, each its own Map_K_K2
  const typeOf = typeOfIn ?? ((n) => checker.getTypeAtLocation(n)); // the translator's reading of a node's type (its explicit-operand overrides included)
  const fieldOf = (s, name) => (s.kind === 'rec' ? s.fields.find((f) => f.name === name) : null);
  // an object literal takes the shape of the place it is written to (a `{ age: undefined }` literal's own type has no
  // shape), when that type is a record holding every key the literal writes
  const litShape = (e) => { const c = shapeOf(checker.getContextualType(e)); if (c && c.kind === 'rec' && e.properties.every((p) => !p.name || !ts.isIdentifier(p.name) || fieldOf(c, p.name.text))) return c; return shapeOf(typeOf(e)); };

  // ----- the core, by syntax -----
  const MUTATORS = new Set(['push', 'unshift', 'pop', 'shift', 'reverse', 'splice', 'sort']); // in-place array operations of the table, as statements
  const MUTATOR_ARITY = { push: [1, 1], unshift: [1, 1], pop: [0, 0], shift: [0, 0], reverse: [0, 0], splice: [2, Infinity], sort: [1, 1] }; // splice: start, delete count, then insertions; sort: the comparator
  const isAssignCall = (e) => ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && ts.isIdentifier(e.expression.expression) && e.expression.expression.text === 'Object' && e.expression.name.text === 'assign'; // Object.assign(t, s) as a statement: the table's Assign_ row on same-shape records
  const BINOPS = new Set([K.PlusToken, K.MinusToken, K.LessThanToken, K.LessThanEqualsToken, K.GreaterThanToken, K.GreaterThanEqualsToken, K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.AmpersandAmpersandToken, K.BarBarToken]);
  const unparen = (e) => { while (ts.isParenthesizedExpression(e)) e = e.expression; return e; };
  const cbBody = (cb) => (!ts.isBlock(cb.body) ? cb.body : cb.body.statements.length === 1 && ts.isReturnStatement(cb.body.statements[0]) && cb.body.statements[0].expression ? cb.body.statements[0].expression : null); // `(x) => e` or `(x) => { return e; }`
  // the string rows of the table read as pure functions of their operands: trim and replace (a string pattern) are
  // bodiless, the same on both sides; join of strings is the exact fold, join of numbers bodiless (it formats them)
  const strCall = (e) => { if (!ts.isCallExpression(e) || !ts.isPropertyAccessExpression(e.expression) || e.questionDotToken) return null; const m = e.expression.name.text, recv = typeOf(e.expression.expression); const str = (x) => !!(typeOf(x).flags & TF.StringLike);
    if (m === 'trim' && (recv.flags & TF.StringLike) && !e.arguments.length) return 'trim';
    if (m === 'replace' && (recv.flags & TF.StringLike) && e.arguments.length === 2 && e.arguments.every(str)) return 'replace';
    if (m === 'join' && e.arguments.length <= 1 && e.arguments.every(str)) { const sh = shapeOf(recv); if (sh && sh.kind === 'arr' && sh.elem.kind === 'prim' && sh.elem.d !== 'bool') return 'join'; }
    return null; };
  const strUsed = new Set();
  const isAbsent = (x) => { x = unparen(x); return x.kind === K.NullKeyword || (ts.isIdentifier(x) && x.text === 'undefined' && !(checker.getSymbolAtLocation(x)?.valueDeclaration?.getSourceFile() === sf)); };
  // an expression with no call, allocation or element access: it reads the heap and nothing else, so reading it eagerly is exact
  const pureExpr = (x) => { x = unparen(x); if (ts.isIdentifier(x) || ts.isNumericLiteral(x) || ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x) || [K.TrueKeyword, K.FalseKeyword, K.ThisKeyword].includes(x.kind)) return true; if (ts.isPropertyAccessExpression(x)) return pureExpr(x.expression); if (ts.isBinaryExpression(x)) return pureExpr(x.left) && pureExpr(x.right); if (ts.isPrefixUnaryExpression(x)) return pureExpr(x.operand); return false; };
  const isBoolT = (t) => !!(t.flags & ts.TypeFlags.BooleanLike); // `&&` and `||` in the core are the boolean connectives; a value on either side is the ordinary translation's mixed logic
  const sameFileCall = (e) => ts.isCallExpression(e) && ts.isIdentifier(e.expression) && fns.has(e.expression.text) && !e.typeArguments;
  // `this.m(..)` in an instance method: the same-file method unit `<Class>.m`, called with `this` as its receiver
  const thisCall = (e, owner) => { if (!owner?.cls || owner.isStatic || owner.isCtor || !ts.isCallExpression(e) || e.typeArguments || !ts.isPropertyAccessExpression(e.expression) || e.expression.expression.kind !== K.ThisKeyword) return null; const name = `${owner.className}.${e.expression.name.text}`; const m = fns.get(name); return m && !m.accessor && !m.isCtor && !m.isStatic ? name : null; };
  const calleeOf = (e, owner) => (sameFileCall(e) ? e.expression.text : thisCall(e, owner)); // the same-file unit a call runs, or null
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
    if (u.isCtor) no('constructor'); else if (u.accessor) no('accessor'); else if (u.cls && u.isStatic) no('static method');
    else if (u.cls) { const w = classWhy(u.cls); if (w) no(`class: ${w}`); else if (!instanceShape(u.cls, 0)) no('class: a field without a shape'); } // an instance method: `this` is a reference to the record of the class's fields
    if (u.fn.asteriskToken || u.isAsync) no('generator or async');
    if (u.generics?.length) no('generic');
    if (recursive.has(u.name)) no('recursive');
    if (!ts.isBlock(u.body)) no('expression body');
    if (!ok) return false;
    const names = new Set(); let lambdaDepth = 0; let usesIndex = false; const loopCalls = new Set();
    // `a[i]` on an array path, `i` a number: the access is read through Idx_/SetIdx_ and marks the world when out of range
    // a condition is read by its truthiness: a boolean, a number (not 0), a string (not ""), a value that may be absent
    const checkCond = (c) => { const sh = shapeOf(typeOf(c)); if (!sh || !(sh.kind === 'prim' || sh.kind === 'opt')) return no('condition on a reference'); if ((sh.kind === 'prim' ? sh.d : sh.inner.d) === 'real') return no('truthiness of a real (NaN is falsy)'); return checkExpr(c); };
    // undefined or null where a value that may be absent is expected: an assignment, an initializer, a return, an
    // argument, a field of a literal (the contextual type says so)
    const absentOk = (e) => shapeOf(checker.getContextualType(e))?.kind === 'opt';
    const targetShape = (t) => { t = unparen(t); if (ts.isIdentifier(t)) { const d = checker.getSymbolAtLocation(t)?.valueDeclaration; return d && ts.isIdentifier(d.name) ? shapeOf(typeOf(d.name)) : null; } if (ts.isPropertyAccessExpression(t)) { const sh = shapeOf(typeOf(t.expression)); return sh ? fieldOf(sh, t.name.text)?.shape ?? null : null; } return null; };
    const elementWhy = (e) => { if (lambdaDepth) return 'element access inside a callback'; if (e.questionDotToken) return 'element access form'; const s = shapeOf(typeOf(e.expression)); if (s && s.kind === 'dict') return typeOf(e.argumentExpression).flags & TF.StringLike ? null : 'dictionary key type'; if (!s || s.kind !== 'arr') return 'element access of a non-array'; if (!(typeOf(e.argumentExpression).flags & TF.NumberLike)) return 'element index type'; if (isReal) return 'element index in a real file (a non-integer index reads a property, not an element)'; const a = unparen(e.argumentExpression); if (ts.isPrefixUnaryExpression(a) && a.operator === K.MinusToken) return 'negative element index (it reads a property, not an element)'; return null; };
    for (const p of u.params) { if (ts.isIdentifier(p.name) && /_$/.test(p.name.text)) no('name ending in an underscore (the generated names do)'); else if (!ts.isIdentifier(p.name) || p.name.text === 'this' || p.initializer || p.dotDotDotToken) no('parameter form'); else if (!shapeOf(typeOf(p.name))) no(`parameter type: ${shapeWhy(typeOf(p.name))}`); else names.add(p.name.text); }
    const rt = checker.getSignatureFromDeclaration(u.fn)?.getReturnType();
    if (!rt || !shapeOf(rt)) no(`return type: ${shapeWhy(rt)}`);
    if (!ok) return false;
    const declaredInside = (id) => { const s = checker.getSymbolAtLocation(id); const d = s?.valueDeclaration ?? s?.declarations?.[0]; return !!d && d.getSourceFile() === sf && d.pos >= u.fn.pos && d.end <= u.fn.end; };
    const checkExpr = (e0) => {
      if (!ok) return;
      const e = unparen(e0);
      if (isAbsent(e)) return absentOk(e) ? undefined : no('undefined or null outside an optional place');
      if (ts.isIdentifier(e)) { if (e.text === HW) no('name hw_'); else if (!declaredInside(e)) no(`outside name ${e.text}`); else if (!shapeOf(typeOf(e))) no(`value type: ${shapeWhy(typeOf(e))}`); return; }
      if (ts.isNumericLiteral(e) || ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e) || e.kind === K.TrueKeyword || e.kind === K.FalseKeyword) return;
      if (e.kind === K.ThisKeyword) return u.cls && !u.isStatic ? undefined : no('this');
      if ((ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e) || ts.isCallExpression(e)) && e.questionDotToken) return no('optional chaining');
      if (ts.isPropertyAccessExpression(e) && lambdaDepth && fieldOf(shapeOf(typeOf(e.expression)) ?? {}, e.name.text)?.shape.kind === 'opt' && shapeOf(typeOf(e))?.kind !== 'opt') return no('a narrowed optional read inside a callback');
      if (ts.isPropertyAccessExpression(e)) {
        const s = shapeOf(typeOf(e.expression)); if (!s) return no(`receiver type: ${shapeWhy(typeOf(e.expression))}`);
        if (s.kind === 'arr' ? e.name.text !== 'length' : (s.kind === 'map' || s.kind === 'set') ? e.name.text !== 'size' : !fieldOf(s, e.name.text)) return no(`property ${e.name.text}`);
        if (s.kind === 'rec' && fieldOf(s, e.name.text).shape.kind === 'opt' && shapeOf(typeOf(e))?.kind !== 'opt') usesIndex = true; // a narrowed read: its lemma shows the value is there
        return checkExpr(e.expression);
      }
      if (ts.isNewExpression(e) && ts.isIdentifier(e.expression) && (e.expression.text === 'Map' || e.expression.text === 'Set') && !(e.arguments ?? []).length) { if (!shapeOf(typeOf(e))) return no(`new ${e.expression.text} type: ${shapeWhy(typeOf(e))}`); return; } // an empty cell
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && e.expression.name.text === 'has' && e.arguments.length === 1) { const s = shapeOf(typeOf(e.expression.expression)); if (!s || (s.kind !== 'map' && s.kind !== 'set')) return no('has on a non-cell'); checkExpr(e.expression.expression); return checkExpr(e.arguments[0]); }
      if (ts.isNewExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'Date') { if ((e.arguments ?? []).length !== 1 || !(typeOf(e.arguments[0]).flags & TF.NumberLike)) return no('new Date form (one time value; no argument is the clock, a string is parsing)'); if (!shapeOf(typeOf(e))) return no('new Date type'); return checkExpr(e.arguments[0]); }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && shapeOf(typeOf(e.expression.expression))?.kind === 'date') { const g = e.expression.name.text; if (e.arguments.length) return no('date method with arguments'); if (!(g === 'getTime' || g === 'valueOf' || /^getUTC(FullYear|Month|Date|Day|Hours|Minutes|Seconds|Milliseconds)$/.test(g))) return no(`date method ${g} (a local-time getter reads the host's time zone; a setter writes it)`); return checkExpr(e.expression.expression); }
      if (ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'structuredClone' && e.arguments.length === 1) { const s = shapeOf(typeOf(e.arguments[0])); if (!s || s.kind === 'prim') return no('clone of a non-cell'); const flat = s.kind === 'rec' ? s.fields.every((f) => f.shape.kind === 'prim') : s.kind === 'arr' ? s.elem.kind === 'prim' : true; if (!flat) return no('clone of a nested graph (one level of a plain cell only)'); return checkExpr(e.arguments[0]); }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && (e.expression.name.text === 'map' || e.expression.name.text === 'filter') && e.arguments.length === 1 && ts.isArrowFunction(e.arguments[0])) { // the table's map and filter rows: a pure one-parameter arrow with an expression body
        const s = shapeOf(typeOf(e.expression.expression)); if (!s || s.kind !== 'arr') return no(`${e.expression.name.text} of a non-array`);
        const cb = e.arguments[0]; if (cb.parameters.length !== 1 || !ts.isIdentifier(cb.parameters[0].name) || !cbBody(cb) || cb.modifiers?.length) return no('callback form');
        if (e.expression.name.text === 'map') { const rs = shapeOf(typeOf(e)); if (!rs || rs.kind !== 'arr') return no(`map result type: ${shapeWhy(typeOf(e))}`); }
        const x = cb.parameters[0].name.text; if (names.has(x) || x === HW) return no('name reused'); if (!shapeOf(typeOf(cb.parameters[0].name))) return no('callback parameter type');
        checkExpr(e.expression.expression); names.add(x); lambdaDepth++; checkExpr(cbBody(cb)); lambdaDepth--; names.delete(x); return;
      }
      if (ts.isBinaryExpression(e) && e.operatorToken.kind === K.QuestionQuestionToken) { // a ?? b: the left a value that may be absent, the right pure (it is read whatever the left holds)
        if (shapeOf(typeOf(e.left))?.kind !== 'opt') return no('?? on a value that is never absent'); if (!pureExpr(e.right)) return no('?? with a right side that calls or allocates'); if (!shapeOf(typeOf(e))) return no('?? result type'); checkExpr(e.left); return checkExpr(e.right);
      }
      if (ts.isBinaryExpression(e) && [K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.EqualsEqualsToken, K.ExclamationEqualsToken].includes(e.operatorToken.kind) && (isAbsent(e.left) || isAbsent(e.right))) { // a presence test
        const other = isAbsent(e.left) ? e.right : e.left; if (isAbsent(other)) return no('absent compared to absent'); if (shapeOf(typeOf(other))?.kind !== 'opt') return no('presence test of a value that is never absent'); return checkExpr(other);
      }
      if (ts.isBinaryExpression(e) && e.operatorToken.kind === K.InKeyword) { if (shapeOf(typeOf(e.right))?.kind !== 'dict' || !(typeOf(e.left).flags & TF.StringLike)) return no('in on a non-dictionary'); checkExpr(e.left); return checkExpr(e.right); }
      if (ts.isBinaryExpression(e)) { if (!BINOPS.has(e.operatorToken.kind)) return no(`operator ${e.operatorToken.getText(sf)}`); if ((e.operatorToken.kind === K.AmpersandAmpersandToken || e.operatorToken.kind === K.BarBarToken) && !(isBoolT(typeOf(e.left)) && isBoolT(typeOf(e.right)))) return no('logic on values'); if (e.operatorToken.kind === K.PlusToken && !((typeOf(e.left).flags & TF.NumberLike) && (typeOf(e.right).flags & TF.NumberLike)) && !((typeOf(e.left).flags & TF.StringLike) && (typeOf(e.right).flags & TF.StringLike))) return no('mixed + (a number joined to a string converts it)'); checkExpr(e.left); checkExpr(e.right); return; }
      if (ts.isPrefixUnaryExpression(e)) { if (e.operator !== K.ExclamationToken) return no('prefix operator (a negation can make a negative zero the int reading does not see)'); return checkCond(e.operand); }
      if ((ts.isArrayLiteralExpression(e) || ts.isObjectLiteralExpression(e) || ts.isNewExpression(e)) && lambdaDepth) return no('allocation inside a callback');
      if (ts.isArrayLiteralExpression(e)) { if (!shapeOf(typeOf(e))) return no(`array literal type: ${shapeWhy(typeOf(e))}`); for (const x of e.elements) checkExpr(ts.isSpreadElement(x) ? x.expression : x); return; }
      if (ts.isObjectLiteralExpression(e) && litShape(e)?.kind === 'dict') return e.properties.length ? no('dictionary literal with keys') : undefined; // `{}`: an empty dictionary of Object.prototype
      if (ts.isObjectLiteralExpression(e)) {
        const s = litShape(e); if (!s || s.kind !== 'rec') return no(`object literal type: ${shapeWhy(typeOf(e))}`);
        const given = new Set(); let spread = false;
        for (const p of e.properties) {
          if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) { given.add(p.name.text); checkExpr(p.initializer); }
          else if (ts.isShorthandPropertyAssignment(p)) { given.add(p.name.text); checkExpr(p.name); }
          else if (ts.isSpreadAssignment(p)) { spread = true; const ss = shapeOf(typeOf(p.expression)); if (!ss || ss.kind !== 'rec') return no('spread of a non-record'); if (s.fields.some((f) => { const g = fieldOf(ss, f.name); return g && fieldD(g.shape) !== fieldD(f.shape); })) return no('spread of a field another way'); checkExpr(p.expression); }
          else return no('object member form');
        }
        if (!spread && s.fields.some((f) => !given.has(f.name) && !(f.shape.kind === 'opt' && f.shape.absent === 'u'))) return no('object literal misses a field'); // an optional field may be missing
        return;
      }
      if (calleeOf(e, u)) { for (const a of e.arguments) checkExpr(a); return; }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && ['slice', 'concat', 'reverse', 'splice'].includes(e.expression.name.text)) { // the table's rows that yield a reference: a fresh array (slice, concat, splice) or the receiver (reverse)
        const m = e.expression.name.text; const s = shapeOf(typeOf(e.expression.expression)); if (!s || s.kind !== 'arr') return no(`${m} of a non-array`);
        if ((m === 'slice' || m === 'splice') && isReal) return no(`${m} index in a real file`);
        if (m === 'slice' && e.arguments.length > 2) return no('slice arity');
        if (m === 'reverse' && e.arguments.length !== 0) return no('reverse arity');
        if (m === 'splice' && e.arguments.length < 2) return no('splice arity');
        if (m === 'concat') { if (e.arguments.length !== 1) return no('concat arity'); const q = shapeOf(typeOf(e.arguments[0])); if (!q || q.kind !== 'arr' || q.key !== s.key) return no('concat of a different shape'); }
        checkExpr(e.expression.expression); for (const a of e.arguments) checkExpr(a); return;
      }
      if (strCall(e)) { checkExpr(e.expression.expression); for (const a of e.arguments) checkExpr(a); return; }
      if (ts.isCallExpression(e)) return no(ts.isPropertyAccessExpression(e.expression) ? `call .${e.expression.name.text}` : 'call outside the file');
      if (ts.isElementAccessExpression(e)) { const why = elementWhy(e); if (why) return no(why); if (!safeIndex.has(e)) usesIndex = true; checkExpr(e.expression); return checkExpr(e.argumentExpression); }
      no(`expression ${K[e.kind]}`);
    };
    const checkTarget = (t0) => {
      const t = unparen(t0);
      if (ts.isIdentifier(t)) return checkExpr(t);
      if (ts.isElementAccessExpression(t)) { const why = elementWhy(t); if (why) return no(why.replace('element access', 'element write')); if (!safeIndex.has(t) && shapeOf(typeOf(t.expression)).kind !== 'dict') usesIndex = true; checkExpr(t.expression); return checkExpr(t.argumentExpression); }
      if (ts.isPropertyAccessExpression(t)) { const s = shapeOf(typeOf(t.expression)); if (!s || s.kind !== 'rec' || !fieldOf(s, t.name.text)) return no('write target'); return checkExpr(t.expression); }
      no(ts.isElementAccessExpression(t) ? 'element write' : 'write target');
    };
    // a loop over an array: `for (const x of a)`, or `for (let i = 0; i < a.length; i++)` over an array name. Its body
    // takes the core's statements and an `if` that does not return; nothing in it grows an array (the helper's measure
    // is the length at entry), returns, breaks or continues. An element read a[i] of the index loop is in range by the
    // guard when nothing in the body can shrink an array: it reads without the out-of-range mark (safeIndex).
    const checkLoop = (s, outer) => {
      const loop = outer ?? { calls: new Set() };
      if (ts.isForOfStatement(s)) {
        if (s.awaitModifier) return no('for await');
        const dl = s.initializer; if (!ts.isVariableDeclarationList(dl) || dl.declarations.length !== 1 || !ts.isIdentifier(dl.declarations[0].name) || dl.declarations[0].initializer) return no('loop binding form');
        const sh = shapeOf(typeOf(s.expression)); if (!sh || sh.kind !== 'arr') return no('for-of over a non-array');
        const x = dl.declarations[0].name.text; if (names.has(x) || /_$/.test(x)) return no('name reused'); if (!shapeOf(typeOf(dl.declarations[0].name))) return no('loop element type');
        if (bodyAssigns(s.statement, x)) return no('loop element assigned');
        checkExpr(s.expression); names.add(x);
      } else if (ts.isForStatement(s)) {
        const f = indexLoop(s); if (!f) return no('loop form (for (let i = 0; i < a.length; i++) over an array name)');
        if (isReal) return no('index loop in a real file');
        if (names.has(f.i) || /_$/.test(f.i)) return no('name reused');
        if (bodyAssigns(s.statement, f.i) || bodyAssigns(s.statement, f.a)) return no('loop index or array assigned in the body');
        checkExpr(s.condition.right.expression); names.add(f.i);
        let shrinks = false; const w = (n) => { if (ts.isCallExpression(n) && (calleeOf(n, u) || (ts.isPropertyAccessExpression(n.expression) && ['pop', 'shift', 'splice'].includes(n.expression.name.text)))) shrinks = true; ts.forEachChild(n, w); }; w(s.statement);
        if (!shrinks) { const m = (n) => { if (ts.isElementAccessExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === f.a && ts.isIdentifier(n.argumentExpression) && n.argumentExpression.text === f.i) safeIndex.add(n); ts.forEachChild(n, m); }; m(s.statement); }
      } else return no(`statement ${K[s.kind]}`);
      checkStmts(block(s.statement), loop);
      if (!outer) for (const c of loop.calls) loopCalls.add(c);
    };
    const checkStmts = (list, loop = null) => {
      for (let i = 0; i < list.length && ok; i++) {
        const s = list[i];
        if (ts.isForOfStatement(s) || ts.isForStatement(s)) { checkLoop(s, loop); continue; }
        if (loop && (ts.isReturnStatement(s) || ts.isBreakStatement(s) || ts.isContinueStatement(s))) return no(ts.isReturnStatement(s) ? 'return inside a loop' : 'break or continue');
        if (loop && ts.isIfStatement(s)) { checkCond(s.expression); checkStmts(block(s.thenStatement), loop); if (s.elseStatement) checkStmts(block(s.elseStatement), loop); continue; }
        if (loop && ts.isExpressionStatement(s)) { const e = unparen(s.expression); if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && (['push', 'unshift'].includes(e.expression.name.text) || (e.expression.name.text === 'splice' && e.arguments.length > 2)) && shapeOf(typeOf(e.expression.expression))?.kind === 'arr') return no('loop body grows an array'); const c = calleeOf(e, u); if (c) loop.calls.add(c); }
        if (ts.isVariableStatement(s)) {
          for (const d of s.declarationList.declarations) { if (!ts.isIdentifier(d.name) || !d.initializer) return no('binding form'); if (d.name.text === HW || names.has(d.name.text)) return no('name reused'); if (/_$/.test(d.name.text)) return no('name ending in an underscore (the generated names do)'); if (!shapeOf(typeOf(d.name))) return no(`local type: ${shapeWhy(typeOf(d.name))}`); names.add(d.name.text); checkExpr(d.initializer); }
          continue;
        }
        if (ts.isReturnStatement(s)) { if (!s.expression) return no('bare return'); if (i !== list.length - 1) return no('statement after return'); return checkExpr(s.expression); }
        if (ts.isIfStatement(s)) {
          checkCond(s.expression);
          const t = block(s.thenStatement); checkStmts(t); if (!endsWithReturn(t)) return no('if branch without return');
          if (s.elseStatement) { const el = block(s.elseStatement); checkStmts(el); if (!endsWithReturn(el)) return no('if branch without return'); if (i !== list.length - 1) return no('statement after if/else'); }
          continue;
        }
        if (ts.isExpressionStatement(s)) {
          const e = unparen(s.expression);
          if (ts.isBinaryExpression(e) && [K.EqualsToken, K.PlusEqualsToken, K.MinusEqualsToken].includes(e.operatorToken.kind)) { if (e.operatorToken.kind !== K.EqualsToken && targetShape(e.left)?.kind === 'opt') return no('compound write of a value that may be absent'); checkTarget(e.left); checkExpr(e.right); continue; }
          if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && ['set', 'add', 'delete'].includes(e.expression.name.text) && (() => { const sc = shapeOf(typeOf(e.expression.expression)); return sc && (sc.kind === 'map' || sc.kind === 'set'); })()) { // the table's cell rows as statements
            const sc = shapeOf(typeOf(e.expression.expression)); const m = e.expression.name.text;
            if (sc.kind === 'map' ? !((m === 'set' && e.arguments.length === 2) || (m === 'delete' && e.arguments.length === 1)) : !((m === 'add' || m === 'delete') && e.arguments.length === 1)) return no('cell mutator arity');
            checkExpr(e.expression.expression); for (const a of e.arguments) checkExpr(a); continue;
          }
          if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && MUTATORS.has(e.expression.name.text)) {
            const s2 = shapeOf(typeOf(e.expression.expression)); if (!s2 || s2.kind !== 'arr') return no('mutator on a non-array');
            const m = e.expression.name.text; const [lo, hi] = MUTATOR_ARITY[m]; if (e.arguments.length < lo || e.arguments.length > hi) return no('mutator arity');
            if (m === 'splice' && isReal) return no('splice index in a real file');
            if (m === 'sort') { // the comparator: a pure arrow of two parameters of the element shape, a number body
              const cb = e.arguments[0]; if (!ts.isArrowFunction(cb) || cb.parameters.length !== 2 || !cb.parameters.every((p) => ts.isIdentifier(p.name)) || ts.isBlock(cb.body) || cb.modifiers?.length) return no('comparator form');
              const [a, b] = cb.parameters.map((p) => p.name.text); if (a === b || names.has(a) || names.has(b) || a === HW || b === HW) return no('name reused');
              if (!cb.parameters.every((p) => shapeOf(typeOf(p.name)))) return no('comparator parameter type'); if (!(typeOf(cb.body).flags & TF.NumberLike)) return no('comparator result type');
              checkExpr(e.expression.expression); names.add(a); names.add(b); lambdaDepth++; checkExpr(cb.body); lambdaDepth--; names.delete(a); names.delete(b); continue;
            }
            checkExpr(e.expression.expression); for (const a of e.arguments) checkExpr(a); continue;
          }
          if (isAssignCall(e)) { // the table's row: the target's cell takes the source's; same shape only
            if (e.arguments.length !== 2) return no('assign arity'); const st = shapeOf(typeOf(e.arguments[0])), ss = shapeOf(typeOf(e.arguments[1]));
            if (!st || !ss || st.kind !== 'rec' || st.key !== ss.key) return no('assign shapes'); checkExpr(e.arguments[0]); checkExpr(e.arguments[1]); continue;
          }
          if (calleeOf(e, u)) { for (const a of e.arguments) checkExpr(a); continue; }
          return no(ts.isCallExpression(e) ? (ts.isPropertyAccessExpression(e.expression) ? `call .${e.expression.name.text}` : 'call outside the file') : `expression statement ${K[e.kind]}`);
        }
        return no(`statement ${K[s.kind]}`);
      }
    };
    const body = [...u.body.statements];
    checkStmts(body);
    if (!endsWithReturn(body)) no('path without return');
    if (ok && usesIndex) indexUnits.add(u.name);
    if (ok && loopCalls.size) loopCallsOf.set(u.name, loopCalls);
    return ok;
  }
  const indexUnits = new Set(); // units that access an element themselves
  const safeIndex = new WeakSet(); // element accesses a[i] of an index loop that the guard keeps in range
  const loopCallsOf = new Map(); // unit -> the same-file units its loop bodies call
  const bodyAssigns = (n, name) => { let hit = false; const w = (x) => { if (ts.isBinaryExpression(x) && x.operatorToken.kind >= K.FirstAssignment && x.operatorToken.kind <= K.LastAssignment && ts.isIdentifier(unparen(x.left)) && unparen(x.left).text === name) hit = true; if ((ts.isPrefixUnaryExpression(x) || ts.isPostfixUnaryExpression(x)) && [K.PlusPlusToken, K.MinusMinusToken].includes(x.operator) && ts.isIdentifier(unparen(x.operand)) && unparen(x.operand).text === name) hit = true; ts.forEachChild(x, w); }; w(n); return hit; };
  // `for (let i = 0; i < a.length; i++)` (or `++i`, `i += 1`, `i = i + 1`) over an array name: { i, a }, else null
  function indexLoop(s) {
    const init = s.initializer; if (!init || !ts.isVariableDeclarationList(init) || !(init.flags & ts.NodeFlags.Let) || init.declarations.length !== 1) return null;
    const d = init.declarations[0]; if (!ts.isIdentifier(d.name) || !d.initializer || !ts.isNumericLiteral(unparen(d.initializer)) || unparen(d.initializer).text !== '0') return null;
    const i = d.name.text; const c = s.condition && unparen(s.condition);
    if (!c || !ts.isBinaryExpression(c) || c.operatorToken.kind !== K.LessThanToken || !ts.isIdentifier(c.left) || c.left.text !== i || !ts.isPropertyAccessExpression(c.right) || c.right.name.text !== 'length' || !ts.isIdentifier(c.right.expression)) return null;
    const sh = shapeOf(typeOf(c.right.expression)); if (!sh || sh.kind !== 'arr') return null;
    const inc = s.incrementor && unparen(s.incrementor); if (!inc) return null;
    const isI = (x) => ts.isIdentifier(unparen(x)) && unparen(x).text === i; const one = (x) => ts.isNumericLiteral(unparen(x)) && unparen(x).text === '1';
    const ok = ((ts.isPostfixUnaryExpression(inc) || ts.isPrefixUnaryExpression(inc)) && inc.operator === K.PlusPlusToken && isI(inc.operand)) || (ts.isBinaryExpression(inc) && isI(inc.left) && ((inc.operatorToken.kind === K.PlusEqualsToken && one(inc.right)) || (inc.operatorToken.kind === K.EqualsToken && ts.isBinaryExpression(unparen(inc.right)) && unparen(inc.right).operatorToken.kind === K.PlusToken && isI(unparen(inc.right).left) && one(unparen(inc.right).right))));
    return ok ? { i, a: c.right.expression.text } : null;
  }
  // a unit that may grow an array: a push, an unshift or an inserting splice in its text, or a call of one that may
  const growsOwn = (u) => { let g = false; const w = (n) => { if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && (['push', 'unshift'].includes(n.expression.name.text) || (n.expression.name.text === 'splice' && n.arguments.length > 2))) g = true; ts.forEachChild(n, w); }; w(u.body); return g; };
  // why a type has no shape: the first offending part, for the census
  function shapeWhy(t) {
    if (!t) return 'none';
    const parts = nonNull(t);
    if (parts.length !== 1) return parts.length === 0 ? 'null or undefined only' : 'union';
    if (parts.length !== (t.flags & TF.Union ? t.types.length : 1) && !shapeOf(t)) return 'a reference, or null and undefined together, that may be absent'; // never read as present
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
  let inrange = new Set(); // core units whose lemma must also show no element access out of range, on either side
  const callsOf = (u) => { const calls = new Set(); const w = (n) => { const c = calleeOf(n, u); if (c) calls.add(c); else if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) { const cd = classDeclOf(nonNull(checker.getTypeAtLocation(n.expression.expression))[0]); const name = cd && `${cd.name.text}.${n.expression.name.text}`; if (name && fns.has(name)) calls.add(name); } ts.forEachChild(n, w); }; w(u.body); return calls; }; // a call of a method on another instance of a same-file class is an edge too: its caller decides its convention
  function plan(order, only) {
    const own = new Set(order.filter((u) => coreUnit(u) && (!only || only.includes(u.name))).map((u) => u.name));
    // a unit named as a VALUE anywhere (`.then(bump)`, a callback argument, a stored function) keeps its layer-1 signature: out of the core
    const asValue = new Set();
    for (const u of order) { const w = (n) => { if (ts.isPropertyAccessExpression(n) && !(n.parent && ts.isCallExpression(n.parent) && n.parent.expression === n)) { const cd = classDeclOf(nonNull(checker.getTypeAtLocation(n.expression))[0]); const name = cd && `${cd.name.text}.${n.name.text}`; if (name && fns.has(name)) asValue.add(name); } if (ts.isIdentifier(n) && fns.has(n.text) && !(n.parent && ts.isCallExpression(n.parent) && n.parent.expression === n) && !(n.parent && ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) && !(n.parent && (ts.isFunctionDeclaration(n.parent) || ts.isVariableDeclaration(n.parent)) && n.parent.name === n)) asValue.add(n.text); ts.forEachChild(n, w); }; w(u.body); }
    for (const name of asValue) if (own.has(name)) { own.delete(name); whyNot.get(name)?.add('named as a value'); }
    const graph = new Map(order.map((u) => [u.name, callsOf(u)]));
    const grows = new Set(order.filter(growsOwn).map((u) => u.name));
    for (let more = true; more;) { more = false; for (const u of order) if (!grows.has(u.name) && [...graph.get(u.name)].some((c) => grows.has(c))) { grows.add(u.name); more = true; } }
    for (const [name, cs] of loopCallsOf) if (own.has(name) && [...cs].some((c) => grows.has(c))) { own.delete(name); whyNot.get(name)?.add('a loop body calls a unit that may grow an array'); }
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
    inrange = new Set([...indexUnits].filter((n) => core.has(n)));
    for (let grew = true; grew;) { grew = false; for (const u of order) if (core.has(u.name) && !inrange.has(u.name) && [...graph.get(u.name)].some((c) => inrange.has(c))) { inrange.add(u.name); grew = true; } } // a caller of a unit that may access out of range may too
    for (const u of order) {
      if (!core.has(u.name)) continue;
      for (const p of u.params) register(shapeOf(typeOf(p.name)));
      if (u.cls) register(instanceShape(u.cls, 0));
      register(shapeOf(checker.getSignatureFromDeclaration(u.fn).getReturnType()));
      const w = (n) => { if (ts.isArrayLiteralExpression(n) || ts.isIdentifier(n) || ts.isPropertyAccessExpression(n)) register(shapeOf(typeOf(n))); if (ts.isObjectLiteralExpression(n)) register(litShape(n)); ts.forEachChild(n, w); };
      w(u.body);
    }
    return core;
  }
  const isCore = (u) => core.has(u.name);
  const needsInRange = (u) => inrange.has(u.name);

  // ----- the prelude: Ref, Obj, HWorld, the well-formedness hypothesis, total reads and writes -----
  function prelude() {
    if (!core.size) return [];
    const keys = [...shapes.keys()].sort();
    const fld = (name) => `${dn(name)}_f`; // a record field's destructor: suffixed, so a field named items, heap or next never meets the array constructor's items
    const ctor = (k) => { const s = shapes.get(k); if (s.kind === 'dict') return `${k}(keys_${k}: seq<string>, m_${k}: map<string, ${s.v.d}>, proto_${k}: bool)`; return s.kind === 'arr' ? `${k}(items_${k}: seq<${valD(s.elem)}>)` : s.kind === 'set' ? `${k}(items_${k}: seq<${valD(s.elem)}>)` : s.kind === 'map' ? `${k}(keys_${k}: seq<${valD(s.k)}>, m_${k}: map<${valD(s.k)}, ${valD(s.v)}>)` : s.kind === 'date' ? `${k}(tv_${k}: ${NUM})` : `${k}(${s.fields.map((f) => `${fld(f.name)}: ${fieldD(f.shape)}`).join(', ')})`; };
    const out = [];
    out.push('type Ref = nat');
    out.push(`datatype Obj = ${keys.length ? keys.map(ctor).join(' | ') + ' | ' : ''}Dead`);
    out.push('datatype HWorld = HWorld(heap: map<Ref, Obj>, next: nat, oob: bool)'); // oob: an element was accessed out of range (JavaScript reads undefined, or writes a property or a hole): the unit's answer is not modelled from there
    if (optUsed || keys.some((k) => shapes.get(k).kind === 'rec' && shapes.get(k).fields.some((f) => f.shape.kind === 'opt'))) { // a primitive that may be absent
      out.push('datatype Pres<T> = PMissing | PUndef | PVal(pv: T)');
      out.push('function PresOpt<T>(x: Pres<T>): Option<T> { match x case PVal(v) => Option.Some(v) case _ => Option.None }');
      out.push('function OptPres<T>(o: Option<T>): Pres<T> { match o case Some(v) => PVal(v) case None => PUndef }');
      out.push('function OptOr<T>(o: Option<T>, d: T): T { match o case Some(v) => v case None => d }');
      out.push('function OptOrOpt<T>(a: Option<T>, b: Option<T>): Option<T> { if a.Some? then a else b }');
      out.push('function OptMark<T>(hw: HWorld, o: Option<T>): HWorld { if o.Some? then hw else hw.(oob := true) }'); // a narrowed read that finds no value: the program left what the model reads
    }
    for (const k of keys) out.push(`predicate Is${k}(hw: HWorld, r: Ref) { r in hw.heap && hw.heap[r].${k}? }`);
    if (strUsed.has('trim')) out.push('function StrTrim(s: string): string'); // String.prototype.trim: a function of the string alone
    if (strUsed.has('replace')) out.push('function StrReplace(s: string, a: string, b: string): string'); // replace with a string pattern: the first match, the replacement's $ patterns included, a function of the three
    if (strUsed.has('join_string')) out.push('function JoinStr(xs: seq<string>, sep: string): string decreases |xs| { if |xs| == 0 then "" else if |xs| == 1 then xs[0] else xs[0] + sep + JoinStr(xs[1..], sep) }');
    for (const d of ['int', 'real']) if (strUsed.has(`join_${d}`)) out.push(`function JoinNum_${d}(xs: seq<${d}>, sep: string): string`); // numbers are formatted first: bodiless
    if (keys.some((k) => shapes.get(k).kind === 'dict')) out.push(`const ObjectProtoNames: set<string> := {${OBJECT_PROTO.map((x) => JSON.stringify(x)).join(', ')}}`); // Object.getOwnPropertyNames(Object.prototype)
    const cellOk = (k) => { const s = shapes.get(k); const conds = []; if (s.kind === 'arr') { if (s.elem.kind !== 'prim') conds.push(`(forall i :: 0 <= i < |o.items_${k}| ==> Is${keyOf(s.elem)}(hw, o.items_${k}[i]))`); } else if (s.kind === 'set' || s.kind === 'date' || s.kind === 'dict') { /* primitive contents */ } else if (s.kind === 'map') { if (s.v.kind !== 'prim') conds.push(`(forall x :: x in o.m_${k}.Values ==> Is${keyOf(s.v)}(hw, x))`); } else for (const f of s.fields) if (isRefShape(f.shape)) conds.push(`Is${keyOf(f.shape)}(hw, o.${fld(f.name)})`); return conds.length ? conds.join(' && ') : 'true'; };
    out.push(`predicate WFCell(hw: HWorld, o: Obj) { match o ${keys.map((k) => `case ${k}(${(shapes.get(k).kind === 'rec' ? shapes.get(k).fields.map(() => '_') : shapes.get(k).kind === 'map' ? ['_', '_'] : shapes.get(k).kind === 'dict' ? ['_', '_', '_'] : ['_']).join(', ')}) => ${cellOk(k)}`).join(' ')} case Dead => false }`);
    out.push('predicate WF(hw: HWorld) { !hw.oob && (forall r :: r in hw.heap ==> r < hw.next) && (forall r :: r in hw.heap ==> WFCell(hw, hw.heap[r])) }');
    if (!isReal && keys.some((k) => shapes.get(k).kind === 'arr')) out.push(LIBRARY.helpers.Clamp); // the index clamp of slice and splice
    for (const k of keys) {
      const s = shapes.get(k);
      const ps = s.kind === 'dict' ? ['keys: seq<string>', `m: map<string, ${s.v.d}>`, 'proto: bool'] : s.kind === 'arr' || s.kind === 'set' ? [`items: seq<${valD(s.elem)}>`] : s.kind === 'map' ? [`keys: seq<${valD(s.k)}>`, `m: map<${valD(s.k)}, ${valD(s.v)}>`] : s.kind === 'date' ? [`tv: ${NUM}`] : s.fields.map((f) => `${fld(f.name)}: ${fieldD(f.shape)}`);
      const args = s.kind === 'dict' ? ['keys', 'm', 'proto'] : s.kind === 'arr' || s.kind === 'set' ? ['items'] : s.kind === 'map' ? ['keys', 'm'] : s.kind === 'date' ? ['tv'] : s.fields.map((f) => fld(f.name));
      out.push(`function Alloc_${k}(hw: HWorld, ${ps.join(', ')}): (HWorld, Ref) { (HWorld(hw.heap[hw.next := ${k}(${args.join(', ')})], hw.next + 1, hw.oob), hw.next) }`);
      if (s.kind === 'arr') {
        const E = valD(s.elem);
        out.push(`function Len_${k}(hw: HWorld, r: Ref): ${NUM} { if Is${k}(hw, r) then |hw.heap[r].items_${k}|${isReal ? ' as real' : ''} else ${isReal ? '0.0' : '0'} }`);
        out.push(`function Items_${k}(hw: HWorld, r: Ref): seq<${E}> { if Is${k}(hw, r) then hw.heap[r].items_${k} else [] }`);
        if (!isReal) { // element access: in range reads or replaces the item; out of range marks the world and leaves the heap as it is
          out.push(`predicate InRange_${k}(hw: HWorld, r: Ref, i: int) { Is${k}(hw, r) && 0 <= i < |hw.heap[r].items_${k}| }`);
          out.push(`function Oob_${k}(hw: HWorld, r: Ref, i: int): HWorld { if InRange_${k}(hw, r, i) then hw else hw.(oob := true) }`);
          out.push(`function Idx_${k}(hw: HWorld, r: Ref, i: int): ${E} { if InRange_${k}(hw, r, i) then hw.heap[r].items_${k}[i] else ${dflt(s.elem)} }`);
          out.push(`function SetIdx_${k}(hw: HWorld, r: Ref, i: int, v: ${E}): HWorld { if InRange_${k}(hw, r, i) then hw.(heap := hw.heap[r := ${k}(hw.heap[r].items_${k}[i := v])]) else hw.(oob := true) }`);
          out.push(`function SetIdxIn_${k}(hw: HWorld, r: Ref, i: int, v: ${E}): HWorld { if InRange_${k}(hw, r, i) then hw.(heap := hw.heap[r := ${k}(hw.heap[r].items_${k}[i := v])]) else hw }`); // an index loop's own a[i] = v: in range by the loop's guard
        }
        for (const op of Object.values(ARRAY_ROWS)) { const row = LIB_ROW[op]; if (!row || row.status !== 'generated') throw new Error(`library table: ${op} has no generated form`); if ((op.endsWith('.splice') || op.endsWith('.slice')) && isReal) continue; out.push(instantiate(row.dafny, k, E)); } // the table's forms, per shape
        out.push(instantiate(LIBRARY.helpers['Rev_<K>'], k, E));
        out.push(instantiate(LIB_ROW['Array.prototype.sort'].dafny, k, E)); // the extern stable sort and SortPure_
        out.push(instantiate(LIBRARY.helpers['Keep_<K>'], k, E)); out.push(instantiate(LIB_ROW['Array.prototype.filter'].dafny, k, E));
        for (const inst of mapInstances) { const [k1, k2] = inst.split('|'); if (k1 === k && shapes.has(k2)) out.push(instantiate(LIB_ROW['Array.prototype.map'].dafny, k, E, null, k2, valD(shapes.get(k2).elem))); }
      } else if (s.kind === 'map') {
        const KT = valD(s.k), E = valD(s.v);
        out.push(instantiate(LIBRARY.helpers['RemoveKey_<K>'], k, E, KT));
        for (const op of ['Map.prototype.set', 'Map.prototype.get', 'Map.prototype.has', 'Map.prototype.delete']) out.push(instantiate(LIB_ROW[op].dafny, k, E, KT));
        out.push(`function MapSize_${k}(hw: HWorld, r: Ref): ${NUM} { if Is${k}(hw, r) then |hw.heap[r].keys_${k}|${isReal ? ' as real' : ''} else ${isReal ? '0.0' : '0'} }`);
      } else if (s.kind === 'set') {
        const E = valD(s.elem);
        out.push(instantiate(LIBRARY.helpers['RemoveItem_<K>'], k, E));
        for (const op of ['Set.prototype.add', 'Set.prototype.has', 'Set.prototype.delete']) out.push(instantiate(LIB_ROW[op].dafny, k, E));
        out.push(`function SetSize_${k}(hw: HWorld, r: Ref): ${NUM} { if Is${k}(hw, r) then |hw.heap[r].items_${k}|${isReal ? ' as real' : ''} else ${isReal ? '0.0' : '0'} }`);
      } else if (s.kind === 'dict') { // JavaScript's own-key semantics over the ordered map; a key of Object.prototype is read through the prototype bit
        const V = s.v.d;
        out.push(`predicate DictOwn_${k}(hw: HWorld, r: Ref, key: string) { Is${k}(hw, r) && key in hw.heap[r].m_${k} }`);
        out.push(`function DictGet_${k}(hw: HWorld, r: Ref, key: string): ${V} { if DictOwn_${k}(hw, r, key) then hw.heap[r].m_${k}[key] else ${dflt(s.v)} }`);
        out.push(`function DictMark_${k}(hw: HWorld, r: Ref, key: string): HWorld { if DictOwn_${k}(hw, r, key) then hw else hw.(oob := true) }`); // a key it does not own reads undefined, or a function of Object.prototype: neither is modelled
        out.push(`function DictIn_${k}(hw: HWorld, r: Ref, key: string): bool { DictOwn_${k}(hw, r, key) || (Is${k}(hw, r) && hw.heap[r].proto_${k} && key in ObjectProtoNames) }`);
        out.push(`function DictSet_${k}(hw: HWorld, r: Ref, key: string, v: ${V}): HWorld { if !Is${k}(hw, r) then hw else if key == "__proto__" && hw.heap[r].proto_${k} then hw else hw.(heap := hw.heap[r := ${k}(if key in hw.heap[r].m_${k} then hw.heap[r].keys_${k} else hw.heap[r].keys_${k} + [key], hw.heap[r].m_${k}[key := v], hw.heap[r].proto_${k})]) }`); // a primitive written to __proto__ of an ordinary object is ignored by its setter; a new key goes last
      } else if (s.kind === 'date') {
        out.push(`function Get_${k}_tv(hw: HWorld, r: Ref): ${NUM} { if Is${k}(hw, r) then hw.heap[r].tv_${k} else ${isReal ? '0.0' : '0'} }`);
        for (const g of [...dateGetters].sort()) out.push(`function DateUTC_${g}(tv: ${NUM}): ${NUM}`); // a UTC getter is a function of the time value alone (21.4.4): bodiless, the same on both sides
      } else {
        out.push(instantiate(LIB_ROW['Object.assign'].dafny, k, ''));
        for (const f of s.fields) {
          const F = dn(f.name), T = fieldD(f.shape);
          out.push(`function Get_${k}_${F}(hw: HWorld, r: Ref): ${T} { if Is${k}(hw, r) then hw.heap[r].${fld(f.name)} else ${fieldDflt(f.shape)} }`);
          out.push(`function Set_${k}_${F}(hw: HWorld, r: Ref, v: ${T}): HWorld { if Is${k}(hw, r) then hw.(heap := hw.heap[r := hw.heap[r].(${fld(f.name)} := v)]) else hw }`);
        }
      }
    }
    // ----- the canonical heap: the certificate up to a renaming of fresh cells and up to dropped allocations -----
    // theorem.py writes EqualCanon_<f> beside Equal_<f> when this block is present. The two final worlds are canonically
    // equal when: every initial cell (a reference below the initial `next`) agrees, literally or after renaming; the fresh
    // cells, named by first reach from the roots (the reference parameters, then the result), agree after renaming; the
    // roots' names agree; and no fresh reference stays unnamed on either side. Allocation order and an allocation nobody
    // keeps are invisible to it. The naming walk descends every fresh cell, an initial record CanonDepth levels down,
    // never an initial container (its width is symbolic, and the prover unfolds nothing symbolic). A fresh cell the
    // walk does not reach is an unnamed reference, and the certificate fails: never a false proof. Design and the
    // scratch proofs: design/canonical-heap.md.
    const cd = (k, name) => `c_${k}_${name}`;
    const cT = (sh) => (sh.kind === 'prim' ? sh.d : sh.kind === 'opt' ? fieldD(sh) : 'nat');
    const cctor = (k) => { const s = shapes.get(k); if (s.kind === 'dict') return `C${k}(${cd(k, 'keys')}: seq<string>, ${cd(k, 'm')}: map<string, ${s.v.d}>, ${cd(k, 'proto')}: bool)`; return s.kind === 'arr' || s.kind === 'set' ? `C${k}(${cd(k, 'items')}: seq<${cT(s.elem)}>)` : s.kind === 'map' ? `C${k}(${cd(k, 'keys')}: seq<${valD(s.k)}>, ${cd(k, 'm')}: map<${valD(s.k)}, ${cT(s.v)}>)` : s.kind === 'date' ? `C${k}(${cd(k, 'tv')}: ${NUM})` : `C${k}(${s.fields.map((f) => `${cd(k, dn(f.name))}: ${cT(f.shape)}`).join(', ')})`; };
    const arity = (k) => { const s = shapes.get(k); return s.kind === 'rec' ? s.fields.length : s.kind === 'map' ? 2 : s.kind === 'dict' ? 3 : 1; };
    const pat = (k) => `${k}(${Array.from({ length: arity(k) }, (_, i) => `p${i}`).join(', ')})`;
    const edges = (k) => { const s = shapes.get(k); if (s.kind === 'rec') return `[${s.fields.map((f, i) => (!isRefShape(f.shape) ? null : `p${i}`)).filter(Boolean).join(', ')}]`; if (s.kind === 'arr') return s.elem.kind === 'prim' ? '[]' : 'p0'; if (s.kind === 'map') return s.v.kind === 'prim' ? '[]' : `MapEdges_${k}(p0, p1)`; return '[]'; };
    const canonObj = (k) => { const s = shapes.get(k); const nm = (x) => `CanonName(next0, order, ${x})`; if (s.kind === 'dict') return `C${k}(p0, p1, p2)`; if (s.kind === 'rec') return `C${k}(${s.fields.map((f, i) => (!isRefShape(f.shape) ? `p${i}` : nm(`p${i}`))).join(', ')})`; if (s.kind === 'arr') return `C${k}(${s.elem.kind === 'prim' ? 'p0' : 'CanonNames(next0, order, p0)'})`; if (s.kind === 'map') return `C${k}(p0, ${s.v.kind === 'prim' ? 'p1' : 'map kk | kk in p1 :: CanonName(next0, order, p1[kk])'})`; return `C${k}(p0)`; };
    const recs = keys.filter((k) => shapes.get(k).kind === 'rec');
    const mapRefs = keys.filter((k) => shapes.get(k).kind === 'map' && shapes.get(k).v.kind !== 'prim');
    out.push(`// CANON fuel=${['CanonOrder', 'CanonRootEdges', 'CanonCells', 'CanonIndex', 'CanonNames', ...mapRefs.map((k) => `MapEdges_${k}`)].join(',')}`); // the recursive functions the part lemmas unfold (fuel 20: a walk of twenty steps; a three-cell unit needs ten)
    out.push(`datatype CObj = ${keys.length ? keys.map(cctor).join(' | ') + ' | ' : ''}CDead`);
    for (const k of mapRefs) out.push(`function MapEdges_${k}(keys: seq<${valD(shapes.get(k).k)}>, m: map<${valD(shapes.get(k).k)}, Ref>): seq<Ref> decreases |keys| { if |keys| == 0 then [] else (if keys[0] in m then [m[keys[0]]] else []) + MapEdges_${k}(keys[1..], m) }`);
    out.push(`function CanonEdges(o: Obj): seq<Ref> { match o ${keys.map((k) => `case ${pat(k)} => ${edges(k)}`).join(' ')} case Dead => [] }`);
    out.push(`predicate CanonRecord(o: Obj) { ${recs.length ? recs.map((k) => `o.${k}?`).join(' || ') : 'false'} }`);
    out.push('predicate CanonLive(hw: HWorld, r: Ref) { r in hw.heap && !hw.heap[r].Dead? }');
    // the walk: a fresh cell is descended and named in first-reach order; an initial cell is never descended, except
    // that a ROOT which is an initial record contributes its own fields (CanonRootEdges) behind the roots. An initial
    // container is never walked (its width is symbolic); an initial record below a root is not either: a fresh cell
    // hooked there stays unnamed, and the certificate fails rather than lies.
    out.push(['function CanonOrder(hw: HWorld, next0: nat, work: seq<Ref>, seen: set<Ref>, order: seq<Ref>): seq<Ref>', '  decreases hw.heap.Keys - seen, |work|', '{', '  if |work| == 0 then order', '  else var r := work[0];', '    if r in seen || r < next0 || !CanonLive(hw, r) then CanonOrder(hw, next0, work[1..], seen, order)', '    else CanonOrder(hw, next0, work[1..] + CanonEdges(hw.heap[r]), seen + {r}, order + [r])', '}'].join('\n'));
    out.push('function CanonRootEdges(hw: HWorld, next0: nat, roots: seq<Ref>): seq<Ref> decreases |roots| { if |roots| == 0 then [] else (if roots[0] < next0 && CanonLive(hw, roots[0]) && CanonRecord(hw.heap[roots[0]]) then CanonEdges(hw.heap[roots[0]]) else []) + CanonRootEdges(hw, next0, roots[1..]) }');
    out.push('function CanonOrderOf(hw: HWorld, next0: nat, roots: seq<Ref>): seq<Ref> { CanonOrder(hw, next0, roots + CanonRootEdges(hw, next0, roots), {}, []) }');
    out.push('function CanonIndex(order: seq<Ref>, r: Ref): nat decreases |order| { if |order| == 0 then 0 else if order[0] == r then 0 else 1 + CanonIndex(order[1..], r) }');
    out.push('function CanonName(next0: nat, order: seq<Ref>, r: Ref): nat { if r < next0 then r else next0 + CanonIndex(order, r) }');
    out.push('function CanonNames(next0: nat, order: seq<Ref>, rs: seq<Ref>): seq<nat> decreases |rs| { if |rs| == 0 then [] else [CanonName(next0, order, rs[0])] + CanonNames(next0, order, rs[1..]) }');
    out.push(`function CanonObj(next0: nat, order: seq<Ref>, o: Obj): CObj { match o ${keys.map((k) => `case ${pat(k)} => ${canonObj(k)}`).join(' ')} case Dead => CDead }`);
    out.push('function CanonCells(hw: HWorld, next0: nat, order: seq<Ref>, i: nat): seq<CObj> decreases |order| - i { if i >= |order| then [] else [if CanonLive(hw, order[i]) then CanonObj(next0, order, hw.heap[order[i]]) else CDead] + CanonCells(hw, next0, order, i + 1) }');
    out.push('predicate CanonNamed(next0: nat, order: seq<Ref>, rs: seq<Ref>) { forall i :: 0 <= i < |rs| ==> rs[i] < next0 || rs[i] in order }');
    out.push('predicate CanonNoUnnamed(hw0: HWorld, hw: HWorld, next0: nat, order: seq<Ref>) { (forall r :: r in hw.heap && r < next0 && (r !in hw0.heap || hw.heap[r] != hw0.heap[r]) ==> CanonNamed(next0, order, CanonEdges(hw.heap[r]))) && (forall i :: 0 <= i < |order| && order[i] in hw.heap ==> CanonNamed(next0, order, CanonEdges(hw.heap[order[i]]))) }'); // only a cell the unit wrote can hold a fresh reference (WF of the initial world hw0 bounds every other cell's references below next0)
    out.push('predicate CanonInitial(next0: nat, hp: HWorld, op: seq<Ref>, hc: HWorld, oc: seq<Ref>) { forall r :: 0 <= r < next0 ==> ((r in hp.heap) <==> (r in hc.heap)) && (r in hp.heap && r in hc.heap ==> hp.heap[r] == hc.heap[r] || CanonObj(next0, op, hp.heap[r]) == CanonObj(next0, oc, hc.heap[r])) }');
    out.push(['predicate CanonEqual(hw0: HWorld, next0: nat, hp: HWorld, rootsP: seq<Ref>, hc: HWorld, rootsC: seq<Ref>)', '{', '  && CanonInitial(next0, hp, CanonOrderOf(hp, next0, rootsP), hc, CanonOrderOf(hc, next0, rootsC))', '  && CanonCells(hp, next0, CanonOrderOf(hp, next0, rootsP), 0) == CanonCells(hc, next0, CanonOrderOf(hc, next0, rootsC), 0)', '  && CanonNames(next0, CanonOrderOf(hp, next0, rootsP), rootsP) == CanonNames(next0, CanonOrderOf(hc, next0, rootsC), rootsC)', '  && CanonNoUnnamed(hw0, hp, next0, CanonOrderOf(hp, next0, rootsP)) && CanonNoUnnamed(hw0, hc, next0, CanonOrderOf(hc, next0, rootsC))', '}'].join('\n'));
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
    // values that may be absent: an expression's code has the shape of its type at its place (TypeScript narrows a
    // name or a field read after a presence test); a narrowed name unwraps with a default it never reaches (a local is
    // narrowed soundly: nothing else writes it), a narrowed field read marks the world when it finds no value (another
    // name of the same record, or a call, may have cleared it since the test)
    const locShape = (x) => shapeOf(typeOf(x));
    const declShape = (id) => { const d = checker.getSymbolAtLocation(id)?.valueDeclaration; return d && (ts.isParameter(d) || ts.isVariableDeclaration(d)) && ts.isIdentifier(d.name) ? shapeOf(typeOf(d.name)) : null; };
    const absentCode = (x, to) => `Option<${to.inner.d}>.None`;
    function exprAs(x, to) { // x as a value of shape `to`
      if (to && to.kind === 'opt') { if (isAbsent(x)) return absentCode(x, to); const from = locShape(x); const c = expr(x); return from?.kind === 'opt' ? c : `Option.Some(${c})`; }
      return expr(x);
    }
    function exprField(x, to) { // x as the stored form of a field of shape `to`
      if (to.kind === 'opt' && to.absent === 'u') { if (isAbsent(x)) return `Pres<${to.inner.d}>.PUndef`; const from = locShape(x); const c = expr(x); return from?.kind === 'opt' ? `OptPres(${c})` : `Pres<${to.inner.d}>.PVal(${c})`; }
      return exprAs(x, to);
    }
    const truthyPrim = (c, sh) => (sh.d === 'bool' ? c : sh.d === 'string' ? `(${c} != "")` : `(${c} != 0)`); // 0 and "" are falsy (the int reading has no NaN)
    const cond = (x) => { const sh = locShape(x); const c = expr(x); return sh.kind === 'opt' ? `((${c}).Some? && ${truthyPrim(`OptOr(${c}, ${dflt(sh.inner)})`, sh.inner)})` : truthyPrim(c, sh); };
    function expr(e0) {
      const e = unparen(e0);
      if (isAbsent(e)) return absentCode(e, shapeOf(checker.getContextualType(e)));
      if (ts.isIdentifier(e)) { const ds = declShape(e), ls = locShape(e); if (ds?.kind === 'opt' && ls && ls.kind !== 'opt') return `OptOr(${dn(e.text)}, ${dflt(ls)})`; return dn(e.text); }
      if (e.kind === K.ThisKeyword) return dn('this');
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
        const raw = `Get_${s.key}_${dn(e.name.text)}(${HW}, ${r})`; const f = fieldOf(s, e.name.text);
        if (f.shape.kind !== 'opt') return raw;
        const o = f.shape.absent === 'u' ? `PresOpt(${raw})` : raw; const ls = locShape(e);
        if (ls && ls.kind !== 'opt') { const v = bind(o, 'p'); lines.push(`var ${HW} := OptMark(${HW}, ${v});`); return `OptOr(${v}, ${dflt(ls)})`; }
        return o;
      }
      if (ts.isElementAccessExpression(e) && shapeExpr(e.expression).kind === 'dict') { const [s, r, i] = element(e); return dictRead(s, r, i); }
      if (ts.isBinaryExpression(e) && e.operatorToken.kind === K.InKeyword) { const key = expr(e.left); const s = shapeExpr(e.right); return `DictIn_${s.key}(${HW}, ${expr(e.right)}, ${key})`; }
      if (ts.isObjectLiteralExpression(e) && litShape(e)?.kind === 'dict') { const s = litShape(e); const r = fresh('r'); lines.push(`var (${HW}, ${r}) := Alloc_${s.key}(${HW}, [], map[], true);`); return r; }
      if (ts.isElementAccessExpression(e)) { const [s, r, i] = element(e); if (!safeIndex.has(e)) lines.push(`var ${HW} := Oob_${s.key}(${HW}, ${r}, ${i});`); return `Idx_${s.key}(${HW}, ${r}, ${i})`; } // the receiver, then the index, once each; an index loop's own a[i] is in range by its guard
      if (ts.isNewExpression(e) && ts.isIdentifier(e.expression) && (e.expression.text === 'Map' || e.expression.text === 'Set')) { const s = shapeExpr(e); const r = fresh('r'); lines.push(`var (${HW}, ${r}) := Alloc_${s.key}(${HW}, ${s.kind === 'map' ? '[], map[]' : '[]'});`); return r; }
      if (ts.isNewExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'Date') { const s = shapeExpr(e); const r = fresh('r'); lines.push(`var (${HW}, ${r}) := Alloc_${s.key}(${HW}, ${expr(e.arguments[0])});`); return r; }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && shapeExpr(e.expression.expression)?.kind === 'date') { const s = shapeExpr(e.expression.expression); const r = expr(e.expression.expression); const g = e.expression.name.text; if (g === 'getTime' || g === 'valueOf') return `Get_${s.key}_tv(${HW}, ${r})`; dateGetters.add(g); return `DateUTC_${g}(Get_${s.key}_tv(${HW}, ${r}))`; }
      if (ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'structuredClone') { // a fresh cell with the source's own contents (HTML 2.7.4, one level: the lint admits flat cells only)
        const s = shapeExpr(e.arguments[0]); const r = expr(e.arguments[0]); const out = fresh('r');
        const contents = s.kind === 'rec' ? s.fields.map((f) => `Get_${s.key}_${dn(f.name)}(${HW}, ${r})`).join(', ') : s.kind === 'arr' ? `Items_${s.key}(${HW}, ${r})` : s.kind === 'set' ? `(if Is${s.key}(${HW}, ${r}) then ${HW}.heap[${r}].items_${s.key} else [])` : s.kind === 'map' ? `(if Is${s.key}(${HW}, ${r}) then ${HW}.heap[${r}].keys_${s.key} else []), (if Is${s.key}(${HW}, ${r}) then ${HW}.heap[${r}].m_${s.key} else map[])` : `Get_${s.key}_tv(${HW}, ${r})`;
        lines.push(`var (${HW}, ${out}) := Alloc_${s.key}(${HW}, ${contents});`); return out;
      }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && e.expression.name.text === 'has') { const s = shapeExpr(e.expression.expression); const r = expr(e.expression.expression); return `${s.kind === 'map' ? 'MapHas' : 'SetHas'}_${s.key}(${HW}, ${r}, ${expr(e.arguments[0])})`; }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && (e.expression.name.text === 'map' || e.expression.name.text === 'filter') && ts.isArrowFunction(e.arguments[0])) {
        const s = shapeExpr(e.expression.expression); const r = expr(e.expression.expression); const cb = e.arguments[0]; const x = cb.parameters[0].name.text; const xs = shapeOf(typeOf(cb.parameters[0].name));
        const body = expr(cbBody(cb)); const lam = `((${dn(x)}: ${valD(xs)}) => ${body})`; const out = fresh('r');
        if (e.expression.name.text === 'filter') { lines.push(`var (${HW}, ${out}) := Filter_${s.key}(${HW}, ${r}, ${lam});`); return out; }
        const rs = shapeExpr(e); mapInstances.add(`${s.key}|${rs.key}`);
        lines.push(`var (${HW}, ${out}) := Map_${s.key}_${rs.key}(${HW}, ${r}, ${lam});`); return out;
      }
      if (ts.isPrefixUnaryExpression(e)) return e.operator === K.ExclamationToken ? `!${cond(e.operand)}` : `(-(${expr(e.operand)}))`;
      if (ts.isBinaryExpression(e) && e.operatorToken.kind === K.QuestionQuestionToken) { const ls = locShape(e); const a = expr(e.left); return ls.kind === 'opt' ? `OptOrOpt(${a}, ${exprAs(e.right, ls)})` : `OptOr(${a}, ${expr(e.right)})`; }
      if (ts.isBinaryExpression(e) && [K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.EqualsEqualsToken, K.ExclamationEqualsToken].includes(e.operatorToken.kind) && (isAbsent(e.left) || isAbsent(e.right))) {
        const lit = isAbsent(e.left) ? unparen(e.left) : unparen(e.right), other = isAbsent(e.left) ? e.right : e.left; const sh = locShape(other); const c = expr(other);
        const negated = [K.ExclamationEqualsEqualsToken, K.ExclamationEqualsToken].includes(e.operatorToken.kind), loose = [K.EqualsEqualsToken, K.ExclamationEqualsToken].includes(e.operatorToken.kind);
        if (!loose && (lit.kind === K.NullKeyword ? 'n' : 'u') !== sh.absent) return negated ? 'true' : 'false'; // undefined is not null under ===
        return `(${c}).${negated ? 'Some' : 'None'}?`;
      }
      if (ts.isBinaryExpression(e) && [K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken].includes(e.operatorToken.kind) && (locShape(e.left)?.kind === 'opt' || locShape(e.right)?.kind === 'opt')) { const o = locShape(e.left)?.kind === 'opt' ? locShape(e.left) : locShape(e.right); return `(${exprAs(e.left, o)} ${e.operatorToken.kind === K.EqualsEqualsEqualsToken ? '==' : '!='} ${exprAs(e.right, o)})`; }
      if (ts.isBinaryExpression(e)) {
        const op = { [K.PlusToken]: '+', [K.MinusToken]: '-', [K.LessThanToken]: '<', [K.LessThanEqualsToken]: '<=', [K.GreaterThanToken]: '>', [K.GreaterThanEqualsToken]: '>=', [K.EqualsEqualsEqualsToken]: '==', [K.ExclamationEqualsEqualsToken]: '!=', [K.AmpersandAmpersandToken]: '&&', [K.BarBarToken]: '||' }[e.operatorToken.kind];
        const l = expr(e.left), r = expr(e.right); // source order: the left operand's allocations come first
        return `(${l} ${op} ${r})`;
      }
      if (ts.isArrayLiteralExpression(e)) {
        const s = shapeExpr(e);
        const items = e.elements.some(ts.isSpreadElement) ? e.elements.map((x) => (ts.isSpreadElement(x) ? `Items_${shapeExpr(x.expression).key}(${HW}, ${expr(x.expression)})` : `[${expr(x)}]`)).join(' + ') : `[${e.elements.map((x) => expr(x)).join(', ')}]`; // one literal when nothing is spread: the prover reads `[a, b]` ten times faster than `[a] + [b]`
        const r = fresh('r'); lines.push(`var (${HW}, ${r}) := Alloc_${s.key}(${HW}, ${items});`); return r;
      }
      if (ts.isObjectLiteralExpression(e)) {
        const s = litShape(e);
        const given = new Map(); let base = null, baseShape = null;
        for (const p of e.properties) {
          if (ts.isSpreadAssignment(p)) { baseShape = shapeExpr(p.expression); base = expr(p.expression); given.clear(); }
          else if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) given.set(p.name.text, exprField(p.initializer, fieldOf(s, p.name.text).shape));
          else if (ts.isShorthandPropertyAssignment(p)) { const fs = fieldOf(s, p.name.text).shape; const ds = declShape(p.name) ?? fs; const x = dn(p.name.text); given.set(p.name.text, fs.kind !== 'opt' ? x : fs.absent === 'u' ? (ds.kind === 'opt' ? `OptPres(${x})` : `Pres<${fs.inner.d}>.PVal(${x})`) : (ds.kind === 'opt' ? x : `Option.Some(${x})`)); }
        }
        const args = s.fields.map((f) => (given.has(f.name) ? given.get(f.name) : base !== null ? `Get_${baseShape.key}_${dn(f.name)}(${HW}, ${base})` : f.shape.kind === 'opt' && f.shape.absent === 'u' ? `Pres<${f.shape.inner.d}>.PMissing` : (() => { throw new Error(`heap: field ${f.name} not given`); })())); // an optional field not given is missing
        const r = fresh('r'); lines.push(`var (${HW}, ${r}) := Alloc_${s.key}(${HW}, ${args.join(', ')});`); return r;
      }
      if (calleeOf(e, u)) {
        const callee = calleeOf(e, u); const recv = sameFileCall(e) ? [] : [dn('this')]; // a method takes its receiver first
        const ps = fns.get(callee).params; const args = ps.map((p, j) => { const sh = shapeOf(typeOf(p.name)); return e.arguments[j] ? exprAs(e.arguments[j], sh) : `Option<${sh.inner.d}>.None`; }); // an argument not passed is undefined
        const r = fresh('c'); lines.push(`var (${HW}, ${r}) := ${fname(callee)}(${[HW, ...recv, ...args].join(', ')});`); return r;
      }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && ['slice', 'concat', 'reverse', 'splice'].includes(e.expression.name.text)) {
        const s = shapeExpr(e.expression.expression); const r = expr(e.expression.expression);
        return libCall(e, s, r);
      }
      const sc = strCall(e);
      if (sc) { const r = expr(e.expression.expression); const a = e.arguments.map((x) => expr(x)); strUsed.add(sc === 'join' ? `join_${shapeExpr(e.expression.expression).elem.d}` : sc);
        if (sc === 'trim') return `StrTrim(${r})`; if (sc === 'replace') return `StrReplace(${r}, ${a[0]}, ${a[1]})`;
        const sh = shapeExpr(e.expression.expression); return `${sh.elem.d === 'string' ? 'JoinStr' : `JoinNum_${sh.elem.d}`}(Items_${sh.key}(${HW}, ${r}), ${a[0] ?? '","'})`; } // join() joins with a comma
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
    // an element's receiver and index, each evaluated once and bound
    const bind = (code, p) => { if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(code) || /^-?\d+(\.\d+)?$/.test(code)) return code; const x = fresh(p); lines.push(`var ${x} := ${code};`); return x; }; // a name or a literal is its own value; anything else is bound once
    function element(e) { const s = shapeExpr(e.expression); const r = bind(expr(e.expression), 'a'); const i = bind(expr(e.argumentExpression), 'i'); return [s, r, i]; }
    const dictRead = (s, r, i) => { lines.push(`var ${HW} := DictMark_${s.key}(${HW}, ${r}, ${i});`); return `DictGet_${s.key}(${HW}, ${r}, ${i})`; };
    // a write target in JavaScript order: its receiver (and index) first, then the right side, then the store
    function target(t0) {
      const t = unparen(t0);
      if (ts.isIdentifier(t)) return { as: (x) => exprAs(x, declShape(t)), read: () => dn(t.text), write: (v) => lines.push(`var ${dn(t.text)} := ${v};`) };
      if (ts.isElementAccessExpression(t) && shapeExpr(t.expression).kind === 'dict') { const [s, r, i] = element(t); return { as: (x) => expr(x), read: () => dictRead(s, r, i), write: (v) => lines.push(`var ${HW} := DictSet_${s.key}(${HW}, ${r}, ${i}, ${v});`) }; }
      if (ts.isElementAccessExpression(t)) { const [s, r, i] = element(t); const safe = safeIndex.has(t); return { as: (x) => expr(x), read: () => { if (!safe) lines.push(`var ${HW} := Oob_${s.key}(${HW}, ${r}, ${i});`); return `Idx_${s.key}(${HW}, ${r}, ${i})`; }, write: (v) => lines.push(`var ${HW} := ${safe ? 'SetIdxIn' : 'SetIdx'}_${s.key}(${HW}, ${r}, ${i}, ${v});`) }; }
      const s = shapeExpr(t.expression); const r = bind(expr(t.expression), 'o');
      return { as: (x) => exprField(x, fieldOf(s, t.name.text).shape), read: () => `Get_${s.key}_${dn(t.name.text)}(${HW}, ${r})`, write: (v) => lines.push(`var ${HW} := Set_${s.key}_${dn(t.name.text)}(${HW}, ${r}, ${v});`) };
    }
    const flush = () => lines.splice(0).join('\n');
    const indent = (t) => t.split('\n').map((l) => '  ' + l).join('\n');
    // a statement list. At the unit's level every path ends in a return; in a loop body (k given) nothing returns and
    // every path ends in k(), the loop's next step, so an `if` carries the rest of the body into both branches
    function stmts(list, k = null) {
      const out = [];
      for (let i = 0; i < list.length; i++) {
        const s = list[i];
        if (ts.isForOfStatement(s) || ts.isForStatement(s)) { loopCall(s); out.push(flush()); continue; }
        if (k && ts.isIfStatement(s)) {
          const c = cond(s.expression); const pre = flush(); const rest = list.slice(i + 1);
          const t = stmts([...block(s.thenStatement), ...rest], k), el = stmts([...(s.elseStatement ? block(s.elseStatement) : []), ...rest], k);
          out.push(`${pre ? pre + '\n' : ''}if ${c} then\n${indent(t)}\nelse\n${indent(el)}`);
          return out.filter(Boolean).join('\n');
        }
        if (ts.isVariableStatement(s)) { for (const d of s.declarationList.declarations) { const v = exprAs(d.initializer, shapeOf(typeOf(d.name))); lines.push(`var ${dn(d.name.text)} := ${v};`); } out.push(flush()); continue; }
        if (ts.isReturnStatement(s)) { const v = exprAs(s.expression, rt); const pre = flush(); out.push(`${pre ? pre + '\n' : ''}(${HW}, ${v})`); return out.filter(Boolean).join('\n'); }
        if (ts.isIfStatement(s)) {
          const c = cond(s.expression); const pre = flush();
          const t = stmts(block(s.thenStatement));
          const rest = s.elseStatement ? stmts(block(s.elseStatement)) : stmts(list.slice(i + 1));
          out.push(`${pre ? pre + '\n' : ''}if ${c} then\n${indent(t)}\nelse\n${indent(rest)}`);
          return out.filter(Boolean).join('\n');
        }
        const e = unparen(s.expression);
        if (ts.isBinaryExpression(e)) {
          const op = e.operatorToken.kind;
          const tg = target(e.left);
          if (op === K.EqualsToken) { const v = tg.as(e.right); tg.write(v); }
          else { let cur = tg.read(); if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(cur)) { const c = fresh('v'); lines.push(`var ${c} := ${cur};`); cur = c; } const v = expr(e.right); tg.write(`(${cur} ${op === K.PlusEqualsToken ? '+' : '-'} ${v})`); }
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
          if (m === 'sort') { const cb = e.arguments[0]; const [a, b] = cb.parameters.map((p) => p.name.text); const E = valD(s2.elem); const body = expr(cb.body); const d = fresh('d'); lines.push(`var (${HW}, ${d}) := SortPure_${s2.key}(${HW}, ${r}, ((${dn(a)}: ${E}, ${dn(b)}: ${E}) => ${body} < ${isReal ? '0.0' : '0'}));`); out.push(flush()); continue; } // a stable sort of the items by the comparator's order, uninterpreted
          const args = (m === 'pop' || m === 'shift') ? [HW, r] : [HW, r, expr(e.arguments[0])];
          lines.push(`var ${HW} := ${m[0].toUpperCase() + m.slice(1)}_${s2.key}(${args.join(', ')});`);
          out.push(flush()); continue;
        }
        if (isAssignCall(e)) { const st = shapeExpr(e.arguments[0]); const t = expr(e.arguments[0]); const src = expr(e.arguments[1]); const d = fresh('d'); lines.push(`var (${HW}, ${d}) := Assign_${st.key}(${HW}, ${t}, ${src});`); out.push(flush()); continue; }
        expr(e); out.push(flush()); // a same-file call as a statement: its heap effect
      }
      if (k) { out.push(k()); return out.filter(Boolean).join('\n'); }
      throw new Error('heap: a path ends without a return');
    }
    // a loop over an array is a recursive helper that threads the heap world: its counter, the length at entry (the
    // measure; nothing in the body grows an array, so the guard on the current length decides), the locals the body
    // assigns (returned, in name order), the names it reads; `for (const x of e)` evaluates e once, the index loop
    // reads its array name. The helper is written beside the unit and named <unit>_loop<n>.
    const helpers = []; let loopId = 0;
    const base = suffix && fname(u.name).endsWith(suffix) ? fname(u.name).slice(0, -suffix.length) : fname(u.name);
    function loopCall(s) {
      const id = loopId++; const name = `${base}_loop${id}${suffix}`;
      const forOf = ts.isForOfStatement(s); const ix = forOf ? null : indexLoop(s);
      const sh = shapeExpr(forOf ? s.expression : s.condition.right.expression);
      const arr = forOf ? bind(expr(s.expression), 'a') : dn(ix.a);
      const declaredIn = (id0) => { const sym = checker.getSymbolAtLocation(id0); const d = sym?.valueDeclaration ?? sym?.declarations?.[0]; return d && d.getSourceFile() === sf ? d : null; };
      const inner = (d) => d.pos >= s.pos && d.end <= s.end;
      const assigned = new Set(), read = new Map(); let usesThis = false;
      const w = (n) => {
        if (n.kind === K.ThisKeyword) usesThis = true;
        if (ts.isIdentifier(n) && !(n.parent && ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) && !(n.parent && ts.isPropertyAssignment(n.parent) && n.parent.name === n)) { const d = declaredIn(n); if (d && d.pos >= u.fn.pos && d.end <= u.fn.end && !inner(d) && (ts.isVariableDeclaration(d) || ts.isParameter(d))) read.set(n.text, d); }
        if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment && ts.isIdentifier(unparen(n.left))) assigned.add(unparen(n.left).text);
        ts.forEachChild(n, w);
      };
      w(s.statement); if (!forOf) w(s.condition);
      for (const x of [...assigned]) if (!read.has(x)) assigned.delete(x); // a local of the body itself is not carried
      const carried = [...assigned].sort().map((x) => ({ x, d: valD(shapeOf(typeOf(read.get(x).name))) }));
      const free = [...read.keys()].filter((x) => !assigned.has(x)).sort().map((x) => ({ x, d: valD(shapeOf(typeOf(read.get(x).name))) }));
      const ctr = forOf ? `k${id}_` : dn(ix.i), n = `n${id}_`;
      const params = [`${HW}: HWorld`, ...(forOf ? [`a${id}_: Ref`] : []), `${ctr}: int`, `${n}: int`, ...carried.map((c) => `${dn(c.x)}: ${c.d}`), ...(usesThis && u.cls ? [`${dn('this')}: Ref`] : []), ...free.map((f) => `${dn(f.x)}: ${f.d}`)];
      const A = forOf ? `a${id}_` : arr;
      const args = (cv, first) => [HW, ...(forOf ? [first ? arr : A] : []), cv, n, ...carried.map((c) => dn(c.x)), ...(usesThis && u.cls ? [dn('this')] : []), ...free.map((f) => dn(f.x))].join(', ');
      const ret = carried.length ? `(HWorld, ${carried.map((c) => c.d).join(', ')})` : 'HWorld';
      const done = carried.length ? `(${HW}, ${carried.map((c) => dn(c.x)).join(', ')})` : HW;
      const saved = lines.splice(0);
      const head = forOf ? `var ${dn(s.initializer.declarations[0].name.text)} := Idx_${sh.key}(${HW}, ${A}, ${ctr});` : '';
      const bodyText = stmts(block(s.statement), () => `${name}(${args(`${ctr} + 1`, false)})`);
      helpers.push([`function ${name}(${params.join(', ')}): ${ret}`, `  decreases ${n} - ${ctr}`, '{', `  if !(${ctr} < ${n} && ${ctr} < Len_${sh.key}(${HW}, ${A})) then ${done}`, '  else', indent(indent([head, bodyText].filter(Boolean).join('\n'))), '}'].join('\n'));
      lines.push(...saved);
      const call = `${name}(${[HW, ...(forOf ? [arr] : []), '0', `Len_${sh.key}(${HW}, ${arr})`, ...carried.map((c) => dn(c.x)), ...(usesThis && u.cls ? [dn('this')] : []), ...free.map((f) => dn(f.x))].join(', ')})`;
      lines.push(carried.length ? `var (${HW}, ${carried.map((c) => dn(c.x)).join(', ')}) := ${call};` : `var ${HW} := ${call};`);
    }
    const body = stmts([...u.body.statements]);
    const self = u.cls ? instanceShape(u.cls, 0) : null; // an instance method's receiver: a reference to the record of its fields
    const params = [...(self ? [`${dn('this')}: Ref`] : []), ...u.params.map((p) => `${dn(p.name.text)}: ${valD(shapeOf(typeOf(p.name)))}`)];
    const lit = (v, sh) => (sh.d === 'string' ? strEsc(v) : isReal ? `${v}.0` : String(v));
    const member = (code, sh) => { if (sh.kind === 'opt') return sh.inner.values ? `((${code}).None? || ${member(`OptOr(${code}, ${dflt(sh.inner)})`, sh.inner)})` : null; return sh.kind === 'prim' && sh.values ? `(${sh.values.map((v) => `${code} == ${lit(v, sh)}`).join(' || ')})` : null; };
    const fieldsIn = (s, r) => (s.kind === 'rec' ? s.fields.map((f) => member(f.shape.kind === 'opt' && f.shape.absent === 'u' ? `PresOpt(Get_${s.key}_${dn(f.name)}(${HW}, ${r}))` : `Get_${s.key}_${dn(f.name)}(${HW}, ${r})`, f.shape)).filter(Boolean) : []); // a literal-union field of a reference parameter: one level, the parameter's own fields
    const hyp = [`WF(${HW})`, ...(self ? [`Is${self.key}(${HW}, ${dn('this')})`, ...fieldsIn(self, dn('this'))] : []), ...u.params.flatMap((p) => { const s = shapeOf(typeOf(p.name)); const x = dn(p.name.text); return !isRefShape(s) ? [member(x, s)].filter(Boolean) : [`Is${s.key}(${HW}, ${x})`, ...fieldsIn(s, x)]; })].join(' && ');
    const text = [...helpers.map((h) => `${h}\n`), `function ${fname(u.name)}(${[`${HW}: HWorld`, ...params].join(', ')}): (HWorld, ${valD(rt)})`, '{', indent(body), '}'].join('\n');
    return { text, hyp };
  }
  const shapeLegend = () => [...shapes.keys()].sort().map((k) => { const s = shapes.get(k); return `${k} = ${s.kind === 'arr' ? `[${keyOf(s.elem)}]` : s.kind === 'set' ? `Set<${keyOf(s.elem)}>` : s.kind === 'date' ? 'Date' : s.kind === 'dict' ? `Record<string, ${s.v.d}>` : s.kind === 'map' ? `Map<${keyOf(s.k)}, ${keyOf(s.v)}>` : `{${s.fields.map((f) => `${f.name}: ${keyOf(f.shape)}`).join(', ')}}`}`; }).join('; ');
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
    // the aliasing class: two input positions of one reference shape may be one object (lane B draws them so), and a
    // write through an input is then visible through the other position, which the value reading never sees: each
    // parameter is its own tree there. A unit that writes through an input while its inputs hold two positions of one
    // shape (two parameters, two fields, a shape that holds itself) keeps no value-reading lemma.
    const positions = new Map(); // shape key -> how many positions of it the inputs hold, to depth 3
    const countShapes = (s, d) => { if (!s || s.kind === 'prim' || d > 3) return; const key = keyOf(s); positions.set(key, (positions.get(key) ?? 0) + 1); if (s.kind === 'rec') for (const f of s.fields) countShapes(f.shape, d + 1); else if (s.kind === 'arr' || s.kind === 'set') countShapes(s.elem, d + 1); else if (s.kind === 'map') countShapes(s.v, d + 1); };
    for (const p of u.params) { const t = typeOf(p.name); const s = shapeOf(t); if (s) countShapes(s, 0); else if (isRefType(t)) { const key = checker.typeToString(t); positions.set(key, (positions.get(key) ?? 0) + 1); } }
    if (u.cls && !u.isStatic) { const key = `this:${u.className}`; positions.set(key, (positions.get(key) ?? 0) + 1); for (const p of u.params) if (checker.typeToString(typeOf(p.name)) === u.className) positions.set(key, positions.get(key) + 1); }
    const aliasable = [...positions].filter(([, c]) => c >= 2).map(([k]) => k);
    let writesInput = false;
    const walk = (n) => {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && isRefType(typeOf(n.name)) && inputRooted(n.initializer) && (ts.isIdentifier(unparen(n.initializer)) || ts.isPropertyAccessExpression(unparen(n.initializer)) || unparen(n.initializer).kind === K.ThisKeyword)) aliases.set(n.name.text, effDepth(n.initializer));
      if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment) {
        const L = unparen(n.left);
        if ((ts.isPropertyAccessExpression(L) || ts.isElementAccessExpression(L)) && inputRooted(L)) { writesInput = true; if (effDepth(L) >= 2) risks.add('nested write through an input'); else if (n.operatorToken.kind === K.EqualsToken && isRefType(typeOf(n.right)) && !fresh(n.right)) risks.add('input field assigned a reference'); }
      }
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && MUTATORS_ALL.has(n.expression.name.text) && inputRooted(n.expression.expression)) { writesInput = true; const recv = unparen(n.expression.expression); if (effDepth(recv) >= 1) risks.add('nested write through an input'); }
      if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && (n.operator === K.PlusPlusToken || n.operator === K.MinusMinusToken)) { const L = unparen(n.operand); if ((ts.isPropertyAccessExpression(L) || ts.isElementAccessExpression(L)) && inputRooted(L)) writesInput = true; if ((ts.isPropertyAccessExpression(L) || ts.isElementAccessExpression(L)) && inputRooted(L) && effDepth(L) >= 2) risks.add('nested write through an input'); }
      if (ts.isReturnStatement(n) && n.expression && !fresh(n.expression)) risks.add('result may carry an input or shared reference');
      if (ts.isArrowFunction(n) && !ts.isBlock(n.body) && n.parent && ts.isCallExpression(n.parent) === false && n === u.fn.body) { /* unreachable: units with expression bodies are handled below */ }
      ts.forEachChild(n, walk);
    };
    if (ts.isBlock(u.body)) walk(u.body); else { walk(u.body); if (!fresh(u.body)) risks.add('result may carry an input or shared reference'); }
    if (writesInput && aliasable.length) risks.add(`write through an input that another input position of the same shape may alias (${aliasable.join(', ')})`);
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
    return { exposed, determinate: !!sk.determinate, sites: sk.sites ?? [], writes: sk.writes ?? [], aliasable: exposed.find((r) => r.startsWith('write through an input that another input position')) ?? null }; // aliasable: no skeleton rescues it, the theorem withholds the lemma
  }
  return { plan, isCore, needsInRange, emit, prelude, shapes, shapeLegend, core: () => core, whyNot: whyNotOf, layer1Risk, identitySkeleton, guard };
}
