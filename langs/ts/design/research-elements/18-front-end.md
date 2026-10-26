# Brief 18: front-end equivalence, the two results read element by element

Read in full on 2026-10-26: "A Layered Framework for UI Equivalence Decisions" (49 items, 209 lines) and
"Decide UI Equivalence Across States, DOM, and Pixels" (65 items, 365 lines). Both answer brief 18 (the
software side: React runtime, DOM, CSS, layout, pixels, accessibility, sequences, time). Verdicts use the
same four words as the five earlier dossiers: DEPENDENCY (code lean takes), PORT (an idea lean rewrites
in its own files), REFERENCE (settles a design choice, no code), IRRELEVANT (wrong layer for a sandbox
with no browser, a learned model, a dead build, or a licence lean does not take). Licences and dates are
the results' own reading of the repositories (SOURCED); nothing here was built.

What lean holds today, so every verdict is measured against it:
- lane A: a render is a value tree `JsxElem(tag, props, children) | JsxText | JsxNothing | JsxList`
  (`translate.mjs:534`), children through `jsxChild` (`:1980`) and `jsxNode` (`:2002`); a handler is a
  `ReactHandler` descriptor of deferred calls (`:2049`) or an opaque value by text plus captures (`:2112`);
  `useMemo`/`useCallback` exact under dependency coverage (`react.mjs:63`); `useEffect` deferred (`:811`).
- lane B: a JSX runtime of plain values (`run.mjs:56-69`), fake hooks with state slots keyed by call order,
  a recording setter, effects queued (`run.mjs:73-93`), effects run once after the call and every handler
  invoked once on a fake event (`run.mjs:96-106`, `:239`). One render, no re-render.
- lint: `react-handler-capture` (`lint.mjs:1135`), tag forms (`:1144`), JSX walked as values (`:1138`).
- pairs: `component`, `jsx_conditional`, `jsx_handlers` (17 units), `counter`.

## Result 1: the 49-item register

| # | Item | Verdict | Where in lean, how |
|---|---|---|---|
| 1 | Layer-indexed contract `Same(L, E, I, S)` | PORT | `check.mjs:29` certificate and `run.mjs:303` bound carry `observation: {layer, renders, effects, schedule}`; today's PASS reads "tree, one render" |
| 2 | The JSX value-tree proof (ours) | REFERENCE | kept as the first layer; its label becomes explicit (item 1) |
| 3 | Madsen, Lhotak, Tip React semantics (ECOOP 2020, paper) | REFERENCE | the mount, state, reconcile model is the template for the slot machine; no artifact to take |
| 4 | React-tRace (MIT, OCaml 5.2, 44 rules, 38 tests, 18 scenarios) | DEPENDENCY | its rules fix lane B's hook semantics (setter during render, effects after commit, cleanup order); its tests run against our fake runtime in a new `exec/react-trace.mjs`, as Test262 validates the library table; the repo is opened at that row (test language unknown until read) |
| 5 | Elm model-view-update | REFERENCE | the component as a transition system: state, update, view; that is the Mealy reading below |
| 6 | Adapton incremental computation | IRRELEVANT | an optimisation of recomputation, no observation |
| 7 | Preact Signals | REFERENCE | a different scheduler; count signal use in the corpus before any backend |
| 8 | Solid `createEffect` | REFERENCE | unordered effect sets; not in the corpus |
| 9 | Angular signal effects | IRRELEVANT | not in the corpus |
| 10 | Rules of React (purity, immutability, top-level hooks) | PORT | lint rules `hook-order` (a hook call under a branch, loop, nested function or after an early return) and `render-impure` (a write to an outer, captured or module variable during render, outside handlers and effects), `lint.mjs` near `:895` |
| 11 | Strict Mode double invocation | PORT | lane B renders each side twice from the same slots when the unit returns a tree; a differing tree or trace is REFUSE `render-impure` carrying both renders (`run.mjs:229`) |
| 12 | `exhaustive-deps` lint | REFERENCE | `exactReactHook` already demands coverage (`react.mjs:63-80`); an uncovered memo stays a transition |
| 13 | Batching, concurrent rendering (React 18) | REFERENCE | lean compares commits only; interrupted renders are the runtime's business; stated in the schedule class |
| 14 | Reconciliation by type and key | PORT (bounded) | keys are props and are compared; a child component is a name in the tree, never rendered, so instance retention across re-renders is out of the unit's scope and stays a tree-layer comparison |
| 15 | React Compiler 1.0 | IRRELEVANT | a build step; lean reads source |
| 16 | Hydration mismatch check | IRRELEVANT | no server in the sandbox |
| 17 | Suspense and streaming SSR | PORT | a thenable thrown during render, or `use()` from react, ends the run as `ASK:suspense` (`run.mjs:229`), never a crash |
| 18 | React Server Components | IRRELEVANT | a directive on a function; the function is a unit like any other |
| 19 | Isabelle/HOL Core DOM (BSD) | IRRELEVANT | lean holds no DOM; no Isabelle dependency |
| 20 | Isabelle/HOL Shadow DOM | IRRELEVANT | same |
| 21 | CSS cascade and resolved values | IRRELEVANT | out of layer: no stylesheet model in lean |
| 22 | CSS selector satisfiability | IRRELEVANT | selectors are not in the tree |
| 23 | Cassius (MIT, Racket, Z3, Firefox) | IRRELEVANT | layout needs a browser capture |
| 24 | VizAssert | IRRELEVANT | layout assertions, not equality |
| 25 | Troika | IRRELEVANT | same |
| 26 | ReDeCheck | IRRELEVANT | responsive geometry, browser |
| 27 | WPT reftests | REFERENCE | the pinned-viewport protocol, if pixels ever enter; they do not |
| 28 | DOM snapshots (Jest) | REFERENCE | our two-version tree comparison is a snapshot of both sides, no stored baseline |
| 29 | Testing Library role queries | IRRELEVANT | browser or jsdom |
| 30 | Playwright ARIA snapshots | IRRELEVANT | browser |
| 31 | axe-core | IRRELEVANT | browser rules |
| 32 | Playwright screenshots | IRRELEVANT | pixels |
| 33 | Pixelmatch (ISC) | IRRELEVANT | pixels |
| 34 | perceptualdiff (GPL-2.0) | IRRELEVANT | pixels and a licence lean does not take |
| 35 | EXSYST sequence search | REFERENCE | search-based sequences; fast-check's generator is the chosen engine |
| 36 | GUITAR event-flow coverage | REFERENCE | event-pair coverage is a program-depth statement in the certificate, not a verdict |
| 37 | Crawljax (Apache-2.0, Java) | IRRELEVANT | a browser crawler |
| 38 | fast-check stateful commands (MIT) | DEPENDENCY | already section 2; components add the commands `set(slot, v)`, `fire(handler, event)`, `settle`, `unmount` |
| 39 | XState graph utilities | REFERENCE | the finite-state lane is our own product exploration; no dependency |
| 40 | Storybook interaction tests | IRRELEVANT | browser |
| 41 | EventRacer | IRRELEVANT | a 2013 WebKit build |
| 42 | R4 stateless model checking | REFERENCE | DPOR over event schedules is the escalation of the clock lane, later |
| 43 | NodeRacer, nacd (Apache-2.0) | REFERENCE | delay injection as a schedule-witness search for the clock lane, later |
| 44 | WEBRR record/replay | IRRELEVANT | Chromium 83, a learned image oracle |
| 45 | Playwright virtual clock | REFERENCE | the operation list for our clock: Date, timers, animation frames, idle callbacks, event timestamps; the semantics are copied, the tool is not |
| 46 | WHATWG HTML event loop | PORT | the schedule class in the certificate: order within a task source, a microtask checkpoint after each command, paint cadence unmodelled; `run.mjs:303` |
| 47 | Contextual equivalence, full abstraction | REFERENCE | the design principle behind PASS-proved |
| 48 | HECTOR | IRRELEVANT | an ML fragment |
| 49 | Hobbit | REFERENCE | already section 2 (the closure escalation, later) |

Counts: PORT 6, DEPENDENCY 2, REFERENCE 17, IRRELEVANT 24.

## Result 2: the 65-item register

| # | Item | Verdict | Where in lean, how |
|---|---|---|---|
| 1 | React small-step semantics | REFERENCE | as result 1 item 3 |
| 2 | React-tRace | DEPENDENCY | as result 1 item 4 |
| 3 | Core DOM Isabelle/HOL | IRRELEVANT | no DOM in lean |
| 4 | Elm Architecture | REFERENCE | as result 1 item 5 |
| 5 | Vue reactivity | IRRELEVANT | not in the corpus |
| 6 | Solid batching | IRRELEVANT | not in the corpus |
| 7 | Preact Signals | IRRELEVANT | not in the corpus (count first, result 1 item 7) |
| 8 | Angular Signals | IRRELEVANT | not in the corpus |
| 9 | Nominal Adapton | IRRELEVANT | optimisation |
| 10 | Rules of React | PORT | as result 1 item 10 |
| 11 | Strict Mode | PORT | as result 1 item 11 |
| 12 | `act()` | REFERENCE | our `settle` command is the flush: drain microtasks, run effects whose deps changed |
| 13 | Hydration | IRRELEVANT | no server |
| 14 | React Compiler | IRRELEVANT | build step |
| 15 | DOM `isEqualNode` | REFERENCE | recursive node equality is what `JSON.stringify` of two trees already decides in lane B |
| 16 | `getComputedStyle` | IRRELEVANT | browser |
| 17 | CSSOM geometry | IRRELEVANT | browser |
| 18 | CSS selector and style analysis | IRRELEVANT | out of layer |
| 19 | SATCSS | IRRELEVANT | out of layer |
| 20 | TreePed | IRRELEVANT | prototype, jQuery |
| 21 | Cassius | IRRELEVANT | browser capture |
| 22 | VizAssert | IRRELEVANT | layout |
| 23 | Troika | IRRELEVANT | layout |
| 24 | Spineless Traversal | IRRELEVANT | layout speed |
| 25 | WPT reftest | REFERENCE | as result 1 item 27 |
| 26 | Firefox reftest | IRRELEVANT | browser |
| 27 | React Testing Library | IRRELEVANT | lean has its own harness |
| 28 | Jest | IRRELEVANT | a runner |
| 29 | fast-check | DEPENDENCY | as result 1 item 38 |
| 30 | XState | REFERENCE | as result 1 item 39 |
| 31 | EXSYST | REFERENCE | as result 1 item 35 |
| 32 | GUITAR | REFERENCE | as result 1 item 36 |
| 33 | Crawljax | IRRELEVANT | browser crawler |
| 34 | WebMate | IRRELEVANT | browser crawler, unverified build |
| 35 | EventRacer | IRRELEVANT | dead build |
| 36 | R4 | REFERENCE | as result 1 item 42 |
| 37 | RCLASSIFY | REFERENCE | "replay two controlled executions and compare state" is lean's own shape; nothing to take |
| 38 | Timelapse, Dolos | IRRELEVANT | browser replay, unverified |
| 39 | Sinon fake-timers (BSD-3) | REFERENCE | the clock operation semantics (`tick`, `runAll`, `setSystemTime`) copied into our clock; already section 2 (Jest, Node MockTimers) |
| 40 | Playwright Clock | REFERENCE | as result 1 item 45 |
| 41 | Playwright HAR replay | IRRELEVANT | the sandbox has no network; fakes answer |
| 42 | Playwright screenshots | IRRELEVANT | pixels |
| 43 | Playwright ARIA | IRRELEVANT | browser |
| 44 | rrweb | IRRELEVANT | DOM capture |
| 45 | Pixelmatch | IRRELEVANT | pixels |
| 46 | Resemble.js | IRRELEVANT | pixels |
| 47 | blink-diff | IRRELEVANT | pixels |
| 48 | odiff | IRRELEVANT | pixels |
| 49 | BackstopJS | IRRELEVANT | pixels |
| 50 | reg-suit | IRRELEVANT | pixels |
| 51 | Loki | IRRELEVANT | pixels |
| 52 | jest-image-snapshot | IRRELEVANT | pixels |
| 53 | Galen | IRRELEVANT | layout, Selenium |
| 54 | axe-core | IRRELEVANT | browser rules |
| 55 | Pa11y (LGPL-3.0) | IRRELEVANT | browser rules |
| 56 | Selenium | IRRELEVANT | browser driver |
| 57 | Cypress | IRRELEVANT | browser driver |
| 58 | GUI testing mapping study (136 papers) | REFERENCE | every sequence method samples; PASS-bounded states its program count and depth |
| 59 | 2025 web-testing survey (259 papers, 73 tools) | REFERENCE | context; no tool from it enters |
| 60 | CSS conformance corpus | IRRELEVANT | out of layer |
| 61 | WPT reference tests | IRRELEVANT | out of layer |
| 62 | Race warning corpus | IRRELEVANT | browser races |
| 63 | Timelapse developer study | IRRELEVANT | a human study |
| 64 | W3C/WHATWG DOM, CSS, HTML specs | PORT (HTML event loop only) | as result 1 item 46; the DOM and CSS parts are out of layer |
| 65 | Accessibility name and mapping specs | REFERENCE | a computed projection from the tree to roles and names is possible as an opt-in layer; not built unless asked |

Counts: PORT 3, DEPENDENCY 2, REFERENCE 15, IRRELEVANT 45.

## What the two results agree on, and lean adopts

- No single "same" for a screen; the verdict names its layer and its admitted set (both executive summaries).
- Keep the one-render tree check, label it one-render (result 1 synthesis, result 2 section 7).
- Beyond one render: retain state, compare after every step; a bounded run is never PASS (both).
- Formal models cover a hook subset only (React-tRace); the model boundary is a REFUSE/ASK boundary.
- Pixels, styles, layout and the accessibility tree need a browser; none is a proof; all stay out of lean.
