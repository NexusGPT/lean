// The faithful number reading of lane A (design/doubles.md, rule C): a number is read exactly (a Dafny int or real
// holding its value) only when it is provably an integer within the safe range, |v| <= 2^53, and never a -0 or a NaN;
// every other number is a double the Dafny model does not compute, so each operation on it is an uninterpreted
// function, the same symbol on both sides (`Math.__lean_add` and kin, which the translator reads as a pure external
// keyed by its name). A proof in this reading uses the exact integers and congruence only, and IEEE doubles are a model
// of it. The reading is a source rewrite before translation, as common.mjs normaliseApplyCalls is.
//
//   faithfulNumbers(loaded) -> { loaded, units }   loaded: the program over the rewritten text (the same file, same
//     lines); units: Map unit name -> { placed: bool, reasons: [..] } for every top-level unit, its same-file callees
//     included. A unit is unplaced when a number the model does not hold reaches a place the rewrite cannot make
//     opaque (an index, a key, an argument a library operation reads as a number, an update whose value is used).
//
// Exact sources (each with a static interval, the safe-range obligation discharged by interval arithmetic):
//   an integer literal within 2^53; `.length` of a string, an array or a tuple (ECMA-262: an array length is a Uint32,
//   a string length below 2^53; both below 2^32 here as the lead's axiom); indexOf, lastIndexOf, findIndex,
//   findLastIndex, search ([-1, 2^32)); the result of a bitwise operator on exact operands (int32 / uint32);
//   Math.trunc/floor/ceil/round/abs/min/max/sign of exact operands; `a + b`, `a - b`; `a * b` when both are nonnegative
//   or one is a positive literal; `a % b` with a nonnegative dividend and a divisor that is never 0; `Math.floor(a / b)`
//   and `Math.trunc(a / b)` with a >= 0 and b > 0; unary minus of an exact value that is never 0; a conditional of two
//   exact values; a local whose every write is exact, or a counter: incremented or decremented by a nonnegative exact
//   literal inside loops whose iteration count is bounded (for-of: 2^32; a for loop over an exact counter: its range;
//   an array callback: 2^32), the bound times the step within 2^53; a module const with an exact initializer.
//   Never exact: a parameter, a field, an element, a call result, NaN, Infinity, a non-integer literal.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ts, topLevelFunctions } from '../common.mjs';
import { calleesOf } from '../exec/callees.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const LEAN_NUMBER_DTS = path.join(here, '..', 'lean-number.d.ts');
const K = ts.SyntaxKind, TF = ts.TypeFlags;
const SAFE = 2n ** 53n, LEN = 2n ** 32n;
const I32 = { lo: -(2n ** 31n), hi: 2n ** 31n - 1n }, U32 = { lo: 0n, hi: 2n ** 32n - 1n };
const fits = (v) => v && v.lo >= -SAFE && v.hi <= SAFE ? v : null;
const hull = (a, b) => (a && b ? { lo: a.lo < b.lo ? a.lo : b.lo, hi: a.hi > b.hi ? a.hi : b.hi } : null);
const has0 = (v) => v.lo <= 0n && v.hi >= 0n;
const ARITH = { [K.PlusToken]: 'add', [K.MinusToken]: 'sub', [K.AsteriskToken]: 'mul', [K.SlashToken]: 'div', [K.PercentToken]: 'rem' };
const BITS = { [K.AmpersandToken]: 'bitand', [K.BarToken]: 'bitor', [K.CaretToken]: 'bitxor', [K.LessThanLessThanToken]: 'shl', [K.GreaterThanGreaterThanToken]: 'shr', [K.GreaterThanGreaterThanGreaterThanToken]: 'ushr' };
const REL = { [K.LessThanToken]: 'lt', [K.LessThanEqualsToken]: 'le', [K.GreaterThanToken]: 'gt', [K.GreaterThanEqualsToken]: 'ge' };
const EQ = new Set([K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.EqualsEqualsToken, K.ExclamationEqualsToken]);
const COMPOUND = { [K.PlusEqualsToken]: K.PlusToken, [K.MinusEqualsToken]: K.MinusToken, [K.AsteriskEqualsToken]: K.AsteriskToken, [K.SlashEqualsToken]: K.SlashToken, [K.PercentEqualsToken]: K.PercentToken,
  [K.AmpersandEqualsToken]: K.AmpersandToken, [K.BarEqualsToken]: K.BarToken, [K.CaretEqualsToken]: K.CaretToken, [K.LessThanLessThanEqualsToken]: K.LessThanLessThanToken, [K.GreaterThanGreaterThanEqualsToken]: K.GreaterThanGreaterThanToken, [K.GreaterThanGreaterThanGreaterThanEqualsToken]: K.GreaterThanGreaterThanGreaterThanToken };
const MATH_EXACT = new Set(['trunc', 'floor', 'ceil', 'round', 'abs', 'min', 'max', 'sign']);
const INDEX_METHODS = new Set(['indexOf', 'lastIndexOf', 'findIndex', 'findLastIndex', 'search']);
const ARRAY_CALLBACKS = new Set(['forEach', 'map', 'filter', 'reduce', 'reduceRight', 'some', 'every', 'find', 'findIndex', 'findLast', 'findLastIndex', 'flatMap']);
// a library method that only stores or passes on its argument's value (never reads it as a number)
const VALUE_METHODS = new Set(['push', 'unshift', 'concat', 'join', 'then', 'resolve', 'reject', 'emit', 'log', 'warn', 'error', 'info', 'debug', 'call', 'apply', 'bind']); // call/apply/bind hand the values on to the function
// a library method whose arguments after the first are values it stores (Map.set's value), never read as numbers
const VALUE_AFTER_KEY = new Set(['set']);
const unparen = (n) => { while (n && (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isNonNullExpression(n) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(n)) || ts.isTypeAssertionExpression(n))) n = n.expression; return n; };
const isLoop = (n) => ts.isForStatement(n) || ts.isForOfStatement(n) || ts.isForInStatement(n) || ts.isWhileStatement(n) || ts.isDoStatement(n);

export function faithfulNumbers(loaded) {
  const { sf, checker, program } = loaded;
  const typeAt = (n) => { try { return checker.getTypeAtLocation(n); } catch { return null; } };
  const isNumT = (t) => !!t && (!!(t.flags & TF.NumberLike) || (t.isUnion?.() && t.types.length > 0 && t.types.every((x) => x.flags & TF.NumberLike)));
  const isNum = (n) => isNumT(typeAt(n));
  const hasNumT = (t) => !!t && (!!(t.flags & TF.NumberLike) || (t.isUnion?.() && t.types.some((x) => x.flags & TF.NumberLike)));
  // the other side of an equality makes it faithful when it is a nonzero exact number (the one double equal to it is
  // itself: no -0, no NaN) or a literal of another type (a string, a boolean, null, undefined)
  const pinned = (x) => { const u = unparen(x); const e = exact(u); if (e && !has0(e)) return true; return ts.isStringLiteral(u) || ts.isNoSubstitutionTemplateLiteral(u) || u.kind === K.TrueKeyword || u.kind === K.FalseKeyword || u.kind === K.NullKeyword || (ts.isIdentifier(u) && u.text === 'undefined'); };
  const isSeqT = (t) => !!t && (!!(t.flags & TF.StringLike) || checker.isArrayType?.(t) || checker.isTupleType?.(t) || (t.isUnion?.() && t.types.every((x) => (x.flags & TF.StringLike) || checker.isArrayType?.(x) || checker.isTupleType?.(x))));
  const symOf = (n) => { try { return checker.getSymbolAtLocation(n); } catch { return null; } };
  const fnOf = (n) => { for (let p = n.parent; p; p = p.parent) if (ts.isFunctionLike(p)) return p; return null; };

  // ----- exactness, with intervals -----
  const memo = new Map(), symMemo = new Map();
  function exact(n0) {
    const n = unparen(n0);
    if (!n) return null;
    if (memo.has(n)) return memo.get(n);
    memo.set(n, null); // a cycle reads as not exact
    const v = exactOf(n);
    memo.set(n, v);
    return v;
  }
  function literalValue(n) {
    if (!ts.isNumericLiteral(n)) return null;
    const x = Number(n.text.replace(/_/g, ''));
    return Number.isSafeInteger(x) ? BigInt(x) : null;
  }
  function exactOf(n) {
    if (!isNum(n)) return null;
    const lv = literalValue(n); if (lv !== null) return fits({ lo: lv, hi: lv });
    if (ts.isPrefixUnaryExpression(n)) {
      const o = exact(n.operand); if (!o) return null;
      if (n.operator === K.PlusToken) return o;
      if (n.operator === K.MinusToken) return has0(o) ? null : { lo: -o.hi, hi: -o.lo };
      if (n.operator === K.TildeToken) return I32;
      return null;
    }
    if (ts.isPropertyAccessExpression(n) && n.name.text === 'length' && isSeqT(typeAt(n.expression))) return { lo: 0n, hi: LEN - 1n };
    if (ts.isConditionalExpression(n)) return hull(exact(n.whenTrue), exact(n.whenFalse));
    if (ts.isBinaryExpression(n)) {
      const op = n.operatorToken.kind;
      if (op === K.CommaToken) return exact(n.right);
      if (!isNum(n.left) || !isNum(n.right)) return null;
      const a = exact(n.left), b = exact(n.right);
      if (!a || !b) return null;
      if (BITS[op]) return op === K.GreaterThanGreaterThanGreaterThanToken ? U32 : I32;
      if (op === K.PlusToken) return fits({ lo: a.lo + b.lo, hi: a.hi + b.hi });
      if (op === K.MinusToken) return fits({ lo: a.lo - b.hi, hi: a.hi - b.lo });
      if (op === K.AsteriskToken) {
        const la = literalValue(unparen(n.left)), lb = literalValue(unparen(n.right));
        const ok = (a.lo >= 0n && b.lo >= 0n) || (la !== null && la > 0n) || (lb !== null && lb > 0n);
        if (!ok) return null;
        const ps = [a.lo * b.lo, a.lo * b.hi, a.hi * b.lo, a.hi * b.hi];
        return fits({ lo: ps.reduce((x, y) => (y < x ? y : x)), hi: ps.reduce((x, y) => (y > x ? y : x)) });
      }
      if (op === K.PercentToken) { if (a.lo < 0n || has0(b)) return null; const m = (b.hi > -b.lo ? b.hi : -b.lo) - 1n; return { lo: 0n, hi: a.hi < m ? a.hi : m }; }
      return null;
    }
    if (ts.isCallExpression(n)) {
      const c = n.expression;
      if (ts.isPropertyAccessExpression(c) && ts.isIdentifier(c.expression) && c.expression.text === 'Math' && !isLocal(c.expression)) {
        const m = c.name.text, args = n.arguments.map((x) => unparen(x));
        if ((m === 'floor' || m === 'trunc') && args.length === 1 && ts.isBinaryExpression(args[0]) && args[0].operatorToken.kind === K.SlashToken) {
          const a = exact(args[0].left), b = exact(args[0].right);
          if (a && b && a.lo >= 0n && b.lo > 0n) return { lo: 0n, hi: a.hi };
          return null;
        }
        if (!MATH_EXACT.has(m) || !args.length) return null;
        const vs = args.map(exact); if (vs.some((x) => !x)) return null;
        if (m === 'abs') { const v = vs[0]; const hi = (v.hi > -v.lo ? v.hi : -v.lo); return { lo: has0(v) ? 0n : (v.lo > 0n ? v.lo : -v.hi), hi }; }
        if (m === 'sign') return { lo: -1n, hi: 1n };
        if (m === 'min' || m === 'max') return vs.reduce((x, y) => hull(x, y));
        return vs[0]; // trunc, floor, ceil, round of an integer is itself
      }
      if (ts.isPropertyAccessExpression(c) && INDEX_METHODS.has(c.name.text) && isSeqT(typeAt(c.expression))) return { lo: -1n, hi: LEN - 1n };
      return null;
    }
    if (ts.isIdentifier(n)) { const s = symOf(n); return s ? exactSym(s) : null; }
    return null;
  }
  // a write target the translator reads only through its compound form: a member of a value whose declared type is a
  // union (narrowed by a test), where a plain assignment takes another path
  const unionMember = (t) => { let x = unparen(t); if (!ts.isPropertyAccessExpression(x) && !ts.isElementAccessExpression(x)) return false; for (let b = unparen(x.expression); b; b = ts.isPropertyAccessExpression(b) || ts.isElementAccessExpression(b) ? unparen(b.expression) : null) { const s = ts.isIdentifier(b) ? symOf(b) : null; const d = s?.valueDeclaration; if (d) { let dt = null; try { dt = checker.getTypeOfSymbolAtLocation(s, d); } catch { dt = null; } if (dt?.isUnion?.() && dt.types.filter((y) => !(y.flags & (TF.Undefined | TF.Null))).length > 1) return true; } if (ts.isIdentifier(b) || b.kind === K.ThisKeyword) break; } return false; };
  const isLocal = (id) => { const d = symOf(id)?.valueDeclaration; return !!d && d.getSourceFile() === sf && !ts.isSourceFile(d.parent?.parent?.parent ?? d); };
  // the iteration bound of one loop node (or array callback), null when unbounded
  function loopBound(l) {
    if (ts.isForOfStatement(l)) return LEN;
    if (ts.isForStatement(l)) { const c = counterOf(l); if (c) return c.hi - c.lo + 1n; return null; }
    if (ts.isArrowFunction(l) || ts.isFunctionExpression(l)) { const call = l.parent; if (call && ts.isCallExpression(call) && ts.isPropertyAccessExpression(call.expression) && ARRAY_CALLBACKS.has(call.expression.name.text) && isSeqT(typeAt(call.expression.expression))) return LEN; return null; }
    return null;
  }
  // `for (let i = A; i < E | i <= E; i++ | i += 1)`: i's interval when A and E are exact and i is written nowhere else
  const counterMemo = new Map();
  function counterOf(l) {
    if (counterMemo.has(l)) return counterMemo.get(l);
    counterMemo.set(l, null);
    let r = null;
    const init = l.initializer, cond = l.condition && unparen(l.condition), inc = l.incrementor && unparen(l.incrementor);
    if (init && ts.isVariableDeclarationList(init) && init.declarations.length === 1 && ts.isIdentifier(init.declarations[0].name) && init.declarations[0].initializer && cond && inc && ts.isBinaryExpression(cond)) {
      const d = init.declarations[0], s = symOf(d.name);
      const left = unparen(cond.left);
      const upward = (ts.isPostfixUnaryExpression(inc) || ts.isPrefixUnaryExpression(inc)) && inc.operator === K.PlusPlusToken && ts.isIdentifier(unparen(inc.operand)) && symOf(unparen(inc.operand)) === s
        || (ts.isBinaryExpression(inc) && inc.operatorToken.kind === K.PlusEqualsToken && ts.isIdentifier(unparen(inc.left)) && symOf(unparen(inc.left)) === s && literalValue(unparen(inc.right)) === 1n);
      if (upward && ts.isIdentifier(left) && symOf(left) === s && (cond.operatorToken.kind === K.LessThanToken || cond.operatorToken.kind === K.LessThanEqualsToken) && !writesOf(s).some((w) => w.node !== inc && w.kind !== 'init')) {
        const a = exact(d.initializer), e = exact(cond.right);
        if (a && e) r = fits({ lo: a.lo, hi: (e.hi > a.lo ? e.hi : a.lo) });
      }
    }
    counterMemo.set(l, r);
    return r;
  }
  // every write of a symbol in the file: { kind: init | assign | inc | dec | compound | other, node, value }
  const writesMemo = new Map();
  function writesOf(s) {
    if (writesMemo.has(s)) return writesMemo.get(s);
    const out = [];
    const decl = s.valueDeclaration;
    if (decl && ts.isVariableDeclaration(decl) && decl.initializer) out.push({ kind: 'init', node: decl, value: decl.initializer });
    const walk = (x) => {
      if (ts.isBinaryExpression(x) && ts.isIdentifier(unparen(x.left)) && symOf(unparen(x.left)) === s) {
        const op = x.operatorToken.kind;
        if (op === K.EqualsToken) out.push({ kind: 'assign', node: x, value: x.right });
        else if (op === K.PlusEqualsToken || op === K.MinusEqualsToken) out.push({ kind: op === K.PlusEqualsToken ? 'inc' : 'dec', node: x, value: x.right });
        else if (op >= K.FirstCompoundAssignment && op <= K.LastCompoundAssignment) out.push({ kind: 'other', node: x });
      }
      if ((ts.isPostfixUnaryExpression(x) || ts.isPrefixUnaryExpression(x)) && [K.PlusPlusToken, K.MinusMinusToken].includes(x.operator) && ts.isIdentifier(unparen(x.operand)) && symOf(unparen(x.operand)) === s) out.push({ kind: x.operator === K.PlusPlusToken ? 'inc' : 'dec', node: x, value: null });
      if ((ts.isForOfStatement(x) || ts.isForInStatement(x)) && ts.isVariableDeclarationList(x.initializer) && x.initializer.declarations.some((d) => ts.isIdentifier(d.name) && symOf(d.name) === s)) out.push({ kind: 'other', node: x });
      ts.forEachChild(x, walk);
    };
    walk(sf);
    writesMemo.set(s, out);
    return out;
  }
  function exactSym(s) {
    if (symMemo.has(s)) return symMemo.get(s);
    symMemo.set(s, null);
    let r = null;
    const decl = s.valueDeclaration;
    if (decl && decl.getSourceFile() === sf && ts.isVariableDeclaration(decl) && ts.isIdentifier(decl.name)) {
      const list = decl.parent, isConst = !!(ts.getCombinedNodeFlags(decl) & ts.NodeFlags.Const);
      const loop = list && list.parent && ts.isForStatement(list.parent) && list.parent.initializer === list ? list.parent : null;
      if (loop) r = counterOf(loop);
      else if (isConst) r = decl.initializer ? exact(decl.initializer) : null;
      else r = exactLet(s, decl);
    }
    symMemo.set(s, r);
    return r;
  }
  function exactLet(s, decl) {
    const ws = writesOf(s); const home = fnOf(decl);
    let base = null; let up = 0n, down = 0n;
    for (const w of ws) {
      if (fnOf(w.node) !== home && w.kind !== 'init') { // a write inside a nested function: an array callback is a bounded loop
        const f = fnOf(w.node); if (!f || loopBound(f) === null || fnOf(f) !== home) return null;
      }
      if (w.kind === 'init' || w.kind === 'assign') {
        if (refersTo(w.value, s)) {
          const v = unparen(w.value); // `i = i + k` / `i = i - k`
          if (ts.isBinaryExpression(v) && [K.PlusToken, K.MinusToken].includes(v.operatorToken.kind) && ts.isIdentifier(unparen(v.left)) && symOf(unparen(v.left)) === s && !refersTo(v.right, s)) {
            const k = exact(v.right); if (!k || k.lo < 0n) return null; const n = iterations(w.node, home); if (n === null) return null;
            if (v.operatorToken.kind === K.PlusToken) up += k.hi * n; else down += k.hi * n; continue;
          }
          return null;
        }
        const e = exact(w.value); if (!e) return null; base = base ? hull(base, e) : e; continue;
      }
      if (w.kind === 'inc' || w.kind === 'dec') {
        const k = w.value ? exact(w.value) : { lo: 1n, hi: 1n }; if (!k || k.lo < 0n) return null;
        const n = iterations(w.node, home); if (n === null) return null;
        if (w.kind === 'inc') up += k.hi * n; else down += k.hi * n; continue;
      }
      return null;
    }
    if (!base) return null;
    return fits({ lo: base.lo - down, hi: base.hi + up });
  }
  // how many times a write can run inside its function: the product of the bounds of the loops (and array callbacks)
  // between it and the function the variable lives in; 1 outside any loop; null when a loop is unbounded
  function iterations(node, home) {
    let n = 1n;
    for (let p = node.parent; p && p !== home; p = p.parent) {
      if (isLoop(p) || ((ts.isArrowFunction(p) || ts.isFunctionExpression(p)) && p !== home)) {
        if (ts.isForStatement(p) && p.incrementor && (node === p.incrementor || isInside(node, p.incrementor))) continue; // the counter's own step
        const b = loopBound(p); if (b === null) return null; n *= b;
      }
    }
    return n;
  }
  const isInside = (x, root) => { for (let p = x; p; p = p.parent) if (p === root) return true; return false; };
  function refersTo(e, s) { let hit = false; const w = (x) => { if (hit) return; if (ts.isIdentifier(x) && symOf(x) === s) hit = true; else ts.forEachChild(x, w); }; w(e); return hit; }

  // ----- placement: a number the model does not hold must reach only places the rewrite makes opaque -----
  const unplaced = new Map(); // node of the top-level unit -> [reasons]
  const unitNodes = [...topLevelFunctions(sf).values()];
  const unitOfNode = (x) => unitNodes.find((u) => x.pos >= u.node.pos && x.end <= u.node.end) ?? null;
  const refuse = (x, why) => { const u = unitOfNode(x); if (!u) return; const k = u.name; if (!unplaced.has(k)) unplaced.set(k, []); const line = sf.getLineAndCharacterOfPosition(x.getStart(sf)).line + 1; const r = `${why}: \`${x.getText(sf).slice(0, 60)}\` (line ${line})`; if (!unplaced.get(k).includes(r)) unplaced.get(k).push(r); };
  const resolved = (id) => { let s = symOf(id); if (s && (s.flags & ts.SymbolFlags.Alias)) { try { s = checker.getAliasedSymbol(s); } catch { /* keep */ } } return s; };
  const sameFileUnit = (call) => { const d = resolved(call.expression)?.valueDeclaration; return !!d && d.getSourceFile() === sf && ts.isFunctionLike(d.initializer ?? d); };
  const externalCall = (call) => { const s = resolved(ts.isPropertyAccessExpression(call.expression) ? call.expression.name : call.expression); const d = s?.valueDeclaration ?? s?.declarations?.[0]; if (!d) return false; const f = d.getSourceFile(); return f !== sf && !program.isSourceFileDefaultLibrary(f) && !/[\\/]typescript[\\/]lib[\\/]/.test(f.fileName); };
  // a callee the default library declares (Array.prototype.splice, Date, String.prototype.includes ...): the translator
  // models those, reading a number argument as the integer it holds
  const libraryCallee = (c) => { const s = resolved(ts.isPropertyAccessExpression(c) ? c.name : c); const ds = s?.declarations ?? []; return ds.length > 0 && ds.every((d) => program.isSourceFileDefaultLibrary(d.getSourceFile()) || /[\\/]typescript[\\/]lib[\\/]lib\./.test(d.getSourceFile().fileName)); };
  function placeOf(n) { // a non-exact number at n: is its consumer one the rewrite makes opaque or one that only carries the value?
    let x = n, p = x.parent;
    while (p && (ts.isParenthesizedExpression(p) || ts.isAsExpression(p) || ts.isNonNullExpression(p) || ts.isTypeAssertionExpression(p) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(p)))) { x = p; p = p.parent; }
    if (!p) return null;
    if (ts.isBinaryExpression(p)) {
      const op = p.operatorToken.kind;
      if (ARITH[op] || BITS[op] || REL[op] || EQ.has(op) || op === K.AsteriskAsteriskToken || op === K.AmpersandAmpersandToken || op === K.BarBarToken || op === K.QuestionQuestionToken || op === K.CommaToken) return null;
      if (op === K.EqualsToken) return null; // the value assigned, or the target written (a write is no read of it)
      if (COMPOUND[op] !== undefined) return null; // rewritten as an assignment (below)
      if (op === K.InKeyword || op === K.InstanceOfKeyword) return 'a number read by `in`';
      return null;
    }
    if (ts.isPrefixUnaryExpression(p) || ts.isTypeOfExpression(p) || ts.isVoidExpression(p)) return null;
    if (ts.isPostfixUnaryExpression(p)) return null;
    if (ts.isConditionalExpression(p) || ts.isReturnStatement(p) || ts.isVariableDeclaration(p) || ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p) || ts.isArrayLiteralExpression(p) || ts.isTemplateSpan(p) || ts.isIfStatement(p) || ts.isWhileStatement(p) || ts.isDoStatement(p) || ts.isExpressionStatement(p) || ts.isArrowFunction(p) || ts.isPropertyDeclaration(p) || ts.isJsxExpression(p) || ts.isAwaitExpression(p) || ts.isYieldExpression(p) || ts.isThrowStatement(p)) return null;
    if (ts.isForStatement(p)) return null;
    if (ts.isElementAccessExpression(p)) return p.argumentExpression === x ? 'an index the model reads as an integer' : null;
    if (ts.isPropertyAccessExpression(p)) return null; // a member of a number (toFixed and kin: uninterpreted)
    if (ts.isCallExpression(p) || ts.isNewExpression(p)) {
      if (p.expression === x) return null;
      const c = p.expression;
      if (ts.isPropertyAccessExpression(c) && ts.isIdentifier(c.expression) && (c.expression.text === 'Math' || c.expression.text === 'String' || c.expression.text === 'console' || (c.expression.text === 'Object' && c.name.text === 'is')) ) return null; // Math: rewritten or uninterpreted; Object.is: SameValue, which is identity
      if (ts.isIdentifier(c) && ['String', 'Number'].includes(c.text) && !sameFileUnit(p)) return null; // a conversion (uninterpreted) or the identity on a number
      if (ts.isNewExpression(p) && ts.isIdentifier(c) && ['Error', 'TypeError', 'RangeError'].includes(c.text)) return null;
      if (ts.isCallExpression(p) && (sameFileUnit(p) || externalCall(p))) return null;
      if (ts.isPropertyAccessExpression(c) && VALUE_METHODS.has(c.name.text)) return null;
      if (ts.isPropertyAccessExpression(c) && VALUE_AFTER_KEY.has(c.name.text) && p.arguments.indexOf(x) > 0) return null;
      if (ts.isPropertyAccessExpression(c) && isNum(c.expression)) return null; // x.toFixed(n): an uninterpreted member of a number
      if (!libraryCallee(c)) return null; // a function value or a declaration outside the default library: it receives the value, opaque to the model
      return `an argument of \`${c.getText(sf).slice(0, 40)}\`, which reads it as a number`;
    }
    if (ts.isDeleteExpression(p) || (ts.isParameter(p) && p.initializer === x) || ts.isSpreadElement(p) && p.parent && ts.isArrayLiteralExpression(p.parent)) return null;
    if (ts.isSpreadElement(p) && p.parent && ts.isCallExpression(p.parent)) return placeOf(p);
    if (ts.isCaseClause(p) || ts.isSwitchStatement(p)) return 'a switch over a number';
    if (ts.isComputedPropertyName(p)) return 'a computed key';
    return `a ${ts.SyntaxKind[p.kind]}`;
  }

  // ----- the rewrite: text of each node, children first -----
  const ops = new Set();
  const call = (name, args) => { ops.add(name); return `Math.__lean_${name}(${args.join(', ')})`; };
  const truthy = new Set(), wrapping = new Set(); // conditions holding a non-exact number: read by the uninterpreted truthiness
  const opaqueIn = new Set(); // the units whose text the rewrite changed: their numbers pass through uninterpreted operations
  const touched = (n) => { const u = unitOfNode(n); if (u) opaqueIn.add(u.name); };
  function text(n) {
    if (truthy.has(n) && !wrapping.has(n)) { wrapping.add(n); touched(n); try { return call('truthy', [text(n)]); } finally { wrapping.delete(n); } }
    const own = rewrite(n);
    if (own !== null) { touched(n); return own; }
    return splice(n);
  }
  function splice(n) {
    const kids = []; ts.forEachChild(n, (c) => { kids.push(c); });
    let out = '', at = n.getStart(sf);
    for (const c of kids) { const s = c.getStart(sf); if (s < at) continue; out += sf.text.slice(at, s) + text(c); at = c.end; }
    return out + sf.text.slice(at, n.end);
  }
  const numOperand = (x) => isNum(x);
  const inType = (n) => { for (let p = n.parent; p; p = p.parent) { if (ts.isTypeNode(p) || ts.isTypeAliasDeclaration(p) || ts.isInterfaceDeclaration(p)) return true; if (ts.isStatement(p) || ts.isFunctionLike(p)) return false; } return false; };
  function rewrite(n) {
    if (!ts.isExpression(n) && !ts.isExpressionStatement(n) && !ts.isForStatement(n)) return null;
    if (inType(n)) return null; // a type position (typeof x, a literal type) holds no runtime number
    const declName = ts.isIdentifier(n) && n.parent && ((ts.isParameter(n.parent) || ts.isVariableDeclaration(n.parent) || ts.isBindingElement(n.parent) || ts.isPropertyAssignment(n.parent) || ts.isPropertyDeclaration(n.parent) || ts.isPropertySignature(n.parent) || ts.isFunctionDeclaration(n.parent) || ts.isMethodDeclaration(n.parent) || ts.isMethodSignature(n.parent) || ts.isGetAccessorDeclaration(n.parent) || ts.isSetAccessorDeclaration(n.parent) || ts.isEnumMember(n.parent) || ts.isShorthandPropertyAssignment(n.parent) && false) && n.parent.name === n || (ts.isPropertyAccessExpression(n.parent) && n.parent.name === n));
    if (ts.isExpression(n) && !declName && isNum(n) && !exact(n) && !ts.isNumericLiteral(n)) { const why = placeOf(n); if (why) refuse(n, why); }
    if (ts.isBinaryExpression(n)) {
      const op = n.operatorToken.kind;
      const both = numOperand(n.left) && numOperand(n.right);
      if ((ARITH[op] || BITS[op]) && both && !exact(n)) return call(ARITH[op] ?? BITS[op], [text(n.left), text(n.right)]);
      if (REL[op] && both && !(exact(n.left) && exact(n.right))) return call(REL[op], [text(n.left), text(n.right)]);
      if (EQ.has(op) && !both && ((hasNumT(typeAt(n.left)) && !exact(n.left)) || (hasNumT(typeAt(n.right)) && !exact(n.right))) && !pinned(n.left) && !pinned(n.right)) { refuse(n, 'an equality over a value that may be a number the model does not hold'); return null; }
      if (EQ.has(op) && both && !(exact(n.left) && exact(n.right)) && !pinned(n.left) && !pinned(n.right)) { const e = call('eq', [text(n.left), text(n.right)]); return op === K.EqualsEqualsEqualsToken || op === K.EqualsEqualsToken ? e : `!${e}`; }
      if ((op === K.AmpersandAmpersandToken || op === K.BarBarToken) && !numOperand(n.left) && hasNumT(typeAt(n.left))) { refuse(n, 'a truth test of a value that may be a number the model does not hold'); return null; }
      if ((op === K.AmpersandAmpersandToken || op === K.BarBarToken) && numOperand(n.left) && !exact(n.left)) {
        const l = text(n.left), r = text(n.right), t = call('truthy', [l]);
        return op === K.BarBarToken ? `(${t} ? ${l} : ${r})` : `(${t} ? ${r} : ${l})`;
      }
      if (COMPOUND[op] !== undefined && numOperand(n.left)) {
        const target = unparen(n.left), ex = ts.isIdentifier(target) ? exactSym(symOf(target)) : null;
        if (!ex) {
          if (!ts.isExpressionStatement(n.parent) && !(ts.isForStatement(n.parent) && n.parent.incrementor === n)) { refuse(n, 'an update whose value is used'); return null; }
          if (unionMember(n.left)) { refuse(n, 'an update of a member of a union value'); return null; }
          const k = COMPOUND[op];
          return `${text(n.left)} = ${call(ARITH[k] ?? BITS[k], [text(n.left), text(n.right)])}`;
        }
      }
      return null;
    }
    if ((ts.isPostfixUnaryExpression(n) || ts.isPrefixUnaryExpression(n)) && [K.PlusPlusToken, K.MinusMinusToken].includes(n.operator) && numOperand(n.operand)) {
      const target = unparen(n.operand), ex = ts.isIdentifier(target) ? exactSym(symOf(target)) : null;
      if (ex) return null;
      if (!ts.isExpressionStatement(n.parent) && !(ts.isForStatement(n.parent) && n.parent.incrementor === n)) { refuse(n, 'an update whose value is used'); return null; }
      if (unionMember(n.operand)) { refuse(n, 'an update of a member of a union value'); return null; }
      return `${text(n.operand)} = ${call(n.operator === K.PlusPlusToken ? 'add' : 'sub', [text(n.operand), '1'])}`;
    }
    if (ts.isPrefixUnaryExpression(n) && n.operator === K.ExclamationToken && !numOperand(n.operand) && hasNumT(typeAt(n.operand))) { refuse(n, 'a truth test of a value that may be a number the model does not hold'); return null; }
    if (ts.isPrefixUnaryExpression(n) && numOperand(n.operand)) {
      if (n.operator === K.MinusToken && !exact(n) && !ts.isNumericLiteral(unparen(n.operand))) return call('neg', [text(n.operand)]);
      if (n.operator === K.MinusToken && ts.isNumericLiteral(unparen(n.operand)) && literalValue(unparen(n.operand)) === 0n) return call('neg', [text(n.operand)]); // `-0`
      if (n.operator === K.TildeToken && !exact(n.operand)) return call('bitnot', [text(n.operand)]);
      if (n.operator === K.ExclamationToken && !exact(n.operand)) return `!${call('truthy', [text(n.operand)])}`;
      return null;
    }
    if (ts.isCallExpression(n)) {
      const c = n.expression;
      if (ts.isPropertyAccessExpression(c) && ts.isIdentifier(c.expression) && c.expression.text === 'Math' && !isLocal(c.expression) && !c.name.text.startsWith('__lean_')) {
        const m = c.name.text;
        if (['floor', 'ceil', 'trunc', 'round', 'abs', 'sign', 'sqrt', 'min', 'max', 'fround', 'imul', 'clz32'].includes(m) && !exact(n)) {
          if ((m === 'min' || m === 'max') && n.arguments.length === 1 && ts.isSpreadElement(n.arguments[0]) && checker.isArrayType?.(typeAt(n.arguments[0].expression))) return call(`${m}s`, [text(n.arguments[0].expression)]); // Math.max(...xs): one uninterpreted function of the array
          if (n.arguments.some((a) => ts.isSpreadElement(a))) { refuse(n, 'a spread into a Math call'); return null; }
          const arity = n.arguments.length, declared = (m === 'min' || m === 'max') ? arity <= 4 : m === 'imul' ? arity === 2 : arity === 1;
          if (!declared) { refuse(n, `Math.${m} with ${arity} arguments over a number the model does not hold`); return null; }
          return call(`${m}${arity}`, n.arguments.map((a) => text(a)));
        }
      }
      return null;
    }
    return null;
  }
  // conditions read for truth: a non-exact number there is tested by the uninterpreted truthiness
  function truthRewrite(n) {
    const conds = [];
    const w = (x) => {
      if ((ts.isIfStatement(x) || ts.isWhileStatement(x) || ts.isDoStatement(x)) && x.expression) conds.push(x.expression);
      if (ts.isForStatement(x) && x.condition) conds.push(x.condition);
      if (ts.isConditionalExpression(x)) conds.push(x.condition);
      ts.forEachChild(x, w);
    };
    w(n);
    for (const c of conds) if (!isNum(c) && hasNumT(typeAt(c))) refuse(c, 'a truth test of a value that may be a number the model does not hold');
    return conds.filter((c) => isNum(c) && !exact(c));
  }

  // ----- apply over the file: pieces of original text copied as they are, and rewritten nodes -----
  for (const c of truthRewrite(sf)) truthy.add(c);
  const pieces = []; // { from, to } original text copied, or { lit } new text
  const copy = (from, to) => { if (to > from) pieces.push({ from, to }); };
  function emit(n) {
    if (truthy.has(n) || rewriteProbe(n)) { pieces.push({ lit: text(n) }); return; }
    let at = n.getStart(sf);
    ts.forEachChild(n, (c) => { const st = c.getStart(sf); if (st < at) return; copy(at, st); emit(c); at = c.end; });
    copy(at, n.end);
  }
  const rewriteProbe = (n) => rewrite(n) !== null; // rewrite is a pure function of the node but for the reasons it records (kept once each)
  let at0 = 0;
  ts.forEachChild(sf, (c) => { const st = c.getStart(sf); copy(at0, st); emit(c); at0 = c.end; });
  copy(at0, sf.text.length);
  let out = ''; const segs = []; // [original from, original to, output offset]
  for (const p of pieces) { if (p.lit !== undefined) out += p.lit; else { segs.push([p.from, p.to, out.length]); out += sf.text.slice(p.from, p.to); } }
  // an original offset in copied text maps to its output offset; one at the end of a copied stretch maps to the end of it
  const mapOffset = (o) => { for (const [a, b, at] of segs) if (o >= a && o <= b) return at + (o - a); return -1; };

  // the units, each with its same-file callees
  const units = new Map();
  for (const u of unitNodes) {
    const names = [u.name, ...calleesOf(sf, checker, u.name).map((c) => c.callee)];
    const reasons = names.flatMap((x) => (unplaced.get(x) ?? []).map((r) => (x === u.name ? r : `${x}: ${r}`)));
    units.set(u.name, { placed: reasons.length === 0, congruence: names.some((x) => opaqueIn.has(x)), reasons });
  }
  if (out === sf.text) return { loaded, units, ops: [], mapOffset: (o) => o };
  if (out.split('\n').length !== sf.text.split('\n').length) throw new Error('faithful numbers: the rewrite changed the line count');
  // the program again over the rewritten text, the declarations of the uninterpreted operations a root of it
  const options = program.getCompilerOptions();
  const host = ts.createCompilerHost(options, true);
  const get = host.getSourceFile;
  host.getSourceFile = (name, lang, onError, create) => {
    if (path.resolve(name) === path.resolve(sf.fileName)) return ts.createSourceFile(name, out, lang, true, sf.scriptKind);
    return program.getSourceFile(name) ?? get.call(host, name, lang, onError, create);
  };
  const roots = [...new Set([sf.fileName, ...program.getRootFileNames().filter((f) => f.endsWith('.d.ts')), LEAN_NUMBER_DTS])];
  const next = ts.createProgram({ rootNames: roots, options, host, oldProgram: program });
  const nsf = next.getSourceFile(sf.fileName);
  if (!nsf) return { loaded, units, ops: [], mapOffset: (o) => o };
  const diagnostics = [...next.getSyntacticDiagnostics(nsf), ...next.getSemanticDiagnostics(nsf)];
  return { loaded: { ...loaded, program: next, sf: nsf, checker: next.getTypeChecker(), diagnostics }, units, ops: [...ops].sort(), text: out, mapOffset };
}
