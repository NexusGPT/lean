# Conformance readings: what the type says, what only the object says

Lane model-conformance runs each unit's two Dafny models on lane B's inputs and compares them with Node. On the
translator of f409bd8 it found three classes where lane A's reading is not the language's and a lemma was proved
anyway (row d7e54baf; board rows ebd1bfd8, df884e79, 3f98457b): `type_tests/baseTest`, `library_more/cloned` (and
`clonedAlias`), `exceptions_rebase/ignoredMethod`. Each has one structural cause, and each reading below is general:
no pair, unit or name is special-cased.

## 1. Provenance: the prototype chain is the constructor's, not the type's

A TypeScript type is a claim about shape. Assignability is structural, so any object of a class's shape passes for it:
a caller's plain record, a fake, an instance of another class. Two things are not shape. `v instanceof C` walks v's
prototype chain for `C.prototype` (ECMA-262 13.10.2, 7.3.22); `v.m(a)`, `v.p` and `v.p = x` run what the lookup along
that chain finds (10.1.8.1 [[Get]], 10.1.9.2 [[Set]], then Call). The chain is fixed by the constructor that made v.

`madeBy(e)` (translate.mjs) is the same-file classes whose `new` made every value e can hold, or unknown. It follows
parentheses, a conditional's two arms, a variable of this file through its initializer and every plain `=` that writes
it (any other write, a destructuring target, `++`, a for-of target, makes it unknown), and the returns of a same-file
function e calls (the reached code). A parameter, a field, `this`, an outside call's result and an asserted value are
unknown. `chainOf(c)` is c and its same-file bases, complete when it ends in this file.

- **instanceof.** For a made value the test is decided from the makers' chains (`madeInstanceOf`): true when the right's
  class is on every chain, false when every chain is complete without it. Otherwise the type decides only what the
  shape decides: a primitive is no instance, and two classes whose literal tags differ exclude each other (the tag is
  part of the shape the model holds). A decision resting on the prototype (the type's class is the right's class or
  derives from it) is withheld, and the test is the opaque predicate already keyed by the reach of the whole test
  (`instanceof_<C>_<reach>`, design/reach-keys.md). A class declaring `static [Symbol.hasInstance]` answers the test
  itself (13.10.2 step 2): nothing is decided from its chain or its type.
- **Method calls.** `r.m(args)` runs the class's own unit only when every maker of r finds that class's member first on
  its chain (`madeDispatch`). Any other receiver is any object of the class's shape: the call is a request of the
  world with the argument values, `<T>_<m>_held<key>(wld, r, args)`, whether or not its result is read, and the unit's
  effect flag (`isEffectCall`) follows the same test. A static call and `this.m()` keep their readings.
- **Accessors.** `r.p` and `r.p = x` through an instance getter or setter of the class: the same test in `accessorCall`,
  `<T>_get_<p>_held<key>(wld, r)` and `<T>_set_<p>_held<key>(wld, r, x)`; the getter's effect flag likewise.
- **The key** (`heldKey`): the reach of every class of this file whose instances the receiver's type admits (a subclass
  overriding the member included). A real instance runs that code, so a changed method, getter or setter is another
  request; the call site's own locals are not in the key, so two sides that reach one receiver through other locals
  name one request (`operators_values/awaitedReceiver` stays proved).

```dafny
function read_local_parent(wld: World, g: Ext_Reader, x: int): (World, int)
{
  var (wld, t0_) := ext_call_args_Ext_Reader_read_held_<key>_World_Ext_Reader_int(wld, g, x);
  var v: int := t0_;
  (wld, 42)
}
function is_base_parent(x: Base): bool { ext_instanceof_Base_<reach>_Base(x) }
```

## 2. The one copy reading: a copy carries every own key of its source

A record value from the outside carries an opaque rest (design/open-datatype.md). `{ ...x }` (CopyDataProperties,
7.3.25), `Object.assign({}, x)` (20.1.2.1) and `structuredClone(x)` (HTML 2.7.3) copy every own key, the rest
included. The value reading read the spread and Object.assign as x; the heap core read structuredClone as a fresh cell
of the declared fields alone, so the rest was dropped and a clone against the fields by hand proved.

- Heap core: `structuredClone` asks common.mjs `copySource`, the test the spread already asked: a record the unit did not
  build leaves the core for the value reading. A clone of a Set or a Map asks for primitive elements, as the array and
  the record already did (a clone's elements are new objects).
- Value reading: `copyOf` reads every copy of a record the unit did not build as the source's value inside `Copy_T`,
  whose body is the identity: every field and the rest read through it as the source's, and a copy never equals the
  fields by hand (their rest is MoreBuilt). The text says a new object was made, so a copy and its source are two
  texts, and the identity guard (`// GUARD`, theorem.py), not textual equality, decides a copy compared as a graph
  against its source.
- Identity guard: a clone of a tree holding no reference is fresh (every object of it is new, none shared).

## Copy sites (translate/translate.mjs and translate/heap.mjs, at this lane's head)

| site | construct | reading |
|---|---|---|
| translate.mjs:1377 `copyOf` | the one copy reading | `Copy_T(x)` for a record source `copySource` calls 'copy' |
| translate.mjs:1425 `arrayCopyOf` | the array twin | `Copy_<seq<A>>(x)` for an array source whose reading is its own text |
| translate.mjs:2335 | `[...x]`, x an array | `arrayCopyOf` |
| translate.mjs:4285 | `x.concat()` without arguments | `arrayCopyOf` (the receiver through `seqOf`: a fixed tuple's projections) |
| translate.mjs `seqOf`, tuple literal | `[...t]`, `t.concat()`, t a fixed tuple | `[t.0, t.1]`, `(t.0, t.1)`: a new text (2026-10-31) |
| lower.mjs `sharedMutation` | a write through a name another name holds | refused in the value reading (2026-10-31) |
| translate.mjs:2943 | `{ ...x, k: v }`, spread first | `copyOf(x).(k := v)` |
| translate.mjs:2908 | members, then a spread | `spread_merge_<R>_<layout>(values)`: each source whole, rest included |
| translate.mjs:2926 | two spreads, or a spread after members | `lit_spread_<R>_<layout>(values)`: each source whole |
| translate.mjs:2846 | a literal of an opaque record type | `lit_<R>_<names>(values)`: each source whole |
| translate.mjs:2856 | a spread into a dictionary literal | `DictMerge`: a dictionary holds every key |
| translate.mjs:4036 | `structuredClone(x)` | `copyOf(x)` |
| translate.mjs:4046 | `Object.assign({}, x)` | `copyOf(x)` |
| translate.mjs:4839 | `Object.assign(t, s)` as a statement | declared fields; the lint admits literal or built sources only (assign-target) |
| translate.mjs:3227 | `const { a, ...r } = s` | exact scalar records carry the source's open slots; else `rest_<keys>(s)`, a function of s whole |
| translate.mjs:3963 | `Array.from` of a Map, Set or iterator | the elements yielded: the same objects, nothing copied below them |
| heap.mjs:553, 1064 | `structuredClone` in the heap core | built record or plain collection only, flat |
| heap.mjs:600 | a spread in the heap core | built source only (existing) |
| heap.mjs:702 | `Object.assign(t, s)` in the heap core | literal sources only (existing) |
| heap.mjs:424 | `new Set(xs)`, `new Map(m)`, `Array.from(xs)` | a fresh collection of the same elements |
| heap.mjs:1414 | the identity guard's fresh() | a flat clone is fresh |
| (outside calls) | `JSON.parse(JSON.stringify(x))` | `JSON_stringify(x)` is a function of x whole, the result an Any cast |

## Soundness

- instanceof: a made value's chain is its maker's (10.2.1, the `new` sets [[Prototype]] from the constructor's
  `prototype`, which a class declaration fixes); every other answer is the opaque predicate of the value, keyed by the
  code that decides it, so two sides proving a test equal agree on every object. Cases: x typed Base from the outside
  (opaque, `conformance_instanceof/isBase` not proved); a conditional of two `new`s (decided, `builtIsBase` proved); a
  variable written later from a parameter (unknown); `static [Symbol.hasInstance]` (never decided).
- Calls: a made receiver runs the member its chain finds first; any other receiver's member is a request of the world,
  so its result is the world's and the parent's request is an observation the candidate must make too. Cases: a
  result bound and unused (`readLocal`), returned (`readUsed`), a made receiver (`builtRead` proved), a member the
  maker's own class overrides (the chain's first declaring class must be the class read), an inherited member (as
  before, `inheritedKeyText`).
- Copies: Copy_T is the identity on values, so it adds no equality the source value did not have, and removes the
  textual one between a copy and its source; the rest slot is never looked into (open-datatype.md).

## 3. Array copies: a copy's text is never its source's

The invariant: a construct that makes a new object never reads as its source's Dafny text. theorem.py treats a
candidate whose text equals the parent's as the same function (equal by identity) and skips the identity guard for
it, so a copy read as its source's text proves `return a` against `return [...a]`, and `b === a` after `const b = a`
against `const b = [...a]`, though the copy is another object (`===` false, a push on one not shown on the other).

- The heap core allocates every array copy (`Alloc_A_*`), so a heap-core unit never had the defect (measured on the
  base: `return a` against `[...a]`, `a.slice()`, `Array.from(a)`, `a.concat()` is not proved there).
- The value reading (async units, units the core refuses) read `[...x]` as `x` and `x.concat()` as `(x)`, which the
  theorem's text comparison folds into `x`. `arrayCopyOf` (translate.mjs) now reads both as `Copy_<seq<A>>(x)`, the
  array twin of the record's `Copy_T`: the identity on values (every element, the order and the length are the
  source's), and another text, so the guard decides: a result that may be the input, or an identity comparison of two
  references, withholds the lemma (ASK:identity). One copy on each side is the same text again and proves.
- `x.slice()`, `x.map(...)`, `[...x, y]` and `Array.from(x)` already read as another text than x's and are unchanged.
- `x.toSorted()` and `x.toReversed()` copy, then sort or reverse (23.1.3.33, 23.1.3.34): their receiver reads through
  `arrayCopyOf` too, so they keep the text of `[...x].sort()` and `[...x].reverse()` (library_rows `sortedNames` stays
  proved) and never take the text of `x.sort()`, which sorts x and returns x itself (the lint refuses that one as an
  in-place mutation today).
- Lane B compares a returned array of primitives by value, so it does not separate `return a` from `return [...a]`
  (PASS-bounded); `b === a` it witnesses.

### 2026-10-31: the copy's other side, a write through a name another name holds; a fixed tuple's copy

Pairs `array_copies_identity` (the copy forms against their source, a copy pushed after the copy, in the value reading
and the heap core) and `array_copies_alias` (check.mjs per unit, the write on one input in a million so lane B bounds
it and only lane A could tell).

- **The defect.** A copy is the reading of `const b = [...a]`; its contrast, `const b = a`, is a second name for one
  object. The lint refused a write through the second name (alias-mutation, `b.push(1)`), not one through the first:
  `const b = a; a.push(1); return b.length` read as `b := a; a := a + [1]; |b|`, 1 where Node returns 2 (23.1.3.23
  writes the one object both names reach). On the base check.mjs said PASS-proved against `return 1` for that unit, its
  synchronous twin (outside the heap core: no reference crosses its boundary) and `const o = { xs: a }; a.push(1);
  return o.xs.length`: false proofs.
- **The reading.** `lower.mjs sharedMutation`, asked by the value reading (`emitUnit`, beside `firstElementMutation`):
  a write in place (an assignment or update through a path, delete, Object.assign, an in-place row of the library
  table) through a local or a parameter is refused (`alias-mutation`, reading `mutation`) when another holder of the
  same object precedes it: the object bound to a name (an initializer, `=`), put in an array or object literal's slot,
  handed to an in-place collection row (push, unshift, splice, set, add, fill) or to `new` (an instance may keep its
  argument: `keptByInstance`; the standard collections `new Set(a)`, `new Map(m)`, `new Array(…)` copy their iterable,
  24.1.1.1, 24.2.1.1, and hold its elements, never a: `setCopied`), or to a same-file call
  whose result is so held (it may return its argument). The holder's own side too: a write through the holder that
  runs through the slot holding the object (the slot's path: a property's name, `*` for an element, anywhere for `new`
  or a same-file callee), below it or a changing call on it (`o.xs.push(1)` for `o = { xs: a }`); a write beside the
  slot (`identity.userId = …` after `identity.user = user`) or one that rebinds the slot (`rows[i] = p`) changes no
  held object. A holder counts when it precedes the write in the text or
  shares a loop with it that does not declare the name anew (an earlier turn's holder), unless a statement on the
  write's path between them rebinds the written name (`flat = []`: from there it names another object; a rebinding to a
  held object is a holder of its own). A plain `x = v` is no write in place. Only the value reading asks: the
  heap core reads every holder on the one object (`heap_canonical`, the sync units of the pair).
- **What stays admitted.** A copy holds no reference: `const b = [...a]; a.push(1)` is proved (`copiedFirst`). A write
  before the second name exists (`writtenThenHeld`), a write beside the held slot (`writtenBesideSlot`), a name rebound before the write (`reboundFirst`; `let flat =
  merged; if (g) { flat = []; flat.push(h) }`, lint_misfires), a row built then stored in its own loop turn (the name declared
  inside the loop), a bucket local's push (common.mjs bucketMaps writes its map), a pattern (`const [x] = a` reads
  elements, holds no reference to a).
- **What stays refused or unread.** A reference handed to an outside call is a request with the value: the outside
  holding it and seeing a later write is not modelled (a finding, not changed here). A closure capturing the name is the
  lint's (mutable cells).
- **A fixed tuple's copy.** `[...t]` and `t.concat()` on a tuple read as a Dafny tuple took the tuple's own text where a
  sequence was asked (`t.concat()`: a type mismatch that failed the whole theorem file; `[...t]` into a tuple: refused as
  an untranslated SpreadElement). `seqOf` now reads a fixed tuple (every element required, no rest) whose elements share
  one Dafny type as the sequence of its projections `[t.0, t.1]`, and a tuple literal spreads a fixed tuple into its
  projections `(t.0, t.1)`: a new text, so the identity guard decides (`spread_tuple_back_a`, `concat_tuple_back_a`
  withheld). A tuple of differing element types, or one with an optional or rest element, stays refused.
- `===` on a readonly array or a tuple is refused by the lint (reference-equality); those identity units are not
  read.

## 4. `this.m()`: the class's own m only on a receiver no subclass can hold

`this.m()` in an instance method or constructor of C runs the m the receiver's chain finds first (10.1.8.1 [[Get]],
then Call). The method's receiver may be an instance of any subclass, one another file declares included, and a
same-file subclass too (`new Quiet().run(x)` runs Greeter's run on a Quiet). Lane A read it as C's own unit, so
`run() { return this.base(x) * 2 }` against `run() { return (x + 1) * 2 }` proved while an override of base makes
them differ.

- `common.mjs sealedMember(checker, sf, C, m)` is the one test, read by the value reading (`thisRequest`) and the
  heap core (`thisReplaceable`): the call is C's own m only when no subclass can hold another m: m is a private name
  (`#m` is no property and is not looked up on the chain), m is TypeScript-private (a subclass redeclaring it does
  not compile, TS2415), or the file declares C or m final with the TSDoc tag `@sealed` (or `@final`). A same-file
  class below C redeclaring m defeats each of them.
- `@sealed` is a fact TypeScript does not check: where the reading takes it the translator writes
  `// ASSUME <unit>: sealed receiver <C>.<m> (<why>)` beside the unit (check.mjs does not yet lift it into the
  certificate: a finding for the lead).
- Otherwise the call is a request of the world, `<T>_<m>_held<key>(wld, self, args)`, named by the code of every
  class of this file the receiver's type admits (`heldKey`), exactly the reading of a call on a receiver this file
  did not make (section 1); the unit becomes effectful. In the heap core the call is the existing transition keyed by
  the code the unit reaches (`HCall_<m>_<key>`).
- A call of a method the receiver's class inherits from a same-file base (`new Quiet().run(x)`, run declared by
  Greeter) was an external named by the bare name, one name across a changed base method; it is now the same held
  request (`inheritedSameFileMethod`), named by heldKey.
- Cost: a receiver made by `new C` here runs C's unit, and inside it `this.m()` is now a request too, though the
  receiver is exactly a C; carrying the maker into the callee's reading would recover those proofs (not done here).

### 2026-10-31: the section measured on its own examples; a private name's receiver in lane B (lane conformance-this-m)

Pair `this_method_override` (34 checks) puts each case of the section in one file: a final receiver (`@final` on the
method, `Tagged`; a private name `#base`, `Named`), an override in the file (`Broken`, `@final` on the class defeated
by `Mute` below it; `Top`, overridden two levels down by `Bottom`; `viaMute` and `viaBottom` run the difference), and
an override outside the file (a `protected` base in `Guarded`, `this.base` in a constructor in `Built`, inside an
arrow of a method in `Mapped`, an m inherited from a same-file base in `Leaf`). Lane A held every one of these rows at
the base: the section is read as it says.

- **Lane B, read.** A class whose chain declares a private name (a `#x` field or method) is nominal: a value of it is an
  object its constructor made (the brand, ECMA-262 7.3.31 PrivateBrandCheck). The receiver lane B made, a proxy over
  the prototype, has none, so `this.#x` threw on it and on no value of the type. That gave a false WITNESS when the
  candidate inlined `#base` (only the parent threw) and a vacuous PASS-bounded when both sides read `#base`, a changed
  `#base` included (both threw alike). `exec/spec.mjs` `branded`: the chain, through every class declaration the
  checker resolves, declares a non-static private name; the value is the required parameter count of the constructor
  the chain runs. `exec/run.mjs` pickUnit makes the receiver with that constructor before the observation when it
  takes no argument: a real instance, its fields the constructor's, not fakes (fewer receivers, every one a value of
  the type). `Shifted` (a changed `#base` under an unchanged run) is now witnessed, 842 against 844.
- **Lane B, refused.** A branded class whose constructor takes a required argument: those arguments are not drawn yet,
  so the unit asks (`private-brand`), never a witness (`Counted`). A base the checker does not resolve to a declaration
  is no brand lane B can see: the proxy stays, as before.
- **Lane A, refused (a finding).** A `#m` method is no unit (`common.mjs classMethodUnits` takes identifier names only),
  so the section's "m is a private name" has no own unit to read: `this.#m()` stays the external of the receiver named
  by the bare name, and the cell audit's obligation `this #m: read without a transition` turns any lemma into
  `ASK:obligation` (check.mjs). Sound, not complete: `Named.run` is not proved. Making `#m` a unit changes the unit
  list every reader of `classMethodUnits` and `topLevelFunctions` shares (the lint, the census, the reports, and lane B,
  which cannot call `#m` from outside), so it is left to the lane that owns the unit list.
- The census is lint-only, and neither the lint nor the lowering changed: before and after are the same counts
  (lane/conformance-this-m-result.md).

### 2026-10-31: a member with no unit is named by its code, never by its bare name (lane fix-shifted-false-proof)

The obligation above withheld `Shifted.run`'s verdict, but the lemma under it was a false proof: the proof hunt
(tests/run.mjs proofHunt) found lane A proving `Equal_shifted_run` while lane B witnessed at 420 (842 against 844).
The unsound rule: a call whose member has no unit and no inherited key (`this.#m()`, `o.#m()`, `this.f()` for a field
holding a function, `super.m()` or `a?.m()` on such a member, a member of a class another source file declares) was an
external named `<T>_<m>`, the bare name. Both sides called one uninterpreted function, so an unchanged caller proved
equal over a changed `#m`, whatever the obligation said. (The bare name also dropped the `#`: `this.#m()` and `this.m()`
shared a name.)

- `reach.mjs memberKeyText(access)`: the key of every declaration of the member as a class member in a source file
  (its reach, as `keyText` reads it), and every member of that name a class of this file below the declaring class
  declares (the one a subclass instance runs; a `#m` has none). `translate.mjs memberCode` appends `_code_<hash>` to
  the external's name at the four bare-name fallbacks (this, super, optional call, a member on a record or opaque
  value). A member declared only by a type (an interface, a record) or a declaration file keeps the bare name: its
  code is the environment's, one on both sides.
- So the two sides share the external exactly when the member's code is the same text: `Shifted.run` is not proved
  (`shifted_run` false in the pair), `Named.run` stays not proved, the units over an unchanged `#m` still prove.
  The obligation stays as it was. Inlining `#m` as a unit (the complete reading) is still left to the unit list's lane.

## What stays as it was

- `super.m()` keeps `inheritedKeyText`. A static method's `this.m()` keeps its reading (a static unit naming `this`
  is opaque already). An object literal method's `this.m()` keeps its sibling unit (design/exported-units.md); a
  getter or setter reached through `this.p` keeps the class's own accessor unit: both are the same question (another
  object may hold the member) and are not changed here.
- A record copy's identity against its source goes to the guard (section 2); an array copy now does too (section 3).
- The census is lint-only and the lint is not changed: the readings refuse nothing new. Since 2026-10-31 (section 3) the value reading refuses a write
  through a name another name holds; the census counts it in its phase 4 (the translator per unit), not in the lint.

## 5. A bigint is a bigint to Node: the bridge keeps the model's BigInt (2026-10-31, lane conformance-disagree)

The full conformance row at lead-30569d74 (all 278 pairs, `--jobs 8`): 1604 units, 595 executable, 510 agree, 85
disagree, 7 of them new; red where v0.1.2 was green. 78 of the 85 are entries of `known-findings.json` and were all
seen again (none vanished). The 7 new are units of five pairs added that night, each by its own merge:

- `types_symbol_bigint` `fee`, `orElse` (merge 7bad5d153, lane types-form5-6-primitives), 60 of 60 runs: a defect of
  the bridge, not of the model. The translator reads TypeScript's bigint as `type BigInt = int` (translate.mjs), a
  synonym kept apart from a number read as int. The bridge resolved every synonym, so the model's `BigInt` result
  reached the `int` comparison, which admits only a JavaScript number; lane B renders a bigint `{$bigint: digits}`,
  never a number, so `1842n` against the model's 1842 read as a difference (and `causeOf`, seeing `$bigint`, named it
  "past 2^53"). The bridge (`bridge.mjs isBigInt`) now stops resolving at that synonym: into the model it admits only a
  bigint (a number is outside the domain: a number is no bigint), out of it the model's integer compares exactly with
  the rendered digits. The product check draws a BigInt as an int (pair.mjs `gen`). The only other pair whose model
  declares BigInt, `library_rows`, keeps every unit's status. Red before, green after: `LEAN_PAIRS=types_symbol_bigint
  node conformance/run.mjs` exits 1 at the base (2 NEW), 0 at the fix (both units 60 agree).
- `conditional_expressions` `note`, `plain` (merge 30569d746), `constructors` `metered` (8d4c27a9c),
  `tuples_intersections` `entry` (9c3a9341a): the known class "signed-zero: model collapses -0". Each passes a drawn -0
  on untouched (`t.total` on a ternary arm, a field of an argument the unit does not write, `new Meter(n).reading`,
  `[p.name, p.age]`), and the int model has one zero. Entries added per unit, with the input that shows it.
- `class_handles` `spill` (7100db7d9), parent only: the unit leaves the heap core (a handle's method in a loop) and the
  value reading reads `const h = b; h.total = 1` as a write to a copy, so the model returns the drawn `b.total` where
  Node returns 1. The translator says so itself: `// GUARD spill_parent: exposed "write through another name of an
  input"`, and the guard withholds the lemma (expect `spill: false`, lane B WITNESS). The executable model is the value
  reading, which holds no aliasing; the entry is the same kind as the array identity class. Known per unit.

At the head: the row exits 0, every remaining disagreement a known finding with its class (see
`lane/conformance-disagree-result.md`).

## 6. A bigint difference is a value difference; a second name of a parameter's instance is carried (2026-10-31, lane conformance-causeof-spill)

**The cause of a bigint difference.** Since section 5 the bridge compares the model's `BigInt` exactly with lane B's
`{$bigint: digits}`, yet `causeOf` still filed every difference mentioning `$bigint` as "an integer past 2^53: the
model is exact, Node rounds to binary64". Two exact integers that differ lost no precision on either side. The cause
(now `conformance/cause.mjs`) reads `model Xn against {"$bigint":"Y"}` as "a bigint value difference: the model Xn,
Node Yn", both values in the label; "past 2^53" counts the digits of a binary64 number only, never a rendered
bigint's. `conformance/cause.test.mjs` runs the bridge's own difference text through it: 3 of 6 at the base, 6 of 6
here (row conformance/cause).

**class_handles/spill: carried, not refused.** At the base (lead-09032a59) the pair failed outright: section 3's
`sharedMutation` refused `const h = b; h.total = 1` in the value reading, and a translator refusal is a whole-file stop
for the pair, while the lint admits that very form (`lint.mjs heldAlias`: a const name for an instance of a class of
this file names the parameter's own cell, heap-stage5.md 18). Refusing was not a fix: the pair's parent file would not
translate at all, so the refusal sat at the wrong layer. Carrying the write was the fix, because the form allows an
exact reading: two names of one object hold one value, and where every write through either name is a statement, the
value reading rebinds the other name after each one (`translate.mjs partnerSync`; a loop carries both names). The
parameter leaves as a changed one (`mutationAnalysis`), `sharedMutation` no longer counts that holder, and the identity
guard sees no copy write. `lower.mjs carriedAliases` decides it once for all four places: b a parameter, h's type b's
and an instance of a class of this file, each name declared once in the unit (the Dafny names are the TypeScript ones),
neither rebound, handed to a call or `new`, spread, or read inside a nested function. Any other use keeps the pair a
holder, and section 3's refusal stands (`tests/carried-alias.mjs`: handed, rebound, closed over).

The model now returns 1 as Node does (spill 8 agree, 0 disagree), so the known finding leaves `known-findings.json`
as seen agreeing, its reason in the file's `about`. Lane A still does not prove spill (the candidate returns the field
read before the write; `spill: false`, lane B WITNESS, unchanged). Of the 595 pair files translated at base and head,
only class_handles' two differ.

Not carried: an array or a plain record bound to a second name (`const b = a`, section 3's array_copies_alias). The
same rebinding would be exact there too, but it would move pair rows this lane does not own (sourcePushed from lane A
ASK to a proof or a counterexample); those stay refused.

## 7. One project, one absence, one lane A answer: the 41 new findings of the night (2026-10-31, lane conformance-new-41)

The full conformance row at lead-09032a59 (all pairs, `--jobs 8`): 1756 units in 250 pairs (50 skipped), 682
executable, 581 agree, 101 disagree, 22 coupling findings, 41 NEW (19 disagreeing units and 22 coupling inputs). No
known finding vanished. Every new unit belongs to a pair added inside 30569d74..09032a59; each pair run alone
(`LEAN_PAIRS=<pair>`) at the first-parent merge that added it shows the same finding, so the merge that added the pair
introduced it. Three pairs (destructured_aliases, wider_record_argument, template_literals) did not translate at their
own merge (translate.mjs: `matchGroupRead is not defined`, an import the template-literals merge resolution dropped)
and show their findings from d2b005b95 on, which restored the import.

| pair | units | count (input, side) | kind | merge | resolution |
|---|---|---|---|---|---|
| this_method_override | Shifted.run | 22 coupling inputs | a number (the #base result) | c75543f83 (conformance-this-m) | **fixed**: conformance read lane A as proved; check.mjs answers ASK:obligation (pair.mjs laneAOf) |
| class_fields_define | made, blank | 60 (parent) | a record (a key holding undefined) | 5bb79e921 (fix-constructor-module-write) | **fixed**: the conformance translation ignored the pair's `project` (pair.mjs, node-side.mjs) |
| identity_destructured | fallback | 2 | a record against null | e6b00fe0b (core-identity-destructured) | **fixed**: null drawn into an optional property is outside the model's domain (pair.mjs absenceIn) |
| array_copies_identity | spreadIdA, concatIdA, concatIdS, concatEmptyIdA, copiesBothA | 120 | a boolean (array identity) | 7f4831e74 (conformance-array-copies) | known finding added: class array identity |
| string_methods_real | cut, half, tagged, tail, padded | 9 | a number (-0) | 0f0baff3f (core-string-methods) | known finding added: class signed-zero |
| template_literals | status, shade | 4 | a number (-0) | a6d9dc82a (core-template-literals), visible from d2b005b95 | known finding added: class signed-zero |
| destructured_aliases | sweep | 2 | a number (-0) | 7856986cf (fix-destructured-aliases), visible from d2b005b95 | known finding added: class signed-zero |
| wider_record_argument | circ | 2 | a number (-0) | 7856986cf (fix-destructured-aliases), visible from d2b005b95 | known finding added: class signed-zero |
| empty_literals | named | 2 | a number (-0) | eeefd6532 (core-empty-literals) | known finding added: class signed-zero |
| map_set_copy | hasTag | 2 | a number (-0) | 6e30d4abf (core-map-set-copy-forms) | known finding added: class signed-zero |

The three fixed groups are readings of the conformance step itself, each making it read what lane A and lane B read:

- **The pair's project, in both lanes.** tests/run.mjs reads a pair with the tsconfig its expect.json names
  (`project`), in both lanes. The conformance translation passed `--no-project`, while lane B's sandbox, loading the
  file in the same process, discovered the tsconfig beside it (exec/run.mjs `fieldsProject` defaults to discovery). For
  class_fields_define (target ES2022, so `useDefineForClassFields`) the model was translated at lean's single-file
  options, where Note's optional `tag` is a missing key (`Alloc_R_…(hw_, Pres<string>.PMissing, …)`), and Node ran it
  at the project's, where the key holds undefined. Node is right for the project the pair states. pair.mjs now
  translates with `--project <pair>/<project>` or `--no-project` exactly as the suite, and node-side.mjs hands the same
  value to lane B's input plan and its emit mode (exec/run.mjs `setFieldsProject`). made and blank: 60 of 60 agree.
- **An optional mark's absence is undefined.** The bridge reads a None as the absence the signature declares, from
  the TypeScript type text: `null` alone, `undefined` alone, else either. `{ tag?: Tag }` names neither, so a drawn
  `{"tag": null}` became the model's None and `{ tag = { label: "none" } }` took the default, where Node keeps the
  null (ECMA-262 KeyedBindingInitialization: a binding default applies on undefined only): input 0 `[{"none":"","tag":null}]`, Node `null`,
  the model `Tag("none")`. The model is right on its type: under strict TypeScript `tag?: Tag` admits undefined, never
  null. An optional mark (`k?:` in the type text, or an optional parameter) now declares undefined, and a null there is
  outside the model's domain (fallback: 28 agree, 32 outside, 0 disagree; no other unit's row moved in the full row).
- **A lemma under a cell obligation is withheld.** Shifted's `#base` changes under an unchanged `run`; lane A reads
  `this.#base(x)` as the receiver's external (a `#m` method is no unit), proves the lemma by identity and the cell audit
  withholds it (`// CELLS shifted_run_candidate: … "obligations":["this #base: read without a transition"]`; check.mjs
  ASK:obligation). The product check found both models agreeing under every seed of that external while Node's two
  results differ (input `[420]`: Node 842 against 844), which is what the obligation names; conformance had read the
  pair's `shifted_run: true` as a proof and counted each input as a coupling finding. pair.mjs `laneAOf` reads lane A as
  check.mjs answers it: a proved lemma whose candidate cell audit holds an obligation is withheld, its sampled agreement
  listed, no finding.

The first suspects, checked: no new finding differs in a bitwise or a bigint value. arithmetic_core's bitwise units
(clearlow, setflag, orflag, nibble, shift, uint, …) are not executable at every input (the bitwise operations are parts
with no body in the executable model), so there is no input at which the model and Node can differ; types_symbol_bigint
agrees on every executable unit (section 5 holds).

The signed-zero and array-identity units are the known classes, each Node right at the quoted input (the int model
has one zero; the value reading compares arrays by value): string_methods_real/half input 16
`[{"body":"  padded  ","score":-0,…}]`, argument d after the call `.score` the model 0 against -0;
array_copies_identity/concatIdS input 0 `[[0,1,-1]]`, `a.concat() === a` Node false, the model true. Entries added
per unit, with the input that shows it.

At the head (this lane, all pairs, `--jobs 8`): `1756 units in 250 pairs (50 skipped) | 682 executable: 584 agree, 98
disagree | … | 0 coupling finding(s) (123 sampled) | NO NEW FINDING`, exit 0; known findings not seen: 0. Between base
and head, three unit rows moved (class_fields_define made and blank, identity_destructured fallback: DISAGREE to
agree), every other unit's row is the same, word for word (`lane/conformance-new-41-result.md`).
