# copied-argument: a record copy handed to a call that threads the world

## Found
- The value reading reads a copy as its source: `function Copy_Box(x: Box): Box { x }`.
- `hand`: the parent emitted `ext_call_args_invoke_World_Box_Unit_Box(wld, g, p)` and the candidate the same call with `Copy_Box(p)`. These are equal terms.
- At a7d53b84 the pair printed `Equal_hand not proved | FAIL | proved` and `Equal_twice not proved | FAIL | proved`, then `TOTAL | 7 checks | 2 FAILED`.
- A third false proof went through a same-file callee: `helper(p, g)` against `helper({ ...p }, g)` was PASS-proved at 1ffceb9b.

## Changed
- 417fe138: `translate.mjs` `identityOf` and `handedArg`, called by `externalCall` for each object argument of a world call.
- **Existing object, handed as itself:** a parameter, `this`, a module or imported value, a member read, a name bound once to one, or an outside answer.
- **Fresh object, handed as `handed_fresh_<T>(v, k)`:** a literal, `new`, a copy, or a fresh table row. The function is uninterpreted, and `k` is the allocation site's order among the sites the unit hands.
- **Why this reading:** the ordinary lane holds no identity, so the identity is the one fact the call is told. Fresh objects are named in allocation order, as the heap core names them (canonical-heap.md).
- **Refused `copied-argument`:** a same-file call's result, a name written twice, a choice of both kinds, a fresh object holding objects, and one made in a loop.
- 24736a05: `readAfterCall` now takes its reach per call (what that call and earlier calls were handed). The whole-unit set refused `spread_outside`, which was not in the previous item's sibling set.
- The fresh-handed copy of primitive parts reaches only itself.
- The latest translate commit: `unitArgs` passes the arguments of an effectful same-file callee through `handedArg`.
- Design: one dated section in `design/alias-result.md` (1ffceb9b, then the update). Copies are defined in open-datatype.md, but this rule is about identity, which alias-result.md owns.

## Pair copied_argument (10 checks, ALL PASS)
- hand: not proved. twice (one copy handed twice against two copies): not proved.
- honest (a copy read before the call and handed, p never read afterwards): proved.
- viaHelper: not proved. helper (unchanged): proved.
- Lane B is PASS-bounded on all four units it runs. Its fake g neither writes nor keeps its argument.

## Regression (each run alone, after the last change)
- All 62 pairs named copy, spread, alias, heap, callback, receiver or copied are ALL PASS. That includes heap_canonical, spread_outside and alias_after_call.
- The full suite and the census were not run.

## Open
- The receiver of an outside method on a fresh object (`{ ...p }.m()`) is not classified.
- Lane B's fakes never write or keep an argument, so none of these units is witnessed.

## Files and commits
- f321e5c0 and a7d53b84: the pair. 417fe138: the fix. 24736a05: the per-call reach. 1ffceb9b: the design section. Then the callee fix, the design update and this file.
- langs/ts/translate/translate.mjs; langs/ts/tests/pairs/copied_argument/{parent,candidate}.ts, expect.json; langs/ts/design/alias-result.md
