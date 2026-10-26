<p align="center">
  <strong style="font-size: 2.4em">lean</strong><br>
  <em>Write TypeScript like mathematics. Prove a change did only what you asked.</em>
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

Every change to a program is a claim: *I changed this, and nothing else.* Tests sample that claim. Review guesses at it. **lean checks it.**

Give lean the old version and the new version of a function and it answers with one of four words, each backed by something you can re-run:

| verdict | what it means | what backs it |
|---|---|---|
| **`WITNESS`** | here is an input on which the two versions behave differently | the input and both observations |
| **`PASS-proved`** | equal on **every** input outside the change you declared | a theorem, checked by [Dafny](https://dafny.org) |
| **`PASS-bounded`** | no difference found on *n* generated inputs under a frozen environment | the inputs, the seed, the bound |
| **`ASK`** | undecided, and here is exactly why | the construct, the timeout, the changed interface |

A bounded pass never becomes a proof. A proof never comes from a model's opinion. The producer of the change is never consulted.

This is a **regression verifier** for TypeScript: an equivalence checker between the parent and the candidate of a change. The ideas come from compiler translation validation, regression verification and differential testing; the engineering is ours.

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

## What you get

**Code that behaves like math.** Inside lean's subset, a TypeScript function *is* a mathematical function: the translator turns it into Dafny, and a prover reasons about every input at once. The subset is large: records, arrays, strings, sets, maps, optionals, literal unions, loops, early returns, switch, destructuring, async functions, class methods, recursion. [`langs/ts/subset.md`](langs/ts/subset.md) lists all of it.

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

The full corpus run (every changed function through both lanes) is in progress; its table replaces this one when it lands.

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
