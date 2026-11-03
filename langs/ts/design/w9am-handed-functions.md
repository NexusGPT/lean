# A function that hands out a function gets a test that calls it (lane w9am)

The test writer (`exec/new-test.mjs`, `design/new-unit-test.md`) restates a unit's closed calls as a test. Before this
lane it dropped every case whose call handed out a function (`drives`) and every call that was handed a callback
(calling a drawn function argument is a request of the world, so such a call was never closed). This note gives the
three mechanisms that remove the limit, the rule each keeps, and what still stays out.

## The cause

1. `runNew` kept `drives` as a boolean, and `writeNewTest` dropped every case with `drives: true`. The drive records
   (`run.mjs driveOne`: arguments, returned or threw, `again`, `omitted`) never reached the writer.
2. Even with the records kept, a drive's arguments are drawn from the unit's pools (`fake.mjs drawn`). About two in
   five are a fake, and the rest ignore the handed-out function's declared parameter types, so `makeAdder(2)` was
   driven on `[]`, `null` and `""`. A test that passes those does not type-check where the unit does.
3. A method was driven with a fake `this`, so `{ n, inc() { this.n += 1 } }` asked the world on every drive, while a test
   calls it as `out.inc()`.
4. A callback lean drew (`gen.mjs` `function`: a fake at a path ending `#fn`) answers each call, and the call is a
   trace entry. A unit that calls the callback it is handed (`mapAll(items, f)`) therefore had no closed call at all.

## Mechanism 1: drives as assertions (`new-test-drives`)

`runNew` keeps every drive record of a case (`drivesOf`). Each record gets the handed-out function's formal parameter
count (`formalsOf`: the parameters of the function's own text, `null` when it has a rest parameter or names
`arguments`) and whether it is async. `handedBody` writes one such case:

    const out = counter(0);
    expect(out).toEqual({ next: expect.any(Function), reset: expect.any(Function) });
    expect(out.next()).toEqual(1);
    ...

- The value the call returned is asserted as it was before the drives ran (`observation.outcome`, rendered before
  `driveWindow`), because a drive may write into it (`tally`'s `this.n`). Each position that holds a function is
  `expect.any(Function)`. In the node:assert dialect, each part is asserted at its path:
  `typeof out.next === 'function'`, plus the sorted keys.
- Each drive is replayed in lean's order: the drawn call, the `again` calls, then the omitted forms. Calls go to the
  function's path in the returned value (`handlesIn`), or in what an earlier drive returned (bound as `r1`, `r2`, ...).
  The arguments are the ones its formals see; a drawn argument past the formals is one no code of it can read. The
  test makes every call lean made, so the statements the drives completed (the probes' hits are read across the whole
  observation, drives included) are statements the test completes.
- A drive that threw is `expect(() => out(a)).toThrow(msg)`. An async function, or a drive that returned a named
  promise, is awaited (`expect(await out.get(k))`, `rejects.toThrow`), as `driveCall` awaited it.
- The mutant replay (`killsOf`) compares the drives too (`driveView`: each call's arguments and outcome), so a mutant
  inside a closure is killed only when a drive the test makes tells it apart.

A case stays out, with its reason counted in the refusal (`WHY`):

- a drive that asked the world (its trace holds a request that is not a call of a spied callback, or it armed work):
  "a handed-out function whose outcome holds a value of the world";
- a drive lean could not finish, or a class, iterator or hook drive: "a handed-out function lean could not drive to
  the end, a class, an iterator or a hook";
- a handed-out function no path from the returned value reaches (one held only by the module, or one the unit handed
  to the world);
- a thrown value that holds a function.

Lane w9al's world stubs are not merged. A drive that asked the world therefore stays out, and nothing of a stub is
built here.

## Mechanism 2: drive arguments by the declared types, a method on its holder (`new-test-drive-types`)

On the candidate-only path, `handedDraws` installs a hook (`env.handedAt`) that `driveOne` reads. The hook finds the
driven function by identity in what the unit returned, through own data members and elements. Failing that, it looks
in what a drive of an already-found function returned (`env.handedResult`). It returns two things:

- the declared parameters at that route (`spec.mjs handedParams`): the unit's declared return type, awaited, then each
  member, element or `HANDED_CALL` step, then the single call signature there;
- the holder (the object or array the function was read from).

The drive then draws each argument with `env.typed(path, spec, optional)`. This is the same seeded generator the
unit's typed answers use: a number for `(x: number) => number`, sometimes `undefined` for an optional parameter. A
method is called with its holder as `this`, exactly as `out.inc()` is.

No pair sets the hook, so pair runs and lane B's drives are unchanged. A function found nowhere keeps lean's drawn
arguments and its fake `this`.

The writer then requires every printed call to be admitted by those declared parameters (`driveAdmitted`, through
`declared.mjs member`, the same three-valued reading that admits the unit's own inputs). Every argument must be
'yes'; a left-out argument must be optional; extra arguments are refused unless there is a rest parameter. This is
the same rule a closed call meets for the unit itself: a test that calls a function only as its type allows
type-checks wherever the unit's declaration does.

## Mechanism 3: callbacks the unit calls (`new-test-callbacks`)

`fake.mjs` records what each call of a fake answered (`env.callAnswers`: `<path>()#<k>` maps to the answer and whether
the call wrote into what it was handed, from `writeHanded`'s count).

`callbackCalls(shown, requests, env)` reads every request of a case in time order (`requestsOf`: the call's own, then
each drive's). When every request is a call of a drawn function argument (a `$fake` of the arguments whose path ends
`#fn`), each answer is known, no call wrote into its arguments, and no call handed the callback a function of the
unit's (lean's fake runs such a function, a spy would not, so its statements would count for a test that never
completes them), the case carries `callbacks: [{ path, calls: [{ args, returned }] }]`.

A call whose only requests are such calls is not closed. It becomes a case of the test alone (`world: true`). It does
not count in `reach.closed` and feeds no other fact (fault, shape, NaN, parameter trials). Those facts read exactly
the calls they read before.

The test passes a spy per callback, named after the unit's parameter. It answers what lean's fake answered, in call
order, and the calls are asserted at the end:

    const f = vi.fn().mockReturnValueOnce(1000000000);
    expect(mapAll([""], f)).toEqual([1000000000]);
    expect(f).toHaveBeenCalledTimes(1);
    expect(f).toHaveBeenNthCalledWith(1, "");

jest uses `jest.fn()` (imported from `@jest/globals`). node:test and mocha use a plain recording function and
`assert.deepStrictEqual(fCalls, [[""]])`. In a TypeScript test it takes `unknown[]` annotations, and a spy that is
never called answers `any`, so it stands for every callback type.

A callback the drives call (`deferred(f)` returns `() => f() + 1`) is answered by the same spy, in the same order.

The runner model (`new-tests.mjs`) models the spy (`makeSpy`): `vi.fn` / `jest.fn` with
`mockReturnValue(Once)`, `mockImplementation(Once)`, `mockResolvedValue(Once)`, `mockRejectedValue(Once)`,
`mockClear`, `mockReset` and `mock.calls` / `results` / `contexts`. It also models the matchers
`toHaveBeenCalled`, `toHaveBeenCalledTimes`, `toHaveBeenCalledWith`, `toHaveBeenNthCalledWith` and
`toHaveBeenLastCalledWith`, and their `toBe*` aliases. The names are the runners' own, the ones lane w9al's stubs
assert with; one model serves both. A spy replaces nothing of the code's world, so a PR test that uses `vi.fn()` now
runs where it was "not modelled" before. Module mocks, `spyOn`, timers and the clock stay `MOCKS` (new:coverage).

## The record

`new:proposed-test` gains `drives: { cases, calls }` (the kept cases that call a handed-out function, and the calls
the test makes) and `callbacks: { cases, calls }`. `closed` counts the closed calls only, so a callback case is in
`usable` and not in `closed`.

The refusal names each reason with its count, for example "24 closed call(s), none a test can restate by value:
24 a handed-out function whose outcome holds a value of the world (needs a stub)".

## The type check

The generated tests of every fixture, and of seven more shapes (a curried function, an async method, a method on
`this`, an array of functions, two callbacks, a callback answering an object, a function with an optional parameter
that throws), type-check under `--strict` against the fixture with a minimal `vitest` / `node:test` declaration (0
diagnostics, 18 files). The `makeAdder` test written under `LEAN_BREAK=new-test-drive-types` does not: `out([])` and
`out(null)` are 3 diagnostics.

## What stays out

- An object's prototype methods (a class instance): lean renders an instance by its own fields and never drives its
  prototype's methods (they are no escape), so the test asserts the fields only.
- The drive order is lean's: every call of one function, then the next. `counter`'s test calls `next` three times and
  then `reset` three times. A `next` after `reset` would need lean to drive differently (run.mjs, shared with lane B).
- A callback whose answer is a value of the world (a fake object it returns and the unit reads), a call of it that
  faulted on its seeded draw, or one that wrote into the objects it was handed.
- A function the unit hands out only by writing it into an argument or a module binding: the test reaches it by no
  path from the returned value ("reaches by no path").
- Timers (`debounce`): lane w9al.
