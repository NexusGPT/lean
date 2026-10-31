# render-row-fields: result (2026-10-31)

Lane of `plans/2026-10-30-next-read/PLAN.md`. Base: lean `lead-b5c07450` (5f96f554 worktree, branch `lane/render-row-fields`).
Contract read: DA `docs/architecture/pixel-diff-lane.md` at 0f7aac27 (contains 3839ed3), copied to `lane/pixel-diff-lane.md`.

## What and why

The pixel-diff lane reads 16 fields of lean's per-function certificate; 5 were missing. They are now built as one
object `bound.render`, in `exec/run.mjs` `runPairOnce`, where lane B builds the bound. `check.mjs` already copies
`b.bound` into `certificate.lanes.B.bound`, and so does `pr.mjs`'s basic certificate, so neither needed a change. No
verdict, rung, comparison or budget reads the row.

## Every element added

- `exec/record.mjs`: `export const CLOCK_EPOCH = 1700000000000`. The witness record's `clockEpoch` reads it.
- `exec/run.mjs`:
  - The sandbox's `epoch` reads `CLOCK_EPOCH`, so one constant drives the clock, the record and the row. The value is the same as before.
  - `treeFunctions` entries also carry the element's `props`.
  - `addressable`, `targetOf`, `treeTargets(tree, observed)` and `addTargets` (deduplicated) are new.
  - `runSequences` records the targets of every tree the parent's paths reach, and returns `walked` (every path with at least one label and no difference) and `targets`. It returns them on both clean and witness returns.
  - `renderRow = { component, clock: { epoch }, sequences, targets, leanHead }` is held in `bound.render`. It is seeded from `bound.states` (whether there is an element, the targets of each `$handler`), and `walkedInto` fills it after each `runSequences` run, for both the click machine and the schedule explorer.
- `tests/run.mjs`: a new expect kind `render`. It runs `check.mjs` and gives one row per field per unit:
  - component: a boolean, equal to the expected value.
  - epoch: equal to `witnessRecord(...).clockEpoch`.
  - leanHead: 40 hex characters, equal to the unit record's `leanHead`.
  - sequences: each has an input from `bound.states` and a non-empty list of labels; the expected sequences are present; an expected empty list means the row is empty; a witness's own command is checked.
  - targets: exact keys in this order: label, path, key, id, testid, role, name; the expected rows are present; an expected empty list means the row is empty.
- Pair `tests/pairs/render_row_fields/` (laneBOnly; lane A is not what this pair tests). It has three units:
  - `Panel`: PASS-bounded, component true. It has 6 sequences, including a hover on a span that only appears after a click, and 2 targets.
  - `total`: PASS-bounded, component false, both lists empty.
  - `Toggle`: a WITNESS after one click, `:onClick`.
- `design/certificate-timing.md`: a dated subsection "2026-10-31: the render row" that lists the five fields and their sources.

## Numbers (commands, all exit 0)

- Red, at e2003cc81 (before the change): `JOBS=1 node langs/ts/tests/run.mjs --pair render_row_fields` gave 22 checks, 17 failed. 15 of those are the render rows ("no render row"). The other 2 are lane A proof rows; that is why the pair is now laneBOnly.
- Green: same command, 18 checks, all pass.
- Regression, `JOBS=1 node tests/run.mjs --pair <p>` from `langs/ts`, all pass:
  - component 5
  - deep_render 6
  - finite_components 9
  - handler_capture 26
  - handler_capture_unknown 2
  - handler_identity 15
  - heap_canonical 13
  - jsx_handlers 35
  - jsx_handlers_symbolic 22
  - render_purity 5
  - No pair name contains `screen`.
- `node --test exec/record.test.mjs`: 12 of 12 pass.

## Left

- The finite lane (`exec/finite.mjs`) walks click orders from prop assignments. An assignment has no index in `bound.states`, so those paths are not in `sequences`, and a PASS-decided component has `sequences` empty. Its mount targets are listed. Covering it needs a contract decision on how such an input is named.
- The certificate's `lanes.B.witnesses[]` (check.mjs:92) copies only input, args, where and through. The witness's `.sequence`, which the contract page marks "present", does not reach the certificate; only `where.command` (the last command) does. This is outside the five fields, so it is reported here and not changed.
- `name` is `aria-label` only. A name the browser computes from text content is not recorded.
- Bounds built outside `runPairOnce` (NEW, REFUSE render-impure, spin-bound) have no render row.
- Commit messages carry the brief's `Co-Authored-By: Claude Fable 5.1` line, as the brief instructs. The model that did this work is Opus 5.5.
