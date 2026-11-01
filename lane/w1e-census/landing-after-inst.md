# Census: <code>nexus-landing</code>

Date: 2026-11-01 (UTC)

Units: 2746. Inside the subset: 1503 (54.7 percent). Refused: 1243. Files unreadable: 0.

Skipped: appledouble/binary 367 (367 AppleDouble, 0 binary), never units.

By stratum (census.mjs stratumOf): written 2744 units (1501 inside, 365 files; 54.7 percent); generated 2 units (2 inside, 2 files); minified 0 units (0 inside, 0 files). The share above is over all code; the regression floor R6 binds that share.

| Entered | Environment-blocked | Language-refused |
| ---: | ---: | ---: |
| 1503 | 0 | 732 |

Each refused unit is counted once, under the first rule the lint names for it. A unit whose module or global still does not resolve is environment-blocked instead, under `environment: <kind>` of its first such finding.

Directory depth: 2. A dot means the repository root.

## Top five rules by units stopped

| Rule | Units stopped |
| --- | ---: |
| <code>read-after-call</code> | 171 |
| <code>numbers</code> | 129 |
| <code>closure-mutation</code> | 97 |
| <code>unsupported-syntax</code> | 86 |
| <code>type-assertion</code> | 41 |

## Rule: <code>read-after-call</code>

Units stopped: 171.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/(site)</code> | 1 | <code>app/(site)/blog/[slug]/page.tsx:177  export default async function BlogPostPage({ params }: BlogPostPageProps) { const resolvedParams = await params; const p</code> |
| <code>app/dieteren-workshop</code> | 109 | <code>app/dieteren-workshop/scene.ts:122  function plateTicks(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, C: Colors, u: number)</code> |
| <code>app/orange-workshop</code> | 61 | <code>app/orange-workshop/scene.ts:122  function plateTicks(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, C: Colors, u: number)</code> |

## Rule: <code>numbers</code>

Units stopped: 129.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app</code> | 3 | <code>app/sitemap.ts:66  (post) =&gt; ({ url: `${baseUrl}/blog/${post.slug}`, lastModified: new Date(post._updatedAt &#124;&#124; post.date), changeFrequency:</code> |
| <code>app/dieteren-workshop</code> | 4 | <code>app/dieteren-workshop/DieArch.tsx:38  () =&gt; { const el = wrapRef.current; if (!el) { setShown(true); return; } const io = new IntersectionObserver((es) =&gt; { e</code> |
| <code>app/orange-workshop</code> | 2 | <code>app/orange-workshop/OrangeArch.tsx:159  (h, i) =&gt; ( &lt;li key={i} style={{ fontSize: 12.5, lineHeight: 1.45, color: INK, display: "flex", gap: 8 }}&gt; &lt;span style={</code> |
| <code>components/blog</code> | 1 | <code>components/blog/BlogGrid.tsx:61  (post, index) =&gt; ( &lt;FadeInUp key={post.slug} delay={0.05 + (index % 6) * 0.05}&gt; &lt;BlogCard post={post} /&gt; &lt;/FadeInUp&gt; )</code> |
| <code>components/compare</code> | 3 | <code>components/compare/CompareHubContent.tsx:100  (article, index) =&gt; ( &lt;FadeInUp key={`${article.category}-${article.slug}`} delay={0.05 + (index % 6) * 0.05}&gt; &lt;Comparis</code> |
| <code>components/customer-support</code> | 59 | <code>components/customer-support/SupportDiagram.tsx:151  (c, i) =&gt; ( &lt;path key={i} d={c.d} fill="none" stroke={c.on ? ORANGE : SECONDARY} strokeOpacity={c.on ? 0.6 : selectedId </code> |
| <code>components/generate</code> | 2 | <code>components/generate/GenerateFleetClient.tsx:154  (i) =&gt; ( &lt;rect key={`f${i}`} x={12 + i * 70} y={10} width={56} height={28} rx={3} stroke="var(--ink-black)" strokeWidth=</code> |
| <code>components/landing</code> | 8 | <code>components/landing/Platform.tsx:218  (l, i) =&gt; { const isActive = i === active; const isRevealed = i &lt;= active; return ( &lt;div key={l.id} clas</code> |
| <code>components/sections</code> | 43 | <code>components/sections/ComparisonSection.tsx:186  (column, index) =&gt; ( &lt;FadeInUp key={column.id} delay={0.1 + index * 0.08}&gt; &lt;div className="bg-neutral-50 rounded-lg over</code> |
| <code>components/telco</code> | 4 | <code>components/telco/v2/TelcoProblem.tsx:258  (c, i) =&gt; { const isActive = i === active; return ( &lt;div key={c.id} style={{ borderTop:</code> |

## Rule: <code>closure-mutation</code>

Units stopped: 97.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 15 | <code>app/dieteren-workshop/Deck.tsx:318  raf</code> |
| <code>app/orange-workshop</code> | 8 | <code>app/orange-workshop/Deck.tsx:272  raf</code> |
| <code>components/blog</code> | 2 | <code>components/blog/BlogArticleBody.tsx:51  headingIndex++</code> |
| <code>components/compare</code> | 4 | <code>components/compare/CompareArticleBody.tsx:45  headingIndex++</code> |
| <code>components/customer-support</code> | 14 | <code>components/customer-support/SupportPlatform.tsx:61  rafId</code> |
| <code>components/landing</code> | 36 | <code>components/landing/IsoStack/AgentLines.tsx:33  alive</code> |
| <code>components/model-calculator</code> | 1 | <code>components/model-calculator/ModelCostCalculator.tsx:261  currentRef.current</code> |
| <code>components/sections</code> | 10 | <code>components/sections/EnterpriseFeatures.tsx:69  raf.current</code> |
| <code>components/ui</code> | 3 | <code>components/ui/Orb/Orb.tsx:125  seed</code> |
| <code>components/whitepaper</code> | 4 | <code>components/whitepaper/WhitepaperArticle.tsx:42  i++</code> |

## Rule: <code>unsupported-syntax</code>

Units stopped: 86.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/(site)</code> | 2 | <code>app/(site)/roles/middle-lab/page.tsx:41  C</code> |
| <code>app/dieteren-workshop</code> | 2 | <code>app/dieteren-workshop/scene.ts:2189  k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)</code> |
| <code>app/orange-workshop</code> | 2 | <code>app/orange-workshop/scene.ts:1800  k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)</code> |
| <code>app/support-arch-variations</code> | 2 | <code>app/support-arch-variations/page.tsx:62  Comp</code> |
| <code>app/support-iterations</code> | 2 | <code>app/support-iterations/page.tsx:53  Comp</code> |
| <code>app/support-lab</code> | 2 | <code>app/support-lab/page.tsx:70  Comp</code> |
| <code>app/support-lab-pipeline</code> | 2 | <code>app/support-lab-pipeline/page.tsx:57  Comp</code> |
| <code>app/support-variations</code> | 2 | <code>app/support-variations/page.tsx:57  Comp</code> |
| <code>components/customer-support</code> | 66 | <code>components/customer-support/lab/SwimlaneEditorial.tsx:165  Lane</code> |
| <code>components/telco</code> | 3 | <code>components/telco/v2/TelcoCompare.tsx:360  Mono</code> |
| <code>components/ui</code> | 1 | <code>components/ui/Button.tsx:54  PlayIcon</code> |

## Rule: <code>type-assertion</code>

Units stopped: 41.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/api</code> | 6 | <code>app/api/generate-role/route.ts:69  { method: "POST", headers: { "Content-Type": "application/json", "api-key": KEY as string }, body: JSON.stringify(buildI</code> |
| <code>app/dieteren-workshop</code> | 1 | <code>app/dieteren-workshop/scene.ts:2812  ang</code> |
| <code>app/orange-workshop</code> | 1 | <code>app/orange-workshop/scene.ts:2423  ang</code> |
| <code>components/blog</code> | 5 | <code>components/blog/BlogArticleBody.tsx:80  { level: block.style === "h2" ? 2 : 3, text, id: slugify(text), }</code> |
| <code>components/customer-support</code> | 6 | <code>components/customer-support/lab/v04-darkneon.tsx:213  { position: "absolute", left: fX, top: f.cy - fH / 2, width: fW, height: fH, ...glass, border: f.dashed ? "1.5px das</code> |
| <code>components/layout</code> | 1 | <code>components/layout/Header.tsx:114  e.relatedTarget as Node</code> |
| <code>components/model-calculator</code> | 2 | <code>components/model-calculator/ModelCostCalculator.tsx:447  e.target as Node</code> |
| <code>components/sections</code> | 3 | <code>components/sections/EnterpriseFeatures.tsx:223  center - 10</code> |
| <code>components/ui</code> | 1 | <code>components/ui/Orb/Orb.tsx:157  { "--orb-size": `${size}px`, "--orb-base1": colors.base1, "--orb-base2": colors.base2, "--orb-counter": colors.counter, </code> |
| <code>components/whitepaper</code> | 5 | <code>components/whitepaper/NexusMesh.tsx:24  root.querySelector(`#${id}`) as SVGGElement</code> |
| <code>lib</code> | 10 | <code>lib/blog-md.ts:89  { slug, title: data.title &#124;&#124; "", date: data.date &#124;&#124; "2025-02-25", description: data.metaDescription &#124;&#124; data.description </code> |

## Rule: <code>property-assign</code>

Units stopped: 34.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 4 | <code>app/dieteren-workshop/OrangeArch.tsx:172  (e.currentTarget as HTMLButtonElement).style.background</code> |
| <code>app/orange-workshop</code> | 2 | <code>app/orange-workshop/OrangeArch.tsx:194  (e.currentTarget as HTMLButtonElement).style.background</code> |
| <code>components/cards</code> | 2 | <code>components/cards/TestimonialCard.tsx:48  document.body.style.overflow</code> |
| <code>components/customer-support</code> | 8 | <code>components/customer-support/SupportHero.tsx:34  document.body.style.overflow</code> |
| <code>components/landing</code> | 4 | <code>components/landing/Hero.tsx:21  document.body.style.overflow</code> |
| <code>components/sections</code> | 10 | <code>components/sections/Hero.tsx:117  document.body.style.overflow</code> |
| <code>components/telco</code> | 2 | <code>components/telco/v2/TelcoHero.tsx:31  document.body.style.overflow</code> |
| <code>components/whitepaper</code> | 2 | <code>components/whitepaper/WhitepaperDownload.tsx:47  document.body.style.overflow</code> |

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

## Rule: <code>non-null-assertion</code>

Units stopped: 17.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>components/customer-support</code> | 10 | <code>components/customer-support/SupportSystem.tsx:16  byId(selected)!</code> |
| <code>components/sections</code> | 7 | <code>components/sections/ComparisonSection.tsx:160  columns[3].logo!</code> |

## Rule: <code>alias-mutation</code>

Units stopped: 14.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 1 | <code>app/dieteren-workshop/Hundred.tsx:194  cv.width</code> |
| <code>app/orange-workshop</code> | 2 | <code>app/orange-workshop/Deck.tsx:91  cv.width</code> |
| <code>components/telco</code> | 4 | <code>components/telco/v2/TelcoCompare.tsx:88  el.classList.add("is-in")</code> |
| <code>components/ui</code> | 7 | <code>components/ui/FadeInUp.tsx:30  entry.target.classList</code> |

## Rule: <code>foreach</code>

Units stopped: 14.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 8 | <code>app/dieteren-workshop/scene.ts:948  [[cx1, cy1, 1, 1], [cx2, cy1, -1, 1], [cx2, cy2, -1, -1], [cx1, cy2, 1, -1]].forEach(([xx, yy, sx3, sy3]) =&gt; { ctx.begin</code> |
| <code>app/orange-workshop</code> | 5 | <code>app/orange-workshop/scene.ts:949  [[cx1, cy1, 1, 1], [cx2, cy1, -1, 1], [cx2, cy2, -1, -1], [cx1, cy2, 1, -1]].forEach(([xx, yy, sx3, sy3]) =&gt; { ctx.begin</code> |
| <code>components/generate</code> | 1 | <code>components/generate/GenerateFleetClient.tsx:40  timers.current.forEach(clearInterval)</code> |

## Rule: <code>react-handler-capture</code>

Units stopped: 14.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 3 | <code>app/dieteren-workshop/Deck.tsx:111  stageRef</code> |
| <code>app/orange-workshop</code> | 3 | <code>app/orange-workshop/Deck.tsx:76  stageRef</code> |
| <code>components/compare</code> | 1 | <code>components/compare/CompareCTASection.tsx:13  svgRef</code> |
| <code>components/customer-support</code> | 2 | <code>components/customer-support/lab/v03-pipeline.tsx:40  refs</code> |
| <code>components/model-calculator</code> | 2 | <code>components/model-calculator/ModelCostCalculator.tsx:250  currentRef</code> |
| <code>components/sections</code> | 2 | <code>components/sections/EnterpriseFeatures.tsx:68  raf</code> |
| <code>components/ui</code> | 1 | <code>components/ui/RiveAnimation.tsx:39  input</code> |

## Rule: <code>index-assign</code>

Units stopped: 12.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 3 | <code>app/dieteren-workshop/scene.ts:11408  MORPH_PANES[id]</code> |
| <code>app/orange-workshop</code> | 2 | <code>app/orange-workshop/scene.ts:7650  MORPH_PANES[id]</code> |
| <code>components/customer-support</code> | 2 | <code>components/customer-support/lab/variations/arch/RoleArchMembrane.tsx:715  bxA[i]</code> |
| <code>components/landing</code> | 3 | <code>components/landing/Problem.tsx:392  cardRefs.current[i]</code> |
| <code>components/sections</code> | 1 | <code>components/sections/EnterpriseFeatures.tsx:245  tabRefs.current[index]</code> |
| <code>components/telco</code> | 1 | <code>components/telco/v2/TelcoProblem.tsx:502  cardRefs.current[i]</code> |

## Rule: <code>spread</code>

Units stopped: 10.

| Directory | Units stopped | Example |
| --- | ---: | --- |
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

## Rule: <code>reference-equality</code>

Units stopped: 9.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 1 | <code>app/dieteren-workshop/Deck.tsx:125  draw === drawLivingBase</code> |
| <code>components/landing</code> | 4 | <code>components/landing/Problem.tsx:359  el === e.target</code> |
| <code>components/telco</code> | 4 | <code>components/telco/v2/TelcoProblem.tsx:469  el === e.target</code> |

## Rule: <code>unsupported-call</code>

Units stopped: 8.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 1 | <code>app/dieteren-workshop/scene.ts:1770  ((): [number, number] =&gt; { const segs = pts.length - 1; const sp = s * segs; const k = Math.min(segs - 1, Math.floor(sp)</code> |
| <code>components/compare</code> | 1 | <code>components/compare/CompareHubContent.tsx:68  (() =&gt; { const cat = categories.find((c) =&gt; c.slug === selectedCategory); return cat ? ( &lt;FadeInUp&gt; &lt;Link href={`/compar</code> |
| <code>components/customer-support</code> | 3 | <code>components/customer-support/lab/archShared.tsx:67  Math.round(cur).toLocaleString('en-US')</code> |
| <code>components/landing</code> | 2 | <code>components/landing/IsoStack/NexusCanvas.tsx:17  (async () =&gt; { try { const res = await fetch(src); const buf = await res.arrayBuffer(); const zip = await JSZip.loadAsyn</code> |
| <code>components/sections</code> | 1 | <code>components/sections/EnterpriseFeatures.tsx:374  (() =&gt; { const tab = featureTabs[visibleIndex]; return ( &lt;div style={{ transform: entered ? "trans</code> |

## Rule: <code>param-mutation</code>

Units stopped: 6.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>components/customer-support</code> | 6 | <code>components/customer-support/lab/pipeline/p07-depth.tsx:63  soft.push(curve(CHN_R, CHN[ci].cy, FLN_L, FLN[fi].cy))</code> |

## Rule: <code>promise-all-order</code>

Units stopped: 6.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>lib</code> | 6 | <code>lib/blog-md.ts:64  (f) =&gt; { const slug = f.replace(".md", ""); return parseBlogFile(path.join(contentDir, f), slug); }</code> |

## Rule: <code>copied-argument</code>

Units stopped: 5.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/(site)</code> | 5 | <code>app/(site)/blog/[slug]/page.tsx:52  export async function generateMetadata({ params, }: BlogPostPageProps): Promise&lt;Metadata&gt; { const resolvedParams = await</code> |

## Rule: <code>async</code>

Units stopped: 4.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>lib</code> | 4 | <code>lib/blog.ts:67  getSanityPosts()</code> |

## Rule: <code>loops</code>

Units stopped: 4.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 2 | <code>app/dieteren-workshop/scene.ts:514  (g, i) =&gt; { const ang = -Math.PI / 2 + (i / n) * Math.PI * 2; const R = Math.min(W, H) * (g.live ? 0.29 : 0.46); const s</code> |
| <code>app/orange-workshop</code> | 2 | <code>app/orange-workshop/scene.ts:515  (g, i) =&gt; { const ang = -Math.PI / 2 + (i / n) * Math.PI * 2; const R = Math.min(W, H) * (g.live ? 0.29 : 0.46); const s</code> |

## Rule: <code>names</code>

Units stopped: 4.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 2 | <code>app/dieteren-workshop/Deck.tsx:210  function PersistentZoom({ stage }: { stage: number }) { return ( &lt;div className="ows-persist ows-persist--morph"&gt; &lt;Scene</code> |
| <code>app/orange-workshop</code> | 1 | <code>app/orange-workshop/Deck.tsx:191  function PersistentMorph({ stage }: { stage: number }) { return ( &lt;div className="ows-persist ows-persist--morph"&gt; &lt;Scen</code> |
| <code>components/sections</code> | 1 | <code>components/sections/new/hero-video-variants.tsx:126  function SecondaryCta({ children = "SEE IT IN ACTION" }: { children?: string }) { const { open } = useContext(ModalConte</code> |

## Rule: <code>operator-value-context</code>

Units stopped: 4.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>app/dieteren-workshop</code> | 1 | <code>app/dieteren-workshop/scene.ts:4088  i++</code> |
| <code>app/orange-workshop</code> | 1 | <code>app/orange-workshop/scene.ts:3484  i++</code> |
| <code>components/landing</code> | 2 | <code>components/landing/problem-variations/V11Entropy.tsx:232  s.height = 64</code> |

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

## Rule: <code>math-empty</code>

Units stopped: 2.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>components/customer-support</code> | 2 | <code>components/customer-support/lab/pipeline/p05-swimlane.tsx:123  Math.min(...chCx, ...flCx)</code> |

## Rule: <code>promise</code>

Units stopped: 2.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>lib</code> | 2 | <code>lib/blog-md.ts:66  parseBlogFile(path.join(contentDir, f), slug)</code> |

## Rule: <code>prototype</code>

Units stopped: 2.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>components/customer-support</code> | 2 | <code>components/customer-support/SupportDiagram.tsx:66  next[id]</code> |

## Rule: <code>unsupported-member</code>

Units stopped: 2.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>components/ui</code> | 2 | <code>components/ui/editorial/CountUp.tsx:36  um[2]</code> |

## Rule: <code>global-read</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>components/whitepaper</code> | 1 | <code>components/whitepaper/WhitepaperArticle.tsx:104  go</code> |

## Rule: <code>mutation</code>

Units stopped: 1.

| Directory | Units stopped | Example |
| --- | ---: | --- |
| <code>lib</code> | 1 | <code>lib/metadata.ts:52  export function createPageMetadata(options: PageMetadataOptions): Metadata { const ogType = options.openGraph?.type &#124;&#124; "</code> |
