# conformance-disagree: result (2026-10-31)

Base lead-30569d74 (v0.1.2 plus the night merges); head: this branch. Logs and JSON: `/root/lanes/conformance-disagree/conf-30569d74.{log,json}`, `conf-head.{log,json}` (not committed).

| run | units | executable | agree | disagree | new | exit |
|---|---|---|---|---|---|---|
| base 30569d74, all 278 pairs, --jobs 8 | 1604 | 595 | 510 | 85 | 7 | 1 |
| head, all 278 pairs, --jobs 8 | 1604 | 595 | 512 | 83 | 0 (NO NEW FINDING) | 0 |

Unit statuses that moved between base and head: types_symbol_bigint fee and orElse, DISAGREE to agree; nothing else. Known findings not seen: 0 at both.

Attribution: `known-findings.json` was not touched between 9b2c6733 and the base, and the row was green at 9b2c6733, so the 78 known units were all disagreements before the night. Each of the 7 new units belongs to a pair that did not exist at 9b2c6733 (`git log --diff-filter=A` on its expect.json), so the merge that added the pair introduced it, and no bisect over earlier merges applies (the unit is absent there).

| pair | units | count (input, side) | kind | merge | resolution |
|---|---|---|---|---|---|
| adapters | pick, shift | 2 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| array_copy_identity | spreadSame, sliceSame, concatSame, bothCopied | 100 | a boolean (array identity) | before 9b2c6733 (known at v0.1.2) | known finding: array identity: the executable model compares two arrays by value, so `b === a` after a copy |
| blocker_unresolved_type | negated | 2 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| class_handles | spill | 3 | a number | 7100db7d9 (core-class-handles) | known finding added: write through a second name of an input in the value reading; GUARD names it, lemma withheld |
| computed_literal_keys | byStatus, counts, partial | 6 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| conditional_expressions | note, plain | 4 | a number (-0) | 30569d746 (core-conditional-expressions) | known finding added: signed-zero class, -0 passed through untouched |
| constructors | metered | 2 | a number (-0) | 8d4c27a9c (core-constructors) | known finding added: signed-zero class, -0 passed through untouched |
| dynamic_reads | optional, undefinedValues | 4 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| heap5_conditional | caption, count | 4 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| heap5_literals | title, reset, clear | 6 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| heap5_module | key, tagged | 4 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| heap5_template | badge, handle | 4 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| heap5_tuples | make, tagOf | 4 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| heap_3 | built, copyBag, copyRec, rename, clear, markRead | 11 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| heap_enumerated | writeThenRead | 1 | a number | before 9b2c6733 (known at v0.1.2) | known finding: aliased arguments: one object at two places of the input |
| heap_optional | display, greeting, pad, forget | 7 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| heap_shapes | off | 2 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| inline_callee | rename, nameOf | 4 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| lint_misfires | blockShadow | 1 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| logic_values | kind | 2 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| map_block | labels, sizes, labelsInner | 6 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| mixed_logic_values | nullishNumber | 1 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| mutation | addTag, rename, tagTwice, countOnly | 8 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| null_undefined | nullableDefault, untouched, coalesce, nullOnly, boundary, nullEcho, boundaryResult, andAbsence | 15 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| numbers_bits | numericIdentity | 2 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| open_datatype | copyRec, assignCopy, restOf | 6 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| operands_arguments | first, second | 2 | a number | before 9b2c6733 (known at v0.1.2) | known finding: 2^53: the model is exact, Node rounds to binary64 |
| operators_values | path, localPostfix, assignedCoalesce, assignedNullable | 7 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| param_rebind | drained | 2 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| promise_module_nullish | widened | 2 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| proof_hunt_13 | spreadCopy | 2 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| proof_hunt_2 | bang | 1 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| proof_hunt_8 | negZero, bigInt | 2 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| reach_absent | Changed.f | 1 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| rename_parameter | width | 1 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| signed_zero | normalized, plusZero | 2 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| small_forms | build | 2 | a record (dictionary) | before 9b2c6733 (known at v0.1.2) | known finding: value |
| spread_outside | appendAbsent | 2 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| this_receiver | sameOf | 2 | a number (-0) | before 9b2c6733 (known at v0.1.2) | known finding: signed-zero: model collapses -0 |
| tuples_intersections | entry | 2 | a number (-0) | 9c3a9341a (core-tuples-intersections) | known finding added: signed-zero class, -0 passed through untouched |
| types_symbol_bigint | fee, orElse | 120 | a bigint | 7bad5d153 (types-form5-6-primitives) | **fixed**: bridge defect (a model BigInt compared as a number); bridge.mjs isBigInt; 60/60 agree at head |

## Pairs (`JOBS=2 node langs/ts/tests/run.mjs --pair <p>`) at head

types_symbol_bigint 19, library_rows 35, class_handles 26, conditional_expressions 23, constructors 30, tuples_intersections 17 checks: ALL PASS each. `conformance/select.test.mjs`: 8 of 8 PASS.

## Red then green

`LEAN_PAIRS=types_symbol_bigint,class_handles,conditional_expressions,constructors,tuples_intersections node langs/ts/conformance/run.mjs`: exit 1 at the base (7 NEW), exit 0 at head (fee and orElse agree; the other five known with their class). library_rows, the one other pair whose model declares BigInt, keeps every unit status.

## Left

- The signed-zero class (74 units at head) and the 2^53 class stay per-unit known findings until the number model carries -0 (doubles.md, "The executable model").
- class_handles/spill: the value reading holds no aliasing; a fix would carry the write through `h` to `b` in the value tree (or refuse the unit there). Not done: the guard already withholds the lemma.
- `causeOf` still files any `$bigint` difference as "past 2^53"; with BigInt compared exactly, a remaining one is a real value difference, and the label could say so.
