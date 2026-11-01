# w2e-fake-conformance: result (2026-11-01)

Branch `lane/w2e-fake-conformance`, cut from lead-vm 4747022f. Design note: `langs/ts/design/w2e-fake-conformance.md`.
Decision-site rows: `langs/ts/design/admission-contract.md`, section "2026-11-01: the admission of a behavioural fake".

## What landed

- `langs/ts/conformance/fakes.mjs`: the protocol test of every behavioural fake against the real module, run as the
  suite row `conformance fakes` (`langs/ts/tests/run.mjs`, model conformance section).
- Four providers: fake modules (`create`), w2b's module registry (`env.module`), w2c's global `lookup`, and w2d's
  `libraryFake` inside the sandbox.
- 27 families (`FAMILY_NAMES`).
- `langs/ts/conformance/fixtures/fakes/good/` (12 minimal fakes) and `.../wrong/` (3 wrong fakes, each naming the
  clause that must refuse it):
  - `fs-previous-write`: a read returns the previous write;
  - `path-unnormalised`: `join` glues its parts;
  - `timers-arm-order`: timers fire in arm order.

## Numbers (seed 1, 12 cases per family)

All commands are run from `/root/lanes/w2e-fake-conformance/tree/langs/ts`.

| command | result |
|---|---|
| `node conformance/fakes.mjs --json /tmp/w2e-results/own.json` | exit 0; 12 of 12 good fixtures pass, 3 of 3 wrong fixtures refused, 81 clauses, 13,850 checks, ALL PASS. exec/fakes in this tree holds 0 fakes (none has landed here) |
| `node conformance/fakes.mjs --break` | exit 1; 0 of 3 wrong fixtures refused, 3 BAD (red, as required) |
| `node conformance/fakes.mjs --wrong conformance/fixtures/fakes/good` | exit 1; 0 of 12 refused (a fake posed as wrong without `expectRefused` is never taken as refused) |
| `for s in 1 2 3 4 5; do node conformance/fakes.mjs --seed $s; done`, run twice (10 runs, load 42 to 57) | 10 of 10 ALL PASS, after the timer measurement fix below |
| `node conformance/fakes.mjs --dir /root/lanes/w2b-node-fakes/tree/langs/ts/exec/fakes` (w2b at d0198ea3) | 12 fakes, 8 pass; 128 clauses, 22,437 checks |
| `node conformance/fakes.mjs --dir /root/lanes/w2c-web-fakes/tree/langs/ts/exec/fakes` (w2c at 3c96a06b) | 16 fakes, 14 pass; 120 clauses, 15,658 checks |
| `node conformance/fakes.mjs --dir /root/lanes/w2d-library-rows/tree/langs/ts/exec/fakes` (w2d at 9f1f3615) | 8 fakes, 7 pass; 119 clauses, 17,407 checks |
| `node --check tests/run.mjs`, plus the row's pass rule applied to the real outputs of the plain run and the `--break` run | syntax ok; row ok true (plain exit 0, `--break` exit 1 with 0 of 3 refused) |

### Clauses checked, per fake (checks in brackets)

- **w2b**:
  - fs: agree [336] FAIL, write-then-read [9], mkdir-then-exists [8], unlink-then-ENOENT [9], determinism [12], recorded [336].
  - fs/promises: agree [110] FAIL, write-then-read [10], mkdir-then-exists [10], unlink-then-ENOENT [10], determinism [12], recorded [110].
  - path and path/posix: agree and determinism, plain and posix [712 each]. win32 is not modelled, so it is not provided.
  - url: agree [268] FAIL, determinism.
  - crypto: agree [72], determinism, randomUUID shape [40], randomBytes length [40], seeded draws [3], recorded (draws) [40].
  - timers: virtual order [12] FAIL, delay coercion [7] FAIL, determinism [12], recorded [12].
  - timers/promises: resolution order [12].
  - process: env is a record of strings [24], cwd [2], argv [1], exit is a fault [1].
  - console: captured on the trace [5].
  - buffer: agree [504], determinism.
  - os: shape [17], stated facts agree [2], determinism [1].
- **w2c**:
  - Agree and determinism on AbortController [12], Blob [12], DOMException [6], FormData [12], Headers [36], Request [36], Response [44, agree FAIL], TextDecoder [36], TextEncoder [10], URL [136], URLSearchParams [36], structuredClone [17].
  - AbortSignal: agree [4], timeout on the virtual clock [3].
  - fetch: request [6], a real Response [72], json is the parse of text [72] FAIL, repeat [24], determinism, recorded [72]. seeded is not provided: the hook takes no recording.
  - localStorage and sessionStorage: agree [360] against Node's own Web Storage, determinism [12], recorded [12].
- **w2d**:
  - lodash: agree [960] against vendor/lodash 4.18.1 loaded by Node, determinism, and 15 vector clauses [40 each].
  - uuid: agree [217], determinism, v4 shape [20], seeded draws [3], recorded [20], and 2 vector clauses.
  - Vector clauses only: zod [3], dayjs [4], luxon [2], date-fns [2], axios [1 run; settle not run, it needs w2d's glue].
  - vscode: FAIL, no runnable clause.
  - express: not answered by the hook in the probe, so not tested.

## Failing cases found, each sent to group vBHsP3kPf_cZbeLOQa7UEA

1. **The virtual clock** (exec/run.mjs `runTimers`, not owned by any w2 lane). An interval that clears itself in its own
   callback keeps firing.
   - Repro: `env.arm('interval', () => env.clearTimer(id), 5)` and `runTimers` stepped from 1 to 30 fire at
     5, 10, 15, 20, 25 and 30. Real Node fires it once.
   - w2b's timers inherit it.
2. **w2b fs**: a path under a file answers ENOENT, where Node answers ENOTDIR (`stat('<R>/a/x')` with `<R>/a` a file).
3. **w2b url**: `pathToFileURL('/C:\\xü//')` drops the trailing `/`.
4. **w2b timers**: a delay of 0 is not coerced to 1 ms, so `setTimeout(c0, 1); setTimeout(c1, 0)` fires c1 first.
   Real Node fires c0 first.
5. **w2c Response**: `Response.json(undefined, {status: 201})` resolves, where the real one throws TypeError.
6. **w2c fetch**: `text()` answers `"{}"` but `json()` answers a recording handle. On a real Response, `json()` is
   always the parse of the text.
7. **w2d vscode**: no protocol clause runs through the hook alone. axios's `settle` and express's response-ops clauses
   have `run: null`.

## Harness defects found and fixed on the way (each by its mechanism)

- The `recorded` mark is now a signature of the trace plus the pending list, because a clear removes a pending entry.
- The real event loop is not a fixed reference under load. `setTimeout(c0, 2); setTimeout(c1, 0)` fired c0 first at
  load 80, because Node takes the loop time afresh at each arm and counts whole milliseconds. A real order is now
  accepted only when the arm skew is below the smallest gap less 1 ms; otherwise the run is measured again, up to five
  times, and a case with no clean measurement is counted unmeasured, never as agreement.
- A fake's world can be drawn (w2b fs). The real fs is now brought to the fake's world, path by path, before the script
  first touches it.
- Through a recording proxy every member "exists". Membership is now asked of `modelOf`, never inferred from `typeof`.
  `.call` on a proxied function is replaced by `Reflect.apply`.
- Only hook `index.mjs` files are imported, with `process.exit` turned into a throw. w2d's `lib/vectors.mjs` is a CLI
  script that ended the run.
- Storage keys are compared as a set, because the order `key(i)` walks belongs to the user agent.
- `recorded` is required of effectful families only. A pure function's value is compared in the outcome.

## Not done / open

- The suite itself (`JOBS=4 LEAN_PAIRS=<pair> node tests/run.mjs`) was not run. The one-minute load stayed between 48
  and 107 from 02:54 to 03:38, apart from a single read of 38.7 that I spent on the final measurements. The row's code
  was checked by `node --check` and by its pass rule on the real outputs, not inside a suite run. The lead's merge run
  covers it.
- No change under `translate/` or `lint/`, so no conformance/run.mjs run is owed.
- When w2b, w2c and w2d merge as measured above, the row will be red on their 7 failing fakes. That is the intended
  admission gate. Each failing case is above and was sent to its owner.
- I did not touch the fakes themselves. My fixture timers fake works around the clock defect (1) with a set of cleared
  ids.
- Per the standing rule, the 44 AACR instances were never read.
