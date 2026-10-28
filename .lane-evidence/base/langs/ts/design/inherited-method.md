# A base method's call is a transition named by the code that decides it

The construct: inside a class method, a call that runs a method a base class declares, in this file or another:
`this.m(args)` where the unit's own class has no `m` (`EnhancedPluginNode extends AbstractNode`,
`this.replaceVariablesAndExtractText(...)`), `super.m(args)`, and `super(args)` in a constructor. Lane A read each as
a bodiless transition named by the receiver and the method only (`<Receiver>_m`, `super_<Receiver>_m`,
`super_init_<Receiver>`): the same name on both sides whatever the base said. For `this.m` the cell audit then held the
read as an obligation, so a draft identical to its parent was ASK:obligation; for `super` nothing held it, so a changed
base could be proved equal whenever lane B missed the difference.

## JavaScript meaning

`this.m(args)` reads `m` on the receiver; not an own property, so the prototype chain supplies the first class
prototype defining it (ECMA-262 13.3.2, 10.1.8.1); the call runs that body with `this` bound to the receiver (10.2.1).
`super.m(args)` starts the lookup at the home object's prototype (13.3.7) and binds `this` the same way. `super(args)`
runs the parent constructor, its field initializers and its own `super` (15.7.14). Inside the body, a call on `this`
dispatches again from the receiver, so an override below the base runs.

## The reading

One invariant: a transition's name covers every piece of code that decides it. `reach.mjs`
`reachOf.inheritedKeyText(call)` resolves `m` with the checker (on `this` or `super`); it must be one method with a body
on the receiver's `extends` chain above the receiver's class. The key joins the base method's reach in its own file
(`makeReach` on that file), the reach of every method or accessor its code runs on `this` or `super` in any file (a
grand-base in a third file included), and every member below the base (the classes from the receiver's class up, and
subclasses of it in this file) that overrides a name the code uses, since that override is what runs. `this.m` and
`super.m` resolving to one method get one name, `<Receiver>_m_of_<Base>_<sha256 of the key, 16 hex>`.
`reachOf.superInitKeyText(cls)` keys `super(args)` by the text of every class above the receiver's, so the name is
`super_init_<Receiver>_<sha256>`. The key is code text, not a path: two checkouts of one tree give one key, and a base
edit the call never reaches keeps it.

```dafny
var (wld, t0_) := ext_call_args_Ext_Item_label_of_Base_09c859d298251e42_World_Ext_Item_string(wld, self, s);  // both sides
// super.stamp, stamp changed in the candidate's base: ..._stamp_of_Base_3ebdb0131cc9c05e_ against ..._a9a5df2153727216_
```

## When the read is also the receiver's state (`admitted`), and what stays an obligation

The caller keeps its receiver's fields as values or world cells it knows. The transition may stand for the receiver
afterwards only when the base code (the method and every method or accessor it runs on `this`) writes no member of
`this`, calls no mutator (`push`, `set`, `sort`, ...) on one, hands out neither `this` nor a non-primitive member of it,
reads no computed member, uses no `super`, calls no function held in a field, runs no body-less member, and names no
member overridden below. Then the `this.m` read is modelled. Otherwise the name is still keyed (a changed base is never
equal) and the read stays an obligation: the `this` cell for `this.m`, a `super m` cell for `super.m`, so check.mjs
says ASK:obligation. A shared wrong model is what this prevents: `const xs = this.list(); xs.push(a)` against no push.
`m` a field holding a function, or a declaration-file method: the old unkeyed name and the old obligation.
No lint change, no escape fixture.

## Soundness

Cases considered: the base method changes (key differs); a helper it calls on `this` changes (in the key); a grand-base
in a third file changes it (two keys); the receiver overrides a member the base calls (the override joins the key; not
admitted); `super.m` with `m` changed (two keys); the base writes `this.count` or returns `this.items` (not admitted).
Assumptions, stated: an instance of a subclass declared in another file may override `m` or a member it uses, as the
same-file method reading assumes; the base file's own imports are the outside, as every import of the unit's file is.

## Lane B

Unchanged: it imports both modules, so the candidate's base file runs as written.

## Measurement

Pair `inherited_method`: render, stamp, show WITNESS; tag, title, note PASS-proved; next ASK:obligation. Ten-mutants
rows 22 to 24, the identical draft, and the before/after name sweep over every pair file: the lane report.

Instances (nexus-1130 tree, `workflow-node-executor/nodes/`): `EnhancedPluginNode.ts:40` (admitted),
`BranchingNode.ts:28`, `AIPassiveSatisfactionScoreNode.ts:86` and `:113`, `AITaskNode.ts:83` (the same base method of
`Abstract.ts:76`); `EnhancedPluginNode.ts:228` `this.generateInput` is keyed and not admitted
(`recursiveFillInputWithContext` calls `this.hasVariable`, an arrow held in a field).
