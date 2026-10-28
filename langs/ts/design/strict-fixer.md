# The strict fixer: type errors under strict mode fixed by edits TypeScript erases

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
- guard (`convert/strict-guard.mjs`, rule `ts-strict`, TS2531, TS2532, TS2533, TS18047, TS18048, TS18049): the value
  the compiler names takes `!` when it is the receiver of a member read, an index read or a call. There JavaScript
  throws a TypeError on null or undefined before the edit and after it, at the same read.
- cast (TS2352): listed as a migration, never applied. Every other strict error is listed with its compiler message.

Why not `?.` or an early `throw`, as the plan first named: `u.name?.length ?? 0` returns 0 where the parent throws, and
`if (u.name === undefined) throw new Error()` throws another value. Both are a behaviour change on the absent input;
the pair carries the first as `wrong.ts`, a WITNESS. Why only a receiver: `return u.name!` would let undefined flow on
typed as a string, and translate.mjs reads `x!` on an absent value as an uninterpreted value of the type
(`ext_absent_string()`), which can prove `u.name!` equal to `u.name! + ""` (undefined against "undefined"). That is
the translator's reading, reported to the lead; the fixer adds no value-position `!`.

## The proof

pr.mjs cannot prove these edits: translate.mjs refuses a parent unit that holds the strict error (lane A "outside the
subset"), and an annotated parameter changes the unit's Dafny signature (`Any` to a number: ASK:interface). So
`convert.mjs` proves a file whose emit is unchanged by erasure: one row per changed unit, PASS-proved, reading
`erasure`. A file with other rewrites too goes through pr.mjs as before. Once converted, the unit is inside the subset
and lane A reads it; check.mjs proves it against itself (the pair), e.g. for `nameLength`:

```
function name_length_candidate(u: User): int
{
  |(var nn_q5t3 := u.name; if nn_q5t3.Some? then nn_q5t3.value else ext_absent_string())|
}
```

## What stays refused

A strict error no erased edit fixes: a union the code never narrows (TS2339), an absent value used as a value (TS2322,
TS18048 on an operand), a rejected cast (TS2352), a missing initializer, a lib or JSX setting. The lint keeps `ts-strict`
with the compiler's message; the converter lists it. Escape fixture `fixtures/escapes/ts/strict_unfixable.ts`.

## Lane B

Lane B runs the emitted JavaScript, which the edit does not change; its inputs draw the absent value for an optional
field (the pair's `wrong.ts` WITNESS on `nameLength` is that draw).

## Instances (census at 6661006)

- nexus `apps/frontend/src/modules/Vibe/components/VibeStatusBadge.tsx:247` `'presentation' is possibly 'undefined'`
- nexus `apps/frontend/src/modules/Analytics/dashboard-period.ts:228` `'windowDays' is possibly 'undefined'`
- nexus `apps/nexus-gpt-outlook/src/taskpane/taskpane.ts:43` `Object is possibly 'null'`
- n8n `packages/nodes-base/nodes/KoBoToolbox/GenericFunctions.ts:193` `'response.geolocation' is possibly 'null' or 'undefined'`
- n8n `packages/nodes-base/nodes/MongoDb/GenericFunctions.ts:138` `'item._id' is possibly 'undefined'`
- nexus `apps/frontend/src/common/components/Chat/ChatMessage/DisplaySource.tsx:69` TS2352: a cast, listed

## Measured

The census on a clone of each bench tree, every file holding a possibly absent read converted with the strict
transforms alone (`results-strict-fixer/measure-strict.mjs`); files the run did not touch give the same findings as
before once absolute paths are masked.

| tree | files converted | edits | units inside, before / after | `ts-strict` units stopped, before / after |
|---|---:|---:|---:|---:|
| nexus | 6 | 19 | 23,753 / 23,762 | 487 / 478 |
| n8n | 8 | 22 | 4,314 / 4,314 | 383 / 383 |

Every possibly absent read in a receiver position was fixed (none left in a converted n8n file); the n8n units stay
stopped by the other strict errors of their files (missing properties, initializers, lib settings), which need a
design change.
