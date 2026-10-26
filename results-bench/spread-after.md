# Concept bench

4 concepts, K=10 real instances each (at most 3 per repo, units of at most 120 lines), lean at /Users/assem/nexus/nexus-organisation/work/lean-lanes/spread-outside-callees

| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| spread in call or array | 10 | 3 | 2 | 6/6 | spread (3), this (1), translate: index.ts:162: an effect inside a callback; the ord (1) |
| rest pattern | 10 | 0 | 0 | 0/0 | record-rest (6), spread (1), foreach (1) |
| Math.max | 10 | 6 | 4 | 9/11 | ts-strict (2), foreach (1), unsupported-call (1) |
| Math.min | 10 | 6 | 5 | 15/15 | translate: memo.ts:110: callee refill was not translated (1), spread (1), math-empty (1) |
