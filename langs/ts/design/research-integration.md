# Integrating the five research results into lean

Design note, 2026-10-26, third version (section 10 added for the front-end results). Sources: the five deep-research results on briefs 13 to 17 (shared
references, state over time, escaping functions, identity-bearing built-ins, dynamic features), read in full, and
the five element dossiers under `research-elements/` (one per result, every named system opened at its primary
artifact where reachable, with a verdict DEPENDENCY / PORT / REFERENCE / IRRELEVANT and the file-level HOW).
lean holds no model anywhere: no LLM, no small decision model. Every mechanism is a program, a proof or a
measurement. The owner's standing rule: no overfitting to a bug; every mechanism is general.

## 0. Findings to fix now (soundness, found by the element readers while probing lean)

1. **`Object.assign` on a parameter passes the lint and lane A reads it as pure** (dossier 16, "Lean finding").
   `translate.mjs:171` lists `Object` among `PURE_RECEIVERS`; `Object.assign(p, {a: n})` becomes an uninterpreted
   call returning a fresh record while `p` is never updated in the model. Lane B catches the probe pair (WITNESS),
   so no false PASS was reached, but lane A's reading is a false-proof route. Fix: the lint refuses `Object.assign`
   whose first argument is not an object literal (rule `assign-target`), until the library table (section 2)
   models it as a transition on the target.
2. **Date setters on a parameter pass the lint and lane A leaves the Date unchanged** (dossier 16). `d.setFullYear(2020)`
   is an effectful external returning a number; `d.getTime()` afterwards reads the old value in the model. Lane B
   catches the probe pair. Fix: the lint refuses every `Date.prototype` setter (rule `date-mutation`) until the
   library table models the Date cell.
3. **`Object.getPrototypeOf`, `Object.create`, `Object.defineProperty`, `Object.setPrototypeOf` pass the lint**
   (dossier 17, probes). A probe pair `getPrototypeOf(x) === null` versus `return false` reached PASS-bounded: lane
   B never builds a null-prototype object. Fix: the lint refuses these by name with the existing `prototype` rule,
   and lane B's generator gains a null-prototype input, until the ledger has a `proto` field.
4. **A cleared timer still shows as pending** (dossier 15, special depth b): `run.mjs:120` records `clearTimeout`
   in the trace and leaves the pending entry. A candidate that arms and clears a timer differs from the parent only
   through the trace. Fix with the virtual clock (section 4).
5. **Corrections to the research results themselves** (dossier 16): `setFullYear` on an invalid Date sets the time
   value to +0, it does not return NaN; JEST's 27 are specification bugs, not engine bugs; Map and Set keys use
   SameValue after canonicalising -0, which equals SameValueZero.

## 1. One design: a ledger, two lanes, obligations

**The ledger** is lean's state object, the one thing both lanes read and write:

| Component | Holds | Today |
|---|---|---|
| heap | records, arrays, dictionaries, Map/Set/Date cells, class instances with a `proto` edge | records and arrays of primitives in the heap core (stage 2); the rest is a value tree or uninterpreted |
| cells | module variables, captured variables of closures | module cells are uninterpreted externals `Module_file_get_/set_` keyed by the declaration text (sound, weak); captured-variable writes are refused |
| callables | a function value = code identity + captured cells | a text-keyed opaque value (`opaqueFn`, `translate.mjs:2112`); lane B keys a function by its source hash (`fake.mjs:186`) |
| pending | timers, intervals, promise reactions, events, with enabling rules | a flat bag in lane B (`run.mjs:117-120`); promise forms in lane A |
| clock | the instant a read returns | a transition (the clock-read lane, merged 2026-10-26) |
| library | every built-in call as a transition on the ledger | a transition for effects, uninterpreted for the rest; `push`/`pop`/`unshift`/`splice` on sequences |

**Obligations.** The translator emits, per unit, the ledger components the unit needs; a unit is PROVABLE when every
obligation has a transition model; an unmet obligation makes the unit ASK with the obligation named, lane B still
runs. REFUSE stays for what no model can carry yet (interception, text-to-code, prototype mutation after escape).

**Lane A** proves one step on the ledger (one lemma per unit); one step composes (result 14's correction).
**Lane B** runs environment programs on the ledger with retained state, aliased and cyclic inputs and a seeded
schedule; WITNESS on a replayed divergence, PASS-bounded with the program depth stated, PASS-decided when the state
space is finite and fully explored.

## 2. What lean takes, element by element

The five dossiers judged 189 named systems and methods. Verdict counts: DEPENDENCY 5 (Dafny and Z3 already in use;
fast-check; Test262 as a corpus), PORT 16, REFERENCE 131, IRRELEVANT 37. The table lists every PORT and DEPENDENCY
with my ruling where it differs from the dossier.

| Element | Dossier | Verdict | Where in lean | How, in one line | Cost (CLAIM) |
|---|---|---|---|---|---|
| Korat heap enumeration | 13 §28 | PORT | `exec/gen.mjs` `enumerateHeaps(spec, k)` | enumerate non-isomorphic small heaps per shape (null, existing or fresh per reference field, cycles), deduplicated by `graph.mjs` naming | 3 d |
| CMC heap canonicalisation | 13 §32 | PORT (stage 3) | `translate/heap.mjs` `Canon(hw, roots)`, `spec/theorem.py` | the lemma proves `Canon(parent) == Canon(candidate)`; garbage and allocation order stop mattering | 5 d |
| `Object.assign` transition | 13 §37, 16 table | PORT | `translate/library.json` → `heap.mjs` `Assign_<shape>` | copy own enumerable keys of each source into the target in order through `Set_`; getters, setters, proxies and target-is-source refused | 4 d |
| Steensgaard may-alias, HotSpot escape | 13 §25, §26 | REFERENCE (dossier said PORT) | `heap.mjs` `identitySkeleton` | the skeleton already treats every input path as a may-alias and every fresh node used twice as shared; a separate unification pass adds nothing the guard needs | 0 |
| Hobbit closure search | 14 §4 | REFERENCE, later (dossier said PORT) | none now | a bisimulation search over paired worlds is the escalation for closures with state; the one-step proof over the complete ledger comes first | later |
| W-method suite | 14 §22 | folded into the finite-state lane | `exec/finite.mjs` | the declared finite domain is the fault domain, so the product exploration is complete without a separate W | 0 |
| Retained-state command runner | 14 design (a) | PORT | `exec/run.mjs`: one Environment per side per program, `commandSequence(spec, seed, i, len)` in `gen.mjs`, greedy delete shrinking | the counter pair gives a two-command WITNESS; clean runs stay PASS-bounded with the command count in the certificate | 6 d |
| Finite-state product | 14 design (b) | PORT | new `exec/finite.mjs` | breadth-first over (parent state, candidate state) pairs when every cell and argument is a literal union, boolean or enum read from the types; PASS-decided with the pair count and visited-set hash | 6 d |
| State-completeness audit | 14 design (c) | PORT | `translate/translate.mjs` before `emitUnit` | list every persistent cell a unit touches (`moduleState`, `isWorldField`, captured declarations, `outsideRoot`); a cell without a transition model is an obligation written to the certificate | 5 d |
| fast-check model-based commands | 15 §26 | DEPENDENCY | vendored under `langs/ts/vendor/fast-check` (MIT, 4.10.2), new `exec/program.mjs` | one command class per legal operation (`call`, `retain`, `invoke`, `tick`, `settle`, `fire`, `next`, `throw`, `return`); `fc.commands` shrinks and `replayPath` replays | 8 to 12 d |
| Virtual clock (Jest, Node MockTimers semantics) | 15 §27, §28 | PORT | `exec/fake.mjs` `clock` beside `pending`; `run.mjs:117-120` | `tick(ms)` fires due timers in arm order, intervals re-arm, `clearTimeout` removes the entry, `setTime` moves without firing, `runAll` has a count limit (ASK when hit) | 3 to 5 d |
| Callable records `Fn(code, env)` | 15 §34 | PORT | `translate.mjs:2112` (`opaqueFn`), the prelude | a function value is its code identity plus captured cells; equal when both agree; a body outside the file's list is ASK (defunctionalisation, 15 §35) | 10 to 15 d |
| HOBBIT's opponent-known callables | 15 §5 | PORT, inside the program runner | `fake.mjs` `knownCallables` beside `pending` | an escaped function becomes a retained handle a program may invoke again; bound exhaustion is ASK | counted above |
| Library transition table | 16 table, `library-ops.dfy` | PORT | `translate/library.json`, `heap.mjs` prelude generation | one row per operation (push, splice, sort with a pure comparator, reverse, slice, concat, map, Map.set, Set.add, Object.assign, Object.freeze, structuredClone of acyclic records, Date cells); the Dafny forms are verified in `design/library-ops.dfy` (23 verified, 0 errors) | 6 d |
| Built-in call recording (Jalangi idea) | 16 §18, special depth (d) | PORT | `exec/run.mjs` around `unit.call` (line 221), new `exec/transitions.mjs` | wrappers on the host prototypes record receiver identity before and after, argument and result identities and the heap delta; a checker compares every record with the table; a mismatch refuses that operation's proofs | 2 to 3 d |
| Test262 as a corpus of call patterns | 16 §17 | DEPENDENCY (clone, BSD) | new `exec/test262.mjs` | run the directories of the table's operations under node and record the transitions seen; a finite corpus validates the table, it proves nothing | 2 d |
| Unevalizer's constant-string case | 17 §7 | PORT, after a count | `lint.mjs:28`, a pass in `translate/` | `eval(<string literal>)` parsed in place, everything else refused; count the corpus first, the case may be near zero | 2 to 3 d |
| ESLint `eqeqeq` precondition | 17 §26 | PORT | `lint.mjs:806-809`, `lint/advice.mjs` | the rewrite to `===` is `proved` only when one operand is `typeof` or both are literals of one type; otherwise `migration` | 1 d |
| ESLint `prefer-rest-params` precondition | 17 §27 | PORT | `lint.mjs:236`, `advice.mjs` | rest-parameter rewrite only when every use is `arguments.length` or a literal index, in a strict module; `param-form` must admit rest parameters first | 1 to 2 d |
| ESLint `no-useless-call` precondition | 17 §28 | PORT | new lint rule | a direct call replaces `.call`/`.apply` only when the `thisArg` token equals the receiver; the lint and translator disagree on `h.call(o, 1)` today (lint admits, translator refuses) | 2 d |
| Refusal economics per rule | 17 measurement | PORT | new `harness/refusals.py` beside `score_lean.py` | per rule over the 144 corpus entries: changed functions refused by that rule alone, also refused by another, share of changed functions | 1 d |

Everything judged REFERENCE settles a design choice and takes no code (the dossiers say which choice). Everything
judged IRRELEVANT is a wrong input language, a missing or restrictive licence, a learned model, or a different
property (concurrency, probability, hardware). Licences the dossiers could not read (Hypothesis, mCRL2, SymDiff,
Koka's page, SES, Alloy 6, JPF) block any dependency until a LICENSE file is read.

## 3. Shared objects (brief 13)

**Settled.** Identity is fixed on every object that exists before the call; a bijection may relate fresh objects
only; writes through retained references are observations. A value reading is sound only under a proof that
identity cannot interfere.

**Built.** The heap core (stage 2) and whole-heap equality as the identity certificate; lane B's graph observation
and shared inputs (stage 1); the identity guard (on since 2026-10-26, the owner's call): layer 1 keeps a value proof
only where no nested write goes through an input and both sides have one readable identity skeleton that agrees;
otherwise `ASK:identity`. Measured over the 39 census roots: 34 of 53,899 units in the core; 34,655 of 53,865 units
outside it exposed; 14,559 with a readable skeleton, 3,579 of them exposed.

**Next.** Korat-style heap enumeration in lane B; the canonical-heap certificate (stage 3) so allocation order and
garbage stop mattering; the witness record carries both hashes, the serialized initial environment, the heap node
table with roots and sharing edges, the seed, the observed outcome and the replay result.

**Boundary.** `===` on objects, identity hashes, WeakMap/WeakRef and finalizers: obligation `identity observation`.

## 4. Identity-bearing built-ins (brief 16)

**Settled.** Each built-in has a transition contract (fresh result or not, receiver mutated or not, result identity,
order, callbacks, exceptions); `sort`'s comparator schedule is implementation-defined; Map and Set keys compare by
SameValueZero in insertion order; `structuredClone` builds a fresh graph preserving sharing and cycles.

**Mechanism.** A versioned table `translate/library.json`, one row per operation with the spec section, generated
into the prelude per shape; the Dafny forms exist and verify (`design/library-ops.dfy`). A callback inside `map`,
`filter`, `sort` is read only when the lint proves it pure. The engine validates the table on every run through the
call recording and the checker (`exec/transitions.mjs`): a mismatch is a model defect that refuses the operation
until the row is fixed. Test262's directories for these operations run as a corpus of call patterns (`exec/test262.mjs`, a sparse BSD checkout
under `work/lean-deps/test262`): on 2026-10-26, 996 files, 12,459 in-model records, 0 disagreements between the engine
and the table; 2,814 records out of the model (array-likes, subclasses, accessors, symbol keys, string sources), 11 callback
effects counted apart (`design/test262-report.json`). Re-run on 2026-10-27 after the table grew (sort, assign, pop as
statements; the Map cell version 2): 996 files, 11,290 in-model records, 0 disagreements, 2,817 out of the model, 11
callback effects; the count fell from 12,459 because the recorder no longer records the calls its own snapshots make
(a getter on a test's array-like calling push while the receiver is read). The re-run also found a silent loss: a vm
timeout terminates a test without running finally blocks, so the recorder's re-entrancy guard stayed down after the
first timed-out test and every later window recorded nothing; the guard now resets at every window, and lane B's
watchdog (the same termination) can no longer empty the record set of a run. The recorder and checker (`exec/transitions.mjs`) are the standing
validation, wired into lane B (2026-10-27): a recording window opens only while unit code runs (the watchdog call, an
effect, a cleanup, the await of a promise the unit returned), so the harness's own work between calls costs nothing; a
call is kept when its caller's file is one the sandbox loaded (a string stack read, re-entrancy guarded); each vm
context's own Array and Object intrinsics are patched beside the host's, since an array literal in the unit uses them.
The certificate's `bound.library` carries the records per operation, the out-of-model and callback-effect counts, and
one defect per (operation, contradiction) with its first record; `check.mjs` refuses the proof (`ASK:library-model`)
while a row is contradicted and lane B's own verdict stands. Pair `builtin_transitions` runs every generated row the lint
admits (pop and Object.assign are not admitted as statements yet); the suite also runs the unit against a deliberately
wrong table (`tests/fixtures/library-wrong.json`) and checks the refutation and the refusal. Cost measured on the finite
explorer: 0.6 s without the recorder, 0.7 s with the narrowed window (4.5 s with a window over the whole run).

**Boundary.** Getters, setters, proxies, species constructors, effectful comparators, Date string parsing and time
zones: obligations unmet; `structuredClone` of unsupported values: refused by name. `Object.freeze` needs a
`frozen` set in the heap world, a schema change, so it comes after the table.

### 4.1 Built, 2026-10-27: the array rows generated into the prelude

- `heap.mjs` reads `library.json` and instantiates, per array shape, the forms of push, unshift, pop, shift, splice,
  reverse, slice and concat (`<K>` the shape key, `<E>` the element type, `.items` the shape's own destructor), with
  the helpers `Clamp` and `Rev_<K>`; the core admits `shift()`, `reverse()` and `splice(start, count, ...items)`
  as statements and `slice(a?, b?)`, `concat(q)`, `reverse()`, `splice(...)` as expressions; the lint admits the
  three statements on an owned array as it admits push; the ordinary translation reads them as sequence rebuilds.
- Two destructor collisions fixed on the way: a record field named `items` met the array constructor's `items`,
  and two array shapes with different element types shared it; every record field is now `<name>_f` and every
  array shape has `items_<K>`.
- Pair `tests/pairs/library_ops`: flip, dropFirstCopy and count proved; head and joined refuted; dropFirst (shift
  for splice(0, 1)) and dropTwo (two splices for one) leave the same reachable graph but a different heap, since
  splice allocates the removed part: unproved under whole-heap equality, PASS-bounded in lane B. They are the
  first concrete cases for the canonical-heap certificate of section 3.
- Not yet from the table: sort (its comparator), map and filter (a lambda in the core emitter), Map and Set cells
  (new shape kinds), Object.assign, and the three drafts (freeze, structuredClone, Date).

### 4.2 Built, 2026-10-27: Map and Set cells, map and filter

- Shapes `M_<k>_<v>` (a Map cell: an insertion-ordered entry list, primitive keys) and `S_<e>` (a Set cell of
  primitives) join the heap; the prelude instantiates the table's MapSet_, MapGet_, MapHas_, MapDelete_, SetAdd_,
  SetHas_, SetDelete_ with their helpers (SetEntry_, Lookup_, RemoveKey_, RemoveItem_), plus MapSize_ and SetSize_;
  `new Map()` and `new Set()` allocate an empty cell. The core admits `set`, `add`, `delete` as statements, `has`
  and `size` as expressions; `get` stays out (its Option result needs the nullish reading of the ordinary lane).
- `map` and `filter` with a one-parameter pure arrow (an expression body, no allocation inside) are the table's
  Map_<K>_<K2> and Filter_<K> (Keep_<K>); each map instance is generated for its (source, result) shape pair.
- Pair `tests/pairs/library_cells`: a renamed callback parameter proved; a changed filter bound and a skipped delete
  refuted (the delete only by lane A: lane B's generated keys never meet a generated entry, a generator gap); three
  idempotent double writes (set twice, add twice) were unproved on 2026-10-27 morning: the second write was a no-op
  update of the heap map and the prover did not reach `m[r := m[r]] == m` without a lemma body, which theorem.py never
  writes; a fuel attribute did not reach it either. Solved the same day, two ways at once (version 2 of the table):
  the Map cell is its insertion-ordered key list beside a Dafny map (`M_<K>(keys, m)`), so `set` is a map update and
  `has`, `get`, `size` read the map and the key list; and every write that changes nothing (a key already holding the
  value, a member already present, an absent key or member deleted) returns the world itself, so a repeated write is
  the same term and proves without map or sequence extensionality. tally, remember and freshMap of `library_cells`
  prove; the entry list and its `SetEntry_`/`Lookup_` helpers are gone from the table.
- Still out of the table: sort (its comparator), Object.assign (the lint's assign-target refusal stands until the
  ordinary lane also writes the target), the drafts (freeze, structuredClone, Date).

### 4.3 Built, 2026-10-27: Object.assign and sort

- `Object.assign(t, s)` as a statement: the lint lifts `assign-target` when the target is a plain record the function
  owns or was handed (no accessor, no method) and every source's declared fields are fields of the target; the
  ordinary lane rebuilds the target with every declared field of each source in order (`t.(x := s.x, y := s.y)`) and a
  parameter target becomes an output beside the result; the heap core reads the statement as the table's `Assign_<K>`
  on two cells of one shape. The value form, a target of another shape, or a source with an extra field stay refused.
- `xs.sort((a, b) => …)` as a statement: the lint admits one comparator, an arrow of two parameters checked pure; the
  ordinary lane reads a stable reorder of `xs` by an uninterpreted sort keyed by the element type and the comparator
  (the expression form's function); the heap core reads the table's `SortPure_<K>` with the comparator as
  `(a, b) => cmp(a, b) < 0`. The default order (strings) is refused by name. The table's form is a bodiless function,
  no `{:extern}`: the theorem refuses that attribute anywhere a proof can see.
- Pair `tests/pairs/library_assign_sort`: merged (the target returned through an alias taken after the write) proved;
  swapped (sources swapped) refuted and witnessed; sortedCopy (`slice(0)` for `slice()`, the same comparator) proved;
  sortedDesc (the comparator reversed) unproved and witnessed; sortedInPlace proved. The lint's advice names both
  statement forms.

### 4.4 Built, 2026-10-27: pop, structuredClone, the Date cell; freeze refused

- `xs.pop()` as a statement joins shift, reverse, splice and sort: the lint admits it on an owned array, the ordinary
  lane drops the last element of the sequence, the heap core reads the table's `Pop_<K>`.
- `structuredClone(v)`: the ordinary lane takes the copy as the value itself (a copy of a value is the value); the heap
  core allocates a fresh cell with the source's own contents for a flat record, an array, Set or Map of primitives, or a
  Date; a nested graph is refused by name until the canonical-heap certificate. A checkout read without its project
  gets the declaration from `langs/ts/ambient.d.ts` (the default lib lacks it).
- The Date cell `D(tv)`: `new Date(n)` with one time value allocates it; `getTime`, `valueOf` read it; each UTC getter
  is a bodiless function of the time value. A setter stays out of the core. In the ordinary lane a Date is an opaque
  handle whose state lives in the world since the clock-read lane: a setter and a getter are world transitions in order,
  so a setter needs no refusal and no rebinding, and finding 2 of section 0 (the setter leaving the Date unchanged in the
  model) is closed by that lane, not by a rule. The `date-mutation` rule and its escape fixture are retired; a first cut
  that rebound the Date and made a parameter an output was taken out the same night (a setter used as a value would then
  have read the old handle, an incompleteness with no gain). `new Date()` (the clock) and a string argument (parsing) stay
  where they were.
- `Object.freeze`, `seal`, `preventExtensions` are refused by name (rule `freeze`): in strict code a write to a frozen
  object throws, the value reading has no fault channel for it, and a frozen set with silent no-op writes would prove a
  throwing candidate equal to one that writes nothing. The table's row says so; the fault channel is the condition.
- Pair `tests/pairs/library_more`: dropLast (pop twice) refuted and witnessed; dropLastCopy proved; cloned (a clone
  against a literal with the same fields) proved; clonedAlias (the input returned) refuted and witnessed on the graph;
  stampYear proved; bump (the same setter, the time read through a local) proved; bumpOff (y + 1) refuted and witnessed.
- Found on the way: lane B's graph observer read an object literal written inside the sandbox as `instance:Object`
  (the vm context's own `Object.prototype`) and a host-made object (a clone, a parse) as a record, a false WITNESS
  class; a plain prototype of any realm is now a record.

## 5. State over time (brief 14)

**Settled.** A one-step proof over the complete state composes by induction; the hole is a cell omitted, reset or
read without its meaning. Retained-state command sequences find real sequence bugs and prove nothing when clean.

**Mechanism.** The state-completeness audit lists every persistent cell per component and writes the obligation to
the certificate; the retained-state runner keeps the ledger between commands and shrinks a failing program; the
finite-state lane decides equality when every cell and argument is a finite declared domain (PASS-decided, with
the reachable pair count as the certificate). Couplings between two representations (an eager and a lazy cache)
stay ASK; one is written by hand when a case justifies it.

**Boundary.** Unbounded hidden state, a coupling, a closure escaping the component.

## 6. Exported control (brief 15)

**Settled.** A function value is a code identity plus a captured environment plus an invocation transition; the
environment may retain and invoke it later, repeatedly; the witness is an environment program; bounds exhausted
are ASK.

**Mechanism.** `Fn(code, env)` in the prelude replaces the text-keyed opaque value; the program runner (fast-check
commands, vendored) with the command set and a seeded schedule; the virtual clock; promise settlement and event
firing as commands with enabling rules; the certificate records the program, its hash, the seed, both observations,
the first difference and the replay path. Pilot: the 262 return/store/compare cases of our census.

**Boundary.** Function identity (`f === g`), `Function.prototype.toString`, `bind` observed through construction,
transform-stream orderings: obligation unmet.

## 7. Dynamic features (brief 17)

**Settled.** No feature has an impossibility theorem; what fails is the closed-record, named-call abstraction; an
explicit operand admits more; a rewrite needs its own precondition and label.

**Mechanism.** Explicit operands as ledger components (receiver, argument vector, `proto` field, dictionary cells,
the coercion table); refusals by name for `Proxy`, `Reflect` traps, `eval`, `new Function`, `setPrototypeOf` after
escape, and (finding 3) the `Object` prototype functions; rewrites labelled `proved` / `conditional` / `migration`
with the ESLint preconditions where ESLint has one and a stricter one where it has none; the refusal-economics
script over the corpus's changed functions.

## 10. Front-end (briefs 18 and 19)

Sources: the three results read in full on 2026-10-26 (two on brief 18: 49 and 65 items; one on brief 19: 58
items), judged element by element in `research-elements/18-front-end.md` and `19-interface-equality.md`.
Verdict counts over the 172 items: PORT 12, DEPENDENCY 4 (two distinct: React-tRace, fast-check), REFERENCE 49,
IRRELEVANT 107. The 107 are the browser layers (DOM, computed style, layout, pixels, accessibility tree), the
raster metrics and datasets, the trained models, the dead builds and the fields with no display in them.

**The one finding all three share:** there is no single "same" for a screen. Equality is `Same(L, E, S)`: at a
layer L, in an environment E, over an admitted set S of inputs, states, events and schedules. PASS needs a
proof over a named model or a complete exploration of a finite state space; a bounded run is never PASS;
WITNESS carries the shortest replayable sequence and the first differing layer; ASK is a bound hit; REFUSE
names the unsupported construct.

**What lean holds today** (measured, not claimed): lane A reads a render as the tree `JsxNode`
(`translate.mjs:534`), handlers as descriptors or opaque values (`:2049`, `:2112`), `useMemo`/`useCallback`
exact under coverage (`react.mjs:63`); lane B mounts one render with fake hooks (`run.mjs:73-93`), runs the
effects once (`:239`) and invokes each handler once (`:96`). The three results call this the right first layer
and say: keep it, label it "tree, one render". The census holds 2,041 `.tsx` files against 9,955 `.ts`
(measured 2026-10-26); brief 18 counted 2,585 hook calls and 1,560 handler attributes.

### 10.1 The layer lean decides, and the layers it never will

| Layer | lean | Why |
|---|---|---|
| element tree | decided today (one render); proved or decided over sequences after 10.2 | a value, no browser |
| effect and setter trace | observed today; ordered queue after 10.2 | lane B records it |
| pending work and schedule | observed; a named class after the clock row | the HTML event loop fixes task-source order and the microtask drain; paint cadence is the browser's |
| committed DOM | out | needs a DOM; a tree WITNESS is stronger for markup changes |
| computed styles, layout | out | needs a browser and a stylesheet model; a class name change is a tree WITNESS, its visual effect unjudged |
| pixels | out | needs a pinned browser, fonts and a threshold; a threshold is not transitive; no proof exists anywhere |
| accessibility tree | out unless asked | a computed projection from the tree (Core-AAM) is possible as an opt-in weaker layer; it is Cue's addition and waits for the owner |

### 10.2 The mechanism: a component is a Mealy machine on the ledger

- **State** = the hook slots (one cell per `useState`, keyed by call order; a `useRef` cell), plus the props.
- **Input** = a command: `set(slot, value)` through a captured setter, `fire(handler, event)`, `settle`
  (drain microtasks, run the effects whose deps changed by `Object.is`, cleanup first, layout effects before
  passive), `unmount` (every cleanup), `tick` (the virtual clock).
- **Output** = the tree and the trace after each command.
- **Lane B** runs command sequences with retained slots (the retained-state runner of section 5 gains these
  commands); after every command it re-renders and compares the tree and the trace; a divergence is a
  WITNESS with the command sequence; a clean run is PASS-bounded with the sequence count and depth.
- **Lane B, finite**: when every slot type and every prop is finite by the types (boolean, literal union, enum,
  null or undefined), the product of the two machines is explored fully (the finite-state lane of section 5):
  PASS-decided with the pair count; the shortest separating sequence as WITNESS. Census (2026-10-26,
  `design/finite-components-census.mjs`, imports unresolved): 5,138 JSX-returning units in 4,630 `.tsx` files;
  1,037 use `useState`; 265 of those (26%) have every slot finite (boolean, literal union, enum, nullish);
  98 (9%) are finite in slots and props strictly, 100 (10%) with function and node props as opaque inputs;
  2,190 prop types are unknown without the imports, so the true share lies between 10% and 26%. Slots:
  boolean 770, string 805, number 258, array 240, literal union 119, unknown 360.
- **Lane A** proves the step: equal props and slots give an equal tree and equal handler descriptors; the
  descriptors' deferred `set` steps are the slot transition, so equal descriptors give equal next slots;
  induction over the sequence is the bisimulation certificate (dossier 19, items 02 and 03). The slots are
  cells of the ledger (`heap.mjs` shapes), the setter a `Set_` on a slot, the re-render a call of the render
  unit on the new slots; one lemma per unit, as the heap core.
- **Semantics source**: React-tRace's 44 rules (MIT) fix setter-during-render, effect timing and cleanup; its
  38 tests run against lane B's fake runtime in `exec/react-trace.mjs`, as Test262 validates the library
  table. The repository is opened at that row; if its tests are not JavaScript, the 18 scenarios are ported
  by hand and the port is said.

### 10.2b Built, 2026-10-27: the three-rung certificate

- Rung 1, lane A over hook slots (`translate.mjs`, hook_slots pair): a proof for every state when the handlers are
  readable descriptors. Rung 2, `exec/finite.mjs`: a component whose slots and props are finite by their types is
  explored over every click order from every prop assignment, effects and timers inside each step; PASS-decided with
  the state pairs. Rung 3, the sequence runner in `run.mjs`: bounded. `check.mjs` reports the strongest rung that
  holds: PASS-proved, PASS-decided, PASS-bounded. Purity (the double render) gates every rung.
- Setter calls inside one handler are React's batching, not an observation: lane B records the slots a handler
  leaves, never the order of its sets.

### 10.3 The checks lean adds without a browser

- **Layer in the certificate**: `check.mjs:29` and `run.mjs:303` carry `observation: {layer: 'tree', renders:
  'one' | 'sequence(k)' | 'all-finite', effects: 'ordered', schedule: 'sync commits, microtasks per command,
  timers by virtual clock'}`. Today's PASS on a component is "tree, one render" and says so.
- **Purity, two ways**: the lint refuses `hook-order` (a hook call under a branch, loop, nested function or
  after an early return) and `render-impure` (a write to an outer, captured or module variable during render,
  outside handlers and effects); lane B renders each side twice from the same slots and a differing tree or
  trace is REFUSE `render-impure` with both renders (Strict Mode's rule, run by lean alone).
- **Suspense**: a thenable thrown during render, or `use()` from react, ends the run as `ASK:suspense`.
- **Keys**: keys are props and are compared; a child component is a name in the tree and is never rendered
  (its state is its own unit's), so instance retention across re-renders is out of the unit's scope. Stated
  in the certificate's layer line.
- **Effects as an ordered queue**: deps compared by `Object.is`, cleanup before re-run and on unmount,
  `useLayoutEffect` before `useEffect`; a differing effect trace over a sequence is a WITNESS at the effect
  layer.
- **Schedule class**: the clock row (section 6) gains animation frames and idle callbacks as timer kinds and a
  microtask checkpoint after each command; anything outside the class is ASK.
- **Class components**: counted in the corpus first (`extends Component`); a lifecycle machine in the fake
  runtime only if the count earns it.

### 10.4 What cannot be done, by theorem or by setting

- Styles, layout, pixels, the accessibility tree: a browser, a pinned environment and a threshold; no proof
  exists in any field read; out of lean.
- Unbounded slot types (a string or number in `useState`): PASS-bounded only; equality over all sequences is
  undecidable in general (Rice), so only the finite case is decided.
- Concurrent-mode interruption and retry: an implementation detail; lean compares commits only.
- Hydration, server components, streaming: no server in the sandbox.
- A catch rate: no dataset of React component regressions exists; lean's measure is its own corpus, and the
  count of front-end defects among the 43 is still to be taken.

## 8. Order of work

1. The four findings of section 0 (lint refusals; the cleared-timer gap with the clock). Days: 1 plus the clock.
2. The library table with engine validation and the Test262 corpus (sections 2 and 4). Days: 10 to 11.
3. The retained-state runner, the audit, the finite-state lane (section 5). Days: 17.
4. The program runner on fast-check, the virtual clock, callable records (section 6). Days: 21 to 32.
5. Explicit operands and labelled rewrites, the refusal-economics script (section 7). Days: 7 to 9.
6. Korat enumeration and the canonical-heap certificate (section 3). Days: 8.
7. Front-end (section 10): the layer line in the certificate, the purity refusals, the suspense ASK and the
   two censuses (finite slot types, class components) now, days 4; the hook-slot runtime with re-render
   sequences and the React-tRace corpus beside step 3, days 5; finite components inside the finite-state lane
   of step 3, days 3; lane A's slot lemma after the runtime proves useful, days 6.

Each step carries its validating measurement: the named pairs, the bench domains, the corpus re-measure. Days are
CLAIM from the dossiers.

## 9. What stays out

No model anywhere in lean (owner, 2026-10-26, Jev retracted): no learned invariants, no model-proposed couplings,
no learned perceptual metric. No JVM, OCaml, Coq, Haskell or .NET dependency (ESMeta, Hobbit, JSCert, TorXakis,
Coyote are references). No bisimulation up-to engine in this cycle. No conformance suite as a proof: Test262 is a
corpus for validation only. No browser layer (DOM, styles, layout, pixels, accessibility tree): lean decides
the tree, the effect trace and the schedule class, and names that layer in every front-end verdict
(section 10); an accessibility projection waits for the owner's ask.
