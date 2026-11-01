# The key order of a record handed to an outside call (lane w8c, 2026-11-01)

## The hole

A record datatype holds a record's fields, not the order of its keys, and Dafny's datatype equality is extensional:
`Rec(a := x, b := y)` and `Rec(b := y, a := x)` are one value. The outside reads the order. `JSON.stringify` writes the
own keys in property order (ECMA-262 25.5.2, OrdinaryOwnPropertyKeys 10.1.11: array indexes ascending, then the other
keys in creation order), and lodash's `keys` lists them in that order. So lane A handed one term to the outside where
JavaScript handed two different objects, and proved

    JSON.stringify({ a: x, b: y })   equal to   JSON.stringify({ b: y, a: x })

while the texts differ (found by w2b, `lane/w2b-node-fakes-result.md` Open 1; lane B witnessed it, by luck of the
fakes). At 844ddac2 the pair `handed_key_order` has four such false lemmas: `enc`, `enc_pt`, `spread_copy`, `lib_keys`
(the pure package row, not only the transition).

## The reading (translate.mjs `orderedArg`, `keyOrderOf`)

The order can't live inside a datatype value (extensionality), so it is handed beside the value, at the boundary where
the outside first sees it: every argument of an outside call (a transition, a pure package or module row, a quiet call)
whose type can hold a record (`orderBearing`: a type with declared data fields, through arrays, tuples, Map and Set
items, dictionary values and fields). `keyOrderOf` gives the argument's order:

- **own**: an object the unit did not build (a parameter, `this`, a field or element of one, a module value, an outside
  call's answer, a `for-of` binding, an instance of an outside class). It is handed as itself: its order is its own and
  it is the same object on both sides. Dictionaries, Maps and Sets need nothing: their carriers keep their order.
- **a signature**: a tree the unit builds where it hands it: object and array literals (spreads of a tree it built
  included, a repeated key keeping its first place, index keys first), a `const` local such a tree initialises whose every
  use keeps its keys (`keptKeys`: a read, a write of a primitive field the literal made, a test, an outside call, a spread
  copy, an enumeration, a return), `structuredClone` of either. The argument is handed as
  `key_order_<T>(v, "{\"a\",\"b\"}")`, an uninterpreted function of the value and the text of its keys in property
  order, nested parts in braces and brackets and an own part as `*`. Equal texts mean equal orders, and an own object
  never equals a built one (the wrapper is uninterpreted).
- **refused** (`key-order`): anything else that holds a record the unit builds: a same-file call's result, a `new` of a
  class of the file (its constructor makes the keys), a choice of two different orders, a built local that is passed,
  stored, aliased or deleted from, a spread call of built records. Also an own object of a type the unit may reorder
  (`reorderedTypes`, over the unit and every same-file function it calls): a record it built stored into an object, an
  optional key written (it may be added at the end), a key deleted, `Object.assign` onto it. Each of these can hold one
  datatype value in two key orders.

`LEAN_BREAK=handed-key-order` turns the reading off (the argument handed bare, as before).

## Soundness

Two sides are proved equal at a handed record only when both hand the same own object, or the same value with the same
order text; the order text is computed from the literal's own names as JavaScript orders them, never assumed. A built
record whose order the reading cannot compute is refused, never read as unordered. One assumption is the one the value
reading already makes of identity: two distinct own objects with equal fields are equal values (an object's order is
then taken as the order of its value), as two such objects are already one argument to an outside call.

## Not read here

- A record returned by the unit, thrown, or written into a world field: the same gap (both cores' records hold no key
  order, design/heap-stage5.md), observed by lane B (`return { a, b }` against `return { b, a }`: lane A proves it at
  844ddac2 and after, lane B WITNESS). The boundary here is the outside call alone.
- A receiver: `({ a, b }).toString()` style calls hand the receiver bare.
- The lint does not take this decision: the translator refuses alone (the audit's one-decider).

## Tests

| test | as is | --break |
| --- | --- | --- |
| `node langs/ts/tests/run.mjs --pair handed_key_order` | 20 checks ALL PASS | `LEAN_BREAK=handed-key-order`: enc, enc_pt, spread_copy, lib_keys proved (red) |
| `node langs/ts/tests/handed-key-order.mjs` | 11 rows ALL PASS (7 refusals, 4 readings) | `--break`: 7 FAILED |
