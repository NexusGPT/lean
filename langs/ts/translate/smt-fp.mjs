// The doubles reading of lane A (design/doubles.md): a number-bearing unit of the TypeScript subset, read as an SMT-LIB
// term over IEEE-754 binary64, `(_ FloatingPoint 11 53)`, RNE on every arithmetic operation (ECMA-262 6.1.6.1).
//
//   numberBearing(checker, sf, unit)  the first number operation the unit or a same-file callee it reaches performs
//                                     (arithmetic, bitwise, a comparison of a computed number, a Math call, a
//                                     conversion), as { kind, text, line }, else null
//   encodeUnit(checker, sf, unit, side)  the unit's result as a term over its parameters, or { ok: false, reason }
//   equivalenceQuery(parent, candidate)  the query `(assert (not (= old new)))`; unsat proves SameValue equality
//
// One table of operations (OPS below); an operation outside it is either an uninterpreted function (the approximated
// Math functions and the conversions, the SAME symbol on both sides, keyed by the operation's name, as lane A keys an
// approximated Math function today) or a reason the unit is not encoded. No per-pair code.
import { ts, topLevelFunctions } from '../common.mjs';
import { calleesOf } from '../exec/callees.mjs';

const K = ts.SyntaxKind, TF = ts.TypeFlags;
const isNum = (checker, n) => { const t = checker.getTypeAtLocation(n); return !!(t.flags & TF.NumberLike) || (t.isUnion?.() && t.types.every((x) => x.flags & TF.NumberLike)); };
const isStr = (checker, n) => { const t = checker.getTypeAtLocation(n); return !!(t.flags & TF.StringLike) || (t.isUnion?.() && t.types.every((x) => x.flags & TF.StringLike)); };
const ARITH = new Set([K.MinusToken, K.AsteriskToken, K.SlashToken, K.PercentToken, K.AsteriskAsteriskToken, K.AmpersandToken, K.BarToken, K.CaretToken, K.LessThanLessThanToken, K.GreaterThanGreaterThanToken, K.GreaterThanGreaterThanGreaterThanToken,
  K.MinusEqualsToken, K.AsteriskEqualsToken, K.SlashEqualsToken, K.PercentEqualsToken, K.AsteriskAsteriskEqualsToken, K.AmpersandEqualsToken, K.BarEqualsToken, K.CaretEqualsToken, K.LessThanLessThanEqualsToken, K.GreaterThanGreaterThanEqualsToken, K.GreaterThanGreaterThanGreaterThanEqualsToken]);
const RELATIONAL = new Set([K.LessThanToken, K.LessThanEqualsToken, K.GreaterThanToken, K.GreaterThanEqualsToken]);
const EQUALITY = new Set([K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.EqualsEqualsToken, K.ExclamationEqualsToken]);
const CONVERSIONS = new Set(['Number', 'parseInt', 'parseFloat', 'String']);
const NUMBER_METHODS = new Set(['toString', 'toFixed', 'toPrecision', 'toExponential', 'toLocaleString']);
const mathCall = (n) => ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === 'Math' ? n.expression.name.text : null;

// the first number operation in one node's subtree
function firstNumberOp(checker, sf, root) {
  let hit = null;
  const at = (n, kind) => { if (!hit) hit = { kind, text: n.getText(sf).slice(0, 80), line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1 }; };
  const visit = (n) => {
    if (hit) return;
    if (ts.isBinaryExpression(n)) {
      const op = n.operatorToken.kind;
      if (ARITH.has(op) && (isNum(checker, n.left) || isNum(checker, n.right))) at(n, 'arithmetic');
      else if ((op === K.PlusToken || op === K.PlusEqualsToken) && isNum(checker, n.left) && isNum(checker, n.right)) at(n, 'arithmetic');
      else if ((op === K.PlusToken || op === K.PlusEqualsToken) && (isNum(checker, n.left) || isNum(checker, n.right))) at(n, 'conversion');
      else if (RELATIONAL.has(op) && isNum(checker, n.left) && isNum(checker, n.right)) at(n, 'comparison'); // NaN is unordered (7.2.13): a comparison of two read numbers differs from the reals' on a NaN input
      else if (EQUALITY.has(op) && (isNum(checker, n.left) || isNum(checker, n.right))) at(n, 'comparison'); // IsStrictlyEqual (7.2.15): -0 equals 0 and NaN equals nothing, so a test reads a -0 or NaN input
    } else if (ts.isPrefixUnaryExpression(n) && [K.MinusToken, K.PlusToken, K.TildeToken, K.PlusPlusToken, K.MinusMinusToken].includes(n.operator) && !(ts.isNumericLiteral(n.operand) && Number(n.operand.text.replace(/_/g, '')) !== 0)) at(n, n.operator === K.TildeToken ? 'bitwise' : 'arithmetic');
    else if (ts.isPostfixUnaryExpression(n)) at(n, 'arithmetic');
    else if (mathCall(n)) at(n, 'Math');
    else if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && CONVERSIONS.has(n.expression.text) && n.arguments.length) at(n, 'conversion');
    else if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && NUMBER_METHODS.has(n.expression.name.text) && isNum(checker, n.expression.expression)) at(n, 'conversion');
    else if (ts.isTemplateSpan(n) && isNum(checker, n.expression)) at(n.expression, 'conversion');
    else if ((ts.isIfStatement(n) || ts.isConditionalExpression(n) || ts.isWhileStatement(n)) && isNum(checker, ts.isConditionalExpression(n) ? n.condition : n.expression)) at(n, 'comparison'); // ToBoolean (7.1.2): NaN and -0 are false
    else if (ts.isPrefixUnaryExpression(n) && n.operator === K.ExclamationToken && isNum(checker, n.operand)) at(n, 'comparison');
    else if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === 'Object' && n.expression.name.text === 'is') at(n, 'comparison'); // SameValue (7.2.10) tells -0 from 0
    ts.forEachChild(n, visit);
  };
  visit(root);
  return hit;
}
export function numberBearing(checker, sf, unit) {
  const units = topLevelFunctions(sf);
  const u = typeof unit === 'string' ? units.get(unit) : unit;
  if (!u) return null;
  for (const name of [u.name, ...calleesOf(sf, checker, u.name).map((c) => c.callee)]) {
    const hit = firstNumberOp(checker, sf, units.get(name)?.node);
    if (hit) return { ...hit, unit: name };
  }
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// The prelude: the exact operations that are more than one SMT-LIB operator. Each is differentially tested against
// Node on edge doubles (tests/numbers_doubles/run.mjs, the seams row).
export const PRELUDE = `(define-sort D () (_ FloatingPoint 11 53))
(define-fun js.nan () D (_ NaN 11 53))
(define-fun js.pz () D (_ +zero 11 53))
(define-fun js.nz () D (_ -zero 11 53))
(define-fun js.one () D ((_ to_fp 11 53) RNE 1.0))
(define-fun js.half () D ((_ to_fp 11 53) RNE 0.5))
; % : truncated remainder (Number::remainder 6.1.6.1.6) from the IEEE remainder plus one correction of |y| toward x's sign
(define-fun js.rem ((x D) (y D)) D
  (ite (or (fp.isNaN x) (fp.isNaN y) (fp.isInfinite x) (fp.isZero y)) js.nan
  (ite (or (fp.isInfinite y) (fp.isZero x)) x
  (let ((r (fp.rem x y)))
  (ite (fp.isZero r) (ite (fp.isNegative x) js.nz js.pz)
  (ite (= (fp.isNegative r) (fp.isNegative x)) r
  (ite (fp.isNegative x) (fp.sub RNE r (fp.abs y)) (fp.add RNE r (fp.abs y)))))))))
; Math.round (21.3.2.28): floor(x + 0.5) taken exactly, ties toward +Infinity, a -0 for x in [-0.5, 0)
(define-fun js.round ((x D)) D
  (let ((f (fp.roundToIntegral RTN x)))
  (let ((r (ite (fp.geq (fp.sub RNE x f) js.half) (fp.add RNE f js.one) f)))
  (ite (and (fp.isNegative x) (fp.isZero r)) js.nz r))))
; Math.min / Math.max (21.3.2.24, 21.3.2.25): NaN wins, -0 below +0
(define-fun js.min ((a D) (b D)) D
  (ite (or (fp.isNaN a) (fp.isNaN b)) js.nan (ite (fp.lt a b) a (ite (fp.lt b a) b (ite (fp.isNegative a) a b)))))
(define-fun js.max ((a D) (b D)) D
  (ite (or (fp.isNaN a) (fp.isNaN b)) js.nan (ite (fp.gt a b) a (ite (fp.gt b a) b (ite (fp.isNegative a) b a)))))
; Math.sign (21.3.2.29): NaN and the zeros are themselves
(define-fun js.sign ((x D)) D (ite (or (fp.isNaN x) (fp.isZero x)) x (ite (fp.isNegative x) (fp.neg js.one) js.one)))
; ToInt32 / ToUint32 (7.1.6, 7.1.7): NaN and infinities to 0, truncate, modulo 2^32. An integer of magnitude 2^84 or more
; is a multiple of 2^32 (its unit in the last place is 2^32 or more), so it is 0; below, the exact 85-bit integer's low 32 bits
(define-fun js.bits ((x D)) (_ BitVec 32)
  (let ((t (fp.roundToIntegral RTZ x)))
  (ite (or (fp.isNaN x) (fp.isInfinite x) (fp.geq (fp.abs t) ((_ to_fp 11 53) RNE 19342813113834066795298816.0))) #x00000000
    ((_ extract 31 0) ((_ fp.to_sbv 85) RTZ t)))))
(define-fun js.int32 ((x D)) D ((_ to_fp 11 53) RNE (js.bits x)))
(define-fun js.uint32 ((x D)) D ((_ to_fp_unsigned 11 53) RNE (js.bits x)))
(define-fun js.shift ((x D)) (_ BitVec 32) (bvand (js.bits x) #x0000001f))
(define-fun js.truthy ((x D)) Bool (not (or (fp.isNaN x) (fp.isZero x))))
`;

// ---------------------------------------------------------------------------------------------------------------
// The table of operations. `exact` operations name their SMT reading; `uf` operations are uninterpreted functions keyed
// by the operation's name, the same symbol on both sides (the engine is one, so equal arguments give equal results).
const D = 'D', B = 'Bool', S = 'String';
const lit = (x) => `((_ to_fp 11 53) RNE ${x})`;
const MATH_EXACT = {
  abs: [1, (a) => `(fp.abs ${a})`], floor: [1, (a) => `(fp.roundToIntegral RTN ${a})`], ceil: [1, (a) => `(fp.roundToIntegral RTP ${a})`],
  trunc: [1, (a) => `(fp.roundToIntegral RTZ ${a})`], round: [1, (a) => `(js.round ${a})`], sqrt: [1, (a) => `(fp.sqrt RNE ${a})`],
  sign: [1, (a) => `(js.sign ${a})`], fround: [1, (a) => `((_ to_fp 11 53) RNE ((_ to_fp 8 24) RNE ${a}))`],
  imul: [2, (a, b) => `((_ to_fp 11 53) RNE (bvmul (js.bits ${a}) (js.bits ${b})))`],
};
const MATH_UF = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh', 'exp', 'expm1', 'log', 'log1p', 'log2', 'log10', 'pow', 'cbrt', 'hypot', 'clz32']);
const MATH_CONST = { PI: Math.PI, E: Math.E, LN2: Math.LN2, LN10: Math.LN10, LOG2E: Math.LOG2E, LOG10E: Math.LOG10E, SQRT2: Math.SQRT2, SQRT1_2: Math.SQRT1_2 };
const NUMBER_CONST = { MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER, MIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER, EPSILON: Number.EPSILON, MAX_VALUE: Number.MAX_VALUE, MIN_VALUE: Number.MIN_VALUE, POSITIVE_INFINITY: Infinity, NEGATIVE_INFINITY: -Infinity, NaN: NaN };
const BIT = { [K.AmpersandToken]: 'bvand', [K.BarToken]: 'bvor', [K.CaretToken]: 'bvxor' };
const ARITH_OP = { [K.PlusToken]: 'fp.add', [K.MinusToken]: 'fp.sub', [K.AsteriskToken]: 'fp.mul', [K.SlashToken]: 'fp.div' };
const REL_OP = { [K.LessThanToken]: 'fp.lt', [K.LessThanEqualsToken]: 'fp.leq', [K.GreaterThanToken]: 'fp.gt', [K.GreaterThanEqualsToken]: 'fp.geq' };
const COMPOUND = { [K.PlusEqualsToken]: K.PlusToken, [K.MinusEqualsToken]: K.MinusToken, [K.AsteriskEqualsToken]: K.AsteriskToken, [K.SlashEqualsToken]: K.SlashToken, [K.PercentEqualsToken]: K.PercentToken, [K.AsteriskAsteriskEqualsToken]: K.AsteriskAsteriskToken,
  [K.AmpersandEqualsToken]: K.AmpersandToken, [K.BarEqualsToken]: K.BarToken, [K.CaretEqualsToken]: K.CaretToken, [K.LessThanLessThanEqualsToken]: K.LessThanLessThanToken, [K.GreaterThanGreaterThanEqualsToken]: K.GreaterThanGreaterThanToken, [K.GreaterThanGreaterThanGreaterThanEqualsToken]: K.GreaterThanGreaterThanGreaterThanToken };

// a double as an SMT-LIB literal, bit for bit (for values the encoder computes, never for source literals)
export function fpBits(x) {
  const b = new DataView(new ArrayBuffer(8)); b.setFloat64(0, x);
  const bits = b.getBigUint64(0).toString(2).padStart(64, '0');
  return `(fp #b${bits[0]} #b${bits.slice(1, 12)} #b${bits.slice(12)})`;
}
// a numeric literal's exact decimal value, the text `((_ to_fp 11 53) RNE <decimal>)` rounds as JavaScript parses it
export function exactDecimal(text) {
  const t = text.replace(/_/g, '');
  if (/^0[xXoObB]/.test(t)) return `${BigInt(t)}.0`;
  const m = t.match(/^(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/);
  if (!m) throw new Error(`not a numeric literal: ${text}`);
  const digits = ((m[1] ?? '') + (m[2] ?? '')).replace(/^0+(?=\d)/, '') || '0';
  const exp = Number(m[3] ?? 0) - (m[2] ?? '').length;
  if (exp >= 0) return `${digits}${'0'.repeat(exp)}.0`;
  const pad = digits.padStart(-exp + 1, '0');
  return `${pad.slice(0, pad.length + exp)}.${pad.slice(pad.length + exp)}`;
}
const fromValue = (x) => (Object.is(x, -0) ? 'js.nz' : Number.isNaN(x) ? 'js.nan' : x === Infinity ? '(_ +oo 11 53)' : x === -Infinity ? '(_ -oo 11 53)' : fpBits(x));
const strLit = (s) => `"${[...s].map((c) => { const cp = c.codePointAt(0); return c === '"' ? '""' : cp >= 32 && cp < 127 && c !== '\\' ? c : `\\u{${cp.toString(16)}}`; }).join('')}"`;

class Unsupported extends Error {}
// a record type: an object type with properties only (no call or index signature, not an array, a tuple or a class
// instance with methods); its fields are read by name
const record = (t) => !!t && !!(t.flags & TF.Object) && !t.getCallSignatures().length && !t.getStringIndexType() && !t.getNumberIndexType() && !(t.symbol && ['Array', 'ReadonlyArray', 'Map', 'Set', 'Date', 'Promise', 'RegExp'].includes(t.symbol.name)) && t.getProperties().every((p) => !(p.flags & ts.SymbolFlags.Method));
const refuse = (sf, n, why) => { throw new Unsupported(`${why}: \`${n.getText(sf).slice(0, 60)}\` (line ${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1})`); };
const sortOfType = (t) => {
  if (!t) return null;
  if (t.flags & TF.NumberLike) return D;
  if (t.flags & TF.BooleanLike) return B;
  if (t.flags & TF.StringLike) return S;
  if (t.isUnion?.()) { const ss = [...new Set(t.types.map(sortOfType))]; return ss.length === 1 ? ss[0] : null; }
  return null;
};

// the unit's result as a term over its parameters. `side` only names the encoding in reasons; the symbols of both
// sides are the same (parameters are positional: p0, p1, ...; uninterpreted functions by operation name)
export function encodeUnit(checker, sf, unit, side = 'unit') {
  const units = topLevelFunctions(sf);
  const u = typeof unit === 'string' ? units.get(unit) : unit;
  const ops = new Set(), ufs = new Map(), leaves = new Map(), unread = new Set(); // ufs: symbol -> [arg sorts, result sort]; leaves: record path -> sort
  try {
    if (!u) throw new Unsupported(`no unit ${unit} in ${side}`);
    if (u.isAsync || u.fn.asteriskToken || u.cls) throw new Unsupported(`${u.name} is ${u.cls ? 'a class member' : u.isAsync ? 'async' : 'a generator'}`);
    const params = u.params.map((p, i) => {
      if (!ts.isIdentifier(p.name) || p.initializer || p.questionToken || p.dotDotDotToken) refuse(sf, p, 'a parameter that is not one plain name');
      // a parameter of another type (an opaque any, a DOM event the checkout cannot resolve, a function) is Unread: it
      // has no symbol in the query and no entry in env, so a read of it anywhere (here or in a callee it is passed to)
      // refuses the unit, and a term that never names it is the same function for every value of it (design/top-blockers.md)
      const t = checker.getTypeAtLocation(p), s = sortOfType(t) ?? (record(t) ? 'Obj' : 'Unread');
      return { name: `p${i}`, sort: s, sym: checker.getSymbolAtLocation(p.name) };
    });
    // a record parameter is read through its paths: each scalar leaf the unit reads is a parameter of its own,
    // `|p0.a.b|`, so a unit that only reads its record is a function of those leaves (a write to it is refused)
    params.filter((p) => p.sort === 'Unread').forEach((p) => unread.add(p.sym));
    const env = new Map(params.filter((p) => p.sort !== 'Unread').map((p) => [p.sym, p.sort === 'Obj' ? { s: 'Obj', path: p.name } : { t: p.name, s: p.sort }]));
    const result = callBody(u, env, 0);
    return { ok: true, params: params.map(({ name, sort }) => ({ name, sort })), leaves: Object.fromEntries([...leaves].sort()), value: result, sort: result.s, encoded: [...ops].sort(), uninterpreted: [...ufs.keys()].sort(), ufs: Object.fromEntries(ufs) };
  } catch (e) {
    if (e instanceof Unsupported) return { ok: false, reason: e.message, encoded: [...ops].sort(), uninterpreted: [...ufs.keys()].sort() };
    throw e;
  }

  function uf(name, args, res) { const key = name; const sig = [args.map((a) => a.s), res]; const had = ufs.get(key); if (had && JSON.stringify(had) !== JSON.stringify(sig)) throw new Unsupported(`${name} read at two signatures`); ufs.set(key, sig); return { t: args.length ? `(|${key}| ${args.map((a) => a.t).join(' ')})` : `|${key}|`, s: res }; }
  function callBody(v, env, depth) {
    if (depth > 8) throw new Unsupported(`calls nest deeper than 8 at ${v.name}`);
    if (!ts.isBlock(v.body)) return expr(v.body, env, depth);
    return block([...v.body.statements], 0, env, depth);
  }
  // statements in order; a return ends the path; `if` splits the rest of the list into its two branches
  function block(stmts, i, env, depth) {
    if (i >= stmts.length) throw new Unsupported('a path that ends without a return');
    const s = stmts[i];
    if (ts.isReturnStatement(s)) { if (!s.expression) refuse(sf, s, 'a return without a value'); return expr(s.expression, env, depth); }
    if (ts.isBlock(s)) return block([...s.statements, ...stmts.slice(i + 1)], 0, env, depth);
    if (ts.isEmptyStatement(s)) return block(stmts, i + 1, env, depth);
    if (ts.isVariableStatement(s)) {
      const env2 = new Map(env);
      for (const d of s.declarationList.declarations) {
        if (!ts.isIdentifier(d.name) || !d.initializer) refuse(sf, d, 'a declaration that is not one name with a value');
        env2.set(checker.getSymbolAtLocation(d.name), expr(d.initializer, env2, depth));
      }
      return block(stmts, i + 1, env2, depth);
    }
    if (ts.isIfStatement(s)) {
      const c = cond(s.expression, env, depth), rest = stmts.slice(i + 1);
      const arm = (st) => (st ? (ts.isBlock(st) ? [...st.statements] : [st]) : []);
      const a = block([...arm(s.thenStatement), ...rest], 0, env, depth), b = block([...arm(s.elseStatement), ...rest], 0, env, depth);
      return ite(c, a, b, s);
    }
    if (ts.isExpressionStatement(s)) { const env2 = assign(s.expression, env, depth); return block(stmts, i + 1, env2, depth); }
    refuse(sf, s, `a ${ts.SyntaxKind[s.kind]}`);
  }
  // an assignment to a local as a statement: the local takes the new term on the rest of the path
  function assign(e, env, depth) {
    const target = (x) => { const sym = ts.isIdentifier(x) ? checker.getSymbolAtLocation(x) : null; if (!sym || !env.has(sym)) refuse(sf, x, 'a write outside the unit\'s locals'); return sym; };
    const env2 = new Map(env);
    if (ts.isBinaryExpression(e) && e.operatorToken.kind === K.EqualsToken) { env2.set(target(e.left), expr(e.right, env, depth)); return env2; }
    if (ts.isBinaryExpression(e) && COMPOUND[e.operatorToken.kind] !== undefined) { const sym = target(e.left); env2.set(sym, binary(COMPOUND[e.operatorToken.kind], env.get(sym), expr(e.right, env, depth), e)); return env2; }
    if ((ts.isPostfixUnaryExpression(e) || ts.isPrefixUnaryExpression(e)) && [K.PlusPlusToken, K.MinusMinusToken].includes(e.operator)) { const sym = target(e.operand); env2.set(sym, binary(e.operator === K.PlusPlusToken ? K.PlusToken : K.MinusToken, env.get(sym), { t: 'js.one', s: D }, e)); return env2; }
    refuse(sf, e, 'an expression statement that is not an assignment to a local');
  }
  function ite(c, a, b, n) {
    if (a.s !== b.s || a.s === 'Rec' || b.s === 'Rec') { if (a.s === 'Rec' && b.s === 'Rec' && a.keys.join() === b.keys.join()) return { s: 'Rec', keys: a.keys, fields: a.fields.map((f, i) => ite(c, f, b.fields[i], n)) }; refuse(sf, n, 'branches of different sorts'); }
    return { t: `(ite ${c} ${a.t} ${b.t})`, s: a.s };
  }
  function cond(e, env, depth) { const v = expr(e, env, depth); if (v.s === B) return v.t; if (v.s === D) { ops.add('truthy'); return `(js.truthy ${v.t})`; } if (v.s === S) return `(not (= ${v.t} ""))`; refuse(sf, e, 'a condition that is not a number, boolean or string'); }
  function num(e, env, depth) { const v = expr(e, env, depth); if (v.s !== D) refuse(sf, e, 'a number operation on a value that is not a number'); return v; }
  function binary(op, l, r, n) {
    if (l.s !== D || r.s !== D) {
      if (op === K.PlusToken && (l.s === S || r.s === S)) { ops.add('string +'); return { t: `(str.++ ${toStr(l, n).t} ${toStr(r, n).t})`, s: S }; }
      refuse(sf, n, 'an operator on values that are not numbers');
    }
    if (ARITH_OP[op]) { ops.add(ts.tokenToString(op)); return { t: `(${ARITH_OP[op]} RNE ${l.t} ${r.t})`, s: D }; }
    if (op === K.PercentToken) { ops.add('%'); return { t: `(js.rem ${l.t} ${r.t})`, s: D }; }
    if (op === K.AsteriskAsteriskToken) return uf('Math.pow', [l, r], D); // Number::exponentiate is implementation-approximated (6.1.6.1.3), as Math.pow
    if (BIT[op]) { ops.add(ts.tokenToString(op)); return { t: `((_ to_fp 11 53) RNE (${BIT[op]} (js.bits ${l.t}) (js.bits ${r.t})))`, s: D }; }
    if (op === K.LessThanLessThanToken) { ops.add('<<'); return { t: `((_ to_fp 11 53) RNE (bvshl (js.bits ${l.t}) (js.shift ${r.t})))`, s: D }; }
    if (op === K.GreaterThanGreaterThanToken) { ops.add('>>'); return { t: `((_ to_fp 11 53) RNE (bvashr (js.bits ${l.t}) (js.shift ${r.t})))`, s: D }; }
    if (op === K.GreaterThanGreaterThanGreaterThanToken) { ops.add('>>>'); return { t: `((_ to_fp_unsigned 11 53) RNE (bvlshr (js.bits ${l.t}) (js.shift ${r.t})))`, s: D }; }
    refuse(sf, n, 'an operator outside the table');
  }
  function toStr(v, n) { if (v.s === S) return v; if (v.s === D) return uf('Number::toString', [v], S); refuse(sf, n, 'a string conversion of a value that is not a number or string'); }
  function expr(e, env, depth) {
    if (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isNonNullExpression(e) || ts.isSatisfiesExpression?.(e)) return expr(e.expression, env, depth);
    if (ts.isNumericLiteral(e)) { ops.add('literal'); return { t: lit(exactDecimal(e.text)), s: D }; }
    if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) return { t: strLit(e.text), s: S };
    if (e.kind === K.TrueKeyword) return { t: 'true', s: B };
    if (e.kind === K.FalseKeyword) return { t: 'false', s: B };
    if (ts.isTemplateExpression(e)) { ops.add('template'); let t = strLit(e.head.text); for (const sp of e.templateSpans) t = `(str.++ ${t} ${toStr(expr(sp.expression, env, depth), sp.expression).t} ${strLit(sp.literal.text)})`; return { t, s: S }; }
    if (ts.isIdentifier(e)) {
      const sym = checker.getSymbolAtLocation(e);
      if (sym && env.has(sym)) return env.get(sym);
      if (e.text === 'NaN' || e.text === 'Infinity') { const d = sym?.valueDeclaration; if (!d || d.getSourceFile() !== sf) return { t: fromValue(e.text === 'NaN' ? NaN : Infinity), s: D }; }
      const d = sym?.valueDeclaration;
      if (d && ts.isVariableDeclaration(d) && d.getSourceFile() === sf && d.initializer && (ts.getCombinedNodeFlags(d) & ts.NodeFlags.Const) && ts.isSourceFile(d.parent.parent.parent)) return expr(d.initializer, new Map(), depth); // a module const: its value, read where it is declared
      if (sym && unread.has(sym)) refuse(sf, e, 'a read of a parameter that is not a number, boolean, string or record');
      refuse(sf, e, 'a name outside the unit\'s parameters, locals and module constants');
    }
    if (ts.isPrefixUnaryExpression(e)) {
      if (e.operator === K.ExclamationToken) return { t: `(not ${cond(e.operand, env, depth)})`, s: B };
      const v = num(e.operand, env, depth);
      if (e.operator === K.MinusToken) { ops.add('unary -'); return { t: `(fp.neg ${v.t})`, s: D }; }
      if (e.operator === K.PlusToken) return v;
      if (e.operator === K.TildeToken) { ops.add('~'); return { t: `((_ to_fp 11 53) RNE (bvnot (js.bits ${v.t})))`, s: D }; }
      refuse(sf, e, 'an update inside an expression');
    }
    if (ts.isConditionalExpression(e)) return ite(cond(e.condition, env, depth), expr(e.whenTrue, env, depth), expr(e.whenFalse, env, depth), e);
    if (ts.isBinaryExpression(e)) {
      const op = e.operatorToken.kind;
      if (op === K.AmpersandAmpersandToken || op === K.BarBarToken) {
        const l = expr(e.left, env, depth), r = expr(e.right, env, depth);
        if (l.s === B && r.s === B) return { t: `(${op === K.AmpersandAmpersandToken ? 'and' : 'or'} ${l.t} ${r.t})`, s: B };
        if (l.s === r.s && l.s !== 'Rec') { const c = cond(e.left, env, depth); return op === K.AmpersandAmpersandToken ? { t: `(ite ${c} ${r.t} ${l.t})`, s: l.s } : { t: `(ite ${c} ${l.t} ${r.t})`, s: l.s }; }
        refuse(sf, e, 'a logical operator over values of two sorts');
      }
      if ([K.EqualsEqualsEqualsToken, K.ExclamationEqualsEqualsToken, K.EqualsEqualsToken, K.ExclamationEqualsToken].includes(op)) {
        const l = expr(e.left, env, depth), r = expr(e.right, env, depth);
        if (l.s !== r.s || l.s === 'Rec') refuse(sf, e, 'an equality of values of two sorts');
        const eq = l.s === D ? (ops.add('==='), `(fp.eq ${l.t} ${r.t})`) : `(= ${l.t} ${r.t})`; // IsStrictlyEqual (7.2.15): -0 equals 0, NaN equals nothing
        return { t: [K.EqualsEqualsEqualsToken, K.EqualsEqualsToken].includes(op) ? eq : `(not ${eq})`, s: B };
      }
      if (REL_OP[op]) { const l = num(e.left, env, depth), r = num(e.right, env, depth); ops.add(ts.tokenToString(op)); return { t: `(${REL_OP[op]} ${l.t} ${r.t})`, s: B }; }
      if (op === K.CommaToken) { expr(e.left, env, depth); return expr(e.right, env, depth); }
      return binary(op, expr(e.left, env, depth), expr(e.right, env, depth), e);
    }
    if (ts.isPropertyAccessExpression(e)) {
      const base = ts.isIdentifier(e.expression) ? e.expression.text : null, name = e.name.text;
      const local = ts.isIdentifier(e.expression) && env.has(checker.getSymbolAtLocation(e.expression));
      if (!local && base === 'Math' && name in MATH_CONST) return { t: fromValue(MATH_CONST[name]), s: D };
      if (!local && base === 'Number' && name in NUMBER_CONST) return { t: fromValue(NUMBER_CONST[name]), s: D };
      if (name === 'length') { const v = expr(e.expression, env, depth); if (v.s === S) return uf('String.length', [v], D); } // UTF-16 length: no SMT string operator counts code units
      if (!e.questionDotToken) {
        const v = expr(e.expression, env, depth);
        if (v.s === 'Obj') {
          const t = checker.getTypeAtLocation(e), at = `${v.path}.${name}`;
          if (/[|\\]/.test(name)) refuse(sf, e, 'a field name SMT-LIB cannot quote');
          const ls = sortOfType(t); if (ls) { leaves.set(at, ls); ops.add('record read'); return { t: `|${at}|`, s: ls }; }
          if (record(t)) return { s: 'Obj', path: at };
          refuse(sf, e, 'a record field that is not a number, boolean, string or record');
        }
      }
      refuse(sf, e, 'a property read');
    }
    if (ts.isCallExpression(e)) return call(e, env, depth);
    if (ts.isObjectLiteralExpression(e)) {
      const keys = [], fields = [];
      for (const p of e.properties) {
        if (ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) { keys.push(p.name.text); fields.push(expr(p.initializer, env, depth)); }
        else if (ts.isShorthandPropertyAssignment(p)) { keys.push(p.name.text); const sym = checker.getShorthandAssignmentValueSymbol(p); if (!env.has(sym)) refuse(sf, p, 'a shorthand of a name outside the unit'); fields.push(env.get(sym)); }
        else refuse(sf, p, 'an object member that is not a plain key and value');
      }
      if (fields.some((f) => f.s === 'Rec')) refuse(sf, e, 'a nested object');
      return { s: 'Rec', keys, fields };
    }
    if (ts.isArrayLiteralExpression(e)) {
      if (e.elements.some((x) => ts.isSpreadElement(x) || ts.isOmittedExpression(x))) refuse(sf, e, 'a spread or a hole');
      const fields = e.elements.map((x) => expr(x, env, depth)); if (fields.some((f) => f.s === 'Rec')) refuse(sf, e, 'a nested array');
      return { s: 'Rec', keys: fields.map((_, i) => `[${i}]`), fields };
    }
    refuse(sf, e, `a ${ts.SyntaxKind[e.kind]}`);
  }
  function call(e, env, depth) {
    const args = () => e.arguments.map((a) => { if (ts.isSpreadElement(a)) refuse(sf, a, 'a spread argument'); return expr(a, env, depth); });
    const callee = e.expression;
    const m = mathCall(e);
    if (m && !env.has(checker.getSymbolAtLocation(callee.expression))) {
      const as = args(); if (as.some((a) => a.s !== D)) refuse(sf, e, 'a Math call on a value that is not a number');
      if (MATH_EXACT[m]) { const [n, f] = MATH_EXACT[m]; if (as.length !== n) refuse(sf, e, `Math.${m} with ${as.length} arguments`); ops.add(`Math.${m}`); return { t: f(...as.map((a) => a.t)), s: D }; }
      if (m === 'min' || m === 'max') { ops.add(`Math.${m}`); if (!as.length) return { t: fromValue(m === 'min' ? Infinity : -Infinity), s: D }; return { t: as.slice(1).reduce((acc, a) => `(js.${m} ${acc} ${a.t})`, as[0].t), s: D }; }
      if (MATH_UF.has(m)) return uf(`Math.${m}/${as.length}`, as, D);
      refuse(sf, e, `Math.${m}`);
    }
    if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && callee.expression.text === 'Number' && !env.has(checker.getSymbolAtLocation(callee.expression))) {
      const as = args(), n = callee.name.text;
      if (as.length !== 1) refuse(sf, e, `Number.${n} with ${as.length} arguments`);
      const a = as[0]; if (a.s !== D) { if (n === 'isNaN' || n === 'isFinite' || n === 'isInteger' || n === 'isSafeInteger') return { t: 'false', s: B }; refuse(sf, e, `Number.${n} of a value that is not a number`); }
      ops.add(`Number.${n}`);
      const integral = `(and (not (fp.isNaN ${a.t})) (not (fp.isInfinite ${a.t})) (fp.eq (fp.roundToIntegral RTZ ${a.t}) ${a.t}))`;
      if (n === 'isNaN') return { t: `(fp.isNaN ${a.t})`, s: B };
      if (n === 'isFinite') return { t: `(not (or (fp.isNaN ${a.t}) (fp.isInfinite ${a.t})))`, s: B };
      if (n === 'isInteger') return { t: integral, s: B };
      if (n === 'isSafeInteger') return { t: `(and ${integral} (fp.leq (fp.abs ${a.t}) ${fromValue(Number.MAX_SAFE_INTEGER)}))`, s: B };
      if (n === 'parseFloat') refuse(sf, e, 'Number.parseFloat of a number');
      refuse(sf, e, `Number.${n}`);
    }
    if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && callee.expression.text === 'Object' && callee.name.text === 'is' && !env.has(checker.getSymbolAtLocation(callee.expression))) {
      const [a, b] = args(); if (!a || !b || a.s !== b.s || a.s === 'Rec') refuse(sf, e, 'Object.is of two sorts'); ops.add('Object.is'); return { t: `(= ${a.t} ${b.t})`, s: B }; // SameValue (7.2.10) is SMT `=`
    }
    if (ts.isIdentifier(callee)) {
      const sym = checker.getSymbolAtLocation(callee), d = sym?.valueDeclaration;
      const global = !d || d.getSourceFile() !== sf;
      if (global && (callee.text === 'isNaN' || callee.text === 'isFinite')) { const [a] = args(); if (a?.s !== D) refuse(sf, e, `${callee.text} of a value that is not a number`); ops.add(callee.text); return { t: callee.text === 'isNaN' ? `(fp.isNaN ${a.t})` : `(not (or (fp.isNaN ${a.t}) (fp.isInfinite ${a.t})))`, s: B }; }
      if (global && callee.text === 'String') { const [a] = args(); return toStr(a, e); }
      if (global && callee.text === 'Number') { const [a] = args(); if (a?.s === D) return a; if (a?.s === S) return uf('Number/string', [a], D); refuse(sf, e, 'Number of a value that is not a number or string'); }
      if (global && (callee.text === 'parseFloat' || callee.text === 'parseInt')) { const as = args(); if (as[0]?.s !== S || (as[1] && as[1].s !== D)) refuse(sf, e, `${callee.text} of a value that is not a string`); return uf(`${callee.text}/${as.length}`, as, D); }
      const target = !global && [...units.values()].find((v) => v.node === d || v.fn === d || v.fn === d?.initializer);
      if (target) {
        if (target.isAsync || target.fn.asteriskToken || target.cls) refuse(sf, e, 'a call of an async, generator or member unit');
        const as = args();
        if (as.length !== target.params.length) refuse(sf, e, 'a call whose argument count differs from the parameters');
        const env2 = new Map();
        target.params.forEach((p, i) => { if (!ts.isIdentifier(p.name) || p.initializer || p.dotDotDotToken) refuse(sf, p, 'a callee parameter that is not one plain name'); env2.set(checker.getSymbolAtLocation(p.name), as[i]); });
        ops.add('call (inlined)');
        return callBody(target, env2, depth + 1);
      }
      refuse(sf, e, 'a call of a function outside the file\'s units');
    }
    if (ts.isPropertyAccessExpression(callee) && NUMBER_METHODS.has(callee.name.text)) {
      const recv = expr(callee.expression, env, depth); if (recv.s !== D) refuse(sf, e, `${callee.name.text} of a value that is not a number`);
      const as = args(); if (as.some((a) => a.s !== D)) refuse(sf, e, `${callee.name.text} with an argument that is not a number`);
      if (callee.name.text === 'toString' && !as.length) return toStr(recv, e);
      return uf(`Number::${callee.name.text}/${as.length}`, [recv, ...as], S);
    }
    refuse(sf, e, 'a call outside the table');
  }
}

const flat = (v, path = '') => (v.s === 'Rec' ? v.fields.flatMap((f, i) => flat(f, `${path}.${v.keys[i]}`)) : [{ path, t: v.t, s: v.s }]);
// the equivalence query of two encodings: unsat proves the two results are the same value (SameValue on numbers) for
// every input; a sat model names the parameters' values (get-value on each)
export function equivalenceQuery(parent, candidate) {
  if (!parent.ok || !candidate.ok) return { ok: false, reason: parent.ok ? candidate.reason : parent.reason };
  if (JSON.stringify(parent.params) !== JSON.stringify(candidate.params)) return { ok: false, reason: 'the parameter lists differ' };
  const P = flat(parent.value), C = flat(candidate.value);
  if (P.map((x) => `${x.path}:${x.s}`).join() !== C.map((x) => `${x.path}:${x.s}`).join()) return { ok: false, reason: 'the results have different shapes' };
  const ufs = { ...parent.ufs };
  for (const [k, sig] of Object.entries(candidate.ufs)) { if (ufs[k] && JSON.stringify(ufs[k]) !== JSON.stringify(sig)) return { ok: false, reason: `${k} at two signatures` }; ufs[k] = sig; }
  const differ = P.map((x, i) => `(not (= ${x.t} ${C[i].t}))`);
  const leaves = { ...parent.leaves, ...candidate.leaves };
  const vars = [...parent.params.filter((p) => p.sort !== 'Obj' && p.sort !== 'Unread').map((p) => ({ name: p.name, sort: p.sort })), ...Object.entries(leaves).map(([k, s]) => ({ name: `|${k}|`, path: k, sort: s }))];
  const text = [PRELUDE,
    ...Object.entries(ufs).map(([k, [as, r]]) => `(declare-fun |${k}| (${as.join(' ')}) ${r})`),
    ...parent.params.filter((p) => p.sort !== 'Obj' && p.sort !== 'Unread').map((p) => `(declare-const ${p.name} ${p.sort})`),
    ...Object.entries(leaves).map(([k, s]) => `(declare-const |${k}| ${s})`),
    `(assert ${differ.length === 1 ? differ[0] : `(or ${differ.join(' ')})`})`, '(check-sat)', vars.length ? `(get-value (${vars.map((v) => v.name).join(' ')}))` : '', ''].join('\n');
  return { ok: true, text, params: parent.params, vars, encoded: [...new Set([...parent.encoded, ...candidate.encoded])].sort(), uninterpreted: Object.keys(ufs).sort() };
}
