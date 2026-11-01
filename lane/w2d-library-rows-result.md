# w2d-library-rows: result (2026-11-01)

Branch `lane/w2d-library-rows`, from 4747022f. Design note: `langs/ts/design/w2d-library-rows.md`. Patch of my
`translate/library.json` rows for the lead (A11, the table's owner is w2b): `lane/w2d-library-rows/library-json.patch`
(333 lines, `git diff 4747022f -- langs/ts/translate/library.json`).

## What landed

- **Lane B fakes** (`exec/fakes/lib/`): vendored lodash 4.18.1, zod 3.25.76, uuid 9.0.1, dayjs 1.11.23, luxon 3.7.2,
  date-fns 3.6.0 and axios 1.21.0 (lean's adapter over the world's table), each run in the side's sandbox on lean's
  world. Models of the express `req`/`res` (by the parameter's declared type, `exec/spec.mjs` `declaringModule`) and of
  the vscode API.
- **Lane A rows** (`translate/library.json` `packages`, `library-rows.mjs` `pureLibraryCall`):
  - lodash: 125 pure, 39 transition;
  - date-fns: 23 pure (ms, s, min, h only: A10), 35 transition;
  - uuid: 1 pure, 8 transition.

  The translator reads a pure call as an uninterpreted function. The heap core declines a unit holding one, so the
  value lane reads it.
- **`LEAN_BREAK` (A6)**: `library-fakes` (every library fake off) and `package-rows` (every package call a
  transition).
- **Step cache fix** (`tests/stepcache.mjs`). The key now includes the inherited `LEAN_BREAK` and
  `LEAN_LIBRARY_FAKES`. Before this, a `--break` suite run replayed the unbroken run's cached result. Every lane's A6
  break rows depend on this. Red first: `node langs/ts/tests/step-cache-break.mjs`, 3 FAILED before the fix, all ok
  after; `--break` 3 FAILED.

## Tests (each red under its break)

| command | as is | break |
| --- | --- | --- |
| `node langs/ts/exec/fakes/lib/protocol.test.mjs` | ALL PASS: lodash 15/600, zod 3/120, dayjs 4/160, luxon 2/80, date-fns 2/80, uuid 2/80, axios 2/80, express 1/40 clauses/cases; 14 world clauses; 203 vendored files match | `--break`: red |
| `node langs/ts/exec/fakes/lib/date-rows.test.mjs` | 23 pure date-fns exports equal under 4 zones on 26 instants (10 boundary and DST days), 226 pairs; 12 calendar transitions each move | `--break` (addDays pure): red |
| `node langs/ts/tests/package-rows.test.mjs` | 16 calls as stated (8 pure, 8 transitions) | `--break`: red |
| `node langs/ts/tests/step-cache-break.mjs` | ok | `--break`: red |
| `node langs/ts/tests/lib-break.mjs --jobs 2` | 10 rows, 0 failed (table below) | (the break is each row) |
| `node langs/ts/tests/run.mjs --pair lib_lodash` | 11 checks ALL PASS (lane A proves `spread`, `sizes`) | `LEAN_BREAK=package-rows`: 2 FAILED (`spread`, `sizes` not proved) |
| `node langs/ts/tests/run.mjs --pair lib_date_fns` | 5 checks ALL PASS (lane A proves `gap`) | `LEAN_BREAK=package-rows`: 1 FAILED (`gap` not proved) |

`lib-break` rows: a unit is WITNESS with the fake and PASS-bounded under `LEAN_BREAK=library-fakes`.

| library | pair, unit | as is -> broken |
| --- | --- | --- |
| axios | lib_axios own | WITNESS -> PASS-bounded |
| date-fns | lib_date_fns later | WITNESS -> PASS-bounded |
| dayjs | lib_dayjs later | WITNESS -> PASS-bounded |
| express | lib_express created | WITNESS -> PASS-bounded |
| lodash | lib_lodash total | WITNESS -> PASS-bounded |
| lodash | lib_lodash settle | PASS-bounded -> WITNESS (the fake removes a false difference: debounce keeps the last call) |
| luxon | lib_luxon later | WITNESS -> PASS-bounded |
| uuid | lib_uuid shaped | WITNESS -> PASS-bounded |
| vscode | lib_vscode heard | WITNESS -> PASS-bounded |
| zod | lib_zod echoes | WITNESS -> PASS-bounded |

Regression (the 25 pairs that import a package or declare a module, plus the 11 `lib_*` pairs):
`LEAN_PAIRS=<36 pairs> JOBS=2 node langs/ts/tests/run.mjs`: **1266 checks ALL PASS** (proof hunt: 139 units read by both lanes, no hidden false proof; self-pair 216 units, no WITNESS; model conformance 155 units in 22 pairs). Conformance:
`LEAN_PAIRS=<11 lib pairs> node langs/ts/conformance/run.mjs --jobs 2`: **NO NEW FINDING**. 14 units in 3 pairs (8 lane-B-only pairs skipped); 0 executable: the 14 units' Dafny models call uninterpreted package functions, so they are not executable against Node. 24.9 s wall.

## Units per library (w2a pending: no ranking reached the group; my own count on three roots)

`node langs/ts/library-units.mjs /root/da/census/repos/<root> --json <out>`. Parse only, read-only. "Units" are the
units referencing a binding imported from the library (A14: the units whose trace touches the faked module). "Row
calls" are call sites of an export listed `pure`, an upper bound of the calls lane A now reads without the world.

| library | n8n units | nexus units | langchainjs units | total units | row calls (n8n/nexus/langchainjs) |
| --- | ---: | ---: | ---: | ---: | --- |
| lodash | 273 | 2 | 0 | 275 | 457 / 1 / 0 |
| axios | 44 | 1371 | 0 | 1415 | — |
| express | 81 | 195 | 2 | 278 | — |
| zod | 9 | 99 | 101 | 209 | — |
| luxon | 61 | 0 | 0 | 61 | — |
| uuid | 54 | 0 | 0 | 54 | 5 / 0 / 0 |
| date-fns | 0 | 28 | 0 | 28 | 0 / 0 / 0 |
| dayjs | 0 | 1 | 0 | 1 | — |
| vscode | 0 | 6 | 0 | 6 | — |

Roots: n8n 9,600 units in 3,819 files with imports; nexus 34,775 in 11,898; langchainjs 5,964 in 1,390. No census root
holds the cline or gemini-cli repositories, so the vscode count is nexus's one file.

## Open

1. **Aliasing gap in the value lane, reproduced on 4747022f.** `const v = get(o, 'a'); v.x = 1; return o.a.x` is
   proved equal to the same without the write. The write goes to a local copy of an outside call's result, and the
   world's later read of `o` is unchanged. Lane B gives a WITNESS (`lib_lodash_get`, lane B only). Not in this lane's
   files; for the translator's owner.
2. **A drawn callback called through `f.apply(this, args)`** (lodash's `invokeFunc`) is recorded as a read and a call
   of `apply`, not a call of `f`. The pairs' units own their callbacks.
3. **Rows found wrong and dropped:** date-fns `subMilliseconds`, `subSeconds` (listed pure, never vendored).
   date-fns exports vendored only as another export's dependency (`addMilliseconds`) were answered by the proxy; now
   resolved by file.
4. **Load discipline:** two runs early in the session started above 40 (48 and 50). One gate compared the load's
   integer part, so runs at 40.0 to 40.8 started. Every later gate compares the exact value.
