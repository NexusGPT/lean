# any-equality: === on a value typed any or unknown

## Found
- Lane A proved `selfEq(p: any) { return p === p; }` equal to `return true`. The pair at 7f13803a printed `Equal_self_eq not proved | FAIL | proved`, then `TOTAL | 13 checks | 1 FAILED`.
- The emitted Dafny was `(p == p)`, and `neq` was `(p != q)`. That is Dafny equality on Any, which is reflexive. JavaScript returns false for NaN.
- These were already uninterpreted: `Object.is` (`ext_call_args_Object_is_Any_Any`), a switch over an any value (one opaque block), and `typeof p === 'number'` then `p === p` (the uninterpreted `Math.__lean_eq`).
- `==` on any was already refused `loose-equality` by the lint.

## Changed
- `langs/ts/translate/translate.mjs`, the equality branch for an Any operand. `===` and `!==` are now `ext_op_strict_eq_Any_Any_Any(l, r)`, negated for `!==`. `selfEq` now emits `ext_op_strict_eq_Any_Any_Any(p, p)`.
- A string or boolean literal on the other side keeps the exact reading, because the literal is neither NaN nor a zero.
- Why this choice: the design already reads every operation on Any as uninterpreted. A NaN-holding domain would need the double model in Any and NaN draws in lane B. `numbers-bitwise-nan.md` keeps the finite model on purpose.
- The lint is unchanged.
- One dated section is appended to `langs/ts/design/type-assertions.md`. The earlier section's "Open:" line now points to it.

## Pair any_equality (13 checks, ALL PASS)
- selfEq: not proved, lane B PASS-bounded. Lane B draws no NaN for an any parameter.
- neq (`p !== q` against `!(p === q)`): proved, PASS-bounded.
- narrowed: not proved, lane B WITNESS. The same rows read this way before the fix.
- sameSelf (Object.is): not proved, PASS-bounded. This is unchanged.
- switchSelf: not proved, PASS-bounded. This is unchanged.
- unknownSym: proved, PASS-bounded.

## Regression (each ALL PASS, run one at a time)
- type_assertions, asany_record_key, hash_keys, ordered_collections, absent_number, numbers, numbers_bits, numbers_bits_rebase, special_numbers.
- Also every pair whose parent compares an any or unknown value with ===: bare_return_void, branch_types, callback_behaviour, fake_throw, heap_3, null_undefined, open_key_read, spread_outside, type_tests, ui_tree_context.
- The full suite and the census were not run.

## Open
- Lane B draws no NaN or -0 for an any or unknown parameter. selfEq and switchSelf are therefore PASS-bounded, not WITNESS. The fix belongs in exec/gen.mjs, which I was not allowed to touch.
- A proof that needs === on Any to be symmetric (`p === q` against `q === p`) is now lost.

## Files and commits
- ab5cc352: the red pair. 95294b80: the fix. e6c056ae: the design section. Plus this file.
- langs/ts/tests/pairs/any_equality/{parent.ts,candidate.ts,expect.json}, langs/ts/translate/translate.mjs, langs/ts/design/type-assertions.md, lane/any-equality-result.md
