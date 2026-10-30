# Front-end mutants lane: result (2026-10-30)

Head: branch lane/frontend-mutants. Caught with the patch: 42 of 71, not the 44 asked. The two missing are equivalent mutants.

## Flipping commits, by bisection (one worktree at a time, the R8 run.mjs command on that one mutant)
- ProcessionDemo change-text and swap-setters: WITNESS at dcbc61c, PASS-bounded at f96481c1 (held functions compared by descriptor, not text).
- SelectionActions swap-setters: WITNESS at 63545bab, PASS-bounded at ea71acad (escaping functions observed by behaviour, never text).
- Mechanism: all three old witnesses were text hashes. ProcessionDemo's was the hash of `renderItem`, which no mutation touched. SelectionActions' was the hash of `place` in an effect's deps. The commits are sound.

## The real difference, and why it was hidden
- change-text differs only after `onComplete` runs `window.setTimeout` and the timer fires ("Order created" vs "Order created.").
- exec/run.mjs sets `g.window = undefined`, so `onComplete` throws a TypeError on both sides and the created view is never rendered.
- Fix: `window` is the global object, as in a browser. It is one line in run.mjs, which another lane owns, so it is in lane/proposed-run.mjs.patch for the lead. It applies cleanly on 497cc8c8. No rule names a component, operator or fixture.
- With the patch, change-text is a WITNESS on the sequence `div[0]:onComplete`, as a text patch on span[0].

## Why the two swap-setters stay PASS-bounded
- ProcessionDemo swaps setValues({}) and setCreated(null) inside one click handler.
- SelectionActions swaps setAnchor and setPositioned inside one requestAnimationFrame callback.
- React 18 and 19 batch both, and apps-ui declares react ^18.3 || ^19. The final state is the same and nothing renders in between.
- design/moonshots-front-end.md 10.2b already rules setter order inside one handler as batching, not an observation. A WITNESS there would be unsound, so I did not build one.

## Full run with the patch
- Command: the R8 per-mutant command (run.mjs, --no-project --n 20 --ms 2000) over the 71 mutants R8 wrote at f3cb5b4.
- It ran in two halves of about 9 and 10 minutes, under the 15-minute stop. Mutation generation and exec are byte-equal between f3cb5b4 and 497cc8c8.

| operator | caught of applicable |
|---|---|
| change-text | 15 of 20 |
| flip-conditional | 14 of 16 |
| key-index | 8 of 10 |
| remove-cleanup | 2 of 5 |
| drop-dep | 3 of 11 |
| swap-setters | 0 of 9 |
| total | 42 of 71 |

- Against the dcbc61c log, change-text is back. The two swap-setters mutants differ, as explained. No other mutant changed.

## Pair
- langs/ts/tests/pairs/window_timers is lane B only, and runs with `node langs/ts/tests/run.mjs --pair window_timers`.
- At 497cc8c8 it is red with two wrong verdicts. SaveDone, a real difference after a window timer, is PASS-decided. SaveAlias, setTimeout against window.setTimeout, is a WITNESS.
- With the patch it is green: SaveDone WITNESS, SaveAlias PASS-decided, SaveReset PASS-bounded.
- It stays red on this branch until the lead applies the patch.

## Left
- `window.addEventListener` and `document` are still absent, so effects that subscribe to them throw on both sides.
- design/process-write.md still says "window as undefined". It needs one line changed when the patch lands. It is not my file.
- The finite explorer reports PASS-decided when every handler threw the same sandbox TypeError. With the patch this case is gone, but the general hole is not closed.

## Files touched
- langs/ts/tests/pairs/window_timers/{parent.tsx,candidate.tsx,expect.json}
- langs/ts/design/moonshots-front-end.md (a dated section)
- lane/proposed-run.mjs.patch
- lane/frontend-mutants-result.md
