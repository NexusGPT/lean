# core-pure-globals: result (2026-10-31)

Branch `lane/core-pure-globals`, from lean `b5c074508` (the v0.1.2 candidate).

## What I did and why

`design/heap-stage5.md` section 14 is the specification. Measured first, on the base: every Math form the section
names was already read by the heap core (`translate/heap.mjs` `globalCall`), and the Math functions it does not name
(`sqrt`, `pow`, `log`, ...) reach the core as the faithful reading's `Math.__lean_*` externals. The core stopped every
Number and JSON call: `Number(n)` as `call outside the file`, `Number.isInteger(n)` as `call .isInteger`,
`JSON.stringify(s)` as `call .stringify` (probe: `translate.mjs --heap --tolerant --report`, `report.heap.whyNot`). Such a
unit falls to the ordinary lane, which withholds the lemma of a unit writing through an input another input of the same
shape may alias. The heap core reads that aliasing exactly, so the unit stayed unproved. That is the red row.

The reading is one recognizer (`globalCall`) and one emitter (the `globalCall` branch of `expr`) in `translate/heap.mjs`:
- `Number(x)` of a number is `x`; of a boolean `if b then 1 else 0` (ToNumber, exact on every double).
- `Number.isInteger`, `isFinite`, `isNaN`, `isSafeInteger` of a number: the ordinary lane's bodiless
  `ext_call_args_Number_<m>_<T>`, one symbol for both lanes, nothing assumed of the answer.
- `JSON.stringify(x)` of one primitive (string, number, boolean, a literal union of one): a bodiless
  `ext_JSON_stringify_prim_<T>(x)`. SerializeJSONProperty looks up `toJSON` only on an object or a bigint, and a
  primitive never throws, so the text is a function of the value alone.
- Stays out: `Number` of a string or an optional value, `parseInt`, `parseFloat` (NaN: the ordinary lane makes such a
  unit opaque by its text), `JSON.parse` (any), `JSON.stringify` of a reference, of an optional value or with a
  replacer, `Number.isX` of a non-number, `Math.random`.
- Where the section was silent (the predicates, a primitive's `JSON.stringify`) I chose bodiless functions, never an
  answer read from the file's number domain. In an int file `Number.isInteger(n)` against `true` would otherwise prove
  falsely. None of the new forms is a doubles bearing site; each is either exact on every double or uninterpreted, so a
  non-bearing unit's int or real lemma stays faithful.

## Elements added, and why

- `translate/heap.mjs`: `NUMBER_TESTS`, the `Number`, `Number.<m>` and `JSON.stringify` cases of `globalCall`, and their
  three emitter lines. They are the reading. The new external readings are gated on the `external` hook, as the
  `Math.__lean_*` case already is.
- `tests/pairs/pure_globals/`: the red pair, written before the reading. 17 units, one per form (below).
- `design/heap-stage5.md`: subsection `14b. Number and JSON forms`, holding what is read, what stays out and why, and
  the census.
- `subset.md`: the row "Pure globals in the heap core".

## The pair

`JOBS=1 node langs/ts/tests/run.mjs --pair pure_globals`:
- before the reading (commit 5ab111390): 35 checks, 1 failed. `Equal_stamp proved` FAIL: `withheld: aliasable input:
  write through an input that another input position of the same shape may alias`.
- after (2fc3bb0ff): 35 checks, ALL PASS. `Equal_stamp`: `proved (canonical heap)`.

Units: `widest`, `lowest`, `gap`, `trend`, `ceiling`, `chopped`, `halves` (proved by the doubles reading); `nearest`
(WITNESS, doubles and lane B); `caption`, `root`, `as_count`, `is_whole`, `quote`, `encode_count` (proved); `finite`
(another field: unproved, lane B WITNESS); `stamp` (the red row: proved after); `parsed` (`+s` for `Number(s)`: unproved,
out by design).

Soundness probe (int file, not in the pair; `/root/lanes/core-pure-globals/probe/sound`, translate + `spec/theorem.py` +
`dafny verify`): `Number.isInteger(r.count)` written against `true` gives `Equal_sure` errors (unproved); `JSON.stringify(r.count)`
against `String(r.count)` gives `Equal_shown` errors (unproved); `Number(r.whole)` against `r.whole ? 1 : 0` gives `Equal_flag` proved.
`check.mjs` on the first two: lane B WITNESS.

## Regression pairs (`JOBS=1 node langs/ts/tests/run.mjs --pair <p>`, after 2fc3bb0ff)

| pair | checks | result |
| --- | ---: | --- |
| pure_globals | 35 | ALL PASS |
| heap5_globals | 13 | ALL PASS |
| lib_globals | 15 | ALL PASS |
| race_pure | 5 | ALL PASS |
| absent_number | 15 | ALL PASS |
| numbers | 9 | ALL PASS |
| numbers_bits | 39 | ALL PASS |
| numbers_bits_rebase | 11 | ALL PASS |
| special_numbers | 9 | ALL PASS |
| cheap_rungs_parsed | 2 | ALL PASS |
| heap_canonical | 13 | ALL PASS |
| type_tests | 59 | ALL PASS |
| copied_argument | 10 | ALL PASS |

## Census

Base `b5c074508` (run from a `git archive` snapshot of 5ab111390, whose translator is the base's) against `2fc3bb0ff`.
`NODE_OPTIONS=--max-old-space-size=12288`, one root at a time.

**`census.mjs`** (`node langs/ts/census.mjs /root/da/census/repos/<root> --out <f>.json --report <f>.md`, then
`node langs/ts/census.mjs --diff before.json after.json`):

| root | units | entered before | entered after | language-refused before / after | readings with a gain or loss |
| --- | ---: | ---: | ---: | ---: | --- |
| n8n | 9,610 | 2,680 | 2,680 | 4,941 / 4,941 | none |
| langchainjs | 6,709 | 2,766 | 2,766 | 3,113 / 3,113 | none |
| nexus, `--include apps/backend/src/` | 23,328 | 12,656 | 12,656 | 8,255 / 8,255 | none |

`census.mjs` counts the lint's admission. This reading changes what lane A proves in the heap core, not what the lint
admits, so no unit moved there. nexus is a subset: the full root stood at 15,700 of about 30,600 files after two hours
with its heap at 7.5 of 12 GB and still slowing (log kept as `nexus-full-before-stopped.log`). The lead was asked and no
answer could reach me (the wait answered `busy`), so I chose the subset and said so. The first nexus after-run was ended
by a SIGTERM I did not send (exit 143 at 13,250 of 13,672 files; log kept as `nexus-backend-after-sigterm.log`). The rerun
completed.

**The heap core** (`node lane/core-pure-globals-scripts/heap-globals-count.mjs <langs/ts of base or tree> <root>
<out>`: every unit planned by that tree's `translate/heap.mjs` with the translator's `helper` and `external` hooks,
modules resolved by each file's tsconfig, the heap-reach census's walk; then `lane/core-pure-globals-scripts/heap-globals-diff.mjs`. Unit
counts equal the lint census's on every root):

| root | core before | core after | entered (first stop before) | moved to another stop | left |
| --- | ---: | ---: | --- | --- | ---: |
| n8n | 82 | 83 | 1 (`call .isInteger`) | 2: `call .isInteger` -> `statement ThrowStatement` | 0 |
| langchainjs | 30 | 30 | 0 | 1: `call .isNaN` -> called by a unit outside the core | 0 |
| nexus `apps/backend/src` | 271 | 273 | 2 (`call .isFinite`, `call .isInteger`) | 6: `call .stringify` -> element access of a non-array 2, -> called by a unit outside the core 1; `call .isInteger` -> called by a unit outside the core 1, -> `statement ThrowStatement` 1; `call .isFinite` -> division in an int file 1 | 0 |

Units entered: n8n `packages/workflow/src/Extensions/NumberExtensions.ts` `isInteger`; nexus
`_common/domain/satisfaction-raw-score.ts` `legacyRawScore`,
`admin/attribution-backfill/domain/attribution-backfill-plan.ts` `clampBackfillBatchSize`. The `call .stringify` first
stops left after (1, 1, 5, from 1, 1, 8) are each `JSON.stringify` of an array, a record or with an indentation, which is
the section's Out.

## Defects met

- The doubles reading answers `unknown` within 60 s on `Math.abs(h - l)` against `Math.abs(l - h)`, which are equal on
  every double (red in the first draft of the pair). This is outside this construct and I did not fix it. The pair's
  `gap` unit tests `|-(h - l)|` instead (proved in 0.08 s).
- `design/heap-reach-census.mjs` builds the heap core with no `external` hook, so it never sees the readings that go
  through the ordinary lane's externals (`Math.__lean_*` before this lane, the Number predicates and `JSON.stringify`
  now). Its own-fit counts understate the core. Reported, not changed. The heap-core count below uses a script that
  passes the hook.
- Two pair names: `least` is a Dafny keyword (`least lemma`), so the scope must not name a unit `least`, and the theorem
  refuses it. A pair whose parent is an int file and whose candidate is a real file gets no theorem. Both are pair
  authoring, not defects; noted for the next pair.
- This worktree has no git identity: the commits pass `-c user.name/user.email` with the identity of the repository's
  other commits, and no git config was changed.

## What is left

- `Number` of a string, `parseInt`, `JSON.parse` stay out by the section's reason.
- `JSON.stringify` of a record (key order, `toJSON`) is the section's Out.
- An exact reading of `Number.isInteger` and its siblings would need them to be doubles bearing sites
  (`smt-fp.mjs` already encodes them, but `numberBearing` does not mark them). That is the doubles reading's file, not
  this lane's.
