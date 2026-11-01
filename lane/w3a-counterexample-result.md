# Lane w3a-counterexample: result (2026-11-01)

Branch `lane/w3a-counterexample`, cut from lead-vm 4747022f (v0.1.4 plus the Dafny resource-limit merge). Design note:
langs/ts/design/w3a-counterexample.md. Measurement files: /root/lanes/w3a-counterexample/measure/ (outside the tree).

## What changed

- `langs/ts/solve/counterexample.mjs` (new): one extraction (`dafny verify --extract-counterexample --filter-symbol
  Equal_<unit>`, `dafnyVerifyArgs`, the same resource limit), a second only when a sequence is held by its length
  alone (the elements read by ghost variables, taken from the state after the reads), the model read by the lemma's
  parameter types into JavaScript (conformance/dafny-text.mjs declarations, the SHAPES legend for heap references,
  bridge.mjs's mapping inverted), the input encoded by value (`encodeValue`), the replay in lane B by value
  (`replayInput`: run.mjs sandbox, pickUnit, enterWorld, observe, lane B's difference filters), `replayWitness` (a
  reader's replay from the certificate alone), `LEAN_BREAK=cex-replay` and `LEAN_BREAK=cex-replay-by-index`.
- `langs/ts/check.mjs`: `counterexampleStep` after a failed own lemma (both the doubles branch and the plain one);
  `certificate.lanes.A.counterexample {status, input, reason, model}`; WITNESS with `witness.source: counterexample`,
  `witness.value`, `witness.args`, both observations, `witness.replayed: true`; else `unconfirmed: {input, reason}` on
  the result; a resource-limit lemma records `none`, not asked.
- `langs/ts/exec/run.mjs`: `unloadableOnly` and `firstDifference` exported (no behaviour change).
- `langs/ts/conformance/dafny-text.mjs`: `legendOf` moved here from heap.mjs (heap.mjs re-exports it), so check.mjs
  does not load conformance/model.mjs, which imports tests/pool.mjs: found red by the suite row
  `no-silent-exit-importers` (pr.mjs from a copy of lean without tests/), green after.
- `langs/ts/tests/run.mjs`: the `counterexample` expectation (per unit: verdict, value or status and reason; every
  WITNESS replayed from the certificate in the test process; each `breaks` mechanism run with LEAN_BREAK and required
  to be refused); the runtime row `counterexample-reading` (tests/counterexample.test.mjs, 8 tests).
- Pairs: `cex_branch_literal`, `cex_string_literal`, `cex_record_field`, `cex_no_witness`.
- `subset.md` (the verdicts section: a WITNESS's input sources, `unconfirmed`), `design/admission-contract.md`
  (2026-11-01 section: the six proof-step decision sites).

## The pairs: before and after

Before: `node solve/cex-measure.mjs --pairs <14 pairs> --jobs 4` in a detached worktree of 4747022f (/tmp/w3a-base,
the pair files copied in); after: the same in this tree.

| pair:unit | before | after | input (witness.value) |
| --- | --- | --- | --- |
| cex_branch_literal:classify (`id === 7919n`) | PASS-bounded, A ASK:unproved | WITNESS, source counterexample | `[{"$bigint":"7919"}]` |
| cex_string_literal:route (`path === PREFIX + 'debug'`) | PASS-bounded, A ASK:unproved | WITNESS, source counterexample | `["admin/debug"]` |
| cex_record_field:lane (`!o.express && o.id === VIP + '-0001'`) | PASS-bounded, A ASK:unproved | WITNESS, source counterexample | `[{"$obj":[["express",false],["id","vip-0001"]]}]` |
| cex_no_witness:flag (`a + b === 'feature-x'`) | PASS-bounded, A ASK:unproved | PASS-bounded, A ASK:unproved, `unconfirmed` ("the replay agrees") | the model's strings, recorded |
| cex_no_witness:cube (equal; resources) | PASS-bounded, A ASK:resource-limit | PASS-bounded, A ASK:resource-limit, step `none` ("not asked: the lemma ran out of its resource limit") | none |

Measured while designing the pairs (single check.mjs runs): `x === 7919` on a `number` is already a lane B WITNESS
(exec/gen.mjs harvests the literal) and a computed number comparison is found by the doubles reading (solve/fp.mjs);
so the branch-literal pair uses a bigint, which neither reaches.

## Suite rows on the pairs

`JOBS=2 LEAN_PAIRS=cex_branch_literal,cex_string_literal,cex_record_field,cex_no_witness node langs/ts/tests/run.mjs`
(03:10, load 49; log measure/suite-cex-pairs.log): 878 checks, 2 FAILED, both runtime rows outside the pairs:

- every `counterexample` row PASS: classify, route, lane WITNESS (replayed from the certificate: differs at outcome);
  flag PASS-bounded (unconfirmed); cube PASS-bounded (none);
- every break row PASS, i.e. refused: `LEAN_BREAK=cex-replay` on classify, route, lane, flag (the step's WITNESS
  records no observation: "the witness was not replayed"; on flag the model's input agrees as well);
  `LEAN_BREAK=cex-replay-by-index` on classify, route, lane (the draw at the replay's index agrees: PASS-bounded,
  unconfirmed);
- `counterexample-reading` PASS (8 pass, 0 fail);
- FAIL `no-silent-exit-importers`: caused by this lane (check.mjs -> counterexample.mjs -> conformance/heap.mjs ->
  model.mjs -> tests/pool.mjs, absent from a copy without tests/). Fixed by moving `legendOf` (commit 2d99de41);
  `node langs/ts/tests/no-silent-exit-importers.mjs`: PASS.
- FAIL `dafny-resource-limit` in that run; `node langs/ts/tests/dafny-resource-limit.mjs` after the fix: PASS ("6
  dafny verify call sites pass the resource limit 60000000; CheckReplace's verdict and resource count the same alone
  and eleven at once").

Red first: at 4747022f the three WITNESS pairs end PASS-bounded (the table above), so their `counterexample` rows
fail there; the break rows are the mechanism removed, red as required.

## The population (the baseline measured first)

`node langs/ts/solve/cex-measure.mjs --population --jobs 4`: every unit whose expect.json has `b[unit] ===
'PASS-bounded'` and `equal[f] === false`, read from expect.json alone: 83 units in 48 pairs at 4747022f (88 after,
the five new units added).

| on the 83 units | before (02:2x) | after (03:28-03:35, load 93 to 117) |
| --- | --- | --- |
| verdicts | PASS-bounded 83 | PASS-bounded 83 (0 changes) |
| lane A | doubles-unknown 55, unproved 17, identity 10, theorem 1 | the same (0 changes) |
| step | - | unconfirmed, the replay agrees 39; unconfirmed, not bridged 32; not run 12 (identity 10, theorem 1, one doubles-unknown with no own failed condition) |
| mean seconds per unit | 12.13 | 16.53 (1.36x) |

Not bridged, by part: a receiver 17, the fuel parameter 4, slots 3, an opaque external type 8 (Ext_Sink 2, Ext_Port
2, Ext_Service 1, Ext_Selector 1, Any 1), a function type 1. These units are equal by design (lane B passes them and
their expect.json says only that the proof does not reach them), so no separating input exists: 0 WITNESS is the right
result, and 0 false witnesses.

## Time per unit on the pair corpus (the 2x bound)

Corpus: the four pairs plus ten population pairs (every fifth of the 48, sorted): absent_number, copied_argument,
exception_callback, heap5_globals, heap_index, loop_chain, mutual_summaries, operators_values, param_rebind,
this_method_override; 99 units.

| | before (4747022f, 03:35, load 64 to 147) | after (03:40, load 147 to 46) |
| --- | --- | --- |
| verdicts | PASS-proved 40, PASS-bounded 33, WITNESS 25, ASK 1 | PASS-proved 40, PASS-bounded 30, WITNESS 28, ASK 1 |
| mean seconds per unit | 10.57 | 9.29 |
| the 28 units the step ran on | 12.63 | 13.34; the step itself 2.85 mean |

Largest single-unit ratio: cex_record_field:lane 9.12 -> 15.42 s (1.69x, two extractions). Every ratio is under 2x;
the means are within the load's noise. The only verdict changes are the three WITNESS pairs.

## Conformance

`LEAN_PAIRS=cex_branch_literal,cex_string_literal,cex_record_field,cex_no_witness node langs/ts/conformance/run.mjs --jobs 2`:
5 units in 4 pairs, 5 executable: 5 agree, 0 disagree, 0 not bridged, 0 model error; 300 model runs agree;
NO NEW FINDING (03:44, load 42; 10.61 s wall; log measure/conformance.log).

## Open

- The full suite and `LEAN_CONFORMANCE=full` are the lead's at merge; the suite here ran on the four pairs.
- The receiver (17 of 32 not-bridged units) is the largest part not bridged: building `self` from the model's cell
  would need the receiver rebuilt as lane B builds it (constructed, not handed); w3c's search does not need it.
- One model per unit: a model that does not replay is not followed by a second with that input excluded.
- `LEAN_BREAK` is read in solve/counterexample.mjs as `LEAN_BREAK=<mechanism,...>` (w1e's reading); tests/break.mjs
  (A6, w1a) had not landed in any tree I could read, so the shared module is not used yet.
- Loads: the machine stayed above 40 for most of the lane (45 to 150); after the required waits every run used at most
  4 jobs (the suite 2), each load recorded above.
