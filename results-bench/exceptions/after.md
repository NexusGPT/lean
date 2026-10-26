# Concept bench

3 concepts, K=10 real instances each (at most 3 per repo, units of at most 120 lines), lean at /Users/assem/nexus/nexus-organisation/work/lean-lanes/exceptions-across-calls

| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| throw | 10 | 3 | 3 | 8/8 | exception-expression (3), exception-loop (1), exception-callback (1) |
| try/catch | 10 | 2 | 2 | 5/5 | exception-loop (2), exception-callback (2), this (1) |
| try/finally only | 10 | 1 | 1 | 3/3 | exception-return (2), exception-loop (2), exception-expression (1) |
