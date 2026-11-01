# Lane w1m-opacity-merge: result

Branch `lane/w1m-opacity-merge`, started at f38d200fe0 (lead-v4 then: bd48de0b plus the lead's fixture commit).
lead-v4 has moved on since (dd9ec283, the w2f merge); this branch does not hold that and the lead merges it in.

## Merge order and commits

| commit | what |
| --- | --- |
| 582c2aad9b | merge `lane/w1a-opaque-mutation` (93bd13d1e3) |
| 12b5299d5e | merge `lane/w1c-opaque-calls` (0d0f296904) |
| 8ccf0ff495 | merge `lane/w1g-opaque-handed` (58ef5f2a66) |
| d66a4385f3 | merge `lane/w1b-opaque-statements` (c54e1997d7) |
| 42c333a6c2 | the break convention: every `LEAN_BREAK` read through `langs/ts/break.mjs`, every name registered |
| 2521973962 | the suite on the merged readings: three expectations (below) |

Each merge commit's message lists its conflicts and resolutions; this file repeats them.

## How the cherry-picks were merged

w1c, w1g and w1b each carried earlier copies of w1a's commits. A plain merge against base 4747022f would resurrect
w1a text that w1a later removed: theirs "adds" an early line that ours never had. So every file a cherry-picking
lane touched was merged again three-way, with the w1a commit that lane cherry-picked as the base (tool:
`/root/lanes/w1m-opacity-merge/tools/remerge.sh`). Each lane's own change then lands on w1a's later text:

- w1c: its copies of `translate/opaque.mjs`, `tests/opaque-unit.mjs` and `design/w1a-opaque-mutation.md` were
  9c185509's, unchanged, so w1a's later versions were taken (git merge, ours).
- w1g: re-merged with base 1500340f6a. Files w1g had only from the cherry-picks are w1a's: opaque.mjs,
  opaque-unit.mjs, the w1a design note, check.mjs, lower.mjs, pr.mjs, readings.mjs, tests/run.mjs and the w1a pairs.
- w1b: re-merged with base 29a0acc082. w1b's later picks of w1a's fixes merged as identical changes.

## Conflicts and resolutions

### w1a into f38d200
| file | ours (lead-v4) | theirs (w1a) | rule | resolution |
| --- | --- | --- | --- | --- |
| `pr.mjs` row literal | newUnit `records` | `opaque` count | two additions, one place | both (records, then opaque) |
| `tests/run.mjs` runtime rows | fake-protocols, module-rows | opaque-unit, opaque-unit --break | two additions | both |
| `design/admission-contract.md` | generated audit table | generated audit table | regenerate | `lower.mjs --audit --md`: 603 sites, 0 uncatalogued; every dated section kept |

### w1c
w1a's column (`OPAQUE_ROWS`, lint.mjs; graded in the lowering) and w1c's (`OPAQUE_CALLS`, lint/opaque-calls.mjs; a site
decided in the lint) grade disjoint rules. Both are kept.

| file / place | w1a | w1c | rule | resolution |
| --- | --- | --- | --- | --- |
| opaque.mjs, opaque-unit.mjs, w1a design note | later version | 9c185509 copy | cherry-picked helper | w1a's once |
| translate.mjs retry loop | `translateGraded` (sites by `pos`) | `translateSites` (sites by `start:end`) | two mechanisms, disjoint rules | nested: translateGraded's rounds go through translateSites. Both use `opts.opaqueSites`, and each reader takes only its own column's rules (`opaqueGrade(x.rule) === 'none'` / `!opaqueCallsForm(x.rule)` skip) |
| translate.mjs `fail` | `e.at = {pos, end, line, col, endLine, endCol, unit}` | `e.at = {start, end}`, no site for the source file | same place | one `fail` setting both shapes, w1c's guard |
| translate.mjs `opaqueRows` | Map unit -> array, one row per step | Map unit -> Map, one row per finding | same mechanism twice | w1a's once; w1c's step row is w1a's `opaqueEntry` (rules, statement span, the findings' spans, statements covered, plus w1c's `callees` and `by`) |
| translate.mjs `// OPAQUE` line, `statementCount` | `opaqueOut` (covered = sum of rows) | second computation, its own `statementCount(fn, inside)` (a duplicate import, which would not load) | same mechanism twice | w1a's once; w1c's dropped (opaque-calls.mjs `statementCount` removed) |
| translate.mjs heap plan | units with a block leave `only` | units with a step leave `only` | two additions | both column's units leave `only` |
| check.mjs `lanes.A.opaque` (auto-merged twice) | `{steps, fraction, statements, covered, parent}` | an array, plus `lanes.A.opaqueFraction` | same mechanism twice | w1a's block once; subset.md updated |
| lint.mjs `v` | `opaque: opaqueGrade(rule)` | site record for calls rules | two additions | both |
| lint.mjs CLI | graded findings listed, `--opaque-refuses` | `!r.opaque` filter, `[opaque: …]` suffix | same mechanism twice | w1a's. A w1c finding read as a step carries `opaque`, so the lowering defers it like w1a's graded findings (`lower.mjs deferred`): one graded channel |
| conformance/run.py escapes | `escape_lint` hook (`--opaque-refuses`) | accept an `[opaque: …]` label (and `lint_out`) | same mechanism twice | w1a's; `--opaque-refuses` names both columns' escapes |
| tests/run.mjs escape row | graded by OPAQUE_ROWS | opaque step label | two readings of one row | the row grades a rule of either column |
| tests/run.mjs advice row | w1a's | w1c's | same | w1a's |
| break switches | `LEAN_BREAK` via `../break.mjs` | `LEAN_OPAQUE_BREAK` (drop-read, drop-write, drop-callees) | one convention | drop-read is w1a's `opaque-drop-read` (the same opaqueForm code). w1c's two others are registered as `opaque-calls-drop-write` and `opaque-calls-drop-callees` (they guard other code: reachWrites, calleeTexts, siteStep). tests/opaque-calls.mjs, the two pairs' comments and the w1c design note follow |
| tests/opaque-calls.mjs | — | lint rows read without the advice; step row reads w1c's row shape | follows the one channel/row | lint rows read with `advisory: true` (graded findings are listed there); step check: each finding inside the step's span |
| admission-contract.md | table | table + w1c's dated section | regenerate; sections kept | 623 sites, 0 uncatalogued; w1c's section moved after the others |

### w1g
| file / place | ours | w1g | rule | resolution |
| --- | --- | --- | --- | --- |
| tests/break.mjs | registry (w1a, w1c), re-export of ../break.mjs | ten names, its own `BREAK_ENV`/`broken` | names join; one switch | every name kept; w1a's re-export |
| common.mjs, translate.mjs | — | `import { broken } from './tests/break.mjs'` | the switch is beside the product | `./break.mjs` |
| tests/dafny-resource-limit.mjs, lowering-cache.mjs, no-silent-exit-importers.mjs | — | copy tests/break.mjs into the product copies | same problem w1a fixed (break.mjs moved) | w1a's fix once; w1g's copies dropped |
| `langs/ts/tests/.lowering-cache-iQpOBN/` (64 files) | — | a test's temporary producer copy, committed by accident | not code | not merged |
| translate.mjs readAfterCall hooks | w1c: `rebinds`, `siteHere` | w1g: the w1a block's statements opaque, `namedSite` identity | two additions | all of them |
| census-environment/origin `use.ts`, `types.ts` | w1c: `take(x, sink)` with `sink(x); return [x]` | w1g: compound write `h.n += 1` | each lane reworked the fixture's refused form; with both readings neither is refused (w1g's branch already fails this test, 1 of 2 units blocked) | both units rebind the handed name after the call, a form the merged reading still refuses, judged on the unresolved `Handle`: census_environment all hold |
| tests/opaque-calls.mjs step row | — | — | a w1g expression step (`as_Any_int`, a value w1c holds at Any read into a typed outside slot) sits in w1c's units | the check reads w1c's own statement steps |
| admission-contract.md | | | regenerate | 624 sites, 0 uncatalogued |

### w1b
| file / place | ours | w1b | rule | resolution |
| --- | --- | --- | --- | --- |
| check.mjs, tests/run.mjs | `opaqueLines(…).get(unit)` (one object per unit) | `?.[0]` (29a0 listed lines) | w1b's fix of code w1a later changed | w1a's. Taken as is, every certificate would lose `lanes.A.opaque` and every pair's opaque row would list nothing |
| translate.mjs outer loop | w1a/w1g loop through translateSites; rounds for block rows only | w1b's (final, boundaryUnit, toBlock) | one loop | w1b's loop through translateSites. A round adds a site for a block or statement row, never an expression row (w1g's) |
| translate.mjs `siteFail` / `fail` | one fail | siteFail beside an older fail | two additions | siteFail plus the one fail |
| translate.mjs site readers | w1a's skips w1c's; w1c's block | w1a's skips w1b's statement sites; w1b's block | two additions | w1a's skips both; w1c's block, then w1b's |
| `nodeAt` | opaque-calls.mjs `nodeAt(sf, a, z)` | opaque-statements.mjs `nodeAt(ts, sf, a, z)`, the same walk | same mechanism twice (neither w1a's) | w1c's (first in lane order); w1b's removed, its three calls lose `ts` |
| translate.mjs `isOpaqueStmt`, statement dispatch, step | `siteHere` / `siteStep` | `designatedHere` / w1b's step | two additions | both; w1c's site step first |
| translate.mjs heap plan | `only` minus w1a/w1c units | third argument (w1b's units, callers and callees with them) | two additions | both |
| translate.mjs unit read whole | w1a `wholeUnitRow` (numeric) | w1b's unit row (numeric or unit-opaque) | one row per step | one `unit` row holding both columns' sites |
| translate.mjs module fallback, header | w1a's whole-unit row; w1c's unreached-site refusal | `e.boundaryUnit` excluded; `opaquePlacement` | two additions | all |
| lint.mjs OPAQUE_ROWS | w1g's expression rows | w1b's statement rows | two additions | both, w1g's then w1b's |
| lower.mjs DYNAMIC_RULES | `site.rule` = w1c's rules | `site.rule` = w1b's rules, `boundary.rule` | one key read at two sites | One key gave each site the other family's rules (699 sites, 1 uncatalogued). w1b's siteFail sites now look up `siteFail <expression>`; `site.rule` stays w1c's: 656 sites, 0 uncatalogued |
| census.mjs | lead-v4's module/types units | per-unit opaque record | two additions | both |
| tests/break.mjs | w1a's three descriptions | w1b's (naming its statement step) + opaque-drop-sharing | names join | w1a's text naming w1b's use; sharing added |
| tests/run.mjs pair runner | theoremRefusal | planted rows | two additions | both |
| subset.md | lead-v4's "Units outside every function" | w1b's paragraph of "What is an opaque block" | two additions | w1b's paragraph closing its section, then lead-v4's |
| admission-contract.md | | | regenerate | 656 sites, 0 uncatalogued |

### The break convention (42c333a6c2)
`langs/ts/break.mjs` gains `breakList()`; `broken()` reads through it at each use. Every direct read of `LEAN_BREAK`
now goes through it, and every name is registered in `tests/break.mjs` MECHANISMS (35 names). Sites touched:
- w1h (nine names, ten sites): `exec/new-tests.mjs` platform-gap and closed-test; `exec/declared.mjs` declared-edges
  and declared-throws; `exec/new-unit.mjs` admitted-input, closed-call, declared-shape, shape-drives, pr-tests and
  platform-gap.
- w1f (six): `ci/ledger.mjs` w1f-js, w1f-types and w1f-module; `typed.mjs` w1f-closure, w1f-emit and the record's
  `broken` field; `lint/directives.mjs` w1f-directive. typed.mjs and directives.mjs used to read the switch once at
  import; they now read it at each use.
- w3a: `solve/counterexample.mjs` `breaks()` is `breakList()` (cex-replay, cex-replay-by-index).
- w2d: `library-rows.mjs` package-rows; `exec/fakes/lib/index.mjs` library-fakes.
- w1c: `translate/opaque-calls.mjs` and translate.mjs siteStep (in the w1c merge).
- w1g: already on `broken()`; only its imports moved (common.mjs, translate.mjs).
- lower.mjs keeps `LEAN_BREAK`'s text in the lowering cache key; that is a key, not a mechanism.

### Expectations the merged readings change (2521973962)
- `tests/opaque-unit.mjs`: w1a's row "a translator refusal's graded rule" used read-after-call as its ungraded
  example. w1g grades that rule (expression), so the example is now dynamic-eval, which the test already reads as
  `none`.
- `array_copies_alias` keptByInstance: lane A `ASK` became `ASK:doubles-unknown`. It used to be refused
  (read-after-call: `a` read after `new Keeper(a)`). w1g now reads the unit, and its lemma is not proved
  (`Equal_kept_by_instance` false). The verdict is PASS-bounded as before; w1g's own branch gives the same.
- Five w1c pairs (`opaque_dynamic-key`, `opaque_exception-return`, `opaque_optional-chain`,
  `opaque_unsupported-call`, `opaque_unsupported-syntax`): the `outside_*` unit goes from `real-only` to proved. On
  w1c alone the faithful text refused the typed slot that reads the boundary value held at Any (type-assertion).
  With w1g that slot is one opaque conversion (`as_Any_int`), so the faithful text translates and places the unit.
  Lane B is PASS-bounded on each; the units each pair expects to differ stay unproved; the suite's proof-hunt found
  no hidden false proof.

## Validators (output lines verbatim)

1. The lanes' own tests, on the merged branch:
   - w1c `node langs/ts/tests/opaque-calls.mjs`: `109/109 rows hold` at 42c333a6, `114/114 rows hold` at 25219739
     (five more step rows, for the units now proved). `--break`: `8/8 rows hold`.
   - w1a, 15 pairs with `node langs/ts/tests/run.mjs --pair <p>`, all `ALL PASS`: alias_mutation 20 checks,
     callee 3, closure_mutation 11, index_assign 11, in_place_mutation 11, mutator_value 11,
     object_method_capture 11, object_method_mutation 13, opaque_mutation 11, param_assign 11, param_mutation 11,
     property_assign 11, receiver_mutation 13, receiver_write 11, values 23. These are w1a's own counts.
   - w1g, three pairs: `| TOTAL | 28 checks | ALL PASS |` (read_after_call), `| TOTAL | 17 checks | ALL PASS |`
     (copied_argument), `| TOTAL | 12 checks | ALL PASS |` (type_assertion): 57, w1g's 57. Also in the suite run below.
     `node tests/w1g-opaque-handed.mjs`: both checks ok, both red under `--break`.
   - w1b `JOBS=3 node langs/ts/tests/opaque-statements.mjs`: `19 pairs, 243 rows, 1 failed` (opaque_for_in, see
     Open). `--break opaque-drop-read`: `12 pairs, 188 rows, 12 failed, 11 `upstream` units proved falsely without the
     mechanism` (w1b: 12). `--break opaque-drop-write`: `1 pairs, 5 rows, 1 failed, 1 `stale` units proved falsely
     without the mechanism`. `--break opaque-drop-callees`: `1 pairs, 1 rows, 1 failed, 1 `callee` units proved
     falsely without the mechanism`.
   - Lanes merged earlier, after the registry commit: w1h `every pair green` / `every break turns its pair red`;
     w1f `w1f-module-units: module_unit 7/7; type_only 9/9; directive 10/10; js_unit 6/6; --break w1f-module 5 red;
     …`; census_environment `census-environment: all hold`.
2. `PASS pr intake: only the changed function, the module unit and the types unit are verdict rows; …`;
   `ledger.test: all assertions pass`; `withdrawal: logic-values v1 refused identically by the lint, the translator and
   the record; check PASS-bounded (lane A ASK) under the withdrawal, PASS-proved without; audit 656 site rows, 0
   uncatalogued`; `sites 656; by kind {"lint-refuse":381,"lint-advice":5,"translate-throw":4,"translate-refuse":266}; uncatalogued 0`.
3. `python3 -I conformance/run.py ts`: `conformance: PASS, 252 of 252 checks passed, languages: ts`.
4. Suite, `LEAN_CONFORMANCE=full JOBS=4 LEAN_PAIRS=<92 pairs> node langs/ts/tests/run.mjs`. The 92 pairs: every
   `opaque_*` pair (57), the 30 of `lane/w1h-census/sample-pairs.txt`, and the pairs whose expectations a lane changed
   (alias_result, array_copies_alias, asany_record_key, faithful_held, lib_vscode).
   - First run, at 42c333a6: `| TOTAL | 1992 checks | 9 FAILED |`. Seven were fixed (commit 2521973962, above) and
     each pair re-run: array_copies_alias 22, opaque_dynamic-key 9, opaque_exception-return 7, opaque_optional-chain 9,
     opaque_unsupported-call 11, opaque_unsupported-syntax 9 checks, all `ALL PASS`; opaque-unit passes.
   - Final run, at 25219739: `| TOTAL | 1992 checks | 2 FAILED |` (`| WALL | 1578 s | JOBS 4 |`). The two: `conformance fakes`
     (7 BAD, the known row, repaired by w2f) and `opaque_for_in` `break opaque-drop-read: Equal_upstream flips to proved`
     (`still not proved under the break`: the w1a/w1b incompatibility under Open). Nothing else fails.
   - From the run: `| PROOF-HUNT TOTAL | 397 units read by both lanes | NO HIDDEN FALSE PROOF |`;
     `| MODEL-CONFORMANCE TOTAL | 433 units in 84 pairs (8 skipped) | 99 executable: 91 agree, 8 disagree | … | NO NEW
     FINDING |`; `| SELF-PAIR TOTAL | 526 units | NO WITNESS |`.
5. Census on `/root/census-installs/w1a/nutshell`, using the command
   `NODE_OPTIONS=--max-old-space-size=8192 node <tree>/langs/ts/census.mjs /root/census-installs/w1a/nutshell
   --install-under /root/census-installs/w1a --out <json> --report <md>`. Each lane was run from its branch
   extracted with `git archive`, on the same root and install. 10511 units in every run, 0 failed files:

   | tree | entered | language-refused |
   | --- | ---: | ---: |
   | before: f38d200fe0 (this branch's start) | 6156 | 2845 |
   | w1a 93bd13d1e3 | 6430 | 2648 |
   | w1c 0d0f296904 | 6271 | 2750 |
   | w1g 58ef5f2a66 (best single lane) | 7287 | 2042 |
   | w1b c54e1997d7 | 6543 | 2563 |
   | **merged 2521973962** | **7655** | **1801** |

   The merged branch enters 7655 units: +1499 on its start, +368 on the best single lane. Per unit
   (`tools/census-lost.mjs`), the merge refuses 23 units the start enters (19 read-after-call, 4 callbacks), and
   24/25/28 units that w1a/w1c/w1b enter. Every one of them is refused on w1g's own branch too: w1g's wider reach of
   read-after-call, which closes its two false proofs (w1g's result). No unit that the reading which entered it would
   still enter is lost by the merge.

## Open

- **opaque-drop-read, a real incompatibility between w1a and w1b (reported, not patched).**
  - w1a's later opaqueForm, translate/opaque.mjs: `if (broken('opaque-drop-read') && inputs.length) { const i =
    Math.max(0, inputs.findIndex((x) => /^(int|real|bool|string)$/.test(x.d))); inputs = inputs.filter((_, j) => j !==
    i); } // the first scalar read (else the first)`
  - w1b, translate.mjs: `free.sort((a, b) => rank(a) - rank(b))`, read-only values first, with "tests/break.mjs
    opaque-drop-read, in opaqueForm, drops the first: a value that changes before the step and that the step reads".
  - On `opaque_for_in` the value changed upstream is a Record (`o2`). w1a's rule drops `k` (a string, equal on both
    sides) instead, so `Equal_upstream` stays unproved under the break: 1 of w1b's 243 rows and 1 suite row fail.
  - One design must be chosen for the mechanism. Suggestion: drop every read-only input, which removes "the step
    reads its state" outright and fits both lanes' pairs. It is not applied, because it would change w1a's and w1c's
    break rows too and needs their owners.
- `conformance fakes` (7 BAD): known at bd48de0b, repaired by w2f (in lead-v4 since dd9ec283, not in this branch).
- A w1g `type-assertion` expression step names a value that w1c's boundary step holds at Any. Its row's rule is
  `type-assertion` with no finding behind it. That is a certificate attribution only: the conversion is one shared
  symbol and covers 0 statements.
- A statement holding findings of two columns (w1c and w1b, say) is read as the first column's step. The other
  column's site then keeps its refusal ("an opaque site no step reached" or w1b's coverage refusal). That is
  conservative, and the census counts no such unit separately.
- The w1c site inside a w1a block: refused (unreached site), conservative; the block could own it, as w1g's
  read-after-call does.
- `break` in expect.json has two shapes: w1a's array, read by run.mjs `breakRows`, and w2d's map
  (`{mechanism: {unit: verdict}}`, read by tests/lib-break.mjs). They don't collide today because the lib_ pairs are
  `laneBOnly` and never reach breakRows. A lib pair with lane A would throw.
- The DYNAMIC_RULES key for w1b's `x.rule` siteFail falls back to `rule` (update/assignment expression), as on w1b's
  own branch.
