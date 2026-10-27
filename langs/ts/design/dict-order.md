# A dictionary read in key order

The construct: a dictionary (`Record<string, V>`, `{ [k: string]: V }`: a plain object with a string index and no
declared key) read in its key order: `Object.keys/values/entries(d)`, `for (const k in d)`, `{ ...d }`. Before this row
the ordinary lane wrote it as the Dafny `map<string, V>`, a value without order, and read its keys through an
uninterpreted function of that map: `d['x'] = a; d['y'] = b; Object.keys(d).join(',')` against the swapped writes was a
theorem (one extensionality assert in the lemma body made Dafny verify it, 2 verified, 0 errors); JavaScript returns
`x,y` and `y,x`.

## The JavaScript meaning

ECMA-262 10.1.11 OrdinaryOwnPropertyKeys lists the own keys as every array index (a canonical numeric string below
2^32 - 1) in ascending order, then the other keys in creation order. A write to an existing key keeps its place (10.1.9),
`delete` removes it, a later write creates it again. Object.keys, values, entries (20.1.2.18, .23, .6) and for-in
(14.7.5.9) read that order; a literal creates its properties in source order, a spread copies the source's keys in its
order (CopyDataProperties).

## The reading

Design (a): every dictionary carries `OMap<string, V>(keys, m)`, Map's carrier (ordered-collections.md), one type
everywhere, so a dictionary passed between units of one file has the same carrier on both ends: no call-boundary rule.
The keys are held in property order: `DictPut` inserts a new key at its place (`DictIns`: an array index before the
first name or larger index, a name last), keeps an old key's place; `delete` is `OMapDel`; `DictIndex` is the
array-index test (digits, no leading zero, at most 4294967294). Reads take the keys as held: `Object.keys(d)` is
`d.keys`, values `OMapValues(d)`, entries `OMapEntries(d)`, for-in iterates `d.keys`; a literal folds `DictPut` in source
order, a spread is `DictMerge(acc, src)`; reads by key read `m`. `for (const [k, v] of Object.entries(d))` whose body
never names `d` is the for-in over `d` with `const v = d[k]`, one loop text, so that refactor proves. Pair `indexFirst`:

    var d: OMap<string, int> := (var m0: OMap<string, int> := OMap([], map[]); m0);
    var d: OMap<string, int> := DictPut(d, "b", a);
    var d: OMap<string, int> := DictPut(d, "2", b);
    Join_string(d.keys, ",")

Holding property order (not creation order) lets Z3 prove two write orders JavaScript cannot tell apart: both sides
reduce to the same sequence term (`["2"] + ["b"]`) with no extensionality step.

Why (a), measured by a scratch counter over both census roots with the base lint: units reading a dictionary in key
order (Object.keys/values/entries, for-in, spread, JSON.stringify, Object.assign) against units only indexing one:
nexus 842 (618 inside) against 712 (477 inside); langchainjs 363 (150) against 172 (89). Order reads dominate, and a
dictionary built in one unit is read in order by its caller, which (b) would have to carry across every call.

## What stays refused or opaque

- `for-in-delete` (new): a `delete` in a for-in body that may remove a key of the iterated object other than the
  current one (`delete d[k]` of a `const k` is admitted), or a call of a same-file function that deletes and is handed
  the object or reads it by closure. JavaScript skips a key deleted before its visit; the reading visits the keys held
  at the start, and with the rule switched off it proved a deleting for-in equal to a for-of over `Object.keys(d)` with
  the same body (14 verified, 0 errors). Escape `fixtures/escapes/ts/dict_order_for_in_delete.ts`.
- A hook result (`useParams`) keeps the table's `map<string, Any>`; the heap core keeps its dictionary cell and bodiless
  `DictKeysJs`; `JSON.stringify(d)` stays a transition of the carrier; `__proto__` is as before (in-prototype.md).

## Soundness

Two carriers are equal exactly when their held keys and entries are equal, and the held keys are what every order read
returns: a different property order gives different `keys` (`keyList`, `reinsert`: not proved, lane B WITNESS). The
order is computed from the writes, never assumed: `2` written after `b` comes first on both sides (`indexFirst`,
proved). A carrier from an input may break the invariant (keys out of order or missing from `m`): the theorem then
quantifies over more inputs than JavaScript makes, which only loses proofs. The entries loop reading needs a body that
never names `d`: in Dafny only a statement naming `d` changes it. A record read as a dictionary (a `{ a, b }` value
passed to a `Record<string, V>` parameter) holds its order in its creation, which the record datatype does not keep:
its conversion is named by the source text (`cast_<record>_<dict>_source_<hash>`), never shared by two differing files,
and the heap core leaves out a unit with a record where a dictionary is read (contextual type; its read of a record
cell was `[]`). Repro, proved on the base (47 verified, 0 errors), now not proved and a WITNESS (pair `viaRecord`):
`function names(d: Record<string, number>) { return Object.keys(d).join(','); }` with `names({ a: x, b: y })` via a
`const r` against `{ b: y, a: x }`.

## What lane B sees

Lane B runs JavaScript: a dictionary built in the unit orders its keys as V8 does, so `keyList` and `reinsert` are a
WITNESS on every input; input draws are unchanged. The differential case `cases/dict_order.ts` (`keyOrder`,
`reinsertOrder`, `spreadOrder`; inputs with index keys, `01`, `4294967295`, `-1`) gives the same answers in Node and Dafny.

## Instances (census repos)

- nexus `apps/backend/src/_common/utils/error-handler.util.ts:589` `sanitizeHeaders` (spread, then for-in with a key
  write): translated with `DictMerge` and a loop over `sanitized.keys` (Dafny 13 verified, 0 errors).
- nexus `_common/filters/sentry-sanitize.ts:52` (spread, for-in), `_common/prisma/sanitize-empty-uuid.ts:301`
  (Object.entries), `_common/providers/pptx/pptx-parser.service.ts:158` (Object.keys): inside the subset.
- langchainjs `libs/langchain/src/agents/utils.ts:171` (Object.keys): inside; `libs/langchain-core/src/load/map_keys.ts:41`
  `mapKeys` (for-in): inside, the translator stops at a `string | number | symbol` key on line 49, as on the base.
