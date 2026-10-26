# The TypeScript subset (version 3)

A function inside the subset is read as mathematics: every value is a mathematical value (a number, a string, a
record, a sequence, a set, a map, an optional), every call into the outside world is a **transition of an explicit
world** (`ext_f(world, args): (world', result)`), and every block the translator cannot model is an **opaque block**,
one uninterpreted transition named by the block's own text. The proof then means: on every input and in every world,
the parent and the candidate return the same value and make the same transitions in the same order.
`lint/lint.mjs` enforces the rules below; `translate/translate.mjs` is the program that gives them meaning, and the
two cannot disagree because the translator runs the lint before it writes a line.

The lint reads the file with the TypeScript compiler, inside its project when a `tsconfig.json` is found above the
file (imports and types resolve through the project; a workspace package resolves to its source in the same tree), and
reports compiler errors inside the checked functions (rule `ts-strict`). A module the project cannot resolve is
reported as `unresolved-module`; its values are opaque and the finding is an environment finding, not a refusal.

The measured reach of this version on code written before it existed: 60.0 percent of 48,696 functions and methods
across 39 repositories, 83.4 percent of the nexus backend (`langs/ts/census.mjs` prints the share and the blocking
rules per package).

## What is exact

| Part | Allowed | Example |
|---|---|---|
| Types | `number` (an exact `int`; `--real` for `real`), `bigint`, `boolean`, `string`, literal unions, enums, type parameters of the function | `function id<T>(x: T): T` |
| Arrays | `T[]`, `readonly T[]`, `as const` lists, tuples, array-like interfaces (a match result) | `xs: readonly number[]` |
| Records | any object type the compiler can list, from any file; an intersection; two types with the same fields are one datatype | `type Account = { readonly id: number; readonly balance: number }` |
| Dictionaries | `{ [k: string]: V }`, `Record<string, V>`; read by a computed string key; assigned by key on a local | `counts[key] = 1` |
| Sets and maps | `Set<T>`, `Map<K, V>` (`has`, `get`, `size`, `keys`, `values`, `entries`, `add`/`set`/`delete` on a local) | `new Set(xs).has(x)` |
| Optionals | `T \| undefined`, `T \| null`, `f?: T`; `x == null`, `x ?? y`, `x?.f`, `x?.m()`, `x!` | `x: number \| null` |
| Declarations | `let`, `const`, `let x: T;` assigned before any read, destructuring patterns with defaults on object patterns | `const { a = 1, b } = r;` |
| Control | `if`/`else`, `switch` (each case ends in `return` or `break`), early `return`, `return` inside a loop, `break`, `continue`, `throw`, `void f()` | `switch (kind) { case "a": return 1; default: return 0; }` |
| Loops | `for...of` over an array, string, set, map or iterable; `for (let i = a; i < b; i += k)` up or down by a constant step; `while` with `// @decreases` | `for (let i = n - 1; i >= 0; i--)` |
| Operators | `+ - * %`, `Math.floor(a / b)`, `Math.trunc(a / b)`, `Math.min`, `Math.max`, `Math.abs`, unary `-`, `! && \|\| ??`, `=== !==`, `< <= > >=`, `?:`, `typeof`, `instanceof`, `in`; `&&`/`\|\|` as values when both sides share a type | `Math.floor(n / 2)` |
| Assignment | `=`, `+=`, `-=`, `*=`, `++`, `--` on a local; `x.f = v` and `xs[i] = v` on a local the function owns; `this.f = v`, `this.f += v`, `this.f++` on a field of the receiver | `total = total + x;` |
| Arrays at work | `xs[i]`, `.length`, `[a, ...xs]`, `push`/`unshift` on a local, `includes`, `indexOf`, `slice`, `concat`, `join`, `flat`, `at`, `some`, `every`, `find`, `findIndex`, `map`, `filter`, `flatMap`, `reduce`, with index callbacks | `xs.map((x, i) => x * i)` |
| Strings | literals, template literals, `+` (a non-string side is converted), `===`, `.length`, `s[i]`, `includes`, `startsWith`, `endsWith`, `indexOf`, `slice`, `substring`, `charAt`, `at`, `concat`, `repeat` | `` `${name}: ${n}` `` |
| Numbers | `toFixed`, `toString`, `toPrecision`, `toExponential` as uninterpreted functions of the number | `n.toFixed(2)` |
| Records at work | `{ f: v }`, `{ ...r, f: v }`, `r.f`, `r["f"]`, `r[k]` with `k` a literal union or a string on a dictionary | `{ ...a, balance: a.balance + n }` |
| Calls | top-level functions of the same file, recursion included (a fuel bounds the unfolding; the theorem holds for every fuel), default arguments, a function-typed parameter or local, a local lambda `const f = (x) => ...` | `double(double(x))` |
| Functions | `function` declarations, `const f = (...) => ...`, `async` functions (the result type is unwrapped), generic functions, same-file functions named as callback values | `xs.map(double)` |
| Classes | methods and static methods; a constructor that stores injected ports; fields read through `this`; a field any method assigns lives in the world (each read and write is a transition); a method of `this` called from a method | `class Svc { constructor(private readonly repo: Repo) {} async find(id: string) { return this.repo.find(id); } }` |

## What is a transition of the world

Each of these becomes a bodiless Dafny function that takes the world and returns the next world with its result. Two
calls of the same operation are two transitions; two reads of a clock are two values. A candidate that makes a
transition the parent did not make, or makes it with another argument or in another order, is not provably equal.

| Part | Example | Modelled as |
|---|---|---|
| An imported function, a method of an imported object, a value from another file | `isRequiredUuid(id)` | `ext_isRequiredUuid(wld, id)` |
| `await f(x)`, `await p` | `await repo.find(id)` | `ext_await_Repo_find(wld, repo, id)` |
| A method of a record, a class instance, an `any` | `date.getTime()` | `ext_Ext_Date_getTime(wld, date)` |
| A method of a field of `this`, a method-call statement on any receiver | `this.items.push(x)` | a transition on the field's value |
| A clock, randomness, the environment, a console, a fetch | `Date.now()`, `Math.random()`, `console.log(x)` | `ext_Date_now(wld)`, `ext_Math_random(wld)`, a transition of the console |
| `new X(...)` for any `X` but `Set`, `Map`, `RegExp`, `Error`, `Date`, `URL`, `Array`, typed arrays | `new Client(cfg)` | `ext_new_Client(wld, cfg)` |
| `.then`, `.catch`, `.finally` on a promise | `p.catch(() => null)` | a transition with the handler as an opaque function value |
| `Object.keys`, `Object.entries`, `Object.values` on a record | `Object.keys(r)` | `ext_Object_keys(wld, r)` |

## What is uninterpreted

Each of these becomes a bodiless Dafny function of its arguments, the same on both sides.

| Part | Example | Modelled as |
|---|---|---|
| Module constants, enum members | `LIMITS.max` | `ext_LIMITS_max()` |
| `any`, `unknown`, a union of records, `string \| SomeObject` | `node.type`, `x === y` | the opaque type `Any`; accessor and operator externals; `==` on `Any` |
| Library calls with no exact rule: `trim`, `toLowerCase`, `split`, `replace`, `JSON`, `String`, `Buffer` | `s.trim()` | `ext_str_trim(s)` |
| Regular expressions, `new RegExp`, `.test`, `.replace(re, …)` | `/a+/.test(s)` | an opaque constant per literal, externals for the operations |
| A callback passed to an external, stored in a record, or an async callback | `[...xs].sort((a, b) => a - b)` | an opaque function value named by its text; the same text proves equal, a different one does not |
| A callback with an effect inside | `xs.map(async (x) => await f(x))` | the same: an opaque function value by its text |
| `as T`, `<T>x` | `x as number[]` | identity when the Dafny types agree, else `ext_cast_A_B(x)` |
| `typeof x`, `x instanceof C`, `k in o` | `typeof x === "string"` | `ext_typeof_Any(x)`, `ext_instanceof_C(x)`, `ext_in(k, o)` |
| `throw e` | `throw new Error("bad")` | the function's result is `ext_throw_R(e)` |
| Tagged templates | ``sql`select ${id}` `` | `ext_tag_sql_1(["select ", ""], id)` |
| `let x: T;` without a value | `let out: string;` | `ext_uninit_T()`, never observed (TypeScript checks the assignment comes first) |

## What is an opaque block

A `try`/`catch`/`finally` statement and a `while` loop without `// @decreases` become one uninterpreted transition
named by the block's own text, taking the variables the block reads and returning the ones it assigns. The same block
on both sides is the same transition; a changed block is a different one, never proved equal and never proved
different (the execution lane decides it). A `try` whose body returns a value is not translated yet.

## What is refused

| Rule | Refused | Example that is refused |
|---|---|---|
| `dynamic-eval` | `eval`, `Function`, `new Function` | `eval(code)` |
| `prototype` | `.prototype`, `.constructor`, `__proto__`, `Reflect`, `Proxy` | `Object.getPrototypeOf(x)` |
| `class`, `inheritance` | `super`, a class that extends another | `class B extends A {}` |
| `receiver-mutation` | assignment through a field of a field of `this` | `this.stats.n += 1` |
| `global-mutation`, `global-read`, `toplevel-state`, `toplevel-effect` | module `let`/`var`, assignment to anything the function does not own, code at module level that runs on import | `counter = counter + 1` |
| `param-assign`, `param-mutation`, `property-assign`, `index-assign`, `in-place-mutation` | changing a parameter, or a field or slot of what the function does not own; `sort`/`reverse` on a named array | `xs.push(1)` on a parameter |
| `closure-mutation`, `foreach` | a callback changing a variable declared outside it; `forEach` | `xs.forEach((x) => { n += x; })` |
| `opaque-mutation` | a mutating method on an opaque value used as a value, or as a statement when a field of the same receiver is read later | `const n = list.push(x)` |
| `function-value` | a function value as a bare expression (not a local const, a record field or a call argument) | `return (x) => x + 1` |
| `nested-function` | a nested `function` declaration | `function inner() {}` inside |
| `division` | bare `/` on numbers (write `Math.floor(a / b)`), `/=`, `%=`, `**` | `x / 2` |
| `loose-equality` | `==` and `!=` except against `null`/`undefined` | `a == b` |
| `reference-equality` | `===` on arrays and records | `xs === ys` |
| `string-order` | ordering strings | `a < b` on strings |
| `unbounded-loop`, `do-while`, `for-in`, `label`, `loop-form` | `while` without `// @decreases`; any other loop form | `do { } while (c)` |
| `optional-chain` | optional calls on a function value `f?.()` | `cb?.()` |
| `async`, `promise` | `await` outside an async function, `for await`, `new Promise`, a Promise-returning function that is not async | `new Promise(r => ...)` |
| `generator` | generators | `function* g() {}` |
| `union-type` | a union the translator cannot name (two different arrays) | `number[] \| string[]` |
| `destructuring`, `param-form` | defaults in array patterns, rest patterns, rest parameters | `const [a = 0] = xs` |
| `bitwise`, `unary-coercion`, `update-expression`, `assignment-expression`, `comma` | `& \| ^ ~ << >>`, unary `+`, `x++` inside an expression, `a = b` inside an expression, `,` | `+x` |
| `callback-form` | a callback that is not an arrow function, a same-file function or a local function value | `xs.map(function (x) { return x; })` |
| `spread` | spread outside array and record literals, or of a value that is not an array or a set | `f(...args)` |
| `unsupported-syntax`, `unsupported-call`, `unsupported-member`, `unsupported-operator`, `unsupported-type` | JSX (the next version), a method with no rule, a property the type does not declare, an operator or a type with no reading | `<div/>` |
| `ts-strict` | a compiler error in strict mode | a type mismatch |

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

- `--core` writes pure Dafny functions, as `conformance/run.py` and `spec/theorem.py` expect. A loop becomes a
  recursive helper function with `decreases`; a `return` inside a loop makes the helper return `(Option<R>, state)`;
  a loop helper that reads `this` takes the receiver. An effectful function takes the world first and returns
  `(World, result)`. A recursive function takes a fuel. With `--prelude <file>` the shared declarations (datatypes,
  helpers with bodies, bodiless externals) go to that file and the main file `include`s it; `spec/theorem.py` merges
  the parent's and the candidate's preludes and refuses when a block of the same name differs.
- The default shape writes one `method` per function with a loop, so the loop keeps `invariant` and `decreases`
  lines. It covers the exact subset only (no externals), for the fixtures.

## Modelling axioms

- `number` is an exact integer (`int`) by default. A float literal is refused. With `--real`, `number` is a Dafny
  `real`, exact decimal arithmetic, not IEEE 754. Neither choice models overflow, `NaN` or rounding.
- `undefined` and `null` are one value (`None`).
- Array access outside the bounds is a proof obligation, not `undefined`. A dictionary read of an absent key is
  `ext_absent_V()`.
- An effect is `effect(world, op, args) = (world', result)`. It is the only axiom. Two calls are two transitions;
  reordering two independent effects is reported as a difference.
- Two syntactically identical lambdas are equal in Dafny; a changed lambda passed to an external is a changed argument.
- Addresses never count: two records with the same fields are one value. Aliasing counts: a function cannot change
  what it was handed, so a change through one alias cannot hide from the model.
