# Exceptions across calls: scoped revision validation

Pre-rebase validation. The integration with `dev` at `80728f8` is recorded in [exceptions-across-calls-rebase-validation.md](exceptions-across-calls-rebase-validation.md).

| Concept | Before lint / translate / witnessed units | After lint / translate / witnessed units |
|---|---|---|
| throw | 7 / 6 / 6 | 7 / 6 / 6 |
| try/catch | 3 / 3 / 3 | 3 / 3 / 3 |
| try/finally only | 7 / 4 / 2 | 7 / 7 / 4 |

Every count is out of ten. The original stable baseline remains `c9847d8`; its reports are
`results-bench/exceptions/before.{json,md}`. The after reports are
`results-bench/exceptions-revision/after.{json,md}`. All 30 `(root,file,unit)` identities match.

Worktree: `/Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls`.
Branch: `lane/exceptions-across-calls`; this revision follows `0a6ac74` and is not pushed.

## Scope and choices

The outcome channel remains the concrete optional fault in World. Uncaught throw is terminal.
General transition checkpoints are local to exact try regions and finalizers, with explicit
same-file exception outcomes propagated at calls. Callers inherit the outcome channel;
ordinary callees do not inherit completion restrictions. A unit's unrelated transitions,
loops and callbacks retain their previous reading.

A complex try uses the existing text-keyed opaque transition instead of a whole-unit refusal.
This includes loops, callbacks, lazy expression sequencing, shadowed locals and object returns.
Straight-line finally keeps its exact normal/return/throw continuations. Complex finally keeps
its admitted opaque fallback. A terminal opaque statement returns its completion directly;
it no longer needs a fictional fall-through path ending in another return.

Remaining refusals are a returned alias referenced by finally (`exception-return`), a local
shadowing a binding read by finally (`exception-binding`), and throwing function values or
callback throws outside opaque try (`exception-callback`). The loop/expression escapes became
admission regressions in `exceptions_scope`; no exception-loop or exception-expression rule remains.

Lead choice: keep this conservative local opacity where no exact completion reading exists.
It preserves admission without claiming exact loop/callback/finalizer semantics there.
The ordinary implicit-exception reading outside checked regions is unchanged. No open blocker.

## Bench command and measured output

The shared harness was run as-is, with stable sampling and collision-safe mutant filenames:

```sh
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls --concepts 'throw|try/catch|try/finally only' --k 10 --jobs 2 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/after
```

```text
3 concepts, 30 instances
exported /Users/assem/Documents/GitHub/nexus
exported /Users/assem/Documents/GitHub/n8n
exported /Users/assem/Documents/GitHub/driftbench
throw | UserManagementMailer.verifyConnection | translated  2/2
throw | getCohereClient | translated  3/3
throw | assertWebVoiceOriginAllowed | translated  1/3
throw | SendSlackHumanInputUseCase.execute | translated  3/3
throw | convertMessageContentToBlockParams | translated  3/3
throw | humanApproval | lint-out ts-strict /
throw | Expression.renderExpression | lint-out foreach /
throw | extractValueOther | lint-out prototype /
throw | fetchCorpus | translate-fail  /
throw | GetPermissionsQuery.execute | translated  3/3
try/catch | readText | translated  2/2
try/catch | EchoExportCleanupService.cleanupHandler | lint-out global-read /
try/catch | deepLApiRequest | lint-out this /
try/catch | HttpClient.send | lint-out loop-form /
try/catch | killNotificationListener.onSkillProgress | translated  3/3
try/catch | RunnableWithFallbacks._streamIterator | lint-out generator /
try/catch | InternalHooks.onWorkflowCrashed | lint-out dynamic-key /
try/catch | allbackManagerForChainRun.handleChainEnd | lint-out prototype /
try/catch | registerAuthSwitchCommand | lint-out property-assign /
try/finally only | tabWithMode | translated  1/3
try/finally only | BurstDrain.run | translated  0/0
try/finally only | anUninstallThatCannotRemoveTheToolSaysSo | translated  2/3
try/finally only | VoiceReplyService.buildVoiceContent | lint-out async /
try/catch | JsonParseNode.preCompute | translated  3/3
try/finally only | readTarget | translated  0/2
try/finally only | readTextChunks | lint-out generator /
try/finally only | AddWordTemplateContent | translated  3/3
try/finally only | installWinFspMsi | lint-out dynamic-key /
try/finally only | FolderSandbox.readFile | translated  1/3
try/finally only | main | translated  0/3
wrote /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/after.md
throw: before 7/6/6; after 7/6/6; mutants 15/17 -> 15/17
try/catch: before 3/3/3; after 3/3/3; mutants 8/8 -> 8/8
try/finally only: before 7/4/2; after 7/7/4; mutants 5/9 -> 7/17
All 30 sampled identities match; all nine admission, translation and witnessed-unit comparisons meet acceptance.
```

The final switch fall-through correction was made during the bench. Lane B is unchanged.
Every sampled unit's lint/translation was then rerun against the final source with the same
`--core --tolerant --only <unit>` and project arguments, writing reports inside this worktree.
All 30 final statuses exactly match the bench (asserted by `(concept,file,unit,status)`).
The retained `admission-final.json` records that independent final-source check.

```text
throw SendSlackHumanInputUseCase.execute translated
throw UserManagementMailer.verifyConnection translated
throw getCohereClient translated
throw assertWebVoiceOriginAllowed translated
throw convertMessageContentToBlockParams translated
throw humanApproval lint-out
throw Expression.renderExpression lint-out
throw GetPermissionsQuery.execute translated
throw extractValueOther lint-out
throw fetchCorpus translate-fail
try/catch EchoExportCleanupService.cleanupHandler lint-out
try/catch readText translated
try/catch deepLApiRequest lint-out
try/catch HttpClient.send lint-out
try/catch SlackSkillNotificationListener.onSkillProgress translated
try/catch JsonParseNode.preCompute translated
try/catch RunnableWithFallbacks._streamIterator lint-out
try/catch InternalHooks.onWorkflowCrashed lint-out
try/catch CallbackManagerForChainRun.handleChainEnd lint-out
try/catch registerAuthSwitchCommand lint-out
try/finally only tabWithMode translated
try/finally only BurstDrain.run translated
try/finally only anUninstallThatCannotRemoveTheToolSaysSo translated
try/finally only VoiceReplyService.buildVoiceContent lint-out
try/finally only AddWordTemplateContent translated
try/finally only readTarget translated
try/finally only readTextChunks lint-out
try/finally only FolderSandbox.readFile translated
try/finally only installWinFspMsi lint-out
try/finally only main translated
Final-source admission matches bench for all 30 units.
```

## Original 17-unit pair

All expected equality lemmas and bounded verdicts match: nine equalities proved and eight
intentionally unproved; nine bounded passes and eight witnesses. Both sides lint and verify
independently. The targeted runner asserts the exact set of failing equality lemmas.
Z3 model-parser messages on countermodels are preserved below, not discarded.

```text
$ node langs/ts/lint/lint.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --no-project
/Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts: inside the subset

$ node langs/ts/lint/lint.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --no-project
/Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts: inside the subset

$ node langs/ts/lint/lint.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/ports.ts --no-project
/Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/ports.ts: inside the subset

$ node langs/ts/translate/translate.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --core --suffix parent --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/parent.dfy --prelude /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/parent.pre.dfy --effectful ignored,parseText
wrote /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/parent.dfy and /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/parent.pre.dfy

$ dafny verify /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/parent.dfy

Dafny program verifier finished with 0 verified, 0 errors

$ node langs/ts/translate/translate.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --core --suffix candidate --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/candidate.dfy --prelude /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/candidate.pre.dfy --effectful ignored,parseText
wrote /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/candidate.dfy and /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/candidate.pre.dfy

$ dafny verify /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/candidate.dfy

Dafny program verifier finished with 0 verified, 0 errors

$ python3 -I spec/theorem.py --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/parent.dfy --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/candidate.dfy --scope /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope.json --edit /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/edit.json --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/theorem.dfy
theorem: wrote /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/theorem.dfy (17 lemmas)

$ dafny verify --verification-time-limit 30 /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/theorem.dfy
Prover error: Model parsing error: Invalid model: invalid element name 0.0, at line 444 (  0.0)

Prover error: Model parsing error: Invalid model: invalid element name 0.0, at line 391 (  0.0)

Prover error: Could not parse any models

Prover error: Could not parse any models

Prover error: Model parsing error: Invalid model: invalid element name 0.0, at line 359 (  0.0)

Prover error: Could not parse any models

results-bench/exceptions-revision/theorem.dfy(665,0): Error: a postcondition could not be proved on this return path
    |
665 | { // PROOF Equal_leaf
    | ^

results-bench/exceptions-revision/theorem.dfy(664,30): Related location: this is the postcondition that could not be proved
    |
664 |   ensures leaf_parent(wld, x) == leaf_candidate(wld, x)
    |                               ^^

results-bench/exceptions-revision/theorem.dfy(671,0): Error: a postcondition could not be proved on this return path
    |
671 | { // PROOF Equal_caller
    | ^

results-bench/exceptions-revision/theorem.dfy(670,32): Related location: this is the postcondition that could not be proved
    |
670 |   ensures caller_parent(wld, x) == caller_candidate(wld, x)
    |                                 ^^

results-bench/exceptions-revision/theorem.dfy(689,0): Error: a postcondition could not be proved on this return path
    |
689 | { // PROOF Equal_ignored
    | ^

results-bench/exceptions-revision/theorem.dfy(688,33): Related location: this is the postcondition that could not be proved
    |
688 |   ensures ignored_parent(wld, x) == ignored_candidate(wld, x)
    |                                  ^^

Prover error: Model parsing error: Invalid model: invalid element name 0.0, at line 480 (  0.0)

Prover error: Could not parse any models

Prover error: Model parsing error: Invalid model: invalid element name 0.0, at line 384 (  0.0)

Prover error: Could not parse any models

Prover error: Model parsing error: Invalid model: invalid element name 0.0, at line 498 (  0.0)

Prover error: Could not parse any models

results-bench/exceptions-revision/theorem.dfy(713,0): Error: a postcondition could not be proved on this return path
    |
713 | { // PROOF Equal_nested
    | ^

results-bench/exceptions-revision/theorem.dfy(712,32): Related location: this is the postcondition that could not be proved
    |
712 |   ensures nested_parent(wld, x) == nested_candidate(wld, x)
    |                                 ^^

results-bench/exceptions-revision/theorem.dfy(725,0): Error: a postcondition could not be proved on this return path
    |
725 | { // PROOF Equal_finalizer_cleanup
    | ^

results-bench/exceptions-revision/theorem.dfy(724,49): Related location: this is the postcondition that could not be proved
    |
724 |   ensures finalizer_cleanup_parent(wld, self, x) == finalizer_cleanup_candidate(wld, self, x)
    |                                                  ^^

results-bench/exceptions-revision/theorem.dfy(737,0): Error: a postcondition could not be proved on this return path
    |
737 | { // PROOF Equal_finalizer_order
    | ^

results-bench/exceptions-revision/theorem.dfy(736,47): Related location: this is the postcondition that could not be proved
    |
736 |   ensures finalizer_order_parent(wld, self, x) == finalizer_order_candidate(wld, self, x)
    |                                                ^^

Prover error: Model parsing error: Invalid model: invalid element name 0.0, at line 326 (  0.0)

Prover error: Could not parse any models

results-bench/exceptions-revision/theorem.dfy(755,0): Error: a postcondition could not be proved on this return path
    |
755 | { // PROOF Equal_parse_text
    | ^

results-bench/exceptions-revision/theorem.dfy(754,39): Related location: this is the postcondition that could not be proved
    |
754 |   ensures parse_text_parent(wld, text) == parse_text_candidate(wld, text)
    |                                        ^^

Prover error: Model parsing error: Invalid model: invalid element name 0.0, at line 379 (  0.0)

Prover error: Could not parse any models

results-bench/exceptions-revision/theorem.dfy(761,0): Error: a postcondition could not be proved on this return path
    |
761 | { // PROOF Equal_parse_caller
    | ^

results-bench/exceptions-revision/theorem.dfy(760,41): Related location: this is the postcondition that could not be proved
    |
760 |   ensures parse_caller_parent(wld, text) == parse_caller_candidate(wld, text)
    |                                          ^^


Dafny program verifier finished with 10 verified, 8 errors

Failed lemmas: ['Equal_caller', 'Equal_finalizer_cleanup', 'Equal_finalizer_order', 'Equal_ignored', 'Equal_leaf', 'Equal_nested', 'Equal_parse_caller', 'Equal_parse_text']
$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit leaf --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_leaf.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_leaf.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit caller --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_caller.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_caller.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit stable --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_stable.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_stable.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit moved --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_moved.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_moved.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit ignored --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_ignored.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_ignored.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit condition --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_condition.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_condition.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit overrideReturn --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_overrideReturn.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_overrideReturn.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit overrideFault --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_overrideFault.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_overrideFault.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit nested --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_nested.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_nested.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit untouched --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_untouched.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_untouched.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit Finalizer.cleanup --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_Finalizer.cleanup.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_Finalizer.cleanup.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit Finalizer.preserved --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_Finalizer.preserved.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_Finalizer.preserved.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit Finalizer.order --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_Finalizer.order.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_Finalizer.order.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit changedOutput --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_changedOutput.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_changedOutput.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit observeOutput --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_observeOutput.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_observeOutput.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit parseText --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_parseText.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_parseText.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit parseCaller --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_parseCaller.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/b_parseCaller.json

```

## Scope regression pair

Eleven units cover ordinary helpers, terminal throws in loops, opaque loop/callback catches,
catch shadowing, dropped cleanup, ordinary effectful callbacks/loops, lazy exception calls,
and switch fall-through. Eight equalities prove; three differences are witnessed.
Both sides lint and verify independently; the exact failing-lemma set is asserted.

```text
$ node langs/ts/lint/lint.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/candidate.ts --no-project
/Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/candidate.ts: inside the subset

$ node langs/ts/lint/lint.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/parent.ts --no-project
/Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/parent.ts: inside the subset

$ node langs/ts/translate/translate.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/parent.ts --core --suffix parent --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/parent.dfy --prelude /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/parent.pre.dfy --effectful cleanupLoop
wrote /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/parent.dfy and /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/parent.pre.dfy

$ dafny verify /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/parent.dfy

Dafny program verifier finished with 7 verified, 0 errors

$ node langs/ts/translate/translate.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/candidate.ts --core --suffix candidate --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/candidate.dfy --prelude /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/candidate.pre.dfy --effectful cleanupLoop
wrote /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/candidate.dfy and /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/candidate.pre.dfy

$ dafny verify /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/candidate.dfy

Dafny program verifier finished with 7 verified, 0 errors

$ python3 -I spec/theorem.py --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/parent.dfy --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/candidate.dfy --scope /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/scope.json --edit /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/edit.json --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/theorem.dfy
theorem: wrote /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/theorem.dfy (11 lemmas)

$ dafny verify --verification-time-limit 30 /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/theorem.dfy
Prover error: Model parsing error: Invalid model: invalid element name 0.0, at line 374 (  0.0)

Prover error: Could not parse any models

Prover error: Model parsing error: Invalid model: invalid element name 0.0, at line 345 (  0.0)

Prover error: Could not parse any models

Prover error: Model parsing error: Invalid model: invalid element name 0.0, at line 370 (  0.0)

Prover error: Could not parse any models

results-bench/exceptions-revision/scope/theorem.dfy(353,0): Error: a postcondition could not be proved on this return path
    |
353 | { // PROOF Equal_terminal
    | ^

results-bench/exceptions-revision/scope/theorem.dfy(352,35): Related location: this is the postcondition that could not be proved
    |
352 |   ensures terminal_parent(wld, xs) == terminal_candidate(wld, xs)
    |                                    ^^

results-bench/exceptions-revision/scope/theorem.dfy(377,0): Error: a postcondition could not be proved on this return path
    |
377 | { // PROOF Equal_cleanup_loop
    | ^

results-bench/exceptions-revision/scope/theorem.dfy(376,45): Related location: this is the postcondition that could not be proved
    |
376 |   ensures cleanup_loop_parent(wld, xs, port) == cleanup_loop_candidate(wld, xs, port)
    |                                              ^^

results-bench/exceptions-revision/scope/theorem.dfy(389,0): Error: a postcondition could not be proved on this return path
    |
389 | { // PROOF Equal_lazy
    | ^

results-bench/exceptions-revision/scope/theorem.dfy(388,30): Related location: this is the postcondition that could not be proved
    |
388 |   ensures lazy_parent(wld, x) == lazy_candidate(wld, x)
    |                               ^^


Dafny program verifier finished with 20 verified, 3 errors

Failed lemmas: ['Equal_cleanup_loop', 'Equal_lazy', 'Equal_terminal']
$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/candidate.ts --unit helper --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/b_helper.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/b_helper.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/candidate.ts --unit caller --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/b_caller.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/b_caller.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/candidate.ts --unit terminal --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/b_terminal.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/b_terminal.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/candidate.ts --unit loopCatch --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/b_loopCatch.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/b_loopCatch.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/candidate.ts --unit callbackCatch --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/b_callbackCatch.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/b_callbackCatch.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/candidate.ts --unit shadowCatch --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/b_shadowCatch.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/b_shadowCatch.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/candidate.ts --unit cleanupLoop --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/b_cleanupLoop.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/b_cleanupLoop.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/candidate.ts --unit ordinary --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/b_ordinary.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/b_ordinary.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/candidate.ts --unit lazy --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/b_lazy.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/b_lazy.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/candidate.ts --unit lazyLeaf --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/b_lazyLeaf.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/b_lazyLeaf.json

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_scope/candidate.ts --unit switchFallback --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/b_switchFallback.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/scope/b_switchFallback.json

```

## Remaining escapes

```text
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/lint/lint.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/fixtures/escapes/ts/exceptions_binding.ts --no-project
/Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/fixtures/escapes/ts/exceptions_binding.ts:2:75  exception-binding  use a distinct name for a local that shadows a value read by finally
1 violation(s)

$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/translate/translate.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/fixtures/escapes/ts/exceptions_binding.ts --core --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/escape.dfy
translate: outside the subset:
  /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/fixtures/escapes/ts/exceptions_binding.ts:2:75  exception-binding  use a distinct name for a local that shadows a value read by finally

$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/lint/lint.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/fixtures/escapes/ts/exceptions_callback.ts --no-project
/Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/fixtures/escapes/ts/exceptions_callback.ts:2:79  exception-callback  move the throw to a same-file unit and call it directly
1 violation(s)

$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/translate/translate.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/fixtures/escapes/ts/exceptions_callback.ts --core --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/escape.dfy
translate: outside the subset:
  /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/fixtures/escapes/ts/exceptions_callback.ts:2:79  exception-callback  move the throw to a same-file unit and call it directly

$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/lint/lint.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/fixtures/escapes/ts/exceptions_return.ts --no-project
/Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/fixtures/escapes/ts/exceptions_return.ts:2:71  exception-return  return a primitive or copy the value; finally can change the returned alias
1 violation(s)

$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/translate/translate.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/fixtures/escapes/ts/exceptions_return.ts --core --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-revision/escape.dfy
translate: outside the subset:
  /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/fixtures/escapes/ts/exceptions_return.ts:2:71  exception-return  return a primitive or copy the value; finally can change the returned alias

```

## Whole suite

Run once after the final bench, final-source admission check and targeted probes:

```sh
node langs/ts/tests/run.mjs
```

Measured output (both exception pairs, remaining escapes and total):

```text
| pair         | exceptions_across     | theorem generated                        | PASS |             | ok
| pair         | exceptions_across     | Equal_leaf not proved                    | PASS |             | not proved
| pair         | exceptions_across     | Equal_caller not proved                  | PASS |             | not proved
| pair         | exceptions_across     | Equal_stable proved                      | PASS |             | proved
| pair         | exceptions_across     | Equal_moved proved                       | PASS |             | proved
| pair         | exceptions_across     | Equal_ignored not proved                 | PASS |             | not proved
| pair         | exceptions_across     | Equal_condition proved                   | PASS |             | proved
| pair         | exceptions_across     | Equal_override_return proved             | PASS |             | proved
| pair         | exceptions_across     | Equal_override_fault proved              | PASS |             | proved
| pair         | exceptions_across     | Equal_nested not proved                  | PASS |             | not proved
| pair         | exceptions_across     | Equal_untouched proved                   | PASS |             | proved
| pair         | exceptions_across     | Equal_finalizer_cleanup not proved       | PASS |             | not proved
| pair         | exceptions_across     | Equal_finalizer_preserved proved         | PASS |             | proved
| pair         | exceptions_across     | Equal_finalizer_order not proved         | PASS |             | not proved
| pair         | exceptions_across     | Equal_changed_output proved              | PASS |             | proved
| pair         | exceptions_across     | Equal_observe_output proved              | PASS |             | proved
| pair         | exceptions_across     | Equal_parse_text not proved              | PASS |             | not proved
| pair         | exceptions_across     | Equal_parse_caller not proved            | PASS |             | not proved
| pair         | exceptions_across     | lane B leaf WITNESS                      | PASS |             | WITNESS
| pair         | exceptions_across     | lane B caller WITNESS                    | PASS |             | WITNESS
| pair         | exceptions_across     | lane B stable PASS-bounded               | PASS |             | PASS-bounded
| pair         | exceptions_across     | lane B moved PASS-bounded                | PASS |             | PASS-bounded
| pair         | exceptions_across     | lane B ignored WITNESS                   | PASS |             | WITNESS
| pair         | exceptions_across     | lane B condition PASS-bounded            | PASS |             | PASS-bounded
| pair         | exceptions_across     | lane B overrideReturn PASS-bounded       | PASS |             | PASS-bounded
| pair         | exceptions_across     | lane B overrideFault PASS-bounded        | PASS |             | PASS-bounded
| pair         | exceptions_across     | lane B nested WITNESS                    | PASS |             | WITNESS
| pair         | exceptions_across     | lane B untouched PASS-bounded            | PASS |             | PASS-bounded
| pair         | exceptions_across     | lane B Finalizer.cleanup WITNESS         | PASS |             | WITNESS
| pair         | exceptions_across     | lane B Finalizer.preserved PASS-bounded  | PASS |             | PASS-bounded
| pair         | exceptions_across     | lane B Finalizer.order WITNESS           | PASS |             | WITNESS
| pair         | exceptions_across     | lane B changedOutput PASS-bounded        | PASS |             | PASS-bounded
| pair         | exceptions_across     | lane B observeOutput PASS-bounded        | PASS |             | PASS-bounded
| pair         | exceptions_across     | lane B parseText WITNESS                 | PASS |             | WITNESS
| pair         | exceptions_across     | lane B parseCaller WITNESS               | PASS |             | WITNESS
| pair         | exceptions_scope      | theorem generated                        | PASS |             | ok
| pair         | exceptions_scope      | Equal_helper proved                      | PASS |             | proved
| pair         | exceptions_scope      | Equal_caller proved                      | PASS |             | proved
| pair         | exceptions_scope      | Equal_terminal not proved                | PASS |             | not proved
| pair         | exceptions_scope      | Equal_loop_catch proved                  | PASS |             | proved
| pair         | exceptions_scope      | Equal_callback_catch proved              | PASS |             | proved
| pair         | exceptions_scope      | Equal_shadow_catch proved                | PASS |             | proved
| pair         | exceptions_scope      | Equal_cleanup_loop not proved            | PASS |             | not proved
| pair         | exceptions_scope      | Equal_ordinary proved                    | PASS |             | proved
| pair         | exceptions_scope      | Equal_lazy not proved                    | PASS |             | not proved
| pair         | exceptions_scope      | Equal_lazy_leaf proved                   | PASS |             | proved
| pair         | exceptions_scope      | Equal_switch_fallback proved             | PASS |             | proved
| pair         | exceptions_scope      | lane B helper PASS-bounded               | PASS |             | PASS-bounded
| pair         | exceptions_scope      | lane B caller PASS-bounded               | PASS |             | PASS-bounded
| pair         | exceptions_scope      | lane B terminal WITNESS                  | PASS |             | WITNESS
| pair         | exceptions_scope      | lane B loopCatch PASS-bounded            | PASS |             | PASS-bounded
| pair         | exceptions_scope      | lane B callbackCatch PASS-bounded        | PASS |             | PASS-bounded
| pair         | exceptions_scope      | lane B shadowCatch PASS-bounded          | PASS |             | PASS-bounded
| pair         | exceptions_scope      | lane B cleanupLoop WITNESS               | PASS |             | WITNESS
| pair         | exceptions_scope      | lane B ordinary PASS-bounded             | PASS |             | PASS-bounded
| pair         | exceptions_scope      | lane B lazy WITNESS                      | PASS |             | WITNESS
| pair         | exceptions_scope      | lane B lazyLeaf PASS-bounded             | PASS |             | PASS-bounded
| pair         | exceptions_scope      | lane B switchFallback PASS-bounded       | PASS |             | PASS-bounded
| escape       | exceptions_binding    | lint refuses                             | PASS | no          | refused: exception-binding
| escape       | exceptions_binding    | translate refuses                        | PASS |             | refused
| escape       | exceptions_callback   | lint refuses                             | PASS | no          | refused: exception-callback
| escape       | exceptions_callback   | translate refuses                        | PASS |             | refused
| escape       | exceptions_return     | lint refuses                             | PASS | no          | refused: exception-return
| escape       | exceptions_return     | translate refuses                        | PASS |             | refused
| TOTAL | 368 checks | ALL PASS |
```

## File deltas

The revision follows `0a6ac74f2d40e339bce929968d13d42a222009d6`.
Shared `dev` is now `03e3f8d3b50f34e92918f7f9ec7d477881fc22a8`; it advanced independently.
The requested dev comparison includes other lanes as apparent removals; they are not this revision.
These snapshots precede this appendix. No other checkout or branch was changed.

Own revision, `git diff --cached --stat`:

```text
 fixtures/escapes/ts/exceptions_across.ts           |   5 -
 fixtures/escapes/ts/exceptions_binding.ts          |   2 +-
 fixtures/escapes/ts/exceptions_callback.ts         |   3 +-
 fixtures/escapes/ts/exceptions_expression.ts       |   3 -
 langs/ts/CONCEPT-PLAN.md                           |   2 +-
 langs/ts/COVERAGE.md                               |  10 +-
 .../exceptions-across-calls-revision-validation.md | 551 +++++++++++++++++++++
 .../design/exceptions-across-calls-validation.md   |   2 +
 langs/ts/design/exceptions-across-calls.md         | 106 ++--
 langs/ts/lint/lint.mjs                             | 118 +++--
 langs/ts/subset.md                                 |  43 +-
 langs/ts/tests/pairs/exceptions_scope/candidate.ts |  42 ++
 langs/ts/tests/pairs/exceptions_scope/expect.json  |  42 ++
 langs/ts/tests/pairs/exceptions_scope/parent.ts    |  42 ++
 langs/ts/translate/translate.mjs                   |  83 +++-
 .../exceptions-revision/admission-final.json       | 182 +++++++
 results-bench/exceptions-revision/after.json       | 449 +++++++++++++++++
 results-bench/exceptions-revision/after.md         |   9 +
 18 files changed, 1542 insertions(+), 152 deletions(-)
```

Requested `git diff --stat dev`:

```text
 .gitignore                                         |   1 -
 README.md                                          |  55 +-
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
 fixtures/escapes/ts/exceptions_binding.ts          |   2 +
 fixtures/escapes/ts/exceptions_callback.ts         |   2 +
 fixtures/escapes/ts/exceptions_return.ts           |   2 +
 fixtures/escapes/ts/react_handler_capture.ts       |   9 -
 fixtures/escapes/ts/spread_conditional_update.ts   |   5 -
 fixtures/escapes/ts/spread_empty_record.ts         |   2 -
 fixtures/escapes/ts/spread_iterator.ts             |   2 -
 fixtures/escapes/ts/spread_local.ts                |   2 -
 fixtures/escapes/ts/spread_math_empty.ts           |   2 -
 fixtures/escapes/ts/spread_math_opaque.ts          |   2 -
 fixtures/escapes/ts/spread_optional.ts             |   2 -
 fixtures/escapes/ts/spread_record_alias.ts         |   2 -
 fixtures/escapes/ts/spread_record_rest.ts          |   2 -
 fixtures/escapes/ts/spread_tuple.ts                |   2 -
 fixtures/escapes/ts/super_field.ts                 |   8 -
 langs/ts/CONCEPT-PLAN.md                           |  16 +-
 langs/ts/COVERAGE.md                               |  48 +-
 langs/ts/common.mjs                                |   8 +-
 langs/ts/design/dynamic-record-reads.md            |  70 --
 langs/ts/design/effectful-callbacks.md             |  76 ---
 .../exceptions-across-calls-revision-validation.md | 551 ++++++++++++++++
 .../design/exceptions-across-calls-validation.md   | 466 ++++++++++++++
 langs/ts/design/exceptions-across-calls.md         |  76 +++
 langs/ts/design/heap-layer-census.json             | 271 --------
 langs/ts/design/heap-layer-census.mjs              | 161 -----
 langs/ts/design/heap-layer-toy.dfy                 |  87 ---
 langs/ts/design/heap-layer-toy.mjs                 |  62 --
 langs/ts/design/heap-layer.md                      | 200 ------
 langs/ts/design/react-handlers-memo.md             |  73 ---
 langs/ts/design/spread-outside-callees.md          |  76 ---
 langs/ts/exec/run.mjs                              |  52 +-
 langs/ts/lint/lint.mjs                             | 368 +++++------
 langs/ts/react.mjs                                 |  95 ---
 langs/ts/subset.md                                 |  78 +--
 langs/ts/tests/pairs/class_new/candidate.ts        |  59 --
 langs/ts/tests/pairs/class_new/expect.json         |  33 -
 langs/ts/tests/pairs/class_new/parent.ts           |  58 --
 langs/ts/tests/pairs/class_super/base.ts           |   6 -
 langs/ts/tests/pairs/class_super/candidate.ts      |  22 -
 langs/ts/tests/pairs/class_super/expect.json       |  20 -
 langs/ts/tests/pairs/class_super/parent.ts         |  22 -
 langs/ts/tests/pairs/counter/expect.json           |  22 +-
 langs/ts/tests/pairs/dynamic_reads/base.ts         |   2 -
 langs/ts/tests/pairs/dynamic_reads/candidate.ts    |  22 -
 langs/ts/tests/pairs/dynamic_reads/expect.json     |  63 --
 langs/ts/tests/pairs/dynamic_reads/parent.ts       |  28 -
 .../tests/pairs/effectful_callbacks/candidate.ts   |  53 --
 .../ts/tests/pairs/effectful_callbacks/expect.json |  51 --
 langs/ts/tests/pairs/effectful_callbacks/parent.ts |  52 --
 .../ts/tests/pairs/exceptions_across/candidate.ts  |  61 ++
 langs/ts/tests/pairs/exceptions_across/expect.json |  60 ++
 langs/ts/tests/pairs/exceptions_across/parent.ts   |  62 ++
 langs/ts/tests/pairs/exceptions_across/ports.ts    |   1 +
 langs/ts/tests/pairs/exceptions_scope/candidate.ts |  42 ++
 langs/ts/tests/pairs/exceptions_scope/expect.json  |  42 ++
 langs/ts/tests/pairs/exceptions_scope/parent.ts    |  42 ++
 langs/ts/tests/pairs/for_each/expect.json          |   6 +-
 langs/ts/tests/pairs/function_values/expect.json   |   6 +-
 langs/ts/tests/pairs/jsx_handlers/candidate.tsx    |  72 ---
 langs/ts/tests/pairs/jsx_handlers/expect.json      |  60 --
 langs/ts/tests/pairs/jsx_handlers/parent.tsx       |  70 --
 langs/ts/tests/pairs/jsx_handlers/types.d.ts       |  16 -
 langs/ts/tests/pairs/logic_values/expect.json      |  28 +-
 langs/ts/tests/pairs/promise_forms/expect.json     |  25 +-
 langs/ts/tests/pairs/service/expect.json           |   6 +-
 langs/ts/tests/pairs/spread_outside/api.d.ts       |   5 -
 langs/ts/tests/pairs/spread_outside/candidate.ts   |  84 ---
 langs/ts/tests/pairs/spread_outside/expect.json    |  78 ---
 langs/ts/tests/pairs/spread_outside/parent.ts      |  83 ---
 langs/ts/tests/pairs/try_catch/expect.json         |   6 +-
 langs/ts/translate/translate.mjs                   | 702 ++++++++-------------
 .../exceptions-revision/admission-final.json       | 182 ++++++
 results-bench/exceptions-revision/after.json       | 449 +++++++++++++
 results-bench/exceptions-revision/after.md         |   9 +
 results-bench/exceptions/after.json                | 366 +++++++++++
 results-bench/exceptions/after.md                  |   9 +
 results-bench/exceptions/before.json               | 407 ++++++++++++
 results-bench/exceptions/before.md                 |   9 +
 90 files changed, 3341 insertions(+), 3136 deletions(-)
```
