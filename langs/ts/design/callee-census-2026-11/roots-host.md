# Callee census, roots: outside the language (web, node, package)

Roots: 18. Units: 97743. Refused (not entered): 54288. Units whose every refusal names an unmodelled outside call: 4690 (8.6% of refused), of which 178 name more than one callee. Distinct outside callees: 32366.

Callee-only units by origin of their callees: project 2558, ecmascript 1074, package 538, untyped 304, node 108, web 60, ecmascript+project 14, ecmascript+untyped 10, package+project 7, ecmascript+node 5, project+untyped 5, ecmascript+web 4, ecmascript+package 2, project+web 1.

View: callees of origin web, node, package. The first 20 entries let in 321 of the 4690 callee-only units (6.8%); the first 50, 476 (10.1%).

"Only by it": units whose refusals name this callee and no other. "Among": units whose refusals name it, alone or beside others. "Cumulative": units every callee of which ranks at or above this row. "Callers": units calling it at all.

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
