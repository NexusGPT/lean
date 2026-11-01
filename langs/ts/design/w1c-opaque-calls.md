# W1c: the opacity ladder for calls, members, syntax and callbacks (2026-11-01)

Lane `w1c-opaque-calls`, workstream W1 (`/root/briefs/da-v4/w1-opacity.md`). The measurement is at the end; every
number has its command in `lane/w1c-opaque-calls-result.md`.

## What

Twenty-two lint rules stopped 2,338 units on the 39 census roots at v0.1.4 (R6, `regress/597fc83`, the units whose
first refusing finding is one of them): `dynamic-key` 662, `unsupported-call` 423, `unsupported-member` 294,
`unsupported-syntax` 242, `assign-target` 202, `function-value` 127, `callback-form` 121, `optional-chain` 52,
`instanceof-constructor` 44, `operator-value-context` 32, `unsupported-operator` 30, `exception-callback` 29, `delete` 27,
`callback-control` 26, `callback-result` 16, `freeze` 5, `exception-binding` 4, `iterator-protocol` 2; `unsupported-type`,
`exception-return`, `conditional-effect` and `union-type` stopped none. Each says "lean has no exact reading of this
construct here". None says "no reading can be sound here". So each becomes an **opaque step** instead of a refusal: the
lint keeps the rule and its message (the editor, the advice and `--advice` still show it), the finding carries the label
`opaque: statement`, and it stops nothing.

The column (`translate/opaque-calls.mjs`, `OPAQUE_COLUMN`): every one of the twenty-two rules is `statement`. The three
rules W1 keeps at `none` by design (`dynamic-eval`, `prototype`, `super` as a value under `class`/`inheritance`) are not
in this lane's list and are not touched; a unit they stop stays stopped.

## The reading

The **site** of a finding is the innermost statement of its unit's own body (never a statement of a function nested in
the unit: the statement holding that function) that contains the finding's node. That statement is read as one step

    Opaque(id, reads) -> (writes, control, world')

emitted by the translator's existing opaque block (`translate.mjs` `opaqueStep`, the form the try, the unbounded loop and
the reference switch already use), one bodiless Dafny function:

- **id**: `block_<sha1 of the statement's text, comments dropped, whitespace folded>`, plus the tags the opaque block
  already carries: the same-file units it calls (`_calls_`: the theorem refuses the block when one of them changed), the
  module cells it names (`_modules_<hash>`), its jumps (`_exits_`). The same text on both sides is the same symbol, so two
  syntactically identical lambdas inside it are one value (subset.md, "Modelling axioms"), and a changed callback is a
  changed symbol.
- **reads**: the world, the receiver when the statement names `this`, and every local or parameter the statement
  mentions (free names, including names inside nested callbacks; `freeVars`). The symbol is applied to the values, so it
  is keyed by `(text, reads' values)`: two textually equal steps in two scopes read two sets of values and are two
  applications of one function, which is what the effect axiom says (`effect(world, op, args)`).
- **writes**: over-approximated, never under:
  1. every name the statement assigns (`=`, compound assignment, `++`/`--`, destructuring targets, a declaration the
     statement makes, the root of a field or element write, the receiver of a mutating method, a same-file call that
     changes a parameter it was handed: `assignedOutside`);
  2. **every local and parameter in scope whose type is not a primitive** (a record, an array, a Map or Set, an opaque
     value, a function-typed value is excluded: it holds no fields lean reads): a construct lean cannot read may change any
     object it can reach, and through an alias or the world it can reach any object the unit holds. The value lane's
     outside call keeps its stated axiom (the outside does not change a value it was handed; lane B observes reachable
     mutation); an opaque step makes no such claim;
  3. every primitive local in scope that a function nested in the unit assigns (a closure the step may call);
  4. the receiver, when the step names `this` (`self` rebound after the step).
- **control**: a `return` inside the statement makes the step return `Option<R>` (a statement that always leaves returns
  `R`); `throw` raises the world's fault flag inside the transition (the step is a world transition, and in a unit with a
  fault channel `opaqueCompletion` tests the flag after it); `break`/`continue` to a loop outside the statement give an
  integer jump result dispatched after the step (`escapingLabels`, `dispatchJump`).
- **loops**: a site inside a loop body is one step per iteration; the loop helper threads the world and the state
  (`assignedOutside` of the loop includes the world once any statement in it is effectful, and an opaque step is).

Where no statement of the unit's own body holds the site (a parameter default, a concise arrow body, a field
initialiser), the unit is **one opaque function** of its inputs and the world (`opaque_unit_<sourceKey>`: its text and
every same-file unit it reaches, the key `number-special` units use), returning its result, the world and its changed
parameters.

The translator's own refusals of these rules are the same: a refusal `<rule>: ...` raised while a unit is translated names
the node it stopped at; the translation runs again with that node a site, until it ends or stops for another rule or at a
site already taken (each run adds one site, so the runs are bounded by the file's nodes).

## Why this is sound

1. lean's one effect axiom is `effect(world, op, args) = (world', result)` (subset.md, "Modelling axioms"). An opaque
   step is that axiom applied to a statement: `op` is the statement's text and the same-file code it names, `args` are
   the values it reads, `result` is the values it may write, its control outcome and the world after it.
2. The theorem then says: for every input and every interpretation of every opaque symbol, the two sides' observations
   agree. The real program is one interpretation (the statement's actual behaviour is a function of the world and the
   values it reads, by determinism of JavaScript given the world). So a proof covers the real program, provided the
   step's interface contains everything the statement can read and everything it can change.
3. That proviso is the only way to prove a false equality, and each half is over-approximated:
   - a read missing from `reads` would let two sides that hand the step different values share one result; every free
     name is a read, the receiver and the world too;
   - a write missing from `writes` would let a side read a stale value after the step; every assigned name, every object
     in scope, every closure-written primitive and the receiver are rebound from the step's result;
   - a control outcome missing would let a side fall through where the real statement returned, threw or jumped; each
     of the three has its channel.
4. A change inside the construct changes its text, hence its symbol: the two sides apply two different uninterpreted
   functions and the theorem cannot equate them. A PASS-proved is impossible; lane B runs the real code and finds the
   difference (WITNESS) or reports PASS-bounded, and the verdict is never stronger than lane B's.
5. A change in a same-file callee the statement names is caught by the `_calls_` tag (the theorem refuses the block);
   a change in a module declaration it names by the `_modules_` tag.

The cost: an over-approximated write turns a later exact read into an uninterpreted one, so a proof that needed the
object unchanged across the step is lost (an ASK where an exact reading would prove). It never makes a proof.

## Tests

Each rule has a pair `tests/pairs/opaque_<rule>/` with these units:

- `outside_<n>`: the construct unchanged, a change elsewhere in the unit → PASS-proved, and the certificate lists the
  step (`opaque: [{ rule, line, id, reads, writes }]`);
- `inside_<n>`: a change inside the construct → not proved; lane B WITNESS (or PASS-bounded where the change is not
  observable on the drawn inputs);
- `read_<n>`: the construct unchanged, a value it reads changed before it → not proved (the `--break` unit);
- `write_<n>` (where the construct reaches an object): a read of an object the step may change, moved across the step →
  not proved;
- `planted_<n>`: a mutation mutate.mjs plants inside the construct → lane B WITNESS.

`tests/opaque-calls.mjs` runs the pairs; `--break` sets `LEAN_OPAQUE_BREAK=drop-read` (the step forgets its last read)
and must go red: the `read_` units become PASS-proved, which the expectation refuses. `LEAN_OPAQUE_BREAK=drop-write`
forgets the over-approximated writes and the `write_` units go red the same way.

## Measurement

See the end of this note, filled in from `lane/w1c-opaque-calls-result.md`.
