# Units lean did not read: module-level code, type-only changes, directives, JavaScript (2026-11-01, lane w1f-module-units)

Defect. On the 44 AACR pull requests, 275 of 470 human notes sit on code lean gave no reading (PLAN.md, the baseline):
module-level 55, untyped JavaScript 40, directive comments 23, type-only 15 among them. The ledger already had a module
unit (design/module-unit.md), but three routes still ended in an undecided intake row no lane read:
`unassigned: type-only` (an interface, a type alias, a type-only import or export), `unassigned: directive comment`
(`@ts-ignore`, a `/// <reference>`, a JavaScript file's JSDoc), and `unassigned: untyped JavaScript file` (any
top-level edit of a JavaScript file without JSDoc tags). A function whose only change was a type (`s: Shape` to
`s: Readonly<Shape>`) went through both lanes and could end ASK on a difference the program never runs (the scratch run
below: `clamp` ASK, "prelude block Obj differs"). A directive a change added or removed had no record at all: inside a
function it was one more comment, outside every function an ASK or an inert row.

## The four readings

### 1. The module unit: its inputs, its outputs, and why a load-time effect is a world transition

The module unit `(module)` is a file's top-level statements in init order (design/module-unit.md). As a unit:

- **inputs**: its import environment, the bindings every `import` and `require` of the file resolves to (the same
  files and fakes on both sides; the world answers its requests as it answers any unit's);
- **outputs**: its export table (every key and its value, functions by their handle), the module's own bindings, and
  its load-time effects: the requests it makes in init order, the work it arms, and the value it throws, if any.

A load-time effect is a world transition like any other. lean's one effect axiom is
`effect(world, op, args) = (world', result)` (subset.md, "Modelling axioms"); a module's evaluation is a call of the
unit with no parameters, run once per resolved file (ECMA-262 HostLoadImportedModule): `register('alpha', opts)` at top
level is `effect(world, register, ['alpha', opts])`, the same transition a function body would make, only made by the
module's one call instead of a later one. So the module unit is compared like any unit: the sequence of transitions and
the outputs, side by side, on the drawn worlds. WITNESS when the export table or a transition differs, PASS-bounded when
none does within the bound; PASS-typed (reading 2) when the two sides emit the same JavaScript.

What this lane adds: a JavaScript file's top-level code is its module unit too. The ledger's route "an edit outside every
listed unit of a JavaScript file without JSDoc tags is unassigned" (`ci/ledger.mjs`, before) is removed: the module
unit's own route (every compiled token is code the evaluation runs) now decides for JavaScript as for TypeScript, and a
JSDoc edit outside every function is the types unit's.

### 2. The typed reading: PASS-typed (`typed.mjs`)

Claim: two programs that emit the same JavaScript run the same code. TypeScript's emit erases types, and the program a
user runs is that emit (or a transpiler's that erases the same types). So for a change whose emit is byte-equal on both
sides, whatever changed (an annotation, an interface, an assertion, a type-only import, a directive comment, a JSDoc
type) changed only what the checker reads.

The reading, per changed file F read on both sides:

1. One program per side over the same root files (the project's tsconfig file list, or the changed files alone when
   there is none), with the project's own options and emit on: JavaScript only, no declaration files, no source maps (a
   map holds positions, not behaviour), no comments (a comment is not behaviour: the ledger's inert rule, design
   admission-contract.md 2026-10-30), into a folder nothing is read from. The sides differ only in the changed files'
   texts, served at their real paths, so every import resolves as it does in the checkout.
2. The files F's change can reach. A file's emit reads other files' types in three ways: a const enum's value is
   inlined, `emitDecoratorMetadata` writes the runtime constructor a type names (`design:type` String or Number), and an
   import is kept or elided by what the imported name is. Each goes through an import, so the reach is F and every file
   that imports F, directly or through others (the reverse closure over both programs' imports). When a side of F
   declares globals (a script, `declare global`, an ambient `declare module 'x'`), its reach is every file of the program.
3. Every file in the reach emits byte-equal on both sides: each of F's changed units (functions, the module unit, the
   types unit) is PASS-typed, before any lane runs. Otherwise the types unit is ASK naming the files that differ, and
   every other unit keeps its reading as before (lanes A and B; a changed signature still ASK:interface without an
   adapter).

The certificate (`certificate.typed`) holds both emit hashes, the number of files read, the project, the options that
shape emit (module, target, emitDecoratorMetadata, isolatedModules, verbatimModuleSyntax), and the type errors of F on
each side: a PASS-typed change that adds a type error says so in its reason.

Soundness, the argument. Two runs of the emitted JavaScript differ only if the JavaScript differs or the world does; the
world is the same input on both sides (the comparison every lane makes), and the JavaScript of every file F's change
reaches is byte-equal. A file outside the reach emits the same bytes because its emit reads nothing of F: no import path
leads to F, and F declares no global. Assumptions, stated in the reason and here: the program runs what tsc emits with
the project's options (a transpiler that erases the same types: Babel, esbuild and swc keep a value import tsc would
elide only when `isolatedModules` is off and the name is used as a type alone, which tsc reports under isolatedModules);
a function's source text (`Function.prototype.toString`) and a stack trace mapped through a source map are not
observations (as for every comment edit).

Inside a file whose emit differs, each changed function is read alone: the head is emitted once more with that one
unit's text put back to its parent text (every other byte the head's), over the same reach. When that emit is
byte-equal to the head's in every file of the reach, the unit's own change is erased by the compiler: the head and the
head with this unit unchanged run the same code, so the unit is PASS-typed and the file's other differences stay with
the units that make them (`type_only/mixed.ts`: `label` PASS-typed, `twice` lane B's WITNESS). Otherwise the unit keeps
the lanes' reading. A nested unit is its enclosing unit's, and a unit one side lacks has no parent text: neither is read
alone.
Past `TYPED_FILE_CAP` files in the reach, or a project that emits one bundle (`outFile`), the reading makes no decision.

What it is not: no source text is compared (a type-only change is decided by what the compiler writes, never by a
pattern over what changed), and no list of "safe" type constructs exists.

### 3. Directive comments: rule records (`lint/directives.mjs`)

`@ts-ignore` and `@ts-expect-error` (the next line), `@ts-nocheck` (the file), `eslint-disable` (to the matching
`eslint-enable`, or the file's end), `eslint-disable-line`, `eslint-disable-next-line`, `eslint-enable` and
`biome-ignore`. None changes what runs, so a change to one is not a unit's verdict: the reading is a record per
directive the change added or removed: the directive, its rules, its scope, the unit its scope falls in, and

- for an added type directive, the errors the checker reports in its scope once the directive is made inert (the head
  file's text with `@ts-` turned into `@ts_` at the same length, read with the project's own options): what it hides;
  none for an `@ts-expect-error` is the checker's own TS2578 in the head;
- for a removed type directive, the errors the head reports on the line it governed: what it no longer hides.

Two sides' directives are matched by what they are and what they govern (kind, rules, the text of the line governed),
never by their line numbers: a directive an edit moved is neither added nor removed. Comments are read from the tree
(each token's leading and trailing trivia), so a `//` inside a string or a template is text.

In `pr.mjs`: `rows.directives` (the report JSON's `directives`), a "Directive comments" table in the report, and one
`kind: 'rule'` record per directive in the refusals file (`check: directive:<kind>`). The edit itself routes as before:
inside a function to the function (now PASS-typed when the file's emit is equal), outside every function to the types
unit; an ESLint comment is an inert comment to the ledger and still gets its record.

### 4. JavaScript units

A `.js`, `.jsx`, `.mjs` or `.cjs` file is read through the checker's JavaScript mode (allowJs and checkJs are on in
every program lean makes; `typed.mjs` turns allowJs on for the emit). Its functions were already listed and run by
lane B (design/exported-units.md); an untyped one stays refused by the lint by name (`untyped-js`) with lane B's verdict
in its row (the lint as it stands). This lane adds the module unit route above and the types unit for JSDoc, so no
edit of a JavaScript file is left unassigned for its language.

## Decision sites (design/admission-contract.md)

The rows the lane adds, dated beside the audit table of that note: the ledger's types-unit route and its module-unit
route for JavaScript (`ci/ledger.mjs routeChanges`), the typed verdict (`pr.mjs prWorker`, `typed.mjs typedReading`),
and the directive record (`lint/directives.mjs directiveRecords`). None refuses a construct; the lint's and the
translator's sites are unchanged.

## Tests, red first

The four pairs, each read as a pull request by `tests/pr-pair.mjs` (expect.json's `pr`: rows, absent rows, directive
records, no undecided unassigned row), run by the suite's pairs section and by `tests/w1f-module-units.mjs`, which also
runs every `--break` through the suite's one convention (`LEAN_BREAK=<mechanism>`, amendment A6): `w1f-module` (the
module unit's route), `w1f-js` (the untyped-JavaScript route restored), `w1f-types` (the types unit's route), `w1f-emit`
(no emit compared), `w1f-closure` (the reach cut to the changed file), `w1f-directive` (matched by line number). Each
must turn its pair red. Each break fixture is a change whose effect reaches outside what changed (amendment A1): the
closure break's is `type_only/level.ts`, a const enum member `High = 2` to `High = 3` whose own file emits nothing on
either side while the unchanged `alarm.ts` inlines `2` and then `3` (amendment A9); with the closure cut, the types unit
of `level.ts` is a false PASS-typed, which the pair refuses.

## Measured (2026-11-01)

Where the edits of a repository's own history go, base lean (4747022f) against this lane's head, on the census roots
of amendment A8 (`lane/w1f-module-units-scripts/ledger-routes.mjs --limit 300`, read-only on the repository; the counts
in `lane/w1f-module-units-evidence/routes-*.json`):

| nexus-learning, 159 first-parent commits, 104,467 source edits | before | after |
| --- | ---: | ---: |
| edits to a unit | 67,983 | 74,861 |
| unassigned: type-only | 6,871 | 0 |
| unassigned: directive comment | 3 | 0 |
| unassigned: untyped JavaScript file | 4 | 0 |
| unassigned, still undecided (object-literal member 3,271, class field 114) | 3,385 | 3,385 |
| unassigned, inert (comment 20,351, whitespace 5,870) | 26,221 | 26,221 |
| types units read (the PASS-typed reading) | 0 | 816 |
| module units read | 1,305 | 1,306 |

The 6,878 edits the three removed routes left undecided are all now a unit's (6,871 + 3 + 4); no other route moved.
nexus-desktop's last 300 commits hold no TypeScript or JavaScript source edit (a Zig repository; the census walks 0
files), and claude-skills has one commit with no parent.

The census (`node census.mjs <root> --js --install-under /root/census-installs`), head beside base:

| root | function units (entered) | JavaScript units (entered, untyped) | module units (unresolved import, in JavaScript) | types units |
| --- | ---: | ---: | ---: | ---: |
| nexus-learning | 4,112 (1,799) | 352 (64, 126) | 727 (382, 37) | 518 |
| claude-skills | 355 (125) | 0 | 133 (107, 2) | 47 |
| nexus-desktop | 0 | 0 | 0 | 0 |

Function units, entered units and every reading's admitted and refused counts are the same before and after on both
roots with code (`census.mjs --diff`: 0 readings with a gain or a loss): this lane adds units beside the function units
and refuses nothing. Amendment A5's opaque fraction does not apply: this lane adds no opaque step (no rule of W1a to W1e
is touched); the units it lets in are read whole, by the emit (PASS-typed) or by lane B (the module unit).

## Still out

- A const enum whose value changes emits nothing in its own file; the importer it is inlined into differs, so the
  types unit is ASK naming it (never PASS-typed), but no lane runs the importer's units, whose text is unchanged: a
  WITNESS there would need the importers' units read as changed units. The edit of the enum is its file's module
  unit's (an enum declaration is evaluated code, `type_only/level.ts`), and lane B evaluates the file as a per-file transpiler emits it
  (the enum an object, as under isolatedModules) and gives a WITNESS on the export `Level`: a true WITNESS for that
  emit, while under the project's whole-program emit the difference lives in the importer. The verdict is right under
  both emits; the witness names the per-file one.
- w1a's `tests/break.mjs` had not landed when this lane ended: the six mechanisms read `LEAN_BREAK` directly, and move
  to its helper when it lands (no local copy, amendment A7).
- ESLint is not run: a lint directive's record names its rules, not the reports it hides.
