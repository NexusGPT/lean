# check-wall-cap: result (2026-10-31)

The checker's own Dafny call runs under the suite's wall cap. One helper, `tests/capped.mjs`, holds `spawnCollect`,
`killTree`, `dafnyWallCapMs` and `wallCapMs`. pool.mjs re-exports it and check.mjs imports it. check.mjs's `dafny
verify` now runs through spawnCollect with its own budget: (--dafny-seconds + 60) for each translated unit, as before,
or the new --dafny-wall-seconds. On the cap it kills Dafny's whole pid tree; the spawnSync `timeout` it replaces left
z3 running. Lane A then reads ASK:timeout with `wallCap: 'wall cap <N> s exceeded'`, and the verdict's reason is
`not proved: wall cap <N> s exceeded`. The verdict otherwise stays the rung lane B supports (a capped result is never
a crash). run.mjs's `node check.mjs` children carry 3 x (--unit-seconds + --dafny-seconds + --fp-seconds) + 60 s
(check.mjs `checkWallCapMs`; 690 s at the suite's --dafny-seconds 30, defaults 120 and 60 for the other two).

## Commits
- ae82e3a6f: capped.mjs (moved out of pool.mjs, re-exported there), check.mjs (Dafny through spawnCollect,
  --dafny-wall-seconds, checkWallCapMs, the reason), run.mjs (the six `node check.mjs` call sites: runCheck, crunCheck,
  and the witness-lines runner with wallCapMs), stepcache.mjs (UNSTABLE gains `wall cap [\d.]+ s exceeded`),
  wall-cap.mjs part 4, design/suite.md (the "not covered" paragraph replaced by the 2026-10-31 check-wall-cap entry).
- The result file commit follows this one.

A finding outside the brief's words, fixed at its mechanism: a check whose Dafny hits the cap still exits 0. Nothing
in UNSTABLE matched its out JSON, so the step cache would have stored the capped verdict and replayed it. This was
already true of the old spawnSync timeout's ASK:timeout. The cap's line is now unstable, as design/suite.md states for
every capped result.

## Pairs (JOBS=2 node langs/ts/tests/run.mjs --pair <pair>, exit codes as run)
- heap_canonical 13/13 ALL PASS, exit 0
- type_tests 59/59 ALL PASS, exit 0
- copied_argument 10/10 ALL PASS, exit 0
- arithmetic_core 33/33 ALL PASS, exit 0
- adapters 14/14 ALL PASS, exit 0 (not named in the brief; its `check` rows are check.mjs children, which none of
  the four named pairs runs). Run again with LEAN_STEP_CACHE=0, so the three check.mjs children and their real Dafny
  ran through crunCheck and the new async Dafny call: 14/14 ALL PASS, exit 0, no cap fired.

## Test
`node langs/ts/tests/wall-cap.mjs`, part 4: check.mjs with a fake `dafny` first on PATH whose `verify` starts a child
sleeping 600 s, run with --dafny-wall-seconds 2 through the step cache (a cache of the test alone).
- Green: exit 0. The fake and its child were gone 2.3 to 2.4 s after the start. The check exits 0 with PASS-bounded,
  reason `not proved: wall cap 2 s exceeded`, lanes.A ASK:timeout, `wallCap` `wall cap 2 s exceeded`, nothing stored.
- Red, check.mjs's call back on spawnSync with the same timeout (no shared cap): exit 1, "the checker's capped Dafny
  left running 7.2 s after it started" (the sleeping child; the test's sweep killed it by its recorded pid, and ps
  confirmed it was gone).
- Red, UNSTABLE without the cap's line: exit 1, "a check its wall cap cut short is never stored in the step cache".
- Parts 1 to 3 (the runner's cap) are unchanged and green.
- `node langs/ts/tests/pool.test.mjs`: the file does not exist in this tree (lead-09032a59). Not run; pool.mjs is
  covered by wall-cap.mjs and the pairs above.

## Regressions
None in the runs above. No full suite was run (the lead runs it at the merge). No pair expectation was changed.

## Census
- n8n, langchainjs: not run. The change alters how lane A's Dafny call is killed past its unchanged budget, not what
  it reads.
- nexus: not run, memory.

## Left
- The other runners' check.mjs children (conformance, self-pair, the converter and pr.mjs in run.mjs's sections) run
  through the pool without a check cap. Their own Dafny is now capped inside check.mjs, so none can leave a solver
  behind, but a lane B that never returns is bounded only by --unit-seconds.
- `producerHash` skips `tests/`, so a change to tests/capped.mjs does not invalidate stored check.mjs results. A capped
  result is never stored, so this only matters if the helper changed a result that was not capped.
