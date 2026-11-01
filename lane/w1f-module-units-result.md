# Lane w1f-module-units: result (2026-11-01)

Branch `lane/w1f-module-units`, cut from `lead-vm` 4747022f. Design note: `langs/ts/design/w1f-module-units.md`.

## What landed

- **The module unit** (`(module)`, ci/ledger.mjs route, lane B's module evaluation): an edit outside every function
  whose compiled tokens the module's evaluation runs is the module unit's, in TypeScript and now in JavaScript (the
  "untyped JavaScript file" unassigned route is gone). WITNESS when the export table, a binding or a load-time request
  differs; PASS-bounded otherwise; PASS-typed when the emit is equal.
- **PASS-typed** (`typed.mjs`): every file a change's types can reach (the file and the reverse closure of its
  importers over both programs, every file when a side declares globals) emits byte-equal JavaScript with the
  project's options → PASS-typed; else the types unit is ASK naming the files that differ and every other unit keeps
  its lanes' reading. A changed function of a file whose emit differs is read alone (the head emitted with that unit's
  parent text). Amendment A9: the const enum and `emitDecoratorMetadata` cases are compared through the importers.
- **Directive records** (`lint/directives.mjs`): `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`, `eslint-disable*`,
  `eslint-enable`, `biome-ignore` added or removed → a `kind: 'rule'` record (`check: directive:<kind>`) with what it
  hides or no longer hides; in `pr.mjs` as `rows.directives`, a report table and the refusals file. Matched across
  sides by what they govern, not by line.
- **JavaScript units**: `.js/.jsx/.mjs/.cjs` through allowJs/checkJs; functions are `pr.mjs` rows (untyped ones refused
  by the lint as `untyped-js` with lane B's verdict in the row), top-level code is the module unit's, a JSDoc edit
  outside every function is the types unit's.
- **Census columns** (`census.mjs`): module units, types units, JavaScript units and untyped JavaScript units beside
  the function units.
- **The break convention** (amendment A6): `LEAN_BREAK=<mechanism>`; this lane's mechanisms are `w1f-module`,
  `w1f-js`, `w1f-types`, `w1f-emit`, `w1f-closure`, `w1f-directive`. w1a's `tests/break.mjs` had not landed; no local
  copy was written (A7). When it lands the six reads move to its helper.

## Tests (red first, each with its --break)

`node langs/ts/tests/w1f-module-units.mjs` (the four pairs read as pull requests, then each break):

    w1f-module-units: module_unit 7/7; type_only 9/9; directive 10/10; js_unit 6/6; --break w1f-module 5 red;
    --break w1f-js 2 red; --break w1f-types 3 red; --break w1f-emit 5 red; --break w1f-closure 2 red;
    --break w1f-directive 1 red

32 of 32 checks green; every break turns its pair red. Red first: the A9 pair (`type_only/level.ts`, `High = 2` to
`High = 3`, the unchanged `alarm.ts` inlines it) was added red. `node langs/ts/tests/w1f-module-units.mjs --break
w1f-closure` names the two false PASS-typed rows it causes, the decorator-metadata case and the const enum case:

    red: type_only: pr shapes.ts (types) ASK: PASS-typed | ... 1 file(s) read
    red: type_only: pr level.ts (module) WITNESS: PASS-typed | ... 1 file(s) read

`node langs/ts/ci/ledger.test.mjs`: all assertions pass. `node langs/ts/tests/fixtures/pr-intake/test.mjs`: PASS (its
dependency guard now reads the importing file's four function rows; the edited import's type-only edit is its own
types-unit row).

SUITE

`LEAN_PAIRS=module_unit,module_unit_same,type_only,directive,js_unit node langs/ts/conformance/run.mjs --jobs 2`:
`0 units in 0 pairs (5 skipped) ... NO NEW FINDING`, exit 0. Before the fix in `conformance/pair.mjs` it was 1 HARNESS:
a pull-request-only pair (`prOnly`) has no unit `scope`; it is now skipped as the suite skips it.

## Measurement

The census (`node langs/ts/census.mjs /root/da/census/repos/<root> --js --install-under /root/census-installs --out
<json> --report <md>`, head; the same command from a `git archive` of 4747022f for the base):

| root | function units (entered, share) | JavaScript units (entered, untyped) | module units (unresolved import, in JavaScript) | types units |
| --- | ---: | ---: | ---: | ---: |
| nexus-learning | 4,112 (1,799, 43.8%) | 352 (64, 126) | 727 (382, 37) | 518 |
| claude-skills | 355 (125, 35.2%) | 0 (2 files) | 133 (107, 2) | 47 |
| nexus-desktop | 0 (0 files walked: a Zig repository) | 0 | 0 | 0 |

Base on the same roots: nexus-learning 4,112 units, 1,799 entered (43.8%); claude-skills 355, 125 (35.2%).
`node langs/ts/census.mjs --diff <before> <after>`: 0 readings with a gain or a loss on either root. No regression;
the lane adds units beside the function units and refuses none.

Routing over each repository's own history (`node lane/w1f-module-units-scripts/ledger-routes.mjs --lean <langs/ts>
--repo /root/da/census/repos/<root> --out <json> --limit 300`, base and head):

| nexus-learning: 159 commits, 104,467 source edits | before | after |
| --- | ---: | ---: |
| edits to a unit | 67,983 | 74,861 |
| unassigned: type-only / directive comment / untyped JavaScript file | 6,871 / 3 / 4 | 0 / 0 / 0 |
| unassigned, undecided, outside this lane (object-literal member, class field) | 3,271 + 114 | 3,271 + 114 |
| unassigned, inert (comment, whitespace) | 20,351 + 5,870 | 20,351 + 5,870 |
| types units / module units | 0 / 1,305 | 816 / 1,306 |

6,878 edits moved from undecided to a unit (6,871 + 3 + 4); nothing else moved. nexus-desktop: 300 commits, 0
source edits. claude-skills: one commit, no parent. Evidence: `lane/w1f-module-units-evidence/`.

A5 (opaque fraction): not applicable; this lane adds no opaque step and touches no W1a to W1e rule.

## Commits

COMMITS

## Open

- w1a's `tests/break.mjs` had not landed: the six mechanisms read `LEAN_BREAK` directly; move them to its helper
  when it lands.
- A const enum change: the importer that inlines it differs, the module unit's row is WITNESS (lane B's per-file
  reading of the enum) and the typed record names `alarm.ts`; the importer's own units get no row (their text is
  unchanged).
- The undecided routes left on nexus-learning (object-literal member 3,271, class field 114) are not this lane's.
- ESLint is not run: a lint directive's record names its rules, not the reports it hides.
- Load: two runs (the lane test, its closure break) and the intake test started at a one-minute load of 41 to 44,
  above the line of 40; every later run waited for it. The first suite run took 31 jobs (the default); the run above
  is `JOBS=4`.
