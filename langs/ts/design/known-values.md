# Known values: the inputs a project knows its functions take

## The construct
A unit guarded against a domain its types do not state (`design/unreached-body.md`): a plan is a `string`, the plans a
price table, a database row or a configuration holds are the strings the unit accepts. Lane B draws strings from the
type, every one throws at the guard, and the run says ASK: no input reached the body. The project knows the domain;
the types do not. The project's values file states it.

## The file
`.lean/values.json`, at the project root or in any folder above the source file:

    { "functions": { "quote": { "plan": ["basic", "pro", "team"] },
                     "src/billing.ts:Invoice.total": { "lines": [[{ "sku": "a1", "qty": 2 }]] } },
      "types": { "PlanId": ["basic", "pro", "team"] } }

`functions` keys a unit (`f`, `Class.method`, or `<file>:<unit>` where the source path ends with `<file>`; the file
form wins) and then a parameter name. `types` keys a type name: a parameter or a record field whose declared type is
that name (a type reference, or the checker's alias name) takes the list. A value is JSON: a string, a number, a
boolean, null, a list, a small record. A key outside `functions` and `types` (bar `$`-prefixed comments) is refused
by name.

## The reading
- Found: `check.mjs --values <file>` (`none`: no file); else the nearest `.lean/values.json` from the candidate's
  folder up to its project root (the first folder with a package.json or a .git) (`exec/spec.mjs findValues`).
  `pr.mjs` reads the head's own file (`git show <head>:.lean/values.json`, or the checkout's for WORKTREE), passes it
  to every unit, keys its cache on the file's hash and prints one line naming it.
- Admitted: a listed value is drawn only when the declared type admits it (`spec.mjs fits`: a string for a string, a
  member of a literal union, a record with its required fields and no other key, any value of an unread type: any,
  unknown, an unresolved import). The rest is named in `bound.values.rejected`. A Date, a Map, a function or a handle
  is never listed: JSON cannot state one.
- Drawn first (`gen.mjs` the known phase): after the enumerated heaps, generated input k gives every listed leaf its
  value k (each list cycles on its own) and the boundary walk its digit k divided by the longest list, so every listed
  value meets every combination of the compared boundaries. The phase lasts the longest list times the walk length,
  at most `KNOWN = 30` inputs; then the walk and the free draws run as before. A listed value is a fresh copy per side.
  The declared draw is made first, so the other leaves' streams are the ones the spec draws without the file.
- Counted: `bound.values` = `{ file, sha256, listed, rejected?, unmatched?, phase, inputs, reachedBody }`, beside
  `bound.reached` (every input's body or guard count); `check.mjs` copies `{ file, sha256, phase, inputs, reachedBody }`
  into the certificate's `values`.

## Soundness
Lane B proves nothing: a listed value is one more input, both sides receive the same one, and the comparison is the
one every input gets. A WITNESS on a listed value is a real difference of the JavaScript on a value the declared type
admits (a value outside it is rejected, so a type-violating input never blames a function). The verdict means what it
means without the file: a PASS-bounded stays bounded over the inputs the bound states, the unreached reading still
reads every input, and lane A never sees the file. Without a values file the spec carries no list, the phase is empty
and every input is the one drawn before (the walk index is the generated index, as in `design/gen-walk.md`).
Weighed: a stale list (a plan the table dropped) is an input the guard refuses, counted at the guard; a list naming a
parameter the unit lacks is named in `unmatched`; a value listed for a type name reaches every field of that type.

## What stays out
The receiver's fields and the answers of fakes take no listed values; a type name inside an array element is read
only through a record field or a parameter; a record value is matched exactly (no extra key).

## What lane B sees
Pair `tests/pairs/known_values` (n 30, its `.lean/values.json`): quote (the unreached_body quote, plan listed by
function and parameter) is WITNESS at input 4, `["pro", 6]`, `reached { body: 8, guard: 0 }`, `values { phase: 9,
inputs: 8, reachedBody: 8 }` (the same unit with `--values none`: ASK, 30 of 30 at the guard); orderTotal (untouched,
`order.plan` listed by the type name PlanId) is PASS-bounded, `reached { body: 3, guard: 27 }` (with `--values none`:
ASK); perSeat (a refactored guard, `"two"` listed for a number and rejected) PASS-bounded and PASS-proved; freeSeats
untouched, PASS-proved. orderTotal stays unproved in lane A: a unit reading a module cell is named by its file's whole
text (`translate.mjs numericKey`), and quote changed in the same file.
