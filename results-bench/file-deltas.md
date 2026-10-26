# File deltas before commit

Snapshot excluding this stats file. Dev moved during the lane.

Lane base: 5ebf1d8065a7f8455c95bac180a4149861e61617

Dev at snapshot: 5c40194c293e63b23ef81fd81dadf14ea36ceeeb

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
 fixtures/escapes/ts/promise_allsettled.ts          |    2 +
 fixtures/escapes/ts/promise_any.ts                 |    2 +
 fixtures/escapes/ts/promise_dangling.ts            |    2 +
 fixtures/escapes/ts/promise_generic_handler.ts     |    3 +
 fixtures/escapes/ts/promise_loop.ts                |    2 +
 fixtures/escapes/ts/promise_race.ts                |    2 +
 fixtures/escapes/ts/promise_receiver_pending.ts    |    5 +
 fixtures/escapes/ts/promise_resolver_escape.ts     |    2 +
 fixtures/escapes/ts/promise_unsettled.ts           |    2 +
 fixtures/escapes/ts/super_field.ts                 |    8 -
 langs/ts/CONCEPT-PLAN.md                           |   10 +-
 langs/ts/COVERAGE.md                               |   29 +-
 langs/ts/common.mjs                                |    8 +-
 langs/ts/design/dynamic-record-reads.md            |   70 -
 langs/ts/design/effectful-callbacks.md             |   76 -
 langs/ts/design/heap-layer-census.json             |  271 ---
 langs/ts/design/heap-layer-census.mjs              |  161 --
 langs/ts/design/heap-layer-toy.dfy                 |   87 -
 langs/ts/design/heap-layer-toy.mjs                 |   62 -
 langs/ts/design/heap-layer.md                      |  200 --
 langs/ts/design/promise-forms.md                   |   73 +
 langs/ts/exec/fake.mjs                             |    3 +-
 langs/ts/exec/gen.mjs                              |    1 +
 langs/ts/exec/run.mjs                              |    5 -
 langs/ts/exec/spec.mjs                             |    2 +-
 langs/ts/lint/lint.mjs                             |  240 +--
 langs/ts/promise-forms.mjs                         |   82 +
 langs/ts/subset.md                                 |   32 +-
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
 langs/ts/tests/pairs/logic_values/expect.json      |   28 +-
 langs/ts/tests/pairs/promise_forms/expect.json     |   25 +-
 langs/ts/tests/pairs/promise_then/base.ts          |    1 +
 langs/ts/tests/pairs/promise_then/candidate.ts     |   62 +
 langs/ts/tests/pairs/promise_then/expect.json      |   57 +
 langs/ts/tests/pairs/promise_then/parent.ts        |   61 +
 langs/ts/tests/pairs/service/expect.json           |    6 +-
 langs/ts/tests/pairs/try_catch/expect.json         |    6 +-
 langs/ts/translate/translate.mjs                   |  494 +++--
 results-bench/REPORT.md                            |   41 +
 results-bench/after.json                           |  737 +++++++
 results-bench/before.json                          |  815 ++++++++
 results-bench/bench.log                            |   66 +
 results-bench/comparison.md                        |   24 +
 results-bench/lane-b.json                          | 2056 ++++++++++++++++++++
 results-bench/regressions.log                      |  153 ++
 results-bench/suite.log                            |  341 ++++
 results-bench/validate-promise.py                  |   28 +
 results-bench/validation/validation.log            |  240 +++
 77 files changed, 5252 insertions(+), 2054 deletions(-)
```

## Lane only: git diff --cached --stat

```
 fixtures/escapes/ts/promise_after_settlement.ts |    2 +
 fixtures/escapes/ts/promise_allsettled.ts       |    2 +
 fixtures/escapes/ts/promise_any.ts              |    2 +
 fixtures/escapes/ts/promise_dangling.ts         |    2 +
 fixtures/escapes/ts/promise_generic_handler.ts  |    3 +
 fixtures/escapes/ts/promise_loop.ts             |    2 +
 fixtures/escapes/ts/promise_race.ts             |    2 +
 fixtures/escapes/ts/promise_receiver_pending.ts |    5 +
 fixtures/escapes/ts/promise_resolver_escape.ts  |    2 +
 fixtures/escapes/ts/promise_unsettled.ts        |    2 +
 langs/ts/CONCEPT-PLAN.md                        |    2 +-
 langs/ts/COVERAGE.md                            |    7 +-
 langs/ts/design/promise-forms.md                |   73 +
 langs/ts/exec/fake.mjs                          |    3 +-
 langs/ts/exec/gen.mjs                           |    1 +
 langs/ts/exec/spec.mjs                          |    2 +-
 langs/ts/lint/lint.mjs                          |   81 +-
 langs/ts/promise-forms.mjs                      |   82 +
 langs/ts/subset.md                              |   10 +-
 langs/ts/tests/pairs/promise_then/base.ts       |    1 +
 langs/ts/tests/pairs/promise_then/candidate.ts  |   62 +
 langs/ts/tests/pairs/promise_then/expect.json   |   57 +
 langs/ts/tests/pairs/promise_then/parent.ts     |   61 +
 langs/ts/translate/translate.mjs                |  174 +-
 results-bench/REPORT.md                         |   37 +
 results-bench/after.json                        |  737 ++++++++
 results-bench/before.json                       |  815 +++++++++
 results-bench/bench.log                         |   66 +
 results-bench/comparison.md                     |   24 +
 results-bench/lane-b.json                       | 2056 +++++++++++++++++++++++
 results-bench/regressions.log                   |  153 ++
 results-bench/suite.log                         |  341 ++++
 results-bench/validate-promise.py               |   28 +
 results-bench/validation/validation.log         |  240 +++
 34 files changed, 5121 insertions(+), 16 deletions(-)
```
