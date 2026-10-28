# A named promise handler is decided once

The construct: a promise link whose handler is a name, `p.then(h)`, `p.catch(h)`, `p.finally(h)`, where `h` is a unit of
this file, an import, a module constant holding a function value (`const scale = makeScale(2)`), a global or a member
path (`console.error`, `Math.abs`). Two deciders answered it differently: the lint's exact promise reading refused a
module constant, a global or a member, then fell back to the outside-call reading of `.then`, where the name is a plain
value and was admitted; the translator read that value as a bodiless constant and refused it (`scale is a function
value; call it`, `console.error is a function; call it`), which failed the whole file.

## JavaScript meaning

`p.then(h)` calls `h` with the settled value as one job once `p` fulfils (ECMA-262 27.2.5.4 PerformPromiseThen, 27.2.2.1
NewPromiseReactionJob: `Call(handler, undefined, « argument »)`). The call runs the function object `h` holds, with
`this` undefined, so a member path `obj.m` loses its receiver; a module constant's function object is the one its
initializer built when the module was evaluated (16.2.1.6.4), so its behaviour is the initializer and the code it reaches.

## The reading

One predicate, `namedPromiseHandler` (`langs/ts/common.mjs`, the last export), consulted by the lint's `promiseHandler`
and `readPromise` and by the translator's `promiseHandlerBody` and `externalValue`. It admits a name with one plain call
signature (no type parameters, no rest, default or optional parameter, at most one parameter, none for `finally`) and a
plain or native Promise result, whose origin is:
- a unit of this file: the unit's function called with the settled argument (unchanged);
- an import or another file's function: one transition `call_args_<name>` (unchanged);
- a module constant: one transition named by the code its initializer reaches, `call_args_<name>_<reach>`, the key a
  direct call `scale(x)` and a named array callback already take (design/reach-keys.md), so a changed maker or argument
  is another transition and the same declaration on both sides is one.

The predicate also says whether a name has a reading as a passed value at all: a binding outside the unit (a module
constant, an import, another file, a global, or a member of one) that holds a function has none. Such a link has one
reading, the exact one: the lint keeps the exact reading's findings (`promise-handler`, `promise-thenable`,
`promise-pending`) instead of falling back, and the translator names the same rule.

```dafny
// parent: const shift = makeShift(1)                    candidate: makeShift(2)
var (wld, t0_) := ext_call_args_shift_r7d8ep_World_int(wld, x);   // candidate: ext_call_args_shift_1vl17te_World_int
```

## What stays refused, and why

A name the reading cannot call with one settled argument: a member path (`.catch(console.error)`, `.then(Math.abs)`: the
call has no receiver; write `(e) => console.error(e)`), a function with an optional, default or rest parameter or a type
parameter (`format` with `digits?`), an overloaded one, one with two parameters, a thenable result. Each is refused by
name (`promise-handler`, `promise-thenable`, or `promise-pending` for a dangling link) in the lint and in the translator;
escape `fixtures/escapes/ts/promise_handler.ts` (units `absolute`, `formatted`). A local or a parameter keeps its
outside-call reading (the translator passes it as a value), unchanged.

## Soundness

A shared transition is sound only when the function the name holds is the same function of its arguments on both sides
(design/proof-hunt.md). For a module constant the key is the reach of its declaration: the initializer text, every
function it calls and every class a value it touches may be (reach.mjs), so a changed `makeShift(1)` to `makeShift(2)`,
a changed `makeShift` body, or a changed class reached gives another key (changedBinding: not proved, lane B WITNESS).
The world is threaded through the transition as for a direct call, so effects of the handler stay ordered. An import
keeps its name, as every other reading of an import does. Nothing newly admitted is read as a body; the reading proves
equal only what both sides run as the same transition with the same argument.

## Lint and lane B

Lint: the `promiseHandler` decision moved into the predicate (a module constant is now admitted; the refusal message for
a member names the arrow to write); `readPromise` keeps a valueless named handler on its exact reading. Lane B runs the
real JavaScript: unitHandler, bindingHandler, bindingRefactor PASS-bounded; changedUnit, changedBinding WITNESS.

## Measurement

Pair `tests/pairs/named_then` (9 units) and `agree.mjs` in it: on 41ba9b1 five units disagree (lint admitted, translator
failed: bindingHandler, bindingRefactor and changedBinding of the parent, absolute and formatted of the escape); now every unit of
parent, candidate and the escape agrees. Census lines: the lane report.

Instances (census sources): `examples/src/createAgent/supervisor.ts:385`, `libs/langchain-mcp-adapters/examples/
langgraph_example.ts:192`, `firecrawl_multiple_servers_example.ts:124`, `calculator_server_shttp_sse.ts:199`,
`environment_tests/test-exports-vercel/src/pages/api/hello-edge.ts:60` (`.catch(console.error)`: lint-admitted and
translator-refused before, now refused by name in both); `libs/create-langchain-integration/index.ts:153`
(`.then(notifyUpdate)`, a unit: unchanged); `apps/frontend/src/modules/Billing/pricing.tsx:358`
(`.then(refreshInOneSecond)`, a local: unchanged). No module constant handler appears in the two census roots.
