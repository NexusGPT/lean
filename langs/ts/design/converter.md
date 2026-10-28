# The converter: the lint's advice applied as syntax-tree rewrites, each proved before it stays

`node langs/ts/convert.mjs <file|folder>... [--project <tsconfig>|--no-project]` rewrites code toward the subset the
proof lane reads. It is the lint's advice table (`lint/advice.mjs`) made executable: one transform per advice entry
under `langs/ts/convert/`, each a TypeScript syntax-tree edit (the spans come from tree nodes, the new text is built
from the source of other nodes), and every change is checked by `pr.mjs` before it is kept.

## What it does, step by step

1. Lint each file with the advice on (`lintFile`, advisory), so every finding carries its rule, its label and, for
   the rules the lint decides at the site, `labelDecided` and `precondition`.
2. Plan every finding whose rule has a transform. The label decides what may be applied:
   - `proved`: applied when the transform's shape matches the site;
   - `conditional`: applied when the lint decided the precondition at the site (its label there is `proved`); a site
     the lint left `conditional` is listed. When the lint decides no flag for the rule (`var` today), the transform
     decides the advice's own precondition sentence on the syntax tree, and the report says so;
   - `migration`: applied only in the narrowed shape the transform states, whose guard makes the rewrite keep
     behaviour (reported as `narrowed`); `--strict-labels` lists every migration site instead;
   - a rule with no transform is listed for a person with the lint's advice.
3. Apply the plans that do not overlap, re-lint, and run again (a rewrite can open another: an outer forEach first,
   then the one inside it), up to six rounds. A round that types worse than its input (a new `ts-strict` finding or a
   syntax error) is undone site by site and the failing site is listed with the compiler's message.
4. Per folder, prove the change with `pr.mjs` against `HEAD` (the folder must be clean before), head the working
   tree. A WITNESS on a changed function, or on an unchanged caller through it, reverts that file. An ASK keeps the
   file only when the parent against itself asks the same (the reason is lean's own, not the rewrite's); any other ASK
   reverts it. A reverted file is re-proved away from the table: the final rows are the kept files only.
5. Print a table per folder: findings, applied (by rule), listed for a person, verdicts; then each site, applied with
   its label and guard, or listed with its reason. `--json` and `--out` keep both.

## The transforms

| entry | label | file | the rewrite | the guard that keeps behaviour |
|---|---|---|---|---|
| nested-ternary | proved | nested-ternary.mjs | a conditional with a conditional branch becomes nested if statements | the conditional is the whole value of a return, an arrow body, one declaration's initializer (`let x: T;` then one assignment per branch) or a plain assignment; each condition is evaluated once, in its own branch |
| loose-equality | conditional | loose-equality.mjs | `==` to `===`, `!=` to `!==` | the lint decided the site `proved` (a `typeof` against a string, two literals of one type, one primitive type on both sides) |
| var | conditional | var.mjs | `var` to `let` | one declaration, every use after it inside its block, no hoisted function reads it, no closure in a loop captures it, an initializer when inside a loop |
| math-empty (no entry: migration) | narrowed | math-empty.mjs | `Math.max(...xs)` to `xs.length > 0 ? Math.max(...xs) : 0`; a mapped list bound to a fresh local first | the statement just before leaves the block when the list is empty, so the fallback is dead; a map keeps its receiver's length |
| foreach | narrowed | foreach.mjs | `xs.forEach((x, i) => body)` to a counted for with `const x = xs[i]; if (x === undefined) continue;` | an array whose element type has no undefined (so a skipped undefined is a hole, which forEach skips too), a body that never changes the list, a synchronous arrow, a bare `return` not under a nested loop (it becomes `continue`) |
| alias-mutation | narrowed | map-bucket.mjs | `const b = m.get(k); if (b) b.push(v); else m.set(k, [v]);` to `m.set(k, [...(m.get(k) ?? []), v]);` | the Map is made empty here, never handed to a call, every other value set into it a fresh array, and no bucket is read before the outermost loop around the growth ends |
| function-value | narrowed | function-value.mjs | an arrow passed inline to a same-file function becomes a named local just before the statement, its parameters and result typed as the call typed them | the statement makes the arrow on every path (no conditional, no loop head, no nested function between); the callee only calls the parameter or passes it on |
| index-assign, property-assign | narrowed | record-spread.mjs | `r.f[k] = v` (or `r.f.g = v`, `+=`, `++`) to `r.f = { ...r.f, [k]: v }` | `r` is a local made here by a literal whose field `f` is a fresh literal of plain data; `r` is only read through fields, spread or returned, and `r.f` is never held or handed on |

Every guard is decided on the syntax tree and the checker's types; `pr.mjs` is the second check and the only one the
converter trusts for keeping a file. What lane B cannot see (a callee given the outer record that keeps its inner
record, an Array subclass with its own species, a callee reading a function's `name`) is named in each transform's
header comment.

## Every advice entry: transform or listed only

With a transform: nested-ternary, loose-equality, var, foreach, alias-mutation (a Map bucket), function-value,
index-assign, property-assign, and the lint rule math-empty, which has no advice entry.

Listed only, by reason:

- The rewrite needs a choice of meaning a person makes (the advice says so): inner-html, division, assign-target,
  freeze, hook-order, render-impure, reference-equality, global-mutation, global-read, this, class, dynamic-eval,
  prototype, async, generator, union-type, mixed-types, string-order, bitwise, toplevel-state, toplevel-effect,
  promise, inheritance, effect, non-null, record-rest, unresolved-module, ts-strict, any-type (a proposed type is a
  claim about intent), loop-form and do-while (a `// @decreases` bound is a fact about intent).
- The rewrite changes the shape of a function across statements, with no local shape whose guard the tree decides:
  closure-mutation, param-mutation, opaque-mutation, in-place-mutation, receiver-mutation, nested-function,
  break-continue, switch-fallthrough, destructuring, uninitialised, bare-return, update-expression,
  assignment-expression, comma, param-form, spread, collection-iterator, for-in, for-of-non-array, template,
  unsupported-syntax, unsupported-call, unsupported-member, dynamic-key. The hand rewrites of these in the replayed
  application (a counter returned by a nested function instead of written, a dictionary read by a named field, a
  regular expression moved inline) each needed a decision about the code around the site.
- Conditional, with the precondition decided at the site or decidable, and no instance in the pattern set yet; a
  transform is the next step and needs no new mechanism: arguments and bound-function (the lint decides them),
  param-assign, unary-coercion, callback-form, optional-chain, generic, static-this, implicit-this, mutator-value,
  promise-all-order.
- alias-mutation and property-assign outside the shapes above (a record read from a Map and changed field by field, a
  call result changed after the call): listed; the hand rewrite of the first rebuilt the record by spread and set,
  which changes the identity of a value a caller may hold.

## Measured

The replay over the engine and graph folders of a real application that a person had rewritten by hand (27
commits, each proved or bounded by `pr.mjs`) is in the lane report of this change. The fixtures are
`langs/ts/tests/fixtures/convert/<transform>/{before,after,wrong}.ts`, run by the suite's `convert` section: the
before converts to the after exactly, the after proves with no WITNESS, and the wrong after (a near rewrite that
changes behaviour) is a WITNESS.
