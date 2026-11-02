# Lane w8q-hard-set: result

The question: a set of planted bugs a model reviewer misses and a differential checker catches, its kinds taken from the
shapes real later fixes repair, never from what OCR misses. The answer, measured on 108 hard instances across 10
repositories (dev): **the set is hard, but hard for DA far more than for OCR.** OCR (Haiku) catches 83 of 108
(76.9 %, against 92.3 % on M's first kinds); lean on the mutated unit alone catches 31 of 108 (28.7 %); DA renders 2 of
the 60 instances materialised so far (3.3 %). The owner's bar ("the reviewer like 50 % and we at like 80 %") is not met;
the gap runs the other way. The table is the set's difficulty, per kind; no kind was removed or changed after the OCR
run.

## What landed

DA, branch `lane/w8q-hard-set` (base lead-da 79302983):
- `bench/build.py`: `sites --kinds <hard kinds> --mutate-lean <lean>` (the hard plan: three hard kinds per PR, no caller,
  ids `~h1..~h3`, a site whose edit is already chosen passed over, the truth lines widened to git's own hunks of the
  edit), `instances --hard` (into `bench/hard/`, and `selected-{dev,test}.txt`: per kind the first 12 by sha1(id)).
  v1's M is unchanged (its own folder; v1's tests pass).
- `bench/hard/`: the hard set built on dev: 296 PRs, 575 hard mutants, 108 selected (12 per kind, 10 repositories).
- `bench/sites.mjs --hard`; `bench/run.py --instances-dir --mutants-file`; `bench/score.py --instances-dir`;
  `bench/ocr_entry.py --load-max` (default 40 kept); `bench/hard_check.py` (lean on the mutated unit alone, resumable,
  with lane B's bound per row); `bench/hard_table.py` (the per-kind table).
- Two crashes on lean's `replayed: true` flag (a witness whose solver counterexample was replayed), both found by the hard
  set's records: `da/record.py _sides` (da-attest crashed) and `instruments_lean._observed` (a materialised mutant's lean
  step failed, cline__cline#13974~h1).
- `bench/README.md` "M-hard" (the definition, fixed before any run), `bench/LOG.md` entry.
- Runs: `bench/runs/2026-11-01-hard-ocr-dev/` (OCR), `bench/runs/2026-11-02-hard-dev/` (the table, both lean-on-unit runs,
  the default-witness measurement, da-attest's RESULT on the part materialised).

lean, branch `lane/w8q-hard-set` (base lead-v4 844ddac2), 6 files, nothing else:
- `langs/ts/exec/mutate-hard.mjs`: nine hard kinds; `exec/mutate.mjs` lists them only with `opts.hard` / `--hard`, after
  every site of its own kinds (three lines: the import, the push, the flag). Every site's `was` is the file's text in
  `[start, end)`, `text` its replacement, `lines` its first and last line. `LEAN_BREAK=hard-kind:<kind>` lists none of
  that kind.
- `tests/hard-mutants-fixture.mjs` and `tests/fixtures/hard_mutants/` (one unit per kind).

Withdrawn (no measured impact): a check.mjs rule keeping lane B's WITNESS when a signature differs only in parameter
defaults. On the 12 changed-default instances it changed nothing (8 of 12 WITNESS with it and with
`LEAN_BREAK=default-witness`); the real defaults are destructured or inner, not the unit's own signature. It is not on the
branch (commit b9b36b52 removes it; the branch's diff against 844ddac2 is the six files above).

## The kinds (fixed before any run; README "M-hard")

callback-effect, effect-after-exit, dropped-cleanup, deep-boundary, loop-bound, option-variant, numeric-conversion,
changed-default, swapped-effects; each from a repair shape of lane w8l's `escape_shapes.md` (call-added 465 distinct
repairs, early-exit 52/30, error-handling 19/7, condition-changed 126, loop-bound 3, argument-changed 278 and
property-changed 203, call-changed 176, value/constant-changed 108/160, ordering-changed 41). Not built: the
caller-through-callee case (a mutation in an untouched callee of a changed unit) as its own role; open below.

## The table (dev, 108 selected, 10 repositories)

| kind | instances | repositories | lean record level (WITNESS on the unit) | of which the parent had none | lean on the unit (v0.1.4) | lean on the unit (lead-v4+search) | DA rendered | OCR recall |
|---|---|---|---|---|---|---|---|---|
| callback-effect | 12 | 6 | 1 of 6 (16.7 %) | 0 of 6 (0.0 %) | 0 of 12 (0.0 %) | 0 of 12 (0.0 %) | 0 of 6 (0.0 %) | 10 of 12 (83.3 %) |
| effect-after-exit | 12 | 6 | 2 of 4 (50.0 %) | 0 of 4 (0.0 %) | 4 of 12 (33.3 %) | 4 of 12 (33.3 %) | 0 of 4 (0.0 %) | 8 of 12 (66.7 %) |
| dropped-cleanup | 12 | 6 | 2 of 10 (20.0 %) | 1 of 10 (10.0 %) | 2 of 12 (16.7 %) | 3 of 12 (25.0 %) | 1 of 10 (10.0 %) | 11 of 12 (91.7 %) |
| deep-boundary | 12 | 8 | 1 of 9 (11.1 %) | 0 of 9 (0.0 %) | 1 of 12 (8.3 %) | 1 of 12 (8.3 %) | 0 of 9 (0.0 %) | 11 of 12 (91.7 %) |
| loop-bound | 12 | 4 | 0 of 9 (0.0 %) | 0 of 9 (0.0 %) | 2 of 12 (16.7 %) | 2 of 12 (16.7 %) | 0 of 9 (0.0 %) | 9 of 12 (75.0 %) |
| option-variant | 12 | 4 | 2 of 5 (40.0 %) | 1 of 5 (20.0 %) | 7 of 12 (58.3 %) | 6 of 12 (50.0 %) | 1 of 5 (20.0 %) | 11 of 12 (91.7 %) |
| numeric-conversion | 12 | 5 | 1 of 8 (12.5 %) | 0 of 8 (0.0 %) | 2 of 12 (16.7 %) | 2 of 12 (16.7 %) | 0 of 8 (0.0 %) | 7 of 12 (58.3 %) |
| changed-default | 12 | 6 | 4 of 9 (44.4 %) | 0 of 9 (0.0 %) | 8 of 12 (66.7 %) | 8 of 12 (66.7 %) | 0 of 9 (0.0 %) | 11 of 12 (91.7 %) |
| swapped-effects | 12 | 7 | - | - | 5 of 12 (41.7 %) | 5 of 12 (41.7 %) | - | 5 of 12 (41.7 %) |
| **all** | 108 | 10 | 13 of 60 (21.7 %) | 2 of 60 (3.3 %) | 31 of 108 (28.7 %) | 31 of 108 (28.7 %) | 2 of 60 (3.3 %) | 83 of 108 (76.9 %) |

How to read it:
- OCR recall is the set's difficulty, measured: the kinds OCR catches at 90 % or more (dropped-cleanup, deep-boundary,
  option-variant, changed-default 91.7 %) stay in the set, as the rule says. OCR's misses concentrate in swapped-effects
  (5 of 12), numeric-conversion (7), effect-after-exit (8), loop-bound (9).
- The record level and DA rendered are over the 60 instances materialised when this was written (48 left out: 44 not yet
  materialised, 4 stale: the docs fixed below). Of the 13 record-level WITNESSes, 11 are on units the parent PR's own
  records already witness (the PR changed the unit; lean keeps one witness per unit, so the planted edit's own
  difference hides behind the PR's: lanes w7a/w7b, every witness by site). The planted edit's own record-level WITNESS:
  2 of 60. DA renders 2 of 60.
- "lean on the unit": `check.mjs --parent <PR commit's file> --candidate <mutant> --unit <unit>` (bench/hard_check.py),
  so a WITNESS is the planted edit's. v0.1.4 and lead-v4 with the branch search (`LEAN_SEARCH=1`) both catch 31 of 108
  (on different instances: search gains dropped-cleanup and numeric-conversion cases, loses an option-variant to ASK).
- Why lean misses (the 16 lead-v4+search misses with lane B's bound recorded; the first 88 rows of that run came from its
  log after an outside SIGTERM, without the bound): the edited line never reached by draws or search 8 (e.g.
  cline__cline#13974~h1: a real same-repo callee's result decides an early exit at line 234 and the edit is at 256;
  bluewave-labs__Checkmate#3718~h1: `data?.port || 80` -> `?? 80` needs type "port", a present data and port 0 at once,
  two search steps the single-leaf search does not keep), reached but observed equal 5, lane B's CPU bound 2 (n8n), no
  summary 1. React components that never render past their hooks (`component: false`: a `useEffect` callback never
  runs) account for the callback-effect zeros (bluewave-labs__Checkmate#3718~h2).

## Validators (verbatim)

lean (`langs/ts`):
- `node tests/hard-mutants-fixture.mjs` -> `hard mutants fixture: 12 hard sites of 9 kinds, every one planted and caught (WITNESS); the first kinds byte-equal to 844ddac278 on 2006 units` (exit 0)
- `node tests/hard-mutants-fixture.mjs --no-pairs` after the withdrawal -> `hard mutants fixture: 12 hard sites of 9 kinds, every one planted and caught (WITNESS); the first kinds byte-equal to 844ddac278 on 14 units` (exit 0)
- `--break <kind>` for each of the nine: exit 1, `AssertionError [ERR_ASSERTION]: the fixture has a <kind> site` (callback-effect, effect-after-exit, dropped-cleanup, deep-boundary, loop-bound, option-variant, numeric-conversion, changed-default, swapped-effects: all nine red)
- `node conformance/fakes.mjs` -> `| FAKE-CONFORMANCE TOTAL | 35 fake(s) under exec/fakes, 35 pass | 12 of 12 good fixtures pass | 3 of 3 wrong fixtures refused | 204 clauses, 27804 checks | seed 1 | ALL PASS |`

DA (`research/open-code-review/d3/harness`):
- `python3 -I -m unittest discover -s tests -p "test_bench.py"` -> `OK`
- `python3 -I tests/test_bench.py --break hard-no-flag hard-caller hard-same-edit-twice hard-select-all hard-truth-own-lines mutants-file-ignored record-new-with-parent` -> all seven `RED (caught)`
- `python3 -I tests/test_ocr_bench.py --break load-max-ignored` -> `load-max-ignored       RED (caught)`
- `python3 -I tests/test_record.py --break replayed-flag-read` -> `replayed-flag-read   RED (caught)   (FAILED (errors=1))`
- `test_findings.LeanOutcomes.test_a_replayed_flag_is_not_a_replays_values`: `FAILED (errors=1)` before the fix, `OK` after
- `test_record.Classes.test_of_record_and_fires` fails on this branch and on its base 79302983 alike (fixed later on
  lead-da); not this lane's.
- Determinism, da-attest two runs: `148 of 148 instances byte-equal` (timeout-class flips 0)
- The hard build: `instances --hard` after the truth fix: 8 instance docs changed (exactly the 8 edit-off-truth ones),
  every other doc byte-equal, `selected-dev.txt` unchanged.

Cost line (OCR, Haiku through Nexus, copies c6-c9): 114 new instances (108 mutants + 6 parents w5e had no result for),
USD 10.5423, USD 0.0925 per instance, 72,698,530 input and 3,122,757 output tokens; the other 82 parents' results are
w5e's (`runs/2026-11-01-ocr-dev/at-1146`), reused because their commits are the instances' own. Below the cap of 200.

## Before and after

- OCR on M (v1, w5e): 36 of 39 (92.3 %) -> OCR on M-hard: 83 of 108 (76.9 %).
- lean on the hard set's units: 31 of 108 with v0.1.4 and 31 of 108 with lead-v4 + search; nothing this lane landed in lean
  moves it (the one rule tried was withdrawn: 8 of 12 changed-default before and after).
- DA on the hard set: rendered 2 of 60 materialised (3.3 %).

## Open

- The record level and DA rendered on the 48 not yet materialised: the lead's run (`/root/runs/mat-hard.sh`, jobs 2,
  nice 15) was materialising them when this was written; then the 9 fixed instances need
  `LEAN=/root/lean-v014 python3 -I bench/materialise.py --instances bench/hard/instances --out /root/da-bench/w8q/instances --redo-failed --only <the 8 edit-off-truth ids>,cline__cline#13974~h1`
  and the table again: `python3 -I bench/run.py --entry da-attest --split dev --instances-dir bench/hard/instances --mutants-file bench/hard/selected-dev.txt --mat /root/da-bench/w8q/instances --no-judge --out <run>` then `bench/hard_table.py`.
- What would move lean on this set (from the misses, structural, none attempted here): a same-repo callee's result as an
  input lean can vary (the early exits it decides); a two-step search (a literal-typed leaf and a nested optional made
  present together); React components rendered past their hooks so effects and handlers run; every witness by site
  (w7a/w7b) so a planted edit on a PR-changed unit is its own record.
- The caller-through-callee role (a hard mutation in an untouched callee of a changed unit) is not built.
- 11 materialisations timed out at lean's 3,600 s (n8n): counted apart, never as misses.
