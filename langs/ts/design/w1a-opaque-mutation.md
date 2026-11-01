# The opacity ladder for the mutation family (lane w1a, 2026-11-01)

The rules: `alias-mutation`, `param-assign`, `param-mutation`, `property-assign`, `index-assign`, `in-place-mutation`,
`closure-mutation`, `opaque-mutation`, `receiver-mutation`, `receiver-write`, `object-method-capture`,
`object-method-mutation`, `mutator-value`. Before this lane a finding of any of them stopped its unit. At v0.1.4 they
stopped 3,029 units of the 39 census roots (the R6 run at b5c0745, `refusalRules`, first rule per unit). Now each is
graded `opaque: block` (the column, `translate/opaque.mjs` `OPAQUE`): the unit is translated, and the part of it the
rule could not read is one opaque step. The message is kept; the finding carries `opaque: "block"`.

## What every refusal in this family protects

The value reading holds every object as a value: a name is its contents, two records with the same fields are one
value, two parameters are two objects (subset.md "Modelling axioms"). That is exact as long as no object is changed
while a second name holds it. Every rule of the family refuses a change the value reading would lose: a change
through a second name of a parameter's object (`alias-mutation`), a change to an object the function does not own
(`param-mutation`, `property-assign`, `index-assign`, `in-place-mutation`, `opaque-mutation`), a change from a closure
the function hands on and that may run later (`closure-mutation`, `object-method-capture`, `object-method-mutation`), a
change through a receiver path the reading cannot rebuild (`receiver-mutation`, `receiver-write`), a rebinding whose
caller-visible object the output would misname (`param-assign`), a change in an evaluation order the reading does not
follow (`mutator-value`).

## Why the opaque step cannot be one statement here

W1's general form is `Opaque(id, reads) -> (writes, control, world')`, keyed by `(text hash, reads' values)`. For the
statement holding a mutation that key is not enough, and the reason is the family's own: what a mutation does depends
on which names share an object, and the value of a name says nothing about that. Parent `if (c) t = a; else t = b;`,
candidate `if (!c) t = a; else t = b;`, then the same statement `t.x = 1; return a.x;` on both sides: with `a` and `b`
holding equal values the opaque statement gets equal text and equal reads on both sides, the reading proves them
equal, and JavaScript returns 1 on one side and the old `a.x` on the other. Sharing is made by earlier statements,
and after an opaque change it is unknown to every later exact one (`arr.push(1)` after an opaque `x.child = arr` is
lost from `x`). A per-statement step would need the sharing as an input, and the value reading has no term for it.

## The construct: the unit's block

For a unit with a graded finding (a lint finding of the family, or a translator refusal of the family, which the
translator records and retries), the block is the unit's body list from its first statement that **holds a finding
or may touch a reference** to the end of the body (`blockStart`). A statement may touch a reference when it
(`heapOperation`, one walk, nested functions included):

- binds a value of a reference type (an object, an array, a function, `any`, `unknown`, a type parameter) to a name,
  by a declaration, an assignment, a pattern, a for-of or a catch binding;
- writes a field or an element, deletes, updates a field (`x.f++`), writes a loop target;
- hands a reference to a call or a constructor (an argument or a spread), calls a method on a reference held by a name
  of the unit, calls a function value of the unit, calls `super`;
- builds a closure (a function or a class expression: it may do any of these later);
- runs a declared accessor, converts an object implicitly (`+`, `<`, a template hole, unary `+ - ~`, an object key),
  spreads or iterates a reference, or yields.

The statements before the block are read exactly, as before. None of them changes an object or binds a reference,
so when the block starts every object is as the caller handed it and no local holds one.

The step: one bodiless function per block, `ext_block_opaque_<sha1>_..._calls_<callees>(World, [self], reads...)`
returning `(World, result, outputs...)`:

- **id**: sha1 over the block's tokens (comments and layout are not part of it, every literal is), the unit's
  parameter list, and the code each statement of the block reaches (reach.mjs `keyText`: the same-file functions it
  calls, the module bindings it reads, transitively), and for a callback unit the enclosing function's text (its
  captured inputs share what that function made them share). The same-file callees are also listed (`// CALLS`), so the
  theorem refuses a block whose callee differs, as for every opaque block.
- **reads**: every name of the unit the block mentions (freeVars), `this` when it mentions it, the world.
- **writes**: the world, and every parameter of a reference type the block mentions (and a free function's `this`):
  these become outputs of the unit (`mutatedOf`, through the `extraOutputs` hook of `mutationAnalysis`, so a caller
  that passes a name takes the new value back, transitively). No other name is live after the block: it runs to the
  end of the unit.
- **control**: a `return` inside is the result channel, `Option<R>` (None: the block fell off the end, which the unit's
  own end reading then takes) unless the block cannot fall through (it always leaves, or the unit's result type admits
  no `undefined`: TypeScript refuses a path that ends without a return there), then `R`. A `throw` is the world's fault
  channel: in a unit that may throw, the fault is tested after the step and leaves the unit as the unit's throws do
  (`opaqueCompletion`). A `break` or `continue` cannot leave the block (no loop is around a function body's top level);
  one inside a loop of the block is the block's own control. A loop inside the block is inside the one step: its
  iterations are the block's.
- **the world**: the block is an outside call for its callers (`reachesOutside`), so a caller's read of an object it
  handed the unit after the call reads the object as the world holds it (read-after-call), and the block's own reads
  after an effect are its own business.

The certificate lists each step (`lanes.A.opaque: [{ rule, line, id, reads, writes, construct: "block" }]`, from the
translator's `// OPAQUE` line of each side); the PR table counts them.

## The soundness argument

The claim lane A proves is unchanged: on every input and every reading of the bodiless functions, parent and candidate
return the same value and make the same transitions in the same order. An opaque block is the effect axiom applied to
the rest of a unit: `effect(world, block_id, reads) = (world', result, outputs)`.

1. At the block's start the real state of each side is determined by the inputs (the parameters, two by two
   distinct trees: the value reading's axiom), the values of the unit's names (all of primitive type, or parameters),
   and the world: the statements before it bind no reference and change no object (heapOperation), and every effect
   they make is a transition, recorded in the world term. So the value reading of them is exact, and equal values of
   the block's reads on both sides are equal states, sharing included (nothing is shared yet).
2. The block's real behaviour is a function of its code and that state. Its code is its text plus the code it reaches;
   both are in the id (and the callees in the theorem's guard). Equal ids and equal reads are therefore the same code
   from equal states, which runs the same: the same result, the same final objects, the same world.
3. Everything observable after the block is among its outputs: the result, the world (every effect, every fault, every
   object it handed the outside), and the parameters' objects (the caller's view of what it handed in). A name it
   does not mention cannot be reached by it: no local holds a reference at its start and the parameters are apart.
4. So when the two sides have equal ids and equal reads, the two real runs agree on everything the theorem observes,
   and the bodiless function, the same on both sides, gives equal outputs: the lemma's equality is true. When the ids
   differ (a change inside the block) the two calls are of two functions and nothing equates them: never PASS-proved.

The over-approximation in reads (every mentioned name) and writes (every mentioned reference parameter) costs proofs,
never soundness. The one way to a false proof is a missing read: a value the block depends on that differs between
the sides while the reads are equal. The pairs' `--break` (`LEAN_OPAQUE_BREAK=drop-read`) drops one read and must
turn a changed read into a false PASS-proved that the tests refuse.

Inherited, not new: a property read of a value the file did not declare an accessor on runs no code (the value
reading's assumption), and the outside runs file code only through values handed to it (reach.mjs).

## A defect found on the way

The existing opaque block's id (`opaqueStep`, try/loop/switch blocks) normalised its text with
`.replace(/\/\/[^\n]*/g, '')`, which cuts a string literal at `//`: `fetch("http://a")` and `fetch("http://b")` were
one symbol, so a changed URL inside an opaque loop could be proved equal. The id is now the construct's tokens
(`opaqueText`), shared by every opaque block (pair `opaque_block_text`).

## What is not graded

A generator unit (its yielded sequence is an output the block would have to carry) and the default proof shape
(without `--core`) keep the refusal. A finding of another family inside the block still refuses (those rules are
other lanes').

## The measurement

See `lane/w1a-opaque-mutation-result.md`: per rule, the units each stopped before and after on three census roots,
and the entered count; the pairs `opaque_<rule>`, their `--break`, conformance on them.
