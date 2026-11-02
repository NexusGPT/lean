# w9o-hard36 result: the hard 36, from 11 to 15 WITNESS (lean), no false witness

Branch `lane/w9o-hard36` from lead-v4 2df7b01b. Lean commits: 8c32e434 (programs-share), 1f1952d5 (the share covers
the specs), 83394c60 (converted-text, module-await, core-string-args). Round 0: `lane/w9o-hard36-cause.md` (1b812ac4),
written before any code.

## The number

| | WITNESS | PASS-bounded | ASK | parent false witness |
|---|---|---|---|---|
| lead-v4 2df7b01b (lead's `check/lead36-2df7b01b.jsonl`; this lane's rerun of the 25 identical) | 11 | 17 | 8 | not run at 2df7b01b (round 2's 36 parent checks at 8c32e434, whose only change is the programs stage: 0) |
| this branch, 83394c60 | **15** | 16 | 5 | **0 of 36** |

By kind at 83394c60: effect-after-exit 5 W (+42677); numeric-conversion 3 W (+41890); swapped-effects 7 W (+41864, +41990).
The reviewer (Haiku, OCR) finds 19 of 36. lean 15 of 36 is 42 %; of the 29 that are not equivalent (round 0: seven
mutants no input can tell from their parent), 15 of 29 = 52 %.

DA record level on the 36: PENDING. `scripts/da.sh` (lane folder) runs `LEAN=<83394c60, frozen worktree> bench/materialise.py --instances bench/hard/instances --only <the 36> --out /root/da-bench/w9o/instances --jobs 6 --load-max 1000 --floor-gb 20` under `flock /root/runs/bench.lock`; it is queued behind the lead's hour bench (the lead's own materialise measured about 2 h per instance). This file is amended when the records and `bench/run.py --entry da-attest` land.

## Rounds (residual lines)

Measured with this lane's runner (`scripts/run1.py`, kept in the lane folder: hard_check.py's own check.mjs call, same
options, `--n 30 --dafny-seconds 30`, LEAN_SEARCH=1, LC_ALL=en_US.UTF-8, LEAN_Z3 pinned, jobs 2 under nice 15, on kept
checkouts of the 34 PRs so a round does not re-clone them); the parent check is the same call with the candidate = the
parent file.

Two departures from the brief's round discipline, said plainly: (1) a pass over the 36 and their 36 parents took 50 to 60
minutes under a load of 80 on 32 cores, not 20; (2) round 3 measured four mechanisms at once (programs-share's fix and
three new ones, each first measured alone on its own targets, then together on the 36). What each one moved is shown by
its break on the moved ids (the table below): every moved id goes back under its own mechanism's LEAN_BREAK alone.

- round 0 (no code): the cause table, 25 rows, counts per class: world-decided 5, other gates 4, values 2, order 0, e-load 4, e-budget 3, equivalent 7.
- round 1 (search-world, the world's answers as leaves of the input search): moved 0 of its 5 targets (14303, tsgo 3834~h3, 42117, 17728, 18326) after three iterations; WITHDRAWN, never committed (diff kept in the lane folder, `withdrawn-m1-search-world.diff`). Why it moved nothing, per target, below.
- round 2: WITNESS 11 of 36, PB 17, ASK 8; parent false witness 0 of 36 (programs-share as first committed, 8c32e434: moved nothing; the reason found and fixed in 1f1952d5).
- round 3: WITNESS 15 of 36, PB 16, ASK 5; parent false witness 0 of 36 (the 36 parent checks: 29 PASS-proved, 5 PASS-bounded, 2 ASK; 83394c60: programs-share with the spec fix, converted-text, module-await, core-string-args).
- round 4 (package-imports: a `#x` subpath import resolved through package.json "imports" as Node resolves it, so svelte's `#client/constants` is the real file, not a fake): measured on the svelte five (18326, 17728, 18330, and 17885, 17921 as the equivalent guard): 0 moved, the 18326 gate unchanged; WITHDRAWN, never committed (`withdrawn-m6-package-imports.diff`).

The lead's validator, `bench/hard_check.py --ids /root/da-bench/w8q/hard36.txt --lean <83394c60> --out
/root/da-bench/w9o/check/w9o-final.jsonl --jobs 2 --load-max 1000 --env LEAN_SEARCH=1` (fresh checkouts, nice 15), its
summary verbatim:

```
effect-after-exit     12  WITNESS   5  {'ASK': 1, 'PASS-bounded': 6, 'WITNESS': 5}
numeric-conversion    12  WITNESS   3  {'ASK': 1, 'PASS-bounded': 8, 'WITNESS': 3}
swapped-effects       12  WITNESS   7  {'ASK': 3, 'PASS-bounded': 2, 'WITNESS': 7}
all                   36  WITNESS  15  {'ASK': 5, 'PASS-bounded': 16, 'WITNESS': 15}
EXIT=0
```

Every row equals round 3's. The round files: /root/da-bench/w9o/check/w9o-round2.jsonl, w9o-round2-parent.jsonl,
w9o-round3.jsonl, w9o-round3-parent.jsonl.

## What landed (each with its red test, its break, and the ids it moved)

| mechanism (LEAN_BREAK) | where | class (round 0) | red test (red at 2df7b01b and under the break, green with it) | moved on the 36 | the moved id under the break |
|---|---|---|---|---|---|
| programs-share | exec/programs.mjs runPrograms maxCpuMs; exec/run.mjs hands the worker the bound it enforces (boundSeconds) | e-budget | tests/programs-share.mjs (fixture tests/fixtures/programs_share, a CPU meter of its own); suite rows `programs-share`, `programs-share --break` | n8n#41864~h2 ASK -> WITNESS, n8n#42677~h2 ASK -> WITNESS | both ASK spin-bound again ("... the worker was killed at programs") |
| converted-text | exec/usage.mjs `converted`, exec/spec.mjs CONVERTED_TEXT | c | pair converted_text (pageOf, perPage WITNESS; tally PASS) | n8n#41890~h1 PB -> WITNESS (input `"1.5"`: parseInt 1, Number 1.5) | PASS-bounded again |
| module-await | exec/run.mjs loadInner (an async module body on V8's own refusal of a top-level await) | e-load | pair module_await (allowAll WITNESS, label PASS) | n8n#41990~h3 ASK -> WITNESS, with core-string-args | ASK again (the module does not load) |
| core-string-args | exec/usage.mjs pathModuleOf (a parameter handed to a node:path function, named by its import, is a string) | a (reach) | pair core_string_args (logFile, logPid WITNESS; same PASS) | n8n#41990~h3, with module-await (the draws reach `http.createServer`'s handler; the witness is the trace order of the two `res.setHeader` calls, sink.mjs:130) | PASS-bounded (it loads, every draw throws at `path.dirname(out)`) |

programs-share, in two steps: the first form (8c32e434) checked the share between commands only and moved nothing in
round 2. Timed in process on TelemetryEventRelay.init (`scratch/prog-time.mjs` in the lane folder): 460 s of CPU passed
before the first program, in specOf for each of the class's 135 unchanged methods; 1f1952d5 checks the share there too
(the stop now reads "... was spent reading the commands' specs"). Two pair attempts at an end-to-end red test for the share
were dropped: CPU per call varied about 4x on this machine (load 80 on 32 cores), so a verdict that rests on a CPU bound
flips with the load; the test meters CPU itself instead.

core-string-args first also read a node:fs path argument as a string; that half moved nothing measured (on 41990
`path.dirname(out)` alone types `out`), so it was cut before the commit.

## What is open (21 of 36 without a WITNESS)

| class | n | ids | state at 83394c60 |
|---|---|---|---|
| f, equivalent (no input tells them apart) | 7 | gemini#29612~h2, n8n#41940~h1, n8n#42608~h2, n8n#42766~h1, react#36253~h1, svelte#17885~h2, svelte#17921~h2 | PASS-bounded (react#36253 ASK, its module needs `Event`); a WITNESS here would be false; the parent check guards it |
| e-load, lane w9j's classes | 2 | react#36859~h1 (a relative import throws at its top level), node#66154~h2 (`primordials`) | ASK. Measured with w9j's 2d3cdc1e merged onto 83394c60 in a throwaway worktree (not on this branch): react#36859 WITNESS, node#66154 loads (PASS-bounded). w9j's, not counted here |
| e-load, other | 1 | gemini#26338~h1 | ASK: the workspace package `@google/gemini-cli-core` loads through the tsconfig alias with `ApprovalMode` undefined at the eval file's top level (a cycle in the package's own graph, not read further) |
| e-budget | 1 | n8n#41825~h3 | ASK callback-undriven; its gate is `this.countingStores.get(req)`, a receiver map looked up by the handler's own argument (world-decided) |
| world-decided | 5 | cline#14303~h1, tsgo#3834~h3, n8n#42117~h3, svelte#17728~h2, svelte#18326~h2 | PASS-bounded; round 1 below |
| other gates, values | 5 | svelte#18330~h3, immich#32498~h3, three#34309~h3, n8n#41943~h2, three#34978~h3 | PASS-bounded: a parse of a drawn template, an action callback behind `instanceof KeyboardEvent`, a regex-gated attribute name, a six-gate loop over world items, a lookup that must answer NaN |

Round 1 (withdrawn), why each target did not move, read off the search's own log of the world's answers (a debug field in
bound.search during the experiment, removed with it): cline#14303, `Bun` is the bridge fake, whose call answers a thenable
by its contract (design/bridge-fake.md: never null), no world answer at all to change; tsgo#3834~h3, `exe` is built by real
code in another file from `context`, the gate compares two values no single answer decides; n8n#42117, the ids are inside
a typed list the world answered and the input id must equal one of them, then three more equalities follow, beyond 30
tries; svelte#17728, no world answer and no input leaf to change (search: "no change left"); svelte#18326, the gate reads
a real object, the constants it masks with were answered at module load, and the log of the run never reached `finish`.

## Validators (each output line verbatim)

Mutants fixture (`node langs/ts/tests/mutants-fixture.mjs`, LC_ALL=en_US.UTF-8, pinned z3):

- before, 2df7b01b: `mutants fixture: 83 sites of 15 units, 19 kinds, every one planted and caught (lane B)` (exit 0)
- after, 83394c60: `mutants fixture: 83 sites of 15 units, 19 kinds, every one planted and caught (lane B)` (exit 0)

The mechanisms' own tests (83394c60):

- `node langs/ts/tests/programs-share.mjs`: `programs-share: no share 12 programs, 42 commands; a 5 s share stops at 1 programs, 1 commands (the stage's share of the unit's CPU bound, 5 s, was spent); a 1.5 s share before any program (the stage's share of the unit's CPU bound, 2 s, was spent reading the commands' specs)` (exit 0); `--break`: exit 1 (`AssertionError ... share: the stage stops early (12 programs, 42 commands, against 12 and 42)`)
- `node langs/ts/tests/lib-break.mjs --pair converted_text`: `lib-break: 2 rows, 0 failed` (pageOf, perPage: WITNESS -> PASS-bounded)
- `node langs/ts/tests/lib-break.mjs --pair module_await`: `lib-break: 1 rows, 0 failed` (allowAll: WITNESS -> ASK)
- `node langs/ts/tests/lib-break.mjs --pair core_string_args`: `lib-break: 2 rows, 0 failed` (logFile, logPid: WITNESS -> PASS-bounded)
- red at the start: each pair's changed units at 2df7b01b (base worktree): converted_text pageOf, perPage PASS-bounded; module_await allowAll ASK; core_string_args logFile, logPid PASS-bounded.

Regression suite (`LEAN_CONFORMANCE=full JOBS=4 node --max-old-space-size=12288 langs/ts/tests/run.mjs`, pinned z3,
LC_ALL=en_US.UTF-8, nice 15; `scripts/suite.sh` in the lane folder; JOBS is the suite's switch, not `--jobs`):

- before, 2df7b01b: `| TOTAL | 6249 checks | 9 FAILED |` (`| WALL | 10361 s | JOBS 4 |`)
- after, 83394c60: `| TOTAL | 6259 checks | 9 FAILED |` (`| WALL | 11298 s | JOBS 4 |`)
- the rows marked FAIL are the same set on both trees: pair opaque_async_origin, opaque_copied_argument, opaque_dynamic-key, opaque_exception-return, opaque_for_in, opaque_optional-chain, opaque_read_after_call, opaque_unsupported-call, opaque_unsupported-syntax, runtime `opaque-unit --break` (ten rows name FAIL against nine counted, on both trees alike). The ten new checks pass: converted_text (pageOf, perPage WITNESS; tally PASS-bounded), core_string_args (logFile, logPid WITNESS; same PASS-bounded), module_await (allowAll WITNESS; label PASS-bounded), runtime programs-share and programs-share --break.

The five opaque pairs, before and after (unchanged, this lane touches no opacity code): opaque_dynamic-key
`Equal_outside_key proved`, opaque_exception-return `Equal_outside_er proved`, opaque_optional-chain `Equal_outside_oc
proved`, opaque_unsupported-call `Equal_outside_call proved`, opaque_unsupported-syntax `Equal_outside_syntax proved` on
both 2df7b01b and 83394c60: they still prove what they must refuse (the other lane's bug, lane w1m), no worse.
