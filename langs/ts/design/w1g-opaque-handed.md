# The opacity ladder for handed objects (lane w1g, 2026-11-01)

The rules: `read-after-call`, `copied-argument`, `type-assertion`. At the lane base (lead-vm 4747022f, lean v0.1.4) they
stopped 1,130 of the 7,962 units of agent-nexus, nexus-learning and itsme-backend with the install (the census's
`refusalRules`, first rule per unit): copied-argument 533, read-after-call 421, type-assertion 176. Each rule now has
the `opaque` column `expression` (lint.mjs `OPAQUE_ROWS`): a slot the reading below grades is one opaque value at the
finding's own span, listed in the certificate (`lanes.A.opaque`, construct `expression`, the span of the occurrence,
the enclosing statement counted once in the opaque fraction). What the rules still find stays a refusal: an
expression row makes no block site (translate.mjs `translateGraded` and the lint-site deferral take `block` rows only;
every w1a row is `block`, so nothing of theirs changes).

All three readings rest on the one axiom (subset.md "Modelling axioms"): `effect(world, op, args) = (world', result)`,
with the outside reaching an object only through what this run handed it (hash-keys.md). An object handed to a call
is from then on a handle: its state is a function of the world and the object, `ext_now_<T>(wld, x)`, the value
standing for the identity as it already does for every handed argument (alias-result.md, world read).

## read-after-call: every read of a handle takes the world

Before, a field read `x.f` and a one-level write `x.f = v` after a call that may reach `x` were world forms (the
2026-10-30 world read); every other read was refused, because the value reading takes the object as it was before
the call. The other reads are now a world form too (common.mjs `worldForm` returns `'value'`): a copy or spread
(`{ ...x }`), an element read (`x[i]`, `x[i].f`), a library read of the object (`x.includes(v)`, `x.map(f)`), a
destructuring (`const { a } = x`), the object handed to a call that runs no outside code (a pure same-file unit), the
object as the unit's result. The translator reads the occurrence as `ext_now_<T>(wld, x)`, bound in the run's order
after every transition evaluated before it, and then reads that value exactly (translate.mjs `handleNow`, the same
capture-and-rename `propAccess` already uses). A form whose translation does not pass through the occurrence's own
name (a path that writes `dn(x)` directly, a module constant) is refused at the unit's end (`worldUsed`), never read
as the value before the call.

**Why it is sound.** The world term is the history of every transition with what it was handed; the object's state at
a point is a function of that history and the object, which `ext_now` names (uninterpreted, so a read moved across a
call reads another world and no proof relies on the two being equal). Reading the whole state and then an element,
a copy or the result of a library operation is exact on that state. The object is named only where `identityOf`
names an existing one (a parameter, `this`, an alias, a member or element read, an outside answer); a new object bound
to a name or a name written twice stays refused ("names no identity").

**Stays refused**, each a change of the handle the reading would have to make a transition of, or an identity it has
no name for: a write below a field (`x.a.b = v`), a compound write, `delete`, `++`, a mutating library method on the
handle (`x.push(v)`, `x.f.push(v)`), the name rebound, a new object bound to a name read after a call that may reach
what it holds.

### Two false proofs of the base, closed

The reach test asked whether a handed value may be, or hold by type, the object read (`reaches(h, o)`). It missed the
read through a holder:

- `g(r.tags); return r.tags.length` against `const k = r.tags.length; g(r.tags); return k`: PASS-proved at the base
  (the read goes through `r`, whose type no handed value holds; it reads the array `g` was handed);
- `const a = [p]; g(p); return a[0].x` against `const x0 = p.x; ...; return x0`, and the same through a record field:
  PASS-proved at the base.

Lane B witnessed both (its fake of `g` writes what it is handed), so the verdict was WITNESS, but lane A's theorem was
false. The invariant: a read of `o` sees a change a call made when some object is reachable both from what the call
was handed and from `o`. The test is now that: the type closures of the two (fields, elements, type arguments, to the
reading's depth, any/unknown/too deep meaning anything) intersect (common.mjs `share`). The holder case is pair unit
`holder`; the container case now refuses (`a` is a new object, no identity), where it was a false proof.

Two over-counts that the wider test would have added are cut, each by the same invariant: a local bound to a new object
of primitive parts (a literal of primitive members, a copy `{ ...p }` of a record that holds no object) is made at its
binding, so a call before it cannot reach it (its start is its binding); and such a local only read by field or
returned is sealed (no call is ever handed it).

## copied-argument: a literal of existing parts

Before, a new object holding objects handed to a call that threads the world was refused unless every part was itself a
literal (`freshTree`): the reading did not hold the identities inside it. 456 of the 1,134 units' first findings were
this. Now a literal (translate.mjs `mixedTree`) whose every member sits at a key the text fixes (no spread, no computed
or repeated key, no hole) is handed when each part is:

- a leaf: a primitive, a function value, an any value, a promise (its value is the handed value's at that path);
- an existing object (`identityOf`: a member read, a parameter, an outside answer, `this`, an alias), named by its value
  as when it is handed alone;
- a new object written in place: a literal (read part by part) or a call that makes one (`new`, `slice`, `map`, ...),
  held by no other name.

The handed term is `handed_fresh_<skeleton>_<T>(v, k)`, where the skeleton is the literal's shape with each existing
part written `E`, each leaf `V`, each new call part by its text. With no spread and fixed keys the value holds every
part at its path, so the value and the skeleton give the handed graph: which part is new (an identity no one else
has), which is existing (named by its value, the convention every handed argument already uses). A new part and an
existing part of equal value are two terms (pair unit `shared`, `{ x: r.tags, y: r.tags }` against
`{ x: r.tags, y: r.tags.slice() }`, which a callee tells apart by identity). The skeleton key is sha1 (a 32-bit hash
could merge two skeletons).

**Stays refused**: a part that is a name bound to a new object (`{ x: a, y: a }`: the callee could see one object in
two slots, which the value cannot say), a spread or computed key (a part's value may be overwritten, so the value no
longer holds each part), a same-file call's result, a choice between identities, a new object made in a loop.

## type-assertion: the outside slot

A value whose type nothing checked (an `as` that narrows, an any or unknown value in a typed slot) is read at Any, so no
fact of the asserted type enters a proof; where a slot needs the declared type, the reading was refused. One slot needs
no reading of the declared type at all: an argument (alone, or a part of a literal written in the argument) of a call
whose callee has no body this program reads (a function value, a method of an interface or of an any value, an import,
a declaration file's function) and is no TypeScript library operation (common.mjs `outsideSlot`, one decision for the
lint and the translator). An `as` is erased at run time: the outside is handed the value itself. The reading hands it
`ext_<from>_as_<to>(v)`, a function of that value; nothing in the unit reads it as its declared type. The conversion
is keyed by the value and the two types, not the assertion's text: two assertions of one value hand the outside one
value, which is what JavaScript does (a text key would only cost proofs).

**Stays refused**, each a slot the unit itself reads as declared, where an asserted `number` that is a string would let
a proof use arithmetic JavaScript does not do (`n + 1 - 1` is `n` on integers, `"51" - 1` on a string): a same-file
callee with a body (tests/w1g-opaque-handed.mjs checks this case by translation), a library operation (`arr.push(x as
T)`: the array is then read exactly), a literal bound to a name, a field write, an element store, a callback result.

## The --break pairs (amendments A1, A6)

Each pair has three units (unchanged with a change outside it, proved; a change inside, not proved and witnessed; a
planted change inside, not proved and witnessed) and a break row (tests/break.mjs, the runner's `break`) whose change
is outside the graded construct and whose effect flows through what the mechanism reads:

| pair | break | unit | the change outside | the false proof without the mechanism |
| --- | --- | --- | --- | --- |
| opaque_read_after_call | handle-value | moved | the copy moved before the call | the copy reads the object before the call |
| opaque_read_after_call | reach-closure | holder | the length read moved before the call | the read through the holder is not reached |
| opaque_copied_argument | handed-skeleton | shared | a copy of the part in the second slot | a new and an existing part of one value merge |
| opaque_type_assertion | assertion-read | rebound | the asserted name bound to another input | the handed conversion stops reading its value |

## The measurement

See `lane/w1g-opaque-handed-result.md`.
