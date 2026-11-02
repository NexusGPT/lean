# Lane w9aa-coverage-and-callee (lean): the per-callee fact "writes none of its arguments" carried to lead-v4

Branch `lane/w9aa-coverage-and-callee` from lead-v4 9e0205f942. The DA row of this lane (the coverage record) is on the
DA branch of the same name; its result file is there.

## What landed

The mechanism was already built by lane w8e (`lane/w8e-callee-facts` 5b3ca53619, with w2a's `census.mjs --callees`).
Neither branch had reached lead-v4, so this lane merged it and fixed what the merge exposed.

- fda509f540: merge of `lane/w8e-callee-facts` (and through it `lane/w2a-callee-census`). Four files conflicted, and
  both sides were kept in each:
  - `common.mjs`: the lead's `typeReaches` beside w8e's `readAfterCall` header (`fact`, `factUsed`).
  - `tests/break.mjs`: both break sets.
  - `translate.mjs`: the lead's `worldWrites` beside w8e's fact hooks.
  - `exec/run.mjs`: the lead's search imports, value probes, intrinsic prologue and world summary beside w8e's
    call-site marks, hook, log and `bound.calleeFacts`.
- 74eb57c728: **`common.mjs readAfterCall heldBy`**, a false proof the merge created.
  - lead-v4's world-write points (lane w8c) tell the world about a write through an object it may hold. They decided
    "may hold" with `reached`, which w8e had narrowed to leave out what a fact call was handed.
  - A fact says the callee writes none of what it is handed. It does not say the callee keeps none of it.
  - So in `hold(b); b.n = w; heldN()`, where `hold` stores `b` and `heldN` reads it back, the write was local. heldN
    answered the same on both sides, and lane A proved a candidate that writes another value.
  - `heldBy` counts every value handed by then, a fact call's too. The fact still lifts the read after the call.
  - New pair unit `callee_fact` keptWrite and break `callee-fact-held`.
  - `tests/callee-fact.mjs` reads lane A alone on keptWrite: the translation with the facts lane B confirmed (taken
    from the certificate), the theorem, Dafny. check.mjs stops at lane B's witness, so it never runs lane A there.
- `design/w8e-callee-facts.md`: a dated section on heldBy.

How the fact works (w8e's design, unchanged here):
- A plain call to a function with a body in another source file of the unit's own package is eligible.
- Lane B rewrites the pair files' call sites and compares, before and after each call, the graph reachable from what
  the call (and earlier calls) were handed.
- Only facts lane B's record confirms on a side enter that side's translation, each as an `// ASSUME` line named in
  `lanes.A.assumptions`.

## Validators (verbatim)

Red first, at 9e0205f942 with the pair and the check copied in (`/tmp/w9aa-base`, removed after):
```
FAIL tags is PASS-proved: PASS-bounded (lane A ASK)
FAIL kept (a later fact call after a call that kept rec) is PASS-proved under both facts: PASS-bounded; null
callee-fact: 7 failed
exit=1
```
The heldBy mechanism, red before 74eb57c728 (the merge alone):
```
FAIL keptWrite is not proved by lane A under the facts lane B confirmed (the write is told to the world): PROVED (0 error line(s), lemma present in /tmp/lean-callee-fact-mTNXrP)
callee-fact: 1 failed
exit=1
```
Green (`node langs/ts/tests/callee-fact.mjs`, `LEAN_Z3=/opt/dafny/z3/bin/z3-4.12.1 LC_ALL=en_US.UTF-8`):
```
callee-fact: all hold (tags PASS-proved under 1 assumption(s), tagsWriter WITNESS, sameWriter PASS-bounded with lane A refused; kept PASS-proved under 2, keptWriter WITNESS, sameKeptWriter PASS-bounded; keptWrite WITNESS, lane A not proved)
exit=0
```
Breaks:
```
LEAN_BREAK=callee-fact exit=1 callee-fact: 4 failed
LEAN_BREAK=callee-fact-trace exit=1 callee-fact: 4 failed
LEAN_BREAK=callee-fact-prior exit=1 callee-fact: 1 failed
LEAN_BREAK=callee-fact-held exit=1 callee-fact: 1 failed
```
The tags certificate's assumption:
`callee shape.ts isPlainObject writes none of its arguments and answers none of their objects (lane B: 64 recorded call(s) at 1 site(s), none wrote or shared)`

Audit, `node langs/ts/lower.mjs --audit` (the same line at 9e0205f942):
`sites 666; by kind {"lint-refuse":381,"lint-advice":5,"translate-throw":4,"translate-refuse":276}; uncatalogued 0`

Withdrawal: `withdrawal: logic-values v1 refused identically by the lint, the translator and the record; check PASS-bounded (lane A ASK) under the withdrawal, PASS-proved without; audit 666 site rows, 0 uncatalogued`

The pair and the opaque-family regression pairs, alone (`JOBS=1 LEAN_PAIRS=<the 12> node langs/ts/tests/run.mjs`):

| pair | rows | failed |
| --- | ---: | ---: |
| callee_fact (new keptWrite) | 7 | 0 |
| opaque_read_after_call | 28 | 1 (also at the base, below) |
| alias_after_call | 7 | 0 |
| world_read_after_call | 12 | 0 |
| lib_lodash_get | 15 | 0 |
| fresh_local_handed | 2 | 0 |
| fresh_tree_handed | 3 | 0 |
| opaque_callee | 3 | 0 |
| opaque_statement_callee | 1 | 0 |
| world_masked | 1 | 0 |
| world_masked_infect | 1 | 0 |
| opaque_async_callee | 8 | 0 |

The run's summary lines:
```
| PROOF-HUNT TOTAL | 16 units read by both lanes | NO HIDDEN FALSE PROOF | 0 exempt by a door (adapter, NaN or infinity on a unit with no number operation) |
MODEL-CONFORMANCE TOTAL | 23 units in 4 pairs (8 skipped) | 2 executable: 2 agree, 0 disagree | 21 not executable, 0 outside domain, 0 not bridged, 0 model error, 0 skipped | 0 coupling finding(s) (2 sampled) | NO NEW FINDING |
| TOTAL | 973 checks | 2 FAILED |
```
The two failures are not this branch's. Both fail the same way at 9e0205f942
(`JOBS=1 LEAN_PAIRS=opaque_read_after_call`, `| TOTAL | 911 checks | 2 FAILED |`):
- `opaque_read_after_call | break handle-write: Equal_written flips to proved ... | FAIL | not proved under
  LEAN_BREAK=handle-write: the mechanism is not what refuses it`. The `written` translations are byte-identical on the
  base and this branch, with and without the break.
- `repo | pr intake | coverage and preview | FAIL`. The w9z z3 pin (`solve/pin.mjs checkPin`) runs z3 inside the
  preview audit, which stops it: `Error: Preview started a lane: spawnSync /opt/dafny/z3/bin/z3-4.12.1`. The base run of
  `tests/fixtures/pr-intake/test.mjs` gives exit 1 too.

Two checks scripts on the merged tree: `node langs/ts/tests/w1g-opaque-handed.mjs` exit 0;
`node langs/ts/tests/opaque-calls.mjs`: `116/116 rows hold`, exit 0.

## Measured: the census on one pair root, before and after

The root is a copy of `tests/pairs/callee_fact` (21 units over the two sides), run as
`node <tree>/langs/ts/census.mjs /tmp/w9aa-census-root --callees --out ... --report ...`.
- Before: 9e0205f942 plus w2a's census (`census.mjs` as merged here), a temporary tree.
- After: this branch.
- Records: `/root/da-bench/w9aa/census/{before,after}.{json,md,log}`.

| | before | after |
| --- | ---: | ---: |
| Units | 21 | 21 |
| Entered | 9 | 21 |
| Refused | 12 (all read-after-call) | 0 |
| Callee-only (`calleeTable.calleeOnly`) | 12 | 0 |
| Entered on a pending callee fact | 0 | 14 |

Report lines, before:
`Callee-only units by origin of their callees: project 12.`
`      12 units  read-after-call        candidate.ts:10 read-after-call: `rec` is read here after `isPlainObject(rec)` (line 9), a call that may change it: it is hand`

Report lines, after:
`Callee-only units by origin of their callees: none.`

How to read it:
- Entry under admission is conditional. The 14 units enter on a fact still pending lane B; `check.mjs` reads only the
  facts lane B confirms.
- The writers (isTagged, touchKept) are not confirmed when checked, and their units stay refused there: sameWriter
  and sameKeptWriter are PASS-bounded with lane A refused.
- The fall from 12 to 0 is admission, not proof. The proofs are tags and kept, PASS-proved.
- Lane w8e's census on agent-nexus, at its older base, measured callee-only 76 to 73 and entered 3,583 to 3,591. Not
  run again here: the brief rules out a project-wide census.

## Open

- Two failures that are the lead's, not this branch's (see above): the handle-write break row of
  opaque_read_after_call, and pr intake under the w9z pin.

- Impact on real verdicts is not measured: no mutant or PR verdict was counted before and after. The lead's mutant
  study on the merged head (`tests/mutants.mjs --delta`) is where it would show.
- w8e's open items stand:
  - the fact is checked on bounded runs;
  - the heap core is not lifted: an outside call there still changes the whole heap, as keptWrite's first shape
    showed;
  - callbacks and async callees are not eligible;
  - the census names the later call rather than the one the object was handed to.
- The fake-conformance row that w8e found failing on its base is not part of this run.
