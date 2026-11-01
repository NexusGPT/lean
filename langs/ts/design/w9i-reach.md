# Lane B reaches for the unit's changed statements (lane w9i-reach)

## The gap

On the 75 slice mutants, eight mutant comments repeated the PR's own comment with the same observed facts. Lane B's
inputs never executed the mutated statement (or entered it and threw before it finished), so nothing lane B observed on
the mutant differed from what it observed on the PR. The w3c search (`LEAN_SEARCH=1`) was off in the bench, ran only
when the draws found no difference, and searched for any difference, not for the changed statements.

## What lane B does now

1. **The changed statements of a file** (`exec/search.mjs reachTable`). A statement's own text is its text less the
   statements nested in it (through blocks and function bodies). It is changed when a line the diff of the two files
   changes holds a character of its own text. Each changed statement has a point whose evaluation finishes its own
   work: an expression statement's, a return's, a throw's, a switch's, a for-of's expression; for a declaration list a
   last declarator added after the others; for an if, a loop or a for with a condition, the condition's branch probe.
   A super call, a break, a continue, a block and a try have no point and are no target. A changed statement is
   *completed* by an input when its point ran: a statement that threw half way was entered, not completed.
2. **Probes** (`branchMarks`). `state.r(file, id, value)` wraps the point (the value comes back unchanged); the
   branch probes are as w3c's. The probes of a file pair are built once and kept for every unit of the pair, so the
   loader's compile cache keys on one object. A branch is probed only inside a top-level function a changed line
   falls in (an unchanged callee's loops cost no probe). `statementMarks` (patch.mjs) now keeps the source node as the
   original of the return and the await it rewrites, so a probe keyed on original nodes meets them.
3. **The search is on in every run** (`LEAN_SEARCH=0` or `--no-search` turns it off). Its targets are w3c's branches
   plus the unit's changed statements (`P:s<id>`, `C:s<id>`) and the conditions inside a target's condition (an operand
   of its `&&`, a `??` in it: the steps toward it). It runs after the draws whenever a target is unreached, past the
   draws' witnesses too, within `SEARCH_SHARE` of the unit's seconds and, past a witness, by `REACH_CEILING` of them
   since the unit began. Each divergence it finds (replayed on fresh environments, as before) is handed to
   `keepDifference` with a site per differing field, and the search goes on for what is unreached, until every target
   is reached, `WITNESS_SITES` are held, or its bounds. Past a witness an error ends the search and the WITNESS stands.
4. **The search's scheduler** (with `onDiff`): the drawn inputs at the frontier go first (an input that took the other
   outcome of an unreached target branch evaluated its condition), a leaf found inert on one entry is inert on every
   entry, and when the top entry has no live change the next entry down with one goes first. An absent list may be made
   one element long and an empty one gains a literal of a target condition.
5. **A witness kept for what it reached** (`exec/sites.mjs keepDifference`). Every witness carries `reached`: the
   unit's changed statements its input completed (either side, `<side> <line>`). A difference at a site already held
   is kept as its own site when its input completed a changed statement no kept witness completed; its `where.reach`
   names those statements, and `siteKey` includes `where.reach` (pr.mjs `siteWitnesses` reads the same key).
6. **The witness lane B leads with**: the one that completed the most changed statements, ties in order of discovery.
   It is the row's `witness` (the one DA renders).

No part reads the truth, the mutation or a bench file. The targets are the diff's lines inside the unit, on both sides.

## Breaks

`LEAN_BREAK=w9i-reach` restores the earlier rule whole: the search behind `LEAN_SEARCH=1` only and only without a
witness, no statement probes, no reach site, discovery order. Pairs: `tests/pairs/reach_statements` (the search past a
witness completes a statement no draw completed: a site at line 8), `reach_site` (a same-site witness kept for the
statement it completed, and leading), `reach_lead` (the witness that completed both changed statements leads). Each is
green plain and red under the break (`lane/w9i-reach/pairs-break.mjs`).

## Open

- A rendered unit is not searched (as before); the module unit has no probes.
- A changed line inside a class property initializer or a parameter default belongs to no statement and is no target.
- The location of a witness is still where its difference shows (often the return): reaching a changed statement
  changes the observed facts, not the line DA anchors the comment on.
