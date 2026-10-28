# Object methods, class accessors and receiver record paths

JavaScript creates method functions on an object without executing their bodies.
A property call supplies that object as `this`; a getter read executes the getter,
and a setter assignment executes the setter. A nested assignment evaluates its
receiver before the right-hand side and changes the leaf of that receiver.

## Reading and boundary

An inferred literal with named methods is a record with function-valued fields.
Pure straight-line scalar methods close over snapshots of the literal's data
fields; `this.count` reads that snapshot. Other methods remain opaque functions
keyed by source, captures and data fields; calling one is a world transition.
All method texts and sibling closure values enter opaque method keys, so changing a
sibling or its captures is observable.
Literal methods may not mutate their receiver, and named writes to a literal's
fields are refused as `object-method-mutation`. This chooses immutable literals
over another heap representation. Fixed literal getters are lazy function fields:
property reads invoke their lambda or opaque transition. Literal setters remain
refused. Detached methods, spreading/destructuring method objects, reference-valued
literal `this` reads and sharing named handlers are refused by the same mutation
rule; inline handlers can still be passed to libraries. Mutable captured bindings
and captured records written by the enclosing unit are refused as `object-method-capture`.

Class accessors are units `C.get_total` and `C.set_total`. Property reads and
writes call those units, including `this.total`. Getter purity follows its body;
setters thread the world. A getter body outside the subset keeps an opaque
source-sensitive accessor fallback for callers that already had a reading. Its
key contains the file text in bounded chunks, covering opaque sibling dependencies
without constructing one enormous Dafny string.

A nested `this.stats.n += 1` reads stats once, updates the record, then writes:
```
var (wld, stats) := ext_Ext_C_get_stats_World_Ext_C(wld, self);
var (wld, ignored) := ext_Ext_C_set_stats_World_Ext_C_Stats(
  wld, self, stats.(n := stats.n + 1));
```
Deeper declared record paths rebuild every ancestor. Optional paths, class
instances, callable-bearing records and opaque handles stay `receiver-mutation`.
The value axiom is explicit: the field contains a record value with no other
observable alias. Rebuilding that record changes exactly its leaf. A class or
opaque handle has identity and cannot use this argument. A getter-valued container is also refused: updating its returned value is not a
write to the getter itself. The right side runs after the field read; effectful right sides retain that order.
When an update is a value, prefix yields the new leaf and postfix the old leaf;
the captured record is reused for the write. Setter assignment values call the setter unit.

## Soundness and both lanes

A method reading count after another method changes count must never see an old
snapshot. Receiver mutation is refused even inside an opaque method body. A
method's closed-over changing binding cannot be read as a pure snapshot either;
exact methods require stable scalar captures, with broader bodies opaque.
Accessor calls enter dependency discovery, effect propagation and recursion fuel,
so an unchanged caller of a changed getter is not aliased by the theorem.
Throwing accessor units propagate the world fault through reads, writes and catch.
Numeric opacity follows getter and setter dependencies before callers observe special values.
Suspended generator keys include both getter and setter bodies for accessed properties.
Opaque handler and promise-executor identities likewise retain those accessor bodies.
Rebase integration preserves opaque deep-union fallback and narrowed field projection.
Lane B executes real object methods. Getter units read the property on a proxy
with the real prototype and typed fields; setter units assign it. Descriptors
are inspected without invoking a getter during unit selection. A fresh instance
wrapper tests nested-write refactors without the fake receiver's extra set trace.

## Census instances inspected

All paths below are under
`/Users/assem/nexus/nexus-organisation/work/unreviewable-throughput/legit/round7/lean-v3/census/repos/`.
- `agent-nexus/packages/cli/src/command-universe/build-node.ts:93`: buildNode's
  memoizing literal getter stays outside (captured mutation).
- `agent-nexus/packages/cli/src/command-universe/derive-projections.ts:74`:
  deriveCommandNamespaces has a deferred literal getter; other unsupported forms
  can still stop its enclosing unit.
- `apps-ui/src/hooks/useDebouncedSave.ts:11`: createDebouncer's mutable closure
  stays refused by closure rules, never an exact lambda.
- `apps-ui/src/lib/dragVerbs.ts:90`: armDrag's listener methods are opaque
  function values; their outside calls run only when invoked.
- `agent-nexus/packages/cli/src/util/sse-decode.ts:70`: consumeLine's existing
  whole-field writes keep their world reading.
