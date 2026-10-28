# lean-py

Python for lean, milestone 1: a lint, a translator to the shared Dafny core form, and an execution harness, all
Python 3 standard library (`ast` for parsing, the type hints as the typed surface), safe under `python3 -I`.

| Part | Command | What it does |
|---|---|---|
| lint | `python3 -I langs/py/lint/lint.py <file.py> [--json]` | exit 0 "inside the subset", or exit 1 with `file:line:col rule message` per finding |
| translate | `python3 -I langs/py/translate/translate.py <file.py> --core --out <out.dfy> [--prelude <pre.dfy>] [--suffix parent\|candidate] [--effectful u1,u2]` | the file's units as Dafny functions, the conventions `spec/theorem.py` reads |
| lane B | `python3 -I langs/py/exec/run.py --parent p.py --candidate c.py --unit <name> [--n 30] [--seed 1] [--out b.json]` | both sides run on typed inputs with recording fakes: `WITNESS`, `PASS-bounded` or `ASK` |
| tests | `python3 -I langs/py/tests/run.py [pair ...] [--no-b]` | the pairs through both lanes, the escapes, the conformance run; the last line is `\| TOTAL \| N checks \| ALL PASS \|` |
| conformance | `python3 -I conformance/run.py py` | the shared fixtures and the escapes, the same run every language passes |

## conformance.json

`langs/py/conformance.json` maps the template's placeholders: `lint` is `lint.py {src}`, `translate` is
`translate.py {src} --core --suffix {suffix} --out {out}`. Without `--prelude` the shared declarations are written
inline, so a shared fixture's translation stands alone.

## Units and names

A unit is a top-level `def`, or a method of a top-level class (`Class.method`, `Class.__init__`). Its Dafny name is
the TypeScript one: snake_case, a method is `<class>_<method>`, a constructor is `<class>_constructor`, and a Dafny
keyword gets a trailing underscore (`case` is `case_`). The same source function gets the same Dafny name in every
language.

## Layout

```
langs/py/common.py        the units, the classes, the type hints read as types (shared by the three parts)
langs/py/lint/            the subset gate: rules on sight, then the translator on every unit
langs/py/translate/       Python -> Dafny: exact values, the world, faults, loops as measured helpers
langs/py/exec/            lane B: both sides in one process, recording stubs, typed inputs, four observations
langs/py/tests/           the pair runner and the pairs ported from langs/ts/tests/pairs
langs/py/subset.md        every construct: exact, transition, uninterpreted, or refused by rule
langs/py/SEMANTICS.md     what "equal" means for Python, and where it differs from TypeScript
langs/py/design/          the milestone 1 design note
```
