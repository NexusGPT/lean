# w9y-translator-soundness: result

Branch `lane/w9y-translator-soundness`, cut from `lead-v4` 547d179767. Two translator defects, each closed with a pair
that is red on 547d first. Logs are in `/root/lanes/w9y-translator-soundness/validators/` and `probe/`. The 547d runs
used a scratch worktree, `/root/lanes/w9y-translator-soundness/base`, at 547d179767. Only the new pairs and the
`tests/break.mjs` registry were copied there, so the base runner could read the new break rows; the translator is
547d's.

## What I found first: how much of each defect was still open at 547d

Both defects had already been closed in part by earlier lanes. Each pair below targets what was still open.

1. **Key order** (w2b's finding). Lane w8c (`handed-key-order`) already handed a built record with its key order to
   every outside call. At 547d these were correctly not proved: a literal; a spread of two parameters
   (`{ ...p, ...q }` against `{ ...q, ...p }`); `Object.assign`; an array of literals; `as Pt`; `Object.keys`; `for-in`;
   a template of `Object.keys`. I checked this in a probe pair, each side resolving in Dafny. A computed key and a local
   written key by key were refused (`key-order`), which is sound.
   **Still open at 547d:** a record the unit builds, handed to a *same-file* function that hands its parameter to
   `JSON.stringify`. The callee reads its parameter as its own object (no order beside it), and the caller handed the
   bare datatype value. So `enc({ a: x, b: y })` against `enc({ b: y, a: x })` was **PASS-proved**, while lane B finds
   a WITNESS.
2. **Await fault type** (w1d's finding). Lane w8d (`async-branch-exit`) already closed the if-branch form. At 547d I
   translated and resolved 27 shapes in Dafny, and all were right: then branch, else branch, else-if, both arms,
   switch case, nested if, awaited if/else-if/`&&` condition, `return await` in a branch, ternary, labelled block, and
   the arrow form. **No then/else pair can be red at 547d, so I wrote none.**
   **Still open at 547d:** an await inside a *loop* of an async unit had no fault exit at all. The loop ran on after
   the rejection, and a `return` inside the loop gave its value on the faulted world where JavaScript gives the
   rejected promise. The model's fault branch was a value where it should have been the rejection.
   This is incomplete rather than unsound. A pair with a catch (`swallowed`, below), and `try` around a loop (always
   opaque), did not prove at 547d. But no unit whose await sits in a loop could prove against a correct loop-free
   restatement.

## What landed (commit 373a235a6a, then this file's commit)

- **`translate.mjs` `paramReadsOrder` and `unitArgOrdered`** (break `same-file-key-order`). When the callee's parameter
  may reach a reader of key order, a same-file call hands its argument the way `orderedArg` hands one to the outside:
  the record with its order text, or a `key-order` refusal. "May reach" means any use of the parameter except a field
  read whose value holds no record and is not called: a pass-on, a store, a return, a spread, an enumeration, or a
  method call. This applies to the plain parameter and to the defaulted one. A callee that only reads primitive fields
  gets the bare value, so a reorder there still proves (`fields_only`). Documented in `design/handed-key-order.md`.
- **`translate.mjs` `coreLoop` `faultExit`, `awaitLeaves`, `asyncExit`** (break `async-loop-exit`). In an async unit,
  a loop that awaits now leaves at a rejection:
  - The helper returns a fault flag beside its returns and jumps.
  - Each awaited statement of the body exits on the fault.
  - An awaited loop condition ends the loop.
  - The code after the loop tests the flag first, then takes the enclosing loop's exit or the unit's rejected promise.
  - An `if` in such a loop takes the continuation form, as at the unit's top.

  It tests the flag rather than the world so that a path that awaited nothing never reads the world the loop was
  entered with. The first cut tested the world, and `else_arm` failed on exactly that. A loop made by the forEach
  lowering keeps its own fault routing (`lf`). Documented in `subset.md`, in the `await` row.
- **Two breaks registered** in `tests/break.mjs`, and two pairs added: `handed_key_order_callee` and
  `async_loop_exit`.

## Impact: the units that flipped

- `handed_key_order_callee`: `via_helper`, `spread_helper` and `via_two` were **PASS-proved at 547d, a false proof**;
  now they are not proved. Lane B finds a WITNESS for each.
  - `enc`, `enc_via`, `sum`, `same_order` and `fields_only` stay proved.
- `async_loop_exit`: `first_positive` (await in an if branch inside the loop), `else_arm` (in the else branch), `body`
  (in the loop body), `cond` (in an awaited while condition) and `nested` (in a loop inside a loop) were **not proved
  at 547d**; now they are proved. Lane B is PASS-bounded on each.
  - `swallowed` (the candidate catches the rejection) stays not proved.

## Validators (each line verbatim)

Machine rule: every pair run alone, `nice -n 15`, `--jobs 1`. No benchmark, no `hour.py`, no 75.

**Red on 547d179767** (`node tests/run.mjs --pair <name> --jobs 1`, in the base worktree):

    | pair | handed_key_order_callee | Equal_via_helper not proved      | FAIL |             | proved
    | pair | handed_key_order_callee | Equal_spread_helper not proved   | FAIL |             | proved
    | pair | handed_key_order_callee | Equal_via_two not proved         | FAIL |             | proved
    | TOTAL | 17 checks | 3 FAILED |
    | pair | async_loop_exit | Equal_first_positive proved | FAIL |             | doubles unknown: not encoded: firstPositive is async
    | pair | async_loop_exit | Equal_else_arm proved       | FAIL |             | doubles unknown: not encoded: elseArm is async (0 s)
    | pair | async_loop_exit | Equal_body proved           | FAIL |             | doubles unknown: not encoded: body is async (0 s); r
    | pair | async_loop_exit | Equal_cond proved           | FAIL |             | not proved
    | pair | async_loop_exit | Equal_nested proved         | FAIL |             | not proved
    | TOTAL | 17 checks | 5 FAILED |

**Green after the change:**

    --pair handed_key_order_callee exit 0 | TOTAL | 17 checks | ALL PASS |
    --pair async_loop_exit exit 0 | TOTAL | 17 checks | ALL PASS |

Each pair's own `break` rows are in those 17 checks: `via_helper`, `spread_helper` and `via_two` flip to proved under
`same-file-key-order`, and all five `async_loop_exit` units flip to not proved under `async-loop-exit`.

**Each break red** (the variable set on the whole run):

    LEAN_BREAK=same-file-key-order --pair handed_key_order_callee exit 1 | TOTAL | 17 checks | 3 FAILED |
    LEAN_BREAK=async-loop-exit --pair async_loop_exit exit 1 | TOTAL | 17 checks | 5 FAILED |
    opaque-unit.mjs --break exit 1 FAIL step signature {"id":"block_x","ins":["World","U"],"out":"(World, Option<int>, U)"}
    opaque-unit.mjs exit 0 opaque-unit: the key is the construct's tokens (comments and layout no change, two URLs two symbols), the step's shape and signature, the column, and the reference test a block starts from
    handed-key-order.mjs exit 0 | HANDED KEY ORDER | 14 rows | ALL PASS |
    handed-key-order.mjs --break exit 1 | HANDED KEY ORDER --break | 14 rows | 7 FAILED |
    w1d-opaque-async.mjs exit 0 ALL PASS

**Conformance on both pairs** (`LEAN_PAIRS=handed_key_order_callee,async_loop_exit node conformance/run.mjs --jobs 1`,
exit 0):

    ## Disagreements: 0 (input, side), 0 units, 0 causes
    | MODEL-CONFORMANCE TOTAL | 14 units in 2 pairs (0 skipped) | 0 executable: 0 agree, 0 disagree | 14 not executable, 0 outside domain, 0 not bridged, 0 model error, 0 skipped | 0 coupling finding(s) (0 sampled) | NO NEW FINDING |

This is clean but vacuous. All 14 units are "not executable" because each reaches a part with no body
(`JSON.stringify`, `key_order_*`, the awaited `Svc` calls), so no model ran against Node on these pairs.

**Regression, the families that share the mechanisms** (82 pairs, each alone): `handed_key_order` plus every
`opaque_*` and `async_*` pair. 79 are ALL PASS. 3 fail with the same row at 547d (below), so none is a regression.
The pairs run:

handed_key_order_callee async_loop_exit handed_key_order async_branch_exit async_branch_exit_arms opaque_alias_mutation
opaque_alias-origin opaque_assignment_expression opaque_assign-target opaque_async opaque_async_callback
opaque_async_callee opaque_async_origin opaque_async_predicate opaque_async_reduce opaque_bitwise opaque_callback-control
opaque_callback-form opaque_callback-result opaque_callee opaque_capture opaque_closure_mutation opaque_collection_iterator
opaque_copied_argument opaque_delete opaque_destructuring opaque_division opaque_dynamic-key opaque_exception-binding
opaque_exception-callback opaque_exception-return opaque_for_in opaque_freeze opaque_function-value opaque_generator_use
opaque_global_read opaque_index_assign opaque_in_place_mutation opaque_instanceof-constructor opaque_iterator-protocol
opaque_label opaque_loose_equality opaque_math_empty opaque_mixed_types opaque_mutator_value opaque_number_special
opaque_object_method_capture opaque_object_method_mutation opaque_opaque_mutation opaque_operator-value-context
opaque_optional-chain opaque_param_assign opaque_param_form opaque_param_mutation opaque_param-output opaque_promise
opaque_promise_all_order opaque_promise_executor opaque_promise_executor_escape opaque_promise_pending
opaque_promise_thenable opaque_promise_unsettled opaque_property_assign opaque_read_after_call opaque_receiver_mutation
opaque_receiver_write opaque_record_rest opaque_spread opaque_statement_callee opaque_statement_mechanisms
opaque_statement_sharing opaque_string_code_unit opaque_this opaque_toplevel_effect opaque_ts_strict
opaque_type_assertion opaque_unary_coercion opaque_unsupported-call opaque_unsupported-member
opaque_unsupported-operator opaque_unsupported-syntax opaque_values

The three that fail, at head and at 547d alike:

    --pair opaque_copied_argument exit 1 | TOTAL | 1 checks | 1 FAILED |    (547d: | TOTAL | 1 checks | 1 FAILED |)
    --pair opaque_for_in exit 1 | TOTAL | 15 checks | 1 FAILED |            (547d: | TOTAL | 15 checks | 1 FAILED |)
    --pair opaque_read_after_call exit 1 | TOTAL | 28 checks | 1 FAILED |   (547d: | TOTAL | 28 checks | 1 FAILED |)

## Open

- **Three pairs are red at 547d already**, not from this lane:
  - `opaque_copied_argument`: the translator refuses the whole parent, at 547d too: `parent.ts:40: key-order: ... the
    result of the same-file call principalOf`. This is w8c's refusal meeting this pair; its owner should decide whether
    to split the unit out or read the result's order.
  - `opaque_for_in`: the break row `opaque-drop-read` / `upstream`, the item w8d already left open.
  - `opaque_read_after_call`: the break row `handle-write` / `written`, "the mechanism is not what refuses it".
- **Not measured beyond the pairs.** The key-order fix may refuse units in the 75 that translated before: a built record
  whose order cannot be read (`why`), handed to a same-file callee that hands it on. Each such unit was a possible false
  proof, but the count is not measured here, since this lane runs no benchmark.
- **A same-order restatement that inlines the callee does not prove.** `enc({ a, b })` against
  `JSON.stringify({ a, b })` gets a `handed_fresh` identity wrapper on the effectful same-file call only. That is older
  than this lane, and the pair's `same_order` uses a const alias instead.
- **A loop's second pass is a second unfolding of its helper.** The default proof does not make it, so
  `async_loop_exit` keeps each loop's other path leaving at once (by `break` or `return`). With an explicit unfolding,
  the original `else_arm` (a second pass) verifies (`probe/ale-tmp`, `theorem_h.dfy`: 1 verified).
- **Spread widening is mistranslated and does not resolve.** A literal spread into a wider record
  (`{ ...{ a: x }, b: y }` as `Pt`: `Pt(a := x).(b := y)`) and a record spread into a wider one (`{ ...p, c }` with
  p: `Pt`, as `Pc`: `Copy_Pt(p).(c := z)`) make the file fail to resolve, so nothing in it proves. This is a
  well-formedness defect, not a false proof; it is older than this lane and not fixed here.
- **Callers still left alone:** a record handed to a same-file *arrow* or a *method* (`viaArrow`, `viaMethod` in the
  probe) was not proved at 547d either, so they were not touched. A record returned or thrown keeps w8c's documented
  gap.
- **The fault flag only covers plain loops** (`for-of`, `for`, `while`, `do`). A `for await` loop and a
  forEach-lowered loop keep their own fault routing, as at 547d, and no pair here covers them.
