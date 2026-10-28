# Opaque values: an absent value is read as absent at the read

The construct: a `let` declared without an initializer (`let v: T;`, `let v!: T;`), and the non-null assertion `x!` on
a value whose type admits undefined or null. ECMA-262: a `let` binding without initializer is initialised to undefined
when its declaration runs (14.3.1.2); `x!` is erased by TypeScript's emit, so it checks nothing. `undefined + 0` is NaN
(ToNumber(undefined) is NaN, 7.1.4), `return v!` returns undefined, and `v!.x` throws a TypeError (GetValue on
undefined). TypeScript checks that a plain read of a `let` follows a write, but assumes the variable assigned under
`v!`, for every read of `let v!: T`, and for a read inside a nested function, and it does not see a write a nested
function makes (`let v: number; const set = () => { v = x; }; if (x > 1000) set(); return v!;`).

## The reading

`common.mjs` holds the shared test, used by the lint and the translator:
- `absenceCarried(d)`: a `let` without initializer whose definedness TypeScript does not fix (a read it did not check,
  or a write inside a nested function). Its Dafny type is `Option<T>` (`Nullish<T>` when T admits null), starting at
  `None` (`Nullish.Undef`); a write is `Some(e)`. A local procedure's write is spliced at its call (local-procedures.md),
  so the option holds exactly what the flow wrote.
- `payloadRead(n)`: `x!` on a parameter or local whose type admits absence, or a read of a carried let TypeScript did
  not check whose type there excludes absence. The value read must be present.
- `payloadStatement(n)`: the statement whose start tests that read: a return, a declaration, an expression statement
  or an if condition of the unit's own flow (reached through blocks and if branches only), in a unit that is neither
  async nor a generator and returns a value, and that does not write the variable.

The translator (`absenceGuard`, before `tr`) tests the option before such a statement. Where it is present the read is
its payload (`v.value`, which Dafny checks); where it is absent the unit's result is one bodiless value named by the
whole file's text, `absent_read_<T>_<sha256 of the file>`. Two different files never share that name, so a lemma whose
absent path is reachable is not proved; the same file agrees with itself. lateInit (parent), on its absent path:

```
var v: Option<int> := None;
var v := if x > 1000 then (var v: Option<int> := Some(x); v) else v;
if !v.Some? then ext_absent_read_int_6d31018be2d12a26() else v.value
```

## Soundness

A wrong proof needs the absent value to meet an operation that is exact on T: `v! * 0` is 0 on any int, NaN on
undefined; `f(v!)` with `f(x) = x + 0` against `f(x) = x` agrees on every int. The reading never lets the absent value
reach T: the absent path ends the unit at the guard with an opaque result keyed by the file, not by the unit's text
(a unit's text alone would equate `this.f(v!)` across a changed method `f`). A singleton result type (void, Unit) would
make two opaque results equal, so such units are refused, and so are async and generator units (their result is not
the value). Dafny verifies `v.value` under the guard; a plain read TypeScript checked follows a write in the unit's
own flow, which the option holds as Some. A cost, not a risk: on the absent path two equal behaviours are not proved
(optPlus: `x! + 1` against `(x! + 1) * 1`, NaN on both sides).

## What stays refused

- non-null-assertion: `x!` whose operand is not a parameter or local (`m.get(k)!`, `xs.find(p)!`, `u.name!.length`),
  and `x!` outside a tested statement (in a loop, a try, a switch, a nested function). Escape
  `fixtures/escapes/ts/opaque_values.ts` (`x!` in a loop), `non_null_assertion.ts` (`u.name!.length`).
- definite-assignment: a carried let declared inside a try, a switch, an async or a nested function, and a payload
  read of it outside a tested statement (a read in a nested function). Escape `definite_assignment.ts`.

Lane B runs the emitted JavaScript: optional parameters draw undefined, and lateInit is witnessed at x = 1000, where
the closure did not run; the draw needs no change.

## Instances (nexus bench tree)

- `apps/frontend/src/modules/UltimateCue/session/conversation-identity.test.ts:10` `let resolve!: (value: T) => void`,
  written by a Promise executor: carried; a call through it is a payload read, opaque while the executor's write is not
  read by the flow.
- `apps/backend/src/_common/streaming/durable-stream/__tests__/durable-stream.spec.ts:907` `let resolveSlowRenew!`: the same shape.
- `tools/nexus-studio/server/src/lib/seed-service.ts:73` `return existing!;`: a payload read of a local, tested before the return.
- `tools/mission-control/server/src/services/schema-explorer/prisma-schema.parser.ts:52` `let em: RegExpExecArray | null;`
  read with its absence in a loop condition: not carried (TypeScript fixes every read), reading unchanged.
- `scripts/typecheck-guards.ts:152` `let text: string;` assigned in a try: not carried, reading unchanged.

## Measured

See the lane report (harness/lanes/opaque-values.md): the census before and after on both trees, the translation
sweep of every pair side, and the pair probes.
