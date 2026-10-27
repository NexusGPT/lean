# A held handle in its optional slot

**The construct.** A held promise whose value has no identity (design/void-promise.md: `Promise<void>`, `Promise<undefined>`,
`Promise<null>`) stored where the declared type admits absence: a field `last: Promise<undefined> | null` written
`this.last = a`, a parameter's field `slots.last = a`, a `Promise<void> | undefined` field, an optional property
`last?: Promise<void>`.

**JavaScript meaning.** The assignment stores the promise object itself (ECMA-262, PutValue on a property reference). The
field then holds that object, never `undefined` or `null`, whatever the promise will settle to. `this.last = a` and
`this.last = b` leave two different objects in the field; `this.last = null` leaves none.

**The defect.** `coerce` kept a handle only when the slot's type was a promise. A union `Promise<X> | null` is not, so
the translator read the stored promise as its settled value: `undefined` read as the absent constant `None`, `void` as
a cast of `Unit`. The probe (`this.last = a` against `this.last = b`, field `Promise<undefined> | undefined`) was
PASS-proved: both sides read `set_last(wld, self, None)`. `Promise<void> | null` and a parameter's field did not resolve.

**The reading.** A value of a handle type stored into a slot whose type is that promise type with absence is
`Some(handle)` (`Nullish.Some(handle)` when the slot admits both null and undefined). The absent branch is `None` only
for an actual `null` or `undefined` value. The general rule: a held value keeps its own term in its optional slot.
Other handle-like types already did: a `Date`, a class instance and a function value stored into `T | null` read
`Some(a)` at the base; only the promise branch of `coerce` replaced the value. A field of an opaque record (an
interface with methods, no datatype) is written by an uninterpreted update `ext_<R>_set_<f>(r, v)` and read by the
existing accessor `ext_<R>_<f>(r)`; a datatype update `r.(f := v)` on it did not resolve. Pair promise_field, `park`:

```dafny
var (wld, t0_) := ext_call_args_Ext_Slots_open_World_Ext_Slots_string(wld, slots, id);
var a: PromiseHandle<Absent> := t0_;
var slots: Ext_Slots := ext_Ext_Slots_set_last_Ext_Slots_Option_PromiseHandle_Absent(slots, Some(a));
```

**What stays out.** A promise a same-file async unit returns, stored in a handle slot (`this.ending = this.terminate()`,
`const t: Promise<void> = this.run()`): the call reads the settled value, so no term names that promise. The base wrote
a cast of `Unit` (one constant for every call) or a type error; the translator now fails the unit by name. The lint
admits it (lint is not this lane's), so check.mjs keeps lane B's verdict.

**Soundness.** (1) Two stores are equal only when the two handles are the same term, the same transition returning the
same object. (2) `Some(h)` is never `None`, so a cleared field and a stored promise differ (pair unit `clear`). (3) The
opaque setter is uninterpreted and the same on both sides; different stored values give different arguments; a read
after the write is not assumed to return the stored value, a gap and never a false proof. (4) The identity guard
(heap layer 1) still withholds a lemma whose unit stores a reference into an input's field; with the guard lines
removed the changed lemmas are stated and fail ("0 verified, 1 error" on each probe), so the reading itself tells the
promises apart. (5) A same-file async call in a handle slot is refused, not cast.

**Lane B.** Real promises; since lane promise-identity it names each world promise by its path, so a different object
left in a receiver or parameter field is a WITNESS (receiver state). Pair: `stash`, `hold`, `clear`, `park` WITNESS;
`keep`, `bump` PASS-bounded.

**Pair promise_field.** `Shelf.stash` (`Promise<undefined> | null`, a against b), `Shelf.hold` (`Promise<void> | null`),
`Shelf.clear` (null against a promise), `park` (a parameter's field): changed, lemmas not proved (withheld by the
identity guard). `Shelf.keep` (the local renamed) and `Shelf.bump` (untouched): proved.

**Measured.** 15 files with an optional void-like promise slot (grep of the two census roots and the nutshell,
snitch and langchainjs clones), translated `--core --tolerant --no-project --heap` before and after: 4 files change.
`starting-folders-keeper.ts`: 3 to 1 resolution errors, `refresh` now refused by name (22 to 21 translated).
`burst-drain.ts`: 1 to 0, enters. `agent-access-keeper.ts`: 19 to 20 (the cast error gone; `check` now refused, so
its callers name an absent function, a file broken at the base by other constructs). `orphaned-agent.ts`: 0 to 0,
`end` refused by name (9 to 8) where the base wrote the one-constant cast. The other 11 files translate to the same text.

**Instances.**
- nutshell `core/conversations/src/keepers/burst-drain.ts:6` BurstDrain, `draining: Promise<void> | undefined` set from a chain: enters (`Some(t2_)`).
- nutshell `core/projects/src/starting-folders-keeper.ts:125` refresh, a same-file async call held then stored: stays out by name.
- nutshell `core/agent-access/src/agent-access-keeper.ts:127` check: stays out by name.
- nutshell `adapters/claude-cli/src/sessions/orphaned-agent.ts:75` end, `this.ending = this.terminate()`: stays out by name.
- nexus `apps/backend/src/chats/classes/chat.ts:47` `_pendingCacheWrite: Promise<void> | null`: unchanged (its writer fails to translate for another construct).
- nexus `apps/frontend/src/modules/UltimateCue/session/conversation-identity.ts:81`, langchainjs `libs/langchain-mcp-adapters/src/client.ts:73`: unchanged.
