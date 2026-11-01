# The mutant study (tests/mutants.mjs)

lean head 5cd25d0d9fc463565f201caa47b2f4534bf1ae1a; options: check.mjs --n 30 --dafny-seconds 30, each pair's project or --no-project (the suite's options); seed 1.
Units: 2036 pair units (301 pairs). Units without a site: 218; units mutate.mjs could not find: 0.
The seconds per mutant and the 20 slowest: the timing file (not part of this report, so two runs compare byte for byte).

### pairs

| kind | planted | caught (WITNESS) | PASS-bounded | PASS-decided | PASS-proved | ASK | other | caught | escaped | ASK share | not planted |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| operator | 1188 | 1039 | 117 | 0 | 18 | 14 | 0 | 87.5% | 11.4% | 1.2% | 209 |
| boundary | 1515 | 1315 | 148 | 0 | 43 | 8 | 1 | 86.8% | 12.6% | 0.5% | 24 |
| string | 596 | 511 | 58 | 0 | 17 | 7 | 3 | 85.7% | 12.6% | 1.2% | 78 |
| negated-if | 247 | 240 | 4 | 0 | 1 | 2 | 0 | 97.2% | 2% | 0.8% | 65 |
| dropped-else | 11 | 9 | 0 | 0 | 0 | 2 | 0 | 81.8% | 0% | 18.2% | 4 |
| swapped-args | 100 | 90 | 7 | 0 | 3 | 0 | 0 | 90% | 10% | 0% | 151 |
| dropped-effect | 432 | 386 | 25 | 0 | 10 | 11 | 0 | 89.4% | 8.1% | 2.5% | 34 |
| changed-return | 1572 | 1525 | 30 | 0 | 13 | 4 | 0 | 97% | 2.7% | 0.3% | 0 |
| **all** | 5661 | 5115 | 389 | 0 | 105 | 48 | 4 | 90.4% | 8.7% | 0.8% | 565 |

### Who found the input (caught mutants)

| lane | source | mutants |
| --- | --- | ---: |
| B | seeded type-directed draw | 2516 |
| B | boundary walk | 1172 |
| B | enumerated heaps | 927 |
| B | program | 451 |
| B | other | 28 |
| B | listed values | 13 |
| B | environment program | 4 |
| A | doubles counterexample | 2 |
| B | race program | 2 |

### The ASKs by lane B and lane A verdict

| verdict | lane B | lane A | mutants |
| --- | --- | --- | ---: |
| ASK | ASK | ASK:doubles-unknown | 30 |
| ASK | ASK | ASK | 7 |
| ASK | WITNESS | ASK:translation-defect | 5 |
| ASK | WITNESS | ASK:interface | 4 |
| ASK | ASK | ASK:identity | 2 |

### The escapes by lane A verdict

| verdict | lane A | mutants |
| --- | --- | ---: |
| PASS-bounded | ASK:doubles-unknown | 250 |
| PASS-proved | PASS-proved | 105 |
| PASS-bounded | ASK | 56 |
| PASS-bounded | ASK:unproved | 50 |
| PASS-bounded | ASK:identity | 29 |
| PASS-bounded | ASK:translation-defect | 4 |

