# Integrating the five research results into lean

Design note, 2026-10-26, second version. Sources: the five deep-research results on briefs 13 to 17 (shared
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
effects counted apart (`design/test262-report.json`). The recorder and checker (`exec/transitions.mjs`) are the standing
validation; their wiring around `unit.call` in lane B follows the heap merge.

**Boundary.** Getters, setters, proxies, species constructors, effectful comparators, Date string parsing and time
zones: obligations unmet; `structuredClone` of unsupported values: refused by name. `Object.freeze` needs a
`frozen` set in the heap world, a schema change, so it comes after the table.

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

## 8. Order of work

1. The four findings of section 0 (lint refusals; the cleared-timer gap with the clock). Days: 1 plus the clock.
2. The library table with engine validation and the Test262 corpus (sections 2 and 4). Days: 10 to 11.
3. The retained-state runner, the audit, the finite-state lane (section 5). Days: 17.
4. The program runner on fast-check, the virtual clock, callable records (section 6). Days: 21 to 32.
5. Explicit operands and labelled rewrites, the refusal-economics script (section 7). Days: 7 to 9.
6. Korat enumeration and the canonical-heap certificate (section 3). Days: 8.

Each step carries its validating measurement: the named pairs, the bench domains, the corpus re-measure. Days are
CLAIM from the dossiers.

## 9. What stays out

No model anywhere in lean (owner, 2026-10-26, Jev retracted): no learned invariants, no model-proposed couplings,
no learned perceptual metric. No JVM, OCaml, Coq, Haskell or .NET dependency (ESMeta, Hobbit, JSCert, TorXakis,
Coyote are references). No bisimulation up-to engine in this cycle. No conformance suite as a proof: Test262 is a
corpus for validation only.
