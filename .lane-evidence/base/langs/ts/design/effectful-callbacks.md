# Effectful array callbacks

Sync arrows in map, filter, find, findIndex, some, every, flatMap and reduce
are loops over a dense array snapshot, in increasing index order. Each body
finishes before the next begins. map appends the returned value; filter appends
the original element when the result is truthy; flatMap concatenates one level;
reduce replaces an accumulator, beginning with its explicit initial value.
find/findIndex stop at the first truthy result and yield the element/index,
or undefined/-1. some stops at true; every stops at false. Empty inputs yield
[], undefined, -1, false, true, or the initial accumulator respectively.
JavaScript snapshots length; methods except find/findIndex skip holes. Dense,
unmodified value sequences are this model's domain. Captured mutation stays
refused, including mutation of the iterated array. No third array argument or
thisArg is read; effectful callbacks use plain element/index names. A callback return ends one iteration, never the enclosing unit.

The recursive core loop carries the world and result. Generated map step:
```
var x: int := seq0[idx0];
var (wld, t4_) := ext_Ext_Service_log_World_Ext_Service_int(wld, svc, x);
var (wld, t5_) := ext_Ext_Service_get_World_Ext_Service_int(wld, svc, x);
var out: seq<int> := out + [t5_];
mapped_loop0_parent(seq0, idx0 + 1, svc, wld, out)
```
Short-circuit bodies return current state immediately on a hit. They never
call the recursive tail after that hit. Predicate results are evaluated once.
The expression reading also handles chained calls and nested callbacks.
A map declaration and a for-of that pushes values share the same loop helper.
for-of over Object.entries keeps the existing uninterpreted sequence of its
record value; insertion-order fidelity is an inherited limit. Its body threads the world. Nested forEach bodies also thread the world.

Promise.all guarantees result positions, not completion order. map starts
callbacks in index order, executing each synchronous prefix through its first
await before starting the next. Subsequent effects run in resolution order,
which this model cannot know. An ordered collecting loop is sound only when
those continuations have no observable work: one suspension at most, followed
by pure local computation, with no captured state changes or world reads.
The lint checks same-file async callees too, and refuses other continuations
as promise-all-order.
This is a request-order abstraction of external async calls, not a scheduler
or a proof about external completion effects or competing rejection order.
Those remain limits of the existing world/await model and are tested by lane B.

An async flatMap callback returns a Promise object, which flatMap does not
flatten: under awaited Promise.all it is a map collecting resolved results
(including nested arrays). Async filter/find/findIndex/some/every predicates
are a JavaScript bug: promises are truthy, even when resolving false. They are
refused as async-predicate, including inside Promise.all. Async reduce has a
promise accumulator, not an awaited fold, and is refused as async-reduce.
An async map/flatMap without direct awaited Promise.all is async-callback.
Async forEach remains foreach: forEach does not wait. Effects in named
callbacks need an inline arrow; unsupported return/throw control inside a
callback, including try, is callback-control. Callbacks handed to outside libraries remain
opaque function values; their bodies are not executed by this reading.
Effectful type guards, mixed scalar/array flatMap results and PromiseLike
callbacks stay callback-result; forEach values need a statement block (foreach).

Soundness: the recursive step evaluates one callback exactly once, threads its
world into the next step, and changes only its result state. Short-circuiting
cannot be replaced by filtering all elements without changing the world.
No purity assertion is attached to an effectful predicate. Existing pure
filter provenance must not be reused for effectful filters. Nested stored
callbacks must not become eager effects. try around a callback loop remains
opaque when it contains transitions, like try around an ordinary loop.

Lane B uses real JavaScript arrays, typed service results, ordered requests
and fault draws. The pair tests distinguish inverted filter results and the
extra calls from filter()[0], and compare map with an explicit push loop.

Instances inspected under the census root
/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos:
- langchainjs/libs/langchain-core/src/callbacks/manager.ts:233: map starts an outside helper; enters the collecting shape.
- langchainjs/libs/langchain-core/src/callbacks/manager.ts:577: same shape; enters.
- langchainjs/libs/langchain-core/src/callbacks/manager.ts:607: same shape; enters.
- langchainjs/libs/langchain-core/src/runnables/base.ts:2038: indexed async map; conservative continuation gate applies.
- langchainjs/libs/langchain-core/src/runnables/base.ts:2071: optional service call in map; enters.
- langchainjs/libs/langchain-core/src/runnables/base.ts:2158: two-parameter forEach; existing foreach refusal remains.
