# The boundary walk lasts the product of its boundary sizes, then free draws

## The construct

Lane B's inputs for a shaped spec (`design/read-shaped-inputs.md`): every leaf the unit compares against a literal
carries a boundary (its compared values, their integer neighbours, a declared-draw turn), and a leaf tested only for
truthiness carries its falsy values beside a declared-draw turn. `exec/gen.mjs` walked those boundaries as an
odometer over the first `WALK = 48` generated inputs, the index wrapping around, so a leaf held one of its few
compared values on every one of those 48 inputs. A unit whose difference needs a value away from its compared
constants saw it only after input 48: of the 60 inputs a concept-bench mutant runs, 12.

## The reading

1. The walk length is the product of the boundary sizes (the largest `radix` spec.mjs gave a boundary times that
   boundary's own size): every combination of the compared values is drawn once, and never more than once.
2. It is capped at `WALK = 30` inputs, half of the 60 the concept bench runs per mutant. The cap is a constant, not a
   fraction of the requested n, so input i is the same in a run of 30 inputs and in a run of 200, and a replay that
   knows only the seed (`exec/replay-args.mjs`) draws the input the run drew.
3. After the walk every generated input is a free draw: each boundary value is mixed in at random (three times in
   ten), as after the old walk.
4. A truthiness-only leaf's declared-draw turn is the truthy side of its test (its other turns are its falsy values):
   a falsy draw on that turn becomes a truthy value of a primitive option (true, a non-zero pool number, a non-blank
   string), chosen on the boundary stream. A truthiness-only leaf whose digit turns within the walk takes its turns in
   order from the first input; one whose digit never turns (the walk was capped first) mixes its falsy values in at
   random, as before.
5. A compared number an input holds joins that input's number pool, as a drawn number does, so a later field can
   coincide with it.
6. Unchanged: every fourth generated input is a special-number input on its own stream (`design/special-numbers.md`);
   the declared draw of every leaf is made first and every walk decision uses the boundary stream, so the number of
   draws on the main stream, and with it every other leaf's stream position, is the one an unshaped spec makes; the
   enumerated heaps come first (`walkFrom`).

## Soundness

Lane B proves nothing; the reading changes which inputs run, never how two runs are compared, and both sides receive
the same input (each side draws its own copy from the same seed). A truthy substitute is a value of the declared type,
so a WITNESS on it is a real difference of the JavaScript. The same seed gives the same inputs: the walk length is a
function of the spec alone. Lane A is untouched.

## What lane B sees

The three units of the bench-drops finding, each mutant through `check.mjs --no-project --n 60 --dafny-seconds 30`
(results `results-gen-walk/units-base.log` and `units-after.log`): easeInOut (Math.pow) P P W to P W W, walk 2;
roundSignedBounded (Math.trunc) P P P to W P W, walk 3; verifyEmbedIdentityHmac (global crypto) W P P to W W W, walk 18.
The two P left are equal on every draw: `t < 0.5` against `t <= 0.5` meets at 0.5, where both halves give 0.5; and
`Math.abs(coarse) === 101` changes the answer only on a non-integer near 101.

Pair `tests/pairs/gen_walk`: a curve whose switch point moves (`ease`), a rounding to a step under Math.trunc against
Math.round (`toStep`), a digest compare behind four truthiness guards with createHmac's arguments swapped
(`checkDigest`), a refactor (`clampUnit`) and an untouched unit (`scale`). On cdbd48d the three changed units are
PASS-bounded at n 30 (every input walked or special); after, each is WITNESS (inputs 18, 10, 1).

The 42-concept bench (`concept_bench.py --concepts`, the 42 of the bench-drops finding, K 10): 374 of 562 planted
mutants witnessed against 364 on dcbc61c, with inside 228 and translated 210 on both; 8 witnesses up (the three units,
repeatsForFloor, assertWebVoiceOriginAllowed), 1 down (mde, below).

## What it costs

A difference that needs a compared combination together with a coincidence on a leaf the walk does not reach (the
pair `readme_ledger`, applyAll: an amount equal to a free `floor`) met the combination on every wrap of the old walk.
Over seeds 1 to 22 at n 30 applyAll is WITNESS on 21 seeds on cdbd48d, 20 with the product walk alone, 21 with
item 5 (the miss moves from seed 1 to seed 6). A second pass of the walk alternating with free draws also gave 20. On the bench, mde (`alpha ?? 1.05`) had one input
of 60 past its guards on cdbd48d and none after: a pool pick moved with item 5.

## What stays out

Leaves the usage reading gives no boundary (`externalUserId?.trim()` read through a call, a field compared against a
local derived from another field) are drawn as before; their coincidences are left to the pool and the free draws.

## Special numbers for any and unknown (2026-10-30)

A parameter typed any or unknown was drawn as a fake or a handle the unit was handed, never as a number, so NaN and -0
never reached it: `p === p` against `true` (false on NaN) stayed PASS-bounded. On a special-number input (every SPECIAL-th
generated input) an opaque leaf whose members the unit does not read now takes its slot's special value, NaN, Infinity,
-Infinity or -0, by the same turn and slot rule as a number leaf (`specialOf`, the special-slots invariant); a leaf the
unit reads members of keeps its fake, and every other input draws as before. Both sides get the same value. Pair
`tests/pairs/cause_any_nan`: selfEq and isZero (`p === 0` against `Object.is(p, 0)`) go from PASS-bounded to WITNESS;
selfTag (`p === p` against `Number.isNaN`) and zeroSign (`Object.is(p, -0)` against a division) are equal on every value
and stay PASS-bounded.
