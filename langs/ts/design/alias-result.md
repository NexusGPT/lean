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

## 2026-10-30: a fresh object handed to a call that threads the world (copied-argument)

`g(p)` against `g({ ...p })`. The value reading reads a copy as its source (`function Copy_Box(x: Box): Box { x }`,
open-datatype.md), which is exact for every read the unit makes itself. A call that runs outside code may also write or
keep the object it is handed, and then identity counts: a write through `g` reaches `p` in the first version only, and
the observation reads `p` after the call (SEMANTICS.md, reachable mutation). Lane A handed the outside one term in both,
`ext_call_args_invoke_World_Box_Unit_Box(wld, g, p)`, and proved them equal (pair `copied_argument` at a7d53b84).

The rule (`translate.mjs identityOf` and `handedArg`, called by `externalCall` for each object argument of a call
that threads the world): an existing object is handed as itself. That is a parameter, `this`, a module or imported
value, a member or element read, a name bound once to one, or an outside call's answer. A fresh object is handed as
`handed_fresh_<T>(v, k)`: a literal, `new`, a copy, or a table row that makes a new object (`slice`, `map`, `filter`,
`Array.from`, `structuredClone`, ...). The function is uninterpreted and `k` is the allocation site's order among the
sites the unit hands, so a fresh object equals no existing one and two sites are two objects, as in the heap core,
where fresh cells are named in allocation order (canonical-heap.md). The choice follows the existing design: the ordinary
lane has no identity to give a value, so the identity is the one fact the call is told, and the same site handed twice
is the same object. Refused `copied-argument`, where the identity cannot be named: a same-file call's result (fresh or
held by the callee), a name written more than once, a choice between kinds, a fresh object holding objects (the
identities inside it are not held), and one made in a loop (every pass makes another object). A handed fresh object of
primitive parts reaches only itself, so `readAfterCall` no longer counts it as reaching the unit's other objects.
`readAfterCall` also takes the handed values per call now: a call reaches what it is handed and what calls that ran
before it were handed (the outside may keep those), never a value the unit hands only later. A call ran before another
when it is that call, ends before it in the text, sits inside its operands, or repeats in a loop with it. The whole-unit
set refused `outside(next(), ...xs, next())` (pair `spread_outside`), where `xs` is handed only to the outer call.

Pair `copied_argument`: `hand` and `twice` (one copy handed twice against two copies) are not proved; `honest` (a copy
made, read before the call, and handed, against the same copy made inline) is proved. Lane B passes all three, because
its fake `g` neither writes nor keeps its argument.

The arguments of a same-file call that threads the world go through `handedArg` too (`unitArgs`): `helper({ ...p })`
against `helper(p)`, where `helper` hands its parameter to `g`, was proved at 1ffceb9b and is not now (pair unit
`viaHelper`). Open: the receiver of an outside method (`{ ...p }.m()` on a typed object) is not classified.

## 2026-10-30: read-after-call narrowed (one decider, seven over-counts cut)

The first rule refused 25 suite pairs. It also had no catalogue entry, so the withdrawal audit listed
`translate.mjs:6363`. `readAfterCall(checker, sf, u, h)` now lives in common.mjs, and both deciders call it with their
own readings `h`. The translator passes `isEffectCall`, its world-field tests and `identityOf`. The lint passes a
subset: a call is a method of an any value, a call of a function parameter or an await; a member of a class instance is
read through the world; try, switch, labeled statements and loops are opaque. So the lint never refuses a unit the
translator reads. `read-after-call` and `copied-argument` are catalogued under the mutation reading (readings.mjs).
The message names the call and the value it was handed.

Cut, each a read the rule counted that is not a read without the world, or a call that runs no outside code:
- a member the translator reads through the world: a field a method of its same-file class writes
  (`ext_Account_get_balance(wld, a)`), and a getter;
- a module-state name (read through the world);
- a function the unit makes and keeps (a JSX handler, a returned closure): its body is no read of the unit (SEMANTICS.md,
  function values). A call inside a callback counts where the callback is handed, except for an effect hook, whose
  callback runs after the render;
- a call's answer as a receiver or argument, and a lib global or imported name as receiver: they reach what the outside
  was handed, which is counted there; the receiver of an array, Map, Set or string op without a function argument;
- a React hook and a Promise combinator: they run no outside code while the unit runs;
- a same-file call whose body, and its callees' bodies, make no call that runs outside code; `h.call(r, x)` of a
  same-file unit is that unit;
- a caught value starts at its catch, a name destructured from a call starts at its binding, an occurrence inside an
  opaque block is the block's, a promise is a handle, and a one-level write `x.f = v` is a write.
- a unit the translator reads whole (an opaque module block or accessor body) holds no read of its own: the check runs
  inside the body translation, so a refusal there takes the module fallback as any body refusal does;
- a read inside a callback handed to a call that runs outside code, or to a hook, is part of a function value (code and
  cells); the calls inside it still count at the call it is handed to. A React hook or a Promise combinator also hands
  its arguments to no outside code, so `copied-argument` does not classify them.

The last cut is reasoned, not probed: the output is rebuilt from `x` on both sides, and every call is recorded with the
value it was handed, so a different call order or argument is a different world. A deeper `x.a.b = v` reads `x.a` first
and stays refused. The four `alias_after_call` units stay refused; freshAfter stays proved.
