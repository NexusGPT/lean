# blockers lane: the top five construct buckets (2026-10-30, base f3cb5b41)

Two soundness and proof defects outside this lane's files need the lead first:
- **False proofs, class-and-this.** Lane A proves aliased, otherAny, typedAlias and passed equal. JavaScript tells
  each pair apart: a field read moved across a call that can change the object. Evidence is in
  langs/ts/design/opaque-receiver/ (rows in rows-f3cb5b41.txt). Lane B gives PASS-bounded on typedAlias and passed.
- **No proof for a function-typed parameter.** spec/theorem.py:109 `split_top` counts the `>` of `->` as a closing
  bracket, and the lemma loses parameters (ASK translation-defect). The one-line fix is in design/top-blockers.md.

Per bucket:
- **class-and-this (9357 files).** No reading added. The readers ask to admit more calls on opaque values, and that
  widens the false-proof gap above. The rule a sound reading needs: after a transition, a field read of any object
  it may reach is a world read, ordered with the other transitions. Lane B needs aliased inputs and fakes that write
  their arguments. Estimated over 90 minutes, because it touches every field read in translate.mjs.
- **type-system (8171).** The lint, translator and gate already read an unresolved type as opaque Any. The gap was
  the doubles lane, which refused any parameter it cannot type. Now such a parameter is Unread: a read of it refuses
  the unit, and a term that never names it is proved for every value of it (translate/smt-fp.mjs).
  Pair blocker_unresolved_type: 2 FAIL before, 9/9 after.
- **async-await (7649).** Already read at f3cb5b41: awaited port calls are ordered transitions, and a handed async
  arrow is an opaque value keyed by its text. Pair blocker_async_port records it: 9/9, no change made. The blocks
  examples of this bucket are blocked by the class-and-this cause.
- **imports-externals (6533).** Barrels already lint clean and hold no units. TS2339 on an `import.meta` property
  (url, dirname, filename) is now an environment finding. The host defines those properties. `import.meta.env` stays
  refused (lint.mjs). Pair blocker_import_meta: no theorem before, 7/7 after.
- **callbacks-function-values (5334).** An optional call `f?.(x)` inside a callback, with f an immutable captured
  input, is now admitted as the plain call already was (optionalScope in lint.mjs and translate.mjs). Pair
  blocker_optional_callback: the lint refused parent.ts before. With the theorem.py fix applied locally and then
  reverted, 9/9 pass. Without it, the three proof rows fail on the arity error, so this pair is red until that fix
  merges. Still refused: a function field of a captured record, `p.onDone?.()` inside a callback.

Sibling pairs re-run by hand, all pass:
- **Doubles change:** numbers, signed_zero, absent_number, env_programs, for_each, this_param, this_receiver,
  unreached_body, proof_hunt_8, promise_forms.
- **microtask_worker:** stopped by pid at 15 minutes (lane B spin-bound on drain). Its three units are async or a
  number-only unit, so the Unread change cannot reach them.
- **Optional-call change:** optional-call, optional_calls, null_undefined, lint_misfires, callback_units, callbacks,
  named_callbacks, effectful_callbacks, callback_patterns.
- **import.meta change:** local_declarations, new_unit, stack_text, module_forms.

Files touched:
- langs/ts/translate/smt-fp.mjs, langs/ts/translate/translate.mjs, langs/ts/lint/lint.mjs
- langs/ts/tests/pairs/blocker_unresolved_type/, blocker_optional_callback/, blocker_import_meta/, blocker_async_port/
- langs/ts/design/top-blockers.md, langs/ts/design/opaque-receiver/
- lane/blockers-result.md
