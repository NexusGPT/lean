# A unit reads the part of the file it reaches

## The construct

A file holds several units. The prelude (`--prelude`) holds the shared declarations a translation uses: the heap
vocabulary `Obj`, `HWorld` and the reads and writes per shape, the records, the helpers. The theorem needs one prelude
for both sides and refuses a block that differs between them (`spec/theorem.py`, `merge_preludes`).

## The finding

Deleting `fee` from a file left `balance` (an untouched unit that reaches nothing of `fee`) at `ASK:interface`:
`prelude block Obj differs between parent and candidate`. The cause was not the heap vocabulary. With `--only <unit>`
the translator already emits the unit, its same-file callees and the shapes they use, so the prelude is per unit
already. One thing stayed per file: the numbers. `fileUsesReals(sf)` is true when any text of the file has a float
literal or a bare `/`, and then every `number` of every unit is a Dafny `real`; otherwise it is an `int`. `fee` has
`0.02`, so the parent was a real file (`seq<real>`, `Fold_real_real`) and the candidate an int file (`seq<int>`):
every block that names the number type differed, `Obj` first. A probe of eight kinds of added sibling (a float, a division, a
record, an effect, a class, a throw, a string method, a module constant) changed the prelude of `balance` and `norm`
for the float and the division only.

## The reading

The choice was between a per-unit prelude from the translator and an alignment by name in the theorem. The first. A name alignment cannot help: `balance` is `seq<real>` on one side and `seq<int>` on the other, a different
signature, not a block to match up. So the numeric reading becomes per unit, in the translator (`translate.mjs`, after
`order` is built):

- under `--only` (the checker's path, one unit and what it reaches) a unit is real when its own text, a unit it
  reaches (`order`) or the file outside its units has a float literal or a bare `/`. A sibling not in `order` is left
  out of the walk: `fileUsesReals(sf, skip)` (`common.mjs`, one optional argument, the lint still calls it with none).
- a whole-file translation (no `--only`, the suite's pair translation, `--fn`) reads the whole file as before.
- the file outside its units (constants, class field initialisers, types, imports) counts for every unit. A constant
  `const RATE = 0.5` makes each unit of the file real, as before.

The unit is read as it is read in a file that holds only it and what it reaches: an int unit proves over integers, as
every int file does today. A unit that reaches `fee` (a callee) is real, so a change in a callee still changes the
caller's numbers and its lemma, as it should.

A change in a shape the unit reaches stays a real interface change: `norm` takes `Pt`, the candidate adds a field,
the `Obj` constructor differs, and the unit is `ASK:interface`. The refusal now names the shape in the words of its
fields: `a shape the unit reaches changed: {x: int, y: int} in the parent, {x: int, y: int, z: int} in the
candidate` (`theorem.py`, `_shape_change`, from the `// SHAPES:` header both translations write).

## What stays refused, and why it is safe

- Two sides that read the same unit with different numbers cannot happen through `--only` unless the unit, a callee
  or the file outside the units changed: those are real differences and stay `ASK:interface`.
- A unit reached through a path `collect` does not follow (a method called on a receiver of unknown class) is not
  translated, so its floats cannot enter the reading of a unit that never reads its body.
- Soundness: the reading never proves two different behaviours equal because of this change. It changes which
  numeric model a unit gets (integer when its reach has no float), the model an int file has always had; the lane B
  run is unchanged and still witnesses a difference on fractional inputs.
- The lint is unchanged. It admits `/` in a real file; a bare `/` in a unit makes that unit real here too.

## Lane B

Lane B runs real JavaScript and reads no prelude; it is unchanged.

## The pairs

- `tests/pairs/prelude_unit`: the parent has `fee` (a float literal), the candidate deletes it, widens `Pt`, and
  adds `triple`. `balance` and `tag`: PASS-proved (before: ASK:interface). `norm` and `lift` (both take `Pt`):
  ASK:interface. `triple`: NEW. The pair is `laneBOnly` with `check` rows, as `narrow_in`: a whole-file translation
  of a real parent and an int candidate is by design two different files.
- `tests/pairs/prelude_unit_added`: the reverse direction. The candidate adds `scale` (a float literal); `balance`
  and `tag`: PASS-proved (before: ASK:interface). A second directory because one pair has one parent file, and a file
  has one numeric reading.

## Instances

The deletion in the gate's ledger fixture (`fee` out of `ledger.ts`, `balance` checked) is the finding; the same
command now ends `PASS-proved` (report file, with the line before).
