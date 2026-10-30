# values-line: the report's Values line names a file or says none

## The defect
The CI comment on NexusGPT/lean pull request #1 printed:

    Values: undefined at undefined, sha256 undefined; lane B draws its listed values first, and each certificate names the file by this hash

The report rows are an array. The code read the values file as `rows.values`. When no values file was listed and the rows
had no own `values` property, `rows.values` was `Array.prototype.values`, a function, so the test passed and its
`file`, `from` and `sha256` read as undefined. The comment step (`langs/ts/ci/comment.mjs`) re-wraps the rows after the
path filter and the cap and copied only `stop`, `order` and `callersChecked`. It dropped the values record every time,
so the comment printed the undefined line with or without a values file. `node langs/ts/pr.mjs` alone kept an own
`values: undefined` and printed no Values line at all.

The same misread sat in two more places: `reportJSON` (harmless, JSON drops a function) and the worker's certificate
save, where a certificate drawing a nearest values file had its `file` and `from` overwritten with undefined whenever no
root file was listed (found by reading the code; not driven live).

## The rule
One rule, decided only by whether the run read a values file:
- a values file read: `Values: <path> at <ref>, sha256 <hash>; lane B draws its listed values first, ...`
- none: `Values: none listed (lane B draws from the types)`

## Elements added, and why
- `listedValues(rows)` in `langs/ts/pr.mjs`: the one reader of the run's values record. Only an own object property
  counts, so `Array.prototype.values` can never stand in for a file. Used by `markdown`, `reportJSON`, the certificate
  save and the comment step.
- `valuesLine(values)` in `langs/ts/pr.mjs`: the one renderer of the line, both branches. `markdown` always emits it.
  The comment step calls `markdown`, so both renderers share it.
- `langs/ts/ci/comment.mjs`: both re-wraps carry `values: listedValues(rows)`, so the comment keeps the record the
  report read.
- `langs/ts/ci/values-line.test.mjs`: 11 checks. `markdown` with no property, an own undefined and an own null prints the
  none line and the JSON has no values key. `markdown` with a record prints path, ref and hash. `valuesLine` never prints
  undefined. `comment.mjs main` (stubbed report), unfiltered, with `--paths` and with `--max-functions`, prints the none
  line without a file and the listed line with one.

## Mutation evidence
- Restore the old Values expression in `markdown`: the test exits 1 on the first none check with
  actual `Values: undefined at undefined, sha256 undefined; ...`, expected `Values: none listed (lane B draws from the types)`.
- Drop the `values` carry from both comment re-wraps: the test exits 1 on `comment, unfiltered`, which got the none line
  where a values file was listed.
- Fixed code: 11 checks pass, exit 0.

## Live runs
- `node langs/ts/pr.mjs --repo . --base 3ef57e07 --head 6c54f2fd --no-project` (pull request #1, no values file at head),
  exit 0. The report reads:

      Values: none listed (lane B draws from the types)

- The CI path, as the workflow runs it: `pairs-repo.mjs --pairs readme_ledger`, then `comment.mjs --no-project
  --max-functions 40`. Master code prints the undefined line at line 23. Fixed code prints the none line at line 23.
- The listed branch: a scratch repo with the known_values pair and its `.lean/values.json`. Both `comment.mjs` and
  `pr.mjs` print `Values: .lean/values.json at 562bf1d5..., sha256 12b6be4ec136f067`. That hash matches `shasum -a 256`
  of the file, first 16 hex digits.

## Regression checks
- `node scripts/readme-check.mjs`: 16 checks, 0 failed.
- `langs/ts/ci/` tests: report.test pass. comment.test 46 of 46. ledger, supervise, ledger-failures and worktree pass.
  new-code 12 of 12.

## Left over
- `langs/ts/ci/pairs-repo.mjs` copies a pair's source files and leaves out its `.lean/values.json`. In CI the
  known_values pair therefore runs without its values and its comment says none listed. This lane does not own that file.
- The comment step's re-wrap also drops `identity` and `leanVersion`, so the CI comment carries no Identity line. Same
  class of defect, other line. Left for its owner.
- `docs/known-values.md` documents the listed line only. It could name the none line too.

# Follow-ups (second commit)

## 1. The comment step keeps the whole report record
- **Defect.** `comment.mjs` re-wrapped the rows twice, after the path filter and after the cap. Each re-wrap listed the
  fields it kept by hand. Identity and lean version were missing from that list, so the CI comment had no Identity line.
- **Fix.** `withRecord(rows, part)` in `pr.mjs` copies every own non-index field of the rows onto the part. Both
  re-wraps call it. A field the report gains later goes through by default.
- **One exception.** The fields that describe the whole row set are listed once in `WHOLE_SET_FIELDS`: ledger,
  reconciliation, terminalFile, runDir, refusalsFile. A literal whole spread copied the unfiltered change ledger and a
  runner-local ledger path into the comment and ignored `--paths`. The comment check "paths keep only matching files"
  went red, 45 of 46. With the exception it is 46 of 46. These fields stay in the job's report.json, as before.

## 2. The pairs repository keeps a pair's values file
- **pairs-repo.** `pairs-repo.mjs` skipped every folder of a pair, so `.lean/` was dropped. It now copies the pair's
  `.lean/` beside its index file.
- **Snapshot.** That copy alone was not enough. The run's source snapshot (`supervise.mjs` materializeSources) kept
  only the root `.lean/values.json`. It now keeps every `.lean/values.json`, the nearest-file rule `findValues` already
  reads.
- **Report line.** With the values reaching lane B, the line would have said "none listed", which is false. The worker
  now records each nearer file a certificate drew, by its checkout path, as `valuesNearest`. `valuesLine` prints them:
  `Values: known_values/.lean/values.json at <head>, sha256 12b6be4ec136f067; each unit's lane B draws the nearest file
  above it first, ...`.
- **Certificates.** A certificate's values file now names the checkout path. Before, it named the run's snapshot
  copy, which the run deletes.
- **Live, the CI path on the known_values pair.** `quote` is WITNESS, which is the verdict its expect.json gives with
  the file. Before, lane B ran without the file.

## 3. Docs
`docs/known-values.md` documents three cases: the root-file line, the nearer-file line and the none line.

## Tests and mutation evidence
`langs/ts/ci/values-line.test.mjs`, 17 checks. Each mutation exits 1:
- old comment re-wraps: "comment unfiltered: no Identity line with the lean version"
- old pairs-repo: the `git show` of `known_values/.lean/values.json` fails
- old snapshot filter: ENOENT on the snapshot's `known_values/.lean/values.json`
- `markdown` ignoring `valuesNearest`: the line reads none listed

## Regression
- **readme-check**: 16 of 16.
- **CI tests**: comment.test 46 of 46. report, ledger, supervise, ledger-failures and worktree pass. new-code 12 of 12.
- **Root-file branch.** `pr.mjs` on a repo with a root file still prints `.lean/values.json at <head>`, and its
  certificates name `.lean/values.json`.
- **Pull request #1.** `pr.mjs` still prints the none line.

## Left over
- The worker sends its fields to the parent through `reportJSON`, a hand-written list. The parent reads them back
  through another hand-written list at `prReport`. That is the same class of risk, at the process boundary. I added
  `valuesNearest` to both lists and did not restructure them.

# Fourth follow-up: the function cap counts function rows only

## Base
`verdictRows` and `intakeRow` existed only on `lane/pr-comment-only`. The lane may not merge or rebase, so 82f0c994,
b7132221 and b73047f6 are cherry-picked onto this branch, which makes 911d0814, d6dce328 and a0e46eb6. Both conflicts
were in `pr.mjs`, where their helpers sit beside the Values helpers. After the resolution, `git diff b73047f6 --
langs/ts/pr.mjs` holds only this lane's own changes.

## Defect
`comment.mjs` capped `--max-functions` on `rows.length`. That count includes the intake rows (artifact, unassigned),
which never enter the verdict table. With intake rows first, a cap of 3 tabled no function at all. The same cut also
dropped intake ASK rows before the blocking gate. So `--max-functions` decided whether a `.env` secret-path ASK
blocked under `--block ask`.

## Rule
- The cap counts the rows `verdictRows` keeps: `!intakeRow(r)`. It keeps the first N of them and every intake row.
- `capped` means the function rows reached N.
- Intake rows never fill the cap, so they still reach the intake table and the gate.

## Tests and mutation evidence
- **`values-line.test.mjs`, now 20 checks.** Six intake rows come before three function rows. Cap 3 and cap 4 table
  f1, f2 and f3. Cap 2 tables f1 and f2. The intake table lists all six in every case, and the cap note appears only
  when the function rows reach the cap. With the old cap the test fails: "--max-functions 3: tabled []".
- **The existing comment.test check "dropping the stop makes the gate silent".** It passed only because the old cap
  cut the fixture's intake ASK rows. It now isolates the stop under `--block witness`, where no row of that report
  blocks.
- **A new comment.test check: "an intake ASK blocks under ask with the cap at 1".** With the old cap the pr-intake
  fixture fails on exactly that check.

## Regression
- **pr-intake fixture**: PASS, its comment.test pass 13 of 13.
- **comment.test**: 47 of 47.
- **Other CI tests**: report, ledger, supervise, ledger-failures and worktree pass. new-code 12 of 12.
- **readme-check**: 16 of 16.
- **CI path on the pull request #1 pair**: the verdict table, the Identity line and the none line are all present.
- **`pr.mjs` on pull request #1**: prints the none line.

## Left over
- `comment.mjs` passes `maxUnits: maxFunctions` to the report, but `pr.mjs` reads no `maxUnits`, so the cap limits only
  the table, never the work. The code comment says so ("The cap limits the verdict table. The budget limits work.").
- The blocking gate reads the capped rows, so a function row past the cap does not block. That is unchanged.
