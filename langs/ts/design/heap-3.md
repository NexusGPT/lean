# heap-3: record copies from built keys, and a node read through a key tested for presence

## 1. A record copy: `{ ...x }` and `Object.assign({}, x)`

JavaScript copies every own enumerable key of x (CopyDataProperties, ECMA-262 13.2.5.5 and 7.3.25; 20.1.2.1), and a
value of a record type may hold keys its type does not name (structural typing: a wider value passes for it).

Both readings held the declared fields alone (the value lane read `{ ...s }` as `s`, the core as `Alloc_` of the
declared `Get_`). On the base 9d6229a, against the fields copied by hand, both lanes proved `{ ...s }` and
`{ ...s, a: s.a + 1 }` of `Bag { a; b; [k: string]: unknown }` (lane B WITNESS, input holding `k0`), `{ a: 1, ...s,
b: s.b }` with `a?: number` (lane B WITNESS, `a: undefined` overwrites) and `{ ...s }` of a plain record.

The reading: a record copy reads only keys the unit built. One predicate, `copySourceWhy` (common.mjs), read by the lint
(rule `spread-source`, on a spread member and on each source of `Object.assign` onto a literal), the value reading
(`objectLit`, its backstop) and the heap core (`coreUnit`). A source is built when it is an object literal of named or
shorthand members (its keys are its text), or a `const` of the same function whose initializer is built and which the
function uses only to read or write a declared field (`o.f`, `o.f = v`) or to spread again: no call, return, argument,
element access, `delete` or shorthand member hands it on, so no code adds a key. The record spread comes first in its
literal (a later one writes over the members before it), and a built copy holds no key the literal's record type does
not declare. A dictionary source (no declared field, a string index) holds every key it carries in both readings
(`DictMerge`, the core's dictionary cell) and is read as before.

```
// const base = { a: x, b: y }; return { ...base, b: y + "!" }   (pair heap_3, unit built)
var (hw_, r0_) := Alloc_R_d812e7b6(hw_, x, y);
var base := r0_;
var (hw_, r1_) := Alloc_R_d812e7b6(hw_, Get_R_d812e7b6_a(hw_, base), (y + "!"));
```

Refused (escape spread_source): a record spread of a parameter, field, `this`, module constant or call result, a record
spread after other members, and `Object.assign({}, s)` of such a source.

Lane B: `exec/spec.mjs` draws keys a type does not declare only for a record with an index signature (since 36807a8),
so the open-record unit witnesses and a plain record parameter is PASS-bounded. A record parameter needs the same draw
for lane B to witness the plain case (an undeclared key on a record that reaches a spread, `Object.assign`, for-in or
`Object.keys`); this lane does not edit exec.

## 2. A node read through a key, tested for presence

`const chat = state.chats[id]; if (!chat) return; chat.title = t` on `Record<string, Chat>` of plain records. JavaScript
reads the node for an own key, Object.prototype's member for a prototype name not owned (a function, or the prototype
object for `__proto__`: truthy), and undefined otherwise.

The reading (heap core): the declaration binds the key, `DictIn_` (own, or a prototype name under an ordinary prototype:
exactly the read's truthiness), `DictOwn_` and `DictGet_`. A test of the name (`chat`, `!chat`, `=== undefined`,
`== null`, and the negations) reads `DictIn_`; `=== null` is false (the values are nodes). A field read through the
name, and any use other than a test or a field's plain write, marks the world unless the key was owned (`KeyMark`): a
read through undefined throws, and a field of a foreign member is no value of the field's type. A plain `=` of a field
marks the world when the read was undefined, writes the node when owned, and otherwise is `ForeignSet_<shape>_<field>
(hw, key, v)`, a bodiless transition of the world (any world after it, the out-of-model flag kept), the same on both
sides for the same key and value. The unit stays in range: its lemma requires that neither side marks the world. Any
other reference the core reads (a parameter, a field) is a present node: its truthiness is `true`, `=== undefined`
false.

```
var key_chat_ := id; var has_chat_ := DictIn_Dk_..(hw_, a0_, key_chat_);
var own_chat_ := DictOwn_Dk_..(hw_, a0_, key_chat_); var chat := DictGet_Dk_..(hw_, a0_, key_chat_);
if !has_chat_ then (hw_, ()) else
  var hw_ := KeyMark(hw_, has_chat_);
  var hw_ := if own_chat_ then Set_R_.._title(hw_, chat, title) else ForeignSet_R_.._title(hw_, key_chat_, title);
```

Soundness: `DictIn_` is the read's truthiness for every key and prototype bit. A dropped guard marks the world on an
absent key, so the in-range lemma fails (mark_read). A read through a foreign member marks: `chat.n * 0` is never `0`.
A foreign write is a function of the world, the key and the value, threaded in order, so two sides prove equal only
when they make the same foreign writes in the same order. Still out (not proved, no refusal): a compound write or a
read through a guarded name when the key may be a prototype name (bump: `chat.unread += 1`), a guarded name inside a
callback, the test of a direct read `if (!state.chats[id])`.

Lint: unchanged; it admits `const chat = state.chats[id]` as a name for a node a parameter holds (heldAlias). Lane B
draws dictionaries of records, an empty one included (the witness of mark_read).

## 3. Instances (nexus tree, read by inspection; none enters)

- packages/shared/src/modules/chat/domain/operations.ts:19 `const existingChat = state.chats[chatId]; if (existingChat)`:
  its values hold arrays of non-plain records and an optional field, no core shape (alias-mutation stays).
- packages/types/src/shared/domain/tools/agent-input-schema.ts:198, parameter-prompt.ts:84: `continue`, not read by the core.
- packages/types/src/shared/domain/agents/markdown-serializer.ts:240, csv/csv-cell.ts:45: primitive presence (out of scope).

Measured: pair `tests/pairs/heap_3` and the census, in the lane report (harness/lanes/heap-3.md).
