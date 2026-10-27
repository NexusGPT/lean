# Lane B inputs shaped by what the unit reads

## The construct

A parameter whose declared type names no fields: `any`, `unknown`, an import the checker cannot resolve (the type is
`any`), a dictionary `Record<string, V>`. The unit still reads it by literal names and compares the reads against
literals:

    switch (node.type) { case "collection-mention":
      if (node.attrs?.isNotFound === true || node.attrs?.isActive === false) return null; ... }

and a declared leaf the unit compares against a literal or a constant: `name === "openai"`,
`reason.length <= MAX_REASON_CHARS`, `x !== null && typeof x === "object"`.

## What lane B drew before
An `any` input was a fake whose field reads answer fakes or falsy values, never `"collection-mention"`; a dictionary
drew the keys `k0..k3`, never `isActive`; a declared string met a compared literal only by a pool draw. The spec came
from the candidate alone, so a field only the parent reads was never named.

## The reading

1. `exec/usage.mjs` reads, for each parameter and for `this` of a method, the property chains the unit reads off it,
   through local aliases (`const id = node.attrs?.collectionId`), destructuring, `x ?? d`, the element parameter of an
   array callback (`find`, `filter`, `some`, `map`, ...), `for ... of`, literal indices and `in`, and in the same-file
   functions and methods it calls, one level down, with the callee's parameters bound to the argument chains. For
   each chain: the literals it is compared against (`===`, `!==`, `==`, `!=`, ordering, `switch` cases, `includes`,
   `startsWith`, `typeof`), a literal being a source literal or one a same-file constant, enum member or constant
   object property is bound to; whether it is read as `.length` (and the lengths compared), called, tested for
   truthiness, or used in arithmetic.
2. `exec/run.mjs` reads usage on both files (`specOf(candidate, unit, { project, usageFrom: parent })`); the union is
   taken, since the separating value of a change is in one side's text.
3. `exec/spec.mjs` refines only where the declared type gives no shape. An opaque input becomes a union whose first
   option is the shape of its reads (a record of the fields read, an array when it is indexed or iterated, a string
   or a number from the compared literals and the arithmetic) and whose last option is the original handle. A
   dictionary becomes a union of a record of the keys read (each drawn from the dictionary's value type) and the
   dictionary. A declared leaf keeps its type; it gains a boundary: the compared literals it admits, an integer's
   neighbours (`v`, `v + 1`, `v - 1`), strings of the compared lengths, a value of each `typeof` tested, the falsy
   values the type admits when it is also tested for truthiness, then the declared draw. A key tested with `in` is
   drawn present and absent.
4. `exec/gen.mjs` walks the boundaries first: the generated inputs after the enumerated heaps (the first 48) take, for
   each boundary, its digit of the input index, the first boundary turning fastest (an odometer), so every
   combination of the first compared leaves is drawn within the first inputs; a leaf only tested for truthiness turns
   after them, its falsy values mixed in until its digit turns; an optional field and a union option that lead to a
   compared leaf are present while walking. After the walk a boundary value is mixed in at random. The
   declared draw is made first in every case and the boundary decisions use their own seeded stream, so an unshaped
   leaf draws what it drew before.

## Soundness

An input shape is never a claim. Lane B's PASS-bounded is a statement about the inputs it ran; shaping changes which
inputs run, never how two runs are compared, and both sides receive the same input. A shaped input can be one the
declared type does not admit (a record for an `unknown`): that is an input the function can receive at run time
from untyped code, and a WITNESS on it is a real difference of the JavaScript. Lane A, the identity guard, the heap
enumerator and the observation are untouched; the battery's false-PASS count stays the measure (0 before and after,
results in the lane report).

The refinement is general: it reads comparisons, chains and lengths, never a name of a repository, a defect or a pair.

## What stays out

- A Map or a Set the unit reads by `has`/`get`: no key is drawn equal to a string drawn elsewhere in the same input
  (928's voice mode needs a tool map holding the block's `collectionId`).
- Chains two calls deep, values a fake service answers (`this.repo.find(...)` results), keys computed at run time.
- The receiver's fields are refined but drawn through the fake's typed answers: the boundary is mixed in, not walked.

## What lane B sees

`min/928-typed` (`attrs?: Record<string, any>`) and `min/928-any` (`node: any`) turn from PASS-bounded to WITNESS:
a block `{ type: "collection-mention", attrs: { isActive: false, ... } }` with no tool map, where the parent returns
`null` and the candidate the mention text. The pair `tests/pairs/read_shaped_inputs` holds the dictionary shape, a
string compared against a literal the candidate changes, a `<=` against `<` on a length bound by a module constant,
a refactor of two branches into one conditional, and an untouched unit. It also reaches `callee_witness` padded (a length
compared against 8 draws nine) and `mutual_summaries` rare and useRare (7919 drawn first). A write through a key names
no field, the declared draw keeps one turn in three of the walk (`heap_dicts` both), and a default (`{ k = d }`, `x = d`)
separates at undefined (`record_rest_any` Sized).

## Lane A
Unchanged. One finding for the translator's owners: `attrs?: Record<string, any>` read as `node.attrs?.isNotFound ===
true` translates to a Dafny comparison of `Option<Any>` with `Any` that does not resolve, so the pair uses
`Record<string, string | boolean>`.
