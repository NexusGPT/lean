# w9ac: the literals a body compares against, in the world search and in the draws (2026-11-03)

The miss: three.js#35012~m3, `GLSLNodeBuilder.getUniformFromNode`, PASS-bounded ("no difference within the bounds"),
lane A refused (`ts-strict`). The edit changes `type === 'buffer' ? null : name` to `type === "bufferx" ? null : name`
in the argument the unit hands `super.getUniformFromNode`.

## What the run shows (read, not assumed)

The brief's hypothesis, that lane B never draws the compared literal, does not hold for this id. At n=30, seed 1
(`check.mjs`, the record's own command) the draws give `type = "bufferx"` on 5 inputs (the changed-path tier,
spec.mjs `changedTargets`, reads both versions' comparisons), and the world search (w9l) counts the change as infecting
on 2 inputs (input 14 by the draws, input 10 by a leaf change): the parent hands `super` the name, the mutant `null`.

The difference dies in the callee. `NodeBuilder.getUniformFromNode` reads the name only where
`getDataFromNode(...)` finds no record (`nodeData === undefined` on `cache.getData(node)`) and the record no uniform
(`nodeUniform === undefined` on `nodeData.uniform`), past `this.subBuildLayers.length === 0` and a sub-build lookup.
The receiver is a fake and its world answers a handle at those reads. The w9l climb orders its moves by position only
(after a throw, the latest answer first), and every read of a handle in the sub-build lookup "goes further" (more
statements, more answers), so the climb from input 14 spent its 12 tries there (`this.globalCache.getData()#2.any...`)
and never set `getData()#1` or `.uniform` absent. The climb from input 10 was one move short when the input bound (30)
ran out. At n=120 the same search finds the witness (from input 67, in two moves). The trace of every try is in the
lane's result file.

## The mechanism: guided world moves (exec/compared.mjs, exec/search.mjs `worldMoves`)

- **The table** (`comparedTable`, per loaded file, read once when a world search first asks): every `===`, `!==`, `==`,
  `!=`, `typeof x === 'undefined'` and switch case whose one side is a literal (undefined, `void 0`, null, a number, a
  string, true, false) and whose other side is a read: a member `a.k` (key `k`), `a['k']`, a call `a.m(...)` or
  `m(...)` (key `m()`), or a local whose declaration or assignment in the same function holds such a read. Loose
  equality with null or undefined gives both. Each row carries the line range of its innermost function. A parameter
  compared with a literal is no world read and gives no row (the draws own it).
- **The guide of a run** (`guideOf`, run.mjs `guideRunOf`): the statement frames the call set on either side
  (patch.mjs statementMarks: a frame's site is a statement of its own function) name the functions it entered, on
  both versions' files and every callee's; the guide is the union of their rows, key to literal kinds.
- **The moves** (`worldMoves`): after the moves a climb kept before (unchanged, first), every answered path whose last
  member (`pathKey`: `a.b.uniform` reads `uniform`, `a.getData()#1` reads `getData()`) the guide names is set to each
  literal it is compared against, in the climb's own position order; then the order's other moves as before. A literal
  outside the world's menu is a `lit:<json>` kind (fake.mjs `answer`).
- **Acceptance.** A guided move takes the branch a guard names, so the run it gives is kept while it stays infected even
  when it goes no further: what the branch meets next (a seeded fault of `setData`, an absent member) is for the next
  moves to take back. Its path, once set, is never moved again in that climb, so a climb cannot cycle; the bounds
  (`perStart` 12, the input bound n, the wall share) are unchanged.

Determinism: the table is syntax, the guide a function of the run's frames, the order the climb's; both sides run under
one world recipe as before. `LEAN_BREAK=w9ac-compare-literals` removes the guided moves (the climb is w9l's).

## A difference a truth test erases: falsy last, unmask first (run.mjs infectionOf, search.mjs searchWorld)

With the callee read for the draws (below), the draw of `name` follows the base's `name || ('nodeUniform' + index)`
truth test, and the one draw that infects at n=30 (input 14) hands `''` on the parent and `null` on the mutant. The
values differ, so the w9l search counted it infected and climbed it, but `'' || x` and `null || x` are one value: no
world propagates it, and the climb spent the budget. The rule:

- **Falsy.** An infection whose every differing value pair is falsy on both sides (`null`, `undefined`, `''`, `0`,
  `-0`, `NaN`, `false`, `0n`, as `seenValue` writes them) is `falsy`. Such a draw is not climbed while another start
  remains; a draw a leaf change infects that way waits too.
- **Unmask.** When the queue is empty, each waiting draw's leaf changes that replace a falsy primitive (`changesOf`
  marks them `fromFalsy`) with a truthy value its declared type admits are run, by tier, within the infection's half of
  the budget (shared with the tier-0 infection). A run whose infection is no longer falsy is climbed. Then the tier-0
  infection as before; then the waiting draws themselves.

On the id: unmask sets `name` from `''` to `"bufferx"` (one try), and the guided climb reaches the witness in ten more
(the parent registers the uniform `"bufferx"`, the mutant `nodeUniform<n>`). `LEAN_BREAK=w9ac-falsy-last` climbs the
draws in their order and never unmasks.

## The draws: a callee in another local file (exec/usage.mjs `declaredFn`)

The draw-domain half of the brief, checked: the unit's own literals (spec.mjs `strings`/`literals`), the comparisons the
versions do not share (`changedTargets`, both bodies, through `p.a.b` paths and `const` aliases), and same-file callees'
comparisons on the unit's arguments one level down (usage.mjs `into`, merged over both versions by `usageFrom`) were
already drawn. The gap: a callee in another file of the package. `price(tier, n) { return cost(tier, n + 1) }` with
`cost` imported from `./tiers` (a switch on "gold", "silver") drew no tier the table prices on 30 inputs: PASS-bounded.
`declaredFn` resolves a callee through the checker (a named or default import, a namespace member, a base method called
through `super`) to its declaration in a local source file (never a declaration file or a package's), and `into` reads
it as a same-file callee: its parameters bound to the argument chains (a parameter, a property path such as
`order.tier`), one level down, each declaration once. `LEAN_BREAK=w9ac-callee-files` reads same-file callees only.

## Checks

- `tests/w9ac-compare-literals.mjs` (`--break`: the three names; a synthetic falsy draw unmasked in part 6): the table's forms, the guide's function ranges, a
  synthetic climb in the three.js shape (guided: three tries; broken: the bound runs out in the deep handles), the pair
  `world_guard_path` through exec/run.mjs, and usage through an import, a namespace member and `super`.
- Pairs: `world_guard_path` (PASS-bounded on 14b167a8e0 and under `w9ac-compare-literals,w9ac-falsy-last`; either
  mechanism alone reaches it; WITNESS after),
  `world_guard_literal` (the same shape on a plain parameter; WITNESS on both: kept as the shape's regression pair),
  `callee_file_literals` (price and priceOf PASS-bounded on 14b167a8e0 and under `w9ac-callee-files`, WITNESS after;
  priceRefactor PASS-bounded).
