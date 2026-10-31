# Lane symbol-sum-arm: result (2026-10-31)

Branch `lane/symbol-sum-arm`, from lean `09032a594` (lead-09032a59). Commits are made with
`GIT_AUTHOR_NAME="lane symbol-sum-arm"` set per command: the machine has no git identity, and the shared config was
not touched.

## Commits, oldest first

| Commit | What |
| --- | --- |
| 9a73e7641 | pair `types_symbol_bigint`, red: `keyText`, `keyName`, `choiceText` (4 failing rows of 25) |
| bd1da6905 | rule 1: `sumType`'s categories hold `symbol` (translate.mjs): a union `typeof` separates, a symbol among them, is a sum whose symbol arm is opaque |
| 1a415d0a4 | rule 2: lane B draws symbols (spec.mjs `symbolSpec`, gen.mjs `case 'symbol'`, run.mjs `env.exports`, fake.mjs `render` `{$symbol: description}`) |
| 8beb15888 | pair rows `amountSet`, `present`, red: proved on base where `0`, `0n`, `""` make them differ |
| 627192e18 | the truth defect: `truthy`'s last case (translate.mjs) gives a value read opaque (Any, a type parameter) the uninterpreted truth, never `true` |
| 7df0d645e1 | design note: types-inventory.md "A sum with a symbol arm, read (2026-10-31, night)" |
| (this commit) | this file |

## What I did and why

- **Rule 1.** `sumType` (translate.mjs) built a sum only from arms of category array, string, number, boolean or
  bigint, so `string | symbol` and `string | unique symbol` were read opaque, and `typeof` on them was the
  uninterpreted `typeof` of Any. Now `symbol` is one more category (its `runtimeTag` was already `'symbol'`). The arm's
  Dafny type is the opaque `Any` that `dtype` already gave a lone symbol. `typeof` decides by constructor, and the
  narrowed branch reads the arm's field. Truthiness of the arm is `true` (`sumTruth`'s default), which is correct for a
  symbol. Two symbol members share one `typeof` result, so such a union is no sum and stays opaque.
- **Rule 2.** Lane B's spec read every symbol type as `opaque`, so the symbol arm was drawn as a fake object, a value of
  neither arm. Base therefore WITNESSed `keyText` (the arms tested in either order) on that fake, a false witness, and
  could not reach a difference planted on the symbol arm. Now:
  - `symbol` is the spec kind `symbol`, drawn as `Symbol('lean')` or `Symbol.for` of a drawn string.
  - A `unique symbol` holds one value, so it is drawn as the constant the unit's module exports (found through the
    module's exports, aliases resolved). The sandbox's first load sets `env.exports`. A unique symbol the module does
    not export stays opaque, as before: another symbol would not be a value of the type.
  - `fits` admits a symbol for kind `symbol`. A symbol renders as `{$symbol: description}`.
- **A defect met (unsound on base).** `truthy`'s last case read every type it had no case for as `true`. That includes
  a union read opaque (Intl's `Amount`, which holds `0` and `0n`) and a type parameter. Lane A proved
  `value ? "set" : "unset"` equal to `"set"` for both. Fixed at that case: a value whose reading is `Any` or a type
  parameter takes `valueTruth`'s uninterpreted `truthy_Any` / `truthy_T`.

No rule names a repository, file or unit.

## The pair `types_symbol_bigint` (29 checks, ALL PASS)

`JOBS=2 node langs/ts/tests/run.mjs --pair types_symbol_bigint`. New rows:

| Unit | Construct | Lane A | Lane B |
| --- | --- | --- | --- |
| keyText | `string \| symbol`, arms tested in either order | proved | PASS-bounded |
| keyName | the text on the symbol arm changed | not proved | WITNESS (`Symbol.for("")`) |
| choiceText | `string \| typeof CANCEL`, the text on the unique symbol arm changed | not proved | WITNESS (`{$symbol: "cancel"}`, the exported constant) |
| amountSet | `value ? "set" : "unset"` on `Amount` against `"set"` | not proved | WITNESS |
| present | the same on a `T` | not proved | WITNESS |

Failing rows without each element:
- base (9a73e7641): `Equal_key_text proved` FAIL (got not proved); `lane B keyText PASS-bounded` FAIL (got WITNESS, on
  a fake); `lane B keyName WITNESS` and `lane B choiceText WITNESS` FAIL (got PASS-bounded).
- rule 1 alone (bd1da6905): the three lane B rows still FAIL (`/tmp/ssa-r1.log`).
- without the truth fix (translate.mjs of 1a415d0a4 with the rows of 8beb15888): `Equal_amount_set not proved` and
  `Equal_present not proved` FAIL (got proved) (`/tmp/ssa-r5-abl.log`).

No row of the pair separates drawing the exported constant from drawing `Symbol('lean')` for a unique symbol. Such a
row needs `c === CANCEL`, which the translator refuses (`mixed-types`, as on base), and that refusal stops the whole
file. The reason for the constant is the type: no other symbol is a value of `typeof CANCEL`, and a drawn one would
make lane B separate `c === CANCEL` from `typeof c === "symbol"`.

## Regression pairs (all green, at 627192e18)

`JOBS=2 node langs/ts/tests/run.mjs --pair <p>`, one at a time (`/tmp/ssa-reg/<p>.log`):

| Pair | Checks | Why |
| --- | ---: | --- |
| types_symbol_bigint | 29 | this lane's pair |
| types_this | 23 | brief |
| branch_types | 14 | brief |
| type_tests | 59 | brief |
| heap_canonical | 13 | brief |
| copied_argument | 10 | brief |
| generics | 7 | a type parameter's truth |
| member_constraints | 9 | a type parameter's truth |
| tuples_intersections | 17 | a type parameter's truth |
| types_depth | 17 | `types` |
| types_enclosing_params | 24 | a type parameter's truth |
| branded_keys | 11 | holds a `Symbol` (render) |
| jsx_handlers_symbolic | 22 | `symbol` |
| heap_unions | 9 | sums |
| heap5_unions | 9 | sums |
| type_assertions | 45 | sums under assertion |

Also `exec/gen.test.mjs`, `exec/record.test.mjs`, `exec/usage.test.mjs`: exit 0.

Regression list: empty.

## Census

Base `09032a594`, head `627192e18`, each a `git archive` (`/root/lanes/symbol-sum-arm/{base,head}`), started under the
gate (fewer than 6 census processes, at least 12 GB available; `census/gate.txt`):
`NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs /root/da/census/repos/langchainjs --out <json>`.
Compared with types-form5-6-primitives' `moves.mjs` (`census/langchainjs-moves.txt`).

| Root | Units | Form 5 | Form 6 | Stopped by `types` | Entered | Other units whose stop changed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| langchainjs | 6,709 | 0 → 0 | 0 → 0 | 0 → 0 | 3,567 → 3,567 | 0 |

No unit entered at base is stopped at head. Form 5 was already 0 here: since lane types-form5-6-primitives such a union
enters, read opaque. This lane changes how an entered unit is read, which the census does not count. n8n: not run (the
brief names langchainjs). nexus: not run, memory.

## What is left

- Equality on a sum with a symbol arm (`c === CANCEL`, `a === b`) stays the `mixed-types` refusal, as on base: a
  sentinel test is common in prompt libraries, and a reading of it (a symbol arm compared by an uninterpreted
  equality of Any, `false` against every other arm) is the next refinement.
- `k.description` on a narrowed symbol is `unsupported-member`. `t[TAG]` stays `dynamic-key`.
- A unique symbol that the unit's module does not export (imported from another module, or kept local) is still drawn
  as a fake.
- Seen, not mine: the lead's note that `class_handles` does not translate at 09032a59 (addressed to another lane).
  Not run here.
