# Both branches of a conditional are one Dafny type

The construct: a value whose TypeScript type is `any` or `unknown` meeting a branch, a slot or a guard that has
absence. `e.response?.data` with `data: any`; `b ? anyValue : note` with `note?: string`; `x ?? y` with `y?: any`; a
`const s: string | undefined = v` with `v: any`; `function f(x: any = 5)` called with an any argument; `const { a = 5 } =
r` with `a: any`; `typeof x === "number" ? x + 1 : 0` with `x: unknown`. Before this reading Dafny refused most of them
("the two branches of an if-then-else expression must have the same type (got Any and Option<?>)"), and three were read
wrongly (below).

## JavaScript meaning

`any` and `unknown` admit every value, undefined and null included. An optional chain whose receiver is null or
undefined evaluates to undefined (ECMA-262, OptionalChain evaluation). A default parameter or a destructuring default
is taken exactly when the value is undefined (IteratorBindingInitialization and KeyedBindingInitialization of a
SingleNameBinding with an Initializer), whatever its static type. A guard
(`typeof`, `=== null`, `in`) narrows the static type of later reads; the value read is the stored one.

## The reading (translate.mjs)

One rule: every Dafny if-then-else the translator writes has both branches of one type, the Dafny type of the
expression's TypeScript type (the contextual type when one is given, else the checker's type, whose join for a union is
`unionType`). Where Any meets absence the conversion is exact:
- the absent value in Any is `Any_undefined()` (or `Any_null()`), never `None` (`absentInD`: the optional chain, a
  find or a dictionary read of any values);
- an optional field or parameter declared `any` is an `Option<Any>` slot; its read is Any: Some(v) is v, None is
  undefined (`lowerOptionAny`: `ident`, `rawOperand`, `fieldOf`, `destructure`);
- an Any value put in an `Option<T>` or `Nullish<T>` slot is lowered to absence when it is the absence the slot's type
  admits, else Some of the value cast to T (`liftAny`: `coerce`, a record literal's optional field, a defaulted or
  optional parameter's argument, a destructuring default);
- a value stored as Any read where a guard narrowed it is one uninterpreted cast to the narrowed type, an absence the
  narrowed type admits tested first (`narrowAny`: a local, a field of an opaque value read through one accessor to Any);
- an external read at two result types (a field narrowed in one branch only) is two functions, the second named with
  `_to_<type>` (`external`).

Pair unit `missing` (`const s: string | undefined = v; return s === undefined`):

```
var s: Option<string> := var la0_ := v; if ext_is_undefined_Any_Any(la0_) then None else Some(ext_Any_as_string_Any(la0_));
s.None?
```

## Soundness

Three readings at the base proved different behaviours equal; each is now unproved (probes, `laneA` = translate both
sides, `spec/theorem.py`, `dafny verify`):
- `f(x: any = 5)` called as `f(y)`, y any: read `f(Some(y))`, the default never taken. `f(y) === 5` against `y === 5`
  was PASS-proved by `check.mjs`; Node gives true and false on undefined. Now `if is_undefined(y) then None else Some(y)`.
- `const x: string | undefined = y`, y any: read `Some(Any_as_string(y))`; `x === undefined` proved equal to `false`.
- `const { a = 5 } = r` with `a: any`: the default dropped ("a required field never takes the default"); proved equal
  to `r.a === 5`. Now the default is taken when the value is undefined.
Why the new reading cannot prove two behaviours equal: every conversion is exact in the model where Any is a
JavaScript value, `Any_undefined()` is undefined and `is_undefined_Any` is `=== undefined`; None and Some(undefined)
both mean undefined only inside an `Option<Any>` slot, and every read of such a slot goes through `lowerOptionAny`. The
casts (`Any_as_T`) and `is_undefined_Any(Any_undefined())` are uninterpreted, the same on both sides: a proof holds
for every interpretation, the JavaScript one among them. A narrowed type that leaves out an absence (an any value that
is undefined in a `string | null` slot) is the type lie every Any cast already assumes away.

What stays out: nothing new is refused (the lint is unchanged, no escape fixture); a union with no reading stays out.

## Lane B

Lane B runs JavaScript and needs no reading. Its typed inputs exercise the construct: an optional `any` parameter
draws undefined (pair unit `isFive`: WITNESS on y undefined), an optional record field draws null (`payload` at first
used `=== undefined` and lane B witnessed `response: null`; the pair writes the loose `== null`).

## Measurement

Pair `branch_types`: `payload`, `missing`, `bump` refactors proved; `choose`, `isFive` changed (unproved, WITNESS);
`orFive`, `extraOr` untouched (proved). Every existing pair and case file translates to the same Dafny text as at
the base except `member_constraints`, `mixed_vs_literal` and `object_accessor_faults` (a narrowed field of an opaque
value now a cast of the one accessor), whose lemma outcomes are unchanged.
Instances (whole file, `--no-project --tolerant`, the "N resolution/type errors" line of `dafny resolve`, base to after):
- nexus challenge 23929c8c4 `twilio-subaccount-compliance.api.ts:45` describeError: 4 to 1 (the 1 is the class's
  static `.name`, another construct); with its tsconfig, `check.mjs` on getBundleAndAddress now reaches lane A.
- nexus `apps/frontend/src/modules/Admin/pages/twilio-console/components/api-error.ts:36,39`: 8 to 0, enters.
- langchainjs `libs/langchain-core/src/utils/context.ts:82` alignValue: 4 to 0, enters.
- langchainjs `libs/langchain-core/src/prompts/chat.ts:360,376` and MessagesPlaceholder: 8 to 0, enters.
- langchainjs `libs/langchain-core/src/utils/function_calling.ts:41`: 1 to 0, enters.
- langchainjs `libs/langchain-core/src/utils/types/zod.ts:237,257`: 49 to 13; the 13 are reads through a type
  parameter `T`, another construct.
