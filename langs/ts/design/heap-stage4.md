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

## 3. Loops over arrays

Reading: `for (const x of e)` and `for (let i = 0; i < a.length; i++)` (`++i`, `i += 1`, `i = i + 1`) over an array
name are a helper `<unit>_loop<n>(hw_, [a], k, n, carried.., free..)` with `decreases n - k`: it stops when
`!(k < n && k < Len(hw_, a))`, else binds `x := Idx_(hw_, a, k)` (for-of), runs the body and calls itself at `k + 1`.
`n` is the length at entry; the carried locals (outer locals the body assigns) come back in name order; the names the
body reads (and `this_`) are passed. The body takes the core's statements and an `if` that does not return (the rest
of the body is carried into both branches). For-of evaluates its expression once; the index loop reads its array name.
Soundness: JavaScript tests the current length each step; the helper tests it too, and the entry length `n` only
bounds the recursion: nothing in a body grows an array (`push`, `unshift`, an inserting `splice`, a call of a unit
that may), so the current length never exceeds `n` and the extra test is never the deciding one. The index and the
array name are never assigned in the body. An index loop's own `a[i]`, in a body that cannot shrink an array (no
`pop`, `shift`, `splice` or call), is in range by the guard: it reads and writes (`SetIdxIn_`) without the mark.
Two different loop bodies are two recursive functions: their equality needs an induction the theorem does not write,
so a refactor proves when the helper is the same text (aliased) applied to equal arguments.
Out: `break`, `continue`, `return` in a loop, `for await`, other loop forms, a body that grows an array, an assigned
loop element, an index loop in a real file. Names ending in an underscore leave the core (the generated ones do).
Pair `heap_loops`: `total` (another body, WITNESS), `raise` (its step `1 + k` for `k + 1`, proved), `positives`
(`n += 1` for `n = n + 1`, proved), `weight` (proved).
Reach: 95 -> 95; the first reason `statement` falls 309 -> 164 and own-syntax fits kept out by the call graph rise 90 -> 95: a loop was rarely a unit's only blocker.

## 4. Optional fields

Reading: a primitive that may be absent (`T | undefined`, `f?: T`, `x?: T`, or `T | null`; never both) is an `opt`
shape. As a value (parameter, local, result) it is `Option<T>`; as a stored field holding `undefined` it is
`Pres<T>` = `PMissing | PUndef | PVal(v)`. `p.f ?? d` is `OptOr(PresOpt(Get_..), d)` (`d` pure, so reading it eagerly
is exact); `x === undefined` is `.None?` (`===` across null and undefined is constant, `==` tests both); `if (x)` is
truthiness (`0`, `""`, `false`, absent). A literal omitting `f?` stores `PMissing`, `f = undefined` stores `PUndef`.
A name TypeScript narrows unwraps with `OptOr` (only its own unit writes it); a narrowed FIELD read `p.f` marks the
world through `OptMark` when absent, so its lemma (INRANGE) shows the test still holds: another name of the same
record, or a call, may have cleared it in between (probe: `v.nick = undefined` between `u`'s test and read, unproved).
Soundness: a missing key and a key holding undefined differ in the reachable graph (key presence); `Pres` keeps them
apart (probe: `{name, visits: undefined}` against the same with `nick: undefined`, unproved). Before this row a
nullable type was read as its inner type (`nonNull`), which a `x + ""` on a null could prove wrong; now absence is
either modelled or out. A literal takes the shape of the place it is written to, so its omitted fields are known.
Out: absent references (`R | undefined`), `T | null | undefined`, optional chaining, arrays or maps of optionals, a
compound write to an optional, a narrowed field read inside a callback, the truthiness of a real.
Pair `heap_optional`: `display` (`??` as a presence test, proved), `greeting` (another default, WITNESS), `pad`
(`by?` tested first, proved), `forget`, `visit` (proved).
Reach: 95 -> 103; `parameter type` rises 12,257 -> 12,450 since an absent reference is now named, not read as present.

## 5. Literal unions

Reading: `'a' | 'b'` (strings) or `1 | 2` (non-negative integers), and either with `undefined`, is its primitive with
its `values`: the JavaScript string or number itself, so comparison, concatenation and assignment stay exact. The
values enter the HYP for a parameter and for each field of a reference parameter or of `this`.
Chosen over a sum datatype: no conversion functions at every use, and the same proving power (the hypothesis states
the domain). The shape key is the primitive's, so `{state: 'open' | 'done'}` and `{state: string}` are one
constructor: one object may be seen through both types, and the lemma ranges over that sharing.
Soundness: the hypothesis is the typed program's guarantee on entry, one level deep (a field reached through an
array or a second record carries no domain: the lemma ranges over more heaps, never fewer).
Out: a union of records, of mixed literal kinds, negative or fractional number literals, enum literals.
Pair `heap_unions`: `toggle`, `mark` (the other value tested first, proved only through the domain), `weight` (WITNESS).
Reach: 103 -> 126 (units 53,866 -> 53,859: the census roots include live clones).
