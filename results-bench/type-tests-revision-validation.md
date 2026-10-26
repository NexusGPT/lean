# Assertion-derived type tests: revision validation

Revision of `abd7782a33fc4b695c5ab1c4ed82cef90af91819`. Worktree: `/Users/assem/nexus/nexus-organisation/work/lean-lanes/instanceof-exact`.

Assertions no longer cause `type-test-cast` refusal where the existing opaque conversion and test are available. Provenance follows local initializers, aliases, later writes, containers, mutators, destructuring, same-file arguments and returned values. An `as` or `<T>` assertion marks a value; `!` and `satisfies` alone do not. Provenance is conservative across control flow: it can make an otherwise exact test uninterpreted, never turn an uncertain test into a constant. Required-key/dictionary and optional-typeof shortcuts also respect provenance. Asserted literal fields are read instead of replaced with their declared tag.

The former cast escape fixtures are now admitted negative-control pair units. No assertion form in this reading needs a separate refusal; existing unsupported constructs retain their own lint rules.

For each side, commands from the worktree:

```sh
node langs/ts/lint/lint.mjs langs/ts/tests/pairs/type_tests/SIDE.ts --no-project
node langs/ts/translate/translate.mjs langs/ts/tests/pairs/type_tests/SIDE.ts --core --suffix SIDE --no-project --out results-bench/revision-work/SIDE.dfy --prelude results-bench/revision-work/SIDE.pre.dfy
dafny verify --verification-time-limit 30 results-bench/revision-work/SIDE.dfy
python3 -I spec/theorem.py --parent results-bench/revision-work/parent.dfy --candidate results-bench/revision-work/candidate.dfy --scope results-bench/revision-work/scope.json --edit results-bench/revision-work/edit.json --out results-bench/revision-work/theorem.dfy
dafny verify --verification-time-limit 30 results-bench/revision-work/theorem.dfy
```

Scope lists every pair unit with `in_scope: false`; edit is `{}`. Both files: `inside the subset`. Observed verifier output, parent / candidate / theorem:

```text
Dafny program verifier finished with 9 verified, 0 errors
Dafny program verifier finished with 7 verified, 0 errors
Dafny program verifier finished with 31 verified, 16 errors
```

All errors are expected negative-control Equal lemmas; no well-formedness failure. Every positive lemma proved. Z3 also printed model-parsing diagnostics for negative controls.

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
| Equal_asserted_instance | not proved |
| Equal_asserted_array | not proved |
| Equal_asserted_type | not proved |
| Equal_asserted_in | not proved |
| Equal_asserted_dictionary | not proved |
| Equal_asserted_optional | not proved |
| Equal_asserted_assignment | not proved |
| Equal_asserted_tag | not proved |
| Equal_asserted_container | not proved |
| Equal_asserted_destructure | not proved |
| Equal_non_null_exact | proved |
| Equal_asserted_refactor | proved |

Lane B per unit:

```sh
node langs/ts/exec/run.mjs --parent langs/ts/tests/pairs/type_tests/parent.ts --candidate langs/ts/tests/pairs/type_tests/candidate.ts --unit UNIT --n 30 --no-project --out results-bench/revision-work/b_UNIT.json
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
| assertedInstance | WITNESS |
| assertedArray | WITNESS |
| assertedType | WITNESS |
| assertedIn | WITNESS |
| assertedDictionary | WITNESS |
| assertedOptional | WITNESS |
| assertedAssignment | WITNESS |
| assertedTag | WITNESS |
| assertedContainer | WITNESS |
| assertedDestructure | WITNESS |
| nonNullExact | PASS-bounded |
| assertedRefactor | PASS-bounded |

The three remaining escapes (`instanceof_constructor`, `instanceof_constructor_value`, `instanceof_custom`) each exit 1 from lint and translation with `instanceof-constructor`.

Generated assertion test examples:

```dafny
function asserted_type_parent(x: Any): string { ext_typeof_int(ext_Any_as_int_Any(x)) }
function asserted_refactor_parent(x: Any): bool {
  var value_: seq<int> := ext_Any_as_seq_int_Any(x);
  ext_Array_isArray_seq_int(value_)
}
```

The positive `assertedRefactor` proves that `as` and angle-bracket assertions share the same uninterpreted reading. `nonNullExact` proves that a non-null assertion alone leaves the exact array test available.

A separate same-file provenance probe covers an asserted argument, an assertion returned by a helper, a property write, an array push, an asserted dictionary key, a destructured callee parameter and a non-null-only nominal value. It translates and verifies:

```text
Dafny program verifier finished with 1 verified, 0 errors
```

The destructured parameter remains uninterpreted:

```dafny
function destructured(arg0_: Rec_35303y): bool
{
  var value_ := arg0_.value_;
  ext_Array_isArray_seq_int(value_)
}
```

After extending argument provenance to destructured parameters, the original harness function `bench_instance(..., k_mut=0)` repeated lint and translation on the same 40 sampled units. Lane B code did not change.

```text
Final lint/translation gate: 40/40 benchmark statuses unchanged.
```

Validated source SHA-256 values:

```json
{
  "langs/ts/translate/translate.mjs": "4e07678b00f53a339c72b2ee6d2d53da8845818a6151b617d6d66ac31d62fc17",
  "langs/ts/lint/lint.mjs": "f051a0e2ad430a57b33ffd08572c0b82426ce3c81f0a97f87c6716ed9605495a"
}
```

The supplementary probe source is retained as `results-bench/type-tests-provenance.ts`; regenerate with `node langs/ts/translate/translate.mjs results-bench/type-tests-provenance.ts --core --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/instanceof-exact/results-bench/type-tests-provenance.dfy`, then `dafny verify /Users/assem/nexus/nexus-organisation/work/lean-lanes/instanceof-exact/results-bench/type-tests-provenance.dfy`.

The suite was run once for this revision, after the probes and benchmarks, with no concurrent lane-owned checks:

```sh
node /Users/assem/nexus/nexus-organisation/work/lean-lanes/instanceof-exact/langs/ts/tests/run.mjs
```

```text
| TOTAL | 373 checks | ALL PASS |
```

Full output: `results-bench/type-tests-revision-suite.log`.
