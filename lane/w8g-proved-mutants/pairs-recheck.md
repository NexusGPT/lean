# The mutant study (tests/mutants.mjs)

lean head 844ddac2784f4a6054ed1075c97b4a1c53653b71; options: check.mjs --n 30 --dafny-seconds 30, each pair's project or --no-project (the suite's options); seed 1; environment LEAN_WORKER_HEAP_MB=6144.
Units: 62 pair units (41 pairs); census sample 300 of 715 written entered units from nexus-chat-embed, nexus-meeting-recorder, snitch. Units without a site: 0; units mutate.mjs could not find: 0.
The seconds per mutant and the 20 slowest: the timing file (not part of this report, so two runs compare byte for byte).

### pairs

| kind | planted | caught (WITNESS) | PASS-bounded | PASS-decided | PASS-proved | ASK | other | caught | escaped | ASK share | not planted |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| operator | 18 | 0 | 0 | 0 | 18 | 0 | 0 | 0% | 100% | 0% | 0 |
| boundary | 43 | 0 | 0 | 0 | 43 | 0 | 0 | 0% | 100% | 0% | 0 |
| string | 17 | 0 | 0 | 0 | 17 | 0 | 0 | 0% | 100% | 0% | 0 |
| negated-if | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 0% | 100% | 0% | 0 |
| dropped-else | 0 | 0 | 0 | 0 | 0 | 0 | 0 | n/a | n/a | n/a | 0 |
| swapped-args | 3 | 0 | 0 | 0 | 3 | 0 | 0 | 0% | 100% | 0% | 0 |
| dropped-effect | 10 | 0 | 0 | 0 | 10 | 0 | 0 | 0% | 100% | 0% | 0 |
| changed-return | 13 | 0 | 0 | 0 | 13 | 0 | 0 | 0% | 100% | 0% | 0 |
| **all** | 105 | 0 | 0 | 0 | 105 | 0 | 0 | 0% | 100% | 0% | 0 |

### Who found the input (caught mutants)

| lane | source | mutants |
| --- | --- | ---: |

### The ASKs by lane B and lane A verdict

| verdict | lane B | lane A | mutants |
| --- | --- | --- | ---: |

### The escapes by lane A verdict

| verdict | lane A | mutants |
| --- | --- | ---: |
| PASS-proved | PASS-proved | 105 |

