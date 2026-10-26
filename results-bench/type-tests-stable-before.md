# Concept bench

4 concepts, K=10 real instances each (at most 3 per repo, units of at most 120 lines), lean at /Users/assem/nexus/nexus-organisation/work/lean-lanes/instanceof-exact/results-bench/baseline

| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| instanceof | 10 | 6 | 6 | 11/17 | unsupported-member (1), unsupported-call (1), param-assign (1) |
| typeof | 10 | 6 | 6 | 11/18 | in-place-mutation (1), destructuring (1), unsupported-syntax (1) |
| in | 10 | 5 | 5 | 5/12 | ts-strict (4), loose-equality (1) |
| Array.isArray | 10 | 6 | 6 | 6/13 | unsupported-syntax (1), param-mutation (1), promise (1) |
