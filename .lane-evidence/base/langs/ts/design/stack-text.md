# Lane B: an Error is its class and message, not its stack text

## The construct

A unit that logs `error.stack`, returns it in a field, or passes it to the outside:

    catch (error) { this.logger.error(`Failed: ${error}`, error?.stack); }

ECMA-262 leaves the text of `stack` to the host (it is an implementation-defined property, not a language value). V8
writes the header (`Name: message`) and one `    at ...` line per frame, each naming the file and the line and column
of the copy that ran. Lean runs the parent and the candidate from two files (a temporary folder beside the project, or two
file names), so the frames of byte-identical units differ by construction, and an edit that moves lines changes every
column. Two findings read WITNESS for it alone (immich 14874 and 17535, `applyMotionPhotos`), and a corpus unit
(`SendMessageUseCase.execute`) read WITNESS with parent and candidate identical.

## The reading (exec/fake.mjs, `render`)

1. An Error renders as its class and message. This holds for an Error of the sandbox's own realm too (the TypeError the
   engine raises for `null.size`): the test is the `[object Error]` tag, since `instanceof Error` is false across realms.
   Before, such an error rendered as `{}`, so a thrown or caught engine error with another message was PASS-bounded.
2. A string drops its frame lines: a line of four spaces, `at `, and an engine-written location (`file:line:column`,
   `<anonymous>`, `native`, `index N`, `unknown location`), never the first line. The header stays, so a changed class or
   message is a WITNESS. A string that only holds `at` stays whole: `arrived at the gate` has no such line, and
   `    at stage one (planner)` has no location. A unit's own text shaped exactly like a frame, in a later line, is read as
   a frame; the cost is a missed difference confined to such a line.
3. The directories lean loaded the two copies from render as `<root>` (`setRoots`, told once per pair by `sideLocations`
   in exec/run.mjs): each side's package root, the part of each unit file's path the other side does not share (the
   temporary folder), and their real paths. When the two unit files bear different names (`.lean_base_N_x.ts`,
   `.lean_head_N_x.ts`; `parent.ts`, `candidate.ts`) each full path renders as `<unit file>`. This covers `__filename`,
   `__dirname`, `import.meta.url` and a path in a message. A path of another place, and a directory name that only starts
   like a root (`/a/backend2` against `/a/backend`), stay as they are.

No Dafny: lane A, the lint and the theorem are untouched.

## Soundness

Lane B only, and it only finds differences, so every change here can lose a WITNESS and none can invent a PASS-proved.
The lost witnesses are the frame lines of a stack, the place the copies were loaded from, and the name of the unit file;
none is a behaviour of the unit, since the two copies cannot be loaded from one place. The class and the message of an
Error, the words around a path, and every other string stay compared. Gained witnesses: an engine error whose message
differs (`reading 'size'` against `reading 'length'`) is a difference of the JavaScript, because a caller reads
`error.message`. A refactor that renames the variable in an engine message such as `x.foo is not a function` now shows
that message difference; JavaScript shows it too.

## Measured

Pair `stack_text` (11 units, lane B, `--n 30`, results in
`results-stack-text/base` and `results-stack-text/after` under the lean-v3 folder): logStack, returnsStack and engineStack
WITNESS before and PASS-bounded after; logWhere WITNESS before and PASS-bounded after; engineMessage PASS-bounded before
and WITNESS after; the other six as expected before and after. A gate-shaped scratch pair (byte-identical unit in a
`.lean-gate-base-X` folder beside the project, logging a stack, `__filename`, `import.meta.url` and a message with the
path): WITNESS before, PASS-bounded after. Two reduced `applyMotionPhotos` pairs for the immich rows: WITNESS before,
PASS-bounded after (the sources are not on this machine, so the units are reductions, not the originals).

## Open

- A string whose first line is itself a frame (a unit that logs one frame, `stack.split("\n")[1]`) keeps it: the first line is the header.
- Percent-encoded `file://` paths (spaces) are not matched.
