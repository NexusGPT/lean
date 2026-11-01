# W1d: the opacity ladder for async, promises and generators (2026-11-01)

Lane w1d-opaque-async, workstream W1 (`/root/briefs/da-v4/w1-opacity.md`, with the plan review's amendments A1 to A8).
Code: `opaque-async.mjs` (the column, the site decision, the write set, the pending-work test, the reached functions),
the lint's label (`lint/lint.mjs`, the pass at the end of `admissionFindings`), the translator's step
(`translate/translate.mjs` `opaqueExpression`, emitted through w1a's shared `translate/opaque.mjs` `opaqueForm`,
`opaqueText`, `opaqueKey`, `opaqueEntry`), the catalogue entry `opaque-steps` (`readings.mjs`, recorded per unit by
`lower.mjs`). Pairs: `tests/pairs/opaque_<rule>/` (the per-rule ones written by `tests/w1d-make-pairs.py`),
`opaque_async_origin` (A2), `opaque_async_callee` (A3), `opaque_capture` (pending work); the driver with the breaks
`tests/w1d-opaque-async.mjs`. Measurement: `lane/w1d-opaque-async-result.md`.

## What

Sixteen rules of subset.md "What is refused" refused a unit for an async, promise or generator construct with no exact
reading. Each now has an `opaque` column (`ASYNC_OPAQUE`):

| rule | opaque | the construct, or why it stays a refusal |
|---|---|---|
| `async` | expression | an async unit called without await; an await of a callee form outside the subset |
| `promise` | expression | a non-async unit returning `new Promise(...)`, a same-file async call, a promise read out of a collection |
| `promise-pending` | expression | an unconsumed or stored `new Promise`, a dangling chain |
| `promise-unsettled`, `promise-executor`, `promise-executor-escape` | expression | the `new Promise(...)` whose executor misses a settlement path, is async, or stores its resolver |
| `promise-handler` | expression | the chain call the finding names (`Promise.resolve(a, b)`, a link with no single handler); a finding on a handler is a value (below) |
| `async-callback`, `async-predicate`, `async-reduce` | expression | the array-method call with an async callback |
| `generator-use` | expression | the call of a pure generator handed on |
| `promise-thenable` | none | the finding names the value a promise adopts; the adoption runs at the settlement, outside the value's text |
| `promise-all-order` | none | the finding names the callback; its unordered work runs inside `Promise.all`, outside the callback's text |
| `generator` | none | a nested generator declaration is hoisted and suspends: no step holds its yields |
| `generator-effect` | none | the body of a sequence generator is its yields (generators.mjs); a step inside it would hide them |
| `generator-bound` | none | a generator with an unbounded loop has no measure; an opaque reading would hide the missing measure (by design, ASK) |

A finding of an `expression` rule keeps its rule and message, gains `opaque: 'expression'`, and refuses nothing when its
node is a step; the node is handed to the translator. Otherwise the refusal stands and the finding carries the reason
(`opaqueWhy`). A node is a step when (`asyncOpaqueSite`):

1. it is a call, a `new` or an `await` of the unit's own code: not inside a function nested in the unit (that function
   runs where it is called), not a value (a callback, a held promise, an identifier). This is the locality test of A4:
   the step is where the refused behaviour runs;
2. the unit is not a generator, the node does not yield, and it does not name the receiver (`this`, `super`);
3. its pending work acts on the world alone (`pendingWork`, below);
4. its writes can be named (`stepWrites`, below), and when it writes any, the statement around it reads none of them
   elsewhere and no branch sits between the node and its statement (the names are rebound before the statement).

Every other rule's finding inside the node still refuses: the step does not swallow a mutation, a type assertion or a
captured mutable binding the lint names.

## The step

`Opaque(id, reads) -> (writes, control, world')` (w1-opacity.md) for an expression is `opaqueForm` with a terminal result:

    var (wld, tN, w1, ..., wk) := ext_step_<key>(wld, r1, ..., rm);

- `key` = sha1 over the construct's tokens (`opaqueText`: comments and layout are no part of it, every literal is
  whole), the tokens of every same-file function it reaches (`reachedFunctions`: a name in it resolving to a function
  declaration, a function-valued variable or a method of the file, then the functions their bodies reach, to the
  fixpoint; amendment A3), and the declarations of the module cells it names. The same text reaching the same texts is
  the same symbol on both sides; the reads' values are its arguments, so the symbol key is (text, callee texts, reads'
  values) as the effect axiom keys an outside call.
- `reads`: the world and every local the construct mentions, functions nested in it included (`freeVars`).
- `writes` (`stepWrites`, amendment A2): every reference binding of the unit the construct mentions (the step may change
  what it names: it hands it to a call, a callback writes through an element), closed under sharing in both directions:
  a binding shares with every binding its values mention (`const t = user.tags` shares with `user`; `const u = user`
  shares with `user`), so the name an alias came from and every other name for it are written. Parameters are two by
  two distinct trees (the value reading's axiom) and a call's result is fresh, so nothing else shares. A value that
  shares with `this` cannot be named: the site is refused. Primitive locals are never changed by a call; a rebinding of
  one inside the construct is in a nested function, which pendingWork refuses.
- `control`: a call, `new` or `await` cannot `return`, `break` or `continue` out of the unit, so the step has none; its
  value is the result.
- faults: the statement holding the step takes the check an await gets (`awaitsHere`): in an async unit,
  `if faulted(wld) then <the unit's rejection>`; in an exact try body, the catch path; in a throwing callback's body,
  the fault checkpoint (`faultMode`). A rejection or a throw inside the step is the world's fault, so the existing try
  channel routes it: an async step is one settled source on that channel.
- an awaited step (`await <construct>`) is the step, whose value is the promise, then the await of a held promise
  (`await_value`): two transitions, in that order.

The order of two steps is the order of their transitions: two steps swapped are two different world terms and the
theorem does not prove them equal (pair `opaque_async`, unit `reorder`; subset.md: reordering two independent effects is
a difference).

## Why it is sound

lean's one effect axiom is `effect(world, op, args) = (world', result)` (subset.md "Modelling axioms"). The step is that
axiom applied to a piece of the program: `op` is the construct's text and the texts it reaches, `args` the values it
reads. Two equal symbols applied to equal arguments give equal results; the theorem then says that on every input and
every reading of the opaque symbols the parent and the candidate agree. The real program is one reading of the symbols
exactly when the reads and writes over-approximate what the construct uses and changes, and when nothing the construct
starts changes the unit's state after the step outside the world:

- reads: every free name it mentions. A read left out is a way to a false equality: one symbol applied to arguments that
  agree while the values the construct uses differ. Every per-rule pair's `upstream` unit changes a local the step
  reads, before it (a change outside the construct, A1); `LEAN_BREAK=async-drop-reads` removes the unit's locals from the reads
  and each upstream unit flips to a false PASS-proved, which the driver refuses.
- writes: every reference it may change and every name that may share an object with one. A write left out is the other
  way: a read of the object after the step would see the old value. Pair `opaque_async_origin` is the amendment's pair
  in this family (`const t = user.tags; fill(t, k); return user.tags.length` against the length read first; and
  `const u = user; fill(user.tags, k); return u.tags.length`); `LEAN_BREAK=async-drop-origins` keeps the mentioned names
  only and both flip to a false PASS-proved.
- callee texts: `opaque_async_callee` changes `save` at `x === 7919` only, behind an unchanged `run`;
  `LEAN_BREAK=async-drop-callees` drops the texts from the key and run flips to a false PASS-proved. (The theorem's own
  `// CALLS:` check covers a callee only when it is a translated unit of the scope; the key covers every function the
  text reaches, translated or not.)
- pending work (locality in time, A4): a step may leave work running after it ends: an unawaited async call, a dangling
  `new Promise`, an async callback `map` does not wait for, a stored handler. That work runs at the transitions that
  follow (an await, an outside call): its effects on the world are part of the world the step returns, and an
  uninterpreted transition may run it. That reading is the real one only while the pending work acts on the world
  alone, which `pendingWork` requires of every function nested in the step: it rebinds no binding of the unit, and reads
  none the unit rebinds after the step, inside a loop around it, or from another nested function (the step's outputs are
  taken when it ends); it writes into no object it did not make itself (a callback's parameter is an element of the
  unit's value); and it hands no reference the unit uses outside the step (other than as a call's receiver) to a call.
  Pair `opaque_capture`: `xs.map(async (x) => { await svc.get(x); await svc.put(m); }); m = m + 1;` against `m + 2`;
  the put reads `m` after the step ended. Refused; lane B finds the changed put. With `LEAN_BREAK=async-drop-pending` lane A
  proves it (falsely).
- faults: the check after the statement adds a path where the world is faulted; the uninterpreted step may or may not
  fault, so the proof covers both.
- lane B is unchanged: it runs the real code, so a planted change inside a step (exec/mutate.mjs) is its WITNESS (the
  `planted` unit of every per-rule pair), and a change inside the construct is a different symbol, never PASS-proved
  (the `inside` unit).

## Locality per rule (A4)

The async family acts inside its text or in the world after it: the call, `new` or `await` is evaluated where it
stands, and what it leaves pending is held to the world by `pendingWork`. No rule of this family acts on a later read
elsewhere the way freeze, prototype or global state do, so none becomes a world-held handle. Three rules name values:
`promise-thenable` (the adopted value), `promise-all-order` (the callback), and `promise-handler` on a handler: the
refused behaviour runs where the value is used, so they stay `none` (the first two by column; the third by the site
test). Pairs `opaque_promise_thenable` and `opaque_promise_all_order` keep the refusal with its reason, and lane B
reads their units (the latter's `reorder` unit swaps two `Promise.all` steps: WITNESS).

## Span (A5)

The step's span is the finding's node: the lint hands the translator the node's offsets, and the certificate row
(`opaqueEntry`: rule, line, id, reads, writes, construct) names that node, never its statement or the unit. The
translator returns the rows of the steps it emitted; the certificate field and the per-unit opaque fraction are w1a's
(A7). The measured opaque fraction of the units these rules newly let enter is in the result file.

## Measurement

See `lane/w1d-opaque-async-result.md` for every number and its command: the pairs, the driver with its four breaks,
conformance on the pairs, and the census before and after on the three roots of A8 (nexus-automations,
nexus-meeting-recorder, apps-ui).
