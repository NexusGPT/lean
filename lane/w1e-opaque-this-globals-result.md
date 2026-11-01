# Lane w1e-opaque-this-globals: result (2026-11-01)

Branch `lane/w1e-opaque-this-globals`, cut from lead-vm 4747022f. Design note: `langs/ts/design/w1e-opaque-this-globals.md`.

## What changed

- `this`: an arrow callback under an instance member reads the member's receiver through any arrows between
  (common.mjs `receiverScope`, lint.mjs callback loop). The census shape: `rows.map((r) => this.toDto(r))`.
- `ts-strict` TS2339/2551 on a member of a type whose declaration reaches the error type (an unknown base): read as the
  accessor of the opaque value (the reading `unsupported-member` already had); a write stays refused.
- `global-read` / environment: a global nothing declares (the checker's error type) is the world value keyed by its
  name, read at Any (lint.mjs `unresolvedGlobal` through `libGlobalRoot`); the census grades its unit (`handle: true`)
  instead of setting it aside, and counts `environment.handles`.
- `toplevel-effect`: a module let/var with an effectful initializer is a world cell like any module let (keyed by its
  declaration text); the initializer is the module's load-time effect.
- Stays refused by design: `super` as a value, static `this` with a destructured parameter, a function expression's own
  `this`, `implicit-this`, `class`, `inheritance`, global assignment, `toplevel-state`, executable module statements, the
  React rules. No opaque step is added by this lane (opaque fraction 0 for every unit it lets enter, A5).
- Found on the way, fixed:
  - tests/stepcache.mjs: `LEAN_BREAK` and `LEAN_WITHDRAW` were not in the cache key, so every `--break` run replayed
    the green result. They are now part of the producer hash. Every lane's A6 break needs this.
  - translate.mjs `externalCall`: a tagged template inside `try` crashed the translator (`n.expression` of a tagged
    template is undefined; its callee is `n.tag`). The incomplete-member reading made `this.prisma.$queryRaw\`...\``
    reachable; fixture `tests/translator-crash-fixtures/tagged-template-in-try.ts`, red on the base.

## Pairs and breaks

| pair | checks | breaks (each must turn the pair red) |
| --- | ---: | --- |
| opaque_this | 20 | lexical-this (proved callback rows lose their lemma), held-key (soundness row (e): unchanged callback, same-file callee changed at x === 7919, proved falsely) |
| opaque_global_read | 11 | unresolved-global |
| opaque_ts_strict | 5 | incomplete-member |
| opaque_toplevel_effect | 8 | effectful-cell, cell-key (soundness row jitter: initializer changed outside the unit, proved falsely) |

- `node langs/ts/tests/w1e-opaque-this-globals.mjs`: every pair green.
- `node langs/ts/tests/w1e-opaque-this-globals.mjs --break`: every break turns its pair red (6 runs). It is the suite's
  runtime row `w1e-breaks` (PASS in the full suite).
- `LEAN_PAIRS=opaque_this,opaque_global_read,opaque_ts_strict,opaque_toplevel_effect node langs/ts/tests/run.mjs`:
  898 checks, ALL PASS.
- `LEAN_PAIRS=<same> node langs/ts/conformance/run.mjs --jobs 2`: 28 units in 4 pairs, 6 executable, 6 agree,
  0 disagree, NO NEW FINDING.
- Full suite, `JOBS=4 node langs/ts/tests/run.mjs` at 16b2ca44 (started 05:48, load 40.2): 5,133 checks, ALL PASS.
  After the tagged-template fix (3be84290): `node langs/ts/tests/translator-crashes.mjs` passes, and
  `LEAN_PAIRS=heap5_template,stage4_corrections,template_literals,opaque_ts_strict node langs/ts/tests/run.mjs`: 898 checks, ALL PASS.
- `node langs/ts/lower.mjs --audit`: 600 sites, 0 uncatalogued; the table in admission-contract.md regenerated (no new
  decision site: the rows equal the base's but for line numbers).

## Census (A8: nexus, then nexus-landing)

Base = `git archive 4747022f` extracted to scratch; after = this branch (3 commits before the tagged-template fix:
the census ran at 16b2ca44). Commands, from /tmp/w1e-census:

    NODE_OPTIONS=--max-old-space-size=12288 node <tree>/langs/ts/census.mjs /root/da/census/repos/<root> --out <tag>.json --report <tag>.md
    # with the install: the root copied to /root/census-installs/w1e/<root>, installed once, then
    NODE_OPTIONS=--max-old-space-size=12288 node <tree>/langs/ts/census.mjs /root/census-installs/w1e/<root> --install-under /root/census-installs/w1e --out <tag>.json --report <tag>.md

The read-only copy /root/da/census/repos/nexus already holds a node_modules installed 2026-10-29 (its stamp: pnpm@10.33.0,
exit 0), which the run without `--install-under` reads too; the copy under /root/census-installs/w1e reused that stamp.
The default 4 GB heap is not enough for nexus: both first runs died (heap OOM) after 7,200 of 12,733 files.

### Without the install

| root | units | entered base → after | environment-blocked base → after | language-refused base → after | handle units (entered) |
| --- | ---: | --- | --- | --- | --- |
| nexus | 43,949 | 22,896 → 24,058 (+1,162; 52.1% → 54.7%) | 283 → 320 (+37) | 12,738 → 11,630 (−1,108) | 16 (4) |
| nexus-landing | 2,746 | 989 → 1,047 (+58; 36.0% → 38.1%) | 400 → 343 (−57) | 723 → 730 (+7) | 93 (47) |

Per rule, units stopped, base → after (nexus / nexus-landing): `ts-strict` 2,199 → 178 / 150 → 150; `this` 268 → 1 /
0 → 0; `toplevel-effect` 12 → 0 / 0 → 0; `global-read` 26 → 26 / 1 → 1; `react-handler-capture` 73 → 73; `hook-order` 9 →
9; the other rules of the family 0 → 0. Environment kinds: nexus `global-lib` 14 → 0, `global-types` 3 → 0, `workspace`
116 → 167; nexus-landing `global-types` 84 → 0, `global-node` 6 → 0, `lockfile` 303 → 336.

On nexus the environment-blocked count rises (+37), against the done-when. The rise is re-attribution: units
`ts-strict` stopped (counted language-refused) now stop on a refusal judged on a value whose import does not resolve
(unresolved-type 213 → 266, `environment: workspace` +51), which the census counts as environment-blocked. Those units
were refused before and are refused now; only the bucket changed. The units that read an unresolved global (global-lib
and global-types, 17) all left the environment bucket. On nexus-landing, where unresolved globals dominate, the count falls by 57.

Units newly graded reach the next rule they meet (nexus): read-after-call +400, copied-argument +358, type-assertion
+323, closure-mutation +21, spread +15; translator-crash 2 → 7. Five of the crashes are the tagged-template shape
fixed in 3be84290; the other two (useLocalStorage.ts, `Maximum call stack size exceeded`) do not reproduce in a
standalone `lower.mjs` run (open).

### With the install

| root | entered base → after | environment-blocked base → after | language-refused base → after |
| --- | --- | --- | --- |
| nexus-landing | 1,503 → 1,503 | 0 → 0 | 732 → 732 |
| nexus | NEXUS_INST |

## Open

- w1a's `tests/break.mjs` has not landed. The breaks read `LEAN_BREAK` through lint.mjs `mechanismOff`, the one
  reader, which moves into break.mjs on rebase.
- No keying break for the global-read and ts-strict families: their soundness rows rest on the world threading every
  read and on the member's name in its accessor, both shared by every reading.
- nexus-landing `app/dieteren-workshop/scene.ts` (12,213 lines) takes the lint minutes (each landing run 5,800–6,200 s,
  base and after alike).
- The two stack-overflow crashes above.
- A5's mutant study (w3b) on the units this lane lets enter is w3b's.
- Load discipline: the census driver started at a one-minute load of 45 (above 40) at 05:56 and was not restarted.
