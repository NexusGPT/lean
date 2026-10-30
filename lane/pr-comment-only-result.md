# Lane pr-comment-only: an edit of comments and blank lines is intake, not a verdict row

Branch `lane/pr-comment-only`, worktree `/Users/assem/nexus/nexus-organisation/work/lean-lanes/pr-comment-only`, from lean master 5f96f554.

## The defect

On NexusGPT/lean pull request #1, the report counted six comment edits as verdict rows: "13 changed function(s)", 6 ASK.
Each was a `(edits from <hash> unassigned:comment)` row. A comment edit is not a function and owes no verdict.

A second defect sat under it. The ledger decided "comment" with a scanner started at the start of each line, without the tree:
- A line inside a `/* */` block was read as code. It stayed ASK as a module-level statement.
- A line of a module-level template literal that starts with `//` was read as a comment. Today that is only a wrong label.
- Once comment rows leave the verdict table, that wrong label would hide a real behaviour change. So the label had to be made sound first.

## The rule, and why it is the general one

An edit owes no verdict when nothing in it can run differently: its span holds no compiled token, and no comment the compiler or the runtime reads.
- The ledger decides this once, from the parsed tree (`ci/ledger.mjs`, `treeReading` and `syntaxContext`). No hash, file name or pull request plays a part.
- Compiler-read comments come from the compiler's own lists: `sf.pragmas` (e.g. `/// <reference>`, `@jsx`), `sf.commentDirectives` (`@ts-ignore`, `@ts-expect-error`), JSDoc in JavaScript files, and the shebang. Such an edit is `unassigned:directive comment` and stays ASK.
- An inert edit is `unassigned:comment` or `unassigned:whitespace`. Its row carries `inert: true` and verdict null.
- The inert test runs before the language and class routes, since a comment changes nothing whatever file holds it. A comment inside a listed unit still goes to its unit.
- `pr.mjs` lists inert rows in the intake table. `verdictRows` keeps them out of the verdict table, the counts and the blocking rows.
- A plain run now prints title, intake table, then `## Verdicts`. This is the comment's existing layout (`reportMarkdown`).

## Pull request #1: before and after

I rebuilt the change set the way the workflow does it: `ci/pairs-repo.mjs` on the head commit's `readme_ledger` pair (6c54f2fd). This gives base 00e2ad5a and head 52b57d7e. Command:
`node langs/ts/pr.mjs --repo <pairs> --base 00e2ad5a… --head 52b57d7e… --no-project`

Before (master 5f96f554), verbatim up to the legend:

```
# lean report: 00e2ad5a8897df83278745bc0ee2757f0497be79 → 52b57d7e8754c8535b3b76b031bd7ac718970df5

Identity: 280f073a4e31550b35a17ce5b87a148a099a9538c728eaa0614429d9a135d2e7; lean 5f96f554c32475df79664eff561fabe81170e4ee

13 changed function(s) (2 nested in another, carrying its verdict): **0 in scope · 3 WITNESS · 2 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 6 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| readme_ledger/index.ts | `applyAll` (9-25) | **WITNESS** | checked | WITNESS |  | input 15: heap; readme_ledger/index.ts:18 |
| readme_ledger/index.ts | `statement` (28-30) | **PASS-proved** | checked | PASS-bounded | PASS-proved |  |
| readme_ledger/index.ts | `statement/events.filter()#0` (29-29) | **PASS-proved** | checked | PASS-bounded | PASS-proved | covered-by: statement |
| readme_ledger/index.ts | <code>statement/events.filter((e) =&gt; e.account === account).map()#0</code> (29-29) | **PASS-proved** | checked | PASS-bounded | PASS-proved | covered-by: statement |
| readme_ledger/index.ts | `rollback` (33-38) | **WITNESS** | checked | WITNESS |  | input 0: outcome; readme_ledger/index.ts:37 |
| readme_ledger/index.ts | `Ledger.post` (44-49) | **WITNESS** | checked | WITNESS |  | input program 3: outcome; readme_ledger/index.ts:48 |
| readme_ledger/index.ts | `Ledger.reset` (51-56) | **PASS-proved** | checked | PASS-bounded | PASS-proved |  |
| readme_ledger/index.ts | `(edits from 11db13fa2565 unassigned:comment)` (1-1) | **ASK** | unassigned:comment |  |  | comment |
| readme_ledger/index.ts | `(edits from ea5668a05bfe unassigned:comment)` (7-8) | **ASK** | unassigned:comment |  |  | comment |
| readme_ledger/index.ts | `(edits from 2208752e7078 unassigned:comment)` (26-27) | **ASK** | unassigned:comment |  |  | comment |
| readme_ledger/index.ts | `(edits from 6769e8ac2c16 unassigned:comment)` (32-36) | **ASK** | unassigned:comment |  |  | comment |
| readme_ledger/index.ts | `(edits from 5a93f588b990 unassigned:comment)` (43-43) | **ASK** | unassigned:comment |  |  | comment |
| readme_ledger/index.ts | `(edits from d67917271e8c unassigned:comment)` (50-53) | **ASK** | unassigned:comment |  |  | comment |

```

After (82f0c994), verbatim up to the legend:

```
# lean report: 00e2ad5a8897df83278745bc0ee2757f0497be79 → 52b57d7e8754c8535b3b76b031bd7ac718970df5

## Intake

| file | unit | coverage | decision | reason |
|---|---|---|---|---|
| `readme_ledger/index.ts` | applyAll | checked | check | verdict produced |
| `readme_ledger/index.ts` | statement | checked | check | verdict produced |
| `readme_ledger/index.ts` | statement/events.filter()#0 | checked | check | covered-by: statement |
| `readme_ledger/index.ts` | <code>statement/events.filter((e) =&gt; e.account === account).map()#0</code> | checked | check | covered-by: statement |
| `readme_ledger/index.ts` | rollback | checked | check | verdict produced |
| `readme_ledger/index.ts` | Ledger.post | checked | check | verdict produced |
| `readme_ledger/index.ts` | Ledger.reset | checked | check | verdict produced |
| `readme_ledger/index.ts` | (edits from 11db13fa2565 unassigned:comment) | unassigned:comment | unassigned | comment |
| `readme_ledger/index.ts` | (edits from ea5668a05bfe unassigned:comment) | unassigned:comment | unassigned | comment |
| `readme_ledger/index.ts` | (edits from 2208752e7078 unassigned:comment) | unassigned:comment | unassigned | comment |
| `readme_ledger/index.ts` | (edits from 6769e8ac2c16 unassigned:comment) | unassigned:comment | unassigned | comment |
| `readme_ledger/index.ts` | (edits from 5a93f588b990 unassigned:comment) | unassigned:comment | unassigned | comment |
| `readme_ledger/index.ts` | (edits from d67917271e8c unassigned:comment) | unassigned:comment | unassigned | comment |

## Verdicts

Identity: 280f073a4e31550b35a17ce5b87a148a099a9538c728eaa0614429d9a135d2e7; lean 5f96f554c32475df79664eff561fabe81170e4ee

7 changed function(s) (2 nested in another, carrying its verdict): **0 in scope · 3 WITNESS · 2 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| readme_ledger/index.ts | `applyAll` (9-25) | **WITNESS** | checked | WITNESS |  | input 15: heap; readme_ledger/index.ts:18 |
| readme_ledger/index.ts | `statement` (28-30) | **PASS-proved** | checked | PASS-bounded | PASS-proved |  |
| readme_ledger/index.ts | `statement/events.filter()#0` (29-29) | **PASS-proved** | checked | PASS-bounded | PASS-proved | covered-by: statement |
| readme_ledger/index.ts | <code>statement/events.filter((e) =&gt; e.account === account).map()#0</code> (29-29) | **PASS-proved** | checked | PASS-bounded | PASS-proved | covered-by: statement |
| readme_ledger/index.ts | `rollback` (33-38) | **WITNESS** | checked | WITNESS |  | input 0: outcome; readme_ledger/index.ts:37 |
| readme_ledger/index.ts | `Ledger.post` (44-49) | **WITNESS** | checked | WITNESS |  | input program 3: outcome; readme_ledger/index.ts:48 |
| readme_ledger/index.ts | `Ledger.reset` (51-56) | **PASS-proved** | checked | PASS-bounded | PASS-proved |  |

```

The CI comment step, run locally as the workflow runs it (`ci/comment.mjs --no-project --max-functions 40 --out`, without `--post`):
- before: `13 changed function(s) (2 nested in another, carrying its verdict): **0 in scope · 3 WITNESS · 2 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 6 ASK · 0 REFUSE · 0 NEW**`
- after: `7 changed function(s) (2 nested in another, carrying its verdict): **0 in scope · 3 WITNESS · 2 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**`

## Tests and mutation evidence

New test `testCommentOnly` in `langs/ts/tests/fixtures/pr-intake/test.mjs`. It runs inside the existing pr-intake suite row, on the new fixture `langs/ts/tests/fixtures/pr-intake/comment-only/`.
- The fixture's comment-only shapes: a line comment added, a block comment's inside line, a blank line, a comment above a class and a comment between two methods.
- It also holds three non-inert controls: a function body change, a template line that starts with `//`, and a `/// <reference>` change.
- It checks: 5 inert groups, unassigned, no verdict; 3 verdict rows; "3 changed function(s) … 2 ASK" from `markdown`, the plain run and `comment.mjs`; intake before verdicts; no inert row blocks under `--block ask`.

Red before the change (master code, new test):
```
RED: every edit that changes no token outside comments and blank lines is an intake-only row + actual - expected + [] - [ - [ - 'unassigned:comment', - [ - 16, - 17 - ] - ], - [ - 'unassigned:comment', - [ - 2, - 2 - ] - ], - [ - 'unassigned:comment', - [ - 24, - 24 - ] - ], - [ - 'unassigned:comment', - [ - 8, - 9 - ] - ], - [ - 'unassigned:whitespace', - [ - 16, - 16 - ] - ] - ]
```

Each mutation was made on the committed code, run, then restored with `git checkout`. Each one is red:

| mutation | result |
|---|---|
| `markdown` tables every row (no `verdictRows`) | RED: the verdict table holds the three rows that owe a verdict, 8 !== 3 |
| directive comments read as inert | RED: the reference-directive edit [1,2] joins the inert groups |
| the old line scanner instead of the tree | RED: the template line [4,5] turns inert, the block comment's inside line [8,9] does not |
| inert rows keep verdict ASK and no `inert` flag | RED: no intake-only rows |

Green after the change, all run from the worktree:
- `node langs/ts/tests/fixtures/pr-intake/test.mjs`: PASS (the new test plus the existing 7-row intake test)
- `ci/ledger.test.mjs`, `ci/ledger-failures.test.mjs`, `ci/comment.test.mjs` (46 of 46), `ci/report.test.mjs`, `ci/supervise.test.mjs`, `ci/worktree.test.mjs`: pass
- `tests/pairs/callback_units/markdown.test.mjs`: pass
- the runtime rows that read pr.mjs, `tests/no-silent-exit-importers.mjs` and `tests/bin-lean.mjs`: pass
- `node langs/ts/tests/run.mjs --pair readme_ledger`: 15 checks, ALL PASS
- `node scripts/readme-check.mjs`: 16 checks, 0 failed
- `run.mjs` has no `--only runtime` flag, so I ran the runtime scripts that read pr.mjs directly.

## What is left

- `comment.mjs` (not mine) still counts inert rows toward `--max-functions` when it caps the verdict table. Rows are ordered units first, so the cap trims ledger rows first. It never hides a unit before an inert row.
- `markdown` on a bare array (a preview's JSON read back) prints "Values: undefined…". The cause: `rows.values` resolves to `Array.prototype.values`. This belongs to the Values-line lane (`lane/values-line`). I did not touch it. The new test sets `values: null` on its array.
- JSX text counts as compiled text, blank space included. A whitespace edit inside JSX stays a verdict row, which is the safe side.
- Benchmark cohorts that counted `comment` or `whitespace` reasons will see the reclassification: block comment insides become `comment`, and template lines become statements.

## Every element added, and why

- `ci/ledger.mjs` `treeReading`, `tokenIn`, `meets`: the tree's tokens and compiler-read comment spans, once per file side. The inert decision is read from what the compiler parsed.
- `ci/ledger.mjs` `syntaxContext`: inert when no token meets the span, else `directive comment`. This replaces the line scanner, which had the two holes above.
- `ci/ledger.mjs` routing branch: inert edits outside units become `unassigned` with `inert: true`, before the language and class routes. This decides it once, in the intake.
- `ci/ledger.mjs` `ledgerRows`: an inert group gets verdict null and `inert: true`. Downstream code reads the flag and never re-decides it.
- `pr.mjs` `verdictRows`: the verdict table and counts skip inert rows. The run metadata stays on the array.
- `pr.mjs` `reportMarkdown`, used by the plain run: title, intake, then verdicts. This puts the six edits in the intake table of a plain run, matching the comment.
- `tests/fixtures/pr-intake/build.mjs` `sides` option: one builder for a second fixture folder.
- `tests/fixtures/pr-intake/comment-only/` and `testCommentOnly`: the red-then-green test.
- `design/admission-contract.md`: a dated paragraph stating the rule.
