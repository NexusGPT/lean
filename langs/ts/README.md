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

Pure functions over `number`, `bigint`, `boolean`, `string`, arrays, records, tuples and `T | undefined`, with `let`/`const`, `if`, early return, `for...of`, counted `for`, bounded `while`, `map`/`filter`/`reduce`, `Math.min`/`max`/`floor`. [subset.md](subset.md) lists every allowed and every refused construct with one example each.

## Known gaps

- **`number` is not a float.** It is `int` by default and `real` with `--real`. Neither models IEEE 754, overflow or `NaN`. A float literal is refused in `int` mode.
- **Strings are thin.** Concatenation, equality and length only.
- **No async.** `await`, `Promise` and exceptions are refused. A handler that calls a database is outside the subset by design.
- **No recursion, no `return` inside a loop in `--core`.**
- **Loop equality needs a prover.** `--core` turns a loop, `filter`, `map`, `reduce`, `Math.min` and `Math.max` into private helper functions named `<f>_<helper>_<suffix>`, the form `spec/` accepts. Dafny proves a property of one function when its helper carries the right `ensures`. Proving that a parent loop equals a candidate loop needs a relational support lemma, which the prover writes. Measured on a parent and a candidate of `sum_of_positives` that differ only in `0 < x` against `x > 0`: the translation is accepted, and `Equal_sum_of_positives` is refuted without a support lemma.
- **Hints are untrusted.** A wrong `@invariant` fails the proof; it never passes a wrong one.
