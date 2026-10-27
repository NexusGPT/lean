# A bounded pass where no drawn input got past a guard

## The construct
A unit that checks its input against a domain its types do not state, and throws outside it:

    const PRICES: Record<string, number> = { basic: 10, pro: 25, team: 60 };
    export function quote(plan: string, seats: number): number {
      const unit = PRICES[plan];
      if (unit === undefined) throw new Error("unknown plan");
      return unit * seats;
    }

The plan is a `string`; the strings the unit accepts live in a table (here a module constant, in real code often a
database row, a configuration, a lookup on a column). Lane B draws strings from the type, and none is a key of the
table, so every drawn input throws at the guard on both sides. Two versions that differ only past the guard look the
same on every input, and before this reading lane B said PASS-bounded: true of the drawn inputs, silent about every
real one.

## The reading
Lane B records, per input, whether the call reached the body (`exec/run.mjs`, `atGuard`). An input stopped at a guard
is one where both sides:

1. threw (the outcome is `threw`, no promise named beside it);
2. did nothing the observation sees before the throw: the trace of environment requests is empty, no work is pending,
   no field of the receiver was read or written, and the arguments render as they were drawn (no write);
3. threw at a guard's throw: the statement marker the run completed at (`patch.mjs statementMarks`, the same site a
   witness names) is a `throw` statement that sits, inside its own function, in a branch of an `if`, a `case` or
   `default` of a `switch`, or a `catch`. The function has a way past it, so the throw depends on the input.

Every other input reached the body. The bound carries the counts, `bound.reached: { body: k, guard: m }`, over the
inputs both sides ran (a skipped timeout is in neither). When `k` is 0 and `m` is above 0, on a run that would have been
PASS-bounded, the verdict is ASK with the reason

    no input reached the body: every one of the m inputs threw at a guard (first: Error: unknown plan)

and `check.mjs` carries that reason into the verdict whenever lane A does not prove the unit. A small `k` keeps
PASS-bounded and the certificate shows the count. Nothing else in the observation or the comparison changes.

## Soundness
The reading only lowers a PASS-bounded to ASK; it never raises a verdict and never withholds a WITNESS: a difference on
an input stopped at a guard is a difference (the witness return comes first), and a PASS-proved from lane A stands,
since a proof covers every input including the ones the domain admits. The criterion is general: it reads the
observation lane B already makes and the source's statement shape, never a message text, a name or a database.
The cases weighed:
- an unconditional throw (`throw "finish"` in a `finally`, a getter that always throws): the throw is the body, every
  input samples it, and both sides throwing alike is a real equality. It is not a guard (rule 3), so it stays
  PASS-bounded (`exceptions_across` overrideFault, `object_accessor_faults` Fault.*).
- a fault of the language (`x.a.b` on undefined): not a `throw` statement, counted as the body. The run did compare
  what the body computed up to the fault.
- a guard that asks the world (`await db.find(id)`, a read of `this.repo`): the trace is not empty, counted as the
  body. Lane B's fakes answer the world, so the guard's question was sampled, not the domain behind it.
- a guard in a same-file callee (`known(plan)` throwing inside its `if`): the site is the callee's throw statement,
  which is a guard; read the same way, async included (probe in the lane report).

## What stays out
- A throw in a loop body with no `if` around it is counted as the body (a miss on the safe side: PASS-bounded, the
  count shown); so is a guard that reads the receiver or the environment (above). Nothing is refused: no lint rule, no
  escape fixture; lane A is untouched.

## What lane B sees
The pair `tests/pairs/unreached_body`: quote (above, the candidate discounts above five seats) answers ASK with the
reason and `reached: { body: 0, guard: 30 }` (n 30); quoteTyped, the same unit with `plan: "basic" | "pro" | "team"`,
draws the table's keys and answers WITNESS (`["pro", 6]`: 150 against 144); perSeat, untouched, whose guard
`seats <= 0` passes some inputs, is PASS-bounded with `reached: { body: 14, guard: 16 }` and PASS-proved by lane A.

## Instances (census repos, read in place, lane B with parent = candidate, n 30, --no-project)

- nutshell/adapters/sqlite-store/src/rows.ts:31 `text(row, column)`: `row[column]` then `typeof value !== 'string'`
  throws. Enters: ASK, `reached { body: 0, guard: 30 }`; the column names live in the database schema.
- langchainjs/libs/providers/langchain-ibm/src/chat_models/ibm.ts:217 `getRole(role)`: a map lookup then
  `if (!watsonRole) throw`. Enters: ASK, 0 of 30 (without the project the role's union type is an unresolved import,
  so the domain is invisible; with the project it is a union of literals, the typed twin).
- nutshell/kits/ui/src/theme/derive-theme.ts:135 `resolveAlias`: `values[token] === undefined` throws on some inputs.
  PASS-bounded, `reached { body: 16, guard: 13 }`.
- nutshell/modules/chat/src/drawing/assemble-turn-drawings-rows.ts:49 `arrangeFresh`: `self.turns[index]` guard.
  PASS-bounded, `reached { body: 30, guard: 0 }`.
- langchainjs/libs/langchain-core/src/runnables/router.ts:60 `RouterRunnable.invoke`: `this.runnables[key]` guard
  reads the receiver, so it stays out of the reading: PASS-bounded, `reached { body: 30, guard: 0 }`.
