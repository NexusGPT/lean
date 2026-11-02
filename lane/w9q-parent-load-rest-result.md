# Lane w9q-parent-load-rest: the 4 parent-load ids w9j left open

Branch `lane/w9q-parent-load-rest` from `lead-v4` feb9fb5163. No model in any path: every verdict below is lean's
(`check.mjs`, `pr.mjs` through DA's `bench/hour.py`, DA tree `lane/w9d-hour-bench` 869938d657). The 44 AACR instances
were never read. Checkouts of my own under `/root/da-bench/w9q-parent-load-rest/ck`, every output under
`/root/da-bench/w9q-parent-load-rest/{hour,out,pairs,prof1,uprof1,iprof3}`.

## The 4 and their causes (named before code)

w9j left four of the nine: react#35731 m1 m2 m3 (pr.mjs stopped at its time budget before the unit) and node#66159~m3
(lane B's CPU bound). Reproduced on feb9fb5163 with the hour bench on those ids alone (`--set slice --only <the 4>
--jobs 2 --cap 5 --lean-timeout 600 --floor-gb 20`, nice 15, no lock: 6 sides):

    feb9fb5163 M rendered 3 of 4 (75.0 %), record 3 of 4, completed 3 of 4, wall 11.6 min

| id | lead-v4 row | cause (one line) |
|---|---|---|
| react#35731 m1 m2 m3 | WITNESS, rendered (pr.mjs reached 1 of 1 units in 79 to 84 s, CPU 84 to 86 s) | none left on lead-v4: the sides reach the unit well inside the 300 s budget. Not attributed by measurement: w9j's failing run was 0b260f05 at jobs 4 and load 107; lead-v4 holds w9f's routed lint (`changedUnits`) and others since. The risk stays (Open): my own profile of the PR side on lead-v4 at nice 15 under load 83 spent 275 s before the first unit, 213 s of it in `lintFile` under `changedUnits`. No lean change of mine. |
| node#66159~m3 | ASK `spin-bound: lane B passed its CPU-time bound of 120 s per unit ... (input 12)`, both the mutant side and the parent side | the regex sampler of lane B's input generation (`exec/regex-sample.mjs quantified`) read the literal `{` of inspect.js line 2522 `/ Iterator] {$/` (Annex B syntax) as a quantifier and scanned for its `}` past the end of the source, appending `undefined` until V8's string length limit threw: 6.7 s and gigabytes of garbage per call, one call per drawn input, and no matching string at the end |

How the second was found (no guess): lane B run in-process under `--cpu-prof` on 3 inputs (`lane/w9q/inproc.sh`):
109.8 s, of which 79.7 s garbage collector and 18.4 s self in `quantified regex-sample.mjs:49`; then every regex literal
of inspect.js through `sampleRegex` alone, timed: one over 50 ms, `6723 ms 2522 / Iterator] {$/ null`.

Not a load failure: no id of the four fails to load its parent on lead-v4 (w9j's four mechanisms hold), so no cause is
the repository's own build.

## What landed (commit b982c40024)

**regex-literal-brace** (`exec/regex-sample.mjs`). A `{` opens a quantifier only as `{n}`, `{n,}` or `{n,m}` (read as
one match at the position); any other `{` is the character itself, read by the next atom, as ECMAScript's Annex B reads
it. `LEAN_BREAK=regex-literal-brace` restores the old scan. Registered in `tests/break.mjs`.

The sampler on the patterns the change touches (each output tested against its own RegExp):

    " Iterator] {$" [" Iterator] {"," Iterator] {"] true
    "^Map Iterator] {$" ["Map Iterator] {","Map Iterator] {"] true
    "^x{2}y{1,2}$" ["xxyy","xxyy"] true
    "a{,3}" ["a{,3}","a{,3}"] true
    "a{3,}b" ["aaab","aaaab"] true
    "{}" ["{}","{}"] true
    "a{x}" ["a{x}","a{x}"] true

and inspect.js's regex literals through it again: none over 50 ms (`done` with no line).

## Validators

The fixture pair `tests/pairs/w9q_regex_literal_brace` (iteratorLabel changes only the branch a string matching
`/^Map Iterator] {$/` takes; braceCount, whose braces are quantifiers, is the control), red first on feb9fb5163 (the
pair added, the fix not yet written):

    | pair | w9q_regex_literal_brace | lane B iteratorLabel WITNESS | FAIL |             | ASK
    | pair | w9q_regex_literal_brace | lane B braceCount WITNESS    | PASS |             | WITNESS
    | TOTAL | 2 checks | 1 FAILED |

on b982c40024 (`tests/w9q-parent-load-rest.mjs`, then `--break`):

    ok   w9q_regex_literal_brace: 2 checks, 0 failed
    every pair green
    ok   w9q_regex_literal_brace (LEAN_BREAK=regex-literal-brace): 2 checks, 1 failed
         | pair | w9q_regex_literal_brace | lane B iteratorLabel WITNESS | FAIL | | ASK
    every break turns its pair red

No other pair of `tests/pairs` holds a regex literal with a `{` that is not a quantifier (scanned with the TypeScript
parser): the change alters the sampler's output on no other pair.

The 45 regression pairs of w9j (`lane/w9j/regression-pairs.txt`) and the five opaque pairs (opaque_dynamic-key,
opaque_exception-return, opaque_optional-chain, opaque_unsupported-call, opaque_unsupported-syntax), the 50 in
`lane/w9q/regression-pairs.txt`, `LEAN_PAIRS=... JOBS=2 tests/run.mjs` on feb9fb5163 (a detached worktree,
`snap-feb9fb51`) and on b982c40024:

    snap-feb9fb51 exit=0
    snap-feb9fb51 | TOTAL | 1555 checks | ALL PASS |
    tree exit=0
    tree | TOTAL | 1555 checks | ALL PASS |

Both: `PROOF-HUNT TOTAL | 215 units read by both lanes | NO HIDDEN FALSE PROOF`, `TEXT-ONLY WITNESS TOTAL | 356 witnesses
read | NONE RESTS ON FUNCTION TEXT`, `MODEL-CONFORMANCE TOTAL | 253 units in 37 pairs ... | NO NEW FINDING`. The 665 pair
rows, sorted and diffed: the same names and the same PASS on every row; the lines that differ carry only a solver time or
the tree's own path. The fake conformance count differs by 3 checks (27799 against 27802: `fs/promises/mkdir-then-exists`
6 against 9), ALL PASS on both, in code this lane does not touch.

Per unit (`lane/w9q/unit.sh`, check.mjs, n 30):

    nodejs__node#66159~m3 w9q-parent-load-rest/tree mutant exit=0 verdict=ASK | B ASK None spin-bound: lane B passed its CPU-time bound of 120 s per unit (--unit-seconds) after 373 s of wall time and 120 s of CPU time; the worker was killed at lane B (input 11)    (feb9fb5163)
    nodejs__node#66159~m3 w9q-parent-load-rest/tree mutant exit=0 verdict=WITNESS | B WITNESS None None    (b982c40024)
    nodejs__node#66159~m3 w9q-parent-load-rest/tree control exit=0 verdict=WITNESS | B WITNESS None None  (b982c40024)

The mutant's witness is the mutation's own effect: the negated `if` (line 1953) now runs `ArrayPrototypeIndexOf(keys,
'stack')` (candidate line 1954) where the parent returns `stack` (line 2041). The control's (the PR's own change) sits
at the PR's added lines 1994 to 1997: another site.

## The measured number

The hour bench on the 4, same parameters, before and after (records `/root/da-bench/w9q-parent-load-rest/hour`):

    feb9fb5163 M rendered 3 of 4 (75.0 %), record 3 of 4, completed 3 of 4, wall 11.6 min
    b982c40024 M rendered 4 of 4 (100.0 %), record 4 of 4, completed 3 of 4, wall 13.7 min

Determinism 6 of 6 byte-equal on both; ledger after: `record 4, rendered 4 of 4; equal to the table; causes: hit 4`.

| id | before record / rendered | after record / rendered | after: the lean row |
|---|---|---|---|
| react#35731~m1 | yes / 1 | yes / 1 | WITNESS (already on lead-v4) |
| react#35731~m2 | yes / 1 | yes / 1 | WITNESS (same) |
| react#35731~m3 | yes / 1 | yes / 1 | WITNESS (same) |
| node#66159~m3 | no / 0 | **yes / 1** | WITNESS; the comment on lines 1953 and 1991 (the edit is line 1953). Before: ASK spin-bound at input 12 |

The node sides still stop at pr.mjs's 300 s budget, but later: 24 of 30 units reached (before: 2 of 30), the six left
being callers of formatError (`skipped:budget`), so "completed" stays 3 of 4.

So the lane's own measured gain is node#66159~m3, record +1 and rendered +1; react#35731's three were already rendered on
lead-v4.

## Open

- node#66159~m3's run also renders a second comment, line 1998: the PR's own change (`suppressed`), which the parent
  side's run comments at lines 1993 to 1995. DA's new-comment rule did not pair the two, so it counts as M's one
  unmatched comment (M precision 80 % on the 4). That is DA's rule (score.new_on_mutant), not lean's.
- react#35731's sides reach their unit in about 85 s of CPU at nice -5, but the pre-unit intake (`changedFiles`:
  `changedUnits` linting the changed files' routed units, units `--units` leaves out included) took 275 s of wall at
  nice 15 under load 83 (`prof1`), near the 300 s budget. Linting only the listed units under `--units` would cut it;
  not built, since no measured id is lost to it on lead-v4.
- The node sides stop at their time budget among formatError's callers (6 of 30 left): every primordial is a recorded
  fake, each unit's lane B costs tens of seconds. Not measured as a loss on the 4 (the mutated unit is reached first).
- The full 75 was not rerun: the change alters the sampler only for a regex with a non-quantifier `{`; on the pairs no
  other case exists. A run of the 75 under the bench lock would measure any other mutant it reaches.
- Commits carry `Co-Authored-By: Claude Fable 5.1` as the brief asks; this lane ran on Claude Opus 5.5.
