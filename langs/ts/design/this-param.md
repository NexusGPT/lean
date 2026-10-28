# A free function's declared `this` parameter is its receiver

The construct: `function f(this: Ctx, x: number) { ... this.base ... this.fetch(x) ... }`, TypeScript 2.0's this
parameter. It is a type annotation only: the emitted JavaScript has no such parameter, and the receiver is the value
the call binds (ECMA-262 10.2.1.2 OrdinaryCallBindThis: `o.f(x)`, `f.call(o, x)` and `f.apply(o, [x])` bind `o`).
TypeScript checks every call site against the declared type, so inside the body `this` has that type.

## The reading

The translator already read the declared receiver as an ordinary first operand named `this_` (`thisParamOf`, the
`this` case of `expr`, the call shaping in `unitArgs`, the writes in `receiverRecordPath`/`thisParamPath`). What
crashed was every place that asked for the receiver's type through the class: `selfType(u)` read `u.cls.name`, and
`u.cls` is null for a free function. The three places that capture `this` into one transition did so: an opaque block
(`opaqueStep`, a loop with no bound, a `do ... while` over an outside source), an opaque promise executor, and the
captures of a handler call read as one transition.

- `selfType(u)` of a unit with no class is the Dafny type of its declared `this` parameter, the same `dtype` the
  parameter list gives it; a unit with neither a class nor a `this` parameter fails as `this` (the lint's rule).
- `selfValue(u)` is the receiver's Dafny value: `self` in a class method, `this_` in a free function. The three
  capture sites pass `selfValue` where they passed `self`.
- A counted loop read as a recursive helper takes `this_` as a const operand when its body reads the receiver, as a
  method's loop takes `self`; a loop that writes the receiver already carries it as loop state.
- In an opaque block that writes the receiver, `this_` is already an input and an output (`assignedOutside` carries
  it as a written parameter), so it is not passed a second time.

`function climb(this: Ctx, x: number) { let i = x; while (i < this.base) { i = this.next(i); } return i * 2; }`:

```
function climb_parent(wld: World, this_: Ext_Ctx, x: int): (World, int)
{
  var i: int := x;
  var (wld, i) := ext_block_<hash>_World_Ext_Ctx_int_int(wld, this_, i);
  (wld, i * 2)
}
```

A field of the receiver is a read of the operand (a record field, or an uninterpreted read on an opaque interface
type); a method of the receiver is an outside call on the operand, a world transition, as for any parameter whose type
is an interface. A same-file call through `f.call(o, x)` is the call with `o` as the first operand (`unitArgs`); this
lane changes nothing there.

## What stays refused

`this-param` (one predicate, `untypedThisParam` at the end of `common.mjs`, in the lint's unit loop and at the head of
`emitUnit`): a `this` parameter typed `any` or `unknown`, or declared without a type. Such a function is a method of
no type: the receiver is whatever the caller binds, so nothing keys its fields or methods. Escape:
`fixtures/escapes/ts/this_param.ts`. `this` in a free function that declares no receiver stays `this` and
`implicit-this` (TS2683), as before.

## Soundness

- A wrong receiver type would let two sides read different receivers as one: the self type is the declared type on
  both sides, and the operand is the same parameter, so a block is the same transition only when its text, its callees
  and its operands are the same.
- A write to the receiver inside an opaque block is an output of the block (`bump`), so a candidate that reads the
  field before the block (`bumpRead`) is not proved: the pair holds that case.
- A method of the receiver is a transition: calling it twice is two transitions, never folded into one.

## Lane B

`exec/run.mjs` binds the receiver as the first generated argument (a fake for an interface, a record for a record),
so field reads and method calls are recorded on the trace: `shifted` is a WITNESS on `arg0.base` against `arg0.offset`.

## Measured

Pair `this_param` (9 units), the 41 n8n units that crashed in selfType, the sweep of every pair side and the census
before and after: in `harness/lanes/this-param.md` of the round's harness.
