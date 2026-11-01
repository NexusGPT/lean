# The admission contract: one lowering per unit, read by the lint and the translator

Two deciders answered one question, "what does lean read, and as what": the lint (`lint/lint.mjs`) and the translator
(`translate/translate.mjs`), each by its own code. Where they disagreed, a function was advised as admitted and then
refused, or admitted by one and read differently by the other: one of the four causes of false proofs (research brief 20,
section 2). Readings also had no version, so a reading found unsound was patched in place instead of withdrawn by name.

The contract removes the second decider and versions the readings:

1. one catalogue of readings, `readings.mjs`;
2. one lowering per unit, `lower.mjs` `lowerFile`, which consults the catalogue and returns one record per unit;
3. the lint reads that record (`lintFile` is `lintFindings`, the record's findings); the translator's gate reads the
   record's admission (`admitUnits`), and its emission is the record's last phase;
4. a version of a reading can be withdrawn with its reason; the record then refuses every unit that uses it;
5. the census counts units per reading and compares two runs per reading.

## The catalogue

`readings.mjs` holds one entry per reading lean performs. An entry names the construct, the syntax kinds it reads (each
kind belongs to exactly one reading, checked when the module loads), the forms it reads inside another reading's kind
(`uses`: an operator, a named handler, a module cell), the lint rules it owns (a finding with the rule is this reading's
refusal), the translator refusals it owns (patterns over the refusal text, after `file:line: `), its runtime, aliasing,
exception and termination assumptions, the sentence it refuses with when a site has none of its own, the design notes
that define it, and its versions. Each lint rule has exactly one owner (checked at load); a rule shared by readings goes
to the owner unless another reading claims the message (`lintText`: the library rows claim their `unsupported-call`
texts, the named promise handler its `promise-handler` texts).

A version history keeps every withdrawn version with its reason. The catalogue records, as version 0 of fourteen
readings, the readings the fifteen false-proof classes of research brief 20 (section 2) withdrew: the record copy read as its declared
fields, the undeclared key read as absent, the non-null assertion read as a value, the prototype name read as absent, the
lost fault of a loop callback, the for-in in sorted order, the `let` read before its write, the module constant keyed by
its name, the number model without a signed zero, the module cell keyed by its text, the type assertion read as its
asserted type, the tagged template keyed by its tag's text, `instanceof` keyed by the class's text, and the inherited
method keyed by its name. Each names the design note of the reading that replaced it.

Fail closed. A lint finding whose rule no entry owns, or a translator refusal no entry's pattern matches, is a refusal all
the same, named `uncatalogued`. A syntax kind inside a unit that no entry reads, outside the structural kinds (a
parenthesis, a declaration list, a template's parts) and the type nodes, refuses the unit under rule `no-reading`: the
lowering never reads a construct by default. Two kinds were found this way while building the catalogue (a local
`interface` and a local `type`, erased at run time) and given to the type reading.

## The lowering

`lowerFile(file, ranges, opts)` returns `{ units: [{ unit, lines, readings: [{id, version}], refusal }], findings }`.
`refusal` is null or `{ id, version, rule, reason, line, by, site? }`. Phases:

1. **The lint's judgement** (`admissionFindings`, the lint as it stood, renamed): every finding is tagged with the reading
   that owns it.
2. **Readings used.** A walk of the unit's parameters and body: each node's kind names its reading, each `uses` test adds
   the forms; `types` holds for every unit. A kind no reading reads adds a `no-reading` finding.
3. **Withdrawal.** A unit that uses a reading whose version is withdrawn gets a `withdrawn` finding naming the reading,
   its version and the reason.
4. **Emission.** Each unit phases 1-3 admitted is translated exactly as the proof lane translates it (check.mjs:
   `--core --heap --only <unit>`, not tolerant): the unit with the same-file units it calls, behind the translator's gate
   over all of them. An `Unsupported` is the unit's refusal: the gate's first finding (rule and message) when the gate
   refused, else the refusal text, named by the reading whose pattern owns it, with the translate.mjs line that refused it
   (`site`, read off the error's stack: the first frame in translate.mjs that is not `fail` itself). Any other error
   refuses the unit as `translator-crash`.

Phases 1-3 are `admitUnits(file, ranges, lintOpts, loaded)`, which the translator's gate calls; phase 4 is the translator
itself. The record is memoised per file text, options, ranges and the withdrawals in force.

Why phase 4 translates one unit at a time: the translator's answer for a unit depends on the units translated beside it
(in tolerant mode, a unit whose callee failed through `this.m()` is reported translated, since only a call by name checks
`failedUnits`; the effectful set is computed over the units in the run). Translating each unit as check.mjs does gives the
answer the proof lane gives; a measured case (`orange-checkout-automation` `TtlCache`, five methods over a class type
parameter) is refused by the CLI for all five and was admitted for two by a whole-file tolerant run.

## The two consumers

The lint: `lintFile(file, ranges, opts)` returns the record's findings: the lint's own, the catalogue's (`no-reading`,
`withdrawn`), and one finding per unit the translator refused (rule: the refusal's rule prefix where the translator names
a lint rule, else the reading's id; `reading`, `by: 'translate'`). Every consumer of `lintFile` (the command line, the
census, pr.mjs, the editor plugin, convert.mjs, check.mjs's advice) reads the record. The lint never advises as admitted a
unit the proof lane's translator refuses.

The translator: its gate (`gate0`) is `admitUnits` over the units it reads, so a withdrawn or unread construct is refused
before emission with the same rule and text the lint gives. Its accessor-body probe reads `admissionFindings` (phase 1),
as before. `translate()` takes `opts.loaded`, so the lowering and the census share one program with it.

What "the translator never re-decides" means here: the translator's emission is the lowering's phase 4, consulted once
per unit; the lint does not decide emission at all, it reads the outcome. Where both files still test one construct each
by its own code, the record reconciles admission (a unit either refuses is refused) and the reading used is the
translator's; those sites are listed below as the ones not yet moved into one predicate.

## Decisions moved into one predicate (the named-then pattern)

Four constructs were tested by both files with the same condition and two texts; each is now one predicate in `lower.mjs`
with one text, called at both sites: `installsFunction` (a function value stored into an outside root, rule
`property-assign`), `loneSurrogate` (a surrogate code unit in a string, `string-code-unit`), `nullPrototypeCreate`
(`Object.create(null)`, `prototype`; also the translator's dictionary typing of it), `valueAssignmentWhy` (an assignment
operator used as a value, `assignment-expression`).

Two more were tried and withdrawn from this lane: a type parameter the unit does not declare, and a union member the opaque
union reading cannot hold. As one predicate both are exact, but the lint applies its type test to every declared type
while the translator applies it only where it materializes a Dafny type. The historical probe lost four previously
lint-admitted units, all through `foreignTypeParameter`, none through `unionRefusal`: `TtlCache.constructor` reached its
class parameter V through a field; `paintedRect`, `toHastElement`, and `VoiceCallClient.openSocket` reached unrelated
constructor generics through DOM/Window types. These are historical lint losses, not four units currently admitted by
emission. Applied only where the translator materializes a type, the test remains the translator's own; the record
already carries that refusal. The translator-sites report preserves the file paths, checker paths, and current refusals.

The audit below marks each site: `lowering` (decided by a predicate in lower.mjs), `shared` (its statement calls a
decision both files import: the named-then pattern already in place, `namedPromiseHandler`, `forInKeyOrder`,
`copySource`, `nonNullOnAbsent`, ...), `one-decider` (decided in one file only; the other reads it through the record).
`exception:<name>` identifies two different conditions, with both names and the reason retained in the audit record.
The sixteen translator sites targeted by translator-sites are now shared/lowering, removed, or named exceptions.
The remaining one-decider rows are outside that reviewed set; they are not claimed to duplicate a lint condition.

## Translator-site consolidation

- Spread layout backstop (former translator site 2827): removed. `spreadReadWhy` already rejects every non-data
  member in this branch; dictionary and opaque literal branches return earlier. The remaining value selection is emission.
- Open-index prototype backstop (former site 3447): calls `openRecordReadWhy`, the lint's decision, and preserves the
  translator's diagnostic text. The open-index emitter has an open-record receiver; the predicate's prototype condition
  is exactly the removed name test under that precondition.

The number-special sites call numberSpecial with a named form: non-finite literal text or a global special-value name. The existing positive-Infinity opaque reading remains the preceding lint decision.

Math.min/max now consume the same nonemptyMathArgs predicate. It preserves the admission rule and strengthens the emitter from nonzero argument count to a dominating nonempty-sequence proof. Adopted after the measured native census and per-file comparisons remained unchanged. The lane report records the two lead-approved, unmeasured LangChain files and the separate census fix; no claim covers those files.

optionalCallShape owns one record with sourcePathAdmission and emittedCalleeShape, sharing type, absence and signature facts. The permanent optional-source-vs-emitted-callee exception preserves their different domains: the directly walked source path is restricted to locals/plain records, while lowered declared fields can be reached through indirect class receiver paths. Required callees need no optional-branch signature. Both consumers read their named condition; the five private translator refusals collapse into one shared refusal. The Nexus comparison exposed this distinction before adoption; the regression fixture exercises both conditions.

inlinePromiseStatementKind is the single statement vocabulary used by the lint and the promise emitter dispatch. The opaque return of a throwing handler remains the named promise-opaque-return exception: syntactic inline-body admission and opaque-block Promise settlement are different conditions, both recorded in the promises catalogue entry.

The conditional-state-channels permanent exception is retired (2026-10-31, lane short-circuit-carried): its argumentUpdatesInBranch condition is read (a short-circuit right operand carries the names a same-file call in it rebinds, design/heap-stage5.md section 3b), so worldEffectInPureBranch is the translator's one condition of `conditional-effect`.

The receiver-scope-vs-self-type permanent exception records lexicalReceiverAvailable and materializableUnitReceiver. Literal methods have lexical this through a captured field environment, not a unit self type. Both named conditions are linked through the classes reading in the lowering record; no receiver behavior changes.

### Translator-site group 8: shared mutation facts, named projections

`mutationAnalysis` performs one traversal per unit and one joint call-edge fixed point. Admission reads `admissionRisk`; emission reads `valueOutputs`. `parameterMutationConflicts` uses symbol-bound rebindings. The permanent exception `mutation-admission-vs-value-output` records why callback scope, mutator expressions, nested roots, declared receivers and suspended bodies cannot be collapsed without changing the value ABI. `elementMutation`, `loopElementBinding` and `firstElementMutation` share callback ownership and loop-element decisions. The exception `element-shape-vs-selected-emission` carries heap shape eligibility separately from actual heap selection; both conditions and their reasons are visible in the audit. No phase or memo machinery changes.

## Withdrawal

A reading's last version marked `withdrawn` with a reason, `LEAN_WITHDRAW="<id>=<reason>;..."` in the environment (an
operator withdraws a reading the moment it is found unsound, before any code changes), or `withdraw(id, reason)` in
process: the lowering refuses every unit that uses the reading, rule `withdrawn`, message `reading <id> version <v> is
withdrawn: <reason>`, in the lint and in the translator's gate alike. `tests/withdrawal.mjs` (a row of the suite)
withdraws `logic-values` and shows, on pair `nested_ternary` unit `choose`: the record, the lint and the translator
refuse with the same rule and reason; the command lines exit 1; check answers without a proof (lane A ASK); with the
reading back the same unit is PASS-proved.

2026-10-31 (lane withdrawal-catalogue): the audit found nine translator sites the night's readings added with no
entry, so a withdrawal of their reading named nothing for them. Each is now a `translate` pattern of the reading its
design note defines: six of `tagged-template` (design/heap-stage5.md 1b: the raw parts the parser did not keep, an invalid
escape under a tag other than String.raw, a tag that is not a name or a member, a tag read without the world that may write
a hole or its receiver, no TemplateStringsArray type) and three of `regex` (6b: `.groups` of a pattern that names no group,
a named capture of a match that may be null read without `?.`, a named capture read as another type; outside 6b the lint
refuses by library row `match-groups`, rule `unsupported-member`). Withdrawn, either reading refuses its unit `withdrawn`
in the gate before any of these sites is reached (pairs `template_literals` `tagged`, `path` and `regular_expressions`
`year`: PASS-bounded, lane A ASK; PASS-proved without). `tagged-template` v1 (one pure function of the cooked parts,
replaced by the call of the tag in 1b without a new version) is recorded withdrawn with that reason; v2 is current.

## The census per reading

`census.mjs` reads the record of each file: its JSON gains `readings: [{ id, admitted, refused }]` (units admitted that
use the reading, units the reading refuses) and `records[].lowering` (per unit its readings and its refusal);
`--readings-report` writes the table; `census.mjs --diff <before.json> <after.json>` lists per reading the counts on both
sides and the units gained, lost, newly refused and no longer refused.

## Limits

- The lowering translates with the options the proof lane uses alone; check.mjs also forces the units the other side
  reads as effectful (`--effectful`) and agrees the heap core between the two sides (`--heap-units`). A unit whose answer
  changes under those is answered by check.mjs, not the record.
- heap.mjs throws plain errors on cases its planner should have excluded; the record names them `translator-crash`.
- The audit reads a site's decision off its statement, the tests that guard it and the locals it names; a decision taken
  further away (a helper's whole body) is not credited, so `shared` is a floor.

## The readings

Generated from `readings.mjs` (the full entry, with each reading's assumptions and refusal text, is in the file).

| Reading | Construct | Syntax it reads | Lint rules it owns | Translator refusals | Version | Defined in |
| --- | --- | --- | --- | ---: | --- | --- |
| `names` | an identifier read as a value: a parameter or local, a unit of the file, a module constant, an import, a global | Identifier, MetaProperty | `global-read`, `arguments`, `dynamic-eval` | 3 | v1; 1 withdrawn | SEMANTICS.md, design/reach-keys.md, design/lib-globals.md, design/named-then.md |
| `module-state` | a module `let`, an object-valued module constant, a static field of a class of the file: a cell of the world | (a form) | `toplevel-effect`, `toplevel-state` | 2 | v1; 1 withdrawn | design/module-forms.md, design/reach-keys.md, design/class-statics.md |
| `numbers` | number literals and arithmetic: integers in an integer file, exact reals in a real file, finite values | NumericLiteral, BigIntLiteral | `division`, `number-special`, `unary-coercion` | 2 | v1; 1 withdrawn | design/special-numbers.md, design/signed-zero.md, design/numbers-bitwise-nan.md, design/prelude-unit.md |
| `bitwise` | bitwise and shift operators on numbers: ToInt32 and ToUint32 over bv32, a chain one inline bv32 term, `x & (2^k - 1)` through the low-bits lemma (an operand the faithful reading does not hold: one uninterpreted ToInt32, the result exact; heap-stage5.md section 13, 2026-10-31; design/bitwise-lemmas.md) | (a form) | `bitwise` | 0 | v1 | design/numbers-bitwise-nan.md |
| `strings` | string literals and templates: seq<char> of BMP code units, the string methods the prelude defines | StringLiteral, NoSubstitutionTemplateLiteral, TemplateExpression | `string-code-unit`, `string-order` | 0 | v1 | design/strings.md |
| `tagged-template` | a tagged template: the call tag(strings, ...holes), strings a bodiless function of the raw parts; a tag of the file through its unit, any other through the outside call, String.raw exact | TaggedTemplateExpression | `template` | 6 | v2; 2 withdrawn | design/reach-keys.md, design/heap-stage5.md |
| `regex` | a regular expression literal: an opaque constant named by its text; the match members of a non-global literal as functions of the pattern and the string | RegularExpressionLiteral |  | 3 | v1 | design/library-rows.md, design/heap-stage5.md |
| `equality` | === and == between values: equality of the value reading, the coercion table for == between primitives | (a form) | `loose-equality`, `reference-equality`, `mixed-types` | 1 | v1 | design/mixed-vs-literal.md, design/null-undefined.md |
| `logic-values` | booleans, conditionals, &&, \|\| and ??: JavaScript truthiness by the static type, the deciding operand evaluated once | TrueKeyword, FalseKeyword, ConditionalExpression, (a form) | `conditional-effect` | 0 | v1 | design/mixed-logic-values.md, SEMANTICS.md |
| `absence` | null and undefined: Option<T> for one absence, Nullish<T> with distinct tags for both, Any_null and Any_undefined in Any | NullKeyword |  | 1 | v1 | design/null-undefined.md, design/absent-number.md, design/branch-types.md |
| `non-null-assertion` | `x!` on a value whose type excludes absence: the value itself | NonNullExpression | `non-null-assertion` | 0 | v1; 1 withdrawn | design/null-undefined.md |
| `type-assertion` | `e as T`, `<T>e`, `e satisfies T`: the value keeps its run-time type (the source's, or Any for any and unknown) | AsExpression, TypeAssertionExpression, SatisfiesExpression | `type-assertion` | 0 | v1; 1 withdrawn | design/type-assertions.md |
| `types` | the TypeScript types of a unit as Dafny types: records as datatypes with an open rest, unions as sums or opaque, Set and Map as ordered carriers, functions as arrows | InterfaceDeclaration, TypeAliasDeclaration, (every unit) | `unsupported-type`, `ts-strict`, `unresolved-module` | 7 | v1 | design/open-datatype.md, design/branch-types.md, design/ordered-collections.md |
| `records` | object literals: a record datatype value (constructor defaults for the rest), a dictionary literal as the ordered carrier | ObjectLiteralExpression, PropertyAssignment, ShorthandPropertyAssignment |  | 0 | v1 | design/open-datatype.md, design/dict-order.md |
| `members` | a member read `a.f`: a datatype field, an array or string length, a Set or Map size, an accessor of an opaque type, a field of a type parameter through its constraint | PropertyAccessExpression | `unsupported-member` | 1 | v1 | design/member-constraints.md, design/library-rows.md |
| `keys` | element access and computed keys: an array or string index, a dictionary key, a finite union of declared keys as a case split, an open key as an uninterpreted lookup | ElementAccessExpression, ComputedPropertyName | `dynamic-key` | 6 | v1; 1 withdrawn | design/open-datatype.md, design/dynamic-record-reads.md, design/open-key-read.md, design/hash-keys.md, design/dict-order.md, design/computed-literal-keys.md |
| `prototype` | plain objects: every record and dictionary has Object.prototype as its prototype; `in` and the own-key tests read own keys plus the names of Object.prototype | (a form) | `prototype`, `freeze` | 4 | v1; 1 withdrawn | design/narrow-in.md, design/in-prototype.md, design/proto-names.md, design/proto-write.md |
| `record-copy` | a copy of a record's own keys: `{ ...x }` and `Object.assign({}, x)`: the source itself with its rest, updated by the later members | SpreadAssignment | `spread-source`, `assign-target` | 1 | v1; 1 withdrawn | design/open-datatype.md, design/spread-map.md |
| `arrays` | array literals and spreads: a sequence; a spread the sequence of its source's elements (an array, a Set, a Map, their iterators, a fixed tuple) | SpreadElement, ArrayLiteralExpression | `spread` | 2 | v1 | design/tuple-spread.md, design/spread-outside-callees.md |
| `destructuring` | object and array patterns: field reads in order, defaults where the field may be absent, a record rest as a remainder function | ObjectBindingPattern, ArrayBindingPattern, BindingElement | `destructuring`, `record-rest`, `uninitialised` | 4 | v1 | design/record-rest-any.md |
| `declarations` | `const` and `let` declarations: Dafny `var` bindings in a chain, a block's names saved and restored around it | VariableStatement, VariableDeclaration, Parameter | `var`, `definite-assignment`, `param-form` | 1 | v1; 1 withdrawn | design/local-declarations.md |
| `control-flow` | blocks, if, switch, return, break and continue, labels, expression statements: one Dafny expression per statement list, branches as if-then-else | Block, EmptyStatement, IfStatement, SwitchStatement, CaseClause, DefaultClause, ReturnStatement, BreakStatement, ContinueStatement, LabeledStatement, ExpressionStatement | `break-continue`, `label`, `bare-return` | 9 | v1 | design/for-desugar.md, design/bare-return-void.md |
| `loops` | for, for-of, for-in, while, do: a recursive helper per loop with a decreasing measure, or one opaque block keyed by its text when no bound is known | ForStatement, ForOfStatement, ForInStatement, WhileStatement, DoStatement | `for-of-non-array`, `for-in`, `key-order`, `for-in-delete` | 5 | v1; 1 withdrawn | design/loop-forms.md, design/loop-fuel.md, design/forin-order.md, design/for-desugar.md |
| `exceptions` | throw and try: a fault flag on the world, checked after each statement that may fault; a complex try one opaque transition keyed by its text | ThrowStatement, TryStatement, CatchClause | `exception-callback`, `exception-binding`, `exception-return`, `callback-control` | 2 | v1; 1 withdrawn | design/exceptions-across-calls.md, design/throwing-callbacks.md, design/fake-throw.md |
| `calls` | calls: a same-file unit by its Dafny function (mutated parameters returned beside the result), an outside call as one transition of the world named by its callee and the code it reaches | CallExpression, NewExpression | `unsupported-call`, `function-value`, `bound-function` | 8 | v1; 1 withdrawn | SEMANTICS.md, design/reach-keys.md, design/inherited-method.md, design/push-apply.md, design/inline-callee.md |
| `library` | the library rows: array, string, Set, Map, Math and Object functions read by prelude helpers or as transitions (translate/library.json) | (a form) | `collection-iterator`, `mutator-value`, `in-place-mutation`, `math-empty` + `unsupported-call` by message | 5 | v1 | design/library-rows.md, design/ordered-collections.md |
| `callbacks` | a function value: a pure arrow as a Dafny lambda, an array callback as a loop body, a callback handed outside as an opaque value named by its text and captures | ArrowFunction, FunctionExpression | `callback-form`, `callback-result`, `foreach`, `async-predicate`, `async-reduce`, `async-callback` | 11 | v1 | design/callback-patterns.md, design/effectful-callbacks.md, design/named-callbacks.md, design/array-callback-cells.md, design/handler-identity.md |
| `local-functions` | a function declared inside a unit: a local procedure spliced at each call statement, or a local function value | FunctionDeclaration | `generator` | 1 | v1 | design/local-procedures.md |
| `mutation` | writes: a local rebound, a parameter's record or array rebuilt and returned as an output, a field of the receiver as a world cell, a delete of an optional field or a key | DeleteExpression, (a form) | `alias-mutation`, `param-mutation`, `closure-mutation`, `global-mutation`, `index-assign`, `property-assign`, `receiver-mutation`, `receiver-write`, `opaque-mutation`, `param-assign`, `delete`, `unsupported-operator` | 16 | v1 | design/element-writes.md, design/alias-result.md, design/param-rebind.md, design/receiver-write.md, design/heap-stage5.md |
| `operators` | arithmetic, comparison, unary and update operators, typeof: Dafny operators on the value reading | BinaryExpression, PrefixUnaryExpression, PostfixUnaryExpression, TypeOfExpression |  | 0 | v1 | design/operators-as-values.md, design/exact-type-tests.md |
| `operators-as-values` | an assignment, an update or a comma used as a value: the value bound once, every operand captured in source order | CommaListExpression, (a form) | `operator-value-context`, `update-expression`, `assignment-expression` | 2 | v1 | design/operators-as-values.md, design/comma-operator.md |
| `optional-chain` | `a?.b` and `f?.(x)`: an Option of the read, the call and its transition only when the callee or receiver is present | (a form) | `optional-chain` | 2 | v1 | design/optional-call.md |
| `promises` | async units and promises: await as a world transition, exact then/catch/finally/new Promise reactions sharing the fault channel, a returned outside promise as a handle | AwaitExpression | `promise`, `promise-handler`, `promise-thenable`, `promise-pending`, `promise-executor`, `promise-executor-escape`, `promise-unsettled`, `promise-all-order`, `async` | 10 | v1 | design/promise-forms.md, design/promise-handle.md, design/void-promise.md, design/microtask-worker.md |
| `promise-named-handler` | a named promise handler `p.then(h)`: h called with the settled argument (a unit by its function, an import as a transition, a module constant as a transition keyed by its reach) | (a form) |  + `promise-handler` by message, `promise-thenable` by message | 0 | v1 | design/named-then.md |
| `generators` | a pure generator as the sequence it yields; an async generator as one opaque program keyed by its text | YieldExpression | `generator-use`, `generator-bound`, `generator-effect` | 2 | v1 | design/generators.md, design/gen-walk.md |
| `classes` | methods of a class of the file: units with an explicit receiver; fields a method assigns as world cells; `this` in a free function as a declared `this` parameter | ThisKeyword, SuperKeyword, Constructor, ClassDeclaration, ClassExpression, PropertyDeclaration | `class`, `this`, `static-this`, `this-param`, `implicit-this` | 3 | v1 | design/class-statics.md, design/this-param.md, design/inherited-method.md |
| `object-literal-methods` | methods and getters of an object literal: function fields over the literal's immutable data | MethodDeclaration, GetAccessor, SetAccessor | `object-method-mutation`, `object-method-capture`, `iterator-protocol` | 0 | v1 | design/object-methods-getters.md |
| `instanceof` | `x instanceof C`: decided by the static type where it can be, else an uninterpreted test named by C and the classes the test can meet | (a form) | `instanceof-constructor` | 0 | v1; 1 withdrawn | design/reach-keys.md |
| `react` | JSX elements as JsxElem values; hook calls as world transitions or slot reads; handlers as step descriptors | JsxElement, JsxSelfClosingElement, JsxFragment, JsxExpression, JsxText, JsxAttribute, JsxSpreadAttribute | `hook-order`, `react-handler-capture`, `render-impure` | 3 | v1 | design/react-handlers-memo.md, design/ref-cell.md, design/handler-descriptors.md, design/ui-layers.md |
| `decorators` | a listed decorator: a route wrapper of guards and pipes, a metadata cell of the world (translate/decorators.json) | Decorator |  | 2 | v1 | design/decorators.md |
| `proof-shape` | the --fn proof shape (methods with loops, kept for the fixtures) and the translator's invocation | (refusals only) |  | 7 | v1 | langs/ts/translate/translate.mjs (header) |
| `unread-syntax` | the syntax the lint has no case for: refused by the default branch of its statement and expression switches | VoidExpression | `unsupported-syntax`, `void` | 2 | v1 | design/coverage-matrix.md |
| `translator-internal` | the translator's own invariants (an effect in a unit not marked effectful, a missing helper): a defect of the translator, never a reading | (refusals only) |  | 5 | v1 | langs/ts/translate/translate.mjs |

## The audit: every decision site

Every place lint.mjs or translate.mjs decides that a construct is refused, read off their source by
`node langs/ts/lower.mjs --audit` (the compiler parses both files; a site is a call of the lint's `v`, `refuse` or `note`, a
pushed finding, a call of the translator's `fail`, or a `throw new Unsupported`). Each row names the reading of the catalogue
the site's refusal belongs to, by the lookup the lowering makes at run time (`readingOfFinding` for a lint rule and its
message, `readingOfRefusal` for a translator message), and where it is decided. A site whose rule is computed
(`shape.rule`, `named.rule`, the EFFECT_GLOBALS table) has one row per rule it can name. A message written as an expression
(`<...>`) is resolved by its rule here and by its text at run time. `advice` rows never refuse. `tests/withdrawal.mjs`
fails when a site has no reading.

The permanent exceptions below retain both named conditions. These reasons also appear in `lower.mjs --audit --json`; each site row identifies its exception.

| Exception | Named conditions | Reason |
| --- | --- | --- |
| exception:optional-source-vs-emitted-callee | sourcePathAdmission; emittedCalleeShape | Direct source path admission and lowered declared-field emission have different domains; equating them loses indirect class receiver units. Required callees need no optional-branch signature. |
| exception:element-shape-vs-selected-emission | heapShapeEligible; heapSelected | Admission knows eligible shapes; value emission knows the actual planner selection. Owned reduce accumulators additionally distinguish ownership from safe write depth. |
| exception:mutation-admission-vs-value-output | admissionRisk; valueOutputs | The same facts feed two projections with different purposes and traversal scopes; equating them changes admission or function outputs. |
| exception:receiver-scope-vs-self-type | lexicalReceiverAvailable; materializableUnitReceiver | Lexical this validity and the availability of a unit self type have different domains. A literal method has lexical this but no unit self type. Combining them would reject valid literal methods or invent a receiver type. |
| exception:promise-opaque-return | inlineStatementAdmission; opaqueFaultReturn | Statement admissibility is syntactic; the fault emitter additionally needs to settle a Promise returned by an opaque block. A valid statement can reach this separate emission limit. |

| site | kind | rule | reading | decided | message |
| --- | --- | --- | --- | --- | --- |
| lint/lint.mjs:365 | lint-refuse | read-after-call | mutation | shared (readAfterCall) | <rc.message> |
| lint/lint.mjs:387 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | literal this reads scalar fields; reference-valued receiver state needs a class |
| lint/lint.mjs:388 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | keep literal this as a direct data-field read; use a class for aliases or rebinding |
| lint/lint.mjs:389 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | literal method fields are immutable; use a class for mutable receiver state |
| lint/lint.mjs:390 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | literal method fields are immutable; use a class for mutable receiver state |
| lint/lint.mjs:415 | lint-refuse | prototype | prototype | lowering (NULL_PROTOTYPE_WHY, nullPrototypeCreate) | <NULL_PROTOTYPE_WHY> |
| lint/lint.mjs:416 | lint-refuse | prototype | prototype | one-decider | `Object.${}` reaches the prototype chain or the property descriptors; no transition models it |
| lint/lint.mjs:417 | lint-refuse | freeze | prototype | one-decider | `Object.${}` makes a later write throw in strict code; the value reading has no fault for that write |
| lint/lint.mjs:418 | lint-refuse | assign-target | record-copy | one-decider | `Object.assign` writes into its first argument; pass a fresh literal `{}` as the target or spread th |
| lint/lint.mjs:419 | lint-refuse | spread-source | record-copy | shared (copySource) | `Object.assign` onto a literal copies every own key of `${}`: ${}; the call is read as a function of |
| lint/lint.mjs:618 | lint-refuse | unsupported-type | types | one-decider | type ${} is not translatable |
| lint/lint.mjs:626 | lint-refuse | arguments | names | one-decider | `arguments` is the actual argument vector, not the declared one; name the parameter, or declare a re |
| lint/lint.mjs:629 | lint-refuse | exception-callback | exceptions | one-decider | call the throwing unit directly, or pass it to a call; a stored function value has no fault channel |
| lint/lint.mjs:630 | lint-refuse | generator-use | generators | shared (asyncGenerator) | consume a pure generator directly in for-of, spread, Array.from or yield* |
| lint/lint.mjs:631 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | pass a fresh literal handler or keep calls on the local object; sharing a named method object needs  |
| lint/lint.mjs:639 | lint-refuse | toplevel-effect | module-state | shared (broken, moduleState) | move the effectful module initializer into a function |
| lint/lint.mjs:642 | lint-refuse | global-read | names | one-decider | `${}` is module state that can change; the subset reads constants only |
| lint/lint.mjs:644 | lint-refuse | number-special | numbers | lowering (numberSpecial) | the finite number model has no NaN or infinity; use lane B for special-value arithmetic |
| lint/lint.mjs:645 | lint-refuse | dynamic-eval | names | one-decider | `${}` is outside the subset |
| lint/lint.mjs:645 | lint-refuse | prototype | prototype | one-decider | `${}` is outside the subset |
| lint/lint.mjs:648 | lint-refuse | global-read | names | one-decider | global `${}` is outside the subset |
| lint/lint.mjs:649 | lint-refuse | global-read | names | one-decider | `${}` cannot be resolved |
| lint/lint.mjs:673 | lint-refuse | static-this | classes | one-decider | `${}` in a static method is the class the call names, a subclass too; name the class itself, or give |
| lint/lint.mjs:681 | lint-refuse | global-read | names | one-decider | `${}` holds a function; call a static method of the class instead |
| lint/lint.mjs:683 | lint-refuse | global-read | names | one-decider | `.${}()` changes the static `${}` in place; assign a new value to the field instead |
| lint/lint.mjs:767 | lint-refuse | var | declarations | one-decider | `var` is outside the subset; use let or const |
| lint/lint.mjs:768 | lint-refuse | definite-assignment | declarations | shared (absenceCarried, absenceHome) | this let may be read before its first assignment (a read TypeScript does not check, or a write insid |
| lint/lint.mjs:768 | lint-refuse | definite-assignment | declarations | one-decider | `${}` may be read here before its first assignment (TypeScript does not check this read), and lean t |
| lint/lint.mjs:776 | lint-refuse | bare-return | control-flow | one-decider | return needs a value |
| lint/lint.mjs:782 | lint-refuse | destructuring | destructuring | one-decider | for-of binds one name or one pattern |
| lint/lint.mjs:784 | lint-refuse | for-of-non-array | loops | one-decider | for-of runs over arrays, strings, sets, maps and iterable values |
| lint/lint.mjs:799 | lint-refuse | for-in | loops | one-decider | for-in takes `const k` |
| lint/lint.mjs:800 | lint-refuse | key-order | loops | shared (forInKeyOrder) | a for-in visits the own keys in creation order (ECMA-262 14.7.5.9, 10.1.11), and the order of this o |
| lint/lint.mjs:801 | lint-refuse | for-in-delete | loops | one-decider | a for-in skips a key deleted before its visit (ECMA-262 14.7.5.9), and the reading visits the keys t |
| lint/lint.mjs:804 | lint-refuse | break-continue | control-flow | one-decider | break outside a loop or switch |
| lint/lint.mjs:805 | lint-refuse | break-continue | control-flow | one-decider | continue outside a loop |
| lint/lint.mjs:807 | lint-refuse | exception-callback | exceptions | one-decider | move the throw to a same-file unit and call it directly |
| lint/lint.mjs:812 | lint-refuse | destructuring | destructuring | one-decider | catch binds one name |
| lint/lint.mjs:818 | lint-refuse | label | control-flow | one-decider | a label must name a loop; replace a labelled block with conditional control |
| lint/lint.mjs:822 | lint-refuse | generator | local-functions | one-decider | generators are outside the subset |
| lint/lint.mjs:824 | lint-refuse | param-form | declarations | one-decider | rest parameters are outside the subset |
| lint/lint.mjs:833 | lint-refuse | class | classes | one-decider | classes are outside the subset |
| lint/lint.mjs:834 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | statement ${} is outside the subset |
| lint/lint.mjs:882 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | read named fields on the literal object; copying accessors or detached methods needs a receiver |
| lint/lint.mjs:885 | lint-refuse | unsupported-member | members | one-decider | ${} |
| lint/lint.mjs:889 | lint-refuse | record-rest | destructuring | one-decider | record rest needs a parameter of a plain record with written keys, or a fixed nonempty scalar record |
| lint/lint.mjs:1000 | lint-refuse | uninitialised | destructuring | one-decider | a pattern needs an initial value |
| lint/lint.mjs:1075 | lint-refuse | alias-mutation | mutation | exception:element-shape-vs-selected-emission (elementMutation) | `${}` is the accumulator `reduce` hands its callback: it holds the array's first element when the ca |
| lint/lint.mjs:1076 | lint-refuse | alias-mutation | mutation | exception:element-shape-vs-selected-emission (elementMutation) | `${}` is the element `${}` hands its callback; a field written through it (`=`, `+=`, `-=`, `*=`, `+ |
| lint/lint.mjs:1084 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | literal method fields are immutable; use a class for mutable receiver state |
| lint/lint.mjs:1094 | lint-refuse | global-mutation | mutation | shared (moduleState) | assignment to `${}`, which this function does not own |
| lint/lint.mjs:1095 | lint-refuse | render-impure | react | shared (moduleState) | a render function writes `${}`, a variable outside it; move the write into an event handler or an ef |
| lint/lint.mjs:1096 | lint-refuse | param-assign | mutation | exception:mutation-admission-vs-value-output (moduleState) | <why> |
| lint/lint.mjs:1097 | lint-refuse | closure-mutation | mutation | shared (moduleState) | `${}` is declared outside this callback; a callback cannot change it |
| lint/lint.mjs:1102 | lint-refuse | index-assign | mutation | one-decider | index assignment into `${}`, which this function does not own |
| lint/lint.mjs:1103 | lint-refuse | alias-mutation | mutation | one-decider | <aliasMsg(l.expression.text, o.decl)> |
| lint/lint.mjs:1104 | lint-refuse | closure-mutation | mutation | one-decider | a callback cannot change an outer ${} |
| lint/lint.mjs:1105 | lint-refuse | index-assign | mutation | one-decider | compound assignment on an element is outside the subset |
| lint/lint.mjs:1106 | lint-refuse | dynamic-key | keys | one-decider | a dictionary key is a string |
| lint/lint.mjs:1107 | lint-refuse | prototype | prototype | shared (protoKeyWrite) | a key that may be '__proto__' with an object or null value replaces the dictionary's prototype (the  |
| lint/lint.mjs:1111 | lint-refuse | global-read | names | one-decider | `${}` holds a function; call a static method of the class instead |
| lint/lint.mjs:1112 | lint-refuse | property-assign | mutation | one-decider | only =, +=, -=, *= on a static field |
| lint/lint.mjs:1115 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | literal methods keep immutable data fields; use a class for mutable receiver state |
| lint/lint.mjs:1115 | lint-refuse | receiver-mutation | mutation | shared (receiverRecordPath) | a receiver path needs nonoptional data records; assign a field itself for class or opaque handles |
| lint/lint.mjs:1115 | lint-refuse | receiver-mutation | mutation | one-decider | only =, +=, -=, *= on a field of `this` |
| lint/lint.mjs:1116 | lint-refuse | receiver-write | mutation | shared (thisParamPath) | <RECEIVER_WRITE> |
| lint/lint.mjs:1118 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | literal method fields are immutable; use a class for mutable receiver state |
| lint/lint.mjs:1123 | lint-refuse | property-assign | mutation | shared (outsideRoot) | a field of `${}` is written by a plain `=` statement; read the old value into a local first |
| lint/lint.mjs:1124 | lint-refuse | property-assign | mutation | lowering (INSTALLS_FUNCTION_WHY, installsFunction, outsideRoot) | <INSTALLS_FUNCTION_WHY(root.text)> |
| lint/lint.mjs:1133 | lint-refuse | property-assign | mutation | shared (elementWritePath) | assignment into `${}`, an element of `${}`, which is not a parameter of this function; write an elem |
| lint/lint.mjs:1134 | lint-refuse | alias-mutation | mutation | shared (elementWritePath) | <aliasMsg(ep.root.text, po.decl)> |
| lint/lint.mjs:1135 | lint-refuse | closure-mutation | mutation | shared (elementWritePath) | a callback cannot change an outer record |
| lint/lint.mjs:1136 | lint-refuse | property-assign | mutation | shared (elementWritePath) | only =, +=, -=, *= on a field |
| lint/lint.mjs:1141 | lint-refuse | property-assign | mutation | one-decider | only =, +=, -=, *= on a field |
| lint/lint.mjs:1142 | lint-refuse | property-assign | mutation | one-decider | only =, +=, -=, *= on a field |
| lint/lint.mjs:1143 | lint-refuse | property-assign | mutation | one-decider | assignment into `${}`: a field of an element is written when the path from a parameter takes field a |
| lint/lint.mjs:1144 | lint-refuse | property-assign | mutation | one-decider | assignment into `${}`, which this function does not own; records it owns are updated in place |
| lint/lint.mjs:1145 | lint-refuse | alias-mutation | mutation | one-decider | <aliasMsg(root.text, o.decl)> |
| lint/lint.mjs:1146 | lint-refuse | closure-mutation | mutation | shared (cellWrite) | a callback cannot change an outer record |
| lint/lint.mjs:1147 | lint-refuse | property-assign | mutation | shared (cellWrite) | only =, +=, -=, *= on a field |
| lint/lint.mjs:1150 | lint-refuse | index-assign | mutation | one-decider | compound assignment on an element is outside the subset |
| lint/lint.mjs:1151 | lint-refuse | dynamic-key | keys | one-decider | a dictionary key is a string |
| lint/lint.mjs:1152 | lint-refuse | prototype | prototype | shared (protoKeyWrite) | a key that may be '__proto__' with an object value replaces the dictionary's prototype (the setter o |
| lint/lint.mjs:1156 | lint-refuse | index-assign | mutation | one-decider | compound assignment on an element is outside the subset |
| lint/lint.mjs:1157 | lint-refuse | dynamic-key | keys | one-decider | a dictionary key is a string |
| lint/lint.mjs:1160 | lint-refuse | index-assign | mutation | one-decider | write a record field by name, or use a local Record<string, T> dictionary |
| lint/lint.mjs:1161 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | assignment target |
| lint/lint.mjs:1164 | lint-refuse | division | numbers | one-decider | compound division is outside the subset |
| lint/lint.mjs:1165 | lint-refuse | unsupported-operator | mutation | one-decider | assignment operator is outside the subset |
| lint/lint.mjs:1168 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | literal method fields are immutable; use a class for mutable receiver state |
| lint/lint.mjs:1168 | lint-refuse | receiver-mutation | mutation | shared (receiverRecordPath) | a receiver path needs nonoptional data records |
| lint/lint.mjs:1168 | lint-refuse | receiver-write | mutation | shared (thisParamPath) | <RECEIVER_WRITE> |
| lint/lint.mjs:1172 | lint-refuse | property-assign | mutation | one-decider | update of a field of `${}`, which this function does not own |
| lint/lint.mjs:1173 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | increment of a non-name |
| lint/lint.mjs:1176 | lint-refuse | global-mutation | mutation | shared (moduleState) | update of `${}`, which this function does not own |
| lint/lint.mjs:1177 | lint-refuse | render-impure | react | shared (moduleState) | a render function updates `${}`, a variable outside it; move the write into an event handler or an e |
| lint/lint.mjs:1178 | lint-refuse | param-assign | mutation | exception:mutation-admission-vs-value-output (moduleState) | <why> |
| lint/lint.mjs:1179 | lint-refuse | closure-mutation | mutation | shared (moduleState) | a callback cannot change an outer variable |
| lint/lint.mjs:1194 | lint-refuse | assign-target | record-copy | one-decider | `Object.assign` copies every own key of its source, and a value of a record type may carry keys its  |
| lint/lint.mjs:1209 | lint-refuse | alias-mutation | mutation | one-decider | <aliasMsg(r.text, declOf(r).decl)> |
| lint/lint.mjs:1216 | lint-refuse | opaque-mutation | mutation | one-decider | .${}() as a statement on an opaque value may mutate it; name the receiver first |
| lint/lint.mjs:1222 | lint-refuse | receiver-write | mutation | shared (thisParamPath) | <RECEIVER_WRITE> |
| lint/lint.mjs:1223 | lint-refuse | alias-mutation | mutation | one-decider | <aliasMsg(pr.text, declOf(pr).decl)> |
| lint/lint.mjs:1226 | lint-refuse | param-mutation | mutation | shared (bucketMaps, thisParamPath) | ${} on `${}`, which is not a local array${} |
| lint/lint.mjs:1231 | lint-refuse | param-mutation | mutation | shared (thisParamPath) | ${} on `${}`, which is not a local array |
| lint/lint.mjs:1232 | lint-refuse | unsupported-call | library | one-decider | pop takes no argument |
| lint/lint.mjs:1233 | lint-refuse | unsupported-call | library | one-decider | sort as a statement needs one comparator, an arrow of two parameters; with the default order write ` |
| lint/lint.mjs:1234 | lint-refuse | unsupported-call | library | one-decider | ${} takes no argument |
| lint/lint.mjs:1235 | lint-refuse | unsupported-call | library | one-decider | splice as a statement needs a start, a count and plain items |
| lint/lint.mjs:1238 | lint-refuse | param-mutation | mutation | shared (thisParamPath) | set mutation on a non-local |
| lint/lint.mjs:1239 | lint-refuse | param-mutation | mutation | shared (thisParamPath) | map mutation on a non-local |
| lint/lint.mjs:1243 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | only assignments, ++/--, calls, and await may stand as statements |
| lint/lint.mjs:1250 | lint-refuse | var | declarations | shared (countedFor) | `var` is outside the subset; use let or const |
| lint/lint.mjs:1306 | lint-refuse | promise-handler | promises | shared (namedPromiseHandler) | <named.message> |
| lint/lint.mjs:1306 | lint-refuse | promise-thenable | promises | shared (namedPromiseHandler) | <named.message> |
| lint/lint.mjs:1308 | lint-refuse | promise-handler | promises | shared (namedPromiseHandler) | inline a handler that mutates so its state is visible |
| lint/lint.mjs:1312 | lint-refuse | promise-handler | promises | one-decider | use an arrow with plain parameters |
| lint/lint.mjs:1321 | lint-refuse | promise-handler | promises | one-decider | inline a same-file call that throws or mutates so its fault and state are visible |
| lint/lint.mjs:1322 | lint-refuse | promise-handler | promises | lowering (inlinePromiseStatementKind) | use declarations, conditionals, calls, return and throw in an inline promise body |
| lint/lint.mjs:1329 | lint-refuse | promise-thenable | promises | one-decider | use a plain value or a statically typed native Promise; custom thenable adoption is not read |
| lint/lint.mjs:1333 | lint-refuse | promise-pending | promises | shared (promiseConsumed) | await or return the promise directly; a dangling or stored continuation leaves observable pending wo |
| lint/lint.mjs:1336 | lint-refuse | promise-executor | promises | shared (executorShape) | <shape.message> |
| lint/lint.mjs:1336 | lint-refuse | promise-executor-escape | promises | shared (executorShape) | <shape.message> |
| lint/lint.mjs:1336 | lint-refuse | promise-unsettled | promises | shared (executorShape) | <shape.message> |
| lint/lint.mjs:1340 | lint-refuse | promise-executor | promises | shared (executorShape) | a callback bridge must call an outside API |
| lint/lint.mjs:1347 | lint-refuse | promise-handler | promises | one-decider | Promise.resolve and Promise.reject take at most one value |
| lint/lint.mjs:1351 | lint-refuse | promise-handler | promises | one-decider | use one explicit handler per link; use catch for rejection |
| lint/lint.mjs:1357 | lint-refuse | async | promises | one-decider | `await` outside an async function |
| lint/lint.mjs:1371 | lint-refuse | async | promises | one-decider | awaited callee form is outside the subset |
| lint/lint.mjs:1375 | lint-refuse | string-code-unit | strings | lowering (LONE_SURROGATE_WHY, loneSurrogate) | <LONE_SURROGATE_WHY> |
| lint/lint.mjs:1386 | lint-refuse | operator-value-context | operators-as-values | one-decider | move this value step into an explicit statement and conditional branch |
| lint/lint.mjs:1397 | lint-refuse | operator-value-context | operators-as-values | one-decider | write this mutating method call as a separate statement |
| lint/lint.mjs:1406 | lint-refuse | update-expression | operators-as-values | one-decider | increment a numeric local or numeric field |
| lint/lint.mjs:1406 | lint-refuse | assignment-expression | operators-as-values | one-decider | increment a numeric local or numeric field |
| lint/lint.mjs:1407 | lint-refuse | update-expression | operators-as-values | lowering (valueAssignmentWhy) | <valueAssignmentWhy(e.operatorToken.kind)> |
| lint/lint.mjs:1407 | lint-refuse | assignment-expression | operators-as-values | lowering (valueAssignmentWhy) | <valueAssignmentWhy(e.operatorToken.kind)> |
| lint/lint.mjs:1408 | lint-refuse | update-expression | operators-as-values | one-decider | use numeric compound assignment or string += with a string value |
| lint/lint.mjs:1408 | lint-refuse | assignment-expression | operators-as-values | one-decider | use numeric compound assignment or string += with a string value |
| lint/lint.mjs:1427 | lint-refuse | operator-value-context | operators-as-values | one-decider | keep the target root unchanged while evaluating the assignment reference and right side |
| lint/lint.mjs:1432 | lint-refuse | operator-value-context | operators-as-values | one-decider | keep the target root unchanged while evaluating an enclosing assignment |
| lint/lint.mjs:1438 | lint-refuse | update-expression | operators-as-values | one-decider | narrow optional paths before assigning |
| lint/lint.mjs:1438 | lint-refuse | assignment-expression | operators-as-values | one-decider | narrow optional paths before assigning |
| lint/lint.mjs:1446 | lint-refuse | type-assertion | type-assertion | shared (typeAssertion) | <why> |
| lint/lint.mjs:1447 | lint-refuse | update-expression | operators-as-values | shared (erasedReferenceSlot) | <er.message> |
| lint/lint.mjs:1447 | lint-refuse | assignment-expression | operators-as-values | shared (erasedReferenceSlot) | <er.message> |
| lint/lint.mjs:1456 | lint-refuse | template | tagged-template | one-decider | the tag must be a name |
| lint/lint.mjs:1457 | lint-refuse | template | tagged-template | shared (rawTag) | an invalid escape under a tag: its cooked part is undefined, which the reading of the strings does n |
| lint/lint.mjs:1470 | lint-refuse | non-null-assertion | non-null-assertion | shared (payloadRead, payloadStatement) | `x!` on a value that may be null or undefined checks nothing at run time, and here lean cannot test  |
| lint/lint.mjs:1476 | lint-refuse | bitwise | bitwise | one-decider | bitwise operands must be numbers; BigInt and opaque coercions need lane B |
| lint/lint.mjs:1478 | lint-refuse | unary-coercion | numbers | one-decider | unary + coerces; it is outside the subset |
| lint/lint.mjs:1484 | lint-refuse | delete | mutation | one-decider | `delete` is a statement, not a value |
| lint/lint.mjs:1485 | lint-refuse | receiver-write | mutation | one-decider | <RECEIVER_WRITE> |
| lint/lint.mjs:1485 | lint-refuse | delete | mutation | one-decider | delete on `${}`, which this function does not own |
| lint/lint.mjs:1485 | lint-refuse | alias-mutation | mutation | one-decider | <aliasMsg(root.text, o.decl, false)> |
| lint/lint.mjs:1485 | lint-refuse | dynamic-key | keys | one-decider | a dictionary key is a string |
| lint/lint.mjs:1486 | lint-refuse | delete | mutation | one-decider | delete of a field of this is outside the subset; assign undefined |
| lint/lint.mjs:1486 | lint-refuse | delete | mutation | one-decider | delete on `${}`, which this function does not own |
| lint/lint.mjs:1486 | lint-refuse | alias-mutation | mutation | one-decider | <aliasMsg(root.text, o.decl, false)> |
| lint/lint.mjs:1487 | lint-refuse | delete | mutation | one-decider | delete of this target is outside the subset |
| lint/lint.mjs:1489 | lint-refuse | void | unread-syntax | one-decider | `void` is outside the subset |
| lint/lint.mjs:1493 | lint-refuse | generator-use | generators | one-decider | yield is a statement; sent values need a step reading |
| lint/lint.mjs:1494 | lint-refuse | this | classes | exception:receiver-scope-vs-self-type | `this` outside a class method; a free function declares its receiver as a `this` parameter |
| lint/lint.mjs:1495 | lint-refuse | class | classes | one-decider | `super` is read only as `super.m(...)` or `super(...)` in a constructor, a call of the parent's meth |
| lint/lint.mjs:1496 | lint-refuse | class | classes | one-decider | classes are outside the subset |
| lint/lint.mjs:1500 | lint-refuse | unsupported-call | library | one-decider | new ${}(...) reads an array, a Map, a Set or one of their iterators; build the entries as an array f |
| lint/lint.mjs:1502 | lint-refuse | dynamic-eval | names | one-decider | `new Function` is outside the subset |
| lint/lint.mjs:1504 | lint-refuse | async | promises | shared (promiseForm) | `new Promise` inside an opaque promise call has no reading |
| lint/lint.mjs:1507 | lint-refuse | dynamic-eval | names | one-decider | `new ${}` is outside the subset |
| lint/lint.mjs:1507 | lint-refuse | prototype | prototype | one-decider | `new ${}` is outside the subset |
| lint/lint.mjs:1515 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | `new.target` reads how the function was called; it is outside the subset |
| lint/lint.mjs:1517 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | `import.meta.env` is injected at build time; read it outside the subset |
| lint/lint.mjs:1523 | lint-refuse | spread | arrays | shared (generatorReading) | spread works on arrays, sets, maps and their keys(), values() and entries() |
| lint/lint.mjs:1524 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | array holes are outside the subset |
| lint/lint.mjs:1529 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | literal getters need fixed named fields; use a class for spread or computed accessors |
| lint/lint.mjs:1530 | lint-refuse | spread-source | record-copy | shared (spreadReadWhy) | <why> |
| lint/lint.mjs:1532 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | spreading a method object rebinds its receiver and evaluates getters; copy data fields explicitly |
| lint/lint.mjs:1532 | lint-refuse | spread-source | record-copy | shared (copySource) | `{ ...${} }` copies every own key: ${} (escape spread_source) |
| lint/lint.mjs:1535 | lint-refuse | prototype | prototype | shared (literalProtoMember) | `__proto__:` in a literal sets the object's prototype, not a key; the value reading has only plain o |
| lint/lint.mjs:1539 | lint-refuse | dynamic-key | keys | one-decider | <why> |
| lint/lint.mjs:1544 | lint-refuse | iterator-protocol | object-literal-methods | one-decider | custom iterator protocol methods need a step reading; use a generator or an array |
| lint/lint.mjs:1551 | lint-refuse | closure-mutation | mutation | one-decider | a literal method cannot change a captured binding; use a class for shared state |
| lint/lint.mjs:1558 | lint-refuse | object-method-capture | object-literal-methods | one-decider | a literal method needs stable captured bindings; use a class for shared changing state |
| lint/lint.mjs:1567 | lint-refuse | object-method-capture | object-literal-methods | one-decider | a literal method captures an unchanging value; copy mutable data before capturing it |
| lint/lint.mjs:1571 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | literal setters and computed methods need a class accessor or a named method |
| lint/lint.mjs:1574 | lint-refuse | spread | arrays | one-decider | spread is allowed in array and record literals only |
| lint/lint.mjs:1576 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | expression ${} is outside the subset |
| lint/lint.mjs:1584 | lint-refuse | prototype | prototype | shared (plainObjectTest) | <po.refuse> |
| lint/lint.mjs:1588 | lint-refuse | division | numbers | one-decider | `/` on numbers is real division; write Math.floor(a / b) for integer division |
| lint/lint.mjs:1593 | lint-refuse | bitwise | bitwise | one-decider | bitwise operands must be numbers; BigInt and opaque coercions need lane B |
| lint/lint.mjs:1601 | lint-refuse | loose-equality | equality | one-decider | use === and !== with an object, bigint or symbol operand; between primitives == follows the coercion |
| lint/lint.mjs:1605 | lint-refuse | instanceof-constructor | instanceof | one-decider | use a named ordinary constructor for instanceof; dynamic constructors may run effects |
| lint/lint.mjs:1608 | lint-refuse | instanceof-constructor | instanceof | one-decider | use a class declaration for instanceof; a constructor value needs a runtime identity |
| lint/lint.mjs:1615 | lint-refuse | instanceof-constructor | instanceof | one-decider | a custom Symbol.hasInstance may run effects; use an ordinary constructor |
| lint/lint.mjs:1620 | lint-refuse | prototype | prototype | shared (inPrototypeReach) | this file makes an object whose prototype is not Object.prototype (line ${}), and ${}; `in` reads th |
| lint/lint.mjs:1621 | lint-refuse | dynamic-key | keys | shared (openRecordIn) | <why> |
| lint/lint.mjs:1625 | lint-refuse | bitwise | bitwise | one-decider | bitwise and shift operators are outside the subset |
| lint/lint.mjs:1631 | lint-refuse | mixed-types | equality | one-decider | + adds two numbers or joins to a string |
| lint/lint.mjs:1633 | lint-refuse | string-order | strings | one-decider | compare two strings, or convert both operands explicitly |
| lint/lint.mjs:1644 | lint-refuse | mixed-types | equality | one-decider | a value that is sometimes a primitive and sometimes a record or array compares with === only against |
| lint/lint.mjs:1645 | lint-refuse | reference-equality | equality | one-decider | === on arrays and records compares references; compare fields |
| lint/lint.mjs:1656 | lint-refuse | generator-bound | generators | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:1656 | lint-refuse | generator-effect | generators | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:1656 | lint-refuse | generator-use | generators | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:1658 | lint-refuse | hook-order | react | shared (reactHook) | a hook is called under a branch, a loop, a nested function or after an early return; hooks run at th |
| lint/lint.mjs:1665 | lint-refuse | prototype | prototype | shared (ownKeyTest) | <ok.refuse> |
| lint/lint.mjs:1666 | lint-refuse | optional-chain | optional-chain | exception:optional-source-vs-emitted-callee (optionalCallShape) | <shape.why> |
| lint/lint.mjs:1673 | lint-refuse | unsupported-call | calls | one-decider | ${} takes ${} arguments |
| lint/lint.mjs:1674 | lint-refuse | generator-use | generators | one-decider | consume a pure generator directly in for-of, spread, Array.from or yield* |
| lint/lint.mjs:1675 | lint-refuse | async | promises | shared (promiseConsumed) | an async unit is called without await |
| lint/lint.mjs:1677 | lint-refuse | spread | arrays | one-decider | a spread argument goes to a rest parameter, as the last argument |
| lint/lint.mjs:1677 | lint-refuse | function-value | calls | one-decider | a same-file function takes values, not callbacks |
| lint/lint.mjs:1684 | lint-refuse | this | classes | one-decider | `this` outside a class method |
| lint/lint.mjs:1686 | lint-refuse | bound-function | calls | one-decider | `bind` fixes a receiver for a later call; call the function with its receiver instead |
| lint/lint.mjs:1687 | lint-refuse | unsupported-call | calls | one-decider | `call` and `apply` take the receiver first |
| lint/lint.mjs:1688 | lint-refuse | unsupported-call | calls | one-decider | `apply` takes its arguments as one array literal |
| lint/lint.mjs:1695 | lint-refuse | math-empty | library | lowering (nonemptyMathArgs) | Math.min/max need a nonempty list; use xs.length > 0 ? Math.max(...xs) : a fallback |
| lint/lint.mjs:1696 | lint-refuse | spread | arrays | one-decider | Math sequence arguments must be numbers; narrow opaque values before spreading |
| lint/lint.mjs:1706 | lint-refuse | unsupported-call | calls | one-decider | ${}.${} takes ${} arguments |
| lint/lint.mjs:1707 | lint-refuse | generator-use | generators | one-decider | consume a static generator through a top-level generator function |
| lint/lint.mjs:1708 | lint-refuse | async | promises | shared (promiseConsumed) | an async unit is called without await |
| lint/lint.mjs:1715 | lint-refuse | opaque-mutation | mutation | one-decider | .${}() on `${}`, an opaque value${}, used as a value: the call may mutate it |
| lint/lint.mjs:1715 | lint-refuse | param-mutation | mutation | one-decider | .${}() on `${}`, an opaque value${}, used as a value: the call may mutate it |
| lint/lint.mjs:1724 | lint-refuse | async-predicate | callbacks | one-decider | ${} does not await its predicate: a Promise is truthy even when it resolves false; await values with |
| lint/lint.mjs:1725 | lint-refuse | async-reduce | callbacks | one-decider | reduce passes a Promise accumulator without waiting; use a for-of loop with await |
| lint/lint.mjs:1726 | lint-refuse | async-callback | callbacks | one-decider | ${} does not await its callbacks; use await Promise.all(xs.${}(...)) |
| lint/lint.mjs:1727 | lint-refuse | callback-form | callbacks | one-decider | a callback thisArg is outside the subset; capture the receiver in an arrow |
| lint/lint.mjs:1730 | lint-refuse | callback-result | callbacks | one-decider | an effectful type-predicate callback needs an explicit for-of loop with a type guard |
| lint/lint.mjs:1731 | lint-refuse | callback-result | callbacks | one-decider | a thenable callback needs an async arrow with an explicit await |
| lint/lint.mjs:1732 | lint-refuse | callback-result | callbacks | one-decider | an effectful flatMap callback returns either arrays on every path or scalar values on every path; us |
| lint/lint.mjs:1735 | lint-refuse | callback-form | callbacks | one-decider | an effectful array callback takes the element (and an index), or the accumulator and the element; an |
| lint/lint.mjs:1737 | lint-refuse | callback-form | callbacks | one-decider | <bad> |
| lint/lint.mjs:1739 | lint-refuse | promise-all-order | promises | one-decider | Promise.all does not order work after await; use a for-of loop with await for ordered effects |
| lint/lint.mjs:1742 | lint-refuse | callback-form | callbacks | one-decider | Promise.all callback loops take one element name and an optional index name |
| lint/lint.mjs:1756 | lint-refuse | foreach | callbacks | one-decider | forEach does not wait for an async callback: the function returns before the steps finish; write `fo |
| lint/lint.mjs:1763 | lint-refuse | foreach | callbacks | one-decider | forEach is read as a statement; put it in a block before returning a value |
| lint/lint.mjs:1770 | lint-refuse | foreach | callbacks | one-decider | forEach runs a callback for its effects; write `for (const x of xs)` so the state comes out of the l |
| lint/lint.mjs:1774 | lint-refuse | in-place-mutation | library | one-decider | ${} changes `${}` in place; write `${} = [...${}].${}(...)` |
| lint/lint.mjs:1774 | lint-refuse | param-mutation | mutation | one-decider | ${} changes `${}` in place; write `${} = [...${}].${}(...)` |
| lint/lint.mjs:1777 | lint-refuse | param-mutation | mutation | one-decider | push is a statement on a local only |
| lint/lint.mjs:1781 | lint-refuse | unsupported-call | library | one-decider | ${} needs a callback |
| lint/lint.mjs:1786 | lint-refuse | unsupported-call | library | one-decider | reduce needs a callback and an initial value |
| lint/lint.mjs:1789 | lint-refuse | function-value | calls | one-decider | unexpected callback |
| lint/lint.mjs:1793 | lint-refuse | unsupported-call | library | one-decider | Set.forEach is outside the subset; write for (const x of s) |
| lint/lint.mjs:1793 | lint-refuse | collection-iterator | library | one-decider | s.${}() is an iterator its first read uses up; spread it, loop over it with for-of or pass it to Arr |
| lint/lint.mjs:1794 | lint-refuse | unsupported-call | library | one-decider | Map.forEach is outside the subset; write for (const [k, v] of m) |
| lint/lint.mjs:1794 | lint-refuse | collection-iterator | library | one-decider | m.${}() is an iterator its first read uses up; spread it, loop over it with for-of or pass it to Arr |
| lint/lint.mjs:1801 | lint-refuse | unsupported-call | library | one-decider | .toString() on ${} reads Object.prototype.toString or the object's own toString, a prototype this un |
| lint/lint.mjs:1802 | lint-refuse | unsupported-call | library | one-decider | method .${}() on ${} is outside the subset; narrow the union with typeof or Array.isArray first so t |
| lint/lint.mjs:1803 | lint-refuse | unsupported-call | calls | one-decider | method .${}() on ${} is outside the subset |
| lint/lint.mjs:1807 | lint-refuse | unsupported-call | calls | one-decider | calls through computed callees are outside the subset |
| lint/lint.mjs:1816 | lint-refuse | update-expression | operators-as-values | one-decider | <msg> |
| lint/lint.mjs:1816 | lint-refuse | assignment-expression | operators-as-values | one-decider | <msg> |
| lint/lint.mjs:1819 | lint-refuse | unsupported-call | library | shared (ARRAY_VALUE_MUTATORS) | splice as a value takes plain arguments |
| lint/lint.mjs:1820 | lint-refuse | unsupported-call | library | shared (ARRAY_VALUE_MUTATORS) | .${}() in an optional chain changes a receiver that may be absent; check it first |
| lint/lint.mjs:1824 | lint-refuse | unsupported-call | library | shared (ARRAY_VALUE_MUTATORS) | .${}() as a value changes `${}`; call it on a local array or on a fresh one |
| lint/lint.mjs:1825 | lint-refuse | param-mutation | mutation | shared (ARRAY_VALUE_MUTATORS) | .${}() as a value changes the parameter `${}`; copy it to a local first |
| lint/lint.mjs:1826 | lint-refuse | alias-mutation | mutation | shared (ARRAY_VALUE_MUTATORS) | `${}` is another name for a value this function was handed; copy it first |
| lint/lint.mjs:1827 | lint-refuse | closure-mutation | mutation | shared (ARRAY_VALUE_MUTATORS) | .${}() as a value inside a callback changes `${}`; use a for-of loop |
| lint/lint.mjs:1829 | lint-refuse | mutator-value | library | shared (ARRAY_VALUE_MUTATORS) | .${}() as a value runs only on some paths here (a condition, a short circuit, a loop header); bind i |
| lint/lint.mjs:1830 | lint-refuse | mutator-value | library | shared (ARRAY_VALUE_MUTATORS) | `${}` is read again in the statement that calls .${}() on it; read it in its own statement |
| lint/lint.mjs:1834 | lint-refuse | unsupported-call | library | one-decider | fill takes a value and an optional start and end |
| lint/lint.mjs:1835 | lint-refuse | in-place-mutation | library | shared (freshArray) | fill changes its receiver in place and returns it; fill a fresh array (`new Array(n).fill(v)`, `[... |
| lint/lint.mjs:1839 | lint-refuse | unsupported-call | library | one-decider | toReversed takes no argument |
| lint/lint.mjs:1840 | lint-refuse | unsupported-call | library | one-decider | toSorted takes one comparator |
| lint/lint.mjs:1841 | lint-refuse | callback-form | callbacks | one-decider | the comparator of toSorted is a pure function of two elements |
| lint/lint.mjs:1846 | lint-refuse | unsupported-call | library | one-decider | ${} takes one callback |
| lint/lint.mjs:1847 | lint-refuse | callback-form | callbacks | one-decider | the callback of ${} takes the element only (an index counts from the end); use a for loop over the i |
| lint/lint.mjs:1848 | lint-refuse | callback-form | callbacks | one-decider | the callback of ${} is a pure predicate; an effect needs a for loop |
| lint/lint.mjs:1852 | lint-refuse | unsupported-call | library | one-decider | lastIndexOf takes one value (a start index stays out) |
| lint/lint.mjs:1854 | lint-refuse | unsupported-call | library | one-decider | lastIndexOf compares by identity; on objects it is outside the subset |
| lint/lint.mjs:1857 | lint-refuse | unsupported-call | library | one-decider | toString on an array takes no argument |
| lint/lint.mjs:1858 | lint-refuse | unsupported-call | library | shared (primitiveText) | toString with a radix is read on numbers only |
| lint/lint.mjs:1862 | lint-refuse | unsupported-call | library | shared (LOCALE_READS) | .${}() reads the host's locale (a world read); call it in a map, filter, find, findIndex, some, ever |
| lint/lint.mjs:1863 | lint-refuse | unsupported-call | library | shared (LOCALE_READS) | .${}() takes plain arguments |
| lint/lint.mjs:1866 | lint-refuse | unsupported-call | library | one-decider | substr takes a numeric start and an optional numeric length |
| lint/lint.mjs:1869 | lint-refuse | unsupported-call | library | one-decider | matchAll takes one pattern |
| lint/lint.mjs:1870 | lint-refuse | unsupported-call | library | one-decider | matchAll needs the g flag; without it the call throws a TypeError |
| lint/lint.mjs:1873 | lint-refuse | unsupported-call | library | one-decider | matchAll needs the g flag (and not y); without it the call throws a TypeError |
| lint/lint.mjs:1875 | lint-refuse | unsupported-call | library | one-decider | matchAll starts at its pattern's lastIndex, which another call may have moved; pass a regular expres |
| lint/lint.mjs:1877 | lint-refuse | unsupported-call | library | one-decider | search takes one pattern |
| lint/lint.mjs:1889 | lint-refuse | callback-form | callbacks | one-decider | ${} is read as a callback only through an arrow; write `(x) => ${}(x)` with the arguments it reads |
| lint/lint.mjs:1890 | lint-refuse | callback-form | callbacks | one-decider | ${} as a callback is read for map${}; write an inline arrow for ${} |
| lint/lint.mjs:1894 | lint-refuse | async-callback | callbacks | one-decider | Promise.all over the named async function `${}` needs an inline async arrow so its awaits are read i |
| lint/lint.mjs:1900 | lint-refuse | callback-form | callbacks | one-decider | a class method passed as a callback loses its receiver; write an inline arrow |
| lint/lint.mjs:1901 | lint-refuse | async | promises | one-decider | an async function cannot be a callback |
| lint/lint.mjs:1902 | lint-refuse | callback-form | callbacks | one-decider | a generator passed as a callback returns its iterator; write an inline arrow |
| lint/lint.mjs:1903 | lint-refuse | callback-form | callbacks | one-decider | `${}` is generic; pass it through an inline arrow so its type arguments are fixed |
| lint/lint.mjs:1904 | lint-refuse | callback-form | callbacks | one-decider | a named effectful callback takes plain parameters, at most ${} (what ${} passes); write an inline ar |
| lint/lint.mjs:1905 | lint-refuse | callback-form | callbacks | one-decider | `${}` changes its argument, which here is the array's element; write an inline arrow that copies it |
| lint/lint.mjs:1909 | lint-refuse | callback-form | callbacks | one-decider | a named effectful callback takes plain parameters, at most ${} (what ${} passes); write an inline ar |
| lint/lint.mjs:1910 | lint-refuse | callback-form | callbacks | one-decider | an effectful array callback needs an inline arrow so its world transitions are read in array order |
| lint/lint.mjs:1912 | lint-refuse | callback-result | callbacks | one-decider | an effectful type-predicate callback needs an explicit for-of loop with a type guard |
| lint/lint.mjs:1913 | lint-refuse | callback-result | callbacks | one-decider | an effectful flatMap callback returns either arrays on every path or scalar values on every path; us |
| lint/lint.mjs:1915 | lint-refuse | unsupported-call | library | one-decider | reduce needs a callback and an initial value |
| lint/lint.mjs:2030 | lint-refuse | callback-control | exceptions | shared (syncLoopCallback) | try, throw or a return from an inner loop in a callback needs an explicit for-of loop |
| lint/lint.mjs:2040 | lint-refuse | callback-form | callbacks | one-decider | a class method cannot be passed as a callback |
| lint/lint.mjs:2040 | lint-refuse | async | promises | one-decider | an async function cannot be a callback |
| lint/lint.mjs:2040 | lint-refuse | callback-form | callbacks | one-decider | the callback takes at most ${} plain parameter(s) |
| lint/lint.mjs:2042 | lint-refuse | callback-form | callbacks | one-decider | a callback is an arrow function, a same-file function or a local function value |
| lint/lint.mjs:2044 | lint-refuse | callback-form | callbacks | one-decider | the callback must be an arrow function |
| lint/lint.mjs:2046 | lint-refuse | async | promises | one-decider | async callbacks are outside the subset |
| lint/lint.mjs:2047 | lint-refuse | callback-form | callbacks | one-decider | the callback takes at most ${} plain parameter(s); a default is read only where the parameter's type |
| lint/lint.mjs:2078 | lint-refuse | react-handler-capture | react | shared (arrowOf) | a React closure captures a changing local; capture a const value or use a state setter |
| lint/lint.mjs:2086 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | a local component value must be a string tag name or a named component |
| lint/lint.mjs:2087 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | tag form ${} is outside the subset |
| lint/lint.mjs:2092 | lint-refuse | callback-form | callbacks | one-decider | a handler is an arrow function |
| lint/lint.mjs:2103 | lint-refuse | spread | arrays | one-decider | spread arguments need an ordinary array or a fixed tuple; open tuples and custom iterables are outsi |
| lint/lint.mjs:2113 | lint-refuse | spread | arrays | one-decider | bind same-file call arguments inside an if statement before spreading; conditional expressions do no |
| lint/lint.mjs:2127 | lint-refuse | spread | arrays | one-decider | spread arguments need an outside callee or a supported sequence operation |
| lint/lint.mjs:2132 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | call a literal method on its object; detached methods need an explicit receiver |
| lint/lint.mjs:2136 | lint-refuse | prototype | prototype | one-decider | `this.constructor` is the run-time class of the receiver, a subclass too; name the class to read its |
| lint/lint.mjs:2139 | lint-refuse | prototype | prototype | one-decider | `.${}` reaches the prototype chain |
| lint/lint.mjs:2140 | lint-refuse | global-read | names | one-decider | `${}` is a static method used as a value; call it, or pass an arrow that calls it |
| lint/lint.mjs:2154 | lint-refuse | unsupported-member | members | shared (matchGroupRead) | group `${}` may not take part in a match (undefined when it does not, whatever TypeScript says) and  |
| lint/lint.mjs:2156 | lint-refuse | unsupported-member | members | shared (matchGroupsDestructure) | group `${}` may not take part in a match (undefined when it does not, whatever TypeScript says) and  |
| lint/lint.mjs:2163 | lint-refuse | unsupported-member | members | one-decider | property .${} on ${}: constrain the type parameter to one record declaring it |
| lint/lint.mjs:2166 | lint-refuse | unsupported-member | members | one-decider | `.${}` called through apply or call is not the direct call here: ${}; call it on the array: `a.${}(. |
| lint/lint.mjs:2167 | lint-refuse | unsupported-member | members | one-decider | <memberRow(name === 'index' ? 'match-index' : 'match-groups')> |
| lint/lint.mjs:2168 | lint-refuse | unsupported-member | members | one-decider | property .${} on ${} is outside the subset |
| lint/lint.mjs:2170 | lint-refuse | dynamic-key | keys | shared (OPEN_RECORD_WHY, openRecordReadWhy, openRecordType) | <w.why> |
| lint/lint.mjs:2170 | lint-refuse | prototype | prototype | shared (OPEN_RECORD_WHY, openRecordReadWhy, openRecordType) | <w.why> |
| lint/lint.mjs:2171 | lint-refuse | unsupported-member | members | one-decider | property .${} is not declared on ${} |
| lint/lint.mjs:2202 | lint-refuse | arguments | names | one-decider | `arguments` is the actual argument vector, not the declared one; name the parameter, or declare a re |
| lint/lint.mjs:2205 | lint-refuse | unsupported-member | members | shared (matchCapture) | ${} |
| lint/lint.mjs:2205 | lint-refuse | unsupported-member | members | shared (matchCapture) | ${} |
| lint/lint.mjs:2206 | lint-refuse | unsupported-member | members | shared (matchGroupRead) | group `${}` may not take part in a match (undefined when it does not, whatever TypeScript says) and  |
| lint/lint.mjs:2213 | lint-refuse | prototype | prototype | one-decider | this bracket key reaches the prototype chain; read a declared data field |
| lint/lint.mjs:2221 | lint-refuse | dynamic-key | keys | one-decider | narrow the record receiver before indexing it |
| lint/lint.mjs:2227 | lint-refuse | dynamic-key | keys | shared (OPEN_RECORD_WHY, openRecordReadWhy, openRecordType) | <w.why> |
| lint/lint.mjs:2227 | lint-refuse | prototype | prototype | shared (OPEN_RECORD_WHY, openRecordReadWhy, openRecordType) | <w.why> |
| lint/lint.mjs:2227 | lint-refuse | dynamic-key | keys | shared (openRecordType) | bind the computed key before reading the record; a key call may mutate its receiver |
| lint/lint.mjs:2228 | lint-refuse | dynamic-key | keys | one-decider | <why> |
| lint/lint.mjs:2232 | lint-refuse | dynamic-key | keys | one-decider | bind the computed key before reading the record; a key call may mutate its receiver |
| lint/lint.mjs:2233 | lint-refuse | dynamic-key | keys | one-decider | read a literal getter by its declared property name |
| lint/lint.mjs:2235 | lint-refuse | dynamic-key | keys | shared (openRecordReadWhy, openRecordType) | <w.why> |
| lint/lint.mjs:2235 | lint-refuse | prototype | prototype | shared (openRecordReadWhy, openRecordType) | <w.why> |
| lint/lint.mjs:2236 | lint-refuse | dynamic-key | keys | shared (OPEN_RECORD_WHY, openRecordType) | <INDEX_WHY> |
| lint/lint.mjs:2237 | lint-refuse | dynamic-key | keys | one-decider | key ${} is not declared on ${} |
| lint/lint.mjs:2238 | lint-refuse | dynamic-key | keys | one-decider | call a method by its declared name; computed record reads select data fields |
| lint/lint.mjs:2242 | lint-refuse | dynamic-key | keys | one-decider | index an array or string by a number, or a record by declared string keys |
| lint/lint.mjs:2252 | lint-refuse | promise | promises | one-decider | a Promise-returning function must return a promise or be async |
| lint/lint.mjs:2254 | lint-refuse | promise | promises | one-decider | a promise built with new Promise is not a handle; make the function async |
| lint/lint.mjs:2258 | lint-refuse | promise | promises | one-decider | a same-file async function runs on after its first await; return it from an async function with awai |
| lint/lint.mjs:2259 | lint-refuse | promise | promises | one-decider | a promise read out of a collection has no identity in the reading; return the call that made it |
| lint/lint.mjs:2264 | lint-refuse | promise | promises | one-decider | a held promise of this result type has no identity in the reading; return the call itself |
| lint/lint.mjs:2267 | lint-refuse | promise | promises | one-decider | return the promise from a call, a name or a conditional, or make the function async |
| lint/lint.mjs:2288 | lint-refuse | this-param | classes | shared (untypedThisParam) | <why> |
| lint/lint.mjs:2289 | lint-refuse | untyped-js | types | shared (untypedJsUnit) | <why> |
| lint/lint.mjs:2290 | lint-refuse | promise-executor | promises | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:2290 | lint-refuse | promise-executor-escape | promises | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:2290 | lint-refuse | promise-unsettled | promises | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:2291 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | function without a body |
| lint/lint.mjs:2298 | lint-refuse | param-form | declarations | one-decider | a rest parameter is an array |
| lint/lint.mjs:2316 | lint-refuse | untyped-js | types | shared (untypedJsUnit) | <why> |
| lint/lint.mjs:2317 | lint-refuse | promise-executor | promises | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:2317 | lint-refuse | promise-executor-escape | promises | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:2317 | lint-refuse | promise-unsettled | promises | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:2324 | lint-refuse | param-form | declarations | one-decider | a rest parameter is an array |
| lint/lint.mjs:2342 | lint-refuse | toplevel-state | module-state | one-decider | bind module state to a plain name |
| lint/lint.mjs:2343 | lint-refuse | toplevel-effect | module-state | one-decider | move the effectful module initializer into a function |
| lint/lint.mjs:2350 | lint-refuse | class | classes | one-decider | an anonymous class is outside the subset |
| lint/lint.mjs:2357 | lint-refuse | untyped-js | types | shared (untypedJsUnit) | <why> |
| lint/lint.mjs:2358 | lint-refuse | promise-executor | promises | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:2358 | lint-refuse | promise-executor-escape | promises | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:2358 | lint-refuse | promise-unsettled | promises | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:2365 | lint-refuse | param-form | declarations | one-decider | a rest parameter is an array |
| lint/lint.mjs:2379 | lint-refuse | toplevel-effect | module-state | one-decider | code at module level runs on import; it is outside the subset |
| lint/lint.mjs:2389 | lint-refuse | captured-mutable | callback-units | one-decider | captured binding `${}` may be written after this callback is created; capture a stable value |
| lint/lint.mjs:2391 | lint-refuse | untyped-js | types | shared (callbackUntypedJsUnit) | <why> |
| lint/lint.mjs:2392 | lint-refuse | promise-executor | promises | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:2392 | lint-refuse | promise-executor-escape | promises | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:2392 | lint-refuse | promise-unsettled | promises | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:2397 | lint-refuse | param-form | declarations | one-decider | a rest parameter is an array |
| lint/lint.mjs:2415 | lint-refuse | exception-binding | exceptions | one-decider | use a distinct name for a local that shadows a value read by finally |
| lint/lint.mjs:2420 | lint-refuse | exception-return | exceptions | one-decider | return a primitive or copy the value; finally can change the returned alias |
| lint/lint.mjs:2486 | lint-refuse | implicit-this | classes | one-decider | TS${}: `this` the function does not declare; declare the receiver as a `this` parameter |
| lint/lint.mjs:2496 | lint-refuse | unresolved-module | types | one-decider | TS${}: `import.meta.${}` is a host-defined property whose type the checkout's lib does not declare |
| lint/lint.mjs:2512 | lint-refuse | ts-strict | types | one-decider | TS${}: ${} (the value is read at Any: no fact of its type is used; narrow it to give the proof its t |
| lint/lint.mjs:2515 | lint-refuse | update-expression | operators-as-values | one-decider | <msg> |
| lint/lint.mjs:2515 | lint-refuse | assignment-expression | operators-as-values | one-decider | <msg> |
| lint/lint.mjs:2533 | lint-advice | nested-ternary | advice | advice | a branch contains another conditional expression; nested if statements preserve its evaluation order |
| lint/lint.mjs:2536 | lint-advice | inner-html | advice | advice | this HTML property receives a value that is not a literal; use textContent if the intent is plain te |
| lint/lint.mjs:2541 | lint-advice | inner-html | advice | advice | document.write parses HTML and changes the document; choose an element for textContent |
| lint/lint.mjs:2548 | lint-advice | promise-all-order | advice | advice | this loop awaits one call per element; Promise.all needs independent calls that commute in the world |
| lint/lint.mjs:2556 | lint-advice | foreach | advice | advice | forEach with an index is read as the loop over the positions; a counted for states the index and the |
| lint/lint.mjs:2592 | lint-refuse | any-type | advice | one-decider | any-type could not read this file: ${} |
| translate/translate.mjs:201 | translate-throw |  | proof-shape | one-decider | no top-level function named ${} in ${} |
| translate/translate.mjs:202 | translate-throw |  | proof-shape | one-decider | --fn is required unless --core is given |
| translate/translate.mjs:275 | translate-refuse |  | proof-shape | one-decider | no top-level function or class method named ${} |
| translate/translate.mjs:452 | translate-throw |  | translator-internal | one-decider | outside the subset: ${} |
| translate/translate.mjs:829 | translate-refuse |  | callbacks | one-decider | ${} has no call signature to read as a callback |
| translate/translate.mjs:863 | translate-refuse |  | callbacks | one-decider | ${} returns a promise; an async callback needs an inline arrow under Promise.all |
| translate/translate.mjs:867 | translate-refuse |  | calls | one-decider | callee ${} was not translated |
| translate/translate.mjs:868 | translate-refuse |  | callbacks | one-decider | ${} changes its argument; a callback's argument is the array's element |
| translate/translate.mjs:869 | translate-refuse |  | callbacks | one-decider | ${} is generic; pass it through an inline arrow |
| translate/translate.mjs:895 | translate-refuse |  | callbacks | one-decider | parseInt reads the index JavaScript passes as its radix |
| translate/translate.mjs:896 | translate-refuse |  | callbacks | one-decider | ${} has no reading as a callback |
| translate/translate.mjs:1051 | translate-refuse | property-assign | mutation | lowering (INSTALLS_FUNCTION_WHY, installsFunction) | property-assign: ${} |
| translate/translate.mjs:1188 | translate-refuse | this-param | classes | shared (untypedThisParam) | this-param: ${} |
| translate/translate.mjs:1189 | translate-refuse | this | classes | exception:receiver-scope-vs-self-type | this: `this` outside a class method; a free function declares its receiver as a `this` parameter |
| translate/translate.mjs:1243 | translate-refuse | internal | translator-internal | one-decider | internal: a static cell read in a pure unit |
| translate/translate.mjs:1469 | translate-refuse |  | types | one-decider | type parameter ${} is not one of this function's |
| translate/translate.mjs:1470 | translate-refuse |  | types | one-decider | type parameter ${} hides another of the same name |
| translate/translate.mjs:1490 | translate-refuse | builtin-type | types | one-decider | builtin-type: ${} needs a standard-library declaration and ${} type argument(s) for its collection r |
| translate/translate.mjs:1500 | translate-refuse |  | types | one-decider | array-like type ${} has no element type |
| translate/translate.mjs:1501 | translate-refuse | reference-key | types | one-decider | reference-key: a ${} by ${} compares by reference (SameValueZero); the value reading would equate tw |
| translate/translate.mjs:1518 | translate-refuse |  | types | one-decider | type ${} is not translatable |
| translate/translate.mjs:1792 | translate-refuse |  | types | one-decider | union type ${} is not translatable |
| translate/translate.mjs:1863 | translate-refuse |  | types | one-decider | a field named ${} or ${} is the open record's own slot |
| translate/translate.mjs:1908 | translate-refuse |  | translator-internal | one-decider | ${} reads or writes a metadata cell of the world in a unit not marked effectful |
| translate/translate.mjs:2065 | translate-refuse | promise-handler | promises | shared (namedPromiseHandler, promiseForm) |  |
| translate/translate.mjs:2065 | translate-refuse | promise-thenable | promises | shared (namedPromiseHandler, promiseForm) |  |
| translate/translate.mjs:2066 | translate-refuse |  | names | one-decider | ${} is a function value; call it |
| translate/translate.mjs:2270 | translate-refuse | copied-argument | mutation | one-decider | copied-argument: this call may write or keep the object it is handed, and its argument is ${}; bind  |
| translate/translate.mjs:2273 | translate-refuse | copied-argument | mutation | one-decider | copied-argument: a new object holding objects is handed to a call that may write or keep it, and ${} |
| translate/translate.mjs:2278 | translate-refuse | copied-argument | mutation | one-decider | copied-argument: a new object made in a loop is handed to a call that may keep it; every pass makes  |
| translate/translate.mjs:2287 | translate-refuse | internal | translator-internal | one-decider | internal: an effect in a unit not marked effectful (${}) |
| translate/translate.mjs:2354 | translate-refuse |  | arrays | one-decider | spread arguments need an ordinary array |
| translate/translate.mjs:2712 | translate-refuse |  | translator-internal | one-decider | no helper ${} |
| translate/translate.mjs:2725 | translate-refuse | number-special | numbers | lowering (numberSpecial) | number-special: a non-finite literal needs the opaque numeric reading |
| translate/translate.mjs:2727 | translate-refuse |  | numbers | one-decider | number literal ${} is not an integer; use --real |
| translate/translate.mjs:2753 | translate-refuse |  | promises | one-decider | a promise a same-file async unit returns, stored as a handle: the call reads its settled value, so n |
| translate/translate.mjs:2786 | translate-refuse | type-assertion | type-assertion | shared (typeAssertion) | type-assertion: ${} |
| translate/translate.mjs:2789 | translate-refuse |  | regex | one-decider | a capture of a group that may not take part (undefined when it does not, whatever TypeScript says) i |
| translate/translate.mjs:2837 | translate-refuse | string-code-unit | strings | lowering (loneSurrogate) | string-code-unit: ${} |
| translate/translate.mjs:2947 | translate-refuse | type-assertion | type-assertion | one-decider | type-assertion: a compound write other than +=, -=, *= to a local holding a value whose type nothing |
| translate/translate.mjs:2951 | translate-refuse |  | operators-as-values | one-decider | value updates need --core |
| translate/translate.mjs:2964 | translate-refuse |  | mutation | one-decider | assignment value needs a named array or dictionary |
| translate/translate.mjs:2971 | translate-refuse | assignment-expression | operators-as-values | lowering (valueAssignmentWhy) | assignment-expression: ${} |
| translate/translate.mjs:2996 | translate-refuse | prototype | prototype | shared (moduleState, protoKeyWrite) | prototype: a key that may be '__proto__' with an object or null value replaces the prototype |
| translate/translate.mjs:3014 | translate-refuse | update-expression | operators-as-values | shared (erasedReferenceSlot) |  |
| translate/translate.mjs:3014 | translate-refuse | assignment-expression | operators-as-values | shared (erasedReferenceSlot) |  |
| translate/translate.mjs:3048 | translate-refuse | internal | translator-internal | one-decider | internal: an effect in a conditional branch of a pure unit |
| translate/translate.mjs:3119 | translate-refuse | read-after-call | mutation | one-decider | read-after-call: `${}` is read after a call that may change it, and this reading holds the object un |
| translate/translate.mjs:3137 | translate-refuse |  | names | one-decider | ${} is a function value; call it |
| translate/translate.mjs:3147 | translate-refuse | definite-assignment | declarations | shared (payloadRead) | definite-assignment: a read TypeScript does not check, of a let that may be unassigned here |
| translate/translate.mjs:3203 | translate-refuse |  | classes | one-decider | `this` outside a class method |
| translate/translate.mjs:3226 | translate-refuse |  | tagged-template | one-decider | a tagged template whose raw parts the parser did not keep |
| translate/translate.mjs:3229 | translate-refuse |  | tagged-template | one-decider | a tagged template with an invalid escape (its cooked part is undefined, which a string sequence does |
| translate/translate.mjs:3236 | translate-refuse |  | tagged-template | one-decider | a tagged template whose tag is not a name or a member |
| translate/translate.mjs:3237 | translate-refuse |  | tagged-template | one-decider | a tagged template whose tag may write an object it is handed, read without the world |
| translate/translate.mjs:3238 | translate-refuse |  | tagged-template | one-decider | a tagged template whose tag is a method that may write its receiver, read without the world |
| translate/translate.mjs:3240 | translate-refuse |  | tagged-template | one-decider | a tagged template without the TemplateStringsArray type |
| translate/translate.mjs:3259 | translate-refuse | non-null-assertion | non-null-assertion | shared (payloadRead) | non-null-assertion: `x!` on a value that may be null or undefined, outside a statement lean tests fi |
| translate/translate.mjs:3262 | translate-refuse | non-null-assertion | non-null-assertion | shared (nonNullOnAbsent) | non-null-assertion: `x!` on a value that may be null or undefined |
| translate/translate.mjs:3278 | translate-refuse |  | names | one-decider | new.target is not translated |
| translate/translate.mjs:3301 | translate-refuse |  | unread-syntax | one-decider | expression ${} is not translated |
| translate/translate.mjs:3308 | translate-refuse |  | arrays | one-decider | a tuple of ${} read as a sequence needs one element type |
| translate/translate.mjs:3318 | translate-refuse |  | unread-syntax | one-decider | expression SpreadElement is not translated |
| translate/translate.mjs:3327 | translate-refuse |  | library | one-decider | .${}() on a tuple writes it in place; the tuple is read as a Dafny tuple of its positions, which a s |
| translate/translate.mjs:3332 | translate-refuse |  | promises | one-decider | an opaque promise call requires an effectful unit |
| translate/translate.mjs:3421 | translate-refuse | definite-assignment | declarations | shared (absenceCarried) | definite-assignment: a let that may be read unassigned, in a promise handler |
| translate/translate.mjs:3437 | translate-refuse | promise-handler | promises | lowering (inlinePromiseStatementKind) | promise-handler: this statement has no inline continuation reading |
| translate/translate.mjs:3452 | translate-refuse | promise-handler | promises | exception:promise-opaque-return | promise-handler: a promise returned from an opaque block of a throwing handler is not read |
| translate/translate.mjs:3462 | translate-refuse | promise-handler | promises | shared (namedPromiseHandler) |  |
| translate/translate.mjs:3462 | translate-refuse | promise-thenable | promises | shared (namedPromiseHandler) |  |
| translate/translate.mjs:3471 | translate-refuse | promise-handler | promises | shared (namedPromiseHandler) | promise-handler: a named handler mutates its argument |
| translate/translate.mjs:3505 | translate-refuse | promise-pending | promises | shared (promiseConsumed) | promise-pending: await or return the promise directly |
| translate/translate.mjs:3506 | translate-refuse |  | promises | one-decider | promise forms require an effectful core unit |
| translate/translate.mjs:3523 | translate-refuse | generator-bound | generators | shared (executorShape) |  |
| translate/translate.mjs:3523 | translate-refuse | generator-effect | generators | shared (executorShape) |  |
| translate/translate.mjs:3523 | translate-refuse | generator-use | generators | shared (executorShape) |  |
| translate/translate.mjs:3526 | translate-refuse | promise-unsettled | promises | shared (executorShape) | promise-unsettled: an executor path does not settle |
| translate/translate.mjs:3528 | translate-refuse | promise-combinator | promises | one-decider | promise-combinator: completion order is not read |
| translate/translate.mjs:3557 | translate-refuse | internal | translator-internal | one-decider | internal: await in a unit not marked effectful |
| translate/translate.mjs:3569 | translate-refuse | internal | translator-internal | one-decider | internal: await in a unit not marked effectful |
| translate/translate.mjs:3642 | translate-refuse | prototype | prototype | shared (plainObjectTest) |  |
| translate/translate.mjs:3739 | translate-refuse | conditional-effect | logic-values | one-decider | conditional-effect: move the effect into an explicit if statement |
| translate/translate.mjs:3760 | translate-refuse | prototype | prototype | shared (inPrototypeReach) | prototype: this file makes an object whose prototype is not Object.prototype (line ${}), and ${}; `i |
| translate/translate.mjs:3761 | translate-refuse | dynamic-key | keys | shared (openRecordIn) | dynamic-key: ${} |
| translate/translate.mjs:3808 | translate-refuse |  | equality | one-decider | loose equality on a non-primitive operand is not translated |
| translate/translate.mjs:3921 | translate-refuse | prototype | prototype | shared (literalProtoMember) | prototype: `__proto__:` in a literal sets the prototype, not a key |
| translate/translate.mjs:3922 | translate-refuse | spread-source | record-copy | shared (copySource) | spread-source: ${} |
| translate/translate.mjs:4006 | translate-refuse |  | keys | one-decider | a computed key on a record with declared keys is a literal or a union of literals |
| translate/translate.mjs:4024 | translate-refuse | spread-source | record-copy | shared (spreadReadWhy) | spread-source: ${} |
| translate/translate.mjs:4050 | translate-refuse |  | keys | one-decider | the fields of a computed key union have different types |
| translate/translate.mjs:4292 | translate-refuse |  | callbacks | one-decider | ${} is not a function |
| translate/translate.mjs:4298 | translate-refuse |  | callbacks | one-decider | ${} has effects; it cannot be a callback |
| translate/translate.mjs:4303 | translate-refuse |  | callbacks | one-decider | ${} is not a same-file function or a local function value |
| translate/translate.mjs:4305 | translate-refuse |  | callbacks | one-decider | an effect inside a callback; the order of its world transitions is not defined |
| translate/translate.mjs:4319 | translate-refuse |  | callbacks | one-decider | callback path ends without a return |
| translate/translate.mjs:4331 | translate-refuse |  | regex | shared (matchGroupsDestructure) | `${}` of the destructured groups may be undefined (its group does not take part in every match) |
| translate/translate.mjs:4341 | translate-refuse |  | react | one-decider | a hook result is taken apart field by field |
| translate/translate.mjs:4341 | translate-refuse |  | react | one-decider | ${} is not a field the hook table declares for ${} |
| translate/translate.mjs:4352 | translate-refuse |  | destructuring | one-decider | record rest needs a typed source record |
| translate/translate.mjs:4354 | translate-refuse |  | destructuring | one-decider | a computed key in a record rest pattern is not translated |
| translate/translate.mjs:4398 | translate-refuse |  | destructuring | one-decider | a rest element of a tuple or an opaque value is not translated |
| translate/translate.mjs:4406 | translate-refuse |  | destructuring | one-decider | pattern is not translated |
| translate/translate.mjs:4425 | translate-refuse |  | regex | one-decider | `.groups` of a pattern that names no group is undefined |
| translate/translate.mjs:4428 | translate-refuse |  | regex | one-decider | a capture of a match that may be null, read without `?.` |
| translate/translate.mjs:4428 | translate-refuse |  | regex | one-decider | a capture that may not take part read as a string |
| translate/translate.mjs:4429 | translate-refuse |  | regex | one-decider | a capture read as ${} |
| translate/translate.mjs:4441 | translate-refuse | read-after-call | mutation | one-decider | read-after-call: `${}` is read after a call that may change its object, and this reading holds the o |
| translate/translate.mjs:4463 | translate-refuse |  | names | shared (moduleState) | ${}.${} is a function; call it |
| translate/translate.mjs:4468 | translate-refuse | internal | translator-internal | one-decider | internal: a world field read in a pure method |
| translate/translate.mjs:4473 | translate-refuse | internal | translator-internal | one-decider | internal: a world field read in a pure unit |
| translate/translate.mjs:4502 | translate-refuse |  | members | one-decider | property .${} on ${}: the constraint declares no such member |
| translate/translate.mjs:4504 | translate-refuse |  | optional-chain | one-decider | ?. on a type parameter is not translated |
| translate/translate.mjs:4643 | translate-refuse | absent-number | absence | one-decider | absent-number: ${} of a local that holds a dictionary read typed without undefined and may change; b |
| translate/translate.mjs:4678 | translate-refuse |  | keys | one-decider | an absent key reads undefined, which this value type leaves out |
| translate/translate.mjs:4703 | translate-refuse | prototype | prototype | shared (openRecordReadWhy) | prototype: ${} names a member of Object.prototype, which an open record reads through its prototype, |
| translate/translate.mjs:4705 | translate-refuse | dynamic-key | keys | shared (OPEN_RECORD_WHY) | dynamic-key: ${} |
| translate/translate.mjs:4713 | translate-refuse | prototype | prototype | shared (matchCapture, matchGroupRead) |  |
| translate/translate.mjs:4718 | translate-refuse |  | keys | one-decider | tuple index must be a literal |
| translate/translate.mjs:4741 | translate-refuse |  | keys | one-decider | key ${} is not a declared data field |
| translate/translate.mjs:4782 | translate-refuse | internal | translator-internal | one-decider | internal: a same-file constructor called from a pure unit |
| translate/translate.mjs:4786 | translate-refuse |  | calls | one-decider | the constructor of ${} was not translated |
| translate/translate.mjs:4823 | translate-refuse |  | library | shared (freshArray) | .${}() as a value needs a local array or a fresh one |
| translate/translate.mjs:4877 | translate-refuse |  | arrays | one-decider | a spread among other arguments is not translated |
| translate/translate.mjs:4894 | translate-refuse |  | calls | one-decider | ${} needs ${} arguments |
| translate/translate.mjs:4931 | translate-refuse |  | proof-shape | one-decider | unknown record enumeration needs the world; use --core |
| translate/translate.mjs:4984 | translate-refuse |  | calls | one-decider | callee ${} was not translated |
| translate/translate.mjs:4986 | translate-refuse | internal | translator-internal | one-decider | internal: an accessor of a receiver not made here, in a pure unit |
| translate/translate.mjs:5001 | translate-refuse |  | calls | one-decider | callee ${} was not translated |
| translate/translate.mjs:5003 | translate-refuse |  | proof-shape | one-decider | ${} loops, so it is a Dafny method and cannot be called inside an expression |
| translate/translate.mjs:5008 | translate-refuse |  | calls | one-decider | the argument for `${}`, which ${} changes, must be a name or a fresh literal |
| translate/translate.mjs:5010 | translate-refuse | internal | translator-internal | one-decider | internal: effectful callee in a pure unit |
| translate/translate.mjs:5020 | translate-refuse | internal | translator-internal | one-decider | internal: effectful callee in a pure unit |
| translate/translate.mjs:5036 | translate-refuse | optional-chain | optional-chain | exception:optional-source-vs-emitted-callee (optionalCallShape) | optional-chain: ${} |
| translate/translate.mjs:5119 | translate-refuse |  | react | one-decider | a lazy initializer with more than a return is not read |
| translate/translate.mjs:5147 | translate-refuse |  | calls | one-decider | `apply` takes its arguments as one array literal |
| translate/translate.mjs:5148 | translate-refuse |  | calls | one-decider | `call` and `apply` take the receiver first |
| translate/translate.mjs:5153 | translate-refuse |  | calls | one-decider | an array method called through ${} is not the direct call here: ${} |
| translate/translate.mjs:5156 | translate-refuse |  | translator-internal | one-decider | hook ${} is a world transition in a unit not marked effectful |
| translate/translate.mjs:5162 | translate-refuse |  | translator-internal | one-decider | hook ${} is a world transition in a unit not marked effectful |
| translate/translate.mjs:5168 | translate-refuse | prototype | prototype | shared (ownKeyTest) |  |
| translate/translate.mjs:5172 | translate-refuse | prototype | prototype | lowering (nullPrototypeCreate) | prototype: ${} |
| translate/translate.mjs:5193 | translate-refuse |  | calls | one-decider | call through a computed callee is not translated |
| translate/translate.mjs:5241 | translate-refuse | internal | translator-internal | one-decider | internal: effectful method called from a pure method |
| translate/translate.mjs:5285 | translate-refuse |  | calls | one-decider | callee ${} was not translated |
| translate/translate.mjs:5289 | translate-refuse | internal | translator-internal | one-decider | internal: effectful method called from a pure unit |
| translate/translate.mjs:5328 | translate-refuse | math-empty | library | lowering (nonemptyMathArgs) | math-empty: provide a nonempty argument list |
| translate/translate.mjs:5380 | translate-refuse |  | library | one-decider | reduce without an initial value throws a TypeError on an empty array, which this reading of a value  |
| translate/translate.mjs:5410 | translate-refuse |  | library | one-decider | array method .${}() is not translated |
| translate/translate.mjs:5468 | translate-refuse |  | library | one-decider | Set.${}() is not translated as an expression |
| translate/translate.mjs:5481 | translate-refuse |  | library | one-decider | Map.${}() is not translated as an expression |
| translate/translate.mjs:5501 | translate-refuse |  | control-flow | one-decider | bare return |
| translate/translate.mjs:5645 | translate-refuse |  | control-flow | one-decider | a case declaration shadows a name the switch head assigns |
| translate/translate.mjs:5691 | translate-refuse |  | control-flow | one-decider | a path ends without a return |
| translate/translate.mjs:5708 | translate-refuse |  | control-flow | one-decider | statement ${} cannot be an expression |
| translate/translate.mjs:5726 | translate-refuse |  | exceptions | one-decider | throw is translated in --core mode only |
| translate/translate.mjs:5780 | translate-refuse |  | unread-syntax | one-decider | statement ${} is not translated |
| translate/translate.mjs:5800 | translate-refuse | receiver-write | mutation | shared (thisParamPath) | receiver-write: a free function writes a nonoptional data record receiver |
| translate/translate.mjs:5803 | translate-refuse | receiver-mutation | mutation | shared (receiverRecordPath) | receiver-mutation: a receiver path needs nonoptional data records |
| translate/translate.mjs:5805 | translate-refuse | alias-mutation | mutation | exception:element-shape-vs-selected-emission (loopElementBinding) | alias-mutation: `${}` is the element a loop or an array callback walks; this reading copies it, so a |
| translate/translate.mjs:5821 | translate-refuse |  | mutation | one-decider | field ${} is not a declared field of a record |
| translate/translate.mjs:5833 | translate-refuse |  | mutation | one-decider | assignment through an optional field is not translated |
| translate/translate.mjs:5857 | translate-refuse |  | mutation | one-decider | an element write through a value that is not an array |
| translate/translate.mjs:5864 | translate-refuse |  | mutation | one-decider | field ${} is not a declared field of a record |
| translate/translate.mjs:5873 | translate-refuse |  | mutation | one-decider | assignment through an optional field is not translated |
| translate/translate.mjs:5909 | translate-refuse |  | module-state | shared (moduleState) | a logical module assignment uses the opaque unit reading |
| translate/translate.mjs:5920 | translate-refuse |  | module-state | one-decider | a logical static assignment is outside the reading |
| translate/translate.mjs:5929 | translate-refuse | prototype | prototype | shared (protoKeyWrite) | prototype: a key that may be '__proto__' with an object or null value replaces the prototype |
| translate/translate.mjs:5937 | translate-refuse |  | mutation | one-decider | index assignment on a non-array |
| translate/translate.mjs:5950 | translate-refuse | internal | translator-internal | one-decider | internal: an outside write in a pure unit |
| translate/translate.mjs:5954 | translate-refuse | internal | translator-internal | one-decider | internal: a world field written in a pure unit |
| translate/translate.mjs:5974 | translate-refuse |  | mutation | one-decider | a compound assignment on an optional field is not translated |
| translate/translate.mjs:5975 | translate-refuse |  | mutation | one-decider | assignment operator is not translated |
| translate/translate.mjs:5987 | translate-refuse | internal | translator-internal | one-decider | internal: a world field written in a pure method |
| translate/translate.mjs:5991 | translate-refuse |  | mutation | one-decider | delete of a field of this is not translated; assign undefined |
| translate/translate.mjs:5992 | translate-refuse |  | mutation | one-decider | delete of `${}`, a field that is not optional |
| translate/translate.mjs:5994 | translate-refuse |  | mutation | one-decider | delete target is not translated |
| translate/translate.mjs:5997 | translate-refuse |  | mutation | one-decider | element write through a path: the heap core reads it, the value reading does not |
| translate/translate.mjs:6030 | translate-refuse |  | proof-shape | shared (bucketMaps) | a push through a bucket map is read in --core mode |
| translate/translate.mjs:6066 | translate-refuse |  | library | one-decider | .${}() is not translated here |
| translate/translate.mjs:6069 | translate-refuse |  | control-flow | one-decider | statement expression is not translated |
| translate/translate.mjs:6077 | translate-refuse |  | control-flow | one-decider | a bare await statement has no effect in the core |
| translate/translate.mjs:6077 | translate-refuse | alias-mutation | mutation | one-decider | alias-mutation: `${}` and `${}` name one object; this reading carries a write through either in --co |
| translate/translate.mjs:6083 | translate-refuse |  | loops | one-decider | in --real mode a for-loop counter starts at an integer literal |
| translate/translate.mjs:6130 | translate-refuse |  | control-flow | one-decider | an abrupt exit has no enclosing loop or switch |
| translate/translate.mjs:6384 | translate-refuse | definite-assignment | declarations | shared (absenceCarried) | definite-assignment: a let that may be read unassigned, inside a try |
| translate/translate.mjs:6414 | translate-refuse | non-null-assertion | non-null-assertion | one-decider | non-null-assertion: the value read is not held as an option here |
| translate/translate.mjs:6428 | translate-refuse | non-null-assertion | non-null-assertion | one-decider | non-null-assertion: the value read is not held as an option here |
| translate/translate.mjs:6474 | translate-refuse | definite-assignment | declarations | shared (absenceCarried, absenceHome) | definite-assignment: a let that may be read unassigned, outside a function's own flow |
| translate/translate.mjs:6513 | translate-refuse |  | local-functions | one-decider | a nested function needs a name |
| translate/translate.mjs:6530 | translate-refuse |  | control-flow | one-decider | break or continue outside a loop |
| translate/translate.mjs:6533 | translate-refuse |  | unread-syntax | one-decider | statement ${} is not translated |
| translate/translate.mjs:6572 | translate-refuse | internal | translator-internal | one-decider | internal: an opaque block in a unit not marked effectful |
| translate/translate.mjs:6647 | translate-refuse | update-expression | operators-as-values | shared (broken) | <why> |
| translate/translate.mjs:6647 | translate-refuse | assignment-expression | operators-as-values | shared (broken) | <why> |
| translate/translate.mjs:6650 | translate-refuse | collection-iterator | library | one-decider | its value would leave an opaque step; the unit is read as one opaque function |
| translate/translate.mjs:6650 | translate-refuse | division | numbers | one-decider | its value would leave an opaque step; the unit is read as one opaque function |
| translate/translate.mjs:6650 | translate-refuse | math-empty | library | one-decider | its value would leave an opaque step; the unit is read as one opaque function |
| translate/translate.mjs:6650 | translate-refuse | number-special | numbers | one-decider | its value would leave an opaque step; the unit is read as one opaque function |
| translate/translate.mjs:6650 | translate-refuse | reference-key | types | one-decider | its value would leave an opaque step; the unit is read as one opaque function |
| translate/translate.mjs:6650 | translate-refuse | string-code-unit | strings | one-decider | its value would leave an opaque step; the unit is read as one opaque function |
| translate/translate.mjs:6650 | translate-refuse | unary-coercion | numbers | one-decider | its value would leave an opaque step; the unit is read as one opaque function |
| translate/translate.mjs:6733 | translate-refuse | internal | translator-internal | one-decider | internal: an opaque step in a unit not marked effectful |
| translate/translate.mjs:6739 | translate-refuse | opaque | opaque | one-decider | opaque: the ${} step's writes cannot be named: ${} |
| translate/translate.mjs:6764 | translate-refuse | internal | translator-internal | one-decider | internal: an opaque block in a unit not marked effectful |
| translate/translate.mjs:6852 | translate-refuse |  | proof-shape | one-decider | effectful callbacks need --core |
| translate/translate.mjs:6864 | translate-refuse |  | exceptions | one-decider | a throwing callback here has no fault channel; call the array method in a statement of the unit |
| translate/translate.mjs:6931 | translate-refuse |  | loops | one-decider | async iterator abrupt completion needs an opaque loop |
| translate/translate.mjs:7063 | translate-refuse |  | exceptions | one-decider | a throwing callback here has no fault channel; call the array method in a statement of the unit |
| translate/translate.mjs:7073 | translate-refuse |  | loops | one-decider | an effect in a for header |
| translate/translate.mjs:7124 | translate-refuse | key-order | loops | shared (forInKeyOrder) | key-order: a for-in over an object whose key order the function does not fix (a parameter, a spread, |
| translate/translate.mjs:7170 | translate-refuse |  | loops | one-decider | while needs `// @decreases <expr>` |
| translate/translate.mjs:7185 | translate-refuse |  | control-flow | one-decider | a labelled exit lacks its completion channel |
| translate/translate.mjs:7185 | translate-refuse | internal | translator-internal | one-decider | internal: return in a loop without the return shape |
| translate/translate.mjs:7395 | translate-refuse | param-assign | mutation | exception:mutation-admission-vs-value-output (parameterMutationConflicts) | param-assign: parameter `${}` is rebound and also changed in place |
| translate/translate.mjs:7574 | translate-refuse | type-assertion | type-assertion | one-decider | type-assertion: `${}` hands a value whose type nothing checked to ${}, or reads its held result, and |
| translate/translate.mjs:7577 | translate-refuse | type-assertion | type-assertion | one-decider | type-assertion: a unit named ${}${} takes the name of ${}'s reading at Any |
| translate/translate.mjs:7593 | translate-refuse | untyped-js | types | shared (callbackUntypedJsUnit) | untyped-js: ${} |
| translate/translate.mjs:7595 | translate-refuse | opaque | opaque | one-decider | opaque: a ${} site outside the unit's body (a parameter default) has no block: ${} |
| translate/translate.mjs:7597 | translate-refuse | alias-mutation | mutation | exception:element-shape-vs-selected-emission (firstElementMutation) | alias-mutation: `${}` is the element a loop or an array callback walks; this reading copies it, so t |
| translate/translate.mjs:7598 | translate-refuse | alias-mutation | mutation | one-decider | alias-mutation: `${}` is another name for `${}`, a node the unit was handed; the heap core does not  |
| translate/translate.mjs:7599 | translate-refuse | alias-mutation | mutation | lowering (bucketMaps, sharedMutation) | alias-mutation: `${}` is changed in place while ${} (line ${}); this reading reads an object as a va |
| translate/translate.mjs:7603 | translate-refuse |  | generators | shared (asyncGenerator) | async generators need --core |
| translate/translate.mjs:7604 | translate-refuse |  | generators | one-decider | generators need --core |
| translate/translate.mjs:7637 | translate-refuse |  | control-flow | one-decider | a path ends without a return |
| translate/translate.mjs:7643 | translate-refuse | read-after-call | mutation | shared (readAfterCall) | read-after-call: ${} |
| translate/translate.mjs:7647 | translate-refuse | assignment-expression | operators-as-values | one-decider | <site.msg> |
| translate/translate.mjs:7647 | translate-refuse | bare-return | control-flow | one-decider | <site.msg> |
| translate/translate.mjs:7647 | translate-refuse | bitwise | bitwise | one-decider | <site.msg> |
| translate/translate.mjs:7647 | translate-refuse | collection-iterator | library | one-decider | <site.msg> |
| translate/translate.mjs:7647 | translate-refuse | destructuring | destructuring | one-decider | <site.msg> |
| translate/translate.mjs:7647 | translate-refuse | division | numbers | one-decider | <site.msg> |
| translate/translate.mjs:7647 | translate-refuse | for-in | loops | one-decider | <site.msg> |
| translate/translate.mjs:7647 | translate-refuse | for-of-non-array | loops | one-decider | <site.msg> |
| translate/translate.mjs:7647 | translate-refuse | label | control-flow | one-decider | <site.msg> |
| translate/translate.mjs:7647 | translate-refuse | loose-equality | equality | one-decider | <site.msg> |
| translate/translate.mjs:7647 | translate-refuse | math-empty | library | one-decider | <site.msg> |
| translate/translate.mjs:7647 | translate-refuse | mixed-types | equality | one-decider | <site.msg> |
| translate/translate.mjs:7647 | translate-refuse | number-special | numbers | one-decider | <site.msg> |
| translate/translate.mjs:7647 | translate-refuse | param-form | declarations | one-decider | <site.msg> |
| translate/translate.mjs:7647 | translate-refuse | record-rest | destructuring | one-decider | <site.msg> |
| translate/translate.mjs:7647 | translate-refuse | reference-key | types | one-decider | <site.msg> |
| translate/translate.mjs:7647 | translate-refuse | spread | arrays | one-decider | <site.msg> |
| translate/translate.mjs:7647 | translate-refuse | string-code-unit | strings | one-decider | <site.msg> |
| translate/translate.mjs:7647 | translate-refuse | string-order | strings | one-decider | <site.msg> |
| translate/translate.mjs:7647 | translate-refuse | template | tagged-template | one-decider | <site.msg> |
| translate/translate.mjs:7647 | translate-refuse | unary-coercion | numbers | one-decider | <site.msg> |
| translate/translate.mjs:7647 | translate-refuse | uninitialised | destructuring | one-decider | <site.msg> |
| translate/translate.mjs:7647 | translate-refuse | update-expression | operators-as-values | one-decider | <site.msg> |
| translate/translate.mjs:7648 | translate-refuse | read-after-call | mutation | one-decider | read-after-call: `${}` is read after a call that may change it, and this form of read does not take  |
| translate/translate.mjs:7672 | translate-refuse |  | decorators | one-decider | the route wrapper is not read: ${} |
| translate/translate.mjs:7678 | translate-refuse |  | decorators | one-decider | a piped parameter is a plain required name |
| translate/translate.mjs:7722 | translate-throw |  | numbers | one-decider | internal: an integer division was not placed under Math.floor |
| translate/translate.mjs:7744 | translate-refuse | unsupported-call | calls | one-decider |  |
| translate/translate.mjs:7744 | translate-refuse | unsupported-member | members | one-decider |  |
| translate/translate.mjs:7744 | translate-refuse | unsupported-syntax | unread-syntax | one-decider |  |
| translate/translate.mjs:7744 | translate-refuse | unsupported-operator | mutation | one-decider |  |
| translate/translate.mjs:7744 | translate-refuse | unsupported-type | types | one-decider |  |
| translate/translate.mjs:7744 | translate-refuse | dynamic-key | keys | one-decider |  |
| translate/translate.mjs:7744 | translate-refuse | optional-chain | optional-chain | one-decider |  |
| translate/translate.mjs:7744 | translate-refuse | function-value | calls | one-decider |  |
| translate/translate.mjs:7744 | translate-refuse | callback-form | callbacks | one-decider |  |
| translate/translate.mjs:7744 | translate-refuse | callback-control | exceptions | one-decider |  |
| translate/translate.mjs:7744 | translate-refuse | callback-result | callbacks | one-decider |  |
| translate/translate.mjs:7744 | translate-refuse | exception-callback | exceptions | one-decider |  |
| translate/translate.mjs:7744 | translate-refuse | exception-binding | exceptions | one-decider |  |
| translate/translate.mjs:7744 | translate-refuse | exception-return | exceptions | one-decider |  |
| translate/translate.mjs:7744 | translate-refuse | conditional-effect | logic-values | one-decider |  |
| translate/translate.mjs:7744 | translate-refuse | operator-value-context | operators-as-values | one-decider |  |
| translate/translate.mjs:7744 | translate-refuse | instanceof-constructor | instanceof | one-decider |  |
| translate/translate.mjs:7744 | translate-refuse | iterator-protocol | object-literal-methods | one-decider |  |
| translate/translate.mjs:7744 | translate-refuse | delete | mutation | one-decider |  |
| translate/translate.mjs:7744 | translate-refuse | assign-target | record-copy | one-decider |  |

## 2026-11-01: the proof step's counterexample sites (check.mjs, solve/counterexample.mjs)

`lower.mjs --audit` reads the refusals of lint.mjs and translate.mjs; the sites below decide a verdict after them, in the
proof step, and are listed here by hand (design/w3a-counterexample.md). None refuses a construct; each decides what a
failed equality lemma's model becomes.

| site | kind | decides | from | to |
| --- | --- | --- | --- | --- |
| check.mjs counterexampleStep | verdict | the step runs | lane A's own lemma failed, no adapter, no identity guard, lane B not a WITNESS | one extraction (solve/counterexample.mjs) |
| check.mjs counterexampleStep | verdict | the step is not asked | every failed condition of the lemma ran out of the resource limit | lanes.A.counterexample `none`, lane A ASK:resource-limit, the reason kept |
| solve/counterexample.mjs counterexample | verdict | no model | the extraction printed no state for the lemma's lines, or passed its wall cap | `none` with the reason; the unit's verdict unchanged |
| solve/counterexample.mjs argsFromModel | verdict | not bridged | a parameter type the model-to-JavaScript reading does not hold (NotBridged) | `unconfirmed`, input null, the type named |
| solve/counterexample.mjs replayInput | verdict | the replay agrees | lane B's comparison finds no difference on the value (or only an undriven callback, an unloadable module, function text) | `unconfirmed: {input, reason}` on the ASK |
| solve/counterexample.mjs replayInput | verdict | WITNESS | the replay of the carried value differs | WITNESS, witness.source `counterexample`, witness.value and both observations |


## 2026-10-30: an edit of comments and blank lines is intake, not a verdict

Before admission, the change ledger (`ci/ledger.mjs`) routes every edited line. An edit outside every listed unit that
changes no compiled token is inert: only comments and blank space differ, so nothing can run differently. The ledger
reads this from the parsed tree, never from a scanner started at the line: a line inside a block comment is comment,
and a line of a template literal that starts with `//` is the literal's text. A comment that the compiler or the runtime
reads is not inert: a pragma such as `/// <reference>` or `@jsx`, a `@ts-` directive, the JSDoc of a JavaScript file and
a shebang. Such an edit is `unassigned:directive comment` and stays ASK. An inert edit is `unassigned:comment` or
`unassigned:whitespace` with no verdict, and it never blocks. A comment inside a listed unit still goes to that unit.

Only a function unit enters the report's verdict table and its counts (`pr.mjs` `verdictRows`). Every other row is an
intake row of the ledger: an artifact by kind or class (config, test, lockfile, binary, a secret path), an unassigned
edit by its named reason, the empty diff. It stays in the intake table. A non-inert intake row keeps its ASK in the
data, so `--block ask` still blocks on it. Both rules are about what the edit is, decided once in the ledger. Neither
depends on a hash, a file name or the pull request.

## 2026-11-01: the admission of a behavioural fake (conformance/fakes.mjs)

A behavioural fake is admitted by the suite row `conformance fakes`, not by the lint or the translator, so its decision
sites are not read by `lower.mjs --audit`. They are listed here, one row per site, the same way. Each site decides from
the fake's outcomes on the family's seeded script, compared with the real module, never from the fake's source
(design/w2e-fake-conformance.md).

| Site | Decides | Refuses when | Reason |
| --- | --- | --- | --- |
| conformance/fakes.mjs `runFamilies` | no protocol | a specifier the fake answers has no family | a fake is admitted only with its protocol: an untested value flow can hide or invent a WITNESS |
| conformance/fakes.mjs `testDir` (import) | loads | the module, or the hook asked for a specifier, throws (an exit on import is a throw) | a fake lane B cannot load is not a fake |
| conformance/fakes.mjs `testDir` (no create) | skipped | a file outside a hook's folder exports neither `create` nor a default function | not a fake module: listed, never admitted |
| conformance/fakes.mjs `runFamilies` (runs) | runs | the family throws on the fake | the fake broke the script: a refusal, never a pass |
| conformance/fakes.mjs `differential`, `fsFamily`, `storageFamily`, `vendoredFamily`, `declaredVectors` | agree / vectors | an outcome differs from the real module's (a value in canonical form, a throw by its code) | the fake answers what the real module answers on the same world |
| conformance/fakes.mjs `fsClauses` | write-then-read, mkdir-then-exists, unlink-then-ENOENT, seeded-read | the fake's outcomes break the clause on names its world holds as absent | the clauses the protocol names (brief w2e) |
| conformance/fakes.mjs `timersFamily`, `timersPromisesFamily` | virtual order, delay coercion, resolution order | the fake's firing order differs from a clean measurement of the real loop | timers fire in virtual order; an unclean measurement counts as unmeasured, never as agreement |
| conformance/fakes.mjs `fetchFamily` | request, a real Response, json is the parse of text, repeat, seeded, outside the table | a clause fails (each first checked on the platform's own Request and Response) | fetch's table returns what was seeded, as a Response the platform would make |
| conformance/fakes.mjs `abortSignalFamily`, `processFamily`, `consoleFamily`, `osFamily`, `randomClauses`, `uuidDraws` | the family's stated clauses | a clause fails | the protocol where no real call can be made (an exit, the host's facts, a seeded draw) |
| conformance/fakes.mjs (every family) | determinism | two fakes from one seed answer the script differently or write different traces | both sides of an input must meet one world |
| conformance/fakes.mjs (effectful families) | recorded | a call changes neither the trace nor the pending list | the trace stays the oracle; a pure function's value owes no record |
| conformance/fakes.mjs (any clause) | HARNESS | the real module fails a clause, a vendored file differs from its manifest, the vectors name another version | the harness's own defect fails the run, never the fake's |
| conformance/fakes.mjs verdict | a good fake / a wrong fixture | a good fake has a failing clause, a harness defect, or no check ran; a wrong fixture is not refused on every clause its `expectRefused` names | red first: the wrong fixtures stay refused, and under `--break` they are admitted and the row is red |
## 2026-11-01: lane B's input search adds a verdict site, no admission site

The branch-guided input search (`exec/search.mjs`, design/w3c-search-inputs.md) decides nothing the lint or the
translator decides: it adds no refusal, no reading and no site to the audit above. It adds one place where lane B's
verdict is decided, listed here so the table of deciders stays whole:

| site | kind | rule | reading | decided | message |
| --- | --- | --- | --- | --- | --- |
| exec/run.mjs runPairOnce (the search block after the draw loop) | laneB-witness |  | (lane B) | one-decider (search.mjs searchInputs; run.mjs pairOf/statusOf) | WITNESS, `source: search`: a changed input inside the declared type on which the two sides' observations differ, reproduced byte for byte on fresh environments |

## 2026-11-01: the web fakes add no admission site

The behavioural fakes of the web platform (design/w2c-web-fakes.md) are lane B's world: `exec/fakes/web/` answers
`fetch`, the Fetch classes, `AbortSignal.timeout` and the storage areas inside the sandbox, and `exec/fake.mjs` renders
platform objects by their state. No call of the lint's `v`, `refuse` or `note`, no translator `fail` and no
`Unsupported` was added or moved, so `lower.mjs --audit` reads the same sites and the table above has no new row. The
one new switch, `LEAN_FAKES=recording`, chooses lane B's world, never what lean admits.

## 2026-11-01: package rows (w2d-library-rows)

Three decision sites read the package rows of `translate/library.json` (`packages`, design/w2d-library-rows.md). None
refuses, so `lower.mjs --audit` lists none (600 sites before and after; the table above moved by line numbers only). Each
admits a reading, by one predicate the three share, `pureLibraryCall` in `library-rows.mjs`:

| Site | Decides | Reading | Removed by |
| --- | --- | --- | --- |
| library-rows.mjs `pureLibraryCall` | a call of a listed package export is a function of its arguments: the row lists it under `pure`, every function argument is an arrow literal, no spread, and the result type cannot share an object the unit holds (the row's shape) | `calls` (an outside call): uninterpreted function instead of transition | `LEAN_BREAK=package-rows` |
| translate/translate.mjs `isEffectCall` | such a call makes no transition when each arrow it hands the package is quiet (`quietCallback`: not async, no effect, no cell write, no throw, try, await or call of a unit that throws) | `calls` | `LEAN_BREAK=package-rows` |
| translate/heap.mjs eligibility (`no(...)`) | a unit holding such a call is not the heap core's: the heap core reads an imported call only as a transition of the whole world; the value lane reads it | `calls` | `LEAN_BREAK=package-rows` |

## 2026-11-01: decision sites of a unit no parent holds (w1h, design/w1h-new-units.md)

These sites decide no refusal of the lint or the translator, so `lower.mjs --audit` does not list them: they decide what
lane B claims about a unit with no parent. Each claims a record or withholds it, and each mechanism has its switch
(`LEAN_BREAK`, tests/w1h-new-units.mjs --break) under which its pair goes red.

| site | decides | condition | outcome | switch |
| --- | --- | --- | --- | --- |
| exec/spec.mjs specOf `declaredParams` | the declaration's parameter specs | captured before lane B widens the draw (an Error option, a key list, the reads' shapes); `all` for a top-level any or unknown, never the checker's error type | `spec.declared` (not enumerable) | |
| exec/spec.mjs spec `narrowed` | a primitive that holds some of its values only | a brand (`primitiveBrand`), a template literal type, a string mapping type | `member` answers `unknown`, never `yes` | |
| exec/declared.mjs member | whether a value is one of a declared type | per kind; `unknown` for opaque, a type parameter, an off-length tuple, an accessor, a service; `nullable` from the project's strictNullChecks, `exactOptional` from exactOptionalPropertyTypes | `yes` / `no` / `unknown` | |
| exec/declared.mjs edgeValues, edgePlan | the edge inputs | absent, empty, zero, special numbers, malformed text, records at their edges; kept when `member` is `yes`; first, at most half the inputs | one parameter at a time takes an edge value | `declared-edges` |
| exec/declared.mjs declaration | what the declaration states | annotation, JSDoc `@returns`, a typed variable; `@throws {T}` or untyped, `asserts`, `never`; overload signatures | `returns`, `inferred`, `voidLike`, `throws`, `overloaded` | |
| exec/declared.mjs declaredThrow | a throw the declaration names | a constructor name on the thrown value's prototype chain is a `@throws` type, or the declaration throws any | no record | `declared-throws` |
| exec/new-unit.mjs runNew `admitted` | the input is the declaration's | every argument `yes` (an optional one may be undefined); an overloaded unit has no declared reading | else no record, counted `notAdmitted` | `admitted-input` |
| exec/new-unit.mjs graphWorld, the call's trace | the call asked the world nothing | no package fake linked, an empty load trace, an empty call trace, no world global named in the graph | else no record, counted `world` | `closed-call` |
| exec/new-unit.mjs platformGap | the sandbox lacks a global Node holds | a ReferenceError naming a host global | `new:coverage`, never `new:fault` | |
| exec/new-unit.mjs the shape check | a returned value outside the declared return type | a declared, non-void return; the promise the declaration names and the unit returned agree; no JSX element; `member` is `no` | `new:shape` | `declared-shape` |
| exec/new-unit.mjs the end of the draw | nothing could be claimed | no input both admitted and closed, a load failure, a spec failure, a harness stop | `new:coverage` with the reason | |
| exec/new-tests.mjs selection | a test names the unit | the file imports the unit's binding from the candidate (or a byte-equal checkout path); the test, a hook around it, or a helper it reaches names it | the test is reported | `pr-tests` (new-unit.mjs) |
| exec/new-tests.mjs MOCKS, Gap, unsettled | the runner model holds the test | no module, global or clock replaced; every matcher and runner feature modelled; settled within the bound | else `new:coverage` | |
| exec/new-tests.mjs the world taint | the test's failure is the code's | the file's load, its hooks and earlier tests, and the test asked the world nothing | else `new:coverage` | `closed-test` |
| pr.mjs the added-file branch | a unit of an added file is read | not deleted, not the module unit | `check()` with no parent: `NEW` with its records (was ASK `new file: no parent to compare with`) | |

## 2026-11-01: units outside every function (lane w1f-module-units)

The decision sites this lane adds. None refuses a construct and none is a site of lint.mjs or translate.mjs, so the audit
table above (`lower.mjs --audit`) is unchanged; they are listed here in its columns, each decided once
(design/w1f-module-units.md).

| site | kind | rule | reading | decided | message |
| --- | --- | --- | --- | --- | --- |
| ci/ledger.mjs routeChanges (types unit) | route | type-only, directive comment | typed | one-decider (syntaxContext) | an edit outside every listed unit of text the emitted JavaScript does not carry is the types unit's |
| ci/ledger.mjs routeChanges (module unit) | route | module-level statement | module-unit | one-decider (evaluated) | a JavaScript file's top-level code is its module unit's, as a TypeScript file's is (the untyped-JavaScript route removed) |
| pr.mjs prWorker (typed verdict) | verdict | PASS-typed | typed | one-decider (typed.mjs typedReading) | the emitted JavaScript is byte-equal on both sides in every file the change's types reach |
| pr.mjs prWorker (types unit, no equal emit) | verdict | ASK | typed | one-decider (typed.mjs typedReason) | the emitted JavaScript differs in <files> |
| lint/directives.mjs directiveRecords | rule-record | directive:<kind> | directives | one-decider (directivesOf) | added/removed `<directive>` over <scope>: hides / no longer hides <errors> |

## 2026-11-01: every witness of a row, and `--units` (lane w7a-lean-witnesses)

No decision site is added or moved. A `pr.mjs` row whose lane B verdict is `WITNESS` now carries `witnesses` beside
`witness`: lane B's witnesses of the unit (the ones it already found and the certificate already summarises), one per
site (`where.field`, the two sides' operations, the candidate line), in lane B's order, each without its `record`.
`witness` is still the first, the verdict and the certificate are unchanged. `pr.mjs --units` narrows which changed
units get a task; it decides no verdict and refuses nothing (a unit left out has no row). The lint's `v`, `refuse` and
`note`, the translator's `fail` and `Unsupported` are untouched, so `lower.mjs --audit` reads the same sites
(design/w7a-lean-witnesses.md).

## 2026-11-01 (lane w1c-opaque-calls): an opaque site keeps its finding's refusal only where no step reaches it

The calls, members, syntax and callbacks rules (lint/opaque-calls.mjs, the column OPAQUE_CALLS) are decided once,
by `callsOpaqueSite`, which the lint calls when its walk ends and the translator calls for a refusal of its own
(`translateSites`). A finding the decision gives a statement keeps its message, gains `opaque: statement` and stops
nothing; the translator reads the statement as one opaque step (design/w1c-opaque-calls.md). One decision site is new:
`translate.mjs` fails with `${site.rule}: ${site.message}` when a site of an emitted unit was reached by no step (a
statement another reading took whole), so the finding's refusal stands under its own rule and reading; the audit names
it once per rule a site can hold (`site.rule` in lower.mjs DYNAMIC_RULES, the rules the catalogue reads; `union-type`
has no site and no reading). `dynamicRules` now takes an exact key before a contained one (`site.rule` holds `rule`).
## 2026-11-01: the opacity ladder for async, promises and generators (lane w1d)

The async family fills its rows of the lint's opaque column (`lint/lint.mjs` OPAQUE_ROWS, the schema of lane w1a) with
the grade `expression`, one decision with `opaque-async.mjs` ASYNC_OPAQUE (a load-time check). A graded finding is a step
only where its construct is one; the decision is one predicate, so the lint, the lowering and the translator agree:

| site | kind | decides | reading |
| --- | --- | --- | --- |
| opaque-async.mjs asyncOpaqueSite | label | a call, new or await of the unit's own code (locality); not in a generator, no yield, no receiver; pendingWork; stepWrites; a step with writes sits where its statement reads nothing else | opaque |
| lint/lint.mjs admissionFindings (the pass after the walk) | label | where asyncOpaqueSite says no, the grade is withdrawn and the finding refuses with `opaqueWhy` | opaque |
| translate/translate.mjs the gate | gate | a finding graded `expression` is an expression site (its span as written, mapped through the faithful rewrite), never a block site; block sites and the re-sited refusals of translateGraded are the `block` grade's only | opaque |
| translate/translate.mjs expr, awaitExpr | emission | a site is `opaqueExpression` (translate/opaque.mjs opaqueForm), its certificate row an `// OPAQUE` entry with the finding's span; awaited, it is a held promise | opaque |
| translate/translate.mjs opaqueExpression | fail | `opaque: the <rule> step's writes cannot be named` (the lint refused that site already; the translator's own guard) | opaque |
| translate/translate.mjs isEffectCall, awaitsHere | effect | a site is a transition (its unit threads the world) and its statement takes an await's fault check | opaque |

The audit table above is regenerated at this head (`node langs/ts/lower.mjs --audit --md`): 605 sites, 0 uncatalogued.

