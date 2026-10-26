# Promise forms

A native promise runs its executor synchronously and settles once. Resolution adopts
thenables. Reactions run after settlement: then on fulfilment, catch on rejection,
finally on either path. A finally return is ignored, but a throw/rejection replaces
the previous outcome. Returning a promise from an async unit adopts its outcome.

The reading accepts awaited or returned chains on statically typed Promise values.
Arrow bodies are continuations with statement-order world transitions. Named
same-file handlers call their emitted unit; imported handlers are transitions.
The source call uses the same awaited operation as an explicit await refactor.
Catch binds ext_fault_value and clears the fault. Finally runs its body with the
old fault saved and cleared; a new fault wins, otherwise the old fault is restored.
Several links compose these operations. No promise scheduler order is invented.

Example (names shortened):
```dafny
var (wld, r) := ext_await_Service_get(wld, svc, id);
if ext_faulted(wld) then (wld, ext_throw_int(ext_fault_value(wld)))
else (wld, r.value + 1)
```

Await of a held promise keeps the existing await_value transition. Creating a
promise and awaiting it later is not collapsed into a single request: intervening
calls stay between creation and await. Newly supported chains/executors must be
consumed directly. A dangling chain is refused as promise-pending: pending work is
part of SEMANTICS.md and running it synchronously would lose an observation.

Direct executors have a synchronous arrow and terminal resolve/reject on every
path. resolve(v) supplies the result; reject(e) and throw raise the world fault.
Statements after settlement are refused because resolve is not a JavaScript return.
A single outside callback bridge is an opaque transition keyed by executor text,
all captured values, receiver, and same-file dependencies. The environment controls
callback count, time and non-settlement, so this is deliberately not an inline call
of the callback. A changed resolved expression changes the transition identity.
Stored/passed resolvers are promise-executor-escape; an uncovered path or statements
after settlement are promise-unsettled. Async executors are promise-executor.

Promise.resolve of a plain value is identity. Promise inputs are adopted through
the existing await reading. Unknown/custom thenables are refused as promise-thenable.
Promise.reject raises the fault. race, allSettled and any are refused as
promise-combinator: race/any require completion order; allSettled needs a separate
per-element outcome channel. Promise.all's existing reading is unchanged.

Handlers use monomorphic, single-signature plain parameters, declarations,
conditionals, calls, return and throw.
Other control forms are promise-handler. Consumed forms must occupy a return,
initializer or expression statement; nested consumption stays promise-pending. Outer mutation keeps closure-mutation.
Named handlers with mutation or an unmodelled throw are refused as promise-handler.
Faults follow the existing world's fault flag, including statement-level checks;
this does not add axioms for clear_fault or raise. Faulted continuations never run.
Straight-line async awaits also short-circuit before following statements.
Existing loop readings are unchanged; new promise forms inside loops are refused
as promise-pending because those helpers have no async fault exit channel.

Lane B runs native promises and callbacks. Typed fakes preserve Promise return
shapes and reject on the seeded fault draw, so then and catch actually execute.
An outside callback fake invokes once with fake arguments. Its callback source is
also recorded; a changed callback is a witness in the outside request observation.

Instances inspected (paths relative to their named census/export root):
- n8n, packages/editor-ui/src/models/history.ts:256 RenameNodeCommand.revert:
  enters terminal executor reading; historyBus.emit precedes resolve().
- nutshell, core/conversations/src/keepers/burst-drain.ts:18 schedule:
  stored pending chain refused; this also exposed a receiver-RHS lint bypass.
- nutshell, core/conversations/src/streams.ts:54 SerialLane.run: non-async,
  stored/two-handler chains stay refused (promise, promise-pending).
- nutshell, adapters/cli-link/src/change-cli-link-on-disk.ts:23 clearQuarantine:
  callback bridge shape, but its non-async unit stays refused (promise).
- driftbench, packages/adapters/src/crewai/index.ts:240 crewaiHttp: sleep passes
  its resolver to setTimeout, outside the executor reading (resolver escape).
Unresolved/custom promise-like receivers retain the existing opaque call reading.
Bench scorecards and exact validation output are under results-bench/.
