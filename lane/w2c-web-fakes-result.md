# w2c-web-fakes: result (2026-11-01)

Branch `lane/w2c-web-fakes`, cut from lead-vm 4747022f. Design note: `langs/ts/design/w2c-web-fakes.md`.

## What landed

- `langs/ts/exec/fakes/web/`: `fetch.mjs` (fetch as a table keyed by method, url and body; Request and Response the
  host's, subclassed to remember their body; FormData, Blob), `headers.mjs`, `url.mjs`, `encoding.mjs`, `clone.mjs`
  (the real classes, rendered by their state), `abort.mjs` (AbortSignal.timeout on the virtual clock),
  `storage.mjs` (localStorage and sessionStorage as a record), `draw.mjs` (the seeded draws), `index.mjs`,
  `web.test.mjs` (12 protocol tests), `measure.mjs` (the real-code measurement).
- The hook: `exec/fake.mjs` `behaviouralFake(env, specifier)`, `behaviouralGlobals(env)`, `BEHAVIOURAL`
  (`LEAN_FAKES=recording` turns every behavioural fake off), the registry `exec/fakes/index.mjs`; one spread in the
  sandbox's globals (`exec/run.mjs`). w2b-node-fakes had no wiring in its tree; the hook name was proposed to the
  group at start (`behaviouralFake(env, specifier)`), no answer arrived, so the hook is this lane's minimal one.
- `tests/run.mjs`: expect.json key `bUnder` (lane B under stated variables: the `--break`), suite row `web-fakes`
  (protocol tests pass, and every one fails under `LEAN_FAKES=recording`), lane B pair rows keyed on every file of the
  pair folder (a sibling module's change was served from the step cache: found by bench_drops, below).
- Pairs `fake_fetch`, `fake_url`, `fake_storage`. Fixtures `bench_drops/settings.ts` and `new_unit/platform.ts`
  repointed (below). `subset.md`: one paragraph after the world-transition table. `design/admission-contract.md`:
  a dated section, no new audit row (no lint or translator site was added).

## The pairs (each with its break)

`LEAN_PAIRS=fake_fetch,fake_url,fake_storage JOBS=4 node langs/ts/tests/run.mjs` (34 pair rows, all PASS):

| pair | unit | change | fakes | LEAN_FAKES=recording |
|---|---|---|---|---|
| fake_fetch | users | changed URL (a URL object) | WITNESS (trace: request url) | PASS-bounded |
| fake_fetch | remove | changed method (a Request) | WITNESS (trace: method) | PASS-bounded |
| fake_fetch | profile | dropped header (Headers) | WITNESS (trace: headers) | PASS-bounded |
| fake_fetch | failed | response read differently (`>= 400` / `> 400`) | WITNESS (outcome, status 400) | PASS-bounded |
| fake_fetch | cancelled | abort removed | WITNESS (outcome) | PASS-bounded |
| fake_fetch | created | refactor: same request through a Request | PASS-bounded | WITNESS (false) |
| fake_fetch | twice | refactor: either answer of a repeated request | PASS-bounded | WITNESS (false) |
| fake_url | link, query, accept | returned URL, parameter list, Headers changed | WITNESS | PASS-bounded |
| fake_url | sorted, bytes | refactors | PASS-bounded | PASS-bounded |
| fake_storage | theme, language, save | another key read, `??` / `||`, another key written | WITNESS | PASS-bounded |
| fake_storage | logout, visits | refactors (named-property forms) | PASS-bounded | PASS-bounded |

Protocol tests: `node --test langs/ts/exec/fakes/web/web.test.mjs`: 12 pass, 0 fail;
`LEAN_FAKES=recording node --test langs/ts/exec/fakes/web/web.test.mjs`: 0 pass, 12 fail.

## Regression

- `LEAN_PAIRS=<the 17 existing pairs whose sources name a web global>,fake_fetch,fake_url,fake_storage JOBS=4 node
  langs/ts/tests/run.mjs` (17: bench_drops, callback_behaviour, conformance_copy, dynamic_key, dynamic_key_open,
  identity_destructured, library_members, library_more, local_declarations, new_unit, open_datatype, optional-call,
  promise_module_nullish, rename_parameter, sandbox_boundary, this_param, two_callers): 1,149 checks, 3 FAILED, all
  three the premise of a fixture the fakes changed:
  - `bench_drops` warn, report (expected ASK, got PASS-bounded): settings.ts was unloadable because the sandbox had no
    localStorage; with the fake it loads, and `notify`'s getItem is a read, not a request. The fixture tests the
    unloadable-alias reading, so settings.ts now reads `document` (a host global the sandbox still lacks); the why says so.
  - `new_unit` platform.ts (expected ASK `platform global`, got NEW): AbortController is now present; the fixture
    uses `BroadcastChannel` (still absent) to keep testing the platform-global class.
- After the repair, the first rerun still failed bench_drops: the step cache served the old result because lane B pair
  rows were keyed on parent, candidate and tsconfig only, not `settings.ts`. Fixed (every file of the pair folder).
- `LEAN_PAIRS=bench_drops,new_unit,fake_fetch,fake_url,fake_storage JOBS=4 node langs/ts/tests/run.mjs`: 931 checks,
  ALL PASS (WALL 429 s).
- At the final code head 9ebd603c (07:28, load read at most 40): `LEAN_PAIRS=fake_fetch,fake_url,fake_storage,bench_drops,new_unit
  JOBS=4 node langs/ts/tests/run.mjs`: 931 checks, ALL PASS (WALL 704 s).
- No change under `translate/` or `lint/`: the conformance run is not required for this lane.

## The measurement on real code

Reach: across the 40 directories under `/root/da/census/repos`, 1,133 of 55,620 TypeScript source files (2.0%; tests,
declarations, dist excluded) name a web global the fakes answer (`grep -rlE` with the WEB pattern of measure.mjs).
Of those, module-form fetch (`node-fetch`, `cross-fetch`, `isomorphic-fetch`, `undici` imports): 1 file.

`node langs/ts/exec/fakes/web/measure.mjs --root /tmp/w2c/roots/<root> --name <root> --units 30 --sites 3 --jobs 4
--out /tmp/w2c/measure_<root>.json` on scratch copies of three census roots (sources only; the census copies were
read, never written): the first 30 units (sorted by file and name) whose own text names a web global; per unit a
self-pair and 3 planted changes (exec/mutate.mjs), each run with the fakes and under `LEAN_FAKES=recording`.
nutshell ran 03:16 to 03:22 at commit d1b45a65 plus the measurement tool (the runner started it once the load read at
most 40; the tool's own gate came later, commits dc16d0a2 and 851600eb, and changes no verdict).

| root | units | self-pairs: WITNESS fakes / recording | planted runs | WITNESS fakes | WITNESS recording | only fakes | only recording | ASK fakes / recording |
|---|---|---|---|---|---|---|---|---|
| nutshell | 30 | 0 / 0 | 87 | 59 | 46 | 13 | 0 | 1 / 2 |
| pyka | not run | | | | | | | |
| nexus-learning | not run | | | | | | | |

On nutshell the fakes detect 59 of 87 planted changes (67.8%) against 46 of 87 (52.9%) under the recording proxy:
13 more, none lost; 0 false witnesses on 30 self-pairs in either mode. Raw rows: `lane/w2c-web-fakes-measure-nutshell.json`.

pyka and nexus-learning were not measured. The tool waits for a one-minute load of at most 40 before a root, reading
it again every five minutes (the load rule). From 05:19 to 07:18 every read was above 40 (42 to 174), and the
harness stopped the background run at its two-hour limit before a task started. An earlier attempt (03:16 to 05:15,
holding each task while the load was above 40) was stopped for the same reason; it wrote no result. Neither root has a
partial number: none is reported.

The 13 nutshell planted changes only the fakes find are all real: AbortController-based code (the controller was absent,
both sides threw one ReferenceError) and changed fetch options (`'GET'` to `'GETx'`, a dropped option).

## What is open

- `json()` and `text()` of one fetched response are not consistent (a fake against a drawn text): a refactor between
  `JSON.parse(await r.text())` and `await r.json()` is a WITNESS in both modes.
- Inputs: a string parameter passed to `new URL(x)` without a base never meets a valid absolute URL (the drawn strings
  have no scheme and host), so the unit throws on every input on both sides: `isAllowedFeedAddress` (nutshell
  adapters/electron-updater/src/address.ts) keeps a negated return PASS-bounded. An input-generation gap (gen.mjs,
  W3), not a fake defect.
- Module-form fetch (1 file in the roots), `structuredClone` of a recording fake (DataCloneError on both sides),
  response latency (a race between a fetch and a timer goes to the fetch).
- w2b's hook: if w2b lands a different name, the registry `exec/fakes/index.mjs` is the one place to adapt.
