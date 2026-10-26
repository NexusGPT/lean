# Assertion provenance revision: integration

Revision parent: `abd7782a33fc4b695c5ab1c4ed82cef90af91819`. Starting dev: `5ebf1d8065a7f8455c95bac180a4149861e61617`. Current dev: `80728f877130272f1eb81db0ae9aba7edd7f539b`. No merge or rebase was performed; the lead integrates this branch. The live-dev comparison includes unrelated work merged after this lane began. It does not describe deletions made by this revision.

Revision stat (`git diff --cached --stat`, relative to the preceding lane commit):

```text
 fixtures/escapes/ts/type_test_array_cast.ts      |   2 -
 fixtures/escapes/ts/type_test_cast.ts            |   3 -
 langs/ts/CONCEPT-PLAN.md                         |   2 +-
 langs/ts/COVERAGE.md                             |  10 +-
 langs/ts/design/exact-type-tests.md              |  12 +-
 langs/ts/lint/lint.mjs                           |  10 -
 langs/ts/subset.md                               |   5 +-
 langs/ts/tests/pairs/type_tests/candidate.ts     |  13 +
 langs/ts/tests/pairs/type_tests/expect.json      |  44 ++-
 langs/ts/tests/pairs/type_tests/parent.ts        |  13 +
 langs/ts/translate/translate.mjs                 |  40 ++-
 results-bench/type-tests-provenance.ts           |  11 +
 results-bench/type-tests-revision-after.md       |  10 +
 results-bench/type-tests-revision-before.md      |  10 +
 results-bench/type-tests-revision-benchmark.md   |  62 ++++
 results-bench/type-tests-revision-integration.md | 136 ++++++++
 results-bench/type-tests-revision-suite.log      | 375 +++++++++++++++++++++++
 results-bench/type-tests-revision-validation.md  | 160 ++++++++++
 18 files changed, 882 insertions(+), 36 deletions(-)
```

Requested live-dev stat (`git diff --stat dev`):

```text
 .gitignore                                         |   1 -
 README.md                                          |  55 +-
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
 fixtures/escapes/ts/react_handler_capture.ts       |   9 -
 fixtures/escapes/ts/spread_conditional_update.ts   |   5 -
 fixtures/escapes/ts/spread_empty_record.ts         |   2 -
 fixtures/escapes/ts/spread_iterator.ts             |   2 -
 fixtures/escapes/ts/spread_local.ts                |   2 -
 fixtures/escapes/ts/spread_math_empty.ts           |   2 -
 fixtures/escapes/ts/spread_math_opaque.ts          |   2 -
 fixtures/escapes/ts/spread_optional.ts             |   2 -
 fixtures/escapes/ts/spread_record_alias.ts         |   2 -
 fixtures/escapes/ts/spread_record_rest.ts          |   2 -
 fixtures/escapes/ts/spread_tuple.ts                |   2 -
 fixtures/escapes/ts/string_code_unit.ts            |   4 -
 fixtures/escapes/ts/string_surrogate.ts            |   4 -
 fixtures/escapes/ts/super_field.ts                 |   8 -
 langs/ts/CONCEPT-PLAN.md                           |  18 +-
 langs/ts/COVERAGE.md                               |  55 +-
 langs/ts/common.mjs                                |   8 +-
 langs/ts/design/dynamic-record-reads.md            |  70 --
 langs/ts/design/effectful-callbacks.md             |  76 --
 langs/ts/design/exact-type-tests.md                |  80 +++
 langs/ts/design/heap-layer-census.json             | 271 -------
 langs/ts/design/heap-layer-census.mjs              | 161 -----
 langs/ts/design/heap-layer-toy.dfy                 |  87 ---
 langs/ts/design/heap-layer-toy.mjs                 |  62 --
 langs/ts/design/heap-layer.md                      | 200 ------
 langs/ts/design/react-handlers-memo.md             |  73 --
 langs/ts/design/spread-outside-callees.md          |  76 --
 langs/ts/design/strings-validation.md              | 165 -----
 langs/ts/design/strings.md                         |  70 --
 langs/ts/exec/run.mjs                              |  52 +-
 langs/ts/lint/lint.mjs                             | 280 ++------
 langs/ts/react.mjs                                 |  95 ---
 langs/ts/subset.md                                 |  66 +-
 langs/ts/tests/pairs/class_new/candidate.ts        |  59 --
 langs/ts/tests/pairs/class_new/expect.json         |  33 -
 langs/ts/tests/pairs/class_new/parent.ts           |  58 --
 langs/ts/tests/pairs/class_super/base.ts           |   6 -
 langs/ts/tests/pairs/class_super/candidate.ts      |  22 -
 langs/ts/tests/pairs/class_super/expect.json       |  20 -
 langs/ts/tests/pairs/class_super/parent.ts         |  22 -
 langs/ts/tests/pairs/counter/expect.json           |  22 +-
 langs/ts/tests/pairs/dynamic_reads/base.ts         |   2 -
 langs/ts/tests/pairs/dynamic_reads/candidate.ts    |  22 -
 langs/ts/tests/pairs/dynamic_reads/expect.json     |  63 --
 langs/ts/tests/pairs/dynamic_reads/parent.ts       |  28 -
 .../tests/pairs/effectful_callbacks/candidate.ts   |  53 --
 .../ts/tests/pairs/effectful_callbacks/expect.json |  51 --
 langs/ts/tests/pairs/effectful_callbacks/parent.ts |  52 --
 langs/ts/tests/pairs/for_each/expect.json          |   6 +-
 langs/ts/tests/pairs/function_values/expect.json   |   6 +-
 langs/ts/tests/pairs/jsx_handlers/candidate.tsx    |  72 --
 langs/ts/tests/pairs/jsx_handlers/expect.json      |  60 --
 langs/ts/tests/pairs/jsx_handlers/parent.tsx       |  70 --
 langs/ts/tests/pairs/jsx_handlers/types.d.ts       |  16 -
 langs/ts/tests/pairs/logic_values/expect.json      |  28 +-
 langs/ts/tests/pairs/promise_forms/expect.json     |  25 +-
 langs/ts/tests/pairs/service/expect.json           |   6 +-
 langs/ts/tests/pairs/spread_outside/api.d.ts       |   5 -
 langs/ts/tests/pairs/spread_outside/candidate.ts   |  84 ---
 langs/ts/tests/pairs/spread_outside/expect.json    |  78 --
 langs/ts/tests/pairs/spread_outside/parent.ts      |  83 ---
 langs/ts/tests/pairs/strings/candidate.ts          |  53 --
 langs/ts/tests/pairs/strings/expect.json           |  42 --
 langs/ts/tests/pairs/strings/parent.ts             |  47 --
 langs/ts/tests/pairs/try_catch/expect.json         |   6 +-
 langs/ts/tests/pairs/type_tests/candidate.ts       |  66 ++
 langs/ts/tests/pairs/type_tests/expect.json        | 102 +++
 langs/ts/tests/pairs/type_tests/parent.ts          |  72 ++
 langs/ts/tests/run.mjs                             |   7 -
 langs/ts/tests/strings/assertions.dfy              | 120 ----
 langs/ts/tests/strings/probe.ts                    |  30 -
 langs/ts/tests/strings/real-assertions.dfy         |   8 -
 langs/ts/tests/strings/real.ts                     |   5 -
 langs/ts/tests/strings/run.mjs                     |  20 -
 langs/ts/translate/translate.mjs                   | 792 +++++++--------------
 results-bench/type-tests-benchmark.md              |  64 ++
 results-bench/type-tests-final-after.md            |  10 +
 results-bench/type-tests-integration.md            |  72 ++
 results-bench/type-tests-provenance.ts             |  11 +
 results-bench/type-tests-revision-after.md         |  10 +
 results-bench/type-tests-revision-before.md        |  10 +
 results-bench/type-tests-revision-benchmark.md     |  62 ++
 results-bench/type-tests-revision-integration.md   | 136 ++++
 results-bench/type-tests-revision-suite.log        | 375 ++++++++++
 results-bench/type-tests-revision-validation.md    | 160 +++++
 results-bench/type-tests-stable-before.md          |  10 +
 results-bench/type-tests-suite.log                 | 355 +++++++++
 results-bench/type-tests-validation.md             | 131 ++++
 103 files changed, 2111 insertions(+), 3834 deletions(-)
```
