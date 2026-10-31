# fix-shifted-false-proof: result (2026-10-31)

Base: lean `lead-09032a59` (09032a594). Commit: `efe66852b`.

## Diagnosis

- By hand (node, `--experimental-strip-types`, the pair's two files): `new Shifted().run(420)` is **842** on the
  parent (`#base` = x + 1) and **844** on the candidate (`#base` = x + 2).
- Lane A on both sides: `shifted_run_*(wld, self, x) = ext_call_args_Ext_Shifted_base_World_Ext_Shifted_int(wld, self, x) * 2`.
  One uninterpreted function on both sides, so `Equal_shifted_run` held by identity in Dafny. The cell obligation
  `this #base: read without a transition` made check.mjs answer ASK, but the lemma itself was a false proof.
- The unsound rule: `translate.mjs`, at the fallback "an inherited method or a function-typed field: an uninterpreted
  external of the receiver and the arguments". When lane A has no unit for the member (`#m` is no unit,
  `classMethodUnits` takes identifier names only) and `reachOf.inheritedKeyText` gives no key (it takes identifier
  names only, inherited members only), the external was named `<T>_<m>`, the bare name. That name stays the same
  across a changed member under an unchanged caller. It also dropped the `#`, so `this.#m` and `this.m` shared a name.
  The same bare-name fallback stood for `o.#m()` on another receiver, `this.f()` for a field holding a function,
  `super.m()` and `a?.m()` on such members: I probed each one and each was one name on both sides over changed code.

## Fix

- `langs/ts/reach.mjs` `reachOf.memberKeyText(access)` builds the key from two parts:
  - the reach key of every declaration of the member as a class member in a source file;
  - every member of the same name that a class of this file below the declaring class declares (`#m` has none).

  It returns '' for a member declared only by a type or a declaration file. That code is the environment's, the same
  on both sides, so the bare name stays.
- `langs/ts/translate/translate.mjs` `memberCode(f)` appends `_code_<hash>` at the four bare-name fallbacks: `this`,
  `super`, an optional call, and a member on a record or opaque value. Two sides share the external exactly when the
  member's code is the same text.
- Pair row the brief names: `this_method_override` expect `shifted_run` true → false, and its `why` sentence. The
  true recorded the false proof.
- Dated note: `langs/ts/design/conformance-readings.md` section 4.

## Pairs (JOBS=2, each pair through `run.mjs --pair`; the proof-hunt logic of run.mjs proofHunt replayed on its result)

I ran the hunt with a small script outside the repository: `/root/lanes/fix-shifted-false-proof/work/hunt.mjs`.

| pair | checks | result |
|---|---|---|
| this_method_override (base) | 34 | ALL PASS, **1 hidden false proof** (Shifted.run at [420]): the red |
| this_method_override (fix) | 34 | ALL PASS (`Equal_shifted_run not proved`), 0 hidden |
| object_methods | 47 | ALL PASS |
| exported_object_methods | 13 | ALL PASS |
| inherited_method | 27 | ALL PASS |
| decorators_metadata | 41 | ALL PASS |
| heap_canonical | 13 | ALL PASS |
| type_tests | 59 | ALL PASS |
| copied_argument | 10 | ALL PASS |
| heap5_regex | 9 | ALL PASS |
| read_shaped_inputs | 11 | ALL PASS |
| regular_expressions | 9 | ALL PASS |
| class_handles | 1 | FAIL `theorem generated` (parent.ts:80 alias-mutation), **identical at the base**: not this lane's |

- Hunt over these pairs: 104 + 11 units read by both lanes, 0 hidden false proofs, 0 exempt.
- `object_methods_getters`, as the brief names it, is no pair. I ran `object_methods` and `exported_object_methods`
  in its place.
- Reach of the change: I translated both sides of every pair (translate only, without agreeCore). Only four pairs'
  Dafny holds a `_code_` external: this_method_override, heap5_regex, read_shaped_inputs, regular_expressions. All
  four are above and all pass. No translation threw.

## Regressions

None found on the pairs above. The proof-hunt row over all pairs needs the full suite (the lead's run at the merge).

## Left

- The proof-hunt row over all pairs, at the lead's full suite.
- `Named.run` is still not proved (sound, not complete). Inlining `#m` as a unit is the complete reading, left to the
  lane that owns the unit list.
- The probe cases are not in a pair yet, because the brief limits pair edits to the named row:
  - `o.#m()` on another receiver;
  - `this.f()` for a field holding a function.
- class_handles fails `theorem generated` at the base too; it is for the lead.
