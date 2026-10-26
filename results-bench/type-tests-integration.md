# Integration note

This lane starts at `5ebf1d8065a7f8455c95bac180a4149861e61617`. While it ran, dev advanced to `5c40194c293e63b23ef81fd81dadf14ea36ceeeb`, including other lanes. No merge or rebase was performed. The parent-relative commit stat lists only this lane. The requested live-dev comparison also includes other lanes absent from this branch; those differences are not deletions made by this lane.

`git -C /Users/assem/nexus/nexus-organisation/work/lean-lanes/instanceof-exact diff --stat dev` snapshot with new files staged, before refreshing this note:

```text
 .gitignore                                         |   1 -
 README.md                                          |  55 +--
 fixtures/escapes/ts/async_callback.ts              |   2 +-
 fixtures/escapes/ts/async_callback_callee_order.ts |  10 -
 fixtures/escapes/ts/async_callback_order.ts        |   5 -
 fixtures/escapes/ts/async_callback_unawaited.ts    |   5 -
 fixtures/escapes/ts/async_filter.ts                |   4 -
 fixtures/escapes/ts/dynamic_record_effect_key.ts   |   3 -
 fixtures/escapes/ts/dynamic_record_method.ts       |   2 -
 fixtures/escapes/ts/dynamic_record_prototype.ts    |   2 -
 fixtures/escapes/ts/dynamic_record_string.ts       |   5 -
 fixtures/escapes/ts/dynamic_record_write.ts        |   2 -
 fixtures/escapes/ts/instanceof_constructor.ts      |   3 +
 .../escapes/ts/instanceof_constructor_value.ts     |   2 +
 fixtures/escapes/ts/instanceof_custom.ts           |   3 +
 fixtures/escapes/ts/super_field.ts                 |   8 -
 fixtures/escapes/ts/type_test_array_cast.ts        |   2 +
 fixtures/escapes/ts/type_test_cast.ts              |   3 +
 langs/ts/CONCEPT-PLAN.md                           |  12 +-
 langs/ts/COVERAGE.md                               |  33 +-
 langs/ts/common.mjs                                |   8 +-
 langs/ts/design/dynamic-record-reads.md            |  70 ----
 langs/ts/design/effectful-callbacks.md             |  76 ----
 langs/ts/design/exact-type-tests.md                |  80 ++++
 langs/ts/design/heap-layer-census.json             | 271 -------------
 langs/ts/design/heap-layer-census.mjs              | 161 --------
 langs/ts/design/heap-layer-toy.dfy                 |  87 ----
 langs/ts/design/heap-layer-toy.mjs                 |  62 ---
 langs/ts/design/heap-layer.md                      | 200 ---------
 langs/ts/exec/run.mjs                              |   5 -
 langs/ts/lint/lint.mjs                             | 187 +++------
 langs/ts/subset.md                                 |  33 +-
 langs/ts/tests/pairs/class_new/candidate.ts        |  59 ---
 langs/ts/tests/pairs/class_new/expect.json         |  33 --
 langs/ts/tests/pairs/class_new/parent.ts           |  58 ---
 langs/ts/tests/pairs/class_super/base.ts           |   6 -
 langs/ts/tests/pairs/class_super/candidate.ts      |  22 -
 langs/ts/tests/pairs/class_super/expect.json       |  20 -
 langs/ts/tests/pairs/class_super/parent.ts         |  22 -
 langs/ts/tests/pairs/counter/expect.json           |  22 +-
 langs/ts/tests/pairs/dynamic_reads/base.ts         |   2 -
 langs/ts/tests/pairs/dynamic_reads/candidate.ts    |  22 -
 langs/ts/tests/pairs/dynamic_reads/expect.json     |  63 ---
 langs/ts/tests/pairs/dynamic_reads/parent.ts       |  28 --
 .../tests/pairs/effectful_callbacks/candidate.ts   |  53 ---
 .../ts/tests/pairs/effectful_callbacks/expect.json |  51 ---
 langs/ts/tests/pairs/effectful_callbacks/parent.ts |  52 ---
 langs/ts/tests/pairs/for_each/expect.json          |   6 +-
 langs/ts/tests/pairs/function_values/expect.json   |   6 +-
 langs/ts/tests/pairs/logic_values/expect.json      |  28 +-
 langs/ts/tests/pairs/promise_forms/expect.json     |  25 +-
 langs/ts/tests/pairs/service/expect.json           |   6 +-
 langs/ts/tests/pairs/try_catch/expect.json         |   6 +-
 langs/ts/tests/pairs/type_tests/candidate.ts       |  53 +++
 langs/ts/tests/pairs/type_tests/expect.json        |  66 +++
 langs/ts/tests/pairs/type_tests/parent.ts          |  59 +++
 langs/ts/translate/translate.mjs                   | 446 ++++++++-------------
 results-bench/type-tests-benchmark.md              |  64 +++
 results-bench/type-tests-final-after.md            |  10 +
 results-bench/type-tests-integration.md            |  57 +++
 results-bench/type-tests-stable-before.md          |  10 +
 results-bench/type-tests-suite.log                 | 355 ++++++++++++++++
 results-bench/type-tests-validation.md             | 131 ++++++
 63 files changed, 1186 insertions(+), 2057 deletions(-)
```
