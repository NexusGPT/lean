# Callee census, roots: all origins

Roots: 18. Units: 97743. Refused (not entered): 54288. Units whose every refusal names an unmodelled outside call: 4690 (8.6% of refused), of which 178 name more than one callee. Distinct outside callees: 32366.

Callee-only units by origin of their callees: project 2558, ecmascript 1074, package 538, untyped 304, node 108, web 60, ecmascript+project 14, ecmascript+untyped 10, package+project 7, ecmascript+node 5, project+untyped 5, ecmascript+web 4, ecmascript+package 2, project+web 1.

The first 20 entries let in 1295 of the 4690 callee-only units (27.6%); the first 50, 1776 (37.9%).

"Only by it": units whose refusals name this callee and no other. "Among": units whose refusals name it, alone or beside others. "Cumulative": units every callee of which ranks at or above this row. "Callers": units calling it at all.

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
