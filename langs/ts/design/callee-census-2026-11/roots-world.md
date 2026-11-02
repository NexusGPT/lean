# Callee census, roots: the world library (ecmascript, web, node, package)

Roots: 18. Units: 97743. Refused (not entered): 54288. Units whose every refusal names an unmodelled outside call: 4690 (8.6% of refused), of which 178 name more than one callee. Distinct outside callees: 32366.

Callee-only units by origin of their callees: project 2558, ecmascript 1074, package 538, untyped 304, node 108, web 60, ecmascript+project 14, ecmascript+untyped 10, package+project 7, ecmascript+node 5, project+untyped 5, ecmascript+web 4, ecmascript+package 2, project+web 1.

View: callees of origin ecmascript, web, node, package. The first 20 entries let in 1016 of the 4690 callee-only units (21.7%); the first 50, 1302 (27.8%).

"Only by it": units whose refusals name this callee and no other. "Among": units whose refusals name it, alone or beside others. "Cumulative": units every callee of which ranks at or above this row. "Callers": units calling it at all.

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
