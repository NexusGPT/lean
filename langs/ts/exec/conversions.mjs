// The numeric conversions a body applies to a read, by family, and per family the values on which two of its members
// answer differently (design/w9aj-numeric-conversion.md). A change of one conversion for another of its family
// (`Number(s)` for `parseInt(s)`, `Math.floor` for `Math.trunc`, `isNaN` for `Number.isNaN`, `x || 0` for `x ?? 0`)
// agrees on the plain values a draw holds; it is told apart only by an input on which the two disagree. The reads a
// conversion applies to (usage.mjs for the inputs, compared.mjs for the world's answers, search.mjs for the leaf
// changes) are drawn on those values, on both versions, as a compared literal is.
//
// Syntax only. The read a conversion takes is its argument, or an operand of the arithmetic its argument computes
// (`Math.floor(start * k / 4)` reads `start`), or the left of `x || <number>`.
import { ts } from '../common.mjs';

// One list per family, each value with the pair it separates. Values are JS values (NaN and -0 included); an entry
// `{t:'object'}` / `{t:'array'}` / `{t:'undefined'}` stands for a fresh value of that kind (spec.mjs boundaryOf).
export const FAMILY_VALUES = {
  // Number(x), parseInt(x), parseFloat(x), Number.parseInt/parseFloat, unary +x: a text read as a number
  parse: [
    ['', "Number '' is 0, parseInt and parseFloat NaN"],
    [' ', "Number ' ' is 0, the parsers NaN"],
    ['1.5', 'parseInt drops the fraction: 1 against 1.5'],
    ['12px', 'the parsers keep the prefix (12), Number is NaN'],
    ['0x1A', 'Number and parseInt (no radix) read hex (26), parseFloat and parseInt(s, 10) stop at the x (0)'],
    ['1e3', 'parseInt stops at the e: 1 against 1000'],
    ['Infinity', 'Number and parseFloat read it, parseInt is NaN'],
    ['0b11', 'Number reads binary (3), the parsers 0'],
    ['.5', 'parseInt is NaN, the others 0.5'],
    ['-0', 'a signed zero: -0 to every conversion, 0 to `x | 0`'],
    ['1_000', 'Number is NaN, the parsers stop at the separator (1)'],
    [-0, 'parseFloat(-0) reads the text "0": 0 against Number\'s -0'],
    [1.5, 'parseInt truncates: 1 against 1.5'],
    [-1.5, 'parseInt truncates toward zero: -1 against -1.5'],
    [1e21, 'parseInt reads the text "1e+21": 1'],
    [5e-7, 'parseInt reads the text "5e-7": 5'],
    [null, 'Number(null) is 0, the parsers NaN'],
    [true, 'Number(true) is 1, the parsers NaN'],
    [false, 'Number(false) is 0, the parsers NaN'],
    [{ t: 'array' }, 'Number([]) is 0, the parsers NaN'],
  ],
  // Math.floor, Math.ceil, Math.round, Math.trunc, ~~x, x | 0, x >> 0: a number cut to an integer
  round: [
    [-1.5, 'floor -2, trunc and ceil -1, round -1'],
    [-0.5, 'floor -1, trunc, ceil and round -0, `| 0` 0'],
    [0.5, 'round and ceil 1, floor and trunc 0'],
    [1.5, 'ceil and round 2, floor and trunc 1'],
    [-2.5, 'round -2 (half toward +Infinity), floor -3, trunc -2'],
    [2.7, 'round and ceil 3, floor and trunc 2'],
    [-2.7, 'floor and round -3, trunc and ceil -2'],
    [2 ** 31 + 0.5, '`| 0` and `~~` wrap to a negative int32, trunc keeps 2147483648'],
    ['1.5', 'a text: the Math functions convert it, ~~ and | 0 too, a parser stops elsewhere'],
  ],
  // isNaN, isFinite, Number.isNaN, Number.isFinite: a test of a number, the global ones converting first
  nan: [
    ['abc', 'isNaN converts it (true), Number.isNaN does not (false)'],
    ['1', 'isFinite converts it (true), Number.isFinite does not (false)'],
    ['', "isFinite('') is true (0), Number.isFinite false"],
    [null, 'isFinite(null) is true (0), Number.isFinite false'],
    [true, 'isFinite(true) is true (1), Number.isFinite false'],
    [{ t: 'undefined' }, 'isNaN(undefined) is true, Number.isNaN false'],
    [{ t: 'object' }, 'isNaN({}) is true, Number.isNaN false'],
    [NaN, 'the value both tests name'],
    [Infinity, 'finite to neither, NaN to neither'],
  ],
  // `x || <number>` against `x ?? <number>`: the falsy values that are not absent
  fallback: [
    [0, '`0 || d` is d, `0 ?? d` is 0'],
    [NaN, '`NaN || d` is d, `NaN ?? d` is NaN'],
    [-0, '`-0 || d` is d, `-0 ?? d` is -0'],
    ['', "`'' || d` is d, `'' ?? d` is ''"],
    [false, '`false || d` is d, `false ?? d` is false'],
  ],
};
export const FAMILIES = Object.keys(FAMILY_VALUES);
export const valuesOf = (family) => (FAMILY_VALUES[family] ?? []).map(([v]) => v);
// the values of a leaf's families as the leaf changes of the search (search.mjs leafValues) take them: primitives only
export const searchValuesOf = (families) => [...new Set(families)].flatMap(valuesOf).filter((v) => v === null || typeof v !== 'object');

// the answers a world read a conversion takes is set to (compared.mjs, the world search's guided moves): a few per
// family, the ones that separate the most pairs, since each is a move of the climb's budget
export const WORLD_PICK = { parse: ['12px', '', '1.5', '0x1A'], round: [-1.5, 0.5], nan: ['abc', '1', { t: 'undefined' }], fallback: [NaN, 0, '', false] };
// the world's answers (fake.mjs): a value as an answer kind, `num:<text>` for a number JSON cannot hold (NaN, -0,
// the infinities), `lit:<json>` for the rest; the fresh-value stand-ins by the menu's own kinds
export function worldKindOf(v) {
  if (typeof v === 'number') return v === 0 && !Object.is(v, -0) ? 'zero' : Number.isFinite(v) && !Object.is(v, -0) ? `lit:${JSON.stringify(v)}` : `num:${Object.is(v, -0) ? '-0' : String(v)}`;
  if (v === '') return 'empty';
  if (v === null) return 'null';
  if (v === true) return 'true';
  if (v === false) return 'false';
  if (typeof v === 'string') return `lit:${JSON.stringify(v)}`;
  if (v && typeof v === 'object') return v.t === 'undefined' ? 'undefined' : v.t === 'array' ? 'list' : null;
  return null;
}

const TEXT_KEPT = new Set(['trim', 'trimStart', 'trimEnd', 'toLowerCase', 'toUpperCase', 'toString', 'valueOf', 'normalize']);
const MATH_ROUND = new Set(['floor', 'ceil', 'round', 'trunc']);
const NUMBER_PARSE = new Set(['parseInt', 'parseFloat']);
const NUMBER_TEST = new Set(['isNaN', 'isFinite']); // the tests whose global twin converts first (isInteger and isSafeInteger have none)
const strip = (e) => { while (e && (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e)) || ts.isTypeAssertionExpression(e))) e = e.expression; return e; };
const isNumLit = (e) => { e = strip(e); return !!e && (ts.isNumericLiteral(e) || (ts.isPrefixUnaryExpression(e) && e.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(e.operand))); };
const isZero = (e) => { e = strip(e); return !!e && ts.isNumericLiteral(e) && Number(e.text) === 0; };

// the conversion a node applies: { family, arg, by } (arg the expression converted, by the conversion's own form:
// `Number`, `Math.floor`, `+`, `~~`, `|0`, `||`), or null. A call by its global name
// (`Number`, `parseInt`, `parseFloat`, `isNaN`, `isFinite`), Number's own (`Number.parseInt`, `Number.isNaN`, ...),
// Math's rounding; `+x`, `~~x`, `x | 0`, `x >> 0`; `x || <number>`
export function conversionOf(n) {
  if (ts.isCallExpression(n) && n.arguments.length >= 1 && !ts.isSpreadElement(n.arguments[0])) {
    const c = strip(n.expression), arg = n.arguments[0];
    if (ts.isIdentifier(c)) {
      if (c.text === 'Number' || c.text === 'parseInt' || c.text === 'parseFloat') return { family: 'parse', arg, by: c.text };
      if (c.text === 'isNaN' || c.text === 'isFinite') return { family: 'nan', arg, by: c.text };
      return null;
    }
    if (ts.isPropertyAccessExpression(c) && ts.isIdentifier(c.expression) && ts.isIdentifier(c.name)) {
      const o = c.expression.text, m = c.name.text;
      if (o === 'Number' && NUMBER_PARSE.has(m)) return { family: 'parse', arg, by: `${o}.${m}` };
      if (o === 'Number' && NUMBER_TEST.has(m)) return { family: 'nan', arg, by: `${o}.${m}` };
      if (o === 'Math' && MATH_ROUND.has(m)) return { family: 'round', arg, by: `${o}.${m}` };
    }
    return null;
  }
  if (ts.isPrefixUnaryExpression(n)) {
    if (n.operator === ts.SyntaxKind.PlusToken) return { family: 'parse', arg: n.operand, by: '+' };
    if (n.operator === ts.SyntaxKind.TildeToken) { const o = strip(n.operand); if (o && ts.isPrefixUnaryExpression(o) && o.operator === ts.SyntaxKind.TildeToken) return { family: 'round', arg: o.operand, by: '~~' }; }
    return null;
  }
  if (ts.isBinaryExpression(n)) {
    const k = n.operatorToken.kind;
    if ((k === ts.SyntaxKind.BarToken || k === ts.SyntaxKind.GreaterThanGreaterThanToken || k === ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken) && isZero(n.right)) return { family: 'round', arg: n.left, by: `${n.operatorToken.getText()}0` };
    if (k === ts.SyntaxKind.BarBarToken && isNumLit(n.right)) return { family: 'fallback', arg: n.left, by: '||' };
  }
  return null;
}

// the expressions whose value flows into a converted expression: the expression itself, and through arithmetic
// (+ - * / % **, unary - +), `??`/`||` defaults' left sides, a conditional's branches and a text's case or blanks
// changed, their operands; `local` maps
// an identifier to the initializer of the local it names (followed once per name), or null
export function flowsInto(e, local = null) {
  const out = [], seen = new Set();
  const ARITH = new Set([ts.SyntaxKind.PlusToken, ts.SyntaxKind.MinusToken, ts.SyntaxKind.AsteriskToken, ts.SyntaxKind.SlashToken, ts.SyntaxKind.PercentToken, ts.SyntaxKind.AsteriskAsteriskToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken]);
  const go = (x, d) => {
    x = strip(x);
    if (!x || d > 8) return;
    out.push(x);
    if (ts.isBinaryExpression(x) && ARITH.has(x.operatorToken.kind)) { go(x.left, d + 1); go(x.right, d + 1); return; }
    if (ts.isPrefixUnaryExpression(x) && (x.operator === ts.SyntaxKind.MinusToken || x.operator === ts.SyntaxKind.PlusToken)) { go(x.operand, d + 1); return; }
    if (ts.isConditionalExpression(x)) { go(x.whenTrue, d + 1); go(x.whenFalse, d + 1); return; }
    // a text kept as it is but for its case or its outer blanks: `s.trim()`, `String(x)`, `x.toString()`, `${x}`
    if (ts.isCallExpression(x)) { const c = strip(x.expression); if (ts.isPropertyAccessExpression(c) && ts.isIdentifier(c.name) && TEXT_KEPT.has(c.name.text) && x.arguments.length === 0) go(c.expression, d + 1); else if (ts.isIdentifier(c) && c.text === 'String' && x.arguments.length === 1) go(x.arguments[0], d + 1); return; }
    if (ts.isTemplateExpression(x) && x.templateSpans.length === 1 && !x.head.text && !x.templateSpans[0].literal.text) { go(x.templateSpans[0].expression, d + 1); return; }
    if (ts.isIdentifier(x) && local && !seen.has(x.text)) { const init = local(x); if (init) { seen.add(x.text); go(init, d + 1); } }
  };
  go(e, 0);
  return out;
}
