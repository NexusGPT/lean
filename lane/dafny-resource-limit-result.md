# Lane dafny-resource-limit: result

Branch `lane/dafny-resource-limit`, cut from lead-vm 597fc83b (v0.1.4). Design note: langs/ts/design/suite.md,
"2026-10-31: a proof's verdict never depends on the machine's load".

## Call sites

| site | before | after |
|---|---|---|
| langs/ts/check.mjs (lane A) | `--verification-time-limit <--dafny-seconds>` | `dafnyVerifyArgs({ seconds: dafnySeconds })`; cap (`dafnyTimeLimitS` + 60) s per unit; `checkWallCapMs` counts the same bound |
| langs/ts/tests/run.mjs (pairs' lane A) | `30 x stretch` (1 to 4, the load share) | `dafnyVerifyArgs()`; the stretch removed, `--cores` split kept |
| langs/ts/tests/run.mjs `R.dafny` (construct rows) | `60` | `dafnyVerifyArgs()` |
| langs/ts/tests/strings/run.mjs (the Mac's red row) | spawnSync, `30`, no cap | spawnCollect under the Dafny wall cap, `dafnyVerifyArgs()` |
| langs/ts/tests/numbers_doubles/faithful-run.mjs (not a suite row) | spawnSync, `30` | spawnCollect, `dafnyVerifyArgs()` |
| conformance/model.mjs, numbers_bits, run.mjs:481 | `translate` / `run --no-verify` | unchanged (they prove nothing) |
| spec/check.py (`60`), langs/py/tests/run.py (`30`) | Python, not run by the TS suite | **not changed**: they need the constant in a form Python reads |

## Measured: the whole suite (JOBS 12, fresh cache), a wrapper `dafny` adding `--log-format csv`

447 calls, 11,503 conditions. The wrapper run itself: 5,085 checks, ALL PASS. Full output: lane/dafny-resource-limit-distribution.txt.

- Proved conditions (10,459): max 16,697,049 (JsBitsInjective), p99 598,680, p90 92,107, median 31,082.
- The ten largest proved: JsBitsInjective 16.70 M (3 theorems), EqualCanon_pair 15.57 M, EqualCanon_attach 14.67 M,
  JsHalfBitsNat 14.50 M (3), CheckReplace 12.57 M, EqualCanon_unhook 9.03 M.
- Not proved (1,044): seven conditions hit the old 120 s time limit at 37 M to 79 M (JsUnsigned_bv32 well-formedness
  in three pairs, EqualCanon_setflag, clearlow and bump). Alone at 300 M they were still out after 10 to 20 minutes, so
  they never prove.
- Slowest rate measured: 252,000 resources per second.

## Constant and margin

The module is `langs/ts/exec/dafny-args.mjs`.

- `DAFNY_RESOURCE_LIMIT = 60,000,000`: 3.6 times the largest proved condition. The reasons: the count drifts about 3
  percent with the solver's history; proofs grow; and each condition that never proves costs at most 240 s at the
  slowest rate.
- `--verification-time-limit 720`: three times the time the limit takes at the slowest rate. Kept rather than 0 so a
  hung batch ends alone.
- Wall cap: the rule is unchanged, 3 x 720 + 60 = 2,220 s.
- New word: `ASK:resource-limit`, reason `not proved: the proof needs more than 60000000 resources …`. The certificate
  gains `resourceLimit` and `resourceOut`. `timedOut`, `ASK:timeout` and `timeLimitSeconds` are kept (pr.mjs and the
  tests read them).

## Test

`langs/ts/tests/dafny-resource-limit.mjs`, suite row `runtime | dafny-resource-limit`. It has three parts:

1. Five call sites scanned for `dafnyVerifyArgs(`.
2. CheckReplace alone and eleven at once: 12,565,575 resources every time, in 4.4 to 7.1 s of wall.
3. A copy at a limit of 2,000 gives ASK:resource-limit; the real tree gives PASS-proved.

Red checks: `--break` (the old arguments) fails part 1, and so does reverting strings/run.mjs. Load dependence made
on demand: CheckReplace with `--verification-time-limit 6` proves alone and times out in 22 of 22 runs at once. With
the new arguments, 22 of 22 prove.

## Runs

- Full suite at 31e41085: `| TOTAL | 5086 checks | ALL PASS |` (WALL 1930 s, JOBS 12). Log:
  /root/lanes/dafny-resource-limit/suite-final.log.
- Compared with the baseline run (wrapper), every row has the same kind, name, check and status, except the one new
  row. With times and heads normalised, the detail columns are identical except two:
  - `gen_walk Equal_ease`: the doubles reading said "unknown within N s" once and "witness" the other time. That is
    solve/fp.mjs's Z3 under `--fp-seconds`, the same class of load dependence outside Dafny. Not touched here. The row
    passes either way.
  - children-shapes counts 113 files, the new test among them.
- Pairs: no pair's files touched. `--pair` arithmetic_core 33, heap5_arith 13, heap_shapes 36, numbers_bits 39: each
  ALL PASS. These are the pairs with conditions that now stop at the limit.

## Commits

- 31e41085 the module, the call sites, the word, the test
- the commit after it (this file's own): the design note, pr-intake line, the measurement wrapper and analyser (lane/dafny-resource-limit-*), this file
