# Stage 5 rank 14: a computed key in a literal whose type has declared keys

The construct: `{ [Status.Active]: n, [Status.Inactive]: 0 }` typed `Record<Status, number>`, `{ [TAG]: s, n: 1 }` with
`const TAG = "tag"`, and the update by key `{ ...row, [k]: v }` with `k: "a" | "b"`. Before this rank the lint refused
every computed key on a literal whose type is not a `Record<string, T>` dictionary ("a computed property name builds a
dictionary"), 166 findings on nexus.

## The reading

The key's type decides. A key whose type is one literal (an enum member, a `const` holding a literal, a literal itself)
names its field outright: `{ [Status.Active]: n }` is `{ active: n }`. A key whose type is a union of literals is a case
split on the key, one branch per member, the last the else branch (the key's type is exactly the union), as the read
`r[k]` already splits (`elemAccess`, stage 5 rank 3). The key is bound once before the value, in source order; the value
is translated once, its effects hoisted, and the same expression stands in every branch. The record type the literal is
built as is the one the translator already picked (`objectLit`'s `recT`): the spread's type when the first property is a
spread (`{ ...prev, [field]: value }`, the common update form), else the contextual type without its absent members,
else the literal's own type; the lint picks it the same way (`literalRecordType`), which also sends
`{ ...dict, [k]: v }` on a `Record<string, T>` base to the dictionary reading.

One Dafny step of `setField(row, k, v)` returning `{ ...row, [k]: v }` with `k: "a" | "b"` (pair unit `setField`):

```
var ck0_: string := k;
(if ck0_ == "a" then row.(a := v) else row.(b := v))
```

A partial record (`Partial<Row>`) fills the other fields with `None` per branch; a later key wins over an earlier one
(`{ a: 1, [k]: 2 }` with `k` possibly `"a"`), so each branch's field list is deduplicated keeping the last.

What stays refused, each with an escape fixture (`fixtures/escapes/ts/computed_literal_keys_*.ts`), rule `dynamic-key`:
a `string` key on a record with declared keys (the keys are not the type's; give the literal a `Record<string, T>`
type), a call inside the key (bind it first; a key call may mutate its receiver), members whose fields differ in type
(one literal per key), a member not declared on the type, a union or non-object record type (narrow it first), a
literal holding a method.

## Measurement

Census on heap/stage1 2c31b23 plus ranks 13 and 14 (`node langs/ts/census.mjs`, the rank 13 state as the base):
nexus 23,691 to 23,708 of 26,520 (`dynamic-key` 234 to 220 units); langchainjs 3,461 to 3,489 of 4,871. The stage 5
table predicted 70 and 33 alone; the gap on nexus is the 74 literals whose record type is a union (Prisma `WhereInput`
unions, `T | T[]`), refused as "narrow the literal (<type>)", and the 43 whose key is a plain `string` on a declared-key
type, refused by design. Pair `computed_literal_keys`: `byStatus` (WITNESS), `counts` (proved), `setField` (proved),
`partial` (WITNESS), `tagged` (untouched, proved).

Met on the way and fixed generally: the identity guard read an optional primitive field as a reference, so a spread of
`{ a: number; c?: string }` was never fresh and `setField` was withheld (`holdsNoRef` in `translate/heap.mjs`).
