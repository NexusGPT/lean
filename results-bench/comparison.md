# Promise forms concept bench after the final rebase

| Domain | n | Original c9847d8 | Dev 80728f8 | Dev 9cb4107 | Final branch |
|---|---:|---|---|---|---|
| .then/.catch chain | 10 | 5/5/5 | 5/5/5 | 4/4/4 | 6/5/4 |
| new Promise | 10 | 0/0/0 | 0/0/0 | 0/0/0 | 1/1/1 |
| Promise.resolve | 10 | 1/0/0 | 1/0/0 | 1/0/0 | 1/0/0 |
| Promise.reject | 10 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 |
| Promise.race | 10 | 2/2/0 | 2/2/0 | 2/2/0 | 2/2/0 |
| Promise.allSettled | 10 | 4/2/0 | 2/2/0 | 2/2/0 | 2/2/0 |
| Promise.any | 0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 |

L/T/W = units inside lint / translated / with at least one witnessed mutant. All 60 sampled units match across all four runs. Promise.any has no census instances. Every domain meets or exceeds current dev 9cb4107 on all three measures.

Two historical decreases came from dev. Between c9847d8 and 80728f8, async-callback removed two lint-only allSettled admissions. Between 80728f8 and 9cb4107, exception-callback refuses main in nexus apps/backend/src/tools/scripts/remediate-mark-splitting-overstrip.ts. The promise branch still admits that main, then translation reaches collectBackupVersionIds, which was not translated. This accounts for the chain translation/witness decrease since the prior lane scorecard. The exception fallback policy is preserved.

The n8n RenameNodeCommand.revert executor still witnesses all three mutants. The final chain score is 6/5/4 against dev 4/4/4.

Scorecards: before.json (original), dev-before.json (80728f8), dev-final-before.json (9cb4107), after.json (final branch). Logs: dev-bench.log, dev-final-bench.log, bench.log. Each dev baseline came from git archive of that exact revision into this worktree; both temporary source archives were removed after measurement. The original W harness was used unchanged.

Final commands:
```sh
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean-lanes/promise-then-new-promise/results-bench/dev-final-baseline --concepts ".then/.catch chain|new Promise|Promise.resolve|Promise.reject|Promise.race|Promise.allSettled|Promise.any" --k 10 --jobs 3 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/promise-then-new-promise/results-bench/dev-final-before
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean-lanes/promise-then-new-promise --concepts ".then/.catch chain|new Promise|Promise.resolve|Promise.reject|Promise.race|Promise.allSettled|Promise.any" --k 10 --jobs 3 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/promise-then-new-promise/results-bench/final-after
```

The 80728f8 runs used the same CLI with the earlier scratch baseline and --out prefixes dev-before and rebased-after. The original c9847d8 run used --lean /Users/assem/nexus/nexus-organisation/work/lean; its allSettled sample was rerun after the harness parent-file mutant-name fix.
