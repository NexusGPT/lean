# Lane w3b-mutant-study: result

Branch `lane/w3b-mutant-study`, cut from lead-vm 4747022f (v0.1.4 plus the Dafny resource-limit merge). Design note:
`langs/ts/design/w3b-mutant-study.md`. No change to `exec/mutate.mjs`, `check.mjs` or the readings; no decision site
added (the runner counts verdicts; it decides nothing about a unit), so no row in the admission contract's audit table.
Nothing under `translate/` or `lint/` changed, so no conformance run is owed.

## What landed

| file | what |
| --- | --- |
| `langs/ts/tests/mutants.mjs` | the runner: every unit of every pair and a seeded census sample, every mutate.mjs site planted and checked; JSON, a Markdown table by kind, a timing file with the 20 slowest; `--merge`, `--recheck`, `--delta` |
| `langs/ts/tests/mutants-fixture.mjs` | the fixture test (`--break` drops mutate.mjs's dropped-effect sites) |
| `langs/ts/tests/fixtures/mutants/two_units/` | the fixture pair: two units, 16 sites, every one caught |
| `langs/ts/design/w3b-mutant-study.md` | the design note with the baseline table |
| `lane/w3b-mutant-study/` | the baseline study: `baseline.json` (every row), `baseline.md`, the two runs' tables and their 20 slowest |

The fixture test is not yet a row of `tests/run.mjs` (not this lane's file); the lead may add
`scriptRow('runtime', 'mutants-fixture', ..., [path.join(here, 'mutants-fixture.mjs')], lastLine)`.

## The fixture test, red first

    node langs/ts/tests/mutants-fixture.mjs           -> mutants fixture: 16 sites of 2 units, every one planted and caught (lane B)
    node langs/ts/tests/mutants-fixture.mjs --break   -> AssertionError: every site mutate.mjs lists is a row of the study, in its order
                                                         (the three dropped-effect rows missing: 13 rows against 16 sites)

Before the runner existed the test had nothing to run (red). The fixture's first version had `if (n > 0) tags.push(..)`
without braces; mutate.mjs's dropped-effect edit then does not parse, so two of its sites were `not-planted` and the
test was red on its own rule ("every site planted"); the fixture now braces both branches.

## The baseline (lean code at lead-vm 4747022f)

Commands (from `/root/lanes/w3b-mutant-study/tree/langs/ts`; the scratch folder `S=/root/lanes/w3b-mutant-study/scratch`):

    # the three census roots, copied (mutate.mjs writes its type-check file beside the unit), dependencies installed
    cp -r /root/da/census/repos/{snitch,nexus-chat-embed,nexus-meeting-recorder} $S/roots/
    node census.mjs $S/roots/<root> --install-under $S/roots --out $S/census/<root>.json --report $S/census/<root>.md   # three at once
    # the pairs (uptime 02:33: load 39.5)
    node tests/mutants.mjs --jobs 4 --work $S/base1/w --out $S/base1/pairs.json --report $S/base1/pairs.md --timing $S/base1/pairs.timing.json
    # the census sample (uptime 02:40: load 38.7)
    node tests/mutants.mjs --no-pairs --census $S/census/snitch.json --census $S/census/nexus-chat-embed.json \
      --census $S/census/nexus-meeting-recorder.json --sample 300 --seed 1 --jobs 4 --work $S/cen1/w \
      --out $S/cen1/census.json --report $S/cen1/census.md --timing $S/cen1/census.timing.json
    node tests/mutants.mjs --merge $S/base1/pairs.json $S/cen1/census.json --out lane/w3b-mutant-study/baseline.json --report lane/w3b-mutant-study/baseline.md

Census runs (installed): snitch 1,399 units, 635 entered; nexus-chat-embed 361, 189; nexus-meeting-recorder 105, 68.
The sample frame: 715 written, entered, top-level units (census.mjs's own independent entered count: 515 + 160 + 41 =
716 over all strata). The census install folder is this lane's (`$S/roots`), not `/root/census-installs`: the brief
says "writes to: your tree only", and census.mjs installs only into a root inside `--install-under`.

| run | units | sites | planted | not planted | wall | mean check |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| pairs (301 pairs) | 2,036 (218 without a site) | 6,226 | 5,661 | 565 | 12,421 s | 7.9 s |
| census sample | 300 (75 without a site) | 1,931 | 1,451 | 480 | 15,689 s | 33.6 s |

### Caught and escaped share per kind

| kind | pairs planted | pairs caught | pairs escaped | pairs ASK | census planted | census caught | census escaped | census ASK |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| operator | 1,188 | 87.5% | 11.4% | 1.2% | 291 | 66.0% | 27.1% | 6.9% |
| boundary | 1,515 | 86.8% | 12.6% | 0.5% | 329 | 66.6% | 29.8% | 3.6% |
| string | 596 | 85.7% | 12.6% | 1.2% | 529 | 78.4% | 21.2% | 0.4% |
| negated-if | 247 | 97.2% | 2.0% | 0.8% | 94 | 70.2% | 25.5% | 4.3% |
| dropped-else | 11 | 81.8% | 0% | 18.2% | 2 | 50% | 50% | 0% |
| swapped-args | 100 | 90.0% | 10.0% | 0% | 58 | 65.5% | 31.0% | 3.4% |
| dropped-effect | 432 | 89.4% | 8.1% | 2.5% | 65 | 53.8% | 26.2% | 20.0% |
| changed-return | 1,572 | 97.0% | 2.7% | 0.3% | 83 | 73.5% | 22.9% | 3.6% |
| **all** | **5,661** | **90.4%** | **8.7%** | **0.8%** | **1,451** | **70.8%** | **25.4%** | **3.9%** |

Together: 7,112 planted, 6,142 caught (86.4%), 862 escaped (12.1%: 755 PASS-bounded, 107 PASS-proved, 0 PASS-decided),
104 ASK (1.5%), 4 REFUSE (render purity). The escaped share per kind over both: operator 14.5%, boundary 15.7%, string
16.6%, negated-if 8.5%, dropped-else 7.7%, swapped-args 17.7%, dropped-effect 10.5%, changed-return 3.7%.

Who found the input of the 6,142 caught: lane B 6,130 (seeded type-directed draw 3,068, boundary walk 1,318, enumerated
heaps 1,182, method programs 498, listed values 13, environment programs 12, race programs 11, other 28), lane A's
doubles counterexample 12.

Lane A's verdict on the 755 PASS-bounded escapes: `ASK:doubles-unknown` 391, `ASK:identity` 197, `ASK:unproved` 79,
`ASK` 56, `ASK:translation-defect` 32. PASS-proved on a mutant (107): fourteen read by hand (alias_result counts x2,
exceptions_scope helper x2 and caller, library_cells freshMap x3, gen_walk clampUnit, heap5_conditional count,
lane_b_reach nullPrototype, adapters usePick, array_copies_identity x2), all fourteen equivalent mutants; the other 93
not read.

The 20 slowest (`lane/w3b-mutant-study/baseline-*.timing.json`): pairs, promise_then bridge site 1 dropped-effect ASK
764 s, promise_then literal 443 s, sandbox_boundary reachNet 271 s, microtask_worker drain 251 s, for_desugar 237 s, ...;
census, snitch infra/gen-events/src/generate.ts workdayUtcMs (16 of the 20, 142 to 315 s), AdminController.curate 171 s.

### What it says for W3

- The pair corpus leaves at most 9.6 points to catch (8.7 escaped, 0.8 ASK, part of the escaped equivalent mutants):
  W3's threshold "caught share rises by at least 20 points on the pair corpus" cannot be met on the pairs. The census
  sample, 25.4% escaped, is where the room is.
- The largest escape class is the doubles reading's unknown (391 of 755), then `ASK:identity` (197, mostly census);
  a failed Dafny lemma (`ASK:unproved`, W3a's population) is 79.

### Missing site kinds in exec/mutate.mjs (not added)

Boolean literal flip; `null`/`undefined` for a value; a dropped assignment or property write (dropped-effect drops call
statements only); compound assignment (`+=` to `-=`); `/ % ** == != ??` and bitwise operators; a removed unary `!` or
`-`; template literals; `changed-return` on an object, array or union return.

## The study on w3a's and w3c's branches (2026-11-01)

A full pair run takes 3.5 h at this load, so the delta is measured where both lanes act: both change only what happens
after lane B's draws agree (W3c searches then; W3a asks the solver once lane A's lemma fails), so a mutant caught at
the baseline stays caught unless the lane breaks lane B. `--recheck` checks again every pair site the baseline did not
catch (546) and a seeded sample of 100 it caught (the regression check), on a detached worktree of each branch with the
runner copied in; `--delta` compares. The census sample's 424 open sites: below.

    git -C /root/lean worktree add --detach /root/lanes/w3b-mutant-study/on-w3c lane/w3c-search-inputs   # 057bcfb5
    git -C /root/lean worktree add --detach /root/lanes/w3b-mutant-study/on-w3a lane/w3a-counterexample  # 9522c28a
    # (--detach: each branch is checked out in its own lane's tree)
    cd /root/lanes/w3b-mutant-study/on-w3c/langs/ts && LEAN_SEARCH=1 node tests/mutants.mjs --recheck $S/baseline.json --source pairs \
      --plus-caught 100 --jobs 4 --work $S/w3c2/w --out $S/w3c2/recheck.json --report $S/w3c2/recheck.md --timing $S/w3c2/recheck.timing.json
    cd /root/lanes/w3b-mutant-study/on-w3a/langs/ts && node tests/mutants.mjs --recheck $S/baseline.json --source pairs \
      --plus-caught 100 --jobs 4 --work $S/w3a2/w --out $S/w3a2/recheck.json --report $S/w3a2/recheck.md --timing $S/w3a2/recheck.timing.json
    node tests/mutants.mjs --delta $S/baseline.json $S/<run>/recheck.json --source pairs     # the table below
    python3 $S/compare.py ...                                                                  # transitions, time ratio

(`LEAN_SEARCH=1`: w3c's tests/run.mjs turns the search on in the suite, `process.env.LEAN_SEARCH ??= '1'`; w3a's step is
always on.) Both started 07:38 at load 49.5; the load stayed between 40 and 80 from 06:00 on with none of this lane's
runs going, so after the five-minute waits the runs started above 40 (the readings are in each run's `uptime-at-start`).

| pairs | rechecked | gains (not caught, now WITNESS) | regressions (of 100 caught) | caught share | false witnesses | check time, same sites |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| baseline | - | - | - | 90.4% (5,115 of 5,661) | - | 1.00 |
| w3c 057bcfb5, LEAN_SEARCH=1 | 646 | 17 (all `B search`) | 0 | 90.7% (+0.30 points) | - | 0.93 (9,587 s against 10,333 s) |
| w3a 9522c28a | 640 | 7 (all `A counterexample`, every one replayed) | 0 | 90.5% (+0.12 points) | 0 | 1.06 (9,857 s against 9,267 s) |

Gains by kind: w3c operator 6, boundary 7, string 3, swapped-args 1 (pairs local_declarations 5, loop_forms 6,
absent_number 2, tuple_array_methods 2, library_rows 1, readme_ledger 1; lane A had said `ASK:doubles-unknown` on 13 of
the 17); w3a operator 1, boundary 5, string 1. Every other verdict is unchanged: on w3c 629 of 646 rows are byte-equal to
the baseline row (the 17 gains differ); on w3a the verdicts are unchanged outside the 7 gains, and the rows carry the new
`counterexample` field. On w3a lane A's counterexample was `unconfirmed` (the solver's input replayed without a
divergence) on 288 PASS-bounded and 24 ASK mutants: 312 mutants that differ from their parent where the solver's model
did not give a separating input.

**w3a, one unit not measured.** `microtask_worker drain` (6 sites, ASK at the baseline after 130 to 251 s each): on w3a
the first site's check.mjs ran 2,420 s at about 70% CPU in its own process, with no child (no Dafny, no lane B child),
and was stopped by hand at 08:42; the five other sites were not run, so the w3a figures cover 640 sites. My guess,
not verified: the counterexample's replay runs in check.mjs's own process, where lane B's `--unit-seconds` child bound
does not reach, on a unit that drains microtasks. Worth a look from w3a.

**Against W3's threshold** ("caught share rises by at least 20 points on the pair corpus"): +0.30 and +0.12 points. At
most 9.6 points are open on the pairs, and 105 of the escapes are equivalent mutants proved equal, so the 20 points
cannot be reached on the pair corpus by any lane. False witnesses: 0 (w3a's seven counterexample witnesses all replayed).
Time: within the 2x (w3a) and 1.5x (w3c) bounds on these sites, apart from the w3a unit above.

{{DETERMINISM}}

## Open

{{OPEN}}
