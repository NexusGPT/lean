# Stage 5 rank 15: any for header, desugared to init; while (cond) { body; step }

The construct: `for (let i = 0; i < xs.length; i += size)` (a batch loop, the step a variable), `for (let i = 0, n =
xs.length; i < n; i++)` (two declarations), `for (let at = text.indexOf(m); at !== -1; at = text.indexOf(m, at + 1))`
(an init from a call, a step by assignment), `for (let attempt = 0; ; attempt++)` (no condition), `for (let i = 0, j =
n; i < j; i++, j--)` (a comma step). Before this rank the lint admitted one header, `let i = e; i < limit; i++` and its
mirror forms with a literal step, and refused the rest as `loop-form` (194 units) or `loop-var-assign` (30 units, the
counter assigned in the body).

## The reading

One test, `countedFor` in `langs/ts/common.mjs`, is shared by the lint and the translator: the counted header is one
`let` declaration with an initializer, a condition `i < e`, `i <= e`, `i > e` or `i >= e` on that name, a step `i++`,
`i += k`, `i--` or `i -= k` (k a positive literal) in the direction of the condition, and a body that never assigns the
counter. That header keeps its reading (the counter as the loop helper's lead parameter). Every other header is read as
JavaScript defines it (ECMA-262 14.7.4): the init statements run once before the loop (a declaration list or an
expression, hoisted as statements, `forInit`), the condition is the while condition (`true` when absent), the step is
the body's last statement (`forStep`), and a `continue` of this loop runs the step before the next test
(`loopCtx.cont`). The loop then takes the while reading: a derived bound when the counter, the limit and the step give
one (`derivedBound`, now also for a counter declared in the for's own init, a step `i = i + k` or `i = i - k`, and a
body whose only `continue` targets this loop), a `// @decreases` hint, else one opaque block holding the whole statement
(SEMANTICS "Opaque blocks"), init included. A counter started at a literal carries `requires i >= literal` on the
helper, as the counted form's lead parameter does, so `xs[i]` inside the body is in range.

One Dafny step of `for (let i = 0; i < xs.length; i = i + 1) { if (xs[i] <= 0) continue; acc = acc + xs[i]; }` (pair
unit `sumPositive`):

```
if !(i < |xs|) then (i, acc)
else
  if xs[i] <= 0 then (var i: int := i + 1; sum_positive_loop0_parent(xs, i, acc))
  else (var acc: int := acc + xs[i]; var i: int := i + 1; sum_positive_loop0_parent(xs, i, acc))
```

What stays refused: a `var` counter (rule `var`, escape `fixtures/escapes/ts/for_desugar_var.ts`). What stays opaque: a
header whose bound does not follow (a variable step, a comma step, a limit that is neither a literal, a `const` integer
nor an array's length). An effect in the condition or the step fails at translation as before.

The differential step of the suite (`langs/ts/tests/cases/for_general.ts`, three functions run in Node and in Dafny on
the same inputs) holds the step to exactly one run per iteration, on the plain path and through `continue`: the first
build ran it twice on the plain path (appended to the body and run again by the body's continuation), a defect no pair
shows, since both sides share the translator.

## Measurement

Pair `for_desugar`: `chunks` (opaque, proved by identity), `sumPositive` (derived bound with `continue`; the candidate's
`+=` proved), `firstNegative` (no condition, the break-first bound; WITNESS), `mirrored` (comma step, opaque; WITNESS),
`occurrences` (untouched). Census (`node langs/ts/census.mjs`, the rank 14 state as the base): nexus 23,708 to 23,745 of 26,520
(`loop-form` and `loop-var-assign` leave the top rules); langchainjs 3,489 to 3,489 of 4,871. The stage 5 table
predicted 90 and 5 alone; the units it counted on langchainjs stay out on other keys.
