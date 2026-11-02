# w8d-translator-gaps: result (2026-11-01)

Branch `lane/w8d-translator-gaps`. Fix 1 (the await bug) is cut from `lead-v4` 844ddac278 (commit 6936057a4e). Fixes 2
and 3 are built on `lane/w1m-opacity-merge` at **2521973962**, merged in at a9fa3bf002 (a clean merge). The base of every
before/after number below is 2521973962: a `git archive` of it in my scratch. It lacks all three fixes.

## What landed

1. **An `await` inside an `if` of an async unit** (w1d's open item). `translate.mjs` merged an `if`'s branches as values
   before what follows (`ifChain`), while an awaited statement in a branch ends with the unit's own fault exit
   (`asyncFailure`, the rejected promise). The faults this produced:
   - With no name written in the branch: an arm of type `(World, Unit)` against `World`. Dafny does not resolve it.
     This is the w1d `save` shape.
   - With a name written in the branch: well-typed but wrong. The fault value became the local (`r := throw(f)`), and
     the code after the `if`, a next `await` included, ran on the faulted world.
   - An awaited `if` condition (`if (await svc.ok(k))`) had no fault test at all.

   Now a branch holding an await that leaves the unit (`awaitExits`: async, outside a loop, which routes its own fault)
   takes the continuation form: each branch carries what follows, as a `return` in a branch already does. An awaited
   condition is tested for the fault before its branches. Break `async-branch-exit`.
   - Pairs: `async_branch_exit` (`settle`, `cond`) and `async_branch_exit_arms` (`tag`).
   - `tag` has its own pair because a file that does not resolve proves none of its lemmas. Under the break, `settle`
     and `cond` each fail on their own postcondition, not through `tag`.
2. **Numbers inside opaque steps** (w1c's open item). On the merge, w1g's one opaque conversion of a held value in a
   typed slot (`as_Any_int`) had already placed 5 of the 7 `real-only` units. The other 2 (`outside_iter`,
   `outside_ovc`) were unplaced by "an update whose value is used" inside the step's own text. The fix is the
   pre-analysis the brief names:
   - `translate.mjs` reads the lint's site statements (each finding's `opaqueSite`, in the text as written) **before**
     the faithful rewrite. This is the analysis `site-steps`: one admission per file, shared by every unit asked of the
     file. It is reused as the gate when the order reads every unit, and the gate runs as before otherwise.
   - `faithful.mjs` (`steps`) copies each site statement as written and finds no reason inside it.
   - Exactness is still read over the whole file, so a name the step writes keeps the reading its code gives it.
   - The set comes from the lint, so the rewrite is the same in every one of the translator's site rounds, and the
     offsets of a site the translator raises stay valid.
   - Break `faithful-steps`. Both units go `real-only` → proved.
3. **A multi-line number operation refused the whole file's faithful text** (found on the census roots, not in the
   brief). The rewrite rebuilt `Math.max(\n 0,\n …)` as `Math.__lean_max2(0, …)` on one line, so the line check threw
   ("the rewrite changed the line count"). Every number-bearing unit of that file was then read as unplaced.
   - `faithful.mjs keepLines`: a rewritten node keeps its line breaks, put before its closing parenthesis (every
     rewrite ends with one). The code after it keeps its lines.
   - Pair `faithful_lines`: `clamp` is proved through the faithful reading; the planted `shifted` (`y + 1` against
     `y + 2`) is not proved. Break `faithful-lines`.

Also landed:
- **The break convention, extended rather than doubled** (`tests/break.mjs`). A break row may list `"<unit>": false`
  for a lemma the pair expects proved, which the broken run must not prove. This is for a mechanism that makes a proof
  well-formed rather than honest; a false proof is not reachable for fix 1, since a fault in a branch rejects alike on
  both sides in JavaScript.
- **A break row reads lane A's whole decision** (`tests/run.mjs`). For a number-bearing unit that is the doubles
  verdict, then the faithful placement of the broken translation, not the real lemma alone.
- **Smaller changes:** `lowering-cache` counts `site-steps`; `subset.md`; the w1c design note's open item is closed;
  the measurement tools are in `lane/w8d-translator-gaps-tools/`.

## Validators (each line verbatim)

Pairs alone (`node langs/ts/tests/run.mjs --pair <p>`), every row PASS:

    PASS Equal_settle proved | faithful congruence proved; doubles unknown: not encoded: settle is async (0 s); real lemma proved
    PASS Equal_cond proved | proved
    PASS break async-branch-exit: Equal_settle flips to not proved (the mechanism is what proves it) | not proved under LEAN_BREAK=async-branch-exit: the mechanism is what proves it
    PASS break async-branch-exit: Equal_cond flips to not proved (the mechanism is what proves it) | not proved under LEAN_BREAK=async-branch-exit: the mechanism is what proves it
    PASS Equal_tag proved | faithful congruence proved; doubles unknown: not encoded: tag is async (0 s); real lemma proved
    PASS break async-branch-exit: Equal_tag flips to not proved (the mechanism is what proves it) | not proved under LEAN_BREAK=async-branch-exit: the two branches of an if-then-else expression must have the same type (got (World, Unit) and World)
    PASS Equal_outside_iter proved | faithful congruence proved; doubles unknown: not encoded: an object member that is not a plain key and value: `[Symbol.iterat (0 s); real lemma proved
    PASS break faithful-steps: Equal_outside_iter flips to not proved (the mechanism is what proves it) | not proved under LEAN_BREAK=faithful-steps: the mechanism is what proves it
    PASS Equal_outside_ovc proved | faithful congruence proved; doubles unknown: not encoded: a PostfixUnaryExpression: `y++` (line 6) (0 s); real lemma proved
    PASS break faithful-steps: Equal_outside_ovc flips to not proved (the mechanism is what proves it) | not proved under LEAN_BREAK=faithful-steps: the mechanism is what proves it
    PASS Equal_clamp proved | faithful congruence proved; doubles unknown: not encoded: a call outside the table: `svc.get(x)` (line 9) (0 s); real lemma proved
    PASS Equal_shifted not proved | doubles unknown: not encoded: a call outside the table: `svc.get(x)` (line 16) (0 s); real lemma not proved
    PASS break faithful-lines: Equal_clamp flips to not proved (the mechanism is what proves it) | not proved under LEAN_BREAK=faithful-lines: the mechanism is what proves it

The units each pair expects unequal stay not proved: `inside_iter`, and `inside_ovc`, `read_ovc`, `write_ovc`,
`planted_ovc`.

| validator | output (verbatim) | command |
| --- | --- | --- |
| withdrawal | `withdrawal: logic-values v1 refused identically by the lint, the translator and the record; check PASS-bounded (lane A ASK) under the withdrawal, PASS-proved without; audit 656 site rows, 0 uncatalogued` | `node langs/ts/tests/withdrawal.mjs` |
| audit | `sites 656; by kind {"lint-refuse":381,"lint-advice":5,"translate-throw":4,"translate-refuse":266}; uncatalogued 0` | `node langs/ts/lower.mjs --audit` |
| repo conformance, head | `conformance: PASS, 252 of 252 checks passed, languages: ts` | `python3 -I conformance/run.py ts` |
| repo conformance, base 2521973962 | `conformance: PASS, 252 of 252 checks passed, languages: ts` | the same, in the base archive |
| 30-pair regression (w1h's rule on today's pairs, plus my 5) | `\| TOTAL \| 1258 checks \| 1 FAILED \|`, the one being `lowering-cache` (the new `site-steps` analysis was not in its expected list). Fixed at 174c07120f; then `node langs/ts/tests/lowering-cache.mjs` exits 0 (`summary child exit 0`) | `LEAN_CONFORMANCE=full JOBS=4 LEAN_PAIRS=<35> node langs/ts/tests/run.mjs` (wall 1313 s; list in `/root/da-bench/w8d-translator-gaps/validators/sample-pairs.txt`) |
| proof hunt, on the 35 | `\| PROOF-HUNT TOTAL \| 146 units read by both lanes \| NO HIDDEN FALSE PROOF \| 0 exempt by a door (adapter, NaN or infinity on a unit with no number operation) \|` | the same run |
| model conformance, on the 35 | `conformance model ... on the LEAN_PAIRS set PASS` | the same run |
| the 30 other pairs with break rows | `\| TOTAL \| 1287 checks \| 1 FAILED \|`: `opaque_for_in` `break opaque-drop-read: Equal_upstream flips to proved` (`still not proved under the break`). It fails the same way at base 2521973962 with the base runner, so it is not from this lane (open, below) | `LEAN_CONFORMANCE=full JOBS=4 LEAN_PAIRS=<30> node langs/ts/tests/run.mjs` (wall 1142 s) |
| proof hunt, on those 30 | `\| PROOF-HUNT TOTAL \| 127 units read by both lanes \| NO HIDDEN FALSE PROOF \| 0 exempt by a door (adapter, NaN or infinity on a unit with no number operation) \|` | the same run |
| mutant study, pairs recheck | **not completed**: the log's last line is `325/350 units, 3210 s` (17:09). After it, an hour passed with no line, until the run was stopped at the two-hour limit of a background job. No `recheck.json` was written, so there is no delta; not restarted (the limit is the longest allowed) | `node tests/mutants.mjs --recheck lane/w3b-mutant-study/baseline.json --source pairs --plus-caught 100 --jobs 4`, then `--delta` |

## Resume: merged lead-v4 6694e5a7 (merge commit a3dba86c4c)

lead-v4 6694e5a74c merged in, not rebased. There were two conflicts, both from the unified break reader:
- `tests/break.mjs`: w8d's three mechanisms (`async-branch-exit`, `faithful-steps`, `faithful-lines`) are registered
  beside w1e's and w1d's. `breakRows` labels a lane A row `lane: 'A'` and keeps w8d's two-way flip (`proves` true or
  false); lane B rows are as lead-v4 has them. The convention's comment carries both.
- `tests/run.mjs`: the lane A loop reads `{ mechanism, unit, proves }` through the `lane === 'A'` filter.
- Every pair's `expect.json` under `langs/ts/tests` passes `breakRows`: 66 rows, 0 refused.
- No other change.

Validators at the merge head (logs in `/root/da-bench/w8d-translator-gaps/validators/merge-6694/`):

| validator | output (verbatim) |
| --- | --- |
| `node langs/ts/tests/opaque-calls.mjs` (exit 0) | `116/116 rows hold` |
| `node langs/ts/tests/mutants-fixture.mjs` (exit 0) | `mutants fixture: 83 sites of 15 units, 19 kinds, every one planted and caught (lane B)` |
| `node langs/ts/tests/lowering-cache.mjs` (exit 0) | `summary child exit 0` |
| withdrawal (exit 0) | `withdrawal: logic-values v1 refused identically by the lint, the translator and the record; check PASS-bounded (lane A ASK) under the withdrawal, PASS-proved without; audit 658 site rows, 0 uncatalogued` |
| audit (exit 0) | `sites 658; by kind {"lint-refuse":381,"lint-advice":5,"translate-throw":4,"translate-refuse":268}; uncatalogued 0` |
| repo conformance, head | `conformance: PASS, 253 of 253 checks passed, languages: ts` |
| repo conformance, base lead-v4 6694e5a7 | `conformance: PASS, 253 of 253 checks passed, languages: ts` |
| 35-pair regression, `LEAN_CONFORMANCE=full JOBS=4` (exit 0, wall 1757 s) | `\| TOTAL \| 1261 checks \| ALL PASS \|` |
| proof hunt, on the 35 | `\| PROOF-HUNT TOTAL \| 146 units read by both lanes \| NO HIDDEN FALSE PROOF \| 0 exempt by a door (adapter, NaN or infinity on a unit with no number operation) \|` |
| model conformance, on the 35 | `\| MODEL-CONFORMANCE TOTAL \| 161 units in 30 pairs (5 skipped) \| 71 executable: 61 agree, 10 disagree \| 71 not executable, 2 outside domain, 17 not bridged, 0 model error, 0 skipped \| 0 coupling finding(s) (0 sampled) \| NO NEW FINDING \|` |
| the 30 other pairs with break rows (exit 1, wall 1349 s) | `\| TOTAL \| 1290 checks \| 1 FAILED \|`: `opaque_for_in` `break opaque-drop-read: Equal_upstream flips to proved`. It fails on plain lead-v4 6694e5a7 too (`--pair opaque_for_in`: `\| TOTAL \| 15 checks \| 1 FAILED \|`), so it is the same open item as below |
| proof hunt, on those 30 | `\| PROOF-HUNT TOTAL \| 127 units read by both lanes \| NO HIDDEN FALSE PROOF \| 0 exempt by a door (adapter, NaN or infinity on a unit with no number operation) \|` |

All of this lane's rows PASS in the 35-pair run: `async_branch_exit`, `async_branch_exit_arms`, `faithful_lines`, and
`outside_iter` / `outside_ovc` with their `faithful-steps` breaks. The text of each row is the same as in the
pairs-alone list above.

Not rerun:
- The census measurement below. The merge changed only test files.
- The mutant recheck. It hit the two-hour limit before, and nothing about it has changed.

A load-gate slip: the base `opaque_for_in` pair run started at a one-minute load of 119.14. Every other heavy run here
started at a load of 64 or below.

## Measured, before (2521973962) and after (this head)

Census on w1c's three roots: copies under `/root/census-installs/w8d/` with their dependencies installed. pnpm came
through corepack: a `pnpm` shim in my scratch only. A first run without installs is kept apart.

| root | units | entered, base → head | environment-blocked |
| --- | ---: | --- | ---: |
| nexus-agent-api | 27 | 16 → 16 | 0 |
| snitch | 1399 | 701 → 701 | 37 |
| pipedream | 482 | 170 → 170 | 3 |

`census.mjs --diff`: no reading gains or losses on any root. That is expected: no fix changes what is admitted.

PASS-proved has to be read from lane A alone. `check.mjs` proves a self-pair with the cheap rung `parsed-equal` before
Dafny runs. That way base reads 118 of 135 site units PASS-proved and head reads the same, and an ill-typed base unit
reads PASS-proved too; this says nothing of the translator. `lane/w8d-translator-gaps-tools/lanea.mjs` runs
check.mjs's own lane A steps without the cheap rungs: `agreeCore`, `theorem.py`, Dafny under `dafnyVerifyArgs`,
`provedLemma` over the rests, the canonical parts, the identity guard and `numberDecision`. The base side ran twice,
with the same counts both times.

| units (entered, census records) | base PASS-proved | head PASS-proved |
| --- | ---: | ---: |
| holding an opaque site (135: nexus-agent-api 5, snitch 81, pipedream 49) | 76 | 79 |
| async, with an await inside an `if` (6) | 2 | 4 |

- **Await fix: +2.** snitch `apps/admin/middleware.ts` `clerkMiddleware()#0` and `apps/extension/src/background.ts`
  `unregisterContentScripts`. At base each is `ASK:translation-defect`: "the two branches of an if-then-else expression
  must have the same type (got (World, Unit) and World)". 4 of the 6 translate the same at base and head, through the
  module-cell and heap forms.
- **Faithful line fix: +3**, all in snitch `infra/mock-api`: `cluster-fixtures.ts` `buildPlan` and
  `buildClusterWorld/variantEntries.forEach()#0`, and `action-packs.ts` `registerActionPackRoutes/app.post('/mock/clusters/re-mine')#1`.
  At base each is `ASK:unproved` with its lemma proved: the whole file's faithful text was refused.
- **Opaque-step number fix: +0 on these roots.** None of the site units left unproved fails on a reason inside its
  step. Its measured effect is the 2 pair units, `real-only` → proved.
- **Lost: 0.**

## Open

- The opaque-step fix has no census gain on these roots; its gain is measured on the pairs alone.
- The site units still unproved at head (56 of 135):
  - 38 `ASK:translation-defect`: Dafny type errors of other readings (JSX options, missing datatype members, Hook
    types).
  - 11 `ASK:theorem`: mostly the scope of a component unit.
  - 7 `ASK:unproved`, each with its lemma proved and its numbers unplaced for a real reason: an index read, an argument
    of `slice`, `BigInt`, `Date` or `Set.has`. None is a reason inside a step, and none is a moved line.
- A site the translator raises itself (`translateSites`) is not known before the rewrite and is still rewritten. Its
  reasons are dismissed after emission (`opaquePlacement`), but only where the offsets map.
- `opaque_for_in`'s break row `opaque-drop-read` / `upstream` is red at head and at base 2521973962 alike. The break
  does not make `upstream` prove. Its expectation or the mechanism needs a look by its owner (w1a/w1b).
- The cost of `site-steps`: one more admission per file when a translation reads only some units (`--only`). That was
  about 0.25 s on a pair file (1.02 s → 1.26 s); there is no extra cost when the order reads every unit.
- DA's injected-bug count (55/55) is DA's run and is not run here. The lean-side mutant recheck did not complete: it hung on its last 25 of 350 units, so this lane has no mutant delta. It needs a rerun split by unit range, or with a per-unit wall cap.
- Load: every heavy run started at a one-minute load at most 64. The first census started at 64.43, which the gate
  rounded down to 64. In the resume, one run did not wait for the gate: the single-pair base run of `opaque_for_in`
  started at a load of 119.14.

## Resume 2: two rows reported failing at lead-v4 2df7b01b

The commit is 4e276baf9e, on top of lead-v4 2df7b01b. Logs are in `/root/da-bench/w8d-translator-gaps/validators/resume2/`.

### Which merge introduced each row

| row | 6694e5a7 | 8844df7d | 2df7b01b | 4e276baf (this fix) |
| --- | --- | --- | --- | --- |
| `opaque_async_origin` `break async-drop-origins: Equal_bump flips to proved` (`run.mjs --pair opaque_async_origin`) | PASS | PASS | **FAIL** `not proved under LEAN_BREAK=async-drop-origins: the mechanism is not what refuses it` | PASS `proved under LEAN_BREAK=async-drop-origins: the mechanism is what refuses it` |
| `node langs/ts/tests/opaque-unit.mjs --break` (the row's own command; the row passes when this exits non-zero) | exit 1 (`FAIL step line var (wld, retb, u) := ext_block_x(wld, u);`) | exit 1, same | exit 1, same | exit 1, same |

**1. bump: this lane's merge.** The broken translations are byte-identical at 8844df7d and at 2df7b01b. What changed
is this lane's `run.mjs` break row (2590da19). It now reads lane A's own decision for a number-bearing unit: the
doubles reading, else the real lemma placed faithfully. The old row read the real lemma alone. Under that decision
bump is unplaced on both sides: "an update whose value is used: `k++`". That `k++` is inside the async step
`fill(st, user.tags, k++)`. My `site-steps` pre-analysis skipped only the calls column's statement sites
(`f.opaqueSite`). It did not skip the async family's expression constructs, though the gate reads those as one
transition too (`expressionSites`). That was a gap in my w1c fix, and the row was right to fail. No other guard
covers bump: `async-drop-origins` combined with each of `world-write`, `handed-key-order`, `faithful-steps` and
`reach-closure` still left bump not proved before the fix. So the expectation was not changed to name a second guard.

Fix (`translate/translate.mjs` site-steps): the faithful pre-analysis's step set now also takes the span of each
finding with `g.opaque === 'expression' && ASYNC_OPAQUE[g.rule]`, the same test the gate uses. A construct that is
read as no step keeps its finding, a refusal, so its placement decides nothing. On the pair this changes only the NUMBERS
lines of bump: `placed: false` becomes `placed: true` on both sides.

Red first: pair `opaque_async_origin` has a new unit, `tick`. It has the same step, with `k++` in its argument, on both
sides, and the candidate returns k through a local. The expectation is proved, with the break row `faithful-steps`
flipping it to not proved. The new rows are appended at the end of the files, so the existing line numbers are unchanged.
- with translate.mjs at 2df7b01b: `| TOTAL | 17 checks | 2 FAILED |`. The failures are `Equal_tick proved` (`unplaced (parent: an update whose value is used: \`k++\` (line 42))`) and bump's break row.
- with the fix: `| TOTAL | 17 checks | ALL PASS |`, including `PASS Equal_tick proved | faithful exact proved; ...`,
  `PASS break faithful-steps: Equal_tick flips to not proved (the mechanism is what proves it)` and
  `PASS break async-drop-origins: Equal_bump flips to proved`.

**2. opaque-unit --break: not a lost red.** The second failure in the lead's run is the `self-pair` row, not
opaque-unit. The lead's command, run unchanged in a detached worktree at 2df7b01b, gives `| TOTAL | 912 checks | 2 FAILED |`.
The two failures are bump's row and `runtime | self-pair | ... | FAIL | at .../tests/self-pair.mjs:39:79`, from
`Error: unknown LEAN_PAIRS name: outside_iter`. `outside_iter` and `outside_ovc` are unit names from this file;
their pairs are `opaque_iterator-protocol` and `opaque_operator-value-context`. In that same run,
`runtime | opaque-unit --break | red without the mechanism | PASS | FAIL step line ...`. The script is red under its
break at all three commits, both on its own and through the suite's pool, so no change was made for this row.

### Validators at 4e276baf

| validator | output (verbatim) |
| --- | --- |
| the six pairs by their real names, `LEAN_PAIRS=async_branch_exit,async_branch_exit_arms,faithful_lines,opaque_iterator-protocol,opaque_operator-value-context,opaque_async_origin run.mjs --jobs 3` (exit 0) | `\| TOTAL \| 933 checks \| ALL PASS \|` (opaque-unit and opaque-unit --break PASS) |
| the lead's command as given (with `outside_iter`, `outside_ovc`) (exit 1) | `\| TOTAL \| 915 checks \| 1 FAILED \|`: the `self-pair` row, `unknown LEAN_PAIRS name: outside_iter` |
| `node langs/ts/tests/opaque-calls.mjs` (exit 0) | `116/116 rows hold` |
| `node langs/ts/tests/mutants-fixture.mjs` (exit 0) | `mutants fixture: 83 sites of 15 units, 19 kinds, every one planted and caught (lane B)` |
| `node langs/ts/tests/lowering-cache.mjs` (exit 0) | `summary child exit 0` |
| `node langs/ts/tests/handed-key-order.mjs` (exit 0) / `--break` (exit 1) | `\| HANDED KEY ORDER \| 14 rows \| ALL PASS \|` / `\| HANDED KEY ORDER --break \| 14 rows \| 7 FAILED \|` |
| withdrawal (exit 0) | `withdrawal: logic-values v1 refused identically by the lint, the translator and the record; check PASS-bounded (lane A ASK) under the withdrawal, PASS-proved without; audit 666 site rows, 0 uncatalogued` |
| audit (exit 0) | `sites 666; by kind {"lint-refuse":381,"lint-advice":5,"translate-throw":4,"translate-refuse":276}; uncatalogued 0` |
| repo conformance, head / base 2df7b01b | `conformance: PASS, 253 of 253 checks passed, languages: ts` / the same |
| the 35 + `opaque_async_origin`, `handed_key_order`, `lib_lodash_get`, `LEAN_CONFORMANCE=full JOBS=4` (exit 0, wall 1151 s, started at load 56.79) | `\| TOTAL \| 1324 checks \| ALL PASS \|` |
| proof hunt, on the 38 | `\| PROOF-HUNT TOTAL \| 164 units read by both lanes \| NO HIDDEN FALSE PROOF \| 0 exempt by a door (adapter, NaN or infinity on a unit with no number operation) \|` |
| self-pair, on the 38 | `\| SELF-PAIR TOTAL \| 230 units \| NO WITNESS \| {"PASS-bounded":224,"PASS-decided":6} \| ...` |

### Measured

- Pair: `tick` goes from not proved (unplaced) to PASS-proved, and bump's soundness break row is green again.
- Census: **+0 on the w1c roots, read from the records.** The copies under `/root/census-installs/w8d/` are gone,
  removed by someone other than me, so the census was not rerun. Among the head lane A rows
  (`census/*-lanea.jsonl`, 141), no unit that is unplaced with its lemma proved holds an async-family rule. Their rules
  are `property-assign`, `bitwise`, `read-after-call`, `index-assign`, `alias-mutation` and none, so the async half
  cannot move one of them.

### Load gate

The run of the lead's command at 2df7b01b started at a one-minute load of 83.60, so it did not wait for the gate.
Every other heavy run here started at 64 or below.
