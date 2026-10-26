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
    const parts = nonNull(t);
    if (parts.length !== 1) return null;
    t = parts[0];
    if (t.flags & TF.NumberLike) return { kind: 'prim', d: NUM };
    if (t.flags & TF.StringLike) return { kind: 'prim', d: 'string' };
    if (t.flags & TF.BooleanLike) return { kind: 'prim', d: 'bool' };
    if (checker.isArrayType(t)) { const e = shapeOf(checker.getTypeArguments(t)[0], depth + 1); return e ? { kind: 'arr', elem: e, key: `A_${keyOf(e)}` } : null; }
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
  function register(s) { if (!s || s.kind === 'prim') return; if (!shapes.has(s.key)) { shapes.set(s.key, s); if (s.kind === 'arr') register(s.elem); else for (const f of s.fields) register(f.shape); } }
  const typeOf = (n) => checker.getTypeAtLocation(n);
  const fieldOf = (s, name) => (s.kind === 'rec' ? s.fields.find((f) => f.name === name) : null);

  // ----- the core, by syntax -----
  const MUTATORS = new Set(['push', 'unshift', 'pop']);
  const BINOPS = new Set([K.PlusToken, K.MinusToken, K.AsteriskToken, K.LessThanToken, K.LessThanEqualsToken, K.GreaterThanToken, K.GreaterThanEqualsToken, K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.AmpersandAmpersandToken, K.BarBarToken]);
  const unparen = (e) => { while (ts.isParenthesizedExpression(e)) e = e.expression; return e; };
  const sameFileCall = (e) => ts.isCallExpression(e) && ts.isIdentifier(e.expression) && fns.has(e.expression.text) && !e.typeArguments;
  const block = (s) => (ts.isBlock(s) ? [...s.statements] : [s]);
  const endsWithReturn = (list) => {
    const s = list[list.length - 1]; if (!s) return false;
    if (ts.isReturnStatement(s)) return true;
    if (ts.isIfStatement(s) && s.elseStatement) return endsWithReturn(block(s.thenStatement)) && endsWithReturn(block(s.elseStatement));
    return false;
  };
  function coreUnit(u) {
    if (u.cls || u.accessor || u.isCtor || u.fn.asteriskToken || u.isAsync || u.generics?.length || recursive.has(u.name)) return false;
    if (!ts.isBlock(u.body)) return false;
    const names = new Set();
    for (const p of u.params) { if (!ts.isIdentifier(p.name) || p.initializer || p.questionToken || p.dotDotDotToken || !shapeOf(typeOf(p.name))) return false; names.add(p.name.text); }
    const rt = checker.getSignatureFromDeclaration(u.fn)?.getReturnType();
    if (!rt || !shapeOf(rt)) return false;
    let ok = true;
    const no = () => { ok = false; };
    const checkExpr = (e0) => {
      if (!ok) return;
      const e = unparen(e0);
      if (ts.isIdentifier(e)) { if (e.text === HW || !shapeOf(typeOf(e))) no(); return; }
      if (ts.isNumericLiteral(e) || ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e) || e.kind === K.TrueKeyword || e.kind === K.FalseKeyword) return;
      if (ts.isPropertyAccessExpression(e)) {
        const s = shapeOf(typeOf(e.expression)); if (!s) return no();
        if (s.kind === 'arr' ? e.name.text !== 'length' : !fieldOf(s, e.name.text)) return no();
        return checkExpr(e.expression);
      }
      if (ts.isBinaryExpression(e)) { if (!BINOPS.has(e.operatorToken.kind)) return no(); checkExpr(e.left); checkExpr(e.right); return; }
      if (ts.isPrefixUnaryExpression(e)) { if (e.operator !== K.ExclamationToken && e.operator !== K.MinusToken) return no(); return checkExpr(e.operand); }
      if (ts.isArrayLiteralExpression(e)) { if (!shapeOf(typeOf(e))) return no(); for (const x of e.elements) checkExpr(ts.isSpreadElement(x) ? x.expression : x); return; }
      if (ts.isObjectLiteralExpression(e)) {
        const s = shapeOf(typeOf(e)); if (!s || s.kind !== 'rec') return no();
        const given = new Set(); let spread = false;
        for (const p of e.properties) {
          if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) { given.add(p.name.text); checkExpr(p.initializer); }
          else if (ts.isShorthandPropertyAssignment(p)) { given.add(p.name.text); checkExpr(p.name); }
          else if (ts.isSpreadAssignment(p)) { spread = true; const ss = shapeOf(typeOf(p.expression)); if (!ss || ss.kind !== 'rec') return no(); checkExpr(p.expression); }
          else return no();
        }
        if (!spread && s.fields.some((f) => !given.has(f.name))) return no();
        return;
      }
      if (sameFileCall(e)) { for (const a of e.arguments) checkExpr(a); return; }
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && e.expression.name.text === 'slice' && e.arguments.length === 0) {
        const s = shapeOf(typeOf(e.expression.expression)); if (!s || s.kind !== 'arr') return no(); return checkExpr(e.expression.expression);
      }
      no();
    };
    const checkTarget = (t0) => {
      const t = unparen(t0);
      if (ts.isIdentifier(t)) return checkExpr(t);
      if (ts.isPropertyAccessExpression(t)) { const s = shapeOf(typeOf(t.expression)); if (!s || s.kind !== 'rec' || !fieldOf(s, t.name.text)) return no(); return checkExpr(t.expression); }
      no();
    };
    const checkStmts = (list) => {
      for (let i = 0; i < list.length && ok; i++) {
        const s = list[i];
        if (ts.isVariableStatement(s)) {
          for (const d of s.declarationList.declarations) { if (!ts.isIdentifier(d.name) || !d.initializer || d.name.text === HW || names.has(d.name.text) || !shapeOf(typeOf(d.name))) return no(); names.add(d.name.text); checkExpr(d.initializer); }
          continue;
        }
        if (ts.isReturnStatement(s)) { if (!s.expression || i !== list.length - 1) return no(); return checkExpr(s.expression); }
        if (ts.isIfStatement(s)) {
          checkExpr(s.expression);
          const t = block(s.thenStatement); checkStmts(t); if (!endsWithReturn(t)) return no();
          if (s.elseStatement) { const el = block(s.elseStatement); checkStmts(el); if (!endsWithReturn(el)) return no(); if (i !== list.length - 1) return no(); }
          continue;
        }
        if (ts.isExpressionStatement(s)) {
          const e = unparen(s.expression);
          if (ts.isBinaryExpression(e) && [K.EqualsToken, K.PlusEqualsToken, K.MinusEqualsToken].includes(e.operatorToken.kind)) { checkTarget(e.left); checkExpr(e.right); continue; }
          if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && MUTATORS.has(e.expression.name.text)) {
            const s2 = shapeOf(typeOf(e.expression.expression)); if (!s2 || s2.kind !== 'arr') return no();
            const m = e.expression.name.text; if (e.arguments.length !== (m === 'pop' ? 0 : 1)) return no();
            checkExpr(e.expression.expression); for (const a of e.arguments) checkExpr(a); continue;
          }
          if (sameFileCall(e)) { for (const a of e.arguments) checkExpr(a); continue; }
          return no();
        }
        return no();
      }
    };
    const body = [...u.body.statements];
    checkStmts(body);
    if (!endsWithReturn(body)) ok = false;
    return ok;
  }
  let core = new Set();
  const callsOf = (u) => { const calls = new Set(); const w = (n) => { if (sameFileCall(n)) calls.add(n.expression.text); ts.forEachChild(n, w); }; w(u.body); return calls; };
  function plan(order, only) {
    const own = new Set(order.filter((u) => coreUnit(u) && (!only || only.includes(u.name))).map((u) => u.name));
    const graph = new Map(order.map((u) => [u.name, callsOf(u)]));
    let changed = true;
    while (changed) {
      changed = false;
      for (const u of order) {
        if (!own.has(u.name)) continue;
        const calls = graph.get(u.name);
        if ([...calls].some((c) => !own.has(c))) { own.delete(u.name); changed = true; continue; } // a callee outside the core
        for (const [caller, cs] of graph) if (cs.has(u.name) && !own.has(caller)) { own.delete(u.name); changed = true; break; } // a caller outside the core would call with the other convention
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
    const ctor = (k) => { const s = shapes.get(k); return s.kind === 'arr' ? `${k}(items: seq<${valD(s.elem)}>)` : `${k}(${s.fields.map((f) => `${dn(f.name)}: ${valD(f.shape)}`).join(', ')})`; };
    const out = [];
    out.push('type Ref = nat');
    out.push(`datatype Obj = ${keys.map(ctor).join(' | ')} | Dead`);
    out.push('datatype HWorld = HWorld(heap: map<Ref, Obj>, next: nat)');
    for (const k of keys) out.push(`predicate Is${k}(hw: HWorld, r: Ref) { r in hw.heap && hw.heap[r].${k}? }`);
    const cellOk = (k) => { const s = shapes.get(k); const conds = []; if (s.kind === 'arr') { if (s.elem.kind !== 'prim') conds.push(`(forall i :: 0 <= i < |o.items| ==> Is${keyOf(s.elem)}(hw, o.items[i]))`); } else for (const f of s.fields) if (f.shape.kind !== 'prim') conds.push(`Is${keyOf(f.shape)}(hw, o.${dn(f.name)})`); return conds.length ? conds.join(' && ') : 'true'; };
    out.push(`predicate WFCell(hw: HWorld, o: Obj) { match o ${keys.map((k) => `case ${k}(${(shapes.get(k).kind === 'arr' ? ['_'] : shapes.get(k).fields.map(() => '_')).join(', ')}) => ${cellOk(k)}`).join(' ')} case Dead => false }`);
    out.push('predicate WF(hw: HWorld) { (forall r :: r in hw.heap ==> r < hw.next) && (forall r :: r in hw.heap ==> WFCell(hw, hw.heap[r])) }');
    for (const k of keys) {
      const s = shapes.get(k);
      const ps = s.kind === 'arr' ? [`items: seq<${valD(s.elem)}>`] : s.fields.map((f) => `${dn(f.name)}: ${valD(f.shape)}`);
      const args = s.kind === 'arr' ? ['items'] : s.fields.map((f) => dn(f.name));
      out.push(`function Alloc_${k}(hw: HWorld, ${ps.join(', ')}): (HWorld, Ref) { (HWorld(hw.heap[hw.next := ${k}(${args.join(', ')})], hw.next + 1), hw.next) }`);
      if (s.kind === 'arr') {
        const E = valD(s.elem);
        out.push(`function Len_${k}(hw: HWorld, r: Ref): ${NUM} { if Is${k}(hw, r) then |hw.heap[r].items|${isReal ? ' as real' : ''} else ${isReal ? '0.0' : '0'} }`);
        out.push(`function Items_${k}(hw: HWorld, r: Ref): seq<${E}> { if Is${k}(hw, r) then hw.heap[r].items else [] }`);
        out.push(`function Push_${k}(hw: HWorld, r: Ref, v: ${E}): HWorld { if Is${k}(hw, r) then hw.(heap := hw.heap[r := ${k}(hw.heap[r].items + [v])]) else hw }`);
        out.push(`function Unshift_${k}(hw: HWorld, r: Ref, v: ${E}): HWorld { if Is${k}(hw, r) then hw.(heap := hw.heap[r := ${k}([v] + hw.heap[r].items)]) else hw }`);
        out.push(`function Pop_${k}(hw: HWorld, r: Ref): HWorld { if Is${k}(hw, r) && |hw.heap[r].items| > 0 then hw.(heap := hw.heap[r := ${k}(hw.heap[r].items[..|hw.heap[r].items| - 1])]) else hw }`);
      } else {
        for (const f of s.fields) {
          const F = dn(f.name), T = valD(f.shape);
          out.push(`function Get_${k}_${F}(hw: HWorld, r: Ref): ${T} { if Is${k}(hw, r) then hw.heap[r].${F} else ${dflt(f.shape)} }`);
          out.push(`function Set_${k}_${F}(hw: HWorld, r: Ref, v: ${T}): HWorld { if Is${k}(hw, r) then hw.(heap := hw.heap[r := hw.heap[r].(${F} := v)]) else hw }`);
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
        return `Get_${s.key}_${dn(e.name.text)}(${HW}, ${r})`;
      }
      if (ts.isPrefixUnaryExpression(e)) return e.operator === K.ExclamationToken ? `!(${expr(e.operand)})` : `(-(${expr(e.operand)}))`;
      if (ts.isBinaryExpression(e)) {
        const op = { [K.PlusToken]: '+', [K.MinusToken]: '-', [K.AsteriskToken]: '*', [K.LessThanToken]: '<', [K.LessThanEqualsToken]: '<=', [K.GreaterThanToken]: '>', [K.GreaterThanEqualsToken]: '>=', [K.EqualsEqualsEqualsToken]: '==', [K.ExclamationEqualsEqualsToken]: '!=', [K.AmpersandAmpersandToken]: '&&', [K.BarBarToken]: '||' }[e.operatorToken.kind];
        const l = expr(e.left), r = expr(e.right); // source order: the left operand's allocations come first
        return `(${l} ${op} ${r})`;
      }
      if (ts.isArrayLiteralExpression(e)) {
        const s = shapeExpr(e);
        const parts = e.elements.map((x) => (ts.isSpreadElement(x) ? `Items_${shapeExpr(x.expression).key}(${HW}, ${expr(x.expression)})` : `[${expr(x)}]`));
        const items = parts.length ? parts.join(' + ') : `([] : seq<${valD(s.elem)}>)`;
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
      if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && e.expression.name.text === 'slice') {
        const s = shapeExpr(e.expression.expression);
        const r = fresh('r'); lines.push(`var (${HW}, ${r}) := Alloc_${s.key}(${HW}, Items_${s.key}(${HW}, ${expr(e.expression.expression)}));`); return r;
      }
      throw new Error(`heap: unsupported expression ${e.getText(sf)}`);
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
        if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && MUTATORS.has(e.expression.name.text)) {
          const s2 = shapeExpr(e.expression.expression); const r = expr(e.expression.expression); const m = e.expression.name.text;
          const args = m === 'pop' ? [HW, r] : [HW, r, expr(e.arguments[0])];
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
  const shapeLegend = () => [...shapes.keys()].sort().map((k) => { const s = shapes.get(k); return `${k} = ${s.kind === 'arr' ? `[${keyOf(s.elem)}]` : `{${s.fields.map((f) => `${f.name}: ${keyOf(f.shape)}`).join(', ')}}`}`; }).join('; ');
  return { plan, isCore, emit, prelude, shapes, shapeLegend, core: () => core };
}
