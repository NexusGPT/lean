# lean-ts

The TypeScript package of [lean](../../README.md). It decides if a changed function lies inside a subset of TypeScript, and it turns such a function into Dafny, the shared core form. Nothing here proves a change by itself: the proof is the job of `spec/` and `core/`.

Node 20 or later and Dafny 4.11 are the only tools needed. The TypeScript compiler is vendored in `vendor/typescript` (version 5.9.3, Apache-2.0, licence included), so there is no install step.

## The three commands

Run them from the repository root.

```
node langs/ts/lint/lint.mjs <file.ts> [--changed ranges.json]
node langs/ts/translate/translate.mjs <file.ts> --fn <name> --out <file.dfy> [--real] [--ensures E]... [--requires E]... [--invariant [N:]E]...
node langs/ts/translate/translate.mjs <file.ts> --core --out <file.dfy> [--suffix parent|candidate] [--real]
node langs/ts/tests/run.mjs
```

**Lint.** Exit 0 when every checked function is inside the subset. Otherwise it prints one line per violation (`file:line:col  rule  message`) and exits 1. With `--changed`, only the functions that overlap the given line ranges are checked. The ranges file is JSON: `[[3, 9], [20, 31]]` or `{"ranges": [{"start": 3, "end": 9}]}`, lines 1-based and inclusive.

**Translate, proof shape.** Writes the function and the same-file functions it calls. A function with a loop becomes a Dafny `method`. `--ensures` and `--requires` add the theorem; `result` names the returned value. `--invariant` adds a loop invariant, to every loop or to loop `N` with `N:expr`.

```
node langs/ts/translate/translate.mjs fixtures/shared/sum_positive/ts.ts --fn sumPositive \
  --out /tmp/sum_positive.dfy --ensures 'result >= 0' --invariant 'total >= 0'
dafny verify /tmp/sum_positive.dfy
```

**Translate, `--core`.** Writes every top-level function as a pure Dafny `function` named `<snake_case>` plus `_<suffix>`. This is the shape `conformance/run.py` and `spec/` consume. A loop becomes a recursive helper. The translator derives `ensures` clauses that keep a counter non-negative (for example a sum of positive numbers), and reads `// @invariant` comments for the rest. The lint runs first inside both shapes: a function outside the subset is not translated.

**Tests.** `node langs/ts/tests/run.mjs` prints one table and exits 0 only when every row passes. It covers:

- the shared fixtures: lint, translate, verify in Dafny with the theorem in `tests/theorems.json`, verify the hand-written `core.dfy`, same signature;
- the escapes under `fixtures/escapes/ts`: lint exits 1 with the rule named on the first line, and translate refuses too;
- one function per construct (`tests/cases`), verified in both shapes;
- differential runs: the TypeScript and the translation give the same answers on sample inputs;
- negative controls: a false theorem is not proved, and a proof that needs an invariant fails without it;
- `--changed`, and `python3 -I conformance/run.py ts` when the file exists.

The run takes about a minute, because every row calls Dafny.

## What the subset covers

Functions, class methods and React components over `number`, `bigint`, `boolean`, `string`, arrays, records, tuples, sets, maps, optionals and JSX trees, with `let`/`const`, `if`, `switch`, early return, `for...of`, counted `for`, bounded `while`, the array and string methods, recursion, generics, `async`/`await`, and calls into the outside world modelled as transitions of an explicit world. A `try`/`catch` is exact (a fault flag on the world); a `try` without a catch and an unbounded `while` are opaque blocks. [subset.md](subset.md) lists every exact, transition, uninterpreted, opaque and refused construct with one example each.

## Candidate-only units

`node langs/ts/check.mjs --candidate file.ts --unit f` loads and runs a new unit alone.
`lint/lint.mjs` accepts the same form for execution admission. The sixth verdict, `NEW`,
records bounded observations and faults and never claims equality. Only a repository-owned
local link failure is `REFUSE` with kind `load`; evaluation failures are ASK with their
environment class, and test modules are ASK before loading. The full verdict contract is in [subset.md](subset.md).

## Known gaps

- **`number` is not a float.** It is `int` by default and `real` with `--real`. Neither models IEEE 754, overflow or `NaN`. A float literal is refused in `int` mode.
- **Strings are thin.** The methods with a rule are listed in subset.md; the rest are uninterpreted functions of their arguments.
- **A fault comes only from a transition or a `throw`.** A pure call that throws in JavaScript (`JSON.parse` on bad input) is a pure function in the model, so a `catch` around it alone is a branch never taken.
- **Loop equality needs a prover.** `--core` turns a loop, `filter`, `map`, `reduce`, `Math.min` and `Math.max` into private helper functions named `<f>_<helper>_<suffix>`, the form `spec/` accepts. Proving that a parent loop equals a candidate loop needs a relational support lemma, which the prover writes. Measured on a parent and a candidate of `sum_of_positives` that differ only in `0 < x` against `x > 0`: the translation is accepted, and `Equal_sum_of_positives` is refuted without a support lemma.
- **Hints are untrusted.** A wrong `@invariant` fails the proof; it never passes a wrong one.

## Comparison with LemmaScript

The test table has a column `lsc accepts`: whether `lsc gen --backend=dafny` (LemmaScript 0.6.5, installed outside the repo) exits 0 on the file. The package ships no `SUBSET.md`, so the comparison is by behaviour. It measures reach only. `lsc gen` translates without verifying, so "yes" means "translated", not "proved".

- `lsc gen` accepted 14 of 18 escapes, among them `as` casts, `!`, `any`, `async`, classes, `eval`, global mutation, `null` and `/`. Our lint refuses them, because a gate must not translate what it cannot model.
- `lsc gen` refused 4 escapes: `Math.random`, `Promise`, `Object` and `try/catch`.
- `lsc gen` accepted all 3 shared fixtures and all 13 construct cases that our lint accepts.
