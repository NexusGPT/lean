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
