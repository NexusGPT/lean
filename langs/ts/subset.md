# The TypeScript subset

A function inside the subset is a pure function over plain data. It has the same meaning in TypeScript and in Dafny, so the checker can turn it into exact mathematics. `lint/lint.mjs` enforces every rule below. The lint reads the file with the TypeScript compiler in strict mode (`strict`, `noImplicitReturns`) and also reports every compiler error inside the checked functions (rule `ts-strict`).

A function that uses anything outside the subset is refused when it changes. Code that does not change is equal by identity and is not checked (`--changed`).

## What the subset allows

| Part | Allowed | Example |
|---|---|---|
| Types | `number`, `bigint`, `boolean`, `string` | `(x: number): boolean` |
| Arrays | `readonly T[]`, `T[]`, `ReadonlyArray<T>`, `Array<T>` | `xs: readonly number[]` |
| Records | a named `type` or `interface` with plain fields | `type Account = { readonly id: number; readonly balance: number }` |
| Tuples | `readonly [A, B]` | `p: readonly [number, number]` |
| Optionals | `T \| undefined` | `x: number \| undefined` |
| Declarations | `let`, `const`, one per statement, always initialised | `let total = 0;` |
| Control | `if`/`else`, early `return`, `for...of` over an array | `for (const x of xs) { ... }` |
| Counted loops | `for (let i = a; i < b; i++)`, also `<=` and `i += 1` | `for (let i = 0; i < n; i++) { ... }` |
| Bounded loops | `while`, with a bound comment right before it | `// @decreases i` then `while (i > 0) { ... }` |
| Operators | `+ - *`, unary `-`, `! && \|\| ??`, `=== !==`, `< <= > >=`, `?:` | `a + b * 2` |
| Assignment | `=`, `+=`, `-=`, `*=`, `++`, `--` on a local name | `total = total + x;` |
| Arrays at work | `xs[i]`, `xs.length`, `[a, b]`, `[...xs, y]`, `push` on a local array | `out.push(i * i);` |
| Higher order | `map`, `filter`, `reduce` with an arrow function that has an expression body | `xs.filter((x) => x > 0)` |
| Math | `Math.min`, `Math.max`, `Math.floor` | `Math.min(a, b)` |
| Strings | literals, `+`, `===`, `.length` | `"hello " + name` |
| Records at work | `{ f: v }`, `{ ...r, f: v }` (spread first), `r.f` | `{ ...a, balance: a.balance + n }` |
| Calls | other top-level functions of the same file, not recursive | `double(double(x))` |

The proof hints are comments just before a loop, written in Dafny syntax with the TypeScript variable names:

```ts
// @invariant steps + i == n
// @decreases i
while (i > 0) { ... }
```

A hint is untrusted. Dafny checks it, and a wrong hint only makes a proof fail. A `for` loop needs no bound: the translator derives it.

## What the subset refuses

Each line is one rule. The lint prints the rule name with the line.

| Rule | Refused | Example that is refused |
|---|---|---|
| `any`, `unknown` | `any` and `unknown` types | `(x: any)` |
| `cast` | `as`, `<T>x`, `satisfies` | `x as number` |
| `non-null` | the `!` assertion | `x!` |
| `dynamic-eval` | `eval`, `Function`, `new Function` | `eval(code)` |
| `async`, `promise`, `generator` | `async`, `await`, `Promise`, `yield`, `function*` | `async function f() {}` |
| `this`, `class`, `new` | classes and `this` | `class A { n = 0 }` |
| `prototype` | `.prototype`, `.constructor`, `__proto__`, `Object`, `Reflect`, `Proxy` | `Object.getPrototypeOf(x)` |
| `try-catch`, `throw` | exceptions | `try { ... } catch (e) { ... }` |
| `dynamic-key` | an index that is not a number on an array, or any computed key | `o[k]` with `k: string` |
| `global-mutation`, `global-read`, `toplevel-state` | module variables, globals, anything the function does not own | `counter = counter + 1` |
| `param-assign`, `param-mutation`, `property-assign`, `index-assign` | changing a parameter, a field, or an array slot | `xs.push(1)` on a parameter |
| `import` | any import except `import type` | `import { readFileSync } from 'node:fs'` |
| `nondeterminism` | `Math.random`, `Date` | `Math.random()` |
| `null` | `null`; use `undefined` | `x === null` |
| `division` | `/` and `%` (JavaScript division is not integer division) | `x / 2` |
| `loose-equality` | `==` and `!=` | `a == b` |
| `reference-equality` | `===` on arrays and records | `xs === ys` |
| `string-index`, `string-order` | indexing a string, ordering strings | `s[0]`, `a < b` on strings |
| `unbounded-loop` | `while` without `// @decreases` | `while (i > 0) { ... }` |
| `loop-form`, `break-continue`, `do-while`, `for-in`, `label`, `switch` | any loop or branch form not listed above | `for (;;) {}` |
| `template`, `regex` | template literals and regular expressions | `` `a${b}` `` |
| `optional-chain`, `optional-field` | `?.` and `name?: T` | `a?.b` |
| `union-type`, `literal-type`, `function-type`, `generic` | other unions, literal types, function types, generics | `"a" \| "b"` |
| `bitwise`, `unary-coercion`, `update-expression`, `assignment-expression`, `comma` | `& \| ^ ~ << >>`, unary `+`, `x++` inside an expression, `a = b` inside an expression, `,` | `+x` |
| `callback-form` | a callback that is not a one-expression arrow function | `xs.map(function (x) { return x; })` |
| `ts-strict` | any compiler error in strict mode | a type mismatch |
| `missing-return-type`, `missing-param-type`, `param-form` | functions without declared types, default, rest or destructured parameters | `(x = 1)` |

## What the translator adds

The lint decides if a function is inside the subset. The translator covers the subset in two shapes:

- `--core` writes pure Dafny functions, as `conformance/run.py` expects. A loop becomes a recursive helper function with `decreases`, and `while` loops, `for` loops and `for...of` loops are covered. `return` is allowed outside loops only.
- The default shape writes one `method` per function with a loop, so the loop keeps `invariant` and `decreases` lines. Where it cannot derive an invariant it writes `// INVARIANT NEEDED`.

## Known gaps

- `number` is an exact integer (`int`) by default. A float literal is refused. With `--real`, `number` is a Dafny `real`, which is exact decimal arithmetic and not IEEE 754. Neither choice models overflow, `NaN` or rounding. Each is a modelling axiom.
- `undefined` and an absent optional are one value (`None`). `null` is refused.
- Array access outside the bounds is a proof obligation, not `undefined`.
- Strings are Dafny strings. Only concatenation, equality and length are covered.
- No async, no exceptions, no I/O. A handler that awaits a database call is outside the subset by design.
- Recursion is not covered.
