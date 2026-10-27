# Mutual summaries and adapters

Source: the owner's research of 2026-10-27, section 4 ("Large Refactors: Compare Callers Through Callee Relations"),
and `research-integration.md` section 11. Motivation, from the challenge's measurement on the corpus's Nexus defect
commits (`lean-v3/challenge/dossier-limits-nexus.md`): 383 of 1,742 changed functions call a function the same commit
changed, and 608 changed their signature. Before this row each function was proved alone, its same-file callees
unfolded through both bodies; a recursive callee could not be unfolded far enough, and a changed signature was
`ASK:interface` with no way out.

## The summary lemma

For a scoped function `f` and a scoped callee `g` that both sides of `f` call, changed (not aliased) and with its own
lemma, the proof of `Equal_f` states the relational summary `R_g` by calling `Equal_g` for every input outside g's
scope. Dafny then uses `R_g` at the aligned call sites. From the pair `mutual_summaries`:

    // RESTS Equal_use_fact: Equal_fact
    lemma Equal_use_fact(n: int)
      requires !InScope_use_fact(n)
      ensures use_fact_parent(n) == use_fact_candidate(n)
    { // PROOF Equal_use_fact
      forall r0_fact: nat, r1_fact: int | !InScope_fact(r0_fact, r1_fact)
        ensures fact_parent(r0_fact, r1_fact) == fact_candidate(r0_fact, r1_fact)
      { Equal_fact(r0_fact, r1_fact); }
    } // END Equal_use_fact

The summary is a lemma call, never an `assume` (the theorem refuses `assume` in every text it reads). It is written only under
the scope key `"summaries": true`, which check.mjs and the TypeScript suite set: a reader that sets it promises to
resolve the `RESTS` lines. The Python suite does not set it yet, so its theorems are unchanged.

## The verdict rule

A lemma that calls `Equal_g` holds in Dafny even when `Equal_g` fails: Dafny checks each lemma modularly. So the
reader resolves: `Equal_f` is proved when `EqualDirect_f` holds (the same statement with an empty body, written beside
every lemma that rests on something, so a function its bodies alone prove never needs a summary), or when `Equal_f`
holds and every lemma it rests on is proved by this same rule (`provedLemma` in check.mjs, used by check.mjs and
tests/run.mjs). The certificate lists `restsOn`, one entry per callee with its own verdict. An own lemma that holds over
an unproved callee makes the unit `ASK:unproved`, the reason `unproved through g` and `unprovedThrough: [g]`; lane B
still runs first, so a difference it finds is a WITNESS whose `through` names the same callee.

## Recursion

A function on a recursive cycle takes a fuel (SEMANTICS, Recursion). A callee on f's own cycle, f itself included, is
the induction premise: the forall admits it only on a smaller fuel, and `Equal_f` decreases its fuel, so Dafny checks
the premise is used on smaller instances only; a mutually recursive component is discharged jointly, each lemma resting
on the others. Relative termination is the side condition in the certificate (`induction.termination`): each side's own
definition decreases its fuel, and running out is the same uninterpreted value on both sides, so the equality includes
both sides recursing to the same depth. A cycle without a fuel parameter gets no premise and stays as before.

    // INDUCTION Equal_is_even: decreases fuel over is_even,is_odd; termination: ...
    lemma Equal_is_even(fuel: nat, n: int) ... decreases fuel
    { forall r0_is_odd: nat, r1_is_odd: int | !InScope_is_odd(r0_is_odd, r1_is_odd) && r0_is_odd < fuel
        ensures is_odd_parent(r0_is_odd, r1_is_odd) == is_odd_candidate(r0_is_odd, r1_is_odd)
      { Equal_is_odd(r0_is_odd, r1_is_odd); } ... }

The pair `recursion` keeps its expectations: `total` and `depth` recurse from inside a loop, and the translator's loop
helper passes a fuel it does not bind (a resolution error in Dafny), so nothing in that file is proved and both stay
not proved, as before. That is a translator defect outside this row; the README names the loop case.

## The adapter theorem

A changed signature proves only through an adapter the developer declares: in the scope file,
`"adapters": {"<f>": {"from": [parent parameters], "to": [candidate parameters], "map": [one Dafny expression over the
parent's parameters per "to" name]}}`, or a comment just above the candidate function,
`// lean-adapter {"from": ["x"], "to": ["x"], "map": ["Some(x)"]}`. A parameter in neither list is threaded: the same
name and type on both sides (the world, the fuel), passed as it is, so the effects are compared too. The theorem:

    // ADAPTER Equal_pad: pad_candidate(Some(x)) == pad_parent(x) (door comment)
    lemma Equal_pad(x: int) requires !InScope_pad(x) ensures pad_parent(x) == pad_candidate(Some(x))

A caller of an adapted callee rests on that summary (`usePick` in the pair `adapters`). The adapter accounts for
parameter count, types, optionality, rest and defaults; a changed decorator, receiver or return type it does not, and
those stay `ASK:interface`. Without an adapter the unit's lemma is withheld and the reason names the door (a Dafny
signature that changed now withholds that unit instead of refusing the whole file). Lane B runs both sides on the
same raw inputs, which is not the adapted claim: check.mjs records lane B's verdict and lets lane A answer; if lane A
does not prove it, the verdict is ASK, never PASS-bounded.

## Soundness

- A summary is a proved lemma, resolved by the rule above; an unproved one is shown as such and lowers the caller.
- An induction premise is checked by Dafny's own termination check on the fuel; the fuel reading itself is the
  translator's (SEMANTICS, Recursion).
- An adapter is a declared proof input, shown in the certificate with its door; the claim proved is the adapted one,
  never the raw same-input one, and the theorem refuses an adapter that names a parameter the function lacks, leaves
  a candidate parameter without a value, or maps with anything but an expression.
- Heap-core units (a `// HYP` hypothesis) and generic callees keep their bodies: the heap hypothesis handling is
  unchanged.

## What stays out

Generated modules: compared through the schema and the generator version as the module contract, a later row.
Cross-file callees: a transition today. A recursive call inside a loop helper (above). Lane B under an adapter.
