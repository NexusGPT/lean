# The in operator with prototype names

The construct: `k in o` where `o` is a dictionary (`Record<string, V>`, `{ [k: string]: V }`) or a record, and `k` a
string. Before this reading the ordinary lane read `k in d` on a dictionary as plain map membership, which is the
meaning on an object without a prototype. JavaScript answers true for `'toString' in {}`, so a parent testing
`'toString' in d` and a candidate testing own keys (`Object.prototype.hasOwnProperty.call(d, 'toString')`) were proved
equal while every plain object tells them apart.

## The JavaScript meaning

ECMA-262 `in` is HasProperty: an own property, else HasProperty on [[GetPrototypeOf]], up the chain. A plain object (a
literal, a record, a dictionary built with `{}`) has Object.prototype as its prototype, whose own names are the fixed
list `Object.getOwnPropertyNames(Object.prototype)`: `__defineGetter__`, `__defineSetter__`, `__lookupGetter__`,
`__lookupSetter__`, `__proto__`, `constructor`, `hasOwnProperty`, `isPrototypeOf`, `propertyIsEnumerable`,
`toLocaleString`, `toString`, `valueOf`. A Map keeps its entries outside its properties: `k in m` asks about the Map
object, never about an entry.

## The reading

- `k in d` on a dictionary is an own key or a prototype name: the list is a Dafny set constant in the prelude
  (`ObjectProtoNames_`, from `common.mjs` `OBJECT_PROTO_NAMES`, the heap core's `ObjectProtoNames` twin).
- `'name' in r` on a record (or a dictionary) is `true` for a required declared field, as before, and for a prototype
  name. Other literal keys stay the uninterpreted `in_record`.
- The absence test of a dictionary read agrees: an unowned prototype name reads a function (or Object.prototype for
  `__proto__`), never `undefined` or `null`, so `d[k] === undefined` is `!(k in d) && !(k in ObjectProtoNames_)`.
  `k in d` and `d[k] !== undefined` stay proved equal on a dictionary of numbers (pair `operands_dict`).
- `k in m` on a Map is the uninterpreted `in_object` of the Map and the key. It was map membership, which proved it
  equal to `m.has(k)`.

Pair unit `present`, parent `if (k in d) return 1; return 0`, candidate `d[k] === undefined ? 0 : 1`:

```
function present_parent(d: map<string, int>, k: string): int
{ if (var ik0_ := k; ik0_ in d || ik0_ in ObjectProtoNames_) then 1 else 0 }
function present_candidate(d: map<string, int>, k: string): int
{ (if if k in d then false else true && !(k in ObjectProtoNames_) then 0 else 1) }
```

## What stays refused, rule `prototype`

- `Object.create(null)` read as a dictionary (it was admitted as `map[]`); escape `operands_proto_null_dict.ts`. This
  closes a false proof. The former pair `operands_proto` proved `tally(words)` with `Object.create(null)` equal to the
  same function with `{}`. Node prints `1 0 1 0` for `tally(['toString'])` and `tally(['__proto__'])`, parent then
  candidate. The null-prototype dictionary owns `toString` after the write; the literal's read finds the inherited
  function, so `seen[w] === 1` fails. The pair is now that escape.
- A `__proto__:` member of a literal (it sets the prototype and makes no key); escape `literal_proto_member.ts`.
- `in` anywhere in a file that makes an object with another prototype (`Object.create`, `Object.setPrototypeOf`,
  `Reflect.setPrototypeOf`, a `__proto__:` member, an assignment to `.__proto__`). Such an object can reach any unit of
  the file, and the ordinary lane has one `map` for both kinds. The predicate `prototypeMaker` in `common.mjs` is shared
  by the lint and the translator. Escape `in_prototype_maker.ts`. Write `Object.prototype.hasOwnProperty.call(o, k)` for
  an own key.
The heap core's prototype bit (`design/heap-stage4.md` section 6, `DictIn_`) is the reading that would admit a
null-prototype dictionary later: the cell carries whether its prototype is Object.prototype.

## Soundness

The reading assumes every dictionary and record value is a plain object. This is the record invariant
(`decorators.mjs`) widened to dictionaries, and lane B draws plain objects. Cases considered:
- a null-prototype object made in the file: refused above;
- one made outside the file and passed in: outside the declared scope (a record with a foreign prototype likewise);
- a write `d[k] = v` with a runtime key `__proto__` and an object or `null` value: it replaces the prototype and the
  map records an own key. This was unsound before this reading and is still unsound. It belongs to the dictionary write
  reading and is an open question for the lead. A primitive value is ignored by the setter, and `'__proto__' in d` is
  true either way.

Lint: the three refusals above, rule `prototype`; nothing else changes. Lane B runs JavaScript on the plain objects it
draws (never a null-prototype one), so unit `inherits` witnesses on its first input.

## Instances (census repos, `W/census/repos`)
- `langchainjs/libs/langchain-core/src/utils/tiktoken.ts:14` `!(encoding in cache)`, a module dictionary: enters (own
  key or prototype name; the unit is async with a fetch, so other rules decide it).
- `langchainjs/libs/langchain-core/src/messages/transformers.ts:1077` `chunkType in _MSG_CHUNK_MAP`, a module record
  keyed by a string: enters the dictionary reading where the map is typed as one.
- `langchainjs/libs/langchain-core/src/load/serializable.ts:220` `!(key in read) || read[key] === undefined`: both
  halves take the reading, and the absence test now agrees with `in` on a prototype name.
- `langchainjs/libs/langchain-classic/src/memory/stores/entity/in_memory.ts:14` `this.store = Object.create(null)`, a
  `Record<string, string | undefined>`: refused `prototype`. The file's `key in this.store` really differs on
  `toString`.
- `langchainjs/libs/providers/langchain-typesafe/src/classifier.ts:217` `Object.create(null)` for question ids: refused
  `prototype`. Its comment names the `__proto__` setter case this reading leaves to the write reading.
