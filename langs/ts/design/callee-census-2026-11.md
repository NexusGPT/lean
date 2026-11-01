# Callee census, 2026-11-01: the ranked tables

Lane w2a-callee-census. Mechanism and argument: `design/w2a-callee-census.md`. Every number below is read from the files
in `design/callee-census-2026-11/` (JSON and Markdown per view), built by
`bash lane/w2a-callee-census-tables.sh roots <runs> <tables>` over the runs of
`bash lane/w2a-callee-census-run.sh roots <runs> /root/da/census/repos/<root>...` (each root copied to
`/root/census-installs/w2a/roots-<root>`, `census.mjs <copy> --install-under /root/census-installs/w2a --callees
--clean-after`): callees.mjs and census.mjs as committed at 9fcc63e5 (unchanged since), the runner as at 46b53d81.

## Coverage of this snapshot (read first)

- Population 1, the 39 census roots: **18 of 39 roots counted** (97,743 units). The run was load-gated (the one-minute
  load above 40 for most of 02:35 to 11:00 UTC, the runner waiting five minutes at each reading); the other 21 are the
  smaller roots and nexus-landing, which was walking at the snapshot. The runner resumes: a root whose log ends `exit 0`
  is kept.
- Population 2, the 13 corpus repositories: **not counted**. The clones exist read-only under `/root/census-corpus`
  (default-branch heads, shallow, listed in the result file); the run is queued behind population 1.
- Per root (`roots-summary.md`):

| Root | Units | Entered | Environment-blocked | Language-refused | Callee-only | Install | Seconds |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| agent-nexus | 4171 | 3028 | 2 | 889 | 201 | installed (pnpm@10.33.0) | 140 |
| apps-starter | 472 | 86 | 26 | 161 | 3 | install-failed (npm) | 339 |
| apps-ui | 2361 | 1048 | 0 | 658 | 95 | installed (npm) | 386 |
| blocks | 516 | 333 | 0 | 104 | 28 | installed (pnpm@10.0.0) | 55 |
| blog-studio-lambda | 999 | 437 | 0 | 220 | 44 | installed (npm) | 414 |
| claude-skills | 355 | 284 | 0 | 48 | 21 | installed (npm) | 44 |
| driftbench | 5479 | 2512 | 0 | 1452 | 427 | installed (pnpm@10.30.2) | 591 |
| langchainjs | 6709 | 2954 | 25 | 2999 | 406 | installed (pnpm@10.14.0) | 1311 |
| n8n | 9610 | 3072 | 46 | 4860 | 738 | installed (pnpm@9.1.4) | 983 |
| nexus-app-starter | 1499 | 662 | 0 | 350 | 68 | installed (npm) | 493 |
| nexus-landing | partial | | | | | | |
| nexus-learning | 3760 | 2210 | 0 | 1004 | 337 | installed (pnpm@10.32.1) | 432 |
| nexus-linkedin-dashboard | 1704 | 935 | 31 | 415 | 119 | installed (pnpm@10.18.3) | 163 |
| nexus-ui | 629 | 138 | 320 | 67 | 17 | install-failed (pnpm@10.33.0) | 19 |
| nexus | 43949 | 17342 | 6226 | 11709 | 1256 | install-failed (pnpm@10.33.0) | 2358 |
| nutshell | 10511 | 6156 | 0 | 2845 | 783 | installed (pnpm@12.15.0) | 855 |
| pyka | 2966 | 1324 | 0 | 789 | 90 | installed (npm) | 720 |
| snitch | 1399 | 635 | 38 | 442 | 34 | installed (pnpm@9.15.9) | 158 |
| status | 654 | 299 | 64 | 163 | 23 | install-failed (pnpm (local)) | 28 |

nexus, nexus-ui, apps-starter and status: the install failed (a private package, `@agent-nexus/tokens`, 404 on the public
registry, for the pnpm roots); their units reaching the missing modules are environment-blocked (W6), never callee-only.

## What the 18 roots say

- 54,288 units refused; **4,690 (8.6%) are refused only on unmodelled outside calls**; 178 of them name more than one callee.
- By origin of their callees: project 2,558, ecmascript 1,074, package 538, untyped 304, node 108, web 60, mixed 48.
- By rule: **read-after-call alone 3,607 (76.9%)**, promise+promise-pending 207, type-assertion 151, unsupported-call 135,
  math-empty 90, promise-pending 84, promise-executor-escape 83, foreach 57, this 48, prototype 34.
- The tail is long: 32,366 distinct outside callees. The first 20 rows of the world view let in 1,016 of the 4,690
  (21.7%), the first 50, 1,302 (27.8%); outside the language (web, node, package) 321 and 476. All origins: 1,295 and 1,776.

The W2 validator's threshold (the top 20 entries unblock at least 80% of the units attributed to unmodelled calls) is far
from what per-callee entries can reach on this population: a row per callee is a long tail. What the units share is the
refusal, not the callee: `read-after-call` says a value is read after a call that may change it. The call is a world
transition whose effect on its arguments is unknown, so a fact per callee, "writes none of its arguments" (or "writes
only these"), lifts the 76.9% whatever the callee's value. That fact is one column of a row, checkable by the recording
(lane B's trace shows any write), and it covers project callees too (2,558 units), which no world fake will.

## Population 1, the world library view (ecmascript, web, node, package), top 50

| # | Callee | Origin | Only by it | Among | Cumulative | Callers | Calls | Refusals naming it |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | `global new Promise` | ecmascript | 404 | 410 | 404 | 434 | 464 | promise-pending 300, promise 211, promise-executor-escape 86 |
| 2 | `react useCallback` | package | 82 | 82 | 486 | 1106 | 2949 | read-after-call 82 |
| 3 | `global Array.prototype.forEach` | ecmascript | 80 | 94 | 566 | 788 | 1142 | foreach 68, read-after-call 36, type-assertion 2 |
| 4 | `global JSON.stringify` | ecmascript | 63 | 63 | 629 | 2035 | 2812 | read-after-call 63 |
| 5 | `global Math.max` | ecmascript | 53 | 63 | 682 | 756 | 934 | math-empty 63 |
| 6 | `global Array.prototype.find` | ecmascript | 34 | 38 | 716 | 1353 | 1684 | read-after-call 30, non-null-assertion 8, unsupported-call 1 |
| 7 | `global Array.prototype.some` | ecmascript | 31 | 34 | 747 | 1008 | 1183 | read-after-call 34 |
| 8 | `global Math.min` | ecmascript | 27 | 37 | 784 | 527 | 656 | math-empty 37 |
| 9 | `global Array.prototype.join` | ecmascript | 27 | 27 | 811 | 2769 | 3784 | read-after-call 15, type-assertion 12 |
| 10 | `global Date.prototype.getTime` | ecmascript | 25 | 25 | 836 | 390 | 658 | read-after-call 25 |
| 11 | `global JSON.parse` | ecmascript | 23 | 24 | 860 | 765 | 864 | type-assertion 22, read-after-call 2, promise-pending 1 |
| 12 | `i18next TFunctionNonStrict` | package | 22 | 22 | 882 | 281 | 1376 | unsupported-call 18, read-after-call 4 |
| 13 | `global Promise.all` | ecmascript | 20 | 20 | 902 | 674 | 737 | read-after-call 20 |
| 14 | `@n8n/typeorm Repository.prototype.find` | package | 19 | 19 | 921 | 71 | 86 | read-after-call 19 |
| 15 | `playwright-core Locator.prototype.evaluateAll` | package | 18 | 18 | 939 | 14 | 19 | read-after-call 18 |
| 16 | `lodash/get default` | package | 16 | 16 | 955 | 93 | 223 | type-assertion 9, read-after-call 7 |
| 17 | `node:fs StatsBase.prototype.isDirectory` | node | 16 | 16 | 971 | 63 | 68 | read-after-call 16 |
| 18 | `global Object.keys` | ecmascript | 15 | 17 | 986 | 1443 | 2152 | read-after-call 14, type-assertion 3 |
| 19 | `playwright-core ElectronApplication.prototype.evaluate` | package | 15 | 15 | 1001 | 56 | 65 | read-after-call 15 |
| 20 | `better-sqlite3 BetterSqlite3.Transaction` | package | 15 | 15 | 1016 | 14 | 14 | unsupported-call 15 |
| 21 | `global new Proxy` | ecmascript | 14 | 14 | 1030 | 18 | 21 | prototype 14 |
| 22 | `global Map.prototype.values` | ecmascript | 13 | 14 | 1043 | 251 | 287 | alias-mutation 7, collection-iterator 7, read-after-call 1 |
| 23 | `global CallableFunction.prototype.call` | ecmascript | 13 | 13 | 1056 | 611 | 790 | type-assertion 11, read-after-call 2 |
| 24 | `@smithy/smithy-client Client.prototype.send` | package | 13 | 13 | 1069 | 19 | 25 | read-after-call 13 |
| 25 | `typedi Container.get` | package | 12 | 12 | 1081 | 170 | 320 | read-after-call 12 |
| 26 | `commander Command.prototype.name` | package | 12 | 12 | 1093 | 39 | 48 | read-after-call 12 |
| 27 | `global Promise.prototype.catch` | ecmascript | 11 | 13 | 1104 | 911 | 1233 | read-after-call 11, promise-pending 2 |
| 28 | `global Array.prototype.flatMap` | ecmascript | 11 | 12 | 1115 | 389 | 453 | read-after-call 9, type-assertion 3 |
| 29 | `global Promise.prototype.then` | ecmascript | 11 | 11 | 1126 | 642 | 868 | read-after-call 11 |
| 30 | `drizzle-orm PgSelectBuilder.prototype.from` | package | 10 | 10 | 1136 | 123 | 171 | read-after-call 10 |
| 31 | `next/navigation notFound` | package | 10 | 10 | 1146 | 13 | 15 | read-after-call 10 |
| 32 | `global eval` | ecmascript | 10 | 10 | 1156 | 11 | 14 | dynamic-eval 10, type-assertion 1 |
| 33 | `global Node.prototype.appendChild` | web | 9 | 10 | 1166 | 33 | 62 | read-after-call 10 |
| 34 | `react useState` | package | 9 | 9 | 1175 | 1743 | 4534 | read-after-call 9 |
| 35 | `react useMemo` | package | 9 | 9 | 1184 | 877 | 1556 | read-after-call 9 |
| 36 | `global Object.prototype.hasOwnProperty.call` | ecmascript | 9 | 9 | 1193 | 31 | 33 | prototype 9 |
| 37 | `@n8n/typeorm Repository.prototype.findOneBy` | package | 9 | 9 | 1202 | 20 | 21 | read-after-call 9 |
| 38 | `zustand useStore` | package | 9 | 9 | 1211 | 19 | 24 | read-after-call 9 |
| 39 | `node:buffer BufferConstructor.prototype.from` | node | 8 | 9 | 1219 | 183 | 241 | copied-argument 8, read-after-call 1 |
| 40 | `global Array.prototype.every` | ecmascript | 8 | 8 | 1227 | 369 | 434 | read-after-call 8 |
| 41 | `global String.prototype.match` | ecmascript | 8 | 8 | 1235 | 211 | 319 | read-after-call 7, non-null-assertion 1 |
| 42 | `global Element.prototype.getAttribute` | web | 8 | 8 | 1243 | 36 | 61 | read-after-call 8 |
| 43 | `global Uint8Array.prototype.set` | ecmascript | 8 | 8 | 1251 | 15 | 20 | read-after-call 7, alias-mutation 1 |
| 44 | `commander Command.prototype.exitOverride` | package | 8 | 8 | 1259 | 10 | 10 | read-after-call 8 |
| 45 | `global Set.prototype.forEach` | ecmascript | 8 | 8 | 1267 | 9 | 11 | unsupported-call 8 |
| 46 | `drizzle-orm sql` | package | 7 | 9 | 1274 | 35 | 73 | copied-argument 7, read-after-call 2 |
| 47 | `global String.prototype.startsWith` | ecmascript | 7 | 7 | 1281 | 970 | 1306 | read-after-call 5, unsupported-call 2 |
| 48 | `node:path join` | node | 7 | 7 | 1288 | 679 | 1198 | read-after-call 7 |
| 49 | `global Object.values` | ecmascript | 7 | 7 | 1295 | 261 | 292 | read-after-call 7 |
| 50 | `drizzle-orm PgSelectQueryBuilderBase.prototype.orderBy` | package | 7 | 7 | 1302 | 39 | 45 | read-after-call 7 |

## Population 1, all origins (project files and untyped receivers included), top 50

| # | Callee | Origin | Only by it | Among | Cumulative | Callers | Calls | Refusals naming it |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | `global new Promise` | ecmascript | 404 | 410 | 404 | 434 | 464 | promise-pending 300, promise 211, promise-executor-escape 86 |
| 2 | `apps/backend/src/_common/domain/result.ts isErr` | project | 153 | 153 | 557 | 763 | 1192 | read-after-call 153 |
| 3 | `react useCallback` | package | 82 | 82 | 639 | 1106 | 2949 | read-after-call 82 |
| 4 | `global Array.prototype.forEach` | ecmascript | 80 | 94 | 719 | 788 | 1142 | foreach 68, read-after-call 36, type-assertion 2 |
| 5 | `packages/workflow/src/Interfaces.ts ExecuteFunctions.getNodeParameter` | project | 63 | 65 | 782 | 855 | 9086 | read-after-call 62, type-assertion 4, opaque-mutation 1 |
| 6 | `global JSON.stringify` | ecmascript | 63 | 63 | 845 | 2035 | 2812 | read-after-call 63 |
| 7 | `global Math.max` | ecmascript | 53 | 63 | 898 | 756 | 934 | math-empty 63 |
| 8 | `packages/core/src/index.ts isPlainObject` | project | 49 | 49 | 947 | 55 | 85 | read-after-call 49 |
| 9 | `core/claude-wire/src/claude-tool-input.ts jsonString` | project | 46 | 46 | 993 | 60 | 177 | read-after-call 46 |
| 10 | `global Array.prototype.find` | ecmascript | 34 | 38 | 1027 | 1353 | 1684 | read-after-call 30, non-null-assertion 8, unsupported-call 1 |
| 11 | `global Array.prototype.some` | ecmascript | 31 | 34 | 1058 | 1008 | 1183 | read-after-call 34 |
| 12 | `apps/frontend/src/modules/Workflow/utils/get-dependent-variables.ts getDependentVariables` | project | 31 | 31 | 1089 | 34 | 34 | read-after-call 31 |
| 13 | `global Math.min` | ecmascript | 27 | 37 | 1126 | 527 | 656 | math-empty 37 |
| 14 | `global Array.prototype.join` | ecmascript | 27 | 27 | 1153 | 2769 | 3784 | read-after-call 15, type-assertion 12 |
| 15 | `(untyped) useList` | untyped | 25 | 28 | 1178 | 99 | 116 | read-after-call 28, type-assertion 3 |
| 16 | `global Date.prototype.getTime` | ecmascript | 25 | 25 | 1203 | 390 | 658 | read-after-call 25 |
| 17 | `(untyped) find` | untyped | 24 | 32 | 1227 | 310 | 384 | read-after-call 32 |
| 18 | `global JSON.parse` | ecmascript | 23 | 24 | 1251 | 765 | 864 | type-assertion 22, read-after-call 2, promise-pending 1 |
| 19 | `(untyped) filter` | untyped | 22 | 25 | 1273 | 459 | 601 | read-after-call 25 |
| 20 | `i18next TFunctionNonStrict` | package | 22 | 22 | 1295 | 281 | 1376 | unsupported-call 18, read-after-call 4 |
| 21 | `(untyped) startsWith` | untyped | 22 | 22 | 1317 | 149 | 186 | read-after-call 22 |
| 22 | `core/domain/src/index.ts structurallyEqual` | project | 21 | 21 | 1338 | 55 | 64 | read-after-call 21 |
| 23 | `global Promise.all` | ecmascript | 20 | 20 | 1358 | 674 | 737 | read-after-call 20 |
| 24 | `apps/backend/src/workflow/workflow-engine/workflow-node-executor/utils.ts deepCopy` | project | 20 | 20 | 1378 | 2 | 4 | read-after-call 20 |
| 25 | `@n8n/typeorm Repository.prototype.find` | package | 19 | 19 | 1397 | 71 | 86 | read-after-call 19 |
| 26 | `packages/schema/src/issues.ts duplicateIndexes` | project | 19 | 19 | 1416 | 11 | 14 | read-after-call 19 |
| 27 | `src/search/vocabulary.ts GROUP_OF.get` | project | 19 | 19 | 1435 | 6 | 10 | type-assertion 19 |
| 28 | `src/i18n/index.ts t` | project | 18 | 18 | 1453 | 304 | 1145 | read-after-call 18 |
| 29 | `playwright-core Locator.prototype.evaluateAll` | package | 18 | 18 | 1471 | 14 | 19 | read-after-call 18 |
| 30 | `tools/proof-host/src/cli-replies.ts list` | project | 17 | 20 | 1488 | 7 | 14 | read-after-call 20 |
| 31 | `packages/react/src/utils/cn.ts cn` | project | 17 | 17 | 1505 | 80 | 98 | read-after-call 17 |
| 32 | `lodash/get default` | package | 16 | 16 | 1521 | 93 | 223 | type-assertion 9, read-after-call 7 |
| 33 | `node:fs StatsBase.prototype.isDirectory` | node | 16 | 16 | 1537 | 63 | 68 | read-after-call 16 |
| 34 | `packages/cli/src/databases/entities/User.ts User.prototype.hasGlobalScope` | project | 16 | 16 | 1553 | 16 | 17 | read-after-call 16 |
| 35 | `packages/checks/src/support/text.ts textSegments` | project | 16 | 16 | 1569 | 2 | 2 | read-after-call 16 |
| 36 | `global Object.keys` | ecmascript | 15 | 17 | 1584 | 1443 | 2152 | read-after-call 14, type-assertion 3 |
| 37 | `playwright-core ElectronApplication.prototype.evaluate` | package | 15 | 15 | 1599 | 56 | 65 | read-after-call 15 |
| 38 | `packages/adapters/src/claude-code/format.ts isRecord` | project | 15 | 15 | 1614 | 21 | 41 | read-after-call 15 |
| 39 | `better-sqlite3 BetterSqlite3.Transaction` | package | 15 | 15 | 1629 | 14 | 14 | unsupported-call 15 |
| 40 | `packages/core/src/spec/normalize.ts isPlainObject` | project | 15 | 15 | 1644 | 6 | 9 | read-after-call 15 |
| 41 | `packages/space/src/index.ts gridSize` | project | 14 | 15 | 1658 | 7 | 7 | read-after-call 15 |
| 42 | `(untyped) some` | untyped | 14 | 14 | 1672 | 102 | 113 | read-after-call 14 |
| 43 | `global new Proxy` | ecmascript | 14 | 14 | 1686 | 18 | 21 | prototype 14 |
| 44 | `global Map.prototype.values` | ecmascript | 13 | 14 | 1699 | 251 | 287 | alias-mutation 7, collection-iterator 7, read-after-call 1 |
| 45 | `apps/backend/src/workflow/workflow-engine/workflow-node-executor/nodes/Abstract.ts AbstractNode.prototype.replaceVariablesAndExtractText` | project | 13 | 14 | 1712 | 33 | 52 | read-after-call 14, this 1 |
| 46 | `packages/core/src/progress/lookup.ts ContentLookup.prototype.courseUids` | project | 13 | 14 | 1725 | 3 | 3 | read-after-call 14 |
| 47 | `global CallableFunction.prototype.call` | ecmascript | 13 | 13 | 1738 | 611 | 790 | type-assertion 11, read-after-call 2 |
| 48 | `@smithy/smithy-client Client.prototype.send` | package | 13 | 13 | 1751 | 19 | 25 | read-after-call 13 |
| 49 | `packages/core/src/index.ts initialGiven` | project | 13 | 13 | 1764 | 1 | 1 | read-after-call 13 |
| 50 | `typedi Container.get` | package | 12 | 12 | 1776 | 170 | 320 | read-after-call 12 |

## Population 1, outside the language (web, node, package), top 50

| # | Callee | Origin | Only by it | Among | Cumulative | Callers | Calls | Refusals naming it |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | `react useCallback` | package | 82 | 82 | 82 | 1106 | 2949 | read-after-call 82 |
| 2 | `i18next TFunctionNonStrict` | package | 22 | 22 | 104 | 281 | 1376 | unsupported-call 18, read-after-call 4 |
| 3 | `@n8n/typeorm Repository.prototype.find` | package | 19 | 19 | 123 | 71 | 86 | read-after-call 19 |
| 4 | `playwright-core Locator.prototype.evaluateAll` | package | 18 | 18 | 141 | 14 | 19 | read-after-call 18 |
| 5 | `lodash/get default` | package | 16 | 16 | 157 | 93 | 223 | type-assertion 9, read-after-call 7 |
| 6 | `node:fs StatsBase.prototype.isDirectory` | node | 16 | 16 | 173 | 63 | 68 | read-after-call 16 |
| 7 | `playwright-core ElectronApplication.prototype.evaluate` | package | 15 | 15 | 188 | 56 | 65 | read-after-call 15 |
| 8 | `better-sqlite3 BetterSqlite3.Transaction` | package | 15 | 15 | 203 | 14 | 14 | unsupported-call 15 |
| 9 | `@smithy/smithy-client Client.prototype.send` | package | 13 | 13 | 216 | 19 | 25 | read-after-call 13 |
| 10 | `typedi Container.get` | package | 12 | 12 | 228 | 170 | 320 | read-after-call 12 |
| 11 | `commander Command.prototype.name` | package | 12 | 12 | 240 | 39 | 48 | read-after-call 12 |
| 12 | `drizzle-orm PgSelectBuilder.prototype.from` | package | 10 | 10 | 250 | 123 | 171 | read-after-call 10 |
| 13 | `next/navigation notFound` | package | 10 | 10 | 260 | 13 | 15 | read-after-call 10 |
| 14 | `global Node.prototype.appendChild` | web | 9 | 10 | 269 | 33 | 62 | read-after-call 10 |
| 15 | `react useState` | package | 9 | 9 | 278 | 1743 | 4534 | read-after-call 9 |
| 16 | `react useMemo` | package | 9 | 9 | 287 | 877 | 1556 | read-after-call 9 |
| 17 | `@n8n/typeorm Repository.prototype.findOneBy` | package | 9 | 9 | 296 | 20 | 21 | read-after-call 9 |
| 18 | `zustand useStore` | package | 9 | 9 | 305 | 19 | 24 | read-after-call 9 |
| 19 | `node:buffer BufferConstructor.prototype.from` | node | 8 | 9 | 313 | 183 | 241 | copied-argument 8, read-after-call 1 |
| 20 | `global Element.prototype.getAttribute` | web | 8 | 8 | 321 | 36 | 61 | read-after-call 8 |
| 21 | `commander Command.prototype.exitOverride` | package | 8 | 8 | 329 | 10 | 10 | read-after-call 8 |
| 22 | `drizzle-orm sql` | package | 7 | 9 | 336 | 35 | 73 | copied-argument 7, read-after-call 2 |
| 23 | `node:path join` | node | 7 | 7 | 343 | 679 | 1198 | read-after-call 7 |
| 24 | `drizzle-orm PgSelectQueryBuilderBase.prototype.orderBy` | package | 7 | 7 | 350 | 39 | 45 | read-after-call 7 |
| 25 | `pg Pool.prototype.query` | package | 7 | 7 | 357 | 8 | 10 | read-after-call 7 |
| 26 | `node:path basename` | node | 6 | 6 | 363 | 110 | 136 | read-after-call 6 |
| 27 | `node AbortController.prototype.abort` | node | 6 | 6 | 369 | 41 | 46 | read-after-call 6 |
| 28 | `node:path posix.join` | node | 6 | 6 | 375 | 17 | 27 | read-after-call 6 |
| 29 | `typescript isPropertyAccessExpression` | package | 6 | 6 | 381 | 15 | 17 | read-after-call 6 |
| 30 | `node:fs StatsBase.prototype.isSymbolicLink` | node | 6 | 6 | 387 | 12 | 12 | read-after-call 6 |
| 31 | `aws4 sign` | package | 6 | 6 | 393 | 8 | 8 | read-after-call 6 |
| 32 | `zustand (anonymous)` | package | 5 | 6 | 398 | 7 | 7 | unsupported-call 6, read-after-call 1 |
| 33 | `drizzle-orm PgSelectQueryBuilderBase.prototype.where` | package | 5 | 5 | 403 | 115 | 157 | read-after-call 5 |
| 34 | `drizzle-orm PgSelectQueryBuilderBase.prototype.limit` | package | 5 | 5 | 408 | 52 | 72 | read-after-call 5 |
| 35 | `global FormData.prototype.append` | web | 5 | 5 | 413 | 41 | 84 | read-after-call 5 |
| 36 | `lodash/omit default` | package | 5 | 5 | 418 | 30 | 38 | read-after-call 5 |
| 37 | `react-hook-form (anonymous)` | package | 5 | 5 | 423 | 6 | 7 | read-after-call 5 |
| 38 | `vue-i18n VueI18n.prototype.te` | package | 5 | 5 | 428 | 2 | 2 | read-after-call 5 |
| 39 | `global console.log` | node | 4 | 4 | 432 | 779 | 2464 | read-after-call 4 |
| 40 | `global console.error` | node | 4 | 4 | 436 | 457 | 701 | read-after-call 4 |
| 41 | `playwright-core Locator.prototype.count` | package | 4 | 4 | 440 | 145 | 210 | read-after-call 4 |
| 42 | `global Body.prototype.json` | web | 4 | 4 | 444 | 144 | 182 | type-assertion 3, read-after-call 1 |
| 43 | `drizzle-orm eq` | package | 4 | 4 | 448 | 132 | 262 | read-after-call 4 |
| 44 | `typedi get` | package | 4 | 4 | 452 | 72 | 104 | read-after-call 4 |
| 45 | `expect Matchers.prototype.toBeDefined` | package | 4 | 4 | 456 | 36 | 71 | read-after-call 4 |
| 46 | `global DOMTokenList.prototype.add` | web | 4 | 4 | 460 | 33 | 53 | alias-mutation 4 |
| 47 | `node:console Console.prototype.warn` | node | 4 | 4 | 464 | 7 | 18 | unsupported-call 4 |
| 48 | `global AbortSignal.any` | web | 4 | 4 | 468 | 6 | 6 | read-after-call 4 |
| 49 | `node:module NodeJS.Require` | node | 4 | 4 | 472 | 5 | 5 | type-assertion 4 |
| 50 | `undici-types FormData.prototype.append` | node | 4 | 4 | 476 | 5 | 11 | read-after-call 4 |

## Population 2, the 13 corpus repositories

Not counted in this snapshot (see Coverage). Command, once population 1 is done (the driver queues it):
`bash lane/w2a-callee-census-run.sh corpus <runs> /root/census-corpus/<repo>...` then
`bash lane/w2a-callee-census-tables.sh corpus <runs> <tables>`. Three of the thirteen are almost all JavaScript
(three.js 0 TypeScript files, svelte 2, node 51), so the TypeScript census reads little of them.

## Known naming flaw

`Buffer.from` is keyed `node:buffer BufferConstructor.prototype.from`: the `XConstructor` interface is read as `X` statics
only in the language's own declaration files (callees.mjs declarationPath), not in @types/node. The count is right; the
name should be `node:buffer Buffer.from`. Not changed under a running population, so every table keys it one way.
