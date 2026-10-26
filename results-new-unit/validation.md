# New-unit validation

The revised census was measured on the original fork, then the lane was rebased once onto 03ec3bc as requested. Final focused checks and the one full suite ran after that rebase. The paired execution path has no change after the candidate-only dispatch. No equality theorem is generated for a new unit, so the proof-pair and witness-score requirements are inapplicable to this reading. Ordinary lint and translation were measured separately.

## Ten real units

| version | ordinary lint | ordinary translate | standalone verdicts |
|---|---:|---:|---|
| before | 2/10 | 6/10 | {'ASK': 10} |
| after | 2/10 | 6/10 | {'NEW': 5, 'ASK': 4, 'REFUSE': 1} |

The before runner was exported from fork 9cb4107; it was given an empty parent module. The after runner was given no parent. Both ordinary lint and translator used the same exported real source and syntax-only options. Execution used three inputs and seed one. No witness score applies. Full command output and counts are in the ignored /Users/assem/nexus/nexus-organisation/work/lean-lanes/new-unit-load/results-bench/new-unit-load/bench.json.

| repository/key | source and unit | before | after | inputs | faults |
|---|---|---|---|---:|---:|
| NexusGPT/nexus/nexus-800 | apps/backend/src/agents/favorites/application/use-cases/favorite-agent.use-case.ts:16 FavoriteAgentUseCase.constructor | ASK | NEW | 3 | 0 |
| NexusGPT/nexus/nexus-800 | apps/backend/src/agents/favorites/application/use-cases/unfavorite-agent.use-case.ts:15 UnfavoriteAgentUseCase.constructor | ASK | NEW | 3 | 0 |
| NexusGPT/nexus/nexus-800 | apps/backend/src/agents/favorites/infrastructure/adapters/delete-agent-favorite.prisma.adapter.ts:11 DeleteAgentFavoritePrismaAdapter.constructor | ASK | NEW | 3 | 0 |
| NexusGPT/nexus-landing/nexus-landing-65 | app/(home)/page.tsx:40 Home | ASK | ASK | 0 | 0 |
| NexusGPT/nexus-landing/nexus-landing-65 | app/(site)/blog/layout.tsx:17 BlogLayout | ASK | ASK | 0 | 0 |
| NexusGPT/nexus-landing/nexus-landing-65 | app/v2/page.tsx:21 Page | ASK | ASK | 0 | 0 |
| NexusGPT/nutshell/nutshell-453 | docs/design/system/components/chat/LiveLine.jsx:37 LiveLine | ASK | ASK | 0 | 0 |
| pyka/pyka-71971fb | src/ui/format.ts:117 isPromoOnlyBrand | ASK | NEW | 3 | 0 |
| pyka/pyka-d48b7fa | _captures/plan/drive.mjs:17 say | ASK | NEW | 3 | 0 |
| pyka/pyka-d48b7fa | _captures/plan/harness.tsx:25 str | ASK | REFUSE | 0 | 0 |

nexus-landing-65 Home:
```text
/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/work/bench/new-unit-load-bench-nexus-landing-65/tree/app/(home)/page.tsx: ASK(build asset): Cannot find module '@/components/v2/tokens.css'
Require stack:
- /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/work/bench/new-unit-load-bench-nexus-landing-65/tree/app/(home)/page.tsx
```

nexus-landing-65 BlogLayout:
```text
/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/work/bench/new-unit-load-bench-nexus-landing-65/tree/app/(site)/blog/layout.tsx: ASK(build asset): Cannot find module '@/components/v2/tokens.css'
Require stack:
- /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/work/bench/new-unit-load-bench-nexus-landing-65/tree/app/(site)/blog/layout.tsx
```

nexus-landing-65 Page:
```text
/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/work/bench/new-unit-load-bench-nexus-landing-65/tree/app/v2/page.tsx: ASK(build asset): Cannot find module '@/components/v2/tokens.css'
Require stack:
- /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/work/bench/new-unit-load-bench-nexus-landing-65/tree/app/v2/page.tsx
```

nutshell-453 LiveLine:
```text
/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/work/bench/new-unit-load-bench-nutshell-453/tree/docs/design/system/components/chat/LiveLine.jsx: ASK(undeclared external package): Cannot find module 'react/jsx-runtime'
Require stack:
- /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/work/bench/new-unit-load-bench-nutshell-453/tree/docs/design/system/components/chat/LiveLine.jsx
```

pyka-d48b7fa str:
```text
/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/work/bench/new-unit-load-bench-pyka-d48b7fa/tree/_captures/plan/harness.tsx: Cannot find module '../../src/engine/mealplan.ts'
Require stack:
- /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/work/bench/new-unit-load-bench-pyka-d48b7fa/tree/_captures/plan/harness.tsx
```

## Three planted load failures

Each mutation changed a runtime import specifier to an unresolved local relative path in an exported copy. Each restored file has exactly the original SHA-256. The JSON records the actual refusal, input/fault counts and hashes.

nexus-800: `apps/backend/src/agents/favorites/application/use-cases/favorite-agent.use-case.ts` `FavoriteAgentUseCase.constructor`: NEW → REFUSE(load), naming `./lean-planted-absent-import-0` → NEW. Source restored.
nexus-800: `apps/backend/src/agents/favorites/application/use-cases/unfavorite-agent.use-case.ts` `UnfavoriteAgentUseCase.constructor`: NEW → REFUSE(load), naming `./lean-planted-absent-import-1` → NEW. Source restored.
nexus-800: `apps/backend/src/agents/favorites/infrastructure/adapters/delete-agent-favorite.prisma.adapter.ts` `DeleteAgentFavoritePrismaAdapter.constructor`: NEW → REFUSE(load), naming `./lean-planted-absent-import-2` → NEW. Source restored.

## Existing verdict admission

| pair and unit | before | after |
|---|---|---|
| small_forms clearNote | WITNESS | WITNESS |
| operators sum | PASS-proved | PASS-proved |
| logic_values pick | PASS-proved | PASS-proved |

All 29 candidate-only fixture checks passed before the suite. The patched harness copy returned NEW for both an absent parent file and an absent parent unit, ASK for an absent candidate, ASK for evaluation/test environments, and REFUSE(load) with local-link provenance for a broken named import.

Candidate-only lint also returned NEW (exit 0), REFUSE(load) (exit 1), evaluation ASK (exit 2), and test-module ASK (exit 2).

## Final suite

```text
| TOTAL | 1237 checks | ALL PASS |
```

## Reproduction

All scripts below run from /Users/assem/nexus/nexus-organisation/work/lean-lanes/new-unit-load. They use absolute paths and export only into the named disposable bench folders.

```text
python3 scripts/census-new-unit.py
python3 scripts/run-census.py
python3 scripts/run-census.py --retry-incomplete --retry-refusals
python3 scripts/run-census.py --isolated
python3 scripts/report-new-unit.py
python3 scripts/bench-new-unit.py
python3 scripts/planted-new-unit.py
python3 scripts/probe-new-unit.py
python3 scripts/admission-new-unit.py
PYTHONDONTWRITEBYTECODE=1 python3 scripts/test-harness-new-unit.py
node langs/ts/tests/run.mjs
```

The committed census-report.md has the repository table, unavailable keys and each remaining defect-side refusal. Raw census-units.tsv and census-results.jsonl.gz are under /Users/assem/nexus/nexus-organisation/work/lean-lanes/new-unit-load/results-bench/new-unit-load. The 149 former clean refusals are now 148 ASK and one NEW; the revised fix refusal count is zero. A process-level ASK is a reported execution limit; it is never counted as loaded or NEW.
