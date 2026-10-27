# Stage 5 rank 19: outer cells written inside array-method callbacks

The construct: `let seen = 0; const doubled = xs.map((x) => { seen = seen + 1; out.push(x); return x * 2; })`,
`xs.filter((x) => { acc.n = acc.n + 1; return ... })`, `xs.find((x) => { steps = steps + 1; return x > floor; })`.
Before this rank the lint refused every write to a local, an array or a record declared outside the callback as
`closure-mutation` ("a callback cannot change an outer variable", 662 findings on nexus for records alone), except
inside a `forEach` statement, which was already read as a loop.

## The reading

`map`, `filter`, `reduce`, `some`, `every`, `find`, `findIndex` and `flatMap` on an array run their callback once per
element, in index order, before the method returns (ECMA-262 23.1.3): the callback is a loop body, and a cell declared
in the enclosing function that it writes is the loop's state, exactly as in a `for (const x of xs)` body. The forbidden
class is the callback handed away, to an outside call, a timer or an event, which runs when the outside decides; that
stays refused (escape `fixtures/escapes/ts/array_callback_cells_handed.ts`). The older escapes `non_null.ts` and
`nondeterminism.ts` (a counter written from a `filter` and a `map` callback) described the construct this rank admits and
are retired.

The lint reads such a callback as the effectful form (`callbackNeedsLoop` through `writesOuterCell`) and marks it a
loop callback, so `ownedHere` looks past it to the enclosing function. The translator adds the cell-writing callback
(`cellCallback`: `assignedOutside` of the arrow is non-empty) to the loop reading at its three sites: a declaration
initialised by the call, the call as a statement, the call inside an expression. The loop helper carries the cells as
state, in declaration order (`assignedOutside` sorts its state by declaration position), so the map and the for-of that
pushes into the same arrays are the same helper text and prove by identity (pair unit `collect`).

One Dafny unit of `tally(xs)` whose `filter` callback writes a record (pair unit `tally`):

```
var acc: Rec := Rec(n := 0, last := "");
var (t1_, acc) := (var cb0_: seq<string> := []; var (cb0_, acc) := tally_loop0(xs, 0, cb0_, acc); (cb0_, acc));
acc
```

Met on the way, a real defect: `callbackValue` (the expression and statement forms of a callback loop) let only the
collected value leave its let, so every cell written in the loop kept its old value after it; it now rebinds the cells,
and the world first in an effectful unit. The differential step holds it (`langs/ts/tests/cases/callback_cells.ts`,
four functions run in Node and in Dafny on the same inputs), since no pair sees a translator defect both sides share.

## Measurement

Pair `array_callback_cells`: `collect` (the map rewritten as a for-of pushing into both arrays, proved by identity),
`tally` (WITNESS), `firstBig` (WITNESS), `anyNegative` (untouched). Census (`node langs/ts/census.mjs`, the rank 18 state as the base): nexus 23,774 to 23,786 of 26,520; langchainjs 3,564 to
3,567 of 4,871. The stage 5 table predicted 56 and 12 alone; the record writes it counted (`closure-mutation`, 662 findings on
nexus) sit mostly in callbacks handed away, which stay refused.
