# heap-3: record copies from built keys, and a node read through a key tested for presence

## 1. A record copy: `{ ...x }` and `Object.assign({}, x)`

JavaScript copies every own enumerable key of x (CopyDataProperties, ECMA-262 13.2.5.5 and 7.3.25; 20.1.2.1), and a
value of a record type may hold keys its type does not name (structural typing: a wider value passes for it).

Both readings held the declared fields alone (the value lane read `{ ...s }` as `s`, the core as `Alloc_` of the
declared `Get_`). On the base 9d6229a, against the fields copied by hand, both lanes proved `{ ...s }` and
`{ ...s, a: s.a + 1 }` of `Bag { a; b; [k: string]: unknown }` (lane B WITNESS, input holding `k0`), `{ a: 1, ...s,
b: s.b }` with `a?: number` (lane B WITNESS, `a: undefined` overwrites) and `{ ...s }` of a plain record.

The invariant: a copy carries everything its source carries, known or not. One predicate, `copySource` (common.mjs),
read by the lint (rule `spread-source`), the value reading (`objectLit`) and the heap core. A source the unit built (an
object literal of named members, or a `const` of the function built from one and used only for field reads, field
writes or another spread) is read by its keys, as before. Any other record source is an uninterpreted copy,
`spread_copy_T(x)`, updated by the members written after it: two sides copying the same value prove, and the fields
copied by hand never do. No lemma says a field of the copy equals the source's: a record value holds its declared
fields alone, so equal fields would make the copy equal the source, and the hand copy `T(s.a, s.b)` equal to it too (the
general hole `return s` against `return { a: s.a, b: s.b }`, the open-record datatype row). A field read through a copy
therefore stays unproved (object_methods record_refactor). The heap core leaves such a copy to the value lane (a cell
holds declared fields alone).

```
// return { ...s, a: n }   (pair heap_3, unit set_a, value lane, both sides)
ext_spread_copy_Bag_Bag(s).(a := n)
```

Refused, where the term cannot be formed (escape spread_source): a record spread after other members, a built copy
holding a key its literal's type does not declare, and `Object.assign` onto a literal from a source the unit did not
build (the call is read as a function of its arguments' values, which hold declared fields alone; two sources are a
later spread).

Lane B: `exec/spec.mjs` draws undeclared keys only on a record with an index signature, so copy_bag witnesses and
copy_rec is PASS-bounded. The open-record row needs the same draw for a plain record parameter (zero to one extra key).

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
