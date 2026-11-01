# W4a, 2026-11-01: converter transforms for the mutation family

Five transforms under `langs/ts/convert/`, each a syntax-tree rewrite planned at a lint finding, applied behind
`--narrowed` (their rules are migration entries, or a conditional entry the lint does not decide), and kept by
`convert.mjs` only when `pr.mjs` proves the file (or, for an edit TypeScript erases, when the emitted JavaScript is the
parent's). What lane B cannot see is named in each file's header comment. The advice table (`lint/advice.mjs`) marks
every entry a transform rewrites with `transform: '<file>'` (the thirteen existing entries too, so an entry without the
field is one listed for a person).

## What was measured first, and what it changed in the brief

The brief's five shapes were written against the lint of an earlier census. Read against the lint at the lane's base
(4747022f), on the three roots' baseline census and on probes, three of them have no site left in the form the brief
gives, and the transform is built on the shape the current lint does refuse:

- closure-counter. A synchronous array callback that writes an outer local is already read as a loop body (the unit
  enters); the refusal left is on the callback unit itself, `captured-mutable` ("captured binding `n` may be written after
  this callback is created"). 99 findings in nutshell, 48 in apps-ui. The rewrite is the brief's: the callback's counter
  becomes the value a `reduce` carries.
- param-copy. A parameter changed in place is already read (the parameter is an output). A copy at entry (`p = { ...p }`)
  would hide that change from the caller, and lane B compares the arguments after the call (`exec/run.mjs` header), so
  the copy is a WITNESS wherever the change runs: it changes behaviour, and stays a person's choice. The refusal the
  advice answers with a copy is `param-assign` ("copy it to a local first"): a parameter rebound where lean does not read
  it rebound. param-copy copies the binding, not the value.
- rebuild-by-spread. An owned local record changed field by field is already read in place (the lint's own message:
  "records it owns are updated in place"). The refusal of that family left is `param-mutation` on a push into an array a
  container of the function holds (`(perBand[b] = perBand[b] || []).push(id)`, `parts[slot]?.push(said)`): "push on
  `parts[slot]`, which is not a local array". rebuild-by-spread rebuilds that array by spread.
- hoist-update. As the brief, extended to the residual refusals: a step in a branch (`operator-value-context`), a logical
  assignment used as a value (`assignment-expression`), and a sort or reverse used as a value (`in-place-mutation`, and
  `param-mutation` on a parameter).
- explicit-return. Under lean's strict reading a bare `return;` is refused only where the declared result leaves
  undefined out, and there `return undefined;` is the same type error (TS2322); where the type admits undefined the bare
  return is already read. The transform writes the undefined into the declared result instead (`T` becomes
  `T | undefined`), an annotation TypeScript erases.

## The transforms, the argument each keeps behaviour

| transform | rules | the rewrite | why it is exact | the guard (decided on the tree and the checker's types) |
|---|---|---|---|---|
| closure-counter | captured-mutable, closure-mutation | `xs.forEach((x) => { body })` writing one local `n` becomes `n = xs.reduce<T>((acc, x) => { let n = acc; body; return n; }, n);` | forEach and reduce with an initial value visit the same indices in the same order and skip the same holes (ECMA-262 23.1.3.15, 23.1.3.24); the step's `let` starts from the accumulator, the value after the step before, so every read and write in the callback sees what it saw; the statement writes the last value back | the callback writes no other outer binding; no function inside it names `n`; every other reference to `n` is in the declaring function or an inline array callback around the statement (nobody can call those during a step); no try between the statement and the declaring function (a throw leaves `n` unread); an array receiver whose type rests on no assertion; a synchronous arrow, at most one plain parameter, no value returned |
| hoist-update | update-expression, assignment-expression, operator-value-context, in-place-mutation | a step on every path of its statement moves before it and its value is the target read back; `T \|\| (T = V)` is `T \|\|= V` and, on a field, `if (!T) { T = V; }`; a conditional holding a step becomes `let v: T; if (c) { v = A; } else { v = B; }`; `R.sort(f)` and `R.reverse()` used as values become the statement and `R` (`push`, `unshift`: `R.length`) | an assignment's value is the value it stored (ECMA-262 13.15.2), which a name or a plain data field gives back; sort and reverse return their receiver; a pure path reads its base once or twice alike | everything the statement evaluates before the step (its earlier operands in source order) is inert under the types (names, literals, operators on primitives, field reads of plain data records, a method read as a callee) and names neither the target's root nor, for a field, a field of that name; a declaration list is split before the declarator that holds the step; not in a loop head, a closure, an optional chain, or an expression body |
| rebuild-by-spread | param-mutation | `C[k].push(v)`, `C[k]?.push(v)`, `(C[k] = C[k] \|\| []).push(v)` become `C[k] = [...C[k], v]` (with a test for the optional form, the default kept) | the spread copies the elements in order and the new ones follow; only the identity of the array under the key differs | C is a local of this function (not a generator) made by `{}`, `[]`, a literal of array literals or a `map` returning one; every value put under a key is fresh or the key's own; every read of one of its arrays is used at once (an element, its length, a reading method with a callback of at most two parameters, another push); C is never handed to a call, spread or held (it may be returned); no other function than an inline array callback names it; no try around the push; a key that is a name, a literal or a pure path. A sort or push used as a value goes to hoist-update's planner |
| param-copy | param-assign | `(p) => { p = f(p); ... }` becomes `(pArg) => { let p = pArg; p = f(p); ... }` | in strict code a parameter is a plain binding (no mapped `arguments`); a `let` that starts as it is read and written alike; arity and binding order are unchanged | the function reads no `arguments`, no other parameter's default names `p`, `p` is a plain name (no pattern, `this`, parameter property or decorator) |
| explicit-return | bare-return | `function f(): T { ... return; ... }` becomes `function f(): T \| undefined` (`Promise<T \| undefined>` for an async function) | a return with no expression completes with undefined (ECMA-262 14.10); the annotation is erased: the transform checks the emitted JavaScript is the same under decorator metadata and both class-field readings (strict-annotate.mjs `erased`), and convert.mjs proves the file by erasure (PASS-erased) | the unit has no caller in another module (not exported, not a public member of an exported class, not exported under another name); a written result type; the converter's round undoes it on a new type error in the file |

The rule-to-transform table of `convert.mjs` takes one transform per rule; `param-mutation` has two shapes, so
rebuild-by-spread is registered for it and hands a value-position call to hoist-update's `planReceiverCall`.

Helpers added to `convert/util.mjs` (additive): `castOnPath` (the lint's assertion readers along a list's path, as
foreach.mjs keeps its own), `ARRAY_CALLBACK_METHODS`, `inlineArrayCallback`, `tryBetween`.

## No new decision site

The transforms decide under `convert/`, not in `lint/lint.mjs` or `translate/translate.mjs`; no `v`, `refuse`, `note`,
`fail` or `Unsupported` site is added, so the audit table of `design/admission-contract.md` is unchanged. Two advice
entries are new (`captured-mutable`, `operator-value-context`: their findings carried no advice text before); they carry
the label the lint already gave those rules (migration).

## Tests

`tests/convert_mutation.mjs` (a runtime row of the suite, `convert-mutation`): the advice table's `transform` fields
name the transform loaded for the rule; each fixture `tests/fixtures/convert/<transform>/{before,after,wrong}.ts` as the
suite's convert section reads it (before converts to after exactly, after proves with no WITNESS, wrong is a WITNESS;
the convert section reads the same fixtures and now counts PASS-erased as a pass); and one guard per transform
(`tests/fixtures/convert_mutation/<transform>/parent.ts`) the converter refuses with its reason, whose rewrite without
the guard (`unguarded.ts`) is a WITNESS: a closure reading the carried counter during the loop, a statement reading the
hoisted field before the step, a container's array held under another name, a default naming the copied parameter (it
would read the outer name), an exported unit (no unguarded text: the edit is erased, the guard keeps the type other
modules read). `--break` takes the five transforms out of the converter's table: every fixture stays as it was, and the
run fails. The red-first run found one guard that did not hold (param-copy's default test looked below the default's
root, so `w = v` passed); fixed in the same commit as the test.

## Measured

See `lane/w4a-convert-mutation-result.md`: the converter's dry run over the three roots' candidate files, the five
transforms applied and proved on copies of apps-ui, driftbench and nutshell (applied, kept and reverted per transform),
and the census on the converted copies against the census before.
