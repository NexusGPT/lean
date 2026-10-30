# A5-held-to-outside-callee: result

## What was done and why

A held value (a value whose type nothing checked: `x as number` from any, an any value in a typed slot, a literal
holding one) was carried into a call only when the callee expression's root was an import (`importRooted`). A method
of a local an imported factory made, `client.analytics.exportCsv({ v: x as number })`, has a local at its root, so the
unit was refused `type-assertion` at the argument, though the translator reads that call exactly as it reads an
imported function: `externalCall`, a bodiless function of its arguments, the held literal handed at its own `Held_<hash>`
record type (the held field Any), any other held value by the one uninterpreted conversion both sides apply.

The fix is at the mechanism that decides where a held value is carried (`common.mjs carried`, shared by the lint and
the translator): an argument to a call whose resolved declaration sits at the top level of another module is carried
(`outsideCallee`). A callee declared in a global script or inside a namespace / `declare global` / `declare module`
block stays refused, since a reading may give those exact operations at their declared types.

Why that boundary and not "any other file": the first version excluded only the default library (`hasNoDefaultLib`).
It let lean's own `lean-number.d.ts` (`Math.__lean_add`, a global script) through, so the faithful number rewrite
accepted held operands and five real-only rows of `type_assertions` (twice, optChecked, paramHeld, resultHeld,
compoundHeld) proved their doubles reading. That would open the hole the earlier design section names
(`(x as number) + 1` read equal to `1 + (x as number)`, "a1" against "1a"). Requiring a module file and a top-level
declaration closes it; all 43 rows pass.

## Elements added
- `common.mjs outsideCallee(checker, call)`: true when the call's resolved declaration is in another file that is an
  external module, not nested in a ModuleDeclaration. Called from `carried` beside `importRooted`.
- Pair `type_assertions`: file `client.ts` (`makeClient(): Client`, `Client.analytics.exportCsv(o: { v: number })`), an
  import of it in parent and candidate, rows `outsideHeld` (must prove; the candidate builds `{ v }` from a held local)
  and `outsideBumped` (must not prove; candidate `{ v: (x as number) + 0 }`, lane B WITNESS). expect.json: these two rows
  and a sentence in `why`; no other row changed.
- `design/type-assertions.md`: a dated section (the reading, soundness, what stays refused, measured); the earlier
  "stays refused" bullet for this form marked as carried since.

## Numbers
- Pair: `JOBS=4 node langs/ts/tests/run.mjs --pair type_assertions`: before the code change the parent side is refused
  (lint: `type-assertion` at both new arguments; the run: "the translator produced no file", 1 check FAILED); after,
  43 of 43 PASS. The base without the new rows: 39 of 39.
- Related pairs (every pair whose expect.json mentions assertions, held values or `as any`, plus heap5_outside and
  blocker_unresolved_type), each `JOBS=4 node langs/ts/tests/run.mjs --pair <p>`: 39 of 39 exit 0, no FAIL row.
- Census, `NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs /root/da/census/repos/agent-nexus --out
  <file>`, before at 2a6c7bb62 (an archive of the base), after at 6050d73f1:
  - units whose first refusal is `type-assertion`: 184 -> 53
  - units with a `type-assertion` finding: 314 -> 97; findings 370 -> 138
  - units entered: 1,368 of 4,171 -> 1,368 of 4,171 (languageRefused 1,420 -> 1,419)
  - the 217 freed units each carried another rule already (property-assign 162, unresolved-module 81, read-after-call
    6, string-code-unit 1) or now meet the translator's next guard on the same call: `copied-argument` 53 (a new literal
    holding objects handed to a call that may keep it), `types` 1 (type nesting too deep). No other unit gained a rule.
  - `census.mjs --diff`: one gain each in callback-units, calls, members, names, types (mcp-stdio.dispatch.ts handleLine).

## What is left
- The freed units now stop at `copied-argument` (53) and `property-assign` (162); those are the next levers for this
  form, not this lane's.
- The remaining 138 `type-assertion` findings: element reads of held records (`a.permissions[key]`), calls of a held
  value's method result (`child.name()`), `as` to intersections with index signatures, held values into
  library-declared callees.
- The census copy has no installed dependencies, so a factory from a package (not a workspace file) does not resolve
  and is not counted here; with installed dependencies the same rule applies to package modules (`.d.ts` that are
  modules, declarations at top level).

## Defects met
- The `hasNoDefaultLib`-only boundary (above): caught by the pair's real-only rows, fixed before commit.
- The faithful rewrite's `isNum` reading the checker type rather than the held type (already named in the design
  note) remains; this lane keeps it unreachable for held operands by refusing global-script callees.
- The worktree has no git identity configured; commits use the identity the branch history uses, set per command.
