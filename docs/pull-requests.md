# Pull requests and CI, in full

The README shows one pull request and its table. This page keeps the rest: what each column says, the intake preview, budgets, verdict reuse across pushes, and the CI comment and block. Every output below is a real run of this checkout on the booking example ([`../examples/booking/`](../examples/booking/)), commit `85136f1`: one asked rule (percent promotions capped at half the unit price), one slip (`>=` became `>` in the free-delivery test), two refactors that keep behaviour.

<p align="center"><img src="pull-request.svg" width="100%" alt="A pull request becomes one table: intake, cache, check, one comment and an optional blocking check"></p>

## The table

```
$ node langs/ts/pr.mjs --repo . --base 85136f1~1 --head 85136f1 --scope unitDiscount
```

> 4 changed function(s); 5 unchanged caller(s) checked through lane B, 2 with a WITNESS through a changed callee: **1 in scope · 3 WITNESS · 1 PASS-proved · 0 PASS-decided · 1 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| examples/booking/pricing.ts | `unitDiscount` (35-46) | **IN-SCOPE** | checked | PASS-bounded |  | declared in scope but no difference found within the bound |
| examples/booking/pricing.ts | `deliveryFee` (57-60) | **WITNESS** | checked | WITNESS |  | input 11: outcome; examples/booking/pricing.ts:59 |
| examples/booking/pricing.ts | `formatCents` (101-109) | **PASS-proved** | checked | PASS-bounded | PASS-proved |  |
| examples/booking/service.ts | `cleanCart` (26-36) | **PASS-bounded** | checked | PASS-bounded | ASK:identity |  |
| examples/booking/pricing.ts | `quoteShop` (62-74) | **WITNESS** | checked | WITNESS |  | input 0: through deliveryFee (changed; its own row is WITNESS), unitDiscount (changed; its own row is IN-SCOPE); this function's text is unchanged; examples/booking/pricing.ts:73 |
| examples/booking/pricing.ts | `quoteAll` (76-83) | **WITNESS** | checked | WITNESS |  | input 52: through deliveryFee (changed; its own row is WITNESS), unitDiscount (changed; its own row is IN-SCOPE); this function's text is unchanged; examples/booking/pricing.ts:82 |

Reviewers read the declared scope and the asks, not the diff. A function nobody touched is still in the table when a function it calls changed, with the callee named. A `WITNESS` names the statement on each side that produced the first differing effect or the return (`witness.where.lines`, with the file, the lines and the text), and carries the lint's advice when its table has an entry at that statement, so a reader or an agent goes to the line, not to the diff. **Scope is optional and declared, never inferred:** without it every difference is a `WITNESS`; with it a function named as meant to change reports `IN-SCOPE` with its lane B result, information rather than a finding. The producer of a change is never consulted.

## Every changed function has a row

The `coverage` column says what lean did with it: `checked` (a verdict exists), `refused:<rule>` (the lint's first rule; lane B's verdict is kept in the row), `failed:loader`, `failed:timeout`, `failed:translation-defect` or `failed:harness` (no usable verdict), `skipped:not-typescript`, `skipped:binary` or `skipped:secret-path` (never read: `.env`, keys, certificates). The intake is one pure function, `selectUnits`, used by the run and by `--preview`, which prints the intake table and runs no lane:

```
$ node langs/ts/pr.mjs --repo . --base 85136f1~1 --head 85136f1 --preview
| file | unit | coverage | decision | reason |
|---|---|---|---|---|
| `examples/booking/pricing.ts` | unitDiscount | pending | check | selected for checking |
| `examples/booking/pricing.ts` | deliveryFee | pending | check | selected for checking |
| `examples/booking/pricing.ts` | formatCents | pending | check | selected for checking |
| `examples/booking/service.ts` | cleanCart | pending | check | selected for checking |
```

## A run stops by name, never by a kill

`--time-budget <seconds>` and `--unit-budget <n>` bound the whole run. The spending order is fixed and written into the report (changed functions, then unchanged callers of changed callees); a function not reached gets `skipped:budget` with its position; the report carries `stop: { reason, reached, total }`; the comment's block rule treats a stop as not green:

```
$ node langs/ts/pr.mjs --repo . --base 85136f1~1 --head 85136f1 --scope unitDiscount --unit-budget 2
# lean report: 85136f1~1 → 85136f1; stopped: unit-budget after 2 of 9 units
| examples/booking/pricing.ts | `formatCents` (101-109) | **** | skipped:budget |  |  | stop at unit 3 of 9 |
```

## A push re-checks only what changed

The report carries a run identity (the two commits, the function set, lean's own commit, the library and advice tables, the Dafny version), and each function a key over its two texts, its same-file callees, the file outside its functions, the files it imports and the tsconfig. A certificate under the cache directory is reused when the key matches, with the row marked `reused`; `--fresh` reads no cache. On the booking pull request, the second run reuses all six rows:

```
$ node langs/ts/pr.mjs --repo . --base 85136f1~1 --head 85136f1 --scope unitDiscount --cache-dir <dir> --out pr.md   (twice)
first run:   6 function(s) -> pr.md    real 23.72 s
second run:  6 function(s) -> pr.md    real 7.79 s; 6 rows reused; the same identity 8ec314c5…
```

The key stops at one import level and does not see module initialization order.

## In CI

[`langs/ts/ci/comment.mjs`](../langs/ts/ci/) posts the table as one comment, updated on every push, and the reusable workflow [`.github/workflows/lean-pr.yml`](../.github/workflows/lean-pr.yml) runs it from a caller of a few lines, pinned by commit. `--block none` only comments; `--block witness` fails the check on any `WITNESS` row; `--block ask` fails on `WITNESS` or `ASK`; a row declared `IN-SCOPE` never blocks; each blocking row is annotated at its file and line. The workflow has been validated offline and has not yet run on a GitHub runner ([`langs/ts/design/ci.md`](../langs/ts/design/ci.md) keeps that status current).

The order that works: a shadow run on the last few dozen merged pull requests, nothing blocking, reading three things (the share of `ASK` and the rules behind it; whether a `WITNESS` lands on a slip that reached production; how often the changed function was the one meant to change). Then a comment on new pull requests. Then the editor rule on new code. `WITNESS` blocking last.

`--block witness` fails the check on a `WITNESS` row and annotates it at its line; `IN-SCOPE` never blocks. Every refusal of a run is also a JSON record in `.lean/runs/<identity>.refusals.json`, and `--inline` posts each as a review comment at its lines, skipping a range that already carries one ([`langs/ts/design/ci.md`](../langs/ts/design/ci.md)).
