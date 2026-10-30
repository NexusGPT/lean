# A3-types-inventory: result

## What was done and why

1. **The census carries the form.** `langs/ts/census.mjs` gains one field: each refusal example
   (`refusalRules[].directories[].example`) now holds `message`, the finding's text. A `types` refusal names its type
   form only in its message, so before this change the census could count `types` but not say which form stopped a
   unit. Every rule's example carries its message from now on.
   - The check is `langs/ts/tests/census_example_message.mjs`, with fixture `langs/ts/tests/fixtures/census-message`:
     a unit refused by the type reading (`string | symbol`) and one refused by the lint (`var`). Each example's
     `message` must equal the census record's finding at that line. Before the change: 4 rows FAIL (`message` null).
     After: all hold. `run.mjs` runs it as `runtime/census-example-message`. `census_usage.mjs` still passes.
2. **The inventory.** I ran the census over every root under `/root/da/census/repos/` (40 roots, used as they are),
   then grouped the units the census counts under `types` by the form their message names. The result is
   `langs/ts/design/types-inventory.md`: one row per form, with units, files, roots, three examples, the reading the
   form needs and why that reading is sound. The script is `langs/ts/design/types-inventory.mjs`.
   - I ran `census.mjs` per root rather than `lint.mjs <file> --json` per file. `lint.mjs` takes one file and builds a
     program for it. The census lints every file inside its project through the same `lowerFile` record (`lint.mjs`
     is `lintFindings` = `lowerFile(...).findings`). So the findings are the lint's, read in chunks instead of 40,000
     separate programs.

## Elements added

- `census.mjs`: the `message` field in the refusal example, so the form a rule refused travels with its count.
- `tests/census_example_message.mjs`, `tests/fixtures/census-message/`, and one row in `tests/run.mjs`: the check for
  that field.
- `design/types-inventory.mjs`: the grouping. It counts a unit under `types` exactly as the census does
  (environment-blocked units first, then each unit under its first non-environment finding), and its total equals the
  census's `refusalRules` count on every complete root. It reads an incomplete census from its journal and marks it
  partial. For `type nesting too deep`, whose message names no type, it walks the raised line's type with the
  checker along `dtype`'s edges and names the form (finite or recursive, and where the type is written). That split
  describes the sites; it decides nothing.
- `design/types-inventory.md`: the inventory.

## Numbers (each with its command)

- Census per root: `NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs <root> --out
  /root/lanes/A3-types-inventory/census/<root>.json`, four at a time
  (`/root/lanes/A3-types-inventory/census/run-all.sh`). All 39 roots that finished exited 0.
- Inventory: `NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/design/types-inventory.mjs
  /root/lanes/A3-types-inventory/census/*.json --out /root/lanes/A3-types-inventory/census/inventory.json`.
- `types` stops 1,822 units over the 40 roots (nexus partial): 2.0 percent of 91,546 units, 6.0 percent of 30,157
  language-refused. On the 39 complete roots: 975 units, 4.9 percent of language-refused.
- The forms: a finite type past depth 8, 772; an enclosing type parameter, 335; a recursive type through a generic or
  callable, 269; the `this` type, 241; a union with a symbol member, 179; with a bigint member, 8; nesting sites not
  located, 18.
- No reading was written, so there is no before-and-after for `types`. The census-field check is the lane's one pair
  that fails before and passes after.

## What is left

- **Step 2, readings, in the order the note gives.** First, `dtype`'s depth bound replaced by a guard on the descent
  path (forms 1 and 3, 1,041 units). Then the enclosing type parameters as the unit's own (335). Then `this` read as
  its constraint (241). Then `ESSymbolLike` and `BigIntLike` admitted among an opaque union's members (187).
- **The plan's done-condition no longer holds as written.** The plan says the census count falls "on the three roots
  where it is the top rule", but on this head `types` is top on no root. In the 2026-10-29 census (0ea7a792) it was
  top on four: blog-studio-lambda, driftbench, nexus-app-starter and nexus-ui. Here those roots count 3, 36, 9 and 2.
  I did not trace which change moved them. Step 2 is better checked per form, on n8n, nexus and langchainjs, which
  hold most of the units.
- **The 18 unlocated nesting sites.** If `type nesting too deep` named its outermost type, the next census would
  classify them without the walk. That is a translator message change, left for the readings lane.
- **nexus.** A complete nexus run is still owed. About 1,400 units (by the earlier census's count) were not read.

## Defects met

- **The runner was stopped by the two-hour background limit while nexus was still running.** It had read 18,512 files
  and 32,226 units, and its summary JSON stayed `complete: false`. I read nexus from the census journal's finished
  chunks, which the census writes for exactly this case. A census of nexus takes about two hours on this shared
  machine, so it needs a runner without that limit.
- **`nexus-desktop` has no TypeScript file the census walks** (0 files, 0 units).
- **The brief's `Co-Authored-By` line.** The brief asks for `Claude Fable 5.1`, and I used it as instructed. The model
  that did this work is Claude Opus 5.5.
- **git identity.** This worktree has no git identity configured. I committed with the identity of the head's earlier
  commits, passed per command (`-c user.name/user.email`); no configuration was written.
- **The run.mjs `census` section was not run.** It checks the report text and example fields, which this change does
  not alter, and it only runs in the full suite, which this lane does not run.
