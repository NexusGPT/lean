# Python, milestone 2: the design note

## The construct

A Python function gets the three verdicts a TypeScript function gets, each read by `conformance/run.py` the same way
for both languages: the lint, the proof (lane A) and the bounded run (lane B).

## The lint

A function is inside the subset when every construct in it has a reading: the lint's rules on sight, then the
translator on every unit (milestone 1). Milestone 2 makes each finding say what to write instead. `lint/advice.py`
maps every rule to a rewrite with the TypeScript label: `proved`, `conditional` (with its precondition) or
`migration`. `lint.py --json` gives each finding its unit (the innermost unit whose lines hold it), its source line, the
label, the precondition and the rewrite; `--agent` prints the TypeScript `--agent` work list. The text form is
unchanged (`file:line:col  rule  message`), so every consumer of it reads the same lines.

The table cannot fall behind the rules: `tests/run.py` reads every rule name from the lint's and the translator's
sources (the second argument of `fail`, `Unsupported` and `v`, and the first string of a `(rule, message)` pair) and
fails when one has no entry. Every escape's finding must carry its rewrite.

## Lane B

The record is the TypeScript lane B's, so one reader serves both languages: `verdict`, `unit`; a witness has `input`
(the index), `args` (as drawn), `parent` and `candidate` (the whole observations), `where.field` (the first of
outcome, state, trace, pending that differs); `bound` has `n`, `seed`, `ms` and how inputs are drawn; `spec` has the
parameters and the return type. Inputs, fakes and observations are milestone 1's.

## Conformance: the pair kind

`conformance.json` may list `pairs`, with a `pair_translate` command (`{prelude}`, `{effectful}`) and an `exec`
command (`{parent}`, `{candidate}`, `{unit}`, `{out}`). For each pair `conformance/run.py` lints both sides,
translates them with one shared prelude (the units that take the world agreed from the `// EFFECTFUL:` headers),
generates the theorem with every unit of `scope` outside S, and checks it; each `equal` row must come out (true: proved;
false or `"witness"`: not proved); lane B must give each `b` verdict in the TypeScript record shape; and no proved
lemma may have a WITNESS on its unit (the unit's Dafny name by the rule every language shares). Nothing in it is
Python's: a language that lists no pairs runs as before.

## The comprehension readings

Two of the five pairs did not prove at first: a comprehension whose element or predicate is rewritten (`x * 2`
against `x + x`, `x > 0` against `0 < x`). The milestone 1 translation called a generic `PyFilter` and `PyMap` with
two different lambdas, and the prover does not unfold a lambda under the recursion. Now:

- a filter is one helper per element type, `PyFilter_<T>`, with its congruence lemma `PyFilter_<T>_same` (two
  predicates that agree on every element keep the same elements): the vocabulary `spec/theorem.py` already states for
  two filters of one sequence, in the form the TypeScript translator writes its filter helpers. An element type with a type parameter
  keeps the generic `PyFilter` (its type is open, the lemma cannot be stated);
- a map is a Dafny sequence comprehension, `seq(|s|, i requires 0 <= i < |s| => (var x := s[i]; e))`: two maps whose
  elements agree are one sequence by extensionality, with no lemma.

Both are exact readings of the same Python; they change no verdict outside the comprehension.

## The five pairs

| Pair | Units | Must prove | Must witness |
|---|---|---|---|
| `pure_function` | `abs_diff`, `clamp`, `midpoint` | `abs_diff` (abs against a branch), `midpoint` (floor division rewritten) | `clamp` (min/max against branches: differ when the bounds cross) |
| `raised_exception` | `safe_ratio`, `checked_at`, `parse_or` | `checked_at` (the range check as a chain), `parse_or` (the handler kept) | `safe_ratio` (ValueError becomes ZeroDivisionError) |
| `dataclass_update` | `deposit`, `charge_fee`, `same_owner` | `deposit` (`replace` against construction), `same_owner` (`==` mirrored) | `charge_fee` (`>` becomes `>=`) |
| `list_transform` | `positives`, `doubled`, `tail_sum` | `positives`, `doubled` (the comprehension readings above) | `tail_sum` (a slice clamps, an index faults on an empty list) |
| `dict_lookup` | `count_of`, `next_count`, `has_positive` | `count_of`, `has_positive` (`get` with a default against membership) | `next_count` (a missing key raises KeyError) |

## A gap found, left for milestone 3

A dict the unit returns carries an insertion order its caller can observe, and the proof reads a dict as a map
without order: `{"a": x, "b": y}` against `{"b": y, "a": x}` is proved, and lane B witnesses the order on the first
input. `SEMANTICS.md` ("Dicts") states it; the reading of dict order is milestone 3's.
