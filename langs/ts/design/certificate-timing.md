# The certificate carries its timings; one entry point

## 2026-10-30: `certificate.timing` and `bin/lean`

**The record.** `check.mjs` writes `certificate.timing`, the wall-clock seconds of each lane that ran for the unit:

| key | what is timed |
|---|---|
| `B` | lane B, `exec/run.mjs` `runPair` (both sides run on the drawn inputs) |
| `correspondence` | the certified rungs before translation (`rungs.mjs` `certifyCorrespondence`) |
| `doubles` | the doubles reading (`solve/fp.mjs` `solveUnit`), recorded when it reads the unit, as `lanes.A.doubles` is |
| `translate` | lane A's translations of both sides, summed over the rounds of the heap-core agreement (`agreeCore`) |
| `theorem` | `spec/theorem.py` |
| `dafny` | `dafny verify` on the theorem (not the `--version` probes) |

A key is written only by the timer around the call that runs its lane, so a lane that did not run is an absent
key, never a zero: a unit lane B witnesses has `translate` and `theorem` (lane A reads the interface before the
witness is taken) and no `dafny`; a unit the correspondence rungs decide has no lane A translation key at all. A unit
`check.mjs` hands to its enclosing unit (`covered-by`) carries the timing of that run. A certificate `pr.mjs` reuses
from its cache keeps the timing of the run that produced it, byte for byte (the pr-intake identity test).

**Why it cannot change a verdict.** Nothing reads `timing`: every decision in `check.mjs` is taken from the lanes'
results before or beside the record, and the record is written after each lane returns. A wrong verdict through this
change would need a branch reading `cert.timing`, and there is none; the pairs `numbers`, `readme_ledger` and
`component` and the pr-intake test give the same verdicts and the same certificates otherwise. Seconds are a fact about
this run on this machine, not about the unit: they are not part of the run identity and no comparison of two
certificates should use them.

**One entry point.** `bin/lean check | lint | pr | census` runs `langs/ts/check.mjs`, `lint/lint.mjs`, `pr.mjs` or
`census.mjs` from the caller's directory with every argument after the command passed through, and returns the
script's exit code (128 + the signal number when it was stopped). No command, or an unknown one, is exit 2 with the
usage; `--help` is exit 0.

**Checks.** The runtime row `certificate-timing` (`tests/certificate-timing.mjs`) asserts positive seconds for the
lanes that ran on `numbers::average` (B and doubles), `readme_ledger::applyAll` (B, translate and theorem; no dafny,
no doubles) and `component::Counter`, and no key outside the table. The runtime row `bin-lean`
(`tests/bin-lean.mjs`) reads the README quickstart from the README, its `check.mjs` line, its `jq` projection and
the line it shows, runs it as `bin/lean check` and compares; it also checks the usage exits and that the lint's exit 1
comes through.

**Outside lean.** DA's regression row R10 timed its own translate, theorem and Dafny pipeline (`soundness.py`
`lane_a`) beside `exec/run.mjs`: a second product, which stopped matching this one once the doubles lane landed. It can
read `certificate.timing` of one `bin/lean check` per unit instead (lane B its `B`, lane A the sum of the lane A keys
present); its baseline is then re-cut, since lane A no longer means the old pipeline.

## 2026-10-31: the render row, `lanes.B.bound.render`

**The record.** Lane B's bound carries a render row beside `bound.states`, for the pixel-diff lane of DA
(`docs/architecture/pixel-diff-lane.md`, "The contract with lean's render row"). It is built in `exec/run.mjs`
`runPairOnce` where the bound is built, and reaches `certificate.lanes.B.bound` through `check.mjs` (and `pr.mjs`'s
basic certificate) unchanged. Five fields:

| field | type | source |
|---|---|---|
| `component` | boolean | some state of `bound.states` holds a `tree` with an element in it (`isJsxValue`): the parent returned an element on that input |
| `clock.epoch` | integer, ms | `CLOCK_EPOCH` of `exec/record.mjs`: the one constant the sandbox's `Date` and `Date.now` count from and the witness record names as `clockEpoch` |
| `sequences[]` | list of `{input, labels}` | every command path of `runSequences` (both the click machine and the schedule explorer) whose every step was equal on both sides, with the input it was mounted on; the mount alone (no label) is the state itself and is not listed. A WITNESS's own sequence is its witness's |
| `targets[]` | list of `{label, path, key, id, testid, role, name}` | per handler label, the element that holds it: from every state's tree (each `on[A-Z]` prop observed as `$handler`) and from every tree the parent's sequence paths reached (every command label of `treeHandlers`, so a handler shown only after a click has its target). `path` is the label before its last `:`; `key`, `id`, `role` are those props, `testid` is `data-testid`, `name` is `aria-label`; each a string or number, else null. A label whose element changes its props between states has one row per distinct target |
| `leanHead` | string | `opts.recordHead`, the head every witness record and the unit record name (`leanHeadForRecords`) |

**Why it cannot change a verdict.** Nothing reads `bound.render`: it is written beside the observations, after them,
from values lane B already held (the states, the trees the sequence paths reached, the labels they fired); no
comparison, budget or rung reads it. The epoch moved into one constant read by the sandbox and the record, the same
value as before.

**Not in it.** The finite lane (`exec/finite.mjs`) walks click orders from prop assignments, not from drawn inputs; an
assignment has no index in `bound.states`, so its paths are not listed and a component it decides has `sequences`
empty (its mount targets are listed). A bound built outside `runPairOnce` (a NEW unit, a REFUSE render-impure, a
spin-bound kill) has no render row.

**Checks.** The pair `render_row_fields` (one row per field per unit, read from `check.mjs`'s certificate): `Panel`
renders on every input, its clean sequences walk the button's click and the reset span's hover that only a click shows,
with both targets; `total` never renders (`component` false, no sequence, no target); `Toggle` is a WITNESS after one
click. The epoch row compares with `witnessRecord(...).clockEpoch`, the head row with the unit record's `leanHead`.
