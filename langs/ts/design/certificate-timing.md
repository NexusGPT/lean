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
