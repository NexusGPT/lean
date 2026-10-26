# Exceptions across same-file calls

JavaScript completes a statement normally, returns a value, or throws a value.
A callee throw aborts evaluation at the call site and reaches the nearest catch.
Finally runs for normal completion, return and throw. Its own return or throw
replaces the saved completion; otherwise the saved completion resumes.

## Reading

The existing `(World, R)` signature carries the second result channel in World.
World contains an opaque history and an explicit optional fault value. This is
isomorphic to a result channel for the outcome, without changing every call ABI.
`ext_faulted`, `fault_value`, `clear_fault` and `raise` have concrete bodies.
An uncaught throw raises the world fault and returns an unobserved placeholder R.
The old `ext_throw_R(e)` reading is removed: a discarded result cannot discard a throw.
A syntactically pure same-file throwing function therefore needs the world.
The may-fault set is the same-file call component of throw, try and known failing
library calls, including callees whose outside transitions may fail. Each transition can fault.
JSON.parse/stringify, new URL/RegExp, BigInt and URI codecs are transitions.
Other implicit library exceptions remain a coverage gap. Library faults are an
overapproximation: repeated pure calls need not prove equivalent to one call.

Each hoisted transition has a checkpoint before later evaluation or assignment.
Outside method lookup is a transition before arguments, as lane B records it.
The caller sees the callee's returned fault and invokes its current fault
continuation. Conditions and return expressions have checkpoints too.
For example, `try { return leaf(x); } catch { return 0; }` reads as:

```dafny
var (wld, t) := leaf_parent(wld, x);
if ext_faulted_World(wld) then
  (var wld := ext_clear_fault_World(wld); (wld, 0))
else (wld, t)
```

Finally has continuations for normal completion, return and throw. A pending
return is evaluated and saved before cleanup. A pending fault is saved and
cleared while cleanup runs, then restored on cleanup's normal completion.
A fault or return from cleanup uses the enclosing continuation and overrides it.
Nested catches and finalizers follow the same rule.

## Gate and soundness

Before probes: lint admits throw, same-file propagation and finally-only. The
finally-only probe fails translation with `a path ends without a return`;
throw is an uninterpreted result, and a return expression bypasses catch guards.
The new gate names the boundaries needed by the completion reading:
`exception-loop` for loops in exception units; `exception-callback` for nested
function values/calls there, other-receiver methods or throwing units as values; `exception-expression`
for lazy expressions containing calls, effectful switch tests and defaults;
`exception-binding` for repeated local binding names in an exception unit;
`exception-return` for object-valued returns across finally (alias lifetime).
These need loop completions, function-value fault channels or lexical renaming.
Move them into separate straight-line units with uniquely named locals.

A raised fault and a normal completion have different datatype constructors.
Thus a throw replacing a return, including an ignored callee result, cannot be
proved equal. Catch clears only the fault, preserving the outside history.
Every transition checkpoint aborts subsequent evaluation, and finally preserves
or overrides the saved outcome exactly. Uninterpreted outside histories remain
universally quantified, so dropping cleanup transitions cannot prove equality.
The existing numeric, heap and pure-library modelling limitations still apply.

Lane B executes JavaScript: it observes returned versus thrown values, mutation,
and ordered fake calls. Pair cases exercise explicit string throws and a typed
port cleanup call, including fault paths and overridden returns.

## Corpus instances inspected

Root: `/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos`.
- `blocks/apps/api/src/application/queries/GetPermissions.ts:17`: enters, explicit throws after outside reads.
- `nutshell/apps/cli/src/node-io.ts:73`: enters, a faulting return expression is caught.
- `nutshell/tools/proof-host/src/shell-sweep-fixes-scenarios.ts:118`: `exception-return`, array return through finally.
- `nutshell/core/conversations/src/keepers/burst-drain.ts:33`: `exception-loop`, draining loop in try/finally.
- `nexus-learning/packages/storage/scripts/check-schema.ts:211`: `exception-return`, record returned before cleanup.
The sample includes nested callbacks that remain opaque; a translated unit need not enter this reading.
