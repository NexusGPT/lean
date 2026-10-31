# The suite runner (langs/ts/tests/run.mjs, tests/pool.mjs)

## 2026-10-31: a Dafny call can never hang the suite (lane suite-wall-cap)

The fact. One full suite run sat for 17 minutes on one `dafny verify --verification-time-limit 90 … theorem.dfy`. One z3
ran at 100 percent CPU and Dafny's time limit never fired: z3's soft timeout is not honoured in some bit-vector searches.
The run waited on that one child until it was killed by hand, which turned eleven proved rows red. Alone, the same unit
verified in 80 seconds.

The rule. Every Dafny child the test and conformance runners start carries a wall cap of three times its
`--verification-time-limit` plus 60 seconds. A call that names no limit (`translate`, `run --no-verify`) gets Dafny's
default of 30 s, so 150 s. On the cap the child and every process under it are killed. The result then has the shape
spawnSync gives on its own timeout: `status: null`, `signal: 'SIGKILL'`, `error.code: 'ETIMEDOUT'`, and a last stderr
line `wall cap <N> s exceeded`. Readers handle it as follows:

- `dafnyResult` reads such a result as not proved, with that line as its summary.
- A pair's lemmas read `not proved: wall cap <N> s exceeded`.
- The step cache never stores it (a signal or an error is unstable), so the next run tries again.

The mechanism, one for macOS and Linux: `spawnCollect` (pool.mjs) with `wallCapMs`, the default for any `dafny`
command. On the cap, `killTree` works in two steps:

1. It stops the child with SIGSTOP, then walks down the tree with `pgrep -P` (procps on Linux and the BSD pgrep on macOS
   both take `-P`). Each process found is stopped at once, and its own children are listed only after it is stopped. A
   stopped process forks no more and stays the parent of its children, so the walk misses none.
2. It kills every process found with SIGKILL.

Every Dafny call that ran synchronously now runs through this async path: the pair step's `dafny verify` in run.mjs, and
`compileSide`'s `dafny translate js` in conformance/model.mjs, which is now async and awaited at pair.mjs's top level.
`dafny --version` (stepcache.mjs) starts no solver, so spawnSync's own `timeout` with `killSignal: 'SIGKILL'` covers it.

Why not the other mechanisms:
- spawnSync returns the child's pid only after the child has ended. Its `timeout` kills the child and leaves the
  solver running, and the pid tree cannot be collected before that kill.
- Sweeping `pgrep -P 1 -f z3` for orphans started after the call: twenty lanes share this machine, and each of them
  orphans z3 processes started after our call began. A sweep by name and start time would kill other lanes' solvers.
- A process group (`detached: true`, then kill `-pgid`): a detached child leaves the suite's terminal group, so a Ctrl-C
  on the suite no longer reaches Dafny or z3. That leaves exactly the orphans this rule exists to prevent.

The test is tests/wall-cap.mjs, the suite's runtime row `wall-cap`. A fake `dafny` that starts a child sleeping 600 s is
capped at 2 s; both processes are gone within 5 s of the cap and the result has the shape above. A fake that ends under
its default cap passes through unchanged. The test fails without the cap (the child is still running at 20 s). It also
fails when the cap kills only the parent: the sleeping child survives it.

2026-10-31 (lane check-wall-cap): the checker's own Dafny call is under the same cap. spawnCollect, killTree and the cap
rule now live in exec/capped.mjs, which pool.mjs re-exports and check.mjs imports. check.mjs's `dafny verify` keeps its
own budget, (--dafny-seconds + 60) for each translated unit, or --dafny-wall-seconds. On the cap it kills Dafny's pid tree
(the spawnSync `timeout` it replaces left z3 running), lane A reads ASK:timeout with `wallCap`, and the verdict's reason is
`not proved: wall cap <N> s exceeded`. run.mjs's `node check.mjs` children carry a cap of 3 x (--unit-seconds +
--dafny-seconds + --fp-seconds) + 60 s (check.mjs checkWallCapMs; 690 s at the suite's --dafny-seconds 30). wall-cap.mjs
part 4 runs check.mjs with a fake `dafny` that hangs on `verify`; it fails on the spawnSync timeout (the sleeping child
outlives it). A check capped this way still exits 0, so the step cache reads the cap's line as unstable (stepcache.mjs
UNSTABLE) and never stores it; part 4 runs through the cache and fails without that entry.

## 2026-10-31: a proof's verdict never depends on the machine's load (lane dafny-resource-limit)

The fact. The full suite at 7663d77f passed on this server (5,085 checks, JOBS 12, 32 cores). On a 12-core Mac at
JOBS 11 it had one red row: `| construct | string_helpers | concrete Dafny assertions | FAIL | … 72 verified, 0 errors,
1 time out |`. Run alone on the idle Mac, the same row gave `73 verified, 0 errors` in 15 s. Every `dafny verify` lean
ran was bounded by wall-clock time: `--verification-time-limit 30` (tests/strings/run.mjs,
tests/numbers_doubles/faithful-run.mjs), `60` (the construct rows' `R.dafny`, check.mjs's default `--dafny-seconds`),
or `30` stretched up to 4 times by the share of cores one Dafny got (tests/run.mjs, the pairs' lane A). Under load, a
batch that needs 20 s of solver work takes 40 s of wall time and times out. The stretch was a patch for one load
pattern. Any load it did not foresee still turned a proof into a time-out.

The rule. A proof is bounded by the solver's resource count: Z3's `rlimit`, passed as Dafny's `--resource-limit`. For
the same Dafny, Z3 and theorem the count is the same on every machine and under every load. In Dafny 4.11.0 the value
is in the units the CSV log reports as `TestResult.ResourceCount` (not thousands). A batch that hits the limit reads
`Error: Verification out of resource (<name>)`, and the summary reads `N out of resource`. Every call site takes its
arguments from one module, exec/dafny-args.mjs `dafnyVerifyArgs()`:
`--resource-limit 60000000 --verification-time-limit 720 --solver-path <the one Z3>`.

The measurement. Every `dafny verify` the full suite runs was logged: the pairs' lane A, the construct rows, the string
helpers, the `node check.mjs` rows and the conformance models. The run used `LEAN_CONFORMANCE=full JOBS=12`, a fresh
step cache (3,070 misses, 0 hits), and a wrapper `dafny` on PATH that added `--log-format csv`. The wrapper's own run
was green: 5,085 checks, ALL PASS. It logged 447 calls and 11,503 verification conditions (assertion batches). The
maximum for each condition (its name in its theorem) is below. Dafny 4.11.0 ran with Z3 4.12.1.

| conditions | count | max | p99 | p90 | median |
|---|---|---|---|---|---|
| proved | 10,459 | 16,697,049 | 598,680 | 92,107 | 31,082 |
| not proved | 1,044 | 177,525,077 | | | |

The ten largest proved conditions:

| resources | wall at that run | condition | theorem |
|---|---|---|---|
| 16,697,049 | 17.0 s | JsBitsInjective (correctness) | pair arithmetic_core (also object_methods, 6.6 s) |
| 16,696,259 | 7.8 s | JsBitsInjective (correctness) | pair numbers_bits_rebase |
| 15,569,653 | 10.2 s | EqualCanon_pair_named (correctness) | pair heap_canonical |
| 14,665,278 | 7.4 s | EqualCanon_attach_named (correctness) | pair heap_canonical |
| 14,498,714 | 3.7 s | JsHalfBitsNat (correctness) | pair arithmetic_core (also object_methods) |
| 14,497,889 | 2.7 s | JsHalfBitsNat (correctness) | pair numbers_bits_rebase |
| 12,565,575 | 9.6 s | CheckReplace (correctness) | string_helpers (the Mac's red row) |
| 9,030,423 | 4.7 s | EqualCanon_unhook_named (correctness) | pair heap_canonical |

That is eight rows, because JsBitsInjective and JsHalfBitsNat each appear in three theorems with the same count. The
count does not depend on the load. It moves a little with the solver process's history: CheckPad read 80,656 with
16 cores and 78,017 with `--cores 1`, a 3.3 percent change. CheckReplace read 12,565,575 in every run measured: alone,
eleven at once, and under the full suite.

The not-proved side. Seven conditions hit the old time limit (120 s, the stretch at JOBS 12) at 37 M to 79 M resources:

- `JsUnsigned_bv32 (well-formedness)`, a prelude function, in the pairs arithmetic_core, heap_shapes and numbers_bits;
- `EqualCanon_setflag_named` and `EqualCanon_clearlow_named` in arithmetic_core;
- `EqualCanon_bump_named` in heap5_arith.

Each of these pairs proves its units by the direct lemma, so the rows pass either way. Run alone at
`--resource-limit 300000000` with no time limit, the three in arithmetic_core were still out of resource after 10 to
20 minutes. They never prove, so a limit in the tens of millions cannot turn one of them into a proof. They now stop
at 60 M instead of at 120 s.

The largest not-proved condition, `EqualCanon_retitle_named` in heap_shapes, found its counterexample at 177 M
resources in 32 s. It now stops at 60 M as out of resource. In both readings the lemma's span holds an error, so the
row is the same.

The constant: `DAFNY_RESOURCE_LIMIT = 60,000,000`, 3.6 times the largest proved condition. Why at least three times:

1. The count drifts with the solver process's history (3 percent measured).
2. A proof grows with the prelude and the translator. Room for threefold growth lets a proof get that much bigger
   before it becomes an ASK, and that ASK then says so.
3. The cost is bounded. A condition that never proves runs until the limit. The slowest rate measured was 252,000
   resources per second (EqualCanon_setflag, 300 M in 1,188 s, beside the suite), so the limit costs at most 240 s per
   such batch. The old stretched limit cost 120 s.

A larger margin would double that cost on every condition that never proves, and buys nothing the measurement asks
for. A change of Z3 changes the counts (solve/z3.mjs picks the Z3), so it is measured again before this constant moves.

The wall clock. It no longer bounds a verdict. Two bounds remain, and both only stop a hung solver:

- `--verification-time-limit 720` is `DAFNY_TIME_LIMIT_S`: three times the 240 s the limit takes at the slowest rate
  measured. A batch that needs no more than the limit times out first only if it runs three times slower than any
  batch the full suite ran on 32 cores. Kept rather than 0, because it is Dafny's own per-batch stop: a hung batch ends
  as one `time out` and the call's other batches keep their verdicts. With 0, the only stop left would be the whole
  call's cap, and that cap cannot be both generous enough for a call that runs many batches back to back and short
  enough to catch one hung batch.
- The wall cap (exec/capped.mjs, unchanged rule): three times the time limit plus 60 s, so 2,220 s for a call. It kills
  a solver that honours neither bound (the 17-minute z3 above).

check.mjs's own cap is (`dafnyTimeLimitS(--dafny-seconds)` + 60) s for each translated unit. `checkWallCapMs` counts
the same bound. `--dafny-seconds` can raise the per-batch bound and never lowers it, so the `--dafny-seconds 1` of a
declared-in-scope unit (pr.mjs) bounds nothing. The cores split in tests/run.mjs stays: it changes how long a proof
takes, never what it proves.

The verdict's word. Lane A's ASK reasons, as the certificate names them:

- `ASK:unproved`: the unit's own lemma failed.
- `ASK:resource-limit` (new): every error in the lemma's span is a batch that ran out of the limit. The proof needs
  more than N resources. This is a fact about the proof's size, and it is the same on every machine. The reason reads
  `not proved: the proof needs more than 60000000 resources (--resource-limit, exec/dafny-args.mjs)`. The certificate
  holds `resourceLimit` always, and `resourceOut` when the limit was hit.
- `ASK:timeout`: the wall cap killed the call (`wallCap`). This is the only verdict that still says something about
  the machine.
- `ASK:translation-defect`: Dafny gave no summary line.
- `ASK:interface`, `ASK:identity`, `ASK:obligation`, the model defects: as before.

`timedOut` and `ASK:timeout` keep their meaning, the wall cap. pr.mjs `coverageOf` reads `ASK:timeout` as
`failed:timeout`. `ASK:resource-limit` is `checked`, as `ASK:unproved` is: a verdict exists, and running again gives
the same one. `timeLimitSeconds` stays in the certificate and now holds the per-batch bound in force (720).
tests/stepcache.mjs still declines to store an output that reads `out of resource`. That costs a rerun, never a
verdict.

The test: tests/dafny-resource-limit.mjs, the suite's runtime row `dafny-resource-limit`.

1. It scans every `dafny verify` lean's source starts (five sites: check.mjs, the pairs and the construct rows in
   tests/run.mjs, strings/run.mjs, faithful-run.mjs) for `dafnyVerifyArgs(` and for no time limit of the site's own.
   It also checks that the module's time limit cannot fire before the resource limit at three times the slowest rate.
2. It runs CheckReplace once alone and eleven times at once with `--cores 1`. Every run must give the same verdict
   line and a resource count within a quarter of the alone run's. On this server the count was 12,565,575 every time,
   in 4.4 to 7.1 s of wall.
3. It runs a copy of langs/ts with the limit at 2,000 on a pair the real limit proves. The copy must read
   `ASK:resource-limit` with the reason, and the real tree must read `PASS-proved`.

`--break` uses the arguments from before this lane (`--verification-time-limit 30`, no resource limit). Part 1 fails
on it. Part 2 cannot be red on demand on an idle 32-core box. What the parallel run showed by hand, CheckReplace with
`--cores 1`:

| arguments | alone | 22 at once |
|---|---|---|
| `--verification-time-limit 6` | proved | 22 of 22 `1 time out` |
| this lane's arguments | proved | 22 of 22 proved |

The red row on the Mac, made on demand.

Not changed, and why:

- spec/check.py (`TIME_LIMIT = '60'`) and langs/py/tests/run.py (`--verification-time-limit 30`) are Python, and the
  TypeScript suite runs neither. They need the same constant in a form Python reads. That is left for the lane that
  owns them.
- pr.mjs's run budget (`--time-budget`, `unitSeconds + dafnySeconds + 30` for each task) is the supervisor's budget
  for the whole run, not a verdict. It is unchanged.
