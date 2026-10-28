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

## What stays as it was

- `this.m()` reads the class's own unit for its own receiver; a subclass outside the file that overrides m is not
  seen there. `super.m()` keeps `inheritedKeyText`.
- A copy's identity against its source rested on textual equality before this note (theorem.py treats a candidate
  whose Dafny text is the parent's as the same function); a spread of a record the unit did not build against the
  source itself now goes to the guard, which withholds it. Array copies (`[...xs]`, `xs.slice()`) are not changed here.
- The census is lint-only and the lint is not changed: the readings refuse nothing new.
