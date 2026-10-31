# read-module-unit-ledger: result (2026-10-31)

Branch `lane/read-module-unit-ledger` from lean `lead-30569d74`. Commits: `ed42b8b61` (the reading),
`552c9a898` (the module unit's last line; the pr-intake fixture follows the route), and the commit holding this file
(the design note `langs/ts/design/module-unit.md`, the ledger contract's section, the census script).

## What is done

- **The ledger gives top-level code a unit** (`ci/ledger.mjs`): an edit outside every listed unit whose every compiled
  token runs at the module's evaluation (the tree reading flags tokens of function parameters/bodies and class members
  as deferred), not type-only, in a source file present on both sides, routes to `(module)` (`common.mjs MODULE_UNIT`),
  one per file, one identity on both sides. Keyed on syntax only. The edits a module-level object literal or an
  exports write held (`object-literal member`, `exported property assignment` at module scope) route there too.
- **Compared like any unit**: `pr.mjs` lists it (cache key: the file outside its functions, the imports, the tsconfig;
  no caller); `exec/run.mjs runModuleUnit` loads both sides fresh per input and compares outcome, requests in init
  order, armed work, exports by key, and the bindings both sides declare; `check.mjs` ends it at lane B's rung (lane A
  translates functions). `topLevelFunctions` is unchanged (census, inventory, lane A untouched).
- **A witness names the statement**: top-level marks in `compileWithSites` (a no-op unless the module unit is
  observed) name the statement entered before a differing request, armed work or throw; a binding or export key names
  its last top-level writer. `where.lines.kind` is `module statement`, both sides.

## Red, then green

- Pair `module_unit` (new): `lane B (module) WITNESS`, `check (module) WITNESS`, `statement (module) module statement`
  (new expectation key `statement` in tests/run.mjs): 3 FAIL before (ASK from runNew), ALL PASS after.
- Pair `module_unit_same` (new): `lane B (module) PASS-bounded`, `check (module) PASS-bounded`: 2 FAIL before, ALL PASS after.
- `ci/ledger.test.mjs`: red at `a module-level statement is the module unit's`, green after; its `mixed.ts`
  assertion keeps its intent (the same-line unit does not swallow the exports write, now the module unit's).
- `tests/fixtures/pr-intake/test.mjs`: red after the reading (the template line was expected `unassigned:module-level
  statement`); the fixture now reads the template line as the module unit's row and counts 2 changed units and 2
  undecided intake rows; the module-constant guard keeps its 4 invalidated function rows plus a checked `(module)` row.
  Exit 0.

## Regression (JOBS=1, each pair ALL PASS)

module_unit 3, module_unit_same 2, heap5_module 9, module_const_deps 9, module_forms 33, module_scope 21,
promise_module_nullish 17, readme_ledger 15, heap_canonical 13, type_tests 59, copied_argument 10 checks.
ci: ledger, ledger-failures, report, supervise, worktree, comment (69 of 69): exit 0. pr-intake fixture: exit 0.
The pair list changed only by the two new pairs; no expectation elsewhere moved.

## Census: not run

Gated by the memory rule for two hours (24 checks, 04:22 to 06:17 UTC): memory recovered (up to 70 GB) but
`census.mjs` never fell below 22, so the rule never held; the gated job reached its longest time limit and was not
restarted. Also: n8n's census copy has no `.git`, langchainjs's is shallow (150 parent->commit pairs), and REACH-GAP's
44 instances are not on this machine (asked the lead, no answer within the wait). nexus: not run, memory. The script is
committed: `lane/read-module-unit-ledger-scripts/ledger-census.mjs --lean <checkout> --repo <root> --out <json>`, base
from `git archive lead-30569d74 langs/ts`; read `reasons["module-level statement"]` and `moduleUnit`.

## What is left

- The census before/after (above), and on REACH-GAP's 44 instances where they live.
- A file present on one side only (an added file's module unit would be NEW): its statements stay unassigned.
- An edit inside an unlisted function or a class member keeps its named context; timers and escaped functions the
  evaluation arms are recorded, never fired or driven; untyped JavaScript keeps its route.
- The full suite (the lead's, at the merge).
