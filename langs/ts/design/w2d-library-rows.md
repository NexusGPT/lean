# W2d: the top ecosystem libraries as rows and fakes (2026-11-01)

## What

Two readings of the calls a unit makes into an ecosystem library, one per lane.

- **Lane B, the fakes** (`exec/fakes/lib/`). A call into `lodash`, `zod`, `uuid`, `dayjs`, `luxon`, `date-fns` or
  `axios` used to reach the recording proxy: an opaque handle, the same on both sides, with no behaviour. Now it reaches
  the package's own code, vendored (`vendor/<package>`, version, tarball and per-file sha256 in its manifest). The code
  is compiled into the side's sandbox, so every global the package reads is lean's world: the seeded clock, the seeded
  generator, the virtual timers. axios gets lean's adapter, so a request is recorded on the trace and answered from the
  world's table. `express` (the `Request`/`Response` a handler is handed, by the parameter's declared type:
  `exec/spec.mjs` `declaringModule`) and `vscode` (window messages, configuration, `EventEmitter`, `Disposable`,
  commands) have no implementation to run, so each is a small model of its documented contract. Every member a model
  doesn't name stays the recording proxy's.
- **Lane A, the package rows** (`translate/library.json` `packages`, `library-rows.mjs` `pureLibraryCall`). An export
  listed under `pure` is read as an uninterpreted function of its arguments, without the world, the same on both sides.
  Two calls of it then commute, and a call whose result goes unused is dropped. Any other export, and every export
  under `transition` (with its reason), keeps the outside call's reading: a transition of the world.

| library | version | lane B | lane A rows (pure / transition) | pair |
| --- | --- | --- | --- | --- |
| lodash | 4.18.1 | vendored, `runInContext` on the side's globals | 125 / 39 | `lib_lodash`, `lib_lodash_get` |
| date-fns | 3.6.0 | vendored (exports by file) | 23 / 35 (calendar, format, clock) | `lib_date_fns` |
| uuid | 9.0.1 | vendored, `crypto` the seeded generator | 1 / 8 | `lib_uuid` |
| zod | 3.25.76 | vendored | none (a schema is a built object) | `lib_zod` |
| dayjs | 1.11.23 | vendored | none | `lib_dayjs` |
| luxon | 3.7.2 | vendored | none (its zone is the host's) | `lib_luxon` |
| axios | 1.21.0 | vendored browser build, lean's adapter | none (a request is the world's) | `lib_axios` |
| express | 4.22.3 | model of `req`/`res` | none | `lib_express` |
| vscode | (the API) | model of the documented contract | none | `lib_vscode` |

## Why it is sound

**Lane B.** A fake is the package itself, so it can't disagree with the package except where it touches the world, and
there it touches lean's world: the clauses of `exec/fakes/lib/protocol.mjs` check exactly that.

- *Vector clauses* replay the real package's recorded outputs (`vectors/<lib>.json`, recorded by `vectors.mjs` from the
  published package) against the fake in a side's sandbox.
- *World clauses* check that a clock read is the side's clock, a draw is the seeded generator, and a timer is virtual.
- *Manifest hashes* mean an edited vendored file is refused, never run.

The models (express, vscode) carry their contract in their header and in the world clauses.

**Lane A.** Each row holds by four conditions, all read off the call by `pureLibraryCall`:

1. **No world, no argument change.** The export was read in the vendored source: it doesn't change an argument, read
   the clock, the generator or a timer, or keep state across calls. The `transition` lists name each export that does,
   with that reason.
2. **No effect through a callback.** Every function argument is an arrow literal. The translator reads it as a lambda
   and refuses one with an effect (`quietCallback`: not async, no effect, no cell write, no throw, `try`, `await`, or
   call of a unit that throws). A function value the package would call keeps the call a transition, since its effects
   are its own.
3. **No sharing through the result.** The result can't share an object the unit holds. The row's shape decides it,
   checked against the call's result type:
   - `primitive` and `argument-part` (the result may be a part of an argument): only at a primitive result type;
   - `fresh-array` (every container new, the elements the arguments' own): only when those elements are primitives;
   - `fresh-record` (one new record, its values the arguments' own): only when those values are primitives;
   - `deep-fresh`: at any type that holds no function in a field (`holdsFunction`; lodash's `cloneDeep` copies objects
     but keeps a function itself; a prototype method or a member the default library declares is the built-in's, not
     a field).
4. **No zone.** A date row computes on milliseconds alone (A10: ms, s, min, h). `exec/fakes/lib/date-rows.test.mjs`
   runs every pure date export on 31 January, 29 February, 31 December and the DST switch days, under four zones
   (UTC, New York, Berlin, Lord Howe's half-hour shift). Every output must match across zones, and each calendar
   transition the table lists must move in some zone: the reason the table gives is checked, not assumed. The test
   also refuses a pure row whose source isn't vendored. It found two (`subMilliseconds`, `subSeconds`, listed but never
   vendored); both were dropped.

A unit holding such a call is not the heap core's (`translate/heap.mjs`). The heap core reads an imported call only as
a transition of the whole world, which would undo the row. It declines the unit, and the value lane reads it, as it
already does for a record copy the unit didn't build.

## Tests, each with its --break (A6: `LEAN_BREAK=<mechanism>`)

| test | as is | --break |
| --- | --- | --- |
| `node langs/ts/exec/fakes/lib/protocol.test.mjs` | ALL PASS | `--break` (`LEAN_LIBRARY_FAKES=0`): red |
| `node langs/ts/exec/fakes/lib/date-rows.test.mjs` | PASS | `--break` (`addDays` read as pure): red |
| `node langs/ts/tests/package-rows.test.mjs` | 16 calls as stated | `--break` (`LEAN_BREAK=package-rows`): red |
| `node langs/ts/tests/lib-break.mjs` | see result | each WITNESS unit flips under `LEAN_BREAK=library-fakes` |
| `node langs/ts/tests/run.mjs --pair lib_lodash` / `lib_date_fns` | lane A proves `spread`, `sizes`, `gap` | `LEAN_BREAK=package-rows`: unproved |

The library pairs' `break` key is the suite's one shape (2026-11-01, the merge with lead-v4; tests/break.mjs): an array
of rows `{ "mechanism": "library-fakes", "b": { "<unit>": "<verdict>" } }`, where `b` lists lane B's verdict under the
break, beside the lane A rows' `equal`. It was a map keyed by mechanism (`{ "library-fakes": { ... } }`), while the
opacity lanes' 30 pairs used the array; merged, tests/run.mjs died on the map and lib-break.mjs read the arrays as maps
(72 junk rows). The array is kept because a pair may hold two rows of one mechanism, and one row may name two
mechanisms (`opaque_async_origin`, design/w1d-opaque-async.md), which a map keyed by mechanism has no place for. Both
readers go through tests/break.mjs `breakRows`: run.mjs takes the lane A rows, lib-break.mjs the lane B rows.

## Limits

- **Aliasing gap (found here, not fixed here).** The value lane (as of 4747022f) applies a field write through an
  outside call's result (`const v = get(o, 'a'); v.x = 1`) to a local copy. It proves `poke` equal to a candidate
  without the write, while lane B gives a WITNESS (`lib_lodash_get`, lane B only). This lane leaves the translator's
  aliasing alone; the result file reports it.
- **A recorded callback called through `apply`.** A callback the generator draws (a handle) that the vendored lodash
  calls through `f.apply(this, args)` is recorded as a read of `apply` and a call of it, not as a call of `f`. The
  pair's units own their callbacks.
- **No lane A rows for zod, dayjs, luxon, axios, express or vscode.** Their values are built objects or world
  requests. Lane B carries them.
