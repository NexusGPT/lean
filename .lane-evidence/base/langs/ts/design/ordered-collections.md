# Stage 5 rank 22: Map and Set as ordered collections in the ordinary lane

The construct: `[...m.values()]`, `[...m.keys()]`, `[...s.entries()]`, `[...m]`, `for (const [k, v] of m)`,
`for (const k of m.keys())`, `Array.from(m.values())`, `new Map(entries)`, `new Set(items)` on a `Map` or `Set` built in
the unit or received as a parameter. Before this row the ordinary lane wrote `Map<K, V>` as the Dafny `map<K, V>` and
`Set<T>` as `set<T>`, values without order, read the iterators through the uninterpreted `map_keys`, `map_values`,
`map_entries`, `set_to_seq`, and refused the spread of a map (`spread-map.md`: an order-erasing reading would prove a
reordering equal while JavaScript observes it).

## The reading

JavaScript (ECMA-262 24.1, 24.2): a Map keeps its entries in insertion order; `set` (24.1.3.9) appends a new key and
keeps the place of an existing one; `delete` (24.1.3.3) removes it; `clear` empties; `keys`, `values`, `entries`, the
for-of and the spread visit the entries in that order; `new Map(es)` and `new Set(xs)` (24.1.1.1, 24.2.1.1) call `set`
and `add` on each element in order. A Set mirrors it with `add` (24.2.3.1), and `entries` yields `[x, x]`.
The ordinary lane now reads both as ordered carriers, values in the prelude with bodies (the differential step runs them):
`OMap<K, V>(keys: seq<K>, m: map<K, V>)` and `OSet<T>(items: seq<T>)`, the append rule of the heap core's dictionary
cell (`heap-stage4.md` section 6, row a485327e) and of its `MapSet_` and `SetAdd_` rows. `size` is `|keys|` or
`|items|`; `get` and `has` read `m` (or `items`); `keys()` is `keys`, `values()` is `OMapValues`, `entries()` and the
map's own iteration `OMapEntries`; `new Map(es)` is `OMapFrom(empty, es)`, `new Set(xs)` is `OSetFrom(empty, xs)`.
The folds and readers carry `{:fuel 3}` so a literal of a few entries unrolls. Pair `orderOf`, parent:

    var m: OMap<string, int> := (var m0: OMap<string, int> := OMap([], map[]); m0);
    var m: OMap<string, int> := OMapPut(m, a, 1);
    var m: OMap<string, int> := OMapPut(m, b, 2);
    m.keys

`function OMapPut<K(==), V>(o: OMap<K, V>, k: K, v: V): OMap<K, V> { if k in o.m then OMap(o.keys, o.m[k := v]) else OMap(o.keys + [k], o.m[k := v]) }`

## What stays refused

- `m.forEach` and `s.forEach` (`unsupported-call`; a Map calls back with value, key, map; write the for-of); escape
  `ordered_collections_map_foreach.ts`.
- An iterator held in a name, or used anywhere but a spread in an array literal, a for-of, `Array.from(it)` or a Map or
  Set constructor (`collection-iterator`, new): it is used up by its first read; escape
  `ordered_collections_iterator_value.ts`. A spread into call arguments keeps `spread` (`spread_map_iterator.ts`).
- A Map keyed, or a Set of items, by a reference type (a record, an array, an opaque value): SameValueZero compares
  references, the value reading would equate two objects with equal fields. The heap core reads these by identity
  (pair `heap5_cells`), so the lint admits them and the ordinary-lane translator refuses with `reference-key` (the unit
  is ASK when it is out of the core). No lint escape: a lint refusal would also refuse the core's units.
- `new Map(x)` and `new Set(x)` of a source other than an array, a Map, a Set, their iterator, a pure generator or an
  opaque value (`unsupported-call`), a string included (code points against the string model's code units).
- Dictionaries (`Record<string, V>`) keep `map<string, V>` in the ordinary lane; their key order is not read here.

## Soundness

Two carriers are equal exactly when their key sequences and entries are equal, which is what JavaScript observes; the
helpers are the spec's steps, so equal histories give equal values and a swapped `set` order gives different `keys`
(the pair's `orderOf` and `weighted`: not proved, lane B WITNESS). A carrier that comes from an input may break the
invariant (`keys` not the keys of `m`): the theorem quantifies over more inputs than JavaScript makes, which can only
lose a proof. Key equality is Dafny equality on primitives and on type parameters (the lemma is generic in them); NaN
and -0 do not arise in the int and real models. The case considered: `s.add({a: n}); s.add({a: n}); s.size` against one
add was proved equal on the base when the unit fell out of the heap core (an outside call); `reference-key` now
refuses it. The identity guard (`heap.mjs`) counts a spread or `Array.from` of a Map, a Set or their iterator over
primitives as fresh (entries are new `[k, v]` pairs), and a Set cell spread in the heap core now has its `Items_` row.

Lint: `spread` admits a Map, a Set and their `keys()`, `values()`, `entries()` in an array literal; `clear` is a
statement on an owned local; `collection-iterator` is new. Lane B runs JavaScript: a Map built in the unit iterates in
insertion order, so a changed order is a WITNESS (`orderOf`, `weighted`); its input draws are unchanged.

## Instances (census repos)

- nutshell `tools/design-system/src/check.ts:21` `kitComponents` and `:27` `cardFiles` (`[...kit.keys()]`): base
  `spread`, now translated.
- nutshell `tools/proof-host/src/updates-sweep-found-scenarios.ts:178` (`[...heightsByContent.values()].every`): base
  `spread`, now translated.
- langchainjs `libs/langchain-classic/src/stores/doc/in_memory.ts:40` `InMemoryDocstore.add` (`[...this._docs.keys()]`):
  base `spread`, now translated.
- nutshell `check-architecture/src/scan.ts:92` `scan` (computed callee) and `proof-host/src/live-profile.ts:54`
  `selfTimes` (`forEach`): still out, by other rules.

## Measurement

Census inside the subset, base e0eceda then this row: nexus tree 23,827 -> 23,857 of 26,520; langchainjs 3,584 ->
3,585 of 4,871. `collection-iterator` refuses 1 unit on each (`Promise.race(tasks.values())`, `keys().next()`).
Suite `LEAN_PAIRS` over this pair and the seven Map or Set pairs: 633 checks ALL PASS on the base, 657 ALL PASS here.
