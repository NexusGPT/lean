# B3-sandbox-boundary: result

## What was done and why
Lane B's sandbox boundary is now measured and written down (`langs/ts/design/sandbox-boundary.md`). It rests on probes
that are committed with their log (`langs/ts/design/sandbox-boundary-probes.txt`, produced by
`bash fixtures/sandbox/probe.sh`).

The unit's code runs in a `vm` context whose `fetch` and other outside globals are fakes. The context is no boundary:
`Buffer.constructor` is the process's own `Function`, so `Buffer.constructor('return process')()` returns the real
`process`. What holds after that is the lane B worker's permission model. On this machine (Node v24.22.2) that denies
file reads outside the given trees, file writes, child processes, native addons, worker threads and the raw bindings.
It leaves the network open (net, the process's own fetch, dns, udp) and leaves `process.env` readable.

The Node permission model's network switch, `--allow-net`, is "Added in: v25.0.0" per the live documentation, with no
backport listed, and this Node's `--help` does not have it. So the network-denied mode denies at the process's own
JavaScript bindings. On a Node that has `--allow-net`, the open mode passes it explicitly, so the default does not
silently change on an upgrade, and the deny mode leaves it out, so the permission model also refuses.

## Elements added
- `langs/ts/exec/net-deny.mjs`: `netMode` (reads `LEAN_NET`: `open` or `deny`; anything else is an error),
  `denyNetwork` (replaces and seals the socket and lookup doors of `net`, `dgram` and `dns` with ones that fail
  `ERR_ACCESS_DENIED` and record the attempt), `sandboxEntry` (the record's entry: mode, what holds it, the attempts),
  and `netFlags` (`--allow-net` in the open mode, on a Node that has it).
- `langs/ts/exec/run.mjs`: the worker's flags take `netFlags`; `runPairInFlight` installs the mode before the unit loads
  and writes `record.sandbox`, preferring the entry of the process that ran the unit (new units run in another
  process). The comment that called a network deny "the gate's profile, not lean's" now states the mode.
- `langs/ts/exec/new-unit.mjs`: installs the mode in its child and returns its `sandbox` entry.
- `langs/ts/tests/run.mjs`: a pair key `netDeny` runs lane B with `LEAN_NET=deny` and checks the verdict, the mode and
  the set of refused attempts in the record.
- `langs/ts/tests/pairs/sandbox_boundary`: `statusOf` (fetch, an outside call on both sides, PASS-bounded in both modes,
  no attempt under deny); `reachNet` and `reachFetch` (escape and connect; under deny PASS-bounded with
  `net.connect 127.0.0.1:9` and `net.connect 127.0.0.1:1080` named).
- `fixtures/sandbox/{probes.ts,blank.ts,new-unit-probe.ts,probe.sh}`: the probes and their runner.
- `langs/ts/design/sandbox-boundary.md` and `sandbox-boundary-probes.txt`.

## Before and after
- The pair, `JOBS=4 node langs/ts/tests/run.mjs --pair sandbox_boundary --result <file>`:
  - before (at 51a72da74): 4 rows, 3 failing (`sandbox not recorded` on the three `netDeny` rows);
  - after (at c7955be3a): 4 rows, 0 failing.
- The pairs whose expect.json mentions fetch, new units or the sandbox, each run with the same command and three at a
  time: alias_after_call, alias_result, asany_record_key, bench_drops, builtin_transitions, callback_behaviour,
  comma_operator, definite_assignment, exported_units_js, hash_keys, library_hooks, new_unit, non_null,
  rename_parameter, sandbox_boundary, stack_text, strict_fixer, this_param, try_catch, window_timers. Together that is
  241 rows, 0 failing, at 9398e5792. sandbox_boundary and new_unit were re-run at c7955be3a: 4 and 29 rows, 0 failing.
- `node langs/ts/exec/record.test.mjs` and `node langs/ts/exec/callees.test.mjs`: exit 0.
- No census number is owed: no reading's admission changed. The pair list changed only by the new `sandbox_boundary`.

## Defects met (findings, not fixed here)
1. **A unit the parent does not hold runs with no permission model.** `exec/new-unit.mjs` starts its child with
   `--experimental-vm-modules` only. Probe `newUnitReach` wrote and removed a temp file and ran `true` (`write ok;
   spawn ok (exit 0)`). `newUnitNet` connected out. The structural fix is to give that child the worker's flags
   (`--permission`, its read trees, `netFlags`); that needs its own lane, since the child resolves packages and
   configs the read list must cover. Under `LEAN_NET=deny` the JavaScript doors are refused there too, and the record
   says the raw bindings are not.
2. **The worker's `process.env` is readable** by code that leaves the context (32 variables on the probe run; only
   the count was read). The fix is a reduced `env` for the worker's `fork`, which changes what lean's own reads in the
   worker see (`LEAN_*`, `NODE_OPTIONS`), so it is its own lane.
3. Not probed: WASI and the inspector (refused by the permission model's defaults, since neither flag is given, but no
   probe exercises them).

## Proposed README text (for the lead to place; replaces the `**Not a jail.**` paragraph)
- **Not a jail.** The sandbox fakes the world, but it is a Node `vm` context, and code that leaves it (through a host
  intrinsic such as `Buffer.constructor`) reaches the worker process. Measured on Node 24 (`langs/ts/design/sandbox-boundary.md`,
  probe log beside it), that process denies "file writes, child processes, native addons and worker threads" and file
  reads outside the given trees. The network and the environment variables stay open: a probe connected to a local
  listener and read 32 variables. `LEAN_NET=deny` closes the network at the process's own bindings, and the unit's
  record names every attempt it refused. A unit with no parent runs without the permission model. Containment of
  hostile code is the gate's ([planned](docs/around-lean.md)).

## Left
- Defects 1 and 2 above, each a lane of its own.
- The README edit (the text above).
- A probe for WASI and the inspector.
- On Node 25 and later, the open mode's `--allow-net` and the deny mode's reliance on the permission model are written
  but not run here (this machine has Node 24.22.2 only).
