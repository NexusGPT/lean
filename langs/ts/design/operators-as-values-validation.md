# Operators as values validation

Worktree: `/Users/assem/nexus/nexus-organisation/work/lean-lanes/operators-as-values`. Baseline: `80728f8`, before the first source edit.

Commands run from that worktree:
```text
node langs/ts/lint/lint.mjs langs/ts/tests/pairs/operators_values/parent.ts --no-project
node langs/ts/lint/lint.mjs langs/ts/tests/pairs/operators_values/candidate.ts --no-project
node langs/ts/translate/translate.mjs <side.ts> --core --no-project --suffix <side> --prelude <side.pre.dfy> --out <side.dfy>
python3 -I spec/theorem.py --parent <parent.dfy> --candidate <candidate.dfy> --scope <scope.json> --edit <edit.json> --out <theorem.dfy>
dafny verify --verification-time-limit 30 <theorem.dfy>
node langs/ts/exec/run.mjs --parent <parent.ts> --candidate <candidate.ts> --unit <unit> --n 30 --no-project --out <unit.json>
```

Captured pair output (the three failed lemmas are the requested negative checks):
```text
/Users/assem/nexus/nexus-organisation/work/lean-lanes/operators-as-values/langs/ts/tests/pairs/operators_values/parent.ts: inside the subset
/Users/assem/nexus/nexus-organisation/work/lean-lanes/operators-as-values/langs/ts/tests/pairs/operators_values/candidate.ts: inside the subset
theorem: wrote /Users/assem/nexus/nexus-organisation/work/lean-lanes/operators-as-values/results-bench/theorem.dfy (28 lemmas)
Dafny program verifier finished with 43 verified, 3 errors
Equal_temporary_names: proved
Equal_cursor: not proved
Equal_indexed: proved
Equal_arithmetic: proved
Equal_order: not proved
Equal_chained: proved
Equal_compound: proved
Equal_sequence: proved
Equal_path: proved
Equal_arguments_in_order: proved
Equal_assigned_test: proved
Equal_counter_reset: proved
Equal_counter_take: not proved
Equal_untouched: proved
Equal_optional_assigned: proved
Equal_counter_prefix: proved
Equal_counter_compound: proved
Equal_local_postfix: proved
Equal_mixed_truth: proved
Equal_assigned_ternary: proved
Equal_receiver_value: proved
Equal_awaited_receiver: proved
Equal_module_postfix: proved
Equal_assigned_absence: proved
Equal_assigned_truth: proved
Equal_assigned_coalesce: proved
Equal_assigned_nullable: proved
Equal_assigned_null: proved
temporaryNames: PASS-bounded (expected PASS-bounded)
cursor: WITNESS (expected WITNESS)
indexed: PASS-bounded (expected PASS-bounded)
arithmetic: PASS-bounded (expected PASS-bounded)
order: WITNESS (expected WITNESS)
chained: PASS-bounded (expected PASS-bounded)
compound: PASS-bounded (expected PASS-bounded)
sequence: PASS-bounded (expected PASS-bounded)
path: PASS-bounded (expected PASS-bounded)
argumentsInOrder: PASS-bounded (expected PASS-bounded)
assignedTest: PASS-bounded (expected PASS-bounded)
Counter.reset: PASS-bounded (expected PASS-bounded)
Counter.take: WITNESS (expected WITNESS)
untouched: PASS-bounded (expected PASS-bounded)
optionalAssigned: PASS-bounded (expected PASS-bounded)
Counter.prefix: PASS-bounded (expected PASS-bounded)
Counter.compound: PASS-bounded (expected PASS-bounded)
localPostfix: PASS-bounded (expected PASS-bounded)
mixedTruth: PASS-bounded (expected PASS-bounded)
assignedTernary: PASS-bounded (expected PASS-bounded)
Receiver.value: PASS-bounded (expected PASS-bounded)
awaitedReceiver: PASS-bounded (expected PASS-bounded)
modulePostfix: PASS-bounded (expected PASS-bounded)
assignedAbsence: PASS-bounded (expected PASS-bounded)
assignedTruth: PASS-bounded (expected PASS-bounded)
assignedCoalesce: PASS-bounded (expected PASS-bounded)
assignedNullable: PASS-bounded (expected PASS-bounded)
assignedNull: PASS-bounded (expected PASS-bounded)
PAIR VALIDATION: ALL PASS
```

Escape lint output:
```text
operator_value_context.ts: operator-value-context; 1 violation(s)
operator_value_optional.ts: operator-value-context; 1 violation(s)
operator_value_reference.ts: operator-value-context; 1 violation(s)
operator_value_logical.ts: assignment-expression; 1 violation(s)
operator_value_constructor.ts: operator-value-context; 1 violation(s)
operator_value_tag.ts: operator-value-context; 1 violation(s)
```

Concept bench command (baseline used jobs 3 and operators-before; final used jobs 2):
```text
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean-lanes/operators-as-values --concepts "++ as a value|assignment as a value|comma operator" --k 10 --jobs 2 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/operators-as-values/results-bench/operators-final
```

The comma domain has seven eligible samples, not ten. Witness units count units with at least one witnessed mutant.

| domain | n | before lint / translate / witness units | after lint / translate / witness units | after mutants witnessed |
|---|---:|---|---|---|
| ++ as a value | 10 | 0 / 0 / 0 | 4 / 4 / 2 | 5/10 |
| assignment as a value | 10 | 0 / 0 / 0 | 5 / 5 / 5 | 12/14 |
| comma operator | 7 | 0 / 0 / 0 | 2 / 2 / 1 | 3/3 |

Raw bench scorecard output:
```text
| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| ++ as a value | 10 | 0 | 0 | 0/0 | update-expression (6), callback-form (1), record-rest (1) |
| assignment as a value | 10 | 0 | 0 | 0/0 | assignment-expression (7), async (2), unsupported-syntax (1) |
| comma operator | 7 | 0 | 0 | 0/0 | comma (5), loop-form (1), ts-strict (1) |
| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| ++ as a value | 10 | 4 | 4 | 5/10 | operator-value-context (2), callback-form (1), record-rest (1) |
| assignment as a value | 10 | 5 | 5 | 12/14 | async (2), assignment-expression (2), unsupported-syntax (1) |
| comma operator | 7 | 2 | 2 | 3/3 | operator-value-context (3), loop-form (1), ts-strict (1) |
```

After the module-forms rebase, all four lint-admitted increment samples translate.
The two witnessed increment units are `jsonRpc` and `bid`; `fid` has a lane B import.meta.glob loading failure and `main` yields no witnessed mutant.

Full suite before rebase:
```text
node langs/ts/tests/run.mjs
| TOTAL | 596 checks | ALL PASS |
```

Rebase and final targeted validation:
```text
git -C "/Users/assem/nexus/nexus-organisation/work/lean-lanes/operators-as-values" rebase dev
Successfully rebased and updated refs/heads/lane/operators-as-values.
```

Rebased onto `9cb4107`. The lint conflict retains dev's instanceof constructor checks
and this lane's comma reading. Captured truthiness uses dev's union tags.
The cursor candidate stops on zero as well as null; its guard keeps narrowed reads conditional.
At that rebase the bench retained its prior counts; the final scorecard above includes module-forms integration.

Fresh-name regression, before the fix:
```text
Equal_temporary_names: not proved
```
After excluding source names from the value temporary namespace:
```text
Equal_temporary_names: proved
PAIR VALIDATION: ALL PASS
```

The first rebased suite passed before adding that regression:
```text
| TOTAL | 749 checks | ALL PASS |
```

The freshness fix passed the full suite:
```text
| TOTAL | 751 checks | ALL PASS |
```
The call reader also snapshots receivers for calls reached directly through await.
`Equal_awaited_receiver` proves its explicit-receiver refactor; lane B is PASS-bounded.
Constructor/tag callee updates remain named refusals, covered by separate escapes.

Module-forms rebase onto `1ece2b2` keeps the module container-mutator statement reading
and routes module assignment/update values through module get/set transitions.
`Equal_module_postfix` proves; lane B is PASS-bounded. Its refactor stores `old + 1`
to preserve the single get/set sequence (using `+=` would introduce a second get).
The final bench is at or above baseline lint and translation in every domain.

Full-suite output after the module-forms rebase, before null-undefined:
```text
node langs/ts/tests/run.mjs
| TOTAL | 798 checks | ALL PASS |
```

Direct baseline/final JSON comparison:
```text
++ as a value: admission nonregression PASS; lint 0 -> 4; translate 0 -> 4
assignment as a value: admission nonregression PASS; lint 0 -> 5; translate 0 -> 5
comma operator: admission nonregression PASS; lint 0 -> 2; translate 0 -> 2
```

Final rebase onto `0c4b2b0` preserves the null/undefined lane's source-type-aware
conversions and keeps conditional snapshots inside their branch. Assignments store
absence tags; captured truthiness handles both Option and Nullish. The five new
absence-tag pair units all prove and return PASS-bounded.

Proof limitation observed after this rebase: the explicit if-ladder variant of
`optionalAssigned` gives ASK automatically. The same generated transition proves
with explicit cases (`dafny verify results-bench/optional-assert.dfy`):
```text
Dafny program verifier finished with 3 verified, 0 errors
```
The committed pair uses the equivalent explicit temporary followed by `??`,
which proves automatically and still checks assignment-result capture and
conditional outside calls. No axiom or theorem change was made.

Final full-suite output on `0c4b2b0`:
```text
node langs/ts/tests/run.mjs
conformance: PASS, 60 of 60 checks passed, languages: ts
| TOTAL | 859 checks | ALL PASS |
```
