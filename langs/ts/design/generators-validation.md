# Generator validation

Worktree: `/Users/assem/nexus/nexus-organisation/work/lean-lanes/generators`.
Baseline: unedited dev at `80728f8`, before the first source edit.
The first rebased validation used dev at `9cb4107`; the later head is recorded below.

## Pair commands and output

Both files: lint with `--no-project`; translate with `--core --suffix parent|candidate`
and separate `--prelude`; `dafny verify` on each; `spec/theorem.py` with all pair units
outside scope; `dafny verify --verification-time-limit 30` on the theorem.
Lane B: `--n 30 --no-project` per unit named in expect.json.

```text
/Users/assem/nexus/nexus-organisation/work/lean-lanes/generators/langs/ts/tests/pairs/generators/parent.ts: inside the subset
Dafny program verifier finished with 10 verified, 0 errors
/Users/assem/nexus/nexus-organisation/work/lean-lanes/generators/langs/ts/tests/pairs/generators/candidate.ts: inside the subset
Dafny program verifier finished with 10 verified, 0 errors
Dafny program verifier finished with 27 verified, 6 errors
Equal_changed: False (expected False)
Equal_consume: False (expected False)
Equal_two: True (expected True)
Equal_refactor: True (expected True)
Equal_composed: True (expected True)
Equal_composition: True (expected True)
Equal_counted: True (expected True)
Equal_collect_counted: True (expected True)
Equal_outside: False (expected False)
Equal_streamed: True (expected True)
Equal_interleave: True (expected True)
Equal_untouched: True (expected True)
Equal_producer_step: False (expected False)
Equal_deferred: False (expected False)
Equal_deferred_consumer: False (expected False)
Equal_first_value: True (expected True)
Equal_outside_sync: True (expected True)
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/generators/results-bench/b-consume.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/generators/results-bench/b-refactor.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/generators/results-bench/b-composition.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/generators/results-bench/b-collectCounted.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/generators/results-bench/b-outside.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/generators/results-bench/b-interleave.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/generators/results-bench/b-untouched.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/generators/results-bench/b-deferredConsumer.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/generators/results-bench/b-firstValue.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/generators/results-bench/b-outsideSync.json
Generator pair, both lane verdicts and escapes: ALL PASS
```

The six theorem errors are the six expected unequal units, not translator failures.
The installed prover also prints model-parsing diagnostics for failed lemmas; all
expected equal lemmas verify. Escape fixtures were checked through lint and translation. A separate tolerant
translation of generator_opaque_dependency.ts reports both producer and consume
as lintedOut with generator-effect, with translated: [] and failed: [].

## Concept bench

`python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py`
with `--lean /Users/assem/nexus/nexus-organisation/work/lean-lanes/generators`
and `--concepts "for await|generator|yield" --k 10`. Before used `--jobs 3`;
after used `--jobs 2`, while one pair validation process ran.

Before:

| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| for await | 10 | 0 | 0 | 0/0 | async (5), generator (4), this (1) |
| generator | 9 | 0 | 0 | 0/0 | unsupported-call (4), generator (3), param-mutation (1) |
| yield | 10 | 0 | 0 | 0/0 | generator (9), unsupported-call (1) |

After, on the rebased branch:

| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| for await | 10 | 1 | 1 | 3/3 | generator-effect (6), index-assign (1), closure-mutation (1) |
| generator | 9 | 0 | 0 | 0/0 | unsupported-call (4), generator (2), param-mutation (1) |
| yield | 10 | 0 | 0 | 0/0 | generator-effect (9), unsupported-call (1) |

The generator domain has only nine eligible sampled instances, not ten.
Witness counts are witnessed/planted mutants, not witnessed units.
The new sequence envelope does not fit the sampled reference-bearing producers.
Calls to still-refused same-file producers are refused even inside opaque consumers;
remediateAgents and buildOracleFromBackup therefore remain outside. The rebased
exception reading allows findBotByAppId to translate. No admitted bench unit fails
translation. The admission gain includes the rebased dev exception reading.
All three domains meet the no-admission-regression gate.

## Suite

Before rebase:

```text
| TOTAL | 591 checks | ALL PASS |
```

After rebase, `node langs/ts/tests/run.mjs`:

```text
| repo         | conformance/run.py ts        | runner                                   | PASS |             | conformance: PASS, 57 of 57 checks passed, languages: ts
| TOTAL | 742 checks | ALL PASS |
```

Full local logs are in `results-bench/pair-rebased.log`, `results-bench/rebased-bench.log`
and `results-bench/suite-rebased.log`. All six generator escape fixtures pass lint
refusal and translation refusal in the rebased suite.


## Rebase onto 0c4b2b0

Rebased once onto requested dev head `0c4b2b0`. Conflicts retain module-world
classification and opaque module fallback, Nullish-aware implicit returns, constructor
prefixes and exception handling, with generator collection added around those paths.

The fresh baseline is a `git archive 0c4b2b0` snapshot at
`/Users/assem/nexus/nexus-organisation/work/lean-lanes/generators/results-bench/baseline-0c4b2b0`.
Both runs use the same concept_bench.py command above, `--concepts "for await|generator|yield"`
and `--k 10 --jobs 3`; baseline --lean points to that snapshot, after --lean to this worktree.
Outputs are `results-bench/generators-0c4b2b0-before.{json,md}` and
`results-bench/generators-0c4b2b0-after.{json,md}`.

| domain | sample | lint before / after | translated before / after | mutants witnessed before / after |
|---|---|---|---|---|
| for await | 10 | 0 / 1 | 0 / 1 | 0/0 / 3/3 |
| generator | 9 | 0 / 0 | 0 / 0 | 0/0 / 0/0 |
| yield | 10 | 0 / 0 | 0 / 0 | 0/0 / 0/0 |

Admission is unchanged from the previous rebased lane and never below this fresh baseline.
Full suite command: `node langs/ts/tests/run.mjs`, run alone after both bench runs.
Output: `results-bench/suite-0c4b2b0.log`.

```text
| repo         | conformance/run.py ts        | runner                                   | PASS |             | conformance: PASS, 60 of 60 checks passed, languages: ts
| TOTAL | 830 checks | ALL PASS |
```

The suite ran once after the rebase. All generator, module_forms, null_undefined,
exception, type-test, spread, callback, React and constructor checks pass together.


## Rebase onto 7ed048b

Rebased once onto requested dev head `7ed048b`. Conflict resolutions preserve derived
loop bounds, switch/label control, operand evaluation order and label-state reset alongside
generator collection. A duplicate createHash import from the cleanly merged import region
was removed after node --check detected it.

A cross-reading probe exposed labelled continue in an async step loop:
`TypeError: ctx.jump is not a function`. Those loops now retain the opaque fallback,
including label completion. The generators pair adds unchanged `labelled` on both sides,
expected equal and lane B PASS-bounded. The targeted translation now verifies:

```text
Dafny program verifier finished with 0 verified, 0 errors
```

Fresh baseline: git archive of `7ed048b` under this worktree at
`results-bench/baseline-7ed048b`. Bench outputs are
`results-bench/generators-7ed048b-before.{json,md}` and
`results-bench/generators-7ed048b-after.{json,md}`, using the same three domains and k=10.
The final after run follows the labelled-continue fix. The full suite runs once after it.


| domain | sample | lint before / after | translated before / after | mutants witnessed before / after |
|---|---|---|---|---|
| for await | 10 | 0 / 1 | 0 / 1 | 0/0 / 3/3 |
| generator | 9 | 0 / 0 | 0 / 0 | 0/0 / 0/0 |
| yield | 10 | 0 / 0 | 0 / 0 | 0/0 / 0/0 |

`node langs/ts/tests/run.mjs`, once after the final source change, logged in
`results-bench/suite-7ed048b.log`:

```text
| pair         | generators                   | Equal_labelled proved                   | PASS |             | proved
| pair         | generators                   | lane B labelled PASS-bounded             | PASS |             | PASS-bounded
| repo         | conformance/run.py ts        | runner                                   | PASS |             | conformance: PASS, 69 of 69 checks passed, languages: ts
| TOTAL | 1017 checks | ALL PASS |
```
