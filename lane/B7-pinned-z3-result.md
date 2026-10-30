# B7-pinned-z3: result

Branch `lane/B7-pinned-z3`, from lead head 2a6c7bb62. Commits: 81672490a (one Z3), b032829c6 (the walk's fuel),
6d5e9d906 (design table correction), and the commit that adds this file.

## 1. One Z3

**The defect.** `solve/fp.mjs` spawned `z3` from PATH (4.8.12 on this server). `check.mjs` `z3Record` recorded the Z3
bundled beside dafny (4.12.1), and Dafny picked its own Z3. So a certificate could name one Z3 while another ran. The
step cache keyed Dafny results by the Dafny version alone, so a result proved under one Z3 could be replayed under
another. That is how the Mac's green heap_canonical runs could come from the cache.

**The mechanism.** `langs/ts/solve/z3.mjs` is the only lookup. It tries `LEAN_Z3` first; if that is set but does not
answer `--version`, there is no Z3, never a silent fallback. Then the first Z3 in `z3/bin` beside the dafny executable
that answers. Then the first `z3` on PATH that answers. Every user goes through it:
- `solve/fp.mjs` runs that binary. Its record carries `solverVersion` and the new `solverPath`, and with no Z3 the
  verdict is `unknown` with the reason.
- `check.mjs` passes it to Dafny with `--solver-path`. `cert.tools` gains `z3Path`, and `lanes.A.doubles` gains
  `solverPath`.
- `tests/run.mjs` passes it to the suite's two `dafny verify` calls.
- `tests/stepcache.mjs` keys Dafny steps by the Dafny version plus that Z3's version.

**Elements added.**
- `solve/z3.mjs`: `z3Binary()` and `dafnySolverArgs()`.
- `tests/z3-pinned.mjs`, registered as runtime row `z3-pinned`. It checks two things:
  - With the default lookup, a unit that runs both the doubles reading and Dafny records the same Z3 text in
    `doubles.solverVersion` and `tools.z3`, and that text and path are the lookup's.
  - With `LEAN_Z3` pointing at a wrapper that logs each run, the doubles record and `tools` name the wrapper, and the
    log holds both the doubles query and Dafny's run.
- `tests/assurance/certificate.test.mjs`: the Z3 assertion now runs the recorded `z3Path` and accepts the source
  `LEAN_Z3`.
- `docs/ASSURANCE.md`: the tools paragraph says the same.

**Before and after.**
- Command: `node langs/ts/tests/z3-pinned.mjs`.
  - Before: exit 1, six failures. The first was `default: doubles ran Z3 version 4.8.12 - 64 bit, tools records Z3 version 4.12.1 - 64 bit`.
  - After: exit 0.
- `node --test langs/ts/tests/assurance/certificate.test.mjs`: exit 0.
- `node langs/ts/tests/certificate-timing.mjs`: exit 0.

## 2. heap_canonical: why `EqualCanon_pair_cells` did not prove

**Red.** `LEAN_STEP_CACHE=0 JOBS=4 node tests/run.mjs --pair heap_canonical` gave 11 of 13. The failing rows were
`Equal_pair proved` (not proved) and `EqualCanon_pair proved` (4 parts: cells). In the kept theorem's Dafny output, five
of the six errors are expected: the whole-heap lemmas of attach, pair, unhook and tally, and `EqualCanon_unhook_initial`.
The only real failure is `EqualCanon_pair_cells`.

**Diagnosis.**
- Unfolding the walk by hand proves the lemma. One `CanonOrder` step per assertion holds (each alone, and chained),
  so the definitions are right.
- The solver's own unfolding at `{:fuel CanonOrder,20,21}` fails in under 4 s. Z3 gives up; it does not time out.
- `pair`'s walk takes 9 steps: 2 roots, the box's 4 fields, the fresh array's 2 items, and the stop.
- Sweeping only `CanonOrder`'s fuel (other functions at 20) on both canonical pairs' theorems:
  - 8 and below: the walk is not unfolded to its end.
  - 9 to 12: every expected part proves under 4.12.1 and 4.14.1.
  - Above 12: parts fail sporadically. 4.12.1 fails at 14, 16, 17, 18, 19, 20 and 25; 4.14.1 at 13, 17, 18 and 25.
    5.3.3 proves at 15, 20 and 25.
- So the fixed 20 sat at 4.12.1's edge. The Z3 4.14.1 that is also bundled beside dafny proves the theorem at 20,
  which would have hidden the problem.
- Rejected after measuring:
  - An index into the worklist instead of `work[1..]`: still fails on 4.12.1 at 20.
  - One recursive call with its arguments chosen by the condition: worse at every fuel.
  - Giving the other Canon functions the bound as well: costs `pair_named` under 4.14.1.

**The fix (general, no per-pair hint, no expectation changed).**
- `spec/theorem.py` `canon_walk_bound` computes, from the generated text, how many steps the walk can take on either
  side. It counts one step per root. It counts one per reference field of a root that is an initial record. Parameter
  shapes come from `// HYP`; a reference result's shape comes from the new `// RET <unit>: <shape>` line the translator
  writes (`translate/heap.mjs` emit returns `ret`, `translate/translate.mjs` writes the line).
- It counts one per reference of every fresh cell the unit allocates. That covers `Alloc_<shape>` calls made directly,
  through prelude helpers (read by `prelude_functions`) and through callee units: a record's reference fields, an array
  literal's items. It adds one step to stop.
- The part lemmas get `{:fuel CanonOrder,b+1,b+2}`. An unbounded walk keeps 20, as before. Unbounded means:
  - an allocation in a recursion;
  - an array or map of references whose width the text does not write;
  - a bodyless prelude function that returns a world.
- Measured fuels: pair 10; attach, tally and unhook 7; library_ops 5 to 7.
- Soundness: the fuel is a prover hint. No lemma statement changed, and a fuel that is too low can only fail a part.
- The design section, dated 2026-10-30, is in `langs/ts/design/canonical-heap.md`.

**Before and after.**
| command | before | after |
|---|---|---|
| `LEAN_STEP_CACHE=0 JOBS=4 node tests/run.mjs --pair heap_canonical` (bundled 4.12.1) | 11/13 | 13/13 |
| same, `JOBS=28`, two runs in a row | (not run before) | 13/13, 13/13 |
| `LEAN_Z3=<4.14.1 or 5.3.3> LEAN_STEP_CACHE=0 JOBS=4 ... --pair heap_canonical` | (not run before) | 13/13 each |
| `LEAN_Z3=<4.12.1, 4.14.1, 5.3.3> LEAN_STEP_CACHE=0 JOBS=4 ... --pair library_ops` | 19/19 (4.12.1) | 19/19 each |
| the 45 pairs whose expect.json has `"heap": true` or `"canon"`, `JOBS=4` each, 4 at a time | (not run before) | all pass |

## Left, and defects met
- `spec/check.py` still calls `dafny verify` without `--solver-path`. It is Python outside the lane's files; Dafny's
  default there is the same bundled 4.12.1.
- The bound is loose in one place: a reference result whose `// RET` shape is a record counts that record's fields even
  when the result is fresh. A loose bound can put the fuel in the band where 4.12.1 gives up. None of the 45 heap pairs
  does.
- Lowering the other Canon functions' fuel is not robust (`pair_named` under 4.14.1). They stay at 20, a constant that
  carries the same risk for long names or cell lists.
- Messages to the lead gave two wrong commit ids. The corrections are 81672490a for part 1 and 6d5e9d906 for the doc fix.
- Commits are authored with the repository's existing identity through `git -c` (no git config was written). They end
  with the trailer the brief names.
