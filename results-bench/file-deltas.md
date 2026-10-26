# File deltas before the fallback commit

Snapshot taken before refreshing this stats file. Dev advanced during the lane.

Revision parent: e641899622cc7545aba76aaac07af7a3fd5b447e

Lane base: 5ebf1d8065a7f8455c95bac180a4149861e61617

Dev at snapshot: 03e3f8d3b50f34e92918f7f9ec7d477881fc22a8

## Requested git diff --stat dev

```
 .gitignore                                         |    1 -
 README.md                                          |   55 +-
 fixtures/escapes/ts/async_callback.ts              |    2 +-
 fixtures/escapes/ts/async_callback_callee_order.ts |   10 -
 fixtures/escapes/ts/async_callback_order.ts        |    5 -
 fixtures/escapes/ts/async_callback_unawaited.ts    |    5 -
 fixtures/escapes/ts/async_filter.ts                |    4 -
 fixtures/escapes/ts/dynamic_record_effect_key.ts   |    3 -
 fixtures/escapes/ts/dynamic_record_method.ts       |    2 -
 fixtures/escapes/ts/dynamic_record_prototype.ts    |    2 -
 fixtures/escapes/ts/dynamic_record_string.ts       |    5 -
 fixtures/escapes/ts/dynamic_record_write.ts        |    2 -
 fixtures/escapes/ts/promise_after_settlement.ts    |    2 +
 fixtures/escapes/ts/promise_resolver_escape.ts     |    2 +
 fixtures/escapes/ts/promise_unsettled.ts           |    2 +
 fixtures/escapes/ts/react_handler_capture.ts       |    9 -
 fixtures/escapes/ts/spread_conditional_update.ts   |    5 -
 fixtures/escapes/ts/spread_empty_record.ts         |    2 -
 fixtures/escapes/ts/spread_iterator.ts             |    2 -
 fixtures/escapes/ts/spread_local.ts                |    2 -
 fixtures/escapes/ts/spread_math_empty.ts           |    2 -
 fixtures/escapes/ts/spread_math_opaque.ts          |    2 -
 fixtures/escapes/ts/spread_optional.ts             |    2 -
 fixtures/escapes/ts/spread_record_alias.ts         |    2 -
 fixtures/escapes/ts/spread_record_rest.ts          |    2 -
 fixtures/escapes/ts/spread_tuple.ts                |    2 -
 fixtures/escapes/ts/super_field.ts                 |    8 -
 langs/ts/CONCEPT-PLAN.md                           |   14 +-
 langs/ts/COVERAGE.md                               |   41 +-
 langs/ts/common.mjs                                |    8 +-
 langs/ts/design/dynamic-record-reads.md            |   70 -
 langs/ts/design/effectful-callbacks.md             |   76 -
 langs/ts/design/heap-layer-census.json             |  271 ---
 langs/ts/design/heap-layer-census.mjs              |  161 --
 langs/ts/design/heap-layer-toy.dfy                 |   87 -
 langs/ts/design/heap-layer-toy.mjs                 |   62 -
 langs/ts/design/heap-layer.md                      |  200 --
 langs/ts/design/promise-forms.md                   |   74 +
 langs/ts/design/react-handlers-memo.md             |   73 -
 langs/ts/design/spread-outside-callees.md          |   76 -
 langs/ts/exec/fake.mjs                             |    3 +-
 langs/ts/exec/gen.mjs                              |    1 +
 langs/ts/exec/run.mjs                              |   52 +-
 langs/ts/exec/spec.mjs                             |    2 +-
 langs/ts/lint/lint.mjs                             |  345 ++--
 langs/ts/promise-forms.mjs                         |   82 +
 langs/ts/react.mjs                                 |   95 -
 langs/ts/subset.md                                 |   52 +-
 langs/ts/tests/pairs/class_new/candidate.ts        |   59 -
 langs/ts/tests/pairs/class_new/expect.json         |   33 -
 langs/ts/tests/pairs/class_new/parent.ts           |   58 -
 langs/ts/tests/pairs/class_super/base.ts           |    6 -
 langs/ts/tests/pairs/class_super/candidate.ts      |   22 -
 langs/ts/tests/pairs/class_super/expect.json       |   20 -
 langs/ts/tests/pairs/class_super/parent.ts         |   22 -
 langs/ts/tests/pairs/counter/expect.json           |   22 +-
 langs/ts/tests/pairs/dynamic_reads/base.ts         |    2 -
 langs/ts/tests/pairs/dynamic_reads/candidate.ts    |   22 -
 langs/ts/tests/pairs/dynamic_reads/expect.json     |   63 -
 langs/ts/tests/pairs/dynamic_reads/parent.ts       |   28 -
 .../tests/pairs/effectful_callbacks/candidate.ts   |   53 -
 .../ts/tests/pairs/effectful_callbacks/expect.json |   51 -
 langs/ts/tests/pairs/effectful_callbacks/parent.ts |   52 -
 langs/ts/tests/pairs/for_each/expect.json          |    6 +-
 langs/ts/tests/pairs/function_values/expect.json   |    6 +-
 langs/ts/tests/pairs/jsx_handlers/candidate.tsx    |   72 -
 langs/ts/tests/pairs/jsx_handlers/expect.json      |   60 -
 langs/ts/tests/pairs/jsx_handlers/parent.tsx       |   70 -
 langs/ts/tests/pairs/jsx_handlers/types.d.ts       |   16 -
 langs/ts/tests/pairs/logic_values/expect.json      |   28 +-
 langs/ts/tests/pairs/promise_fallback/candidate.ts |   39 +
 langs/ts/tests/pairs/promise_fallback/expect.json  |   39 +
 langs/ts/tests/pairs/promise_fallback/parent.ts    |   39 +
 langs/ts/tests/pairs/promise_forms/expect.json     |   25 +-
 langs/ts/tests/pairs/promise_then/base.ts          |    1 +
 langs/ts/tests/pairs/promise_then/candidate.ts     |   62 +
 langs/ts/tests/pairs/promise_then/expect.json      |   57 +
 langs/ts/tests/pairs/promise_then/parent.ts        |   61 +
 langs/ts/tests/pairs/service/expect.json           |    6 +-
 langs/ts/tests/pairs/spread_outside/api.d.ts       |    5 -
 langs/ts/tests/pairs/spread_outside/candidate.ts   |   84 -
 langs/ts/tests/pairs/spread_outside/expect.json    |   78 -
 langs/ts/tests/pairs/spread_outside/parent.ts      |   83 -
 langs/ts/tests/pairs/try_catch/expect.json         |    6 +-
 langs/ts/translate/translate.mjs                   |  704 +++----
 results-bench/REPORT.md                            |   47 +
 results-bench/after.json                           |  831 ++++++++
 results-bench/before.json                          |  815 ++++++++
 results-bench/bench.log                            |   66 +
 results-bench/comparison.md                        |   24 +
 results-bench/fallback-lane-b.json                 |  763 ++++++++
 results-bench/file-deltas.md                       |  130 ++
 results-bench/lane-b.json                          | 2056 ++++++++++++++++++++
 results-bench/regressions.log                      |  153 ++
 results-bench/suite.log                            |  366 ++++
 results-bench/validate-promise.py                  |   28 +
 .../validation-promise_fallback/validation.log     |  117 ++
 results-bench/validation/validation.log            |  211 ++
 98 files changed, 6541 insertions(+), 3113 deletions(-)
```

## This revision: git diff --cached --stat

```
 fixtures/escapes/ts/promise_allsettled.ts          |   2 -
 fixtures/escapes/ts/promise_any.ts                 |   2 -
 fixtures/escapes/ts/promise_dangling.ts            |   2 -
 fixtures/escapes/ts/promise_generic_handler.ts     |   3 -
 fixtures/escapes/ts/promise_loop.ts                |   2 -
 fixtures/escapes/ts/promise_race.ts                |   2 -
 fixtures/escapes/ts/promise_receiver_pending.ts    |   5 -
 langs/ts/CONCEPT-PLAN.md                           |   2 +-
 langs/ts/COVERAGE.md                               |   6 +-
 langs/ts/design/promise-forms.md                   |  93 +--
 langs/ts/lint/lint.mjs                             |  24 +-
 langs/ts/subset.md                                 |  10 +-
 langs/ts/tests/pairs/promise_fallback/candidate.ts |  39 ++
 langs/ts/tests/pairs/promise_fallback/expect.json  |  39 ++
 langs/ts/tests/pairs/promise_fallback/parent.ts    |  39 ++
 langs/ts/translate/translate.mjs                   |  43 +-
 results-bench/REPORT.md                            |  58 +-
 results-bench/after.json                           | 216 ++++--
 results-bench/bench.log                            |  48 +-
 results-bench/comparison.md                        |  14 +-
 results-bench/fallback-lane-b.json                 | 763 +++++++++++++++++++++
 results-bench/suite.log                            |  63 +-
 results-bench/validate-promise.py                  |   6 +-
 .../validation-promise_fallback/validation.log     | 117 ++++
 results-bench/validation/validation.log            |  57 +-
 25 files changed, 1386 insertions(+), 269 deletions(-)
```

## This revision: git diff --cached --numstat

```
0	2	fixtures/escapes/ts/promise_allsettled.ts
0	2	fixtures/escapes/ts/promise_any.ts
0	2	fixtures/escapes/ts/promise_dangling.ts
0	3	fixtures/escapes/ts/promise_generic_handler.ts
0	2	fixtures/escapes/ts/promise_loop.ts
0	2	fixtures/escapes/ts/promise_race.ts
0	5	fixtures/escapes/ts/promise_receiver_pending.ts
1	1	langs/ts/CONCEPT-PLAN.md
3	3	langs/ts/COVERAGE.md
47	46	langs/ts/design/promise-forms.md
18	6	langs/ts/lint/lint.mjs
5	5	langs/ts/subset.md
39	0	langs/ts/tests/pairs/promise_fallback/candidate.ts
39	0	langs/ts/tests/pairs/promise_fallback/expect.json
39	0	langs/ts/tests/pairs/promise_fallback/parent.ts
36	7	langs/ts/translate/translate.mjs
32	26	results-bench/REPORT.md
155	61	results-bench/after.json
24	24	results-bench/bench.log
7	7	results-bench/comparison.md
763	0	results-bench/fallback-lane-b.json
44	19	results-bench/suite.log
3	3	results-bench/validate-promise.py
117	0	results-bench/validation-promise_fallback/validation.log
14	43	results-bench/validation/validation.log
```
