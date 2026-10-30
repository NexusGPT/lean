# Known values: telling lean what your inputs look like

lean's bounded run (lane B) draws inputs from your types. When a function accepts only some values of its type, the
plans a price table holds or the statuses a database column stores, the drawn values all fall outside and the run
stops at the guard: lean says ASK, `no input reached the body`. A values file tells lean which values your data holds.

## The file

`.lean/values.json`, at the root of your repository (or in any folder above the source file):

```json
{
  "functions": {
    "quote": { "plan": ["basic", "pro", "team"] },
    "src/billing.ts:Invoice.total": { "lines": [[{ "sku": "a1", "qty": 2 }]] }
  },
  "types": {
    "PlanId": ["basic", "pro", "team"]
  }
}
```

- `functions`: a function (`quote`, `Class.method`, or `path/file.ts:quote` to pick one file) and one of its
  parameters, with a list of values.
- `types`: a type name; every parameter or record field declared with that type takes the list.
- A value is JSON: a string, a number, a boolean, null, a list or a small record.

## What lean does with it

- It draws your values first, combined with the boundary values your function compares against, then its own.
- It drops a value your declared type does not admit (a string listed for a number, a record with a field the type
  does not have) and names it in the result (`bound.values.rejected`).
- It counts how many inputs came from the file and how many got past the guard (`bound.values`, `bound.reached`).
- The verdict means what it always means. A `WITNESS` on a listed value is a real difference. A `PASS-bounded` still
  says no difference was found on the inputs the bound states. The certificate names the file by its hash.

## Where it is read

- `lean pr` (`langs/ts/pr.mjs`) reads the head's `.lean/values.json`, prints `Values: .lean/values.json at <head>,
  sha256 <hash>` under the report title, and reuses a cached verdict only when the file is unchanged. Without a root
  file each unit's lane B reads the nearest `.lean/values.json` above its file; the line then names each file a
  certificate drew, `Values: <path> at <head>, sha256 <hash>`, one per file. When no file was read it prints
  `Values: none listed (lane B draws from the types)`. The CI comment prints the same line.
- `langs/ts/check.mjs --values <file>` names a file; `--values none` reads none; without the flag the nearest
  `.lean/values.json` above the file is read.

## Example

```
$ node langs/ts/check.mjs --parent langs/ts/tests/pairs/known_values/parent.ts --candidate langs/ts/tests/pairs/known_values/candidate.ts --unit quote --no-project
```

Without the file, `quote(plan: string, seats: number)` answers ASK (every drawn plan is unknown). With the pair's file
listing the three plans, it answers WITNESS on `["pro", 6]`: the candidate discounts above five seats.
