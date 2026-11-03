# w9ab-world-calls result: a unit whose run never finished because a world call never settled

Branch `lane/w9ab-world-calls` from lead-v4 14b167a8e0. Lean commits: 39940412fa (the mechanisms and checks), ed44143a4b
(checkoutNamed covers a bare copy name; design/world-calls.md), 99dab3c88b (a never-settling input is skipped as a
timed-out one is, not the unit's ASK). Records under `/root/da-bench/w9ab/` only. No model in any path.

## The cause (general, not the three ids)

The unit `request` of `apps/vscode/scripts/repro-cloud-session.mjs` lives in a script whose top level asks a server and
then polls it with `await new Promise((r) => setTimeout(r, 1000))`. Two general causes:

1. **A timer the unit awaits never fired.** The sandbox's `setTimeout` arms the virtual clock. `runTimers` fired it only
   after the outcome, while `awaitUnit` waited for the unit's promise on the wall clock alone. So every input of a unit
   awaiting a callback-form timer (a back-off, a poll) ran out its wall allowance and was skipped. The result was
   PASS-bounded with nothing seen, after minutes (a two-unit probe hung check.mjs for more than 600 s). Fetch, streams,
   `http.request`, `timers/promises` and the bridge fake already settle by contract: each was probed with a change after
   the await, and each gave WITNESS.
2. **A module whose top level awaits hid its units.** lean's unit surface (`__lean_units`, the non-exported functions)
   was written at the end of the async body (lane w9o), so a body waiting on the world never published it. In the pair
   path that meant "unit request not exported". In new-unit.mjs (the file is added by the PR, so the mutants run
   candidate-only) the gate awaited the whole evaluation: the drawn 404 made the script throw (`ASK(fake answering at
   module evaluation)`), and a drawn success left it polling forever.

Also the row's `reason` named the temporary copy (`.lean-run/runs/<run>/sources/…/.lean_head_<pid>_…`), not the file.

## What landed (design/world-calls.md)

- `exec/run.mjs awaitUnit onClock` (LEAN_BREAK=world-clock): while a unit's promise is pending and the host's turn has
  drained, the clock moves to the next armed timer and fires it (at most 50 instants per await, then a budget ASK naming
  the await site). If nothing is armed and nothing moves for 8 turns and 200 ms, the input stops at once. It is skipped
  as a timed-out input is, with reason `unsettled: the unit awaits at <file>:<line> `<statement>` a promise no world call
  settles (last world call: <op> <path>; nothing armed)`. A timed-out input's reason now names where it stood
  (`first: timed out at <file>:<line> … (last world call: …)`, `bound.skipped.at`). Not under the race explorer.
- `exec/run.mjs earlyUnitShim, dropLoadTimers` and `exec/new-unit.mjs loadCandidate` (LEAN_BREAK=await-units):
  - In a module whose top level awaits, the unit surface is a set of getters at the body's start.
  - A body still paused drops the timers it armed while loading, so they never fire inside a unit's observation.
  - A new unit's module is evaluated up to its first pending await (a hoisted flag before its first awaiting statement).
    A rejection after the flag is the body's (`bound.moduleBody`); a rejection before it is the load's failure, as
    before.
  - An input whose drawn world the evaluation refuses is skipped and counted (`bound.refusedWorlds`, a `new:coverage`
    record).
- `pr.mjs checkoutNamed` (LEAN_BREAK=reason-names): a row's reason and its records' name the checkout file.

## Validators (output lines verbatim)

Pair `world_await` (request: not exported, awaits fetch; backoff: awaits a callback-form timer; chunks: awaits a
stream; each candidate changes what follows the await). On 14b167a8e0 (a detached worktree, pair copied in):
```
| pair | world_await | lane B request WITNESS | FAIL |             | ASK
| pair | world_await | lane B backoff WITNESS | FAIL |             | PASS-bounded
| pair | world_await | lane B chunks WITNESS  | PASS |             | WITNESS
| TOTAL | 3 checks | 2 FAILED |
```
On this branch:
```
| pair | world_await | lane B request WITNESS | PASS |             | WITNESS
| pair | world_await | lane B backoff WITNESS | PASS |             | WITNESS
| pair | world_await | lane B chunks WITNESS  | PASS |             | WITNESS
| TOTAL | 3 checks | ALL PASS |
```
Break rows (`tests/lib-break.mjs --pair world_await --jobs 1`, at 99dab3c88b):
```
| world_await | request | LEAN_BREAK=await-units | WITNESS -> ASK | PASS |
| world_await | backoff | LEAN_BREAK=world-clock | WITNESS -> PASS-bounded | PASS |
lib-break: 2 rows, 0 failed
```
`node tests/w9ab-world-calls.mjs` and `--break` (the new-unit gate, the unsettled reason, checkoutNamed):
```
| await-units | a new unit of a script that awaits the world at its top level runs | NEW; body {"state":"rejected","reason":"/session returned 401"}; refused 4 of 12 | PASS |
| world-clock | a promise no world call settles is named at its await | ASK: every input timed out (2 of 2); first: unsettled: the unit awaits at never.ts:4 `await new Promise(() => {});` a promise no world call settles (last world call: call global:fetch; nothing armed) (6 s) | PASS |
| reason-names | a row's reason names the checkout file | apps/vscode/scripts/repro-cloud-session.mjs: ASK(fake answering at module evaluation): POST /api/v1/session returned 404 | PASS |
w9ab-world-calls: 3 checks, 0 failed
| await-units | a new unit of a script that awaits the world at its top level runs | LEAN_BREAK=await-units: ASK; body null; refused 0 of 12; /root/lanes/w9ab-world-calls/tree/langs/ts/tests/fixtures/w9ab-world-calls/script.mjs: ASK(fake answering at module evaluation): /session returned 401 | RED as it must be |
| world-clock | a promise no world call settles is named at its await | LEAN_BREAK=world-clock: ASK: every input timed out (2 of 2); first: timed out at never.ts:4 `await new Promise(() => {});` (last world call: call global:fetch) (35 s) | RED as it must be |
| reason-names | a row's reason names the checkout file | LEAN_BREAK=reason-names: /w/ck/a#1~m1/lean/a#1~m1/.lean-run/runs/run-lVB1Lf/sources/apps/vscode/scripts/.lean_head_2682037_repro-cloud-session.mj | RED as it must be |
w9ab-world-calls --break: 3 checks, 0 failed
```
`node tests/opaque-unit.mjs --break`: exit 1 (last lines `FAIL step line var (wld, retb, u) := ext_block_x(wld, u);`,
`FAIL step signature {"id":"block_x","ins":["World","U"],"out":"(World, Option<int>, U)"}`).

### Regression pairs sharing lane B's world, each alone (`tests/run.mjs --pair <p>`, JOBS=1, nice 15)

The bridge, fake, timer and module-await families, and every pair whose parent awaits or arms a timer. The first sweep
ran at 39940412fa:
```
    bridge_fake_thenable exit 0 | TOTAL | 15 checks | ALL PASS |
    cause_fake_recursion exit 0 | TOTAL | 3 checks | ALL PASS |
    fake_crypto exit 0 | TOTAL | 6 checks | ALL PASS |
    fake_fetch exit 0 | TOTAL | 14 checks | ALL PASS |
    fake_fs exit 0 | TOTAL | 8 checks | ALL PASS |
    fake_path exit 0 | TOTAL | 6 checks | ALL PASS |
    fake_path_row exit 0 | TOTAL | 13 checks | ALL PASS |
    fake_process exit 0 | TOTAL | 6 checks | ALL PASS |
    fake_storage exit 0 | TOTAL | 10 checks | ALL PASS |
    fake_throw exit 0 | TOTAL | 5 checks | ALL PASS |
    fake_timers exit 0 | TOTAL | 6 checks | ALL PASS |
    fake_url exit 0 | TOTAL | 10 checks | ALL PASS |
    module_await exit 0 | TOTAL | 2 checks | ALL PASS |
    timers exit 0 | TOTAL | 15 checks | ALL PASS |
    window_timers exit 0 | TOTAL | 3 checks | ALL PASS |
    async_branch_exit exit 0 | TOTAL | 7 checks | ALL PASS |
    async_branch_exit_arms exit 0 | TOTAL | 4 checks | ALL PASS |
    async_loop_exit exit 0 | TOTAL | 17 checks | ALL PASS |
    blocker_async_port exit 0 | TOTAL | 9 checks | ALL PASS |
    callbacks exit 0 | TOTAL | 5 checks | ALL PASS |
    cause_world_reach exit 0 | TOTAL | 5 checks | ALL PASS |
    clock exit 0 | TOTAL | 9 checks | ALL PASS |
    counter exit 0 | TOTAL | 13 checks | ALL PASS |
    effectful_callbacks exit 0 | TOTAL | 29 checks | ALL PASS |
    exception_callback exit 0 | TOTAL | 35 checks | ALL PASS |
    for_each exit 0 | TOTAL | 8 checks | ALL PASS |
    function_values exit 0 | TOTAL | 10 checks | ALL PASS |
    generators exit 0 | TOTAL | 30 checks | ALL PASS |
    lane_b_reach exit 0 | TOTAL | 15 checks | ALL PASS |
    lib_axios exit 0 | TOTAL | 1 checks | ALL PASS |
    logic_values exit 0 | TOTAL | 12 checks | ALL PASS |
    microtask_worker exit 0 | TOTAL | 9 checks | ALL PASS |
    module_forms exit 0 | TOTAL | 33 checks | ALL PASS |
    named_then exit 0 | TOTAL | 15 checks | ALL PASS |
    object_accessor_faults exit 0 | TOTAL | 42 checks | ALL PASS |
    opaque_async exit 0 | TOTAL | 18 checks | ALL PASS |
    opaque_async_callback exit 0 | TOTAL | 14 checks | ALL PASS |
    opaque_async_callee exit 0 | TOTAL | 8 checks | ALL PASS |
    opaque_async_origin exit 0 | TOTAL | 17 checks | ALL PASS |
    opaque_async_predicate exit 0 | TOTAL | 14 checks | ALL PASS |
    opaque_async_reduce exit 0 | TOTAL | 14 checks | ALL PASS |
    opaque_capture exit 0 | TOTAL | 2 checks | ALL PASS |
    opaque_promise exit 0 | TOTAL | 15 checks | ALL PASS |
    opaque_promise_all_order exit 0 | TOTAL | 3 checks | ALL PASS |
    opaque_promise_executor exit 1 | TOTAL | 14 checks | 1 FAILED |
    opaque_promise_executor_escape exit 0 | TOTAL | 14 checks | ALL PASS |
    opaque_promise_thenable exit 0 | TOTAL | 2 checks | ALL PASS |
    opaque_promise_unsettled exit 0 | TOTAL | 14 checks | ALL PASS |
    operators_values exit 0 | TOTAL | 57 checks | ALL PASS |
    optional_calls exit 0 | TOTAL | 5 checks | ALL PASS |
    promise_fallback exit 0 | TOTAL | 21 checks | ALL PASS |
    promise_forms exit 0 | TOTAL | 10 checks | ALL PASS |
    promise_integration exit 0 | TOTAL | 15 checks | ALL PASS |
    promise_module_nullish exit 0 | TOTAL | 17 checks | ALL PASS |
    promise_then exit 0 | TOTAL | 33 checks | ALL PASS |
    race_lines exit 0 | TOTAL | 7 checks | ALL PASS |
    race_pure exit 0 | TOTAL | 5 checks | ALL PASS |
    readme_search exit 0 | TOTAL | 5 checks | ALL PASS |
    sandbox_boundary exit 0 | TOTAL | 5 checks | ALL PASS |
    schedule_explorer exit 0 | TOTAL | 9 checks | ALL PASS |
    service exit 0 | TOTAL | 8 checks | ALL PASS |
    spread_outside exit 0 | TOTAL | 47 checks | ALL PASS |
    this_param exit 0 | TOTAL | 23 checks | ALL PASS |
    try_catch exit 0 | TOTAL | 8 checks | ALL PASS |
    two_callers exit 0 | TOTAL | 14 checks | ALL PASS |
    void_promise exit 0 | TOTAL | 23 checks | ALL PASS |

```
opaque_promise_executor's `outside` went ASK. On input 16 the world faults `svc.get` inside an async executor, so
`resolve` is never called and the promise never settles on either side. At 14b167a8e0 that input timed out and was
skipped; the first Unsettled stop made the whole unit ASK. Fixed structurally in 99dab3c88b: a never-settling input is
skipped as a timed-out one is. Rerun at the final code:
```
    opaque_promise_executor exit 0 | TOTAL | 14 checks | ALL PASS |
    world_await exit 0 | TOTAL | 3 checks | ALL PASS |
    module_await exit 0 | TOTAL | 2 checks | ALL PASS |
    microtask_worker exit 0 | TOTAL | 9 checks | ALL PASS |
    race_pure exit 0 | TOTAL | 5 checks | ALL PASS |
    this_param exit 0 | TOTAL | 23 checks | ALL PASS |
    try_catch exit 0 | TOTAL | 8 checks | ALL PASS |
    two_callers exit 0 | TOTAL | 14 checks | ALL PASS |
    void_promise exit 0 | TOTAL | 23 checks | ALL PASS |
```
(module_await, microtask_worker and race_pure were rerun because they expect an ASK, which the change could flip. The
last four were rerun because they may have started before the edit.)

## The three ids (bench/hour.py, the brief's command, `--out /root/da-bench/w9ab/hour`)

| run | lean | M record | M rendered | the three `request` rows |
|---|---|---|---|---|
| w9ab-13799-0 (before) | 14b167a8e0 | 0 of 3 | 0 of 3 | ASK failed:loader, reason `<temp path>: ASK(fake answering at module evaluation): POST /api/v1/session returned 404: 0` |
| w9ab-13799-2 (after) | 99dab3c88b | 0 of 3 | 0 of 3 | NEW checked; records: 13 of 30 inputs skipped (token drawn absent), every admitted input reached the world (5 of 5) |

Verbatim: before `14b167a8e0 M rendered 0 of 3 (0.0 %), record 0 of 3, completed 3 of 3, wall 5.3 min`; after
`99dab3c88b M rendered 0 of 3 (0.0 %), record 0 of 3, completed 3 of 3, wall 3.4 min` (intermediate 39940412fa: the same
0 of 3).

The unit now runs, but none of the three is seen. The file is added by the PR, so a mutant's row is candidate-only
(new-unit.mjs). A fact needs a closed call, and every call of `request` reaches `fetch`. That is w9k's rule: a
world-answered outcome is no fact. The ceiling is set by the new-code lane, not by world calls. In the pair path (the
same script as parent and candidate), m1 and m2 are WITNESS; m3 (204 to 205) is PASS-bounded, because the fetch fake's
statuses never draw 204 or 205 apart.

## Open

- A mutant inside a file the PR adds is judged candidate-only. Comparing against the PR head (the mutant's own parent)
  would see m1 and m2. That is the bench's and new-code's design, not this lane's.
- The fetch fake's status rotation has no 204/205 pair (m3).
- A continuation that never yields (a loop after an await, inside a microtask) is stopped by the worker's CPU bound,
  whose reason names the input and side, not the statement: no handler runs inside one microtask drain.
- run.mjs's async body (w9o) still treats a throw before the module's first await as late. new-unit's gate now tells the
  two apart; the pair path does not.
