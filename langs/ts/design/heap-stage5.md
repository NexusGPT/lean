# The heap core, stage 5: the full core order

Stage 4 (`design/heap-stage4.md`) widened the core in the order of the census's first reasons. Stage 5 follows the
order of lane heap-reach (`lean-v3/architecture/heap-reach/curve.md` section 2): at each step the reading with the
most units admitted per day of work, its spec in `readings.md`. Every step keeps the core's invariants: every heap
read and write is a total prelude function; no unit body carries a proof obligation; the lemma ranges over
well-formed heaps (`// HYP`); an absent value is modelled or out (pair `heap_nullable` keeps failing to prove); an
out-of-range access sets the `oob` flag and a unit that indexes proves only when the flag stays false on both sides; a
changed behaviour is never proved (each pair's changed unit is a WITNESS in lane B and unproved in lane A).
Reach: `design/heap-reach-census.mjs` over the 39 census roots with each project's options (`--resolve`), the strict
graph (`core`: every same-file callee and caller in the core), pasted after each step beside `curve.md`'s expected
count. `curve.md` counts each step on top of the steps before it in its own order, stage 4's rows included at their
places, so the measured count and the expected one differ by what stage 4 built out of that order.

## 0. Two measurement defects

`shapeWhy` (why a type has no shape, the census's reason) walked a recursive type forever: `TreeNode { children:
TreeNode[] }` asked for the reason of `TreeNode[]`, which asked for `TreeNode`, and the stack overflowed. `plan` then
threw, the translation of the whole file failed, and the census dropped the file. A type met
again while it is open is now named `recursive shape`; such a type has no shape (`shapeOf` stops at depth 6), so the
unit stays out of the core and the rest of the file is read as before.

`layer1Risk` walked into nested callbacks and counted a callback's own `return` of a reference as the unit's result,
so a unit returning a count of a `map` whose callback returns a field was exposed. A nested function's return is its
own result; its writes through an input still count. The guard (`spec/theorem.py`) keeps the lemma of a unit that
is not exposed, so a unit exposed only by a callback's return and with no readable identity shape kept no lemma.
Soundness: the unit's own result is still judged by its own return statements; what a callback returns reaches the
unit's result only through an expression of the unit (a `map` result named and returned), which its own return reads.
Pair `heap5_step0`: `rootName` (a recursive tree type: translated, out of the core, proved by the value reading),
`stamp` (a callback returning a reference, a count returned: its guard reads it not exposed; proved), `width`
(WITNESS). Lint: unchanged.
Found on the way, outside this lane's files: the value reading of `map` with a block callback, in a unit that mutates
a parameter, wraps the callback's own `return` with the mutated parameter (`Item -> (Tag, seq<int>)` where
`Item -> Tag` is expected), a Dafny type error: nothing is proved, never a false proof.
Census (resolved, 39 roots), base `67b8201` against step 0:
```text
base:   {"files":23359,"units":53767,"core":154,"heapOwnFit":386,"mirrorMismatch":245,"planErrorCount":15,"seconds":896}
step 0: {"files":23359,"units":53918,"core":155,"heapOwnFit":388,"mirrorMismatch":246,"planErrorCount":0,"seconds":882}
```
Every plan error was the stack overflow; the 151 units of those 15 files are read again (one enters the core). Of the
53,767 units both runs read, 425 were exposed and are not after the fix, none the other way. `curve.md` expects a
strict graph of 50 at its step 0 (the base before stage 4); stage 4 brought it to 154. (`mirrorMismatch` counts the
census's mirror of the stage 2 core test against stage 4's heap.mjs: it is no longer a check of this core.)

## 1. Template literals

Reading: `` `a${x}b` `` is the concatenation `"a" + S(x) + "b"`, an empty literal part left out. `S` is ToString:
a string hole is itself, a boolean `if x then "true" else "false"`, a number literal its own string
(`String(Number(text))`), any other number `NumStr_int(x)` (or `NumStr_real`), bodiless: a function of the number
alone, the same on both sides, nothing assumed of its digits. A hole that may be absent reads its value when present
and `"undefined"` (or `"null"`, by the shape's absence) when not: both names are what JavaScript writes.
```dafny
function NumStr_int(n: int): string
function greet_parent(hw_: HWorld, u: Ref): (HWorld, string)
{ (hw_, ("Hi " + Get_R_83e68165_name(hw_, u) + ", " + NumStr_int(Get_R_83e68165_age(hw_, u)))) }
```
Soundness: every hole is a primitive or an option of one, so ToString runs no user code (a record hole would call
its `toString`, a getter could run): the concatenation is exact on strings, booleans and absent values, and a
number's string is uninterpreted, so two holes are equal only when their numbers are. Out: a hole of a reference (a
record, an array, a Map), a tagged template.
Pair `heap5_template`: `greet` (WITNESS), `badge` (the boolean hole spelled as two literals under a test: proved,
canonical heap), `years` (`age + 0`: proved), `handle` (a hole that may be missing, untouched: proved), `stamp`
(split into concatenations, `10` as `"10"`: proved). Lint: unchanged (the lint already admits template literals).
Census (resolved, 39 roots), strict graph 155 -> 283, own syntax 388 -> 632; `curve.md` expects 245 after its step 1:
```text
{"files":23359,"units":53918,"core":283,"heapOwnFit":632,"mirrorMismatch":490,"planErrorCount":0,"seconds":492}
```

## 2. Empty literals typed by their place, expression bodies

Reading: an array literal takes the array shape of the place it is written to (a field, a local's declared type, a
parameter, the return type): `[]` has no element type of its own (`never[]`), and `const xs: string[] = []` is an
empty cell of `[string]`, `Alloc_A_string(hw_, [])`. (An object literal already took the shape of its place.) An arrow
unit whose body is an expression returns it: `(t: Team): string => t.name` is the unit
`(hw_, Get_R_.._name(hw_, t))`.
Soundness: an empty array holds no element, so any element type describes it; a non-empty literal is written to a
place whose shape its elements already have (TypeScript checks the assignment), and literal unions share their
primitive's key. An expression body is the `return` of that expression, evaluated once.
Out: an array literal with no shaped place and no shaped type of its own (`const xs = []`, an evolving array).
Pair `heap5_literals`: `title` (expression body against a block: proved), `reset` (WITNESS), `clear` (the empty array
named before the store: the same allocation, proved), `start` (an empty local against an empty literal typed by the
return type: proved), `twice` (untouched expression body). Lint: unchanged.
Census (resolved, 39 roots), strict graph 283 -> 339, own syntax 632 -> 794; `curve.md` expects 296 after its step 2:
```text
{"files":23359,"units":53918,"core":339,"heapOwnFit":794,"mirrorMismatch":652,"planErrorCount":0,"seconds":492}
```
