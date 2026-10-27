# A dictionary write through a key that may be __proto__

The construct: `d[k] = v` on a local dictionary (`Record<string, V>`, `{ [k: string]: V }`). Before this reading the
ordinary lane read every such write as a map update, `d[k := v]`, which records an own key. On a plain object that is
false for one key. Pair unit `mark`, parent `d[k] = 1; return Object.prototype.hasOwnProperty.call(d, s) ? 1 : 0`,
candidate `d[k] = 1; return 1`, was PASS-proved; Node returns 0 and 1 for `k = '__proto__'`. The same held with an
object value (`d[k] = { n: 1 }`, check.mjs PASS-proved on a two-unit probe).

## The JavaScript meaning

ECMA-262 10.1.9 OrdinarySet looks for an own property `k`. A plain object made in the program owns no `__proto__`, so
the set walks to Object.prototype and finds the accessor `__proto__` (B.2.2.1.2). Its setter replaces the object's
prototype when the value is an object or null, and returns doing nothing when the value is a primitive. Either way no
own key is made: `Object.keys(d)` stays empty, `hasOwnProperty` says false, and `d.__proto__` reads the prototype.
When `d` already owns a data property `__proto__` (a computed literal key `{ [k]: v }`, `Object.fromEntries`, a
spread, JSON), the set writes that own property as for any other key.

## The reading

One predicate, `protoKeyWrite` in `common.mjs`, shared by the lint and the translator, answers for `d[k] = v`:
- `free`: the key is never `'__proto__'`: its type is a number, or every part is a string literal other than
  `'__proto__'` (a literal, a `const` of literal type, an enum member, a union narrowed by `k !== '__proto__'`), or a
  template whose fixed head or tail rules it out. The write is the map update, as before.
- `primitive`: every value the right side's type admits is a primitive (string, number, bigint, boolean, enum,
  symbol, undefined). The write is skipped on that key unless the map already owns it.
- `prototype`: the value may be an object or null (or `any`, `unknown`, a type parameter). Refused by name.

Pair unit `mark`, the parent's write:

```
var d: map<string, int> := (var pk0_ := k; if pk0_ == "__proto__" && pk0_ !in d then d else d[pk0_ := 1]);
```

A read `d['__proto__']` of an unowned key is already the uninterpreted `ext_absent_V()` (the absence test agrees with
`in`, `design/in-prototype.md`), so the skipped write and the later read hold together.

## What stays refused, rule `prototype`

A dynamic-key write whose value may be an object or null: no reading of a dictionary holds a prototype. Escapes
`proto_write_object.ts` (`d[k] = { n }`) and `proto_write_null.ts` (`d[k] = null`). The message names the rewrite
`d = { ...d, [k]: v }` (CreateDataProperty makes an own key on every key, read as `d + map[k := v]`) or a Map.
`prototypeMaker` (in-prototype's file-wide refusal of `in`) also counts such a write: it is an assignment that may
reach `__proto__`, as `.__proto__ = v` already is.

## Soundness

- A primitive on `'__proto__'`: skipped, as the setter does; reads of that key stay `ext_absent_V()` on both sides.
- An own `__proto__` key in the map (an input or a computed literal): the guard sees it and updates the key, as
  OrdinarySet does.
- An object or null value: refused, in the unit and for `in` in the file.
- Unchanged: a literal or literal-typed key other than `__proto__` keeps its plain update, so no existing proof of a
  literal-key write changes.
- Not covered here: the heap core's `DictSet_` (`translate/heap.mjs`) skips a primitive on `__proto__` by the
  prototype bit, also when the dictionary owns that key; that file is outside this lane.

## What lane B sees

Lane B runs JavaScript on plain objects and draws `'__proto__'` only when a parameter's type lists it (or a compared
literal does). With `k: string` it never meets the key, which is why lane A must be sound alone. Pair units `own` and
`mark` take `k: 'x' | '__proto__'` and witness on `'__proto__'`.

## Instances (census repos, `W/census/repos/langchainjs`)

- `libs/langchain-core/src/messages/base.ts:501` `merged[key] = value` over `Object.entries(right)`: refused
  `prototype` (an `unknown` value; a `__proto__` key from JSON really replaces `merged`'s prototype).
- `libs/langchain-core/src/load/validation.ts:206` `newKwargs[key] = value` over deserialized kwargs: refused.
- `libs/langchain-core/src/load/map_keys.ts:50` `mapped[mapper(key, map)] = fields[key]`: refused (object values).
- `libs/langchain-core/src/prompts/dict.ts:107` `formatted[k] = formattedV`, an array value: refused.
- `libs/langchain-classic/src/chains/combine_docs_chain.ts:373` `documentInfo[value] = baseInfo[value]`, `unknown`:
  refused.
- `libs/langchain-core/src/output_parsers/xml.ts:108` `result[input.name] = ...map(...)`, an array: refused.
A write of a string or a number value under a dynamic key enters with the guard.

## Measurement

See the lane report (`harness/lanes/proto-write.md`): census on both roots before and after.
