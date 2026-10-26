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
| `/` division | 1,399 | refused (`division`) unless under `Math.floor`/`Math.trunc` | real division on `real`, or integer division when the result is floored: pick by the enclosing operation | gap |
| float literal, IEEE double | 1,205 | refused in `int` mode; exact `real` with `--real` | a per-unit choice: a unit with a float literal or a `/` is a real unit; neither models rounding, overflow, `NaN`, `-0` | partial |
| `**` | 46 | refused (`unsupported-operator`) | `Pow(int, nat)` helper, uninterpreted on reals | gap |
| bitwise `& \| ^ ~ << >> >>>` | 128 | refused (`bitwise`) | exact on `bv32` with the JavaScript int32 coercion | gap |
| `++ --` as statements | 1,223 postfix | exact | same | done |
| `++`, assignment as a value | 116, 119 | refused | the value of the expression after the update | gap |
| `bigint` | 12 | exact (`int`) | same | done |
| `NaN`, `Infinity`, `Number.isNaN` | 188 (`isNaN`) | `Number.*` uninterpreted | a real unit with the IEEE special values as an extended datatype | gap |
| unary `+` coercion | 16 | refused (`unary-coercion`) | `ext_number_of(x)` uninterpreted | gap (small) |
| string concatenation, template strings | 14,140 templates | exact; a non-string side is converted by `String(x)` uninterpreted | same | done |
| string methods with a rule (`includes`, `slice`, `indexOf`, `startsWith`, `repeat`, `charAt`, `at`, `substring`, `concat`) | | exact | same | done |
| string methods without a rule (`trim`, `toLowerCase`, `split`, `replace`, `padStart`, `localeCompare`, `normalize`) | | uninterpreted | exact for `trim`, `toLowerCase`/`toUpperCase` (ASCII), `split` on a literal, `padStart`/`padEnd`; the rest stay uninterpreted | gap (small) |
| string length and indexing | | `\|s\|`, `s[i]` on Dafny `string` (a sequence of Unicode scalars under Dafny 4) | JavaScript counts UTF-16 code units: a string with an astral character has a different length; a faithful reading is a sequence of code units | gap (stated) |
| string ordering `<` | | refused (`string-order`) | lexicographic by code unit, exact | gap (small) |
| `==` loose equality | 398 | refused except against `null`/`undefined` | by design: the lint says `===` | by design |
| `===` on primitives | 19,845 | exact | same | done |
| `===` on objects and arrays | | refused (`reference-equality`) | by design in a value model; the heap layer (section 4) would give it an address reading | by design until the heap layer |
| `typeof` | 3,351 | uninterpreted `ext_typeof_Any` | exact by the static type when it is known (`"string"` for a `string`), uninterpreted on `any` | partial |
| regular expressions | 1,950 | an opaque constant per literal, externals for `test`, `match`, `replace` | the same; an exact reading of regular expressions is a project of its own | by design |
| `Date` | 1,337 `new Date`, 591 `Date.now` | `Date.now()` and `new Date()` with no argument are transitions (dev 364eb1e); `new Date(x)` a pure value; methods uninterpreted | same | done (dev) |
| `Math.*` | | `min`, `max`, `abs`, `floor`, `trunc` exact; the rest uninterpreted; `Math.random` a transition | `ceil`, `round`, `sign`, `pow` on integers exact | gap (small) |
| `JSON.stringify`, `JSON.parse` | 1,714, 699 | uninterpreted functions of their argument | same (a serialisation is a function of its value) | done |
| `Symbol`, `Symbol.iterator` | 37 | refused (`unsupported-syntax` on use) | a symbol is an opaque constant per declaration; iterator protocol is section 6 | gap (small) |
| `null` and `undefined` as one value | | `None` | JavaScript distinguishes them (`== null` conflates); a two-constructor `Absent` datatype would keep the distinction | partial |

## 2. Objects, records and references

| concept | units | reading today | faithful reading | status |
|---|---|---|---|---|
| object literal, field read, spread `{...a, f: v}` | 23,412 literals, 4,151 spreads | exact (a datatype per shape) | same | done |
| field assignment on a local the function built | 3,914 | exact (a datatype update) | same | done |
| field, slot or contents assignment on a parameter | 815 + 523 | exact: the parameter is an output of the function (references layer 1) | same, plus the heap layer for objects shared between parameters | done (layer 1) |
| mutation through a local alias of a parameter | 4,620 locals bound to another name | refused (`alias-mutation`) | the heap layer: one object, two names | gap (layer 2) |
| mutation of a field of `this` | 739 assign, 779 mutating method | exact: a field any method assigns lives in the world | same | done |
| mutation of a field of a field of `this` | | refused (`receiver-mutation`) | a path update like a parameter path | gap (small) |
| mutation of an object reached from the world (a query result, a module object) | 80 computed targets | refused (`property-assign`) | the heap layer | gap (layer 2) |
| `delete obj.f` | 498 | refused | a record with optional fields: `r.(f := None)`; a dictionary: `m - {k}` | gap (small) |
| dictionary `Record<string, V>`: read, write by key, `in`, `Object.keys/entries/values` | 1,105 keys, 740 entries | exact map; `in` uninterpreted; `Object.keys` a transition (over-approximate) | `in` exact (`k in m`); `Object.keys` exact as the key set in insertion order (Dafny: a sequence of the keys, uninterpreted order) | partial |
| computed member access `obj[k]` on a record | 5,278 | exact on arrays and dictionaries; refused on a record with a non-literal key (`dynamic-key`) | a record read by a dynamic key is a dictionary read: translate the record as a map when it is read dynamically | gap |
| computed property name `{[k]: v}` | 487 | refused | a dictionary literal | gap (small) |
| getters and setters | 7 | a getter read is a pure accessor of the receiver; a setter write is a world field write; neither is a unit of its own | the getter's body as the accessor when it is in the subset | partial |
| object literal with methods | 157 | refused (`unsupported-syntax`) | an opaque value keyed by its text, like a handler | gap (small) |
| prototype access, `Object.create`, `Object.defineProperty`, `Object.setPrototypeOf` | 134 + 7 + 20 + 1 | refused (`prototype`) | by design: no value reading | by design |
| `Proxy`, `Reflect` | 41 | refused | by design | by design |
| `Object.assign`, `Object.freeze`, `Object.fromEntries`, `structuredClone` | 390, 6, 196, 32 | `Object.*` a transition (over-approximate) | exact: `assign` is a record update, `freeze` identity, `fromEntries` a map literal, `structuredClone` identity in a value model | gap (small) |
| `instanceof` | 2,204 | uninterpreted `ext_instanceof_C(x)` | exact when the static type decides it; uninterpreted otherwise | partial |
| `in` | 1,071 | uninterpreted | exact on a dictionary; by static type on a record | partial |
| `x!` non-null | 501 | `.value` when optional | same | done |
| optional chaining `a?.b`, `a?.m()` | 6,061, 493 | exact (Option propagation; a conditional transition for calls) | same | done |
| `??`, `??=` | 7,882, 107 | `??` exact; `??=` refused | `??=` is `x = x ?? v` | gap (small) |
| `as` casts, `satisfies` | 6,995, 105 | identity when the shapes agree, else uninterpreted cast | same | done |
| `arguments` object | 133 | refused | by design (use rest parameters, section 3) | by design |

## 3. Functions, closures and calls

| concept | units | reading today | faithful reading | status |
|---|---|---|---|---|
| top-level function, arrow const, call | | exact | same | done |
| default parameters | 108 | exact (`Option` with the default filled) | same | done |
| rest parameters `...xs` | 37 | refused (`param-form`) | a sequence parameter; a call with spread passes it | gap (small) |
| spread in a call `f(...xs)` | 3,060 (with arrays) | refused in calls | exact when the callee has a rest parameter; uninterpreted call otherwise | gap (small) |
| destructuring, defaults in object patterns | 7,988, 241 | exact | same | done |
| defaults in array patterns, rest patterns | 346 rest | refused | exact (`xs[i]` with a bound, `xs[i..]`) | gap (small) |
| nested function value (arrow) as a callback to an array method | 14,867 nested values | exact lambda when pure | same | done |
| callback with an effect inside (`xs.map(async (x) => await f(x))`, `forEach` with a call) | 2,209 async callbacks | `forEach` with a sync arrow is a loop over the sequence (dev 364eb1e; a `return` ends one step); an async `forEach` callback is refused with the bug named (`forEach` does not wait); other callbacks with effects stay opaque values by text | `map`/`filter` with effects under `Promise.all` as a loop producing a sequence | partial |
| closure that assigns an outer variable | 65 | refused (`closure-mutation`) | the loop reading above when the callback is a loop body; by design otherwise | partial |
| closure that mutates an outer object | 1,831 | refused | the loop reading; the heap layer for the rest | gap |
| nested function declaration | 215 | refused | a local lambda | gap (small) |
| recursion, mutual recursion | | exact with a fuel | same | done |
| generics on the unit | 902 | exact (type parameters with equality) | same | done |
| function-typed parameters and locals, called | | exact (applied as a function value) | same | done |
| a function value returned, stored in a record field, or compared | 262 units (`function-value`) | refused as a bare expression; allowed as a local const or a record field | an opaque function value keyed by its text everywhere | gap (small) |
| `this` binding of a free function, `.call`/`.apply`/`.bind` | | refused / uninterpreted | by design | by design |
| tagged templates | 173 | uninterpreted function of the strings and the values | same | done |
| `void f()` | 686 | exact (the call) | same | done |
| comma operator | 8 | refused | exact (sequence) | gap (small) |

## 4. Classes and `this`

| concept | units | reading today | faithful reading | status |
|---|---|---|---|---|
| class method, static method | 16,377, 926 | exact (a function of an explicit receiver) | same | done |
| a constructor that stores ports; `this.port.m()` | | a transition of the world | same | done |
| a field any method assigns | 739 | the world (get/set transitions) | same | done |
| method of a class that extends another | 8,240 | inside: an inherited method call is a transition on the receiver, an inherited field a pure accessor (probed) | same; a same-file parent's method could be the parent's own translation | done |
| `super.m()`, `super(...)` | 115 | refused (`class`) | a call of the parent's method: same-file parent exact, else a transition | gap (small) |
| getters and setters on a class | 7 | section 2 | section 2 | partial |
| `#private` fields | 81 | as fields | same | done |
| class expression | 2 | refused | by design | by design |
| decorators | 2 inside units (many on classes) | ignored by the translator (a declaration-level attribute); run by lane B | same | done |
| `new C()` of a same-file class | 10,265 `new` | an uninterpreted constructor value of its arguments | exact: the record of the fields the constructor assigns, when the constructor is in the subset | gap |
| `instanceof` for narrowing on classes | | uninterpreted | by the static type when the checker narrows | partial |

## 5. Control flow and exceptions

| concept | units | reading today | faithful reading | status |
|---|---|---|---|---|
| `if`, `switch` with `return`/`break` per case, `?:`, early return | 21,957, 1,076, 13,560 | exact | same | done |
| `switch` with fall-through | | refused | exact: the clause list with the fall-through as a chain | gap (small) |
| `for..of`, counted `for`, `while` with a bound | 4,595, 1,397, 477 | exact (a recursive helper) | same | done |
| `while` without a bound, `do..while`, labelled statements, `for..in` | 477 (some), 196, 10, 76 | opaque block / refused | `do..while` is a `while` with the body first; `for..in` over a dictionary is `for..of` over its keys; a label is a named exit of the helper | gap (small) |
| `break`, `continue` | 578, 1,837 | exact | same | done |
| `&&`, `\|\|` as values of one type | 6,855 | exact | same | done |
| `&&`, `\|\|` as values of mixed types (`a && b.c`, `x \|\| "default"` with `x: number \| undefined`) | | exact: a conditional on truthiness with both sides lifted to the result type (dev); `??` lifted the same way | same | done (dev) |
| an effect inside a conditional branch (`cond ? await a() : b`, `a && await b()`) | | exact: the branch's transitions happen only when it is taken; the world and the value come out as one pair (dev) | same | done (dev) |
| `throw` outside a `try` | 5,417 | the function's result is `ext_throw_R(e)` | a thrown value is a second result channel: `Result<R, Any>`; the caller's `try` would then read it | partial (section 5, exceptions across calls) |
| `try`/`catch` | 5,378 | exact: a fault flag on the world after each transition of the body; the catch path binds the fault value | same; plus: a same-file callee's `throw` should raise the caller's fault (today it is the callee's result) | partial |
| `try`/`finally` without catch | 332 | opaque block | the `finally` statements run on both paths | gap (small) |
| a pure call that throws in JavaScript (`JSON.parse`, `new URL`, array holes) | | never faults in the model | a `may fault` set of pure library functions whose fault is a predicate of the argument | gap (small) |
| exceptions across same-file calls | | the callee's throw is its result; the caller sees a value | the callee's fault raises in the caller: a callee with a `throw` returns `Result`, and the call site tests it | gap |

## 6. Async, scheduling and iteration

| concept | units | reading today | faithful reading | status |
|---|---|---|---|---|
| `async` unit, `await` of a call | 15,519, 14,660 | exact: a transition of the world | same | done |
| `await` of a held promise | | a transition on the value | same | done |
| `.then`/`.catch`/`.finally` chains | 1,086 | a transition with the handler as an opaque value | the handler's body is a continuation: `p.then(f)` is `await p` followed by `f`; readable when `f` is a lambda in the subset | gap |
| `new Promise((resolve, reject) => ...)` | 368 | refused | a transition whose result is what `resolve` was called with: the executor body is read with `resolve(v)` as the result | gap (small) |
| `Promise.all`, `Promise.allSettled`, `Promise.race` | 607, 57, 38 | an external call with the array argument | `Promise.all(xs)` is the sequence of the awaited values in order (the transitions happen in array order, a stated reading); `race` is a transition with an uninterpreted choice | gap |
| fire-and-forget `void p`, unawaited calls | | the call is a transition | same | done |
| timers `setTimeout`, `setInterval` | 450, 84 | transitions; lane B records them as pending work | same | done |
| `for await`, async iterators, generators, `yield` | 225, 62, 201 | refused (`async`, `generator`) | a generator is a function returning a sequence (bounded by a fuel); `for await` over an async iterable is a loop of transitions | gap |
| iterator protocol `Symbol.iterator`, spread of an iterable | | refused | a user iterable is a sequence via its `next` transitions, bounded | gap (small) |
| microtask and macrotask ordering | | one order (lane B: one microtask queue) | by design: the recording gate's reproducibility check covers scheduling | by design |

## 7. Modules, globals and the world

| concept | units | reading today | faithful reading | status |
|---|---|---|---|---|
| imported function, imported value, module constant | | transition / uninterpreted | same | done |
| module-level `let` state | | refused (`toplevel-state`) | a world field, like a field of `this` | gap (small) |
| code at module level that runs on import | | refused (`toplevel-effect`) | by design for a unit; lane B runs it | by design |
| `process.env`, `window`, `document`, `localStorage`, `navigator` | 1,245, 500, 535, 63, 81 | transitions of the world | same | done |
| `console` | 992 | a transition | same | done |
| `fetch`, `WebSocket`, `AbortController`, `Response`, `Request`, `Headers`, `FormData` | 298, 17, 127, 110, 33, 19, 71 | transitions / uninterpreted constructors | same | done |
| `require()`, dynamic `import()` | 10, 164 | refused / transition | a dynamic import is a transition whose result is a module handle | gap (small) |
| `globalThis`, `global` | 86, 15 | refused (`global-read`) | the world | gap (small) |
| `crypto`, `Buffer`, `TextEncoder`, `URL`, `Intl` | 144, 457, 16, 260, 68 | transitions / uninterpreted | `Buffer` and `TextEncoder` are pure functions of their input (uninterpreted is right); `crypto.randomUUID` is a transition | done |
| `eval`, `new Function` | 2 | refused | by design | by design |

## 8. JSX and React

| concept | units | reading today | faithful reading | status |
|---|---|---|---|---|
| element, fragment, text, attributes | 5,972, 713 | exact (`JsxNode` value tree) | same | done |
| handler attribute | 1,560 | an opaque value keyed by its text | the handler body as a lambda when it is in the subset, so a rewired call is a difference inside the handler too | partial |
| spread attribute | 1,295 | a map merge in order | same | done |
| conditional children, `.map` children, arrays | | exact (`JsxNothing`, `JsxList`) | same | done |
| hooks (`useState`, `useEffect`, `useQuery`, `useRouter`) | 2,585 | transitions of the world at the top of the render | same; `useState`'s setter is an opaque function value | done |
| `useEffect` bodies, `useCallback`, `useMemo` | | the callback is an opaque value by text | `useMemo(() => e, deps)` is `e`; `useCallback(f)` is `f`; `useEffect` stays a transition with its body an opaque value | gap (small) |
| context, refs, portals, `forwardRef`, `memo` | | uninterpreted | same | done |
| class components | | section 4 | same | partial |

## 9. Types only (erased at run time)

Generics, unions, intersections, mapped and conditional types, `keyof`, `typeof` types, enums, namespaces,
`declare`, overloads, abstract classes, `unique symbol`, template literal types, `asserts` and `is` predicates: the
translator reads the checker's view of a value's type, so these shape the reading of values (a union of records is
`Any`, a literal union is a string) and need no reading of their own. Two gaps: a `never`-typed value (4 of 44
translate-pass failures) and `object` (3 of 44) have no Dafny type; `never` is an unreachable branch and `object` is
`Any`.

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
2. `super` calls (115 units); the clock read of `new Date()` is done on dev.
3. Done on dev: `&&`/`||` as mixed-type values, `??` lifting, effects in conditional branches and on the right of a logic operator.
4. `.then` chains, `new Promise`, `Promise.all` as readings instead of transitions with opaque handlers: 1,086 + 368 + 607.
5. Division and floats per unit (`/` 1,399 units, float literals 1,205): a real unit when it uses either.
6. `delete`, computed property names, `??=`, rest parameters and patterns, `do..while`, `for..in`, fall-through, `**`, bitwise on `bv32`: small each, about 2,000 units together.
7. Exceptions across same-file calls (`Result` channel) and `try`/`finally`.
8. Generators, async iterators, iterator protocol: 488 units.
9. The heap layer: aliases (4,620 locals bound to another name), objects from the world, `===` on objects.
10. Strings as UTF-16 code units; `typeof`, `instanceof`, `in` exact by static type.

What stays by design: prototype mutation, `Proxy`, `eval`, `arguments`, `this` rebinding, loose equality, scheduling
order. Each has a lint message that says what to write instead.
