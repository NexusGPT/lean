# Assertion-derived type tests: revised benchmark

Original harness run in place, with the stable crc32 sample and parent-file mutant names. Baseline is unchanged starting dev `5ebf1d8065a7f8455c95bac180a4149861e61617`, exported inside this worktree. Before/after sample identities match for all 40 units.

```sh
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean-lanes/instanceof-exact/results-bench/revision-work/baseline --concepts 'instanceof|typeof|in|Array.isArray' --k 10 --jobs 1 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/instanceof-exact/results-bench/type-tests-revision-before
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean-lanes/instanceof-exact --concepts 'instanceof|typeof|in|Array.isArray' --k 10 --jobs 2 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/instanceof-exact/results-bench/type-tests-revision-after
```

Counts: lint / translated / units with at least one witnessed mutant, each out of 10. The last column is the native harness mutant count.

| domain | baseline /10 | revision /10 | mutants witnessed |
|---|---|---|---|
| instanceof | 6 / 6 / 6 | 6 / 6 / 6 | 11/17 → 11/17 |
| typeof | 6 / 6 / 5 | 6 / 6 / 5 | 11/18 → 11/18 |
| in | 5 / 5 / 3 | 5 / 5 / 3 | 5/12 → 5/12 |
| Array.isArray | 6 / 6 / 3 | 6 / 6 / 3 | 6/13 → 6/13 |

Compared with the preceding lane commit, instanceof recovers from 5/5/5 to 6/6/6. createUser is admitted again: the `ClerkUser[]` assertion keeps its existing conversion and its array-brand test is uninterpreted. Its three planted mutants are witnessed again. Lane B implementation is unchanged.

| domain | file : unit | baseline | revision | witnessed mutants before → after |
|---|---|---|---|---|
| instanceof | extensions/nexus/src/node/agents/remove-agent.ts : removeFile | translated | translated | 1 → 1 |
| instanceof | conflicts/conflict-A-ai-task-service/file-history/20260306-ANCESTOR.ts : AITaskService.bulkDeleteTasks | translator-crashed | translator-crashed | 0 → 0 |
| instanceof | packages/cli/src/ExternalSecrets/ExternalSecrets.controller.ee.ts : ExternalSecretsController.setProviderSettings | lint-out | lint-out | 0 → 0 |
| instanceof | apps/backend/src/external/daytona/daytona.service.ts : DaytonaService.onModuleInit | translated | translated | 2 → 2 |
| instanceof | tools/nexus-studio/server/src/lib/clerk.ts : createUser | translated | translated | 3 → 3 |
| instanceof | tools/proof-host/src/controls-sweep-sentence-scenarios.ts : bypassRefusedWithoutTheLaunchSettingSaysHowToTurnItOn | translated | translated | 1 → 1 |
| instanceof | packages/cli/src/commands/generate.ts : proposeAndGate | lint-out | lint-out | 0 → 0 |
| instanceof | packages/nodes-base/nodes/Google/Gmail/GenericFunctions.ts : prepareTimestamp | lint-out | lint-out | 0 → 0 |
| instanceof | packages/cli/src/util/mcp-rpc.bridge.ts : createBridgeForwarder | translated | translated | 3 → 3 |
| instanceof | adapters/claude-cli/src/sessions/background-task-output.ts : isNotThere | translated | translated | 1 → 1 |
| typeof | packages/generate/src/extract/tools.ts : typesOf | translated | translated | 1 → 1 |
| typeof | packages/cli/src/commands/select.ts : readPool | lint-out | lint-out | 0 → 0 |
| typeof | packages/editor-ui/src/utils/typeGuards.ts : isResourceLocatorValue | translated | translated | 1 → 1 |
| typeof | apps/backend/src/admin/webhook-migration/telegram/use-cases/migrate-telegram-webhook.use-case.ts : MigrateTelegramWebhookUseCase.execute | translated | translated | 3 → 3 |
| typeof | packages/artifacts/src/xml.ts : childElement | translated | translated | 3 → 3 |
| typeof | src/primitives/overlays.tsx : AnchoredSurface | lint-out | lint-out | 0 → 0 |
| typeof | infra/mock-api/src/admin.ts : claimsFromJson | translated | translated | 0 → 0 |
| typeof | apps/backend/src/system-prompts/domain/value-objects/prompt-content.ts : isChatContent | translated | translated | 3 → 3 |
| typeof | apps/frontend/src/modules/UltimateCue/features/mention-picker/extension/mention-picker-extension.ts : createMentionPickerExtension | lint-out | lint-out | 0 → 0 |
| typeof | packages/nodes-base/nodes/Google/Firebase/RealtimeDatabase/GoogleFirebaseRealtimeDatabase.node.ts : GoogleFirebaseRealtimeDatabase.execute | lint-out | lint-out | 0 → 0 |
| in | libs/langchain-classic/src/experimental/chains/violation_of_expectations/violation_of_expectations_chain.ts : ViolationOfExpectationsChain._call | lint-out | lint-out | 0 → 0 |
| in | adapters/project-records/src/json-values.ts : errorCodeOf | translated | translated | 0 → 0 |
| in | libs/providers/langchain-neo4j/src/graphs/neo4j_graph.ts : Neo4jGraph.refreshSchema | lint-out | lint-out | 0 → 0 |
| in | libs/langchain/src/agents/middleware/llmToolSelector.ts : processSelectionResponse | lint-out | lint-out | 0 → 0 |
| in | packages/connect-react/src/utils/component.ts : appPropErrors | lint-out | lint-out | 0 → 0 |
| in | packages/nodes-base/utils/binary.ts : parseText | lint-out | lint-out | 0 → 0 |
| in | packages/cli/src/config-store.ts : loadConfig | translated | translated | 3 → 3 |
| in | apps/backend/src/public/v1/domain/use-cases/deployments/deployment-whatsapp-templates.use-cases.ts : V1AttachDeploymentTemplateUseCase.execute | translated | translated | 1 → 1 |
| in | packages/types/src/shared/domain/deployment/deployment-type.config.ts : isEmbedDeploymentSettings | translated | translated | 1 → 1 |
| in | src/views/account/load.ts : accountLanguage | translated | translated | 0 → 0 |
| Array.isArray | packages/validators/src/ladders/judges/transforms.ts : reorderJson | translated | translated | 0 → 0 |
| Array.isArray | apps/frontend/src/modules/Admin/components/agent/AdminAgentVerifiedRequest.tsx : isRecord | translated | translated | 3 → 3 |
| Array.isArray | packages/types/src/shared/domain/agents/agent-prompt-conversion.utils.ts : getTabPanelDeploymentTypes | translated | translated | 2 → 2 |
| Array.isArray | apps/backend/src/broker/infrastructure/identity/verify-broker-session.jws.adapter.ts : decodeJson | translated | translated | 0 → 0 |
| Array.isArray | packages/nodes-base/nodes/UProc/UProc.node.ts : UProc.execute | lint-out | lint-out | 0 → 0 |
| Array.isArray | apps/api/src/org-config/org-config.service.ts : canonicalJson | lint-out | lint-out | 0 → 0 |
| Array.isArray | adapters/claude-cli/src/sessions/agent-process-notes-file.ts : sortedKeys | translated | translated | 0 → 0 |
| Array.isArray | packages/sdk/src/shared/index.ts : BaseClient.updateTriggerWebhooks | lint-out | lint-out | 0 → 0 |
| Array.isArray | src/hooks/useFlipScan.ts : normSkip | translated | translated | 1 → 1 |
| Array.isArray | src/ui/record-core/fields/editors.tsx : ListField | lint-out | lint-out | 0 → 0 |
