# Lane B: a visitor that recurses through the world meets a finite tree (2026-10-30)

## The defect

A fake runs each callback it is handed once, with fake arguments (exec/fake.mjs, the `apply` trap), so a callback's own
reads reach the trace. A visitor that hands the walker itself again (`walker.forEachChild(node, visit)`, the
`ts.forEachChild` shape) recursed through the fake with no end: the fake node always has children. Past 40 nested
callbacks the fake threw a budget, and lane B answered ASK on every input of every unit that reached such a visitor,
on both sides. Battery v7 lost three planted mutants this way (a unit that asks a visitor whether a body writes JSON
itself: ASK, "callback recursion deeper than 40 through the environment").

## The rule

The world's tree is finite. Past `CB_DEPTH` (40) nested callbacks the fake runs no further callback it is handed: the
call is recorded as before, its answer is the same, and the callback is not run, as the fake's iterator yields nothing
past depth 8. The visitor returns at the leaves. Both sides meet the same tree, so the rule changes which world lane B
runs in, never how a verdict is read: a difference before the leaves is a WITNESS as before, and an equal unit stays
equal in a finite world. The budget for a callback that overflows the stack (a RangeError inside it) is unchanged.

## The pair

`tests/pairs/cause_fake_recursion`: `reaches` negates the test on the visitor's answer (WITNESS; ASK before the rule),
`reachesRenamed` renames a local (PASS-bounded; ASK before), `countSeed` is untouched (PASS-bounded).
