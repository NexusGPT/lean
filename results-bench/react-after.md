# Concept bench

2 concepts, K=10 real instances each (at most 3 per repo, units of at most 120 lines), lean at /Users/assem/nexus/nexus-organisation/work/lean-lanes/react-handlers-memo

| concept | n | inside | translated | mutants witnessed | top blockers |
|---|---|---|---|---|---|
| JSX handler attribute | 10 | 8 | 5 | 14/14 | destructuring (1), ts-strict (1), translate: rail-name-field.tsx:10: type nesting too deep (1) |
| React hook call | 10 | 3 | 3 | 7/7 | destructuring (3), react-handler-capture (2), mixed-types (1) |
