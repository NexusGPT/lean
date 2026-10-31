# fix-constructor-module-write: result (2026-10-31)

Branch `lane/fix-constructor-module-write`, base lean `30569d746` (lead-30569d74). Commits, in order:

| Commit | What |
| --- | --- |
| e1f257ddd | pair `constructor_module_write` (red): 3 of 4 rows red at base |
| d9dd31dbc | lane B: one call observes the change it made to the module's own bindings (`exec/run.mjs`, `SEMANTICS.md` item 2) |
| 373aad5ff | pair `class_fields_define` (red: 2 of 7 rows); the pair runner's `project` key (`tests/run.mjs`) |
| 4db4f34e1 | both lanes read the class-field emit mode of the file's own options (`common.mjs`, `translate/heap.mjs`, `translate/translate.mjs`, `exec/run.mjs`, `exec/record.mjs`) |
| 0e7d1674b | `design/heap-stage5.md` 21, dated note 2026-10-31; `design/module-forms.md` lane B paragraph |
| (this file) | `lane/fix-constructor-module-write-result.md` |

## 1. A constructor's write to module state (row ac4521b0, first half)

What I found: the gap was not specific to constructors. One call's observation in lane B was the outcome, the graph
reachable from the arguments, the receiver and the result, the trace and pending work. No binding of the unit's own file
was observed. A constructor never runs twice in one sandbox (the class programs and the environment programs both skip
it), so its write could not show up at all. A free function that writes a module record and never reads it back had the
same gap: `enrol` in the pair was PASS-bounded at base.

The mechanism (d9dd31dbc) is one rule, keyed on syntax and on the value's shape:

- The loader's shim (`unitShim`) exports a non-enumerable getter, `__lean_state`, of every binding that a top-level
  variable statement declares. Destructured bindings count; an ambient declaration does not.
- `observeWindow` reads the getter before and after the call. The observation's new field `module` holds the change for
  each binding:
  - for a record, the members whose rendering changed (added, changed, or `$deleted`);
  - for anything else, the binding's new value (`$now`).
- A function is a leaf, keyed by identity. The numbering is shared by both snapshots, so a replaced closure counts as a
  change, and a function is never numbered as an escape.
- An accessor is never run.
- Past 4000 objects, a binding becomes one budget token, the same on both sides.
- `differenceField` compares `module` after `drives`. A witness shows it, for example
  `"module": {"registry": {"vd436": 0}}` against 1.

Why the change and not the whole state: lane A's world starts in any state, the same on both sides. An initializer that
the call never touches is a difference of the module, not of the call.

Pair `constructor_module_write` (lane B only: the lint refuses an index write into a binding the unit does not own). At
e1f257ddd: 3 of 4 FAIL (each PASS-bounded). At d9dd31dbc and later: ALL PASS.

| Unit | Lane B | What it shows |
| --- | --- | --- |
| Entry.constructor | WITNESS | another size stored into the module record |
| Ticket.constructor | WITNESS | the module counter is no longer advanced (the first instance is the same on both sides) |
| Label.constructor | PASS-bounded | the record and the field written in the other order |
| enrol | WITNESS | the same record write in a free function |

## 2. The class-field emit mode (row ac4521b0, second half): decided

Decision (4db4f34e1, note in `design/heap-stage5.md` 21, 2026-10-31): the emit mode is the file's own, by TypeScript's
rule.

- `common.mjs classFieldsDefine(options)` is `ts.getUseDefineForClassFields`. It is applied to the options the file
  compiles with: its project's, else lean's single-file options. Those are ES2020, so the mode is off, which is what
  both lanes did before.
- Lane A reads it from the program it translates. Under define, a new instance's optional field starts as `PUndef`. A
  `declare` field, which is emitted in no mode, stays `PMissing`.
- Lane B compiles every file with the same mode. `fileClassFieldsDefine` uses the same tsconfig discovery as
  `loadProgram`, driven by the run's `--project`. The compile cache is keyed on the mode, and the witness record's
  `compiler.useDefineForClassFields` names it (it was hard-coded `false`).
- The pair runner runs every pair `--no-project`, so their mode is unchanged. A pair can now name a tsconfig with
  `"project"` in `expect.json`: translate, lane B and the doubles reading then read the pair with it.

Pair `class_fields_define` (its tsconfig targets ES2022). It ran red on d9dd31dbc (the previous code plus the runner key)
in a scratch worktree, since removed: 2 of 7 FAIL, `Equal_made` not proved and lane B `made` WITNESS. At 4db4f34e1: ALL
PASS.

| Unit | Lane A | Lane B | What it shows |
| --- | --- | --- | --- |
| Note.constructor | proved | PASS-bounded | untouched |
| made | proved (canonical heap) | PASS-bounded | a new Note against one whose tag is set to undefined: the key holds undefined in both |
| blank | not proved | WITNESS | tag set to the empty string |

## Regression (all at 4db4f34e1, `JOBS=1 node langs/ts/tests/run.mjs --pair <p>`, one at a time)

The mechanism touches every unit whose file has top-level bindings. The list below is every pair with a top-level
`let`, a `var`, or a `const` that is not a primitive literal or a function. To that I added the class, constructor and
heap pairs, plus heap_canonical, type_tests and copied_argument. 44 pairs, all ALL PASS:

bench_drops 15, callback_behaviour 14, callback_units 9, cause_callee_pattern 3, cause_fake_recursion 3,
class_fields_define 7, class_handles 26, class_new 17, class_statics 12, class_super 8, constructor_module_write 4,
constructors 30, copied_argument 10, exported_object_methods 13, hash_keys 14, heap5_ctors 14, heap5_decorators 9,
heap5_handles 12, heap5_module 9, heap_canonical 13, heap_methods 10, known_values 13, lane_b_reach 15, library_members
19, loop_forms 41, module_const_deps 9, module_forms 33, module_scope 21, named_then 15, new_unit 30, numbers_bits 39,
numbers_bits_rebase 11, open_key_read 11, operators_values 57, promise_module_nullish 17, proof_hunt_7 6, proof_hunt_9
4, reach_keys 27, sandbox_boundary 5, service 8, types_symbol_bigint 19, type_tests 59, ui_tree_context 20,
unreached_body 10.

Logs: `/root/lanes/fix-constructor-module-write/reg/`. `exec/record.test.mjs`: 12 pass, 0 fail. No expectation outside
the two new pairs changed.

## Census

n8n and langchainjs: not run (gate). The memory rule's gate, `free -g` at least 12 GB available AND `pgrep -fc
census.mjs` below 6, was checked every 300 s from 04:32 to 05:52 (`/root/lanes/fix-constructor-module-write/census/gate.log`).
Memory was available (39 to 67 GB), but the census count stayed at 24 to 28, so the gate never opened. I asked the lead at
05:05 and got no answer within 120 s. I stopped my waiting script at 05:55 (by its pid), before the job's 2-hour limit, and
removed its base worktree.

What it would show: the census counts admission (the lint and the lowering), and neither change alters it. The module
observation is lane B's. The emit mode changes only a new instance's starting value in the heap core, and only in a
project whose mode is define. Under the projects' own options a census can translate differently there, but it does not
admit or refuse differently. This is an expectation, not a measurement. The lead's census at the merge is the
measurement.

nexus: not run, memory.

## What is left

- The census on n8n and langchainjs (gate never opened), before (lead-30569d74) and after.

- Another module's state: a unit that mutates an imported object is observed only through what reaches its arguments
  or its result. Imports are not variable statements of the unit's file. The CommonJS-emitted import names would need
  reading through the loader's module cache.
- Static fields are a class's state, not a binding's, and are still not observed by the module field.
- The environment programs (free functions) compare each command's outcome and trace, but not its module change. A
  constructor still never runs twice in one sandbox.
- The emit mode's key order (declaration order under define) is not read: the heap core's records hold no key order. A
  subclass field that redefines an inherited one stays outside the heap core with `extends`.
- Commits are authored with the repository's existing identity (`achammah`), passed by `-c` on each commit because the
  machine has no git identity configured. No config was changed.
