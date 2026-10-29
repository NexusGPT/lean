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

### 2026-10-28: dictionary keys, the `__proto__` guard, and records with an index signature

The construct (plan 2026-10-28 section 4): a literal key read on a dictionary (`d["limit"]` on
`Record<string, number | undefined>`), a string key written under a test that rules out `'__proto__'`, and a key
read on a record that declares fields and an index signature (`request.headers["x-agent-id"]`).

A literal key on a dictionary is a map read, as any string key is (`elemAccess`, the `dictRead` branch): an owned key
reads its value, a missing key undefined, an Object.prototype name not owned reads that member (ECMA-262 10.1.8
OrdinaryGet walks the prototype). Before, a literal key went to the field reading, which wrapped an optional value in
`Some` a second time (a Dafny type error, so `d["limit"] ?? 0` on `Record<string, number | undefined>` never
translated). Values typed `T | undefined` now read None for a missing key and `proto_member_<V>(key)`, a function of
the key, for a prototype name. The other dictionary readings (`??` on values typed without undefined, the entries
loop, the field reading) read one absent value for every prototype name, so on the base `{}["toString"] ?? 0` and
`{}["valueOf"] ?? 0` were proved equal by lane A (lane B witnesses them). A literal key naming a member of
Object.prototype on a dictionary is now refused (`prototype`, escape dynamic_key_proto_name_read); a string key that
holds such a name at run time keeps the one-value reading, and the faithful fix is a value per name in those readings.

A write `d[k] = v` with `v` an object or null and `k` a string may reach the `__proto__` setter of Object.prototype
(10.1.9 OrdinarySet, B.2.2.1.2), which replaces the prototype and makes no key; it stays refused (`prototype`, escapes
proto_write_object, proto_write_null). It is read as a map update when the code rules the name out first: the key is
one name (a const, or a parameter the function never assigns) and the write sits under `k !== '__proto__'` (one
conjunct of `&&`), in the else branch of `k === '__proto__'` (one disjunct of `||`), or after
`if (k === '__proto__') return|throw|break|continue` in its block (`protoKeyGuarded` in common.mjs, inside
`protoKeyWrite`, so the lint and the translator answer alike). TypeScript does not narrow a string by `!==`, so the test
is read off the syntax. Pair unit putItem, `if (k !== "__proto__")` against an early return:

```
var out: OMap<string, Option<int>> := DictPut(out, "base", Some(n));
if k != "__proto__" then
  (
    var out: OMap<string, Option<int>> := DictPut(out, k, None);
    (if if k in out.m then out.m[k].None? else false then 1 else 0)
  )
else
  (-1)
```

A record with declared fields and an index signature is OPEN (`openRecordType`, common.mjs): its Dafny datatype holds
the declared fields, not the entries of the index. On the base the lint admitted an open or undeclared key on it, by
bracket (an uninterpreted lookup of the datatype) and by dot, and `h[k]` against `({ accept: h.accept })[k]`, like
`h.trace` against the copy's `.trace`, was PASS-proved (Node: "v" against undefined). Both forms are now refused
(`dynamic-key`, escapes dynamic_key_index_signature and dynamic_key_index_signature_dot), in the lint's dictionary key
rule and member read, with the translator failing the same read in fieldOf and before openKeyRead; a declared field
keeps its field reading (pair unit acceptOf), and a read rooted at an outside or lib global (`process.env[k]`) is a
read of the world. Lane B now draws such a record with up to two entries of the index type, keyed by the names the unit
reads (exec/spec.mjs recordSpec), so pair dynamic_key_open (agentOf, traceOf) witnesses what lane A refuses.

Stays refused: a guard on a key assigned after the test (escape dynamic_key_proto_guard_rebound, rule prototype); a
plain string key on a declared record that holds a method (escape dynamic_key_record_member); `Object.hasOwn(d, k)` is
not read as a guard. Lane B runs the JavaScript; its typed inputs carry no index entries beyond the declared fields
and rarely draw `'__proto__'`, so lane A carries these cases. Pair dynamic_key: limitOf proved, pageOf WITNESS,
putItem proved, putChecked WITNESS, acceptOf proved. A read rooted at an outside or lib global (`process.env[k]`)
is a world read and keeps its reading.

Measured (`node langs/ts/census.mjs <root>`, base 6661006 against this change): nexus 23,753 to 23,728 of 26,520
inside, dynamic-key units stopped 167 to 193; n8n 4,314 to 4,312 of 6,337, dynamic-key 50 to 65. Every unit newly
refused (25 and 2) reads an undeclared key of a record with an index signature held as a parameter or a value (the
false-proof shape), the rest of each rise is units already refused whose first finding is now this one; none was freed: the census's literal header reads (`request.headers["x-agent-id"]`) are on such
records, so plan item (a) stands for dictionaries and records without an index signature; the datatype stays closed,
right once no undeclared read reaches it.
