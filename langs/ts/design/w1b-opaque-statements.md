# The opacity ladder for the statement and expression family (lane w1b, 2026-11-01)

The rules: `destructuring`, `param-form`, `uninitialised`, `record-rest`, `bare-return`, `update-expression`,
`assignment-expression`, `spread`, `for-in`, `for-of-non-array`, `collection-iterator`, `reference-key`, `template`,
`label`, `math-empty`, `division`, `string-order`, `mixed-types`, `loose-equality`, `unary-coercion`, `bitwise`,
`number-special`, `string-code-unit`. Before this lane a finding of any of them stopped its unit. Now each is graded
`opaque: statement`. The column is `lint/lint.mjs` `OPAQUE_ROWS`, one table for every W1 lane (w1a's schema commit,
re-exported as `translate/opaque.mjs` `OPAQUE`); this family's rows are its second block. Beside it, `OPAQUE_ENVELOPE`
gives each of these rules its envelope (below). The lint keeps every rule and its message, and the finding carries
`opaque: "statement"`. The lowering defers the finding to the translator, as for every graded rule.

Stay `none`, by design:

- `break-continue`: a `break` or `continue` with no loop or switch around it in its function (TS1104, TS1105). An
  opaque step's control result names the loop it leaves; here there is none to name.
- `loop-form`: a loop with no measure. Its opaque reading would hide the measure the proof needs, so it stays ASK
  (the brief's own exception). A `while` with no bound is already an opaque block of its own (subset.md "What is an
  opaque block"); `loop-form` names what that block cannot carry.

No rule to grade: `comma` and `switch-fallthrough`. No lint rule and no translator refusal names either: the comma
and the fall-through are read exactly (subset.md "Operators as values", "Control"), so a row would grade nothing.

## The one argument, shared with w1a

This lane keeps w1a's argument (design/w1a-opaque-mutation.md, "The soundness argument") and adds no second one. An
opaque step is the effect axiom applied to a piece of the program: `effect(world, step_id, reads) = (world', result,
writes)`. Two runs prove equal modulo the step when they reach it with equal ids and equal reads, because the same code
from equal states runs the same. The whole question is when "equal reads" means "equal states", and what the id must
hold for "the same code" to be true.

w1a answers for the mutation family: never per statement, because what a mutation does depends on which names share an
object, and a value says nothing about that. So w1a's step is the unit's block from its first statement that may touch a
reference (`heapOperation`, `blockStart`).

The statement family is different in kind. Most of its constructs do not change an object or compare one by identity:
`for (k in o) n += 1`, `const { q, ...rest } = d`, `k == b` on numbers, `(b & 3n) + c`, `[...s, "?"]`, a label on a
block. Their behaviour is a function of the values they read. So for them the step can be the innermost statement, the
finding's span widened only to the statement that holds it. The step is admitted on one of two conditions:

1. **The step depends on values alone** (`stepHazard` is null). It writes no field or element, deletes nothing, calls
   no method on an object other than the value-making array and string reads (`join`, `slice`, `includes`, ...),
   hands no object to a call, builds no closure and no identity-keyed collection, converts no object implicitly
   (`toString`/`valueOf` are code), and compares no object by identity (`===`, `!==`, `==`, `!=` with an object
   operand). Then equal values of its reads give equal behaviour. Sharing among them is invisible to it.
2. **Or no statement run before it may share an object** (`sharedBefore` is null). This is w1a's own test
   (`heapOperation`) applied to every statement run before the step: the earlier statements of each list that holds
   it, the headers of the statements around it, and every other statement of a loop around it (an earlier pass runs
   them first). Then at the step's start every object is as the caller handed it: the parameters are two by two
   distinct trees (the value reading's axiom) and no local holds a reference. Equal reads are equal states, sharing
   included, which is w1a's point 1.

Otherwise the site is read in its unit's block: w1a's form, the body from the first statement that holds a site or may
touch a reference, to its end (`siteFail` with `toBlock`; `translateGraded` reads the file again with the site a block
site). That block's start is before every sharing, so w1a's argument covers it. In a unit with no block form (a
generator, an accessor) the site keeps its rule's refusal. A unit that already holds a block (a mutation-family finding)
reads its statement sites in that block too. The pair that decides this is `opaque_statement_sharing` `identity`:
`const t = x; const same = x === t;` (`mixed-types`), where the candidate makes `t` a copy of `x` when it is a record.
The step reads equal values on both sides, but JavaScript answers true for the parent and false for the candidate.
Without the test (`LEAN_BREAK=opaque-drop-sharing`) the statement step reads equal values and the unit is proved equal,
falsely. With it, `const t = x` binds a reference before an identity comparison, so the site is read in the block from
`const t = ...`, whose texts differ: not proved. Lane B finds the difference: WITNESS.

The rest of the argument is w1a's points 2 to 4, with the statement as the block:

- **The id holds the code.** The id is sha1 over the statement's tokens (`opaqueText`: a comment or a line break is no
  change, every literal is one), plus three more parts. Each is a test of point 2:
  - the text of every same-file declaration the statement names outside its unit (`namedDefinitions`: a module
    constant, a class it builds);
  - the printed text of every same-file unit it reaches (`reachedUnitTexts`, through `exec/callees.mjs` `calleesOf`,
    transitively; A3);
  - the module bindings it reads and the jumps it can take.

  The theorem's `// CALLS` guard also refuses a step whose translated callee differs by name. The callee texts in the
  key hold the same for a callee that is never translated: one read whole, or one handed on as a value.
- **The reads are over-approximated.** They are every local the statement mentions, every local it assigns (it may
  read it first), and `this`.
- **The writes are over-approximated.** They are every name it assigns: `=`, compound assignments, `++` and `--`,
  every name of a pattern (`boundNames`), every root of a pattern target or a loop target (`patternTargets`), and
  every name it declares. A2's "writes closed under the alias origin" holds in two ways. A write through an alias is a
  change of an object, so condition 1 fails, and condition 2 means no alias exists yet. And the lint's mutation family
  (w1a's, `aliasHere`) still names every write through an alias, and such a finding is w1a's block (pair
  `opaque_statement_sharing` `alias_origin` and `alias_step`: A2's own pair, and that pair with the push inside a
  for-in step; both never PASS-proved).
- **The control is the step's.** A `return` inside is the step's result channel (`Option<R>`, or `R` when it cannot
  fall through). A `break` or `continue` that leaves it is the step's jump code. A `throw` is the world's fault
  channel. This is the existing opaque block's machinery (`opaqueStep`, `opaqueBlock`, `opaqueCompletion`).

## The value envelope

Some of these constructs can make a value outside the model: an astral string (`string-code-unit`), NaN or an infinity
(`number-special`, `math-empty`, `unary-coercion`), a fraction in an integer file (`division`), a key compared by
reference (`reference-key`), an iterator used up by its first read (`collection-iterator`). These are the `boundary`
envelope (`lint.mjs` `OPAQUE_ENVELOPE`, data beside the column, so that no module reads it before it exists).

An opaque step's outputs are typed by the model. Such a value cannot be one of them without a model value standing for
something the model cannot hold, and an exact reading after the step would then compute with a wrong value. So a
boundary step may write only the world and jump, never a local or the result. Where it would, the unit joins the
translator's value boundary (`numericOpaque`, design/special-numbers.md). The unit is one opaque function keyed by its
source, and so is every same-file unit that reaches it, so no exact reading sees the value. The pairs show both cases:
`sink(Math.max(...xs, u))` is a step, and `const m = Math.max(...xs); return m + k` (`escapes`) is a unit read whole.

## Where the site comes from

There are two sources, one mechanism:

- **A lint finding** of a graded rule, tagged by the lowering. The translator (`--core`) takes it out of its gate and
  makes it a site: its span, mapped through the faithful-numbers rewrite.
- **A translator refusal** naming a graded rule (`fail(n, '<rule>: ...')`). The error carries the node it stopped at
  (`e.at`). `translateGraded` (w1a's loop, one for both lanes) runs the translation again with that node a site, until
  the translation ends or stops at a node already a site or for another rule. A site's own refusal says how it is
  taken: `final` refuses, `boundaryUnit` adds a unit to the value boundary, `toBlock` moves a site into its unit's
  block. Each round adds one site or one unit, so the rounds are bounded by the file's nodes; the bound (64) only caps
  the cost.

A site's statement is the innermost statement of its unit's own body that holds it (`siteStatement`). A site that no
statement holds (a parameter, a concise arrow body) makes its unit one opaque function. Coverage: after a unit is
emitted, every site of it must lie inside a step its emission wrote. A statement the emission reached by another path
(a callback read inline, a spliced local procedure) keeps the site's refusal.

## The certificate (A5)

There is one certificate field for both lanes, w1a's. The translator writes one `// OPAQUE <unit>: {...}` line per unit
(translate/opaque.mjs `opaqueLine`), and check.mjs lifts it into `lanes.A.opaque`. The line holds:

- `steps`: each step's `opaqueEntry`:
  - `rule`, `line`, `id`, `reads`, `writes`;
  - `construct`: `statement`, `unit` (a unit read whole) or w1a's `block`;
  - `span`: the step's `[line, col, endLine, endCol]`;
  - `findings`: the spans of the findings the step grades;
  - `statements`: the statements the step covers.
- The unit's totals: `statements`, `covered`, and `fraction` (covered over statements; a unit read whole is 1).

The lowering record carries the same entry per unit (`opaqueSteps`), so a census reads the fraction and the spans of
every unit it lets in.

A5 asks the step's span to equal the finding's. For a statement-form rule (`for-in`, `label`, a pattern declaration)
it does, since the finding is the statement. For an expression rule (`loose-equality`, `mixed-types`, `bitwise`,
`template`) the step is the innermost statement, which is wider. The record states both spans so the gap is measured,
not hidden (see the measurement). An expression-level step, an opaque value in place of the expression, is the next
narrowing; it is open.

## The decision sites

There are three new refusal sites, all through one decider, `siteFail(n, rule, msg, extra)`: the boundary step that
would write a value (`boundaryUnit`), the step whose reads are not its state (`toBlock`, or `final` where no block
applies), and coverage (`final`). The audit reads a `siteFail` call as a
`translate-refuse` site whose rules are this family's graded rules (`'site.rule'`) or the boundary ones
(`'boundary.rule'`, `lower.mjs` DYNAMIC_RULES). Its reading is the one the lowering looks up at run time,
`readingOfRefusal('<rule>: <message>')`. `dynamicRules` now matches an exact key before a substring. The generic
`rule` key would otherwise have named `boundary.rule`'s rules `update-expression` and `assignment-expression`; every
existing entry resolves as before.

## The tests and their --break

The mechanisms are switched off through A6's one convention, `LEAN_BREAK=<mechanism>` (tests/break.mjs, w1a's schema
commit). The statement steps are built by w1a's own `opaqueForm` (their read-only values first), so `opaque-drop-read`
and `opaque-drop-write` remove the same mechanism in both lanes. `opaque-drop-callees` also covers a statement step's
callee texts and its `CALLS` line, and `opaque-drop-sharing` is this lane's registration. Each pair names its flips in
`expect.json` `break` and the suite checks them (tests/run.mjs). `tests/opaque-statements.mjs --break <mechanism>`
runs the family's pairs with the mechanism removed and must go red. Each break turns a change outside the step into a
false PASS-proved (A1):

| mechanism | removes | guarded unit (its change outside the step) |
| --- | --- | --- |
| `opaque-drop-read` | the first read of the step (a value it only reads) | `upstream` of every rule's pair (a value only the step reads, changed before it) |
| `opaque-drop-write` | the first name the step writes | `opaque_statement_mechanisms` `stale` (the candidate returns the value from before the step) |
| `opaque-drop-callees` | the reached callees' texts and the CALLS line | `opaque_statement_mechanisms` `callee` (the step calls `weight`, changed only at `x === 7919`) |
| `opaque-drop-sharing` | the sharing test | `opaque_statement_sharing` `identity` (a copy for an alias before `x === t`) |

Each rule's pair `opaque_<rule>` (written by `tests/opaque-statements-pairs.mjs`) holds these units:

- `outside`: the construct unchanged and the return bound to a local. PASS-proved, with the step listed.
- `inside`: an edit inside the construct. Another symbol, so not proved; lane B gives WITNESS.
- `planted`: `exec/mutate.mjs`'s first planted change inside the construct. WITNESS.
- `upstream`: described in the table above.
- For a boundary rule, also `escapes`.

A rule the translator already reads whole-unit (`number-special`, `unary-coercion`, `division`) has `unchanged`,
`escapes` and `caller` instead.

## The measurement

See `lane/w1b-opaque-statements-result.md`.
