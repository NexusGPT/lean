# parameter-property-default: result (2026-10-31)

Branch `lane/parameter-property-default`, base lean `09032a594` (lead-09032a59).

## Commits

| Commit | What |
| --- | --- |
| 9b5d13c98 | pair `constructors` extended (red: 1 of 41 at base, `Equal_knob_twice`) |
| 16e69ab2e | heap core: a parameter property with a default keeps its class a record (`translate/heap.mjs classWhy`) |
| 46d9276a6 | `design/heap-stage5.md` 21: dated note, 2026-10-31 |
| (this file) | `lane/parameter-property-default-result.md` |

What I found: the brief places `parameter property form` in `lint.mjs`. It is not there. The lint already admitted
`constructor(public x = 0)`, and the ordinary lane already read it as the brief's rule asks: an `Option` parameter, its
default, then the field store `this.x = x` (`translate.mjs ctorPrefix`, `sigParams`). Rows `Knob.constructor`, `knob`,
`knobbed` were proved at base. The refusal is only in the heap core, in `classWhy`. It refused the whole class: no
method of a class with a defaulted parameter property, and no unit holding one of its instances, could enter the core.

The reading (16e69ab2e): `classWhy` admits a parameter property with a default. The field has the parameter's type
either way, so the class's record is unchanged. An optional one (`public x?: T`) and a pattern stay refused. The
constructor unit itself still takes no defaulted parameter in the core (`parameter form`, the same as every unit).
So it, and every unit that constructs the class, keeps the ordinary lane's default reading. No rule names a
repository, a file or a unit.

## Pairs

`constructors`, `JOBS=2 node langs/ts/tests/run.mjs --pair constructors`: 41 checks. At 9b5d13c98 (base reading),
1 FAILED: `Equal_knob_twice proved` (real lemma not proved). At 16e69ab2e: ALL PASS.

| Unit | Lane A | Lane B | What it shows |
| --- | --- | --- | --- |
| Knob.constructor | proved | PASS-bounded | `public turn = 0, readonly label = "knob"`, the body stores through a local |
| Knob.twice | proved (heap core; unproved at base) | | the turn doubled in place against through a local |
| knob | proved | PASS-bounded | `new Knob(n)` |
| knobbed | proved | PASS-bounded | `new Knob()`: the default taken |
| Dial.constructor | not proved (interface: default 1 became 2) | WITNESS | a changed default |
| dialed | not proved | WITNESS | `new Dial().step` |

Knob's defaults are textually the same on both sides. The interface check withholds any change in a default's text,
even when the value is equal (`0` against `1 - 1`, tried first: withheld). That is section 0b's reported rule, not
changed here.

## Regression

All at 16e69ab2e, `JOBS=2`, one at a time:

| Pair | Checks | Result |
| --- | ---: | --- |
| constructors | 41 | ALL PASS |
| class_fields_define | 7 | ALL PASS |
| constructor_module_write | 4 | ALL PASS |
| heap_canonical | 13 | ALL PASS |
| type_tests | 59 | ALL PASS |
| copied_argument | 10 | ALL PASS |
| heap5_ctors | 14 | ALL PASS |
| class_new | 17 | ALL PASS |
| heap5_handles | 12 | ALL PASS |
| class_super | 8 | ALL PASS |
| heap5_decorators | 9 | ALL PASS |
| heap_methods | 10 | ALL PASS |
| new_unit | 30 | ALL PASS |
| class_statics | 12 | ALL PASS |
| class_handles | 1 | FAILED, and the same at base |

`class_handles` is not this lane's regression. The translator writes no `parent.dfy`: `parent.ts:80` (`spill`) is
refused with `alias-mutation`, which stops the whole file. The pair holds no parameter property. With base's
`heap.mjs` (`git show 09032a594:…`), the translator refuses it identically. The likely origin is dac8c5403 (array
copies: a write through a name another name holds is refused in the value reading), which reached the base in the
merge 7f4831e74. Reported to the lead and not fixed here.

## Census

n8n only, each run alone behind the gate (`pgrep -fc "^node .*census.mjs"` below 6 and 12 GB available). The before
side is a detached worktree at 09032a594; the after side is the tree at 46d9276a6. Logs are in
`/root/lanes/parameter-property-default/census/`.

Admission census: `NODE_OPTIONS=--max-old-space-size=12288 node <side>/langs/ts/census.mjs
/root/da/census/repos/n8n --out n8n-<side>.json --report n8n-<side>.md`. Both runs exit 0.
`census.mjs --diff`: Gains 0 and Losses 0 on every reading. This census does not record heap-core reasons, so
`parameter property form` is 0 on both sides.

Heap-core census: `node <side>/langs/ts/design/heap-core-census.mjs <in>/concepts-all.json n8n-<side>.json --resolve`.
`/root/da/census/concepts/` is empty, so the input is a one-repository copy with roots `[/root/da/census/repos/n8n]`,
the same on both sides:

```text
n8n before: files 7812, units 9610, core 59, own 239; "class: parameter property form": 33, "class: a field without a shape": 2462
n8n after:  files 7812, units 9610, core 59, own 239; "class: parameter property form": 18, "class: a field without a shape": 2477
```

The count falls by 15 and no unit is lost. The 15 now stop at the next class reason: their defaults hold values of
no shape, such as `readonly logger = Container.get(Logger)`. No other reason moved.

langchainjs: not run (the brief names n8n). nexus: not run, memory.

## What is left

- The 18 left in n8n: optional parameter properties (`public x?: T`) and patterns, still `parameter property form`.
- A defaulted parameter in the heap core, for any unit and the constructor among them. While that is missing, a
  defaulted constructor, and every unit that constructs its class, stays in the ordinary lane.
- The interface check compares a default's text. An equal value written another way is withheld (section 0b).
- Observed in the code and the emitted Dafny, not run as a pair: the ordinary lane stores the field initializers
  before the parameter properties (`ctorPrefix`: `initFields`, then the parameters). The heap core stores the
  parameter properties first. TypeScript's ES2020 emit (not define) assigns the parameter properties first, so an
  initializer that reads `this.x` of a parameter property may be read in the wrong order by the ordinary lane.
- `class_handles` red at base (above).
