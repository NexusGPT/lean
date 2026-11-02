# Lane w9i-reach (lean): result

Branch `lane/w9i-reach`, from `lead-v4` 0b260f050d with `lane/w8n-all-sites` (564e08e4) merged (41f5fddad1, one
conflict in `design/admission-contract.md`: two appended sections, both kept). Final head of the mechanism:
da3fb80217 (v4). Design note: `langs/ts/design/w9i-reach.md`.

## The number the owner reads

Same caps on both sides: `bench/hour.py --cap 5 --jobs 4 --lean-timeout 600`, start gated at a one-minute load of 64,
`LEAN_WORKER_HEAP_MB=6144`, and one DA for every number: lead-da 4ba4be12c1 (the last hour.py before the cause stage),
in my own clone `/root/da-bench/w9i-reach/da/da-e69ee`. The runs that ran on an older, uncommitted hour.py were scored
again from their records with that DA (`--records-from`); rescoring the 75 after-run reproduced its own numbers exactly
(21, 33, 40). "Before" is 41f5fddad1 (lead-v4 0b260f05 + w8n), run on the same day with the same caps.

| set | before (41f5fddad1) rendered / record | after rendered / record | lean seconds per unit |
|---|---|---|---|
| quick (20) | 6 / 12 | **8 / 12** (v4 da3fb80217) | 98.4 s -> 68.2 s (0.69x), worst side 1.08x |
| the 75 | 21 / 33 | 21 / 33 (v1 aeab972c09); 19 / 33 (v2 e760c72d32) | v1 0.84x, v2 0.75x |
| the six ids the lead rules moved | 4 of 6 (from the 75 run) | 4 of 6 (v3 d60fd99165); **6 of 6** (v4) | |

The brief's before numbers (0b260f05 at `--jobs 12`): quick 12 record, 4 rendered; the 75: 21 record, 14 rendered.
At `--jobs 4` the same lean renders more (quick 6, the 75: 21; record 33 on the 75) and the 75 completes 43 of 75 rather
than 55: the timeouts are pr.mjs's 300 s budget under machine loads of 100 to 176 from other sessions, on both sides.

**What is measured and what is not.** v4 was not run on the whole 75: both of my 75 runs of v3 were stopped by the
lead (`/root/runs/kill-w9i3.sh`: "A 75 run is the lead's, at merge time"). On the 75, v1 differs from before on four
mutants only: svelte#18661~m2/m3 gained and three.js#34688~m2/m3 lost (both from the lead rule; every other mutant
equal). v4's lead rule was built to keep the first and undo the second, and the run on exactly those six ids under the
same caps shows it does: 6 of 6. The parts of v4 that differ from v1 act only where a search witness exists (the lead
rule) or inside the search (novelty-based inertness), so the 75 at v4 is expected at 23 / 33; that number is the lead's
to measure. Record level: unchanged everywhere (33 of 75, 12 of 20). The gain is on the rendered level only.

## The eight ids

| id | before (75 run) | after | why |
|---|---|---|---|
| sveltejs__svelte#18661~m2 | not new | **hit** (75 v1, quick v4, six-id v4) | the search past the PR's witness completes the mutated statement (line 673) no draw ran and differs there; that witness leads |
| sveltejs__svelte#18661~m3 | not new | **hit** (same) | the same search witness: the deleted statement's neighbour differs at 673 |
| cline__cline#13827~m1 | hit | hit | at `--jobs 4` the draws already render it; v2's wider lead rule lost it, v4 keeps it |
| cline__cline#13827~m2 | hit | hit | as m1 |
| google-gemini__gemini-cli#26534~m1 | hit | hit | at `--jobs 4` the unit finishes (it hit the time budget at `--jobs 12`) |
| bluewave-labs__Checkmate#3718~m3 | not new | not new | the "port" input is now kept as its own site (`where.reach` candidate 60) but its difference shows at the return (146), 82 lines from the edit; a draw, so it does not lead |
| n8n-io__n8n#41875~m2 | not new | not new | the search completes the mutated statement (candidate 63, `isLangSmith` set true), but the first differing value is the PR's own drive at line 70: reporting, not reach |
| bluewave-labs__Checkmate#3185~m3 | far | far | a rendered component's handler: rendered units are not searched |

## What landed

1. **The changed statements** (`exec/search.mjs reachTable`): a statement whose own text (less its nested statements)
   holds a line the file diff changed; its point is the evaluation that finishes its own work (expression, return,
   throw, switch and for-of heads, a last declarator added to a declaration list, an if or loop condition). Completed
   means the point ran. Probes `state.r(file, id, v)` (`branchMarks`), built once per file pair; a branch is probed only
   in a changed top-level function. `patch.mjs statementMarks` keeps the source node as original of the return and the
   await it rewrites (metadata only).
2. **The search is on** (`LEAN_SEARCH=0` / `--no-search` turn it off) and runs past the draws' witnesses for the
   unit's changed statements and branches no draw reached, plus the conditions inside a target's condition. Bounds:
   `SEARCH_SHARE` (0.25 of the unit's seconds) and, past a witness, `REACH_CEILING` (0.75 of them since the unit began);
   `design/constants.md` rows. Each replayed divergence goes to `keepDifference` as a draw's does.
3. **The scheduler** (only with the reach search): frontier start inputs first, a change moves only when it hits a
   probe outcome no input hit before, inertness shared across entries, the next entry with a live change goes first,
   an absent list made one element long, an empty one given a target literal.
4. **Reach sites** (`exec/sites.mjs`): a witness carries `reached` (the unit's changed statements its input
   completed); one at a held site is its own site when it completed a changed statement no kept witness completed
   (`where.reach`, in `siteKey`).
5. **The lead**: the first witness, unless the search found one whose difference shows at a changed statement no draw
   completed. Three wider rules were measured and dropped (design note, item 6): each moved a lead that was right,
   because a draw's order is the same in the PR's run and the mutant's.

`LEAN_BREAK=w9i-reach` restores the earlier rule whole. No part reads the truth, the mutation or a bench file.

## Validators (verbatim)

Pairs under each break, `node lane/w9i-reach/pairs-break.mjs` at da3fb80217, exit 0 (the lines other than `ok` checks; full output `lane/w9i-reach/pairs-break.txt`):

```
LEAN_BREAK=(none) reach_statements: PASS
LEAN_BREAK=(none) reach_site: PASS
LEAN_BREAK=(none) reach_lead: PASS
LEAN_BREAK=(none) reach_lead_site: PASS
LEAN_BREAK=(none) three_sites: PASS
LEAN_BREAK=(none) field_sites: PASS
LEAN_BREAK=(none) two_sites: PASS
LEAN_BREAK=w9i-reach reach_statements: RED
  NO  pr index.ts label witnesses name candidate line(s) 8, 12: 1 witness(es) at candidate line(s) 12; missing 8
LEAN_BREAK=w9i-reach reach_site: RED
  NO  pr index.ts defaults a witness kept for first completing candidate 4: where.reach absent over 1 witness(es)
LEAN_BREAK=w9i-reach reach_lead: RED
  NO  pr index.ts label witness (the lead) at candidate line 8: witness at candidate line 12 of 12
  NO  pr index.ts label witnesses name candidate line(s) 8, 12: 1 witness(es) at candidate line(s) 12; missing 8
LEAN_BREAK=w9i-reach reach_lead_site: RED
  NO  pr index.ts settle witnesses name candidate line(s) 6, 11: 1 witness(es) at candidate line(s) 6; missing 11
LEAN_BREAK=w8n-all-sites three_sites: RED
  NO  pr index.ts band witnesses at 3 site(s), witness the first: 2 witness(es) at candidate line(s) 3, 4; witness is witnesses[0]
LEAN_BREAK=w8n-all-sites field_sites: RED
  NO  pr index.ts Counter.save witnesses name candidate line(s) 7, 8: 1 witness(es) at candidate line(s) 9; missing 7, 8
LEAN_BREAK=w8n-fields field_sites: RED
  NO  pr index.ts Counter.save witnesses name candidate line(s) 7, 8: 3 witness(es) at candidate line(s) 9, 8; missing 7
LEAN_BREAK=w7a-witnesses two_sites: RED
  NO  pr index.ts grade witnesses at 2 site(s), witness the first: 1 witness(es) at candidate line(s) 2; witness is witnesses[0]
  NO  pr --units index.ts::grade index.ts grade witnesses at 2 site(s), witness the first: 1 witness(es) at candidate line(s) 2; witness is witnesses[0]
every pair green plain, red under its break
```

The 30 sample pairs (`lane/w1h-census/sample-pairs.txt`) and the seven site and reach pairs, at da3fb80217,
`LEAN_PAIRS=... JOBS=4 LEAN_CONFORMANCE=full node --max-old-space-size=12288 tests/run.mjs` (`lane/w9i-reach/suite-v4.txt`):

```
| WALL | 1465 s | JOBS 4 |
| TOTAL | 1328 checks | ALL PASS |
| PROOF-HUNT TOTAL | 179 units read by both lanes | NO HIDDEN FALSE PROOF | 0 exempt by a door (adapter, NaN or infinity on a unit with no number operation) |
| FAKE-CONFORMANCE TOTAL | 35 fake(s) under exec/fakes, 35 pass | 12 of 12 good fixtures pass | 3 of 3 wrong fixtures refused | 204 clauses, 27814 checks | seed 1 | ALL PASS |
| MODEL-CONFORMANCE TOTAL | 193 units in 28 pairs (9 skipped) | 89 executable: 81 agree, 8 disagree | 88 not executable, 10 outside domain, 6 not bridged, 0 model error, 0 skipped | 0 coupling finding(s) (0 sampled) | NO NEW FINDING |
| SELF-PAIR TOTAL | 242 units | NO WITNESS | {"PASS-bounded":242} | sample not supplied | 0 no-parent exclusions |
```

w3c's search test at da3fb80217: `node tests/search-inputs.mjs` -> `search-inputs: 16 checks pass` (exit 0);
`--break` -> exit 1, `AssertionError [ERR_ASSERTION]: found two changes away, the first opening the branch the second needs (stop: no change left, tried 7, kept 0)`.

Bench lines (`lane/w9i-reach/measure.txt` holds every per-id table and time line):

```
quick-w9i-before-1-r: 41f5fddad1 M rendered 6 of 20 (30.0 %), record 12 of 20, completed 20 of 20
quick-w9i-4: da3fb80217 M rendered 8 of 20 (40.0 %), record 12 of 20, completed 20 of 20, wall 15.8 min
sides 27, units 31; lean s 3051 -> 2114, ratio 0.69x; per unit 98.4 s -> 68.2 s; worst side bluewave-labs__Checkmate#3257~m1 14 -> 15 s (1.08x)
s75-w9i-before-1-r: 41f5fddad1 M rendered 21 of 75 (28.0 %), record 33 of 75, completed 43 of 75
s75-w9i-1-r: aeab972c09 M rendered 21 of 75 (28.0 %), record 33 of 75, completed 40 of 75
s75-w9i-2: e760c72d32 M rendered 19 of 75 (25.3 %), record 33 of 75, completed 46 of 75, wall 157.8 min
sub6-w9i-3: d60fd99165 M rendered 4 of 6 (66.7 %), record 6 of 6, completed 6 of 6
sub6-w9i-4: da3fb80217 M rendered 6 of 6 (100.0 %), record 6 of 6, completed 6 of 6
```

The before 75 run was stopped in the cause stage of a newer hour.py (another lane's tree changed under it); its
`hour.json` was rebuilt from its records and log (each side marked `rebuilt by lane w9i`) so `--records-from` could
score it with the pinned DA.

## Open

- The 75 at v4 (expected 23 / 33 from the six-id run): the lead's run at merge time.
- Record level did not move: every mutant the search now reaches already had a WITNESS on its unit.
- 3718~m3 and n8n 41875~m2 need the witness's location (provenance of a differing value), not reach.
- Rendered units and the module unit are not searched; a changed class property initializer or parameter default is
  no statement and no target.
- Class units: program witnesses are placed ahead of the draws' and never reordered.
