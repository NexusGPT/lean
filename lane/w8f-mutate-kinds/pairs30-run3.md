# The mutant study (tests/mutants.mjs)

lean head 772b9eb4f773bca53304c66214463e7e94c141d2; options: check.mjs --n 30 --dafny-seconds 30, each pair's project or --no-project (the suite's options); seed 1; environment LEAN_WORKER_HEAP_MB=6144.
Units: 236 pair units (30 pairs). Units without a site: 9; units mutate.mjs could not find: 0.
The seconds per mutant and the 20 slowest: the timing file (not part of this report, so two runs compare byte for byte).

### pairs

| kind | planted | caught (WITNESS) | PASS-bounded | PASS-decided | PASS-proved | ASK | other | caught | escaped | ASK share | not planted |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| operator | 143 | 132 | 9 | 0 | 2 | 0 | 0 | 92.3% | 7.7% | 0% | 16 |
| boundary | 141 | 133 | 6 | 0 | 2 | 0 | 0 | 94.3% | 5.7% | 0% | 0 |
| string | 86 | 73 | 10 | 0 | 1 | 2 | 0 | 84.9% | 12.8% | 2.3% | 9 |
| negated-if | 26 | 26 | 0 | 0 | 0 | 0 | 0 | 100% | 0% | 0% | 4 |
| dropped-else | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 100% | 0% | 0% | 0 |
| swapped-args | 16 | 13 | 3 | 0 | 0 | 0 | 0 | 81.3% | 18.8% | 0% | 20 |
| dropped-effect | 58 | 53 | 4 | 0 | 0 | 1 | 0 | 91.4% | 6.9% | 1.7% | 4 |
| changed-return | 160 | 157 | 3 | 0 | 0 | 0 | 0 | 98.1% | 1.9% | 0% | 0 |
| boolean | 7 | 7 | 0 | 0 | 0 | 0 | 0 | 100% | 0% | 0% | 0 |
| nullish | 23 | 22 | 1 | 0 | 0 | 0 | 0 | 95.7% | 4.3% | 0% | 0 |
| dropped-assignment | 51 | 51 | 0 | 0 | 0 | 0 | 0 | 100% | 0% | 0% | 5 |
| compound | 20 | 20 | 0 | 0 | 0 | 0 | 0 | 100% | 0% | 0% | 0 |
| arithmetic | 6 | 6 | 0 | 0 | 0 | 0 | 0 | 100% | 0% | 0% | 0 |
| equality | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 100% | 0% | 0% | 5 |
| coalesce | 10 | 6 | 4 | 0 | 0 | 0 | 0 | 60% | 40% | 0% | 0 |
| bitwise | 0 | 0 | 0 | 0 | 0 | 0 | 0 | n/a | n/a | n/a | 0 |
| unary | 9 | 9 | 0 | 0 | 0 | 0 | 0 | 100% | 0% | 0% | 0 |
| template | 12 | 11 | 1 | 0 | 0 | 0 | 0 | 91.7% | 8.3% | 0% | 0 |
| object-return | 20 | 19 | 1 | 0 | 0 | 0 | 0 | 95% | 5% | 0% | 5 |
| **all** | 792 | 742 | 42 | 0 | 5 | 3 | 0 | 93.7% | 5.9% | 0.4% | 68 |

### Who found the input (caught mutants)

| lane | source | mutants |
| --- | --- | ---: |
| B | seeded type-directed draw | 360 |
| B | boundary walk | 168 |
| B | enumerated heaps | 148 |
| B | program | 50 |
| B | other | 15 |
| A | doubles counterexample | 1 |

### The ASKs by lane B and lane A verdict

| verdict | lane B | lane A | mutants |
| --- | --- | --- | ---: |
| ASK | ASK | ASK | 3 |

### The solver's counterexample (W3a), where lane A asked for one

Counterexample witnesses: 0; of them not replayed (a false witness): 0.

| verdict | counterexample status | mutants |
| --- | --- | ---: |
| PASS-bounded | unconfirmed | 16 |

### The escapes by lane A verdict

| verdict | lane A | mutants |
| --- | --- | ---: |
| PASS-bounded | ASK | 18 |
| PASS-bounded | ASK:doubles-unknown | 10 |
| PASS-bounded | ASK:identity | 7 |
| PASS-bounded | ASK:unproved | 7 |
| PASS-proved | PASS-proved | 5 |

