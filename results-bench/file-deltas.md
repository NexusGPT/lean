# File deltas

Requested base: c951e8e. 27 source/design/fixture files, +974/-19. Evidence is separate.

 fixtures/escapes/ts/promise_after_settlement.ts    |   2 +
 fixtures/escapes/ts/promise_resolver_escape.ts     |   2 +
 fixtures/escapes/ts/promise_unsettled.ts           |   2 +
 langs/ts/CONCEPT-PLAN.md                           |   2 +-
 langs/ts/COVERAGE.md                               |   7 +-
 langs/ts/design/promise-forms.md                   |  80 ++++++++
 langs/ts/exec/fake.mjs                             |   3 +-
 langs/ts/exec/gen.mjs                              |   1 +
 langs/ts/exec/spec.mjs                             |   2 +-
 langs/ts/lint/lint.mjs                             | 100 ++++++++-
 langs/ts/promise-forms.mjs                         |  82 ++++++++
 langs/ts/subset.md                                 |  10 +-
 langs/ts/tests/pairs/promise_fallback/candidate.ts |  39 ++++
 langs/ts/tests/pairs/promise_fallback/expect.json  |  39 ++++
 langs/ts/tests/pairs/promise_fallback/parent.ts    |  39 ++++
 .../tests/pairs/promise_integration/candidate.ts   |  28 +++
 .../ts/tests/pairs/promise_integration/expect.json |  30 +++
 langs/ts/tests/pairs/promise_integration/parent.ts |  26 +++
 langs/ts/tests/pairs/promise_integration/ports.ts  |   1 +
 .../pairs/promise_module_nullish/candidate.ts      |  32 +++
 .../tests/pairs/promise_module_nullish/expect.json |  33 +++
 .../tests/pairs/promise_module_nullish/parent.ts   |  28 +++
 langs/ts/tests/pairs/promise_then/base.ts          |   1 +
 langs/ts/tests/pairs/promise_then/candidate.ts     |  62 ++++++
 langs/ts/tests/pairs/promise_then/expect.json      |  57 ++++++
 langs/ts/tests/pairs/promise_then/parent.ts        |  61 ++++++
 langs/ts/translate/translate.mjs                   | 224 ++++++++++++++++++++-
 27 files changed, 974 insertions(+), 19 deletions(-)

2	0	fixtures/escapes/ts/promise_after_settlement.ts
2	0	fixtures/escapes/ts/promise_resolver_escape.ts
2	0	fixtures/escapes/ts/promise_unsettled.ts
1	1	langs/ts/CONCEPT-PLAN.md
4	3	langs/ts/COVERAGE.md
80	0	langs/ts/design/promise-forms.md
2	1	langs/ts/exec/fake.mjs
1	0	langs/ts/exec/gen.mjs
1	1	langs/ts/exec/spec.mjs
95	5	langs/ts/lint/lint.mjs
82	0	langs/ts/promise-forms.mjs
8	2	langs/ts/subset.md
39	0	langs/ts/tests/pairs/promise_fallback/candidate.ts
39	0	langs/ts/tests/pairs/promise_fallback/expect.json
39	0	langs/ts/tests/pairs/promise_fallback/parent.ts
28	0	langs/ts/tests/pairs/promise_integration/candidate.ts
30	0	langs/ts/tests/pairs/promise_integration/expect.json
26	0	langs/ts/tests/pairs/promise_integration/parent.ts
1	0	langs/ts/tests/pairs/promise_integration/ports.ts
32	0	langs/ts/tests/pairs/promise_module_nullish/candidate.ts
33	0	langs/ts/tests/pairs/promise_module_nullish/expect.json
28	0	langs/ts/tests/pairs/promise_module_nullish/parent.ts
1	0	langs/ts/tests/pairs/promise_then/base.ts
62	0	langs/ts/tests/pairs/promise_then/candidate.ts
57	0	langs/ts/tests/pairs/promise_then/expect.json
61	0	langs/ts/tests/pairs/promise_then/parent.ts
218	6	langs/ts/translate/translate.mjs

Requested git diff --stat dev snapshot; dev is c951e8eaf235d08d20f697765619bf039f2cbff0.

 fixtures/escapes/ts/promise_after_settlement.ts    |    2 +
 fixtures/escapes/ts/promise_resolver_escape.ts     |    2 +
 fixtures/escapes/ts/promise_unsettled.ts           |    2 +
 langs/ts/CONCEPT-PLAN.md                           |    2 +-
 langs/ts/COVERAGE.md                               |    7 +-
 langs/ts/design/promise-forms.md                   |   80 +
 langs/ts/exec/fake.mjs                             |    3 +-
 langs/ts/exec/gen.mjs                              |    1 +
 langs/ts/exec/spec.mjs                             |    2 +-
 langs/ts/lint/lint.mjs                             |  100 +-
 langs/ts/promise-forms.mjs                         |   82 +
 langs/ts/subset.md                                 |   10 +-
 langs/ts/tests/pairs/promise_fallback/candidate.ts |   39 +
 langs/ts/tests/pairs/promise_fallback/expect.json  |   39 +
 langs/ts/tests/pairs/promise_fallback/parent.ts    |   39 +
 .../tests/pairs/promise_integration/candidate.ts   |   28 +
 .../ts/tests/pairs/promise_integration/expect.json |   30 +
 langs/ts/tests/pairs/promise_integration/parent.ts |   26 +
 langs/ts/tests/pairs/promise_integration/ports.ts  |    1 +
 .../pairs/promise_module_nullish/candidate.ts      |   32 +
 .../tests/pairs/promise_module_nullish/expect.json |   33 +
 .../tests/pairs/promise_module_nullish/parent.ts   |   28 +
 langs/ts/tests/pairs/promise_then/base.ts          |    1 +
 langs/ts/tests/pairs/promise_then/candidate.ts     |   62 +
 langs/ts/tests/pairs/promise_then/expect.json      |   57 +
 langs/ts/tests/pairs/promise_then/parent.ts        |   61 +
 langs/ts/translate/translate.mjs                   |  224 ++-
 results-bench/REPORT.md                            |   59 +
 results-bench/after-9cb4107.json                   |  816 ++++++++
 results-bench/after.json                           |  830 ++++++++
 results-bench/before.json                          |  815 ++++++++
 results-bench/bench.log                            |   66 +
 results-bench/comparison.md                        |   27 +
 results-bench/dev-0c4b2b0-before.json              |  801 ++++++++
 results-bench/dev-0c4b2b0-bench.log                |   66 +
 results-bench/dev-0c4b2b0-revision.txt             |    1 +
 results-bench/dev-baseline-revision.txt            |    1 +
 results-bench/dev-before.json                      |  815 ++++++++
 results-bench/dev-bench.log                        |   66 +
 results-bench/dev-final-baseline-revision.txt      |    1 +
 results-bench/dev-final-before.json                |  802 ++++++++
 results-bench/dev-final-bench.log                  |   66 +
 results-bench/fallback-lane-b.json                 |  763 ++++++++
 results-bench/file-deltas.md                       |  136 ++
 results-bench/integration-lane-b.json              |  451 +++++
 results-bench/lane-b.json                          | 2056 ++++++++++++++++++++
 results-bench/module-nullish-lane-b.json           |  510 +++++
 results-bench/regressions.log                      |  153 ++
 results-bench/suite-80728f8.log                    |  622 ++++++
 results-bench/suite-9cb4107.log                    |  779 ++++++++
 results-bench/suite.log                            |    0
 results-bench/validate-promise.py                  |   28 +
 .../validation-promise_fallback/validation.log     |  117 ++
 .../validation-promise_integration/validation.log  |  105 +
 .../validation.log                                 |  109 ++
 results-bench/validation/validation.log            |  211 ++
 56 files changed, 12246 insertions(+), 19 deletions(-)
