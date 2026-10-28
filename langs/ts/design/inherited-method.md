# An inherited method read on `this` is a transition named by the code it runs

The construct: `this.m(args)` inside a class method, where `m` is not a method of the unit's own class but of a base
class, declared in this file or in another one (`EnhancedPluginNode extends AbstractNode` and
`this.replaceVariablesAndExtractText(...)`, AbstractNode in `./Abstract`). Lane A read it as the bodiless transition
`<Receiver>_m(world, self, args)`, the same name on both sides whatever the base said, and the cell audit marked the
read `this m: read without a transition`, so check.mjs said ASK:obligation even for a draft identical to its parent.

## JavaScript meaning

A call `this.m(args)` reads `m` on the receiver: not an own property, so the prototype chain is walked and the first
class prototype that defines `m` supplies it (ECMA-262 13.3.2 property access, 10.1.8.1 OrdinaryGet up the chain);
the call then runs that method's body with `this` bound to the receiver (10.2.1). So its behaviour is the base
method's text and everything that text runs, and the receiver it reads and writes.

## The reading

`reach.mjs` `reachOf.inheritedKeyText(call)`: the checker resolves `m` on the type of `this`; it must be one method
declaration with a body, on a class of the receiver's `extends` chain above the receiver's class. The key is the
base method's reach in its own file (`makeReach` on that file: the method, the members it uses on `this`, the
functions and bindings it names, the import statements, the classes a value carries out), plus, for every member it
names on `this` that a third file declares, that member's reach, recursively. The translator
(`translate.mjs`, the inherited read in the `this` call reading) names the transition
`<Receiver>_m_of_<Base>_<sha256 of the key, 16 hex>`; the cell audit counts that read as modelled.

```dafny
var (wld, t0_) := ext_call_args_Ext_Item_label_of_Base_09c859d298251e42_World_Ext_Item_string(wld, self, s);   // both sides
// format reaches pad, changed in the candidate's base: ..._format_of_Base_ff2066eff3e2d901_... against ..._7d11076d3c04cd99_...
```

The key is the code text, not the path: two checkouts of one tree give one key, and a base file edited only where
the method's run never goes keeps the key (the unrelated change still proves).

## What stays out (the unkeyed name, the cell audit's ASK:obligation)

The reading is null, with a reason, when the transition could not stand for the call:
- `m` is a field holding a function, an overload set split across classes, abstract, or declared without a body;
- a class between the receiver's class and the base, or a subclass of the receiver's class in this file, declares a
  member the base code names on `this` (the base would run that override, whose text the key leaves out);
- the base code (its own run, members of the receiver's chain) writes a member of `this`, calls a mutator
  (`push`, `set`, `sort`, ...) on one, hands out `this` or a non-primitive member of it (an argument, a return, a
  binding), reads a computed member of `this`, or uses `super`. The caller's own reading keeps its receiver fields as
  values or world cells it knows; a base that changed them behind the transition would make a shared, wrong model,
  and two different callers could then prove equal (`const xs = this.list(); xs.push(a)` against no push).
No lint change: the construct was already admitted; only the name and the audit change. No escape fixture.

## Soundness

Two sides share the transition only when the base method's run is the same text. Cases considered: the base method
changes (key differs); a helper it calls on `this` changes (in the reach); a grand-base in a third file changes the
member the base calls (`gpad` probe: two keys); the receiver overrides a member the base calls (`pad`/`word`: null);
the base returns `this.items` and the caller pushes into it (null); the base writes `this.count` (`bump`: null). The
receiver at run time may be an instance of a subclass declared elsewhere that overrides `m` or a member it uses: the
same assumption the reading of a same-file method call makes (`fns.get(Class.m)` is called directly). The base
file's own imports stay the outside, as every import of the unit's file is: the world they act on is threaded.

## Lane B

Unchanged: it imports both modules, so the candidate's base file runs as written; `render` witnesses through the
changed `pad`; `show` witnesses through the changed override `word`.

## Measurement

Pair `inherited_method` (candidate imports `base_next.ts`): check.mjs render WITNESS, tag and title PASS-proved,
next ASK:obligation; `same.ts` (the parent copied) render and tag PASS-proved, show and next ASK:obligation. The
ten-mutants rows 22 to 24 and the identical draft: the lane report.

Instances (nexus-1130 tree, `workflow-node-executor/nodes/`): `EnhancedPluginNode.ts:40` (enters, see the report),
`BranchingNode.ts:28`, `AIPassiveSatisfactionScoreNode.ts:86` and `:113`, `AITaskNode.ts:83` (the same base method
of `Abstract.ts:76`: they enter on the same terms).
