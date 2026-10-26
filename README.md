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

Class methods work too: `--unit PricingService.applyDiscount`. The whole file is read inside its project (its `tsconfig.json`, its imports, its types); nothing has to be rewritten to be checked.

## What it changes in your code

**Nothing, to start.** lean reads your TypeScript as it is, inside its own project: the `tsconfig.json`, the imports, the types. No annotations, no new syntax, no wrapper library, no build step. You point it at a parent file and a candidate file and name a function.

**What you need.** Node 20 or newer, Python 3, and [Dafny](https://dafny.org) 4 or newer on your `PATH` (it brings Z3). Nothing is installed into your repository.

**What becomes checkable.** A function gets a *proof* when it lives inside the subset: plain data (records, arrays, strings, sets, maps, optionals, literal unions), loops, early returns, `switch`, destructuring, `async` functions, class methods, recursion, and calls into the outside world. Those calls are modelled as transitions of an explicit world, so a service method that awaits a repository and logs is inside the subset. `try`/`catch` and loops without a bound are inside too, as opaque blocks named by their text.

**What you can no longer do, if you want proofs.** Six things make a function uncheckable by proof, and lean names the one it hit:

| you write | lean says | what to write instead |
|---|---|---|
| `this.count = this.count + 1` inside a method | `ASK: receiver-mutation` | return the new state, or keep the counter in a local |
| `xs.forEach(x => { total += x })` | `ASK: closure-mutation` | `for (const x of xs) total += x`, or `reduce` |
| `items.push(x)` where `items` is a parameter | `ASK: param-mutation` | return `[...items, x]` |
| `a === b` on two objects or arrays | `ASK: reference-equality` | compare the fields you mean |
| `n / 2` on numbers | `ASK: division` | `Math.floor(n / 2)` when you mean integer division |
| `eval`, `new Function`, `Object.getPrototypeOf`, `super` | `ASK: dynamic-eval`, `prototype`, `class` | there is no mathematical reading of these; keep them out of the function you want proved |

Everything else that lean cannot read (JSX, generators, callbacks to a library, an unknown constructor) is not a refusal: it becomes an uninterpreted value or call, the same on both sides, and the proof still goes through when the rest is equal.

## How to write code lean can prove

The rule in one line: **a function owns what it creates, and everything else flows through its arguments and its result.** Nothing you write has to look like a proof. These six habits are the whole style, each shown as the shape lean refuses and the shape it proves.

**1. Build new values instead of changing old ones.** A function may change what it made (a local array, a local record); it may not change what it was handed.

```ts
// refused: param-mutation          // proved
function addTag(user: User, t: string) {       function addTag(user: User, t: string): User {
  user.tags.push(t);                            return { ...user, tags: [...user.tags, t] };
  return user;                                }
}
```

**2. Let state come out of loops, not out of callbacks.** A loop may update a local; a callback may only compute.

```ts
// refused: closure-mutation         // proved
let total = 0;                                 let total = 0;
prices.forEach(p => { total += p; });          for (const p of prices) total += p;
                                               // or: const total = prices.reduce((a, p) => a + p, 0);
```

**3. Say what you compare.** `===` between two objects compares addresses; lean has no addresses. Compare fields.

```ts
// refused: reference-equality       // proved
if (a === b) ...                               if (a.id === b.id) ...
```

**4. Say what kind of number you mean.** `/` is real division in JavaScript. Write the integer one when you mean it.

```ts
// refused: division                  // proved
const half = n / 2;                            const half = Math.floor(n / 2);   // or n * 0.5 when a real is meant
```

**5. Keep an object's state in its result, not in `this`.** A method may read its fields; a method that assigns one is not provable yet. Return the new state.

```ts
// refused: receiver-mutation        // proved
bump() { this.n = this.n + 1; }                bump(): number { return this.n + 1; }     // the caller keeps the count
```

**6. Give a `while` loop its bound.** `for` and `for...of` need nothing. A `while` is proved when you say what shrinks; without it, it becomes an opaque block (same on both sides, never proved different).

```ts
// opaque block                       // proved
while (i > 0) { i -= 1; }                      // @decreases i
                                               while (i > 0) { i -= 1; }
```

Everything else is yours: `async`/`await`, imports, service calls, `try`/`catch`, `switch`, destructuring, optional chaining, template strings, `Set`, `Map`, class methods, recursion. A call into the outside world is fine; it is a transition of the world, and both versions make it in the same order or they are not equal.

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

## Numbers

Measured on a private corpus of 110 escaped defects from production TypeScript (2,334 changed functions, 2,350 untouched functions). Numbers, not code, are published.

| measurement | result |
|---|---|
| planted behaviour changes caught by lane B (160 type-checked mutants, 40 real units) | **122 of 160** |
| planted changes the proof lane wrongly proved equal | **0** |
| untouched functions passed (parent vs the defective commit) | **132 of 145** sampled |
| the two-clock pair (`readClock() === readClock()` vs `true`) | **not provable**, as it must be |
| test suite | 126 checks, conformance 21 of 21 |

The full corpus run (every changed function through both lanes) is in progress; its table replaces this one when it lands. Numbers for the next languages will sit beside it.

## Limits

lean says `ASK` rather than guess. Today it asks on: assignment to a field of `this`, `super`, generators, callbacks that change an outer variable, mutation of a parameter, `eval` and the prototype chain, JSX, more than one asynchronous schedule, and code the repository does not contain. A changed function that calls a changed recursive sibling needs an induction the theorem does not yet write.

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
