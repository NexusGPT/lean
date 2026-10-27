# Advice labels: every suggested rewrite says what applying it costs

A refusal carries advice (`lint/advice.mjs`): the rewrite lean suggests to a person or a coding agent. They apply it
blind, so each rewrite carries one of three labels.

- `proved`: the rewrite keeps behaviour on every input, and lean's own reading shows it.
- `conditional`: it keeps behaviour when a precondition holds; the entry states it in one sentence a reader can check.
- `migration`: it changes the meaning on some input; a person decides. A rule that suggests no rewrite is a migration.

`--json` gives every finding `label`, `labelDecided` and, when conditional, `precondition`; its `advice` string, the
`--agent` report and the ESLint message start with the label in brackets: `[proved]`,
`[conditional: <precondition>]`, `[migration]`. A rule with no advice entry has the label `migration`, advice null.

## Labels per rule (the static label; three rules decide it at the site)

| Label | Rules |
|---|---|
| proved | `do-while` (the advice adds a `// @decreases` comment; the emitted JavaScript is the same) |
| conditional, decided at the site | `loose-equality` (eqeqeq), `bound-function` (no-useless-call), `arguments` (prefer-rest-params) |
| conditional | `param-assign` (later uses name the local, no `arguments` read), `generic` (types only), `unary-coercion` (never a bigint: `+1n` throws, `Number(1n)` does not), `callback-form` (no `this`, `arguments`, `new.target`, never `new`), `var` (uses follow the declaration in its block, no loop closure captures it), `optional-chain` (a plain-name callee, the test `f != null`) |
| migration | every other entry: `division`, `assign-target`, `freeze`, `hook-order`, `render-impure`, `reference-equality`, `foreach`, `closure-mutation`, `param-mutation`, `alias-mutation`, `opaque-mutation`, `in-place-mutation`, `receiver-mutation`, `property-assign`, `index-assign`, `global-mutation`, `global-read`, `this`, `class`, `dynamic-eval`, `prototype`, `async`, `generator`, `union-type`, `unsupported-syntax`, `unsupported-call`, `unsupported-member`, `dynamic-key`, `for-of-non-array`, `loop-form`, `for-in`, `break-continue`, `switch-fallthrough`, `destructuring`, `uninitialised`, `bare-return`, `mixed-types`, `string-order`, `bitwise`, `update-expression`, `assignment-expression`, `comma`, `function-value`, `nested-function`, `template`, `param-form`, `ts-strict`, `unresolved-module`, `toplevel-state`, `toplevel-effect`, `promise`, `spread`, `inheritance`, `effect`, `non-null` |

## The three site rules (`lint/lint.mjs`, `eqeqeqSite`, `uselessCallSite`, `restParamsSite`)

- eqeqeq, at a `loose-equality` refusal: `proved` when one side is `typeof x` and the other a string literal, both
  sides are literals of one primitive type, or both operands have one static primitive type (number, string or
  boolean; a type parameter through its constraint) with no null, undefined, any or bigint member. Else
  `conditional` with "both sides are of one primitive type, never null or undefined". The lint admits `==` between
  primitives, so the proved case met at a refusal is a constrained type parameter (`<T extends number>(a: T, b: T)`).
- no-useless-call, at a `bound-function` refusal: `proved` when the bound function is a same-file function with no
  `this` token anywhere in it (a `this` parameter included), the receiver is absent, `undefined`, `null` or `this`,
  and the bound value is called at once (`f.bind(null, a)(b)` is `f(a, b)`). Else `migration`. A held bound value
  differs from any rewrite in `.name`, under `new`, and in lean's own equality of function values (code text and
  cells, SEMANTICS.md "Function values"), so it is never `proved`. The lint used to name `f.bind(r, a)(b)` an
  `unsupported-call` (a computed callee); it now names it `bound-function` (lint.mjs, "the bind is the refusal"), and it
  stays refused.
- prefer-rest-params, at an `arguments` refusal: `proved` when every `arguments` in its function (arrows inside
  included, nested functions not) is `arguments.length` or `arguments[<integer literal>]` read as a value, and no
  parameter is reassigned or updated. Else `migration`. The rewrite is `function f(...args: [a: A, b: B])`,
  `const [a, b] = args;`, `args.length`, `args[k]`: a rest array holds every actual argument as `arguments` does.

## Why `proved` is sound

- eqeqeq: `translate.mjs:1899` writes `==` and `===` as one Dafny `==`; the coercion table (`translate.mjs:1902` to
  `1922`, ECMAScript 7.2.14) runs only when the two Dafny types differ, either side is optional, or the type is a sum.
  Two operands of one primitive kind without null or undefined reach neither: both operators emit the same line
  (`translate.mjs:1951`). The pair `tests/pairs/operands_coercion` proves `sameNumber` (`a == b` to `a === b`).
  Excluded on purpose: bigint and symbol (outside the table), branded intersections (`string & {..}`, whose `===` the
  lint refuses as `reference-equality`), unconstrained type parameters.
- no-useless-call: ECMAScript calls a bound function as its target with the bound receiver and arguments first; a
  target with no `this` cannot observe the receiver. `translate.mjs:2789` reads `h.call(o, a)` on a same-file
  function as `h(a)`; a scratch pair `add.call(undefined, 1, n)` against `add(1, n)` proves (3 verified, 0 errors).
- prefer-rest-params: only sloppy-mode `arguments` aliases its parameters; with no parameter written and no slot of
  `arguments` written, `arguments[k]` and `args[k]` are the same value and both lengths count the actual arguments.

## Fixtures

`langs/ts/tests/fixtures/advice/<rule>_<label>.ts`, first line `// expect: <rule> <label>`; `tests/run.mjs` asserts
each finding of that rule in `--json` has that label, the bracket before its advice, a precondition when conditional.
Proved and migration for `arguments` and `bound-function`, proved and conditional for `loose-equality`, and `prototype`.
