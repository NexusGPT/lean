# Lane w8e-callee-facts: result (2026-11-01)

Branch `lane/w8e-callee-facts`, head 45cae98052. Started from `lane/w1m-opacity-merge` at 2521973962; w1m moved
(w1d-opaque-async and w1e-opaque-this-globals merged, head a59440d06b), and the branch was rebased onto a59440d06b at the
end (`git rebase --rebase-merges`; two conflicts, both kept both sides: census.mjs in the w2a merge, as in the first merge,
and the break registry). `lane/w2a-callee-census` is merged in (609365f4bb) for `census.mjs --callees`. Every number below
is on the rebased head unless it says otherwise; the base is 609365f4bb (a59440d06b plus the w2a merge).

Design: `langs/ts/design/w8e-callee-facts.md`. Scripts and records: `lane/w8e-callee-facts-scripts/`; raw outputs under
`/root/da-bench/w8e-callee-facts/final/`.

## What landed

- `callee-facts.mjs`: when a call is eligible for the fact "writes none of its arguments and answers none of their
  objects". The call must be plain (no `?.`, spread or `new`) and handed no function value. The callee must resolve to a
  function with a body in another source file of the unit's own package. Packages, Node modules and other workspace
  packages are not eligible: lane B fakes them, and a fake writes what it is handed. The key is w2a's (`calleeOf`).
  `confirmedFacts` reads lane B's record against the side's own text. `factDecider` is `pending` under admission and the
  confirmed keys under check.mjs.
- `exec/callee-trace.mjs` + `exec/run.mjs`: lane B rewrites every call site of the pair's two files; evaluation order and
  the engine's TypeError are unchanged. Per call it compares, before and after, the graph reachable from the receiver,
  the arguments and everything the run handed recorded calls earlier (an earlier callee may have kept one). It also checks
  whether the answer shares an object. Each site records wrote, shared, outside (a fake), unrecorded and async; built-ins
  run unrecorded. `transitions.mjs` skips the recorder's frames, so library-table records still name the unit's file.
- `common.mjs readAfterCall`: what a fact call is handed counts as no change at that call, nor at a later fact call;
  every other call after it still counts. Each fact used is an `// ASSUME` line, so `lanes.A.assumptions` names it with
  lane B's count.
- `check.mjs`: per side, the facts lane B confirmed (`--callee-facts`); `lanes.B.calleeFacts`. `lower.mjs`: admission
  under pending facts (`unit.calleeFacts`). `census.mjs`: `enteredOnCalleeFacts` and per-record `calleeFacts`.
- Pair `tests/pairs/callee_fact` (6 units), `tests/callee-fact.mjs` (suite row `callee-fact`), breaks `callee-fact`,
  `callee-fact-trace`, `callee-fact-prior`.
- w2a's `census-callees` fixture rebuilt: the opacity lanes enter the optional calls it refused. Its expectations were
  recomputed and its `--break` is still red.

## Validators (verbatim output lines)

- Pairs, `node langs/ts/tests/callee-fact.mjs`:
  `callee-fact: all hold (tags PASS-proved under 1 assumption(s), tagsWriter WITNESS, sameWriter PASS-bounded with lane A refused; kept PASS-proved under 2, keptWriter WITNESS, sameKeptWriter PASS-bounded)`
  - tags: refused read-after-call on the base. Under the confirmed fact it is PASS-proved, with the assumption
    `callee shape.ts isPlainObject writes none of its arguments and answers none of their objects (lane B: 40 recorded call(s) at 1 site(s), none wrote or shared)`.
  - tagsWriter: the same move across a planted callee that writes its argument: WITNESS.
  - sameWriter: no move, the writing callee; the fact is not confirmed and lane A stays refused read-after-call.
  - kept, keptWriter, sameKeptWriter: the same three cases across a call that kept the object.
- Red first, the same check against the base (pair and check copied in): `callee-fact: 5 failed`, exit 1 (tags
  `PASS-bounded (lane A ASK)`).
- `LEAN_BREAK=callee-fact`: `callee-fact: 4 failed`, exit 1. `LEAN_BREAK=callee-fact-trace`: `callee-fact: 4 failed`,
  exit 1. `LEAN_BREAK=callee-fact-prior`: `callee-fact: 1 failed`, exit 1. Each break proves sameWriter or sameKeptWriter
  under a premise lane B saw broken.
- `node langs/ts/tests/census_callees.mjs`: `census-callees: all hold`; `--break`: `census-callees: 6 failed`.
- Audit, `node langs/ts/lower.mjs --audit`: `sites 658; by kind {"lint-refuse":381,"lint-advice":5,"translate-throw":4,"translate-refuse":268}; uncatalogued 0`.
  The base gives the same line.
- Withdrawal, `node langs/ts/tests/withdrawal.mjs`:
  `withdrawal: logic-values v1 refused identically by the lint, the translator and the record; check PASS-bounded (lane A ASK) under the withdrawal, PASS-proved without; audit 658 site rows, 0 uncatalogued`
- Repo conformance, `python3 -I conformance/run.py ts`: `conformance: PASS, 253 of 253 checks passed, languages: ts`.
- 30-pair regression (lane/w1h-census/sample-pairs.txt) plus callee_fact,
  `LEAN_CONFORMANCE=full JOBS=4 LEAN_PAIRS=<31> node langs/ts/tests/run.mjs`: `| TOTAL | 1309 checks | 1 FAILED |`, wall 1587 s.
  - The one failure is `conformance fakes`: `36 fake(s) under exec/fakes, 29 pass ... 7 BAD`. The base fails the same:
    `node langs/ts/conformance/fakes.mjs` there gives the same `29 pass ... 7 BAD` (node:fs ENOTDIR, url, timers, vscode,
    Response, fetch). It is not this lane's and not fixed here.
  - **Not ALL PASS**: the brief's validator is not met on this row. I did not run the whole suite on the base; the base
    comparison covers this row only.
- Proof hunt (in that run): `proof-hunt | all pairs | 179 units read by both lanes | PASS`.
- Model conformance (in that run):
  `MODEL-CONFORMANCE TOTAL | 193 units in 28 pairs (3 skipped) | 89 executable: 81 agree, 8 disagree | 88 not executable, 10 outside domain, 6 not bridged, 0 model error, 0 skipped | 0 coupling finding(s) (0 sampled) | NO NEW FINDING |`
- Pair rows in that run: callee_fact tags PASS-proved (lane A PASS-proved), tagsWriter WITNESS, sameWriter PASS-bounded,
  kept PASS-proved, keptWriter WITNESS, sameKeptWriter PASS-bounded; runtime `callee-fact` PASS.

## Measured: census on agent-nexus (one of w2a's roots)

`bash lane/w8e-callee-facts-scripts/census-one.sh <tree> /root/da/census/repos/agent-nexus <out>`
(`census.mjs --callees --install-under /root/census-installs/w8e --clean-after`, on a copy).

| | Base 609365f4bb | Lane 45cae98052 |
| --- | ---: | ---: |
| Units | 4,171 | 4,171 |
| Entered | 3,583 | 3,591 (+8) |
| Callee-only (calleeTable.calleeOnly) | 76 | 73 (-3) |
| Callee-only by read-after-call alone | 59 | 56 (-3) |
| Callee-only with a project callee | 16 | 12 |
| Entered units resting on a pending callee fact | 0 | 147 |

Reading the numbers:
- The lift on this root is small: +8 entered, -3 callee-only.
- Most of the 147 units resting on a pending fact entered on the base too, through the opacity ladder's opaque steps.
  Under the fact their read after the call is exact instead of opaque. That is a change of reading, not of entry.
- Most remaining read-after-call callee-only units are callees no fact can cover: `typescript` and `commander` are
  packages lane B fakes, and await-ed async callees are recorded async.
- The census often names the wrong call for a refusal. An object handed to an earlier call is read after a later one, and
  the census attributes the refusal to the later call. For example, walk-source is blocked by its own recursive
  `walkFolder`, not by `isHiddenName`.

Entry under admission is conditional. How often lane B confirms the facts, measured on the first 30 top-level units of
that run admitted on a pending fact:
- Commands: `node lane/w8e-callee-facts-scripts/confirm.mjs <tree> <census.json> <root> 30 <out>`, then
  `confirm-offline.mjs`. Each unit is checked against itself (parent = candidate).
- Facts are read from lane B's `bound.calleeFacts` with `confirmedFacts`. The check itself proves these units by the
  parsed-equal shortcut before the fact step, so the fact step never runs in the certificate.
- Result: `{"units":30,"allConfirmed":19,"someConfirmed":21,"keys":61,"keysConfirmed":44,"siteFailures":{"outside":34,"async":7,"wrote":16}}`
- 19 of 30 units have every pending fact confirmed, and 44 of 61 keys are confirmed. The rest fail on a fake at the call
  (34 sites: the callee lane B called was a fake; why, per site, is not read here), a callee that writes (16) or an async
  answer (7). Records: `lane/w8e-callee-facts-scripts/confirm-agent-nexus-45cae98052.jsonl`, `confirm-offline-45cae98052.txt`.

## Open

1. **Impact on real changes not measured.** The census measures admission, and the sample measures confirmation.
   Neither measures how many mutant or PR verdicts become PASS-proved, or stay correct, under the fact. That needs the
   mutant runner on units like the 19, or DA's 55 injected bugs. I ran neither, so there is no DA number here.
2. **The fact is checked on bounded runs.** Lane B's inputs, at most 64 calls per site per side. A callee that writes
   only on inputs lane B never draws passes the record, and the proof is then named as resting on that assumption.
3. **The heap core is not covered.** An outside call there havocs what it is handed, and the fact does not lift it.
   Units over plain records, like the first `bump` shape, stay unproved.
4. **Callbacks and async callees are not eligible.** A callee handed a function (find, some, forEach) or one answering a
   promise never gets the fact. Covering them needs the callback's own writes read, and an await's continuation.
5. **The census attributes refusals to the wrong call**, in w2a's attribution: it names the call the read follows, not
   the call the object was handed to.
6. **Rebinding misfire.** A plain rebinding `out = base` after a call is refused read-after-call although it reads
   nothing (`readAfterCall` visits the left-hand name). Not touched here.
7. **The 30-pair regression is not ALL PASS.** The fake-conformance row fails on the base too; its owner should fix the
   7 BAD fakes.
8. Population: one root (agent-nexus). The other 17 of w2a's roots are not run.
