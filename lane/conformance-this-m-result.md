# conformance-this-m: result

Lane of the night wave 2026-10-31. Base lean `b5c074508` (lead-b5c07450). Branch `lane/conformance-this-m`.

## What was found

Section 4 of `langs/ts/design/conformance-readings.md` (`this.m()`: the class's own m only on a receiver no subclass
can hold) was already implemented at the base (`common.mjs sealedMember`, `translate.mjs thisRequest` and
`inheritedSameFileMethod`, `heap.mjs thisReplaceable`, pair `override_outside`). The new pair measured it on the
section's own examples and several shapes it names without a pair: `@final` on the method, a private name `#m`, a
class-level `@final` defeated by a same-file subclass, an override two levels down, `protected`, `this.m()` in a
constructor, inside an arrow of a method, and an m inherited from a same-file base. Lane A held every row except
`#m`. Lane B was wrong on every class holding a private name.

## What was done, and why

1. **Lane B: a receiver a class holding a private name can have** (commit `6d7eb7cb4`). Lane B made a method's
   receiver as a Proxy over `Object.create(Cls.prototype)`. A class whose chain declares a private name (`#x`) is
   nominal: a value of it is an object its constructor made, which carries the private brand (ECMA-262 7.3.31). The
   proxy has no brand, so `this.#x` threw there, on no value of the type. Two failures followed:
   - a false WITNESS when the candidate inlined `#base` (`Named.run`: only the parent threw);
   - a vacuous PASS-bounded when both sides read `#base`, a changed `#base` included (`Shifted.run`: both threw alike,
     so a real difference was missed).

   The fix is one mechanism. `exec/spec.mjs` adds `branded`: the chain (every class declaration the checker resolves
   along `extends`) declares a non-static private name, and the value is the required parameter count of the
   constructor the chain runs. `exec/run.mjs` pickUnit then makes the receiver with `Reflect.construct(Cls, [])`
   before the observation, when that count is 0. Otherwise the unit asks (`private-brand`), never a witness; a
   throwing constructor asks too. No name of a unit, file or repository is involved.
2. **Pair `langs/ts/tests/pairs/this_method_override/`** (same commit): 22 units, 34 checks. Its `expect.json` was
   written from the section before any change.
3. **Design note** (commit `87f161d95`): a dated subsection under section 4 (what was read, what stays refused and
   why), plus the coverage rows `ThisKeyword` and `PrivateIdentifier` in `design/coverage-readings.json` and
   `design/coverage-matrix.md`.

## Elements added

| element | where | why |
|---|---|---|
| `branded` in the lane B spec | `langs/ts/exec/spec.mjs` | the fact "this class's values carry a private brand" and the constructor's required arity, read from the declarations |
| branded receiver branch | `langs/ts/exec/run.mjs` pickUnit | a real instance as the receiver, made before the observation; ASK `private-brand` when the constructor needs arguments or throws |
| pair `this_method_override` | `langs/ts/tests/pairs/` | the section's cases, red then green |
| section 4 subsection 2026-10-31 | `langs/ts/design/conformance-readings.md` | the reading and the refusals |
| `PrivateIdentifier` row, `ThisKeyword` row | `design/coverage-readings.json`, `design/coverage-matrix.md` | the reading today and the faithful one |

## Red and green

Before the change (base exec, the same pair; `node langs/ts/exec/run.mjs --parent parent.ts --candidate candidate.ts
--unit <u> --n 30 --no-project`):

- `Named.run`: WITNESS (expected PASS-bounded; a false witness);
- `Shifted.run`: PASS-bounded (expected WITNESS; a missed difference, 842 against 844 on input 420);
- `Counted.run`: PASS-bounded (expected ASK; vacuous, every input threw on both sides).

The first pair run on the base also failed `Equal_named_run proved`. That row is now expected false; see the finding
below.

After: `JOBS=1 node langs/ts/tests/run.mjs --pair this_method_override` gives TOTAL 34 checks, ALL PASS.

## Regression (each `JOBS=1 node langs/ts/tests/run.mjs --pair <p>`, at `6d7eb7cb4`)

| pair | checks | result |
|---|---:|---|
| override_outside | 13 | ALL PASS |
| this_receiver | 13 | ALL PASS |
| this_param | 23 | ALL PASS |
| inherited_method | 27 | ALL PASS |
| heap_methods | 10 | ALL PASS |
| object_methods | 47 | ALL PASS |
| exported_object_methods | 13 | ALL PASS |
| conformance_call | 8 | ALL PASS |
| heap_canonical | 13 | ALL PASS |
| type_tests | 59 | ALL PASS |
| copied_argument | 10 | ALL PASS |

## Census

Command, per root and side (before = a detached worktree at `b5c074508`, after = this branch):
`NODE_OPTIONS=--max-old-space-size=12288 node <checkout>/langs/ts/census.mjs /root/da/census/repos/<root> --out <root>.<side>.json --report <root>.<side>.md`,
then `node langs/ts/census.mjs --diff <root>.base.json <root>.tree.json`.

| root | side | units | inside (entered) | environment-blocked | language-refused | readings diff |
|---|---|---:|---:|---:|---:|---|
| n8n | before | 9610 | 2680 (27.9%) | 361 | 4941 | |
| n8n | after | 9610 | 2680 (27.9%) | 361 | 4941 | every reading: gains 0, losses 0 |
| nexus | before | not completed | | | | |
| nexus | after | not completed | | | | |
| langchainjs | both | not run | | | | |

n8n: the `.md` reports of the two sides are byte-identical (`cmp`). The `.json` differs only in `"seconds"` (536
against 639). No unit was stopped, moved to entered, or moved to another stop reason.

The census does import `exec/spec.mjs` and `exec/run.mjs` (49 modules reachable from census.mjs), so "lint-only"
is shown by the n8n numbers above, not assumed. The change is reached only by lane B's pickUnit and by a spec field
the census does not count.

nexus and langchainjs: not completed. On this shared machine one nexus side takes longer than the 2-hour background
limit. The first batch's nexus base was killed (exit 137) after its totals (13250 files, 22104 units, 12047 inside,
3312 s), and the head was stopped at the limit (10250 files reached). A rerun of nexus base was terminated (exit 143)
at the limit after 17150 files, 29403 units, 15833 inside, 6817 s. These partial counts are not comparable between
the two sides (different file counts reached), so they are not reported as a before and after. langchainjs, larger,
was not started. The lead's merge run can produce these counts with a longer allowance.

## Findings (reported, not fixed)

- **Lane A: a `#m` method is no unit.** `common.mjs classMethodUnits` takes identifier names only, so the section's
  "m is a private name" has no own unit to read. `this.#m()` stays the external of the receiver named by the bare
  name (`ext_call_args_<T>_<m>`, no code key). The cell audit's obligation `this #m: read without a transition`
  turns any lemma into `ASK:obligation`. I checked that this is sound: with `#base` changed and `run` unchanged, both
  sides translate to the same text, and the obligation withholds the proof. It is not complete: `Named.run` is not
  proved, and the pair says so (`named_run: false`). Making `#m` a unit changes the unit list that 65 call sites of
  `classMethodUnits` and `topLevelFunctions` share (the lint, the census, the reports, and lane B, which cannot call
  `#m` from outside). That belongs to the lane that owns the unit list. I asked the lead; with no answer in 120 s, I
  decided this and said so.
- **Lane B: a branded class whose constructor takes arguments asks** (`private-brand`). Drawing the constructor's
  arguments from its parameter types, as the constructor unit already does, would decide those receivers.
- **check.mjs `// ASSUME` lift**: unchanged here (section 4 already names it as the lead's finding).
- **programs.mjs** already skips sequences over a class holding a private name, as PASS-bounded with
  `skipped: 'a private name (#field)…'`. Under the new receiver it could run them. Not touched.

## Defects met

- `git commit` had no author identity in this worktree. I committed with `-c user.name/-c user.email` set to the
  identity of the existing commits; no config was written.
- The first census batch, all three roots in one 2-hour background command, ran out of time: nexus base was killed
  (exit 137) after printing its totals (13250 files, 22104 units, 12047 inside, 3312 s), and nexus head was stopped
  at the limit. I reran nexus one side per command.
