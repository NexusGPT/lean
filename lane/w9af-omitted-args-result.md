# w9af-omitted-args: result

Branch `lane/w9af-omitted-args` from 14b167a8e0. Commits ff03ab8116, d3a3b068f8, 042133c4ce, e7dfd5eda0 (the
measured head). Design: `langs/ts/design/w9af-omitted-args.md`. Lane data, not committed: `/root/da-bench/w9af/` (the
bench runs), `/tmp/w9af-logs/` (pair logs, `timing.json`), scripts `/tmp/w9af-scripts/`.

**Headline.** three.js#34798~c1 goes from **rendered 0 of 1 to 1 of 1** (ledger cause `witness/site-outside-unit`
becomes `hit`). Lane B now has a witness in `WebGLRenderStates` **at line 96,
`if ( renderCallDepth >= renderStateArray.length )`**, the statement that reads the mutated default's parameter. The
cause stage now finds hunk 84 itself (`a: WITNESS`); before, it found the witness only through the callee
(`a: PASS-bounded`, `through: callee`).

## The cause (general, not the id)

Lane B never called a callable with a trailing argument left out.

- **Drives** (`exec/run.mjs` driveOne). Every function a unit hands out was called on exactly `DRIVE_ARGS` = 3 drawn
  arguments. Each repeat call (`again`) drew fresh ones. So a default only applied when the pool happened to draw
  `undefined`, and `arguments.length` was always 3. No two calls shared a leading argument either, so state the first
  call keyed on it (a cache per key) was never met again. `get(scene, renderCallDepth = 0)` only differs on a second
  `get(scene)` with the depth left out.
- **The unit's own parameters** (`exec/gen.mjs` inputsFor). An optional parameter drawn absent was always passed as
  an explicit `undefined`, never left out of the call, so an `arguments.length` test never saw it.
- **Masking** (found while measuring). Within one input, only the first differing drive record was located. A
  difference in an earlier handed-out function (the PR's own change) hid a later one's.

## What landed

1. `patch.mjs parameterReads`, at instrumentation. For each function, its parameters: whether a caller may leave
   one out (a default, `?`, a bracketed JSDoc `@param`, a test against undefined or null with `===`/`==`/`typeof`/`??`,
   `arguments`, or a same-file call by the function's name with fewer arguments), and the first statement reading
   each. This rides on the body site. The frame carries it as `body`, and `state.exited` is the frame that exited
   last. It is metadata only and never enters an observation.
2. `exec/run.mjs omittedForms`. After a drive's drawn calls, the function is called again on the **first call's own
   leading arguments**: once with each optional trailing parameter left out, then with `undefined` passed explicitly
   where the trailing run starts. The calls are deterministic, need no draw, and are the same on both sides. A
   function with no optional trailing parameter gets none, which keeps the budget. Each form is its own record
   (`drives[i].omitted`, with its own requests), so a drive with no form records what it recorded before. A
   difference in a form is reported at the statement reading the left-out parameter (kind
   `drive omitted argument`, `where.omitted`). `LEAN_BREAK=w9af-omitted-drives` turns this off.
3. `exec/run.mjs laterDrives`. Every later differing drive of an input is located, while the two lists line up
   (same handle, same drawn arguments). Each counts when its line is new, as a field does. The first version compared
   by index past a shift and produced junk sites (lines 19, 33, 560 in run w9af-34798-3); the alignment rule
   (e7dfd5eda0) removed them. `LEAN_BREAK=w9af-drive-sites` turns this off.
4. `exec/gen.mjs omitTrailing`. An optional trailing unit parameter drawn absent is left out on odd inputs and
   passed as `undefined` on even ones, chosen by input index, so no draw changes. `LEAN_BREAK=w9af-omitted-args`
   turns this off.
5. Pairs `omitted_args_returned` (a returned `get(scene, depth = 0)`, the default moved) and `omitted_args_unit`
   (`scale(value, factor = 2)`, and `pad(text, width?)` testing `arguments.length`). Unit test
   `exec/omitted.test.mjs`. The three breaks are registered in `tests/break.mjs`.

## Validators (output lines verbatim)

**New pairs, red on 14b167a8e0** (the pairs copied into `git archive 14b167a8e0`,
`node tests/run.mjs --pair <p> --jobs 1`):

- omitted_args_returned: `| pair | omitted_args_returned | lane B makeStates WITNESS                   | FAIL |             | PASS-bounded` / `| TOTAL | 2 checks | 2 FAILED |` (exit 1)
- omitted_args_unit: `| pair | omitted_args_unit | lane B pad WITNESS   | FAIL |             | PASS-bounded` / `| TOTAL | 2 checks | 1 FAILED |` (exit 1; `scale` passes there too, since an explicit undefined already applies a default)

**Green here** (e7dfd5eda0):

- `omitted_args_returned exit=0 secs=3 | TOTAL | 2 checks | ALL PASS |`, with the statement row: `| pair | omitted_args_returned | statement makeStates drive omitted argument | PASS |             | drive omitted argument: parent 12-16 "if (depth >= list.length) {\n      const fresh = { id: ++made };\n      list.push(fresh);\n      return fresh;\n    }"; candidate 12-16 ...`
- `omitted_args_unit exit=0 secs=4 | TOTAL | 2 checks | ALL PASS |`

**Breaks** (`node tests/lib-break.mjs --pair <p> --jobs 1`):

- `| omitted_args_returned | makeStates | LEAN_BREAK=w9af-omitted-drives | WITNESS -> PASS-bounded | PASS |` / `lib-break: 1 rows, 0 failed`
- `| omitted_args_unit | pad | LEAN_BREAK=w9af-omitted-args | WITNESS -> PASS-bounded | PASS |` / `lib-break: 1 rows, 0 failed`
- `node --test exec/omitted.test.mjs`: `ℹ tests 6` / `ℹ pass 6` / `ℹ fail 0`. It covers both run.mjs breaks
  (w9af-omitted-drives gives no form; w9af-drive-sites locates the first drive alone).
- `node tests/opaque-unit.mjs --break`: `opaque-unit --break exit=1` (`FAIL step signature {"id":"block_x","ins":["World","U"],"out":"(World, Option<int>, U)"}`)

**Regression pairs of the draw, drives and search families**, each alone with `--jobs 1`. 46 pairs, all `ALL PASS`,
exit 0. The 16 that ran before 042133c4ce/e7dfd5eda0 were rerun on e7dfd5eda0 (the `mine2` lines below).

```
callbacks exit=0 secs=20 | TOTAL | 5 checks | ALL PASS |
callback_behaviour exit=0 secs=81 | TOTAL | 14 checks | ALL PASS |
callback_behaviour_tree exit=0 secs=9 | TOTAL | 2 checks | ALL PASS |
callback_patterns exit=0 secs=31 | TOTAL | 11 checks | ALL PASS |
callback_units exit=0 secs=11 | TOTAL | 9 checks | ALL PASS |
effectful_callbacks exit=0 secs=44 | TOTAL | 29 checks | ALL PASS |
exception_callback exit=0 secs=269 | TOTAL | 35 checks | ALL PASS |
named_callbacks exit=0 secs=18 | TOTAL | 17 checks | ALL PASS |
throwing_callbacks exit=0 secs=54 | TOTAL | 11 checks | ALL PASS |
function_values exit=0 secs=41 | TOTAL | 10 checks | ALL PASS |
handler_capture exit=0 secs=146 | TOTAL | 26 checks | ALL PASS |
optional_calls exit=0 secs=29 | TOTAL | 5 checks | ALL PASS |
optional-call exit=0 secs=50 | TOTAL | 15 checks | ALL PASS |
generators exit=0 secs=46 | TOTAL | 30 checks | ALL PASS |
fake_timers exit=0 secs=11 | TOTAL | 6 checks | ALL PASS |
timers exit=0 secs=3 | TOTAL | 15 checks | ALL PASS |
window_timers exit=0 secs=13 | TOTAL | 3 checks | ALL PASS |
promise_handle exit=0 secs=47 | TOTAL | 18 checks | ALL PASS |
array_callback_cells exit=0 secs=27 | TOTAL | 9 checks | ALL PASS |
blocker_optional_callback exit=0 secs=42 | TOTAL | 13 checks | ALL PASS |
gen_walk exit=0 secs=97 | TOTAL | 11 checks | ALL PASS |
heap_optional exit=0 secs=26 | TOTAL | 11 checks | ALL PASS |
null_undefined exit=0 secs=93 | TOTAL | 49 checks | ALL PASS |
absent_number exit=0 secs=58 | TOTAL | 15 checks | ALL PASS |
witness_args exit=0 secs=12 | TOTAL | 13 checks | ALL PASS |
rest_param exit=0 secs=7 | TOTAL | 7 checks | ALL PASS |
read_shaped_inputs exit=0 secs=11 | TOTAL | 11 checks | ALL PASS |
korat_nullable_values exit=0 secs=14 | TOTAL | 6 checks | ALL PASS |
known_values exit=0 secs=186 | TOTAL | 13 checks | ALL PASS |
this_param exit=0 secs=240 | TOTAL | 23 checks | ALL PASS |
signature_change exit=0 secs=18 | TOTAL | 7 checks | ALL PASS |
rename_parameter exit=0 secs=41 | TOTAL | 19 checks | ALL PASS |
two_callers exit=0 secs=35 | TOTAL | 14 checks | ALL PASS |
field_sites exit=0 secs=15 | TOTAL | 3 checks | ALL PASS |
three_sites exit=0 secs=14 | TOTAL | 3 checks | ALL PASS |
two_sites exit=0 secs=31 | TOTAL | 10 checks | ALL PASS |
search_boundary exit=0 secs=14 | TOTAL | 3 checks | ALL PASS |
search_nested_literals exit=0 secs=11 | TOTAL | 3 checks | ALL PASS |
reach_absent exit=0 secs=16 | TOTAL | 7 checks | ALL PASS |
reach_keys exit=0 secs=51 | TOTAL | 27 checks | ALL PASS |
reach_lead exit=0 secs=16 | TOTAL | 4 checks | ALL PASS |
reach_lead_site exit=0 secs=9 | TOTAL | 4 checks | ALL PASS |
reach_site exit=0 secs=14 | TOTAL | 3 checks | ALL PASS |
reach_statements exit=0 secs=13 | TOTAL | 3 checks | ALL PASS |
lane_b_reach exit=0 secs=44 | TOTAL | 15 checks | ALL PASS |
readme_search exit=0 secs=14 | TOTAL | 5 checks | ALL PASS |
```

Unit tests of the touched modules: `exec/gen.test.mjs` pass 8 fail 0, `exec/record.test.mjs` pass 12 fail 0,
`patch.test.mjs` pass 12 fail 0, plus `exec/callees.test.mjs`, `exec/korat.test.mjs`, `apply-call.test.mjs` (exit 0).

**Opaque family** (`JOBS=1 LEAN_PAIRS=<the pairs> node tests/run.mjs`). `callee_fact` is not in 14b167a8e0 (it is
w9aa's new pair) and `run.mjs` refuses an unknown name (`Error: unknown LEAN_PAIRS name: callee_fact`), so the run
names the other 11:

`| TOTAL | 966 checks | 3 FAILED |` (exit 1). The 2 known failures, as at w9aa's base:

- `| pair              | opaque_read_after_call                   | break handle-write: Equal_written flips to proved (a false PASS-proved without the mechanism)                                                                                                    | FAIL |             | not proved under LEAN_BREAK=handle-write: the mechanism is not what refuses it`
- `| repo              | pr intake                                | coverage and preview                                                                                                                                                                             | FAIL |             |     at file:///root/lanes/w9af-omitted-args/tree/langs/ts/tests/fixtures/pr-intake/test.mjs:169:69`

One more failure, which is not this branch's:

- `| differential      | pattern_defaults                         | 3 inputs, TS vs Dafny                                                                                                                                                                            | FAIL |             | want 14|12|7 got    |          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^||Translation was aborted because errors were found`
- This is lane A's translator plus `dafny run --target:py`, which lane B's code never reaches. Reproduced by hand
  (`/tmp/w9af-scripts/diffcase.sh`): the `--core --exact-numbers` translation of `tests/cases/pattern_defaults.ts`
  is byte-identical here and at 14b167a8e0 (`cmp exit 0`). Both fail alike:
  `21 | function ext_key_order_Opts_Opts_string(a0: Opts, a1: string): Opts` /
  `Translation was aborted because errors were found` (a bodiless function cannot be compiled to Python). The
  `ext_key_order` function comes from the translator's handed-key-order reading (w9y), not from this lane.
- `self-pair` in the same run: `| SELF-PAIR TOTAL | 49 units | NO WITNESS | {"PASS-bounded":49} |`. The omitted forms
  make no witness of a parent against itself.

**Time per unit** (lane B, `exec/run.mjs --n 30` on every `b` unit of the 46 pairs, the base worktree of 14b167a8e0
and this tree alternated per unit, `/tmp/w9af-scripts/timing.py`):
`{"units": 253, "base_s_per_unit": 2.953, "mine_s_per_unit": 3.109, "ratio": 1.053, "verdicts_differ": []}`.
That is **2.953 s at 14b167a8e0 against 3.109 s here, 1.05x** (bar 1.3x), and no verdict changed on 253 units.

## The id, before and after

From `/root/runs/merge-w9k-da/research/open-code-review/d3`, the given command and environment, plus
`--out /root/da-bench/w9af --persist /root/da-bench/w9af/.persist`:

- **before**, `--lean /tmp/w9af-base-wt` (a git worktree at 14b167a8e0), `--name w9af-34798-4`:
  `14b167a8e0 M rendered 0 of 1 (0.0 %), record 1 of 1, completed 1 of 1, wall 1.3 min`. Ledger cause
  `witness/site-outside-unit 1`. Table: `| w9af-34798-4 | 1 | 1 of 1 | 0 of 1 | 0.0 % | 0 | 0, 0 | none |`.
  Lean rows:
  - `WebGLRenderState [3, 78] WITNESS`: drives, drive effect, line 45 `a.priority - b.priority || a.id - b.id`
  - `WebGLRenderStates [80, 124] WITNESS`: drives, drive effect, line 45 (the callee's line only)
  - Cause: `WebGLRenderStates [45, 46] callee [(84, 'PASS-bounded', 'WITNESS', False)]`
- **after**, `--lean /root/lanes/w9af-omitted-args/tree` at e7dfd5eda0, `--name w9af-34798-5`:
  `e7dfd5eda0 M rendered 1 of 1 (100.0 %), record 1 of 1, completed 1 of 1, wall 2.4 min`. Ledger cause `hit 1`.
  Table: `| w9af-34798-5 | 1 | 1 of 1 | 1 of 1 | 50.0 % | 2 | 0, 0 | none |`. Determinism: 2 of 2 byte-equal.
  Lean rows:
  - `WebGLRenderState [3, 78] WITNESS`: drives, drive effect, line 45
  - `WebGLRenderStates [80, 124] WITNESS`:
    - **drives, drive omitted argument, line 96 `if ( renderCallDepth >= renderStateArray.length ) {`, omitted
      `{'args': 1, 'index': 0}`** (new)
    - drives, drive effect, line 245 `lights.sort( shadowCastingAndTexturingLightsFirst );`
    - drives, drive effect, line 45 `a.priority - b.priority || a.id - b.id` (the PR's own witness, kept beside it)
  - Cause: `WebGLRenderStates [84] found None [(84, 'WITNESS', 'WITNESS', True)]`

Runs that do not count: `w9af-34798-1` measured `/root/lead-v4`, which had moved to 8f3ae606da (rendered 0 of 1).
`w9af-34798-2` and `-3` passed `--lean-head` with this tree; that only labels the run and measures the working tree
as it stands. So `-2`, labelled 14b167a8e0, actually ran this lane's code (rendered 1 of 1 via the line-96 witness),
and `-3` mixed in 042133c4ce's unaligned later drives.

## Open

- A witness from the unit's own left-out parameter (`pad`) is reported at the outcome's statement (the return), not
  at the statement that reads the parameter. The drive path reports at the reading statement.
- `parameterReads` reads a same-file caller by the called name alone (`f(...)`, `x.f(...)`), so another function of
  that name in the file counts too. That errs toward more forms, never fewer.
- The rendered comment stands at line 96, the statement reading the parameter, as the brief asked. The edit is at
  line 84 (the parameter's default). The DA's distance rule counted it a hit here.
