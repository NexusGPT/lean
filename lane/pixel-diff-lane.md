# The pixel-diff lane

The pixel-diff lane compares two builds of a front end, the parent and the candidate, on the same cells: one screen
of one journey, at one state, viewport, device scale and colour scheme, under one fixed clock, one font set and one
pinned browser. It reports three layers per cell (pixels, layout boxes, the accessibility tree), each with its own
verdict. No model takes part in any verdict or number. Every parameter is read from one file, validated by
`docs/architecture/pixel-diff-parameters.json`.

The owner, 28 Oct: "I think lean shouldn't do a pixel diff. However, our bigger architecture (specified in the
paper) should have proper parametrable pixel diff. It is like what we did with OCR. Some elements are in lean, some
in our differential attestation architecture. However, lean row is a good addition and should definitely be provided
per function to allow for these tests".

## Where each part lives

The split follows the one made with open code review (`research/open-code-review/PLAN-gate-from-ocr.md`): pieces
beside lean, pieces inside lean, pieces on top for the producer.

| part | lives in | built today |
|---|---|---|
| capture, comparison, noise, the three layers, the verdict | DA: this lane | `gate/screen-row.mjs` and `gate/screen/` (pixels, layout, accessibility, noise record, browser pin); `gate/render/check.mjs` (the paper's noise set N, scope S, edit E) |
| the states a page is rendered at, per function | lean: the render row of the certificate | `lanes.B.bound.states` at lean 9b2c6733 (`langs/ts/exec/run.mjs`); the fields to add are listed below |
| one changed component of a real repository | DA: the component adapter | `gate/screen-component.mjs` (the component mounted inside its app's provider tree) |
| the preview of the cells, the witness with its two crops | the producer's loop | not built for this lane |

Lost Pixel (MIT, archived at v3.22.0, `research/pixel-diff/lost-pixel-record.md`) is a source of modules, never a
dependency. This page takes two of its conventions: the comparison engine is a named parameter, and every bound
states its unit.

## Inputs

| input | given as |
|---|---|
| the parent build and the candidate build | two served directories (`--parent`, `--candidate`), or one checkout with `--base` for the component adapter |
| the journey | `screens` in the parameters file: each a path, an optional page state, and the actions that reach it |
| the states of each changed unit | lean's certificate for that unit (`states.source: "lean"`), or a states file |
| the scope S and the edit E | the sealed reference store; `scope` and `edit` in the parameters file name them |
| the parameters | `.gate/pixel-diff.json` in the repository, read from the parent commit |

## Parameters

One file per project, `.gate/pixel-diff.json`, read from the parent commit, so a candidate cannot loosen its own
bounds (as the artifact lane reads `.gate/project.json`). A field the file leaves out takes the default the schema
states. A tolerance or threshold above 0 must equal what `noise.rule` gives on the file named by `noise.record`.
The report records the merged parameters and their sha256.

Two words, kept apart. A **tolerance** decides when one pixel differs. A **threshold** decides when a zone's count
of differing pixels makes a witness. The findings report's four dimensions (Q4) map to four fields: the local
distance is `comparison.engine`; the set of pixels is `masks` and `regions`; the aggregation is `threshold`; the
spatial unit is the zone, with `comparison.tile` for reporting.

Every row below is read from `.gate/pixel-diff.json`, except `noise.record`'s content, which is read from the file it
names. "Built as" names the field of the built gate that reads the same value today.

| parameter | type | default | built as |
|---|---|---|---|
| `version` | const 1 | 1 | `version` |
| `browser.name` | enum chromium | chromium | `browser.name` |
| `browser.version` | string or null | null | `browser.version` (refuses another build, a lent browser included) |
| `browser.args` | string list | `["--disable-partial-raster"]` | `browser.args` |
| `fonts.ready` | boolean | true | `capture.fontsReady`; `render/render.mjs` also lists the faces loaded |
| `fonts.required` | string list | `[]` | not built |
| `fonts.image` | string or null | null (host fonts, recorded) | not built; Lost Pixel's `docker-runner/` is the salvage |
| `time.clock` | ISO instant | `2026-01-01T09:00:00.000Z` | `capture.clock`; check `clock` |
| `time.freeze` | boolean | true | `capture.freezeClock` |
| `time.fromLean` | boolean | false | not built; reads the render row's `clock.epoch` |
| `time.timezone` | string | UTC | `capture.timezone` |
| `environment.locale` | string | en-US | `capture.locale` |
| `environment.animations` | enum disabled, allow | disabled | `capture.animations`; check `animations` |
| `environment.caret` | enum hide, initial | hide | `capture.caret` |
| `environment.reducedMotion` | enum reduce, no-preference | no-preference | `capture.reducedMotion` |
| `environment.network` | enum build-only | build-only | both instruments refuse requests outside the build |
| `matrix.viewports` | list of {name, width, height} | one, 1024 x 768 | `matrix.viewports` (check: `viewports`, default 800 x 600) |
| `matrix.deviceScaleFactors` | positive number list | `[1]` | `matrix.deviceScaleFactors`; check `viewports[].deviceScaleFactor` |
| `matrix.themes` | list of light, dark | `["light"]` | `matrix.themes`; check `themes` |
| `capture.runs` | integer, at least 2 | 2 | `runs`; check `noiseRuns`, `candidateRuns` |
| `capture.waitFor` | selector or null | null | `capture.waitFor`; check `waitFor` |
| `capture.imagesDecoded` | boolean | true | `capture.imagesDecoded` |
| `capture.stableShots` | integer, at least 2 | 5 | `capture.stableShots` |
| `capture.timeoutMs` | integer | 10000 | `capture.timeoutMs` |
| `capture.fullPage` | boolean | false | `capture.fullPage`; check `fullPage` |
| `capture.fallback` | boolean | false | `fallback` |
| `screens` | list of {id, path, state, actions, viewport, deviceScaleFactor, theme} | required | `screens`; check `pages` |
| `states.source` | enum lean, file, none | lean | check `--states` (certificate, lane B result or states file) |
| `states.filter` | "all" or id list | all | check `states` |
| `states.sequences` | boolean | true | not built; needs the render row's `sequences` |
| `comparison.engine.name` | enum channel-max | channel-max | fixed in `screen/pixels.mjs`; not yet a parameter |
| `comparison.engine.version` | sha256 or null | null (recorded) | not built |
| `comparison.includeAlpha` | boolean | true | `pixels.includeAlpha` |
| `comparison.tile` | integer, device pixels | 16 | `pixels.tile`; check `tile` |
| `tolerance.mode` | enum absolute, noise-factor | absolute | absolute: the screen row; noise-factor: the check |
| `tolerance.channel` | 0 to 255, or {r, g, b, a} | 0 | `pixels.channelTolerance` (one number) |
| `tolerance.factor` | number, or {r, g, b, a} | 1 | check `tolerance.factor` |
| `threshold.maxDiffPixels` | integer, device pixels | 0 | `pixels.maxDiffPixels` |
| `threshold.maxDiffRatio` | 0 to 1, or null | null | not built |
| `noise.record` | repository path or null | null | the R8 runner's test against `fixtures/screen/r8/noise.json` |
| `noise.rule` | enum lower-median | lower-median | `fixtures/screen/r8/noise.mjs` `toleranceFromNoise` |
| `noise.regions` | enum element, tile | element | check `noiseRegions` |
| `masks` | list of {name, selector or box, screens} | `[]` | `pixels.masks`; check `masks` |
| `regions` | list of {name, selector or box, screens, tolerance, maxDiffPixels, maxDiffRatio} | `[]` | `pixels.regions` (with `channelTolerance`) |
| `scope` | list of {name, selector or box, screens} | `[]` | check `scope` |
| `edit` | null, {dir} or {renders} | null | check `edit` |
| `layout.enabled`, `layout.selector`, `layout.keyAttributes`, `layout.fallbackKey`, `layout.positionTolerance`, `layout.sizeTolerance`, `layout.ignore` | as the schema | true, `body *`, `["data-testid","id"]`, path, 0, 0, `[]` | `layout.*` |
| `accessibility.enabled`, `accessibility.states`, `accessibility.ignoreRoles` | as the schema | true, the twenty Chromium properties, `["InlineTextBox"]` | `accessibility.*` |

A screen's actions are `click`, `hover`, `focus`, `fill`, `press`, `select` (not built: an option in a native
`<select>`, the explorer's gap in `gate/lane/D1b-screen-gaps-result.md`), `waitFor`, `advanceClock` and `call`.

## Noise

Each side of each cell is captured `capture.runs` times. Every further capture of a side is compared with that
side's first, under the same tolerance and threshold. A zone that is a witness there makes the cell UNSTABLE on that
side, and a parent-candidate difference it covers is listed as within noise. The raw repeat distance (differing
device pixels at a channel difference above 0, and the largest difference, masks left out) is recorded per cell,
zero included. A tolerance or threshold above 0 comes from those records by `noise.rule`, never by hand. In
`noise-factor` mode the parent's spread is the bound itself: N per tile and channel, closed over the element that
drew it.

## The verdict rule

For one cell and one zone (a named region, or the rest of the screen, called `screen`), leave out every masked
pixel. A compared pixel **differs** when, in some channel, the absolute difference between the parent's first capture
and the candidate's first capture is above the tolerance: `tolerance.channel` (the region's own when it states one)
in absolute mode, or `factor` times N at that pixel in noise-factor mode, so a pixel where N is 0 differs at any
difference. Count the differing pixels of the zone. When the count is **above** the zone's threshold
(`maxDiffPixels`, and `maxDiffRatio` times the zone's compared pixels when set, the smaller bound applying) the zone
is a **WITNESS** of the lane. When it is at or below, the zone is in **bounded agreement**: the two builds agree there
at the stated tolerance and threshold, on this cell, and nothing more is claimed. The cell's pixel layer is a WITNESS
when any zone is; its layout layer is a WITNESS when a keyed box moved or resized beyond `positionTolerance` or
`sizeTolerance`, appeared or disappeared; its accessibility layer is a WITNESS when a node's role, name or a listed
property changed. Before any of this, a cell whose own repeats differ is **UNSTABLE** on that side and gives no
agreement; a cell that rendered on neither side, or lacks a required font, is **UNRENDERED** with its cause.

A WITNESS carries the region witness the findings report asks for (Q6, Q9): the cell id and its whole stimulus
(page, state id, actions, viewport, device scale, theme, clock, browser build, font faces loaded), the layer, the zone
name, the box in CSS and in device pixels, the differing count and the largest difference, the bound applied, the
engine name and version, the hashes of both captures, and both crops.

## How the verdict joins the attestation

The run record holds, per changed unit, lean's row (lane A: proof; lane B: execution), and per cell, this lane's
row per layer. A cell rendered from a lean state carries that state's id, `unit#input` or `unit#input:label>label`,
so the two rows of one state sit side by side. The gate applies the paper's procedure (Algorithm 1) to both:

1. A cell UNSTABLE on the candidate side is REFUSE(C3, cell). A cell UNSTABLE on the parent side, or UNRENDERED, is a
   visible row with no agreement, and the run cannot be PASS until it is fixed (a mask, a readiness marker, or
   noise-factor mode for that cell).
2. A lean WITNESS on a unit outside S is REFUSE(unit, input), whatever the cells show.
3. A pixel-lane WITNESS outside S and outside every mask is REFUSE(C4a, cell, zone, box), whatever lean says. A lean
   PASS-proved does not cancel it: a page's pixels also depend on stylesheets, assets, fonts and other units, which
   the unit's proof does not cover.
4. A WITNESS inside S is compared with E under the same parameters: equal to E within them, it agrees; otherwise
   ASK(E, R_c), the two captures shown to the requester.
5. Otherwise the channel is PASS. Bounded agreement never upgrades a lean PASS-bounded to proved, and the attestation
   states the cells, tolerance and threshold the agreement holds on.

When lean and the lane both report a WITNESS on one state, the gate reports them as one finding with both pieces of
evidence. A pixel WITNESS on a cell whose units lean all passed points outside those units (a stylesheet, an asset,
an unchanged caller) and says so. A lean WITNESS with agreement on its cell is a difference the cell does not show;
lean's refusal stands.

## Worked example: the gate's screen fixture

The pair `gate/fixtures/screen/app/parent` and `app/candidate`, with the fixture's parameters (the schema's example):
tolerance 1, threshold 0, the build stamp masked, the region `footer` with threshold 40. Run on 2026-10-31 at gate
c2acf33, Chromium 156.0.8078.4, with `node screen-row.mjs --params fixtures/screen/params.json --parent
fixtures/screen/app/parent --candidate fixtures/screen/app/candidate --out <dir>` (exit 1). Every repeat of every
screen had 0 differing pixels, so no screen was UNSTABLE.

| cell, zone | what the candidate changed | differing / threshold | largest difference | lane says |
|---|---|---:|---:|---|
| home, footer | the 6 x 6 dot turned red | 36 / 40 | 174 | bounded agreement |
| list-dark-2x, footer | the same dot, at device scale 2 | 144 / 40 | 171 | WITNESS, box 136, 387, 6 x 6 CSS pixels |
| list, screen | the badge background, one blue for another | 5,035 / 0 | 229 | WITNESS, two regions |
| home, screen | the muted text one level darker | 0 / 0 | the one-level change is within tolerance 1 | bounded agreement |
| every cell, build stamp | "build 2" | masked | | not compared |

By hand on the first two rows: at device scale 1 the dot covers 36 device pixels, 36 is not above 40, so the footer
agrees; at device scale 2 it covers 144, 144 is above 40, so the footer is a WITNESS. The same run reports the
accessibility layer's witnesses (the menu button's name, its `expanded` state, the saved message) and the layout
layer's (the third entry moved and resized). None of these cells comes from a lean state, so the join is per cell
only. Through the gate, each WITNESS outside S is REFUSE(C4a) at its box.

## The contract with lean's render row

Per changed function lean checks, the certificate carries a render row. The lane reads it and nothing else from lean.

| field | type | meaning | at lean 9b2c6733 |
|---|---|---|---|
| `unit` | string | the function's name | present |
| `parent.file`, `candidate.file` | path | the two source files | present |
| `parent.sha256`, `candidate.sha256` | hex | their hashes | present |
| `identity` | object | the run identity | present when given |
| `lanes.B.bound.seed` | integer | the seed of the draw | present |
| `lanes.B.bound.n` | integer | the inputs tried | present |
| `lanes.B.bound.states[]` | list | every state lane B reached | present |
| `states[].input` | integer | the input index, the state id's second part | present |
| `states[].args` | JSON | the input as drawn, before either side ran (`renderDrawn`); an unshaped value is `{ "$fake": name }` | present |
| `states[].tree` | JSON | the element tree the parent rendered, for a component | present when the unit rendered |
| `lanes.B.witnesses[].input`, `.args`, `.sequence` | as above, plus handler labels | a separating state, and the handlers that reach it | present |
| `lanes.B.bound.render.component` | boolean | the unit returned an element on some input | to add |
| `lanes.B.bound.render.clock.epoch` | integer, ms | the instant lean's recorded clock started at (the witness record's `clockEpoch`) | to add to the bound |
| `lanes.B.bound.render.sequences[]` | list of {input, labels} | every handler sequence a clean run walked, with its input; today a clean run states only depth and breadth | to add |
| `lanes.B.bound.render.targets[]` | list of {label, path, key, id, testid, role, name} | per handler label (a tree path such as `div[1]:onClick`), the props that make it addressable on the page | to add |
| `lanes.B.bound.render.leanHead` | string | lean's commit (the witness record's `leanHead`) | to add to the bound |

With the five fields to add, the lane renders the states a sequence reaches, plays each label as an action through
its target, and installs lean's clock. Without them it renders mount states only and records which field was
missing, as `gate/render/states.mjs` does today.

## Open

- Not built: the fields marked so above, the engine as a parameter, the ratio threshold, the font image, `select`.
- The parameters file of the built screen row (`gate/schemas/screen-row.params.json`) and this schema name several
  values differently (the "built as" column); one reads the other until the row reads this file.
- The noise record is measured on one machine and one browser build. A tolerance carries to another machine only
  after that machine's own record is measured.
