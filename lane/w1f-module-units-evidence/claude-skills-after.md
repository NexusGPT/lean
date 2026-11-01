# Census: <code>claude-skills</code>

Date: 2026-11-01 (UTC)

Units: 355. Inside the subset: 125 (35.2 percent). Refused: 230. Files unreadable: 0.

Skipped: appledouble/binary 133 (133 AppleDouble, 0 binary), never units.

By stratum (census.mjs stratumOf): written 355 units (125 inside, 133 files; 35.2 percent); generated 0 units (0 inside, 0 files); minified 0 units (0 inside, 0 files). The share above is over all code; the regression floor R6 binds that share.

By language: TypeScript 355 units (125 inside, 131 files); JavaScript 0 units (0 inside, 2 files).

Beside the 355 function units: 133 module units (a file's top-level statements, read by lane B; 107 with a top-level import that does not resolve; 2 in JavaScript files) and 47 types units (a file's type-only statements, read through the emitted JavaScript); of the 0 JavaScript units, 0 untyped (refused by the lint as untyped-js, read by lane B).

| Entered | Environment-blocked | Language-refused |
| ---: | ---: | ---: |
| 125 | 145 | 52 |

Environment-blocked by kind: lockfile 124, global-types 8, builtin 7, global-node 6.

Of these, refused only on a value whose type does not resolve: 70 (read-after-call 70).

Each refused unit is counted once, under the first rule the lint names for it. A unit whose module or global still does not resolve is environment-blocked instead, under `environment: <kind>` of its first such finding.

Directory depth: 2. A dot means the repository root.

## Top five rules by units stopped

| Rule | Units stopped |
| --- | ---: |
| <code>environment: lockfile</code> | 124 |
| <code>environment: global-types</code> | 8 |
| <code>param-mutation</code> | 8 |
| <code>read-after-call</code> | 8 |
| <code>type-assertion</code> | 8 |

## Rule: <code>environment: lockfile</code>

Units stopped: 124.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/cli</code> | 3 | <code>packages/cli/src/commands/pull.ts:288  const { input } = await import('@inquirer/prompts');</code> |
| <code>src</code> | 1 | <code>src/proxy.ts:17  pathname</code> |
| <code>src/app</code> | 27 | <code>src/app/[scope]/[slug]/diff/page.tsx:47  &lt;div className="container mx-auto max-w-5xl py-8 px-4"&gt;</code> |
| <code>src/components</code> | 88 | <code>src/components/docs/code-block.tsx:24  &lt;div className="rounded-md border bg-muted/50 overflow-hidden my-4"&gt;</code> |
| <code>src/lib</code> | 5 | <code>src/lib/auth.ts:45  origin</code> |

## Rule: <code>environment: global-types</code>

Units stopped: 8.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/app</code> | 5 | <code>src/app/[scope]/[slug]/layout.tsx:4  children: React.ReactNode;</code> |
| <code>src/components</code> | 3 | <code>src/components/layout/header.tsx:23  const handleSearch = (e: React.FormEvent) =&gt; {</code> |

## Rule: <code>param-mutation</code>

Units stopped: 8.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/app</code> | 7 | <code>src/app/api/v1/skills/[scope]/[slug]/download/route.ts:90  db .update(skills) .set({ downloadCount: sql`${skills.downloadCount} + 1`, })</code> |
| <code>src/lib</code> | 1 | <code>src/lib/auth.ts:90  db .update(apiTokens) .set({ lastUsedAt: new Date() })</code> |

## Rule: <code>read-after-call</code>

Units stopped: 8.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/cli</code> | 1 | <code>packages/cli/src/api-client.ts:66  private async handleResponse&lt;T&gt;(response: Response): Promise&lt;T&gt; { if (response.ok) { if (response.status === 204) { retu</code> |
| <code>src/app</code> | 7 | <code>src/app/api/v1/skills/[scope]/[slug]/channels/[name]/route.ts:31  export async function PUT(request: NextRequest, { params }: Params) { try { const { scope, slug, name } = await params; </code> |

## Rule: <code>type-assertion</code>

Units stopped: 8.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/cli</code> | 2 | <code>packages/cli/src/config.ts:27  current</code> |
| <code>src/app</code> | 4 | <code>src/app/[scope]/[slug]/versions/page.tsx:89  v.status</code> |
| <code>src/hooks</code> | 1 | <code>src/hooks/use-skills.ts:126  pageParam</code> |
| <code>src/lib</code> | 1 | <code>src/lib/fetcher.ts:18  body.detail &#124;&#124; res.statusText</code> |

## Rule: <code>copied-argument</code>

Units stopped: 7.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/app</code> | 4 | <code>src/app/[scope]/[slug]/versions/[version]/files/[...path]/page.tsx:21  (data) =&gt; { setFileData({ content: data.content, isBinary: data.isBinary }); setLoading(false); }</code> |
| <code>src/db</code> | 3 | <code>src/db/index.ts:15  export function getDb(connectionString?: string) { const url = connectionString &#124;&#124; getEnv().DATABASE_URL; if (!_db) { _d</code> |

## Rule: <code>environment: builtin</code>

Units stopped: 7.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/cli</code> | 7 | <code>packages/cli/src/commands/push.ts:40  files</code> |

## Rule: <code>environment: global-node</code>

Units stopped: 6.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/cli</code> | 4 | <code>packages/cli/src/commands/pull.ts:149  const archiveData = Buffer.from(arrayBuffer);</code> |
| <code>src/db</code> | 1 | <code>src/db/index.ts:10  ssl: process.env.NODE_ENV === "production" ? "require" : false,</code> |
| <code>src/lib</code> | 1 | <code>src/lib/env.ts:27  _env = envSchema.parse(process.env);</code> |

## Rule: <code>promise-pending</code>

Units stopped: 6.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/cli</code> | 6 | <code>packages/cli/src/api-client.ts:100  new Promise(resolve =&gt; setTimeout(resolve, delay))</code> |

## Rule: <code>ts-strict</code>

Units stopped: 5.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/app</code> | 3 | <code>src/app/[scope]/[slug]/diff/page.tsx:169  key={f.path}</code> |
| <code>src/components</code> | 2 | <code>src/components/files/file-tree.tsx:87  key={child.path}</code> |

## Rule: <code>opaque-mutation</code>

Units stopped: 4.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/app</code> | 4 | <code>src/app/api/v1/skills/[scope]/[slug]/channels/[name]/route.ts:103  db .delete(skillChannels)</code> |

## Rule: <code>math-empty</code>

Units stopped: 2.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/cli</code> | 1 | <code>packages/cli/src/commands/info.ts:63  Math.max(...fields.map(([label]) =&gt; label.length))</code> |
| <code>src/app</code> | 1 | <code>src/app/api/v1/users/me/tokens/route.ts:47  Math.max(...callerScopes.map(s =&gt; scopeHierarchy[s] ?? 0))</code> |

## Rule: <code>alias-mutation</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/components</code> | 1 | <code>src/components/files/file-tree.tsx:40  current.push(node)</code> |

## Rule: <code>callback-form</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/lib</code> | 1 | <code>src/lib/rate-limit.ts:19  function checkRateLimit(request: NextRequest): void { const store = stores.get(name)!; const ip = request.headers.get("x</code> |

## Rule: <code>in-place-mutation</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/cli</code> | 1 | <code>packages/cli/src/lib/discovery.ts:50  dirs.sort()</code> |

## Rule: <code>index-assign</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>packages/cli</code> | 1 | <code>packages/cli/src/commands/pull.ts:109  config.skills[existingIndex]</code> |
