# Lane w2b-node-fakes: result (2026-11-01)

Branch `lane/w2b-node-fakes`, cut from `lead-vm` 4747022f. Design: `langs/ts/design/w2b-node-fakes.md`.

## What landed

- `langs/ts/exec/fakes/`: behavioural fakes for `fs` (+`fs/promises`), `path`, `url`, `crypto`, `timers` (+`timers/promises`),
  `process`, `console`, `buffer`, `os`; registry `index.mjs`; shared `common.mjs`; a protocol test per fake
  (`<module>.test.mjs`) and the runner `protocols.mjs`.
- `langs/ts/exec/fake.mjs`: the recording proxy consults `Environment.modelOf(path)` on get / call / new / set / has /
  delete. Every operation is recorded as before; a modelled member answers from its model. Quiet (pure) models
  (path, url, buffer, os, digests) keep their operations in `env.computed` and the witness record, never on the compared trace.
  `LEAN_FAKES=record` turns every model off (the recording proxy alone).
- `langs/ts/translate/library.json`: 13 rows. `path.join/normalize/basename/dirname/extname/isAbsolute/parse`
  (`receiver: module`, `reading: uninterpreted`, `arguments: string`), `path.resolve/relative` (world-read: working
  directory), `URL`, `Buffer.byteLength`, `JSON.parse`, `JSON.stringify` (each states why it is or stays a transition).
- `langs/ts/library-rows.mjs` `moduleRow`: the one predicate the lint (`callbackNeedsLoop`) and the translator
  (`isEffectCall`) read for the module rows. It adds no refusal site, so the audit table has no new row.
- `langs/ts/tests/run.mjs`: the pair key `bRecord` (lane B under `LEAN_FAKES=record`); runtime rows `fake-protocols`
  and `module-rows`. `langs/ts/tests/module-rows.mjs` (with `--break`).
- Pairs: `fake_fs`, `fake_path`, `fake_crypto`, `fake_timers`, `fake_process`, `fake_path_row`.

## The per-fake table (the gap closed)

`b`: lane B with the fakes. `bRecord`: the same pair with the recording proxy alone (`LEAN_FAKES=record`).
Command: `node langs/ts/tests/run.mjs --pair <name>` (rows `lane B <unit> ...` and `... under the recording proxy alone`).

| pair | unit | what differs | b (fakes) | bRecord (proxy alone) |
|---|---|---|---|---|
| fake_fs | cachedCount | reads back another field of the JSON it wrote | WITNESS | PASS-bounded |
| fake_fs | readOrEmpty | tests a missing file's code against ENOTFOUND | WITNESS | PASS-bounded |
| fake_fs | savedName | promise form: reads another field | WITNESS | PASS-bounded |
| fake_fs | lineCount | refactor | PASS-bounded | PASS-bounded |
| fake_path | isIndex | basename compared without the extension | WITNESS | PASS-bounded |
| fake_path | joinedPlainly | expects the Windows separator from path.join | WITNESS | PASS-bounded |
| fake_path | isScript | refactor | PASS-bounded | PASS-bounded |
| fake_crypto | fingerprint | SHA-1 hex length for a SHA-256 digest | WITNESS | PASS-bounded |
| fake_crypto | newId | four UUID groups | WITNESS | PASS-bounded |
| fake_crypto | digest | refactor through Node's Hash object | PASS-bounded | WITNESS (no behaviour differs: removed) |
| fake_timers | status | returns the state a timer will set | WITNESS | PASS-bounded |
| fake_timers | settled | compares the resolved value to another | WITNESS | PASS-bounded |
| fake_timers | echo | refactor | PASS-bounded | PASS-bounded |
| fake_process | port | another default when PORT is unset | WITNESS | PASS-bounded |
| fake_process | withMode | reads a variable it did not write | WITNESS | WITNESS (the reads differ on the trace) |
| fake_process | host | refactor (`??` against a destructuring default) | PASS-bounded | PASS-bounded |
| fake_path_row | outPath | refactor | PASS-bounded, lane A proved | PASS-bounded |
| fake_path_row | sameTwice | one join for two | PASS-bounded, lane A proved | WITNESS (no behaviour differs: removed) |
| fake_path_row | joinThenLog | join moved across a request | PASS-bounded, lane A proved | WITNESS (no behaviour differs: removed) |
| fake_path_row | reordered | parts in the other order | WITNESS, lane A not proved | WITNESS |

The gap closed: 11 changed units are WITNESS with the fakes and PASS-bounded with the proxy alone. Separately, 3
refactors were a WITNESS under the proxy alone with no behaviour differing (a pure call recorded as a request), and are
PASS with the fakes. Every refactor stays PASS-bounded.

## Protocols (the fakes against the real modules)

`node langs/ts/exec/fakes/protocols.mjs` (suite row `runtime fake-protocols`):

    FAKE PROTOCOLS: 9 fakes, every protocol holds and every --break goes red: buffer 1/1 (break: 1 red); console 1/1 (break: 1 red); crypto 3/3 (break: 3 red); fs 6/6 (break: 5 red); os 1/1 (break: 1 red); path 4/4 (break: 4 red); process 3/3 (break: 3 red); timers 2/2 (break: 2 red); url 2/2 (break: 2 red)

fs runs the same sequences on the fake and on a real temporary folder, comparing every value, error code and syscall:
write-then-read, ENOENT/EEXIST/ENOTDIR/EISDIR/ENOTEMPTY, listing, rename, copy, and the promise and callback forms.
fs's trace test stays green under `--break`, as intended: the fake changes no trace record.
The protocol names were sent to the group for w2e (write-then-read, exists-after-write, enoent-on-missing,
eexist-on-mkdir, join-equals-node, parse-format-roundtrip, hash-equals-node, uuid-shape, fires-in-due-order,
cleared-never-fires, env-from-record, exit-faults). w2e has not landed; these tests are its stand-in.

## Rows

`node langs/ts/tests/module-rows.mjs`:

    module rows: both: pure; in_callback: pure; not_string: transition; cwd_read: transition; lint: callback admitted

`node langs/ts/tests/module-rows.mjs --break` (a table without the module rows): red (the first pure assertion fails).

## Static context (no census run)

Across the 40 census roots (`/root/da/census/repos`, 114,836 .ts/.js files outside node_modules, read-only `rg`), the
files importing each modelled module: fs 1,868, path 1,698, crypto 521, url 461, os 373, timers 7, process 6,
buffer 2. 763 files read `process.env.` (the global, now the same fake). Command:
`rg -l --type ts --type js -g '!node_modules' -g '!*.d.ts' "from ['\"](node:)?<m>(/promises|/posix)?['\"]|require\(['\"](node:)?<m>(/promises)?['\"]\)" .`
This is no unblock count: w2a's ranking is the validator.

REGRESSION_PLACEHOLDER
