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
while the translator applies it only where it materializes a Dafny type; the lint-side test refused 4 units the translator
admits (a constructor whose class field mentions the class's type parameter, among others) on six real repositories.
Applied only where the translator applies it, the test is the translator's own: the record already carries it.

The audit below marks each site: `lowering` (decided by a predicate in lower.mjs), `shared` (its statement calls a
decision both files import: the named-then pattern already in place, `namedPromiseHandler`, `forInKeyOrder`,
`copySource`, `nonNullOnAbsent`, ...), `one-decider` (decided in one file only; the other reads it through the record).
The translator sites that test a construct the lint also tests by its own code (a lint rule prefix on a translator site
marked one-decider) are the ones left to move; each is listed in the report with the reason it stays.

## Withdrawal

A reading's last version marked `withdrawn` with a reason, `LEAN_WITHDRAW="<id>=<reason>;..."` in the environment (an
operator withdraws a reading the moment it is found unsound, before any code changes), or `withdraw(id, reason)` in
process: the lowering refuses every unit that uses the reading, rule `withdrawn`, message `reading <id> version <v> is
withdrawn: <reason>`, in the lint and in the translator's gate alike. `tests/withdrawal.mjs` (a row of the suite)
withdraws `logic-values` and shows, on pair `nested_ternary` unit `choose`: the record, the lint and the translator
refuse with the same rule and reason; the command lines exit 1; check answers without a proof (lane A ASK); with the
reading back the same unit is PASS-proved.

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
| `bitwise` | bitwise and shift operators on numbers: ToInt32 and ToUint32 helpers over bv32 | (a form) | `bitwise` | 0 | v1 | design/numbers-bitwise-nan.md |
| `strings` | string literals and templates: seq<char> of BMP code units, the string methods the prelude defines | StringLiteral, NoSubstitutionTemplateLiteral, TemplateExpression | `string-code-unit`, `string-order` | 0 | v1 | design/strings.md |
| `tagged-template` | a tagged template: an uninterpreted function of the literal parts and the holes, named by the tag and the code it reaches | TaggedTemplateExpression | `template` | 0 | v1; 1 withdrawn | design/reach-keys.md |
| `regex` | a regular expression literal: an opaque constant named by its text; the match members of a non-global literal as functions of the pattern and the string | RegularExpressionLiteral |  | 0 | v1 | design/library-rows.md |
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

| site | kind | rule | reading | decided | message |
| --- | --- | --- | --- | --- | --- |
| lint/lint.mjs:257 | lint-refuse | prototype | prototype | lowering (NULL_PROTOTYPE_WHY, nullPrototypeCreate) | <NULL_PROTOTYPE_WHY> |
| lint/lint.mjs:258 | lint-refuse | prototype | prototype | one-decider | `Object.${}` reaches the prototype chain or the property descriptors; no transition models it |
| lint/lint.mjs:259 | lint-refuse | freeze | prototype | one-decider | `Object.${}` makes a later write throw in strict code; the value reading has no fault for that write |
| lint/lint.mjs:260 | lint-refuse | assign-target | record-copy | one-decider | `Object.assign` writes into its first argument; pass a fresh literal `{}` as the target or spread th |
| lint/lint.mjs:261 | lint-refuse | spread-source | record-copy | shared (copySource) | `Object.assign` onto a literal copies every own key of `${}`: ${}; the call is read as a function of |
| lint/lint.mjs:440 | lint-refuse | unsupported-type | types | one-decider | type ${} is not translatable |
| lint/lint.mjs:448 | lint-refuse | arguments | names | one-decider | `arguments` is the actual argument vector, not the declared one; name the parameter, or declare a re |
| lint/lint.mjs:451 | lint-refuse | exception-callback | exceptions | one-decider | call the throwing unit directly, or pass it to a call; a stored function value has no fault channel |
| lint/lint.mjs:452 | lint-refuse | generator-use | generators | shared (asyncGenerator) | consume a pure generator directly in for-of, spread, Array.from or yield* |
| lint/lint.mjs:453 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | pass a fresh literal handler or keep calls on the local object; sharing a named method object needs  |
| lint/lint.mjs:457 | lint-refuse | toplevel-effect | module-state | shared (moduleState) | move the effectful module initializer into a function |
| lint/lint.mjs:460 | lint-refuse | global-read | names | one-decider | `${}` is module state that can change; the subset reads constants only |
| lint/lint.mjs:462 | lint-refuse | number-special | numbers | one-decider | the finite number model has no NaN or infinity; use lane B for special-value arithmetic |
| lint/lint.mjs:463 | lint-refuse | dynamic-eval | names | one-decider | `${}` is outside the subset |
| lint/lint.mjs:463 | lint-refuse | prototype | prototype | one-decider | `${}` is outside the subset |
| lint/lint.mjs:466 | lint-refuse | global-read | names | one-decider | global `${}` is outside the subset |
| lint/lint.mjs:467 | lint-refuse | global-read | names | one-decider | `${}` cannot be resolved |
| lint/lint.mjs:491 | lint-refuse | static-this | classes | one-decider | `${}` in a static method is the class the call names, a subclass too; name the class itself, or give |
| lint/lint.mjs:499 | lint-refuse | global-read | names | one-decider | `${}` holds a function; call a static method of the class instead |
| lint/lint.mjs:501 | lint-refuse | global-read | names | one-decider | `.${}()` changes the static `${}` in place; assign a new value to the field instead |
| lint/lint.mjs:623 | lint-refuse | var | declarations | one-decider | `var` is outside the subset; use let or const |
| lint/lint.mjs:624 | lint-refuse | definite-assignment | declarations | shared (definiteAssignmentRead) | `let v!: T` may be read before its first assignment, where it is undefined; assign it first or give  |
| lint/lint.mjs:632 | lint-refuse | bare-return | control-flow | one-decider | return needs a value |
| lint/lint.mjs:637 | lint-refuse | destructuring | destructuring | one-decider | for-of binds one name or one pattern |
| lint/lint.mjs:639 | lint-refuse | for-of-non-array | loops | one-decider | for-of runs over arrays, strings, sets, maps and iterable values |
| lint/lint.mjs:654 | lint-refuse | for-in | loops | one-decider | for-in takes `const k` |
| lint/lint.mjs:655 | lint-refuse | key-order | loops | shared (forInKeyOrder) | a for-in visits the own keys in creation order (ECMA-262 14.7.5.9, 10.1.11), and the order of this o |
| lint/lint.mjs:656 | lint-refuse | for-in-delete | loops | one-decider | a for-in skips a key deleted before its visit (ECMA-262 14.7.5.9), and the reading visits the keys t |
| lint/lint.mjs:659 | lint-refuse | break-continue | control-flow | one-decider | break outside a loop or switch |
| lint/lint.mjs:660 | lint-refuse | break-continue | control-flow | one-decider | continue outside a loop |
| lint/lint.mjs:662 | lint-refuse | exception-callback | exceptions | one-decider | move the throw to a same-file unit and call it directly |
| lint/lint.mjs:667 | lint-refuse | destructuring | destructuring | one-decider | catch binds one name |
| lint/lint.mjs:673 | lint-refuse | label | control-flow | one-decider | a label must name a loop; replace a labelled block with conditional control |
| lint/lint.mjs:677 | lint-refuse | generator | local-functions | one-decider | generators are outside the subset |
| lint/lint.mjs:679 | lint-refuse | param-form | declarations | one-decider | rest parameters are outside the subset |
| lint/lint.mjs:688 | lint-refuse | class | classes | one-decider | classes are outside the subset |
| lint/lint.mjs:689 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | statement ${} is outside the subset |
| lint/lint.mjs:737 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | read named fields on the literal object; copying accessors or detached methods needs a receiver |
| lint/lint.mjs:740 | lint-refuse | record-rest | destructuring | one-decider | record rest needs a parameter of a plain record with written keys, or a fixed nonempty scalar record |
| lint/lint.mjs:851 | lint-refuse | uninitialised | destructuring | one-decider | a pattern needs an initial value |
| lint/lint.mjs:933 | lint-refuse | alias-mutation | mutation | one-decider | `${}` is the accumulator `reduce` hands its callback: it holds the array's first element when the ca |
| lint/lint.mjs:934 | lint-refuse | alias-mutation | mutation | one-decider | `${}` is the element `${}` hands its callback; a field written through it (`=`, `+=`, `-=`, `*=`, `+ |
| lint/lint.mjs:942 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | literal method fields are immutable; use a class for mutable receiver state |
| lint/lint.mjs:952 | lint-refuse | global-mutation | mutation | shared (moduleState) | assignment to `${}`, which this function does not own |
| lint/lint.mjs:953 | lint-refuse | render-impure | react | shared (moduleState) | a render function writes `${}`, a variable outside it; move the write into an event handler or an ef |
| lint/lint.mjs:954 | lint-refuse | param-assign | mutation | shared (moduleState) | <why> |
| lint/lint.mjs:955 | lint-refuse | closure-mutation | mutation | shared (moduleState) | `${}` is declared outside this callback; a callback cannot change it |
| lint/lint.mjs:960 | lint-refuse | index-assign | mutation | one-decider | index assignment into `${}`, which this function does not own |
| lint/lint.mjs:961 | lint-refuse | alias-mutation | mutation | one-decider | <aliasMsg(l.expression.text, o.decl)> |
| lint/lint.mjs:962 | lint-refuse | closure-mutation | mutation | one-decider | a callback cannot change an outer ${} |
| lint/lint.mjs:963 | lint-refuse | index-assign | mutation | one-decider | compound assignment on an element is outside the subset |
| lint/lint.mjs:964 | lint-refuse | dynamic-key | keys | one-decider | a dictionary key is a string |
| lint/lint.mjs:965 | lint-refuse | prototype | prototype | shared (protoKeyWrite) | a key that may be '__proto__' with an object or null value replaces the dictionary's prototype (the  |
| lint/lint.mjs:969 | lint-refuse | global-read | names | one-decider | `${}` holds a function; call a static method of the class instead |
| lint/lint.mjs:970 | lint-refuse | property-assign | mutation | one-decider | only =, +=, -=, *= on a static field |
| lint/lint.mjs:973 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | literal methods keep immutable data fields; use a class for mutable receiver state |
| lint/lint.mjs:973 | lint-refuse | receiver-mutation | mutation | shared (receiverRecordPath) | a receiver path needs nonoptional data records; assign a field itself for class or opaque handles |
| lint/lint.mjs:973 | lint-refuse | receiver-mutation | mutation | one-decider | only =, +=, -=, *= on a field of `this` |
| lint/lint.mjs:974 | lint-refuse | receiver-write | mutation | shared (thisParamPath) | <RECEIVER_WRITE> |
| lint/lint.mjs:976 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | literal method fields are immutable; use a class for mutable receiver state |
| lint/lint.mjs:981 | lint-refuse | property-assign | mutation | shared (outsideRoot) | a field of `${}` is written by a plain `=` statement; read the old value into a local first |
| lint/lint.mjs:982 | lint-refuse | property-assign | mutation | lowering (INSTALLS_FUNCTION_WHY, installsFunction, outsideRoot) | <INSTALLS_FUNCTION_WHY(root.text)> |
| lint/lint.mjs:991 | lint-refuse | property-assign | mutation | shared (elementWritePath) | assignment into `${}`, an element of `${}`, which is not a parameter of this function; write an elem |
| lint/lint.mjs:992 | lint-refuse | alias-mutation | mutation | shared (elementWritePath) | <aliasMsg(ep.root.text, po.decl)> |
| lint/lint.mjs:993 | lint-refuse | closure-mutation | mutation | shared (elementWritePath) | a callback cannot change an outer record |
| lint/lint.mjs:994 | lint-refuse | property-assign | mutation | shared (elementWritePath) | only =, +=, -=, *= on a field |
| lint/lint.mjs:999 | lint-refuse | property-assign | mutation | one-decider | only =, +=, -=, *= on a field |
| lint/lint.mjs:1000 | lint-refuse | property-assign | mutation | one-decider | only =, +=, -=, *= on a field |
| lint/lint.mjs:1001 | lint-refuse | property-assign | mutation | one-decider | assignment into `${}`: a field of an element is written when the path from a parameter takes field a |
| lint/lint.mjs:1002 | lint-refuse | property-assign | mutation | one-decider | assignment into `${}`, which this function does not own; records it owns are updated in place |
| lint/lint.mjs:1003 | lint-refuse | alias-mutation | mutation | one-decider | <aliasMsg(root.text, o.decl)> |
| lint/lint.mjs:1004 | lint-refuse | closure-mutation | mutation | shared (cellWrite) | a callback cannot change an outer record |
| lint/lint.mjs:1005 | lint-refuse | property-assign | mutation | shared (cellWrite) | only =, +=, -=, *= on a field |
| lint/lint.mjs:1008 | lint-refuse | index-assign | mutation | one-decider | compound assignment on an element is outside the subset |
| lint/lint.mjs:1009 | lint-refuse | dynamic-key | keys | one-decider | a dictionary key is a string |
| lint/lint.mjs:1010 | lint-refuse | prototype | prototype | shared (protoKeyWrite) | a key that may be '__proto__' with an object value replaces the dictionary's prototype (the setter o |
| lint/lint.mjs:1014 | lint-refuse | index-assign | mutation | one-decider | compound assignment on an element is outside the subset |
| lint/lint.mjs:1015 | lint-refuse | dynamic-key | keys | one-decider | a dictionary key is a string |
| lint/lint.mjs:1018 | lint-refuse | index-assign | mutation | one-decider | write a record field by name, or use a local Record<string, T> dictionary |
| lint/lint.mjs:1019 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | assignment target |
| lint/lint.mjs:1022 | lint-refuse | division | numbers | one-decider | compound division is outside the subset |
| lint/lint.mjs:1023 | lint-refuse | unsupported-operator | mutation | one-decider | assignment operator is outside the subset |
| lint/lint.mjs:1026 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | literal method fields are immutable; use a class for mutable receiver state |
| lint/lint.mjs:1026 | lint-refuse | receiver-mutation | mutation | shared (receiverRecordPath) | a receiver path needs nonoptional data records |
| lint/lint.mjs:1026 | lint-refuse | receiver-write | mutation | shared (thisParamPath) | <RECEIVER_WRITE> |
| lint/lint.mjs:1030 | lint-refuse | property-assign | mutation | one-decider | update of a field of `${}`, which this function does not own |
| lint/lint.mjs:1031 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | increment of a non-name |
| lint/lint.mjs:1034 | lint-refuse | global-mutation | mutation | shared (moduleState) | update of `${}`, which this function does not own |
| lint/lint.mjs:1035 | lint-refuse | render-impure | react | shared (moduleState) | a render function updates `${}`, a variable outside it; move the write into an event handler or an e |
| lint/lint.mjs:1036 | lint-refuse | param-assign | mutation | shared (moduleState) | <why> |
| lint/lint.mjs:1037 | lint-refuse | closure-mutation | mutation | shared (moduleState) | a callback cannot change an outer variable |
| lint/lint.mjs:1052 | lint-refuse | assign-target | record-copy | one-decider | `Object.assign` copies every own key of its source, and a value of a record type may carry keys its  |
| lint/lint.mjs:1067 | lint-refuse | alias-mutation | mutation | one-decider | <aliasMsg(r.text, declOf(r).decl)> |
| lint/lint.mjs:1078 | lint-refuse | opaque-mutation | mutation | one-decider | .${}() on `${}` may change it, and `${}` is read later; read it before the call or through a method |
| lint/lint.mjs:1081 | lint-refuse | opaque-mutation | mutation | one-decider | .${}() as a statement on an opaque value may mutate it; name the receiver first |
| lint/lint.mjs:1087 | lint-refuse | receiver-write | mutation | shared (thisParamPath) | <RECEIVER_WRITE> |
| lint/lint.mjs:1088 | lint-refuse | alias-mutation | mutation | one-decider | <aliasMsg(pr.text, declOf(pr).decl)> |
| lint/lint.mjs:1091 | lint-refuse | param-mutation | mutation | shared (bucketMaps, thisParamPath) | ${} on `${}`, which is not a local array${} |
| lint/lint.mjs:1096 | lint-refuse | param-mutation | mutation | shared (thisParamPath) | ${} on `${}`, which is not a local array |
| lint/lint.mjs:1097 | lint-refuse | unsupported-call | library | one-decider | pop takes no argument |
| lint/lint.mjs:1098 | lint-refuse | unsupported-call | library | one-decider | sort as a statement needs one comparator, an arrow of two parameters; with the default order write ` |
| lint/lint.mjs:1099 | lint-refuse | unsupported-call | library | one-decider | ${} takes no argument |
| lint/lint.mjs:1100 | lint-refuse | unsupported-call | library | one-decider | splice as a statement needs a start, a count and plain items |
| lint/lint.mjs:1103 | lint-refuse | param-mutation | mutation | shared (thisParamPath) | set mutation on a non-local |
| lint/lint.mjs:1104 | lint-refuse | param-mutation | mutation | shared (thisParamPath) | map mutation on a non-local |
| lint/lint.mjs:1108 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | only assignments, ++/--, calls, and await may stand as statements |
| lint/lint.mjs:1115 | lint-refuse | var | declarations | shared (countedFor) | `var` is outside the subset; use let or const |
| lint/lint.mjs:1171 | lint-refuse | promise-handler | promises | shared (namedPromiseHandler) | <named.message> |
| lint/lint.mjs:1171 | lint-refuse | promise-thenable | promises | shared (namedPromiseHandler) | <named.message> |
| lint/lint.mjs:1173 | lint-refuse | promise-handler | promises | shared (namedPromiseHandler) | inline a handler that mutates so its state is visible |
| lint/lint.mjs:1177 | lint-refuse | promise-handler | promises | one-decider | use an arrow with plain parameters |
| lint/lint.mjs:1186 | lint-refuse | promise-handler | promises | one-decider | inline a same-file call that throws or mutates so its fault and state are visible |
| lint/lint.mjs:1187 | lint-refuse | promise-handler | promises | one-decider | use declarations, conditionals, calls, return and throw in an inline promise body |
| lint/lint.mjs:1194 | lint-refuse | promise-thenable | promises | one-decider | use a plain value or a statically typed native Promise; custom thenable adoption is not read |
| lint/lint.mjs:1198 | lint-refuse | promise-pending | promises | shared (promiseConsumed) | await or return the promise directly; a dangling or stored continuation leaves observable pending wo |
| lint/lint.mjs:1201 | lint-refuse | promise-executor | promises | shared (executorShape) | <shape.message> |
| lint/lint.mjs:1201 | lint-refuse | promise-executor-escape | promises | shared (executorShape) | <shape.message> |
| lint/lint.mjs:1201 | lint-refuse | promise-unsettled | promises | shared (executorShape) | <shape.message> |
| lint/lint.mjs:1205 | lint-refuse | promise-executor | promises | shared (executorShape) | a callback bridge must call an outside API |
| lint/lint.mjs:1212 | lint-refuse | promise-handler | promises | one-decider | Promise.resolve and Promise.reject take at most one value |
| lint/lint.mjs:1216 | lint-refuse | promise-handler | promises | one-decider | use one explicit handler per link; use catch for rejection |
| lint/lint.mjs:1222 | lint-refuse | async | promises | one-decider | `await` outside an async function |
| lint/lint.mjs:1236 | lint-refuse | async | promises | one-decider | awaited callee form is outside the subset |
| lint/lint.mjs:1240 | lint-refuse | string-code-unit | strings | lowering (LONE_SURROGATE_WHY, loneSurrogate) | <LONE_SURROGATE_WHY> |
| lint/lint.mjs:1251 | lint-refuse | operator-value-context | operators-as-values | one-decider | move this value step into an explicit statement and conditional branch |
| lint/lint.mjs:1262 | lint-refuse | operator-value-context | operators-as-values | one-decider | write this mutating method call as a separate statement |
| lint/lint.mjs:1271 | lint-refuse | update-expression | operators-as-values | one-decider | increment a numeric local or numeric field |
| lint/lint.mjs:1271 | lint-refuse | assignment-expression | operators-as-values | one-decider | increment a numeric local or numeric field |
| lint/lint.mjs:1272 | lint-refuse | update-expression | operators-as-values | lowering (valueAssignmentWhy) | <valueAssignmentWhy(e.operatorToken.kind)> |
| lint/lint.mjs:1272 | lint-refuse | assignment-expression | operators-as-values | lowering (valueAssignmentWhy) | <valueAssignmentWhy(e.operatorToken.kind)> |
| lint/lint.mjs:1273 | lint-refuse | update-expression | operators-as-values | one-decider | use numeric compound assignment or string += with a string value |
| lint/lint.mjs:1273 | lint-refuse | assignment-expression | operators-as-values | one-decider | use numeric compound assignment or string += with a string value |
| lint/lint.mjs:1292 | lint-refuse | operator-value-context | operators-as-values | one-decider | keep the target root unchanged while evaluating the assignment reference and right side |
| lint/lint.mjs:1297 | lint-refuse | operator-value-context | operators-as-values | one-decider | keep the target root unchanged while evaluating an enclosing assignment |
| lint/lint.mjs:1303 | lint-refuse | update-expression | operators-as-values | one-decider | narrow optional paths before assigning |
| lint/lint.mjs:1303 | lint-refuse | assignment-expression | operators-as-values | one-decider | narrow optional paths before assigning |
| lint/lint.mjs:1311 | lint-refuse | type-assertion | type-assertion | shared (typeAssertion) | <why> |
| lint/lint.mjs:1320 | lint-refuse | template | tagged-template | one-decider | the tag must be a name |
| lint/lint.mjs:1332 | lint-refuse | non-null-assertion | non-null-assertion | shared (nonNullOnAbsent) | `x!` on a value that may be null or undefined checks nothing at run time; test it (`if (x === undefi |
| lint/lint.mjs:1337 | lint-refuse | bitwise | bitwise | one-decider | bitwise operands must be numbers; BigInt and opaque coercions need lane B |
| lint/lint.mjs:1339 | lint-refuse | unary-coercion | numbers | one-decider | unary + coerces; it is outside the subset |
| lint/lint.mjs:1345 | lint-refuse | delete | mutation | one-decider | `delete` is a statement, not a value |
| lint/lint.mjs:1346 | lint-refuse | receiver-write | mutation | one-decider | <RECEIVER_WRITE> |
| lint/lint.mjs:1346 | lint-refuse | delete | mutation | one-decider | delete on `${}`, which this function does not own |
| lint/lint.mjs:1346 | lint-refuse | alias-mutation | mutation | one-decider | <aliasMsg(root.text, o.decl, false)> |
| lint/lint.mjs:1346 | lint-refuse | dynamic-key | keys | one-decider | a dictionary key is a string |
| lint/lint.mjs:1347 | lint-refuse | delete | mutation | one-decider | delete of a field of this is outside the subset; assign undefined |
| lint/lint.mjs:1347 | lint-refuse | delete | mutation | one-decider | delete on `${}`, which this function does not own |
| lint/lint.mjs:1347 | lint-refuse | alias-mutation | mutation | one-decider | <aliasMsg(root.text, o.decl, false)> |
| lint/lint.mjs:1348 | lint-refuse | delete | mutation | one-decider | delete of this target is outside the subset |
| lint/lint.mjs:1350 | lint-refuse | void | unread-syntax | one-decider | `void` is outside the subset |
| lint/lint.mjs:1354 | lint-refuse | generator-use | generators | one-decider | yield is a statement; sent values need a step reading |
| lint/lint.mjs:1355 | lint-refuse | this | classes | one-decider | `this` outside a class method; a free function declares its receiver as a `this` parameter |
| lint/lint.mjs:1356 | lint-refuse | class | classes | one-decider | `super` is read only as `super.m(...)` or `super(...)` in a constructor, a call of the parent's meth |
| lint/lint.mjs:1357 | lint-refuse | class | classes | one-decider | classes are outside the subset |
| lint/lint.mjs:1361 | lint-refuse | unsupported-call | library | one-decider | new ${}(...) reads an array, a Map, a Set or one of their iterators; build the entries as an array f |
| lint/lint.mjs:1363 | lint-refuse | dynamic-eval | names | one-decider | `new Function` is outside the subset |
| lint/lint.mjs:1365 | lint-refuse | async | promises | shared (promiseForm) | `new Promise` inside an opaque promise call has no reading |
| lint/lint.mjs:1368 | lint-refuse | dynamic-eval | names | one-decider | `new ${}` is outside the subset |
| lint/lint.mjs:1368 | lint-refuse | prototype | prototype | one-decider | `new ${}` is outside the subset |
| lint/lint.mjs:1376 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | `new.target` reads how the function was called; it is outside the subset |
| lint/lint.mjs:1378 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | `import.meta.env` is injected at build time; read it outside the subset |
| lint/lint.mjs:1384 | lint-refuse | spread | arrays | shared (generatorReading) | spread works on arrays, sets, maps and their keys(), values() and entries() |
| lint/lint.mjs:1385 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | array holes are outside the subset |
| lint/lint.mjs:1390 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | literal getters need fixed named fields; use a class for spread or computed accessors |
| lint/lint.mjs:1391 | lint-refuse | spread-source | record-copy | shared (spreadReadWhy) | <why> |
| lint/lint.mjs:1393 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | spreading a method object rebinds its receiver and evaluates getters; copy data fields explicitly |
| lint/lint.mjs:1393 | lint-refuse | spread-source | record-copy | shared (copySource) | `{ ...${} }` copies every own key: ${} (escape spread_source) |
| lint/lint.mjs:1396 | lint-refuse | prototype | prototype | shared (literalProtoMember) | `__proto__:` in a literal sets the object's prototype, not a key; the value reading has only plain o |
| lint/lint.mjs:1400 | lint-refuse | dynamic-key | keys | one-decider | <why> |
| lint/lint.mjs:1405 | lint-refuse | iterator-protocol | object-literal-methods | one-decider | custom iterator protocol methods need a step reading; use a generator or an array |
| lint/lint.mjs:1412 | lint-refuse | closure-mutation | mutation | one-decider | a literal method cannot change a captured binding; use a class for shared state |
| lint/lint.mjs:1413 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | literal this reads scalar fields; reference-valued receiver state needs a class |
| lint/lint.mjs:1414 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | keep literal this as a direct data-field read; use a class for aliases or rebinding |
| lint/lint.mjs:1415 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | literal method fields are immutable; use a class for mutable receiver state |
| lint/lint.mjs:1416 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | literal method fields are immutable; use a class for mutable receiver state |
| lint/lint.mjs:1422 | lint-refuse | object-method-capture | object-literal-methods | one-decider | a literal method needs stable captured bindings; use a class for shared changing state |
| lint/lint.mjs:1431 | lint-refuse | object-method-capture | object-literal-methods | one-decider | a literal method captures an unchanging value; copy mutable data before capturing it |
| lint/lint.mjs:1435 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | literal setters and computed methods need a class accessor or a named method |
| lint/lint.mjs:1438 | lint-refuse | spread | arrays | one-decider | spread is allowed in array and record literals only |
| lint/lint.mjs:1440 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | expression ${} is outside the subset |
| lint/lint.mjs:1448 | lint-refuse | prototype | prototype | shared (plainObjectTest) | <po.refuse> |
| lint/lint.mjs:1452 | lint-refuse | division | numbers | one-decider | `/` on numbers is real division; write Math.floor(a / b) for integer division |
| lint/lint.mjs:1457 | lint-refuse | bitwise | bitwise | one-decider | bitwise operands must be numbers; BigInt and opaque coercions need lane B |
| lint/lint.mjs:1465 | lint-refuse | loose-equality | equality | one-decider | use === and !== with an object, bigint or symbol operand; between primitives == follows the coercion |
| lint/lint.mjs:1469 | lint-refuse | instanceof-constructor | instanceof | one-decider | use a named ordinary constructor for instanceof; dynamic constructors may run effects |
| lint/lint.mjs:1472 | lint-refuse | instanceof-constructor | instanceof | one-decider | use a class declaration for instanceof; a constructor value needs a runtime identity |
| lint/lint.mjs:1479 | lint-refuse | instanceof-constructor | instanceof | one-decider | a custom Symbol.hasInstance may run effects; use an ordinary constructor |
| lint/lint.mjs:1484 | lint-refuse | prototype | prototype | shared (inPrototypeReach) | this file makes an object whose prototype is not Object.prototype (line ${}), and ${}; `in` reads th |
| lint/lint.mjs:1485 | lint-refuse | dynamic-key | keys | shared (openRecordIn) | <why> |
| lint/lint.mjs:1489 | lint-refuse | bitwise | bitwise | one-decider | bitwise and shift operators are outside the subset |
| lint/lint.mjs:1495 | lint-refuse | mixed-types | equality | one-decider | + adds two numbers or joins to a string |
| lint/lint.mjs:1497 | lint-refuse | string-order | strings | one-decider | compare two strings, or convert both operands explicitly |
| lint/lint.mjs:1506 | lint-refuse | mixed-types | equality | one-decider | a value that is sometimes a primitive and sometimes a record or array compares with === only against |
| lint/lint.mjs:1507 | lint-refuse | reference-equality | equality | one-decider | === on arrays and records compares references; compare fields |
| lint/lint.mjs:1551 | lint-refuse | conditional-effect | logic-values | one-decider | move a call that changes its arguments into an explicit if branch so the updated values leave the br |
| lint/lint.mjs:1600 | lint-refuse | generator-bound | generators | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:1600 | lint-refuse | generator-effect | generators | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:1600 | lint-refuse | generator-use | generators | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:1602 | lint-refuse | hook-order | react | shared (reactHook) | a hook is called under a branch, a loop, a nested function or after an early return; hooks run at th |
| lint/lint.mjs:1609 | lint-refuse | prototype | prototype | shared (ownKeyTest) | <ok.refuse> |
| lint/lint.mjs:1610 | lint-refuse | optional-chain | optional-chain | one-decider | <why> |
| lint/lint.mjs:1617 | lint-refuse | unsupported-call | calls | one-decider | ${} takes ${} arguments |
| lint/lint.mjs:1618 | lint-refuse | generator-use | generators | one-decider | consume a pure generator directly in for-of, spread, Array.from or yield* |
| lint/lint.mjs:1619 | lint-refuse | async | promises | shared (promiseConsumed) | an async unit is called without await |
| lint/lint.mjs:1621 | lint-refuse | spread | arrays | one-decider | a spread argument goes to a rest parameter, as the last argument |
| lint/lint.mjs:1621 | lint-refuse | function-value | calls | one-decider | a same-file function takes values, not callbacks |
| lint/lint.mjs:1628 | lint-refuse | this | classes | one-decider | `this` outside a class method |
| lint/lint.mjs:1630 | lint-refuse | bound-function | calls | one-decider | `bind` fixes a receiver for a later call; call the function with its receiver instead |
| lint/lint.mjs:1631 | lint-refuse | unsupported-call | calls | one-decider | `call` and `apply` take the receiver first |
| lint/lint.mjs:1632 | lint-refuse | unsupported-call | calls | one-decider | `apply` takes its arguments as one array literal |
| lint/lint.mjs:1639 | lint-refuse | math-empty | library | one-decider | Math.min/max need a nonempty list; use xs.length > 0 ? Math.max(...xs) : a fallback |
| lint/lint.mjs:1640 | lint-refuse | spread | arrays | one-decider | Math sequence arguments must be numbers; narrow opaque values before spreading |
| lint/lint.mjs:1650 | lint-refuse | unsupported-call | calls | one-decider | ${}.${} takes ${} arguments |
| lint/lint.mjs:1651 | lint-refuse | generator-use | generators | one-decider | consume a static generator through a top-level generator function |
| lint/lint.mjs:1652 | lint-refuse | async | promises | shared (promiseConsumed) | an async unit is called without await |
| lint/lint.mjs:1659 | lint-refuse | opaque-mutation | mutation | one-decider | .${}() on `${}`, an opaque value${}, used as a value: the call may mutate it |
| lint/lint.mjs:1659 | lint-refuse | param-mutation | mutation | one-decider | .${}() on `${}`, an opaque value${}, used as a value: the call may mutate it |
| lint/lint.mjs:1668 | lint-refuse | async-predicate | callbacks | one-decider | ${} does not await its predicate: a Promise is truthy even when it resolves false; await values with |
| lint/lint.mjs:1669 | lint-refuse | async-reduce | callbacks | one-decider | reduce passes a Promise accumulator without waiting; use a for-of loop with await |
| lint/lint.mjs:1670 | lint-refuse | async-callback | callbacks | one-decider | ${} does not await its callbacks; use await Promise.all(xs.${}(...)) |
| lint/lint.mjs:1671 | lint-refuse | callback-form | callbacks | one-decider | a callback thisArg is outside the subset; capture the receiver in an arrow |
| lint/lint.mjs:1674 | lint-refuse | callback-result | callbacks | one-decider | an effectful type-predicate callback needs an explicit for-of loop with a type guard |
| lint/lint.mjs:1675 | lint-refuse | callback-result | callbacks | one-decider | a thenable callback needs an async arrow with an explicit await |
| lint/lint.mjs:1676 | lint-refuse | callback-result | callbacks | one-decider | an effectful flatMap callback returns either arrays on every path or scalar values on every path; us |
| lint/lint.mjs:1679 | lint-refuse | callback-form | callbacks | one-decider | an effectful array callback takes the element (and an index), or the accumulator and the element; an |
| lint/lint.mjs:1681 | lint-refuse | callback-form | callbacks | one-decider | <bad> |
| lint/lint.mjs:1683 | lint-refuse | promise-all-order | promises | one-decider | Promise.all does not order work after await; use a for-of loop with await for ordered effects |
| lint/lint.mjs:1686 | lint-refuse | callback-form | callbacks | one-decider | Promise.all callback loops take one element name and an optional index name |
| lint/lint.mjs:1700 | lint-refuse | foreach | callbacks | one-decider | forEach does not wait for an async callback: the function returns before the steps finish; write `fo |
| lint/lint.mjs:1704 | lint-refuse | foreach | callbacks | one-decider | forEach is read as a statement; put it in a block before returning a value |
| lint/lint.mjs:1711 | lint-refuse | foreach | callbacks | one-decider | forEach runs a callback for its effects; write `for (const x of xs)` so the state comes out of the l |
| lint/lint.mjs:1715 | lint-refuse | in-place-mutation | library | one-decider | ${} changes `${}` in place; write `${} = [...${}].${}(...)` |
| lint/lint.mjs:1715 | lint-refuse | param-mutation | mutation | one-decider | ${} changes `${}` in place; write `${} = [...${}].${}(...)` |
| lint/lint.mjs:1718 | lint-refuse | param-mutation | mutation | one-decider | push is a statement on a local only |
| lint/lint.mjs:1722 | lint-refuse | unsupported-call | library | one-decider | ${} needs a callback |
| lint/lint.mjs:1724 | lint-refuse | unsupported-call | library | one-decider | reduce needs a callback and an initial value |
| lint/lint.mjs:1727 | lint-refuse | function-value | calls | one-decider | unexpected callback |
| lint/lint.mjs:1731 | lint-refuse | unsupported-call | library | one-decider | Set.forEach is outside the subset; write for (const x of s) |
| lint/lint.mjs:1731 | lint-refuse | collection-iterator | library | one-decider | s.${}() is an iterator its first read uses up; spread it, loop over it with for-of or pass it to Arr |
| lint/lint.mjs:1732 | lint-refuse | unsupported-call | library | one-decider | Map.forEach is outside the subset; write for (const [k, v] of m) |
| lint/lint.mjs:1732 | lint-refuse | collection-iterator | library | one-decider | m.${}() is an iterator its first read uses up; spread it, loop over it with for-of or pass it to Arr |
| lint/lint.mjs:1739 | lint-refuse | unsupported-call | library | one-decider | .toString() on ${} reads Object.prototype.toString or the object's own toString, a prototype this un |
| lint/lint.mjs:1740 | lint-refuse | unsupported-call | library | one-decider | method .${}() on ${} is outside the subset; narrow the union with typeof or Array.isArray first so t |
| lint/lint.mjs:1741 | lint-refuse | unsupported-call | calls | one-decider | method .${}() on ${} is outside the subset |
| lint/lint.mjs:1745 | lint-refuse | unsupported-call | calls | one-decider | calls through computed callees are outside the subset |
| lint/lint.mjs:1754 | lint-refuse | update-expression | operators-as-values | one-decider | <msg> |
| lint/lint.mjs:1754 | lint-refuse | assignment-expression | operators-as-values | one-decider | <msg> |
| lint/lint.mjs:1757 | lint-refuse | unsupported-call | library | shared (ARRAY_VALUE_MUTATORS) | splice as a value takes plain arguments |
| lint/lint.mjs:1758 | lint-refuse | unsupported-call | library | shared (ARRAY_VALUE_MUTATORS) | .${}() in an optional chain changes a receiver that may be absent; check it first |
| lint/lint.mjs:1762 | lint-refuse | unsupported-call | library | shared (ARRAY_VALUE_MUTATORS) | .${}() as a value changes `${}`; call it on a local array or on a fresh one |
| lint/lint.mjs:1763 | lint-refuse | param-mutation | mutation | shared (ARRAY_VALUE_MUTATORS) | .${}() as a value changes the parameter `${}`; copy it to a local first |
| lint/lint.mjs:1764 | lint-refuse | alias-mutation | mutation | shared (ARRAY_VALUE_MUTATORS) | `${}` is another name for a value this function was handed; copy it first |
| lint/lint.mjs:1765 | lint-refuse | closure-mutation | mutation | shared (ARRAY_VALUE_MUTATORS) | .${}() as a value inside a callback changes `${}`; use a for-of loop |
| lint/lint.mjs:1767 | lint-refuse | mutator-value | library | shared (ARRAY_VALUE_MUTATORS) | .${}() as a value runs only on some paths here (a condition, a short circuit, a loop header); bind i |
| lint/lint.mjs:1768 | lint-refuse | mutator-value | library | shared (ARRAY_VALUE_MUTATORS) | `${}` is read again in the statement that calls .${}() on it; read it in its own statement |
| lint/lint.mjs:1772 | lint-refuse | unsupported-call | library | one-decider | fill takes a value and an optional start and end |
| lint/lint.mjs:1773 | lint-refuse | in-place-mutation | library | shared (freshArray) | fill changes its receiver in place and returns it; fill a fresh array (`new Array(n).fill(v)`, `[... |
| lint/lint.mjs:1777 | lint-refuse | unsupported-call | library | one-decider | toReversed takes no argument |
| lint/lint.mjs:1778 | lint-refuse | unsupported-call | library | one-decider | toSorted takes one comparator |
| lint/lint.mjs:1779 | lint-refuse | callback-form | callbacks | one-decider | the comparator of toSorted is a pure function of two elements |
| lint/lint.mjs:1784 | lint-refuse | unsupported-call | library | one-decider | ${} takes one callback |
| lint/lint.mjs:1785 | lint-refuse | callback-form | callbacks | one-decider | the callback of ${} takes the element only (an index counts from the end); use a for loop over the i |
| lint/lint.mjs:1786 | lint-refuse | callback-form | callbacks | one-decider | the callback of ${} is a pure predicate; an effect needs a for loop |
| lint/lint.mjs:1790 | lint-refuse | unsupported-call | library | one-decider | lastIndexOf takes one value (a start index stays out) |
| lint/lint.mjs:1792 | lint-refuse | unsupported-call | library | one-decider | lastIndexOf compares by identity; on objects it is outside the subset |
| lint/lint.mjs:1795 | lint-refuse | unsupported-call | library | one-decider | toString on an array takes no argument |
| lint/lint.mjs:1796 | lint-refuse | unsupported-call | library | shared (primitiveText) | toString with a radix is read on numbers only |
| lint/lint.mjs:1800 | lint-refuse | unsupported-call | library | shared (LOCALE_READS) | .${}() reads the host's locale (a world read); call it in a map, filter, find, findIndex, some, ever |
| lint/lint.mjs:1801 | lint-refuse | unsupported-call | library | shared (LOCALE_READS) | .${}() takes plain arguments |
| lint/lint.mjs:1804 | lint-refuse | unsupported-call | library | one-decider | substr takes a numeric start and an optional numeric length |
| lint/lint.mjs:1807 | lint-refuse | unsupported-call | library | one-decider | matchAll takes one pattern |
| lint/lint.mjs:1808 | lint-refuse | unsupported-call | library | one-decider | matchAll needs the g flag; without it the call throws a TypeError |
| lint/lint.mjs:1811 | lint-refuse | unsupported-call | library | one-decider | matchAll needs the g flag (and not y); without it the call throws a TypeError |
| lint/lint.mjs:1813 | lint-refuse | unsupported-call | library | one-decider | matchAll starts at its pattern's lastIndex, which another call may have moved; pass a regular expres |
| lint/lint.mjs:1815 | lint-refuse | unsupported-call | library | one-decider | search takes one pattern |
| lint/lint.mjs:1827 | lint-refuse | callback-form | callbacks | one-decider | ${} is read as a callback only through an arrow; write `(x) => ${}(x)` with the arguments it reads |
| lint/lint.mjs:1828 | lint-refuse | callback-form | callbacks | one-decider | ${} as a callback is read for map${}; write an inline arrow for ${} |
| lint/lint.mjs:1832 | lint-refuse | async-callback | callbacks | one-decider | Promise.all over the named async function `${}` needs an inline async arrow so its awaits are read i |
| lint/lint.mjs:1838 | lint-refuse | callback-form | callbacks | one-decider | a class method passed as a callback loses its receiver; write an inline arrow |
| lint/lint.mjs:1839 | lint-refuse | async | promises | one-decider | an async function cannot be a callback |
| lint/lint.mjs:1840 | lint-refuse | callback-form | callbacks | one-decider | a generator passed as a callback returns its iterator; write an inline arrow |
| lint/lint.mjs:1841 | lint-refuse | callback-form | callbacks | one-decider | `${}` is generic; pass it through an inline arrow so its type arguments are fixed |
| lint/lint.mjs:1842 | lint-refuse | callback-form | callbacks | one-decider | a named effectful callback takes plain parameters, at most ${} (what ${} passes); write an inline ar |
| lint/lint.mjs:1843 | lint-refuse | callback-form | callbacks | one-decider | `${}` changes its argument, which here is the array's element; write an inline arrow that copies it |
| lint/lint.mjs:1847 | lint-refuse | callback-form | callbacks | one-decider | a named effectful callback takes plain parameters, at most ${} (what ${} passes); write an inline ar |
| lint/lint.mjs:1848 | lint-refuse | callback-form | callbacks | one-decider | an effectful array callback needs an inline arrow so its world transitions are read in array order |
| lint/lint.mjs:1850 | lint-refuse | callback-result | callbacks | one-decider | an effectful type-predicate callback needs an explicit for-of loop with a type guard |
| lint/lint.mjs:1851 | lint-refuse | callback-result | callbacks | one-decider | an effectful flatMap callback returns either arrays on every path or scalar values on every path; us |
| lint/lint.mjs:1853 | lint-refuse | unsupported-call | library | one-decider | reduce needs a callback and an initial value |
| lint/lint.mjs:1967 | lint-refuse | callback-control | exceptions | shared (syncLoopCallback) | try, throw or a return from an inner loop in a callback needs an explicit for-of loop |
| lint/lint.mjs:1977 | lint-refuse | callback-form | callbacks | one-decider | a class method cannot be passed as a callback |
| lint/lint.mjs:1977 | lint-refuse | async | promises | one-decider | an async function cannot be a callback |
| lint/lint.mjs:1977 | lint-refuse | callback-form | callbacks | one-decider | the callback takes at most ${} plain parameter(s) |
| lint/lint.mjs:1979 | lint-refuse | callback-form | callbacks | one-decider | a callback is an arrow function, a same-file function or a local function value |
| lint/lint.mjs:1981 | lint-refuse | callback-form | callbacks | one-decider | the callback must be an arrow function |
| lint/lint.mjs:1983 | lint-refuse | async | promises | one-decider | async callbacks are outside the subset |
| lint/lint.mjs:1984 | lint-refuse | callback-form | callbacks | one-decider | the callback takes at most ${} plain parameter(s); a default is read only where the parameter's type |
| lint/lint.mjs:2015 | lint-refuse | react-handler-capture | react | shared (arrowOf) | a React closure captures a changing local; capture a const value or use a state setter |
| lint/lint.mjs:2023 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | a local component value must be a string tag name or a named component |
| lint/lint.mjs:2024 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | tag form ${} is outside the subset |
| lint/lint.mjs:2029 | lint-refuse | callback-form | callbacks | one-decider | a handler is an arrow function |
| lint/lint.mjs:2040 | lint-refuse | spread | arrays | one-decider | spread arguments need an ordinary array or a fixed tuple; open tuples and custom iterables are outsi |
| lint/lint.mjs:2050 | lint-refuse | spread | arrays | one-decider | bind same-file call arguments inside an if statement before spreading; conditional expressions do no |
| lint/lint.mjs:2131 | lint-refuse | spread | arrays | one-decider | spread arguments need an outside callee or a supported sequence operation |
| lint/lint.mjs:2136 | lint-refuse | object-method-mutation | object-literal-methods | one-decider | call a literal method on its object; detached methods need an explicit receiver |
| lint/lint.mjs:2140 | lint-refuse | prototype | prototype | one-decider | `this.constructor` is the run-time class of the receiver, a subclass too; name the class to read its |
| lint/lint.mjs:2143 | lint-refuse | prototype | prototype | one-decider | `.${}` reaches the prototype chain |
| lint/lint.mjs:2144 | lint-refuse | global-read | names | one-decider | `${}` is a static method used as a value; call it, or pass an arrow that calls it |
| lint/lint.mjs:2163 | lint-refuse | unsupported-member | members | one-decider | property .${} on ${}: constrain the type parameter to one record declaring it |
| lint/lint.mjs:2166 | lint-refuse | unsupported-member | members | one-decider | `.${}` called through apply or call is not the direct call here: ${}; call it on the array: `a.${}(. |
| lint/lint.mjs:2167 | lint-refuse | unsupported-member | members | one-decider | <memberRow(name === 'index' ? 'match-index' : 'match-groups')> |
| lint/lint.mjs:2168 | lint-refuse | unsupported-member | members | one-decider | property .${} on ${} is outside the subset |
| lint/lint.mjs:2170 | lint-refuse | dynamic-key | keys | shared (OPEN_RECORD_WHY, openRecordType) | <w.why> |
| lint/lint.mjs:2170 | lint-refuse | prototype | prototype | shared (OPEN_RECORD_WHY, openRecordType) | <w.why> |
| lint/lint.mjs:2171 | lint-refuse | unsupported-member | members | one-decider | property .${} is not declared on ${} |
| lint/lint.mjs:2202 | lint-refuse | arguments | names | one-decider | `arguments` is the actual argument vector, not the declared one; name the parameter, or declare a re |
| lint/lint.mjs:2211 | lint-refuse | prototype | prototype | one-decider | this bracket key reaches the prototype chain; read a declared data field |
| lint/lint.mjs:2219 | lint-refuse | dynamic-key | keys | one-decider | narrow the record receiver before indexing it |
| lint/lint.mjs:2225 | lint-refuse | dynamic-key | keys | shared (OPEN_RECORD_WHY, openRecordType) | <w.why> |
| lint/lint.mjs:2225 | lint-refuse | prototype | prototype | shared (OPEN_RECORD_WHY, openRecordType) | <w.why> |
| lint/lint.mjs:2225 | lint-refuse | dynamic-key | keys | shared (openRecordType) | bind the computed key before reading the record; a key call may mutate its receiver |
| lint/lint.mjs:2226 | lint-refuse | dynamic-key | keys | one-decider | <why> |
| lint/lint.mjs:2230 | lint-refuse | dynamic-key | keys | one-decider | bind the computed key before reading the record; a key call may mutate its receiver |
| lint/lint.mjs:2231 | lint-refuse | dynamic-key | keys | one-decider | read a literal getter by its declared property name |
| lint/lint.mjs:2233 | lint-refuse | dynamic-key | keys | shared (openRecordType) | <w.why> |
| lint/lint.mjs:2233 | lint-refuse | prototype | prototype | shared (openRecordType) | <w.why> |
| lint/lint.mjs:2234 | lint-refuse | dynamic-key | keys | shared (OPEN_RECORD_WHY, openRecordType) | <INDEX_WHY> |
| lint/lint.mjs:2235 | lint-refuse | dynamic-key | keys | one-decider | key ${} is not declared on ${} |
| lint/lint.mjs:2236 | lint-refuse | dynamic-key | keys | one-decider | call a method by its declared name; computed record reads select data fields |
| lint/lint.mjs:2240 | lint-refuse | dynamic-key | keys | one-decider | index an array or string by a number, or a record by declared string keys |
| lint/lint.mjs:2250 | lint-refuse | promise | promises | one-decider | a Promise-returning function must return a promise or be async |
| lint/lint.mjs:2252 | lint-refuse | promise | promises | one-decider | a promise built with new Promise is not a handle; make the function async |
| lint/lint.mjs:2256 | lint-refuse | promise | promises | one-decider | a same-file async function runs on after its first await; return it from an async function with awai |
| lint/lint.mjs:2257 | lint-refuse | promise | promises | one-decider | a promise read out of a collection has no identity in the reading; return the call that made it |
| lint/lint.mjs:2262 | lint-refuse | promise | promises | one-decider | a held promise of this result type has no identity in the reading; return the call itself |
| lint/lint.mjs:2265 | lint-refuse | promise | promises | one-decider | return the promise from a call, a name or a conditional, or make the function async |
| lint/lint.mjs:2286 | lint-refuse | this-param | classes | shared (untypedThisParam) | <why> |
| lint/lint.mjs:2287 | lint-refuse | promise-executor | promises | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:2287 | lint-refuse | promise-executor-escape | promises | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:2287 | lint-refuse | promise-unsettled | promises | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:2288 | lint-refuse | unsupported-syntax | unread-syntax | one-decider | function without a body |
| lint/lint.mjs:2295 | lint-refuse | param-form | declarations | one-decider | a rest parameter is an array |
| lint/lint.mjs:2309 | lint-refuse | toplevel-state | module-state | one-decider | bind module state to a plain name |
| lint/lint.mjs:2310 | lint-refuse | toplevel-effect | module-state | one-decider | move the effectful module initializer into a function |
| lint/lint.mjs:2317 | lint-refuse | class | classes | one-decider | an anonymous class is outside the subset |
| lint/lint.mjs:2324 | lint-refuse | promise-executor | promises | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:2324 | lint-refuse | promise-executor-escape | promises | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:2324 | lint-refuse | promise-unsettled | promises | shared (generatorReading) | <shape.message> |
| lint/lint.mjs:2331 | lint-refuse | param-form | declarations | one-decider | a rest parameter is an array |
| lint/lint.mjs:2344 | lint-refuse | toplevel-effect | module-state | one-decider | code at module level runs on import; it is outside the subset |
| lint/lint.mjs:2356 | lint-refuse | exception-binding | exceptions | one-decider | use a distinct name for a local that shadows a value read by finally |
| lint/lint.mjs:2361 | lint-refuse | exception-return | exceptions | one-decider | return a primitive or copy the value; finally can change the returned alias |
| lint/lint.mjs:2409 | lint-refuse | implicit-this | classes | one-decider | TS${}: `this` the function does not declare; declare the receiver as a `this` parameter |
| lint/lint.mjs:2427 | lint-refuse | update-expression | operators-as-values | one-decider | <msg> |
| lint/lint.mjs:2427 | lint-refuse | assignment-expression | operators-as-values | one-decider | <msg> |
| lint/lint.mjs:2445 | lint-advice | nested-ternary | advice | advice | a branch contains another conditional expression; nested if statements preserve its evaluation order |
| lint/lint.mjs:2448 | lint-advice | inner-html | advice | advice | this HTML property receives a value that is not a literal; use textContent if the intent is plain te |
| lint/lint.mjs:2453 | lint-advice | inner-html | advice | advice | document.write parses HTML and changes the document; choose an element for textContent |
| lint/lint.mjs:2460 | lint-advice | promise-all-order | advice | advice | this loop awaits one call per element; Promise.all needs independent calls that commute in the world |
| lint/lint.mjs:2484 | lint-refuse | any-type | advice | one-decider | any-type could not read this file: ${} |
| translate/translate.mjs:87 | translate-throw |  | proof-shape | one-decider | no top-level function named ${} in ${} |
| translate/translate.mjs:88 | translate-throw |  | proof-shape | one-decider | --fn is required unless --core is given |
| translate/translate.mjs:153 | translate-refuse |  | proof-shape | one-decider | no top-level function or class method named ${} |
| translate/translate.mjs:177 | translate-throw |  | translator-internal | one-decider | outside the subset: ${} |
| translate/translate.mjs:518 | translate-refuse |  | callbacks | one-decider | ${} has no call signature to read as a callback |
| translate/translate.mjs:552 | translate-refuse |  | callbacks | one-decider | ${} returns a promise; an async callback needs an inline arrow under Promise.all |
| translate/translate.mjs:556 | translate-refuse |  | calls | one-decider | callee ${} was not translated |
| translate/translate.mjs:557 | translate-refuse |  | callbacks | one-decider | ${} changes its argument; a callback's argument is the array's element |
| translate/translate.mjs:558 | translate-refuse |  | callbacks | one-decider | ${} is generic; pass it through an inline arrow |
| translate/translate.mjs:584 | translate-refuse |  | callbacks | one-decider | parseInt reads the index JavaScript passes as its radix |
| translate/translate.mjs:585 | translate-refuse |  | callbacks | one-decider | ${} has no reading as a callback |
| translate/translate.mjs:771 | translate-refuse | property-assign | mutation | lowering (INSTALLS_FUNCTION_WHY, installsFunction) | property-assign: ${} |
| translate/translate.mjs:845 | translate-refuse | this-param | classes | shared (untypedThisParam) | this-param: ${} |
| translate/translate.mjs:846 | translate-refuse | this | classes | one-decider | this: `this` outside a class method; a free function declares its receiver as a `this` parameter |
| translate/translate.mjs:900 | translate-refuse | internal | translator-internal | one-decider | internal: a static cell read in a pure unit |
| translate/translate.mjs:1062 | translate-refuse |  | types | one-decider | type nesting too deep |
| translate/translate.mjs:1074 | translate-refuse |  | types | one-decider | type parameter ${} is not one of this function's |
| translate/translate.mjs:1095 | translate-refuse |  | types | one-decider | array-like type ${} has no element type |
| translate/translate.mjs:1096 | translate-refuse | reference-key | types | one-decider | reference-key: a ${} by ${} compares by reference (SameValueZero); the value reading would equate tw |
| translate/translate.mjs:1113 | translate-refuse |  | types | one-decider | type ${} is not translatable |
| translate/translate.mjs:1291 | translate-refuse |  | types | one-decider | union type ${} is not translatable |
| translate/translate.mjs:1330 | translate-refuse |  | types | one-decider | a field named ${} or ${} is the open record's own slot |
| translate/translate.mjs:1369 | translate-refuse |  | translator-internal | one-decider | ${} reads or writes a metadata cell of the world in a unit not marked effectful |
| translate/translate.mjs:1421 | translate-refuse | promise-handler | promises | shared (namedPromiseHandler, promiseForm) |  |
| translate/translate.mjs:1421 | translate-refuse | promise-thenable | promises | shared (namedPromiseHandler, promiseForm) |  |
| translate/translate.mjs:1422 | translate-refuse |  | names | one-decider | ${} is a function value; call it |
| translate/translate.mjs:1428 | translate-refuse | internal | translator-internal | one-decider | internal: an effect in a unit not marked effectful (${}) |
| translate/translate.mjs:1495 | translate-refuse |  | arrays | one-decider | spread arguments need an ordinary array |
| translate/translate.mjs:1696 | translate-refuse |  | translator-internal | one-decider | no helper ${} |
| translate/translate.mjs:1705 | translate-refuse | number-special | numbers | one-decider | number-special: a non-finite literal needs the opaque numeric reading |
| translate/translate.mjs:1707 | translate-refuse |  | numbers | one-decider | number literal ${} is not an integer; use --real |
| translate/translate.mjs:1733 | translate-refuse |  | promises | one-decider | a promise a same-file async unit returns, stored as a handle: the call reads its settled value, so n |
| translate/translate.mjs:1766 | translate-refuse | type-assertion | type-assertion | shared (typeAssertion) | type-assertion: ${} |
| translate/translate.mjs:1814 | translate-refuse | string-code-unit | strings | lowering (loneSurrogate) | string-code-unit: ${} |
| translate/translate.mjs:1910 | translate-refuse |  | operators-as-values | one-decider | value updates need --core |
| translate/translate.mjs:1923 | translate-refuse |  | mutation | one-decider | assignment value needs a named array or dictionary |
| translate/translate.mjs:1930 | translate-refuse | assignment-expression | operators-as-values | lowering (valueAssignmentWhy) | assignment-expression: ${} |
| translate/translate.mjs:1955 | translate-refuse | prototype | prototype | shared (moduleState, protoKeyWrite) | prototype: a key that may be '__proto__' with an object or null value replaces the prototype |
| translate/translate.mjs:2002 | translate-refuse | internal | translator-internal | one-decider | internal: an effect in a conditional branch of a pure unit |
| translate/translate.mjs:2054 | translate-refuse |  | names | one-decider | ${} is a function value; call it |
| translate/translate.mjs:2120 | translate-refuse |  | classes | one-decider | `this` outside a class method |
| translate/translate.mjs:2160 | translate-refuse | non-null-assertion | non-null-assertion | shared (nonNullOnAbsent) | non-null-assertion: `x!` on a value that may be null or undefined |
| translate/translate.mjs:2176 | translate-refuse |  | names | one-decider | new.target is not translated |
| translate/translate.mjs:2197 | translate-refuse |  | unread-syntax | one-decider | expression ${} is not translated |
| translate/translate.mjs:2212 | translate-refuse |  | promises | one-decider | an opaque promise call requires an effectful unit |
| translate/translate.mjs:2300 | translate-refuse | definite-assignment | declarations | shared (definiteAssignmentRead) | definite-assignment: `let v!: T` may be read before its first assignment |
| translate/translate.mjs:2316 | translate-refuse | promise-handler | promises | one-decider | promise-handler: this statement has no inline continuation reading |
| translate/translate.mjs:2331 | translate-refuse | promise-handler | promises | one-decider | promise-handler: a promise returned from an opaque block of a throwing handler is not read |
| translate/translate.mjs:2341 | translate-refuse | promise-handler | promises | shared (namedPromiseHandler) |  |
| translate/translate.mjs:2341 | translate-refuse | promise-thenable | promises | shared (namedPromiseHandler) |  |
| translate/translate.mjs:2350 | translate-refuse | promise-handler | promises | shared (namedPromiseHandler) | promise-handler: a named handler mutates its argument |
| translate/translate.mjs:2384 | translate-refuse | promise-pending | promises | shared (promiseConsumed) | promise-pending: await or return the promise directly |
| translate/translate.mjs:2385 | translate-refuse |  | promises | one-decider | promise forms require an effectful core unit |
| translate/translate.mjs:2402 | translate-refuse | generator-bound | generators | shared (executorShape) |  |
| translate/translate.mjs:2402 | translate-refuse | generator-effect | generators | shared (executorShape) |  |
| translate/translate.mjs:2402 | translate-refuse | generator-use | generators | shared (executorShape) |  |
| translate/translate.mjs:2405 | translate-refuse | promise-unsettled | promises | shared (executorShape) | promise-unsettled: an executor path does not settle |
| translate/translate.mjs:2407 | translate-refuse | promise-combinator | promises | one-decider | promise-combinator: completion order is not read |
| translate/translate.mjs:2435 | translate-refuse | internal | translator-internal | one-decider | internal: await in a unit not marked effectful |
| translate/translate.mjs:2443 | translate-refuse | internal | translator-internal | one-decider | internal: await in a unit not marked effectful |
| translate/translate.mjs:2466 | translate-refuse | prototype | prototype | shared (plainObjectTest) |  |
| translate/translate.mjs:2558 | translate-refuse | conditional-effect | logic-values | one-decider | conditional-effect: move the effect into an explicit if statement |
| translate/translate.mjs:2572 | translate-refuse | prototype | prototype | shared (inPrototypeReach) | prototype: this file makes an object whose prototype is not Object.prototype (line ${}), and ${}; `i |
| translate/translate.mjs:2573 | translate-refuse | dynamic-key | keys | shared (openRecordIn) | dynamic-key: ${} |
| translate/translate.mjs:2620 | translate-refuse |  | equality | one-decider | loose equality on a non-primitive operand is not translated |
| translate/translate.mjs:2723 | translate-refuse | prototype | prototype | shared (literalProtoMember) | prototype: `__proto__:` in a literal sets the prototype, not a key |
| translate/translate.mjs:2724 | translate-refuse | spread-source | record-copy | shared (copySource) | spread-source: ${} |
| translate/translate.mjs:2801 | translate-refuse |  | keys | one-decider | a computed key on a record with declared keys is a literal or a union of literals |
| translate/translate.mjs:2819 | translate-refuse | spread-source | record-copy | shared (spreadReadWhy) | spread-source: ${} |
| translate/translate.mjs:2827 | translate-refuse | spread-source | record-copy | one-decider | spread-source: a method or a function value beside a later spread is not read |
| translate/translate.mjs:2845 | translate-refuse |  | keys | one-decider | the fields of a computed key union have different types |
| translate/translate.mjs:3083 | translate-refuse |  | callbacks | one-decider | ${} is not a function |
| translate/translate.mjs:3089 | translate-refuse |  | callbacks | one-decider | ${} has effects; it cannot be a callback |
| translate/translate.mjs:3094 | translate-refuse |  | callbacks | one-decider | ${} is not a same-file function or a local function value |
| translate/translate.mjs:3096 | translate-refuse |  | callbacks | one-decider | an effect inside a callback; the order of its world transitions is not defined |
| translate/translate.mjs:3110 | translate-refuse |  | callbacks | one-decider | callback path ends without a return |
| translate/translate.mjs:3121 | translate-refuse |  | react | one-decider | a hook result is taken apart field by field |
| translate/translate.mjs:3121 | translate-refuse |  | react | one-decider | ${} is not a field the hook table declares for ${} |
| translate/translate.mjs:3132 | translate-refuse |  | destructuring | one-decider | record rest needs a typed source record |
| translate/translate.mjs:3134 | translate-refuse |  | destructuring | one-decider | a computed key in a record rest pattern is not translated |
| translate/translate.mjs:3178 | translate-refuse |  | destructuring | one-decider | a rest element of a tuple or an opaque value is not translated |
| translate/translate.mjs:3186 | translate-refuse |  | destructuring | one-decider | pattern is not translated |
| translate/translate.mjs:3207 | translate-refuse |  | names | shared (moduleState) | ${}.${} is a function; call it |
| translate/translate.mjs:3212 | translate-refuse | internal | translator-internal | one-decider | internal: a world field read in a pure method |
| translate/translate.mjs:3217 | translate-refuse | internal | translator-internal | one-decider | internal: a world field read in a pure unit |
| translate/translate.mjs:3246 | translate-refuse |  | members | one-decider | property .${} on ${}: the constraint declares no such member |
| translate/translate.mjs:3248 | translate-refuse |  | optional-chain | one-decider | ?. on a type parameter is not translated |
| translate/translate.mjs:3387 | translate-refuse | absent-number | absence | one-decider | absent-number: ${} of a local that holds a dictionary read typed without undefined and may change; b |
| translate/translate.mjs:3422 | translate-refuse |  | keys | one-decider | an absent key reads undefined, which this value type leaves out |
| translate/translate.mjs:3447 | translate-refuse | prototype | prototype | one-decider | prototype: ${} names a member of Object.prototype, which an open record reads through its prototype, |
| translate/translate.mjs:3449 | translate-refuse | dynamic-key | keys | shared (OPEN_RECORD_WHY) | dynamic-key: ${} |
| translate/translate.mjs:3461 | translate-refuse |  | keys | one-decider | tuple index must be a literal |
| translate/translate.mjs:3484 | translate-refuse |  | keys | one-decider | key ${} is not a declared data field |
| translate/translate.mjs:3525 | translate-refuse | internal | translator-internal | one-decider | internal: a same-file constructor called from a pure unit |
| translate/translate.mjs:3529 | translate-refuse |  | calls | one-decider | the constructor of ${} was not translated |
| translate/translate.mjs:3565 | translate-refuse |  | library | shared (freshArray) | .${}() as a value needs a local array or a fresh one |
| translate/translate.mjs:3619 | translate-refuse |  | arrays | one-decider | a spread among other arguments is not translated |
| translate/translate.mjs:3636 | translate-refuse |  | calls | one-decider | ${} needs ${} arguments |
| translate/translate.mjs:3673 | translate-refuse |  | proof-shape | one-decider | unknown record enumeration needs the world; use --core |
| translate/translate.mjs:3722 | translate-refuse |  | calls | one-decider | callee ${} was not translated |
| translate/translate.mjs:3732 | translate-refuse |  | calls | one-decider | callee ${} was not translated |
| translate/translate.mjs:3733 | translate-refuse |  | proof-shape | one-decider | ${} loops, so it is a Dafny method and cannot be called inside an expression |
| translate/translate.mjs:3738 | translate-refuse |  | calls | one-decider | the argument for `${}`, which ${} changes, must be a name or a fresh literal |
| translate/translate.mjs:3740 | translate-refuse | internal | translator-internal | one-decider | internal: effectful callee in a pure unit |
| translate/translate.mjs:3750 | translate-refuse | internal | translator-internal | one-decider | internal: effectful callee in a pure unit |
| translate/translate.mjs:3765 | translate-refuse | optional-chain | optional-chain | one-decider | optional-chain: an optional call beside an assignment, update or comma is not read |
| translate/translate.mjs:3771 | translate-refuse | optional-chain | optional-chain | one-decider | optional-chain: the callee is not a local function value |
| translate/translate.mjs:3800 | translate-refuse | optional-chain | optional-chain | one-decider | optional-chain: the callee is not a declared field |
| translate/translate.mjs:3820 | translate-refuse | optional-chain | optional-chain | one-decider | optional-chain: a computed callee is not read |
| translate/translate.mjs:3823 | translate-refuse | optional-chain | optional-chain | one-decider | optional-chain: an overloaded or generic optional callee is not read |
| translate/translate.mjs:3864 | translate-refuse |  | react | one-decider | a lazy initializer with more than a return is not read |
| translate/translate.mjs:3892 | translate-refuse |  | calls | one-decider | `apply` takes its arguments as one array literal |
| translate/translate.mjs:3893 | translate-refuse |  | calls | one-decider | `call` and `apply` take the receiver first |
| translate/translate.mjs:3898 | translate-refuse |  | calls | one-decider | an array method called through ${} is not the direct call here: ${} |
| translate/translate.mjs:3901 | translate-refuse |  | translator-internal | one-decider | hook ${} is a world transition in a unit not marked effectful |
| translate/translate.mjs:3907 | translate-refuse |  | translator-internal | one-decider | hook ${} is a world transition in a unit not marked effectful |
| translate/translate.mjs:3913 | translate-refuse | prototype | prototype | shared (ownKeyTest) |  |
| translate/translate.mjs:3917 | translate-refuse | prototype | prototype | lowering (nullPrototypeCreate) | prototype: ${} |
| translate/translate.mjs:3935 | translate-refuse |  | calls | one-decider | call through a computed callee is not translated |
| translate/translate.mjs:3982 | translate-refuse | internal | translator-internal | one-decider | internal: effectful method called from a pure method |
| translate/translate.mjs:4004 | translate-refuse |  | calls | one-decider | callee ${} was not translated |
| translate/translate.mjs:4008 | translate-refuse | internal | translator-internal | one-decider | internal: effectful method called from a pure unit |
| translate/translate.mjs:4047 | translate-refuse | math-empty | library | one-decider | math-empty: provide a nonempty argument list |
| translate/translate.mjs:4129 | translate-refuse |  | library | one-decider | array method .${}() is not translated |
| translate/translate.mjs:4187 | translate-refuse |  | library | one-decider | Set.${}() is not translated as an expression |
| translate/translate.mjs:4200 | translate-refuse |  | library | one-decider | Map.${}() is not translated as an expression |
| translate/translate.mjs:4220 | translate-refuse |  | control-flow | one-decider | bare return |
| translate/translate.mjs:4361 | translate-refuse |  | control-flow | one-decider | a case declaration shadows a name the switch head assigns |
| translate/translate.mjs:4407 | translate-refuse |  | control-flow | one-decider | a path ends without a return |
| translate/translate.mjs:4424 | translate-refuse |  | control-flow | one-decider | statement ${} cannot be an expression |
| translate/translate.mjs:4442 | translate-refuse |  | exceptions | one-decider | throw is translated in --core mode only |
| translate/translate.mjs:4496 | translate-refuse |  | unread-syntax | one-decider | statement ${} is not translated |
| translate/translate.mjs:4516 | translate-refuse | receiver-write | mutation | shared (thisParamPath) | receiver-write: a free function writes a nonoptional data record receiver |
| translate/translate.mjs:4519 | translate-refuse | receiver-mutation | mutation | shared (receiverRecordPath) | receiver-mutation: a receiver path needs nonoptional data records |
| translate/translate.mjs:4521 | translate-refuse | alias-mutation | mutation | one-decider | alias-mutation: `${}` is the element a loop or an array callback walks; this reading copies it, so a |
| translate/translate.mjs:4532 | translate-refuse |  | mutation | one-decider | field ${} is not a declared field of a record |
| translate/translate.mjs:4544 | translate-refuse |  | mutation | one-decider | assignment through an optional field is not translated |
| translate/translate.mjs:4569 | translate-refuse |  | mutation | one-decider | an element write through a value that is not an array |
| translate/translate.mjs:4576 | translate-refuse |  | mutation | one-decider | field ${} is not a declared field of a record |
| translate/translate.mjs:4585 | translate-refuse |  | mutation | one-decider | assignment through an optional field is not translated |
| translate/translate.mjs:4621 | translate-refuse |  | module-state | shared (moduleState) | a logical module assignment uses the opaque unit reading |
| translate/translate.mjs:4632 | translate-refuse |  | module-state | one-decider | a logical static assignment is outside the reading |
| translate/translate.mjs:4641 | translate-refuse | prototype | prototype | shared (protoKeyWrite) | prototype: a key that may be '__proto__' with an object or null value replaces the prototype |
| translate/translate.mjs:4649 | translate-refuse |  | mutation | one-decider | index assignment on a non-array |
| translate/translate.mjs:4662 | translate-refuse | internal | translator-internal | one-decider | internal: an outside write in a pure unit |
| translate/translate.mjs:4666 | translate-refuse | internal | translator-internal | one-decider | internal: a world field written in a pure unit |
| translate/translate.mjs:4686 | translate-refuse |  | mutation | one-decider | a compound assignment on an optional field is not translated |
| translate/translate.mjs:4687 | translate-refuse |  | mutation | one-decider | assignment operator is not translated |
| translate/translate.mjs:4699 | translate-refuse | internal | translator-internal | one-decider | internal: a world field written in a pure method |
| translate/translate.mjs:4703 | translate-refuse |  | mutation | one-decider | delete of a field of this is not translated; assign undefined |
| translate/translate.mjs:4704 | translate-refuse |  | mutation | one-decider | delete of `${}`, a field that is not optional |
| translate/translate.mjs:4706 | translate-refuse |  | mutation | one-decider | delete target is not translated |
| translate/translate.mjs:4709 | translate-refuse |  | mutation | one-decider | element write through a path: the heap core reads it, the value reading does not |
| translate/translate.mjs:4732 | translate-refuse |  | proof-shape | shared (bucketMaps) | a push through a bucket map is read in --core mode |
| translate/translate.mjs:4767 | translate-refuse |  | library | one-decider | .${}() is not translated here |
| translate/translate.mjs:4770 | translate-refuse |  | control-flow | one-decider | statement expression is not translated |
| translate/translate.mjs:4772 | translate-refuse |  | control-flow | one-decider | a bare await statement has no effect in the core |
| translate/translate.mjs:4778 | translate-refuse |  | loops | one-decider | in --real mode a for-loop counter starts at an integer literal |
| translate/translate.mjs:4825 | translate-refuse |  | control-flow | one-decider | an abrupt exit has no enclosing loop or switch |
| translate/translate.mjs:5075 | translate-refuse | definite-assignment | declarations | shared (definiteAssignmentRead) | definite-assignment: `let v!: T` may be read before its first assignment |
| translate/translate.mjs:5132 | translate-refuse | definite-assignment | declarations | shared (definiteAssignmentRead) | definite-assignment: `let v!: T` may be read before its first assignment |
| translate/translate.mjs:5171 | translate-refuse |  | local-functions | one-decider | a nested function needs a name |
| translate/translate.mjs:5188 | translate-refuse |  | control-flow | one-decider | break or continue outside a loop |
| translate/translate.mjs:5191 | translate-refuse |  | unread-syntax | one-decider | statement ${} is not translated |
| translate/translate.mjs:5230 | translate-refuse | internal | translator-internal | one-decider | internal: an opaque block in a unit not marked effectful |
| translate/translate.mjs:5339 | translate-refuse |  | proof-shape | one-decider | effectful callbacks need --core |
| translate/translate.mjs:5351 | translate-refuse |  | exceptions | one-decider | a throwing callback here has no fault channel; call the array method in a statement of the unit |
| translate/translate.mjs:5418 | translate-refuse |  | loops | one-decider | async iterator abrupt completion needs an opaque loop |
| translate/translate.mjs:5550 | translate-refuse |  | exceptions | one-decider | a throwing callback here has no fault channel; call the array method in a statement of the unit |
| translate/translate.mjs:5560 | translate-refuse |  | loops | one-decider | an effect in a for header |
| translate/translate.mjs:5611 | translate-refuse | key-order | loops | shared (forInKeyOrder) | key-order: a for-in over an object whose key order the function does not fix (a parameter, a spread, |
| translate/translate.mjs:5657 | translate-refuse |  | loops | one-decider | while needs `// @decreases <expr>` |
| translate/translate.mjs:5672 | translate-refuse |  | control-flow | one-decider | a labelled exit lacks its completion channel |
| translate/translate.mjs:5672 | translate-refuse | internal | translator-internal | one-decider | internal: return in a loop without the return shape |
| translate/translate.mjs:5888 | translate-refuse | param-assign | mutation | one-decider | param-assign: parameter `${}` is rebound and also changed in place |
| translate/translate.mjs:6008 | translate-refuse | alias-mutation | mutation | one-decider | alias-mutation: `${}` is the element a loop or an array callback walks; this reading copies it, so t |
| translate/translate.mjs:6012 | translate-refuse |  | generators | shared (asyncGenerator) | async generators need --core |
| translate/translate.mjs:6013 | translate-refuse |  | generators | one-decider | generators need --core |
| translate/translate.mjs:6037 | translate-refuse |  | control-flow | one-decider | a path ends without a return |
| translate/translate.mjs:6062 | translate-refuse |  | decorators | one-decider | the route wrapper is not read: ${} |
| translate/translate.mjs:6068 | translate-refuse |  | decorators | one-decider | a piped parameter is a plain required name |
| translate/translate.mjs:6107 | translate-throw |  | numbers | one-decider | internal: an integer division was not placed under Math.floor |

## File preparation and compiler lifetime

`lowerFile` passes one file-analysis map to its per-unit translations. Its identity
is the loaded SourceFile, checker and project setting. Normalization, number mode,
unit and declaration indexes, class/accessor tables, exception and generator
analyses, reachability, React slot bindings, library-hook bindings and parameter
mutation propagation run once for that file. Class-field, static-cell and reference
indexes fill lazily; decoration and operand-name scans retain their original lazy
trigger. Emission order, effects, type substitutions, heap planning and emitted
text remain local to each translation. Sharing the latter would confuse units or
numeric modes. The analysis map never enters a lowering record.

`census.mjs --profile` prints inclusive phase wall times and TypeScript's nested
parse/program/bind/check counters. These rows overlap and must not be summed.
The census logs `process.memoryUsage()` after each chunk and every 50 files.
Chunk construction returns from a normal function before the generator yields;
the census processes the chunk in a separate stack frame and clears its Map
before advancing. Neither loop keeps the preceding compiler graph alive while
building the next one.

The lint's type walk records visited compiler type identities, source sites and
depths. An intersection/signature cycle is a graph, not a tree: repeated visits at
the same depth cannot produce a new finding. The existing depth cutoff, string
based object guard, predicates and finding messages are unchanged. This visited
table lives only for one admission call.

## Persistent lowering records

The memo retains at most 4 MiB of UTF-16 keys and serialized records, not a fixed
number of arbitrarily large records. Both its hits and the public result are
plain JSON data. No AST, Program, checker, closure or shared analysis is stored.
The disk envelope also has a payload checksum; incomplete or damaged entries are
misses. A writer uses its own `.next` file and renames it atomically.

`LEAN_CACHE=0` disables both caches. `LEAN_CACHE_DIR` overrides the directory;
otherwise it is `$XDG_CACHE_HOME/lean/lowering` or `~/.cache/lean/lowering`.
A SHA-256 key covers file identity and contents, project/options/ranges,
withdrawals, catalogue versions, diagnostics, and the producing source snapshot:
all top-level TypeScript tooling modules/data, `lint/**`, `translate/**`, the
any-type usage helper, and the vendored compiler. Producer hashes are fixed for
the loaded implementation in a process; a new CLI process reads changed sources.
The compiled Program's options, root names, complete source/declaration texts,
implied module formats, and resolved module/type-reference edges are hashed too
(once per Program in a WeakMap). A package's `types` or `exports` can redirect an
import between two declarations already loaded; hashing only the source set
would miss that change. Thus changing an import, an
ambient declaration, resolution or project settings cannot serve an old record.
Programs are loaded before lookup: a warm census still pays compiler loading and
diagnostics, while skipping admission and per-unit translation. Consumers of
`lowerFile`/`lintFile` need no separate cache implementation.

Unknown options, options that collect side effects, and external decorator-table
or fixture overrides bypass the cache. This preserves advisory collectors and
avoids caching an incompletely described context. Filesystem write failures are
reported and do not change admission.

## Byte budgets and interrupted censuses

Compiler chunks use `PROGRAM_SOURCE_BUDGET_BYTES` (12 MiB), counting actual source
and declaration text read through the compiler host before checking. This leaves
space for the type graph and emission in the default heap; the measured 14.8 MB
Redis closure grew to about 3 GB. A multi-root attempt over budget is split. An
indivisible single-file import closure is read whole: deleting declarations would
change its reading. Its census record has `closure: {sourceBytes,
declarationBytes, totalBytes, budgetBytes}`, and the summary counts oversized
closures. No per-file peak heap is claimed when it was not measured.

With `--out result.json`, the census first publishes an incomplete marker naming
`result.json.records.jsonl`. After each completed chunk it appends the plain
per-file records and cumulative counts to that journal. Only a completed run
atomically renames its final summary into place and appends a completion marker.
A failed run therefore retains its completed chunks and an explicit incomplete
summary. An interrupted final journal line can be discarded; previous complete
lines remain usable. `--diff` rejects incomplete summaries rather than treating
missing records as zero coverage.

A missing checker type is an opaque outcome of `checkType`, not an exception. The
module-local `class Promise` regression reaches the existing named `promise`
refusal; it no longer dereferences `undefined.flags` in the lint.
