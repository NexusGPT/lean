# Research result 14: state over time, element by element

Date: 2026-10-26. Subject: deciding equivalence of two versions of a component whose state persists across calls.
Source result: /Users/assem/Downloads/Deciding Stateful Equivalence Without Trusting Bounded Success.md (read in full, 638 lines, 39 numbered systems plus prose methods).

Verification scope. Primary artifacts were opened with WebFetch on 2026-10-26 where the table says "opened". Every other entry is marked UNVERIFIED and says what was tried. Licence and date claims below are what the artifact page showed. A licence line that a page did not show is written as ABSENT, never inferred.

Lean reference points read in this run:
- langs/ts/exec/run.mjs:213 `observe` (one call: outcome, heap graph, receiver, trace, pending).
- langs/ts/exec/run.mjs:251 `runPair` (one fresh Environment per side per input, line 265; 200 inputs by default).
- langs/ts/exec/gen.mjs:8 `generator` (seeded inputs, boundary values first).
- langs/ts/check.mjs:9-11 (verdict order WITNESS > PASS-proved > PASS-bounded > ASK), :33-34 (WITNESS ends the question).
- langs/ts/module-forms.mjs:4 `moduleState` (module variable recognised by declaration).
- langs/ts/translate/translate.mjs:326-331 (World prelude: faulted, fault_value, clear_fault, raise).
- langs/ts/translate/translate.mjs:410 `isWorldField`, :415-419 `moduleAccessor` (module cell as external `Module_file_get_/set_`).
- langs/ts/translate/translate.mjs:465-469 (`datatype World = World(history, fault)`; cells are NOT World fields).
- langs/ts/translate/heap.mjs:1-25 (heap core: HWorld, Get/Set externals, identity certificate).
- langs/ts/SEMANTICS.md, section "What stays outside": assignment to `this` fields, closures that change an outer variable, and mutation of a parameter are ASK.

## Summary table

| # | name | verdict | where in lean | one-line how |
|---|---|---|---|---|
| 1 | HECTOR | REFERENCE | none (design) | Game-semantic decider for finite-data O-strict RML; informs the contextual-equivalence design, not code. |
| 2 | HOMER | REFERENCE | none (design) | Observational-equivalence decider for a third-order IA fragment; reference for game-based witnesses. |
| 3 | SyTeCi | REFERENCE | none (design) | Memory-configuration reduction to CHC; GPL-3.0 and OCaml, so no bundling; reference for the cell model. |
| 4 | Hobbit | PORT | lane A design; no file yet | Closed bisimulation with up-to closure gives PASS; depth exhaustion gives ASK. |
| 5 | PDNF-BISIM | REFERENCE | none (design) | Continuation-graph saturation for unbounded stacks; paper only, no software found. |
| 6 | ReLoC | REFERENCE | none | Coq/Iris relational logic for heaps; a proof method, not a decider. |
| 7 | Clutch | REFERENCE | none | Probabilistic relational logic in Coq; out of scope (lean is deterministic). |
| 8 | Approxis | IRRELEVANT | none | Approximate probabilistic equivalence; cannot give exact PASS. |
| 9 | WhyRel | REFERENCE | none | Relational heap couplings in Why3; the coupling idea informs lean's ledger. |
| 10 | SymDiff | REFERENCE | none | Boogie mutual summaries; no licence shown, Boogie input not TS. |
| 11 | RVT | REFERENCE | none | Regression verification; its partial-equivalence contract cannot authorise PASS. |
| 12 | PEQUOD | IRRELEVANT | none | JVM bytecode, designated methods, multiple methods unsupported. |
| 13 | Dafny module refinement | REFERENCE | langs/ts/translate (Dafny already the proof back end) | Client-preserving refinement; a relation preserved across operations is the ledger idea. |
| 14 | FDR | REFERENCE | none | CSP refinement; finite-state tier only, needs CSPM export. |
| 15 | CADP BISIMULATOR | REFERENCE | none | Two-LTS bisimulation with diagnostics; finite-state tier only. |
| 16 | mCRL2 ltscompare | REFERENCE | none | LTS equivalence plus Hennessy-Milner counterexample; finite-state tier only. |
| 17 | TLC | REFERENCE | none | TLA+ model checker, MIT; fingerprint caveat ABSENT on its README; not a TS path. |
| 18 | Apalache | REFERENCE | none | Bounded SMT over TLA+; PASS only from a checked inductive invariant. |
| 19 | Alloy 6 | IRRELEVANT | none | Temporal relational models, licence ABSENT; atom scope bounds the claim. |
| 20 | Java PathFinder | IRRELEVANT | none | JVM model checker; input is Java bytecode. |
| 21 | EQY | IRRELEVANT | none | Hardware sequential equivalence; not software. |
| 22 | W-method | PORT | design (b) companion; none yet | Complete suite under a declared fault domain; used only when the candidate state bound is known. |
| 23 | LearnLib | REFERENCE | none | Automata learning with conformance oracles; Java, Apache-2.0; learned models give ASK. |
| 24 | AALpy | REFERENCE | none | Python active learning, MIT badge; learned models give ASK, not PASS. |
| 25 | Quviq eqc_statem | REFERENCE | none | Erlang command-sequence model; licence and price ABSENT. |
| 26 | MoreBugs | REFERENCE | design (a) | Failure-pattern avoidance for command sequences; diversity idea only. |
| 27 | Hypothesis stateful | REFERENCE | design (a) | Python stateful testing; its ideas are the model for design (a), not a dependency. |
| 28 | ScalaCheck Commands | REFERENCE | design (a) | Scala model-versus-SUT commands; BSD-3-Clause; not a dependency. |
| 29 | quickcheck-state-machine | REFERENCE | design (a) | Haskell, BSD-3-Clause, 0.10.4 uploaded 2026-05-18, self-described experimental. |
| 30 | Spec Explorer | IRRELEVANT | none | Microsoft tool; page points to Spec Explorer 2010; licence and price ABSENT. |
| 31 | TorXakis | REFERENCE | none | Symbolic ioco testing; Haskell, stack and SMT; conformance, not equality. |
| 32 | Lincheck | IRRELEVANT | none | JVM concurrency testing; lean has no concurrency tier. |
| 33 | RELINCHE | IRRELEVANT | none | Relaxed-memory linearizability; no artifact or licence found. |
| 34 | Porcupine | IRRELEVANT | none | Go history checker, MIT; not runnable under node or python. |
| 35 | runST model | REFERENCE | design (c) | Region non-escape theorem; supports the state-completeness audit. |
| 36 | Koka effects | REFERENCE | design (c) | Effect inference shows which state can escape; supports the audit. |
| 37 | Memoization contracts | REFERENCE | none | Resource bounds over memo state; not behaviour equivalence. |
| 38 | Learned relational invariants | REFERENCE | lane A proposer design | Search guidance only; any proposal must be checked by Dafny. |
| 39 | Quokka | IRRELEVANT | none | LLM-based invariant synthesis; lean holds no model anywhere. |

Prose methods, counted apart from the 39 items:

| method | verdict | where | one-line how |
|---|---|---|---|
| Product programs | REFERENCE | design (b) | Two versions as one product machine; the product is what the finite-state design explores. |
| Representation independence couplings | REFERENCE | ledger (research-integration.md section 0) | A relation R over paired worlds, not equal heaps. |
| Deterministic finite-machine product | PORT | design (b) | Explore reachable (parent, candidate) state pairs; PASS on closure, WITNESS on mismatch. |
| Rice's theorem reduction | REFERENCE | docs only | Explains why no total decider exists; supports ASK as a normal verdict. |

Counts for the 39 items: DEPENDENCY 0, PORT 2, REFERENCE 27, IRRELEVANT 10.

Why DEPENDENCY is 0. A DEPENDENCY must run under node or python on macOS, have a licence that allows use, and yield PASS or WITNESS for lean's TypeScript input. Two candidates failed one test each. AALpy (Python, MIT badge) learns models, so it yields ASK, not PASS. Hypothesis (Python) shows no licence on its page, so its use cannot be cleared. TLC (MIT) and Apalache need Java and a TLA+ spec, so they are not node or python. mCRL2 shows no licence on its page.

---

## Item notes (six parts each)

### 1. HECTOR
1. What it is: UNVERIFIED. Not opened in this run. The research result describes a game-semantic equivalence decider for O-strict RML. No primary artifact was fetched.
2. Mechanism (from the result, unchecked): compiles finite-data terms to visibly pushdown automata and tests emptiness of their symmetric difference; inequivalence yields a separating context.
3. Lean today: no contextual-equivalence decider. Lane B (run.mjs:251) tests one call per input in fresh sandboxes.
4. Verdict: REFERENCE. It shows that a bounded search can be replaced by a decision in a restricted fragment. Lean's type fragment is much larger than RML.
5. HOW: not applicable.
6. Open: the 220 ms versus 2.25 min comparison is a research-result claim, not verified.

### 2. HOMER
1. UNVERIFIED. Not opened. The research result cites a 2009 Springer chapter; no link was fetched.
2. Mechanism (unchecked): third-order Idealized Algol open terms, visibly pushdown automata, witnesses on inequivalence.
3. Lean today: none. Mutable state is handled only by the World prelude (translate.mjs:326).
4. Verdict: REFERENCE. Its game-based witness shape matches the separating-context idea.
5. Not applicable.
6. Open: none that changes the design.

### 3. SyTeCi
1. What it is: an OCaml prototype that builds memory-configuration transition systems and emits CHC or SMT input. Opened: https://github.com/g-jaber/SyTeCi. Licence as shown: "GPL-3.0 license". Releases section empty; last commit date ABSENT; 138 commits.
2. Mechanism: reduces contextual equivalence over local integer references to non-reachability of failed memory configurations. Recursion-free programs only for completeness.
3. Lean today: cells are World fields or module externals (translate.mjs:465-469, :415-419).
4. Verdict: REFERENCE. GPL-3.0 code cannot be bundled into lean without a licence decision, and its input language is not TypeScript.
5. Not applicable.
6. Open: whether lean's licence allows any GPL dependency. The lead must decide that.

### 4. Hobbit
1. What it is: an OCaml bounded-bisimulation checker with up-to techniques. Opened: https://github.com/LaifsV1/Hobbit. Licence as shown: "MIT license". No release tag; no commit date shown; 18 commits. Build: opam packages (ocamlbuild, menhir, z3), then make; run `./hobbit.native -i programs/equiv/<file>.bils`.
2. Mechanism: explores a symbolic bisimulation between two higher-order programs with a store. A relation closed under the up-to rules gives PASS. A trace gives WITNESS. Depth exhaustion gives an inconclusive result.
3. Lean today: lane B only samples; lane A proves one step per unit (check.mjs:67-69). No closure search exists.
4. Verdict: PORT. Lean would reimplement the closure idea over its own World transitions; it cannot call Hobbit, because Hobbit reads its own `.bils` language.
5. HOW: (1) In langs/ts/translate, emit for each unit a transition table over paired worlds: the cells it reads and writes, the calls it makes, the result. (2) New file langs/ts/exec/closure.mjs: start from the pair of initial worlds; for each pair and each operation with a symbolic argument, compute both transitions; add the successor pair to a relation R; stop when R is closed. (3) Output: PASS-closed if R closes with no mismatch; WITNESS if a mismatch replays in run.mjs; ASK on budget exhaustion. Certificate: R's size and its hash. Cost: CLAIM 10 days for the first version on the unit set without callbacks. Validating measurement: the counter and module_forms pairs in langs/ts/tests/pairs, expecting PASS-closed on the equal pairs and WITNESS on the unequal ones.
6. Open: whether up-to rules are needed at all when cells are finite. Callback re-entry is out of the first version.

### 5. PDNF-BISIM
1. What it is: a continuation-graph bisimulation for contextual equivalence. Opened: https://arxiv.org/abs/2311.01325. Paper licence shown: CC BY 4.0 (the paper, not software). Version: v1, submitted 2 Nov 2023. Code link: ABSENT on the page.
2. Mechanism: replaces explicit stacks with continuation graphs and saturates them; decidable for the stated bounded-configuration class.
3. Lean today: no stack model. Callbacks are not modelled as continuations.
4. Verdict: REFERENCE. No software was found; the result's "2025-2026 maintenance" claim is UNVERIFIED.
5. Not applicable.
6. Open: whether a software artifact exists. Searching the authors' repositories was not done in this run.

### 6. ReLoC
1. UNVERIFIED. Not opened. The result cites the LMCS 2021 paper; no artifact was fetched.
2. Mechanism (unchecked): a Coq/Iris relational logic for concurrent heap programs; proves contextual refinement.
3. Lean today: proof lane is Dafny, not Coq/Iris.
4. Verdict: REFERENCE. A proof method for heap relations; lean would need a language embedding it does not have.
5. Not applicable.
6. Open: none that changes the plan.

### 7. Clutch
1. Opened the arXiv abstract: https://arxiv.org/abs/2301.10061 is "Asynchronous Probabilistic Couplings in Higher-Order Separation Logic", submitted 24 Jan 2023, paper licence CC BY 4.0. The research result cites the Clutch paper as its ref 39, which matches this paper's title. Code link: ABSENT on the page.
2. Mechanism: relational probabilistic logic with asynchronous couplings over random tapes.
3. Lean today: deterministic only; randomness is out of scope.
4. Verdict: REFERENCE, scoped out. Lean's sampling is seeded, not semantic randomness.
5. Not applicable.
6. Open: none.

### 8. Approxis
1. Opened the arXiv abstract: https://arxiv.org/abs/2407.14107. Venue shown: POPL 2025 (Proc. ACM Program. Lang. 9, POPL, article 41). Code link: ABSENT. Paper licence shown: CC BY-NC-SA 4.0 icon (paper).
2. Mechanism: approximate relational reasoning with error bounds for probabilistic programs.
3. Lean today: no approximation tier.
4. Verdict: IRRELEVANT for the strict equality gate. Approximate results are ASK under lean's rules.
5. Not applicable.
6. Open: none.

### 9. WhyRel
1. UNVERIFIED repository. The research result gives a 2023 arXiv link and a 2025 STTT article. Not opened in this run.
2. Mechanism (unchecked): relational region logic over two heaps with a partial bijection between allocated references; proofs go to Why3.
3. Lean today: heap core in heap.mjs:1-25 uses identity: corresponding allocations give the same references, and two versions allocating on different schedules are ASK.
4. Verdict: REFERENCE. Its coupling of references is the design idea behind the ledger in research-integration.md section 0.
5. Not applicable.
6. Open: whether lean should relax heap identity to a coupling. That is a design decision for the lead.

### 10. SymDiff
1. What it is: a Boogie-level differential verifier. Opened: https://github.com/boogie-org/symdiff. Licence: ABSENT (a LICENSE file is linked, no name or text shown). Releases section empty; last commit date ABSENT; 757 commits.
2. Mechanism: mutual summaries over two Boogie programs; discharges relational obligations.
3. Lean today: Dafny, not Boogie.
4. Verdict: REFERENCE. No licence shown, so no dependency.
5. Not applicable.
6. Open: licence confirmation is needed before any use.

### 11. RVT
1. UNVERIFIED. Not opened. The result cites a Technion STVR 2012 PDF.
2. Mechanism (unchecked): partial equivalence with recursion-to-loop conversion; outputs compared when both terminate.
3. Lean today: termination is not part of the observation (SEMANTICS.md, observation list).
4. Verdict: REFERENCE. Its partial contract cannot authorise lean's PASS, because a diverging candidate passes vacuously.
5. Not applicable.
6. Open: none.

### 12. PEQUOD
1. Opened: https://gt-pequod.github.io/. Licence: ABSENT. Version or date: ABSENT. Run: ant build, then `java -jar pequod.jar <folder> <f1> <f2>`. Input: JVM bytecode; the page lists multiple methods as unsupported.
2. Mechanism: Soot lowering and Z3 invariant synthesis over two designated methods.
3. Lean today: none.
4. Verdict: IRRELEVANT. Wrong input language, one method per check, and no licence.
5. Not applicable.
6. Open: none.

### 13. Dafny module refinement
1. Opened: https://github.com/dafny-lang/dafny. Licence as shown: "Dafny itself is licensed under the MIT license." Releases section empty; installation via release binaries.
2. Mechanism: refinement checks that verified clients remain valid; obligations go to the Dafny verifier.
3. Lean today: lane A already runs Dafny (translate.mjs header; check.mjs:67 reads the Dafny output). So Dafny is a dependency already, not a new one.
4. Verdict: REFERENCE. The useful idea is a relation preserved across operations, which the ledger implements.
5. Not applicable.
6. Open: none.

### 14. FDR
1. Opened: https://cocotec.io/fdr/manual/introduction.html. Version shown: 4.2.7 (release note dated 11/05/2020). Licence or price: ABSENT. Copyright notice shown.
2. Mechanism: CSPM processes compile to an LTS; refinement checked in trace, failures or failures-divergences models.
3. Lean today: none.
4. Verdict: REFERENCE. Only a finite-state tier would use it, and it needs CSPM export.
5. Not applicable now.
6. Open: licence and cost for a commercial product.

### 15. CADP BISIMULATOR
1. NOT OPENED. Two fetches of https://cadp.inria.fr/man/bisimulator.html failed with connection refused in this run.
2. Mechanism from the result (unchecked): LTS bisimulation with diagnostic DAGs on false results.
3. Lean today: none.
4. Verdict: REFERENCE, UNVERIFIED.
5. Not applicable.
6. Open: retry from a network that reaches cadp.inria.fr.

### 16. mCRL2 ltscompare
1. Opened: https://mcrl2.org/web/user_manual/tools/release/ltscompare.html. Release shown: mCRL2 202607.0. Licence: ABSENT on the page. Options shown: bisim, bisim-gv, branching-bisim, dpbranching-bisim; counterexample with `-c` gives a Hennessy-Milner formula.
2. Mechanism: compares two finite LTS files under a chosen equivalence and emits a distinguishing formula.
3. Lean today: none.
4. Verdict: REFERENCE. It would serve a finite-state tier after LTS export. Licence must be checked first.
5. Not applicable now.
6. Open: mCRL2 licence. The opened page shows none; the LICENSE file of the project was not opened in this run.

### 17. TLC
1. Opened: https://github.com/tlaplus/tlaplus. Licence as shown: MIT. Latest tag v1.8.0 shown as "1.8.0 Clarke pre-release"; no date shown. Run: `java -jar tla2tools.jar` (alias tlc2.TLC). The README does not mention fingerprint collisions (ABSENT).
2. Mechanism: explicit-state model checking of TLA+ specs.
3. Lean today: none.
4. Verdict: REFERENCE. Java, not node or python, so not a DEPENDENCY under the lane rule.
5. Not applicable.
6. Open: the 64-bit fingerprint caveat in the research result is not on the README; it may be in the TLC user guide, not opened.

### 18. Apalache
1. Opened: https://github.com/apalache-mc/apalache. Licence as shown: Apache-2.0. No release date shown. Install: Docker image or release jar; no jar name shown. Default step bound: ABSENT on the page (the research result says 10; UNVERIFIED).
2. Mechanism: bounded SMT checking of TLA+ or Quint; inductive invariant checking.
3. Lean today: none.
4. Verdict: REFERENCE. Needs a TLA+ spec, which lean does not produce.
5. Not applicable.
6. Open: the default bound.

### 19. Alloy 6
1. Opened: https://alloytools.org/alloy6.html. Licence: ABSENT. Version named: Alloy 6; no date shown; maintenance statement ABSENT.
2. Mechanism: relational temporal models with mutable signatures; bounded or complete checks.
3. Lean today: none.
4. Verdict: IRRELEVANT. Atom scopes bound the claim, and lean's inputs are TypeScript.
5. Not applicable.
6. Open: none.

### 20. Java PathFinder
1. Opened: https://github.com/javapathfinder/jpf-core. Licence: ABSENT on the page (a LICENSE-2.0.txt file is listed, no name shown). No release shown. Build: ./gradlew clean build; Java 11.
2. Mechanism: explicit-state JVM model checking with heap and stack state matching.
3. Lean today: none.
4. Verdict: IRRELEVANT. Java bytecode input.
5. Not applicable.
6. Open: none.

### 21. EQY
1. Opened: https://github.com/YosysHQ/eqy. Licence notice: the permissive "Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted" text (ISC-style, no name shown). No release shown; language ABSENT.
2. Mechanism: sequential hardware equivalence by induction with partitions; safe-replacement semantics.
3. Lean today: none.
4. Verdict: IRRELEVANT. Hardware circuits, not software.
5. Not applicable.
6. Open: none.

### 22. W-method
1. UNVERIFIED as software. It is a method. The research result cites an arXiv 2411.13412 paper; not opened in this run.
2. Mechanism (unchecked): a test suite P · Σ^≤k · W is complete for a declared fault domain (a bound on implementation states) over finite machines.
3. Lean today: none.
4. Verdict: PORT, scoped to design (b). It is needed only when the candidate's state bound is declared but the domain is not enumerable.
5. HOW: in langs/ts/exec/ add a function that takes the finite product machine from design (b), computes W and P, and emits a test list for run.mjs. Verdict PASS-complete only with the declared bound; otherwise ASK. Cost: CLAIM 3 days. Validating measurement: the counter pair, with a declared bound of its cell domain.
6. Open: the fault domain for TypeScript components has no natural declaration. A bound must come from the finite domain itself, which makes design (b) cover this case.

### 23. LearnLib
1. Opened: https://learnlib.de/. Licence: Apache License 2.0 as shown. Release dates shown: 19.0.0 (Aug 12, 2026), 0.18.0 (Feb 06, 2025), 0.17.0 (Nov 15, 2023). Install: Maven distribution artifact; Java.
2. Mechanism: active automata learning with membership and equivalence queries; learned models are checked by conformance oracles.
3. Lean today: none.
4. Verdict: REFERENCE. Java; learned models are approximate, so the output is ASK.
5. Not applicable.
6. Open: none.

### 24. AALpy
1. Opened: https://github.com/DES-Lab/AALpy. Licence badge shown: MIT (full text not shown). No release shown. Install: `pip install aalpy`.
2. Mechanism: resettable active learning with random-walk equivalence oracles; heuristic counterexamples.
3. Lean today: none.
4. Verdict: REFERENCE. It meets the Python and licence test, but its output is an approximate model, so it can only yield ASK.
5. Not applicable.
6. Open: whether a learned model is useful as a hint for design (b) search. Not tested.

### 25. Quviq eqc_statem
1. Opened: https://quviq.com/documentation/eqc/eqc_statem.html. Module v1.48.3 shown. Licence: ABSENT (copyright line only). Price: ABSENT. Callbacks: initial_state, COMMAND_args, COMMAND_pre, COMMAND_next, COMMAND_post.
2. Mechanism: generates command sequences from a model; postconditions per command; shrinking keeps dependencies.
3. Lean today: run.mjs runs single calls per input (run.mjs:262-268).
4. Verdict: REFERENCE. Erlang, and the licence is not shown. Its callback shape guides design (a).
5. Not applicable.
6. Open: none.

### 26. MoreBugs
1. UNVERIFIED. Not opened. The result cites a Chalmers PDF.
2. Mechanism (unchecked): generalises shrunk failures to subsequence patterns and avoids them in later generation.
3. Lean today: none.
4. Verdict: REFERENCE for design (a). The overgeneralisation risk the result names argues for an unguided stream beside any avoidance.
5. Not applicable.
6. Open: none.

### 27. Hypothesis stateful
1. Opened: https://github.com/HypothesisWorks/hypothesis. Licence: a LICENSE link shown, text not shown (ABSENT as a name). No release shown. Install: `pip install hypothesis`. The page does not mention the stateful API.
2. Mechanism (from the Hypothesis docs, not the opened page): rule-based state machines with bundles of values and shrinking of action sequences.
3. Lean today: none.
4. Verdict: REFERENCE. Python, licence not confirmed, and lean is node. Its shape is the model for design (a).
5. Not applicable.
6. Open: licence confirmation if any Python dependency is ever wanted.

### 28. ScalaCheck Commands
1. Opened: https://github.com/typelevel/scalacheck. Licence as shown: BSD-3-Clause. No release shown. The sbt line is ABSENT; no Commands stateful module named on the page.
2. Mechanism: model state versus mutable SUT; generated commands checked against the model.
3. Lean today: none.
4. Verdict: REFERENCE. Scala.
5. Not applicable.
6. Open: none.

### 29. quickcheck-state-machine
1. Opened: https://hackage.haskell.org/package/quickcheck-state-machine. Version 0.10.4, uploaded 2026-05-18. Licence: BSD-3-Clause. Main module: Test.StateMachine. README: "still very experimental".
2. Mechanism: state-machine models with preconditions, transitions and postconditions; parallel tests check for a sequential interleaving.
3. Lean today: none.
4. Verdict: REFERENCE. Haskell and experimental.
5. Not applicable.
6. Open: none.

### 30. Spec Explorer
1. Opened: https://www.microsoft.com/en-us/research/project/model-based-testing-with-specexplorer/. The page points to "Spec Explorer 2010" as the next generation and calls the download the "original research version". Licence and price: ABSENT. Established 10 Dec 2008.
2. Mechanism: explores a model program and generates tests over explored transitions.
3. Lean today: none.
4. Verdict: IRRELEVANT. The page names Spec Explorer 2010 as the successor, no licence is shown, and no price is shown.
5. Not applicable.
6. Open: none.

### 31. TorXakis
1. Opened: https://github.com/TorXakis/TorXakis. Licence as shown: BSD3. No release shown (0.6.0 appears only as an example filename). Build: stack 1.6.1 or later; an SMT solver (cvc4 or Z3) on PATH. Last commit date ABSENT; 366 commits on develop.
2. Mechanism: symbolic ioco conformance testing online.
3. Lean today: none.
4. Verdict: REFERENCE. Haskell and SMT, and conformance rather than equality.
5. Not applicable.
6. Open: none.

### 32. Lincheck
1. Opened: https://github.com/JetBrains/lincheck. Licence as shown: MPL-2.0. No release shown. Gradle: `org.jetbrains.lincheck:lincheck:3.7`. Model checking exists (stress or bounded model checking); the context-switch bound is not stated on the page.
2. Mechanism: concurrent scenarios run under stress or bounded model checking; linearizability checked.
3. Lean today: none. Lean has no concurrency tier.
4. Verdict: IRRELEVANT for now. JVM, and the component class has no threads.
5. Not applicable.
6. Open: revisit if promises or async interleaving become a tier.

### 33. RELINCHE
1. UNVERIFIED as software. A web search (2026-10-26) found the POPL 2025 paper (DOI 10.1145/3704906) and no repository or licence. Not opened in this run.
2. Mechanism (from the result): relaxed-memory linearizability over execution graphs.
3. Lean today: none.
4. Verdict: IRRELEVANT. Concurrency is out of scope.
5. Not applicable.
6. Open: none.

### 34. Porcupine
1. Opened: https://github.com/anishathalye/porcupine. Licence as shown: MIT. No release shown. Language: Go. Entry points: CheckEvents and CheckOperations.
2. Mechanism: searches for a legal linearization of a recorded history, with memoisation.
3. Lean today: none.
4. Verdict: IRRELEVANT. Go, and no concurrency tier. Lean cannot run it under node or python.
5. Not applicable.
6. Open: none.

### 35. Mechanised runST model
1. UNVERIFIED. Not opened. The result cites an Iris 2018 POPL PDF.
2. Mechanism (unchecked): a logical relation proves that encapsulated state cannot be observed outside.
3. Lean today: none.
4. Verdict: REFERENCE for design (c): region non-escape justifies treating a cell as local to a call.
5. Not applicable.
6. Open: none.

### 36. Koka
1. Opened: https://github.com/koka-lang/koka. Licence: ABSENT on the page (a License link, no text). Release shown: v3.2.9, 2026-09-17. Language: functional with effect types. Build: stack build --fast after a recursive clone.
2. Mechanism: row-polymorphic effect types make heap effects visible and identify non-escaping state.
3. Lean today: effects are read from the TypeScript AST through the World prelude (translate.mjs:326-331).
4. Verdict: REFERENCE for design (c). It shows which state effects can be listed from a type.
5. Not applicable.
6. Open: none.

### 37. Memoization-aware contract verification
1. UNVERIFIED. Not opened. The result cites the ACM SIGPLAN 2017 paper.
2. Mechanism (unchecked): resource-template contracts over memo state.
3. Lean today: none.
4. Verdict: REFERENCE. The memo-table state it exposes is a cell that design (c) must list. It proves resource bounds, not equality.
5. Not applicable.
6. Open: none.

### 38. Learned relational invariants
1. UNVERIFIED. Not opened. The result cites an ACM ASE 2022 page (dl.acm.org/doi/10.1145/3551349.3556942). The research result's arXiv citation for this item points to a different paper, so its ref 39 was not used.
2. Mechanism (from the result, unchecked): ML guides search over relational invariants that a separate verifier checks.
3. Lean today: none.
4. Verdict: REFERENCE. Usable only as a proposer whose output Dafny checks.
5. Not applicable.
6. Open: whether it is worth building a proposer at all, given lean holds no model.

### 39. Quokka
1. Opened: https://arxiv.org/abs/2509.21629. Submitted 25 Sep 2025, last revised 8 Aug 2026 (v4). Code link shown: https://github.com/Anjiang-Wei/Quokka (not opened). Paper licence: CC BY 4.0.
2. Mechanism: an LLM proposes loop invariants; a verifier checks them.
3. Lean today: none. Lean holds no model anywhere.
4. Verdict: IRRELEVANT. The standing rule of lean forbids an LLM in any mechanism.
5. Not applicable.
6. Open: none.

---

## Design (a): retained-state command sequence runner in langs/ts/exec/run.mjs

Today. runPair (run.mjs:251) builds one Environment per side per input (run.mjs:265), so no state survives between inputs. A call sequence of length one is all lane B tests.

Design.
- Ledger. One Environment and one sandbox per side per program. Created once, before the first command. Each command is a call into the same unit. The receiver and module state live in that Environment across commands. `observe` (run.mjs:213) runs unchanged on each command.
- Generation. `generator(seed, ...)` (gen.mjs:8) gives the argument values. A new function `commandSequence(spec, seed, i, len)` returns a list of (unit, argument-indices) where each argument is either a fresh input or a reference to an object returned by an earlier command (the bundle idea from Hypothesis).
- Comparison. After each command, compare `observe` results as JSON (as run.mjs:278 does today). Stop at the first difference.
- Shrink. On a difference, try deleting one command at a time, then one argument at a time. Keep a deletion only if the same difference still appears. Repeat until no deletion keeps it (a greedy delta-debug pass). Record the shrink steps.
- Certificate. For a WITNESS: seed, length, the reduced command list, both observation sequences, the sandbox fake policy, and the number of runs. For a clean run: the same bound fields as today plus the command count, so the verdict is PASS-bounded only, never PASS-proved (check.mjs:9-11).

Cost. CLAIM 4 days for the runner and shrinker, plus 2 days for tests. Validating measurement: the counter pair, where the candidate returns 1 on the second call, expecting WITNESS with a two-command reduced sequence; and the service and module_forms pairs, expecting PASS-bounded where they are equal.

Open. Whether deletion breaks a dependency between commands (an argument that refers to an earlier result). The shrinker must drop references too.

## Design (b): finite-state product in langs/ts/exec/finite.mjs

When it applies. Every persistent cell the unit reads or writes, and every operation's argument, has a finite declared domain. Domains come from the TypeScript types: literal unions (string or number), `boolean` (`true | false`), and enum members. The checker gives them through `checker.getTypeAtLocation` and the union `types` list, the same way module-forms.mjs:4 reads types.

Algorithm.
1. Read the finite domain of each cell and each argument from the types. If any is not finite, refuse this design and fall back to design (a).
2. A state is a tuple of cell values. Build the initial pair (parent initial state, candidate initial state) from the declared initialisers. Refuse if an initialiser is not a constant.
3. Breadth-first over pairs. For each pair and each operation and each argument value: run the parent and the candidate transition on the pair's states (the unit's own code, through the sandbox, with fakes returning seeded answers keyed by state). Compare the two observations. A difference is a WITNESS: the path from the initial pair.
4. If the observations match, the successor pair goes into the queue unless it is already seen. A pair is seen when both states are equal.
5. Stop when the queue is empty: PASS-proved only if every reachable pair matched and the domains are finite and declared. Stop with ASK if the pair count exceeds a budget.

Certificate. The domains (values per cell and argument), the number of reachable pairs, the count of operations times arguments, the hash of the visited pair set, the state-fold rule, and the fake policy. This is a decided finite exploration, so it may be PASS-proved as a finite result, with the scope written into the verdict.

Bound. At most n_parent times n_candidate reachable pairs times the operation and argument count, per the result's own derivation (its table row 1, unverified there, and consistent with the classical product bound).

Cost. CLAIM 6 days. Validating measurement: a new pair in langs/ts/tests/pairs with a boolean-flag cell and a two-value enum argument, one equal and one unequal version.

Open. Whether a transition run through the sandbox is a faithful transition function. It must be stateless across states, so the state must be restored before each run. That restore is the open part.

## Design (c): state-completeness audit in the translator

What the code does today, as read in this run.
- A module variable is recognised by its declaration: `moduleState` (module-forms.mjs:4) accepts a `var`-style or non-constant declaration at file scope, or a constant that holds an object, array, Map or Set.
- A module read or write becomes an uninterpreted external: `moduleAccessor` (translate.mjs:415-419) emits `Module_file_get_<name>_<hash>(World)` or `Module_file_set_...(World, value)`. The hash is the declaration text, so both sides agree when their declarations match.
- `this` fields use `isWorldField` (translate.mjs:410) and `worldFieldAccessor` (translate.mjs:413). Outer-variable reads of globals use `outsideRoot` and `global_read_` externals.
- The World type has only `history` and `fault` (translate.mjs:465-469). A module cell is therefore not a World field. Its value is an uninterpreted function of the world history, and a write is an uninterpreted transition.
- SEMANTICS.md, "What stays outside", lists closures that change an outer variable and assignment to `this` fields as ASK. So a captured-variable write is refused today, not modelled.

Design.
1. Audit pass in translate.mjs, before emitting a unit. Collect every persistent cell the unit's body touches: module variables (via moduleState at each identifier), `this` fields (isWorldField), captured variables (identifiers whose declaration is in an enclosing function, found through the checker's symbol declarations), and outer globals (outsideRoot).
2. For each cell, check two things: it has a World field or a declared accessor pair, and it has a transition model. A transition model means the write is a function World to World, not an uninterpreted external. Today module cells fail the second check and `this` fields pass as accessor externals.
3. A cell that fails either check is an obligation. Emit `// OBLIGATIONS <unit>: cell(<name>, <kind>, <missing: model|field>)` and refuse the proof lane with `ASK:obligation` naming the cell. Lane B still runs; check.mjs:43-69 turns a failed lane A into ASK or PASS-bounded.
4. Output: the list of cells per unit, written to the cert, so a reader sees what the proof assumed.

Measurement. Run the audit on the stateful pairs: counter, service, module_forms, component. Expect each module cell to be reported with its missing model, and the report to match what the translator already emits for each pair. A pair whose cells all have models is the only kind that can reach PASS-proved.

Cost. CLAIM 5 days (audit + report + refusal wording). It changes no verdict for units that already refuse.

Open. Whether a captured variable can be found reliably through the checker in every closure form. Generators and async units (translate.mjs:1581, :1606) were not read in detail in this run.

## Open items for the lead

- Licences not shown on opened pages: Hypothesis, mCRL2, SymDiff, PEQUOD, Koka, Alloy 6, JPF, Spec Explorer, eqc_statem. None may be used as a dependency until a licence is read in the LICENSE file.
- CADP not opened (connection refused twice). Retry needed.
- Most research-result items marked UNVERIFIED (HECTOR, HOMER, ReLoC, WhyRel, RVT, MoreBugs, W-method source, runST, memoization, learned invariants) were not fetched. Their verdicts rest on the research result's descriptions and are marked as such above.
- The research result's reference 39 points at Clutch; the learned-invariants item cites a different ACM page. Both are noted above; the result's reference list should be corrected by its author.
