# core-array-callbacks: result

Lane of the night wave of 2026-10-31. Branch `lane/core-array-callbacks`, base lean `b5c074508`.
Specification: `langs/ts/design/heap-stage5.md` section 11 (array callbacks and the other array methods); the note
written by this lane is its subsection 11b.

## What was done, and why

Section 11's reading was already in `translate/heap.mjs` for a one-parameter callback with an expression body. Its
"Out" list named the rest: a callback with an index, a block body, `indexOf`, `findIndex` and `at` in a real file,
`reduce` without an initial value, `find` of references, `map`/`filter` inside a callback. This lane reads, in the
heap core, one mechanism each:

1. **An indexed callback** `(x, i) => e` for `some`, `every`, `find`, `findIndex`, `map`, `filter`: the index is the
   item's integer position (a real of it in a real file); `some`/`every` quantify over the position, `find`/`findIndex`
   use the ordinary lane's `FindIdx`/`FindIndexIdx`, `filter` allocates `FilterIdx` of the items, `map` allocates
   `seq(|it|, k => f(it[k], k))`.
2. **A block body of `const` bindings** then `return e` (also for `reduce`): each binding written in place in the
   Dafny lambda as a let, in order.
3. **`indexOf`, `findIndex`, `at` in a real file**: the integer position `as real`; `at`'s number truncated
   (ToIntegerOrInfinity, `JsTrunc_real`).
4. **A defect inside the construct, found on the way**: every callback is its own unit, and the core keeps a unit out
   when a nested callback unit is out (heap.mjs `plan`). The translator appends a callback's captured bindings to its
   parameters, but the core read them as outside names (`outside name o`), so any unit whose callback reads an outer
   name (the section's own `forEach` included) never entered the core. The core now reads a captured binding as the
   callback unit's input (checks, emission, loop helpers' free names); a write to a captured name stays out.

Each is one general rule in `heap.mjs`, keyed on the syntax and the shapes, never on a name.

Still out (written in 11b with the reason): `forEach((x, i) => …)` (the lint reads a one-parameter `forEach` callback
only and the ordinary lane has no indexed `forEach`, so a heap-only reading would reach no unit: a lint + ordinary-lane
reading, not this lane's files); `reduce` with an index or without an initial value; `find` of references; `map` or
`filter` inside a callback; any other block body; three or more callback parameters.

## Elements added

- `langs/ts/translate/heap.mjs`: `cbParts`, `cbCode`, `checkCb` (the block body); `capturedBy`, `ownDecl` (captured
  bindings are the callback unit's own names); the indexed forms in the CB1 check and emission; the real-file forms
  of `indexOf`, `findIndex`, `at`; the refusal of a write to a captured name.
- Pair `langs/ts/tests/pairs/array_callbacks_rest/` (int file) and `array_callbacks_rest_real/` (real file). The brief
  named one pair; a file is int or real as a whole, so the real-file readings need their own file. I asked the lead
  (no answer within the wait) and took two pairs. Each unit computes a value with the read form and then writes the
  lines a `forEach` statement walks: a write only the heap core reads, so at the base the translator refused every
  unit (`alias-mutation: … the heap core does not read this unit`).
- `langs/ts/design/heap-stage5.md` subsection 11b; `langs/ts/COVERAGE.md` row "closure that mutates an outer object".

## The pairs

`JOBS=1 node langs/ts/tests/run.mjs --pair <pair>`, each alone, on the translator of `6e6c7918f` (`6c7d5eb81` moves a
comment; the last commit touches documentation and the heap-reach census script only).

- At the base (`b5c074508`, the pair folders copied into an extract of it): `array_callbacks_rest` 1 check, 1 FAILED;
  `array_callbacks_rest_real` 1 check, 1 FAILED (`theorem generated`: the translator produced no file, every unit
  refused by `alias-mutation: … the heap core does not read this unit`). Each unit's first heap-core reason at the base
  is this reading's (`callback form`; `indexOf`/`findIndex`/`at in a real file`), read by `probe/whynot.mjs` below.
- At the head: both ALL PASS.

Regression (the brief's list: every pair sharing a word with the construct, `heap_canonical`, `type_tests`,
`copied_argument`; then `element_writes`, `for_each` and every `heap*` pair, since a callback unit's captured inputs
widen the core for every pair):

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

## The census

Commands, each root alone, never beside a pair run: base `NODE_OPTIONS=--max-old-space-size=12288 node
langs/ts/census.mjs /root/da/census/repos/<root> --out <dir>/before-<root>.json` from an extract of `b5c074508`; after,
the same from this branch; `node langs/ts/census.mjs --diff <before> <after>`; the per-unit stop comparison
`python3 -I probe/diff.py <before> <after>` (each unit's stop as the census counts it, environment first, then the first
finding; for a run that did not finish, read from its journal's finished chunks).

| root | units | entered before | entered after | units whose stop moved | `--diff` gains / losses |
| --- | ---: | ---: | ---: | ---: | --- |
| n8n | 9,610 | 2,680 | 2,680 | 0 | 0 / 0 in every reading |
| langchainjs | 6,709 | 2,766 | 2,766 | 0 | 0 / 0 in every reading |
| nexus (partial, both runs) | 10,094 of the chunks both finished | 5,552 | 5,552 | 0 | not comparable (incomplete) |

nexus: both runs were stopped by the kernel's out-of-memory killer (global OOM, 118 of 122 GB in use on the shared
machine; `journalctl -k` names the census process), the base run after 13,712 files, the branch run after 6,000. The
row is the first 6,000 files (5 chunks), which both journals hold.

No unit moved: a unit whose callback the core refused still reaches the value lane, which reads indexed callbacks,
block bodies and real-file positions; only a write through a `forEach` element needs the core, and the units holding
one are stopped first by other readings (n8n: one unit carries `the heap core does not read this unit`; it is still
stopped).

Heap reach, the core itself (`node langs/ts/design/heap-reach-census.mjs hr/concepts-all.json hr/<out> --resolve
--repos n8n,langchainjs`, the input file pointing at the census copies; base heap against this branch's heap, the same
census script on both):

| | core | own syntax |
| --- | ---: | ---: |
| base, the script as it was | 112 | 490 |
| this branch, the script as it was | 112 | 490 |
| base, the script planning captured inputs | 112 | 490 |
| this branch, the script planning captured inputs | 114 | 566 |

The script as it was planned callback units without the bindings they capture, so every unit with such a callback
was out whatever the core read: a measurement defect, fixed in `design/heap-reach-census.mjs` (it now appends them as
the translator does). With it: n8n core 82 -> 82, own syntax 375 -> 427; langchainjs core 30 -> 32 (`eqSet` in
`libs/langchain-classic/src/evaluation/base.ts` and its `every` callback), own syntax 115 -> 139. No unit left the core.

## Defects met

1. In this construct, fixed: the core read a callback unit's captured bindings as outside names (above).
2. In the measurement, fixed: `heap-reach-census.mjs` planned callback units without their captures (above).
3. Reported, not fixed (outside this lane's files): the heap core reads every order and arithmetic operator on numbers
   as a bodiless function (`ext_call_args_Math_lean_lt_int_int`, at the base too), so `a < b` and `b > a` are never
   proved equal in the core; and an edit inside a `forEach` body changes its loop helper, which no lemma relates to the
   other side's (no induction across two helpers). The pairs' equal edits are chosen inside those limits.
4. Reported: the lint refuses `forEach((x, i) => …)` with effects (`foreach`) and the ordinary lane has no indexed
   `forEach`; an indexed `forEach` reading belongs to both, not to the heap core alone.
5. The heap-reach mirror (`makeMirror`) has not followed the core since stage 4; its mismatch count grows with each
   reading (447 -> 523 here). It is no check of the core.

## What is left

- `forEach` with an index (lint + ordinary lane + heap core together); `reduce` with an index or without an initial
  value (a fault on the empty array); `find` of references (an absent reference needs a shape); `map`/`filter` inside a
  callback (an allocation in a lambda); block bodies with `let`, branches or several returns.
- nexus before and after over the whole root, when the machine has the memory.

## Probes (in the lane folder, outside the repository)

`/root/lanes/core-array-callbacks/probe/`: `whynot.mjs` (the core's reasons for a unit, planned as the translator
plans), `lemma.sh` (a pair's theorem built and verified by hand), `stops.py` and `diff.py` (per-unit census stops),
`regress.sh`, `census.sh` (the runs above). Logs: `/root/lanes/core-array-callbacks/{reg,census,hr}/`.

## Commits

`01b7d314f` red pair; `6e6c7918f` the reading and both pairs; `6c7d5eb81` a comment; the last commit: the design note,
the coverage row, the heap-reach census fix and this file.

