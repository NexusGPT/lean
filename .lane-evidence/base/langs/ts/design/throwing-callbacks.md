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

### 2026-10-28: the fault exit of a throwing callback, promise handlers, and `call`

The construct, as the census shows it: `await affinityApiRequest.call(this, method, resource, body, query)` (n8n
nodes-base, 278 of the rule's 284 findings), `xs.forEach((x) => { s = s + check(x); })`, `svc.get(id).then((x) =>
check(x) + 1)`, with `check` a same-file unit that throws.

The reading. An array method runs its callback per element in order and a throw ends the method at once (ECMA-262
23.1.3.15 step 6.c.ii: the abrupt completion of Call returns), so a callback holding a throw, a call of a throwing
unit, or a throwing unit named as the callback is a loop whose helper exits at the first fault with the state it has:
the world and every cell the callback wrote. The fault then takes the statement's route: after a forEach statement's
loop (faultTr sets the route, coreLoop tests the world after the helper), or at a checkpoint after a hoisted loop value
(`return xs.map(cb)`, `const ys = xs.map(cb)`: callbackValue). The callback's body is read by faultTr, a return being
the step's value (faultStep). Before, the rank above took a throw in such a callback as one opaque block, and a call
of a throwing unit there was not checked at all: the helper ran on and the next call of a throwing unit cleared the
fault (its body starts with clear_fault), so a model could forget a throw.
A then, catch or finally handler that calls a throwing unit: an abrupt handler completion rejects the promise the link
returns (27.2.2.1 NewPromiseReactionJob), so the handler is read by faultTr with the rejection as its fault path
(faultHandlerBody); the lint admits the throwing callee there (promiseBody, unsafePromiseCallee) and keeps refusing a
mutating one. `h.call(o, a)` and `h.apply(o, [a])` call h here (20.2.3.1, 20.2.3.3): the identifier is a callee, not
a stored value, and the caller joins the throwing units (exceptionUnitsOf); the translator already read the call.

    var (wld, t0_) := check_parent(wld, x);
    if ext_faulted_World(wld) then
      (wld, s)
    else
      (var s: int := s + t0_; total_loop0_parent(seq0, idx0 + 1, wld, s))

Soundness. A changed throw (a swallowed one, a different element) changes the helper's text or its exit, so it is not
proved; a refactor proves only when both sides make the same calls in the same order up to the exit. A throwing
callback in any other place of a statement (inside a conditional, beside another throwing call) keeps the opaque
block; a loop whose callback throws and that no route reaches is not translated (`fail`), never read without its
exit. An async callback keeps its reading (its throw rejects its own promise, the method goes on).
Stays refused: a throwing unit stored as a value, here handed to an outside function inside an object
(`bus.on({ message: parse })`, escape `exception_callback_outside.ts`, rule exception-callback); a callback handed to a
same-file unit (rule function-value: the splice of a value-returning callee with a function parameter is not read).
Lane B runs the JavaScript: its fakes answer `svc.get`, its inputs draw negative elements, the throws are real.

Measurement. Pair `exception_callback`: check, times untouched; scaled and later swallow the throw (WITNESS); total,
ordered, guarded and viaCall refactor (PASS-proved). Census (`node langs/ts/census.mjs`, base 6661006): n8n 4,314 to
4,403 inside of 6,337, exception-callback 237 units to 0 (the `call` reading; 6 findings stay, in units another rule
stops first); nexus 23,753 to 23,753 of 26,520, exception-callback 1 to 1 (a throwing unit stored in an object).
