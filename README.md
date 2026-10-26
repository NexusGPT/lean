# lean

A proof add-on for any programming language. It checks that a code change does exactly what was asked, and nothing else, by proof rather than by testing.

Per-language packages: `lean-ts` (TypeScript), `lean-py` (Python). More languages are welcome; see `langs/_template`.

## What it checks

For a change from an old version (the parent) to a new version (the candidate), with a declared scope `S` and a wanted edit `E`:

- outside `S`, the candidate behaves exactly like the parent, for every input;
- inside `S`, the candidate behaves as `E` says;
- the change performs no effect (database, network, file, mail) outside what `S` allows.

Untouched code is equal by identity and needs no proof. Changed code must lie inside the language's **subset**: the part of the language the checker can turn into exact mathematics. Code outside the subset (unsafe casts, dynamic evaluation, hidden side effects) is refused in a change, never silently accepted.

## How it works

1. `langs/<lang>/subset`: a strict compiler setting plus a lint that refuses code outside the subset.
2. `langs/<lang>/translate`: turns each changed function, parent and candidate, into the shared mathematical form in `core/`.
3. `spec/`: writes the theorem from `S` and `E`. No human and no model states it by hand.
4. `core/`: a prover searches for the proof; a checker verifies it. No proof, no release.

Effects stay outside the proof: database, network and mail calls pass through a capability layer and an effect proxy that work for any language.

## Repository layout

```
core/         the shared mathematical form, prover and checker drivers (Lean 4; Dafny backend)
spec/         the theorem generator: equal outside S, matches E inside S
langs/ts/     lean-ts: subset rule, lint, translator, tests
langs/py/     lean-py: the same four parts
langs/_template/  copy this to add a language
fixtures/shared/  one behaviour written in every language; every translator must agree
fixtures/bugs/    escaped defects: parent, buggy, fixed, expected verdict
fixtures/cleans/  honest changes: must pass
fixtures/escapes/ code the subset must refuse
conformance/  one command runs every language against every fixture
```

## Contribution rule

A language merges only when it passes `conformance/run.py`: every shared fixture translates to the same form, every escape is refused, and no clean change is refused.

## lean-ts version 3: two lanes, one verdict

`node langs/ts/check.mjs --parent old.ts --candidate new.ts --unit <name|Class.method>` answers with one of:

| verdict | meaning |
|---|---|
| `WITNESS` | an input on which the two versions differ outside the scope, with both observations |
| `PASS-proved` | equal on every input outside the scope under the stated axioms (Dafny, with the certificate) |
| `PASS-bounded` | no difference on n generated inputs with the fakes and the time limit stated; never a proof |
| `ASK` | undecided, with the reason (a construct outside the subset, a changed interface, a timeout) |

- **Lane A, proof** (`lint/`, `translate/`, `spec/theorem.py`): every effectful call is a transition of an explicit world token; class methods are functions of an explicit receiver; try/catch and unbounded loops are opaque blocks named by their text; recursion takes a fuel. What is equal by identity is aliased, not proved. `langs/ts/SEMANTICS.md` states what equal means.
- **Lane B, bounded execution** (`exec/`): both versions compiled with the vendored compiler and run in their own sandbox against the same fakes; the observation is the outcome, the arguments after the call, the trace of environment requests and the pending work.
- **Planted changes** (`exec/mutate.mjs`): seven mutation kinds by site index, for the soundness battery.

## Status

Theorem generator, checker and conformance runner work end to end (`python3 -I conformance/run.py`, `node langs/ts/tests/run.mjs`: 126 checks). lean-ts version 3 is measured on a private corpus of 110 escaped defects (2,334 changed functions, 2,350 untouched functions, planted changes); the numbers are published in this file when the run completes.

## License

Apache-2.0.
