# short-circuit-carried: result

Base: lean `09032a594` (lead-09032a59). Branch `lane/short-circuit-carried`.

## Commits

- `dcdaf933c` pair `conditional_expressions` extended (red: the parent's seven calls under `&&`, `||`, `??` refused
  `conditional-effect`, so the parent does not translate)
- `a96839854` the reading: `translate.mjs` (`rightParts`, `shortCircuit`), `heap.mjs` (`??`), `lint.mjs`,
  `readings.mjs`, docs (`subset.md`, `SEMANTICS.md`, `COVERAGE.md`, `admission-contract.md`,
  `docs/writing-provable-code.md`), the escape fixture `mixed_logic_mutation.ts` retired, the pair's final units
- `e6f478fb1` `heap-stage5.md` section 3b (dated note under section 3)
- this result file

The reading: ECMA-262 13.13 and 13.15.2. The right operand of `&&`, `||`, `??` (and of `&&=`, `||=`, `??=`) runs only
when the left does not decide, so it is read as an operand of the conditional the operator is, with the `carried` form
`?:` uses. Every site that translates a logic right operand translates it once as a conditional's operand
(`rightParts` = `operandParts`). When it rebinds a name (or, in a logical assignment, makes a transition), `shortCircuit`
emits `carried` with the left's value in the other arm. Otherwise the text is byte for byte what it was before. The
sites:
- the value path of `&&` and `||`
- the three `??` paths
- the truth test of a condition
- the JSX child
- the logical assignments

The heap core reads `??` the way it reads `&&`/`||`: the right operand's lines go inside its branch, so the operand
need not be pure. Nothing is keyed on a name. The mechanism is keyed on the operator.

Found on the way, now fixed by the same mechanism: two places were unsound at the base and the lint did not refuse
them.
- **The truth test.** In `if (on && change(xs) > 0)` the right operand's lines were hoisted before the test.
- **The logical assignments.** `ok ||= change(xs) > 0` did the same, and so did `ok ||= await f()` for a world
  transition.

At the base, the units in both forms ran the call whatever the left held. Pair rows: `guard`, `lazy`.

Decided without an answer (question sent, no reply in 120 s):
- **The lint rule.** The lint's argument-update condition of `conditional-effect` is removed, because the translator
  reads that construct now. The rule stays as the translator's refusal of a world effect in a logic right operand of a
  unit that has no world channel.
- **The readings entry.** The two-condition `conditional-state-channels` exception is dropped from `readings.mjs`,
  because only one condition is left.
- **The escape fixture.** `fixtures/escapes/ts/mixed_logic_mutation.ts` (`return on && change(xs)`, expected
  `conditional-effect`) is deleted: it now lints clean and translates to the carried form. The pair's `noted`/`gated`
  rows hold the construct as read cases. This is an escape expectation that changed by design; flagged for the lead.

## Pairs

| pair | checks | result |
| --- | ---: | --- |
| conditional_expressions | 44 | ALL PASS |

Red at the base: the final pair copied into the base export (`/root/lanes/short-circuit-carried/base`) gives
`theorem generated` FAIL (the parent input does not exist). New units:
- heap core: `noted` (`&&` in a return), `named` (`??` in a return)
- value reading: `gated` (`&&`), `spare` (`||`), `fallback` (`??`), `guard` (`&&` as an if's condition), `lazy` (`||=`)
- `anchor`: `found?.id ?? attach(xs, kind, owner)` on the unit's own list. This is the nexus `executeBatch` shape,
  anonymised.
- planted: `slipped`, `orphan` (lane B WITNESS)
- untouched: `attach`

## Regression (each `JOBS=2 node langs/ts/tests/run.mjs --pair <p>`, at a96839854)

| pair | checks | result |
| --- | ---: | --- |
| heap5_conditional | 9 | ALL PASS |
| logic_values | 12 | ALL PASS |
| mixed_logic_values | 40 | ALL PASS |
| nested_ternary | 7 | ALL PASS |
| jsx_conditional | 3 | ALL PASS |
| branch_types | 14 | ALL PASS |
| receiver_write | 13 | ALL PASS |
| heap_canonical | 13 | ALL PASS |
| type_tests | 59 | ALL PASS |
| copied_argument | 10 | ALL PASS |
| outside_calls (extra: the `&&` world path of 15b) | 26 | ALL PASS |

Escape fixtures, linted one by one:
- 245 of the 248 left still exit 1 and name their expected rule.
- The other 3 (`new_unit_*`, `// expect: load`) are another kind of fixture, run another way. Their lint output is
  byte-identical to the base.

`node langs/ts/lower.mjs --audit`: 587 sites (588 at the base: the removed lint site), with the same 9 uncatalogued
sites as the base.

## Census

Command, per root: `NODE_OPTIONS=--max-old-space-size=12288 node <tree>/langs/ts/census.mjs /root/da/census/repos/<root>
--out <root>-<side>.json`.
- `before` is the base `09032a594` exported by `git archive` to `/root/lanes/short-circuit-carried/base`.
- `after` is this branch at a96839854.
- The runs went one at a time, each started only with fewer than 6 censuses running and at least 12 GB available
  (`census/run.sh`).
- Counts come from `/root/lanes/short-circuit-carried/count.py <root>`. Diff: `census.mjs --diff`
  (`census/<root>-diff.txt`).

| root | files | units before / after | entered before -> after | units with `conditional-effect` | units with `read-after-call` | diff |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| n8n (complete) | 7,812 | 9,610 / 9,610 | 2,752 -> 2,752 | 0 -> 0 | 1,066 -> 1,066 | every reading equal, 0 gains, 0 losses |
| langchainjs (complete) | 2,972 | 6,709 / 6,709 | 2,831 -> 2,831 | 0 -> 0 | 551 -> 551 | every reading equal, 0 gains, 0 losses |

nexus: not run, memory.

Neither root holds the construct at this base. Their `conditional-effect` units were all ternaries, which 3a already
reads. So the counted gain here is zero. The one known short-circuit unit is nexus `WorkflowBatchService.executeBatch`
(line 500, `existingChild?.id ?? this.appendLoopChild(nodes, ..)`). The previous lane found its first stop is
`definite-assignment`, earlier in the census order, so it would not enter on this reading alone.

## What is left

- nexus: not run, memory. The executeBatch shape is covered by the pair's `anchor`.
- `anchor` and `orphan` run on the unit's own list. With the list as an input, the value reading's identity guard
  withholds the lemma (`write through an input in a same-file callee`, found by 3a). The heap core does not read the
  unit either (`found`, a local reference that may be absent). Both are outside this construct.
- The lint's `conditionalSpreadArgs` (a spread argument list of a same-file call under a branch) is another rule and
  is untouched.
