# Candidate-only census, link-only refusal

The same 3756 units were rerun across all 288 corpus sides: 118 resolvable defect sides and 115 resolvable fix sides. The 26 unavailable defect sides and 29 unavailable fix sides remain listed below. Inventory names come from actual commit trees, not corpus function arrays. The inventory keeps the fork 9cb4107 function/arrow/constructor/method contract; accessors introduced by the later rebase are not added to this fixed population. Runtime TS/JS source is inspected; declaration-only files have no execution target. Tests remain in the population and return ASK(test module) before loading.

Each eligible unit uses three drawn inputs, seed one and a 500 ms asynchronous budget. Loaded includes NEW and any ASK after a successful load. NEW with faults counts units, not thrown inputs. Process failures and budgets remain ASK. Declared external packages are recording fakes; local and aliased source resolves through TypeScript and links through Node.

| side | repository | resolvable commits | units | loaded | REFUSE(load) | NEW | NEW with faults | ASK |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| defect | NexusGPT/driftbench | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| defect | NexusGPT/nexus | 97 | 3257 | 2121 | 0 | 2108 | 820 | 1149 |
| defect | NexusGPT/nexus-desktop | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| defect | NexusGPT/nexus-landing | 3 | 119 | 113 | 0 | 113 | 25 | 6 |
| defect | NexusGPT/nutshell | 5 | 1 | 0 | 0 | 0 | 0 | 1 |
| defect | pyka | 9 | 31 | 13 | 13 | 13 | 4 | 5 |
| fix | NexusGPT/driftbench | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| fix | NexusGPT/nexus | 95 | 344 | 160 | 0 | 159 | 58 | 185 |
| fix | NexusGPT/nexus-desktop | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| fix | NexusGPT/nexus-landing | 3 | 1 | 1 | 0 | 1 | 0 | 0 |
| fix | NexusGPT/nutshell | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| fix | pyka | 9 | 3 | 1 | 0 | 1 | 0 | 2 |

## Refusal audit

There are 13 defect-side refusals and zero fix-side refusals. Every refusal was checked for phase=link, an owned local edge, an allowed linkage kind, no environment class and a retained real loader error. Evaluation exceptions cannot satisfy this gate. Every process-level incomplete result was retried; none remains. The remaining pyka-d48b7fa import was also reread with git show: _captures/plan/harness.tsx:8 imports ../../src/engine/mealplan.ts. git ls-tree at d48b7fa2 lists only basket.ts, multibuy.ts and search.ts under src/engine; mealplan.ts is absent. All thirteen units share that failed source edge. This is a capture harness, not a test module matching the excluded filename patterns.

| key | source and unit | link-time reason |
|---|---|---|
| pyka-d48b7fa | _captures/plan/harness.tsx:25 str | unresolved source: ../../src/engine/mealplan.ts |
| pyka-d48b7fa | _captures/plan/harness.tsx:39 planShops | unresolved source: ../../src/engine/mealplan.ts |
| pyka-d48b7fa | _captures/plan/harness.tsx:43 label | unresolved source: ../../src/engine/mealplan.ts |
| pyka-d48b7fa | _captures/plan/harness.tsx:47 planSetupData | unresolved source: ../../src/engine/mealplan.ts |
| pyka-d48b7fa | _captures/plan/harness.tsx:57 planResultData | unresolved source: ../../src/engine/mealplan.ts |
| pyka-d48b7fa | _captures/plan/harness.tsx:67 bestOffers | unresolved source: ../../src/engine/mealplan.ts |
| pyka-d48b7fa | _captures/plan/harness.tsx:84 toMatch | unresolved source: ../../src/engine/mealplan.ts |
| pyka-d48b7fa | _captures/plan/harness.tsx:104 alertsData | unresolved source: ../../src/engine/mealplan.ts |
| pyka-d48b7fa | _captures/plan/harness.tsx:137 alertNewData | unresolved source: ../../src/engine/mealplan.ts |
| pyka-d48b7fa | _captures/plan/harness.tsx:159 accountData | unresolved source: ../../src/engine/mealplan.ts |
| pyka-d48b7fa | _captures/plan/harness.tsx:171 signUpData | unresolved source: ../../src/engine/mealplan.ts |
| pyka-d48b7fa | _captures/plan/harness.tsx:175 chromeShops | unresolved source: ../../src/engine/mealplan.ts |
| pyka-d48b7fa | _captures/plan/harness.tsx:185 renderScreen | unresolved source: ../../src/engine/mealplan.ts |

pyka-d48b7fa: _captures/plan/harness.tsx; 13 units. Original loader text:
```text
Error: Cannot find module '../../src/engine/mealplan.ts'
Require stack:
- /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/work/bench/new-unit-load/tree/_captures/plan/harness.tsx
    at Module._resolveFilename (node:internal/modules/cjs/loader:1517:15)
    at wrapResolveFilename (node:internal/modules/cjs/loader:1071:27)
    at resolveForCJSWithHooks (node:internal/modules/cjs/loader:1122:12)
    at require.resolve (node:internal/modules/helpers:171:31)
    at resolveModule (file:///Users/assem/nexus/nexus-organisation/work/lean-lanes/new-unit-load/langs/ts/exec/new-unit.mjs:59:22)
    at link (file:///Users/assem/nexus/nexus-organisation/work/lean-lanes/new-unit-load/langs/ts/exec/new-unit.mjs:129:22)
    at [kLink] (node:internal/vm/module:345:28)
    at SourceTextModule.link (node:internal/vm/module:208:22)
    at loadCandidate (file:///Users/assem/nexus/nexus-organisation/work/lean-lanes/new-unit-load/langs/ts/exec/new-unit.mjs:156:15)
    at runNew (file:///Users/assem/nexus/nexus-organisation/work/lean-lanes/new-unit-load/langs/ts/exec/new-unit.mjs:221:11)
```

## ASK classes

| side | class | units |
|---|---|---:|
| defect | CommonJS wrapper | 95 |
| defect | build asset | 5 |
| defect | build-injected env | 42 |
| defect | fake answering at module evaluation | 65 |
| defect | input execution or spec | 13 |
| defect | missing generated output | 147 |
| defect | test module | 789 |
| defect | undeclared external package | 5 |
| fix | CommonJS wrapper | 3 |
| fix | fake answering at module evaluation | 18 |
| fix | input execution or spec | 1 |
| fix | platform global | 2 |
| fix | test module | 163 |

All 149 previously refused clean-side units available for comparison now avoid REFUSE. Their current outcomes/classes are: CommonJS wrapper: 3, NEW: 1, fake answering at module evaluation: 18, platform global: 2, test module: 125.

Of the 149 former clean-side refusals, 148 are ASK and one is NEW: pyka-d48b7fa / _captures/plan/drive-app.mjs / say. Its absolute import resolves into node_modules and is now an external recording fake, so no CommonJS package body is evaluated. It runs three inputs with zero faults; no browser is launched.

## Unavailable sides

defect: driftbench_105, driftbench_428, driftbench_712, driftbench_758, driftbench_778, driftbench_971, driftbench_1339, nexus_4281, nexus_7766, nexus_7784, nexus_7797, nexus_7869, nexus_7886, nexus_7907, nexus_7914, nexus_8011, nexus_8080, nexus_8090, nexus_8099, nexus_8145, nexus_8223, nexus_8241, nexus_8247, nexus_8252, nexus_8315, nexus_8362.
fix: driftbench_105, driftbench_428, driftbench_712, driftbench_758, driftbench_778, driftbench_971, driftbench_1339, nexus_4281, nexus_6963, nexus_7024, nexus_7766, nexus_7784, nexus_7797, nexus_7869, nexus_7886, nexus_7907, nexus_7914, nexus_8011, nexus_8080, nexus_8090, nexus_8099, nexus_8145, nexus_8223, nexus_8241, nexus_8247, nexus_8252, nexus_8315, nexus_8362, nutshell_514.

## nexus-119

apps/frontend/src/modules/Workflow/Core/nodeIcons.tsx / getNodeIcon: NEW, 3 inputs, 0 faults. Its local import graph links under the declared-package fakes.

Pairing question: the supplied repair e0925e6d805 identifies itself as NEX-784, FlowExecution lazy loading, not the icons file. The supplied mapping is retained for the lead to correct.

## Reproduction and raw evidence

Raw inventory, complete unit results, traces, fault counts and process logs are under /Users/assem/nexus/nexus-organisation/work/lean-lanes/new-unit-load/results-bench/new-unit-load, which is gitignored. Run scripts/census-new-unit.py to reconstruct the tree inventory, scripts/run-census.py for execution, and scripts/report-new-unit.py for this report. Exact population coverage, unique keys, zero fix refusals and the refusal-phase gate are asserted by the reporting script.
