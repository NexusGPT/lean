# A type at any depth, and a type that recurs on its own descent (2026-10-30)

Forms 1 and 3 of the types inventory ([types-inventory.md](types-inventory.md)). Before this reading `dtype` refused
any type whose descent passed depth 8 (`type nesting too deep`): 772 units of a finite type nested deeper (form 1) and
269 units of a type that recurs (form 3), over 15 roots.

## The construct

A TypeScript type is a finite term or a regular infinite one: a declaration (a type alias, an interface, a class) may
name itself in its body. The checker interns each instance, so one declaration with one list of arguments is one type
object. `dtype` maps it to a Dafny type by descending its parts: union members, record fields and the string index,
tuple and array elements, the arguments of Set, Map and Promise, a call signature's parameters and result.

The depth of that descent is no part of the type's meaning. A promise of a response of a list of groups of lines of
prices is ten levels deep and is read as it is at depth three. The one descent that would not end is a type met again
on its own path; the depth bound stood in for a guard on that.

## The reading (translate.mjs `dtype`)

`dtype` keeps the descent path, one frame per type it is inside (`descent`), and decides by the path alone:
- A record reserves its datatype's name before it reads its fields (`recordType`, the frame's `reserves`). Meeting it
  again reads that name: `interface Tree { kids: Tree[] }` is `datatype Tree = Tree(kids: seq<Tree>, ...)`, as before.
  A loop through a record ends there, whatever else lies on it (a tagged union of records, a callable field).
- Any other type met again on its path, with no reserving record between its two meetings, recurs: a callable
  returning a tuple holding itself (`type Stream<T> = () => [T, Stream<T>]`), a dictionary of itself
  (`type Tree = { [k: string]: Tree }`), a union through an array of itself (`type J = string | J[]`). Dafny has no
  structural type for an infinite term, and only a datatype has a name to recur by. The type is opaque (`Any`), and so
  is every type on its loop (each of them recurs on its own descent too, so the decision does not depend on which one
  the descent met first).
- An instance of a generic met inside one of its own instances, an argument of the inner one holding an argument of
  the outer as a proper part (`interface Nest<T> { deeper?: Nest<T[]> }`: `Nest<number>` holds `Nest<number[]>`),
  names a new type at every level and is never met again. The outer instance is opaque. A finite nesting of one generic
  (`Map<string, Map<string, number>>`, `Box<Box<number>>`) shrinks its arguments at each level and is read as it is.
- The frame of the type that recurs catches the unwinding (`Recurs`), records the decision in `recursOpaque` and reads
  `Any`. A record frame on the way down removes its own unfinished reservation; a sum restores the state it saved.
  Every later reading of the type is `Any` from `recursOpaque`.
- A type read opaque is read as `any` is (`isAny` holds of it): a field, an index, a call, an `in` test on such a
  value is an uninterpreted function of the value, never the record, tuple or dictionary reading its TypeScript
  shape would choose.

The record reading, the sum reading and the union's opaque fallback are unchanged. `absenceSchema` (a serialization's
static absence schema) also loses its depth bound: its `seen` set already ends a recursive type.

Pair `types_depth`: `deepLeaf` (ten records deep) proved, `deepChanged` (the sibling leaf) witnessed by lane B;
`shapeOf` and `shapeChanged` over n8n's `JsonValue`; `hasChild` and `hasGrandchild` over a dictionary of itself;
`second` and `secondChanged` over `Stream<string>`, a callable that recurs through its own generic instance.

## Soundness

A wrong proof needs the mapper to give one TypeScript type two Dafny types, or a value a type it does not have.
- One type, one Dafny type. A finite type's reading is the one it had at depth 3: the path guard changes nothing on a
  descent that never meets a type twice. A record is its one reserved name, as before. A type that recurs is `Any` from
  the moment its loop is found, and `recursOpaque` keeps it `Any` for every later read in the file; an unfinished
  reading made inside its loop is undone (the record's reservation, the sum's saved state), so no datatype holds a
  half-read copy of it.
- A value only a type it has. An opaque value is only passed to uninterpreted functions, the same functions on both
  sides: every read of it goes through the readers of `any` (`isAny`). The proof holds for every interpretation of
  those functions, JavaScript's among them, so it never looks inside the value.
- What the reading loses: a type on a loop is compared only as a whole value through the uninterpreted readers; a
  change inside it that the code reads is a change of those readers' arguments, never proved equal by the type.

One order effect stays: two loops sharing a type are found one at a time, and a type on the second loop met after the
shared one is already `Any` keeps its structural reading. Within one file it is still one reading per type. When the
parent and the candidate meet such types in another order, the two sides write that type differently: their shared
declarations differ (the gate refuses) or a lemma relates values of two Dafny types (it does not resolve). Either way
nothing is proved; the order can lose a proof, never make one.

## Measurement

Census of n8n and langchainjs (whole) and nexus (`--include apps/backend/src/agents`), base 5f96f554 against this
reading: the numbers and commands are in the lane's result (`lane/A7a-types-depth-recursion-result.md`).
