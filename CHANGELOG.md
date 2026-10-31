# Changelog

One entry per admission to `master` or `lean-dev`, newest first. Each names the head admitted, the suite that admitted it (every check green, or the entry says so), and what landed. Heads are the lean repository's. A release tag marks an admitted head.

## v0.1.2, 2026-10-30, master at tag `v0.1.2` (suite at lead head b5c07450; this changelog commit on top)

Suite: 4,277 checks, ALL PASS (928 s at JOBS 28 on the server); 41 checks more than v0.1.1, the two new pairs. Landed: a type read at any depth, the depth bound of the type mapper replaced by a guard on the descent path (a record met again on its own path is a recursive datatype, any other type met again is opaque, as is every type on that loop; pair `types_depth`, `design/types-depth.md`); a unit takes the type parameters of the declarations around it that it reads, matched by declaration and never by name, with `super` read as `this` is (pair `types_enclosing_params`, `types-inventory.md` form 2); the pull-request report's ledger comment found by the parse tree, comment-only; the values line of the intake table with its cap; `--block` deciding from every row of the table.

## v0.1.1, 2026-10-30, master at tag `v0.1.1` (suite at lead head e860d52a; two documentation commits on top)

Suite: 4,236 checks, ALL PASS (750 s at JOBS 28); the two `heap_canonical` rows red in v0.1.0 prove. Landed: a field read or a one-level write after a transition read as a world read (`ext_now`), which closed a false proof the narrowed read-after-call had admitted (a restore `const y = p.y; f(p); p.y = y`); a held value carried into a callee declared in another module as an outside call's input (agent-nexus's type-assertion first refusals 184 to 53); the faithful number reading decides numbers through the held decision, so a commuted held sum is no longer proved; one Z3 looked up once for the doubles run, Dafny and the certificate's record, the step cache keyed by the Dafny and Z3 versions, and the canonical walk's fuel computed from the generated text (the heap_canonical rows red in v0.1.0 prove); the sandboxed children under the permission model with lean's own environment only; Python milestone 2 (lint advice naming the rewrite, lane B in the TypeScript record shape, five pairs, filter and map helpers per element type with congruence lemmas); the self-check workflow green on GitHub runners.

## v0.1.0, 2026-10-30, master 3ef57e07 (lead head 2a6c7bb6)

Suite: 4,206 checks, 2 red, both rows of `heap_canonical` (a canonical-walk lemma Z3 4.12.1 gives up on at a fixed fuel of 20; red in master f3cb5b41 already, where earlier green suites had replayed it from the step cache; fixed in v0.1.1). Landed with the first tagged admission: read-after-call narrowed to reads that take no world, one decision shared by lint and translator; `certificate.timing` per lane and `bin/lean`; the container image (node 24.22.2, Dafny 4.11.0, Z3 4.12.1); the sandbox boundary measured by probes and `LEAN_NET=deny`; a strict-mode error's value read at Any with strictness as advice; a held value read at Any in a literal's field, a callee's parameter, a held result and a compound write; the types refusal inventoried by type form; the README for the next read. Under the earlier lead head f3cb5b41 (suite 4,072 checks, ALL PASS, 2,033 s at JOBS 11) landed: the pooled suite runner with a step cache keyed by inputs and producer; the converter (`convert.mjs`: the lint's rewrites applied, a file kept only when the pull-request table finds no WITNESS on a function it changed); three bench mechanisms; two false proofs closed; a lane B bound that fits the machine (CPU time per unit, a far wall guard, load-scaled watchdogs); the certificate's draw record; the special numbers (NaN, the infinities, -0) drawn by lane B and read by the doubles lane.

## 2026-10-29, master 04d0418c (lead head 0ea7a792)

Suite: 4,032 checks, ALL PASS. Landed: the doubles lane (a number-bearing unit decided over IEEE-754 binary64 in SMT-LIB QF_FP, the faithful reading beside it); shared file analyses and a content-keyed lowering cache; every verdict with its draw record and the lean head read once per process; callback behaviour as lane B's drive; child workers under a JOBS pool; the census strata (written, generated, minified); the lead's corrections, each a general mechanism (program-built against engine-made errors, a nested callback's class context, the world's own functions by name, canonical argument order for commutative operations, the element-tree renderer's one definition).

## 2026-10-28, lean-dev 2543419e (head 6661006) and 334a962b (head 6589b7d)

Suite on 6589b7d: 3,138 checks, ALL PASS. Landed: twenty-one lanes since e0eceda, then the night's three post-admission lanes (unloadable-ask, prelude-unit, ten-mutants) and the morning's four (race-lines, comma-operator, hash-keys, the shared-object pool).

## 2026-10-27, lean-dev 5417b0c0 (head e0eceda)

Landed: the heap layer (references, layer 2, with the identity guard and the library transition table validated against Test262), stage 5 of the lint's readings (ranks 13 to 21), the finite-state lane (PASS-decided for components finite by their types), the front-end integration (every verdict names its layer; Rules of React as refusals), the README with its illustrations. The concept bench on e0eceda: 995 inside, 913 translated, 1,718 of 2,430 witnessed.
