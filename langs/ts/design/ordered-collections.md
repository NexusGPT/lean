# Stage 5 rank 22: Map and Set as ordered collections in the ordinary lane (plan)

The construct: `[...m.values()]`, `[...m.keys()]`, `[...s.entries()]`, `for (const [k, v] of m)`, `Array.from(m.keys())`
on a `Map` or `Set` built in the unit or received as a parameter. Today the ordinary lane writes `Map<K, V>` as the
Dafny `map<K, V>` and `Set<T>` as `set<T>`, values without order: `m.keys()` and the for-of over a map are the
uninterpreted sequences `map_keys`, `map_values`, `map_entries` of that value (an inherited limit, SEMANTICS), the
spread of a map is refused (`spread-map.md` measured why: two maps filled in another order are one Dafny value, and an
order-erasing reading would prove a reordering equal while JavaScript observes it).

## The reading to build

The heap core already reads a dictionary as a cell holding a key sequence beside the map (`heap-stage4.md` section
6, `Dk_T(keys, m, proto)`, board row a485327e asks the ordinary lane to share the append rule). The ordinary lane takes
the same shape as a value: `OMap<K, V>(keys: seq<K>, m: map<K, V>)` with the invariant that `keys` holds exactly the
keys of `m`, each once, and `OSet<T>(items: seq<T>)` with distinct items. Insertion order is then a fact of the value:
`set(k, v)` appends `k` when new and keeps its position otherwise (ECMA-262 24.1.3.9), `delete(k)` removes it from
both (24.1.3.3), `clear()` empties both, `keys()`, `values()`, `entries()`, the for-of and the spread read `keys` in
order (`values` is `seq(|keys|, i => m[keys[i]])`), `size` is `|keys|`, `get` and `has` read `m`. A `Set` mirrors it
with `add`, `delete`, `has`, `values`, `keys`, `entries`, `size`. `new Map(entries)` and `new Set(items)` fold `set`
and `add` over the sequence. Two maps that received the same entries in another order are then different values, and
the proof lane can only prove what JavaScript keeps.

## What it touches

- `translate.mjs`: `dtype` (line 922, `map<K, V>` and `set<T>`), the mutator rows (3919 to 3924 and 4060: `set`,
  `delete`, `clear`, `add`), the reads (3651 to 3659: `get`, `has`, `keys`, `values`, `entries`; 2886: `size`), the
  for-of source (4698), `seqOf` (1954 to 1958), the constructors (`new Map`, `new Set`), the literals `map[]` and `{}`,
  the externals `set_to_seq`, `map_keys`, `map_values`, `map_entries` (retired), and every helper that builds a map
  value (`Object.fromEntries`, `Object.entries` readers, `groupBy`-shaped library rows). The prelude gains the two
  datatypes and their helpers with bodies (so the differential step can run them).
- `lint.mjs`: the spread rule (line 1148: a Map, a Map iterator and `s.entries()` admitted), `MAP_METHODS` and
  `SET_METHODS` (`forEach` and `clear` stay out or join), the for-of over a map, `Array.from` on iterators.
- `heap.mjs`: the identity guard's shapes `map` and `set` (unchanged shape, new carrier).
- Lane B needs nothing: JavaScript keeps the order.
- Every existing pair that holds a Map or a Set re-verifies on the new carrier (`library_cells`, `records`,
  `spread_map`'s measured refusals become admissions); the expectations of pairs that proved on the unordered value
  stay (a proof on the ordered carrier is stronger), those that recorded a refusal change to proved or WITNESS.

## Pair, escapes, measure

Pair `ordered_collections`: a unit building a map in two orders (WITNESS on `[...m.keys()]`), a refactor from
`m.set` calls to `new Map(entries)` in the same order (proved), a reordering of two `set` calls (WITNESS), a set
deduplication by `new Set(xs)` spread back (proved against the explicit loop), an untouched unit. Escapes: a map of
records as keys (reference identity, out), `m.forEach` (out until the loop reading covers it). Census on both
corpora; the stage 5 table predicts 81 and 1 alone, a 3-day item.

## Status

Planned, not built: the plan is the deliverable of this pass; the build starts when ranks 13 to 21 are on heap/stage1.
