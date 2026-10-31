# core-shared-readings: result

Lane `lane/core-shared-readings`, base lean `lead-b5c07450` (b5c074508). Commits: 1800e8eb7 (red pair), 6886149dd
(the readings, the design notes, the heap5_arith row), then the census paragraph and this file.

## What I found

All three readings in heap-stage5.md section 21b were already in the base (f236416f8), with pair `heap5_reach` green.
Probing them on values only the core decides showed two of them stop short. Those are units where the doubles reading
is unknown (an array or record parameter) and the faithful reading (rule C) is the core's number model:
1. **Bitwise.** `faithful.mjs` rewrote a bitwise operator over a number the model does not hold into one opaque call
   (`Math.__lean_bitor(t, 0)`, `__lean_bitnot(__lean_bitnot(t))`). So `bitwiseOf`'s ToInt32 reading never applied, and
   `t | 0` against `~~t` failed whenever `t` was a field, an element or a sum.
2. **A pure loop keeps its world.** Stillness was decided on the body's text (no `var hw_`), and every loop call rebound
   `hw_`. A loop whose body is a pure loop was therefore never pure, so a mark after nested loops failed.
3. **For-of in a real file.** Holds as built: a for-of over a record's field, with `break`, proved.

## What I did and why (the mechanism, no unit named)

- `translate/faithful.mjs`: ECMA-262 6.1.6.1 reads every operand of a bitwise operator through ToInt32 (ToUint32 for a
  shift count and the left of `>>>`, both ToInt32 mod 2^32, which the helpers already take). The rewrite now wraps only
  a non-exact operand, as `Math.__lean_int32(x)`. The operator stays and is read exactly by `bitwiseOf`.
  - `exactOf`: a bitwise result is exact (I32, or U32 for `>>>`) whatever its operands, as long as they are typed number.
  - Compound bitwise assignments are written the same way: `t = (Math.__lean_int32(t) | 4)`.
- `lean-number.d.ts`: declares `__lean_int32`.
- `translate.mjs bitwiseOf`: reads as JsInt32 the forms that are ToInt32 by the standard: `0 | x`, `x ^ 0`, `0 ^ x`, and
  `<<` or `>>` by a literal count with low five bits 0 (besides `x | 0` and `~~x`).
- `translate/heap.mjs loopCall`: a helper with `ensures r_.0 == hw_` binds its result world to a fresh name and leaves
  the caller's `hw_` alone. A loop around it is then pure too, at any depth.
- Soundness:
  - A proof over an uninterpreted int32 holds for ToInt32 among all functions. The int32 interval is the standard's.
  - The dropped world is equal to the kept one by the helper's proved ensures.
  - Still refused: a bitwise operand not typed number (a union, a bigint, any); a loop whose body marks or writes the
    world.
- Design notes:
  - `design/heap-stage5.md`: a dated H3 under 21b (what was read, soundness, what stays refused, the pair, the census).
  - `design/doubles.md`: the rule C list of exact sources and rewritten operations updated (the coverage row).

## Pair `shared_readings` (red at base, green at 6886149dd)

| Unit | Change | Base | Head | Lane B |
| --- | --- | --- | --- | --- |
| `bits` | `~~t` for `t \| 0`, t a sum over an array | FAIL (not proved) | proved | PASS-bounded |
| `low` | `t \| 0` for `t << 32` | FAIL | proved | PASS-bounded |
| `flip` | `t \| 1` for `t \| 0` | not proved | not proved | WITNESS |
| `grid` | length read before two nested pure loops, then `/` | FAIL | proved | PASS-bounded |
| `halve` | `/ 4` for `/ 2` after nested loops | not proved | not proved | WITNESS |
| `field` | for-of over `b.items` in a real file | proved | proved | PASS-bounded |

`JOBS=1 node langs/ts/tests/run.mjs --pair shared_readings`: base 13 checks, 3 FAILED; head 13 checks, ALL PASS.

## Expectation changed outside the pair (asked the lead; no answer in 120 s, decided)

`heap5_arith` `equal.bump`: false -> true.
- The change: `c.flags | 4` -> `4 | c.flags` and `c.qty++` -> `c.qty += 1`. These are equal in JavaScript.
- Lane B was already PASS-bounded, and the row's own "why" says "(proved)".
- The `false` dates from the faithful commit (8b4cf4442), which made the bitwise operator opaque.
- This raises a row; it lowers nothing.

## Regression (each `JOBS=1 node langs/ts/tests/run.mjs --pair <p>`, at the reading's code)

How the pairs were chosen:
- Every pair whose source holds a bitwise operator: heap5_arith, heap5_reach, heap_shapes, numbers_bits,
  numbers_bits_rebase, object_methods. Found with a TypeScript-token scan of the pairs.
- Every pair with a nested loop: loop_forms.
- Pairs sharing a word with the construct: heap_loops, loop_chain, numbers, special_numbers, faithful_held,
  for_desugar.
- The brief's three: heap_canonical, type_tests, copied_argument.

| Pair | Checks | Result |
| --- | ---: | --- |
| shared_readings | 13 | ALL PASS |
| heap5_arith | 13 | ALL PASS (after the bump row; 1 FAILED before it: bump proved) |
| heap5_reach | 7 | ALL PASS |
| heap_shapes | 36 | ALL PASS |
| numbers_bits | 39 | ALL PASS |
| numbers_bits_rebase | 11 | ALL PASS |
| object_methods | 47 | ALL PASS |
| loop_forms | 41 | ALL PASS |
| heap_loops | 9 | ALL PASS |
| loop_chain | 15 | ALL PASS |
| numbers | 9 | ALL PASS |
| special_numbers | 9 | ALL PASS |
| faithful_held | 9 | ALL PASS |
| for_desugar | 11 | ALL PASS |
| heap_canonical | 13 | ALL PASS |
| type_tests | 59 | ALL PASS |
| copied_argument | 10 | ALL PASS |

## Census, before and after

- Base: `git archive b5c074508 langs spec conformance` into /tmp/srcensus/base. Head: `git archive 6886149dd` into
  /tmp/srcensus/head.
- Command, in each tree, one root at a time:
  `NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs /root/da/census/repos/<root> [--include <dir>/] --out <json>`.
- Compared with `node langs/ts/census.mjs --diff <base.json> <head.json>`.
- Nexus scope: a full root ran past two hours in an earlier lane. I censused the 17 directories that hold a bitwise
  operator outside tests (list in /tmp/srcensus/nexus-dirs.txt). Those are the only files where the faithful change can
  alter a unit's translation. The loop change alters only the text of a helper call, never a refusal.

| Root | Units | Entered before -> after | Readings with a gain or loss |
| --- | ---: | --- | --- |
| n8n | 9,610 | 2,680 -> 2,680 | none |
| langchainjs | 6,709 | 2,766 -> 2,766 | none |
| nexus (17 directories) | 1,225 | 595 -> 595 | none, in every directory |

No unit stopped, moved to entered or moved to another stop. Both readings change what the core proves of units it
already enters, never what it refuses. Their reach shows in the pairs, not in the census.

## Defects met (reported, not fixed: outside this construct)

- `faithful.mjs` compound assignment: the target's text is written twice (`a[f()] |= x` -> `a[f()] = (... a[f()] ...)`).
  An element target with an effect in its index would evaluate that effect twice. The arithmetic compound rewrite has
  always done this; I kept the same shape for bitwise.
- `run.mjs` / theorem: pair unit names are snake-cased (`orLeft` -> `or_left`), and the refusal "scope lists X, which the
  parent does not define" does not say so.

## Left

- Nothing in the brief's scope.
- The full nexus root was not censused, only the 17 directories that can be affected.
