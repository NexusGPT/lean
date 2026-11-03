# World calls settle: a unit's await under lane B's fake world (lane w9ab)

## The miss

cline#13799~m1, ~m2, ~m3 change `request` in `apps/vscode/scripts/repro-cloud-session.mjs`, a script whose top level
asks a server (`await request("/api/v1/session", …)`) and then polls it (`await new Promise((r) => setTimeout(r,
1000))` in a loop). All three stayed ASK: at s75 lean timed out on the unit, at 547d the row was `failed:loader` with
a reason that was a temporary file's path. Two general causes, neither of them the three ids.

1. **A timer the unit awaits never fired.** The sandbox's `setTimeout` arms the virtual clock (`fake.mjs arm`), and
   `runTimers` fired the queue only after the outcome. A unit awaiting `new Promise((r) => setTimeout(r, n))` (a retry's
   back-off, a poll) waited for its promise on the wall clock alone (`awaitUnit`, `withTimeout`), so every such input ran
   out its wall allowance and was skipped: PASS-bounded with nothing seen, after minutes. `timers/promises`, fetch,
   streams, `http.request` and the bridge fake already settle by their contracts (each probed: WITNESS on a change after
   the await).
2. **A module whose top level awaits hid its units.** lean runs such a module as an async body (lane w9o), but its unit
   surface (`__lean_units`, the non-exported functions) was written at the body's end, so a body that waits on the world
   never published it ("unit request not exported"). For a file the PR adds, `new-unit.mjs` awaited the whole
   evaluation: the drawn 404 made the script throw (the `fake answering at module evaluation` ASK), and a drawn success
   left it polling forever.

## The contract

- **The clock moves while a unit waits** (`exec/run.mjs awaitUnit`, `onClock`). While a promise the unit returned is
  pending and the host's turn has drained, the clock moves to the next armed timer and fires what is due there
  (`runTimers` with `until`), as the event loop would. Timers the unit armed and did not await still fire after the
  outcome. At most 50 instants per await (a poll past them is a budget ASK naming the await site). Not under the race
  explorer (`env.scheduler` holds every release) and not inside a firing.
- **A promise no world call settles is named.** Nothing armed and nothing moving (trace, pending work, queue) for 8
  turns and 200 ms of wall: the input stops at once, `budget: unsettled: the unit awaits at <file>:<line> \`<statement>\`
  a promise no world call settles (last world call: <op> <path>; nothing armed)`. A timed-out input's reason names
  where it stood the same way (`the first stood at …`).
- **The units of an awaiting module are reachable** (`earlyUnitShim`). At the body's start, on its first line, after
  its directive: each unit a getter that reads its binding when picked (uninitialised reads as undefined), and the
  module-state getter. A body still paused when the module is picked drops the timers it armed while loading
  (`dropLoadTimers`): they are its continuation, and its requests would otherwise land in a unit's observation.
- **A new unit's module is evaluated up to its first pending await** (`new-unit.mjs loadCandidate`). The emitted module
  sets a hoisted flag just before its first top-level statement that awaits; the surface is a hoisted function of
  getters. A rejection after the flag is the body's reaction to the world (`bound.moduleBody`), a rejection before it is
  the load's failure as before; a pending body is loaded. An input whose drawn world the evaluation refuses (a token
  drawn absent) is skipped and counted (`bound.refusedWorlds`, a `new:coverage` record); every input refused is the
  load's ASK, as before.
- **A row names the checkout file** (`pr.mjs checkoutNamed`), never `.lean-run/runs/<run>/sources/…/.lean_head_<pid>_…`.

## Checks

- Pair `world_await`: `request` (not exported, awaits fetch), `backoff` (awaits a callback-form timer), `chunks` (awaits
  a stream); each candidate changes what follows its await. WITNESS ×3; on 14b167a8e0 ASK, PASS-bounded, WITNESS. Break
  rows: `await-units` request ASK, `world-clock` backoff PASS-bounded.
- `tests/w9ab-world-calls.mjs [--break]`: the new-unit gate on `fixtures/w9ab-world-calls/script.mjs`, the unsettled
  reason on `never.ts`, `checkoutNamed`.

## Not done

- A continuation that never yields (a loop after an await, in a microtask) is stopped by the worker's CPU bound, whose
  reason names the input and the side, not the statement: no handler runs inside one microtask drain.
- run.mjs's async body still treats a throw before the module's first await as late (w9o's rule); new-unit's gate now
  tells the two apart, the pair path does not.
