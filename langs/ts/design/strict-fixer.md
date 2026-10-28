# The strict fixer: the any-type annotations TypeScript erases, every strict error listed

The construct: a file that does not compile under `strict: true`, so the lint names `ts-strict` and lean's proof
lane leaves the unit out. `return u.name.length` with `name?: string` (TS18048), `cfg.limits.max` with an optional
`limits` (TS2532), `(s as number)` on a string (TS2352). Beside them, a value typed any (`function f(x)`, `const n:
any = ...`): admitted, but read as one opaque `Any` and given a proposal by `any-type` (`lint/any-type.mjs`).
Strict stays forced: the fixer changes the code, never the compiler options.

## The reading: an edit that the emit erases keeps behaviour

TypeScript's emit removes type syntax: an annotation, a non-null assertion `x!`, a parameter's type. A file whose
emitted JavaScript is the same text before and after an edit runs the same code on every input, so every unit of it
behaves as its parent (the run-time semantics is ECMA-262's, of the emitted program). The strict family keeps only such
edits, and checks it at each site and again for the whole file: `erased()` in `convert/strict-annotate.mjs` runs
`ts.transpileModule` on both texts with decorator metadata on (a parameter or field type of a decorated class becomes
a run-time value, `design:paramtypes`) and class fields defined and not defined, and compares the outputs. A site whose
emit changes is listed, never applied.

- annotate (`convert/strict-annotate.mjs`, rule `any-type`): a proposal that is one concrete type (a primitive, an array
  of one, a named type; never a union, a record literal, a function type, `unknown`) is written where the finding's fix
  says. The converter's round undoes it when a new type error appears in the file.
- guard (`convert/strict-guard.mjs`, rule `ts-strict`): lists every site. A possibly absent read (TS2531, TS2532,
  TS2533, TS18047, TS18048, TS18049) is a narrowing a person writes; a rejected cast (TS2352) a migration; every other
  strict error a design change, with the compiler's message.

No automatic fix exists for an absent read. `x!` is erased, but lean refuses it (`non-null-assertion`, common.mjs
`nonNullOnAbsent`, shared by the lint and the translator): JavaScript checks nothing there, the absent value flows on
or the read through it throws, and reading it as some value of the type proved `u.name!` equal to `u.name! + ""` and
a read through `u.name!` moved past an outside call equal to its parent. `u.name?.length ?? 0` returns 0 where the
parent throws, and an early `throw` throws another value: a behaviour change on the absent input (`wrong.ts`, WITNESS).

## The proof

pr.mjs cannot prove an annotation: the parameter's Dafny type changes (`Any` to `int`: ASK:interface), and a parent
unit holding a strict error is outside lane A. So `convert.mjs` gives a file whose emit is unchanged the verdict
PASS-erased per changed unit, a named step of its report; the certificate holds the settings, the emit hashes on both
sides and the self-proof: check.mjs on the converted unit against itself, where lane A reads it with its type. A file
with other rewrites too goes through pr.mjs as before. `scaled` before and after (pair `strict_fixer`):

```
function scaled_parent(x: Any, k: int): int
{
  (ext_op_times_Any_Any_Any(x, ext_Any_of_int_int(k)) + 1)
}
function scaled_candidate(x: int, k: int): int
{
  ((x * k) + 1)
}
```

## What stays refused

A strict error no erased edit fixes: an absent read (TS18048, TS2532), a union the code never narrows (TS2339), an
absent value used as a value (TS2322), a rejected cast (TS2352), a missing initializer, a lib or JSX setting. The lint keeps `ts-strict`
with the compiler's message; the converter lists it. Escape fixtures `strict_unfixable.ts` and `non_null_assertion.ts`.

Lane B runs the emitted JavaScript, which an annotation does not change; it draws the absent optional field (`wrong.ts`).

## Instances (census at 6661006; each absent read and cast is listed, none is rewritten)

- nexus `apps/frontend/src/modules/Vibe/components/VibeStatusBadge.tsx:247` `'presentation' is possibly 'undefined'`
- nexus `apps/frontend/src/modules/Analytics/dashboard-period.ts:228` `'windowDays' is possibly 'undefined'`
- nexus `apps/nexus-gpt-outlook/src/taskpane/taskpane.ts:43` `Object is possibly 'null'`
- n8n `packages/nodes-base/nodes/KoBoToolbox/GenericFunctions.ts:193` `'response.geolocation' is possibly 'null' or 'undefined'`
- n8n `packages/nodes-base/nodes/MongoDb/GenericFunctions.ts:138` `'item._id' is possibly 'undefined'`
- nexus `apps/frontend/src/common/components/Chat/ChatMessage/DisplaySource.tsx:69` TS2352: a cast, listed

## Measured

Census on a clone of each bench tree after every file holding a strict finding went through the strict transforms
alone (`results-strict-fixer/measure-strict.mjs`), against the census of the same lean commit on the trees as they are.

| tree | files read | annotations written | units inside, before / after | `ts-strict` stopped, before / after |
|---|---:|---:|---:|---:|
| nexus | 625 | 47 in 16 files | 23,750 / 23,750 | 487 / 487 |
| n8n | 315 | 31 in 26 files | 4,260 / 4,260 | 382 / 382 |

An annotation removes an `any`, never a strict error, so `ts-strict` does not move: the absent reads it could have
removed are listed. The first run, with the guard writing `!` before `non-null-assertion` existed, moved nexus from
487 to 478; that gain read `x!` unsoundly and is withdrawn.
