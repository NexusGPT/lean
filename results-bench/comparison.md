# Promise forms concept bench on 0c4b2b0

| Domain | n | Original c9847d8 | Dev 80728f8 | Dev 9cb4107 | Dev 0c4b2b0 | Rebased branch |
|---|---:|---|---|---|---|---|
| .then/.catch chain | 10 | 5/5/5 | 5/5/5 | 4/4/4 | 4/4/4 | 6/6/5 |
| new Promise | 10 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 1/1/1 |
| Promise.resolve | 10 | 1/0/0 | 1/0/0 | 1/0/0 | 1/0/0 | 1/0/0 |
| Promise.reject | 10 | 0/0/0 | 0/0/0 | 0/0/0 | 1/1/1 | 1/1/1 |
| Promise.race | 10 | 2/2/0 | 2/2/0 | 2/2/0 | 2/2/0 | 2/2/0 |
| Promise.allSettled | 10 | 4/2/0 | 2/2/0 | 2/2/0 | 3/3/0 | 3/3/0 |
| Promise.any | 0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 | 0/0/0 |

L/T/W = units inside lint / translated / with at least one witnessed mutant. The 60 sampled units match between current baseline and branch. Every domain meets or exceeds dev 0c4b2b0. Promise.any has no census instances.

The original W harness was used unchanged, with its stable sampling and process-specific mutant files. The current baseline is an archive of exactly 0c4b2b0 inside the assigned worktree; that temporary source tree was removed after measurement. Its full revision is in dev-0c4b2b0-revision.txt.

The branch now translates census main and witnesses a mutant; dev still refuses it by exception-callback. The prior helper translation gap is resolved by the merged readings. openingWhenHostIsThere is also admitted and translated, with no witnessed mutant. RenameNodeCommand.revert retains three witnessed mutants. The exceptions fallback policy remains unchanged.

Historical allSettled admission losses were inherited from the callbacks lane; the current module reading admits an additional unit. Current Promise.reject admission is also retained. Archived scorecards preserve every prior comparison.

Current scorecards: dev-0c4b2b0-before.json and after.json. Current logs: dev-0c4b2b0-bench.log and bench.log. Earlier scorecards: before.json, dev-before.json, dev-final-before.json, after-9cb4107.json.

Commands:
```sh
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean-lanes/promise-then-new-promise/results-bench/dev-0c4b2b0-baseline --concepts ".then/.catch chain|new Promise|Promise.resolve|Promise.reject|Promise.race|Promise.allSettled|Promise.any" --k 10 --jobs 3 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/promise-then-new-promise/results-bench/dev-0c4b2b0-before
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean-lanes/promise-then-new-promise --concepts ".then/.catch chain|new Promise|Promise.resolve|Promise.reject|Promise.race|Promise.allSettled|Promise.any" --k 10 --jobs 3 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/promise-then-new-promise/results-bench/after-0c4b2b0
```
