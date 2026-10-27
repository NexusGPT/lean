# lean in CI: the comment, the editor rule, then blocking

Three steps, in this order, each switched on in a repository by one small file there; lean holds the rest.

1. **The comment.** On every pull request, the table of `pr.mjs` (one row per changed function, its verdict, the
   witness input or the lint's advice) as ONE comment, updated on every push. Nothing blocks.
2. **The editor rule.** `lean/provable` on new code only, so code written from then on is inside the subset from its
   first line (`langs/ts/eslint/README.md`).
3. **Blocking.** The job fails on a `WITNESS` row (`block: witness`), later perhaps on `ASK` too (`block: ask`).
   A row declared in scope never blocks. Off unless the caller sets it.

## The pieces in lean

- `langs/ts/ci/comment.mjs`: base sha and head sha to the table, written to a file; `--post` upserts the comment
  marked `<!-- lean-report -->` through the REST API with the runner's `GITHUB_TOKEN` (list the issue comments, update
  the marked one, else create it); `--block none|witness|ask` sets the exit code; `--paths` and `--max-functions`
  bound the table. A failed post is a warning. Under `--block`, a run that produced no table fails: a gate that could
  not look does not pass. Checked by `node langs/ts/ci/comment.test.mjs` against a fake GitHub on localhost.
- `.github/workflows/lean-pr.yml`: the reusable workflow. Inputs `lean-ref` (required), `block` (`none`), `paths`
  (empty: the whole repository), `max-functions` (40), `install` (a command such as `npm ci`, so imports resolve),
  `project` (empty: each file's nearest tsconfig), `proof` (true), `dafny-install`, `timeout-minutes` (30); one
  optional secret, `lean-token`. The report is also kept as a job artifact.
- `.github/workflows/lean-self.yml`: lean's own pull requests that touch `langs/ts/tests/pairs/**`. The touched pairs
  become a two-commit repository (`langs/ts/ci/pairs-repo.mjs`: parents, then candidates) and its table is the
  comment. Never blocking; it exercises the comment on every pair change.
- `langs/ts/ci/new-code.mjs`: the files changed since a boundary tag as one ESLint entry.

## What a repository adds

One caller workflow, `.github/workflows/lean.yml`:

```yaml
name: lean
on: pull_request
permissions:
  contents: read
  pull-requests: write
jobs:
  lean:
    uses: NexusGPT/lean/.github/workflows/lean-pr.yml@<lean sha>
    with:
      lean-ref: <lean sha>
      paths: "src/**"
      install: npm ci
    secrets:
      lean-token: ${{ secrets.LEAN_READ_TOKEN }}
```

Step 3 is one more line under `with:`, `block: witness`. Step 2 is the `eslint.config.mjs` entry and a tag.

## Pinned ref

The caller names one full lean commit sha, twice: in `uses:` (the workflow file) and in `lean-ref` (the code it
runs). Never a branch: a moved branch would change verdicts with no change in the caller. Upgrading lean is a pull
request in the caller that changes both lines, and its own lean comment shows what the new version says.

## Time

Per changed function: lane B on `--n` inputs (100 by default), then Dafny for at most `--dafny-seconds` (30 by
default in `pr.mjs`). Measured on this machine through `comment.mjs`: a one-function refactor proved by Dafny,
`real 1,85` s; three WITNESS rows, `real 0,51` s (`/usr/bin/time -p`, toy files, `--no-project`). A large pull
request is bounded by `paths` (only the files that matter), `max-functions` (the table) and `timeout-minutes` (the
job). `pr.mjs` checks every changed function today; the table is cut at the cap after the fact. A hunk that makes
`prReport` skip unmatched files and stop at the cap (options `paths`, `maxUnits`, which `comment.mjs` already passes)
is with the lead, since `pr.mjs` belongs to another lane.

Validated offline only: `actionlint` 1.7.12 with shellcheck on both workflow files and on the caller above, the caller checked against the
local reusable workflow's inputs (a misspelt `lean-ref` is refused). No workflow has run on GitHub; nothing is
enabled anywhere.

## The owner's decisions

1. Which repository first, with its `paths` and its `install` command.
2. When `WITNESS` blocks (`block: witness`), and whether `ASK` ever does; recorded in the diary when taken.
3. Access: lean is private, so its Actions access setting must allow the caller's repository, and the caller needs
   a read token for lean as the secret `lean-token` (the runner's token cannot read another private repository).
4. Dafny on the runner: the default `brew install dafny` comes from the Homebrew formula (Dafny 4 on dotnet 8 with
   z3) and has not run on a Linux runner; validate it on the first run, or set `proof: false` for lane B verdicts.
5. Pull requests from forks get a read-only token: the comment is not posted (a warning); acceptable or not.
6. The editor rule's boundary tag and level (`error`, or `warn` to start).
