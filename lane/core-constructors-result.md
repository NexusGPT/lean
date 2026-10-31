# core-constructors: result (2026-10-31, night wave)

Branch `lane/core-constructors`, base lean `b5c074508` (lead-b5c07450). Commits, in order:

| Commit | What |
| --- | --- |
| 0c3733854 | pair `constructors` (red): 2 of 30 rows red at base |
| ce1119c56 | heap core: the exact-instance method call only while the instance is unshared (`translate/heap.mjs`) |
| d9de8bf88 | `design/heap-stage5.md` 21, dated subsection 2026-10-31; `COVERAGE.md` `new C()` row |
| (this file) | `lane/core-constructors-result.md` |

## What I found

Section 21 (Constructors) was already implemented at base (`translate/heap.mjs`: `newClass`, `ctorWhy`,
`ctorUnitOf`, `freshCall`; pair `heap5_ctors` green). I wrote the brief's pair from the section's examples first (field
initialisers, a constructor calling super, parameter properties). All 21 of those rows passed at base, so none of them
was red.

I then probed the edges of the section's own reading and found one soundness defect in it. Section 21 reads
`c.m(..)`, on a const `c` bound to `new C(..)`, as the core call `C.m`, on the grounds that "that instance is exactly a
C". That fixes the instance's prototype, but not its own properties. Code that holds the instance can install an own
`m`, and an outside callee (step 15) or a transition (step 18) does it unseen, because a cell holds fields and never
methods. At base:

```ts
const t = new Tally(n); patch(t); return t.bumped();   // patch (another module) does (o as any).bumped = () => 99
```

Lane A proved this equal to `t.count += 1; return t.count;`, and lane B witnessed it (99 against the count). The same
happens when one of Tally's own methods hands `this` to `patch` (`relayed`).

## The reading (ce1119c56), one mechanism

`c.m(..)` on a const `c` bound to `new C(..)` is the core call `C.m` only while `c` is unshared. That means every use of
`c` in its scope is one of:

- a field read or write (`c.f`, where f is a field of the instance);
- a bare `return c`;
- the receiver of `c.m2(..)`, where m2 keeps `this` the same way: `this.f`, `this.m3(..)` of such a method, an arrow
  inside it reading the same `this`. The recursion closes on methods already met.

Any other use shares the instance, and the call stays step 18's transition. No rule names a repository, a file or a
unit.

Elements added in `translate/heap.mjs`, and why:

- `ownMethod`: finds the method declaration a call runs, so its `this` can be checked.
- `fieldNames`: the instance's fields, so a field use can be told apart from any other member use.
- `confinedUse`: decides whether one use (of `c` or of `this`) is a field use, a confined method call or a bare return.
- `thisConfined`: checks one method's `this` uses, recursively.
- `unshared`: checks every use of the const in its scope, memoised per declaration.
- `freshCall`: now also requires `unshared`.

Choices where the section was silent, each kept sound:

- Every use in the scope counts, not only the uses before the call, because a loop can run a later use first.
- An accessor, a computed key and an optional chain count as sharing (their code is not read here).
- `return c` is not sharing: nothing runs with the instance before the unit ends.

## Pair `constructors` (langs/ts/tests/pairs/constructors/, sibling `outside.ts`)

`JOBS=1 node langs/ts/tests/run.mjs --pair constructors`: 30 checks. At 0c3733854 (base reading) 2 failed:
`Equal_handed not proved` and `Equal_relayed not proved`, both "real lemma proved". At ce1119c56: ALL PASS.

| Unit | Lane A | Lane B | What it shows |
| --- | --- | --- | --- |
| Meter.constructor, metered | proved | PASS-bounded | an initializer the body stores over (initializers before the body) |
| Gauge.constructor | not proved | WITNESS | a changed initializer |
| Span.constructor | proved | | parameter properties (`public`, `readonly`), untouched |
| span | not proved | WITNESS | arguments swapped |
| Cell.constructor, sized | proved | PASS-bounded | `private readonly` and `public` parameter properties, the body through a local |
| Shape.constructor | proved | | base class, untouched |
| Square.constructor, perimeter | proved (ordinary lane) | PASS-bounded | `super(4)` against `super(2 + 2)` |
| Triangle.constructor | not proved | WITNESS | `super(3)` against `super(4)` |
| Tally.constructor, Tally.bumped, Tally.shared | proved | | untouched |
| kept | proved | PASS-bounded | an unshared instance: its method is Tally's own text |
| handed | not proved (was proved) | WITNESS | instance handed to an outside function before `t.bumped()` |
| relayed | not proved (was proved) | WITNESS | Tally's own `shared` hands `this` to the outside function |

`super` and an extended class stay outside the heap core, as section 21 says, and the ordinary lane reads them.

## Regression (all at ce1119c56, `JOBS=1 node langs/ts/tests/run.mjs --pair <p>`)

| Pair | Checks | Result |
| --- | ---: | --- |
| constructors | 30 | ALL PASS |
| heap5_ctors | 14 | ALL PASS |
| heap5_handles | 12 | ALL PASS |
| class_new | 17 | ALL PASS |
| class_super | 8 | ALL PASS |
| heap5_decorators | 9 | ALL PASS |
| heap_methods | 10 | ALL PASS |
| new_unit | 30 | ALL PASS |
| heap_canonical | 13 | ALL PASS |
| type_tests | 59 | ALL PASS |
| copied_argument | 10 | ALL PASS |

No other pair name shares a word with "constructors". The ones above that share "class", "ctors", "new" or "methods"
were run as the nearest ones.

## Census

Before is base `b5c074508` (a detached worktree at `/root/lanes/core-constructors/base`); after is `ce1119c56`. Each
root ran alone, never at the same time as a pair:

```
NODE_OPTIONS=--max-old-space-size=12288 node <base|tree>/langs/ts/census.mjs /root/da/census/repos/<root> --out <root>-<side>.json --report <root>-<side>.md
```

For nexus I added `--limit 6000` on both sides. A whole nexus run took more than the 2-hour limit of one job: the base
run was stopped at 15,650 files after 7,119 s, so it has no result. The walk order is deterministic, so both sides read
the same 6,000 files.

The "Moved" column comes from `census/units.py` (per unit: the lowering refusal and the first non-environment finding
rule, before against after). `node langs/ts/census.mjs --diff <before> <after>` shows Gains 0 and Losses 0 on every
reading for all three roots.

| Root | Units | Entered before | Entered after | Language-refused before / after | Moved |
| --- | ---: | ---: | ---: | ---: | ---: |
| n8n | 9,610 | 2,680 | 2,680 | 4,941 / 4,941 | 0 |
| langchainjs | 6,709 | 2,766 | 2,766 | 3,113 / 3,113 | 0 |
| nexus (first 6,000 files) | 10,094 | 5,554 | 5,554 | 3,466 / 3,466 | 0 |

No unit stopped, entered or changed its stop reason. That is expected: the census counts admission (the lint and the
lowering), and the fix changes only how an admitted unit's call is translated. A shared instance's method call becomes
step 18's transition, so a proof may be withdrawn but no unit is refused. The JSON files and logs are in
`/root/lanes/core-constructors/census/`.

## Defects met, reported and not fixed (outside this lane's construct)

1. Checked, not a defect: in an exported class, `this.m()` after `patch(this)` is already a transition (`sealedMember`),
   so lane A does not prove it (a scratch pair, 5 checks, ALL PASS, deleted afterwards).
2. Lane B: `Tag.constructor`, where `id = seq++` in the parent and `id = seq` in the candidate (a module `let seq`),
   gives PASS-bounded. The constructor's write to module state is not part of what lane B compares for a constructor
   unit. It was found while probing, and no pair holds it.
3. Field presence under `useDefineForClassFields`: an optional field with no initializer starts missing (`PMissing`)
   in the heap core, and lane B agrees because it emits at ES2020. A project whose target is ES2022 or later (or that
   sets `useDefineForClassFields`) defines the key with `undefined` at run time, which `in`, a spread or the reachable
   graph can observe. Both lanes then read the emit mode, not the project's. Not changed here.

## What is left

- Defects 2 and 3, for the lanes that hold lane B's module-state comparison and the class-fields emit mode.
- A whole nexus census, which needs a job longer than 2 hours.
- Parameter properties with a default (`constructor(public x = 0)`) stay refused (`parameter property form`), and so
  do `super` and `extends` in the heap core, as section 21 states.
