# A free function writing its declared receiver

The construct: `function bump(this: Tally, k: number) { this.n = this.n + k; this.meta.hits++; return this.n; }`,
called as `bump.call(t, 2)` or `bump.apply(t, [2])`. Since the this-receiver lane a free function's declared `this` is
its first operand, read as a whole value or through its fields. A write through it passed the lint (the lint treats
`this` as the parameter it is) and the translator failed on it (`receiver-mutation`), so lint and translator disagreed.

## The JavaScript meaning
A function's `this` parameter is a TypeScript annotation only (it is erased); at run time `f.call(o, a)` binds the
function's this value to `o` (ECMA-262 20.2.3.3, OrdinaryCallBindThis in 10.2.1.2, strict code: no coercion). `this.n =
v` is then PutValue on a property of the object `o`: the object the caller passed changes, exactly as `p.n = v` changes
an object passed as an ordinary parameter `p`.

## The reading
The receiver is the parameter `this` of the unit (`dn('this')` is `this_` in Dafny), and a write through it is the
existing references reading (layer 1, `mutatedOf`): a parameter the function changes is an output returned beside the
result, starts as the argument, and is rebuilt by each write; a caller that passed a name takes the new value back.
The same machinery now sees `this` everywhere a parameter name is followed: the syntactic mutation scan (`own` in
`syntacticMutations`), its propagation across same-file calls including `h.call(o, a)` and `h.apply(o, [a])`
(`receiverCallArgs`, which orders the arguments as the call reading binds them), the path rebuild (`pathUpdate`, never
the class method's world field), the loop state (`assignedOutside` carries `this` and every name a changing call is
passed), mutator calls on a container field (`this.xs.push(v)`), and `this` passed on to a function that changes it.
`h.call(o, a)` on a same-file unit takes that unit's effect flag (it was always a transition before).

`hit` of the pair `receiver_write` (parent); its caller `hitTwice` binds `var (t0_, t0_m0) := hit_parent(t); var t := t0_m0;`:

```dafny
function hit_parent(this_: Tally): (int, Tally)
{
  var this_ := this_;
  var this_: Tally := this_.(meta := this_.meta.(hits := this_.meta.hits + 1));
  var this_: Tally := this_.(n := this_.n + 1);
  (this_.meta.hits, this_)
}
```

## What stays refused
`receiver-write` (lint; the translator fails with the same name): a write through the declared `this` when the
receiver, or a container on the path to the written field, is not a nonoptional data record: a class instance (its
fields are a method's world, not a value), an array, a dictionary (`delete this[k]` too), an optional or union value,
a type parameter or `any`, or a record holding functions or accessors. The predicate is `thisParamPath` in
`common.mjs`, shared by both sides; it is the method rule for a receiver path (`receiverRecordPath`) applied to the
receiver itself as well. Unchanged by name: `this.f ??= v` (property-assign), a write inside a non-loop callback
(closure-mutation), `const self = this; self.n = v` (alias-mutation, now: `self` is another name for the receiver),
`delete this.f` (delete), a changing `h.call(o)` under a branch (conditional-effect, which now follows `call`/`apply`).

## Soundness
Cases where a wrong reading proves different things equal, and why this one does not:
- a write the model drops: `for (const y of ys) this.n += y` and `ys.forEach((y) => { this.n += y; })` translated
  with the loop's write lost before this lane; the loop state now carries `this`. The same scan also missed an
  ordinary parameter written in a loop callback and a name passed to a changing call inside a loop
  (`for (...) addP(t, x)`, the whole loop was dropped): fixed for every parameter, not only `this`.
- an alias: `const self = this; self.n = 5; return this.n` read the old value; refused as alias-mutation.
- a branch: `x > 0 ? bump.call(c, 1) : 0` bound the new `c` inside the branch only; refused as conditional-effect.
- a caller: `useBump(c) { bump.call(c, 2) }` did not make `c` an output of `useBump`, so its own caller kept the old
  record; `.call`/`.apply` now propagate.
- identity: the receiver is a value; two receivers sharing a nested record are outside the stated axiom (two
  parameters are distinct objects), as for every parameter. The theorem's identity guard records the nested write
  (`GUARD ... "writes":["@this.meta.hits:=."]`), so writes reordered across nesting levels are withheld.

## Lane B
Lane B calls the unit as `f.call(args[0], ...rest)` (exec/run.mjs) and observes the argument graph after the call,
so a receiver write with an unchanged result is a WITNESS (pair unit `mark`).

## Instances (census, read in place)
- n8n `packages/cli/src/push/websocket.push.ts:8` `heartbeat(this: WebSocket) { this.isAlive = true; }`: refused,
  receiver-write (an imported handle, `any` without the project). The only write through a declared `this` the scan
  of 306 such functions found (a text scan of `census/repos` and the n8n bench tree).
- langchainjs `libs/langchain-core/src/load/index.ts:221` `reviver(this: ReviverContext, ...)`: reads only, unchanged.
- n8n `packages/core/src/DirectoryLoader.ts:28` `toJSON(this: ICredentialType)`: reads only, unchanged.
- n8n `nodes-base/nodes/Microsoft/Teams/v2/actions/channel/update.operation.ts:47` `execute(this: IExecuteFunctions,
  i)`: no write through `this`; this reading does not touch it.
- agent-nexus `packages/sdk/src/browser-fetch-receiver.test.ts:46` `domLikeFetch(this: unknown)`: a nested function,
  not a unit.
- nutshell `tools/proof-host/src/chat-sweep-message-scenarios.ts:255`: a function expression stored on a prototype,
  not a unit.
