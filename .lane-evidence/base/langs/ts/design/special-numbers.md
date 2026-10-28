# Special numbers in lane B: NaN, Infinity and -Infinity are drawn where a number is admitted

## The construct

A parameter, field or element whose declared type admits a number (`number`, `number | null`, an `unknown` the unit
reads as a number). In JavaScript the Number type holds NaN, +Infinity and -Infinity beside the finite values
(ECMA-262 6.1.6.1). NaN fails every ordering comparison and `NaN === NaN` is false; `Infinity - Infinity` is NaN;
`Math.max(NaN, 0)` is NaN; an `Array.prototype.sort` comparator that returns NaN is read as 0, so the pair keeps its
order. A rewrite that agrees on every finite number can differ on these three: a comparator that sorts a missing price
as `Infinity` against one that puts nulls last, a clamp written with comparisons against one written with Math.min
and Math.max.

## What lane B drew before

`exec/gen.mjs` drew numbers from 0, 1, -1, 2, 10, 100, -100, 0.5, 1e9, MAX_SAFE_INTEGER, the unit's literals and their
neighbours, and random integers; a compared leaf walked its compared values. No input was ever NaN or infinite, so the
two comparators above passed as PASS-bounded (lane pyka, finding 7).

## The reading (lane B only)

Every fourth generated input (the enumerated heaps come first; then generated inputs 3, 7, 11, ...) is a
special-number input. In it the first number leaf, whether drawn or walked from a compared boundary, is replaced by a
special value, and every later number leaf one time in two in every other such input (all of them in the rest). The
value turns NaN, Infinity, -Infinity from one leaf to the next, starting one step further at each special-number input,
so a unit of one number parameter meets NaN, Infinity and -Infinity at generated inputs 3, 7 and 11. The first three
generated inputs, which lean on 0, 1 and -1, and the compared values, which the walk takes first, are unchanged.

The replacement is made after the leaf's ordinary draw and decided on a stream of its own (`srng`), so every other
value of every input is the value drawn before this reading, and an input that is not a special-number input is the
same input as before. A literal type (`1 | 2`) admits no special value; heaps enumerated by `exec/korat.mjs` and the
typed answers of fakes stay finite.

Rendering: the witness's `args` and every observation go through `render` in `exec/fake.mjs`, which already writes
NaN as `{"$nan": true}`, the infinities as `{"$infinity": 1}` and `{"$infinity": -1}` and negative zero as
`{"$negativeZero": true}`, so a reader never confuses them with a string, with null or with each other. No new shape.

## Lane A is unchanged, and why a witness here contradicts no proof

Lane A's model is finite (`design/numbers-bitwise-nan.md`): numbers are Dafny `int` or `real`, and a unit that names
NaN or an infinity is refused (`number-special`) or read as one opaque unit keyed by its source. A proof states
`f_parent(x) == f_candidate(x)` for every x of that model, so its hypothesis excludes NaN and the infinities. The clamp
of the pair is proved on the finite model and witnessed on NaN; both statements hold. check.mjs runs lane B first and
a WITNESS ends the question, so the verdict is WITNESS, as it was for any witness before.

    function clamp_parent(hw_: HWorld, x: int): (HWorld, int)
    { (hw_, (if (x > 0) then (if (x < 100) then x else 100) else 0)) }
    function clamp_candidate(hw_: HWorld, x: int): (HWorld, int)
    { (hw_, Min_int(Max_int(x, 0), 100)) }

## Soundness

The reading changes which inputs run, never how two runs are compared; both sides receive the same input. A special
value is a value of the declared type, so a WITNESS on it is a real difference of the JavaScript. A loop bounded by an
infinite number times out on both sides and the input is skipped (run.mjs), as any unbounded loop is. Nothing is
proved by lane B, so no reading here can prove two behaviours equal.

## What stays out

A number answered by the outside (a typed answer of a fake, a clock) stays finite; a number parsed from a string
meets NaN only through the strings already drawn; negative zero is not drawn (only rendered).

## The pair `tests/pairs/special_numbers`

`order` (the pyka comparator, `Infinity` spelled `Number.POSITIVE_INFINITY` so lane A can read the file): WITNESS, the
lemma withheld. `clamp`: WITNESS on NaN, proved on the finite model. `total` (`s += x` spelled `s = s + x`): proved,
PASS-bounded. `untouched`: proved, PASS-bounded.

## Instances (census repos, read in place, not run)

- theirstack-unofficial-api/src/services/jobs.service.ts:50 `countJobs`: `body.days` is a declared optional number
  tested with `Number.isFinite` and `> 0`; enters (days NaN and Infinity are drawn).
- apps-ui/src/record-core/fields/draft.ts:138 `validateDraft`: `typeof v !== "number" || Number.isNaN(v)` on a value of
  `Object.entries(draft)`; enters only where the shaped draw makes that value a number.
- nexus-learning-landing/app/api/call-outcome/route.ts:36 `verify`: `ts: unknown` tested with `typeof ts === "number"`
  then `Number.isFinite(t)`; enters through the number option.
- apps-ui/src/blocks/mobile/MobileReviewBanner.tsx:34: `Math.min(Math.max(index, 0), total - 1)` on number props;
  enters (a NaN index renders NaN).
- apps-ui/src/blocks/fx/LiquidGroup.tsx:617 `cssMs`: the number comes from parsing a string; does not enter (a string
  that parses to NaN was already drawn).
