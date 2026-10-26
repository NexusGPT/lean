# Promise lane validation on 0c4b2b0

| Domain | n | Dev 0c4b2b0 L/T/W | Rebased branch L/T/W |
|---|---:|---|---|
| .then/.catch chain | 10 | 4/4/4 | 6/6/5 |
| new Promise | 10 | 0/0/0 | 1/1/1 |
| Promise.resolve | 10 | 1/0/0 | 1/0/0 |
| Promise.reject | 10 | 1/1/1 | 1/1/1 |
| Promise.race | 10 | 2/2/0 | 2/2/0 |
| Promise.allSettled | 10 | 3/3/0 | 3/3/0 |
| Promise.any | 0 | 0/0/0 | 0/0/0 |

L/T/W = lint / translate / units with a witnessed mutant. All 60 sampled units match. Every domain meets or exceeds dev 0c4b2b0. Full scorecards: dev-0c4b2b0-before.json and after.json. Historical tables and exact CLI commands: comparison.md.

Branch: lane/promise-then-new-promise. Rebased once onto 0c4b2b0. No push.

## Whole suite

Command: node langs/ts/tests/run.mjs from /Users/assem/nexus/nexus-organisation/work/lean-lanes/promise-then-new-promise.

Final result: | TOTAL | 882 checks | ALL PASS |

The suite runs alone, after the completed concept benchmarks and focused validations. Full output: suite.log. Prior completed results are retained in suite-9cb4107.log and suite-80728f8.log.

## Reading and integration

Consumed promise chains inline eligible arrows and named calls; catch/finally use the shared concrete fault channel. Terminal executors return resolve values or raise reject faults. Existing dangling, stored and loop chains, wider handlers and combinators retain their outside-call fallback. Held promises retain creation/await ordering; outside callback executor bridges remain opaque.

The rebase keeps module bindings through the world, Nullish tags, exceptionUnitsOf imports, faultPreds concrete bodies, opaqueCompletion, type-test sum datatypes and narrowed reads, spread call_args/call_seq prefixes and callSequence, React imports, callbackStep/callbackLoop/promiseAllMapShape, and constructor u.isCtor handling.

Promise conversions now use the settled TypeScript type, preserving Null and Undef separately and widening Option into Nullish without losing its absence tag. Handler arguments, handler results, catch success and finally saved values use those typed conversions. The new module/nullish pair distinguishes null from undefined, proves optional widening and native-promise adoption, and checks ordered module state transitions. Nested module reads keep the module lane opaque-unit fallback: moduleValue intentionally remains unproved although bounded execution agrees.

Inline promise callbacks retain their own fault channel and present the completed outcome to an enclosing exception continuation. Complex tries containing arrows retain the exceptions opaque fallback; innerCatch intentionally remains unproved.

## Focused validations

promise_then: both files lint inside; both translate; theorem generation succeeds. Dafny program verifier finished with 9 verified, 8 errors. All proved/unproved lemmas match expect.json. Lane B: 8 WITNESS, 8 PASS-bounded. Commands and outputs: validation/validation.log. Execution evidence: lane-b.json.

promise_fallback: both files lint inside; both translate; theorem generation succeeds. Dafny program verifier finished with 12 verified, 3 errors. All proved/unproved lemmas match expect.json. Lane B: 3 WITNESS, 7 PASS-bounded. Commands and outputs: validation-promise_fallback/validation.log. Execution evidence: fallback-lane-b.json.

promise_integration: both files lint inside; both translate; theorem generation succeeds. Dafny program verifier finished with 7 verified, 3 errors. All proved/unproved lemmas match expect.json. Lane B: 2 WITNESS, 5 PASS-bounded. Commands and outputs: validation-promise_integration/validation.log. Execution evidence: integration-lane-b.json.

promise_module_nullish: both files lint inside; both translate; theorem generation succeeds. Dafny program verifier finished with 8 verified, 3 errors. All proved/unproved lemmas match expect.json. Lane B: 2 WITNESS, 6 PASS-bounded. Commands and outputs: validation-promise_module_nullish/validation.log. Execution evidence: module-nullish-lane-b.json.

All 41 focused lane B verdicts pass, retaining the original 16. Each unit requests 30 executions. The three executor escape fixtures pass their named refusals. Reproduce with python3 -I /Users/assem/nexus/nexus-organisation/work/lean-lanes/promise-then-new-promise/results-bench/validate-promise.py followed by the pair name (default promise_then).

## Refusals and decisions

New constructors still refuse unsettled paths or post-settlement statements (promise-unsettled), escaped resolvers (promise-executor-escape), unsupported executor shapes (promise-executor), unconsumed/loop constructors (promise-pending), and unsupported bodies or thenables (promise-handler/promise-thenable). Existing calls keep the prior gate and opaque fallback. Non-async Promise-returning units keep the existing promise rule.

No open decision blocks merging. Race/any order and allSettled outcomes remain abstract in outside calls. No merged fallback policy was weakened to increase benchmark scores.

## Files

Against base 0c4b2b0: 27 source/design/fixture files, +974/-19. Evidence is separate. Exact per-file deltas and git diff --stat dev are in file-deltas.md.
