# Causes lane: missed-mutation classes (2026-10-30, branch lane/causes)

Battery v7 missed 23 mutants; I classified them from the units and replayed soundness.py's lane B step for those rows.
Baseline is base f3cb5b41, "after" is afa1c0f1 (outputs: lane/battery-*.json).

## Battery delta per class (23 rows)
| class | rows | witnessed at base | witnessed after | still missed |
|---|---|---|---|---|
| already fixed by lanes merged since v7 | 7 | 7 | 7 | 0 |
| fake recursion budget (a visitor through the world) | 3 | 0 | 2 | 1 |
| world chain dies, a key never matches, no list of one | 3 | 0 | 3 | 0 |
| callee pattern, behind an unresolved package type | 1 | 0 | 0 | 1 |
| receiver state, a handler on a rejected promise | 3 | 0 | 0 | 3 |
| equivalent mutant | 6 | 0 | 0 | 6 |
- Total: 7 of 23 witnessed at base, 12 of 23 after. Lane A gave ASK on each of the 5 new witnesses: zero false PASS.
- The 6 equivalent rows stayed PASS-bounded: no rule made a witness where none exists.

## Changes, one commit each, each with a pair red before and green after
- **Fake recursion.** Past 40 nested callbacks the fake runs no further callback it is handed, so the tree ends there.
  Pair cause_fake_recursion: 2 ASK become WITNESS and PASS-bounded. Files: exec/fake.mjs, design/fake-recursion.md.
- **Full-world input.** Every eighth generated input from the fourth on is a full-world input.
  Every untyped world read answers a handle, a field named like a caller's primitive holds it, a list holds 1 to 3 elements.
  Pair cause_world_reach: 3 units go from PASS-bounded to WITNESS, only on those inputs; LEAN_WORLD=off brings back PASS-bounded.
  Files: exec/gen.mjs, exec/fake.mjs, exec/run.mjs, design/world-reach.md.
- **Callee patterns.** The regular expressions of every local file whose function the unit calls join the string pool, after the unit's own file.
  Pair cause_callee_pattern goes from PASS-bounded to WITNESS. Files: exec/spec.mjs, design/callee-pattern.md.
- None of these changes how a verdict is read. They only change which world or which strings lane B draws, the same on both sides.

## Added item: NaN and -0 for any and unknown parameters
- An any or unknown parameter was drawn as a fake, never a number, so `p === p` against `true` stayed PASS-bounded.
- On a special-number input, an opaque leaf whose members the unit does not read now takes its slot's special value: NaN, Infinity, -Infinity or -0.
- Pair cause_any_nan: selfEq and isZero go from PASS-bounded to WITNESS. Two honest refactors stay PASS-bounded, one on NaN and one on -0.
- gen.test.mjs passes, and so do special_numbers, numbers and absent_number. Files: exec/gen.mjs, design/gen-walk.md (dated section).

## What is left, with the reason
- **reachesSelfJson changed-return.** It is ASK now on a different budget, "a fake path longer than 400 characters", at input 44. Not fixed today.
- **attemptKeyOfCodeBuild.** The pattern is drawn now. The parameter type is unresolved because the AWS SDK types are absent, so it is opaque.
  Its fields never equal the compared constant. Making a fake field equal a compared constant needs a comparison-aware fake, which is not sound to do today.
- **setActiveLineConsumer, 3 rows.** The changed string is visible only in a logger call inside the catch handler of a promise the world rejects.
  It also needs the receiver's own Map to hold the argument key. Lane B builds the receiver without its constructor, so that state needs a receiver-state rule. Not done.
- **Equivalent mutants, 6 rows.** These are resolveTracingConfig (a default never compared), largestReservation (widest is commutative) and generateAndEnhancePrompt (the callee returns early on an empty list).
  No lane B change can witness them. The fix belongs in the mutant generator's dedup, and changing it would change the battery's cohort, so I left it.
- **Design-defect rows, after only.** traverseJsonForCollections is WITNESS and ingestStatus is WITNESS; ingestStatus was ASK, stack overflow in a callback.
  ingestRun stays PASS-bounded. Its gate compares the header key with a secret the world holds, which no input matches. Same open class as attemptKeyOfCodeBuild.

## Siblings run by hand, all pass
- On the final code: for_desugar, fake_throw, gen_walk, generics, lane_b_reach and the three cause pairs.
- Also: generators, callback_behaviour(_tree), rest_param, witness_args, special_numbers, numbers, absent_number.
- I stopped microtask_worker (spin-bound) at 15 minutes: no result, please run it in the suite.
- Not run, and reached by the full-world rule: service, class_new, counter, heap_methods, try_catch, two_callers, promise_handle, exceptions_across, for_each.
