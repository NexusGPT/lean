# The heap core agreed when a refactor inlines a callee

The construct: a refactor that inlines a same-file callee into its caller and drops the callee. The parent's
`rename(user, name)` calls `setName(user, name)`; the candidate writes `user.name = name` itself and no longer defines
`setName`. The same for a method: the parent's `Counter.tick` calls `this.advance()`, the candidate inlines it.

## What went wrong

The heap core (references, layer 2; `translate/heap.mjs` `plan`) holds a unit only with all its same-file callees,
and a unit in the core has another Dafny signature (`(hw_: HWorld, user: Ref, ..) -> (HWorld, ..)`) than one outside
it. So the two sides must agree which units are in the core. Both runners agreed it by passing one side's `// HEAP:`
list to the other as `--heap-units`, an allow-list: the parent put `rename,setName` there, the candidate (no
`setName`) put `rename`, and the parent, retranslated with `rename` alone, dropped `rename` (it calls `setName`,
now outside). The theorem then refused `rename: hypothesis differs between parent and candidate`, which `check.mjs`
reports as `ASK:interface` (heap-stage4.md, row 1), for a free function and for a method alike.

## The reading

The core is agreed on the units BOTH translations hold. Those are the units the theorem compares (it writes a lemma
for a unit the scope lists, and the scope lists units both sides define), so each of them is in the core on both
sides or on neither. A unit one side holds alone (a callee inlined away, a helper only one version calls) has no
counterpart and no lemma: it takes the core when its own side puts it there, and its callers on that side read its
body as written. `check.mjs` `agreeCore`, used by `check.mjs` and by the pair runner (`tests/run.mjs`), does it:

1. the parent is translated free; the candidate may put in its core what the parent put there, and any unit the
   parent's translation does not hold;
2. the shared units' core is the intersection of the two cores; each side is retranslated with that intersection
   plus the core units it holds alone, until the two agree on the shared units (each narrowing removes a unit, so the
   rounds end; the old runners stopped after one retranslation of the parent);
3. EFFECTFUL keeps its agreement as before (the candidate takes the parent's list, the parent then the candidate's).

A unit is held when its translation wrote its `// CELLS <name>:` line (every emitted unit has one, written once the
unit is read), under the translator's Dafny name (a Dafny keyword takes a trailing underscore).

For `rename` the parent keeps `// HEAP: Counter.advance,Counter.tick,bump,nameOf,rename,setName,visit`, the
candidate `// HEAP: Counter.tick,nameOf,rename,visit`, and the lemma unfolds the parent's helper:

```
function rename_parent(hw_: HWorld, user: Ref, name: string): (HWorld, int)
{
  var (hw_, c0_) := set_name_parent(hw_, user, name);
  (hw_, Get_R_08e026b2_visits(hw_, user))
}
function rename_candidate(hw_: HWorld, user: Ref, name: string): (HWorld, int)
{
  var hw_ := Set_R_08e026b2_name(hw_, user, name);
  (hw_, Get_R_08e026b2_visits(hw_, user))
}
```

## Soundness

The reading changes no translation of a body and no lemma: it changes which units enter the core, and only for a
unit one side holds alone. Inside a side the core stays closed under calls (`plan` removes a unit calling outside the
core and a unit called from outside it), so every call in a side's Dafny meets the callee's own convention, and the
callee's body is read exactly. The theorem still compares every shared unit's hypothesis and signature: if the
agreement ever missed a shared unit (a held unit not recognised), the two signatures would differ and the theorem
would refuse, an ASK, never a proof. The extracted-helper mirror (the candidate alone defines a callee) still stops at
the theorem, which refuses a candidate function the scope does not list; that file is not this lane's.
A changed inline is not proved: `visit` inlines `bump` with a step of 2 for 1, and `Equal_visit` and two canonical
parts fail (lane B WITNESS).

## What lane B sees

Nothing new: lane B runs both files as JavaScript, so the inlined callee is simply the candidate's code; the pair's
four units reach PASS-bounded, WITNESS, PASS-bounded, PASS-bounded.

## Measured

Pair `inline_callee`: `rename` (setName inlined, proved), `visit` (bump inlined with another step, not proved,
WITNESS), `nameOf` (untouched, proved), `Counter.tick` (the method advance inlined, proved). `check.mjs` on the base
(e0eceda): `rename` ASK with `ASK:interface`, `Counter.tick` ASK with `ASK:interface`; after: PASS-proved, WITNESS,
PASS-proved, PASS-proved. The census does not move: it imports the lint and `common.mjs` only, neither touched.
