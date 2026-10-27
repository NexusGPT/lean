# No silent exit: every run of lane B or of check ends in a verdict

A run of `exec/run.mjs` or `check.mjs` prints a verdict and writes it to `--out`, or says ASK; it never exits
quietly (a silent exit leaves a CI table clean with a unit missing).

## The guard

- Each main entry arms `verdictGuard(out, shape)` (exec/run.mjs) on `beforeExit` (the loop has nothing left). A
  verdict still owed then is printed and written as `{verdict: 'ASK', reason: 'harness: the run ended before a
  verdict; pending: <breadcrumb>'}`, exit 2; printed even when `--out` cannot be written.
- `guard.settle()` runs once the verdict exists; check.mjs's `shape` puts `ASK:harness` in the certificate.
- A harness error escaping `runPair` or `check` is caught at the main entry: ASK `harness: <breadcrumb>: <message>`.

## The breadcrumb
`crumb` (exec/run.mjs) holds the phase (inputs, programs, lane B, environment programs, finite, sequences, lane
A), the input index, and the file the loader is inside. `crumbText()` renders it, for example `pending: lane B
(input 0)`, plus the last error that escaped into the late-error hooks, which the guard's listener records.

## Why runs went silent, and the fixes

- The four Nexus units of 61eda32a1 threw a `BudgetError` during input building, in `mountSides` but outside its
  `try`: korat named a generated field `${shapeKey}.${field}`, the shape key being the JSON of the record's fields
  (up to 2302 characters), past the fake path budget of 400. run.mjs's `lateErrors` hook (`uncaughtException`, for
  errors after a unit returned) swallowed the main promise's rejection: status 0, no output, no Node warning.
- korat now names the path `heap<index>.<field>`; past `DEPTH`, a nested record field is drawn by the generator
  instead of a pool slot whose shape was never enumerated (that slot crashed `build`). A real budget stop in input
  building is `ASK: input i: budget: ...`, as in `observe`.
- Under `--project`, `exec/run.mjs --n 5`: getChatSettingsFromEmbedDeploymentSettings PASS-bounded,
  SendDeploymentMessageUseCase.execute WITNESS (the candidate calls `sessionRepo.findLiveChatOfSession`),
  PrismaSessionRepository.getOrCreateOpenChat PASS-bounded, .getOrCreateOpenChatInner PASS-bounded.
- `--no-project` hid it (the parameter is `any`). The `@nexus/prisma/client` target played no part.

## The loader rule
A specifier that resolves inside the package is loaded for real; one that leaves the package or resolves to nothing
the tree holds is a fake. Relative imports already followed it; a project `paths` alias (`@/util`) now does too
(`aliasTarget`, copied from lane paths-alias until its common.mjs export merges).

## What stays out
- A unit that patches a shared host intrinsic (`Promise.prototype.then`) can still stop the harness; the guard
  turns that into ASK. Isolating the intrinsics is a separate change.
