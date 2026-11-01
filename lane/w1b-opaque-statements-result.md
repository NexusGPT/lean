# Lane w1b-opaque-statements: result (2026-11-01)

Branch `lane/w1b-opaque-statements`, cut from `lead-vm` 4747022f. w1a's two commits are cherry-picked:

- `9c185509` (translate/opaque.mjs), as `cc6ab714`;
- `29a0acc0` (the schema), as `0afe2254`, with this lane's resolution of the shared files (the commit message says what).

Design note: `langs/ts/design/w1b-opaque-statements.md`.

## What changed

- **The column.** 23 rules graded `statement` in `lint/lint.mjs` `OPAQUE_ROWS`, the column w1a defined:
  `assignment-expression`, `bare-return`, `bitwise`, `collection-iterator`, `destructuring`, `division`, `for-in`,
  `for-of-non-array`, `label`, `loose-equality`, `math-empty`, `mixed-types`, `number-special`, `param-form`,
  `record-rest`, `reference-key`, `spread`, `string-code-unit`, `string-order`, `template`, `unary-coercion`,
  `uninitialised`, `update-expression`. Their envelope is `OPAQUE_ENVELOPE`; seven are `boundary`.
- **None by design:**
  - `break-continue`: no loop or switch around the jump, so a step has no control result to give it.
  - `loop-form`: a loop with no measure. Its opaque reading would hide the missing measure; it stays ASK.
- **No row:** `comma` and `switch-fallthrough`. No lint rule or translator refusal names either.
- **The step.**
  - The innermost statement of the unit's own body that holds the finding is one opaque step, built by w1a's
    `opaqueForm`.
  - Its key is the statement's tokens, the same-file declarations it names, and the printed text of every same-file
    unit it reaches (`exec/callees.mjs`; A3). The `CALLS` guard is kept.
  - Reads: every local it mentions. Writes: every name it assigns, including pattern and loop targets.
  - A boundary step may write only the world; otherwise its unit joins the value boundary.
  - A site no statement holds, or one inside a function or class declaration, makes its unit one opaque function.
- **The sharing test.** A step that changes or compares an object (`stepHazard`), after a statement that may share one
  (w1a's `heapOperation` over everything run before it), is read in its unit's block (w1a's form, `toBlock`) instead,
  or refused where no block applies. A unit that already holds a w1a block reads its statement sites in it.
- **The faithful rewrite.** A finding inside an expression it replaced takes the innermost node around it that maps.
  Before this, every such site kept its refusal and the faithful text failed.
- **One certificate field** (w1a's `lanes.A.opaque`):
  - per step: span, the findings' spans, statements;
  - per unit: fraction, statements, covered.

  The lowering record carries it per unit (`opaqueSteps`), and the census record per file (`opaque`).
- **Decision sites.** Three new refusal sites, all through one decider, `siteFail`. The audit names their rules
  (`DYNAMIC_RULES` `site.rule` and `boundary.rule`, resolved by the run-time lookup `readingOfRefusal`).
  `node langs/ts/lower.mjs --audit` gives 634 sites, 0 uncatalogued (600 at base). The table in
  `design/admission-contract.md` is regenerated.

## Taken from w1a's later commits, as written (so the merge stays one text)

w1a's schema commit alone (`29a0acc0`) left the converter, the advice, the escapes and two runtime checks red: a graded
finding vanished from the lint's output. w1a's later commits fix these. Their lines are taken here unchanged:

- `lowerFile`'s `graded` list and `lintFindings` with the advice: the converter and the advice still see a graded
  finding.
- The lint CLI names a graded finding with its grade and exits 1 only on a refusal.
- The escape and advice checks read a graded rule.
- The break switch moves beside the product (`langs/ts/break.mjs`), and `tests/break.mjs` keeps the registry.
- The `opaque-unit` suite rows.

## Two defects found in w1a's commit (fixed here in the shared files; w1a should take them)

- `tests/run.mjs` and `check.mjs` read `opaqueLines(...).get(unit).steps`, but `opaqueLines` lists each unit's lines
  (an array), so every `opaque` row saw zero steps. Now `.get(unit)?.[0]`.
- w1a's gate filter drops a finding whose start falls inside an expression the faithful rewrite replaced
  (`pos` of -1), so the finding keeps its refusal. This lane's site mapping climbs to the innermost node that maps;
  w1a's block sites still do not.

## The tests (the family pairs at `ff00e7d1cd`; the translator is unchanged since `1ef542a7c5`; the later commits take w1a's shared fixes, under which the same pairs pass in the full run)

- `JOBS=3 node langs/ts/tests/opaque-statements.mjs`: **19 pairs, 243 rows, 0 failed** (exit 0). Each pair runs alone
  through `tests/run.mjs --pair <name>`, both lanes:
  - 16 `opaque_<rule>` pairs. 12 are statement-step pairs with outside, inside, planted and upstream units, and a
    `break` row each; the three boundary pairs among them also have `escapes`. Four are whole-unit pairs
    (`number-special`, `unary-coercion`, `division`, `param-form`) with same, escapes and caller units.
  - `opaque_statement_mechanisms` (stale), `opaque_statement_callee` (A3, checked per unit),
    `opaque_statement_sharing` (identity, and A2's alias_origin and alias_step).
- `--break` (LEAN_BREAK, tests/break.mjs, A6), each run red as required (exit 1):
  - `node langs/ts/tests/opaque-statements.mjs --break opaque-drop-read`: 12 pairs, 188 rows, 12 failed. All 12
    `upstream` units prove falsely without the read.
  - `--break opaque-drop-write`: 1 pair, 5 rows, 1 failed. `stale` proves falsely.
  - `--break opaque-drop-callees`: 1 pair, 1 row, 1 failed. `callee` goes from ASK to PASS-bounded: the theorem is no
    longer refused, and lane A falls short of PASS-proved only because the doubles reading cannot encode the for-in.
  - `opaque-drop-sharing`: no pair flips. The heap reading's guard ("identity comparison of two references") already
    leaves `Equal_identity` unguarded, and a reference-keyed `Set` makes its unit whole. The sharing test is the
    argument's condition and decides block against statement, but measured, it is not the only barrier
    (design note).
- `node langs/ts/tests/opaque-unit.mjs`: pass. With `--break`: red, as w1a designed.
- `node langs/ts/lower.mjs --audit`: 634 sites, 0 uncatalogued.
- `LEAN_PAIRS=<the 19> node langs/ts/conformance/run.mjs --jobs 2`: 67 units in 18 pairs (1 skipped: callee is
  checked per unit); 1 executable; 0 agree; **1 disagree (NEW)**: `opaque_statement_sharing/alias_origin`, the parent
  of A2's pair. On `[{tags:[347]}, 7919]` the model returns 1 and Node returns 2: the exact reading drops the push
  through `t = user.tags`.
  - This is the base's reading: 4747022f translates the unit the same way, and its lint says "inside the subset".
  - Lane A does not prove the pair: the heap guard ("nested write through an input") leaves it unguarded.
  - w1a's newer commit `0952b040` (not taken here) reads it as a block.
  - Open, for w1a or the lead: the `alias-mutation` lint misses a conditional push through a path alias.
- Full suite (`JOBS=4 node langs/ts/tests/run.mjs`), see "The full suite" below.
- Conformance on the other pairs the suite counts as changed (`LEAN_PAIRS=bridge_fake_thenable,constructors,library_members,module_scope node langs/ts/conformance/run.mjs --jobs 2`):
  1 disagree, `constructors/metered`, a known finding: NO NEW FINDING.

## The full suite

`JOBS=4 node langs/ts/tests/run.mjs` (the base at lead head 7663d77f: 5,085 checks, all pass):

- At `1e9fe0a9`, before w1a's later fixes were taken: 5,328 checks, **112 failed**. 82 were escapes and 5 were advice
  rows. The convert rows, `no-silent-exit-importers`, `dafny-resource-limit` and `lowering-cache` failed too. All
  came from a graded finding vanishing from the lint (the schema commit alone).
- At `53c74f79`: 5,330 checks, **12 failed**. All 19 of this lane's pairs pass inside it. The 12:
  - 10 are the mutation family as the cherry-picked schema leaves it (w1a's rules; this lane does not touch them):
    `alias_result` (2), `array_copies_alias` (5), `carried-alias` (3 cases: writes it expects refused are now
    graded), the census report fixture (`alias.ts` enters), and pr intake (`refused.ts` is now checked, not refused).
    `node langs/ts/tests/carried-alias.mjs` passes at w1a's head (`681d3d9a`), which holds the later block work.
  - The conformance model row: 2 disagree. `opaque_statement_sharing/alias_origin` (the base's model defect, above,
    new only because the pair is new) and `constructors/metered` (a known finding).
  - `conformance/run.py ts`: fixed after this run by w1a's `escape_lint` hook (`74c98769`). `python3 -I
    conformance/run.py ts` now gives 252 of 252. Nothing else changed after the run.
- Not rerun after `74c98769` (one more full run is about 80 minutes at this load); the one row it changes was run on
  its own, above.

## The census (A8: nexus-ui, blocks, driftbench)

- Before: `cd /root/w1b-scratch/base && node langs/ts/census.mjs /root/da/census/repos/<root> --install-under
  /root/census-installs --out <root>-before.json --report <root>-before.md`. The base is a detached worktree at
  4747022f.
- After: the same command in this tree, at `1ef542a7c5`.
- `node lane/w1b-opaque-statements-measure.mjs <before> <after> ...` (per rule of the family: the units it stopped,
  counted under the first refusal; the units it newly lets in with its step; their opaque fraction):

## nexus-ui
units 629 -> 629, entered 138 -> 145 (+7)
| rule | stopped before | stopped after | newly entered with its step |
| --- | ---: | ---: | ---: |
| `spread` | 2 | 0 | 2 |
opaque fraction of the newly entered: n 2, median 0.75, p25 0.625, p75 0.875, max 1; finding spans: 0 equal to their step's, 2 inside a wider step

## blocks
units 516 -> 516, entered 233 -> 240 (+7)
| rule | stopped before | stopped after | newly entered with its step |
| --- | ---: | ---: | ---: |
| `spread` | 3 | 0 | 0 |
opaque fraction of the newly entered: n 0, median null, p25 null, p75 null, max null; finding spans: 0 equal to their step's, 0 inside a wider step

## driftbench
units 5479 -> 5479, entered 1904 -> 2048 (+144)
| rule | stopped before | stopped after | newly entered with its step |
| --- | ---: | ---: | ---: |
| `bitwise` | 1 | 0 | 2 |
| `math-empty` | 8 | 0 | 1 |
| `record-rest` | 29 | 0 | 6 |
| `reference-key` | 54 | 55 | 3 |
| `spread` | 67 | 1 | 9 |
opaque fraction of the newly entered: n 21, median 1, p25 0.333, p75 1, max 1; finding spans: 0 equal to their step's, 26 inside a wider step

## total
units 6624 -> 6624, entered 2275 -> 2433 (+158)
| rule | stopped before | stopped after | newly entered | median fraction |
| --- | ---: | ---: | ---: | ---: |
| `bitwise` | 1 | 0 | 2 | 0.85 |
| `math-empty` | 8 | 0 | 1 | 1 |
| `record-rest` | 29 | 0 | 6 | 0.375 |
| `reference-key` | 54 | 55 | 3 | 1 |
| `spread` | 72 | 1 | 11 | 1 |
opaque fraction of the newly entered: n 23, median 1, p25 0.417, p75 1; at most 0.25: 5; finding spans: 0 equal to their step's, 28 inside a wider step


Read with care:

- The entered gain (+158: nexus-ui +7, blocks +7, driftbench +144) is this lane and w1a's cherry-picked block
  grading together.
- This lane's own count is narrower. By the first finding per unit (the census's own partition), the units the family
  stopped before that enter after are: nexus-ui 4 (spread); blocks 0; driftbench 25 (spread 10, record-rest 8,
  reference-key 3, math-empty 2, bitwise 2). Total 29. Of these, 23 carry a step of the family in the census record;
  the others enter through a unit read whole or w1a's block, recorded under another rule.
- The family's first-refusal stops go from 164 to 56. Most of the rest are units that now stop on their next blocker:
  `read-after-call` 47 (12 of them carried it before as well; the 34 new ones name a real call, such as
  `initialState()` handed `messages`, not a step); `type-assertion` 19; `copied-argument` 6; and others.
- `reference-key` still stops 55 units. A `Set` or `Map` keyed by `unknown`, `any` or a record has no value type in
  the model. When its site has no statement, the unit becomes one opaque function, whose signature needs that same
  type, so the refusal stands. The way in is a world-held handle for the collection (A4's form): open.

## A5: not met

- The median opaque fraction of the 23 newly entered units is **1** (p25 0.417, p75 1; 5 of 23 at or under 0.25).
  The threshold is at most 0.25. No step's span equals its finding's (0 of 28).
- Where the 1s come from:
  - 6 concise callbacks (0 statements), whose construct is their whole body;
  - 5 units in w1a's block (a step that would read shared state, or a mutation-family finding in the same unit);
  - 3 `reference-key` units read whole.
- The 11 statement steps alone have median 0.333: their units are small (one statement of two is 0.5).
- An expression-level step (an opaque value in place of the expression, so the step's span is the finding's) is the
  next narrowing; open.
- I have not changed how the fraction is counted to meet the number.
- w3b's mutant study on 50 of these units is w3b's; there are 23 here.

## Rules that stay none, by design

- `break-continue`: a jump with no loop or switch around it in its function (TS1104, TS1105). An opaque step's control
  result names the loop it leaves, and here there is none.
- `loop-form`: a loop with no measure. Its opaque reading would hide the measure the proof needs; it stays ASK.

## A4 (locality)

Every graded rule here acts inside its construct's text. The construct is an expression or a statement, and its
effect on the unit is the step's reads, writes, result and jumps. None reaches a later read elsewhere the way freeze
or prototype do. The value-boundary rules are the exception in kind, not place: their value can leave the model, so
their step writes only the world, or their unit is read whole.

## Open

- A5's fraction threshold (above).
- `reference-key` on an unrepresentable collection type (a world-held handle).
- An expression-level step for the expression rules.
- The base's `alias-mutation` miss (conformance, above).
- w1a's gate filter loses a finding inside an expression the faithful rewrite replaced (block sites).
- A6's `tests/break.mjs` row runner (`break` in expect.json) checks lemma flips only. A per-unit (`candidateOnly`) flip
  is checked by `tests/opaque-statements.mjs --break` alone.
- Merge: w1a first. This lane's resolution of the shared files is in `0afe2254`; rebasing on w1a's later commits
  (`0952b040` and on) will conflict in `translate.mjs` at the gate filter, the retry loop and opaqueStep.

## Scratch

`/root/w1b-scratch` (the base worktree, census JSON and reports) is removed at the end; the census JSON is summarised
above.
