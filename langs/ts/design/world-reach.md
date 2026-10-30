# Lane B: the full-world input (2026-10-30)

## The defect

A method of a class reaches the world through its injected services: `this.prisma.table.findUnique(...)`, then fields
of the answer. Lane B's fake answers each untyped read with a handle a little more than one time in two (exec/fake.mjs
`answer`) and a dead value otherwise (null, undefined, 0, '', false, true, an empty list), so a chain of k reads reaches
its end on about 0.55^k of the inputs: battery v7 saw a guard five reads deep reached on 4 of 60 inputs. Two more gaps
sat on the same path. A field of the world is never a key the caller passed, so an ownership guard
(`row.orgId !== args.orgId`, throw) threw on every input and the changed test behind it never ran. And a handle read as
a list holds two elements (or none past depth 8), so a unit that tells one element from several (`length === 0` against
`length === 1`) met no list of one. Battery v7 lost four planted mutants this way (two negated guards behind such
chains, a bound on a list the world answers, and a guard behind an ownership check).

## The rule

Every WORLD-th (8) generated input from the fourth on, outside the known phase, is a full-world input
(gen.mjs `worldTurn`, fake.mjs `enterWorld`, called where run.mjs draws an input: `inputPlan().draw` and the sequence
mount). On it:

- every untyped read of the world answers a handle, never a dead value, so a chain of reads reaches its end;
- a field whose name is the name of a primitive the caller passed (a parameter, or a field of a record parameter)
  holds that value, as the record the world keeps for the caller's key carries the key;
- a handle read as a list (its `length`, its iterator, the iteration methods) holds 1, 2 or 3 elements by turn.

The parameters are drawn as on every other input; typed answers draw from their declared types as before; calls still
fault on their seeded draw. Both sides of an input get the same world, so the rule only adds worlds lane B runs in:
an equal unit stays equal in each, a difference on one is a WITNESS as on any input, and the verdict is read as before.
The other inputs are untouched. `LEAN_WORLD=off` switches the tier off (the pair's red run, by hand).

## The pair

`tests/pairs/cause_world_reach` (lane B only; the units read untyped services): `Records.rename` negates a lock test
behind an ownership guard (WITNESS; PASS-bounded before), `Records.ownedDeep` negates a guard five reads deep (WITNESS;
PASS-bounded before), `Records.firstAccount` moves a list bound from 0 to 1 (WITNESS; PASS-bounded before), and their two
refactors stay PASS-bounded. Each witness is on a full-world input; with `LEAN_WORLD=off` all three are PASS-bounded.
