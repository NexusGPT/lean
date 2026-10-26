# Numbers reading validation

Baseline: 80728f8, measured before the first edit. The after run uses this lane before its required rebase.
All benchmark domains preserve or increase lint and translation admission.
W is units with at least one witnessed planted mutant; M is witnessed/planted mutants.
The harness had fewer than ten eligible samples in three domains.

| Domain | n | Before L/T/W | After L/T/W | Before M | After M |
|---|---:|---|---|---|---|
| bitwise | 10 | 0/0/0 | 5/5/5 | 0/0 | 14/15 |
| unary + coercion | 8 | 0/0/0 | 4/4/2 | 0/0 | 6/12 |
| Number.isNaN | 10 | 8/7/5 | 8/7/5 | 11/21 | 11/21 |
| Number.isFinite | 10 | 9/9/6 | 9/9/6 | 17/24 | 17/24 |
| Math.round | 10 | 8/7/7 | 8/8/8 | 18/20 | 20/23 |
| Math.ceil | 10 | 3/2/2 | 3/2/2 | 5/5 | 5/5 |
| Math.trunc | 9 | 6/6/4 | 6/6/4 | 9/15 | 9/15 |
| Math.abs | 10 | 5/3/3 | 6/5/5 | 5/9 | 10/15 |
| Math.min | 10 | 6/5/5 | 6/5/5 | 15/15 | 15/15 |
| Math.max | 10 | 6/5/4 | 6/6/5 | 12/14 | 13/17 |
| % modulo | 10 | 7/6/5 | 7/7/6 | 14/18 | 17/21 |
| / division | 10 | 8/6/5 | 8/8/7 | 13/17 | 18/22 |
| Number.parseInt | 10 | 8/8/4 | 9/9/5 | 11/24 | 14/27 |
| Number.parseFloat | 9 | 8/4/3 | 8/8/3 | 6/12 | 6/24 |

Commands (run with the absolute worktree as cwd):

```sh
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan --concepts 'bitwise|unary + coercion|Number.isNaN|Number.isFinite|Math.round|Math.ceil|Math.trunc|Math.abs|Math.min|Math.max|% modulo|/ division|Number.parseInt|Number.parseFloat' --k 10 --jobs 3 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/before
# Repeat with --out ending in /after.
```

Full receipts remain in the worktree under results-bench/before.{json,md,log} and after.{json,md,log}.

Helper execution:

```text
Dafny program verifier did not attempt verification

Dafny program verifier did not attempt verification
190 numeric execution checks and 6 distinct special-value renderings passed
```

These are concrete executions of generated Dafny via the Python backend, not symbolic proofs.
The real helper definitions also passed standalone verification: 8 verified, 0 errors.

Pair commands and results (all use --no-project):

```text
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/lint/lint.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/parent.ts --no-project
/Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/parent.ts: inside the subset
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/translate/translate.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/parent.ts --core --suffix parent --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/parent.dfy --prelude /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/parent.pre.dfy
$ dafny verify /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/parent.dfy
Dafny program verifier finished with 1 verified, 0 errors
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/lint/lint.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/candidate.ts --no-project
/Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/candidate.ts: inside the subset
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/translate/translate.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/candidate.ts --core --suffix candidate --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/candidate.dfy --prelude /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/candidate.pre.dfy
$ dafny verify /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/candidate.dfy
Dafny program verifier finished with 0 verified, 0 errors
$ python3 -I /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/spec/theorem.py --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/parent.dfy --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/candidate.dfy --scope /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/scope.json --edit /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/edit.json --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/theorem.dfy
$ dafny verify --verification-time-limit 30 /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/theorem.dfy
Dafny program verifier finished with 14 verified, 8 errors, 1 time out
Equal_flags: False
Equal_coerce: True
Equal_zero_guard: False
Equal_untouched: True
Equal_unsigned: True
Equal_negative_zero: False
Equal_infinity_sign: False
Equal_nan_test: False
Equal_boolean_number: True
Equal_numeric_identity: True
Equal_rounded: True
Equal_truncated: True
Equal_real_remainder: True
Equal_parse_prefix: True
Equal_string_number: True
Equal_divide: False
Equal_observe_divide: False
Equal_observe_module: False
Equal_parse_numeric: False
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/candidate.ts --unit flags --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/flags.json
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/candidate.ts --unit coerce --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/coerce.json
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/candidate.ts --unit zeroGuard --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/zeroGuard.json
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/candidate.ts --unit untouched --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/untouched.json
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/candidate.ts --unit unsigned --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/unsigned.json
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/candidate.ts --unit negativeZero --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/negativeZero.json
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/candidate.ts --unit infinitySign --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/infinitySign.json
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/candidate.ts --unit nanTest --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/nanTest.json
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/candidate.ts --unit booleanNumber --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/booleanNumber.json
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/candidate.ts --unit numericIdentity --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/numericIdentity.json
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/candidate.ts --unit rounded --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/rounded.json
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/candidate.ts --unit truncated --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/truncated.json
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/candidate.ts --unit realRemainder --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/realRemainder.json
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/candidate.ts --unit parsePrefix --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/parsePrefix.json
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/candidate.ts --unit stringNumber --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/stringNumber.json
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/candidate.ts --unit divide --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/divide.json
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/candidate.ts --unit observeDivide --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/observeDivide.json
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/candidate.ts --unit observeModule --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/observeModule.json
$ node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits/candidate.ts --unit parseNumeric --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/results-bench/pair/parseNumeric.json
PAIR ALL PASS
```

The expected non-proofs are eight failed equality postconditions and one flags timeout.
Every error was checked against an expected-false lemma span; there were no other verification errors.

| Unit | Lane B |
|---|---|
| flags | WITNESS |
| coerce | PASS-bounded |
| zeroGuard | WITNESS |
| untouched | PASS-bounded |
| unsigned | PASS-bounded |
| negativeZero | WITNESS |
| infinitySign | WITNESS |
| nanTest | WITNESS |
| booleanNumber | PASS-bounded |
| numericIdentity | PASS-bounded |
| rounded | PASS-bounded |
| truncated | PASS-bounded |
| realRemainder | PASS-bounded |
| parsePrefix | PASS-bounded |
| stringNumber | PASS-bounded |
| divide | WITNESS |
| observeDivide | WITNESS |
| observeModule | WITNESS |
| parseNumeric | WITNESS |

Full proof and execution output: results-bench/pair.log.

First full suite:

```text
| TOTAL | 599 checks | 1 FAILED |
```

The failure was the existing string literal `${-0.0}` assertion. The numeric scan
now preserves direct numeric literal template stringification, which the string
reader already computes exactly. Targeted rerun after that correction:

```text
Dafny program verifier finished with 73 verified, 0 errors

Dafny program verifier finished with 7 verified, 0 errors
```

Rebased onto dev at 9cb4107654d11732e09787f3247654d9f9a86c00.
The sole conflict joined adjacent Math and JSON coverage rows; both readings remain.
The merged source then ran the full suite alone:

```sh
node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/run.mjs
```

```text
| TOTAL | 748 checks | ALL PASS |
```

Full output: results-bench/suite-after.log. This includes all nineteen numeric pair
units, numeric execution probes, the corrected string assertions and the new escapes.

After rebase, the identical sampled units were rechecked with the harness translation
arguments (`--core --tolerant --only`, project resolution preserved), three jobs.
This checks lint/translation only; witness results remain the full before/after bench
above. The execution implementation did not change during rebase.

```text
bitwise baseline 0 0 after 5 5 rebased 5 5
unary + coercion baseline 0 0 after 4 4 rebased 4 4
Number.isNaN baseline 8 7 after 8 7 rebased 8 7
Number.isFinite baseline 9 9 after 9 9 rebased 9 9
Math.round baseline 8 7 after 8 8 rebased 8 8
Math.ceil baseline 3 2 after 3 2 rebased 3 2
Math.trunc baseline 6 6 after 6 6 rebased 6 6
Math.abs baseline 5 3 after 6 5 rebased 6 5
Math.min baseline 6 5 after 6 5 rebased 6 5
Math.max baseline 6 5 after 6 6 rebased 6 6
% modulo baseline 7 6 after 7 7 rebased 7 7
/ division baseline 8 6 after 8 8 rebased 8 8
Number.parseInt baseline 8 8 after 9 9 rebased 9 9
Number.parseFloat baseline 8 4 after 8 8 rebased 8 8
REBASED ADMISSION NONREGRESSION PASS
```

Recheck script and per-unit reports: results-bench/recheck-admission.py and
results-bench/admission-rebase/summary.json.

## Rebase onto 0c4b2b0

The module-world guard and numeric MAX_SAFE_INTEGER rule both remain. Coverage
keeps the merged JSON Null/Undef schema reading and the numeric Math reading.
Numeric opaque signatures now use the merged Nullish input type for nullable
defaults and optional parameters; module-reading numeric units use the complete
file as their opaque identity, preserving the module reading.

The new numbers_bits_rebase pair checks module state, nullable defaults, nullable
optional parameters, a changed null branch and an unchanged bitwise unit.

```text
/Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits_rebase/parent.ts: inside the subset
Dafny program verifier finished with 0 verified, 0 errors
/Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/pairs/numbers_bits_rebase/candidate.ts: inside the subset
Dafny program verifier finished with 0 verified, 0 errors
Dafny program verifier finished with 4 verified, 2 errors
Equal_module_number: False
Equal_nullable_default: True
Equal_nullable_optional: True
Equal_null_branch: False
Equal_untouched: True
PAIR ALL PASS
```

Generated signatures:

```dafny
function module_number_parent(wld: World): (World, real)
function nullable_default_parent(x_opt: Nullish<real>): real
function nullable_optional_parent(x: Nullish<real>): real
```

Lane B: moduleNumber and nullBranch WITNESS; nullableDefault, nullableOptional
and untouched PASS-bounded. Full receipt: results-bench/pair-rebase.log.

Full benchmark rerun after rebasing onto 0c4b2b0, with the identical fourteen
domains, `--k 10 --jobs 3`, output results-bench/after-0c4b2b0.{json,md,log}.
Original means before any numeric edits; prior lane means the previously reported
run, whose admission was also rechecked on 9cb4107. W counts units with a witness.

| Domain | n | Original L/T/W | Prior lane L/T/W | Rebased L/T/W | Prior mutants | Rebased mutants |
|---|---:|---|---|---|---|---|
| bitwise | 10 | 0/0/0 | 5/5/5 | 5/5/5 | 14/15 | 14/15 |
| unary + coercion | 8 | 0/0/0 | 4/4/2 | 4/4/2 | 6/12 | 6/12 |
| Number.isNaN | 10 | 8/7/5 | 8/7/5 | 8/8/6 | 11/21 | 13/24 |
| Number.isFinite | 10 | 9/9/6 | 9/9/6 | 9/9/6 | 17/24 | 17/24 |
| Math.round | 10 | 8/7/7 | 8/8/8 | 8/8/8 | 20/23 | 20/23 |
| Math.ceil | 10 | 3/2/2 | 3/2/2 | 4/3/3 | 5/5 | 8/8 |
| Math.trunc | 9 | 6/6/4 | 6/6/4 | 6/6/4 | 9/15 | 9/15 |
| Math.abs | 10 | 5/3/3 | 6/5/5 | 6/5/5 | 10/15 | 10/15 |
| Math.min | 10 | 6/5/5 | 6/5/5 | 7/7/6 | 15/15 | 16/21 |
| Math.max | 10 | 6/5/4 | 6/6/5 | 6/6/5 | 13/17 | 13/17 |
| % modulo | 10 | 7/6/5 | 7/7/6 | 7/7/6 | 17/21 | 17/21 |
| / division | 10 | 8/6/5 | 8/8/7 | 8/8/7 | 18/22 | 18/22 |
| Number.parseInt | 10 | 8/8/4 | 9/9/5 | 9/9/5 | 14/27 | 14/27 |
| Number.parseFloat | 9 | 8/4/3 | 8/8/3 | 8/8/3 | 6/24 | 6/24 |

ADMISSION NONREGRESSION PASS AGAINST BOTH BASELINES

Full suite, run once after the 0c4b2b0 rebase and benchmark:

```sh
node /Users/assem/nexus/nexus-organisation/work/lean-lanes/numbers-bitwise-nan/langs/ts/tests/run.mjs
```

```text
| TOTAL | 847 checks | ALL PASS |
```

Full receipt: results-bench/suite-0c4b2b0.log. The cross-feature pair, numeric pair,
string assertions, module forms, Nullish, exceptions, type tests, spread, callbacks,
React and constructor fixtures all passed in this run.

## Rebase onto operators and loop forms

Rebased onto 19106db, preserving operator-value handling, comma expressions and
operand capture alongside numeric unary and bitwise rules. Its in-progress suite
was terminated when the lead supplied 0922824; no successful total is claimed
for that superseded run. Rebased again onto 0922824. The sole loop rebase conflict
was the ranked coverage list, which now retains both loop and numeric readings.

The full suite was run once on 0922824 plus this lane:

```text
| TOTAL | 975 checks | ALL PASS |
```

Receipt: results-bench/suite-0922824.log. Numeric, module/Nullish, operator-value
and loop-form checks all passed together with the remaining suite.

Same-sample admission recheck on 0922824, three jobs, using the original
harness translation arguments and project resolution. Baseline is the original
pre-numeric run; after is the full 0c4b2b0 run; rebased is this head. Witness
measurements remain from the last full benchmark on 0c4b2b0 and were not rerun.

```text
bitwise baseline 0 0 after 5 5 rebased 5 5
unary + coercion baseline 0 0 after 4 4 rebased 4 4
Number.isNaN baseline 8 7 after 8 8 rebased 8 8
Number.isFinite baseline 9 9 after 9 9 rebased 9 9
Math.round baseline 8 7 after 8 8 rebased 8 8
Math.ceil baseline 3 2 after 4 3 rebased 4 3
Math.trunc baseline 6 6 after 6 6 rebased 7 7
Math.abs baseline 5 3 after 6 5 rebased 6 5
Math.min baseline 6 5 after 7 7 rebased 7 7
Math.max baseline 6 5 after 6 6 rebased 6 6
% modulo baseline 7 6 after 7 7 rebased 7 7
/ division baseline 8 6 after 8 8 rebased 8 8
Number.parseInt baseline 8 8 after 9 9 rebased 9 9
Number.parseFloat baseline 8 4 after 8 8 rebased 8 8
REBASED ADMISSION NONREGRESSION PASS
```

Receipts: results-bench/recheck-admission-0922824.py,
results-bench/admission-0922824/summary.json and results-bench/admission-0922824.log.
