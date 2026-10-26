# Loop and control forms

JavaScript labels name an enclosing statement. A break exits that statement;
a continue targets a loop and takes its next step, including a counted for's
increment. A return leaves every enclosing loop with the current state.

The reading is nested recursive helpers with a completion channel:
Normal | Break(label) | Continue(label) | Return(value). Normal is zero,
break and continue use positive and negative lexical label numbers, and the
existing Option return channel carries Return. Only helpers that can escape
to an enclosing label need the integer channel. Each helper also returns all
changed outer locals and the world. The enclosing helper consumes its own
label or propagates the completion, without executing intervening statements.
For example, an inner break of label 1 returns `(1, total)`; its caller reads
`var (jump, total) := inner(...); if jump == 1 then total else ...`.
Opaque inner loops also carry escaping completions; their external name includes
the text and completion encoding, so reordered label numbers cannot alias.
The same channel handles bare exits across opaque statements. A try crossed
by an exit remains opaque so its finalizers execute before the exit propagates.
A label on a non-loop block stays refused by `label`.

A switch evaluates its discriminant once. It tests case expressions in source
order until the first strict match, skipping default during the search. Only
if none matches does execution start at default, wherever default occurs.
Execution then follows all subsequent clauses without evaluating their case
expressions, until break, continue, return or the end. The generated start
index encodes a boolean matched state: `start <= clauseIndex` means execution
has begun. Clause suffix continuations concatenate fall-through statements.
A switch break takes the switch continuation; a loop break takes the loop's.
Case expressions with transitions are evaluated lazily in the search chain,
which returns the updated world and locals with the selected index. A switch
on reference or unknown values stays opaque: structural equality is not identity.

A while without a hint can have an exact measure: a single numeric local in
an integer-model file compared with an integer literal, a constant local,
or an array/string length. Its only write in the body is an unconditional
constant positive step toward the limit (`++`, `--`, `+= k`, `-= k`). The
limit is unchanged. Calls, nested loops, callbacks, try and continue make the
inference decline. These restrictions are inference limits, never refusals.
The distance to the bound, guarded by the comparison, is a natural measure.
With a checked hint, condition effects are sequenced at each loop test.
An index cursor advancing through a sequence is this same rule. Object-link
cursors and bounds hidden in calls retain their opaque transition.

For `while (true)` and `for (;;)`, an initial `if (exit) break` supplies the
negated comparison. Removing this guard into the helper's entry test gives
the same reading as `while (!exit)`. Without a derivable measure the entire
loop retains an opaque transition. An unconditional loop without any break has no normal completion: when it
returns, its opaque result is the return value directly. Hints remain checked
by Dafny, never assumed.
Break paths do not claim the condition is false on exit. A do loop tests its
condition only after its first body execution; its first-step bit is explicit.

Soundness hazards are swallowed outer jumps, skipped for increments, eager
case effects, default before a later match, mutable bounds and skipped counter
updates. Completion propagation, lazy first-match selection, ordered suffixes
and conservative bound inference respectively prevent these. Unknown cases
retain a text-keyed opaque reading; no new refusal replaces a prior reading.
On rebase, exact union expansion could exceed the type depth on previously
admitted loop units. Failed sum expansion rolls back its type declarations and
retains the prior Any union reading; representable sums keep the exact reading.
Lane B executes the original JavaScript on typed arrays, numbers and literal
case selectors. Mutants change the exited loop or insert a switch break.
Module writes use the world channel without additional local helper state.
Return completion retains distinct Absent and Nullish tags.
Condition value steps run at each test; do-loop tests skip the initial entry.
Switch discriminant value steps run once before lazy case selection.
Opaque loops include referenced module declarations in their transition identity.

Instances inspected (paths relative to the read-only census repos root):
- nutshell/modules/chat/src/drawing/arrange-turn-items.ts:79, index/length loop;
  nested calls prevent derivation, so opaque fallback.
- nutshell/modules/chat/src/controller/prepare-older-in-slices.ts:27, call
  condition; opaque fallback.
- agent-nexus/packages/cli/src/json-terminal-command-path.ts:17, object parent
  cursor; opaque fallback, no finite sequence bound.
- nutshell/tools/fake-claude/src/resume-leaf.ts:36, seen-set cursor; opaque.
- agent-nexus/packages/cli/src/commands/chat/_shared/render-turn-chunk.ts:13,
  switch with case effects and breaks; exact ordered clauses.
- status/src/ui/detail-cards.ts:90, literal switch returns; exact first match.
