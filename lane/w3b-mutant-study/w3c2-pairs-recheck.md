# The mutant study (tests/mutants.mjs)

lean head 057bcfb55057f8e17f77ed5828a1e16991232181; options: check.mjs --n 30 --dafny-seconds 30, each pair's project or --no-project (the suite's options); seed 1; environment LEAN_SEARCH=1.
Units: 350 pair units (170 pairs); census sample 300 of 715 written entered units from nexus-chat-embed, nexus-meeting-recorder, snitch. Units without a site: 0; units mutate.mjs could not find: 0.
The seconds per mutant and the 20 slowest: the timing file (not part of this report, so two runs compare byte for byte).

### pairs

| kind | planted | caught (WITNESS) | PASS-bounded | PASS-decided | PASS-proved | ASK | other | caught | escaped | ASK share | not planted |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| operator | 159 | 16 | 111 | 0 | 18 | 14 | 0 | 10.1% | 81.1% | 8.8% | 0 |
| boundary | 229 | 36 | 141 | 0 | 43 | 8 | 1 | 15.7% | 80.3% | 3.5% | 0 |
| string | 99 | 17 | 55 | 0 | 17 | 7 | 3 | 17.2% | 72.7% | 7.1% | 0 |
| negated-if | 9 | 2 | 4 | 0 | 1 | 2 | 0 | 22.2% | 55.6% | 22.2% | 0 |
| dropped-else | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 0% | 0% | 100% | 0 |
| swapped-args | 11 | 2 | 6 | 0 | 3 | 0 | 0 | 18.2% | 81.8% | 0% | 0 |
| dropped-effect | 57 | 11 | 25 | 0 | 10 | 11 | 0 | 19.3% | 61.4% | 19.3% | 0 |
| changed-return | 80 | 33 | 30 | 0 | 13 | 4 | 0 | 41.3% | 53.8% | 5% | 0 |
| **all** | 646 | 117 | 372 | 0 | 105 | 48 | 4 | 18.1% | 73.8% | 7.4% | 0 |

### Who found the input (caught mutants)

| lane | source | mutants |
| --- | --- | ---: |
| B | seeded type-directed draw | 40 |
| B | boundary walk | 33 |
| B | enumerated heaps | 21 |
| B | search | 17 |
| B | program | 6 |

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
| PASS-bounded | ASK:doubles-unknown | 237 |
| PASS-proved | PASS-proved | 105 |
| PASS-bounded | ASK | 56 |
| PASS-bounded | ASK:unproved | 46 |
| PASS-bounded | ASK:identity | 29 |
| PASS-bounded | ASK:translation-defect | 4 |

