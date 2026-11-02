# Census: <code>nexus</code>

Date: 2026-11-01 (UTC)

Units: 43949. Inside the subset: 22896 (52.1 percent). Refused: 21053. Files unreadable: 0.

Skipped: appledouble/binary 12733 (12733 AppleDouble, 0 binary), never units.

By stratum (census.mjs stratumOf): written 43914 units (22867 inside, 12689 files; 52.1 percent); generated 35 units (29 inside, 44 files); minified 0 units (0 inside, 0 files). The share above is over all code; the regression floor R6 binds that share.

| Entered | Environment-blocked | Language-refused |
| ---: | ---: | ---: |
| 22896 | 283 | 12738 |

Environment-blocked by kind: workspace 116, lockfile 76, member 37, absent 20, global-lib 14, relative 11, relative (generated) 6, global-types 3.

Of these, refused only on a value whose type does not resolve: 213 (read-after-call 183, type-assertion 17, instanceof-constructor 9, index-assign 1, param-mutation 1, global-read 1, unsupported-syntax 1).

Each refused unit is counted once, under the first rule the lint names for it. A unit whose module or global still does not resolve is environment-blocked instead, under `environment: <kind>` of its first such finding.

Directory depth: 2. A dot means the repository root.

## Top five rules by units stopped

| Rule | Units stopped |
| --- | ---: |
| <code>copied-argument</code> | 2264 |
| <code>ts-strict</code> | 2199 |
| <code>type-assertion</code> | 2047 |
| <code>read-after-call</code> | 2031 |
| <code>this</code> | 268 |

## Rule: <code>copied-argument</code>

Units stopped: 2264.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 1418 | <code>apps/backend/src/_common/adapters/redis-io.adapter.ts:167  () =&gt; reject( new Error( `Redis ${label} client did not become ready within ${timeoutMs}ms — ` + `Socket.IO adapter cann</code> |
| <code>apps/frontend</code> | 543 | <code>apps/frontend/src/common/api/request.ts:56  async &lt;TResponse = unknown&gt;(config: AxiosRequestConfig): Promise&lt;TResponse&gt; =&gt; { // Get auth token const authToken = awa</code> |
| <code>apps/vibe-agent</code> | 20 | <code>apps/vibe-agent/src/data/app-data.reconciler.ts:62  async reconcile(input: { vaultEndpoint: string; directives: AgentAppDataDirective[]; }): Promise&lt;AgentAppDataReport[]&gt; {</code> |
| <code>apps/vibe-edge-authz</code> | 6 | <code>apps/vibe-edge-authz/src/application/decide-edge-access.ts:63  export function decideEdgeAccess(input: DecideEdgeAccessInput): EdgeAuthzDecision { const { request, app, session, signI</code> |
| <code>apps/vibe-log-gateway</code> | 2 | <code>apps/vibe-log-gateway/src/domain/loki-upstream.error.ts:50  static malformed(cause: unknown): LokiUpstreamError { return new LokiUpstreamError( "Loki returned a range-query envelop</code> |
| <code>apps/vibe-provisioner</code> | 13 | <code>apps/vibe-provisioner/stacks/_shared/s3.ts:31  export function bucketPolicyDocument(statements: BucketPolicyStatement[]): string { return JSON.stringify({ Version: "20</code> |
| <code>conflicts/conflict-A-ai-task-service</code> | 3 | <code>conflicts/conflict-A-ai-task-service/file-history/20260309-OURS-177a9af1f3-feat-schema---add-createdByUserId-to-19-.ts:93  async updateTask(task: DbEntity.AITask, dto: CreateTaskDto) { if (!task.organizationId) { throw new BadRequestException(</code> |
| <code>conflicts/conflict-C-prisma-agent-repo</code> | 6 | <code>conflicts/conflict-C-prisma-agent-repo/file-history/20260306-ANCESTOR.ts:370  async create(data: AgentCreateData): Promise&lt;AgentEntity&gt; { const row = await this.prisma.agent.create({ data: { first_n</code> |
| <code>packages/claude-code-skills</code> | 2 | <code>packages/claude-code-skills/nexus-agent-evaluation/examples/02-create-run-simulated.ts:29  async function main() { if (!DEPLOYMENT_ID) throw new Error("Set DEPLOYMENT_ID env var."); const api = createClient(); /</code> |
| <code>packages/cli</code> | 34 | <code>packages/cli/scripts/bundle-skills.ts:43  function collectFiles(dir: string, basePath: string = ""): FileEntry[] { return collectFilesMatching(dir, /\.(md&#124;ts)$/, </code> |
| <code>packages/sdk</code> | 169 | <code>packages/sdk/src/client.ts:245  constructor(opts: NexusClientOptions = {}) { const apiKey = opts.apiKey ?? getEnv("NEXUS_API_KEY"); if (!apiKey) { throw</code> |
| <code>packages/shared</code> | 6 | <code>packages/shared/src/modules/chat/components/input/AddFilesButton.tsx:19  (e: React.ChangeEvent&lt;HTMLInputElement&gt;) =&gt; { const files = Array.from(e.target.files &#124;&#124; []) if (addFiles &amp;&amp; files.lengt</code> |
| <code>packages/types</code> | 18 | <code>packages/types/src/api/common/response.schema.ts:20  export const ApiSuccessSchema = &lt;T extends z.ZodType&gt;(dataSchema: T) =&gt; z.object({ success: z.literal(true), data: dataS</code> |
| <code>packages/vibe-sdk</code> | 1 | <code>packages/vibe-sdk/src/client.ts:129  (token) =&gt; sendJson({ fetchImpl: this.fetchImpl, url: `${this.baseUrl}/broker/v1/cards/${encodeURIComponent(handle)}/inv</code> |
| <code>scripts/codemods</code> | 1 | <code>scripts/codemods/nx-modal-to-nx-dialog.ts:402  function buildTriggerElement(j: JSCodeshift, triggerAttr: JSXAttribute): JSXElement { const v = triggerAttr.value; const</code> |
| <code>tools/mission-control</code> | 14 | <code>tools/mission-control/server/src/routes/analytics.routes.ts:12  async (_req: Request, res: Response) =&gt; { try { const analytics = await workspaceAnalytics.getWorkspaceAnalytics(); res.</code> |
| <code>tools/nexus-studio</code> | 8 | <code>tools/nexus-studio/server/src/lib/nexus-webhook.ts:29  function signWebhook(msgId: string, timestamp: string, body: string): string { const secretBytes = Buffer.from(getWebhoo</code> |

## Rule: <code>ts-strict</code>

Units stopped: 2199.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 2137 | <code>apps/backend/src/_common/authentication/audit/cross-org-key-use.audit.ts:108  await this.prisma.nxAdminAuditLog.create({</code> |
| <code>apps/embed</code> | 1 | <code>apps/embed/src/components/EmbedChatView.tsx:141  const existingMessageIds = new Set(messages.map((m: { id: string }) =&gt; m.id));</code> |
| <code>apps/frontend</code> | 19 | <code>apps/frontend/src/common/components/Chat/ChatMessage/DisplaySource.tsx:69  const messageWithStatus = message as MessageWithStatusInfos</code> |
| <code>apps/nexus-gpt-outlook</code> | 1 | <code>apps/nexus-gpt-outlook/src/taskpane/taskpane.ts:134  async function getLatestMessage(chatRoomId: string): Promise&lt;string &#124; null&gt; {</code> |
| <code>conflicts/conflict-A-ai-task-service</code> | 4 | <code>conflicts/conflict-A-ai-task-service/file-history/20260306-ANCESTOR.ts:17  @Inject(forwardRef(() =&gt; AITaskExecutor))</code> |
| <code>conflicts/conflict-B-unified-tool-card</code> | 6 | <code>conflicts/conflict-B-unified-tool-card/file-history/20260227-ANCESTOR.tsx:75  &lt;div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 shadow-[0px_1px_0px_#fff_inset,_0px_1px</code> |
| <code>conflicts/conflict-C-prisma-agent-repo</code> | 3 | <code>conflicts/conflict-C-prisma-agent-repo/file-history/20260306-ANCESTOR.ts:128  modelName: row.modelName,</code> |
| <code>packages/shared</code> | 2 | <code>packages/shared/src/modules/chat/hooks/useAutoScroll.ts:165  useEffect(() =&gt; {</code> |
| <code>packages/types</code> | 1 | <code>packages/types/src/shared/domain/vibe/app-deployability.ts:73  const exhaustive: never = gitProjectStatus;</code> |
| <code>scripts</code> | 13 | <code>scripts/check-import-cycles.ts:181  const color = new Map&lt;string, number&gt;([...graph.keys()].map((k) =&gt; [k, WHITE]));</code> |
| <code>scripts/api-codegen</code> | 1 | <code>scripts/api-codegen/registry-validator.ts:110  const unregisteredSchemas = [...new Set(configuredSchemas)]</code> |
| <code>scripts/codemods</code> | 2 | <code>scripts/codemods/nx-modal-to-nx-dialog.ts:541  const specifiers = [...needed]</code> |
| <code>tools/mission-control</code> | 9 | <code>tools/mission-control/web/src/components/common/ConfirmDialog.tsx:40  useEffect(() =&gt; {</code> |

## Rule: <code>type-assertion</code>

Units stopped: 2047.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 947 | <code>apps/backend/src/_common/authentication/jwt.guard.ts:305  organizationId</code> |
| <code>apps/frontend</code> | 741 | <code>apps/frontend/src/common/api-client/utils.ts:66  (response as AxiosResponse&lt;TResponse, TBody&gt;).data</code> |
| <code>apps/nexus-gpt-outlook</code> | 5 | <code>apps/nexus-gpt-outlook/src/commands/commands.ts:106  arg.message</code> |
| <code>apps/vibe-agent</code> | 26 | <code>apps/vibe-agent/src/data/postgres-admin.ts:112  { rows: result.rows as R[] }</code> |
| <code>apps/vibe-edge-authz</code> | 1 | <code>apps/vibe-edge-authz/src/infrastructure/jws/verify-compact-jws.ts:73  segments as [string, string, string]</code> |
| <code>apps/vibe-provisioner</code> | 30 | <code>apps/vibe-provisioner/stacks/aurora.ts:117  id as string</code> |
| <code>conflicts/conflict-A-ai-task-service</code> | 3 | <code>conflicts/conflict-A-ai-task-service/file-history/20260309-OURS-177a9af1f3-feat-schema---add-createdByUserId-to-19-.ts:55  { data: { ...taskData, createdByUserId: createdByUserId ?? null } as Parameters&lt; typeof this.prisma.aITask.create &gt;[0]["</code> |
| <code>conflicts/conflict-C-prisma-agent-repo</code> | 10 | <code>conflicts/conflict-C-prisma-agent-repo/file-history/20260306-ANCESTOR.ts:344  ({ label: cfg.label, description: cfg.description, iconUrl: cfg.iconUrl, iconType: cfg.iconType, type: cfg.type, agentIn</code> |
| <code>packages/claude-code-skills</code> | 10 | <code>packages/claude-code-skills/nexus-agent-evaluation/examples/01-full-conversation-eval.ts:110  r.status</code> |
| <code>packages/cli</code> | 95 | <code>packages/cli/src/commands/agent-eval.ts:97  (getPaginationParams(opts) as Record&lt;string, string&gt;)</code> |
| <code>packages/docs-content</code> | 1 | <code>packages/docs-content/src/docs-content.ts:148  JSON.parse(raw) as NavigationConfig</code> |
| <code>packages/mcp-server</code> | 5 | <code>packages/mcp-server/src/config.ts:40  activeName</code> |
| <code>packages/sdk</code> | 3 | <code>packages/sdk/src/http-client.ts:92  async request&lt;T&gt;(method: string, path: string, opts: RequestOptions = {}): Promise&lt;T&gt; { const { data } = await this.requ</code> |
| <code>packages/shared</code> | 33 | <code>packages/shared/i18n/utils/getErrorMessage.ts:126  value as ErrorType</code> |
| <code>packages/types</code> | 68 | <code>packages/types/scripts/generate-schema-manifest.ts:93  defOf&lt;{ type: string }&gt;(t)</code> |
| <code>scripts</code> | 16 | <code>scripts/ci-affected.ts:536  file as (typeof IGNORED_FILES)[number]</code> |
| <code>scripts/api-codegen</code> | 5 | <code>scripts/api-codegen/params-query-validator.ts:76  export function validateAllParamsQuery(registry: Record&lt;string, unknown&gt;): ParamsQueryIssue[] { const issues: ParamsQuer</code> |
| <code>scripts/codemods</code> | 7 | <code>scripts/codemods/nx-modal-to-nx-dialog.ts:76  export default function transformer(file: FileInfo, api: API, _options: Options): string &#124; null { if (EXCLUDED_PATH_FRAG</code> |
| <code>tools/mission-control</code> | 19 | <code>tools/mission-control/server/src/services/env-template-writer.service.ts:178  template.deprecatedVariables.filter((d) =&gt; d.key !== variableKey)</code> |
| <code>tools/nexus-studio</code> | 22 | <code>tools/nexus-studio/server/src/lib/clerk.ts:269  memberships.map((m) =&gt; clerkDelete(`/organizations/${orgId}/memberships/${m.public_user_data.user_id}`).catch(() =&gt; { //</code> |

## Rule: <code>read-after-call</code>

Units stopped: 2031.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 1274 | <code>apps/backend/src/__governance__/controller-files.ts:92  const controllerDecoratorNames = (source: ts.SourceFile): ReadonlySet&lt;string&gt; =&gt; { const names = new Set&lt;string&gt;(["Contr</code> |
| <code>apps/frontend</code> | 598 | <code>apps/frontend/src/common/chat/chat-stream-session.ts:347  (p) =&gt; isToolCallPart(p) &amp;&amp; seededToolCallIds.has(p.toolCallId)</code> |
| <code>apps/vibe-agent</code> | 62 | <code>apps/vibe-agent/src/data/app-backup.reconciler.ts:132  async reconcile(input: { vaultEndpoint: string; directives: readonly AgentAppBackupDirective[]; }): Promise&lt;AgentAppBack</code> |
| <code>apps/vibe-provisioner</code> | 11 | <code>apps/vibe-provisioner/stacks/app-backup.ts:102  export function provisionAppBackup(organizationId: string): AppBackupOutputs { const baseTags = buildTags(organizationId</code> |
| <code>conflicts/conflict-A-ai-task-service</code> | 5 | <code>conflicts/conflict-A-ai-task-service/file-history/20260306-ANCESTOR.ts:173  async updatePrompt(taskId: string, updatePromptDto: UpdatePromptDto) { try { return await this.prisma.aITask.update({ wh</code> |
| <code>packages/claude-code-skills</code> | 5 | <code>packages/claude-code-skills/nexus-agent-evaluation/examples/01-full-conversation-eval.ts:37  templates</code> |
| <code>packages/cli</code> | 6 | <code>packages/cli/src/commands/auth.ts:131  opts</code> |
| <code>packages/sdk</code> | 8 | <code>packages/sdk/src/http-client.ts:119  async requestRaw(method: string, path: string, opts: RequestOptions = {}): Promise&lt;string&gt; { const url = new URL(`${this</code> |
| <code>packages/shared</code> | 12 | <code>packages/shared/src/modules/chat/components/feed/ChatFeed.tsx:168  (group, groupIndex) =&gt; { const isLastGroup = groupIndex === groupedMessages.length - 1 const isAgentGroup = group.length</code> |
| <code>packages/types</code> | 12 | <code>packages/types/src/schemas/AccessCard/policy/apply-card-policy.ts:88  export function applyCardPolicy(input: ApplyCardPolicyInput): CardPolicyOutcome { const parametersSupplied = Object.keys</code> |
| <code>packages/vibe-sdk</code> | 7 | <code>packages/vibe-sdk/src/client.ts:124  async invoke( handle: string, options: BrokerInvokeOptions &amp; { readonly parse?: (data: unknown) =&gt; unknown } ): Promise&lt;</code> |
| <code>scripts</code> | 1 | <code>scripts/sync-docs-to-zero-entropy.ts:44  async function apiCall(method: string, endpoint: string, body?: unknown): Promise&lt;any&gt; { const url = `${API_URL}${endpoi</code> |
| <code>scripts/api-codegen</code> | 1 | <code>scripts/api-codegen/generator.ts:163  export function generateDomainClient( domainName: string, schemasVarName: string, schemasObject: DomainSchemas ): string</code> |
| <code>scripts/backfill</code> | 1 | <code>scripts/backfill/detached-phone-number-org.ts:81  async function buildSubaccountToConnection( prisma: PrismaClient ): Promise&lt;Map&lt;string, { connectionId: string; organiza</code> |
| <code>tools/mission-control</code> | 3 | <code>tools/mission-control/server/src/db/queries.ts:96  tagSet</code> |
| <code>tools/nexus-studio</code> | 25 | <code>tools/nexus-studio/server/src/lib/clerk.ts:42  async function clerkGet(path: string): Promise&lt;unknown&gt; { const res = await fetch(`${CLERK_API_BASE}${path}`, { headers:</code> |

## Rule: <code>this</code>

Units stopped: 268.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 253 | <code>apps/backend/src/_common/folders/generic-folders.service.ts:184  this</code> |
| <code>apps/frontend</code> | 5 | <code>apps/frontend/src/common/chat/chat-stream-session.ts:940  this._writeLiveParts()</code> |
| <code>apps/vibe-agent</code> | 6 | <code>apps/vibe-agent/src/data/app-backup.reconciler.ts:146  this</code> |
| <code>packages/vibe-sdk</code> | 4 | <code>packages/vibe-sdk/src/client.ts:298  this.throwIfRefused(response.status, response.body)</code> |

## Rule: <code>alias-mutation</code>

Units stopped: 257.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 115 | <code>apps/backend/src/_common/providers/xlsx/xlsx-parser.service.ts:806  row.push("")</code> |
| <code>apps/frontend</code> | 103 | <code>apps/frontend/src/common/components/Chat/ChatMessagesView/assistant-segments/build-assistant-segments.ts:72  last.parts.push(part)</code> |
| <code>apps/vibe-agent</code> | 2 | <code>apps/vibe-agent/src/capacity/node-capacity.detector.ts:54  current.max</code> |
| <code>apps/vibe-edge-authz</code> | 1 | <code>apps/vibe-edge-authz/src/infrastructure/http/build-sign-in-url.ts:46  export function buildSignInUrlFactory( consoleBaseUrl: string ): (request: EdgeRequest, appHost: string) =&gt; string { con</code> |
| <code>packages/mcp-server</code> | 1 | <code>packages/mcp-server/src/config.ts:71  profiles[activeName]</code> |
| <code>packages/shared</code> | 19 | <code>packages/shared/src/modules/chat/components/feed/ChatFeed.tsx:122  containerRef.current.scrollTop</code> |
| <code>packages/types</code> | 12 | <code>packages/types/src/schemas/AccessCard/policy/measure-parameters.ts:46  export function measureParameters(parameters: Record&lt;string, unknown&gt;): MeasureParametersOutcome { const breach = walk(p</code> |
| <code>scripts/codemods</code> | 1 | <code>scripts/codemods/nx-modal-to-nx-dialog.ts:506  node.comments</code> |
| <code>tools/mission-control</code> | 1 | <code>tools/mission-control/server/src/services/schema-explorer/schema-file.parser.ts:296  sections.push(...parseSchemaFileSections(sibContent))</code> |
| <code>tools/nexus-studio</code> | 2 | <code>tools/nexus-studio/server/src/lib/scene-runner.ts:76  record.sceneId</code> |

## Rule: <code>dynamic-key</code>

Units stopped: 247.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 76 | <code>apps/backend/src/_common/filters/prisma-client-exception.filter.ts:197  [HttpStatus.BAD_REQUEST]: "VALIDATION_ERROR"</code> |
| <code>apps/frontend</code> | 133 | <code>apps/frontend/src/common/components/Chat/ChatMessagesView/message-row.tsx:37  [message.role === "user" ? "paddingLeft" : "paddingRight"]: messageOffset</code> |
| <code>apps/vibe-agent</code> | 4 | <code>apps/vibe-agent/src/logs/log-chunk.ts:129  bytes[index]</code> |
| <code>packages/cli</code> | 6 | <code>packages/cli/src/commands/channel.ts:390  [opts.type]: { body: opts.body }</code> |
| <code>packages/shared</code> | 3 | <code>packages/shared/i18n/utils/getErrorMessage.ts:80  localeTranslations?.errors?.[errorType as ErrorType]</code> |
| <code>packages/types</code> | 17 | <code>packages/types/src/schemas/Deployment/deploymentSettings/Embed/__json.schema.ts:102  override[key]</code> |
| <code>tools/mission-control</code> | 8 | <code>tools/mission-control/server/src/db/queries.ts:125  stats[q.type]</code> |

## Rule: <code>prototype</code>

Units stopped: 238.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 101 | <code>apps/backend/src/_common/filters/sentry-capture.ts:47  exception.constructor</code> |
| <code>apps/frontend</code> | 104 | <code>apps/frontend/src/common/chat/prompt-reflection/apply-patch-core.ts:30  Reflect</code> |
| <code>packages/cli</code> | 6 | <code>packages/cli/src/config.ts:100  "profiles" in parsed</code> |
| <code>packages/shared</code> | 1 | <code>packages/shared/src/modules/chat/domain/operations.ts:78  updatedChats[chatId]</code> |
| <code>packages/types</code> | 10 | <code>packages/types/src/schemas/AccessCard/policy/filter-parameters.ts:65  parameters[key]</code> |
| <code>tools/mission-control</code> | 9 | <code>tools/mission-control/server/src/services/env-reader.service.ts:69  async readEnvWithAlternatives( app: EnvApp, templateKeys: Set&lt;string&gt; ): Promise&lt;{ currentValues: Record&lt;string, string&gt;</code> |
| <code>tools/nexus-commands-extension</code> | 6 | <code>tools/nexus-commands-extension/src/extension.ts:37  acc[cat]</code> |
| <code>tools/nexus-studio</code> | 1 | <code>tools/nexus-studio/server/src/lib/jwt-cache.ts:59  disk[actorHandle]</code> |

## Rule: <code>names</code>

Units stopped: 210.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 9 | <code>apps/backend/src/_common/providers/reducto/errors/reducto-error.base.ts:40  constructor( message: string, readonly context?: ReductoErrorContext ) { super(message); this.name = this.constructor.na</code> |
| <code>apps/frontend</code> | 188 | <code>apps/frontend/src/common/api/request.ts:47  export function useRequest() { const { getToken } = useContext(ApiAuthContext) const request = useCallback( async &lt;TResp</code> |
| <code>apps/vibe-agent</code> | 6 | <code>apps/vibe-agent/src/githost/forgejo-api-client.ts:57  constructor(private readonly fetchFn: typeof fetch = fetch) {}</code> |
| <code>apps/vibe-edge-authz</code> | 1 | <code>apps/vibe-edge-authz/src/infrastructure/nomad/read-edge-authz-state.nomad.adapter.ts:26  constructor( private readonly nomadAddress: string, private readonly fetchImpl: typeof fetch = fetch ) {}</code> |
| <code>apps/vibe-log-gateway</code> | 1 | <code>apps/vibe-log-gateway/src/infrastructure/nomad/resolve-loki-base-url.nomad.adapter.ts:48  async execute(): Promise&lt;string&gt; { const url = new URL( `/v1/service/${encodeURIComponent(VIBE_TELEMETRY_JOB_NAME)}`, th</code> |
| <code>packages/cli</code> | 3 | <code>packages/cli/src/util/pagination.ts:8  export function addPaginationOptions(cmd: Command): Command { return cmd .option("--page &lt;number&gt;", "Page number", parse</code> |
| <code>packages/types</code> | 1 | <code>packages/types/src/shared/echo/errors.ts:19  constructor( message: string, public readonly code: string, public readonly details?: Record&lt;string, unknown&gt; ) { super(</code> |
| <code>packages/vibe-sdk</code> | 1 | <code>packages/vibe-sdk/src/transport.ts:150  export function platformFetch(): FetchLike { if (typeof fetch === "undefined") { throw new VibeSdkConfigError( "This run</code> |

## Rule: <code>unsupported-member</code>

Units stopped: 208.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 158 | <code>apps/backend/src/__governance__/module-graph.ts:65  m[1]</code> |
| <code>apps/frontend</code> | 25 | <code>apps/frontend/src/common/components/Chat/ChatMessage/SourceItem.tsx:89  source.metadata?._shareable_airtable_files_url</code> |
| <code>packages/types</code> | 22 | <code>packages/types/src/shared/domain/agents/agent-prompt-knowledge.utils.ts:129  match[1]</code> |
| <code>scripts</code> | 1 | <code>scripts/ci-cache-arms.ts:122  sources[4]</code> |
| <code>tools/mission-control</code> | 2 | <code>tools/mission-control/server/src/services/schema-explorer/schema-file.parser.ts:141  m[1]</code> |

## Rule: <code>promise</code>

Units stopped: 201.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 170 | <code>apps/backend/src/_common/adapters/redis-io.adapter.ts:128  new Promise&lt;void&gt;((resolve, reject) =&gt; { // Populated as the temporary listeners and the deadline are installed, so // w</code> |
| <code>apps/frontend</code> | 17 | <code>apps/frontend/src/common/chat/conversation-stream/conversation-stream-machine.ts:264  attach(): void { if (this._destroyed &#124;&#124; this._attachRunning) return this._attachRunning = true void this._runAttachLoop(</code> |
| <code>apps/vibe-agent</code> | 1 | <code>apps/vibe-agent/src/reconcile/repo.reconciler.ts:103  this.reconcileOne(directive, forgejoBaseUrl, token, vaultEndpoint)</code> |
| <code>packages/claude-code-skills</code> | 2 | <code>packages/claude-code-skills/shared/helpers.ts:31  export async function pollUntil&lt;T&gt;( fn: () =&gt; Promise&lt;T&gt;, predicate: (result: T) =&gt; boolean, opts: { intervalMs?: number</code> |
| <code>packages/cli</code> | 2 | <code>packages/cli/src/util/stdin.ts:6  new Promise((resolve, reject) =&gt; { const chunks: Buffer[] = []; process.stdin.on("data", (chunk) =&gt; chunks.push(chunk));</code> |
| <code>scripts/backfill</code> | 2 | <code>scripts/backfill/detached-phone-number-org.ts:37  new Promise((resolve) =&gt; setTimeout(resolve, ms))</code> |
| <code>scripts/db</code> | 1 | <code>scripts/db/bootstrap-fresh.ts:75  new Promise((resolve) =&gt; rl.question(query, resolve))</code> |
| <code>tools/mission-control</code> | 6 | <code>tools/mission-control/web/src/api/schema.api.ts:39  getJson("/api/schema/overview")</code> |

## Rule: <code>closure-mutation</code>

Units stopped: 188.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 41 | <code>apps/backend/src/_common/gateways/middlewares/verify-clerk-jwt.middleware.ts:103  socket.data.userId</code> |
| <code>apps/frontend</code> | 130 | <code>apps/frontend/src/common/chat/chat-stream-session.ts:289  settleDeclinedToolCall(toolCallId: string): void { if (this._destroyed) return if (!this._decliningCalls.has(toolCallId)</code> |
| <code>apps/vibe-agent</code> | 1 | <code>apps/vibe-agent/src/main.ts:394  running</code> |
| <code>packages/cli</code> | 1 | <code>packages/cli/src/commands/channel.ts:31  warned</code> |
| <code>packages/shared</code> | 11 | <code>packages/shared/src/modules/chat/components/feed/SimpleChatFeed.tsx:85  hasScrolledInitiallyRef.current</code> |
| <code>scripts</code> | 3 | <code>scripts/nexus.ts:350  state.filter</code> |
| <code>tools/nexus-studio</code> | 1 | <code>tools/nexus-studio/web/src/hooks/useToast.ts:22  ++nextId</code> |

## Rule: <code>unsupported-call</code>

Units stopped: 184.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 66 | <code>apps/backend/src/_common/prisma/prisma.service.ts:53  this.queue.shift()</code> |
| <code>apps/frontend</code> | 73 | <code>apps/frontend/src/common/chat/chat-stream-session.ts:241  settleToolCall(opts: SettleToolCallParams): void { if (this._destroyed) return // No local write either path — the backe</code> |
| <code>apps/vibe-agent</code> | 9 | <code>apps/vibe-agent/src/nomad/nomad-client.ts:719  async getBatchAllocation(jobId: string): Promise&lt;NomadBatchAllocation&gt; { const body = await this.request( "status", "GET</code> |
| <code>packages/shared</code> | 18 | <code>packages/shared/src/modules/chat/components/message/FileList.tsx:63  file.name?.split(".").pop()</code> |
| <code>packages/types</code> | 16 | <code>packages/types/src/api/domains/workspaces/schemas/core.ts:19  s .max(1024, "path exceeds 1024 character limit")</code> |
| <code>packages/vibe-stack-detect</code> | 1 | <code>packages/vibe-stack-detect/src/dockerfile/render.ts:325  RECIPES[plan.recipe](plan)</code> |
| <code>tools/nexus-studio</code> | 1 | <code>tools/nexus-studio/web/src/pages/permissions/ScenesTab.tsx:180  (async () =&gt; { try { const cast = await getCast(); setCastSeeded(cast.actors.some((a) =&gt; a.isSeeded)); } catch { setCast</code> |

## Rule: <code>string-code-unit</code>

Units stopped: 182.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 103 | <code>apps/backend/src/_common/adapters/redis-io.adapter.ts:63  `📡 Connecting Redis adapter for Socket.IO: ${</code> |
| <code>apps/frontend</code> | 44 | <code>apps/frontend/src/common/components/Pickers/OAuthConnectionPicker/ConnectionItem.tsx:97  `🔒 In use by: ${</code> |
| <code>packages/cli</code> | 1 | <code>packages/cli/src/commands/execution.ts:407  "🔄"</code> |
| <code>packages/shared</code> | 1 | <code>packages/shared/src/modules/chat/components/message/FileItem.tsx:145  "📄"</code> |
| <code>packages/types</code> | 1 | <code>packages/types/src/shared/file-upload/ai-task-document.config.ts:69  "📎"</code> |
| <code>scripts</code> | 3 | <code>scripts/seed-version-history-replica.ts:85  `🧹 wiped ${</code> |
| <code>scripts/api-codegen</code> | 1 | <code>scripts/api-codegen/index.ts:371  `📝 Generating ${</code> |
| <code>scripts/db</code> | 4 | <code>scripts/db/bootstrap-fresh.ts:79  "\n🚀 Nexus Fresh Database Bootstrap\n"</code> |
| <code>tools/mission-control</code> | 24 | <code>tools/mission-control/server/src/index.ts:51  `🛰️ Mission Control server running on http://localhost:${</code> |

## Rule: <code>captured-mutable</code>

Units stopped: 145.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 70 | <code>apps/backend/src/_common/filters/prisma-validation-exception.filter.ts:102  match</code> |
| <code>apps/frontend</code> | 64 | <code>apps/frontend/src/common/chat/chat-stream-session.ts:1166  matchedToolName</code> |
| <code>apps/vibe-provisioner</code> | 1 | <code>apps/vibe-provisioner/stacks/network.ts:55  i</code> |
| <code>packages/shared</code> | 4 | <code>packages/shared/src/modules/chat/components/message/FileList.tsx:132  alive</code> |
| <code>packages/types</code> | 1 | <code>packages/types/scripts/generate-schema-manifest.ts:402  expectedNames</code> |
| <code>scripts</code> | 2 | <code>scripts/precommit-affected.ts:361  membershipUnknown</code> |
| <code>tools/mission-control</code> | 3 | <code>tools/mission-control/server/src/services/env-reader.service.ts:200  idCounter</code> |

## Rule: <code>param-mutation</code>

Units stopped: 130.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 63 | <code>apps/backend/src/_common/debug/debug.controller.ts:57  this.attempts.delete(ip)</code> |
| <code>apps/frontend</code> | 56 | <code>apps/frontend/src/common/chat/prompt-reflection/use-prompt-reflection.ts:388  processedSuggestionsRef.current.clear()</code> |
| <code>packages/claude-code-skills</code> | 1 | <code>packages/claude-code-skills/shared/helpers.ts:60  cleanupFns.reverse()</code> |
| <code>packages/cli</code> | 3 | <code>packages/cli/src/util/follow-diagnose.ts:110  entries.push({ key, pathLabel, type: node.nodeType ?? null, status: node.status ?? "PENDING", duration: node.duration ??</code> |
| <code>packages/shared</code> | 1 | <code>packages/shared/src/modules/chat/hooks/usePerformanceMetrics.ts:148  timersRef.current.delete(name)</code> |
| <code>scripts</code> | 6 | <code>scripts/check-import-cycles.ts:99  specs.push(spec)</code> |

## Rule: <code>reference-key</code>

Units stopped: 127.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 64 | <code>apps/backend/src/admin/admin-usage.controller.ts:61  (d) =&gt; ({ organizationId: d.organizationId ?? "", organizationName: orgMap.get(d.organizationId ?? "") ?? "Unknown", cos</code> |
| <code>apps/frontend</code> | 62 | <code>apps/frontend/src/common/chat/chat-stream-session.ts:73  constructor(options: ChatStreamSessionOptions) { this._options = options this._accumulator = new ContentPartsAccumulator</code> |
| <code>packages/shared</code> | 1 | <code>packages/shared/src/modules/chat/store/embedReducers/messages.ts:96  (m) =&gt; !newMessageIds.has(m.id)</code> |

## Rule: <code>unsupported-syntax</code>

Units stopped: 117.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 35 | <code>apps/backend/src/_common/streaming/middleware/tracing/generation-formatters.ts:133  _exhaustive</code> |
| <code>apps/frontend</code> | 64 | <code>apps/frontend/src/common/components/Chat/PartRenderer/Part.tsx:75  CustomComponent</code> |
| <code>packages/cli</code> | 5 | <code>packages/cli/src/commands/vibe.ts:103  export function registerVibeCommands(program: Command): void { const vibe = program .command("vibe") .description("Nexus</code> |
| <code>packages/shared</code> | 2 | <code>packages/shared/src/services/index.ts:11  url</code> |
| <code>packages/types</code> | 3 | <code>packages/types/src/models/model-catalog.config.ts:607  _exhaustive</code> |
| <code>scripts</code> | 1 | <code>scripts/check-import-cycles.ts:321  { packageDir, max }</code> |
| <code>scripts/codemods</code> | 1 | <code>scripts/codemods/nx-modal-to-nx-dialog.ts:392  closeIcon</code> |
| <code>tools/mission-control</code> | 6 | <code>tools/mission-control/server/src/db/queries.ts:21  async getQuestStats(): Promise&lt;QuestStats&gt; { const allQuests = await this.db.getAllQuests(); return { byStatus: this.cal</code> |

## Rule: <code>environment: workspace</code>

Units stopped: 116.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 116 | <code>apps/backend/src/_common/filters/prisma-client-exception.filter.ts:270  PrismaClientKnownRequestError</code> |

## Rule: <code>index-assign</code>

Units stopped: 114.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 67 | <code>apps/backend/src/_common/middlewares/sentry-context.middleware.ts:20  req.headers["x-request-id"]</code> |
| <code>apps/frontend</code> | 38 | <code>apps/frontend/src/common/chat/content-parts-accumulator.ts:45  this._parts[index]</code> |
| <code>apps/vibe-agent</code> | 1 | <code>apps/vibe-agent/src/logs/log-chunk.ts:183  out[i]</code> |
| <code>packages/cli</code> | 1 | <code>packages/cli/src/commands/auth.ts:1106  profile[key]</code> |
| <code>packages/shared</code> | 5 | <code>packages/shared/src/modules/chat/store/embedReducers/chatInstance.ts:21  state.chats[chatId]</code> |
| <code>packages/types</code> | 2 | <code>packages/types/src/shared/domain/agents/agent-prompt-conversion.utils.ts:358  results[results.length - 1]</code> |

## Rule: <code>void</code>

Units stopped: 112.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 12 | <code>apps/backend/src/_common/lifecycle/graceful-shutdown.ts:73  void shutdown("SIGTERM")</code> |
| <code>apps/frontend</code> | 100 | <code>apps/frontend/src/modules/Admin/pages/PluginsPage.tsx:80  void refetch()</code> |

## Rule: <code>record-rest</code>

Units stopped: 97.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 62 | <code>apps/backend/src/agent-tool-configs/skill-mention-sync.util.ts:90  ...rest</code> |
| <code>apps/frontend</code> | 27 | <code>apps/frontend/src/common/components/InnerHTML/index.tsx:9  ...rest</code> |
| <code>conflicts/conflict-A-ai-task-service</code> | 3 | <code>conflicts/conflict-A-ai-task-service/file-history/20260306-ANCESTOR.ts:129  ...modelConfig</code> |
| <code>conflicts/conflict-C-prisma-agent-repo</code> | 3 | <code>conflicts/conflict-C-prisma-agent-repo/file-history/20260306-ANCESTOR.ts:251  ...agentRow</code> |
| <code>packages/cli</code> | 1 | <code>packages/cli/src/commands/vibe-watch.ts:309  ...rest</code> |
| <code>packages/types</code> | 1 | <code>packages/types/src/api/public/v1/schemas/skills.schemas.ts:370  ...rest</code> |

## Rule: <code>reference-equality</code>

Units stopped: 95.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 21 | <code>apps/backend/src/agent-tool-configs/skill-mention-sync.util.ts:35  updatedDraft !== draftJson</code> |
| <code>apps/embed</code> | 1 | <code>apps/embed/src/components/EmbedChatView.tsx:194  window.parent !== window</code> |
| <code>apps/frontend</code> | 65 | <code>apps/frontend/src/common/chat/chat-stream-session.ts:160  current === this._cachedApprovalIdsSnap</code> |
| <code>packages/shared</code> | 1 | <code>packages/shared/src/modules/chat/services/chatApi.ts:96  window.self !== window.top</code> |
| <code>packages/types</code> | 6 | <code>packages/types/src/shared/domain/role-coverage/coverage-formula.builder.ts:405  seal&lt;B extends CoveragePeriodBasis&gt;( result: CoverageTerm&lt;AnyCoverageDim, B&gt; ): ValidatedCoverageFormula&lt;B&gt; { this.asser</code> |
| <code>packages/vibe-sdk</code> | 1 | <code>packages/vibe-sdk/src/session.ts:129  this.session !== stale</code> |

## Rule: <code>environment: lockfile</code>

Units stopped: 76.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 1 | <code>apps/backend/src/_common/utils/word-helper.ts:110  xml["w:document"]["w:body"]</code> |
| <code>tools/mission-control</code> | 61 | <code>tools/mission-control/server/src/db/client.ts:119  validated</code> |
| <code>tools/nexus-studio</code> | 14 | <code>tools/nexus-studio/server/src/routes/scenes.ts:77  async (req: Request, res: Response) =&gt; { const sceneId = String(req.params.sceneId); const seeded = readSeededCast(); if</code> |

## Rule: <code>promise-pending</code>

Units stopped: 74.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 59 | <code>apps/backend/src/_common/gateways/middlewares/verify-clerk-jwt.middleware.ts:63  new Promise((resolve, reject) =&gt; { verify(token, getKey, { algorithms: ["RS256"], issuer }, (err, decoded) =&gt; { if (err)</code> |
| <code>apps/frontend</code> | 4 | <code>apps/frontend/src/modules/Analytics/export/chart-to-png.ts:147  new Promise&lt;Blob&gt;((resolve, reject) =&gt; { canvas.toBlob((blob) =&gt; { if (blob === null) { reject(new ChartExportError("The</code> |
| <code>packages/cli</code> | 7 | <code>packages/cli/scripts/test-auth-login.ts:60  new Promise((resolve) =&gt; { const child = spawn("npx", ["tsx", CLI, ...args], { env }); let stdout = ""; let stderr = "";</code> |
| <code>packages/sdk</code> | 1 | <code>packages/sdk/src/resources/tool-connection.ts:100  new Promise((r) =&gt; setTimeout(r, interval))</code> |
| <code>tools/nexus-studio</code> | 3 | <code>tools/nexus-studio/server/src/lib/seed-service.ts:29  new Promise&lt;void&gt;((r) =&gt; setTimeout(r, wait))</code> |

## Rule: <code>react-handler-capture</code>

Units stopped: 73.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/frontend</code> | 71 | <code>apps/frontend/src/common/chat/hooks/use-chat-messages.ts:82  prevRef</code> |
| <code>packages/shared</code> | 2 | <code>packages/shared/src/modules/chat/hooks/useOptimizedGrouping.ts:44  lastProcessedRef</code> |

## Rule: <code>property-assign</code>

Units stopped: 67.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 32 | <code>apps/backend/src/_common/debug/debug.controller.ts:73  @AllowUnauthenticated() @Post("verify") @HttpCode(HttpStatus.OK) verify(@Body() body: unknown, @Req() req: Request): { v</code> |
| <code>apps/frontend</code> | 29 | <code>apps/frontend/src/common/components/Chat/AskUserQuestion/AskUserQuestionFreeTextInput.tsx:53  (inputRef as React.MutableRefObject&lt;HTMLInputElement &#124; null&gt;).current</code> |
| <code>packages/shared</code> | 3 | <code>packages/shared/src/modules/chat/store/embedReducers/streaming.ts:28  chat.streamingMessages[messageId].content</code> |
| <code>scripts/codemods</code> | 1 | <code>scripts/codemods/nx-modal-to-nx-dialog.ts:413  ( empty as unknown as { comments: { type: string; value: string; leading?: boolean; trailing?: boolean }[]; } ).comments</code> |
| <code>tools/mission-control</code> | 2 | <code>tools/mission-control/web/src/components/common/Dialog.tsx:45  document.body.style.overflow</code> |

## Rule: <code>mutation</code>

Units stopped: 66.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 29 | <code>apps/backend/src/_common/utils/error-handler.util.ts:38  export function captureError( error: Error &#124; unknown, context?: { module?: string; operation?: string; userId?: string; </code> |
| <code>apps/frontend</code> | 25 | <code>apps/frontend/src/common/components/RealtimeDevPanel/index.tsx:216  () =&gt; { if (scrollRef.current) { scrollRef.current.scrollTop = scrollRef.current.scrollHeight } }</code> |
| <code>apps/vibe-agent</code> | 1 | <code>apps/vibe-agent/src/nomad/forgejo-jobspec.ts:193  export function buildForgejoJobSpec(input: BuildForgejoJobSpecInput): NomadJobSpec { const baseEnv: Record&lt;string, strin</code> |
| <code>conflicts/conflict-C-prisma-agent-repo</code> | 6 | <code>conflicts/conflict-C-prisma-agent-repo/file-history/20260306-ANCESTOR.ts:397  async update(id: string, data: AgentUpdateData): Promise&lt;AgentEntity&gt; { const row = await this.prisma.agent.update({ whe</code> |
| <code>packages/cli</code> | 2 | <code>packages/cli/src/commands/vibe.ts:1212  async ( appId: string, cmdOpts: { deployBranch?: string; description?: string; requireApprovals?: string; resourceQuotas</code> |
| <code>packages/sdk</code> | 1 | <code>packages/sdk/src/resources/workflow-executions.ts:72  async diagnose(executionId: string, options?: { verbose?: boolean }): Promise&lt;ExecutionDiagnose&gt; { const query: Record&lt;s</code> |
| <code>packages/types</code> | 1 | <code>packages/types/src/shared/domain/tools/aitask.types.ts:98  const sanitizeTaskFormData = &lt;T extends TaskFormData&gt;(data: T): T =&gt; { if (data.category !== DbEnum.AgentTaskCategory.GE</code> |
| <code>tools/mission-control</code> | 1 | <code>tools/mission-control/web/src/pages/EmbedLabPage.tsx:135  () =&gt; { if (history.length &gt; 0 &#124;&#124; !isInitialMount.current) { localStorage.setItem(getStorageKey(environment), JSON.strin</code> |

## Rule: <code>control-flow</code>

Units stopped: 53.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 38 | <code>apps/backend/src/conversations/infrastructure/persistence/find-threads-list.prisma.adapter.ts:144  function buildOrderBy(sortBy: ConversationSort): Prisma.ChatOrderByWithRelationInput[] { switch (sortBy) { case Conversa</code> |
| <code>apps/frontend</code> | 11 | <code>apps/frontend/src/common/utils/knowledge-status.ts:14  export function StatusToProgress(status: DbEnum.KnowledgeStatus): string { switch (status) { case DbEnum.KnowledgeStatus</code> |
| <code>packages/types</code> | 2 | <code>packages/types/src/shared/domain/handshake/handshake.types.ts:178  export function getDefaultHandshakeTtl(type: HandshakeType): number { switch (type) { case HandshakeType.OAUTH_GMAIL: ca</code> |
| <code>tools/mission-control</code> | 2 | <code>tools/mission-control/server/src/db/client.ts:288  private getStatusFolder(status: QuestStatus): string { switch (status) { case 'active': case 'planned': case 'blocked': </code> |

## Rule: <code>spread</code>

Units stopped: 48.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 23 | <code>apps/backend/src/__governance__/module-graph.ts:65  ...block[1].matchAll(/\b([A-Z]\w*Module)\b/g)</code> |
| <code>apps/frontend</code> | 7 | <code>apps/frontend/src/common/components/Chat/ChatSteps/ChainOfThought.tsx:124  ...val</code> |
| <code>packages/types</code> | 5 | <code>packages/types/src/shared/domain/agents/heal-prompt-escape-cascade.ts:98  ...text.matchAll(/\\+/g)</code> |
| <code>scripts</code> | 4 | <code>scripts/ci-migrations-immutable.ts:251  ...MIGRATION_ROOTS</code> |
| <code>scripts/api-codegen</code> | 2 | <code>scripts/api-codegen/path-vars-validator.ts:37  ...path.matchAll(/:([A-Za-z0-9_]+)/g)</code> |
| <code>tools/mission-control</code> | 5 | <code>tools/mission-control/server/src/services/schema-explorer/schema-file.parser.ts:141  ...zodUnionMatch[1].matchAll(/(\w+Schema)\b/g)</code> |
| <code>tools/nexus-studio</code> | 2 | <code>tools/nexus-studio/web/src/hooks/useToast.ts:23  ...prev</code> |

## Rule: <code>generator-effect</code>

Units stopped: 46.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 42 | <code>apps/backend/src/__governance__/controller-files.ts:68  function* walk(node: ts.Node): Generator&lt;ts.Node&gt; { yield node; for (const child of node.getChildren()) yield* walk(chil</code> |
| <code>apps/frontend</code> | 3 | <code>apps/frontend/src/common/chat/conversation-stream/conversation-stream-parser.ts:26  async *parse( stream: ReadableStream&lt;Uint8Array&gt;, signal?: AbortSignal ): AsyncIterable&lt;ParsedConversationStreamFrame&gt; {</code> |
| <code>apps/vibe-log-gateway</code> | 1 | <code>apps/vibe-log-gateway/src/application/follow-log-lines.ts:50  export async function* followLogLines( request: VibeLogStreamRequest, deps: FollowLogLinesDeps ): AsyncGenerator&lt;VibeLog</code> |

## Rule: <code>async-callback</code>

Units stopped: 45.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 38 | <code>apps/backend/src/_common/services/image-processing.service.ts:56  this.sizeVariants.map(async (variant) =&gt; { const processedBuffer = await this.resizeAndOptimize( buffer, variant.width, </code> |
| <code>apps/frontend</code> | 7 | <code>apps/frontend/src/common/components/Chat/PartRenderer/PartRenderer.tsx:95  roots.map((part, rootIndex) =&gt; renderPart(index, part, config, enableActionButtons &amp;&amp; rootIndex === lastTextRootIndex) )</code> |

## Rule: <code>definite-assignment</code>

Units stopped: 43.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 17 | <code>apps/backend/src/_common/streaming/execution-slot/infrastructure/internal/await-release-with-timeout.ts:22  timer: NodeJS.Timeout &#124; undefined</code> |
| <code>apps/frontend</code> | 22 | <code>apps/frontend/src/common/chat/chat-stream-session.ts:193  async sendMessage( content: string, body?: Record&lt;string, unknown&gt;, turnConfig?: TurnConfig ): Promise&lt;void&gt; { if (this.</code> |
| <code>apps/vibe-agent</code> | 1 | <code>apps/vibe-agent/src/reconcile/repo.reconciler.ts:78  token: string</code> |
| <code>packages/cli</code> | 1 | <code>packages/cli/src/commands/execution.ts:178  pollTarget: { token: string } &#124; { id: string }</code> |
| <code>packages/shared</code> | 2 | <code>packages/shared/src/modules/chat/components/feed/ChatFeed.tsx:96  timeoutId: ReturnType&lt;typeof setTimeout&gt; &#124; undefined</code> |

## Rule: <code>promise-all-order</code>

Units stopped: 41.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 39 | <code>apps/backend/src/admin/admin-health.controller.ts:420  async (key) =&gt; { const depth = await this.redis.llen(key); return { queue: key.replace("bull:", "").replace(":wait", "")</code> |
| <code>apps/frontend</code> | 2 | <code>apps/frontend/src/modules/Settings/PhoneNumber/RegulatoryCompliance/ComplianceForm/ComplianceFormWizard.tsx:95  async ([requirementName, docIdx]) =&gt; { const requirement = regulation?.documentRequirements.find( (r) =&gt; r.requirementNa</code> |

## Rule: <code>callback-form</code>

Units stopped: 38.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 17 | <code>apps/backend/src/__governance__/tracked-files.ts:79  options.keep</code> |
| <code>apps/frontend</code> | 19 | <code>apps/frontend/src/common/components/Chat/ChatMessagesView/assistant-segments/renderAssistantSegments.tsx:27  (last, seg, idx) =&gt; (seg.kind === "content" ? idx : last)</code> |
| <code>packages/shared</code> | 1 | <code>packages/shared/src/modules/chat/store/serialization.ts:22  deepSerialize</code> |
| <code>packages/types</code> | 1 | <code>packages/types/src/shared/domain/agents/markdown-parser.ts:1411  () =&gt; crypto.randomUUID()</code> |

## Rule: <code>environment: member</code>

Units stopped: 37.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 14 | <code>apps/backend/src/analytics/attribution/application/deployment-attribution-builder.ts:83  fromEntity(scorableType: DbEnum.ScorableType, id: string &#124; null &#124; undefined): this { if (id != null) this.sources.push((</code> |
| <code>apps/frontend</code> | 12 | <code>apps/frontend/src/common/components/Pickers/GroupPicker/index.tsx:56  groupWithMembers</code> |
| <code>scripts</code> | 10 | <code>scripts/check-import-cycles.ts:59  arg</code> |
| <code>scripts/backfill</code> | 1 | <code>scripts/backfill/detached-phone-number-org.ts:65  sidToSub</code> |

## Rule: <code>classes</code>

Units stopped: 31.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 31 | <code>apps/backend/src/_common/rate-limiter/services/api-rate-limiter.service.ts:605  (error) =&gt; { this.logger.error( `[${providerId}] Failed to process rate limit queue`, error.stack ?? String(error) ); }</code> |

## Rule: <code>library</code>

Units stopped: 30.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 3 | <code>apps/backend/src/documents/services/collection-cache.service.ts:383  (id) =&gt; allDocumentIds.add(id)</code> |
| <code>apps/frontend</code> | 26 | <code>apps/frontend/src/common/hooks/useModelLookup.ts:21  (m) =&gt; map.set(m.id, m)</code> |
| <code>tools/mission-control</code> | 1 | <code>tools/mission-control/server/src/db/queries.ts:93  (tag: string) =&gt; tagSet.add(tag)</code> |

## Rule: <code>global-read</code>

Units stopped: 26.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 7 | <code>apps/backend/src/_common/streaming/durable-stream/infrastructure/internal/live-durable-stream-producer.ts:227  LiveDurableStreamProducer.noopSink</code> |
| <code>apps/frontend</code> | 11 | <code>apps/frontend/src/common/chat/chat-transport.ts:32  AbortSignal</code> |
| <code>packages/cli</code> | 6 | <code>packages/cli/src/commands/auth.ts:85  AbortSignal</code> |
| <code>packages/vibe-sdk</code> | 1 | <code>packages/vibe-sdk/src/transport.ts:74  AbortSignal</code> |
| <code>scripts</code> | 1 | <code>scripts/typecheck-guards.ts:407  require</code> |

## Rule: <code>promise-executor-escape</code>

Units stopped: 25.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 13 | <code>apps/backend/src/_common/utils/error-handler.util.ts:270  new Promise&lt;T&gt;((resolve, reject) =&gt; { sentryService.withScope((scope) =&gt; { if (context?.userId &#124;&#124; context?.organizationI</code> |
| <code>apps/frontend</code> | 11 | <code>apps/frontend/src/common/hooks/useClipboardPermission.tsx:69  new Promise&lt;string&gt;((resolve, reject) =&gt; { pendingReject.current?.(new Error("Superseded by new clipboard request")) pen</code> |
| <code>packages/cli</code> | 1 | <code>packages/cli/src/commands/workspace.ts:347  new Promise&lt;string &#124; null&gt;((resolve) =&gt; { const timer = setTimeout(() =&gt; resolve(null), 2000); child.once("error", (err)</code> |

## Rule: <code>assign-target</code>

Units stopped: 24.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 9 | <code>apps/backend/src/_common/filters/prisma-client-exception.filter.ts:60  Object.assign(this.errorCodesStatusMapping, errorCodesStatusMapping)</code> |
| <code>apps/frontend</code> | 8 | <code>apps/frontend/src/common/hooks/useDebounce.ts:87  Object.assign(invoke, { cancel })</code> |
| <code>scripts/api-codegen</code> | 1 | <code>scripts/api-codegen/config.ts:601  Object.assign(resolved, domain.options)</code> |
| <code>tools/nexus-studio</code> | 6 | <code>tools/nexus-studio/server/src/lib/clerk.ts:28  Object.assign(new Error(`Clerk POST ${path} failed [${res.status}]: ${text}`), { status: res.status, body: text })</code> |

## Rule: <code>in-place-mutation</code>

Units stopped: 24.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 13 | <code>apps/backend/src/__governance__/s3-write-acls.ts:312  sites.sort((a, b) =&gt; `${a.file}:${a.line}`.localeCompare(`${b.file}:${b.line}`))</code> |
| <code>apps/frontend</code> | 9 | <code>apps/frontend/src/modules/Conversations/components/ThreadDetailsPane/AssigneesSection.tsx:80  available.sort((a, b) =&gt; formatMemberName(a, a.userId).localeCompare(formatMemberName(b, b.userId)) )</code> |
| <code>scripts/api-codegen</code> | 1 | <code>scripts/api-codegen/templates/file-structure.ts:62  specifiers .sort((a, b) =&gt; a.name.toLowerCase().localeCompare(b.name.toLowerCase()))</code> |
| <code>tools/mission-control</code> | 1 | <code>tools/mission-control/server/src/db/queries.ts:235  activities .sort((a, b) =&gt; new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())</code> |

## Rule: <code>async</code>

Units stopped: 23.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/frontend</code> | 8 | <code>apps/frontend/src/common/utils/rich-text-editor.ts:62  updateFloatingPosition(referenceEl, floatingEl, options)</code> |
| <code>apps/vibe-agent</code> | 1 | <code>apps/vibe-agent/src/main.ts:325  new Promise&lt;void&gt;((resolve) =&gt; setTimeout(resolve, LEADER_RELEASE_TIMEOUT_MS))</code> |
| <code>apps/vibe-edge-authz</code> | 2 | <code>apps/vibe-edge-authz/src/infrastructure/http/authz-http-server.ts:75  handle(deps, request, response)</code> |
| <code>apps/vibe-log-gateway</code> | 2 | <code>apps/vibe-log-gateway/src/infrastructure/http/log-gateway-http-server.ts:77  handle(deps, request, response)</code> |
| <code>packages/claude-code-skills</code> | 2 | <code>packages/claude-code-skills/shared/helpers.ts:72  runCleanup()</code> |
| <code>packages/cli</code> | 1 | <code>packages/cli/src/commands/vibe-watch.ts:178  waitForEdge(io, options, deployment, baseline, onTransition)</code> |
| <code>packages/shared</code> | 2 | <code>packages/shared/src/modules/chat/components/message/MessageMarkdown.tsx:109  processMarkdown(content)</code> |
| <code>tools/mission-control</code> | 3 | <code>tools/mission-control/server/src/services/schema-explorer/manifest.service.ts:107  loadManifest(manifestPath)</code> |
| <code>tools/nexus-commands-extension</code> | 1 | <code>tools/nexus-commands-extension/src/extension.ts:219  executeCommand(cmd.id, editor)</code> |
| <code>tools/nexus-studio</code> | 1 | <code>tools/nexus-studio/server/src/lib/clerk.ts:270  clerkDelete(`/organizations/${orgId}/memberships/${m.public_user_data.user_id}`)</code> |

## Rule: <code>callbacks</code>

Units stopped: 21.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 7 | <code>apps/backend/src/tools/tools-connector/flux-dev.ts:8  const generateImage = async (input: any) =&gt; { const result = await fal .subscribe("fal-ai/flux-dev", { input: input, log</code> |
| <code>apps/frontend</code> | 14 | <code>apps/frontend/src/common/hooks/useChatStreaming.ts:125  () =&gt; { // Don't connect WebSocket if no chatId (frontend tags) if (!chatId) { return } const newSocket = createSocket()</code> |

## Rule: <code>assignment-expression</code>

Units stopped: 20.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 17 | <code>apps/backend/src/vibe/infrastructure/provisioner/creds/upsert-provisioner-creds.k8s.adapter.ts:63  async execute(): Promise&lt;Result&lt;{ changed: boolean }, VibeProvisionerCredsError&gt;&gt; { const wanted: Record&lt;string, string&gt;</code> |
| <code>apps/frontend</code> | 2 | <code>apps/frontend/src/modules/Tools/UnifiedToolCard.tsx:158  e.currentTarget.src = "/images/placeholder-tool.svg"</code> |
| <code>packages/cli</code> | 1 | <code>packages/cli/src/config.ts:342  cachedConfig ??= loadConfig()</code> |

## Rule: <code>environment: absent</code>

Units stopped: 20.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>conflicts/conflict-A-ai-task-service</code> | 11 | <code>conflicts/conflict-A-ai-task-service/file-history/20260306-ANCESTOR.ts:76  async getAllTasks(organizationId: string) { try { return await this.prisma.aITask.findMany({ where: { organizationId }, </code> |
| <code>tools/nexus-commands-extension</code> | 9 | <code>tools/nexus-commands-extension/src/extension.ts:75  () =&gt; { loadCommands(); vscode.window.showInformationMessage(`Nexus Commands refreshed: ${commands.length} commands load</code> |

## Rule: <code>optional-chain</code>

Units stopped: 20.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 7 | <code>apps/backend/src/chats/code-interpreter/scripts/create-snapshot.ts:157  process.stdin.setRawMode?.(true)</code> |
| <code>apps/frontend</code> | 11 | <code>apps/frontend/src/common/hooks/useWorkflowNodeJob.ts:62  options?.onSuccess?.(result.data)</code> |
| <code>packages/shared</code> | 2 | <code>packages/shared/src/modules/chat/components/message/HtmlTemplateMessage.tsx:42  (event.target as HTMLElement).closest?.("[data-quick-reply]")</code> |

## Rule: <code>numbers</code>

Units stopped: 19.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 1 | <code>apps/backend/src/admin/admin-organizations.controller.ts:133  (org) =&gt; ({ id: org.id, name: org.name, subscriptionType: org.subscriptions[0]?.type ?? null, balance: org.balanceInUSDT</code> |
| <code>apps/frontend</code> | 16 | <code>apps/frontend/src/common/components/UI/Toast/index.tsx:299  (_, i) =&gt; { const depth = i + 1 return ( &lt;div key={`strip-${depth}`} className="rounded-nx-lg bg-nx-surface-bg-base poin</code> |
| <code>packages/shared</code> | 1 | <code>packages/shared/src/modules/chat/hooks/useWhitespacePositioning.ts:73  () =&gt; { if (!enableWhitespace &#124;&#124; !containerRef.current) { setWhitespaceHeight(0) setShouldShowWhitespace(false) return }</code> |
| <code>tools/mission-control</code> | 1 | <code>tools/mission-control/server/src/schema/daily-quest.schema.ts:123  () =&gt; Math.random() - 0.5</code> |

## Rule: <code>foreach</code>

Units stopped: 17.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 2 | <code>apps/backend/src/config/env.validation.ts:641  Object.entries(errors).forEach(([key, value]) =&gt; { if (key !== "_errors" &amp;&amp; value &amp;&amp; typeof value === "object" &amp;&amp; "_erro</code> |
| <code>apps/frontend</code> | 15 | <code>apps/frontend/src/common/components/UI/Toast/index.tsx:319  toasts.forEach((t) =&gt; onClose(t.id))</code> |

## Rule: <code>receiver-mutation</code>

Units stopped: 17.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 14 | <code>apps/backend/src/chats/services/chat-assistant/chat-assistant-integration.service.ts:81  this.handlers</code> |
| <code>apps/frontend</code> | 3 | <code>apps/frontend/src/modules/EmbedChat/voice/embedVoiceCallClient.ts:67  stop(): void { if (this.stopped) return this.stopped = true this.sendControl({ type: "stop" }) this.teardown() this.opts</code> |

## Rule: <code>instanceof-constructor</code>

Units stopped: 15.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 10 | <code>apps/backend/src/_common/filters/prisma-client-exception.filter.ts:273  function isPrismaNotFoundError(e: unknown): e is PrismaClientKnownRequestErrorType { return isPrismaKnownRequestError(e)</code> |
| <code>apps/vibe-log-gateway</code> | 4 | <code>apps/vibe-log-gateway/src/infrastructure/http/log-gateway-http-server.ts:81  async function handle( deps: LogGatewayHttpServerDeps, request: IncomingMessage, response: ServerResponse ): Promise&lt;voi</code> |
| <code>packages/types</code> | 1 | <code>packages/types/src/shared/echo/config.schemas.ts:282  z.ZodObject</code> |

## Rule: <code>mixed-types</code>

Units stopped: 15.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/frontend</code> | 15 | <code>apps/frontend/src/common/utils/oauth/detectOAuthError.ts:53  err?.response?.data?.error === OAUTH_RECONNECTION_REQUIRED_CODE</code> |

## Rule: <code>environment: global-lib</code>

Units stopped: 14.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/nexus-gpt-outlook</code> | 14 | <code>apps/nexus-gpt-outlook/src/commands/commands.ts:29  Office.context.mailbox.item.notificationMessages.removeAsync("ActionPerformanceNotification"); ///\ Check if already any</code> |

## Rule: <code>function-value</code>

Units stopped: 13.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 8 | <code>apps/backend/src/admin-panel/infrastructure/interceptors/audit-meta.ts:195  () =&gt; spec.always?.(context)</code> |
| <code>apps/frontend</code> | 2 | <code>apps/frontend/src/modules/Deployments/views/embed/tabs/AppearanceTab/EditContent/LanguageTabBar.tsx:55  () =&gt; setMenuOpen(false)</code> |
| <code>packages/types</code> | 3 | <code>packages/types/src/shared/domain/agents/markdown-serializer.ts:140  (prose) =&gt; prose</code> |

## Rule: <code>key-order</code>

Units stopped: 12.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 10 | <code>apps/backend/src/_common/providers/docxtemplater/index.ts:18  async generateDocument( url: string, data: any, outputFileType: "docx" &#124; "pdf", options?: { repairPptx?: boolean } ) { c</code> |
| <code>apps/frontend</code> | 2 | <code>apps/frontend/src/common/utils/openapi.ts:702  obj</code> |

## Rule: <code>toplevel-effect</code>

Units stopped: 12.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 6 | <code>apps/backend/src/chats/services/chat-assistant/constants/agent-runner-inline-emitter.source.ts:23  writeChain</code> |
| <code>packages/shared</code> | 6 | <code>packages/shared/src/modules/chat/services/config.ts:37  config</code> |

## Rule: <code>environment: relative</code>

Units stopped: 11.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>conflicts/conflict-A-ai-task-service</code> | 7 | <code>conflicts/conflict-A-ai-task-service/file-history/20260306-ANCESTOR.ts:29  async generatePrompt(dto: GeneratePromptDto): Promise&lt;string&gt; { try { console.log("Generating prompt for task: ", dto); </code> |
| <code>packages/prisma-db</code> | 4 | <code>packages/prisma-db/data/agent-to-tool.seed.ts:18  async function main() { console.log("In main"); // Create tools const tools = ["InternetSearch", "Coding"]; await prisma</code> |

## Rule: <code>math-empty</code>

Units stopped: 10.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 2 | <code>apps/backend/src/cron/execution-logging/application/use-cases/reap-stale-started-executions.use-case.ts:117  Math.max(...withAge.map((w) =&gt; w.ageMs))</code> |
| <code>apps/frontend</code> | 5 | <code>apps/frontend/src/modules/Dashboard/components/charts/RatingGraph.tsx:58  Math.max(...data.map((d) =&gt; d["1"]), ...data.map((d) =&gt; d["0"]))</code> |
| <code>packages/cli</code> | 3 | <code>packages/cli/src/commands/vibe.ts:2115  function registerAuditCommands(vibe: Command, program: Command): void { const audit = vibe.command("audit").description(</code> |

## Rule: <code>number-special</code>

Units stopped: 10.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 8 | <code>apps/backend/src/_common/multer/adaptive-storage.ts:31  NaN</code> |
| <code>apps/frontend</code> | 1 | <code>apps/frontend/src/modules/Workflow/Core/node-config-panel/content/platform-listener/idle/IdleConfigBuilder.tsx:203  NaN</code> |
| <code>packages/types</code> | 1 | <code>packages/types/src/api/public/v1/schemas/channels.schemas.ts:149  NaN</code> |

## Rule: <code>dynamic-eval</code>

Units stopped: 9.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 9 | <code>apps/backend/src/_common/markdown/remark-helper.ts:29  eval</code> |

## Rule: <code>hook-order</code>

Units stopped: 9.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/frontend</code> | 8 | <code>apps/frontend/src/common/components/Button/index.tsx:49  React.isValidElement(icon)</code> |
| <code>packages/shared</code> | 1 | <code>packages/shared/src/components/Button/index.tsx:40  React.cloneElement(icon as React.ReactElement&lt;{ className?: string }&gt;, { className: iconClassName &#124;&#124; "h-4 w-4 text-white</code> |

## Rule: <code>operator-value-context</code>

Units stopped: 9.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 1 | <code>apps/backend/src/vibe/domain/entities/vibe-app.entity.ts:253  logger.warn( `VibeApp ${row.id} has invalid resourceQuotasJson; falling back to defaults: ${parsedQuotas.error.message}`</code> |
| <code>apps/frontend</code> | 7 | <code>apps/frontend/src/common/components/DeploymentAccessControl/SelectedEntitiesList.tsx:43  acc[entity.type] = []</code> |
| <code>apps/vibe-agent</code> | 1 | <code>apps/vibe-agent/src/edge/edge-reachability.prober.ts:119  cursor++</code> |

## Rule: <code>unsupported-operator</code>

Units stopped: 9.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 2 | <code>apps/backend/src/deployments/infrastructure/adapters/telegram/telegram-webhook-handler.adapter.ts:60  async processWebhook(input: { deploymentId: string; connectionId: string; payload: unknown; secretTokenHeader: string &#124; </code> |
| <code>apps/frontend</code> | 3 | <code>apps/frontend/src/modules/Vibe/components/VibeAppIcon.tsx:78  hash ^= name.charCodeAt(index)</code> |
| <code>infra/turbo-remote-cache</code> | 4 | <code>infra/turbo-remote-cache/src/index.ts:106  diff &#124;= presented.charCodeAt(i) ^ expected.charCodeAt(i)</code> |

## Rule: <code>callback-result</code>

Units stopped: 8.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 5 | <code>apps/backend/src/__governance__/s3-write-acls.ts:182  (node): node is ts.InterfaceDeclaration =&gt; ts.isInterfaceDeclaration(node) &amp;&amp; node.name.text === name</code> |
| <code>apps/frontend</code> | 3 | <code>apps/frontend/src/modules/Docs/components/mdx/CodeGroup.tsx:21  (child): child is ReactElement&lt;CodeBlockProps&gt; =&gt; isValidElement&lt;CodeBlockProps&gt;(child)</code> |

## Rule: <code>non-null-assertion</code>

Units stopped: 8.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 1 | <code>apps/backend/scripts/create-sync-sandbox.ts:55  REQUIRED.DAYTONA_SHARED_VOLUME_NAME!</code> |
| <code>tools/mission-control</code> | 6 | <code>tools/mission-control/server/src/db/queries.ts:47  filters.status!</code> |
| <code>tools/nexus-studio</code> | 1 | <code>tools/nexus-studio/server/src/lib/seed-service.ts:73  existing!</code> |

## Rule: <code>environment: relative (generated)</code>

Units stopped: 6.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 4 | <code>apps/backend/src/chats/services/chat-assistant/chat-assistant-integration.service.ts:271  deployment.type</code> |
| <code>apps/frontend</code> | 2 | <code>apps/frontend/src/modules/Deployments/components/DeploymentCard.tsx:123  const MyDeploymentCard = ({ deployment, deleteDeployment, deleteLoading }: MyDeploymentCardProps) =&gt; { const [deleteModa</code> |

## Rule: <code>spread-source</code>

Units stopped: 6.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 2 | <code>apps/backend/src/admin-agent/infrastructure/admin-agent.controller.ts:117  { message, ...(currentView &amp;&amp; { currentView }), history, authorization, threadId, adminUserId, adminUser, signal: abort.</code> |
| <code>apps/frontend</code> | 4 | <code>apps/frontend/src/common/api-client/utils.ts:182  { mutationFn: async ({ data, pathVariables, params, headers, signal }) =&gt; { const baseUrl = typeof config === "string" ?</code> |

## Rule: <code>callback-control</code>

Units stopped: 4.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 3 | <code>apps/backend/src/admin/teams/application/use-cases/list-teams-apps.use-case.ts:77  try { // Decrypt settings if encrypted const rawSettings = safeGetSettings(connection.settings); if (!rawSettings) { thi</code> |
| <code>apps/frontend</code> | 1 | <code>apps/frontend/src/modules/Workflow/Core/InputWithVariables/index.tsx:38  try { metadata = JSON.parse(metadataAttr) } catch { metadata = null }</code> |

## Rule: <code>translator-internal</code>

Units stopped: 4.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 4 | <code>apps/backend/src/_common/formatters/email-html.formatter.ts:158  export function convertMarkdownForEmailSync(markdown: string): MarkdownConversionResult { // Quick synchronous version (</code> |

## Rule: <code>builtin-type</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 3 | <code>apps/backend/src/external/microsoft/teams/graph/groups.api.ts:56  (group): GraphApiGroup =&gt; ({ id: group.id ?? "", displayName: group.displayName ?? "", description: group.description ??</code> |

## Rule: <code>delete</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 1 | <code>apps/backend/src/docs/infrastructure/adapters/fs-read-doc-page.adapter.ts:79  delete process.env.NODE_ENV</code> |
| <code>apps/frontend</code> | 1 | <code>apps/frontend/src/modules/Profiles/ProfilePromptInfo/PromptEditor/extensions/markdown-manager/suggestion-helpers.ts:13  delete (json.attrs as Record&lt;string, unknown&gt;).suggestion</code> |
| <code>tools/nexus-studio</code> | 1 | <code>tools/nexus-studio/server/src/lib/jwt-cache.ts:73  delete disk[k]</code> |

## Rule: <code>environment: global-types</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>tools/mission-control</code> | 2 | <code>tools/mission-control/web/src/pages/SchemaExplorerPage.tsx:42  const onResizeStart = useCallback((e: React.MouseEvent) =&gt; {</code> |
| <code>tools/nexus-studio</code> | 1 | <code>tools/nexus-studio/web/src/pages/permissions/ScenesTab.tsx:105  (e: React.MouseEvent) =&gt; {</code> |

## Rule: <code>loose-equality</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 2 | <code>apps/backend/src/knowledge/services/knowledge-document.service.ts:77  highestQueuePosition != 0</code> |
| <code>apps/frontend</code> | 1 | <code>apps/frontend/src/modules/Settings/contexts/SettingsContext.tsx:39  SettingsState.userInfos?.subscription?.status == "ACTIVE"</code> |

## Rule: <code>promise-executor</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 3 | <code>apps/backend/src/tools/scripts/backup-prompt-json.ts:66  new Promise&lt;void&gt;((resolve, reject) =&gt; stream.end((err?: Error &#124; null) =&gt; (err ? reject(err) : resolve())) )</code> |

## Rule: <code>var</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/nexus-gpt-outlook</code> | 3 | <code>apps/nexus-gpt-outlook/src/taskpane/taskpane.ts:70  var apiUrl = `${apiDomain}/api/chatrooms`;</code> |

## Rule: <code>promises</code>

Units stopped: 2.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/frontend</code> | 2 | <code>apps/frontend/src/modules/Deployments/views/whatsapp/hooks/useWhatsAppSettings.tsx:295  () =&gt; runSave(false)</code> |

## Rule: <code>translator-crash</code>

Units stopped: 2.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/frontend</code> | 2 | <code>apps/frontend/src/common/hooks/useLocalStorage.ts:152  () =&gt; { if (typeof window === "undefined") { console.warn(`[useLocalStorage] cannot remove "${key}" — window is undefine</code> |

## Rule: <code>arrays</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/frontend</code> | 1 | <code>apps/frontend/src/modules/Settings/ModelsSection/ProviderFilter.tsx:24  function ProviderFilter({ selected, onSelect }: ProviderFilterProps) { const providers = MODEL_PROVIDERS return ( &lt;div c</code> |

## Rule: <code>collection-iterator</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 1 | <code>apps/backend/src/tools/ai-tasks/executor/providers/openai/openai-provider.service.ts:179  this.clientCache.keys()</code> |

## Rule: <code>division</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/frontend</code> | 1 | <code>apps/frontend/src/modules/Settings/audit-logs/AuditLogsExportsTab.tsx:69  value /= 1024</code> |

## Rule: <code>exception-callback</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 1 | <code>apps/backend/src/chats/services/chat-assistant/constants/agent-runner.source.ts:1853  preToolUseHook</code> |

## Rule: <code>exception-return</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 1 | <code>apps/backend/src/broker/application/use-cases/open-broker-session.use-case.ts:234  session</code> |

## Rule: <code>exceptions</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 1 | <code>apps/backend/src/admin-agent/application/render-tool-activity.ts:69  export function renderToolActivity(toolCalls: readonly AdminAgentToolCall[]): string &#124; null { if (toolCalls.length === 0</code> |

## Rule: <code>freeze</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 1 | <code>apps/backend/src/chats/domain/value-objects/user-permissions.vo.ts:30  Object.freeze([...allowedIntegrationIds])</code> |

## Rule: <code>keys</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 1 | <code>apps/backend/src/_common/authentication/guards/public-api-key.guard.ts:469  private extractOrganizationId(request: AuthenticatedRequest): string &#124; null { const headerOrg = request.headers[ORGANIZA</code> |

## Rule: <code>members</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/backend</code> | 1 | <code>apps/backend/src/workflow/workflow-engine/workflow-node-executor/utils.ts:31  export function applySampleCap&lt;T&gt;(list: T, cap: number &#124; undefined): T { if (cap === undefined &#124;&#124; !Array.isArray(list)) </code> |

## Rule: <code>mutator-value</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>scripts</code> | 1 | <code>scripts/check-import-cycles.ts:143  queue.pop()</code> |

## Rule: <code>object-method-capture</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/types</code> | 1 | <code>packages/types/src/shared/common/reasoning-timer.ts:13  startTime</code> |

## Rule: <code>object-method-mutation</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/frontend</code> | 1 | <code>apps/frontend/src/modules/UltimateCue/features/mention-picker/extension/mention-picker-extension.ts:114  this.editor</code> |

## Rule: <code>react</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/frontend</code> | 1 | <code>apps/frontend/src/modules/Documents/hooks/useCloudNavigation.ts:87  export function useCloudNavigation( config: UseCloudNavigationConfig = {} ): UseCloudNavigationReturn { const { rootName</code> |

## Rule: <code>this-param</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/frontend</code> | 1 | <code>apps/frontend/src/modules/DocumentTemplates/EditableText/Variables/Variable.tsx:25  this: any</code> |
