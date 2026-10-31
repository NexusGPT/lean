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
| 4 | The polymorphic `this` type of a class | 241 | 107 | 6 | read 2026-10-31 (below, "Form 4, read") |
| 5 | A union with a symbol member | 179 | 117 | 10 | reading gap |
| 6 | A union with a bigint member | 8 | 7 | 2 | reading gap |
| 7 | `type nesting too deep`, the site not located by the walk | 18 | 15 | 4 | located: form 1 by other routes (below) |

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

Read on 2026-10-30: [Form 2, read](#form-2-read-2026-10-30).

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

#### Form 4, read (2026-10-31)

Lane `types-form4-this` (branch `lane/types-form4-this`) writes the reading above. Its pair is `tests/pairs/types_this`.

**The rule.** A type parameter that is the polymorphic `this` (the checker's `isThisType`) is read as its base
constraint, the class's or interface's instance type, at every place `dtype` meets it: a method's result (`: this`, or
inferred from `return this`), a parameter (`other: this`), a field (`next: this | null`), the value of the `this`
expression itself. A `this` whose constraint the checker does not give, or gives as another type parameter, is read
opaque (Any), never guessed. It is one branch of `dtype` (translate.mjs), before the type-parameter branch, so a `this` never
reaches the form-2 rule and is never one of the unit's Dafny type parameters.
- In a generic class the constraint is `C<T>`. It is read exactly as `C<T>` written by hand is (a class with methods is
  the opaque `Ext_C`; a data class is its datatype, generic in the parameters its fields name, form 2).
- A data class holding `this` (`next: this | null`) is its own datatype with its open rest (`Option<Node>`): a
  subclass instance's extra fields are in that rest.

**The lint, the same reading.** The lint asked for the receiver's type of a method call (`this.where(a).where(b)`: the
second call's receiver is typed `this`) and found a type parameter, not a record, so the call was `unsupported-call`.
It now reads a receiver typed `this` as the instance it is (lint.mjs `asInstance`), so the call is the same method call on
a class instance that it already was when the receiver was typed `C`. A field read on a `this`-typed value already went through the
constraint (the lint's type-parameter member rule). Nothing else in the lint changed.

**Why it is sound.** The section above: every value of type `this` is a value of type `C`, and the readings of `C`
already account for an instance carrying more than `C` names (the opaque `Ext_C`, a record's open rest). What a call
on such a value does is the request the reading of calls already names: a call on an instance of this file's classes is
a request named by the code of every class the receiver's type admits (heldKey, design/conformance-readings.md), and
with `this` read as `C` that is the same set of classes as for `C`.

**What stays refused, and why.**
- Nothing new: no form-4 message remains. The units it stopped now meet whatever comes next in them (below).
- The pair records two readings this lane did not touch. *A call on this file's classes after an edit to one of them.*
  The request is named by the class's code, so an edit inside `Query` or `Named` gives each side its own request, and a
  subclass method calling the chain is not proved after any edit in its class (`named_capped`, the same with `Query`
  written for `this`). *Two receivers read in another order* (`other.parts.length < this.parts.length` for the
  reverse): a different order of reads on two world values, witnessed by lane B and not proved. That is why the pair's
  `longer` reads in the same order.
- A nested callback unit that reads `this` from the method around it (an arrow inside a method) is refused by the lint
  as `` `this` outside a class method ``; on base `types` stopped some of them first (3 in langchainjs). That is a
  callback reading, not form 4.

**The census.** Base is lean `lead-b5c07450` (b5c074508), head this lane's 3e99d51b8, each a `git archive` in
its own folder. Every census: `NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs
/root/da/census/repos/<root> [--include <dir>/] --out <json>`, run from each tree, one at a time. Form 4 is counted as
`types-inventory.mjs` counts it (a unit's first non-environment finding, `type parameter C is not one of this
function's` with `class C` in its file). Where each unit went is its first finding at head, unit by unit (the lane's
`lane/types-form4-this-scripts/form4-moves.mjs`, committed with its result).
- nexus: base over `apps/backend/src/` (13,672 files, 23,328 units; it holds every form-4 unit of nexus on this base;
  the frontend directory the inventory named holds none since form 2 was read). The whole-directory head run was
  killed by the machine's out-of-memory killer, so head is censused in the 51 directories that hold a form-4 unit on
  base (`--include`, one run each, 2,140 files) and compared unit by unit with the base run.

| Root | Units | Form 4 | Stopped by `types` | Entered | Units entered on base and stopped at head |
| --- | ---: | ---: | ---: | ---: | ---: |
| langchainjs | 6,709 | 59 → 0 | 96 → 37 | 2,766 → 2,805 | 0 |
| n8n | 9,610 | 32 → 0 | 37 → 5 | 2,680 → 2,699 | 0 |
| nexus (`apps/backend/src/`; head in 51 directories) | 23,328 | 120 → 0 | the 51 directories: `types` refusals 625 → 505 | the 51 directories: 3,320 → 3,401 | 0 |

Where the form-4 units went (their first finding at head):
- langchainjs (59): 39 entered; `copied-argument` 15, `classes` 3, `read-after-call` 2.
- n8n (32): 19 entered; `read-after-call` 10, `classes` 2, `reference-key` 1.
- nexus (120): 81 entered; `classes` 31, `copied-argument` 5, `read-after-call` 3.

Every `classes` stop among them (36) is a nested callback unit reading the receiver of the method around it, refused as
`` `this` outside a class method `` (above). `census.mjs --diff` on langchainjs and n8n: no reading loses a unit.

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

#### Form 7, located (2026-10-31)

Lane `types-form7-unlocated` (pair `tests/pairs/types_unlocated`). The 18 sites were located by the translator itself,
not by the walk: the pre-A7a translator (merge 55fc7a771, `git archive` into a scratch folder) with one scratch-only
probe that keeps a stack of the types `dtype` is inside and prints it at the depth refusal, run as `LOCATE_NEST=1 node
langs/ts/lint/lint.mjs <file> --json` on each site's file in its project. Nothing of the probe is committed.

**What they are.** Every one is a finite type ten levels deep (form 1); none recurs. In each the type is reached by a
route the walk does not take from the raised line:
- a field read through `this` (nexus `InferenceAgent.toString`, `toJSON`: `this.data`, an `InferenceAgentType` whose
  `productionPromptVersion.promptJson` reaches `JSONContent.marks[].attrs`; n8n `WorkflowRunner.runMainProcess`'s
  `setTimeout` callback, `this.activeExecutions`);
- a `let` with no type and no initializer, typed by its first assignment (n8n `ActiveExecutions.getActiveExecutions`,
  `let data;`): the checker types its declaration `any`, so the walk found nothing there;
- an argument read at its callee's parameter type (n8n `AbstractOAuthController.getDecryptedData`: `undefined` passed
  where the callee takes `IExecuteData | undefined`; `ActiveWebhooks.executeWebhook`'s callback, `workflowData`);
- a callback reading a parameter of the function around it (pyka `Head/SORTS.find()#0`, the census's "raised outside
  this unit");
- a method's result or a type met in its body, raised at the method's header (nexus `getRegulationRequirements`,
  `RenderHtmlMessageTemplateUseCase.execute`, `generateTestParameters`, `AgentInferenceCacheService.setToCache`);
- a record met near the top and again ten levels down (pipedream `getObjIncludes`, nexus `InferenceAgent.constructor`):
  the walk expands a record once per walk, so a record first met on a shallow branch hides its deep path; the
  translator's own memo is per file and order-dependent, and its depth bound was checked before the memo.
Five of the 18 (n8n `setProviderConnected`, `credText`, `nodeText`; nexus `SetChatAssignedUsersUseCase.execute`,
`FillHtmlMessageTemplateUseCase.execute`) did not raise the refusal at all when their file was linted alone: their
depth was reached through a record another unit read first in the census's chunk, the same order dependence.

**At this head.** Lane A7a's descent guard reads all of them: none stops on `types`. The pair holds one unit per route
(the deep type is nine records, then `string | null`, then string): refused at the pre-A7a base, read now.

**What the pair found.** The route through an untyped `let x;` was read at two types. Its declaration is `var x:
Option<T> := None` (T its first assigned type), but `symType`, which every read asks for the name's stored type, gave
the checker's `any`: a field read took the stored Option for an opaque value (`ext_Any_f_Any(x)`), and a read lost its
`.value`. That is a Dafny resolution error, which costs every unit of the file its proof (the lint admitted the
unit). The reading: `symType` returns the held type of an untyped `let` of the unit, `T | undefined` from the same
`firstAssignedType` its declaration uses (`untypedLetHeld`), so the declaration and every read are one decision, as
for a typed `let x: T;` that TypeScript does not fix. A let whose first assignment is `any` stays `Any` at both.

**What stays.** `untypedLetHeld` answers only for a `let` declared in the unit's own body (the body
`firstAssignedType` reads). A callback reading an untyped `let` of the function around it is refused before any
type is read (`definite-assignment`: TypeScript does not check that read follows the assignment). The commuted
test inside a `find` callback (the pair's `captured`) proves the callback, not the function around it, at any depth;
that is a limit of the callback reading, not of the types. The census for this reading: the lane's result
(`lane/types-form7-unlocated-result.md`).

## Forms 1 and 3 read (2026-10-30, lane A7a)

The depth bound is gone: `dtype` keeps the descent path, reads a finite type at any depth, reads a type met again by
the name a record reserved, and reads opaque a type that recurs with no record on its loop (and each type on that
loop) or a generic instance grown from its own. The reading, its soundness and its pair: [types-depth.md](types-depth.md).
One correction to the split above: the n8n site named under form 3 (`WaitingWebhooks.ts:114`) is a finite chain
ten levels deep (IRunExecutionData > ... > ITaskSubRunMetadata > string), not a recursion of `JsonValue`: the walk
descends union members that `dtype` never reaches (`JsonValue` is opaque at its union before any descent). Other
form 3 counts may hold such sites too.

## Order for the readings (step 2)

By units, and by how many roots each reading reaches:

1. Forms 1 and 3 together (1,041 units, 15 roots): the depth bound replaced by a guard on the descent path, the
   recurring type read by its reserved name or opaque. One mechanism, `dtype`. Its pair: a unit whose parameter is a
   finite type nested ten deep (form 1 red today) and a unit over a recursive JSON value (form 3).
2. Form 2 (335 units, 14 roots): the enclosing declarations' type parameters as the unit's own.
3. Form 4 (241 units, 6 roots): `this` read as its constraint. Read 2026-10-31 (section 4, "Form 4, read").
4. Forms 5 and 6 (187 units, 12 roots): `ESSymbolLike` and `BigIntLike` among the members an opaque union may hold.

The figure the plan quotes (7.8 percent) came from an earlier census. On this head `types` is 6.0 percent of the
language-refused units over the 40 roots, and it is the top rule on no root. "The three roots where it is the top rule"
no longer exist, so step 2's census check is best stated per form: the units of each form fall to zero on the roots
that hold them (n8n, nexus, langchainjs above all).

## Form 2, read (2026-10-30)

Lane A7b (branch `lane/A7b-types-enclosing-params`) writes the reading form 2 needs. Its pair is
`tests/pairs/types_enclosing_params`.

**The rule.** A unit's type parameters are those of the declarations around it that the unit reads, outermost first,
followed by its own (common.mjs `unitTypeParameters`).
- The declarations around a unit are every enclosing function, method, arrow and function expression, and the
  enclosing class unless the unit sits in a static member, which cannot name them (`enclosingTypeParameters`). Type
  parameters are lexical, so a callback inside a callback inside `f<T>` sees `T`, and so does a function expression.
  The earlier `lexicalGenerics` saw one level, and only from an arrow.
- A unit reads a parameter when one of these mentions that very declaration: the checker's type of one of its nodes,
  or the type a name's symbol declares. A parameter is matched by its declaration (its file and position), never by its
  name, so a method's own `T` is not its class's `T`. `super` is not walked, as `this` is not: what a unit reads of its
  receiver is the names it reads on it. The second covers a field read through `this`: the checker types `this.kind` of `abstract readonly
  kind: TKind` at TKind's constraint where it is read, while the translator reads the field's declared type through
  its accessor.
- A constructor also reads the instance field initialisers it runs (`items: T[] = []`).
- The walk goes through union and intersection members, a reference's type arguments, an anonymous object's members,
  and a signature's parameters and result.

Each such parameter becomes one Dafny type parameter `T(==)` of the unit's function, exactly as a generic function's
own are. The theorem generator copies the lemma's type parameters from the function's signature, so
`Equal_<unit><T(==)>` quantifies the pair's `T`.

**Why it is sound.** A method of `C<T>` is parametric in `T` as `f<T>` is: every call fixes `T` once, through its
receiver or its arguments. A proof over an arbitrary `T` (only equality is known of it) therefore holds at each
instance. A constraint (`T extends Row`) is read as today's generic reading reads it: a member of `T` is one
uninterpreted field read through the constraint (translate.mjs, stage 5 rank 17), the same on both sides.

**Why only the ones it reads.** A method of a generic class that never meets `T` keeps its reading unchanged. It stays
in the heap core, and it does not become a "generic" unit that the heap core (heap.mjs), the generator reading
(generators.mjs) or a named callback would refuse. Those three now ask `unitTypeParameters` whether a unit is generic.

**What else had to change for a parameter to stay declared and determined.** Each of these is a gap of the generic
reading that the new units exercise. Some generic functions already hit them on base.
- *A helper over a type parameter.* A prelude helper built over it (`Slice_T`, `Map_T_bool` in `f<T>`) takes the
  clause an external takes (`tclause`), on each function and lemma it declares.
- *A record instantiated at a type parameter.* `Holder<D>` in `Holder.constructor` is a datatype generic in the
  parameters its fields name (`datatype Holder_3t29<D(==)>`), and every reference passes them (`Holder_3t29<D>`). The
  name already carried the instantiation's arguments, so `Holder<number>` stays its own datatype.
- *A name held at a type parameter, read at its constraint.* The checker types the read of `y` (declared `T`, with `T
  extends "a" | "b"`) at the constraint where a literal union is expected. The translator now reads it at `T`, the type
  the Dafny variable holds (`typeOf`, `heldAtTypeParameter`, also for a field read through `this`), and the existing
  cast converts it to the constraint where one is expected. On base, `const y = x; return y` wrote `var y: T := x; y`
  for a `string` result. That is a Dafny resolution error, which cost every unit of the file its proof.
- *A type parameter no argument names* (one read only in the body or the result, as `TKind` above). Dafny cannot infer
  it at a call, so it is named. theorem.py's lemma calls of the unit's functions pass the lemma's own parameters
  (`pass_type_args`). An external whose result alone names a parameter is called with the unit's parameters
  (`ext_kind<TKind>(self)`).

**A call signature's own type parameter.** A generic function held as a value (`type Parse = <O>(text: string,
options?: O) => string`, a library's `createAgent` read by `typeof`, a literal's generic method) has a type parameter
that is neither the unit's nor around it. No Dafny arrow is polymorphic, and every call of the value is instantiated
where it is written. So the parameter is read opaque (`Any`), its values uninterpreted as every opaque value is. A
class's, interface's or alias's type parameter stays refused, and so does the polymorphic `this`.

**A refusal it adds.** A unit that reads both an inner type parameter and an outer one of the same name (`class
Box<T> { item: T; m<T>(a: T) { ... this.item ... } }`) would read two types as one Dafny `T`. It is refused under
`types` with the message `type parameter T hides another of the same name` (readings.mjs). A unit that reads only
its own `T` is read as usual (the pair's `shelf_alike`).

**What it does not cover.** The polymorphic `this` type (form 4) is a type parameter the checker names after the
class. It is not a declaration's type parameter, so it is still refused with the form-2 message, and the inventory
script counts it under form 4. A commuted test inside a loop is not proved from the bodies alone, with or without a
type parameter. The pair's `shelf_count` row records it.

**Where the change sits.** In `dtype` it is only the TypeParameter branch, plus the parameter collection
(`unitTParams`). Outside `dtype`: `helper` and `external` (the type-parameter clause), `recordType`'s naming and
reference, and `typeOf`. Lane A7a's depth and recursion branches of `dtype` are untouched. Merging with A7a, the place
to look is `recordType`: both lanes may edit it, this lane only its last lines (the datatype's type parameters).

**The census.**
Base is lean master 5f96f554 (`git archive` into its own folder); head is this lane's e90440d9. Every census:
`NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs /root/da/census/repos/<root> --out <json>`, run from
each tree. Form 2 is counted by `node langs/ts/design/types-inventory.mjs <json>...`. A full nexus census did not
finish in two hours on the inventory's run, so nexus is censused in the 26 directories that hold every form-2 finding
of that run (`--include <dir>/`, one run per directory, 8,475 units). Those are not whole-root totals for nexus.

| Root | Units | Form 2 | Stopped by `types` | Language-refused | Readings that lose a unit |
| --- | ---: | ---: | ---: | ---: | --- |
| langchainjs | 6,709 | 152 → 0 | 270 → 124 | 3,232 → 3,127 | none |
| n8n | 9,610 | 27 → 0 | 434 → 407 | 5,247 → 5,229 | none |
| nexus (26 directories) | 8,475 | 110 → 0 | 422 → 314 | 2,885 → 2,791 | none |

Where the form-2 units went (the unit's refusal at head, its first finding's rule):
- langchainjs (152): 105 admitted. 6 stop on the polymorphic `this` of a class (form 4: `RunnableRetry` 2,
  `DictPromptTemplate`, `RunnableEach`, `RunnableLambda`, `RunnablePick`). The others stop on `copied-argument` 20,
  `read-after-call` 16, `reference-key` 2 and `names` 3 (a function named as a value: `JSON.parse` 2, `createAgent`).
- n8n (27): 18 admitted; `read-after-call` 5, `copied-argument` 4.
- nexus (110): 94 admitted; `copied-argument` 10, `read-after-call` 3, a union with a symbol member (form 5) 2, `names` 1.

On base, the 6 langchainjs units under form 4 were counted under form 2: they also read their class's type parameter,
which stopped them first.
