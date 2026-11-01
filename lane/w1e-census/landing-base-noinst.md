# Census: <code>nexus-landing</code>

Date: 2026-11-01 (UTC)

Units: 2746. Inside the subset: 989 (36 percent). Refused: 1757. Files unreadable: 0.

Skipped: appledouble/binary 367 (367 AppleDouble, 0 binary), never units.

By stratum (census.mjs stratumOf): written 2744 units (989 inside, 365 files; 36 percent); generated 2 units (0 inside, 2 files); minified 0 units (0 inside, 0 files). The share above is over all code; the regression floor R6 binds that share.

| Entered | Environment-blocked | Language-refused |
| ---: | ---: | ---: |
| 989 | 400 | 723 |

Environment-blocked by kind: lockfile 303, global-types 84, builtin 7, global-node 6.

Of these, refused only on a value whose type does not resolve: 42 (read-after-call 23, closure-mutation 9, index-assign 8, type-assertion 1, react-handler-capture 1).

Each refused unit is counted once, under the first rule the lint names for it. A unit whose module or global still does not resolve is environment-blocked instead, under `environment: <kind>` of its first such finding.

Directory depth: 2. A dot means the repository root.

## Top five rules by units stopped

| Rule | Units stopped |
| --- | ---: |
| <code>environment: lockfile</code> | 303 |
| <code>read-after-call</code> | 170 |
| <code>ts-strict</code> | 150 |
| <code>numbers</code> | 86 |
| <code>environment: global-types</code> | 84 |

## Rule: <code>environment: lockfile</code>

Units stopped: 303.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/(site)</code> | 48 | <code>app/(site)/(legal)/privacy-policy/page.tsx:38  &lt;LegalPage</code> |
| <code>app/api</code> | 1 | <code>app/api/generate-role/route.ts:100  req</code> |
| <code>app/dieteren-workshop</code> | 5 | <code>app/dieteren-workshop/Deck.tsx:161  return &lt;canvas ref={ref} className="ows-canvas" /&gt;;</code> |
| <code>app/orange-workshop</code> | 5 | <code>app/orange-workshop/Deck.tsx:123  return &lt;canvas ref={ref} className="ows-canvas" /&gt;;</code> |
| <code>app/studio</code> | 1 | <code>app/studio/[[...tool]]/page.tsx:7  return &lt;NextStudio config={config} /&gt;;</code> |
| <code>app/support-arch</code> | 1 | <code>app/support-arch/page.tsx:11  &lt;main style={{ background: "var(--paper-white)", minHeight: "100vh", padding: "64px 24px 120px" }}&gt;</code> |
| <code>app/support-arch-mix</code> | 1 | <code>app/support-arch-mix/page.tsx:12  &lt;main style={{ background: "var(--paper-white)", minHeight: "100vh", padding: "64px 24px 140px" }}&gt;</code> |
| <code>app/support-arch-variations</code> | 1 | <code>app/support-arch-variations/page.tsx:37  &lt;main style={{ background: "var(--paper-white)", minHeight: "100vh", padding: "64px 24px 140px" }}&gt;</code> |
| <code>app/support-iterations</code> | 1 | <code>app/support-iterations/page.tsx:31  &lt;main style={{ background: "var(--paper-white)", minHeight: "100vh", padding: "64px 24px 140px" }}&gt;</code> |
| <code>app/support-lab</code> | 1 | <code>app/support-lab/page.tsx:35  &lt;main style={{ background: "var(--paper-white)", minHeight: "100vh", padding: "64px 24px 120px" }}&gt;</code> |
| <code>app/support-lab-pipeline</code> | 1 | <code>app/support-lab-pipeline/page.tsx:34  &lt;main style={{ background: "var(--paper-white)", minHeight: "100vh", padding: "64px 24px 120px" }}&gt;</code> |
| <code>app/support-lab-swimlane</code> | 1 | <code>app/support-lab-swimlane/page.tsx:18  &lt;main style={{ background: "var(--paper-white)", minHeight: "100vh", padding: "64px 24px 120px" }}&gt;</code> |
| <code>app/support-system</code> | 1 | <code>app/support-system/page.tsx:11  &lt;main style={{ background: "var(--paper-white)", minHeight: "100vh", padding: "64px 24px 120px" }}&gt;</code> |
| <code>app/support-variations</code> | 1 | <code>app/support-variations/page.tsx:34  &lt;main style={{ background: "var(--paper-white)", minHeight: "100vh", padding: "64px 24px 140px" }}&gt;</code> |
| <code>components/blog</code> | 9 | <code>components/blog/ArticleToc.tsx:34  &lt;nav className="article-toc" aria-label="On this page"&gt;</code> |
| <code>components/cards</code> | 1 | <code>components/cards/TestimonialCard.tsx:58  &lt;div</code> |
| <code>components/compare</code> | 13 | <code>components/compare/CategoryHero.tsx:14  &lt;div className="relative w-full overflow-hidden"&gt;</code> |
| <code>components/customer-support</code> | 49 | <code>components/customer-support/SupportCta.tsx:10  &lt;section className="section section--ink" data-section="cta" style={{ paddingTop: 140, paddingBottom: 140 }}&gt;</code> |
| <code>components/generate</code> | 1 | <code>components/generate/GenerateFleetClient.tsx:87  &lt;div style={{ position: 'relative' }}&gt;</code> |
| <code>components/icons</code> | 19 | <code>components/icons/AuditTrailsIcon.tsx:2  &lt;svg</code> |
| <code>components/landing</code> | 41 | <code>components/landing/CtaBlock.tsx:5  &lt;section</code> |
| <code>components/layout</code> | 2 | <code>components/layout/AnnouncementBanner.tsx:39  &lt;div</code> |
| <code>components/model-calculator</code> | 3 | <code>components/model-calculator/ModelCostCalculator.tsx:745  &lt;div className="relative overflow-hidden bg-paper"&gt;</code> |
| <code>components/section-templates</code> | 13 | <code>components/section-templates/SidebarNav.tsx:44  &lt;nav className="fixed left-0 top-20 w-52 h-[calc(100vh-5rem)] overflow-y-auto border-r border-neutral-200 bg-white z-40 </code> |
| <code>components/sections</code> | 51 | <code>components/sections/CTASection.tsx:16  &lt;section</code> |
| <code>components/telco</code> | 9 | <code>components/telco/v2/TelcoCompare.tsx:168  &lt;section</code> |
| <code>components/ui</code> | 14 | <code>components/ui/AnimatedOrb.tsx:20  &lt;&gt;</code> |
| <code>components/whitepaper</code> | 2 | <code>components/whitepaper/NexusMesh.tsx:188  &lt;div</code> |
| <code>lib</code> | 7 | <code>lib/blog-md.ts:19  html</code> |

## Rule: <code>read-after-call</code>

Units stopped: 170.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 109 | <code>app/dieteren-workshop/scene.ts:122  function plateTicks(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, C: Colors, u: number)</code> |
| <code>app/orange-workshop</code> | 61 | <code>app/orange-workshop/scene.ts:122  function plateTicks(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, C: Colors, u: number)</code> |

## Rule: <code>ts-strict</code>

Units stopped: 150.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/(site)</code> | 3 | <code>app/(site)/blog/BlogClient.tsx:183  &lt;BlogCard key={post.slug} post={post} /&gt;</code> |
| <code>app/dieteren-workshop</code> | 4 | <code>app/dieteren-workshop/DieArch.tsx:59  {FRONT.map((a) =&gt; &lt;FrontCard key={a.id} a={a} on={sel === a.id} onPick={() =&gt; setSel(a.id)} /&gt;)}</code> |
| <code>app/orange-workshop</code> | 1 | <code>app/orange-workshop/OrangeArch.tsx:135  &lt;Card key={x.key} a={x} on={sel === x.key} onPick={() =&gt; setSel(x.key)} /&gt;</code> |
| <code>components/blog</code> | 1 | <code>components/blog/BlogGrid.tsx:61  &lt;FadeInUp key={post.slug} delay={0.05 + (index % 6) * 0.05}&gt;</code> |
| <code>components/compare</code> | 2 | <code>components/compare/CompareHubContent.tsx:100  &lt;FadeInUp key={`${article.category}-${article.slug}`} delay={0.05 + (index % 6) * 0.05}&gt;</code> |
| <code>components/customer-support</code> | 86 | <code>components/customer-support/SupportDiagram.tsx:205  &lt;AgentCard key={a.id} agent={a} selected={selectedId === a.id} onSelect={onSelect} setRef={setRef(a.id)} /&gt;</code> |
| <code>components/landing</code> | 5 | <code>components/landing/blog/RelatedGrid.tsx:30  &lt;BlogCard key={post.slug} post={post} /&gt;</code> |
| <code>components/sections</code> | 47 | <code>components/sections/ComparisonSection.tsx:186  &lt;FadeInUp key={column.id} delay={0.1 + index * 0.08}&gt;</code> |
| <code>components/ui</code> | 1 | <code>components/ui/OrbScene/OrbScene.tsx:243  &lt;OrbLayer key={config.src} config={config} /&gt;</code> |

## Rule: <code>numbers</code>

Units stopped: 86.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app</code> | 3 | <code>app/sitemap.ts:66  (post) =&gt; ({ url: `${baseUrl}/blog/${post.slug}`, lastModified: new Date(post._updatedAt &#124;&#124; post.date), changeFrequency:</code> |
| <code>app/dieteren-workshop</code> | 4 | <code>app/dieteren-workshop/DieArch.tsx:38  () =&gt; { const el = wrapRef.current; if (!el) { setShown(true); return; } const io = new IntersectionObserver((es) =&gt; { e</code> |
| <code>app/orange-workshop</code> | 2 | <code>app/orange-workshop/OrangeArch.tsx:159  (h, i) =&gt; ( &lt;li key={i} style={{ fontSize: 12.5, lineHeight: 1.45, color: INK, display: "flex", gap: 8 }}&gt; &lt;span style={</code> |
| <code>components/customer-support</code> | 59 | <code>components/customer-support/SupportDiagram.tsx:151  (c, i) =&gt; ( &lt;path key={i} d={c.d} fill="none" stroke={c.on ? ORANGE : SECONDARY} strokeOpacity={c.on ? 0.6 : selectedId </code> |
| <code>components/generate</code> | 2 | <code>components/generate/GenerateFleetClient.tsx:154  (i) =&gt; ( &lt;rect key={`f${i}`} x={12 + i * 70} y={10} width={56} height={28} rx={3} stroke="var(--ink-black)" strokeWidth=</code> |
| <code>components/landing</code> | 9 | <code>components/landing/Platform.tsx:218  (l, i) =&gt; { const isActive = i === active; const isRevealed = i &lt;= active; return ( &lt;div key={l.id} clas</code> |
| <code>components/sections</code> | 2 | <code>components/sections/telco/TelcoHowWeWorkVariants.tsx:601  () =&gt; { const el = ref.current; if (!el) return; const observer = new IntersectionObserver( (entries) =&gt; { if (entries[0</code> |
| <code>components/telco</code> | 5 | <code>components/telco/v2/TelcoProblem.tsx:258  (c, i) =&gt; { const isActive = i === active; return ( &lt;div key={c.id} style={{ borderTop:</code> |

## Rule: <code>environment: global-types</code>

Units stopped: 84.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app</code> | 1 | <code>app/layout.tsx:115  children: React.ReactNode;</code> |
| <code>app/(site)</code> | 3 | <code>app/(site)/(legal)/layout.tsx:4  children: React.ReactNode;</code> |
| <code>app/dieteren-workshop</code> | 1 | <code>app/dieteren-workshop/DieArch.tsx:44  const ri = () =&gt; ({ className: 'ri', style: { animationDelay: `${(d++ * 0.06).toFixed(2)}s` } as React.CSSProperties });</code> |
| <code>components/customer-support</code> | 65 | <code>components/customer-support/lab/ArchLayers.tsx:31  const ri = () =&gt; ({ className: 'ri', style: { animationDelay: `${(d++ * 0.06).toFixed(2)}s` } as React.CSSProperties });</code> |
| <code>components/landing</code> | 2 | <code>components/landing/Proof.tsx:149  onClick={(_e: React.MouseEvent&lt;HTMLButtonElement&gt;) =&gt; setActive(i)}</code> |
| <code>components/layout</code> | 1 | <code>components/layout/Header.tsx:58  const handleLogoClick = (e: React.MouseEvent&lt;HTMLAnchorElement&gt;) =&gt; {</code> |
| <code>components/model-calculator</code> | 3 | <code>components/model-calculator/ModelCostCalculator.tsx:373  function FSub({ children }: { children: React.ReactNode }) {</code> |
| <code>components/sections</code> | 4 | <code>components/sections/EnterpriseFeatures.tsx:63  function useScrollProgress(ref: React.RefObject&lt;HTMLElement &#124; null&gt;) {</code> |
| <code>components/ui</code> | 1 | <code>components/ui/Orb/Orb.tsx:239  } as React.CSSProperties</code> |
| <code>components/whitepaper</code> | 2 | <code>components/whitepaper/WhitepaperArticle.tsx:88  function go(e: React.MouseEvent, id: string) {</code> |
| <code>public/voice_ai_assistant</code> | 1 | <code>public/voice_ai_assistant/app/layout.tsx:12  children: React.ReactNode;</code> |

## Rule: <code>closure-mutation</code>

Units stopped: 67.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 16 | <code>app/dieteren-workshop/Deck.tsx:318  raf</code> |
| <code>app/orange-workshop</code> | 9 | <code>app/orange-workshop/Deck.tsx:103  start</code> |
| <code>components/blog</code> | 2 | <code>components/blog/BlogArticleBody.tsx:51  headingIndex++</code> |
| <code>components/compare</code> | 2 | <code>components/compare/CompareArticleBody.tsx:45  headingIndex++</code> |
| <code>components/customer-support</code> | 7 | <code>components/customer-support/SupportPlatform.tsx:61  rafId</code> |
| <code>components/landing</code> | 25 | <code>components/landing/IsoStack/AgentLines.tsx:33  alive</code> |
| <code>components/sections</code> | 2 | <code>components/sections/Hero.tsx:141  progress</code> |
| <code>components/ui</code> | 1 | <code>components/ui/Orb/Orb.tsx:125  seed</code> |
| <code>components/whitepaper</code> | 3 | <code>components/whitepaper/WhitepaperArticle.tsx:42  i++</code> |

## Rule: <code>unsupported-syntax</code>

Units stopped: 59.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/(site)</code> | 1 | <code>app/(site)/roles/middle-lab/page.tsx:41  C</code> |
| <code>app/dieteren-workshop</code> | 2 | <code>app/dieteren-workshop/scene.ts:2189  k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)</code> |
| <code>app/orange-workshop</code> | 2 | <code>app/orange-workshop/scene.ts:1800  k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)</code> |
| <code>app/support-arch-variations</code> | 1 | <code>app/support-arch-variations/page.tsx:62  Comp</code> |
| <code>app/support-iterations</code> | 1 | <code>app/support-iterations/page.tsx:53  Comp</code> |
| <code>app/support-lab</code> | 1 | <code>app/support-lab/page.tsx:70  Comp</code> |
| <code>app/support-lab-pipeline</code> | 1 | <code>app/support-lab-pipeline/page.tsx:57  Comp</code> |
| <code>app/support-variations</code> | 1 | <code>app/support-variations/page.tsx:57  Comp</code> |
| <code>components/customer-support</code> | 46 | <code>components/customer-support/lab/SwimlaneEditorial.tsx:166  NodeCard</code> |
| <code>components/telco</code> | 3 | <code>components/telco/v2/TelcoCompare.tsx:360  Mono</code> |

## Rule: <code>type-assertion</code>

Units stopped: 40.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/api</code> | 3 | <code>app/api/whitepaper/route.ts:15  ({ "&lt;": "&amp;lt;", "&gt;": "&amp;gt;", "&amp;": "&amp;amp;" })[c] as string</code> |
| <code>app/dieteren-workshop</code> | 4 | <code>app/dieteren-workshop/Deck.tsx:1808  p.i + 1</code> |
| <code>app/orange-workshop</code> | 6 | <code>app/orange-workshop/Deck.tsx:1813  p.i + 1</code> |
| <code>components/blog</code> | 7 | <code>components/blog/BlogArticleBody.tsx:80  { level: block.style === "h2" ? 2 : 3, text, id: slugify(text), }</code> |
| <code>components/compare</code> | 3 | <code>components/compare/CompareArticleBody.tsx:195  el</code> |
| <code>components/customer-support</code> | 3 | <code>components/customer-support/lab/SwimlaneEditorial.tsx:77  prev</code> |
| <code>components/model-calculator</code> | 6 | <code>components/model-calculator/ModelCostCalculator.tsx:447  e.target as Node</code> |
| <code>components/section-templates</code> | 1 | <code>components/section-templates/sections/TestimonialTemplates.tsx:89  c + 1</code> |
| <code>components/whitepaper</code> | 4 | <code>components/whitepaper/WhitepaperArticle.tsx:31  { level, text, id }</code> |
| <code>lib</code> | 3 | <code>lib/blog-md.ts:72  b.date</code> |

## Rule: <code>property-assign</code>

Units stopped: 20.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 4 | <code>app/dieteren-workshop/OrangeArch.tsx:172  (e.currentTarget as HTMLButtonElement).style.background</code> |
| <code>app/orange-workshop</code> | 1 | <code>app/orange-workshop/scene.ts:7871  MORPH_CLOCK.t0</code> |
| <code>components/cards</code> | 1 | <code>components/cards/TestimonialCard.tsx:48  document.body.style.overflow</code> |
| <code>components/customer-support</code> | 4 | <code>components/customer-support/SupportHero.tsx:34  document.body.style.overflow</code> |
| <code>components/landing</code> | 2 | <code>components/landing/Hero.tsx:21  document.body.style.overflow</code> |
| <code>components/sections</code> | 6 | <code>components/sections/Hero.tsx:117  document.body.style.overflow</code> |
| <code>components/telco</code> | 1 | <code>components/telco/v2/TelcoHero.tsx:31  document.body.style.overflow</code> |
| <code>components/whitepaper</code> | 1 | <code>components/whitepaper/WhitepaperDownload.tsx:47  document.body.style.overflow</code> |

## Rule: <code>captured-mutable</code>

Units stopped: 19.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 6 | <code>app/dieteren-workshop/scene.ts:2705  counted</code> |
| <code>app/orange-workshop</code> | 4 | <code>app/orange-workshop/scene.ts:2316  counted</code> |
| <code>components/blog</code> | 1 | <code>components/blog/BlogArticleBody.tsx:49  headingIndex</code> |
| <code>components/compare</code> | 1 | <code>components/compare/CompareArticleBody.tsx:43  headingIndex</code> |
| <code>components/customer-support</code> | 3 | <code>components/customer-support/SupportSystemDraft.tsx:73  seen</code> |
| <code>components/landing</code> | 3 | <code>components/landing/IsoStack/AgentLines.tsx:27  alive</code> |
| <code>components/whitepaper</code> | 1 | <code>components/whitepaper/WhitepaperArticle.tsx:41  i</code> |

## Rule: <code>mutation</code>

Units stopped: 17.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/(site)</code> | 1 | <code>app/(site)/enterprise-cli/page.tsx:83  () =&gt; { if (!isActive) { hasAnimated.current = false; setCount(0); } }</code> |
| <code>app/dieteren-workshop</code> | 2 | <code>app/dieteren-workshop/Deck.tsx:111  () =&gt; { stageRef.current.since = performance.now(); }</code> |
| <code>app/orange-workshop</code> | 2 | <code>app/orange-workshop/Deck.tsx:76  () =&gt; { stageRef.current.since = performance.now(); }</code> |
| <code>components/customer-support</code> | 3 | <code>components/customer-support/lab/variations/V1aTicks.tsx:133  function Tick({ v, h, color = INK, inset = false }: { v: 't' &#124; 'b'; h: 'l' &#124; 'r'; color?: string; inset?: boolean }) { c</code> |
| <code>components/model-calculator</code> | 1 | <code>components/model-calculator/ModelCostCalculator.tsx:307  () =&gt; { if (lastResetRef.current !== resetKey) { lastResetRef.current = resetKey; // a preset landed: sync even while fo</code> |
| <code>components/sections</code> | 5 | <code>components/sections/EnterpriseFeatures.tsx:108  () =&gt; { isSnapping.current = false; }</code> |
| <code>components/ui</code> | 2 | <code>components/ui/OrbScene/OrbScene.tsx:223  (state) =&gt; { const t = state.clock.elapsedTime; // Smooth mouse follow smoothMouse.current.x += (mouse.x - smoothMouse.c</code> |
| <code>lib</code> | 1 | <code>lib/metadata.ts:52  export function createPageMetadata(options: PageMetadataOptions): Metadata { const ogType = options.openGraph?.type &#124;&#124; "</code> |

## Rule: <code>foreach</code>

Units stopped: 13.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 8 | <code>app/dieteren-workshop/scene.ts:948  [[cx1, cy1, 1, 1], [cx2, cy1, -1, 1], [cx2, cy2, -1, -1], [cx1, cy2, 1, -1]].forEach(([xx, yy, sx3, sy3]) =&gt; { ctx.begin</code> |
| <code>app/orange-workshop</code> | 5 | <code>app/orange-workshop/scene.ts:949  [[cx1, cy1, 1, 1], [cx2, cy1, -1, 1], [cx2, cy2, -1, -1], [cx1, cy2, 1, -1]].forEach(([xx, yy, sx3, sy3]) =&gt; { ctx.begin</code> |

## Rule: <code>spread</code>

Units stopped: 11.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app</code> | 1 | <code>app/sitemap.ts:90  ...staticPages</code> |
| <code>app/dieteren-workshop</code> | 3 | <code>app/dieteren-workshop/Hundred.tsx:83  ...CH_A</code> |
| <code>app/orange-workshop</code> | 3 | <code>app/orange-workshop/Hundred.tsx:83  ...CH_A</code> |
| <code>components/landing</code> | 3 | <code>components/landing/problem-variations/V0Ledger.tsx:277  ...W_STATS[i]</code> |
| <code>lib</code> | 1 | <code>lib/blog.ts:110  ...sanityTags</code> |

## Rule: <code>unsupported-operator</code>

Units stopped: 10.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 2 | <code>app/dieteren-workshop/Hundred.tsx:38  seed &#124;= 0</code> |
| <code>app/orange-workshop</code> | 2 | <code>app/orange-workshop/Hundred.tsx:38  seed &#124;= 0</code> |
| <code>components/landing</code> | 6 | <code>components/landing/problem-variations/V11Entropy.tsx:65  seed &#124;= 0</code> |

## Rule: <code>environment: builtin</code>

Units stopped: 7.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>lib</code> | 7 | <code>lib/blog-md.ts:123  filePath</code> |

## Rule: <code>index-assign</code>

Units stopped: 7.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 3 | <code>app/dieteren-workshop/scene.ts:11408  MORPH_PANES[id]</code> |
| <code>app/orange-workshop</code> | 2 | <code>app/orange-workshop/scene.ts:7650  MORPH_PANES[id]</code> |
| <code>components/customer-support</code> | 2 | <code>components/customer-support/lab/variations/arch/RoleArchMembrane.tsx:715  bxA[i]</code> |

## Rule: <code>non-null-assertion</code>

Units stopped: 7.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>components/customer-support</code> | 6 | <code>components/customer-support/lab/archShared.tsx:93  BACKGROUND.find((b) =&gt; b.id === id)!</code> |
| <code>components/sections</code> | 1 | <code>components/sections/ComparisonSection.tsx:160  columns[3].logo!</code> |

## Rule: <code>async</code>

Units stopped: 6.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>lib</code> | 6 | <code>lib/blog-md.ts:66  parseBlogFile(path.join(contentDir, f), slug)</code> |

## Rule: <code>environment: global-node</code>

Units stopped: 6.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/api</code> | 1 | <code>app/api/whitepaper/route.ts:41  const apiKey = process.env.RESEND_API_KEY;</code> |
| <code>components/sections</code> | 5 | <code>components/sections/EnterpriseSection.tsx:149  const intervalRef = useRef&lt;NodeJS.Timeout &#124; null&gt;(null);</code> |

## Rule: <code>param-mutation</code>

Units stopped: 6.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>components/customer-support</code> | 6 | <code>components/customer-support/lab/pipeline/p07-depth.tsx:63  soft.push(curve(CHN_R, CHN[ci].cy, FLN_L, FLN[fi].cy))</code> |

## Rule: <code>unsupported-call</code>

Units stopped: 6.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 1 | <code>app/dieteren-workshop/scene.ts:1770  ((): [number, number] =&gt; { const segs = pts.length - 1; const sp = s * segs; const k = Math.min(segs - 1, Math.floor(sp)</code> |
| <code>components/customer-support</code> | 2 | <code>components/customer-support/lab/archShared.tsx:67  Math.round(cur).toLocaleString('en-US')</code> |
| <code>components/landing</code> | 1 | <code>components/landing/IsoStack/NexusCanvas.tsx:17  (async () =&gt; { try { const res = await fetch(src); const buf = await res.arrayBuffer(); const zip = await JSZip.loadAsyn</code> |
| <code>components/ui</code> | 1 | <code>components/ui/editorial/CountUp.tsx:67  cur.toLocaleString("en-US")</code> |
| <code>components/whitepaper</code> | 1 | <code>components/whitepaper/NexusMesh.tsx:31  (function () { const g = byId("isoGridLines"); const step = 34; for (let k = -60; k &lt; 60; k++) { const c1 = k * step; ns</code> |

## Rule: <code>loops</code>

Units stopped: 4.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 2 | <code>app/dieteren-workshop/scene.ts:514  (g, i) =&gt; { const ang = -Math.PI / 2 + (i / n) * Math.PI * 2; const R = Math.min(W, H) * (g.live ? 0.29 : 0.46); const s</code> |
| <code>app/orange-workshop</code> | 2 | <code>app/orange-workshop/scene.ts:515  (g, i) =&gt; { const ang = -Math.PI / 2 + (i / n) * Math.PI * 2; const R = Math.min(W, H) * (g.live ? 0.29 : 0.46); const s</code> |

## Rule: <code>alias-mutation</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>components/ui</code> | 3 | <code>components/ui/FadeInUp.tsx:30  entry.target.classList</code> |

## Rule: <code>names</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 2 | <code>app/dieteren-workshop/Deck.tsx:210  function PersistentZoom({ stage }: { stage: number }) { return ( &lt;div className="ows-persist ows-persist--morph"&gt; &lt;Scene</code> |
| <code>app/orange-workshop</code> | 1 | <code>app/orange-workshop/Deck.tsx:191  function PersistentMorph({ stage }: { stage: number }) { return ( &lt;div className="ows-persist ows-persist--morph"&gt; &lt;Scen</code> |

## Rule: <code>operator-value-context</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 1 | <code>app/dieteren-workshop/scene.ts:4088  i++</code> |
| <code>app/orange-workshop</code> | 1 | <code>app/orange-workshop/scene.ts:3484  i++</code> |
| <code>components/landing</code> | 1 | <code>components/landing/problem-variations/V11Entropy.tsx:232  s.height = 64</code> |

## Rule: <code>prototype</code>

Units stopped: 3.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>components/customer-support</code> | 2 | <code>components/customer-support/SupportDiagram.tsx:66  next[id]</code> |
| <code>lib</code> | 1 | <code>lib/compare.ts:343  counts[cat.slug]</code> |

## Rule: <code>copied-argument</code>

Units stopped: 2.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/(site)</code> | 2 | <code>app/(site)/blog/[slug]/page.tsx:52  export async function generateMetadata({ params, }: BlogPostPageProps): Promise&lt;Metadata&gt; { const resolvedParams = await</code> |

## Rule: <code>definite-assignment</code>

Units stopped: 2.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 1 | <code>app/dieteren-workshop/scene.ts:2985  cp</code> |
| <code>app/orange-workshop</code> | 1 | <code>app/orange-workshop/scene.ts:2596  cp</code> |

## Rule: <code>dynamic-key</code>

Units stopped: 2.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>components/customer-support</code> | 2 | <code>components/customer-support/lab/variations/V7Hub.tsx:149  [dir]: -22</code> |

## Rule: <code>in-place-mutation</code>

Units stopped: 2.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>lib</code> | 2 | <code>lib/blog-md.ts:105  posts.sort( (a, b) =&gt; new Date(b.date).getTime() - new Date(a.date).getTime() )</code> |

## Rule: <code>promise</code>

Units stopped: 2.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>lib</code> | 2 | <code>lib/blog-md.ts:66  parseBlogFile(path.join(contentDir, f), slug)</code> |

## Rule: <code>global-read</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>components/whitepaper</code> | 1 | <code>components/whitepaper/WhitepaperArticle.tsx:104  go</code> |

## Rule: <code>reference-equality</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 1 | <code>app/dieteren-workshop/Deck.tsx:125  draw === drawLivingBase</code> |

## Rule: <code>unsupported-member</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>components/ui</code> | 1 | <code>components/ui/editorial/CountUp.tsx:36  um[2]</code> |
