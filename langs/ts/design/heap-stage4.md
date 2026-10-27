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
