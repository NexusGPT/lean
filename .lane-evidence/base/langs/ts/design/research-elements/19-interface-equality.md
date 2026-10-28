# Brief 19: equality of interactive displays in every field, the result read element by element

Read in full on 2026-10-26: "Sound Equality for Interactive Displays: Proofs, Measurements, Limits" (58 items,
594 lines; the cross-field blind brief: automata, psychophysics, image processing, metrology, statistics,
real-time, simulation, biology, law). Same four verdicts as the earlier dossiers. The result's own rule is
also lean's: SAME needs a proof or a complete finite decision; a clean sample, a similarity score or one
replay never produces it.

| # | Item | Field | Verdict | Where in lean, how |
|---|---|---|---|---|
| 01 | Contextual equivalence; the product observation | PL semantics | PORT | the certificate names its observation: tree, effect trace, pending work, schedule class (`check.mjs:29`, `run.mjs:303`) |
| 02 | Finite DFA/Mealy equivalence (Hopcroft), product exploration | automata | PORT | `exec/finite.mjs`: a component whose every state slot and prop is finite is a Mealy machine (input: `set`/`fire` commands; output: the tree and trace per step); breadth-first over the product of parent and candidate; PASS-decided with the pair count; the shortest separating sequence is the WITNESS |
| 03 | Bisimulation, hidden transitions, divergence | concurrency | PORT | lane A's step lemma over hook slots: equal props and slots give an equal tree and equal next slots; induction over the sequence is the bisimulation certificate; internal steps (memo recomputation) are unobservable by contract |
| 04 | W-method, checking sequences under a state bound | conformance testing | REFERENCE | folded into item 02: the declared finite domain is the fault domain, no separate suite |
| 05 | Distinguishing sequences, learned machines (AALpy, LearnLib) | identification | IRRELEVANT | an inferred automaton is a learned model; out by rule |
| 06 | ioco, quiescence | conformance | REFERENCE | lane B already observes silence: an empty trace and empty pending set are part of the observation |
| 07 | Observability, control-theoretic bisimulation | control theory | IRRELEVANT | linear systems |
| 08 | Homer, Hector | game semantics | IRRELEVANT | Idealized Algol and ML fragments |
| 09 | Hobbit | symbolic equivalence | REFERENCE | the closure escalation, later (section 2 of the integration note) |
| 10 | PDNF-BISIM | nominal pushdown | IRRELEVANT | no artifact recovered |
| 11 | Alive2 translation validation | compilers | REFERENCE | "validate each generated change, never trust the producer" is lean's premise |
| 12 | Ordered labelled-tree equality with keys | data structures | REFERENCE | `JsxNode` equality is exact and ordered; keys are props; nothing is normalised away |
| 13 | AHU unordered tree isomorphism | graph algorithms | IRRELEVANT | child order is observable in a render |
| 14 | APTED tree edit distance | edit algorithms | REFERENCE | a WITNESS is explained by `firstDifference` (`run.mjs:309`), the path to the first differing node; a distance forgives nothing and is not needed |
| 15 | nauty, Traces canonicalisation | graph theory | IRRELEVANT | lean's graph naming (`graph.mjs`) already canonicalises by first sight |
| 16 | Registration, equality modulo a symmetry | signal processing | IRRELEVANT | no raster in lean |
| 17 | Exact pixels, MSE, pixel tools | image processing | IRRELEVANT | no raster |
| 18 | SSIM | image quality | IRRELEVANT | no raster |
| 19 | CIEDE2000 | colour science | IRRELEVANT | no raster |
| 20 | S-CIELAB | spatial colour | IRRELEVANT | no raster |
| 21 | FLIP (BSD-3) | graphics | IRRELEVANT | no raster |
| 22 | HDR-VDP-3, ColorVideoVDP | visual difference | IRRELEVANT | trained models, out by rule |
| 23 | Perceptual hashing | retrieval | IRRELEVANT | lossy |
| 24 | Weber contrast thresholds, CSF | psychophysics | IRRELEVANT | no raster; the lesson (no universal tolerance) is why pixels stay out |
| 25 | Change blindness | attention | REFERENCE | a reviewer not noticing is no oracle; the machine witness is the oracle |
| 26 | Flicker fusion | temporal vision | IRRELEVANT | no raster |
| 27 | Touch latency | HCI | REFERENCE | action-to-feedback time is observable: the pending set and the clock carry it in lane B |
| 28 | ClearType legibility | typography | IRRELEVANT | no raster |
| 29 | Accessibility API mappings (Core-AAM) | accessibility | REFERENCE | the opt-in projection from the tree, not built unless asked |
| 30 | WCAG, equivalent facilitation | law | IRRELEVANT | conformance, not equivalence |
| 31 | GUM uncertainty | metrology | IRRELEVANT | no physical measurand |
| 32 | Guard bands | conformity | IRRELEVANT | no tolerance claim in lean |
| 33 | TOST, A/B equivalence | statistics | IRRELEVANT | distributional claims |
| 34 | Zero-failure bound (rule of three) | reliability | REFERENCE | PASS-bounded prints n and the seed and no rate: inputs are generated, not sampled from use |
| 35 | Tolerance intervals | statistics | IRRELEVANT | measurement noise |
| 36 | QUEST | experimental design | IRRELEVANT | human responses |
| 37 | Timed automata | real-time | REFERENCE | timed equality is undecidable in general; lean states a schedule class, never timed equality |
| 38 | Schedulability (Liu and Layland) | scheduling | IRRELEVANT | deadlines |
| 39 | DPOR | model checking | REFERENCE | the schedule lane's escalation, later |
| 40 | CHESS, PCT, SCTBench | concurrency testing | REFERENCE | a preemption bound is how the clock lane will state its schedule coverage |
| 41 | rr record/replay | debugging | IRRELEVANT | Linux process replay |
| 42 | SimPy virtual time, FIFO tie-breaking | simulation | REFERENCE | our clock fires due timers in arm order and says so in the bound |
| 43 | Skorokhod conformance | hybrid systems | IRRELEVANT | real-valued signals |
| 44 | Daisy numerical enclosures | numerical verification | IRRELEVANT | floating point is its own concept (numbers-bitwise-nan), not front-end |
| 45 | Simulation V&V (Sargent) | simulation | REFERENCE | equivalence to the parent is not correctness; the paper says so already |
| 46 | Zebrafish assays | biology | IRRELEVANT | analogy only |
| 47 | Occupancy estimation (nondetection is not absence) | ecology | REFERENCE | PASS-bounded wording: "no difference found on n programs", never "no difference" |
| 48 | Nuclear panels, FDA human factors | safety | IRRELEVANT | human validation |
| 49 | LIVE | image quality | IRRELEVANT | raster dataset |
| 50 | TID2013 | image quality | IRRELEVANT | raster dataset |
| 51 | CSIQ | image quality | IRRELEVANT | raster dataset |
| 52 | MCL-JCI | JND data | IRRELEVANT | raster dataset |
| 53 | KonJND-1k | JND data | IRRELEVANT | raster dataset |
| 54 | M-JND | JND data | IRRELEVANT | raster dataset |
| 55 | ReDeCheck | responsive layout | IRRELEVANT | browser |
| 56 | 2026 psychophysical metric tests | metric evaluation | IRRELEVANT | raster metrics |
| 57 | RELINCHE | weak memory | IRRELEVANT | relaxed-memory libraries |
| 58 | Prior-survey atlas | systematisation | REFERENCE | the field-specific assumptions are kept beside each verdict layer |

Counts: PORT 3, DEPENDENCY 0, REFERENCE 17, IRRELEVANT 38.

## The four tensions the result names, and lean's position

- Stricter observation can hold a harmless change: lean holds it (ASK or WITNESS at the tree layer); a
  weaker layer is never the default.
- A more powerful model can be inadmissible: a trained metric or a learned automaton stays out.
- A benchmark label can be weaker than its name: no dataset of component regressions exists; lean's
  measure is its own corpus (the 43 defects, the clean pairs, the mutants).
- Equivalence and correctness are independent: equal to the parent keeps the parent's defects; lean says so
  in the certificate ("equal", never "correct").
