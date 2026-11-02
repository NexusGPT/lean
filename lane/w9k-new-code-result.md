# Lane w9k-new-code: a unit the PR adds has no "before", so lean reports what it does on drawn inputs

Branches `lane/w9k-new-code` in lean (from `lead-v4` 0b260f05) and in DA (from `lead-da` e69ee731). No model in any
path. The 44 AACR instances were never read (`calib/heldout_check.py`, which reads them, was not run; see Open).
Records written under `/root/da-bench/w9k-new-code/` only.

## The 10, before anything was built (what each needs)

Lean run candidate-only on each mutated unit, PR head against mutant, n 30 (`/root/da-bench/w9k-new-code/probe/`):

| id | unit | what the mutant does on drawn inputs | an outcome fact? |
|---|---|---|---|
| n8n#42038~m2 | encodeIdSegment | TypeError `Unknown encoding: hexx` on 18 of 30 (head: 0) | yes, but every input was "world": the module graph's rule (another module reads `UserError.prototype` at load; the unit names `Buffer`) |
| cline#13857~m1 | mergePromptEvidence | the result no longer depends on `submittedPrompts` (drawn ids never overlap) | yes, a parameter the value ignores; same graph rule |
| n8n#42038~m1, ~m3 | encodeIdSegment | a string with `x` appended; hex bytes without dots | no fact tells it from the head: refused |
| cline#13827~m3 | userHome | reads the Windows variables off Windows; still a string | no |
| cline#13857~m2, ~m3 | CloudSessionManager.send | throws `session_not_found` on every drawn input, at the head too | no |
| three.js#35267~m1..m3 | getPointShadowDepthFn | no drawn input is one the declared (opaque) types admit | refused, correctly |

So the honest ceiling of outcome facts on the 10 is 2. Then, in the bench, neither could land at all: n8n#42038's
pr.mjs ran out of memory or past its budget in preparation (10:39, 10 GB, 0 of 3 units reached), cline#13857's
timed out (8:00, 0 of 1 unit). Two of the four lean commits below are those blockers.

## What landed

Lean (`lane/w9k-new-code`):
- `ede13d68` exec/new-unit.mjs: **unitWorld**, the world a new unit's call can read is what the code it reaches names
  (reach.mjs `owners`, followed across the program's source files through imports and members), not the whole module
  graph; **Buffer** is Node's own in the sandbox, not a world handle; **new:nan** (NaN returned, or held within three
  levels, on an input holding no NaN or infinite number; -0 refused: it equals 0 under every comparison but Object.is);
  **new:ignored / new:unread** (parameter trials: each base input run again, then with one parameter alone redrawn; a
  base that does not repeat its outcome refuses them); pr.mjs keeps runNew's records under a lint finding.
- `d9da1a52` typed.mjs **ownFirst**: a change whose own file emits differently is decided before the two
  whole-project programs are made (the full reading's files always include that file). n8n#42038~m2, packages/cli
  4,749 files: pr.mjs 10:39 / 10 GB / budget stop before the first unit -> 2:19 / 3.9 GB / all 3 units.
- `8c0c696f` pr.mjs changedUnits **lints only the units the run reads** (routed, and listed by --units): it linted
  every unit of the file, lowering it once per unit. cline#13857~m1: 404 of 468 s in that lint, budget stop at 8:00
  -> 0:57, the unit NEW with its record. report.json gains `linted`.
- `8c103142` refusals read off the dev corpus's facts (below): new:fault says `built: engine | program`; a
  ReferenceError for any name the sandbox lacks is coverage (react `__DEV__`); the trials need two returned values
  among the closed calls (a predicate the draws never satisfy), bases the first input of each value first.

DA (`lane/w9k-new-code`):
- `265af74c` record kind **lean:new-unit-fact:<fault|shape|nan|ignored|unread|test>**, point FACT (gated by the class
  table as a rule is; never a verdict): instruments_lean.compact keeps `records`; from_lean_row gives a row's facts,
  one per class on the unit's first line, the arguments as JavaScript (`js_literal`); a template per fact; the strict
  fidelity checker passes every one (tests).
- `1f90f1a8` a fault is a fact only when the engine raised it on an input admitted without any/unknown.
- `08c9cac1` bench/new_unit_facts.py (lean's facts on a PR set's new units, pr.mjs's options), new_unit_calib.py.
- `ed7fb9aa` calib/tables/fire.json and classes.json calibrated (`classes.py --calibrate`).

## Calibration (dev, the fire rule as for every class)

296 dev PRs; 114 with units no parent holds read (1,085 units; 45 PRs have no frozen lean record, 137 no new unit):
**13 FACT records on 9 PRs, 0 paired** with a reviewer's note: fault 2, ignored 7, nan 3, shape 1 (unread, test 0).
Every class stays **silent**: n_records under 20 and wilson_lo 0.0000 under the base rate. Base rate 0.011177 ->
0.011167; no other class's fire moved. Before the refusals (lean ede13d68): 59 records, 0 paired; of the 59, one had a
human comment inside its unit at all (react#35661, about swallowed eval errors; lean's fact there was `__DEV__ is not
defined`, a false fire), so the zero is not the one-line anchor's.

    FACT records added: 13 on 9 PRs
    base rate: 0.011177 -> 0.011167 (min_records 20)
    lean:new-unit-fact:fault       n_records    2 paired   0 rate 0.0000 wilson_lo 0.0000 fire False
    lean:new-unit-fact:ignored     n_records    7 paired   0 rate 0.0000 wilson_lo 0.0000 fire False
    lean:new-unit-fact:nan         n_records    3 paired   0 rate 0.0000 wilson_lo 0.0000 fire False
    lean:new-unit-fact:shape       n_records    1 paired   0 rate 0.0000 wilson_lo 0.0000 fire False
    other classes whose fire moved: none

## Measured (hour bench, my trees, jobs 4, oracles cap 5 s, lean timeout 600 s)

Trees: lean before `lean-before` 0b260f05, after `lean-after` 8c103142; DA before lead-da e69ee731 + w9d's hour bench
54b17b62 (`bench-before`), after the lane's head + the same 54b17b62 (`bench-after`; before -> after differ by the
lane's 13 files only); FORCED = bench-after with the six fact classes set `fire: true`, labelled as the ceiling.

Scripts: lane/w9k-new-code/ (checkout10.py, probe10.sh, show.py: the probe; measure10.py: the 10 by name; before75.sh).

The 10 (`--only`), record level = a FACT on the mutated unit, rendered = the scorer's M match:

| run | completed | fact on the mutated unit | M rendered |
|---|---|---|---|
| before w9k-before-10 | 4 of 10 (cline#13857 x3, n8n#42038 x3 timed out) | 0 | 0 |
| after w9k-after-10 | 10 of 10 | 2 (n8n#42038~m2 fault, cline#13857~m1 ignored) | 0 (classes silent) |
| after, classes FORCED on (the ceiling) | 10 of 10 | 2 | 1 (n8n#42038~m2, line 98 for the edit at 100) |

    0b260f050d M rendered 0 of 10 (0.0 %), record 0 of 10, completed 4 of 10, wall 24.4 min
    8c10314255 M rendered 0 of 10 (0.0 %), record 0 of 10, completed 10 of 10, wall 13.9 min
    8c10314255 M rendered 1 of 10 (10.0 %), record 0 of 10, completed 10 of 10, wall 0.0 min      (FORCED)

cline#13857~m1's comment (forced) stands on the unit's first line, 940, seven lines from the edit at 947: not a hit
under the 5-line rule. The other 8 have no outcome fact (table above). The scorer's "record" column counts WITNESS
verdicts only; the fact column is this lane's (scripts/measure10.py).

The 75 (98 sides):

| run | lean, DA | completed (mutant sides without a timeout row) | M record (WITNESS) | M rendered | precision | comments |
|---|---|---|---|---|---|---|
| before, INTERIM: the lead's `v4-0b260f05-1` records (jobs 24) rescored with bench-before's DA (`w9k-before-75-from-v4`) | 0b260f05, lead-da e69ee731 | 36 of 75 (39 timeout rows) | 21 | 15 | 62.5 % | 24 |
| after `w9k-after-75s` (records of `w9k-after-75` + `w9k-after-75-rest`) | 8c103142, lane | 72 of 75 (n8n#42117 x3) | 44 | 27 | 48.2 % | 56 |
| after, classes FORCED on (the ceiling) | same records | 72 of 75 | 44 | 28 | | |

    0b260f050d M rendered 15 of 75 (20.0 %), record 21 of 75, completed 26 of 75, wall 0.1 min   (interim before)
    8c10314255 M rendered 27 of 75 (36.0 %), record 44 of 75, completed 9 of 75, wall 0.0 min    (after; "completed 9": only the second run's sides carry step data)
    8c10314255 M rendered 28 of 75 (37.3 %), record 44 of 75, completed 9 of 75, wall 0.0 min    (FORCED)

**What the 75 does and does not show.** The like-for-like before (lean 0b260f05, jobs 4, the same trees) did not run:
`w9k-before-75` was stopped by a SIGTERM 55 min in (09:04, when another lane's bench started), `w9k-before-75b` (queued
on `/root/runs/bench.lock`) disappeared from the queue without a line, `w9k-before-75c` (a logging wrapper) was still
waiting for the lock after 2 h at the time of writing. So the 75's before is the lead's jobs-24 run, whose timeouts
are partly contention: 27 mutants differ between it and after, 25 of them timeout -> completed. Lean is deterministic
on a completed side, so the 48 that agree are settled; whether the 25 time out at jobs 4 before this lane's two
preparation fixes is exactly what is not measured. What is measured like-for-like (the 10, same jobs, same trees):
6 timeouts before, 0 after, and the two such sides analysed one by one (n8n#42038~m2: 10:39 budget stop -> 2:19;
cline#13857~m1: 8:00 budget stop -> 0:57). The new-unit facts add nothing to the 75's rendered count (silent); the
forced ceiling adds 1 (n8n#42038~m2). The after run itself is assembled: `w9k-after-75` was stopped by a SIGTERM at
08:00 after 86 of 98 sides (another bench started), the 12 missing sides ran as `w9k-after-75-rest`; 20 parents'
per-instrument lean/oracles/rules files were lost in my copy (their merged `pr/<sid>.json` records are whole), so the
ledger did not run (exit 2) and the table names those parents "no lean file". Precision fell 62.5 % -> 48.2 % (24 ->
56 comments): sides that now complete add comments that do not hit.

## False-fire check (the parents' new units, and the dev facts read)

The 23 parent PRs: 9 hold units no parent holds (36 units): **0 facts** on them (lean 8c103142). So the read was made on
the dev corpus's 13 facts (all read): 1 a reviewer could raise (n8n#42145 `median([])` returns NaN), 12 not: 7
`ignored` where the parameter matters only on a branch the draws never reach (`resolveRemotePath`'s `home` only for
`~/` paths, `expandPluginVariables` drew no `${...}`, `isPathWithin` with parent ""), `Invalid time value` on
`createdAt: "none"`, `Invalid URL` on `""`, a test fixture's shape, three.js `lodToRoughness` NaN outside its range
(x2). Before the refusals, the 59 also held 33 validators' own throws, 13 faults on any/unknown inputs, react's
`__DEV__` x3 and predicates false on every draw: each became a refusal (8c103142, 1f90f1a8), red-first.

## Validators (verbatim)

Lean, at 8c103142 (logs under /root/da-bench/w9k-new-code/):

    node tests/w9k-new-code.mjs --break        (breaks3.log)
    ok   new_unit_facts (LEAN_BREAK=unit-reach): 30 checks, 4 failed
    ok   new_unit_facts (LEAN_BREAK=real-buffer): 30 checks, 2 failed
    ok   new_unit_facts (LEAN_BREAK=nan-fact): 30 checks, 2 failed
    ok   new_unit_facts (LEAN_BREAK=ignored-param): 30 checks, 2 failed
    ok   new_unit_facts (LEAN_BREAK=fault-origin): 30 checks, 1 failed
    ok   new_unit_facts (LEAN_BREAK=undefined-global): 30 checks, 1 failed
    ok   new_unit_facts (LEAN_BREAK=trials-constant): 30 checks, 1 failed
    ok   typed (LEAN_BREAK=typed-own-first): red
    ok   pr (LEAN_BREAK=lint-wanted): red
    ok   pr (LEAN_BREAK=findings-records): red
    every break turns red
    node tests/run.mjs --pair new_unit_facts:  | TOTAL | 30 checks | ALL PASS |
    node tests/w9k-new-code.mjs --pr: ok x4, "a unit added under a lint finding keeps its records"
    node tests/w9k-new-code.mjs --typed: ok x3
    node tests/w1h-new-units.mjs: new_unit_fault 26 checks 0 failed; new_unit_shape 16, 0; new_unit_test 12, 0; every pair green
    node tests/w1f-module-units.mjs: module_unit 7/7; type_only 9/9; directive 10/10; js_unit 6/6; --break w1f-module 5 red; --break w1f-js 2 red; --break w1f-types 3 red; --break w1f-emit 5 red; --break w1f-closure 2 red; --break w1f-directive 1 red
    sample (w1h's 30 pairs + new_unit_fault, _shape, _test, new_unit, new_unit_facts), JOBS=2:  | TOTAL | 1412 checks | ALL PASS |
    ci/ledger-failures, ledger, new-code, report, supervise, values-line, worktree, tests/fixtures/pr-intake/test.mjs, w1h --pr: exit 0
    ci/comment.test.mjs: 65 of 69 checks pass, the same four failing at the base 0b260f05

Red first, the same checks at the base 0b260f05 (a worktree with the pair and the test script copied in):

    FAIL new_unit_facts: 30 checks, 8 failed
    --typed: FAIL a runtime change is decided on its own emit
    --pr: FAIL --units grow: grow alone is linted of the three changed units; FAIL grow keeps its new:fault on undefined

DA, at the lane head (LEAN=/root/lead-v4):

    test_new_unit_fact 13 tests OK; --break: 10 red, 0 green (compact-drops-records, new-row-no-facts, fact-on-caller,
      one-per-class-off, raw-strings, program-fault-kept, wide-fault-kept, markers-raw, no-call-slot, fact-fires-ungated)
    test_render 49 OK (--break 27 red); test_fidelity 12 OK (--break 5 red); test_determinism 1 OK; test_record 31 OK;
    test_da_attest 16 OK (skipped 1; two exact points dicts gained FACT: 0); test_findings 31 OK; test_pair 15 OK;
    test_reach_gap 14 OK; test_reader_explain 14 OK; test_pre_score 6 OK; test_recordings_diff 13 OK; test_screen_route 15 OK
    test_calib_isolation: FAILED (failures=1): GateRecord.test_the_gate_record_carries_the_tables_sha (see Open)
    red first, test_new_unit_fact against lead-da's harness: FAILED (failures=2, errors=9)

## Open

- **The class is silent.** Measured dev rate 0 of 13 (0 of 59 before the refusals): reviewers did not write on these
  units. The ceiling with the class forced on is 1 more of 10 / of 75 (n8n#42038~m2). The `ignored` kind's remaining
  false fires are parameters that matter on a branch the draws never reach; outcomes alone cannot tell that from
  cline#13857~m1's bug (a search that drives the branch would; w3c's search is behind its flag).
- **The 75's like-for-like before** (above): `scripts/before75.sh` is queued on the bench lock and writes
  `/root/da-bench/w9k-new-code/hour/w9k-before-75c`; if it lands, its line replaces the interim.
- **The gate record's tables sha** (test_calib_isolation): classes.json and fire.json changed; refreshing it means
  running calib/heldout_check.py, which reads the 44. Not run here; the lead's.
- **Placement**: a fact stands on the unit's first line. cline#13857~m1 lands 7 lines from the edit. The throwing line
  (from the stack through a source map) is not built: on the 10 it would move nothing measured.
- 8 of the 10 have no outcome fact; three.js#35267 needs a draw its opaque types admit (not this lane).
- Process slips, reported: three shell commands of mine used `/dev/null` (a worktree add's output, a background
  wrapper's outer redirect, a wait loop's grep); twice a `pkill -f` pattern matched my own shell; my bench runs were
  first started without the shared bench lock.
