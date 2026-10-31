# bridge-fake-thenable: result

Lane of `plans/2026-10-30-next-read/PLAN.md`, base lean `lead-09032a59`, branch `lane/bridge-fake-thenable`.
Owner's decision (2026-10-31, row 664561c3): "Yes I told you to allow it and I even told you to have an allow list and
deny list in lean."

## Commits

- `a3e7712b7`: the red pair `bridge_fake_thenable` and the pair runner's `render <unit> bridge` row. Before the reading: 5 FAIL of 15
  (`Status` PASS-bounded where WITNESS is expected, `Greeting` and `Theme` `component false`, both `bridge null`).
- `0f1453dd2`: the reading (below), `exec/bridge.test.mjs`, `design/bridge-fake.md`, the render row field in
  `design/certificate-timing.md`.
- this result file (the next commit).

## What was there

On the base, lane B had no fake for an unset global. The sandbox named its own object `window`/`globalThis`/`global`,
so `window.api` was `undefined` and `window.api.userName()` threw a TypeError inside the effect. The component stayed at its
first render (`null`); the trace named the cause (`effect-throw`, the TypeError).

## The reading (mechanisms)

1. **The bridge fake** (`exec/bridge.mjs`). A member read of the global object that the sandbox does not hold is the bridge fake `global:X`. This holds when X is on `BRIDGE_ALLOW` (empty), or on neither list and declared by no default lib file (`declare var|function|class|...` in TypeScript's `lib.*.d.ts`). `BRIDGE_DENY` holds the devtools hooks a browser extension sets. A property read gives a bridge fake. A call gives a thenable that resolves after the turn to the fake at the call's path; it never throws or rejects (no fault draw), and the race explorer's scheduler holds it. A function argument is called once, after the turn, with one fake argument. The fake renders as `{ $fake: path }`, its text is its path, and it iterates empty.
2. **Presence drawn per input** (`bridgePresent`, 3 in 4, seeded by the seed and the name, the same on both sides). Whether a global exists is a fact of the world (`design/lib-globals.md`). The first version, always present, cost `module_forms` its `optionalGlobal` witness (`globalThis.config` absent: `undefined` against `0`). The draw restores it.
3. **The mount re-renders after an effect set the state even when its first render was `null`** (`observeWindow`). Before, the gate was "the first render is an element". The mount's effects now also settle for two turns before the state is read, as `settleEffects` does for every later round.
4. **A useState setter handed a fake stores it.** The fake is the answered value, never React's updater form. Calling it made a second, spurious bridge call (`global:api.userName()#1()#1`).
5. **Render row** `bound.render.bridge = { calls, callbacks }`: the distinct bridge calls answered and callbacks fired on the parent's mounts, by path.

## Pairs (JOBS=2, each `node langs/ts/tests/run.mjs --pair <p>`, final code 0f1453dd2)

| pair | checks | result |
|---|---|---|
| bridge_fake_thenable (new) | 15 | ALL PASS (5 FAIL before) |
| module_forms | 33 | ALL PASS (1 FAIL with the always-present first version, fixed by mechanism 2) |
| copied_argument | 10 | ALL PASS |
| heap_canonical | 13 | ALL PASS |
| jsx_conditional | 3 | ALL PASS |
| jsx_handlers | 35 | ALL PASS |
| jsx_handlers_symbolic | 22 | ALL PASS |
| type_tests | 59 | ALL PASS |
| window_timers | 3 | ALL PASS |
| component | 5 | ALL PASS |
| dom_patch | 21 | ALL PASS |
| effects_deps | 4 | ALL PASS |
| finite_components | 9 | ALL PASS |
| handler_capture | 26 | ALL PASS |
| handler_capture_unknown | 2 | ALL PASS |
| handler_identity | 15 | ALL PASS |
| hook_slots | 11 | ALL PASS |
| readme_search | 5 | ALL PASS |
| render_purity | 5 | ALL PASS |
| render_row_fields | 18 | ALL PASS |
| schedule_explorer | 9 | ALL PASS |
| suspense | 5 | ALL PASS |
| ui_tree_context | 20 | ALL PASS |
| lib_globals | 15 | ALL PASS |
| pure_globals | 35 | ALL PASS |
| heap5_globals | 13 | ALL PASS |
| cause_fake_recursion | 3 | ALL PASS |
| fake_throw | 5 | ALL PASS |
| callbacks | 5 | ALL PASS |
| callback_behaviour | 14 | ALL PASS |
| callback_behaviour_tree | 2 | ALL PASS |
| promise_handle | 18 | ALL PASS |

Unit tests: `node --test langs/ts/exec/bridge.test.mjs langs/ts/exec/record.test.mjs langs/ts/tests/assurance/sandbox.test.mjs`
27 pass, 0 fail (before the presence draw; `bridge.test.mjs` alone 5 of 5 after it).

The brief names `react_*` and `handlers` pairs: no pair of those names exists on this base. In their place I ran every pair
whose files use `useState`/`useEffect`, read `window.`/`globalThis.`, or concern fakes, callbacks and promises (the list above).

## Regression list

None on the pairs run. The full suite was not run (the lead runs it at the merge).

## Left / for the owner

- **Third-party script globals.** Every name no lib declares is a bridge name: in the census copies `window.posthog`, `window.gtag`, `window.FB`, `window.rudderanalytics` are now fakes on the inputs that set them. A name that should always be absent goes on `BRIDGE_DENY`.
- **Typed answers.** The bridge fake answers no member from the app's own `declare global { interface Window { api: ... } }`. A typed answer (a string where the app declares one) would be the next step, through the spec's shapes as `env.typed` does for imports.
- **The real apps.** cherry-studio and waveterm themselves were not run: they are not on this machine, the lead did not send the dry-run asks, and this lane runs no census. Whether they now mount is for the lead's run.
- **Bare identifiers.** A bare unset identifier (`electron.x` with no `window.`) still throws ReferenceError. Only member reads of the global object are bridged.
