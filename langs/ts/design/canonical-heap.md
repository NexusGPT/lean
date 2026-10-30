# The canonical heap: equal up to a renaming of fresh cells and up to dropped allocations

Status: built 2026-10-27 (`translate/heap.mjs` prelude block `// CANON`, `spec/theorem.py` `EqualCanon_<f>_*`,
`check.mjs` `lanes.A.reading`, pairs `tests/pairs/heap_canonical` and `tests/pairs/library_ops`).

## Why

The proof lane reads a heap-core unit over one heap: a map from references to cells, a fresh cell at the next
address. Two runs that allocate the same cells in another order, or allocate a cell nobody keeps (`splice` returns
the removed part), end in different heaps and the same observation. The whole-heap lemma `Equal_<f>` then fails on
an equal pair. The canonical reading proves it.

## The definition (generated per shape set, in the prelude)

- `CanonOrderOf(hw, next0, roots)`: the fresh cells (reference at or above `next0`, the `next` of the initial world)
  in first-reach order from the roots. The worklist starts with the roots, then the fields of every root that is an
  initial record (`CanonRootEdges`). A fresh cell is named when first reached and its edges are appended; an initial
  cell is never descended from the worklist. An initial container is never walked (its width is symbolic); an initial
  record below a root is not either.
- `CanonName(next0, order, r)`: `r` itself below `next0`; `next0 + index in order` above.
- `CanonObj`: a cell with every reference renamed; `CanonCells`: the named fresh cells in order, renamed.
- The certificate `CanonEqual(hw0, next0, hp, rootsP, hc, rootsC)`, five parts, one lemma each:
  1. `initial`: every initial cell agrees on both sides, literally or after renaming (`CanonInitial`);
  2. `cells`: the named fresh cells agree after renaming;
  3. `roots`: the roots' names agree;
  4. `named`: no fresh reference stays unnamed, on either side (`CanonNoUnnamed`: every cell the unit wrote, and every
     named fresh cell, references only initial cells or named ones);
  5. `result`: a primitive result agrees (a reference result is among the roots instead).
- Roots: the reference parameters in order, then the result when it is a reference. `next0` is the initial `next`.

Part 4 is what makes the reading sound: a fresh cell the walk cannot reach (hooked below an initial record that is
not a root, or pushed into an initial container) stays unnamed, and the certificate fails. A different content in an
unnamed cell can never pass. Part 1 keeps the writes to cells that are no longer reachable: a leaf written then
unhooked from its box differs on the leaf itself (`tests/pairs/heap_canonical` `unhook`), as lane B sees it.

## What proves hint-free, and what it cost to learn

Every part lemma has an empty body; `{:fuel f,20,21}` on the recursive functions is the only hint. Measured on the
pair units, both lanes, one `check.mjs` run each (2026-10-27, Dafny 4.11.0):

| unit | shape of the difference | whole heap | canonical | time |
|---|---|---|---|---|
| `attach` | two fresh leaves hooked to a box, allocated in the other order | fails | proved | 5.0 s |
| `pair` | a fresh array of two fresh leaves, allocated in the other order, returned | fails | proved | 6.5 s |
| `tally` | a `slice` nobody keeps on one side | fails | proved | 4.0 s |
| `dropTwo` (library_ops) | one `splice(0, 2)` for two `splice(0, 1)` | fails | proved | 4.0 s |
| `unhook` | the unhooked leaf written differently | fails | `initial` fails | lane B `WITNESS` |
| `head`, `joined` (library_ops) | the fresh result differs | fails | `cells` fails | lane B `WITNESS` |

Four findings on the way, each a 10x or a time-out:

- A worklist of tuples `(Ref, nat)` unfolds half as fast as a datatype; a walk carrying a depth per item, descending
  initial records a bounded number of levels, timed out on `attach` at depth 1 and took 20 s at depth 4 for no reason
  Z3 shows. The root-edges walk (no depth at all) proves the same units in 5 s.
- Remembering a skipped initial cell in `seen` made a fuel of 20 cost 142 s where 10 cost 22 s; not remembering it
  (nothing of it is walked, so nothing loops) made the fuel free.
- An array literal written `[a] + [b]` proves ten times slower than `[a, b]`; the translator now writes one literal
  when nothing is spread.
- `CanonNoUnnamed` quantified over every initial cell timed out on `pair`; quantified over the cells the unit WROTE
  (the initial world is an argument; WF bounds every other cell's references below `next0`) it proves in seconds.

A seq comprehension anywhere in the walk blocks the hint-free proof: every function is recursive. A set-valued
`decreases` (`hw.heap.Keys - seen`) is what Dafny accepts for the termination of the walk.

## Limits (each an `ASK:unproved`, never a false proof)

- A fresh cell hooked into an initial container (`box.items.push({...})`) or below a non-root initial record
  (`box.inner.leaf = {...}`) is unnamed: part 4 fails. The whole-heap lemma still proves such a unit when both sides
  allocate in the same order.
- A fresh array of symbolic width (a `slice` of an initial array) that is named: its elements' names are a recursion
  over a symbolic sequence, which the prover does not unfold.
- Map cells with reference values rename through a map comprehension; untested on a pair.

## Reading the certificate

`lanes.A.reading` is `whole heap` or `canonical heap: equal up to a renaming of fresh cells and up to dropped
allocations`; `lanes.A.canonical.parts` lists the five lemmas with their verdicts; `lanes.A.lemmas` holds every lemma.
The suite reads a unit as proved when either lemma holds, and `expect.json` `canon` asserts the canonical route alone
(`"canon": {"drop_first": true}` means the whole-heap lemma fails and the parts hold).

## 2026-10-30: the walk's fuel is its bound, not a constant

**What failed.** `heap_canonical`'s theorem failed `EqualCanon_pair_cells` under the Z3 bundled with Dafny 4.11
(4.12.1), with identical text on both machines; the green runs had come from the step cache, whose key did not name the
solver (it does now: `tests/stepcache.mjs`). Unfolding the walk by hand, one `CanonOrder` step per `assert`, proves the
lemma: every step holds and the definitions are right. What fails is the solver's own unfolding at `{:fuel CanonOrder,20,21}`.

**What was measured** (`CanonOrder`'s fuel varied, the other functions at 20, both canonical pairs, Dafny 4.11.0):

| fuel | 4.12.1 | 4.14.1 | 5.3.3 |
|---|---|---|---|
| 8 and below | pair's `cells`, `named`, `roots` fail (the walk is not unfolded to its end) | same | same |
| 9 to 12 | every expected part proves | same | same |
| 13 to 19 | `pair_cells` or `attach_named` fails at 14, 16, 17, 18, 19 | at 13, 17, 18 | 15 proves (13, 14, 16 to 19 not measured) |
| 20 | `pair_cells` fails | proves | proves |
| 25 | `pair_cells`, `pair_named`; `library_ops` `drop_two_cells` | `pair_cells`, `pair_named` | proves |
| 30 | 14 errors on `heap_canonical` (9 parts beyond the expected) | not measured | not measured |

`pair`'s walk takes nine steps (two roots, the box's four fields, the fresh array's two items, the stop). A fuel below
the walk leaves it unevaluated; a fuel far above it gives the solver instantiations it gets lost in, and where that starts
depends on the solver version. The fixed 20 sat at 4.12.1's edge. Two rewrites of the walk were measured and dropped:
an index into the worklist instead of `work[1..]`, and one recursive call with its arguments chosen by the condition
(worse at every fuel). Lowering the fuel of the other recursive functions (`CanonCells`, `CanonIndex`, `CanonNames`,
`CanonRootEdges`) to the same bound cost `pair_named` under 4.14.1; they stay at 20.

**The reading.** `spec/theorem.py` `canon_walk_bound` computes, from the generated text, the steps the walk can take on
either side: one per root, one per reference field of a root that is an initial record (the parameters' shapes from
`// HYP`, a reference result's from the new `// RET <unit>: <shape>` the translator writes; the widest record when no
shape is named), one per reference of every fresh cell the unit allocates (each `Alloc_<shape>` call, directly, through
a prelude helper or through a callee unit: a record's reference fields, an array literal's items), and one to stop.
The part lemmas take `{:fuel CanonOrder,b+1,b+2}`. When the text does not bound the walk (an allocation in a recursion,
an array or map of references whose width the text does not write, a prelude function without a body that returns a
world) the fuel stays 20, as before. Measured fuels: `pair` 10, `attach`, `tally`, `unhook` 7, `library_ops` 5 to 7.

**Why it is sound.** The fuel is a hint to the prover and changes no statement: the lemma text, the part predicates and
`CanonEqual` are what they were. A fuel too low can only fail a part (an `ASK:unproved`), never prove a false one.

**What stays refused.** Nothing new is admitted. A walk the text does not bound keeps the fixed fuel and its old limits
(the list under Limits above); a walk longer than about ten steps above its bound is no longer given a fuel that far.
A unit whose bound is far above its real walk (a record result that is in fact fresh, counted as an initial record) can
land in the band where 4.12.1 gives up; none of the 45 heap pairs does.

**Checked.** `heap_canonical` 13 of 13 and `library_ops` 19 of 19 under each of 4.12.1, 4.14.1 and 5.3.3 (`LEAN_Z3`,
`LEAN_STEP_CACHE=0`, `JOBS=4`); `heap_canonical` 13 of 13 twice under `JOBS=28` without the cache; the 45 pairs whose
`expect.json` says `"heap": true` or `"canon"`, all pass.
