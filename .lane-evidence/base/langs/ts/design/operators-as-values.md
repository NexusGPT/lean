# Operators used as values

JavaScript evaluates operands and arguments from left to right. An assignment first
locates its target, then evaluates its right side, writes it, and yields that value.
A compound assignment reads the old value before its right side. Postfix increment
and decrement yield the old numeric value; prefix yields the new numeric value.
A comma evaluates and discards its left value before evaluating its right value.

The core reading uses pending let bindings. Every operand of an expression that
contains one of these steps is captured before the next operand can rebind a local.
For `const v = arr[i++]`, the generated shape is:
```dafny
var array := arr;
var old := i;
var i := old + 1;
var v := array[old];
```
Bindings for a conditional operand stay inside its selected branch.
Generated value temporaries exclude source identifiers, including tuple-result suffixes.
The lets are lexical versions, not Dafny heap writes. The expression result is a
snapshot, so `i + i++`, chained assignment, and call arguments retain earlier reads.
A module binding or direct world field uses its existing get and set transitions; postfix returns
the get result and prefix returns the value passed to set. Record paths rebuild
the root and parameter roots remain outputs under the existing mutation reading.
`=`, `+=`, `-=`, `*=` yield the stored value. A comma preserves all left steps.

A bounded while captures its condition's pending lines inside the recursive helper,
before each test, including the final false test. Variables changed by the condition
are helper state. A condition that makes transitions returns the next world too.
No exit postcondition repeats a condition with effects or local updates. A while
without a decreases hint retains its existing text-keyed opaque transition.

Conditional value steps and comma sequences stay refused as `operator-value-context`: short-circuit
right sides, conditional arms, optional calls/indexes, and binding defaults need a
state tuple carrying changed locals in addition to branchWithWorld's world/result.
Constructor/tag callee updates have no receiver reading and are refused by the same rule.
Case labels, for headers, JSX, callback construction beside updates, and discarded
container mutators in comma also stay out. Logical assignment values stay refused
as `assignment-expression`; their statement
reading is unchanged. Updating a parameter name or an alias retains
its existing ownership refusal. Non-numeric increments and unsupported targets stay
refused as `update-expression` or `assignment-expression`. A path whose root changes
while evaluating its reference/right side needs heap identity and is refused.
Previously admitted opaque or uninterpreted forms keep their fallback.

Soundness depends on snapshots before rebinding, one evaluation of each operand,
reference evaluation before the right side, and no unconditional conditional update.
Captured truthiness uses union member tags and Option/Nullish presence tags.
Cached values retain their source types so conversions preserve null versus undefined.
Element increments and compounds keep their existing target refusals; element `=` is read.
The exact numeric and null/undefined envelopes are those already stated in subset.md.
Lane B runs the actual operators, observes mutated arguments and receivers, and
records every outside iterator request. A local `return count++` versus `return count`
is equal if count is otherwise unobservable; the witness pair uses a receiver field.

Instances inspected (paths relative to the named absolute census roots):
- `/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos/odoo-unofficial-api/src/odoo-client.ts:14`: `++rpcId`, module get/set values enter after the module-forms rebase.
- `/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos/apps-ui/src/record-core/NotionEditor.tsx:22`: `_seq++`, module get/set values enter after the module-forms rebase.
- `/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos/langchainjs/libs/langchain/src/agents/middleware/pii.ts:172`: assignment in a while test enters the opaque-loop fallback.
- `/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/work/bench/nexus/tree/apps/backend/src/vibe/infrastructure/provisioner/k8s-jobs/k8s-own-pod-image.reader.ts:27`: logical assignment value remains out.
- `/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/work/bench/n8n/tree/packages/cli/src/middlewares/listQuery/dtos/base.select.dto.ts:16`: comma and dictionary assignment enter the new reading.
- `/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/work/bench/promo-app/tree/src/search/similar.ts:79`: conditional Set mutation still needs captured mutable callback state.
