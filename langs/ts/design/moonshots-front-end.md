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
- Kill: no scenario portable in a day.

## 4. Purity by double render, Strict Mode without React

- Claim: rendering twice from the same slots and comparing tree and trace finds impure renders, with no
  false alarm under lean's fakes.
- Needs first: nothing.
- Test: a `--double` flag in `run.mjs` `observe()` (`:229`): a second render on the same Environment,
  compared; run over every component of one app repository of the census (20 to 40 components); every
  REFUSE read by hand. Command: `node langs/ts/exec/run.mjs --double …` over the repo's `.tsx` units.
- Pass: 0 false alarms in the hand read; a true impurity found, or none exists and the check stays.
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
- Kill: none foreseen.

## 6. Symbolic handlers: descriptors interpreted as slot transitions

- Claim: a `ReactHandler` descriptor whose steps are `set` calls with pure arguments is a transition the
  finite lane and lane A can apply without invoking the handler.
- Needs first: nothing; the descriptors exist (`translate.mjs:2049`).
- Test: (a) count: run `translate.mjs` over 200 `.tsx` units and count handlers emitted as `react_handler_`
  against `fn_` (opaque); (b) a 50-line interpreter in lane B that applies the `set` steps to the slots and
  compares with the real invocation on the 17 units of `tests/pairs/jsx_handlers`.
- Pass: at least 40% of handlers descriptor-readable; interpreter and invocation agree on every readable one.
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
- Kill: none; this is the measure the other nine are judged on.

## Two more, cheaper, waiting for the owner

- An accessibility projection as a Dafny function over `JsxNode` (roles and names from the HTML-AAM tables):
  an opt-in weaker layer for decoration-only changes. Cue's addition, built only on the owner's word.
- A WITNESS printed as a DOM patch (insert, remove, text, attribute) so a reviewer reads what changed.

## Order

10, 4, 5, 1, 6, 2, 3, 8, 9, 7: the measure first, then the two cheapest checks, then the proofs. Ten tests,
one after the other, about eight working days (CLAIM).
