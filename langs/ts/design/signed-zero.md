# The sign of zero: a unit that may answer -0 is read as itself

## The construct

A number that may be negative zero. JavaScript keeps the sign of a zero (ECMA-262 6.1.6.1): `-x` of a zero is -0,
`a * b` of a zero and a negative is -0, `0 / -5` and `-0 / 5` are -0, `-0 - 0` is -0 while `-0 + 0` is 0,
`Math.round(-0.3)`, `Math.ceil(-0.5)`, `Math.trunc(-0.5)`, `Math.sign(-0)`, `Math.min(0, -0)`, `Number("-0")`,
`parseFloat("-0")` are -0. It is observed by a division (`1 / -0` is -Infinity, 6.1.6.1.5), by `Object.is`
(SameValue, 7.2.10), by `Math.atan2` and by `toLocaleString`; it is not observed by `===`, `<`, String, a template or
JSON (each gives 0 or "0").

## The defect

Lane A reads a number as an exact int or real, where -0 and 0 are one value. `x` against `x === 0 ? 0 : x`,
`Math.abs(x)` against `x < 0 ? -x : x` and `x + 0` against `x` were proved, and differ at x = -0 (proof-hunt class 8,
the signed-zero half). The heap core already marks a negative zero an operation makes (`NegZeroMark`,
heap-stage5.md section 13); a -0 handed in, or a zero whose sign one side keeps and the other drops, was its gap.

## The reading (interim reading B, opaque; row 3181675e holds the structural one)

One shared predicate, `signedZero(checker, fn)` at the end of `common.mjs`, finds the first place where a unit's
number result may be -0 (a `return`, or a number in the object, array or conditional it returns), or where the unit
tells -0 from 0 (`Object.is`, `Math.atan2`, `toLocaleString` of a number that may be -0). Such a unit is read as ONE
opaque unit keyed by its source and the same-file units it reaches (`opaqueNumericUnit`, the path an explicit `-0`
literal already took), and it is planned out of the heap core. The same source on both sides is the same function on
every input, -0 included; a changed unit is not proved.

    function normalized_parent(x: int): int { ext_signed_zero_448c775d...51f6_int(x) }

"May be -0" over-approximates by construction: an input (a parameter, a field, an element, an outside answer, a
for-of item) of a type that admits zero may be -0 unless a test proved it nonzero (`x > 0 ? x : 1`, `if (x === 0)
return 0;` before, `x && ...`, a literal union without 0); `-e`, `a * b` (a positive literal factor keeps the other's
answer), `a / b` (a positive literal divisor of a value that is never -0 is never -0), `%`, `**`, Math.round, ceil,
trunc, cbrt and the other Math functions not named below, parseInt, parseFloat, Number of a string may be -0;
`a - b` may when `a` may; `a + b` only when both may; `a || b` when `b` may (a -0 on the left is falsy);
`a ?? b`, `a && b`, a conditional when either may; Math.floor, sqrt, fround, sign and Number(n) pass their argument's
answer on; Math.min and max when any argument may; a call of a same-file function when one of its number results
may; a local's value is the least fixpoint over its initialiser and every write of it. A literal, a bitwise operator,
a `++`/`--`, a length or size, indexOf and the other index answers, getTime and Date fields, Math.abs, random, hypot,
exp, log, cos never answer -0.

## Soundness

When neither side's number result may be -0, two results equal as reals are equal as JavaScript numbers (the reals
model every finite double but -0, and the result is never -0), so a proof means what it says. When either side's may,
that side is opaque: a pair proves only if both sides are the same source, which behave alike on -0 too. The cases
considered: a pass-through against a normaliser (`x` / `x === 0 ? 0 : x`: the parent is opaque), two pass-throughs a
zero test makes real-equal (`x + y` / `y === 0 ? x : x + y`, both opaque), an operation against its algebraic twin
(`-x` / `0 - x`: the first is opaque). The guard rule reads only names never written after their declaration.

## What stays unproved, and what stays the gap

- A changed unit whose number result may be -0, even when the two sides agree on every -0: `x * 2` against `x + x`
  (pair `signed_zero`, doubled), `a + b` against `b + a`. The structural reading (`Num = Real | NegZero`, row
  3181675e) proves them.
- The gap that stays: a -0 inside a value passed through whole (`return p` of a record with a number field, `return
  xs` of a number array), a number handed to the outside as an argument, a field or world write. A unit whose result
  is a record literal is checked field by field; a record or array passed through is not. Rounding (IEEE
  underflow to -0, `-1e-320 / 1e10`) is the other half of class 8, the owner's decision 3181675e.
- Division is not refused here: a divisor that is not a nonzero literal already makes the ordinary unit opaque
  (numbers-bitwise-nan.md) and marks the heap core's world (heap-stage5.md section 13).

## Lint

Unchanged: nothing is refused by a new rule, so the census subset is unchanged; the translator alone calls the predicate.

## Lane B

The comparison of two runs is already SameValue on numbers: `render` writes -0 as `{"$negativeZero": true}` and NaN
as `{"$nan": true}`, and two outcomes are compared by their rendering (`exec/run.mjs` outcome comparison). Lane B now
draws -0: it is the fourth special value (`exec/gen.mjs` NUM_SPECIAL), so generated input 15 starts from it. The pair's
five differing units are witnessed at x = -0 or x = 0.

## Instances (census repos, read in place)
- apps-ui/src/blocks/fx/gooMath.ts:39 `gooIntercept` (`Math.round(...) / 100` of a value in (-0.5, 0) is -0), :54
  `gooPad` (`Math.ceil`), :135 `normalizeRadius` (a parameter returned through): opaque, were exact.
- apps-ui/src/lib/formulaMath.ts `runFormula`: `total = v === 0 ? 0 : total / v` keeps total's own -0; opaque.
- langchainjs/libs/langchain-core/src/utils/ml-distance/similarities.ts:7 `cosine`: a division by a sum, already
  opaque (possibly-zero divisor); `p += a[i] * b[i]` from `let p = 0` alone would not be -0.
- apps-ui/src/blocks/fx/gooMath.ts:44 `gooMatrix`, `parseShadow`: no number result; unchanged.
