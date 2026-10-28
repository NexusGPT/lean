# Escape fixture coverage

Every refusal rule the lint can emit has an escape fixture under `fixtures/escapes/ts/`: a file whose first line is
`// expect: <rule>`, which the suite lints (exit 1, the rule named) and translates (refused).

## The command

Run from the repository root. It reads every rule name the lint passes to `v(...)` and lists those no fixture names:

```
python3 results-readme-3/final2/fixture-coverage.py
```

It is a grep, so it is a lower bound on what the lint can emit. The rules that reach the lint through a variable
(`update-expression`, `assignment-expression`, the generator and promise shape rules, the library member rows, the
`EFFECT_GLOBALS` values) each carry a fixture of their own and are not in its list. Advice-only notes (`any-type`,
`inner-html`, `nested-ternary`) are checked by the advice step (`langs/ts/tests/fixtures/advice/`), not here.

## Before and after

| | rules named by the grep but without a fixture |
|---|---|
| before | 22 |
| after | 1 (`unsupported-type`, unreachable) |

Before: async, async-reduce, break-continue, callback-result, destructuring, for-in, for-of-non-array, freeze,
generator, param-form, promise-executor, promise-handler, promise-pending, promise-thenable, string-order, template,
this, toplevel-state, uninitialised, unsupported-operator, unsupported-type, void.

After: the same list without `unsupported-type`. The 21 new files are named after their rule, with `-` written as `_`.

## What each new fixture reaches

| Rule | The smallest source that reaches it |
|---|---|
| async | a same-file async unit called with no await |
| async-reduce | `reduce` with an async callback and a promise accumulator |
| break-continue | a `break` with no enclosing loop or switch |
| callback-result | `filter` with an effectful type-predicate callback |
| destructuring | `catch ({ message })` |
| for-in | `for (k in o)` over an existing variable |
| for-of-non-array | `for-of` over an iterable whose type is named `Promise` |
| freeze | `Object.freeze(o)` |
| generator | a generator function declaration |
| param-form | a rest parameter on a nested function declaration |
| promise-executor | `n > 0 && resolve(n)` inside an executor |
| promise-handler | an executor that calls a same-file function that throws |
| promise-pending | `const p = new Promise(...)` never awaited |
| promise-thenable | an executor that resolves with a `PromiseLike` |
| string-order | `a < b` with `b: string | number` |
| template | a tagged template whose tag is `tags[i]` |
| this | `this` in a free function with no `this` parameter |
| toplevel-state | `let { low, high } = ...` at module level |
| uninitialised | `let [a, b]: number[];` |
| unsupported-operator | `y **= 2` |
| void | `void x` as an operand |

## Rules reached only through source TypeScript rejects, or a quirk of the lint

- `break-continue`: an unlabelled `break` or `continue` is legal only inside a loop or switch, and the lint tracks both,
  so the rule is a second line behind the compiler (TS1105, TS1104). A labelled block returns at the `label` rule
  before its body is read.
- `uninitialised`: a destructuring declaration needs an initializer in TypeScript (TS1182). The for-of form has none and
  does not reach the rule.
- `for-of-non-array`: every iterable TypeScript accepts is an object type, a string type or a type parameter, and the
  lint takes all three. The fixture uses a local class named `Promise`, because the lint tells promises apart by name.
  Iterating a number (TS2488) reaches the rule too.
- `promise-pending`, `promise-handler`, `promise-thenable`: for a `then`, `catch` or `finally` link the exact reading
  rolls its findings back and falls to the opaque promise reading (`readPromise`), so these three rules surface only
  from `new Promise` executors, which have no older reading to fall back to.

## Unreachable

- `unsupported-type` (`checkType`, last line). The branches above it test every `TypeFlags` member the checker gives a
  type: any, unknown, number, bigint, boolean, string, undefined, null, void, never, union, intersection, object,
  type parameter, indexed access, conditional, substitution, template literal, string mapping, index, symbol, unique
  symbol, non-primitive and enum. The flags left over (`Reserved1`, `Reserved2`, `IncludesConstrainedTypeVariable`,
  `IncludesError`) are internal bits that never stand alone on a type. A probe with 18 parameter types (symbol, bigint,
  object, enum, enum member, template literal, Date, RegExp, unique symbol, readonly tuple, Uint8Array, ArrayBuffer,
  WeakMap, Error, Iterable, AsyncIterable, an intersection, a `ReturnType`) stayed inside the subset.
  Left as a safety net; it carries no fixture.

## Can the README claim one fixture per rule?

One per rule the lint can reach: yes, with the exception above. One per family: already true.
