# No silent exit: every run of lane B or of check ends in a verdict

A run of `exec/run.mjs` or `check.mjs` prints a verdict and writes it to `--out`, or says ASK; it never exits
quietly (a silent exit leaves a CI table clean with a unit missing).

## The guard

- Each main entry arms `verdictGuard(out, shape)` (exec/run.mjs). It listens for `beforeExit`, which Node emits
  when the event loop has nothing left to run. If the verdict is still owed at that point, the guard prints and
  writes `{verdict: 'ASK', reason: 'harness: the run ended before a verdict; pending: <breadcrumb>'}` and exits
  with status 2. When `--out` cannot be written, the verdict is still printed.
- `guard.settle()` runs once the verdict exists; check.mjs's `shape` puts `ASK:harness` in the certificate.
- A harness error that escapes `runPair` or `check` is caught at the main entry. It becomes ASK with the reason
  `harness: <breadcrumb>: <message>`. It is no longer left to the late-error hooks.

## The breadcrumb

`crumb` (exec/run.mjs) holds the phase (inputs, programs, lane B, environment programs, finite, sequences, lane
A), the input index, and the file the loader is inside. `crumbText()` renders it, for example `pending: lane B
(input 0)`, plus the last error that escaped into the late-error hooks, which the guard's listener records.

## Why runs went silent

- run.mjs's `uncaughtException` hook records errors raised after a unit returned (a fire-and-forget promise). It
  also swallowed the main promise's rejection, so the loop drained with status 0 and no Node warning.
- The four Nexus units of 61eda32a1 reach this path through input building. korat names a generated field
  `${shapeKey}.${field}`, and the shape key is the JSON of the record's fields. The path then exceeds the fake
  budget of 400 characters, so `BudgetError` is thrown in `mountSides`, outside its `try`.
- `mountSides` now turns that error into `ASK: input i: budget: ...`, as `observe` does. `--no-project` hid it:
  the parameter is `any`, no record shape. The missing `@nexus/prisma/client` target played no part: the loader
  fakes every package import by name.

## What stays out

- The path naming in korat.mjs. This lane does not own that file. A short key such as `heap<index>` gives the four
  units PASS-bounded, WITNESS, PASS-bounded and PASS-bounded.
- korat's `build` crash on records nested deeper than `visit` reaches. That crash is now an ASK and no longer a
  silent exit.
- A unit that patches a shared host intrinsic, for example `Promise.prototype.then`, can still stop the harness.
  The guard turns that stop into ASK. Isolating the intrinsics is a separate change.
