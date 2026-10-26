# React handler and memo validation

Worktree: `/Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo`.
All commands run there, with `--no-project` for pair probes. No network or push.

## Targeted commands

For each side of `langs/ts/tests/pairs/jsx_handlers`:
```
node langs/ts/lint/lint.mjs <side.tsx> --no-project
node langs/ts/translate/translate.mjs <side.tsx> --core --suffix <side> --out <side.dfy> --prelude <side.pre.dfy> --no-project --effectful Counter,Effect,SetterChanged,StateRead,EffectCapture,StaleMemo,EffectfulMemo
python3 -I spec/theorem.py --parent parent.dfy --candidate candidate.dfy --scope scope.json --edit edit.json --out theorem.dfy
dafny verify --verification-time-limit 30 theorem.dfy
node langs/ts/exec/run.mjs --parent parent.tsx --candidate candidate.tsx --unit <unit> --n 30 --no-project --out <unit.json>
```
Scope lists every `expect.scope` name with `in_scope: false`; edit is `{}`.
The expected failures are confined to the eleven changed/stale lemmas. The six
preserving lemmas close. Dafny also prints Z3 model-parser diagnostics on failed
obligations; the verifier finishes and the lemma locations match the expectations.

Actual output:
```
/Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/langs/ts/tests/pairs/jsx_handlers/parent.tsx: inside the subset
wrote /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/parent.dfy and /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/parent.pre.dfy
/Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/langs/ts/tests/pairs/jsx_handlers/candidate.tsx: inside the subset
wrote /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/candidate.dfy and /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/candidate.pre.dfy
theorem: wrote /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/theorem.dfy (17 lemmas)
Equal_rewired: not proved (expected False)
Equal_callback_refactor: proved (expected True)
Equal_memo_changed: not proved (expected False)
Equal_captured: not proved (expected False)
Equal_ordered: not proved (expected False)
Equal_counter: proved (expected True)
Equal_effect: proved (expected True)
Equal_untouched: proved (expected True)
Equal_setter_changed: not proved (expected False)
Equal_state_read: not proved (expected False)
Equal_memo_refactor: proved (expected True)
Equal_effect_capture: not proved (expected False)
Equal_opaque_handler: not proved (expected False)
Equal_stale_memo: not proved (expected False)
Equal_effectful_memo: not proved (expected False)
Equal_hook_aliases: proved (expected True)
Equal_pure_handler: not proved (expected False)
Dafny program verifier finished with 6 verified, 11 errors
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/b_Rewired.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/b_CallbackRefactor.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/b_MemoChanged.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/b_Captured.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/b_Ordered.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/b_Counter.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/b_Effect.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/b_Untouched.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/b_SetterChanged.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/b_StateRead.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/b_MemoRefactor.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/b_EffectCapture.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/b_OpaqueHandler.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/b_StaleMemo.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/b_EffectfulMemo.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/b_HookAliases.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/b_PureHandler.json
```

Both escape commands exit 1 and name `react-handler-capture`:
```
node langs/ts/lint/lint.mjs fixtures/escapes/ts/react_handler_capture.ts --no-project
node langs/ts/translate/translate.mjs fixtures/escapes/ts/react_handler_capture.ts --fn changing --out escape.dfy --no-project
react-handler-capture  a React closure captures a changing local; capture a const value or use a state setter
```

A direct AST probe of `exactReactHook` additionally printed:
```
good: true
stale: false
allocation: false
effects: false
foreign: false
alias: true
namespace: true
omitted: true
```
The false cases keep ordinary transitions. The true cases are pure scalar memo,
covered callback captures, actual React import aliases, and omitted dependencies.

## Concept bench

The unmodified harness was run with its stable crc32 sampling and parent-file plus
process-id mutant names. The final baseline and after runs use identical ordered
(root, file, unit) triples, checked by a Python assertion.
```
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean --concepts 'JSX handler attribute|React hook call' --k 10 --jobs 2 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/react-before
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo --concepts 'JSX handler attribute|React hook call' --k 10 --jobs 2 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo/results-bench/react-after
```

| domain | before lint / translate / units with witness | after lint / translate / units with witness | before mutants | after mutants |
|---|---|---|---|---|
| JSX handler attribute | 8 / 5 / 5 out of 10 | 8 / 5 / 5 out of 10 | 12/14 | 14/14 |
| React hook call | 3 / 3 / 2 out of 10 | 3 / 3 / 3 out of 10 | 6/7 | 7/7 |

Raw scorecards: `react-before.md`, `react-after.md`.

## Whole suite

Run once, after probes and bench, with no other lane-local node/Dafny work:
```
node langs/ts/tests/run.mjs
```

Actual suite output:
```
| TOTAL | 341 checks | ALL PASS |
```

## Callable wrapper probe

A focused Dafny probe asked whether two arbitrary `() -> Unit` values are equal,
also after asserting that their applications return the same value. Both lemmas
remain unproved. The descriptor factory therefore uses ordinary congruence on
its symbolic argument; it does not require arbitrary function extensional equality.
```
dafny verify --verification-time-limit 10 results-bench/function-equality.dfy
Dafny program verifier finished with 0 verified, 2 errors
```
These are expected failures. No source changed after the complete suite.

Probe source:
```dafny
datatype Unit = Unit
lemma UnitFunctions(f: () -> Unit, g: () -> Unit) ensures f == g {}
lemma UnitFunctionsExplicit(f: () -> Unit, g: () -> Unit) ensures f == g {
  assert f() == g();
}
```

## Diff provenance

The lane started at `5ebf1d8065a7f8455c95bac180a4149861e61617`.
Other lanes advanced the shared `dev` ref during this task. The command requested
by the brief therefore includes their absent changes as well as this lane's edits.
No other worktree was edited, and no branch was moved or pushed.

Captured dev tip: `5c40194c293e63b23ef81fd81dadf14ea36ceeeb`.

Requested `git -C "/Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo" diff --stat dev`:
```
 .gitignore                                         |   1 -
 README.md                                          |  55 +--
 fixtures/escapes/ts/async_callback.ts              |   2 +-
 fixtures/escapes/ts/async_callback_callee_order.ts |  10 -
 fixtures/escapes/ts/async_callback_order.ts        |   5 -
 fixtures/escapes/ts/async_callback_unawaited.ts    |   5 -
 fixtures/escapes/ts/async_filter.ts                |   4 -
 fixtures/escapes/ts/dynamic_record_effect_key.ts   |   3 -
 fixtures/escapes/ts/dynamic_record_method.ts       |   2 -
 fixtures/escapes/ts/dynamic_record_prototype.ts    |   2 -
 fixtures/escapes/ts/dynamic_record_string.ts       |   5 -
 fixtures/escapes/ts/dynamic_record_write.ts        |   2 -
 fixtures/escapes/ts/react_handler_capture.ts       |   9 +
 fixtures/escapes/ts/super_field.ts                 |   8 -
 langs/ts/CONCEPT-PLAN.md                           |  12 +-
 langs/ts/COVERAGE.md                               |  30 +-
 langs/ts/common.mjs                                |   8 +-
 langs/ts/design/dynamic-record-reads.md            |  70 ----
 langs/ts/design/effectful-callbacks.md             |  76 ----
 langs/ts/design/heap-layer-census.json             | 271 -------------
 langs/ts/design/heap-layer-census.mjs              | 161 --------
 langs/ts/design/heap-layer-toy.dfy                 |  87 -----
 langs/ts/design/heap-layer-toy.mjs                 |  62 ---
 langs/ts/design/heap-layer.md                      | 200 ----------
 langs/ts/design/react-handlers-memo.md             |  73 ++++
 langs/ts/exec/run.mjs                              |  52 ++-
 langs/ts/lint/lint.mjs                             | 182 +++------
 langs/ts/react.mjs                                 |  95 +++++
 langs/ts/subset.md                                 |  30 +-
 langs/ts/tests/pairs/class_new/candidate.ts        |  59 ---
 langs/ts/tests/pairs/class_new/expect.json         |  33 --
 langs/ts/tests/pairs/class_new/parent.ts           |  58 ---
 langs/ts/tests/pairs/class_super/base.ts           |   6 -
 langs/ts/tests/pairs/class_super/candidate.ts      |  22 --
 langs/ts/tests/pairs/class_super/expect.json       |  20 -
 langs/ts/tests/pairs/class_super/parent.ts         |  22 --
 langs/ts/tests/pairs/counter/expect.json           |  22 +-
 langs/ts/tests/pairs/dynamic_reads/base.ts         |   2 -
 langs/ts/tests/pairs/dynamic_reads/candidate.ts    |  22 --
 langs/ts/tests/pairs/dynamic_reads/expect.json     |  63 ---
 langs/ts/tests/pairs/dynamic_reads/parent.ts       |  28 --
 .../tests/pairs/effectful_callbacks/candidate.ts   |  53 ---
 .../ts/tests/pairs/effectful_callbacks/expect.json |  51 ---
 langs/ts/tests/pairs/effectful_callbacks/parent.ts |  52 ---
 langs/ts/tests/pairs/for_each/expect.json          |   6 +-
 langs/ts/tests/pairs/function_values/expect.json   |   6 +-
 langs/ts/tests/pairs/jsx_handlers/candidate.tsx    |  72 ++++
 langs/ts/tests/pairs/jsx_handlers/expect.json      |  60 +++
 langs/ts/tests/pairs/jsx_handlers/parent.tsx       |  70 ++++
 langs/ts/tests/pairs/jsx_handlers/types.d.ts       |  16 +
 langs/ts/tests/pairs/logic_values/expect.json      |  28 +-
 langs/ts/tests/pairs/promise_forms/expect.json     |  25 +-
 langs/ts/tests/pairs/service/expect.json           |   6 +-
 langs/ts/tests/pairs/try_catch/expect.json         |   6 +-
 langs/ts/translate/translate.mjs                   | 435 ++++++++-------------
 results-bench/react-after.md                       |   8 +
 results-bench/react-before.md                      |   8 +
 results-bench/react-validation.md                  | 125 ++++++
 58 files changed, 845 insertions(+), 2061 deletions(-)
```

Lane-only staged delta before this provenance paragraph:
```
 fixtures/escapes/ts/react_handler_capture.ts    |   9 ++
 langs/ts/CONCEPT-PLAN.md                        |   2 +-
 langs/ts/COVERAGE.md                            |   6 +-
 langs/ts/design/react-handlers-memo.md          |  73 ++++++++++++++
 langs/ts/exec/run.mjs                           |  47 ++++++++-
 langs/ts/lint/lint.mjs                          |  23 ++++-
 langs/ts/react.mjs                              |  95 ++++++++++++++++++
 langs/ts/subset.md                              |  10 +-
 langs/ts/tests/pairs/jsx_handlers/candidate.tsx |  72 ++++++++++++++
 langs/ts/tests/pairs/jsx_handlers/expect.json   |  60 ++++++++++++
 langs/ts/tests/pairs/jsx_handlers/parent.tsx    |  70 +++++++++++++
 langs/ts/tests/pairs/jsx_handlers/types.d.ts    |  16 +++
 langs/ts/translate/translate.mjs                | 115 +++++++++++++++++++---
 results-bench/react-after.md                    |   8 ++
 results-bench/react-before.md                   |   8 ++
 results-bench/react-validation.md               | 125 ++++++++++++++++++++++++
 16 files changed, 717 insertions(+), 22 deletions(-)
```
