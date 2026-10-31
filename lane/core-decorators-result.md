# core-decorators: result (2026-10-31)

Base lean-b5c07450 (b5c074508). Branch `lane/core-decorators`. Commits:
- 2a4f0b99a: the red pair `langs/ts/tests/pairs/decorators_metadata/` (expect.json written before the reading).
- 9e0833179: the reading, design note 20b in `langs/ts/design/heap-stage5.md`, the COVERAGE row.
- c99aa3e90: the predicate moved beside the decorator table and reads its rows. A decorator whose row says
  `body: unchanged`, and whose fixture does not contradict the row, is metadata. This came from the nexus census,
  where 7 units of `@Injectable` classes moved; see Numbers. Added the pair row `Registry`.

## What was done and why

Section 20 of heap-stage5.md was already in the translator for the heap core's `this.m()` and `c.m()`. The red pair
read a decorated class, a decorated method and a decorated property, then the other routes to what a decorator
replaced. At the base it found six places, listed below, where a member a decorator may replace was read as its
declared text, or a decorated field as a plain cell. Three of the pair's rows were proved at the base although the
two sides give different results when run (`node` on the transpiled sides: made 5/4, seeds 5/4, curs 5/4, shown 12/11):
1. `heap.mjs classWhy` counted an optional field (`?`) before it looked for a decorator, so `@Column() text?: string`
   put its class in the heap core with a plain cell (`Note.shown`: proved).
2. The value reading read a decorated getter on `this` as the getter's text (`Dial.curs`: proved).
3. A decorated static method `C.m()` was the class's own unit (`seeds`: proved).
4. `sealedMember` sealed a decorated TS-private method (TS2415), so `this.m()` read its text. In the pair this
   comes out unproved anyway (`Dial.ticks`), but the reading was wrong at the base (probe `scratch/ord2.ts`).
5. `madeDispatch` read a decorated method of an instance made by `new` as its text (`made`: likewise unproved in
   the pair, wrong reading at the base).
6. In the value reading, a decorated field that no method writes was a pure read of `self`.

The fix is one mechanism, `decorators.mjs decoratorMayReplace(checker, cls, name, isStatic)`. A member is not its
declared text when the class or a class it extends, or a member of that name and staticness on the chain, carries
a replacing decorator. A decorator is replacing unless `translate/decorators.json` lists it with `body: unchanged`
and its fixture does not contradict the row (`replacingDecorator`, `replacinglyDecorated`). Everything below uses it:
- `thisRequest` asks it before `sealedMember`, so the value reading's `this.m()` becomes the `_held` request.
  `sealedMember` is unchanged.
- `heap.mjs replaceable` is the same predicate.
- `translate.mjs madeDispatch` returns false for it: the call is a request.
- `heldAccess` covers a `this` getter or setter it covers. The request is keyed by the class's code (`heldKey` of
  the class type, as `thisRequest` keys it). Without that key a changed getter would have kept one request name
  across the two sides.
- `staticReplaced` makes a static `C.m()` a world request named by the class's reach text. The effect
  classification uses the same test.
- `classWhy` reads a field's replacing decorator before its optional and definite forms.
- `mutatedFields` adds every instance field with a replacing decorator, so it lives in the world.

Choices where the section is silent, written in 20b: a parameter decorator is metadata (its result is discarded).
A decorator that installs an accessor on a field it does not decorate stays the section's named assumption.

## Elements added
- `decorators.mjs replacingDecorator`, `replacinglyDecorated`, `decoratorMayReplace`: the single test (see above).
  It sits beside the table, because `common.mjs` cannot import `decorators.mjs` without an import cycle.
  `translate.mjs thisRequest` consults it before `sealedMember`.
- `translate.mjs staticReplaced`: the static form, used in both the effect test and the call translation.
- `translate.mjs`: the decorated-member guard in `madeDispatch`, the `this` branch of `heldAccess`, the
  class-typed key in `accessorCall`, and the decorated-field loop in `mutatedFields`.
- `heap.mjs`: `replaceable` now uses the shared predicate. In `classWhy` a field's replacing decorator is checked
  before its optional and definite forms.
- Pair `decorators_metadata`: 20 units, with decorators in `meta.ts`, plus `types.d.ts` for `@nestjs/common`.
  `Entity` and `Track` are no-ops, `Column` installs a counting accessor, `Count` returns a counting descriptor.
  `Registry` is decorated by the table's `Injectable` marker; its private `size` returns a constant.

## Numbers

Pair: `JOBS=1 node langs/ts/tests/run.mjs --pair decorators_metadata`. At base: 37 checks, 6 failed. The rows that
failed were Equal_note_shown, Equal_dial_curs and Equal_seeds (proved), and lane B on made, seeds and Dial.cur. The
lane B expectations were then set to lane B's actual verdicts before the commit. After 9e0833179: 37 checks,
ALL PASS. After c99aa3e90 (Registry rows added): 41 checks, ALL PASS.

Regression pairs, each `JOBS=1 node langs/ts/tests/run.mjs --pair <p>`, ALL PASS at both 9e0833179 and
c99aa3e90:
decorators 17, heap5_decorators 9, blocker_import_meta 7, heap_canonical 13, type_tests 59, copied_argument 10,
class_statics 12, heap_methods 10, inline_callee 9, object_accessor_faults 42, object_methods 47,
override_outside 13, race_pure 5, rename_parameter 19, service 8, signature_change 7. The last ten are the pairs
whose sources use a decorator, an accessor, a static method or @sealed, since the change is in shared predicates.

Census, one root at a time and never in parallel with the pairs. Command:
`NODE_OPTIONS=--max-old-space-size=12288 node <checkout>/langs/ts/census.mjs /root/da/census/repos/<root> --out
<root>-<before|after>.json`. Here `<checkout>` is a detached worktree at b5c074508 for "before" and this branch at
c99aa3e90 for "after". The diff command is `node langs/ts/census.mjs --diff before.json after.json`. The files are
in `/root/lanes/core-decorators/census/`.

| Root | Files | Units | Entered before / after | Refused before / after | Failed files |
| --- | ---: | ---: | ---: | ---: | ---: |
| n8n | 7,812 | 9,610 | 2,680 / 2,680 | 6,930 / 6,930 | 0 / 0 |
| langchainjs | 2,972 | 6,709 | 2,766 / 2,766 | 3,943 / 3,943 | 0 / 0 |
| nexus (partial, shared files) | 14,912 | 25,401 | units with a finding 8,816 / 8,816 | | 0 / 0 |

nexus does not finish within the cap (`timeout 7000`; the inventory's run met the same limit). Before: 15,750 files
when stopped. After at c99aa3e90: 19,050 files. An earlier after-run, at 9e0833179, was killed from outside at
15,300 files. The comparison covers the 14,912 files whose chunks both journals hold
(`census/nexus-*.json.records.jsonl`). `node /root/lanes/core-decorators/cmp.mjs before.jsonl after.jsonl` compares
per file each unit's first finding, and each unit's lowering readings and refusal. Result: 0 changes. On those
files the first findings are ts-strict 2,133, copied-argument 1,613, read-after-call 1,524 and type-assertion
1,044, the same before and after.

At 9e0833179, when every decorator counted as replacing, the same comparison moved 7 nexus units, all in NestJS
`@Injectable()` classes calling a TS-private method through `this`:
- 3 entered -> copied-argument (GetQueueStatsUseCase.execute, CloudflareWafClient.createRule and .updateRule);
- 1 entered -> read-after-call (WorkflowExecutionRepositoryAdapter.countNodeStatuses);
- 2 control-flow -> entered (PlatformListenerRegistry.unregister and .unregisterByWorkflow).
The decorator table lists `Injectable` as a marker with `body: unchanged` and a fixture that agrees, so c99aa3e90
reads such rows as metadata. The 7 units return to their base reading, and the census at c99aa3e90 is unchanged
on all three roots.

`refusalRules` (units per stop reason) and `readings` are identical before and after on every root measured. The
diff gives 0 gains and 0 losses on every reading. The top stops are unchanged: n8n type-assertion 1,631, read-after-
call 603, ts-strict 414; langchainjs type-assertion 575, read-after-call 456, prototype 344. No unit stopped, entered,
or moved to another stop at c99aa3e90. The census counts the lint's findings. Those reach the translator's reading
only where a call becomes a request, which then makes an argument "kept" or a later read "after a call". That
happened for the 7 units above while unlisted framework decorators counted as replacing. With the table read, the
comparison shows no move on the three roots. The change shows in which proofs hold (the pair), not in the census.

## Left, and defects met (reported, not fixed: outside this construct)
- Lane B returns PASS-bounded on `made` and `seeds`, though the sides return 5 and 4 when run. The harness does
  not run the decorated member of an instance made by `new`, or of the class itself. Lane B also asks on the
  getter unit `Dial.cur`.
- `new C()` of a decorated class in the value reading allocates inline. Step 21 refuses it in the heap core only.
- An undecorated getter on `this` is read as its text without `sealedMember`'s subclass test (a subclass in
  another file may override a getter). That is the conformance reading of accessors, not decorators.
- A decorated static accessor, and `this.m()` inside a static method, keep their readings.
- The reading that relies on a `body: unchanged` row does not write that row into the unit's `// DECORATORS` line.
  No proof rests on a contradicted row, because such a row turns the reading back to replacing. But the
  certificate does not name the row's framework version.
- Lane B traces each read of a field on its drawn receiver. `this.n + this.n` against a local is therefore
  WITNESS in lane B and proved in lane A: section 18's documented divergence, not about decorators. I hit it with
  the first `Registry`, and made `size` return a constant.
- Arithmetic (`x*2` against `x+x`) is not provable: `+` and `*` are uninterpreted calls. I met this while writing
  the pair and changed the pair's `peak` to avoid it.
