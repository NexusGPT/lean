# w9v-merge-w9l-w9u: w9l and w9u merged into lean-head lead-v4

Start: `lead-v4` e1aca32fe2. Merges on `lane/w9v-merge-w9l-w9u`, in order:

- 1bd9ede4f5 Merge `lane/w9l-bounded-and-moves` (976cbedbfa)
- dfea3aa15a Merge `lane/w9u-unit-runs` (ab9145d7d7): **the commit to fast-forward lead-v4 to** (this result file's
  commit sits on top of it)

Nothing was pushed, and lead-v4 was not moved.

## Conflicts and their resolutions

| file | conflict | resolution |
|---|---|---|
| `langs/ts/exec/run.mjs` compileWithSites | head: `intrinsicPrologue(emit([...]), shadowed, globalName)` (w9j emit-intrinsics); w9l: the emit gains `valueMarks` and branch marks are only added when `probe?.table` | both kept: the head's prologue wraps the emit that carries w9l's `probe?.table` branchMarks and `probe?.values` valueMarks |
| `langs/ts/exec/run.mjs` runPairOnce | head: `sharedFreeReads` / `freeThrown` (w9j free-global-call) before `mountSides`; w9l: `mountSides(i, recipe, world)` | both kept: the head's two lines, then mountSides with w9l's `world` parameter |
| `langs/ts/exec/run.mjs` imports (auto-merged, but would not parse) | w9l added `import { broken } from '../break.mjs'`, but the head already imports it at line 23 (`SyntaxError: Identifier 'broken' has already been declared`) | w9l's duplicate import removed |
| `langs/ts/tests/break.mjs` | the registry: the head's rows (w8c, w8d, w1e, w9j, w9q, w1d) against w9l's three | every row of both sides kept; w9u's two rows (`jsdoc-unnamed-param`, `w9u-units-lint`) merged with no conflict |
| `langs/ts/pr.mjs` | none: w9u was cut from e1aca32fe2, so its `listed` filter in `changedUnits` already sits on w9f's `w9f-lint-routed` keep and `w9f-lint-once` | taken as w9u wrote it; w9f's gate 7/7 below |

I checked that every identifier w9l's world search calls in run.mjs still exists on the head (`unloadableOnly`,
`drawnOf`, `firstDifference`, `observeBoth`, `sawJsx`, `unitSecondsValue`, `env.answered`, `env.worldSet`).
`node --check` passes on every exec/ and ci/ file.

## Validators (on dfea3aa15a)

Environment: `LC_ALL=en_US.UTF-8 LEAN_Z3=/opt/dafny/z3/bin/z3-4.12.1 LEAN_CONFORMANCE=full LEAN_WORKER_HEAP_MB=6144`,
every run under `nice -n 15`. The suite ran at `JOBS=2`, not the brief's `--jobs 4`: the owner's rule is "every other run
at `--jobs 2` or less under `nice 15`", and that rule binds. Free RAM was 66 GB available at the start. No bench run.

Pairs: `LEAN_PAIRS=opaque_dynamic-key,opaque_exception-return,opaque_optional-chain,opaque_unsupported-call,opaque_unsupported-syntax,type_assertions,w9q_regex_literal_brace,w9j_relative_unloadable,w9j_emit_intrinsics,w9j_free_global,w9j_free_global_call,world_masked,world_masked_infect,w9u_jsdoc_function_type JOBS=2 node tests/run.mjs` (exit 0):

    | PROOF-HUNT TOTAL | 36 units read by both lanes | NO HIDDEN FALSE PROOF | 0 exempt by a door (adapter, NaN or infinity on a unit with no number operation) |
    | TEXT-ONLY WITNESS TOTAL | 83 witnesses read | NONE RESTS ON FUNCTION TEXT |
    | MODEL-CONFORMANCE TOTAL | 42 units in 6 pairs (8 skipped) | 4 executable: 4 agree, 0 disagree | 38 not executable, 0 outside domain, 0 not bridged, 0 model error, 0 skipped | 0 coupling finding(s) (0 sampled) | NO NEW FINDING |
    | SELF-PAIR TOTAL | 66 units | NO WITNESS | {"PASS-bounded":66} | sample not supplied | 1 no-parent exclusions |
    | TOTAL | 989 checks | ALL PASS |

Lane tests (green) and breaks (red):

| command | exit | line |
|---|---|---|
| `node tests/w9l-bounded-and-moves.mjs` | 0 | `w9l-bounded-and-moves: 26 checks pass` |
| `node tests/w9l-bounded-and-moves.mjs --break` | 1 | `AssertionError [ERR_ASSERTION]: world_masked: WITNESS from the world search, replayed (PASS-bounded, null; null)` |
| `LEAN_BREAK=w9l-bounds node tests/w9l-bounded-and-moves.mjs` | 1 | `AssertionError [ERR_ASSERTION]: world_masked: WITNESS from the world search, replayed (PASS-bounded, null; null)` |
| `LEAN_BREAK=w9l-moves node tests/w9l-bounded-and-moves.mjs` | 1 | `AssertionError [ERR_ASSERTION]: an added and a deleted file holding the same function pair as a move ([["A","src/hooks/useDebounce.ts","src/hooks/useDebounce.ts"],["D","src/utils/debounce.jsx","src/utils/debounce.jsx"]])` |
| `LEAN_BREAK=w9l-typed node tests/w9l-bounded-and-moves.mjs` | 1 | `AssertionError [ERR_ASSERTION]: type_tests hasKey: no witness from a change that leaves the declared type (WITNESS, {"source":"world","from":5,"changes":["arg0.kind set \"a\""],"world":[]})` |
| `node tests/w9u-unit-runs.mjs` | 0 | `ok   pair w9u_jsdoc_function_type: 2 checks, 0 failed` / `ok   changedUnits --units lints the listed units only: spans linted 1 (want 1), ...` / `every check green` |
| `node tests/w9u-unit-runs.mjs --break` (jsdoc-unnamed-param, w9u-units-lint) | 0 | `\| pair \| w9u_jsdoc_function_type \| pr index.js doubled PASS-proved checked \| FAIL \| \| PASS-bounded \| refused:translator-crash \| the translator stopped: Cannot read properties of undefined (reading 'kind')` / `ok   changedUnits --units lints the listed units only (LEAN_BREAK=w9u-units-lint): spans linted 3 (want 1), ...` / `every break turns its check red` |
| `node tests/w9f-n8n-gate.mjs` | 0 | `w9f-n8n-gate: 7/7; --break w9f-typed-reuse reuse red; --break w9f-typed-first first red; --break w9f-lint-routed lint-routed red; --break w9f-lint-once lint-once red` |
| `node tests/w9j-parent-load.mjs` | 0 | `every pair green` |
| `node tests/w9j-parent-load.mjs --break` (relative-unloadable among them) | 0 | `ok   w9j_relative_unloadable (LEAN_BREAK=relative-unloadable): 3 checks, 2 failed` / `every break turns its pair red` |
| `node tests/w9q-parent-load-rest.mjs` | 0 | `ok   w9q_regex_literal_brace: 2 checks, 0 failed` / `every pair green` |
| `node tests/w9q-parent-load-rest.mjs --break` | 0 | `ok   w9q_regex_literal_brace (LEAN_BREAK=regex-literal-brace): 2 checks, 1 failed` / `every break turns its pair red` |
| `node tests/mutants-fixture.mjs` | 0 | `mutants fixture: 83 sites of 15 units, 19 kinds, every one planted and caught (lane B)` |
| `node tests/opaque-unit.mjs --break` | 1 | `FAIL step line var (wld, retb, u) := ext_block_x(wld, u);` / `FAIL step signature {"id":"block_x","ins":["World","U"],"out":"(World, Option<int>, U)"}` |

The `--break` harnesses of w9u, w9j and w9q exit 0 when every break turns its check red; the reds are the lines quoted.
Each break's line matches the red line in its own lane's result file.

## Measured impact

This lane is a merge, so it has no number of its own. The impact claimed is the two lanes' own (see their result
files). The merge keeps each lane's checks green and each break red on the merged head. No bench run, as the brief asks.

## Open

- The full suite (not only the 14 named pairs) has not run on the merged head. The lead's gate decides.
- `--jobs 4` was not used (see above).
