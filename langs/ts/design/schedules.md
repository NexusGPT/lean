# Scheduled promises, two callers, an order set bounded by conflicts

Source: the owner's research of 2026-10-27, section 2, `design/research-integration.md` section 11, the challenge's
limit 2 (`lean-v3/challenge/dossier-limits-nexus.md`).

## The construct

A unit that checks a shared cell and acts on it across an `await`. Each handler runs to completion, so the race is
one of ORDER: a second call arriving while the first is suspended sees the cell between the check and the act. One
call per input, with every promise the world answers resolved at once in call order, never reaches that state.

## The scheduler (exec/fake.mjs, exec/program.mjs)

- `Environment.scheduler` is null by default: a promise the world answers resolves at once, in call order. That is
  the default schedule, and every verdict outside the race explorer keeps its meaning.
- Under the explorer every such promise (a typed `Promise<T>` answer and a faulted one) is held by fast-check's
  scheduler (vendored 4.10.2) until released. An execution's releases are given to `fc.schedulerFor` as a live
  ordering of task ids, so an execution replays as that ordering; three more per side are drawn by `fc.scheduler()`
  from the seed (replayable by the seed).
- The program: the first call runs to its first suspension; the second call's ARRIVAL is a scheduled event; then one
  release at a time, the microtasks run to quiescence after each. Events are named by lineage (`call1/1` is the first
  promise held while `call1` ran), so a name means the same event in every execution.

## The conflict relation and the order set

Per event the explorer records the cells it read and wrote and whether it asked anything of the world. A field of the
receiver is a cell (a proxy over the instance sees each read and write); a field holding an object, once read, is
written by that event and every later one (a local may alias it: `const s = this.inFlight; ... s.add(k)`); a module
variable, a module constant holding a value that may be mutable, a static field, an accessor or a value import of a
sibling module makes every pair dependent; two events that both make requests are dependent (the trace is ordered).
From the first-in-first-out execution, for every later event j and earlier dependent event k, a prefix that releases
j (or the ancestor that armed it, when j was not yet armed) at k's place is added, once; a prefix that takes more
than b = 2 releases out of arm order is cut and counted. Two orders that differ only by independent swaps are run
once.

## The verdict and the bound

Each side's orders give a SET of observations (each call's outcome, the trace, the receiver's fields, pending work).
Equal sets: no race difference. A difference is a WITNESS only when the side lacking the observation explored every
order within the bound (none cut): it carries the distinguishing order, the first-in-first-out order, both
observations, the dependent pair (the first event the distinguishing order moved, the event it moved before, the
cells they share) and the distinguishing order replayed. When that side was cut, ASK. The certificate
(`bound.races`): two live calls, b, the programs, the orders per side, the dependent pairs, the drawn orders, and the
sentence: complete only within the stated bound and event model.

## Soundness

- An order only ADDS observations to a side's set. A WITNESS is an observation one version reaches and the other
  reaches in no order within the bound, on a side whose bounded set is complete.
- The reduction is conservative: an access the proxy cannot see (module state, an alias, a static, an accessor)
  makes the events dependent, never independent. The drawn orders check it: an observation a drawn order reaches
  outside a complete side's set is ASK naming the order (this check caught the alias case during the build).
- A PASS is bounded by k = 2 live calls, b = 2 preemptions and the event model; it is never a proof. Flanagan and
  Godefroid's completeness result is for acyclic state spaces under their transition model; lean does not transfer it.

## What lane B sees, and what stays out

Lane B sees: the two calls' outcomes, every request in its global order, the receiver after both, the pending work.
It runs for an async method (one instance per side, the constructor unchanged) and an async free function. Stays out:
more than two callers; timers inside the explorer (the schedule explorer of moonshot 9 owns them); true parallelism
(workers); the outside's own ordering (two processes, a database isolation level, Redis): a property of the world,
modelled at most as a transition whose order is drawn; a class with a private name `#x` (the proxy cannot carry it).
Lane A is unchanged: the race is lane B's alone.

## Instances (the dossier's, limit 2)

- `apps/backend/src/chats/code-interpreter/session.service.ts:116`, `getOrCreateSession`: reads `pendingCreations`,
  awaits, writes it: a Map field, the alias rule makes every later event write it; enters.
- `.../live-durable-stream-producer.ts:284`, `heartbeat`: the in-flight flag. The pair's `Beat.heartbeat` moves the
  flag's write past the await, which one call already shows (the trace orders every field write against the
  requests); `Beat.refresh`, a re-check after the await that the candidate drops, is the race one call never shows.
- `.../session.repository.ts:576`, `getOrCreateOpenChatInner`: find-or-create across database awaits; the race is
  the database's (two webhooks, a unique index): outside, a world property.

## Replaying a NodeCB or NodeRacer case

A case is a buggy and a fixed version of one module plus a driver. The two versions become parent and candidate, the
handler under race the unit; the driver's two concurrent requests are `call` and `call2`. The WITNESS's distinguishing
order is the replay file (event names and task ids for `fc.schedulerFor`); a no-race control is a pair whose sets are
equal with its order count. The benchmark material is not a dependency of this row.

### 2026-10-28: a race witness names its statements

A race witness carries `where.lines` like every other witness: the statement on each side where the two sides first
differ under the distinguishing order. The explorer keeps, beside the distinguishing observation, the other side's
observation under that same order (its arm order when the order is not feasible there). The first request that
differs gives a statement on each side, read from the request's recorded site; a side with no request at that place
names its last request. When the requests agree, the first call whose outcome differs gives the statement each call
completed at (a `return`), read in the event that settled the call. The kind says which: `race effect`,
`race effect; <side> record absent`, `race completion`, `race completion fallback`. The lines are not part of
equality, so no verdict changes. Pair `race_lines`: a dropped check (completion lines), a dropped check guarding a
request (effect lines), a pure refactor of the same unit (PASS-bounded) and an untouched unit.
