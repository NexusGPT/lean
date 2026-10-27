# Stage 5 rank 17: member reads through constraints

The construct: `x.id` where `x: T` and `T extends { id: string }`; `o.verbose` where `o: this["options"]` (langchainjs
`this["ParsedCallOptions"]`); `x.name` where TypeScript narrowed `x` to `never`. Before this rank the lint refused each as
`unsupported-member` ("property .id on T is outside the subset"): the receiver's type is not a record.

## The reading

A type parameter `T extends C` promises every value of `T` has `C`'s members, and nothing else about them. The read
`x.id` is one uninterpreted function of the value, `ext_field_id_T<T(==)>(a0: T): string`, generic in the parameter
(`external` makes the prelude function generic when a unit type parameter appears in its signature), typed by the
constraint's member. The same function stands on both sides, so equal values read equal members, which is all a proof
may assume. The lint admits the read when the constraint is one record declaring the member (or a dictionary); a
constraint that is a union, a primitive or absent stays refused. TypeScript itself substitutes a union constraint at the
read site (`x` where `T extends A | B` has type `A | B` there), so that case takes the existing union reading.

An indexed `this` type (`this["options"]`) is already typed `Any` by the translator (an indexed access type has no
reading); the lint lets the read through as on `any`, an uninterpreted accessor `Any_verbose`. A read on `never` is
unreachable code: TypeScript's strict mode refuses it as an error, a looser project reaches the lint, and any reading is
sound there (the translator types `never` as `Any` too).

One Dafny unit of `idOf<T extends Named>(x: T)` returning `x.id + ":" + String(x.n)` (pair unit `idOf`):

```
function id_of_parent<T(==)>(x: T): string
{ ((ext_field_id_T(x) + ":") + ext_to_string_int(ext_field_n_T(x))) }
```

What stays refused, with an escape fixture (`fixtures/escapes/ts/member_constraints_primitive.ts`), rule
`unsupported-member`: a type parameter constrained to a primitive (`T extends string`, `x.length`): read
`String(x).length`. A member the constraint does not declare is a TypeScript error before the lint. `?.` on a type
parameter fails at translation.

Lane B draws a type parameter as its declared constraint (`exec/spec.mjs`): `T extends { n: number }` draws records
with a number `n`. Before, the element was opaque, `x.n` was `undefined` on both sides and a changed sum stayed
PASS-bounded (`NaN` equals `NaN` in the observation); the pair unit `total` is its check.

## Measurement

Pair `member_constraints`: `idOf` (the id read once into a local, proved), `total` (WITNESS), `Box.flag` (the flag
negated through an indexed `this` type, WITNESS), `tagOf` (untouched). No pair unit reads `never` (strict mode).
Census (`node langs/ts/census.mjs`, the rank 16 state as the base): nexus 23,756 to 23,774 of 26,520; langchainjs 3,491
to 3,561 of 4,871 (the indexed `this` reads of its chat models). The stage 5 table predicted 31 and 41 alone.
