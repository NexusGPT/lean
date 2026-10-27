# Stage 5 rank 20: throws inside callbacks, throwing units as values

The construct: `xs.map((x) => { if (x < 0) throw new Error("negative"); return x * 2; })`, `xs.map(check)` with `check`
a same-file unit that throws, `sink.use(check)`, `sink.use((n) => { if (n < 0) throw ...; return n; })`. Before this
rank the lint refused a throw inside any callback (`exception-callback` "move the throw to a same-file unit",
`callback-control`) and a throwing unit used as a value anywhere ("a function value has no fault channel").

## The reading

Two cases, by who runs the function value.

Into an array method (`forEach`, `map`, `filter`, `find`, `findIndex`, `some`, `every`, `flatMap`, `reduce` on an
array): the method runs the callback once per element before returning, so a throw inside it is the enclosing unit's
throw. The unit joins the throwing units (`exceptionUnitsOf` descends into such callbacks, `syncLoopCallback` in
`common.mjs`), threads the world and raises on its fault channel, and the statement holding the call is one opaque
block (`faultTr`'s scan descends into the callback and sees the throw), exactly as a loop statement holding a throw is
read today (SEMANTICS "Opaque blocks"). A call of a throwing unit inside such a callback is not a throw of the
callback's own: it threads the loop helper's fault check after the call, the reading effectful callbacks already have,
so `xs.map(check)` (the named-callback loop) and `xs.map((x) => check(x))` are the same helper up to the element's
name and prove by identity (pair unit `checked`). The fault channel through the loop helper itself, stopping at the first fault inside the
core loop, is the stronger reading the stage 5 note names; this rank takes the opaque block, the reading loops already
have, and leaves that channel to a later rank.

Into an outside call: the function value is the opaque value it already is (SEMANTICS "Function values", a constant
named by its text), and its throw happens inside the outside's transition. A throwing or effectful unit named as the
argument is that value named by the unit's own text (`opaqueFn` of its declaration), so the same unit on both sides is
the same value and a changed body another; an arrow with a throw, a try or a call of a throwing unit inside takes the
same path (`lambda`'s `mayThrowInside`).

What stays refused, each with an escape fixture (`fixtures/escapes/ts/throwing_callbacks_*.ts`): a throwing unit
stored as a value (`exception-callback`: no call runs it here), a `try` inside an array callback (`callback-control`:
the loop reading has no catch), a throw inside a callback that is neither a loop body nor handed to an outside call. The
older escape `named_callback_throws.ts` (a throwing unit handed to `map`) described the construct this rank admits and is
retired.

## Measurement

Pair `throwing_callbacks`: `check` (untouched), `doubled` (a throw inside a map callback; the candidate throws on zero
too, WITNESS), `checked` (`xs.map(check)` rewritten as `xs.map((x) => check(x))`, proved), `viaOutside` (another
function value handed over, WITNESS), `viaArrow` (untouched). Census (`node langs/ts/census.mjs`, the rank 19 state as the base): nexus 23,786 to 23,823 of 26,520; langchainjs 3,567 to
3,584 of 4,871. The stage 5 table predicted 53 and 6 alone.
