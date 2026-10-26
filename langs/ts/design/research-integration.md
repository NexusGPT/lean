# Integrating the five research results into lean

Design note, 2026-10-26. Sources: the five deep-research results on briefs 13 to 17 (shared references, state over
time, escaping functions, identity-bearing built-ins, dynamic features), read in full. lean holds no model anywhere:
no LLM, no small decision model. Every mechanism below is a program, a proof or a measurement.

## What the five results agree on

* The thing compared must be an open system over a complete, explicit state: every cell a unit can read or write is
  in the state, with its real meaning, or the verdict is ASK. A cell left out, reset between calls, or read as an
  uninterpreted function is where a false proof lives (result 14's "crucial correction": a one-step proof over the
  COMPLETE state composes to every call sequence by induction; the hole is omission, never the lack of a second-call
  prover).
* A bounded search that finds nothing is ASK, never PASS. A proof is PASS only over a stated observation contract.
  A WITNESS is a replayed separating run, never an abstract counterexample.
* Identity is part of the observation: the same value tree can be two graphs (result 13), the same contents can be
  the receiver or a fresh object (result 16), the same function text can be two closures (result 15).
* A refusal names a missing semantic obligation, never a forbidden spelling (result 17).

## 0. One design: a ledger, two lanes, obligations

**The ledger** is lean's state object, the one thing both lanes read and write:

| Component | Holds | Today |
|---|---|---|
| heap | records, arrays, dictionaries, Map/Set/Date cells, class instances with a `proto` edge | records and arrays of primitives in the heap core (stage 2); the rest is a value tree or uninterpreted |
| cells | module variables, captured variables of closures | World fields (module forms, the counter reading) |
| callables | a function value = code identity + captured cells | a text-keyed uninterpreted value |
| pending | timers, intervals, promise reactions, events, with enabling rules | `pending` in lane B's observation; promise forms in lane A |
| clock | the instant a read returns | a transition (the clock-read lane) |
| library | every built-in call as a transition on the ledger | a transition for effects, uninterpreted for the rest |

**Obligations.** The translator emits, per unit, the ledger components the unit needs (`// OBLIGATIONS <unit>:
heap(R_x, A_string), library(push, Map.set), cells(counter), callable(returned), pending(timer), clock, receiver,
arguments, proto, keys, coercion`). A unit is PROVABLE when every obligation has a transition model in the ledger;
an obligation without one makes the unit ASK with the obligation named, and lane B still runs. A REFUSE stays for
the obligations no model can carry yet (interception, text-to-code, prototype mutation after escape), each named.
This replaces "outside the subset" by "this unit needs X, and lean does not model X".

**Lane A** proves transition equality of one step on the ledger (one lemma per unit, as now); one step composes.
**Lane B** runs environment programs on the ledger (result 15's witness shape), with retained state between
commands, aliased and cyclic inputs, and a seeded schedule; it reports WITNESS on a replayed divergence,
PASS-bounded with the program depth stated, and PASS-decided when the state space is finite and fully explored
(section 3).

## 1. Shared objects (brief 13)

**Settled.** Identity is fixed on every object that exists before the call; a bijection may relate fresh objects
only; writes through retained references are observations. A value reading is sound only under a proof that
identity cannot interfere: no live alias observes a mutation, no identity test, callback, closure or escape exposes
the location (result 13, section 3).

**Built this stage.** The heap core (`translate/heap.mjs`): plain records and arrays through one heap, total
transitions, whole-heap equality as the identity certificate (allocation paired in execution order, result 13's
first strategy, "appropriately conservative, not complete"). Lane B observes the reachable graph and shares objects
between input positions (stage 1). Measured over the 39 census roots: 34 of 53,899 units in the core; 34,544 of the
53,865 units outside it are exposed to a layer-1 identity false proof (31,992 by a result that may carry an input or
shared reference, 3,066 by a nested write through an input).

**Mechanism, new: the identity guard on layer 1.** Layer 1 (a mutated parameter is an output, objects are value
trees) keeps its proofs only where tree equality implies graph equality: no nested write through an input, and ONE
identity skeleton for the result, the same on both sides (`identitySkeleton` in `heap.mjs`: each reference node of
the returned value is an input path, a numbered fresh node, or unknown; a conditional or a second return site must
agree; a reference written into an input field joins the skeleton). The theorem compares the two sides' skeletons;
exposed units with unequal or unknown skeletons are `ASK:identity`, with the two skeletons in the certificate. This
is a syntactic sufficient condition for result 13's non-interference, cheap, and it blocks the measured false-proof
classes (push versus replacement, the input versus a copy, a shared versus a copied sub-object).

**Mechanism, later: the canonical-heap certificate.** Two versions allocating on different schedules are unproved
today. Stage 3 replaces whole-heap equality by equality of the canonical rooted heap: a Dafny function `Canon(hw,
roots)` renumbers cells in first-reach order from the roots (inputs, result) and drops unreachable cells; the lemma
proves `Canon(parent) == Canon(candidate)`. No existential bijection for the solver to find, no garbage counted,
exactly result 13's "canonicalize each rooted graph" strategy as a proof object. Cost: a recursive traversal the
solver must unfold; measured on the pairs before it ships.

**Lane B.** Inputs gain cycles and back-edges between positions (Korat's lazy initialization: null, fresh, or an
existing object, per reference field). The witness record carries what result 13 lists: both hashes, the serialized
initial environment, the heap node table with roots and sharing edges, the seed, the observed outcome and final
rooted graph, and the replay result.

**Boundary.** `===` on objects, identity hashes, WeakMap/WeakRef and finalizers observe addresses: obligation
`identity observation`, unmet, ASK.

**Measurement.** Determinate units in the census (how many exposed units the guard keeps provable), the corpus
re-measure with the guard on (PASS-proved before and after, with every lost proof read), and the bench on the alias
and mutation domains.

## 2. Identity-bearing built-ins (brief 16)

**Settled.** Each built-in has a transition contract: fresh result or not, receiver mutated or not, result identity
(receiver, fresh, primitive), iteration order, callback effects, exceptions (result 16's table). `push` mutates and
returns a length; `slice` and `map` allocate; `sort` and `reverse` return the receiver; `Map.set`, `Set.add`,
`Object.assign` return the receiver; `structuredClone` builds a fresh graph with sharing and cycles preserved;
`sort`'s comparator schedule is implementation-defined, so a comparator with effects has no portable meaning.

**Mechanism: a versioned library table, generated into the prelude.** `translate/library.json` lists every
operation lean reads, one row per result-16 column; `heap.mjs` generates the Dafny transition from the row
(`Push_`, `Splice_`, `Reverse_`, `SortPure_`, `MapSet_`, `SetAdd_`, `Assign_`, `Freeze_`, `Clone_`), each total
and over the ledger's heap. Map and Set are cells with ordered entries keyed by reference or by primitive
(SameValueZero); Date is a cell with an instant, its setters transitions, its reads of the clock already
transitions. A callback inside an operation (`map`, `filter`, `sort`) is read only when the lint proves it pure
over its arguments; otherwise obligation `callback effect`, ASK.

**Mechanism, new: the engine validates the table on every run.** Lane B already calls the real built-ins. It
records, per built-in call, the receiver's identity and contents before and after, the argument identities, the
result identity and the heap delta. A checker replays each recorded transition against the table's prediction. A
mismatch is a model defect: it is filed with the recorded case, and the proof lane refuses that operation until
the row is fixed. The engine is the oracle, continuously, on the code that matters, with no conformance suite to
maintain. This is the measurement result 16 asks for (section 6) turned into a standing check.

**Boundary.** Getters, setters, proxies, species constructors, `sort` with an effectful comparator, `Date` parsing
of strings and time zones: obligations unmet, ASK; `structuredClone` of unsupported values and transfer lists:
refused by name.

**Measurement.** Our census: 5,082 units call a mutating method on a local or result and 523 on a parameter,
`Object.assign` 390, `structuredClone` 32, `Object.freeze` 6, `Map`/`Set` identity in 75 and 50 parameter types.
The bench domains `mutating method on a parameter/local` give the before and after.

## 3. State over time (brief 14)

**Settled.** A proof of equal outputs and equal complete successor states for every operation extends to every
finite call sequence by induction. What a fresh sandbox per call misses (`call(); call()` separating a counter) is
a cell omitted, reset or renamed, never a missing temporal engine. Representation independence (an array-backed
and a list-backed cache) needs a coupling, not literal equality; that is a later stage. Retained-state command
sequences with shrinking find real sequence bugs (QuickCheck finds 6 of 9 planted in the AUTOSAR study) and prove
nothing when clean.

**Mechanism: the state-completeness audit.** For a unit that reads or writes a module or captured cell, the
translator lists the component: every exported operation sharing that region, plus the initializer. Every cell any
of them touches must be a ledger cell with its real transition; a cell read as uninterpreted or absent is
obligation `state(<cell>)`, unmet, ASK for the whole component. The theorem for the component is the conjunction of
the per-operation lemmas over the complete ledger, so the induction of result 14 holds by construction.

**Mechanism: retained-state programs in lane B.** Lane B keeps the ledger between commands: an environment program
is a sequence of calls to the component's operations with generated arguments; parent and candidate run the same
program on isolated ledgers; the first divergence (outcome, heap, cells, pending, trace) is the WITNESS, shrunk by
deleting commands and simplifying arguments; a clean run is PASS-bounded with the program count and depth in the
certificate.

**Mechanism, new: the finite-state decision lane.** When a component's persistent state and the inputs of its
operations range over finite declared domains (enums, booleans, literal unions, bounded integers the type states),
lane B explores the whole product of reachable (parent state, candidate state) pairs, one step per operation and
argument. Equality is then DECIDED, not bounded: `PASS-decided`, with the reachable pair count and the explored
alphabet as the certificate (result 14's deterministic input/output machine baseline; the W-method's completeness
holds because the fault domain is the declared finite state, not a guess). Status machines, flag sets and mode
switches in the corpus are this shape.

**Boundary.** Unbounded hidden state (a counter, an unbounded cache), a coupling needed between two
representations, a closure that escapes the component (section 4): ASK with the obligation named. Couplings are
written by hand when a case justifies one; no proposer.

**Measurement.** Our census: 65 captured-variable assignments and 1,831 captured-object mutations over 39
repositories; the units whose state is a finite domain (a count to make); corpus bugs whose repair touched module
or captured state, checked before and after.

## 4. Exported control (brief 15)

**Settled.** A function value is a code identity plus a captured environment plus an invocation transition, never
a text token: `make(k) { return () => k }` returns one text and many closures. The environment may retain an
exported function and invoke it later, repeatedly, re-entrantly; a witness is an environment program (call, retain
a handle, advance time, invoke the handle twice, observe). Bounds exhausted are ASK (Hobbit's discipline).

**Mechanism: callable records in the ledger.** A closure value is `Fn(code: id, env: seq<Ref>)`: the code identity
is the function's text after suffix stripping (the theorem's identical-text rule), the environment is the captured
cells as ledger references. Two returned closures are equal in lane A when their code identities agree and their
captured cells are equal in the ledger; different bodies are ASK (sound; a bisimulation up-to engine is the
escalation, not this stage). An invocation of a handle is a transition reading the handle's cells.

**Mechanism: environment programs in lane B.** Commands: `call op(args)`, `retain h`, `invoke h(args)`, `tick t`
(advance virtual time: due timers fire in order), `settle p` (resolve or reject a pending promise in a chosen
order), `fire e` (an event on a registered handler), `next g` / `throw g` / `return g` for generators. A seeded
generator produces programs; the schedule choice is a command, so a witness names its schedule and replays. Shrink
by deleting commands, lowering invocation counts, shortening ticks. The host protocol (what may fire when) is the
ledger's `pending` with explicit enabling rules; a schedule outside the rules is never explored and never claimed.

**Boundary.** Function identity (`f === g`), `Function.prototype.toString`, `bind` observed through construction,
transform-stream orderings and any host behaviour without an enabling rule: obligation unmet, ASK.

**Measurement.** Our census: 262 return/store/compare function cases (the pilot), 450 timer-arming and 84
interval-arming units, 368 promise executors, 1,560 React handler attributes, 488 generators. A bench domain
"returned function invoked twice" with planted mutants that differ only on the second invocation.

## 5. Dynamic features (brief 17)

**Settled.** No feature in the list has an impossibility theorem; S5 gives semantics to accessors and `eval`, TAJS
and WALA to prototypes, receivers and argument objects, DJS to computed keys. What fails is the closed-record,
named-call abstraction. The smallest useful step is an explicit operand: receiver, argument vector, prototype edge,
key set. Rewrites need their own contract: ESLint autofixes `==` only for `typeof` and same-type literals and keeps
`call`/`apply` where the receiver differs.

**Mechanism: explicit operands as ledger components.** `receiver`: `call`, `apply`, `bind` and `this` in free
functions become a receiver operand on the transition (class methods already have one). `arguments`: the actual
argument vector as a sequence operand; TypeScript modules are strict, so no sloppy aliasing. `proto`: a heap field
on every record cell; `Object.create(p)` allocates with it, `getPrototypeOf` reads it, lookup walks it; mutation
of it after the object escapes stays refused. `keys`: a dictionary cell is a map with a stated missing-key result;
computed access on it is a map read. `coercion`: `==` with the exact primitive coercion table; an object operand is
an obligation.

**Mechanism: rewrites with a checked precondition and a label.** Every suggested fix lean emits carries one of:
`proved` (the precondition is decided by the translator: `===` where both operands are primitives of one type),
`conditional` (the precondition is stated and checked, as `no-useless-call` checks the receiver), `migration` (a
behaviour change the owner accepts knowingly). Only the first two ride an equivalence-preserving path.

**Boundary.** `Proxy`, `Reflect` traps, `eval`, `new Function`, `setPrototypeOf` after escape, descriptor accessors
without a summary: refused by obligation name, with the conditional rewrite where one exists.

**Measurement.** Refusal economics at the changed-function level (result 17, section 8): over the corpus's changed
functions, per rule, refusals caused by the rule alone, those each explicit operand would admit, and the catch rate
after. Our census: computed member access 5,278 (finite keys already read), `arguments` 133, loose equality 398,
prototype access 134, `Proxy`/`Reflect` 41, `eval`/`new Function` 2.

## 6. Order of work, each with its validating measurement

1. Identity guard on layer 1 (section 1): built as a measure; turning it on is one decision plus the theorem's
   skeleton comparison. Measurement: determinate units in the census; the corpus re-measure.
2. Library table with engine validation (section 2). Measurement: mismatches found on the bench domains; reach.
3. State-completeness audit and retained-state programs (section 3). Measurement: corpus bugs on module state.
4. Finite-state decision lane (section 3). Measurement: units with finite declared state; decided verdicts.
5. Callable records and environment programs (section 4). Measurement: the 262-case pilot; the two-invocation bench.
6. Explicit operands and labelled rewrites (section 5). Measurement: refusal economics per rule.
7. Canonical-heap certificate (section 1, later). Measurement: ASK:allocation turned PASS on the corpus.

## 7. What stays out

No model anywhere in lean (owner, 2026-10-26, Jev retracted). No learned or model-proposed invariants or couplings;
a coupling is hand-written or the unit stays ASK. No bisimulation up-to engine in this cycle; it is the named
escalation for closures with state. No conformance suite imported; the engine validates the library table on the
code lean checks.
