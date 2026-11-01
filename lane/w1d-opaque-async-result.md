# w1d-opaque-async: result (2026-11-01)

Branch `lane/w1d-opaque-async`, rebuilt on `lane/w1a-opaque-mutation` 0952b040ef (amendment A7: w1a's schema first, the
family lanes rebased on it); the work before the rebuild is kept on `lane/w1d-opaque-async-pre-w1a`. Design note:
`langs/ts/design/w1d-opaque-async.md`. Every number below names its command and the head it ran at.

## What

The async family's rows in the lint's opaque column (`lint/lint.mjs` OPAQUE_ROWS, one decision with
`opaque-async.mjs` ASYNC_OPAQUE): `expression` for async, promise, promise-pending, promise-unsettled, promise-executor,
promise-executor-escape, promise-handler, async-callback, async-predicate, async-reduce, generator-use; `none` with the
reason for promise-thenable and promise-all-order (they name values: locality, A4) and the generator rules
(generator-bound by design: an unbounded loop keeps its ASK). A graded construct is one opaque step at the finding's own
node (A5), through w1a's `opaqueForm`: reads every local it mentions; writes every reference it mentions, every name
sharing an object with one, and every name it rebinds (A2), carried out of the branches and loops around it; keyed by its
tokens, the texts of the same-file functions it reaches and its module cells (A3); its pending work held to the world
(A4); its statement takes an await's fault check. Where the construct is no step the lint withdraws the grade and the
finding refuses with the reason.

## The pairs and the breaks

Command: `node langs/ts/tests/w1d-opaque-async.mjs --jobs 2` (pairs through `run.mjs --pair`, each started only while
the one-minute load is at most 40), at c1c2f382bb (the code of this branch's head; the commits after it touch the
result file only): **ALL PASS**.

- 15 pairs, **176 of 176 rows PASS**, the break rows included: `async-drop-reads` flips each of the 10 per-rule pairs'
  `upstream` unit to a false proof (a local only the step reads, changed before it: a change outside the construct, A1);
  `async-drop-origins` flips opaque_async_origin's count, share and bump (A2, the amendment's own pair plus another name
  for the origin and a rebinding in the argument); `async-drop-carry` flips its branch unit (the step in an `if`);
  `async-drop-callees` flips opaque_async_callee's run (a callee changed at `x === 7919` only, A3); each without the break
  is not proved, and stay (an unchanged callee, a change outside the step) is PASS-proved.
- `async-drop-pending`: lane A on opaque_capture directly: refused as written (naming async-callback), a false
  `Equal_capture` proof under the break. Both PASS.
- Lint: every graded unit's findings labelled `expression`, the two locality pairs' findings keep their refusal with the
  column's reason, the three generator rules keep theirs (`tests/w1d-fixtures/generators.ts`), and the five pending-work
  cases of `tests/w1d-fixtures/pending.ts` (deep alias refused, own-level write graded, module cell graded, handed and
  read after refused, handed and read before graded): 60 lint rows, all PASS.

Other checks at 9e6c3772b5 (the same code): `node langs/ts/tests/opaque-unit.mjs` passes; `node langs/ts/tests/withdrawal.mjs` passes;
`node langs/ts/lower.mjs --audit`: 605 sites, 0 uncatalogued (the table in admission-contract.md regenerated).

## Conformance on the pairs

`LEAN_PAIRS=<the 15 w1d pairs> node langs/ts/conformance/run.mjs --jobs 2` at c1c2f382bb (started at load 33):
**NO NEW FINDING**: 54 units in 12 pairs, 0 agree, 0 disagree, 54 not executable (each reaches an extern: the opaque
steps and the outside calls are parts with no body, as w1-opacity.md design point 4 says), 0 coupling findings; the 3
lane-B-only pairs skipped.

## Census (A8 roots)

`node langs/ts/census.mjs /root/da/census/repos/<root> --install-under /root/census-installs/w1d --out <json> --report <md>`;
before at the cut point 4747022f (`git archive` into scratch), after at this branch. Units my rules stop (the
`refusalRules` partition) before:

| root | units | entered before | my rules stop (before) |
|---|---|---|---|
| nexus-automations | 235 | 78 (33.2%) | async 1, promise 1, promise-pending 1 |
| nexus-meeting-recorder | 105 | 39 (37.1%) | none |
| apps-ui | 2,361 | 714 (30.2%) | promise 1, promise-executor-escape 1, promise-pending 1 |

Three heads, the same command on the same roots, each run at load ≤ 40: before = the cut point 4747022f; w1a = w1a's
head 0952b040ef (the base this branch is rebuilt on: the mutation family's gains are in it, not this lane's); after =
this branch at b230c7b6b8. This lane's delta is w1a → after.

| root | entered before / w1a / after | refused w1a → after | my rules stop (refusalRules) w1a → after |
|---|---|---|---|
| nexus-automations | 78 / 78 / 80 | 157 → 155 | async 1, promise 1, promise-pending 1 → none |
| nexus-meeting-recorder | 39 / 39 / 39 | 0 change | none → none |
| apps-ui | 714 / 727 / 732 | 1,634 → 1,629 | promise 1, promise-executor-escape 1, promise-pending 1 → promise-pending 1 |

Units, by their findings, w1a → after: three stop no longer (nexus-automations `acquire`, apps-ui `fakeCopilotSend`
and `fileToDataUri`; the census counts each with its executor callback, hence entered +2 and +5); four lose this family's
finding and stop on another family's rule (`overGh.rest` global-read, `executeRun` read-after-call, apps-ui
`Thumbnail/React.useEffect()#0` type-assertion); one keeps it with its reason (apps-ui `prepareUpload`: the
`new Promise` sits inside a nested arrow, and its executor writes `canvas.width` of an element a call returned). No unit
that entered at w1a stops at after. My rules stop 0 units on nexus-automations and nexus-meeting-recorder and 1 on apps-ui
(the brief's threshold, 0, is not met there: that unit is refused by locality and by the pending-work test, by design).

**Opaque fraction (A5)**, `node langs/ts/tests/w1d-opaque-fraction.mjs <root> <w1a.json> <after.json>` over the units
newly entered (the statements inside a step or holding one, over every statement of the unit, nested callbacks
included): acquire 1/3 = 0.33, fileToDataUri 4/7 = 0.57, fakeCopilotSend 3/3 = 1.0 (its body is `return new Promise(...)`
with a timer inside). **Median 0.57 over 3 units: the A5 threshold (≤ 0.25) is NOT met.** With w1a's own counting
(statements of the unit's body, nested functions excluded) the three are 0.33, 0.33 and 1.0, median 0.33: still not met.
These units are small and the construct is most of each; the step is the finding's node, never widened, so the
fraction is what the construct is. Reading such an executor exactly (a promise-executor reading) is what would lower it;
opacity cannot. w3b's mutant study on these units has not run (this lane does not own it).

## Measured on the way (the census showed it, the mechanism fixed it)

- `acquire` (nexus-automations server/runner.ts): the executor pushes its resolver into a module cell; pending work
  writing the world is what the argument allows. Admitted (module cells are world fields: their reads and writes are
  transitions, checked by translating a unit that reads the cell after the step).
- `fileToDataUri` (apps-ui): the executor writes `r.onload` of a `new FileReader()` it made; such a write cannot change
  the unit's state when it is at the object's own level. Admitted; a deeper path (`o.a.n` through a literal that holds
  `user`) stays refused (a hole the earlier test had, closed by the same change).

## Open

- Not run in this lane (the machine held a one-minute load of 40 to 160 for most of the day, and the gated runs ate the
  budget): w1a's own pairs in this tree (my gate change reads the finding's own grade, which for w1a's rules equals the
  column; their unit test passes), the additional roots nutshell and nexus-learning, the full suite (`LEAN_CONFORMANCE=full`,
  the lead's at merge).
- A5: the fraction threshold is not met (above); w3b's mutant study on these units is not run.

- No promise-handler pair: no unit-level site of the rule was raised by the probes or the census (its findings sit on
  handlers, values, which keep their refusal by locality).
- A translator defect outside this lane: an `await` inside an `if` branch of an async unit emits a fault arm of type
  `(World, Unit)` against `World` (seen in `save` of the first A3 fixture; the fixture was restated).
- Load discipline: two early runs started above load 40 (a pair at 109, the baseline census at 65) before I gated every
  run; from then on each run waits for the one-minute load at most 40 (the machine held 40 to 160 most of the day).
