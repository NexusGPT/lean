# The sign of zero: a -0 an operation makes is read as itself, a -0 handed in is lane B's

## The construct

JavaScript keeps the sign of a zero (ECMA-262 6.1.6.1): `-x` of a zero, `a * b` of a zero and a negative, `0 / -5`,
`-0 / 5`, `-4 % 2`, `-0 - 0`, `Math.round(-0.3)`, `Math.ceil(-0.5)`, `Math.trunc(-0.5)`, `Math.min(0, -0)`,
`parseFloat("-0")` are -0, and `-0 + 0` is 0. The sign is observed by a division (`1 / -0` is -Infinity, 6.1.6.1.5),
`Object.is` (SameValue, 7.2.10), `Math.atan2` (21.3.2.8) and `toLocaleString`; `===`, `<`, String, a template and
JSON do not see it. Lane A reads a number as an exact int or real, where -0 and 0 are one value (proof-hunt class 8).

## The model, as for NaN

Lane A's model holds no -0 input, as it holds no NaN or infinity (special-numbers.md): a parameter, a field, an
element, an outside answer is a finite value of the reals. Lane B draws -0 (the fourth special value, `exec/gen.mjs`
NUM_SPECIAL, generated input 15 first), and compares two runs by SameValue already (`render` writes -0 as
`{"$negativeZero": true}`, outcomes compare by their rendering). So `x` against `x === 0 ? 0 : x` is proved on the
model and witnessed at -0; check.mjs runs lane B first, the verdict is WITNESS.

## The reading (interim reading B; the doubles lane is the structural one)

Inside the model a -0 only arises from an operation. `common.mjs signedZero(checker, fn)` finds the first number the
unit returns (a `return`, a number in the object, array or conditional it returns) that may be such a -0, or a read
that tells -0 from 0 (`Object.is`, `Math.atan2`, `toLocaleString` of such a number). In the ordinary lane that unit is
one opaque unit keyed by its source (`opaqueNumericUnit`, the path an explicit `-0` already took); the heap core marks
its world where such a -0 may escape (`NegZeroMark`, heap-stage5.md 13), so its lemma does not close.

"May be -0": `-e` unless e is a nonzero literal or a name a test proved nonzero (`n > 0 ? -n : 1`); `a * b` unless one
side is a positive literal and the other may not; `a / b` unless b is a positive literal and a may not; `%`;
Math.round, ceil, trunc (a value in (-1, 0)), parseInt, parseFloat, Number of a string; `a - b` when a may and b is not
a nonzero literal; `a + b` when both may; `a || b` when b may; `a ?? b`, `a && b`, a conditional when either may;
`**` and every other Math function pass their first argument's -0 on (sin, cbrt, pow, atan2's y); min and max when an
argument may (a spread of an input holds none); a same-file call when one of its results may; a local by fixpoint.

## Soundness

On the model, two results equal as reals are equal doubles unless one is a -0 made by an operation; that unit is
opaque (or marked), so it proves only against the same source. Cases: `-x` / `0 - x` (the parent opaque), `x * 0` /
`0`, `Math.round(x)` / `Math.floor(x + 0.5)` (round may be -0: opaque). A -0 input is out of the model by statement
and witnessed by lane B; lane B is bounded (it draws -0 into the first number leaf of generated inputs 15, 27, ...).

## The named refusal, measured and not landed

The same predicate as a lint rule `signed-zero` (commit 25f79ca): langchainjs 3,101 inside to 3,093; and the suite's
translation sweep fails 24 pairs whole (a pair file with one refused unit does not translate): absent_number,
array_callback_cells, class_statics, clock_read, exception_callback, gen_walk, heap5_arith, heap5_reach,
known_values, lib_globals, lint_misfires, lint_small, module_const_deps, mutual_summaries, numbers, numbers_bits,
numbers_bits_rebase, operands_receiver, operators, param_rebind, reach_keys, spread_outside, this_receiver,
unreached_body. The opaque form keeps every one; the lint is unchanged.

## What the doubles reading must carry for the sign of zero

- Inputs: a number input is any double, -0 included; the model's "no -0 input" statement goes (6.1.6.1).
- Unary minus (13.5.5, Number::unaryMinus 6.1.6.1.1); `*` (Number::multiply 6.1.6.1.4); `/` (Number::divide
  6.1.6.1.5, a signed infinity for a signed zero divisor); `%` (Number::remainder 6.1.6.1.6, the dividend's sign);
  `+` (Number::add 6.1.6.1.7, -0 + -0 alone is -0); `-` (Number::subtract 6.1.6.1.8); `**` (6.1.6.1.3).
- Math.round, ceil, trunc, floor, sign, sqrt, fround, cbrt, min, max, abs, atan2 (21.3.2): each one's zero cases.
- Parsing: Number, parseInt, parseFloat of "-0" (7.1.4.1.1, 19.2.4, 19.2.5).
- Observers: Object.is (SameValue 7.2.10), division, Math.atan2, toLocaleString; and the absorbers that do not see it:
  `===` (IsStrictlyEqual 7.2.15), relational comparison, ToString (Number::toString 6.1.6.1.20), JSON.
- The heap core's NegZeroMark and this predicate's opaque path both go when the reading carries the sign.

## Instances (census repos, read in place)

- apps-ui/src/blocks/fx/gooMath.ts:39 `gooIntercept` (`Math.round(...) / 100`), :54 `gooPad` (`Math.ceil`): opaque.
- apps-ui/src/blocks/fx/gooMath.ts:135 `normalizeRadius` (a parameter returned through): exact, on the model.
- langchainjs/libs/langchain-core/src/utils/ml-distance/similarities.ts:7 `cosine`: a division, already opaque.
- apps-ui/src/lib/formulaMath.ts `runFormula`: `total / v` under `v === 0 ? 0 :`, already opaque (the divisor).
- apps-ui/src/blocks/fx/gooMath.ts:44 `gooMatrix`, `parseShadow`: no number result; unchanged.
