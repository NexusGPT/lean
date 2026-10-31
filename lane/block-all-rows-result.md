# block-all-rows: the blocking gate decides from every row of the report

## The defect
- `comment.mjs --block <level>` decided from the rows left after the `--max-functions` cap.
- A WITNESS or ASK function row past the cap never blocked and got no annotation.
- `comment.mjs` passed `maxUnits` to `prReport`. `pr.mjs` never read it. The cap never bounded the work, but two design
  docs said it did.

## The rule
- The gate reads the whole report after `--paths`: every function row and every intake row.
- `--max-functions` shapes the verdict table and nothing else. It is presentation only.
- The work is bounded by `--unit-budget` and `--time-budget`. Their stop already blocks under `--block`.
- The rule has no case per level, per verdict or per fixture.

## What changed, and why
- **`capTable(rows, max)` in `langs/ts/ci/comment.mjs`.** This new pure function returns `{ table, capped }`. It
  keeps the old cap rule: it counts function rows only and keeps every intake row. Only the markdown table reads it.
- **`main` in `comment.mjs`.** `rows` stays the whole report. The intake table, `--json`, the gate and the annotations
  read `rows`. The table is built from `capTable`. The old code put the capped rows back into `rows` before the gate.
- **`maxUnits` is removed from the `prReport` call.** `pr.mjs` never had it, so it is gone from both sides. It was not
  wired into `pr.mjs` as a work bound for two reasons. First, the budgets already bound the work, and their stop
  blocks. Second, a cap that silently skipped work would let a gate pass on units nobody checked.
- **The header comment of `comment.mjs`** now states the rule.
- **`langs/ts/design/ci.md` and `langs/ts/design/callee-witness.md`.** One passage in each said `prReport` stops at
  the cap, or that caller runs count against `maxUnits`. Both were false. They now name the budgets, which
  `pr.mjs` reads (`unitBudget` and `timeBudget` in `prWorker`). These two files are outside the owned list. They are
  corrected because they described the removed option.

## The test (`langs/ts/ci/comment.test.mjs`)
- Each case runs a report of 3 function rows with `--max-functions 2`. The row that matters is the third one.
- The cases: witness with a WITNESS row, ask with WITNESS, ask with ASK, witness with ASK, ask with REFUSE, ask with a
  nested WITNESS (`covered-by`), and none with WITNESS.
- Each case checks three things:
  - The exit code, capped and uncapped, is the expected one.
  - The table stops at the cap and shows the cap note.
  - A blocking row past the cap gets its `::error file=…,line=…` annotation.
- One more check: the report call carries no `maxUnits`.

## Mutation evidence
| Code under test | comment.test |
|---|---|
| lead head 9815f590, before the fix | 62 of 68; 6 FAIL: the exit and annotation checks of the 3 blocking cases |
| this branch | 69 of 69 |
| mutant: gate reads `table` again | 63 of 69; the same 6 FAIL |
| mutant: `maxUnits: maxFunctions` passed again | 68 of 69; FAIL "the function cap is not passed to the report" |

## Done-when checks, on this branch
- `node --test` over comment, values-line, report, ledger and supervise tests: 5 of 5 files pass.
- `node langs/ts/tests/fixtures/pr-intake/test.mjs`: PASS.
- `node scripts/readme-check.mjs`: 16 checks, 0 failed.
- **The CI comment step.** It ran the way `lean-self.yml` runs it, without `--post`: `pairs-repo.mjs --pairs
  readme_ledger`, then `comment.mjs --no-project --max-functions 40 --out`.
  - The lead head code and this branch each ran on a fresh pairs repo.
  - The bodies are the same line for line. The only differences are the commit shas, the edit ids and the Identity
    hash, which come from the fresh repo's new commits.
  - Both runs exit 0 and say 12 function(s).

## Left over
- `--max-functions` still sets `capped` when the function rows equal the cap and nothing is dropped. The note says
  "the cap was reached", which is true, so this is unchanged.
- `lean-pr.yml` and `ci.md` still describe `max-functions` as bounding the table. That is now the whole truth.
