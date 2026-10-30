# A7a-types-depth-recursion: result

Branch `lane/A7a-types-depth-recursion` from lean master 5f96f554. Commits: 5421f537 (red pair), 3f81dec3 (the
reading), 2bfc2c99 (design note, subset.md, inventory), and this result.

## What was done and why

Forms 1 and 3 of the types inventory are one mechanism. `dtype` refused any type whose descent passed depth 8; that
bound stood in for a cycle guard and was no part of any type's meaning. It is replaced by a guard on the descent path
(translate.mjs `dtype`, `descent`, `Recurs`, `recursOpaque`):
- every type is read as it is, at any depth (form 1);
- a record reserves its datatype name before its fields (as before) and marks its frame `reserves`: meeting it again
  reads the name, so a loop through a record is a recursive datatype;
- a type met again on its own path with no reserving record between is opaque (`Any`), and so is every type on that
  loop (a callable returning a tuple holding itself, a dictionary of itself, a union through an array of itself);
- an instance of a generic met inside one of its own instances whose argument holds the outer's argument as a proper
  part (`Nest<T>` holding `Nest<T[]>`) is opaque at the outer instance; finite nesting of one generic is read as it is;
- the frame of the type that recurs catches the unwinding and reads `Any`; a record frame removes its unfinished
  reservation, a sum restores its saved state; `recursOpaque` keeps the decision for the whole file;
- `isAny` holds of a type in `recursOpaque`: a value of a type read opaque is read only through the readers of `any`
  (uninterpreted accessors, index, call, `in`). This is the invariant "a value only a type it has": without it the
  tuple, dictionary and record readers chose their reading from the TypeScript shape and wrote `.1` or `c in t` on a
  Dafny `Any` (13 resolution errors on the pair, found and fixed at its mechanism). The tuple reader tested its shape
  before `isAny` and now tests `isAny` first.
- `absenceSchema` loses its own depth bound (its `seen` set already ends a recursive type), since deep types now reach it.

Soundness is stated in `langs/ts/design/types-depth.md` (linked from types-inventory.md, dated section "Forms 1 and 3
read") and in subset.md (Records row; a new row under "What is uninterpreted").

## Elements added

- translate.mjs: `descent` (the path), `Recurs` (the unwinding to the frame of the type that recurs), `recursOpaque`
  (the decision, read by `dtype` and `isAny`), `genericOf`/`genericArgs`/`holds`/`grownFrom` (the grown-instance test),
  `dtypeOf` (the former body of `dtype`; `dtype` is now the guard around it). The `depth` parameter is gone from `dtype`,
  `unionType`, `sumType`, `recordType` and `absenceSchema`.
- Pair `langs/ts/tests/pairs/types_depth`: `deepLeaf`/`deepChanged` (a parameter ten records deep: proved; a changed
  leaf: not proved, lane B WITNESS), `shapeOf`/`shapeChanged` (n8n's `JsonValue`: proved; a nested case changed:
  WITNESS), `hasChild`/`hasGrandchild` (a dictionary of itself: proved; WITNESS), `second`/`secondChanged`
  (`Stream<T> = () => [T, Stream<T>]`, recurring through a generic callable: proved; WITNESS).
- design/types-depth.md; subset.md two rows; types-inventory.md a dated section.

## The pair

Red at 5421f537 on base code: `| pair | types_depth | theorem generated | FAIL | ... the translator produced no file
for this side` (the depth bound refuses the file), TOTAL 1 checks 1 FAILED. Lane B on base gave the expected verdict on
all 8 units (run one by one with `node langs/ts/exec/run.mjs ... --n 30 --no-project`).
Green at 3f81dec3: `JOBS=4 node langs/ts/tests/run.mjs --pair types_depth`: 17 checks, ALL PASS.

One change to the pair after the expectations were written, not to any expectation: the stream units first read
`s()[1]()[0]`, which the lint refuses as a call through a computed callee (`unsupported-call`, another rule). They now
call through a name (`const rest = s()[1]; return rest()[0];`); the `why` says so. The row expectations are unchanged.

## Regression pairs (all on 3f81dec3, `JOBS=4 node langs/ts/tests/run.mjs --pair <p>`, each ALL PASS)

63 pairs whose names contain type, union, record, heap or callback, with their check totals:
array_callback_cells 9, asany_record_key 8, blocker_optional_callback 13, blocker_unresolved_type 9, branch_types 14,
callback_behaviour 14, callback_behaviour_tree 2, callback_patterns 11, callbacks 5, callback_units 9,
cheap_rungs_alias 1, cheap_rungs_capture 1, cheap_rungs_congruence 2, cheap_rungs_error 1, cheap_rungs_normalised 2,
cheap_rungs_parsed 2, effectful_callbacks 29, empty_collection_type 9, exception_callback 35, heap_3 23,
heap_3_refused 1, heap5_absences 7, heap5_arith 13, heap5_arrays 13, heap5_cells 11, heap5_conditional 9,
heap5_ctors 14, heap5_decorators 9, heap5_globals 13, heap5_handles 12, heap5_literals 11, heap5_module 9,
heap5_outside 9, heap5_reach 7, heap5_regex 9, heap5_rest 7, heap5_step0 7, heap5_strings 11, heap5_template 11,
heap5_tuples 11, heap5_unions 9, heap5_void 9, heap_canonical 13, heap_dicts 11, heap_enumerated 9, heap_graph 9,
heap_index 13, heap_loops 9, heap_methods 10, heap_nullable 5, heap_optional 11, heap_shapes 36, heap_strings_calls 9,
heap_unions 9, in_prototype 9, named_callbacks 17, open_datatype 25, record_ops 9, record_rest_any 11,
throwing_callbacks 11, type_assertions 45, types_depth 17, type_tests 59.

Conformance: `python3 -I conformance/run.py` exit 0, "conformance: PASS, 341 of 341 checks passed, languages: py, ts, dfy".

## Census (copies under /root/da/census/repos/, used as they are)

Commands. Before: base 5f96f554 exported with `git archive 5f96f554c langs spec core conformance` into a folder
`base/`; after: commit 3f81dec3 exported the same way into `after/`. For each:
`NODE_OPTIONS=--max-old-space-size=12288 node <copy>/langs/ts/census.mjs /root/da/census/repos/n8n --out <w>-n8n.json`,
the same for langchainjs, and for nexus `... /root/da/census/repos/nexus --include apps/backend/src/agents --out
<w>-nexus-agents.json` (the whole nexus did not finish in two hours for the inventory; this prefix holds its zod
TipTap recursion and two unlocated nesting sites). Forms: `node langs/ts/design/types-inventory.mjs <w>-<root>.json
--out inv-<w>-<root>.json`. Moves: a script that applies the census's attribution per unit to both runs.

| Root | Units | Entered before / after | `types`-stopped before / after | Form 1 + 3 (+ unlocated nesting) before / after |
| --- | ---: | ---: | ---: | ---: |
| n8n | 9,610 | 2,419 / 2,666 | 434 / 64 | 372 (318 finite, 49 "recursive", 5 unlocated) / 0 |
| langchainjs | 6,709 | 2,647 / 2,659 | 270 / 242 | 30 (29 finite, 1 recursive) / 0 |
| nexus apps/backend/src/agents | 417 | 153 / 165 | 16 / 2 | 14 (3 finite own, 3 finite zod, 4 recursive zod, 4 unlocated) / 0 |

Where the 416 nesting-stopped units went: n8n 288 entered, 58 `read-after-call`, 22 `copied-argument`, 2 `mutation`,
1 `types` (union `string | number | symbol`, form 5), 1 `types` (`type parameter WorkflowHooks`, form 4); langchainjs
14 entered, 11 `read-after-call`, 3 `copied-argument`, 2 `types` (a union of intersections `JsonSchema7StringType &
JsonSchema7Meta | ...` not translatable); nexus agents 12 entered, 2 `copied-argument`. The `types` rows left on each
root are forms 2, 4 and 5 (n8n `this` 31 to 32 and symbol unions 4 to 5, langchainjs symbol unions 35 to 37: units the
nesting refusal stopped first).

### Units that moved from `types` to another refusal, by their new rule

#### n8n

- `read-after-call` (58):
  - packages/cli/src/ExternalSecrets/ExternalSecrets.controller.ee.ts:ExternalSecretsController.getProvider
  - packages/cli/src/InternalHooks.ts:InternalHooks.onWorkflowCreated
  - packages/cli/src/InternalHooks.ts:InternalHooks.onWorkflowSaved
  - packages/cli/src/WorkflowExecuteAdditionalData.ts:getRunData
  - packages/cli/src/WorkflowHelpers.ts:getExecutionStartNode
  - packages/cli/src/WorkflowRunner.ts:WorkflowRunner.run/postExecutePromise
				.then()#0
  - packages/cli/src/controllers/nodeTypes.controller.ts:NodeTypesController.getNodeInfo/nodeInfos.reduce()#0
  - packages/cli/src/executionLifecycleHooks/shared/sharedHookFunctions.ts:prepareExecutionDataForDbUpdate
  - packages/cli/src/workflows/workflowExecution.service.ts:WorkflowExecutionService.executeManually
  - packages/cli/src/workflows/workflowExecution.service.ts:WorkflowExecutionService.selectPinnedActivatorStarter
  - packages/core/src/NodeExecuteFunctions.ts:getCredentials
  - packages/editor-ui/src/utils/credentialOnlyNodes.ts:getCredentialOnlyNodeType
  - packages/editor-ui/src/utils/mappingUtils.ts:getMappedResult
  - packages/editor-ui/src/utils/nodes/nodeTransforms.ts:doesNodeHaveAllCredentialsFilled
  - packages/node-dev/templates/webhook/simple.ts:ClassNameReplace.webhook
  - packages/nodes-base/credentials/SeaTableApi.credentials.ts:moment.tz
	.countries()
	.reduce()#0
  - packages/nodes-base/nodes/ActiveCampaign/ActiveCampaignTrigger.node.ts:ActiveCampaignTrigger.webhook
  - packages/nodes-base/nodes/AcuityScheduling/AcuitySchedulingTrigger.node.ts:AcuitySchedulingTrigger.webhook
  - packages/nodes-base/nodes/Autopilot/AutopilotTrigger.node.ts:AutopilotTrigger.webhook
  - packages/nodes-base/nodes/Box/BoxTrigger.node.ts:BoxTrigger.webhook
  - packages/nodes-base/nodes/Brevo/BrevoTrigger.node.ts:BrevoTrigger.webhook
  - packages/nodes-base/nodes/Cal/CalTrigger.node.ts:CalTrigger.webhook
  - packages/nodes-base/nodes/Calendly/CalendlyTrigger.node.ts:CalendlyTrigger.webhook
  - packages/nodes-base/nodes/ConvertKit/ConvertKitTrigger.node.ts:ConvertKitTrigger.webhook
  - packages/nodes-base/nodes/Copper/CopperTrigger.node.ts:CopperTrigger.webhook
  - packages/nodes-base/nodes/CrowdDev/CrowdDevTrigger.node.ts:CrowdDevTrigger.webhook
  - packages/nodes-base/nodes/CustomerIo/CustomerIoTrigger.node.ts:CustomerIoTrigger.webhook
  - packages/nodes-base/nodes/Emelia/EmeliaTrigger.node.ts:EmeliaTrigger.webhook
  - packages/nodes-base/nodes/FacebookLeadAds/methods/listSearch.ts:formList
  - packages/nodes-base/nodes/Flow/FlowTrigger.node.ts:FlowTrigger.webhook
  - packages/nodes-base/nodes/FormIo/FormIoTrigger.node.ts:FormIoTrigger.webhook
  - packages/nodes-base/nodes/Github/GithubTrigger.node.ts:GithubTrigger.webhook
  - packages/nodes-base/nodes/Gitlab/GitlabTrigger.node.ts:GitlabTrigger.webhook
  - packages/nodes-base/nodes/Google/Drive/v2/methods/listSearch.ts:driveSearch
  - packages/nodes-base/nodes/Google/Drive/v2/methods/listSearch.ts:driveSearchWithDefault
  - packages/nodes-base/nodes/Gumroad/GumroadTrigger.node.ts:GumroadTrigger.webhook
  - packages/nodes-base/nodes/HttpRequest/GenericFunctions.ts:getSecrets
  - packages/nodes-base/nodes/InvoiceNinja/InvoiceNinjaTrigger.node.ts:InvoiceNinjaTrigger.webhook
  - packages/nodes-base/nodes/KoBoToolbox/KoBoToolboxTrigger.node.ts:KoBoToolboxTrigger.webhook
  - packages/nodes-base/nodes/Lemlist/LemlistTrigger.node.ts:LemlistTrigger.webhook
  - packages/nodes-base/nodes/Linear/LinearTrigger.node.ts:LinearTrigger.webhook
  - packages/nodes-base/nodes/LoneScale/LoneScaleTrigger.node.ts:LoneScaleTrigger.webhook
  - packages/nodes-base/nodes/MailerLite/MailerLiteTrigger.node.ts:MailerLiteTrigger.webhook
  - packages/nodes-base/nodes/Mailjet/MailjetTrigger.node.ts:MailjetTrigger.webhook
  - packages/nodes-base/nodes/Mautic/MauticTrigger.node.ts:MauticTrigger.webhook
  - packages/nodes-base/nodes/N8nTrigger/N8nTrigger.node.ts:N8nTrigger.trigger
  - packages/nodes-base/nodes/Netlify/NetlifyTrigger.node.ts:NetlifyTrigger.webhook
  - packages/nodes-base/nodes/Onfleet/GenericFunctions.ts:resourceLoaders.getTimezones
  - packages/nodes-base/nodes/Postgres/v2/methods/loadOptions.ts:getColumns
  - packages/nodes-base/nodes/Postgres/v2/methods/loadOptions.ts:getColumnsMultiOptions
  - packages/nodes-base/nodes/Postmark/PostmarkTrigger.node.ts:PostmarkTrigger.webhook
  - packages/nodes-base/nodes/Pushcut/PushcutTrigger.node.ts:PushcutTrigger.webhook
  - packages/nodes-base/nodes/TheHive/TheHiveTrigger.node.ts:TheHiveTrigger.webhook
  - packages/nodes-base/nodes/Twilio/TwilioTrigger.node.ts:TwilioTrigger.webhook
  - packages/nodes-base/nodes/Webflow/WebflowTrigger.node.ts:WebflowTrigger.webhook
  - packages/nodes-base/nodes/Workable/WorkableTrigger.node.ts:WorkableTrigger.webhook
  - packages/nodes-base/nodes/Zendesk/ZendeskTrigger.node.ts:ZendeskTrigger.webhook
  - packages/workflow/src/RoutingNode.ts:RoutingNode.getParameterValue
- `copied-argument` (22):
  - packages/cli/src/ActiveWorkflowManager.ts:ActiveWorkflowManager.executeErrorWorkflow
  - packages/cli/src/InternalHooks.ts:InternalHooks.onNodeBeforeExecute
  - packages/cli/src/InternalHooks.ts:InternalHooks.onNodePostExecute
  - packages/cli/src/InternalHooks.ts:InternalHooks.onWorkflowPostExecute/nodeGraphResult.webhookNodeNames.forEach()#0
  - packages/cli/src/TestWebhooks.ts:TestWebhooks.toWorkflow
  - packages/cli/src/concurrency/concurrency-control.service.ts:ConcurrencyControlService.removeAll
  - packages/cli/src/executions/execution.service.ts:ExecutionService.createErrorExecution
  - packages/cli/src/executions/execution.service.ts:ExecutionService.findAllEnqueuedExecutions
  - packages/cli/src/services/test-webhook-registrations.service.ts:TestWebhookRegistrationsService.register
  - packages/cli/src/workflows/workflowExecution.service.ts:WorkflowExecutionService.runWorkflow
  - packages/core/src/WorkflowExecute.ts:WorkflowExecute.incomingConnectionIsEmpty
  - packages/editor-ui/src/api/nodeTypes.ts:getNodesInformation
  - packages/editor-ui/src/api/workflows.ts:getActiveExecutions
  - packages/editor-ui/src/api/workflows.ts:getWorkflow
  - packages/editor-ui/src/api/workflows.ts:getWorkflows
  - packages/editor-ui/src/utils/templates/templateActions.ts:createWorkflowFromTemplate
  - packages/editor-ui/src/views/SetupWorkflowFromTemplateView/useCredentialSetupState.ts:useCredentialSetupState/computed()#0@1
  - packages/nodes-base/nodes/HighLevel/HighLevel.node.ts:HighLevel.constructor
  - packages/nodes-base/nodes/Notion/shared/descriptions/Blocks.ts:block
  - packages/nodes-base/nodes/Notion/shared/descriptions/Blocks.ts:blocks
  - packages/nodes-base/nodes/Taiga/TaigaTrigger.node.ts:TaigaTrigger.webhook
  - packages/workflow/src/Workflow.ts:Workflow.runPoll
- `mutation` (2):
  - packages/core/src/ExecutionMetadata.ts:setWorkflowExecutionMetadata
  - packages/editor-ui/src/plugins/codemirror/completions/datatype.completions.ts:extensions/Object.entries(expressionExtensions.functions).reduce()#0
- `types (union type string | number | symbol)` (1):
  - packages/core/src/ActiveWorkflows.ts:ActiveWorkflows.isActive
- `types (type parameter WorkflowHooks)` (1):
  - packages/workflow/src/WorkflowHooks.ts:WorkflowHooks.executeHookFunctions

#### langchainjs

- `read-after-call` (11):
  - libs/providers/langchain-google-common/src/utils/gemini.ts:DefaultGeminiSafetyHandler.handleData
  - libs/providers/langchain-google-common/src/utils/gemini.ts:DefaultGeminiSafetyHandler.handleDataFinishReason
  - libs/providers/langchain-google-common/src/utils/gemini.ts:DefaultGeminiSafetyHandler.handleDataPromptFeedback
  - libs/providers/langchain-google/src/chat_models/handlers/generate_content.ts:GenerateContentApiHandler.generate/this.params.caller.callWithOptions()#1
  - libs/providers/langchain-google/src/chat_models/handlers/generate_content.ts:GenerateContentApiHandler.invocationParams
  - libs/providers/langchain-google/src/chat_models/handlers/generate_content.ts:GenerateContentApiHandler.streamResponseChunks/this.params.caller.callWithOptions()#1
  - libs/providers/langchain-google/src/converters/generate_content/messages.ts:convertMessagesToGeminiSystemInstruction
  - libs/providers/langchain-google/src/converters/generate_content/messages.ts:geminiContentBlockConverter.fromStandardAudioBlock
  - libs/providers/langchain-google/src/converters/generate_content/messages.ts:geminiContentBlockConverter.fromStandardFileBlock
  - libs/providers/langchain-google/src/converters/generate_content/messages.ts:geminiContentBlockConverter.fromStandardImageBlock
  - libs/providers/langchain-google/src/converters/generate_content/params.ts:convertFieldsToSpeechConfig
- `copied-argument` (3):
  - libs/langchain-core/src/utils/testing/openai_stream_fixtures.ts:sseResponseFromOpenAIChunks
  - libs/providers/langchain-openrouter/src/converters/messages.ts:convertOpenRouterDeltaToBaseMessageChunk
  - libs/providers/langchain-openrouter/src/converters/messages.ts:convertOpenRouterResponseToBaseMessage
- `types (union type JsonSchema7StringType & JsonSchema7Meta | JsonSchema7ArrayT)` (2):
  - libs/langchain-core/src/utils/zod-to-json-schema/Options.ts:getDefaultOptions
  - libs/langchain-core/src/utils/zod-to-json-schema/Refs.ts:getRefs/Object.entries(_options.definitions).map()#0

#### nexus-agents

- `copied-argument` (2):
  - apps/backend/src/agents/core/domain/entities/agent.entity.ts:AgentEntity.fromPrisma
  - apps/backend/src/agents/prompt/infrastructure/repositories/prisma-agent-version.repository.ts:PrismaAgentVersionRepository.restoreVersion/this.prisma.$transaction()#0

## Defects met

- The inventory's form 3 count holds finite sites: n8n `packages/cli/src/WaitingWebhooks.ts:114`, named there as a
  recursion of `JsonValue`, is a finite chain ten levels deep (IRunExecutionData > ... > ITaskSubRunMetadata >
  string), shown by a translator that printed its path. The inventory's walk descends union members `dtype` never
  reaches (`JsonValue` is opaque at its union before any descent). Recorded in types-inventory.md.
- So n8n's `JsonValue` was never refused by itself; the pair's `shapeOf` rows document that it reads opaque (green at
  base on lane B; lane A had no file at base because of the other units).
- Readers keyed on the TypeScript shape (tuple index, dictionary read) assumed that shape's Dafny type; fixed through
  `isAny` (above).
- A record's '' reservation stays in the prelude when its fields fail with an ordinary refusal outside a sum (only a
  sum restores it). This reading removes it on its own unwinding (`Recurs`); for other refusals it is unchanged and not
  traced here.
- `langs/ts/design/admission-contract.md` still lists `type nesting too deep` (translate.mjs:1084); its line numbers
  were already stale at the base, and the table was left as the dated record it is. readings.mjs keeps the message in
  the `types` entry so older census runs still classify.
- Lane B (exec/gen.mjs `depth > 8`, exec/spec.mjs) keeps its own depth bound for drawing values; it did not stop the
  pair (deepChanged is witnessed), and it was not changed.

## What is left

- The grown-generic test (`Nest<T>` holding `Nest<T[]>`) is covered by a probe (translates to `Any` at the outer
  instance), not by a pair row: the pair's rows were written before the reading and name the brief's three units.
- One order effect stays (design note, Soundness): two loops sharing a type found one at a time can leave a type on the
  second loop structural. It can lose a proof when the parent and the candidate meet types in another order; it cannot
  make one.
- Forms 2, 4, 5 and 6 (the inventory's later readings) are untouched.
