# w9bg-scripts-no-exports: result

Branch `lane/w9bg-scripts-no-exports`, from the shared lean head 3e3ec12356.

| Commit | What it does |
|---|---|
| 29d49b5e2c | The script mechanism, its checks and fixtures. The bench measurement ran at this head. |
| 9c4f444b25 | A proposed test is named after the repository file, not after pr.mjs's temporary copy. |
| the commit of this file | The design note's last two sections. |

Design note: `langs/ts/design/w9bg-scripts.md`.

## Summary

- **Lean alone:** the three ids go from 0 of 3 records to 3 of 3. Each record passes its self-check and reaches every
  statement of `request`.
- **Bench:** still 0 of 3 rendered, for two reasons.
  - **Lean side, fixed in 9c4f444b25, after the measurement:** every proposed test from the PR path was named after a
    temporary file the checkout does not hold. This affected all proposed tests, not just these three.
  - **Checker / repository side, not changed here:** cline's vitest `include` list holds no glob over
    `apps/vscode/scripts/`, and the checker only places a proposed test beside its source. The repository's runner can
    never run a test beside this script.
- **Not done in this lane:**
  - A second bench measurement after 9c4f444b25.
  - Tests for the `(module)` unit of an added file.
  - `node:test` / `mocha` dialects for scripts: refused, with the reason stated.

## The cause (the three ids)

`cline__cline#13799~m1/m2/m3` plant their bugs in `request` (lines 12-27) of `apps/vscode/scripts/repro-cloud-session.mjs`.

- The file is a script: no exports, a top-level `await`, and every statement reached from its body.
- At 3e3ec12356, lean alone draws 26-27 calls of `request`, all of which ask the world. The writer refuses them on
  the unit's static reach: "a module binding the call reads was set at load, and loading asked the world (… get
  module:process.env)".
- Behind that refusal sits a second one: "the unit request is not exported: the repository's runner cannot import it
  (needs a stub)".
- In the s75 count (lean 9873874f64) there was no `phase: test` record at all.

## The mechanisms (each behind `LEAN_BREAK`, rows at the end of `tests/break.mjs`)

| Mechanism | What it does |
|---|---|
| `new-test-script` | A unit of a script gets its cases from the script's own body. The body is evaluated `min(n, 40)` times, each run seeded as an input is, with the world answering it as it answers a call (`loadCandidate` body mode, `scriptCases`). Each case is one `it`: `vi.resetModules()`, the case's stubs, `await import('./script')` or `await expect(import(…)).rejects.toThrow(msg)`, then the requests asserted in order (`callsOf`). The mutants are replayed as body runs (`killsOf`). In the runner model, a static or dynamic side-effect import of the unit's file selects the unit, and `vi.resetModules` empties the loader's module cache. |
| `new-test-script-reach` | The unit's statements, as completed by the kept body runs, are the bar. A statement that no run completes under the stubs is reported ("missed: lines …"), never guessed. |
| `new-test-env` | `process.env.NAME` becomes a surface. The test sets the variable to lean's answer, or deletes it, and puts it back in `finally`. `envRead`: `process.env.X` is a read that runs a trap, so it no longer counts as a world global. Applies to every unit, not only scripts (fixture `env.ts`, an exported unit). |
| `new-test-output` | A console call that returned nothing is let through: the test lets it print. |
| `new-test-source-name` | A test is named after the file's repository name and imports it by that name, not the `.lean_head_<pid>_` copy (`pr.mjs` → `check.mjs --source-name` → `placeOf`). |

**The fixtures are generic** (`tests/fixtures/new-unit-test/`):

- `script.ts`: reads a token from the environment, PUTs a report, logs it.
- `script-main.ts`: only defines functions and calls `main`. `headers` is reached through `main` → `upload`. `main`'s
  retry after a timer is the reported reach gap.
- `env.ts`: an exported unit that reads an environment variable.

None of them uses the cline script's text, names or values.

## Validators (output lines verbatim)

**`node tests/new-unit-test.mjs`**
- Before: 31 checks.
- After: `new-unit-test: 38 checks, 0 failed`. That is 31 existing plus 7 new: 2 × `new-test-script`, and one each of
  `new-test-script-reach`, `new-test-env`, `new-test-output`, `new-test-source-name`, plus the plain determinism check.
- The first commit alone gave `new-unit-test: 37 checks, 0 failed`.

**`node tests/new-unit-test.mjs --break`**
- Before: 20 mechanism rows.
- After: `new-unit-test --break: 26 checks, 0 failed`. All 26 are `RED (caught)`, the 6 new rows among them.

Some of the new break rows read:

```
| new-test-script | a unit of a script gets a test that imports the script under the stubs of lean's answers and asserts its requests | RED (caught) | 14 call(s), 14 of them asking lean's world, none a test can restate: ...
| new-test-script-reach | a statement of a script's unit no run completes under the stubs is reported: no test below the bar | RED (caught) | a test was proposed (3 cases, statements {"listed":0,"reached":3,"missed":[],"unreached":[]})
| new-test-env | ... | RED (caught) | 24 call(s), 24 of them asking lean's world, none a test can restate: 24 a call that asks the world where no stub answers ...
| new-test-output | ... | RED (caught) | a test from the script's runs completes 3 of 4 statements of the unit (missed: lines 19): below the bar, no test proposed
```

**Other validators** (all at 9c4f444b25):

| Command | Output (verbatim) | Exit |
|---|---|---|
| `node tests/opaque-unit.mjs --break` | `FAIL step line var (wld, retb, u) := ext_block_x(wld, u);` / `FAIL step signature {"id":"block_x","ins":["World","U"],"out":"(World, Option<int>, U)"}` | 1 |
| `node tests/opaque-unit.mjs` | `opaque-unit: the key is the construct's tokens (...)` | 0 |
| `node tests/w9k-new-code.mjs` | `ok   new_unit_facts: 30 checks, 0 failed` / `the pair is green` | 0 |
| `node tests/w9ab-world-calls.mjs` | `w9ab-world-calls: 3 checks, 0 failed` | 0 |
| `node tests/w9ac-compare-literals.mjs` | `w9ac-compare-literals: 22 checks pass` | 0 |
| `node tests/w9bb-hard-ask.mjs` | `w9bb-hard-ask: 7 checks, 0 failed` | 0 |
| `node tests/w9aj-numeric-conversion.mjs` | `w9aj-numeric-conversion: 23 checks pass` | 0 |
| `node tests/w9aq-lint-flush.mjs` | `exit 1 (want 1); stdout 373477 bytes; JSON parses: true; units with a finding: 600 of 600` / `PASS` | 0 |

- **opaque-unit's "2 known failures":** there are none at 3e3ec12356 either. I ran the base tree and got the same
  line with exit 0. This lane does not touch the translator.
- **pr-intake** (`tests/fixtures/pr-intake/test.mjs`, run because `pr.mjs` changed): exit 1 at line 51, "Preview
  started a lane: spawnSync /opt/dafny/z3/bin/z3-4.12.1". The base 3e3ec12356 fails identically, at the same line,
  with or without `LEAN_Z3`. It comes from this machine's z3 pin check, not from this lane.

**Determinism:** two writer runs on `script.ts send` give byte-equal text and records. This is the plain check
`text 4072 bytes, equal; record equal`. The bench also reported 4 of 4 sides byte-equal.

## The three ids

Lean alone: `check.mjs --candidate <cline at 90a2c3dd, mutant patch applied> --unit request --json`, at
`/root/ramwork/w9bg.work/cline`.

| id | before, 3e3ec12356 | after, 29d49b5e2c | bench at 29d49b5e2c |
|---|---|---|---|
| ~m1 | no record: "26 call(s), 26 of them asking lean's world, none a test can restate … (the unit's reach: a module binding the call reads was set at load …)" | `new:proposed-test`: 6 cases, statements 5 of 5, mutants 9 of 12, check 6/6 passed, world 0 | lean record present (6 cases); not rendered |
| ~m2 | no record (27 calls, same reason) | `new:proposed-test`: 5 cases, 5 of 5, 9 of 12, check 5/5 | lean record present; not rendered |
| ~m3 | no record (27 calls, same reason) | `new:proposed-test`: 6 cases, 5 of 5, 9 of 12, check 6/6 | lean record present; not rendered |
| **total** | **0 of 3** | **3 of 3** | **0 of 3 rendered** |

Bench `hour.md`, first line, verbatim: `29d49b5e2c M rendered 0 of 3 (0.0 %), record 0 of 3, completed 3 of 3, wall 4.8 min`.

The bench output is in `/root/da-bench/w9bg/hour/w9bg-three-29d49b5e2c-1`. Ledger causes:
`no-witness/new-code-no-parent 3`; new code: `proposed tests 0, rendered 0`.

**What happened in the bench:**

- Lean's row carries the `new:proposed-test`, and the checker made the `lean:new-unit-test` record.
- The checker gave the test to the repository's runner: `npx vitest related --run scripts/repro-cloud-session.mjs`.
  It ran 0 cases (`check_runner.passed: false`, "the repository's runner ran no case of the proposed test").
- `classes.runner_passed` renders a proposed test only when the runner passed it. So 0 rendered.

**Two causes:**

1. **Lean (fixed in 9c4f444b25, after the measurement).** The test was named `scripts/.lean_head_2127728_repro-cloud-session.request.lean.test.mjs`
   and imported `./.lean_head_2127728_repro-cloud-session.mjs`. That is pr.mjs's temporary copy, which no checkout
   holds. This hit every proposed test from the PR path: no `hour.md` under `/root/da-bench` shows "passing in the
   repository runner" above 0.
   - Now the test is `repro-cloud-session.request.lean.test.mjs`, importing `./repro-cloud-session.mjs` (check
     `new-test-source-name`).
   - Not re-measured. The brief allows one bench measurement.
2. **The repository and the checker (not lean's; not changed here).** cline's `apps/vscode/vitest.config.ts`
   `include` lists explicit `src/…` globs only. The checker places a proposed test beside its source or in
   `__tests__` (`test_detect.proposed_path`). So no test beside `scripts/repro-cloud-session.mjs` is ever run by the
   repository's vitest. The rendered number for these three stays 0 until the checker runs a proposed test outside
   the config's `include` (for example an include override for the proposed file). Sent to the lead on the channel.

**Not killed by the kept cases:** the m3 kind of edit (204 → 205: the `boundary` site), `coalesce` on line 24, and the
`"GET"` string. This is expected:

- 204 and 205 are both null-body statuses.
- `init.method ?? "GET"` only shows in an error message on a GET, and the body's first request is a POST.

The bench needs the record on the mutant tree, not a kill.

## Step 5: the census (lane w9ai)

`lane/w9ai-writer-limits-census-result.md` on `lane/w9ai-writer-limits-census` was measured at f5d944bacc on 533 NEW
units.

- Its reason table has no "not exported" and no "a module unit" row. Its 11 categories are: no closed call 168,
  needs a stub 83, test setup 117, below the bar 15, reached the world 67, hands out a function 6, a member 4,
  self-check 1, load errors 11, other misc 29, proposed 32.
- The branch holds no per-unit data (only the result file).

So the number of its refusals that named a script cannot be read from it: zero rows name one. Any "not exported"
refusals would sit inside "other misc" (29), unlisted.

## Functions touched (for the merge)

**`exec/new-unit.mjs`**
- `loadCandidate`: `extra.body` mode; `extra.onReset`.
- New: `SCRIPT_RUNS`, `isScript`, `scriptCases`, `envRead`.
- `runNew`: the `writeNewTest` call gets `script` and `sourceName`.
- `unitWorld`, `graphWorld`: `envRead`.

**`exec/new-test.mjs`**
- `surfaceOf`: `env`.
- New: `OUTPUT`, `isOutput`.
- `worldOf`: skips output.
- `stubsOf`: 4th parameter `{ typed }`; env stubs.
- `testText`: `script`.
- `placeOf`: `sourceName`.
- `killsOf`: `scripted`.
- `writeNewTest`: `cases` → `drawn`, `script`, `sourceName`, `listed` moved; record `script: {runs, imported}`.
- The self-check uses `replaceAll`.

**`exec/new-tests.mjs`**
- `makeMocks`: `resetModules`.
- `selection`: `isCandidate`, `all`, `dynamic`.
- New: `importsIn`.
- `runTests`: `onReset`; `named` reads `all` / `dynamic`.

**`pr.mjs`**
- `newUnitOpts`: adds `sourceName`.

**`check.mjs`**
- `sourceName` passed to `runPair`.
- CLI `--source-name`.

**Tests and docs**
- `tests/break.mjs`: 5 rows.
- `tests/new-unit-test.mjs`: 7 checks.
- Fixtures: `script.ts`, `script-main.ts`, `env.ts`.
- `design/w9bg-scripts.md`.

**The record's shape:** it grows by one optional field, `script: { runs, imported }`. The checker ignores it, so
nothing changes there.
