# The mutant study (tests/mutants.mjs)

lean head 057bcfb55057f8e17f77ed5828a1e16991232181; options: check.mjs --n 30 --dafny-seconds 30, each pair's project or --no-project (the suite's options); seed 1; environment LEAN_SEARCH=1.
Units: 0 pair units (0 pairs); census sample 300 of 715 written entered units from nexus-chat-embed, nexus-meeting-recorder, snitch. Units without a site: 0; units mutate.mjs could not find: 0.
The seconds per mutant and the 20 slowest: the timing file (not part of this report, so two runs compare byte for byte).

### census sample

| kind | planted | caught (WITNESS) | PASS-bounded | PASS-decided | PASS-proved | ASK | other | caught | escaped | ASK share | not planted |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| operator | 108 | 16 | 74 | 0 | 0 | 18 | 0 | 14.8% | 68.5% | 16.7% | 0 |
| boundary | 125 | 19 | 94 | 0 | 0 | 12 | 0 | 15.2% | 75.2% | 9.6% | 0 |
| string | 133 | 41 | 88 | 0 | 2 | 2 | 0 | 30.8% | 67.7% | 1.5% | 0 |
| negated-if | 28 | 4 | 20 | 0 | 0 | 4 | 0 | 14.3% | 71.4% | 14.3% | 0 |
| dropped-else | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0% | 100% | 0% | 0 |
| swapped-args | 22 | 2 | 18 | 0 | 0 | 2 | 0 | 9.1% | 81.8% | 9.1% | 0 |
| dropped-effect | 31 | 2 | 16 | 0 | 0 | 13 | 0 | 6.5% | 51.6% | 41.9% | 0 |
| changed-return | 26 | 13 | 10 | 0 | 0 | 3 | 0 | 50% | 38.5% | 11.5% | 0 |
| **all** | 474 | 97 | 321 | 0 | 2 | 54 | 0 | 20.5% | 68.1% | 11.4% | 0 |

### Who found the input (caught mutants)

| lane | source | mutants |
| --- | --- | ---: |
| B | search | 47 |
| B | seeded type-directed draw | 26 |
| B | enumerated heaps | 13 |
| B | boundary walk | 7 |
| B | program | 2 |
| B | race program | 2 |

### The ASKs by lane B and lane A verdict

| verdict | lane B | lane A | mutants |
| --- | --- | --- | ---: |
| ASK | ASK | ASK:doubles-unknown | 23 |
| ASK | ASK | ASK:identity | 17 |
| ASK | ASK | ASK:unproved | 12 |
| ASK | ASK | ASK:interface | 2 |

### The escapes by lane A verdict

| verdict | lane A | mutants |
| --- | --- | ---: |
| PASS-bounded | ASK:identity | 136 |
| PASS-bounded | ASK:doubles-unknown | 131 |
| PASS-bounded | ASK:translation-defect | 28 |
| PASS-bounded | ASK:unproved | 26 |
| PASS-proved | PASS-proved | 2 |

