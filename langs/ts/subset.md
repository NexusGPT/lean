# The TypeScript subset (version 2)

A function inside the subset is a function over plain data whose every step is either translated exactly into Dafny or
passed through as an **uninterpreted external**: a Dafny function with no body, identical on both sides of a proof. The
proof then means: on every input, the parent and the candidate make the same external calls with the same arguments and
compute the same value from the results. `lint/lint.mjs` enforces the rules below. The lint reads the file with the
TypeScript compiler, inside its project when a `tsconfig.json` is found above the file (imports and types resolve through
the project; a workspace package resolves to its source in the same tree), and reports compiler errors inside the checked
functions (rule `ts-strict`, except implicit `any`, which is opaque).

A function that uses anything outside the subset is refused when it changes. Code that does not change is equal by
identity and is not checked (`--changed`).

## What is exact

| Part | Allowed | Example |
|---|---|---|
| Types | `number` (an exact `int`; `--real` for `real`), `bigint`, `boolean`, `string`, literal unions of one base (`"a" \| "b"`, enums) | `(x: number): boolean` |
| Arrays | `T[]`, `readonly T[]`, `as const` lists, open tuples `[T, ...T[]]` | `xs: readonly number[]` |
| Tuples | `readonly [A, B]` | `p: readonly [number, number]` |
| Records | any object type the compiler can list, from any file; an intersection; two types with the same fields are one datatype | `type Account = { readonly id: number; readonly balance: number }` |
| Dictionaries | `{ [k: string]: V }`, `Record<string, V>` | `counts[key]` |
| Sets and maps | `Set<T>`, `Map<K, V>` (`has`, `get`, `size`, `add`/`set`/`delete` on a local) | `new Set(xs).has(x)` |
| Optionals | `T \| undefined`, `T \| null`, `f?: T`; `x == null`, `x ?? y`, `x?.f`, `x!` | `x: number \| null` |
| Declarations | `let`, `const`, destructuring patterns (no defaults, no rest) | `const { a, b } = r;` |
| Control | `if`/`else`, `switch` (each case ends in `return` or `break`), early `return`, `return` inside a loop, `break`, `continue`, `throw` | `switch (kind) { case "a": return 1; default: return 0; }` |
| Loops | `for...of` over an array, string, set, map or iterable; `for (let i = a; i < b; i++)`; `while` with `// @decreases` | `for (const x of xs) { ... }` |
| Operators | `+ - *`, `%`, `Math.floor(a / b)`, `Math.trunc(a / b)`, unary `-`, `! && \|\| ??`, `=== !==`, `< <= > >=`, `?:`; `&&`/`\|\|` as values when both sides share a type | `Math.floor(n / 2)` |
| Assignment | `=`, `+=`, `-=`, `*=`, `++`, `--` on a local; `x.f = v` and `xs[i] = v` on a local the function owns | `total = total + x;` |
| Arrays at work | `xs[i]`, `.length`, `[a, ...xs]`, `push`/`unshift` on a local (one value or one spread), `includes`, `indexOf`, `slice`, `concat`, `join`, `flat`, `at`, `some`, `every`, `find`, `findIndex`, `map`, `filter`, `flatMap`, `reduce` | `xs.filter((x) => x > 0)` |
| Strings | literals, template literals, `+` (a non-string side is converted), `===`, `.length`, `s[i]`, `includes`, `startsWith`, `endsWith`, `indexOf`, `slice`, `substring`, `charAt`, `at`, `concat`, `repeat` | `` `${name}: ${n}` `` |
| Records at work | `{ f: v }`, `{ ...r, f: v }`, `r.f`, `r["f"]`, `r[k]` with `k` a literal union | `{ ...a, balance: a.balance + n }` |
| Calls | other top-level functions of the same file (no recursion); a function-typed parameter or local | `double(double(x))` |
| Functions | `function` declarations and `const f = (...) => ...`; `async` functions (the result type is unwrapped) | `export const f = (x: number): number => x + 1` |

## What is uninterpreted

Each of these becomes a bodiless Dafny function in the prelude, named from what it is. Two sides that call it on the same
arguments get the same result; two sides that call different externals, or the same one on different arguments, are not
provably equal (the gate asks).

| Part | Example | Modelled as |
|---|---|---|
| Imported values and functions, module constants, values from other files | `isRequiredUuid(id)`, `LIMITS.max` | `ext_isRequiredUuid_string(id)`, `ext_LIMITS_max()` |
| `await f(x)` | `await repo.find(id)` | `ext_await_repo_find_…(id)` |
| `any`, `unknown`, a union of records, `string \| SomeObject` | `node.type`, `x === y` | the opaque type `Any`; accessor and operator externals; `==` on `Any` |
| Methods of a record type or a class instance | `date.getTime()` | `ext_Ext_Date_getTime(date)` |
| Library calls with no exact rule: `trim`, `toLowerCase`, `split`, `replace`, `sort`, `JSON`, `String`, `Buffer`, `Object` is refused | `s.trim()` | `ext_str_trim(s)` |
| Regular expressions, `new RegExp`, `.test`, `.replace(re, …)` | `/a+/.test(s)` | an opaque constant per literal, externals for the operations |
| Callbacks passed to an external, to a local function value, or to `sort` on a fresh array | `[...xs].sort((a, b) => a - b)` | a Dafny lambda argument; the same lambda text proves equal, a different one does not |
| `as T`, `<T>x` | `x as number[]` | identity when the Dafny types agree, else `ext_cast_A_B(x)` |
| `typeof x` | `typeof x === "string"` | `ext_typeof_Any(x)` |
| `throw e` | `throw new Error("bad")` | the function's result is `ext_throw_R(e)` |
| `new X(...)` for any `X` but `Set`, `Map`, `RegExp` | `new Error(msg)` | `ext_new_Error_string(msg)` |
| Tagged templates | ``sql`select ${id}` `` | `ext_tag_sql_1(["select ", ""], id)` |

## What is refused

| Rule | Refused | Example that is refused |
|---|---|---|
| `dynamic-eval` | `eval`, `Function`, `new Function` | `eval(code)` |
| `effect` | `console`, `process`, `fetch`, timers, `require`, storage | `console.log(x)` |
| `import` | a module whose exports are effects (`node:*`, `fs`, `http`, drivers, SDKs) | `import { readFileSync } from 'node:fs'` |
| `nondeterminism` | `Math.random`, `Date`, `new Date()`, `crypto` | `Date.now()` |
| `this`, `class` | classes and `this` | `class A { n = 0 }` |
| `prototype` | `.prototype`, `.constructor`, `__proto__`, `Object`, `Reflect`, `Proxy`, `in`, `instanceof` | `Object.keys(x)` |
| `try-catch` | exceptions caught | `try { ... } catch (e) { ... }` |
| `global-mutation`, `global-read`, `toplevel-state` | module `let`/`var`, assignment to anything the function does not own | `counter = counter + 1` |
| `param-assign`, `param-mutation`, `property-assign`, `index-assign` | changing a parameter, or a field or slot of what the function does not own; `sort`/`reverse` on a named array | `xs.push(1)` on a parameter |
| `closure-mutation` | a callback changing a variable declared outside it | `xs.forEach((x) => { n += x; })` |
| `function-value` | an arrow function anywhere but as a call argument | `const f = (x) => x + 1` |
| `nested-function` | a nested `function` declaration | `function inner() {}` inside |
| `division` | bare `/` on numbers (write `Math.floor(a / b)`), `/=`, `%=` | `x / 2` |
| `loose-equality` | `==` and `!=` except against `null`/`undefined` | `a == b` |
| `reference-equality` | `===` on arrays and records | `xs === ys` |
| `string-order` | ordering strings | `a < b` on strings |
| `unbounded-loop` | `while` without `// @decreases` | `while (i > 0) { ... }` |
| `loop-form`, `do-while`, `for-in`, `label` | any other loop form | `for (;;) {}` |
| `optional-chain` | optional calls `f?.()` | `cb?.()` |
| `async` | `await` outside an async function, `for await`, async callbacks, `new Promise` | `xs.map(async (x) => …)` |
| `generic` | type parameters on the function | `function id<T>(x: T): T` |
| `union-type` | a union the translator cannot name (a record beside an array, two different arrays) | `number[] \| string[]` |
| `bitwise`, `unary-coercion`, `update-expression`, `assignment-expression`, `comma` | `& \| ^ ~ << >>`, unary `+`, `x++` inside an expression, `a = b` inside an expression, `,` | `+x` |
| `callback-form` | a callback that is not an arrow function | `xs.map(function (x) { return x; })` |
| `ts-strict`, `unresolved-module` | a compiler error in strict mode; a module the project cannot resolve | a type mismatch |
| `param-form` | default or rest parameters | `(x = 1)` |

## Proof hints

The proof hints are comments just before a loop, written in Dafny syntax with the TypeScript variable names:

```ts
// @invariant steps + i == n
// @decreases i
while (i > 0) { ... }
```

A hint is untrusted. Dafny checks it, and a wrong hint only makes a proof fail. A `for` loop needs no bound: the
translator derives it.

## What the translator writes

- `--core` writes pure Dafny functions, as `conformance/run.py` expects. A loop becomes a recursive helper function
  with `decreases`; a `return` inside a loop makes the helper return `(Option<R>, state)`. With `--prelude <file>` the
  shared declarations (datatypes, helpers with bodies, bodiless externals) go to that file and the main file `include`s
  it; `spec/theorem.py` merges the parent's and the candidate's preludes and refuses when a block of the same name differs.
- The default shape writes one `method` per function with a loop, so the loop keeps `invariant` and `decreases` lines.
  It covers the exact subset only (no externals), for the fixtures.

## Modelling axioms

- `number` is an exact integer (`int`) by default. A float literal is refused. With `--real`, `number` is a Dafny `real`,
  exact decimal arithmetic, not IEEE 754. Neither choice models overflow, `NaN` or rounding.
- `undefined` and `null` are one value (`None`).
- Array access outside the bounds is a proof obligation, not `undefined`. A dictionary read of an absent key is
  `ext_absent_V()`.
- An external is a pure function of its arguments. A call that reads a clock, a database or a file is modelled as pure:
  two sides making the same call see the same world. This is the axiom that makes `await` translatable, and it is the
  reason effect modules are refused at import.
- Two syntactically identical lambdas are equal in Dafny; a changed lambda passed to an external is a changed argument.
- Recursion, mutual recursion included, is not covered.
