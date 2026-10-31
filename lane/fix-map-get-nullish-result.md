# fix-map-get-nullish: result (2026-10-31)

Branch `lane/fix-map-get-nullish`, base lean `lead-30569d74`.

## Commits
- `56b73be02` pair `map_get_nullish` (red: the theorem refused, prelude block `Find_int` differs between parent and candidate).
- `63566cdae` translate: an Option's constructor is `Option.Some` on every side and in every prelude text, the heap's
  table rows included (`MapGet_<shape>`); a `case` pattern stays bare. Pair `map_get_nullish`: red -> ALL PASS.
- `c19e95781` tests/run.mjs: the cached theorem step keys on `parent.pre.dfy` and `candidate.pre.dfy` too (a change in a
  prelude alone replayed the theorem written before it; found when the shared cache read 3 FAILED and a fresh one ALL PASS).
- `af911dd9b` pair `string_union_order` (red: 4 rows, no unit in the heap core).
- `5d0693f0a` heap: an order of two values whose shape is the primitive string (a literal union, a branded string)
  reads `StrLt`. Pair `string_union_order`: 4 FAILED -> ALL PASS.
- `4c1654697` design/heap-stage5.md, "8b, the two places it left" (2026-10-31).

## The defect, read
`qualify` already wrote `Option.Some` when a file used `Nullish`; each side decided it alone, and the theorem merges
both sides' preludes. One side's `Nullish` met the other side's bare `Some` (resolution error) or the same prelude block
written two ways (refused). The heap's prelude rows were never qualified. The rule is now independent of the file.

## Regression (each pair `JOBS=1 node langs/ts/tests/run.mjs --pair <p>`)
- After `63566cdae`/`c19e95781`: 72 pairs (every pair named for Map, nullish, Option, absences, dict; every pair whose
  sources use `.get(`, `??` or `.find(`; heap_canonical, type_tests, copied_argument, stage4_corrections): 71 ALL PASS.
  `map_block` 1 FAILED (`Equal_labels_inner` not proved): the same at base `30569d746` (run there: same row red), the
  theorem text byte-identical on both, Dafny reports the postcondition (not a timeout). Pre-existing in the lead; a finding,
  left as it is.
- After `5d0693f0a`: 28 pairs (every pair named for orders, strings, unions, literals, brands, enums, operators; plus
  heap_canonical, type_tests, copied_argument, stage4_corrections, heap5_absences, string_union_order): 28 ALL PASS.
  `map_get_nullish` ALL PASS on the final head.

## Census
n8n and langchainjs: not run. The memory rule's gate (at least 12 GB available and `pgrep -fc census.mjs` below 6,
checked every 300 s) never opened from 04:37 to 06:32 UTC: memory was available (31 to 68 GB), but 21 to 28 census
processes were running throughout; the gated job then reached its time limit. The script and its gate log are
`/tmp/fmgn/scripts/census.sh` and `/tmp/fmgn/census.txt` (base `30569d746` against this branch, `census.mjs --diff`);
the lead can run it when the machine is quiet.
nexus: not run, memory.

## Left
- The census (above): not run, the gate never opened.
- `map_block` `Equal_labels_inner` not proved at base and here (above).
- An order over a type parameter bounded by `string` stays out of the heap core (no shape); an order over a literal
  union with an absence stays out (no Option order reads `undefined < 'a'`).
