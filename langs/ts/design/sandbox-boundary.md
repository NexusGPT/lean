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
  `--experimental-vm-modules` and **no permission model**.

## What the probes measured (node v24.22.2, Linux 6.8)
In the lane B worker (units the parent holds):

| Probe | Operation | Outcome |
|---|---|---|
| `reachHost` | the real `process` through `Buffer.constructor` | reached |
| `fileRead` | read `/etc/hostname` (outside the allowed trees) | `ERR_ACCESS_DENIED ... Use --allow-fs-read` |
| `envRead` | `process.env` of the real process | **open**: 32 variables, readable |
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
  reads see (`LEAN_*`, `NODE_OPTIONS`), and it is left to its own lane.
- A unit with no parent runs in a child without the permission model. There, the mode replaces the same JavaScript
  doors, but the raw bindings stay open, and its record says so (`lean's bindings only: this process runs without the
  permission model, so the raw bindings are not refused`). File writes and child processes are open there in both
  modes. Giving `new-unit.mjs`'s child the worker's flags is the structural fix, left to its own lane.
- The deny holds against the unit's code, not against a hostile process. Containment of hostile code as a service is
  DA's (the gate's profile: an operating-system sandbox, a network namespace), never lean's.
