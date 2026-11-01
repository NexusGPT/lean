# The mutant study (tests/mutants.mjs)

lean head 9522c28a037ef08d079f94a16415d9c1cda1e323; options: check.mjs --n 30 --dafny-seconds 30, each pair's project or --no-project (the suite's options); seed 1; environment no LEAN_ variable.
Units: 350 pair units (170 pairs); census sample 300 of 715 written entered units from nexus-chat-embed, nexus-meeting-recorder, snitch. Units without a site: 0; units mutate.mjs could not find: 0.
The seconds per mutant and the 20 slowest: the timing file (not part of this report, so two runs compare byte for byte).

### pairs

| kind | planted | caught (WITNESS) | PASS-bounded | PASS-decided | PASS-proved | ASK | other | caught | escaped | ASK share | not planted |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| operator | 158 | 11 | 116 | 0 | 18 | 13 | 0 | 7% | 84.8% | 8.2% | 0 |
| boundary | 227 | 34 | 143 | 0 | 43 | 6 | 1 | 15% | 81.9% | 2.6% | 0 |
| string | 99 | 15 | 57 | 0 | 17 | 7 | 3 | 15.2% | 74.7% | 7.1% | 0 |
| negated-if | 8 | 2 | 4 | 0 | 1 | 1 | 0 | 25% | 62.5% | 12.5% | 0 |
| dropped-else | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0% | 0% | 100% | 0 |
| swapped-args | 11 | 1 | 7 | 0 | 3 | 0 | 0 | 9.1% | 90.9% | 0% | 0 |
| dropped-effect | 56 | 11 | 25 | 0 | 10 | 10 | 0 | 19.6% | 62.5% | 17.9% | 0 |
| changed-return | 79 | 33 | 30 | 0 | 13 | 3 | 0 | 41.8% | 54.4% | 3.8% | 0 |
| **all** | 640 | 107 | 382 | 0 | 105 | 42 | 4 | 16.7% | 76.1% | 6.6% | 0 |

### Who found the input (caught mutants)

| lane | source | mutants |
| --- | --- | ---: |
| B | seeded type-directed draw | 40 |
| B | boundary walk | 33 |
| B | enumerated heaps | 21 |
| A | counterexample | 7 |
| B | program | 6 |

### The ASKs by lane B and lane A verdict

| verdict | lane B | lane A | mutants |
| --- | --- | --- | ---: |
| ASK | ASK | ASK:doubles-unknown | 24 |
| ASK | ASK | ASK | 7 |
| ASK | WITNESS | ASK:translation-defect | 5 |
| ASK | WITNESS | ASK:interface | 4 |
| ASK | ASK | ASK:identity | 2 |

### The solver's counterexample (W3a), where lane A asked for one

Counterexample witnesses: 7; of them not replayed (a false witness): 0.

| verdict | counterexample status | mutants |
| --- | --- | ---: |
| PASS-bounded | unconfirmed | 288 |
| ASK | unconfirmed | 24 |
| WITNESS | witness | 7 |

### The escapes by lane A verdict

| verdict | lane A | mutants |
| --- | --- | ---: |
| PASS-bounded | ASK:doubles-unknown | 245 |
| PASS-proved | PASS-proved | 105 |
| PASS-bounded | ASK | 56 |
| PASS-bounded | ASK:unproved | 48 |
| PASS-bounded | ASK:identity | 29 |
| PASS-bounded | ASK:translation-defect | 4 |

