# any-type: every value typed `any` or `unknown`, with a type proposed from its uses

`lint/any-type.mjs`, reported by `lintFile` only when asked (`opts.anyType`, `lint.mjs --any-type`) and by the editor
rule (option `anyType`, on by default). At the declaration of each parameter, local, class field and return typed `any`
or `unknown` in a checked unit, written or inferred (`JSON.parse`, `let x;`, an untyped callback, a library `any`):

- the uses: `exec/usage.mjs`'s tree for a unit parameter and a `this` field (chains through aliases, destructuring,
  callbacks, one level of same-file callees; compared literals; `.length`, indexing, calls, truthiness, arithmetic);
  for a local or a nested parameter, a reader writing the same tree over its references;
- what flows in (same-file callers' arguments, assigned, initial and returned values) and out (a same-file callee's parameter).

A usage node gives `string`/`number`/`boolean` from operators and compared literals (`true` only: `x || d` records
`false`), `T[]` from indexing, iteration or array methods (`.length` alone: `unknown[]`), a record of the fields read
(each `unknown` unless its own uses say more; `?` when tested with `in` or `??`), a function of the called arity,
`| null` from a null compare, `| undefined` from `??`, `=== undefined` or a truthiness test. Labels, decided at the site:
- `conditional`: one type covers every use; precondition "every use of <name> is covered by this type: <evidence>".
  Named caller types are proposed as written (a union for several); a fresh literal at a call (`[]` is `never[]`) or
  an `import("...")` type confirms the uses' shape instead of being copied; `undefined`/`null` arguments add `| undefined`.
- `migration`, conflict listed, no proposal: two kinds of use, a caller's type lacking a use (a string passed where
  the uses map over an array), or a caller and a callee that disagree.
- `migration`, no proposal: the code tests the type at run time (`typeof`, `Array.isArray`, `instanceof`), so the uses
  are narrowed.
- `flag-only`, no proposal: no use fixes a type ("<name> is never read", "no returned value has a type"). Where the
  rule looks beyond a unit (bound names, interface fields, non-unit functions): design/any-advice.md.

`--json` adds `kind`, `name`, `typed`, `how`, `proposal`, `evidence`, `conflicts`, `fix` (the annotation after the name
or over a written type; none on a for-of binding or a parenthesis-free arrow). ESLint shows `lean (any-type): <finding>;
[conditional: ...] annotate <name> as <type>` and offers the fix as a suggestion (`eslint/any-type.test.mjs`).

Not reported: an `any` from the environment, left to `unresolved-module` (an import with no module symbol or a
shorthand `declare module "x";`, an error type, an undeclared type name, a callback whose callee or JSX tag is one, a
value declared from one); `catch (e)`, the first parameter of a `.catch` handler or `.then`'s second handler; `this`.

## How it differs from TypeScript's "infer from usage"

The vendored compiler's code fix (`codefixes/inferFromUsage.ts`) reads the same kinds of uses and callers, then settles
every disagreement silently: a priority list drops `any` and anonymous candidates and the rest becomes a subtype union.
Here a disagreement is the finding (`migration`, listed), a run-time type test blocks a proposal, a callee's parameter
counts, and each proposal carries its evidence as a precondition a reader can check.

## Soundness

A proposed type is a claim about intent, never `proved`. The rule changes no verdict: the translator's gate, `check.mjs`,
the census and the pull-request table call `lintFile` without `anyType`, and the default command line is unchanged.
`check.mjs` at 704d572 and 4f0d081: Counter.bump WITNESS, Counter.label, clampLimit, untouched PASS-proved, block WITNESS, opaque PASS-bounded.

## Measurement

At e944b79, read only, in each project: `node langs/ts/design/any-type-count.mjs <root> --out <counts.json>` (nutshell
2,266 files, Nexus export 12,733; none unreadable, no rule failure; unresolved-module findings 2,978 and 17,270).

| Root | any-type | proposal | typeof-tested | no evidence | conflict |
|---|---|---|---|---|---|
| nutshell: parameter / local / return | 1,010 | 110 / 44 / 12 | 153 / 86 / 0 | 272 / 57 / 275 | 1 / 0 / 0 |
| Nexus: parameter / local / return / field | 6,246 | 1,287 / 590 / 101 / 0 | 795 / 379 / 0 / 0 | 2,098 / 640 / 297 / 22 | 10 / 27 / 0 / 0 |

Most frequent proposals, nutshell: `unknown[]` 20, `string` 16, `number` 9, `{ getAttribute: (a0: unknown) => unknown }` 9,
`{ BrowserWindow: { getAllWindows: () => unknown } }` 6, `{ textContent?: unknown }` 5, `Readonly<Record<string, unknown>>` 3,
`{ scrollTop: unknown }` 3, `Event` 2, `{ label: string }` 2. Nexus: `{ id: unknown }` 188, `unknown[]` 165, `string` 137,
`number` 119, `{ id: string }` 64, `{ type: string }` 24, `{ id: unknown; name: unknown }` 19, `{ name: unknown }` 18,
`{ name: string }` 15, `string | undefined` 14. Before run-time type tests blocked a proposal, nutshell had 19 conflicts,
all values narrowed by `typeof`; after, 1.
