# Drawn parameters and JavaScript arguments

The input plan draws one slot per declared parameter. A rest parameter's slot is an
array containing the remaining arguments, not an argument whose value is that array.
The invocation boundary must expand that slot exactly once. Ordinary array
parameters stay arrays. Optional/defaulted parameters keep their drawn value,
including undefined; JavaScript still evaluates defaults. Object identities inside
the rest array must survive the expansion, while the rest container itself belongs
to the callee.

## Call-path inventory

Paths below are relative to the checkout
`/Users/assem/nexus/nexus-organisation/work/lean-lanes/rest-param`.
Line numbers are the pre-change source at `fea80f8`.

| Draw-to-call path | Actual application boundary |
| --- | --- |
| `exec/run.mjs:885` inputPlan, mountSides, observe at `:596` | pickUnit: free function/explicit this `:529`, constructor `:536`, static method `:543`, instance method after route guards/pipes `:559` |
| `exec/replay-args.mjs:45–52` witness replay | pickUnit → observe → the same boundary |
| `exec/program.mjs:36` environment command Call | pickUnit free-function boundary |
| `exec/program.mjs:212` both free race starts | pickUnit free-function boundary |
| `exec/run.mjs:703` sequence mount, click/effect re-render and timer schedules | pickUnit boundary on each render |
| `exec/finite.mjs:85` finite component render | pickUnit boundary (props assignment, not a parameter-type draw) |
| `exec/new-unit.mjs:234–240` candidate-only inputsFor → observe | pickUnit boundary |
| `conformance/node-side.mjs:32–40` model oracle's Node side | pickUnit → observe → the same boundary |
| `exec/programs.mjs:45` retained-program construction | Reflect.construct directly |
| `exec/programs.mjs:58` retained-program method command | method.apply directly (observe receives its wrapper) |
| `exec/programs.mjs:98` class-race construction | Reflect.construct directly |
| `exec/programs.mjs:109` both class-race starts | method.apply directly |

All file paths in the table have the prefix `langs/ts/`.
`exec/handlers-interp.mjs` does not call a unit: it interprets a handler descriptor
against the slots left by the real invocation. Handlers, retained callbacks,
timer callbacks, deep child components, guards and pipes already receive actual
JavaScript argument lists, not drawn parameter tuples. Their calls need no conversion.
Accessors cannot declare rest parameters.

## Shared reading

`specOf` retains the declaration's dotDotDotToken as a boolean `rest` on the
parameter spec. `argsFor(signature, drawn)` in `exec/spec.mjs` is the only
conversion. The pickUnit boundaries and the direct retained-program/race boundaries
consult it. Callers of pickUnit keep passing the draw so replay, graph roots,
states and witness arguments preserve their existing format, and no caller can
accidentally expand twice. Guards/pipes keep their parameter-slot reading; the final
method application expands their resulting tuple.

This restores one interpretation shared by the input plan and the caller (research
brief 20, section 2: two deciders disagreeing). It does not infer restness from an
array type, runtime function.length, or the unit's name.


## Regression evidence

The new `tests/pairs/rest_param` pair compares a changed rest-length threshold:
with the faulty nested call both versions see a single item and lane B misses the
change; spreading the slot reveals a witness. Its unchanged `count` and `spread`
units cover a default parameter before the rest parameter and a real spread call.
The witness replay checks the original drawn tuple.

`node --test langs/ts/tests/pairs/rest_param/paths.test.mjs` additionally checks the
application boundaries directly, including retained class construction, retained
method commands and both class/free race starts. `paths.ts` supplies executable
fixtures: their rest values must be individual strings. Tuple rest, array-valued
rest elements, empty rest, an explicit this receiver and mutation of a shared rest
element distinguish spreading one level from flattening or cloning inputs.

Full commands, before/after measurements and artifact paths are in
`/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/lanes/rest-param.md`.
