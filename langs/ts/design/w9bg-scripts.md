# w9bg: a unit of a script gets a test from the requests its body makes

## The defect

A script is a module that exports nothing. It reads its environment, builds requests and makes them through functions
of its own, all from its top level. Before this lane, the writer refused every unit of a script, for two reasons:

- the unit's static reach named a module binding set at load while loading asked the world (`process.env`);
- behind that, the unit is not exported, so no runner can import it by name.

Seen on `cline__cline#13799~m1..m3`: the unit `request` of `apps/vscode/scripts/repro-cloud-session.mjs`. At
3e3ec12356, lean alone draws 27 calls of it, all asking the world, and the writer refuses all of them.

## The mechanism

No test can call a script's unit. Its body calls it, so the body's runs are the unit's cases.

1. **`isScript`** (new-unit.mjs): a module with no `export` and no `module.exports` / `exports.x` write.
   - The cases are built only when the unit is not exported (`exportKind === false`).
   - An exported unit of a module keeps its own calls, as before.
2. **`scriptCases`** (new-unit.mjs): the module is evaluated `min(n, SCRIPT_RUNS = 40)` times.
   - Each run uses an environment seeded the way an input is (`seed * 7919 + i`).
   - Each run goes through `loadCandidate(…, { body: true })`, with `env.loading` off from evaluation on. So the world
     answers the body the way it answers a unit's call:
     - every request is entered among `env.answers`;
     - a fetch can fault on its seeded draw;
     - an answer may be null, empty and so on, not only a handle.
   - The run is awaited until it settles or no turn moves it.
   - A case holds:
     - `outcome`: the import completed, or the error it rejected with;
     - `reached`: the unit's statements the body's calls completed (the unit's own probes, `newUnitProbes`);
     - `world`: `{answers, trace, pending, graph}`.
   - A body still waiting after its turns (a timer it armed, a promise no answer settles) carries that as armed work.
     `worldOf` refuses such a case with the reason.
   - The graph is `graphWorld` of the module: any global read without a trap that no stub answers.
3. **The writer** (new-test.mjs `writeNewTest`, `script`):
   - The body's cases replace the unit's calls.
   - The "not exported" refusal does not apply.
   - Each case is one `it`:
     - `vi.resetModules()` (or `jest.resetModules()`);
     - the case's stubs;
     - `await import('./<script>')`, or `await expect(import('./<script>')).rejects.toThrow(<message>)`;
     - the requests asserted in order (`callsOf`), as for any case that asked the world.
   - A JavaScript script is imported with its extension, because Node's ESM resolves no other. A TypeScript one is
     imported without it.
   - `node:test` and `mocha` have no module registry a case can reset, so a script's unit there is coverage with that
     reason.
4. **The mutants** (`killsOf`, `scripted`): each mutant of the unit is evaluated as a body from the case's seed. Its
   outcome and its requests are compared with the case's.
5. **The runner model** (new-tests.mjs):
   - A side-effect import of the unit's file selects the unit: a static `import './x'` for every test of the file, a
     dynamic `import('./x')` for the tests that hold it (`selection`, `importsIn`).
   - `vi.resetModules()` empties the loader's module cache, except the test file itself (`loadCandidate` `onReset`).
     So the next import evaluates the script afresh.
   - The self-check runs the test as it does every proposed test.

## The reach bar (`new-test-script-reach`)

The bar is the unit's statements (`unitBranches` through `newUnitProbes`), counted over the kept body runs.

- A statement that no run completes under the stubs is reported in the coverage record: "a test from the script's runs
  completes k of n statements … (missed: lines …)". No test is proposed for that unit.
- Typical case: the statement after a timer no stub fires (`script-main.ts` `main`, lines 24 and 25).
- Under the break, the bar is not read and a test is proposed.

## Two surfaces this needs, each general (any unit, not only a script's)

- **`new-test-env`**: an environment variable read (`get module:process.env.NAME`).
  - The test sets it to the value lean's process model answered the first time, or deletes it when the answer was
    absent. It puts the variable back in `finally`.
  - `envRead` (new-unit.mjs): `process.env.NAME` and `process.env[k]` are member reads that run a trap, so naming
    `process` that way is no world global read without a trap. Any other use of `process` still is.
  - Fixture: `env.ts greeting`, an exported unit that reads an env variable.
- **`new-test-output`**: a console call (`log`, `info`, `warn`, `error`, `debug`, `trace`) that answered nothing.
  - The test lets it print. It is neither stubbed nor asserted.

## What is not done here

- The `(module)` unit of an added file (run.mjs `newModuleUnit`) still gets no test. `reachTable` does not probe a
  module's own top-level statements: they are the module unit's, and the pair path reads them through
  `moduleStatements`. The bench rows of this lane are function units of a script.
- A script whose body writes the environment, reads `process.argv`, or reads `process` other than through `env`: such
  a request is refused, with its reason, by `surfaceOf` and `worldOf`.
- A body that waits on a timer (a poll loop): the run is refused as armed work, never fired by a fake clock. Lean's
  clock answers and a runner's fake timers would disagree on the instants.
