# Void promise handles

**The construct.** A promise held as a value, not consumed where it is made, whose value has no identity of its own:
`const a = jobs.start(id)` with `start(id): Promise<void>`, then `jobs.track(a)`, `await a`, `Promise.all([a, b])`, a
field or parameter of type `Promise<void>`, a handle unit returning it. The value types in question: `void`, `undefined`,
`null`, `never`, a union of these, and any type whose Dafny reading is `Unit`.

**JavaScript meaning.** Each call returns its own promise object. Two promises of `void` are two objects that settle at
their own times, reject with their own errors, and are told apart by any outside code that receives one
(`p.then(...)`, `p === q`). Which promise reaches the outside, and the order in which a unit awaits two of them, are
observable: awaiting `a` then `b` throws `a`'s error when both reject; the other order throws `b`'s.

**The defect this note answers.** A promise read as its value type (design/promise-handle.md, soundness point 7): the
handle of a held call is the transition's value term, which names one promise only while the value type has more than
one value. For `Promise<void>` both terms have type `Unit`, and Dafny knows every `Unit` is `Unit`; for
`Promise<undefined>` and `Promise<null>` the translator wrote the absent constant in place of the term. The probe
(parent passes held promise `a` to an outside call, candidate passes `b`):
- `Promise<undefined>` and `Promise<null>`: lane A PASS-proved, a false proof.
- `Promise<void>` (passed, awaited in the other order, `Promise.all([a, b])` against `[a, a]`): not proved only because
  Z3 did not split on the one-constructor datatype; the hint `assert t0.Unit? && t1.Unit?;` closes the lemma.
Promises of a value with more than one value (`number`, `string`, `boolean`, `'done'`, `undefined | null` read as
`Nullish<Unit>`) keep the term and were not proved equal; neither were two fresh `Promise.resolve(n)` (each is an
outside transition) nor two calls of one method (the world differs).

**The reading.** A promise of a value with no identity is a handle: the opaque Dafny type `PromiseHandle<T>`
(`type PromiseHandle(==)<T>`, T the value's reading). An un-awaited call, an unconsumed chain and a same-file handle
unit return the handle; awaiting it is the existing `await_value` transition, which yields the value; a parameter, a
field or an argument of that promise type carries the handle. Awaited calls are unchanged: they yield the value
directly. Pair void_promise, unit `track`:

```dafny
var (wld, t0_) := ext_call_args_Ext_Jobs_start_World_Ext_Jobs_string(wld, jobs, id);
var a: PromiseHandle<Unit> := t0_;
var (wld, t1_) := ext_call_args_Ext_Jobs_stop_World_Ext_Jobs_string(wld, jobs, id);
var b: PromiseHandle<Unit> := t1_;
var (wld, t2_) := ext_call_args_Ext_Jobs_track_World_Ext_Jobs_PromiseHandle_Unit(wld, jobs, a);
```

Sites (translate.mjs): `identityFreeT` and `isHandleT` beside `isPromiseT`; `dtype` of a promise; `externalCall`, the
optional call and `promiseOutsideCall` keep the handle when not awaited; `coerce` keeps a handle in a promise slot;
`retType` and the four same-file callee sites keep a handle unit's handle; `call` awaits a same-file handle unit
through `await_value`. `PromiseHandle` is reserved, so a user type of that name is renamed.

**Soundness.** (1) Two handles are equal only as the same term: the same transition, arguments and world, which is the
same call returning the same object. (2) An opaque type has no constant the translator can substitute, so the absent
fold no longer applies. (3) Promises of a value with identity keep the old reading: their terms are uninterpreted
values of a type with more than one value, so different calls are never proved equal (probes above). (4) Awaiting a
same-file handle unit adds an `await_value` transition on both sides alike; an awaited outside call still reads as one
`await_` transition, so `await begin(x)` against `await jobs.start(x)` is not proved (a gap, never a false proof).
(5) A function-typed value returning such a promise still reads its result as the value; a body returning a handle
there is a Dafny type error, so nothing is proved (no false proof). (6) Not covered here: aliasing of two equal fresh
objects passed out (`track(a); track(a)` against `track(a); track(b)` with fresh records) is the heap core's question.

**Lint.** Unchanged. The existing `promise` refusal of a returned held name whose value has no identity
(`promise_handle_void_name.ts`) could now be lifted; left for the lead.

**Lane B.** Real promises. It finds the await-order change (`order`: WITNESS), but which promise object reaches an
outside call is not in its request trace: `track` and `absent` are PASS-bounded on both versions. Recorded in the pair
as the expected lane B verdict; the fix belongs to exec/ (a promise argument recorded by the call that made it).

**Pair void_promise.** `order`, `track`, `absent` changed (not proved; base: `absent` falsely proved); `held` (renamed
handle, inlined label) and `relay` (handle taken through the handle unit `begin`; base: not proved) proved; `begin`,
`name` untouched.

**Measured on real code.** 120 files holding `Promise<void>` (every sixth of 1,063 under the two census roots),
translated `--core --tolerant --no-project --heap` before and after: 378 units translated, 10 failed, on both; the
per-file unit lists are identical; 9 files now carry a `PromiseHandle`, and `dafny resolve` reports the same errors on
each before and after. An untranslated (linted-out) handle unit that is awaited keeps its earlier reading.

**Instances** (nexus bench tree):
- `apps/backend/src/chats/classes/chat.ts:217` Chat.refreshCacheFromDb, `await this._pendingCacheWrite`: enters; reads
  `await_value(wld, Option<PromiseHandle<Unit>>)` where it read `Option<Unit>`, so two pending writes no longer collapse.
- `apps/backend/src/chats/classes/chat.ts:196` Chat.writeToCache, a chain stored in a field: fails to translate, unchanged.
- `apps/backend/src/_common/streaming/serial-write-queue.ts:43` SerialWriteQueue.enqueue, `this._tail = this._tail.then(..)`:
  enters the lint; `awaitSettled` and `drain` (lines 66, 75) return the field and stay refused (`promise`).
- `apps/backend/src/permissions/infrastructure/permission-context.service.ts:151` resolveContext, `??=` of a void
  promise field: stays out (`receiver-mutation`, `promise`).
- `apps/frontend/src/modules/UltimateCue/session/conversation-identity.ts:143` an async IIFE in a field: stays out.
- `apps/backend/src/documents/utils/rate-limiter.ts:25` RateLimiter.waitIfNeeded, `await this.sleep(ms)` on a
  `new Promise` unit: the callee is linted out, so the await keeps its earlier reading.

## 2026-10-27: lane B names the promise object

**The gap.** Lane B rendered every promise as `{ $promise: true }` and awaited a returned promise down to its value.
The outside could receive a different object, and the run still matched. On the base, `track`, `absent` and the four
units below were PASS-bounded.

**The reading** (`exec/fake.mjs` `namePromise`, `promiseName`, `render`). The world can answer a promise in three
ways: a typed call or field, a faulted call (rejected), or an input of a promise type (`exec/gen.mjs`). Each such
promise is named `promise#N from <path>`. N is the order in which its path first made a promise in this run. The path
is the fake's own, call counter included. The rendering carries the name beside the settled value, or beside the
rejection. A world promise the unit returns as it is adds the name to the outcome as `promise` (`exec/run.mjs`
`observe`, `exec/program.mjs` `step`). The name never comes from a memory address. A second render, which restores
the call counters, makes the same names, so one side's runs stay deterministic. A promise the unit makes itself stays
anonymous: an async result, a `.then` product or a `new Promise`.

**Soundness.** A WITNESS here is a real difference. Two names differ only when the paths differ. Two paths differ
only when the two promises came from two calls, two fields or two inputs, so they are two objects. One path read twice
gives one name. This can only lose a witness, never invent one. An await is not a request, so lane B still does not
observe which promise a unit awaits. It sees the await order only through the seeded rejections (`order`).

**Pair void_promise, added units** (both sides are inside the subset):
- `handout`: a held void promise returned in a record, `{ done: a }` against `{ done: b }`.
- `swap`: `both(a, b)` against `both(b, a)`.
- `stash`: a `Promise<undefined>` stored on an outside field.
- `gate`: a `Promise<null>` passed to an outside call.

All four are changed units. On the base, lane B read each one PASS-bounded. With the reading, each is a WITNESS at
input 0. `track` and `absent` move from PASS-bounded to WITNESS. A bare `return a` against `return b` is a WITNESS
through the outcome name, but the lint refuses it (`promise`).
