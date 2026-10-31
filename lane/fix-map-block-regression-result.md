# fix-map-block-regression: result

Lane of 2026-10-31. Branch `lane/fix-map-block-regression`, base lean `lead-30569d74` (30569d746).
Note: `langs/ts/design/heap-stage5.md` subsection 11c ("read again at the merge, 2026-10-31").

## The red pair

`map_block` itself (no new pair): `JOBS=2 node langs/ts/tests/run.mjs --pair map_block`.
- At the base 30569d746: 11 checks, 1 FAILED, `Equal_labels_inner proved` -> `not proved`.
- At `01b7d314f` (a second worktree, read-only): 11 checks, ALL PASS.
- At the head: 11 checks, ALL PASS.

## Diagnosis

The emitted Dafny of the two runs (kept with `--result`, so the runner keeps its tmp dir) differs in the HEAP line:
at `01b7d314f` only `width` was in the heap core; at the base `labelsInner`, `noted`, `sizes` and their callback units
are in it too. Before 11b a callback with a block body was `callback form`, the unit stayed out of the core and the
value lane proved `labelsInner` (its `Map_Item_string` states the result item by item, and the theorem compares the
tuple's sequence first). 11b's block-body reading (`cbCode`, commit `6e6c7918f`) let the unit into the core, which
writes the map as `Map_A_R_A_string(hw_, items, f)`, a fresh cell of `seq(|xs|, i => f(xs[i]))` in the heap. The two
sides' `f`:

```text
parent:    ((x: Ref) => Get_R_8ea1dc5c_label_(hw_, Get_R_328e4443_tag(hw_, x)))
candidate: ((x: Ref) => (var t := Get_R_328e4443_tag(hw_, x); Get_R_8ea1dc5c_label_(hw_, t)))
```

Dafny has no extensionality for function values and no hint reaches the sequence inside the heap's map, so the equal
unit was not proved. It was neither the captures nor the index: the block body's binding written as a let.
`noted` (same callback text on both sides) and `sizes` (unproved by design) entered the core too and kept their rows.

## The mechanism (one rule, `translate/heap.mjs`)

A binding of a callback's block body is written in place as its value: each use of its name is its initializer
(`cbCode` fills the map `inPlace`, read where `expr` writes a name), as a module constant is written by its
initializer. Same value (nothing in a callback writes, so the initializer has the same value wherever it is read);
same text on both sides when an edit names a part of the result or writes a binding in place, which is how the core
compares function values. Keyed on the syntax only, no name. Emitted at the head:

```text
parent:    ((x: Ref) => Get_R_8ea1dc5c_label_(hw_, Get_R_328e4443_tag(hw_, x)))
candidate: ((x: Ref) => Get_R_8ea1dc5c_label_(hw_, (Get_R_328e4443_tag(hw_, x))))
```

No conflict between the two readings: 11b's block body, index and captures all stand, `array_callbacks_rest`'s
`doubled` still proved. Not covered (written in 11c): two callbacks computing the same value by different
expressions are still unproved in the core (a pointwise lemma of the map helpers in the theorem would be needed).

## Regression

`JOBS=2 node langs/ts/tests/run.mjs --pair <pair>`, two pairs at a time, at the head's translator: every pair the
brief names (names with callback, `map_block`, `heap_canonical`, `type_tests`, `copied_argument`) and every pair the
core-array-callbacks result listed. Logs: `/root/lanes/fix-map-block-regression/reg/`.

| pair | checks | result |
| --- | ---: | --- |
| `array_callbacks_rest_real` | 11 | ALL PASS |
| `array_callbacks_rest` | 15 | ALL PASS |
| `array_callback_cells` | 9 | ALL PASS |
| `array_copy_identity` | 13 | ALL PASS |
| `blocker_optional_callback` | 13 | ALL PASS |
| `callback_behaviour` | 14 | ALL PASS |
| `callback_behaviour_tree` | 2 | ALL PASS |
| `callback_patterns` | 11 | ALL PASS |
| `callbacks` | 5 | ALL PASS |
| `callback_units` | 9 | ALL PASS |
| `effectful_callbacks` | 29 | ALL PASS |
| `exception_callback` | 35 | ALL PASS |
| `named_callbacks` | 17 | ALL PASS |
| `throwing_callbacks` | 11 | ALL PASS |
| `heap5_rest` | 7 | ALL PASS |
| `record_rest_any` | 11 | ALL PASS |
| `rest_param` | 7 | ALL PASS |
| `heap_canonical` | 13 | ALL PASS |
| `type_tests` | 59 | ALL PASS |
| `copied_argument` | 10 | ALL PASS |
| `element_writes` | 15 | ALL PASS |
| `for_each` | 8 | ALL PASS |
| `heap5_arrays` | 13 | ALL PASS |
| `heap5_step0` | 7 | ALL PASS |
| `heap_loops` | 9 | ALL PASS |
| `heap_3` | 23 | ALL PASS |
| `heap_3_refused` | 1 | ALL PASS |
| `heap5_absences` | 7 | ALL PASS |
| `heap5_arith` | 13 | ALL PASS |
| `heap5_cells` | 11 | ALL PASS |
| `heap5_conditional` | 9 | ALL PASS |
| `heap5_ctors` | 14 | ALL PASS |
| `heap5_decorators` | 9 | ALL PASS |
| `heap5_globals` | 13 | ALL PASS |
| `heap5_handles` | 12 | ALL PASS |
| `heap5_literals` | 11 | ALL PASS |
| `heap5_module` | 9 | ALL PASS |
| `heap5_outside` | 9 | ALL PASS |
| `heap5_reach` | 7 | ALL PASS |
| `heap5_regex` | 9 | ALL PASS |
| `heap5_strings` | 11 | ALL PASS |
| `heap5_template` | 11 | ALL PASS |
| `heap5_tuples` | 11 | ALL PASS |
| `heap5_unions` | 9 | ALL PASS |
| `heap5_void` | 9 | ALL PASS |
| `heap_dicts` | 11 | ALL PASS |
| `heap_enumerated` | 9 | ALL PASS |
| `heap_graph` | 9 | ALL PASS |
| `heap_index` | 13 | ALL PASS |
| `heap_methods` | 10 | ALL PASS |
| `heap_nullable` | 5 | ALL PASS |
| `heap_optional` | 11 | ALL PASS |
| `heap_shapes` | 36 | ALL PASS |
| `heap_strings_calls` | 9 | ALL PASS |
| `heap_unions` | 9 | ALL PASS |
| `map_block` | 11 | ALL PASS |

No census in this lane (the brief's memory rule).

## Commits

`17d04d432` the rule in `heap.mjs` and note 11c; the last commit: this file.
