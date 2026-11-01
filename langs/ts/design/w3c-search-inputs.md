# The branch-guided input search (lane w3c-search-inputs, 2026-11-01)

## What

Lane B draws 30 inputs per unit from the parameter types (`exec/gen.mjs`: enumerated heaps, the project's listed
values, the boundary walk, the changed-path tier, the representation and world tiers). When those 30 agree, lane B
answered PASS-bounded even when the two sides differ on an input one leaf away from a drawn one. `exec/search.mjs`
adds a seeded local search over the same typed input space, after the ordinary draws agree:

1. **The branches of the diff.** A line diff of the two files (Myers, `changedLines`) gives the changed lines of each
   side. Every condition of the file is a branch point (`branchTable`): an `if` (T: the then-arm; F: the else-arm, or,
   when the then-arm always leaves, the statements after the `if` in its block, its control-dependent region), a
   conditional expression, a loop condition (T: the body), the left of `&&`, `||` (the right runs on T and F
   respectively) and `??` (T: the left is null or undefined), a switch clause (entered). A branch outcome of the unit is
   a target when its arm holds a changed line, or when the condition's own text changed (both outcomes).
2. **Reached.** With the search on, the loader compiles the two files of the pair with a probe around each condition
   (`branchMarks`: `state.b(file, k, value)` returns the value unchanged; a switch clause starts with
   `state.b(file, k, true)`). The probe adds no function, so the loader's function-text keys are unchanged; it runs
   after the loader's other transforms, which read original positions. Each side's environment collects the outcomes
   of its call (not of its load).
3. **The search.** A changed input is a recipe: the draw it starts from and a list of leaf changes. Both sides draw
   input `from` on fresh environments as every draw does, then apply the changes, so both start from the same value and
   a replay rebuilds it. The changes of an input (`changesOf`), walked with the declared types (references, unions,
   records, arrays, tuples, dictionaries) and kept only where `spec.mjs fits` admits the new value:
   - tier 1: a string leaf to each string literal of the unit's text (both versions); a number leaf to each number
     literal; a literal-typed leaf to each member; a boolean flipped; a dictionary given a key that is a string literal;
   - tier 2: the type's boundaries: `''`; 0, -0, 1, -1, the largest and smallest safe integers and the values just off
     each (2^53, -(2^53)), the largest and smallest magnitudes; `null` or `undefined` where the type admits it; an
     optional field or a dictionary key removed;
   - tier 3: neighbours: a number by one, a literal by one, a string literal upper-cased, lower-cased, padded, with one
     character more or less;
   - tier 4: a list with one element more (its last copied, or a value of its element type when empty) or less.
   A change on a leaf the recipe already changed replaces that change. Entries are explored from a stack: the drawn
   inputs ordered by the target branches they reached (most first, then by index), and an input that reaches a target
   branch not reached before goes on top, so the next changes start from it. Within an entry the changes go by tier,
   then by leaf, the leaf order rotated by the seed.
4. **Stop.** Every target branch reached; no entry has a change left; the input bound (the run's `--n`, the same
   budget the draws have); the wall bound (a quarter of the unit's `--unit-seconds`, so the search never pushes a unit
   to its kill bound). The summary names the bound that stopped it.
5. **A divergence.** The tried input runs both sides exactly as a draw does (the same observation, the same filters:
   a harness stop or an impure render is skipped; a difference only through an undriven callback or an unloadable
   module is no difference). A difference is a WITNESS only after a second run of the same recipe on fresh environments
   gives byte-equal observations on both sides; otherwise it is counted `unconfirmed` and the search goes on. The witness
   carries `source: 'search'` on itself, in `where`, and its `input` is `{ source: 'search', from, changes }` (check.mjs
   copies `input` and `where` into the certificate); its `args` are the changed input as drawn, before either call; its
   record names the recipe (`record.search`). `bound.search` reports the targets, the branches the draws reached, the
   branches reached after, the inputs tried and kept, the stop, and every unreached target by side, line and condition.

The flag: `--search` / `--no-search` on `exec/run.mjs`, `LEAN_SEARCH=1` in the environment (check.mjs and pr.mjs pass
the environment to the lane B worker). The suite sets `LEAN_SEARCH=1` unless it is set (`tests/run.mjs`), and the step
cache keys every command by `LEAN_SEARCH` and `LEAN_SEARCH_BREAK` (`tests/stepcache.mjs` ANSWER_ENV), so a result with
the search is never replayed for a run without it.

## Why

The drawn inputs are good at values a comparison names directly on a parameter path (the boundary walk, the
changed-path tier) and miss a value that only matters after a computation the usage reader does not follow: a
normalisation (`trim().toUpperCase()`, `split("?")[0]`), a value past a boundary of the type behind a branch. The
search does not need to follow the computation: it reads which branches the change opened. The two pairs:

- `search_nested_literals` (`route`): 201 against 202 behind `method === "POST"` after trim and upper case, then
  `path === "/orders"` after the query is cut. PASS-bounded on 30 draws; the search sets `path` to `"/orders"`.
- `search_boundary` (`refKey`): `Number.isInteger(r.id)` against `Number.isSafeInteger(r.id)` behind a lower-cased
  kind equal to `"user"`. PASS-bounded on 30 draws, and on 200 draws under seeds 1, 2 and 3; the search sets `id` to
  2^53, the value just off the safe integers.

## Why it is sound

- **No false WITNESS.** A WITNESS from the search is two real executions of the actual JavaScript on one input,
  differing, reproduced byte for byte on fresh environments. The comparison is lane B's own (the same observation and
  the same filters as a draw).
- **The input is one lane B may draw.** Every change keeps the value inside the declared type: a set value passes
  `fits` against the leaf's declared type, an absent value is written only where the field is optional or the type
  admits `undefined`, a list keeps its element type (a copied element or an admitted value), a dictionary keeps its
  value type. The rest of the input is the draw it started from.
- **Nothing changes without the flag.** Without `LEAN_SEARCH`/`--search` no probe is compiled (`probes` is null; the
  compile cache keys on it), the draw loop records no hits, and no search runs. With it, a probe returns its value and
  observes only ToBoolean or a nullish test, which run no user code; the probes and the search write nothing the
  observation reads. The draw loop's verdicts are the same with and without the flag; the search can only add a WITNESS
  after them.
- **Deterministic from the seed.** The order of entries, changes and leaves comes from the seed and the hits, never
  the clock; the wall bound is a guard, and `bound.search.stop` names it when it fires. Two runs are byte-equal
  (tests/search-inputs.mjs).
- **Not fitted to the pairs.** The targets come from the diff and the probes; the values from the unit's own text and
  the type's boundaries; nothing reads a pair's name, expected verdict, or the AACR instances.

## Tests

`tests/search-inputs.mjs` (suite row `search-inputs`): the targets of a diff (the arms holding a changed line, the F
arm after an exiting `if`, both outcomes of a changed condition); a synthetic search where the difference needs two
changes and the first opens the branch the second needs (one kept input), the same seed giving the same search; both
pairs PASS-bounded without the search, WITNESS with it through check.mjs with `source: search` in the certificate, two
runs byte-equal, the witness replayed. `--break` (`LEAN_SEARCH_BREAK=values,keep`: no literal or boundary values, no
kept input) fails. The pairs' `search` rows in `tests/run.mjs` read the same off and on verdicts.

## Measurement

See `lane/w3c-search-inputs-result.md` for every number and its command.

## Limits

- The targets are the conditions inside the unit's own text. A change in a same-file callee whose unit text is equal
  gives no target, so no search (the draws still run).
- The probes are compiled into the pair's two files only; a condition in an imported module is not a branch point.
- A leaf behind a fake (an opaque value, a handle) is not changed; a dictionary's keys are changed only to the unit's
  string literals; an empty list of records gains no element.
- A rendered unit (JSX) is not searched; its handler sequences and the finite lane are its search.
