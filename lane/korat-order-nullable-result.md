# korat-order-nullable: result (2026-10-31)

Base: lean `09032a594` (lead-09032a59). Branch `lane/korat-order-nullable`.

## Commits

- `d6c4c6012`: the reading (`exec/korat.mjs`), the unit test `exec/korat.test.mjs` and its runtime row `korat-order`
  (`tests/run.mjs`), the counter `tests/korat-slots.mjs`, the sweep `tests/laneb-sweep.mjs`, the pair
  `korat_nullable_values`, the design note `heap-stage5.md` 16c and the Korat row of `research-integration.md`.
- This result file (the commit after it).

## What was found

- The order. Korat's odometer varied the first slot slowest: the arguments first, then the first shape's first field.
  A slot early in that order took its second value only after every later slot had run through all its choices.
  - On the suite's pairs, `tests/korat-slots.mjs` on the base finds the `byTag` Map of `Board { byTag, seen, tags }`
    (`map_set_copy`: `countFor`, `bumpCopy`, `addCopy`) holding no record in any of the 30 inputs.
  - On a deeper spec, the 20,000 assignments ran out before a nullable argument was ever non-null. This is the deep
    chain of `korat.test.mjs`: no slot was drawn at all.
- `Set<Tag | null>`, `Map<Tag | null, V>` and a Map whose values are records were left to the seeded generator. The
  generator's records are fresh, so no item and no value was ever an object an argument holds.

## What was done (`exec/korat.mjs`)

- Every dimension now names its owner (an argument, or a pool object), its slot (`argN`, or `heapN.field`: one per
  field of a shape) and the pool objects each of its choices holds.
- A breadth-first prefix runs after the all-default assignment:
  - The search finds the pool objects the arguments reach, by number of links, default links first.
  - Each slot takes its first choice that holds a pool object, on the shallowest object of its shape, together with
    the assignment that reaches that object.
  - Then each nullable side takes its first choice holding the absent value.
  - Then the old odometer runs, skipping what the prefix built.
- The bound: every slot is drawn within the first 1 + a + S + N inputs, where a is the argument slots, S the slot
  fields of the reachable shapes, and N the nullable sides. A dropped isomorphic heap was already drawn by an earlier
  input. So within 30: depth d and width w when a + w(w^d − 1)/(w − 1) + N ≤ 29, with d ≤ 4 (Korat's DEPTH). Examples:
  - a chain (w = 1) to depth 4, with up to 25 arguments;
  - w = 2 to depth 3, with up to 15 arguments;
  - w = 3 or 4 to depth 2.
- A nullable item, key or value is one more letter, placed second (`[0, absent, 1]`). A Set's first three choices are
  `[]`, `[o0]`, `[absent]`. The absent value is `null` where the union names null, `undefined` otherwise.
- A Map whose values are records:
  - The values range over the pool, repeats allowed.
  - Keys are pooled too when they are records.
  - Primitive keys are drawn by a generator seeded by the slot, distinct (at most eight redraws).
- The old cases keep their exact choice order. A record-keyed Map and a Set of records use the same alphabet and
  sequence order, and generated values use the same seed and path.

## The pairs, with their check counts

New pair `korat_nullable_values`. It checks lane B alone, because the heap core leaves out a Set of optional items, a
Map's reference values and `===` on records (section 16): the translator refuses the file (`reference-key`,
`reference-equality`).

| run | checks | result |
|---|---|---|
| base (a `git archive` copy of `09032a594` with the pair) | 6 | 4 FAILED: `isSeenOrNone`, `isOwnValue`, `distinctValues`, `knowsTag` WITNESS, each PASS-bounded |
| lane | 6 | ALL PASS |

Unit test `node langs/ts/exec/korat.test.mjs` (4 cases: the prefix with the Map-first record, the deep chain, the
nullable items and keys, the Map record values): all 4 fail on the base, all 4 pass on the lane, exit 0.

The four new WITNESS, read against the source and the witness inputs:
- `isSeenOrNone` (input 1): the Set holds `t` itself. The parent's `s.has(t)` is true; the candidate's new record is
  false.
- `isOwnValue` (input 1): the Map maps `t` to `t`, so true against false.
- `distinctValues` (input 2): two string keys hold one record, so 1 against 2.
- `knowsTag` (input 1): `b.byTag` holds `t`, so true against false.

All four are real JavaScript differences (SameValueZero identity), not draw artefacts.

Regressions, each `JOBS=2 node langs/ts/tests/run.mjs --pair <p>` on the lane:

| pair | checks |
|---|---|
| map_set_copy | 19 ALL PASS |
| dict_order | 16 ALL PASS |
| heap_canonical | 13 ALL PASS |
| type_tests | 59 ALL PASS |
| copied_argument | 10 ALL PASS |
| heap_enumerated | 9 ALL PASS |
| heap5_cells | 11 ALL PASS |
| branded_keys | 11 ALL PASS |
| heap_shapes | 36 ALL PASS |
| ordered_collections | 11 ALL PASS |

`ordered_map`, named by the brief, is no pair directory (the runner reads a missing `expect.json`). I ran
`ordered_collections`, the pair of that name family, in its place.

## Regression list

- The slot counter, `node langs/ts/tests/korat-slots.mjs [--tree <root>]`, covers every lane-B unit of every pair. A
  slot counts as drawn when one of the first 30 enumerated inputs holds a record in it; a nullable side must also hold
  the absent value once.

  | tree | units with slots | slots | never drawn |
  |---|---|---|---|
  | base | 527 | 701 | 8: 3 `map_set_copy` `byTag`; 1 `korat_nullable_values` `knowsTag` `byTag`; 4 on `holdsNone` (its Set, and its null), `distinctValues` and `valueCount`, which had no enumerated heaps at all |
  | lane | 527 | 701 | 0 |

  3 spec errors are the same on both trees (`decorators_metadata Dial.cur`, `module_unit`, `module_unit_same`: no such
  unit by name).
  - The measure is pool-blind: a record the generator drew fresh counts as drawn. That credits the base, never the lane.
- The lane-B sweep, `node langs/ts/tests/laneb-sweep.mjs --tree <root> --units ...`, ran the 527 units with slots on
  both trees, as the suite runs them (`--n 30`).
  - A unit with no slot has no enumerated heaps on either tree, so its inputs are identical.
  - base: PASS-bounded 331, WITNESS 190, PASS-decided 3, REFUSE 2, ASK 1.
  - lane: PASS-bounded 327, WITNESS 194, PASS-decided 3, REFUSE 2, ASK 1.
  - The only changes are the four `korat_nullable_values` rows above, PASS-bounded to WITNESS. No WITNESS was lost.
    One WITNESS was kept at another input index.

## Census lines

Each root was run one at a time: `NODE_OPTIONS=--max-old-space-size=12288 node <tree>/langs/ts/census.mjs
/root/da/census/repos/<root> --out <tag>-<root>.json --report <tag>-<root>.md`. Each start was gated on fewer than 6
census processes and 12 GB available (`census/run.sh`). The compare script `census/compare.mjs` reads every file both
journals finished. Both live under `/root/lanes/korat-order-nullable/`.

| root | run | files | units | entered | language-refused | environment-blocked | refused | compare |
|---|---|---|---|---|---|---|---|---|
| n8n | before (266 s) | 7812 | 9610 | 2752 | 4634 | 603 | 6858 | |
| n8n | after (264 s) | 7812 | 9610 | 2752 | 4634 | 603 | 6858 | 7812 common files, 0 differ |
| langchainjs | before (380 s) | 2972 | 6709 | 2831 | 2914 | 228 | 3878 | |
| langchainjs | after (443 s) | 2972 | 6709 | 2831 | 2914 | 228 | 3878 | 2972 common files, 0 differ |

nexus: not run, memory.

`korat.mjs` is in the census's import closure (through `lint/lint.mjs`, which imports `exec/run.mjs` lazily for its
own CLI path). The census never enumerates heaps, so no unit moved, as the table shows.

## Defects met

- In my own commands:
  - One verification command sent run.mjs's stdout to `/dev/null` (stderr kept). That is not the forbidden form, but
    it was noise.
  - The first `korat-slots.mjs` total counted only the unmet null draws. I fixed it before the commit, and both trees
    were re-measured with the fix.
- Spec refinement adds a read member name (`has`, `size`, `k0`) as an extra field of `Tag` in the witness inputs. The
  lane `core-map-set-copy-forms` saw this before. It is harmless here and outside this lane.

## What is left

- An optional or nullable Set or Map field (`seen?: Set<Tag>`) is still the generator's (16b, unchanged).
- The prefix is per shape field, not per pool object. The second pool object's fields are reached by the odometer, as
  before.
- Past the stated bound (wide shapes at depth 4), the prefix still goes shallowest first, so the 30 inputs miss the
  deepest slots.
- The heap core does not read a Set of optional items or a Map's reference values (section 16 "Out"). Lane A refuses
  the file, so the new pair is lane B alone.
