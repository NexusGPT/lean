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

## Status

Scaffold. The first measurement (how many real changed functions enter the TypeScript subset) is running on a private corpus; its numbers will be published here.

## License

Apache-2.0.
