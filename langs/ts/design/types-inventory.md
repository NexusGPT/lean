# The `types` refusals: an inventory by type form (2026-10-30)

A census counts a unit under `types` when the first thing that stops it is a translator refusal the type reading owns
(readings.mjs, entry `types`: `type nesting too deep`, `type parameter ... is not one of this function's`, `union type
... is not translatable`, and the rarer ones). Until today the census JSON did not record which type form stopped the
unit; its refusal example now carries the finding's message (census.mjs, `refusalRules[].directories[].example.message`;
check tests/census_example_message.mjs). This note groups every such unit of the 40 census copies by the form its
message names. It writes no reading; it names the reading each form would need.

## How the numbers were made

- The census of each copy under `/root/da/census/repos/` with this head (branch `lane/A3-types-inventory`, commit
  9557ce56b, which only adds the message field): `NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs
  <root> --out <root>.json`, four roots at a time, copies used as they are (no install). The census lints each file
  inside its project (lint.mjs is `lintFindings`, the same `lowerFile` record), so its records hold exactly the lint's
  findings with their messages.
- `node langs/ts/design/types-inventory.mjs <census.json>... --out inventory.json` reads the records and counts a unit
  under `types` exactly as the census does (environment-blocked units first, then each unit under its first
  non-environment finding). On every complete root its count equals the census's own `refusalRules` count for
  `types`.
- `type nesting too deep` names no type. For those sites the script opens the file in its project, takes the
  declarations and expressions on the raised line, and walks each one's type along the edges `dtype` descends (union
  members, record fields and string index, tuple and array elements, Set, Map and Promise arguments, a call
  signature's parameters and result; a record expanded once per walk). The first path past depth 8 names the form:
  *recursive* when the same type, or a non-library declaration, recurs on the path; else *finite*. That walk mirrors
  the descent, not every early return of `dtype`, so the nesting split is a description. 18 sites were not located by
  it (row 7).
- nexus did not finish: the runner was stopped by its two-hour limit after 18,512 files (32,226 units; the earlier
  nexus census counted 33,954). Its row is read from the census journal's finished chunks and is marked partial.

## Totals

40 roots (nexus partial), 91,546 units, 30,157 language-refused. `types` stops **1,822 units**: 2.0 percent of all
units and 6.0 percent of the language-refused ones. On the 39 complete roots: 975 of 59,320 units (1.6 percent), 975 of
19,790 language-refused (4.9 percent).

`types` is not the top language rule on any root on this head. In the 2026-10-29 census (tool 0ea7a792) it was top on
blog-studio-lambda (187), driftbench (668), nexus-app-starter (194) and nexus-ui (237); here those roots count 3, 36, 9
and 2. Those units moved between the two runs; this note does not trace which change moved them. The top language
rule is now `type-assertion` on 19 roots and `copied-argument` on 10 (nexus by its partial run).

| Root | Units | Stopped by `types` | Top language rule |
| --- | ---: | ---: | --- |
| n8n | 9,610 | 450 | type-assertion 1,815 |
| nexus (partial) | 32,226 | 847 | copied-argument 2,728 |
| langchainjs | 6,709 | 273 | type-assertion 675 |
| nutshell | 10,511 | 73 | copied-argument 664 |
| pyka | 2,966 | 52 | type-assertion 222 |
| driftbench | 5,479 | 36 | type-assertion 491 |
| nexus-learning | 3,760 | 30 | copied-argument 363 |
| orange-checkout-automation | 321 | 14 | type-assertion 26 |
| agent-nexus | 4,171 | 11 | property-assign 442 |
| nexus-app-starter | 1,499 | 9 | type-assertion 103 |
| snitch | 1,399 | 8 | type-assertion 150 |
| nexus-linkedin-dashboard, pipedream | | 5 each | |
| blog-studio-lambda | 999 | 3 | type-assertion 84 |
| nexus-learning-landing, nexus-ui | | 2 each | |
| apps-ui, nexus-meeting-recorder | | 1 each | |
| the other 21 roots | | 0 | |

## The forms

Every form below is a **reading gap**: none is a construct whose meaning lean cannot state. Each is a type the value
reading already knows how to read in another position, refused here by a limit of the mapper. Files for forms 1 and 3
are summed over where the type is written (a file may count twice).

| # | Form | Units | Files | Roots | Reading gap or design refusal |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | A finite type nested deeper than 8 | 772 | 400 | 15 | reading gap |
| 2 | A type parameter of an enclosing class or function | 335 | 142 | 14 | reading gap |
| 3 | A recursive type through a generic or a callable | 269 | 154 | 3 | reading gap |
| 4 | The polymorphic `this` type of a class | 241 | 107 | 6 | reading gap |
| 5 | A union with a symbol member | 179 | 117 | 10 | reading gap |
| 6 | A union with a bigint member | 8 | 7 | 2 | reading gap |
| 7 | `type nesting too deep`, the site not located by the walk | 18 | 15 | 4 | unknown until located |

Forms a reader might expect and that do not occur: a mapped type, a conditional type, an indexed access, a template
literal type, `object`, `never` and a lone `symbol` are read as Any already (`dtype`, the opaque branch); an intersection
is read as a record; an index signature as a dictionary or a record's open index. None of them stops a unit in these
40 roots. `array-like type ... has no element type`, `reference-key`, `builtin-type`, the open record's slot name and
`untyped-js` stop none either.

### 1. A finite type nested deeper than 8 (772 units)

`dtype` refuses any type whose descent passes depth 8 (translate.mjs `if (depth > 8) fail(n, 'type nesting too
deep')`). Each union arm, record field, array element, promise argument and call parameter adds one. Ordinary
application types pass it: a promise of a response of a list of groups of lines of prices. Where the types are
written: the repository's own 683, packages 89 (axios 18, zod 13, @googleapis/gmail 13, @tanstack/react-query 7,
openai 6, and ten others with 1 to 5 each). By root: n8n 325, nexus 289, pyka 50, langchainjs 28, nutshell 25,
driftbench 15, and nine more.

- pyka `_captures/plan/harness.tsx:57` (`planResultData`): Promise > PlanResultData > MealPlan > PricedList > Array >
  PlanShopGroup > Array > PlanLine > `string | null` > string.
- blog-studio-lambda `src/app/App.tsx:62` (`resolveSkin`): the signature > `AppConfig | null` > AppConfig > theme >
  `Skin | undefined` > Skin > ...
- nexus `apps/backend/src/agent-creation-assistant/infrastructure/services/internet-search.service.ts:56`
  (`InternetSearchService.search`): catch > Promise > `AxiosResponse<any, any>` > ... (axios's declarations).

The reading it needs: the depth bound stands in for a cycle guard, and is not part of any type's meaning. Dafny
datatypes nest without limit. Records already reserve their datatype's name before reading their fields, and a
union's sum falls back to opaque when a member fails. The bound can go once the mapper guards the one thing that can
fail to terminate, a type that recurs on its own descent (form 3). A wrong proof would need the mapper to give one TS
type two Dafny types, or a value a type it does not have. Lifting the bound changes neither: each type is read as it
is at depth 3.

### 2. A type parameter of an enclosing class or function (335 units)

`dtype` accepts a type parameter only when it is one of the unit's own (`currentUnit.generics`). A method of a generic
class (`class ReaderDocument<D> { constructor(d: D) }`), or a callback inside a generic function (`printTable<T>`'s
`rows.map((r) => ...)`), reads `T` from the declaration around it and is refused. By root: langchainjs 151, nexus 120,
n8n 28, nexus-learning 9, nutshell 7, and nine more.

- driftbench `packages/artifacts/src/document.ts:54` (`ReaderDocument.constructor`): `type parameter D`.
- agent-nexus `packages/cli/src/output-table.ts:37` (`printTable/columns.map()#0@1/rows.map()#0`): `type parameter T`.
- langchainjs `environment_tests/test-exports-node-classic/src/index.ts:14` (`test`): `type parameter ContextSchema`.

The reading it needs: the unit takes the type parameters of its enclosing declarations as its own Dafny type
parameters (`unitTParams`). A method of `C<T>` is parametric in `T` exactly as `f<T>` is: every caller fixes `T` once
for the call. It is sound for the reason a generic function's reading is: a proof over an arbitrary `T` holds at each
instance. The theorem generator has to quantify the pair's `T` the same way it does for a generic unit.

### 3. A recursive type through a generic or a callable (269 units)

A type recurs on its own descent where the mapper keeps no name: a generic instantiation (each level a new
`Name_<hash of arguments>`), a callable's parameters, or an inferred anonymous type. Where the recurring type is
written: zod 203 (a recursive `z.lazy` schema's inferred type, such as nexus's `TipTapJSONContent`), the repository's
own 53 (n8n's `JsonValue`/`IDataObject` 52, langchainjs 1), jszip 13 (`JSZip` returns `JSZip`). By root: nexus 216,
n8n 52, langchainjs 1.

- n8n `packages/cli/src/WaitingWebhooks.ts:114` (`WaitingWebhooks.executeWebhook/Promise()#0`): IRunExecutionData >
  ... > `JsonValue` > ... > `JsonValue`.
- nexus `apps/backend/src/agents/prompt/infrastructure/controllers/agent-versions.controller.ts:190`
  (`AgentVersionsController.getVersion`): Promise > ... > `TipTapJSONContent[]` > TipTapJSONContent > ... (inferred
  from a zod schema).
- nexus `apps/backend/src/_common/providers/pptx/pptx-parser.service.ts:158`: JSZip > JSZip > JSZip (a callable
  returning its own type).

The reading it needs: a type met again on its own path is read, at its second occurrence, by the name its first
occurrence reserved (a recursive Dafny datatype) when it is a record or a sum. Otherwise, a callable or an
instantiation that grows at each level, it is read opaque (Any). Both are already in the value reading: records reserve
their name, and opaque types are uninterpreted. A wrong proof would need two different values to read alike at the
opaque position. An opaque value is only passed through uninterpreted functions, the same calls on both sides, so the
proof never looks inside it.

### 4. The polymorphic `this` type of a class (241 units)

A method that returns `this` (a fluent builder), or reads a field whose type mentions `this`, meets the class's
implicit type parameter. The checker names it after the class, and `dtype` refuses it as a foreign type parameter. By
root: nexus 122, langchainjs 55, n8n 34, nutshell 26, driftbench 2, snitch 2.

- driftbench `packages/checks/src/checks/custom.ts:22` (`CheckRegistry.register(...): this`): `type parameter
  CheckRegistry`.
- langchainjs `libs/langchain-classic/src/agents/executor.ts:457` (`AgentExecutor.get_shouldContinueGetter`).
- n8n `packages/@n8n/client-oauth2/src/ClientOAuth2.ts:61` (`ClientOAuth2.constructor`).

The reading it needs: `this` read as its constraint, the class's instance type (the checker's `isThisType` type
parameter, constraint `C`). A subclass instance carries more than `C` names. The open rest of a record datatype holds
that, and a class with methods is already the opaque `Ext_C`. So reading `this` as `C` drops nothing a proof could
use.

### 5. A union with a symbol member (179 units)

`string | number | symbol` (a property key, `keyof` of an open type), `T | unique symbol` (a cancel sentinel of a
prompt library, a passthrough marker), `unique symbol | T | PromiseLike<...>`. `dtype` reads a lone symbol as Any, but
`unionType`'s list of members an opaque union may hold leaves out `ESSymbolLike`, so the union is refused. By root:
nexus 84, langchainjs 38, nexus-learning 19, driftbench 16, nutshell 14, and five more.

- driftbench `packages/adapters/src/anthropic/common.ts:262` (`ToolLabels.label`): `string | number | symbol`.
- langchainjs `internal/test-helpers/src/env.ts:128` (`env.useVariable`): `string | unique symbol`.
- nexus-learning `packages/cli/src/commands/assign.ts:106`: `string | number | symbol`.

The reading it needs: the union read opaque (Any), as a lone symbol is and as a union of records and primitives
already is. It is sound for the reason every opaque union is: reads and constructions are uninterpreted functions
called alike on both sides. A sum with a `symbol` arm (`typeof` separates it at run time) is a later refinement, not a
precondition.

### 6. A union with a bigint member (8 units)

`string | false | 0 | 0n | ClassNameArray` (a class-name helper's argument type, nexus frontend, 5 units) and `number
| bigint | `${number}` | "Infinity" | ...` (Intl's number-format argument, nexus 2 and nutshell 1). `dtype` reads a
lone bigint as `int`, but `unionType`'s opaque-member list leaves out `BigIntLike`. This is the mechanism of form 5,
with another flag.

- nexus `apps/frontend/src/common/components/Avatar/index.tsx:49` (`Avatar`): `string | false | 0 | 0n | ClassNameArray`.
- nexus `apps/frontend/src/modules/Admin/pages/vibe-expense/utils/format.ts:21` (`formatUsd`): `number | bigint | ...`.
- nutshell `modules/shell/src/updates/newer-version-strings.ts:34` (`downloadPercentage`): the same Intl union.

The reading it needs: the same as form 5, the union opaque. One change to `unionType` covers forms 5 and 6.

### 7. Nesting sites the walk did not locate (18 units)

The raised line holds a declaration whose type the walk does not find past depth 8, for example a method header whose
refusal came from a local inside it. n8n 7, nexus 9, pipedream 1, pyka 1: n8n `packages/cli/src/ActiveExecutions.ts:174`
(`getActiveExecutions`), nexus `apps/backend/src/agents/core/inference/inference-agent.class.ts:44`
(`InferenceAgent.constructor`), pipedream `components/twitter/common/addObjIncludes.ts:88` (`getObjIncludes`). They
are presumably forms 1 or 3. That is not shown. If the nesting message named its outermost type, the next census
would say.

## Order for the readings (step 2)

By units, and by how many roots each reading reaches:

1. Forms 1 and 3 together (1,041 units, 15 roots): the depth bound replaced by a guard on the descent path, the
   recurring type read by its reserved name or opaque. One mechanism, `dtype`. Its pair: a unit whose parameter is a
   finite type nested ten deep (form 1 red today) and a unit over a recursive JSON value (form 3).
2. Form 2 (335 units, 14 roots): the enclosing declarations' type parameters as the unit's own.
3. Form 4 (241 units, 6 roots): `this` read as its constraint.
4. Forms 5 and 6 (187 units, 12 roots): `ESSymbolLike` and `BigIntLike` among the members an opaque union may hold.

The figure the plan quotes (7.8 percent) came from an earlier census. On this head `types` is 6.0 percent of the
language-refused units over the 40 roots, and it is the top rule on no root. "The three roots where it is the top rule"
no longer exist, so step 2's census check is best stated per form: the units of each form fall to zero on the roots
that hold them (n8n, nexus, langchainjs above all).
