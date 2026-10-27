# any-advice: every declaration typed `any` carries a proposal or a flag

The construct: a parameter, a local, a name bound by a pattern, a class field, or a field of an interface or a type
literal, whose own type is `any` or `unknown`, written or inferred (`JSON.parse`, `let x;`, an untyped callback, a
field typed `any` read through a destructuring). JavaScript gives the value no type at all: whatever arrives at run
time is used. lean reads such a value as the opaque `Any` (design/implicit-any-policy.md), so no verdict depends on
this note; it is advice to the author, at the declaration, from the code of the same file.

## The reading (`lint/any-type.mjs`, `lint.mjs --any-type`, the editor rule)

`any-type.md` holds the evidence: the uses of the name (`exec/usage.mjs`'s tree for a unit parameter and a `this`
field; the same tree written by `readsOf` for every other name), the arguments of same-file callers, the parameters
of same-file callees the value is passed to, and the values assigned to it. This note widens where the rule looks and
what each finding is labelled.

- Where: every declaration of the file, not only those inside a checked unit. A local or a parameter of a function
  that is not a unit (an object-literal method, a class property arrow, a default export) is read in its own
  function; a module-level value in the file. A pattern typed any (`const { count, name } = JSON.parse(raw)`) is one
  finding whose proposal is the record of the names it binds (`{ count: number; name: unknown[] }`); an array pattern
  proposes a tuple, one type per position. A bound name typed any while its pattern is typed (`const { schema } =
  props` with `schema: any` in `Props`) is its own finding, with no annotation to offer. A field is read through its
  member name anywhere in the file (`x.data`, `this.#cache`, a destructured `{ data }`), and given values by a record
  literal of its type (`{ data: v }`), a JSX attribute (`<C data={v} />`) and an assignment (`x.data = v`).
- Labels, decided at the site: `conditional` when one type covers every use, the evidence written as the precondition;
  `migration` when the evidence conflicts or the code tests the type at run time (a person decides); `flag-only` when
  no evidence exists (never read, no use fixes a type, a signature without a body). A proposal is a `record`, a
  `primitive` (string, number, boolean or their union, with or without null and undefined) or `other`
  (`--json` field `proposalKind`).
- Owned by another finding, named with its reason only in `opts.anyTypeSkipped` (the count reads it): an `any` from an
  import the project cannot resolve (`environment`, reported as `unresolved-module`), a `catch` binding (`catch`: the
  language admits only `any` or `unknown` there), a rejection reason (`rejection`). `this` is not a declared value. A
  field of an interface or type literal written `unknown` is not reported: it already says "narrow before use", and
  it is the type a proposal itself gives a field no use reads, so an accepted proposal leaves no new finding.

## The editor quick fix (`eslint/index.mjs`)

A conditional proposal with an annotation site (after the name, or over the written type) is offered as an ESLint
suggestion: the editor's quick fix, applied by the author, never by `--fix`, since the precondition is a claim the
author confirms. `migration` and `flag-only` show their label and offer nothing. `node langs/ts/eslint/any-type.test.mjs`
drives the rule on the record and primitive fixtures, applies the suggestion, and lints the annotated copy again.

## Fixtures (`tests/fixtures/advice/`, checked by the suite's advice step and by the ESLint test)

| Fixture | Label | Proposal |
|---|---|---|
| `any_record_conditional.ts` | conditional | `{ kind: string; text: string; children: { id: unknown }[] }` (record) |
| `any_primitive_conditional.ts` | conditional | `number` (primitive: a numeric compare and a caller passing 3) |
| `any_unused_flag_only.ts` | flag-only | none: `options` is never read |
| `any_conflict_migration.ts` | migration | none: the uses need an array, a caller passes a string |

## Soundness

The rule never changes a verdict: the translator's gate, `check.mjs`, the census and the pull-request table call
`lintFile` without `anyType`. A proposal is a claim about intent, never `proved`; the quick fix inserts a type only,
so the emitted JavaScript is the same, and a wrong proposal shows up as a type error the author sees.

## Measurement

At 7a64c1f, `node langs/ts/design/any-type-count.mjs <root> --out <json>`, each file in its project, last line pasted:

| Root | reported | proposals: record / primitive / other | flags: flag-only / migration | owned elsewhere | gaps |
|---|---|---|---|---|---|
| Nexus export (12,733 files) | 7,246 | 2,169: 1,541 / 262 / 366 | 5,077: 3,715 / 1,362 | 41,058 | 0 |
| langchainjs (1,486 files) | 1,951 | 647: 316 / 164 / 167 | 1,304: 997 / 307 | 4,692 | 0 |

Owned elsewhere, Nexus: environment 36,995, catch 3,716, rejection 347 (the bench tree resolves few packages). A gap is a
declaration typed any found by the count's own walk with neither a finding nor an owner. The census is unchanged at
the base and here (Nexus 23,854 of 26,520 inside, langchainjs 3,575 of 4,871): the gate never asks for the rule.

## Instances

- Nexus `_common/providers/adobe/document-generation.service.ts:100`, `const { uploadUri, assetID }` from an any:
  conditional record `{ uploadUri: unknown; assetID: unknown }` (a pattern; before, no finding).
- Nexus `_common/domain/result.ts:106`, `error: unknown` in a signature: flag-only (before, no finding).
- Nexus `_common/folders/generic-folders.service.ts:248`, local `itemId`: conditional primitive `string`.
- Nexus `ai-tasks/executor/providers/schema/to-gemini-schema.ts:23`, `prop`: migration, a caller passes `{} | null`.
- langchainjs `libs/langchain-core/src/tools/types.ts:420`, `tool`: a record reading `tool.constructor.lc_name`
  (before, the rule failed on the file: a `constructor` field merged with `Object`).
- langchainjs `libs/langchain/src/tools/headless.ts:95`, `const { interrupt } = await import("@langchain/langgraph")`
  with the package absent: environment, left to the checkout.
