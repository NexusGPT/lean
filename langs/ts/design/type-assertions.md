# Type assertions: a narrowing `as` is refused, a widening one passes the value through

The construct: `e as T` and `<T>e`, and the same narrowing without the keyword, a value typed `any` or `unknown` in a
slot of another type (`const n: number = x` with `x: any`). `x as number` on a `string | number`, `x as string` on an
`unknown`, `JSON.parse(s) as { a: number }`, `s as Mode` on a wider string union, `e as Error` on a catch binding.

ECMA-262 has no assertion: TypeScript's emit drops `as T`, `<T>` and the implicit assertion of an any value alike, so
the expression evaluates to the operand's value, unchecked. The value keeps its run-time type whatever T says: `"a" as
unknown as number` is the string "a", and `+ 0` on it is string concatenation ("a0").

## The reading

One predicate, `typeAssertion(checker, node)` at the end of `common.mjs`, used by the lint (rule `type-assertion`, in
its `as` case and at the entry of `expr` for the implicit form) and by the translator (its `as` case, and
`convertToD` where an `Any` value meets a typed slot). It returns the refusal text or null:

- `as const`, an assertion into `any` or `unknown`, and an assertion whose source type is assignable to the target (a
  supertype, a literal into its union, `[] as string[]`) pass the value through, converted as before (identity, a
  constructor of the union, Some): an injection of the real value, so the operations read on it are the value's own.
- A source typed `any` or `unknown`, or holding one in an element, field, type argument or index (`any[]`, `{ a: any }`,
  `Map<string, any>`), asserted to a type that is not itself `any` or `unknown`: refused. `any` is assignable to every
  type, so the assignability test alone would admit `rows as Row[]` with `rows: any[]`.
- A source not assignable to the target (`string | number` to `number`, `string` to `"a" | "b"`): refused.
- Implicit form: an expression typed `any` or `unknown` whose contextual type is none of `any`, `unknown`, a union
  holding one, a type parameter, `void`: refused, reported on the outermost expression.
- The checker's error type (an import the checkout cannot resolve) is the environment's and admitted in both forms.

Before, `asCast` read both sides through one uninterpreted conversion, then `+ 0` on int, and was proved:

```
function as_cast_parent(x: Union_86ycr3): int
{
  ext_cast_Union_86ycr3_int_Union_86ycr3(x)
}
function as_cast_candidate(x: Union_86ycr3): int
{
  (ext_cast_Union_86ycr3_int_Union_86ycr3(x) + 0)
}
```

A widening keeps its reading (`widen` reads `Union_86ycr3_1(x)`, a constructor of the union) and is proved.

## Soundness

A wrong proof needs a value whose run-time type differs from the type the reading gives it, and an operation exact on
the read type that is not one on the real value: `+ 0`, `+ ""`, `- 0`, a comparison, `.length`, a switch the literal
union makes exhaustive (`modeCode`: "c" falls off the end in JavaScript and reads as "b" in Dafny). A narrowing
assertion and an any value in a typed slot are exactly where the two types part, so both are refused. A widening
cannot part them: the source type holds the value, and the reading of the source is the faithful one. The narrowing
within one Dafny type (a string union from `string`) is refused too: the representation agrees, but the reading of the
narrowed type (an exhaustive switch, a record keyed by the union) assumes the narrowed domain.

The error type is the hole left open by design: in its project the same value has its declared type and the rule decides.

Refused: every narrowing assertion and every resolved any or unknown value in a typed slot, `type-assertion`, escape
`fixtures/escapes/ts/type_assertion.ts`; the message names a test that narrows, or a type on the source. Lane B runs the emitted JavaScript, where the assertion is gone; its typed inputs draw the source's declared type (a
string for `string | number`, any value for `unknown` and `any`, an arbitrary string for `JSON.parse`), so it
witnesses every must-not-prove unit of the pair (`pairs/type_assertions`).

## Instances

Census nexus tree at 0ed2760; every one below is refused, none enters:

- `apps/backend/src/_common/authentication/guards/public-api-key.guard.ts:225` `record.scopes as string[]` (JsonValue)
- `apps/backend/src/_common/domain/result.ts:99` `error as E` (unknown to a type parameter)
- `apps/backend/src/_common/formatters/email-html.formatter.ts:160` `marked.parse(markdown) as string` (string | Promise)
- `apps/backend/src/_common/logger/logger.factory.ts:36` `env.PROCESS_TYPE as ProcessType` (string | undefined)
- `apps/backend/src/_common/authentication/guards/composite-auth.guard.ts:207` `request.body as Record<string, unknown> | undefined` (any)
- `apps/backend/src/_common/providers/adobe/document-generation.service.ts:50` `tokenResponse.access_token` in a string slot (implicit)
- `apps/backend/src/_common/folders/generic-folders.service.ts:328` `child.id` in a string slot (implicit)

## Measured

Census (`node langs/ts/census.mjs <root>`), inside the subset:
| tree | base 9d6229a | explicit form alone | 0ed2760 (both forms) |
|---|---:|---:|---:|
| nexus | 23,850 of 26,520 | 22,393 | 21,896 |
| langchainjs | 3,441 of 4,871 | not run | 3,055 |

Units refused by type-assertion alone on nexus: 1,275 by the explicit form, 390 by the implicit form, 90 by both.
