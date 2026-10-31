# core-class-handles: result

Branch `lane/core-class-handles`, from lean `b5c074508` (lead-b5c07450). Commits:

- `a91ab1193` pair `class_handles` (red at the base)
- `dcf5ee898` the reading: lint `heldAlias` takes an instance of a class of this file; the identity guard sees a write
  through a second name of an input; design note; coverage row
- `252f91123` the guard's new risk restricted to const names (a `let` name the lint admits a write through is fresh)
- the commit adding this file

## What was read, and why

Section 18 of `langs/ts/design/heap-stage5.md` was already built in the translator (`heap.mjs` `outsideCall`: a handle's
method, and a method of another instance of a class of this file, is the transition `HCall_<m>_<key>`). Pair
`heap5_handles` covers it. I wrote the brief's three constructs as units (an instance held and written, two names of one
instance, an instance handed to a callee) and found one gap and one soundness hole.

1. **Gap (lint).** `const h = a; h.total += n` with `a` an instance of a class of this file was refused as
   `alias-mutation`. The heap core already reads it exactly: a local of a reference shape is a `Ref`, so the write is
   `Set_<K>_total(hw_, h, ..)` on the one cell. The lint's held-alias rule (heap shapes) took a plain data record or an
   array one field step below a parameter, never the parameter itself, and never a class instance. Now `heldAlias` also
   takes an instance of a class of this file, at any depth, the parameter itself included (`lint.mjs` `fileInstance`).
2. **Soundness hole (identity guard).** A unit outside the heap core is read as a value tree. There
   `const h = a; h.total = 1` copies the record, and the write through `h` never reaches `a`. The guard (`layer1Risk`,
   `identitySkeleton`) counted aliases one level down only, so it reported nothing exposed and the value lemma stood.
   Measured: with the widened lint and the base guard, lane A **proved** `class_handles` `spill`, which lane B witnesses
   (`/root/lanes/core-class-handles/census/pair-noguard.log`: `Equal_spill not proved | FAIL | proved`). Now
   `layer1Risk` adds "write through another name of an input" for a write through a const local bound to an input
   itself, and `identitySkeleton` counts such a local as an input alias (its write is an unreadable path, so the shape
   is indeterminate). Such a unit keeps no value lemma (`withheld: identity shape unreadable ...`), and lane B decides.
   The base lint refused every such unit, so before this lane the hole was unreachable. It was reachable only through
   my widening.
3. The first guard version also fired on `let` names. The lint admits a write through a `let` name only where it is fresh
   (flow-sensitive `aliasAt`; pair `lint_misfires` `rebound`: `let flat = merged; if (g) { flat = []; flat.push(..) }`).
   The verdict was unchanged (both sides determinate, the same skeletons), but the risk was a false positive. It is now
   restricted to const names, and `rebound`'s guard line is the base's again.

Where the section is silent I chose this: a handle (an interface with methods, a class of another file) held in a local
stays a receiver only. A write through it stays refused (the core has no cell for it), and so does a `let` alias of an
instance.

## Every element added

- `langs/ts/lint/lint.mjs`: `fileInstance(t)`, an object type declared by a named class of this file; `heldAlias`
  takes it at any depth (`heldNodePath` at `steps >= 0`). Plain records and arrays keep `steps >= 1`.
- `langs/ts/translate/heap.mjs`: in `layer1Risk`, `constLocal(x)` and the risk "write through another name of an input".
  In `identitySkeleton`, `inputAlias` takes a const bound to a parameter or `this` at any depth (it was depth >= 1).
- `langs/ts/tests/pairs/class_handles/` (parent, candidate, expect): `held`, `keep`, `twice`, `pay`, `step` proved and
  PASS-bounded; `alias`, `both`, `charge`, `spill` unproved and WITNESS; `add`, `bump`, `log`, `Account.deposit`
  untouched. `spill` leaves the core (a handle's method called in a loop) and pins the guard.
- `langs/ts/design/heap-stage5.md`: subsection "2026-10-31: the instance held" under section 18.
- `langs/ts/COVERAGE.md`: the row "mutation through a local alias of a parameter", from gap to partial with the reading.

## Numbers

Red at the base, `node /root/lanes/core-class-handles/base/langs/ts/lint/lint.mjs <pair>/parent.ts` (the base tree
is a `git archive` of b5c074508): `alias-mutation` at `held`, `alias`, `twice` (parent) and `alias` (candidate), exit 1.

Pair and regressions, each `JOBS=1 node langs/ts/tests/run.mjs --pair <p>`, all ALL PASS at the final head unless
noted (logs `/root/lanes/core-class-handles/census/reg-*.log`, `reg2-*.log`):

| pair | checks |
| --- | ---: |
| class_handles | 26 |
| heap5_handles | 12 |
| class_new | 17 |
| class_statics | 12 |
| class_super | 8 |
| promise_handle | 18 |
| heap_canonical | 13 |
| type_tests | 59 |
| copied_argument | 10 |
| heap5_ctors | 14 (at dcf5ee898) |
| heap5_decorators | 9 (at dcf5ee898) |
| heap_shapes | 36 |
| alias_after_call | 7 |
| alias_result | 6 (at dcf5ee898) |
| mutation | 11 |
| param_rebind | 11 (at dcf5ee898) |
| receiver_write | 13 (at dcf5ee898) |
| this_receiver | 13 (at dcf5ee898) |
| heap_methods | 10 (at dcf5ee898) |
| heap5_rest | 7 (at dcf5ee898) |
| lint_misfires | 15 |

The commit after dcf5ee898 only narrows the new guard risk (const names), back toward the base. The pairs marked "at
dcf5ee898" were not rerun after it.

All pairs, translation only: every pair side translated at the base and at the head with `--core --heap
--no-project`, and the `// HEAP` and `// GUARD` lines compared. Only `class_handles` (new) and `lint_misfires` `rebound`
differed, and `rebound` was fixed by 252f91123. The lint escapes under `fixtures/escapes/ts`: every one still names its
rule, except the three `load` escapes (not lint rules), whose lint output is identical at the base.

Census, `NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs /root/da/census/repos/<root> --out
<before|after>-<root>.json` (before from the base tree, after from the head), one root at a time, then `node
langs/ts/census.mjs --diff before after`:

| root | files | units | entered before | after | language-refused before | after | `alias-mutation` before | after |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| n8n | 7812 | 9610 | 2680 | 2680 | 4941 | 4941 | 155 | 155 |
| langchainjs | 2972 | 6709 | 2766 | 2766 | 3113 | 3113 | 68 | 68 |
| nexus, first 3600 files (partial) | 3600 | 6551 | 3620 | 3620 | n/a | n/a | 0 (first stop) | 0 |

nexus: `--limit 6000` on both sides (the full root runs about 4.5 hours per side). The before run finished (6000 files,
10094 units, 5554 entered, 3466 language-refused, `before-nexus6000.json`). The after run was killed by the machine's
OOM killer at 3600 files (`dmesg`: `Out of memory: Killed process 2930876`, global OOM with 3 GB of 122 free). The row is
read from the two journals (`<out>.records.jsonl`) over the 3600 files both finished: the cumulative chunk header at
3600 files is 6551 units and 3620 entered on both sides, and every rule's finding count over those files is equal
(`alias-mutation` 94 and 94). Script: `/tmp/ch/journal-cmp.mjs before.records.jsonl after.records.jsonl` (no rule's count
differs). The remaining 2400 files of the limited run, and the full root, were not measured after.

The diff table shows 0 gains and 0 losses in every reading on n8n and langchainjs, and nexus's measured part is equal. On these roots no unit's first
refusal was a write through a const name for an instance of a class of this file. The construct is real (the pair) but
absent as a first stop in these corpora. It does not hide behind earlier refusals either. Every finding in the
census records, not only first stops (`records[].findings`), gives the same `alias-mutation` count before and after: n8n
493 and 493, langchainjs 252 and 252 (of 174,412 and 66,527 findings).

## Defects met, and what is left (reported, not fixed: outside this lane's construct)

- A write through a const name for a plain data record parameter itself (`const h = p; h.total += n`, `p: { total:
  number }`) stays `alias-mutation`. The heap core would read it the same way. The guard now withholds the value lemma
  for it (the risk is shape-independent), so admitting it in the lint is the one remaining step, in the heap-shapes
  reading's scope.
- `const self = this` and a write through `self` in a method stay refused (`heldNodePath` takes parameters only).
- The value lane reads a field-only class of this file as a Dafny datatype (`g3_p(a: Box, ..)`), so outside the core
  every write through an alias of it is a copy. The guard is the only thing standing between that copy and a lemma.
- Attribution: the brief prescribes `Co-Authored-By: Claude Fable 5.1`, and every commit carries that line as told. The
  lane was run by Claude Opus 5.5.
