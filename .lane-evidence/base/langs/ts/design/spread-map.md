# Spread of a Map, its iterators and opaque values: measured, kept refused

The construct: a spread element in an array literal whose operand is not an array or a set, refused today with
`spread` ("spread works on arrays and sets only"). JavaScript iterates the operand with its iterator protocol: a
`Map` and `m.entries()` yield `[key, value]` pairs, `m.keys()` and `m.values()` the keys or values, all in insertion
order; a string yields its code points; an `any` value yields whatever its run-time iterator yields.

## What the refused forms are

A read-only type probe on every refused site of the census (the operand's type as the checker resolves it, inside
the repository's own project):

| repository | sites | MapIterator | Map / ReadonlyMap | any | string | RegExpStringIterator | other |
|---|---:|---:|---:|---:|---:|---:|---:|
| nutshell | 138 | 58 | 28 | 23 | 9 | 6 | 14 |
| agent-nexus | 23 | 12 | 3 | 4 | 2 | 2 | 0 |

The corpus refusals (`refusals-4a5bdec.json`, 59 of 64 functions on this message) show the same two families: map
iterators (`...groups.values()`, `...grantsByResource.keys()`, `...jobs.entries()`) and names the corpus export left
untyped (`...prev`, `...allTools`).

## Why there is no reading

The ordinary lane writes a `Map<K, V>` as a Dafny `map<K, V>`. That value has no order: two maps that received the
same entries in another order are the same Dafny value. Any reading of `[...m.keys()]` as a function of that value
(the existing `map_keys`, `map_entries`) would give both sides one sequence, and a parent and a candidate that insert
`a` then `b` against `b` then `a` would prove equal while JavaScript returns `["a", "b"]` and `["b", "a"]`. A
world transition keyed by the file text (the unknown-provenance record enumeration) is sound but proves nothing on a
changed file, so it would raise the inside share without one more proof. A sound reading needs an ordered Map: a
sequence of entries, or the heap core's cells with the library table's insertion rows. `any` stays refused as the
lane file asks: its iterator is unknown, and most of these sites are untyped only in the exported trees. A string
spread is code points while the string model indexes code units; it is a smaller family and stays refused here.

## What stays refused

All of the above keep `spread`; escape `spread_map_iterator.ts` (`[...m.keys()]`), beside the existing
`spread_iterator.ts` (a Set into an outside call).

## Hazards found on the way (existing readings, not changed here)

- `[...s]` on a Set is admitted and reads `set_to_seq(S)` of an order-erasing Dafny set; probes that insert the same
  elements in two orders were not proved (Z3 did not close the set equality), and lane B witnessed them.
- `for (const k of m.keys())` and `Array.from(m.keys())` translate to Dafny that fails resolution: `map_keys`
  returns `seq<K>` and the reader expects `Ext_MapIterator`. `for (const [k, v] of m)` reads `map_entries` of the
  order-erasing map; its swapped-order probe was not proved either.

Evidence that nothing wrong is proved today: every swapped-insertion-order probe above came out not proved. That rests
on Z3 not closing the set or map equality, not on the model, which would equate the two orders. An ordered Map
reading is queued by the lead as its own row.

## Lane B

Lane B runs the JavaScript: a Map built in the unit iterates in insertion order and a changed order is a WITNESS, so
these units reach PASS-bounded or WITNESS there whatever lane A refuses.
