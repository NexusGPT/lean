# A for-in over a record, read in key order

The construct: `for (const k in o)` where `o` is a record value (an object type with declared fields, a class
instance, an `any` or `unknown` value, a union of these), as against a dictionary (dict-order.md), an array, a string, a
Set or a Map. Before this row the translator read the keys as `Object_keys(o)`, a bodiless function of the record
datatype; the datatype forgets creation order, so `const o = { a: x, b: y }; for (const k in o) s += k` was proved
equal to the same loop over `{ b: y, a: x }` (15 verified, 0 errors on the base), while JavaScript returns `ab` and `ba`.
The same held for a parameter (`for (const k in p)` against a loop over `{ b: p.b, a: p.a }`) and for an `any` local.

## The JavaScript meaning

ECMA-262 14.7.5.9 EnumerateObjectProperties visits the own enumerable string keys, then the prototype chain's; a plain
literal's prototype is Object.prototype, which has no enumerable key. The own keys come in OrdinaryOwnPropertyKeys order
(10.1.11): every array index (a canonical numeric string below 2^32 - 1) ascending, then the other string keys in
creation order. A literal creates its properties in source order (13.2.5.5); a repeated key keeps its first place, and
a write to a key the object has keeps its place (10.1.9). A numeric literal name is its ToString (`{ 1.50: x }` is `"1.5"`).

## The reading

One predicate, `forInKeyOrder` in `common.mjs`, read by the lint and the translator alike:
- the order is a function of the value alone (every non-null part is a string, number, boolean, array, Set, Map or a
  dictionary): the reading is as before (the dictionary's carrier `d.keys`; `Object_keys` of a sequence);
- the iterated value is a plain literal, or a `const` local without a type annotation that a plain literal initialises
  (property assignments and shorthands; no spread, method, accessor, computed name or `__proto__`) and whose every other
  use in the unit keeps its own keys: a field read, a write of a field the literal made, a nested read or write, a
  for-in, `Object.keys/values/entries`, a `typeof` type query. The keys are a constant sequence in property order:

      var s := key_order_loop0_parent(["a", "b"], 0, s);

  A literal in the loop header is still evaluated: `(var lit0_ := <literal>; ["z", "y"])`;
- anything else is refused: lint rule `key-order`, and a translator `fail` at the same site (`key-order: ...`).

`Object.keys/values/entries` of a const literal local keep their reading (`recordEnumeration`, the same property order);
a for-in of the same local is now a safe use there, so a unit reading the keys both ways keeps both readings exact
(pair unit `both_same`, proved).

## What stays refused, and why

`key-order` (new): a for-in over a parameter, a field, a call result, a spread (`{ ...p }`: the spread copies p's
order, which the datatype lost), a class instance (constructor order), an `any` or `unknown` value, a local with a type
annotation, or a literal local that is passed, returned, aliased, spread, deleted from, called as `o.f()` or written
under a key it did not make. Each of these can hold the same datatype value in two key orders. Escape
`fixtures/escapes/ts/forin_order_outside_record.ts` (four units, four refusals). The advice: loop over a literal the
function makes, over a `Record<string, T>` (its carrier keeps the order), or over an array of the keys.

## Soundness

Two sides are proved equal only when both iterate the same constant key list, and that list is the one JavaScript
visits: it is computed from the literal's own names, indexes first, never assumed. Two literals in different orders give
different lists (`key_order`, `written`, `in_header`, `with_keys`: not proved, lane B WITNESS); index keys reorder on
both sides alike (`index_first`, proved, lane B PASS-bounded). The local's uses are checked over the whole unit, nested
callbacks included, so no write the walk did not see can add or remove a key: TypeScript refuses a dot write of an
undeclared key on an unannotated literal, and the walk refuses a bracket write, a delete and every escape of the
reference. Where the order is not fixed the unit is refused, never read as an unordered set.

## What lane B sees

Lane B runs JavaScript: a literal orders its keys as V8 does (the ECMA order), so the must-not-prove units are WITNESS
on every input. For a parameter the input generator builds the record in its declared field order, which is why
`keysOfParam` (proof-hunt pair) is a WITNESS against a candidate that rebuilds `{ b, a }`.

## Measured

Pair `forin_order` (9 units): key_order, written, in_header, with_keys, via_dict not proved and WITNESS; same_order,
index_first, both_same, untouched proved and PASS-bounded. The proof-hunt class of the for-in (`keyOrder`,
`entriesOrder` not proved; `keysOfParam`, `optKeys` refused by `key-order`). Over the files with a for-in in the two
census roots (15 and 15 files), the new rule names 13 sites in nexus and 6 in langchainjs
(`results-forin-order/forin-sites.txt`); every one iterates a parameter, an `any` value or a field, which the base read
with an order-blind `Object_keys`.

## Instances (census repos)

- nexus `apps/backend/src/deployments/core/domain/value-objects/metadata-lookup-key.ts:62` `tryDeriveMetadataKey`:
  for-in over a parameter of an imported record type: refused (key-order).
- nexus `apps/backend/src/tools/tools-internal/tool-utils.ts:36` `recursiveObjectAssign`: for-in over `any`: refused.
- nexus `apps/backend/src/_common/providers/docxtemplater/index.ts:52`: for-in over an `any` parameter: refused.
- nexus `apps/backend/src/_common/filters/sentry-sanitize.ts:69`: for-in over a dictionary: unchanged.
- langchainjs `libs/langchain-core/src/load/map_keys.ts:41` `mapKeys`: a dictionary: unchanged.
- langchainjs `libs/langchain-core/src/utils/fast-json-patch/src/helpers.ts:27` `_objectKeys`: for-in over an untyped parameter: refused.
