# A primitive-or-record union compared with a literal

The construct: `===` or `!==` between a literal (a string, a number, a negated number, `true`, `false`) and a value
whose type mixes primitive members with record, array or function members: `result === "ok"` where `result` is
`"ok" | { error: E }`, `this.handleParsingErrors === true` on `boolean | string | ((e) => string)`.

## JavaScript meaning

Strict equality (ECMAScript IsStrictlyEqual) never converts. Two values of different types are unequal; two numbers
compare by value (`-0 === 0`, NaN equals nothing); two strings or two booleans compare by value. A record, array or
function is never strictly equal to a primitive, so a literal is equal to the value only when the value sits on the
primitive arm of the literal's own kind and holds the literal's value. `==` is different: a record against a string
calls the record's `valueOf` or `toString`, user code. That is why `==` stays out.

## The reading

- The lint admits `===`/`!==` with a literal side on a mixed union (`lint.mjs`, the `mixed-types` equality site).
- Per member of the union, the comparison is decided statically when it can be: a record, array, function, null or
  undefined member is `false`; a primitive member of another kind is `false`; a literal member of the literal's kind
  is `true` or `false` by value. The rest is compared at run time.
- A sum representation (disjoint runtime alternatives, `string | string[]`) compares its arm exactly:
  `(var u := x; if u.Union_0? then u.item0 == "all" else false)`.
- An opaque representation (`Any`, the reading of every overlapping union) compares through the value's typeof tag
  and its conversion to the literal's type, the same two functions the `typeof` reading and a narrowed read use:

      function mode_parent(x: Any): int
      { if ext_typeof_Any(x) == "string" && ext_Any_as_string_Any(x) == "auto" then 1 else ... }

- An optional value is false when absent. A read that a guard has narrowed to a primitive (`typeof x === "string" &&
  x === "a"` on a mixed `x`) compares the stored value the same way, so the guard and the comparison share one tag.
- A sum value built through a type assertion compares through one uninterpreted predicate of the value and the
  literal (the assertion establishes no runtime tag, as for the other type tests).

## What stays refused

- `==`/`!=` against a literal on a mixed union: `loose-equality` (the coercion table would run a record's valueOf).
  Escape `fixtures/escapes/ts/mixed_vs_literal_loose.ts`.
- Two non-literal operands, one mixed: `mixed-types` (the record arm compares references). Escape `mixed_vs_value.ts`.
- Record against record: `reference-equality`. Escape `mixed_vs_literal_records.ts`.

## Soundness

- The opaque reading never uses Dafny `==` between the value and an injected literal. That would let congruence
  carry `x == lit` into every later uninterpreted function of `x` (`g(x) == g(lit)`), which JavaScript does not give
  for `-0 === 0`. The tag and the conversion are uninterpreted; the real interpretation (typeof, and the identity on
  values of that type) satisfies every fact the proof uses, so a proved equality holds in JavaScript.
- `true` against `"true"`, and `1` against `"1"`, read as different predicates (different tags), never as equal:
  the pair's `flag` and `code` stay unproved, and lane B witnesses both.
- A number arm uses lean's number model (`int`, or `real` in a float file), as every other `===` on numbers does.

## What lane B sees

Lane B runs the JavaScript on typed inputs drawn per union member. On the pair it witnesses both changed literals
(`flag` on the input `true`, `code` on `"1"`) and finds no difference on the six kept units (`exec/run.mjs --n 30`).

## Measured (census, base 67b8201 against this lane)

    NODE_OPTIONS=--max-old-space-size=12288 node <lean>/langs/ts/census.mjs <root> --out <side>-<repo>.json

| root | units | inside before | inside after | share | mixed-types units before / after |
|---|---:|---:|---:|---|---:|
| n8n | 6337 | 3488 | 3543 | 55 to 55.9 | 268 / 38 |
| langchainjs | 4871 | 3269 | 3301 | 67.1 to 67.8 | 60 / 5 |

## Instances (`units.jsonl`, census `mixed-types@vs-literal`)

- langchainjs `libs/langchain-classic/src/agents/executor.ts:624` `_takeNextStep`: the comparison is admitted; the unit
  still has an unresolved import at line 630 (environment), so it does not enter yet.
- n8n `packages/nodes-base/nodes/TheHiveProject/helpers/utils.ts:67` `constructFilter`: no construct finding left; the
  file's unresolved imports (environment) remain.
- nutshell `modules/chat/src/drawing/assemble-turn-drawings-events.ts:264` `applyStatusChanged`: enters (no finding).
- nexus `apps/backend/src/external/sync-sandbox/sync-sandbox-writer.service.ts:95` `SyncSandboxWriter.delete`: enters
  (no finding).
- n8n `packages/@n8n/nodes-langchain/nodes/trigger/ChatTrigger/ChatTrigger.node.ts:323` `ChatTrigger.webhook`: no
  construct finding left; the file's unresolved imports (environment) remain.
