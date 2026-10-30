# Writes to a field of `process`

The construct: an assignment statement whose target is a property path of the Node global `process`:
`process.exitCode = 1`, `process.env.MODE = v`. JavaScript evaluates the target reference first (the receiver path,
`process.env` for a deeper target), then the right side, then performs the write; `exitCode` and `env` are fields of
an object the program does not own, and the write is visible to the rest of the run and to the host when it exits.

## The reading

A read of a path rooted at `process` is already a world transition (`global_handle_process`, `global_get_`). A write
is its twin: the receiver path is read (a transition for a deeper path), the value is translated, and one transition
of the world on the handle, the field name and the value records the write:

    var (wld, t0_) := ext_global_set_Option_int_World_Any_string_Option_int(wld, ext_global_handle_process(), "exitCode", Some(code));

So a changed code is a changed transition (not proved), the same write proves, and a write moved past another
transition is another order of transitions (not proved). The root `process` is not a binding the unit rebinds: a
branch that writes `process.exitCode` threads only the world (`assignedOutside` skips outside roots).

## What stays refused (`property-assign`)

- a compound or logical write (`process.exitCode += 1`, `??=`) and a write used as a value (`c = (process.exitCode = 3)`):
  each reads and writes in one step; the message says to read the old value into a local first;
- a function installed into `process` (`process.stdout.write = (s) => ...`): the outside calls it later and no
  transition reads that call;
- writes to the other outside roots (`globalThis.x = v`, `window.x = v`), to `document`, `console` or a computed slot:
  lane B's sandbox gives `globalThis` as a plain object and `window` as that same object (as in a browser; it was undefined until 2026-10-30, which made every handler reaching a timer through `window` throw on both sides and hid a real difference behind it), so it would not observe them; they
  keep their refusal. Element writes (`process.env[k] = v`) keep `index-assign`.

## Soundness

- Two different values: `ext_global_set_..(w, h, "exitCode", Some(1))` and `(.., Some(2))` differ unless 1 = 2
  (pair unit `report`, not proved, WITNESS).
- Order: a write before a log call and after it are two different sequences of transitions (unit `finish`).
- A write then a read of the field are two transitions; nothing assumes the read returns the written value, so
  `process.exitCode = 1; return process.exitCode ?? 0` is not proved equal to `... return 1` (lane B: an extra get).
- Branches: `if (f) process.exitCode = 1; else process.exitCode = 0;` against `process.exitCode = f ? 1 : 0;` proves
  by a case split on `f` (unit `settle`), the same transition with the same arguments on each path.

## Lint

The `property-assign` branch of `exprStmt` admits a plain `=` statement of a data value into a path rooted at
`process` when `process` is the outside root (a global, or an ambient declaration); the path is read like any other
read. The translator's `newValue` takes the same shape to `globalWrite`.

## Lane B

`process` is a fake (`env.module('process')`); a write through it records a `set` request with the rendered value in
the trace, so a changed exit code or a changed order is a WITNESS, and an unchanged write is PASS-bounded.

## Instances (refusals-4a5bdec.json; 50 of the 59 property-assign functions write `process`)

- `packages/cli/src/commands/role.ts:400` `process.exitCode`: refused by property-assign alone; enters by shape.
- `packages/cli/src/commands/access-card.ts:71` `process.exitCode`: property-assign alone; enters by shape.
- `packages/cli/src/commands/agent-eval.ts:167` `process.exitCode`: property-assign alone; enters by shape.
- `packages/cli/src/commands/agent.ts:91` `process.exitCode`: also opaque-mutation; stays out on that rule.
- `packages/cli/src/commands/cloud-import.ts:111` `process.exitCode`: also exception-callback; stays out on that rule.
- `apps/frontend/.../node-config-panel.tsx:61` `document.body.style.cursor`: not `process`; stays refused.
