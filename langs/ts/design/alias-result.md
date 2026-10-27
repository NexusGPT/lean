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
heap unit. The lint does not know the core (the translator plans the core after its lint gate), so a core unit that
changes a call result is refused too, as a core unit that changes a local alias of a field already is.
Lane B runs the real code: the add reaches `this.items`, `mark` and `bump` are WITNESS. No change.
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
