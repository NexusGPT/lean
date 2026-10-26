# Exact type tests: validation

Baseline: `5ebf1d8065a7f8455c95bac180a4149861e61617`, exported with `git archive HEAD` into the assigned worktree for the baseline bench.

Worktree: `/Users/assem/nexus/nexus-organisation/work/lean-lanes/instanceof-exact`.

Commands run from that worktree:

```sh
node langs/ts/lint/lint.mjs langs/ts/tests/pairs/type_tests/parent.ts --no-project
node langs/ts/lint/lint.mjs langs/ts/tests/pairs/type_tests/candidate.ts --no-project
node langs/ts/translate/translate.mjs langs/ts/tests/pairs/type_tests/parent.ts --core --suffix parent --no-project --out results-bench/parent.dfy --prelude results-bench/parent.pre.dfy
node langs/ts/translate/translate.mjs langs/ts/tests/pairs/type_tests/candidate.ts --core --suffix candidate --no-project --out results-bench/candidate.dfy --prelude results-bench/candidate.pre.dfy
dafny verify --verification-time-limit 30 results-bench/parent.dfy
dafny verify --verification-time-limit 30 results-bench/candidate.dfy
python3 -I spec/theorem.py --parent results-bench/parent.dfy --candidate results-bench/candidate.dfy --scope results-bench/scope.json --edit results-bench/edit.json --out results-bench/theorem.dfy
dafny verify --verification-time-limit 30 results-bench/theorem.dfy
```

The scope lists every expect.json unit with `in_scope: false`; edit.json is `{}`.

Observed output:

```text
/Users/assem/nexus/nexus-organisation/work/lean-lanes/instanceof-exact/langs/ts/tests/pairs/type_tests/parent.ts: inside the subset
Dafny program verifier finished with 9 verified, 0 errors
/Users/assem/nexus/nexus-organisation/work/lean-lanes/instanceof-exact/langs/ts/tests/pairs/type_tests/candidate.ts: inside the subset
Dafny program verifier finished with 7 verified, 0 errors
theorem: wrote /Users/assem/nexus/nexus-organisation/work/lean-lanes/instanceof-exact/results-bench/theorem.dfy (19 lemmas)
Dafny program verifier finished with 29 verified, 6 errors
```

The six errors are the six expected negative controls, all at their Equal lemmas. No function well-formedness obligation failed. Z3 also printed model-parsing diagnostics on negative controls; these do not change the verified/error counts.

| lemma | observed |
|---|---|
| Equal_class_change | not proved |
| Equal_refactor | proved |
| Equal_wrap | not proved |
| Equal_tag_read | proved |
| Equal_type_read | proved |
| Equal_has_key | proved |
| Equal_absent | proved |
| Equal_untouched | proved |
| Equal_unknown_test | proved |
| Equal_structural | not proved |
| Equal_base_test | proved |
| Equal_subclass_test | not proved |
| Equal_open_key | not proved |
| Equal_truth | proved |
| Equal_null_tag | proved |
| Equal_optional_array | proved |
| Equal_optional_tag | proved |
| Equal_required_key | proved |
| Equal_ambiguous_array | not proved |

Lane B command per TypeScript unit:

```sh
node langs/ts/exec/run.mjs --parent langs/ts/tests/pairs/type_tests/parent.ts --candidate langs/ts/tests/pairs/type_tests/candidate.ts --unit UNIT --n 30 --no-project --out results-bench/b_UNIT.json
```

| unit | observed |
|---|---|
| classChange | WITNESS |
| refactor | PASS-bounded |
| wrap | WITNESS |
| tagRead | PASS-bounded |
| typeRead | PASS-bounded |
| hasKey | PASS-bounded |
| absent | PASS-bounded |
| untouched | PASS-bounded |
| unknownTest | PASS-bounded |
| structural | WITNESS |
| baseTest | PASS-bounded |
| subclassTest | PASS-bounded |
| openKey | PASS-bounded |
| truth | PASS-bounded |
| nullTag | PASS-bounded |
| optionalArray | PASS-bounded |
| optionalTag | PASS-bounded |
| requiredKey | PASS-bounded |
| ambiguousArray | WITNESS |

Each escape was run through lint and translate --core --no-project; both exited 1:

| escape | observed rule |
|---|---|
| instanceof_constructor.ts | instanceof-constructor |
| instanceof_custom.ts | instanceof-constructor |
| instanceof_constructor_value.ts | instanceof-constructor |
| type_test_cast.ts | type-test-cast |
| type_test_array_cast.ts | type-test-cast |

Additional standalone probes: optional records/arrays, optional typeof, construction of union records: `3 verified, 0 errors`. Private #field, subclass unions against Base, symbol/object/never: `0 verified, 0 errors` (constant/bodiless expressions produce no verification obligations). The existing logic_values/kind pair: `PASS-proved`.

A direct sandbox probe supplies real class instances and a valid record with an extra key, beyond the generated inputs:

```text
parent openKey(extra key)= true classChange(new A)= 1 classChange(new B)= 2 baseTest(new Derived)= true subclassTest(new Derived)= true
candidate openKey(extra key)= false classChange(new A)= 2 classChange(new B)= 1 baseTest(new Derived)= true subclassTest(new Derived)= false
```

This confirms why a public structural class and an undeclared key cannot be simplified from the static shape, and why Base does not imply Derived. The normal lane B generator still omits class prototypes and extra undeclared keys.

An optional opaque union of an array and a structural record retains an uninterpreted array test unless every present member has the same decided result. `ambiguousArray` is a negative control for accidentally choosing only the first member.

The inherited membership-hook probe imports a class with `static [Symbol.hasInstance]`, extends it with a private field, and tests a Derived value against Derived. Final lint output:

```text
hook-inherited.ts:3:65 instanceof-constructor a custom Symbol.hasInstance may run effects; use an ordinary constructor
1 violation(s)
```

After the imported-base refusal was tightened, the original harness's `bench_instance(..., k_mut=0)` reran lint and translation on all sampled units. This supplementary gate repeated no mutations:

```text
Final lint/translation gate: 40/40 benchmark statuses unchanged.
```

The whole suite was run once, alone after the probes and benchmarks:

```sh
node /Users/assem/nexus/nexus-organisation/work/lean-lanes/instanceof-exact/langs/ts/tests/run.mjs
```

```text
| TOTAL | 353 checks | ALL PASS |
```

The complete suite output is in `type-tests-suite.log`; concept samples and counts are in `type-tests-benchmark.md`.
