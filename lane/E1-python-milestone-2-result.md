# E1-python-milestone-2: the result

## What was done, and why

Python milestone 1 already had a lint and a lane B. What it lacked for the three verdicts the brief asks for: lint
findings that name the rewrite, a lane B record in the TypeScript shape, conformance checks that read lane B, and the
five pairs. Milestone 2 adds all four. It is whole: every "done when" item holds (numbers below).

1. **The lint names the rewrite.** `langs/py/lint/advice.py` maps every rule to a rewrite, labelled as the TypeScript
   lint labels them: `proved`, `conditional` (with its precondition) or `migration`. `lint.py --json` gives each
   finding its `unit`, source `text`, `label`, `precondition` and `advice`. `--agent` prints the TypeScript work list.
   The text output is unchanged, so its existing consumers are unaffected. The table cannot fall behind the rules:
   `tests/run.py` reads every rule name from the lint's and the translator's sources (73 of them) and fails on one
   without an entry. Every escape's finding must carry its rewrite. Red first: 43 escapes had no advice, and one rule
   (`assignment-expression`) had no entry.
2. **Five pairs** under `langs/py/tests/pairs/`. Each has must-prove and must-witness units, and lane B meets every
   one: `pure_function`, `raised_exception`, `dataclass_update`, `list_transform`, `dict_lookup`. The table is in
   `langs/py/design/milestone-2.md`.
3. **A structural fix found by the pairs.** `list_transform`'s `positives` (`x > 0` against `0 < x`) and `doubled`
   (`x * 2` against `x + x`) did not prove. The translator called a generic `PyFilter` and `PyMap` with two different
   lambdas, and nothing relates two lambdas under the recursion. Two changes fix it:
   - A filter is now one helper per element type, `PyFilter_<T>`, with its congruence lemma `PyFilter_<T>_same`.
     That is the vocabulary `spec/theorem.py` already states for two filters, in the TypeScript translator's form.
     An element type with a type parameter keeps the generic helper.
   - A map is now a Dafny sequence comprehension, `seq(|s|, i requires 0 <= i < |s| => (var x := s[i]; e))`, so two
     maps are equal by extensionality.

   Both are exact readings of the same Python and apply to every comprehension, not to these units. No other pair's
   verdict changed (292 of 292).
4. **Lane B's record is the TypeScript one** (`langs/py/exec/run.py`):
   - a witness has `input` (the index), `args`, `parent` and `candidate` (the whole observations) and `where.field`;
   - `bound` has `n`, `seed`, `ms` and how inputs were drawn;
   - `spec` has `params` and `returns`.

   It applies to every verdict, including WITNESS and ASK.
5. **A conformance pair kind** (`conformance/run.py`), not specific to any language. A `conformance.json` may list
   `pairs` with a `pair_translate` command (`{prelude}`, `{effectful}`) and an `exec` command. For each pair the
   runner:
   - lints both sides;
   - translates them with one shared prelude, the world units agreed from the `// EFFECTFUL:` headers;
   - generates and checks the theorem, and compares each lemma with `equal`;
   - runs lane B on each `b` unit and requires the verdict and the TypeScript record shape;
   - fails a proved lemma whose unit lane B witnesses.

   `langs/py/conformance.json` lists the five pairs. Red first: 15 lane B rows failed on the record shape alone.
6. **Docs.**
   - The README has a milestone table: 2 is marked done with what it covers; 3 is generators and async, inheritance
     and the exception hierarchy, float, the heap reading, dict order, `finally`, lane B programs, and the concept
     bench.
   - `subset.md` and `SEMANTICS.md` are at milestone 2.
   - There is a new design note, `langs/py/design/milestone-2.md`.

## Elements added

| Element | Why |
|---|---|
| `langs/py/lint/advice.py` (`ADVICE`, `advise`, `label_tag`) | the rewrite per rule, one source for `--json` and `--agent` |
| `lint.py`: `finding_rows`, `agent_report`, `--agent` | the finding names the unit, the line and the rewrite |
| `tests/run.py`: `rule_names`, `advice_coverage`, the "lint names the rewrite" row, `--escapes` | the table is complete by construction; the lint checks run without Dafny |
| `translate.py`: `filter_helper`, `has_tvar`, the map as `seq(...)` | rewritten comprehension elements and predicates prove |
| `exec/run.py`: the record fields `input`/`args`/`parent`/`candidate`/`where.field`, `bound.n/seed/ms`, `spec` | one reader for both languages |
| `conformance/run.py`: `record_shape`, `dafny_unit`, `pair_run`, `pairs` | the pair kind |
| `langs/py/conformance.json`: `pair_translate`, `exec`, `pairs` | the five pairs counted |
| five pairs, `langs/py/design/milestone-2.md`, README milestone table | the contract |

## Numbers (before at base 2a6c7bb62, after at the lane head)

| Command | Before | After |
|---|---|---|
| `python3 -I conformance/run.py` | PASS, 301 of 301 (py, ts, dfy) | PASS, 341 of 341 (py, ts, dfy) |
| `python3 -I conformance/run.py py`, after the pair kind landed (1d153bbd7, red) and then the record (18a91499d) | 70 of 85 | 85 of 85 |
| `python3 -I langs/py/tests/run.py` | 199 checks, ALL PASS | 292 checks, ALL PASS |
| `python3 -I langs/py/tests/run.py --escapes`, at the red commit 228c84675 and at 9836a38fe | 43 FAILED of 127 | ALL PASS, 127 |
| `python3 -I langs/py/tests/run.py list_transform`, before and after 1a9e0024d | `Equal_positives`, `Equal_doubled` not proved | proved, and lane B agrees |

No TypeScript pair or expectation was touched, and the TypeScript conformance rows are unchanged.

## Defects met

- **Dict order (pre-existing, not fixed; milestone 3).** The proof reads a dict as an unordered map. Lane B keeps
  insertion order, and a caller can see it with `list(d)`. So `def pair_of(x: int, y: int) -> dict[str, int]`
  returning `{"a": x, "b": y}` against `{"b": y, "a": x}` is proved by Dafny ("1 verified, 0 errors"), and lane B
  gives WITNESS on the first input. The `dict-order` rule refuses the unit's own order reads, not its caller's. The
  probe is in the text above; it was run outside the repository and is not committed as a pair. `SEMANTICS.md`
  ("Dicts") states the gap. The fix is milestone 3's reading of dict order, or a refusal of a dict whose order
  escapes the unit. I left that decision to the lead.
- **Lane B draws for crossed bounds.** `clamp` was witnessed only at a seeded draw (input 14): the boundary draws
  never make `lo > hi` together with `x` between them. The verdict is correct. Boundary values relating two
  parameters are a possible lane B improvement.

## What is left

Milestone 3 (README table). Nothing of milestone 2 is missing.

## Commits

228c84675 (red lint), 9836a38fe (lint rewrites), 1a9e0024d (pairs, comprehension readings), 1d153bbd7 (red conformance
pair kind), 18a91499d (lane B record), 95f7e6b26 (docs), and this file.
