# A change through a same-file call's result (alias-mutation, extended)
`const s = this.held(); s.add("x")`. A call returns a value; when the value is an object (a record, an array, a Set,
a Map, a class instance), the caller receives a reference to whatever object the callee's `return` named. If
`held()` returns `this.items`, then `s` and `this.items` are one Set, and `s.add` changes the receiver.
The same holds for a same-file function that returns a field of its argument (`tagsOf(user)` returning
`user.tags`) or a module object, and through any chain of same-file calls (`view()` returning `this.held()`).
## The gap
The ordinary lane reads a local as a value: `var s: set<string> := box_held(self)`, and `s.add` rebinds `s`.
The receiver's set never changes, so parent `mark() { const s = this.held(); return 0 }` and the candidate that
adds through `s` were proved equal (`Equal_box_mark`, "2 verified, 0 errors", lane schedules, 2026-10-27).
A local bound to `this.items` directly was already refused as `alias-mutation`; a call result was not.

## The rule
A local bound (with `const` or `let`, optionally through `await`, `!`, `as`, parentheses) to the result of a
same-file call, `this.m(...)` in a class method or `f(...)` for a same-file function, whose type is an object type,
is an alias unless the callee is fresh. So is a local bound to a built-in call that may return an existing object, and
the element a for-of binds (`for (const r of rs) r.n = 1` was proved equal to the loop without the write). Every refusal the rule already made for an alias now applies to it: a
mutating method (`push`, `add`, `set`, `delete`, ...), a field write, an index write, a `delete`, a mutating
method on a path below it. The lint message names the callee.

`returnsFresh(unit)` is computed once per callee and is true when every `return` (or an arrow's expression body) is:
a primitive; an array or record literal whose parts are fresh (a spread part must have primitive members); `new`
of fresh arguments; a built-in whose library table row (`library.json`, `result`, checked by lane B) is `fresh`, or
one listed beside it (`flat`, `toSorted`, `Array.from`, `Object.keys/values/entries`, `structuredClone`, ...); `find`,
`at`, `Map.get`, `Promise.resolve` of a non-literal, `Object.assign` and an unknown built-in are not; a conditional or
`??`/`||`/`&&` of fresh sides; the result of a fresh same-file call; or a local of the callee whose initializer is
fresh and whose every other use is a primitive read, a method call or a write with fresh arguments, or part of the
returned expression. Anything else is not fresh: a field, a parameter, an element, a Map lookup, an outside call,
a generator, a callee still being read (recursion), an unresolved callee.

## Why it is sound
Fresh means no name outside the caller's frame reaches the result or any object inside it: every reference part is
itself a new allocation. A record copy counts only when its members are primitives (`{ ...r }` shares `r.kids`, and
`c.kids.push(x)` would reach it); an array copy (`slice`, `map`) counts at its top, since every change below an
element (`c[0].n = 1`, `c[0].push(x)`, a for-of element) is refused on its own. A not-fresh result is refused, so the
value reading only sees a local that is the sole name of its object, where rebinding it is the change.
The translator's cells audit (`cellsOf`) records, for a local bound to a same-file call and then changed, the cells
the callee returns (`this.<field>` and module objects, through further same-file calls) as changed; outside the heap
core that is an obligation (`changed through a call result without a transition`), so a gap between the lint and the
translator reaches lane A as `ASK:obligation`, never as a proof.

## The heap core
In the heap core a local holds a `Ref`: `var (hw_, c0_) := box_held(hw_, this_); var s := c0_;` then
`SetAdd_S_string(hw_, s, "x")` writes the one heap cell `this.items` names, so the change is seen through every
name, and the lemma compares the whole final heap. The core's reading is the JavaScript meaning; the ordinary lane's
value reading is only right for a sole name. The cells audit counts the change as modelled when the unit's text is a
heap unit. What stays out: the lint runs before the core is planned, so a core unit that changes a call result is
refused too (sound in both lanes; 0 units on nutshell). When the core's reach makes that cost units, a row reorders
the gate so a unit the core reads keeps its reading. Lane B runs the real code and needs no change.
## Measured reach (census root `nutshell`, `node langs/ts/census.mjs <root>`, base 67b8201 then this lint)
Before: "2266 files, 6565 units, 5254 inside the subset (80 percent)". After: "5222 inside the subset (79.5 percent)".
29 units move out (13 by call results alone), all by `alias-mutation`; 0 are in the heap core (the base translator
with `--heap --tolerant` prints an empty `// HEAP:` header for each of their 21 files).
## Instances (census repos, read in place)
* `nutshell/core/conversations/src/live/live-conversations.ts:55`: `const slot = this.slot(c); slot.isLive = true`;
  `slot()` returns the stored record from `this.slots` or a new one: not fresh, refused (the write reaches the map).
* `held-messages.ts:131` (`this.state(c)`), `keep-work-in-flight.ts:81` (`this.of(c)`): get-or-create, refused.
* `langchainjs/libs/langchain-core/src/tracers/base.ts:364`: `run.end_time = ...` through `this.getRunById(id)`: refused.
* `nutshell/adapters/claude-cli/src/live/ndjson-splitter.ts:42`: `this.joined(n)` returns a local `new Uint8Array`
  filled by `bytes.set(piece, k)` with `piece` a field's element: not fresh by this rule (a precision loss: `set` copies).

## 2026-10-30: a read after a call that may change the object (read-after-call)

`const f = e; e.preventDefault(); return f.defaultPrevented`. A call that runs outside code (a method of an any
value, a call of a function value, an import, a same-file effectful unit, an `await`) may write any object it can
reach. JavaScript reads a field after the call from the object as the call left it (SEMANTICS.md, "aliasing counts").
The ordinary lane threads the world through the call (`var (wld, t0_) := ext_call_args_Any_preventDefault_World_Any(wld, e)`)
but reads a field without the world (`ext_Any_defaultPrevented_Any(f)`, `p.x`, `ext_Ext_C_x_Ext_C(self)`), so the read
takes the object as it was before the call. A candidate that reads the field first is then the same term, and lane A
proved four such pairs equal (pair `alias_after_call` at 9f26c1ed). The lint's `opaque-mutation` catches only a later
read with the receiver's own text (`e.m(); e.x`).

The rule (`translate.mjs readAfterCall`, before `emitUnit`, the ordinary lane only; the heap core reads cells by
identity): the run hands the outside every receiver, argument and called function value of such a call. Following
the assumption `hash-keys.md` states for code (the outside runs code only through values this run hands it), a call
may reach an object that is, or is reachable by type from, a handed value. An any or unknown value reaches anything
(it may be any object). A function value, or a method of a handed object, reaches what it is handed: its arguments and
its receiver, which are handed values themselves (`f(p)` reaches `p`; `bus.emit(topic, x)` with string arguments
reaches what `bus` holds by type, not a `readonly string[]` the unit reads). Only names the unit's own file declares
are such objects (a lib namespace such as `Math` is not); a for-of or for-in header runs once, so it does not repeat
with a call in the loop body. A use of such an object after such a call (in text order, or in one loop
with it) is refused `read-after-call` when it reads the object without the world: a field or element read, a library
method, a copy, a spread, a field of a literal, the unit's result. Kept: the object handed on to a call that threads
the world (a receiver, an argument), an alias (`const g = f`, which takes the source's start), `typeof`, `===`,
`instanceof`, a truth test, an any value returned as it is (a handle), and a local the unit made from a literal of
primitive fields that is only read and written with primitives (never handed, never aliased). A local bound to a
call's result counts its calls from its own binding. Clock and random reads run no code and are not such calls.

Pair `alias_after_call`: aliased, otherAny, typedAlias and passed are ASK `read-after-call` (they were PASS-proved);
freshAfter is proved. The refusal stops the file, so the pair reads lane A unit by unit through check.mjs.

Open: the cost is not measured on the census, and `this.x` after a call is refused whenever a handed value may reach the
receiver's class. Reading such a field through the world (a read that takes the world after the call) would keep
these units, and is the follow-up.
