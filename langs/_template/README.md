# Adding a language

Copy this folder to `langs/<lang>/` and provide four parts:

1. `subset.md`: what the subset allows and refuses, with one example of each.
2. `lint/`: a command that exits non-zero on any changed function outside the subset.
3. `translate/`: a command that turns a function in the subset into the core form.
4. `tests/`: the shared fixtures under `fixtures/shared/` translated by your translator.

Run `python3 conformance/run.py <lang>` until it passes. Open a pull request with the conformance output.
