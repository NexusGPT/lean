# Changelog

One entry per admission to `master` or `lean-dev`, newest first. Each names the head admitted, the suite that admitted it (every check green, or the entry says so), and what landed. Heads are the lean repository's. A release tag marks an admitted head.

## v0.1.0, 2026-10-30, master b9faf2bd (lead head f3cb5b41)

Suite: 4,072 checks, ALL PASS (2,033 s at JOBS 11). Landed: the pooled suite runner with a step cache keyed by inputs and producer; the converter (`convert.mjs`: the lint's rewrites applied, a file kept only when the pull-request table finds no WITNESS on a function it changed); three bench mechanisms; two false proofs closed; a lane B bound that fits the machine (CPU time per unit, a far wall guard, load-scaled watchdogs); the certificate's draw record; the special numbers (NaN, the infinities, -0) drawn by lane B and read by the doubles lane.

## 2026-10-29, master 04d0418c (lead head 0ea7a792)

Suite: 4,032 checks, ALL PASS. Landed: the doubles lane (a number-bearing unit decided over IEEE-754 binary64 in SMT-LIB QF_FP, the faithful reading beside it); shared file analyses and a content-keyed lowering cache; every verdict with its draw record and the lean head read once per process; callback behaviour as lane B's drive; child workers under a JOBS pool; the census strata (written, generated, minified); the lead's corrections, each a general mechanism (program-built against engine-made errors, a nested callback's class context, the world's own functions by name, canonical argument order for commutative operations, the element-tree renderer's one definition).

## 2026-10-28, lean-dev 2543419e (head 6661006) and 334a962b (head 6589b7d)

Suite on 6589b7d: 3,138 checks, ALL PASS. Landed: twenty-one lanes since e0eceda, then the night's three post-admission lanes (unloadable-ask, prelude-unit, ten-mutants) and the morning's four (race-lines, comma-operator, hash-keys, the shared-object pool).

## 2026-10-27, lean-dev 5417b0c0 (head e0eceda)

Landed: the heap layer (references, layer 2, with the identity guard and the library transition table validated against Test262), stage 5 of the lint's readings (ranks 13 to 21), the finite-state lane (PASS-decided for components finite by their types), the front-end integration (every verdict names its layer; Rules of React as refusals), the README with its illustrations. The concept bench on e0eceda: 995 inside, 913 translated, 1,718 of 2,430 witnessed.
