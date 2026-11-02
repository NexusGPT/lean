# Lane w9l-bounded-and-moves: result (2026-11-02)

Branch `lane/w9l-bounded-and-moves`, cut from `lead-v4` 0b260f050d. Head 4d3c4bd307 (measured). Design note:
`langs/ts/design/w9l-bounded-and-moves.md`.

## What the data showed (it differs from the brief)

- three.js#35012~m2, ~m3 (`no-witness/pass-bounded`): lane A did not prove anything within bounds. It REFUSED the unit
  (`ts-strict`), and lane B returned PASS-bounded. Lane B's draws reach the changed line, and on several draws its
  value differs between the sides (`name` versus `null` handed to `super.getUniformFromNode`). The fake receiver's world
  then masks it: `this.globalCache.getData` comes back a plain value where it is called, `getData()` a handle where an
  entry is built only when absent, and `setData` faults on its seeded draw. The change is reached and infects; it is
  never propagated. The input search (w3c) cannot help: it changes input leaves, never what the world answers.
- Checkmate#3257~m1 (`parent-lost-by-the-edit`): the PR moves `Utils/debounce.jsx` to `Hooks/useDebounce.ts` (git `R`).
  The mutant's dropped `useEffect` (8 lines) takes git's similarity under 50 %, so the file becomes `A` + `D` and the
  unit is NEW.

## What landed

1. **The world search** (exec/search.mjs `valueSites`, `valueMarks`, `searchWorld`; exec/fake.mjs `answer`, `faultDraw`;
   exec/run.mjs after the draws and the input search). On by default; `LEAN_WORLD_SEARCH=0` turns it off;
   `LEAN_BREAK=w9l-bounds` removes it.
   - Value probes go on the values a changed line computes. An input *infects* when the two sides' sequences differ.
   - The world's answers follow a recipe, the same on both sides: a handle, absent, null, or a fault taken back.
   - The search climbs from each infected draw. After a throw it moves the latest answer first; after a return, the
     answers after the infected value first. It keeps a move when the run goes further (more statements, or as many
     and more world answers), and tries moves kept by earlier climbs first.
   - With no infected draw, one leaf change to a literal of a changed condition (the input search's tier 0) infects
     first.
   - A witness counts after a replay. Its input and its record name `source: world` and the world answers.
   - Bounds: n runs, a quarter of the unit's seconds, 12 per climb.
2. **A search's change keeps the draw's declared type**. The whole value must still fit, read open (extra keys
   allowed) as TypeScript reads it. Without this the infection step produced an unsound WITNESS on `type_tests hasKey`
   (a tag set to `"a"` on a `{kind: "b", right}` draw); the lane B sweep caught it. The same guard now covers the w3c
   input search. `LEAN_BREAK=w9l-typed` removes it.
3. **Moves git does not pair** (ci/ledger.mjs `pairMoves`): an added and a deleted source file pair as `rename/move`
   (`pairedBy: units`) when they share their top-level functions by name. The match must be mutual and unique, and the
   shared names must cover at least half of the smaller side. The pair's hunks come from `git diff --no-index` of the
   two texts. `LEAN_BREAK=w9l-moves` removes it.
4. Pairs `tests/pairs/world_masked`, `tests/pairs/world_masked_infect`; test `tests/w9l-bounded-and-moves.mjs`
   (`--break`); breaks registered in tests/break.mjs; the step cache keys on `LEAN_WORLD_SEARCH`.

## Validators (output lines verbatim)

| validator | output | command |
| --- | --- | --- |
| test | `w9l-bounded-and-moves: 26 checks pass` (exit 0) | `node langs/ts/tests/w9l-bounded-and-moves.mjs` |
| test --break | `AssertionError [ERR_ASSERTION]: world_masked: WITNESS from the world search, replayed (PASS-bounded, null; null)` (exit 1) | `node langs/ts/tests/w9l-bounded-and-moves.mjs --break` |
| moves break alone | `AssertionError [ERR_ASSERTION]: an added and a deleted file holding the same function pair as a move ([["A","src/hooks/useDebounce.ts","src/hooks/useDebounce.ts"],["D","src/utils/debounce.jsx","src/utils/debounce.jsx"]])` (exit 1) | `LEAN_BREAK=w9l-moves node langs/ts/tests/w9l-bounded-and-moves.mjs` |
| typed break alone | `AssertionError [ERR_ASSERTION]: type_tests hasKey: no witness from a change that leaves the declared type (WITNESS, {"source":"world","from":5,"changes":["arg0.kind set \"a\""],"world":[]})` (exit 1) | `LEAN_BREAK=w9l-typed node langs/ts/tests/w9l-bounded-and-moves.mjs` |
| pairs (suite) | `\| TOTAL \| 1 checks \| ALL PASS \|` for each of world_masked, world_masked_infect | `node langs/ts/tests/run.mjs --pair <pair>` |
| w3c test | `search-inputs: 16 checks pass` | `node langs/ts/tests/search-inputs.mjs` |
| ledger tests | `ledger.test: all assertions pass`, `ledger-failures.test: all assertions pass`, `worktree.test: all assertions pass`, `new-code.test: 12 of 12 checks pass` | `node langs/ts/ci/<t>.test.mjs` |
| lane B sweep, every unit of every pair | `tree /root/lanes/w9l-bounded-and-moves/tree: 2148 units recorded`; 2148 of 2148 equal their pair's expected `b` (search_boundary, search_nested_literals at their `search.off` verdict, as the sweep runs without LEAN_SEARCH) | `node langs/ts/tests/laneb-sweep.mjs --tree <tree> --out sweep-after2.json --jobs 4` |

The first sweep (before item 2) differed on 1 unit, `type_tests hasKey` (PASS-bounded expected, WITNESS got). Item 2 is
the fix; the second sweep is the line above.

## Measured: the hour bench (DA e4d0698de3, jobs 4, my own clone; before = lean 0b260f050d, after = 4d3c4bd307)

The three ids (`--only`):

- before `0b260f050d M rendered 0 of 3 (0.0 %), record 0 of 3, completed 3 of 3, wall 6.0 min`
- after `4d3c4bd307 M rendered 2 of 3 (66.7 %), record 2 of 3, completed 3 of 3, wall 7.7 min`

The 75:

- before `0b260f050d M rendered 16 of 75 (21.3 %), record 33 of 75, completed 39 of 75, wall 196.2 min`
- after `4d3c4bd307 M rendered 18 of 75 (24.0 %), record 35 of 75, completed 43 of 75, wall 180.3 min`
- Ledger cause changes, before to after (every other mutant has the same cause):
  - `bluewave-labs__Checkmate#3257~m1 no-witness/parent-lost-by-the-edit -> hit`
  - `mrdoob__three.js#35012~m2 no-witness/pass-bounded -> hit`
- determinism: 98 of 98 byte-equal on both runs.
- Time: lean wall over the 67 sides whose lean finished without a stop in both runs: 0.913x in total, per side median
  0.862, max 1.011, none over 1.3x. The machine was shared (peak load 184), so the ratio under 1 is load. An earlier
  after-run (94a7b3fd73, before item 2: same rendered and record counts, same comment-set sha256) gave 0.979x over
  63 sides, median 1.00, max 1.364 (typescript-go#3834~m3, 157 to 214 s).
- Unit level (exec/run.mjs alone, three.js getUniformFromNode, n 30): 70 s without the world search, 72 to 88 s with it across the versions run (a shared machine, single runs).

Both runs also have 32 to 34 mutant timeout rows (the big n8n, cline and react parents at jobs 4 under that load). They
are the same in both runs and not this lane's.

Records: `/root/da-bench/w9l-bounded-and-moves/hour/{three-before,three-after2,all-before,all-after2}`.

## Open

- three.js#35012~m3 stays PASS-bounded. It is infected only after a leaf change (`type` set to `"bufferx"`, found), and
  its climb from that input walks the same world path as m2's witness, but the first infected draw's climb (12 tries)
  leaves it two steps short of the 30-try bound. I did not raise the bound for this one case.
- The infection reading sees primitives exactly and anything else by its kind alone, so an object-valued change shows
  as infection only when its kind differs.
- A pair `pairMoves` makes is by function names; a move that also renames its functions stays unpaired.
- The 9 lean timeouts and the parent-load failures of the ledger are other lanes' causes.
