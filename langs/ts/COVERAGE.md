# Coverage matrix: every TypeScript and JavaScript concept against lean's reading

Three sources, joined. (1) The language itself: every statement, expression, value type, object-model feature, async
form and module form of ECMAScript 2024 and TypeScript 5, listed from the specification whether or not a repository
uses it. (2) A concept census over the 39 repositories of the reach measurement (23,359 files, 48,771 units; a unit
is a top-level function, an arrow const or a class method), by a plain syntax walk independent of the lint
(`concepts.mjs`): the count is the number of units whose body uses the concept. (3) A translate pass over 120 sampled
nexus files: of the units the lint admits, the share the translator finishes, and the failure classes
(`--tolerant --report`). Readings are those of commit d8f4131.

Reading words: **exact** (a Dafny value or operation of the same meaning) · **transition** (a bodiless function of
the world: `(World, args) -> (World, result)`) · **uninterpreted** (a bodiless function of its arguments, the same
on both sides) · **opaque** (one transition named by the block's text) · **refused** (the lint names the rule) ·
**absent** (no reading yet; the translator fails or the lint does not know the construct).

Status words: **done** · **gap** (a faithful reading is known and not built) · **partial** · **by design** (a
reading no value model can give; the lint says what to write instead).

## 1. Values and numbers

| concept | units | reading today | faithful reading | status |
|---|---|---|---|---|
| integer arithmetic `+ - * %` | 30,195 binary expressions | exact (`int`) | same | done |
| `/` division | 1,399 | finite nonzero literal divisors exact; possibly-zero divisors keep admission through whole-unit opacity, propagated to same-file callers; no zero-to-zero substitution | extended numbers for exact variable-divisor reasoning | partial (lane) |
| float literal, IEEE double | 1,205 | a FILE with a float literal or a bare `/` is a real file: its numbers are exact reals (dev); no flag needed | the same, stated with its caveat: an algebraic rewrite is proved equal on exact reals and can differ on doubles; lane B runs on doubles and its WITNESS stands, so a PASS-proved on a real unit is a fact about exact arithmetic, never about rounding | done (dev), caveat stated |
| `**` | 46 | an uninterpreted power of both sides (dev) | exact `Pow` on integers | partial (dev) |
| bitwise `& \| ^ ~ << >> >>>` | 128 | exact on finite number operands: truncate, modulo 2^32, bv32 operations, signed results except unsigned `>>>`; shift counts modulo 32 | BigInt and opaque operand coercions remain | partial (lane) |
| `++ --` as statements | 1,223 postfix | exact | same | done |
| `++`, assignment as a value | 116, 119 | ordered local/path/world updates; postfix yields old value, prefix and assignments yield stored value; bounded while condition steps run in the helper head | conditional local state and logical assignment values remain | partial (lane) |
| `bigint` | 12 | exact (`int`) | same | done |
| `NaN`, `Infinity`, `Number.isNaN` | 188 (`isNaN`) | `Number.isNaN`/`isFinite` uninterpreted; admitted special-producing forms and explicit -0 use whole-unit opacity; bare globals refused (`number-special`); lane B distinguishes all specials | an extended numeric datatype including signed zero and all observers | partial (lane) |
| unary `+` coercion | 16 | numbers identity, booleans 0/1, strings opaque with their containing observer; objects/BigInt refused (`unary-coercion`) | exact general ToNumber needs object effects and special values | partial (lane) |
| string concatenation, template strings | 14,140 templates | exact strings and booleans; numeric literals use JavaScript spelling; other conversions uninterpreted | exact within the stated value models | partial (lane) |
| string methods with a rule (`includes`, `slice`, `indexOf`, `startsWith`, `repeat`, `charAt`, `at`, `substring`, `concat`) | | exact within the BMP envelope; positions retained, substring clamps and swaps | same within the model; full UTF-16 remains future work | done (lane), envelope stated |
| string methods (`trim*`, case, `split`, `pad*`, `replace`, `replaceAll`, `lastIndexOf`, `endsWith`, string-array `join`) | | exact helpers within the BMP envelope; casing exact behind an ASCII guard, non-ASCII uninterpreted; literal split without limit; literal-pattern/string replacement including dollar substitutions | full Unicode case tables, general split/replace; `localeCompare` and `normalize` remain uninterpreted | partial (lane) |
| string length and indexing | | Dafny `string`, with the explicit model axiom that all strings contain only BMP scalars (no surrogates); known out-of-envelope literals refused (`string-code-unit`); external strings assumed in-envelope | full UTF-16 code-unit sequences; current PASS-proved is conditional on the BMP axiom | partial (lane) |
| string ordering `<`, `>`, `<=`, `>=` | | lexicographic `StrLt` by character value, exact by code unit within the BMP model axiom | full UTF-16 ordering | done (lane), envelope stated |
| `==` loose equality | 398 | refused except against `null`/`undefined` | by design: the lint says `===` | by design |
| `===` on primitives | 19,845 | exact | same | done |
| `===` on objects and arrays | | refused (`reference-equality`) | exact Ref identity for represented objects; fresh refs compared under one observation-wide correspondence ([design](design/heap-layer.md)) | gap (layer 2; design and toy only) |
| `typeof` | 3,351 | exact static tags, represented sum alternatives, Options and Nullish; null reports `"object"`; assertion-derived values, unknown stay uninterpreted | same | partial (lane) |
| regular expressions | 1,950 | an opaque constant per literal, externals for `test`, `match`, `replace` | the same; an exact reading of regular expressions is a project of its own | by design |
| `Date` | 1,337 `new Date`, 591 `Date.now` | `Date.now()`, no-argument `new Date()`, `performance.now()` and `process.hrtime()` are ordered transitions; integer high-resolution observers stay opaque by text; lane B records seeded native clock values; `new Date(x)` stays a pure value and methods retain their existing reading | same | done (lane) |
| `Math.*` | | `min`/`max` exact on nonempty argument sequences (lane); possibly empty spreads refused (`math-empty`); `abs`, `floor`, `ceil`, `trunc`, `round`, `sign` exact within the finite arithmetic envelope; truncation is toward zero; real remainder exact for nonzero literal divisors; other calls uninterpreted; `Math.random` a transition | full IEEE rounding and signed-zero arithmetic | partial (lane) |
| `JSON.stringify`, `JSON.parse` | 1,714, 699 | may-fault transitions; checkpoints inside exact try regions; stringify preserves Null/Undef tags and the static absence schema | exact serialization, order, replacers and toJSON remain outside this refinement | partial (lane) |
| `Symbol`, `Symbol.iterator` | 37 | refused (`unsupported-syntax` on use) | a symbol is an opaque constant per declaration; iterator protocol is section 6 | gap (small) |
| `null` and `undefined` | | `Nullish<T>` preserves both tags when the static type allows both; single-absence types retain `Option<T>`; strict tests select one tag, loose nullish tests select both | same; opaque values keep distinct uninterpreted tests | done (lane) |

## 2. Objects, records and references

| concept | units | reading today | faithful reading | status |
|---|---|---|---|---|
| object literal, field read, spread `{...a, f: v}` | 23,412 literals, 4,151 spreads | exact (a datatype per shape) | same | done |
| field assignment on a local the function built | 3,914 | exact (a datatype update) | same | done |
| field, slot or contents assignment on a parameter | 815 + 523 | exact: the parameter is an output of the function (references layer 1) | same, plus the heap layer for objects shared between parameters | done (layer 1) |
| mutation through a local alias of a parameter | 4,620 locals bound to another name | refused (`alias-mutation`) | one Ref shared by both names; reads project from the world heap, writes update its single cell; initial objects remain observation anchors ([design](design/heap-layer.md)) | gap (layer 2; design and toy only) |
| mutation of a field of `this` | 739 assign, 779 mutating method | exact: a field any method assigns lives in the world | same | done |
| mutation of a field of a field of `this` | | named nonoptional data-record paths: one world-field read, nested record update, world-field write; class and opaque paths remain `receiver-mutation` | a path update like a parameter path under the no-alias value axiom | partial (lane) |
| mutation of an object reached from the world (a query result, a module object) | 80 computed targets | refused (`property-assign`) | world transitions return existing or fresh refs into the same heap; subsequent reads/writes use that heap ([design](design/heap-layer.md)) | gap (layer 2; design and toy only) |
| `delete obj.f` | 498 | exact on dev: an optional field of a local or parameter record becomes `None`; a dictionary key leaves the map; `delete this.m[k]` is a world-field write; a field of `this` itself stays refused | same | done (dev) |
| dictionary `Record<string, V>`: read, write by key, `in`, `Object.keys/entries/values` | 1,105 keys, 740 entries | exact map and string-key `in`; dictionary enumeration stays uninterpreted; on fresh records, keys/values/entries are exact sequences in own-property order (lane) | `in` exact on a dictionary; `Object.keys` as a sequence whose order is a fact of the value (uninterpreted, stated) | partial (lane) |
| computed member access `obj[k]` on a record | 5,278 | exact field-selection chain for finite declared string keys, including `keyof`; optional results retain Option; unrestricted string/numeric/method keys refused (`dynamic-key`), record writes `index-assign` | conditional selection for finite keys; an open-record map needs extra-property and prototype metadata for arbitrary strings | partial (lane) |
| computed property name `{[k]: v}` | 487 | exact on dev when the literal's contextual type is a dictionary (`Record<string, T>`); `{...m, k: v}` on a dictionary is a map merge | the same with a record contextual type when the key is a literal union | done (dev) |
| getters and setters | 7 | class accessor units `C.get_total` / `C.set_total`; property reads/writes call their bodies; unreadable bodies stay source-sensitive opaque units; fixed literal getters are deferred function fields; literal setters remain refused | the getter's body as the accessor when it is in the subset | partial (lane) |
| object literal with methods | 157 | immutable method literals have function-valued fields; scalar return methods are exact lambdas over captured data; other methods are opaque by text and captures, invoked through world transitions | mutable literal receivers need a heap; literal setters remain refused | partial (lane) |
| prototype access, `Object.create`, `Object.defineProperty`, `Object.setPrototypeOf` | 134 + 7 + 20 + 1 | refused (`prototype`) | by design: no value reading | by design |
| `Proxy`, `Reflect` | 41 | refused | by design | by design |
| `Object.assign`, `Object.freeze`, `Object.fromEntries`, `Object.keys/values/entries`, `structuredClone` | 390 assign, 6 freeze, 196 fromEntries, 32 clone | keys/values/entries exact on immediate plain records and enumeration-only const literals; unknown record provenance uses a source-sensitive world transition; assign/freeze/fromEntries/clone remain uninterpreted | preserve own keys and insertion order (integer indices first); assign needs target mutation, freeze needs later write faults, fromEntries needs key coercion | partial (lane) |
| `Array.isArray` | 1,562 | exact arrays, primitive non-arrays and represented alternatives; assertion-derived, generic and structural-record uncertainty uninterpreted | array brand, preserving open structural types | partial (lane) |
| `instanceof` | 2,204 | exact nominal class ancestry and disjoint tagged class members; assertion-derived values, public structural classes and unknown catch values stay uninterpreted | exact only when static types establish runtime membership; subclasses included | partial (lane) |
| `in` | 1,071 | dictionary membership and required record fields exact, including sum alternatives; assertion-derived operands and missing or optional fields uninterpreted | open records may carry undeclared or inherited keys; absence needs runtime information | partial (lane) |
| `x!` non-null | 501 | `.value` when optional | same | done |
| optional chaining `a?.b`, `a?.m()` | 6,061, 493 | Option or Nullish propagation; either absent receiver yields Undef; nullable field values retain Null; calls remain conditional transitions | same | done (lane) |
| `??`, `??=`, `\|\|=`, `&&=` | 7,882, 107 | exact for Option and Nullish: `??` falls back on either absent tag; `x ??= v` keeps x when present, `\|\|=` keeps a truthy x, `&&=` takes v when x is truthy | same | done (dev) |
| `as` casts, `satisfies` | 6,995, 105 | identity when the shapes agree, else uninterpreted cast | same | done |
| `arguments` object | 133 | refused | by design (use rest parameters, section 3) | by design |

## 3. Functions, closures and calls

| concept | units | reading today | faithful reading | status |
|---|---|---|---|---|
| top-level function, arrow const, call | | exact | same | done |
| default parameters | 108 | nullable defaults take `Nullish<T>`; only Undef runs the initializer; explicit null passes through; nonnullable defaults retain Option inputs | same | done (lane) |
| rest parameters `...xs` | 37 | a sequence parameter; the remaining arguments of a call form the sequence; a single spread passes it as it is (dev) | same | done (dev) |
| spread in a call `f(...xs)` | 3,060 (with arrays) | same-file rest parameters (dev); outside callees receive one concatenated argument sequence as a transition or pure external; push/unshift concatenate all arguments; min/max fold nonempty sequences (`math-empty` otherwise) | same, plus custom iterators and local function values | partial (lane) |
| destructuring, defaults in object patterns | 7,988, 241 | exact | same | done |
| defaults in array patterns, rest patterns | 346 rest | exact on arrays (dev); record rest builds the remaining datatype for fixed scalar records with a nonempty remainder; other record shapes refused (`record-rest`) | remaining fields as a datatype or map, with shallow aliases preserved | partial (lane) |
| nested function value (arrow) as a callback to an array method | 14,867 nested values | exact lambda when pure | same | done |
| callback with an effect inside (`xs.map(async (x) => await f(x))`, `forEach` with a call) | 2,209 async callbacks | sync inline `map`, `filter`, `find`, `findIndex`, `some`, `every`, `flatMap`, `reduce` thread the world through array-order loops and produce their results; find/some/every stop visiting at the first decisive predicate; nested sync `forEach` carries effects; awaited `Promise.all` collects map and async-flatMap results by index, with observable continuations refused | dense arrays without captured mutation; broader callback shapes and arbitrary async schedules remain outside this reading | partial (lane) |
| closure that assigns an outer variable | 65 | refused (`closure-mutation`) | the loop reading above when the callback is a loop body; by design otherwise | partial |
| closure that mutates an outer object | 1,831 | refused | synchronous callback takes current heap and captures refs; scalar bindings need loop state/cells; escaping invocation remains outside the first heap core ([design](design/heap-layer.md)) | gap (design and toy only) |
| nested function declaration | 215 | a local function value, checked and translated like `const f = (...) => ...` (dev) | same | done (dev) |
| recursion, mutual recursion | | exact with a fuel | same | done |
| generics on the unit | 902 | exact (type parameters with equality) | same | done |
| function-typed parameters and locals, called | | exact (applied as a function value) | same | done |
| a function value returned, stored in a record field, or compared | 262 units (`function-value`) | anywhere (dev): a pure lambda when its body has no effect, else an opaque value keyed by its text; lane B compares a returned function by its source | same | done (dev) |
| `this` binding of a free function, `.call`/`.apply`/`.bind` | | refused / uninterpreted | by design | by design |
| tagged templates | 173 | uninterpreted function of the strings and the values | same | done |
| `void f()` | 686 | exact (the call) | same | done |
| comma operator | 8 | ordered evaluation of left values, then the last value; conditional sequences and discarded container mutators refused by name | exact (sequence) in every context | partial (lane) |

## 4. Classes and `this`

| concept | units | reading today | faithful reading | status |
|---|---|---|---|---|
| class method, static method | 16,377, 926 | exact (a function of an explicit receiver) | same | done |
| a constructor that stores ports; `this.port.m()` | | a transition of the world | same | done |
| a field any method assigns | 739 | the world (get/set transitions) | same | done |
| method of a class that extends another | 8,240 | inside: an inherited method call is a transition on the receiver, an inherited field a pure accessor (probed) | same; a same-file parent's method could be the parent's own translation | done |
| `super.m()`, `super(...)` | 115 | `super.m(args)` is a transition on the receiver (the parent's method, outside the reading); `super(...)` in a constructor is outside the unit; `super.m` as a value refused (`class`) (dev) | a call of the parent's method: same-file parent exact, else a transition | partial (dev) |
| getters and setters on a class | 7 | section 2: accessor units and property calls | section 2 | done (lane) |
| `#private` fields | 81 | as fields | same | done |
| class expression | 2 | refused | by design | by design |
| decorators | 2 inside units (many on classes) | ignored by the translator (a declaration-level attribute); run by lane B | same | done |
| `new C()` of a same-file class | 10,265 `new` | a fresh handle from the world, then the class's constructor as a unit on it (its field initialisers, parameter properties and body as set transitions; `super(...)` a transition); a method called on the instance is the file's own unit; a field one of its methods assigns is read and written through the world (dev) | the same; a record value where no method writes a field (a later refinement) | done (dev) |
| `instanceof` for narrowing on classes | | tagged nominal class union constructor tests and payload projection; assertion-derived values and public structural classes stay uninterpreted | nominal ancestry and justified disjoint members; unknown membership uninterpreted | partial (lane) |

## 5. Control flow and exceptions

| concept | units | reading today | faithful reading | status |
|---|---|---|---|---|
| `if`, `switch` with `return`/`break` per case, `?:`, early return | 21,957, 1,076, 13,560 | exact | same | done |
| `switch` with fall-through | | exact for scalar discriminants: lazy first-match search, default in source position, ordered clause suffixes; reference/unknown discriminants opaque | exact: the clause list with the fall-through as a chain | partial (lane) |
| `switch` in the heap core (a discriminated union by its kind) | | a pure primitive discriminant once, constant cases by `===` in source order, empty clauses sharing the next body, default after every case, a clause ending in `return` or a final `break`; an exhaustive literal union's last case the else; a numeric literal-union discriminant is a number ([design](design/heap-stage5.md) 12a) | the same | partial (lane: fall-through into a next clause, a switch in a loop body, `in`/`typeof`/`instanceof` narrowing refused) |
| `for..of`, counted `for`, `while` with a bound | 4,595, 1,397, 477 | exact (a recursive helper) | same | done |
| `while` without a bound, labelled statements | 477 (some), 10 | exact for a stable integer counter/constant or length bound, including guarded `while (true)` and `for (;;)`; other bounds opaque; loop labels thread named break/continue/return completions through nested helpers; block labels refused (`label`) | a label is a named exit of the helper | partial (lane) |
| `for..in` | 76 | a loop over `Object.keys(o)`, a string each (dev) | same | done (dev) |
| `do..while` | 196 | a first-step flag runs the body before testing the condition; with `// @decreases` proved, else an opaque block | same | done (dev) |
| `break`, `continue` | 578, 1,837 | exact | same | done |
| `&&`, `\|\|` as values of one type | 6,855 | exact | same | done |
| `&&`, `\|\|` as values of mixed types (`a && b.c`, `x \|\| "default"` with `x: number \| undefined`) | | exact typed truthiness, one evaluation of the deciding operand, sum/Nullish lifting; unknown truthiness remains source-sensitive | conditional argument mutation remains refused | partial (lane) |
| an effect inside a conditional branch (`cond ? await a() : b`, `a && await b()`) | | exact conditional world/value pairs, including nested logical conditions; no eager right-side effects | conditional argument mutation remains refused | partial (lane) |
| `throw` outside a `try` | 5,417 | a concrete fault value in the returned world, with an unused result placeholder; same-file callers test the fault before continuing | same; loops with abrupt completions use a local opaque transition | partial (lane) |
| `try`/`catch` | 5,378 | exact on straight-line try statements: transition and same-file call checkpoints include conditions and return expressions; loops and callbacks select the local opaque fallback | same; opaque bodies need fuller completion readings | partial (lane) |
| `try`/`finally` without catch | 332 | exact on straight-line try statements: cleanup runs on normal, return and throw paths; complex statements retain their opaque fallback | same; concrete cleanup alias and shadowing conflicts remain refused | partial (lane) |
| a pure call that throws in JavaScript (`JSON.parse`, `new URL`, array holes) | | JSON parse/stringify, URL/RegExp construction, BigInt and URI codecs are may-fault transitions | an argument-only Result reading; other implicit faults still need readings | partial (lane) |
| exceptions across same-file calls | | throwing units and their callers thread the world fault channel; ordinary callees keep their reading | same; higher-order calls need a completion channel | partial (lane) |

## 6. Async, scheduling and iteration

| concept | units | reading today | faithful reading | status |
|---|---|---|---|---|
| `async` unit, `await` of a call | 15,519, 14,660 | exact: a transition of the world | same | done |
| `await` of a held promise | | a transition on the value | same | done |
| `.then`/`.catch`/`.finally` chains | 1,086 | consumed native chains inline arrow continuations and named calls; catch reads the fault path, finally runs on both paths; other chains, including dangling, stored and loop forms, keep the outside transition with opaque handlers | the handler's body is a continuation: `p.then(f)` is `await p` followed by `f`; readable when `f` is a lambda in the subset | partial (lane) |
| `new Promise((resolve, reject) => ...)` | 368 | synchronous terminal resolve/reject executors read as statements; one outside callback bridge stays opaque with captures; incomplete paths and resolver escape refused | a transition whose result is what `resolve` was called with: the executor body is read with `resolve(v)` as the result | partial (lane) |
| `Promise.all` over a map, `Promise.all` of a literal | 607 | awaited inline map and async flatMap collect values in input order; callbacks with observable work after suspension are refused (`promise-all-order`); async predicates are refused (`async-predicate`, promises are truthy); the existing literal reading is unchanged | `allSettled` (57), `race` (38) and `any` stay transitions; general continuation scheduling is not read | partial (lane) |
| `Promise.resolve(v)`, `Promise.reject(e)` | | eligible consumed resolve is value/adoption; reject raises the world fault; other forms keep the outside-call reading | same | partial (lane) |
| fire-and-forget `void p`, unawaited calls | | the call is a transition | same | done |
| timers `setTimeout`, `setInterval` | 450, 84 | transitions; lane B records them as pending work | same | done |
| `for await`, async iterators, generators, `yield` | 225, 62, 201 | pure scalar generators collect yields and yield* into sequences; for-await steps through world-backed iterators with an opaque fuel remainder; scalar async producers are opaque suspended programs; abrupt consumers stay opaque | exact producer state machines and heap-aware captures remain; infinite sync generators refused by name | partial (lane) |
| iterator protocol `Symbol.iterator`, spread of an iterable | | immediate pure-generator spread and Array.from are sequences; custom protocol literals refused (`iterator-protocol`); previous outside fallbacks retained | a user iterable is a sequence via its `next` transitions, bounded | gap (small) |
| microtask and macrotask ordering | | one order (lane B: one microtask queue) | by design: the recording gate's reproducibility check covers scheduling | by design |

## 7. Modules, globals and the world

| concept | units | reading today | faithful reading | status |
|---|---|---|---|---|
| candidate-only unit | measured in results-new-unit/census-report.md | isolated load and drawn execution; `NEW`, local-link `REFUSE(load)`, environment/test `ASK`; no equality claim | same under the stated fake boundary | done (lane) |
| imported function, imported value, module constant | | transition / uninterpreted | same | done |
| module-level `let` state | | module-keyed get/set world transitions; const collections too; literal primitive consts stay values; aliases crossing effects use an opaque unit | a world field, like a field of `this` | partial (lane) |
| code at module level that runs on import | | refused (`toplevel-effect`) | by design for a unit; lane B runs it | by design |
| `process.env`, `window`, `document`, `localStorage`, `navigator` | 1,245, 500, 535, 63, 81 | process/window property and element reads are world transitions; existing outside calls retained | same | partial (lane) |
| `console` | 992 | a transition | same | done |
| `fetch`, `WebSocket`, `AbortController`, `Response`, `Request`, `Headers`, `FormData` | 298, 17, 127, 110, 33, 19, 71 | transitions / uninterpreted constructors | same | done |
| `require()`, dynamic `import()` | 10, 164 | loader transitions return an opaque Ext_Module handle, boxed to the resolved type; specifiers are arguments, including nonliterals | a dynamic import is a transition whose result is a module handle | done (lane) |
| `globalThis`, `global` | 86, 15 | property/element reads are world transitions; assignments stay refused; unsupported combinations retain an opaque unit | the world | partial (lane) |
| `crypto`, `Buffer`, `TextEncoder`, `URL`, `Intl` | 144, 457, 16, 260, 68 | transitions / uninterpreted | `Buffer` and `TextEncoder` are pure functions of their input (uninterpreted is right); `crypto.randomUUID` is a transition | done |
| `eval`, `new Function` | 2 | refused | by design | by design |

## 8. JSX and React

| concept | units | reading today | faithful reading | status |
|---|---|---|---|---|
| element, fragment, text, attributes | 5,972, 713 | exact (`JsxNode` value tree) | same | done |
| handler attribute | 1,560 | pure lambdas; straight-line calls, slot sets and `const` locals as a symbolic descriptor with captured values, an event parameter as the atom `ReactParam(k)` (`handlers.mjs`); lane B applies each readable descriptor to the hook slots and compares with the real invocation (`ASK:handler-model` on a disagreement); other bodies opaque by text and captures | branching deferred bodies as symbolic expressions too | partial (lane) |
| spread attribute | 1,295 | a map merge in order | same | done |
| conditional children, `.map` children, arrays | | exact (`JsxNothing`, `JsxList`) | same | done |
| hooks (`useState`, `useEffect`, `useQuery`, `useRouter`) | 2,585 | state and scheduling transitions; current state and setter are values returned by the world; setter invocation is a transition | same | done (lane) |
| `useEffect` bodies, `useCallback`, `useMemo` | | pure scalar `useMemo` is its expression and `useCallback` is its function when dependencies cover captures; other forms stay transitions; effect bodies remain opaque with captures | broader pure memo expressions and complete render-history semantics | partial (lane) |
| context, refs, portals, `forwardRef`, `memo` | | uninterpreted | same | done |
| class components | | section 4 | same | partial |

## 9. Types only (erased at run time)

Generics, unions, intersections, mapped and conditional types, `keyof`, `typeof` types, enums, namespaces,
`declare`, overloads, abstract classes, `unique symbol`, template literal types, `asserts` and `is` predicates: the
translator reads the checker's view of a value's type, so these shape the reading of values (a union of records is
`Any`, a literal union is a string) and need no reading of their own. An indexed access on a type parameter (`T["resource"]`), a conditional or mapped type, `never`, `object` and `symbol`
are opaque values in the lint and the translator (dev c749031).

## 10. The translate pass (what lints but does not translate)

Of 316 lint-admitted units in 120 sampled nexus files, 272 translate (86.1 percent). The 44 failures:

| class | count | reading to build |
|---|---|---|
| an effect inside a callback to an array method | 10 | the loop reading (section 3) |
| `&&` / `\|\|` as values of mixed types | 6 | the conditional reading (section 5) |
| an effect inside a conditional branch | 4 | the `if` reading (section 5) |
| `never` as a value type | 4 | an unreachable branch |
| spread into a dictionary literal | 4 | a map merge |
| `void \| PromiseLike<void>` return of a callback | 3 | `Unit` |
| `object` as a type | 3 | `Any` |
| a statement expression with no rule (`x?.m()` as a statement on a field) | 2 | the optional call as a statement |
| an effect on the right of `&&` | 2 | the conditional transition |
| a callee that was not translated; a 0.5 literal; a field of a non-record; nesting too deep | 6 | per class |

## 11. Ranked next readings, by units unlocked

1. Callbacks with effects as loops: `forEach` done on dev; `map`/`filter` with effects under `Promise.all` next.
2. Done on dev: `super.m()` as a transition on the receiver (115 units); the clock read of `new Date()`. A same-file parent read exactly remains.
3. Done on dev: `&&`/`||` as mixed-type values, `??` lifting, effects in conditional branches and on the right of a logic operator.
4. `.then` chains and `new Promise` as readings instead of transitions with opaque handlers: 1,086 + 368; `Promise.all` is done on dev.
5. Done on dev: division and floats per file (`/` 1,399 units, float literals 1,205) and `**` as an uninterpreted power; finite bitwise and unary coercions are read (lane); specials use conservative opacity or named refusal.
6. Done on dev: `delete`, computed property names, `??=`, rest parameters and patterns, `do..while`, `**`. Loop labels, scalar fall-through and inferred counter bounds are read (lane); `for..in` is done (dev). Finite bitwise on `bv32` is read (lane). Left: wider bounds.
7. Exceptions across same-file calls (`Result` channel) and `try`/`finally`.
8. Generators, async iterators, iterator protocol: 488 units.
9. The heap layer: aliases (4,620 locals bound to another name), objects from the world, `===` on objects.
10. Strings as UTF-16 code units; `typeof`, `instanceof`, `in` exact by static type.

What stays by design: prototype mutation, `Proxy`, `eval`, `arguments`, `this` rebinding, loose equality, scheduling
order. Each has a lint message that says what to write instead.
