# Census: <code>nexus-chat-embed</code>

Date: 2026-11-01 (UTC)

Units: 361. Inside the subset: 189 (52.4 percent). Refused: 172. Files unreadable: 0.

Skipped: appledouble/binary 72 (72 AppleDouble, 0 binary), never units.

By stratum (census.mjs stratumOf): written 343 units (185 inside, 71 files; 53.9 percent); generated 18 units (4 inside, 1 files); minified 0 units (0 inside, 0 files). The share above is over all code; the regression floor R6 binds that share.

| Entered | Environment-blocked | Language-refused |
| ---: | ---: | ---: |
| 189 | 0 | 115 |

Each refused unit is counted once, under the first rule the lint names for it. A unit whose module or global still does not resolve is environment-blocked instead, under `environment: <kind>` of its first such finding.

Directory depth: 2. A dot means the repository root.

## Top five rules by units stopped

| Rule | Units stopped |
| --- | ---: |
| <code>read-after-call</code> | 18 |
| <code>closure-mutation</code> | 15 |
| <code>type-assertion</code> | 13 |
| <code>reference-equality</code> | 12 |
| <code>function-value</code> | 10 |

## Rule: <code>read-after-call</code>

Units stopped: 18.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/chat</code> | 6 | <code>src/chat/session-refresh.ts:141  export async function refreshSession(input: RefreshSessionInput): Promise&lt;RefreshOutcome&gt; { let answered: ChatSession; t</code> |
| <code>src/config</code> | 7 | <code>src/config/fetch-public-appearance.ts:260  function readLauncher(embedSettings: Record&lt;string, unknown&gt;): LauncherOverrides { return { bubblePosition: readText(emb</code> |
| <code>src/ui</code> | 3 | <code>src/ui/AttachmentTray.tsx:94  export function AttachmentTray({ attachments, notice, surface, onRemove }: { attachments: readonly PendingAttachment[]; </code> |
| <code>src/voice</code> | 2 | <code>src/voice/use-voice-call.ts:103  export function useVoiceCall(input: { readonly apiBaseUrl: string; readonly deploymentId: string; }): VoiceCall { const </code> |

## Rule: <code>closure-mutation</code>

Units stopped: 15.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src</code> | 1 | <code>src/App.tsx:111  live</code> |
| <code>src/chat</code> | 4 | <code>src/chat/use-attachments.ts:72  countRef.current</code> |
| <code>src/ui</code> | 9 | <code>src/ui/markdown/use-chat-markdown.ts:65  resolved</code> |
| <code>src/voice</code> | 1 | <code>src/voice/use-voice-call.ts:115  clientRef.current</code> |

## Rule: <code>type-assertion</code>

Units stopped: 13.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/config</code> | 8 | <code>src/config/chrome-locale.ts:82  map</code> |
| <code>src/testing</code> | 2 | <code>src/testing/replay-turn.ts:30  captured</code> |
| <code>src/ui</code> | 3 | <code>src/ui/markdown/html-card.tsx:119  function toHastElement(element: globalThis.Element): HastElement &#124; null { const tagName = element.tagName.toLowerCase();</code> |

## Rule: <code>reference-equality</code>

Units stopped: 12.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/host</code> | 12 | <code>src/host/bridge.ts:114  globalThis.self !== globalThis.top</code> |

## Rule: <code>function-value</code>

Units stopped: 10.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/chat</code> | 10 | <code>src/chat/turn-state.ts:279  (agent) =&gt; withBlock(agent, chunk.id, (block) =&gt; block)</code> |

## Rule: <code>captured-mutable</code>

Units stopped: 8.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src</code> | 1 | <code>src/App.tsx:89  live</code> |
| <code>src/chat</code> | 2 | <code>src/chat/use-chat-turn.ts:249  cancelled</code> |
| <code>src/ui</code> | 5 | <code>src/ui/markdown/use-chat-markdown.ts:86  live</code> |

## Rule: <code>dynamic-key</code>

Units stopped: 7.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/config</code> | 2 | <code>src/config/localized.ts:202  export function resolveLocalizedFooterLinks( base: unknown, localized: unknown, defaultLanguage: string &#124; undefined, loc</code> |
| <code>src/testing</code> | 1 | <code>src/testing/shrink-only-ledger.ts:108  ledger.rows[key]</code> |
| <code>src/voice</code> | 4 | <code>src/voice/VoiceWaveform.tsx:73  input[bin]</code> |

## Rule: <code>copied-argument</code>

Units stopped: 4.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src</code> | 1 | <code>src/App.tsx:78  () =&gt; { controller.abort(new Error(`no answer within ${String(PUBLIC_APPEARANCE_TIMEOUT_MS)}ms`)); }</code> |
| <code>src/chat</code> | 1 | <code>src/chat/use-attachment-upload.ts:41  (file: File) =&gt; { if (token === null) { return Promise.resolve&lt;UploadOutcome&gt;({ kind: "refused", reason: ATTACHMENT_COPY</code> |
| <code>src/ui</code> | 2 | <code>src/ui/ChatEntry.tsx:58  export function ChatEntry({ config }: { config: EmbedConfig }): React.ReactElement &#124; null { /** * 🔴 SEEDED FROM `?skipL</code> |

## Rule: <code>index-assign</code>

Units stopped: 4.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/voice</code> | 4 | <code>src/voice/VoiceWaveform.tsx:100  barsRef.current[index]</code> |

## Rule: <code>names</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/ui</code> | 2 | <code>src/ui/markdown/pipeline.ts:112  export function buildChatMarkdownProcessor() { return unified() .use(remarkParse) .use(remarkBreaks) .use(remarkGfm) .us</code> |
| <code>src/voice</code> | 1 | <code>src/voice/voice-call-context.tsx:40  export function useVoiceCallOptional(): VoiceCall &#124; null { return useContext(VoiceCallContext); }</code> |

## Rule: <code>property-assign</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/ui</code> | 3 | <code>src/ui/FooterText.tsx:49  INLINE.lastIndex</code> |

## Rule: <code>receiver-mutation</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/voice</code> | 3 | <code>src/voice/voice-call-client.ts:170  stop(): void { if (this.stopped) return; this.stopped = true; this.sendControl({ type: "stop" }); this.teardown(); this.</code> |

## Rule: <code>translator-internal</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/config</code> | 3 | <code>src/config/localized.ts:134  export function resolveLocalizedText( base: unknown, localized: unknown, defaultLanguage: string &#124; undefined, locale: st</code> |

## Rule: <code>alias-mutation</code>

Units stopped: 2.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/voice</code> | 2 | <code>src/voice/voice-call-client.ts:180  track.enabled</code> |

## Rule: <code>unsupported-call</code>

Units stopped: 2.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/chat</code> | 1 | <code>src/chat/use-chat-turn.ts:408  (async () =&gt; { let stoppedByUs = false; /** * Has any frame of THIS turn reached the screen? * * The mid-stream arm turn</code> |
| <code>src/ui</code> | 1 | <code>src/ui/MessageList.tsx:122  LIFECYCLE_NOTE[message.lifecycle.kind](message.lifecycle)</code> |

## Rule: <code>unsupported-syntax</code>

Units stopped: 2.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src</code> | 2 | <code>src/App.tsx:57  import.meta.env</code> |

## Rule: <code>control-flow</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/ui</code> | 1 | <code>src/ui/landing/action-button-icon.tsx:127  export function ActionButtonIconView({ icon, buttonUrl }: { readonly icon: ActionButtonIcon; readonly buttonUrl: string;</code> |

## Rule: <code>global-read</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/host</code> | 1 | <code>src/host/bridge.ts:301  cleanup</code> |

## Rule: <code>promise-executor-escape</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/host</code> | 1 | <code>src/host/bridge.ts:283  new Promise&lt;TResponse&gt;((resolve, reject) =&gt; { const onMessage = (event: MessageEvent): void =&gt; { if (event.source !== wi</code> |

## Rule: <code>prototype</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/testing</code> | 1 | <code>src/testing/field-parity-contract.ts:438  payload[name]</code> |

## Rule: <code>spread</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/testing</code> | 1 | <code>src/testing/field-parity-contract.ts:164  ...block.matchAll(/^ {4}([A-Za-z_$][\w$]*)(\??):/gm)</code> |

## Rule: <code>unsupported-member</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>src/testing</code> | 1 | <code>src/testing/field-parity-contract.ts:165  match[1]</code> |

## New units against their declarations (census.mjs --new-units, design/w1h-new-units.md)

Every named unit of the first 1000 written source files, read as a unit no parent holds (30 inputs each), the root's own tests that import the file as its PR tests: 64 files, 236 units (221 NEW, 15 ASK, 0 REFUSE), 231 loaded, 184 s.

Inputs: 6665 drawn (1630 at an edge value of the declared type), 5623 admitted by the declaration, 2094 in a call that asked nothing of the world.

| record | units | records |
|---|---:|---:|
| `new:fault` | 1 | 1 |
| `new:shape` | 0 | 0 |
| `new:test` | 0 | 0 |
| `new:coverage` | 160 | 248 |

Tests: 55 test files in the root; 860 tests name a unit read here: 465 pass, 0 fail, 395 reached the world, 48 use what the runner model does not hold, 0 did not settle.

| coverage reason | records |
|---|---:|
| draw: every admitted input reached the world | 131 |
| test: the file replaces a module, a global or the clock | 45 |
| test: the test reached the world | 41 |
| test: the test file did not load | 12 |
| harness: the file's child ended | 5 |
| draw: no drawn input is one the declared types say they admit | 4 |
| draw: input 4 | 1 |
| draw: unit LIFECYCLE_NOTE.streaming not callable | 1 |
| draw: unit LIFECYCLE_NOTE.complete not callable | 1 |
| draw: unit LIFECYCLE_NOTE.aborted not callable | 1 |
| draw: unit LIFECYCLE_NOTE.failed not callable | 1 |
| draw: unit OFF.Provider not callable | 1 |

- `new:fault` src/ui/MessageTimestamp.tsx `MessageTimestamp`: input [{"at":{"$nan":true},"isUser":false,"locale":""}] (edge of {
  at,
  locale,
  isUser
}) threw RangeError: Invalid time value
