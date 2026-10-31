# Lane fix-destructured-aliases: result (2026-10-31)

Branch `lane/fix-destructured-aliases`, from lean `lead-30569d74` (30569d746). The row (board 9386b0ae) names three
defects reported by `lane/core-tuples-intersections-result.md` (its defects 4, 3 and 2). Each one has a red pair that
went green through its mechanism. Commits:

| Commit | What |
| --- | --- |
| 1ec358cdf | destructured aliases: `boundNames` in `writesThrough`, `layer1Risk`, the skeleton's `inputAlias`; `// SOURCE` gate on the theorem's identity shortcut; pair `destructured_aliases` |
| e60eeef5d | `argShapeWhy` on every same-file call in the core (was `genericArgWhy`, generic callees only); pair `wider_record_argument` |
| fe36f7364 | step cache: a `.dfy` input keyed with its includes, transitively (`withIncludes`); row `runtime/step-cache-includes` |
| 53b2b8163 | the source gate narrowed (a regression found: open_datatype `assignCopy`) |
| 8880f2c6f | the source gate narrowed to copy writes (regressions found: spread_outside `append`, `appendPath`; element_writes `bump`) |
| d77f4b371 | design note `langs/ts/design/heap-stage5.md` 17c (and a pointer from 17b) |
| this file | |

## The mechanisms

1. **A name a destructuring pattern binds over an input path is that path** (`translate/heap.mjs` `boundNames`). The
   pattern's names, each one level down per pattern (a rest at the value's own level), wherever a name is bound: a
   `const`/`let` pattern, a destructured parameter, a for-of or callback pattern. `writesThrough`, `layer1Risk` and the
   identity skeleton read them as they read `const x = path`.
   This was not enough. The value reading writes such a node as a copy, so the write can leave no trace in the Dafny
   text (`const { inner } = b; inner.v = 0; return b.n` reads as `b.n`). theorem.py's `alias_identical` then took it as
   identical to a candidate that never writes, before the guard was read. The fix is the in-range rule's mechanism:
   `layer1Risk` reports `writesCopy` (a write through another name for an input's node, through a call's result, or in
   a same-file callee that makes one). Such an exposed unit carries `// SOURCE` (`sourceKey`), and the identity
   shortcut skips the guard only when the two sources are the same.
2. **A same-file call's argument holds a cell its parameter reads** (`argShapeWhy`). For every call in the core (a
   function, a method, a constructor), each reference argument's cells must be among the constructors of the
   parameter's shape (a union: its alternatives'). A handle is not checked. A wider record or a subclass is refused,
   and the caller leaves the core with its callee.
3. **The step cache key covers the `.pre.dfy`** (`tests/stepcache.mjs` `withIncludes`). Every `.dfy` a step reads adds
   the files it `include`s, transitively, resolved from the including file's folder.

## The numbers, with the command that produced each

Red, then green (`JOBS=1 LEAN_STEP_CACHE=0 node langs/ts/tests/run.mjs --pair <p>`). Base is a `git archive` of
30569d746 at `/tmp/fda/base`, with the new pair copied in:

| Pair / row | Base | Head |
| --- | --- | --- |
| destructured_aliases (new) | 21 checks, 5 FAILED: lane A proved zero, head, sweep, reset, wipe | ALL PASS |
| wider_record_argument (new) | 9 checks, 1 FAILED: lane A proved who (`greet(x)` of a Person) equal to `return ""` | ALL PASS |
| `node langs/ts/tests/step-cache-includes.mjs` (new row) | exit 1, 2 FAILED (a changed prelude replayed) | exit 0 |

Regression, `JOBS=1 node langs/ts/tests/run.mjs --pair <p>` at 8880f2c6f, each ALL PASS: heap_canonical 13,
type_tests 59, copied_argument 10, tuples_intersections 17, heap5_rest 7, heap5_tuples 11, tuple_spread 9, heap_shapes
36, open_datatype 25, spread_outside 47, element_writes 15, generics 7, alias_result 6, alias_after_call 7,
theorem_alias 7, array_callbacks_rest 15, rest_param 7, heap5_unions 9, heap_unions 9, record_rest_any 11,
callback_patterns 11, mutation 11, receiver_write 13, heap5_ctors 14, class_super 8, inherited_method 27,
heap5_handles 12, types_enclosing_params 24, types_depth 17.

Two earlier runs found regressions in my own first gates. 1ec358cdf withheld open_datatype `assignCopy`. 53b2b8163
withheld spread_outside `append` and `appendPath`, and element_writes `bump`. Each was fixed at its mechanism (commits
above), not by an expectation: no existing pair's `expect.json` is changed.

Theorem screen of every pair: `node /tmp/fda/scripts/screen.mjs <tree> <out> <pairs..>` builds each pair's
theorem.dfy as tests/run.mjs does (translate, agreeCore, scope, theorem.py; no Dafny), at base and at 8880f2c6f. Then
`python3 -I /tmp/fda/scripts/cmp.py <base out> <head out>` compares them with `// GUARD`/`// SOURCE` comment lines
dropped. Every pair with a lane A theorem has the same text, except module_forms, whose only difference is the tree's
own path inside an external module's name (`Ext_tmp_fda_base_..` against `Ext_tmp_fda_headtree_..`). Lane B and the
lint import none of the changed sources.

Census: **not run, memory.** The gate (`/tmp/fda/scripts/census.sh`: at least 12 GB available and fewer than 6
`census.mjs` processes) checked every 300 s from 04:32 to 06:47 UTC. The `census.mjs` count stayed between 16 and 28
the whole time, so neither n8n nor langchainjs ran, and I stopped the gate. nexus: not run, memory. The per-unit tool
is ready: `NODE_OPTIONS=--max-old-space-size=12288 node /tmp/fda/scripts/unitcore.mjs <tree> /root/da/census/repos/<root> <out.tsv>`,
then `python3 -I /tmp/fda/scripts/diff.py <base.tsv> <head.tsv> <moved.tsv>`. What can move there: units leaving the
core under `argShapeWhy` (a wider argument, and the callees and callers it takes along), and layer-1 units newly
exposed by a pattern alias. census.mjs (the lint's stops) cannot move.

## What is left

- The census above (n8n, langchainjs), when the machine allows it.
- Found, not fixed: a union alternative's hypothesis (`IsR_<Circle>(hw_, c)`) does not state the alternative's
  discriminant value, so `size(c)` of a `Circle` is not proved against `c.r` (pair wider_record_argument `circ`,
  recorded as not proved, the same at base).
- `elementNames` still binds every parameter of a `reduce` callback (the accumulator included) as an element. That is
  conservative and unchanged.
- The rest-of-pattern names are read at the value's own level, as 17b's destructured parameters were. A write to a
  rest object's own field is then counted as a write below the input, which is conservative.

## Notes on process

- Commits use the repository's author identity passed per command (no git identity is configured); git config is
  untouched.
- Processes I stopped were my own, by the pids I captured: two screen runs and one regression batch, restarted after a
  code change so that no result mixed two versions of the code, plus the census gate.
