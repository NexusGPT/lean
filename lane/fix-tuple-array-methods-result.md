# fix-tuple-array-methods: result (2026-10-31)

Branch `lane/fix-tuple-array-methods`, base `30569d746` (lead-30569d74). Commits: `2a09d46c4` (the reading and the
pair), `b6b23bde5` (design note, `design/heap-stage5.md` 17c), and this result.

## What I found

Lane conformance-array-copies' finding holds on this base: the array-method dispatch (`translate.mjs`, `if
(isArrayLike(checker, base))`) read its receiver as `const R = expr(recv)`. The value reading holds a fixed tuple as a
Dafny tuple (`(string, string)`), so `t.map`, `t.slice()`, `t.includes`, `t.indexOf`, `t.some`, `t.join`, `t.filter`
and an indexed `t.map` each put a tuple where a sequence is expected. On the red pair's parent, `dafny resolve` gives
10 errors (`expected seq<string>, found (string, string)`), and the theorem file proves nothing.

That lane's commits (`dac8c5403` and later) are not merged into this base: `seqOf` here had no tuple branch.

Two more things the mechanism reaches:
- The identity guard (`heap.mjs freshPrimArrayCall`) treats map/filter/slice/... over primitives as making a fresh
  array only when the receiver is `isArrayType`. A tuple is an array object, and these methods make a new array from it
  just as they do from any array (23.1.3, ArraySpeciesCreate). Because of the narrower test, `mapped` and `tagged` were
  withheld ("result may carry an input or shared reference") even once the file resolved.
- A write in place on a local tuple (`t.pop()` as a value, `t.reverse()` as a statement) wrote a sequence back into
  the tuple-typed name: the file did not resolve, on the base as well. The lint already refuses this on a parameter.

## What I changed

- `translate.mjs`:
  - `seqOf` reads a fixed tuple held as a Dafny tuple, of one element type, as `[t.0, t.1]` (`tupleParts`). A tuple of
    differing element types (or one with an optional element) is refused with a catalogued message. I took the
    branch and `tupleParts` verbatim from lane conformance-array-copies, so the two branches merge as one text.
  - The dispatch reads its receiver through `seqOf` (`const R = seqOf(recv)`). Every method of the dispatch takes it.
  - `tupleWrite`: a write in place through a receiver read as a Dafny tuple is refused, in `mutatorValue` (pop, shift,
    splice as a value) and in the statement form (`isMutCall`). The message is catalogued under the library-call
    reading.
- `heap.mjs freshPrimArrayCall`: the receiver may be a tuple.
- `readings.mjs`: the two refusal messages (reading `arrays`, as in conformance-array-copies; the library-call reading).
- `node langs/ts/lower.mjs --audit`: uncatalogued 0, exit 0.

None of the rules is keyed on a name. Each one is keyed on the receiver's type: a tuple whose Dafny type is a tuple.

## Pair added: `tuple_array_methods` (17 checks, heap off, `[string, string]`)

- `mapped`: map against its positions written out. Proved.
- `has`: includes against two comparisons. Proved.
- `position`, `joined`, `tagged`: indexOf, join and an indexed map, each against the same method on the literal
  `[t[0], t[1]]`. Proved.
- `kept`: filter, untouched. Proved.
- `sliced` (`slice()` against `slice(1)`) and `anyEmpty` (some against every): not proved, lane B WITNESS.
- Red on the base (run in a worktree of 30569d746): 6 FAILED (mapped, has, position, joined, tagged, kept). Green here:
  ALL PASS.
- Why the candidates of position, joined and tagged use the literal: I first wrote them unrolled (`t[0] === v ? 0 :
  ...`, `t[0] + "-" + t[1]`). Those lemmas do not prove, and neither do the same comparisons on a plain array literal
  `[a, b].indexOf(v)` on the base. Dafny unfolds the helpers' recursion (IndexOf, Join, MapIdx) only once, so this is a
  limit of the prover and not of the tuple reading. I changed the candidates (rows of this new pair only) so that each
  one tests what the reading claims: the receiver is the sequence of its positions.

## Regression (`JOBS=1 node langs/ts/tests/run.mjs --pair <p>`, at 2a09d46c4)

ALL PASS: array_callback_cells 9, array_callbacks_rest 15, array_callbacks_rest_real 11, array_copy_identity 13,
conformance_copy 7, copied_argument 10, heap5_arrays 13, heap5_tuples 11, heap_canonical 13, library_assign_sort 11,
library_cells 15, library_hooks 5, library_members 19, library_members_refused 16, library_more 15, library_ops 19,
library_rows 35, spread_outside 47, tuples_intersections 17, tuple_spread 9, type_tests 59.

`map_block`: 1 of 11 fails (`Equal_labels_inner proved`: not proved), both here and on the untouched base 30569d746
(run twice here, once on the base). It has no tuple, and the sweep below shows its translation is byte-identical. It is
a base finding, reported and not touched.

Translation sweep, base against head: `translate.mjs <side> --core [--heap] --no-project` over every side of all 262
pairs, once with `--heap` and once without. With `--heap`: byte-identical everywhere. Without: identical except
`tuple_array_methods` (parent and candidate). No exit code changed.

## Census

Not run. Under the memory rule a census may start only when `free -g` shows at least 12 GB available and
`pgrep -fc census.mjs` is below 6. I polled that from 04:43Z to 06:38Z, every 300 s (`/tmp/fta/census/gate.log`).
Memory was always enough (44 to 60 GB available), but the count never went below 19: it ran 19 to 28, about 15 of
those being agent processes whose arguments name `census.mjs`, and about 10 real censuses. I set the deadline at 06:45Z
and told the lead; there was no answer.
n8n: not run, census count. langchainjs: not run, census count. nexus: not run, memory.

In place of the census, the translation sweep above shows that the change alters no pair side but the new pair. Every
unit the change can reach in a real root is either (a) a unit whose file did not resolve before (a method on a fixed
tuple, now read), or (b) a mixed tuple or a write in place, now refused where its file did not resolve before. Neither
can lose a proved unit. That is a reading of the mechanism, not a census number.

## Findings (not fixed here)

- `map_block` `Equal_labels_inner` is red on the base (above).
- Over a literal of two or more elements, IndexOf / Join / MapIdx are not proved against their unrolled forms (the
  recursion is unfolded once). This applies to arrays in general.
- A write in place through a local tuple is now refused where before it emitted a file that did not resolve. A reading
  that rebuilds the tuple from the new sequence (for the writes that keep the length) is not done.
- `seqOf`'s mixed-tuple message also covers `[string, string?]` (it reports `Option<string>` as the second element
  type). That is accurate, but it does not name the optional element as the cause.

## What is left

- The census on n8n and langchainjs (base 30569d746 against head b6b23bde5, one root at a time, under the memory rule).
  The gate script `/tmp/fta/census_gate.sh` runs the four of them in order once the rule allows.
- map_block's red row on the base (finding above), for the lane that owns it.
- When lane conformance-array-copies merges: its seqOf branch and `tupleParts` are textually identical to the ones here.
  Its `concat` change (`const S = seqOf(recv)`) still reads correctly with the receiver already through seqOf.
