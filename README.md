<p align="center">
  <img src="docs/header.svg" alt="lean: code like mathematics. Prove a change did only what you asked." width="100%">
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#what-you-get">What you get</a> ·
  <a href="#how-it-works">How it works</a> ·
  <a href="#what-equal-means">What "equal" means</a> ·
  <a href="#numbers">Numbers</a> ·
  <a href="#limits">Limits</a> ·
  <a href="#contributing">Contributing</a>
</p>

---

**lean is a differential equivalence checker.** Give it the old version and the new version of a function, and a declared scope of what was meant to change, and it decides whether the two behave the same everywhere else: by proof when it can, by execution when it cannot, and it says which.

TypeScript is the first language. The core (the theorem, the checker, the conformance suite) is language-agnostic; each language adds a lint, a translator and an execution harness under `langs/`. Python is next.

Every change to a program is a claim: *I changed this, and nothing else.* Tests sample that claim. Review guesses at it. lean checks it, and answers with one of four words, each backed by something you can re-run:

| verdict | what it means | what backs it |
|---|---|---|
| **`WITNESS`** | here is an input on which the two versions behave differently | the input and both observations |
| **`PASS-proved`** | equal on **every** input outside the change you declared | a theorem, checked by [Dafny](https://dafny.org) |
| **`PASS-bounded`** | no difference found on *n* generated inputs under a frozen environment | the inputs, the seed, the bound |
| **`ASK`** | undecided, and here is exactly why | the construct, the timeout, the changed interface |

A bounded pass never becomes a proof. A proof never comes from a model's opinion. The producer of the change is never consulted.

In the literature this is a **regression verifier**: the parent and the candidate of a change are the two programs, and the theorem is that they agree outside the scope. The ideas come from compiler translation validation, regression verification and differential testing; the engineering is ours.

## Quick start

```bash
git clone https://github.com/NexusGPT/lean && cd lean
# needs: node ≥ 20, python3, dafny ≥ 4 on PATH (brew install dafny)

node langs/ts/check.mjs \
  --parent  old/pricing.ts \
  --candidate new/pricing.ts \
  --unit    applyDiscount
```

```json
{
 "verdict": "WITNESS",
 "witness": {
  "input": 3,
  "args": [{ "total": 100, "tier": "gold" }, 0],
  "parent":    { "outcome": { "returned": 90 }, ... },
  "candidate": { "outcome": { "returned": 100 }, ... }
 },
 "certificate": { "parent": { "sha256": "…" }, "candidate": { "sha256": "…" }, "lanes": { "B": … } }
}
```

A whole change at once: `node langs/ts/pr.mjs --repo <checkout> --base <ref> [--head <ref>] [--scope f,Class.m]` reports every changed function of a pull request in one table, with the lint's advice for each ask. Class methods work too: `--unit PricingService.applyDiscount`. The whole file is read inside its project (its `tsconfig.json`, its imports, its types); nothing has to be rewritten to be checked.

## What it changes in your code

**Nothing, to start.** lean reads your TypeScript as it is, inside its own project: the `tsconfig.json`, the imports, the types. No annotations, no new syntax, no wrapper library, no build step. You point it at a parent file and a candidate file and name a function.

**What you need.** Node 20 or newer, Python 3, and [Dafny](https://dafny.org) 4 or newer on your `PATH` (it brings Z3). Nothing is installed into your repository.

**What becomes checkable.** A function gets a *proof* when it lives inside the subset: plain data (records, arrays, strings, sets, maps, optionals, literal unions), loops, early returns, `switch`, destructuring, `async` functions, class methods and constructors (`new C()` of a class in the same file runs its constructor on a fresh handle; the instance's methods are the file's own functions), recursion, JSX (an element is a value tree), and calls into the outside world. Those calls are modelled as transitions of an explicit world, so a service method that awaits a repository and logs is inside the subset. A `try`/`catch` is exact: a transition inside its body may fault, and the catch path is a branch the verifier sees. A `try` without a catch and a loop without a bound are opaque blocks named by their text.

**What you can no longer do, if you want proofs.** Six things make a function uncheckable by proof, and lean names the one it hit:

| you write | lean says | what to write instead |
|---|---|---|
| `this.stats.n = 1` inside a method | `ASK: receiver-mutation` | assign the field itself: `this.stats = { ...this.stats, n: 1 }` |
| `xs.forEach(x => { total += x })` | `ASK: closure-mutation` | `for (const x of xs) total += x`, or `reduce` |
| `const t = user.tags; t.push(x)` | `ASK: alias-mutation` | `user.tags.push(x)`: change it through the parameter, which becomes an output |
| `a === b` on two objects or arrays | `ASK: reference-equality` | compare the fields you mean |
| `n / 2` on numbers | `ASK: division` | `Math.floor(n / 2)` when you mean integer division |
| `eval`, `new Function`, `Object.getPrototypeOf`, `super` as a value (`const f = super.m`) | `ASK: dynamic-eval`, `prototype`, `class` | there is no mathematical reading of these; keep them out of the function you want proved (`super.m(...)` as a call is read: a transition on the receiver) |

Everything else that lean cannot read (generators, callbacks to a library, an unknown constructor) is not a refusal: it becomes an uninterpreted value or call, the same on both sides, and the proof still goes through when the rest is equal.

## How to write code lean can prove

**What a proof needs.** The proof lane reads a function as mathematics: every value is a mathematical value (a number, a string, a record, a sequence, a set, a map), and the function is a map from its arguments and the state of the world to a result and the next state of the world. Two versions are equal when that map is the same for every argument and every world. The verifier (Dafny over Z3) decides that statement. So the style below is not taste: each habit removes one thing that has no place in that reading, and lean names the habit it needs (`ASK: <rule>`) instead of guessing. Everything else is translated as it is.

The rule in one line: **a function owns what it creates, and everything else flows through its arguments, its result, and the world.**

**1. Change what you were handed through its own name, or build a new value.** In the value reading an argument is a value. A function that assigns a field, a slot or the contents of a parameter (`user.tags.push(t)`, `user.id = name`, `counts[k] = n`) is read as a function that also returns the parameter's new value: `addTag(user, t)` becomes `(result, user')`, written as a datatype update (`user.(tags := user.tags + [t])`), and a caller that passed a name takes the new value back into that name. Two rules keep this sound. Two parameters are two objects (the stated axiom; lane B tests it by passing one object twice). A local that is another name for a parameter's object (`const u = user`, `const t = user.tags`, `const x = xs[i]`) may not be changed: the model has one value per name, so a change through the alias would not reach the parameter. The lint says `alias-mutation` with the line; change the parameter itself, or copy first.

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

**5. Assign a field of `this`, never a field of a field.** A class method is translated as a function of an explicit receiver. A field that no method assigns is a pure accessor of the receiver. A field that any method of the class assigns lives in the world: every read is a transition (`get_count(world, self)`), every write is a transition (`set_count(world, self, v)`), and a method that touches one is effectful, like a method that calls a repository. Two versions that write different values, or write in a different order, make different transitions and are not equal. `this.stats.n += 1` reaches into a record the receiver holds and changes it in place, which the model cannot express; rebuild the record and assign the field.

```ts
// refused: receiver-mutation        // proved
bump() { this.stats.n += 1; }                  bump() { this.stats = { ...this.stats, n: this.stats.n + 1 }; }
```

What this buys: a counter, a cache, a registry, a service with injected ports (`constructor(private readonly repo: Repo)`) is inside the subset as written. A candidate that increments twice, resets the field where the parent did not, or reads it before writing where the parent wrote first, is a different sequence of transitions, and lane B shows the input and the two traces.

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

What this buys: a candidate that drops the empty-state paragraph, renders the wrong field, moves a button or wires another handler produces a different tree, and lane B shows the props on which the trees differ; a refactor from `cond ? <A/> : null` to `cond && <A/>` is proved equal. What it does not judge: pixels, CSS and layout, which stay with the recording gate. Measured on three React front ends written before this rule (nexus-landing, nexus-ui, the apps starter): 13.7, 9.3 and 33.7 percent of units inside before JSX was read as a value; 67.5, 87.8 and 48.8 percent after.

Everything else is yours: `async`/`await`, `try`/`catch` (a fault flag on the world: every transition inside the body may fault, the catch path runs with the fault value), `switch`, destructuring with defaults, optional chaining, template strings, `Set`, `Map`, generics, recursion, early returns, callbacks to array methods, local lambdas, JSX. [`langs/ts/subset.md`](langs/ts/subset.md) lists every construct and whether it is exact, uninterpreted, or refused.

**How much real code is inside.** Measured on 39 repositories (nexus, n8n, langchainjs, driftbench, pipedream, nutshell, pyka and 32 smaller ones; 48,696 functions and methods written before this style existed): 60.0 percent of all units are inside the subset as written, 71.5 percent of the nexus backend. The rest get lane B and the rule that stopped the proof lane. Code written with the lint on is inside from the first line.

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

**What changes in your workflow.** A pull request carries, per changed function, one of four words and its certificate. `WITNESS` comes with the input that shows the difference. `PASS-proved` comes with a theorem anyone can re-check. Reviewers read the scope you declared and the asks, not the diff.

## A change, end to end

`examples/booking/` is a pricing core and a quote service written in lean style, at the shape of a real price-comparison app: shops in zones, per-shop prices with validity days, two kinds of promotion, carts, delivery fees, the cheapest complete quote, a service with injected ports (catalogue, clock, audit) and results as values. Every function in it passes the gate as written.

Commit `85136f1` changed it the way a real pull request does: one asked rule (percent promotions capped at half the unit price), one slip while there (`>=` became `>` in the free-delivery test), two refactors that keep behaviour. With the asked function declared in scope:

```bash
node langs/ts/pr.mjs --repo . --base HEAD~1 --head HEAD --scope unitDiscount
```

| file | function | verdict | lane B | lane A | note |
|---|---|---|---|---|---|
| pricing.ts | `unitDiscount` | **IN-SCOPE** | PASS-bounded | | declared in scope |
| pricing.ts | `deliveryFee` | **WITNESS** | WITNESS | | input 6: `{ freeDeliveryFromCents: 0, … }, goods 0`: parent 0, candidate the fee |
| pricing.ts | `formatCents` | **PASS-proved** | PASS-bounded | PASS-proved | the refactor is a theorem |
| service.ts | `cleanCart` | **PASS-bounded** | PASS-bounded | ASK:unproved | the loop was reshaped; no difference on 80 inputs; the proof needs an induction lean does not yet write |

The slip is caught with the exact input that shows it; the refactor is proved for every input; the reshaped loop is answered with a bound and the reason, not a guess.

## What you get

**Code like mathematics.** Inside lean's subset, a TypeScript function *is* a mathematical function: the translator turns it into Dafny, and a prover reasons about every input at once. The subset is large: records, arrays, strings, sets, maps, optionals, literal unions, loops, early returns, switch, destructuring, async functions, class methods, recursion. [`langs/ts/subset.md`](langs/ts/subset.md) lists all of it.

**Effects that stay honest.** A call into the outside world (a database, a clock, an HTTP client, an imported function) is not pretended away. It becomes a *transition of an explicit world*: the same request in the same world gives the same answer, two reads of a clock are two values, and a candidate that asks the world something the parent never asked cannot be proved equal. The hole that most equivalence tools fall into (`readClock() === readClock()` proved equal to `true`) is closed by construction.

**A second opinion that runs the code.** When a function is outside the subset, lean still runs both versions against the same fakes, on inputs generated from the parameter types, and compares the outcome, the arguments after the call, every request to the environment and the work left pending. It finds the difference, or it tells you the bound it searched within.

**Certificates, not logs.** Every verdict carries the hashes of what was checked, the theorem and prelude hashes, the prover version and time limit, every lemma's result. Anyone can re-run every step.

**Nothing to learn, nothing to annotate.** No specifications, no proof hints for the common cases. Optional `// @invariant` and `// @decreases` comments when a loop needs them.

## How it works

```
                parent.ts            candidate.ts
                    │                     │
            ┌───────┴─────────────────────┴───────┐
            │  lane B · bounded execution          │   seconds
            │  both versions, one process, same    │
            │  fakes, frozen clock, typed inputs   │──► WITNESS (input, both observations)
            └───────────────────┬──────────────────┘
                                │ no difference found
            ┌───────────────────┴──────────────────┐
            │  lane A · proof                       │   seconds to a minute
            │  lint → translate to Dafny → theorem  │
            │  "equal outside the declared scope"   │──► PASS-proved (certificate)
            │  → Dafny / Z3                         │──► ASK (the lemma that did not close)
            └───────────────────┬──────────────────┘
                                │ outside the subset
                                ▼
                     PASS-bounded, with its bound
```

**The translation.** A pure function becomes a Dafny function. A loop becomes a recursive helper with its own termination measure. A class method becomes a function of an explicit receiver. A `try`/`catch` or a loop without a bound becomes an *opaque block*: one uninterpreted transition named by its own text, so the same block on both sides is the same transition and a changed block is never silently equal. Recursion takes a fuel; the theorem holds for every fuel.

**The theorem.** `spec/theorem.py` writes one lemma per changed function: outside the scope `S`, `f_parent(x) == f_candidate(x)`. Code whose text is identical on both sides (and calls only identical code) is aliased, not proved. The prover gets the rest.

**The fakes.** Lane B's environment is a set of recording proxies. Every request is written to a trace; answers are drawn from a seed and the request's path, the same on both sides, so that two runs disagree only where the code disagrees. Answers vary (a handle, `null`, an empty list, `0`, `false`) so that error paths and empty cases run.

## What "equal" means

Stated in full in [`langs/ts/SEMANTICS.md`](langs/ts/SEMANTICS.md). The short form:

One call of a function observes **(1)** the value returned or thrown, **(2)** every object reachable from the arguments and the receiver, after the call, **(3)** the ordered list of requests to the environment and their answers, **(4)** the work left pending. Two versions are equal outside `S` when, for every input outside `S` and every environment history, these four are identical. Allocation addresses never count. Aliasing counts.

The axiom that makes effects tractable: an effect is `effect(world, op, args) = (world', result)`. It is stated, not hidden, and it is the only axiom.

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
67.5 percent of nexus-landing's units and 87.8 percent of nexus-ui's are inside as written. What is not yet read:
the bodies of `useEffect` and `useMemo` callbacks as the functions they are (today opaque values), and a handler
whose body reaches a store.

**Reading 2: pointers are outputs.** TypeScript has no pointers, it has references, and a reference matters in one
case: when a function changes what it points to. Layer 1, built: a parameter the function changes (`user.tags.push(t)`,
`user.id = name`, `counts[k] = n`) is an *output* of the function, `(world', result, user')`, written as a datatype
update, and a caller that passed a name takes the new value back into that name. Two parameters are two objects (the
stated axiom; lane B tests it by passing one object twice), and a local alias of a parameter may not be changed
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

## Numbers

Measured on private corpora of production TypeScript. Numbers, not code, are published.

| measurement | result |
|---|---|
| planted behaviour changes in real nexus units (143 type-checked mutants: flipped operators, shifted boundaries, negated conditions, swapped arguments, dropped calls, changed returns) found by lane B with a concrete input | **120 of 143** |
| planted changes the proof lane wrongly proved equal | **0 of 143** |
| pairs of real commits that kept behaviour (145 untouched functions, parent against the defective commit) | **132 PASS** (39 proved, 93 bounded), 12 ASK, 1 wrong WITNESS through a changed callee |
| real functions inside the subset as written (39 repositories, 48,696 units) | **60.0 percent**; nexus backend 83.4 percent |
| React front ends with JSX read as a value tree (nexus-landing 1,318 units, nexus-ui 353, the apps starter 86) | **67.5**, **87.8**, **48.8 percent** inside |
| the two-clock pair (`readClock() === readClock()` vs `true`) | **not provable**, as it must be |
| test suite | 197 checks, conformance 21 of 21 |

The run over 43 repaired production defects (every changed function through both lanes, scored only when lean's witness lands on a function the repair touched) is in progress; its table replaces this line when it lands.

## Limits

lean says `ASK` rather than guess. Today it asks on: assignment to a field of a field of `this`, `super` as a value, generators, callbacks that change an outer variable, mutation through an alias of a parameter, `eval` and the prototype chain, more than one asynchronous schedule, and code the repository does not contain. A changed function that calls a changed recursive sibling needs an induction the theorem does not yet write.

Lane B's bound is real: a frozen clock, generated inputs, one microtask order. Its word is `PASS-bounded`, and it stays that word.

## Repository layout

```
langs/ts/check.mjs        one unit, both lanes, one verdict with its certificate
langs/ts/lint/            the subset gate: what the translator can turn into mathematics
langs/ts/translate/       TypeScript → Dafny (world-threaded effects, receivers, opaque blocks, fuel)
langs/ts/exec/            lane B: fakes, typed input generation, the differential runner, the mutator
langs/ts/SEMANTICS.md     what "equal" means, the one axiom, what stays outside
langs/ts/subset.md        every construct: exact, uninterpreted, or refused
spec/theorem.py           the theorem: equal outside S, matches E inside S; identity aliasing; prelude merge
conformance/              one command runs every language against every fixture
fixtures/                 shared behaviours, escapes the subset must refuse, clean changes it must pass
langs/py/, langs/_template  the next languages
```

## Contributing

A language merges when it passes `python3 -I conformance/run.py`: every shared fixture translates to the same form, every escape is refused, no clean change is refused. For TypeScript, `node langs/ts/tests/run.mjs` must stay green; a new construct comes with a pair test under `langs/ts/tests/pairs/` that shows the verdict it produces.

Rules that bind every contribution: no verdict from a model; no `assume`, no `{:axiom}`, no `{:verify false}` anywhere a proof can see; a bounded result is never reported as a proof.

## License

Apache-2.0.
