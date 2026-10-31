# The sandbox list: what lean's sandbox may read, write, start and install, per project

## What the file is

A project can keep one file, `.gate/sandbox.json`. It is the same file DA's build sandbox reads (DA:
`docs/architecture/sandbox-allow-list.md`, `research/open-code-review/d3/harness/sandbox_allow.py`), with the same
words. Lean reads it for lane B: the process that runs a unit's code (the lane B worker, and the child that runs a unit
no parent holds).

Lean reads the file from the **parent commit** of the change (`git show <parent>:.gate/sandbox.json`), never from the
working tree, so a change cannot widen its own list. `pr.mjs` reads it at `--base`; `check.mjs` reads it at
`--sandbox-base <ref>`, in the candidate's checkout. The code is `exec/sandbox-list.mjs`.

| field | what it says to lane B | with no file |
|---|---|---|
| `read.allow` | paths lane B may read beyond what it is given (lean's sources, the two files' checkout, their `node_modules`) | none |
| `read.deny` | paths it may not read, even inside what it is given | none |
| `write.allow` | paths it may write | none (lean's own `LEAN_LIBRARY_CASES` folder only, when set) |
| `write.deny` | paths it may not write, even when allowed | none |
| `spawn.allow` | programs it may start | none |
| `spawn.deny` | programs it may not start, even when allowed | none |
| `install.allow.lockfile` | `true`: a package that the lockfile beside a `node_modules` folder pins is given to the run | every package there is given |
| `install.allow.packages` | packages given even when the lockfile does not pin them | |
| `install.deny` | names always refused: a package, and a program `spawn` would start | none |
| `install.allow.tools` | DA's build's tools; lane B does not read it (its programs are `spawn`'s) | |
| `process_list` | `"real"`: the run may list this machine's processes; `"hidden"`: it may not | hidden |

Paths are relative to the root of the checkout, or absolute. A program is a bare name (the one `PATH` finds) or a path.
A file with an unknown field, a wrong type or a bad value is refused, with every wrong field named, and no unit runs.

## The defaults

With no file at the parent commit, lane B's sandbox is exactly today's: the same Node flags, no row in the certificate.
It reads lean's sources, the checkout of the two files and their `node_modules`; it writes nothing; it starts no
program; it cannot list processes (the permission model refuses `/proc` and every program). Lean itself installs
nothing: a package a unit imports is a fake inside the sandbox, and the only packages there are the ones already in
`node_modules`.

Once a file exists, `install.allow.lockfile` (true unless the file says false) means: a package in a `node_modules`
folder that the nearest lockfile above it does not pin is not given to the run, unless `install.allow.packages` names it.

## One example

```json
{
  "version": 1,
  "install": { "allow": { "lockfile": true, "packages": ["esbuild"] }, "deny": ["node-ipc", "curl"] },
  "read": { "allow": ["../shared-fixtures"], "deny": ["secrets"] },
  "write": { "allow": [".lean/scratch"] },
  "spawn": { "allow": ["git"] },
  "process_list": "hidden"
}
```

Lane B may read `../shared-fixtures` beside the checkout, and not the checkout's `secrets` folder. It may write in
`.lean/scratch`, start `git`, and nothing else; `curl` is refused even if `spawn.allow` named it. It is given the
packages the lockfile pins, plus `esbuild`; `node-ipc` is never given, pinned or not.

## What the certificate says

The certificate of a unit run under a file has a `sandbox` field: where the list came from (`list`: the commit, the
path, the file's sha256), the `process_list` applied, and `refused`, one row per refused name:

```
sandbox: refused read /repo/secrets by read.deny
sandbox: refused install node-ipc by install.deny
sandbox: refused install left-pad by install.allow
sandbox: refused spawn curl by spawn.allow
```

A path or a package is refused when the run starts (the row says so even if the unit never touches it). A program is
refused when the unit's code tries to start it, and the code gets `ERR_ACCESS_DENIED` naming the row. `pr.mjs` turns
each row into a record `{ check: 'sandbox', kind: 'refuse' }` of the report. Nothing is skipped silently.

## How it is held

- Reads and writes are Node's permission model (`--allow-fs-read`, `--allow-fs-write`). The model has no deny, so a
  denied path inside an allowed folder is written as allows of everything beside it, on each level down. The folders on
  the way can then not be listed as a whole.
- A refused package is a denied path: its folder in `node_modules` (and its copy in pnpm's `.pnpm` store).
- Programs: the model's switch is all or nothing (`--allow-child-process`). Lean passes it only when the list allows a
  program, and replaces every `child_process` door in the process with one that starts only the allowed names. A
  shell command starts the shell, so its name is `sh` (or the shell the options name): allowing `sh` allows anything
  the shell runs. A started program runs outside Node's permission model: allow only what you trust.
- `process_list: "real"` gives `/proc` to read (Linux) and the program `ps`. On Linux `/proc` also shows the command
  lines and environment variables of other processes of the same user, which undoes the reduced environment of
  `design/sandbox-boundary.md`. That is why lean's default is hidden (today's), where DA's build default is real.

## Not done

- DA's reader (`sandbox_allow.py validate`) refuses unknown fields, so a file with `read`, `write` or `spawn` is
  refused by DA's build today. Its schema needs these three fields (it may ignore them).
- `process_list` defaults differ: absent means real for DA's build, hidden for lane B (see above).
- A unit's code that starts an allowed package manager can install from the network; `install` is not checked against
  a manager's arguments.
- A unit run in lean's own process (`--in-process`, the tests' runs) has no permission model and the list is not
  applied there.
