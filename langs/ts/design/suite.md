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
