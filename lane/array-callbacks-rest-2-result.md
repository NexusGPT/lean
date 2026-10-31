# array-callbacks-rest-2: result

Lane of 2026-10-31, plan `plans/2026-10-30-next-read/PLAN.md`. Branch `lane/array-callbacks-rest-2`, base lean
`lead-09032a59` (09032a594). Note: `langs/ts/design/heap-stage5.md` subsection 11d.

## Commits

- `535e6be02` the red pair: `array_callbacks_rest` extended by four units.
- `4f9d0aff6` the reading: an indexed `forEach` (lint, `lower.mjs`, ordinary lane, heap core), `reduce` without an
  initial value (`EmptyMark`), a `let` assigned once in a callback (`cbParts`, `cbFormWhy`), and loop helpers of field
  writes that keep the mark.
- `f1f3c48a0` the lint's advisory `foreach` note at each indexed `forEach` it reads (the converter's trigger).
- the last commit: note 11d, `design/element-writes.md`, this file.

What each reading does:
1. **`forEach((x, i) => body)` over an array** is the loop with the index bound to the position (ECMA-262 23.1.3.15).
   The lint admits a plain index name on an array receiver (a Set, a Map or an `any` receiver stays refused).
   `lower.mjs` `heapShapeEligible` admits the element write it carries. The ordinary lane's `forEachShape` accepts it,
   and `coreLoop` already bound a second parameter to the counter. The heap core's `forEachLoop` carries the index, and
   the loop helper binds `var i := k_` (`k_ as real` in a real file). An assigned index stays refused (lint
   `param-assign`; core `loop index assigned`).
2. **`reduce(cb)` without an initial value** (23.1.3.24): the result is
   `if |it| == 0 then d else Fold(it[1..], f, it[0])`, and the empty array marks the world (`EmptyMark`), so the unit
   carries INRANGE. Unguarded, it is unproved and lane B shows the TypeError as a WITNESS; guarded, it is proved. The
   lint admits it only for an inline arrow that computes. The core refuses it inside a callback. The ordinary lane
   refuses it with its reason, since a value has no channel for the TypeError; before this lane the lint refused it.
3. **A `let` of one name with an initializer** that nothing in the callback assigns again is the const case, written in
   place (11c's text equality holds). A `let` assigned again is refused with its own reason:
   `callback form: a let assigned again in the callback (a let is read as the const of its one assignment)`.
4. **Found on the way, in the construct:** a loop helper stated nothing about the mark. So an INRANGE unit with a loop
   of field writes after the mark (`totalGuarded`) needed an induction the lemma does not have, and stayed `not proved`
   on the first green run. A helper whose every world rebinding is `Set_` (which never marks), or a call of a helper
   that keeps the mark, now ensures `r_.oob == hw_.oob`, proved by its own recursion.
5. **Found by the regression, fixed at its mechanism:** the converter's `foreach` transform plans only at the lint's
   `foreach` finding. Reading an indexed `forEach` removed that finding, so `convert_async_foreach` went red (3 of 4
   FAIL; ok at the base) and the `convert/foreach` fixture would no longer convert. The lint now notes each indexed
   `forEach` it reads as advisory `foreach` (opts.advisory only; `lower.mjs` `refusing` excludes advisory findings, so
   the gate, the census and the pairs never see it). I asked the lead (A/B/C) and had no answer within the wait. I took
   this mechanism over changing the fixtures or withdrawing the admission.

Probes (`/root/lanes/array-callbacks-rest-2/probe/p1.ts`, read through the heap core's whyNot):
- `rebound` (a `let` assigned again) is refused with the reason above.
- `reduce` without an initial value inside a `some` callback is refused (`... inside a callback (its empty-array mark
  has nowhere to go)`).
- `pureSum` (a guarded value-lane `reduce`) enters the core.
- An indexed `forEach` in a real file enters the core.
- An assigned index is refused by the lint's `param-assign`.

## The pairs

`JOBS=2 node langs/ts/tests/run.mjs --pair <pair>`, two pairs at a time. Logs: `/root/lanes/array-callbacks-rest-2/log/`.

- `array_callbacks_rest` at the base (`535e6be02`): 1 check, 1 FAILED (`theorem generated`: no parent file; the lint's
  `foreach` on `numberLines`, `unsupported-call` on `total` and `totalGuarded`, and the core's `callback form` then
  `alias-mutation` on `weighLet`).
- At the head: 23 checks, ALL PASS. `numberLines`, `totalGuarded` and `weighLet` are proved. `total` is not proved, a
  lane B WITNESS.

## Regression list

At `4f9d0aff6` (all 56). `array_callbacks_rest` and `for_each` again at `f1f3c48a0`: ALL PASS (23 and 8 checks).

| pair | checks | result |
| --- | ---: | --- |
| `array_callback_cells` | 9 | ALL PASS |
| `array_callbacks_rest` | 23 | ALL PASS |
| `array_callbacks_rest_real` | 11 | ALL PASS |
| `array_copy_identity` | 13 | ALL PASS |
| `blocker_optional_callback` | 13 | ALL PASS |
| `callback_behaviour` | 14 | ALL PASS |
| `callback_behaviour_tree` | 2 | ALL PASS |
| `callback_patterns` | 11 | ALL PASS |
| `callbacks` | 5 | ALL PASS |
| `callback_units` | 9 | ALL PASS |
| `copied_argument` | 10 | ALL PASS |
| `effectful_callbacks` | 29 | ALL PASS |
| `element_writes` | 15 | ALL PASS |
| `exception_callback` | 35 | ALL PASS |
| `for_each` | 8 | ALL PASS |
| `heap_3` | 23 | ALL PASS |
| `heap_3_refused` | 1 | ALL PASS |
| `heap5_absences` | 7 | ALL PASS |
| `heap5_arith` | 13 | ALL PASS |
| `heap5_arrays` | 13 | ALL PASS |
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
| `heap5_rest` | 7 | ALL PASS |
| `heap5_step0` | 7 | ALL PASS |
| `heap5_strings` | 11 | ALL PASS |
| `heap5_template` | 11 | ALL PASS |
| `heap5_tuples` | 11 | ALL PASS |
| `heap5_unions` | 9 | ALL PASS |
| `heap5_void` | 9 | ALL PASS |
| `heap_canonical` | 13 | ALL PASS |
| `heap_dicts` | 11 | ALL PASS |
| `heap_enumerated` | 9 | ALL PASS |
| `heap_graph` | 9 | ALL PASS |
| `heap_index` | 13 | ALL PASS |
| `heap_loops` | 9 | ALL PASS |
| `heap_methods` | 10 | ALL PASS |
| `heap_nullable` | 5 | ALL PASS |
| `heap_optional` | 11 | ALL PASS |
| `heap_shapes` | 36 | ALL PASS |
| `heap_strings_calls` | 9 | ALL PASS |
| `heap_unions` | 9 | ALL PASS |
| `map_block` | 11 | ALL PASS |
| `named_callbacks` | 17 | ALL PASS |
| `record_rest_any` | 11 | ALL PASS |
| `rest_param` | 7 | ALL PASS |
| `throwing_callbacks` | 11 | ALL PASS |
| `type_tests` | 59 | ALL PASS |

Beyond the pairs, the rows the lint change reaches:
- `node langs/ts/tests/convert_async_foreach.mjs`: 4 ok at the head; at `4f9d0aff6`, 3 FAIL (fixed by `f1f3c48a0`).
- The converter by hand, as `run.mjs` `convert()` drives it: `convert/foreach`, `convert/labels` and
  `convert/apply-site` give the same text as `after.ts`, with the counts their `expect.json` names.
- `node langs/ts/tests/convert_dry_run_kill.mjs`: ok.

No regression is left.

## The census

Each root alone, `NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs /root/da/census/repos/<root> --out
<json>`, started at the gate (fewer than 6 censuses and 12 GB available). Before is from an extract of `09032a594`
(`git archive`), after is this branch. Then `census.mjs --diff`, and the per-unit stops
(`/root/lanes/core-array-callbacks/probe/diff.py`). Files: `/root/lanes/array-callbacks-rest-2/census/`.

| root | units | entered before | entered after | `--diff` gains / losses | units whose stop moved |
| --- | ---: | ---: | ---: | --- | ---: |
| n8n | 9,610 | 2,752 | 2,752 | 0 / 0 in every reading | 129 |
| langchainjs | 6,709 | 2,831 | 2,834 | 3 / 0 | 13 |

- **n8n:** 98 of the 129 moved stops are the same stop with its new message text (`of one parameter (and an index)`,
  `(and an index, over an array)`). 31 moved from `foreach` to the unit's next reason (prototype, spread,
  type-assertion, callback-control, read-after-call and others). None entered.
- **langchainjs:** the three gains are the units holding `goals.forEach((goal, index) => …)`
  (`AutoGPTPrompt.constructFullPrompt`) and `chunks.forEach((chunk, index) => …)`
  (`SimpleGoogleSearchOutputParser.textSuffix`, `MarkdownGoogleSearchOutputParser.textSuffix`).
- **nexus:** not run, memory.

## What is left

- `reduce` with an index (`(a, x, i) => e`: the fold helper takes two parameters).
- `find` of references (an absent reference needs a shape).
- `map` or `filter` inside a callback (an allocation in a lambda).
- A block body with a branch or a second `return`, and a `let` assigned again.
- `forEach` over a Set or a Map with a second parameter.
- `reduce` without an initial value with an effectful callback, or inside another callback.
- In the ordinary lane, `reduce` without an initial value outside the heap core: it needs a fault channel in a value
  reading.
- nexus before and after, when the machine has the memory.
