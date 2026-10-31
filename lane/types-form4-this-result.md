# types-form4-this: result (2026-10-31)

Branch `lane/types-form4-this`, from lean `lead-b5c07450` (b5c074508). Commits, in order:
- b76bd9cd6: pair `types_this`, red (written before the reading).
- 3e99d51b8: the reading (translate.mjs, lint.mjs) and the pair reshaped (below, "The pair").
- the last commit: the design note (types-inventory.md) and this file.

## What was read, and why

The specification is `langs/ts/design/types-inventory.md`, section 4: the polymorphic `this` of a class read as its
constraint, the instance type. It is one mechanism with two sites, the same reading in each:

1. `translate/translate.mjs`, `dtypeOf`: a type parameter with `isThisType` is read as
   `checker.getBaseConstraintOfType(t)` through `dtype` (so the descent guard of A7a still holds). A `this` with no
   constraint, or whose constraint is itself a type parameter, is read opaque (`Any`), never guessed. The branch sits
   before the type-parameter branch, so a `this` never reaches the form-2 rule (A7b) and never becomes a Dafny type
   parameter. Before this, it fell into that branch and was refused as `type parameter C is not one of this function's`.
2. `lint/lint.mjs`, the method-call branch: the receiver's type is read through `asInstance` (a `this`-typed receiver
   is its constraint). Without it, the second link of a chain (`this.where(a).where(b)`, whose receiver is typed `this`)
   was `unsupported-call: method .where() on this is outside the subset`: a type parameter is not a record. A field read
   on a `this`-typed value already went through the constraint (the lint's type-parameter member rule), so that is the
   only lint site.

Elements added and why:
- `asInstance` (lint.mjs, beside `tOf`): the one helper that says "a `this` type is its instance type" in the lint.
- The `isThisType` branch in `dtypeOf` (translate.mjs): the same in the translator.
- Pair `tests/pairs/types_this` (parent.ts, candidate.ts, expect.json).
- The design subsection "Form 4, read (2026-10-31)" under section 4, the forms table's row 4, and the "Order for the
  readings" item 3 (types-inventory.md).

Soundness (written in the note): every value of type `this` is a `C`; the readings of `C` already account for an
instance carrying more than `C` names (the opaque `Ext_C` of a class with methods, a record's open rest), and a call on
such a value is the request named by the classes the receiver's type admits, which for `this` read as `C` is the same
set as for `C`. Checked by hand on a generic class (`Box<T>` returning `this` reads `Ext_Box`, as `Box<T>` does), a
data class with a `this` field (`next: this | null` reads `Option<Node2>` on a record with its open rest) and an
interface (`step(): this` reads `Ext_Chain`).

## The pair

`JOBS=2 node langs/ts/tests/run.mjs --pair types_this`: on base (the red commit) the translator wrote no file
(`theorem generated` FAIL: types refusals on `where`, `take`, `longer`, `sameLimit`; the lint's `unsupported-call` on the
subclass's chain). At head: **23 checks, ALL PASS**. Rows: `Query.where`, `take`, `skip` (fluent, `: this`), `text`,
`longer`, `sameLimit` (`other: this`), `Named.both`, `Named.capped` (a subclass calling the chain), `Path.add`,
`Route.joined`, `built` (a function calling the chain on a subclass value). Proved: where, take, skip, text, longer,
add, joined, built. Witnessed by lane B and not proved: sameLimit, both. Not proved by lane A, passed by lane B: capped.

The red commit's rows were reshaped after the reading landed, for two causes that are not this construct. Each was
checked with the same code with `Query` written for `this` (no form-4 type anywhere), which gives the same verdict:
- *A call on this file's classes after an edit to one of them.* The request is named by the code of every class the
  receiver's type admits (translate.mjs `heldKey`, `inheritedKeyText`; design/conformance-readings.md), so an edit
  inside `Query` or `Named` gives each side its own uninterpreted request. The red rows `named_capped` and `built` (the
  candidate bound the chain's first link to a local) were not proved for that reason. `named_capped` stays, now
  expected not proved with lane B PASS-bounded. `built` moved to an unchanged second family (`Path`, `Route`), where it
  is proved, and `Route.joined` was added as the proved subclass row.
- *Two receivers read in another order.* The red `longer` commuted `this.parts.length > other.parts.length` into
  `other.parts.length < this.parts.length`. Lane B witnesses it (the trace reads `arg0.parts` before `this.parts`), and
  lane A does not prove it: two world reads in another order. Now it reads in the same order (`const mine = ...`).
- `query_sameLimit` was renamed to `query_same_limit`, the unit's Dafny name.

## Regression pairs

Each `JOBS=2 node langs/ts/tests/run.mjs --pair <p>`, run from the lane's tree at 3e99d51b8 plus the design note
(no code changed after 3e99d51b8), one at a time, after the censuses:

| Pair | Checks | Result |
| --- | ---: | --- |
| types_this | 23 | ALL PASS |
| this_param | 23 | ALL PASS |
| this_receiver | 13 | ALL PASS |
| types_depth | 17 | ALL PASS |
| types_enclosing_params | 24 | ALL PASS |
| type_tests | 59 | ALL PASS |
| type_assertions | 45 | ALL PASS |
| branch_types | 14 | ALL PASS |
| blocker_unresolved_type | 9 | ALL PASS |
| empty_collection_type | 9 | ALL PASS |
| class_new | 17 | ALL PASS |
| class_statics | 12 | ALL PASS |
| class_super | 8 | ALL PASS |
| inherited_method | 27 | ALL PASS |
| heap_canonical | 13 | ALL PASS |
| copied_argument | 10 | ALL PASS |

The pairs whose name shares a word with the construct (this, type or types, class), the three the brief names, and
`inherited_method` (the subclass chain goes through the inherited-method reading). The final `types_this` against the
base tree (the pair copied into the base archive, then removed): exit 1, `theorem generated` FAIL, the translator writes
no file. So it fails before the reading and passes after it. No other pair's expect.json was touched.

## Census

Base b5c074508 and head 3e99d51b8, each a `git archive` in its own folder (`/root/lanes/types-form4-this/base`,
`/head`). Every census: `NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs /root/da/census/repos/<root>
[--include <dir>/] --out <json>`, one at a time, never during a pair. Form 4 per unit and where it went:
`node lane/types-form4-this-scripts/form4-moves.mjs <before.json> <after.json>` (a unit's first non-environment
finding, classified as `types-inventory.mjs` does; a nested unit under a stopped enclosing unit is `covered-by`). Its
totals equal the census's own on langchainjs and n8n; on nexus they are 2 units off, because nesting is read from
line ranges there. The rows below use the census's own totals. `node langs/ts/census.mjs --diff`: no reading loses a unit
on langchainjs or n8n.

| Root | Units | Form 4 | Stopped by `types` | Entered | Entered on base, stopped at head |
| --- | ---: | ---: | ---: | ---: | ---: |
| langchainjs | 6,709 | 59 → 0 | 96 → 37 | 2,766 → 2,805 | 0 |
| n8n | 9,610 | 32 → 0 | 37 → 5 | 2,680 → 2,699 | 0 |
| nexus `apps/backend/src/` (head: 51 directories) | 23,328 | 120 → 0 | `types` refusals in the 51 directories 625 → 505 | in the 51 directories 3,320 → 3,401 | 0 |

Where they went: langchainjs 39 entered, `copied-argument` 15, `classes` 3, `read-after-call` 2; n8n 19 entered,
`read-after-call` 10, `classes` 2, `reference-key` 1; nexus 81 entered, `classes` 31, `copied-argument` 5,
`read-after-call` 3. Every `classes` stop (36) is defect 1 below.

nexus: a whole-root census does not finish in two hours, so base was censused over `apps/backend/src/`. On this base
that directory holds every form-4 unit; the one frontend directory the A3 inventory named holds none since form 2 was
read (censused too: 65 units, 0 form 4 before and after). The whole-directory head run was killed by the machine's
out-of-memory killer (exit 137, the machine at 118 of 122 GB with other lanes' nexus censuses running). Head was then
censused in the 51 directories holding a base form-4 unit (`--include <dir>/`, one run each, 2,140 files, merged by file
with `lane/types-form4-this-scripts/merge.mjs`) and compared unit by unit with the base run. So the nexus regression check covers those
2,140 files, not the whole backend. A first sequential chain was stopped by me (its own pids) before it outran its
background limit; no number is taken from it. Files: `/root/lanes/types-form4-this/census/` (`*-before.json`,
`*-after.json`, `nexus-dirs-after/`, `moves-*.txt`, `diff-*.txt`).

## Defects met (reported, not fixed: outside this construct)

1. **A nested callback unit reading `this`.** An arrow inside a method that reads `this` is refused by the lint as
   `` `this` outside a class method `` (rule `classes`), e.g. langchainjs
   `libs/langchain-core/src/callbacks/manager.ts` `CallbackManagerForToolRun.handleToolEvent/this.handlers.map()#0/consumeCallback()#0`,
   n8n `packages/cli/src/WorkflowRunner.ts` `WorkflowRunner.enqueueExecution/PCancelable()#0/Promise()#0/setInterval()#0`.
   On base form 4 stopped them first. The arrow's `this` is the enclosing method's receiver; that is a callback reading.
2. **An edit inside a class renames every request on its instances** (heldKey). It is sound and deliberate, and it is why a
   subclass method calling an inherited chain is never proved after an edit anywhere in its class family. A summary
   keyed by the called method's own code (and its overrides) would prove more. That is a calls reading, not this one.
3. **Read order of two receivers.** A commuted comparison of two reads on two world values is a different trace for
   lane B and a different world threading for lane A. This is a choice of the world model, recorded only.
4. The machine: the whole-backend head census of nexus was killed by the out-of-memory killer (above). This is not a lean
   defect, but a whole nexus census at head (or over `apps/backend/src/`) is still to be run when the machine is quiet.
5. Git: no user identity in this environment. Commits pass the repository's existing author with `git -c` on each
   command; no configuration was written.

## What is left

- Forms 5 and 6 are a sibling lane's. No form-4 unit remains on the three roots censused (above).
- A nexus census at head over the whole backend (or the whole root), when memory allows.
- The rules that now stop the former form-4 units (`copied-argument`, `read-after-call`, `classes`, `reference-key`) are
  other readings.
