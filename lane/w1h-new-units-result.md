# w1h-new-units: result (2026-11-01)

Branch `lane/w1h-new-units`, cut from lead-vm 4747022f. Design: `langs/ts/design/w1h-new-units.md`.

## What landed

A unit no parent holds (a function of an added file, or one added to an existing file) is read against its
declaration: its declared parameter types, its declared return type, its JSDoc `@throws`, an `asserts`/`never` return,
and the tests the PR adds that name it. Four records, in the certificate's `newUnit` (check.mjs), the pr.mjs row's
`records` and the report's section "New units against their declarations":

- `new:fault`: a throw or rejection on an input every declared parameter type admits, not named by the declaration, in
  a call that asked nothing of lean's world;
- `new:shape`: on such an input, a returned value that is not one of the declared return type (never for an inferred,
  `void` or opaque return);
- `new:test`: a PR-added test naming the unit fails against the candidate under lean's vitest/jest model, the run
  closed;
- `new:coverage`: the unit could not be loaded, drawn or tested so as to claim the above, with the reason.

Files: `exec/declared.mjs` (new: three-valued membership, edge values, the declaration, declared throws),
`exec/new-tests.mjs` (new: the runner model, test selection), `exec/new-census.mjs` (new: the census pass),
`exec/new-unit.mjs` (the records, the closed-call rule, the batch child), `exec/spec.mjs` (the declared specs, `narrowed`
primitives; not enumerable, lane B unchanged), `exec/run.mjs` (the raw outcome on the observation, not enumerable;
`guardedCall` exported), `check.mjs` (`--tests`, `newUnit`), `pr.mjs` (an added file's units run candidate-only, the PR's
tests handed over, the cache key holds them, the report section), `census.mjs` (`--new-units <files>`), `tests/run.mjs`
(`records`/`absent`/`tests` in candidate-only rows; suite rows `w1h-breaks`, `w1h-pr-new-file`),
`tests/w1h-new-units.mjs`, the pairs `new_unit_fault`, `new_unit_shape`, `new_unit_test`, `subset.md`,
`design/admission-contract.md` (decision-site section), `design/module-unit.md` (one line).

The A6 convention: no shared `tests/break.mjs` exists in any lane tree at the time of writing (w1a has not committed
one); this lane follows the form the w1d/w1e lanes use: the code reads `LEAN_BREAK=<mechanism>`, `tests/w1h-new-units.mjs
--break` runs each pair with it set and asserts it red.

## Numbers and their commands

All runs on the branch head of the last commit before this file, from `/root/lanes/w1h-new-units/tree`.

### Pairs, red first, and their breaks

| run | command | result |
|---|---|---|
| the three pairs and `new_unit` through the suite | `JOBS=2 LEAN_PAIRS=new_unit_fault,new_unit_shape,new_unit_test,new_unit node langs/ts/tests/run.mjs` | 937 checks, ALL PASS, wall 773 s (05:0x, after the ci refusals change; the 03:2x run's 933 was under `LEAN_JOBS=2`, a name the suite does not read, so it ran with the default 31 jobs) |
| each pair green | `node langs/ts/tests/w1h-new-units.mjs` | new_unit_fault 26 checks 0 failed; new_unit_shape 16, 0; new_unit_test 12, 0 |
| each break red | `node langs/ts/tests/w1h-new-units.mjs --break` | all 9 red: declared-edges 4 failed, declared-throws 2, admitted-input 2, closed-call 2 (fault); declared-shape 3, shape-drives 1 (shape); pr-tests 5, closed-test 2, platform-gap 1 (test) |
| pr.mjs on an added file and its test | `node langs/ts/tests/w1h-new-units.mjs --pr` | 5 of 5 ok: `initial` NEW with new:fault on `undefined`, `sum` new:test `sums`, certificate `newUnit`, the report section |
| red first: the same --pr check at the base commit (a worktree of 4747022f with the script copied in) | same, from `/root/lanes/w1h-new-units/redfirst` | 5 of 5 FAIL: every unit of the added file ASK `new file: no parent to compare with` |
| red first: the pair rows through the base commit's check.mjs | `node lane/w1h-census/rows.mjs <pair>` with its paths pointed at the base worktree (check.mjs per row) | 21 of 21 rows: no `newUnit` in the certificate, so every `records`/`absent` row of tests/run.mjs fails; base `encode` 0 faults (the generator never draws a lone surrogate), branch 1 `new:fault` |
| regression sample: 30 pairs with lane B expectations (every sixth such pair) plus the four new-unit pairs, with model conformance on the set | `JOBS=2 LEAN_PAIRS=<the 34> node langs/ts/tests/run.mjs` (list in lane/w1h-census/sample-pairs.txt, chosen by: `for d in tests/pairs/*/; do grep -q '"b"' $d/expect.json && echo $d; done \| awk 'NR%6==1' \| head -30`) | 1,357 checks, ALL PASS, wall 1,490 s (rerun 05:2x at JOBS=2; the first run's `LEAN_JOBS=2` was not read) |
| pr-intake fixture | `node langs/ts/tests/fixtures/pr-intake/test.mjs` | PASS |
| ci refusals | `node langs/ts/tests/ci/refusals.test.mjs` | 2 of 3 pass; the failing one (`refusals.json in --runs-dir`) fails the same way at the base commit; the absent-at-base test now expects `NEW` (it expected `ASK`) |

The full suite with `LEAN_CONFORMANCE=full` is the lead's at merge; this lane changes nothing under translate/ or lint/.

### The census (three roots; read-only copies copied to /root/census-installs/w1h/<root>)

`node langs/ts/census.mjs /root/census-installs/w1h/<root> --install-under /root/census-installs/w1h --out <json> --report <md> --new-units 1000`
(every written source file; the three at once, 04:10 to 04:14, load 39 at the start). Reports: `lane/w1h-census/<root>.md`, the first run `lane/w1h-census/<root>.run1.md`. The census walk's own numbers are
unchanged by this lane (it touches no lint, lowering or translator code).

| root | units read | NEW / ASK | inputs drawn / admitted / closed (edge) | units with new:fault | new:shape | new:test | new:coverage | root tests naming a unit: pass / fail / world / not modelled |
|---|---:|---|---|---:|---:|---:|---:|---|
| nexus-tokens | 44 | 40 / 4 | 1,200 / 1,200 / 360 (530) | 0 | 0 | 0 | 36 | 12 / 0 / 701 / 0 |
| status | 410 | 359 / 51 | 10,770 / 8,988 / 7,360 (3,842) | 11 | 4 | 0 | 204 | 522 / 0 / 208 / 32 |
| nexus-chat-embed | 236 | 221 / 15 | 6,665 / 5,623 / 2,094 (1,630) | 1 | 0 | 0 | 160 | 465 / 0 / 395 / 48 |
| total | 690 | 620 / 70 | 18,635 / 15,811 / 9,814 (6,002) | 12 | 4 | 0 | 400 | 999 / 0 / 1,304 / 80 |

Records written (status, nexus-chat-embed), each a fact about the declaration, none a claim of a defect:
`mapIncidentRow`, `dayKeyAt`, `isoSecond`, `describeIncident`, `MessageTimestamp` throw `RangeError: Invalid time value`
on a NaN or infinite `number` their types admit; `buildStrip` reads `.ticksUp` of undefined on an edge window;
`parsePruneSql`, `countingSqlFor`, `runPlan` throw their own "cannot plan this statement" on `""`; `rawToCounts` and
`mapIncidentRow` return a raw database string (`"unknown"`, `""`) where the declared type is a literal union (the unit
casts it); `selectChunk` returns `urls[0] === undefined` for `string[]`; `baselineFromSamples([], x)` returns
`p95Ms: undefined` for `number`.

The first census run (03:45, before the fixes below) wrote 20 `new:test` records on status and one `new:shape`
(`recordingDb`); all 21 were lean's, not the code's, and each became a mechanism with its pair row and its switch:
- 20 `new:test` on `pages-routes.test.ts`: `Response is not defined`, a global Node holds and the sandbox does not.
  A ReferenceError naming a host global is coverage (`platform-gap`, row `platform.test.ts`).
- `recordingDb`: its returned value held what lane B's observer wrote into it when it drove the returned functions
  after the return. No shape is read after drives (`shape-drives`, row `recorder`).
- Found while probing nexus-tokens before the run: a `new:test` on `contrast-math.test.ts` whose fixture `BLACK` was
  computed at load through a helper that called `culori` (lean's fake). Loading may ask nothing but the linker's reads
  (`closed-call`, rows `ready` and `fixture.test.ts`).
- A batch child killed by an out-of-memory draw (`new Array(1e9).fill(0)` in status `bucketiseCounts`, lane B's own
  generator value) no longer loses the file's later units: the batch resumes past it.

Rerun after the fixes: 0 `new:test`, and 0 failures among the 999 root tests the runner model ran to a pass or fail.

## What is open

- The closed-call rule is syntactic: a package binding read once without a trap, or a package call at load, makes
  the whole graph world (nexus-tokens: 360 of 1,200 inputs closed; `culori` is called at load). A per-unit static reach
  would widen it.
- Tests: 1,304 of 2,335 root tests touched the world (mostly fixtures read through lean's fake `fs`, and package
  calls), 80 use what the runner model does not hold (module mocks, `Response`). Real installed packages for tests,
  instead of fakes, would be the W6 environment's to give.
- `tests/break.mjs` (A6) is now on `lane/w1a-opaque-mutation` (not on lead-vm, so not in this tree). Its convention is
  the one used here (`LEAN_BREAK=<name>`); at merge, the nine sites that read `process.env.LEAN_BREAK === '<name>'`
  (exec/declared.mjs 146, 192; exec/new-tests.mjs 187, 238; exec/new-unit.mjs 286, 289, 302, 303, 313, 425) become
  `broken('<name>')`, and the nine names join its `MECHANISMS`: declared-edges, declared-throws, admitted-input,
  closed-call, declared-shape, shape-drives, pr-tests, closed-test, platform-gap. Its `breakRows` checks lemma flips
  (`equal`); a break here flips a record (`records`/`absent`), so tests/w1h-new-units.mjs --break stays the row runner
  for these pairs until break.mjs gains a records form.
- The 44 AACR instances were not read; the 98 notes on new files are this lane's first reading, measured by W5.
- Scratch removed: the red-first worktree, /tmp/w1h, and the node_modules installed under /root/census-installs/w1h.
