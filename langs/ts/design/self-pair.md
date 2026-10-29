# Self-pair control

A WITNESS claims an observable difference under the same drawn world. A parent
compared with itself must never witness. This control executes both sides; it does
not short-circuit equal paths or equal source text.

## The historical settle witness

The supplied base already includes effba950. Its program setup drains load-time
continuations before clearing both environments. Its Settle command takes both
trace marks before draining their shared host event loop. The old implementation
let module-entry continuations run during the parent's settle, then took the
candidate's mark after those continuations had already run. The candidate's trace
window omitted the same work the parent included. This was observation-window
asymmetry, not a different seed or a legal alternate timer order.

The challenge's getAdminToken record has seed 1, n 30, no parameters, the program
`settle, return(4, 4)`, fast-check path `0`, commands replayPath `AA:B`. Its first
step witnesses disconnect/error requests only on the parent. Those commands and
paths describe the historical failure; the current runner uses the recorded seed
and generation bound, without pretending that a vanished witness replays.

No production runtime change is needed for that case. fake.mjs is untouched and
there is no proposed fake change. No trace sorting or mismatch suppression is
introduced.

## Permanent control

`tests/self-pair.mjs` enumerates the source units of each pair's parent, including
units absent from expect.json's b map. Candidate-only fixtures with parent files
contribute those files too. It runs self-pair fixtures and optionally every row of
the historical lane-B sample. Each manifest row runs independently, even when two
sample classes name the same unit. LEAN_PAIRS filters by exact directory name;
unknown names fail. An absent parent is listed explicitly. Missing sample sources,
runner errors, missing verdicts and an unfinished manifest cannot pass the control.

Each unit runs via runPair's isolated worker and existing per-unit bound. Jobs
are capped at two, default one. No result is cached between invocations. The output
file is populated with pending rows before dispatch and updated after each result;
each replacement writes a sibling .next file then renames it atomically, so a
partial write does not destroy the preceding snapshot and still exits nonzero;
interrupted runs retain their running/pending rows. The summary counts PASS-bounded,
PASS-decided, ASK and REFUSE separately. ASK/REFUSE satisfy only the no-WITNESS
invariant, not successful execution coverage. Dedicated fixtures must PASS-bounded.

The suite replaces the narrower load-time-work fixture loop with one row invoking
this script. It inherits LEAN_PAIRS and accepts LEAN_SELF_PAIR_SAMPLE (and optional
LEAN_SELF_PAIR_SAMPLE_ROOT for a relocated source tree). Without a sample path,
the row explicitly says sample not supplied. Portable pair tests do not depend on
an owner's checkout; the complete acceptance command supplies the sample.

`fixtures/self-pair/ordered-work.ts` adds ordered requests with seeded clock and
random reads across an await. A controlled mutation reverses only the candidate's
command trace in program.mjs. The runner must report WITNESS and exit nonzero;
the original program bytes are restored before the green run. This mutation checks
that the control observes both executions and preserves effect order. The existing
load-time-work fixture retains the original settle regression.

## Commands and measured evidence

See the lane report for measured results and exact commands. Raw manifests,
per-unit verdicts, mutation output and seed results are under the worktree's
`work/self-pair` directory; that directory is evidence, not production code.

The full sweep encountered host ENOSPC while saving its manifest. Its failed
attempt is retained separately; unfinished rows can be re-run with explicit
LEAN_PAIRS names and reconciled by task ID. No interrupted row is counted as a
pass. A partial-write fault injection first destroyed the prior snapshot, then
preserved it after atomic replacement was introduced; both injected child runs
exited nonzero. The lane report records the commands and final reconciliation.

## Completed acceptance evidence

The lane report records exact commands and artifacts. `work/self-pair/combine.py`
and `work/self-pair/summarize.py`, run from
`/Users/assem/nexus/nexus-organisation/work/lean-lanes/self-pair-2`, reconciled
all 1525 original task IDs: 1487 pair-parent units, 35 sample rows, 3 fixtures.
There were 0 WITNESS, 1504 PASS-bounded, 6 PASS-decided, 13 ASK and 2 REFUSE.
ASK/REFUSE establish only that no witness was produced, not successful equality
coverage. The first attempt remains failed on ENOSPC; recovery supplies the
unfinished rows and counts each original task once. Runtime code is unchanged.

`node work/self-pair/seeds.mjs` verified getAdminToken at the supplied base for
seeds 1 through 20, all PASS-bounded. The planted ordering defect produced a
nonzero control exit before restoration. The selected suite command
`LEAN_PAIRS=env_programs,schedule_explorer,two_callers,heap_methods JOBS=1 node langs/ts/tests/run.mjs`
passed 828 checks; its detector read 10 units with no hidden false proof, and its
self-pair row passed. That suite ran on the initial control commit; the subsequent
atomic-write-only change passed the partial-write fault control, fixture rerun,
and recovered sweep.
