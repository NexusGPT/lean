# alias-after-call: a field read after a call that can change the object

## Found (hypothesis confirmed)
- At 9f26c1ed lane A proved all four units equal: `Equal_aliased`, `Equal_other_any`, `Equal_typed_alias` and `Equal_passed` each printed `proved`, then `TOTAL | 11 checks | 4 FAILED`.
- The emitted Dafny for (a) aliased: `var (wld, t0_) := ext_call_args_Any_preventDefault_World_Any(wld, e);` then `ext_Any_as_bool_Any(ext_Any_defaultPrevented_Any(f))`. The read takes no world.
- For (d) passed: `var (wld, t0_) := ext_call_args_invoke_World_Box_Unit_Box(wld, f, p);` then `(wld, p.x)`.
- The call threads the world, and the read takes the object as it was before the call.
- `this.x` after a call is read the same way: `ext_Ext_C_x_Ext_C(self)`.

## Changed (f0047f87)
- `translate.mjs` `readAfterCall(u)` runs before `emitUnit`, in the ordinary lane only. The heap core is untouched.
- **Calls that count:** the calls `isEffectCall` marks, without clock and random reads. Their receivers and arguments are handed values.
- **What a call may reach:** an object that is, or is reachable by type from, a handed value. An any or unknown value reaches anything. A function value or a method reaches what it is handed. This is the assumption `hash-keys.md` states.
- **What is refused:** a read of such an object without the world, after such a call (in text order, or in one loop body with it), is refused `read-after-call`. That covers a field or element read, a library read, a copy, a field of a literal and the result.
- **What is kept:** passing the object to a world-threading call, an alias, typeof, ===, a truth test, an any handle returned as it is, and a local of primitive fields the unit made.
- **Design:** one dated section in `design/alias-result.md` (dd987660).

## Pair alias_after_call (7 checks, ALL PASS; 4 FAILED at the base)
- candidate.ts aliased and otherAny: WITNESS.
- candidate.ts typedAlias and passed: PASS-bounded, lane A `ASK read-after-call`. Both were PASS-proved before the fix.
- candidate.ts freshAfter: PASS-proved.
- refactor.ts aliased and otherAny (names changed): PASS-bounded, lane A `ASK read-after-call`.
- The pair uses `candidateOnly` rows, because the refusal stops the whole file.

## Regression: 56 pairs named alias, heap, callback or receiver, run one at a time
- 55 are ALL PASS.
- heap_canonical fails 2 to 4 rows, and the count changes between runs. The base 146d1e4d fails it the same way (2 FAILED). The emitted Dafny is byte-identical in both trees, so the cause is the solver's time limit on a loaded machine, not this rule.
- A first version reached anything through a method or a function value, and counted `Math`. It refused callbacks, callback_patterns, effectful_callbacks and exception_callback. The final rule passes all four.
- The full suite and the census were not run.

## Open
- FALSE PROOF, not fixed: `hand(p, g) { g(p); return 0 }` against `g({ ...p })` is PASS-proved, with lane B PASS-bounded. The copy is the same Dafny value as p. In JavaScript, a g that writes its argument changes p on one side only.
- The rule rests on the hash-keys assumption: a closure that holds an object handed to it earlier by other code is not followed.
- The census cost is not measured. `this.x` after a call is refused when a handed value may reach the class. A read that takes the world would keep these units.

## Files and commits
- 9f26c1ed red pair · f0047f87 fix · dd987660 design · this file
- langs/ts/translate/translate.mjs; langs/ts/tests/pairs/alias_after_call/{parent,candidate,refactor}.ts, expect.json; langs/ts/design/alias-result.md
