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

## 3. Conditional expressions

Reading: `c ? a : b` reads the condition by its truthiness, then the selected operand only. When neither operand
allocates or marks the world it is `(if c then a else b)`; otherwise each operand's bindings stay inside its branch:
`var (hw_, q) := if c then (var (hw_, r) := Alloc_..(hw_, ..); (hw_, r)) else (..)`.
Soundness: JavaScript evaluates the condition, then one operand, so an allocation or a narrowed read of
the other operand never happens: the heap world threads through the branch taken only. TypeScript narrows a name
inside a branch; a narrowed optional field read marks the world (stage 4's `OptMark`) inside its own branch.
Out: a condition on a reference (truthiness of an object), a conditional of two shapes (a union of records).
Pair `heap5_conditional`: `size` (WITNESS), `caption` (`n !== undefined ? n : name` for `??`: proved), `pick` (an
allocation in each branch against an `if` that returns: proved), `count` (untouched). Lint: unchanged.
Census (resolved, 39 roots), strict graph 339 -> 418, own syntax 794 -> 970; `curve.md` expects 315 after its step 3:
```text
{"files":23359,"units":53918,"core":418,"heapOwnFit":970,"mirrorMismatch":828,"planErrorCount":0,"seconds":1269}
```

## 5. String methods

Reading: the string methods read exactly through the ordinary lane's helpers (`translate.mjs` `helper`, design
`strings.md`, its BMP envelope: a character is a code unit): `s.length` is `|s|`; `trimStart`, `trimEnd`,
`toLowerCase`, `toUpperCase` (ASCII exact, else a bodiless function of the whole string), `includes`, `indexOf`,
`startsWith`, `endsWith` (an optional position clamped), `slice`, `substring`, `charAt`, `at`, `padStart`, `padEnd`,
`replaceAll` with a literal pattern and a string replacement, `concat`; `split` by a literal separator allocates a
fresh array of the pieces, `Alloc_A_string(hw_, StrSplit_string(s, sep))`. Stage 4's `trim` and `replace` stay
bodiless. The heap translator receives the ordinary lane's `helper` (`makeHeap({ .., helper })`), so both lanes read
one string operation with one Dafny function.
Soundness: each helper is the ordinary lane's exact reading, verified there against its probes and Test262; a method
on a primitive receiver reads no heap and runs no user code; `split` allocates in source order like a literal.
Out: a regular expression or a function argument (step 6 reads the literal ones), a split limit, `lastIndexOf` (its
helper carries a precondition, so the call site would carry a proof obligation), `repeat` (a negative count throws),
the index methods in a real file (a fractional position is truncated), a `split` inside a callback (an allocation).
Pair `heap5_strings`: `slug` (WITNESS), `words` (untouched, a split and its length), `isDraft` (`slice(0, 5) ===` for
`startsWith`: proved), `short` (a slice for a guarded substring: proved), `hasTag` (`indexOf >= 0` for `includes`:
proved). Lint: unchanged.
Census (resolved, 39 roots), strict graph 418 -> 487, own syntax 970 -> 1177; `curve.md` expects 465 after its step 5:
```text
{"files":23359,"units":53918,"core":487,"heapOwnFit":1177,"mirrorMismatch":1035,"planErrorCount":0,"seconds":1263}
```

## 6. Regular expressions

Reading: a regular expression literal in a call is a bodiless function of the literal's text (pattern and flags) and
its operands: `/p/f.test(s)` is `ReTest("/p/f", s)`, `s.replace(/p/f, r)` (and `replaceAll` with the `g` flag, the same
operation) `ReReplace("/p/f", s, r)`, `s.search(/p/f)` `ReSearch`, `s.split(/p/f)` a fresh array of `ReSplit`.
Soundness: a literal is a fresh RegExp each time it is evaluated, so its `lastIndex` starts at 0 and nothing
carries from one call to the next; the same text with the same operands is the same result, and nothing is assumed
of what it computes, so two different patterns are never equal.
Out: a regular expression held in a name (a global or sticky one carries `lastIndex` between calls), `match` and `exec`
(an array with `index` and `groups`), a function replacement, `search` in a real file.
Pair `heap5_regex`: `isCode` (another pattern: WITNESS), `squash` (`replaceAll` for `replace` with the same global
pattern: proved), `parts` (untouched, a split by a pattern), `clean` (proved). Lint: unchanged.
Census (resolved, 39 roots), strict graph 487 -> 564, own syntax 1177 -> 1449; `curve.md` expects 522 after its step 6:
```text
{"files":23359,"units":53918,"core":564,"heapOwnFit":1449,"mirrorMismatch":1307,"planErrorCount":0,"seconds":1239}
```

## 8. Void results

Reading: a unit whose result is `void` is a procedure: it returns the unit value, `(HWorld, ())`. Its body may fall
off its end, an `if` may fall through to the rest (the rest is carried into both branches, as in a loop body), and a
bare `return;` ends it. An expression body of a procedure is a same-file call.
Soundness: the result is `undefined` on both sides, so the observation is the final heap (and the world): a procedure
is compared on everything it wrote. A procedure returning a value (`return x;`) stays out.
Pair `heap5_void`: `add` (untouched, three writes and a push), `discount` (WITNESS), `clear` (an early return against
the opposite test falling through: proved), `addTwice` (a bare return added: proved). Lint: unchanged.
Census (resolved, 39 roots), strict graph 564 -> 572, own syntax 1449 -> 1471; `curve.md` expects 706 after its step 8:
```text
{"files":23359,"units":53918,"core":572,"heapOwnFit":1471,"mirrorMismatch":1329,"planErrorCount":0,"seconds":1246}
```

## 8b. Two corrections of the stage 4 core

Found by checking every other pair against the widened core. `a === b` between a value that may be `null` and one that
may be `undefined` read both absences as one Option's `None`, so `a === b` with `a = null`, `b = undefined` was `true`
where JavaScript says `false` (pair `null_undefined`'s `crossOption` became a false proof once step 3 let its candidate
in); such a comparison now stays out. An order `<` of two strings was emitted as a Dafny order of sequences, a type
error (nothing proved); it is now the ordinary lane's `StrLt` (the order of code units), and an order of anything but two
numbers or two strings stays out. Pair `heap5_absences`: `crossNull` (WITNESS, unproved), `later` (`b > a` for `a < b`:
proved), `before` (untouched). Lint: unchanged.
Census (resolved, 39 roots), strict graph 572 -> 572, own syntax 1471 -> 1471:
```text
{"files":23359,"units":53918,"core":572,"heapOwnFit":1471,"mirrorMismatch":1329,"planErrorCount":0,"seconds":427}
```

## 9. Module scope

Reading: a name declared outside the unit, read as a value. A module-level `const` of a primitive shape whose
initializer is a constant expression (literals, the core's operators, a template, a conditional, other such
constants, imported bindings) is read by its initializer, in place: `const MAX = 10` makes `i.id < MAX` the Dafny
`i.id < (10)`. An imported binding of a primitive shape is a bodiless constant keyed by its module specifier and its
exported name, `function Imp_LIMIT_<hash>(): int`.
Soundness: a constant's initializer is evaluated once and the binding never changes, so reading it in place is exact,
and a changed initializer is a changed value (never a constant named by its text alone, which a changed callee inside
the initializer would change under the same text). An import is the environment's value, the same on both sides for
the same module and name; another module or another name is another constant, never assumed equal (probe: parent
`import { LIMIT }`, candidate `import { OTHER as LIMIT }`, unproved; the same import, proved).
Out: a module `let` or `var` (a cell the world would carry), a constant whose initializer calls or allocates, an
object-valued constant (a shared heap object), an import of a reference or a function.
Pair `heap5_module`: `key` (the literal for the constant: proved), `capped` (WITNESS), `room` (`MAX + MAX` for the
dropped constant `DOUBLE`: proved), `tagged` (untouched, a template constant); the import reading is the probe
above. Lint: unchanged.
Census (resolved, 39 roots), strict graph 572 -> 647, own syntax 1471 -> 1609; `curve.md` expects 849 after its step 9:
```text
{"files":23359,"units":53918,"core":647,"heapOwnFit":1609,"mirrorMismatch":1467,"planErrorCount":0,"seconds":427}
```

## 11. Array callbacks and the other array methods

Reading: beside `map` and `filter`, a pure one-parameter callback with an expression body is read for `some` and
`every` (a quantifier over the items as they are at the call), `find` (the first item accepted, an option: primitive
items only), `findIndex`; `reduce(cb, init)` with a primitive accumulator is a left fold (`Fold` of the ordinary
lane); `includes`, `indexOf` and `at` search or index the items (`===` on references is identity, which `Ref`
equality is). `xs.forEach((x) => body)` as a statement is the loop `for (const x of xs) body`, read by stage 4's loop
helper. A binding inside a callback body is written in place (a Dafny lambda keeps no binding).
Soundness: the callbacks read and never write (no allocation, element access or narrowed field read inside them), so
evaluating them over the items at the call is exact; `forEach` reads the length once and visits an index while it is
below the current length, and nothing in a core loop body grows an array, so it visits what the for-of loop visits.
Out: a callback with an index or a statement body (beside `forEach`), `find` of references (an absent reference),
`map` or `filter` inside a callback (an allocation; this also closes a stage 4 path that wrote an invalid binding),
`indexOf`, `findIndex` and `at` in a real file, `reduce` without an initial value.
Pair `heap5_arrays`: `hasRush` (`includes` for a `some` comparing each tag: proved), `allPositive` (WITNESS), `total`
(the receiver named before `reduce`: proved), `firstBig` (untouched), `bump` (`forEach` against `for-of`: the same loop
helper, proved), `firstTag` (untouched, `at`). Lint: unchanged.
Census (resolved, 39 roots), strict graph 647 -> 672, own syntax 1609 -> 1675; `curve.md` expects 1160 after its step 11:
```text
{"files":23359,"units":53918,"core":672,"heapOwnFit":1675,"mirrorMismatch":1533,"planErrorCount":0,"seconds":377}
```

## 12. Discriminated unions of records

Reading: a union of records `A | B` where every alternative declares one field as literals and the alternatives'
literal sets are disjoint (`kind: "circle"` against `kind: "square"`) is a reference whose cell is one of the
alternatives' constructors holding one of its values: `predicate IsU_<k>(hw, r) { (IsR_a(hw, r) && Get_R_a_kind(hw, r)
== "circle") || (IsR_b(hw, r) && Get_R_b_kind(hw, r) == "square") }`, the parameter's hypothesis (and a field's
well-formedness). A field every alternative declares the same way is read through whichever constructor the cell
holds (`GetU_<k>_<f>`); after a test of the discriminant TypeScript narrows the reference and the alternative's own
reads apply. Two alternatives with the same fields are one constructor, told apart by the value.
Soundness: shapes are views, so the discriminant's value, never the constructor alone, tells the alternatives apart.
A narrowed reference reads the alternative it holds because nothing in a core execution writes a discriminant of an
alternative's constructor: a unit that writes one (a field write, an update, `Object.assign` onto it) stays out (probe:
`q.kind = "square"` through a record of the circle's fields, then a narrowed read of `s`: the unit is out), and so does
a unit that calls outside the file in a file with a union (step 15: a transition could rewrite a discriminant).
Out: a union without such a field (narrowing by `in`, `typeof` or `instanceof`: an object may hold more keys than its
type names, and `instanceof` reads a prototype), a write through the union itself, a union of records and primitives.
Pair `heap5_unions`: `size` (WITNESS), `isRound` (`!== "square"` for `=== "circle"`: proved only through the
hypothesis), `grow` (untouched, narrowed writes), `describe` (the other alternative tested first: proved). Lane B:
`curve.md` section 5 notes korat's enumerator draws no union of records; the generated inputs reached the WITNESS.
Lint: unchanged.
Census (resolved, 39 roots), strict graph 672 -> 706, own syntax 1675 -> 1759; `curve.md` expects 1415 after its step 12:
```text
{"files":23359,"units":53918,"core":706,"heapOwnFit":1759,"mirrorMismatch":1617,"planErrorCount":0,"seconds":377}
```
