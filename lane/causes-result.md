# Causes lane: missed-mutation classes (2026-10-30, branch lane/causes)

Battery v7 missed 23 planted mutants. Its cause column said "to read" for 20, so I classified them from the units.
I replayed soundness.py's lane B step (mutate.mjs, then run.mjs --n 60) for the 23 rows only, by a script of my own.
The baseline is this worktree's base f3cb5b41; "after" is head afa1c0f1. Outputs are in lane/battery-*.json.

## Battery delta per class (23 rows)
| class | rows | witnessed at base | witnessed after | still missed |
|---|---|---|---|---|
| already fixed by lanes merged since v7 | 7 | 7 | 7 | 0 |
| fake recursion budget (a visitor through the world) | 3 | 0 | 2 | 1 |
| world chain dies, a key never matches, no list of one | 3 | 0 | 3 | 0 |
| callee pattern, behind an unresolved package type | 1 | 0 | 0 | 1 |
| receiver state, a handler on a rejected promise | 3 | 0 | 0 | 3 |
| equivalent mutant | 6 | 0 | 0 | 6 |
- Total: 7 of 23 witnessed at base, 12 of 23 after. Lane A on the 5 new witnesses gave ASK on each, so zero false PASS.
- The 6 equivalent rows stayed PASS-bounded, so no rule made a witness where none exists.

## Changes, one commit each, each with a pair red before and green after
- **Fake recursion.** Past 40 nested callbacks the fake runs no further callback it is handed, so the tree ends there.
  Before, every input threw a budget and lane B answered ASK on both sides. Pair cause_fake_recursion goes from 2 ASK to WITNESS and PASS-bounded.
  Files: exec/fake.mjs, design/fake-recursion.md.
- **Full-world input.** Every eighth generated input from the fourth on is a full-world input.
  On it every untyped world read answers a handle, and a field named like a primitive the caller passed holds that value.
  On it a handle read as a list also holds 1, 2 or 3 elements by turn.
  Pair cause_world_reach: 3 units go from PASS-bounded to WITNESS, only on those inputs; LEAN_WORLD=off brings back PASS-bounded.
  Files: exec/gen.mjs, exec/fake.mjs, exec/run.mjs, design/world-reach.md.
- **Callee patterns.** The regular expressions of every local file whose function the unit calls join the string pool, after the unit's own file.
  Pair cause_callee_pattern goes from PASS-bounded to WITNESS. Files: exec/spec.mjs, design/callee-pattern.md.
- None of these changes how a verdict is read. They only change which world or which strings lane B draws, the same on both sides.

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
- Also on the world rule: generators, callback_behaviour, callback_behaviour_tree, rest_param and witness_args.
- No pair named no_silent_exit exists, and none has "load" in its name.
- I stopped microtask_worker at 15 minutes, by my own task, and it has no result. It is a spin-bound pair; please run it in the suite.
- These were not run: service, class_new, counter, heap_methods, try_catch, two_callers, promise_handle, exceptions_across and for_each.
  They read services through `this`, so the full-world rule reaches them. The admission suite should cover them before merge.
