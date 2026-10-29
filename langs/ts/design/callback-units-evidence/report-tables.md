Measured snapshot: 48/48 permitted roots complete. All permitted roots complete.

| Cohort | Roots | Files | Before units | After units | Gain | Prediction | Difference | Inside before → after |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| census ts | 38 | 21873 | 50345 | 84635 | 34290 | 34290 | 0 | 40069 → 68686 |
| census js | 38 | 23735 | 19147 | 25284 | 6137 | 6137 | 0 | 2087 → 2211 |
| bugsjs ts | 10 | 1 | 0 | 0 | 0 | 0 | 0 | 0 → 0 |
| bugsjs js | 10 | 1768 | 2385 | 4154 | 1769 | 1769 | 0 | 608 → 778 |
| langchainjs | — | — | — | awaits the census memory fix | — | TS 1802 + JS 24 | unmeasured | — |
| attribution: a refusal inside a nested callback now belongs to the callback | — | — | 65 refused enclosing units | 65 admitted enclosing units | inventory gain 0 | separate attribution class | 0 unexplained admission changes | 21 still-refused units change first rule |
| attribution: shared-line independent units now own their findings | — | — | 1675 inside → refused | 2 refused → inside | inventory gain 0 | separate attribution class | 0 unexplained admission changes | 61 first-refusal changes |

Every measured inventory gain equals its prior prediction. For changed old units, no finding appeared or vanished; only its owner changed, by the rule. No old unit's admission/refusal changed except by the two accepted attribution classes. Missing old units: 0; unreadable-file records: 0; unexplained first-rule changes: 0. These are census admissions, not independent verdicts: nested callbacks retain their enclosing unit's verdict.

### Per-root gains

| Root | TS before → after (gain / prediction) | JS before → after (gain / prediction) |
|---|---|---|
| <code>"bugsjs-bower.json"</code> | 0 → 0 (0 / 0) | 167 → 406 (239 / 239) |
| <code>"bugsjs-eslint.json"</code> | 0 → 0 (0 / 0) | 1002 → 1226 (224 / 224) |
| <code>"bugsjs-express.json"</code> | 0 → 0 (0 / 0) | 42 → 153 (111 / 111) |
| <code>"bugsjs-hessian.js.json"</code> | 0 → 0 (0 / 0) | 9 → 88 (79 / 79) |
| <code>"bugsjs-hexo.json"</code> | 0 → 0 (0 / 0) | 144 → 225 (81 / 81) |
| <code>"bugsjs-karma.json"</code> | 0 → 0 (0 / 0) | 216 → 348 (132 / 132) |
| <code>"bugsjs-mongoose.json"</code> | 0 → 0 (0 / 0) | 268 → 639 (371 / 371) |
| <code>"bugsjs-node_redis.json"</code> | 0 → 0 (0 / 0) | 38 → 93 (55 / 55) |
| <code>"bugsjs-pencilblue.json"</code> | 0 → 0 (0 / 0) | 37 → 63 (26 / 26) |
| <code>"bugsjs-shields.json"</code> | 0 → 0 (0 / 0) | 462 → 913 (451 / 451) |
| <code>"census-agent-nexus.json"</code> | 2950 → 4171 (1221 / 1221) | 29 → 41 (12 / 12) |
| <code>"census-apps-starter.json"</code> | 152 → 472 (320 / 320) | 286 → 573 (287 / 287) |
| <code>"census-apps-ui.json"</code> | 1060 → 2361 (1301 / 1301) | 28 → 150 (122 / 122) |
| <code>"census-blocks.json"</code> | 266 → 516 (250 / 250) | 0 → 0 (0 / 0) |
| <code>"census-blog-studio-lambda.json"</code> | 493 → 999 (506 / 506) | 167 → 369 (202 / 202) |
| <code>"census-car-select-api.json"</code> | 29 → 82 (53 / 53) | 0 → 0 (0 / 0) |
| <code>"census-claude-chat-clean.json"</code> | 75 → 216 (141 / 141) | 0 → 0 (0 / 0) |
| <code>"census-claude-skills.json"</code> | 261 → 355 (94 / 94) | 0 → 0 (0 / 0) |
| <code>"census-cue-status-page.json"</code> | 49 → 98 (49 / 49) | 0 → 0 (0 / 0) |
| <code>"census-driftbench.json"</code> | 2568 → 5479 (2911 / 2911) | 63 → 108 (45 / 45) |
| <code>"census-ftp-server-orange.json"</code> | 70 → 108 (38 / 38) | 0 → 4 (4 / 4) |
| <code>"census-itsme-backend.json"</code> | 25 → 31 (6 / 6) | 0 → 0 (0 / 0) |
| <code>"census-langchainjs.json"</code> | awaits the census memory fix; prediction 1802 | awaits the census memory fix; prediction 24 |
| <code>"census-linear-status-page.json"</code> | 49 → 98 (49 / 49) | 0 → 0 (0 / 0) |
| <code>"census-lucca-unofficial-api.json"</code> | 29 → 40 (11 / 11) | 0 → 0 (0 / 0) |
| <code>"census-n8n.json"</code> | 5054 → 7620 (2566 / 2566) | 9 → 16 (7 / 7) |
| <code>"census-nano-banana.json"</code> | 11 → 14 (3 / 3) | 0 → 0 (0 / 0) |
| <code>"census-nexus-agent-api.json"</code> | 14 → 27 (13 / 13) | 0 → 0 (0 / 0) |
| <code>"census-nexus-app-starter.json"</code> | 723 → 1499 (776 / 776) | 243 → 492 (249 / 249) |
| <code>"census-nexus-automations.json"</code> | 97 → 235 (138 / 138) | 0 → 0 (0 / 0) |
| <code>"census-nexus-chat-embed.json"</code> | 236 → 361 (125 / 125) | 10 → 33 (23 / 23) |
| <code>"census-nexus-landing.json"</code> | 1318 → 2770 (1452 / 1452) | 70 → 231 (161 / 161) |
| <code>"census-nexus-learning-landing.json"</code> | 170 → 254 (84 / 84) | 3 → 11 (8 / 8) |
| <code>"census-nexus-learning.json"</code> | 2356 → 3760 (1404 / 1404) | 163 → 352 (189 / 189) |
| <code>"census-nexus-linkedin-dashboard.json"</code> | 1045 → 1704 (659 / 659) | 101 → 246 (145 / 145) |
| <code>"census-nexus-meeting-recorder.json"</code> | 53 → 105 (52 / 52) | 11 → 33 (22 / 22) |
| <code>"census-nexus-tokens.json"</code> | 44 → 64 (20 / 20) | 0 → 0 (0 / 0) |
| <code>"census-nexus-ui.json"</code> | 353 → 629 (276 / 276) | 26 → 86 (60 / 60) |
| <code>"census-nexus.json"</code> | 20771 → 33954 (13183 / 13183) | 1916 → 2649 (733 / 733) |
| <code>"census-nutshell.json"</code> | 6884 → 10511 (3627 / 3627) | 11 → 26 (15 / 15) |
| <code>"census-odoo-unofficial-api.json"</code> | 49 → 94 (45 / 45) | 0 → 0 (0 / 0) |
| <code>"census-orange-checkout-automation.json"</code> | 78 → 321 (243 / 243) | 1 → 5 (4 / 4) |
| <code>"census-orange-identity-card-collection.json"</code> | 22 → 32 (10 / 10) | 0 → 0 (0 / 0) |
| <code>"census-pipedream.json"</code> | 276 → 482 (206 / 206) | 15425 → 18006 (2581 / 2581) |
| <code>"census-pyka.json"</code> | 1437 → 3002 (1565 / 1565) | 560 → 1799 (1239 / 1239) |
| <code>"census-snitch.json"</code> | 803 → 1399 (596 / 596) | 12 → 31 (19 / 19) |
| <code>"census-status.json"</code> | 410 → 654 (244 / 244) | 13 → 23 (10 / 10) |
| <code>"census-theirstack-unofficial-api.json"</code> | 11 → 22 (11 / 11) | 0 → 0 (0 / 0) |
| <code>"census-workday-unofficial-api.json"</code> | 54 → 96 (42 / 42) | 0 → 0 (0 / 0) |

### New callback units by first refusal

| Rule | census TS | census JS | BugsJS TS | BugsJS JS |
|---|---:|---:|---:|---:|
| inside | 28560 | 1791 | 0 | 168 |
| alias-mutation | 167 | 6 | 0 | 2 |
| arguments | 0 | 0 | 0 | 2 |
| assign-target | 35 | 4 | 0 | 5 |
| assignment-expression | 12 | 1 | 0 | 0 |
| async | 31 | 2 | 0 | 0 |
| async-callback | 14 | 0 | 0 | 0 |
| bitwise | 1 | 0 | 0 | 0 |
| callback-form | 9 | 1 | 0 | 19 |
| callback-result | 2 | 0 | 0 | 0 |
| captured-mutable | 481 | 38 | 0 | 31 |
| closure-mutation | 216 | 9 | 0 | 0 |
| conditional-effect | 1 | 0 | 0 | 0 |
| definite-assignment | 18 | 0 | 0 | 1 |
| delete | 12 | 3 | 0 | 0 |
| dynamic-key | 222 | 77 | 0 | 17 |
| foreach | 81 | 4 | 0 | 1 |
| freeze | 1 | 0 | 0 | 0 |
| function-value | 11 | 0 | 0 | 0 |
| generator-effect | 1 | 0 | 0 | 3 |
| global-mutation | 0 | 2 | 0 | 0 |
| global-read | 77 | 39 | 0 | 95 |
| hook-order | 3 | 0 | 0 | 0 |
| implicit-this | 1 | 0 | 0 | 4 |
| in-place-mutation | 4 | 0 | 0 | 0 |
| index-assign | 99 | 25 | 0 | 35 |
| instanceof-constructor | 2 | 0 | 0 | 0 |
| key-order | 2 | 0 | 0 | 0 |
| loose-equality | 14 | 39 | 0 | 1 |
| math-empty | 9 | 0 | 0 | 0 |
| mixed-types | 31 | 0 | 0 | 0 |
| mutator-value | 0 | 0 | 0 | 1 |
| non-null-assertion | 138 | 0 | 0 | 0 |
| number-special | 6 | 0 | 0 | 0 |
| opaque-mutation | 52 | 1 | 0 | 1 |
| operator-value-context | 12 | 0 | 0 | 0 |
| optional-chain | 35 | 2 | 0 | 0 |
| param-assign | 1 | 0 | 0 | 0 |
| param-mutation | 155 | 29 | 0 | 2 |
| promise | 101 | 39 | 0 | 0 |
| promise-all-order | 14 | 0 | 0 | 0 |
| promise-executor-escape | 3 | 0 | 0 | 0 |
| promise-pending | 6 | 9 | 0 | 0 |
| property-assign | 70 | 8 | 0 | 3 |
| prototype | 150 | 1 | 0 | 5 |
| react-handler-capture | 4 | 0 | 0 | 0 |
| receiver-mutation | 0 | 0 | 0 | 2 |
| record-rest | 47 | 14 | 0 | 0 |
| reference-equality | 84 | 3 | 0 | 0 |
| spread | 154 | 44 | 0 | 0 |
| spread-source | 4 | 0 | 0 | 0 |
| string-code-unit | 42 | 1 | 0 | 0 |
| this | 380 | 19 | 0 | 25 |
| toplevel-effect | 7 | 13 | 0 | 8 |
| ts-strict | 224 | 167 | 0 | 14 |
| type-assertion | 2154 | 126 | 0 | 13 |
| unary-coercion | 1 | 1 | 0 | 2 |
| unsupported-call | 113 | 17 | 0 | 2 |
| unsupported-member | 15 | 32 | 0 | 19 |
| unsupported-syntax | 118 | 56 | 0 | 1 |
| untyped-js | 0 | 3511 | 0 | 1263 |
| update-expression | 7 | 2 | 0 | 1 |
| var | 0 | 0 | 0 | 23 |
| void | 76 | 1 | 0 | 0 |

### Every attribution move

The findings below retain exactly the same line, rule and message. Only the owner changes. Diagnostic codes are shown where present; non-TypeScript findings show their rule. Source unit names are JSON-quoted for a single-line, reversible rendering.

| Change | Root / file | Enclosing unit / range | Finding lines, codes and nested destination | Remaining refusal |
|---|---|---|---|---|
| refused → admitted | <code>"bugsjs-mongoose.json"</code><br><code>"lib/cursor/ChangeStream.js"</code> | <code>"ChangeStream._bindEvents"</code> / 36–40 | 38: TS2339 → <code>"ChangeStream._bindEvents/['close', 'change', 'end', 'error'].forEach()#0/this.driverChangeStream.on()#1"</code> | none |
| refused → admitted | <code>"bugsjs-shields.json"</code><br><code>"services/base.js"</code> | <code>"BaseService.prepareExamples"</code> / 112–157 | 144: TS2554, 148: TS2554, 150: TS2554 → <code>"BaseService.prepareExamples/this.examples.map()#0"</code> | none |
| refused → admitted | <code>"census-apps-ui.json"</code><br><code>"demo/scripts/fx-at-rest.mjs"</code> | <code>"openMenu"</code> / 132–136 | 135: TS18047, 135: TS2531, 135: TS2339 → <code>"openMenu/page.evaluate()#0"</code> | none |
| refused → admitted | <code>"census-apps-ui.json"</code><br><code>"demo/scripts/verify-scroll-fade.mjs"</code> | <code>"read"</code> / 13–24 | 16: TS2345, 19: TS2345, 22: TS18047 → <code>"read/p.evaluate()#0"</code> | none |
| refused → admitted | <code>"census-n8n.json"</code><br><code>"packages/cli/src/commands/start.ts"</code> | <code>"Start.openBrowser"</code> / 79–87 | 83: TS2339 → <code>"Start.openBrowser/open(editorUrl, { wait: true }).catch()#0"</code> | none |
| refused → admitted | <code>"census-n8n.json"</code><br><code>"packages/cli/src/commands/start.ts"</code> | <code>"Start.initOrchestration"</code> / 201–228 | 221: TS2339 → <code>"Start.initOrchestration/orchestrationService.multiMainSetup\n\t\t\t.on('leader-stepdown')#1"</code><br>225: TS2339 → <code>"Start.initOrchestration/orchestrationService.multiMainSetup\n\t\t\t.on('leader-stepdown', async () =&gt; {\n\t\t\t\tawait this.license.reinit(); // to disable renewal\n\t\t\t\tawait this.activeWorkflowManager.removeAllTriggerAndPollerBasedWorkflows();\n\t\t\t})\n\t\t\t.on('leader-takeover')#1"</code> | none |
| refused → admitted | <code>"census-n8n.json"</code><br><code>"packages/cli/src/environments/variables/variables.service.ee.ts"</code> | <code>"VariablesService.getAllCached"</code> / 18–25 | 24: TS2339 → <code>"VariablesService.getAllCached/(variables as Array&lt;Partial&lt;Variables&gt;&gt;).map()#0"</code> | none |
| refused → admitted | <code>"census-n8n.json"</code><br><code>"packages/cli/src/push/sse.push.ts"</code> | <code>"SSEPush.constructor"</code> / 17–23 | 21: TS2339 → <code>"SSEPush.constructor/this.channel.on('disconnect')#1"</code> | none |
| refused → admitted | <code>"census-n8n.json"</code><br><code>"packages/cli/src/services/redis/RedisServicePubSubSubscriber.ts"</code> | <code>"RedisServicePubSubSubscriber.init"</code> / 7–15 | 11: TS2345 → <code>"RedisServicePubSubSubscriber.init/this.redisClient?.on('message')#1/this.messageHandlers.forEach()#0"</code> | none |
| refused → admitted | <code>"census-n8n.json"</code><br><code>"packages/nodes-base/nodes/Code/JavaScriptSandbox.ts"</code> | <code>"JavaScriptSandbox.constructor"</code> / 25–50 | 49: TS2339 → <code>"JavaScriptSandbox.constructor/this.vm.on('console.log')#1"</code> | none |
| refused → admitted | <code>"census-n8n.json"</code><br><code>"packages/nodes-base/nodes/FreshworksCrm/GenericFunctions.ts"</code> | <code>"adjustAttendees"</code> / 140–154 | 141: TS7030 → <code>"adjustAttendees/attendees.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus-app-starter.json"</code><br><code>"src/ui/blocks/sidebar-07/nav-main.tsx"</code> | <code>"NavMain"</code> / 21–73 | 50: TS2559 → <code>"NavMain/items.map()#0"</code><br>59: TS2322, 60: TS2559 → <code>"NavMain/items.map()#0/item.items?.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus-app-starter.json"</code><br><code>"src/ui/components/ui/field.tsx"</code> | <code>"FieldError"</code> / 186–235 | 208: TS2339, 212: TS2322 → <code>"FieldError/useMemo()#0"</code><br>215: TS2339, 215: TS2322, 215: TS2339 → <code>"FieldError/useMemo()#0/uniqueErrors.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus-app-starter.json"</code><br><code>"src/ui/record-core/DataTable.tsx"</code> | <code>"TagsCell"</code> / 152–163 | 158: TS2322 → <code>"TagsCell/tags.slice(0, 2).map()#0"</code> | none |
| refused → admitted | <code>"census-nexus-app-starter.json"</code><br><code>"src/ui/record-core/views/gallery/GalleryView.tsx"</code> | <code>"GalleryCard"</code> / 52–148 | 137: TS2322 → <code>"GalleryCard/metaVals.map()#0/(Array.isArray(v) ? v.slice(0, 2) : [v]).map()#0"</code> | none |
| refused → admitted | <code>"census-nexus-app-starter.json"</code><br><code>"src/ui/record-core/views/gallery/GalleryView.tsx"</code> | <code>"GalleryView"</code> / 150–242 | 223: TS2322 → <code>"GalleryView/visible.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus-linkedin-dashboard.json"</code><br><code>"evals/results/0002/A-1-walkthrough.mjs"</code> | <code>"focused"</code> / 74–74 | 74: TS2345, 74: TS18047, 74: TS18047, 74: TS18047, 74: TS18047 → <code>"focused/page.evaluate()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/backend/src/admin/attribution-backfill/infrastructure/persistence/prisma/read-attribution-backfill-progress.prisma.adapter.ts"</code> | <code>"ReadAttributionBackfillProgressPrismaAdapter.execute"</code> / 22–51 | 42: TS18047, 42: TS2339, 43: TS18047, 43: TS2339, 44: TS18047, 44: TS2339, 45: TS18047, 45: TS2339, 46: TS18047, 46: TS2339, 47: TS18047, 47: TS2339, 48: TS18047, 48: TS2339 → <code>"ReadAttributionBackfillProgressPrismaAdapter.execute/ATTRIBUTION_BACKFILL_ORDER.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/backend/src/admin/clerk-sync.service.ts"</code> | <code>"ClerkSyncService.getUserSyncStatus"</code> / 346–419 | 377: TS2339, 396: TS2339 → <code>"ClerkSyncService.getUserSyncStatus/clerkUsers.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/backend/src/agents/tools/infrastructure/repositories/prisma-agent-tool.repository.ts"</code> | <code>"PrismaAgentToolRepository.getTaskUsageDetails"</code> / 415–475 | 472: TS2698 → <code>"PrismaAgentToolRepository.getTaskUsageDetails/uniqueAgents.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/backend/src/agents/tools/infrastructure/repositories/prisma-agent-tool.repository.ts"</code> | <code>"PrismaAgentToolRepository.getWorkflowUsageDetails"</code> / 494–528 | 526: TS2698 → <code>"PrismaAgentToolRepository.getWorkflowUsageDetails/uniqueAgents.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/backend/src/agents/tools/infrastructure/repositories/prisma-agent-tool.repository.ts"</code> | <code>"PrismaAgentToolRepository.getPluginUsageDetails"</code> / 530–564 | 562: TS2698 → <code>"PrismaAgentToolRepository.getPluginUsageDetails/uniqueAgents.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/backend/src/cron/services/weekly-agent-performance-notification.cron.ts"</code> | <code>"WeeklyAgentPerformanceNotificationCron.getAgentMetrics"</code> / 131–186 | 175: TS2339, 175: TS2339, 175: TS2339 → <code>"WeeklyAgentPerformanceNotificationCron.getAgentMetrics/rollups.map()#0@2"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/backend/src/dashboard/application/use-cases/export/export-dashboard-data.use-case.ts"</code> | <code>"ExportDashboardDataUseCase.buildDeploymentSummary"</code> / 163–209 | 202: TS2339, 203: TS2339 → <code>"ExportDashboardDataUseCase.buildDeploymentSummary/[...deploymentIds].map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/backend/src/deployments/core/application/use-cases/whatsapp/phone-numbers/list-connection-phone-numbers.use-case.ts"</code> | <code>"ListConnectionPhoneNumbersUseCase.execute"</code> / 54–122 | 114: TS2339 → <code>"ListConnectionPhoneNumbersUseCase.execute/phoneNumbersResult.value.map()#0@2"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/backend/src/permissions/infrastructure/controllers/permissions.controller.ts"</code> | <code>"PermissionsController.listAccess"</code> / 271–309 | 297: TS2339, 298: TS2339, 299: TS2339, 300: TS2339, 301: TS2339, 302: TS2339, 303: TS2339, 304: TS2339 → <code>"PermissionsController.listAccess/result.permissions.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/backend/src/public/v1/infrastructure/adapters/tracing.repository.ts"</code> | <code>"TracingRepositoryAdapter.listTraces"</code> / 53–165 | 162: TS2345 → <code>"TracingRepositoryAdapter.listTraces/traces.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/backend/src/public/v1/infrastructure/adapters/tracing.repository.ts"</code> | <code>"TracingRepositoryAdapter.singleDimCostBreakdown"</code> / 507–778 | 633: TS2339, 633: TS2339 → <code>"TracingRepositoryAdapter.singleDimCostBreakdown/rows.map()#0@4"</code><br>713: TS2339 → <code>"TracingRepositoryAdapter.singleDimCostBreakdown/rows.map()#0@6"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/backend/src/public/v1/infrastructure/adapters/tracing.repository.ts"</code> | <code>"TracingRepositoryAdapter.getTracesForBulkExport"</code> / 1381–1488 | 1481: TS2345 → <code>"TracingRepositoryAdapter.getTracesForBulkExport/traces.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/backend/src/workflow/workflow-engine/workflow-node-executor/nodes/BrowserbaseNode.ts"</code> | <code>"BrowserbaseNode.computeInput"</code> / 175–214 | 204: TS2339 → <code>"BrowserbaseNode.computeInput/inputs.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/backend/src/workflow/workflow-engine/workflow-node-executor/nodes/BrowserbaseNode.ts"</code> | <code>"BrowserbaseNode.preCompute"</code> / 436–494 | 463: TS2339, 468: TS2339 → <code>"BrowserbaseNode.preCompute/inputs.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/backend/src/workflow/workflow-engine/workflow-node-executor/nodes/CustomScriptNode.ts"</code> | <code>"CustomScriptNode.computeInput"</code> / 1164–1198 | 1188: TS2339 → <code>"CustomScriptNode.computeInput/inputs?.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/backend/src/workflow/workflow-engine/workflow-node-executor/nodes/CustomScriptNode.ts"</code> | <code>"CustomScriptNode.preCompute"</code> / 1450–1494 | 1464: TS2339, 1469: TS2339 → <code>"CustomScriptNode.preCompute/nodeData.inputs?.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/backend/src/workflow/workflow-engine/workflow-node-executor/nodes/JSONataNode.ts"</code> | <code>"JSONataNode.preCompute"</code> / 285–329 | 298: TS2339, 303: TS2339 → <code>"JSONataNode.preCompute/nodeData.variables?.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/common/components/Chat/ChatInput/DroppedFiles.tsx"</code> | <code>"DroppedFiles"</code> / 49–88 | 81: TS2322 → <code>"DroppedFiles/files.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/common/components/Chat/PlanStepList/PlanStepList.tsx"</code> | <code>"PlanStepListComponent"</code> / 16–45 | 28: TS2739, 34: TS2739 → <code>"PlanStepListComponent/steps.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Admin/components/agent/AdminAgentPanel.tsx"</code> | <code>"MessageBlock"</code> / 325–384 | 374: TS2339 → <code>"MessageBlock/message.proposals.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Admin/hooks/useCompleteTenantClusterTeardown.ts"</code> | <code>"useCompleteTenantClusterTeardown"</code> / 32–70 | 44: TS2366 → <code>"useCompleteTenantClusterTeardown/useCallback()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Admin/hooks/useEnableZoneTotalTls.ts"</code> | <code>"useEnableZoneTotalTls"</code> / 33–89 | 39: TS2366 → <code>"useEnableZoneTotalTls/useCallback()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Admin/hooks/useForceConvergeCluster.ts"</code> | <code>"useForceConvergeCluster"</code> / 36–79 | 48: TS2366 → <code>"useForceConvergeCluster/useCallback()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Admin/hooks/useRequestVibeAppDataRun.ts"</code> | <code>"useRequestVibeAppDataRun"</code> / 58–102 | 82: TS2345 → <code>"useRequestVibeAppDataRun/useCallback()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Admin/hooks/useRunTenantBackupNow.ts"</code> | <code>"useRunTenantBackupNow"</code> / 79–132 | 91: TS2366 → <code>"useRunTenantBackupNow/useCallback()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Admin/hooks/useRunTenantRestoreDrillNow.ts"</code> | <code>"useRunTenantRestoreDrillNow"</code> / 181–241 | 193: TS2366 → <code>"useRunTenantRestoreDrillNow/useCallback()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Admin/pages/TypesensePage.tsx"</code> | <code>"TypesensePageContent"</code> / 28–75 | 42: TS2739, 43: TS2739, 47: TS2739, 52: TS2739 → <code>"TypesensePageContent/useMemo()#0@2"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Admin/pages/echo/EchoPage.tsx"</code> | <code>"EchoPage"</code> / 27–92 | 48: TS2739, 55: TS2739 → <code>"EchoPage/useMemo()#0@2"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Deployments/list/DeploymentsList/DeploymentsList.tsx"</code> | <code>"DeploymentsList"</code> / 37–96 | 86: TS2345 → <code>"DeploymentsList/sortedDeployments.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Playground/features/chat-list/components/ChatCardGroup.tsx"</code> | <code>"ChatCardGroup"</code> / 402–434 | 423: TS2322 → <code>"ChatCardGroup/data.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Playground/features/chat-list/components/ChatCardGroup.tsx"</code> | <code>"ChatCardGroupSkeleton"</code> / 436–448 | 442: TS2322 → <code>"ChatCardGroupSkeleton/[\"s0\", \"s1\", \"s2\", \"s3\", \"s4\"].map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Profiles/ProfilePromptInfo/PromptEditor/components/suggestion-panel.tsx"</code> | <code>"EditRowList"</code> / 64–135 | 109: TS2739 → <code>"EditRowList/editRows.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Tools/CreateTool/CreateToolModal.tsx"</code> | <code>"CreateToolModal"</code> / 27–158 | 95: TS2739 → <code>"CreateToolModal/tabs.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Workflow/Core/node-config-panel/content/timer-panel-content.tsx"</code> | <code>"TimerPanelContent"</code> / 19–119 | 28: TS1355 → <code>"TimerPanelContent/useMemo()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Workflow/Nodes/Branching/Logic/InvalidVariableItem.tsx"</code> | <code>"InvalidVariableItem"</code> / 4–33 | 19: TS2739 → <code>"InvalidVariableItem/invalidVariables.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Workflow/Nodes/Main/RecordScore/ConfigureTab.tsx"</code> | <code>"ConfigureTab"</code> / 35–171 | 55: TS2538 → <code>"ConfigureTab/useMemo()#0@1/Object.values(DbEnum.ScoreValueType).map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Workflow/Nodes/Main/SixtyFour/SetupSection.tsx"</code> | <code>"SetupSection"</code> / 126–293 | 224: TS1355 → <code>"SetupSection/useEffect()#0@2"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"conflicts/conflict-A-ai-task-service/file-history/20260309-OURS-177a9af1f3-feat-schema---add-createdByUserId-to-19-.ts"</code> | <code>"AITaskService.duplicateTask"</code> / 151–219 | 173: TS2339, 180: TS2339, 184: TS2339, 189: TS2339 → <code>"AITaskService.duplicateTask/this.prisma.$transaction()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"scripts/ci-cache-arms.ts"</code> | <code>"extractArms"</code> / 77–133 | 78: TS2550 → <code>"extractArms/log.split(\"\\n\").filter()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"scripts/nexus.ts"</code> | <code>"getFiltered"</code> / 253–259 | 257: TS2550, 257: TS2550 → <code>"getFiltered/ALL_SCRIPTS.filter()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"packages/shared/src/modules/chat/hooks/useScrollButton.ts"</code> | <code>"useScrollButton"</code> / 27–104 | 84: TS7030 → <code>"useScrollButton/useEffect()#0@2"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"tools/mission-control/web/src/components/common/ConfirmDialog.tsx"</code> | <code>"ConfirmDialog"</code> / 24–113 | 40: TS7030 → <code>"ConfirmDialog/useEffect()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"tools/mission-control/web/src/components/env/EnvGroup.tsx"</code> | <code>"EnvGroup"</code> / 27–139 | 96: TS2322, 112: TS2322 → <code>"EnvGroup/group.variables.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"tools/mission-control/web/src/components/env/EnvVarList.tsx"</code> | <code>"EnvVarList"</code> / 18–42 | 32: TS2322, 37: TS2322 → <code>"EnvVarList/variables.map()#0"</code> | none |
| refused → admitted | <code>"census-nexus.json"</code><br><code>"tools/mission-control/web/src/components/schema/ModelDetail.tsx"</code> | <code>"ModelDetail"</code> / 33–234 | 149: TS2322 → <code>"ModelDetail/visibleFields.map()#0"</code> | none |
| refused → admitted | <code>"census-pipedream.json"</code><br><code>"components/airtable_oauth/common/utils.mjs"</code> | <code>"normalizeRecord"</code> / 156–173 | 158: TS2339, 158: TS2339 → <code>"normalizeRecord/fields.map()#0"</code> | none |
| refused → admitted | <code>"census-pipedream.json"</code><br><code>"components/linear_app/common/utils.mjs"</code> | <code>"flattenValidationErrors"</code> / 127–144 | 132: TS2339, 132: TS2339, 132: TS2339 → <code>"flattenValidationErrors/validationErrors.flatMap()#0"</code> | none |
| refused → admitted | <code>"census-pipedream.json"</code><br><code>"components/linear_app/common/utils.mjs"</code> | <code>"formatGraphQlErrors"</code> / 155–166 | 158: TS2339, 158: TS2339 → <code>"formatGraphQlErrors/errors\n    .map()#0"</code> | none |
| still refused; first rule changes | <code>"bugsjs-eslint.json"</code><br><code>"lib/cli-engine.js"</code> | <code>"calculateStatsPerRun"</code> / 121–134 | 123: TS2339, 123: TS2339, 124: TS2339, 124: TS2339, 125: TS2339, 125: TS2339, 126: TS2339, 126: TS2339 → <code>"calculateStatsPerRun/results.reduce()#0"</code> | unsupported-member; retained: unsupported-member |
| still refused; first rule changes | <code>"census-n8n.json"</code><br><code>"packages/cli/src/LoadNodesAndCredentials.ts"</code> | <code>"LoadNodesAndCredentials.injectCustomApiCallOptions"</code> / 225–247 | 226: TS2345 → <code>"LoadNodesAndCredentials.injectCustomApiCallOptions/this.types.nodes.forEach()#0"</code> | mixed-types; retained: alias-mutation, mixed-types |
| still refused; first rule changes | <code>"census-n8n.json"</code><br><code>"packages/cli/src/commands/worker.ts"</code> | <code>"Worker.setupHealthMonitor"</code> / 381–476 | 393: TS2339, 405: TS2339, 416: TS2339, 426: TS2339 → <code>"Worker.setupHealthMonitor/app.get('/healthz')#1"</code><br>466: TS2339 → <code>"Worker.setupHealthMonitor/server.on('error')#1"</code> | type-assertion; retained: closure-mutation, ts-strict, type-assertion |
| still refused; first rule changes | <code>"census-nexus-app-starter.json"</code><br><code>"journeys/extra/copilot.mjs"</code> | <code>"startMockEmulator"</code> / 15–40 | 23: TS2345 → <code>"startMockEmulator/http.createServer()#0"</code><br>39: TS2531, 39: TS2339 → <code>"startMockEmulator/Promise()#0/server.listen(0,'127.0.0.1')#2"</code> | closure-mutation; retained: closure-mutation, param-mutation, promise, promise-pending |
| still refused; first rule changes | <code>"census-nexus-app-starter.json"</code><br><code>"src/ui/record-core/KanbanBoard.tsx"</code> | <code>"KanbanBoard"</code> / 107–160 | 154: TS2322 → <code>"KanbanBoard/stages.map()#0"</code> | unsupported-call; retained: unsupported-call |
| still refused; first rule changes | <code>"census-nexus-app-starter.json"</code><br><code>"src/ui/record-core/RecordCard.tsx"</code> | <code>"RecordCard"</code> / 13–59 | 44: TS2322 → <code>"RecordCard/metaFields.map()#0"</code><br>48: TS2322 → <code>"RecordCard/metaFields.map()#0/(row[f.key] as unknown[]).slice(0, 3).map()#0"</code> | type-assertion; retained: type-assertion |
| still refused; first rule changes | <code>"census-nexus-app-starter.json"</code><br><code>"src/ui/record-core/views/flow/FlowView.tsx"</code> | <code>"RecordCardNode"</code> / 61–81 | 72: TS2322 → <code>"RecordCardNode/data.metaFields.map()#0"</code> | type-assertion; retained: type-assertion |
| still refused; first rule changes | <code>"census-nexus.json"</code><br><code>"apps/backend/src/code-interpreter-skills/code-interpreter-skills.service.ts"</code> | <code>"CodeInterpreterSkillsService.updateSkillContents"</code> / 340–446 | 348: TS2339, 349: TS2339, 360: TS2339, 361: TS2339, 362: TS2339, 371: TS2339, 385: TS2339, 388: TS2339, 401: TS2339 → <code>"CodeInterpreterSkillsService.updateSkillContents/this.withConcurrencyGuard()#0"</code> | spread; retained: spread |
| still refused; first rule changes | <code>"census-nexus.json"</code><br><code>"apps/backend/src/workflow/workflow-engine/workflow-node-executor/nodes/CustomScriptNode.ts"</code> | <code>"CustomScriptNode.generateCode"</code> / 1318–1448 | 1327: TS2339 → <code>"CustomScriptNode.generateCode/inputs.map()#0"</code> | prototype; retained: prototype, ts-strict |
| still refused; first rule changes | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/common/components/SchemaInput/components/PropertyList.tsx"</code> | <code>"PropertyList"</code> / 37–160 | 56: TS2322 → <code>"PropertyList/Object.entries(parameters).map()#0"</code> | prototype; retained: index-assign, prototype |
| still refused; first rule changes | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/common/hooks/meta/useMessengerPageConnect.ts"</code> | <code>"useMessengerPageConnect"</code> / 60–192 | 76: TS2339, 82: TS2339, 83: TS2339, 84: TS2339 → <code>"useMessengerPageConnect/useEffect()#0"</code><br>110: TS2339, 125: TS2339 → <code>"useMessengerPageConnect/useCallback()#0@1"</code> | property-assign; retained: callback-form, property-assign |
| still refused; first rule changes | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/common/hooks/whatsapp/useWhatsAppEmbeddedSignup.ts"</code> | <code>"useWhatsAppEmbeddedSignup"</code> / 76–291 | 99: TS2339, 105: TS2339, 107: TS2339 → <code>"useWhatsAppEmbeddedSignup/useEffect()#0@2"</code><br>234: TS2339, 258: TS2339 → <code>"useWhatsAppEmbeddedSignup/useCallback()#0"</code> | property-assign; retained: callback-form, property-assign |
| still refused; first rule changes | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Admin/pages/PluginsPage.tsx"</code> | <code>"PluginsPageContent"</code> / 29–99 | 47: TS2739, 51: TS2739, 56: TS2739, 58: TS2739 → <code>"PluginsPageContent/useMemo()#0@2"</code> | void; retained: void |
| still refused; first rule changes | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/AgentCreation/features/thread-list/ThreadList.tsx"</code> | <code>"ThreadListComponent"</code> / 15–73 | 58: TS2322 → <code>"ThreadListComponent/threads.map()#0"</code> | type-assertion; retained: type-assertion |
| still refused; first rule changes | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Profiles/CodeInterpreterSkillsEditor/hooks/useSkillsFiles.ts"</code> | <code>"useSkillsFiles"</code> / 78–622 | 147: TS2345 → <code>"useSkillsFiles/useMemo()#0@2"</code> | react-handler-capture; retained: alias-mutation, react-handler-capture, spread, type-assertion |
| still refused; first rule changes | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Roles/features/my-roles/useMyRoles.ts"</code> | <code>"useMyRoles"</code> / 49–169 | 62: TS2339, 63: TS2339 → <code>"useMyRoles/myRoles.map()#0@1"</code><br>70: TS2339, 71: TS2339 → <code>"useMyRoles/myRoles.map()#0@2"</code><br>95: TS2339, 98: TS2339, 109: TS2339 → <code>"useMyRoles/myRoles.forEach()#0"</code> | foreach; retained: foreach |
| still refused; first rule changes | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Settings/audit-logs/AuditLogsExplorerTab.tsx"</code> | <code>"AuditLogsExplorerTab"</code> / 103–389 | 160: TS2345 → <code>"AuditLogsExplorerTab/useEffect()#0"</code> | dynamic-key; retained: dynamic-key, type-assertion, unsupported-call |
| still refused; first rule changes | <code>"census-nexus.json"</code><br><code>"apps/frontend/src/modules/Workflow/Core/node-config-panel/content/make-phone-call-panel-content.tsx"</code> | <code>"MakePhoneCallPanelContent"</code> / 199–342 | 223: TS1355 → <code>"MakePhoneCallPanelContent/useMemo()#0@2"</code> | index-assign; retained: index-assign |
| still refused; first rule changes | <code>"census-pipedream.json"</code><br><code>"components/airtable_oauth/common/utils.mjs"</code> | <code>"validateWritableFields"</code> / 182–190 | 185: TS2339 → <code>"validateWritableFields/fields\n    .filter(isComputedField)\n    .map()#0"</code> | prototype; retained: prototype |
| still refused; first rule changes | <code>"census-pyka.json"</code><br><code>"docs/design/list/blind/layout.js"</code> | <code>"render"</code> / 318–341 | 320: TS18048 → <code>"render/ALTS.filter()#0"</code><br>322: TS18048, 323: TS18048, 323: TS18048, 325: TS18048, 326: TS18048, 327: TS18048, 328: TS18048, 329: TS18048, 330: TS18048 → <code>"render/alts.map()#0@1"</code><br>333: TS18048, 333: TS18048 → <code>"render/alts.map()#0@1/STATES.map()#0@1"</code><br>335: TS18048, 335: TS18048 → <code>"render/alts.map()#0@1/STATES.map()#0@2"</code><br>339: TS18048, 339: TS18048, 339: TS18048 → <code>"render/alts.map()#0@2"</code> | unsupported-call; retained: property-assign, ts-strict, unsupported-call |
| still refused; first rule changes | <code>"census-pyka.json"</code><br><code>"scripts/engine-check.mjs"</code> | <code>"checkBasket"</code> / 132–286 | 226: TS2532 → <code>"checkBasket/dupLines.every()#0"</code> | type-assertion; retained: type-assertion |

### Shared-line attribution proof

| Root | Inside → refused | Refused → inside | First-refusal changes | New finding triples | Vanished finding triples |
|---|---:|---:|---:|---:|---:|
| <code>"census-nexus.json"</code> | 1675 | 2 | 61 | 0 | 0 |

Proof command: `node langs/ts/tests/pairs/callback_units/compare.mjs`. It checks all 5826 after-findings owned by these changed old units against baseline line/rule/message triples, and all 11926 baseline findings of those units against the after inventory. Full unit ranges and old/new owner lists are in `langs/ts/design/callback-units-evidence/shared-line-attribution.json`.

Three examples:
- <code>"packages/prisma-db/client/query_engine_bg.js"</code>:1, unit <code>"y"</code>: inside → refused; operator-value-context, formerly owned by <code>"$"</code>, now includes <code>"y"</code>.
- <code>"packages/prisma-db/client/runtime/edge-esm.js"</code>:5, unit <code>"Wa"</code>: refused → inside; toplevel-effect, formerly owned by <code>"Wa"</code>, now includes <code>"Wa"</code>.
- <code>"packages/prisma-db/client/runtime/edge.js"</code>:5, unit <code>"il"</code>: refused → inside; toplevel-effect, formerly owned by <code>"il"</code>, now includes <code>"il"</code>.
