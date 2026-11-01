# The mutant study (tests/mutants.mjs)

lean head 5cd25d0d9fc463565f201caa47b2f4534bf1ae1a; options: check.mjs --n 30 --dafny-seconds 30, each pair's project or --no-project (the suite's options); seed 1; environment no LEAN_ variable.
Units: 2036 pair units (301 pairs); census sample 300 of 715 written entered units from nexus-chat-embed, nexus-meeting-recorder, snitch. Units without a site: 293; units mutate.mjs could not find: 0.
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

### census sample

| kind | planted | caught (WITNESS) | PASS-bounded | PASS-decided | PASS-proved | ASK | other | caught | escaped | ASK share | not planted |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| operator | 291 | 192 | 79 | 0 | 0 | 20 | 0 | 66% | 27.1% | 6.9% | 107 |
| boundary | 329 | 219 | 98 | 0 | 0 | 12 | 0 | 66.6% | 29.8% | 3.6% | 2 |
| string | 529 | 415 | 110 | 0 | 2 | 2 | 0 | 78.4% | 21.2% | 0.4% | 178 |
| negated-if | 94 | 66 | 24 | 0 | 0 | 4 | 0 | 70.2% | 25.5% | 4.3% | 50 |
| dropped-else | 2 | 1 | 1 | 0 | 0 | 0 | 0 | 50% | 50% | 0% | 0 |
| swapped-args | 58 | 38 | 18 | 0 | 0 | 2 | 0 | 65.5% | 31% | 3.4% | 114 |
| dropped-effect | 65 | 35 | 17 | 0 | 0 | 13 | 0 | 53.8% | 26.2% | 20% | 20 |
| changed-return | 83 | 61 | 19 | 0 | 0 | 3 | 0 | 73.5% | 22.9% | 3.6% | 9 |
| **all** | 1451 | 1027 | 366 | 0 | 2 | 56 | 0 | 70.8% | 25.4% | 3.9% | 480 |

### all

| kind | planted | caught (WITNESS) | PASS-bounded | PASS-decided | PASS-proved | ASK | other | caught | escaped | ASK share | not planted |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| operator | 1479 | 1231 | 196 | 0 | 18 | 34 | 0 | 83.2% | 14.5% | 2.3% | 316 |
| boundary | 1844 | 1534 | 246 | 0 | 43 | 20 | 1 | 83.2% | 15.7% | 1.1% | 26 |
| string | 1125 | 926 | 168 | 0 | 19 | 9 | 3 | 82.3% | 16.6% | 0.8% | 256 |
| negated-if | 341 | 306 | 28 | 0 | 1 | 6 | 0 | 89.7% | 8.5% | 1.8% | 115 |
| dropped-else | 13 | 10 | 1 | 0 | 0 | 2 | 0 | 76.9% | 7.7% | 15.4% | 4 |
| swapped-args | 158 | 128 | 25 | 0 | 3 | 2 | 0 | 81% | 17.7% | 1.3% | 265 |
| dropped-effect | 497 | 421 | 42 | 0 | 10 | 24 | 0 | 84.7% | 10.5% | 4.8% | 54 |
| changed-return | 1655 | 1586 | 49 | 0 | 13 | 7 | 0 | 95.8% | 3.7% | 0.4% | 9 |
| **all** | 7112 | 6142 | 755 | 0 | 107 | 104 | 4 | 86.4% | 12.1% | 1.5% | 1045 |

### Who found the input (caught mutants)

| lane | source | mutants |
| --- | --- | ---: |
| B | seeded type-directed draw | 3068 |
| B | boundary walk | 1318 |
| B | enumerated heaps | 1182 |
| B | program | 498 |
| B | other | 28 |
| B | listed values | 13 |
| A | doubles counterexample | 12 |
| B | environment program | 12 |
| B | race program | 11 |

### The ASKs by lane B and lane A verdict

| verdict | lane B | lane A | mutants |
| --- | --- | --- | ---: |
| ASK | ASK | ASK:doubles-unknown | 55 |
| ASK | ASK | ASK:identity | 19 |
| ASK | ASK | ASK:unproved | 12 |
| ASK | ASK | ASK | 7 |
| ASK | WITNESS | ASK:translation-defect | 5 |
| ASK | WITNESS | ASK:interface | 4 |
| ASK | ASK | ASK:interface | 2 |

### The escapes by lane A verdict

| verdict | lane A | mutants |
| --- | --- | ---: |
| PASS-bounded | ASK:doubles-unknown | 391 |
| PASS-bounded | ASK:identity | 197 |
| PASS-proved | PASS-proved | 107 |
| PASS-bounded | ASK:unproved | 79 |
| PASS-bounded | ASK | 56 |
| PASS-bounded | ASK:translation-defect | 32 |

