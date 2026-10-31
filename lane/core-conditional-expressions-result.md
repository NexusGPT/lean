# core-conditional-expressions: result

Base: lean `b5c074508` (lead-b5c07450). Branch `lane/core-conditional-expressions`.

## What was read, and why

The specification, `langs/ts/design/heap-stage5.md` section 3, was already implemented in the heap core
(`translate/heap.mjs`: the condition, then the selected operand only, its allocations and marks inside its arm);
`heap5_conditional` is green at the base. Probing the section's own forms (a ternary in a return, nested, as an
argument, with allocations and narrowed optional reads) found every one already in the core. What still stopped a
conditional expression was outside the heap core: the lint's `conditional-effect` refused a same-file call that
changes its argument inside an operand (`on ? record(t, s) : 0`), because the value reading (`translate.mjs`) bound
the new argument value inside the branch expression only, so the name read after the conditional held the old value.
The finding sits in the lowering every unit of a file reads, so the translator refused the whole file, heap-core units
included.

The reading added is section 3's own mechanism carried to the value reading's names: as the heap core threads its
world through the arm taken, each arm now returns its value, the world when an operand has transitions, and every name
a same-file call in either operand rebinds. One mechanism, no unit, file or repository named.

## Elements added, each and why

- `translate.mjs` `rebound`: while an operand is translated, the names a same-file call rebinds there (the arguments
  it changes), keyed by their declarations; saved and reset with the other per-unit state when a held variant is
  emitted mid-translation.
- `unitCall`: records each rebound name in `rebound` where it already emitted `var b := tNm0;`.
- `operandParts`: an operand's hoisted lines apart, with its rebound names; a nested operand's names join the
  enclosing operand's (a nested conditional rebinds them there too).
- `nameDecl`: the declaration a rebound argument name stands for, so a name declared inside the conditional (a
  callback's local, out of scope after it) is not carried (the choice where the section is silent; written in 3a).
- `carried`: `var (wld?, t, b, ..) := if c then (lines; (wld?, a, b, ..)) else (lines; (wld?, b', b, ..));`.
- `expressionValue` `ConditionalExpression`: the three existing paths (world effect, operator-value context, plain)
  translate the operands through `operandParts`; with no rebound name each emits byte for byte the text it emitted
  before (the plain path replays the lines where they were hoisted), with one it takes `carried`.
- `lint.mjs` `conditionalEffect`: a conditional's operand no longer counts as a branch; a short-circuit right operand
  still does (another construct's reading; left to its lane).
- `readings.mjs` `logic-values`: the exception condition, the runtime assumption and the refusal text say the same.
- Docs: `heap-stage5.md` section 3a (dated), `COVERAGE.md` two rows, `subset.md` `conditional-effect` row,
  `SEMANTICS.md` paragraph on conditional branches.

## The pair

`langs/ts/tests/pairs/conditional_expressions/` (red at the base: `theorem generated` FAIL, the parent does not
translate; the red re-checked on the final pair against the base translator and lint). Two groups with their own
callees, so the strict heap graph does not mix them:

- heap core on both sides (`record` writes through an input `Tally`): `note` (ternary in a return, proved), `route`
  (nested, proved), `doubled` (as an argument, proved), `stray` (nested, planted), `skewed` (as an argument, planted).
- value reading on both sides (the candidate assigns in an `if` without a return, which the heap core does not read;
  `bump` changes a local counter, so the identity guard keeps the lemma): `tally` (proved), `ladder` (nested ternary
  as an argument, proved), `leak` (planted).
- `plain`, `record`, `wrap`, `bump`, `twice`: untouched, proved.
- lane B: PASS-bounded on every equal unit, WITNESS on `stray`, `skewed`, `leak`.
- The planted rows are `false` in lane A, not `witness`: the doubles reading does not encode a write through a record
  (`not encoded: a write outside the unit's locals`), so it has no counterexample to replay; lane B witnesses them.

`JOBS=2 node langs/ts/tests/run.mjs --pair conditional_expressions`: 23 checks, ALL PASS.

## Regression (each `JOBS=2 node langs/ts/tests/run.mjs --pair <p>`, at dc756c97a)

| pair | checks | result |
| --- | ---: | --- |
| heap5_conditional | 9 | ALL PASS |
| jsx_conditional | 3 | ALL PASS |
| nested_ternary | 7 | ALL PASS |
| logic_values | 12 | ALL PASS |
| mixed_logic_values | 40 | ALL PASS |
| receiver_write | 13 | ALL PASS |
| branch_types | 14 | ALL PASS |
| heap_canonical | 13 | ALL PASS |
| type_tests | 59 | ALL PASS |
| copied_argument | 10 | ALL PASS |

## Census

Command, per root: `NODE_OPTIONS=--max-old-space-size=12288 node <tree>/langs/ts/census.mjs /root/da/census/repos/<root>
--out <root>-<side>.json`, where `before` is the base `b5c074508` exported by `git archive` to
`/root/lanes/core-conditional-expressions/base`, `after` is this branch. Comparison: `census.mjs --diff`, and
`/root/lanes/core-conditional-expressions/moved.py` (each unit holding a `conditional-effect` finding before: its
first finding before and after). n8n before and after ran one after the other; langchainjs and nexus ran before and after
side by side, one root at a time (the machine held a dozen nexus censuses of other lanes).

| root | files | units before / after | entered before -> after | units with `conditional-effect` before -> after | first stop changed |
| --- | ---: | ---: | ---: | ---: | ---: |
| n8n (complete) | 7,812 | 9,610 / 9,610 | 2,680 -> 2,680 | 4 -> 0 | 0 |
| langchainjs (complete) | 2,972 | 6,709 / 6,709 | 2,766 -> 2,766 | 2 -> 0 | 0 |
| nexus (partial: the 15 chunks both runs had finished at 03:25) | 14,912 | 25,401 / 25,401 | 13,653 -> 13,653 | 1 -> 1 | 0 |

`census.mjs --diff` on n8n and langchainjs: every reading's admitted and refused counts equal, 0 gains, 0 losses
(`/root/lanes/core-conditional-expressions/census/{n8n,langchainjs}-diff.txt`). The nexus row is read from the two
runs' journals over the chunks both had finished (`/root/lanes/core-conditional-expressions/journal.py nexus`, which
gives the n8n and langchainjs rows above equal to their complete summaries); both nexus runs were still going, about
half the root left.

The units the construct stopped, each with its first stop (census order) before -> after:
- n8n `NodeCreator/utils.ts groupItemsInSections`: alias-mutation -> alias-mutation
- n8n `Code/utils.ts standardizeOutput`: prototype -> prototype
- n8n `Notion/shared/GenericFunctions.ts simplifyObjects`: type-assertion -> type-assertion
- n8n `workflow/src/utils.ts jsonStringify`: type-assertion -> type-assertion
- langchainjs `tracers/base.ts BaseTracer.getRunById`: type-assertion -> type-assertion
- langchainjs `zod-to-json-schema/parseDef.ts parseDef`: reference-equality -> reference-equality
- nexus `workflow-batch.service.ts WorkflowBatchService.executeBatch`: definite-assignment -> definite-assignment;
  its `conditional-effect` stays, rightly: the call is the right operand of `??` (line 500), a short-circuit operand.

None moved to entered: in every unit a finding earlier in the census order stops it, so the counted gain is zero on
these roots. The reading's gain is in the files it no longer refuses whole: before it, a file holding one such unit
failed to translate, the heap-core units included (the pair's red); in these roots no unit was stopped only by it.

## Defects met, outside this construct (reported, not fixed)

- The identity guard withholds the lemma of any caller of a same-file callee that writes through an input when the
  unit is read by the value reading (`identity shape unreadable ...; exposed by: write through an input in a same-file
  callee`), with or without a conditional; such units prove only in the heap core.
- The heap core does not read an `if` branch without a return (`let n = 0; if (c) n = f(x);`), and its strict graph
  takes every caller and callee of such a unit out with it.
- The doubles reading does not encode a write through a record, so a changed unit of that kind has no doubles witness.
- A short-circuit right operand (`on && change(xs)`, `||`, `??`) keeps `conditional-effect`: the same carry would read
  it; it belongs to the logic operators' lane.

## Commits

- 358656dab pair conditional_expressions (red)
- 938a54a5c pair: one-word unit names (the scope names the Dafny functions)
- 4e0c03105 pair (red, final): two groups, heap core and value reading
- dc756c97a the reading (translate.mjs, lint.mjs, readings.mjs, subset.md, SEMANTICS.md)
- 7b33e827f heap-stage5.md section 3a, COVERAGE.md
- this result file

The pair's 23-check run was made on the reading's translate.mjs and lint.mjs before the readings.mjs text edit of the
same commit; with the nexus census running I did not run the pair again. Instead, at HEAD, the translator's output for
both sides is byte-identical to that state's (apart from the `include` line naming the output file), and the lint reads
the parent inside the subset. The regression pairs ran at dc756c97a.

## What is left

- nexus: the census before and after still running (detached runner pid 2436931, census pids 2589900 and 2589902,
  outputs `/root/lanes/core-conditional-expressions/census/nexus-{before,after}.json`); the row above is partial.
- The short-circuit right operand (`&&`, `||`, `??`) with a changing call: the same `carried` form would read it; it is
  the logic operators' construct, left to its lane (nexus `executeBatch` is one).
