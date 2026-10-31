# readme-refresh-v013: result (2026-10-31)

Branch `lane/readme-refresh-v013` from lean `v0.1.3` (`dbe9a32f`). Every run below was made on this tree; the README
commit changes only `README.md` (no `langs/**`, no tests, no `CHANGELOG.md`, no model).

## The check, and a number in the brief that does not match this head

- `node scripts/readme-check.mjs` at `v0.1.3`, before any edit: **16 checks, 0 failed**. It has no 20th check:
  it re-runs the 13 `$ node langs/ts/check.mjs` / `lint.mjs` lines, the one `decided:` comment, the quickstart and the
  pull-request line, and that gives 16. The brief's "20 checks, 17 held, 3 drifted" is not a reading of this script at
  this head. `git log --all -- scripts/readme-check.mjs` shows only two commits, both before v0.1.0. The figure 20
  matches `node scripts/assurance-check.mjs` (`TOTAL | 20 named checks | ALL PASS` at this head), the check
  behind `docs/ASSURANCE.md`, which the README cites. Both pass here, so neither has a drifted row to fix.
- After the edits: `node scripts/readme-check.mjs`: **16 checks, 0 failed**; `node scripts/assurance-check.mjs`:
  **20 named checks, ALL PASS**.
- `scripts/readme-check.mjs` is unchanged. It reads the right source; I found nothing wrong with it.

The checked lines held, but other claims had drifted. I found these by re-reading each claim against this head.

## Each changed line, with its source

| README line | was | now | source (run at this head unless named) |
|---|---|---|---|
| 19 | Python "at its first milestone" | "at its second milestone" | `langs/py/subset.md` line 1 "(milestone 2)"; CHANGELOG v0.1.1; `lane/E1-python-milestone-2-result.md`; README line 291 already said second |
| 207 | "at its first milestone" | "at its second milestone" | same |
| 83 | environment row: unresolved module, missing dependency | adds: a refusal whose every value has a type that does not resolve (missing import, missing declaration, missing member) | `lane/census-environment-result.md` (the rule); `node langs/ts/tests/census_environment.mjs` exit 0, `census-environment: all hold` |
| 85 | census counts the three kinds | adds both test commands, and says the census exits non-zero and names the files it did not walk when the walk is incomplete | `lane/fix-census-exit-result.md`; `node langs/ts/tests/census_partial.mjs` exit 0, `ALL PASS` |
| 216 | local alias read by the heap core | adds one sentence on the carried alias: a `const` second name of a parameter that holds a same-file class instance is carried by the value reading (it is refused if either name is rebound, handed to a call or read by a closure) | `lane/conformance-causeof-spill-result.md`, `design/conformance-readings.md` §6; `node langs/ts/tests/carried-alias.mjs` exit 0, `carried-alias: all hold` |
| 260 | check.mjs options | adds `--dafny-wall-seconds`, `--sandbox-base <ref>` | `langs/ts/check.mjs` usage lines 6, 8, 21 |
| 272 | "873 MB on disk, 216 MB to download" | "894 MB on disk, 217 MB to download (`docker image ls` at v0.1.3)" | `docker build -t lean:readme-v013 .` at this tree (exit 0), `docker images lean:readme-v013`: 894MB / 217MB. In the image: node v24.22.2, dafny 4.11.0, Z3 4.12.1, the versions the README states. I used a separate tag so `lean:local` is not overwritten |
| 278 | a code fence closed with a sentence on the same line (a duplicate of line 269) | the fence alone | the Markdown was broken; line 269 keeps the sentence |
| 289 | backlog landed 2026-10-30 | adds landed 2026-10-31 (v0.1.3): the stage-5 readings and type-inventory forms 4 to 7 | `CHANGELOG.md` v0.1.3 entry |
| 297 | Limits: lane B's bound | adds the Dafny wall cap: on by default at (`--dafny-seconds` + 60) s, set with `--dafny-wall-seconds`; at the cap Dafny's whole process tree is killed and lane A reads `ASK:timeout` | `lane/check-wall-cap-result.md`, `lane/suite-wall-cap-result.md`, check.mjs line 21; `node langs/ts/tests/wall-cap.mjs` exit 0, `... the checker's own Dafny was capped the same way (PASS-bounded: not proved: wall cap 2 s exceeded)` |
| 300 | "read 32 variables"; "A unit with no parent runs without the permission model today." | the variables lean keeps, and the three the probe read (`HOME LEAN_NET PATH`); a parentless unit runs under the same permission model; adds the allow and deny list (`.gate/sandbox.json` read from the parent commit, every refused name a `sandbox` certificate row, `--sandbox-base`, `pr.mjs` at `--base`) | `bash fixtures/sandbox/probe.sh` at this head (exit 0): `envRead` `ok: 3 variables: HOME LEAN_NET PATH`, `newUnitReach` write/spawn/read `ERR_ACCESS_DENIED`, `netSocket` `ok: connected` (open), `ERR_ACCESS_DENIED` (deny); `KEPT_ENV` in `exec/run.mjs`; `langs/ts/design/sandbox-boundary.md` (the children section of 2026-10-30, stale in the README since v0.1.1); `lane/lean-allow-list-result.md`, `design/sandbox-allow-list.md`; `node --test langs/ts/exec/sandbox-list.test.mjs` exit 0, `pass 8`, `fail 0` |

## What I left, and why

- The new claims cite their tests' last lines inline. `readme-check.mjs` does not re-run those commands, because its
  check covers only `check.mjs`/`lint.mjs`/`pr.mjs` lines and the brief allows a change to it only when it reads the
  wrong source. If one of those tests changes its last line, the README drifts and no check names it. A follow-up
  could make readme-check also run every quoted `node langs/ts/tests/*.mjs` command and compare its last line.
- The by-design table row and line 72 still list "a change through an alias of a parameter" as refused. That is still
  the general rule (`alias-mutation`); the exceptions read today are stated at line 216.
- The image size depends on the tree that `COPY . /lean` copies, so it moves with every commit. The README now names
  the version it was measured at.
