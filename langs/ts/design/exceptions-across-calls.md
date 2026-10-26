# Exceptions across same-file calls

JavaScript completes normally, returns a value, or throws a value. A callee throw
aborts evaluation at the call site and reaches the nearest catch. Finally runs
on every completion; its own return or throw replaces the pending completion.

## Reading

The existing `(World, R)` signature carries an optional fault beside WorldHistory.
`ext_faulted`, `fault_value`, `clear_fault` and `raise` have concrete bodies.
A terminal uncaught `throw` raises the fault and returns an unused result placeholder.
This replaces `ext_throw_R(e)`: discarding the result can no longer discard a throw.
An otherwise pure throwing function needs the world. Its callers inherit the
outcome channel; its ordinary callees keep their existing reading.
Same-file constructors carry this outcome with their Unit result and class initialization.

General transition checkpoints are local to an exact try, including its return
and condition expressions, and the cleanup of an exact finally. A unit's unrelated
transitions do not acquire checkpoints because another unit calls it inside try.
Same-file exception calls propagate their returned outcome, including discarded calls.
An outside method lookup precedes argument evaluation inside checked expressions.
For `try { return leaf(x); } catch { return 0; }`, the central reading is:

```dafny
var (wld, t) := leaf_parent(wld, x);
if ext_faulted_World(wld) then
  (var wld := ext_clear_fault_World(wld); (wld, 0))
else (wld, t)
```

An exact finally saves a return value before cleanup. It saves and clears a fault,
runs cleanup, then restores the fault on normal completion. Cleanup's own return
or fault overrides the saved outcome. Nested handlers use the same continuations.
JSON.parse/stringify, new URL/RegExp, BigInt and URI codecs are may-fault transitions.
Their world dependency overapproximates argument-only operations. Outside a checked
region they retain the ordinary transition reading, without extra checkpoints.
Other implicit library exceptions and existing numeric/heap limits remain gaps.

## Local fallback and gate

The old lint admitted throw, calls and finally-only; the baseline finally-only
probe failed translation with `a path ends without a return`. A returned callee's
throw was an ordinary result and bypassed the caller's catch.

Loops, callbacks and unsafe expression sequencing inside try now select the
existing text-keyed opaque transition for that try, not a whole-unit refusal.
Complex finally statements also retain this fallback; straight-line finally
remains exact. Object-valued completions and duplicate local names select opacity.
An opaque statement that always returns or throws has a terminal result channel,
so translation does not invent a fall-through path needing another return.
Opaque blocks retain dependency guards for same-file callees.
Ordinary helpers keep their loops, callbacks and expression reading in full.
An outside loop containing a throw or an exception call uses an opaque completion.

Only a finally's concrete alias conflict (`exception-return`) or shadowed binding
read by cleanup (`exception-binding`) is refused. A direct throw in a callback,
or a throwing unit used as a function value outside opaque try, remains
`exception-callback`. There is no exception-loop or exception-expression refusal.

The concrete normal/fault constructors separate return from throw. Checkpoints
abort later evaluation where the exact handler applies. Finally preserves or
replaces the completion. Opaque text changes and changed callee dependency guards
prevent a changed block from silently proving equal. These guarantees do not
claim exact propagation of every implicit exception outside the checked regions.

Lane B observes returned versus thrown values, mutations and ordered fake calls.
The original 17-unit pair covers propagation, ignored calls, cleanup and overrides.
The scope pair covers ordinary helpers, loop/callback fallback and lexical shadowing.

## Corpus instances inspected

Root: `/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos`.
- `blocks/apps/api/src/application/queries/GetPermissions.ts:17`: terminal throws after outside reads.
- `nutshell/apps/cli/src/node-io.ts:73`: faulting return expression reaches the exact catch.
- `nutshell/tools/proof-host/src/shell-sweep-fixes-scenarios.ts:118`: admitted, object return selects opaque finally.
- `nutshell/core/conversations/src/keepers/burst-drain.ts:33`: admitted, loop selects opaque finally.
- `nexus-learning/packages/storage/scripts/check-schema.ts:211`: admitted, record return selects opaque finally.
