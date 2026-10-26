# Promise forms

A native promise runs its executor synchronously and settles once. Resolution adopts
thenables. Reactions run after settlement: then on fulfilment, catch on rejection,
finally on either path. A finally return is ignored, but a throw/rejection replaces
the previous outcome. Returning a promise from an async unit adopts its outcome.

Eligible awaited or returned native chains have an exact continuation reading.
Arrow bodies preserve statement-order world transitions. Named same-file handlers
call their emitted unit; imported handlers are transitions. The source call uses
the same awaited operation as an explicit await refactor. Catch binds fault_value
and clears the fault. Finally saves and clears the old fault, runs the handler,
and restores the old outcome unless the handler faults. Several links compose.

Example (names shortened):
```dafny
var (wld, r) := ext_await_Service_get(wld, svc, id);
if ext_faulted(wld) then (wld, ext_throw_int(ext_fault_value(wld)))
else (wld, r.value + 1)
```

Exact admission is optional. The lint records selected expression spans for the
translator. A failed exact attempt restores lint state and runs the old gate.
Opaque roots suppress exact reading of their descendants, avoiding accidental
inline execution of a pending continuation. Existing calls are never refused only
because the exact reading cannot handle them.

Dangling/stored chains, loops, unsupported handlers and nested consumption keep
an outside transition on the receiver and supplied arguments. Handlers are opaque
values keyed by text; captured values, receiver and same-file dependencies remain
arguments/dependencies of the transition. Actual argument and result types avoid
optional-handler coercion and differing-result declaration collisions. The model
can retain pending work in the world without inventing a callback schedule.
Straight-line awaits short-circuit on faults; existing loop helpers are unchanged.

Await of a held promise keeps the existing await_value transition. Intervening
calls stay between creation and await. Promise.resolve/reject get their exact
value/adoption or raise reading only when eligible, otherwise they remain outside
calls. Unknown/custom thenables also keep that fallback. Promise.race, allSettled
and any remain outside calls of the sequence: no winner or completion order is
asserted. Promise.all's existing map and literal readings are unchanged.

New constructors have no older reading to fall back to. Direct executors use a
synchronous arrow and terminal resolve/reject on every path. resolve(v) supplies
the result; reject(e) and throw raise the world fault. Statements after settlement
are refused because resolve is not a JavaScript return. A single outside callback
bridge is opaque by text, captures, receiver and same-file dependencies: the outside
controls callback count, time and non-settlement.
Stored/passed resolvers are promise-executor-escape; uncovered paths or statements
after settlement are promise-unsettled. Unsupported executors are promise-executor;
unconsumed/loop constructors are promise-pending. Unsupported executor bodies or
thenable values keep promise-handler/promise-thenable. These had no earlier reading.
Exact handlers have monomorphic plain parameters and declarations, conditionals,
calls, return and throw. Wider handlers retain the old gate and opaque reading.

The world fault channel remains an overapproximation with no new clear/raise axioms.
Lane B uses native Promise shapes and seeded rejection draws, so handlers execute.
The outside callback fake invokes once; its source is also recorded as an argument.
The original pair checks exact chains and executors; promise_fallback checks pending,
stored, loop, combinator, receiver and mixed opaque/exact chains.

Instances inspected (paths relative to their named census/export root):
- n8n, packages/editor-ui/src/models/history.ts:256 RenameNodeCommand.revert:
  terminal executor; historyBus.emit precedes resolve().
- nutshell, core/conversations/src/keepers/burst-drain.ts:18 schedule:
  a stored chain retains the opaque outside reading.
- nutshell, core/conversations/src/streams.ts:54 SerialLane.run:
  non-async Promise-returning unit retains the pre-existing promise refusal.
- nutshell, adapters/cli-link/src/change-cli-link-on-disk.ts:23 clearQuarantine:
  callback bridge shape, but non-async unit retains promise refusal.
- driftbench, packages/adapters/src/crewai/index.ts:240 crewaiHttp: sleep passes
  its resolver to setTimeout, outside the executor reading (resolver escape).
Unresolved/custom promise-like receivers retain their existing call reading.
Bench scorecards and exact validation output are under results-bench/.
