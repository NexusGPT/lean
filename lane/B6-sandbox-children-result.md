# B6-sandbox-children: result

## What was done and why
Lean starts two kinds of process to run a unit's code: the lane B worker (for units the parent holds) and the child of
`exec/new-unit.mjs` (for units no parent holds). Both now run under the same sandbox.

1. **The new-unit child runs under the permission model.** Before, it was started with `--experimental-vm-modules`
   alone, so a parentless unit that left the vm context could write files, start processes and read anywhere. It now
   gets the worker's own flags (`workerFlags`: `--permission`, the read trees of the unit's files and their
   `node_modules`, and `netFlags` for the network mode), plus `--experimental-vm-modules`. The old test for running the
   unit in-process was "this process has vm modules". The new test is "this process has vm modules and the permission
   model", so only that child, or a caller that is already sandboxed, runs the unit itself. Under the old test, a
   command line started with the vm-modules flag would have run the unit with no sandbox at all.
2. **Both processes start with a reduced environment.** The permission model has no switch for `process.env`, so the
   only way to keep variables from the unit is to not give them to the process. `workerEnv()` keeps the variables
   lean's own code reads in these processes: `LEAN_*`, `NODE_OPTIONS`, `PATH`, `HOME`, and `XDG_CACHE_HOME` (which
   `lower.mjs` uses for its cache folder). It is the whole `env` of the worker's `fork` and of the new-unit child's
   `spawnSync`.
3. The worker already treated "permission denied" on an existence check outside its read trees as "absent". That check
   is now one function, `absentOutsideReads` in `run.mjs`, used by the worker and by the new-unit child.

Both sides of a unit run in the same process, so a value read from the environment is the same on both sides before
and after. Cutting the environment changes what a unit can see; it never changes a comparison.

## Elements added
- `langs/ts/exec/run.mjs`: `workerEnv` (the kept set, `KEPT_ENV`), `absentOutsideReads`, and `workerFlags` is now
  exported. The worker's `fork` takes `env: workerEnv()`. The header comment of the bound section names the reduced
  environment and the new-unit child.
- `langs/ts/exec/worker.mjs`: calls `absentOutsideReads()` instead of carrying its own copy.
- `langs/ts/exec/new-unit.mjs`: the child is started with `workerFlags(opts)`, `--experimental-vm-modules` and
  `env: workerEnv()`. It runs the unit itself only with vm modules and `process.permission` both present. Its main
  block installs `absentOutsideReads`.
- Pair `sandbox_boundary`: lane B row `envLeak`. The candidate answers the names (never the values) of the variables
  outside the kept set; the parent answers `[]`.
- Pair `new_unit`: row `escape.ts escapes` (NEW, inputs 30, faults 0). The unit tries a file write, `spawnSync('true')`,
  `readdirSync('/')` and the environment, and throws naming every door that opened.
- `fixtures/sandbox/probes.ts`: `envRead` answers the variable names. `fixtures/sandbox/new-unit-probe.ts`:
  `newUnitReach` also tries the read outside the trees and the environment.
- `langs/ts/design/sandbox-boundary.md`: a dated section (2026-10-30, the children of lane B) covering the reading,
  why it is sound, and what stays open; the earlier rows point to it. `sandbox-boundary-probes.txt` is regenerated.

## Before and after
- `JOBS=4 node langs/ts/tests/run.mjs --pair sandbox_boundary --result <file>`:
  - before (base 2a6c7bb62 plus the new rows): 5 rows, 1 failing (`lane B envLeak PASS-bounded`, got WITNESS);
  - after (6748fefa8): 5 rows, 0 failing.
- `JOBS=4 node langs/ts/tests/run.mjs --pair new_unit --result <file>`:
  - before: 30 rows, 1 failing (`escape.ts escapes NEW`, got faults 30);
  - after: 30 rows, 0 failing. The 29 rows that already existed stayed green.
- The 20 pairs the boundary lane listed (alias_after_call, alias_result, asany_record_key, bench_drops,
  builtin_transitions, callback_behaviour, comma_operator, definite_assignment, exported_units_js, hash_keys,
  library_hooks, new_unit, non_null, rename_parameter, sandbox_boundary, stack_text, strict_fixer, this_param,
  try_catch, window_timers) were run with the same command, three at a time, at 6748fefa8: **246 rows, 0 failing**.
  B3 counted 241; this run has 246, which includes the two new rows.
- `node langs/ts/exec/record.test.mjs`, `node langs/ts/exec/callees.test.mjs`,
  `node langs/ts/tests/assurance/sandbox.test.mjs`: exit 0.
- `bash fixtures/sandbox/probe.sh` (from the repository root, Node v24.22.2), diffed against the previous log. Only
  these lines changed:
  - `envRead`: `ok: 32 variables` became `ok: 3 variables: HOME LEAN_NET PATH` (both modes);
  - `newUnitReach`: `write ok; spawn ok (exit 0)` became write, spawn and `read /` all `ERR_ACCESS_DENIED`, with
    `env 3 variables: HOME LEAN_NET PATH` (both modes);
  - `newUnitNet` under `LEAN_NET=deny`: `record.sandbox.by` changed from "lean's bindings only: this process runs
    without the permission model" to "lean's bindings under the permission model (this Node has no --allow-net)".
- The pair list changed only in the two rows this brief names. No census was run: no reading's admission changed.

## Defects met and what is left
- **Network in open mode.** It stays open in the new-unit child, as in the worker (`newUnitNet`: `connect ok`). This
  Node's permission model has no network switch; `LEAN_NET=deny` closes it in both.
- **The `LEAN_*` prefix is broad.** It passes every `LEAN_*` variable the caller sets, including ones only the suite
  reads. Lean keeps no secret in them, but a narrower list of the variables the worker actually reads would be
  tighter. I kept the brief's set.
- **Census copies not run.** The census was not run under the new child. Parentless units in the census copies now
  read only the trees the worker reads. A load that went through without the permission model could now land on a
  different environment class (for example, a config outside the trees is now "absent"). The census owes that number.
- **Commit identity.** Git had no identity set in this worktree. The commits use the identity of the repository's
  existing commits, passed per commit with `-c user.name/user.email`; no config was changed.
- **Not probed (carried over from B3).** WASI and the inspector, and `--allow-net` on Node 25 and later.
