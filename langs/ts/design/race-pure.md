# A pure refactor is not a race: the explorer compares the same orders on both sides

Source: lane pyka's finding 5 (bindByBarcode against a behaviour-equal refactor, and against itself plus one pure
local, both lane B `ASK` "races: program 0: the candidate reached an observation the parent did not, but its order
set was cut by the bound (17 prefixes over b = 2, more than 48 orders)"); `design/schedules.md`.

## The construct

An async unit with many world requests in loops (a query, a Map of aliases built from a second query, awaits in a
loop over a query result, a report written at the end), on a module whose state makes every pair of events
dependent. Each side's conflict-bounded order set is cut by b = 2 or by the 48-order cap, so the race verdict rests
on how the two sides' sets are compared.

## Diagnosis (measured on a copy of the two repro files, `exec/run.mjs --n 60 --no-project`)

- The pure local is not the cause: the parent against a byte-identical copy of itself gives the same ASK. Both
  sides ran the same 48 conflict-bounded orders (measured against the pure-local candidate); the sets differed only
  by drawn orders (parent 11 observations, candidate 12, three candidate-only ones from orders the parent never ran).
- Cause 1, the drawn orders: `fc.sample(fc.scheduler())` was drawn once and cloned per side. The vendored
  `SchedulerImplem` clone hands every clone its source's one task selector, whose random stream advances as the
  clone runs, so the candidate's three drawn orders continued the parent's stream: different orders per side.
- Cause 2, the recorder: with `check.mjs` the pair's control still asked, under one order both sides ran. The
  library recorder (`exec/transitions.mjs`) snapshots each recorded built-in call's arguments; a fake argument
  (`keyOfProduct.set(id, key)` with `key` a fake's answer) was enumerated with `Object.keys`, which the fake records
  as a `keys` request. The recorder keeps 256 records per operation per run, shared by both sides, so the parent
  (run first) was snapshotted and the candidate, past the cap, was not: `keys` entries in one trace only. A pure
  local step (a Map write on a local) reached the observation through the harness.

## The reading

- An observation is the calls' outcomes, the request trace, the receiver and the pending work: a request or an
  effect. A pure local step adds no event (events are the first call's start, the second call's arrival and each
  release) and no observation. The recorder reads a fake as an opaque `{ kind: 'fake', id }`, never its keys, so
  a read the harness makes is no request of the unit's.
- Both sides take the same drawn orders: one fresh `fc.sample` per side from the seed, no clone.
- The sets are compared order by order before they count as different: an observation one side reached under an
  order the other side did not run is run under that same order on the other side (`stats.paired`), and the same
  observation there is a match. Only an execution enters a set, so a set grows only by what that side reaches.
- A difference that stays is a WITNESS when the other side's set is complete (unchanged), else ASK naming one
  interleaving per side: the order under which one side reached its observation, and the other side's run under
  that same order, or its arm order when that order is not feasible on it.

## Soundness

- No reading here can turn a difference into a PASS that one execution shows: a match is the same observation
  under the same order, executed. The replayed order may lie past b; it is still a real execution of that side.
- A WITNESS still needs the lacking side complete within the bound; adding real observations to it only removes
  observations it was said not to reach, never adds a false WITNESS.
- The fake as `{ kind: 'fake' }` in a record moves a fake receiver out of the table's model (`outOfModel`), as an
  array-like already is; the row check never ran a fake's keys as data.
- PASS-bounded stays bounded: two live calls, b = 2, the programs and the cut counts are in `bound.races`.

## What lane B sees, what stays out

Lane B sees both sides' explored orders, the drawn ones and the paired ones. Stays out: a reorder whose events are
named differently on the two sides (`call1/1/1` against `call1/2`) has no common order to pair, so an observation
reached only under such an order on a cut side stays ASK. Lane A is unchanged: every unit of the pair is refused
(`alias-mutation`, a push on the result of `Map.get`), so the pair is lane B alone.

## Measured

- Pair `race_pure` (n 30), base `dcbc61c`: bindPure, bindMoved, bindAwaitOrder, bindUntouched all ASK "the
  candidate reached an observation the parent did not". After: bindPure, bindMoved, bindUntouched PASS-bounded,
  28 orders per side over 2 programs, 3 cut per side, 12 drawn; bindAwaitOrder ASK, 17 parent and 26 candidate
  orders, naming the candidate's arm order and the parent's arm order.
- The pyka repro (bindByBarcode, parent plus `const aliasCount = aliases.size`, `check.mjs --no-project --n 60`):
  PASS-bounded, 96 orders per side over 2 programs, 34 cut per side, 12 drawn. The parent against its own copy:
  PASS-bounded, the same counts. With `exec/run.mjs` on the repro, the drawn-order change alone and the pairing
  alone each gave PASS-bounded.
- A comment-only refactor on a receiver (corpus nexus_7184, DeleteAgentUseCase.execute, from lane proved-inspect,
  lane A already proved): base ASK "races: program 1: the parent reached an observation the candidate did not"
  (cause 1, one parent-only drawn order); now PASS-bounded, 22 orders per side, 1 cut, 12 drawn, on its own tree
  with its tsconfig and self-contained in the pair.
- `two_callers` keeps its verdicts: Beat.refresh WITNESS (parent, call2 before call1/1 on this.epoch, replayed),
  Beat.total PASS-bounded in 20 orders.

## Instances

- pyka `src/graph/bind-barcode.ts` bindByBarcode (lane pyka commit 8d37f27): enters, PASS-bounded.
- `tests/pairs/race_pure`: bindPure, bindMoved, bindUntouched, DeleteAgentUseCase.execute enter; bindAwaitOrder ASK.
