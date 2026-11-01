# Census: <code>status</code>

Date: 2026-11-01 (UTC)

Units: 654. Inside the subset: 299 (45.7 percent). Refused: 355. Files unreadable: 0.

Skipped: appledouble/binary 106 (106 AppleDouble, 0 binary), never units.

By stratum (census.mjs stratumOf): written 654 units (299 inside, 105 files; 45.7 percent); generated 0 units (0 inside, 1 files); minified 0 units (0 inside, 0 files). The share above is over all code; the regression floor R6 binds that share.

| Entered | Environment-blocked | Language-refused |
| ---: | ---: | ---: |
| 299 | 64 | 163 |

Environment-blocked by kind: install-failed 64.

Each refused unit is counted once, under the first rule the lint names for it. A unit whose module or global still does not resolve is environment-blocked instead, under `environment: <kind>` of its first such finding.

Directory depth: 2. A dot means the repository root.

## Top five rules by units stopped

| Rule | Units stopped |
| --- | ---: |
| <code>environment: install-failed</code> | 64 |
| <code>copied-argument</code> | 49 |
| <code>property-assign</code> | 21 |
| <code>non-null-assertion</code> | 19 |
| <code>type-assertion</code> | 19 |

## Rule: <code>environment: install-failed</code>

Units stopped: 64.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>scripts</code> | 21 | <code>scripts/drive-retention.ts:59  async function cf(path: string, init: RequestInit = {}): Promise&lt;any&gt; {</code> |
| <code>src</code> | 9 | <code>src/pages-worker.ts:124  url: URL,</code> |
| <code>src/api</code> | 6 | <code>src/api/history.ts:128  db: D1Database,</code> |
| <code>src/domain</code> | 1 | <code>src/domain/consistency.ts:353  const bytes = new TextEncoder().encode(JSON.stringify(payload)).length;</code> |
| <code>src/persist</code> | 26 | <code>src/persist/checks.ts:25  db: D1Database,</code> |
| <code>src/probe</code> | 1 | <code>src/probe/http.ts:28  const doFetch = options.fetchImpl ?? fetch;</code> |

## Rule: <code>copied-argument</code>

Units stopped: 49.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/domain</code> | 1 | <code>src/domain/suppress.ts:104  export function applySuppression( input: SuppressionInput, ): Map&lt;string, SuppressedClassification&gt; { const { targets, s</code> |
| <code>src/ui</code> | 3 | <code>src/ui/incident-cards.ts:281  export function effectCard( incident: Incident, targets: readonly TargetSummary[], targetName: string, ): EffectCardView</code> |
| <code>web/app</code> | 45 | <code>web/app/render-detail.ts:17  function sectionHead(title: string, meta: string): HTMLDivElement { return el("div", { class: "sect" }, [ el("span", { c</code> |

## Rule: <code>property-assign</code>

Units stopped: 21.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>web/app</code> | 21 | <code>web/app/detail-main.ts:91  liveLabelEl.textContent</code> |

## Rule: <code>non-null-assertion</code>

Units stopped: 19.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>scripts</code> | 1 | <code>scripts/build-examples.ts:302  grouped.get(id)!</code> |
| <code>src/api</code> | 1 | <code>src/api/summary.ts:406  grouped.get(id)!</code> |
| <code>src/domain</code> | 6 | <code>src/domain/bucketise.ts:73  buckets[index]!</code> |
| <code>src/ui</code> | 11 | <code>src/ui/buckets.ts:310  points[points.length - 1]!</code> |

## Rule: <code>type-assertion</code>

Units stopped: 19.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>scripts</code> | 2 | <code>scripts/build-examples.ts:214  stripAndUptimeFor(spec)</code> |
| <code>src</code> | 1 | <code>src/tick.ts:303  ({ id: r.id, targetId: r.target_id, worstState: r.worst_state as "degraded" &#124; "down", })</code> |
| <code>src/api</code> | 3 | <code>src/api/history.ts:66  ({ at: r.tick_at, up: r.state === "up" ? 1 : 0, degraded: r.state === "degraded" ? 1 : 0, down: r.state === "down" ? 1 :</code> |
| <code>src/domain</code> | 10 | <code>src/domain/classify/gcp.ts:24  typeof i === "object" &amp;&amp; i !== null &amp;&amp; !(i as Record&lt;string, unknown&gt;)["end"]</code> |
| <code>src/persist</code> | 2 | <code>src/persist/injections.ts:25  ({ targetId: r.target_id, state: r.state as CheckState, reason: r.reason as UnknownReason &#124; null, expiresAt: r.expires_a</code> |
| <code>src/ui</code> | 1 | <code>src/ui/strip.ts:109  char as keyof typeof spec.legend</code> |

## Rule: <code>read-after-call</code>

Units stopped: 18.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>scripts</code> | 2 | <code>scripts/retention-plan.ts:160  row</code> |
| <code>src/api</code> | 2 | <code>src/api/incidents.ts:166  export function mapIncidentRow( r: IncidentRow, nameOf: Map&lt;string, string&gt;, dependentsByCause: Map&lt;string, IncidentDepe</code> |
| <code>src/domain</code> | 4 | <code>src/domain/classify/nexus-health.ts:31  export function classifyNexusHealth( body: unknown, selector: string &#124; null, ctx: KindContext, ): Classification { const</code> |
| <code>src/ui</code> | 3 | <code>src/ui/group.ts:219  export function buildGroupPage( summary: SummaryResponse, groupId: string, ageSeconds: number, ): GroupView2i &#124; null { c</code> |
| <code>web/app</code> | 7 | <code>web/app/chart.ts:31  function svg&lt;K extends keyof SVGElementTagNameMap&gt;( tag: K, attrs: Record&lt;string, string&gt;, ): SVGElementTagNameMap[K] { </code> |

## Rule: <code>async</code>

Units stopped: 12.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>web/app</code> | 12 | <code>web/app/detail-main.ts:184  readJson(`/api/v1/targets/${encodeURIComponent(slug)}/history?window=24h`)</code> |

## Rule: <code>dynamic-key</code>

Units stopped: 4.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/ui</code> | 4 | <code>src/ui/overview.ts:346  GLYPHS[renderedState(incident, target)]</code> |

## Rule: <code>promise</code>

Units stopped: 4.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>scripts</code> | 4 | <code>scripts/drive-retention.ts:86  q(sql, params)</code> |

## Rule: <code>alias-mutation</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/domain</code> | 1 | <code>src/domain/classify/statuspage-shape.ts:156  list.push(c)</code> |
| <code>src/ui</code> | 1 | <code>src/ui/incident-timeline.ts:132  export function incidentTimeline(input: TimelineInput): TimelineEvent[] { const { incident, buckets } = input; const eve</code> |
| <code>web/app</code> | 1 | <code>web/app/chart.ts:189  line.classList.add("spark__line--drawing")</code> |

## Rule: <code>captured-mutable</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>scripts</code> | 2 | <code>scripts/migrate-remote.ts:68  output</code> |
| <code>src/ui</code> | 1 | <code>src/ui/buckets.ts:154  used</code> |

## Rule: <code>index-assign</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>scripts</code> | 1 | <code>scripts/build-examples.ts:182  out[w]</code> |
| <code>src/api</code> | 1 | <code>src/api/summary.ts:366  uptime[w]</code> |
| <code>src/ui</code> | 1 | <code>src/ui/derive.ts:46  counts[t.current.state]</code> |

## Rule: <code>param-mutation</code>

Units stopped: 2.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>scripts</code> | 2 | <code>scripts/build-examples.ts:260  grouped.get(t.groupId)!.push(t.id)</code> |

## Rule: <code>spread</code>

Units stopped: 2.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/ui</code> | 2 | <code>src/ui/strip.ts:108  ...target.bucketCells</code> |

## Rule: <code>closure-mutation</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>web/app</code> | 1 | <code>web/app/tooltip.ts:38  node.hidden</code> |

## Rule: <code>promise-all-order</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/probe</code> | 1 | <code>src/probe/http.ts:112  async (url) =&gt; [url, await probeUrl(url, options)] as const</code> |

## Rule: <code>string-code-unit</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>scripts</code> | 1 | <code>scripts/manifest-to-sql.ts:236  "-- 🔴 THIS FILE TRACKS THE MANIFEST. IT DOES NOT TRACK A DEPLOYED DATABASE."</code> |

## Rule: <code>unsupported-operator</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/domain</code> | 1 | <code>src/domain/schema-fingerprint.ts:82  h ^= joined.charCodeAt(i)</code> |

## New units against their declarations (census.mjs --new-units, design/w1h-new-units.md)

Every named unit of the first 1000 written source files, read as a unit no parent holds (30 inputs each), the root's own tests that import the file as its PR tests: 100 files, 410 units (359 NEW, 51 ASK, 0 REFUSE), 360 loaded, 212 s.

Inputs: 10770 drawn (3842 at an edge value of the declared type), 8988 admitted by the declaration, 7360 in a call that asked nothing of the world.

| record | units | records |
|---|---:|---:|
| `new:fault` | 11 | 22 |
| `new:shape` | 5 | 5 |
| `new:test` | 4 | 20 |
| `new:coverage` | 204 | 225 |

Tests: 64 test files in the root; 762 tests name a unit read here: 522 pass, 32 fail, 208 reached the world, 0 use what the runner model does not hold, 0 did not settle.

| coverage reason | records |
|---|---:|
| draw: every admitted input reached the world | 61 |
| draw: no drawn input is one the declared types say they admit | 42 |
| test: the test reached the world | 39 |
| test: the test file did not load | 30 |
| harness: the file's child ended | 10 |
| load: /root/census-installs/w1h/status/web/app/incident-main.ts | 10 |
| load: /root/census-installs/w1h/status/web/app/main.ts | 9 |
| load: /root/census-installs/w1h/status/web/app/detail-main.ts | 8 |
| load: /root/census-installs/w1h/status/scripts/drive-retention.ts | 7 |
| load: /root/census-installs/w1h/status/scripts/manifest-to-sql.ts | 6 |
| draw: the unit reads the global `Response`, which Node holds and lean's sandbox does not | 2 |
| draw: input 0 | 1 |

- `new:fault` scripts/retention-plan.ts `parsePruneSql`: input [""] (edge of sql) threw Error: the drill cannot plan this statement: 
- `new:fault` scripts/retention-plan.ts `parsePruneSql`: input [" "] (edge of sql) threw Error: the drill cannot plan this statement:  
- `new:fault` scripts/retention-plan.ts `parsePruneSql`: input ["\ud800"] (edge of sql) threw Error: the drill cannot plan this statement: �
- `new:fault` scripts/retention-plan.ts `parsePruneSql`: input ["\u0000"] (edge of sql) threw Error: the drill cannot plan this statement:  
- `new:fault` scripts/retention-plan.ts `parsePruneSql`: input ["%E0%A4%A"] (edge of sql) threw Error: the drill cannot plan this statement: %E0%A4%A
- `new:fault` scripts/retention-plan.ts `countingSqlFor`: input [""] (edge of sql) threw Error: the drill cannot plan this statement: 
- `new:fault` scripts/retention-plan.ts `countingSqlFor`: input [" "] (edge of sql) threw Error: the drill cannot plan this statement:  
- `new:fault` scripts/retention-plan.ts `countingSqlFor`: input ["\ud800"] (edge of sql) threw Error: the drill cannot plan this statement: �
- `new:shape` scripts/retention-plan.ts `recordingDb`: input [] returned {"db":{"prepare":{"$fn":"#0"}},"recorded":[{"params":["",{"$fake":"drive#1.arg1" for `{ db: D1Database; recorded: PlannedStatement[] }`
- `new:shape` src/api/history.ts `rawToCounts`: input [[{"latency_ms":null,"map":"v6tsi","state":"degraded","tick_at":100,"unknown_reason":"unknown","up":"extra","vendor_clai returned [{"at":100,"degraded":1,"down":0,"latencyCount":0,"latencyMaxMs":null,"latencySu for `CountRow[]`
- `new:shape` src/api/incidents.ts `mapIncidentRow`: input [{"cause_target_id":null,"closed_at":null,"dependents_json":null,"id":0,"opened_at":0,"start_observed":null,"summary":"" (edge of r) returned {"causeTargetId":null,"closedAt":null,"dependents":[],"dependentsSource":"live", for `Incident`
- `new:shape` src/domain/latency-threshold.ts `baselineFromSamples`: input [[],-138] (edge of latenciesMs) returned {"kind":"measured","p95Ms":{"$undefined":true}} for `LatencyBaseline`
- `new:shape` src/domain/rotation.ts `selectChunk`: input [[{"class":"nexus","dependsOn":["abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghi (edge of cursor) returned {"chunkCount":1,"chunkIndex":{"$nan":true},"nextCursor":{"$nan":true},"targets": for `Chunk`
- `new:test` pages-routes.test.ts `serveDocument`: every route resolves to a DOCUMENT, never to a redirect > serves a target id the detail document rather than a redirect: {"$error":"ReferenceError"}
- `new:test` pages-routes.test.ts `serveDocument`: every route resolves to a DOCUMENT, never to a redirect > serves a group id the detail document: {"$error":"ReferenceError"}
- `new:test` pages-routes.test.ts `serveDocument`: every route resolves to a DOCUMENT, never to a redirect > terminates on /detail itself, which is where the loop closed: {"$error":"ReferenceError"}
- `new:test` pages-routes.test.ts `serveDocument`: every route resolves to a DOCUMENT, never to a redirect > serves an incident id its own document, not the detail one and not index: {"$error":"ReferenceError"}
- `new:test` pages-routes.test.ts `serveDocument`: every route resolves to a DOCUMENT, never to a redirect > does not route a non-numeric incident id to the incident document: {"$error":"ReferenceError"}
- `new:test` pages-routes.test.ts `json`: every route resolves to a DOCUMENT, never to a redirect > serves a target id the detail document rather than a redirect: {"$error":"ReferenceError"}
- `new:test` pages-routes.test.ts `json`: every route resolves to a DOCUMENT, never to a redirect > serves a group id the detail document: {"$error":"ReferenceError"}
- `new:test` pages-routes.test.ts `json`: every route resolves to a DOCUMENT, never to a redirect > terminates on /detail itself, which is where the loop closed: {"$error":"ReferenceError"}
