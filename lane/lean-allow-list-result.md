# lean-allow-list: result (2026-10-31)

Branch `lane/lean-allow-list`, from lean `09032a594` (lead-09032a59).

## Commits
- `c08d7d2a5` sandbox-list: `.gate/sandbox.json` of the parent commit holds lane B's sandbox (read, write, spawn,
  install, process_list); every refusal a certificate row. `exec/sandbox-list.mjs` (reader `git show <parent>:.gate/sandbox.json`,
  validator in DA's vocabulary plus `read`/`write`/`spawn` `{allow, deny}`, `applyList`, `guardSpawn`);
  `exec/run.mjs` `workerSandbox` (the worker's flags), `exec/new-unit.mjs` (the parentless child), `check.mjs`
  `--sandbox-base <ref>` and `certificate.sandbox`, `pr.mjs` (the list at `--base`, one `sandbox` record per row),
  `tests/run.mjs` runtime row `sandbox-list`.
- `dfd5448e9` `langs/ts/design/sandbox-allow-list.md`, the owner's page.
- this file.

## Red and green
Runtime row `sandbox-list` = `node --test langs/ts/exec/sandbox-list.test.mjs`, 8 tests, one per clause (absent file
equals today's flags with no row; read from the parent commit, not the working tree; schema refusal naming every field;
read allowed / read refused and named / rest of the tree still read; write default refused / allowed / denied; spawn
refused and named / allowed / refused by spawn.deny and by install.deny; install pinned given / unpinned refused and named /
allowed by name / pinned but denied refused; the certificate row through `check.mjs --sandbox-base`).
- With the reader neutralised (`loadSandboxList` returning the default): 1 pass, 7 fail (only the validator test passes).
- With it: 8 pass, 0 fail.

## Pairs (JOBS=2 node langs/ts/tests/run.mjs --pair <pair>, at c08d7d2a5)
| pair | checks | result |
|---|---|---|
| heap_canonical | 13 | ALL PASS |
| type_tests | 59 | ALL PASS |
| copied_argument | 10 | ALL PASS |
| sandbox_boundary (lane B's permission pair, both net modes) | 5 | ALL PASS |
| new_unit (the parentless child under the worker's flags) | 30 | ALL PASS |

Screen pairs: lean has none (no `langs/ts/screen`, no pair whose expectations name a screen); nothing to run.
No `expect.json` changed.

## Regressions
None found in the pairs above. The full suite was not run (the lead runs it at the merge).

## Decisions taken alone (asked the lead, no answer in 120 s)
- `process_list` absent means **hidden** for lane B (today's: the permission model refuses `/proc` and every program),
  not real as in DA's build. `real` gives `/proc` (Linux) and the program `ps`; on Linux that also exposes other
  processes' environments, which would undo the reduced environment of design/sandbox-boundary.md.
- "install" for lane B: lean installs nothing (a unit's packages are fakes); the list governs which packages of the
  `node_modules` folders the run reads are given to it (the lockfile beside the folder, `allow.packages`, `install.deny`).
  With no file, every package there is given, as today.

## What is left
- DA's `sandbox_allow.py validate` refuses unknown fields: a shared file with `read`, `write` or `spawn` is refused by
  DA's build until DA's schema lists them (DA-side change, not this lane's).
- A unit that starts an allowed package manager can install; `install` is not checked against a manager's arguments.
- A run in lean's own process (`inProcess`, tests) has no permission model; the list is not applied there.
- `bash fixtures/sandbox/probe.sh` was not regenerated; the probes' lines are unchanged with no file (same flags).
