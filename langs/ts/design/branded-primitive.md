# A branded primitive is its primitive

A branded type (`type GroupID = number & { readonly [brand]: true }`, `type Slug = string & { __kind: 'Slug' }`) is
an intersection of one primitive with object types that exist only for the checker. TypeScript reduces two different
primitives to `never`, so every value of such a type is a value of the primitive. `common.mjs primitiveBrand(t)`
returns that primitive member for an intersection of exactly one primitive (number, bigint, string, boolean or an
enum) with object types, and null for any other type.

## Where it is read

- Ordinary-lane translator (`translate.mjs keyByValue`): a Set of branded items or a Map with branded keys compares
  them by SameValueZero on the primitive, so it is keyed by value. Before, such a Set or Map was refused
  `reference-key` as if its keys were objects.
- The carrier stays the opaque type it was (`Ext_GroupID`: the intersection has the primitive's methods, so
  `recordType` makes it opaque), now declared with equality (`type Ext_GroupID(==)`), as a type parameter is compared
  by equality. Arithmetic or string methods on the branded value stay what they were (opaque calls, or a refusal such
  as `mixed-types` for `+`).
- Lint (`lint.mjs isPrim`): a branded value is no object, so the aliasing rules do not treat it as an object that
  could alias. `===` between two branded strings, booleans or bigints is a value comparison (it was refused
  `reference-equality`). `===` between two branded numbers stays refused: the carrier's equality is reflexive and
  `===` is not on NaN, so `a === a` against `true` would be provable.
- Lane B (`exec/spec.mjs`): a branded type is drawn as its primitive. Before, it was drawn as a fake object, so no two
  draws were equal numbers or strings.

## Soundness

A Set or a Map compares keys by SameValueZero, an equivalence on every primitive (NaN equals NaN, -0 equals 0), so
the carrier's equality can stand for it: a proof that holds for every equality holds for that one. `===` on strings,
booleans and bigints is the same equivalence; on numbers it is not (NaN), which is why the lint keeps it refused
there. Nothing the unit does with the primitive's own operations is read more precisely than before.

Pair `branded_keys`: `collapsedOf` (a size test the membership implies) and `hits` (untouched) proved and
PASS-bounded; `sameSlug` (a comparison of branded strings negated), `distinct` (the Set dropped) and `seenTwice`
(size in place of membership) not proved and WITNESS.

Bench: `JSX handler attribute` RailNameField (nutshell `rail-name-field.tsx`, a `ReadonlySet<GroupID>` in the rail
model) went from translate-fail `reference-key` to translated, 3 of 3 mutants witnessed, as on a11fb78.
