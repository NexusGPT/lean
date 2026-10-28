# Lane B under a wall-clock bound: a child process per unit

## The defect

A unit whose awaits all settle in microtasks (an async loop that awaits a resolved promise, `await null`, or a fake
whose answer is already settled) never yields to the event loop: V8 runs the whole loop inside one microtask drain
(`MicrotaskQueue::RunMicrotasks`). Lane B's two bounds today do not reach it: the vm watchdog (`guardedCall`,
`vm.runInContext` with `timeout`) covers the synchronous call only and is off once the call returned its promise, and
`withTimeout` is a host timer, which never fires while the drain runs. No signal handler runs either, so the process
ignores SIGTERM. Seen twice: one unit spun for good under `check.mjs` (also the parent against itself), and a
`pr.mjs` run stopped after hours at full CPU with no output.

## The reading

Lane B runs each unit (both sides, every rung: inputs, programs, races, sequences) in a child process, `exec/worker.mjs`,
forked by `runPair` in `exec/run.mjs`. The parent process holds a wall-clock timer of `--unit-seconds` (default 120;
`check.mjs` and `run.mjs` take the flag; `pr.mjs` takes it too, and without it uses the smaller of its `--time-budget`
and 120). When the timer passes, the parent kills the child with SIGKILL, which no JavaScript can ignore, and the unit's
lane B verdict is ASK with `kind: "spin-bound"`, the reason naming the bound and where the child was:

    spin-bound: lane B passed its wall-clock bound (timeout) of 120 s per unit (--unit-seconds); the worker was killed
    at lane B (input 1), the parent side running

The child sends its breadcrumb (the step, the input, the side) before each step and each side's observation, so the
kill names them; it sends the result as JSON over the IPC channel, the same text `--out` writes. A child that exits
without a result is ASK naming what was pending. A child whose event loop drains before a verdict drains a caller that
armed the verdict guard (`check.mjs`, `run.mjs`), whose guard then answers ASK:harness exactly as before; a caller
without the guard (`pr.mjs`) gets that ASK as the unit's lane B result and goes on.
`check.mjs` then runs lane A as before; `pr.mjs` reports the row `failed:timeout` and goes on to the next unit.

Why a child process and not `worker_threads`: SIGKILL ends a process whatever it runs, where `Worker.terminate` relies on
V8 reaching an interrupt check; the permission model below is a per-process switch a worker thread cannot narrow; a
spinning unit that allocates (one sample held 554 MB) gives all of it back with the process.

What the child may touch: Node's permission model, `--permission` with `--allow-fs-read` for the lean sources
(`langs/ts`) and, for each of the two files, its tree (the nearest folder above it holding `.git`, else its package root),
the values file and the tsconfig when named. It writes nothing (the `LEAN_LIBRARY_CASES` folder excepted, when set), and
starts no process, worker thread, addon or inspector. An existence check outside the trees answers false (the model
throws there; the run asks whether the path exists). The network: this Node (24) has no network switch in its
permission model, so the child's network is what the sandbox gives the unit (`fetch`, every package and built-in import
are recording fakes); a vm escape to the host's own modules is not stopped by lean. A seccomp or sandbox-exec profile
around the whole run is the gate's, not lean's.

A unit whose parent does not hold it (a new unit) runs as before: `new-unit.mjs` starts its own bounded process.

## Soundness

The bound only ever turns a run into ASK; it never turns one into a WITNESS or a PASS. A WITNESS found before the kill
is lost with the child (the verdict is ASK, never a wrong PASS). The virtual clock is untouched: a timer the unit arms
fires in virtual time after the call (`runTimers`), whatever its delay, so a unit that waits an hour on its clock costs
no wall time and keeps its verdict. A legitimately slow unit that passes the bound is ASK, not a verdict.

## The pair

`tests/pairs/microtask_worker`: `drain` spins on a nonempty queue in two forms (lane B ASK spin-bound; lane A reads each
loop as an opaque block named by its text, not proved; `check.mjs` ASK); `later` arms a timer an hour away and awaits a
microtask, in two forms (lane B PASS-bounded; the timer callbacks are two texts for lane A, not proved); `double` is
untouched (proved).

## Measured

See the lane report (`harness/lanes/microtask-worker.md`): the per-unit cost of the child process and the pair step
before and after.
