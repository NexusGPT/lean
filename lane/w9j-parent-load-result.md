# Lane w9j-parent-load: the parent modules that fail to load in the fake world

Branch `lane/w9j-parent-load` from `lead-v4` 0b260f05. No model in any path: every verdict below is lean's (`check.mjs`,
`pr.mjs` through DA's `bench/hour.py`). The 44 AACR instances were never read (`/root/da-calib/checkouts/44` untouched).
Checkouts of my own (one per PR, at the PR head, blobless) under `/root/da-bench/w9j-parent-load/ck`; every output below
under `/root/da-bench/w9j-parent-load/{out,hour}`.

## The 9 and their classes

Reproduced with lean's own run on the parent (`lane/w9j/unit.sh <id> <tree> <out>`: check.mjs on the mutated unit, the
parent the file at the merge base, the candidate the PR head's file with the mutant's patch), on 0b260f05:

    facebook__react#37104~m1 w9j-parent-load/before exit=0 verdict=ASK | B ASK None parent: load failed: This module must be shimmed by a specific renderer.
    facebook__react#35731~m1 w9j-parent-load/before exit=0 verdict=ASK | B ASK None parent: load failed: statement markers changed the function count
    nodejs__node#66159~m1 (before) verdict=ASK, certificate.lanes.B.reason "parent: load failed: Cannot access 'Object' before initialization"

Each fix uncovered the next failure on the same parent; the classes are the layers in the order they were met:

| ids | layer | what fails | class | mechanism (`LEAN_BREAK` name) |
|---|---|---|---|---|
| react#37104 m1 m2 m3 | 1 | `ReactFiberConfig.js` (reached through relative imports of `ReactChildFiber.js`) is a build-time fork: its top level is `throw new Error('This module must be shimmed by a specific renderer.')` | a module whose top level throws, through a relative import | `relative-unloadable` |
| react#37104 m1 m2 m3 | 2 | `ReactChildFiber.js`'s own top level: `if (__DEV__) {` (line 139): `__DEV__ is not defined` | a side effect at import: a free name the bundler defines | `free-global` |
| react#35731 m1 m2 m3 | 1 | `export * from './ReactFlightDOMClientEdge'`: a Flow file (`createServerReference<A: Iterable<any>, T>(`); TypeScript's error recovery emits it with another function count | a Flow file read as TypeScript, through a relative import | `relative-unloadable` |
| react#35731 m1 m2 m3 | 2 | the unit `createFromNodeStream` reads `__DEV__` on its first line; both sides threw the same ReferenceError on every input (PASS-bounded, every mutation behind it unreached) | a free name the bundler defines, read at the call | `free-global-call` |
| node#66159 m1 m2 m3 | 1 | TypeScript's CommonJS emit opens with `Object.defineProperty(exports, "__esModule", ...)`; `inspect.js` binds `Object` at module scope (`const { ..., Object, ... } = primordials`, line 63): the emit's first line read it in its dead zone | lean's emit reads an intrinsic the file shadows | `emit-intrinsics` |
| node#66159 m1 m2 m3 | 2 | `primordials`, `internalBinding` (and `getInternalBinding`): node's own host globals, `primordials is not defined` | an import the fake world cannot resolve: a host's global | `free-global` |

## What landed (exec/run.mjs; commit 2d3cdc1e)

1. **relative-unloadable.** A relative import of the package whose load fails is the environment's module, as an aliased
   one already was (the alias fallback, now one function `loadOrEnvironment` for both): the same fake on both sides, its
   reads recorded, the failure recorded in `env.unloadable`, so `unloadableOnly` keeps a difference that passes only
   through it an ASK naming the module, never a WITNESS. Covers the throwing fork and the Flow import alike.
2. **emit-intrinsics** (`intrinsicPrologue`). When the file binds an ECMAScript global's name at module scope (variable,
   function, class, enum, import), the emit's own prologue (the directive, TypeScript's `var __x = (this && this.__x) ||`
   helpers, the `__esModule` line, `exports.a = void 0`) reads that name from the global object (a wrapper parameter);
   lean's appended state shim does the same for `Object`. The file's own code is unchanged.
3. **free-global** (`loadDefining`). A ReferenceError `X is not defined` at a module's evaluation, X a name no default lib
   declares and the bridge's deny list does not hold (`isBridgeName`): wherever the module loads its host set X, so X is
   the environment's fake `global:X` (`env.fake`, the fake of an unresolved package import), and the module is evaluated
   again from its start. First tried as the bridge fake: its after-turn callbacks chained without end over node's
   `primordials` (the 20000-operation budget), so the plain recording fake it is.
4. **free-global-call** (`sharedFreeReads`, runPair). A call that throws `X is not defined` for a name **both** versions of
   the unit's file read with no declaration (an ambient `declare const` counts as none) meets a name its host sets: X is
   set as the environment's fake from then on and the input runs again. A name only one version reads (a typo the
   candidate adds, or one the PR fixes) keeps its ReferenceError, so that witness stays; a `typeof X` guard is unchanged
   (X is set only after a read threw).

Not landed: a Flow type stripper. The 9 do not need it (the Flow file is an import, and the fallback lets the unit run);
without a measured case it would be unmeasured code. Open below.

## Validators

The fixture pairs, one per class (`tests/pairs/w9j_*`, `tests/w9j-parent-load.mjs`), green on the tree:

    ok   w9j_relative_unloadable: 3 checks, 0 failed
    ok   w9j_emit_intrinsics: 2 checks, 0 failed
    ok   w9j_free_global: 2 checks, 0 failed
    ok   w9j_free_global_call: 4 checks, 0 failed
    every pair green

Red first: each under its break (`--break`):

    ok   w9j_relative_unloadable (LEAN_BREAK=relative-unloadable): 3 checks, 2 failed
    ok   w9j_emit_intrinsics (LEAN_BREAK=emit-intrinsics): 2 checks, 2 failed
    ok   w9j_free_global (LEAN_BREAK=free-global): 2 checks, 2 failed
    ok   w9j_free_global_call (LEAN_BREAK=free-global-call): 4 checks, 1 failed
    every break turns its pair red

and the same four pairs on the 0b260f05 code (a scratch copy of it with only the pairs and their test added):

    FAIL w9j_relative_unloadable: 3 checks, 2 failed
    FAIL w9j_emit_intrinsics: 2 checks, 2 failed
    FAIL w9j_free_global: 2 checks, 2 failed
    FAIL w9j_free_global_call: 4 checks, 1 failed
    4 run(s) wrong

The sample pairs (`lane/w9j/sample30.txt`: the 30 pair names lowest by sha256, plus 15 pairs whose text names a
ReferenceError, an undeclared or platform global or a load failure, `bench_drops` (the alias fallback) among them:
`lane/w9j/regression-pairs.txt`, 45), `LEAN_PAIRS=... tests/run.mjs` on 0b260f05 and on 2d3cdc1e:

    before-wt     | TOTAL | 1483 checks | 1 FAILED |
    snap-2d3cdc1e | TOTAL | 1483 checks | 1 FAILED |

The one failure is the same on both and is mine, not lean's: the list file began with a count line, so the name
`392\nheap_3` made `self-pair` throw (`unknown LEAN_PAIRS name`) and kept `heap_3` out. Both rerun alone:

    before-wt heap_3     | TOTAL | 23 checks | ALL PASS |
    snap-2d3cdc1e heap_3 | TOTAL | 23 checks | ALL PASS |
    before-wt     | SELF-PAIR TOTAL | 315 units | NO WITNESS | {"PASS-bounded":310,"PASS-decided":2,"REFUSE":2,"ASK":1} | sample not supplied | 1 no-parent exclusions |
    snap-2d3cdc1e | SELF-PAIR TOTAL | 326 units | NO WITNESS | {"PASS-bounded":321,"PASS-decided":2,"REFUSE":2,"ASK":1} | sample not supplied | 1 no-parent exclusions |

(the 11 more units are the w9j pairs', all PASS-bounded against themselves).

Per unit on 2d3cdc1e (`unit.sh`, load about 70):

    facebook__react#35731~m1 w9j-parent-load/tree exit=0 verdict=WITNESS | B WITNESS None None
    facebook__react#35731~m2 w9j-parent-load/tree exit=0 verdict=WITNESS | B WITNESS None None
    facebook__react#35731~m3 w9j-parent-load/tree exit=0 verdict=WITNESS | B WITNESS None None
    facebook__react#37104~m1 w9j-parent-load/tree exit=0 verdict=WITNESS | B WITNESS None None
    facebook__react#37104~m2 w9j-parent-load/tree exit=0 verdict=WITNESS | B WITNESS None None
    facebook__react#37104~m3 w9j-parent-load/tree exit=0 verdict=WITNESS | B WITNESS None None
    nodejs__node#66159~m1 w9j-parent-load/tree exit=0 verdict=WITNESS | B WITNESS None None
    nodejs__node#66159~m2 w9j-parent-load/tree exit=0 verdict=WITNESS | B WITNESS None None
    nodejs__node#66159~m3 w9j-parent-load/tree exit=0 verdict=ASK | B ASK None spin-bound: lane B passed its CPU-time bound of 120 s per unit (--unit-seconds) after 146 s of wall time and 121 s of CPU time; the worker was killed at lane B (input 12)

The witnesses read: react#37104~m1 differs in module state (`thenableIndexCounter` advances by 2, not 1); node#66159~m1:
the swapped `getStackString(err, ctx)` throws, so the candidate returns from the `catch` (`return
ObjectPrototypeToString(err);`, line 1937) where the parent returns `stack` (line 2041): the mutation's own effect.
Controls (the PR head without the mutation against the merge base): react#35731 WITNESS (the PR's own change already
separates this unit, so DA may not count its mutants as new comments), react#37104 and node#66159 ASK (spin-bound, no
witness in 28 and 11 inputs).

## The measured number

The hour bench on the 9 (`--cap 5 --jobs 4 --lean-timeout 600 --load-max 64`: the brief's `--jobs 9 --load-max 120`
lowered to the load rules; records under `/root/da-bench/w9j-parent-load/hour`):

    0b260f050d M rendered 0 of 9 (0.0 %), record 0 of 9, completed 3 of 9, wall 20.9 min
    2d3cdc1e55 M rendered 5 of 9 (55.6 %), record 5 of 9, completed 3 of 9, wall 26.2 min

By name (record = a WITNESS row of the mutated unit in the record, `score.witness_on`; rendered = `matched`):

| id | before record / rendered | after record / rendered | after: the lean row |
|---|---|---|---|
| react#35731~m1 | no / 0 | no / 0 | no row: pr.mjs stopped at its time budget, 0 of 1 units reached (both trees) |
| react#35731~m2 | no / 0 | no / 0 | same |
| react#35731~m3 | no / 0 | no / 0 | same |
| react#37104~m1 | no / 0 | **yes / 1** | WITNESS (before: ASK parent: load failed: This module must be shimmed...) |
| react#37104~m2 | no / 0 | **yes / 1** | WITNESS |
| react#37104~m3 | no / 0 | **yes / 1** | WITNESS |
| node#66159~m1 | no / 0 | **yes / 1** | WITNESS (before: ASK parent: load failed: Cannot access 'Object' before initialization) |
| node#66159~m2 | no / 0 | **yes / 1** | WITNESS |
| node#66159~m3 | no / 0 | no / 0 | ASK spin-bound: lane B's 120 s CPU bound (load peaked at 107) |

Determinism: run.py a against b 12 of 12 byte-equal on both runs.

The 75 (`--cap 5 --jobs 4 --lean-timeout 600 --load-max 64`, on 2d3cdc1e; the before is the newest full run on
0b260f05, `/root/da-bench/hour/v4-0b260f05-1`, jobs 24, cap 600):

    0b260f050d M rendered 14 of 75 (18.7 %), record 21 of 75, completed 55 of 75, wall 45.9 min
    2d3cdc1e55 M rendered 22 of 75 (29.3 %), record 38 of 75, completed 0 of 75, wall 166.5 min

determinism 98 of 98 byte-equal; ledger "record 38, rendered 22 of 75; equal to the table"; highest load 228.1 (the
machine's, other lanes running), which is why "completed" is 0 (the oracles failed under it on 19 parents; the record
level reads lean alone).

Per id, every mutant whose record or rendered changed (the record read as `score.witness_on` from each run's own
records):

- **No mutant lost its record witness or its rendered comment.**
- Gained by this lane, 5: react#37104 m1 m2 m3, node#66159 m1 m2: before `ASK parent: load failed: This module must be
  shimmed...` / `Cannot access 'Object' before initialization`, after WITNESS and rendered (1 each).
- Gained without a lean row before, 12, not this lane's: gemini-cli#26534 m1 m2 m3 and typescript-go#3834 c1 m1 m2 m3
  (before: pr.mjs stopped before the unit, `stop at unit 1 of 1`), n8n#41875 c1 m1 m2 m3 (before: `timeout`, `crash`),
  three.js#35012~m1 (before: checkout failed). Those rows were never a load failure; they reached their unit in this run
  under other scheduling (jobs 4 against 24). Rendered on them: +1 (typescript-go#3834~m2), +1 (three.js#35012~m1).
- Rendered without a record change: Checkmate#3185~m1 0 -> 1 (oracle cap 5 s here, 600 s before).

So the lane's own measured gain on the 75 is record +5 and rendered +5 (the 9's), with no regression; the other +12
record and +3 rendered are the run's conditions. A 0b260f05 run with this run's parameters would separate them by
measurement rather than by reading the rows: not made (2.8 h at jobs 4).

## Open

- react#35731 ×3: no load failure is left (per unit all three WITNESS), but pr.mjs spends its whole 300 s budget
  (405 s of CPU) preparing the PR's ten changed files, `ReactFlightClient.js` among them, before its first unit: the
  time-budget class (a budget counted from the first unit, or w7a's `--units` reaching the unit first), not this lane's.
  Its control is WITNESS too, so even reached, DA may read those mutants' comments as the PR's own.
- node#66159~m3: lane B's CPU bound at load about 100: every primordial is a recorded fake, so each input costs.
- A Flow file that is the unit's own file and miscompiles stays a load failure (the Flow stripper is not built: no
  measured case among the 75).
- A free name read at a call inside another module (not the unit's file) keeps its ReferenceError: `sharedFreeReads`
  reads the two versions of the unit's file only.
- A lib-declared host name read bare at load (`document` in a node run) stays the failure, by the bridge design's rule.
- Commits carry `Co-Authored-By: Claude Fable 5.1` as the brief asks; this lane ran on Claude Opus 5.5.
