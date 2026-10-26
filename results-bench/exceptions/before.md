# Concept bench

3 concepts, K=10 real instances each (at most 3 per repo, units of at most 120 lines), lean at /Users/assem/nexus/nexus-organisation/work/lean

| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| throw | 10 | 7 | 6 | 15/17 | ts-strict (1), foreach (1), prototype (1) |
| try/catch | 10 | 3 | 3 | 8/8 | global-read (1), this (1), loop-form (1) |
| try/finally only | 10 | 7 | 4 | 5/9 | translate: shell-sweep-fixes-scenarios.ts:118: a path ends wi (1), async (1), translate: check-schema.ts:211: a path ends without a return (1) |
