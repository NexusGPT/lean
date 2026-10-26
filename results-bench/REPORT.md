# Promise lane validation

Branch: lane/promise-then-new-promise. No push.

## Pair and escapes

Both pair files lint inside the subset. Translation with parent/candidate suffixes and theorem generation succeed.
`Dafny program verifier finished with 8 verified, 8 errors`: eight positive lemmas prove and exactly eight negative lemmas do not prove.
Lane B: eight WITNESS and eight PASS-bounded, 30 generated cases requested per unit. The changed catch path is witnessed at input 16, where the typed outside fake rejects.
Full commands and output: validation/validation.log. Outcomes and traces: lane-b.json. Reproduction: validate-promise.py.
Ten new escape fixtures cover pending work (including a receiver assignment and a loop), unsettled/escaped executors, settlement followed by effects, unsupported handlers, and three refused combinators.

## Whole suite and repairs

The whole suite was run once, alone among this lane's node/Dafny work:
`node langs/ts/tests/run.mjs`

Actual final line: `| TOTAL | 336 checks | 3 FAILED |`
Full output: suite.log. All 33 checks for promise_then passed in that run.
The three failures were theorem-generation failures in callbacks, for_each, and promise_forms: the new async fault exit attempted a return through existing loop helpers with no return shape.
The fix scopes the new straight-line async fault guards outside loop helpers and refuses newly supported promise forms inside loops as promise-pending. Existing map/forEach shape readers were not edited.
After the fix, targeted translation, theorem/Dafny and lane B checks for all three failed pairs passed (5 + 7 + 9 = 21 checks); the new promise pair also passed again. Exact commands and output: regressions.log and validation/validation.log.
The full suite was not run twice, following the explicit one-run rule. A merged full-suite rerun remains for the lead.

## Reading and choices

Consumed native then/catch/finally chains inline arrow continuations, with ordered world effects and the existing fault channel. Same-file handlers call their unit; imported handlers are transitions.
Terminal synchronous executors return resolve values or raise reject faults; Promise.resolve adopts a plain/native value and Promise.reject raises. Held promises keep the existing creation/await transitions.
A single outside callback bridge is an opaque transition keyed by text, captures, receiver and same-file dependencies: outside scheduling/count/non-settlement is not invented.

Refusals: promise-pending, promise-unsettled, promise-executor-escape, promise-executor, promise-handler, promise-thenable, promise-combinator. Race/any need completion order; allSettled needs per-element outcomes. Named mutating/throwing handlers and generic/overloaded handlers remain refused.

Merge attention: localized tr async fault guards overlap exception work conceptually; native Promise shapes in lane B are necessary for executing handlers and seeded rejection paths. Callback bridges deliberately remain opaque. Loop continuations need a separate async exit design.

## Bench

See comparison.md and before.json/after.json. Before uses the lead-directed master c9847d8; both runs use the stable crc32 sample, and the allSettled baseline was repeated after the parent-file mutant-name fix. No harness or source export copy was made. All runs use jobs 3.

## File deltas

file-deltas.md contains the requested `git diff --stat dev` and the actual lane change stats. Dev advanced while this lane ran; its comparison includes other lanes' additions as apparent deletions. They are not deletions in this commit. The lane changes 24 source/design/fixture files (+624/-16); evidence is separate.
