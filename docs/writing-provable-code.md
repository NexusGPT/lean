# Writing code lean can prove

The long form of the style section of the README: the eight habits with what each one buys, and why a whole program, screens and pointers included, can be read as mathematics. Moved here from the README on 2026-10-27, unchanged. The construct-by-construct reference is [`../langs/ts/subset.md`](../langs/ts/subset.md); the coverage matrix over every language concept is [`../langs/ts/COVERAGE.md`](../langs/ts/COVERAGE.md).

## The habits at a glance

The table the README carried before its showcase of before and after pairs, moved here on 2026-10-27. Each row is a construct the proof lane refuses (or reads as an opaque block), the rule lean names, what to write instead, and what the rewrite buys.

| you write | lean says | write instead | what it buys |
|---|---|---|---|
| `const t = user.tags; t.push(x)` | `alias-mutation` | `user.tags.push(x)`: change it through the parameter, which becomes an output | a candidate that appends twice or to the wrong record returns a different `user'`, for every input |
| `a === b` on two objects | `reference-equality` | compare the fields you mean | a value equality the verifier decides |
| `while (i > 0) { … }` with no measure | opaque block | `// @decreases i` above the loop | a change inside the loop is proved or refuted, never silently equal |
| `this.client.state.n += 1` through a class instance | `receiver-mutation` | keep receiver paths as data records: `this.stats = { ...stats, n: stats.n + 1 }` | each read and write is a transition the proof sees |
| `Object.assign(user, patch)` | `assign-target` | `{ ...user, ...patch }` | the target's new value is in the model |
| `on && change(xs)` | `conditional-effect` | `if (on) change(xs)` | a branch returns its world and value only when selected |
| `d[k] = v` on a dictionary, a run-time key, an object value | `prototype` | `d = { ...d, [k]: v }`, or a `Map` | a key named `__proto__` cannot replace the object's prototype behind the proof's back; a primitive value under that key is read as the setter ignores it |

## The eight habits

**What a proof needs.** The proof lane reads a function as mathematics: every value is a mathematical value (a number, a string, a record, a sequence, a set, a map), and the function is a map from its arguments and the state of the world to a result and the next state of the world. Two versions are equal when that map is the same for every argument and every world. The verifier (Dafny over Z3) decides that statement. So the style below is not taste: each habit removes one thing that has no place in that reading, and lean names the habit it needs (`ASK: <rule>`) instead of guessing. Everything else is translated as it is.

The rule in one line: **a function owns what it creates, and everything else flows through its arguments, its result, and the world.**

**1. Change what you were handed through its own name, or build a new value.** In the value reading an argument is a value. A function that assigns a field, a slot or the contents of a parameter (`user.tags.push(t)`, `user.id = name`, `counts[k] = n`) is read as a function that also returns the parameter's new value: `addTag(user, t)` becomes `(result, user')`, written as a datatype update (`user.(tags := user.tags + [t])`), and a caller that passed a name takes the new value back into that name. Two rules keep this sound. Two parameters are two objects (the stated axiom; lane B generates each parameter object separately today and does not yet pass one object twice, a gap the heap design in `langs/ts/design/heap-layer.md` names). A local that is another name for a parameter's object (`const u = user`, `const t = user.tags`, `const x = xs[i]`) may not be changed: the model has one value per name, so a change through the alias would not reach the parameter. The lint says `alias-mutation` with the line; change the parameter itself, or copy first.

```ts
// refused: alias-mutation            // proved
function addTag(user: User, t: string) {       function addTag(user: User, t: string): number {
  const tags = user.tags;                         user.tags.push(t);          // user is an output of addTag
  tags.push(t);                                   return user.tags.length;
  return tags.length;                           }
}
```

What this buys: a candidate that appends twice, appends to the wrong record, or skips the append on an empty list returns a different `user'`, and the verifier says so with the argument on which the two differ. `user.tags.push(t)` and `user.tags = [...user.tags, t]` are proved equal: the same new value.

**2. Let state come out of loops, not out of callbacks.** A loop body is translated as a recursive helper over the variables it changes; the verifier sees `total` go in and come out. A callback is translated as a lambda: a value with no access to the variables around it. `prices.forEach(p => { total += p })` asks the lambda to change `total`, which the lambda cannot do in the model. Write the loop, or fold with `reduce`, and the sum is a function of `prices`.

```ts
// refused: closure-mutation         // proved
let total = 0;                                 let total = 0;
prices.forEach(p => { total += p; });          for (const p of prices) total += p;
                                               // or: const total = prices.reduce((a, p) => a + p, 0);
```

What this buys: `for (const p of prices) total += p` and `prices.reduce((a, p) => a + p, 0)` are proved equal to each other; a candidate that starts the sum at the first price instead of zero, or skips the last element (`i < n - 1`), is caught for every list, including the lists the test suite did not write.

**3. Say what you compare.** `a === b` on two objects compares addresses: two records with the same fields are unequal in JavaScript when they were allocated separately. A value model has no addresses; the translator cannot render address identity without inventing one, and an invented one would prove the wrong thing. Compare the fields you mean, and the comparison becomes a value equality the verifier decides.

```ts
// refused: reference-equality       // proved
if (a === b) ...                               if (a.id === b.id) ...
```

Equality of two strings, two numbers, two literals, or a value and `null` is a value comparison already and is translated as it is.

**4. Say what kind of number you mean.** JavaScript has one number type and `/` is real division: `7 / 2` is `3.5`. The translator renders numbers as integers (or as reals with `--real`), so `n / 2` would be read as a value JavaScript never computes. `Math.floor(n / 2)` and `Math.trunc(n / 2)` are integer division in both readings; `n * 0.5` says a real is meant. `%`, `+`, `-`, `*`, comparisons, `Math.min`, `Math.max`, `Math.abs` are exact; any other `Math` call is an uninterpreted function of its arguments, the same on both sides.

```ts
// refused: division                  // proved
const half = n / 2;                            const half = Math.floor(n / 2);   // or n * 0.5 when a real is meant
```

What this buys: an off-by-one in a page count or a threshold (`Math.floor((total + pageSize - 1) / pageSize)` against `Math.floor(total / pageSize)`) is a different function on infinitely many inputs, and a proved refactor of such arithmetic is a theorem about all of them.

**5. Keep receiver paths as data records.** A field any method changes lives in the world: each read and write is a transition. `this.stats.n += 1` reads `stats`, rebuilds its record with the new `n`, and writes it back. Deeper declared record paths work the same way. This value reading assumes no observable alias to the record; a class instance, optional path or opaque handle still gets `receiver-mutation`.

```ts
bump() { this.stats.n += 1; }
// the same field read and write, made explicit
bump() { const stats = this.stats; this.stats = { ...stats, n: stats.n + 1 }; }
```

A class getter is a unit such as `Counter.get_total`; reading `this.total` calls its body. A setter is `Counter.set_total`, threading the world through its writes. Local immutable strategy objects can hold exact scalar method lambdas; broader methods are opaque function values with their text and captured data. Use a class when those methods must change the object's fields.

**6. Give a `while` loop its bound.** A `for` loop over a range or a list carries its own termination; the translator writes the measure. A `while` loop runs until a condition fails, and the verifier needs to know what shrinks on each pass to accept the recursive helper it becomes. `// @decreases i` is that one fact. Without it the loop becomes an opaque block: one uninterpreted transition named by the loop's own text, the same on both sides when the text is the same, so the function around it can still be proved, but a change inside the loop is never proved equal (it is a different block) and never proved different either (it is left to lane B).

```ts
// opaque block                       // proved
while (i > 0) { i -= 1; }                      // @decreases i
                                               while (i > 0) { i -= 1; }
```

A loop that keeps something true across passes (a running maximum, a sorted prefix) can state it with `// @invariant` so the verifier can use it; most loops in service code need neither.

**7. Reach the world through calls.** An imported function, a method of an injected service, a clock, `Math.random`, `fetch`, a constructor of a class lean cannot see: each is a transition of the world, named by what was called and with what. The same call in the same world answers the same; two calls are two transitions; a candidate that makes a call the parent did not make (or makes it with another argument, or in another order) is not equal. Nothing is pretended pure. What stays outside the subset is code that changes the world without a call: writing to a module-level variable, `process.env` assignment, `eval`, the prototype chain, `super`. Those have no reading as a value or a transition, and lean names them.

**8. A component returns a tree.** JSX is read as a value: `<li key={id} onClick={pick}>{label}</li>` is the record `JsxElem("li", {key, onClick}, [JsxText(label)])`. Text is `JsxText`; `false`, `null` and `undefined` render `JsxNothing`; an array of elements is `JsxList`; `cond && <X/>` and `cond ? <A/> : <B/>` are conditionals of trees. A handler attribute is an opaque function value keyed by its text, so a rewired handler is a different value. Hooks are calls into the world at the top of the render (`useState`, `useQuery` are transitions), the same shape as a service field of `this`. A component is then a function from props and world to a tree, and two versions are equal when the trees are equal for every props value and every world.

```tsx
export function ItemList(props: { items: readonly Item[]; onPick: (id: string) => void }) {
  const open = props.items.filter((i) => !i.done);
  return (
    <ul>
      {open.map((i) => <li key={i.id} onClick={() => props.onPick(i.id)}>{i.label}</li>)}
      {open.length === 0 && <p>Nothing left</p>}
    </ul>
  );
}
```

What this buys: a candidate that drops the empty-state paragraph, renders the wrong field, moves a button or wires another handler produces a different tree, and lane B shows the props on which the trees differ; a refactor from `cond ? <A/> : null` to `cond && <A/>` is proved equal. What it does not judge: pixels, CSS and layout, which stay with the recording gate. Measured on three React front ends written before this rule, the share of units inside rose several-fold once JSX was read as a value.

Everything else is yours: `async`/`await`, `try`/`catch` (a fault flag on the world: every transition inside the body may fault, the catch path runs with the fault value), `switch`, destructuring with defaults, optional chaining, template strings, `Set`, `Map`, generics, recursion, early returns, callbacks to array methods, local lambdas, JSX. [`langs/ts/subset.md`](../langs/ts/subset.md) lists every construct and whether it is exact, uninterpreted, or refused.

**How much real code is inside.** Measured on 39 repositories, private and public (48,696 functions and methods written before this style existed): 60.0 percent of all units are inside the subset as written. The rest get lane B and the rule that stopped the proof lane. Code written with the lint on is inside from the first line.

**In the editor.** lean ships an ESLint plugin (`langs/ts/eslint`) with one rule, `lean/provable`. It runs lean's own lint on the file inside its project, so what the editor underlines is exactly what the proof lane will refuse: the line, the rule, and what to write instead. Where a rewrite keeps your meaning (`n / 2` to `Math.floor(n / 2)`, `==` to `===`) it is offered as a suggestion; where it does not (a mutation that must become a returned value), the message gives the shape and leaves the edit to you.

```js
// eslint.config.mjs
import lean from 'lean/langs/ts/eslint/index.mjs';
import tsparser from '@typescript-eslint/parser';
export default [{ ...lean.configs.recommended, languageOptions: { parser: tsparser } }];
```

```
src/users.ts
  12:3   warning  lean cannot prove this (param-mutation): push on `user.tags`, which is not a local array — This changes what the caller handed in. Return a new value: `[...xs, v]`, `{ ...r, f: v }`
  31:10  warning  lean cannot prove this (division): `/` on numbers is real division; write Math.floor(a / b) for integer division
```

The same lint runs from the command line: `node langs/ts/lint/lint.mjs file.ts`.

**What you can still do.** Write TypeScript the way your team writes it. A function outside the subset is not blocked: it gets lane B, a bounded execution verdict, and the exact reason the proof lane stopped. You decide what to tighten.

**What changes in your workflow.** A pull request carries, per changed function, one of six verdicts and its certificate. `WITNESS` comes with the input that shows the difference. `PASS-proved` comes with a theorem anyone can re-check. Reviewers read the scope you declared and the asks, not the diff.

## Why the whole program can be read as mathematics

The question behind the subset is "how can code that renders screens, holds pointers and talks to the world be a
mathematical object?" The answer is one axiom and three readings, and every habit above is one of them seen from
the editor.

**The axiom.** Every effect is a function of the world: `effect(world, op, args) = (world', result)`. The world is a
value the function receives and returns; nothing is global, nothing happens behind the function's back. A function
that reads a file, awaits a repository, logs a line and returns a number is, in this reading, a function from
`(world, args)` to `(world', number)`. It is declarative in the exact sense: the function *says* what it does to
the world, and the verifier compares two sayings. The translator does the threading; you write ordinary TypeScript.

**Reading 1: the front end is a value.** A React component is a function from its props and its hook state to a
value tree: `JsxElem(tag, props, children) | JsxText | JsxNothing | JsxList`. The DOM, the browser and React's
scheduler are the world; the component never touches them, it returns the tree React will reconcile. So two
versions of a component are equal when they return the same tree for every props and state, and a candidate that
drops a `key`, renders a `null` child where the parent rendered `false`, or swaps a conditional branch is caught on
the props that show it. A handler attribute (`onClick={() => save(id)}`) is a value: when its body is in the subset
it is a lambda the verifier reads; otherwise it is an opaque value keyed by its text, so the same handler on both
sides is the same value and a changed one differs. Lane B renders the tree by React's own children rules. Measured:
What is not yet read:
the bodies of `useEffect` and `useMemo` callbacks as the functions they are (today opaque values), and a handler
whose body reaches a store.

**Reading 2: pointers are outputs.** TypeScript has no pointers, it has references, and a reference matters in one
case: when a function changes what it points to. Layer 1, built: a parameter the function changes (`user.tags.push(t)`,
`user.id = name`, `counts[k] = n`) is an *output* of the function, `(world', result, user')`, written as a datatype
update, and a caller that passed a name takes the new value back into that name. Two parameters are two objects (the
stated axiom; lane B does not yet pass one object twice, see the heap design note), and a local alias of a parameter may not be changed
(`alias-mutation`), because the value reading has one value per name. Layer 2, planned: objects that come from the
world (a row from a repository, a node in a tree, a shared cache) are references into a heap carried by the world;
reads and writes go through it; two versions are equal when results and final heaps agree up to a renaming of fresh
allocations. The census counts 4,620 units that change an object through an alias; layer 2 is what makes them
provable without rewriting them.

**Reading 3: control is data.** A loop is a recursive helper over the variables it changes, with its own
termination measure. An exception is a fault flag on the world: a transition may fault, `catch` is a branch the
verifier sees, and a `throw` is a second result channel. A promise is a value awaited in order; `Promise.all` over a
`map` is a collecting loop. A class is a record plus functions of an explicit receiver, with the fields any method
assigns living in the world. A call into code lean cannot see (a library, an opaque block, a parent class's method
through `super.m()`) is one uninterpreted transition named by what it is, the same on both sides.

**What falls outside, on purpose.** `eval`, the prototype chain and module-level mutable state have no reading that
keeps the axiom true, and lean refuses them by name rather than modelling them wrong. Everything else that is not read
yet is a *gap* with a stated faithful reading (`langs/ts/COVERAGE.md`, one row per construct, with the unit count it
unlocks), not a limit of the method.

