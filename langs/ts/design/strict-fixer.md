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
absent value used as a value (TS2322), a rejected cast (TS2352), a missing initializer, a lib or JSX setting. The converter
lists it. Since 2026-10-30 the lint keeps `ts-strict` as a refusal only for the rejected cast, the missing initializer,
the settings and every error below that is not a strict value; the first three are read at Any (section below). Escape fixtures `strict_unfixable.ts` and `non_null_assertion.ts`.

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

## 2026-10-30: a strict-mode error's value read at Any, the code as advice

The census prices "Keep strict" (ruling of 27 October): a repository built without strict loses about a tenth of its
units to compile errors that only the forced flags produce, unrelated to the change under test. Strict stays forced
(`loadProgram`); what changes is what the error means to the proof. A strict-mode error about a value says the code
used that value as a type the compiler could not confirm. TypeScript emits the code unchanged, so at run time the
value is whatever arrives, exactly as for `e as T` (type-assertions.md). That value is held at the opaque `Any`.

### The reading

`common.mjs strictValue(checker, sf, d)` names the value a diagnostic is about, or null; `assertionHeld` holds every
named value at Any, so the lint and the translator read it through one test (`typeOf` reads `assertionHeld`). The
diagnostics of a file are read in one place (`fileDiagnostics`, called by every program lean builds over a file:
`loadProgram`, `loadMany`, the apply/call normalisation, the faithful rewrite, `pr.mjs`) and remembered for the file.

| family | codes | the value held | why it has a real value to read |
|---|---|---|---|
| possibly absent | TS2531, 2532, 2533, 18047, 18048, 18049 | the expression the error spans (`u.name` in `u.name.length`) | the value is the field or local itself; the code reads it as present |
| assignability by absence | TS2322, 2345 when the source without null and undefined is assignable to the slot | the source: an initializer, the right side of `=`, a returned expression, an argument | the slot receives the source unchanged; only strict null checking objects |
| a member on part of a union | TS2339, 2551 when some member of the receiver's union declares the name | the receiver (`s` in `s.r` on `Circle \| Square`) | the receiver is one of the members at run time; the read is JavaScript's `[[Get]]` on it |

A held value goes where an assertion's value goes (an operand, a receiver, a test, a held local, the unit's result, an
argument to an outside call); in a slot that reads the asserted type (a same-file callee's parameter, a field, an
element) the unit is refused as `type-assertion`, the existing rule. Two translator mechanisms needed the held value
read whole: a read of optional storage held at Any is the option boxed (`ext_Any_of_Option_string(u.name)`), never its
payload `.value` (which only a guard that tested it may take: `narrowed`, `ident`, the opaque-record accessor); and a
call on a held receiver returns `Any`, as its uses read it, not its signature's type (`callExternal`). The lint names
each admitted error under `--advice` as `ts-strict`, with the code and the compiler's message, advisory: never a
refusal, never counted by the census.

    function long_name_parent(u: User): bool
    {
      ext_Any_length_Any(ext_Any_of_Option_string_Option_string(u.name)) == ext_Any_of_int_int(3)
    }

### Why it is sound, and the gap it shares with every any value

A wrong proof would need the reading to assume a fact of a type nobody checked: `u.name` a string, so `u.name + ""`
equal to `u.name`; or `s.r` a number. Held at Any, no such fact exists: every operation is an uninterpreted
application of the boxed value, the absent option boxed apart from every present string, so `u.name.length` and
`u.name?.length ?? 0` are different terms (pair `ts_strict_values`, `longTag`, `isAdaTag`, `long`: not proved, lane B
WITNESS), and a value differs from the same value under another operation.

What the Any reading does not carry is the TypeError a read through an absent value throws: an accessor on Any is a
total function. A candidate that drops such a read, or moves it past an outside call, proves in lane A while the
parent throws first. This is the gap every any value already has (an untyped parameter, TS7006: `const n = x.length;
return k` proves equal to `return k` on the head before this change, and subset.md says "other implicit library
exceptions remain a gap"); this reading widens it to values the compiler warned may be absent. Lane B draws absent
optional fields: `const n = u.name.length; return u.age` against `return u.age` is WITNESS. The structural fix is a
read through a held absent value as a may-fault transition (the reading `JSON.parse` has), ordered with the world;
it is not done here. The payload reading of `x!` (opaque-values.md) is sound but keys the absent outcome by the
unit's whole text, so it proves only an unchanged unit; it was not taken.

### What stays refused, and why

- A member no type of the receiver declares (TS2339 on a record, `u.nick`): the name resolves nowhere, the unit's own
  error or an environment finding (`unsupported-member` names it too). Escape `strict_value_unchecked_own`.
- A type mismatch that removing null and undefined does not cure (`const s: string = u.age`): a type error of its own,
  reported without strict too. Same escape.
- A rejected cast (TS2352), a missing initializer (TS2564), a read before assignment (TS2454), a call of a possibly
  absent function (TS2721, 2722): no value is merely unconfirmed, or the held value is called, which the
  type-assertion reading refuses anyway. Escape `strict_unfixable` keeps TS2352.
- A held value in a slot that reads its declared type: `type-assertion`, as for every assertion.

### Measured

Census of the three trees under `/root/da/census/repos/` read as they stand (no install), the head before this change
(6421be639) against this lane, each `NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs <repo> --out
<json>`; `ts-strict` units: units holding a `ts-strict` finding (the census `rules`), first refusal: units whose
first refusal it is (`refusalRules`).

| tree | units | entered, before / after | `ts-strict` units, before / after | first refusal, before / after | `type-assertion` first refusal, before / after |
|---|---:|---:|---:|---:|---:|
| driftbench | 5,479 | 2,135 / 2,136 | 78 / 66 | 44 / 34 | 491 / 500 |
| apps-starter | 472 | 73 / 73 | 2 / 2 | 0 / 0 | 46 / 46 |
| blog-studio-lambda | 999 | 329 / 329 | 9 / 9 | 6 / 6 | 84 / 84 |

On driftbench every possibly-absent finding leaves (TS18048: 7 units, TS2532: 5) and TS2345 goes from 24 units to 19;
most units it frees meet their next refusal, nine of them `type-assertion` (the held value reaches a slot that reads
its declared type), one enters. What stays is the unit's own type errors (TS2322 and TS2345 on `z.infer<any>` and `{}`
shapes, TS2339 on `{}`, TS2739, TS2366, TS2769). On apps-starter and blog-studio-lambda the strict findings are JSX
props objects whose member may be absent (TS2322 on the element: the source is the props object, not a value that
may be absent, and a props slot reads its declared type, so holding the member would meet `type-assertion`) and
`this.props` on a class component whose React types the checkout lacks (TS2339 on a class, an environment finding):
neither is a strict value. The 10.8 percent the plan quotes is a census of non-strict trees; these three are strict
trees, where the forced flags add little.
