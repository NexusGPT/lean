# Language coverage matrix

Generated 2026-10-26 by `design/coverage-matrix.mjs` from `syntax-census.json` (39 roots, 28925 files, 62657 top-level units: functions, arrows bound to a const, class methods) and the concept bench at master 03ec3bc (`results/concept-bench.json`, 205 concepts, K=10 real instances each). A unit counts once per kind it uses. "Lint" is read from the lint's expression and statement switches: a kind with a case is admitted (its forms may still be refused by a named rule), a kind without one is refused by the default branch (`unsupported-syntax`). "Today" and "faithful" come from `coverage-readings.json`; the faithful column is the target reading (CLAIM).

## A. Runtime syntax kinds (expressions and statements)

| kind | units | share | lint | reading today | faithful reading |
|---|---:|---:|---|---|---|
| Identifier | 59378 | 94.8% | admitted | exact: a parameter, a local, a same-file unit; an outside name is a world read (a global the lib or an @types package declares: lib-globals, done (lane)) or refused (global-read: unresolved, module state, a global only the project declares) | same; module and captured cells as ledger cells (research note section 1) |
| Block | 59338 | 94.7% | admitted | exact | same |
| PropertyAccessExpression | 50650 | 80.8% | admitted | exact on records and arrays by shape; this.x a world read; a getter a callable unit; an unknown member refused (unsupported-member) | heap read on the ledger for every reference-typed receiver |
| CallExpression | 50125 | 80% | admitted;  | exact for a same-file unit and a pure callback; transition for a service, a global or a library effect; an optional call `f?.(x)` on a local, a record path or this: the call and its arguments on the present branch only (optional-call, done (lane)); the stage 5 library rows: pop, shift and splice as values, fill, toSorted, toReversed, findLast, findLastIndex, lastIndexOf, toString on primitives and arrays, substr, search, matchAll, and the locale reads as transitions (library-rows, done (lane)); refused for unsupported calls and .call/.apply | same, plus the library table as transitions and callable records for escaped functions |
| ReturnStatement | 49908 | 79.7% | admitted | exact; a bare return in a value unit refused (bare-return); a bare return in a constructor (Unit: `new` yields the receiver) or in a unit or callback whose result admits undefined (`T;  | undefined`, `void`, `any`, `unknown`) reads as undefined, the result's absent value (bare-return-void, done (lane)) | same |
| StringLiteral | 38403 | 61.3% | admitted | exact; a lone surrogate refused (string-code-unit) | same |
| BinaryExpression | 34883 | 55.7% | admitted | exact for arithmetic, comparison and boolean logic; mixed-value || && ?? exact since the mixed-logic reading; === between a primitive-or-record union and a literal exact on the literal's primitive arm since the mixed-vs-literal reading; assignment a write; bitwise refused unless the integer file; `in` on a plain object (a dictionary, a record) is an own key or a name of Object.prototype, on a Map uninterpreted, refused (prototype) in a file that makes another prototype (lane in-prototype) | same |
| VariableDeclaration | 33616 | 53.7% | no case (refused by default, or reached through its parent) | exact; a let rebinding read by its first assigned type | same |
| VariableStatement | 32918 | 52.5% | admitted | exact | same |
| ObjectLiteralExpression | 28851 | 46% | admitted | exact as a fresh record; in the heap core a fresh node; literal methods as function fields; getters and setters by name only; a computed key of literal type names its field, a union of literals is a case split on the key (stage 5 rank 14) | fresh heap node with a proto edge |
| PropertyAssignment | 26056 | 41.6% | no case (refused by default, or reached through its parent) | exact | same |
| ExpressionStatement | 24981 | 39.9% | admitted | exact for assignments, ++/--, calls and awaits; a `=` into a field of `process` a world transition (process-write, done (lane)); anything else refused (unsupported-syntax) | same |
| IfStatement | 23894 | 38.1% | admitted | exact | same |
| NumericLiteral | 18802 | 30% | admitted | exact as int or real by file; -0 witnessed in lane B, refused from the heap core | same |
| ArrowFunction | 17699 | 28.2% | admitted | exact as a pure lambda; a React handler as a descriptor; a synchronous array-method callback writing outer cells as a loop body (stage 5 rank 19); a const arrow only ever called as a statement spliced at each call (stage 5 rank 21); otherwise opaque by text and captures; a changing capture refused | callable record Fn(code, env) on the ledger |
| ThisKeyword | 17059 | 27.2% | admitted | exact as the receiver (self) of a class unit; a field read a world read; a write a world write | the receiver as a heap node |
| ParenthesizedExpression | 16252 | 25.9% | admitted | exact | same |
| TemplateExpression | 16167 | 25.8% | admitted | exact (string concatenation of converted parts) | same |
| AwaitExpression | 15997 | 25.5% | admitted | exact as a settled source with the try fault channel (promise forms) | same, with pending reactions on the ledger |
| Parameter | 15777 | 25.2% | no case (refused by default, or reached through its parent); an effectful array callback's element parameter may be a pattern or carry a never-taken default (callback-patterns) | exact; rest parameters and defaults by the param-form rule; a parameter the unit reassigns in its own body is a local that starts as the argument (param-rebind), refused inside a callback, as an output or under an earlier closure (param-assign); under the identity guard a rest parameter is a fresh array of the arguments from its place, a destructured parameter with a default no term (heap-stage5 0b, identity-destructured, done (lane)) | same, rest parameters admitted |
| ConditionalExpression | 14656 | 23.4% | admitted | exact | same |
| ArrayLiteralExpression | 14558 | 23.2% | admitted | exact as a sequence; holes refused; in the heap core a fresh node | fresh heap node |
| PrefixUnaryExpression | 13715 | 21.9% | admitted | exact for !, unary minus on numbers, ++/-- on a name; -0 refused from the heap core | same |
| NewExpression | 12963 | 20.7% | admitted | exact for same-file classes and value constructors (Date with fixed arguments, Map, Set); a service class a world transition; in the heap skeleton a fresh node | allocation on the ledger with the class's proto |
| ShorthandPropertyAssignment | 12737 | 20.3% | no case (refused by default, or reached through its parent) | exact | same |
| NullKeyword | 10147 | 16.2% | admitted | exact (Absent) | same |
| BindingElement | 8691 | 13.9% | no case (refused by default, or reached through its parent) | exact (destructuring) | same |
| ElementAccessExpression | 8672 | 13.8% | admitted | exact for literal and typed keys; an open key on a plain record of data fields an uninterpreted lookup (open-key-read); other dynamic keys refused (dynamic-key) | heap read by key |
| AsExpression | 8500 | 13.6% | admitted | exact (the asserted type is read) | same |
| TrueKeyword | 7702 | 12.3% | admitted | exact | same |
| ThrowStatement | 6263 | 10% | admitted | exact as a fault on the try channel (exceptions across calls); inside a synchronous array callback the holding statement is one opaque block, inside a handed-away arrow part of the opaque value (stage 5 rank 20) | same |
| JsxAttribute | 5979 | 9.5% | no case (refused by default, or reached through its parent) | exact as a boxed prop; a handler as a descriptor or opaque value | same |
| TryStatement | 5893 | 9.4% | admitted | exact (try/catch/finally with the fault channel) | same |
| FalseKeyword | 5564 | 8.9% | admitted | exact | same |
| ObjectBindingPattern | 5564 | 8.9% | no case (refused by default, or reached through its parent); the element of an effectful array callback (callback-patterns) | exact; the record rest of a parameter, any field types, an uninterpreted function of the source named by the excluded keys (record-rest-any, done (lane)); under the identity guard a parameter's field at any depth is the input path to it and a record rest a fresh node of its source's members less the keys named beside it, a default or a computed key no term (heap-stage5 0b, identity-destructured, done (lane)) | same |
| CatchClause | 5517 | 8.8% | no case (refused by default, or reached through its parent) | exact (part of TryStatement) | same |
| ForOfStatement | 5511 | 8.8% | admitted | exact over sequences (loop forms); a Map, a Set and their keys(), values(), entries() in insertion order (stage 5 rank 22, ordered carriers); over an opaque iterable refused | same, plus Map and Set iteration from the library table |
| JsxExpression | 5495 | 8.8% | admitted | exact as a child or attribute value | same |
| SpreadAssignment | 5325 | 8.5% | no case (refused by default, or reached through its parent) | exact as a record merge in order; spread of an opaque value refused (spread) | heap copy of own keys |
| JsxSelfClosingElement | 5080 | 8.1% | admitted | exact as a JsxElem value | same, with component instance identity under re-render sequences |
| JsxElement | 4911 | 7.8% | admitted | exact as a JsxElem value | same |
| JsxText | 4770 | 7.6% | no case (refused by default, or reached through its parent) | exact (JSX whitespace rule) | same |
| ArrayBindingPattern | 3982 | 6.4% | no case (refused by default, or reached through its parent) | exact | same |
| SpreadElement | 3661 | 5.8% | admitted | exact in array literals and calls of known shape; a fixed tuple spread into an outside call is its elements in order (stage 5 rank 18); otherwise refused (spread); a Map, a Set and their iterators spread in insertion order since stage 5 rank 22 (ordered-collections); a string or opaque spread stays refused | same |
| TypeOfExpression | 3649 | 5.8% | admitted | exact (type tests) | same |
| RegularExpressionLiteral | 2457 | 3.9% | admitted | exact for the supported regex forms (strings reading); otherwise opaque | same |
| ContinueStatement | 2049 | 3.3% | admitted | exact (loop forms) | same |
| SuperKeyword | 1636 | 2.6% | admitted | exact for same-file parent classes (class_super pair) | same |
| UndefinedKeyword | 1596 | 2.5% | no case (refused by default, or reached through its parent) |  |  |
| ForStatement | 1542 | 2.5% | admitted | exact for the counted forms (loop forms); since stage 5 rank 15 any other header is `init; while (cond) { body; step }`: a derived bound when the counter, the limit and a literal step give one, else one opaque block | same |
| NoSubstitutionTemplateLiteral | 1537 | 2.5% | admitted | exact | same |
| PostfixUnaryExpression | 1345 | 2.1% | admitted | exact on a name; on a member a world write | heap write |
| JsxSpreadAttribute | 1306 | 2.1% | no case (refused by default, or reached through its parent) | exact as an ordered prop merge | same |
| SwitchStatement | 1120 | 1.8% | admitted | exact (statements reading) | same |
| VoidExpression | 743 | 1.2% | admitted | exact (Unit) | same |
| JsxFragment | 717 | 1.1% | admitted | exact as a JsxElem with an empty tag | same |
| NonNullExpression | 665 | 1.1% | admitted | exact (the assertion is read) | same |
| BreakStatement | 613 | 1% | admitted | exact | same |
| WhileStatement | 525 | 0.8% | admitted | exact for the admitted forms; refused otherwise (loop-form) | same |
| DeleteExpression | 524 | 0.8% | admitted | refused (delete) | heap key removal on the ledger |
| YieldExpression | 295 | 0.5% | admitted | generators: a bounded reading; most forms refused (generator-use) | a state machine on the ledger |
| MethodDeclaration | 285 | 0.5% | no case (refused by default, or reached through its parent) | exact for class methods as units Class.method and immutable object-literal methods as function fields; a mutating literal method refused (object-method-mutation) | a callable record on the object's proto |
| FunctionDeclaration | 248 | 0.4% | admitted | exact as a unit; nested declarations as local function values, or spliced at each call statement when only ever called (stage 5 rank 21) | same |
| OmittedExpression | 217 | 0.3% | no case (refused by default, or reached through its parent) |  |  |
| DoStatement | 196 | 0.3% | admitted | exact for the admitted forms | same |
| TaggedTemplateExpression | 186 | 0.3% | admitted | refused (unsupported-syntax) unless the tag is a known pure tag | a call with the strings array |
| SatisfiesExpression | 113 | 0.2% | admitted | exact (erased assertion) | same |
| PrivateIdentifier | 90 | 0.1% | no case (refused by default, or reached through its parent) |  |  |
| FunctionExpression | 90 | 0.1% | admitted | as ArrowFunction; a this-capturing one refused (this) | callable record |
| ForInStatement | 81 | 0.1% | admitted | refused unless the dynamic-record reading applies | key iteration on the ledger |
| TypeAliasDeclaration | 60 | 0.1% | admitted | erased at run time, inside a function too (stage 5 rank 16); its uses are read through the checker | none |
| MetaProperty | 41 | 0.1% | admitted | `import.meta.x` is a world read (stage 5 rank 16); `import.meta.env` and `new.target` refused | none |
| GetAccessor | 22 | 0% | no case (refused by default, or reached through its parent) |  |  |
| BigIntLiteral | 20 | 0% | admitted | exact as int | same |
| MethodSignature | 15 | 0% | no case (refused by default, or reached through its parent) |  |  |
| LabeledStatement | 10 | 0% | admitted | refused (unsupported-syntax) | same as the loop it labels |
| InterfaceDeclaration | 9 | 0% | admitted | erased at run time, inside a function too (stage 5 rank 16) | none |
| PropertyDeclaration | 7 | 0% | no case (refused by default, or reached through its parent) | a static field of a same-file class read as `C.K`: a constant, or a world cell when written, holding an object or reachable from outside ([class statics](class-statics.md)) |  |
| ClassDeclaration | 7 | 0% | admitted | exact as units Class.method with a receiver; a static method called as `C.m(x)` is the unit `C.m` ([class statics](class-statics.md)); inheritance across files refused (class) | same, with a proto edge |
| ClassExpression | 5 | 0% | admitted | refused (class) | allocation of a class value |
| Constructor | 5 | 0% | no case (refused by default, or reached through its parent) |  |  |
| EmptyStatement | 4 | 0% | admitted | exact | same |
| SetAccessor | 3 | 0% | no case (refused by default, or reached through its parent) |  |  |
| TypeAssertionExpression | 3 | 0% | admitted | exact | same |
| ConstructSignature | 2 | 0% | no case (refused by default, or reached through its parent) |  |  |

## B. Type nodes (erased at runtime; the type reader uses them for shapes) and punctuation tokens

| kind | units | share | class |
|---|---:|---:|---|
| TypeReference | 13851 | 22.1% | type |
| StringKeyword | 8911 | 14.2% | type |
| ArrayType | 5866 | 9.4% | type |
| UnionType | 3456 | 5.5% | type |
| UnknownKeyword | 3418 | 5.5% | type |
| AsyncKeyword | 2989 | 4.8% | type |
| TypeLiteral | 2597 | 4.1% | type |
| PropertySignature | 2520 | 4% | type |
| LiteralType | 2338 | 3.7% | type |
| InstanceOfKeyword | 2285 | 3.6% | type |
| NumberKeyword | 2039 | 3.3% | type |
| QualifiedName | 1255 | 2% | type |
| InKeyword | 1161 | 1.9% | type |
| BooleanKeyword | 976 | 1.6% | type |
| AnyKeyword | 742 | 1.2% | type |
| VoidKeyword | 703 | 1.1% | type |
| NeverKeyword | 619 | 1% | type |
| IndexedAccessType | 603 | 1% | type |
| TypeQuery | 474 | 0.8% | type |
| TypeOperator | 467 | 0.7% | type |
| TypePredicate | 375 | 0.6% | type |
| FunctionType | 335 | 0.5% | type |
| TupleType | 295 | 0.5% | type |
| AwaitKeyword | 278 | 0.4% | type |
| ParenthesizedType | 202 | 0.3% | type |
| ImportKeyword | 192 | 0.3% | type |
| IntersectionType | 172 | 0.3% | type |
| TypeParameter | 151 | 0.2% | type |
| ObjectKeyword | 113 | 0.2% | type |
| IndexSignature | 109 | 0.2% | type |
| ReadonlyKeyword | 41 | 0.1% | type |
| BigIntKeyword | 29 | 0% | type |
| ImportType | 11 | 0% | type |
| ThisType | 11 | 0% | type |
| MappedType | 8 | 0% | type |
| SymbolKeyword | 7 | 0% | type |
| ConditionalType | 5 | 0% | type |
| RestType | 4 | 0% | type |
| ConstructorType | 3 | 0% | type |
| NamedTupleMember | 2 | 0% | type |
| StaticKeyword | 1 | 0% | type |
| VariableDeclarationList | 33350 | 53.2% | token |
| EqualsEqualsEqualsToken | 18451 | 29.4% | token |
| EqualsGreaterThanToken | 17699 | 28.2% | token |
| TemplateHead | 16167 | 25.8% | token |
| TemplateSpan | 16167 | 25.8% | token |
| TemplateTail | 16167 | 25.8% | token |
| QuestionToken | 15239 | 24.3% | token |
| ColonToken | 14656 | 23.4% | token |
| EqualsToken | 10538 | 16.8% | token |
| AmpersandAmpersandToken | 9545 | 15.2% | token |
| QuestionQuestionToken | 9205 | 14.7% | token |
| ExclamationEqualsEqualsToken | 8862 | 14.1% | token |
| TemplateMiddle | 8318 | 13.3% | token |
| BarBarToken | 8053 | 12.9% | token |
| QuestionDotToken | 7350 | 11.7% | token |
| JsxAttributes | 6119 | 9.8% | token |
| JsxOpeningElement | 4911 | 7.8% | token |
| JsxClosingElement | 4911 | 7.8% | token |
| PlusToken | 4747 | 7.6% | token |
| GreaterThanToken | 4448 | 7.1% | token |
| MinusToken | 2942 | 4.7% | token |
| LessThanToken | 2750 | 4.4% | token |
| AsteriskToken | 1869 | 3% | token |
| PlusEqualsToken | 1545 | 2.5% | token |
| SlashToken | 1451 | 2.3% | token |
| GreaterThanEqualsToken | 1261 | 2% | token |
| CaseBlock | 1120 | 1.8% | token |
| CaseClause | 1120 | 1.8% | token |
| LessThanEqualsToken | 955 | 1.5% | token |
| DefaultClause | 846 | 1.4% | token |
| JsxOpeningFragment | 717 | 1.1% | token |
| JsxClosingFragment | 717 | 1.1% | token |
| ComputedPropertyName | 557 | 0.9% | token |
| DotDotDotToken | 516 | 0.8% | token |
| PercentToken | 384 | 0.6% | token |
| ExclamationEqualsToken | 251 | 0.4% | token |
| EqualsEqualsToken | 179 | 0.3% | token |
| MinusEqualsToken | 136 | 0.2% | token |
| QuestionQuestionEqualsToken | 115 | 0.2% | token |
| AmpersandToken | 68 | 0.1% | token |
| GreaterThanGreaterThanGreaterThanToken | 52 | 0.1% | token |
| AsteriskAsteriskToken | 48 | 0.1% | token |
| BarToken | 46 | 0.1% | token |
| LessThanLessThanToken | 37 | 0.1% | token |
| CaretToken | 28 | 0% | token |
| GreaterThanGreaterThanToken | 23 | 0% | token |
| AsteriskEqualsToken | 22 | 0% | token |
| CaretEqualsToken | 13 | 0% | token |
| BarEqualsToken | 11 | 0% | token |
| ExpressionWithTypeArguments | 10 | 0% | token |
| HeritageClause | 9 | 0% | token |
| CommaToken | 8 | 0% | token |
| ExclamationToken | 8 | 0% | token |
| BarBarEqualsToken | 5 | 0% | token |
| SlashEqualsToken | 5 | 0% | token |
| Decorator | 2 | 0% | token |
| AmpersandEqualsToken | 2 | 0% | token |
| GreaterThanGreaterThanGreaterThanEqualsToken | 1 | 0% | token |
| AmpersandAmpersandEqualsToken | 1 | 0% | token |

## C. Semantic domains: the concept bench at master 03ec3bc

Totals: 1796 instances, 849 inside the subset (47.3%), 770 translated (42.9%), 1481 of 2031 planted mutants witnessed (72.9%). "Lints and translates" = translated / n.

| concept | n | inside | translated | lints and translates | mutants witnessed | top blocker |
|---|---:|---:|---:|---:|---:|---|
| ?: | 10 | 5 | 5 | 50% | 13/15 | react-handler-capture (2) |
| ?? | 10 | 9 | 8 | 80% | 17/18 | translate: Column.ts:28: type parameter Column is not one of (1) |
| .then/.catch chain | 10 | 6 | 6 | 60% | 9/14 | promise (2) |
| ** | 10 | 4 | 4 | 40% | 11/12 | loop-form (1) |
| / division | 10 | 8 | 8 | 80% | 18/22 | closure-mutation (1) |
| #private field | 10 | 6 | 2 | 20% | 0/5 | ts-strict (2) |
| % modulo | 10 | 7 | 7 | 70% | 17/21 | number-special (1) |
| ++ as a value | 10 | 4 | 4 | 40% | 5/10 | operator-value-context (2) |
| < > comparison | 10 | 9 | 9 | 90% | 20/27 | this (1) |
| == loose equality | 10 | 2 | 2 | 20% | 3/5 | property-assign (3) |
| === | 10 | 8 | 7 | 70% | 7/15 | translate: organization.ts:313: callee memberRow was not tra (1) |
| arguments object | 10 | 3 | 3 | 30% | 7/9 | generator-effect (1) |
| Array.from | 10 | 4 | 4 | 40% | 5/6 | prototype (1) |
| Array.isArray | 10 | 6 | 6 | 60% | 6/13 | callback-form (2) |
| as cast | 10 | 8 | 8 | 80% | 18/21 | this (2) |
| as const | 10 | 7 | 7 | 70% | 12/21 | property-assign (1) |
| assignment as a value | 10 | 5 | 5 | 50% | 12/14 | assignment-expression (2) |
| assigns a field of this | 10 | 8 | 7 | 70% | 20/20 | index-assign (1) |
| async callback | 10 | 4 | 4 | 40% | 9/12 | property-assign (3) |
| async unit | 10 | 8 | 6 | 60% | 10/11 | bare-return (1) |
| await | 10 | 5 | 5 | 50% | 7/11 | this (2) |
| bitwise | 10 | 5 | 5 | 50% | 14/15 | closure-mutation (2) |
| class method | 10 | 8 | 7 | 70% | 18/18 | translate: store.ts:63: type nesting too deep (1) |
| closure assigns outer variable | 10 | 0 | 0 | 0% | 0/0 | closure-mutation (2) |
| closure mutates outer object | 10 | 1 | 1 | 10% | 3/3 | property-assign (3) |
| computed member access | 10 | 6 | 6 | 60% | 13/16 | mixed-types (1) |
| computed property name | 10 | 2 | 2 | 20% | 6/6 | dynamic-key (4) |
| Date.now | 10 | 5 | 4 | 40% | 8/12 | unsupported-call (1) |
| Date.parse | 10 | 3 | 2 | 20% | 5/5 | ts-strict (2) |
| Date.UTC | 10 | 6 | 6 | 60% | 15/16 | callback-form (2) |
| default parameter | 10 | 6 | 6 | 60% | 11/15 | closure-mutation (1) |
| delete property | 10 | 4 | 3 | 30% | 6/6 | unsupported-member (1) |
| destructured parameter | 10 | 4 | 4 | 40% | 6/12 | unsupported-syntax (2) |
| destructuring | 10 | 5 | 5 | 50% | 15/15 | spread (1) |
| destructuring default | 10 | 6 | 5 | 50% | 10/12 | record-rest (2) |
| do-while | 10 | 5 | 5 | 50% | 10/15 | exception-callback (2) |
| dynamic import() | 10 | 5 | 5 | 50% | 5/9 | ts-strict (2) |
| finally block | 10 | 3 | 3 | 30% | 5/6 | promise-executor-escape (2) |
| float literal | 10 | 8 | 8 | 80% | 18/24 | param-assign (1) |
| for (;;) | 10 | 6 | 6 | 60% | 16/18 | callback-form (1) |
| for await | 10 | 1 | 1 | 10% | 3/3 | generator-effect (6) |
| for-in | 10 | 1 | 0 | 0% | 0/0 | dynamic-key (3) |
| for-of | 10 | 8 | 8 | 80% | 15/21 | spread (1) |
| generic parameter | 10 | 2 | 1 | 10% | 0/0 | optional-chain (2) |
| generic unit | 10 | 5 | 3 | 30% | 6/9 | ts-strict (2) |
| global AbortController | 10 | 3 | 3 | 30% | 0/9 | closure-mutation (2) |
| global alert | 10 | 5 | 5 | 50% | 13/15 | toplevel-effect (1) |
| global Blob | 10 | 7 | 7 | 70% | 3/11 | async (1) |
| global Buffer | 10 | 7 | 7 | 70% | 12/18 | opaque-mutation (1) |
| global clearInterval | 10 | 4 | 4 | 40% | 10/10 | ts-strict (2) |
| global clearTimeout | 10 | 3 | 3 | 30% | 3/8 | bare-return (3) |
| global confirm | 10 | 3 | 3 | 30% | 6/6 | global-read (2) |
| global console | 10 | 6 | 2 | 20% | 3/6 | property-assign (2) |
| global crypto | 10 | 8 | 8 | 80% | 18/20 | param-mutation (1) |
| global document | 10 | 2 | 1 | 10% | 0/2 | global-read (3) |
| global Event | 10 | 4 | 4 | 40% | 1/11 | bare-return (2) |
| global fetch | 10 | 7 | 7 | 70% | 9/18 | ts-strict (3) |
| global File | 10 | 2 | 2 | 20% | 6/6 | react-handler-capture (2) |
| global FormData | 10 | 4 | 4 | 40% | 4/10 | ts-strict (3) |
| global globalThis | 10 | 3 | 3 | 30% | 7/7 | alias-mutation (2) |
| global Headers | 10 | 5 | 4 | 40% | 2/12 | ts-strict (2) |
| global history | 10 | 5 | 4 | 40% | 9/9 | operator-value-context (2) |
| global Image | 10 | 3 | 3 | 30% | 7/9 | promise (4) |
| global Intl | 10 | 7 | 6 | 60% | 10/17 | translate: newer-version-strings.ts:34: union type number |  (1) |
| global localStorage | 10 | 9 | 8 | 80% | 4/16 | global-read (1) |
| global location | 10 | 7 | 6 | 60% | 13/18 | global-read (2) |
| global navigator | 10 | 0 | 0 | 0% | 0/0 | global-read (8) |
| global performance | 10 | 1 | 0 | 0% | 0/0 | global-read (5) |
| global process | 10 | 5 | 5 | 50% | 10/15 | property-assign (2) |
| global prompt | 10 | 4 | 3 | 30% | 9/9 | index-assign (1) |
| global Request | 10 | 4 | 3 | 30% | 5/6 | ts-strict (2) |
| global requestAnimationFrame | 10 | 0 | 0 | 0% | 0/0 | global-read (4) |
| global ResizeObserver | 10 | 0 | 0 | 0% | 0/0 | bare-return (4) |
| global Response | 10 | 3 | 3 | 30% | 8/9 | global-read (5) |
| global sessionStorage | 10 | 3 | 3 | 30% | 1/6 | dynamic-key (3) |
| global setInterval | 10 | 3 | 3 | 30% | 7/9 | closure-mutation (3) |
| global setTimeout | 10 | 0 | 0 | 0% | 0/0 | bare-return (3) |
| global TextDecoder | 10 | 4 | 4 | 40% | 9/12 | generator-effect (3) |
| global URL | 10 | 6 | 6 | 60% | 8/16 | unsupported-call (2) |
| global URLSearchParams | 10 | 6 | 6 | 60% | 16/18 | async (2) |
| global window | 10 | 3 | 3 | 30% | 1/7 | property-assign (1) |
| in | 10 | 5 | 5 | 50% | 5/12 | ts-strict (4) |
| instanceof | 10 | 6 | 6 | 60% | 11/17 | unsupported-member (1) |
| JSON.parse | 10 | 6 | 5 | 50% | 5/12 | translate: output_parsers.ts:55: type parameter T is not one (1) |
| JSON.stringify | 10 | 8 | 7 | 70% | 14/17 | exception-callback (1) |
| JSX element | 10 | 5 | 5 | 50% | 7/10 | record-rest (2) |
| JSX fragment | 10 | 8 | 7 | 70% | 16/19 | optional-chain (1) |
| JSX handler attribute | 10 | 7 | 7 | 70% | 20/20 | record-rest (1) |
| JSX spread attribute | 10 | 0 | 0 | 0% | 0/0 | record-rest (9) |
| local bound to another name (alias) | 10 | 7 | 7 | 70% | 14/17 | unsupported-member (1) |
| Math.abs | 10 | 6 | 5 | 50% | 10/15 | translate: chart-format.ts:55: callee formatCompactAlways wa (1) |
| Math.ceil | 10 | 4 | 3 | 30% | 8/8 | spread (3) |
| Math.floor | 10 | 8 | 8 | 80% | 21/23 | toplevel-effect (1) |
| Math.imul | 10 | 2 | 2 | 20% | 5/6 | unsupported-operator (7) |
| Math.log | 10 | 9 | 9 | 90% | 26/27 | in-place-mutation (1) |
| Math.max | 10 | 6 | 6 | 60% | 13/17 | ts-strict (2) |
| Math.min | 10 | 7 | 7 | 70% | 16/21 | spread (1) |
| Math.pow | 10 | 8 | 8 | 80% | 20/24 | react-handler-capture (1) |
| Math.random | 10 | 6 | 6 | 60% | 18/18 | callback-form (1) |
| Math.round | 10 | 9 | 8 | 80% | 20/23 | callback-form (1) |
| Math.sin | 10 | 4 | 4 | 40% | 9/12 | foreach (3) |
| Math.sqrt | 10 | 8 | 8 | 80% | 18/24 | spread (1) |
| method of a class that extends | 10 | 5 | 4 | 40% | 6/6 | promise-executor-escape (1) |
| mutates a computed target | 10 | 0 | 0 | 0% | 0/0 | property-assign (4) |
| mutates a local object | 10 | 2 | 1 | 10% | 3/3 | spread (3) |
| mutates a parameter | 10 | 5 | 4 | 40% | 9/12 | exception-callback (2) |
| mutating method on a field of this | 10 | 8 | 8 | 80% | 20/20 | index-assign (1) |
| mutating method on a local or result | 10 | 4 | 3 | 30% | 4/9 | param-mutation (1) |
| mutating method on a parameter | 10 | 4 | 3 | 30% | 9/9 | unsupported-call (1) |
| nested function declaration | 10 | 1 | 1 | 10% | 0/3 | generator-effect (2) |
| nested function value | 10 | 8 | 8 | 80% | 14/23 | bare-return (1) |
| new | 10 | 8 | 7 | 70% | 15/17 | translate: media.ts:418: type parameter AuthOptions is not o (1) |
| new Date | 10 | 9 | 8 | 80% | 15/19 | translate: seed-changelog.ts:64: an effect in a for header (1) |
| new Promise | 10 | 1 | 1 | 10% | 3/3 | promise (4) |
| Number.isFinite | 10 | 9 | 9 | 90% | 17/24 | ts-strict (1) |
| Number.isInteger | 10 | 7 | 7 | 70% | 17/21 | ts-strict (1) |
| Number.isNaN | 10 | 8 | 8 | 80% | 13/24 | opaque-mutation (1) |
| Number.isSafeInteger | 10 | 8 | 8 | 80% | 21/24 | unsupported-member (1) |
| Number.parseInt | 10 | 9 | 9 | 90% | 14/27 | ts-strict (1) |
| object literal with methods | 10 | 5 | 3 | 30% | 6/9 | object-method-capture (2) |
| Object.assign | 10 | 3 | 1 | 10% | 3/3 | this (3) |
| Object.entries | 10 | 6 | 5 | 50% | 7/12 | callback-form (3) |
| Object.fromEntries | 10 | 5 | 5 | 50% | 8/11 | promise (2) |
| Object.hasOwn | 10 | 8 | 4 | 40% | 7/12 | param-mutation (1) |
| Object.keys | 10 | 3 | 3 | 30% | 6/8 | async-callback (1) |
| Object.values | 10 | 5 | 3 | 30% | 6/6 | translate: html.ts:326: type nesting too deep (1) |
| optional call | 10 | 1 | 0 | 0% | 0/0 | optional-chain (3) |
| optional chaining | 10 | 6 | 6 | 60% | 15/18 | spread (1) |
| Promise.all | 10 | 2 | 2 | 20% | 5/5 | promise-all-order (2) |
| Promise.allSettled | 10 | 3 | 3 | 30% | 0/6 | async-callback (6) |
| Promise.race | 10 | 2 | 2 | 20% | 0/6 | promise-pending (3) |
| Promise.reject | 10 | 1 | 1 | 10% | 3/3 | promise (5) |
| Promise.resolve | 10 | 1 | 0 | 0% | 0/0 | promise (8) |
| prototype access | 10 | 0 | 0 | 0% | 0/0 | prototype (6) |
| Proxy/Reflect | 10 | 0 | 0 | 0% | 0/0 | prototype (8) |
| React hook call | 10 | 3 | 3 | 30% | 7/7 | record-rest (3) |
| regex literal | 10 | 6 | 6 | 60% | 12/18 | async (1) |
| rest parameter | 10 | 2 | 0 | 0% | 0/0 | spread (3) |
| rest pattern | 10 | 0 | 0 | 0% | 0/0 | record-rest (6) |
| satisfies | 10 | 5 | 5 | 50% | 11/11 | ts-strict (4) |
| spread in call or array | 10 | 3 | 3 | 30% | 8/9 | spread (3) |
| spread in object | 10 | 5 | 3 | 30% | 5/6 | ts-strict (3) |
| static method | 10 | 2 | 2 | 20% | 1/1 | global-read (4) |
| String.fromCharCode | 10 | 2 | 2 | 20% | 2/6 | loop-form (3) |
| super | 10 | 7 | 4 | 40% | 8/8 | alias-mutation (1) |
| switch | 10 | 5 | 4 | 40% | 12/12 | ts-strict (1) |
| tagged template | 10 | 7 | 7 | 70% | 13/19 | async (1) |
| template string | 10 | 6 | 6 | 60% | 15/17 | ts-strict (2) |
| this | 10 | 8 | 8 | 80% | 7/12 | ts-strict (1) |
| throw | 10 | 7 | 6 | 60% | 15/17 | ts-strict (1) |
| try/catch | 10 | 3 | 3 | 30% | 8/8 | global-read (1) |
| try/finally only | 10 | 6 | 6 | 60% | 4/14 | promise-pending (1) |
| type predicate | 10 | 8 | 8 | 80% | 18/23 | record-rest (1) |
| typeof | 10 | 6 | 6 | 60% | 11/18 | in-place-mutation (1) |
| void | 10 | 4 | 4 | 40% | 6/12 | void (2) |
| while | 10 | 5 | 4 | 40% | 8/12 | param-mutation (2) |
| x! | 10 | 4 | 4 | 40% | 8/9 | param-mutation (2) |
| yield | 10 | 0 | 0 | 0% | 0/0 | generator-effect (9) |
| generator | 9 | 0 | 0 | 0% | 0/0 | unsupported-call (4) |
| global global | 9 | 5 | 5 | 55.6% | 12/14 | ts-strict (2) |
| Math.cos | 9 | 8 | 8 | 88.9% | 22/24 | foreach (1) |
| Math.trunc | 9 | 7 | 7 | 77.8% | 12/18 | in-place-mutation (1) |
| Number.parseFloat | 9 | 8 | 8 | 88.9% | 6/24 | callback-form (1) |
| Object.defineProperty | 9 | 2 | 0 | 0% | 0/0 | ts-strict (1) |
| global MutationObserver | 8 | 3 | 3 | 37.5% | 0/9 | bare-return (2) |
| global structuredClone | 8 | 5 | 5 | 62.5% | 5/7 | foreach (1) |
| global TextEncoder | 8 | 4 | 2 | 25% | 6/6 | object-method-capture (1) |
| Object.getPrototypeOf | 8 | 0 | 0 | 0% | 0/0 | prototype (6) |
| Symbol | 8 | 0 | 0 | 0% | 0/0 | unsupported-call (3) |
| unary + coercion | 8 | 4 | 4 | 50% | 6/12 | ts-strict (1) |
| comma operator | 7 | 2 | 2 | 28.6% | 3/3 | operator-value-context (3) |
| getter/setter | 7 | 0 | 0 | 0% | 0/0 | closure-mutation (3) |
| global IntersectionObserver | 7 | 1 | 1 | 14.3% | 3/3 | bare-return (5) |
| global WebSocket | 7 | 2 | 2 | 28.6% | 2/6 | global-read (2) |
| Object.getOwnPropertyDescriptor | 7 | 4 | 0 | 0% | 0/0 | prototype (1) |
| Object.create | 6 | 2 | 2 | 33.3% | 0/0 | prototype (2) |
| require() | 6 | 2 | 2 | 33.3% | 6/6 | global-read (1) |
| bigint | 5 | 5 | 5 | 100% | 6/12 |  |
| global Worker | 5 | 0 | 0 | 0% | 0/0 | ts-strict (2) |
| Math.hypot | 5 | 2 | 2 | 40% | 2/6 | bare-return (2) |
| global queueMicrotask | 4 | 0 | 0 | 0% | 0/0 | react-handler-capture (2) |
| labelled statement | 4 | 1 | 0 | 0% | 0/0 | exception-callback (1) |
| Math.asin | 4 | 3 | 3 | 75% | 9/9 | async (1) |
| Object.freeze | 4 | 3 | 3 | 75% | 3/3 | index-assign (1) |
| String.fromCodePoint | 4 | 3 | 3 | 75% | 9/9 | dynamic-key (1) |
| global setImmediate | 3 | 0 | 0 | 0% | 0/0 | global-read (1) |
| Math.exp | 3 | 3 | 3 | 100% | 9/9 |  |
| Promise.withResolvers | 3 | 2 | 0 | 0% | 0/0 | translate: live-controls.ts:52: callee releaseControlTurn wa (1) |
| decorator | 2 | 0 | 0 | 0% | 0/0 | class (2) |
| eval | 2 | 0 | 0 | 0% | 0/0 | dynamic-eval (2) |
| global Audio | 2 | 0 | 0 | 0% | 0/0 | react-handler-capture (1) |
| global caches | 2 | 2 | 2 | 100% | 3/6 |  |
| global CustomEvent | 2 | 1 | 1 | 50% | 0/3 | react-handler-capture (1) |
| Math.atan2 | 2 | 2 | 2 | 100% | 2/6 |  |
| Object.getOwnPropertyNames | 2 | 1 | 1 | 50% | 0/0 | prototype (1) |
| class expression | 1 | 0 | 0 | 0% | 0/0 | property-assign (1) |
| global indexedDB | 1 | 0 | 0 | 0% | 0/0 | promise (1) |
| Math.cbrt | 1 | 1 | 1 | 100% | 3/3 |  |
| Math.log2 | 1 | 0 | 0 | 0% | 0/0 |  |
| Math.tan | 1 | 1 | 1 | 100% | 3/3 |  |
| Object.defineProperties | 1 | 1 | 0 | 0% | 0/0 | translate: output.ts:78: statement expression is not transla (1) |
| Object.is | 1 | 1 | 1 | 100% | 0/3 |  |
| Object.isFrozen | 1 | 1 | 1 | 100% | 0/0 |  |
| Object.setPrototypeOf | 1 | 0 | 0 | 0% | 0/0 | prototype (1) |
| Array.apply | 0 | 0 | 0 |  | 0/0 |  |

## D. Where the readings stand

- Runtime kinds admitted by the lint: 60 of 85; kinds with a reading written: 73.
- Units using only admitted runtime kinds are not counted here: admission is per form inside a kind (a named rule), which the concept bench measures per domain (section C).
- The translate pass of the bench: 770 of 1796 instances (42.9%) both lint and translate at master 03ec3bc.
