# core-identity-destructured: result

Lane of the night wave of 2026-10-31, branch `lane/core-identity-destructured`, base lean `lead-b5c07450`
(b5c074508). Commits: 067966c12 (the red pair), d2832a3f8 (the reading, the pair widened by `stamp`, the design note
and the coverage rows), and this file.

## What was done, and why

Section 0b of `langs/ts/design/heap-stage5.md` (the identity guard reads destructured and rest parameters) was
already built for one form: a top-level object pattern of identifier fields (`{ title, ...rest }`). The
general reading was missing, so I read the section as a single mechanism. `identitySkeleton` (`translate/heap.mjs`)
now reads a parameter's pattern with one recursion, `bindPattern(pattern, source)`:

- a field bound at any depth of an object pattern is the input path to it (`arg0.inner.tag`; a key that is no
  identifier name is written `arg0["a.b"]`, so it can never meet a nested path);
- a record rest is a fresh node of its source's members less the keys named beside it (`#n{...@arg0.inner\["note"]}`,
  the keys sorted, `#` escaped so canonical renumbering never reaches into a key; a computed key beside it: no term);
- an array pattern's rest is a fresh array of its source's elements from its place (`#n[...@arg0.list>k]`);
- a rest parameter is a fresh array of the arguments from its place (`#n[...@args>i]`). JavaScript makes a new array
  per call (ECMA-262 FunctionDeclarationInstantiation, CreateArrayFromList), so no caller holds it. It was the input
  path `@all`: sound, but it made `[...all]` differ from `all`;
- a spread of a fresh node the skeleton built (an object or array literal, a rest), into the same kind (a record into
  a record or JSX props, an array into an array), is its parts: spreading copies the members. So `[...all]` and `all`
  have one shape, while `[all, all]` (one node twice) still differs from `[all, [...all]]` (two nodes).

Where the section is silent, I chose the reading that keeps soundness (written in the design note). No term for: a
binding with a default and every binding under one; every binding of a parameter that has a default
(`({ a }: P = D)`); an element of an array pattern; a binding the unit writes again. A binding with no term still
holds an input node, so every name a parameter's pattern binds roots a write at the input (`paramsOrThis`).

Two soundness defects of the guard, met while building the pair, each a lane-A proof that lane B witnesses (both rows
are in the pair, red at base):

1. `paired`: an object literal's part with no term was written as the text `null` (`#0{a:null,b:null}`). That made
   the shape determinate and equal across sides, so the lemma was let through while lane B witnesses the sharing.
   Now a part with no term makes the literal's term null, as the array, JSX and `new` parts already did.
2. `stamp`: a destructured binding the unit writes through (`tag.label = "x"`) was neither a parameter nor bound, so
   its write went unrecorded and the shape read determinate with no writes. Fixed by the `patternNames` rule above.

The null fix alone would have withheld one lemma held soundly before: `type_assertions` `fieldHeld`,
`{ v: x as number }`, whose part had no term only because the path stopped at the assertion. `as`, `<T>` and
`satisfies` are erased at run time, so `path` now reads through them to the operand, as it already did through `!`.

`layer1Risk` is unchanged: its `bindNames` already counted every binding of a pattern at its depth. The lint is unchanged.

## Elements added, and why

- `heap.mjs` `identitySkeleton`: `bindPattern`, `keyOf`, `step` (the pattern recursion); `freshNode` and the `members`
  map (a fresh node's parts, so a spread of it can be its parts); `spreadPart` (that spread); `patternNames` (every
  name a parameter binds, rooted at the input for writes); the `params` set without the rest parameter; null checks on
  the object literal's property and shorthand parts; `path` through `as`, `<T>` and `satisfies`.
- Pair `langs/ts/tests/pairs/identity_destructured/` (`.ts`, heap): nine units, written before the reading from the
  section's examples (`stamp` added once the second defect was found, red at base too).
- `design/heap-stage5.md`: subsection "2026-10-31: every depth of a pattern, rest parameters, a part with no term"
  under 0b. `design/coverage-readings.json` and `design/coverage-matrix.md`: the Parameter and ObjectBindingPattern
  rows ("reading today").

## The pair

`JOBS=1 node langs/ts/tests/run.mjs --pair identity_destructured`

| unit | lane A | lane B |
|---|---|---|
| innerTag (a field two levels down) | proved (was withheld: unreadable) | PASS-bounded |
| innerRest (a rest of a nested pattern) | proved (was withheld: unreadable) | PASS-bounded |
| renamed (a renamed nested field in a literal) | proved (was proved through the `null` part) | PASS-bounded |
| copied (`all` against `[...all]`, a rest parameter) | proved (was withheld: `@all` vs `#0[...@all]`) | PASS-bounded |
| lead (`{ head, more }` against `{ head: h, more: [...more] }`) | proved (was withheld) | PASS-bounded |
| twice (`[all, all]` against `[all, [...all]]`) | withheld (shapes differ) | WITNESS |
| fallback (a default in the pattern) | withheld (no term) | PASS-bounded |
| paired (an array element twice against a clone) | withheld (was proved: defect 1) | WITNESS |
| stamp (a write through a nested binding) | withheld (was proved: defect 2) | WITNESS |

At lead-b5c07450 (the pair copied into a detached worktree at b5c074508): 19 checks, 6 FAILED (Equal_inner_tag,
Equal_inner_rest, Equal_copied, Equal_lead, Equal_paired, Equal_stamp). At d2832a3f8: 19 checks, ALL PASS.

## Regression

Each with `JOBS=1 node langs/ts/tests/run.mjs --pair <p>` at d2832a3f8, all ALL PASS:

| pair | checks | why it was run |
|---|---:|---|
| identity_destructured | 19 | this lane |
| array_copy_identity | 13 | shares "identity" |
| handler_identity | 15 | shares "identity" |
| heap5_rest | 7 | shares "rest"; section 0b's own pair |
| record_rest_any | 11 | shares "rest" |
| rest_param | 7 | shares "rest", "param" |
| param_rebind | 11 | shares "param" |
| rename_parameter | 19 | shares "parameter" |
| this_param | 23 | shares "param" |
| types_enclosing_params | 24 | shares "params" |
| heap_canonical | 13 | named by the brief |
| type_tests | 59 | named by the brief |
| copied_argument | 10 | named by the brief |
| type_assertions | 45 | its guard lines moved (below) |
| comma_operator | 21 | its guard lines moved |
| readme_ledger | 15 | its guard lines moved |
| void_promise | 23 | its guard lines moved |
| stack_text | 11 | its guard lines moved |
| proof_hunt_10 | 9 | its guard lines moved |

Whole pair list, translation only (no Dafny): every pair's parent and candidate translated with
`translate.mjs <file> --core --suffix <side> --out … --prelude … --no-project --heap` at base and at d2832a3f8
(`lane/core-identity-destructured/guards.sh`). Every exit code is the same. The GUARD lines
moved only in heap5_rest and record_rest_any (the new rest notation, determinate on both sides as before) and in the
six pairs above whose units the null fix or the `as` reading moves. Every moved unit's expectation was already "no
proof", except `fieldHeld`, which is proved again. The full suite was not run (the lead runs it at the merge).

## Census

The identity guard sits in lane A, after the lint, so `census.mjs` (the lint's refusals and the entered units) cannot
see it. Its numbers are the same before and after, as expected:

`cd <tree> && NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs /root/da/census/repos/<root> --out <census>/census-<tag>-<root>.json`,
then `node langs/ts/census.mjs --diff <before> <after>`:

| root | units | entered | refused (language / environment) | destructuring reading admitted / refused | `--diff` gains / losses |
|---|---:|---:|---|---|---|
| n8n, before = after | 9,610 | 2,680 | 6,930 (4,941 / 361) | 456 / 54 | 0 / 0 on every reading |
| langchainjs, before = after | 6,709 | 2,766 | 3,943 (3,113 / 92) | 290 / 61 | 0 / 0 on every reading |
| nexus, partial | 21,711 in 13,200 files | 11,947 | | | the 11 finished chunks of the journal identical, each chunk's files, units, entered and every reading's counts (`lane/core-identity-destructured/chunk-diff.mjs`) |

The nexus "before" lint census was ended from outside by SIGTERM (exit 143) at 2,644 s, after 13,650 files. I did
not stop it. The machine was under memory pressure all night. The comparison is therefore over the chunks both
journals finished. I stopped the "after" run myself at 07:08 (by its pid, after 22,250 files and 32 chunks), because
nothing past chunk 11 has a "before" to compare with.

The guard's own
reading is measured by `design/heap-reach-census.mjs`, which records for every unit its `layer1Risk` exposure and
whether `identitySkeleton` is determinate. Each unit has one guard state:
- *not exposed*: the guard does not read it;
- *determinate*: one readable identity shape, so the lemma goes to the two-sided comparison;
- *unreadable*: the lemma is withheld as "identity shape unreadable".

Commands, one root at a time, never beside a pair run (copies under `/root/da/census/repos/`; the concepts input
written by me under `/root/lanes/core-identity-destructured/census/hr/`, one root per repository):
```
NODE_OPTIONS=--max-old-space-size=12288 node <tree>/langs/ts/design/heap-reach-census.mjs <census>/hr/concepts-all.json <out> --resolve --repos <root> --tag <tag>
node lane/core-identity-destructured/guard-diff.mjs <before units.jsonl> <after units.jsonl>
```
`<tree>` is a detached worktree at b5c074508 (before) or d2832a3f8 (after). A third tree, *reading only*, is
d2832a3f8 with the null-part check reverted in a scratch copy (the two lines of the object literal), so the two
effects can be told apart. nexus was SIGKILLed twice at full size by the machine's memory (exit 137, at 2338 s and at
225 s, with 120 of 122 GB in use machine-wide). Its row is therefore partial: the first 12,033 units in the census's
file order, the same units on all three trees (`--limit 12000`, `--max-old-space-size=6144`).

| root | units | state | before | reading only | after |
|---|---:|---|---:|---:|---:|
| n8n | 9,610 | not exposed | 4,486 | 4,486 | 4,486 |
| | | determinate | 942 | 950 | 578 |
| | | unreadable | 4,182 | 4,174 | 4,546 |
| langchainjs | 6,709 | not exposed | 3,412 | 3,412 | 3,412 |
| | | determinate | 590 | 597 | 362 |
| | | unreadable | 2,707 | 2,700 | 2,935 |
| nexus (partial) | 12,033 | not exposed | 6,604 | 6,604 | 6,604 |
| | | determinate | 1,072 | 1,081 | 618 |
| | | unreadable | 4,357 | 4,348 | 4,811 |

Moves between states (the parameter form is the unit's own: `destructuring` when a parameter is a pattern, `rest`
when one is a rest, else `other`):

| root | before -> reading only | before -> after |
|---|---|---|
| n8n | unreadable -> determinate 11 (other); determinate -> unreadable 3 (destructuring) | determinate -> unreadable 360 (other) + 14 (destructuring); unreadable -> determinate 10 (other) |
| langchainjs | unreadable -> determinate 7 (other) | determinate -> unreadable 209 (other) + 25 (destructuring) + 1 (rest); unreadable -> determinate 7 (other) |
| nexus (partial) | unreadable -> determinate 10 (other); determinate -> unreadable 1 (other) | determinate -> unreadable 458 (other) + 5 (destructuring); unreadable -> determinate 9 (other) |

What the numbers say:
- **The null-part fix dominates.** 360 + 14 units in n8n, 209 + 25 + 1 in langchainjs and 458 + 5 in the nexus part
  were determinate only because a part with no term was written as the text `null`. That is the `paired` defect at
  scale: the guard let their lemmas through without reading the identity of those parts. Read by hand, the n8n
  example `getRequestOptions` (`packages/@n8n/client-oauth2/src/utils.ts:65`) has `headers: headers ?? {}` as such a
  part and then deletes a key from what may be the caller's own `headers` object. These moves are the guard
  withholding what it could not read. They are not lost proofs, and every one in the pair list was checked (the
  regression table).
- **The reading itself admits little on these roots.** No unit whose own parameters are destructured or rest moves
  to determinate. The gains (+11 n8n, +7 langchainjs, +10 nexus part) are all in the `other` form. That is
  consistent with the `as` reading and with patterns inside the units, but I did not attribute them unit by unit.
  The units with patterns stay unreadable for other parts of their results (a call's result, an element read),
  which this lane does not read.
- **The reading's own move to unreadable, n8n, 3 (destructuring), each correct:**
  - `webhookNotFoundErrorMessage` (`packages/cli/src/errors/response-errors/webhook-not-found.error.ts:3`) calls
    `webhookMethods.pop()` on a destructured binding, which mutates the caller's array. Its write was unrecorded
    before (the `stamp` defect).
  - Two `omit` units (`{ [keyToOmit]: _, ...remainder }`, `packages/editor-ui/src/utils/typesUtils.ts:12`,
    `packages/nodes-base/nodes/Zoho/GenericFunctions.ts:164`): a rest beside a computed key now has no term (before,
    `#n{...@arg1}` ignored the excluded key). The ordinary lane refuses that form by `record-rest` before the guard
    is read, so lane A gives them no verdict either way. I tried naming a parameter key and reverted it: no pair can
    test it.
- **nexus part, 1 to unreadable, also correct:** `PrismaThreadRepository.mapToThread`
  (`prisma-thread.repository.ts:290`). With `as` read through, `documentReferences` is a conditional between the
  input's object and a fresh `{}`, which cannot be one identity. Before, it was the untermed `null`.

## Defects met, outside this lane's construct (reported, not fixed)

1. `layer1Risk` `holdsNoRef` counts a record of records of primitives as holding no reference, so `{ ...i }` with
   `i: { tag: { label: string }; note: string }` reads as "not exposed" (checked by translation: GUARD `exposed: []`)
   and the guard never reads it. The result shares `i.tag` with the input. A candidate
   `{ ...i, tag: { ...i.tag } }` is value-equal and identity-different. Not run as a pair (the census held the
   machine), so its lane-A verdict is not measured: plausible, not confirmed.
2. The ordinary lane's translation of `{ ...others, note }`, where `others` is the rest of a nested pattern, is a Dafny
   type error ("member 'note' does not exist in datatype 'Rest_…'", body type mismatch): `check.mjs` gives
   `ASK:translation-defect`. A whole pair's theorem fails to resolve when one unit has it.
3. `identitySkeleton` canonicalises each site and each write separately (`cs = sites.map(canon)`,
   `cw = writes.map(canon)`), so a fresh node shared between a write and the result (`this.x = o; return o`) and two
   separate fresh nodes (`this.x = {..}; return {..}`) can read alike. Read from the code, not run.
4. An identifier parameter with a default keeps the input path `@p` in the skeleton. The interface check requires the
   two defaults to be the same text, so the two sides agree, but the path names "the argument or the default".
   Left as it was.

## What is left

- The defects above, each at its own mechanism (1 and 3 in the guard, 2 in the ordinary lane's record spread).
- A rest beside a computed key keeps no term. Naming a parameter key (`{ [k]: _, ...rest }`) was tried and reverted,
  because the ordinary lane refuses the form (`record-rest`) before the guard and no pair can test it.
- A rest the unit writes through keeps no term (section 0b's rule), so a copy of it is withheld.
- An element of an array pattern has no term (an element read has no path in the skeleton); a positional path
  (`arg0[0]`) would need the skeleton's paths to carry element steps.

The scripts behind every number are in `lane/core-identity-destructured/` (`guards.sh`, `guard-diff.mjs`,
`chunk-diff.mjs`, `measure.sh`, `measure5.sh`). Raw outputs stay under `/root/lanes/core-identity-destructured/census/`
and `/root/lanes/core-identity-destructured/guards/`, outside the repository.
