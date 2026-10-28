# Adding a language

Copy this folder to `langs/<lang>/` and provide four parts:

1. `subset.md`: what the subset allows and refuses, with one example of each.
2. `lint/`: a command that exits non-zero on any changed function outside the subset.
3. `translate/`: a command that turns a function in the subset into the core form.
4. `tests/`: the shared fixtures under `fixtures/shared/` translated by your translator.

Run `python3 conformance/run.py <lang>` until it passes. Open a pull request with the conformance output.

## conformance.json

`langs/<lang>/conformance.json` tells `conformance/run.py` how to call your lint and your translator. Copy `langs/_template/conformance.json` and change `xx`.

| Field | Meaning |
|---|---|
| `ext` | File extension of your language, without the dot |
| `lint` | Command (a list of arguments). Exit 0: the file is inside the subset. Exit 1: refused. Any other exit: broken |
| `translate` | Command (a list of arguments). Writes Dafny to `{out}`. Exit 0 on success |

Placeholders, replaced in every argument. Commands run from the repository root.

| Placeholder | Value |
|---|---|
| `{src}` | Path of the source file to lint or translate |
| `{out}` | Path where `translate` writes its Dafny file |
| `{suffix}` | `parent`, `candidate`, or empty (a shared fixture) |
| `{root}` | Repository root |
| `{lang}` | Your language folder name |

### What translate must write

Pure functions only, as Dafny `function`s, each with a body. Every function is named `<snake_case_name>` followed by `_<suffix>` when the suffix is not empty: `sum_positive` for a shared fixture, `grade_parent` and `grade_candidate` for a change. The same source function gets the same Dafny name in every language. Helper lemmas and `ensures` clauses that help Dafny are allowed. `assume`, `{:axiom}`, `{:verify false}` and `extern` are refused.

### What the runner checks

- **shared**: for each `fixtures/shared/<name>/`, your file `<lang>.<ext>` passes `lint`. Its translation (empty suffix), together with the lemma `ensures <expression>` where the expression is the backticked text on the `Theorem` line of the fixture `README.md`, verifies.
- **escapes**: every file under `fixtures/escapes/` of your extension makes `lint` exit 1.
- **cleans**: each folder under `fixtures/cleans/<lang>/` holds `parent.<ext>`, `candidate.<ext>`, `scope.json`, `edit.json`. Both files pass `lint`, both translate, and every lemma of the theorem in `spec/README.md` is proved.
- **bugs**: each folder under `fixtures/bugs/<lang>/` holds the same files and `expected.json`, a map from lemma name to `proved`, `refuted` or `timeout`. The outcomes must equal it exactly.

`python3 -I conformance/run.py <lang>` runs one language. The last line is `conformance: PASS` or `conformance: FAIL`. A folder under `langs/` without `conformance.json` is skipped. The language `dfy` is built in: Dafny files stand for themselves, so the specification is tested before any language exists.
