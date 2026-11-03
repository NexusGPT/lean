# w9bb hard-ask-census: result

Lean 5d6fef8ef1 (lead-v4). Hard run hard36-9873874f64-1 (lean 9873874f64, checker b363d04fa5); dev set
s75-9873874f64-dab363-1. Census script: `/root/lanes/w9bb-hard-ask-census/scripts/census.py <records root> [--show CLASS]`
(reads every `lean_rows` + `other_rows` row of `mutants/*/lean/*.json`, `pr/lean/*.json`, `instances/*/lean/*.json`;
one row per (file, unit, reason)).

## 1. Census (written before any fix)

| # | id | reason in the record (verbatim) | construct behind it | class |
|---|---|---|---|---|
| 1 | Checkmate#3288~h1 `useSettingsForm` | `client/src/Hooks/useSettingsForm.ts: ASK(fake answering at module evaluation): z.email is not a function` | lean's vendored real `zod` is 3.25.76 (`exec/fakes/lib/vendor/zod/manifest.json`); the project declares `"zod": "^4.1.11"` (client/package.json:52); `z.email()` is zod 4 API, so `@/Validation/settings` throws while it evaluates | **A. vendored library outside the declared range** |
| 2 | cline#14303~h1 `compressRemoteHelper` | `apps/examples/desktop-app/scripts/build-sidecar-bin.ts: ASK(undeclared external package): Cannot find module 'bun'` | `import { $ } from "bun"` (line 2): a module the host runtime (Bun) supplies, never in package.json | **B. host-runtime module (bun, vscode)** |
| 3 | react#36253~h1 `LegacySyntheticEvent.constructor` | `packages/react-native-renderer/src/LegacySyntheticEvent.js: ASK(platform global): Event is not defined` | `export default class LegacySyntheticEvent extends Event` (line 18): `Event` is a Node global (Node >= 15) the unit's vm context does not hold | **C. Node global absent from the sandbox context** |
| 4 | three.js#34978~h3 `ClusteredLighting.getNode` | `spawnSync /usr/bin/node ETIMEDOUT` | ClusteredLighting.js is new in the PR, so the pair goes to `runNew` (run.mjs:1729); its child spawn (new-unit.mjs:359) has a wall bound of max(30 s, (n + 78 trial runs) x ms + 10 s) and the reason is spawnSync's message, with no budget named. Run under load 60-117 on 32 cores | **D. runner child wall timeout** |
| 5 | n8n#41805~h1 `N8nSandboxServiceSandbox.recover` | `candidate runner exited 1: ` | same spawn (new-unit.mjs:362): status 1, empty stdout; the child's stderr is written to lean's stderr and dropped from the reason | **E. runner child exit, cause not recorded** |
| 6 | n8n#42766~h1 `wrapSpecialValuesForGuest` | `unit not listed` (ledger); lean's row: `coverage: artifact:binary, reason: binary, unit: (edits from de853b628e12 artifact:binary)` | quickjs-bridge.ts holds two literal NUL bytes in a template literal (`` `${ctorName}\0${JSON.stringify(locales) ?? ''}\0...` ``, byte 33856); git calls it text (`git diff --numstat`: `30 14`), lean's `bytes.includes(0)` (ci/ledger.mjs:107, pr.mjs:329) calls the whole file binary, so no unit is listed | **F. source file with a NUL byte read as binary** |

Counts per class (units = distinct (file, unit, reason) rows; records = lean files):

| class | dev s75 (75 mutants + 23 PR parents) | hard36-9873874f64-1 (32) | hard members |
|---|---|---|---|
| A vendored library outside the declared range | 0 units | 1 unit / 1 record | Checkmate#3288~h1 |
| B host-runtime module | 0 | 2 units / 2 records | cline#14303~h1 (`bun`), cline#15243~h1 (`vscode`) |
| C Node global absent from the context | 0 | 7 units / 1 record | react#36253~h1 (`Event`); the 3 `primordials` units of node#66154 are a different construct (node's internal bootstrap binding, no global of any runtime: a right ASK) |
| D runner child wall timeout | 0 | 25 units / 3 records | three.js#34978~h2 (12), ~h3 (11), three.js#34309~h3 (2) |
| E runner child exit 1, cause unrecorded | 0 | 2 units / 2 records | n8n#41805~h1, n8n#41825~h3 |
| F source file with NUL read as binary | 0 | 2 units / 2 records | n8n#41940~h1, n8n#42766~h1 (the same file) |

Raw census lines:

```
##### /root/da-bench/hour/s75-9873874f64-dab363-1/records
records read 98
fake-answer-at-module-eval     units=0 records=0
undeclared-external-package    units=0 records=0
platform-global                units=0 records=0
spawn-timeout                  units=0 records=0
runner-exited                  units=0 records=0
artifact-binary-source         units=0 records=0
##### /root/da-bench/hard36-9873874f64-1
records read 32
fake-answer-at-module-eval     units=1 records=1
undeclared-external-package    units=9 records=4
platform-global                units=10 records=2
spawn-timeout                  units=25 records=3
runner-exited                  units=2 records=2
artifact-binary-source         units=2 records=2
    artifact-binary-source 2 'binary'
    fake-answer-at-module-eval 1 'ASK(fake answering at module evaluation): z.email is not a function'
    platform-global 7 'ASK(platform global): Event is not defined'
    platform-global 3 'ASK(platform global): primordials is not defined'
    runner-exited 2 'candidate runner exited 1: '
    spawn-timeout 25 'spawnSync /usr/bin/node ETIMEDOUT'
    undeclared-external-package 5 "ASK(undeclared external package): Cannot find module '$lib/managers/event-manager.svelte'\nRequire stack:\n- web"
    undeclared-external-package 2 "ASK(undeclared external package): Cannot find module 'tinycolor2'\nRequire stack:\n- /root/da-bench/hard36-98738"
    undeclared-external-package 1 "ASK(undeclared external package): Cannot find module 'bun'\nRequire stack:\n- apps/examples/desktop-app/scripts/"
    undeclared-external-package 1 "ASK(undeclared external package): Cannot find module 'vscode'\nRequire stack:\n- /root/da-bench/hard36-9873874f6"
```

The dev set holds none of the six classes on a unit verdict: its two `artifact:binary` files are real binaries
(`localhost-key.der`, two `.jpg` screenshots), and its one `fake answering at module evaluation` text is an
inputs-skipped note (cline#13799, an env check that throws by design), not a unit's reason. The undeclared-package
rows `$lib/...` (a SvelteKit alias, 5) and `tinycolor2` (2) are other constructs, outside the six.

## 2. Fixes (one LEAN_BREAK each; design note langs/ts/design/w9bb-hard-ask-census.md)

| class | mechanism | where |
|---|---|---|
| F | `w9bb-source-nul`: a JS/TS file whose bytes are UTF-8 is text with a NUL in it; git's NUL guess yields unless `.gitattributes` declares the path | ci/ledger.mjs binaryBytes, pr.mjs |
| D | `w9bb-runner-bound`: the new unit's runner under its CPU-time budget (n + 78) x ms + 10 s (>= 30 s), far wall guard 10x | exec/run.mjs boundedChild, exec/new-unit.mjs runNew |
| D/E | `w9bb-runner-reason`: no result says the budget hit (CPU, wall, load, cores) or the exit and stderr's last words | exec/new-unit.mjs runnerReason |
| E | `w9bb-runner-late-errors`: the runner child counts its run, a rejection the unit left unawaited is a late-error record | exec/run.mjs inUnitRun |
| C | `w9bb-platform-events`: Event, EventTarget, CustomEvent, DOMException in the sandbox, timeStamp on the input's clock | exec/run.mjs platformEvents |
| B | `w9bb-types-declared`: a module declared by `@types/<name>` (and `bun:*`) is a declared package, the recording fake | exec/new-unit.mjs resolveModule |
| A | `w9bb-vendored-range`: a vendored row answers only a declared range on its major; another major is the recording proxy | exec/fakes/lib/range.mjs, index.mjs |

Class E's runner exit, reproduced byte-equal on 5d6fef8ef1 (`candidate runner exited 1: `), had this stderr:
`lean: unhandled rejection outside a unit run: Error: Sandbox "N8nSandboxServiceSandbox" failed to start (status: pending)`:
lean's, not the checker's; no checker change is needed.

## 3. Validators (final code, 2e63302f89)

```
tests/w9k-new-code.mjs exit=0
the pair is green
tests/w9ab-world-calls.mjs exit=0
w9ab-world-calls: 3 checks, 0 failed
tests/opaque-unit.mjs --break exit=1
FAIL step signature {"id":"block_x","ins":["World","U"],"out":"(World, Option<int>, U)"}
tests/w9bb-hard-ask.mjs exit=0
w9bb-hard-ask: 7 checks, 0 failed
tests/w9bb-hard-ask.mjs --break exit=0
w9bb-hard-ask --break: 7 checks, 0 failed
ci/ledger.test.mjs exit=0
ci/ledger-failures.test.mjs exit=0
exec/fakes/lib/protocol.test.mjs exit=0
ci/supervise.test.mjs exit=0
tests/no-silent-exit-importers.mjs exit=0
```

Pre-existing (identical on 5d6fef8ef1, with and without LEAN_Z3): `tests/fixtures/pr-intake/test.mjs` exit 1
(`Preview started a lane: spawnSync /opt/dafny/z3/bin/z3-4.12.1`) and `tests/ci/refusals.test.mjs` exit 1.

Vendored-range reach in the six hard checkouts (`/root/lanes/w9bb-hard-ask-census/vendored-ranges.txt`): the row leaves
only for zod ^4 (Checkmate 1, cline 8 package.json) and date-fns 4.1.0 (cline 1); exact pins on the vendored major
(dayjs 1.11.13, axios 1.18.0) keep it; n8n's `catalog:` ranges are unread and keep it.

n8n#42766 listing, ledger alone (`buildChangeManifest`, base 73f7064c..worktree):
```
before packages/@n8n/expression-runtime/src/bridge/quickjs-bridge.ts kind=binary edits=1 hunks=[]
tree packages/@n8n/expression-runtime/src/bridge/quickjs-bridge.ts kind=text edits=44 hunks=[[{"start":9,"count":0},{"start":10,"count":1}],...
```
