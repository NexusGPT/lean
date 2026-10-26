# Object methods and getters: validation

Worktree: `/Users/assem/nexus/nexus-organisation/work/lean-lanes/object-methods-getters`. Baseline: `80728f8`, before the first edit.
Rebased onto dev `9cb4107`; conflicts retain both the type-test and exception readings.
Raw logs and generated proofs are in this worktree's ignored `results-bench` folder.

## Concept bench

Before and after used the same command, changing the output stem:
```sh
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean-lanes/object-methods-getters --concepts 'object literal with methods|getter/setter|assigns a field of this' --k 10 --jobs 3 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/object-methods-getters/results-bench/object-methods-before
```
The final after command ends in `object-methods-after`.

### Before

# Concept bench

3 concepts, K=10 real instances each (at most 3 per repo, units of at most 120 lines), lean at /Users/assem/nexus/nexus-organisation/work/lean-lanes/object-methods-getters

| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| object literal with methods | 10 | 0 | 0 | 0/0 | unsupported-syntax (10) |
| getter/setter | 7 | 0 | 0 | 0/0 | unsupported-syntax (3), async (1), opaque-mutation (1) |
| assigns a field of this | 10 | 8 | 7 | 20/20 | index-assign (1), spread (1), translate: fake_model_builder.ts:152: type parameter FakeBuil (1) |

### After

# Concept bench

3 concepts, K=10 real instances each (at most 3 per repo, units of at most 120 lines), lean at /Users/assem/nexus/nexus-organisation/work/lean-lanes/object-methods-getters

| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| object literal with methods | 10 | 5 | 3 | 6/9 | object-method-capture (2), object-method-mutation (1), unsupported-syntax (1) |
| getter/setter | 7 | 0 | 0 | 0/0 | closure-mutation (3), async (1), opaque-mutation (1) |
| assigns a field of this | 10 | 8 | 7 | 20/20 | index-assign (1), spread (1), translate: fake_model_builder.ts:152: type parameter FakeBuil (1) |

Witnessed units (as distinct from planted mutants):

| domain | before | after |
|---|---|---|
| object literal with methods | 0/10 | 2/10 |
| getter/setter | 0/7 | 0/7 |
| assigns a field of this | 7/10 | 7/10 |

The getter census has seven eligible units. The two newly lint-admitted method
units that do not translate hit the general type-nesting limit in `check.ts:39`
and `scripted.ts:8`. The remaining receiver-field translation failure is the
baseline type-parameter limitation in `fake_model_builder.ts:152`.

## Pair validation

Each pair's parent and candidate were linted with `--no-project`, translated with
`--core --suffix parent|candidate --no-project --out ... --prelude ...`, passed to
`spec/theorem.py` with every unit in scope, and verified with `dafny verify
--verification-time-limit 30`. Each execution entry used `exec/run.mjs --parent
... --candidate ... --unit <unit> --n 30 --no-project --out ...`.
The full suite repeats the same theorem and execution checks.

### object_methods

```text
/Users/assem/nexus/nexus-organisation/work/lean-lanes/object-methods-getters/langs/ts/tests/pairs/object_methods/parent.ts: inside the subset
/Users/assem/nexus/nexus-organisation/work/lean-lanes/object-methods-getters/langs/ts/tests/pairs/object_methods/candidate.ts: inside the subset
Dafny program verifier finished with 10 verified, 11 errors
Equal_strategy False PASS
Equal_strategy_refactor True PASS
Equal_changed_get_total False PASS
Equal_changed_read False PASS
Equal_inlined_get_total True PASS
Equal_inlined_read True PASS
Equal_counter_constructor True PASS
Equal_counter_bump False PASS
Equal_counter_refactor True PASS
Equal_record_refactor True PASS
Equal_writable_get_total True PASS
Equal_writable_set_total True PASS
Equal_writable_assign True PASS
Equal_untouched True PASS
Equal_getter_instance False PASS
Equal_effect_strategy False PASS
Equal_opaque_getter_get_bit False PASS
Equal_opaque_getter_read False PASS
Equal_literal_getter False PASS
Equal_effect_getter False PASS
Equal_sibling_capture False PASS
strategy WITNESS PASS
strategyRefactor PASS-bounded PASS
Changed.get_total WITNESS PASS
Changed.read WITNESS PASS
Inlined.read PASS-bounded PASS
Counter.bump WITNESS PASS
recordRefactor PASS-bounded PASS
Writable.set_total PASS-bounded PASS
Writable.assign PASS-bounded PASS
untouched PASS-bounded PASS
getterInstance WITNESS PASS
effectStrategy WITNESS PASS
OpaqueGetter.get_bit WITNESS PASS
OpaqueGetter.read WITNESS PASS
literalGetter WITNESS PASS
effectGetter WITNESS PASS
siblingCapture WITNESS PASS
```

### object_accessor_faults

```text
/Users/assem/nexus/nexus-organisation/work/lean-lanes/object-methods-getters/langs/ts/tests/pairs/object_accessor_faults/parent.ts: inside the subset
/Users/assem/nexus/nexus-organisation/work/lean-lanes/object-methods-getters/langs/ts/tests/pairs/object_accessor_faults/candidate.ts: inside the subset
Dafny program verifier finished with 10 verified, 3 errors
Equal_fault_get_value True PASS
Equal_fault_set_value True PASS
Equal_fault_read True PASS
Equal_fault_write True PASS
Equal_fault_caught True PASS
Equal_untouched True PASS
Equal_changed_fault_get_value False PASS
Equal_changed_fault_read False PASS
Equal_opaque_tagged False PASS
Equal_nested_tag True PASS
Fault.get_value PASS-bounded PASS
Fault.set_value PASS-bounded PASS
Fault.read PASS-bounded PASS
Fault.write PASS-bounded PASS
Fault.caught PASS-bounded PASS
untouched PASS-bounded PASS
ChangedFault.get_value WITNESS PASS
ChangedFault.read WITNESS PASS
opaqueTagged WITNESS PASS
nestedTag PASS-bounded PASS
```

The verifier errors above are the expected negative lemmas; their locations were
matched to each named lemma, rather than accepting an arbitrary verifier failure.
The nested-record execution refactor uses a fresh-instance wrapper, because the
fake receiver traces an extra whole-field setter on the explicit assignment.

## Rebase integration

Accessor reads and writes join exception dependency discovery and test the same
fault checkpoint as ordinary calls. The second pair proves that getter/setter
throws stop subsequent returns, reach catch, and retain changed thrown values.

Dev's tagged-union expansion hit a former opaque case at the type-depth limit.
Failed expansion now rolls back its type registries and retains the opaque union.
Narrowed union-valued record fields project their member before the next read.
The census unit `ClaudeTranscriptReplay.noteMainThreadReply` was translated and
its generated file verified separately:

```text
Dafny program verifier finished with 1 verified, 0 errors
```

An unrelated existing limitation surfaced during fixture design: anonymous record
names are keyed by field names alone, so different nested shapes with identical
field names can collide. The new literal-method datatype names include field types;
the general record-name scheme is unchanged in this lane.

## Suite

Before rebase:
```text
| TOTAL | 597 checks | ALL PASS |
```
Final rebased suite:
```text
| TOTAL | 769 checks | ALL PASS |
```
Conformance: PASS, 55 of 55 checks passed, languages: ts.

## Changed files at the first rebase

```text
 README.md                                          |  13 +-
 fixtures/escapes/ts/class_this.ts                  |   3 +-
 fixtures/escapes/ts/object_method_capture.ts       |   3 +
 fixtures/escapes/ts/object_method_mutation.ts      |   3 +
 fixtures/escapes/ts/object_method_receiver.ts      |   2 +
 fixtures/escapes/ts/receiver_handle_path.ts        |   3 +
 langs/ts/CONCEPT-PLAN.md                           |   4 +-
 langs/ts/COVERAGE.md                               |   8 +-
 langs/ts/common.mjs                                |  36 +++-
 .../ts/design/object-methods-getters-validation.md | 199 +++++++++++++++++++++
 langs/ts/design/object-methods-getters.md          |  74 ++++++++
 langs/ts/exec/run.mjs                              |  15 +-
 langs/ts/exec/spec.mjs                             |   2 +-
 langs/ts/lint/lint.mjs                             |  67 ++++++-
 langs/ts/subset.md                                 |   7 +-
 .../pairs/object_accessor_faults/candidate.ts      |  15 ++
 .../tests/pairs/object_accessor_faults/expect.json |  39 ++++
 .../tests/pairs/object_accessor_faults/parent.ts   |  15 ++
 langs/ts/tests/pairs/object_methods/candidate.ts   |  57 ++++++
 langs/ts/tests/pairs/object_methods/expect.json    |  68 +++++++
 langs/ts/tests/pairs/object_methods/parent.ts      |  57 ++++++
 langs/ts/translate/translate.mjs                   | 185 ++++++++++++++++---
 22 files changed, 824 insertions(+), 51 deletions(-)
```

## Revalidation on dev 0c4b2b0

Rebased once onto `0c4b2b0`, preserving module-world reads and fallbacks, Nullish
tags, exceptions, exact type tests, spread, callbacks, React and constructors.
Conflicts combined module-aware effect discovery with deferred literal methods,
and Nullish narrowing with projection of tagged-union record fields.

The baseline was exported with `git archive 0c4b2b0` into this worktree's
`results-bench/base-0c4b2b0` directory. Both runs used the same three concept
domains, `--k 10 --jobs 3`, and the harness command above. Raw outputs:
`object-methods-0c4b2b0-before.{json,md}` and
`object-methods-0c4b2b0-after.{json,md}` in `results-bench`.

### Head baseline

# Concept bench

3 concepts, K=10 real instances each (at most 3 per repo, units of at most 120 lines), lean at /Users/assem/nexus/nexus-organisation/work/lean-lanes/object-methods-getters/results-bench/base-0c4b2b0

| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| object literal with methods | 10 | 0 | 0 | 0/0 | unsupported-syntax (10) |
| getter/setter | 7 | 0 | 0 | 0/0 | unsupported-syntax (3), async (1), opaque-mutation (1) |
| assigns a field of this | 10 | 8 | 6 | 17/17 | index-assign (1), spread (1), translate: claude-transcript-replay.ts:162: type nesting too  (1) |

### Rebased lane

# Concept bench

3 concepts, K=10 real instances each (at most 3 per repo, units of at most 120 lines), lean at /Users/assem/nexus/nexus-organisation/work/lean-lanes/object-methods-getters

| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| object literal with methods | 10 | 5 | 3 | 6/9 | object-method-capture (2), object-method-mutation (1), unsupported-syntax (1) |
| getter/setter | 7 | 0 | 0 | 0/0 | closure-mutation (3), async (1), opaque-mutation (1) |
| assigns a field of this | 10 | 8 | 7 | 20/20 | index-assign (1), spread (1), translate: fake_model_builder.ts:152: type parameter FakeBuil (1) |

Witnessed units: methods 0/10 → 2/10; getters 0/7 → 0/7; receiver fields
6/10 → 7/10. Lint and translation admission do not fall in any domain.
Both focused pair validators passed again, including accessor faults and
sibling captures (`pair-head-0c4b2b0.log`, `faults-head-0c4b2b0.log`).

Full suite at this head (one run):
```text
| TOTAL | 857 checks | ALL PASS |
```
Conformance: PASS, 58 of 58 checks passed, languages: ts.
Raw suite output: `results-bench/suite-0c4b2b0.log`.


## Revalidation on dev 0922824

Rebased once onto `0922824`, preserving the merged operator-value and loop readings.
The union-expansion conflict keeps dev's complete rollback of Option/Nullish state.
The shared record-path helper retains world-field rebuilding. Assignment values
capture the receiver record before the right side and reuse it for the write;
setter assignment values call the setter unit. Prefix/postfix results keep their
old/new value distinction. Four additional pair units exercise these intersections.

Both focused validators passed. The object-method pair now has 25 lemmas:
```text
Dafny program verifier finished with 12 verified, 13 errors
Equal_counter_value False PASS
Equal_counter_value_refactor True PASS
Equal_writable_post False PASS
Equal_writable_value_refactor True PASS
Counter.value WITNESS PASS
Counter.valueRefactor PASS-bounded PASS
Writable.post WITNESS PASS
Writable.valueRefactor PASS-bounded PASS
object_methods pair: ALL PASS
```
All 13 failed lemmas are expected differences; all 21 lane B verdicts match.
The accessor-fault pair also passed its 10 lemmas and 10 lane B verdicts.
Raw logs are `results-bench/pair-head-0922824.log` and
`results-bench/faults-head-0922824.log`.

A fresh `git archive 0922824` snapshot inside this worktree supplied the baseline.
Both bench runs used the same three domains with `--k 10 --jobs 3`.

### Head baseline

# Concept bench

3 concepts, K=10 real instances each (at most 3 per repo, units of at most 120 lines), lean at /Users/assem/nexus/nexus-organisation/work/lean-lanes/object-methods-getters/results-bench/base-0922824

| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| object literal with methods | 10 | 0 | 0 | 0/0 | unsupported-syntax (10) |
| getter/setter | 7 | 0 | 0 | 0/0 | unsupported-syntax (3), async (1), opaque-mutation (1) |
| assigns a field of this | 10 | 8 | 7 | 20/20 | index-assign (1), spread (1), translate: fake_model_builder.ts:152: type parameter FakeBuil (1) |

### Rebased lane

# Concept bench

3 concepts, K=10 real instances each (at most 3 per repo, units of at most 120 lines), lean at /Users/assem/nexus/nexus-organisation/work/lean-lanes/object-methods-getters

| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| object literal with methods | 10 | 5 | 3 | 6/9 | object-method-capture (2), object-method-mutation (1), unsupported-syntax (1) |
| getter/setter | 7 | 0 | 0 | 0/0 | closure-mutation (3), async (1), opaque-mutation (1) |
| assigns a field of this | 10 | 8 | 7 | 20/20 | index-assign (1), spread (1), translate: fake_model_builder.ts:152: type parameter FakeBuil (1) |

Witnessed units: methods 0/10 → 2/10; getters 0/7 → 0/7; receiver fields
7/10 → 7/10. No domain loses lint or translation admission.
Raw results: `results-bench/object-methods-0922824-{before,after}.{json,md}`.

The `0922824` suite was stopped while running when `7ed048b` arrived; its
replacement final suite is recorded below. No TOTAL is claimed for the cancelled run.


## Revalidation on dev 7ed048b

Rebased once onto `7ed048b` after completing the `0922824` rebase. Kept all
numeric, bitwise, module, Nullish, exception, type-test, spread, callback, React,
constructor, loop and operator readings. The import conflict combines crypto
hashing with the method-literal and receiver-path helpers.

Numeric dependency discovery now explicitly includes getter reads and setter
writes. A setter that produces NaN makes its caller opaque before a later numeric
comparison can be simplified. Both focused pairs passed again:

```text
object_methods: 25 equality expectations and 21 lane B verdicts matched
Dafny program verifier finished with 13 verified, 13 errors
object_accessor_faults: 14 equality expectations and 14 lane B verdicts matched
Dafny program verifier finished with 10 verified, 7 errors
Equal_special_getter_get_value False PASS
Equal_special_getter_read False PASS
Equal_special_setter_set_value False PASS
Equal_special_setter_write False PASS
SpecialGetter.get_value WITNESS PASS
SpecialGetter.read WITNESS PASS
SpecialSetter.set_value WITNESS PASS
SpecialSetter.write WITNESS PASS
```
The errors are exactly the expected negative lemmas; the verifiers also count
one bitwise helper obligation and three accessor-fault helper obligations. Raw logs:
`results-bench/pair-head-7ed048b.log`, `results-bench/faults-head-7ed048b.log`.

A fresh `git archive 7ed048b` snapshot inside this worktree supplied the baseline.
Both bench runs used the same three domains with `--k 10 --jobs 3`.

### Head baseline

# Concept bench

3 concepts, K=10 real instances each (at most 3 per repo, units of at most 120 lines), lean at /Users/assem/nexus/nexus-organisation/work/lean-lanes/object-methods-getters/results-bench/base-7ed048b

| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| object literal with methods | 10 | 0 | 0 | 0/0 | unsupported-syntax (10) |
| getter/setter | 7 | 0 | 0 | 0/0 | unsupported-syntax (3), async (1), opaque-mutation (1) |
| assigns a field of this | 10 | 8 | 7 | 20/20 | index-assign (1), spread (1), translate: fake_model_builder.ts:152: type parameter FakeBuil (1) |

### Rebased lane

# Concept bench

3 concepts, K=10 real instances each (at most 3 per repo, units of at most 120 lines), lean at /Users/assem/nexus/nexus-organisation/work/lean-lanes/object-methods-getters

| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| object literal with methods | 10 | 5 | 3 | 6/9 | object-method-capture (2), object-method-mutation (1), unsupported-syntax (1) |
| getter/setter | 7 | 0 | 0 | 0/0 | closure-mutation (3), async (1), opaque-mutation (1) |
| assigns a field of this | 10 | 8 | 7 | 20/20 | index-assign (1), spread (1), translate: fake_model_builder.ts:152: type parameter FakeBuil (1) |

Witnessed units: methods 0/10 → 2/10; getters 0/7 → 0/7; receiver fields
7/10 → 7/10. No domain loses lint or translation admission.
Raw results: `results-bench/object-methods-7ed048b-{before,after}.{json,md}`.

The `7ed048b` suite was stopped during pair checks when `c951e8e` arrived.
No TOTAL is claimed for that cancelled run.


## Revalidation on dev c951e8e

Rebased once onto `c951e8e`, preserving all prior merged readings and the generator
lane's suspended-body handling, for-await effects, yield rules and protocol refusals.
The dependency key for a suspended program now explicitly includes both getter and
setter declarations of an accessed property. This preserves a setter edit even when
the TypeScript symbol's first declaration is the unchanged getter.

Both focused pairs passed again. The original pair has 25 expected equality
outcomes and 21 lane B verdicts. The accessor-fault pair now has 18 expected
equality outcomes and 17 lane B verdicts, including the generator intersection:
```text
Dafny program verifier finished with 13 verified, 10 errors
Equal_accessor_stream_get_total True PASS
Equal_accessor_stream_set_total False PASS
Equal_accessor_stream_values False PASS
Equal_stream_accessor False PASS
AccessorStream.get_total PASS-bounded PASS
AccessorStream.set_total WITNESS PASS
streamAccessor WITNESS PASS
object_methods pair: ALL PASS
```
The 10 errors are exactly the negative equality lemmas. Eight positive equality
lemmas and five helper obligations passed. Raw focused logs:
`results-bench/pair-head-c951e8e.log`, `results-bench/faults-head-c951e8e.log`.

A fresh `git archive c951e8e` snapshot inside this worktree supplied the baseline.
Both bench runs used the same three domains with `--k 10 --jobs 3`.

### Head baseline

# Concept bench

3 concepts, K=10 real instances each (at most 3 per repo, units of at most 120 lines), lean at /Users/assem/nexus/nexus-organisation/work/lean-lanes/object-methods-getters/results-bench/base-c951e8e

| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| object literal with methods | 10 | 0 | 0 | 0/0 | unsupported-syntax (9), iterator-protocol (1) |
| getter/setter | 7 | 0 | 0 | 0/0 | unsupported-syntax (3), async (1), opaque-mutation (1) |
| assigns a field of this | 10 | 8 | 7 | 20/20 | index-assign (1), spread (1), translate: fake_model_builder.ts:152: type parameter FakeBuil (1) |

### Rebased lane

# Concept bench

3 concepts, K=10 real instances each (at most 3 per repo, units of at most 120 lines), lean at /Users/assem/nexus/nexus-organisation/work/lean-lanes/object-methods-getters

| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| object literal with methods | 10 | 5 | 3 | 6/9 | object-method-capture (2), object-method-mutation (1), iterator-protocol (1) |
| getter/setter | 7 | 0 | 0 | 0/0 | closure-mutation (3), async (1), opaque-mutation (1) |
| assigns a field of this | 10 | 8 | 7 | 20/20 | index-assign (1), spread (1), translate: fake_model_builder.ts:152: type parameter FakeBuil (1) |

Witnessed units: methods 0/10 → 2/10; getters 0/7 → 0/7; receiver fields
7/10 → 7/10. No domain loses lint or translation admission.
Raw results: `results-bench/object-methods-c951e8e-{before,after}.{json,md}`.

The `c951e8e` suite was stopped during pair checks after the promise merge
arrived. No TOTAL is claimed for that cancelled run.


## Revalidation on dev 41f1e8b

Read the requested dev checkout's head: `41f1e8b8575195f90aef5db89fbf1582e7fbd634`.
Rebased once onto it, retaining all merged readings. The receiver-write lint
conflict keeps the promise lane's right-side checks and this lane's record-path
admission. Opaque handler keys now include accessed getter and setter program
identities; opaque promise-executor keys include same-file dependencies too.

The object-method pair passed 25 expected equality outcomes and 21 lane B verdicts.
The expanded accessor-fault pair passed 21 expected equality outcomes and 20
lane B verdicts, including exact and stored promise handlers:
```text
Dafny program verifier finished with 13 verified, 13 errors
Equal_promise_accessor_get_total False PASS
Equal_promise_accessor_exact False PASS
Equal_promise_accessor_stored False PASS
PromiseAccessor.get_total WITNESS PASS
PromiseAccessor.exact WITNESS PASS
PromiseAccessor.stored WITNESS PASS
object_methods pair: ALL PASS
```
The 13 errors are exactly the expected negative lemmas; eight positive equality
lemmas and five helper obligations passed. Both pair files lint inside the subset.
Raw logs: `results-bench/pair-head-41f1e8b.log`, `results-bench/faults-head-41f1e8b.log`.

A fresh `git archive 41f1e8b` snapshot inside this worktree supplied the baseline.
Both bench runs used the same three domains with `--k 10 --jobs 3`.

### Head baseline

# Concept bench

3 concepts, K=10 real instances each (at most 3 per repo, units of at most 120 lines), lean at /Users/assem/nexus/nexus-organisation/work/lean-lanes/object-methods-getters/results-bench/base-41f1e8b

| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| object literal with methods | 10 | 0 | 0 | 0/0 | unsupported-syntax (9), iterator-protocol (1) |
| getter/setter | 7 | 0 | 0 | 0/0 | unsupported-syntax (3), promise-pending (1), opaque-mutation (1) |
| assigns a field of this | 10 | 8 | 7 | 20/20 | index-assign (1), spread (1), translate: fake_model_builder.ts:152: type parameter FakeBuil (1) |

### Rebased lane

# Concept bench

3 concepts, K=10 real instances each (at most 3 per repo, units of at most 120 lines), lean at /Users/assem/nexus/nexus-organisation/work/lean-lanes/object-methods-getters

| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| object literal with methods | 10 | 5 | 3 | 6/9 | object-method-capture (2), object-method-mutation (1), iterator-protocol (1) |
| getter/setter | 7 | 0 | 0 | 0/0 | closure-mutation (3), promise-pending (1), opaque-mutation (1) |
| assigns a field of this | 10 | 8 | 7 | 20/20 | index-assign (1), spread (1), translate: fake_model_builder.ts:152: type parameter FakeBuil (1) |

Witnessed units: methods 0/10 → 2/10; getters 0/7 → 0/7; receiver fields
7/10 → 7/10. No domain loses lint or translation admission.
Raw results: `results-bench/object-methods-41f1e8b-{before,after}.{json,md}`.

Full suite on the final rebased head, one completed run:
```text
| TOTAL | 1205 checks | ALL PASS |
```
Conformance: PASS, 76 of 76 checks passed, languages: ts.
Raw suite output: `results-bench/suite-41f1e8b.log`.
