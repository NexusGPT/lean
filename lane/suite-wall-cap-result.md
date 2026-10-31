# suite-wall-cap: result (2026-10-31)

Every Dafny child in the test and conformance runners carries a wall cap: 3 x its --verification-time-limit + 60 s
(Dafny's default of 30 s when the call names none). On the cap the child and its whole pid tree are stopped (SIGSTOP,
walked with `pgrep -P`), then killed with SIGKILL. The result is { status: null, signal: 'SIGKILL',
error.code: 'ETIMEDOUT' } and its last stderr line is `wall cap <N> s exceeded`. dafnyResult reads it as not proved
with that summary, and the pair rows read `not proved: wall cap <N> s exceeded`. The step cache does not store it.
The reasons for this mechanism over the alternatives are in langs/ts/design/suite.md (2026-10-31).

## Changes
- tests/pool.mjs: spawnCollect `wallCapMs` (default for `dafny`), dafnyWallCapMs, killTree.
- tests/run.mjs: the pair step's `dafny verify` now runs through cachedRunAsync + spawnCollect (it was sync crun);
  dafnyResult and the pair rows read the cap; new runtime row `wall-cap`.
- conformance/model.mjs: compileSide is async (spawnCollect); conformance/pair.mjs awaits it.
- tests/stepcache.mjs: `dafny --version` gets spawnSync timeout + SIGKILL (it starts no solver).
- tests/wall-cap.mjs: new test.

## Evidence (exit codes as run)
- `node langs/ts/tests/wall-cap.mjs`: exit 0. The fake and its sleeping child were killed 2.3 s after the start.
- Red, scratch edit with the cap timer removed: exit 1 ("the capped child was still running after 20 s").
- Red, scratch edit where the cap kills only the parent: exit 1 (the sleeping child is still running at 7.2 s).
- `JOBS=2 node langs/ts/tests/run.mjs --pair` heap_canonical 13/13, type_tests 59/59, copied_argument 10/10:
  ALL PASS, exit 0.
- heap_canonical with LEAN_STEP_CACHE=0 (real Dafny through the new async path): 13/13, ALL PASS.
- End to end, capped on purpose: a fake `dafny` first on PATH hung on `verify` and passed everything else to the real
  Dafny; run as copied_argument with LEAN_STEP_CACHE=0 and JOBS=2. The run ended at 160 s (cap 150 s). Every lemma read
  `not proved: wall cap 150 s exceeded`, and the fake and its sleep were both gone. The 2 red rows are the proved rows
  the fake blocked, as intended.
- Conformance, `LEAN_PAIRS=copied_argument,heap_canonical node langs/ts/conformance/run.mjs --jobs 2`: exit 0, 9 units,
  0 skipped, NO NEW FINDING.
- No full suite was run (the lead runs it at the merge). No census was run.

## Left
- check.mjs's own Dafny call (spawnSync with a timeout and SIGTERM) can leave a z3 orphan after its timeout. It is the
  checker, not a runner, and so outside this brief.
- run.mjs's `run` for `node check.mjs` children has no wall cap; those children bound their own Dafny.
