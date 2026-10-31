# decorators-lane-b: result (2026-10-31)

Base lean-09032a59 (09032a594). Branch `lane/decorators-lane-b`.

## Commits
- 9cda92441: red pair. Three lane-B rows of `decorators_metadata` change: `made` WITNESS, `seeds` WITNESS, `Dial.cur`
  PASS-bounded. At the base they returned PASS-bounded, PASS-bounded and ASK: 41 checks, 3 FAILED. The `why` text
  says why.
- 78e0764bc: the reading.
  - `exec/run.mjs`: the loader's `__decorate` applies a decorator of the package's own code as TypeScript's
    emitted helper applies it. It runs the last decorator first. A truthy result replaces the class or the
    descriptor, which is then defined on the target. Before, every decorator's result was discarded. A decorator
    lane B fakes (an import that leaves the package) is still run only for its reads and calls.
  - `propertyRead`: a unit `C.m` that neither side holds, where a side holds the getter unit `C.get_m`, is that
    getter. It is driven by reading the property.
  - `exec/programs.mjs`: a class that declares no constructor is built as `new C()` builds it, with no arguments,
    as `runClassRaces` already did. Before, its programs stopped with `no constructor unit`.
  - `tests/lane-b-routes.mjs`: the one-off check.
  - The contract is in SEMANTICS.md "Lane B"; the dated note is heap-stage5.md 20c.
- 9f5e42fa0: second reading, from the regression.
  - `programs.mjs` decided "the constructor changed" only by the text of `C.constructor`. In `inherited_method`
    the candidate's base changes the initializer `count = 0` to `count = 1`, and neither side declares a
    constructor. So once a class without a constructor got programs, `Item.tag` (and 4 other rows) became WITNESS
    on the instance's `count`, a field `tag` never touches.
  - The test is now the instances as built: when the two sides' own fields differ before any command, the
    programs do not run, and the constructor is the one that differs.
  - The check script was corrected as it met each pair, all in how it loads the sides, never in what it compares:
    - the project's class-field emit mode;
    - `import.meta` as lane B gives it;
    - lane B's sandbox globals (`hrtime`) and React's element runtime;
    - lane B's worker environment (`sandbox_boundary envLeak`);
    - a fake decorator's result dropped inside TypeScript's own helper.

## Pairs
`JOBS=2 node langs/ts/tests/run.mjs --pair <p>` at the final code:
- `decorators_metadata`: 41 checks, ALL PASS (red at base: 41 checks, 3 FAILED).
- Regression: the brief's list plus every pair whose expect.json has a lane-B row on a class member (grep of the
  b keys `Class.member`; the pairs whose sources use a decorator are all among them). Each passed with ALL PASS, with
  this many checks:
  bare_return_void 13, cause_world_reach 5, class_fields_define 7, class_new 17, class_statics 12, class_super 8,
  constructor_module_write 4, constructors 30, copied_argument 10, counter 13, decorators 17, exceptions_across 36,
  exceptions_rebase 15, for_each 8, function_values 10, heap5_decorators 9, heap_canonical 13, heap_methods 10,
  heap_shapes 36, inherited_method 27, inline_callee 9, library_members_refused 16, logic_values 12,
  member_constraints 9, mixed_logic_values 40, object_accessor_faults 42, object_methods 47, operators_values 57,
  override_outside 13, promise_fallback 21, promise_field 13, promise_forms 10, promise_handle 18,
  push_apply_refused 4, race_lines 7, race_pure 5, reach_absent 7, readme_ledger 15, rename_parameter 19, service 8,
  signature_change 7, small_forms 15, ten_mutants 3, this_method_override 34, try_catch 8, two_callers 14,
  types_enclosing_params 24, types_this 23, types_unlocated 18, type_tests 59, void_results 21.
- Pairs run before 9f5e42fa0 were rerun after it: the first 22 of the list and `decorators_metadata`.
- `object_methods_getters` (named in the brief) does not exist in the pair list.

## Regression list
- None from this lane.
- `class_handles`: 1 check, 1 FAILED ("theorem generated": the translator writes no parent.dfy). It fails the
  same way at the base (run in a detached worktree at 09032a594). The translator refuses with `parent.ts:28:
  alias-mutation`. This is a finding of the translator at the base, not of lane B.

## The check (Done-when)
`node langs/ts/tests/lane-b-routes.mjs` (committed) runs again every lane-B row of every pair that expects
PASS-bounded, on lane B's 30 drawn inputs, through the routes the source gives the unit:
- a free function is called;
- a method is called on an instance its constructor built;
- a static member is called through the class;
- a getter is driven by reading the property.

It uses a loader of its own (TypeScript's emit with its helper untouched) inside lane B's world.
- At lean-09032a59 (decorators_metadata): 2 rows, `made` and `seeds`, return 5 against 4.
- At 9f5e42fa0, every pair:
  `| LANE-B ROUTES | 1081 PASS-bounded rows, 1075 driven on 30 inputs, 6 not driven | 0 rows PASS-bounded while the two sides differ on a drawn input |`
- Not driven, because they have no call route of their own: 2 callback units (`callback_units`), 3 export-const
  members (`exported_object_methods`), and the module unit (`module_unit_same`).
- Inputs counted as the constructor's: the two constructions built different instances, and those inputs are
  not compared.
  - `bare_return_void Gate.admits`, 2 inputs: its constructor row is WITNESS.
  - `class_new Ledger.take`, 24 inputs.
  - `inherited_method` Item.tag, .title, .size, .note and .mark, 30 inputs each: no constructor row. Those
    rows are covered on lane B's own receiver only.

## Census
- n8n, langchainjs: not run. The change is in lane B only (exec/run.mjs, exec/programs.mjs), and `census.mjs`
  imports nothing under exec/, so no census number can move.
- nexus: not run, memory.

## Left
- A unit `C.m` naming a setter only is not resolved: a setter is reached by a write, never by the property's name.
- A decorator lane B fakes (outside the package, not in the table) still keeps the declared member. What it
  installs is unknown. PASS-bounded there rests on that stated assumption.
- The check skips an input whose two constructions differ. On a class with no constructor row (inherited_method)
  the made-instance route therefore compares nothing for those rows.
- In one exploratory grep during this lane I used `2>/dev/null` (a search of the design notes, not a run of a pair
  or census). Reported here; no verdict rests on it.
