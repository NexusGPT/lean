# Promise forms concept bench after rebase

| Domain | n | Original c9847d8 L/T/W | Dev 80728f8 L/T/W | Rebased L/T/W |
|---|---:|---|---|---|
| .then/.catch chain | 10 | 5/5/5 | 5/5/5 | 6/6/5 |
| new Promise | 10 | 0/0/0 | 0/0/0 | 1/1/1 |
| Promise.resolve | 10 | 1/0/0 | 1/0/0 | 1/0/0 |
| Promise.reject | 10 | 0/0/0 | 0/0/0 | 0/0/0 |
| Promise.race | 10 | 2/2/0 | 2/2/0 | 2/2/0 |
| Promise.allSettled | 10 | 4/2/0 | 2/2/0 | 2/2/0 |
| Promise.any | 0 | 0/0/0 | 0/0/0 | 0/0/0 |

L/T/W = units inside lint / translated / with at least one witnessed mutant. All 60 instances match across all three runs. Promise.any has no census instances. Every domain meets or exceeds the current dev baseline on all three measures.

The original baseline is retained in before.json. Dev adds async-callback refusals to two previously lint-admitted, untranslated allSettled units; the promise branch preserves that gate. The actual current-dev baseline is dev-before.json, from a git archive of dev 80728f877130272f1eb81db0ae9aba7edd7f539b inside this worktree. The temporary source archive was removed after the run. after.json is the rebased branch. Full output: dev-bench.log and bench.log.

The newly read executor is n8n RenameNodeCommand.revert (three witnessed mutants). Chains retain five witnessed units and gain one admitted/translated unit. Mutant totals, dev to rebased: chains 9/12 to 9/14, executors 0/0 to 3/3, race and allSettled each 0/6 to 0/6.

Commands (the original W harness, unchanged; jobs 3):
```sh
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean-lanes/promise-then-new-promise/results-bench/dev-baseline --concepts ".then/.catch chain|new Promise|Promise.resolve|Promise.reject|Promise.race|Promise.allSettled|Promise.any" --k 10 --jobs 3 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/promise-then-new-promise/results-bench/dev-before
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean-lanes/promise-then-new-promise --concepts ".then/.catch chain|new Promise|Promise.resolve|Promise.reject|Promise.race|Promise.allSettled|Promise.any" --k 10 --jobs 3 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/promise-then-new-promise/results-bench/rebased-after
```

The original c9847d8 run used the same CLI with --lean /Users/assem/nexus/nexus-organisation/work/lean. Its allSettled scorecard was rerun after the harness parent-file mutant-name fix.
