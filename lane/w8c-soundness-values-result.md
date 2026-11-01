# Lane w8c-soundness-values (lean): two false-proof holes in the value reading, closed at the root

Base `lead-v4` 844ddac2. Branch `lane/w8c-soundness-values`. Design notes: `langs/ts/design/handed-key-order.md`,
`langs/ts/design/world-write.md`.

## Resume: merged onto lead-v4 0b260f05

`lead-v4` 0b260f05 (w7a, w8g and the four-lane opacity merge) was merged into this branch (a merge, not a rebase: the
lane's seven commits keep the hashes the lead verified). There were three conflicts, each resolved by keeping both
lanes' lines:
- `common.mjs` `readAfterCall`: my shared `typeReaches` stays beside the opacity lanes' `h.rebinds`. `between` keeps
  my `writeBetween(...) ||` in front of their `stmtRebinds` check.
- `translate/heap.mjs`: `holdsRecord` and `handsBuiltRecord` stay, with their `plan(order, only, opaque)`.
- `translate/translate.mjs`, the `readAfterCall` call: their `rebinds`, `siteHere` and `tailOf` opaque steps and
  `namedSite` identity, plus my `worldWrites`.

lead-v4 brought the break convention (every `LEAN_BREAK` read goes through `langs/ts/break.mjs` `broken`, and every
name is in `tests/break.mjs` MECHANISMS). The five direct reads of my two switches now go through `broken`. Both names
are registered, and both pairs' `expect.json` now carry `break` rows, so `run.mjs` checks the red itself.

One change of reading from the merge: lane w1g's `handle-write` (translate.mjs `pathUpdate`) also tells the world
about the one-level write in `lib_lodash_get` `twoAnswers`. Each of the two mechanisms keeps that unit unproved on its
own, so `twoAnswers` no longer flips under `LEAN_BREAK=world-write` alone (the first run's row: `break world-write:
Equal_two_answers flips to proved ... | FAIL | still not proved under the break: the mechanism is not what refuses
it`). Under `LEAN_BREAK=world-write,handle-write` the write is a local copy again and `Equal_two_answers` is proved
(`dafny verify ... Dafny program verifier finished with 1 verified, 0 errors`, /tmp/w8c-rb/both). The break row now
lists poke and then_call, which my mechanism alone keeps.

Validators after the merge (logs under `/root/da-bench/w8c-soundness-values/rebase/`):

    handed-key-order exit=0 :: | HANDED KEY ORDER | 14 rows | ALL PASS |
    handed-key-order --break exit=1 :: | HANDED KEY ORDER --break | 14 rows | 7 FAILED |
    withdrawal exit=0 :: withdrawal: logic-values v1 refused identically by the lint, the translator and the record; check PASS-bounded (lane A ASK) under the withdrawal, PASS-proved without; audit 664 site rows, 0 uncatalogued
    LEAN_PAIRS=handed_key_order run.mjs exit=0 :: | TOTAL | 909 checks | ALL PASS |   (5 break handed-key-order rows flip: enc, enc_pt, spread_copy, lib_keys, heap_hand)
    LEAN_PAIRS=lib_lodash_get run.mjs exit=0 :: | TOTAL | 893 checks | ALL PASS |   (2 break world-write rows flip: poke, then_call)
    opaque-calls exit=0 :: 114/114 rows hold
    w1g-opaque-handed exit=0 :: 2 ok (a held value handed to a same-file callee with a body: refused type-assertion; a collection a call was handed, changed after the call: refused read-after-call)
    w1g-opaque-handed --break exit=1 :: 2 FAIL (outside-slot, unhanded-collection: red)
    lower.mjs --audit exit=0 :: sites 664; by kind {"lint-refuse":381,"lint-advice":5,"translate-throw":4,"translate-refuse":274}; uncatalogued 0

Not rerun after the merge: the 30-pair regression, the census diff, repo conformance and the proof hunt. Their
numbers below are from 08acb72e on 844ddac2.

## What landed

1. **A record handed to an outside call carries its key order** (w2b's hole). A record datatype holds fields, not key
   order, and Dafny's datatype equality is extensional, so the order can't live inside the value: it is handed beside
   it, at every outside call (transitions, pure package and module rows, quiet calls), in both cores.
   - `translate.mjs` `orderedArg` / `keyOrderOf` / `keyOrderTop`. An object the unit did not build (a parameter,
     `this`, a field of one, an outside answer, an outside class's instance, `{ ...p }` of one) is handed as itself.
     A tree the unit builds (literals, a const local a literal initialises whose uses keep its keys, a `new` of a
     file class whose text fixes its keys, `structuredClone`, `xs.map(x => tree)`, a member a const test adds) is
     handed as `key_order_<T>(v, "{\"a\",\"b\"}")`, the keys in ECMA property order (index keys first). A choice is
     handed with the value's own test: `(if c then "s1" else "s2")`.
   - Anything else that holds a record the unit built is refused (`key-order`). So is an own object the unit (or a
     same-file callee) may reorder before the hand: a built record stored into it, an optional key written, a key
     deleted, `Object.assign` (`reorderedTypes`, `mayRunBefore`).
   - Built-ins (RegExp, Date, URL: named interfaces and classes of the default library) are the engine's: no term.
   - **The heap core had the same hole** (found here: `log({ a, b })` against `log({ b, a })` in a unit that writes a
     parameter was proved at the base). Its outside call is now handed one order text after its arguments
     (`Call_<f>_ko(hw, r, "0{\"a\",\"b\"}")`, asked of the translator when emitted). Its plan leaves a unit to the
     value reading when a record argument is neither a tree it makes nor an own path.
2. **A write through an object the world may hold is a transition** (w2d's hole). `common.mjs` `readAfterCall`
   (shared with the lint) now has write points. A write is one when its root is a local bound to the answer of a call
   that runs outside code (or a part, alias or destructured name of one), or an object a call before it was handed.
   - `translate.mjs` `newValue` threads the world after the rebuild: `store_<T>(wld, v)`.
   - After the write, a read of another world-held object that may hold the written one is a world form (or refused,
     `read-after-call`). The written name reads its own new value.
   - The rule is the heap core's: one heap, which the world shares.

Not a special case for either pair: each mechanism is a rule over every outside call or write, checked on a census
root and on every pair (below).

## Validators (verbatim)

Pairs, false `proved` at the base (844ddac2, the final pair files run on a clean base copy):

    base handed_key_order exit 1 :: | TOTAL | 26 checks | 5 FAILED |
    | pair | handed_key_order | Equal_enc not proved          | FAIL |             | proved
    | pair | handed_key_order | Equal_enc_pt not proved       | FAIL |             | proved
    | pair | handed_key_order | Equal_spread_copy not proved  | FAIL |             | proved
    | pair | handed_key_order | Equal_lib_keys not proved     | FAIL |             | proved
    | pair | handed_key_order | Equal_heap_hand not proved    | FAIL |             | proved
    base lib_lodash_get exit 1 :: | TOTAL | 13 checks | 3 FAILED |
    | pair | lib_lodash_get | Equal_poke not proved                | FAIL |             | proved
    | pair | lib_lodash_get | Equal_two_answers not proved         | FAIL |             | proved
    | pair | lib_lodash_get | Equal_then_call not proved           | FAIL |             | proved

After: both pairs ALL PASS inside the regression run below. Every unit gets the correct verdict: the eight not proved,
each a lane B WITNESS except `heapHand` (see Open 1); `same`, `index_keys`, `own_param`, `own_elem`, `cond_same`,
`poke_both`, `read_back` stay proved. Breaks (red, the same eight false proofs back):

    handed_key_order LEAN_BREAK=handed-key-order exit 1 :: | TOTAL | 26 checks | 5 FAILED |   (enc, enc_pt, spread_copy, lib_keys, heap_hand proved)
    lib_lodash_get LEAN_BREAK=world-write exit 1 :: | TOTAL | 13 checks | 3 FAILED |          (poke, two_answers, then_call proved)

The refusals (one unit per translation):

    node langs/ts/tests/handed-key-order.mjs          | HANDED KEY ORDER | 14 rows | ALL PASS |            exit 0
    node langs/ts/tests/handed-key-order.mjs --break  | HANDED KEY ORDER --break | 14 rows | 7 FAILED |  exit 1

Suite validators:

    node langs/ts/tests/withdrawal.mjs   withdrawal: logic-values v1 refused identically by the lint, the translator and the record; check PASS-bounded (lane A ASK) under the withdrawal, PASS-proved without; audit 608 site rows, 0 uncatalogued   (exit 0)
    node langs/ts/lower.mjs --audit      sites 608; by kind {"lint-refuse":381,"lint-advice":5,"translate-throw":4,"translate-refuse":218}; uncatalogued 0   (exit 0; base: sites 600, uncatalogued 0)
    python3 -I conformance/run.py ts     conformance: PASS, 252 of 252 checks passed, languages: ts   (base: the same line)
    node langs/ts/tests/package-rows.test.mjs   package rows: 16 calls read as their rows state (8 pure, 8 transitions)

Regression: the 30 sample pairs (`lane/w1h-census/sample-pairs.txt`) plus my two plus the 15 other pairs whose
translation the lane changes (46 distinct pairs), `LEAN_CONFORMANCE=full JOBS=4`, wall 29 m 45 s, exit 0:

    | PROOF-HUNT TOTAL | 297 units read by both lanes | NO HIDDEN FALSE PROOF | 0 exempt by a door (adapter, NaN or infinity on a unit with no number operation) |
    | MODEL-CONFORMANCE TOTAL | 332 units in 37 pairs (9 skipped) | 130 executable: 109 agree, 21 disagree | 168 not executable, 10 outside domain, 24 not bridged, 0 model error, 0 skipped | 0 coupling finding(s) (0 sampled) | NO NEW FINDING |
    | TOTAL | 1614 checks | ALL PASS |

Model conformance on my two pairs alone (`LEAN_PAIRS=handed_key_order,lib_lodash_get node langs/ts/conformance/run.mjs --jobs 2`):

    | MODEL-CONFORMANCE TOTAL | 19 units in 2 pairs (0 skipped) | 1 executable: 1 agree, 0 disagree | 18 not executable, 0 outside domain, 0 not bridged, 0 model error, 0 skipped | 0 coupling finding(s) (0 sampled) | NO NEW FINDING |

Every pair (334), translated at the base and after (parent and candidate): **no side changes exit status** (no unit
newly refused, none newly admitted). 17 pairs change text (the order term or the store): constructors, fake_fs,
fake_url, fresh_local_handed, fresh_tree_handed, handed_key_order, lib_lodash_get, lib_luxon, module_forms,
null_undefined, operators_values, outside_calls, promise_field, record_ops, render_handed_card, type_assertions,
world_read_after_call. Every one is in the regression set above.

## Measured

Census, one root, `NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs /root/da/census/repos/driftbench`
(base copy and lane tree; files in `/root/lanes/w8c-soundness-values/census/`):

    before: driftbench: 395 files, 5479 units, 1904 inside the subset (34.8 percent), 368 environment-blocked (255 on an unresolved type), 1526 language-refused, 0 files unreadable, 0 oversized closures, 336 s
    after:  driftbench: 395 files, 5479 units, 1904 inside the subset (34.8 percent), 368 environment-blocked (255 on an unresolved type), 1526 language-refused, 0 files unreadable, 0 oversized closures, 342 s

`census.mjs --diff`: no loss and no gain in any reading. The first cut of the order reading lost 5 units (1904 →
1899, all `key-order`). Each loss was a reading too coarse, fixed as a rule, not a case:
- `FolderSandbox.snapshot`, `FolderSandbox.listFiles`: `this.limits`; `this`'s type is the class's `this` type, so the
  receiver now reads as own.
- `print/reports.map()#0`: `{ floor, ...(note ? { floorNote: note } : {}) }`, now the choice term.
- `report/blocks.map()#0@2`: `entries.map(([id, run]) => [id, { outcome, changed }])`, now the map's elements.
- `cellFitter`: a store in a closure made after the hand, now ordered by `mayRunBefore`.

The base's false proofs closed: 8 lemmas over the two pairs (5 key order, one of them in the heap core; 3 world
write). Units the order term now reaches on the root: at least 4. The count is over whole-file translations, a lower
bound: 513 of 798 files translate whole. Among them is `packages/core/src/runner/cache.ts` `endStateCacheKey`, a
cache key `sha256(canonicalJson({ blockKey, source }))`, whose result rests on the order. No unit there writes
through an outside answer (0 stores).

## Open

1. **Lane B's trace renders a recorded argument with its keys sorted** (`exec/fake.mjs` render, line 442). A call to the
   recording proxy cannot tell `log({ a, b })` from `log({ b, a })` (`heapHand`: lane B PASS-bounded). Lane A alone
   stands there now. That is lane B's file, not changed here.
2. **A record returned, thrown or written into a world field** has no key order in either core.
   `return { a, b }` against `return { b, a }` is proved by lane A at the base and after (lane B WITNESS). The boundary
   here is the outside call; the return is the same gap, documented in heap-stage5.md and not closed.
3. **The `key-order` refusal at an outside call is the translator's alone** (the audit's one-decider). The lint admits
   those units and they then show as translator refusals (none on driftbench or the pairs). A shared decision
   (`common.mjs`, as `forInKeyOrder`) would give the lint the same rule.
4. **An `any` value is opaque to the reading**: `const o: any = {}; o.x = { a, b }; g(o)` hands no order.
5. **Two existing translator bugs met here** (both stop the theorem from resolving, so nothing is proved: safe):
   - `{ ...base, b: y }` with `b` not in `base`'s type is written `base.(b := y)`.
   - `{ ...(c ? { b } : {}), a }` yields a `Copy_Rec` of an `Any`.
   - Separately, the datatype name of a record parameter typed through an alias (`b: Box`) can differ between sides
     (`typeToString` prints the alias on one side), withholding the lemma (`interface differs`).
6. A receiver is handed bare (`({ a, b }).m()` on an outside method): rare, not read.
7. Load: one batch of six single pairs started at load 79.6 (the gate was printed, not enforced); every later run went
   through `/tmp/w8c/scripts/gate.sh` (exact value < 64).

## Commits

On `lane/w8c-soundness-values` from 844ddac2, with lead-v4 0b260f05 merged in (the merge commit after 08acb72e). Run files under `/root/lanes/w8c-soundness-values/census/`: the
censuses, diff, regression log, conformance logs, breaks and base runs.
