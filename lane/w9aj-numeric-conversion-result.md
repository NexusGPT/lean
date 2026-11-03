# Lane w9aj-numeric-conversion (lean): result

Branch `lane/w9aj-numeric-conversion`, from `lead-v4` 9873874f64. Commits: 29edba4384 (the mechanism, the pairs, the
harness test, the breaks), 4fb4add4e1 (design note `langs/ts/design/w9aj-numeric-conversion.md`), and the commit holding
this file and `lane/w9aj-numeric-conversion/` (the raw outputs). All measurements ran on a frozen worktree at 29edba4384
(the code is the same at the head).

## The cause (measured, not the brief's hypothesis)

The brief's hypothesis was that lane B's draws rarely hold the values that separate two conversions. It does **not**
explain the 12 ids.

- **Probes** (`lane/w9aj-numeric-conversion/probes/A..L`, `probe.sh`). These are 12 small pairs of the kind's own
  shapes: Number/parseFloat/parseInt on a string, a property path and a number; floor/ceil/round↔trunc and `~~` on
  number expressions; isNaN/isFinite↔Number.* on `any`/`unknown`; `||`→`??` on an optional field. On 9873874f64, 11
  are WITNESS. Lane w9o's `CONVERTED_TEXT`, the fractional draws and the special-number inputs already cover them. The
  one miss (K) converts a **derived local** (`const t = s.trim(); Number(t)`). Further probes found two more uncovered
  shapes: a **conversion of a conversion** (`Math.floor(parseFloat(s))`: no drawn text is a negative fraction), and a
  conversion of a **world answer** (`registry.get(k) || 0` from a faked package: no draw infects, so the w9l climb
  never starts).
- **The 12 ids, lean alone on the mutated unit**: 3 of 12 WITNESS on 9873874f64 (Checkmate#3288, three.js#34734,
  n8n#41890). The brief's table reads 2, at an older head. The other nine are not draw misses:
  - **equivalent on every input the code can reach** (5): gemini-cli#29612 (`Math.max(5, …) / 4` is never negative;
    NaN floors and truncates alike), n8n#42608 (`isFinite` of a value already a `Number(...)`), n8n#42766 (`isNaN` of
    `Date#getTime()`), n8n#41940 (trunc and floor of `timeout - elapsed` differ only below 0, where both throw the same
    error), three.js#34978 (the WeakMap holds undefined or a count ≥ 0; `0 || 0` is `0 ?? 0`; only NaN, '' or false
    would differ).
  - **reach** (4): immich#32498 (`event instanceof KeyboardEvent` inside an action callback; line 227 unreached),
    n8n#41825 (a middleware callback lean cannot drive: ASK callback-undriven), n8n#41943 (lines 3072–3104 unreached,
    deep in a loop over execution data), three.js#34309 (for-in keys of a value under a regex-matched key; lines
    579–646 unreached).
- **The DA record level** (pr.mjs over the whole PR, parent = the PR's merge base). None of the 12 has a WITNESS on the
  unit from the planted edit, for reasons outside the draws:
  - three.js#34734, n8n#41890 and n8n#41825 are in **units the PR adds**: there is no parent unit, so lean gives NEW.
  - Checkmate's module **fails to load** (`ASK(fake answering at module evaluation): z.email is not a function`).
  - 29612 and 34978 time out, or timed out before.
  - immich and 42608 carried WITNESSes of the PR's own change, away from the edit.

  These three causes (new-unit mutants, the zod fake at module evaluation, and the per-unit timeouts under load) are
  where the rendered number is lost. None of them is a conversion problem.

## What landed (the general mechanism, design note `langs/ts/design/w9aj-numeric-conversion.md`)

`exec/conversions.mjs` holds one value list per family. Each value carries the pair it separates:

- `parse`: Number, parseInt, parseFloat, `+x`.
- `round`: Math.floor/ceil/round/trunc, `~~x`, `x|0`, `x>>0`.
- `nan`: isNaN and isFinite, global and Number's own.
- `fallback`: `x || <number>`.

`flowsInto` finds the reads a conversion takes. It follows arithmetic, `??` and `||`, conditional branches, a text kept
but for case or blanks (`trim`, `toLowerCase`, `String(x)`, `${x}`), a conversion's own argument, and a local's
initializer. Syntax only, on both versions, in the existing budget and order, deterministic.

1. **Draws** (`usage.mjs converts`, `spec.mjs boundaryOf`). A leaf a conversion takes draws its family's values that
   its declared type admits. NaN and -0 are kept apart from null and 0. `LEAN_BREAK=w9aj-conversions`.
2. **Input search** (`search.mjs leafValues`). Those values are the leaf's changes: tier 0 where the two versions
   convert the leaf differently (`convChanged`), tier 1 otherwise. `LEAN_BREAK=w9aj-conversion-changes`.
3. **World search** (`compared.mjs changedConversions`, `search.mjs searchWorld worldInfect`, `fake.mjs` `num:`). A
   world answer that a conversion on a changed line takes is set to the family's answers (at most four), on a draw no
   difference reached. This runs after the leaf changes, inside the infection's half of the budget. A diff becomes a
   replayed witness; an infected run is climbed. `LEAN_BREAK=w9aj-world-conversions`.

Nothing reads the mutation, the truth or a bench file.

One regression was caught and fixed on the way: `Number.isInteger` and `isSafeInteger` first sat in the `nan` family,
and their tier-0 values stopped `search_boundary`'s search before 2^53. They have no converting twin, so they were taken
out. `tests/search-inputs.mjs` is green again (16 checks).

## Validators (verbatim)

New pairs, each alone (`tests/run.mjs --pair`, JOBS=1). On 9873874f64 (a scratch worktree with the pair folders copied
in):

```
| pair | conversion_flow | lane B pageSize WITNESS | FAIL |             | PASS-bounded
| pair | conversion_flow | lane B offsetOf WITNESS | FAIL |             | PASS-bounded
conversion_flow exit 0 secs 7.376608357 | TOTAL | 2 checks | 2 FAILED |
| pair | conversion_round | lane B bucketOf WITNESS | FAIL |             | PASS-bounded
| pair | conversion_round | lane B shiftOf WITNESS | FAIL |             | PASS-bounded
conversion_round exit 0 secs 10.453327220 | TOTAL | 2 checks | 2 FAILED |
| pair | conversion_world | lane B Renders.depthOf WITNESS | FAIL |             | PASS-bounded
conversion_world exit 0 secs 14.386416813 | TOTAL | 1 checks | 1 FAILED |
```

After:

```
| pair | conversion_flow | lane B pageSize WITNESS | PASS |             | WITNESS
| pair | conversion_flow | lane B offsetOf WITNESS | PASS |             | WITNESS
conversion_flow exit 0 secs 2.542368051 | TOTAL | 2 checks | ALL PASS |
| pair | conversion_round | lane B bucketOf WITNESS | PASS |             | WITNESS
| pair | conversion_round | lane B shiftOf WITNESS | PASS |             | WITNESS
conversion_round exit 0 secs .816153579 | TOTAL | 2 checks | ALL PASS |
| pair | conversion_world | lane B Renders.depthOf WITNESS | PASS |             | WITNESS
conversion_world exit 0 secs .720691231 | TOTAL | 1 checks | ALL PASS |
```

The pairs:

- `conversion_flow/pageSize` is the brief's `Number(s)` → `parseInt(s)` pair, through a trimmed local.
- `conversion_round/bucketOf` and `shiftOf` are the float/truncation pair: `Math.floor` → `Math.trunc` on a negative
  fraction, parsed from text.
- `conversion_world` is the world-answer shape.

Breaks (`tests/lib-break.mjs --pair <p> --jobs 1`), registered in `tests/break.mjs`:

```
| conversion_flow | pageSize | LEAN_BREAK=w9aj-conversions | WITNESS -> PASS-bounded | PASS |
| conversion_flow | offsetOf | LEAN_BREAK=w9aj-conversions | WITNESS -> PASS-bounded | PASS |
lib-break: 2 rows, 0 failed
| conversion_round | bucketOf | LEAN_BREAK=w9aj-conversions | WITNESS -> PASS-bounded | PASS |
| conversion_round | shiftOf | LEAN_BREAK=w9aj-conversions | WITNESS -> PASS-bounded | PASS |
lib-break: 2 rows, 0 failed
| conversion_world | Renders.depthOf | LEAN_BREAK=w9aj-world-conversions | WITNESS -> PASS-bounded | PASS |
lib-break: 1 rows, 0 failed
```

Harness tests:

```
$ node tests/w9aj-numeric-conversion.mjs
w9aj-numeric-conversion: 23 checks pass                                                        exit 0
$ node tests/w9aj-numeric-conversion.mjs --break
AssertionError [ERR_ASSERTION]: pageSize: the trimmed local is converted, differently by the two versions ({"converts":[],"by":[]})   exit 1
LEAN_BREAK=w9aj-conversions:        AssertionError [ERR_ASSERTION]: pageSize: the trimmed local is converted, differently by the two versions ({"converts":[],"by":[]})   exit 1
LEAN_BREAK=w9aj-conversion-changes: AssertionError [ERR_ASSERTION]: the leaf two versions convert differently changes to the parse family's texts first (tier 0: [])   exit 1
LEAN_BREAK=w9aj-world-conversions:  AssertionError [ERR_ASSERTION]: the read the changed fallback takes, with the fallback family's answers ([])   exit 1
tests/w9ac-compare-literals.mjs exit 0: w9ac-compare-literals: 22 checks pass
tests/w9l-bounded-and-moves.mjs exit 0: w9l-bounded-and-moves: 26 checks pass
tests/search-inputs.mjs exit 0: search-inputs: 16 checks pass
exec/usage.test.mjs exit 0 · exec/gen.test.mjs exit 0 · exec/omitted.test.mjs exit 0
$ node tests/opaque-unit.mjs --break
FAIL step line var (wld, retb, u) := ext_block_x(wld, u);
FAIL step signature {"id":"block_x","ins":["World","U"],"out":"(World, Option<int>, U)"}
exit 1
```

**Regression pairs**, each alone, JOBS=1, after: 143 runs, **140 ALL PASS**. The lane B draw, search, sites and world
families (w9ac's list) were run:

callee_file_literals cause_callee_pattern cause_world_reach conversion_flow conversion_round conversion_world
converted_text field_sites lane_b_reach reach_absent reach_keys reach_lead reach_lead_site reach_site reach_statements
search_boundary search_nested_literals three_sites world_guard_literal world_guard_path world_masked
world_masked_infect world_read_after_call

The rest of w9ac's list (adapters … wider_record_argument) and all 77 `opaque_*` pairs were run too. The full list is
in `lane/w9aj-numeric-conversion/regress-after.txt`. Three runs fail, all in the opaque family, and each fails
identically on 9873874f64 (same row, same detail; `regress-base-fails.txt`):

```
opaque_copied_argument exit 0 secs 2.213782368 | TOTAL | 1 checks | 1 FAILED |     (theorem: refused: the parent input ... parent.dfy does not exist)
opaque_for_in exit 0 secs 11.110565951 | TOTAL | 15 checks | 1 FAILED |            (break opaque-drop-read: not proved under LEAN_BREAK=opaque-drop-read)
opaque_read_after_call exit 0 secs 32.182215221 | TOTAL | 28 checks | 1 FAILED |   (break handle-write: not proved under LEAN_BREAK=handle-write)
```

The brief names 2 known opaque failures; w9ac found these same 3 on its base. This lane changes lane B only.

A first whole-suite run (my mistake: `LEAN_PAIRS` runs every section) also showed `differential pattern_defaults`
and `repo pr intake` FAIL. Both are lane A or repo sections outside this lane's files. I did not re-run them on the
base.

**Time per unit**. 23 lane B pairs (w9ac's 20 and the 3 new) were run on both trees, interleaved pair by pair, with
`LEAN_STEP_CACHE=0` and JOBS=1, measuring the CPU time of the run and its children (`cpu-time.txt`). Per lane B unit
(54 units): **3.944 s on 9873874f64, 3.989 s after (1.01x)**. Wall time was 312.5 s against 380.9 s, under a load of
40–80. One outlier is lane_b_reach (22.8 s against 110.9 s wall, 6.39 s against 7.93 s CPU).

**The 12 numeric-conversion ids, lean alone on the mutated unit** (`hard_check.py`, records
`/root/da-bench/w9aj/check-{before,after}.jsonl`):

```
numeric-conversion    12  WITNESS   3  {'ASK': 1, 'PASS-bounded': 8, 'WITNESS': 3}     (9873874f64)
numeric-conversion    12  WITNESS   3  {'ASK': 1, 'PASS-bounded': 8, 'WITNESS': 3}     (29edba4384)
```

The before run failed six GitHub checkouts transiently; they were retried by the script's resume. Per id, the verdicts
are the same before and after: Checkmate, 34734 and 41890 WITNESS; 41825 ASK; the rest PASS-bounded.

**The DA run of the same 12**:

- Command: `bench/materialise.py --instances bench/hard/instances --only <the 12> --out /root/da-bench/w9aj/instances
  --jobs 2 --load-max 1000 --floor-gb 20`, with `LEAN=<frozen 29edba4384>`.
- This DA version has no `--no-lock` flag; its lock is per checkout root, and mine is `/root/da-bench/w9aj`.
- The first materialise process was stopped by my tool's 2-hour limit at 6 of 12. Re-run with `--redo-failed`, it
  skipped those 6 and made the other 6.
- Then `bench/run.py --entry da-attest --no-judge --no-record --out /root/da-bench/w9aj/da-run`.
- Then `bench/hard_table.py`. Its `--ocr` input was `hard36-ocr.json` adapted to score shape; the OCR column is not
  this lane's.

```
before (the brief's table: DA run 2026-11-03-hard36-14b167a8e0; lean on the unit at 9873874f64)
| numeric-conversion | 12 | 5 | 2 of 12 (16.7 %) | 1 of 12 (8.3 %) | 3 of 12 (25.0 %) | 0 of 12 (0.0 %) | 7 of 12 (58.3 %) |
after (records made with 29edba4384)
| numeric-conversion | 12 | 5 | 2 of 12 (16.7 %) | 1 of 12 (8.3 %) | 3 of 12 (25.0 %) | 0 of 12 (0.0 %) | 7 of 12 (58.3 %) |
```

Witnesses at the record level are 2 of 12 before and after; rendered is **0 of 12 before and after**. The record-level
set moved, but not because of this lane: 29612 timed out before and now holds a WITNESS of the PR's own change (line
72, `keyMatchers` read after a call; the edit is at 138). 42608 held a PR-change WITNESS before and times out now.

## What is open

- The rendered number on this kind is lost at the record level, not in the draws:
  - **mutants in units the PR adds** (NEW, no parent: 3 of 12);
  - **the zod fake at module evaluation** (Checkmate: `z.email is not a function`);
  - **per-unit timeouts** under load.

  Each is a lane of its own. A new unit has no parent to compare with, so finding the bug there would need a property
  of the unit itself, not a differential.
- Reach misses (immich, 41825, 41943, 34309): `instanceof` a platform class inside a callback, an undriven middleware
  callback, a deep loop, for-in keys. A for-in key a conversion takes (34309's `parseFloat(frameKey)`) is a read the
  usage tree does not model; the family values would apply to the dictionary's keys.
- Five of the 12 are equivalent on their reachable inputs (above). No input can tell them apart, and a bench count
  should not expect it.
- The world-infection step uses only conversions on a changed line, so that it stays in budget. A conversion of a world
  answer elsewhere in a callee is reached only through the climb's guide (w9ac).
