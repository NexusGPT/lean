# W1c: the opacity ladder for calls, members, syntax and callbacks (2026-11-01)

Lane `w1c-opaque-calls`, workstream W1 (`/root/briefs/da-v4/w1-opacity.md`, amendments A1-A8). Every number below has
its command in `lane/w1c-opaque-calls-result.md`. The shared step, key and certificate row are lane w1a's
(`translate/opaque.mjs`, cherry-picked from 9c185509); this lane adds the rows of its rules and the statement form that
reads them.

## What

Twenty-two lint rules refuse a construct lean has no exact reading for: `unsupported-call`, `unsupported-member`,
`unsupported-syntax`, `unsupported-operator`, `unsupported-type`, `dynamic-key`, `optional-chain`, `function-value`,
`callback-form`, `callback-control`, `callback-result`, `exception-callback`, `exception-binding`, `exception-return`,
`conditional-effect`, `operator-value-context`, `union-type`, `instanceof-constructor`, `iterator-protocol`, `delete`,
`freeze`, `assign-target`. Each says "lean has no exact reading of this construct here", not "no reading can be sound".
So a finding of one of them becomes an **opaque step**: the lint keeps the rule and its message (the editor and
`--advice` still show it), the finding carries `opaque: statement`, and it stops nothing.

The column is `lint/opaque-calls.mjs` `OPAQUE_CALLS`, one row per rule: `form` (`statement`, or `none` when the refusal
stands) and `envelope` (`value` or `boundary`, below). `freeze` is `none` (A4, below); `union-type` is graded but no
site raises it today (it has no reading in the catalogue, so the audit names no row for it). The three rules W1 keeps at
`none` by design, `dynamic-eval`, `prototype` and `super` as a value (under `class`/`inheritance`), are not in this
lane's list and are untouched; this lane met `prototype` once (the lint's `Object.*` descriptor functions, beside
`assign-target` in `objectCallRefusal`) and left it refused.

## The decision: one site per finding, never the unit

`callsOpaqueSite(checker, rule, node, fn)` decides, once, for the lint and the translator:

- the **site** is the innermost statement of the unit's own body that holds the finding's node (`siteStatement`: never a
  statement of a function nested in the unit, but the statement holding that function);
- `exception-binding` and `exception-return` are sited at the enclosing `try` with a `finally`: what has no reading is
  the finally reading a shadowed name or changing a returned alias, the try's own behaviour;
- no site, the refusal stands with its reason in `opaqueWhy`: a finding no statement holds (a parameter default, a
  concise arrow body, a field initialiser), one inside a hoisted function or class declaration, and a `delete` that
  leaves its object outside its type (A4). **The unit is never read as one opaque function** (A5).

The lint labels a finding when its walk ends (`lint.mjs`, after the findings are sorted) and records the site key
(`f.opaqueSite`, the statement's start and end). The translator reads the key off the gate's findings (mapped through
the faithful rewrite); a site whose statement the translated text does not hold keeps its refusal. A refusal the
translator raises itself for a graded rule (`fail` now records the node) comes back as a site through the same decision
(`translateSites`: one site per run, bounded by the file's nodes and a cap of 24 runs); a site no step reached at the
end fails the translation with the finding's own rule (`site.rule` in the audit), so a construct the lint refused is
never read exactly by another path.

## The step

The site's statement is one step through the shared form (`translate/opaque.mjs` `opaqueForm`):

    Opaque(id, reads) -> (writes, control, world')

- **id** = `block_<sha1>` of the statement's tokens (w1a's `opaqueText`: comments and layout are no part of it, every
  literal whole) and of `<name> <normalised text>` of every same-file unit it reaches (`calleeTexts`: the units it names,
  a callback handed by name, a sibling `this.m()`, and everything `exec/callees.mjs` `calleesOf` reaches from them; A3),
  plus the existing tags: its jumps, its module cells, its direct callees (the `CALLS` marker the theorem refuses a
  changed callee by). Two syntactically identical lambdas are one text, so one symbol; a change inside a callback is a
  changed statement, hence a changed symbol.
- **reads** = the world, every free name of the statement (names inside nested callbacks too), the receiver when it
  names `this`, and every name it writes (the value after depends on the value before). The pure reads come first (w1a's
  `drop-read` break removes the first read).
- **writes**, over-approximated, never under (A2): every name the statement assigns or declares (`assignedOutside`),
  and `reachWrites`: every reference-typed name in scope at the statement (parameters, locals declared before it, loop
  and catch variables; a function-typed name excluded), and every name in scope a function nested in the unit assigns.
  The origin of an alias the step may write through (`const t = user.tags` then `t[m](k)`) is one of the names in
  scope, so the writes hold every origin the lint can name and every one it cannot. A literal unit's receiver is read and
  written when the statement names `this`; a class instance's fields are world fields, threaded already.
- **control** = a `return` inside makes the step return `Option<R>` (`R` when the statement cannot fall through); a
  `throw` is the world's fault flag (tested after the step in a unit with a fault channel, `opaqueCompletion`);
  `break`/`continue` to a loop outside give an integer jump dispatched after the step.

Two places carry the writes beyond the step: `assignedOutside` of any node holding a site adds the site's reach writes,
so a branch, a loop or a switch around the step carries them out (the A2 pair found this: the step was inside an `if`,
whose join carried only the world), and the read-after-call reading treats a call inside a site as part of a step
that rebinds every reference (`readAfterCall` `h.rebinds`, both deciders), so a read after the statement reads what the
step wrote. A unit holding a site is read by the value translator, never the heap core's reader (it has no step).

**Boundary envelope.** For `unsupported-call`, `unsupported-member`, `unsupported-syntax`, `unsupported-operator`,
`unsupported-type`, `dynamic-key`, `optional-chain` and `union-type` the value the construct makes may lie outside its
declared type (`h["toString"]` is a function where the type says number; a match item is undefined; `**=` overflows).
Every name such a step declares or assigns (`heldDecls`: declared names, roots of assigned, updated or deleted targets)
is a handle read at the opaque `Any` at every read of the unit (`common.mjs` `holdOpaque`, decided before any unit is
read), so no exact law meets it: `v + 1` against `1 + v` is not proved, and must not be (`"function…1"` against
`"1function…"` when the key is `toString`). An object the step may only change through a typed call keeps its type.

## A4: where the refused behaviour happens (per rule)

A rule is opaque only when the refused behaviour happens inside the construct's text.

| rule | decision | why | the pair that decides |
| --- | --- | --- | --- |
| `freeze` | `none` | freezing changes every later write to the object, anywhere (a write after it throws), outside any step at the freeze | `opaque_freeze` (every finding refuses, lane B only) |
| `delete` of a required member | `none` (per site, `deleteLeavesType`) | every later read, in the unit or after it returns, sees undefined where the type says present | `opaque_delete` sites only deletes of index entries |
| `delete` of an optional member or an index entry | `statement` | the object stays a value of its type; the step's write of the root carries the change | `opaque_delete` |
| the boundary rules | `statement`, every name the step makes a handle | the construct's value may leave its type; reading it at `Any` keeps every later read from using a law of the type | `opaque_dynamic-key`, `opaque_unsupported-*`, `opaque_optional-chain` |
| `exception-binding`, `exception-return` | `statement` at the `try` | the finally's behaviour is the try's own text | `opaque_exception-binding`, `opaque_exception-return` |
| the other value rules | `statement` | the refusal is about control or effects inside the statement; what it leaves is values of their types | one pair each |

## Why this is sound

1. lean's one effect axiom is `effect(world, op, args) = (world', result)` (subset.md, "Modelling axioms"). A step is
   that axiom applied to a statement: `op` is its tokens and the text of the same-file code it reaches, `args` its reads,
   `result` its writes, its control outcome and the world after it.
2. The theorem says: for every input and every interpretation of every opaque symbol, the two sides' observations
   agree. The real program is one interpretation (the statement's behaviour is a function of the world, its code and the
   values it reads), so a proof covers it, provided the step's interface holds everything the statement can read and
   change and every value it hands on is read only through what the model may assume of it.
3. Each half is over-approximated: every free name is a read; every assigned name, every reference in scope, every
   closure-written name are writes and are carried out of every compound statement around the step; every control
   outcome has its channel; every value a boundary construct makes is read at `Any`.
4. A change inside the construct changes its text, so its symbol: the sides apply two uninterpreted functions and are
   never proved equal; lane B runs the real code. A change in a same-file callee changes the key (A3) and the `CALLS`
   marker. A change outside the construct that flows into it changes its reads; one that it flows out to reads its
   writes. The `--break` rows remove each mechanism and show the false proof it prevents.

The cost: an over-approximated write turns a later exact read into an uninterpreted one, and a held value admits no law;
both lose proofs (an ASK where an exact reading would prove), never make one.

## Tests

`tests/pairs/opaque_<rule>/` for every rule (`freeze` lane B only, its findings refused), each with units
`outside_` (the construct unchanged, a change elsewhere: proved, the step listed with its span equal to the finding's,
A5), `inside_` (a change inside: not proved), `read_` (a value the step reads changed before it: not proved), `write_`
(a read moved across the step: not proved) and `planted_` (a `mutate.mjs` kind applied inside, recorded in
`planted.json`: not proved, lane B WITNESS where the run can observe it). Three pairs test the amendments:
`opaque_alias-origin` (A2, the brief's `count` pair with the alias written by a computed callee), `opaque_callee-text`
(A3, a callee changed only at `x === 7919`), `opaque_param-output` (the caller's side of A2: a caller reading a
parameter after a call of a site unit reads it through the world).

`tests/opaque-calls.mjs` runs lane A on every pair against `equal` and the `--break` rows (`LEAN_OPAQUE_BREAK`, the
environment name w1a's `opaqueForm` reads, until `tests/break.mjs` lands, A6): `drop-read` on `opaque_delete`
`read_del` and `opaque_dynamic-key` `read_key`, `drop-write` on `opaque_alias-origin` `count`, `drop-callees` on
`opaque_callee-text` `viaCallee`. Each row asserts the unit is not proved with the mechanism and is a false PASS-proved
without it. The pairs also run in the suite (`LEAN_PAIRS=... node tests/run.mjs`) with lane B's verdicts in `b`.

## Measurement

All commands are in `lane/w1c-opaque-calls-result.md`.

- Census on the lane's roots (A8: nexus-agent-api, snitch, pipedream; 1,908 units), base 4747022f against the lane's
  head: units the lane's rules stop 41 → 6; entered 593 → 596. Per rule: unsupported-member 15 → 0, dynamic-key 8 → 3,
  unsupported-call 5 → 2, unsupported-syntax 4 → 1, function-value 4 → 0, five more 1 → 0. The 6 left are callback
  units with a concise body (no statement: the unit is never the step) and a site another reading takes whole. 32 of
  the 35 freed units stop on their next finding of another rule.
- A5: the 7 units whose lowering no longer refuses have an opaque fraction median 0.333 (mean 0.262, max 0.5, none at
  1.0): the threshold 0.25 is not met on this sample of short units.
- The census itself counted an opaque site's finding as a stop; it now stops a unit on what the lowering refuses on.
- Lane driver 109/109 rows; audit 620 rows, 0 uncatalogued; `conformance/run.py ts` 252/252.

Cost seen on the pairs: a number-bearing unit holding a site is not PASS-proved by the official reading (the faithful
placement reads the step's text, and a held `Any` meets a faithful operation's number slot): `real-only` on seven
`outside_` units. A gap, never a false proof.
