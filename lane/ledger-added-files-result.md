# ledger-added-files: result (2026-10-31)

Branch `lane/ledger-added-files` from lean `lead-09032a59` (09032a594).

## Commits

- `684c246c9`: the red rows. `ci/ledger.test.mjs`: an added file's statements are its module unit's (side `new`), a
  deleted file's are too (side `old`, its function still its own), no unassigned row in either. `module_scope`: five
  rows reading a namespace import's member (`spaced`, `tagged`, `routed`, `joined`, `grown`).
- `a46c1807c`: rule 2. `common.mjs importMemberIdentity` gives the binding a namespace member denotes: the declaring
  module and the name there, read through every re-export. It is the identity `importIdentity` gives `import { X }`, and
  both use one helper, `declaredIdentity`. `translate/heap.mjs`: `ns.X` of a primitive shape is an imported constant
  `Imp_X_<identity>`, and `ns.f(..)` is the transition `Call_f_<identity>..`, keyed as a named import is.
  `design/heap-stage5.md` 9c, and a line on the COVERAGE.md section 7 row.
- `2e3382218`: rule 1. `ci/ledger.mjs` routes an evaluated edit outside every listed unit to `(module)` on the side
  that has the file; it no longer needs both trees. `pr.mjs`: a deleted file's module unit is a removed row beside its
  removed functions. An added file's module unit is checked, and lane B gives NEW (`exec/run.mjs newModuleUnit`: n
  seeded evaluations of the candidate alone in the bounded worker, recording the outcome with the last statement
  entered when it threw, plus the shape of the requests and armed work; no equality claim). `parentHolds` sends every
  module unit to the worker. pr-intake fixture: `head/added.ts`. `tests/ci/refusals.test.mjs`: 7 rows, and the NEW row
  gives no record. `design/module-unit.md`: a dated section.
- The commit holding this file.

## Pairs (JOBS=2, one at a time)

Red, then green:
- `module_scope`: 31 checks, 3 FAIL at `684c246c9` (`Equal_routed`, `Equal_joined`, `Equal_grown`: "not proved". All
  five new units stayed out of the heap core on both sides, and `joined` on the candidate side). ALL PASS at
  `a46c1807c`.
- `ci/ledger.test.mjs`: FAIL at `684c246c9` ("an added file's statements are its module unit's"), exit 0 at
  `2e3382218`.
- pr-intake fixture (`tests/fixtures/pr-intake/test.mjs`): exit 0. Now 8 rows, `added.ts` `(module)` [1, 2] NEW
  `checked` with both edits, 5 units spent, 3 `skipped:preview`.

Regression at `2e3382218`, each exit 0, ALL PASS:
module_unit 3, module_unit_same 2, heap5_module 9, module_const_deps 9, module_forms 33, module_scope 31,
heap_canonical 13, type_tests 59, copied_argument 10. The pairs whose sources use a namespace import: cause_fake_recursion
3, finite_components 9, hook_slots 11, jsx_handlers 35. The ledger route: readme_ledger 15 checks.
`node langs/ts/ci/<each>.test.mjs`: comment, ledger-failures, ledger, new-code, report, supervise, values-line,
worktree all exit 0.
Hand check (preview, scratch repo): deleting a file with an import, a function and a call gives two removed rows,
`(module)` [1, 3] with 2 edits and `g` [2, 2] with 1 edit.

## Regression list

- No expectation row changed outside `module_scope`, and those are the five new rows plus the `why`.
- `tests/ci/refusals.test.mjs` (not in `ci/*.test.mjs`) fails at line 42: `--runs-dir` holds a `run-*` folder beside the
  refusals file. It fails the same way at the base 09032a594 in a detached worktree, so it predates this lane and I did
  not fix it. Its row count (7) and NEW assertion pass before that line.

## Census

`NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs /root/da/census/repos/<root> --out <root>-<side>.json`.
"Before" is a detached worktree at 09032a594 and "after" is this tree at `2e3382218`. Each root ran alone, after the
pairs, under the gate (fewer than 6 `census.mjs` and at least 12 GB available). The gate held from 08:59 UTC after five
checks starting 08:34. Script and outputs are in `/root/lanes/ledger-added-files/census/` (`run.sh`, `gate.log`).

| root | complete | files | units | entered before | entered after | readings with gains or losses | record journal |
|---|---|---:|---:|---:|---:|---:|---|
| n8n | yes, both | 7,812 | 9,610 | 2,752 | 2,752 | 0 | identical but for its own path |
| langchainjs | yes, both | 2,972 | 6,709 | 2,831 | 2,831 | 0 | identical but for its own path |

The two JSON outputs differ only in `seconds`. The census counts admission per unit by the lint, and neither rule moves
it. Rule 1 changes ledger routing for PRs, which the census does not run. Rule 2 changes which units the heap core
holds once a unit is entered, and which units are proved. No census number measures that.

nexus: not run, memory.

## What is left

- A function of an added file keeps its `ASK` row, "new file: no parent to compare with". It is not run, while a
  function added to an existing file gets NEW through runNew. I asked the lead and got no answer within the wait, so
  only the module unit got NEW here.
- The value lane still names `ns.X` by the namespace's module and X, plus the local name. That is sound but less
  precise: `ns.X` against `lib.X` is proved only when the heap core reads the unit.
- The pr-intake fixture shows an added file; the deleted file's `(module)` removed row is covered by the ledger test and
  the hand check only.
- The refusals test failure above (pre-existing).
