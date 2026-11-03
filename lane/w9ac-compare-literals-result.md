# Lane w9ac-compare-literals (lean): result

Branch `lane/w9ac-compare-literals`, from `lead-v4` 14b167a8e0. Commits: 7c6bb906ed (guided world moves, a callee in
another local file read for the draws), c81c72e847 (a falsy infection waits and is unmasked first), and the commit
holding this file (the world_guard_path break row names both of its mechanisms; the design note's checks line; this
file). Design note: `langs/ts/design/w9ac-compare-literals.md`.

## The id

| | lean | rendered | record | lane B on the unit | lean wall (mutant side) |
|---|---|---|---|---|---|
| before | 14b167a8e0 | 0 of 1 | 0 of 1 | PASS-bounded (`no-witness/pass-bounded`) | 172.9 s |
| after | c81c72e847 | **1 of 1** | **1 of 1** | **WITNESS** (ledger `hit`: trace:call>call @1877, distance 0) | 213.5 s |

```
14b167a8e0 M rendered 0 of 1 (0.0 %), record 0 of 1, completed 1 of 1, wall 3.9 min
c81c72e847 M rendered 1 of 1 (100.0 %), record 1 of 1, completed 1 of 1, wall 6.6 min
| 1 | three.js#35012~m3 | string-change | GLSLNodeBuilder.js:1877 | GLSLNodeBuilder.getUniformFromNode (1875-1956) | ok | WITNESS lane B, trace, site 1875 | HIT trace:call>call @1877 (d=0) | `hit` | witness; no such record in the PR instance | new comment trace:call>call at [1877] inside unit 1875-1956, distance 0 from the edit 1877-1877 |
```

The runs: `/root/da-bench/w9ac/w9ac-35012-before`, `/root/da-bench/w9ac/w9ac-35012-after` (the brief's command, with
`--out /root/da-bench/w9ac --work /root/da-bench/w9ac/work` so the records stay under /root/da-bench/w9ac, and
`--lean-head` pinning each side; `--compare` reads s75-547d179767-1 through a symlink at
`/root/da-bench/w9ac/s75-547d179767-1`). The PR instance (three.js#35012) is equal in both runs.

## The cause (measured, not the brief's hypothesis)

The brief's hypothesis does not hold for this id: lane B's draws do hold the literal. At n=30, seed 1 (the record's
own command), `type = "bufferx"` is drawn on 5 inputs (spec.mjs `changedTargets` already reads both versions'
comparisons), and the world search (w9l) counts 2 infected inputs: the parent hands `super.getUniformFromNode` the
name, the mutant `null`. The difference is masked **inside the callee**, by guards comparing a world answer against a
literal: `nodeData === undefined` (`cache.getData(node)`), `nodeUniform === undefined` (`nodeData.uniform`),
`this.subBuildLayers.length === 0`. The fake receiver answers a handle there. The w9l climb orders its moves by position
only: from input 14 it spent all 12 of its tries following the sub-build lookup's handles
(`this.globalCache.getData()#2.any.subBuilds...`), and never set `getData()#1` or `.uniform` absent. From input 10 it was
one move short when the input bound (30) ran out. At n=120 the same search finds it (from input 67, in two moves).

## What landed

1. **Guided world moves** (`exec/compared.mjs` new; `exec/search.mjs worldMoves`; `exec/run.mjs` records the
   statement frames a call set and builds a run's guide; `exec/fake.mjs` answers a `lit:<json>` kind). Per loaded file
   (both versions, every callee's file), the reads a function compares against a literal: a member, `a['k']`, a call
   (`m()`), a local holding one, a length, a switch's cases, `typeof x === 'undefined'`, loose null. The functions a
   run entered (its frames' sites) give the guide. An answered world path whose last member the guide names is set to
   that literal first (after the kept moves, in the climb's own order), and kept while the run stays infected, even
   when it goes no further. Its path is never moved again, and the bounds are unchanged.
   `LEAN_BREAK=w9ac-compare-literals`.
2. **A callee in another local file, for the draws** (`exec/usage.mjs declaredFn`). The draw-domain half of the brief,
   checked on probes. A parameter's literals in the unit, in a same-file callee, and through a property path were
   already drawn. A callee imported from another file of the package was not (0 of 30 draws named its literals:
   PASS-bounded). A callee the checker resolves to a local source file is now read like a same-file one: a named or
   default import, a namespace member, or a base method through `super`. Never a declaration file or a package's.
   `LEAN_BREAK=w9ac-callee-files`.
3. **Falsy last, unmask first** (`run.mjs infectionOf`, `search.mjs searchWorld`, `changesOf` marks `fromFalsy`).
   Reading the base through `super` (item 2) shapes `name` by the base's `name || ...`. The one infected draw then
   hands `''` against `null`, a difference a truth test erases. An infection whose every differing pair is falsy on
   both sides waits. Its leaves holding a falsy primitive are first set to truthy values (within the infection's half
   of the budget), and a run whose infection is no longer falsy is climbed. On the id: `name` set to `"bufferx"`
   (1 try), then the guided climb (10 tries). `LEAN_BREAK=w9ac-falsy-last`.

No part reads the truth, the mutation or a bench file. Every choice is syntax, the run's own frames and values, or the
seeded draw, the same on both sides.

## Validators (verbatim)

Pairs on 14b167a8e0 (a scratch worktree at 14b167a8e0 with the pair folders copied in), then on this branch:

```
# 14b167a8e0
| pair | world_guard_path | lane B Fallback.uniformOf WITNESS | FAIL |             | PASS-bounded
| TOTAL | 1 checks | 1 FAILED |
| pair | callee_file_literals | lane B price WITNESS              | FAIL |             | PASS-bounded
| pair | callee_file_literals | lane B priceOf WITNESS            | FAIL |             | PASS-bounded
| pair | callee_file_literals | lane B priceRefactor PASS-bounded | PASS |             | PASS-bounded
| TOTAL | 3 checks | 2 FAILED |
| pair | world_guard_literal | lane B Fallback.uniformOf WITNESS | PASS |             | WITNESS
| TOTAL | 1 checks | ALL PASS |
# after
| pair | world_guard_path | lane B Fallback.uniformOf WITNESS | PASS |             | WITNESS
| TOTAL | 1 checks | ALL PASS |
| pair | callee_file_literals | lane B price WITNESS              | PASS |             | WITNESS
| pair | callee_file_literals | lane B priceOf WITNESS            | PASS |             | WITNESS
| pair | callee_file_literals | lane B priceRefactor PASS-bounded | PASS |             | PASS-bounded
| TOTAL | 3 checks | ALL PASS |
| pair | world_guard_literal | lane B Fallback.uniformOf WITNESS | PASS |             | WITNESS
| TOTAL | 1 checks | ALL PASS |
```

- **The property-path pair** is `world_guard_path` (`node.kind === "buffer"` against `"bufferx"`, the label read off
  the node). **The plain-parameter pair** is `world_guard_literal` (`type === "buffer"` against `"bufferx"`, the
  three.js signature). **It is green on 14b167a8e0 too:** with that pair's seeded answers, w9l's position order
  reaches the absent record within the bound. I did not tune names or seeds to make it red. It stays as the shape's
  regression pair. The red plain-parameter pair is `callee_file_literals`/`price` (`tier` compared in an imported
  callee). Its `priceOf` is the property-path case of the draw mechanism (`order.tier`). The literals there are the
  same in both versions. The case of a literal that differs between the versions is the one `changedTargets` already
  drew.
- Breaks (`tests/lib-break.mjs`):

```
| world_guard_path | Fallback.uniformOf | LEAN_BREAK=w9ac-compare-literals,w9ac-falsy-last | WITNESS -> PASS-bounded | PASS |
lib-break: 1 rows, 0 failed
| callee_file_literals | price | LEAN_BREAK=w9ac-callee-files | WITNESS -> PASS-bounded | PASS |
| callee_file_literals | priceOf | LEAN_BREAK=w9ac-callee-files | WITNESS -> PASS-bounded | PASS |
lib-break: 2 rows, 0 failed
```

  `world_guard_path` is reached by each of two mechanisms alone (guided: 20 tries; falsy-last: 19). It is
  PASS-bounded only with both off, so its row names both (the convention in tests/break.mjs). Each mechanism alone is
  pinned by the harness test:

```
$ node tests/w9ac-compare-literals.mjs
w9ac-compare-literals: 22 checks pass
exit 0
$ node tests/w9ac-compare-literals.mjs --break
AssertionError [ERR_ASSERTION]: the guard's read set absent first, kept though the fault behind it stops the run, then the fault taken back (no change left, [{"from":0,"changes":[],"world":["this.cache = fake","this.cache.get()#1.any = fake","this.cache.get()#
exit 1
LEAN_BREAK=w9ac-callee-files: AssertionError [ERR_ASSERTION]: a named import: its switch case and its comparison ([])   exit 1
LEAN_BREAK=w9ac-falsy-last:   AssertionError [ERR_ASSERTION]: the falsy draw waits, a falsy leaf set truthy infects it for good, then one move (no change left, null, null)   exit 1
$ node tests/w9l-bounded-and-moves.mjs
w9l-bounded-and-moves: 26 checks pass
exit 0
$ node tests/opaque-unit.mjs --break
FAIL step line var (wld, retb, u) := ext_block_x(wld, u);
FAIL step signature {"id":"block_x","ins":["World","U"],"out":"(World, Option<int>, U)"}
exit 1
```

- **Regression pairs**, each alone, `--jobs 1`, on c81c72e847: 141 runs (the search, sites and world family; the
  declared/draw family; all 77 `opaque_*` pairs; the three new pairs). 138 ALL PASS, 3 fail:

```
opaque_copied_argument exit 1 secs 11.626039836 | TOTAL | 1 checks | 1 FAILED |
opaque_for_in exit 1 secs 13.103238680 | TOTAL | 15 checks | 1 FAILED |
opaque_read_after_call exit 1 secs 24.741025661 | TOTAL | 28 checks | 1 FAILED |
```

  Each fails identically on 14b167a8e0 (same row, same detail):

```
opaque_copied_argument exit 1 secs 3.663507659 | TOTAL | 1 checks | 1 FAILED |       (theorem: refused: the parent input ... parent.dfy does not exist)
opaque_for_in exit 1 secs 15.792902349 | TOTAL | 15 checks | 1 FAILED |               (break opaque-drop-read: not proved under LEAN_BREAK=opaque-drop-read)
opaque_read_after_call exit 1 secs 22.755407449 | TOTAL | 28 checks | 1 FAILED |      (break handle-write: not proved under LEAN_BREAK=handle-write)
```

  All three are lane A rows, and this lane changes lane B only. The brief's "12 opaque-family pairs with 2 known
  failures" are not named anywhere I could find. I asked on the channel and had no answer, so I ran every `opaque_*`
  pair. The full per-pair list is in `lane/w9ac-compare-literals/regress-after.txt`.
- **Time per unit**. The same 20 lane B pairs (search, sites and world families, and the new pairs) were run on both
  trees, interleaved pair by pair, `LEAN_STEP_CACHE=0`, measured as the CPU time of the run and its children. Per lane
  B unit (49): **1.19 s on 14b167a8e0, 1.22 s after (1.02x)**. Total wall: 231.6 s against 264.4 s (1.14x); the raw lines are in `lane/w9ac-compare-literals/cpu-time.txt`. A first
  wall-clock sweep under a machine load of about 100 read 6.16 s against 12.27 s per unit. Its outlier
  (world_read_after_call, 55 s against 284 s) re-ran at 76 s against 56 s once the load fell, so wall clock was not
  used.

## What is open

- `world_guard_literal` is not red on 14b167a8e0 (above). The mechanism's red checks are `world_guard_path`,
  `callee_file_literals`, and the harness test's synthetic parts 3 and 6.
- The guided move matches a world path by its last member only (`a.b.uniform` reads `uniform`). A computed key
  (`nodeData[shaderStage]`) gives no row. A literal compared through a deeper alias (two locals away) gives none either.
- Unmask shares the infection's half of the budget with the tier-0 infection and goes first. A unit with many falsy
  draws may spend that half on unmasking.
- The `usage.mjs` callee reading stays one level down, as for same-file callees.
- The commit attribution follows the brief (`Claude Fable 5.1`). This lane was run by Claude Opus 5.5.
