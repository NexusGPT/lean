# w9l: the world search, and the moves git does not pair (2026-11-02)

Two causes of the miss ledger of the 30-PR dev slice (DA `bench/ledger/ledger.md`): `no-witness/pass-bounded`
(three.js#35012~m2, ~m3) and `no-witness/parent-lost-by-the-edit` (Checkmate#3257~m1).

## 1. PASS-bounded: the change infects, the world masks it

What the rows show (read, not assumed): lane A refused the unit (`ts-strict`), so no bounded proof holds. Lane B
PASS-bounded `GLSLNodeBuilder.getUniformFromNode`: its draws reach the changed line (the input search's targets all
reached), and on several draws the line's value differs between the sides (`name` handed to `super.getUniformFromNode`
on the parent, `null` on the mutant). The difference never reaches an observation: the receiver is a fake, and what the
world answers after the changed line (`this.globalCache.getData` a plain value where the code calls it,
`getData()` a handle where the code builds an entry only when it is absent, a seeded fault of `setData`) ends the call
or takes the branch that does not read `name`. In mutation-testing terms the change is reached and infects, and it is
not propagated. The input search (w3c) changes the input's leaves only; "a leaf behind a fake is never changed" was
its open line.

The mechanism (exec/search.mjs `valueSites`, `valueMarks`, `searchWorld`; exec/fake.mjs `answer`, `faultDraw`;
exec/run.mjs after the draws and the input search):

- **Infection.** A value probe around every value a changed line computes inside the unit (a call's or a `new`'s
  arguments, an initialiser, the right of an assignment, a return or throw, a condition no enclosing value reads; never
  a function or class expression, never the argument of `require` or `import()`). The probe reads a primitive by itself
  and anything else by its kind (no getter, no trap). An input infects when the two sides' sequences differ.
- **The world.** `Environment.answer` (the varied answer of a fake's member, a call's result) and `faultDraw` obey a
  world recipe (path to kind: a handle, absent, null, or a fault taken back) and log every answer the call consumed.
  The recipe is the same on both sides; its answers are the same menu the seeded draw picks from.
- **The climb.** From each infected draw, one move at a time: after a throw the latest answer first (what stopped
  the run), after a return the answers consumed after the infected value first (the guard that masked it). A move is
  kept when the run stays infected and goes further (more statements ran, every loaded file's statement marks, or as
  many and more of the world answered). A move one climb kept is tried first on the next. No infected draw: one leaf
  change to a literal of a changed condition (the input search's tier 0) infects first (at most half the budget).
- **The witness.** A difference counts after a replay on fresh environments (the w3c rule). The witness input names
  `source: world`, the draw, the leaf changes and the world answers; its record carries the same (`record.search`).
- **Bounds.** At most `n` runs per unit (30 in the bench) and a quarter of the unit's seconds, 12 per climb. On by
  default; `LEAN_WORLD_SEARCH=0` turns it off; `LEAN_BREAK=w9l-bounds` removes it (tests/break.mjs).

Soundness: a WITNESS is an observed difference of the two sides under one world, as every lane B witness is; the
recipe only picks answers the seeded world could give. Nothing becomes PASS that was not.

## 2. A move git does not pair

Checkmate#3257 moves `client/src/Utils/debounce.jsx` to `client/src/Hooks/useDebounce.ts`; git's rename detection pairs
them on the PR (similarity at least 50 %), and the mutant's dropped `useEffect` block (8 lines) takes the similarity under
the bar: an added file with no parent and a deleted one. ci/ledger.mjs `pairMoves`: an added and a deleted source file of
the change that git left unpaired pair as `rename/move` (`pairedBy: units`) when they hold the same top-level functions
by name, each the other's one best match (no tie), the shared names at least half of the smaller side's. The pair's
hunks are git's own diff of the two texts outside the repository (`git diff --no-index`). From there the file is read as
a git rename is (its parent text, its units). `LEAN_BREAK=w9l-moves` removes it.

## Checks

`node langs/ts/tests/w9l-bounded-and-moves.mjs` (and `--break`: red); the pairs `world_masked`,
`world_masked_infect`.
