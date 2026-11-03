# w9al-world-stubs: result

Branch `lane/w9al-world-stubs` from `lane/new-unit-test` at f5d944bacc. Head 26bfcea971 (three commits: 344fc508bb,
0f95c59035, 26bfcea971). Design note: `langs/ts/design/w9al-world-stubs.md`.

## The cause

Lean's trace keeps the requests a unit makes, never what the world answered, so the writer had nothing to restate.
`runNew` dropped every call that asked the world before it became a case. Two more causes surfaced:

- `Math.random` was never traced. A "closed" call that drew from it was written as a test that relied on lean's seeded
  draw without stubbing it; it passed only because the drawn arrays held 0 or 1 element.
- lean never draws a URL for a string handed to `fetch`, so every request was refused before it was made (fetchJson
  reached 0 of 2 statements even with stubs).

## What landed (each behind a break)

| mechanism | where | what |
|---|---|---|
| `new-test-world` | fake.mjs `answerOf`/`answerShown`/`readAnswer`; run.mjs Math.random; fetch.mjs; new-unit.mjs runNew; new-test.mjs `worldOf`/`surfaceOf`/`inputHandles`/`inputOf` | the answers of the world in request order (not on the trace); a call that asked the world is a case; each request classified as a stubbable surface (package member called, global, clock, Math.random, an argument answered member by member) or refused by name |
| `new-test-stubs` | new-test.mjs `stubsOf`/`inputsOf`/`answerSource`/`onceOf`/`thunkOf` | vitest/jest `vi.mock` + `vi.mocked(..).mock*Once`, `vi.stubGlobal` (jest `spyOn(globalThis)`), `spyOn(Math,'random')`, fake timers / `spyOn(Date,'now')`, an input object of `vi.fn()`s and values; node:test and mocha by hand (a recorder, restored in `finally`); `new Response(body, init)`; errors with their fields |
| `new-test-calls` | new-test.mjs `callsOf` | `toHaveBeenCalledTimes` + `toHaveBeenNthCalledWith` per stub (node: `assert.deepStrictEqual(stub.calls, …)`) |
| `url-strings` | spec.mjs | a unit that hands a value to the platform's URL parser (global fetch, new URL, new Request) meets `URL_STRINGS` |
| (model) | new-tests.mjs `makeMocks`/`mockModules`/mock matchers, `.rejects.toThrow`, `assert.rejects`; new-unit.mjs `extra.onContext`; run.mjs Date proxy | the runner model runs lean's own mocks (only for the writer's self-check; a PR test that mocks stays `new:coverage`) |

The record `new:proposed-test` gains `world: {asked, stubs, calls, surfaces, refused?}`. `closed` counts calls with no
world. A unit with no usable case names the surfaces no test stubs (`surfaces` on its coverage record). Mutants of a
world case are killed by other requests, not by asking the world.

## Validators

`node tests/new-unit-test.mjs` (at 26bfcea971):
```
| new-reach | the statements of a unit no parent holds are probed and counted | PASS | listed 7, reached 7, missed [] |
| new-test-cases | every closed call is a case | PASS | closed 24, cases 5 |
| new-test-source | a returned value prints as its JavaScript | PASS |     expect(bucket(0, "")).toEqual(":zero"); |     expect(bucket(1, "")).toEqual(":positive(1)"); |
| new-test-check | the text runs under the runner model against the candidate | PASS | {"files":1,"selected":5,"passed":5,"failed":0,"world":0,"notModelled":0,"unsettled":0} |
| new-test-mutants | mutants planted in the unit are told apart by the kept cases | PASS | planted 15, killed 15 |
| new-test | the writer runs: a record, or the reason none is written | PASS | proposed |
| new-test-world | a unit that asks the world gets a test from its calls and lean's answers to them | PASS | world {"asked":24,"stubs":3,"calls":6,"surfaces":["global:fetch"]}, check {"files":1,"selected":3,"passed":3,"failed":0,"world":0,"notModelled":0,"unsettled":0} |
| new-test-stubs | the answers are stubs in the runner's dialect, and the test passes under them | PASS | vi.mock("node:fs", () => { const m = { readFileSync: vi.fn(), writeFileSync: vi.fn() }; return { ...m, default: m }; }); | … check {"files":1,… |
| new-test-calls | the requests the unit made are asserted (a write's path and content) | PASS | calls 8: expect(stub_node_fs.writeFileSync).toHaveBeenNthCalledWith(1, "note.txt", ""); |
| url-strings | a unit that hands a string to the URL parser meets one it admits (the request is made) | PASS | const fetchStub = vi.fn().mockResolvedValueOnce(new Response("false", { status: 200, statusText: "OK", headers: { "content-type": "applicati |
| plain | the clock read once is fake timers at lean's instant | PASS | vi.setSystemTime(1700000007922); | expect(stamp("")).toEqual("@1700000007922"); |
| plain | Math.random is spied with lean's draws | PASS | vi.spyOn(Math, 'random').mockReturnValueOnce(0.14662797399796546); |
| plain | an argument lean answers member by member is passed as an object of its answers, its calls asserted | PASS | const input_arg0 = { find: vi.fn().mockResolvedValueOnce({ find: "v1fmo", id: 1, … |
| plain | a unit that asks the world where no stub answers gets no test, and the reason names the surface | PASS | 24 call(s), 24 of them asking lean's world, none a test can restate: … |
| plain | a helper no export reaches gets no test, with the reason | PASS | the unit helper is not exported: the repository's runner cannot import it (needs a stub) |
| plain | a promise-returning unit is awaited | PASS |     await expect(later(0)).resolves.toEqual(1); |
new-unit-test: 16 checks, 0 failed
```
(The old plain check "a unit that asks the world gets no test" is replaced. fetchJson now gets a test, and the
"no test" check uses `elapsed`, which reads `performance.now`; its reason names the surface. The world checks run
fetchJson at n 24: at n 12 the URL strings are not drawn, since the pool is drawn 3 times in 10.)

`node tests/new-unit-test.mjs --break`:
```
new-unit-test --break: 10 checks, 0 failed
```
(every mechanism RED (caught): new-reach, new-test-cases, new-test-source, new-test-check, new-test-mutants, new-test,
new-test-world, new-test-stubs, new-test-calls, url-strings)

fetchJson before → after: before `no closed call of the unit: every drawn input reached the world or was not admitted by
the declared types`; after `new:proposed-test` with `world {"asked":24,"stubs":3,"calls":6,"surfaces":["global:fetch"]}`
and `check {"files":1,"selected":3,"passed":3,"failed":0,"world":0,"notModelled":0,"unsettled":0}`.

The generated texts under the real runners, outside lean (my scratch copies; vitest's node_modules copied from
/root/w135/nh-g-2242/m-net, read only):
```
vitest 5.0.3:  Test Files  6 passed (6)   Tests  19 passed (19)     (fetchJson, stamp, readConfig, pick, saveNote, describeUser)
node --test:   ℹ tests 6  ℹ pass 6  ℹ fail 0                        (fetchJson, stamp, pick in the node:test dialect)
```
jest (model only; no jest install): fetchJson, stamp, readConfig, pick and saveNote proposed, self-check selected = passed.

Pairs (`node tests/run.mjs --pair <p> --jobs 1`):
```
world_await: | TOTAL | 3 checks | ALL PASS |
fake_fetch: | TOTAL | 14 checks | ALL PASS |
timers: | TOTAL | 15 checks | ALL PASS |
module_await: | TOTAL | 2 checks | ALL PASS |
callee_fact: | TOTAL | 7 checks | ALL PASS |
new_unit_test: | TOTAL | 2 checks | ALL PASS |
new_unit_test_world: | TOTAL | 12 checks | ALL PASS |
```
(new_unit_test_world: fetchJson, stamp, readConfig, pick, saveNote, describeUser, each NEW with its proposed test.)

Regression (at 26bfcea971):
```
w9ab-world-calls exit 0 FAIL lines 0: w9ab-world-calls: 3 checks, 0 failed
w9k-new-code exit 0 FAIL lines 0: the pair is green
w9ac-compare-literals exit 0 FAIL lines 0: w9ac-compare-literals: 22 checks pass
opaque-unit --break exit 1
```
A full `tests/run.mjs` (LEAN_PAIRS=new_unit_test_world,new_unit_test) ended `| TOTAL | 899 checks | 3 FAILED |`:
- differential pattern_defaults: Dafny "Translation was aborted". Not re-run on the baseline; no file of this lane is
  on that path (translator + Dafny).
- w1h-breaks "3 run(s) wrong": the same on the lead's tree at f5d944bacc (`node tests/w1h-new-units.mjs --break`).
- pr intake `1 !== 0`: the same on the lead's tree at f5d944bacc.

## Measured

### The six new-code ids (hour.py --only, lean = this tree)

Command: the lead's (`/root/runs/nut-battery.sh`) with `--lean /root/lanes/w9al-world-stubs/tree --lean-head 26bfcea971
--name w9al-six-26bfcea971-1 --out /root/da-bench/w9al/hour` and no `--compare`. hour.py's line:
```
26bfcea971 M rendered 0 of 6 (0.0 %), record 0 of 6, completed 4 of 6, wall 56.0 min
six exit 0 in 3363 s
```
Before is the lead's run at f5d944bacc (`/root/da-bench/hour/nut6-f5d944bacc-1`).

| id | NEW unit | before (f5d944bacc) | after (26bfcea971) |
|---|---|---|---|
| cline__cline#13799~m1, m2, m3 | `request` | no closed call | no test: 4–5 calls, all asking the world; refused by the unit's reach: a module binding the call reads was set at load, and loading asked the world (repro-cloud-session.mjs:6) |
| cline__cline#13857~m1, m2 | `mergePromptEvidence` | not exported | not exported (unchanged) |
| cline__cline#13857~m1, m2 | `CloudSessionManager.*` (12 members) | no closed call (2 also: the PR's test mocks) | no test: refused by the unit's reach, `names process (index.ts:1317)` (9) or a package binding `HUB_CLIENT_TOOL_APPROVAL_CAPABILITY` read without a trap (3); each is a member too, so the member limit would follow |
| mrdoob__three.js#35267~m3 | `getPointShadowDepthFn` | no closed call | no closed call (no admitted input) |

None of the six gets a test. Each refusal is now named by its surface, where before it was a bare "no closed call".

### Dev corpus: 8 dev PRs, before (lean f5d944bacc) and after (lean 26bfcea971)

The census lane (w9ai) has no result, so I ran `bench/new_unit_facts.py --set dev --only <8 PRs> --jobs 2` on both
trees: n8n-io__n8n#42112, sveltejs__svelte#18881, mrdoob__three.js#34585, google-gemini__gemini-cli#26655,
cline__cline#13827, n8n-io__n8n#42174, immich-app__immich#32498, facebook__react#36786. Records are under
`/root/da-bench/w9al/dev-before` and `dev-after2`.

Before, 101 NEW units said "no closed call" or "N closed call(s), none a test can restate" (the world limit). Where
each is after:

| after | units |
|---|---|
| refused by the unit's static reach (lean's reach rule, w9k): a package binding read without a trap 18, an import lean cannot follow 10, `names document` 10, a binding set at load from the world 8, `names process` 3, `names require` 1 | 50 |
| still no admitted call (the declared types admit no drawn input) | 28 |
| a handle in the arguments or outcome that is not an input (a package's answer, e.g. svelte-query `queryOptions(...)` handed a callback), or a handed-out function; each also has a static reach reason | 12 |
| closed calls whose value holds a handle (unchanged; lane w9am's) | 6 |
| **past the world gate, now stopped by the writer's own limits**: member (4: `ProtectedResourceRegistry.matchesVirtualClientUrl`, `AppsHostingService.constructor`, `SampledParentSampler.toString`, `SampledSpanProcessor.forceFlush`), not exported (1: cline `userHome`, by the input stub) | 5 |
| proposed | 0 |

On these PRs the world stubs are not the binding constraint: the static reach is. Every unit it refuses reads a value
lean never answered by value (a package constant, a DOM global, a binding the module set at load from the world), so
no test can state what the unit would see in the repository's runner. That refusal is correct, not a gap in the stubs.
The five units past the world gate wait on the member/export limits (`the runner cannot call it by name`).

## What is open

- **The static reach** (50 of 101) belongs to lean's unit reach rule, not the writer. Lifting it needs lean to answer
  those bindings by value (real package constants, a DOM).
- **Member units** (a class method) and **unexported units**: the writer's own limit, unchanged.
- **Not stubbed, refused by name:** `process.env`/`process.platform` (needs a quiet overlay in the model; 3 units here);
  `localStorage`; timers armed; `performance.now`; `new` of a package class; a value read from a package; a callback
  handed to the world.
- **Not type-checked:** the proposed test is not type-checked. An input object lists only the members the unit used,
  and a mocked answer may carry a drawn extra key (`{ find: "v1fmo", … }`). Both run, but `tsc` would flag them.
- **Lean's own text in faults:** lean's faults are restated as drawn (`new Error("fault: arg0.count")`). Lean's drawn
  bodies and strings stay lean's.
