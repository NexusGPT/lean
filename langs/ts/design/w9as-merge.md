# w9as: the world stubs (w9al) merged onto the handed-out functions (w9am)

Both lanes extended the new-unit test writer from f5d944bacc (`design/new-unit-test.md`):

- w9am (`design/w9am-handed-functions.md`): drives as assertions, drive arguments by the declared types, callbacks as
  spies.
- w9al (`design/w9al-world-stubs.md`): the answer log, the world of a case, stubs, call assertions, URL strings.

Git conflicted in five files. The deeper conflict was in the case model:

- In w9am a case's `drives` is an array of drive records, and `world: true` marks a call whose only requests call a
  callback.
- In w9al `drives` is still a boolean (`if (c.drives || ...) return false`), and `world` is an object of the world's
  answers.
- Taken as they stood, w9al's writer would refuse every case on w9am's array (an empty array is truthy).
- Each lane also had its own mock function in the runner model.

The merge keeps every mechanism of both lanes behind its own `LEAN_BREAK`. It adds the case where both apply: a call
that hands out a function or calls a callback, AND asks the world. Each place I had to choose is listed below, with the
merged behaviour.

## The case (new-unit.mjs runNew)

1. **One case carries drives, callbacks and world.**
   - `caseOf` holds w9am's `drives: drivesOf(...)`, the array with formals and async, and `callbacks` when there are
     any.
   - It also holds w9al's `world: {answers, trace, pending, graph}`.
2. **The world's trace is the case's every request.** It is `requestsOf(observation)`: the call's own, then each
   drive's, then the omitted forms'. (w9al kept the call's own trace only, because it had no drives.)
   - `pending` adds each drive's armed work.
   - The answer log (`env.answers`) is set around the whole observation, so it holds the drives' answers too, in
     request order. A drive's request is therefore answered by the same stub queue as the call's, in the order lean
     made it, and the test replays the drives in that order (w9am).
3. **A case has `world` when the call asked anything, anywhere.** That covers its own requests, a static reach, its
   drives' requests, a callback's calls, or a Math.random draw.
   - The record's `closed` counts cases without `world`. So a call whose main call is closed but whose drives asked
     the world is no longer "closed" in the record. w9am counted such a call (e.g. `deferred`, whose drive calls the
     callback) as closed.
   - `reach.closed`, the count that feeds the other facts, is unchanged: it still reads the call's own requests only,
     as both lanes had it.
4. **Which world cases are kept.**
   - Every call that asked the world is a case (w9al).
   - Under `LEAN_BREAK=new-test-world` only w9am's callback-only cases are kept: those whose every request calls a
     callback. So w9am's callback check stays green when w9al's mechanism is off.
5. **Callbacks beside other requests** (`callbackCalls(..., { others })`, new break `new-test-callback-stubs`).
   - w9am returned `null` (no callback case) as soon as one request was not a callback's call.
   - Merged: with `others`, such a request is skipped and left to the world's stubs, which answer it or refuse the
     case. w9am's other conditions still hold for every callback call: no function of the unit handed to it, an
     answer that wrote nothing, a known answer.
   - w9am also skipped callbacks when the unit's static reach asked the world. With `others`, `worldOf` judges that
     reach instead.
   - The strict reading returns under `new-test-world` or `new-test-callback-stubs`.

## The writer (new-test.mjs writeNewTest)

6. **The filter runs both lanes' gates in one order.** The first refusal names the reason:
   1. The arguments: w9al's `inputHandles`. A callback the test spies on is skipped (`spied`), so it is neither an
      input handle nor "a value of the world".
   2. The outcome: `holdsWorld` with w9am's handed-out functions taken out (`withoutHandles`). A function the unit
      returned is w9am's to assert.
   3. `worldOf`, with the spied callbacks' calls taken out of the trace and the answers first. A case whose world was
      only those calls is closed to `worldOf`, so under `new-test-world` it is not refused.
   4. w9am's `usableCase` / `handedBody`, on the arguments with the input stubs swapped in (`inputArgs`, the swap
      factored out of `inputsOf`).
7. **The drive's reason first.** w9am put a drive's world reason ahead of any other. Merged: when a case is refused at
   gate 1, 2 or 3 and one of its drives asked the world beyond spied calls, the reason is w9am's "a handed-out
   function whose outcome holds a value of the world". Otherwise it is "a call whose arguments or outcome hold a value
   of lean's world" at gates 1–2, or the new `stub` reason, "a call that asks the world where no stub answers", at
   gate 3. w9al's surface refusals (`refusals`) are kept as before.
8. **A drive that asked the world** (new break `new-test-drive-stubs`).
   - w9am refused it outright (`driveWorld`), and w9al refused every case with drives.
   - Merged: when `worldOf` accepted the case's world, which includes every drive request, the drive is called under
     the case's stubs. `usableCase` skips the drive-world pre-check and `handedBody` skips its `spiedOnly` refusal.
   - What a drive returns is asserted as lean saw it, including a value that is a world answer: the file text a stub
     handed back. So a drive's outcome that holds a world answer is restated through the stub, never dropped.
   - A drive whose arguments or result hold a handle of the world (a fake) is still refused. No test prints a fake.
   - Under the break each lane's own rule returns: a drive that asked the world is `driveWorld`, and a world case
     with drives is `driveStubs`.
9. **The text** (`testText`).
   - A handed case's body (w9am) sits between the case's stub lines (w9al `before`) and the request assertions
     (`callsOf`).
   - A hand stub in node:test or mocha wraps the case's body in `try { ... } finally { restore }`. w9al split the body
     at the first line that was not a stub line. The merge builds the stub lines and the body apart, so a handed body
     is wrapped the same way.
   - The head imports `vi` / `jest` when there is a spy (w9am) or a stub (w9al), and `afterEach` when there is a
     hook.
   - `handedBody` prints the unit's call with the input stubs' names (`argsShown`), as w9al's plain call does.
10. **The refusal text.**
   - With no world asked it is w9am's form: "N closed call(s), none a test can restate by value: <count> <reason>; ...
     (needs a stub)".
   - When some call asked the world it is w9al's form: "N call(s), M of them asking lean's world, none a test can
     restate: <count> <reason>; ...". It ends with w9al's "(needs a stub of a surface no test stubs: ...)" when a
     surface was refused.
   - In both forms the reasons are w9am's counted reasons, which replace w9al's fixed sentence ("each holds a value of
     lean's world, hands out a function, or asks the world where no stub answers").
11. **The record** keeps both lanes' fields:
   - `drives: {cases, calls}` and `callbacks: {cases, calls}` (w9am);
   - `world: {asked, stubs, calls, surfaces, refused?}` (w9al);
   - `closed` as in 3.
12. **The mutant replay** (`killsOf`) does both.
    - A mutant is killed when its requests, its drives' included, differ from the case's world trace (w9al, widened
      as in 2).
    - It is also killed when a callback case's calls differ (w9am, read with `others`) or when the drives differ
      (`driveView`, w9am).
    - w9am's separate "asked the world" test (`calls === null`, or `o.trace.length` without callbacks) is covered by
      the trace comparison. A case without world has the empty trace.

## The runner model (new-tests.mjs)

13. **One mock function.**
    - w9am's `makeSpy` is the model's only mock function.
    - w9al's `makeMocks` builds `vi.fn` on it. It registers each spy for `clearAllMocks` / `resetAllMocks`, and gives
      a `spyOn` spy a reset that keeps the original and a `mockRestore`. Its `MOCK` symbol is gone: `isMockFunction`
      and every call matcher read `spied`.
    - The call matchers are w9am's. Each failure prints the recorded calls, and the `toBe*` / `nthCalledWith` /
      `lastCalledWith` aliases are kept.
    - A PR's own test still gets the spy alone (`vi.fn`, w9am), and every other `vi.*` is "not modelled". Only lean's
      own test runs with the mock API (`mocks: true`, w9al).
14. `.rejects.toThrow` (w9al) and `assert.rejects` (w9al) are kept as they were.

## Breaks and checks (tests/new-unit-test.mjs)

- w9am's breaks: `new-test-drives`, `new-test-drive-types`, `new-test-callbacks`.
- w9al's breaks: `new-test-world`, `new-test-stubs`, `new-test-calls`, `url-strings`.
- The shared ones: `new-reach`, `new-test-cases`, `new-test-source`, `new-test-check`, `new-test-mutants`,
  `new-test`.
- Added by this lane, on fixture `fixtures/new-unit-test/joint.ts`:
  - `new-test-drive-stubs`: `loader` hands out a reader whose every drive reads a file, so `vi.mock("node:fs")`
    answers each drive in order and its calls are asserted. In `since` the call reads the clock and the drives are
    closed.
  - `new-test-callback-stubs`: `tagAll` gets a spy for the callback and fake timers for the clock.
  - A plain check: `node-runner/joint.ts tagAll` in node:test, with the spy beside a hand `Date.now` stub restored in
    `finally`.

## What stays out

Everything each lane's note lists, plus:

- A drive that asks a surface no stub answers. The case is refused with w9am's drive reason, and w9al's surface is
  kept in `refused`.
- A drive that fires a timer inside itself. The trace's `fire` is no request a stub answers, as for the main call.
