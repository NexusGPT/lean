# The mutant study (tests/mutants.mjs)

lean head 9522c28a037ef08d079f94a16415d9c1cda1e323; options: check.mjs --n 30 --dafny-seconds 30, each pair's project or --no-project (the suite's options); seed 1; environment no LEAN_ variable.
Units: 0 pair units (0 pairs); census sample 300 of 715 written entered units from nexus-chat-embed, nexus-meeting-recorder, snitch. Units without a site: 0; units mutate.mjs could not find: 0.
The seconds per mutant and the 20 slowest: the timing file (not part of this report, so two runs compare byte for byte).

### census sample

| kind | planted | caught (WITNESS) | PASS-bounded | PASS-decided | PASS-proved | ASK | other | caught | escaped | ASK share | not planted |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| operator | 108 | 10 | 80 | 0 | 0 | 18 | 0 | 9.3% | 74.1% | 16.7% | 0 |
| boundary | 125 | 17 | 96 | 0 | 0 | 12 | 0 | 13.6% | 76.8% | 9.6% | 0 |
| string | 133 | 19 | 110 | 0 | 2 | 2 | 0 | 14.3% | 84.2% | 1.5% | 0 |
| negated-if | 28 | 1 | 23 | 0 | 0 | 4 | 0 | 3.6% | 82.1% | 14.3% | 0 |
| dropped-else | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0% | 100% | 0% | 0 |
| swapped-args | 22 | 2 | 18 | 0 | 0 | 2 | 0 | 9.1% | 81.8% | 9.1% | 0 |
| dropped-effect | 31 | 1 | 17 | 0 | 0 | 13 | 0 | 3.2% | 54.8% | 41.9% | 0 |
| changed-return | 26 | 4 | 19 | 0 | 0 | 3 | 0 | 15.4% | 73.1% | 11.5% | 0 |
| **all** | 474 | 54 | 364 | 0 | 2 | 54 | 0 | 11.4% | 77.2% | 11.4% | 0 |

### Who found the input (caught mutants)

| lane | source | mutants |
| --- | --- | ---: |
| B | seeded type-directed draw | 26 |
| B | enumerated heaps | 13 |
| B | boundary walk | 7 |
| A | counterexample | 4 |
| B | program | 2 |
| B | race program | 2 |

### The ASKs by lane B and lane A verdict

| verdict | lane B | lane A | mutants |
| --- | --- | --- | ---: |
| ASK | ASK | ASK:doubles-unknown | 23 |
| ASK | ASK | ASK:identity | 17 |
| ASK | ASK | ASK:unproved | 12 |
| ASK | ASK | ASK:interface | 2 |

### The solver's counterexample (W3a), where lane A asked for one

Counterexample witnesses: 4; of them not replayed (a false witness): 0.

| verdict | counterexample status | mutants |
| --- | --- | ---: |
| PASS-bounded | unconfirmed | 168 |
| ASK | unconfirmed | 35 |
| WITNESS | witness | 4 |

### The escapes by lane A verdict

| verdict | lane A | mutants |
| --- | --- | ---: |
| PASS-bounded | ASK:identity | 168 |
| PASS-bounded | ASK:doubles-unknown | 139 |
| PASS-bounded | ASK:unproved | 29 |
| PASS-bounded | ASK:translation-defect | 28 |
| PASS-proved | PASS-proved | 2 |

