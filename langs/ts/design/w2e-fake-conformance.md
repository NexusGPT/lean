# The protocol test of every behavioural fake against the real module (W2e, 2026-11-01)

## What

`conformance/fakes.mjs` is one suite row, `conformance fakes` (tests/run.mjs, the model conformance section). It finds
every behavioural fake lane B can hand a unit and runs, per fake, a seeded script against the fake and against the real
module, outcome by outcome. It also runs the fixture fakes: `conformance/fixtures/fakes/good` must pass, and every fake
under `.../wrong` must be refused on the clauses it names in its `expectRefused` export. Under `--break` (no comparison,
no clause checked) the wrong fixtures are admitted and the run must exit 1. The row passes only when the plain run
exits 0 and the `--break` run exits 1 with 0 of 3 wrong fixtures refused. Its detail lists, per fake under
`exec/fakes`, every clause and how many checks it made.

    node langs/ts/conformance/fakes.mjs [--dir <fakes dir>]... [--seed 1] [--cases 12] [--json <out>] [--break]

## Why

A behavioural fake (w2b, w2c, w2d) replaces a recording handle with a value flow. A wrong value flow is worse than no
value flow. A fake fs whose read answers the previous write lets a parent and a candidate that read different files
agree, so it hides a WITNESS. A path fake that joins without normalising produces a WITNESS that is not real, so it
invents one. The trace oracle cannot see either defect, because the trace records the request, not the answer. The
only thing that sees the answer is the real module the fake stands for. So every fake is held to that module, on inputs
nobody chose for the fake.

## How a fake is reached (the providers)

The harness tests a fake the way lane B reaches it, never through a side door, and with the Environment, runTimers and
sandbox of the tree the fakes sit in (`exec/fake.mjs` and `exec/run.mjs` beside the folder):

| provider | how it is found | the fake under test |
|---|---|---|
| a fake module | exports `create(env, recording)` (specifiers from `specifier`, else from the file name) | `create(env, recording)` |
| a module registry (w2b) | `index.mjs` exporting `MODELLED` and `memberOf` | `env.module('node:<m>')`, the recording proxy whose members ask the registry; a member with no `modelOf` entry is the proxy's answer, listed as not provided and never compared |
| a global lookup (w2c) | `index.mjs` exporting `lookup(env, spec)` (and `globalsOf`) | `lookup(env, 'global:<X>')` for every family specifier and every name `globalsOf` holds |
| a library hook (w2d) | `index.mjs` exporting `libraryFake(env, spec)` | `libraryFake(env, pkg)` inside `exec/run.mjs` `sandbox(env, tmp)`, for every package in `LIBRARY_FAKE_ROWS` |

Only a hook's `index.mjs` is imported. The other files under its folder are its parts and are never run alone; one of
them, `lib/vectors.mjs`, is a script that ends the process. Every import runs with `process.exit` turned into a throw.
Each protocol run turns fault draws off (`env.faultDraw = () => false`): the world's drawn failures belong to the
recording proxy and are tested with it. A specifier no family covers fails with "no protocol", so no fake is admitted
untested.

## The families and their clauses

The reference is the real module wherever it is pure or sandboxable, and the comparison is exact: a value in a canonical
form, a throw by its error code (else its name). Built-ins are recognised by their tag, never by `instanceof`, because a
library fake answers from lane B's sandbox realm.

| family | specifiers | clauses | reference |
|---|---|---|---|
| path | node:path, path/posix (and the posix and win32 namespaces) | agree, determinism | node:path; boundary segments first, then seeded joins, normalises, relatives, formats |
| url | node:url | agree, determinism | node:url (URL fields, URLSearchParams mutation sequences, fileURLToPath, pathToFileURL, format, parse) |
| URL | global:URL, global:URLSearchParams | agree, determinism | the global classes |
| buffer, crypto | node:buffer, node:crypto | agree, determinism; crypto: v4 shape, randomBytes length, seeded draws, recorded (draws) | Buffer statics with every encoding pair; createHash over sha1/sha256/sha512/md5 and a bad name |
| Headers, encoding, structuredClone, AbortController, Request/Response, FormData, Blob, DOMException | global:* | agree, determinism | the platform classes; Request with absolute URLs only (a relative one has no single reference: Node's Request refuses it, a page resolves it against its document) |
| AbortSignal | global:AbortSignal | agree; timeout on the virtual clock | the statics against the real ones; `timeout(ms)` not aborted before `ms` on the virtual clock and aborted with TimeoutError at `ms`, the clause checked on the real loop first |
| fs, fs/promises | node:fs, node:fs/promises | agree; write-then-read; mkdir-then-exists; unlink-then-ENOENT; seeded-read (a fake that takes a recording); determinism; recorded | the real fs in a fresh temporary folder brought to the fake's world (below); listings compared as sets (Node fixes no order); a folder's size is the file system's |
| timers | node:timers | virtual order; delay coercion; determinism; recorded | the real event loop (below) |
| timers/promises | node:timers/promises | resolution order | the real `timers/promises` on the real loop |
| fetch | global:fetch | request; a real Response; json is the parse of text; repeat; seeded and outside the table (a fake that takes a recording); determinism; recorded | a real Request on the same arguments; a real Response built from the answer's own status, status text, headers and body; JSON.parse of the text |
| localStorage, sessionStorage | global:* | agree, determinism, recorded | Node's own Web Storage in a child (`--experimental-webstorage`); keys read as a set, because the order `key(i)` walks belongs to the user agent (HTML, Web Storage) |
| console | node:console | captured on the trace | nothing written to the real output, each call on the trace, the answer undefined |
| process | node:process | env is a record of strings; env from the recording (a fake that takes one); cwd; argv; exit is a fault | the real `process.env` on fresh names, cleaned after; `exit(3)` must throw and must never end the real process |
| os | node:os | shape; stated facts agree; determinism | each member's answer has the real one's shape (types, keys, element shapes; a list's length is the host's fact, so an empty list agrees with any list); EOL agrees with the platform |
| lodash, uuid | lodash, uuid | agree, determinism; uuid: v4 shape, seeded draws, recorded; the hook's vectors | the package's own vendored files (sha256 checked against the manifest) loaded by plain Node, beside the same files in lane B's sandbox |
| library vectors | zod, dayjs, luxon, date-fns, axios, express, vscode | vectors: <clause> per runnable clause | the hook's declared vectors (`lib/protocol.mjs` VECTOR_CLAUSES, `lib/vectors/<pkg>.json`): outputs the published package gave, recorded with its version and time zone; checked first that the version equals the vendored manifest's, then run under the recorded zone; a clause with no `run` is listed as not run; a package with no runnable clause fails |

`recorded` applies to effectful fakes only. A pure function asks nothing of the world: its value flows into the unit's
outcome and is compared there. That matches w2b's quiet models, which are recorded in `env.computed` and not on the
trace.

## The argument that it is sound

1. **Every comparison has a reference that is not the fake.** The reference is the real module in this process, in a
   temporary folder, on the real event loop, in a child with Node's Web Storage, or the published package's code or
   recorded outputs. Where none exists, the clause states what every real instance satisfies, and the clause is first
   run on the real platform. A clause the real module fails is reported as a harness defect (`HARNESS`), and that
   fails the run.
2. **The inputs are not chosen for the fake.** Each family draws its inputs from a fixed seed (boundary values first),
   the same for every fake of its specifier. No input, table or threshold was read from the 44 AACR instances or from
   any fake's source.
3. **A fake is compared on the same world as the real module.** A fake may start with a world of its own. w2b's fs
   draws what an untouched path holds, by the seed and the path, and forces the folders on the way to a folder.
   Before the script first touches a path, the harness asks the fake what is there, using the question the step
   itself would ask first (its stat), then the folders on the way, which are decided by then so nothing new is drawn.
   The real folder is given the same folders and file bytes. Only untouched paths are copied this way. What the run
   made, moved or removed is compared, never copied, so a fake whose writes are wrong still disagrees. The clause
   scripts use names the fake's world holds as absent, and a case where the world already holds the name is counted
   apart, never as agreement.
4. **The real event loop is measured, not trusted.** Node takes the loop time afresh at each arm and counts whole
   milliseconds. Under load, two timers whose due instants are g ms apart can swap once the arm skew reaches g − 1.
   This was observed: `setTimeout(c0, 2); setTimeout(c1, 0)` fired c0 first at load 80. So a real measurement counts
   only when its skew stays below the smallest gap less 1 ms. Skew means the delay between the instant a timer was
   meant to be armed (the start; its parent's due instant for a nested one; its previous due for an interval) and the
   instant it was. A measurement over the limit is taken again, up to five times. A case with no clean measurement is
   counted unmeasured, never as agreement. The script generator keeps out every tie between timers that do not share
   an arm turn and a delay: those are the only ties the loop leaves unordered. Distinct delays sit 10 ms apart, and the
   coercion scripts use lists 1, 20 and 30 ms long. node:test's mock timers are not the reference. They fire
   `setTimeout(f, 0)` before `setTimeout(g, 1)` armed earlier, and a nested 0 ms timer in the same tick, so they
   disagree with the loop.
5. **No member is judged that the fake does not model.** Through a recording proxy every member exists. The harness
   asks the registry (`modelOf`) whether a member has a model, and never infers it from `typeof`. Two harness defects
   were found and fixed this way: a `tick` member the proxy answered, and a `.call` read on a proxied function, which
   the proxy answers as a recorded member.
6. **The mechanism is shown to be load-bearing.** Under `--break` every comparison agrees and no clause is checked on
   the fake, so all three wrong fixtures are admitted and the run exits 1. Each wrong fixture names the clause that
   must refuse it, and the plain run refuses each one on that clause. Each family also caught a defect in a good fake
   during this lane, which shows the family has teeth:
   - fetch `request` caught my own fixture fetch, which accepted a GET with a body;
   - `env is a record of strings` caught my fixture process.env, which held `1` where Node holds `'1'`;
   - storage `agree` caught the fixture's key order, which led to the set rule above;
   - and the sibling findings below.

## The measurement (seed 1, 12 cases per family; commands in lane/w2e-fake-conformance-result.md)

| set | fakes | pass | clauses | checks |
|---|---|---|---|---|
| fixtures, good | 12 | 12 | | |
| fixtures, wrong | 3 | 3 refused (fs-previous-write on write-then-read, path-unnormalised on agree, timers-arm-order on virtual order) | | |
| this tree's exec/fakes | 0 (none has landed here) | | | |
| w2b tree (Node core, 12 specifiers) | 12 | 8 | | |
| w2c tree (web, 16 globals) | 16 | 14 | | |
| w2d tree (libraries, 8 packages answered) | 8 | 7 | | |

The exact totals and the per-fake clause lists are in the result file.

The failing cases found in the sibling trees were each sent to the group with the case and a mechanism that restores
the invariant:

- the virtual clock (exec/run.mjs `runTimers`): an interval that clears itself in its own callback keeps firing,
  because the firing entry is off the queue during its callback and is re-armed after it. Real Node fires it once.
- w2b fs: a path under a file answers ENOENT where Node answers ENOTDIR.
- w2b url: `pathToFileURL` drops a trailing separator.
- w2b timers: a delay below 1 is not coerced to 1 ms, so `setTimeout(c0, 1); setTimeout(c1, 0)` fires c1 first.
- w2c Response: `Response.json(undefined)` resolves where the real one throws TypeError.
- w2c fetch: `json()` answers a recording handle while `text()` answers "{}"; on every real Response `json()` is the
  parse of the text.
- w2d vscode: no clause runs through the hook alone.

## Limits

- No network, so fetch is held to its protocol and to the real Request and Response classes, not to a server.
- `os` values are the world's, so only their shapes and stated facts are compared.
- A hook's declared vectors are as good as their recording. The harness checks the version against the vendored
  manifest and the time zone, not how the vectors were recorded (`lib/vectors.mjs`).
- The real fs is Linux's: an unlink of a folder answers EISDIR, which macOS answers EPERM.
- The timer clauses need a measurable loop. At a load where no try is clean, a case is unmeasured, and a fake with
  every case unmeasured fails with "no check ran", never passes.
