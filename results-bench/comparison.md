# Promise forms concept bench

Same crc32-seeded instances before and after. Baseline: master c9847d8, as directed by the lead. The Promise.allSettled baseline was rerun after the parent-file mutant-name fix.

L/T/W = units inside lint / translated / with at least one mutant witnessed. Mutant counts have their own denominator. Promise.any has no census instances.

| Domain | n | Before L/T/W | After L/T/W | Before mutants | After mutants |
|---|---:|---|---|---|---|
| .then/.catch chain | 10 | 5/5/5 | 3/3/3 | 9/12 | 6/9 |
| new Promise | 10 | 0/0/0 | 1/1/1 | 0/0 | 3/3 |
| Promise.resolve | 10 | 1/0/0 | 0/0/0 | 0/0 | 0/0 |
| Promise.reject | 10 | 0/0/0 | 0/0/0 | 0/0 | 0/0 |
| Promise.race | 10 | 2/2/0 | 0/0/0 | 0/6 | 0/0 |
| Promise.allSettled | 10 | 4/2/0 | 0/0/0 | 0/6 | 0/0 |
| Promise.any | 0 | 0/0/0 | 0/0/0 | 0/0 | 0/0 |

The reduction is intentional for dangling/stored native chains and refused combinators. Non-async Promise-returning functions remain outside the existing subset. The sampled n8n RenameNodeCommand.revert enters the new terminal-executor reading; its three mutants are witnessed. Census chain counts include unresolved/custom receivers that retain the pre-existing opaque call reading.

Commands (all output paths are inside the assigned worktree):
```sh
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean --concepts ".then/.catch chain|new Promise|Promise.resolve|Promise.reject|Promise.race|Promise.allSettled|Promise.any" --k 10 --jobs 3 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/promise-then-new-promise/results-bench/stable-before
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean --concepts "Promise.allSettled" --k 10 --jobs 3 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/promise-then-new-promise/results-bench/stable-before-allsettled
python3 -I /Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/harness/concept_bench.py --lean /Users/assem/nexus/nexus-organisation/work/lean-lanes/promise-then-new-promise --concepts ".then/.catch chain|new Promise|Promise.resolve|Promise.reject|Promise.race|Promise.allSettled|Promise.any" --k 10 --jobs 3 --out /Users/assem/nexus/nexus-organisation/work/lean-lanes/promise-then-new-promise/results-bench/final-after
```
