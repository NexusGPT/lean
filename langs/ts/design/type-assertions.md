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
| nexus | 23,850 of 26,520 | 22,411 | 1,263 units (1,104 a slot, 159 a call of a held-result unit) |
| langchainjs | 3,441 of 4,871 | 3,167 | |

The invariant: no value is given a Dafny type its run-time value has not been shown to have; a value whose type was
asserted rather than checked is read at the type its source proves, and converted to the asserted type only as the
unit's own result, where both sides apply the same uninterpreted conversion.
