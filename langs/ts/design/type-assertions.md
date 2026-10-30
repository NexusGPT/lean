# Type assertions: a value whose type nothing checked is read with its real type

The construct: `e as T`, `<T>e`, and the assertion TypeScript makes when a value typed `any` or `unknown` fills a slot
of another type (`const n: number = x` with `x: any`). ECMA-262 has no assertion: the emit drops all three, so the
value keeps its run-time type whatever T says. `"a" as unknown as number` is the string "a", and `+ 0` on it is "a0".

## The reading

`assertionHeld(checker, node)` at the end of `common.mjs` names a HELD value and its real type; the translator's
`typeOf` returns that real type, so every reading downstream is the reading of the real value:

- `e as T` from a source typed `any` or `unknown`, or holding one (`any[]`, `{ a: any }`): Any.
- `e as T` from a source not assignable to T: the source's type when it is one primitive family (a number asserted to
  `1 | 2` stays the number, a `Wide` string union asserted to `Mode` stays `Wide`), else Any (`string | number`).
- a local of a function whose initializer or a later `=` is held, or typed any or unknown while the local is not: its
  real type (Any when the writes disagree). A local or an `as` target typed `T | undefined` is no exception: the
  value is opaque in its definedness and its payload (landed, the structural reading, not the interim refusal).
- an operation, a member read or a method call on a held operand whose real type is not one primitive family: Any.
  An equality, `in` or `instanceof` stays a boolean.

On Any every operation is an uninterpreted application, so `v` and `v + 0` are different terms (anyAs, candidate):

```
var n: Any := x;
ext_Any_as_int_Any(ext_op_plus_Any_Any_Any(n, ext_Any_of_int_int(0)))
```

`as const`, an assertion into `any` or `unknown`, and one to a type the source is assignable to keep their reading.
The checker's error type (an import the checkout cannot resolve) is the environment's and never held.

## Where a held value may go

`typeAssertion(checker, node)`, the same file, used by the lint (rule `type-assertion`, every expression) and by the
translator (`convertToD`, before it converts): a held value, or an any or unknown value in a slot of another type, is
admitted where its reading carries it: an operand, a receiver, a test (`typeof`, `instanceof`, `in`,
`Array.isArray`, a condition, a switch), a local (declared or written by `=`: the translator's `symType` reads its
real type too), the unit's own result, an argument to an outside call (imported, or a lib call taking `e as any` of
a typed value). Refused where the opaque value cannot be carried, each with its structural follow-up:
- a same-file callee's parameter: the callee's lemma ranges over its declared type (follow-up: read the callee once
  more at Any for such a call);
- a field of a literal, an array element (`push`), a callback's result, an index: the datatype or sequence holds the
  declared Dafny type (follow-up: a held field or element typed Any in its datatype);
- a call of a same-file unit whose result is held: the callee's signature returns the asserted type (follow-up: such a
  unit returns Any);
- a compound write (`+=`): it reads the target's declared operator.

## Soundness

A wrong proof needs a value whose run-time type differs from the type its reading gives it and an operation exact on
the read type but not on the real value. The held reading gives every such value its real type, so the operations
on it are its own; a slot that converts it to the asserted type is either the lemma's own result (compared as the same
uninterpreted conversion of two terms, equal only when the terms are) or refused. A slot that admits absence is
read the same way: `s === undefined` is the uninterpreted `is_undefined` test on Any and the payload stays Any, so
`s` and `s + ""` differ (optAny); the base proved them equal. branch_types' `missing` still proves: both sides make the
same test. This reading needs symType and typeOf to agree on the held local (dd9c58d); with it the interim refusal
named in the brief was not needed.

Refused: `type-assertion`, escape `fixtures/escapes/ts/type_assertion.ts` (an `x as number` from unknown passed to a
same-file number parameter). Lane B runs the emitted JavaScript, where the assertion is gone; its inputs draw the
source's declared type, so it witnesses every must-not-prove unit of `pairs/type_assertions`.
## Instances (census nexus tree)

Each is refused at the slot named; the unit reads its held value faithfully up to there:
- `apps/backend/src/_common/authentication/guards/public-api-key.guard.ts:238` `scopes` (a JsonValue asserted to string[]), passed on
- `apps/backend/src/_common/domain/result.ts:99` `error as E` (unknown to a type parameter) in a branch of a stored result
- `apps/backend/src/_common/filters/sentry-sanitize.ts:38` `body as Record<string, unknown>` (object), passed to a same-file function
- `apps/backend/src/_common/folders/generic-folders.service.ts:328` `child.id` (any) in a string field
- `apps/backend/src/_common/formatters/email-html.formatter.ts:161` `rawHtml` (string | Promise asserted to string), passed on

## Measured

`node langs/ts/census.mjs <root>`, inside the subset (base 9d6229a, then dd9c58d):
| tree | before | after | type-assertion the only rule |
|---|---:|---:|---:|
| nexus | 23,850 of 26,520 | 22,411; 22,296 with optional slots held (17fbd38) | 1,263 units at dd9c58d |
| langchainjs | 3,441 of 4,871 | 3,167; 3,160 with optional slots held | |

The invariant: no value is given a Dafny type its run-time value has not been shown to have; a value whose type was
asserted rather than checked is read at the type its source proves, and converted to the asserted type only as the
unit's own result, where both sides apply the same uninterpreted conversion.

## 2026-10-30: a reference whose type an assertion erased is refused where identity is compared

`r as any`, `r as unknown as string`, or a local such an assertion writes, of a record, an array or a function, is
converted by its contents (`ext_Any_as_string_Any(ext_Any_of_Rec_Rec(r))`): two objects with equal fields give one
value. JavaScript compares objects by reference in `===`, `!==`, `==`, `!=`, a switch, `Object.is`, a Map key, a Set
item and `includes`, `indexOf`, `lastIndexOf`. The guards that keep identity out of the value reading
(`reference-equality` in the lint, `reference-key` in the translator) read the asserted type, any or a primitive, and
saw no object, so `m.set(r1 as any, 1); m.set(r2 as any, 1); m.size` was proved equal to 1 where JavaScript gives 2.

The rule (`common.mjs erasedReferenceSlot`, called by the translator's `expr` and the lint's `expr`): such a value in
one of those slots is refused, `reference-key` as a Map key or a Set item, `reference-equality` elsewhere. A
comparison against null, undefined or a literal stays admitted (an object never equals one, and the reading cannot
prove it does). The lint reports `reference-equality` only; `reference-key` stays the translator's, as for an
object-keyed Map (the heap core reads keys by identity). A primitive written `as any` (`String(r) as any`, `n as any`)
is no reference and keeps its reading.

Pair `asany_record_key` (lane A read unit by unit through check.mjs, since the refusal stops the file): `countByKey`,
`setByKey`, `hasOther` were proved equal at b8efb60f and are now ASK `reference-key`, lane B WITNESS against the
constant candidates; `countByString` proved; `countByNumber` not proved, WITNESS.

Open (closed below, same date): `p === p` on a parameter typed any was read as Dafny equality on Any.

## 2026-10-30: === and !== on an any or unknown operand are one uninterpreted test

A value typed any or unknown may be NaN, where `===` is false on equal operands, or a signed zero, where `-0 === 0`
is true on two values. The translator read `===` and `!==` with such an operand as Dafny `==` and `!=` on Any. Dafny
equality is reflexive, so `p === p` was proved equal to `true` (pair `any_equality`, `selfEq`, at 7f13803a).

The rule (`translate.mjs`, the equality branch for an Any operand): the comparison is
`ext_op_strict_eq_Any_Any_Any(l, r)`, negated for `!==`. This is the reading this file already gives every other
operation on Any ("an uninterpreted application"), and `in` (`in_Any`), `Object.is` (an outside call) and a switch
over an any value (an opaque block) were read this way already. Both sides apply the same function to the same terms,
so `p !== q` against `!(p === q)` still proves.

Why not the other choice: a value domain holding NaN and -0 would need Any to carry the double model and lane B to
draw NaN and -0 for any parameters. `numbers-bitwise-nan.md` keeps the finite model on purpose and names a NaN-holding
datatype as future work that every observer would need to migrate to. The uninterpreted test needs neither.

Kept exact: a comparison against a string or boolean literal, whose type settles it (neither NaN nor a zero), and
against null or undefined, which the absence test reads already. A comparison narrowed to number by `typeof` is the
number comparison and its doubles reading, unchanged. `==` with an any operand stays refused `loose-equality` by the
lint. The cost: a proof that needs `===` on Any to be symmetric or reflexive (`p === q` against `q === p`) is lost.

Lane B draws no NaN for an any parameter, so `selfEq` and `switchSelf` (NaN takes the default) are PASS-bounded, not
witnessed. Lane A no longer proves them.

## 2026-10-30: the four refused slots, each read at Any

Each slot below was refused (`type-assertion`) because a held value reached a place whose reading holds the declared
Dafny type. Each now gets the reading the earlier section sketched; `common.mjs` decides (`assertionHeld`,
`typeAssertion`, one test for the lint and the translator) and `translate.mjs` emits.

- **A field of a literal.** A literal one of whose fields holds a held value, or an any or unknown value where the
  field's type names another, is HELD (`heldLiteral`): its real type is its own record type, and each held field is
  read at its real type (`heldField`; an any value is any in the literal's own type already). The translator builds it
  at that type (`objectLit`, `recordType`): a datatype `Held_<hash>` whose name carries the real field types, the held
  field `Any`. The literal then goes where a held value goes; a field read on it is the field's real type (a held field
  Any, the others exact). It reaches a slot of its declared type only where a held value is carried (the unit's own
  result, an argument to an outside call), by `cast_Held_..._T`, the one uninterpreted conversion both sides apply.
  A local it initialises is held in turn.
- **A same-file callee's parameter.** The callee is read once more for the call (`heldCall`, `heldVariantCall`): the
  parameters the call hands a held value are read at Any (`withHeldParams`: `assertionHeld` reads such a parameter as
  Any), the body is emitted under that reading as `<callee>_held_<i..>[_r]`, and the call applies it.
- **A call of a same-file unit whose result is held.** The same reading: the result is held when the body's result is
  held under it (`heldResultType` with the held parameters), at the one held literal type every return gives (its
  unheld fields exact at the call), else at Any; the caller's operations on it are operations on that real value. The
  unit's own lemma keeps its own signature; only the call reads the second text.
- **A compound write.** `t += v` to a local is a write of the operation `t + v` (`writesOf`), held when either operand
  is, so the local's real type is Any and the write is the uninterpreted operator over Any the binary form reads
  (`heldCompound`: `+=`, `-=`, `*=`).

Why it is sound. A wrong proof needs a value whose run-time type differs from the type its reading gives it, and an
operation exact on the read type but not on the value. In each slot the value now keeps its real type: a held field is
Any in its datatype (no field read converts it), a held parameter is Any in the callee's second text, a held result is
Any at the call, a held compound total is Any. Every operation on them is the uninterpreted application on Any, so `v`
and `v + 0` remain different terms; a conversion to the declared type happens only as a unit's own result or into an
outside call, where both sides apply the same uninterpreted function to their own terms (equal only when the terms
are). The record conversion `cast_Held_T` is no exception: two records convert to equal values when they are equal.

Pair `type_assertions`, eight rows. Must prove: `fieldHeld` (proved), `paramHeld`, `resultHeld`, `compoundHeld`
(real-only, as `twice`: the doubles reading does not encode Any; they return a template string, since a number read
from Any may be the input object itself and the identity guard withholds such a result, as for `anyAs`). Must not
prove: `fieldBumped`, `paramKept`, `resultBumped`, `compoundBumped`, each proved under the declared-type reading
(`n + 0 = n` on numbers) and each witnessed by lane B on the emitted JavaScript ("a" + 0 is "a0").

What stays refused, and why:
- an array element (`push`, an array literal), a callback's result, an index, a held spread source, a held literal in a
  destructuring, a field write (`o.f = v`, `o.f += v`): each puts the held value into a sequence, a callback type or
  a declared record whose Dafny type every other value of that type shares; reading it at Any there would change the
  reading of values that were checked (an element type, a datatype of a declared type, the other side's values);
- a literal with a method, an accessor or a computed key: its datatype is not built from its fields alone;
- a callee that is not a plain leaf (a method, an async or generic unit, one with an optional, default, rest or
  destructured parameter, one that calls another same-file unit or itself): its second reading would need the world,
  fuel or further second readings; the translator also refuses, as `type-assertion`, a callee that threads the world,
  mutates a parameter, recurses or is read by the heap core;
- an argument to a call whose callee is a local value rather than an import (`client.x.y(...)` with `client` a local
  made by an imported factory): the rule `importRooted` keeps, unchanged here.

Found on the way (the doubles lane, not changed here): `translate/faithful.mjs` decides a number operation by the
checker's type, not the held reading, so `(x as number) + 1` with `x: any` is rewritten to the commutative
`Math.__lean_add` and lane A reads `1 + (x as number)` as the same term, where JavaScript gives "a1" and "1a". Lane B
witnesses it, so `check.mjs` answers WITNESS; the lane A reading is wrong all the same. The structural fix: the
rewrite's `isNum` reads `assertionHeld(checker, n) ?? checker type`.

A hole closed on the way: a shorthand member `{ n }` was read through the property's symbol, not the local's, so a
held local in a shorthand field was never seen as held and was converted to the field's declared type. `heldOf` now
reads the local (`getShorthandAssignmentValueSymbol`); one census unit that entered through the hole is now refused
(apps-ui `GalleryView`, whose callee returns a literal with a held shorthand field).

Measured (`node langs/ts/census.mjs <root> --out lane/census-<root>-{before,after}.json`, `type-assertion` units in
`refusalRules`; base 6421be639, after the lane's last code commit):
| tree | before | after | entered before | entered after |
|---|---:|---:|---:|---:|
| agent-nexus | 193 | 189 | 1,635 | 1,643 |
| blocks | 17 | 18 | 247 | 247 |
| apps-ui | 169 | 162 | 861 | 860 |

The fall is small because the literal fields (500 of the 600 refused nodes in agent-nexus) mostly sit in a literal
handed to a method of a local made by an imported factory (`client.analytics.exportCsv({ ... })`): the literal is now
held, and the refusal moves up to the call argument, which `importRooted` does not carry. Carrying a held value into
such a call (a callee declared outside the file and not a library reading's) is the next lever. blocks' extra unit
changes only its first refusal (a unit refused before by `callback-units`).
