# A prototype name read on a dictionary

The construct: a dictionary (`Record<string, V>`, `{ [k: string]: V }`, no declared key) read by a key that names a
member of Object.prototype it does not own: the literal `d["toString"] ?? 0`, or a string key holding such a name at
run time (`d[k] ?? 0`, `const v = d[k]`, `for (const [k, v] of Object.entries(d))`, `d.valueOf` on a dictionary).

## The JavaScript meaning

ECMA-262 10.1.8 OrdinaryGet: a key the object does not own is looked up on its prototype. A plain object's prototype
is Object.prototype, whose own names are the fixed list `ObjectProtoNames_` (in-prototype.md). So `{}["toString"]` is
the function Object.prototype.toString, `{}["valueOf"]` another function, `{}["__proto__"]` the prototype object, and
any other missing key undefined. TypeScript types each read `V`; the value is none of V's, and it differs per name.

## The reading

A missing key that is a prototype name reads a value per name: one uninterpreted function of the key of the value type,
`proto_member_<V>(k)`, never the absent constant. Two different names are two values Dafny cannot identify, one name is
one value on both sides; a key that is no prototype name keeps the map read (the one absent value `absent_<V>()` for a
plain read, the default for `??`). A key the unit does not know is read by cases on the key, so lane A stays sound for
any key. The text is one helper, `unownedRead` beside `missingKey` in translate.mjs, used by every dictionary reading
typed without absence: the index read (elemAccess), the dot read (fieldOf), `d[k] ?? r`, and the entries loop's
`const v = d[k]`; the reads typed with absence (`V | undefined`, noUncheckedIndexedAccess) take the same `protoValue`.
They must agree: `const v = d[k]; v === undefined ? 0 : v` against `d[k] ?? 0` (absent_number entryOr), and
`Object.entries` against for-in with an index read (dict_order pairsText), prove only when every reading of one key is
one text. Pair unit sameName, `d["toString"] ?? 0`:

```
(if "toString" in d.m then d.m["toString"] else (if "toString" == "__proto__" then ext_proto_member_int_string("toString")
  else if "toString" in ObjectProtoNames_ then ext_proto_member_int_string("toString") else 0))
```

A unit a made prototype reaches (`inPrototypeReach`) keeps the own-key reading, as `missingKey` already does. The heap
core is unchanged: a missing key marks the world out of range, so no lemma rests on its value.

## What stays refused

The literal refusal of dynamic-key (lint elemAccess, rule `prototype`, any Object.prototype name on a dictionary) is
lifted: the literal is now read like any key. The bracket rule that refuses `constructor`, `prototype` and `__proto__`
as literal keys on every receiver stays (escape dynamic_key_proto_name_read, now `d["__proto__"] ?? 0`), and so do the
`__proto__` write refusals (proto_write_object, proto_write_null, dynamic_key_proto_guard_rebound).

## Soundness

The false proof: on the base every reading gave one absent value for every prototype name, so `d["toString"] ?? 0`
against `d["valueOf"] ?? 0` proved (12 verified, 0 errors, dynamic-key lane), and with keys the unit does not know,
`(d[a] ?? 0) === (d[b] ?? 0)` against a candidate that takes two inherited names as equal proved on base ad8a2fd
("12 verified, 0 errors"; Node: false against true for toString and valueOf on `{}`). Both are now unproved (pair
proto_names protoText, sameValue). The reading asserts nothing about the member's value (it may even equal an owned
value), so it can only lose proofs a shared constant gave; a proof that remains needs the same name on both sides,
where JavaScript reads the same member. The value is typed V while JavaScript gives a function: a lemma never learns a
property of it, only its identity per name.

## Lint

The literal prototype-name clause in the dictionary key rule is removed; nothing else changes.

## What lane B sees

Lane B runs JavaScript. A literal name witnesses on any dictionary that does not own it (protoText, entryOr WITNESS);
its typed inputs never draw a prototype name as a key, so sameValue stays PASS-bounded and lane A carries that case.
No differential case: the new branch calls a bodiless function, which the Python backend cannot run.

## Instances (census repos, W/census/repos)

- `langchainjs/libs/langchain-core/src/runnables/config.ts:60` `copy[key] ?? []`: the default reading, by cases.
- `langchainjs/libs/langchain-core/src/runnables/graph_mermaid.ts:77` `formatDict[key] ?? formatDict[defaultClassLabel]`.
- `nexus-automations/server/api.ts:32` `byName[a.config.name] ?? {...}`, `:35` `lastByName[...] ?? null`.
- `apps-ui/src/lib/formulaMath.ts:171` `words[k] ?? k`; `apps-ui/src/lib/flowLayout.ts:1931` `kindLabels[o.kind] ?? "system"`.
Each reads a key the unit does not know; under this reading a prototype name in it reads its member, not the default.
Measured: see the census lines in the lane report (harness/lanes/proto-names.md).
