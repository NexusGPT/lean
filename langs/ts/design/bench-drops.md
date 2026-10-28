# Concept-bench drops on e0eceda: each cause, and two lane B readings that close the regressions

The concept bench on e0eceda (`results/concept-compare-e0eceda.md`) lists 42 concepts below a11fb78 or master on some
count (38 below a11fb78, 41 below master). Every row below was read instance by instance: the bench JSON keeps, per
sampled unit, its status, its lint rule and each planted mutant's lane B verdict and reason, and the sample is the same
on every run (`concept_bench.py` seeds the shuffle by the concept name), so a drop is a unit whose verdict moved.
Classes: (a) a disclosed refusal or reading change, with the note that says so; (b) a widened reading that refuses an
edge the narrower one admitted, fixed here when the owning file is this lane's; (c) a bench or count artefact.

## Reading 1: an aliased module that cannot load is the environment's module (exec/run.mjs, the loader)
Since 533c941 (design/paths-alias.md, "Lane B") the sandbox loads a project `paths` alias that resolves inside the
package for real. Many such modules cannot run their top level in the sandbox: a bundler's `import.meta.env.VITE_X`
(the loader reads `import.meta` as `({})`), `import.meta.glob`, a browser's `localStorage`, n8n's
`require.resolve`, a file TypeScript cannot emit alone ("Debug Failure. Output generation failed"). The whole run
was then ASK (`parent: load failed`), every mutant of every unit of the file missed. On e0eceda the misses read
"load failed" 80 times for a property of undefined, 54 for require.resolve, 33 for the emit failure.
The reading: when loading an aliased same-package module throws, the import is the environment's module (a recording
fake, the same on both sides), as every alias was before 533c941 and as a package is; the files its failed load
cached are dropped with it. A budget stop or a timeout still ends the run.
Soundness: lane A is untouched. Lane B treats that module as outside the unit, so a call into it is a request: a
refactor that inlines one of its helpers is a WITNESS on the request, as inlining a package function is; a module
that loads keeps the real reading. Pair `bench_drops`: `warn` WITNESS, `label` and `twice` PASS-bounded; before,
all three ASK (parent: load failed).

## Reading 2: a render's own continuations settle before its requests are read (exec/run.mjs, observe)
A component renders twice from the same slots (design of 724c7f1, render purity). Real aliased hook code (a
`useNexusApi` wrapper) starts a promise chain during the render; a step of the first render's chain ran inside the
second render, so the second trace held a request the first did not and the unit was REFUSE render-impure. Each
render now drains its pending continuations (two host `setImmediate` turns, as `observe` already does after the
call) before its trace is cut, so each render's trace holds its own work. Soundness: the two renders are drained the
same way, so a render that reads or writes something different on its second run still differs. Pair `bench_drops`:
`Badge` PASS-bounded, `Tag` WITNESS; before, both REFUSE render-impure.

## Stopped: the boundary walk in exec/gen.mjs (not this lane's file)
3324374 walks a shaped spec's boundaries over the first `WALK = 48` generated inputs; a leaf with three compared
values (0, 1, -1) takes one of them on all 48, so the declared draws that found a11fb78's witnesses come only after
input 48. In a scratch copy with `WALK = 12`, roundSignedBounded goes from P P P to W P W, easeInOut from P P W to
P W W, repeatsForFloor from W W P to W W W (a11fb78: W P W, P W W, W W W). gen.mjs is outside this lane: the reading
to build is a walk as long as the product of its boundary sizes, then free draws.

## Also seen, count-neutral
`translate.mjs` crashes (`selfType`, `u.cls` undefined) on a free function with a declared `this` parameter whose
body becomes an opaque block (n8n `execute(this: IExecuteFunctions)`): three bench units on e0eceda (execute and
prepareMultiPartForm reproduced on dcbc61c), outside the subset on a11fb78 too, so no count moves; the opaque block needs the parameter `this` as its receiver operand.

## The table

Counts are inside / translated / witnessed. a11fb78 and master: results/concept-bench-a11fb78.json and
results/concept-bench.json; e0eceda: results/concept-bench-e0eceda.json; dcbc61c and branch: the same command
restricted to the 42 concepts (`--concepts`), results-bench-drops/concept-bench-dcbc61c-42.json and
concept-bench-caed0da-42.json. "below" is the branch against a11fb78 or master. Class: a disclosed, b regression
(fixed here, or stopped where the file is not this lane's), c artefact.

| concept | a11fb78 | master | e0eceda | dcbc61c | branch | below | class | evidence | fix or note |
|---|---|---|---|---|---|---|---|---|---|
| < > comparison | 9/9/20 | 9/9/20 | 8/8/20 | 8/8/20 | 8/8/20 | yes | a | DebugController.recordFailedAttempt: `record.count++` on `this.attempts.get(ip)`, property-assign (Map.get result is an alias) | design/alias-result.md (Map.get not fresh); the rule name is property-assign on this path |
| === | 8/7/7 | 8/7/7 | 9/8/6 | 9/8/6 | 9/8/7 | no | b fixed | FixtureLandingSource.eventsFor: lane B ASK `parent: load failed: Debug Failure. Output generation failed` (an `@/` alias) | fixed: alias fallback (2d64d73); 1/3 again |
| ?? | 9/8/17 | 9/8/17 | 9/8/13 | 9/7/13 | 9/7/13 | yes | a | syncLogLine 3/3 to 0/3: load failed (b, fixed), then PASS-bounded: the real aliased `formatShort` swallows the swapped arguments on the drawn inputs; creativesWithSpend translate-fail: callee costsByCreative refused reference-key (`new Map` keyed by any) | design/paths-alias.md Lane B (aliases are real code); design/ordered-collections.md What stays refused (reference-key, after e0eceda) |
| Date.now | 5/4/10 | 5/4/8 | 5/4/7 | 5/4/6 | 5/4/9 | yes | b fixed; c | useExecutionHelpers: ASK load failed localStorage (fixed, 3/3); waitForNewProcess 2/3 to 1/3 on the branch run: 'one side timed out on 25 input(s)', a timeout under load (master had it at 0/3 with timeouts) | alias fallback; the timeout is a bench artefact |
| JSX fragment | 8/7/19 | 8/7/16 | 8/7/16 | 8/7/16 | 8/7/19 | no | b fixed; a | AssistantMessage: ASK load failed (import.meta.env through an alias), fixed 3/3; TestSection: ts-strict TS2739 once `@/common/icons/Icon` resolves (a) | alias fallback; TestSection: design/paths-alias.md The defect it replaces |
| JSX handler attribute | 7/7/20 | 7/7/20 | 7/7/14 | 7/6/11 | 7/6/17 | yes | b fixed; a | HealthPageContent, DeleteMacroConfirmationModal: ASK load failed (import.meta.env), then REFUSE render-impure (a first render's continuation read in the second render's trace), both fixed; RailNameField (after e0eceda): translate-fail reference-key, a Set of GroupID records | alias fallback (2d64d73), render settle (caed0da); design/ordered-collections.md What stays refused |
| Math.floor | 8/8/21 | 8/8/21 | 8/8/18 | 8/8/18 | 8/8/21 | no | b fixed | pacingRow: ASK load failed Debug Failure | fixed: alias fallback; 3/3 |
| Math.log | 9/9/26 | 9/9/26 | 9/9/24 | 9/9/24 | 9/9/27 | no | b fixed; a | formatBytes: ASK load failed (import.meta.env), fixed 3/3; clusterPoints: alias-mutation on a `find` result (a) | alias fallback; design/alias-result.md |
| Math.max | 6/6/13 | 6/6/13 | 6/6/10 | 6/6/10 | 6/6/12 | yes | a | LiveConversations.note: alias-mutation on `this.slot(c)` (named in design/alias-result.md Instances); addDecimal new, load failed then 2/3 | design/alias-result.md; alias fallback for addDecimal |
| Math.min | 7/7/16 | 7/7/16 | 6/6/16 | 7/7/19 | 7/7/19 | no | a | memoStatic: alias-mutation on a `Map.get` result | design/alias-result.md |
| Math.pow | 8/8/20 | 8/8/20 | 8/8/16 | 8/8/16 | 8/8/19 | yes | b fixed; b stopped | getScaleFromWheelEventDelta: ASK load failed (VUE_APP env), fixed 3/3; easeInOut 2/3 to 1/3: the boundary walk (gen.mjs WALK=48); WALK=12 in a scratch copy gives P W W as on a11fb78 | alias fallback; easeInOut: exec/gen.mjs, not this lane's file, stopped |
| Math.sqrt | 7/7/18 | 8/8/18 | 7/7/19 | 7/7/19 | 7/7/19 | yes | a | against master only: roseOption refused assign-target; repeatsForFloor 3/3 to 2/3 by the boundary walk (WALK=12: W W W) | subset.md assign-target row (e519e37); repeatsForFloor: exec/gen.mjs, stopped |
| Math.trunc | 7/7/12 | 7/7/12 | 7/7/10 | 7/7/11 | 7/7/11 | yes | b stopped | roundSignedBounded 2/3 to 0/3: the walk holds value on 0, 1, -1 for inputs 0 to 47; the a11fb78 witness was input 9 = 9007199254740991; WALK=12 in a scratch copy: W P W | exec/gen.mjs, not this lane's file, stopped |
| Number.isSafeInteger | 8/8/21 | 8/8/21 | 7/7/18 | 7/7/18 | 7/7/18 | yes | a | defineLadder: freeze | design/research-integration.md 4.4; subset.md freeze row |
| Object.defineProperties | 0/0/0 | 1/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | yes | a | against master only: makeParseableResponseFormat refused prototype (was translate-fail) | subset.md prototype row (e519e37) |
| Object.defineProperty | 1/0/0 | 2/0/0 | 1/0/0 | 1/0/0 | 1/0/0 | yes | a | against master only: stampRetryable refused prototype (was translate-fail) | subset.md prototype row (e519e37) |
| Object.freeze | 3/3/3 | 3/3/3 | 0/0/0 | 0/0/0 | 0/0/0 | yes | a | defineLadder, normalizeGCPCredentials, UserPermissions.member, getVariables: freeze | design/research-integration.md 4.4 (e368956); subset.md freeze row |
| Object.getOwnPropertyDescriptor | 0/0/0 | 4/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | yes | a | against master only: four units refused prototype (were translate-fail) | subset.md prototype row (e519e37) |
| Object.isFrozen | 1/1/0 | 1/1/0 | 0/0/0 | 0/0/0 | 0/0/0 | yes | a | normalizeGCPCredentials: freeze | design/research-integration.md 4.4 |
| assigns a field of this | 8/7/20 | 8/7/20 | 8/7/17 | 9/8/20 | 9/8/23 | no | b fixed | LdapService.scheduleSync: ASK `load failed: require.resolve is not a function` | fixed: alias fallback; 3/3 |
| comma operator | 2/2/3 | 2/2/3 | 3/3/0 | 2/2/0 | 2/2/3 | no | b fixed | BaseSelect.toSelect: ASK load failed require.resolve, fixed 3/3; vendorError newly inside, 0/3 | alias fallback |
| destructured parameter | 4/4/6 | 4/4/6 | 5/5/4 | 5/5/4 | 5/5/7 | no | b fixed | HealthyView, ToolCredentialsAPIModal: ASK load failed (import.meta.env), then render-impure for ToolCredentialsAPIModal | alias fallback and render settle |
| global Blob | 7/7/3 | 7/7/3 | 7/7/2 | 7/7/2 | 7/7/2 | yes | a | useResultExport 1/3 to 0/3: load failed (fixed), then PASS-bounded: the a11fb78 witness was the argument of the fake `@/common/utils/error-handler.useErrorHandler`, now real code | design/paths-alias.md Lane B |
| global File | 2/2/6 | 2/2/6 | 2/2/3 | 2/2/3 | 2/2/6 | no | b fixed | processFilesForUpload: ASK load failed (import.meta.env) | fixed: alias fallback; 3/3 |
| global FormData | 4/4/4 | 4/4/4 | 4/4/3 | 4/4/3 | 4/4/4 | no | b fixed | useCreateCodeInterpreterSkill: ASK load failed (import.meta.env) | fixed: alias fallback; 1/1 |
| global Response | 3/3/8 | 3/3/8 | 6/6/6 | 6/6/6 | 6/6/9 | no | b fixed; a | mountMetricsEndpoint: load failed require.resolve (b, fixed 3/3); POST (diagnostics) 2/3 to 0/3: the real aliased isUuid and isLandingKey stop every drawn body at the first return | design/paths-alias.md Lane B |
| global clearInterval | 4/4/10 | 4/4/10 | 4/4/3 | 4/4/3 | 4/4/10 | no | b fixed | WorkflowHistoryManager.init, MultiMainSetup.shutdown, LdapService.stopSync: ASK load failed require.resolve | fixed: alias fallback; 3/3, 3/3, 1/1 |
| global crypto | 8/8/19 | 8/8/18 | 8/8/17 | 8/8/17 | 8/8/17 | yes | b stopped | verifyEmbedIdentityHmac 3/3 to 1/3: four truthiness-tested fields walked with their falsy values reach createHmac on few of the 60 inputs (WALK=12 alone does not restore it) | exec/gen.mjs input walk, not this lane's file, stopped |
| global global | 5/5/12 | 5/5/12 | 5/5/7 | 5/5/7 | 5/5/12 | no | b fixed | ProjectController.getPersonalProject, User.hasGlobalScope: ASK load failed require.resolve | fixed: alias fallback |
| global history | 5/4/9 | 5/4/9 | 6/5/6 | 6/5/6 | 6/5/9 | no | b fixed | ConfigHistoryModal: ASK load failed then render-impure | fixed: alias fallback and render settle |
| global setInterval | 3/3/9 | 3/3/7 | 3/3/6 | 3/3/6 | 3/3/9 | no | b fixed | WorkflowHistoryManager.init: ASK load failed require.resolve | fixed: alias fallback |
| global structuredClone | 5/5/5 | 5/5/5 | 4/4/0 | 4/4/0 | 4/4/2 | yes | a | credential-tamper POST: alias-mutation on a `find` result; FixtureLandingSource.eventsFor and getRequest: load failed Debug Failure (b, fixed) | design/alias-result.md; alias fallback |
| mutates a local object | 2/1/3 | 2/1/3 | 1/1/0 | 1/1/0 | 1/1/3 | yes | a | Neo4jGraph.addGraphDocuments: alias-mutation on a for-of element (was translate-fail, so inside 2 to 1); IconPreview load failed (b, fixed 3/3) | design/alias-result.md (for-of element); alias fallback |
| mutates a parameter | 5/4/9 | 5/4/9 | 5/3/6 | 5/3/6 | 5/3/6 | yes | a | readHead: alias-mutation on a `Map.get` result | design/alias-result.md |
| new Date | 9/8/15 | 9/8/15 | 9/8/13 | 9/8/13 | 9/8/13 | yes | a | POST (diagnostics) 2/3 to 0/3: real aliased validators | design/paths-alias.md Lane B |
| super | 7/4/8 | 7/4/8 | 9/5/6 | 9/5/6 | 9/5/8 | no | b fixed | RedisServicePubSubPublisher.init: ASK load failed require.resolve | fixed: alias fallback; 2/2 |
| template string | 6/6/15 | 6/6/15 | 6/6/12 | 6/6/12 | 6/6/15 | no | b fixed; a | VoiceAudioStorageAdapter.finalizeAssistantTurn: alias-mutation on a `Map.get` result; Reset.getProject load failed (b, fixed 3/3) | design/alias-result.md; alias fallback |
| throw | 7/6/15 | 7/6/15 | 7/6/13 | 7/6/13 | 7/6/15 | no | b fixed | UserManagementMailer.verifyConnection: ASK load failed require.resolve | fixed: alias fallback; 2/2 |
| type predicate | 8/8/18 | 8/8/18 | 8/8/17 | 8/7/14 | 8/7/14 | yes | b fixed; a | createExpressionTelemetryPayload: load failed (VUE_APP env, fixed), then translate-fail: callee exposeErrorProperties refused prototype (acc[key] = ... with a key that may be __proto__); deadlines 3/3 to 0/3 after e0eceda: the a11fb78 witness was the source hash of the filter callback passed to a fake, and a fake now runs the callback over its elements | subset.md prototype row; design/fake-throw.md |
| unary + coercion | 4/4/6 | 4/4/6 | 3/3/6 | 2/2/6 | 2/2/6 | yes | a | defaultFailedAttemptHandler: alias-mutation on the same-file call coerceError(error); convertNETDates (after e0eceda): prototype, a dictionary write whose key may be __proto__ | design/alias-result.md; subset.md prototype row |
| void | 4/4/6 | 4/4/6 | 4/4/3 | 4/4/3 | 4/4/6 | no | b fixed | InternalHooks.onWorkflowDeleted: ASK load failed require.resolve | fixed: alias fallback; 3/3 |
| x! | 4/4/8 | 4/4/8 | 5/5/5 | 6/6/7 | 6/6/13 | no | b fixed | budgetTile, performanceTable: ASK load failed Debug Failure | fixed: alias fallback; 3/3, 3/3 |
