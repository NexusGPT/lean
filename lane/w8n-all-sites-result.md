# Lane w8n-all-sites (lean): result

Branch `lane/w8n-all-sites`, from `lane/w7a-lean-witnesses` at ce59e2f79c. Three commits: 3871567c56 (mechanism 1),
94f6b21b81 (mechanism 2), c2fc91bf5a (the measurement script's `--sides`), then this report.

## The number the owner reads

The slice's mutants whose mutation line is a reported site: **19 of 37 before, 19 after mechanism 1, 19 after
mechanism 2.** Neither mechanism moved it. Measured with `pr.mjs --units <path>::<unit>` (the row DA reads),
merge base against the PR head with the mutant's file written, `--n 30 --dafny-seconds 30` (the bench's budgets). A site
reports the mutation when its candidate statement overlaps `truth[0].line_from..line_to`.

A second reading, kept apart from the owner's number: four of the 37 mutants delete a statement (the mutated line is
blank). The candidate has no line for a deleted statement, so lane B names the difference at the next candidate
statement, and the strict reading cannot credit it. The parent side of that witness is the deleted statement itself.
`deleted-credit.mjs` checks for it by exact text, never by distance: **1 of 4 before, 2 of 4 after mechanism 2**
(typescript-go 3834~m1: `this.outputChannel.appendLine(...)` deleted at line 144, now named on a witness's parent side
at 144, candidate 145). With that reading the count is 20 → 21.

Sites named across the 37 rows: 48 before, 81 after mechanism 1, 95 after mechanism 2. Verdict changes: 0.

The brief said 36 witnessed units. The records give 37 mutants whose truth unit's row has lane B WITNESS
(`lane/w8n-all-sites/witnessed.json`, chosen by that rule alone). All 37 are measured.

## What landed

1. **Sites, not inputs** (`exec/sites.mjs`, `exec/run.mjs`). Lane B no longer stops at its third differing input. Past
   the first witness it draws on until one of three stops:
   - the `n` inputs are spent;
   - `WITNESS_SITES` (8) distinct sites are held;
   - `WITNESS_SHARE` (a quarter) of the unit's seconds has passed since the first witness, so the unit's CPU bound can
     never turn a WITNESS into a spin-bound ASK.

   One witness is kept per site, using w7a's key (`siteKey`, now shared with `pr.mjs siteWitnesses`). Past the first
   witness, a harness stop or an escaping error ends the draws and the WITNESS stands. Before, the module unit's loop
   returned ASK on a later harness stop. `lanes.B.bound.sites` names the sites held, the inputs that differed and the
   stop. The certificate's `lanes.B.witnesses` is one witness per site in order of discovery, and `witness` is
   unchanged. Break: `LEAN_BREAK=w8n-all-sites`.
2. **Every field an input differs on** (`exec/run.mjs fieldDifferences`). `firstDifference` named an input's first
   differing field only (outcome, heap, receiver, trace, ...). When every input also differed on an earlier field, a
   later field's statement was never named, however many inputs were drawn. This was found on the slice: in 3834~m1
   every input differed first on the receiver, and the deleted request at line 144 was hidden behind it. Now each
   differing field is located, and a later field is kept when it names a candidate statement no earlier field named.
   Break: `LEAN_BREAK=w8n-fields`.
3. The constants ledger `langs/ts/design/constants.md` (it did not exist; it now holds `WITNESS_SITES` and
   `WITNESS_SHARE` with the existing lane B bounds), `design/w8n-all-sites.md`, notes in `subset.md`,
   `admission-contract.md` and `w7a-lean-witnesses.md` (its open item closed). New pairs: `tests/pairs/three_sites`
   and `tests/pairs/field_sites`. New harness form `siteLines` in `tests/pr-pair.mjs`.

No part of either mechanism reads the change, the diff's lines or the truth. A site is kept or dropped by its key alone.

## Validators (verbatim)

Site pairs under each break (`node lane/w8n-all-sites/pairs-break.mjs`, exit 0; full output in `pairs-break-final.txt`):

```
LEAN_BREAK=(none) three_sites: PASS
  ok  pr index.ts band witnesses at 3 site(s), witness the first: 3 witness(es) at candidate line(s) 3, 4, 2; witness is witnesses[0]
LEAN_BREAK=(none) field_sites: PASS
  ok  pr index.ts Counter.save witnesses name candidate line(s) 7, 8: 4 witness(es) at candidate line(s) 9, 7, 8
LEAN_BREAK=(none) two_sites: PASS
LEAN_BREAK=w8n-all-sites three_sites: RED
  NO  pr index.ts band witnesses at 3 site(s), witness the first: 2 witness(es) at candidate line(s) 3, 4; witness is witnesses[0]
LEAN_BREAK=w8n-all-sites field_sites: RED
  NO  pr index.ts Counter.save witnesses name candidate line(s) 7, 8: 1 witness(es) at candidate line(s) 9; missing 7, 8
LEAN_BREAK=w8n-fields three_sites: PASS
LEAN_BREAK=w8n-fields field_sites: RED
  NO  pr index.ts Counter.save witnesses name candidate line(s) 7, 8: 3 witness(es) at candidate line(s) 9, 8; missing 7
LEAN_BREAK=w7a-witnesses two_sites: RED
```

Regression: the 30 pairs of `lane/w1h-census/sample-pairs.txt` plus two_sites, three_sites and field_sites,
`JOBS=4 LEAN_CONFORMANCE=full node --max-old-space-size=12288 tests/run.mjs`:

```
| WALL | 1459 s | JOBS 4 |
| TOTAL | 1312 checks | 1 FAILED |
| PROOF-HUNT TOTAL | 178 units read by both lanes | NO HIDDEN FALSE PROOF | 0 exempt by a door (adapter, NaN or infinity on a unit with no number operation) |
| MODEL-CONFORMANCE TOTAL | 193 units in 28 pairs (5 skipped) | 89 executable: 81 agree, 8 disagree | 88 not executable, 10 outside domain, 6 not bridged, 0 model error, 0 skipped | 0 coupling finding(s) (0 sampled) | NO NEW FINDING |
| SELF-PAIR TOTAL | 238 units | NO WITNESS | {"PASS-bounded":238} | sample not supplied | 0 no-parent exclusions |
```

The one failure is the known fakes row (`conformance | fakes ... | FAIL | ... 36 fake(s) under exec/fakes, 29 pass ...
7 BAD`). This base has no w2f merge (lead-v4 has it at dd9ec28314). Every other check passes.

Time, by w3c's method (`lane/w8n-all-sites/time-pairs.mjs`: `exec/run.mjs --n 30`, both trees alternately, two reps,
the least wall time):

```
--first 10:   units 84; total 170213 ms -> 175329 ms, ratio 1.03x; worst unit 1.21x; verdicts changed 0
--witness 10: units 79; total 161168 ms -> 166145 ms, ratio 1.03x; worst unit 1.28x; verdicts changed 0
```

Under the 1.5x bound. `--witness 10` takes the first ten pairs with a WITNESS unit (the units whose draws this lane
lengthens). On the slice, the summed pr.mjs wall time went from 10,827 s to 10,516 s after mechanism 2 (0.97x;
machine load dominates at this scale).

## The slice table (37 rows)

`lane/w8n-all-sites/slice-table.md` (rows: before / mechanism 1 / mechanism 2; JSON in `slice-table-before-m1.json` and
`slice-table-m2.json`). Summary: lane B verdicts identical in all 37 rows. Sites 48 → 81 → 95. Mutation line a site
19 → 19 → 19.

The 18 misses, by what is in the way:

- **The draws never reach the mutated statement** (nearest site 80 to 600 lines away): Checkmate 3718~m1/m2/m3,
  three.js 35012~m1, svelte 18661~m1/m2 (and 3185~m3, 35 lines before, 18 after mechanism 2). These need inputs that
  reach a guarded branch (w3c's search runs only when the draws find no difference) or callers' context. More draws or
  more sites do not help.
- **A deleted statement** (3834~m1, 26534~m1, 34688~m1, 18661~m3): the candidate has no line for it. Two are named on
  the parent side after this lane (above), 34688~m1 and 18661~m3 are not.
- **Named one line off by the candidate's structure**: cline 13827~m1/m2 (the mutation at 57 is inside a call whose
  difference completes at 58); 3834~m3 (seven lines); Checkmate 3257~m2 (a hook's effect, located at 16 for the
  mutation at 6 to 14; before it had no candidate line at all).
- **No verdict in these runs**: n8n 41875~m1/m2/m3. The lane B worker crashed (SIGABRT) on both trees under
  `LEAN_WORKER_HEAP_MB=6144`. The bench's records have WITNESS for them, so this is the measuring environment, not the
  change.

## What is open

- The owner's number did not move. Mechanisms 1 and 2 name more sites (95 vs 48) and one more deleted statement, but
  the misses are mostly reach (the draws never execute the mutated statement), not reporting. The next structural steps
  are: (a) run the branch-guided search (w3c) after a WITNESS too, aimed at the changed statements no site covers;
  (b) let a site carry its parent-side statement as a first-class location, so a deletion is located where it was.
- `WITNESS_SITES = 8` was reached on two rows (3834~m1 after mechanism 1, 34688~m1). Neither had the mutation inside the
  held sites, and raising the cap was not measured.
- The module unit's loop names one field per input (mechanism 2 is the function loop's).

## How it was measured

`prep.py` (the materialiser's own `restore` and `edited`, reading only the 37 listed instance files): one blobless
checkout per PR under `/root/da-bench/w8n-all-sites/<pr>/head`, and each mutant's file under `mutants/<id>/`.
`slice-sites.mjs` then runs pr.mjs per mutant and tree, with a fresh cache and runs dir each, at most 4 at a time,
waiting while the one-minute load is above 64. Before is a worktree of ce59e2f79c. A first pass with `check.mjs` was
dropped: it cannot see a file the PR renamed or added the way pr.mjs does (Checkmate 3257~m2 came out NEW).
