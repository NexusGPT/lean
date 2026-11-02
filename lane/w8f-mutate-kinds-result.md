# Lane w8f-mutate-kinds: result

Branch `lane/w8f-mutate-kinds`, cut from lead-v4 844ddac2. Three commits: b75c233d (the kinds, the lines, the fixture, the
runner's `--kinds`), 772b9eb4 and 92ac5917 (two exact equivalence classes of the coalesce kind taken out, each with its
red-first fixture). No change under `langs/ts/translate/` or `langs/ts/lint/` (`git diff 844ddac278 HEAD -- langs/ts/translate
langs/ts/lint | wc -l` → `0`). lead-v4 has moved since (0b260f05: w1m, w7a, w8g); `git merge-tree --write-tree HEAD lead-v4`
exits 0, and none of those commits touch the files below.

## What landed

| file | what |
| --- | --- |
| `langs/ts/exec/mutate.mjs` | eleven later site kinds; `lines` on every site; `--list` prints `lines` |
| `langs/ts/tests/mutants.mjs` | `KINDS` holds the later kinds; a row's `lines` is the site's own; `--kinds a,b` plants only those kinds |
| `langs/ts/tests/mutants-fixture.mjs` | every fixture pair and unit (not two hard-coded units); every `KINDS` kind has a site; a later kind's `was` is the file's text and its mutant is `text[:start] + text + text[end:]`; the two equivalence exclusions; `--break [kind]` |
| `langs/ts/tests/fixtures/mutants/new_kinds/` | one unit per later kind (15 units with `two_units`, 83 sites, every one caught) |
| `lane/w8f-mutate-kinds/` | every study file below, the site dumps and the two scripts that compare them |

The later kinds, each a site kind with `was` = the file's text in `[start, end)` (so DA's materialiser's
`before[:start] + text + before[end:]` is the mutant; the fixture asserts it for every later site):

| kind | edit |
| --- | --- |
| boolean | `true` ↔ `false` |
| nullish | a returned value, a variable's initializer, the argument of a required parameter, the value of a required property → `undefined` (`null` where the expected type admits null, not undefined); only where the expected type admits one |
| dropped-assignment | an `=`, compound-assignment, property-write or `++`/`--` statement removed (`;` where it is the whole body of an if or a loop) |
| compound | `+= -= *= /= %= **= <<= >>= >>>= &= \|= ^= &&= \|\|= ??=` flipped |
| arithmetic | `/ % **` → `*` |
| equality | `==` ↔ `!=` |
| coalesce | `??` → `\|\|`, except where the two are equal (below) |
| bitwise | `&` ↔ `\|`, `^` → `&`, `<<` ↔ `>>`, `>>>` → `>>` |
| unary | a prefix `! - ~` removed (in `!!x` the inner one only: both give the same text) |
| template | a template literal gets the suffix `x` |
| object-return | a returned array → `(e).slice(1)`; a returned object literal loses its last property |

**The old kinds keep their bytes.** The later sites are listed after the first eight kinds' sites (each group in source
order), so an old site keeps its index: DA's existing sites docs, the w3b rows and `exec/fakes/web/measure.mjs`'s
indices name the same sites. The old kinds' code is unchanged.

**Equivalent mutants found by reading, and the structural rules that came out of them** (no rule names a pair):
- `tags.join(",")` → `tags.join(undefined)` (the fixture's first run, PASS-bounded) and `xs.slice(undefined, 2)`:
  undefined passed to an optional, defaulted or rest parameter, or as an optional property, is the receiver's default.
  nullish takes only required parameters and required properties (264 → 85 sites over the pairs).
- `o.tags.at(0) ?? ""` → `|| ""` (heap5_arrays firstTag, PASS-proved): on a string, the only falsy value `||` also
  replaces is `""`. No coalesce site for `s ?? ""` on a string or `b ?? false` on a boolean (772b9eb4; 86 → 72 sites).
- `(build.vars ?? [])`, `(xs ?? [0])`, `(g.config ?? {...})` (all-pairs run): an object is never falsy. No coalesce
  site where the left side without null and undefined is an object (92ac5917; 72 → 69 sites). `any`, type parameters
  and intersections keep their site.
- Kept on purpose: `x ?? 0` on a number differs at NaN and -0 (27 of the 40 coalesce escapes, below).

## Validators, verbatim

The fixture (from `langs/ts`; `export LEAN_WORKER_HEAP_MB=6144`):

    node tests/mutants-fixture.mjs                     -> mutants fixture: 83 sites of 15 units, 19 kinds, every one planted and caught (lane B)    (exit 0, at 92ac5917)

`--break` per kind (each: `exit=1 AssertionError [ERR_ASSERTION]: every site mutate.mjs lists is a row of the study, in
its order`; `lane/w8f-mutate-kinds/breaks.log`): the default (dropped-effect), boolean, nullish, dropped-assignment,
compound, arithmetic, equality, coalesce, bitwise, unary, template, object-return: 12 of 12 red, run at b75c233d's
fixture (80 sites); `--break coalesce` again at 772b9eb4's: red, the same line.

The two coalesce exclusions, red first (the exclusion's line replaced in place, the fixture run, `git checkout`):

    without s ?? "" exclusion   -> exit=1 AssertionError [ERR_ASSERTION]: orEmpty (s ?? "" on a string) has no coalesce site
    without object exclusion    -> exit=1 AssertionError [ERR_ASSERTION]: sizeOf (xs ?? [] on an array) has no coalesce site

The old kinds, byte-equal:
- every site of every unit of every pair (331 pair dirs; `dump-sites.mjs` before at 844ddac2 and after at 92ac5917,
  `cmp-sites.py`): `old-kind entries before 6566 after 6566 equal True` (kind, start, end, was, text, index: equal;
  `lines` is the one field added), `after entries without lines 0`, `old site after a new one in a unit 0`.
- the fixture study (`two_units`, check.mjs verdicts included): the 16 old-kind rows are byte-equal in every field but
  `sites` (the unit's site count: `total` 7 → 8, its new dropped-assignment site, caught); meta equal but the head.
  A row's `sites` counts every kind, so it cannot stay the same in a unit that gains a later site.

    node langs/ts/tests/withdrawal.mjs   -> withdrawal: logic-values v1 refused identically by the lint, the translator and the record; check PASS-bounded (lane A ASK) under the withdrawal, PASS-proved without; audit 600 site rows, 0 uncatalogued    (exit 0)

## The 30-pair run

The 30 pairs: those with a later-kind site (230), ordered by sha256 of `1\0<pair>`, the first 30
(`lane/w8f-mutate-kinds/pairs30.txt`). `node tests/mutants.mjs --pair <the 30> --jobs 4 ...`, every kind.

| kind | planted | caught | escaped | ASK | not planted |
| --- | ---: | ---: | ---: | ---: | ---: |
| boolean | 7 | 7 | 0 | 0 | 0 |
| nullish | 23 | 22 | 1 | 0 | 0 |
| dropped-assignment | 51 | 51 | 0 | 0 | 5 |
| compound | 20 | 20 | 0 | 0 | 0 |
| arithmetic | 6 | 6 | 0 | 0 | 0 |
| equality | 2 | 2 | 0 | 0 | 5 |
| coalesce | 10 | 6 | 4 | 0 | 0 |
| bitwise | 0 | 0 | 0 | 0 | 0 |
| unary | 9 | 9 | 0 | 0 | 0 |
| template | 12 | 11 | 1 | 0 | 0 |
| object-return | 20 | 19 | 1 | 0 | 5 |
| later kinds | 160 | 153 (95.6%) | 7 | 0 | 15 |
| the first eight kinds | 632 | 589 (93.2%) | 40 | 3 | 53 |
| **all** | **792** | **742 (93.7%)** | **47** | **3** | **68** |

(run 3, at 772b9eb4; 92ac5917 changes no site of these 30 pairs. `pairs30-run3.md` is the runner's own table.)

The seven later-kind escapes, read: equivalent, `newId` (template in a branch a UUID never takes: five groups, not
four), `envLeak` (`.slice(1)` of a list the worker's env makes empty), `visits` (`Number("")` and `Number("0")` are
both 0), `orDefault` (`(x ?? "B") === "A"`: every falsy x is false either way); not equivalent, `readme_ledger`
applyAll and rollback (`balances.get(a) ?? 0` → `|| 0`: a NaN or -0 balance), `fake_storage theme` (`getItem("mode")`
→ `null`: lane B's store draw never held "mode").

**Determinism.** Run 1 (13:28, load 56.9) and run 2 (14:02, load 61.1) at b75c233d: `cmp` of the JSON → exit 0, of the
report → exit 0 (861 rows). Run 3 at 772b9eb4 (14:54, load 75.0): 857 of 857 rows outside `heap5_arrays firstTag`
byte-equal to run 1; `firstTag` lost only its coalesce site (PASS-proved, the equivalent `?? ""`).

**What the benchmark gains, measured.** On the 30 pairs the injected-regression population rises from 632 planted
mutants (the first eight kinds) to 792 (+160, +25%), of which lean catches 742 (93.7%; 93.2% before). Over all pairs,
1,201 later-kind mutants are planted (below) beside the first kinds' 5,661 of the w3b baseline.

## Every later-kind site of every pair

`node tests/mutants.mjs --kinds boolean,nullish,dropped-assignment,compound,arithmetic,equality,coalesce,bitwise,unary,template,object-return --jobs 4`
(15:23, load 49.5, at 772b9eb4; 3,823 s), with the three pairs 92ac5917 changes (cause_callee_pattern, empty_literals,
module_forms) rerun at 92ac5917 (16:50, load 48.2): their 19 kept rows equal to the first run's, index and `sites` aside,
the three removed sites the three object-left coalesces (two PASS-bounded, one PASS-proved). `allpairs-later-final.json`.

| kind | planted | caught | PASS-bounded | PASS-proved | ASK | other | caught | not planted |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| boolean | 102 | 99 | 3 | 0 | 0 | 0 | 97.1% | 2 |
| nullish | 84 | 63 | 17 | 4 | 0 | 0 | 75% | 1 |
| dropped-assignment | 419 | 378 | 11 | 10 | 19 | 1 | 90.2% | 54 |
| compound | 119 | 109 | 4 | 2 | 4 | 0 | 91.6% | 9 |
| arithmetic | 30 | 29 | 1 | 0 | 0 | 0 | 96.7% | 0 |
| equality | 9 | 9 | 0 | 0 | 0 | 0 | 100% | 16 |
| coalesce | 67 | 27 | 36 | 4 | 0 | 0 | 40.3% | 2 |
| bitwise | 23 | 23 | 0 | 0 | 0 | 0 | 100% | 0 |
| unary | 113 | 107 | 2 | 3 | 1 | 0 | 94.7% | 7 |
| template | 81 | 75 | 5 | 1 | 0 | 0 | 92.6% | 0 |
| object-return | 154 | 149 | 5 | 0 | 0 | 0 | 96.8% | 40 |
| **all** | **1,201** | **1,068** | **84** | **24** | **24** | **1** | **88.9%** | **131** |

Coalesce's 40 escapes: 27 are `x ?? 0` on a number (`|| 0` differs at NaN and -0, inputs lane B rarely puts in a map
or record), 13 others (`?? 1`, `?? d`, `?? "y"`: a 0 or "" lane B did not draw; `response?.data ?? []` with `data: any`;
`fake_storage visits`, `open_key_read orDefault` equivalent by their context).

## Load gate, deviations

Run 3 started at load 75.0, and the two fixture runs of 92ac5917 (red and green) at 87.7 and 87.1: above 64. My wait
loop guarded the later runs only. Run 3's rows are byte-equal to run 1's (load 56.9), so this run's verdicts did not move.

## Open

1. **DA maps no later kind yet.** `research/open-code-review/d3/bench/build.py` `MUTATION` has the first eight; a kind
   it does not map is skipped (`MUTATION.get(s['kind']) is None`), so DA's choices are unchanged until it adds them
   (and bumps `SITES_VERSION`). DA's `sites.mjs --list` passes `start`/`end`/`was`/`text` through; `lines` is new.
2. **`measure.mjs` (fakes, web) plants indices 0..K-1**: a unit that had fewer than K sites may now get a later-kind
   mutant there, and a refused last old site moves on to a later site instead of wrapping to site 0. The old indices
   name the same sites; its population grows.
3. **Lane B gaps the later kinds show** (not this lane's files): `x ?? 0` at NaN/-0 (27), a 0 or "" behind `??` (6),
   localStorage "mode" never drawn (fake_storage theme).
4. **Escapes not read**: nullish 21, dropped-assignment 21 PASS (10 PASS-proved) and 19 ASK, compound, unary, template,
   object-return: the rows are in `allpairs-later-final.json`.
5. **Not planted, by kind**: dropped-assignment 54 and object-return 40 the most (a dropped write that leaves a variable
   possibly unassigned, an object literal's required last property: type errors, so mutate.mjs skips them).
6. **The census sample was not run with the later kinds** (the pairs only).
7. **The fixture test is not a suite row** (tests/run.mjs; w3b's open item 7).
