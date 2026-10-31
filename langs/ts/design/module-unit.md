# The module unit (2026-10-31, lane read-module-unit-ledger)

Defect: the change ledger had no unit for a file's top-level code. An edit outside every listed unit with a compiled
token ended `unassigned: module-level statement` (or `object-literal member`, `exported property assignment` for a
literal built at load or an exports write), an intake ASK that no lane read. REACH-GAP.md (DA): 53 notes sit at module
scope, 22 of them on edits the ledger left `unassigned: module-level statement`.

Reading: a file's top-level statements, in init order, are one unit, `(module)` (`common.mjs MODULE_UNIT`, a name no
declaration can take). Its call is the module's evaluation; it is compared between parent and head like any unit.

- **Route** (`ci/ledger.mjs routeChanges`, the last route before a named unassigned context): an edit of a source file
  that touches no listed unit, is not type-only, and whose every compiled token is code the module's evaluation runs
  is the module unit's. "Runs at evaluation" is read from the tree (`treeReading`, a flag per token): a token of a
  function's parameters or body, or of a class's members, runs only when the function is called or the class built,
  so it is not. One unit per file, one identity on both sides (`id([file, MODULE_UNIT])`), lines 1 to the last line.
  The order before it is unchanged: parse failure, a diagnostic in the edit, inert, a listed unit, untyped JavaScript,
  the artifact class. A file present on one side only keeps the named unassigned route: one evaluation has nothing
  to be compared with. An edit inside a function no listed unit holds keeps its named context: the evaluation may
  never call that function, so the module unit would pass it unread.
- **Listing** (`pr.mjs changedFiles`): a routed module unit joins the file's units for the worker; its cache key's text
  is the file outside its functions (`fileContext`), with the imports and tsconfig as for every unit; it has no caller.
  `topLevelFunctions` is unchanged: the census, the inventory and lane A list what they listed.
- **Lane B** (`exec/run.mjs runModuleUnit`): per input i (the environment's seed: the clock and random; while a module
  loads the world answers with handles, as for every unit's load), each side's module is loaded fresh in its sandbox
  under the call watchdog. The observation: the outcome (evaluated, or the value thrown), the requests in init order,
  the work armed (recorded, never fired, as `cert.observation` states for every unit), the exports by key, and the
  module bindings the module's own code holds (`moduleStatements` `declares`: a variable or enum it does not export;
  an exported one is an exports key; a function or class declaration is its own unit). A binding only one side declares
  is no observation (only the units read it, each its own unit); a function value is its handle, never its text.
- **The statement a witness names** (`where.lines`, kind `module statement`, both sides): `compileWithSites` puts a mark
  before each statement the evaluation runs (`state.enter && state.enter(file, index, bindings)`, a no-op unless the
  module unit is observed); a differing request or armed work is named by the last statement entered before it, a
  thrown value by the last statement entered, a binding or an export key by the last top-level statement that writes
  it (`moduleStatements` `writes`, `exportKeys`: writes outside every function).
- **Lane A** (`check.mjs`): lane A translates functions, so the module unit's verdict is lane B's rung (WITNESS,
  PASS-bounded at best, else ASK with lane B's reason) and `lanes.A` says `module-unit`.

Soundness: a module is evaluated once per resolved file (ECMA-262 HostLoadImportedModule), its statements in order,
so the evaluation is the module unit's whole behaviour at load. What it does later, through the functions it defines,
is those functions' (their own units, checked when edited). A PASS is bounded: n evaluations, seeded.

Pairs: `module_unit` (the registration's option changes: WITNESS, the witness names `register('alpha', ...)` on both
sides; red before: ASK from `runNew`), `module_unit_same` (the init reshaped through bindings of the candidate's own:
PASS-bounded; red before: ASK). `ci/ledger.test.mjs`: a module-level edit is the module unit's, one per file, a
function's own edit stays its function's, an added file's statement stays unassigned (red before: `a module-level
statement is the module unit's`). The pr-intake fixture follows the route: its template line is the module unit's
(a `(module)` row), its module constant edit adds a checked `(module)` row beside the four invalidated function rows.

Still out: a file present on one side only (the module unit of an added file would be NEW); an edit inside an unlisted
function or a class member (class field, instance initializer); timers and escaped functions the evaluation arms are
recorded, never fired or driven; untyped JavaScript keeps its route.

Census: not run. The ledger census (`lane/read-module-unit-ledger-scripts/ledger-census.mjs`: the ledger of a lean
checkout over every first-parent commit of a repository against its parent, routes counted, the module unit apart)
waited under the memory rule (12 GB available and fewer than 6 `census.mjs` processes) for two hours, 24 checks from
04:22 to 06:17 UTC: memory recovered (up to 70 GB) but `census.mjs` never fell below 22, so the rule never held.
The census copies limit it anyway: n8n's has no `.git` (no commits to diff), langchainjs's is shallow (151 commits,
150 with a parent). REACH-GAP's 44 instances are not on this machine. nexus: not run, memory. To run, one side at a
time: `node lane/read-module-unit-ledger-scripts/ledger-census.mjs --lean <checkout> --repo <root> --out <json>`,
the base lean (`git archive lead-30569d74 langs/ts`) against this branch; the count to read is `reasons["module-level
statement"]` and `moduleUnit`.
