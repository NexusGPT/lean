# The heap core, stage 4: real code

Stage 2 built the heap core (`translate/heap.mjs`, `design/heap-layer.md` "Stage 2"); stage 3 the canonical certificate
(`design/canonical-heap.md`). Stage 4 widens the core's syntax in the order of the census's first reasons, keeping its
invariants: every heap read and write is a total prelude function; no unit body carries a proof obligation; the lemma
ranges over well-formed heaps (`// HYP`); equality is of the result and the whole final heap (or the canonical parts).
One section per row. Reach: `design/heap-core-census.mjs` over the 39 census roots, modules unresolved; each section
quotes its run. Baseline at the stage-4 base (607de20): 46 of 53,866 units in the core.

## 1. Methods with `this` fields

Reading: a class of the file is a record of its instance fields (declared or constructor parameter properties), the
shape a type alias of those fields would have. An instance method is `(hw_, this_: Ref, params) -> (HWorld, result)`
with `Is<K>(hw_, this_)` in its HYP; `this.f` is `Get_<K>_f(hw_, this_)`, `this.f = v` is `Set_<K>_f`, `this.m(a)` is
the core call `<class>_m(hw_, this_, a)`. A method called on another instance or named as a value is a call-graph edge.
Dafny: `var hw_ := Set_R_edc5963e_count(hw_, this_, (Get_R_edc5963e_count(hw_, this_) + 1));` (pair `heap_methods`).
Soundness: methods live on the prototype, so the cell holds exactly the fields, and a plain record of those fields may
be the instance itself (one constructor; the lemma ranges over that sharing). A field is initialized at its declaration
or by a top-level `this.f = ..` of the constructor, so no well-formed heap holds a field the program leaves undefined.
`this.m()` runs the declared method: a class that extends, is abstract, generic, decorated or extended in the file stays
out (an override would run other code); a subclass in another file is the ordinary lane's own assumption.
Lane B: twelve programs per method on a constructed instance; receiver fields are traced, so a refactor keeps the order
of its field reads. Out: constructors, accessors, static methods, `class: <why>`. `check.mjs --only` cannot agree the
core when a refactor inlines a same-file callee (`ASK:interface`, the base does the same on a free function).
Reach: 46 -> 94 of 53,866 units. The method bucket (21,519) splits: abstract or decorated class 8,618, constructor
4,379, extends a class 3,465, a field without a shape 1,703, static 906, accessor 842, a field not initialized 568.

## 2. Array element access

Reading: `a[i]` on an array path, `i` a number, is `Idx_<K>(hw_, a, i)` after `var hw_ := Oob_<K>(hw_, a, i)`;
`a[i] = v` is `SetIdx_<K>`. All three are total: in range they read or replace the item; out of range `Idx_` reads
the default and `Oob_`/`SetIdx_` set the world's new `oob` flag, leaving the heap as it is. A write target is
evaluated in JavaScript order: receiver, index, the right side, the store (a compound write reads the target first).
Soundness: out of range JavaScript reads `undefined` (and a write makes a hole or a property), which no element value
models; a default alone would prove `a[i] + ""` equal to `a[i]`. So `WF` requires `!oob` on entry, every unit that
indexes (itself or through a callee) carries `// INRANGE <unit>`, and its lemmas, whole and canonical (part
`inrange`), also require that neither side sets the flag. Equality is proved only where the code keeps its index in
range (a length test, a loop guard); an unchecked index is `ASK:unproved` even when both sides read it alike, and lane
B decides. A text-identical unit is aliased and needs nothing.
Out: an index in a real file, a negative literal index, `?.[ ]`, an access inside a callback, a non-array receiver.
Pair `heap_index`: `first`, `setFirst` under the length test (proved); `get` unchecked (unproved, PASS-bounded);
`label` (`a[i] + ""` for `a[i]`, unproved, WITNESS at index -1); `bump` (WITNESS); `size` (proved).
Reach: 94 -> 95 (element access was the first reason of 44 units; loops and other reasons hold the rest).
