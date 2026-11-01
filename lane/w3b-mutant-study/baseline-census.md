# The mutant study (tests/mutants.mjs)

lean head 5cd25d0d9fc463565f201caa47b2f4534bf1ae1a; options: check.mjs --n 30 --dafny-seconds 30, each pair's project or --no-project (the suite's options); seed 1.
Units: 0 pair units (0 pairs); census sample 300 of 715 written entered units from nexus-chat-embed, nexus-meeting-recorder, snitch. Units without a site: 75; units mutate.mjs could not find: 0.
The seconds per mutant and the 20 slowest: the timing file (not part of this report, so two runs compare byte for byte).

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

### Who found the input (caught mutants)

| lane | source | mutants |
| --- | --- | ---: |
| B | seeded type-directed draw | 552 |
| B | enumerated heaps | 255 |
| B | boundary walk | 146 |
| B | program | 47 |
| A | doubles counterexample | 10 |
| B | race program | 9 |
| B | environment program | 8 |

### The ASKs by lane B and lane A verdict

| verdict | lane B | lane A | mutants |
| --- | --- | --- | ---: |
| ASK | ASK | ASK:doubles-unknown | 25 |
| ASK | ASK | ASK:identity | 17 |
| ASK | ASK | ASK:unproved | 12 |
| ASK | ASK | ASK:interface | 2 |

### The escapes by lane A verdict

| verdict | lane A | mutants |
| --- | --- | ---: |
| PASS-bounded | ASK:identity | 168 |
| PASS-bounded | ASK:doubles-unknown | 141 |
| PASS-bounded | ASK:unproved | 29 |
| PASS-bounded | ASK:translation-defect | 28 |
| PASS-proved | PASS-proved | 2 |

