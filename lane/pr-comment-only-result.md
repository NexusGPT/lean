# Lane pr-comment-only: only function units are verdict rows; every other edit is intake

Branch `lane/pr-comment-only`, worktree `/Users/assem/nexus/nexus-organisation/work/lean-lanes/pr-comment-only`, from lean master 5f96f554.

## The defect

On NexusGPT/lean pull request #1, the report gave verdict rows and ASK counts to edits that are not functions:
- On the pairs change set the CI comment runs on: six `(edits from <hash> unassigned:comment)` rows (13 rows, 6 ASK).
- On the lean diff itself (3ef57e07 to 6c54f2fd): four `artifact:config` rows on the workflow file and one `artifact:test` row (5 rows, 5 ASK).

A second defect sat under the first. The ledger decided "comment" with a scanner started at the start of each line, without the parse tree:
- A changed `//` line inside a module-level template literal was read as a comment.
- A changed line inside a `/* */` block was read as code.

The first label would hide a real behaviour change once comments carry no verdict. So the label had to be made sound first.

## The rule, stated once

- **Only a function unit enters the verdict table and its counts.** Every other row is an intake row of the change ledger and stays in the intake table: an artifact by kind or class, an unassigned edit by its named reason, the empty diff. `pr.mjs` decides this with `intakeRow`, read from the row's ledger route (`decision` artifact or unassigned), and `verdictRows`.
- **A non-inert intake row keeps its ASK in the data.** So `--block ask` still blocks on it, and nothing undecided goes silent.
- **An inert edit carries no verdict and never blocks.** An edit is inert when it lies outside every listed unit and its span holds no compiled token and no comment the compiler reads. Its coverage is `unassigned:comment` or `unassigned:whitespace`, with `inert: true`.
- **The ledger reads inert from the parse tree** (`ci/ledger.mjs`, `treeReading`, `syntaxContext`). The compiler-read comments come from the compiler's own lists: `sf.pragmas` (e.g. `/// <reference>`, `@jsx`), `sf.commentDirectives` (`@ts-` directives), JSDoc in JavaScript files, and the shebang. Such an edit is `unassigned:directive comment` and stays ASK.
- **No hash, file name or pull request plays a part.** The inert test runs before the language and class routes, because a comment changes nothing whatever file holds it.
- A plain run prints title, intake table, then `## Verdicts` (`reportMarkdown`). This is the CI comment's existing layout.

## Pull request #1, the pairs change set the CI comment runs on

This is `ci/pairs-repo.mjs` on the head commit's `readme_ledger` pair (base 00e2ad5a, head 52b57d7e), run with `node langs/ts/pr.mjs --repo <pairs> --base … --head … --no-project`.

Before (master), verbatim to the legend:
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
After, verbatim to the legend:
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

Identity: 457d33d5d7eeac441476bd9673c0c48c52e4289a9ff52b9e1ebab8ef905e7da5; lean b713222140c0223f102da65451cc1457ff205f57

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
The CI comment step, run locally as the workflow runs it (`ci/comment.mjs --no-project --max-functions 40 --out`, no `--post`):
- before: `13 changed function(s) (2 nested in another, carrying its verdict): **0 in scope · 3 WITNESS · 2 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 6 ASK · 0 REFUSE · 0 NEW**`
- after: `7 changed function(s) (2 nested in another, carrying its verdict): **0 in scope · 3 WITNESS · 2 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**`

## Pull request #1, the lean diff itself (3ef57e07 to 6c54f2fd)

The after run shows **0 changed functions and 0 ASK**. All five edits are in intake.
- The workflow file stays `artifact:config`.
- The pair file's added line is a comment, so it is now `unassigned:comment`, inert. Before, it was `artifact:test`.

Before (master), verbatim to the legend:
```
# lean report: 3ef57e07700d717058754412f2ca9065660b914e → 6c54f2fdac56deac3a89ead79cb73b5563794145

Identity: c294c4b28cacedcca0e017dac1a129e90807e0426fa66be0890e1f12bda4d0e9; lean unknown (no git history for this copy of lean); sources sha256 e9fb5d1f49f851a17268e82b522e6a2696b00c63be9500e146c2f6c977119d77

5 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 5 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| .github/workflows/lean-self.yml | `(edits from 1b190ed4d013 artifact:config)` (3-4) | **ASK** | artifact:config |  |  | config |
| .github/workflows/lean-self.yml | `(edits from 7e0dcc254d2c artifact:config)` (32-36) | **ASK** | artifact:config |  |  | config |
| .github/workflows/lean-self.yml | `(edits from b1ca096ea17a artifact:config)` (34-42) | **ASK** | artifact:config |  |  | config |
| .github/workflows/lean-self.yml | `(edits from 2cc8ad2a914d artifact:config)` (44-44) | **ASK** | artifact:config |  |  | config |
| langs/ts/tests/pairs/readme_ledger/candidate.ts | `(edits from 1fca51543d52 artifact:test)` (1-1) | **ASK** | artifact:test |  |  | test |
```
After, verbatim to the legend:
```
# lean report: 3ef57e07700d717058754412f2ca9065660b914e → 6c54f2fdac56deac3a89ead79cb73b5563794145

## Intake

| file | unit | coverage | decision | reason |
|---|---|---|---|---|
| `.github/workflows/lean-self.yml` | (edits from 1b190ed4d013 artifact:config) | artifact:config | artifact | config |
| `.github/workflows/lean-self.yml` | (edits from 7e0dcc254d2c artifact:config) | artifact:config | artifact | config |
| `.github/workflows/lean-self.yml` | (edits from b1ca096ea17a artifact:config) | artifact:config | artifact | config |
| `.github/workflows/lean-self.yml` | (edits from 2cc8ad2a914d artifact:config) | artifact:config | artifact | config |
| `langs/ts/tests/pairs/readme_ledger/candidate.ts` | (edits from 1fca51543d52 unassigned:comment) | unassigned:comment | unassigned | comment |

## Verdicts

Identity: c294c4b28cacedcca0e017dac1a129e90807e0426fa66be0890e1f12bda4d0e9; lean b713222140c0223f102da65451cc1457ff205f57

0 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
```

## Tests and mutation evidence

New test `testCommentOnly` in `langs/ts/tests/fixtures/pr-intake/test.mjs`, inside the existing pr-intake suite row. It uses the fixture `langs/ts/tests/fixtures/pr-intake/comment-only/`.
- The fixture: one changed function `bump`, a config artifact `app.config.json`, a `/// <reference>` change, a changed `//` line of a template literal, a block comment's inside line, a line comment added, a comment above a class, a comment between two methods, and a blank line.
- The two tree cases come first: the template line is `unassigned:module-level statement` and is not inert. The block comment's inside line is `unassigned:comment` and is inert.
- Then: 5 inert groups, unassigned, verdict null. Three undecided intake rows keep ASK in the data.
- The verdict table holds `bump` only. `markdown`, the plain run and `comment.mjs` all say "1 changed function(s) … 0 ASK", and the intake table lists all eight intake rows.
- Under `--block ask`, exactly the config file, the directive and the template line block. No inert row blocks.

Red before, on master code with the new test:
```
RED: a `//` line of a template literal is code; a line inside /* */ is comment + actual - expected [ [ + 'unassigned:comment', - 'unassigned:module-level statement', false ], [ + 'unassigned:module-level statement', + false - 'unassigned:comment', - true ] ]
```
The first version of the test (inert flag only), also red on master:
```
RED: every edit that changes no token outside comments and blank lines is an intake-only row + actual - expected + [] - [ - [ - 'unassigned:comment', - [ - 16, - 17 - ] - ], - [ - 'unassigned:comment', - [ - 2, - 2 - ] - ], - [ - 'unassigned:comment', - [ - 24, - 24 - ] - ], - [ - 'unassigned:comment', - [ - 8, - 9 - ] - ], - [ - 'unassigned:whitespace', - [ - 16, - 16 - ] - ] - ]
```

Each mutation was made on the change, run, then restored. Each one is red:

| mutation | result |
|---|---|
| `verdictRows` drops only inert rows | RED: the verdict table holds the config, directive and template rows beside `bump` |
| `verdictRows` drops nothing | RED: every intake row is in the verdict table |
| directive comments read as inert | RED: the reference edit joins the inert groups |
| inert rows keep ASK and no flag | RED: the block comment's inside line is not inert |
| the old line scanner instead of the tree | RED: the template line turns inert, the block comment's inside line does not (run on the first commit) |

Green after, run from the worktree:
- `tests/fixtures/pr-intake/test.mjs`: PASS, the new test plus the existing 7-row intake test
- `ci/ledger.test.mjs`, `ci/ledger-failures.test.mjs`, `ci/comment.test.mjs` (46 of 46), `ci/report.test.mjs`, `ci/supervise.test.mjs`, `ci/worktree.test.mjs`, `tests/pairs/callback_units/markdown.test.mjs`: pass
- the runtime rows that read pr.mjs, `tests/no-silent-exit-importers.mjs` and `tests/bin-lean.mjs`: pass
- `node langs/ts/tests/run.mjs --pair readme_ledger`: 15 checks, ALL PASS
- `node scripts/readme-check.mjs`: 16 checks, 0 failed
- `run.mjs` has no `--only runtime` flag, so I ran the runtime scripts that read pr.mjs directly.

## What is left

- `comment.mjs` (values-line touches it, I did not) still counts intake rows toward `--max-functions`. Rows are ordered units first, so the cap never hides a function.
- `markdown` on a bare array (a preview's JSON read back) prints "Values: undefined…", because `rows.values` resolves to `Array.prototype.values`. This belongs to `lane/values-line`. The new test sets `values: null`.
- A verdict table with no function prints its header and no rows. The intake table above it carries the change.
- JSX text counts as compiled text, blank space included. A whitespace edit inside JSX stays undecided, which is the safe side.
- Benchmark cohorts that count reasons will see the new classification. A comment in a test or config file is now `unassigned:comment`, no longer `artifact:<class>`.

## Every element added, and why

- **`ci/ledger.mjs` `treeReading`, `tokenIn`, `meets`:** the parse tree's tokens and compiler-read comment spans, read once per file side. The inert decision comes from what the compiler parsed, never from a scanner started at a line, which had the two holes above.
- **`ci/ledger.mjs` `syntaxContext`:** inert when no token meets the span, else `directive comment` when a compiler-read comment does.
- **`ci/ledger.mjs` routing branch:** inert edits outside units become `unassigned` with `inert: true`, before the language and class routes. This decides it once, in the intake.
- **`ci/ledger.mjs` `ledgerRows`:** an inert group gets verdict null and `inert: true`. It owes nothing and never blocks.
- **`pr.mjs` `intakeRow`, `verdictRows`:** only function rows enter the verdict table and its counts. The run metadata stays on the array, and the data keeps each intake row's ASK.
- **`pr.mjs` `reportMarkdown`, used by the plain run:** intake table, then verdicts, as the comment does. Without it, the edits would leave a plain run's output.
- **`tests/fixtures/pr-intake/build.mjs` `sides` option:** builds a second fixture folder with the same builder.
- **`tests/fixtures/pr-intake/comment-only/` and `testCommentOnly`:** the red-then-green test, including the two tree cases and an artifact row.
- **`design/admission-contract.md`:** a dated section stating both rules.
