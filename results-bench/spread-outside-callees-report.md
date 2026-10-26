# Spread outside callees: validation report

Worktree: /Users/assem/nexus/nexus-organisation/work/lean-lanes/spread-outside-callees
Branch: lane/spread-outside-callees
Baseline dev: 7ae2b0f071cd9cb3eda15bb8fa71c72dc183c5b1

## Reading and choices

Outside calls carry one exact concatenated sequence argument, with the receiver and world retained.
Nonempty numeric min/max fold the sequence; push/unshift concatenate using references layer 1.
Fixed plain scalar record rest constructs a new remainder datatype.

Scalar datatypes were chosen over maps to preserve the existing closed record model without
claiming shallow reference aliases. Possibly empty min/max stays `math-empty` because the
number model lacks infinities. `spread` refuses iterators, held tuples, unsupported local or
optional callees, opaque Math coercions and conditional same-file parameter updates.
`record-rest` refuses unknown, indexed, class, accessor, reference-field, empty-remainder,
computed-key and defaulted shapes. No question is pending for the lead.

## Commands and pair results

The validator ran each command sequentially with absolute paths and captured stdout/stderr.
Pair directory: /Users/assem/nexus/nexus-organisation/work/lean-lanes/spread-outside-callees/langs/ts/tests/pairs/spread_outside
Output directory during validation: /Users/assem/nexus/nexus-organisation/work/lean-lanes/spread-outside-callees/results-bench/validation

For parent and candidate: `node langs/ts/lint/lint.mjs <side.ts> --no-project`, then
`node langs/ts/translate/translate.mjs <side.ts> --core --suffix <side> --out <side.dfy> --prelude <side.pre.dfy> --no-project`.
Each standalone output: `dafny verify --verification-time-limit 30 <side.dfy>`.
The scope lists every expect.json unit with in_scope false; edit is {}.
`python3 -I spec/theorem.py --parent <parent.dfy> --candidate <candidate.dfy> --scope <scope.json> --edit <edit.json> --out <theorem.dfy>`.
`dafny verify --verification-time-limit 30 <theorem.dfy>`.
Each B unit: `node langs/ts/exec/run.mjs --parent <parent.ts> --candidate <candidate.ts> --unit <unit> --n 30 --no-project --out <b-unit.json>`.
Each escape was linted and translated independently; both exited 1.

Standalone parent:
```text
Dafny program verifier finished with 6 verified, 0 errors
```
Standalone candidate:
```text
Dafny program verifier finished with 6 verified, 0 errors
```
All theorem errors were matched to the expected false lemma spans; none were definition errors.
The solver printed model-parser diagnostics on negative proofs; verification completed.
Captured validator output:
```text
/Users/assem/nexus/nexus-organisation/work/lean-lanes/spread-outside-callees/langs/ts/tests/pairs/spread_outside/parent.ts: inside the subset
wrote /Users/assem/nexus/nexus-organisation/work/lean-lanes/spread-outside-callees/results-bench/validation/parent.dfy and /Users/assem/nexus/nexus-organisation/work/lean-lanes/spread-outside-callees/results-bench/validation/parent.pre.dfy
/Users/assem/nexus/nexus-organisation/work/lean-lanes/spread-outside-callees/langs/ts/tests/pairs/spread_outside/candidate.ts: inside the subset
wrote /Users/assem/nexus/nexus-organisation/work/lean-lanes/spread-outside-callees/results-bench/validation/candidate.dfy and /Users/assem/nexus/nexus-organisation/work/lean-lanes/spread-outside-callees/results-bench/validation/candidate.pre.dfy
theorem: wrote /Users/assem/nexus/nexus-organisation/work/lean-lanes/spread-outside-callees/results-bench/validation/theorem.dfy (23 lemmas)
Equal_changed_call: not proved
Equal_regroup: proved
Equal_spread_copy: proved
Equal_mixed_args: not proved
Equal_method_call: not proved
Equal_max_guard: not proved
Equal_min_guard: proved
Equal_max_many: proved
Equal_append: proved
Equal_append_changed: not proved
Equal_record_rest: proved
Equal_record_changed: not proved
Equal_untouched: proved
Equal_ordered: proved
Equal_awaited: proved
Equal_opaque_call: not proved
Equal_append_path: proved
Equal_optional_rest: proved
Equal_max_third: not proved
Equal_append_one: proved
Equal_snapshot_call: not proved
Equal_append_absent: proved
Equal_distinct_callee: not proved
Dafny program verifier finished with 26 verified, 10 errors
lane B changedCall: WITNESS
lane B regroup: PASS-bounded
lane B spreadCopy: PASS-bounded
lane B mixedArgs: WITNESS
lane B methodCall: WITNESS
lane B maxGuard: WITNESS
lane B minGuard: PASS-bounded
lane B maxMany: PASS-bounded
lane B append: PASS-bounded
lane B appendChanged: WITNESS
lane B recordRest: PASS-bounded
lane B recordChanged: WITNESS
lane B untouched: PASS-bounded
lane B ordered: PASS-bounded
lane B awaited: PASS-bounded
lane B opaqueCall: WITNESS
lane B appendPath: PASS-bounded
lane B optionalRest: PASS-bounded
lane B maxThird: WITNESS
lane B appendOne: PASS-bounded
lane B snapshotCall: WITNESS
lane B appendAbsent: PASS-bounded
lane B distinctCallee: WITNESS
spread_conditional_update.ts: lint and translate refuse spread
spread_empty_record.ts: lint and translate refuse record-rest
spread_iterator.ts: lint and translate refuse spread
spread_local.ts: lint and translate refuse spread
spread_math_empty.ts: lint and translate refuse math-empty
spread_math_opaque.ts: lint and translate refuse spread
spread_optional.ts: lint and translate refuse spread
spread_record_alias.ts: lint and translate refuse record-rest
spread_record_rest.ts: lint and translate refuse record-rest
spread_tuple.ts: lint and translate refuse spread
```

Concrete changedCall witness: input xs=[0,1,-1]. Both returned 108, but the call trace's
module:./api.outside arguments were [0,1,-1] versus [0,1,-1,7]. This is a trace WITNESS.
For maxGuard, xs=[347] returned 347 versus 0. For snapshotCall, the request arguments were
[0,1,-1,4] versus [0,1,-1,1,4], confirming spread snapshots before a later mutation.

## Concept benchmark

Both runs used the unmodified external harness after fixes 9682b58 (crc32 sampling) and
3ba4ea6 (parent basename in mutant filename). Baseline was exported with git archive dev
inside this worktree. No source or harness copies were used for the census.
Exact CLI commands (baseline jobs 2, after jobs 3):
```sh
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean-lanes/spread-outside-callees/results-bench/dev-baseline --concepts 'spread in call or array|rest pattern|Math.max|Math.min' --k 10 --jobs 2 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/spread-outside-callees/results-bench/spread-before
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean-lanes/spread-outside-callees --concepts 'spread in call or array|rest pattern|Math.max|Math.min' --k 10 --jobs 3 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/spread-outside-callees/results-bench/spread-after
```
The two JSON files have identical (root,file,unit) samples for all 40 units.
Witness below counts sampled units with at least one witnessed mutant, out of 10.

| Concept | Before lint / translate / witness | After lint / translate / witness |
|---|---|---|
| spread in call or array | 3 / 2 / 2 | 3 / 2 / 2 |
| rest pattern | 0 / 0 / 0 | 0 / 0 / 0 |
| Math.max | 5 / 4 / 3 | 6 / 4 / 3 |
| Math.min | 6 / 5 / 5 | 6 / 5 / 5 |

Captured baseline scorecard:
# Concept bench

4 concepts, K=10 real instances each (at most 3 per repo, units of at most 120 lines), lean at /Users/assem/nexus/nexus-organisation/work/lean-lanes/spread-outside-callees/results-bench/dev-baseline

| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| spread in call or array | 10 | 3 | 2 | 6/6 | spread (3), this (1), translate: index.ts:162: an effect inside a callback; the ord (1) |
| rest pattern | 10 | 0 | 0 | 0/0 | destructuring (6), spread (1), foreach (1) |
| Math.max | 10 | 5 | 4 | 9/11 | ts-strict (2), foreach (1), unsupported-call (1) |
| Math.min | 10 | 6 | 5 | 15/15 | spread (2), translate: memo.ts:110: callee refill was not translated (1), foreach (1) |

Captured after scorecard:
# Concept bench

4 concepts, K=10 real instances each (at most 3 per repo, units of at most 120 lines), lean at /Users/assem/nexus/nexus-organisation/work/lean-lanes/spread-outside-callees

| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| spread in call or array | 10 | 3 | 2 | 6/6 | spread (3), this (1), translate: index.ts:162: an effect inside a callback; the ord (1) |
| rest pattern | 10 | 0 | 0 | 0/0 | record-rest (6), spread (1), foreach (1) |
| Math.max | 10 | 6 | 4 | 9/11 | ts-strict (2), foreach (1), unsupported-call (1) |
| Math.min | 10 | 6 | 5 | 15/15 | translate: memo.ts:110: callee refill was not translated (1), spread (1), math-empty (1) |

The one added Math.max lint admission is cardFor; translation still stops at the unrelated
callee sortValues. The sample has no translation gain. Sampled record-rest units still need
richer shapes. The pair tests establish the added readings independently of census coverage.

## Whole suite

`node langs/ts/tests/run.mjs` ran once after the final probes and benchmark, with no other
lane-owned node/dafny process. Captured output:
```text
| TOTAL | 371 checks | ALL PASS |
```

## File deltas and branch ancestry

The lane parent is 5ebf1d8065a7f8455c95bac180a4149861e61617. The measured baseline export
is dev 7ae2b0f071cd9cb3eda15bb8fa71c72dc183c5b1, with the same starting spread/rest reading.
At final reporting dev is f016834fa568b7b157ea4ebb0585cf018885631c. The requested diff against dev
therefore includes unrelated upstream changes absent from this older lane. They are not
staged removals or part of this commit. No merge/rebase was performed. The actual staged
change is the reading, its documentation/tests, and benchmark evidence only.

Captured `git diff --stat dev` (before appending this section):
```text
 .gitignore                                       |   1 -
 README.md                                        |  55 +--
 fixtures/escapes/ts/dynamic_record_effect_key.ts |   3 -
 fixtures/escapes/ts/dynamic_record_method.ts     |   2 -
 fixtures/escapes/ts/dynamic_record_prototype.ts  |   2 -
 fixtures/escapes/ts/dynamic_record_string.ts     |   5 -
 fixtures/escapes/ts/dynamic_record_write.ts      |   2 -
 fixtures/escapes/ts/spread_conditional_update.ts |   5 +
 fixtures/escapes/ts/spread_empty_record.ts       |   2 +
 fixtures/escapes/ts/spread_iterator.ts           |   2 +
 fixtures/escapes/ts/spread_local.ts              |   2 +
 fixtures/escapes/ts/spread_math_empty.ts         |   2 +
 fixtures/escapes/ts/spread_math_opaque.ts        |   2 +
 fixtures/escapes/ts/spread_optional.ts           |   2 +
 fixtures/escapes/ts/spread_record_alias.ts       |   2 +
 fixtures/escapes/ts/spread_record_rest.ts        |   2 +
 fixtures/escapes/ts/spread_tuple.ts              |   2 +
 fixtures/escapes/ts/super_field.ts               |   8 -
 langs/ts/CONCEPT-PLAN.md                         |   8 +-
 langs/ts/COVERAGE.md                             |  26 +-
 langs/ts/common.mjs                              |   8 +-
 langs/ts/design/dynamic-record-reads.md          |  70 ----
 langs/ts/design/heap-layer-census.json           | 271 -------------
 langs/ts/design/heap-layer-census.mjs            | 161 --------
 langs/ts/design/heap-layer-toy.dfy               |  87 ----
 langs/ts/design/heap-layer-toy.mjs               |  62 ---
 langs/ts/design/heap-layer.md                    | 200 ---------
 langs/ts/design/spread-outside-callees.md        |  76 ++++
 langs/ts/exec/run.mjs                            |   5 -
 langs/ts/lint/lint.mjs                           | 102 +++--
 langs/ts/subset.md                               |  25 +-
 langs/ts/tests/pairs/class_new/candidate.ts      |  59 ---
 langs/ts/tests/pairs/class_new/expect.json       |  33 --
 langs/ts/tests/pairs/class_new/parent.ts         |  58 ---
 langs/ts/tests/pairs/class_super/base.ts         |   6 -
 langs/ts/tests/pairs/class_super/candidate.ts    |  22 -
 langs/ts/tests/pairs/class_super/expect.json     |  20 -
 langs/ts/tests/pairs/class_super/parent.ts       |  22 -
 langs/ts/tests/pairs/counter/expect.json         |  22 +-
 langs/ts/tests/pairs/dynamic_reads/base.ts       |   2 -
 langs/ts/tests/pairs/dynamic_reads/candidate.ts  |  22 -
 langs/ts/tests/pairs/dynamic_reads/expect.json   |  63 ---
 langs/ts/tests/pairs/dynamic_reads/parent.ts     |  28 --
 langs/ts/tests/pairs/for_each/expect.json        |   6 +-
 langs/ts/tests/pairs/function_values/expect.json |   6 +-
 langs/ts/tests/pairs/logic_values/expect.json    |  28 +-
 langs/ts/tests/pairs/promise_forms/expect.json   |  25 +-
 langs/ts/tests/pairs/service/expect.json         |   6 +-
 langs/ts/tests/pairs/spread_outside/api.d.ts     |   5 +
 langs/ts/tests/pairs/spread_outside/candidate.ts |  84 ++++
 langs/ts/tests/pairs/spread_outside/expect.json  |  78 ++++
 langs/ts/tests/pairs/spread_outside/parent.ts    |  83 ++++
 langs/ts/tests/pairs/try_catch/expect.json       |   6 +-
 langs/ts/translate/translate.mjs                 | 273 ++++---------
 results-bench/spread-after.json                  | 495 +++++++++++++++++++++++
 results-bench/spread-after.md                    |  10 +
 results-bench/spread-before.json                 | 495 +++++++++++++++++++++++
 results-bench/spread-before.md                   |  10 +
 results-bench/spread-outside-callees-report.md   | 170 ++++++++
 59 files changed, 1740 insertions(+), 1599 deletions(-)
```
Actual staged file deltas at that point (`git diff --cached --stat`):
```text
 fixtures/escapes/ts/spread_conditional_update.ts |   5 +
 fixtures/escapes/ts/spread_empty_record.ts       |   2 +
 fixtures/escapes/ts/spread_iterator.ts           |   2 +
 fixtures/escapes/ts/spread_local.ts              |   2 +
 fixtures/escapes/ts/spread_math_empty.ts         |   2 +
 fixtures/escapes/ts/spread_math_opaque.ts        |   2 +
 fixtures/escapes/ts/spread_optional.ts           |   2 +
 fixtures/escapes/ts/spread_record_alias.ts       |   2 +
 fixtures/escapes/ts/spread_record_rest.ts        |   2 +
 fixtures/escapes/ts/spread_tuple.ts              |   2 +
 langs/ts/CONCEPT-PLAN.md                         |   2 +-
 langs/ts/COVERAGE.md                             |   6 +-
 langs/ts/design/spread-outside-callees.md        |  76 ++++
 langs/ts/lint/lint.mjs                           |  70 +++-
 langs/ts/subset.md                               |  11 +-
 langs/ts/tests/pairs/spread_outside/api.d.ts     |   5 +
 langs/ts/tests/pairs/spread_outside/candidate.ts |  84 ++++
 langs/ts/tests/pairs/spread_outside/expect.json  |  78 ++++
 langs/ts/tests/pairs/spread_outside/parent.ts    |  83 ++++
 langs/ts/translate/translate.mjs                 |  66 ++-
 results-bench/spread-after.json                  | 495 +++++++++++++++++++++++
 results-bench/spread-after.md                    |  10 +
 results-bench/spread-before.json                 | 495 +++++++++++++++++++++++
 results-bench/spread-before.md                   |  10 +
 results-bench/spread-outside-callees-report.md   | 170 ++++++++
 25 files changed, 1663 insertions(+), 21 deletions(-)
```
