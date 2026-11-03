# w9al: a unit that reads the world gets a test with stubs made from lean's own answers

Lane w9al, on top of the new-unit test writer (design/new-unit-test.md). Before this lane a call of a unit no parent
holds was a case only when it asked lean's world nothing; most new functions ask it (fetch, the file system, the clock,
a package), so the writer said "no closed call" or "needs a stub".

## The cause

Lean's trace (fake.mjs `record`) keeps the **requests** a unit makes (`{op, path, args}`), never what the world
**answered**. The answers are spread across the fakes: the recording proxy's `answer`/`typed` cache, the behavioural
models (fs, process), fetch's table, the clock, the seeded generator behind `Math.random`. A test can only restate a
call if it can restate both halves, so with no answer log there was nothing to write. Two related gaps:

- `runNew` dropped every call that asked the world before it became a case (`if (world.length) continue`).
- `Math.random` never reached the trace (`random: () => env.rng()`), so a "closed" call that drew from it became a test
  that relied on lean's seeded draw without stubbing it. It passed only because the drawn arrays were short enough that
  the draw did not matter.

## The mechanisms (each behind a break; checks in tests/new-unit-test.mjs)

1. **The answer log** (`new-test-world`; fake.mjs `answerOf`, `answerShown`, `readAnswer`; runNew). While
   `env.answers` is a list (runNew sets it around one call, after the load), each request is logged in request order
   with its arguments as rendered and what the world answered: `returns`, `throws`, or `resolves`/`rejects` for a
   promise the world made. Sources: a fake's call, `new` and member read (the proxy traps); the clock (`Environment.clock`,
   the instant before the reader's epoch); `Math.random` (run.mjs sandbox, logged but **still not traced**, so pair
   semantics are unchanged); fetch (fakes/web/fetch.mjs: the row's status, status text, headers and **body text**, which
   the response's rendering hides behind a handle). An error keeps its own primitive fields (`code`, `errno`,
   `syscall`, `path`) because units tell Node errors apart by them. A request handed a unit function is marked
   `callback`. A quiet model's call (path.join) is not logged, since the real module computes the same thing. The entry
   is pushed when the request starts, so call order is request order. A call that asked the world is now a case
   carrying `world: {answers, trace, pending, graph}`. A closed call that drew `Math.random` carries its draws too.

2. **The world of a case** (`new-test.mjs worldOf`, `surfaceOf`, `stubPrintable`). A case is usable when every
   request is answered on a surface a test stubs, and every answer prints as a value. The surfaces are:
   - a package's member called (`module:<spec>.<member>`; the specifier is split off by the longest linked or imported
     specifier; `default.` is folded);
   - a global called by name (`global:fetch`, or a free global);
   - the clock (`Date.now`, `new Date`);
   - `Math.random`.

   Refused, with the reason naming the surface:
   - a static reach other than `names fetch` (performance, process, a package binding read without a trap);
   - a write, `has`, `delete` or `keys` on the trace;
   - a timer armed;
   - a package handle held as a value;
   - a value read from a package;
   - `new` of a package class;
   - a member of an answered value;
   - a callback handed to the world;
   - an answer that holds a handle;
   - the clock read at several instants through `new Date`;
   - a trace request no answer restates (a bridge fake);
   - a package stub under node:test or mocha, which have no module mock by default.

   Navigation reads are dropped first (a member read whose handle a later request goes through).

3. **The stubs** (`new-test-stubs`; `stubsOf`, `answerSource`, `onceOf`, `thunkOf`). vitest and jest:
   - a package becomes `vi.mock(spec, () => { const m = {...every member the unit's file imports and every member
     called: vi.fn()}; return { ...m, default: m }; })`, plus `import * as stub_<spec>` and per case
     `vi.mocked(stub.member).mockReturnValueOnce(...)…` in call order;
   - a global becomes `vi.stubGlobal(name, vi.fn()…)` (jest: `jest.spyOn(globalThis, name)…`);
   - `Math.random` becomes `vi.spyOn(Math, 'random').mockReturnValueOnce(...)`;
   - the clock at one instant becomes `vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(t)`, and at several
     `Date.now` instants `vi.spyOn(Date, 'now')…`;
   - one `afterEach` undoes exactly what was used.

   node:test and mocha get hand-written stubs: the member is replaced by a recorder that returns the next answer and
   throws past the last one, then restored in `finally`. A fetch response prints as
   `new Response(body, { status, statusText, headers })`. An error prints as its built-in class with its fields.

4. **The calls** (`new-test-calls`; `callsOf`). After the outcome: `toHaveBeenCalledTimes(n)` and
   `toHaveBeenNthCalledWith(k, ...args)` per stub when the arguments print. In the hand-written dialects it is
   `assert.deepStrictEqual(stub.calls, [...])`. A unit that writes a file and returns nothing is asserted by the write's
   path and content.

5. **The runner model runs lean's own mocks** (new-tests.mjs `makeMocks`, `mockModules`, the mock matchers; new-unit.mjs
   `extra.onContext`). Only for the writer's self-check (`runTests({ mocks: true })`). A test the PR adds that mocks
   stays `new:coverage` exactly as before. The model has:
   - mock functions with queued answers, `spyOn` with restore;
   - `stubGlobal`/`unstubAllGlobals` on the unit's context global;
   - fake timers as a fixed `Date` on that context;
   - module mocks: each top-level `vi.mock(spec, factory)` is run before the file loads (as the runners hoist it) on a
     context holding the mock API alone, and linked in place of the package for every importer.

   Two model fixes came out of running real tests:
   - `.rejects.toThrow` judges the rejection as a thrown error (it demanded a function);
   - `assert.rejects` was added.

   The sandbox's `Date` proxy now keeps a member set on it on its own side; before, `Date.now = x` wrote through to the
   host's `Date`.

6. **URL strings** (`url-strings`; spec.mjs). A unit that hands a value to the platform's URL parser (the global `fetch`,
   `new URL`, `new Request`, resolved to the standard library's declarations) gets `URL_STRINGS` in its string pool.
   This is the same rule as "strings that match the unit's own patterns". A drawn word is no URL, so before this every
   request was refused before it was made, and nothing after `fetch` ran (fetchJson reached 0 of 2 statements).

The mutants of a world case (killsOf) are killed when the mutant's requests differ from the case's (that is what the
call assertions see), not merely because it asked the world.

## The record

`new:proposed-test` gains `world: {asked, stubs, calls, surfaces, refused?}`: calls that asked the world, answers
restated, call assertions, surfaces stubbed, and the first refusals among the cases not kept. `closed` now counts only
calls with no world. A unit with no usable case says how many of its calls asked the world and names the surfaces no
test stubs (`surfaces` on the coverage record).

## What it does not do

- It does not stub a value read from a package, a class of a package, an answered handle's members, a callback the world
  should run, a timer, `performance.now`, `process.env`, or `localStorage`. Each is refused by name.
- It does not call a class method by name (the writer's member limit, unchanged).
- The answers are lean's: a fault drawn by lean (`fault: <path>`) is restated as the error it was. A body lean drew is
  restated as drawn.
- The test's truth is checked under lean's runner model, not under the repository's own runner. The lane's fixtures were
  also run under real vitest 5.0.3 (15 of 15 pass) and real `node --test` (6 of 6 pass).
