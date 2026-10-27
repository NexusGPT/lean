# Ten front-end moonshots for lean, each with a test under a day

2026-10-26. A moonshot here is a claim that would change what lean can say about a React component, not a
feature. Each one carries: the claim, what it needs first, a test runnable in under a day with its command,
the pass bar, the kill signal. Numbers marked (census) were measured today over the 39 census repositories
with grep (counts of text matches, node_modules excluded); numbers marked (brief) come from brief 18.
No lanes: the tests run one after the other, by Cue (owner, 2026-10-26).

Census, 2026-10-26: 2,041 `.tsx` files against 9,955 `.ts`; 3,355 hook calls (`use[A-Z]…(`), of which
React's own (useState 641, useEffect 449, useCallback 307, useMemo 210, useRef 162, useContext 91, useId 58,
useLayoutEffect 49, useSyncExternalStore 26) are 1,993 (59%); 1,062 `useState` calls with a readable
initialiser: boolean 285, string literal 213, null or undefined 213, expression 109, array literal 82, number
literal 72, object literal 23, string-literal union 4; class components in 2 files; 87 `.tsx` files use
setTimeout, setInterval or requestAnimationFrame. Brief 18: 1,560 handler attributes, 2,585 hook calls.

## 1. Finite components decided over every event sequence

- Claim: a component whose state slots and props are all finite by type is a Mealy machine; lean explores
  the product of parent and candidate fully and prints PASS-decided, a proof over every event sequence.
- Needs first: nothing; the type reader exists (`translate/translate.mjs` `dtype`).
- Test: (a) `langs/ts/design/finite-components-census.mjs`: per function returning JSX, classify every
  `useState` slot (literal initialiser or annotation) and every prop type as finite or not; print the share of
  components with every slot and prop finite. (b) probe pair `scratchpad/moonshots/01-finite/`: a Toggle with
  two boolean slots and two handlers; candidate A swaps two setter calls in one handler (same final state);
  candidate B flips one setter; a 60-line product explorer over the commands `set`, `fire` on run.mjs's
  sandbox. Command: `node langs/ts/design/finite-components-census.mjs` then `node scratchpad/moonshots/01-finite/explore.mjs`.
- Pass: at least 15% of hook-using components fully finite; candidate A PASS-decided with the pair count,
  candidate B a WITNESS of at most 3 commands, both under one second.
- Measured (part a, 2026-10-26, `langs/ts/design/finite-components-census.mjs`): 1,037 components use
  `useState`; 265 (26%) have every slot finite; 98 (9%) are finite in slots and props strictly, 100 (10%)
  with function and node props as opaque inputs; 2,190 prop types are unknown with imports unresolved, so the
  true share is between 10% and 26%. Not killed (the kill bar is 5%); the population is 100 to 265 components.
- Measured (part b, 2026-10-26, `langs/ts/design/moonshots/01-finite/explore.mjs` over run.mjs's sandbox with
  retained slots): the Toggle (two boolean slots, two buttons) against candidate A (two setter calls swapped in
  one handler) is PASS-decided over every click order, 4 state pairs, 0.3 s, for both props; against candidate B
  (`setPinned(true)` for `setPinned(!pinned)`) a WITNESS of 2 clicks (`open`, then `pin`) in 0.3 s. The pass bar
  holds. What the prototype leaves out: effects, the clock, finiteness read from the types (the census says who
  qualifies), the certificate line; that is the finite-state row.
- Built (2026-10-27, `langs/ts/exec/finite.mjs`, wired as rung 2 of the certificate): finiteness read from the
  types (useState type arguments or the widened initialiser; the props record's fields finite or opaque), the
  product of parent and candidate explored over every click order from every prop assignment, effects and armed
  timers inside each step, a fresh mount per path; PASS-decided with the state pairs and assignments in the
  certificate, a 500-pair bound (ASK). Pair `tests/pairs/finite_components`: Toggle (a reordered handler lane A
  cannot read) PASS-decided, Tabs PASS-decided, Mutant a 2-click WITNESS, Named (a string slot) left to the
  bounded rung. The ladder in check.mjs: PASS-proved, then PASS-decided, then PASS-bounded. 69 lane B expectations
  of the React, timer and clock pairs unchanged.
- Kill: under 5% of components fully finite.

## 2. The induction proof: re-render equivalence with no renderer

- Claim: one Dafny lemma per component, "equal props and slots give an equal tree and equal next slots",
  covers every sequence by induction; lane A proves it on the ledger with slots as cells.
- Needs first: nothing for the probe; the slot cells in `heap.mjs` for the real thing.
- Test: hand-written `scratchpad/moonshots/02-step-lemma/counter.dfy`: `datatype S = S(count: int)`,
  `Render(p, s): JsxNode`, `Step(s): S` read off the handler descriptor `ReactCall("set", …)`, lemma
  `Equal_step(p, s)` ensuring both; then the mutant `count + 2` must fail. Command: `dafny verify
  counter.dfy` on both files.
- Pass: proved and refuted, each under 60 seconds.
- Measured (2026-10-26, `langs/ts/design/moonshots/02-step-lemma/`): `counter.dfy` proves the step lemma and
  the induction lemma over n clicks, 4 verified in 0.9 s; `counter-mutant.dfy` (one more per click) fails the
  step lemma, 3 verified, 1 error, 1.0 s. The shape holds; the open part is reading `Step` off the real handler
  descriptor in `translate.mjs` instead of writing it by hand.
- Built (2026-10-27, lane A): a component whose top-level statements call `useState`, and that no other unit of
  the file calls, is read as a function of its props and its slots (`Slots_<hash>`, one field per call); the render
  reads slot i, a handler's setter call is a `ReactSet(i, next)` step carrying the next value (an updater applied to
  the slot's running value), and the unit returns its initial slots. Pair `tests/pairs/hook_slots`: `setN(1 + n)`
  for `setN(n + 1)` proved; an updater against the value form proved; a lazy initializer against the eager one
  proved; `n + 2` refuted; a second `useState` withheld (the slot lists differ) and witnessed by lane B. The 17
  jsx_handlers proof expectations unchanged. The induction over sequences is the meta-argument of the probe.
- Kill: the setter descriptor cannot be read as a slot transition without an axiom on the uninterpreted
  handle (`design/react-handlers-memo.md` records that equality of `() -> Unit` values is unproved).

## 3. React-tRace as the oracle for our fake hooks

- Claim: run.mjs's hook runtime (`run.mjs:73-93`) agrees with a formal semantics of useState and useEffect
  on its 38 tests, as the library table agrees with Test262.
- Needs first: the repository `github.com/Zeta611/react-trace` (MIT) cloned under `lean-deps`; its LICENSE
  read.
- Test: list its test directory; if the test programs are JavaScript or TSX, run 5 through run.mjs's sandbox
  and compare the recorded render and effect order with the expected trace; else port 5 of the 18 scenarios
  by hand into `scratchpad/moonshots/03-react-trace/`. Command: `node langs/ts/exec/run.mjs --parent t.tsx
  --candidate t.tsx --unit App --no-project` per scenario, trace read by hand.
- Pass: 5 of 5 agree, or every disagreement names a rule our runtime lacks (setter during render, cleanup
  order, effect after commit).
- Measured (2026-10-26, clone at `~/nexus/nexus-organisation/work/lean-deps/react-trace`, MIT, head da92a1b):
  `test-react-side/src/` holds 37 plain JSX components and 38 Jest tests over 18 scenario families; the oracle
  is a mocked `print` whose call count and order are asserted (render and effect counts, re-render cycles,
  reconciliation, user events). The port is direct: `./print` becomes a recorded fake in lane B's sandbox and the
  trace is compared with the test's expected calls; most families need the re-render loop (a setter in an
  effect re-renders up to 25 or 100 times), which is the hook-slot runtime row. Not killed.
- Measured (part b, 2026-10-27 00:xx, `langs/ts/exec/react-trace.mjs`, 8 scenarios ported under
  `tests/fixtures/react-trace` with a recorded `print` probe): 8 of 8 agree, seven scenario families (no effect;
  retries from a setter during render, including the 8-print exact sequence of set_state_before_bind; infinite
  retries as ASK:render-loop at 25; guarded setter; effect steps to 25; the 100-step effect with a module counter;
  two user clicks). The runtime renders until stable and settles effects until stable, as React does. The pass
  bar holds. Not ported: child, sibling and recursive views (lean renders one component), reconciliation.
- Kill: no scenario portable in a day.

## 4. Purity by double render, Strict Mode without React

- Claim: rendering twice from the same slots and comparing tree and trace finds impure renders, with no
  false alarm under lean's fakes.
- Needs first: nothing.
- Test: a `--double` flag in `run.mjs` `observe()` (`:229`): a second render on the same Environment,
  compared; run over every component of one app repository of the census (20 to 40 components); every
  REFUSE read by hand. Command: `node langs/ts/exec/run.mjs --double …` over the repo's `.tsx` units.
- Pass: 0 false alarms in the hand read; a true impurity found, or none exists and the check stays.
- Measured (2026-10-26, `run.mjs` double render, the 30 benchmark components each against itself): first run
  13 of 30 refused, all false alarms (useRef and friends fell to the generic fake and the environment's call
  counters advanced, so `cn()` answered differently); after two fixes (useRef, useId, useContext, useReducer and
  useLayoutEffect as retained slots; the second render replays the environment's call counters while the clock
  and the random stream stay live) 30 of 30 pass and the pair's two clock-reading components are refused. 0
  false alarms; no true impurity among the 30. The kill signal fired and was fixed in the same day.
- Kill: the demand-driven fakes return a fresh value per read, so every render differs; then the fake
  policy must become replay-stable by path first, a day of its own.

## 5. The effect layer over sequences

- Claim: deps compared by `Object.is`, cleanup before re-run and on unmount, layout effects before passive,
  as an ordered trace; a changed deps list is a WITNESS at the effect layer with a two-command sequence.
- Needs first: slot retention across a re-render (the retained-state runner of section 5 of the integration
  note), or a 60-line stub in the probe.
- Test: probe pair `scratchpad/moonshots/05-effects/`: parent `useEffect(() => sub(id), [id])`, candidate
  `[]`; commands `set(id, 2)`, `settle`. Lane A must prove the tree equal.
- Pass: WITNESS at depth 2 with the sequence printed (the parent re-subscribes, the candidate does not); the
  tree layer PASS.
- Measured (2026-10-27, `run.mjs` re-render sequences, pair `tests/pairs/effects_deps`): a dropped effect
  dependency is already visible at one render (the pending record carries the deps), so the pair plants a stale
  value instead (`setId(start + 1)` for `setId(id + 1)`): one render and one click are equal; the second click
  diverges, WITNESS with the sequence [click, click], the parent's trace showing the cleanup, the unsubscribe and
  the new subscribe. Every 2-click sequence over at most 4 handlers from a fresh mount, on 2 inputs, runs on
  every rendered unit of the suite: the 28 React pair expectations hold in 9 s. The bar holds.
- Kill: none foreseen.

## 6. Symbolic handlers: descriptors interpreted as slot transitions

- Claim: a `ReactHandler` descriptor whose steps are `set` calls with pure arguments is a transition the
  finite lane and lane A can apply without invoking the handler.
- Needs first: nothing; the descriptors exist (`translate.mjs:2049`).
- Test: (a) count: run `translate.mjs` over 200 `.tsx` units and count handlers emitted as `react_handler_`
  against `fn_` (opaque); (b) a 50-line interpreter in lane B that applies the `set` steps to the slots and
  compares with the real invocation on the 17 units of `tests/pairs/jsx_handlers`.
- Pass: at least 40% of handlers descriptor-readable; interpreter and invocation agree on every readable one.
- Measured (part a, 2026-10-26, 200 census files with handler attributes, 1,718 attributes, translate.mjs
  --tolerant): 812 units, 469 translated, 332 linted out, 11 failed; in the translated units 245 function-valued
  props are boxed, of which 62 are descriptors (25%), 155 opaque by text (63%), the rest inline lambdas or named
  functions. Below the 40% bar, above the 20% kill: the lever is the descriptor reader (event parameters,
  `preventDefault`, a local declaration, a branch keep a handler opaque today). Part b (the interpreter) waits
  on the hook-slot runtime.
- Kill: under 20% readable.

## 7. Deep render: a page as one unit

- Claim: same-package child components render with their own slots, one level down, so a page-level change is
  decided on the composed tree instead of a tree of names.
- Needs first: nothing for the probe.
- Test: (a) count the JSX tags resolving to a same-package export against a package import, over one app
  repository, with the TypeScript resolver; (b) a `--deep` flag in `run.mjs` `jsxValue` (`:62`) calling a
  same-package function component with its props, no context; probe pair where only the child's text
  changes: the parent unit shows WITNESS only in deep mode.
- Pass: at least 50% of tags resolvable in the app repository (the census's top tags, `DocCode` 728,
  `Button` 395, `Card` 214, are a docs site's); the probe behaves.
- Measured (a), 2026-10-27, `lean-v3/harness/jsx_tags.mjs` over the census's largest app repository (320 `.tsx`
  files): 2,320 component tags, 2,205 (95%) resolve to a same-package declaration, 69 to a package import, 46
  unresolved; the top same-package tags are a motion wrapper (257), a label (191) and an icon (148). The bar is met.
- Built (b), 2026-10-27: `run.mjs --deep` (and `check.mjs --deep`) renders a same-package function component (a real
  function the sandbox linked, never a fake) inside the parent's render, on its own hook frame keyed by its order
  among the parent's component tags, one level down, no context; the element keeps its name and props and gains
  `rendered`, which `observeJsx` walks like the parent's tree (handlers included); the certificate's observation line
  names the mode. Pair `deep_render`: only the child's text changes; `Page` is PASS-bounded as a tree of names and
  WITNESS in deep mode. Off by default: the suite runs both modes only for `expect.deep`.
- Kill: context providers or hooks inside children make over half the deep renders ASK.

## 8. A hook table, like the library table

- Claim: the top library hooks are typed transitions with declared result shapes, so lane A is exact and
  lane B's fakes are typed where today a custom hook is an opaque transition.
- Needs first: nothing.
- Test: `translate/hooks.json` with 5 rows (`useQuery`, `useMutation`, `useRouter`, `useParams`,
  `useTranslation`: result shape, effect class, what the callback may do); run `translate.mjs` over the 42
  `useQuery` sites and count how many become exact.
- Pass: at least 30 of 42 exact. Census: the top 10 non-React hooks are 305 calls (9%); the long tail of
  custom hooks is 1,057 (32%), which the table never reaches and the census says so.
- Kill: the result shapes hang on generics the type reader cannot resolve at most sites.

## 9. A schedule explorer for timers and frames in a component

- Claim: with at most three pending timers or frames, every firing order the HTML event loop allows is
  enumerated and both sides compared after each; a debounce-delay change is a WITNESS with a clock sequence.
- Needs first: the virtual clock row (integration note section 6), or a stub in the probe.
- Test: probe pair `scratchpad/moonshots/09-debounce/`: a search box with `setTimeout(…, 300)` in an
  effect; candidate 0 ms; commands `set(q, 'a')`, `tick(100)`, `settle`.
- Pass: WITNESS with the clock trace; equal delays PASS-bounded with the bound "3 timers" in the certificate.
  Census: 87 `.tsx` files hold a timer or a frame.
- Kill: none; the bound is stated.

## 10. The front-end mutation benchmark nobody has

- Claim: no dataset of component regressions exists in any field read; lean builds its own from the corpus
  with mechanical mutation operators, and that is the only catch rate per layer anyone can quote.
- Needs first: nothing.
- Test: 6 operators as AST transforms in `langs/ts/design/mutate-components.mjs` (drop an effect dep, swap
  two setter calls, key by index, remove a cleanup return, flip a conditional render, change a text child);
  apply to 30 corpus components with hooks; run lane B one-render and, where the stub exists, the
  two-command sequence; print catches per operator and per layer.
- Pass: the pipeline runs on 30 components with a table per operator; the one-render check catches the text
  and conditional mutants and misses the deps and cleanup ones (that gap sizes concepts 5 and 9).
- Measured (2026-10-26, `langs/ts/design/mutate-components.mjs`, 30 stateful components of the census, 20
  inputs each, `design/mutation-benchmark.json`): 71 applicable mutants, 40 caught at one render (56%).
  Per operator, caught of applicable: change-text 14 of 20, flip-conditional 11 of 16, key-index 7 of 10,
  swap-setters 4 of 9, drop-dep 3 of 11, remove-cleanup 1 of 5. The misses: a dropped `useMemo` or
  `useCallback` dependency is invisible in one render; setters inside a timer never run (the clock, concept 9);
  an effect that calls `requestAnimationFrame` or `window.addEventListener` throws in the sandbox on both
  sides before its cleanup (two globals to add); a list or text inside a branch the generated inputs never
  take. The bar stands: concepts 5 and 9 are sized by the 17 misses on deps, cleanup and setters.
- Measured again (2026-10-27, the same 30 components and operators, lane B with the re-render sequences, effects as
  slots and the virtual clock): 71 applicable, 44 caught (62%). Per operator: change-text 15 of 20, flip-conditional
  14 of 16, key-index 9 of 10, remove-cleanup 2 of 5, drop-dep 3 of 11, swap-setters 1 of 9. Swap-setters fell from 4
  because two setters reordered inside one handler are React's batching and no longer an observation (10.2b); the
  three it still catches move a value through pending work. The first re-run lost 15 verdicts: a render that threw
  on a later click crashed lane B; fixed the same night (a throwing render along a path is an observation, the
  path ends there, both sides compared). The remaining misses are the ones named above: a dropped useMemo or
  useCallback dependency, a list or text inside a branch the inputs never take.
- Kill: none; this is the measure the other nine are judged on.

## Class components, counted (2026-10-27)

Over the 39 census roots (31,106 source files walked, `node_modules`, `dist`, `build`, `.next` and `out` skipped),
6 classes extend `Component` or `PureComponent`, in 4 files: two sign-in views and two error boundaries. Decision:
no lifecycle machine in the fake runtime. A class component stays a unit of methods (its `render` a method of an
explicit receiver, its fields in the world), never a machine; the hook runtime is where the components are.

## Two more, cheaper, waiting for the owner

- An accessibility projection as a Dafny function over `JsxNode` (roles and names from the HTML-AAM tables):
  an opt-in weaker layer for decoration-only changes. Cue's addition, built only on the owner's word.
- A WITNESS printed as a DOM patch (insert, remove, text, attribute) so a reviewer reads what changed.

## Order

10, 4, 5, 1, 6, 2, 3, 8, 9, 7: the measure first, then the two cheapest checks, then the proofs. Ten tests,
one after the other, about eight working days (CLAIM).
