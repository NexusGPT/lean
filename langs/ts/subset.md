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
| Types | `number` (an exact `int`, or an exact `real` in a file with a float literal or a bare `/`), `bigint`, `boolean`, `string`, literal unions, enums, type parameters of the function | `function id<T>(x: T): T` |
| Arrays | `T[]`, `readonly T[]`, `as const` lists, tuples, array-like interfaces (a match result) | `xs: readonly number[]` |
| Records | any object type the compiler can list, from any file; an intersection; two types with the same fields are one datatype | `type Account = { readonly id: number; readonly balance: number }` |
| Dictionaries | `{ [k: string]: V }`, `Record<string, V>`; read by a computed string key; assigned by key on a local | `counts[key] = 1` |
| Sets and maps | `Set<T>`, `Map<K, V>` (`has`, `get`, `size`, `keys`, `values`, `entries`, `add`/`set`/`delete` on a local) | `new Set(xs).has(x)` |
| Optionals | `T \| undefined`, `T \| null`, `f?: T`; `x == null`, `x ?? y`, `x?.f`, `x?.m()`, `x!` | `x: number \| null` |
| Declarations | `let`, `const`, `let x: T;` assigned before any read, `let x;` (an Option of its first assigned type, absent until then), destructuring patterns with defaults on object patterns, a nested `function f() {}` (a local function value) | `const { a = 1, b } = r;` |
| Control | `if`/`else`, `switch` (each case ends in `return` or `break`), early `return`, `return` inside a loop, `break`, `continue`, `throw`, `void f()` | `switch (kind) { case "a": return 1; default: return 0; }` |
| Loops | `for...of` over an array, string, set, map or iterable; `for (let i = a; i < b; i += k)` up or down by a constant step; `while` and `do..while` with `// @decreases`; `xs.forEach((x) => body)` with a sync arrow (a `return` ends one step); `await Promise.all(xs.map((x) => body))`, a loop collecting each iteration's value, its transitions in array order | `for (let i = n - 1; i >= 0; i--)` |
| Operators | `+ - * %`, `Math.floor(a / b)`, `Math.trunc(a / b)`, `Math.min`, `Math.max`, `Math.abs`, unary `-`, `! && \|\| ??`, `=== !==`, `< <= > >=`, `?:`, `typeof`, `instanceof`, `in`; `&&`, `\|\|` and `??` as values of any types (both sides lifted to the result type); a transition inside a `?:` branch or on the right of `&&`/`\|\|` happens only when that side runs | `Math.floor(n / 2)` |
| Assignment | `=`, `+=`, `-=`, `*=`, `++`, `--` on a local; `x.f = v`, `x.f += v`, `x.f++`, `xs[i] = v`, `x.f.push(v)` on a local or on a PARAMETER (a mutated parameter is an output of the function, returned beside the result; a caller that passed a name takes the new value back); `this.f = v`, `this.f += v`, `this.f++` on a field of the receiver | `user.tags.push(t);` |
| Arrays at work | `xs[i]`, `.length`, `[a, ...xs]`, `push`/`unshift` on a local, `includes`, `indexOf`, `slice`, `concat`, `join`, `flat`, `at`, `some`, `every`, `find`, `findIndex`, `map`, `filter`, `flatMap`, `reduce`, with index callbacks | `xs.map((x, i) => x * i)` |
| Strings | literals, template literals, `+` (a non-string side is converted), `===`, `.length`, `s[i]`, `includes`, `startsWith`, `endsWith`, `indexOf`, `slice`, `substring`, `charAt`, `at`, `concat`, `repeat` | `` `${name}: ${n}` `` |
| Numbers | `toFixed`, `toString`, `toPrecision`, `toExponential` as uninterpreted functions of the number; `a ** b` as an uninterpreted power of both sides | `n.toFixed(2)` |
| Records at work | `{ f: v }`, `{ ...r, f: v }`, `r.f`, `r["f"]`, `r[k]` with a finite union of declared data-field string keys (including `keyof`), or a string on a dictionary; `{ [k]: v, ...m }` when the literal is a dictionary; `delete r.f` on an optional field of a local or parameter record; `delete m[k]` on a dictionary | `{ ...a, balance: a.balance + n }` |
| Record enumeration | `Object.keys/values/entries` on a plain immediate record literal or an enumeration-only const literal; integer-index keys first, then insertion order | `Object.keys({ b: 2, a: 1 })` is `["b", "a"]` |
| Calls | top-level functions of the same file, recursion included (a fuel bounds the unfolding; the theorem holds for every fuel), default arguments, a function-typed parameter or local, a local lambda `const f = (x) => ...` | `double(double(x))` |
| Functions | `function` declarations, `const f = (...) => ...`, `async` functions (the result type is unwrapped), generic functions, same-file functions named as callback values | `xs.map(double)` |
| JSX | an element is a value tree: `JsxElem(tag, props, children)`, `JsxText`, `JsxNothing` for `false`/`null`/`undefined`, `JsxList` for an array child; a handler attribute is an opaque function value keyed by its text; `cond && <X/>`, `cond ? <A/> : <B/>`, `{xs.map((x) => <li/>)}`, fragments, spread attributes (merged in order) | `<li key={i.id} onClick={() => pick(i.id)}>{i.label}</li>` |
| Classes | methods and static methods; a constructor that stores injected ports; fields read through `this`; a field any method assigns lives in the world (each read and write is a transition); a method of `this` called from a method; `super.m(...)` and `super(...)` as transitions on the receiver; `new C(args)` of a class in the same file: a fresh handle from the world, then C's constructor as a unit on it (initialisers, parameter properties, the body as writes); a method called on that instance is the file's own unit, and a field its methods write is read through the world | `class Svc { constructor(private readonly repo: Repo) {} async find(id: string) { return this.repo.find(id); } }` |

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
| A clock, randomness, the environment, a console, a fetch | `Date.now()`, `new Date()`, `Math.random()`, `console.log(x)` | `ext_Date_now(wld)`, `ext_new_Date(wld)`, `ext_Math_random(wld)`, a transition of the console |
| `new X(...)` for any `X` but `Set`, `Map`, `RegExp`, `Error`, `Date`, `URL`, `Array`, typed arrays | `new Client(cfg)` | `ext_new_Client(wld, cfg)` |
| `.then`, `.catch`, `.finally` on a promise | `p.catch(() => null)` | a transition with the handler as an opaque function value |
| Unknown record enumeration | `Object.keys/values/entries(r)` for a parameter, escaped or mutated record | source-sensitive transition; own keys/order cannot be recovered from the structural datatype |

## What is uninterpreted

Each of these becomes a bodiless Dafny function of its arguments, the same on both sides.

| Part | Example | Modelled as |
|---|---|---|
| Other Object operations and dictionaries | `Object.assign/freeze/fromEntries`, dictionary `Object.keys/values/entries` | existing pure uninterpreted calls; no new exact mutation or freezing claim |
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
| `let x: T;` without a value | `let out: string;` | `ext_uninit_T()`, never observed (TypeScript checks the assignment comes first); an untyped `let x;` is `None` of the Option of its first assigned type, every narrowed read takes `.value` |

## What is a fault

A `try`/`catch` is exact. Every transition of the world inside the body may fault: after each statement of the body
that makes a transition, or throws, the translation tests `ext_faulted(world)`; on a fault the catch path binds
`ext_fault_value(world)` to the catch variable, clears the flag, and runs the handler, the `finally` block and what
follows the try. A `throw` inside the body raises the fault with the thrown value. A pure computation never faults
in the model (`JSON.parse`, `Number` and array indexing are pure functions of their arguments), so a catch that only
guards a pure call is a branch never taken. The execution lane lets a typed answer fault on a seeded draw, so catch
paths run there too.

## What is an opaque block

A `try` without a catch, a `try` whose body loops over a transition, and a `while` loop without `// @decreases`
become one uninterpreted transition named by the block's own text, taking the variables the block reads and
returning the ones it assigns. The same block on both sides is the same transition; a changed block is a different
one, never proved equal and never proved different (the execution lane decides it).

## What is refused

| Rule | Refused | Example that is refused |
|---|---|---|
| `dynamic-key` | record keys that are unrestricted strings, numbers, missing fields, method values or calls inside the key; optional/union receivers must first be narrowed | `r[k]` with `k: string` and `r: { a: number }` |
| `index-assign` | dynamic writes to records | `r[k] = v` with `k: "a" \| "b"` |
| `dynamic-eval` | `eval`, `Function`, `new Function` | `eval(code)` |
| `delete` | `delete` of a field of `this`, of a required field, or as a value | `delete this.cache.x` |
| `prototype` | `.prototype`, `.constructor`, `__proto__`, `Reflect`, `Proxy` | `Object.getPrototypeOf(x)` |
| `class`, `inheritance` | `super` as a value (`const f = super.m`, `super.x`); `super.m(...)` as a call is read as a transition on the receiver | `const f = super.m` |
| `receiver-mutation` | assignment through a field of a field of `this` | `this.stats.n += 1` |
| `global-mutation`, `global-read`, `toplevel-state`, `toplevel-effect` | module `let`/`var`, assignment to anything the function does not own, code at module level that runs on import | `counter = counter + 1` |
| `alias-mutation` | changing a value through a local that is another name for a parameter's object (`const u = user`, `const t = user.tags`, `const x = xs[i]`); the [heap reading](design/heap-layer.md) is a design and verified toy only | `const t = user.tags; t.push(1)` |
| `param-assign`, `param-mutation`, `property-assign`, `index-assign`, `in-place-mutation` | rebinding a parameter (`p = v`); a field or slot of what the function does not own (a module object, a cast, a value from the world); `sort`/`reverse` on a named array | `(x as any).f = 1` |
| `closure-mutation`, `foreach` | a callback (not a loop body) changing a variable declared outside it; `forEach` with an async callback, which the function does not wait for | `xs.forEach(async (x) => { await f(x); })` |
| `opaque-mutation` | a mutating method on an opaque value used as a value, or as a statement when a field of the same receiver is read later | `const n = list.push(x)` |
| `function-value` | a callback passed to a same-file function (a same-file function takes values; a function value anywhere else is a pure lambda or an opaque value keyed by its text) | `twice((y) => y + 1, x)` |
| `division` | `/=`, `%=`; a bare `/` in an integer file (a file with no float literal and no `/` outside `Math.floor`) | `x /= 2` |
| `loose-equality` | `==` and `!=` except against `null`/`undefined` | `a == b` |
| `reference-equality` | `===` on arrays and records | `xs === ys` |
| `string-order` | ordering strings | `a < b` on strings |
| `for-in`, `label`, `loop-form` | `for..in`, a labelled statement, any other loop form (a `while` or `do..while` without `// @decreases` is an opaque block, not a refusal) | `for (const k in o)` |
| `optional-chain` | optional calls on a function value `f?.()` | `cb?.()` |
| `async`, `promise` | `await` outside an async function, `for await`, `new Promise`, a Promise-returning function that is not async | `new Promise(r => ...)` |
| `generator` | generators | `function* g() {}` |
| `union-type` | a union the translator cannot name (two different arrays) | `number[] \| string[]` |
| `destructuring`, `param-form`, `uninitialised` | defaults in array patterns, rest patterns, rest parameters, a pattern with no initial value | `const [a = 0] = xs` |
| `bitwise`, `unary-coercion`, `update-expression`, `assignment-expression`, `comma` | `& \| ^ ~ << >>`, unary `+`, `x++` inside an expression, `a = b` inside an expression, `,` | `+x` |
| `callback-form` | a callback that is not an arrow function, a same-file function or a local function value | `xs.map(function (x) { return x; })` |
| `spread` | spread outside array and record literals, or of a value that is not an array or a set | `f(...args)` |
| `unsupported-syntax`, `unsupported-call`, `unsupported-member`, `unsupported-operator`, `unsupported-type` | a statement form, a method with no rule, a property the type does not declare, an operator or a type with no reading | `x ** 2` |
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

- `number` is an exact integer (`int`) in a file with no float literal and no bare `/`; a file with either is a real
  file: `number` is a Dafny `real`, exact decimal arithmetic, not IEEE 754 (`--real` forces it). Neither choice models
  overflow, `NaN` or rounding: an algebraic rewrite is proved equal on exact reals and can differ on doubles; the
  execution lane runs on doubles and its WITNESS stands. A PASS-proved on a real unit is a fact about exact arithmetic.
- `undefined` and `null` are one value (`None`).
- Array access outside the bounds is a proof obligation, not `undefined`. A dictionary read of an absent key is
  `ext_absent_V()`.
- An effect is `effect(world, op, args) = (world', result)`. It is the only axiom. Two calls are two transitions;
  reordering two independent effects is reported as a difference.
- Two syntactically identical lambdas are equal in Dafny; a changed lambda passed to an external is a changed argument.
- Addresses never count: two records with the same fields are one value. Two parameters are two objects; a function
  that changes a parameter returns its new value beside the result; a local alias of a parameter is never changed
  (`alias-mutation`), so a change through one name cannot hide from the other.
