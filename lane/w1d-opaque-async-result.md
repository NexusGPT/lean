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
the one-minute load is at most 40). At ce1e6c415c (the last full run; the commits after it change only `pendingWork`'s
heap and handed-reference tests and add a lint fixture, rerun below when it lands):

- 15 pairs, **176 of 176 rows PASS**, the break rows included: `async-drop-reads` flips each of the 10 per-rule pairs'
  `upstream` unit to a false proof (a local only the step reads, changed before it: a change outside the construct, A1);
  `async-drop-origins` flips opaque_async_origin's count, share and bump (A2, the amendment's own pair plus another name
  for the origin and a rebinding in the argument); `async-drop-carry` flips its branch unit (the step in an `if`);
  `async-drop-callees` flips opaque_async_callee's run (a callee changed at `x === 7919` only, A3); each without the break
  is not proved, and stay (an unchanged callee, a change outside the step) is PASS-proved.
- `async-drop-pending`: lane A on opaque_capture directly: refused as written (naming async-callback), a false
  `Equal_capture` proof under the break. **PASS.**
- Lint: every graded unit's findings labelled `expression`, the two locality pairs' findings keep their refusal with the
  column's reason, the three generator rules keep theirs (`tests/w1d-fixtures/generators.ts`), and the five pending-work
  cases of `tests/w1d-fixtures/pending.ts` (deep alias refused, own-level write graded, module cell graded, handed and
  read after refused, handed and read before graded): **ALL PASS** at 9e6c3772b5 (`--only none`, lint rows alone).

Other checks at 9e6c3772b5: `node langs/ts/tests/opaque-unit.mjs` passes; `node langs/ts/tests/withdrawal.mjs` passes;
`node langs/ts/lower.mjs --audit`: 605 sites, 0 uncatalogued (the table in admission-contract.md regenerated).

## Census (A8 roots)

`node langs/ts/census.mjs /root/da/census/repos/<root> --install-under /root/census-installs/w1d --out <json> --report <md>`;
before at the cut point 4747022f (`git archive` into scratch), after at this branch. Units my rules stop (the
`refusalRules` partition) before:

| root | units | entered before | my rules stop (before) |
|---|---|---|---|
| nexus-automations | 235 | 78 (33.2%) | async 1, promise 1, promise-pending 1 |
| nexus-meeting-recorder | 105 | 39 (37.1%) | none |
| apps-ui | 2,361 | 714 (30.2%) | promise 1, promise-executor-escape 1, promise-pending 1 |

FINAL-CENSUS

## Measured on the way (the census showed it, the mechanism fixed it)

- `acquire` (nexus-automations server/runner.ts): the executor pushes its resolver into a module cell; pending work
  writing the world is what the argument allows. Admitted (module cells are world fields: their reads and writes are
  transitions, checked by translating a unit that reads the cell after the step).
- `fileToDataUri` (apps-ui): the executor writes `r.onload` of a `new FileReader()` it made; such a write cannot change
  the unit's state when it is at the object's own level. Admitted; a deeper path (`o.a.n` through a literal that holds
  `user`) stays refused (a hole the earlier test had, closed by the same change).

## Open

- No promise-handler pair: no unit-level site of the rule was raised by the probes or the census (its findings sit on
  handlers, values, which keep their refusal by locality).
- A translator defect outside this lane: an `await` inside an `if` branch of an async unit emits a fault arm of type
  `(World, Unit)` against `World` (seen in `save` of the first A3 fixture; the fixture was restated).
- Load discipline: two early runs started above load 40 (a pair at 109, the baseline census at 65) before I gated every
  run; from then on each run waits for the one-minute load at most 40 (the machine held 40 to 160 most of the day).
