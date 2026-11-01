# w4a-convert-mutation: result (2026-11-01)

Branch `lane/w4a-convert-mutation`, cut from lead-vm 4747022f. Design: `langs/ts/design/w4a-convert-mutation.md`, and a
dated section appended to `langs/ts/design/converter.md`.

## What landed

- Five transforms under `langs/ts/convert/`, each applied behind `--narrowed` and kept only when the proof passes:
  `closure-counter.mjs` (captured-mutable, closure-mutation), `hoist-update.mjs` (update-expression,
  assignment-expression, operator-value-context, in-place-mutation), `rebuild-by-spread.mjs` (param-mutation),
  `param-copy.mjs` (param-assign), `explicit-return.mjs` (bare-return, proved by erasure). Each one's guard is decided
  on the syntax tree and the checker's types, and each header names what lane B cannot see.
- Where the brief's shape differs from what was built, and why (the current lint already reads the brief's shape, or
  the brief's rewrite changes behaviour): see the design note, "What was measured first". In short:
  - param-copy copies the binding (`let p = pArg`), not the value. Lane B compares the arguments after the call, so
    `p = { ...p }` changes behaviour wherever the change runs.
  - explicit-return widens the declared result. Under strict mode, `return undefined` is the same TS2322.
  - rebuild-by-spread rebuilds the array a container holds. Owned records are already updated in place.
- `convert/util.mjs`, additive only: `castOnPath`, `ARRAY_CALLBACK_METHODS`, `inlineArrayCallback`, `tryBetween`.
- `lint/advice.mjs`: every entry a transform rewrites carries `transform: '<file>'`, for all 20 entries across the 18
  transforms. Two new entries, `captured-mutable` and `operator-value-context`, keep the label the lint already gave
  them (migration).
- `convert.mjs prove`, two fixes to the control. The measurement found both; they are not about the rewrites:
  - `judgedByOwner`: a nested row is judged by the enclosing unit whose verdict pr.mjs copied into it. A callback the
    rewrite renamed is absent at the parent, and apps-ui `BoardCanvas.tsx` was reverted on an ASK the enclosing unit
    shares with the parent.
  - `sameReason`: lane B reasons are compared up to the names of lean's own copies (`.lean_<side>_<pid>_<file>`).
    driftbench `tools/docs/check-links.ts` was reverted on a load failure both sides share.
- `tests/run.mjs`: the convert section counts PASS-erased as a pass, and a new runtime row `convert-mutation` runs the
  advice check and the guards.
- No decision site was added to lint.mjs or translate.mjs, so the audit table is unchanged.
- The 44 AACR instances were not read.

## Tests

| command | result |
|---|---|
| `node langs/ts/tests/convert_mutation.mjs` | all passed: advice table check, 2 prove-control checks, 5 fixtures × 3 (before→after exact; after proves: closure-counter 11 PASS-bounded, hoist-update 4, rebuild-by-spread 3, param-copy 3, explicit-return 1; wrong is a WITNESS: topOf, labelOf, byLength, positiveSum, find/weightOf), 5 guards refuse, 4 unguarded rewrites are WITNESS |
| `node langs/ts/tests/convert_mutation.mjs --break` (the five transforms removed) | 5 failed: every fixture stays as it was |
| red first | the first run found that param-copy's default guard did not hold (`w = v` passed; contains() skips the root); fixed |
| `LEAN_PAIRS=callback_units,array_callback_cells,mutation,bare_return_void,library_assign_sort JOBS=2 node langs/ts/tests/run.mjs` | 920 checks ALL PASS (the convert section includes the five new fixtures; convert-mutation row PASS); re-run at the final head after the two prove fixes: 920 checks ALL PASS, and convert_mutation.mjs all passed / --break 5 failed |
| `LEAN_PAIRS=<same five> node langs/ts/conformance/run.mjs --jobs 2` | 25 units in 5 pairs, 13 executable: 9 agree, 4 disagree (known), NO NEW FINDING |

## Measured on copies of census roots

The roots were copied to `/root/census-installs/w4a/<root>`, git-committed and installed by the census. Candidate files
are the files whose baseline census record has a finding of the nine rules; on any other file the five transforms plan
nothing.

1. The converter's own dry run, every transform, `--narrowed` (`node langs/ts/convert.mjs <candidate files> --narrowed --dry-run --json cli-dry-<root>.json`). Sites applied:

| root | files | with a site | closure-counter | hoist-update | rebuild-by-spread | param-copy | explicit-return | (others: foreach, nested-ternary, function-value, map-bucket, record-spread, strict-annotate) |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| apps-ui | 48 | 19 | 7 | 4 | 0 | 0 | 0 | 23, 15, 3, 1, 0, 0 |
| driftbench | 97 | 65 | 1 | 28 | 1 | 0 | 0 | 95, 30, 16, 0, 1, 2 |
| nutshell | 192 | 31 | 0 | 15 | 2 | 0 | 0 | 15, 9, 12, 2, 0, 0 |

2. The five transforms only, applied and proved as convert.mjs proves
   (`node lane/w4a-convert-mutation-measure.mjs <copy> --files files-<root>.txt --out measure-<root>.json`, n 30,
   Dafny 30 s). The table shows sites applied / files kept / files reverted:

| transform | apps-ui | driftbench | nutshell | langchainjs (4 files with param-assign) | total |
|---|---|---|---|---|---|
| closure-counter | 7 / 2 / 0 | 1 / 1 / 0 | 0 / 0 / 0 | 0 | 8 sites, 3 files |
| hoist-update | 4 / 4 / 0 | 30 / 17 / 0 | 15 / 14 / 0 | 0 | 49 sites, 35 files |
| rebuild-by-spread | 0 | 1 / 1 / 0 | 2 / 2 / 0 | 0 | 3 sites, 3 files |
| param-copy | 0 | 0 | 0 | 6 / 4 / 0 | 6 sites, 4 files |
| explicit-return | 0 | 0 | 0 | 0 | 0: no bare-return finding on these roots under the current lint |
| files converted / reverted | 5 / 0 | 19 / 0 | 16 / 0 | 4 / 0 | **44 converted, 0 reverted** |

   - The first proof reverted 2 of 44 files (4.5%): apps-ui BoardCanvas.tsx and driftbench check-links.ts. Both were
     control artifacts (the two prove fixes above). Each file was re-proved with the fix and kept, with the commands
     above and `--files` naming that one file.
   - The listed sites' reasons are in `lane/w4a-convert-mutation-measure/measure-<root>.json` (with the candidate lists `files-<root>.txt`). The largest classes:
     - callbacks handed away (`.then`, `on(...)`, timers), which are not loops;
     - a forEach callback that takes an index (lean reads a reduce callback of two parameters only);
     - a callback carrying two or three locals;
     - Map, Set and delete mutations of an outer container.

3. Census on the converted copies against the census before
   (`node langs/ts/census.mjs <copy> --install-under /root/census-installs --out census-<root>-{before,after}.json`):

| root | units | entered before | entered after | gain | units read by the lowering, before → after | units lost |
|---|---:|---:|---:|---:|---:|---|
| apps-ui | 2,361 | 1,048 | 1,050 | +2 | 1,703 → 1,709 | none (3 renamed callbacks) |
| driftbench | 5,479 | 2,512 | 2,534 | +22 | 4,027 → 4,035 | none (1 renamed callback) |
| nutshell | 10,511 | 6,156 | 6,179 | +23 | 7,666 → 7,676 | none (2 renamed callbacks) |
| **three roots** | 18,351 | 9,716 | 9,763 | **+47 (52.9% → 53.2%)** | 13,396 → 13,420 | none |

   - The census counts a nested unit as entered only when its enclosing unit is. So a callback that becomes readable
     inside a function refused for another reason is counted in the lowering column only, as with apps-ui's
     flowLayout.
   - A callee that enters lets its callers enter too, which is why driftbench gains more units than sites.
   - langchainjs: the census ran out of heap after 1,168 of 1,486 files, so it is measured per unit instead
     (`node lane/w4a-convert-mutation-lowerdiff.mjs <copy> <files>`, HEAD against the working tree, with the project). In the 4 converted files,
     entered stays 6 → 6: the units param-copy reaches are refused for other reasons.

## Open

- closure-counter's main residual: a forEach callback that reads its index (driftbench 45 sites, apps-ui 10). A reduce
  callback with an index is refused by lean's callback-form, so this needs either that reading or a counted loop
  (foreach.mjs's guard).
- Callbacks carrying two or three locals (flowLayout) need a record accumulator.
- explicit-return has no site on the four roots under the current lint, and param-copy kept 4 files with no gain. Their
  fixtures and guards stand.
- The converter builds a program per file per round (about 5–20 s a file under load), so a whole root needs the
  candidate filter.
