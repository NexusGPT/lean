# A write through an object the world may hold (lane w8c, 2026-11-01)

## The hole

The value reading reads a field write as a rebuild of the local value: `v.x = 1` is `var v := v.(x := 1)`. When `v` is
the answer of an outside call, JavaScript writes the object itself, and the outside may share it with what it was
handed: lodash's `get(o, 'a')` answers `o.a` itself. The world never saw the write, so a later world read of `o`
(`ext_now(wld, o)`, design/alias-result.md) read the same world on both sides, and lane A proved

    const v = get(o, 'a'); v.x = 1; return o.a.x     equal to     const v = get(o, 'a'); return o.a.x

(found by w2d, `lane/w2d-library-rows-result.md` Open 1; lane B witnesses it by running the vendored package). At
844ddac2 the pair `lib_lodash_get` has three such false lemmas: `poke`, `two_answers` (a second answer of the same
object read after the write), `then_call` (the written object reaching a later outside call).

## The reading (common.mjs `readAfterCall` write points, translate.mjs `newValue`)

A **write point** is a write (an assignment or update of a field or element, a `delete`, a mutating method such as
`push` or `set`, `Object.assign` onto it) whose root the world may hold there: a local bound once to the answer of a
call that runs outside code (or a part, an alias or a destructured name of one), or an object a call before it was
handed (`reached`, as for a read after a call). The rule is the heap core's: one heap, which the world shares.

- The decider threads the world through it: after the value is rebuilt, `store_<T>(wld, v)` is one transition
  (`h.worldWrites`, read by `newValue`). A later outside call, and a later world read, see a different world on a side
  that wrote and a side that did not.
- It is a point for the reads after it: an occurrence of another name whose type may hold the written object
  (`typeReaches`) and that the world may hold (an answer bound before the write, or an object handed before it) is a
  world form after it, read as the world holds it, or refused (`read-after-call`) where no world form reads it, as after
  a call. The written name itself reads its own new value.
- A write point inside a callback the unit makes is refused (the world is not threaded through a callback), as is one
  rooted at a value the reading does not name.

The lint shares the decision (readAfterCall), so a read it admits the translator reads. `LEAN_BREAK=world-write` turns
the write points off (the write a local copy again, as before).

## Soundness

Before, a write the world could share was lost to the world: a false proof whenever a later read or call could see it.
Now every such write changes the world term, so two sides are proved equal only when both make the same writes in the
same order on the same world, and a read of a possibly aliased object after it is the world's. The same write on both
sides, and a read of the written name, stay proved (`poke_both`, `read_back`).

## Tests

| test | as is | --break |
| --- | --- | --- |
| `node langs/ts/tests/run.mjs --pair lib_lodash_get` | 13 checks ALL PASS (lane A beside lane B on six units) | `LEAN_BREAK=world-write`: poke, two_answers, then_call proved (red), as at 844ddac2 |
