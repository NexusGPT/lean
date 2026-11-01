# The mutant study: how many planted changes lean shows (W3b, 2026-11-01)

Lane w3b-mutant-study. The runner is `langs/ts/tests/mutants.mjs`; its fixture test is `langs/ts/tests/mutants-fixture.mjs`
on `langs/ts/tests/fixtures/mutants/two_units`. Plan: `/root/briefs/da-v4/w3-witness.md` (W3), item 3.

## What

For each unit, every site `exec/mutate.mjs` lists is planted once and checked:

1. **The units.** Every unit of every pair under `tests/pairs` (the candidate file's units, `common.mjs`
   `topLevelFunctions`, less the units another unit encloses: a callback `f/xs.map()#0` is covered by `f`, check.mjs
   answers it as `covered-by`, and mutate.mjs walks into nested functions, so its sites are `f`'s sites already). And a
   seeded sample of 300 units from three census roots: the written units each census run entered and no other unit
   encloses, all three roots in one list ordered by `sha256(seed, root, file, unit)`, the first 300 taken.
2. **The sites.** `sitesOf` lists them in source order; site k is planted with `mutate(file, unit, k)`. mutate.mjs moves
   past a site whose edit does not parse or adds a type error and plants the next one; the runner counts such a site
   `not-planted` (the edit is not a candidate anyone could ship, mutate.mjs's own rule) instead of checking the site
   mutate.mjs moved on to, so no site is counted twice and every row is the site its index names.
3. **The check.** `check.mjs --parent <the unit's file> --candidate <the mutant> --unit <u>` with the suite's options
   (`tests/run.mjs`: `--n 30`, `--dafny-seconds 30`, the pair's `project` or `--no-project`; a census unit inside its
   own project, `--project` by the nearest tsconfig, its dependencies installed by the census run), under check.mjs's
   own wall cap (`checkWallCapMs`) and in a temporary folder removed after each check.
4. **The verdict.** caught: `WITNESS`; escaped: `PASS-bounded`, `PASS-decided`, `PASS-proved`; `ASK` (every ASK word,
   lane B's and lane A's verdicts kept beside it); other: `NEW`, `REFUSE`. For a caught mutant the row names the lane and
   the source of the separating input: for lane B, the draw family its unit record gives the input's index (enumerated
   heaps, listed values, boundary walk, seeded type-directed draw) or the program kind (`program`, `race program`,
   `environment program`, `click sequence`, `schedule`); for lane A, `doubles counterexample`; a witness that names a
   `source` itself (W3a's `counterexample`, W3c's `search`) by that name.

The JSON (`--out`) has one row per site in a fixed order and nothing that depends on the machine (no seconds, no
temporary path); the Markdown (`--report`) renders it by kind; the seconds and the 20 slowest mutants go to `--timing`.
`--merge` joins runs made apart (the pairs and the census sample) into one study.

## Why

W3's validator is "mutants caught as WITNESS over mutants planted, by kind" (w3-witness.md). The planted change is the
one difference whose truth is known without a reader: the mutant differs from its parent by one edit that changes
behaviour on some input (or is an equivalent mutant: see below). An escape is a change lean would let through as
`PASS-bounded`; the share per kind says which kinds of change the drawn inputs miss, which is what W3a (the solver's
counterexample) and W3c (the branch-guided search) are meant to close. The same table is DA-Bench's M component (w5).

## Why the measurement is sound

- **The truth.** The parent of each check is the unmutated file, never the pair's own parent: the pair's own difference
  (equal or not) is not in the question, and every mutant differs from its parent in exactly one edit.
- **The denominator.** Every site mutate.mjs lists is a row, of the same kind, in the same order (the fixture test,
  part 1). A site mutate.mjs rejects is shown as `not-planted` per kind, never dropped.
- **Equivalent mutants.** A mutant may compute what its parent computes (a `<` flipped to `<=` where equality cannot
  arise, a dropped call with no effect). The study cannot tell those apart without a reader, and it does not guess: an
  escape is counted as an escape. `PASS-proved` on a mutant is counted apart: it is either an equivalent mutant or an
  unsound proof, and each row names the site so a reader can look. The escaped share is therefore an upper bound on
  lean's true miss rate per kind.
- **Determinism.** Lane B is seeded (`--seed 1`), lane A bounded by the solver's resource count (exec/dafny-args.mjs),
  the sample ordered by a hash. What could still move: lane B's wall-clock bounds (`--unit-seconds`, the per-call
  limit), read under load. Two runs compared byte for byte measure it (Measurement).
- **No model and no AACR instance.** The study reads lean's verdicts and mutate.mjs's sites only; no model is in any
  path; the 44 AACR instances are not read (the census roots are three of the 39 census roots).

## What the study does not change

`exec/mutate.mjs`, `check.mjs` and the readings are read, never changed. The runner adds no decision site to the
admission contract's audit table: it decides nothing about a unit, it counts lean's verdicts.

## Measurement

### The baseline (lean code at lead-vm 4747022f)

Runs on this lane's branch, whose commits after 4747022f add only `tests/mutants.mjs`, its fixture and this note: the
lean code checked is lead-vm's. `--jobs 4`; the load read before each start (lane/w3b-mutant-study-result.md has
every command and reading). The pairs: 301 pairs, 2,036 units (218 without a site), 6,226 sites, 5,661 planted, 12,421 s.
The census sample: 300 of the 715 written entered top-level units of snitch, nexus-chat-embed and
nexus-meeting-recorder (their census runs, dependencies installed; the frame matches census.mjs's own count of
independent entered units within 2 to 4 per root), 75 without a site, 1,931 sites, 1,451 planted, 15,689 s.

| kind | pairs planted | pairs caught | pairs escaped | census planted | census caught | census escaped | all caught | all escaped | all ASK |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| operator | 1,188 | 87.5% | 11.4% | 291 | 66.0% | 27.1% | 83.2% | 14.5% | 2.3% |
| boundary | 1,515 | 86.8% | 12.6% | 329 | 66.6% | 29.8% | 83.2% | 15.7% | 1.1% |
| string | 596 | 85.7% | 12.6% | 529 | 78.4% | 21.2% | 82.3% | 16.6% | 0.8% |
| negated-if | 247 | 97.2% | 2.0% | 94 | 70.2% | 25.5% | 89.7% | 8.5% | 1.8% |
| dropped-else | 11 | 81.8% | 0% | 2 | 50% | 50% | 76.9% | 7.7% | 15.4% |
| swapped-args | 100 | 90.0% | 10.0% | 58 | 65.5% | 31.0% | 81.0% | 17.7% | 1.3% |
| dropped-effect | 432 | 89.4% | 8.1% | 65 | 53.8% | 26.2% | 84.7% | 10.5% | 4.8% |
| changed-return | 1,572 | 97.0% | 2.7% | 83 | 73.5% | 22.9% | 95.8% | 3.7% | 0.4% |
| **all** | **5,661** | **90.4%** | **8.7%** | **1,451** | **70.8%** | **25.4%** | **86.4%** | **12.1%** | **1.5%** |

Escaped counts PASS-bounded and PASS-proved (PASS-decided: 0). Not planted (mutate.mjs's parse or type rule): 565 pair
sites and 480 census sites, most of them operator flips that break a narrowing (`&&` to `||` before a member read),
swapped arguments of two types and string literals of a literal-union type.

What the table says:

1. **The pair corpus is near its ceiling for W3.** 90.4% is caught; the 8.7% escaped holds 105 PASS-proved (fourteen
   read, all equivalent mutants: a `push` on a local array no one reads, a value read only through `.length`, a
   duplicate `Map.set`, `t > 1` against `t >= 1` where both return 1 at t = 1). W3's threshold, "caught share rises by
   at least 20 points on the pair corpus", cannot be met there: at most 9.6 points are open, fewer once the equivalent
   mutants are taken out. The census sample (70.8% caught, 25.4% escaped) is where the room is.
2. **Lane B finds almost every witness.** Of 6,142 caught: the seeded type-directed draw 3,068, the boundary walk 1,318,
   enumerated heaps 1,182, method programs 498, listed values 13, environment and race programs 23, other 28 (a
   witness shape `foundBy` does not name, all on rendered components: readme_search, finite_components,
   jsx_handlers_symbolic); lane A's doubles counterexample 12.
3. **The escapes sit behind the doubles reading and the identity check, not behind a failed lemma.** Of 755
   PASS-bounded escapes, lane A said `ASK:doubles-unknown` on 391 (the unit bears numbers and the floating-point query
   was unknown), `ASK:identity` on 197 (168 of them in the census sample), `ASK:unproved` on 79, a bare `ASK` on 56 and
   `ASK:translation-defect` on 32. W3a's counterexample answers the failed lemma, so its reach on this table is the 79
   at most; the doubles reading's unknowns are the largest class, and W3c's search (lane B, before lane A) is the
   source that can reach them.

The 20 slowest checks of each run are in the timing files (lane/w3b-mutant-study-result.md): on the pairs, the promise
and microtask pairs' dropped effects (ASK after 130 to 764 s); in the census sample, one unit, `workdayUtcMs` in snitch's
event generator (16 of its sites among the 20).

### Missing site kinds (exec/mutate.mjs, not changed here)

mutate.mjs plants no change of: a boolean literal (`true` to `false`); `null` or `undefined` for a value; a dropped
assignment or property write (`this.f = v;`: dropped-effect removes call statements only); a compound assignment
(`+=` to `-=`); `/`, `%`, `**`, `==`, `!=`, `??` and the bitwise operators (FLIP holds `< <= > >= === !== + - * && ||`);
a unary `!` or `-` removed; a template literal (a no-substitution template is not a StringLiteral); `changed-return`
for an object, array or union return. The study counts what mutate.mjs plants; DA-Bench's M component inherits the
same gaps.

### Determinism, measured

A second run of every pair site the first run did not catch and of 100 it caught (646 sites, `--recheck`, the same
tree, six hours later at another load) gave 646 rows byte-equal to the first run's. The fixture study run twice gives
byte-equal JSON.

### The study on W3a and W3c (pair corpus, 2026-11-01)

Both lanes act only after lane B's draws agree, so the delta is read on the 546 pair sites the baseline did not catch,
plus 100 caught sites as the regression check (`--recheck`, `--delta`):

| branch | gains | regressions | caught share | check time on the same sites |
| --- | ---: | ---: | ---: | ---: |
| w3c-search-inputs 057bcfb5 (LEAN_SEARCH=1) | 17, all `search` | 0 of 100 | 90.4% to 90.7% | 0.93x |
| w3a-counterexample 9522c28a | 7, all `counterexample`, all replayed (0 false witnesses) | 0 of 100 | 90.4% to 90.5% | 1.06x (one unit, 6 sites, excluded: it ran past 2,400 s) |

The census sample's rechecks: lane/w3b-mutant-study-result.md. On the pairs, the 20-point rise W3 asks for does not
fit: at most 9.6 points are open, and at least 14 of the 105 proved escapes are equivalent mutants.

### Repeating it

`--recheck lane/w3b-mutant-study/baseline.json --source pairs --plus-caught 100` on a worktree of a branch (the runner
copied in), then `--delta`: about an hour at --jobs 4 under this machine's load. A new pair or a changed unit shows as
`site-moved` or is absent from the before-study: the recheck covers the baseline's population only. Rows written from
eb7acc14 on also name the edited lines (`lines`), the M component's truth for DA-Bench (file, lines, kind).
