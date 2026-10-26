# References, layer 2: a shared heap

Design and standalone prototypes only. No translator flag or lint relaxation is shipped.
(2026-10-26, stage 2: the translator flag `--heap` ships and `check.mjs` passes it; the lint is unchanged. See "Stage 2" at the end.)
This is larger than a day: signatures, the theorem, callbacks, external answers and lane B's observation must change together.
`SEMANTICS.md` item 2 is the contract, including objects reachable BEFORE the call that become disconnected during it.
Its later descriptions of refusals predate layer 1; this design does not treat those descriptions as current implementation facts.

## Model and JavaScript meaning

JavaScript assignment copies an object reference. `const tags = user.tags` does not copy an array.
An element of a parameter array, a repository row and a cache hit can all name an existing object.
`push` changes that object; `user.tags = [...user.tags, t]` allocates another array and changes one edge.
Object spread is shallow: copied reference-valued fields still name the original children.
`===`/`!==` compare references, including when field contents are equal. Primitive comparisons retain their existing reading.

Use `World(env: Env, heap: map<Ref, Obj>, next: nat)`, with `Ref = nat` and a generated tagged `Obj` sum.
Use runtime-family tags, with record fields as a map of primitive/ref values and arrays as sequences of those values.
TypeScript shapes are compatible VIEW predicates, not disjoint nominal tags: structural subtyping must not exclude possible aliases.
Preserve unknown extra fields and property order; a typed view does not permit dropping caller-owned properties. The toy uses only two fixed shapes.
Records/arrays from parameters, `this`, external answers and `new` are refs; literals, spread, `slice` and `map` allocate fresh refs.
Strings, numbers, booleans, primitive literal unions and their optionals stay values; optional objects are `Option<Ref>`.
Keep the existing arithmetic and null/undefined modelling caveats; the heap does not repair them.
Sets, maps, dates and opaque instances need tagged heap objects or coherent world handles before admitting their mutation/identity.
Well-formedness relates refs to shapes, checks referenced objects exist and bounds all allocated refs below `next`.
Do not require distinct parameters or disjoint descendants. Two root paths, including two indices, may reach one ref; cycles are allowed.
Plain typed data excludes proxies, accessors with unmodelled bodies and prototype changes. A field can be missing only under its shape's absence rule.

A read of `user.tags` returns `heap[user].tags`; a length read is `|heap[tags].items|`.
A write `tags.push(t)` returns `World(env, heap[tags := Tags(heap[tags].items + [t])], next)`.
Reads are exact heap projections, not observable external requests; writes are functional heap updates.
Evaluate the receiver and key once, then the right side in JavaScript order, then perform the update.
Appending, replacing a field and rebinding a local are different operations. Rebinding a parameter changes only that binding.
A local alias just copies `Ref`. A closure captures refs, not snapshots; each invocation takes the current world and returns the updated world.
Mutable captured scalar bindings additionally need environment cells or the existing loop-state reading; refs alone do not solve them.
Start with synchronous inline `forEach`/`map` bodies with specified iteration order; escaped callbacks need invocation and lifetime semantics.
A captured closure includes its environment; its body text alone cannot identify its value.

An external transition receives the heap-bearing world and reference arguments and returns a well-formed world and result.
It may return an existing ref, including an argument or previously returned row, or allocate new refs; never force every query answer fresh.
Its frame must prevent modification of unexposed local allocations. The environment may retain any object exposed to it.
World-field get/set and nested heap operations must use ONE backing object; a pure accessor cannot bypass subsequent heap writes.
An opaque block must carry heap updates and captured refs as well as locals; otherwise keep its current refusal.

Layer 1 becomes an optimisation: on a proven isolated mutable tree, unpack it, compute `(result, p')`, then write it back once.
`mutatedOf`, `computeMutations`, `mutLets` and `wrapRet` remain for that specialisation; heap units return `(World, result)`.
Same-file heap calls pass refs and thread one world, without rebinding arguments by their source names.
Never independently unpack overlapping roots. The old "two parameters are two objects" axiom is removed in heap mode.

## Equality and fresh references

Fix the initial heap H0 and its input/receiver/environment roots. Let A0 contain every object reachable before the call.
After the call, observe the outcome, every A0 object, and objects reachable from those anchors, the result, exposed world roots and pending work.
Keep requests/responses in source order with identity-bearing values at the time of each request. Preserve exception outcomes too.
Only unreachable, unexposed fresh garbage is omitted. An old detached child is still an anchor, even if no current parameter path reaches it.

Let FP and FC be fresh observable refs of the two runs. A correspondence rho is a bijection FP -> FC,
extended by identity on initial refs. It preserves object tags, property presence, primitive fields, array order and every reference edge.
Apply the SAME rho to the outcome, anchored final heaps, effect requests/responses and pending-work roots.
Equivalence requires corresponding observations for every well-formed input outside scope and every shared environment history.
One may instead require a bijection on ALL call allocations, but that is a stronger certificate and rejects unequal amounts of dead garbage.
Do not compare each returned record independently: returning an input versus returning a copy can differ even with identical fields.

The general Dafny obligation is `requires WellFormed(w, args) && !InScope(w, args)` and
`ensures exists rho: map<Ref, Ref> :: Bijection(rho, FP, FC) && SameObservation(rho, P(w,args), C(w,args))`.
This existential graph witness is expensive for Z3. A quantified lemma about an arbitrary rho would need a witness, not an axiom.
First implement the sufficient certificate `ensures P(w,args) == C(w,args)` on the complete heap-bearing answers.
Allocate the next ref in dynamic JavaScript evaluation order, then increment `next`. Initial refs already have shared names.
If parent and candidate allocate corresponding objects in the same order and make matching external transitions, rho is identity.
The toy's `FreshRefactorEqual` proves exactly that case with an actual fresh allocation on both sides.
Matching external requests ALONE is insufficient: unrelated pure allocations can shift or permute fresh refs.
When allocation schedules differ, equality failure means ASK; it is not a proof of difference and must not trigger WITNESS.
The complete-heap certificate also compares dead allocations and `next`, intentionally losing completeness, not soundness.

Canonical numbering is sound only when addresses are unobservable except for identity, refs are never reused,
external operations respect reference renaming, and a state's allocation counter is bookkeeping rather than an observable number.
An arbitrary Env transition needs a permutation-respecting specification before using a nonidentity rho through it.
For the identity certificate, identical heap/world states give identical transition inputs directly; no quantified renaming axiom is needed.
Do not identify refs by allocation SOURCE location: a loop executes one location many times and edits move locations.

## Keep a value fast path

"A parameter never aliased in source" is insufficient: `p.a` and `p.b` can be one object before entry.
Likewise `a` and `b` can overlap without any `const alias = ...`. TypeScript `readonly` does not establish exclusive ownership.
Default to heap refs for open mutable input graphs. The optimisation needs a proof of non-observability, not a naming heuristic.

Use a flow-insensitive may-alias/escape analysis over allocation sites, roots and field edges, closed to a fixpoint over callees.
Unify on assignment, destructuring, conditional joins, repeated arguments and captures; stores add sharing/escape edges.
Input/external roots may overlap whenever shape-compatible, including their descendants; unknown calls capture and may mutate exposed refs.
Identity tests, reference returns, stores, captures, unknown casts and unresolved types mark the region as requiring identity.
Propagate that mark across every possible alias; choose the union of marks on BOTH versions so their interfaces agree.
A first, decidable value rule is deliberately narrower than the analysis's eventual possibilities:
* A local literal with only primitive fields/elements, one binding, only direct scalar reads/writes, no identity test,
  no store/return/capture and no argument use is a value. Literal allocation disappears because nobody can observe its identity.
* A parameter region used only to compute primitive projections is a value snapshot if the entire call has no writes,
  external effects or escaping object results that could observe it. Input sharing is harmless because nothing can change it.
* A mutated parameter stays a ref unless all call sites establish an exclusive acyclic tree with distinct reachable objects,
  no external retained aliases and no escaping reference result. An open entry point cannot silently assert that precondition.
Read-only snapshots with possible aliases are safe values, but are not a claim that the underlying JavaScript objects are unaliased.
More elaborate local literals can be scalarised only after proving unique child ownership too; a shallow copy is not such a proof.

The simulation argument: every retained reference denotes one heap cell shared by all aliases; an unobservable local value simulates
its sole cell; read-only snapshots simulate projections of an unchanged heap. Unknown sharing promotes to refs, never duplicates cells.
This preserves reads after writes and identity tests. It does not need the invalid inference "different variable names mean different objects".
Heap reads add map-domain/shape obligations, and a write invalidates earlier projections unless framed; retain typed helpers and local let bindings.
The flat-literal/projection split avoids that cost in arithmetic and immutable data transformations; benchmark prover time before widening it.

## Lane B and the measured toy

`exec/run.mjs:observe` builds `mutated` from before/after `stable(arg)` and separately renders cached/assigned `receiver` fields.
`fake.mjs:render` uses a fresh seen-set per render and `$cycle: true` without a target ID; it also truncates deep graphs.
Thus it ignores allocation addresses, but does NOT implement the required shared heap correspondence.
`gen.mjs:inputsFor` creates plain parameter objects separately. `argPool` reuse applies only to fake handles in this branch.
The README's claim that lane B passes the same plain object twice is not implemented here.

Retain a pre-call object table; serialize all roots and all A0 objects together after execution, assigning IDs by deterministic traversal.
Receiver/fake inspection must use backing storage without triggering extra getters or requests; unmodelled accessors remain outside this observation core.
Compare fresh IDs via traversal correspondence, anchored to initial IDs; repeated edges must target the same ID, including cycles.
Snapshot effect arguments at request time using the same identity registry, then retain environment-held response roots.
Generate a shared graph, clone it per sandbox preserving aliases, and vary equal roots, shared children, repeated array elements and cycles.
Fakes must sometimes return existing concrete objects, with typed heap mutation/read coherence. Treat observation truncation as ASK.
The companion `.mjs` implements only the finite plain-data graph observation, not effects, exotic objects or a production serializer.
It uses the real `observe` with explicit `addTag(user, user.tags)` inputs, so the requested alias is exercised without a generator change.
Its additional probes show existing observation misses detached children and identity between a result and an input.

Commands run (absolute worktree paths):
```sh
dafny verify /Users/assem/nexus/nexus-organisation/work/lean-lanes/heap-layer/langs/ts/design/heap-layer-toy.dfy
node /Users/assem/nexus/nexus-organisation/work/lean-lanes/heap-layer/langs/ts/design/heap-layer-toy.mjs
```
```text
Dafny program verifier finished with 15 verified, 0 errors
lane B observe, explicit shared inputs: WITNESS / PASS-bounded fresh refactor / PASS-bounded alias refactor (3 inputs each)
graph prototype: different / equal fresh refactor / equal alias refactor (3 inputs each)
observation probes: detached descendant and result/input identity missed by current observe; detected by graph prototype; cycles preserved
```
`AliasingPairDifferent` proves unequal contents of an INITIAL tags object, which no fresh-ref renaming can repair.
`Witness` proves its precondition is inhabited; the negative result is a proved inequality, not a failed equality proof.

## Lint and migration

All refusals remain today. With the implemented, gated reading:
* `alias-mutation` disappears for typed heap paths, including array elements; unresolved/opaque aliases still require a coherent heap model.
* `reference-equality` disappears for represented refs; never reinterpret structural datatype equality as object identity.
* `closure-mutation` narrows to escaped/unmodelled invocation and mutable captured bindings lacking cells or loop state.
* `param-mutation`, `property-assign`, `index-assign` narrow to unknown targets, unmodelled descriptors and unsupported operations.
* `in-place-mutation` narrows when an exact mutator exists; `reverse` can update an array cell and return the SAME ref.
  `sort` needs comparator effects, call order and exceptions, so heap storage alone does not justify admission.
* `receiver-mutation` can narrow for represented nested receiver objects; `prototype`, `dynamic-eval` and async `foreach` remain.

Order: (1) repair lane B graph observation/input generation and add alias escape controls; (2) shared heap/value schema and representation
analysis used by lint and translation; (3) field/index access, allocation and supported mutators; (4) world/signature threading and same-file
call summaries; (5) theorem validity preconditions and the identity certificate; (6) synchronous callback helpers, constructors and typed
external handles; (7) broader correspondence and optimisation. Gate each admitted construct with its pair and escape before enabling `--heap`.
The current theorem compares raw function results and has no heap validity predicate; simply changing `dtype` would be unsound or ill-typed.

Existing pairs under heap mode:
* `mutation`: `addTag` push versus replacement is DIFFERENT under item 2; `tagTwice` inherits the difference. Change their expectations.
  `rename` stays different; `visit` and `countOnly` remain equal. Add a direct-path versus alias-push equality refactor.
* `record_ops`: keys/entries/fromEntries allocate; Object.assign mutates its first argument and copies child refs. Model allocation and target
  mutation rather than pure uninterpreted functions. Untouched units remain equal; key order still needs its existing ordered reading.
* `counter`: back `self`, `seen` and `count` by one heap; avoid simultaneously updating old world-field transitions and heap cells.
  Internal field projections need not be effect requests; migrate lane B receiver instrumentation consistently. Verdicts should be preserved.
* `class_new` is absent at this branch base, as is the lead's newer README section. Integrate the supplied fresh-handle-plus-constructor
  design by allocating once, running the constructor on that ref and retaining aliases; do not allocate both a handle and an independent record.

## Census: a conservative initial admission screen

The executable `heap-layer-census.mjs` re-enumerates the census roots with the exact domain names below and checks a deliberately small core:
synchronous nongeneric free units; known finite primitive/array/plain-record shapes; declarations, field/index reads and writes, literals,
arithmetic/logic, if/return, push/unshift and inline synchronous map/forEach. No imported unknown types, dictionaries, arbitrary calls,
methods, async units, escaped functions or other control forms. These are proposed core candidates, NOT newly lint-admitted or proved units.
This is the admission boundary to use before applying the value/ref split above; extending it requires its own reading and measurement.
The script uses the local checker, retains per-source hashes for reviewed examples and a digest of the complete instance manifest.
```sh
node /Users/assem/nexus/nexus-organisation/work/lean-lanes/heap-layer/langs/ts/design/heap-layer-census.mjs /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/concepts-all.json /Users/assem/nexus/nexus-organisation/work/lean-lanes/heap-layer/langs/ts/design/heap-layer-census.json
```
| domain | historical census | named instances | eligible core | eligible with object alias |
|---|---:|---:|---:|---:|
| local bound to another name (alias) | 4,620 | 4,605 | 4 | 1 |
| closure mutates outer object | 1,831 | 1,827 | 0 | 0 |
The counts are unchanged before/after: production entry gain is zero. The larger census totals include unnamed units omitted by `--instances`;
source revisions can also drift. Do not equate either domain with actual alias-mutation refusals: primitive aliases count, and the closure
predicate counts property assignments inside ANY nested function, even to its own parameters. No claim of 4,620 newly provable units follows.

Reviewed instances (absolute source paths and lines; candidate eligibility, not successful translation):
* `/Users/assem/Documents/GitHub/nexus/apps/frontend/src/modules/Settings/SandboxTracing/trace-timeline.utils.ts:885`, `derivePtyBootSplit`: enters; `rb = ctx.runnerBoot` is a read-only object alias. Primitive projections can use the snapshot split; the returned record is fresh.
* `/Users/assem/Documents/GitHub/nexus/packages/types/src/shared/customer-name.utils.ts:38`, `resolveDisplayName`: enters; both aliases are primitive optionals, already values.
* `/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos/nutshell/core/claude-wire/src/claude-tool-output.ts:142`, `taskStopLine`: enters; a string field alias, not a heap mutation.
* `/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos/status/src/domain/rollup-plan.ts:184`, `retentionCutoff`: enters; scalar local alias and a fresh primitive-field result record.
* `/Users/assem/Documents/GitHub/n8n/packages/nodes-base/nodes/SeaTable/GenericFunctions.ts:294`, `rowFormatColumns`: excluded; imported dictionary shape, cast, helper call and assignment-valued callback need readings beyond the screened core.
* `/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos/nutshell/extensions/nexus/src/common/tracks/reader/one-track.ts:202`, `readySlot`: excluded; it returns a captured setter, so future invocations need an escaping closure/environment model.
* `/Users/assem/Documents/GitHub/nexus/apps/backend/src/documents/processors/processor.registry.ts:5`, `Processor`: excluded; prototype mutation of the nested function's OWN parameter demonstrates the closure census's overcount.

Decision for the lead: build graph observation first, then a heap milestone; do not remove alias refusals based on this toy.
Use the identity allocation certificate initially, with ASK for different allocation schedules. Keep full heap correspondence as the specification.
The conservative measured core has little corpus reach; resolving imported shapes and supporting dictionaries/calls/closures are part of the milestone.

Suite run once: `node /Users/assem/nexus/nexus-organisation/work/lean-lanes/heap-layer/langs/ts/tests/run.mjs`

`| TOTAL | 304 checks | ALL PASS |`

## Stage 2 (2026-10-26): the heap core as shipped

`langs/ts/translate/heap.mjs`, reached by `translate.mjs --heap` (`--heap-units a,b` restricts the core to named units, `-` to none).
`check.mjs` passes `--heap` on both sides and agrees the core like `EFFECTFUL` (parent, then candidate restricted to the parent's core,
then the parent again when the candidate's core differs); the certificate's lane A names the core units (`heapCore`).

What a core unit becomes. A total Dafny function `(hw_: HWorld, params) -> (HWorld, result)`:
* `type Ref = nat`; `datatype Obj = R_<hash>(fields) | A_<elem>(items: seq<..>) | Dead`; `datatype HWorld = HWorld(heap: map<Ref, Obj>, next: nat)`.
  A record shape is structural (the hash of its sorted field names and shapes), so a type alias and the anonymous type it names are one constructor.
* Every read and write is a prelude function that is total: `Get_<shape>_<field>` reads a default through a bad reference, `Set_`, `Push_`,
  `Unshift_`, `Pop_` leave the heap unchanged through one, `Alloc_<shape>` takes `next`, `Len_`/`Items_` read an array. No unit body carries
  a proof obligation, so a chain of same-file heap calls needs no preservation lemma.
* The hypothesis the typed program guarantees (`WF(hw_)`: every cell well typed, every reference below `next`; each reference parameter of its
  declared shape) is written as `// HYP <unit>: <expr>` and `spec/theorem.py` copies it into the unit's lemmas, refusing when the two sides
  state different hypotheses. The lemma therefore quantifies over well-formed heaps only; a false proof needs a difference no well-formed heap shows.
* Equality is of the result and the WHOLE final heap, `next` included: the identity allocation certificate of "Equality and fresh references".
  Corresponding allocations in the same order are the same reference; two versions allocating on different schedules (one more temporary
  object, the other order) are unproved and reach lane B as ASK, never a WITNESS. Dead garbage counts, by design, for now.
* Nothing assumes two parameters are two objects: `addTag(user, user.tags)` is one of the inputs the lemma ranges over.

The core by syntax (a unit is in it when its own syntax fits AND every same-file unit it calls, and every same-file unit calling it, is in it):
primitive, plain-record and array-of-those parameters, locals and results; `const`/`let` with an initializer; `=`, `+=`, `-=` to a local or a
field path; `push`/`unshift`/`pop` statements on an array path; `return`; `if`/`else` whose branches return; same-file calls; `.length`,
`+ - *`, comparisons, `&& || !`, literals, spread array and record literals, `.slice()`. Out, this stage: element access, loops, methods,
async, generics, optionals and unions, dictionaries, Map/Set/Date, any call outside the file, `this`.

Measured on the two pairs (`dafny verify`, 30 s per lemma, suite machine):
* `mutation`: `add_tag`, `rename`, `tag_twice` unproved; `visit`, `count_only` proved (19 verified, 3 errors, each error inside an expected lemma).
  Layer 1 alone proved `add_tag` and `tag_twice`: that false proof is gone for core units.
* `heap_graph`: `add_tag`, `identity` unproved; `alias_refactor`, `count_tags` proved (17 verified, 2 errors). `alias_refactor` is the
  identity certificate at work: the same allocation in the same order through a local alias.
* `check.mjs` end to end on `visit` and `aliasRefactor`: `PASS-proved` with `heapCore` naming the unit.

Reach, `heap-core-census.mjs` over the 39 census roots, modules unresolved (an imported shape is unknown, as the stage-1 census chose):
53,899 named units, 34 in the core (34 own-syntax fits are kept out only by their call graph). First reason out, coarse: method, accessor or
constructor 21,519; a parameter type without a shape 12,676 (12,376 of those `any`/`unknown`, mostly unresolved imports; 2,329 unions; 778
dictionaries; 603 optional fields); generator or async 4,965; parameter form (destructuring, defaults, rest) 4,626; return type 4,426;
an expression outside the core 2,476; a method call 1,028 (`replace` 184, `trim` 88, `join` 83, `filter` 53, `map` 52). The core as a proof
lane reaches well under one unit in a thousand; the gain of stage 2 is soundness on those units, not reach. Resolving imports moves `any`
into unions and dictionaries, not into the core (the two-repository probe: 349 `any` became 193, unions 80 became 223, the core stayed at 1).

Layer 1's exposure, measured by `layer1Risk` in `heap.mjs` (reported, never acted on): outside the core, a unit is EXPOSED when it (a) writes
through a nested reference path of an input (`p.a.b = v`, `p.a.push(x)`, through a local alias of a path), where the old inner object differs
from a fresh replacement, or (b) returns a value that may hold an input reference or share one (any reference-typed result that is not a
literal tree of primitives and literals), where the same tree can be another graph. Over the 39 roots, 34,544 of the 53,865 units outside the core are
exposed (31,992 by their result, 3,066 by a nested write; `heap-core-census.json`, `layer1`); 19,321 are not. An exposed unit
is one where tree equality proved by layer 1 is weaker than SEMANTICS item 2; lane B's graph observation (stage 1) sees the difference on
every input that reaches it, so a false PASS-proved needs the differing path unreached by lane B's inputs. The decision on what lane A
claims for exposed units (a caveated proof, a refusal, an identity-skeleton check on both sides, or a wider core) is the owner's; the
numbers above are what it costs.

