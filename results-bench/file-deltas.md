# Promise lane deltas against dev 80728f8

Source, design and fixture deltas (`git diff --numstat dev -- langs/ts fixtures/escapes/ts`):

```text
2	0	fixtures/escapes/ts/promise_after_settlement.ts
2	0	fixtures/escapes/ts/promise_resolver_escape.ts
2	0	fixtures/escapes/ts/promise_unsettled.ts
1	1	langs/ts/CONCEPT-PLAN.md
4	3	langs/ts/COVERAGE.md
76	0	langs/ts/design/promise-forms.md
2	1	langs/ts/exec/fake.mjs
1	0	langs/ts/exec/gen.mjs
1	1	langs/ts/exec/spec.mjs
89	4	langs/ts/lint/lint.mjs
82	0	langs/ts/promise-forms.mjs
8	2	langs/ts/subset.md
39	0	langs/ts/tests/pairs/promise_fallback/candidate.ts
39	0	langs/ts/tests/pairs/promise_fallback/expect.json
39	0	langs/ts/tests/pairs/promise_fallback/parent.ts
9	0	langs/ts/tests/pairs/promise_integration/candidate.ts
18	0	langs/ts/tests/pairs/promise_integration/expect.json
8	0	langs/ts/tests/pairs/promise_integration/parent.ts
1	0	langs/ts/tests/pairs/promise_integration/ports.ts
1	0	langs/ts/tests/pairs/promise_then/base.ts
62	0	langs/ts/tests/pairs/promise_then/candidate.ts
57	0	langs/ts/tests/pairs/promise_then/expect.json
61	0	langs/ts/tests/pairs/promise_then/parent.ts
205	5	langs/ts/translate/translate.mjs
```

Full requested comparison (`git diff --stat dev`, including evidence):

```text
 fixtures/escapes/ts/promise_after_settlement.ts    |    2 +
 fixtures/escapes/ts/promise_resolver_escape.ts     |    2 +
 fixtures/escapes/ts/promise_unsettled.ts           |    2 +
 langs/ts/CONCEPT-PLAN.md                           |    2 +-
 langs/ts/COVERAGE.md                               |    7 +-
 langs/ts/design/promise-forms.md                   |   76 +
 langs/ts/exec/fake.mjs                             |    3 +-
 langs/ts/exec/gen.mjs                              |    1 +
 langs/ts/exec/spec.mjs                             |    2 +-
 langs/ts/lint/lint.mjs                             |   93 +-
 langs/ts/promise-forms.mjs                         |   82 +
 langs/ts/subset.md                                 |   10 +-
 langs/ts/tests/pairs/promise_fallback/candidate.ts |   39 +
 langs/ts/tests/pairs/promise_fallback/expect.json  |   39 +
 langs/ts/tests/pairs/promise_fallback/parent.ts    |   39 +
 .../tests/pairs/promise_integration/candidate.ts   |    9 +
 .../ts/tests/pairs/promise_integration/expect.json |   18 +
 langs/ts/tests/pairs/promise_integration/parent.ts |    8 +
 langs/ts/tests/pairs/promise_integration/ports.ts  |    1 +
 langs/ts/tests/pairs/promise_then/base.ts          |    1 +
 langs/ts/tests/pairs/promise_then/candidate.ts     |   62 +
 langs/ts/tests/pairs/promise_then/expect.json      |   57 +
 langs/ts/tests/pairs/promise_then/parent.ts        |   61 +
 langs/ts/translate/translate.mjs                   |  210 +-
 results-bench/REPORT.md                            |   47 +
 results-bench/after.json                           |  831 ++++++++
 results-bench/before.json                          |  815 ++++++++
 results-bench/bench.log                            |   66 +
 results-bench/comparison.md                        |   25 +
 results-bench/dev-baseline-revision.txt            |    1 +
 results-bench/dev-before.json                      |  815 ++++++++
 results-bench/dev-bench.log                        |   66 +
 results-bench/fallback-lane-b.json                 |  763 ++++++++
 results-bench/file-deltas.md                       |  174 ++
 results-bench/integration-lane-b.json              |  186 ++
 results-bench/lane-b.json                          | 2056 ++++++++++++++++++++
 results-bench/regressions.log                      |  153 ++
 results-bench/suite.log                            |    0
 results-bench/validate-promise.py                  |   28 +
 .../validation-promise_fallback/validation.log     |  117 ++
 .../validation-promise_integration/validation.log  |   61 +
 results-bench/validation/validation.log            |  211 ++
 42 files changed, 7224 insertions(+), 17 deletions(-)
```
