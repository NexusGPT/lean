# Null and undefined

JavaScript has two absent values. Strict equality tests one; loose equality against
null or undefined tests both. Coalescing and optional chaining test both. A default
parameter or destructuring default runs only for undefined, including an omitted input.
JSON writes a null record field and omits an undefined field.

## Representation and entry

Use `Nullish<T> = Null | Undef | Some(value: T)` for every checked union containing
both null and undefined, including optional nullable fields. This conservative,
type-directed criterion does not depend on whether a test survives a refactor.
A nullable default has a Nullish input even when its body parameter excludes undefined.
Single-absence unions retain `Option<T>` and its existing Some/value operations:
None denotes the one absent value allowed by that static type. A unit with only these
unions keeps its Option signatures. Opaque values stay opaque, with distinct strict
null/undefined predicates. Singleton absent values use `Absent = Null | Undef`.
Three constructors avoid reinterpreting existing nested Options used for loop returns
and default arguments. Option<Option<T>> would confuse these control channels with
value-level absence. No new refusal replaces an existing opaque reading.
Rebase integration retains async throwing arrows as opaque values and terminal
opaque switches with a default, preserving the measured baseline admission.

Example: `x === null ? 0 : x === undefined ? 1 : x` becomes
`if x.Null? then 0 else if x.Undef? then 1 else x.value`, for `x: Nullish<int>`.
`x == null` becomes `!x.Some?`; `x ?? d` selects the value only on Some.
`x?.field` selects the field on Some and otherwise yields Undef, never Null.
Narrowing retains the declared storage representation and converts its read to the
flow type. The two strict predicates remain different after a preceding guard.

## Boundaries and soundness

The exact projection to an Option is `Some(v) -> Some(v), Null/Undef -> None`.
Use it only when the receiving static type admits the surviving absent kind, or when
a default's Undef branch has already been handled. The inverse maps Some pointwise
and None to the absent kind of the source TypeScript type. Thus a null-only callee
and an undefined-only callee do not invent an absent tag on return to a wider union.
Arbitrary shape casts retain their existing uninterpreted reading.
Default arguments are evaluated once; Undef selects the initializer and Null passes
through. Optional-field deletion supplies Undef. Object destructuring defaults follow the
same rule. This prevents a clear operation from being mistaken for a missing patch.

JSON.stringify retains its may-fault uninterpreted transition, not a refusal. Its input keeps
Null and Undef, and its operation records the static absence schema where Option
alone does not identify which absent value None denotes. This permits the actual
serializer (drop undefined keys, retain null keys) as an interpretation; no equation
asserts that the two outputs coincide. Exact escaping, property order, replacers,
cycles and toJSON execution are outside this refinement of the existing JSON reading.
General loose coercive equality remains refused as `loose-equality`; the escape
fixture uses a nullable value compared loosely with zero. Parenthesized nullish
literals are admitted by both the lint and translator.

Lane B's union generator already draws both values. Nullable optional fields also draw
omission and explicit undefined. The observation renderer distinguishes undefined
from null, and the sandbox runs native JSON and parameter initialization.

## Real instances inspected

Paths below are relative to the read-only census repos under
`/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos`.
- `nexus-learning/apps/web/lib/api/organization.ts:284` updateMember: optional
  nullable patch fields enter Nullish; unrelated callee failure remains.
- `nexus-linkedin-dashboard/lib/read-models/health.ts:933` syncLogLine: null-only
  fields retain Option; coalescing and strict null tests remain exact.
- `nexus-automations/server/changelog-enrichment.ts:72` lookupFeatureNotes:
  undefined-only options retain Option; existing loop-form refusal remains.
- `nexus-linkedin-dashboard/lib/sync/raw.ts:59` recordingApi: defaults in object
  methods remain under the existing unsupported-syntax refusal.
- `langchainjs/libs/langchain-core/src/structured_query/functional.ts:111`
  getComparatorFunction: no nullable input, unchanged opaque mixed values.
- `langchainjs/libs/providers/langchain-cohere/src/chat_models.ts:136`
  convertMessageToCohereMessage: JSON fallback retained; unrelated call refusal remains.
