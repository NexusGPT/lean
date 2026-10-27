# A WITNESS names the changed same-file callee it came through

A unit whose own text is equal on both sides can still differ: it calls a same-file function that changed. Lane B
loads each side's whole file (`loadInner` in `exec/run.mjs`), so the callee runs real on each side. The WITNESS is
real; the reviewer needs where it came from, since the caller's diff is empty.

## The reading (`exec/callees.mjs`)

- `unitText(sf, unit)`: the unit's node printed by the compiler's printer with comments removed, every run of
  whitespace one space, and its sha256. Two texts that differ only in comments, layout or optional semicolons are
  equal; a changed token is not.
- `calleesOf(sf, checker, unit)`: every same-file unit the unit names (`originOf` kind `unit`: a top-level function,
  an arrow const, a class method through `this`), then the units those name, breadth first, each with the first path
  that reaches it. A reference that is not a call (a unit passed to `map`) counts: it runs. The unit itself is not
  its own callee. The file is read without its project: a same-file unit resolves inside the file alone.
- `calleeWitness(parent, candidate, unit)`: the unit's text equal or not, and every callee on either side's graph
  (the candidate's first) whose text differs, or that exists on one side only (`side`).
- `annotateWitness(result, ...)`: `runPair` calls it on its result. On a WITNESS, each witness gains
  `through: [{ callee, changed: true, path }]` when a reached callee changed, and `where.cause = 'callee'` when the
  unit's own text is equal. The verdict stays WITNESS. When the unit's own text changed, `through` is still listed
  (a reviewer wants it) and `where` keeps the observation's field alone.

`check.mjs` copies `through` into the certificate's witnesses and writes `unitTextEqual` beside the file hashes on
every verdict (from the run, else a parse of both sides). `pr.mjs` carries `through` on the row; the note of a
`cause: 'callee'` row reads `through <callee> (changed); this function's text is unchanged`, and names the callee's
own row: `(changed; its own row is WITNESS)`, or `(changed), whose own row is PASS-bounded: the difference needs the
caller's inputs`. A caller whose text did not change meets no diff hunk, so `pr.mjs` also runs lane B alone on each
unchanged unit of a changed file that reaches a changed unit, and adds its row only when that run is a WITNESS with
`cause: 'callee'`; the header counts these rows apart from the changed functions.

## What it does not claim, and soundness

- `through` lists the changed callees the unit reaches, not the one the difference flowed through; each path is
  the first one found. A cause outside the same-file units (a module constant, an import, an added import that
  moves the fakes' answers) leaves `through` empty and no cause. Field initializers are not callees of a method.
- The annotation adds names only: never a verdict, an input or an observation. A wrong callee set misleads a
  reviewer, never the theorem; lane A is untouched.

## Lane A

`spec/theorem.py` (`alias_identical`) aliases a unit only when its text is identical AND every same-file callee it
calls is identical, by a fixpoint. A caller of a changed callee is therefore not aliased: its lemma is stated over
the two callee versions and fails where they differ. In the pair, `Equal_caller` and `Equal_total` are not proved,
`Equal_double` (untouched, no callee) is aliased and proved.

## The pair `tests/pairs/callee_witness`

`helper` changed (WITNESS alone); `padded` changed only above eight elements, generated arrays hold at most five
(PASS-bounded alone); `Caller` and `Total` keep their text and call them (WITNESS through each); `double` untouched.
`expect.json` key `through` is checked in `tests/run.mjs` next to the `patch` block.

## The clean-pair run

No clean-pair WITNESS comes through a changed same-file callee. Of the 11 WITNESS rows of `results/clean-v1.json`
(8), `clean-v2.json` (2) and `clean.json` (1), `calleeWitness` on each row's parent and buggy file gave
`unitTextEqual: true, through: []` for the 10 that have both files. Over all 145 distinct rows: own text equal 93,
with a changed same-file callee 13, no candidate file 52. The 13 are nexus-928 callers of `lookupSkill`,
`convertSingleBlockToText`, `extractInlineText`, `traverseJsonForCollections`: PASS-bounded in all three runs and
again under today's lane B at n 200.
