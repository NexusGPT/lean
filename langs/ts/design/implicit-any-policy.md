# implicit-any-policy: the codes strict mode alone produces for an any or unknown value

lean forces `strict` on every project (`common.mjs`, `loadProgram`). Under it, TypeScript reports values it would
otherwise type `any` without a word: an untyped parameter (TS7006, 7031), a rest parameter (7019), a class member
(7008), a local or a function referenced in its own initializer or return (7022, 7023, 7024), an evolving `let`
(7005, 7034), an index it cannot type (7015, 7053), and a few declaration forms (7010, 7011, 7018). TS18046 is a read of
an `unknown` value; a catch binding is `unknown` only under strict (`useUnknownInCatchVariables`), `any` without it.

## JavaScript meaning and the reading

None of these codes changes what the code does: the emitted JavaScript is the same with or without strict. The value is
whatever arrives at run time. The translator already reads every `any` and `unknown` value as the opaque type `Any`: a
field read is an uninterpreted accessor, a call on it a transition or an uninterpreted function, a comparison an
uninterpreted operator, the same on both sides (subset.md, "What is uninterpreted"). So the lint admits these codes, as
it already admitted TS7006, 7031 and 7053 (`lint.mjs`, `IMPLICIT_ANY`). A catch binding's message read:

    var e: Any := ext_fault_value_World(wld);
    var return0_ := ext_Any_as_string_Any(ext_Any_message_Any(e));

The owner's rule: an implicit any strict alone introduces is an `--any-type` proposal, never a refusal. `any-type`
reports values typed `any` or `unknown` at their declaration with a proposed type; it skips catch bindings by design.

## What stays refused

- TS18046 on a binding the unit wrote as `unknown` (the keyword), with no guard in its function that the checkout cannot
  resolve: without strict TypeScript refuses the read too (TS2339), so it is the unit's own type error and stays
  `ts-strict` (escape `implicit_any_own_unknown`). A field path (`r.value`), a value typed unknown by its source, a
  named type resolving to unknown, or a binding tested by `instanceof C` or `g(x)` where `C` or `g` is typed any (an
  unresolved import) is the environment's and admitted.
- TS2683 and TS7041, a `this` the function does not declare: the receiver is an input the function does not name, and
  the translator refuses it. New rule `implicit-this` (escape `implicit_any_receiver`), advice `conditional`: declare
  `this: T`, a type annotation only, read by the declared-receiver reading.
- The null codes (`policy:ts-null`) stay: the Option and Nullish model needs strict null checks.

## Soundness

A wrong reading would prove two different behaviours equal only if it assumed a type for the value. `Any` assumes
none: `e.message` and `e.name` are different accessors and stay unproved; `e.message` and `e?.message` differ on a
null `e` (the `?.` branch tests `is_null_Any`). A getter with an effect behind an any value is the same gap TS7006
already had. The identity guard withholds a lemma whose result may carry the opaque value (`return e.message`), so
the pair compares the read with a literal. Lane B runs the real
JavaScript (a catch binding holds the thrown value): pair `implicit_any_policy`, failure WITNESS, the rest PASS-bounded.

## Five real instances (units.jsonl, `policy:ts-implicit-any` alone), lint on the file inside its project

| site | code | now |
|---|---|---|
| nexus `google-workspace/infrastructure/adapters/gmail-api-v2.adapter.ts:101` listUnreadMessages | 18046 catch | enters |
| nexus `_common/filters/sentry-capture.ts:162` isStructuredHttpException | 18046, unresolved `instanceof` | enters |
| nexus `_common/folders/generic-folders.service.ts:307` ensureNoCircularReference | 7022 | enters |
| nutshell `apps/desktop/core-host/src/settings.ts:45` open | 18046 field path | enters |
| n8n `packages/cli/src/WorkflowExecuteAdditionalData.ts:933` setExecutionStatus | 2683 | stays out: `implicit-this` |

Also pipedream `components/expensify/common/utils.ts:43` parseArray (7023, 7024, 18046 catch) enters the lint, but
its Dafny does not resolve: a recursion inside an array callback has no fuel in scope, and an untyped parameter
narrowed by `Array.isArray` is passed where a sequence is expected. Both exist without this policy: at the base,
`function flat(input) { if (Array.isArray(input)) return input.map((x) => x); return []; }` and a typed recursion inside
the `map` callback of a function that throws both lint clean and fail `dafny resolve`.
