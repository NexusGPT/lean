# Effectful callback lane: validation evidence

Worktree: `/Users/assem/nexus/nexus-organisation/work/lean-lanes/effectful-map-promise-all`. Branch: `lane/effectful-map-promise-all`.
Baseline: master `c9847d834d1bc2a2bbbc93266b5bbbf4a51c065d`; lane fork: `5ebf1d8065a7f8455c95bac180a4149861e61617`.
The benchmark used the unchanged shared harness with stable crc32 sampling and parent-file/process-specific mutants.
Baseline used `--jobs 1`; the final after run used `--jobs 3`. Both sampled the same units.

## Commands

```sh
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean --concepts "async callback|Promise.all" --k 10 --jobs 1 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/effectful-map-promise-all/results-bench/before-stable
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean-lanes/effectful-map-promise-all --concepts "async callback|Promise.all" --k 10 --jobs 3 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/effectful-map-promise-all/results-bench/after
node /Users/assem/nexus/nexus-organisation/work/lean-lanes/effectful-map-promise-all/langs/ts/tests/run.mjs
```

## Pair validation

Both files linted, translated with `--core --suffix parent|candidate --no-project --prelude`, then passed through `spec/theorem.py` and `dafny verify --verification-time-limit 30`. The errors below are precisely the deliberately unproved equality lemmas; no error is outside those lemmas.

```text
/Users/assem/nexus/nexus-organisation/work/lean-lanes/effectful-map-promise-all/langs/ts/tests/pairs/effectful_callbacks/parent.ts: inside the subset
/Users/assem/nexus/nexus-organisation/work/lean-lanes/effectful-map-promise-all/langs/ts/tests/pairs/effectful_callbacks/candidate.ts: inside the subset
theorem: wrote /Users/assem/nexus/nexus-organisation/work/lean-lanes/effectful-map-promise-all/results-bench/theorem.dfy (14 lemmas)
Dafny program verifier finished with 62 verified, 5 errors
Equal_keep: not proved (expected False)
Equal_first: not proved (expected False)
Equal_mapped: proved (expected True)
Equal_steady: proved (expected True)
Equal_index: proved (expected True)
Equal_all: proved (expected True)
Equal_flattened: proved (expected True)
Equal_folded: proved (expected True)
Equal_nested: proved (expected True)
Equal_entries: proved (expected True)
Equal_collected: not proved (expected False)
Equal_async_flat: proved (expected True)
Equal_nested_change: not proved (expected False)
Equal_nested_each: not proved (expected False)
VALIDATED: 14 equality expectations; 14 lane B verdicts; 4 named escapes.
```

Lane B (`--n 30 --no-project`), read from each saved verdict:

```text
keep: WITNESS
first: WITNESS
mapped: PASS-bounded
steady: PASS-bounded
index: PASS-bounded
all: PASS-bounded
flattened: PASS-bounded
folded: PASS-bounded
nested: PASS-bounded
entries: PASS-bounded
collected: WITNESS
asyncFlat: PASS-bounded
nestedChange: WITNESS
nestedEach: WITNESS
```

The find witness at input 0 is `[0, 1, -1]`. Both versions return 0; the parent trace has 2 entries and the candidate has 6. This isolates the extra visits, not a changed result.

Named escape output:

```text
/Users/assem/nexus/nexus-organisation/work/lean-lanes/effectful-map-promise-all/fixtures/escapes/ts/async_filter.ts:3:28  async-predicate  filter does not await its predicate: a Promise is truthy even when it resolves false; await values with Promise.all(map(...)), then use a synchronous predicate
/Users/assem/nexus/nexus-organisation/work/lean-lanes/effectful-map-promise-all/fixtures/escapes/ts/async_callback_order.ts:4:35  promise-all-order  Promise.all does not order work after await; use a for-of loop with await for ordered effects
/Users/assem/nexus/nexus-organisation/work/lean-lanes/effectful-map-promise-all/fixtures/escapes/ts/async_callback_unawaited.ts:3:3  async-callback  map does not await its callbacks; use await Promise.all(xs.map(...))
/Users/assem/nexus/nexus-organisation/work/lean-lanes/effectful-map-promise-all/fixtures/escapes/ts/async_callback_callee_order.ts:9:35  promise-all-order  Promise.all does not order work after await; use a for-of loop with await for ordered effects
```

Additional targeted translation probes cover chained methods, receiver evaluation, short-circuit expressions, bare callback returns, scalar flatMap results, early returns, effectful filter provenance, callback-variable shadowing and widened array result types.

```text
Dafny program verifier finished with 23 verified, 0 errors
```

## Concept bench

Lint / translate / units with a witnessed mutant, each out of 10. The final column counts individual mutants.

| concept | before | after | mutants before / after |
|---|---|---|---|
| async callback | 4/2/2 | 4/2/2 | 6/6 / 6/6 |
| Promise.all | 3/2/2 | 2/2/2 | 5/5 / 5/5 |

There is no translation gain in these samples. ListWorkspacesUseCase.execute moves from translation failure to a named refusal because its callback has observable work after suspension. The census domains also contain many callbacks unrelated to array methods.

## Whole suite

The suite ran once, after all probes and the final benchmark, with no concurrent work from this lane.

```text
| TOTAL | 341 checks | 1 FAILED |
```

The one failure was the existing async_callback escape expecting the old `async` rule. Its expectation is now `async-callback`; direct lint verification exits 1 and names that rule. No production code changed after the suite. The full suite was not repeated, honoring the once-only instruction.

```text
/Users/assem/nexus/nexus-organisation/work/lean-lanes/effectful-map-promise-all/fixtures/escapes/ts/async_callback.ts:3:10  async-callback  map does not await its callbacks; use await Promise.all(xs.map(...))
1 violation(s)
PASS: existing async_callback escape expects and receives async-callback.
```

## Reading choices and inherited limits

Sync callbacks are ordered loops with their method result; find/findIndex/some/every stop at the decisive predicate. Promise.all collection is restricted to callbacks whose continuations cannot create observable interleaving, including same-file async callees. Async flatMap retains each resolved array as one result.

Refusals: async-predicate, async-callback, async-reduce, promise-all-order, foreach, callback-form, callback-control, callback-result; captured mutation keeps closure-mutation.

Object.entries retains its existing uninterpreted sequence reading; insertion-order fidelity is inherited, not solved here. The outside world/await abstraction does not model competing rejection/completion schedules. When integrating the separate promise-continuation lane, preserve the scheduling restriction for continuations that it starts reading.

## Requested comparison against dev

dev advanced after this lane forked. This raw comparison therefore includes other lanes' changes absent from this branch; they were not edited or reverted here. The lane commit's parent-relative diff is its actual change set.

```text
README.md                                          |  55 +----
 fixtures/escapes/ts/async_callback.ts              |   2 +-
 fixtures/escapes/ts/async_callback_callee_order.ts |  10 +
 fixtures/escapes/ts/async_callback_order.ts        |   5 +
 fixtures/escapes/ts/async_callback_unawaited.ts    |   5 +
 fixtures/escapes/ts/async_filter.ts                |   4 +
 fixtures/escapes/ts/super_field.ts                 |   8 -
 langs/ts/CONCEPT-PLAN.md                           |   8 +-
 langs/ts/COVERAGE.md                               |  18 +-
 langs/ts/common.mjs                                |   8 +-
 langs/ts/design/effectful-callbacks.md             |  76 ++++++
 langs/ts/design/heap-layer-census.json             | 271 ---------------------
 langs/ts/design/heap-layer-census.mjs              | 161 ------------
 langs/ts/design/heap-layer-toy.dfy                 |  87 -------
 langs/ts/design/heap-layer-toy.mjs                 |  62 -----
 langs/ts/design/heap-layer.md                      | 200 ---------------
 langs/ts/exec/run.mjs                              |   5 -
 langs/ts/lint/lint.mjs                             | 130 +++++++++-
 langs/ts/subset.md                                 |  14 +-
 langs/ts/tests/pairs/class_new/candidate.ts        |  59 -----
 langs/ts/tests/pairs/class_new/expect.json         |  33 ---
 langs/ts/tests/pairs/class_new/parent.ts           |  58 -----
 langs/ts/tests/pairs/class_super/base.ts           |   6 -
 langs/ts/tests/pairs/class_super/candidate.ts      |  22 --
 langs/ts/tests/pairs/class_super/expect.json       |  20 --
 langs/ts/tests/pairs/class_super/parent.ts         |  22 --
 langs/ts/tests/pairs/counter/expect.json           |  22 +-
 .../tests/pairs/effectful_callbacks/candidate.ts   |  53 ++++
 .../ts/tests/pairs/effectful_callbacks/expect.json |  51 ++++
 langs/ts/tests/pairs/effectful_callbacks/parent.ts |  52 ++++
 langs/ts/tests/pairs/for_each/expect.json          |   6 +-
 langs/ts/tests/pairs/function_values/expect.json   |   6 +-
 langs/ts/tests/pairs/logic_values/expect.json      |  28 +--
 langs/ts/tests/pairs/promise_forms/expect.json     |  25 +-
 langs/ts/tests/pairs/service/expect.json           |   6 +-
 langs/ts/tests/pairs/try_catch/expect.json         |   6 +-
 langs/ts/translate/translate.mjs                   | 222 +++++++----------
 results-bench/after.json                           | 244 +++++++++++++++++++
 results-bench/before-stable.json                   | 243 ++++++++++++++++++
 results-bench/effectful-callbacks.md               | 159 ++++++++++++
 40 files changed, 1158 insertions(+), 1314 deletions(-)
```
