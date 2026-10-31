# core-module-scope: result (2026-10-31)

Branch `lane/core-module-scope`, base `lead-b5c07450` (b5c074508). Commits: 41b554b7e (red pair), 9ef6948af (the
reading, the design note, the coverage row), this file.

## What was done, and why

Section 9 of `langs/ts/design/heap-stage5.md` (module scope) was already read by the heap core: a module `const` by its
initializer, an imported primitive by a bodiless constant "keyed by its module specifier and its exported name". The
pair this brief asks for (a module constant, a module-level mutable, a unit exported and imported) found two defects
in what that key was, at the one place an imported name becomes a symbol of the theorem:

1. **A false proof (value lane).** `translate.mjs` named an imported constant, an imported function, a member of an
   imported namespace and a named callback by the *local* name (`ext_NAME()`, `ext_call_args_relay_..`). So
   `import { FIRST as NAME }` (parent) and `import { SECOND as NAME }` (candidate) were one constant. A unit the heap core
   leaves to the value lane (one that writes a module `let`) was proved equal across two different values (pair row
   `counted`: "real lemma proved" before, at the base).
2. **A missed proof (heap core).** `heap.mjs importKey` hashed the specifier text, so one declaration reached through a
   module that re-exports it (`export { grow } from './limits'`, imported from `./lib`) was another constant and another
   transition (`relayed`, `step`: unproved).

The mechanism, one for both lanes: `common.mjs importIdentity(checker, id)`. An imported name is the binding it denotes,
meaning the module that declares it and its name there, read through every re-export with the checker's
`getAliasedSymbol`. The module is named by its path from the importing file's directory, without the extension
(`pr.mjs` writes the base version beside the head one, so both sides name it alike), and a file inside a package by its
path from the package folder. A namespace import or `import x = require(..)` is the module itself. Where the section is
silent, the choice that keeps soundness: a bare specifier keeps its text and imported name (its inside depends on an
install), and an unresolved relative module keeps its text. Each is at worst another symbol, never two values made one.
Consumers: the heap core's `Imp_`/`Call_` keys; the value lane's `outsideName` at every external built from an
identifier's text (`externalValue`, the member of an outside object, the direct outside call, the method on an outside
object, the named callback, the named promise handler) and the function-value code id (`opaqueFn` imports).
A name not bound by an import keeps its text: no other external changes.

Still refused, as the section says: a module `let`/`var` in the heap core (the value lane reads it as a world cell,
`tally` and `peek` prove there), an object-valued constant, an import of a reference or function read as a value.

## Elements added, and why

- `langs/ts/common.mjs` `importIdentity`: the one identity of an imported binding (above).
- `langs/ts/translate/heap.mjs` `importKey(d0, id)`: hashes `importIdentity` instead of the specifier text.
- `langs/ts/translate/translate.mjs` `outsideName(id)`: the external's name for an identifier, `<local>_Imp_<sha256/16 of
  the identity>` for an imported name, its text otherwise; applied at the seven sites listed above.
- `langs/ts/tests/pairs/module_scope/` (parent, candidate, `limits.ts` declaring, `lib.ts` re-exporting, expect.json):
  capped (the literal for `MAX`: proved), bounded (WITNESS), tally and peek (module `let`: proved), counted (value lane)
  and named (heap core) (`NAME` bound to another constant: unproved, lane B WITNESS), limited and next (the same import:
  proved), relayed and step (the same declaration through a re-export: proved).
- `langs/ts/design/heap-stage5.md` 9b (dated subsection under section 9); `langs/ts/COVERAGE.md` section 7 row
  "imported function, imported value, module constant".
- No row of any other pair's expect.json changed.

## Numbers

Red at the base (`JOBS=1 node langs/ts/tests/run.mjs --pair module_scope`, commit 41b554b7e, no translator change):
21 checks, 3 FAILED (Equal_counted "real lemma proved", Equal_relayed "not proved", Equal_step "not proved").
After (9ef6948af): 21 checks, ALL PASS.

Regression, `JOBS=1 node langs/ts/tests/run.mjs --pair <p>` at the reading (one at a time). The list: every pair whose
name shares a word with the construct (module, scope, import, export), every pair whose sources import a module (the
key changed for imports), plus heap_canonical, type_tests and copied_argument. All exit 0:

- bare_return_void | 13 checks | ALL PASS
- bench_drops | 15 checks | ALL PASS
- blocker_import_meta | 7 checks | ALL PASS
- blocker_unresolved_type | 9 checks | ALL PASS
- callback_behaviour | 14 checks | ALL PASS
- callback_behaviour_tree | 2 checks | ALL PASS
- cause_callee_pattern | 3 checks | ALL PASS
- cause_fake_recursion | 3 checks | ALL PASS
- class_super | 8 checks | ALL PASS
- clock | 9 checks | ALL PASS
- clock_read | 25 checks | ALL PASS
- comma_operator | 21 checks | ALL PASS
- component | 5 checks | ALL PASS
- copied_argument | 10 checks | ALL PASS
- counter | 13 checks | ALL PASS
- decorators | 17 checks | ALL PASS
- dom_patch | 21 checks | ALL PASS
- dynamic_reads | 37 checks | ALL PASS
- effects_deps | 4 checks | ALL PASS
- exceptions_across | 36 checks | ALL PASS
- exceptions_scope | 23 checks | ALL PASS
- exported_object_methods | 13 checks | ALL PASS
- exported_units_js | 4 checks | ALL PASS
- fake_throw | 5 checks | ALL PASS
- finite_components | 9 checks | ALL PASS
- for_each | 8 checks | ALL PASS
- function_values | 10 checks | ALL PASS
- gen_walk | 11 checks | ALL PASS
- handler_capture | 26 checks | ALL PASS
- handler_capture_unknown | 2 checks | ALL PASS
- handler_identity | 15 checks | ALL PASS
- heap5_decorators | 9 checks | ALL PASS
- heap5_module | 9 checks | ALL PASS
- heap5_outside | 9 checks | ALL PASS
- heap_canonical | 13 checks | ALL PASS
- hook_slots | 11 checks | ALL PASS
- inherited_method | 27 checks | ALL PASS
- jsx_handlers | 35 checks | ALL PASS
- jsx_handlers_symbolic | 22 checks | ALL PASS
- library_hooks | 5 checks | ALL PASS
- library_members | 19 checks | ALL PASS
- logic_values | 12 checks | ALL PASS
- mixed_logic_values | 40 checks | ALL PASS
- module_const_deps | 9 checks | ALL PASS
- module_forms | 33 checks | ALL PASS
- named_callbacks | 17 checks | ALL PASS
- operators_values | 57 checks | ALL PASS
- promise_forms | 10 checks | ALL PASS
- promise_integration | 15 checks | ALL PASS
- promise_module_nullish | 17 checks | ALL PASS
- promise_then | 33 checks | ALL PASS
- race_pure | 5 checks | ALL PASS
- readme_search | 5 checks | ALL PASS
- rename_parameter | 19 checks | ALL PASS
- render_purity | 5 checks | ALL PASS
- reserved_units | 13 checks | ALL PASS
- schedule_explorer | 9 checks | ALL PASS
- service | 8 checks | ALL PASS
- signature_change | 7 checks | ALL PASS
- spread_outside | 47 checks | ALL PASS
- stack_text | 11 checks | ALL PASS
- statements | 7 checks | ALL PASS
- suspense | 5 checks | ALL PASS
- try_catch | 8 checks | ALL PASS
- type_assertions | 45 checks | ALL PASS
- type_tests | 59 checks | ALL PASS
- ui_tree_context | 20 checks | ALL PASS
- window_timers | 3 checks | ALL PASS
- world_read_after_call | 12 checks | ALL PASS
- module_scope | 21 checks | ALL PASS

Census: `NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs /root/da/census/repos/<root> --out
<root>-<before|after>.json`. Before is a detached worktree at b5c074508, after is this tree at 9ef6948af. One root at
a time, never beside the pairs (script `/root/lanes/core-module-scope/census/run.sh`, outputs beside it). Diff with
`node langs/ts/census.mjs --diff`, plus a per-file comparison of the record journals (units, findings, lowering;
timings left out):

| root | files | units | entered before | entered after | readings changed | files whose records differ |
|---|---:|---:|---:|---:|---:|---:|
| n8n | 7,812 | 9,610 | 2,680 | 2,680 | 0 | 0 of 7,812 |
| langchainjs | 2,972 | 6,709 | 2,766 | 2,766 | 0 | 0 of 2,972 |
| nexus | partial | | | | | 0 of 2,400 (the files both journals finished) |

No unit was stopped, admitted or moved to another stop: the change is to which symbol an imported name becomes once a
unit is entered. The census counts admission, not proofs. What the change moves is proofs: one false proof removed,
and re-exported imports proved. No census number measures that.
nexus: the before run was killed by the system at 2,950 files (exit 137, the machine at 108 of 122 GB used), and the
after run was stopped by my two-hour background limit at 13,200 journal files. Neither completed, so nexus has no
total; the 2,400 files both journals hold in finished chunks are identical.

## Defects met (outside this lane, reported, not fixed)

- The doubles reading's refusal message names an empty name for a module `let` read or an imported constant: "not
  encoded: a name outside the unit's parameters, locals and module constants: " followed by nothing (pair module_scope
  rows peek, limited). The verdict is right (unknown); only the message is empty.
- Lane B with `--n 30` did not reach a numeric threshold between two imported constants (5 against 7, `i.id < CAP`);
  the pair uses string constants for its WITNESS rows. This is a sampling bound, not a defect of this reading.
- nexus does not finish a census on this shared machine tonight (above).

## What is left

- A nexus before/after census on a quiet machine.
- A namespace import's member (`ns.X`) in the heap core stays out, as before (the value lane now names it by its
  module).
