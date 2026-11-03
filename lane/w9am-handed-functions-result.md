# Lane w9am-handed-functions: result

Branch `lane/w9am-handed-functions` from `lane/new-unit-test` f5d944bacc. Commits: d4d0a350e1 (the three mechanisms,
the checks, the pair), aee24d2b4b (review fixes: no spy for a callback call that hands the callback a function of the
unit; a value holding a function is bound once; a TypeScript spy that is never called answers `any`), the design note
commit, then 431df2fc45 (a drive on an argument of lean's world reads as the world's refusal, before the types').
Design note: `langs/ts/design/w9am-handed-functions.md`.

## The cause

`runNew` kept `drives` as a boolean, and `writeNewTest` dropped every case with `drives: true`. Three structural gaps
lay behind that:

- lean's drive arguments are drawn from the unit's pools, two in five of them fakes, never by the handed-out
  function's declared types;
- a method is driven with a fake `this`;
- a drawn callback's calls are requests of the world, so a unit that calls its callback had no closed call at all.

## The mechanisms (each behind a break, each red without it)

| break | where | what |
|---|---|---|
| `new-test-drives` | `exec/new-test.mjs` usableCase / handedBody | a call that handed out functions is a case: `const out = unit(args)`, the value asserted with `expect.any(Function)` (node:assert: each part at its path), then every call lean's drives made, in lean's order, on the arguments the function's formals see (`new-unit.mjs formalsOf`), each asserted (`toEqual`, `toBeUndefined`, `toThrow`, awaited for an async function); a function a drive hands out is bound (`r1`) and called in turn. The mutant replay compares the drives (`driveView`). |
| `new-test-drive-types` | `exec/new-unit.mjs` handedDraws, `exec/spec.mjs` handedParams, `exec/run.mjs` driveOne hook; `new-test.mjs` driveAdmitted | on the candidate-only path a driven function is found in what the unit returned (or in what a drive of a found function returned), its arguments are drawn by the declared parameter types at that route, and a method is called on its holder; the writer keeps a call only when those types admit its arguments (`declared.mjs member`, every argument 'yes'). No pair sets the hook. |
| `new-test-callbacks` | `exec/fake.mjs` callAnswers, `exec/new-unit.mjs` callbackCalls / requestsOf; `exec/new-tests.mjs` makeSpy | a call whose only requests, its own and its drives', are calls of a callback lean drew is a case of the test alone (not closed: no other fact reads it); the test passes `vi.fn()` / `jest.fn()` (node: a recording function) answering lean's answers in order and asserts `toHaveBeenCalledTimes` and `toHaveBeenNthCalledWith`. The runner model gains the spy and the call matchers (names as lane w9al's). |

The record `new:proposed-test` gains `drives: {cases, calls}` and `callbacks: {cases, calls}`. The refusal names each
reason with its count, for example "24 a handed-out function whose outcome holds a value of the world".

## Validators (output lines verbatim)

`node tests/new-unit-test.mjs` on 431df2fc45:

```
| new-reach | the statements of a unit no parent holds are probed and counted | PASS | listed 7, reached 7, missed [] |
| new-test-cases | every closed call is a case | PASS | closed 24, cases 5 |
| new-test-source | a returned value prints as its JavaScript | PASS |     expect(bucket(0, "")).toEqual(":zero"); |     expect(bucket(1, "")).toEqual(":positive(1)"); |
| new-test-check | the text runs under the runner model against the candidate | PASS | {"files":1,"selected":5,"passed":5,"failed":0,"world":0,"notModelled":0,"unsettled":0} |
| new-test-mutants | mutants planted in the unit are told apart by the kept cases | PASS | planted 15, killed 15 |
| new-test | the writer runs: a record, or the reason none is written | PASS | proposed |
| plain | a unit that asks the world gets no test, with the reason | PASS | no closed call of the unit: every drawn input reached the world or was not admitted by the declared types |
| plain | a helper no export reaches gets no test, with the reason | PASS | the unit helper is not exported: the repository's runner cannot import it (needs a stub) |
| plain | a promise-returning unit is awaited | PASS |     await expect(later(0)).resolves.toEqual(1); |
| new-test-drives | a function the unit handed out is called by the test as lean drove it | PASS | drives {"cases":1,"calls":6}, reached 5 of 5, expect(out.next()).toEqual(1); |     expect(out.next()).toEqual(2); |
| new-test-drive-types | a handed-out function is called on arguments its declared types admit, a method on its holder | PASS | makeAdder: out(0), out(0), out(-168), out(0); tally: proposed |
| new-test-callbacks | a callback the unit is handed is a spy answering what lean answered, its calls asserted | PASS | callbacks {"cases":2,"calls":1}, const f = vi.fn(); | const f = vi.fn().mockReturnValueOnce(1000000000); |
| plain | a handed-out function that asks the world gets no test, with the reason | PASS | 24 closed call(s), none a test can restate by value: 24 a handed-out function whose outcome holds a value of the world (needs a stub) |
| plain | the node:test dialect asserts handed-out functions and callbacks with node:assert | PASS | node:test; assert.deepStrictEqual(fCalls, [[""]]); |
new-unit-test: 14 checks, 0 failed
```

`node tests/new-unit-test.mjs --break` on 431df2fc45 (exit 0: every mechanism red):

```
| new-reach | the statements of a unit no parent holds are probed and counted | RED (caught) | listed 0, reached 0, missed [] |
| new-test-cases | every closed call is a case | RED (caught) | no record: no closed call of the unit: every drawn input reached the world or was not admitted by the declared types |
| new-test-source | a returned value prints as its JavaScript | RED (caught) | no text |
| new-test-check | the text runs under the runner model against the candidate | RED (caught) | no check on the record |
| new-test-mutants | mutants planted in the unit are told apart by the kept cases | RED (caught) | no mutants on the record |
| new-test | the writer runs: a record, or the reason none is written | RED (caught) | neither record |
| new-test-drives | a function the unit handed out is called by the test as lean drove it | RED (caught) | 24 closed call(s), none a test can restate by value: 24 a call that hands out a function (LEAN_BREAK=new-test-drives: the writer keeps none) (needs a stub) |
| new-test-drive-types | a handed-out function is called on arguments its declared types admit, a method on its holder | RED (caught) | makeAdder: out([]), out([]), out(null); tally: 24 closed call(s), none a test can restate by value: 24 a handed-out function whose outcome holds a value of the  |
| new-test-callbacks | a callback the unit is handed is a spy answering what lean answered, its calls asserted | RED (caught) | 4 closed call(s), none a test can restate by value: 4 a call whose arguments or outcome hold a value of lean's world (needs a stub) |
new-unit-test --break: 9 checks, 0 failed
```

Pairs and regressions. The pair `new_unit_test_drives` and `new_unit_test` lines are on 431df2fc45. The rest are on
the commit before it; 431df2fc45 only reorders one refusal reason.

```
new_unit_test_drives: | TOTAL | 6 checks | ALL PASS |
new_unit_test: | TOTAL | 2 checks | ALL PASS |
w9k-new-code.mjs exit 0 : 0 FAIL lines
w9ab-world-calls.mjs exit 0 : 0 FAIL lines
w1h-new-units.mjs exit 0 : 0 FAIL lines
opaque-unit --break exit 1 (1 wanted)
callee_fact: | TOTAL | 7 checks | ALL PASS |
omitted_args_returned: | TOTAL | 2 checks | ALL PASS |
async_loop_exit: | TOTAL | 17 checks | ALL PASS |
opaque_promise_executor: | TOTAL | 14 checks | ALL PASS |
```

### The type check

The generated tests were compiled with the vendored TypeScript under `--strict`, against the fixture sources and a
minimal `vitest` / `node:test` declaration. That covers 16 tests: the fixture's `makeAdder`, `counter`, `mapAll`,
`tally` and `deferred`, the node:test forms of `counter` and `mapAll`, and seven more shapes (curried, async method,
method on `this`, array of functions, two callbacks, callback answering an object, optional parameter that throws).
Result: `18 files, 0 diagnostics`. The `makeAdder` test written under `LEAN_BREAK=new-test-drive-types` gives
`3 diagnostics` (`out([])` twice, `out(null)`).

## Measured

**The six new-code ids** (`hour.py --only` the six, `--lean` a pinned snapshot of aee24d2b4b at
`/root/lanes/w9am-handed-functions/snap-aee24d2b4b`, `--jobs 2 --no-lock`, records under
`/root/da-bench/w9am/w9am-nut6-aee24d2b4b-1`; before: the lead's `nut6-f5d944bacc-1`). The writer's records of the
30 NEW unit rows are identical before and after (`diff` exit 0). No unit of the six hands out a function:

- 27 rows: "no closed call";
- 2 rows: `mergePromptEvidence` "not exported";
- 1 row: `getPointShadowDepthFn` "no closed call".

So the six get nothing from this lane. Their limit is the world (lane w9al). The run's summary line: see final.md.

**The 20 dev NEW units whose census reason was the old combined refusal** ("each holds a value of lean's world or
hands out a function"). Census: lane w9ai `/root/da-bench/w9ai`, n 60, f5d944bacc. After: the same 12 PRs,
`bench/new_unit_facts.py` with n 60 on the snapshot, `/root/da-bench/w9am/after60`.

| after | units |
|---|---|
| PROPOSED (`getMonitorTypeLabel`: a `t` spy, 1 call asserted, 2/2 statements, check 1/1; `batch`: a returned object whose `getFullState` throws, 2/2, check 1/1) | 2 |
| the call's arguments or outcome hold lean's world (13 class constructors handed fake services, `toTransferSafeItems`) | 14 |
| a handed-out function asks the world (`EgressStateService.constructor`; `createStatusPageDocumentCsp`, an Express middleware whose `req`/`res` are fakes: the snapshot read 43 of its calls as "arguments not admitted", 431df2fc45 reads them as the world's) | 2 |
| below the bar (`createImageAwareReplacer`: its replacer's `unknown` value is never drawn as `{ type: "image" }`) | 1 |
| not exported (`groupBy`) | 1 |

The old combined reason hid that 14 of the 20 never involved a handed-out function. Of the 6 that do, 2 now get a
test that passes the self-check.

**The same 11 PRs at pr.mjs's n 30**, before (`/root/da-bench/w9am/before`, f5d944bacc) and after
(`/root/da-bench/w9am/after`): 188 NEW units; proposed tests 6 → 8; lost 0. The 6 earlier tests are unchanged
(cases, reached, killed, check). The fact records (fault, shape, NaN, ignored) are identical.

## What stays out (see the design note)

- class prototype methods: lean never drives them;
- lean's drive order: every call of one function before the next, so `counter`'s test is `next` ×3, then `reset` ×3;
- a callback whose answer is a value of the world, that faulted, or that wrote into its arguments;
- a function handed out only through an argument or a module binding;
- timers (lane w9al);
- the draws of an `unknown` parameter.

A PR test that uses `vi.fn()` now runs under the runner model, where it was "not modelled" before. Module mocks,
`spyOn` and timers stay "not modelled".
