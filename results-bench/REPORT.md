# Promise lane final rebase validation

| Domain | n | Dev 9cb4107 L/T/W | Final branch L/T/W |
|---|---:|---|---|
| .then/.catch chain | 10 | 4/4/4 | 6/5/4 |
| new Promise | 10 | 0/0/0 | 1/1/1 |
| Promise.resolve | 10 | 1/0/0 | 1/0/0 |
| Promise.reject | 10 | 0/0/0 | 0/0/0 |
| Promise.race | 10 | 2/2/0 | 2/2/0 |
| Promise.allSettled | 10 | 2/2/0 | 2/2/0 |
| Promise.any | 0 | 0/0/0 | 0/0/0 |

L/T/W = lint / translate / units with a witnessed mutant. All 60 sampled units match. Every domain meets or exceeds dev 9cb4107. Historical baselines, inherited decreases and exact CLI commands are in comparison.md. Full scorecards: dev-final-before.json and after.json; full logs: dev-final-bench.log and bench.log.

Branch: lane/promise-then-new-promise. Base: dev 9cb4107. No push.

## Whole suite

Command: `node langs/ts/tests/run.mjs` from the assigned worktree.

Actual final line: `| TOTAL | 777 checks | ALL PASS |`

Full output: suite.log.

The final full run is alone after the completed concept benches. An early start was stopped before completion to investigate the changed chain benchmark; that investigation confirmed dev itself refuses the sample. The earlier completed run on base 80728f8 was `| TOTAL | 620 checks | ALL PASS |`, retained in suite-80728f8.log.

## Rebase and reading

The rebase keeps the exceptions lane's exceptionUnitsOf imports, concrete faultPreds bodies, opaqueCompletion and local exact-try boundary. It also keeps the type-test sum datatypes and narrowed reads, spread call_args/call_seq prefixes and callSequence, React imports, callbackStep/callbackLoop/promiseAllMapShape, and u.isCtor handling.

Eligible consumed chains inline arrows and named calls; catch/finally share the world fault channel. Terminal executors return the resolve value or raise the reject fault. Existing dangling, stored and loop chains, wider handlers and combinators retain their outside-call fallback. Held promises retain creation/await ordering; outside callback executor bridges remain opaque.

Inline promise callbacks keep their own fault channel, so the new general exception-callback refusal does not remove their existing throw reading. The completed promise expression presents its outcome to the enclosing exception continuation. Complex tries containing arrows retain the exceptions lane's opaque fallback. The integration pair explicitly expects the innerCatch refactor to remain unproved while lane B finds matching behavior.

## Pairs and escapes

promise_then: both files lint inside; translate and theorem succeed. `Dafny program verifier finished with 9 verified, 8 errors`; every failing lemma is expected. Lane B: 8 WITNESS, 8 PASS-bounded. Commands and output: validation/validation.log; full execution evidence: lane-b.json.

promise_fallback: both files lint inside; translate and theorem succeed. `Dafny program verifier finished with 12 verified, 3 errors`; every failing lemma is expected. Lane B: 3 WITNESS, 7 PASS-bounded. Commands and output: validation-promise_fallback/validation.log; full execution evidence: fallback-lane-b.json.

promise_integration: both files lint inside; translate and theorem succeed. `Dafny program verifier finished with 7 verified, 3 errors`; every failing lemma is expected. Lane B: 2 WITNESS, 5 PASS-bounded. Commands and output: validation-promise_integration/validation.log; full execution evidence: integration-lane-b.json.

The original sixteen verdicts are retained. The fallback pair covers ten units. Seven integration units cover imported async handlers, spread combinators, outer/inner catch boundaries, tagged-value narrowing and Promise.reject versus a throw. The three executor escape fixtures continue to refuse by their named rules.

Reproduction: run `python3 results-bench/validate-promise.py`, then the same command with `promise_fallback` or `promise_integration`, from the assigned worktree. Each lane B unit requests 30 cases.

## Remaining refusals and decisions

New constructors still refuse unsettled paths or post-settlement statements (promise-unsettled), escaped resolvers (promise-executor-escape), unsupported executor shapes (promise-executor), unconsumed/loop constructors (promise-pending), and unsupported bodies or thenables (promise-handler/promise-thenable). Existing calls keep the prior gate and opaque fallback. Non-async Promise-returning units keep the existing promise rule.

No open decision blocks merging. Race/any order and allSettled outcomes remain abstract in outside calls. The inherited census main gap is retained: dev rejects its callback; this branch admits the handler, then encounters an untranslated collectBackupVersionIds dependency. No exception fallback policy was changed to increase a score.

## Files

Against dev 9cb4107: 24 source/design/fixture files, +877/-18. Evidence is separate. Exact per-file deltas and the requested git diff --stat dev snapshot are in file-deltas.md.
