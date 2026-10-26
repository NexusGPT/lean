# 16. Identity-bearing built-ins: what lean takes from each named system

Input: the research result "Identity-Aware Semantics for Sound Change Checking" (35 systems, one operation table).
Every entry below was checked against a primary artifact opened in this session, unless marked UNVERIFIED or CLAIM.
Dates are the last push shown by the GitHub API, not a release date.

## Summary

| # | Name | Verdict | Where in lean | One-line how |
|---|---|---|---|---|
| 1 | ECMA-262 algorithms | REFERENCE | heap.mjs:251-263 (transition contracts) | Source of each library transition; steps read in this session |
| 2 | HTML structured clone | REFERENCE | run.mjs:110-126 (no clone model yet) | Clone rules and DataCloneError for a refused-value list |
| 3 | JSCert | IRRELEVANT | none | ES5 Coq interpreter; no Map, Set, Date |
| 4 | JSRef | IRRELEVANT | none | Moved into the JSExplain repository; ES5 |
| 5 | KJS | IRRELEVANT | none | ES5.1 core; no licence on its repository |
| 6 | S5 | IRRELEVANT | none | ES5 strict; Date and RegExp only partial |
| 7 | LambdaJS | REFERENCE | heap.mjs:1-30 (heap design) | Location store and prototype lookup as a model for HWorld |
| 8 | JSExplain | IRRELEVANT | none | ES5 reference interpreter, unmaintained |
| 9 | JaVerT | REFERENCE | none | JSIL heap model; tool repository not located |
| 10 | JaVerT 2.0 | REFERENCE | none | Same as 9; ES5 strict fragment |
| 11 | Gillian-JS | REFERENCE | none | Heap symbolic execution; axioms for built-ins |
| 12 | JISET | IRRELEVANT | none | No licence; superseded by ESMeta |
| 13 | ESMeta | REFERENCE | lane B oracle candidate (run.mjs:221) | Executable spec; JVM, outside the node or python constraint |
| 14 | MiniPoly | REFERENCE | none | Extracted built-in rewrites; artifact not opened |
| 15 | JEST | REFERENCE | run.mjs:251-292 (differential run) | Differential testing design; lane B already does it |
| 16 | JSTAR | IRRELEVANT | none | Spec-text type analysis; not runtime |
| 17 | Test262 | DEPENDENCY | new: langs/ts/exec/test262.mjs (to write) | Corpus of call patterns run under node |
| 18 | Jalangi | PORT | run.mjs:110-126 and 221 | Realm-level call recording, written in lean |
| 19 | Why3 arrays | REFERENCE | heap.mjs:251-258 (Push_, Pop_) | Mutable array contract with bounds |
| 20 | Why3 hashtables | IRRELEVANT | none | No insertion order; not JavaScript Map |
| 21 | Dafny sequences and arrays | DEPENDENCY | check.mjs:58 (`dafny verify`) | Already the proof backend; version 4.11.0 |
| 22 | Lean Std.HashMap | IRRELEVANT | none | Map order and key rules differ; Dafny is the backend |
| 23 | Lean DHashMap.Raw | IRRELEVANT | none | Same as 22 |
| 24 | Isabelle imperative refinement | REFERENCE | none | Refinement pattern for a verified map |
| 25 | VerCors | IRRELEVANT | none | Java, C, OpenCL; no JavaScript |
| 26 | KeY TimSort | IRRELEVANT | none | One Java sort; GPL-2.0 |
| 27 | SMT sequence theories | REFERENCE | heap.mjs:251-258 (seq<E> fields) | Sequence theory settles the content model |
| 28 | Z3 sequences | DEPENDENCY | the solver Dafny calls | Installed at /opt/homebrew/bin/z3 |
| 29 | cvc5 sequences | REFERENCE | none | Second solver for cross-checking; not installed |
| 30 | SeCo sequence decidability | IRRELEVANT | none | Decidability fragments; Dafny does not need them |
| 31 | NSeq | IRRELEVANT | none | Slice and update theory; artifact not opened |
| 32 | Temporal | IRRELEVANT | none | New immutable API; does not model legacy Date |
| 33 | CFML | IRRELEVANT | none | OCaml and Coq separation logic |
| 34 | Liquid Haskell | IRRELEVANT | none | Haskell refinement types |
| 35 | ACL2 stobjs | REFERENCE | heap.mjs:1-30 (threaded world) | Single-threaded object as a model for HWorld threading |

Counts: DEPENDENCY 3 (items 17, 21, 28). PORT 1 (item 18). REFERENCE 14. IRRELEVANT 17.

## Corrections to the research result

- **setFullYear on an invalid Date does not return NaN.** The ECMA-262 step sets the time value to +0 when it is NaN (21.4.4.21). Node 24.18 gave `new Date(NaN).setFullYear(2020)` = 1577833200000 (local zone UTC+1). The research table is wrong on this row.
- **JEST's 27 are specification bugs, not engine bugs.** The JEST paper says 44 engine bugs in four engines and 27 specification bugs in ES11 (ES2020). The research says "27 for ES2020" under engine bugs.
- **The 8,797 JaVerT figure belongs to both papers.** The 2018 JaVerT paper and the JaVerT 2.0 paper each report 8,797 applicable tests passing. The 2.0 paper gives 8,797 of 10,469 ES5 Strict tests.
- **Map keys use SameValue after -0 canonicalisation.** Map.set and Set.add call CanonicalizeKeyedCollectionKey, which maps -0 to +0 (24.5.1), then SameValue. Node confirms `Object.is(key, -0)` is false after `set(-0)`. This equals SameValueZero, the research's term.
- **The lint accepts Object.assign on a parameter.** This is a soundness gap, detailed under "Lean finding" below.

## Lean finding: Object.assign and Date setters pass lint

Probes run in this session:

| Probe | lint exit | translate exit | Result |
|---|---|---|---|
| `Object.assign(p, {a: n})` as a statement, on a parameter | 0 | 1 | refused by translate ("statement expression is not translated") |
| `const q = Object.assign(p, {a: n}); return q.a + p.a;` | 0 | 0 | translated; `ext_call_args_Object_assign(p, ...)` returns a fresh record; p is never updated in the model |
| `d.setFullYear(2020)` as an expression, on a Date parameter | 0 | 0 | translated as an effectful external; the Date is not updated in the model |
| in-place `sort`, `reverse` or `push` on a parameter (statement or value form) | 1 | 1 | refused, rule `param-mutation` |
| `m.set(k, 1)` as a value | 0 | 1 | translate refuses; lint does not |

Cause, from the source:

- translate.mjs:170 puts `Object` and `Date` in `PURE_RECEIVERS` or `PURE_CTORS`. Object.assign mutates its first argument, so calling it "pure" is wrong.
- translate.mjs:206 and 2588 use the same set to skip the effect check for `Object.*` calls.
- lint.mjs:30 lists `Object`, `Date` and `structuredClone` in `EFFECT_WORLD`, yet the lint accepted the probe. The exact path that lets the call through was not traced.

Lane B caught both probe pairs with a WITNESS, so the wrong verdict is not reached on those inputs:

- Object.assign pair (parent mutates p, candidate copies): WITNESS, the anchor record's field `a` is 0 in the parent and 420 in the candidate (`check.mjs` on scratchpad pairs/oa).
- Date pair (setFullYear 2020 vs 2021, then getTime): WITNESS, outcome 1606012480083 vs 1637548480083 (scratchpad pairs/date).

Lane A's own verdict on these pairs was not produced, since a lane B WITNESS ends the question first (check.mjs:34). A false PASS-proved for a pair that differs only in a parameter's mutation is a CLAIM from the model: the external returns a value and does not change p.

## Per-item notes

### 1. ECMA-262 algorithms
- **What it is:** the normative algorithms. Opened tc39.es/ecma262/multipage pages: indexed-collections, keyed-collections, fundamental-objects, numbers-and-dates (edition: ECMAScript 2027). Repository tc39/ecma262, last push 2026-10-26. Licence: the repository reports NOASSERTION, the spec's own licence statement not read (UNVERIFIED).
- **Mechanism:** each built-in is a step list over internal slots. Set and Get calls carry a throw flag, so a failed write aborts the call after earlier writes. Sort uses an implementation-defined sequence of comparator calls.
- **Lean today:** translate.mjs:2801-2810 maps slice, concat, sort, reverse to externals or helpers. lint.mjs:35 and 144 list the mutators. lint.mjs:940-942 refuses in-place sort and reverse on a parameter.
- **Verdict:** REFERENCE (the contract for every transition in item 2 of the special depth).
- **How:** each library row cites its section id. Section steps read in this session are in the special-depth table.
- **Open questions:** the spec licence text; whether ECMAScript 2027 differs from the engine version lane B runs (Node 24.18).

### 2. HTML structured clone algorithm
- **What it is:** whatwg/html, licence CC BY 4.0 (LICENSE read). Opened html.spec.whatwg.org/multipage/structured-data.html. Repository last push 2026-10-26.
- **Mechanism:** StructuredSerializeInternal (2.7.4) keeps a memory map, so cycles and shared references are preserved in the copy. A Symbol throws DataCloneError. Date keeps [[DateValue]]. A SharedArrayBuffer outside a cross-origin isolated context throws.
- **Lean today:** none. run.mjs:110-126 gives `structuredClone` to user code as a host global in the vm context. The lint lists it in EFFECT_WORLD (lint.mjs:30).
- **Verdict:** REFERENCE.
- **How:** a refused-value list (functions, symbols, DOM nodes) names the missing obligation as REFUSE. Acyclic plain records clone as fresh allocations (`AllocPt`, special depth).
- **Open questions:** cloned Map keys are cloned too (node probe: `structuredClone(new Map([[k,1]])).keys()[0] === k` is false), so key identity is lost. The model must match.

### 3. JSCert
- **What it is:** github.com/jscert/jscert, last push 2024-02-05, Coq. LICENSE header: Imperial College London and INRIA, 2012-2015. Licence name not read (UNVERIFIED).
- **Mechanism:** a Coq ES5 semantics with a verified reference interpreter.
- **Lean today:** none.
- **Verdict:** IRRELEVANT (ES5, Coq, no Map, Set or Date).
- **How:** not used.
- **Open questions:** none for lean.

### 4. JSRef
- **What it is:** the README in jscert/jscert (jsjsref.README) says it "has been moved to github.com/jscert/jsexplain". Read.
- **Mechanism:** the executable companion to JSCert.
- **Lean today:** none.
- **Verdict:** IRRELEVANT.
- **How:** not used. Item 8 is the live repository.

### 5. KJS
- **What it is:** the paper (fsl.cs.illinois.edu PDF, opened). Its repository kframework/javascript-semantics has no licence in the API and was last pushed 2016-10-13.
- **Mechanism:** a K-framework ES5.1 interpreter.
- **Lean today:** none.
- **Verdict:** IRRELEVANT. The paper's numbers were checked: 2,782 core tests passed, 11,578 total Test262 programs. The paper's runtime sentence is garbled in extraction, so the "about an hour" figure is UNVERIFIED.
- **How:** not used. No licence, so it cannot be a dependency.

### 6. S5
- **What it is:** brownplt/LambdaS5, BSD-3-Clause, last push 2015-10-28. Paper s5.pdf opened.
- **Mechanism:** strict ES5 interpreter with a desugaring of getters and setters.
- **Lean today:** none.
- **Verdict:** IRRELEVANT. Paper totals verified: 8157 of 11606 (70%), 637 of 646 strict (98%). The Date and RegExp "60%" figure was not checked.
- **How:** not used.

### 7. LambdaJS
- **What it is:** brownplt/LambdaJS, archived 2022-02-27. LICENSE (Brown University, 2009-2012, BSD-style text) read. The README points to Coq and Redex semantics.
- **Mechanism:** a small reduction semantics with a store of locations, mutable objects and prototype lookup.
- **Lean today:** heap.mjs:1-30 is the same idea in Dafny: a Ref maps to an Obj in one heap.
- **Verdict:** REFERENCE (heap design only).
- **How:** the heap model is already in lean. LambdaJS confirms that prototype lookup and constructors must be in the heap, not in a value.
- **Open questions:** LambdaJS has no Map, Set or Date rules.

### 8. JSExplain
- **What it is:** jscert/jsexplain, Apache-2.0, last push 2022-07-18. README (read): "not maintained anymore", moved to gitlab.inria.fr/star-explain.
- **Mechanism:** an ES5 reference interpreter with a double debugger.
- **Lean today:** none.
- **Verdict:** IRRELEVANT.
- **How:** not used.

### 9. JaVerT
- **What it is:** the 2018 paper, vtss.doc.ic.ac.uk/publications/FragosoSantos2018JaVerT.pdf (opened). The tool repository was not located (a guessed organisation URL returned 404). Licence UNVERIFIED.
- **Mechanism:** JavaScript compiled to JSIL with explicit locations, property maps and prototypes.
- **Lean today:** none.
- **Verdict:** REFERENCE.
- **How:** heap layout reference. Its "8,797 passing" figure is in this paper (verified in text).
- **Open questions:** the tool itself, and whether it runs under node.

### 10. JaVerT 2.0
- **What it is:** the 2019 paper, FragosoSantos2019JaVerT.pdf (opened). Tool repository not located.
- **Mechanism:** compositional symbolic execution over JSIL, ES5 strict.
- **Lean today:** none.
- **Verdict:** REFERENCE.
- **How:** the 8,797 of 10,469 ES5 Strict figure is verified in this paper. Date and JSON are not implemented in it.
- **Open questions:** as item 9.

### 11. Gillian-JS
- **What it is:** GillianPlatform/Gillian, BSD-3-Clause, last push 2026-10-25. Gillian-JS is a directory in it (confirmed in the file list). The README was not read beyond its title.
- **Mechanism:** heap symbolic execution.
- **Lean today:** none.
- **Verdict:** REFERENCE.
- **How:** axioms for `Object.freeze` and `Array.map` as the model's form of built-in summaries. The research's "three person-months, 45 seconds" claim is UNVERIFIED (the paper was not opened).
- **Open questions:** OCaml toolchain needed; not runnable under node or python in lean.

### 12. JISET
- **What it is:** kaist-plrg/jiset, no licence (API), last push 2023-01-07. README (read): "no longer maintained", use ESMeta.
- **Mechanism:** extracts an executable spec from ECMAScript.
- **Lean today:** none.
- **Verdict:** IRRELEVANT (no licence; superseded by item 13).
- **How:** not used.

### 13. ESMeta
- **What it is:** es-meta/esmeta, BSD-3-Clause, last push 2026-10-23. README (read): written in Scala, needs JDK 17+ and sbt; `execute` runs an ECMAScript program. The README shows "31,537 available tests".
- **Mechanism:** extracts the ECMAScript algorithms and executes them in its own interpreter.
- **Lean today:** not used. The candidate hook is lane B's `unit.call(args)` at run.mjs:221.
- **Verdict:** REFERENCE. As an oracle it would be a JVM process, outside the node or python requirement. sbt is not installed here. Java is at /usr/bin/java.
- **How:** see special depth (b).
- **Open questions:** whether the owner accepts a JVM oracle outside the proof lane.

### 14. MiniPoly
- **What it is:** DOI 10.1145/3832783.3837549. Both the DOI and the ACM page returned a Cloudflare challenge. Artifact licence (CC BY 4.0, per the research) UNVERIFIED.
- **Mechanism (CLAIM, from the research):** extracts built-in rewrites from the specification.
- **Lean today:** none.
- **Verdict:** REFERENCE.
- **How:** a source of polyfill-level rewrites. Not checked against any primary text.
- **Open questions:** the paper text and artifact.

### 15. JEST
- **What it is:** arXiv 2102.07498 (PDF opened). The ECMA paper "JavaScript Language Design and Implementation in Tandem" (opened) also discusses JEST and JSTAR.
- **Mechanism:** N+1-version differential testing over engines and the specification.
- **Lean today:** run.mjs:251-292 runs parent and candidate on the same seeded inputs and compares observations.
- **Verdict:** REFERENCE. Lane B already does the same thing.
- **How:** the differential idea is the lane B pattern. The validation of the transition table (item 2 of the research's design) is the new use.
- **Open questions:** the paper reports 44 engine bugs and 27 specification bugs (ES11).

### 16. JSTAR
- **What it is:** described in the ECMA "JavaScript Language Design and Implementation in Tandem" PDF (opened). Repository not opened.
- **Mechanism:** static analysis of type-related sentences in the specification text. The paper says "detected 93 type-related specification bugs".
- **Lean today:** none.
- **Verdict:** IRRELEVANT (spec text, not runtime behaviour).
- **How:** not used.

### 17. Test262
- **What it is:** tc39/test262, licence "BSD License" (LICENSE read), last push 2026-10-19. Its test/harness directory has 116 entries (listing; assert.js by name not confirmed).
- **Mechanism:** conformance tests written as JavaScript, with frontmatter and harness includes.
- **Lean today:** none.
- **Verdict:** DEPENDENCY. The corpus is cloned and run under node by a runner lean would write.
- **How:** see special depth (c). Cost: 2 days, CLAIM. Validating measurement: the directory counts in special depth (c), run under node; the first pass is the Array push and splice directories.
- **Open questions:** a finite test set does not prove equivalence (the research says so, and it is correct).

### 18. Jalangi
- **What it is:** Samsung/jalangi2, Apache-2.0, last push 2026-01-10. Repository description read; the documentation not opened.
- **Mechanism (CLAIM from the research): instruments JavaScript to collect runtime observations.
- **Lean today:** run.mjs:110-126 builds the vm sandbox, and run.mjs:221 makes the call. Lane B has no per-call recording of built-ins.
- **Verdict:** PORT. Lean does not depend on Jalangi, but the idea of recording each built-in call is written in lean.
- **How:** see special depth (d). Cost: 2-3 days, CLAIM. Validation: a new pair directory `langs/ts/tests/pairs/builtin_transitions/` with sort, splice and Object.assign cases.
- **Open questions:** the instrumented call must not change what the program sees.

### 19. Why3 mutable arrays
- **What it is:** why3.org/stdlib/array.html (opened; the page header names why3doc 1.9.0). Licence not read (UNVERIFIED).
- **Mechanism:** a mutable element map with a length and contracts on writes and bounds.
- **Lean today:** heap.mjs:251-258 (Push_, Pop_, Unshift_) has the same write-or-leave-unchanged shape.
- **Verdict:** REFERENCE.
- **How:** contract style for the transitions. A bad reference leaves the heap unchanged, as heap.mjs already does.
- **Open questions:** spec differs from JavaScript when a call on a non-object throws TypeError; the total model returns the heap unchanged. Lane A needs an explicit refusal for that case.

### 20. Why3 hashtables
- **What it is:** why3.org/stdlib/hashtbl.html (opened).
- **Mechanism:** a key-to-stack map with add, remove and replace.
- **Lean today:** none.
- **Verdict:** IRRELEVANT. No insertion order, and no JavaScript key rules.
- **How:** not used.

### 21. Dafny sequences and arrays
- **What it is:** dafny-lang/dafny, licence "MIT License" (LICENSE.txt read), last push 2026-10-25. Installed binary at /opt/homebrew/bin/dafny, version 4.11.0 (`dafny --version`).
- **Mechanism:** seq and map types, arrays with frames.
- **Lean today:** check.mjs:58 runs `dafny verify`. heap.mjs writes `map<Ref, Obj>` and `seq<E>`.
- **Verdict:** DEPENDENCY (already in use).
- **How:** the transitions in special depth (a) were verified with this binary: 23 verified, 0 errors.
- **Open questions:** Dafny printed model-parse warnings during an earlier failing run; the final run reported 23 verified, 0 errors.

### 22. Lean Std.HashMap
- **What it is:** leanprover/lean4, Apache-2.0, last push 2026-10-26. The file src/Std/Data/HashMap/Basic.lean exists (API).
- **Mechanism:** bucketed hash map with key equality and hash.
- **Lean today:** none (lean here means this repository, not the Lean prover).
- **Verdict:** IRRELEVANT. JavaScript Map needs insertion order and object-key identity, which a hash map does not give.
- **How:** not used.

### 23. Lean DHashMap.Raw
- **What it is:** the file src/Std/Data/DHashMap/Raw.lean exists (API), same repository and licence.
- **Mechanism:** dependent hash map with invariants.
- **Lean today:** none.
- **Verdict:** IRRELEVANT. Same reason as item 22.
- **How:** not used.

### 24. Isabelle imperative refinement framework
- **What it is:** isa-afp.org/entries/Refine_Imperative_HOL.html (opened). The page names a BSD License.
- **Mechanism:** stepwise refinement from abstract structures to imperative code.
- **Lean today:** none.
- **Verdict:** REFERENCE. It shows how an abstract map becomes a verified one, which matters for the Map row.
- **How:** not used. Isabelle is not installed.
- **Open questions:** the exact date of the last AFP change was not parsed from the page.

### 25. VerCors
- **What it is:** utwente-fmt/vercors, licence "Mozilla Public License Version 2.0" (LICENSE.txt read), last push 2026-10-23. README read.
- **Mechanism:** permission-based verification for Java, C and OpenCL.
- **Lean today:** none.
- **Verdict:** IRRELEVANT.
- **How:** not used.

### 26. KeY verification of TimSort
- **What it is:** key-project.org/timsort (page title read). KeY repository KeYProject/key, licence GNU GPL (LICENSE.TXT read), last push 2026-10-26.
- **Mechanism:** a verified Java sort.
- **Lean today:** none.
- **Verdict:** IRRELEVANT. One Java implementation; GPL-2.0 is an obstacle for reuse.
- **How:** not used.

### 27. SMT sequence theories
- **What it is:** the SMT-LIB sequence theory, used by Z3 and cvc5. The Z3 guide was not opened (UNVERIFIED). Dafny's seq<T> uses this model.
- **Mechanism:** finite sequences with concatenation, length and extraction.
- **Lean today:** heap.mjs:251-258 writes `seq<E>` fields, so the theory is already in use through Dafny.
- **Verdict:** REFERENCE. It settles the content model, not the identity model.
- **How:** contents only; identity needs the heap.
- **Open questions:** out-of-bounds behaviour is an axis of its own, and Dafny's seq indexing is partial.

### 28. Z3 sequence support
- **What it is:** Z3Prover/z3, licence "MIT License" (LICENSE.txt read), last push 2026-10-26. Installed at /opt/homebrew/bin/z3; `z3 --version` printed "Z3 version 5.3.2 - 64 bit".
- **Mechanism:** the solver behind Dafny.
- **Lean today:** invoked by Dafny, which check.mjs:58 calls.
- **Verdict:** DEPENDENCY (already in use, through Dafny).
- **How:** no direct call; the version is recorded in the certificate by check.mjs.
- **Open questions:** none for this dossier.

### 29. cvc5 sequence support
- **What it is:** cvc5/cvc5, licence BSD (COPYING read), last push 2026-10-26. Not installed; not run.
- **Mechanism:** a second solver for sequence formulas.
- **Lean today:** none.
- **Verdict:** REFERENCE. Cross-checking a sequence formula on two solvers is an idea for a later lane.
- **How:** not used now.

### 30. SeCo sequence decidability
- **What it is:** DOI 10.1007/978-3-031-37703-7_2. Springer returned a client challenge page. Tool not located. UNVERIFIED.
- **Mechanism (CLAIM, research):** decidability for named sequence fragments.
- **Lean today:** none.
- **Verdict:** IRRELEVANT. Dafny does not need a fragment decision for these transitions.
- **How:** not used.

### 31. NSeq
- **What it is:** DOI 10.1007/s00236-025-00496-w. Springer challenge page. UNVERIFIED.
- **Mechanism (CLAIM, research):** dynamically indexed sequences with explicit out-of-bounds.
- **Lean today:** none.
- **Verdict:** IRRELEVANT for now (a slice-update theory; lean's slice is already a seq operation).
- **How:** not used.

### 32. Temporal
- **What it is:** tc39/proposal-temporal, licence BSD (LICENSE read), last push 2026-10-22. Polyfill js-temporal/temporal-polyfill, ISC, last push 2026-09-22, described as "under construction" (README read).
- **Mechanism:** immutable date and time values.
- **Lean today:** translate.mjs:171 treats `Date` as a pure constructor, and translate.mjs:181 marks no-argument `new Date()` as a clock read.
- **Verdict:** IRRELEVANT for legacy Date. Temporal is a new API; the research says the same.
- **How:** not used.

### 33. CFML
- **What it is:** charguer/cfml, licence Creative Commons (LICENSE read; the API says CC-BY-4.0), last push 2025-03-18. README read: an OCaml front end and a Coq library.
- **Mechanism:** separation-logic proofs for OCaml.
- **Lean today:** none.
- **Verdict:** IRRELEVANT.
- **How:** not used.

### 34. Liquid Haskell
- **What it is:** ucsd-progsys/liquidhaskell, BSD-3-Clause (API), last push 2026-10-26. README read.
- **Mechanism:** refinement types for Haskell.
- **Lean today:** none.
- **Verdict:** IRRELEVANT.
- **How:** not used.

### 35. ACL2 state objects (stobjs)
- **What it is:** acl2/acl2, BSD-3-style licence (LICENSE read), last push 2026-10-26. The DEFSTOBJ documentation (ACL2 v6.2) opened.
- **Mechanism:** a single-threaded object is a named mutable state that a function takes and returns.
- **Lean today:** heap.mjs:1-30 threads one HWorld through every unit, which is the same discipline.
- **Verdict:** REFERENCE.
- **How:** the threading pattern is already in lean. A stobj-style rule gives the "same world in, same world out" contract for every transition.
- **Open questions:** none for lean.

## Special depth (a): operation table and transitions

The spec steps below were read from the ECMA-262 2027 multipage text and the HTML standard. The Dafny text is in `scratchpad/dafny-ops/ops.dfy`, verified with dafny 4.11.0: 23 verified, 0 errors. That file is monomorphic (element type int, one record `R_pt`). heap.mjs generates one copy per shape, named `Push_<shape>` and so on.

| Operation | Spec section | Fresh result? | Receiver mutated? | Result | Order / callback | Exceptions and notes |
|---|---|---|---|---|---|---|
| push | 23.1.3.23 | no | yes, appends | new length (a number) | argument order | Set with throw; TypeError past 2^53-1 |
| splice | 23.1.3.31 | yes (removed array, via ArraySpeciesCreate) | yes | fresh removed array | indices in order | species constructor can run code |
| sort | 23.1.3.30 | no | yes | receiver itself | implementation-defined comparator calls; stable for a consistent comparator | abrupt comparator stops further calls; TypeError if comparator not callable |
| reverse | 23.1.3.26 | no | yes, pairwise Get, Set, Delete | receiver itself | no callback | Set and Delete with throw |
| slice | 23.1.3.28 | yes (ArraySpeciesCreate) | no | fresh array | ascending indices | species; getters observable |
| concat | 23.1.3.2 | yes | no | fresh array | receiver, then arguments | IsConcatSpreadable reads a Symbol-keyed property |
| map | 23.1.3.21 | yes | no (callback may) | fresh array | range fixed before the first call | callback effects propagate |
| Map.set | 24.1.3.11 | no | yes | the same map | insertion order | CanonicalizeKeyedCollectionKey (24.5.1), then SameValue |
| Set.add | 24.2.4.1 | no | yes, when new | the same set | insertion order | same key rule as Map.set |
| Object.assign | 20.1.2.1 | no | yes, the target | the target itself | sources in order, own enumerable keys | Get and Set with throw; partial writes survive a throw |
| structuredClone | HTML 2.7.4 | yes | no (transfer detaches) | fresh graph | memory map keeps sharing and cycles | Symbol and unsupported values throw DataCloneError |
| Object.freeze | 20.1.2.6 | no | yes, integrity level | the object itself | none | SetIntegrityLevel false throws TypeError |
| new Date(t) | 21.4.2.1 | yes | no | fresh Date | none | no-argument form reads the clock |
| Date.prototype.setFullYear | 21.4.4.21 | no | yes, [[DateValue]] | the new time value (a number) | local and UTC variants differ | NaN time value becomes +0 before the write (not NaN) |

Step facts used in the transitions:

- push (verified text): `ToObject`, `LengthOfArrayLike`, then `Set(obj, length, item, true)` for each item, then `Set("length")`, returns the new length.
- splice (verified text): `ArraySpeciesCreate(obj, actualDeleteCount)`, copies removed elements with `HasProperty` and `Get`, then shifts the rest.
- sort (verified text): a TypeError when comparator is not undefined and not callable. `SortIndexedProperties` with skip-holes. "Sort items using an implementation-defined sequence of calls to sortCompare." The order is implementation-defined if the comparator is inconsistent. Stability is required for a consistent comparator.
- reverse (verified text): pairwise `HasProperty`, `Get`, `Set`, `DeletePropertyOrThrow`, returns obj.
- slice (verified text): `ArraySpeciesCreate(obj, count)`, copies present indices, returns the new array.
- map (verified text): "The range of elements processed by map is set before the first call to callback." The receiver is not mutated directly, but callback may mutate it.
- Map.set and Set.add (verified text): CanonicalizeKeyedCollectionKey, then SameValue scan, then update or append, then return the collection.
- Object.assign (verified text): `ToObject(target)`, then for each source: `[[OwnPropertyKeys]]`, `[[GetOwnProperty]]`, `Get`, and `Set(targetObj, key, value, true)`. Returns targetObj.
- Object.freeze (verified text): if not an object, return it; `SetIntegrityLevel(obj, frozen)`; false throws TypeError; return obj.
- structuredClone (verified text): StructuredSerializeInternal with a memory map; primitives return at once; Symbol throws DataCloneError; Date stores DateValue.
- setFullYear (verified text): `tv` NaN becomes +0, else LocalTime(tv); builds the new date; `TimeClip(UTC(newDate))`; stores and returns it.

Node 24.18 probes (run in this session):

- `[1].push(2,3)` returns 3; `sort()` and `reverse()` return the receiver.
- `new Map().set(1,2)` and `new Set().add(1)` return the collection.
- `new Map().set(-0,'z')`: the stored key is +0.
- Two `{}` keys give Map size 2.
- `Object.assign(o, src)` returns `o`; a getter on a source runs once.
- `Object.freeze(o)` returns `o`; the freeze is shallow (`o.inner.x = 1` works).
- Strict `push` on a frozen array throws TypeError.
- `new Date(NaN).setFullYear(2020)` returns 1577833200000.
- `new Date(NaN).setMonth(1)` returns NaN.
- `structuredClone` of a class instance: the result is a plain Object, so the prototype is lost.
- `structuredClone` of a function throws DOMException.
- `structuredClone` keeps cycles and shared references inside the copy.
- `structuredClone` with `transfer` detaches the source buffer (byteLength 0).
- `slice()` and `concat()` return fresh arrays; the elements are shared.
- `map` on `[1, , 3]` calls the callback twice and leaves the hole in the result.
- `sort` on `[3, , 1, undefined]` gives length 4, puts 1 before 3, and ends with two values that JSON shows as null (an undefined and a hole).

### Dafny text (verified in ops.dfy)

```dafny
type Ref = nat
datatype Obj = A_int(items: seq<int>) | R_pt(x: int, y: int) | Dead
datatype HWorld = HWorld(heap: map<Ref, Obj>, next: nat)

predicate IsA(hw: HWorld, r: Ref) { r in hw.heap && hw.heap[r].A_int? }
predicate IsR(hw: HWorld, r: Ref) { r in hw.heap && hw.heap[r].R_pt? }
function Items_int(hw: HWorld, r: Ref): seq<int> { if IsA(hw, r) then hw.heap[r].items else [] }

// allocation: a fresh reference, next increments
function AllocA(hw: HWorld, xs: seq<int>): (HWorld, Ref) { (HWorld(hw.heap[hw.next := A_int(xs)], hw.next + 1), hw.next) }
function AllocPt(hw: HWorld, x: int, y: int): (HWorld, Ref) { (HWorld(hw.heap[hw.next := R_pt(x, y)], hw.next + 1), hw.next) }

// in-place writes: the receiver keeps its reference
function SetItems(hw: HWorld, r: Ref, xs: seq<int>): HWorld { if IsA(hw, r) then hw.(heap := hw.heap[r := A_int(xs)]) else hw }

// push: mutates, returns the new length
function Push(hw: HWorld, r: Ref, v: int): HWorld { SetItems(hw, r, Items_int(hw, r) + [v]) }
function PushLen(hw: HWorld, r: Ref, v: int): (HWorld, nat) { var h := Push(hw, r, v); (h, |Items_int(h, r)|) }

function Clamp(i: int, lo: int, hi: int): int { if i < lo then lo else if i > hi then hi else i }

// splice: mutates r, returns a FRESH array of the removed elements
function Splice(hw: HWorld, r: Ref, start: int, dc: int, ins: seq<int>): (HWorld, Ref)
  ensures Splice(hw, r, start, dc, ins).0.next == hw.next + 1 || !IsA(hw, r)
{
  var xs := Items_int(hw, r);
  var s := Clamp(start, 0, |xs|);
  var d := Clamp(dc, 0, |xs| - s);
  var removed := xs[s .. s + d];
  var h1 := SetItems(hw, r, xs[..s] + ins + xs[s + d ..]);
  if IsA(hw, r) then AllocA(h1, removed) else (hw, hw.next)
}

// reverse: mutates r, returns r (same reference, not fresh)
function Rev(xs: seq<int>): seq<int> decreases |xs| { if |xs| == 0 then [] else Rev(xs[1..]) + [xs[0]] }
function Reverse(hw: HWorld, r: Ref): (HWorld, Ref) { (SetItems(hw, r, Rev(Items_int(hw, r))), r) }

// slice: fresh copy, receiver untouched
function Slice(hw: HWorld, r: Ref, s: int, e: int): (HWorld, Ref) {
  var xs := Items_int(hw, r);
  var a := Clamp(s, 0, |xs|); var b := Clamp(e, a, |xs|);
  AllocA(hw, xs[a .. b])
}

// concat: fresh array, receiver untouched
function Concat(hw: HWorld, r: Ref, q: Ref): (HWorld, Ref) { AllocA(hw, Items_int(hw, r) + Items_int(hw, q)) }

// sort with a pure comparator: receiver rewritten, its reference returned
function {:extern} StableSortBy(xs: seq<int>, lt: (int, int) -> bool): seq<int>
function SortPure(hw: HWorld, r: Ref, lt: (int, int) -> bool): (HWorld, Ref) { (SetItems(hw, r, StableSortBy(Items_int(hw, r), lt)), r) }

// Object.assign over a record shape: target overwritten by source, target returned
function AssignPt(hw: HWorld, t: Ref, s: Ref): (HWorld, Ref) {
  if IsR(hw, t) && IsR(hw, s) then (hw.(heap := hw.heap[t := R_pt(hw.heap[s].x, hw.heap[s].y)]), t) else (hw, t)
}

// map: fresh array, receiver untouched; f must be pure (the lint's proof obligation)
function MapArr(hw: HWorld, r: Ref, f: int -> int): (HWorld, Ref)
{ var xs := Items_int(hw, r); AllocA(hw, seq(|xs|, i requires 0 <= i < |xs| => f(xs[i]))) }

// Map.set over insertion-ordered entries; SameValue on the key (ints here)
datatype Entry = Entry(k: int, v: int)
function MapSetE(es: seq<Entry>, k: int, v: int): seq<Entry>
{ if exists i :: 0 <= i < |es| && es[i].k == k then seq(|es|, i requires 0 <= i < |es| => if es[i].k == k then Entry(k, v) else es[i]) else es + [Entry(k, v)] }

// Set.add: no-op when present, returns the same set
function SetAddE(es: seq<int>, v: int): seq<int> { if v in es then es else es + [v] }

// lemmas
lemma BadRefUnchanged(hw: HWorld, r: Ref, v: int)
  requires !IsA(hw, r)
  ensures Push(hw, r, v) == hw
{ }
lemma SpliceFresh(hw: HWorld, r: Ref, s: int, d: int, ins: seq<int>)
  requires IsA(hw, r)
  ensures Splice(hw, r, s, d, ins).1 == hw.next
{ }
lemma SliceFresh(hw: HWorld, r: Ref, s: int, e: int)
  requires r in hw.heap
  requires forall k :: k in hw.heap ==> k < hw.next
  ensures Slice(hw, r, s, e).1 == hw.next
  ensures Slice(hw, r, s, e).0.heap[r] == hw.heap[r]
{ }
lemma ReverseSameRef(hw: HWorld, r: Ref)
  ensures Reverse(hw, r).1 == r
{ }
```

The file also has a `main` with concrete asserts (push length 4, splice on `[1,2,3,4]` leaves `[1,9,4]` and a fresh `[2,3]`, map gives `[2,18,8]`, Set.add ignores a present value). All pass.

Not yet checked by dafny: `structuredClone` of acyclic records (`AllocPt` per record, cycles refused), `Object.freeze`, and the Date transitions. Each needs a `frozen: set<Ref>` field in HWorld (freeze) or a `D_cell` constructor (Date). Those are drafts only.

### Transitions still to write (drafts, not verified)

- **Object.freeze.** Add `frozen: set<Ref>` to HWorld. `SetItems` and `Set_<shape>_<field>` return the heap unchanged for a frozen ref, and the translator must treat that write as a TypeError fault (strict-mode `Set` with throw). `Freeze(hw, r)` returns `(hw.(frozen := hw.frozen + {r}), r)`. Changing HWorld changes every generated prelude function, so this is a schema change, not an addition.
- **structuredClone of acyclic records.** `CloneR(hw, r)` returns `AllocPt(hw, Get_pt_x(hw, r), Get_pt_y(hw, r))` for a record and `(hw, primitive)` for a primitive. Cycles and Maps are refused.
- **new Date(t) and setters.** Add `D_cell(tv: real)`. `NewDate(hw, t)` allocates it. `SetFullYear_(hw, r, y)` computes the new time value with bodiless calendar externals and stores it; it returns the number, not the receiver. The NaN rule is the spec's: `base := if IsNaN(tv) then 0.0 else LocalTime(tv)`.

## Special depth (b): ESMeta as an oracle

- ESMeta runs under the JVM (JDK 17+). It is built with sbt (`sbt assembly`, README lines 61-67). Java is at /usr/bin/java. sbt is not installed, so ESMeta was not run.
- The README's `execute` command runs an ECMAScript program in the ESMeta interpreter (README line 161). Its input is a JS file; its output is the final state from its own interpreter.
- As a lane B oracle it would answer "what does the spec say this call does", for one concrete input. Its output is a state, not a Dafny lemma, so it can refute a table row but cannot prove one.
- Lean cannot depend on it under the node or python rule, so the verdict is REFERENCE.

## Special depth (c): Test262 coverage of these operations

Counts are the number of entries in each directory (non-recursive), read from the GitHub contents listing of tc39/test262 at its default branch. Recursive test counts are CLAIM.

| Operation | Directory | Entries |
|---|---|---|
| push | test/built-ins/Array/prototype/push | 24 |
| splice | test/built-ins/Array/prototype/splice | 81 |
| sort | test/built-ins/Array/prototype/sort | 54 |
| reverse | test/built-ins/Array/prototype/reverse | 18 |
| slice | test/built-ins/Array/prototype/slice | 71 |
| concat | test/built-ins/Array/prototype/concat | 69 |
| map | test/built-ins/Array/prototype/map | 216 |
| Map.set | test/built-ins/Map/prototype/set | 14 |
| Set.add | test/built-ins/Set/prototype/add | 21 |
| Object.assign | test/built-ins/Object/assign | 38 |
| Object.freeze | test/built-ins/Object/freeze | 53 |
| setFullYear | test/built-ins/Date/prototype/setFullYear | 20 |
| Map.forEach | test/built-ins/Map/prototype/forEach | 19 |

structuredClone is not in test262 (CLAIM: it is a web-platform topic, not ECMA-262; the test262 tree was not searched for it). Lane B cannot use test262 as a transition oracle directly. A test262 file asserts one behaviour, not a heap delta. Its use is as a corpus of call patterns: lane B runs each file's body under node with the harness and records the transitions it sees. The harness directory has 116 entries.

## Special depth (d): validation design for lane B

Where it goes (read in this session):

- `langs/ts/exec/run.mjs:110-126`: `sandbox()` builds the vm context. `Object`, `Array`, `Map`, `Set`, `JSON`, `Buffer` are passed as the host's own constructors, so user code shares the host's built-in prototypes.
- `run.mjs:112-113`: `Date` is a proxy with a frozen clock (`fixedNow = 1700000000000`), so `new Date()` is deterministic.
- `run.mjs:213-250`: `observe()`. Line 216 builds the pre-call graph; line 221 is `unit.call(args)`; lines 244-247 build the post-call graph and return it.
- `langs/ts/exec/graph.mjs:33-70`: class `Graph`. `name()` (36) assigns ids in traversal order, `edges()` (45) renders Map entries and Set elements, `before()` (61) and `after()` (64) produce the two graphs.

Design:

1. Record at the call site. Around `unit.call(args)` (run.mjs:221), install a wrapper on the host prototypes listed in the table (Array.prototype push, splice, sort, reverse, slice, concat, map; Map.prototype.set; Set.prototype.add; Object.assign; Object.freeze; Date.prototype setters). Restore the originals in a `finally` after the call. Installation is per `observe()` call; parent and candidate run sequentially, so the wrappers never overlap.
2. Each wrapper logs one record: `{op, receiverRef, argRefs, resultRef, resultKind (fresh | receiver | primitive), receiverBefore, receiverAfter, heapDelta}`. Refs come from a `Graph` built with `before([receiver, ...args])` and `after([receiver, ...args, result])`, reusing graph.mjs unchanged.
3. A checker, new file `langs/ts/exec/transitions.mjs`, loads `langs/ts/translate/library.json` (the table from the research's section 2, one row per operation) and compares each record with the row's prediction:
   - receiver identity: the row says the receiver is returned or a fresh value is returned;
   - receiver contents: the row's transition on the before-contents equals the after-contents;
   - result identity: fresh, receiver or primitive, as the row says;
   - heap delta: no object outside the receiver changed, except as the row allows.
4. A mismatch is a model defect. The checker writes the recorded case to a file under `langs/ts/tests/pairs/builtin_transitions/`, and the proof lane refuses that operation (`REFUSE`, naming the row) until the row is fixed.

Cost: 2-3 days, CLAIM. Validation: a new pair set with sort, splice and Object.assign on records and arrays, including a getter source and a frozen target, with WITNESS on the mismatch case. The corpus count comes from the lead's census in `langs/ts/design/research-integration.md` section 2 (5,082 units call a mutating method; CLAIM, not re-counted here).

Caveat: the host prototypes are shared with the lint, the translator and the harness itself. Patching them is safe only if the restore runs on every path, including a thrown exception and a timeout (`withTimeout`, run.mjs:204).

## Open questions

- The lint hole: should `Object` and `Date` leave `PURE_RECEIVERS` and `PURE_CTORS`, with calls on them refused unless the target is fresh? That changes the verdict on existing pairs and needs the owner's sign-off.
- UNVERIFIED sources: MiniPoly (ACM and DOI blocked), SeCo and NSeq (Springer blocked), JaVerT tool repository, Gillian-JS paper numbers, the Z3 sequence guide.
- The research's "setFullYear returns NaN" row is wrong, and the table in `langs/ts/design/research-integration.md` should be corrected before it is used.
- ESMeta needs sbt before it can be run; whether a JVM oracle is allowed outside the node or python rule is for the owner to decide.
- The Dafny drafts are monomorphic (one element type). heap.mjs must emit the same shapes per element type, and the emitted form still needs a dafny check.

## Blocker

None blocking. The Object.assign and Date gaps are real, shown by lint and translate exit codes, and caught by lane B as WITNESS. Lane A's behaviour on them is unverified.
