# Research element 13: shared mutable objects, per-item dossier

Source result: `/Users/assem/Downloads/Sound Equivalence Checking With Shared Mutable Objects.md` (40 numbered rows; the prose names the same systems).

Method: each item's primary artifact was opened where one exists (repository page, paper PDF, or the spec page). Papers were read through the saved PDF text. A repository page showed a licence and a purpose in most cases, but no release or commit date. Those dates are marked "not shown". Numbers marked CLAIM were not found in an opened source. UNVERIFIED means the primary source could not be opened.

## Summary table

Verdict counts: DEPENDENCY 1 · PORT 5 · REFERENCE 29 · IRRELEVANT 5. Total 40.

| # | Name | Verdict | Where in lean | One-line how |
|---|---|---|---|---|
| 1 | Godlin-Strichman RVT | REFERENCE | SEMANTICS.md "Observation" | Partial equivalence on returns only; lean's observation is stronger (heap, trace, pending). |
| 2 | SymDiff | REFERENCE | SEMANTICS.md "Observation" | Boogie-based semantic diff; the definition in the paper excerpt was not confirmed. |
| 3 | PEQUOD | REFERENCE | spec/theorem.py | Per-path relational proofs without user coupling; no artifact found. |
| 4 | WhyRel | REFERENCE | spec/theorem.py, translate/heap.mjs | Closest design: self-composed relational proof over an explicit heap; lean already does the self-composition. |
| 5 | llreve | IRRELEVANT | (none; LLVM input) | Checks LLVM program pairs; no TypeScript path. |
| 6 | Alive2 | REFERENCE | check.mjs | One-way refinement over LLVM; lean needs two-way equality. |
| 7 | Alive2 memory encoding | REFERENCE | translate/heap.mjs:1-28 | Block ID plus offset memory model; the reference model lean's heap core should not copy for JS objects. |
| 8 | UC-KLEE | REFERENCE | exec/run.mjs (lane B) | Under-constrained crash checking on LLVM; its no-alias input assumption is what lean must not inherit. |
| 9 | PASDA | REFERENCE | check.mjs (ASK and PASS-bounded) | Best-effort labels for undecided pairs; lean already keeps ASK separate from PASS. |
| 10 | ARDiff | REFERENCE | check.mjs (gate) | Abstraction and refinement of common code; no abstraction step in lean. |
| 11 | DiffKemp | IRRELEVANT | (none; C kernel) | Semantic diff for C kernel versions; Apache-2.0 stated, no TypeScript path. |
| 12 | ReLoC Reloaded | REFERENCE | spec/theorem.py | Mechanised relational separation logic in Coq; no runnable artifact checked. |
| 13 | Yang relational separation logic | REFERENCE | spec/theorem.py | Relational Hoare logic for pointer programs; primary not opened. UNVERIFIED. |
| 14 | Product programs | REFERENCE | spec/theorem.py | Two runs in one program; lean's Dafny theorem is this skeleton. Primary not opened. UNVERIFIED. |
| 15 | Gillian | REFERENCE | translate/heap.mjs | Separation-logic platform for JS and C memory; BSD-3-Clause stated; OCaml. |
| 16 | Dafny | DEPENDENCY (already in use) | check.mjs:58 | Verifies the Equal_ lemmas; MIT stated. |
| 17 | Spec# | REFERENCE | translate/heap.mjs:1-28 | Heap as a map from object and field; sound but incomplete, as the paper states. |
| 18 | KeY | IRRELEVANT | (none; Java) | Java dynamic logic; GPL-2.0 or later stated. |
| 19 | Why3 / WhyML | REFERENCE | translate/heap.mjs | Mutable fields update in place; the lean heap core already uses total transitions instead. |
| 20 | Viper CoreIVL | REFERENCE | translate/heap.mjs | Permission-based heap chunks; the paper's details were not readable. Silicon is Scala. |
| 21 | Smallfoot | REFERENCE | translate/heap.mjs | Strict separation over finite heaps; primary not opened. UNVERIFIED. |
| 22 | VeriFast | IRRELEVANT | (none; C, Rust, Java) | MIT stated; no TypeScript path. |
| 23 | Prusti | IRRELEVANT | (none; Rust) | Rust verifier; MPL-2.0 stated for its own code. |
| 24 | TAJS | REFERENCE | translate/heap.mjs | Abstract heap for JS; archived 11 February 2025, Java. |
| 25 | Steensgaard points-to | PORT | translate/heap.mjs:427 (identitySkeleton) | Unification-based may-alias over a unit's variables, feeding the identity guard. |
| 26 | HotSpot escape analysis | PORT | lint/lint.mjs (opaque-mutation, ~line 891) | Must-not-escape check on allocations a unit creates, gating value reading. |
| 27 | Rust ownership / RustBelt | REFERENCE | (none) | Ownership is a type-system constraint; RustBelt paper title and goal confirmed. |
| 28 | Korat | PORT | exec/gen.mjs:80 (aliasInputs) | Enumerate non-isomorphic small heaps for a shape and feed them to the observer. |
| 29 | Symbolic PathFinder | REFERENCE | exec/gen.mjs:80 | Java bytecode symbolic execution with lazy initialisation; license not stated. |
| 30 | Randoop | REFERENCE | exec/run.mjs (lane B) | Random Java sequences with contract oracles; MIT stated; no alias construction. |
| 31 | UDITA | REFERENCE | exec/gen.mjs:8 | A language for test generators; license not stated. |
| 32 | CMC incremental heap canonicalisation | PORT | exec/graph.mjs:33 (Graph) | Canonical rooted-heap numbering already in lane B; add the proof-side Canon(hw, roots). |
| 33 | KJS | REFERENCE | (none; K framework) | Executable ECMAScript 5.1 semantics; 2,782 tests verified; licence not stated. |
| 34 | JSCert | REFERENCE | (none; Coq) | Coq specification of ECMAScript 5; licence not stated on the page. |
| 35 | JaVerT | REFERENCE | translate/heap.mjs | Separation-logic verifier for JS heap structures; timings not verified. |
| 36 | ESMeta | REFERENCE | (none; JVM) | Executable ECMAScript model; BSD-3-Clause stated; needs JDK 17. |
| 37 | ECMAScript and HTML object operations | PORT | lint/lint.mjs:30, translate/translate.mjs:2809, :4061 | Model Object.assign as a heap transition; structuredClone stays ASK. |
| 38 | RML observational-equivalence decidability | REFERENCE | (none) | Decidable only at low order; settles that a general JS decider is out of reach. |
| 39 | Symbolic-heap entailment complexity | REFERENCE | (none) | Entailment with inductive predicates is 2-EXPTIME-hard, per the arXiv abstract. |
| 40 | Trivet | REFERENCE | check.mjs:58 | LLVM proofs with Lean; no code; kernel-checked proofs match lean's trust model. |

## Per-item notes

### 1. Godlin-Strichman RVT (regression verification)

1. **What it is.** Regression verification by proving partial equivalence of similar programs. Source opened: `https://ofers.dds.technion.ac.il/publications/stvr12.pdf` (STVR journal paper by Godlin and Strichman). Licence: not stated in the paper. Date: the paper's date was not shown in the text read.
2. **Mechanism.** The method proves that two terminating executions from equal inputs emit equal outputs. It isolates incremental pairs of functions and abstracts calls with uninterpreted functions. The paper's tool builds on CBMC for C programs.
3. **Lean today.** `langs/ts/SEMANTICS.md` "## Observation" lists outcome, reachable mutation, effect trace and pending work. That is a stronger observation than the paper's returned outputs.
4. **Verdict.** REFERENCE. It settles the point that output-only partial equivalence is too weak for a shared-object contract.
5. **How.** Not applicable. The paper's definition confirms that lean's contract must include the caller-visible heap, which `SEMANTICS.md` already does.
6. **Open questions.** The paper's CBMC timing claim was not found in the text read. The fresh-object mapping was not stated in the excerpt read.

### 2. SymDiff

1. **What it is.** A language-agnostic semantic diff tool for imperative programs, built on Boogie. Source opened: `https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/paper-44.pdf` (Lahiri, Hawblitzel, Kawaguchi, Rebêlo). Licence and release: not established. The paper is the only source opened. No repository was opened.
2. **Mechanism.** Translates a source program to Boogie, then checks equivalence of procedures with an SMT solver through Boogie's verifier. Calls are abstracted by uninterpreted functions.
3. **Lean today.** `langs/ts/SEMANTICS.md` "## Observation" and `langs/ts/check.mjs:31` (lane B) compare the same kind of observation.
4. **Verdict.** REFERENCE. The paper shows a Boogie-based route to the same question that lean answers with Dafny.
5. **How.** Not applicable. The paper's exact definition of equivalence over returns and globals was not confirmed in the text read. The research result's description is CLAIM until that is checked.
6. **Open questions.** Whether the paper's evaluation numbers hold. Whether a current build exists.

### 3. PEQUOD

1. **What it is.** A verifier for partial equivalence that synthesises per-path relational proofs and combines them into invariants, for JVM bytecode. Source opened: `https://arxiv.org/abs/1705.03110` ("Completely Automated Equivalence Proofs", Zhou, Heath, Harris, submitted 8 May 2017). Licence: not stated. Artifact: no link found on the page.
2. **Mechanism.** Pairs paths of the two programs, proves each pair with relational invariants, and then combines the proofs. It needs no user-written coupling relation.
3. **Lean today.** `spec/theorem.py` writes one Equal_ lemma per function from parent and candidate; lean does not synthesise invariants.
4. **Verdict.** REFERENCE. It shows that path-pair proofs are a possible route for loops and recursion.
5. **How.** Not applicable. The research result's counts (369 pairs over 14 exercises, and timings) were not found in the abstract. They are CLAIM.
6. **Open questions.** Whether an implementation is available. Its heap model for arbitrary references was not stated in the abstract.

### 4. WhyRel

1. **What it is.** A relational region-logic prototype, auto-active, built on the Why3 platform with SMT solvers. Sources: the arXiv paper `https://arxiv.org/pdf/2303.14314` was seen only as a search result and not opened; the PAR record `https://par.nsf.gov//servlets/purl/10465917` returned a connection refusal and was not read. Licence and release: not established.
2. **Mechanism.** Relational region logic over pointer programs. Case studies include Dijkstra's shortest path with two priority queues and Kruskal's MST with two union-find modules. The user writes coupling relations, and the tool checks them through SMT.
3. **Lean today.** `spec/theorem.py` writes the self-composed Dafny theorem. `translate/heap.mjs:1-28` keeps one heap and total transitions.
4. **Verdict.** REFERENCE. It is the closest published design to lean's proof lane.
5. **How.** Not applicable. The research result's "partial bijection" wording was not found in the search excerpts. That is UNVERIFIED.
6. **Open questions.** Whether WhyRel's heap model handles fresh-object correspondence automatically. The paper says coupling lemmas are written by hand.

### 5. llreve

1. **What it is.** Automatic regression verification for LLVM programs. Source opened: `https://github.com/mattulbrich/llreve`. Licence: the README says BSD-3 for the repository. Last commit: not shown (1,128 commits, no date).
2. **Mechanism.** Translates LLVM pairs into SMT clauses and calls Z3 or Eldarica.
3. **Lean today.** Not applicable.
4. **Verdict.** IRRELEVANT. Its input is LLVM IR, and lean's input is TypeScript.
5. **How.** Not applicable.
6. **Open questions.** None for lean.

### 6. Alive2

1. **What it is.** Bounded translation validation for LLVM optimisations. Source opened: `https://github.com/AliveToolkit/alive2` (MIT stated; 2,670 commits; no date shown). Paper opened: `https://users.cs.utah.edu/~regehr/alive2-pldi21.pdf` (PLDI 2021, Lopes, Lee, Hur, Liu, Regehr).
2. **Mechanism.** Checks that every target behaviour is a source behaviour (refinement). It builds an SMT formula from both functions and reports a counterexample when refinement fails.
3. **Lean today.** `check.mjs:58` runs Dafny for the equality lemma. Equality needs both directions, which refinement does not give.
4. **Verdict.** REFERENCE.
5. **How.** Not applicable. The claim of 21 new LLVM memory bugs is confirmed in `alive2-mem` (see item 7).
6. **Open questions.** Whether one-way refinement can be used as a sub-check for lean. Not without a second direction.

### 7. Alive2 memory encoding

1. **What it is.** An SMT encoding of LLVM's memory model for bounded translation validation. Source opened: `https://sf.snu.ac.kr/publications/alive2-mem.pdf` (Lee, Kim, Hur, Lopes). Licence: not stated.
2. **Mechanism.** Stack and global variables get distinct memory blocks. A malloc creates a fresh block. A pointer is a block ID plus an offset. The encoding is bounded.
3. **Lean today.** `translate/heap.mjs:1-28` names every reference by a numeric `Ref` allocated in order. Allocation order is part of the identity certificate.
4. **Verdict.** REFERENCE. The paper confirms that block IDs make allocation identity explicit.
5. **How.** Not applicable. The paper's excerpt confirms 21 new bugs and 6,600 tests covering 36,600 functions in about 2.5 hours in parallel (line 1272 of the saved text).
6. **Open questions.** JavaScript objects need their own identity model. Alive2's block model covers LLVM memory only.

### 8. UC-KLEE

1. **What it is.** Under-constrained symbolic execution for patch checking on LLVM. Source: USENIX Security 2015 paper, found through search (`https://usenix.org/node/190952`). The PDF fetch returned a certificate error and was not read. No artifact repository was found.
2. **Mechanism.** Runs symbolic execution from arbitrary input states. It assumes that input-derived pointers denote distinct objects, so input aliasing and cycles are excluded. It checks for crashes and path differences.
3. **Lean today.** `exec/gen.mjs:80` (aliasInputs) generates shared and self-referencing inputs, so lean does not exclude aliasing.
4. **Verdict.** REFERENCE. It shows the restriction lean must not inherit.
5. **How.** Not applicable. The search excerpt confirms 12 bugs in BIND and OpenSSL patches. The no-alias assumption is research-result CLAIM, not read in the paper.
6. **Open questions.** The paper text was not read.

### 9. PASDA

1. **What it is.** A partition-based semantic differencing approach with best-effort labels for undecided cases, for Java. Source opened: `https://arxiv.org/abs/2311.08071` (Glock, Pichler, Pinzger, submitted 14 November 2023). Licence: CC BY 4.0 for the paper. No code link on the page.
2. **Mechanism.** Attempts a formal EQ or NEQ proof by differential symbolic execution. Undecided cases get a heuristic best-effort label.
3. **Lean today.** `check.mjs` returns ASK for undecided pairs and PASS-bounded for a bounded run, and never labels a best-effort guess.
4. **Verdict.** REFERENCE. Lean's rule is stricter: best-effort labels are not verdicts.
5. **How.** Not applicable. The page reports 141 pairs and 61 to 74 percent correct at timeouts from 10 to 3,600 seconds. The 73/68 split quoted by the research result is CLAIM.
6. **Open questions.** Whether an artifact exists.

### 10. ARDiff

1. **What it is.** Equivalence checking by iterative abstraction and refinement of common code, for Java. Source opened: `https://www3.ntu.edu.sg/home/yi_li/files/Badihi2020ASP.pdf` (paper text read from the saved PDF; venue not read). Licence and artifact: not stated.
2. **Mechanism.** Abstracts the common code of two versions, then refines the abstraction with uninterpreted functions and symbolic execution, using Z3.
3. **Lean today.** `check.mjs` has no abstraction step. Lean uses uninterpreted externals (`translate/translate.mjs`, prelude).
4. **Verdict.** REFERENCE.
5. **How.** Not applicable. The paper states a 300-second timeout per tool, including 100 seconds for the Z3 check (saved text, lines 1186 to 1187). The benchmark has 57 method pairs.
6. **Open questions.** Whether an abstraction of heap state is sound for reference identity. The paper does not address it.

### 11. DiffKemp

1. **What it is.** Semantic differences between Linux kernel versions in C. Source opened: `https://github.com/diffkemp/diffkemp` (Apache-2.0 stated; 1,273 commits; no date shown).
2. **Mechanism.** Compares selected C functions and reports them as equal or not equal, with a pattern-based check for semantics-preserving changes.
3. **Lean today.** Not applicable.
4. **Verdict.** IRRELEVANT. C input, no TypeScript path.
5. **How.** Not applicable.
6. **Open questions.** None.

### 12. ReLoC Reloaded

1. **What it is.** A mechanised relational separation logic for refinements with higher-order state, fine-grained concurrency and recursive types, in Iris and Coq. Source opened: `https://lmcs.episciences.org/7708/pdf` (LMCS 17(3), 2021, Frumin, Krebbers, Birkedal). Licence: not stated in the text read.
2. **Mechanism.** The judgment `e ≾ e' : τ` states refinement. Proofs are built in the logic and checked by the proof assistant.
3. **Lean today.** `spec/theorem.py` writes self-composed lemmas that Dafny checks.
4. **Verdict.** REFERENCE. It is a proof-theoretic route to the same relational goal.
5. **How.** Not applicable.
6. **Open questions.** Whether an automated decision step is possible. The paper is a proof framework.

### 13. Yang relational separation logic

1. **What it is.** A relational separation logic for pointer programs, demonstrated on Schorr-Waite. Source: the DOI `https://doi.org/10.1016/j.tcs.2006.12.036` from the research result. Not opened. UNVERIFIED.
2. **Mechanism.** Hoare-style judgments that relate two pointer programs.
3. **Lean today.** `spec/theorem.py`.
4. **Verdict.** REFERENCE.
5. **How.** Not applicable.
6. **Open questions.** Whether the logic supports fresh-object relations.

### 14. Product programs

1. **What it is.** Two executions compiled into one program, so a safety proof checks a relational property. Source: the Springer PDF redirected to a login page and was not read. UNVERIFIED.
2. **Mechanism.** A product program runs both versions in sequence on a shared input, and a Hoare proof of the product states the relation.
3. **Lean today.** `spec/theorem.py` builds exactly this self-composed theorem: one Equal_ lemma per unit, parent and candidate in one file.
4. **Verdict.** REFERENCE. Lean already uses this skeleton; heap correspondence is a separate proof obligation.
5. **How.** Not applicable.
6. **Open questions.** Heap correspondence for fresh objects is not stated in the product-program paper.

### 15. Gillian

1. **What it is.** A separation-logic platform for real-world verification of JavaScript (extensible objects) and C (block memory). Source opened: `https://github.com/gillianplatform/gillian` (BSD-3-Clause stated; 458 commits; no date; no installation text).
2. **Mechanism.** Symbolic execution and verification over a configurable memory model, using separation logic.
3. **Lean today.** `translate/heap.mjs` implements its own heap core with total transitions, not a separation-logic model.
4. **Verdict.** REFERENCE. Its JavaScript object model is a candidate reference for the heap core's object semantics.
5. **How.** Not applicable.
6. **Open questions.** Whether its JavaScript model covers property descriptors and prototype chains.

### 16. Dafny

1. **What it is.** A verification-aware language and verifier. Source opened: `https://github.com/dafny-lang/dafny` (MIT stated; release date not shown; CLI is installed from the project wiki).
2. **Mechanism.** Verifies a program against its pre- and postconditions by sending verification conditions to Z3.
3. **Lean today.** `check.mjs:58` runs `dafny verify` on the theorem. `check.mjs:67` records the Dafny version in the certificate.
4. **Verdict.** DEPENDENCY, already in use.
5. **How.** No change. The certificate already records the Dafny version and time limit. Cost: 0 days. Validation: the current pair suite (`langs/ts/tests/pairs`, 46 pairs) runs through this path.
6. **Open questions.** Pin the Dafny version used in CI, if not already pinned. Check that `dafny --version` is recorded in every certificate.

### 17. Spec#

1. **What it is.** A C# extension with contracts and a static verifier. Source opened: the Microsoft Research PDF `https://www.microsoft.com/en-us/research/wp-content/uploads/2011/06/krml196.pdf` (Barnett, Fähndrich, Leino, Müller, Schulte, Venter). Licence and release: not stated.
2. **Mechanism.** Models the heap as a map from object and field to values. Ownership organises objects into containment trees.
3. **Lean today.** `translate/heap.mjs:1-28` models the heap as one map from `Ref` to typed objects.
4. **Verdict.** REFERENCE.
5. **How.** Not applicable. The paper's own statement: "Our static verifier is sound, but not complete."
6. **Open questions.** None for lean.

### 18. KeY

1. **What it is.** A verification tool for Java against JML specifications, with dynamic logic. Source opened: `https://github.com/keyproject/key` (GPL-2.0 or later stated; 21,877 commits; no date shown).
2. **Mechanism.** Symbolic execution of Java bytecode against contracts.
3. **Lean today.** Not applicable.
4. **Verdict.** IRRELEVANT. Java input, and GPL-2.0 would require review before any use.
5. **How.** Not applicable.
6. **Open questions.** None.

### 19. Why3 and WhyML

1. **What it is.** A verification platform with the WhyML language. Source opened: `https://www.why3.org/doc/syntaxref.html` (Why3 1.9.0 documentation; licence not stated on the page). The GitLab repository returned an access-denied page and was not read.
2. **Mechanism.** Mutable references and record fields update in place, as the page states: "Assignment updates in place a mutable record field or an element of a collection."
3. **Lean today.** `translate/heap.mjs` uses total functions over a heap value, so no in-place update exists in the proof.
4. **Verdict.** REFERENCE.
5. **How.** Not applicable.
6. **Open questions.** Why3 is an OCaml toolchain; it is not a node or python dependency.

### 20. Viper and CoreIVL

1. **What it is.** A permission-based intermediate language for separation-logic verifiers. Source opened: the paper `https://pub.ista.ac.at/~msammler/paper/viperroots.pdf` (Dardinier, Sammler, Parthasarathy, Summers, "Formal Foundations for Translational Separation Logic Verifiers"). The saved PDF is an ACM paper (DOI 10.1145/3704856, CC BY 4.0 per the file). Silicon (`https://github.com/viperproject/silicon`) is Scala with its licence not stated and 4,149 commits.
2. **Mechanism.** Heap chunks record receiver, field, permission and value. A verifier composes permissions across the heap.
3. **Lean today.** `translate/heap.mjs` has no permissions. Every reference is owned by the one heap.
4. **Verdict.** REFERENCE.
5. **How.** Not applicable. The paper's soundness theorem was not readable in the text extracted.
6. **Open questions.** Whether permissions could express shared read access in lean's heap.

### 21. Smallfoot

1. **What it is.** An automatic assertion checker with separation logic, from UCL (2005). Source: `https://www.cs.ucl.ac.uk/staff/p.ohearn/papers/smallfoot_v0.1.pdf`. The fetch was refused by the server. UNVERIFIED.
2. **Mechanism.** The separating conjunction needs disjoint heap domains. Hoare triples reduce to entailment.
3. **Lean today.** `translate/heap.mjs` has one map, no separation.
4. **Verdict.** REFERENCE.
5. **How.** Not applicable.
6. **Open questions.** None for lean.

### 22. VeriFast

1. **What it is.** A modular verifier for C, Rust and Java. Source opened: `https://github.com/verifast/verifast` (MIT stated; 3,198 commits; no date shown).
2. **Mechanism.** Heap predicates and permissions, verified by symbolic execution.
3. **Lean today.** Not applicable.
4. **Verdict.** IRRELEVANT. No TypeScript path.
5. **How.** Not applicable.
6. **Open questions.** None.

### 23. Prusti

1. **What it is.** A static verifier for Rust based on Viper. Source opened: `https://github.com/viperproject/prusti-dev` (MPL-2.0 for the project's own code; 7,534 commits; no date shown).
2. **Mechanism.** Verifies Rust programs through Viper.
3. **Lean today.** Not applicable.
4. **Verdict.** IRRELEVANT. Rust input.
5. **How.** Not applicable.
6. **Open questions.** None.

### 24. TAJS

1. **What it is.** A static dataflow analyser for JavaScript. Source opened: `https://github.com/cs-au-dk/TAJS` (Apache-2.0 stated; 28 commits; the page says the project is no longer maintained and was archived on 11 February 2025).
2. **Mechanism.** Abstract interpretation of JavaScript with an abstract heap and property-write refinements.
3. **Lean today.** Not applicable.
4. **Verdict.** REFERENCE. Its abstract heap is an alternative to lean's exact heap. It is archived, and it is Java.
5. **How.** Not applicable.
6. **Open questions.** None.

### 25. Steensgaard points-to analysis

1. **What it is.** A flow-insensitive, almost-linear-time points-to analysis by unification. Source opened: `https://www.cs.cornell.edu/courses/cs711/2005fa/papers/steensgaard-popl96.pdf` (the POPL 1996 paper, "Points-to Analysis in Almost Linear Time", Bjarne Steensgaard, Microsoft Research). Licence: not stated.
2. **Mechanism.** Each assignment unifies the abstract locations of its two sides with a union-find structure. Two variables that may point to one object end up in one class.
3. **Lean today.** `translate/heap.mjs:427` (`identitySkeleton`) builds identity skeletons from syntax alone. It does not know which variables may alias. The identity guard (`translate/translate.mjs:375` to `:392`) relies on that syntactic skeleton.
4. **Verdict.** PORT.
5. **How.**
   - Files: `translate/heap.mjs`, a new function `mayAliasClasses(unit)` beside `identitySkeleton`, and one call in the identity guard in `translate/translate.mjs`.
   - Input: the unit's AST and its parameter and local names. Output: a partition of names into may-alias classes, plus one flag: a write reaches a class that holds a parameter.
   - Effect on the verdict: a unit whose parameter class is written keeps its proof only when both sides have equal skeletons. Otherwise the verdict is ASK:identity, as the guard already does.
   - Cost: 3 days (CLAIM).
   - Validation: the pairs `alias_refactor` (expected true), `identity` (expected false) and `heap_graph` in `langs/ts/tests/pairs`. A corpus count over the census units recorded in `langs/ts/design/research-integration.md` section 1 (exposed units kept provable, before and after the change).
6. **Open questions.** Steensgaard is flow-insensitive, so it may reject many units. The census false-positive rate is not known until the corpus is re-measured.

### 26. HotSpot escape analysis

1. **What it is.** HotSpot C2's analysis of whether an allocated object escapes its method or thread. Source opened: `https://cr.openjdk.org/~cslucas/escape-analysis/EscapeAnalysis.html` (OpenJDK page; no licence stated).
2. **Mechanism.** The page states the figures as shares of C2-compiled candidate methods, where candidates are methods that allocate objects, use locks or call autoboxing. The page's figures are 41 percent for movie-lens, 19 percent for Avrora, and about 35 percent overall.
3. **Lean today.** `lint/lint.mjs` classifies mutations as `opaque-mutation` and `param-mutation` (around line 891). It does not track whether an allocation escapes.
4. **Verdict.** PORT.
5. **How.**
   - Files: `lint/lint.mjs`, a new check `escapesAllocation` beside the existing mutation checks.
   - Input: the unit's AST. Output: the list of allocations the unit creates, each marked escapes or does not escape. An allocation escapes when it is returned, stored into a parameter or a field of one, passed to any call, or captured by a closure.
   - Effect: value reading of a unit's output is allowed only when no allocation escapes and no parameter is written. The identity guard in item 25 still applies.
   - Cost: 2 days (CLAIM).
   - Validation: the census units counted by allocation class, and the pairs `alias_refactor` and `heap_graph`.
6. **Open questions.** The 35 percent figure is a JIT statistic over candidate methods. It is not an estimate of lean's eligible units. The census count is the number that matters.

### 27. Rust ownership and RustBelt

1. **What it is.** Ownership and borrowing as a type-system discipline, with RustBelt as the semantic foundation. Source opened: `https://plv.mpi-sws.org/rustbelt/popl18/paper.pdf` (POPL 2018, Jung, Jourdan, Krebbers, Dreyer). The fetch returned a binary; the title and authors were read from the saved text.
2. **Mechanism.** Ownership prevents two live mutable references. Shared ownership types reintroduce aliasing.
3. **Lean today.** Not applicable. TypeScript has no ownership.
4. **Verdict.** REFERENCE. It supports the point that a value view needs a proof that no alias is live.
5. **How.** Not applicable.
6. **Open questions.** Whether a TypeScript subset can be given an ownership discipline. Not established by the source.

### 28. Korat

1. **What it is.** Automated testing from a Java predicate, generating non-isomorphic structures up to a size bound. Source opened: `https://mir.cs.illinois.edu/marinov/publications/BoyapatiETAL02Korat.pdf` (Boyapati, Khurshid, Marinov, MIT LCS). Licence and artifact: not stated.
2. **Mechanism.** Enumerates structures that satisfy a predicate. A reference field may be null, an existing node or a fresh node. A visited-node check admits cycles. The research result's statement of this mechanism is CLAIM, since the excerpt read gave only the title and authors.
3. **Lean today.** `exec/gen.mjs:80` (`aliasInputs`) shares and self-references inputs at random. It sets a 40 percent chance of no change, a 50 percent chance per group member to share a first object, and a 20 percent chance of a self-reference, at depth three.
4. **Verdict.** PORT.
5. **How.**
   - Files: `exec/gen.mjs`, a new export `enumerateHeaps(spec, k)` that yields argument tuples for one shape up to k objects. `exec/run.mjs` is unchanged.
   - Input: the parameter spec and a size bound k. Output: argument tuples, deduplicated by the graph naming in `exec/graph.mjs:33`, so each tuple is a different graph.
   - Effect on the verdict: lane B finds more separating inputs. A WITNESS still needs a replayed run.
   - Cost: 3 days (CLAIM).
   - Validation: the pair `heap_graph` (expected add_tag false, alias_refactor true, as recorded in `langs/ts/tests/pairs/heap_graph/expect.json`), and a bench on the alias domain. The count of distinct graphs per shape is the measurement.
6. **Open questions.** The number of graphs grows fast with k. The research result's counts for BinaryTree are CLAIM, not read in the paper.

### 29. Symbolic PathFinder

1. **What it is.** A JPF extension for symbolic execution of Java bytecode. Source opened: `https://github.com/SymbolicPathFinder/jpf-symbc` (licence not stated on the page; 90 commits; no date shown).
2. **Mechanism.** Symbolic execution with lazy initialisation of references. The research result describes lazy initialisation as null, a fresh instance, or an existing object (CLAIM for this detail).
3. **Lean today.** `exec/gen.mjs:80` samples the same three choices at random.
4. **Verdict.** REFERENCE. The lazy-initialisation choice is already in lean's generator. The JVM is not a dependency.
5. **How.** Not applicable.
6. **Open questions.** None for lean.

### 30. Randoop

1. **What it is.** Feedback-directed random test generation for Java. Source opened: `https://github.com/randoop/randoop` (MIT stated; 4,865 commits; no date shown).
2. **Mechanism.** Builds random sequences of method calls and keeps the ones that extend coverage. Contract checks act as oracles.
3. **Lean today.** `exec/run.mjs` runs both sides on generated inputs and compares observations.
4. **Verdict.** REFERENCE.
5. **How.** Not applicable.
6. **Open questions.** Sequences of calls on a shared heap are not in lean's generator. A candidate for a later stage.

### 31. UDITA

1. **What it is.** A language for writing test generators, combining declarative filters with imperative generators. Source opened: `https://mir.cs.illinois.edu/udita/` (the page lists archives and no licence; the release date is not stated; the page lists a 2009 technical report and an ICSE 2010 paper).
2. **Mechanism.** The generator language filters and builds structured inputs, including shared and cyclic ones.
3. **Lean today.** `exec/gen.mjs:8` (`generator`) draws boundary values and literals.
4. **Verdict.** REFERENCE.
5. **How.** Not applicable.
6. **Open questions.** Licence and a maintained release.

### 32. CMC incremental heap canonicalisation

1. **What it is.** An incremental algorithm for canonical rooted-heap representations in model checking. Source opened: the Microsoft Research technical report `https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/tr-2004-37.pdf` (Musuvathi and Dill, "An Incremental Heap Canonicalization Algorithm", CMC and Zing). The saved text confirms "at most 5% of the heap per transition" and speedups of x2.15, x3.59 and x8.85.
2. **Mechanism.** Canonicalises a rooted heap by traversal from the roots, so isomorphic heaps get the same representation. Unreachable objects are dropped. Incremental updates touch only changed paths.
3. **Lean today.** `exec/graph.mjs:33` (`Graph`) names every reachable object by a deterministic traversal from the arguments, the receiver and the outcome, and re-traverses from pre-call objects after the call. `translate/heap.mjs:251` allocates by a counter, so identity is by allocation order. `design/heap-layer.md` lines 72 to 80 state the soundness conditions for canonical numbering.
4. **Verdict.** PORT.
5. **How.**
   - Lane B needs no change. `graph.mjs` already canonicalises the observed graph.
   - Proof side: add `Canon(hw, roots)` in the heap core, as `design/research-integration.md` section 1 already plans. The lemma becomes `Canon(parent) == Canon(candidate)`. It replaces the whole-heap `next` equality.
   - Files: `translate/heap.mjs` (the function), `spec/theorem.py` (the lemma).
   - Effect: units whose two versions allocate in different orders become provable. The current certificate leaves them as ASK.
   - Cost: 5 days (CLAIM).
   - Validation: a new pair where the two versions allocate objects in different orders, expected PASS-proved after the change. The corpus count of units that change verdict (ASK to PASS-proved) on the census.
6. **Open questions.** The incremental hashing part is not needed for lean, since lean does not hash states. The solver cost of the recursive `Canon` is unmeasured.

### 33. KJS

1. **What it is.** An executable complete formal semantics of ECMAScript 5.1 in the K framework. Source opened: `https://github.com/kframework/javascript-semantics` (no licence stated; 206 commits; no date shown). Paper opened: `https://fsl.cs.illinois.edu/publications/park-stefanescu-rosu-2015-pldi.pdf` (PLDI 2015).
2. **Mechanism.** Runs ECMAScript programs through a K-defined interpreter. It passes the ES5 conformance suite.
3. **Lean today.** Not applicable.
4. **Verdict.** REFERENCE. It is a candidate oracle for witnesses, but it needs the K framework and a Java runtime.
5. **How.** Not applicable. The paper's excerpt confirms 2,782 core tests.
6. **Open questions.** The research result's "an hour for the suite" is CLAIM.

### 34. JSCert

1. **What it is.** A Coq specification of ECMAScript 5 with a verified reference interpreter. Source opened: `https://github.com/jscert/jscert` (licence file present but not named on the page; 1,616 commits; no dates).
2. **Mechanism.** The semantics is mechanised in Coq. The build needs Coq 8.4.6, OCaml 4.x and Java, then `make init` and `make`.
3. **Lean today.** Not applicable.
4. **Verdict.** REFERENCE.
5. **How.** Not applicable.
6. **Open questions.** Coq 8.4.6 is old.

### 35. JaVerT

1. **What it is.** A semi-automatic verifier for JavaScript using JSIL, separation logic and Z3. Source opened: the Imperial paper `https://vtss.doc.ic.ac.uk/publications/FragosoSantos2018JaVerT.pdf` (the saved text describes the approach, with BST and insertion-sort examples). Licence and artifact: not established.
2. **Mechanism.** Abstract predicates over JavaScript heap structures, verified by symbolic execution.
3. **Lean today.** `translate/heap.mjs` has concrete total field transitions, not abstract predicates.
4. **Verdict.** REFERENCE.
5. **How.** Not applicable. The research result's timings (7.38 s, 1.78 s) were not found in the saved text read. They are UNVERIFIED.
6. **Open questions.** Whether its JavaScript object model covers the prototype chain.

### 36. ESMeta

1. **What it is.** An ECMAScript specification metalanguage that extracts and runs a model of ECMA-262. Source opened: `https://github.com/es-meta/esmeta` (BSD-3-Clause stated; 1,250 commits; no latest-commit date shown).
2. **Mechanism.** Extracts the spec's algorithms and runs them as an interpreter. Install with `sbt assembly` (JDK 17 or later).
3. **Lean today.** Not applicable.
4. **Verdict.** REFERENCE. It is a JVM tool, so it fails the node or python rule for a dependency. It could give a spec-level oracle for built-in behaviour.
5. **How.** Not applicable.
6. **Open questions.** Whether its semantics of `Object.assign` and `sort` can be used as a checked oracle.

### 37. ECMAScript and HTML object operations

1. **What it is.** The normative semantics of built-ins that touch identity: `Object.assign` (ECMA-262), `Array.prototype.sort` (ECMA-262), and structured clone (HTML). Sources opened: `https://html.spec.whatwg.org/multipage/structured-data.html` and `https://tc39.es/ecma262/multipage/indexed-collections.html`.
2. **Mechanism.** The HTML page states that structured serialisation "ends up preserving cycles and the identity of duplicate objects in graphs." Its `structuredClone` returns "a deep copy." The `sort` section was not reached in the text read (the fetch returned table of contents only, then stopped), so the comparator-consistency sentence is UNVERIFIED.
3. **Lean today.**
   - `lint/lint.mjs:30` lists `Object`, `structuredClone`, `Promise` and others as effect-world names. A use of them is refused as an effect outside the model.
   - `translate/translate.mjs:4061` marks any `Object.assign` call as guarded.
   - `translate/translate.mjs:2809` lowers `sort` with a comparator to an external function taking the comparator as a lambda. The external is identical on both sides.
4. **Verdict.** PORT for `Object.assign`. `structuredClone` stays ASK, as it is now.
5. **How (Object.assign).**
   - Files: `translate/heap.mjs` (a transition `Assign_<shape>` that copies each own enumerable key of the source into the target in key order, through the existing `Set_` transitions), and `translate/translate.mjs:4061` (lower the call to that transition instead of guarding it).
   - Refusals kept: getters, setters, proxies, and a source that is the target.
   - Input: the target reference and the source value. Output: the next heap world.
   - Effect: a unit using `Object.assign` on its own records becomes provable instead of ASK.
   - Cost: 4 days (CLAIM).
   - Validation: a new pair `assign_copy` with a parent that copies into a fresh object and a candidate that copies into an input (expected a difference), and a bench on the alias domain.
6. **Open questions.** The sort comparator rule. The ES text for `sort` must be read before any lowering changes. Structured clone identity: a clone is a new object, so it is an allocation and needs the `Canon` work in item 32 before it can be a PORT.

### 38. RML observational-equivalence decidability

1. **What it is.** Decidability results for observational equivalence of a reference-language fragment. Source opened: `https://arxiv.org/abs/1501.04511` (Cotton-Barratt, Hopkins, Murawski, Ong, submitted 19 January 2015).
2. **Mechanism.** The paper gives two decidable subfragments: order at most 1, with free variables of order at most 2. Observational equivalence is undecidable at third or higher order.
3. **Lean today.** Not applicable.
4. **Verdict.** REFERENCE. It bounds what any decision procedure for a typed fragment can cover.
5. **How.** Not applicable.
6. **Open questions.** None for lean.

### 39. Separation-logic entailment complexity

1. **What it is.** A complexity result for entailment between symbolic heaps with inductive predicates. Source opened: `https://arxiv.org/abs/2004.07578` (Echenim, Iosif, Peltier, submitted 16 April 2020).
2. **Mechanism.** The abstract states that deciding entailment between predicate atoms is 2-EXPTIME-hard, by reduction from alternating exponential-space machines.
3. **Lean today.** Not applicable. Lean's proof lane uses Dafny, not a separation-logic entailment checker.
4. **Verdict.** REFERENCE. It bounds the cost of a separation-logic route for heap invariants.
5. **How.** Not applicable. The research result said "2-EXPTIME-complete"; the abstract says "hard". The page did not show the conditions (progress, connectivity, establishment).
6. **Open questions.** Whether a fragment usable by lean has a practical decision procedure.

### 40. Trivet

1. **What it is.** LLM-assisted LLVM translation validation with Lean-checked proofs. Source opened: `https://arxiv.org/abs/2609.19583` (Liao, Xu, Zhou, Zhang, Sun; submitted 17 September 2026). Code: none on the page. Licence: the CC0 paper licence only.
2. **Mechanism.** A language model proposes proof scaffolds. Lean's kernel checks the resulting proofs. The paper verifies or refutes 147 of 148 LLVM transformations.
3. **Lean today.** `check.mjs:58` relies on Dafny's verifier as the trusted checker. A proof either checks or it does not.
4. **Verdict.** REFERENCE. The model may propose, the kernel decides. Lean already keeps that rule: no model is in the loop, and only a checked proof gives PASS-proved.
5. **How.** Not applicable. The paper's figures (147 of 148; 75.9 percent mean proof time reduction; 88 percent cost reduction on cases both configurations solved) were read from the abstract.
6. **Open questions.** Whether the paper's scaffolding idea fits a Dafny proof. Lean forbids model use in the verdict path, so any such use would be an offline suggestion only.

## Blocker

None blocks the file. Unverified primary sources: items 13, 14, 21 (fetch refused or redirected), and the ECMAScript `sort` text in item 37. Those verdicts rest on the research result's description and are marked as such.
