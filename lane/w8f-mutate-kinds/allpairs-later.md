# The mutant study (tests/mutants.mjs)

lean head 772b9eb4f773bca53304c66214463e7e94c141d2; options: check.mjs --n 30 --dafny-seconds 30, each pair's project or --no-project (the suite's options); seed 1; environment LEAN_WORKER_HEAP_MB=6144.
Units: 2121 pair units (331 pairs). Units without a site: 1274; units mutate.mjs could not find: 0.
The seconds per mutant and the 20 slowest: the timing file (not part of this report, so two runs compare byte for byte).

### pairs

| kind | planted | caught (WITNESS) | PASS-bounded | PASS-decided | PASS-proved | ASK | other | caught | escaped | ASK share | not planted |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| operator | 0 | 0 | 0 | 0 | 0 | 0 | 0 | n/a | n/a | n/a | 0 |
| boundary | 0 | 0 | 0 | 0 | 0 | 0 | 0 | n/a | n/a | n/a | 0 |
| string | 0 | 0 | 0 | 0 | 0 | 0 | 0 | n/a | n/a | n/a | 0 |
| negated-if | 0 | 0 | 0 | 0 | 0 | 0 | 0 | n/a | n/a | n/a | 0 |
| dropped-else | 0 | 0 | 0 | 0 | 0 | 0 | 0 | n/a | n/a | n/a | 0 |
| swapped-args | 0 | 0 | 0 | 0 | 0 | 0 | 0 | n/a | n/a | n/a | 0 |
| dropped-effect | 0 | 0 | 0 | 0 | 0 | 0 | 0 | n/a | n/a | n/a | 0 |
| changed-return | 0 | 0 | 0 | 0 | 0 | 0 | 0 | n/a | n/a | n/a | 0 |
| boolean | 102 | 99 | 3 | 0 | 0 | 0 | 0 | 97.1% | 2.9% | 0% | 2 |
| nullish | 84 | 63 | 17 | 0 | 4 | 0 | 0 | 75% | 25% | 0% | 1 |
| dropped-assignment | 419 | 378 | 11 | 0 | 10 | 19 | 1 | 90.2% | 5% | 4.5% | 54 |
| compound | 119 | 109 | 4 | 0 | 2 | 4 | 0 | 91.6% | 5% | 3.4% | 9 |
| arithmetic | 30 | 29 | 1 | 0 | 0 | 0 | 0 | 96.7% | 3.3% | 0% | 0 |
| equality | 9 | 9 | 0 | 0 | 0 | 0 | 0 | 100% | 0% | 0% | 16 |
| coalesce | 70 | 27 | 38 | 0 | 5 | 0 | 0 | 38.6% | 61.4% | 0% | 2 |
| bitwise | 23 | 23 | 0 | 0 | 0 | 0 | 0 | 100% | 0% | 0% | 0 |
| unary | 113 | 107 | 2 | 0 | 3 | 1 | 0 | 94.7% | 4.4% | 0.9% | 7 |
| template | 81 | 75 | 5 | 0 | 1 | 0 | 0 | 92.6% | 7.4% | 0% | 0 |
| object-return | 154 | 149 | 5 | 0 | 0 | 0 | 0 | 96.8% | 3.2% | 0% | 40 |
| **all** | 1204 | 1068 | 86 | 0 | 25 | 24 | 1 | 88.7% | 9.2% | 2% | 131 |

### Who found the input (caught mutants)

| lane | source | mutants |
| --- | --- | ---: |
| B | seeded type-directed draw | 521 |
| B | enumerated heaps | 246 |
| B | boundary walk | 189 |
| B | program | 92 |
| B | other | 16 |
| A | counterexample | 3 |
| B | race program | 1 |

### The ASKs by lane B and lane A verdict

| verdict | lane B | lane A | mutants |
| --- | --- | --- | ---: |
| ASK | ASK | ASK:doubles-unknown | 15 |
| ASK | WITNESS | ASK:interface | 6 |
| ASK | ASK | ASK | 3 |

### The solver's counterexample (W3a), where lane A asked for one

Counterexample witnesses: 3; of them not replayed (a false witness): 0.

| verdict | counterexample status | mutants |
| --- | --- | ---: |
| PASS-bounded | unconfirmed | 54 |
| ASK | unconfirmed | 15 |
| WITNESS | witness | 3 |

### The escapes by lane A verdict

| verdict | lane A | mutants |
| --- | --- | ---: |
| PASS-bounded | ASK:doubles-unknown | 39 |
| PASS-proved | PASS-proved | 25 |
| PASS-bounded | ASK:unproved | 21 |
| PASS-bounded | ASK | 18 |
| PASS-bounded | ASK:identity | 5 |
| PASS-bounded | ASK:translation-defect | 3 |

