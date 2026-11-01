# Behavioural fakes and model rows for Node core (lane w2b-node-fakes, 2026-11-01)

## What

Lane B stood every imported module up as a recording proxy (`exec/fake.mjs`): each get, call, construct and set is a
record on the trace, and the answer is a seeded handle or a plain edge (null, `''`, `[]`, ...). The trace is the oracle;
the answer carries no behaviour. A unit that writes a file and reads it back, joins a path, hashes a buffer, or falls
back when `PORT` is unset meets a handle where Node would give it a value, and two versions that differ only in what they
do with that value agree on every drawn input.

A **behavioural fake** is a small stateful model of a Node core module, consulted by the recording proxy itself:

| module (specifiers, with or without `node:`) | model | `exec/fakes/` |
|---|---|---|
| `fs`, `fs/promises` | an in-memory tree; sync, promise and callback forms of one operation on one tree; Node's error codes | `fs.mjs` |
| `path`, `path/posix` | Node's own POSIX functions; `resolve`/`relative` against the fake working directory `/app` | `path.mjs` |
| `url` | Node's own `URL`, `URLSearchParams`, `format`, `parse`, `fileURLToPath`; `pathToFileURL` against `/app` | `url.mjs` |
| `crypto` | `randomUUID`, `randomBytes`, `randomInt`, `getRandomValues` from the seeded generator; `createHash`, `createHmac`, `timingSafeEqual`, `hash` Node's own | `crypto.mjs` |
| `timers`, `timers/promises` | the callback forms on lane B's virtual clock (`env.arm`); the promise forms settled on the same clock, in due order | `timers.mjs` |
| `process` | `env` a record drawn once per name and kept; `argv`, `cwd()`, `platform` stated; `exit(code)` a fault (`ProcessExit`) | `process.mjs` |
| `console` | the captured log: the call on the trace, `undefined` answered, never a fault | `console.mjs` |
| `buffer` | Node's own `Buffer` | `buffer.mjs` |
| `os` | one stated machine (Linux, x64, four cores, `/home/lean`, `/tmp`) | `os.mjs` |

The sandbox's globals `process`, `console` and `crypto` are the same module fakes (`env.module('process')`), so the
global and the imported module answer alike.

A **model row** gives lane A the pure part: `path.join`, `basename`, `dirname`, `extname`, `normalize`, `isAbsolute`,
`parse` imported from `node:path` (or `path`, `path/posix`) and called with string arguments are one bodiless function
of the module handle and the strings, with no `World` (rows `receiver: "module"` in `translate/library.json`). Rows that
stay transitions say why: `path.resolve` and `path.relative` read the working directory; `new URL(s)` and `JSON.parse`
can fail on a well-typed string; `JSON.stringify`'s text depends on key insertion order, which the value model of a
record does not hold. `Buffer.byteLength` was already pure (`PURE_RECEIVERS`); its row records the fact.

## The wiring (exec/fake.mjs, exec/fakes/index.mjs)

`Environment.modelOf(path)` asks the registry (`exec/fakes/index.mjs` `modelAt`) for the member a fake path names:
`module:node:fs.default.readFileSync` is `fs`, `readFileSync` (the interop `default` is the module itself). The proxy's
handlers consult it before anything else:

- **get**: a member the model holds is recorded as before (`get module:fs.readFileSync`) and answers the field's value
  (`process.env.PORT`, `os.EOL`) or a fake whose call the model answers.
- **call / new**: recorded as before (path and rendered arguments), counted as before, then answered by the model. A
  model that can fail (fs) keeps the seeded fault draw: one call in twelve faults as the world's unknown failure, reaching
  the unit as that form reports a failure (a throw, a rejected promise, an error handed to the callback). Pure models
  never fault.
- **set / has / delete**: recorded as before; the model stores the write (`process.env.X = 1` holds `'1'`, as Node).

A specifier with no model, and a member a model does not hold (`fs.watch`, `crypto.subtle`), keep the recording proxy's
answer exactly. `LEAN_FAKES=record` turns every model off: the recording proxy alone, the measurement of the gap and the
`--break` of every test below.

## What stays recorded, and why the trace stays the oracle

Every operation a model answers is the operation the recording proxy recorded, at the same position, with the same path
and rendered arguments: the fake changes answers, never records (the fs protocol test asserts the trace and holds under
`--break` too). The rule that keeps the trace the oracle:

> A model's answer is a function of the seed and of the operations recorded before it (their paths and rendered
> arguments), and of nothing else: no host file system, no host working directory, no wall clock, no host randomness.

Then two sides whose traces agree up to a request receive the same answer to it, so equal traces still mean the two
sides saw the same world; a side that asks something else still diverges on the trace. The models keep the rule by
construction: the fs tree is a map from absolute paths built only by recorded calls, and a path no call touched is
drawn by `(seed, path)`; `process.env.X` is drawn by `(seed, X)` and then holds what recorded writes stored; the k-th
random draw is `(seed, k)` and k counts recorded calls; the timers settle on the virtual clock from recorded delays;
path, url, buffer and hash functions are Node's pure functions of recorded arguments.

**Computed operations (quiet models).** A call of `path.join`, a digest, a `URL` parse or a read of `os.EOL` is a
function of its arguments alone: no request to the world. Lane A, through the rows, reads such a call as a pure function,
so a refactor that joins once instead of twice, or moves the join across a request, proves; if lane B kept those calls
on the compared trace it would report a WITNESS of a difference no behaviour has. So a quiet model's operations are kept
in `env.computed` (and in the witness record's events, `record.mjs`, which sees every operation on a fake) and are not
on the trace the sides are compared by. Effects stay on the trace: every fs operation, every env read and write, every
random draw, every timer, every console line. Under `LEAN_FAKES=record` nothing is quiet.

## The fs tree

`/`, `/app` (the working directory), `/tmp`, `/home/lean` exist. A path the run never touched is drawn once by the seed
and the path: absent (45%), a file holding one of the unit's own strings (40%), an empty folder (15%), then kept. A folder
on the way to a path the unit asks about, not decided yet, is a folder; a folder the run made began empty (its children
are absent, never drawn); a decided ancestor that is absent or a file makes every path below it absent. Errors are Node's
(`ENOENT`, `EEXIST`, `ENOTDIR`, `EISDIR`, `ENOTEMPTY` with `code`, `errno`, `syscall`, `path` and Node's message); lean
builds them, so their message is observed (`programBuilt`), as a fake fault's is. The protocol test runs the same
sequences on the fake and on a real temporary folder and compares every answer and every error code and syscall.

## The rows (library-rows.mjs moduleRow)

One predicate, shared by the lint (`callbackNeedsLoop`) and the translator (`isEffectCall`): the call is
`<binding>.<member>(...)` on a default, namespace or `import = require` binding of a listed specifier, or `<member>(...)`
on a named import of it; the row's reading is `uninterpreted`; with `arguments: string` every argument's type is a
string. Soundness: Node's `path.posix` functions are total and deterministic on strings (they read no state; `resolve`
and `relative`, which read the working directory, are not rows), so one bodiless function of the same arguments is the
same value on both sides, and dropping the `World` loses no effect. On a non-string argument the function can throw
(`ERR_INVALID_ARG_TYPE`); such a call is no row and stays a transition. The predicate is no refusal: it adds no decision
site to the audit table (lower.mjs `--audit` lists refusal sites; the rows only ever widen what is read as pure, and the
lint and the translator widen it alike).

## Limits (stated, not hidden)

- An awaited timer (`timers/promises`) settles on host turns in due order, so a race is won by the shorter delay; the
  callback timers of `node:timers` fire after the call as the sandbox's global timers do. A unit that awaits a sleep and
  a callback timer in one run sees the awaited one first, whatever the delays.
- `process.exit` throws: a `catch` in the unit can swallow it, which Node's exit cannot be.
- The global `crypto` is the module fake: `crypto.createHash` answers on the global as on the module, where Node's global
  (Web Crypto) has no `createHash`.
- `Object.keys(process.env)` and a listing of a folder drawn by the world see only what the run read or wrote.
- A two-level member (`path.posix.join`, `Buffer.byteLength` through `import { Buffer } from 'node:buffer'`) is a lane B
  model and no lane A row.

## The measurement

Every pair below runs lane B twice: with the fakes (`b`) and with the recording proxy alone (`bRecord`,
`LEAN_FAKES=record`, tests/run.mjs). The per-fake table, with every command, is in `lane/w2b-node-fakes-result.md`.
