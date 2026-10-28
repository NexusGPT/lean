# Strings validation

Worktree: `/Users/assem/nexus/nexus-organisation/work/lean-lanes/strings`. Branch: `lane/strings`.
Dafny: `4.11.0`, default Unicode scalars, with no unicode-char override.
All commands below ran with this worktree as their working directory. No push.

## Helper probes

Generation and verification:

```sh
node /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/langs/ts/translate/translate.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/langs/ts/tests/strings/probe.ts --core --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/results-bench/helpers.dfy
cat /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/langs/ts/tests/strings/assertions.dfy >> /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/results-bench/helpers.dfy
dafny verify --verification-time-limit 30 /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/results-bench/helpers.dfy
```

Last line:

```text
Dafny program verifier finished with 73 verified, 0 errors
```

The committed `langs/ts/tests/strings/run.mjs` generates this probe from the actual
translator and also generates/verifies the real-number probe. It checks that explicit
String on unknown and template conversion retain separate external functions (symbols
distinguish those operations). The suite invokes this runner.

```sh
node /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/langs/ts/tests/strings/run.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/results-bench/helpers.dfy
dafny verify --verification-time-limit 30 /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/results-bench/helpers.real.dfy
```

The runner's real-number verification command has last line:

```text
Dafny program verifier finished with 7 verified, 0 errors
```

The assertions cover every new helper and the existing string-array Join helper:
ECMAScript whitespace inclusion/exclusion, ASCII and non-ASCII guards, search misses,
positions and empty patterns, empty input and separator, trailing split fields,
repeated/truncated/empty padding, first/all replacements, all replacement dollar tokens,
non-overlapping matches, empty-pattern boundaries, prefix and lexicographic ordering,
BMP indexing, substring swapping, charAt versus at, fractional truncation, literal
number formatting and boolean conversion. Intermediate equalities are proved assertions;
there are no assumptions or verification bypasses. The split lemma isolates assertions
to bound solver work. Its fuel attributes only control unfolding.

## Pair, theorem and lane B

For each side in parent, candidate:

```sh
node /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/langs/ts/lint/lint.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/langs/ts/tests/pairs/strings/<side>.ts --no-project
node /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/langs/ts/translate/translate.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/langs/ts/tests/pairs/strings/<side>.ts --core --suffix <side> --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/results-bench/pair/<side>.dfy --prelude /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/results-bench/pair/<side>.pre.dfy
```

Both lint results: `inside the subset`. Both translations: `wrote` the named files.
The scope lists every unit with `in_scope: false`; edit is `{}`.

```sh
python3 -I /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/spec/theorem.py --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/results-bench/pair/parent.dfy --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/results-bench/pair/candidate.dfy --scope /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/results-bench/pair/scope.json --edit /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/results-bench/pair/edit.json --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/results-bench/pair/theorem.dfy
dafny verify --verification-time-limit 30 /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/results-bench/pair/theorem.dfy
```

```text
Dafny program verifier finished with 23 verified, 6 errors
```

All errors are the six expected unequal lemmas, not helpers or function bodies.

| unit | equality lemma | lane B |
|---|---|---|
| slug | not proved | WITNESS |
| padded | proved | PASS-bounded |
| maximum | not proved | WITNESS |
| untouched | proved | PASS-bounded |
| unicodeCase | not proved | WITNESS |
| splitLimit | not proved | WITNESS |
| substitution | not proved | WITNESS |
| unicodeLiteral | not proved | WITNESS |
| searchTerm | proved | PASS-bounded |
| searchPosition | proved | PASS-bounded |
| argumentOrder | proved | PASS-bounded |

The proved padStart/manual-loop refactor uses target width 1; helper assertions also
check multi-character padding repeated and truncated to larger targets. ArgumentOrder
checks that an effectful search term runs before an effectful position argument.

For every TypeScript unit in that table:

```sh
node /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/langs/ts/tests/pairs/strings/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/langs/ts/tests/pairs/strings/candidate.ts --unit <unit> --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/results-bench/pair/b_<unit>.json
```

The per-unit verdicts are copied in the table. The validation script checks every
lemma's error span, rejects errors outside lemmas, and checks every lane B verdict.
Its last line is `PAIR VALIDATION PASS` in `/Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/results-bench/pair-validation.log`.
Both `string_code_unit.ts` and `string_surrogate.ts` escapes exit 1 with
`string-code-unit`; the suite also checks translation refusal.

## Concept bench

The final runs use the harness with stable crc32 sampling and parent-file/process-specific
mutant names. Baseline is an untouched `git archive dev` exported inside this worktree;
it is not another checkout. Baseline dev snapshot: `7ae2b0f071cd9cb3eda15bb8fa71c72dc183c5b1` (runtime file hashes checked). The final sample identities were compared from both JSON
files: `template string same sample: True`; `< > comparison same sample: True`.

```sh
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/results-bench/baseline --concepts 'template string|< > comparison' --k 10 --jobs 1 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/results-bench/strings-before
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings --concepts 'template string|< > comparison' --k 10 --jobs 2 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/results-bench/strings
```

| domain | phase | lint / 10 | translate / 10 | units with witness / 10 | witnessed mutants |
|---|---|---|---|---|---|
| template string | before | 6 | 6 | 6 | 17/17 |
| < > comparison | before | 8 | 6 | 5 | 14/18 |
| template string | after | 6 | 6 | 6 | 17/17 |
| < > comparison | after | 8 | 6 | 5 | 14/18 |

There is no string-method domain in concepts.mjs. These existing domains are broad:
comparison includes numeric comparisons, and method precision can improve without
changing translation reach. No reach improvement is claimed from this sample.

## Whole suite

Run once, after probes and bench, with no other validation job in this lane:

```sh
node /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/langs/ts/tests/run.mjs > /Users/assem/nexus/nexus-organisation/work/lean-lanes/strings/results-bench/suite.log 2>&1
```

```text
| TOTAL | 332 checks | ALL PASS |
```

Conformance within that run: `conformance: PASS, 24 of 24 checks passed, languages: ts`.
The suite includes the helper runner, every equality and lane B expectation of the
strings pair, and lint/translation refusal for both new escapes.

## Model choice and remaining scope

The approved choice is Dafny scalar strings with the BMP-only model axiom, avoiding a
repository-wide string representation migration. External inputs are assumed to meet
that envelope. The paper must state this qualification. Full UTF-16 remains open.
ASCII case is guarded symbolically; the guard is statically decidable for ASCII literals
or discharged by the verifier for strings proven ASCII. Otherwise both guarded branches
remain, with the non-ASCII branch uninterpreted. There is no extra case-conversion axiom.
Locale collation, Unicode normalization, general split/regex/callback replacements and
nonliteral numeric formatting remain uninterpreted, not refused. Mixed string/non-string
ordering retains `string-order`; out-of-envelope literal fragments use `string-code-unit`.


## Integration provenance

The lane began at `5ebf1d8`; dev advanced during the task. The benchmark baseline was
exported from then-current dev `7ae2b0f`, whose translator is the same as `c9847d8`.
Thus the baseline also contains preceding class readings, as permitted by the lead's
baseline instruction. Both measured samples have unchanged scores; no gain is attributed
to this lane from those scores. The suite result is for this lane's committed reading.

At finish, `git diff --stat dev` includes upstream changes absent from this older lane,
not deletions made by this commit. The commit itself touches only the strings files and
localized shared-file sections listed by `git show --stat HEAD`. The full raw dev
comparison is saved locally at `results-bench/strings-vs-dev.stat` for integration.
