# lean-py

Python for lean, milestone 2: a lint, a translator to the shared Dafny core form, and an execution harness, all
Python 3 standard library (`ast` for parsing, the type hints as the typed surface), safe under `python3 -I`. A Python
function gets the three verdicts the TypeScript one gets: the lint (inside the subset, or a finding naming the
construct and the rewrite), the proof (lane A) and the bounded run (lane B), each read by `conformance/run.py` the
same way for both languages.

## Milestones

| Milestone | Status | What it covers |
|---|---|---|
| 1 | done | typed defs through the same theorem, prelude merge and conformance run as TypeScript; the subset (`subset.md`), its escapes under `fixtures/escapes/py/`, ten pairs ported from `langs/ts/tests/pairs` |
| 2 | done | **the lint**: every finding names the construct (rule, message, unit, source line) and the rewrite with its label (`proved`, `conditional` with its precondition, `migration`; `lint/advice.py`, the TypeScript labels), in `--json` and as an `--agent` work list; every rule the lint or the translator can name has a rewrite (checked from the sources). **Lane B**: the record is the TypeScript one (`witnesses[].input/args/parent/candidate/where.field`, `bound.n/seed/ms`, `spec`). **Conformance**: a `pairs` kind in `conformance/run.py` (lint, prelude translation, theorem, lane B verdict, record shape, no proof contradicted by a witness), five pairs listed in `conformance.json`: `pure_function`, `raised_exception`, `dataclass_update`, `list_transform`, `dict_lookup`. A map comprehension is read as a Dafny sequence comprehension and a filter carries its congruence lemma, so a rewritten element or predicate proves. |
| 3 | next | generators and async; inheritance and the exception class hierarchy; float; the heap reading of shared mutable values (lists and dicts handed to the outside, in-place updates); dict insertion order (iteration, and a returned dict whose order a caller can see: see `SEMANTICS.md`, "Dicts"); `finally`; programs of several commands on one instance in lane B; the concept bench for Python |

| Part | Command | What it does |
|---|---|---|
| lint | `python3 -I langs/py/lint/lint.py <file.py> [--json \| --agent]` | exit 0 "inside the subset", or exit 1 with `file:line:col rule message` per finding; `--json` adds `unit`, `text`, `label`, `precondition`, `advice` per finding, `--agent` a work list per function |
| translate | `python3 -I langs/py/translate/translate.py <file.py> --core --out <out.dfy> [--prelude <pre.dfy>] [--suffix parent\|candidate] [--effectful u1,u2]` | the file's units as Dafny functions, the conventions `spec/theorem.py` reads |
| lane B | `python3 -I langs/py/exec/run.py --parent p.py --candidate c.py --unit <name> [--n 30] [--seed 1] [--out b.json]` | both sides run on typed inputs with recording fakes: `WITNESS`, `PASS-bounded` or `ASK`, in the TypeScript record |
| tests | `python3 -I langs/py/tests/run.py [pair ...] [--no-b] [--escapes]` | the pairs through both lanes, the escapes (refused by their rule, with a rewrite), the advice table, the conformance run; `--escapes` runs the lint checks only; the last line is `\| TOTAL \| N checks \| ALL PASS \|` |
| conformance | `python3 -I conformance/run.py py` | the shared fixtures, the escapes and the listed pairs, the same run every language passes |

## conformance.json

`langs/py/conformance.json` maps the template's placeholders: `lint` is `lint.py {src}`, `translate` is
`translate.py {src} --core --suffix {suffix} --out {out}`. Without `--prelude` the shared declarations are written
inline, so a shared fixture's translation stands alone. The pair kind adds three fields: `pairs` (the pair folders),
`pair_translate` (the translation with `--prelude {prelude}` and `--effectful {effectful}`: both sides share one
prelude and agree on which units take the world, read from the `// EFFECTFUL:` header) and `exec` (lane B with
`{parent}`, `{candidate}`, `{unit}`, `{out}`).

## Units and names

A unit is a top-level `def`, or a method of a top-level class (`Class.method`, `Class.__init__`). Its Dafny name is
the TypeScript one: snake_case, a method is `<class>_<method>`, a constructor is `<class>_constructor`, and a Dafny
keyword gets a trailing underscore (`case` is `case_`). The same source function gets the same Dafny name in every
language.

## Layout

```
langs/py/common.py        the units, the classes, the type hints read as types (shared by the three parts)
langs/py/lint/            the subset gate: rules on sight, then the translator on every unit; advice.py, the rewrites
langs/py/translate/       Python -> Dafny: exact values, the world, faults, loops as measured helpers
langs/py/exec/            lane B: both sides in one process, recording stubs, typed inputs, four observations
langs/py/tests/           the pair runner and the pairs ported from langs/ts/tests/pairs
langs/py/subset.md        every construct: exact, transition, uninterpreted, or refused by rule
langs/py/SEMANTICS.md     what "equal" means for Python, and where it differs from TypeScript
langs/py/design/          the milestone 1 and milestone 2 design notes
```
