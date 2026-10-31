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

### 3a. 2026-10-31: the arm taken carries the arguments a call in it changes (lane core-conditional-expressions)

The heap core already read the section above. What still stopped a conditional was outside it: the lint's
`conditional-effect` refused a same-file call that changes its argument inside an operand (`on ? record(t, s) : 0`),
because the value reading bound the new argument inside the branch only, so the name read after the conditional was
the old one. The refusal sat in the lowering every unit of the file reads, so it stopped the whole file, the heap-core
units included.

Reading (`translate.mjs` `operandParts`, `carried`): the same one as the heap core's world, for the value reading's
names. Each operand is translated with its hoisted lines apart and with the names a same-file call in it rebinds (the
arguments it changes, `unitCall`); a rebinding inside a nested operand rebinds the name in the operand around it. When
an operand rebinds a name, the conditional is
`var (t, b) := if c then (var (r, m) := record(b, s); var b := m; (r, b)) else (0, b);` (the world first when an
operand has transitions): the condition, then the arm taken, which returns its value and every name either arm
rebinds, so the values read after the conditional are the ones the arm taken left. With no name rebound the emitted text
is the one before, byte for byte (the lines go where they were hoisted). The lint's `conditional-effect` now refuses a
short-circuit right operand only.
Soundness: JavaScript evaluates the condition, then one operand; a call in the other operand never runs, so the
untaken arm returns its names unchanged. Where the section is silent: a name declared inside the conditional (a
callback's local) is not carried, being out of scope after it; a name the reading cannot place stays refused by the
call's own rule (an argument that is not a name or a fresh literal).
Stays refused: a changing call in the right operand of `&&`, `||`, `??` (the same carry would read it; it is another
construct's reading, left to its lane), and the section's own outs (a condition on a reference, two shapes).
Pair `conditional_expressions` (red at the base: the parent does not translate): the heap core reads `note` (a ternary
in a return), `route` (nested), `doubled` (as an argument), proved, and `stray`, `skewed` (planted, lane B WITNESS);
the value reading reads `tally`, `ladder` (proved: a local counter changed through a callee in the arm taken) and `leak`
(planted, lane B WITNESS). The planted rows are `false` in lane A, not `witness`: the doubles reading does not encode a
write through a record (`not encoded: a write outside the unit's locals`), so it has no counterexample to replay.
Found on the way, outside this construct: any caller of a callee that writes through an input, read by the value
reading, is withheld by the identity guard (`identity shape unreadable`), with or without a conditional.

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

### 5b. The string methods the first reading left out (2026-10-31, lane core-string-methods)

Read now in the core (`heap.mjs` `strMethod`, `strEmit`), each through the helper the ordinary lane uses
(`translate.mjs`, the string branch of a method call). Each is a pure function of the receiver and its arguments,
evaluated once and in order.
- `lastIndexOf(t, p?)`. The search goes back from `p`, clamped to the length (`StrLast(s, t, StrClamp(p, |s|))`,
  `|s|` when `p` is absent). `StrLast` requires `p <= |s|`, and that is `StrClamp`'s postcondition. So the
  obligation is the helper's, the same for every unit: the unit body carries none that its operands decide.
- `repeat(n)` with `n` written as a non-negative integer literal: `Repeat(s, n)`. A negative or infinite count
  throws (22.1.3.18), so any other count stays out. The engine's string-length limit stays outside the sequence model,
  as it does for `+` (`design/strings.md`).
- `split(sep, limit)` with a literal separator and a number limit. It allocates the first `ToUint32(limit)` pieces of
  the whole split: `ps[..min(limit % 2^32, |ps|)]`, where Dafny's `%` is Euclidean. 22.1.3.23 pushes the pieces in
  order and returns when the count reaches the limit, so the result is a prefix of the unlimited split. This holds for
  the empty separator too, and a limit of 0 gives `[]`. The ordinary lane still reads a limit as uninterpreted
  (`strings.md`). That is sound on both sides, because a unit's two sides are read by the same lane (`agreeCore`).
- `concat(...)` of any number of strings: `s + a + b ...`, or `s` itself for `concat()`.
- In a real file, every index method the first reading kept to integer files (`includes`, `indexOf`,
  `lastIndexOf`, `startsWith`, `endsWith`, `slice`, `substring`, `charAt`, `at`, `padStart`, `padEnd`, the split
  limit). A number argument is truncated toward zero, `if p < 0.0 then -((-p).Floor) else p.Floor`
  (ToIntegerOrInfinity on the real model, the ordinary lane's `integer`), and a found index is a real (`as real`).
  NaN and the infinities are not values of the real model. A unit whose position is a real read from an input stays
  unplaced by the faithful reading (rule C), so lane A does not prove it from the real lemma alone. The pair's `cut`
  shows this.

Still out: a regular expression or a function argument (step 6 reads the literal regular expressions), `repeat` by a
count that is not a non-negative integer literal, a split whose separator is not a literal, a split inside a
callback (an allocation inside a callback), and `trim` and `replace`, which stay stage 4's bodiless functions.

Found on the way, not changed: Dafny does not prove an equality of two strings nested in a sequence.
`[t + ": " + t] == [t + ":" + " " + t]` fails while the same equality at top level proves (sequence extensionality is
not triggered under a sequence constructor). So a unit that writes a literal array of strings computed two different
ways is not proved even when the strings are equal. This is not a false proof. Also, the ordinary lane reads
`s.repeat(n)` for any `n` as `Repeat(s, n)`, which is `""` for a negative `n`, where JavaScript throws a RangeError.

Pairs `string_methods`: `stem` (WITNESS), `ext` (`lastIndexOf` against `lastIndexOf` from past the end), `rule`
(`repeat(2)` named first), `head` (`split(",", 2)` against `split(",").slice(0, 2)`), `line` (`concat` against `+`),
`retag` (a limited split written to a field). On base `ext`, `rule`, `head`, `line` and `retag` are withheld by the
value reading's identity guard (a split's array). `string_methods_real`: `cut` (WITNESS), `half` (`slice(0, 1.5)`
against `slice(0, 1)`), `tagged` (`includes` against `indexOf >= 0`), `tail` (`lastIndexOf` + 1), `padded`
(`padStart(4.9)` against `padStart(4)`). On base all four proved rows are withheld. Lint: unchanged.

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

### 6b. The named captures of a match (2026-10-31)

The readings above (`test`, `replace`, `replaceAll` with g, `search`, `split` by a literal) were in place at this head
(`heap.mjs` `reCall`; pair `heap5_regex`); the one form of a regular expression literal still refused was `.groups`
(library row `match-groups`). Reading: for a match of a non-global, non-sticky literal bound to a const
(`const m = s.match(/re/)` or `/re/.exec(s)`, `s` a literal or a name the unit never writes: the same test as `m.index`,
`common.mjs` `matchOfName`), `m.groups.k` is `regex_group(re, s, "k")`, one bodiless function of the pattern, the string
and the name, the same on both sides; `m?.groups?.k` is that value when m is a match and absent when it is not;
`m.groups` (or `m?.groups`) as a presence test (`!`, an equality with null or undefined, a condition, an operand of
`&&`/`||` in one) is an object exactly when the pattern names a group (`regex_groups(re, s)`, whose keys and values are
never read through it) and absent when m is.
Soundness: a non-global, non-sticky literal starts at 0 and leaves `lastIndex` alone (RegExpBuiltinExec, 22.2.7.2), and
`s.match(re)` of such a pattern is `re.exec(s)`, so the captures are functions of the pattern and the string. The
groups object holds undefined for a group that did not take part, under TypeScript's `string`; so `k` is read only when
it names exactly one group of the pattern and that group takes part in every match (`common.mjs` `regexCaptures`, a
parse of the literal: a group in one alternative of a disjunction, under a quantifier of minimum 0, or inside a
lookaround may be left undefined; a pattern it cannot parse reads nothing). Where the section is silent this note
chooses the refusal: the value of such a group would be read as a string it may not be.
Out (refused by row `match-groups`, rule `unsupported-member`): a group that may not take part, a name the pattern does
not give, `m.groups` held in a name, passed or destructured (`const { k } = m.groups`: its values are not read as
strings), `m.groups["k"]`, `m!.groups`, a pattern held in a name, a global or sticky pattern. A unit of the heap core
that matches stays out of the heap core (`match` and `exec`, above) and is read by the value reading.
Found, not fixed (outside this note's construct): the numbered captures carry the same undefined, `m[1]` of
`/(a)|(b)/` on `"b"`; the match reads as `seq<string>`, so `return m[1] ?? "z"` and `return m[1]` translate to the
same Dafny body while JavaScript returns `"z"` and undefined: a proof lane B contradicts (lane B finds the WITNESS on
input `"b"`). The same parse (`regexCaptures`) decides it for `m[i]`, i a literal.
Pair `regular_expressions`: `isCode` (the same literal on a renamed string compared with true: proved), `tidy` (another
replacement: WITNESS), `year` (`!m || !m.groups` then `m.groups.y`, against `m?.groups?.y ?? ""`: proved), `month`
(another named capture of the same match: WITNESS). Lint: the escape fixture `library_members_match_groups` now holds
a group in one alternative (still refused); its earlier form, `m?.groups?.host` of `/@(?<host>[a-z.]+)/`, is read.
Census (`census.mjs` on the copies under `/root/da/census/repos/`, base b5c07450 against this reading; units whose
first stop was `.groups` before): langchainjs 2 units, both entered (entered 2,766 -> 2,768); n8n 11 units, none moved
(two stop first by another rule; the rest by forms left out: a pattern held in a name, destructuring, a string the unit
writes, a match through `?.match`, a string rooted at `this`); nexus, read under `--include apps/vibe-agent` (the only
nexus file with a match's `.groups`; the whole-root run was stopped by the machine's memory), 2 units:
`assumedRoleArnToRoleArn` entered (213 -> 214), `resolveRoleArn` moved to `copied-argument`.

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

### 8, read again (2026-10-31): a returned call of a procedure

Checked form by form against the section (pair `void_results`, one unit per form): a body falling off its end
(declared and inferred `void`), a branch falling through to the rest, a nested bare `return`, a bare `return` in an
`else`, an expression body, a class method: each was already in the core. One form the section names was not: the
expression-body reading carried to a `return`. `return f(..);` in a procedure, with `f` a same-file procedure, was
refused as `a value returned from a procedure`. The refusal pushed out `f` (`called by .., outside the core`) and every
caller of the unit too, so their lemmas were withheld by the identity guard (`write through an input in a same-file
callee`).
Reading: a call of a same-file procedure (`procCall`: a same-file unit, not a constructor, whose result is `void`)
evaluates to `undefined`, the unit value. A procedure's expression body and the operand of a procedure's `return` may be
such a call, read as the call and then a bare return: `var (hw_, c0_) := f(hw_, ..); (hw_, c0_)`, where `c0_` is `()`.
That one predicate now decides both places. Before this, the expression body took any same-file call, so a void arrow
whose body called a unit with a value (a TypeScript error the core did not rely on) gave a Dafny type error, never a
proof. Now it stays out.
Soundness: a procedure in the core returns only by a bare return or by falling off its end, so its value is
`undefined` on both sides, and the core reads it as `()`. JavaScript evaluates the operand once, then returns, so the
heap is the callee's. The callee joins the core under the usual rule (every caller in the core).
Stays out, and why: `return e;` of any other expression in a procedure. An outside call typed `void` may return a value,
because TypeScript lets a function with a result be used where `() => void` is expected, so its value is unread. The
same holds for an `any` value (`return x as any`). `return undefined;` and `return void e;` are equal to a bare return,
but the section does not name them; they stay refused until a reading names them. A `return` inside a loop is also
unchanged (stage 4's loop helper has no exit).
Pair `void_results`: `add` (untouched), `bump` (inferred void), `cap` (fall-through), `guard` (nested bare return),
`onlyEmpty` (return in an else), `addOne` (expression body against a block), `addFree` (a returned call against the call
and a bare return), `topUp` (a returned call against the opposite test returning first: red before, withheld; proved
after), `refill` (WITNESS, another argument), `Counter.tick` (WITNESS). Lint: unchanged.

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

### 8b, read again at the places the first pair leaves (2026-10-31)

Both corrections were already in the translator (`heap.mjs` `checkExpr`: the `===`/`!==` refusal when both operands
are Options of different absences, and the order check; `expr`: the string order through `StrLt`). Nothing in the
translator changed. This reading checks that each correction is one mechanism, keyed on the operands' shapes, not on
the form of `heap5_absences`.
- The absence refusal compares the two operands' shapes (`shapeOf(typeOf(..))`, the shape whose key carries the
  absence, `On_` or `Ou_`), so it applies to every operand form: a field read (`x.n === x.u`), `!==`, a parameter.
  The other `===` comparisons the core reads never meet two absences (the core does not read `switch`). An array's items and a Map's or
  Set's keys are never Options (`shapeOf`), so `includes` and `indexOf` never compare across absences. A presence
  test against the literal `null` or `undefined` under `===` reads the Option's own absence: `a === undefined` for
  `a: number | null` is `false`.
- The string order reads both operands' `StringLike` type flags, which a string enum's member type carries: an enum
  member is its string at run time, so `StrLt` is exact. A union of string literals (`'a' | 'b'`), a type parameter
  constrained to `string` and a branded string (an intersection) carry no `StringLike` flag and stay out. That
  refusal is conservative, never a guess. A number order of anything but two `NumberLike` types without absence also
  stays out (`undefined < 1` is `false` through NaN, which no Option order reads).
Stays refused, and why: `==`/`!=` between two values (only against the `null` or `undefined` literal: `null ==
undefined` is `true`, a loose comparison of values converts them); `===` across the two absences (the ordinary
lane's `Nullish` reads it exactly); an order of a string-literal union (exact through `StrLt` too, but the flag
test does not see it, so it stays out until a reading of literal unions' base type is written).
Pair `stage4_corrections`: `fieldCross` (a field that may be null against an optional field, the candidate `true`
when both are absent: unproved, WITNESS), `notCross` (the same through `!==`: unproved, WITNESS), `byName` (`y.name >
x.name` for `x.name < y.name`: proved), `tierOrder` (`b > a` for `a < b` over a string enum: proved). With the
absence refusal removed, `fieldCross` and `notCross` are false proofs. With the string order removed, `byName` and
`tierOrder` are a Dafny type error and nothing is proved. The pair keeps both corrections in place.
Found on the way, outside these constructs: the ordinary lane's `m.get(k) ?? d` (`translate.mjs`, `get`'s
`foundValue`) writes an unqualified `Some`. When the file also uses `Nullish`, whose constructor is also `Some`, the
theorem has a resolution error, and nothing in the file is proved (never a false proof).

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

### 9b. An imported name is the binding it denotes (2026-10-31)

Two defects in what "keyed by its module specifier and its exported name" was taken to mean, both at the one place an
imported name becomes a symbol of the theorem. The value lane named an imported constant, an imported function and a
member of an imported namespace by the local name alone (`ext_NAME`, `ext_call_args_relay_..`), so `import { FIRST as
NAME }` and `import { SECOND as NAME }` were one constant: a unit the heap core leaves to the value lane (one that writes
a module `let`) was proved equal across two different values, a false proof. The heap core keyed by the specifier text,
so one declaration reached through a module that re-exports it (`export { grow } from './limits'`, imported from
`./lib`) was another constant and another transition: never proved.

Reading: an imported name is the binding it denotes, the module that declares it and the name it has there, read
through every re-export (`common.mjs importIdentity`, one function both lanes call: the heap core's `Imp_`/`Call_` keys,
the value lane's externals and its function-value code ids). The declaring module is named by its path from the
importing file's directory with the extension left out (`pr.mjs` writes the base version beside the head one, so both
sides name it alike), a file inside a package by its path from the package folder; a namespace import or `import x =
require(..)` is the module itself. The local name stays in the symbol for reading, the identity is its hash.
Soundness: a module is instantiated once per resolved file (ECMA-262 HostLoadImportedModule returns one Module Record
for one module) and a re-export is the same binding, not a copy (ResolveExport resolves it to the declaring module's), so one declaration is one value on both sides and two declarations are two
uninterpreted symbols, never assumed equal. The environment assumption is unchanged: an imported module's code is the
environment's, the same on both sides.
Where silent, the choice that keeps soundness: a bare specifier (`'pkg'`) stays named by its text and imported name (a
package's entry is its public identity; the module behind it depends on an install, which two checkouts need not share);
a relative specifier that does not resolve stays named by its text. Each is at worst another symbol on one side, an
unproved unit, never two values made one. Still out, as above: a module `let` or `var` in the heap core (the value lane
reads it as a world cell, design/module-forms.md), an object-valued or function-valued imported binding read as a value.
Pair `module_scope`: `capped` (the literal for `MAX`: proved), `bounded` (WITNESS), `tally` and `peek` (a module `let`,
the value lane's cell: proved), `counted` (value lane) and `named` (heap core) read `NAME` bound to another constant
(unproved, WITNESS; `counted` was a false proof before), `limited` and `next` (the same import: proved), `relayed` and
`step` (the same declaration through a re-export, heap core: proved; unproved before). Lint: unchanged.

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

### 11b. The rest of the array callbacks (2026-10-31)

Read now, beside the one-parameter expression callbacks above:
- **A callback with an index** `(x, i) => e` for `some`, `every`, `find`, `findIndex`, `map` and `filter`. The index is
  the item's position, an integer from 0 below the length; in a real file the callback's number is that position as a
  real (`(x: E, j: int) => (var i := j as real; e)`). `some` and `every` are the quantifiers over the position, `find`
  and `findIndex` the ordinary lane's `FindIdx` and `FindIndexIdx`, `filter` a fresh cell of `FilterIdx` over the items,
  `map` a fresh cell of `seq(|it|, (k: int) requires 0 <= k < |it| => f(it[k], k))`: the items as they are at the call,
  allocated as the one-parameter rows allocate.
- **A block body of bindings** `(x) => { const a = e1; …; return e; }`: each binding a `const` of one name with an
  initializer, written in place in the lambda as a Dafny let (`(var a := e1; e)`), in source order; `reduce`'s callback
  takes the same form.
- **`indexOf`, `findIndex` and `at` in a real file.** A position is an integer the file reads as a real
  (`IndexOf(..) as real`); `at`'s number is ToIntegerOrInfinity of it, its truncation (`At(it, JsTrunc_real(n))`), so
  `at(-1.5)` is `at(-1)`.
- **A callback's captured bindings.** Every callback is its own unit (common.mjs `callbackUnits`), linked to the unit
  around it (heap.mjs `plan`: a unit is out when a nested callback unit is out). The translator appends the bindings a
  callback captures to that unit's parameters (`callbackEnvironment`: each a binding no later write reaches), but the
  core read them as outside names (`outside name o`), so every unit whose callback reads an outer name stayed out of
  the core: the section's own `forEach` reading reached only callbacks that read nothing around them. The core now
  reads a captured binding as the callback unit's input, in its checks, its emission and its loop helpers' free names.
Soundness: the index is the position the method passes, and every reading above is the one-parameter reading with that
position beside the item; the callbacks still read and never write (no allocation, element access, division or
narrowed field read inside them). A `const` binding is evaluated once, in order, before the result, and nothing in a
callback writes, so a Dafny let is exact. A real position is an integer, so `as real` is exact, and truncation is
ToIntegerOrInfinity on the finite numbers the real reading holds. A captured binding is one the callback reads as it
was when the callback was created and no later write reaches, so the callback unit is a function of it; a write to a
captured name (the enclosing unit's binding) stays out, since the unit's own parameter would hide it.
Where the section is silent, the choice kept soundness: a callback parameter or a binding whose name ends in an
underscore stays out, as for the unit's own names (the generated names do).
Still out, and why: `forEach((x, i) => …)` (the lint reads a `forEach` callback of one parameter only and the ordinary
lane has no indexed `forEach`: a heap-only reading would never reach a unit, so it is the lint's and the ordinary
lane's reading together); `reduce` with an index or without an initial value (the latter throws on an empty array);
`find` of references (an absent reference has no shape); `map` or `filter` inside a callback (an allocation); any other
block body (a `let`, a branch, a second `return`); a callback of more than two parameters.
Measured on the way: the core reads an operator on numbers as one bodiless function per operator
(`ext_call_args_Math_lean_lt_int_int`) and a callback handed to `find`, `findIndex`, `map` or `filter` as a function
value, so two sides prove equal only when their tests are written alike and those callbacks' text is the same (the
pairs' equal edits swap the conjuncts of a quantifier, name a receiver or write a binding in place); an edit inside a
`forEach` body changes its loop helper and is not proved (no induction across two helpers).
Pairs `array_callbacks_rest` (an int file: `flagSome`, `pickTag`, `firstBig`, `weigh`, `keepFirst` an indexed `some`,
`find`, `findIndex`, `map`, `filter`, `doubled` a block body, all proved; `flagEvery` an indexed `every` admitting a
zero, WITNESS) and `array_callbacks_rest_real` (a real file: `whereRush` `indexOf`, `firstBig` `findIndex`, `lastTag`
`at(-1.5)` for `at(-1)`, `flagSome` an indexed `some`, proved; `whereTag`, WITNESS). Each unit writes the lines a
`forEach` statement walks, a write only the core reads, so at the base the translator refused every unit
(`alias-mutation: … the heap core does not read this unit`); each unit's first base reason is this reading's
(`callback form`, `indexOf in a real file`, `findIndex in a real file`, `at in a real file`). Lint: unchanged.
Census (`node langs/ts/census.mjs <root> --out <json>`, `NODE_OPTIONS=--max-old-space-size=12288`, one root at a
time, base `b5c074508` against this reading): n8n 9,610 units, 2,680 entered before and after; langchainjs 6,709 units,
2,766 entered before and after; `census.mjs --diff` 0 gains and 0 losses in every reading on both, and every unit's
stop is the same. nexus did not finish either run (the machine's out-of-memory killer, 118 of 122 GB in use, stopped
the census at 13,712 and 6,000 files); over the 10,094 units of the chunks both finished, 5,552 entered before and
after, every stop the same. The lint census moves no unit because a unit whose callback the core refused still reaches
the value lane, which reads it, except for a write through a `forEach` element, and the units holding such a write are
stopped first by other readings (n8n: one unit stopped by `the heap core does not read this unit`, still stopped).
Heap reach (`design/heap-reach-census.mjs <concepts.json> <out> --resolve --repos n8n,langchainjs`, the census input
pointing at the copies under `/root/da/census/repos/`): the tool now plans the core as the translator does, a callback
unit's captured bindings among its parameters (before, every such callback was out in the tool whatever the core
read, and the indexed, block and real-file readings moved nothing: core 112, own syntax 490 on both heaps). With it,
the base heap against this reading:
```text
base:  {"files":10784,"units":16319,"core":112,"heapOwnFit":490,"mirrorMismatch":447,"planErrorCount":0,"seconds":145}
11b:   {"files":10784,"units":16319,"core":114,"heapOwnFit":566,"mirrorMismatch":523,"planErrorCount":0,"seconds":159}
```
n8n core 82 -> 82, own syntax 375 -> 427; langchainjs core 30 -> 32 (a unit testing every item of a copy, and its
callback), own syntax 115 -> 139; no unit left the core. The mirror (`makeMirror`) does not follow the core's
readings since stage 4, so its mismatch count grows with every reading; it is no check of this core.

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

## 13. Arithmetic

Reading: `*` is exact; `%` is the truncated remainder (the dividend's sign), `RemT_int`, and in a real file `/` is
`DivT_real`: each total, a zero divisor marking the world (`ZeroMark_int(hw_, d)`, `oob := true`), so a unit that divides
carries `// INRANGE` and its lemma shows neither side divides by zero. The bitwise operators (`& | ^ << >> >>>`, `~`)
read through the ordinary lane's helpers (ToInt32 and ToUint32 of the operands, `bv32`). Unary minus and plus on a
number; `x++` and `x--` as statements are `x += 1` and `x -= 1` (a loop carries a local an update writes); `*=` joins
`+=` and `-=` (the compound writes the lint admits).
Soundness: JavaScript answers `NaN` or an infinity for a zero divisor, which neither the int nor the real reading
holds: the mark makes the lemma's conclusion fail there, never a default value read as the answer. A negative zero is
equal to zero under `===`, prints as `"0"`, and every division by it marks the world; `Object.is` stays out.
Out: `**`, `/` in an int file (it makes the file real, outside `Math.floor` and `Math.trunc`: step 14), a division
inside a callback (its mark has nowhere to go), an update used as a value (`a[i++]`), the compound writes the lint
refuses (`%=`, `/=`, the bitwise ones).
Pair `heap5_arith`: `total` (WITNESS), `evenQty` (a negated opposite test: proved), `bump` (`++` as `+= 1`, `|` with
its operands swapped: proved), `share` (the divisor named first: equal in JavaScript and unproved, since the lemma
must show no zero divisor), `debt` (untouched negation). Lint: unchanged.
Census (resolved, 39 roots), strict graph 706 -> 735, own syntax 1759 -> 1853; `curve.md` expects 1485 after its step 13:
```text
{"files":23359,"units":53918,"core":735,"heapOwnFit":1853,"mirrorMismatch":1711,"planErrorCount":0,"seconds":330}
```

### 13, 2026-10-31: the bitwise reading over doubles the model does not hold
What was lost: the faithful number reading (`translate/faithful.mjs`, `design/doubles.md`, 29 Oct) read a bitwise
operator as exact only when both operands were exact; on a field, a parameter or a call result it became an
uninterpreted `Math.__lean_bitor` and kin. Those symbols commute for nothing, so the lemma lost every proof this
section gives (pair `heap5_arith` `bump`, `|` with its operands swapped: proved on 27 Oct, unproved since 8b4cf444).
The binary64 decision proves the pure-value units again, but it does not encode a field write.
What is read: a bitwise operator reads ToInt32 of its operands (ToUint32 for the left of `>>>` and for a shift count:
the same 32 bits, which the helpers read modulo 2^32). Its result is an int32 (a uint32 for `>>>`) whatever the double
holds, so the result is exact in the faithful reading, with the interval I32 (U32). An operand the model does not hold
passes through one uninterpreted function, `Math.__lean_toint32` (the same symbol on both sides, an integer the helper
reads modulo 2^32). The operator is then the ordinary lane's bv32 helper, as this section says. `~x` is read the same
way. One mechanism: `exactOf` (a bitwise result is exact), and `bitOperand`, which wraps such an operand in `text`.
Soundness: under the interpretation of `__lean_toint32` as ToInt32 of the double, each helper computes JavaScript's
operator. The value of the uninterpreted function is used only modulo 2^32, so no range is assumed for it.
What stays out: the bitwise compound writes (`|=` and kin: the lint refuses them, as above). A chain of bitwise
operators whose lemma needs the 32 bits to survive the int round trip (`x & ~1` against `(x >> 1) << 1`): the reading
is exact, but Z3 4.12 does not decide `bv2int` against `int2bv` within the time limit. Reading the chain as one bv32 term
with a single ToInt32 at its top was tried and left out: Z3 still times out once `bv2int` appears in the query, even
with the bv32 equality given as an assertion. Pair `arithmetic_core` keeps that unit (`clearlow`) unproved and names it.
Pair `arithmetic_core` (a real file): the proved units are `orflag`, `toint`, `nibble`, `twice`, `uint`, `shift`,
`bump`, `ratio`, `setflag`, `stamp` and `store`. Witnessed: `parity` and `orwitness` (binary64), `setwitness` (lane B).
`heap5_arith` `bump` is proved again.

**Merged with 21b (2026-10-31).** Two lanes read the same rule the same night. The lead keeps one mechanism, 21b's: the operator stays in the text and only a non-exact operand is wrapped, as `Math.__lean_int32(x)`; the symbol `__lean_toint32` and the rewrite of the operator into a bv32 helper described above were replaced at the merge, so `bitwiseOf` reads `x | 0`, `~~x` and the other ToInt32 forms as one term on both sides. The pair `arithmetic_core` is kept and must stay green under the kept mechanism.

## 14. Pure globals

Reading: a global of the platform (never a name the file declares), each a function of its arguments: `Math.max` and
`Math.min` (the ordinary lane's `Max` and `Min`, nested for more arguments), `Math.abs`, `Math.sign`, `Math.ceil`,
`Math.round` (its helpers), `Math.floor` and `Math.trunc` (an int is its own floor; `Math.floor(a / b)` in an int file is
`FloorDivT`, a zero divisor marking the world; a real's `.Floor`), `String(x)` of a primitive or an optional primitive
(the template conversion of step 1), `Array.isArray` of an array (`true`) or a primitive (`false`), and `Object.keys` of a
dictionary: a fresh array of `DictKeysJs(keys)`, a bodiless function of the insertion sequence (JavaScript puts
integer-like keys first, ascending, then the rest in insertion order).
Soundness: each is exact on the values the core holds or a function of exactly what decides it; `Array.isArray` of a
record is not read (an array is a record of its type), `Object.keys` of a record is not read (an object may hold more
keys than its type names).
Out: `Math.random` (the world), `Number(s)` and `JSON.parse` (NaN, any), `JSON.stringify` (it walks the graph and may
call `toJSON`), `Object.values` and `Object.entries`.
Pair `heap5_globals`: `spread` (`Math.abs(high - low)` for max minus min: proved), `half` (WITNESS), `title` (a template
for `String(count)` and `+`: proved), `distance` (untouched), `listed` (`true` for `Array.isArray` of an array field:
proved), `noteCount` (untouched, `Object.keys` of a dictionary). Lint: unchanged.
Census (resolved, 39 roots), strict graph 735 -> 790, own syntax 1853 -> 1994; `curve.md` expects 1669 after its step 14:
```text
{"files":23359,"units":53918,"core":790,"heapOwnFit":1994,"mirrorMismatch":1852,"planErrorCount":0,"seconds":330}
```

### 14b. Number and JSON forms (2026-10-31, lane core-pure-globals)

Measured first: at the v0.1.2 candidate every Math form above was read (the other Math functions, `sqrt`, `pow`, `log`,
reach the core as the faithful reading's `Math.__lean_*` externals), and the core stopped a unit at every Number and JSON
call: `Number(n)` as `call outside the file`, `Number.isInteger(n)` as `call .isInteger`, `JSON.stringify(s)` as `call
.stringify`. Such a unit fell to the ordinary lane, which withholds the lemma of a unit that writes through an input
another input of the same shape may alias; the core reads that aliasing exactly, so the unit stayed unproved.
Reading (`globalCall` in `translate/heap.mjs`, one recognizer, one emitter): `Number(x)` of a number is `x`, of a boolean
`if b then 1 else 0` (ToNumber, 7.1.4); `Number.isInteger`, `isFinite`, `isNaN` and `isSafeInteger` of a number are the
ordinary lane's bodiless `ext_call_args_Number_<m>_<T>`, so both lanes read one predicate with one symbol;
`JSON.stringify(x)` of one primitive (a string, a number, a boolean, a literal union of one of them) is a bodiless
`ext_JSON_stringify_prim_<T>(x)`, a function of the value alone.
Soundness: ToNumber of a number is the number, on every double. The predicates answer nothing the lemma could use, so the
core never takes a number for an integer or finite: in an int file `Number.isInteger(n)` against `true` stays unproved,
where reading the file's domain would have proved it falsely. SerializeJSONProperty (25.5.2.2) looks up `toJSON` only on
an object or a bigint, and a string, number or boolean never throws, so the call runs no user code and its text is
decided by the primitive; a number's text (`"null"` for NaN) is left uninterpreted, so two numbers give one text only
when they are one number. None of these is a doubles bearing site (`translate/smt-fp.mjs`): each is either exact on
every double or uninterpreted, so the int or real lemma of a unit that is not number-bearing stays faithful.
Out, kept: `Number` of a string or of an optional value, `parseInt`, `parseFloat` (NaN: the ordinary lane makes such a
unit opaque by its text, `number_special`), `JSON.parse` (any), `JSON.stringify` of a reference, of an optional value
(`undefined` is no string) or with a replacer or an indentation, `Number.isX` of a value that is not a number, and
`Math.random`. Where the section was silent the choice is these bodiless readings, never an answer read from the file's
number domain.
Pair `pure_globals` (one unit per form): `widest`, `lowest`, `trend`, `ceiling`, `chopped`, `halves` (each
rewritten: proved by the doubles reading), `gap` (`|-(h - l)|`: proved), `nearest` (`floor(x + 0.5)` for `round`:
WITNESS), `caption`, `root`, `asCount` (Number of a number dropped: proved), `isWhole`, `quote` (the call named before
the field write: proved), `finite` (another field: unproved, lane B WITNESS), `encodeCount` (proved), `stamp` (two
writes through `a` from `b`, which may be `a`, in the other order: withheld before, proved in the core after), `parsed`
(`+s` for `Number(s)`: equal in JavaScript and unproved, out). Found on the way, outside this construct: the doubles
reading answers unknown within 60 s on `Math.abs(h - l)` against `Math.abs(l - h)`, equal on every double.
Census, base `b5c074508` against `2fc3bb0ff`. `census.mjs` (the lint's admission; nexus as `--include apps/backend/src/`,
the full root did not finish in two hours): n8n 2,680 of 9,610 entered, langchainjs 2,766 of 6,709, nexus backend
12,656 of 23,328, the same before and after, no reading gaining or losing a unit (`census.mjs --diff`): the reading
changes what lane A proves, not what the lint admits. The heap core itself (`makeHeap` planned over every unit with the
translator's `helper` and `external` hooks, modules resolved; `design/heap-reach-census.mjs` passes no `external`):
```text
n8n:          core 82 -> 83;  entered 1 (call .isInteger); moved 2 (call .isInteger -> statement ThrowStatement)
langchainjs:  core 30 -> 30;  moved 1 (call .isNaN -> called by a unit outside the core)
nexus backend: core 271 -> 273; entered 2 (call .isFinite, call .isInteger); moved 6 (call .stringify -> element access
              of a non-array 2, -> called by a unit outside the core 1; call .isInteger -> called by a unit outside the
              core 1, -> statement ThrowStatement 1; call .isFinite -> division in an int file 1)
```
No unit left the core. The `call .stringify` first stops that remain after (n8n 1, langchainjs 1, nexus backend 5, from
1, 1, 8: each `JSON.stringify` of an array, a record or with an indentation) are the section's Out.

## 15. Outside calls

Reading: a call of an imported function is a transition of the whole heap world, a bodiless
`function Call_<name>_<key>(hw: HWorld, a0: T0, ..): (HWorld, R)` keyed by the module specifier, the exported name and
the Dafny types of its arguments and result (`()` for a procedure). The arguments are evaluated in order, then the
transition takes the current world and returns the next one and the result; what follows reads the world it returned.
Soundness: the transition may write every object, allocate, and return an existing reference (no frame is assumed, so
a refactor that moves a read across a call is unproved: `price(i.id) * i.qty` reads the quantity after the call). The
same import on the same world and arguments is the same transition; the environment is a function of its history,
which the returned world can carry, so two calls never share an answer the lemma did not prove (`twice` calls once for
twice: unproved). The identity certificate is the proof: the same transitions in the same order. A transition may run a method
of an object it reaches (an instance of a class of this file, an object literal with methods built here), and the
world holds fields, not code: so every transition's key also carries a hash of the texts of the file's class members
and object-literal methods, and a changed method makes every transition another one (unproved), never the same
transition over different code (found on step 20's pair: a call of a changed decorated method was proved equal).
Out: a call inside a loop body (it could grow the array the loop walks) or a callback, an imported function named as a
value, an async or generic call, a spread argument, an argument that is `undefined`, and every outside call in a file
with a discriminated union (step 12). A call of a method of an imported namespace or a handle is step 18.
Pair `heap5_outside` (a sibling module `store.ts`, resolved by the suite's reading): `cost` (the call's result named
first, the same order: proved), `persist` (the save moved before the increment: unproved, WITNESS), `twice` (unproved;
lane B's fakes answer both calls alike, PASS-bounded), `order` (the save moved before the price: unproved). Lint:
unchanged.
Census (resolved, 39 roots), strict graph 790 -> 876, own syntax 1994 -> 2159; `curve.md` expects 2000 after its step 15:
```text
{"files":23359,"units":53918,"core":876,"heapOwnFit":2159,"mirrorMismatch":2017,"planErrorCount":0,"seconds":330}
```

### 15b. The operands before the transition, the right of && and || in its branch (2026-10-31, lane core-outside-calls)

Two parts of the reading above were not what the emission did. "The arguments are evaluated in order, then the
transition": a world read is code over `hw_`, written where its value is used, and a call's line is pushed before
that use, so in `total(i.qty, bump(i))` and `i.qty - bump(i)` the quantity was read in the world `bump` returned.
And a transition in the right operand of `&&` or `||` had its line pushed with the left operand's, so
`c && bump(i) > 0` ran `bump` whatever `c` held. Both proved a changed unit: pair `outside_calls` (sibling
`store.ts`, where `bump` writes its argument), at lead-b5c07450 `read_first` (the quantity read after the call
instead of before) and `guarded` (the call moved out of the `&&`) proved while lane B witnessed them, and their
same-order twins `read_first_named` and `guarded_if` unproved.
Reading: an operand followed, in the same expression, by an operand that may write a cell (an outside call or a method
transition, a same-file unit or constructor, `Object.assign`, `reverse`, `splice`) has its code bound where it
stands when that code reads the world; the order is source order up to the enclosing statement (an assignment's
target receiver comes before its right side, as JavaScript evaluates it). A right operand of `&&` or `||` that emits
lines (a transition, an allocation, a mark) runs in its branch, `var (hw_, q) := if l then (lines; (hw_, r)) else
(hw_, false)`, as a conditional's operands already did. The mechanism is the expression's, not the call's: the same
order held wrongly for a same-file unit that writes (`i.qty - bump(i)` with `bump` in the file), which the lint does
not refuse; the `&&` case of a same-file writer is refused by the lint (`conditional-effect`).
Stays as it was, and why: a field written after a transition and read back is not the value written
(`written_back`, unproved): the transition leaves no frame, so the argument's cell after it is unknown (a callee may
install an accessor whose setter keeps nothing); the doubles reading does not encode an outside call, so a
number-bearing unit with one rests on its real lemma (the faithful congruence) as before; the census admission is
unchanged (the test of what enters the core is untouched, only what it is translated to).
Pair `outside_calls`: `used_once`, `used_twice` (two fields of a returned reference), `passed_on`, `passed_local`,
`read_first_named`, `guarded_if` proved; `written_back`, `called_twice`, `passed_swapped` (WITNESS), `passed_ref`
(WITNESS), `read_first` (WITNESS), `guarded` (WITNESS) unproved. Census before and after: lane result
`lane/core-outside-calls-result.md`.

## 16. Map and Set with record keys or items, the copy forms

Reading: a Map's keys and a Set's items may be references (`Set<Tag>`, `Map<Tag, number>`): the table's rows already
compare by Dafny equality, which on `Ref` is identity, SameValueZero's meaning on objects; the well-formedness states
every key or item is a cell of its shape. `m.get(k)` of a primitive value is an option (`MapGet_`). The copy forms
allocate a fresh cell of the source's contents: `new Set(xs)` of an array (the first of equal items kept, in order,
`Dedup_`), `new Set(s)`, `new Map(m)`, and `Array.from(x)` of an array or a set. (Date cells, their UTC getters and the
one-level `structuredClone` were already read.)
Soundness: identity is what SameValueZero compares on objects, and two records with equal fields are two keys, as in
JavaScript. A set of references or a map keyed by references holds edges the canonical naming walk does not follow
(its items and keys are not in `CanonEdges`), so a file with one carries only the whole-heap certificate (no
`// CANON` block): a fresh key cell unreached by the walk can never pass unnamed.
Out: `get` of a reference value (an absent reference), iteration (`forEach`, `keys`, `values`, `entries`, spread), a Map
or Set of optional values, a copy between different shapes.
Pair `heap5_cells`: `mark` (untouched, an add of a record), `isSeen` (WITNESS), `countOf` (the get named before `??`:
proved), `unique` (untouched, `new Set(ids).size`), `copyIds` (a spread literal for `Array.from`: proved). Lint:
unchanged.
Census (resolved, 39 roots), strict graph 876 -> 886, own syntax 2159 -> 2182; `curve.md` expects 2146 after its step 16:
```text
{"files":23359,"units":53918,"core":886,"heapOwnFit":2182,"mirrorMismatch":2040,"planErrorCount":0,"seconds":330}
```

### 16b. Lane B draws the argument itself as a key or an item (2026-10-31)

Found: the heap core read every form of this section (pair `map_set_copy`: a Map keyed by records, a Set of records, `new
Set` of an array of records, `new Set(s)`, `new Map(m)`, `Array.from` of a set, each proved or unproved as written), but
lane B never reached a difference that only identity shows. `exec/korat.mjs` pooled record fields, record arguments and
arrays of records, and left a `Set<Tag>` or a `Map<Tag, V>` to the seeded generator, which fills it with fresh records:
no item or key was ever an object an argument holds, so `s.has(t)` was false on every input and a candidate asking
`s.has({ name: t.name })` (another key under SameValueZero) stayed PASS-bounded.
Reading: a Set whose items are records, and a Map whose keys are records, is a pool slot like an array of records, in
an argument or a record field: it ranges over every sequence of distinct pool objects up to k (the items or keys in
insertion order, so `{a, b}` and `{b, a}` are two heaps); a Map's values are drawn per entry position by a generator
seeded by the slot, so one structure draws the same values on every build and each side still gets its own objects.
Soundness: this widens what lane B tries, never what it concludes; distinct indices keep a Set's items and a Map's keys
distinct, as the cell holds them. Stays to the generator: an item or key type that may be absent (`Set<Tag | null>`: the
pool holds no null), an optional or nullable Set or Map field, a Map whose values only are records (the values are
drawn, not pooled).
Pair `map_set_copy`: `hasTag` and `isSeen` (a Map and a Set asked for a new record with the argument's name: unproved,
WITNESS; PASS-bounded before), `countFor` (the get of a record key named before `??`: proved), `distinctTags`,
`copySeen`, `copyCounts`, `tagList` (named copies: proved), `bumpCopy`, `addCopy` (the copy written, then read in place
of the source: WITNESS). Left: korat's odometer varies a record's first slot slowest, so with the suite's 30 inputs a
Map field placed first in a record of three slots reaches its first key past input 30 (`check.mjs`, 200 inputs, finds
it); the pair asks the identity questions of Map and Set arguments. The census lints and never runs lane B, so it is
unchanged (the numbers in `lane/core-map-set-copy-forms-result.md`).

## 17. Tuples and intersections

Reading: a tuple of required elements of one shape (`[number, number]`) is an array of that shape whose length is fixed
on entry: the hypothesis of a parameter states `Len_A_int(hw_, r) == 2`, and its reads are element reads (step 4's marks
apply, the hypothesis making them provable). A tuple of mixed shapes (`[string, number]`) is a record of its positions
`_0`, `_1`: a literal index reads or writes a field, `length` is the arity, a tuple literal allocates the record. An
intersection of records is the record of all their fields (a type alias of the same fields is the same constructor);
an intersection of one primitive and records (a branded `string & { __brand: "Id" }`) is the primitive.
Soundness: a tuple of one shape stays an array so that it may alias an array of that shape (two views of one object);
a tuple of mixed shapes cannot be the object of an array type with a shape (its elements would break that type), so a
record of positions excludes no realizable sharing. A brand is a type-level tag only: the value is the primitive.
Out: optional and rest elements, a spread into or out of a tuple, destructuring (step 24), a non-literal index into a
tuple of mixed shapes, an intersection with a function or a primitive with methods.
Pair `heap5_tuples`: `width` (the first position named first: proved, the reads in range by the hypothesis), `show`
(WITNESS), `make` (untouched, a tuple literal of mixed shapes), `tagOf` (an intersection's field named first: proved),
`idLength` (untouched, a branded string's length). Lint: unchanged.
Census (resolved, 39 roots), strict graph 886 -> 901, own syntax 2182 -> 2216; `curve.md` expects 2274 after its step 17:
```text
{"files":23359,"units":53918,"core":901,"heapOwnFit":2216,"mirrorMismatch":2074,"planErrorCount":0,"seconds":319}
```

### 17b. A tuple destructured, a type parameter bounded by records, two tuples in one file (2026-10-31)

Read (`translate/heap.mjs`: `tupleBinding`, `boundShape`, `genericArgWhy`, the prelude's `fld`):
- `const [a, , b] = e` where `e` is a tuple (step 17's two readings). The array's iterator yields its elements in order,
  so each name is the element at its position, read in order, and a hole skips one: a field `_i` of a tuple of mixed
  shapes, an element read with its out-of-range mark for a tuple of one shape (the unit carries `// INRANGE`; a
  parameter's hypothesis or the callee's allocation shows the reads in range). `Array.prototype[Symbol.iterator]` is
  assumed unpatched, as for-of over an array already assumes. The source is evaluated once, before any name is bound.
- A type parameter `T extends A & B` whose bound is a record (an intersection of records, or one record) is the record
  of the bound's fields. A value of T is an object of a subtype of the bound, and shapes are views (an object may hold
  more keys than its type names), so the value is read as a parameter typed by the bound is read: the same hypothesis
  `IsR_<bound>`, the same field reads and writes, and a result of type T is the reference.
- A call of a generic same-file unit passes, for each parameter of a reference shape, an argument of exactly that shape.
  The callee reads the cell through the bound's constructor, and a wider record (`Person` with an `id` beside the
  bound's fields) is another constructor whose reads there would be defaults. A caller passing another shape stays out
  of the core, and with it the callee (`called by .., outside the core`).
- A field name that two records of one file hold at two Dafny types (the positions `_0`, `_1` of two tuples of mixed
  shapes, `id: number` beside `id: string`) gets one destructor per constructor (`u_0_<key>_f`). Dafny gives a
  destructor one type, and before this change such a file's prelude did not resolve, so no lemma of it was proved.
  A name holding one type keeps its destructor `<name>_f`, so every other prelude is byte-identical.

Stays refused, and why:
- A rest element, a default (it reads `undefined` past the end) and a nested pattern: the reading names one element per
  position. A `let` pattern (a name rebound later) is refused: the core's writes to a local are not read for pattern
  names. A pattern longer than the tuple, or one whose source is not a tuple (`const [a] = xs` of `T[]`, whose length
  is not known), is refused, as is a pattern of a tuple of one shape in a real file (an element index there is an
  integer of the int reading only).
- A destructured parameter (`([a, b]: [number, number]) =>`): the core's parameters are names.
- A type parameter with no bound, or a bound that is not a record (a primitive, an array, a union, a dictionary): a
  subtype there may be a value the bound's shape does not hold (a tuple for an array, a literal for a primitive), and
  this reading does not decide it. A bound of `T & X` (an intersection holding a type parameter) has no shape.
- A call of a generic unit with an argument of another shape, as above. The same reading of a non-generic callee (a
  `Person` passed to a `Named` parameter) is outside this section. It is reported in the lane's result
  (`lane/core-tuples-intersections-result.md`) and left as it is.

Pair `tuples_intersections` (17 checks): `spread` (a tuple of one shape a callee returns, destructured, against indexed:
proved, in range through the callee's allocation), `caption` (`=` for `:` between the positions of a destructured tuple
of mixed shapes: WITNESS, unproved), `describe` (a field of a `T extends Named & Aged` named first: proved), `older`
(`+= 2` for `+ 1` through that parameter: WITNESS, unproved), `width` (a tuple of records destructured against indexed:
proved), `tag` (untouched, a tuple of two record shapes destructured: proved), `joined` (the references of a tuple of
records swapped: WITNESS, unproved), `ends` and `entry` (untouched). Before this reading the pair's parent did not
translate: the ordinary lane refuses `older`'s write through a type parameter (`field age is not a declared field of a
record`).

Census of the heap core, unit by unit (the plan of `design/heap-core-census.mjs`, modules unresolved, before at
b5c07450 and after at 5bda69a7):

| Root | Units | Core | Moved to another stop |
| --- | ---: | ---: | --- |
| n8n | 9,609 | 49 -> 49 | 9: `binding form` -> `destructuring of a non-tuple` |
| langchainjs | 6,705 | 16 -> 16 | 1: `binding form` -> `destructuring of a non-tuple` |
| nexus | 43,944 | 294 -> 294 | 17 `binding form` -> `destructuring of a non-tuple`, 1 -> `calls a unit outside the core`; 26 `generic` -> their next stop (9 `parameter type`, 4 `return type`, 2 each `element access of a non-array`, `parameter form`, `call outside the file`, `called by a unit outside the core`, 1 each `call .keys`, `callback form`, three `outside name`) |

No unit entered or left the core. The destructurings met in these roots are of `string[]` (`s.split(..)`), whose length
is not known, and each generic unit had a second stop. 12 nexus rows differ only in a unique symbol's id between two
program builds (`__@NARROWING_DECIDED@<id>`), which is not a move.

### 17c. Array methods on a fixed tuple (2026-10-31)

Read (`translate/translate.mjs`: the array-method dispatch, `seqOf`, `tupleParts`, `tupleWrite`; `translate/heap.mjs`:
`freshPrimArrayCall`):
- The value reading holds a fixed tuple (every element required, no rest) as a Dafny tuple `(A, A)`. An array method
  reads its receiver's `length` and its indices 0 .. length - 1 (23.1.3), so the dispatch reads the receiver through
  `seqOf`, which reads a fixed tuple of one element type as the sequence of its positions, `[t.0, t.1]`. Every method
  of the dispatch (map, filter, some, every, find, includes, indexOf, slice, join, concat, ...) takes that sequence.
  Before, the receiver was the tuple itself where a sequence is expected: the file did not resolve, and every lemma of
  it went unproved (lane conformance-array-copies' finding).
- The identity guard's fact that map, filter, slice, ... over primitives make a fresh array holds of a tuple receiver
  too: a tuple is an array object, and the method makes a new array of it as of any array (ArraySpeciesCreate).

Stays refused, and why:
- A tuple of differing element types (`[string, number]`) or with an optional element: no one element type holds every
  position (`a tuple of .. read as a sequence needs one element type`).
- A write in place through such a tuple (`pop`, `shift`, `splice` as a value; `pop`, `reverse`, `sort`, ... as a
  statement, on a local; the lint already refuses them on a parameter): the write's result is a sequence, which the
  tuple-typed name cannot hold, and a write that changes the length leaves the tuple's type behind. Before, these also
  emitted a file that did not resolve.

Pair `tuple_array_methods` (17 checks, heap off, `[string, string]`): `mapped` (map against its positions written out),
`has` (includes against two comparisons), `position` (indexOf), `joined` (join), `tagged` (an indexed map callback),
the last three against the same method on the literal of the tuple's positions, and `kept` (filter, untouched):
proved; `sliced` (`slice()` against `slice(1)`) and `anyEmpty` (`some` against `every`): unproved, lane B WITNESS.
Red on the base: 6 rows (the file did not resolve; `mapped` and `tagged` were also withheld by the identity guard).
indexOf, join and an indexed map on a two-element literal are not proved against their unrolled forms (`a === v ? 0 :
..`) for an array literal either (the helpers' recursion is unfolded once): a limit of the prover, not of this reading.

## 18. Class instances and handles

Reading: a handle is a parameter or local of an object type with methods that is not a record the core reads (an
interface with methods, a class of another file): a reference with no cell the heap models (no hypothesis, no field
read). A call of its method, and a call of a method of another instance of a class of this file (`a.deposit(n)` where
`a` is not `this`), is a transition of the whole heap world, `HCall_<method>_<key>(hw, receiver, args): (HWorld, R)`,
keyed by the type's name (its own name for a type the file declares, its qualified name otherwise), the method and the
Dafny types and the file's method code (step 15); the receiver is evaluated first, then the arguments.
Soundness: a subclass in another file may override the method of an instance handed in, and lane B runs such an
instance as an outside object and observes the call (pair: `fund` writes the field the method writes; lane B witnesses
the other trace, and the transition keeps lane A from proving it). A handle has no cell, so it may be the same object as
any record or another handle: nothing excludes that sharing, and the transition may write every cell. The same
transitions in the same order on the same world are the proof (`report`).
A global of the platform (`Math`, `JSON`, `console`) is never a handle: step 14 reads its pure members, the rest stay out. Out: a handle inside a record, an array or a map (handles are values of parameters and locals only), a field read of a
handle, a method named as a value, a handle call in a loop, a callback, or a file with a discriminated union (step 15).
A field read of an instance of a class of this file stays the record read of row 1 (lane B traces it as a read of an
outside object, the ordinary lane's assumption that no subclass replaces a field).
Pair `heap5_handles`: `fund`, `settle`, `transfer` (WITNESS each, unproved), `audit` and `Account.deposit` (untouched),
`report` (the balance named first: proved). Lint: unchanged.
Census (resolved, 39 roots), strict graph 901 -> 917, own syntax 2216 -> 2269; `curve.md` expects 2572 after its step 18:
```text
{"files":23359,"units":53918,"core":917,"heapOwnFit":2269,"mirrorMismatch":2127,"planErrorCount":0,"seconds":305}
```

### 2026-10-31: the instance held (lane core-class-handles)

Read: a const local bound to a parameter of the unit that holds an instance of a class of this file (`const h = a`), or
to a field path of one (`const h = b.inner`), is another name for that cell: a field written through it (`h.total += n`,
`h.total = v`, `h.n++`) is the core's field write on the one reference both names hold, a method called through it is
step 18's transition on that receiver, and a callee of this file handed it receives the same reference. The core
already read all of this (a local of a reference shape is a `Ref`); the lint refused the write as `alias-mutation`,
since its held-alias rule (heap shapes) took a plain data record or an array one field step below a parameter only. It
now also takes an instance of a class of this file at any depth, the parameter itself included (`lint.mjs`
`fileInstance`, `heldAlias`). A handle (an interface with methods, a class of another file) held in a local was
already read: it is only ever a call's receiver, never written.
Soundness: a unit the core does not take is read as a value tree, where `const h = a` copies the record and the write
through `h` never reaches `a`. The identity guard missed that write (it counted an alias one level down only), so the
value reading would prove a changed unit equal. The guard now names a write through a const local bound to an input itself
(a `let` name the lint admits a write through is fresh there, its flow-sensitive alias rule; `layer1Risk`: "write through another name of an input"; `identitySkeleton`: such a local is an input alias, its write
an unreadable path), so that unit keeps no value lemma and lane B decides. A write through a held name of a class of
another file or a handle stays refused: the core has no cell for it.
Stays refused: a write through a name bound to a plain data record parameter itself (`const h = p` with `p` a plain
record: outside this section, found and reported), a `let` name, a name bound to `this`, to an element, or to a call's
result, a name the unit passes to a callee that writes it before the lint's alias rules allow it (`aliasCalls`).
Pair `class_handles`: `held` (a field write and a method call through a second name: proved), `keep` (a handle's methods
through a local: proved), `alias` (WITNESS, unproved), `twice` (two names of one instance: proved), `both` (two
handles that may be one object: WITNESS, unproved), `pay` (a second name handed to a callee that writes it: proved),
`step` (proved), `charge` (WITNESS, unproved), `spill` (out of the core, a handle called in a loop; the value lemma
withheld by the guard, WITNESS; with the lint widened and the guard as it was, lane A proved it), `add`, `bump`, `log`,
`Account.deposit` (untouched). At the base the lint refused `held`, `alias`, `twice` and `spill`.

## 20. Decorators read as metadata

Reading: a decorated class is read like any other: a method's body is its text whatever a decorator wraps around it.
Two places where a decorator may have replaced what it decorates are not read through its text: a call `this.m()` in
a decorated class, or of a decorated method, is a transition (step 18's, keyed by the class, the method and the file's
method code, decorators included), and a decorated field keeps the class out (a decorator may install an accessor
there). An abstract class stays out.
Soundness: a decorator runs once, when the class is defined, and may return a replacement class or method descriptor;
reading `this.m()` as the transition never assumes the prototype's m is the declared text. A class decorator returning
a subclass that replaces a field by an accessor is the case of a subclass in another file, which the ordinary lane and
row 1 already assume away for fields; it is named here as the reading's assumption. The transition's key carries the
file's method code, so a changed method (decorated or not) is never the same transition: pair `heap5_decorators`
`clear` calls the changed decorated `reset` (lane B: WITNESS; lane A: unproved).
Out: decorated fields and accessors, abstract classes, a decorator expression the class reads back.
Pair `heap5_decorators` (a sibling module `meta.ts` holds the decorators): `Counter.bump` (`+ 0` on its result:
proved), `Counter.reset` (WITNESS), `Counter.twice` (untouched, unproved: its calls of bump are transitions over the
changed method code), `Counter.clear` (WITNESS, unproved). Lint: unchanged.
Census (resolved, 39 roots), strict graph 917 -> 920, own syntax 2269 -> 2272; `curve.md` expects 3673 after its step 20:
```text
{"files":23359,"units":53918,"core":920,"heapOwnFit":2272,"mirrorMismatch":2130,"planErrorCount":0,"seconds":304}
```

## 21. Constructors

Reading: `new C(..)` of a class of this file (row 1's conditions, and not decorated: a class decorator may return
another class) runs `C.constructor` when the class declares one, `(hw_, params) -> (HWorld, Ref)`, else allocates
inline. A constructor allocates the instance first, `Alloc_<K>` with each field's default, then stores the parameter
properties and the field initializers in declaration order, then runs its body (the procedure reading of step 8: an
`if` may fall through) on the fresh reference, and returns it.
Soundness: JavaScript creates the object before any initializer or the body runs, so the instance takes `next` first
and an initializer's allocation comes after it, as here. Every field is stored before the body ends (row 1's rule: an
initializer, a parameter property or a top-level `this.f = ..` of the body), and in a constructor `this` is only
written: a read could meet a field not yet stored (JavaScript reads `undefined`), a call `this.m()` could run a
subclass's override on a half-built object, and `this` handed anywhere escapes half-built. A field initializer
neither reads `this` nor is a function.
A method call `c.m(..)` on a const `c` bound to `new C(..)` in the unit is the core call `C.m` with `c` its receiver:
that instance is exactly a C (no subclass can be behind it, and C is not decorated), so step 18's transition is not
needed there.
Out: `super`, a `return` in a constructor, a constructor that reads or hands `this`, a decorated class's `new`, a
class that extends or is extended, a field initializer that reads `this`.
Pair `heap5_ctors`: `origin` (WITNESS), `start` and `Tally.constructor` (the label stored through a local: proved),
`empty` (untouched, an inline allocation with its initializers), `shifted` (the moved coordinate named before the
construction: proved), `Point.constructor` (untouched, parameter properties), `build` (a method of a Tally it built
against the count written in place: proved), `Tally.bumped` (untouched). Lint: unchanged.
Census (resolved, 39 roots), strict graph 920 -> 935, own syntax 2272 -> 2330; `curve.md` expects 4905 after its step 21:
```text
{"files":23359,"units":53918,"core":935,"heapOwnFit":2330,"mirrorMismatch":2188,"planErrorCount":0,"seconds":279}
```

### 2026-10-31: the exact instance must be unshared (lane core-constructors)

Found by the pair `constructors`, a soundness defect of the method-call reading above. `new C(..)` fixes the instance's
prototype, not its own properties: code that holds the instance may install an own `m` (`(o as any).m = f`,
`Object.defineProperty`), and an outside callee (step 15) or a transition (step 18) does it unseen, since a cell holds
the fields and never the methods. `const t = new Tally(n); patch(t); return t.bumped();` was read as `Tally.bumped`
after the call of `patch`: lane A proved it equal to writing the count in place, and lane B, running an outside `patch`
that installs `bumped`, witnessed 99 against the count.
Reading: `c.m(..)` on a const `c` bound to `new C(..)` is the core call `C.m` only while `c` is unshared: every use of
`c` in its scope is a field read or write (`c.f`, f a field of the instance), a bare `return c` (nothing runs with the
instance before the unit ends), or the receiver of `c.m2(..)` whose method keeps `this` the same way (`this.f`,
`this.m3(..)` of such a method, an arrow inside it reading the same `this`; recursion through the methods closes on the
ones already met). Any other use shares it: an argument (an outside callee, a same-file function, a constructor), a
store into a cell or a collection, an alias, a computed key, an accessor, an optional chain, `this` handed by one of the
methods. A shared instance's method call is step 18's transition (keyed by the class, the method and the file's method
code), so lane A no longer proves what the installed method may change.
Where the section was silent, the choice keeps soundness: the test reads every use in the scope, not only the uses
before the call (a loop may run a later use first), and an accessor or a computed key counts as sharing (its code is
not read here). A use after a `return c` cannot run before the caller holds the instance, so `return c` is no sharing.
Stays as before: `super`, a `return` in a constructor, a constructor that reads or hands `this`, a decorated class, a
class that extends or is extended (the ordinary lane reads those: pair `constructors` `Square.constructor`, proved
there, `Triangle.constructor`, WITNESS). Checked, not changed: `this.m()` in a method of an exported class after
`patch(this)` was already a transition (`sealedMember`: another file may subclass it), so lane A did not prove it.
Pair `constructors` (a sibling `outside.ts` installs `bumped`): `Meter.constructor` and `metered` (an initializer the
body stores over: proved), `Gauge.constructor` (a changed initializer: WITNESS), `Span.constructor` (parameter
properties, untouched), `span` (WITNESS), `Cell.constructor` and `sized` (private and public parameter properties, the
count through a local: proved), `Shape.constructor`, `Square.constructor` and `perimeter` (super with the same value:
proved), `Triangle.constructor` (WITNESS), `kept` (an unshared Tally: proved), `handed` and `relayed` (WITNESS; at
the previous commit lane A proved both). Lint: unchanged.

## 0b. The identity guard reads destructured and rest parameters

Found by lane lint-2, a measurement defect of step 0's kind: `identitySkeleton` and `layer1Risk` collected identifier
parameters only, so a destructured field and a record rest (`function Card({ title, ...rest }: P) { return <div
{...rest} /> }`) had no path term, and every lemma whose result carries such a rest was withheld as "identity shape
unreadable". Now a destructured field is the input path `arg<i>.f` and a rest a fresh node whose members are the
input's (the reading `{...p}` already had); `layer1Risk` counts a binding as an alias of the input one level down (a rest
at the input's own level), so a write through one is a write below the input. A binding with a default, or one the unit
writes again, keeps no term.
Soundness: a destructured field is read once, at entry, from the input; a rest is a shallow copy, so its members are
the input's members and its own identity is fresh; the guard compares the two versions' skeletons site by site as before.
Pair `heap5_rest` (`.tsx`): `Card` (the title named first, the same tree over the same forwarded members: proved, where
the lemma was withheld), `Badge` (a changed member forwarded: the shapes differ, withheld, WITNESS), `Plain`
(untouched). Lint: unchanged.

## 21b. Three readings shared with the ordinary lane

Found by checking the suite's other pairs against the widened core, decided by the lead: the core never loses a proof
the ordinary lane had soundly. (1) The bitwise operators read through the translator's own `bitwiseOf` (shared, passed
to `makeHeap` as `bitwise`): `x | 0` and `~~x` are `JsInt32`, a literal shift count keeps its low five bits (pair
`numbers_bits` `coerce`, `unsigned`: proved again). (2) A loop helper whose body never rebinds the world carries
`ensures r_.0 == hw_`, proved by its own recursion, so a mark after the loop (a division's zero divisor or negative
zero) reads the world before it (`numbers` `average`: proved again). (3) A for-of loop in a real-number file keeps its
counter and length integers (`|Items_|`) and reads its item through a total `ItemAt_` (it was a Dafny type error).
`numbers` `vat` and `discounted` stay unproved: a negative zero really escapes there (JavaScript: `vat(0, -200)` is `-0`
on the parent, `0` on the candidate), and the ordinary lane's proof of them is its signed-zero gap.
Pair `heap5_reach`: `mean` (untouched, a pure loop then a guarded division: proved), `whole` (`~~x` for `x | 0`:
proved), `half` (WITNESS). At the previous commit the pair's Dafny had seven resolution errors (the real-file loop).

### 2026-10-28: heap shapes (lane heap-shapes)

Five writes the value reading cannot carry, read by the core as steps on a node a parameter holds (a node reached from
a parameter of the unit by field steps only, `r.headers`, `b.a.c`, a `!` on the way). Lint predicates in the mutation
region of `lint.mjs` (`heldNodePath`, `heldAlias`, `heldCall`, `plainNode`, `primDict`); readings in `heap.mjs`.
(1) `Object.assign(t, { a: x, b })` with literal sources onto a record (`assignLiterals`): the target, every value in
source order, then one `Set_` per key in the literal's key order (ECMA-262 20.1.2.1: the arguments are evaluated first,
then each source's own keys are copied in order by [[Set]]). A literal's keys are its text, so the copy writes exactly
those fields; a key the record does not declare, a value of another shape, a spread or computed member stays out.
(2) `pick(b, true).status = v`, `this.current().n = 0`: the core reads the call (a core unit returning a reference)
then `Set_` on the node it returns. The lint admits it when every return of the callee is a field path of its own
parameters (or of `this`) and every object the caller hands it is a node of the caller's parameters.
(3) `r.headers[k] = v` on a `Record<string, T>` of a primitive: `DictSet_` on the node (a new key goes last).
(4) `const names = b.names; names.splice(names.indexOf(n) >>> 0, 1)`: a const name for a node is that node's
reference, so the library rows, field writes and `++` through it are steps on it; `>>> 0` is the numbers reading's
`JsUshr` (a missing item's -1 becomes 4294967295 and `Splice_`'s clamp deletes nothing, as JavaScript does).
(5) `a === b` on two plain data records or arrays: Dafny equality of `Ref`s, JavaScript's object identity.
```dafny
function sign(hw_: HWorld, r: Ref, token: string): (HWorld, ())
{ var o0_ := Get_R_d61ddd12_headers(hw_, r); var v1_ := "lean";
  var hw_ := Set_R_5f5303ed_auth(hw_, o0_, token); var hw_ := Set_R_5f5303ed_agent(hw_, o0_, v1_); (hw_, ()) }
```
Soundness: each reading is a total prelude step on a `Ref`, exact on every well-formed heap whatever shares what (the
lemma never assumes two names are two nodes). Outside the core the value reading copies a node, so the lint's new
admissions would let a dropped write prove equal there: the identity guard (`layer1Risk`, `identitySkeleton`) names
Object.assign onto a node below an input, a write through a call's result, a write through a const name bound to a
path below an input, and `===` between two objects (here, or in a same-file callee: a caller's lemma unfolds a callee
that has none, `refUnits`), and leaves the identity shape unreadable, so the theorem withholds that lemma
(ASK:identity) and lane B decides. A module object, an import, a Map's value or a call of another file is no
parameter's node: those writes keep alias-mutation, assign-target, index-assign or property-assign (escape
`heap_shapes_outside_node`). The core's record cell holds no key order, so a literal source's key order is not
observed when the target lacks an optional key (the stage 4 field write's own gap).
Out: a dictionary behind a const name, a compound dictionary write, a mutator through a call's result, `===` against
an optional or any other object type, a const name for the parameter itself (`const a = values`: alias-mutation, as
the census-report fixture keeps it), a name for an element (escape `parameter_mutation`). Open: outside the core the ordinary translator throws on (3) (`newValue`,
translate.mjs, a TypeError, so the whole file loses lane A; never a proof), a guard line there is the lead's.
Pair `heap_shapes`: `sign` (WITNESS), `stamp` (proved, canonical heap), `finish` (WITNESS), `close` (proved), `cacheOff`
(proved), `tag` (WITNESS: the key order), `off` (WITNESS: no `>>> 0`), `drop` (proved), `pin` (copy, WITNESS), `share`
(alias, proved), the rest untouched. Moving a field write across a splice is equal and timed out (not proved).
Census with the rule report (`census.mjs --report`), units stopped by each rule as the first one, base 6661006 against
this lane; nexus tree 26,520 units, inside 23,753 -> 23,753; n8n tree 6,337 units, inside 4,314 -> 4,315:
```text
nexus  alias-mutation 144 -> 144, assign-target 13 -> 13, index-assign 95 -> 95, property-assign 48 -> 48, reference-equality 22 -> 22
n8n    alias-mutation 93 -> 93,   assign-target 120 -> 120, index-assign 86 -> 85, property-assign 76 -> 76, reference-equality 1 -> 1
```
The real instances sit on shapes the core holds no cell for: a dictionary of records (`state.chats[id]`, 62 of nexus's
alias-mutation findings), receiver state (`this.state.turns`), index signatures of any (`IDataObject`), Map values, a
call result that is an element (`this.activeExecutions[id]`), a non-literal Object.assign source. Each reading admits
exactly what the core carries; the measured reach waits on those shapes, not on these readings. Heap core census
(`design/heap-core-census.mjs`, 39 roots, modules unresolved), base against this lane: core 579 -> 579, units 53,918;
outside the core, exposed 32,906 -> 32,945 and determinate 16,593 -> 16,554 (the guard's new classes: identity
comparison 42, in a callee 38, write through a call's result 31; nested write through an input 1,246 -> 1,260, since
Object.assign onto a node below an input now counts as one).
Round 2 (same day). (a) A false proof on the base, closed: the same-shape Object.assign row read only the source's
declared fields, so `Object.assign(t, s)` proved equal to `t.a = s.a; t.b = s.b` (Equal_copy_into proved, canonical
heap), while a source of the declared type may carry more keys (structural typing) and Object.assign copies them.
Object.assign is now read only from a literal source (shape 1); a record-typed source is assign-target by name (escape
`assign_record_source`). A literal target, `Object.assign({}, a)`, copies the same extra keys as `{ ...a }` does: the
spread readings share that assumption, left as it was.
(b) Shape 6, a dictionary of records (`Record<string, T>`, T a plain data record) a parameter's node holds: the value
under a key is a node, `DictGet_` then a field step (`s.chats[id].unread = 0`, `const chat = s.chats[id]; chat.title =
t`), and a record stored under a key is `DictSet_` of its reference; the cell's values are `Is<T>` (WF), the canonical
walk follows them in key order as a Map's. A key the unit has not written may be missing (JavaScript throws a
TypeError) or a name of Object.prototype (it reads a function): the read marks the world, so a proof holds only where
the unit wrote the key. A record stored under a key that may be `__proto__` would replace the prototype: the lint
names it `prototype` (escape `heap_shapes_dict_proto_key`) and the core marks it. Pair `heap_shapes`: `seed` (the
nested write dropped: WITNESS), `later` (a read through the key moved across a write of another cell: proved),
`named` (proved), `retitle` (two writes through an unwritten key swapped: not proved, and lane B witnesses the
TypeError thrown by the other statement). The real instances (`state.chats[id]` in reducers) test `if (!chat)`, a
truthiness of a reference, which the core does not read.

### 2026-10-31: the three readings on values only the core reads (lane core-shared-readings)

The three readings above were built and proved on values the ordinary lane also reads (a parameter number, one loop).
Two of them stopped short of the units only the core decides, where the doubles reading is unknown (an array or a
record parameter) and the faithful reading (rule C, `translate/faithful.mjs`) is the core's number model.
(1) The bitwise reading never met a number the faithful reading does not hold. The rewrite turned the whole operator
into an uninterpreted `Math.__lean_bitor(t, 0)` (`__lean_bitnot`, `__lean_shl` ...), so `t | 0` and `~~t` were two
unrelated terms whenever `t` was a parameter's field, an element or a sum over an array. The rewrite now follows
ECMA-262 6.1.6.1: every operand of a bitwise operator is read through ToInt32 (ToUint32 for a shift count and the left
of `>>>`, both ToInt32 modulo 2^32, which the helpers take), so only the operand the model does not hold becomes
`Math.__lean_int32(x)` (one uninterpreted int32, declared in `lean-number.d.ts`), the operator stays and is read by
`bitwiseOf` over exact operands. The result of a bitwise operator is exact (int32, or uint32 for `>>>`) whatever its
operands, since ToInt32 never yields a -0, a NaN or a value out of range. A compound bitwise assignment is written the
same way (`t = (Math.__lean_int32(t) | 4)`). `bitwiseOf` reads the forms that are ToInt32 by the standard as one term:
`x | 0`, `0 | x`, `x ^ 0`, `0 ^ x`, `~~x`, and `<<` or `>>` by a literal count whose low five bits are 0.
(2) The world a pure loop keeps was decided on the body's text (no `var hw_` in it), and a loop's own call rebound the
world, so a loop around a pure loop was never pure itself. A loop whose helper carries `ensures r_.0 == hw_` now binds
its returned world to a fresh name and leaves the caller's world as it is (only the carried locals are taken), so the
loop around it reads a body that never rebinds the world and carries the ensures too, at any depth.
(3) The for-of loop in a real file holds as built: a for-of over a record's field reads `ItemAt_` and `|Items_|` (pair
row `field`).
Soundness. (1) A proof over an uninterpreted `__lean_int32` holds for every function, ToInt32 among them, and the
operator after it is the exact helper the standard defines over int32 operands; the int32 interval of a bitwise result
is the standard's, not the model's. (2) The fresh name holds a world the helper's ensures, proved by its own recursion,
makes equal to the caller's; dropping it loses nothing. Stays refused: a bitwise operator on a value that may not be a
number (a union with another type, a bigint: the rewrite reads number-typed operands only); a loop whose body marks or
writes the world (a division, an index, a field write) keeps the world it returns.
Pair `shared_readings` (red at lead-b5c07450 in `bits`, `low`, `grid`): `bits` (`~~t` for `t | 0`, t a sum: proved),
`low` (`t | 0` for `t << 32`: proved), `flip` (`t | 1`: WITNESS), `grid` (the length read before two nested pure loops,
then a division: proved), `halve` (`/ 4` for `/ 2` after them: WITNESS), `field` (for-of over `b.items` in a real file:
proved). `heap5_arith` `bump` (`4 | c.flags` for `c.flags | 4`, `+= 1` for `++`) is proved now: equal in JavaScript,
its lane B row PASS-bounded, its expectation raised from false (the faithful commit had made the operator opaque).
Census (`NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs <root> --out <json>`, base lead-b5c07450
against 6886149dd, `census.mjs --diff`): n8n 9,610 units, entered 2,680 -> 2,680; langchainjs 6,709 units, entered
2,766 -> 2,766; nexus in the 17 directories holding a bitwise operator outside tests (`--include <dir>/`), 1,225 units,
entered 595 -> 595. No reading gains or loses a unit on any root: both readings change what the core proves of a unit
it already enters (the faithful rewrite's terms, a loop helper's world), never what it refuses. The reach is measured by
the pairs, not by the census.
