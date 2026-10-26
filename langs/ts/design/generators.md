# Generators and iterators

Calling a JavaScript generator creates a suspended computation. Each next resumes through
one yield; yield* delegates until done. A for-of break closes the iterator. Async iteration
awaits each next before the consumer body, including the final done answer.

The exact synchronous envelope is a top-level generator with scalar inputs and yields,
local scalar state, finite counted loops, branches, and delegation to a literal sequence
or another generator in the envelope. Calls consume it immediately with for-of, spread,
Array.from with one argument, or statement-form yield*. The reading collects yields in
order into seq<T>. For example, `function* g(n: number) { yield n; yield n + 1; }`
becomes `function g(n: int): seq<int> { var yielded_: seq<int> := [];
var yielded_ := yielded_ + [n]; var yielded_ := yielded_ + [n + 1]; yielded_ }`.
Counted loops reuse the recursive loop helper and its checked termination measure.
Unbounded loops and recursive delegation are refused as generator-bound, not truncated.

Purity alone is insufficient: mutable input objects could change between yields. Scalar
inputs and yields exclude this alias, and producer expressions cannot call outside code,
read module state, throw, inspect properties, or use potentially throwing bigint arithmetic. Only local scalar mutation is permitted.
A lazy consumer can therefore interleave effects without changing the producer's values.
Effectful synchronous generators remain refused as generator-effect; their existing
outside iterable consumers retain their previous opaque/uninterpreted readings.
The generator unit's sequence denotes full iteration, not equality of iterator objects
with arrays. Same-file escape, next(value), return(value), throw and reuse are generator-use.

For-await uses an iterator handle with its suspended state in World. Opening the iterator
is a transition. Each next is `(World, handle) -> (World, Option<T>)`; Some binds the loop
variable, the consumer body runs, then another next occurs. None terminates. A nat fuel
bounds unfolding, and exhaustion calls an opaque remainder keyed by the loop source,
its state and same-file dependencies. Exhaustion never means an empty remainder.
Sync iterable adapters, abrupt completion (including labelled continue), nested exception handling and unsupported bindings retain an
opaque whole-loop transition, including iterator closing. This is intentionally partial.

Same-file scalar async generators use an opaque suspended program, created by a world transition
keyed by the full declaration and transitive same-file declarations and import bindings. Creation captures
required scalar arguments or scalar iterator handles and receiver; it does not execute the body.
Mutable captures and reference yields remain generator-effect: the value model cannot
update a captured array in its caller between steps. The iterator handle identifies the
program and suspension state in World. Its next transitions include the producer's work
up to the next yield and therefore interleave with consumer work. This is an opaque step
reading, not exact compilation of the producer's control flow. A changed producer cannot
share its constructor operation with the parent. A future exact state machine can refine it.

Protocol object literals defining Symbol.iterator or Symbol.asyncIterator are refused as
iterator-protocol; a user method can run arbitrary code or return itself. Ordinary outside
iterator handles keep the existing fallback when this reading does not apply.

Lint uses the shared generator shape checker and checks suspended bodies with the ordinary gate. New refusals apply only to newly readable
generator bodies or protocol literals that previously had no reading. It removes the
blanket for-await refusal. Calls to refused same-file generators are refused too, so an
opaque consumer cannot conceal an omitted producer dependency. Direct async-generator calls do not require await at creation.

Lane B runs actual generators through consumers. Typed AsyncIterable inputs provide finite
value sequences and record iterator-open, next and close requests. Direct generator return
objects are not drained by lane B, so witness tests target consumers, not raw constructors.

Instances inspected under the read-only census root
`/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos/`:
- langchainjs/libs/langchain-core/src/runnables/base.ts:655, Runnable.transform:
  generic/reference-bearing async producer, generator-effect.
- langchainjs/libs/langchain-core/src/document_loaders/langsmith.ts:133, LangSmithLoader.load:
  outside for-await consumer; other body constructs can still block translation.
- langchainjs/libs/providers/langchain-cohere/src/utils/stream_events.ts:21,
  convertCohereStream: reference captures/yields, generator-effect.
- nutshell/core/extensions/src/api.ts:159, elementsOf: unknown/reference captures/yields, generator-effect.
- nutshell/apps/desktop/core-host/src/folder-handlers.ts:35, noteRecentlyUsed:
  async producer with reference captures/yields, generator-effect.
- nutshell/apps/desktop/core-host/src/settings.ts:60, effectiveValues:
  reference-bearing producer, generator-effect.
