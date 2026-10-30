# asany-key: a record written `as any` as a string-keyed Map or Set key

## Found
- Lane A gave a FALSE PROOF on three units at b8efb60f. The run with the equal block printed `Equal_count_by_key not proved | FAIL | proved`, the same for `set_by_key` and `has_other`, then `TOTAL | 11 checks | 3 FAILED`.
- The Dafny lane A emitted for `countByKey` (parent):
  `var m: OMap<string, int> := OMapPut(m, ext_Any_as_string_Any(ext_Any_of_Rec_Rec(r1)), 1);` and the same line for `r2`, then `|m.keys|`.
- `r1` and `r2` are both `Rec(a := n)`, so the two keys are one term. Lane A read size 1, while JavaScript gives 2.
- The cause: `reference-key` and `reference-equality` read the asserted type (any). They saw no object.
- The same hole reached `(r1 as any) === (r2 as any)`, a local `const s: string = r1 as any` compared with `===`, `r as unknown as string` and `[n] as any` as a key. The lint admitted all of them.

## Changed
- `langs/ts/common.mjs` `erasedReferenceSlot`. A record, array or function whose type an assertion erased is refused where identity is compared. The rule follows the assertion and any local it writes.
- The slots: `===` `!==` `==` `!=` (not against null, undefined or a literal), a switch, `Object.is`, a Map key, a Set item, `includes`, `indexOf` and `lastIndexOf`.
- The translator's `expr` refuses `reference-key` and `reference-equality`. The lint's `expr` refuses `reference-equality`. `reference-key` stays with the translator, as it already does for an object-keyed Map.
- Lane A now emits, for countByKey: `translate: parent.ts:8: reference-key: \`r1 as any\` is a Rec whose type an assertion erased; as a Map key or a Set item it is compared by reference (SameValueZero), ...`
- One dated section is appended to `langs/ts/design/type-assertions.md`.

## Pair asany_record_key, final rows (8 checks, ALL PASS)
- candidate.ts countByKey, setByKey, hasOther and countByNumber: WITNESS.
- candidate.ts countByString: PASS-proved, lane A PASS-proved.
- refactor.ts countByKey, setByKey and hasOther: PASS-bounded, lane A ASK `reference-key`. The refactor renames the locals, so JavaScript cannot tell it apart.
- At b8efb60f the same refactor rows read PASS-proved. I measured this in a throwaway worktree, then removed it.
- The pair uses `candidateOnly` rows. The refusal stops the whole file, so the equal block cannot hold refused and proved units together.

## Regression check (after the fix)
- empty_collection_type: 9 checks, ALL PASS. branded_keys: 11, ALL PASS. type_assertions: 23, ALL PASS.
- hash_keys: 14, ALL PASS. heap5_cells: 11, ALL PASS. ordered_collections: 11, ALL PASS.
- The full suite and the census were not run. The census cost of the new refusal is not measured.

## Open
- A second FALSE PROOF, not fixed: `function selfEq(p: any) { return p === p; }` is PASS-proved equal to `return true`. Lane A reads it as Dafny `==` on Any, which is reflexive. JavaScript returns false for NaN, and lane B draws no NaN for any.
- A reference that reaches an identity slot through an outside call's result, or through a field of a held value, is not followed.

## Files touched
- langs/ts/common.mjs, langs/ts/translate/translate.mjs, langs/ts/lint/lint.mjs
- langs/ts/tests/pairs/asany_record_key/{parent.ts,candidate.ts,refactor.ts,expect.json}
- langs/ts/design/type-assertions.md, lane/asany-key-result.md
- Commits: b8efb60f (red pair), fd18c2c5 (fix), 9820cae2 (design), plus the result commit.
