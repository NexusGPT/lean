# The opacity ladder for handed objects (lane w1g, 2026-11-01)

The rules: `read-after-call`, `copied-argument`, `type-assertion`. At the lane base (lead-vm 4747022f, lean v0.1.4) they
stopped 1,130 of the 7,962 units of agent-nexus, nexus-learning and itsme-backend with the install (the census's
`refusalRules`, first rule per unit): copied-argument 533, read-after-call 421, type-assertion 176. Each rule now has
the `opaque` column `expression` (lint.mjs `OPAQUE_ROWS`): a slot the reading below grades is one opaque value at the
finding's own span, listed in the certificate (`lanes.A.opaque`, construct `expression`, the span of the occurrence).
The opaque fraction (A5, opaque statements over statements) counts the statements wholly inside a step's span
(opaque.mjs `statementCount`): an opaque value inside a statement leaves that statement's reading exact (the call,
its other arguments, the values are all read; only the handed identity, the world's state of a handle or an unchecked
conversion is uninterpreted). The result reports beside it the share of the unit's text its opaque spans cover, a
measure neither count can game. What the rules still find stays a refusal: an
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

**A port holds no field (2026-11-01, the merge with lead-v4).** The full suite found the closure too wide on a class
that holds its ports: `this.repo.find(id)` hands `this.repo` (an `interface Repo { find(...): ... }`), the closure of
`ChatService` holds `Repo`, so every later read of `this` met the call, and `this.label(row.id)` (a same-file method
of `this`, no world form) refused the unit (pair `service`); in `mixed_logic_values` the else-branch of `both` read
`this` again through `ext_now`, which cost `Equal_service_both` its proof. A type every member of which is a method
(no data property, no index signature, no type argument; common.mjs `methodsOnly`) holds no state a read takes: every
read through it is a call, a transition of the world counted where it runs, and a test of it is of its identity, which
no call changes. So the closure leaves it out, as it leaves out a function value and a promise; `reaches` still counts
the port itself (a read of the handed port is a read of what the call was handed). Both pairs read as at the base again.

Two over-counts that the wider test would have added are cut, each by the same invariant: a local bound to a new object
of primitive parts (a literal of primitive members, a copy `{ ...p }` of a record that holds no object) is made at its
binding, so a call before it cannot reach it (its start is its binding); and such a local only read by field or
returned is sealed (no call is ever handed it).

### A new object a name holds: named by its site

The wider reach makes a new object the unit made (`const slots = []`, `const program = new Command()`) reached, by type,
by calls that never saw it; before, such a read was refused ("names no identity") whenever a reached read was. A new
object bound once to a site that runs once per run of the unit (in no loop of it) is now named by that site, as
`handed_fresh_<T>(v, k)` already names one handed to a call: the read is `ext_now_fresh_<T>(wld, x, k)`, k the site's
order among the sites the unit names (translate.mjs `namedSite`, `nowOf`). Sound because after the reaching call every
write to the object is refused (a write form after the call), so its state at the read is a function of the world,
its value when the call ran (the current value of the name) and its identity (the site, unique in the run). Two new
objects of one value are two sites: pair unit `twoNew`, whose break `fresh-site` names them by value and proves the
false equality.

### A write to a handle is a transition

A one-level write `x.f = v` after a call that may reach `x` was read as `x := ext_now_<T>(wld, x).(f := v)`: the name is
rebound, but the world never sees the write, so a later call that kept the object (`keep(o); o.x = v; report()`)
answered as if it had not happened. Two units writing different values then proved equal (the probe was withheld only by
the identity guard of a record result; with an int result it is pair unit `written`, PASS-proved under the break). The
write now binds the new value and tells the world, `wld := ext_put_<T>(wld, v)` (translate.mjs `pathUpdate`), so every
later transition is a function of it. Break `handle-write`.

### Collections the unit made, and three identities

- **Sealed collection** (common.mjs `sealedCollection`): `const parts: string[] = []` then `parts.push(arg.name())` after
  a call. A collection the unit made (an array literal, `new Map()`, `new Set()` of the library) whose type holds no
  object, and whose every use keeps it from the outside (a library operation on it with primitive arguments or an
  inline callback, a member or element read, a spread, a for-of, a template hole, the unit's result; never an
  argument, an alias, a part of a literal, or a use inside a function the unit keeps or hands to a call that runs
  outside code), is reached by no call: no outside code has a name of it, and nothing inside it can change. Its reads
  are the value reading's own. Break `sealed-collection` seals a handed one too (pair unit `accumulated`); pair unit
  `tally` is the proved case.
- **Unhanded collection** (`unhandedCollection`): the same uses with objects allowed inside (`seen.set(node.path,
  node)`). The outside holds no name of it, but may change the objects it holds, so a mutating library operation on it
  after a reaching call starts from it as the world holds it (`ext_now_fresh`, its site) and is then exact; no world
  transition is needed, as nothing outside can see the collection. A handed collection stays refused
  (tests/w1g-opaque-handed.mjs; break `unhanded-collection` admits it and the check goes red); pair unit `distinct` is
  the proved case.
- A library collection's type closure is its type arguments (its elements): `Array`'s own `[Symbol.unscopables]` is no
  object of the program. Other library types keep their fields (an `Error`'s `cause` may hold one).
- `let x; ... x = v` written once names the identity `v` names; `m.get(k)` of a `Map` answers an object the map holds
  (existing), as `find` and `at` of an array already did.
- An occurrence inside a w1a block is the block's (the translator's `opaque` hook of readAfterCall takes the block's
  statements), and so is one inside an opaque step the translator emits (a switch, a try, a loop read as one step,
  translate.mjs `opaqueStep`): the step takes the world and the names it reads, so the object's state there is a
  function of its inputs.
- A loop holding a world read takes the world (translate.mjs `containsEffect` reads `worldAfter`): before, a pure loop's
  helper had no world parameter and the read could not be written.

## copied-argument: a literal of existing parts

Before, a new object holding objects handed to a call that threads the world was refused unless every part was itself a
literal (`freshTree`): the reading did not hold the identities inside it. 456 of the 1,134 units' first findings were
this. Now a literal, or a call that makes a new object, is handed (translate.mjs `mixedTree`) with a skeleton: the
literal's shape with each part written by its kind. A part is

- `V`, a leaf: a primitive, a function value, an any value, a promise (its value is the handed value's at that path);
- `E`, an existing object (`identityOf`: a member read, a parameter, an outside answer, `this`, an alias), named by its
  value as when it is handed alone;
- `{ ... }` / `[ ... ]`, a literal written in place, read part by part;
- `new(t)`, a new object made in place whose inner identities its text and its value fix: an element-keeping copy
  (`slice`, `filter`, `concat`, `toSorted`, ...: its elements are the source's), `map`/`flatMap` with an inline callback
  that calls nothing, the fresh calls (`JSON.parse`, `structuredClone`, `Object.entries`, `Array.from` without a mapper),
  `new` of a library class; t is its text;
- `site(k)`, a name bound once to a new object made in no loop, numbered as `handed_fresh` numbers sites, whose own
  interior holds no named part.

Every part sits at a key the text fixes (no computed or repeated key, no hole). A spread copies its source's fields,
each existing or a leaf (its source is existing, or holds no object); it may stand before every new part, which then
keeps its key (a later key wins) or its place counted from the end. The handed term is
`handed_fresh_<skeleton>_<T>(v, k)`. With the value, the skeleton gives the handed graph: which object is new (an identity
no one else has), which is existing (named by its value, the convention every handed argument already uses), which two
named parts are one object (one site). A new part and an existing part of equal value are two terms (pair unit `shared`,
`{ x: r.tags, y: r.tags }` against `{ x: r.tags, y: structuredClone(r.tags) }`, which a callee tells apart by identity).
The skeleton key is sha1 (a 32-bit hash could merge two skeletons).

A same-file call's result handed to the outside (`g(principalOf(x))`) is `handed_call_<key>_<T>(v, k)`: which object
it is (a new one, or one of the caller's) is fixed by the callee's code and its arguments, so the key is the code the
callee reaches (reach.mjs `keyText`, the same key the module constants and w1a's blocks use; amendment A3) and k its
call site (refused in a loop). Pair unit `viaCallee`: the callee returning the caller's object against a copy of it
(equal values); break `handed-call` drops the key.

A part made by a same-file callee (`xs.map(toRow)`) is refused, never keyed by its text: the callee could change whether
it returns new or existing objects behind the same text (amendment A3).

**Stays refused**: a spread after a new part (it may replace it), a choice between identities (`body ?? {}`: the value
does not say which branch ran), a part made by a same-file callee or a callback that calls, a named part holding another
named part, a same-file call's result in a loop, a new object made in a loop (every pass makes another object, which
one site number cannot tell apart).

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

A held value in a slot whose contextual type is any or unknown (`JSON.stringify(b.rest[k])`) was refused by the lint
although nothing reads it as a declared type and the translator converts nothing (Any to Any); such a slot is now no
refusal for a held value either, as it already was for an unchecked one.

The faithful number reading's operations (`Math.__lean_add` and kin, declared in `lean-number.d.ts`, translate/
faithful.mjs) are no outside slot (2026-11-01, the merge with lead-v4): they are the reading's own arithmetic and read
their operands as numbers. Taken for another file's function, a held value in a same-file callee's rewritten body
(`dbl(x as number)`, `n + n` read as `Math.__lean_add(n, n)`) was converted to int and the held variant returned an int
(`ext_Any_as_int`), which no candidate's operation on Any equals: `Equal_param_held` lost its proof, and the faithful
text, which refused that slot at the base and so left the file to the exact reading, placed `twice`, `result_held` and
`compound_held` (pair `type_assertions`). The faithful text refuses the slot again, as at the base.

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
| opaque_copied_argument | handed-call | viaCallee | the callee returns a copy instead of the object | two callees' results of one value merge |
| opaque_type_assertion | assertion-read | rebound | the asserted name bound to another input | the handed conversion stops reading its value |
| opaque_read_after_call | fresh-site | twoNew | the other of two new objects of one value read | the two objects are named by value alone |
| opaque_read_after_call | handle-write | written | the value written bound another way | the write never reaches the world |
| opaque_read_after_call | sealed-collection | accumulated | the length read moved before the call | a handed collection taken for a sealed one |
| tests/w1g-opaque-handed.mjs | outside-slot | viaCallee | (translation) | a same-file callee taken for the outside |
| tests/w1g-opaque-handed.mjs | unhanded-collection | grow | (translation) | a handed collection taken for an unhanded one |

## The measurement

Census with the install on agent-nexus, nexus-learning and itsme-backend (7,962 units): the three rules stopped 1,130
units at 4747022f and 528 at 6205d0e8 (−53.3%; read-after-call 421 → 184, copied-argument 533 → 179, type-assertion
176 → 165). Of the units they stopped at the base, 665 enter; their median opaque fraction is 0 (p90 0) and the median
share of their text the opaque spans cover is 0.034 (A5 threshold 0.25; `design/w1g-opaque-handed-a5.mjs`). 47 units
entered at the base are refused now, most by the wider reach that closed the two false proofs. Every number and its
command: `lane/w1g-opaque-handed-result.md`.
