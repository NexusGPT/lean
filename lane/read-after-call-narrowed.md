# read-after-call narrowed

## What the rule wrongly counted (class_new, service, promise_then and the rest)
- **Reads that take the world.** The rule counted every member read after a call as a read without the world. In class_new, `a.balance` after `a.deposit(n)` is `ext_Ext_Account_get_balance(wld, a)`: Account's method writes the field, so it lives in the world. Module-state names and getters are read the same way.
- **service and promise_then.** These were already cured on this branch by 24736a05 (per-call reach, a copied-argument commit not yet on the lead head).
- **Calls that run no outside code.** React hooks, Promise combinators, and same-file calls that reach no outside code.
- **Reads that are not the unit's own.** Bodies of closures the unit keeps, or hands to an outside call or a hook (function values). Occurrences in opaque blocks, and units read whole as a module block.
- **Values given too wide a reach.** A call's answer, a lib global or imported name, a library receiver without a callback.
- **Wrong starting points.** A catch binding starts at its catch; a destructured binding starts at its binding.
- **Promises and one-level writes.** A promise is a handle, and a one-level `x.f = v` is a write.

## Changed (91d8b609, 03d24279)
- `readAfterCall(checker, sf, u, h)` now lives in common.mjs. translate.mjs and lint.mjs both call it with their own readings. The lint's readings are a subset, so it never refuses more than the translator.
- `read-after-call` and `copied-argument` are catalogued under the mutation reading in readings.mjs. That file is outside this item's list; withdrawal.mjs cannot pass without it.
- The check now runs inside the body translation, after the opaque choices, so it takes the existing module fallback.
- The message names the call and the value it was handed.
- `copied-argument` (unmerged item) now skips hook and combinator arguments, and promises.
- alias_after_call's expect.json: four laneA strings follow the new message. The verdicts are unchanged.
- Design: a dated section in design/alias-result.md.

## Verified (each pair run alone)
- `node langs/ts/tests/withdrawal.mjs`: 568 site rows, 0 uncatalogued.
- All 27 listed pairs: ALL PASS. void_promise was re-run after its fix (23 checks, ALL PASS).
- alias_after_call: 7 checks, ALL PASS. The four false proofs are still refused, and freshAfter is proved.
- copied_argument: 10 checks, ALL PASS.
- On the final commit: the 62 pairs named copy, spread, alias, heap, callback, receiver or copied are ALL PASS. The 27 listed pairs ran before the last change, which only skips promise arguments in copied-argument; only void_promise was re-run after it.

## Open
- The one-level write cut (`x.f = v` after a call) is reasoned, not probed.
- The lead head lacks the copied-argument commits (f321e5c0..81fc98f9). The narrowing sits on top of them and needs them merged with it.
