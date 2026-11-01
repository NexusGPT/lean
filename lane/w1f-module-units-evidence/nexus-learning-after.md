# Census: <code>nexus-learning</code>

Date: 2026-11-01 (UTC)

Units: 4112. Inside the subset: 1799 (43.8 percent). Refused: 2313. Files unreadable: 0.

Skipped: appledouble/binary 733 (733 AppleDouble, 0 binary), never units.

By stratum (census.mjs stratumOf): written 4084 units (1780 inside, 729 files; 43.6 percent); generated 28 units (19 inside, 4 files); minified 0 units (0 inside, 0 files). The share above is over all code; the regression floor R6 binds that share.

By language: TypeScript 3760 units (1735 inside, 696 files); JavaScript 352 units (64 inside, 37 files).

Beside the 4112 function units: 727 module units (a file's top-level statements, read by lane B; 382 with a top-level import that does not resolve; 37 in JavaScript files) and 518 types units (a file's type-only statements, read through the emitted JavaScript); of the 352 JavaScript units, 126 untyped (refused by the lint as untyped-js, read by lane B).

| Entered | Environment-blocked | Language-refused |
| ---: | ---: | ---: |
| 1799 | 415 | 1258 |

Environment-blocked by kind: lockfile 213, global-node 124, global-lib 54, builtin 18, global-types 5, absent 1.

Of these, refused only on a value whose type does not resolve: 194 (read-after-call 153, unsupported-call 18, type-assertion 7, closure-mutation 5, param-mutation 4, optional-chain 2, react-handler-capture 2, property-assign 1, opaque-mutation 1, unsupported-syntax 1).

Each refused unit is counted once, under the first rule the lint names for it. A unit whose module or global still does not resolve is environment-blocked instead, under `environment: <kind>` of its first such finding.

Directory depth: 2. A dot means the repository root.

## Top five rules by units stopped

| Rule | Units stopped |
| --- | ---: |
| <code>environment: lockfile</code> | 213 |
| <code>ts-strict</code> | 208 |
| <code>copied-argument</code> | 205 |
| <code>read-after-call</code> | 178 |
| <code>type-assertion</code> | 177 |

## Rule: <code>environment: lockfile</code>

Units stopped: 213.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 117 | <code>apps/web/app/(learner)/achievements/page.tsx:9  (await serverT())("nav.achievements")</code> |
| <code>packages/claude-code-skills</code> | 1 | <code>packages/claude-code-skills/scripts/cli-surface.ts:186  root</code> |
| <code>packages/cli</code> | 23 | <code>packages/cli/src/commands/assign.ts:285  async (id: string) =&gt; { const context = getContext(); // The rule is read first so the answer can say what was deleted: </code> |
| <code>packages/core</code> | 7 | <code>packages/core/src/progress/levels.ts:130  ups</code> |
| <code>packages/storage</code> | 8 | <code>packages/storage/src/supabase/supabase-storage.ts:293  (from, to) =&gt; { let query = this.db.from(table).select("*"); for (const filter of filters) { switch (filter[0]) { case "</code> |
| <code>packages/ui</code> | 57 | <code>packages/ui/src/app-shell.tsx:79  &lt;span</code> |

## Rule: <code>ts-strict</code>

Units stopped: 208.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 156 | <code>apps/web/app/(learner)/assignments/[uid]/page.tsx:127  &lt;Card data-locked="true" className="max-w-[820px] items-start gap-3 p-6"&gt;</code> |
| <code>docs/design</code> | 15 | <code>docs/design/canvas/build.mjs:296  ${badge(s, k)}</code> |
| <code>packages/api-client</code> | 1 | <code>packages/api-client/src/client.ts:98  const webCrypto = globalThis.crypto as { randomUUID?: () =&gt; string } &#124; undefined;</code> |
| <code>packages/cli</code> | 11 | <code>packages/cli/src/answers.ts:100  return (Object.keys(EXAMPLE) as QuestionType[]).map((type) =&gt; ({</code> |
| <code>packages/content</code> | 1 | <code>packages/content/src/cli.ts:78  stdout: (text) =&gt; process.stdout.write(text),</code> |
| <code>packages/core</code> | 9 | <code>packages/core/src/api-key.ts:72  globalThis.crypto.getRandomValues(new Uint8Array(length));</code> |
| <code>packages/storage</code> | 5 | <code>packages/storage/src/base-storage.ts:147  return globalThis.crypto.randomUUID();</code> |
| <code>packages/telemetry</code> | 1 | <code>packages/telemetry/src/telemetry.ts:65  return globalThis.crypto.randomUUID().replace(/-/g, "");</code> |
| <code>packages/ui</code> | 8 | <code>packages/ui/src/app-shell.tsx:185  className,</code> |
| <code>scripts</code> | 1 | <code>scripts/check-demo.mjs:137  export async function checkDemo({ markdown, baseUrl, fetch: doFetch = globalThis.fetch }) {</code> |

## Rule: <code>copied-argument</code>

Units stopped: 205.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 77 | <code>apps/web/app/(manage)/manage/cohorts/actions.ts:213  async (session, raw) =&gt; { const input = z .object({ cohortId: Id, sessionId: Id, recordingPlaybackId: OptionalText }) .p</code> |
| <code>packages/api-client</code> | 1 | <code>packages/api-client/src/errors.ts:76  constructor( message: string, operation: string, requestId: string, options: { cause?: unknown; timedOut?: boolean; abor</code> |
| <code>packages/api-contract</code> | 2 | <code>packages/api-contract/src/envelope.ts:98  export function okEnvelope&lt;T extends z.ZodType&gt;(data: T) { return z.object({ ok: z.literal(true), data }); }</code> |
| <code>packages/cli</code> | 106 | <code>packages/cli/src/commands/assign.ts:177  async (options: CreateOptions) =&gt; { const context = getContext(); const audience = audienceFrom(options); if (!audience)</code> |
| <code>packages/content</code> | 3 | <code>packages/content/src/index-builder.ts:54  (issue) =&gt; error({ code: "index-invalid", file: null, path: formatPath(issue.path) &#124;&#124; null, message: issue.message, hint</code> |
| <code>packages/core</code> | 5 | <code>packages/core/src/credentials/ids.ts:37  export async function verificationIdFor( secret: string, input: VerificationIdInput, ): Promise&lt;string&gt; { const digest =</code> |
| <code>packages/schema</code> | 2 | <code>packages/schema/src/issues.ts:13  export function addIssue( ctx: z.core.$RefinementCtx, path: readonly (string &#124; number)[], message: string, ): void { ctx</code> |
| <code>packages/storage</code> | 6 | <code>packages/storage/scripts/check-schema.ts:212  export async function readTarget(dbUrl: string): Promise&lt;Reading&gt; { const client = new Client({ connectionString: dbUrl,</code> |
| <code>scripts</code> | 3 | <code>scripts/seed-demo.ts:41  export async function loadIndex( curriculumDir = path.join(root, "curriculum"), ): Promise&lt;ContentIndex&gt; { const result </code> |

## Rule: <code>read-after-call</code>

Units stopped: 178.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 84 | <code>apps/web/app/(learner)/catalog/page.tsx:74  paths</code> |
| <code>docs/design</code> | 8 | <code>docs/design/canvas/warm-extra.mjs:58  ([ic, t, title, body, when, unread, action], i) =&gt; { const [bg, fg] = tone(t); return ` &lt;div style="display: grid; grid-</code> |
| <code>packages/claude-code-skills</code> | 3 | <code>packages/claude-code-skills/scripts/cli-surface.ts:72  function walk(node: Command, prefix: string[], into: Map&lt;string, Command&gt;): void { for (const child of node.commands) { </code> |
| <code>packages/cli</code> | 20 | <code>packages/cli/src/commands/auth.ts:89  async function whoami(context: Context): Promise&lt;void&gt; { const { settings } = context; const kind = authenticatedWith(se</code> |
| <code>packages/content</code> | 16 | <code>packages/content/src/report.ts:62  function courseLines(course: LoadedCourse): string[] { const lines = [ `- **${course.data.uid}** · ${textOf(course.data.</code> |
| <code>packages/core</code> | 32 | <code>packages/core/src/assignment/pregrade.ts:82  suggest(request: PregradeRequest): Promise&lt;PregradeSuggestion&gt; { const words = wordCount(request.submission.text); const</code> |
| <code>packages/schema</code> | 3 | <code>packages/schema/src/quiz.ts:17  function uniqueIds( ctx: Ctx, list: readonly { id: string }[], path: readonly (string &#124; number)[], what: string, ): void</code> |
| <code>packages/storage</code> | 7 | <code>packages/storage/src/base-storage.ts:196  async counts(): Promise&lt;Record&lt;string, number&gt;&gt; { const counts: Record&lt;string, number&gt; = {}; for (const table of this.en</code> |
| <code>scripts</code> | 5 | <code>scripts/check-demo.mjs:225  export function setCookie(response) { const headers = response.headers; const raw = headers.getSetCookie ? headers.getSe</code> |

## Rule: <code>type-assertion</code>

Units stopped: 177.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 49 | <code>apps/web/app/(manage)/manage/cohorts/actions.ts:65  value</code> |
| <code>docs/design</code> | 6 | <code>docs/design/canvas/build.mjs:321  a + l[2]</code> |
| <code>packages/api-contract</code> | 9 | <code>packages/api-contract/src/auth.ts:109  { timeZone: value }</code> |
| <code>packages/claude-code-skills</code> | 8 | <code>packages/claude-code-skills/scripts/cli-surface.ts:112  { operation, method: route.method, path: route.path, summary: route.summary }</code> |
| <code>packages/cli</code> | 22 | <code>packages/cli/src/input.ts:77  export async function scoresFrom( value: string, stdin: Readable, ): Promise&lt;{ criterionId: string; score: number }[]&gt; {</code> |
| <code>packages/content</code> | 16 | <code>packages/content/src/mdx-facts.ts:206  tree as Node</code> |
| <code>packages/core</code> | 28 | <code>packages/core/src/credentials/jws.ts:60  jwk.x</code> |
| <code>packages/schema</code> | 30 | <code>packages/schema/src/assignment.ts:69  kind</code> |
| <code>packages/storage</code> | 1 | <code>packages/storage/src/engine.ts:57  current</code> |
| <code>scripts</code> | 8 | <code>scripts/check-demo.mjs:77  a.target.localeCompare(b.target)</code> |

## Rule: <code>environment: global-node</code>

Units stopped: 124.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 74 | <code>apps/web/app/api/dev/identity/route.ts:34  data: { identity: parseServerIdentity(process.env[SERVER_IDENTITY_VARIABLE]) },</code> |
| <code>packages/cli</code> | 16 | <code>packages/cli/src/input.ts:22  const chunks: Buffer[] = [];</code> |
| <code>packages/storage</code> | 7 | <code>packages/storage/src/backend.ts:98  const temporary = `${target}.${process.pid}.${this.counter}.tmp`;</code> |
| <code>scripts</code> | 21 | <code>scripts/check-vercel-env.mjs:269  export function operatorCredentials(env = process.env) {</code> |
| <code>scripts/hooks</code> | 6 | <code>scripts/hooks/_lib.mjs:33  export const skip = () =&gt; process.env.MISSION_HOOKS_SKIP === "1";</code> |

## Rule: <code>untyped-js</code>

Units stopped: 115.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 4 | <code>apps/web/scripts/scan-ui-strings.mjs:37  text</code> |
| <code>docs/design</code> | 56 | <code>docs/design/canvas/build.mjs:48  name</code> |
| <code>scripts</code> | 40 | <code>scripts/check-demo.mjs:77  (a, b) =&gt; a.target.localeCompare(b.target)</code> |
| <code>scripts/hooks</code> | 15 | <code>scripts/hooks/_lib.mjs:19  p</code> |

## Rule: <code>spread</code>

Units stopped: 57.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 16 | <code>apps/web/app/(learner)/calendar/actions.ts:51  ...formData.entries()</code> |
| <code>packages/api-contract</code> | 1 | <code>packages/api-contract/src/routes.ts:1233  ...path.matchAll(/:([A-Za-z]+)/g)</code> |
| <code>packages/claude-code-skills</code> | 5 | <code>packages/claude-code-skills/scripts/invocations.ts:17  ...flags.matchAll(/(--?[A-Za-z][\w-]*)/g)</code> |
| <code>packages/cli</code> | 11 | <code>packages/cli/src/markdown/lesson.ts:119  ...lesson.rubric.flatMap((criterion): RootContent[] =&gt; [ heading(3, `${criterion.criterion} (weight ${criterion.weight})</code> |
| <code>packages/content</code> | 5 | <code>packages/content/src/load.ts:106  ...issue.message.matchAll(/'([^']*)'/g)</code> |
| <code>packages/core</code> | 12 | <code>packages/core/src/community/markdown.ts:61  ...url</code> |
| <code>packages/storage</code> | 3 | <code>packages/storage/src/demo-seed.ts:146  ...course.modules.flatMap((module) =&gt; [module.uid, ...module.lessons.map((l) =&gt; l.uid)])</code> |
| <code>packages/ui</code> | 2 | <code>packages/ui/src/toast.tsx:68  ...all</code> |
| <code>scripts</code> | 2 | <code>scripts/cli-smoke.mjs:86  ...usage.matchAll(/&lt;([^&gt;]+)&gt;/g)</code> |

## Rule: <code>environment: global-lib</code>

Units stopped: 54.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/api-client</code> | 3 | <code>packages/api-client/src/client.ts:123  const search = new URLSearchParams();</code> |
| <code>packages/cli</code> | 5 | <code>packages/cli/src/commands/credential.ts:76  new URL(answer.downloads.pdf, client.baseUrl).toString(),</code> |
| <code>packages/core</code> | 13 | <code>packages/core/src/api-key.ts:94  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));</code> |
| <code>packages/storage</code> | 1 | <code>packages/storage/scripts/check-schema.ts:240  const out = options.out ?? console;</code> |
| <code>packages/telemetry</code> | 2 | <code>packages/telemetry/src/dsn.ts:22  let url: URL;</code> |
| <code>scripts</code> | 29 | <code>scripts/check-vercel-env.mjs:284  const url = new URL(`https://api.vercel.com${pathname}`);</code> |
| <code>scripts/hooks</code> | 1 | <code>scripts/hooks/self-test.mjs:30  console.log(`${ok ? "ok " : "FAIL"} ${name} → ${r.decision}${ok ? "" : ` (wanted ${want})`}${r.decision !== "allow" ? " </code> |

## Rule: <code>index-assign</code>

Units stopped: 35.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 32 | <code>apps/web/app/(learner)/actions.ts:66  out[key]</code> |
| <code>packages/content</code> | 2 | <code>packages/content/src/cli.ts:71  options[flag.slice(2) as "dir" &#124; "out" &#124; "report" &#124; "base"]</code> |
| <code>packages/core</code> | 1 | <code>packages/core/src/organization/tree.ts:153  counts[membership.role]</code> |

## Rule: <code>reference-key</code>

Units stopped: 25.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 6 | <code>apps/web/components/review/review-panel.tsx:265  (row) =&gt; ( &lt;div key={row.criterionId} data-testid="suggested-score" className="grid gap-1.5 text-[14px] sm:grid-cols-[20</code> |
| <code>packages/cli</code> | 8 | <code>packages/cli/src/markdown/lesson.ts:270  export function checklistMarkdown(lesson: LessonDetail, options: { width?: number } = {}): string { if (lesson.type !== </code> |
| <code>packages/content</code> | 2 | <code>packages/content/src/index-builder.ts:28  export function buildIndex(curriculum: Curriculum): BuiltIndex { if (!curriculum.policy) return { index: null, issues: [</code> |
| <code>packages/core</code> | 2 | <code>packages/core/src/progress/checklist.ts:69  (item) =&gt; checked.has(item.id)</code> |
| <code>packages/schema</code> | 4 | <code>packages/schema/src/path.ts:50  (course, index) =&gt; { course.prerequisites.forEach((prerequisite, position) =&gt; { const path_ = ["courses", index, "prereq</code> |
| <code>scripts</code> | 3 | <code>scripts/check-env-example.mjs:21  export function specVariables(markdown) { const section = markdown.split(/^## Environment\s*$/m)[1]?.split(/^## /m)[0] ?</code> |

## Rule: <code>alias-mutation</code>

Units stopped: 24.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 7 | <code>apps/web/app/(learner)/calendar/page.tsx:133  held.push(chip)</code> |
| <code>docs/design</code> | 2 | <code>docs/design/canvas/build.mjs:389  l[3]</code> |
| <code>packages/api-contract</code> | 1 | <code>packages/api-contract/src/openapi.ts:459  item[route.method.toLowerCase()]</code> |
| <code>packages/claude-code-skills</code> | 3 | <code>packages/claude-code-skills/src/spec.ts:96  export function specCommandTree(text: string = readSpec()): string[] { return specCommandEntries(text).map((entry) =&gt; en</code> |
| <code>packages/cli</code> | 1 | <code>packages/cli/src/markdown/render.ts:119  function mapInline(nodes: PhrasingContent[], context: MarkdownContext): PhrasingContent[] { const out: PhrasingContent[]</code> |
| <code>packages/content</code> | 2 | <code>packages/content/src/mdx-facts.ts:174  function visit(node: Node, facts: MdxFacts): void { const line = node.position?.start.line ?? null; const kind = kindOf(</code> |
| <code>packages/core</code> | 7 | <code>packages/core/src/community/thread.ts:78  held.push(post(comment))</code> |
| <code>scripts</code> | 1 | <code>scripts/check-vercel-env.mjs:138  export function specTables(markdown) { const section = markdown.split(/^## Environment\s*$/m)[1]?.split(/^## /m)[0] ?? "</code> |

## Rule: <code>param-mutation</code>

Units stopped: 23.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 11 | <code>apps/web/components/organization/department-tree.tsx:40  open.add(id)</code> |
| <code>packages/claude-code-skills</code> | 1 | <code>packages/claude-code-skills/scripts/shipped.ts:47  found.push({ path: relative, kind: kindOf(relative) })</code> |
| <code>packages/cli</code> | 5 | <code>packages/cli/src/render.ts:195  out.push(`${index === 0 ? indent : hanging}${piece}`.trimEnd())</code> |
| <code>packages/content</code> | 2 | <code>packages/content/src/rules/images.ts:25  issues.push( error({ code, file: from, line, path, message: `${what} "${target}" resolves to ${resolved ?? "outside the </code> |
| <code>packages/core</code> | 1 | <code>packages/core/src/community/markdown.ts:109  held.push(html)</code> |
| <code>packages/storage</code> | 2 | <code>packages/storage/src/files/memory-files.ts:33  this.rows.set(input.key, row)</code> |
| <code>scripts</code> | 1 | <code>scripts/check-vercel-env.mjs:163  (table.deployed ? deployed : never).add(name)</code> |

## Rule: <code>environment: builtin</code>

Units stopped: 18.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 2 | <code>apps/web/lib/credentials/keys.ts:85  function jwksOf(key: KeyObject, shape: PrivateKeyShape): ParsedPrivateKey { const exported = assertEd25519(key).export({</code> |
| <code>packages/api-client</code> | 1 | <code>packages/api-client/scripts/render.ts:86  lines</code> |
| <code>packages/claude-code-skills</code> | 3 | <code>packages/claude-code-skills/scripts/plan.ts:108  files</code> |
| <code>packages/cli</code> | 1 | <code>packages/cli/src/skills.ts:296  readdirSync(source).sort()</code> |
| <code>packages/content</code> | 3 | <code>packages/content/src/build.ts:23  export async function buildContent(options: BuildOptions): Promise&lt;BuildResult&gt; { const result = await validateCurriculu</code> |
| <code>scripts</code> | 8 | <code>scripts/check-env-example.mjs:64  spec</code> |

## Rule: <code>dynamic-key</code>

Units stopped: 15.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 3 | <code>apps/web/components/design-system/questions.tsx:122  delete next[question.id]</code> |
| <code>docs/design</code> | 2 | <code>docs/design/canvas/build.mjs:335  type[0]</code> |
| <code>packages/cli</code> | 2 | <code>packages/cli/src/errors.ts:388  HELP_FOR_CODE[error.code]</code> |
| <code>packages/core</code> | 8 | <code>packages/core/src/assignment/upload.ts:199  bytes[i]</code> |

## Rule: <code>mutation</code>

Units stopped: 13.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 10 | <code>apps/web/components/learner/lesson-video.tsx:144  (next) =&gt; { failures.current = 0; setGrant(next); setStatus(next ? "ready" : "unavailable"); if (!next) return; mintAgai</code> |
| <code>packages/api-contract</code> | 3 | <code>packages/api-contract/src/openapi.ts:176  function withoutRootKeys(schema: Json): Json { const result = { ...schema }; delete result.$id; delete result.$schema; r</code> |

## Rule: <code>closure-mutation</code>

Units stopped: 12.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 5 | <code>apps/web/lib/api/progress.ts:396  checklist</code> |
| <code>packages/core</code> | 4 | <code>packages/core/src/clock.ts:23  current</code> |
| <code>packages/schema</code> | 1 | <code>packages/schema/src/content-index.ts:215  resolved</code> |
| <code>packages/storage</code> | 1 | <code>packages/storage/src/demo-seed.ts:201  created</code> |
| <code>scripts</code> | 1 | <code>scripts/mux-upload.ts:80  rest.shift()</code> |

## Rule: <code>prototype</code>

Units stopped: 12.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/api-contract</code> | 3 | <code>packages/api-contract/src/openapi.ts:343  result[id]</code> |
| <code>packages/cli</code> | 1 | <code>packages/cli/src/program.ts:105  key in merged</code> |
| <code>packages/core</code> | 6 | <code>packages/core/src/quiz/attempt.ts:278  patch[questionId]</code> |
| <code>packages/storage</code> | 1 | <code>packages/storage/src/supabase/supabase-storage.ts:439  answers[questionId]</code> |
| <code>scripts</code> | 1 | <code>scripts/supabase-test.mjs:32  found[target]</code> |

## Rule: <code>unsupported-call</code>

Units stopped: 10.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 5 | <code>apps/web/components/theme-provider.tsx:45  listeners.forEach((listener) =&gt; listener())</code> |
| <code>docs/design</code> | 1 | <code>docs/design/canvas/warm-mobile.mjs:254  xp.toLocaleString("en-US")</code> |
| <code>packages/core</code> | 2 | <code>packages/core/src/organization/path.ts:113  new Set(taken)</code> |
| <code>packages/storage</code> | 2 | <code>packages/storage/src/engine.ts:28  (async () =&gt; { try { const rows = (await this.backend.load(table)) ?? []; // A write that committed meanwhile owns the e</code> |

## Rule: <code>unsupported-member</code>

Units stopped: 10.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 1 | <code>apps/web/lib/brief-markdown.ts:36  match.index</code> |
| <code>packages/api-contract</code> | 1 | <code>packages/api-contract/src/routes.ts:1233  match[1]</code> |
| <code>packages/claude-code-skills</code> | 6 | <code>packages/claude-code-skills/scripts/claims.ts:206  opened[2]</code> |
| <code>packages/cli</code> | 1 | <code>packages/cli/src/markdown/quiz.ts:150  match.index</code> |
| <code>packages/ui</code> | 1 | <code>packages/ui/src/quiz/text-question.tsx:79  match.index</code> |

## Rule: <code>async</code>

Units stopped: 9.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 9 | <code>apps/web/app/(learner)/courses/[uid]/page.tsx:50  load((await params).uid)</code> |

## Rule: <code>definite-assignment</code>

Units stopped: 8.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 2 | <code>apps/web/components/learner/lesson-video.tsx:136  timer: ReturnType&lt;typeof setTimeout&gt; &#124; undefined</code> |
| <code>packages/core</code> | 6 | <code>packages/core/src/time.ts:58  parts</code> |

## Rule: <code>in-place-mutation</code>

Units stopped: 8.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 2 | <code>apps/web/lib/api/dashboard.ts:358  rows.sort(byStandingThenName)</code> |
| <code>packages/core</code> | 3 | <code>packages/core/src/progress/achievements.ts:223  events.sort(byNewest)</code> |
| <code>packages/storage</code> | 1 | <code>packages/storage/src/supabase/supabase-storage.ts:543  rows.sort((a, b) =&gt; a.path.localeCompare(b.path) &#124;&#124; a.id.localeCompare(b.id))</code> |
| <code>packages/telemetry</code> | 2 | <code>packages/telemetry/src/envelope.ts:70  frames.reverse()</code> |

## Rule: <code>promise</code>

Units stopped: 8.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 5 | <code>apps/web/lib/api/assignment.ts:292  submissionRow({ viewer, lesson, submission, reviews: bySubmission.get(submission.id) ?? [], readerId, names, })</code> |
| <code>packages/storage</code> | 1 | <code>packages/storage/src/supabase/supabase-storage.ts:994  this.row("enrollments", [ ["eq", "user_id", input.userId], ["eq", "org_id", input.orgId], ["eq", "target_type", input.ta</code> |
| <code>scripts</code> | 2 | <code>scripts/dev-local.mjs:85  new Promise((resolve) =&gt; { const child = spawn(command, args, { cwd, env, stdio: "inherit" }); /** @param {NodeJS.Signal</code> |

## Rule: <code>record-rest</code>

Units stopped: 8.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 6 | <code>apps/web/app/(manage)/manage/cohorts/actions.ts:196  ...body</code> |
| <code>packages/ui</code> | 2 | <code>packages/ui/src/mdx/steps.tsx:28  ...rest</code> |

## Rule: <code>function-value</code>

Units stopped: 7.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/core</code> | 3 | <code>packages/core/src/progress/next-up.ts:101  (lesson) =&gt; lesson.type === "session"</code> |
| <code>packages/storage</code> | 4 | <code>packages/storage/src/files/memory-files.ts:19  () =&gt; { assertFileKey(input.key); // Write-once, like every adapter behind this port. A map read and a map write cannot </code> |

## Rule: <code>numbers</code>

Units stopped: 7.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 4 | <code>apps/web/components/auth/sign-in-screen.tsx:117  (feature) =&gt; ( &lt;li key={feature.key} className="flex items-center gap-[14px]"&gt; &lt;span className="flex size-9 shrink-0 ite</code> |
| <code>docs/design</code> | 2 | <code>docs/design/canvas/warm-mobile.mjs:93  (a, i) =&gt; ` &lt;div style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; ${i &lt; D.assigned.length - 1 ?</code> |
| <code>packages/ui</code> | 1 | <code>packages/ui/src/mdx/resources.tsx:39  (item) =&gt; ( &lt;li key={item.url}&gt; &lt;a href={item.url} className="inline-flex items-center gap-2 rounded-nav text-[15px] foc</code> |

## Rule: <code>unsupported-syntax</code>

Units stopped: 7.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 1 | <code>apps/web/app/auth/callback/route.ts:44  { email }</code> |
| <code>packages/core</code> | 2 | <code>packages/core/src/quiz/draw.ts:24  [pool[i], pool[j]]</code> |
| <code>packages/ui</code> | 4 | <code>packages/ui/src/app-shell.tsx:105  Link</code> |

## Rule: <code>callback-form</code>

Units stopped: 6.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 1 | <code>apps/web/lib/curriculum-assets.ts:40  encodeURIComponent</code> |
| <code>docs/design</code> | 1 | <code>docs/design/canvas/warm-screens.mjs:101  treeRow</code> |
| <code>packages/content</code> | 3 | <code>packages/content/src/load.ts:400  compareStrings</code> |
| <code>packages/core</code> | 1 | <code>packages/core/src/credentials/did.ts:47  decodeURIComponent</code> |

## Rule: <code>library</code>

Units stopped: 6.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 1 | <code>apps/web/components/mdx/chapter-marks.ts:39  export function chapterAt( chapters: readonly { at: number }[], positionSeconds: number, ): number &#124; undefined { let fou</code> |
| <code>packages/claude-code-skills</code> | 1 | <code>packages/claude-code-skills/scripts/invocations.ts:74  export function bareFlagsIn(document: string): { flag: string; line: number }[] { const found: { flag: string; line: num</code> |
| <code>packages/core</code> | 4 | <code>packages/core/src/progress/leaderboard.ts:78  export function rankByXp&lt;T extends LeaderboardTotal&gt;( totals: readonly T[], ): (T &amp; { rank: number })[] { const ordered </code> |

## Rule: <code>non-null-assertion</code>

Units stopped: 6.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 2 | <code>apps/web/lib/review-form.ts:103  state.scores[criterion.id]!</code> |
| <code>packages/core</code> | 4 | <code>packages/core/src/manage/dashboard.ts:117  sorted[middle]!</code> |

## Rule: <code>async-callback</code>

Units stopped: 5.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 5 | <code>apps/web/lib/api/assignment.ts:291  attempts.map((submission) =&gt; submissionRow({ viewer, lesson, submission, reviews: bySubmission.get(submission.id) ?? [],</code> |

## Rule: <code>environment: global-types</code>

Units stopped: 5.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 5 | <code>apps/web/app/(manage)/manage/organization/page.tsx:642  ): React.ReactNode {</code> |

## Rule: <code>math-empty</code>

Units stopped: 5.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/cli</code> | 1 | <code>packages/cli/src/answers.ts:110  Math.max(...types.map((type) =&gt; type.length))</code> |
| <code>packages/core</code> | 4 | <code>packages/core/src/assignment/rubric.ts:41  Math.min(...scores)</code> |

## Rule: <code>unsupported-operator</code>

Units stopped: 5.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/core</code> | 5 | <code>packages/core/src/api-key.ts:147  difference &#124;= left.charCodeAt(index) ^ right.charCodeAt(index)</code> |

## Rule: <code>captured-mutable</code>

Units stopped: 4.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/core</code> | 1 | <code>packages/core/src/quiz/public.ts:212  n</code> |
| <code>packages/schema</code> | 1 | <code>packages/schema/src/content-index.ts:215  resolved</code> |
| <code>scripts</code> | 2 | <code>scripts/check-vercel-env.mjs:430  held</code> |

## Rule: <code>names</code>

Units stopped: 4.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 2 | <code>apps/web/components/learner/lesson-thread.tsx:72  function Upvote({ post, uid, t }: { post: ThreadPost; uid: string; t: TFunction }) { return ( &lt;form action={voteCommentA</code> |
| <code>packages/storage</code> | 2 | <code>packages/storage/src/base-storage.ts:188  constructor(backend: TableBackend, options: BaseStorageOptions) { this.engine = new TableEngine(backend); this.ids = opt</code> |

## Rule: <code>property-assign</code>

Units stopped: 4.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 4 | <code>apps/web/components/settings/locale-switch.tsx:45  document.cookie</code> |

## Rule: <code>bitwise</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/cli</code> | 3 | <code>packages/cli/src/skills.ts:300  (relative) =&gt; ({ relative, content: readFileSync(path.join(dir, relative), "utf8"), executable: isExecutable(path.join(d</code> |

## Rule: <code>control-flow</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 2 | <code>apps/web/lib/api/assignment.ts:403  function refuseUpload( refusal: "empty" &#124; "type" &#124; "size", rules: { acceptedFileTypes: readonly string[]; maxFileMb: num</code> |
| <code>packages/storage</code> | 1 | <code>packages/storage/src/supabase/client.ts:53  export async function readRows( what: string, page: (from: number, to: number) =&gt; PromiseLike&lt;RowsResult&gt;, ): Promise&lt;Db</code> |

## Rule: <code>global-read</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/core</code> | 1 | <code>packages/core/src/credentials/encoding.ts:48  export function decodeJsonSegment(segment: string): unknown { try { return JSON.parse(decoder.decode(base64UrlDecode(seg</code> |
| <code>packages/ui</code> | 2 | <code>packages/ui/src/quiz/matching.tsx:73  pick</code> |

## Rule: <code>mixed-types</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 3 | <code>apps/web/app/(learner)/leaderboard/page.tsx:29  period === value</code> |

## Rule: <code>reference-equality</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 3 | <code>apps/web/components/quiz/quiz-runner.tsx:455  document.activeElement === document.body</code> |

## Rule: <code>assignment-expression</code>

Units stopped: 2.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 2 | <code>apps/web/lib/telemetry.ts:52  store[TELEMETRY] ??= telemetryFromEnv()</code> |

## Rule: <code>callbacks</code>

Units stopped: 2.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 2 | <code>apps/web/lib/api/sessions.ts:388  async function registerOf( app: App, cohort: Cohort, row: CohortSession, ): Promise&lt;SessionRegisterResponse&gt; { const [me</code> |

## Rule: <code>exception-callback</code>

Units stopped: 2.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 1 | <code>apps/web/lib/video/use-video-position.ts:87  writePosition</code> |
| <code>scripts</code> | 1 | <code>scripts/fresh-profile.mjs:121  isAlive</code> |

## Rule: <code>this</code>

Units stopped: 2.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/storage</code> | 2 | <code>packages/storage/src/base-storage.ts:659  this.ids()</code> |

## Rule: <code>assign-target</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 1 | <code>apps/web/components/quiz/quiz-runner.tsx:254  Object.assign(payload, entry)</code> |

## Rule: <code>callback-control</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 1 | <code>apps/web/scripts/scan-ui-strings.mjs:122  try { return statSync(dir).isDirectory(); } catch { return false; }</code> |

## Rule: <code>collection-iterator</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 1 | <code>apps/web/lib/api/achievements.ts:109  viewer.rows.values()</code> |

## Rule: <code>destructuring</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 1 | <code>apps/web/lib/leaderboard-view.ts:106  export function standingGap(standing: LeaderboardStanding, translate: TFunction): string { const [first, ...rest] = stan</code> |

## Rule: <code>environment: absent</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/cli</code> | 1 | <code>packages/cli/src/markdown/render.ts:104  { ...node, children } as RootContent</code> |

## Rule: <code>generator-effect</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/content</code> | 1 | <code>packages/content/src/tree.ts:109  export function* lessonsOf(curriculum: Curriculum): Generator&lt;{ course: LoadedCourse; module: LoadedModule; moduleIndex:</code> |

## Rule: <code>object-method-capture</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/core</code> | 1 | <code>packages/core/src/progress/lookup.ts:66  lessons</code> |

## Rule: <code>operator-value-context</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 1 | <code>apps/web/scripts/tick.ts:46  ++index</code> |

## Rule: <code>promise-all-order</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>apps/web</code> | 1 | <code>apps/web/lib/api/organization.ts:85  (membership) =&gt; memberRow(app, membership, byId, memberships)</code> |

## Rule: <code>spread-source</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/cli</code> | 1 | <code>packages/cli/src/telemetry.ts:75  { dsn: dsnFor(options.env), release: options.version, environment: "cli", sdk: { name: "nexus-learn", version: options.v</code> |
