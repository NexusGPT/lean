# w1a-opaque-mutation: result (2026-11-01)

Branch `lane/w1a-opaque-mutation`, cut from `lead-vm` 4747022f. Design note: `langs/ts/design/w1a-opaque-mutation.md`.

## What landed

- The opaque column (A7): `lint/lint.mjs` `OPAQUE_ROWS` (`block | statement | expression | none`), the thirteen
  mutation-family rules graded `block`; a graded finding keeps its rule and message and carries `opaque: "block"`.
  The lint lists graded findings labelled `[opaque: block]` (or `[opaque: block; the unit stops on another refusal]`);
  they refuse nothing.
- `lower.mjs`: a graded finding stops no unit when the translator runs; a unit it reads holds its graded findings
  (`opaque: [...]`) and the reading `opaque` (readings.mjs, new entry, owning no rule and no kind).
- `translate/opaque.mjs` (the shared helper; schema commit 29a0acc082 sent to the group): the key (`opaqueText`,
  tokens), `opaqueKey`, the step (`opaqueForm`), the certificate row (`opaqueEntry`, `opaqueLine`, `opaqueLines`),
  `statementCount`, and the mutation family's block start (`heapOperation`, `prefixDeclaration`, `blockStart`).
- `translate/translate.mjs`: a unit with sites emits its block as one step `Opaque(id, reads) -> (world', result,
  outputs)`; translator refusals of a graded rule become sites (`translateGraded`); a write through a const alias of a
  handed node in a unit the value reading emits is refused (alias-mutation, so graded): the value reading lost that
  write before (the A2 pair's own unit: model 1 against Node 2, withheld only by the identity guard).
- The certificate: `lanes.A.opaque = { steps: [{ rule, line, id, reads, writes, construct, span, findings,
  statements }], fraction, statements, covered, parent }`; `pr.mjs` shows `(opaque N)` beside lane A.
- `tests/break.mjs` (A6): `LEAN_BREAK=<mechanism>`, `broken(name)`, the registry, the `break` rows of a pair.
  Mechanisms: `opaque-drop-read`, `opaque-drop-write`, `opaque-drop-callees`.
- Pairs: `opaque_<rule>` for the thirteen rules plus `opaque_callee` (A3).

- Regressions the ladder made in the suite, each fixed at its mechanism (6eb4aa0adf; base `lead-vm` 879 checks all
  pass, the tree at 0952b040ef failed 12 of 1062): the product reads the break switch from `langs/ts/break.mjs`
  (`tests/break.mjs` keeps the registry and re-exports it), so a copy of the product without `tests/` loads again
  (no-silent-exit-importers, dafny-resource-limit, lowering-cache); the advisory listing (`lintFindings` with
  `advisory`) carries every graded finding whole with `graded`, label and advice, so `convert.mjs` applies its
  rewrites again (map-bucket, record-spread) and the eslint plugin names them as opaque; `lint --opaque-refuses`
  and `conformance.json` `escape_lint` keep every escape named by `conformance/run.py` (218/252 before, 252/252
  after); carried-alias, census-report, pr-intake (its refused file is now a `var` refusal) and apply-call
  assert the graded reading.
- A unit read whole (accessor or static method keyed by the file text; the module reading keyed by the code it
  reaches, a body refusal's fallback included) holds its graded sites in that step and lists it as `construct:
  "unit"` (6eb4aa0adf, cc1dea3e74).

## The suite, the pairs, conformance

| what | command | result |
|---|---|---|
| suite, lead-vm 4747022f (baseline) | `cd /root/lanes/w1a-opaque-mutation/base && JOBS=2 LEAN_PAIRS=alias_result,array_copies_alias node langs/ts/tests/run.mjs` | 879 checks, ALL PASS, 1045 s |
| suite at 0952b040ef (before the fixes) | `JOBS=2 LEAN_PAIRS=<opaque_*>,alias_result,array_copies_alias node langs/ts/tests/run.mjs` | 1062 checks, 12 FAILED (all regressions of the ladder, listed above) |
| suite at 6eb4aa0adf | the same | 1063 checks, ALL PASS, 1495 s |
| each pair at 681d3d9ad1 | `node langs/ts/tests/run.mjs --pair opaque_<rule>` (15 pairs) | all pass: alias_mutation 20 checks (both breaks flip), callee 3, the rule pairs 11 or 13 each, values 23 |
| model conformance on the pairs | `LEAN_PAIRS=<the 15 opaque_* pairs> node langs/ts/conformance/run.mjs --jobs 2` | 74 units, 5 executable: 5 agree, 0 disagree; NO NEW FINDING |
| repository conformance | `python3 -I conformance/run.py ts` | 252 of 252 (218 of 252 before `escape_lint`) |
| helper unit test and its break | `node langs/ts/tests/opaque-unit.mjs`, `... --break` | passes; red under the break |

The breaks (A1/A6), each a suite row: `LEAN_BREAK=opaque-drop-read` turns `Equal_flows` (a change outside the block
reaching it through its scalar read) into a false PASS-proved; `opaque-drop-write` turns `Equal_after` (a caller
reading `b.inner.v` after `bump`, whose block writes `b` through an alias) into one; `opaque-drop-callees` turns
`Equal_via_callee` (A3: a callee changed only at `x === 7919`) into one. Each of the thirteen rule pairs carries its own `opaque-drop-read` break row (its unit `flows`, a change outside the block through a read); every one flips.
The A2 pair (`count`) is never PASS-proved:
lane A withholds it (nested write through an input), lane B WITNESS.

## The census (A8 roots: pyka, nutshell, langchainjs)

Before: lead-vm (`/root/lanes/w1a-opaque-mutation/base`); after: the tree. Command per root (load read first, one
root at a time):
`node langs/ts/census.mjs /root/census-installs/w1a/<root> --install-under /root/census-installs/w1a --out <json> --report <md>`;
the comparison: `node lane/w1a-opaque-mutation-compare.mjs /root/census-installs/w1a/<root> <before.json> <after.json> <abs tree>/langs/ts --fractions <out.json>`
(per rule: the units the rule stopped before and after, by the first rule per unit; the units newly entered; the
units the rule stopped before that another rule stops now; the opaque fraction of each newly entered unit, read off
its `// OPAQUE` line, one translation per unit). pyka and nutshell after: 681d3d9ad1 (nutshell with
`NODE_OPTIONS=--max-old-space-size=8192`); langchainjs after: 0952b040ef (04:33, before the whole-unit rows and the static-method grading; the rerun at 681d3d9ad1 is pending: its 6 residual alias-mutation stops are the static methods 6eb4aa0adf grades).

Per rule, before / after / newly entered:

| rule | pyka | nutshell | langchainjs | total |
|---|---:|---:|---:|---:|
| `alias-mutation` | 28 / 0 / 16 | 185 / 0 / 64 | 89 / 6 / 23 | 302 / 6 / 103 |
| `param-assign` | 0 / 0 / 0 | 0 / 0 / 0 | 3 / 0 / 0 | 3 / 0 / 0 |
| `param-mutation` | 9 / 0 / 2 | 100 / 0 / 37 | 18 / 0 / 4 | 127 / 0 / 43 |
| `property-assign` | 8 / 0 / 7 | 10 / 0 / 3 | 32 / 0 / 12 | 50 / 0 / 22 |
| `index-assign` | 5 / 0 / 2 | 15 / 0 / 6 | 49 / 0 / 21 | 69 / 0 / 29 |
| `in-place-mutation` | 2 / 0 / 1 | 31 / 0 / 15 | 5 / 0 / 2 | 38 / 0 / 18 |
| `closure-mutation` | 22 / 0 / 12 | 124 / 0 / 65 | 17 / 0 / 6 | 163 / 0 / 83 |
| `opaque-mutation` | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| `receiver-mutation` | 0 / 0 / 0 | 48 / 0 / 6 | 5 / 0 / 4 | 53 / 0 / 10 |
| `receiver-write` | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| `object-method-capture` | 0 / 0 / 0 | 3 / 0 / 1 | 0 / 0 / 0 | 3 / 0 / 1 |
| `object-method-mutation` | 0 / 0 / 0 | 0 / 0 / 0 | 2 / 0 / 1 | 2 / 0 / 1 |
| `mutator-value` | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |

| root | units | entered before | entered after | delta | family stops before | after | newly entered | now stopped by another rule |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| pyka | 2966 | 1324 | 1370 | +46 | 74 | 0 | 40 | 34 |
| nutshell | 10511 | 6156 | 6430 | +274 | 516 | 0 | 197 | 319 |
| langchainjs | 6709 | 2954 | 3022 | +68 | 220 | 6 | 73 | 148 |

Every rule of the family stops 0 units on pyka and nutshell. The entered count rises by less than the family
stopped: of the units the family stopped first, a share (pyka 34 of 74, nutshell 319 of 516, langchainjs 148 of
220) now stops on the next refusal the unit holds (most: read-after-call, type-assertion, library, promise,
copied-argument). Those rules are other lanes'. The "entered up by at least what they stopped" criterion therefore
holds only for the units the family alone stopped (entered delta 46 >= 40 on pyka, 274 >= 197 on nutshell: the rest
of the delta are callers and callbacks that entered with them).

langchainjs: one package (`libs/providers/langchain-exa/src/tools.ts`) needs about 6.6 GB of heap in the lowering
and the walker's default 4 GB limit aborts it (SIGABRT, 318 of 1486 files not walked). The blow-up is not new:
lead-vm's own census aborts on it with `LEAN_CACHE=0` (`--include libs/providers/langchain-exa`, exit 134); its
cached lowering had hidden it, and any change to the lowering's producers invalidates that cache. With an 8 GB heap
it completes (lead-vm and the tree both: 11 units, 8 inside). Open for the census owner.

## A5: the opaque fraction (threshold: median at most 0.25) -- NOT MET

| root | newly entered | measured | median | p25 | whole unit (1.0) | at most 0.25 | translated, no step listed |
|---|---:|---:|---:|---:|---:|---:|---:|
| pyka | 40 | 36 | 1 | 1 | 33 | 0 | 4 |
| nutshell | 197 | 159 | 1 | 0.923 | 118 | 1 | 38 |
| langchainjs | 73 | not measured | | | | | |

The block rung cannot meet the threshold, and the design note says why ("Why the opaque step cannot be one statement
here"): the value reading has no term for sharing, so the step must run from the first statement that may touch a
reference to the end of the unit, and in this family that is nearly every statement. No step's span equals its
finding's span (0 of all measured). What would meet A5 is a second rung in the heap core, where references are cells
and an opaque statement reading and writing the heap is sound by the effect axiom alone. That rung is not built (open).
"Translated, no step listed": the unit's own body holds no site; on pyka all 4 were read by hand and each finding sits
in a nested function the unit hands on as a value (a JSX `ref` callback, a nested unit with its own step): their
fraction is 0. nutshell's 38 were not read one by one. w3b's mutant study on these units has not run in this lane.

## Open

- A5's threshold (above): the heap-core statement rung.
- w3b's mutant study on 50 newly entered units.
- The langchain-exa lowering blow-up (6.6 GB), pre-existing.
- `langs/ts/tests/ci/refusals.test.mjs` and `langs/ts/ci/comment.test.mjs` fail identically on lead-vm (not suite
  rows; not this lane's).

