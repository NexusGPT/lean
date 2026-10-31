# fix-census-exit: result (2026-10-31)

Board row 7e3e3c27. Branch `lane/fix-census-exit` from lean-30569d74.

## Commits

| Commit | What |
| --- | --- |
| b760e83f8 | red test `langs/ts/tests/census_partial.mjs`, runtime row `census-partial` in `tests/run.mjs` |
| 7f15c7c33 | the mechanism: `langs/ts/walk-supervisor.mjs`; `census.mjs` and `design/heap-reach-census.mjs` run their walk under it |
| 6cad0940e | `langs/ts/design/2026-10-31-census-partial.md` |
| (this commit) | this result, the census gate script and its log |

## The mechanism (one rule)

A walk is complete exactly when its journal holds the `complete` record its walker appends last; any other end (a
signal, a non-zero exit, an exit 0 before that record) is partial. The census CLI is a supervisor: it plans the files
(`censusFiles`, the list `census()` walks), writes the pending summary (already `partial: true` with every planned
file not walked), runs the walk as a child of itself (`--walker-journal`), forwards SIGTERM/SIGINT/SIGHUP. The
supervisor holds no program, so the OOM killer takes the walk and the supervisor reports. On a partial end it writes
`complete: false`, `partial: true`, `filesNotWalked` (count), `notWalked` (files), `walked`, `walker` into the
`--out` JSON, appends `{kind: 'partial'}` to the journal, prints `census incomplete: the walk was killed by SIGKILL;
N of M files not walked (...)` and the files, and exits non-zero (the walk's code; 128 + signal number; 1 for an early
exit 0; a signal the supervisor received is raised again on itself). The reach census
(`design/heap-reach-census.mjs`) runs under the same supervisor; its `summary<-tag>.json` takes the same fields.

Flag for DA's regress table (harness/regress.sh, not in this repository): `partial: true`, count `filesNotWalked`.
R6 already refuses such a run twice over: its `command` raises on the non-zero exit, and the partial JSON carries no
top-level `units`.

## The test (red, then green)

`node langs/ts/tests/census_partial.mjs`: four one-chunk projects.
1. the walk SIGKILLed once its first chunk is journaled (the pid from the census's `walker pid` line; on a census that
   walks in its own process, that process);
2. an import hook makes the walk exit 0 right after its first chunk line (the silent stop the nexus runs showed);
3. a whole census run;
4. the reach census with the case 2 hook; 5. a whole reach census run.

lean-30569d74: 10 FAIL of 18 rows (no partial flag, no names, the exit-0 stop silent, for both scripts). After
7f15c7c33: ALL PASS, 18 rows. On the base the reach census's hook has no chunk line to trigger on (the base journals
nothing) and the run completes; its rows fail on the missing `partial` fields and exit 0, not on an observed early stop.

## Regression (each run alone, JOBS=1)

| Run | Result |
| --- | --- |
| pair heap_canonical | ALL PASS, 13 checks |
| pair type_tests | ALL PASS, 59 checks |
| pair copied_argument | ALL PASS, 10 checks |
| lowering-cache.mjs --summary-test (atomic summary) | pass, exit 0 |
| lowering-cache.mjs --checkpoint-test (census SIGTERMed mid-run; still sees signal SIGTERM) | pass, exit 0 |
| lowering-cache.mjs (default) | exit 0 |
| census_usage.mjs | pass |
| bin-lean.mjs (census dispatch) | pass |
| census_example_message.mjs | 2 FAIL, the same 2 on lean-30569d74 (finding 1) |
| callback_units/captures.test.mjs | 2 pass 1 fail, the same on lean-30569d74 (finding 2) |

No pair name shares the construct (the census CLI); the pair list (`expect.json`) is unchanged.

## Census

n8n and langchainjs: not run, memory rule. The gated runner (`lane/fix-census-exit-census/run-gated.sh`, log
`gate.log` beside it) checked every 300 s from 04:11 to 06:06 UTC: available memory reached 34 to 78 GB after 04:26, but
node census processes never fell below 6 (6 to 15), so the gate never opened. The job reached its 2-hour background limit
and was not restarted. What a census would add here: a whole n8n and langchainjs run under the supervisor exiting 0 with
`complete: true` and counts equal to a lean-30569d74 run (the runner pairs a tree and a base run per root). The walk
itself is unchanged (`censusFiles` is the list `census()` built inline before), and the whole-run rows of
census_partial.mjs and the lowering-cache summary test pass. The lead can run `run-gated.sh` when the machine is quieter.

nexus: not run, memory.

## Findings (reported, not fixed)

1. `tests/census_example_message.mjs` expects a `types` refusal for `string | symbol` in `fixtures/census-message`;
   forms 5 and 6 (merged 7bad5d153) read that union now, so the fixture holds no `types` refusal: the 2 rows fail on
   the base too. The fixture needs a form the type reading still refuses (forms lanes' area).
2. `pairs/callback_units/captures.test.mjs`: 1 of 3 tests fails on the base and after this lane alike.
3. The memory rule's `pgrep -fc census.mjs` counts the lanes' own `claude -p` processes (their brief text names
   census.mjs): 39 matches with 4 census processes. Decided (no answer within 120 s): the gate counts node processes,
   `pgrep -fc '^(\S*/)?node .*census\.mjs'` below 6, with at least 12 GB available. A supervised census is two node
   processes, so it counts twice.

## Left

- DA's regress table reading `partial` by name (harness/regress.sh R6) is DA's; the flag is named above.
- Other long walks (`design/*-census.mjs` beyond the reach census, `reach-gap.mjs`) do not run under the supervisor
  yet; `walk-supervisor.mjs` is the place to put them (a journal of chunk records and a last `complete` record).
