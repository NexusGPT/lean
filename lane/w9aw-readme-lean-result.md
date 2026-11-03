# w9aw-readme-lean: result (2026-11-03)

Branch `lane/w9aw-readme-lean` from lean 5d6fef8ef1. The commit changes `README.md` and adds this file. Nothing under
`langs/`, `tests/`, `scripts/` or `docs/` changed. No model call anywhere. Every run used `nice -n 15`, `LEAN_Z3=/opt/dafny/z3/bin/z3-4.12.1`,
`LC_ALL=en_US.UTF-8` and `LEAN_WORKER_HEAP_MB=6144`; pair runs used `--jobs 1`. No bench run.

## The checks, before and after

| check | before (5d6fef8ef1, README untouched) | after |
|---|---|---|
| `node scripts/readme-check.mjs` | `16 checks, 1 failed` (exit 1): `FAIL README line 225: lint exit 0, shown findings  [usual/booking.ts --advice]` | `16 checks, 0 failed` (exit 0) |
| `node scripts/assurance-check.mjs` | `\| TOTAL \| 20 named checks \| 1 FAILED \|` (exit 1): `repo pr intake` | `\| TOTAL \| 20 named checks \| 1 FAILED \|` (exit 1): the same row |

The brief expected 0 failed before. Both checks already failed at this head:

1. **readme-check, line 225.** The lint now grades `late && b.notes.push(...)` opaque (`[opaque: statement]`, exit 0, "inside the
   subset"). That came with w1a/w1b (4ab193cd2d, e296c47fce, both before the README's last change e01172c728): a graded
   finding exits 1 only on a refusal. readme-check's lint rule says "findings shown means exit 1", and the true output
   shows the finding first and "inside the subset" last, so no faithful copy of this output passes that rule. The README now
   gives this lint result in prose, quoting the finding line and exit 0, and keeps the `check.mjs` line, which the script
   does check. A follow-up in `scripts/readme-check.mjs` (out of this lane's scope): read the last shown line for "inside the
   subset", or accept exit 0 when every shown finding carries an `[opaque: …]` grade.
2. **assurance-check, `repo pr intake`.** Not a README line. `langs/ts/tests/fixtures/pr-intake/test.mjs` fails at
   `preview-audit.mjs:8`: `Preview started a lane: spawnSync /opt/dafny/z3/bin/z3-4.12.1`, from `pr.mjs:908` `checkPin` →
   `solve/z3.mjs versionOf`. The pin check (e01172c728, "w9z row 1: the pin") asks Z3 for its version before
   `--preview` returns, and the preview audit forbids any spawn. It fails the same way with `LEAN_Z3` unset (log
   `pr-intake-noz3.txt`). The fix belongs in `langs/ts` (the pin check skips the version spawn under `--preview`, or the
   audit allows the pin's version query). This lane may not touch that code.

## Each changed line, with its source

Line numbers are the README's after the commit.

| README line | was | now | source (run at this head) |
|---|---|---|---|
| 16 | "no `assume` anywhere a proof can see." | adds: a proof that reads a call through a fact lane B confirmed names that fact in `lanes.A.assumptions` | `langs/ts/check.mjs` 249-251 (the `// ASSUME` lines read into `assumed`); `langs/ts/design/w8e-callee-facts.md`; `node langs/ts/tests/callee-fact.mjs` exit 0: `callee-fact: all hold (tags PASS-proved under 1 assumption(s), tagsWriter WITNESS, sameWriter PASS-bounded with lane A refused; kept PASS-proved under 2, keptWriter WITNESS, sameKeptWriter PASS-bounded; keptWrite WITNESS, lane A not proved)` |
| 59 | (none) | new paragraph "Lane B goes after the changed line": value probes, world moves guided by compared literals, trailing arguments left out, awaited timers on the virtual clock, the loader's fixes | `langs/ts/design/w9l-bounded-and-moves.md` (searchWorld, recipe "a handle, absent, null, or a fault"), `w9ac-compare-literals.md` (exec/compared.mjs, worldMoves), `w9af-omitted-args.md` (run.mjs omittedForms), `world-calls.md` (run.mjs awaitUnit onClock); `lane/w9j-parent-load-result.md` |
| 63 | (none) | `omitted_args_unit`, `pad`: WITNESS; off: PASS-bounded (`w9af-omitted-args`) | `check.mjs --parent …/omitted_args_unit/parent.ts --candidate …/candidate.ts --unit pad --no-project`: `WITNESS -> omitted_args_unit-pad.json`, witness input 3, args `["vftsi"]`, `{"returned":"vftsi"}` against `{"returned":".vftsi"}`; under `LEAN_BREAK=w9af-omitted-args`: `PASS-bounded`; `run.mjs --pair omitted_args_unit --jobs 1`: `TOTAL \| 2 checks \| ALL PASS` |
| 64 | (none) | `world_await`, `backoff`: WITNESS; off: PASS-bounded (`world-clock`) | same command, unit `backoff`: `WITNESS`, `"retried"` against `"again"`; `LEAN_BREAK=world-clock`: `PASS-bounded`; `--pair world_await`: `TOTAL \| 3 checks \| ALL PASS` |
| 65 | (none) | `world_masked`, `register`: WITNESS from the world; off: PASS-bounded (`w9l-bounds`) | unit `register`: `WITNESS`, witness `source: world`, `world: ["arg0.getData()#1 = fake","arg0.getData()#1.vbk0f.entry = undefined"]`; `LEAN_BREAK=w9l-bounds`: `PASS-bounded`; `--pair world_masked`: `TOTAL \| 1 checks \| ALL PASS` |
| 66 | (none) | `shadowed_intrinsic_calls`, `count`: WITNESS `0` against `-1`; off: ASK, the parent fails to load | `.js` pair, unit `count`: `WITNESS`, `{"returned":0}` against `{"returned":-1}`; `LEAN_BREAK=emit-intrinsics-hoisted`: `ASK`, `parent: load failed: Cannot access 'Object' before initialization`; commit 9873874f64 (`exec/run.mjs intrinsicPrologue hoistedTemps`); `--pair shadowed_intrinsic_calls`: `TOTAL \| 1 checks \| ALL PASS` |
| 72 | `NEW` (a function with no parent, run with no equality claim) | adds: its record says what it does on drawn inputs and proposes a test, with a link | `exec/new-unit.mjs` runNew (records), `exec/new-test.mjs` writeNewTest |
| 74 | "The lint names the construct and lane A says `ASK`" | "…and lane A reads it as one opaque step or says `ASK`" | `node langs/ts/lint/lint.mjs langs/ts/tests/pairs/alias_result/candidate.ts`: `candidate.ts:59:10  alias-mutation  [opaque: block] …` (graded, design/w1a-opaque-mutation.md) |
| 78 | "the lint refuses line 59 (alias-mutation)" | "the lint grades line 59 an opaque block (alias-mutation)" | same lint line; `check.mjs … --unit bump --no-project`: `WITNESS`, input 5, both return 1, heap object `n: 1` against `n: 2` (unchanged parts of the line hold) |
| 134 | `applyAll`: "input 12: `posted: 2` against `posted: 0`; the parent calls `notify` twice" | "input 17: `posted: 1` against `posted: 0`; the parent calls `notify` once" | `check.mjs --parent langs/ts/tests/pairs/readme_ledger/parent.ts --candidate …/candidate.ts --unit applyAll --no-project --n 60 --seed 3 --dafny-seconds 30`: `WITNESS`, input 17, posted 1 against 0; parent trace `call arg2.notify ["a",-1]`, then `audit`; candidate trace `audit` only. Agrees with the quickstart line readme-check runs (`{"input":17,"floor":-1,"parent":1,"candidate":0}`) |
| 137 | `Ledger.post`: "program 3, `posted: 2` against `posted: 1`, … `count` … (2 against 1)" | "program 10, `posted: 3` against `posted: 2`, … (3 against 2)" | same command, unit `Ledger.post`: `WITNESS`, input `program 10`, posted 3 against 2, receiver `this.count` 3 against 2 |
| 135, 138, 139 | (kept) | (kept) | `statement`: `PASS-proved`, `Equal_statement: true`, `5 verified, 0 errors`; `Ledger.reset`: `Equal_ledger_reset: true`, `1 verified, 0 errors`; `Ledger.posted`: `1 verified, 0 errors`; `rollback`: `WITNESS`, input 0, threw `unknown account ` against returned 994 |
| 159-191 | (none) | new subsection "A function the pull request adds": closed calls, `new:fault` / `new:nan` / `new:ignored`, the proposed test, handed-out functions and callbacks, the impact, where no test is written | below |
| 161 | (none) | `pick(a, b)`: `new:ignored` on 6 inputs | `check.mjs --candidate langs/ts/tests/pairs/new_unit_facts/params.ts --unit pick --no-project`: `NEW`, record `{"kind":"new:ignored","param":"b","trials":6,…}` |
| 163 | (none) | runner dialects vitest, jest, mocha, node:test from `package.json`; cases by reach and kill; runner-model check | `exec/new-test.mjs` runnerOf (lines 65-79), selectCases, killsOf, `runTests` (new-tests.mjs) |
| 166-167 | (none) | `$ check.mjs --candidate …new_unit_test/candidate.ts --unit bucket --no-project` / `NEW … 5 cases of 200 closed calls, 7 of 7 statements, 15 of 15 planted mutants told apart, 5 of 5 passing` | run at this head: `NEW -> bucket.json`; record `cases 5, closed 200, statements listed 7 reached 7, mutants planted 15 killed 15, check {"selected":5,"passed":5,"failed":0,"world":0}`. readme-check runs this line now: `ok   README line 166: NEW shown, NEW now` |
| 170-175 | (none) | two of the five `it` blocks of the proposed test, verbatim | the record's `text` from the same run |
| 177-184 | (none) | handed-out functions and callbacks, `counter` and `mapAll` excerpts | `check.mjs --candidate langs/ts/tests/pairs/new_unit_test_drives/candidate.ts --unit counter --no-project`: `NEW`, `drives {"cases":1,"calls":6}`, statements 5 of 5, check 1 of 1 passed; unit `mapAll`: `NEW`, `callbacks {"cases":2,"calls":1}`, 4 of 4; the lines are the record's `text`, verbatim; `langs/ts/design/w9am-handed-functions.md`; `--pair new_unit_test_drives`: `TOTAL \| 6 checks \| ALL PASS`; `node langs/ts/tests/new-unit-test.mjs`: `new-unit-test: 14 checks, 0 failed` |
| 191 | (none) | where no test is written: no export names it, a member, every closed call holds a value of the world (no stubs yet), a timer | `exec/new-test.mjs` writeNewTest lines 365-367 ("not exported", "is a member", "(needs a stub)"); `design/w9am-handed-functions.md` "What stays out" (timers, lane w9al not merged); new-unit-test plain rows `no closed call`, `not exported` |
| 260 | "Two habits the lint still asks for:" | "Two habits still decide whether a change is proved:" | habit 1 no longer has a lint refusal (row 268) |
| 268-271 | `$ lint.mjs usual/booking.ts --advice` / `usual/booking.ts:4:3  unsupported-syntax  only assignments, …`; the check comment `lanes.A: ASK, translate: outside the subset (unsupported-syntax)` | the lint result in prose (`[opaque: statement]`, exit 0); the check comment `lanes.A: ASK:doubles-unknown, … (line 4) not encoded` | `node langs/ts/lint/lint.mjs usual/booking.ts --advice` (from examples/showcase), exit 0: `usual/booking.ts:4:3  unsupported-syntax  [opaque: statement] only assignments, ++/--, calls, and await may stand as statements` / `1 graded opaque (the unit is read with an opaque step)` / `usual/booking.ts: inside the subset`; `check.mjs … --unit confirm`: `PASS-bounded`, `lanes.A.verdict "ASK:doubles-unknown"`, `doubles.reason "not encoded: an expression statement that is not an assignment to a local: \`late && b.notes.push(\"late arrival\")\` (line 4)"` |
| 304 | (none) | Using it: `check.mjs --candidate new.ts --unit f` (`--tests …`) | `langs/ts/check.mjs` header lines 13-16 (`--tests`, `newUnit`); runs above with no `--parent` |
| 335 | backlog row ends at 2026-10-31 | adds landed 2026-11-02: key order through a same-file callee, an await's rejection inside a loop | `lane/w9y-translator-soundness-result.md`; commit 373a235a6a (2026-11-02); `--pair handed_key_order_callee`: `TOTAL \| 17 checks \| ALL PASS`; `--pair async_loop_exit`: `TOTAL \| 17 checks \| ALL PASS` |
| 336 | (none) | row: lane B's searches, built | rows 63-66 |
| 337 | (none) | row: a function with no parent, built; no world stubs yet | rows 159-191 |
| 345 | (none) | Limits: a function with no parent gets no equality claim; no test for world, member, unexported | `exec/new-test.mjs` header ("The test locks the unit's behaviour as submitted; it finds no bug by itself") and lines 365-367 |

## Every command block of the README, run at this head

| README line | command | output line now |
|---|---|---|
| 28-34 | quickstart `check.mjs … readme_ledger … --unit applyAll … --out ledger.json` + jq | `{"input":17,"floor":-1,"parent":1,"candidate":0}` (readme-check `ok   quickstart`) |
| 44-45 | `check.mjs … finite_components … --unit Toggle` | `PASS-decided`, `decided: 8 state pairs over 2 assignment(s)` (readme-check ok, both rows) |
| 77-78 | `check.mjs … alias_result … --unit bump` | `WITNESS` (readme-check ok) |
| 150-153 | `pr.mjs --repo . --base 85136f1~1 --head 85136f1 --scope unitDiscount` | `4 changed function(s); 5 unchanged caller(s) checked through lane B, 2 with a WITNESS through a changed callee: **1 in scope · 3 WITNESS · 1 PASS-proved · 0 PASS-decided · 1 PASS-bounded · 0 ASK · 0 REFUSE · 0 NEW**`; the `deliveryFee` witness's candidate line is `pricing.ts` 59 `return shop.deliveryFeeCents;` |
| 166-167 | `check.mjs --candidate …new_unit_test/candidate.ts --unit bucket --no-project` | `NEW -> bucket.json` (readme-check ok) |
| 198-201 | `lint.mjs docs/examples/limits/quote.ts --any-type` | exit 1, the two `any-type` lines (readme-check ok) |
| 234-238 | `check.mjs … readme_search … --unit Search` | `WITNESS -> search.json` / `patch: 1 insert` / `  div[2]/ul[0] insert <li key="vefqj">"vefqj"</li>`; witness `{"input":1,"sequence":["div[1]:onClick"]}` |
| 270-275 | showcase booking: usual check, lean lint, lean check | `PASS-bounded` (`ASK:doubles-unknown`); `lean/booking.ts: inside the subset` (exit 0); `PASS-proved`, `Equal_confirm: true`, `1 verified, 0 errors` |
| 287-293 | showcase ledger: four lines | lint exit 1 with the `prototype` line; `PASS-bounded`, lane A `ASK` at `translate-parent`, `translate: outside the subset: … prototype …`; `inside the subset`; `PASS-proved`, `Equal_index: true`, `13 verified, 0 errors` |
| 320-323 | `docker build` / `docker run` | not run: an image build is outside this lane's machine budget; the lines are unchanged from v0.1.3 and name no output |
| 352-353 | `check.mjs … retry.ts … --unit askUntilOk` | `WITNESS`, input 0; parent trace no `arg0.complete` call, candidate one (`["arg0.complete"]`) |

Inline commands the README quotes with their last line:

| README line | command | output now |
|---|---|---|
| 95 | `node langs/ts/tests/census_environment.mjs` | `census-environment: all hold` (exit 0) |
| 95 | `node langs/ts/tests/census_partial.mjs` | `ALL PASS` (exit 0) |
| 260 | `node langs/ts/tests/carried-alias.mjs` | `carried-alias: all hold` (exit 0) |
| 345 | `node langs/ts/tests/wall-cap.mjs` | `… the checker's own Dafny was capped the same way (PASS-bounded: not proved: wall cap 2 s exceeded)` (exit 0) |
| 348 | `node --test langs/ts/exec/sandbox-list.test.mjs` | `ℹ pass 8`, `ℹ fail 0` (exit 0) |
| 348 | `bash fixtures/sandbox/probe.sh` | exit 0; write, spawn, worker, read outside `ERR_ACCESS_DENIED`; `netSocket` `ok: connected` (open). `envRead` read 5 variables here, `HOME LEAN_NET LEAN_WORKER_HEAP_MB LEAN_Z3 PATH`, because this run exported `LEAN_Z3` and `LEAN_WORKER_HEAP_MB`, both kept by the `LEAN_*` rule the same line names. The README's "at v0.1.3 … read three" is a dated measurement and stays |

## What the brief named that has no README place

- **w9ad (through-site), w9ag (anchor dedupe), the oracle placement.** `git log` on this head has no commit naming any of
  them, and no file under `langs/`, `lane/` or `docs/` mentions them (`grep -rln -iE "w9ad|w9ag|through-site|anchor dedupe"`
  finds nothing). They are not in lean's tree, so the README says nothing about them.
- **w9i (reach lead order), w9aa (callee facts, heldBy), w9k ownFirst / routed lint, w9o (programs-share).** In the tree,
  but they change budgets and the order of witnesses, not a verdict word, a record a reader sees, a command or a limit.
  Callee facts reach the README through the `lanes.A.assumptions` line (16). w9k's records are the `new:*` facts (161).
- **world_guard_path (w9ac).** Under `check.mjs` at its default bound it is `WITNESS` both with and without
  `LEAN_BREAK=w9ac-compare-literals,w9ac-falsy-last` (both runs `WITNESS`). Its red is at the pair runner's own bound
  (`expect.json` break row), which this lane did not run. So it is not a table row. The guided moves are named in the
  paragraph (line 59) with their design note.
- **The design note `design/new-unit-test.md`.** Cited by `exec/new-test.mjs`, `tests/new-unit-test.mjs`,
  `new_unit_test/expect.json` and `w9am-handed-functions.md`, but it is not in the tree. The README links
  `exec/new-test.mjs` and `w9am-handed-functions.md` instead. Adding the note is a `langs/` change, for the writer's lane.

## Scope

`git diff --stat 5d6fef8ef1`: `README.md` and `lane/w9aw-readme-lean-result.md`. The pr.mjs runs (mine and readme-check's)
write `.lean/` under the tree, which is git-ignored. Scripts and logs of this lane:
`/root/lanes/w9aw-readme-lean/scripts/{claims,pairs,quoted}.sh`, `/root/lanes/w9aw-readme-lean/logs/`.
