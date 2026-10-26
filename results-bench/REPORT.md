# Promise lane validation

| Domain | n | Before L/T/W | After L/T/W | Before mutants | After mutants |
|---|---:|---|---|---|---|
| .then/.catch chain | 10 | 5/5/5 | 6/6/5 | 9/12 | 9/14 |
| new Promise | 10 | 0/0/0 | 1/1/1 | 0/0 | 3/3 |
| Promise.resolve | 10 | 1/0/0 | 1/0/0 | 0/0 | 0/0 |
| Promise.reject | 10 | 0/0/0 | 0/0/0 | 0/0 | 0/0 |
| Promise.race | 10 | 2/2/0 | 2/2/0 | 0/6 | 0/6 |
| Promise.allSettled | 10 | 2/2/0 | 2/2/0 | 0/6 | 0/6 |
| Promise.any | 0 | 0/0/0 | 0/0/0 | 0/0 | 0/0 |

L/T/W = lint / translate / units with a witnessed mutant. All 60 instances match the stable baseline. Every domain meets or exceeds baseline on all three counts. The current dev baseline is dev-before.json; the original baseline remains before.json. Dev independently lowered allSettled lint admission from 4 to 2 with async-callback. Full scorecards and commands: comparison.md, before.json, dev-before.json, after.json, bench.log.

Branch: lane/promise-then-new-promise. This revision rebases onto dev 80728f8 and integrates imported handler call_args names and spread callSequence arguments. No push.

## Whole suite

Command: `node langs/ts/tests/run.mjs`

Actual final line: `| TOTAL | 620 checks | ALL PASS |`

Run alone after all fixes and the completed concept bench, using the newly authorized second full run. The callbacks, for_each and promise_forms failures from the first run are all green in this full run. Full output: suite.log.

## Pairs and escapes

The original promise_then pair keeps all sixteen verdicts: eight WITNESS and eight PASS-bounded. Both files lint inside; translate and theorem succeed; `Dafny program verifier finished with 8 verified, 8 errors`, with exactly the eight expected negative lemmas failing. Commands/output: validation/validation.log; outcomes/traces: lane-b.json.

The new promise_fallback pair has ten units: three WITNESS and seven PASS-bounded. It covers dangling effects, a stored chain awaited later, loop chains, race/allSettled/any, a stored resolve, a wider handler, a mixed opaque/exact chain, and a receiver write. Both files lint inside; theorem verification reports `11 verified, 3 errors` (helper obligations included); exactly the three expected negative lemmas fail. Commands/output: validation-promise_fallback/validation.log; outcomes/traces: fallback-lane-b.json. Seven refusal fixtures were replaced by positive pair coverage. Three new executor escape fixtures remain.

Reproduction: `python3 results-bench/validate-promise.py` and `python3 results-bench/validate-promise.py promise_fallback`, from the assigned worktree. Each lane B unit requests 30 generated cases.

## Reading

Eligible consumed native chains inline arrows and named calls; catch/finally share the world fault channel. Terminal executors resolve values or raise faults.
When exact reading does not apply, existing calls retain an outside transition: dangling/stored/loop chains, wider handlers, combinators, and non-consumed resolve/reject. The gate records exact expression spans, and opaque roots suppress exact descendants. Actual argument and result types keep typed handlers well formed; handler captures, receiver and same-file dependencies remain observable.
Held promises retain creation/await sequencing. A single outside callback executor bridge stays opaque because outside callback scheduling/count/non-settlement is unknown.

## Remaining refusals and decisions

New constructors had no previous reading. Unsettled paths or post-settlement statements use promise-unsettled; escaped resolvers use promise-executor-escape; unsupported executor forms use promise-executor; unconsumed/loop constructors use promise-pending; unsupported executor bodies/thenables use promise-handler/promise-thenable. Existing calls retain their prior gate rather than acquiring these new refusals. Non-async Promise-returning units retain the existing promise rule.

No open decision blocks merging. Race/any completion order and allSettled outcomes remain abstract in the outside call. Existing loop helpers, promiseAllMapShape and forEachShape are unchanged. The main merge overlap remains the localized async fault guards and the lane B Promise shape changes from the first commit.

## Files

Against dev 80728f8 this lane changes 24 source/design/fixture files, +809/-17; evidence is separate. Full per-file deltas, including the requested git diff --stat dev snapshot, are in file-deltas.md. Dev advanced while the lane ran, so that comparison also shows other lanes' differences; those are not deletions made by this revision.

The promise_integration pair adds three verdicts: imported async handler refactor PASS-bounded, spread race argument mutation WITNESS, and untouched PASS-bounded. Both files lint inside; theorem verification: 2 verified, 1 expected error. Output: validation-promise_integration/validation.log and integration-lane-b.json.
