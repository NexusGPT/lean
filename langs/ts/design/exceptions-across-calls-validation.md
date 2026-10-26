# Exceptions across calls: validation

Historical validation for `0a6ac74`. The scoped revision and current acceptance results are in [exceptions-across-calls-revision-validation.md](exceptions-across-calls-revision-validation.md).

Worktree: `/Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls`.
Branch: `lane/exceptions-across-calls`. No push.

## Reading and choices

The outcome channel is stored in the returned world's concrete optional fault cell.
This keeps `(World, R)` and the existing mutation outputs while separating return from throw.
A checkpoint after every transition handles faults before evaluation continues, including return
and condition expressions. Outside method lookup precedes argument evaluation.
Finally has normal, return and throw continuations; cleanup can override saved completions.
The same-file call component of explicit exceptions and known failing library operations uses this reading.
JSON parse/stringify, URL/RegExp construction, BigInt conversion and URI codecs may fault as transitions.
Their world dependency is a conservative overapproximation of argument-only operations.

The reading is partial. `exception-loop`, `exception-callback`, `exception-expression`,
`exception-binding` and `exception-return` refuse completion cases not represented faithfully.
The broad call-component closure can also refuse a non-throwing helper that loops or takes callbacks.
Object-valued returns across finally stay refused because cleanup may mutate the returned alias.
Other implicit library exceptions and the existing numeric/heap axioms remain limits.

Lead choices: retain the world channel rather than introduce a new generic Result ABI; retain these
named refusals until loops, higher-order completions and alias lifetimes have their own readings.
The benchmark loses admission; this is not a claim of broader coverage. In the finally-only sample,
the surviving translated component contains its finally inside an opaque callback, not the new reading.
The new reading is directly evidenced by the dedicated pair and the inspected straight-line units.

## Baseline probe

```text
results-bench/exceptions/probe.ts: inside the subset
translate: probe.ts:3: a path ends without a return
```

The probe contained a top-level throwing helper, a caller returning that helper inside try/catch,
and a try/finally-only function. The old lint admitted all three. Source inspection showed
`ext_throw_R(e)` outside try and no fault checkpoint for a return expression.

## Stable concept bench

The original shared harness was run as requested. Final baseline: master `c9847d8`, jobs 1;
final after: this worktree, jobs 2 after the parent-filename mutant fix. Both use the crc32 sample.
The two final JSON reports contain identical `(root, file, unit)` triples for all 30 units.
Earlier unstable-sample and copied-harness experiments were discarded; they are not reported here.

Commands (absolute output directory lies inside this worktree):

```sh
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean --concepts 'throw|try/catch|try/finally only' --k 10 --jobs 1 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/before
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls --concepts 'throw|try/catch|try/finally only' --k 10 --jobs 2 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/after
```

Measured output:

```text
before | throw | lint 7/10 | translate 6/10 | witnessed units 6/10 | mutants 15/17
before | try/catch | lint 3/10 | translate 3/10 | witnessed units 3/10 | mutants 8/8
before | try/finally only | lint 7/10 | translate 4/10 | witnessed units 2/10 | mutants 5/9
after | throw | lint 3/10 | translate 3/10 | witnessed units 3/10 | mutants 8/8
after | try/catch | lint 2/10 | translate 2/10 | witnessed units 2/10 | mutants 5/5
after | try/finally only | lint 1/10 | translate 1/10 | witnessed units 1/10 | mutants 3/3
identical stable samples: all 30 units
```

## Pair and escapes

Both sides lint and verify independently. The theorem has nine proved equality lemmas and eight
intentionally unproved lemmas. Lane B has nine bounded passes and eight witnesses. Five escapes
exercise the five named exception boundaries. Dafny also emitted Z3 model-parser diagnostics on
countermodels; all expected failures were mapped to their equality lemmas, with no resolution errors.

Full command output follows.

```text
$ node langs/ts/lint/lint.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --no-project
/Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts: inside the subset

$ node langs/ts/lint/lint.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --no-project
/Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts: inside the subset

$ node langs/ts/lint/lint.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/ports.ts --no-project
/Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/ports.ts: inside the subset

$ node langs/ts/translate/translate.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --core --suffix parent --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/parent.dfy --prelude /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/parent.pre.dfy --effectful ignored
wrote /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/parent.dfy and /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/parent.pre.dfy

$ dafny verify /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/parent.dfy

Dafny program verifier finished with 0 verified, 0 errors

$ node langs/ts/translate/translate.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --core --suffix candidate --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/candidate.dfy --prelude /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/candidate.pre.dfy --effectful ignored
wrote /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/candidate.dfy and /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/candidate.pre.dfy

$ dafny verify /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/candidate.dfy

Dafny program verifier finished with 0 verified, 0 errors

$ python3 -I spec/theorem.py --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/parent.dfy --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/candidate.dfy --scope /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/scope.json --edit /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/edit.json --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/theorem.dfy
theorem: wrote /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/theorem.dfy (17 lemmas)

$ dafny verify --verification-time-limit 30 /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/theorem.dfy
Prover error: Model parsing error: Invalid model: invalid element name 0.0, at line 391 (  0.0)

Prover error: Could not parse any models

Prover error: Model parsing error: Invalid model: invalid element name 0.0, at line 444 (  0.0)

Prover error: Could not parse any models

Prover error: Model parsing error: Invalid model: invalid element name 0.0, at line 359 (  0.0)

Prover error: Could not parse any models

results-bench/exceptions/theorem.dfy(678,0): Error: a postcondition could not be proved on this return path
    |
678 | { // PROOF Equal_leaf
    | ^

results-bench/exceptions/theorem.dfy(677,30): Related location: this is the postcondition that could not be proved
    |
677 |   ensures leaf_parent(wld, x) == leaf_candidate(wld, x)
    |                               ^^

results-bench/exceptions/theorem.dfy(684,0): Error: a postcondition could not be proved on this return path
    |
684 | { // PROOF Equal_caller
    | ^

results-bench/exceptions/theorem.dfy(683,32): Related location: this is the postcondition that could not be proved
    |
683 |   ensures caller_parent(wld, x) == caller_candidate(wld, x)
    |                                 ^^

results-bench/exceptions/theorem.dfy(702,0): Error: a postcondition could not be proved on this return path
    |
702 | { // PROOF Equal_ignored
    | ^

results-bench/exceptions/theorem.dfy(701,33): Related location: this is the postcondition that could not be proved
    |
701 |   ensures ignored_parent(wld, x) == ignored_candidate(wld, x)
    |                                  ^^

Prover error: Model parsing error: Invalid model: invalid element name 0.0, at line 384 (  0.0)

Prover error: Could not parse any models

results-bench/exceptions/theorem.dfy(726,0): Error: a postcondition could not be proved on this return path
    |
726 | { // PROOF Equal_nested
    | ^

results-bench/exceptions/theorem.dfy(725,32): Related location: this is the postcondition that could not be proved
    |
725 |   ensures nested_parent(wld, x) == nested_candidate(wld, x)
    |                                 ^^

Prover error: Model parsing error: Invalid model: invalid element name 0.0, at line 480 (  0.0)

Prover error: Could not parse any models

results-bench/exceptions/theorem.dfy(738,0): Error: a postcondition could not be proved on this return path
    |
738 | { // PROOF Equal_finalizer_cleanup
    | ^

results-bench/exceptions/theorem.dfy(737,49): Related location: this is the postcondition that could not be proved
    |
737 |   ensures finalizer_cleanup_parent(wld, self, x) == finalizer_cleanup_candidate(wld, self, x)
    |                                                  ^^

Prover error: Model parsing error: Invalid model: invalid element name 0.0, at line 498 (  0.0)

Prover error: Could not parse any models

Prover error: Model parsing error: Invalid model: invalid element name 0.0, at line 420 (  0.0)

Prover error: Could not parse any models

Prover error: Model parsing error: Invalid model: invalid element name 0.0, at line 396 (  0.0)

Prover error: Could not parse any models

results-bench/exceptions/theorem.dfy(750,0): Error: a postcondition could not be proved on this return path
    |
750 | { // PROOF Equal_finalizer_order
    | ^

results-bench/exceptions/theorem.dfy(749,47): Related location: this is the postcondition that could not be proved
    |
749 |   ensures finalizer_order_parent(wld, self, x) == finalizer_order_candidate(wld, self, x)
    |                                                ^^

results-bench/exceptions/theorem.dfy(768,0): Error: a postcondition could not be proved on this return path
    |
768 | { // PROOF Equal_parse_text
    | ^

results-bench/exceptions/theorem.dfy(767,39): Related location: this is the postcondition that could not be proved
    |
767 |   ensures parse_text_parent(wld, text) == parse_text_candidate(wld, text)
    |                                        ^^

results-bench/exceptions/theorem.dfy(774,0): Error: a postcondition could not be proved on this return path
    |
774 | { // PROOF Equal_parse_caller
    | ^

results-bench/exceptions/theorem.dfy(773,41): Related location: this is the postcondition that could not be proved
    |
773 |   ensures parse_caller_parent(wld, text) == parse_caller_candidate(wld, text)
    |                                          ^^


Dafny program verifier finished with 10 verified, 8 errors

Equal_leaf: not proved (expected False)
Equal_caller: not proved (expected False)
Equal_stable: proved (expected True)
Equal_moved: proved (expected True)
Equal_ignored: not proved (expected False)
Equal_condition: proved (expected True)
Equal_override_return: proved (expected True)
Equal_override_fault: proved (expected True)
Equal_nested: not proved (expected False)
Equal_untouched: proved (expected True)
Equal_finalizer_cleanup: not proved (expected False)
Equal_finalizer_preserved: proved (expected True)
Equal_finalizer_order: not proved (expected False)
Equal_changed_output: proved (expected True)
Equal_observe_output: proved (expected True)
Equal_parse_text: not proved (expected False)
Equal_parse_caller: not proved (expected False)
$ node langs/ts/lint/lint.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/fixtures/escapes/ts/exceptions_across.ts --no-project
/Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/fixtures/escapes/ts/exceptions_across.ts:3:3  exception-loop  move the loop into a separate non-throwing unit; loop completions need a fault channel
1 violation(s)

$ node langs/ts/lint/lint.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/fixtures/escapes/ts/exceptions_binding.ts --no-project
/Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/fixtures/escapes/ts/exceptions_binding.ts:2:72  exception-binding  use distinct local names across try, catch and finally
1 violation(s)

$ node langs/ts/lint/lint.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/fixtures/escapes/ts/exceptions_callback.ts --no-project
/Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/fixtures/escapes/ts/exceptions_callback.ts:3:59  exception-callback  move this callback into a separate non-throwing unit; callbacks have no completion channel
1 violation(s)

$ node langs/ts/lint/lint.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/fixtures/escapes/ts/exceptions_expression.ts --no-project
/Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/fixtures/escapes/ts/exceptions_expression.ts:3:47  exception-expression  split the calls into statements and use if so each fault has an explicit continuation
1 violation(s)

$ node langs/ts/lint/lint.mjs /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/fixtures/escapes/ts/exceptions_return.ts --no-project
/Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/fixtures/escapes/ts/exceptions_return.ts:2:64  exception-return  return a primitive through finally; a returned object may be changed by cleanup through an alias
1 violation(s)

$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit leaf --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_leaf.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_leaf.json

leaf: WITNESS (expected WITNESS)
$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit caller --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_caller.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_caller.json

caller: WITNESS (expected WITNESS)
$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit stable --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_stable.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_stable.json

stable: PASS-bounded (expected PASS-bounded)
$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit moved --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_moved.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_moved.json

moved: PASS-bounded (expected PASS-bounded)
$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit ignored --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_ignored.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_ignored.json

ignored: WITNESS (expected WITNESS)
$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit condition --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_condition.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_condition.json

condition: PASS-bounded (expected PASS-bounded)
$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit overrideReturn --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_overrideReturn.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_overrideReturn.json

overrideReturn: PASS-bounded (expected PASS-bounded)
$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit overrideFault --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_overrideFault.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_overrideFault.json

overrideFault: PASS-bounded (expected PASS-bounded)
$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit nested --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_nested.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_nested.json

nested: WITNESS (expected WITNESS)
$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit untouched --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_untouched.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_untouched.json

untouched: PASS-bounded (expected PASS-bounded)
$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit Finalizer.cleanup --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_Finalizer.cleanup.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_Finalizer.cleanup.json

Finalizer.cleanup: WITNESS (expected WITNESS)
$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit Finalizer.preserved --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_Finalizer.preserved.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_Finalizer.preserved.json

Finalizer.preserved: PASS-bounded (expected PASS-bounded)
$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit Finalizer.order --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_Finalizer.order.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_Finalizer.order.json

Finalizer.order: WITNESS (expected WITNESS)
$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit changedOutput --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_changedOutput.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_changedOutput.json

changedOutput: PASS-bounded (expected PASS-bounded)
$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit observeOutput --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_observeOutput.json
PASS-bounded -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_observeOutput.json

observeOutput: PASS-bounded (expected PASS-bounded)
$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit parseText --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_parseText.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_parseText.json

parseText: WITNESS (expected WITNESS)
$ node langs/ts/exec/run.mjs --parent /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/parent.ts --candidate /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/langs/ts/tests/pairs/exceptions_across/candidate.ts --unit parseCaller --n 30 --no-project --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_parseCaller.json
WITNESS -> /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls/results-bench/exceptions/b_parseCaller.json

parseCaller: WITNESS (expected WITNESS)
```

## Whole suite

Command, run once after the probes and both final benches:

```sh
node langs/ts/tests/run.mjs
```

Measured output (new pair, escapes and total):

```text
| pair         | exceptions_across     | theorem generated                        | PASS |             | ok
| pair         | exceptions_across     | Equal_leaf not proved                    | PASS |             | not proved
| pair         | exceptions_across     | Equal_caller not proved                  | PASS |             | not proved
| pair         | exceptions_across     | Equal_stable proved                      | PASS |             | proved
| pair         | exceptions_across     | Equal_moved proved                       | PASS |             | proved
| pair         | exceptions_across     | Equal_ignored not proved                 | PASS |             | not proved
| pair         | exceptions_across     | Equal_condition proved                   | PASS |             | proved
| pair         | exceptions_across     | Equal_override_return proved             | PASS |             | proved
| pair         | exceptions_across     | Equal_override_fault proved              | PASS |             | proved
| pair         | exceptions_across     | Equal_nested not proved                  | PASS |             | not proved
| pair         | exceptions_across     | Equal_untouched proved                   | PASS |             | proved
| pair         | exceptions_across     | Equal_finalizer_cleanup not proved       | PASS |             | not proved
| pair         | exceptions_across     | Equal_finalizer_preserved proved         | PASS |             | proved
| pair         | exceptions_across     | Equal_finalizer_order not proved         | PASS |             | not proved
| pair         | exceptions_across     | Equal_changed_output proved              | PASS |             | proved
| pair         | exceptions_across     | Equal_observe_output proved              | PASS |             | proved
| pair         | exceptions_across     | Equal_parse_text not proved              | PASS |             | not proved
| pair         | exceptions_across     | Equal_parse_caller not proved            | PASS |             | not proved
| pair         | exceptions_across     | lane B leaf WITNESS                      | PASS |             | WITNESS
| pair         | exceptions_across     | lane B caller WITNESS                    | PASS |             | WITNESS
| pair         | exceptions_across     | lane B stable PASS-bounded               | PASS |             | PASS-bounded
| pair         | exceptions_across     | lane B moved PASS-bounded                | PASS |             | PASS-bounded
| pair         | exceptions_across     | lane B ignored WITNESS                   | PASS |             | WITNESS
| pair         | exceptions_across     | lane B condition PASS-bounded            | PASS |             | PASS-bounded
| pair         | exceptions_across     | lane B overrideReturn PASS-bounded       | PASS |             | PASS-bounded
| pair         | exceptions_across     | lane B overrideFault PASS-bounded        | PASS |             | PASS-bounded
| pair         | exceptions_across     | lane B nested WITNESS                    | PASS |             | WITNESS
| pair         | exceptions_across     | lane B untouched PASS-bounded            | PASS |             | PASS-bounded
| pair         | exceptions_across     | lane B Finalizer.cleanup WITNESS         | PASS |             | WITNESS
| pair         | exceptions_across     | lane B Finalizer.preserved PASS-bounded  | PASS |             | PASS-bounded
| pair         | exceptions_across     | lane B Finalizer.order WITNESS           | PASS |             | WITNESS
| pair         | exceptions_across     | lane B changedOutput PASS-bounded        | PASS |             | PASS-bounded
| pair         | exceptions_across     | lane B observeOutput PASS-bounded        | PASS |             | PASS-bounded
| pair         | exceptions_across     | lane B parseText WITNESS                 | PASS |             | WITNESS
| pair         | exceptions_across     | lane B parseCaller WITNESS               | PASS |             | WITNESS
| escape       | exceptions_across     | lint refuses                             | PASS | yes         | refused: exception-loop
| escape       | exceptions_across     | translate refuses                        | PASS |             | refused
| escape       | exceptions_binding    | lint refuses                             | PASS | no          | refused: exception-binding
| escape       | exceptions_binding    | translate refuses                        | PASS |             | refused
| escape       | exceptions_callback   | lint refuses                             | PASS | yes         | refused: exception-callback
| escape       | exceptions_callback   | translate refuses                        | PASS |             | refused
| escape       | exceptions_expression | lint refuses                             | PASS | yes         | refused: exception-expression
| escape       | exceptions_expression | translate refuses                        | PASS |             | refused
| escape       | exceptions_return     | lint refuses                             | PASS | no          | refused: exception-return
| escape       | exceptions_return     | translate refuses                        | PASS |             | refused
| TOTAL | 349 checks | ALL PASS |
```

## File deltas

The lane started at `5ebf1d8065a7f8455c95bac180a4149861e61617`.
Shared `dev` advanced independently to `7ae2b0f071cd9cb3eda15bb8fa71c72dc183c5b1`; the requested comparison therefore includes other lanes
as apparent removals. These are not changes made by this lane. No merge or branch movement was performed.
Both snapshots below were captured before appending this file-delta section.

Own staged changes, `git diff --cached --stat`:

```text
 fixtures/escapes/ts/exceptions_across.ts           |   5 +
 fixtures/escapes/ts/exceptions_binding.ts          |   2 +
 fixtures/escapes/ts/exceptions_callback.ts         |   3 +
 fixtures/escapes/ts/exceptions_expression.ts       |   3 +
 fixtures/escapes/ts/exceptions_return.ts           |   2 +
 langs/ts/CONCEPT-PLAN.md                           |   2 +-
 langs/ts/COVERAGE.md                               |  12 +-
 .../design/exceptions-across-calls-validation.md   | 382 +++++++++++++++++++
 langs/ts/design/exceptions-across-calls.md         |  76 ++++
 langs/ts/lint/lint.mjs                             |  76 +++-
 langs/ts/subset.md                                 |  35 +-
 .../ts/tests/pairs/exceptions_across/candidate.ts  |  61 +++
 langs/ts/tests/pairs/exceptions_across/expect.json |  60 +++
 langs/ts/tests/pairs/exceptions_across/parent.ts   |  62 ++++
 langs/ts/tests/pairs/exceptions_across/ports.ts    |   1 +
 langs/ts/translate/translate.mjs                   | 152 +++++++-
 results-bench/exceptions/after.json                | 366 ++++++++++++++++++
 results-bench/exceptions/after.md                  |   9 +
 results-bench/exceptions/before.json               | 407 +++++++++++++++++++++
 results-bench/exceptions/before.md                 |   9 +
 20 files changed, 1693 insertions(+), 32 deletions(-)
```

Requested `git diff --stat dev`:

```text
 README.md                                          |  55 +--
 fixtures/escapes/ts/exceptions_across.ts           |   5 +
 fixtures/escapes/ts/exceptions_binding.ts          |   2 +
 fixtures/escapes/ts/exceptions_callback.ts         |   3 +
 fixtures/escapes/ts/exceptions_expression.ts       |   3 +
 fixtures/escapes/ts/exceptions_return.ts           |   2 +
 fixtures/escapes/ts/super_field.ts                 |   8 -
 langs/ts/CONCEPT-PLAN.md                           |   6 +-
 langs/ts/COVERAGE.md                               |  26 +-
 langs/ts/common.mjs                                |   8 +-
 .../design/exceptions-across-calls-validation.md   | 382 +++++++++++++++++++
 langs/ts/design/exceptions-across-calls.md         |  76 ++++
 langs/ts/design/heap-layer-census.json             | 271 --------------
 langs/ts/design/heap-layer-census.mjs              | 161 --------
 langs/ts/design/heap-layer-toy.dfy                 |  87 -----
 langs/ts/design/heap-layer-toy.mjs                 |  62 ----
 langs/ts/design/heap-layer.md                      | 200 ----------
 langs/ts/exec/run.mjs                              |   5 -
 langs/ts/lint/lint.mjs                             |  79 +++-
 langs/ts/subset.md                                 |  41 ++-
 langs/ts/tests/pairs/class_new/candidate.ts        |  59 ---
 langs/ts/tests/pairs/class_new/expect.json         |  33 --
 langs/ts/tests/pairs/class_new/parent.ts           |  58 ---
 langs/ts/tests/pairs/class_super/base.ts           |   6 -
 langs/ts/tests/pairs/class_super/candidate.ts      |  22 --
 langs/ts/tests/pairs/class_super/expect.json       |  20 -
 langs/ts/tests/pairs/class_super/parent.ts         |  22 --
 langs/ts/tests/pairs/counter/expect.json           |  22 +-
 .../ts/tests/pairs/exceptions_across/candidate.ts  |  61 +++
 langs/ts/tests/pairs/exceptions_across/expect.json |  60 +++
 langs/ts/tests/pairs/exceptions_across/parent.ts   |  62 ++++
 langs/ts/tests/pairs/exceptions_across/ports.ts    |   1 +
 langs/ts/tests/pairs/for_each/expect.json          |   6 +-
 langs/ts/tests/pairs/function_values/expect.json   |   6 +-
 langs/ts/tests/pairs/logic_values/expect.json      |  28 +-
 langs/ts/tests/pairs/promise_forms/expect.json     |  25 +-
 langs/ts/tests/pairs/service/expect.json           |   6 +-
 langs/ts/tests/pairs/try_catch/expect.json         |   6 +-
 langs/ts/translate/translate.mjs                   | 257 +++++++------
 results-bench/exceptions/after.json                | 366 ++++++++++++++++++
 results-bench/exceptions/after.md                  |   9 +
 results-bench/exceptions/before.json               | 407 +++++++++++++++++++++
 results-bench/exceptions/before.md                 |   9 +
 43 files changed, 1741 insertions(+), 1292 deletions(-)
```
