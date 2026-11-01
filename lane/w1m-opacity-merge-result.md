# Lane w1m-opacity-merge: result

Six merges: the four below, then w1e and w1d (section "Resume", after Open). Branch `lane/w1m-opacity-merge`, started at f38d200fe0 (lead-v4 then: bd48de0b plus the lead's fixture commit).
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

## Resume: w1e and w1d on top (merges five and six)

On the lead's resume (18:5x CET) the branch continued from 408adc77 with two more lanes, the same rules and validators.

| commit | what |
| --- | --- |
| ceeb02ac14 | merge `lane/w1e-opaque-this-globals` (675c04d5c6; 8 commits over lead-vm 4747022f) |
| a59440d06b | merge `lane/w1d-opaque-async` (a451ccdc38; cut from w1a 0952b040ef, 13 commits over it) |
| 440502e48a | w1d's driver: its load bound read from `LEAN_LOAD_GATE` (40 unless set) |

Neither lane cherry-picked: w1e is cut from lead-vm, and w1d from w1a's 0952b040ef, which this branch holds. Both
are plain three-way merges.

### w1e
| file / place | ours | w1e | rule | resolution |
| --- | --- | --- | --- | --- |
| census.mjs unit loop | per-unit opaque record (w1a/w1c), `envBlocked` of every unresolved-module finding | `envBlocked` skips a finding with `handle` | two additions | both: the opaque record, and w1e's `!f.handle` |
| census.mjs finding record | `opaque`, `opaqueSite` (w1c) | `handle: true` | two additions | both spreads |
| tests/run.mjs runtime rows | w1h-breaks, w1h-pr-new-file | w1e-breaks | two additions | both, w1h's first |
| tests/stepcache.mjs (auto-merged) | w2d's `PRODUCER_SWITCHES` (LEAN_BREAK, LEAN_LIBRARY_FAKES) in the key | `LEAN_BREAK` and `LEAN_WITHDRAW` hashed into producerHash | the same mechanism twice | the earlier one (w2d's) kept once; w1e's `LEAN_WITHDRAW` joins PRODUCER_SWITCHES; w1e's hash line dropped. (A side effect of w1e's line: producerHash is memoised per kind, so it would have kept the first run's switches.) |
| admission-contract.md | generated table | generated table (line numbers only), no dated section | regenerate | `lower.mjs --audit --md`: 656 sites, 0 uncatalogued |
| break convention | `broken()` of langs/ts/break.mjs | lint.mjs `breaks` set + exported `mechanismOff`, read once at import | one convention | lint.mjs `unresolvedGlobal`, the `effectful-cell` gate, the callback loop (`lexical-this`), `environmentHandle` (`environment-handle`), the `incomplete-member` read: `broken()`; translate.mjs `moduleAccessor` (`cell-key`) and `heldKey` (`held-key`): `broken()`. `mechanismOff` removed (translate.mjs was its only importer). Seven names registered in tests/break.mjs MECHANISMS. |

### w1d
| file / place | ours | w1d | rule | resolution |
| --- | --- | --- | --- | --- |
| lint.mjs imports | opaque-calls import (w1c) | opaque-async import | two additions | both |
| lint.mjs OPAQUE_ROWS | w1g's expression rows, w1b's statement rows | eleven async rows (`expression`) | two additions | both, w1d's last; then w1b's OPAQUE_ENVELOPE and w1d's ASYNC_OPAQUE load check, both |
| lint.mjs `v()` | w1c's `callsAt` record | w1d's `asyncAt` record | two additions | both |
| lint.mjs end of walk | w1c's site pass | w1d's withdrawal pass | two additions | both, w1c's first. No rule is in both OPAQUE_CALLS and ASYNC_OPAQUE |
| tests/break.mjs | the registry | w1d's copies of w1a's three early lines + five async names | names join | registry kept (w1a's later text); `async-drop-reads`, `-origins`, `-callees`, `-carry`, `-pending` added |
| translate.mjs imports | `broken` from ../break.mjs | `broken` from ../tests/break.mjs, opaque-async import | one convention; two additions | ../break.mjs; the opaque-async import (with ASYNC_OPAQUE) |
| opaque-async.mjs (new) | | `broken` from ./tests/break.mjs | one convention | ./break.mjs (the product never imports from tests/) |
| translate.mjs retry loop | w1b's loop, w1g's `opaqueGrade(graded) !== 'expression'` | `opaqueGrade(rule0) === 'block'` | the same intent at one place | ours: an expression grade never makes a block site in either; w1b's loop also takes statement rows |
| translate.mjs gate0 | `opaqueGrade(g.rule) !== 'block'` passes the finding on (a w1g expression finding is a refusal its reading left) | `(g.opaque ?? 'none') === 'none'` passes it on; every other `expression` finding becomes an async site | two readers of one grade | Both families grade `expression`. Taken as is, w1d's reader would make w1g's remaining refusals (read-after-call, copied-argument, type-assertion: the ones that close w1g's false proofs) into async steps. Each column reads its own rules: the async reader takes a finding whose own grade is `expression` (w1d's lint withdraws it where the construct is no step) and whose rule is in ASYNC_OPAQUE; every other finding goes on as before |
| translate.mjs isOpaqueStmt | siteHere / designatedHere (w1c, w1b) | `asyncOpaqueAt`, `stepWritesOf` before it | two additions | both |
| translate.mjs heap plan | siteUnits (w1a, w1c) + w1b's third argument | expressionUnits leave `only` | two additions | w1d's units join siteUnits |
| admission-contract.md | table | table + w1d's dated section | regenerate; sections kept | 658 sites, 0 uncatalogued; w1d's section last. Its own text ("605 sites") is the count at w1d's head, kept as written |

### Break sites touched in these two merges
w1e: lint.mjs (5: unresolved-global, effectful-cell, lexical-this, environment-handle, incomplete-member), translate.mjs (2:
cell-key, held-key). w1d: the import of opaque-async.mjs and translate.mjs (its sites already called `broken()`). The
registry now holds 47 names. Every `broken('…')` name in langs/ts is registered (43 names). The other four are read
through `breakList()` (cex-replay, cex-replay-by-index in solve/counterexample.mjs) or `broken()` with a computed name (common.mjs
sealedCollection: sealed-collection, unhanded-collection).

### Validators at 440502e48a (output lines verbatim)

1. The lanes' own tests:
   - w1e `node langs/ts/tests/w1e-opaque-this-globals.mjs`: `ok   opaque_this: 20 checks, 0 failed`, `ok   opaque_global_read:
     11 checks, 0 failed`, `ok   opaque_ts_strict: 5 checks, 0 failed`, `ok   opaque_toplevel_effect: 8 checks, 0 failed`,
     `every pair green`. `--break`: `every break turns its pair red` (6 runs, w1e's six names).
   - w1d `LEAN_LOAD_GATE=63 node langs/ts/tests/w1d-opaque-async.mjs --jobs 2`: `FAIL  as written: 173 of 176 rows pass over
     15 pairs`, `1 FAILED`. The three rows are the break rows of opaque_async_origin (Open, the first item). Every
     other row PASS: the 60 lint rows, the pairs' verdict, opaque and break rows, and `PASS  pending: under
     LEAN_BREAK=async-drop-pending lane A proves Equal_capture (a false proof: the mechanism is what refuses it)`.
   - w1c `node langs/ts/tests/opaque-calls.mjs`: `114/114 rows hold`; `--break`: `8/8 rows hold`.
   - w1b `JOBS=3 node langs/ts/tests/opaque-statements.mjs`: `19 pairs, 243 rows, 1 failed` (opaque_for_in, the w1a/w1b
     row reported before); `--break opaque-drop-read`: `12 pairs, 188 rows, 12 failed, 11 `upstream` units proved
     falsely without the mechanism`; `--break opaque-drop-write`: `1 pairs, 5 rows, 1 failed, 1 `stale` units proved
     falsely without the mechanism`; `--break opaque-drop-callees`: `1 pairs, 1 rows, 1 failed, 1 `callee` units proved
     falsely without the mechanism`. All as at 25219739.
   - w1g `node langs/ts/tests/w1g-opaque-handed.mjs`: both `ok`; `--break`: both `FAIL … translated (exit 0)` (red, as
     the test demands). w1a's 15 and w1g's 3 pairs are in the suite run (4).
   - w1h `every pair green` / `every break turns its pair red`; w1f `w1f-module-units: module_unit 7/7; type_only 9/9;
     directive 10/10; js_unit 6/6; --break w1f-module 5 red; --break w1f-js 2 red; --break w1f-types 3 red; --break
     w1f-emit 5 red; --break w1f-closure 2 red; --break w1f-directive 1 red`; `census-environment: all hold`.
2. At ceeb02ac14 and again at a59440d06b: `PASS pr intake: only the changed function, the module unit and the types
   unit are verdict rows; …`; `ledger.test: all assertions pass`; `withdrawal: logic-values v1 refused identically by
   the lint, the translator and the record; check PASS-bounded (lane A ASK) under the withdrawal, PASS-proved without;
   audit 658 site rows, 0 uncatalogued` (656 at ceeb02ac); `opaque-unit: …` passes; `translator-crashes: native type
   identity checked; …`; `a step is keyed by the producer switches it inherits` (step-cache-break); `no silent exit for
   importers: …` (a59440d0); `sites 658; by kind {"lint-refuse":381,"lint-advice":5,"translate-throw":4,
   "translate-refuse":268}; uncatalogued 0`.
   `node --check` of every changed .mjs and the import smoke of pr, check, lower, lint, translate, opaque, break,
   tests/break, readings, census: `checks fail=0`.
3. `python3 -I conformance/run.py ts` from langs/ts: `conformance: PASS, 253 of 253 checks passed, languages: ts`.
4. Suite, `LEAN_CONFORMANCE=full JOBS=4 LEAN_PAIRS=<111 pairs> node langs/ts/tests/run.mjs`. The 111: the 92 of the
   first run, plus w1e's 4 and w1d's 15 pairs (every `opaque_*` pair, 77 in all).
   `| TOTAL | 2215 checks | 5 FAILED |`, `| WALL | 2472 s | JOBS 4 |`. The five:
   - `conformance fakes` (`7 BAD`, `| FAKE-CONFORMANCE TOTAL | 36 fake(s) under exec/fakes, 29 pass | …`): the known
     row, repaired by w2f, not in this branch.
   - `opaque_for_in` `break opaque-drop-read: Equal_upstream flips to proved`: the w1a/w1b row reported before.
   - `opaque_async_origin` `break async-drop-origins: Equal_count flips to proved`, `… Equal_share …`, `break
     async-drop-carry: Equal_branch flips to proved`: the w1d/w1g finding (Open). All three say `still not proved
     under the break: the mechanism is not what refuses it`.
   Nothing else fails. `| PROOF-HUNT TOTAL | 449 units read by both lanes | NO HIDDEN FALSE PROOF |`;
   `| MODEL-CONFORMANCE TOTAL | 515 units in 100 pairs (11 skipped) | 105 executable: 97 agree, 8 disagree | … | 0
   coupling finding(s) (2 sampled) | NO NEW FINDING |`; `| SELF-PAIR TOTAL | 649 units | NO WITNESS |`.
5. Census on `/root/census-installs/w1a/nutshell`, the same command as before, each tree from `git archive`. 10511 units
   in every run, 0 files unreadable:

   | tree | entered | language-refused |
   | --- | ---: | ---: |
   | before: 2521973962 (the four merges; 408adc77 differs by the result file only) | 7655 | 1801 |
   | w1e alone 675c04d5c6 (cut from lead-vm) | 6165 | 2823 |
   | after w1e: ceeb02ac14 | 7674 | 1765 |
   | w1d alone a451ccdc38 (cut from w1a 0952b040ef) | 6520 | 2591 |
   | **after w1d: a59440d06b** | **7836** | **1678** |

   The best single lane on this root is still w1g (7287). The merged branch enters 7836: +181 on the four-lane
   merge, +549 on w1g, +1680 on this branch's start (6156). Per unit (`tools/census-lost.mjs`):
   - The w1e merge refuses 1 unit that the four-lane merge entered: `core/conversations/src/held-messages/hand-over.ts
     SendsNotHandedOver.waitUntilASendIsReleased/Promise()#0`, a `new Promise` executor callback. With w1e's lexical
     receiver it reads `this.waiting` at its class's type, and w1g's copied-argument reading refuses
     `[...(this.waiting.get(conversation) ?? [])]` handed to a call. w1e alone refuses it on the same finding.
   - The w1d merge refuses no unit the w1e merge entered.
   - Of the units w1e alone (24) or w1d alone (25) enters that the merge refuses: read-after-call 20, callbacks 4
     (refused on w1g's own branch too, as in the four-lane merge), and the hand-over unit above.
   So the merge loses no unit that the lane whose rule refuses it would enter.

### Open (these two merges)

- **Closed in Resume 2 (below).** w1d's break rows on opaque_async_origin: two mechanisms guard the same units. On the
  merged tree, `async-drop-origins` leaves `count` and `share` unproved, and `async-drop-carry` leaves `branch`
  unproved (3 of w1d's 176 rows, 3 suite rows). The merge is sound: they are still not proved. The rows fail because
  w1d's mechanism is no longer the only one that refuses them:
  - w1d, opaque-async.mjs `stepWrites`: `if (broken('async-drop-origins')) return { writes: [...mentioned].filter((d) =>
    inScopeAt(d, node, fn)) }; // the --break: the references mentioned only (no sharing, no rebinding)`, and
    translate.mjs: `if (asyncOpaqueAt(x) && currentUnit && !broken('async-drop-carry')) for (const d of stepWritesOf(x))
    note(d.name);`.
  - w1g, common.mjs readAfterCall `share` (the read through a holder of what the call was handed): `if
    (broken('reach-closure')) return false;`. `fill(st, t, k)` is an effect call that reaches the outside (`st.tag`).
    The later read of `user.tags.length` is read through `user`, a holder of `t`, so on the merged tree it is
    `ext_now_World_Rec_1clk5vf(wld, user)`, the object as the world holds it after the step. That holds whatever the
    step writes.
  - Checked by translation of the parent (`translate.mjs --core --only count,share,branch,bump`): under
    `async-drop-origins` the count step writes `(wld, t0_, st, t)` only, and the read is still `ext_now_…(wld, user)`
    (4 ext_now reads in the file). Under `async-drop-origins,reach-closure` and under `async-drop-carry,reach-closure`
    there are 0 ext_now reads, which is the shape the row expects to prove falsely. `bump` (w1d's own rebinding, `k++`
    in the argument) still flips under its break.
  - What to decide: whether w1d's write closure stays the mechanism of record for a read after the step (then the
    pair needs a shape that w1g's world read does not cover, a value read back through a step output and not through
    a holder), or the row names both mechanisms (the registry has no composite name today: `breakRows` throws on an
    unregistered one). That is for w1d's and w1g's owners. Nothing is changed here.
- **opaque-async.mjs cannot be the first module loaded (w1d, also on its own branch).** `node -e
  "await import('./langs/ts/opaque-async.mjs')"`: `ReferenceError: Cannot access 'ASYNC_OPAQUE' before
  initialization` at lint.mjs's load check. The cycle: opaque-async.mjs → translate/opaque.mjs → lint/lint.mjs, which
  reads ASYNC_OPAQUE at load. Every importer today loads lint.mjs first (translate.mjs, tests/w1d-opaque-async.mjs), so
  nothing fails. It is latent and identical on a451ccdc38. Not changed.
- The opaque-drop-read incompatibility between w1a and w1b stands as recorded above (still 1 w1b row and 1 suite row).
- `conformance fakes` (7 BAD): known, repaired by w2f, not in this branch.
- w1d's driver gate: tests/w1d-opaque-async.mjs started a pair only below load 40, which this machine never reached
  today. The bound now reads `LEAN_LOAD_GATE` (40 unless set) and ran at 63. That is the only change to a lane's test in
  these merges.
- Dated sections of admission-contract.md keep each lane's own counts as written (w1d's "605 sites"). The table is this
  branch's: 658 sites, 0 uncatalogued.

## Resume 2: the three opaque_async_origin break rows (the lead's one open item)

The lead's rule: fix the test and leave the mechanisms alone. When a second mechanism also guards a break row's unit,
the row breaks both. `LEAN_BREAK` already takes a list (break.mjs `breakList`), so no combined name is registered.
- tests/break.mjs `breakRows`: a row's `mechanism` may list names (`"a,b"`). Every name must be registered. The header
  comment covers the two-guards case.
- pairs/opaque_async_origin/expect.json: `async-drop-origins` now covers `bump` only, `async-drop-origins,reach-closure`
  covers `count` and `share`, and `async-drop-carry,reach-closure` covers `branch`. The pair's `why` names both guards.
- design/w1d-opaque-async.md, "Each pair's breaks": the rows as above, plus a paragraph on two guards (w1g's world
  read through the holder `user` refuses count, share and branch on its own, and bump has only w1d's guard).
- No mechanism changed. No other test changed.

Validators (output lines verbatim, load about 70-90, `LEAN_LOAD_GATE` set above it):
- `node langs/ts/tests/run.mjs --pair opaque_async_origin`: `| TOTAL | 14 checks | ALL PASS |`. Its break rows are
  `break async-drop-origins: Equal_bump`, `break async-drop-origins,reach-closure: Equal_count`, `… Equal_share`
  and `break async-drop-carry,reach-closure: Equal_branch`, each `PASS` with `proved under LEAN_BREAK=<names>: the
  mechanism is what refuses it`. These are the three suite rows that failed before, now passing.
- Either guard on keeps the units unproved. With w1d's guards off alone this held already (the three rows above, before
  this fix). With `reach-closure` off alone, a temporary copy of the pair (removed afterwards) whose break row named
  only `reach-closure` gave `still not proved under the break` for count, share and branch (`3 FAILED`).
- `LEAN_LOAD_GATE=90 node langs/ts/tests/w1d-opaque-async.mjs --jobs 2`: `PASS  as written: 176 of 176 rows pass over
  15 pairs`, then both pending lines `PASS`, then `ALL PASS`, exit 0.
- The driver has no `--break` option. Its break convention is the pairs' own `break` rows, which run inside the
  `as written` line and pass only when the broken run proves falsely. Each of those rows is red as a break, as shown
  above.


## Resume 3: the two merge regressions the full suite found on lead-v4 0b260f05

Commits: a83d0574c9 (the two fixes), d0eaa4a095 (lead-v4 merged into this lane, so the suite runs on what the lead
merges; one conflict, below).

### 1. The `break` key: one shape, one reader

- The shape is the array of rows. A row's `equal` is lane A's (lemmas the broken run proves). Its `b` is lane B's
  (verdicts under the break; each unit is in the pair's own `b` with another verdict). The array stays because a pair
  can hold two rows of one mechanism, and one row can name two mechanisms (`opaque_async_origin`). A map keyed by
  mechanism has no place for either. The reason is recorded in the header of tests/break.mjs and in
  design/w2d-library-rows.md (the tests table); design/w1a-opaque-mutation.md's A6 line names `b`.
- One reader: tests/break.mjs `breakRows` refuses a key that is not an array, then returns lane A rows and lane B rows
  (it also checks each flip). tests/run.mjs takes the lane A rows; tests/lib-break.mjs takes the lane B rows. It no
  longer reads `exp.break` itself.
- The 9 `lib_` maps are rewritten as rows. lib_vscode: lead-v4 (w2f) dropped its fake and its break, which caused the
  one merge conflict. I took lead-v4's side; its why now names the row shape.
- `node langs/ts/tests/lib-break.mjs --jobs 2` (before the lead-v4 merge, 10 rows with lib_vscode's): `lib-break: 10
  rows, 0 failed`, with no junk row. After the merge there are 9 lane B rows (`breakRows` over every pair: A 51, B 9).
- `node langs/ts/tests/run.mjs --pair lib_date_fns`: `| TOTAL | 5 checks | ALL PASS |`; `--pair lib_lodash`:
  `| TOTAL | 11 checks | ALL PASS |`.

### 2. The four pairs w1g's read-after-call changed

Every translation below was compared with the one at 55875329 (scratch worktree). After the fixes, both sides of
`service`, `mixed_logic_values` and `type_assertions` translate to the same bodies as at 55875329.

- `service`, `mixed_logic_values`: the reading is fixed, and `Equal_service_both` is proved again. Cause: w1g's
  `share` closure (common.mjs) took the class's ports in. `this.repo.find(id)` hands `this.repo` (`interface Repo {
  find(...) }`), and `ChatService` holds a `Repo`, so every later read of `this` met the call. `this.label(...)` (no
  world form) then refused the unit, and `both`'s else-branch re-read `this` through `ext_now`. Fix: a type whose every
  member is a method (no data property, no index signature, no type argument; `methodsOnly`) leaves the closure. A
  read through such a type is a call, which threads the world, and a test of it is a test of identity. `reaches` still
  counts the handed port itself. Recorded in design/w1g-opaque-handed.md, "A port holds no field".
- `type_assertions` (4 rows): the reading is fixed. Cause: w1g's `outsideSlot` took the faithful reading's
  `Math.__lean_add` (declared in `lean-number.d.ts`) for another file's function. Two effects followed. First, a held
  value in `dbl`'s rewritten `n + n` was converted to int, and the held variant returned an int, so
  `Equal_param_held`'s real lemma lost its proof. Second, the faithful text, which refused that slot at the base and so
  left the file to the exact reading, now placed `twice`, `result_held` and `compound_held`. Fix: a callee declared in
  `lean-number.d.ts` is no outside slot. The `outside-slot` break is untouched: its check comes first. Recorded in
  design/w1g-opaque-handed.md, the type-assertion section.
- `fresh_local_handed`: the expectation is updated (lane A `ASK:unproved`, was `read-after-call`). This is w1g's
  intended reading. A name bound to a new record and handed to `g` now has an identity (its site), so `x.n` after the
  call reads `ext_now_fresh(wld, x, 0).n`. That is the record as the world holds it after `g`, and the candidate's `1`
  does not equal it. local is still never proved; it was refused before and is unproved now. Recorded in the pair's
  why. No proof was lost.

Validators after the fixes (load about 70, verbatim):
- `run.mjs --pair` service `| TOTAL | 8 checks | ALL PASS |`; fresh_local_handed `| TOTAL | 2 checks | ALL PASS |`;
  mixed_logic_values `| TOTAL | 40 checks | ALL PASS |`; type_assertions `| TOTAL | 45 checks | ALL PASS |`;
  opaque_async_origin `| TOTAL | 14 checks | ALL PASS |`; opaque_read_after_call `| TOTAL | 28 checks | ALL PASS |`.
  The last two cover the reach-closure break rows (holder; count, share and branch).
- `node langs/ts/tests/w1g-opaque-handed.mjs`: exit 0. With `--break`: exit 1 (red, as it must be).
- `LEAN_LOAD_GATE=100 node langs/ts/tests/w1d-opaque-async.mjs --jobs 1`: `PASS  as written: 176 of 176 rows pass over
  15 pairs`, `ALL PASS`, exit 0.

### The full suite (d0eaa4a095, lead-v4 merged)

`LEAN_CONFORMANCE=full JOBS=4 LEAN_LOAD_GATE=100 node langs/ts/tests/run.mjs` (load about 70 from other sessions):

**No TOTAL line: the run did not finish.** The harness's background limit (2 h, the longest it allows) stopped it.
By then it had printed only its start (`conformance: LEAN_CONFORMANCE=full: every pair`, then a fake's debug output),
and it had written no result file. I did not restart it, because a second run under the same limit stops the same way.
The suite has to run where it can take more than 2 h at this load, or with a JOBS the machine allows (the lead's Mac
took JOBS=6). So "the only failures left are the known ones" is **not verified** here. What is verified is the per-pair
and driver lines above, for every pair the two regressions named, plus lib-break and the w1d and w1g drivers.
