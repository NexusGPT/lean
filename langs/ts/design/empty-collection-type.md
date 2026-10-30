# An empty Map or Set takes its type from its slot

`new Map()` written without arguments or type arguments resolves to MapConstructor's overload `new (): Map<any, any>`,
so the checker types the expression `Map<any, any>` even in `const counts: Map<string, number> = new Map()`. A
`new Set()` likewise leaves its `T` at its default, `any`. The ordinary-lane translator read that type at the
expression (`newExpr`, through `typeOf`), so the carrier's key was `any` and the unit was refused `reference-key`
("a Map keyed by any compares by reference").

The reading (`translate.mjs emptyCollectionT`, called first in `typeOf`): an empty `new Map()` or `new Set()` with no
type arguments, whose checker type has an `any` argument, takes the contextual type of its slot when that is a Map
(or a Set) whose own type arguments are neither `any` nor `unknown`. The slot is the declaration's annotation, the
function's return type or the parameter it is passed to.

Soundness: the collection holds no value when it is made. Every later write reaches it through the slot's binding
or a callee's parameter, both typed by the slot's type, which the checker enforces on each `set` or `add`. An
assertion that changes what is written (`m.set(k as any, v)`) is the type-assertion reading's
(design/type-assertions.md), and reads the same whether the map was written `new Map<string, number>()` or
`const m: Map<string, number> = new Map()`: this reading adds no case it did not already have. Open there: a record
key written `as any` into a string-keyed map is read through an uninterpreted conversion of the record's value, so
two records with equal fields give one key where JavaScript keeps two (lane B witnesses it; lane A was not probed
for a proof). A slot of any other type (a union, `ReadonlyMap`, no annotation) keeps the checker's type,
and so the refusal it had.

Pair `empty_collection_type`: `tally` (the increment named in a local) and `emptyCounts` (an empty map returned) proved and
PASS-bounded; `weighted` (adds 2 in place of 1) and `seen` (size in place of membership) not proved and WITNESS.

Bench: `Math.log` gramTfidf (driftbench `packages/core/src/text/grams.ts:49`,
`const vector: GramVector = new Map()`) was translate-fail `reference-key` at 0ea7a792.
