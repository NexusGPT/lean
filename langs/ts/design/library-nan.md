# The library recorder on special numbers: splice's start read by ToIntegerOrInfinity

## What failed

Pair `library_rows`, unit `drop` (`ys.splice(i, 1)` on a copy), once lane B drew NaN, Infinity and -Infinity where a
number is admitted (`design/special-numbers.md`): `library drop recorded` read 105 records (70 splice, 35 concat) and
3 defects, all on `Array.prototype.splice`, why `splice contents or result`. On b96d5db the first defect's record read
`"before":{"kind":"array","items":[null,null,null]}`, `"after":{"kind":"array","items":[null,null]}`,
`"args":[{"kind":"primitive","value":null},{"kind":"primitive","value":1}]`, expected `[null,null,null]`: JSON writes
NaN and the infinities as null, so the record hid its own cause. The same record, written by the renderer this lane
adds (the old start rule put back for one run, then restored):

    before [{"$nan":true},{"$infinity":1},{"$infinity":-1}], args [{"$nan":true}, 1],
    after [{"$infinity":1},{"$infinity":-1}], expected [{"$nan":true},{"$infinity":1},{"$infinity":-1}]

The three defects differ only in the receiver's length (3, 1 and 5 items; 2, 4 and 2 records), each with start NaN and
count 1: the summary keys a defect by operation, contradiction and expected value, so one cause reads as three.

## The class and the cause (one cause for all three)

Class: the checker's model of the specification, not the row and not the comparison. `contentCheck` read the start as
`Math.trunc(start)`. ECMA-262 23.1.3.31 reads it by ToIntegerOrInfinity (7.1.5), where NaN is 0; `Math.trunc(NaN)` is
NaN, every clamp after it is NaN, and the expected array came out unchanged while the engine (rightly) removed the first
element. The row of `library.json` already says "clamped as the spec's ToIntegerOrInfinity steps"; its Dafny form takes
an `int` start, a finite model outside which NaN lies, so no row and no Dafny form changes.

The other two suspects of the brief, checked: (b) the comparison already read NaN equal to NaN (`ser` wrote it as
`NaN`), but it wrote Infinity, -Infinity and null all as JSON null, so a push of Infinity recorded as -Infinity read as
no defect (probe below); (c) no record of the pair has a receiver outside the model (`outOfModel` 0): a fake read as an
array calls the real methods from `exec/fake.mjs`, a file the recorder's keep filter never keeps.

## The fix (exec/transitions.mjs)

- `toIntegerOrInfinity` (ToNumber, then NaN and both zeros to 0, an infinity kept, the rest truncated) reads splice's
  start and delete count; `splice()` with no argument removes nothing (step 8), a start alone removes the rest.
- An object start or count is out of the model (ToPrimitive can run code; the record holds its id), counted, never a
  defect.
- `ser`, the comparison: every primitive is tagged by its type, so the infinities, null, a number and its spelling as a
  string are distinct values, and NaN equals NaN (SameValue; keyed collections canonicalize -0 first, as before).
- `shown`: an expected value and a defect's first record write NaN, the infinities and -0 as lane B's renderer does
  (`{"$nan": true}`, `{"$infinity": 1}`, `{"$negativeZero": true}`).

## Not weakened

Synthetic records (`summarizeRecords` on one splice record each): a NaN start read as the end, a NaN start left
unchanged, an Infinity start removing the first element, a NaN count removing one, `splice()` removing everything:
1 defect each; a NaN start removing the first element: 0. A push of Infinity recorded as -Infinity or as null: 1 defect
each (0 before). The wrong table (`tests/fixtures/library-wrong.json`) on `pushed`: 2 defects on push, as before.

## Coverage

Pair `builtin_transitions` gains `cutAt(xs, i, k)` (`ys.splice(i, k)`, the same on both sides: proved, PASS-bounded,
library ops slice and splice with 0 defects). With b96d5db's recorder it reads 140 records and 3 defects (the starts
NaN); with this one, 140 records and 0 defects.
