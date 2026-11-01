# Lane w3c-search-inputs: result (2026-11-01)

Branch `lane/w3c-search-inputs`, cut from `lead-vm` 4747022f. Design note: `langs/ts/design/w3c-search-inputs.md`.

## What landed

- `langs/ts/exec/search.mjs` (new): the branch table of a file, the probes (`branchMarks`), the line diff
  (`changedLines`), the targets of a unit (`unitBranches`, `searchPlan`), the typed leaf changes (`changesOf`), the
  recipes (`applyRecipe`), and the seeded search (`searchInputs`).
- `langs/ts/exec/run.mjs`: behind `--search` / `LEAN_SEARCH=1` only: the probes compiled into the pair's two files
  (the compile cache keys on them), the hits per draw, the search after the draws agree, a replayed WITNESS with
  `source: search`, `bound.search`. `--no-search` and an unset flag run exactly as before.
- `langs/ts/tests/run.mjs`: `LEAN_SEARCH=1` unless set; the pair key `search` (off and on rows); the suite row
  `search-inputs`. `langs/ts/tests/stepcache.mjs`: `LEAN_SEARCH` and `LEAN_SEARCH_BREAK` in every step's key.
- Pairs `tests/pairs/search_nested_literals` (`route`), `tests/pairs/search_boundary` (`refKey`).
- `langs/ts/tests/search-inputs.mjs` (test, with `--break`), `langs/ts/tests/search-measure.mjs` (the measurement).
- `langs/ts/design/admission-contract.md`: the dated section with the one new verdict site (no lint or translator site
  was added).

## Done criteria

| criterion | result | command |
| --- | --- | --- |
| both pairs WITNESS by search, `source: search` in the certificate | route: WITNESS, input `{source: search, from: 2, changes: [arg0.path set "/orders"]}`, 2 inputs tried; refKey: WITNESS, input `{source: search, from: 2, changes: [arg0.id set 9007199254740992]}`, 11 inputs tried; check.mjs certificate `lanes.B.witnesses[0].input.source = "search"` and `where.source = "search"` | `node langs/ts/tests/search-inputs.mjs` |
| both pairs PASS-bounded without the flag | route PASS-bounded, refKey PASS-bounded (`--no-search`, n 30). refKey also PASS-bounded on n 200 under seeds 1, 2, 3; route is found by the draw at n 200 (inputs 48, 72, 87) | same; `node langs/ts/exec/run.mjs ... --n 200 --seed s` |
| determinism from the seed | two runs with the search byte-equal on both pairs (`cmp`, also in the test) | `node langs/ts/tests/search-inputs.mjs` |
| `--break` goes red | `LEAN_SEARCH_BREAK=values,keep`: the test fails (synthetic two-step search: `stop: no change left, tried 7, kept 0`); both pairs PASS-bounded under the break (`input bound`, 30 tried) | `node langs/ts/tests/search-inputs.mjs --break` |
| time per unit on ten existing pairs at most 1.5x | 1.022x total (144,936 ms off, 148,148 ms on, 84 units), mean per-unit ratio 1.023x, max 1.157x | `node langs/ts/tests/search-measure.mjs --first 10 --reps 2 --out measure10b.json` |
| branches of the diff reached before and after | 100 of 128 by the draws, 102 of 128 after the search (10 pairs, 84 units, 12 units searched); verdicts unchanged on all 84 | same |

The ten pairs are the first ten by name that have lane B units (the tool's `--first 10`, no choice by result). Time
is the least wall time of two alternating runs per mode (the machine was shared, load 40 to 60 during the run).

| pair | units | ms/unit off | ms/unit on | ratio | diff branches by draws | after search | targets |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| absent_number | 6 | 1812 | 1911 | 1.05 | 41 | 43 | 56 |
| adapters | 5 | 1542 | 1510 | 0.98 | 1 | 1 | 2 |
| any_equality | 6 | 1581 | 1610 | 1.02 | 6 | 6 | 6 |
| arithmetic_core | 16 | 1648 | 1687 | 1.02 | 0 | 0 | 0 |
| array_callback_cells | 4 | 1732 | 1708 | 0.99 | 2 | 2 | 2 |
| array_callbacks_rest | 11 | 1862 | 1866 | 1.00 | 28 | 28 | 28 |
| array_callbacks_rest_real | 5 | 1479 | 1488 | 1.01 | 8 | 8 | 8 |
| array_copies_alias | 11 | 1716 | 1862 | 1.08 | 14 | 14 | 26 |
| array_copies_identity | 14 | 1887 | 1929 | 1.02 | 0 | 0 | 0 |
| array_copy_identity | 6 | 1733 | 1702 | 0.98 | 0 | 0 | 0 |

The 12 unreached targets of `array_copies_alias` are guards `x * 7 % 1000003 === 5` (a modular inverse): no local
search reaches them; they are the solver's (w3a). `readMechanic`'s 10 unreached targets need two dictionary keys and a
kind at once within 30 tries.

A first version that walked one leaf's tier before the next leaf reached 100 of 128 (no gain): readMechanic spent all
30 tries on `mechanic_raw`, a string no condition reads. The fix is the scheduler, not a value: within a tier each leaf
gets one change in turn, and a leaf whose changes twice move no branch outcome of the entry waits behind the others;
the literals of a target condition come first. Before: `measure10.json` (1.018x, 100 to 100); after: `measure10b.json`.

## Regression sweep (every lane B unit of every pair, search on)

`LEAN_SEARCH=1 node langs/ts/tests/laneb-sweep.mjs --tree /root/lanes/w3c-search-inputs/tree --out /tmp/w3c/m/sweep-on.json --jobs 4`
(03:27 to 03:48, load 39 at start): 1,866 lane B units of 293 pairs (1,864 existing plus the two new), every verdict
equal to the pair's expected `b` verdict: 1,866 of 1,866. The search added no WITNESS to an existing unit (none of
them has a difference a one-leaf-at-a-time search reaches within 30 inputs that the draws missed), and it changed no
PASS or ASK.

The suite's pair step: `node langs/ts/tests/run.mjs --pair search_nested_literals` and `--pair search_boundary`:
3 checks ALL PASS each (lane B WITNESS; search off PASS-bounded; search on WITNESS with `source: search`).

## Commands

- `node langs/ts/tests/search-inputs.mjs` -> `search-inputs: 16 checks pass`
- `node langs/ts/tests/search-inputs.mjs --break` -> exit 1 (AssertionError: found two changes away ... stop: no change left, tried 7, kept 0)
- `node langs/ts/tests/search-measure.mjs --first 10 --reps 2 --out /tmp/w3c/m/measure10b.json`
- `LEAN_SEARCH=1 node langs/ts/tests/laneb-sweep.mjs --tree <tree> --out sweep-on.json --jobs 4`

## Open

- Targets are the conditions in the unit's own text; a change only in a same-file callee gives no search.
- Probes cover the pair's two files only; a branch in an imported module is not a target.
- A leaf behind a fake is never changed; an empty list of records gains no element; a rendered (JSX) unit is not searched.
- The full suite (`LEAN_CONFORMANCE=full`) is the lead's at merge. No change under `translate/` or `lint/`, so no conformance run was required.
