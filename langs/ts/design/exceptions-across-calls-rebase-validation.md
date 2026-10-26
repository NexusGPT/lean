# Exceptions across calls: rebase validation

Rebased `lane/exceptions-across-calls` onto local `dev` at
`80728f877130272f1eb81db0ae9aba7edd7f539b`. No fetch or push.
The replayed reading commits are `6e0eaf3` and `18874ee`.

## Conflict resolutions

- Imports retain both exception helpers and React hook helpers.
- Exact try retains the scoped opaque fallback; effectful callback loop detection remains available.
- Fault helpers retain concrete World outcomes; effect detection retains instance-world fields.
- Outside method lookup precedes argument evaluation, including `callSequence` for spreads.
  Spread calls retain separate `call_args` / `call_seq` prefixes, and useEffect keeps its opaque handler case.
- The callback region retains callbackShadows, callbackStep, callbackLoop and callbackValue,
  alongside opaqueCompletion. Callback-control checks defer only when an enclosing opaque try owns completion.
- The fixed-point effectful-unit loop retains `u.isCtor`; endVal and constructor prefixes retain class initialization.

## Integration checks

The class lane now emits `Finalizer.constructor`, so the existing exception pair's scope includes
that unchanged unit. Constructor fault results use Unit, new expressions participate in the
same-file exception graph, and discarded constructor/method calls propagate their outcome.
Calls on other class instances retain the class lane's direct unit reading.
The added `exceptions_rebase` pair covers changed constructor throws, discarded construction,
method catches and discarded throwing methods.

The targeted runner translated and independently verified both sides, generated the theorem,
and checked the exact expected equality verdicts for all 135 lemmas across these 11 pair groups:

```text
exceptions_across 18 equality expectations PASS
exceptions_scope 11 equality expectations PASS
exceptions_rebase 7 equality expectations PASS
class_new 8 equality expectations PASS
class_super 4 equality expectations PASS
effectful_callbacks 14 equality expectations PASS
spread_outside 23 equality expectations PASS
jsx_handlers 17 equality expectations PASS
strings 11 equality expectations PASS
dynamic_reads 18 equality expectations PASS
try_catch 4 equality expectations PASS
```

The new integration pair's lane B runs used `--n 30 --no-project`:

```text
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_rebase/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_rebase/candidate.ts --unit Guard.constructor --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-rebase/b_Guard.constructor.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-rebase/b_Guard.constructor.json

$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_rebase/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_rebase/candidate.ts --unit Guard.read --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-rebase/b_Guard.read.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-rebase/b_Guard.read.json

$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_rebase/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_rebase/candidate.ts --unit build --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-rebase/b_build.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-rebase/b_build.json

$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_rebase/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_rebase/candidate.ts --unit ignoredNew --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-rebase/b_ignoredNew.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-rebase/b_ignoredNew.json

$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_rebase/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_rebase/candidate.ts --unit methodCall --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-rebase/b_methodCall.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-rebase/b_methodCall.json

$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_rebase/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_rebase/candidate.ts --unit ignoredMethod --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-rebase/b_ignoredMethod.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-rebase/b_ignoredMethod.json

$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_rebase/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_rebase/candidate.ts --unit untouched --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-rebase/b_untouched.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-rebase/b_untouched.json

```

## Bench

The same shared harness and stable 30-unit sample were used:

```sh
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls --concepts 'throw|try/catch|try/finally only' --k 10 --jobs 2 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-rebase/after
```

Lint / translate / witnessed units, each out of ten. All 30 sampled identities match.

| Concept | Baseline | Accepted before rebase | Rebased |
|---|---|---|---|
| throw | 7 / 6 / 6 | 7 / 6 / 6 | 7 / 6 / 6 |
| try/catch | 3 / 3 / 3 | 3 / 3 / 3 | 3 / 3 / 3 |
| try/finally only | 7 / 4 / 2 | 7 / 7 / 4 | 6 / 6 / 3 |

Measured output:

```text
3 concepts, 30 instances
exported /Users/assem/Documents/GitHub/nexus
exported /Users/assem/Documents/GitHub/n8n
exported /Users/assem/Documents/GitHub/driftbench
throw | UserManagementMailer.verifyConnection | translated  2/2
throw | getCohereClient | translated  3/3
throw | assertWebVoiceOriginAllowed | translated  1/3
throw | SendSlackHumanInputUseCase.execute | translated  3/3
throw | humanApproval | lint-out ts-strict /
throw | convertMessageContentToBlockParams | translated  3/3
throw | Expression.renderExpression | lint-out foreach /
throw | extractValueOther | lint-out prototype /
throw | fetchCorpus | translate-fail  /
throw | GetPermissionsQuery.execute | translated  3/3
try/catch | EchoExportCleanupService.cleanupHandler | lint-out global-read /
try/catch | readText | translated  2/2
try/catch | HttpClient.send | lint-out loop-form /
try/catch | deepLApiRequest | lint-out this /
try/catch | killNotificationListener.onSkillProgress | translated  3/3
try/catch | RunnableWithFallbacks._streamIterator | lint-out generator /
try/catch | InternalHooks.onWorkflowCrashed | lint-out dynamic-key /
try/catch | allbackManagerForChainRun.handleChainEnd | lint-out prototype /
try/catch | registerAuthSwitchCommand | lint-out property-assign /
try/finally only | tabWithMode | translated  1/3
try/finally only | BurstDrain.run | translated  0/0
try/finally only | anUninstallThatCannotRemoveTheToolSaysSo | translated  2/3
try/finally only | VoiceReplyService.buildVoiceContent | lint-out async /
try/finally only | AddWordTemplateContent | lint-out react-handler-capture /
try/catch | JsonParseNode.preCompute | translated  3/3
try/finally only | readTextChunks | lint-out generator /
try/finally only | readTarget | translated  0/2
try/finally only | installWinFspMsi | lint-out dynamic-key /
try/finally only | FolderSandbox.readFile | translated  1/3
try/finally only | main | translated  0/3
wrote /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions-rebase/after.md
```


The accepted pre-rebase branch admitted AddWordTemplateContent. Dev's React reading now rejects
that unit as `react-handler-capture`: a React closure captures a changing local. The reactCapture
function is byte-for-byte identical to dev at 80728f8, verified with git show and a string comparison.
That upstream refusal is preserved. Its file is
`apps/frontend/src/modules/DocumentTemplates/AddWordTemplateContent.tsx` in the nexus export.

## Whole suite

Run once after the final bench and targeted checks:

```sh
cd /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls && node langs/ts/tests/run.mjs
```

```text
| TOTAL | 633 checks | ALL PASS |
```

Full output: `results-bench/exceptions-rebase/suite.log` in this worktree.
All original 17 exception-pair verdicts remain; the class reading adds an unchanged constructor.

## Branch scope and file deltas

The requested base remains 80728f8. While validation ran, local dev advanced to 2abf3a0
(the exact type-tests merge). That later merge is not part of this rebase. The following
measured diff is against the requested base; it therefore contains only this lane's work.


```text
 fixtures/escapes/ts/exceptions_binding.ts          |   2 +
 fixtures/escapes/ts/exceptions_callback.ts         |   2 +
 fixtures/escapes/ts/exceptions_return.ts           |   2 +
 langs/ts/CONCEPT-PLAN.md                           |   2 +-
 langs/ts/COVERAGE.md                               |  12 +-
 .../exceptions-across-calls-rebase-validation.md   | 141 +++++
 .../exceptions-across-calls-revision-validation.md | 680 +++++++++++++++++++++
 .../design/exceptions-across-calls-validation.md   | 466 ++++++++++++++
 langs/ts/design/exceptions-across-calls.md         |  77 +++
 langs/ts/lint/lint.mjs                             | 116 +++-
 langs/ts/subset.md                                 |  36 +-
 .../ts/tests/pairs/exceptions_across/candidate.ts  |  61 ++
 langs/ts/tests/pairs/exceptions_across/expect.json |  62 ++
 langs/ts/tests/pairs/exceptions_across/parent.ts   |  62 ++
 langs/ts/tests/pairs/exceptions_across/ports.ts    |   1 +
 .../ts/tests/pairs/exceptions_rebase/candidate.ts  |   9 +
 langs/ts/tests/pairs/exceptions_rebase/expect.json |  30 +
 langs/ts/tests/pairs/exceptions_rebase/parent.ts   |   9 +
 langs/ts/tests/pairs/exceptions_scope/candidate.ts |  42 ++
 langs/ts/tests/pairs/exceptions_scope/expect.json  |  42 ++
 langs/ts/tests/pairs/exceptions_scope/parent.ts    |  42 ++
 langs/ts/translate/translate.mjs                   | 223 ++++++-
 .../exceptions-revision/admission-final.json       | 182 ++++++
 results-bench/exceptions-revision/after.json       | 449 ++++++++++++++
 results-bench/exceptions-revision/after.md         |   9 +
 results-bench/exceptions/after.json                | 366 +++++++++++
 results-bench/exceptions/after.md                  |   9 +
 results-bench/exceptions/before.json               | 407 ++++++++++++
 results-bench/exceptions/before.md                 |   9 +
 29 files changed, 3503 insertions(+), 47 deletions(-)
```
