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
| `exec/replay-args.mjs:47–53` witness replay | pickUnit → observe → the same boundary |
| `exec/program.mjs:36` environment command Call | pickUnit free-function boundary |
| `exec/program.mjs:212` both free race starts | pickUnit free-function boundary |
| `exec/run.mjs:703` sequence mount, click/effect re-render and timer schedules | pickUnit boundary on each render |
| `exec/finite.mjs:85` finite component render | pickUnit boundary (props assignment, not a parameter-type draw) |
| `exec/new-unit.mjs` candidate-only inputsFor → observe | pickUnit boundary |
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

`specOf` will retain the declaration's dotDotDotToken as a boolean `rest` on the
parameter spec. `argsFor(signature, drawn)` in `exec/spec.mjs` will be the only
conversion. The pickUnit boundaries and the direct retained-program/race boundaries
will consult it. Callers of pickUnit keep passing the draw so replay, graph roots,
states and witness arguments preserve their existing format, and no caller can
accidentally expand twice. Guards/pipes keep their parameter-slot reading; the final
method application expands their resulting tuple.

This restores one interpretation shared by the input plan and the caller (research
brief 20, section 2: two deciders disagreeing). It does not infer restness from an
array type, runtime function.length, or the unit's name.
