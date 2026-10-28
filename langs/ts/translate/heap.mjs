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
import { originOf } from '../common.mjs';
import { makeReach } from '../reach.mjs'; // the code a unit reaches, one reading with the translator's opaque module identity
import { elementWritePath } from '../common.mjs'; // a field write through a parameter's element path: one test with the lint
// the library transition table: one verified Dafny form per built-in (translate/library.json, forms checked in
// design/library-ops.dfy and against the engine by exec/transitions.mjs on Test262); the prelude instantiates a row's
// form per shape by substituting <K> (the shape key) and <E> (its element type)
const LIBRARY = JSON.parse(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'library.json'), 'utf8'));
const LIB_ROW = Object.fromEntries(LIBRARY.operations.map((o) => [o.op, o]));
const ARRAY_ROWS = { push: 'Array.prototype.push', unshift: 'Array.prototype.unshift', pop: 'Array.prototype.pop', shift: 'Array.prototype.shift', splice: 'Array.prototype.splice', reverse: 'Array.prototype.reverse', slice: 'Array.prototype.slice', concat: 'Array.prototype.concat' };
const instantiate = (form, k, E, KT = null, k2 = null, E2 = null) => form.replace(/<K2>/g, k2 ?? '').replace(/<E2>/g, E2 ?? '').replace(/<KT>/g, KT ?? '').replace(/<K>/g, k).replace(/<E>/g, E).replace(/\.items\b/g, `.items_${k}`).replace(/\.keys\b/g, `.keys_${k}`).replace(/\.m\b/g, `.m_${k}`); // the table writes `.items`, `.keys`, `.m`; the prelude suffixes them with the shape and `.entries`; each shape has its own destructor

export const HW = 'hw_';
const OBJECT_PROTO = Object.getOwnPropertyNames(Object.prototype).sort(); // the keys `in` finds on an ordinary object it does not own

export function makeHeap({ ts, checker, sf, fns, dn, fname, isReal, recursive, typeOf: typeOfIn = null, suffix = '', helper = null, bitwise = null }) {
  const TF = ts.TypeFlags, K = ts.SyntaxKind;
  const NUM = isReal ? 'real' : 'int';
  const shapes = new Map(); // key -> shape
  const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 8);
  const nonNull = (t) => (t.flags & TF.Union ? t.types.filter((x) => !(x.flags & (TF.Undefined | TF.Null))) : [t]);

  // ----- shapes: structural, so an alias and the anonymous type it names are one constructor -----
  // a type's name the same on both sides: a type the file declares by its own name (the file's path differs between the
  // two versions), any other by its fully qualified name (its module is the environment's)
  const typeKey = (t) => { const d = t.symbol?.declarations?.[0]; return !t.symbol ? checker.typeToString(t) : d && d.getSourceFile() === sf ? `local:${t.symbol.name}` : checker.getFullyQualifiedName(t.symbol); };
  function shapeOf(t, depth = 0) {
    if (!t || depth > 6) return null;
    if (t.flags & TF.BooleanLike) return { kind: 'prim', d: 'bool' }; // `boolean` is the union true | false: one shape
    if (t.flags & TF.Intersection) { // `A & B` of records: the record of all their fields; `string & { brand }`: the primitive itself
      const prims = t.types.filter((x) => x.flags & (TF.StringLike | TF.NumberLike | TF.BooleanLike)), objs = t.types.filter((x) => (x.flags & TF.Object) && !x.getCallSignatures().length && !x.getConstructSignatures().length);
      if (prims.length === 1 && objs.length === t.types.length - 1) { const p = shapeOf(prims[0], depth); return p && p.kind === 'prim' ? { kind: 'prim', d: p.d } : null; } // a branded primitive is the primitive at run time
      if (prims.length || objs.length !== t.types.length) return null;
    }
    if (t.flags & TF.Union) { // a primitive that may be absent: `T | undefined` (an optional field or parameter) or `T | null`, never both
      const absent = t.types.filter((x) => x.flags & (TF.Undefined | TF.Null | TF.Void));
      if (!absent.length) { const l = literals(t.types); if (l) return l; const ru = recUnion(t, depth); if (ru) return ru; }
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
    if (checker.isTupleType(t)) { // a tuple of required elements: of one shape, an array with its length fixed on entry; else a record of positions
      const tg = t.target; if (!tg || tg.hasRestElement || (tg.elementFlags ?? []).some((f) => !(f & ts.ElementFlags.Required))) return null;
      const es = checker.getTypeArguments(t).slice(0, tg.fixedLength ?? tg.elementFlags.length).map((x) => shapeOf(x, depth + 1)); if (!es.length || es.some((x) => !x || x.kind === 'opt')) return null;
      if (es.every((x) => keyOf(x) === keyOf(es[0]))) return { kind: 'arr', elem: es[0].kind === 'prim' ? { kind: 'prim', d: es[0].d } : es[0], key: `A_${keyOf(es[0])}`, fixed: es.length };
      const fields = es.map((x, i) => ({ name: `_${i}`, shape: x })); return { kind: 'rec', fields, tuple: es.length, key: `R_${hash(fields.map((f) => `${f.name}:${keyOf(f.shape)}`).join(','))}` };
    }
    const symName = t.symbol?.name;
    if (symName === 'Map' && checker.getTypeArguments(t).length === 2) { const [kt, vt] = checker.getTypeArguments(t); const k = shapeOf(kt, depth + 1), v = shapeOf(vt, depth + 1); return k && k.kind !== 'opt' && k.kind !== 'union' && v && v.kind !== 'opt' ? { kind: 'map', k, v, key: `M_${keyOf(k)}_${keyOf(v)}` } : null; } // a Map cell: insertion-ordered entries; SameValueZero is == on primitives and identity on references, which Ref equality is
    if (symName === 'Date') return { kind: 'date', key: 'D' }; // a Date cell: its time value; getTime and the UTC getters read it, a setter keeps the unit out of the core (it reads the host's time zone)
    if (symName === 'Set' && checker.getTypeArguments(t).length === 1) { const e = shapeOf(checker.getTypeArguments(t)[0], depth + 1); return e && e.kind !== 'opt' && e.kind !== 'union' ? { kind: 'set', elem: e, key: `S_${keyOf(e)}` } : null; } // a Set cell: its items in insertion order, references by identity
    const cd = classDeclOf(t); if (cd) return instanceShape(cd, depth); // an instance of a class of this file: the record of its fields
    if (depth === 0 && (t.flags & TF.Object) && !t.getCallSignatures().length && !t.getConstructSignatures().length && !checker.isArrayType(t) && !checker.isTupleType(t) && !['Map', 'Set', 'Date', 'Promise', 'RegExp', 'WeakMap', 'WeakSet', 'Error'].includes(t.symbol?.name) && checker.getPropertiesOfType(t).some((p) => p.flags & ts.SymbolFlags.Method)) { // a handle: an object with methods (an interface, a class of another file); its method calls are world transitions, its fields are not read
      const name = typeKey(t); return { kind: 'handle', name, key: `H_${hash(name)}` };
    }
    if ((t.flags & TF.Object) && !t.getCallSignatures().length && checker.getIndexInfoOfType(t, ts.IndexKind.String) && !checker.getIndexInfoOfType(t, ts.IndexKind.Number) && !checker.getPropertiesOfType(t).length) { const v = shapeOf(checker.getIndexInfoOfType(t, ts.IndexKind.String).type, depth + 1); return v && v.kind === 'prim' ? { kind: 'dict', v, key: `Dk_${v.d}` } : null; } // a dictionary `Record<string, T>` of primitives: insertion-ordered keys beside a map, and whether its prototype is Object.prototype
    if ((t.flags & TF.Object) || (t.flags & TF.Intersection)) { // an intersection here holds records only (above)
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
  // a discriminated union of records `A | B`: every alternative a record, and one field every alternative declares as
  // literals, the alternatives' literal sets pairwise disjoint (`kind: 'circle'` against `kind: 'square'`). The value is
  // a reference whose cell is one of the alternatives' constructors holding one of its discriminant values; a read of
  // the discriminant reads the cell's field (shapes are views: two alternatives may be one constructor, told apart by
  // the value). TypeScript narrows on the discriminant, and the core never writes a discriminant of an alternative's
  // constructor (plan), so a narrowed reference reads the alternative it holds.
  const unionsSeen = new Map(); // key -> union shape met while reading the file's types
  const litValues = (ft) => { const xs = ft.flags & TF.Union ? ft.types : [ft]; if (xs.every((x) => x.flags & TF.StringLiteral)) return xs.map((x) => x.value); if (xs.every((x) => (x.flags & TF.NumberLiteral) && Number.isInteger(x.value) && x.value >= 0)) return xs.map((x) => x.value); return null; };
  function recUnion(t, depth) {
    if (t.types.length < 2 || t.types.some((x) => !(x.flags & TF.Object))) return null;
    const alts = t.types.map((x) => shapeOf(x, depth + 1)); if (alts.some((a) => !a || a.kind !== 'rec')) return null;
    for (const f of alts[0].fields) {
      if (!alts.every((a) => { const g = fieldOf(a, f.name); return g && g.shape.kind === 'prim' && g.shape.d === f.shape.d; })) continue;
      const vals = t.types.map((x) => { const p = x.getProperty(f.name); return p ? litValues(checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration ?? sf)) : null; });
      if (vals.some((v) => !v)) continue;
      const all = vals.flat().map(String); if (new Set(all).size !== all.length) continue;
      const parts = alts.map((a, i) => ({ shape: a, values: vals[i] })).sort((x, y) => (`${x.shape.key}:${x.values.join('|')}` < `${y.shape.key}:${y.values.join('|')}` ? -1 : 1));
      const key = `U_${hash(parts.map((x) => `${x.shape.key}:${x.values.join('|')}`).join(',') + '/' + f.name)}`;
      const u = { kind: 'union', alts: parts, disc: f.name, d: f.shape.d, key }; unionsSeen.set(key, u); return u;
    }
    return null;
  }
  // a field every alternative of a union declares the same way: read through whichever constructor the cell holds
  const unionField = (s, name) => { const fs = s.alts.map((a) => fieldOf(a.shape, name)); return fs.every((g) => g && fieldD(g.shape) === fieldD(fs[0].shape) && keyOf(g.shape) === keyOf(fs[0].shape)) ? fs[0] : null; };
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
  // decorators read as metadata: a decorator runs once, when the class is defined, and may replace the class or a method
  // it decorates. A method body is read as its text whatever wraps it; `this.m()` in a decorated class, or of a decorated
  // method, is a transition (the prototype's m may be another function); a decorated field keeps the class out (a
  // decorator may install an accessor there). A class decorator that returns a subclass is the subclass-elsewhere case
  // the ordinary lane already assumes away for fields.
  const clsOf = (x) => { let t = nonNull(typeOf(x))[0]; if (t && (t.flags & TF.TypeParameter) && t.isThisType) t = checker.getBaseConstraintOfType(t); return classDeclOf(t); }; // the class of this file an expression's value is an instance of (`this` too)
  const hasDecorator = (n) => !!n?.modifiers?.some((m) => m.kind === K.Decorator);
  const replaceable = (cd, name) => hasDecorator(cd) || cd.members.some((m) => (ts.isMethodDeclaration(m) && ts.isIdentifier(m.name) && m.name.text === name && hasDecorator(m)));
  function classWhy(cd) {
    if (cd.heritageClauses?.some((h) => h.token === K.ExtendsKeyword)) return 'extends a class';
    if (cd.typeParameters?.length) return 'generic class';
    if (cd.modifiers?.some((m) => m.kind === K.AbstractKeyword)) return 'abstract class'; // a decorated class is read: its decorators are metadata (step 20), a call of a method they may replace a transition
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
  const valD = (s) => (s.kind === 'prim' ? s.d : s.kind === 'opt' ? `Option<${s.inner.d}>` : s.kind === 'void' ? '()' : 'Ref'); // void: a procedure's result, the unit value
  const fieldD = (s) => (s.kind === 'opt' && s.absent === 'u' ? `Pres<${s.inner.d}>` : valD(s));
  const isRefShape = (s) => s.kind !== 'prim' && s.kind !== 'opt'; // a field or element that is an edge of the heap graph
  let optUsed = false; // the Option and Pres helpers are written when a core unit or a shape needs them
  const dflt = (s) => (s.kind === 'prim' ? (s.d === 'string' ? '""' : s.d === 'bool' ? 'false' : isReal ? '0.0' : '0') : s.kind === 'opt' ? `Option<${s.inner.d}>.None` : '0');
  const fieldDflt = (s) => (s.kind === 'opt' && s.absent === 'u' ? `Pres<${s.inner.d}>.PMissing` : dflt(s));
  const unions = new Map(); // the unions a core unit reads: a predicate and the common-field reads in the prelude
  // a handle has no cell the heap models
  function register(s) { if (!s || s.kind === 'prim' || s.kind === 'handle') return; if (s.kind === 'opt') { optUsed = true; return; } if (s.kind === 'union') { if (!unions.has(s.key)) { unions.set(s.key, s); for (const a of s.alts) register(a.shape); } return; } if (!shapes.has(s.key)) { shapes.set(s.key, s); if (s.kind === 'arr' || s.kind === 'set') register(s.elem); else if (s.kind === 'map') { register(s.k); register(s.v); } else if (s.kind === 'rec') for (const f of s.fields) register(f.shape); } }
  const dateGetters = new Set(); // the UTC getters a core unit reads: each a bodiless function of the time value in the prelude
  const mapInstances = new Set(); // 'K|K2' pairs of Array.prototype.map seen in the core, each its own Map_K_K2
  const typeOf = typeOfIn ?? ((n) => checker.getTypeAtLocation(n)); // the translator's reading of a node's type (its explicit-operand overrides included)
  const fieldOf = (s, name) => (s.kind === 'rec' ? s.fields.find((f) => f.name === name) : null);
  // an object literal takes the shape of the place it is written to (a `{ age: undefined }` literal's own type has no
  // shape), when that type is a record holding every key the literal writes
  // an array literal likewise: `[]` has no element type of its own (never[]), so it takes the array shape of its place
  const arrShape = (e) => { const c = shapeOf(checker.getContextualType(e)); return c && (c.kind === 'arr' || c.tuple) ? c : shapeOf(typeOf(e)); }; // a tuple's literal takes the tuple's shape
  const litShape = (e) => { const c = shapeOf(checker.getContextualType(e)); if (c && c.kind === 'rec' && e.properties.every((p) => !p.name || !ts.isIdentifier(p.name) || fieldOf(c, p.name.text))) return c; return shapeOf(typeOf(e)); };

  // ----- the core, by syntax -----
  const MUTATORS = new Set(['push', 'unshift', 'pop', 'shift', 'reverse', 'splice', 'sort']); // in-place array operations of the table, as statements
  const MUTATOR_ARITY = { push: [1, 1], unshift: [1, 1], pop: [0, 0], shift: [0, 0], reverse: [0, 0], splice: [2, Infinity], sort: [1, 1] }; // splice: start, delete count, then insertions; sort: the comparator
  const isAssignCall = (e) => ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && ts.isIdentifier(e.expression.expression) && e.expression.expression.text === 'Object' && e.expression.name.text === 'assign'; // Object.assign(t, s) as a statement: the table's Assign_ row on same-shape records
  // `Object.assign(t, { a: x, b })` with object-literal sources onto a record: JavaScript evaluates the target and every
  // source first, then copies each source's own keys in order (ECMA-262 20.1.2.1: [[OwnPropertyKeys]], a literal's keys in
  // source order, none integer-like here), each by [[Set]] on the target. A literal's keys are exactly its properties, so
  // the copy is a sequence of field writes on the target's node; a later source writes over an earlier one. Each key must
  // be a field of the target's record and its value of that field's shape (a primitive for an optional field is present).
  // Out: a spread, a computed or a method member (its keys are not the literal's text), a key the record does not
  // declare (it would add a key the cell cannot hold), another source form (the table's same-shape row reads those).
  const assignLiterals = (e) => {
    const srcs = e.arguments.slice(1).map(unparen); if (!srcs.length || !srcs.every((x) => ts.isObjectLiteralExpression(x))) return null;
    const st = shapeOf(typeOf(e.arguments[0])); if (!st || st.kind !== 'rec' || st.tuple) return { why: 'assign target of no record shape' };
    const writes = [];
    for (const lit of srcs) for (const p of lit.properties) {
      if (!(ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) && !ts.isShorthandPropertyAssignment(p)) return { why: 'assign source member form' };
      const f = fieldOf(st, p.name.text); if (!f) return { why: `assign of a key the target does not declare (${p.name.text})` };
      const value = ts.isShorthandPropertyAssignment(p) ? p.name : p.initializer; const vs = isAbsent(value) ? null : shapeOf(typeOf(value));
      const fits = isAbsent(value) ? f.shape.kind === 'opt' : !!vs && (fieldD(vs) === fieldD(f.shape) && keyOf(vs) === keyOf(f.shape) || (vs.kind === 'opt' && f.shape.kind === 'opt' && vs.inner.d === f.shape.inner.d && vs.absent === f.shape.absent) || (f.shape.kind === 'opt' && vs.kind === 'prim' && vs.d === f.shape.inner.d));
      if (!fits) return { why: `assign of a value of another shape (${p.name.text})` };
      writes.push({ field: f, value });
    }
    return { st, writes };
  };
  const BINOPS = new Set([K.PlusToken, K.MinusToken, K.LessThanToken, K.LessThanEqualsToken, K.GreaterThanToken, K.GreaterThanEqualsToken, K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.AmpersandAmpersandToken, K.BarBarToken]);
  // arithmetic beyond + and -: `*`; `%` (a truncated remainder, the dividend's sign) and, in a real file, `/`, each total
  // with a zero divisor marking the world (JavaScript answers NaN or an infinity, which no int or real models); the
  // bitwise operators through the ordinary lane's total helpers (ToInt32 and ToUint32 of the operands)
  const ARITH = { [K.AsteriskToken]: '*', [K.PercentToken]: '%', [K.SlashToken]: '/', [K.AmpersandToken]: 'JsBitAnd', [K.BarToken]: 'JsBitOr', [K.CaretToken]: 'JsBitXor', [K.LessThanLessThanToken]: 'JsShl', [K.GreaterThanGreaterThanToken]: 'JsShr', [K.GreaterThanGreaterThanGreaterThanToken]: 'JsUshr' };
  const COMPOUND = { [K.PlusEqualsToken]: K.PlusToken, [K.MinusEqualsToken]: K.MinusToken, [K.AsteriskEqualsToken]: K.AsteriskToken }; // the compound writes the lint admits
  let divUsed = false; // RemT_, DivT_ and ZeroMark_ in the prelude
  const unparen = (e) => { while (ts.isParenthesizedExpression(e)) e = e.expression; return e; };
  // the receiver of a field write: on a parameter's element path (common.mjs elementWritePath) a `!` or `as T` on the
  // element is erased, as at run time, and the element itself is read; any other receiver as it stands
  const writeReceiver = (t) => { let x = t.expression; if (!elementWritePath(checker, t)) return x; while (ts.isParenthesizedExpression(x) || ts.isNonNullExpression(x) || ts.isAsExpression(x) || ts.isTypeAssertionExpression(x)) x = x.expression; return x; };
  // `xs.forEach((x) => body)` as a statement is the loop `for (const x of xs) body` (the length read once, an
  // index visited while it is below the current length; nothing in a core loop body grows an array, so the two visit
  // the same items): the statement is read through a for-of node standing for it, the callback's parameter its element
  const forEachMemo = new WeakMap();
  const forEachLoop = (s) => {
    if (forEachMemo.has(s)) return forEachMemo.get(s);
    let loop = null; const e = ts.isExpressionStatement(s) ? unparen(s.expression) : null;
    if (e && ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && !e.questionDotToken && !e.expression.questionDotToken && e.expression.name.text === 'forEach' && e.arguments.length === 1 && ts.isArrowFunction(e.arguments[0]) && shapeOf(typeOf(e.expression.expression))?.kind === 'arr') {
      const cb = e.arguments[0];
      if (cb.parameters.length === 1 && ts.isIdentifier(cb.parameters[0].name) && !cb.parameters[0].initializer && !cb.modifiers?.length) {
        const body = ts.isBlock(cb.body) ? cb.body : { kind: K.ExpressionStatement, expression: cb.body, pos: cb.body.pos, end: cb.body.end, parent: cb, flags: 0 };
        loop = { kind: K.ForOfStatement, awaitModifier: undefined, expression: e.expression.expression, initializer: { kind: K.VariableDeclarationList, flags: ts.NodeFlags.Const, declarations: [{ kind: K.VariableDeclaration, name: cb.parameters[0].name, initializer: undefined }] }, statement: body, pos: s.pos, end: s.end, parent: s.parent, flags: 0 };
      }
    }
    forEachMemo.set(s, loop); return loop;
  };
  const CB1 = new Set(['map', 'filter', 'some', 'every', 'find', 'findIndex']); // the array methods of one pure callback the core reads
  const cbBody = (cb) => (!ts.isBlock(cb.body) ? cb.body : cb.body.statements.length === 1 && ts.isReturnStatement(cb.body.statements[0]) && cb.body.statements[0].expression ? cb.body.statements[0].expression : null); // `(x) => e` or `(x) => { return e; }`
  // the string rows of the table read as pure functions of their operands: trim and replace (a string pattern) are
  // bodiless, the same on both sides; join of strings is the exact fold, join of numbers bodiless (it formats them)
  const strCall = (e) => { if (!ts.isCallExpression(e) || !ts.isPropertyAccessExpression(e.expression) || e.questionDotToken) return null; const m = e.expression.name.text, recv = typeOf(e.expression.expression); const str = (x) => !!(typeOf(x).flags & TF.StringLike);
    if (m === 'trim' && (recv.flags & TF.StringLike) && !e.arguments.length) return 'trim';
    if (m === 'replace' && (recv.flags & TF.StringLike) && e.arguments.length === 2 && e.arguments.every(str)) return 'replace';
    if (m === 'join' && e.arguments.length <= 1 && e.arguments.every(str)) { const sh = shapeOf(recv); if (sh && sh.kind === 'arr' && sh.elem.kind === 'prim' && sh.elem.d !== 'bool') return 'join'; }
    return null; };
  // the string methods read exactly through the ordinary lane's helpers (design/strings.md: the BMP envelope, so a
  // character is a code unit): a pure function of the receiver and the arguments, each argument a string or a number
  // as the method takes it. split of a literal separator allocates a fresh array of the pieces. Out: a regular
  // expression or a function argument, a split limit, lastIndexOf (its helper carries a precondition), repeat (a
  // negative count throws), the index methods in a real file (a fractional position is truncated).
  const STR_METHODS = { trimStart: [0, 0], trimEnd: [0, 0], toLowerCase: [0, 0], toUpperCase: [0, 0], split: [1, 1], includes: [1, 2], indexOf: [1, 2], startsWith: [1, 2], endsWith: [1, 2], slice: [0, 2], substring: [1, 2], charAt: [1, 1], at: [1, 1], padStart: [1, 2], padEnd: [1, 2], replaceAll: [2, 2], concat: [1, 1] };
  const strMethod = (e) => {
    if (!helper || !ts.isCallExpression(e) || !ts.isPropertyAccessExpression(e.expression) || e.questionDotToken || e.expression.questionDotToken) return null;
    const m = e.expression.name.text; if (!Object.hasOwn(STR_METHODS, m)) return null;
    if (shapeOf(typeOf(e.expression.expression))?.kind !== 'prim' || shapeOf(typeOf(e.expression.expression)).d !== 'string') return null;
    const [lo, hi] = STR_METHODS[m]; const a = e.arguments; if (a.length < lo || a.length > hi || a.some((x) => ts.isSpreadElement(x))) return null;
    const str = (x) => shapeOf(typeOf(x))?.kind === 'prim' && shapeOf(typeOf(x)).d === 'string', num = (x) => shapeOf(typeOf(x))?.kind === 'prim' && shapeOf(typeOf(x)).d !== 'string' && shapeOf(typeOf(x)).d !== 'bool';
    const lit = (x) => ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x);
    if (m === 'split') return lit(a[0]) ? m : null;
    if (m === 'replaceAll') return lit(a[0]) && str(a[1]) ? m : null;
    if (m === 'concat') return str(a[0]) ? m : null;
    if (['includes', 'indexOf', 'startsWith', 'endsWith'].includes(m)) return str(a[0]) && (!a[1] || num(a[1])) && !isReal ? m : null;
    if (['slice', 'substring', 'charAt', 'at'].includes(m)) return a.every(num) && !isReal ? m : null;
    if (m === 'padStart' || m === 'padEnd') return num(a[0]) && (!a[1] || str(a[1])) && !isReal ? m : null;
    return a.length === 0 ? m : null;
  };
  // a regular expression literal in a call: `/p/f.test(s)`, `s.replace(/p/f, r)` (and `replaceAll` with the g flag,
  // the same operation), `s.split(/p/f)`, `s.search(/p/f)`. Each is a bodiless function of the literal's text (pattern
  // and flags) and the operands, the same on both sides: equal on equal operands, nothing assumed of what it computes.
  // A literal is a fresh RegExp each time it is evaluated, so its lastIndex starts at 0 and nothing carries between
  // calls. Out: a regular expression held in a name (a global or sticky one keeps lastIndex), match and exec (they
  // return an array with index and groups), a function replacement.
  const reCall = (e) => {
    if (!ts.isCallExpression(e) || !ts.isPropertyAccessExpression(e.expression) || e.questionDotToken || e.expression.questionDotToken) return null;
    const m = e.expression.name.text, recv = unparen(e.expression.expression), a = e.arguments;
    const isRe = (x) => !!x && ts.isRegularExpressionLiteral(unparen(x)); const strT = (x) => shapeOf(typeOf(x))?.kind === 'prim' && shapeOf(typeOf(x)).d === 'string';
    if (m === 'test' && isRe(recv) && a.length === 1 && strT(a[0])) return { m, re: unparen(recv), s: a[0] };
    if (!strT(recv) || !a.length || !isRe(a[0])) return null;
    const re = unparen(a[0]); const flags = re.text.slice(re.text.lastIndexOf('/') + 1);
    if ((m === 'replace' || (m === 'replaceAll' && flags.includes('g'))) && a.length === 2 && strT(a[1])) return { m: 'replace', re, s: recv, r: a[1] };
    if ((m === 'split' || m === 'search') && a.length === 1) return { m, re, s: recv };
    return null;
  };
  // a name declared outside the unit, read as a value. A module-level `const` of a primitive shape whose initializer is
  // a constant expression (literals, the core's operators, a template, a conditional, other such constants, imported
  // bindings) is read by its initializer: exact, and a changed initializer is a changed value. An imported binding of a
  // primitive shape is a bodiless constant keyed by its module specifier and its exported name: the same import on both
  // sides is the same value (the module is the environment's, read once), another import is another constant. Out: a
  // `let` or `var` of the module (a cell the world would carry), a constant whose initializer calls or allocates (a
  // changed callee would change it under the same text), an object-valued constant (a shared heap object).
  const importKey = (d0) => { let imp = d0; while (imp && !ts.isImportDeclaration(imp)) imp = imp.parent; if (!imp || !ts.isStringLiteral(imp.moduleSpecifier)) return null; const name = ts.isImportSpecifier(d0) ? (d0.propertyName ?? d0.name).text : ts.isImportClause(d0) ? 'default' : null; return name === null ? null : `Imp_${name.replace(/[^A-Za-z0-9]/g, '_')}_${hash(imp.moduleSpecifier.text + '\0' + name)}`; };
  function outsideValue(id, depth = 0) {
    if (depth > 8) return null;
    const sh = shapeOf(typeOf(id)); if (!sh || sh.kind !== 'prim') return null;
    const sym = checker.getSymbolAtLocation(id); const d0 = sym?.declarations?.[0];
    if (d0 && (ts.isImportSpecifier(d0) || ts.isImportClause(d0))) { if (d0.isTypeOnly || d0.parent?.isTypeOnly) return null; const key = importKey(d0); return key ? { kind: 'import', key, sh } : null; }
    const d = sym?.valueDeclaration;
    if (!d || !ts.isVariableDeclaration(d) || !ts.isIdentifier(d.name) || d.getSourceFile() !== sf || d.parent?.parent?.parent !== sf || !(ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const) || !d.initializer || (ts.getCombinedModifierFlags(d) & ts.ModifierFlags.Ambient)) return null;
    return constExpr(d.initializer, depth + 1) ? { kind: 'const', init: d.initializer, sh } : null;
  }
  function constExpr(x, depth) {
    x = unparen(x);
    if (ts.isNumericLiteral(x) || ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x) || x.kind === K.TrueKeyword || x.kind === K.FalseKeyword) return true;
    if (ts.isPrefixUnaryExpression(x)) return (x.operator === K.MinusToken && ts.isNumericLiteral(unparen(x.operand)) && Number(unparen(x.operand).text.replace(/_/g, '')) !== 0) || (x.operator === K.ExclamationToken && constExpr(x.operand, depth)); // -0 is not a value the reading holds
    if (ts.isIdentifier(x)) return !!outsideValue(x, depth);
    if (ts.isTemplateExpression(x)) return x.templateSpans.every((sp) => shapeOf(typeOf(sp.expression))?.kind === 'prim' && constExpr(sp.expression, depth));
    if (ts.isConditionalExpression(x)) return isBoolT(typeOf(x.condition)) && constExpr(x.condition, depth) && constExpr(x.whenTrue, depth) && constExpr(x.whenFalse, depth);
    if (ts.isBinaryExpression(x)) { const k = x.operatorToken.kind; if (!BINOPS.has(k)) return false; if ((k === K.AmpersandAmpersandToken || k === K.BarBarToken) && !(isBoolT(typeOf(x.left)) && isBoolT(typeOf(x.right)))) return false; if (k === K.PlusToken && !((typeOf(x.left).flags & TF.NumberLike) && (typeOf(x.right).flags & TF.NumberLike)) && !((typeOf(x.left).flags & TF.StringLike) && (typeOf(x.right).flags & TF.StringLike))) return false; return constExpr(x.left, depth) && constExpr(x.right, depth); }
    return false;
  }
  // the pure globals: Math.max and Math.min (exact, the ordinary lane's Max and Min), Math.abs, Math.sign, Math.ceil,
  // Math.round (its JsAbs-style helpers), Math.floor and Math.trunc (an int is its own floor; `Math.floor(a / b)` in an
  // int file is the floor division, a zero divisor marking the world), String(x) of a primitive (the template
  // conversion), Array.isArray of an array or a primitive (true, false), Object.keys of a dictionary (a fresh array of
  // its keys in JavaScript's order, a bodiless function of the insertion sequence). Each a global of the platform, never
  // a name the file declares. Out: Math.random (the world), Number and JSON (a parse may be NaN or any), Object.keys of
  // a record (an object of a record type may hold more keys than its type names).
  const isGlobalName = (id, name) => ts.isIdentifier(id) && id.text === name && originOf(checker, id, sf, null).kind === 'global';
  const globalCall = (e) => {
    if (!ts.isCallExpression(e) || e.questionDotToken || e.arguments.some((a) => ts.isSpreadElement(a))) return null;
    const c = e.expression, a = e.arguments; const num = (x) => isNumT(typeOf(x));
    if (isGlobalName(c, 'String') && a.length === 1) { const sh = shapeOf(typeOf(a[0])); return sh && (sh.kind === 'prim' || sh.kind === 'opt') ? 'String' : null; }
    if (!ts.isPropertyAccessExpression(c) || c.questionDotToken) return null;
    const m = c.name.text;
    if (isGlobalName(c.expression, 'Math')) {
      if ((m === 'max' || m === 'min') && a.length >= 1 && a.every(num)) return `Math.${m}`;
      if (['abs', 'sign', 'ceil', 'round', 'floor', 'trunc'].includes(m) && a.length === 1 && (num(a[0]) || (['floor', 'trunc'].includes(m) && !isReal && ts.isBinaryExpression(unparen(a[0])) && unparen(a[0]).operatorToken.kind === K.SlashToken && num(unparen(a[0]).left) && num(unparen(a[0]).right)))) return `Math.${m}`;
      return null;
    }
    if (isGlobalName(c.expression, 'Array') && m === 'isArray' && a.length === 1) { const sh = shapeOf(typeOf(a[0])); return sh && (sh.kind === 'arr' || sh.kind === 'prim' || sh.kind === 'opt') ? 'Array.isArray' : null; }
    if (isGlobalName(c.expression, 'Object') && m === 'keys' && a.length === 1 && shapeOf(typeOf(a[0]))?.kind === 'dict' && shapeOf(typeOf(e))?.kind === 'arr') return 'Object.keys';
    return null;
  };
  // a negative zero: `-x` of a zero, `a * b` of a zero and a negative, a remainder or a quotient of zero with a negative
  // operand, a real rounded up to zero from below. JavaScript tells it from zero (Object.is, a division by it; lane B's
  // observation names it) and the int or real reading does not, so where it may escape the world is marked; a
  // comparison, a truthiness test or a conversion to a string absorbs it (-0 === 0, "0"), and there no mark is needed.
  // (A negative zero handed in as an input is the reading's general gap: a number is read as its value.)
  const absorbed = (e) => { let x = e; while (x.parent && ts.isParenthesizedExpression(x.parent)) x = x.parent; const p = x.parent; if (!p) return false; if (ts.isBinaryExpression(p) && [K.LessThanToken, K.LessThanEqualsToken, K.GreaterThanToken, K.GreaterThanEqualsToken, K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken].includes(p.operatorToken.kind)) return true; if (ts.isTemplateSpan(p)) return true; if ((ts.isIfStatement(p) || ts.isConditionalExpression(p)) && p.expression === x || (ts.isConditionalExpression(p) && p.condition === x)) return true; if (ts.isPrefixUnaryExpression(p) && p.operator === K.ExclamationToken) return true; if (ts.isCallExpression(p) && isGlobalName(p.expression, 'String')) return true; return false; };
  const negZeroRisk = (e) => {
    if (absorbed(e)) return false;
    if (ts.isPrefixUnaryExpression(e) && e.operator === K.MinusToken) { const o = unparen(e.operand); return !(ts.isNumericLiteral(o) && Number(o.text.replace(/_/g, '')) !== 0); }
    if (ts.isBinaryExpression(e) && [K.AsteriskToken, K.PercentToken, K.SlashToken].includes(e.operatorToken.kind)) return true;
    const g = globalCall(e); if (g === 'Math.floor' || g === 'Math.trunc') return !!floorDiv(e) || (isReal && g === 'Math.trunc');
    if (g === 'Math.round' || g === 'Math.ceil') return isReal;
    return false;
  };
  const floorDiv = (e) => { const a = unparen(e.arguments[0]); return !isReal && ts.isBinaryExpression(a) && a.operatorToken.kind === K.SlashToken ? a : null; }; // Math.floor(x / y) of an int file
  // a call of an imported function: a world transition, a bodiless `Call_<name>_<key>(hw, args): (HWorld, result)`
  // keyed by the module specifier, the exported name and the Dafny types of its arguments and result. It takes the
  // whole heap world and returns any world: it may write every object, allocate, and return an existing reference,
  // and the same import on the same world and arguments is the same transition (the environment is a function of its
  // history, which the world it returns may carry). Out: inside a loop (it could grow an array the loop walks) or a
  // callback, a function value, an async result, a spread argument; and in a file with a discriminated union (it could
  // rewrite a discriminant under a narrowing).
  const callUsed = new Map(); // key -> [argument types, result type]
  // the code a transition may run: a method of an object it reaches (an instance of a class of this file, an object
  // literal with methods built here), a function of this file handed to it as a value. The heap world holds fields,
  // not code, so every transition's key carries a hash of that code: the code reachable from the values the unit
  // containing the call touches, transitively (reach.mjs, design/hash-keys.md). A changed method the unit may reach
  // makes every transition another one (unproved), never the same transition over different code; an edit the unit
  // cannot reach leaves its transitions as they were
  const reachOf = makeReach(checker, sf);
  const unitNodes = new Set([...fns.values()].map((u) => u.node));
  const codeKeyMemo = new Map();
  const codeKey = (e) => { let n = e; while (n && !unitNodes.has(n)) n = n.parent; const k = n ?? sf; if (!codeKeyMemo.has(k)) codeKeyMemo.set(k, hash(n ? reachOf(n).code.join('\n\u0000') : sf.text)); return codeKeyMemo.get(k); };
  function outsideCall(e) {
    if (ts.isCallExpression(e) && !e.questionDotToken && !e.typeArguments && ts.isPropertyAccessExpression(e.expression) && !e.expression.questionDotToken && !e.arguments.some((a) => ts.isSpreadElement(a)) && ((shapeOf(typeOf(e.expression.expression))?.kind === 'handle' && !(ts.isIdentifier(e.expression.expression) && originOf(checker, e.expression.expression, sf, null).kind === 'global')) || (clsOf(e.expression.expression) && fns.has(`${clsOf(e.expression.expression).name.text}.${e.expression.name.text}`) && (e.expression.expression.kind !== K.ThisKeyword || replaceable(clsOf(e.expression.expression), e.expression.name.text))))) { // a method of a handle, or of another instance of a class of this file (a subclass elsewhere may override it): a transition taking the receiver first
      const rcv = shapeOf(typeOf(e.expression.expression)); const hs = rcv?.kind === 'handle' ? rcv : { name: `local:${clsOf(e.expression.expression).name.text}` }; const sig = checker.getResolvedSignature(e); if (!sig) return null;
      const rt = sig.getReturnType(); const rs = isVoidT(rt) ? { kind: 'void' } : shapeOf(rt); if (!rs) return null;
      const as = e.arguments.map((a) => (isAbsent(a) ? null : shapeOf(typeOf(a)))); if (as.some((x) => !x)) return null;
      const ds = ['Ref', ...as.map(valD)], rd = valD(rs); const m = e.expression.name.text;
      return { key: `HCall_${m.replace(/[^A-Za-z0-9]/g, '_')}_${hash(hs.name + '.' + m + '/' + ds.join(',') + '>' + rd + '#' + codeKey(e))}`, ds, rd, rs, recv: e.expression.expression };
    }
    if (!ts.isCallExpression(e) || e.questionDotToken || e.typeArguments || !ts.isIdentifier(e.expression) || e.arguments.some((a) => ts.isSpreadElement(a))) return null;
    const sym = checker.getSymbolAtLocation(e.expression); const d0 = sym?.declarations?.[0];
    if (!d0 || !(ts.isImportSpecifier(d0) || ts.isImportClause(d0)) || d0.isTypeOnly || d0.parent?.isTypeOnly) return null;
    const ik = importKey(d0); if (!ik) return null;
    const sig = checker.getResolvedSignature(e); if (!sig) return null;
    const rt = sig.getReturnType(); const rs = isVoidT(rt) ? { kind: 'void' } : shapeOf(rt); if (!rs) return null;
    const as = e.arguments.map((a) => (isAbsent(a) ? null : shapeOf(typeOf(a)))); if (as.some((x) => !x)) return null;
    const ds = as.map(valD), rd = valD(rs);
    return { key: `Call_${ik.slice(4)}_${hash(ds.join(',') + '>' + rd + '#' + codeKey(e))}`, ds, rd, rs };
  }
  // the copy forms: `new Set(xs)` of an array (its items, the first of equal ones kept), `new Set(s)` of a set and
  // `new Map(m)` of a map (the same entries in the same order), `Array.from(x)` of an array or a set (its items): each a
  // fresh cell. The source's shape must match the result's (a set of numbers from an array of numbers).
  const copyForm = (e) => {
    const isNew = ts.isNewExpression(e) && ts.isIdentifier(e.expression) && ['Map', 'Set'].includes(e.expression.text) && (e.arguments ?? []).length === 1 && originOf(checker, e.expression, sf, null).kind === 'global';
    const isFrom = ts.isCallExpression(e) && !e.questionDotToken && ts.isPropertyAccessExpression(e.expression) && isGlobalName(e.expression.expression, 'Array') && e.expression.name.text === 'from' && e.arguments.length === 1;
    if (!isNew && !isFrom) return null;
    const src = e.arguments[0]; if (ts.isSpreadElement(src)) return null; const ss = shapeOf(typeOf(src)), rs = shapeOf(typeOf(e)); if (!ss || !rs) return null;
    if (rs.kind === 'set' && ss.kind === 'arr' && keyOf(ss.elem) === keyOf(rs.elem)) return { src, from: 'arr', to: rs, ss };
    if (rs.kind === 'set' && ss.kind === 'set' && ss.key === rs.key) return { src, from: 'set', to: rs, ss };
    if (rs.kind === 'map' && ss.kind === 'map' && ss.key === rs.key) return { src, from: 'map', to: rs, ss };
    if (rs.kind === 'arr' && isFrom && (ss.kind === 'arr' || ss.kind === 'set') && keyOf(ss.elem) === keyOf(rs.elem)) return { src, from: ss.kind, to: rs, ss };
    return null;
  };
  const dedupUsed = new Set(); // set keys whose Dedup_ the prelude writes
  // a position of a tuple record read or written by a literal index: its field `_i`
  const tuplePos = (e) => { if (!ts.isElementAccessExpression(e) || e.questionDotToken) return null; const s = shapeOf(typeOf(e.expression)); const a = unparen(e.argumentExpression); if (!s?.tuple || !ts.isNumericLiteral(a) || !/^\d+$/.test(a.text) || Number(a.text) >= s.tuple) return null; return { s, field: `_${Number(a.text)}` }; };
  const impUsed = new Map(); // key -> Dafny type of each imported constant a core unit reads
  const strUsed = new Set();
  const isAbsent = (x) => { x = unparen(x); return x.kind === K.NullKeyword || (ts.isIdentifier(x) && x.text === 'undefined' && !(checker.getSymbolAtLocation(x)?.valueDeclaration?.getSourceFile() === sf)); };
  // an expression with no call, allocation or element access: it reads the heap and nothing else, so reading it eagerly is exact
  const pureExpr = (x) => { x = unparen(x); if (ts.isIdentifier(x) || ts.isNumericLiteral(x) || ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x) || [K.TrueKeyword, K.FalseKeyword, K.ThisKeyword].includes(x.kind)) return true; if (ts.isPropertyAccessExpression(x)) return pureExpr(x.expression); if (ts.isBinaryExpression(x)) return pureExpr(x.left) && pureExpr(x.right); if (ts.isPrefixUnaryExpression(x)) return pureExpr(x.operand); return false; };
  const isVoidT = (t) => !!t && !!(t.flags & TF.Void); // a declared or inferred `void` result
  const isNumT = (t) => !!(t.flags & TF.NumberLike) && !(t.flags & (TF.Undefined | TF.Null));
  const isBoolT = (t) => !!(t.flags & ts.TypeFlags.BooleanLike); // `&&` and `||` in the core are the boolean connectives; a value on either side is the ordinary translation's mixed logic
  const sameFileCall = (e) => ts.isCallExpression(e) && ts.isIdentifier(e.expression) && fns.has(e.expression.text) && !e.typeArguments;
  // `this.m(..)` in an instance method: the same-file method unit `<Class>.m`, called with `this` as its receiver
  // constructors: `new C(..)` of a class of this file (not decorated: a class decorator may return another class) runs
  // `C.constructor` when the class declares one, else allocates inline; a constructor allocates the instance first (the
  // object exists before its body runs), stores the parameter properties and the field initializers, then runs its body
  // on the fresh reference and returns it. In a constructor `this` is only written (`this.f = e`): a read could meet a
  // field not yet stored, a call could run an override of a subclass, and `this` handed anywhere escapes half-built.
  const newClass = (e) => { if (!ts.isNewExpression(e) || !ts.isIdentifier(e.expression) || e.typeArguments) return null; const sym = checker.getSymbolAtLocation(e.expression); const cd = sym?.declarations?.find((d) => ts.isClassDeclaration(d)); if (!cd || cd.getSourceFile() !== sf || !cd.name || classWhy(cd) || hasDecorator(cd) || !instanceShape(cd, 0)) return null; return cd; };
  const ctorOf = (cd) => cd.members.find((m) => ts.isConstructorDeclaration(m) && m.body);
  const ctorUnitOf = (cd) => (ctorOf(cd) && fns.has(`${cd.name.text}.constructor`) ? `${cd.name.text}.constructor` : null);
  const fieldInits = (cd) => cd.members.filter((m) => ts.isPropertyDeclaration(m) && !m.modifiers?.some((x) => x.kind === K.StaticKeyword) && m.initializer);
  const paramProps = (cd) => (ctorOf(cd)?.parameters ?? []).filter((p) => p.modifiers?.some((x) => [K.PublicKeyword, K.PrivateKeyword, K.ProtectedKeyword, K.ReadonlyKeyword].includes(x.kind)));
  const mentionsThis = (n) => { let hit = false; const w = (x) => { if (x.kind === K.ThisKeyword || x.kind === K.SuperKeyword) hit = true; if (!hit && !ts.isFunctionLike(x)) ts.forEachChild(x, w); }; w(n); return hit; };
  const ctorWhy = (cd) => { if (fieldInits(cd).some((m) => mentionsThis(m.initializer) || ts.isFunctionLike(m.initializer))) return 'a field initializer reads this or is a function'; const c = ctorOf(cd); if (!c) return null; let why = null; const w = (x) => { if (why) return; if (ts.isReturnStatement(x)) why = 'return in a constructor'; if (x.kind === K.SuperKeyword) why = 'super'; if (x.kind === K.ThisKeyword && !(x.parent && ts.isPropertyAccessExpression(x.parent) && x.parent.expression === x && x.parent.parent && ts.isBinaryExpression(x.parent.parent) && x.parent.parent.operatorToken.kind === K.EqualsToken && x.parent.parent.left === x.parent)) why = 'this read or handed in a constructor (a field may not be stored yet)'; if (!ts.isFunctionLike(x) || x === c) ts.forEachChild(x, w); }; w(c); return why; };
  const thisCall = (e, owner) => { if (!owner?.cls || owner.isStatic || owner.isCtor || !ts.isCallExpression(e) || e.typeArguments || !ts.isPropertyAccessExpression(e.expression) || e.expression.expression.kind !== K.ThisKeyword) return null; const name = `${owner.className}.${e.expression.name.text}`; const m = fns.get(name); return m && !m.accessor && !m.isCtor && !m.isStatic && !replaceable(owner.cls, e.expression.name.text) ? name : null; };
  // `c.m(..)` where `c` is a const bound to `new C(..)` in the unit: an exact instance of C (no subclass can be behind it,
  // and C is not decorated), so its method is C's own text: the core call `C.m` with `c` the receiver
  const freshCall = (e) => { if (!ts.isCallExpression(e) || e.questionDotToken || e.typeArguments || !ts.isPropertyAccessExpression(e.expression) || e.expression.questionDotToken || !ts.isIdentifier(e.expression.expression)) return null; const d = checker.getSymbolAtLocation(e.expression.expression)?.valueDeclaration; if (!d || !ts.isVariableDeclaration(d) || !(ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const) || !d.initializer) return null; const cd = newClass(unparen(d.initializer)); if (!cd) return null; const name = `${cd.name.text}.${e.expression.name.text}`; const m = fns.get(name); return m && !m.accessor && !m.isCtor && !m.isStatic && !replaceable(cd, e.expression.name.text) ? name : null; };
  const calleeOf = (e, owner) => (sameFileCall(e) ? e.expression.text : freshCall(e) ?? thisCall(e, owner)); // the same-file unit a call runs, or null
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
    if (u.isCtor) { const w = classWhy(u.cls); if (w) no(`class: ${w}`); else if (!instanceShape(u.cls, 0)) no('class: a field without a shape'); else { const cw = ctorWhy(u.cls); if (cw) no(`constructor: ${cw}`); } } else if (u.accessor) no('accessor'); else if (u.cls && u.isStatic) no('static method');
    else if (u.cls) { const w = classWhy(u.cls); if (w) no(`class: ${w}`); else if (!instanceShape(u.cls, 0)) no('class: a field without a shape'); } // an instance method: `this` is a reference to the record of the class's fields
    if (u.fn.asteriskToken || u.isAsync) no('generator or async');
    if (u.generics?.length) no('generic');
    if (recursive.has(u.name)) no('recursive');
    if (!ok) return false;
    const names = new Set(); let lambdaDepth = 0; let usesIndex = false; const loopCalls = new Set(); let callsOut = false;
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
    const proc = isVoidT(rt) || !!u.isCtor; // a procedure: it returns undefined, read as the unit value; its body may fall off its end (a constructor's too, then it returns the instance)
    if (!proc && (!rt || !shapeOf(rt))) no(`return type: ${shapeWhy(rt)}`);
    if (proc && !ts.isBlock(u.body) && !calleeOf(unparen(u.body), u)) no('expression body of a procedure (only a same-file call)');
    if (!ok) return false;
    // a record value where a dictionary is read (an initializer, an argument, a return, a field of a literal: the
    // contextual type says so): its key order is the order its fields were created in, which a record cell does not
    // hold, and a dictionary read of a record cell is empty; the unit stays in the ordinary lane (design/dict-order.md)
    { const w = (x) => { if (!ok) return; if (ts.isExpression(x) && shapeOf(typeOf(x))?.kind === 'rec') { const ct = checker.getContextualType(x); if (ct && shapeOf(ct)?.kind === 'dict') return no('a record read as a dictionary'); } ts.forEachChild(x, w); }; if (u.body) w(u.body); }
    if (!ok) return false;
    const declaredInside = (id) => { const s = checker.getSymbolAtLocation(id); const d = s?.valueDeclaration ?? s?.declarations?.[0]; return !!d && d.getSourceFile() === sf && d.pos >= u.fn.pos && d.end <= u.fn.end; };
    const checkExpr = (e0) => {
      if (!ok) return;
      const e = unparen(e0);
      if (negZeroRisk(e)) { if (lambdaDepth) return no('a negative zero inside a callback (its mark has nowhere to go)'); usesIndex = true; } // the world is marked where it may escape
      if (isAbsent(e)) return absentOk(e) ? undefined : no('undefined or null outside an optional place');
      if (ts.isIdentifier(e)) { if (e.text === HW) no('name hw_'); else if (!declaredInside(e)) { if (!outsideValue(e)) no(`outside name ${e.text}`); } else if (!shapeOf(typeOf(e))) no(`value type: ${shapeWhy(typeOf(e))}`); return; }
      if (ts.isNumericLiteral(e) || ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e) || e.kind === K.TrueKeyword || e.kind === K.FalseKeyword) return;
      if (ts.isConditionalExpression(e)) { if (!shapeOf(typeOf(e))) return no(`conditional type: ${shapeWhy(typeOf(e))}`); checkCond(e.condition); checkExpr(e.whenTrue); return checkExpr(e.whenFalse); } // c ? a : b: only the selected operand is evaluated
      if (ts.isTemplateExpression(e)) { for (const sp of e.templateSpans) { const sh = shapeOf(typeOf(sp.expression)); if (!sh || isRefShape(sh)) return no('template hole of a reference (it reads the object through toString)'); checkExpr(sp.expression); } return; } // a string concatenation, each hole by ToString
      if (e.kind === K.ThisKeyword) return u.cls && !u.isStatic ? undefined : no('this');
      if ((ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e) || ts.isCallExpression(e)) && e.questionDotToken) return no('optional chaining');
      if (ts.isPropertyAccessExpression(e) && lambdaDepth && fieldOf(shapeOf(typeOf(e.expression)) ?? {}, e.name.text)?.shape.kind === 'opt' && shapeOf(typeOf(e))?.kind !== 'opt') return no('a narrowed optional read inside a callback');
      if (ts.isPropertyAccessExpression(e)) {
        const s = shapeOf(typeOf(e.expression)); if (!s) return no(`receiver type: ${shapeWhy(typeOf(e.expression))}`);
        if (s.kind === 'prim' && s.d === 'string' && e.name.text === 'length' && helper) return checkExpr(e.expression); // a string's length: its code units (the BMP envelope)
        if (s.tuple && e.name.text === 'length') return checkExpr(e.expression); // a tuple's length is its arity
        if (s.kind === 'union') { const f = unionField(s, e.name.text); if (!f) return no(`property ${e.name.text} of a union`); if (f.shape.kind === 'opt' && shapeOf(typeOf(e))?.kind !== 'opt') usesIndex = true; return checkExpr(e.expression); } // a field every alternative declares
        if (s.kind === 'arr' ? e.name.text !== 'length' : (s.kind === 'map' || s.kind === 'set') ? e.name.text !== 'size' : !fieldOf(s, e.name.text)) return no(`property ${e.name.text}`);
        if (s.kind === 'rec' && fieldOf(s, e.name.text).shape.kind === 'opt' && shapeOf(typeOf(e))?.kind !== 'opt') usesIndex = true; // a narrowed read: its lemma shows the value is there
        return checkExpr(e.expression);
      }
      if (newClass(e)) { const cd = newClass(e); if (lambdaDepth) return no('allocation inside a callback'); const cw = ctorWhy(cd); if (cw) return no(`constructor: ${cw}`); if (ctorOf(cd) && !ctorUnitOf(cd)) return no('constructor unit'); if (!ctorUnitOf(cd)) for (const m of fieldInits(cd)) checkExpr(m.initializer); for (const a of e.arguments ?? []) checkExpr(a); return; } // a construction
      if (copyForm(e)) { if (lambdaDepth) return no('allocation inside a callback'); return checkExpr(copyForm(e).src); } // a fresh cell with the source's contents
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && !e.questionDotToken && e.expression.name.text === 'get' && e.arguments.length === 1 && shapeOf(typeOf(e.expression.expression))?.kind === 'map') { const s = shapeOf(typeOf(e.expression.expression)); if (s.v.kind !== 'prim' || shapeOf(typeOf(e))?.kind !== 'opt') return no('get of a reference value (an absent reference is not read)'); checkExpr(e.expression.expression); return checkExpr(e.arguments[0]); } // a value or absent
      if (ts.isNewExpression(e) && ts.isIdentifier(e.expression) && (e.expression.text === 'Map' || e.expression.text === 'Set') && !(e.arguments ?? []).length) { if (!shapeOf(typeOf(e))) return no(`new ${e.expression.text} type: ${shapeWhy(typeOf(e))}`); return; } // an empty cell
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && e.expression.name.text === 'has' && e.arguments.length === 1) { const s = shapeOf(typeOf(e.expression.expression)); if (!s || (s.kind !== 'map' && s.kind !== 'set')) return no('has on a non-cell'); checkExpr(e.expression.expression); return checkExpr(e.arguments[0]); }
      if (ts.isNewExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'Date') { if ((e.arguments ?? []).length !== 1 || !(typeOf(e.arguments[0]).flags & TF.NumberLike)) return no('new Date form (one time value; no argument is the clock, a string is parsing)'); if (!shapeOf(typeOf(e))) return no('new Date type'); return checkExpr(e.arguments[0]); }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && shapeOf(typeOf(e.expression.expression))?.kind === 'date') { const g = e.expression.name.text; if (e.arguments.length) return no('date method with arguments'); if (!(g === 'getTime' || g === 'valueOf' || /^getUTC(FullYear|Month|Date|Day|Hours|Minutes|Seconds|Milliseconds)$/.test(g))) return no(`date method ${g} (a local-time getter reads the host's time zone; a setter writes it)`); return checkExpr(e.expression.expression); }
      if (ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'structuredClone' && e.arguments.length === 1) { const s = shapeOf(typeOf(e.arguments[0])); if (!s || s.kind === 'prim') return no('clone of a non-cell'); const flat = s.kind === 'rec' ? s.fields.every((f) => f.shape.kind === 'prim') : s.kind === 'arr' ? s.elem.kind === 'prim' : true; if (!flat) return no('clone of a nested graph (one level of a plain cell only)'); return checkExpr(e.arguments[0]); }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && CB1.has(e.expression.name.text) && e.arguments.length === 1 && ts.isArrowFunction(e.arguments[0])) { // map and filter (the table's rows), some, every, find, findIndex: a pure one-parameter arrow with an expression body
        const m = e.expression.name.text; const s = shapeOf(typeOf(e.expression.expression)); if (!s || s.kind !== 'arr') return no(`${m} of a non-array`);
        const cb = e.arguments[0]; if (cb.parameters.length !== 1 || !ts.isIdentifier(cb.parameters[0].name) || !cbBody(cb) || cb.modifiers?.length) return no('callback form');
        if ((m === 'map' || m === 'filter') && lambdaDepth) return no('allocation inside a callback');
        if (m === 'map') { const rs = shapeOf(typeOf(e)); if (!rs || rs.kind !== 'arr') return no(`map result type: ${shapeWhy(typeOf(e))}`); }
        if (m === 'find' && (s.elem.kind !== 'prim' || shapeOf(typeOf(e))?.kind !== 'opt')) return no('find of references (an absent reference is not read)');
        if (m === 'findIndex' && isReal) return no('findIndex in a real file');
        const x = cb.parameters[0].name.text; if (names.has(x) || x === HW) return no('name reused'); if (!shapeOf(typeOf(cb.parameters[0].name))) return no('callback parameter type');
        checkExpr(e.expression.expression); names.add(x); lambdaDepth++; checkExpr(cbBody(cb)); lambdaDepth--; names.delete(x); return;
      }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && e.expression.name.text === 'reduce' && e.arguments.length === 2 && ts.isArrowFunction(e.arguments[0]) && shapeOf(typeOf(e.expression.expression))?.kind === 'arr') { // reduce with an initial value: a left fold over the items
        const cb = e.arguments[0]; if (cb.parameters.length !== 2 || !cb.parameters.every((p) => ts.isIdentifier(p.name)) || !cbBody(cb) || cb.modifiers?.length) return no('callback form');
        const [acc, x] = cb.parameters.map((p) => p.name.text); if (acc === x || names.has(acc) || names.has(x) || acc === HW || x === HW) return no('name reused');
        const as = shapeOf(typeOf(cb.parameters[0].name)); if (!as || as.kind !== 'prim' || shapeOf(typeOf(e))?.kind !== 'prim' || !shapeOf(typeOf(cb.parameters[1].name))) return no('reduce accumulator type (a primitive)');
        checkExpr(e.expression.expression); checkExpr(e.arguments[1]); names.add(acc); names.add(x); lambdaDepth++; checkExpr(cbBody(cb)); lambdaDepth--; names.delete(acc); names.delete(x); return;
      }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && ['includes', 'indexOf', 'at'].includes(e.expression.name.text) && e.arguments.length === 1 && shapeOf(typeOf(e.expression.expression))?.kind === 'arr') { // a search of the items (=== on references is identity), or an element counted from either end
        const m = e.expression.name.text; const s = shapeOf(typeOf(e.expression.expression));
        if (m !== 'includes' && isReal) return no(`${m} in a real file`);
        if (m === 'at' && (s.elem.kind !== 'prim' || !(typeOf(e.arguments[0]).flags & TF.NumberLike))) return no('at of references or by a non-number');
        if (m !== 'at' && shapeOf(typeOf(e.arguments[0]))?.key !== s.elem.key && keyOf(shapeOf(typeOf(e.arguments[0])) ?? {}) !== keyOf(s.elem)) return no(`${m} of another shape`);
        checkExpr(e.expression.expression); return checkExpr(e.arguments[0]);
      }
      if (ts.isBinaryExpression(e) && e.operatorToken.kind === K.QuestionQuestionToken) { // a ?? b: the left a value that may be absent, the right pure (it is read whatever the left holds)
        if (shapeOf(typeOf(e.left))?.kind !== 'opt') return no('?? on a value that is never absent'); if (!pureExpr(e.right)) return no('?? with a right side that calls or allocates'); if (!shapeOf(typeOf(e))) return no('?? result type'); checkExpr(e.left); return checkExpr(e.right);
      }
      if (ts.isBinaryExpression(e) && [K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.EqualsEqualsToken, K.ExclamationEqualsToken].includes(e.operatorToken.kind) && (isAbsent(e.left) || isAbsent(e.right))) { // a presence test
        const other = isAbsent(e.left) ? e.right : e.left; if (isAbsent(other)) return no('absent compared to absent'); if (shapeOf(typeOf(other))?.kind !== 'opt') return no('presence test of a value that is never absent'); return checkExpr(other);
      }
      if (ts.isBinaryExpression(e) && [K.LessThanToken, K.LessThanEqualsToken, K.GreaterThanToken, K.GreaterThanEqualsToken].includes(e.operatorToken.kind) && !(isNumT(typeOf(e.left)) && isNumT(typeOf(e.right))) && !(helper && (typeOf(e.left).flags & TF.StringLike) && (typeOf(e.right).flags & TF.StringLike))) return no('an order between values that are not both numbers or both strings'); // strings by their code units (StrLt)
      if (ts.isBinaryExpression(e) && [K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken].includes(e.operatorToken.kind)) { const a = shapeOf(typeOf(e.left)), b = shapeOf(typeOf(e.right)); if (a?.kind === 'opt' && b?.kind === 'opt' && a.absent !== b.absent) return no('=== across null and undefined (one Option would hold both absences)'); } // null !== undefined: two absences of different kinds are not one value
      if (ts.isBinaryExpression(e) && e.operatorToken.kind === K.InKeyword) { if (shapeOf(typeOf(e.right))?.kind !== 'dict' || !(typeOf(e.left).flags & TF.StringLike)) return no('in on a non-dictionary'); checkExpr(e.left); return checkExpr(e.right); }
      if (ts.isBinaryExpression(e) && Object.hasOwn(ARITH, e.operatorToken.kind)) { const k = e.operatorToken.kind; if (!isNumT(typeOf(e.left)) || !isNumT(typeOf(e.right))) return no(`operator ${e.operatorToken.getText(sf)} on a non-number`); if (k === K.SlashToken && !isReal) return no('division in an int file'); if ((k === K.SlashToken || k === K.PercentToken) && lambdaDepth) return no('division inside a callback'); if (k === K.SlashToken || k === K.PercentToken) usesIndex = true; checkExpr(e.left); return checkExpr(e.right); } // a zero divisor marks the world: the lemma shows it never does
      if (ts.isBinaryExpression(e)) { if (!BINOPS.has(e.operatorToken.kind)) return no(`operator ${e.operatorToken.getText(sf)}`); if ((e.operatorToken.kind === K.AmpersandAmpersandToken || e.operatorToken.kind === K.BarBarToken) && !(isBoolT(typeOf(e.left)) && isBoolT(typeOf(e.right)))) return no('logic on values'); if (e.operatorToken.kind === K.PlusToken && !((typeOf(e.left).flags & TF.NumberLike) && (typeOf(e.right).flags & TF.NumberLike)) && !((typeOf(e.left).flags & TF.StringLike) && (typeOf(e.right).flags & TF.StringLike))) return no('mixed + (a number joined to a string converts it)'); checkExpr(e.left); checkExpr(e.right); return; }
      if (ts.isPrefixUnaryExpression(e) && [K.MinusToken, K.PlusToken, K.TildeToken].includes(e.operator)) { if (!isNumT(typeOf(e.operand))) return no('prefix operator on a non-number (a conversion)'); return checkExpr(e.operand); } // a negative zero is equal to zero under ===, and every division by it marks the world
      if (ts.isPrefixUnaryExpression(e)) { if (e.operator !== K.ExclamationToken) return no('prefix operator'); return checkCond(e.operand); }
      if ((ts.isArrayLiteralExpression(e) || ts.isObjectLiteralExpression(e) || ts.isNewExpression(e)) && lambdaDepth) return no('allocation inside a callback');
      if (ts.isArrayLiteralExpression(e) && arrShape(e)?.tuple) { if (e.elements.length !== arrShape(e).tuple || e.elements.some((x) => ts.isSpreadElement(x))) return no('tuple literal form'); for (const x of e.elements) checkExpr(x); return; } // a tuple literal: one record of its positions
      if (ts.isArrayLiteralExpression(e)) { if (!arrShape(e)) return no(`array literal type: ${shapeWhy(typeOf(e))}`); for (const x of e.elements) checkExpr(ts.isSpreadElement(x) ? x.expression : x); return; }
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
      if (outsideCall(e)) { if (lambdaDepth) return no('a call outside the file inside a callback'); callsOut = true; if (outsideCall(e).recv) checkExpr(outsideCall(e).recv); for (const a of e.arguments) checkExpr(a); return; } // a world transition
      if (globalCall(e)) { const g = globalCall(e); if (g === 'Object.keys' && lambdaDepth) return no('allocation inside a callback'); const fd = (g === 'Math.floor' || g === 'Math.trunc') ? floorDiv(e) : null; if (fd) { if (lambdaDepth) return no('division inside a callback'); usesIndex = true; checkExpr(fd.left); return checkExpr(fd.right); } for (const a of e.arguments) checkExpr(a); return; } // a pure global
      if (reCall(e)) { const rc = reCall(e); if (rc.m === 'split' && lambdaDepth) return no('allocation inside a callback'); if (isReal && rc.m === 'search') return no('search in a real file'); checkExpr(rc.s); if (rc.r) checkExpr(rc.r); return; } // a regular expression literal: uninterpreted
      if (strMethod(e)) { if (strMethod(e) === 'split' && lambdaDepth) return no('allocation inside a callback'); checkExpr(e.expression.expression); for (const a of e.arguments) checkExpr(a); return; } // a string method of the ordinary lane's exact readings
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
      if (tuplePos(e)) return checkExpr(e.expression); // a tuple's position: a field
      if (ts.isElementAccessExpression(e)) { const why = elementWhy(e); if (why) return no(why); if (!safeIndex.has(e)) usesIndex = true; checkExpr(e.expression); return checkExpr(e.argumentExpression); }
      no(`expression ${K[e.kind]}`);
    };
    const checkTarget = (t0) => {
      const t = unparen(t0);
      if (ts.isIdentifier(t)) return checkExpr(t);
      if (tuplePos(t)) return checkExpr(t.expression);
      if (ts.isElementAccessExpression(t)) { const why = elementWhy(t); if (why) return no(why.replace('element access', 'element write')); if (!safeIndex.has(t) && shapeOf(typeOf(t.expression)).kind !== 'dict') usesIndex = true; checkExpr(t.expression); return checkExpr(t.argumentExpression); }
      if (ts.isPropertyAccessExpression(t)) { const s = shapeOf(typeOf(t.expression)); if (!s || s.kind !== 'rec' || !fieldOf(s, t.name.text)) return no('write target'); return checkExpr(writeReceiver(t)); } // a field of a parameter's element: the element read, then the store
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
        if (forEachLoop(s)) { checkLoop(forEachLoop(s), loop); continue; }
        if (ts.isForOfStatement(s) || ts.isForStatement(s)) { checkLoop(s, loop); continue; }
        if (loop && (ts.isReturnStatement(s) || ts.isBreakStatement(s) || ts.isContinueStatement(s))) return no(ts.isReturnStatement(s) ? 'return inside a loop' : 'break or continue');
        if (loop && ts.isIfStatement(s)) { checkCond(s.expression); checkStmts(block(s.thenStatement), loop); if (s.elseStatement) checkStmts(block(s.elseStatement), loop); continue; }
        if (loop) { let ext = false; const w = (n) => { if (outsideCall(n)) ext = true; ts.forEachChild(n, w); }; w(s); if (ext) return no('a call outside the file in a loop body (it could grow the array)'); }
        if (loop && ts.isExpressionStatement(s)) { const e = unparen(s.expression); if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && (['push', 'unshift'].includes(e.expression.name.text) || (e.expression.name.text === 'splice' && e.arguments.length > 2)) && shapeOf(typeOf(e.expression.expression))?.kind === 'arr') return no('loop body grows an array'); const c = calleeOf(e, u); if (c) loop.calls.add(c); }
        if (ts.isVariableStatement(s)) {
          for (const d of s.declarationList.declarations) { if (!ts.isIdentifier(d.name) || !d.initializer) return no('binding form'); if (d.name.text === HW || names.has(d.name.text)) return no('name reused'); if (/_$/.test(d.name.text)) return no('name ending in an underscore (the generated names do)'); if (!shapeOf(typeOf(d.name))) return no(`local type: ${shapeWhy(typeOf(d.name))}`); names.add(d.name.text); checkExpr(d.initializer); }
          continue;
        }
        if (ts.isReturnStatement(s)) { if (!s.expression !== proc) return no(proc ? 'a value returned from a procedure' : 'bare return'); if (i !== list.length - 1) return no('statement after return'); return s.expression ? checkExpr(s.expression) : undefined; }
        if (proc && ts.isIfStatement(s)) { checkCond(s.expression); checkStmts(block(s.thenStatement)); if (s.elseStatement) checkStmts(block(s.elseStatement)); continue; } // a branch of a procedure may fall through to the rest
        if (ts.isIfStatement(s)) {
          checkCond(s.expression);
          const t = block(s.thenStatement); checkStmts(t); if (!endsWithReturn(t)) return no('if branch without return');
          if (s.elseStatement) { const el = block(s.elseStatement); checkStmts(el); if (!endsWithReturn(el)) return no('if branch without return'); if (i !== list.length - 1) return no('statement after if/else'); }
          continue;
        }
        if (ts.isExpressionStatement(s)) {
          const e = unparen(s.expression);
          if (ts.isBinaryExpression(e) && (e.operatorToken.kind === K.EqualsToken || Object.hasOwn(COMPOUND, e.operatorToken.kind))) { const k = e.operatorToken.kind; if (k !== K.EqualsToken && targetShape(e.left)?.kind === 'opt') return no('compound write of a value that may be absent'); if (k !== K.EqualsToken && k !== K.PlusEqualsToken && (!isNumT(typeOf(e.left)) || !isNumT(typeOf(e.right)))) return no('compound write on a non-number'); if (k === K.PlusEqualsToken && !((typeOf(e.left).flags & TF.NumberLike) && (typeOf(e.right).flags & TF.NumberLike)) && !((typeOf(e.left).flags & TF.StringLike) && (typeOf(e.right).flags & TF.StringLike))) return no('mixed += (a number joined to a string converts it)'); if (k === K.AsteriskEqualsToken) usesIndex = true; checkTarget(e.left); checkExpr(e.right); continue; } // *= stores a product, which may be a negative zero
          if ((ts.isPostfixUnaryExpression(e) || ts.isPrefixUnaryExpression(e)) && [K.PlusPlusToken, K.MinusMinusToken].includes(e.operator)) { if (targetShape(e.operand)?.kind === 'opt' || !isNumT(typeOf(e.operand))) return no('update of a non-number'); checkTarget(e.operand); continue; } // x++ as a statement is x += 1
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
          if (isAssignCall(e) && assignLiterals(e)) { const al = assignLiterals(e); if (al.why) return no(al.why); checkExpr(e.arguments[0]); for (const x of al.writes) checkExpr(x.value); continue; } // literal sources: field writes on the target's node
          if (isAssignCall(e)) { // the table's row: the target's cell takes the source's; same shape only
            if (e.arguments.length !== 2) return no('assign arity'); const st = shapeOf(typeOf(e.arguments[0])), ss = shapeOf(typeOf(e.arguments[1]));
            if (!st || !ss || st.kind !== 'rec' || st.key !== ss.key) return no('assign shapes'); checkExpr(e.arguments[0]); checkExpr(e.arguments[1]); continue;
          }
          if (calleeOf(e, u)) { for (const a of e.arguments) checkExpr(a); continue; }
          if (outsideCall(e)) { checkExpr(e); continue; } // a transition as a statement: its world kept, its result dropped
          return no(ts.isCallExpression(e) ? (ts.isPropertyAccessExpression(e.expression) ? `call .${e.expression.name.text}` : 'call outside the file') : `expression statement ${K[e.kind]}`);
        }
        return no(`statement ${K[s.kind]}`);
      }
    };
    if (u.isCtor) for (const m of fieldInits(u.cls)) checkExpr(m.initializer); // the field initializers run before the body
    if (!ts.isBlock(u.body)) checkExpr(u.body); // an expression body is the value it returns
    else { const body = [...u.body.statements]; checkStmts(body); if (!proc && !endsWithReturn(body)) no('path without return'); }
    if (ok && usesIndex) indexUnits.add(u.name);
    if (ok && callsOut) outUnits.add(u.name);
    if (ok && loopCalls.size) loopCallsOf.set(u.name, loopCalls);
    return ok;
  }
  const indexUnits = new Set(); // units that access an element themselves
  const outUnits = new Set(); // units that call outside the file themselves
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
  // why a type has no shape: the first offending part, for the census. A type met again while it is open is a
  // recursive shape (a tree of nodes): named, never descended twice (the walk would not end)
  function shapeWhy(t, open = new Set()) {
    if (!t) return 'none';
    if (open.has(t)) return 'recursive shape';
    open = new Set(open).add(t);
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
    if (checker.isArrayType(t)) return `array of ${shapeWhy(checker.getTypeArguments(t)[0], open)}`;
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
        if (!shapeOf(ft, 1)) return `field ${p.name}: ${shapeWhy(ft, open)}`;
      }
      return 'depth';
    }
    return 'other';
  }
  let core = new Set();
  let inrange = new Set(); // core units whose lemma must also show no element access out of range, on either side
  const callsOf = (u) => { const calls = new Set(); const w = (n) => { const c = calleeOf(n, u) ?? (newClass(n) ? ctorUnitOf(newClass(n)) : null); if (c) calls.add(c); else if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) { const cd = classDeclOf(nonNull(checker.getTypeAtLocation(n.expression.expression))[0]); const name = cd && `${cd.name.text}.${n.expression.name.text}`; if (name && fns.has(name)) calls.add(name); } ts.forEachChild(n, w); }; w(u.body); return calls; }; // a call of a method on another instance of a same-file class is an edge too: its caller decides its convention
  function plan(order, only) {
    const own = new Set(order.filter((u) => coreUnit(u) && (!only || only.includes(u.name))).map((u) => u.name));
    // a unit named as a VALUE anywhere (`.then(bump)`, a callback argument, a stored function) keeps its layer-1 signature: out of the core
    const asValue = new Set();
    for (const u of order) { const w = (n) => { if (ts.isPropertyAccessExpression(n) && !(n.parent && ts.isCallExpression(n.parent) && n.parent.expression === n)) { const cd = classDeclOf(nonNull(checker.getTypeAtLocation(n.expression))[0]); const name = cd && `${cd.name.text}.${n.name.text}`; if (name && fns.has(name)) asValue.add(name); } if (ts.isIdentifier(n) && fns.has(n.text) && !(n.parent && ts.isCallExpression(n.parent) && n.parent.expression === n) && !(n.parent && ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) && !(n.parent && (ts.isFunctionDeclaration(n.parent) || ts.isVariableDeclaration(n.parent)) && n.parent.name === n)) asValue.add(n.text); ts.forEachChild(n, w); }; w(u.body); }
    for (const name of asValue) if (own.has(name)) { own.delete(name); whyNot.get(name)?.add('named as a value'); }
    // a write to the discriminant of a union alternative's constructor (a field write, an update, Object.assign onto it)
    // would let a narrowed reference read another alternative's cell: a unit that may write one stays out
    const discPairs = new Set(), altKeys = new Set(); for (const un of unionsSeen.values()) for (const a of un.alts) { discPairs.add(`${a.shape.key}.${un.disc}`); altKeys.add(a.shape.key); }
    if (unionsSeen.size) { // an outside call could rewrite a discriminant: in a file with a union, a unit that may call outside stays out
      const ext = new Set(outUnits); for (let more = true; more;) { more = false; for (const u of order) if (!ext.has(u.name) && [...callsOf(u)].some((c) => ext.has(c))) { ext.add(u.name); more = true; } }
      for (const n of ext) if (own.has(n)) { own.delete(n); whyNot.get(n)?.add('calls outside the file in a file with a discriminated union'); }
    }
    if (discPairs.size) for (const u of order) {
      if (!own.has(u.name)) continue; let hit = false;
      const w = (n) => { if (hit) return; let t = null; if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment) t = unparen(n.left); if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && [K.PlusPlusToken, K.MinusMinusToken].includes(n.operator)) t = unparen(n.operand); if (t && ts.isPropertyAccessExpression(t) && discPairs.has(`${shapeOf(typeOf(t.expression))?.key}.${t.name.text}`)) hit = true; if (isAssignCall(n) && n.arguments[0] && altKeys.has(shapeOf(typeOf(n.arguments[0]))?.key)) hit = true; ts.forEachChild(n, w); };
      w(u.body); if (hit) { own.delete(u.name); whyNot.get(u.name)?.add('writes the discriminant of a union alternative'); }
    }
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
      const w = (n) => { if (isAssignCall(n) && assignLiterals(n) && !assignLiterals(n).why) { w(n.arguments[0]); for (const x of assignLiterals(n).writes) w(x.value); return; } // a literal source is no allocation: its values are written into the target's node
        if (strMethod(n) === 'split' || reCall(n)?.m === 'split') register(shapeOf(typeOf(n))); if (ts.isCallExpression(n) || ts.isNewExpression(n) || ts.isConditionalExpression(n) || (ts.isBinaryExpression(n) && n.operatorToken.kind === K.QuestionQuestionToken)) register(shapeOf(typeOf(n))); if (ts.isArrayLiteralExpression(n)) register(arrShape(n)); else if (ts.isIdentifier(n) || ts.isPropertyAccessExpression(n)) register(shapeOf(typeOf(n))); if (ts.isObjectLiteralExpression(n)) register(litShape(n)); ts.forEachChild(n, w); };
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
    const dq = (v, d) => (d === 'string' ? '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"' : isReal ? `${v}.0` : String(v));
    for (const [uk, u] of [...unions].sort()) { // a union: the cell is one of the alternatives' constructors with one of its discriminant values
      out.push(`predicate Is${uk}(hw: HWorld, r: Ref) { ${u.alts.map((a) => `(Is${a.shape.key}(hw, r) && (${a.values.map((v) => `Get_${a.shape.key}_${dn(u.disc)}(hw, r) == ${dq(v, u.d)}`).join(' || ')}))`).join(' || ')} }`);
      for (const f of u.alts[0].shape.fields) { if (!unionField(u, f.name)) continue; const T = fieldD(f.shape); out.push(`function GetU_${uk}_${dn(f.name)}(hw: HWorld, r: Ref): ${T} { ${u.alts.map((a) => `if Is${a.shape.key}(hw, r) then Get_${a.shape.key}_${dn(f.name)}(hw, r) else `).join('')}${fieldDflt(f.shape)} }`); }
    }
    if (strUsed.has('trim')) out.push('function StrTrim(s: string): string'); // String.prototype.trim: a function of the string alone
    if (strUsed.has('replace')) out.push('function StrReplace(s: string, a: string, b: string): string'); // replace with a string pattern: the first match, the replacement's $ patterns included, a function of the three
    if (strUsed.has('join_string')) out.push('function JoinStr(xs: seq<string>, sep: string): string decreases |xs| { if |xs| == 0 then "" else if |xs| == 1 then xs[0] else xs[0] + sep + JoinStr(xs[1..], sep) }');
    for (const d of ['int', 'real']) if (strUsed.has(`join_${d}`)) out.push(`function JoinNum_${d}(xs: seq<${d}>, sep: string): string`); // numbers are formatted first: bodiless
    for (const [key, [ds, rd]] of [...callUsed].sort()) out.push(`function ${key}(hw: HWorld${ds.map((d, i) => `, a${i}: ${d}`).join('')}): (HWorld, ${rd})`); // an outside call: a transition of the whole heap world
    for (const [key, d] of [...impUsed].sort()) out.push(`function ${key}(): ${d}`); // an imported constant: the environment's value, the same on both sides
    if (divUsed) { // a zero divisor: JavaScript answers NaN or an infinity; the world is marked and the value is a default
      out.push(`function ZeroMark_${NUM}(hw: HWorld, d: ${NUM}): HWorld { if d == ${isReal ? '0.0' : '0'} then hw.(oob := true) else hw }`);
      out.push('function NegZeroMark(hw: HWorld, z: bool): HWorld { if z then hw.(oob := true) else hw }'); // a negative zero may escape: not modelled from there
      out.push(isReal ? 'function RemT_real(a: real, b: real): real { if b == 0.0 then 0.0 else a - b * (TruncR(a / b) as real) }' : 'function RemT_int(a: int, b: int): int { if b == 0 then 0 else a - b * TruncDivI(a, b) }'); // the remainder of a truncated division: the dividend's sign
      if (isReal) out.push('function DivT_real(a: real, b: real): real { if b == 0.0 then 0.0 else a / b }');
      else { out.push('function TruncDivI(a: int, b: int): int requires b != 0 { var q := (if a >= 0 then a else -a) / (if b >= 0 then b else -b); if (a >= 0) == (b >= 0) then q else -q }'); out.push('function TruncDivT(a: int, b: int): int { if b == 0 then 0 else TruncDivI(a, b) }'); out.push('function FloorDivT(a: int, b: int): int { if b == 0 then 0 else var q := TruncDivI(a, b); if a - b * q != 0 && (a < 0) != (b < 0) then q - 1 else q }'); } // Math.trunc and Math.floor of an int division
    }
    if (isReal && (divUsed || strUsed.has('truncr'))) out.push('function TruncR(a: real): int { if a < 0.0 then -(-a).Floor else a.Floor }'); // the truncation of a real toward zero
    if (strUsed.has('dictkeys')) out.push('function DictKeysJs(keys: seq<string>): seq<string>'); // Object.keys of a dictionary: integer-like keys first, ascending, then the rest in insertion order: a function of the insertion sequence
    if (strUsed.has('re_test')) out.push('function ReTest(re: string, s: string): bool'); // RegExp.prototype.test of a literal: a function of its text and the input
    if (strUsed.has('re_replace')) out.push('function ReReplace(re: string, s: string, r: string): string'); // replace by a literal regular expression, the replacement's $ patterns included
    if (strUsed.has('re_split')) out.push('function ReSplit(re: string, s: string): seq<string>'); // split by a literal regular expression: the pieces (captures included)
    if (strUsed.has('re_search')) out.push(`function ReSearch(re: string, s: string): ${NUM}`); // the index of the first match, or -1
    for (const d of ['int', 'real']) if (strUsed.has(`numstr_${d}`)) out.push(`function NumStr_${d}(n: ${d}): string`); // Number::toString: a function of the number alone, bodiless
    if (keys.some((k) => shapes.get(k).kind === 'dict')) out.push(`const ObjectProtoNames: set<string> := {${OBJECT_PROTO.map((x) => JSON.stringify(x)).join(', ')}}`); // Object.getOwnPropertyNames(Object.prototype)
    const cellOk = (k) => { const s = shapes.get(k); const conds = []; if (s.kind === 'arr') { if (s.elem.kind !== 'prim') conds.push(`(forall i :: 0 <= i < |o.items_${k}| ==> Is${keyOf(s.elem)}(hw, o.items_${k}[i]))`); } else if (s.kind === 'date' || s.kind === 'dict') { /* primitive contents */ } else if (s.kind === 'set') { if (s.elem.kind !== 'prim') conds.push(`(forall i :: 0 <= i < |o.items_${k}| ==> Is${keyOf(s.elem)}(hw, o.items_${k}[i]))`); } else if (s.kind === 'map') { if (s.v.kind !== 'prim') conds.push(`(forall x :: x in o.m_${k}.Values ==> Is${keyOf(s.v)}(hw, x))`); if (s.k.kind !== 'prim') conds.push(`(forall x :: x in o.m_${k}.Keys ==> Is${keyOf(s.k)}(hw, x))`); } else for (const f of s.fields) if (isRefShape(f.shape)) conds.push(`Is${keyOf(f.shape)}(hw, o.${fld(f.name)})`); return conds.length ? conds.join(' && ') : 'true'; };
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
        if (isReal) out.push(`function ItemAt_${k}(hw: HWorld, r: Ref, i: int): ${E} { if Is${k}(hw, r) && 0 <= i < |hw.heap[r].items_${k}| then hw.heap[r].items_${k}[i] else ${dflt(s.elem)} }`); // a for-of loop's item in a real file, read under its guard
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
        if (dedupUsed.has(k)) out.push(`function {:fuel 3} Dedup_${k}(xs: seq<${E}>, acc: seq<${E}>): seq<${E}> decreases |xs| { if |xs| == 0 then acc else Dedup_${k}(xs[1..], if xs[0] in acc then acc else acc + [xs[0]]) }`); // new Set(xs): the first of equal items kept, in order
        out.push(instantiate(LIBRARY.helpers['RemoveItem_<K>'], k, E));
        for (const op of ['Set.prototype.add', 'Set.prototype.has', 'Set.prototype.delete']) out.push(instantiate(LIB_ROW[op].dafny, k, E));
        out.push(`function SetSize_${k}(hw: HWorld, r: Ref): ${NUM} { if Is${k}(hw, r) then |hw.heap[r].items_${k}|${isReal ? ' as real' : ''} else ${isReal ? '0.0' : '0'} }`);
        out.push(`function Items_${k}(hw: HWorld, r: Ref): seq<${E}> { if Is${k}(hw, r) then hw.heap[r].items_${k} else [] }`); // a spread of a Set cell: its items in insertion order
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
    // a set of references or a map keyed by references holds edges the naming walk does not follow: no canonical
    // certificate (only the whole-heap one) when the file has one
    if (keys.some((k) => { const sh = shapes.get(k); return (sh.kind === 'set' && sh.elem.kind !== 'prim') || (sh.kind === 'map' && sh.k.kind !== 'prim'); })) return out;
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
    let temp = 0; let inLam = 0; // inLam: inside a callback's body, which is a Dafny lambda (no binding can leave it)
    const lines = []; // hoisted let lines of the region being built
    const fresh = (p) => `${p}${temp++}_`;
    const sig = checker.getSignatureFromDeclaration(u.fn);
    const proc = isVoidT(sig.getReturnType()); const rt = proc ? { kind: 'void' } : shapeOf(sig.getReturnType()); // a procedure returns the unit value
    const shapeExpr = (e) => shapeOf(typeOf(e));
    const strEsc = (s) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
    const num = (text) => { const t = text.replace(/_/g, ''); if (/^0[xob]/i.test(t)) return String(Number(t)) + (isReal ? '.0' : ''); return isReal && !t.includes('.') ? `${t}.0` : t; };
    // values that may be absent: an expression's code has the shape of its type at its place (TypeScript narrows a
    // name or a field read after a presence test); a narrowed name unwraps with a default it never reaches (a local is
    // narrowed soundly: nothing else writes it), a narrowed field read marks the world when it finds no value (another
    // name of the same record, or a call, may have cleared it since the test)
    const locShape = (x) => shapeOf(typeOf(x));
    const inUnit = (id) => { const sym = checker.getSymbolAtLocation(id); const d = sym?.valueDeclaration ?? sym?.declarations?.[0]; return !!d && d.getSourceFile() === sf && d.pos >= u.fn.pos && d.end <= u.fn.end; }; // a name of the unit (a parameter, a local), else one from outside it
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
    // ToString of a template hole: a string is itself, a boolean its name, a number a function of the number
    // alone (bodiless: the same on both sides, nothing assumed of its digits), absent its name "undefined" or "null"
    const primStr = (c, sh) => { if (sh.d === 'string') return c; if (sh.d === 'bool') return `(if ${c} then "true" else "false")`; strUsed.add(`numstr_${sh.d}`); return `NumStr_${sh.d}(${c})`; };
    function toStr(x) {
      const sh = locShape(x); const lit = unparen(x);
      if (sh.kind === 'prim' && ts.isNumericLiteral(lit)) return strEsc(String(Number(lit.text.replace(/_/g, ''))));
      if (sh.kind === 'prim') return primStr(expr(x), sh);
      const o = bind(expr(x), 't'); return `(if (${o}).Some? then ${primStr(`(${o}).value`, sh.inner)} else ${sh.absent === 'n' ? '"null"' : '"undefined"'})`;
    }
    function expr(e0) {
      const e = unparen(e0);
      if (isAbsent(e)) return absentCode(e, shapeOf(checker.getContextualType(e)));
      if (ts.isIdentifier(e) && !inUnit(e)) { const ov = outsideValue(e); if (ov.kind === 'const') return `(${expr(ov.init)})`; impUsed.set(ov.key, ov.sh.d); return `${ov.key}()`; } // a module constant by its initializer, an import by its key
      if (ts.isIdentifier(e)) { const ds = declShape(e), ls = locShape(e); if (ds?.kind === 'opt' && ls && ls.kind !== 'opt') return `OptOr(${dn(e.text)}, ${dflt(ls)})`; return dn(e.text); }
      if (e.kind === K.ThisKeyword) return dn('this');
      if (ts.isNumericLiteral(e)) return num(e.text);
      if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return strEsc(e.text);
      if (ts.isTemplateExpression(e)) { const parts = e.head.text ? [strEsc(e.head.text)] : []; for (const sp of e.templateSpans) { parts.push(toStr(sp.expression)); if (sp.literal.text) parts.push(strEsc(sp.literal.text)); } return `(${parts.join(' + ')})`; } // an empty literal part is left out: "" + s is s, which the prover reads only through extensionality
      if (e.kind === K.TrueKeyword) return 'true';
      if (e.kind === K.FalseKeyword) return 'false';
      if (ts.isConditionalExpression(e)) { // the condition, then the selected operand only: an operand's allocations and marks stay inside its branch
        const sh = locShape(e); const c = cond(e.condition); const saved = lines.splice(0);
        const a = exprAs(e.whenTrue, sh); const la = lines.splice(0); const b = exprAs(e.whenFalse, sh); const lb = lines.splice(0); lines.push(...saved);
        if (!la.length && !lb.length) return `(if ${c} then ${a} else ${b})`;
        const q = fresh('q'); const arm = (ls, v) => `(${[...ls, `(${HW}, ${v})`].join(' ')})`;
        lines.push(`var (${HW}, ${q}) := if ${c} then ${arm(la, a)} else ${arm(lb, b)};`); return q;
      }
      if (ts.isPropertyAccessExpression(e)) {
        const s = shapeExpr(e.expression);
        const r = expr(e.expression);
        if (s.kind === 'prim' && s.d === 'string') return isReal ? `(|${r}| as real)` : `|${r}|`; // the code units of a BMP string
        if (s.tuple && e.name.text === 'length') return isReal ? `${s.tuple}.0` : `${s.tuple}`;
        if (s.kind === 'arr') return `Len_${s.key}(${HW}, ${r})`;
        if (s.kind === 'map') return `MapSize_${s.key}(${HW}, ${r})`;
        if (s.kind === 'set') return `SetSize_${s.key}(${HW}, ${r})`;
        const raw = `${s.kind === 'union' ? 'GetU' : 'Get'}_${s.key}_${dn(e.name.text)}(${HW}, ${r})`; const f = s.kind === 'union' ? unionField(s, e.name.text) : fieldOf(s, e.name.text);
        if (f.shape.kind !== 'opt') return raw;
        const o = f.shape.absent === 'u' ? `PresOpt(${raw})` : raw; const ls = locShape(e);
        if (ls && ls.kind !== 'opt') { const v = bind(o, 'p'); lines.push(`var ${HW} := OptMark(${HW}, ${v});`); return `OptOr(${v}, ${dflt(ls)})`; }
        return o;
      }
      if (ts.isElementAccessExpression(e) && shapeExpr(e.expression).kind === 'dict') { const [s, r, i] = element(e); return dictRead(s, r, i); }
      if (ts.isBinaryExpression(e) && e.operatorToken.kind === K.InKeyword) { const key = expr(e.left); const s = shapeExpr(e.right); return `DictIn_${s.key}(${HW}, ${expr(e.right)}, ${key})`; }
      if (ts.isObjectLiteralExpression(e) && litShape(e)?.kind === 'dict') { const s = litShape(e); const r = fresh('r'); lines.push(`var (${HW}, ${r}) := Alloc_${s.key}(${HW}, [], map[], true);`); return r; }
      if (tuplePos(e)) { const tp = tuplePos(e); return `Get_${tp.s.key}_${dn(tp.field)}(${HW}, ${expr(e.expression)})`; }
      if (ts.isElementAccessExpression(e)) { const [s, r, i] = element(e); if (!safeIndex.has(e)) lines.push(`var ${HW} := Oob_${s.key}(${HW}, ${r}, ${i});`); return `Idx_${s.key}(${HW}, ${r}, ${i})`; } // the receiver, then the index, once each; an index loop's own a[i] is in range by its guard
      if (newClass(e)) { const cd = newClass(e); const cu = ctorUnitOf(cd); const sh = instanceShape(cd, 0);
        if (cu) { const ps = fns.get(cu).params; const args = ps.map((p, j) => { const ash = shapeOf(typeOf(p.name)); return e.arguments?.[j] ? exprAs(e.arguments[j], ash) : `Option<${ash.inner.d}>.None`; }); const r = fresh('c'); lines.push(`var (${HW}, ${r}) := ${fname(cu)}(${[HW, ...args].join(', ')});`); return r; }
        const r = fresh('r'); lines.push(`var (${HW}, ${r}) := Alloc_${sh.key}(${HW}, ${sh.fields.map((f) => fieldDflt(f.shape)).join(', ')});`); for (const m of fieldInits(cd)) { const f = fieldOf(sh, m.name.text); lines.push(`var ${HW} := Set_${sh.key}_${dn(f.name)}(${HW}, ${r}, ${exprField(m.initializer, f.shape)});`); } return r; } // allocated first, then the initializers in order
      if (copyForm(e)) { const c = copyForm(e); const r = bind(expr(c.src), 'o'); const out = fresh('r'); const items = c.from === 'map' ? null : `(if Is${c.ss.key}(${HW}, ${r}) then ${HW}.heap[${r}].items_${c.ss.key} else [])`;
        if (c.from === 'map') lines.push(`var (${HW}, ${out}) := Alloc_${c.to.key}(${HW}, (if Is${c.ss.key}(${HW}, ${r}) then ${HW}.heap[${r}].keys_${c.ss.key} else []), (if Is${c.ss.key}(${HW}, ${r}) then ${HW}.heap[${r}].m_${c.ss.key} else map[]));`);
        else if (c.to.kind === 'set' && c.from === 'arr') { dedupUsed.add(c.to.key); lines.push(`var (${HW}, ${out}) := Alloc_${c.to.key}(${HW}, Dedup_${c.to.key}(${items}, []));`); }
        else lines.push(`var (${HW}, ${out}) := Alloc_${c.to.key}(${HW}, ${items});`);
        return out; }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && e.expression.name.text === 'get' && e.arguments.length === 1 && shapeExpr(e.expression.expression)?.kind === 'map') { const s = shapeExpr(e.expression.expression); const r = expr(e.expression.expression); return `MapGet_${s.key}(${HW}, ${r}, ${expr(e.arguments[0])})`; }
      if (ts.isNewExpression(e) && ts.isIdentifier(e.expression) && (e.expression.text === 'Map' || e.expression.text === 'Set')) { const s = shapeExpr(e); const r = fresh('r'); lines.push(`var (${HW}, ${r}) := Alloc_${s.key}(${HW}, ${s.kind === 'map' ? '[], map[]' : '[]'});`); return r; }
      if (ts.isNewExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'Date') { const s = shapeExpr(e); const r = fresh('r'); lines.push(`var (${HW}, ${r}) := Alloc_${s.key}(${HW}, ${expr(e.arguments[0])});`); return r; }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && shapeExpr(e.expression.expression)?.kind === 'date') { const s = shapeExpr(e.expression.expression); const r = expr(e.expression.expression); const g = e.expression.name.text; if (g === 'getTime' || g === 'valueOf') return `Get_${s.key}_tv(${HW}, ${r})`; dateGetters.add(g); return `DateUTC_${g}(Get_${s.key}_tv(${HW}, ${r}))`; }
      if (ts.isCallExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'structuredClone') { // a fresh cell with the source's own contents (HTML 2.7.4, one level: the lint admits flat cells only)
        const s = shapeExpr(e.arguments[0]); const r = expr(e.arguments[0]); const out = fresh('r');
        const contents = s.kind === 'rec' ? s.fields.map((f) => `Get_${s.key}_${dn(f.name)}(${HW}, ${r})`).join(', ') : s.kind === 'arr' ? `Items_${s.key}(${HW}, ${r})` : s.kind === 'set' ? `(if Is${s.key}(${HW}, ${r}) then ${HW}.heap[${r}].items_${s.key} else [])` : s.kind === 'map' ? `(if Is${s.key}(${HW}, ${r}) then ${HW}.heap[${r}].keys_${s.key} else []), (if Is${s.key}(${HW}, ${r}) then ${HW}.heap[${r}].m_${s.key} else map[])` : `Get_${s.key}_tv(${HW}, ${r})`;
        lines.push(`var (${HW}, ${out}) := Alloc_${s.key}(${HW}, ${contents});`); return out;
      }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && e.expression.name.text === 'has') { const s = shapeExpr(e.expression.expression); const r = expr(e.expression.expression); return `${s.kind === 'map' ? 'MapHas' : 'SetHas'}_${s.key}(${HW}, ${r}, ${expr(e.arguments[0])})`; }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && CB1.has(e.expression.name.text) && ts.isArrowFunction(e.arguments[0])) {
        const s = shapeExpr(e.expression.expression); const r = expr(e.expression.expression); const cb = e.arguments[0]; const x = cb.parameters[0].name.text; const xs = shapeOf(typeOf(cb.parameters[0].name));
        inLam++; const body = expr(cbBody(cb)); inLam--; const lam = `((${dn(x)}: ${valD(xs)}) => ${body})`; const out = fresh('r');
        const m = e.expression.name.text; const E = valD(s.elem);
        if (m === 'some' || m === 'every') { const it = bind(`Items_${s.key}(${HW}, ${r})`, 'it'); const i = fresh('i'); return m === 'some' ? `(exists ${i} :: 0 <= ${i} < |${it}| && ${lam}(${it}[${i}]))` : `(forall ${i} :: 0 <= ${i} < |${it}| ==> ${lam}(${it}[${i}]))`; } // the items as they are at the call: the callback reads, never writes
        if (m === 'find') return `${helper('Find', [E])}(Items_${s.key}(${HW}, ${r}), ${lam})`; // the first item the callback accepts, or absent
        if (m === 'findIndex') return `${helper('FindIndex', [E])}(Items_${s.key}(${HW}, ${r}), ${lam})`;
        if (e.expression.name.text === 'filter') { lines.push(`var (${HW}, ${out}) := Filter_${s.key}(${HW}, ${r}, ${lam});`); return out; }
        const rs = shapeExpr(e); mapInstances.add(`${s.key}|${rs.key}`);
        lines.push(`var (${HW}, ${out}) := Map_${s.key}_${rs.key}(${HW}, ${r}, ${lam});`); return out;
      }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && e.expression.name.text === 'reduce' && e.arguments.length === 2 && ts.isArrowFunction(e.arguments[0])) {
        const s = shapeExpr(e.expression.expression); const r = expr(e.expression.expression); const init = exprAs(e.arguments[1], shapeOf(typeOf(e.arguments[0].parameters[0].name))); const cb = e.arguments[0];
        const [acc, x] = cb.parameters.map((p) => p.name.text); const U = valD(shapeOf(typeOf(cb.parameters[0].name))), E = valD(s.elem);
        inLam++; const body = exprAs(cbBody(cb), shapeOf(typeOf(cb.parameters[0].name))); inLam--;
        return `${helper('Fold', [E, U])}(Items_${s.key}(${HW}, ${r}), ((${dn(acc)}: ${U}, ${dn(x)}: ${E}) => ${body}), ${init})`; // the receiver, then the initial value, then the fold
      }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && ['includes', 'indexOf', 'at'].includes(e.expression.name.text) && e.arguments.length === 1 && shapeExpr(e.expression.expression)?.kind === 'arr') {
        const s = shapeExpr(e.expression.expression); const r = expr(e.expression.expression); const v = expr(e.arguments[0]); const it = `Items_${s.key}(${HW}, ${r})`; const E = valD(s.elem); const m = e.expression.name.text;
        if (m === 'includes') return `(${v} in ${it})`; if (m === 'indexOf') return `${helper('IndexOf', [E])}(${it}, ${v})`; return `${helper('At', [E])}(${it}, ${v})`;
      }
      if (ts.isPrefixUnaryExpression(e)) return e.operator === K.ExclamationToken ? `!${cond(e.operand)}` : e.operator === K.PlusToken ? expr(e.operand) : e.operator === K.TildeToken ? (bitwise ? bitwiseCode(e) : `${helper('JsBitNot', [NUM])}(${expr(e.operand)})`) : negZeroRisk(e) ? (() => { divUsed = true; const x = bind(expr(e.operand), 'n'); lines.push(`var ${HW} := NegZeroMark(${HW}, ${x} == ${isReal ? '0.0' : '0'});`); return `(-(${x}))`; })() : `(-(${expr(e.operand)}))`;
      if (ts.isBinaryExpression(e) && e.operatorToken.kind === K.QuestionQuestionToken) { const ls = locShape(e); const a = expr(e.left); return ls.kind === 'opt' ? `OptOrOpt(${a}, ${exprAs(e.right, ls)})` : `OptOr(${a}, ${expr(e.right)})`; }
      if (ts.isBinaryExpression(e) && [K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.EqualsEqualsToken, K.ExclamationEqualsToken].includes(e.operatorToken.kind) && (isAbsent(e.left) || isAbsent(e.right))) {
        const lit = isAbsent(e.left) ? unparen(e.left) : unparen(e.right), other = isAbsent(e.left) ? e.right : e.left; const sh = locShape(other); const c = expr(other);
        const negated = [K.ExclamationEqualsEqualsToken, K.ExclamationEqualsToken].includes(e.operatorToken.kind), loose = [K.EqualsEqualsToken, K.ExclamationEqualsToken].includes(e.operatorToken.kind);
        if (!loose && (lit.kind === K.NullKeyword ? 'n' : 'u') !== sh.absent) return negated ? 'true' : 'false'; // undefined is not null under ===
        return `(${c}).${negated ? 'Some' : 'None'}?`;
      }
      if (ts.isBinaryExpression(e) && [K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken].includes(e.operatorToken.kind) && (locShape(e.left)?.kind === 'opt' || locShape(e.right)?.kind === 'opt')) { const o = locShape(e.left)?.kind === 'opt' ? locShape(e.left) : locShape(e.right); return `(${exprAs(e.left, o)} ${e.operatorToken.kind === K.EqualsEqualsEqualsToken ? '==' : '!='} ${exprAs(e.right, o)})`; }
      if (ts.isBinaryExpression(e) && Object.hasOwn(ARITH, e.operatorToken.kind)) { if (bitwise && ARITH[e.operatorToken.kind].startsWith('Js')) return bitwiseCode(e); const l = expr(e.left), r = expr(e.right); return arith(e.operatorToken.kind, l, r, negZeroRisk(e)); }
      if (ts.isBinaryExpression(e) && [K.LessThanToken, K.LessThanEqualsToken, K.GreaterThanToken, K.GreaterThanEqualsToken].includes(e.operatorToken.kind) && (typeOf(e.left).flags & TF.StringLike)) { const l = expr(e.left), r = expr(e.right); const lt = helper('StrLt', ['string']); const k = e.operatorToken.kind; return k === K.LessThanToken ? `${lt}(${l}, ${r})` : k === K.GreaterThanToken ? `${lt}(${r}, ${l})` : k === K.LessThanEqualsToken ? `!${lt}(${r}, ${l})` : `!${lt}(${l}, ${r})`; } // the order of code units (design/strings.md)
      if (ts.isBinaryExpression(e)) {
        const op = { [K.PlusToken]: '+', [K.MinusToken]: '-', [K.LessThanToken]: '<', [K.LessThanEqualsToken]: '<=', [K.GreaterThanToken]: '>', [K.GreaterThanEqualsToken]: '>=', [K.EqualsEqualsEqualsToken]: '==', [K.ExclamationEqualsEqualsToken]: '!=', [K.AmpersandAmpersandToken]: '&&', [K.BarBarToken]: '||' }[e.operatorToken.kind];
        const l = expr(e.left), r = expr(e.right); // source order: the left operand's allocations come first
        return `(${l} ${op} ${r})`;
      }
      if (ts.isArrayLiteralExpression(e) && arrShape(e)?.tuple) { const s = arrShape(e); const vs = e.elements.map((x, i) => exprField(x, fieldOf(s, `_${i}`).shape)); const r = fresh('r'); lines.push(`var (${HW}, ${r}) := Alloc_${s.key}(${HW}, ${s.fields.map((f) => vs[Number(f.name.slice(1))]).join(', ')});`); return r; } // the positions in source order, stored by field
      if (ts.isArrayLiteralExpression(e)) {
        const s = arrShape(e);
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
        const callee = calleeOf(e, u); const recv = sameFileCall(e) ? [] : freshCall(e) ? [expr(e.expression.expression)] : [dn('this')]; // a method takes its receiver first
        const ps = fns.get(callee).params; const args = ps.map((p, j) => { const sh = shapeOf(typeOf(p.name)); return e.arguments[j] ? exprAs(e.arguments[j], sh) : `Option<${sh.inner.d}>.None`; }); // an argument not passed is undefined
        const r = fresh('c'); lines.push(`var (${HW}, ${r}) := ${fname(callee)}(${[HW, ...recv, ...args].join(', ')});`); return r;
      }
      if (outsideCall(e)) { const oc = outsideCall(e); const recvA = oc.recv ? [expr(oc.recv)] : []; const args = [...recvA, ...e.arguments.map((a, j) => exprAs(a, shapeOf(typeOf(a))))]; callUsed.set(oc.key, [oc.ds, oc.rd]); const r = fresh('c'); lines.push(`var (${HW}, ${r}) := ${oc.key}(${[HW, ...args].join(', ')});`); return r; } // the arguments in order, then the transition
      if (globalCall(e)) { // a pure global: its arguments in order, then the operation
        const g = globalCall(e); const a = e.arguments;
        if (g === 'String') return toStr(a[0]);
        if (g === 'Array.isArray') { expr(a[0]); return shapeOf(typeOf(a[0])).kind === 'arr' ? 'true' : 'false'; } // the argument is read (a pure read) and its shape decides
        if (g === 'Object.keys') { const s = shapeOf(typeOf(a[0])); const r = bind(expr(a[0]), 'o'); const rs = shapeOf(typeOf(e)); strUsed.add('dictkeys'); const out = fresh('r'); lines.push(`var (${HW}, ${out}) := Alloc_${rs.key}(${HW}, DictKeysJs(if Is${s.key}(${HW}, ${r}) then ${HW}.heap[${r}].keys_${s.key} else []));`); return out; }
        if (g === 'Math.max' || g === 'Math.min') { const vs = a.map((x) => expr(x)); const h = helper(g === 'Math.max' ? 'Max' : 'Min', [NUM]); return vs.reduceRight((acc, v) => (acc === null ? v : `${h}(${v}, ${acc})`), null); }
        if (g === 'Math.abs') return `${helper('Abs', [NUM])}(${expr(a[0])})`;
        if (g === 'Math.sign' || g === 'Math.ceil' || g === 'Math.round') return `${helper({ 'Math.sign': 'JsSign', 'Math.ceil': 'JsCeil', 'Math.round': 'JsRound' }[g], [NUM])}(${expr(a[0])})`;
        const fd = floorDiv(e); if (fd) { divUsed = true; const l = bind(expr(fd.left), 'm'); const d = bind(expr(fd.right), 'd'); lines.push(`var ${HW} := ZeroMark_${NUM}(${HW}, ${d});`); const v = `${g === 'Math.floor' ? 'FloorDivT' : 'TruncDivT'}(${l}, ${d})`; if (negZeroRisk(e)) lines.push(`var ${HW} := NegZeroMark(${HW}, ${v} == 0 && (${l} < 0 || ${d} < 0));`); return v; }
        if (isReal && negZeroRisk(e) && ['Math.round', 'Math.ceil', 'Math.trunc'].includes(g)) { divUsed = true; const x = bind(expr(a[0]), 'n'); const v = g === 'Math.trunc' ? (strUsed.add('truncr'), `(TruncR(${x}) as real)`) : `${helper(g === 'Math.round' ? 'JsRound' : 'JsCeil', [NUM])}(${x})`; lines.push(`var ${HW} := NegZeroMark(${HW}, ${v} == 0.0 && ${x} < 0.0);`); return v; } // a real rounded up to zero from below is a negative zero
        if (!isReal) return expr(a[0]); // an int is its own floor and its own truncation
        if (g === 'Math.trunc') strUsed.add('truncr'); return g === 'Math.floor' ? `((${expr(a[0])}).Floor as real)` : `(TruncR(${expr(a[0])}) as real)`;
      }
      if (reCall(e)) { // the operands in source order: the receiver string (or the tested string), then the replacement
        const rc = reCall(e); const src = strEsc(rc.re.text); const sv = bind(expr(rc.s), 's'); strUsed.add(`re_${rc.m}`);
        if (rc.m === 'test') return `ReTest(${src}, ${sv})`;
        if (rc.m === 'search') return `ReSearch(${src}, ${sv})`;
        if (rc.m === 'replace') return `ReReplace(${src}, ${sv}, ${expr(rc.r)})`;
        const sh = shapeOf(typeOf(e)); const out = fresh('r'); lines.push(`var (${HW}, ${out}) := Alloc_${sh.key}(${HW}, ReSplit(${src}, ${sv}));`); return out;
      }
      if (strMethod(e)) return strEmit(e);
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
    // a string method through the ordinary lane's exact helper: the receiver, then the arguments, once each, in order
    function strEmit(e) {
      const m = strMethod(e); const S = bind(expr(e.expression.expression), 's'); const a = e.arguments.map((x) => bind(expr(x), 'g'));
      const h = (k) => helper(k, ['string']);
      switch (m) {
        case 'trimStart': return `${h('TrimStart')}(${S})`;
        case 'trimEnd': return `${h('TrimEnd')}(${S})`;
        case 'toLowerCase': return `${h('Lower')}(${S})`;
        case 'toUpperCase': return `${h('Upper')}(${S})`;
        case 'split': { const sh = shapeOf(typeOf(e)); const out = fresh('r'); lines.push(`var (${HW}, ${out}) := Alloc_${sh.key}(${HW}, ${h('StrSplit')}(${S}, ${a[0]}));`); return out; } // a fresh array of the pieces
        case 'includes': case 'indexOf': case 'startsWith': case 'endsWith': {
          const P = `${helper('StrClamp', ['int'])}(${a[1] ?? (m === 'endsWith' ? `|${S}|` : '0')}, |${S}|)`;
          if (m === 'endsWith') return `${h('StrEnds')}(${S}, ${a[0]}, ${P})`;
          if (m === 'startsWith') return `(var pp_ := ${P}; pp_ + |${a[0]}| <= |${S}| && ${S}[pp_..pp_ + |${a[0]}|] == ${a[0]})`;
          const search = `${h('StrFind')}(${S}, ${a[0]}, ${P})`; return m === 'includes' ? `(${search} >= 0)` : search;
        }
        case 'slice': return `${helper('Slice', ['char'])}(${S}, ${a[0] ?? '0'}, ${a[1] ?? `|${S}|`})`;
        case 'substring': return `${h('StrSubstring')}(${S}, ${a[0]}, ${a[1] ?? `|${S}|`})`;
        case 'charAt': return `${h('StrCharAt')}(${S}, ${a[0]})`;
        case 'at': return `${h('StrAt')}(${S}, ${a[0]})`;
        case 'padStart': return `${h('PadStart')}(${S}, ${a[0]}, ${a[1] ?? '" "'})`;
        case 'padEnd': return `${h('PadEnd')}(${S}, ${a[0]}, ${a[1] ?? '" "'})`;
        case 'replaceAll': return `${h('StrReplace')}(${S}, ${a[0]}, ${a[1]}, 0, true)`;
        case 'concat': return `(${S} + ${a[0]})`;
      }
      throw new Error(`heap: no string reading for .${m}`);
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
    const bind = (code, p) => { if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(code) || /^-?\d+(\.\d+)?$/.test(code)) return code; if (inLam) return `(${code})`; const x = fresh(p); lines.push(`var ${x} := ${code};`); return x; }; // a name or a literal is its own value; anything else is bound once (inside a callback, where nothing writes, it is written in place)
    // a numeric operator on two evaluated operands: * exact, % and / total with a zero divisor marking the world, the
    // bitwise operators through the ordinary lane's helpers
    function arith(k, l, r, risk = true) { // risk: the result may escape, so a negative zero marks the world
      const Z = isReal ? '0.0' : '0';
      if (k === K.PlusToken) return `(${l} + ${r})`; if (k === K.MinusToken) return `(${l} - ${r})`;
      if (k === K.AsteriskToken) { if (!risk) return `(${l} * ${r})`; divUsed = true; const a = bind(l, 'm'), b = bind(r, 'm'); lines.push(`var ${HW} := NegZeroMark(${HW}, ${a} * ${b} == ${Z} && (${a} < ${Z} || ${b} < ${Z}));`); return `(${a} * ${b})`; }
      if (k === K.PercentToken || k === K.SlashToken) { divUsed = true; const a = bind(l, 'm'); const d = bind(r, 'd'); lines.push(`var ${HW} := ZeroMark_${NUM}(${HW}, ${d});`); const v = `${k === K.SlashToken ? 'DivT' : 'RemT'}_${NUM}(${a}, ${d})`; if (risk) lines.push(`var ${HW} := NegZeroMark(${HW}, ${v} == ${Z} && (${a} < ${Z} || ${d} < ${Z}));`); return v; }
      return `${helper(ARITH[k], [NUM])}(${l}, ${r})`;
    }
    // a bitwise operator through the translator's own reading (shared with the ordinary lane), its operands this core's
    const bitwiseCode = (e) => (bitwise ? bitwise(e, (x) => expr(x)) : null);
    function element(e) { const s = shapeExpr(e.expression); const r = bind(expr(e.expression), 'a'); const i = bind(expr(e.argumentExpression), 'i'); return [s, r, i]; }
    const dictRead = (s, r, i) => { lines.push(`var ${HW} := DictMark_${s.key}(${HW}, ${r}, ${i});`); return `DictGet_${s.key}(${HW}, ${r}, ${i})`; };
    // a write target in JavaScript order: its receiver (and index) first, then the right side, then the store
    function target(t0) {
      const t = unparen(t0);
      if (ts.isIdentifier(t)) return { as: (x) => exprAs(x, declShape(t)), read: () => dn(t.text), write: (v) => lines.push(`var ${dn(t.text)} := ${v};`) };
      if (ts.isElementAccessExpression(t) && shapeExpr(t.expression).kind === 'dict') { const [s, r, i] = element(t); return { as: (x) => expr(x), read: () => dictRead(s, r, i), write: (v) => lines.push(`var ${HW} := DictSet_${s.key}(${HW}, ${r}, ${i}, ${v});`) }; }
      if (tuplePos(t)) { const tp = tuplePos(t); const r = bind(expr(t.expression), 'o'); const f = fieldOf(tp.s, tp.field); return { as: (x) => exprField(x, f.shape), read: () => `Get_${tp.s.key}_${dn(tp.field)}(${HW}, ${r})`, write: (v) => lines.push(`var ${HW} := Set_${tp.s.key}_${dn(tp.field)}(${HW}, ${r}, ${v});`) }; }
      if (ts.isElementAccessExpression(t)) { const [s, r, i] = element(t); const safe = safeIndex.has(t); return { as: (x) => expr(x), read: () => { if (!safe) lines.push(`var ${HW} := Oob_${s.key}(${HW}, ${r}, ${i});`); return `Idx_${s.key}(${HW}, ${r}, ${i})`; }, write: (v) => lines.push(`var ${HW} := ${safe ? 'SetIdxIn' : 'SetIdx'}_${s.key}(${HW}, ${r}, ${i}, ${v});`) }; }
      const s = shapeExpr(t.expression); const r = bind(expr(writeReceiver(t)), 'o'); // the receiver first: an element of a parameter is read (and its index marked) before the right side
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
        if (forEachLoop(s)) { loopCall(forEachLoop(s)); out.push(flush()); continue; }
        if (ts.isForOfStatement(s) || ts.isForStatement(s)) { loopCall(s); out.push(flush()); continue; }
        if (k && ts.isIfStatement(s)) {
          const c = cond(s.expression); const pre = flush(); const rest = list.slice(i + 1);
          const t = stmts([...block(s.thenStatement), ...rest], k), el = stmts([...(s.elseStatement ? block(s.elseStatement) : []), ...rest], k);
          out.push(`${pre ? pre + '\n' : ''}if ${c} then\n${indent(t)}\nelse\n${indent(el)}`);
          return out.filter(Boolean).join('\n');
        }
        if (ts.isVariableStatement(s)) { for (const d of s.declarationList.declarations) { const v = exprAs(d.initializer, shapeOf(typeOf(d.name))); lines.push(`var ${dn(d.name.text)} := ${v};`); } out.push(flush()); continue; }
        if (ts.isReturnStatement(s)) { const v = s.expression ? exprAs(s.expression, rt) : '()'; const pre = flush(); out.push(`${pre ? pre + '\n' : ''}(${HW}, ${v})`); return out.filter(Boolean).join('\n'); }
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
          else { let cur = tg.read(); if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(cur)) { const c = fresh('v'); lines.push(`var ${c} := ${cur};`); cur = c; } const v = expr(e.right); tg.write(arith(COMPOUND[op], cur, v)); }
          out.push(flush()); continue;
        }
        if ((ts.isPostfixUnaryExpression(e) || ts.isPrefixUnaryExpression(e)) && [K.PlusPlusToken, K.MinusMinusToken].includes(e.operator)) { // x++ is x += 1: the target read once, then written
          const tg = target(e.operand); let cur = tg.read(); if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(cur)) { const c = fresh('v'); lines.push(`var ${c} := ${cur};`); cur = c; } tg.write(`(${cur} ${e.operator === K.PlusPlusToken ? '+' : '-'} ${isReal ? '1.0' : '1'})`);
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
        if (isAssignCall(e) && assignLiterals(e)) { const al = assignLiterals(e); const t = bind(expr(e.arguments[0]), 'o'); const vs = al.writes.map((x) => bind(exprField(x.value, x.field.shape), 'v')); al.writes.forEach((x, j) => lines.push(`var ${HW} := Set_${al.st.key}_${dn(x.field.name)}(${HW}, ${t}, ${vs[j]});`)); out.push(flush()); continue; } // the target, every value in order, then the writes in key order
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
        if ((ts.isPostfixUnaryExpression(n) || ts.isPrefixUnaryExpression(n)) && [K.PlusPlusToken, K.MinusMinusToken].includes(n.operator) && ts.isIdentifier(unparen(n.operand))) assigned.add(unparen(n.operand).text); // an update is an assignment: the local is carried
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
      const head = forOf ? `var ${dn(s.initializer.declarations[0].name.text)} := ${isReal ? 'ItemAt' : 'Idx'}_${sh.key}(${HW}, ${A}, ${ctr});` : ''; // in a real file the counter and the length stay integers (|Items_|) and the item is read totally
      const lenI = (r) => (isReal ? `|Items_${sh.key}(${HW}, ${r})|` : `Len_${sh.key}(${HW}, ${r})`);
      const bodyText = stmts(block(s.statement), () => `${name}(${args(`${ctr} + 1`, false)})`);
      const still = !/var\s+\(?\s*hw_\b/.test([head, bodyText].join('\n')); // a body that never rebinds the world: the helper returns the world it was given (proved by its own recursion), so a mark after the loop reads the world before it
      helpers.push([`function ${name}(${params.join(', ')}): ${still ? `(r_: ${ret})` : ret}`, ...(still ? [`  ensures ${carried.length ? 'r_.0' : 'r_'} == ${HW}`] : []), `  decreases ${n} - ${ctr}`, '{', `  if !(${ctr} < ${n} && ${ctr} < ${lenI(A)}) then ${done}`, '  else', indent(indent([head, bodyText].filter(Boolean).join('\n'))), '}'].join('\n'));
      lines.push(...saved);
      const call = `${name}(${[HW, ...(forOf ? [arr] : []), '0', lenI(arr), ...carried.map((c) => dn(c.x)), ...(usesThis && u.cls ? [dn('this')] : []), ...free.map((f) => dn(f.x))].join(', ')})`;
      lines.push(carried.length ? `var (${HW}, ${carried.map((c) => dn(c.x)).join(', ')}) := ${call};` : `var ${HW} := ${call};`);
    }
    if (u.isCtor) { const sh = instanceShape(u.cls, 0); const me = dn('this'); lines.push(`var (${HW}, ${me}) := Alloc_${sh.key}(${HW}, ${sh.fields.map((f) => fieldDflt(f.shape)).join(', ')});`); for (const p of paramProps(u.cls)) lines.push(`var ${HW} := Set_${sh.key}_${dn(p.name.text)}(${HW}, ${me}, ${dn(p.name.text)});`); for (const m of fieldInits(u.cls)) { const f = fieldOf(sh, m.name.text); lines.push(`var ${HW} := Set_${sh.key}_${dn(f.name)}(${HW}, ${me}, ${exprField(m.initializer, f.shape)});`); } } // the instance first, then the parameter properties and the initializers
    const body = u.isCtor ? (() => { const pre = flush(); const b = stmts([...u.body.statements], () => `(${HW}, ${dn('this')})`); return pre ? `${pre}\n${b}` : b; })() : ts.isBlock(u.body) ? stmts([...u.body.statements], proc ? () => `(${HW}, ())` : null) : (() => { const v = exprAs(u.body, rt); const pre = flush(); return `${pre ? pre + '\n' : ''}(${HW}, ${v})`; })(); // an expression body: `return body`
    const self = u.cls && !u.isCtor ? instanceShape(u.cls, 0) : null; // an instance method's receiver (a constructor allocates its own): a reference to the record of its fields
    const params = [...(self ? [`${dn('this')}: Ref`] : []), ...u.params.map((p) => `${dn(p.name.text)}: ${valD(shapeOf(typeOf(p.name)))}`)];
    const lit = (v, sh) => (sh.d === 'string' ? strEsc(v) : isReal ? `${v}.0` : String(v));
    const member = (code, sh) => { if (sh.kind === 'opt') return sh.inner.values ? `((${code}).None? || ${member(`OptOr(${code}, ${dflt(sh.inner)})`, sh.inner)})` : null; return sh.kind === 'prim' && sh.values ? `(${sh.values.map((v) => `${code} == ${lit(v, sh)}`).join(' || ')})` : null; };
    const fieldsIn = (s, r) => (s.kind === 'rec' ? s.fields.map((f) => member(f.shape.kind === 'opt' && f.shape.absent === 'u' ? `PresOpt(Get_${s.key}_${dn(f.name)}(${HW}, ${r}))` : `Get_${s.key}_${dn(f.name)}(${HW}, ${r})`, f.shape)).filter(Boolean) : []); // a literal-union field of a reference parameter: one level, the parameter's own fields
    const hyp = [`WF(${HW})`, ...(self ? [`Is${self.key}(${HW}, ${dn('this')})`, ...fieldsIn(self, dn('this'))] : []), ...u.params.flatMap((p) => { const s = shapeOf(typeOf(p.name)); const x = dn(p.name.text); return s.kind === 'handle' ? [] : !isRefShape(s) ? [member(x, s)].filter(Boolean) : [`Is${s.key}(${HW}, ${x})`, ...fieldsIn(s, x), ...(s.fixed ? [`Len_${s.key}(${HW}, ${x}) == ${isReal ? `${s.fixed}.0` : s.fixed}`] : [])]; })].join(' && '); // a tuple of one shape has its arity on entry
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
  const erasedStep = (x) => ts.isNonNullExpression(x) || ts.isParenthesizedExpression(x) || ts.isAsExpression(x) || ts.isTypeAssertionExpression(x); // `!`, `( )` and `as T` are erased at run time: the path goes on through them
  const rootOf = (x) => { x = unparen(x); while (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x) || erasedStep(x)) x = x.expression; return x; };
  const depth = (x) => { let d = 0; x = unparen(x); while (ts.isPropertyAccessExpression(x) || ts.isElementAccessExpression(x) || erasedStep(x)) { if (!erasedStep(x)) d++; x = x.expression; } return d; };
  // the parameters a same-file unit writes through (a field, an element, a mutator, Object.assign, delete), itself or
  // through a same-file callee it passes them to, by position, to a fixpoint: a caller passing an input there writes
  // through that input, which its own text does not show. A name bound to a path of a parameter, an element of a loop
  // over one (for-of, or the parameter of an array callback) is that parameter
  const LOOP_CB = new Set(['forEach', 'map', 'filter', 'some', 'every', 'find', 'findIndex', 'flatMap', 'reduce']);
  const elementNames = (n, rooted) => { // the names a loop or an array callback binds to the elements of a rooted array
    if (ts.isForOfStatement(n) && rooted(n.expression)) { const dl = n.initializer; return ts.isVariableDeclarationList(dl) ? dl.declarations.filter((d) => ts.isIdentifier(d.name)).map((d) => d.name.text) : []; }
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && LOOP_CB.has(n.expression.name.text) && rooted(n.expression.expression)) { const cb = n.arguments[0]; if (cb && (ts.isArrowFunction(cb) || ts.isFunctionExpression(cb))) return cb.parameters.filter((q) => ts.isIdentifier(q.name)).map((q) => q.name.text); }
    return [];
  };
  let writesThroughMemo = null;
  function writesThrough() {
    if (writesThroughMemo) return writesThroughMemo;
    const units = [...fns.values()].filter((u) => u.body);
    const out = new Map(units.map((u) => [u.name, new Set()]));
    const own = new Map(); // unit -> [the same-file calls it makes, each with the parameter positions its arguments reach]
    for (const u of units) {
      const pos = new Map(); u.params.forEach((q, i) => { if (ts.isIdentifier(q.name)) pos.set(q.name.text, i); });
      const alias = new Map(); // local -> the parameter position its value is a path of
      const at = (x) => { const r = rootOf(x); if (!ts.isIdentifier(r)) return null; return pos.has(r.text) ? pos.get(r.text) : alias.has(r.text) ? alias.get(r.text) : null; };
      const mark = (x) => { const i = at(x); if (i !== null && unparen(x) !== rootOf(x)) out.get(u.name).add(i); };
      const calls = [];
      const walk = (n) => {
        if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && at(n.initializer) !== null) alias.set(n.name.text, at(n.initializer));
        for (const nm of elementNames(n, (x) => at(x) !== null)) alias.set(nm, at(ts.isForOfStatement(n) ? n.expression : n.expression.expression));
        if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment) mark(n.left);
        if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && (n.operator === K.PlusPlusToken || n.operator === K.MinusMinusToken)) mark(n.operand);
        if (ts.isDeleteExpression(n)) mark(n.expression);
        if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && MUTATORS_ALL.has(n.expression.name.text)) { const i = at(n.expression.expression); if (i !== null) out.get(u.name).add(i); }
        if (isAssignCall(n) && n.arguments.length) { const i = at(n.arguments[0]); if (i !== null) out.get(u.name).add(i); }
        if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && fns.has(n.expression.text)) calls.push({ callee: n.expression.text, args: n.arguments.map((a) => at(a)) });
        ts.forEachChild(n, walk);
      };
      walk(u.body);
      own.set(u.name, calls);
    }
    for (let changed = true; changed;) { changed = false; for (const u of units) for (const c of own.get(u.name)) { const w = out.get(c.callee); if (!w) continue; c.args.forEach((i, k) => { if (i !== null && w.has(k) && !out.get(u.name).has(i)) { out.get(u.name).add(i); changed = true; } }); } }
    writesThroughMemo = out; return out;
  }
  // a same-file call that writes through one of its arguments, and that argument
  const calleeWrites = (n) => (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && fns.has(n.expression.text) ? n.arguments.filter((a, k) => writesThrough().get(n.expression.text)?.has(k)) : []);
  function layer1Risk(u) {
    const risks = new Set();
    const params = new Set(u.params.map((p) => (ts.isIdentifier(p.name) ? p.name.text : null)).filter(Boolean));
    const aliases = new Map(); // local -> the depth of the input path it was bound to (`c = p` is 0, `c = p.inner` is 1)
    // a destructured parameter: each field binding is the input path one level down, a rest holds the input's members
    // (a fresh object whose members are the input's, so a write through one of them is a write below the input)
    const bindNames = (pat, d) => { for (const el of pat.elements ?? []) { if (!el || ts.isOmittedExpression(el)) continue; if (ts.isIdentifier(el.name)) aliases.set(el.name.text, el.dotDotDotToken ? d : d + 1); else bindNames(el.name, d + 1); } };
    for (const p of u.params) if (ts.isObjectBindingPattern(p.name) || ts.isArrayBindingPattern(p.name)) bindNames(p.name, 0);
    const inputRooted = (x) => { const r = rootOf(x); return (ts.isIdentifier(r) && (params.has(r.text) || aliases.has(r.text))) || r.kind === K.ThisKeyword; };
    const effDepth = (x) => { const r = rootOf(x); return depth(x) + (ts.isIdentifier(r) && aliases.has(r.text) ? aliases.get(r.text) : 0); }; // the depth of a write below its input root, aliases unfolded
    const fresh = (e) => { // a tree whose reference-typed parts are all literals: no input reference, no shared reference
      e = unparen(e);
      if (!isRefType(typeOf(e))) return true;
      if (ts.isObjectLiteralExpression(e)) return e.properties.every((p) => (ts.isPropertyAssignment(p) ? fresh(p.initializer) : ts.isShorthandPropertyAssignment(p) ? fresh(p.name) : ts.isSpreadAssignment(p) ? spreadFresh(p.expression) : false));
      if (ts.isArrayLiteralExpression(e)) return e.elements.every((x) => (ts.isSpreadElement(x) ? spreadFresh(x.expression) : fresh(x)));
      if (ts.isConditionalExpression(e)) return fresh(e.whenTrue) && fresh(e.whenFalse);
      if (ts.isTemplateExpression(e) || ts.isStringLiteral(e) || ts.isNumericLiteral(e)) return true;
      if (freshPrimArrayCall(e)) return true; // map, filter, slice, concat, flat, toSorted, toReversed over primitives: a fresh array holding no reference (the library table's result fact)
      if (ts.isCallExpression(e) && e.arguments.length === 1 && ts.isPropertyAccessExpression(e.expression) && ts.isIdentifier(e.expression.expression) && e.expression.expression.text === 'Array' && e.expression.name.text === 'from' && orderedYieldsNoRef(e.arguments[0])) return true; // Array.from of a Map, a Set or their iterator over primitives: a fresh array
      if (ts.isIdentifier(e)) { // a const of the unit holding a fresh value, of a shape no reference can live in: nothing stored into it since can carry one
        const d = checker.getSymbolAtLocation(e)?.valueDeclaration;
        if (d && ts.isVariableDeclaration(d) && ts.isIdentifier(d.name) && d.initializer && d.getSourceFile() === sf && d.pos >= u.fn.pos && d.end <= u.fn.end && (d.parent.flags & ts.NodeFlags.Const) && holdsNoRef(shapeOf(typeOf(d.name))) && fresh(d.initializer)) return true;
      }
      return false;
    };
    const holdsNoRef = (s) => !!s && (s.kind === 'prim' || s.kind === 'opt' || (s.kind === 'rec' && s.fields.every((f) => holdsNoRef(f.shape))) || ((s.kind === 'arr' || s.kind === 'set') && holdsNoRef(s.elem))); // a shape no reference can live in: a primitive, an optional one, a record or an array of such
    const spreadFresh = (src) => { // spreading copies the source's reference-typed members: fresh only when it has none
      if (orderedYield(src)) return orderedYieldsNoRef(src);
      const t = typeOf(src); const s = shapeOf(t);
      if (checker.isArrayType(nonNull(t)[0] ?? t)) { const el = checker.getTypeArguments(nonNull(t)[0])[0]; return !!el && !isRefType(el); }
      if (!s || s.kind !== 'rec') return false;
      return holdsNoRef(s);
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
      for (const nm of elementNames(n, inputRooted)) aliases.set(nm, effDepth(ts.isForOfStatement(n) ? n.expression : n.expression.expression) + 1); // an element of an input array: one level below it
      for (const a of calleeWrites(n)) if (inputRooted(a)) { writesInput = true; risks.add('write through an input in a same-file callee'); } // the callee's writes are the caller's
      if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment) {
        const L = unparen(n.left);
        if ((ts.isPropertyAccessExpression(L) || ts.isElementAccessExpression(L)) && inputRooted(L)) { writesInput = true; if (effDepth(L) >= 2) risks.add('nested write through an input'); else if (n.operatorToken.kind === K.EqualsToken && isRefType(typeOf(n.right)) && !fresh(n.right)) risks.add('input field assigned a reference'); }
      }
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && MUTATORS_ALL.has(n.expression.name.text) && inputRooted(n.expression.expression)) { writesInput = true; const recv = unparen(n.expression.expression); if (effDepth(recv) >= 1) risks.add('nested write through an input'); }
      if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && (n.operator === K.PlusPlusToken || n.operator === K.MinusMinusToken)) { const L = unparen(n.operand); if ((ts.isPropertyAccessExpression(L) || ts.isElementAccessExpression(L)) && inputRooted(L)) writesInput = true; if ((ts.isPropertyAccessExpression(L) || ts.isElementAccessExpression(L)) && inputRooted(L) && effDepth(L) >= 2) risks.add('nested write through an input'); }
      if (isAssignCall(n) && n.arguments[0] && inputRooted(n.arguments[0])) { writesInput = true; if (effDepth(n.arguments[0]) >= 1) risks.add('nested write through an input'); } // Object.assign onto a node below an input writes that node's fields (heap shapes)
      if (ts.isReturnStatement(n) && n.expression && !nested && !fresh(n.expression)) risks.add('result may carry an input or shared reference');
      if (ts.isFunctionLike(n)) { nested++; ts.forEachChild(n, walk); nested--; return; } // a nested function's returns are its own result, not the unit's (its writes through an input still count)
      ts.forEachChild(n, walk);
    };
    let nested = 0;
    if (ts.isBlock(u.body)) walk(u.body); else { walk(u.body); if (!fresh(u.body)) risks.add('result may carry an input or shared reference'); }
    if (writesInput && aliasable.length) risks.add(`write through an input that another input position of the same shape may alias (${aliasable.join(', ')})`);
    return [...risks];
  }
  // an array method whose result the library table marks fresh (translate/library.json: map, filter, flatMap, slice,
  // concat, flat, toSorted, toReversed, toSpliced, with), called on an array, whose result's element type holds no
  // reference: the result is a new array carrying no input reference, so it exposes nothing and its identity is one node
  const FRESH_ARRAY_METHODS = new Set(['map', 'filter', 'flatMap', 'slice', 'concat', 'flat', 'toSorted', 'toReversed', 'toSpliced', 'with']);
  const freshPrimArrayCall = (e) => {
    e = unparen(e);
    if (!ts.isCallExpression(e) || !ts.isPropertyAccessExpression(e.expression) || !FRESH_ARRAY_METHODS.has(e.expression.name.text)) return false;
    const recvT = nonNull(typeOf(e.expression.expression))[0]; if (!recvT || !checker.isArrayType(recvT)) return false;
    const rt = nonNull(typeOf(e))[0]; if (!rt || !checker.isArrayType(rt)) return false;
    const el = checker.getTypeArguments(rt)[0]; return !!el && !isRefType(el);
  };
  const MUTATORS_ALL = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin', 'set', 'add', 'delete', 'clear']);
  // what iterating a Map, a Set or one of their iterators (`m.keys()`, `m.values()`, `m.entries()`) yields, as types:
  // a Set its items, a Map and entries() a fresh [key, value] pair per entry, keys() and values() the keys or the
  // values; null for any other source (the ordinary lane's ordered carriers, design/ordered-collections.md)
  const orderedYield = (src) => {
    src = unparen(src);
    let recv = src, method = null;
    if (ts.isCallExpression(src) && !src.arguments.length && ts.isPropertyAccessExpression(src.expression) && ['keys', 'values', 'entries'].includes(src.expression.name.text)) { recv = src.expression.expression; method = src.expression.name.text; }
    const ts0 = nonNull(typeOf(recv)); const t = ts0[0];
    if (ts0.length !== 1 || !t) return null;
    const nm = t.symbol?.name;
    if (nm === 'Set' || nm === 'ReadonlySet') return [checker.getTypeArguments(t)[0]];
    if (nm === 'Map' || nm === 'ReadonlyMap') { const [k, v] = checker.getTypeArguments(t); return method === 'keys' ? [k] : method === 'values' ? [v] : [k, v]; }
    return null;
  };
  const orderedYieldsNoRef = (src) => { const ys = orderedYield(src); return !!ys && ys.every((y) => !!y && !isRefType(y)); };

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
    const destructured = []; // [name, term] of a destructured parameter's bindings: a field is the path `arg<i>.f`, a rest a fresh node of the input's members
    u.params.forEach((p, i) => { if (!ts.isObjectBindingPattern(p.name)) return; for (const el of p.name.elements) { if (!ts.isIdentifier(el.name)) continue; const key = el.propertyName ? (ts.isIdentifier(el.propertyName) || ts.isStringLiteral(el.propertyName) ? el.propertyName.text : null) : el.name.text; if (el.dotDotDotToken) destructured.push([el.name.text, `#${freshId++}{...@arg${i}}`]); else if (key !== null && !el.initializer) destructured.push([el.name.text, `arg${i}.${key}`]); } });
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
      if (freshPrimArrayCall(e)) return `#${freshId++}[prim]`; // a fresh array of primitives from the library table: one node, no reference parts
      return null; // a call, a method result, an element read: the identity is not visible here
    };
    const spreadFreshOrPath = (src, s) => { // spreading copies members: fine when they are primitive, or when the source is an input path (its members are that path's members)
      const t = typeOf(src);
      const arrT = nonNull(t)[0] ?? t;
      if (orderedYieldsNoRef(src)) return true; // a Map, a Set or their iterator over primitives yields primitives and fresh [key, value] pairs
      if (checker.isArrayType(arrT)) { const el = checker.getTypeArguments(arrT)[0]; if (el && !isRefType(el)) return true; return path(src) !== null; }
      const sh = s ?? shapeOf(t);
      if (sh && sh.kind === 'rec' && sh.fields.every((f) => f.shape.kind === 'prim')) return true;
      return path(src) !== null;
    };
    // a write the heap core reads as a step on a held node and the value reading would copy: a node below an input (one
    // field step or more), a const name bound to an input path, a call's result (heap shapes, lint heldNodePath)
    const heldShape = (x) => { const r = rootOf(x); if (ts.isCallExpression(r)) return true; if (ts.isIdentifier(r) && bound.has(r.text) && String(bound.get(r.text)).startsWith('@')) return true; return paramsOrThis(x) && depth(x) >= 1; };
    const canon = (s) => { if (s === null) return null; const ids = new Map(); return s.replace(/#(\d+)/g, (m, d) => { if (!ids.has(d)) ids.set(d, ids.size); return `#${ids.get(d)}`; }); };
    const sites = [], writes = []; let nestedWrite = false; // nestedWrite: a write through an input whose target path could not be read
    const elementOf = new Set(); // names bound to the elements of a loop over an input: a write through one has no readable path
    let inFn = 0; // inside a nested function of the unit
    const paramsOrThis = (x) => { const r = rootOf(x); return (ts.isIdentifier(r) && params.has(r.text)) || r.kind === K.ThisKeyword || (ts.isIdentifier(r) && (bound.has(r.text) || elementOf.has(r.text))); };
    // a local written after its binding (a mutator, an assignment through it, a let rebound) has no fixed skeleton
    const written = new Set();
    const scan = (n) => {
      if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && MUTATORS_ALL.has(n.expression.name.text)) { const r = rootOf(n.expression.expression); if (ts.isIdentifier(r)) written.add(r.text); }
      if (ts.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment) { const r = rootOf(n.left); if (ts.isIdentifier(r)) written.add(r.text); }
      if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && (n.operator === K.PlusPlusToken || n.operator === K.MinusMinusToken)) { const r = rootOf(n.operand); if (ts.isIdentifier(r)) written.add(r.text); }
      ts.forEachChild(n, scan);
    };
    scan(u.body);
    for (const [name, tm] of destructured) if (!written.has(name)) bound.set(name, tm); // a binding the unit writes again has no fixed skeleton
    const walk = (n) => {
      for (const nm of elementNames(n, paramsOrThis)) elementOf.add(nm);
      if (calleeWrites(n).some((a) => paramsOrThis(a))) nestedWrite = true; // a callee writes through an input: the path of its write is not read here
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
      if (isAssignCall(n) && n.arguments[0] && heldShape(n.arguments[0])) nestedWrite = true; // Object.assign onto a node below an input or behind another name: the value reading copies that node (heap shapes)
      if (ts.isReturnStatement(n) && n.expression && !inFn) sites.push(term(n.expression));
      if (ts.isArrowFunction(n) || ts.isFunctionExpression(n)) { inFn++; ts.forEachChild(n, walk); inFn--; return; } // a nested function's returns are its own; its writes through an input are the unit's
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
