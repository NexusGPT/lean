# Lane w2a-callee-census: result (2026-11-01)

Branch `lane/w2a-callee-census` (from 4747022f). Code: `langs/ts/callees.mjs`, `langs/ts/census.mjs --callees` and
`--callee-table`. Notes: `langs/ts/design/w2a-callee-census.md` (what, why, the argument, the test),
`langs/ts/design/callee-census-2026-11.md` (the ranked tables), tables in `langs/ts/design/callee-census-2026-11/`.
Scripts: `lane/w2a-callee-census-run.sh`, `lane/w2a-callee-census-tables.sh`, `lane/w2a-callee-census-summary.mjs`.

## Status

- Mechanism, fixture, suite row: done, green; red first and `--break` red.
- Population 1 (the 39 census roots, manifest `/root/da/harness/regress-census-roots.json`): **18 of 39 counted**; the
  run was load-gated (one-minute load above 40 at most five-minute readings, 02:35 to 11:00 UTC).
- Population 2 (the 13 corpus repositories): **not counted**; clones ready, run queued behind population 1. OPEN.
- Top 20 sent to the group: a provisional list from 3 roots at 04:30 UTC (the blocker message); the 18-root list at the end.

## Tests (each command run from the tree root)

- `node langs/ts/tests/census_callees.mjs`: 14 checks, `census-callees: all hold`.
- `node langs/ts/tests/census_callees.mjs --break`: 13 checks fail (containment attribution: 7; empty library table: 6), exit 1.
- Red first: the same test against the census of 4747022f (a worktree of that commit with the test, the fixture and
  callees.mjs copied in): `TypeError: Cannot read properties of undefined (reading 'rows')`, exit 1 (no `calleeTable`).
- `LEAN_PAIRS=census-callees,census-environment,census-partial,census-example-message node langs/ts/tests/run.mjs`:
  every row PASS (census-usage and the other rows it ran too). No change under `translate/` or `lint/`, so no
  conformance run is owed.
- No count changes: `node langs/ts/census.mjs /root/da/census/repos/agent-nexus --out a.json` with and without
  `--callees`: both 4,171 units, 1,465 entered, 1,726 environment-blocked, 644 language-refused.

## Population 1: 18 roots

Command per root: `bash lane/w2a-callee-census-run.sh roots /root/lanes/w2a-callee-census/runs/roots /root/da/census/repos/<root>...`
(copy to `/root/census-installs/w2a/roots-<root>`, `NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs <copy>
--install-under /root/census-installs/w2a --npm-cache /root/census-installs/w2a/.npm-cache --callees --clean-after
--out <runs>/<root>.json --report <runs>/<root>.md`, the copy removed). Tables:
`bash lane/w2a-callee-census-tables.sh roots /root/lanes/w2a-callee-census/runs/roots <tables>`.

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

- Units 97,743; refused 54,288; **callee-only 4,690** (8.6% of refused), 178 naming several callees; 32,366 distinct outside callees.
- Origins of the callee-only units: project 2558, ecmascript 1074, package 538, untyped 304, node 108, web 60, ecmascript+project 14.
- Rules: read-after-call alone 3,607 (76.9%), promise+promise-pending 207, type-assertion 151, unsupported-call 135, math-empty 90.
- Cumulative: world view top 20 → 1,016 (21.7%), top 50 → 1,302; all origins top 20 → 1,295, top 50 → 1,776.

### Top 20, the world library view (ecmascript, web, node, package)

| # | Callee | Origin | Only by it | Among | Cumulative | Callers | Calls | Refusals naming it |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | `global new Promise` | ecmascript | 404 | 410 | 404 | 434 | 464 | promise-pending 300, promise 211 |
| 2 | `react useCallback` | package | 82 | 82 | 486 | 1106 | 2949 | read-after-call 82 |
| 3 | `global Array.prototype.forEach` | ecmascript | 80 | 94 | 566 | 788 | 1142 | foreach 68, read-after-call 36 |
| 4 | `global JSON.stringify` | ecmascript | 63 | 63 | 629 | 2035 | 2812 | read-after-call 63 |
| 5 | `global Math.max` | ecmascript | 53 | 63 | 682 | 756 | 934 | math-empty 63 |
| 6 | `global Array.prototype.find` | ecmascript | 34 | 38 | 716 | 1353 | 1684 | read-after-call 30, non-null-assertion 8 |
| 7 | `global Array.prototype.some` | ecmascript | 31 | 34 | 747 | 1008 | 1183 | read-after-call 34 |
| 8 | `global Math.min` | ecmascript | 27 | 37 | 784 | 527 | 656 | math-empty 37 |
| 9 | `global Array.prototype.join` | ecmascript | 27 | 27 | 811 | 2769 | 3784 | read-after-call 15, type-assertion 12 |
| 10 | `global Date.prototype.getTime` | ecmascript | 25 | 25 | 836 | 390 | 658 | read-after-call 25 |
| 11 | `global JSON.parse` | ecmascript | 23 | 24 | 860 | 765 | 864 | type-assertion 22, read-after-call 2 |
| 12 | `i18next TFunctionNonStrict` | package | 22 | 22 | 882 | 281 | 1376 | unsupported-call 18, read-after-call 4 |
| 13 | `global Promise.all` | ecmascript | 20 | 20 | 902 | 674 | 737 | read-after-call 20 |
| 14 | `@n8n/typeorm Repository.prototype.find` | package | 19 | 19 | 921 | 71 | 86 | read-after-call 19 |
| 15 | `playwright-core Locator.prototype.evaluateAll` | package | 18 | 18 | 939 | 14 | 19 | read-after-call 18 |
| 16 | `lodash/get default` | package | 16 | 16 | 955 | 93 | 223 | type-assertion 9, read-after-call 7 |
| 17 | `node:fs StatsBase.prototype.isDirectory` | node | 16 | 16 | 971 | 63 | 68 | read-after-call 16 |
| 18 | `global Object.keys` | ecmascript | 15 | 17 | 986 | 1443 | 2152 | read-after-call 14, type-assertion 3 |
| 19 | `playwright-core ElectronApplication.prototype.evaluate` | package | 15 | 15 | 1001 | 56 | 65 | read-after-call 15 |
| 20 | `better-sqlite3 BetterSqlite3.Transaction` | package | 15 | 15 | 1016 | 14 | 14 | unsupported-call 15 |

### Top 20, all origins

| # | Callee | Origin | Only by it | Among | Cumulative | Callers | Calls | Refusals naming it |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | `global new Promise` | ecmascript | 404 | 410 | 404 | 434 | 464 | promise-pending 300, promise 211 |
| 2 | `apps/backend/src/_common/domain/result.ts isErr` | project | 153 | 153 | 557 | 763 | 1192 | read-after-call 153 |
| 3 | `react useCallback` | package | 82 | 82 | 639 | 1106 | 2949 | read-after-call 82 |
| 4 | `global Array.prototype.forEach` | ecmascript | 80 | 94 | 719 | 788 | 1142 | foreach 68, read-after-call 36 |
| 5 | `packages/workflow/src/Interfaces.ts ExecuteFunctions.getNodeParameter` | project | 63 | 65 | 782 | 855 | 9086 | read-after-call 62, type-assertion 4 |
| 6 | `global JSON.stringify` | ecmascript | 63 | 63 | 845 | 2035 | 2812 | read-after-call 63 |
| 7 | `global Math.max` | ecmascript | 53 | 63 | 898 | 756 | 934 | math-empty 63 |
| 8 | `packages/core/src/index.ts isPlainObject` | project | 49 | 49 | 947 | 55 | 85 | read-after-call 49 |
| 9 | `core/claude-wire/src/claude-tool-input.ts jsonString` | project | 46 | 46 | 993 | 60 | 177 | read-after-call 46 |
| 10 | `global Array.prototype.find` | ecmascript | 34 | 38 | 1027 | 1353 | 1684 | read-after-call 30, non-null-assertion 8 |
| 11 | `global Array.prototype.some` | ecmascript | 31 | 34 | 1058 | 1008 | 1183 | read-after-call 34 |
| 12 | `apps/frontend/src/modules/Workflow/utils/get-dependent-variables.ts getDependentVariables` | project | 31 | 31 | 1089 | 34 | 34 | read-after-call 31 |
| 13 | `global Math.min` | ecmascript | 27 | 37 | 1126 | 527 | 656 | math-empty 37 |
| 14 | `global Array.prototype.join` | ecmascript | 27 | 27 | 1153 | 2769 | 3784 | read-after-call 15, type-assertion 12 |
| 15 | `(untyped) useList` | untyped | 25 | 28 | 1178 | 99 | 116 | read-after-call 28, type-assertion 3 |
| 16 | `global Date.prototype.getTime` | ecmascript | 25 | 25 | 1203 | 390 | 658 | read-after-call 25 |
| 17 | `(untyped) find` | untyped | 24 | 32 | 1227 | 310 | 384 | read-after-call 32 |
| 18 | `global JSON.parse` | ecmascript | 23 | 24 | 1251 | 765 | 864 | type-assertion 22, read-after-call 2 |
| 19 | `(untyped) filter` | untyped | 22 | 25 | 1273 | 459 | 601 | read-after-call 25 |
| 20 | `i18next TFunctionNonStrict` | package | 22 | 22 | 1295 | 281 | 1376 | unsupported-call 18, read-after-call 4 |

Top 50 of each view: `langs/ts/design/callee-census-2026-11.md`.

## Reading the numbers

- The validator threshold of W2 (the top 20 entries unblock ≥ 80% of the attributed units) is not reachable by per-callee
  entries on this population: the world top 20 lets in 21.7%. The units share a refusal, not a callee: 76.9% are
  refused only by read-after-call, whose barrier is the unknown effect of the call on its arguments. A per-callee fact
  "writes none of its arguments", checked by lane B's recording, lifts them for any callee, project files included
  (2,558 units no world fake reaches). That is a proposal for W2 and W1, not done here.
- `global new Promise` (404 units) is refused by the promise readings (promise-pending, promise-executor-escape): the
  callee is the language's constructor; a row would not lift it, the promise readings would.

## Population 2: the 13 corpus repositories (OPEN)

Clones, shallow, default branch, under `/root/census-corpus/<owner>__<repo>` (`git clone --depth 1 --single-branch`):
- bluewave-labs/Checkmate df3f2fbabd95ea09509468c4990dd92fc0886e95
- CherryHQ/cherry-studio 72041cd52010d19ea961dc93cf7bc1c71cc39d4e
- cline/cline a6507a62a147db4a35e27f4294589742ccac5060
- facebook/react 76baa3b5434fad315ece9cfd4d20d7a8d6c34a25
- google-gemini/gemini-cli 6814e00d6b148c3a1d57244d5d7040f7c541009d
- immich-app/immich 3184b1532fd74a0b777207f8a86e9efe7dafce65
- infiniflow/ragflow 12d9a38e24bf3fb8573b83bc41a2fe75dcd2c281
- microsoft/typescript-go 89d5d5b2849a0db0957065889ca58536fa6d2e4a
- mrdoob/three.js fa01dd6ad164c48554f1bb9456f6500db052ec4f
- n8n-io/n8n c44bd78f3834fb4e5a14cdcee96d552a9c4e4e92
- nodejs/node e97c75e15482eba7a4208e68a763fc0a0fcc9ee9
- sveltejs/svelte fe21fce019e7797a9eeb5066211ff42e4e7cca8d
- wavetermdev/waveterm 9f1c9670d407be3b93cf090319a63ef30bf54d0e

`/root/da-calib/checkouts` holds only n8n PR checkouts and a `44` folder, so it was not used. Command:
`bash lane/w2a-callee-census-run.sh corpus /root/lanes/w2a-callee-census/runs/corpus /root/census-corpus/*` then
`bash lane/w2a-callee-census-tables.sh corpus /root/lanes/w2a-callee-census/runs/corpus <tables>`. three.js has 0
TypeScript files, svelte 2, node 51: the TypeScript census reads little of them.

## Open

1. 21 roots of population 1 and all 13 corpus repositories: resume with the two commands above (the runner keeps every
   root whose log ends `exit 0`; runs under `/root/lanes/w2a-callee-census/runs/`).
2. `Buffer.from` is keyed `node:buffer BufferConstructor.prototype.from` (XConstructor folded only in the language's own
   lib files); count right, name wrong. Fix in callees.mjs `declarationPath` before the next population.
3. Four roots' installs failed (nexus, nexus-ui, apps-starter, status; private `@agent-nexus/tokens` 404 for the pnpm
   roots): W6.
