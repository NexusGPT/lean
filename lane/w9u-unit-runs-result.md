# Lane w9u-unit-runs (lean): the seven easy-set units lean never finished

Branch `lane/w9u-unit-runs`, from `lead-v4` e1aca32fe2. Mechanism commit 2bf031153c. No model anywhere.

## The number

`round 1: rendered 1 of 7` (before, lead-v4 e1aca32fe2, the same command: `rendered 1 of 7`; s75-feb9fb51-da8-1: 0 of 7).

The rendered count does not move on this bench. Checkmate#3797~m2 is the only one of the seven with a parent. It already renders before, because the brief's command gives lean 900 s (pr.mjs budget 450 s) on a quiet machine: it finished at 193 s. In s75 (the 75-side run, loaded) it took 472 s and stopped at its budget. The other six are units the PR itself adds (see "What is open"), so with no parent lean can only say NEW.

What moved, measured (hour.md of w9u-before and w9u-1, the same 10 sides):

| | before (e1aca32fe2) | after (2bf031153c) |
|---|---|---|
| hour line | `e1aca32fe2 M rendered 1 of 7 (14.3 %), record 1 of 7, completed 7 of 7, wall 32.0 min` | `2bf031153c M rendered 1 of 7 (14.3 %), record 1 of 7, completed 7 of 7, wall 5.8 min` |
| lean wall summed over the 10 sides | 3578 s | 447 s |
| cline#13799 (PR, m1, m2, m3) lean wall | 772, 772, 751, 746 s | 65, 65, 70, 70 s |
| Checkmate#3797 (PR, m2) lean wall | 192, 193 s | 13 s each |
| three.js#35267 m1-m3 row | NEW refused:translator-crash | NEW checked |
| Checkmate#3797~m2 row | WITNESS (193 s) | WITNESS (13 s) |
| cline#13799 m1-m3 row | ASK failed:loader (s75: ASK failed:timeout) | ASK failed:loader |

## What landed

1. **w9u-units-lint** (pr.mjs changedUnits). Under `--units`, pr.mjs linted and phase-4 translated every routed unit of every changed file. Only after that did selectUnits drop the units the list leaves out. Those units get no task and no row, so the work was wasted. Now an unlisted unit is named with its lines (the callers step and the typed reading still read its name) and is never linted.
   - Checkmate#3797: one 51-line unit was asked for. The PR also changes server/test/unit/services/statusService.test.ts (1386 lines), and 322 s went to its 156 callback translations (measured alone: `lower ms 321728`; 88 programs created). pr.mjs on m2 went from 343 s to 21.7 s, WITNESS either way.
   - cline#13799: the PR changes many sdk files. pr.mjs on the PR with `--units …::request`: 64.2 s with the mechanism, 771.7 s with `LEAN_BREAK=w9u-units-lint`, same row. That 772 s is the timeout s75 hit at its smaller budget.
2. **jsdoc-unnamed-param** (translate/translate.mjs collectAssertionWrites). A call resolved to a JSDoc function type (three.js PointShadowNode.js: `@return {function(Node<vec3>):Node<float>}`) has a declaration whose parameters bind no name. The file-wide scan for writes into asserted bindings read `p.name` (undefined), and TypeScript's isObjectBindingPattern threw. The scan covers the whole file, so every unit of such a JavaScript file was refused translator-crash, not only the caller. In the pair, `doubled`, which calls nothing, loses its proof under the break. An argument handed to an unnamed parameter is written to no binding, so it is now skipped.

## Validators (verbatim)

`node tests/w9u-unit-runs.mjs` (exit 0):
```
ok   pair w9u_jsdoc_function_type: 2 checks, 0 failed
ok   changedUnits --units lints the listed units only: spans linted 1 (want 1), units named f1,f2,f3 (want f1,f2,f3), f1's findings as when every unit is linted [["f1",[["non-null-assertion",1]]]]
every check green
```
`node tests/w9u-unit-runs.mjs --break` (exit 0: each check red under its break):
```
ok   pair w9u_jsdoc_function_type (LEAN_BREAK=jsdoc-unnamed-param): 2 checks, 2 failed
     | pair | w9u_jsdoc_function_type | pr index.js tripled WITNESS checked | FAIL | | WITNESS | refused:translator-crash | the translator stopped: Cannot read properties of undefined (reading 'kind')
     | pair | w9u_jsdoc_function_type | pr index.js doubled PASS-proved checked | FAIL | | PASS-bounded | refused:translator-crash | the translator stopped: Cannot read properties of undefined (reading 'kind')
ok   changedUnits --units lints the listed units only (LEAN_BREAK=w9u-units-lint): spans linted 3 (want 1), units named f1,f2,f3 (want f1,f2,f3), f1's findings as when every unit is linted [["f1",[["non-null-assertion",1]]]]
every break turns its check red
```
Regression pairs (`node tests/run.mjs --pair <p>`, each exit 0):
```
opaque_dynamic-key exit 0 : | TOTAL | 9 checks | ALL PASS |
opaque_exception-return exit 0 : | TOTAL | 7 checks | ALL PASS |
opaque_optional-chain exit 0 : | TOTAL | 9 checks | ALL PASS |
opaque_unsupported-call exit 0 : | TOTAL | 11 checks | ALL PASS |
opaque_unsupported-syntax exit 0 : | TOTAL | 9 checks | ALL PASS |
type_assertions exit 0 : | TOTAL | 45 checks | ALL PASS |
w9q_regex_literal_brace exit 0 : | TOTAL | 2 checks | ALL PASS |
w9u_jsdoc_function_type exit 0 : | TOTAL | 2 checks | ALL PASS |
```
`node tests/opaque-unit.mjs --break`: `opaque-unit --break exit 1`.
`node tests/w9f-n8n-gate.mjs` (the neighbouring changedUnits checks, exit 0): `w9f-n8n-gate: 7/7; --break w9f-typed-reuse reuse red; --break w9f-typed-first first red; --break w9f-lint-routed lint-routed red; --break w9f-lint-once lint-once red`.
`node tests/break.mjs`: exit 0 (both new names registered).

Runs: `/root/da-bench/hour/w9u-before`, `/root/da-bench/hour/w9u-1` (logs `/root/da-bench/w9u-unit-runs/`). Both were run with the brief's command at `--jobs 2` under `nice 15` (the owner's rule for runs without the lock).

## What is open

- **Six of the seven are new code, not translator or fake defects.** `getPointShadowDepthFn` is absent at the merge base 4c39d071 (it appears in the PR head 15a7dfa1). `apps/vscode/scripts/repro-cloud-session.mjs` is absent at 29896ec7 (`git show` fails: "exists on disk, but not in"). The mutants run merge base → mutant, so there is no parent and lean's verdict is NEW (three.js, now `checked`). DA reads no new-unit record, so nothing renders. No change in lean can make these WITNESS without a parent. That would need the bench to compare a mutant against its PR head, which is a DA/bench decision, not this lane's.
- **cline `request`'s row is ASK failed:loader.** The script's top level awaits `request("/api/v1/session")`, and the fake answers 404, so the top level throws at module evaluation. lean does finish the unit now (a terminal row, not a timeout). Reaching the hoisted `request` after a failed evaluation would still give NEW only, so I did not build it.
- **The s75 conditions are not re-measured.** At the 75-side run's budget and load, Checkmate m2 (472 s → about 13 s) would go from budget-stop to WITNESS, but I measured that only on the 10-side bench here.
