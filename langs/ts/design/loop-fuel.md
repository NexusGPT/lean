# Loop fuel: a recursive call inside a loop helper

The construct: a function on a recursive cycle whose recursive call sits inside a loop, the usual walk of a tree:

    export function total(n: Node): number {
      let t = n.v;
      for (const k of n.kids) t = t + total(k);
      return t;
    }

## Its meaning

ECMA-262 runs the loop body once per element (14.7.5.7, ForIn/OfBodyEvaluation) in the same function activation: the
recursive call `total(k)` inside the body is an ordinary call made by `total` itself, one level deeper than the
current call. Nothing about the loop changes the depth of the call stack.

## The reading

A function on a recursive cycle takes a fuel (SEMANTICS, Recursion): every call on the cycle passes `fuel - 1`, and at
zero the function yields the uninterpreted out-of-fuel value. The translator writes a loop as a helper function of its
state (`coreLoop`). Before this row the helper's body passed `fuel - 1` without binding `fuel` (a Dafny resolution
error, so the whole file was not proved). The reading: the loop helper of a unit that takes a fuel takes that fuel as
its first const parameter, the same value at every step; a call in the body passes `fuel - 1` exactly as the unit's own
body does. The helper requires `fuel > 0` (it is called only from the unit's branch where the fuel is not zero) and
decreases the fuel first, then its own measure, so Dafny checks the mutual recursion of unit and helper terminates:
the unit (`decreases fuel`) calls the helper on the same fuel and a smaller tuple, the helper calls itself on the same
fuel and a smaller measure, and calls the unit on a smaller fuel. One predicate, `fuelInScope` beside `fuelArg`, says
when the fuel is bound, so the call site and the helper agree by construction. The async iterator helper takes the
fuel the same way (`asyncIteratorLoop`). From the pair `recursion`:

    function total_loop0_parent(seq0: seq<Node>, idx0: int, fuel: nat, t: int): int
      requires fuel > 0
      requires 0 <= idx0 <= |seq0|
      decreases fuel, |seq0| - idx0
    {
      if idx0 >= |seq0| then t
      else (var k: Node := seq0[idx0]; var t: int := t + total_parent(fuel - 1, k); total_loop0_parent(seq0, idx0 + 1, fuel, t))
    }

## Soundness

- The fuel is one more const parameter of the helper, like any free variable of the loop: the helper computes what the
  unit's body computes, and a call passes the same `fuel - 1` it passed before; only the binding is new.
- The precondition and the termination measure are checked by Dafny at every call, never assumed; a helper reached on
  a zero fuel would be a verification error, not a proof.
- Running out of fuel stays the same uninterpreted value on both sides, and the theorem's induction premise (a callee
  on the cycle admitted only on a smaller fuel) is unchanged: `spec/theorem.py` is not touched.
- A unit not on a cycle gets no fuel and its helpers are written as before, byte for byte (measured below).

## What stays out

The theorem writes no induction over a loop helper, so two helpers that differ (each calls its own side's unit) are
not proved equal by the bodies alone: `total` in the pair reaches Dafny and is `ASK:unproved`, lane B PASS-bounded. A
refactor proves when the two helpers are the same text (`heap-stage4.md`, "Two different bodies are two recursive
functions"). The lint is unchanged: it already admitted the construct; the defect was the translator's alone.

## What lane B sees

Lane B runs the real JavaScript; recursive record shapes are unfolded to depth three, so the walk runs over trees of
kids. `depth` (step `+ 1` to `+ 2`) is a WITNESS on a node with one kid.

## Measurement

Pair `recursion`, before: `dafny verify` on the parent, `2 resolution/type errors detected`. After: both sides
`finished with 4 verified, 0 errors`; check.mjs `total` PASS-bounded (lane A `ASK:unproved`, Dafny reached),
`depth` WITNESS.
