# spec

The theorem generator and the checker. Given the parent, the candidate, the scope S and the edit E, the generator states "equal outside S, matches E inside S". Nothing in the theorem comes from the producer of the change.

```
python3 -I spec/theorem.py --parent p.dfy --candidate c.dfy --scope scope.json --edit edit.json --out obligations.dfy
python3 -I spec/check.py   --obligations obligations.dfy [--parent p.dfy --candidate c.dfy --scope scope.json --edit edit.json]
```

## Inputs

- `p.dfy`, `c.dfy`: Dafny files with the same functions. Every function is named `<f>_parent` in the first and `<f>_candidate` in the second (the translator of a language applies the suffix). Functions only: pure, with a body.
- `scope.json`: `{"functions": {"<f>": {"in_scope": "<Dafny boolean over the parameters>"}}}`. `in_scope` is the predicate "inside S". `false` marks a function wholly outside S. The candidate may define no function that this file does not list.
- `edit.json`: per function inside S, exactly one of
  - `{"<f>": {"post": "<Dafny boolean over the parameters and result>"}}`
  - `{"<f>": {"pairs": [{"args": [3], "result": 5}]}}` (concrete input-output pairs)

## Private helpers

A translator turns a loop, filter, map, reduce, min or max into a private helper named `<f>_<helper>_<suffix>`, for example `total_loop0_parent`. A function whose base name starts with the base name of a scoped function plus `_` is a private helper. A helper is a definition only: it gets no lemma. The generator refuses a helper that no scoped function reaches, directly or through other helpers, in the parent and in the candidate (a helper nothing reaches is a smuggled entry point). A helper may differ between parent and candidate; its effect is covered by the lemmas of the scoped function that calls it.

## The theorem

For every function `f` in the scope file, with parameters `args` and Dafny type `T` of the result:

```dafny
predicate InScope_f(args) { <in_scope> }

// outside S the candidate is the parent, for every input
lemma Equal_f(args)
  requires !InScope_f(args)
  ensures f_parent(args) == f_candidate(args)

// inside S the candidate satisfies E (post form)
predicate Post_f(args, result: T) { <post> }
lemma Edit_f(args)
  requires InScope_f(args)
  ensures Post_f(args, f_candidate(args))

// inside S the candidate satisfies E (pairs form): one lemma per pair i
lemma Edit_f_pair<i>()
  ensures InScope_f(a_i) && f_candidate(a_i) == r_i
```

A function with `in_scope` equal to `false` gets `Equal_f` only. The names, the parameter lists and the result type come from the parent. `InScope_f` and `Post_f` come from the scope and edit files. The producer supplies the two function files and nothing else.

Only the lemma bodies are free: each lemma ends with `{ // PROOF <name>` ... `} // END <name>`. The generator leaves them empty, and Dafny proves them unaided when it can. A prover may fill a body, and may append support lemmas between `// BEGIN SUPPORT` and `// END SUPPORT` (for example an induction lemma that two loop helpers agree). The checker proves support lemmas too, removes the block before it compares the theorem, and refuses `assume`, `{:axiom}`, `{:verify false}` and `extern` there. In a fixture, `proofs.json` (`{"support": "...", "bodies": {"<lemma>": "..."}}`) stands in for the prover.

## What the gate refuses

- a function without a body (an unproved specification would pass as code), a generic function, a function missing from either file, or a different signature in the two files;
- `assume`, `{:axiom}`, `{:verify false}`, `extern` in either file or in a proof body;
- a candidate function the scope file does not list, an edit for a function outside S.

## The checker

`spec/check.py` runs `dafny verify --verification-time-limit 60` and prints one row per lemma: `proved`, `refuted` (with Dafny's counterexample when this build of Dafny offers one), `timeout`, or `error`. Exit 0 only when every lemma is proved. Given the four inputs it first regenerates the theorem and requires the file under check to state exactly that theorem, whatever its lemma bodies: a proof of a weaker or different statement is refused.
