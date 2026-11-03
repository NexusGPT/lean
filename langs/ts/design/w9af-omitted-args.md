# w9af: a call with a trailing argument left out

## The miss

Lane B never called a callable with a trailing argument left out, so a change to a parameter's default, to an
`arguments.length` test or to an `=== undefined` branch on a trailing parameter could pass unseen.

- **Driven functions** (`exec/run.mjs` driveOne, design/callbacks.md). A function the unit hands out was called on
  exactly `DRIVE_ARGS` (3) drawn arguments. Each later call (`DRIVE_CALLS`) drew fresh arguments. A defaulted
  parameter only met its default when the pool happened to draw `undefined`. No two calls shared a leading argument,
  so state the first call keyed on it (a cache per key) was never met again. three.js#34798~c1 has exactly this
  shape: `WebGLRenderStates` returns `get(scene, renderCallDepth = 0)`, and the mutant's default `1` only shows on a
  second `get(scene)` of the same scene.
- **The unit's own parameters** (`exec/gen.mjs` inputsFor). An optional parameter drawn absent was passed as an
  explicit `undefined`. A default applied, but `arguments.length` never shrank.

## The mechanism

1. `patch.mjs parameterReads`, at instrumentation. For each function, the statement marks record its parameters:
   the name, whether a caller may leave the parameter out, and the first statement of the body that reads it (the
   innermost statement around the first read in source order). A caller may leave a parameter out when it has a
   default, a `?`, a bracketed JSDoc `@param`, or a body that tests it against `undefined`/`null`/`typeof` or reads
   `arguments`. The record sits on the function's body site. The function's frame carries it as `body`, and the
   frame that exits last is `state.exited`. None of this enters an observation.
2. `exec/run.mjs omittedForms`, at a drive. After the drawn calls, the driven function is called again on the
   **first call's own leading arguments**:
   - once for each optional trailing parameter left out, the shortest call last;
   - then with `undefined` passed explicitly where the trailing run starts (its own boundary: a default applies, the
     length does not shrink).

   The forms are the same on both sides and need no draw, so the seeded inputs are unchanged. A function with no
   optional trailing parameter gets no form, which keeps the search budget. Each form is its own record in
   `drives[i].omitted`, with its own requests. The drive's `trace` is the drawn calls' alone, so a drive with no form
   records exactly what it recorded before.
3. `exec/run.mjs firstDifference`. When two drive records agree except in their omitted forms, the witness is
   reported at the statement that reads the parameter left out (kind `drive omitted argument`, `where.omitted`). It
   is its own site (exec/sites.mjs), so a witness at another statement (the PR's own change) does not mask it.
4. `exec/gen.mjs omitTrailing`. An optional trailing parameter of the unit drawn absent is left out of the call on
   every odd input, and passed as `undefined` on the even ones. The choice depends on the input's index, not on a
   draw.

## Checks

- `tests/pairs/omitted_args_returned`: a returned `get(scene, depth = 0)` whose default moves. WITNESS at
  `if (depth >= list.length)`. `LEAN_BREAK=w9af-omitted-drives` gives PASS-bounded.
- `tests/pairs/omitted_args_unit`: `scale(value, factor = 2)` (explicit undefined suffices, WITNESS before and after)
  and `pad(text, width?)` testing `arguments.length`. `LEAN_BREAK=w9af-omitted-args` gives PASS-bounded.

## Open

- "Unused by some caller in the file": a trailing parameter that a same-file caller never passes, but that has no
  default and no undefined test, is not yet read as optional.
- A witness from the unit's own omitted parameter is reported at the outcome's statement (the return), not at the
  statement that reads the parameter.
