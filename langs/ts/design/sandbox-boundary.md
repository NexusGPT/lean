# The sandbox boundary of lane B
What a unit's code can reach when lane B runs it, measured by probes on this head, not recalled. The probes are
`fixtures/sandbox/probes.ts` (each unit attempts one operation and answers what happened), `fixtures/sandbox/blank.ts`
(the other side: every unit answers the empty string, so the witness shows the probe's outcome) and
`fixtures/sandbox/new-unit-probe.ts` (a unit no parent holds). `bash fixtures/sandbox/probe.sh` runs every probe in
both network modes against a listener on 127.0.0.1:47391 it starts and stops; its output is
`sandbox-boundary-probes.txt`, beside this note, with each command and its output.

## Two layers
A unit's code runs in a `vm` context (`exec/run.mjs` `sandbox`) whose globals are fakes: `fetch`, the clock, random,
timers, the console, `process`. The context is not a security boundary: it is handed host intrinsics (`Buffer`, `Object`,
`Array`, `Promise` and others are the host's), and `Buffer.constructor` is the process's own `Function`, so
`Buffer.constructor('return process')()` is the real `process` (probe `reachHost`: `ok: pid number, permission object`).
What holds after that is the process the unit runs in:

- A unit the parent holds runs in the lane B worker (`exec/worker.mjs`), forked with Node's permission model:
  `--permission` and `--allow-fs-read` for lean's sources, the trees of the two files and their `node_modules`.
- A unit the parent does not hold runs through `exec/new-unit.mjs`, in a child started with
  `--experimental-vm-modules` and **no permission model** (until the section of 2026-10-30 below: it now takes the
  worker's flags).

## What the probes measured (node v24.22.2, Linux 6.8)
In the lane B worker (units the parent holds):

| Probe | Operation | Outcome |
|---|---|---|
| `reachHost` | the real `process` through `Buffer.constructor` | reached |
| `fileRead` | read `/etc/hostname` (outside the allowed trees) | `ERR_ACCESS_DENIED ... Use --allow-fs-read` |
| `envRead` | `process.env` of the real process | **open**: 32 variables, readable (3 since the section on the children below) |
| `fileWrite` | write a file in the temp folder | `ERR_ACCESS_DENIED ... Use --allow-fs-write` |
| `childProcess` | `spawnSync('true')` | `ERR_ACCESS_DENIED ... Use --allow-child-process` |
| `nativeAddon` | `process.dlopen` | `ERR_DLOPEN_DISABLED: Cannot load native addon because loading addons is disabled.` |
| `workerThread` | `new Worker(..., { eval: true })` | `ERR_ACCESS_DENIED ... Use --allow-worker` |
| `rawBinding` | `process.binding('tcp_wrap')`, `process._linkedBinding` | `ERR_ACCESS_DENIED` both |
| `netSocket` | `net.connect` to the listener | **open**: `ok: connected` |
| `hostFetch` | the process's own `fetch` to the listener | **open**: `ok: status 200` |
| `dnsLookup` | `dns.lookup('localhost')` | **open**: `ok: ::1` |
| `udpSend` | `dgram` send to the listener's port | **open**: `ok: sent` |
| `sandboxFetch` | the context's `fetch` | a fake: no socket, `object` |

Through `new-unit.mjs` (a unit with no parent): `newUnitReach` answers `write ok; spawn ok (exit 0)` and
`newUnitNet` answers `connect ok`. **Nothing is denied there.**

This Node has no network switch in its permission model: `node --help` lists `--allow-addons`, `--allow-child-process`,
`--allow-fs-read`, `--allow-fs-write`, `--allow-inspector`, `--allow-openssl-store`, `--allow-wasi` and
`--allow-worker`, and no `--allow-net`. The live Node documentation (nodejs.org/api/cli.html, read 2026-10-30) gives
`--allow-net` as "Added in: v25.0.0", Stability 1.1, with no backport listed: "When using the Permission Model, the
process will not be able to access network by default. Attempts to do so will throw an `ERR_ACCESS_DENIED` unless the
user explicitly passes the `--allow-net` flag".

## 2026-10-30: the network-denied mode (`LEAN_NET=deny`)
**The reading.** `LEAN_NET` is `open` (unset) or `deny`. Any other value is an error, never a guess. Under `deny`,
`exec/net-deny.mjs` is installed once per process, before a unit's code loads (`runPairInFlight`, `runNew`). It replaces
every JavaScript door to a socket or a name lookup with one that refuses. The doors are `net.Socket.prototype.connect`
(which also covers tls, http, http2 and the process's own `fetch`), `net.Server.prototype.listen`, `dgram` `bind`,
`connect` and `send`, and every `dns` lookup and resolve in its callback, promise and `Resolver` forms. A refused
`connect` fails as a refused connection does: the error `ERR_ACCESS_DENIED` is emitted on the socket. Each refusal is
kept, and the unit's record (`record.sandbox`) gives the mode, what holds the deny in that process, and every refused
attempt as `{ api, target, side, failed }`. A unit run in another process (new-unit.mjs) brings that process's entry.
The replaced methods are sealed (non-writable, non-configurable): probe `unseal` answers
`Cannot redefine property: connect` under the mode.

On a Node whose permission model has `--allow-net`, the worker's `--permission` would deny the network by default. So the
open mode passes `--allow-net` there (`netFlags`), keeping the open default measured above. The deny mode leaves it
out, and the permission model then refuses under lean's bindings.

**Why it is sound in the worker.** To open a socket past the mode, code would need a door the mode does not replace.
The JavaScript modules reach the network through the methods above: `tls` and `http` sockets are `net.Socket`s, and
undici's `fetch` connects through `net`. The native doors below them that were probed (`process.binding`,
`process._linkedBinding`, `process.dlopen`, a child process, a worker) are refused by the permission model (probes
`rawBinding`, `nativeAddon`, `childProcess`, `workerThread`). WASI and the inspector are refused by the same model's
defaults (`--allow-wasi` and `--allow-inspector` are not given), but no probe exercises them yet. The original methods are held only in the mode's
closure, so code that reaches them sees only the sealed replacements. The probes `netSocket`, `hostFetch`, `dnsLookup`
and `udpSend` each answer `ERR_ACCESS_DENIED` under the mode, with the listener up, so the refusal is the mode's and not
an empty port.

**The pair.** In `tests/pairs/sandbox_boundary`, `statusOf` calls `fetch`, an outside call answered by the same fake on
both sides: PASS-bounded in both modes, and under `deny` its record names no attempt (the fake opens no socket).
`reachNet` and `reachFetch` leave the context and connect (`net.connect`, the process's `fetch`). Under `deny`, both sides
answer `ERR_ACCESS_DENIED` (PASS-bounded) and the record names `net.connect 127.0.0.1:9` and
`net.connect 127.0.0.1:1080`. Before the mode, those three rows were red with `sandbox not recorded`: the verdicts
were the same, but nothing refused or named the attempts (probe `netSocket` shows the same call connecting out). Those two units are not lane B rows in the open mode, because
there the answer is the machine's, not the unit's.

**What stays open, and why.**
- `process.env` of the worker is readable by code that leaves the context. The permission model has no switch for it.
  The fix is to start the worker with a reduced environment (`fork`'s `env`). That is a change to what lean's own
  reads see (`LEAN_*`, `NODE_OPTIONS`), and it is left to its own lane. (Done: the section on the children below.)
- A unit with no parent runs in a child without the permission model. There, the mode replaces the same JavaScript
  doors, but the raw bindings stay open, and its record says so (`lean's bindings only: this process runs without the
  permission model, so the raw bindings are not refused`). File writes and child processes are open there in both
  modes. Giving `new-unit.mjs`'s child the worker's flags is the structural fix, left to its own lane. (Done: the
  section on the children below.)
- The deny holds against the unit's code, not against a hostile process. Containment of hostile code as a service is
  DA's (the gate's profile: an operating-system sandbox, a network namespace), never lean's.

## 2026-10-30: the children of lane B hold the same sandbox
**The reading.** Every process lean starts to run a unit's code holds the same sandbox: the permission model with the
read trees of the unit's files (`workerFlags`), the network flag of the mode (`netFlags`), and only the environment
variables lean's own code reads there (`workerEnv`: `LEAN_*`, `NODE_OPTIONS`, `PATH`, `HOME`, `XDG_CACHE_HOME`).
- The lane B worker is forked with `workerEnv()` as its whole environment.
- `exec/new-unit.mjs` starts its child with `workerFlags(opts)`, `--experimental-vm-modules` and `workerEnv()`. A
  process runs a parentless unit itself only when it holds both vm modules and the permission model (that child, or a
  caller already sandboxed); any other process, lean's command line included, hands the unit to the child. Before, the
  test was vm modules alone, so a caller started with that flag would also have run the unit unsandboxed.
- The existence check outside the read trees (the permission model throws where the run asks whether a path exists)
  is one function, `absentOutsideReads` in `run.mjs`, installed by the worker and by new-unit.mjs's child.

**Why it is sound.** The permission model has no switch for `process.env`: code that leaves the vm context reads the
real process's. What the process is not given is what that code cannot read, so the environment is cut where the
process starts. The variables kept are the ones lean reads in these processes: its own `LEAN_*` settings (the library
table and cases, the worker heap, the CPU baseline, the network mode), `NODE_OPTIONS` (Node's own flags), `PATH`, and
`HOME` and `XDG_CACHE_HOME`, from which `lower.mjs` derives its cache folder. Both sides of a unit run in the same
process, so an answer read from the environment is the same on both sides before and after; the cut changes what a
unit can see, never a comparison. The new-unit child reads what the worker reads: lean's sources, the tree of the
candidate (the nearest folder holding `.git`, else its package root), a named `tsconfig.json`'s folder, and every
`node_modules` folder from those trees up to the root, which is where TypeScript's and Node's resolution look.

**The pairs.** `tests/pairs/sandbox_boundary`, lane B `envLeak`: the candidate answers the names of the worker's
variables outside the kept set, the parent answers none. Before: WITNESS (every other variable of the caller was
visible). After: PASS-bounded. `tests/pairs/new_unit`, `escape.ts` `escapes`: a unit no parent holds tries a file
write, `spawnSync('true')`, `readdirSync('/')` and the environment, and throws naming each door that opened. Before:
NEW with faults 30 of 30. After: NEW with faults 0.

**The probe log** (`bash fixtures/sandbox/probe.sh`, regenerated in `sandbox-boundary-probes.txt`; `envRead` now
answers the names, and `newUnitReach` also tries the read and the environment). The lines that changed, in both modes:

```
envRead       ok: 32 variables
           -> ok: 3 variables: HOME LEAN_NET PATH
newUnitReach  write ok; spawn ok (exit 0)
           -> write ERR_ACCESS_DENIED ... Use --allow-fs-write ...; spawn ERR_ACCESS_DENIED ... Use --allow-child-process ...;
              read / ERR_ACCESS_DENIED ... Use --allow-fs-read ...; env 3 variables: HOME LEAN_NET PATH
newUnitNet, LEAN_NET=deny: record.sandbox.by
              lean's bindings only: this process runs without the permission model, so the raw bindings are not refused
           -> lean's bindings under the permission model (this Node has no --allow-net)
```

Every other probe line is unchanged.

**What stays open, and why.**
- The network in the open mode, in the new-unit child as in the worker (`newUnitNet` answers `connect ok`): this Node's
  permission model has no network switch; `LEAN_NET=deny` closes it in both (`connect ERR_ACCESS_DENIED`).
- The kept variables are readable, and their values are the caller's: a secret placed in a `LEAN_*` variable, in
  `NODE_OPTIONS` or in `PATH` would be visible to the unit. The `LEAN_*` prefix passes every such variable the caller
  sets, including ones only the suite or the command line reads; lean keeps no secret in any of them.
- Reads inside the given trees stay open by design: the unit's own repository and its packages are what the run reads.
- Containment of hostile code as a service stays DA's (an operating-system sandbox, a network namespace), never lean's.
