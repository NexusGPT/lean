# void-return-forms: result (2026-10-31)

Base `09032a594` (lead-09032a59). Branch `lane/void-return-forms`.

## Commits
- `e9d71d189` pair `void_results` (red): four units added, `resetUndef`, `pushVoid`, `firstOver`, `overAt`.
- `ee192cc1f` the readings: `return undefined` and `return void e` are a procedure's bare return; a return inside a
  loop ends the procedure at that iteration. Also changes `overAt`'s candidate, see "Pairs".
- `e3ce22ab2` `design/heap-stage5.md` section 8, dated note "8, the other bare returns and a return inside a loop";
  the `COVERAGE.md` row for a procedure in the heap core.
- (this file)

Commit trailers are `Co-Authored-By: Claude Opus 5.5`, the model that did the work. The brief named Fable 5.1.

## What the readings are
Each mechanism is keyed on syntax only.
- **`common.mjs voidReturn(s)`**: the one test for `return void e;`, used by three readers.
  - **The lint.** At admission, it reads the statement as `e` as a statement, then a bare return. This holds only
    where a bare return is admitted and the return is the unit's own (not a callback's). Before, the lint refused
    every `void` used as a value.
  - **The value translator (`voidSplit`).** It reads the two statements in place of the return. This sits at the
    head of `tr` and `faultTr`, and in the straight emitter's return case.
  - **The heap core (`bareForms`).** In a procedure (a `void` result, not a constructor) it reads `return undefined;`
    and `return void e;` as `[e;] return;`. `undefined` here is only the global one: a name the file binds is
    refused through `isAbsent`.
- **A return inside a loop (heap core, `checkStmts` / `loopCall` / `stmts`).**
  - A procedure's return in a for-of or index loop body is admitted. A return inside a `forEach` callback stays out:
    the synthetic loop is marked `callback`, and the return ends only that step.
  - A helper whose body holds such a return returns a flag last. The flag is true at the return, with the world and
    the carried locals as they are there, and false when the loop ends.
  - After the call, the flag selects the enclosing exit or the statements after the loop. The enclosing exit is
    `(hw_, ())` at the procedure's level, or the outer helper's exit tuple in a loop body.
  - A helper whose body never rebinds the world keeps `ensures r_.0 == hw_`.
- **Probes** (`translate.mjs --core --heap --tolerant --report`):
  - In the core:
    - a return in an inner loop of two nested loops;
    - a carried local with an exit;
    - a world-preserving helper with `return undefined`;
    - an index loop with an exit.
  - The generated Dafny of the probe files verified: 8 and 3 verified, 0 errors.
  - Stay out, with their reasons:
    - a return in a `forEach` callback: `return inside a forEach callback`;
    - a return in a loop of a unit with a value: `return inside a loop of a unit with a value`;
    - `undefined` as a parameter name: `a value returned from a procedure`.

## Pairs
`JOBS=2 node langs/ts/tests/run.mjs --pair void_results`:
- **Before** (at `e9d71d189`, base code): 1 check, 1 FAILED. `theorem generated` failed because the lint refused
  the candidate's `void` operand (`` `void` is outside the subset ``), so no `candidate.dfy` was produced.
- **After** (at `ee192cc1f`): 29 checks, ALL PASS.
  - `Equal_reset_undef`, `Equal_push_void` and `Equal_first_over`: proved.
  - `Equal_over_at`: not proved. Lane B: WITNESS.
- **`overAt` was changed once, before it was ever green.** I first wrote its candidate with the exit test moved to
  `>=`. Lane B answered PASS-bounded: its bounds did not reach a price equal to `n`. I changed the candidate to write
  the bound `n` instead of the price at the exit, which differs on any exit, and lane B then answered WITNESS. This
  is my own new row, not an existing expectation lowered.

## Regression
`JOBS=2 node langs/ts/tests/run.mjs --pair <p>`, one at a time, at `ee192cc1f`:

| pair | checks | result |
| --- | ---: | --- |
| void_results | 29 | ALL PASS |
| bare_return_void | 13 | ALL PASS |
| void_promise | 23 | ALL PASS |
| alias_result | 6 | ALL PASS |
| local_procedures | 9 | ALL PASS |
| heap5_void | 9 | ALL PASS |
| heap_canonical | 13 | ALL PASS |
| type_tests | 59 | ALL PASS |
| copied_argument | 10 | ALL PASS |
| heap_loops (added: the loop helper changed) | 9 | ALL PASS |

Regressions: none.

## Census
How the numbers were made:
- `NODE_OPTIONS=--max-old-space-size=12288 LEAN_CACHE_DIR=<own dir per side> node <tree>/langs/ts/census.mjs
  /root/da/census/repos/<root> --out <root>-<side>.json`, one root at a time.
- Each run started only when `pgrep -fc "^node .*census.mjs"` was below 6 and at least 12 GB was available.
- "before" ran from a detached worktree at `09032a594`; "after" ran from the lane tree.
- Per-unit comparison: `cmp.mjs`, each unit's first stop, from the records journal.
- Per-reading comparison: `census.mjs --diff`.
- Files: `/root/lanes/void-return-forms/census/`.

| root | units | entered before / after | refused before / after | units moved | --diff gains / losses |
| --- | ---: | ---: | ---: | ---: | ---: |
| n8n | 9,610 | 2,752 / 2,752 | 6,858 / 6,858 | 0 | 0 / 0 |
| langchainjs | 6,709 | 2,831 / 2,831 | 3,878 / 3,878 | 0 | 0 / 0 |

nexus: not run, memory.

0 moved was expected. The census counts lowering, lint and gate stops. The value lane already translated
`return undefined` and a return in a loop (an `Option` loop exit), so the heap-core readings move units only from the
value lane into the core, which this census does not count. The lint change admitted no unit in either root: no
unit's first stop changed, and the `unread-syntax` row, where the lint's `void` refusal falls, is unchanged.

## What is left
- **`return void 0`, and `void` of any expression that is not a lint statement form.** The lint's statements are
  assignments, updates, calls and await, so a literal statement is refused: "only assignments, ++/--, calls, and await
  may stand as statements". A reading would have to name `void` of a pure operand as `undefined` in all three readers.
- **`return void e` inside a callback.** It stays refused by the lint: the callback return paths in the translator
  (`callbackStep`, the forEach step) have no split.
- **A return inside a loop of a unit with a value.** The helper would have to carry the value in its exit; no reading
  names it.
- **`break` and `continue` in a loop body.** Still refused. The exit flag is the mechanism a `break` could reuse.
