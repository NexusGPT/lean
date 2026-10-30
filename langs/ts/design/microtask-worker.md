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
`check.mjs` then runs lane A as before; `pr.mjs` reports the row `failed:spin-bound` (its own coverage value, apart from `failed:timeout`; a failed row is never cached, so a later run with a larger bound checks the unit again) and goes on to the next unit.

Why a child process and not `worker_threads`: SIGKILL ends a process whatever it runs, where `Worker.terminate` relies on
V8 reaching an interrupt check; the permission model below is a per-process switch a worker thread cannot narrow; a
spinning unit that allocates (one sample held 554 MB) gives all of it back with the process.

What the child may touch: Node's permission model, `--permission` with `--allow-fs-read` for the lean sources
(`langs/ts`) and, for each of the two files, its tree (the nearest folder above it holding `.git`, else its package root),
the values file and the tsconfig when named, and the `node_modules` folder of every folder from each of those up to
the root, followed through a link (module resolution, Node's and TypeScript's, looks in each of them, and TypeScript
reads a linked package at its real path). Without that last part a tree whose `node_modules` links out of it (a
checkout whose dependencies live in another checkout or a shared store) had no declaration and no package in the
child: a parameter typed by a package was drawn as an opaque value, and the concept bench lost witnesses on units
that read such a value (Capture.push, `chunk: Buffer`, at 1cc98dec). Test `tests/linked-dependencies.mjs`. It writes nothing (the `LEAN_LIBRARY_CASES` folder excepted, when set), and
starts no process, worker thread, addon or inspector. An existence check outside the trees answers false (the model
throws there; the run asks whether the path exists). The network: this Node (24) has no network switch in its
permission model, so the child's network is what the sandbox gives the unit (`fetch`, every package and built-in import
are recording fakes); a vm escape to the host's own modules is not stopped by lean. A seccomp or sandbox-exec profile
around the whole run is the gate's, not lean's.

A unit whose parent does not hold it (a new unit) runs as before: `new-unit.mjs` starts its own bounded process.

## Defaults

`--unit-seconds` defaults to 120 s in `run.mjs` and `check.mjs`. `pr.mjs` uses the flag when given, else the smaller of
`--time-budget` and 120 s, else 120 s. The run budget is checked before each unit (A4), so a run ends within its budget
plus one unit's bound and that unit's lane A. A killed unit's certificate names the side that was running
(`lanes.B.bound.killedAt.side`), and `check.mjs` carries the spin-bound reason into its verdict.

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

## The bound is the unit's own CPU time (2026-10-29)

The parent reads the worker's main-thread CPU time (Linux: `/proc/<pid>/task/<pid>/stat`; macOS: `ps -M -p <pid>`,
first row; elsewhere the process total) once a second and kills the child when it passes `--unit-seconds`; a wall
clock of ten times the bound stays as the far guard, and where no CPU reading exists the wall clock is the bound as
before. A unit at full speed on an idle machine read 121 s of process time in 90 s of wall time through V8's helper
threads, which is why the main thread's own time is the measure.

The in-process watchdogs (the per-call `--ms` allowance, the drive timeouts) are wall clocks stretched by the load
factor, the load average per core read once at the unit's start: a call starved by other processes keeps its CPU
share. CPU time itself does not stretch: a spinning call under a load of k per core takes k times the wall and burns
the same CPU. The unit's bound covers the unit's real work; a call that hits its own `--ms` bound is paid for by that
bound, so the worker reports each such call in its breadcrumb and the parent grows the unit's allowance by `ms` for
every one (the far wall guard follows). Without it, for_desugar `chunks` (half its drawn sizes spin, 2 s each, two
sides, 30 inputs: 60 s of bounded calls beside the work) lived at the 120 s bound and was killed on some runs while
every per-call bound was doing its work; the ASK names the calls counted.

The worker's heap is a quarter of the machine's memory, never below V8's default (`--max-old-space-size`): a spinning
call allocates for its whole allowance (the chunking loop pushing empty slices reached 4 GB in 16 s), and an exhausted
heap aborts the process, which loses the unit (ASK:harness, SIGABRT) where the per-call bound would have skipped one
input.

### The bound is stated for an idle core (2026-10-30)

A CPU second buys less work when the thread shares a core or runs on a slower one. The suite measures the idle-core
rate once before its pool starts (`cpuRateNsPerIter`, the median of five short integer spins read by this thread's CPU
time) and hands it to every child as `LEAN_CPU_BASELINE`; each unit samples its own rate at its start and at every input
and reports the running mean's ratio in its breadcrumb; the parent stretches the unit's allowance by that ratio and the
ASK names it. The ratio is capped at `CONTENTION_CAP` (3): an efficiency core runs at about a third of a performance
core, so a reading above that is the sampler disturbed, not the unit starved; without the cap a spin test stretched six
times ran 734 s. Measured on the eleven-worker suite: with the stretch every verdict held (this_param bump, the self-pair
counts), where the unstretched bound had flipped two rows under a load average of 150.
