# Lane w9z-lean-hygiene: result

Branch `lane/w9z-lean-hygiene` (lean), cut from `lead-v4` 547d179767. A second branch of the same name in the DA repo
(`/root/da-lanes/w9z-lean-hygiene/tree`, cut from `lead-da` 5832d9c572) carries the DA half of row 3. Nothing was
pushed. There were no benchmark runs, no `hour.py` and no 75. Every command ran at `nice -n 15`. `npm ci` in
`langs/ts` doesn't apply: there's no `package.json` (TypeScript is vendored in `langs/ts/vendor/typescript`).

| row | state | commit |
| --- | --- | --- |
| 1. z3 4.12.1 and the C locale | landed, red first | lean e01172c728 |
| 2. the 93 unread proved mutants | already closed by lane w8g (on lead-v4): 107 of 107 equivalent, 0 unsound; 30 re-read here, all agree; no pair owed | none |
| 3. mutate.mjs later kinds | the generator's kinds were already landed by lane w8f (lean b75c233dc2); the DA sites stage now offers them (the later set) | DA 38aff26afd |

## Row 1: the pin

**What landed.**
- `langs/ts/solve/pin.mjs`: `pinProblems({z3Version, env})` names a Z3 other than 4.12.1 (the version number, so 4.12.10
  is not 4.12.1) and an `LC_ALL` other than `en_US.UTF-8` or `C.UTF-8` (`utf8` spellings accepted). An unset
  `LC_ALL` is also refused: `LC_ALL` overrides every `LC_` category, `LANG` doesn't, so `LANG=en_US.UTF-8` with
  `LC_NUMERIC=fr_BE.UTF-8` still gives Dafny the decimal comma. `checkPin` reads the Z3 that `solve/z3.mjs` resolves
  (the one Dafny and the certificate use), not the `z3` on PATH.
- `tests/run.mjs` refuses at startup (exit 2, naming the version and the locale found, before any child or temp dir).
  `LEAN_PIN=warn` runs anyway with the warning. A suite child (`--result`) inherits its parent's checked environment
  and isn't checked again.
- `pr.mjs` warns first and runs. It's the product, and its certificate already names the Z3 that ran.
- `Dockerfile`: `ENV LC_ALL=C.UTF-8`, so the image meets the pin. Both READMEs state the pin and the measured reasons.
- `tests/pin.mjs` (suite row `pin`): fake Z3 scripts per version, so the test holds on the Mac too. It checks the
  check's cases, run.mjs refusing on each value, run.mjs under `LEAN_PIN=warn`, run.mjs passing under the pin, and
  pr.mjs's warning as its first stderr line.

**Validators, verbatim.**

On 547d179767 (red):

    $ node tests/pin.mjs
    pin: 5 wrong
      solve/pin.mjs: Cannot find module '/root/lanes/w9z-lean-hygiene/tree/langs/ts/solve/pin.mjs' imported from /root/lanes/w9z-lean-hygiene/tree/langs/ts/tests/pin.mjs
      run.mjs under z3 5.3.2: exit 1,     at Object.readFileSync (node:fs:483:20) /     at runPairStep (file:///root/lanes/w9z-lean-hygiene/tree/langs/ts/tests/run.mjs:111:29) /     at file:///root/lanes/w9z-lean-hygiene/tree/langs/ts/tests/run.mjs:453:9
      run.mjs under LC_ALL=fr_BE.UTF-8: exit 1,     at Object.readFileSync (node:fs:483:20) /     at runPairStep (file:///root/lanes/w9z-lean-hygiene/tree/langs/ts/tests/run.mjs:111:29) /     at file:///root/lanes/w9z-lean-hygiene/tree/langs/ts/tests/run.mjs:453:9
      run.mjs under LEAN_PIN=warn: exit 1,     at Object.readFileSync (node:fs:483:20) /     at runPairStep (file:///root/lanes/w9z-lean-hygiene/tree/langs/ts/tests/run.mjs:111:29) /     at file:///root/lanes/w9z-lean-hygiene/tree/langs/ts/tests/run.mjs:453:9
      pr.mjs under z3 5.3.2 and fr_BE: exit 2, usage: pr.mjs --repo <checkout> --base <ref> [--head <ref|WORKTREE>] [--scope f,Class.m,file.ts:f] [--units path::unit,unit] [--preview] [--out report.md] [--json report.json]
    exit=1

After (green):

    $ node tests/pin.mjs
    pin: run.mjs refuses and pr.mjs warns on a Z3 other than 4.12.1 and an LC_ALL other than en_US.UTF-8 or C.UTF-8
    exit=0

A pair under the pin and in this machine's default shell (`LANG=en_US.UTF-8`, `LC_ALL` unset). `run.mjs` reads
`JOBS`, not `--jobs`, so both were given:

    $ node tests/run.mjs --pair absent_number --jobs 1
    lean: tests/run.mjs refuses to run off the pin
      LC_ALL is unset, the pin is en_US.UTF-8 or C.UTF-8 (export LC_ALL=en_US.UTF-8)
      (LEAN_PIN=warn runs anyway, with this warning)
    exit=2
    $ LEAN_Z3=/opt/dafny/z3/bin/z3-4.12.1 LC_ALL=en_US.UTF-8 JOBS=1 node tests/run.mjs --pair absent_number --jobs 1
    | TOTAL | 15 checks | ALL PASS |
    exit=0

**What it changes for the lead.** After this merge, a suite run without `LC_ALL` set is refused, and the refusal says
what to export. Lead runs that already set `LEAN_Z3` and `LC_ALL=en_US.UTF-8` (as the brief does) are unaffected.

## Row 2: the 93 unread proved mutants

Lane w8g (`lane/w8g-proved-mutants-result.md`, on lead-v4) already read all 107 PASS-proved rows of the w3b baseline,
the 93 unread ones included: 107 equivalent, 0 unsound, each with its reason. Its recheck had all 105 pair rows still
PASS-proved at 844ddac2. So no pair was owed and none is opened here.

To check it rather than take it on trust, I re-read 30 of the 107 against the re-planted unit text in
`lane/w8g-proved-mutants/sites.txt`. I picked the "same value" claims, the ones that rest on a declared type, and the
ones that look wrong at first sight:
- #65: the unit uses `hasOwnProperty`, not `in`, so `'toString'` is not seen through the prototype.
- #98: `positive` gives 1 at n = 1 both ways.
- #95: `Math.ceil` and `Math.floor` agree at 0, at -0 and at NaN.
- #45: `dropTwo` leaves the same array.
- #94: a computed `__proto__` key is an own property.
- #100: `lastIndexOf` clamps its fromIndex.

All 30 agree (column "re-read here"). No mutant is unclear.

Not done: a recheck at 547d179767. That's a 105-mutant run, so it falls under the no-benchmark rule. The proofs were
last confirmed at 844ddac2.

| id | where | unit | site | kind | verdict | reason (w8g) | re-read here |
| ---: | --- | --- | ---: | --- | --- | --- | --- |
| 0 | src/theme/launcher.ts | launcherAnchor | 0 | string | equivalent | same value: `"x"` includes neither "bottom" nor "right", as `""` does not |  |
| 1 | apps/extension/src/lib/selector.ts | isSecureField | 12 | string | equivalent | same value: `"x"` includes no "password" and is neither "cc-number" nor "cc-csc", as `""` |  |
| 2 | adapters | usePick | 2 | operator | equivalent | same value: at n = 0 (and -0) `pick(n, flag)` is 0 whichever the flag (`flag ? x : 0`), and +1 erases the sign | agree |
| 3 | alias_result | Box.grown | 0 | dropped-effect | equivalent | no observable effect: `copy()` is `fresh()`, a spread copy of `this.list`; the push lands on a local no one reads |  |
| 4 | alias_result | counts | 0 | dropped-effect | equivalent | no observable effect: `xs` is `rs.map(..)`, a new array; the result is `k + 1`, k taken before the push |  |
| 5 | alias_result | counts | 1 | boundary | equivalent | no observable effect: the pushed value goes to the local copy, never read |  |
| 6 | array_copies_identity | copyPushedA | 0 | dropped-effect | equivalent | no observable effect: `b = a.concat()` is a new array; the function returns `a` |  |
| 7 | array_copies_identity | copyPushedS | 0 | dropped-effect | equivalent | no observable effect: as #6 (sync) |  |
| 8 | asany_record_key | countByString | 0 | dropped-effect | equivalent | no observable effect: `m` is local and never read; `String(r1)` of a plain record has no effect; returns 1 |  |
| 9 | asany_record_key | countByString | 2 | boundary | equivalent | no observable effect: a value in the local map `m`, never read |  |
| 10 | asany_record_key | countByString | 3 | dropped-effect | equivalent | no observable effect: as #8 |  |
| 11 | asany_record_key | countByString | 5 | boundary | equivalent | no observable effect: as #9 |  |
| 12 | builtin_transitions | tallied | 2 | boundary | equivalent | dead code: after `counts.has(key)` the `get` of a `Map<string, number>` is a number, never nullish, so `?? 0` never applies | agree |
| 13 | comma_operator | rootMessage | 0 | boundary | equivalent | same value: `i = 1` and `i = 0` both fail `i < 0`; the loop never runs | agree |
| 14 | comma_operator | rootMessage | 4 | changed-return | equivalent | dead code: the return inside the loop that never runs (`i < 0`) |  |
| 15 | conditional_expressions | fallback | 1 | boundary | equivalent | dead code: `n`'s initial value is overwritten on both branches before it is read |  |
| 16 | dynamic_key | putChecked | 0 | string | equivalent | no observable effect: `out` is local; the result reads only `out[k]` after `out[k] = 0` (k = "__proto__" returns earlier) | agree |
| 17 | dynamic_key | putChecked | 6 | boundary | equivalent | same value: `out[k]` is 1 or 0, neither is null; both return 0 | agree |
| 18 | dynamic_key | putChecked | 8 | boundary | equivalent | dead code: `out[k] === null` is never true after `out[k] = 0` | agree |
| 19 | dynamic_key | putItem | 0 | string | equivalent | no observable effect: `out` is local; the result reads `out[k]` after `out[k] = null` |  |
| 20 | dynamic_key | putItem | 8 | boundary | equivalent | dead code: `out[k] === null` is always true after `out[k] = null` |  |
| 21 | dynamic_key_open | agentOf | 0 | string | equivalent | same value: `copy` holds only `accept`; both keys read undefined (no Object.prototype member of either name) | agree |
| 22 | dynamic_key_open | protoText | 2 | boundary | equivalent | dead code: `d["valueOf"]` is Object.prototype.valueOf, never nullish, so `?? 0` never applies | agree |
| 23 | exceptions_across | moved | 3 | string | equivalent | no observable effect: the thrown value is discarded by `catch (error) { return -2; }` |  |
| 24 | exceptions_across | overrideFault | 0 | string | equivalent | no observable effect: `finally { throw "finish" }` replaces the thrown value |  |
| 25 | exceptions_across | parseCaller | 1 | changed-return | equivalent | dead code: `parseText` is `return 1`, never throws; the catch never runs |  |
| 26 | exceptions_across | parseCaller | 2 | boundary | equivalent | dead code: as #25 |  |
| 27 | exceptions_scope | caller | 1 | changed-return | equivalent | dead code: `helper(xs)` (a sum and a map over number[]) never throws; the catch never runs |  |
| 28 | exceptions_scope | caller | 2 | boundary | equivalent | dead code: as #27 |  |
| 29 | exceptions_scope | helper | 1 | operator | equivalent | no observable effect: `doubled` is read only through `.length` |  |
| 30 | exceptions_scope | helper | 2 | boundary | equivalent | no observable effect: as #29 |  |
| 31 | exceptions_scope | switchFallback | 12 | changed-return | equivalent | dead code: the try body (comparisons and returns) never throws |  |
| 32 | exceptions_scope | switchFallback | 13 | boundary | equivalent | dead code: as #31 |  |
| 33 | forin_order | inHeader | 1 | boundary | equivalent | no observable effect: for-in reads only the keys (y, z), not the value of y | agree |
| 34 | forin_order | written | 0 | boundary | equivalent | no observable effect: `o.a` is overwritten before any read; the key order b, a is the same | agree |
| 35 | gen_walk | clampUnit | 6 | operator | equivalent | same value: at t = 1 both return 1 (the guard's 1, or t) |  |
| 36 | generators | counted | 0 | boundary | equivalent | same value: at i = 0 the loop yields nothing (`if (i > 0)`); both yield n+1, n+2 | agree |
| 37 | heap5_conditional | count | 1 | operator | equivalent | same value: `length >= 0` is always true; at length 0 both arms give 0 | agree |
| 38 | lane_b_reach | nullPrototype | 3 | operator | equivalent | same value: `a: typeof ONE` is a non-null object, so `typeof a === 'object'` and `a !== null` are both true; && and \|\| agree | agree |
| 39 | library_cells | freshMap | 0 | dropped-effect | equivalent | no observable effect: the map is local; a duplicate `set("a", 1)`, the size is 1 either way |  |
| 40 | library_cells | freshMap | 3 | boundary | equivalent | no observable effect: the first value is overwritten by the second set; the result reads only the size |  |
| 41 | library_cells | freshMap | 4 | dropped-effect | equivalent | no observable effect: as #39 |  |
| 42 | library_cells | freshMap | 7 | boundary | equivalent | no observable effect: the result reads only the size |  |
| 43 | library_cells | tally | 0 | dropped-effect | equivalent | no observable effect: `set(key, n)` twice equals once (same entry, same position, same size) | agree |
| 44 | library_cells | tally | 2 | dropped-effect | equivalent | no observable effect: as #43 |  |
| 45 | library_ops | dropTwo | 2 | boundary | equivalent | same value: `splice(1,1); splice(0,1)` removes the first two elements as `splice(0,1)` twice does (length 1: both empty it; 0: no-op); same array, same length | agree |
| 46 | library_rows | basename | 3 | string | equivalent | dead code: `split("/")` gives at least one element, so `at(-1)` is never undefined | agree |
| 47 | library_rows | cut | 1 | swapped-args | equivalent | same value: `substring` swaps its arguments when start > end (ECMA-262 22.1.3.25) | agree |
| 48 | lint_misfires | assignments | 3 | swapped-args | equivalent | no observable effect: `sets` and `params` are local; the result reads only their lengths |  |
| 49 | lint_misfires | assignments | 4 | string | equivalent | no observable effect: as #48 |  |
| 50 | lint_misfires | assignments | 5 | string | equivalent | no observable effect: as #48 |  |
| 51 | lint_misfires | assignments | 6 | string | equivalent | no observable effect: as #48 |  |
| 52 | lint_misfires | assignments | 8 | swapped-args | equivalent | no observable effect: as #48 |  |
| 53 | lint_misfires | assignments | 9 | string | equivalent | no observable effect: as #48 |  |
| 54 | lint_misfires | assignments | 10 | string | equivalent | no observable effect: as #48 |  |
| 55 | lint_misfires | assignments | 11 | string | equivalent | no observable effect: as #48 |  |
| 56 | lint_misfires | blockShadow | 2 | operator | equivalent | dead code: `x` is the constant 2; `2 >= 5` is false as `2 > 5` |  |
| 57 | lint_misfires | blockShadow | 3 | boundary | equivalent | dead code: `2 > 6` is false as `2 > 5` |  |
| 58 | lint_misfires | blockShadow | 4 | changed-return | equivalent | dead code: the return under `2 > 5` |  |
| 59 | lint_misfires | blockShadow | 5 | boundary | equivalent | dead code: as #58 |  |
| 60 | lint_misfires | rebound | 0 | negated-if | equivalent | same value: with g the result is the length of a copy of `merged`, without g the length of `merged`: equal either way | agree |
| 61 | lint_misfires | rebound | 2 | operator | equivalent | no observable effect: the pushed values are read only through `.length` |  |
| 62 | lint_misfires | rebound | 3 | boundary | equivalent | no observable effect: as #61 |  |
| 63 | map_set_copy | bumpCopy | 4 | boundary | equivalent | dead code: `m.get(t)` right after `m.set(t, 1)` is 1, never nullish | agree |
| 64 | mutation | countOnly | 0 | boundary | equivalent | no observable effect: `u` is a spread copy; the write lands on it and the function returns `user.visits` |  |
| 65 | narrow_in | inherited | 2 | string | equivalent | same value: `r = { a: n }` owns only `a`; neither "toString" nor "toStringx" is an own key | agree |
| 66 | narrow_in | known | 0 | boundary | equivalent | no observable effect: `in` reads the keys of `r`, not the values |  |
| 67 | narrow_in | known | 1 | boundary | equivalent | no observable effect: as #66 |  |
| 68 | numbers_bits | infinitySign | 0 | changed-return | equivalent | same value: -Infinity + 1 is -Infinity |  |
| 69 | object_accessor_faults | ChangedFault.read | 0 | changed-return | equivalent | dead code: the getter `value` always throws (`throw "after"`), so the return expression never completes |  |
| 70 | object_accessor_faults | ChangedFault.read | 1 | operator | equivalent | dead code: as #69 |  |
| 71 | object_accessor_faults | ChangedFault.read | 2 | boundary | equivalent | dead code: as #69 |  |
| 72 | object_accessor_faults | Fault.caught | 0 | changed-return | equivalent | dead code: the getter always throws; the catch returns 4 in both |  |
| 73 | object_accessor_faults | Fault.read | 0 | changed-return | equivalent | dead code: `const n = this.value` always throws before the return |  |
| 74 | object_accessor_faults | Fault.read | 1 | boundary | equivalent | dead code: as #73 |  |
| 75 | object_accessor_faults | Fault.write | 0 | changed-return | equivalent | dead code: the setter always throws (`throw "setter"`) before the return |  |
| 76 | object_accessor_faults | Fault.write | 1 | boundary | equivalent | dead code: as #75 |  |
| 77 | object_methods | strategyRefactor | 0 | changed-return | equivalent | no observable effect: `strategy` is local and never used; returns n + 2 |  |
| 78 | object_methods | strategyRefactor | 1 | operator | equivalent | no observable effect: as #77 |  |
| 79 | object_methods | strategyRefactor | 2 | changed-return | equivalent | no observable effect: as #77 |  |
| 80 | object_methods | strategyRefactor | 3 | operator | equivalent | no observable effect: as #77 |  |
| 81 | open_datatype | agentOf | 0 | string | equivalent | same value: as #21 (the same unit in another pair) |  |
| 82 | operators_values | argumentsInOrder | 0 | boundary | equivalent | no observable effect: `i` is never read after `i += 1`; returns `sink.put(old, old)` |  |
| 83 | operators_values | chained | 2 | operator | equivalent | same value: a, b and v are all 0 (+0): `0 - 0 + 0` is +0 as `0 + 0 + 0` |  |
| 84 | operators_values | chained | 3 | operator | equivalent | same value: `0 + 0 - 0` is +0 |  |
| 85 | operators_values | compound | 0 | boundary | equivalent | no observable effect: `i` is overwritten (`i = old + old`) before it is read |  |
| 86 | ordered_collections | orderOf | 2 | boundary | equivalent | no observable effect: the result reads only the keys of `m`, not the values |  |
| 87 | ordered_collections | orderOf | 5 | boundary | equivalent | no observable effect: as #86 |  |
| 88 | promise_integration | innerCatch | 2 | changed-return | equivalent | dead code: `await Promise.resolve(7)` never rejects; the catch never runs |  |
| 89 | promise_integration | innerCatch | 3 | boundary | equivalent | dead code: as #88 |  |
| 90 | proto_write | mark | 0 | boundary | equivalent | no observable effect: `d` is local (on "__proto__" the primitive write is ignored); returns 1 |  |
| 91 | proto_write | named | 0 | string | equivalent | same value: the same const key is written and tested; own key either way, 1 | agree |
| 92 | proto_write | named | 3 | boundary | equivalent | dead code: `hasOwnProperty(d, key)` is always true after `d[key] = ..` | agree |
| 93 | proto_write | own | 0 | boundary | equivalent | no observable effect: the result tests only that the key is own, not its value |  |
| 94 | proto_write | own | 3 | boundary | equivalent | dead code: a computed key (`[k]`, also "__proto__") always makes an own property, so the else arm never runs | agree |
| 95 | pure_globals | chopped | 1 | operator | equivalent | same value: at ratio 0 (and -0) `Math.ceil` and `Math.floor` agree; NaN fails both comparisons | agree |
| 96 | push_apply | local | 0 | string | equivalent | no observable effect: the result reads only `a.length` |  |
| 97 | read_shaped_inputs | clampLimit | 1 | operator | equivalent | same value: at limit = 100 both return 100 |  |
| 98 | signed_zero | positive | 1 | operator | equivalent | same value: at n = 1 both return 1 | agree |
| 99 | splice_negative | trimEnd | 3 | boundary | equivalent | same value: from index length-1 at most one element exists, so delete count 2 removes what 1 does (empty: none) | agree |
| 100 | string_methods | ext | 2 | operator | equivalent | same value: `lastIndexOf(".", length - 1)` already covers every start of a 1-char match; length+1 is clamped to length (empty: -1 both) | agree |
| 101 | string_methods | ext | 3 | boundary | equivalent | same value: length+2 is clamped to length as length+1 |  |
| 102 | string_methods_real | tail | 2 | operator | equivalent | same value: as #100 with "/" |  |
| 103 | string_methods_real | tail | 3 | boundary | equivalent | same value: as #101 with "/" |  |
| 104 | string_union_order | dropped | 0 | boundary | equivalent | no observable effect: `t.n` is never read; the result compares `level` | agree |
| 105 | ts_strict_values | isAdaTag | 0 | string | equivalent | same value: `"X"` (the upper case of "x") is not "ADA", as `""` is not | agree |
| 106 | type_tests | refactor | 0 | operator | equivalent | no observable effect: `x` is never read; `new A()` and `new B()` only initialise fields | agree |

| class | count |
| --- | ---: |
| equivalent: no observable effect | 49 |
| equivalent: dead code | 30 |
| equivalent: same value | 28 |
| unsound | 0 |
| unclear | 0 |
| **all** | **107** |

## Row 3: the later site kinds, through to the DA-Bench sites stage

**Already landed in lean.** Lane w8f (`lane/w8f-mutate-kinds-result.md`, lean b75c233dc2, 772b9eb4, 92ac5917) gave
`exec/mutate.mjs` the eleven later kinds: boolean, nullish, dropped-assignment, compound, arithmetic (`/ % **`),
equality (`== !=`), coalesce (`??`), bitwise, unary, template and object-return. They're listed after the first kinds,
so old indices hold, and they're deterministic (no randomness; source order). There's a fixture unit per kind
(`tests/fixtures/mutants/new_kinds`, every site planted and caught) and `tests/mutants-fixture.mjs --break <kind>`,
which w8f recorded red for 12 of 12 kinds. w8f's tables also give the kinds' counts over the pairs: 1,201 later-kind
mutants, 88.9 % caught. None of this reads the AACR instances, and none of it uses a model.

**The gap, closed here (DA repo, branch `lane/w9z-lean-hygiene`, 38aff26afd).** `bench/build.py`'s `MUTATION` maps
only the first kinds, so `choose()` skipped every later-kind site and the sites stage never offered them. They now
form the later set (README "M-later"), planned the way M-hard is: `build.py sites --kinds <later kinds>
--mutate-lean <lean ≥ b75c233dc2>` takes three later kinds per PR in source order, no caller, ids `~l1..~l3`, into
`bench/later/`, and `build.py instances --later` builds them. M's plan is unchanged and still takes no later kind, so
the 75 and every M number stay as they are. `--kinds` takes one family (`kinds_plan`): all hard, or all later. A mixed
or unknown list stops the build.

**Validators, verbatim** (from `research/open-code-review/d3/harness`).

The new tests on 5832d9c572 (red), then after:

    $ python3 -I tests/test_bench.py LaterSites
    AttributeError: module 'build' has no attribute 'kinds_plan'
    Ran 5 tests in 21.338s
    FAILED (errors=5)

    $ python3 -I tests/test_bench.py LaterSites
    Ran 5 tests in 274.627s
    OK

    $ python3 -I tests/test_bench.py
    Ran 54 tests in 320.610s
    OK
    exit=0

    $ python3 -I tests/test_bench.py --break later-caller later-into-m later-mixed-family hard-caller
    later-caller       RED (caught)
    later-into-m       RED (caught)
    later-mixed-family RED (caught)
    hard-caller        RED (caught)
    exit=0

One generated mutant per kind, planted through the DA sites stage itself (`bench/sites.mjs <lean /root/lead-v4> k.ts
k --apply <i>`) on the test's fixture `LATER_SRC`:

```text
arithmetic         site  4 line 2: let t = xs.length % 3;
                               => let t = xs.length * 3;
dropped-assignment site  5 line 3: t += -a & 1;
                               => 
compound           site  6 line 3: t += -a & 1;
                               => t -= -a & 1;
unary              site  7 line 3: t += -a & 1;
                               => t += a & 1;
bitwise            site  8 line 3: t += -a & 1;
                               => t += -a | 1;
nullish            site  9 line 4: const v: string | undefined = s ?? "d";
                               => const v: string | undefined = undefined;
coalesce           site 10 line 4: const v: string | undefined = s ?? "d";
                               => const v: string | undefined = s || "d";
equality           site 11 line 5: if (on == false) o.n = t;
                               => if (on != false) o.n = t;
boolean            site 12 line 5: if (on == false) o.n = t;
                               => if (on == true) o.n = t;
template           site 14 line 6: const w = `${t}`;
                               => const w = `${t}x`;
object-return      site 15 line 7: return { t: on ? t : w.length, u: v };
                               => return { t: on ? t : w.length };
kinds planted: 11
```

**The slice's mutant count and kinds table.** Before (the 75 of `bench/runs/2026-11-01-da-attest-dev-slice30-m-render-devtables`,
counted from `bench/instances/<id>.json`): 75 mutants on 23 PRs, 68 changed and 7 caller.

| kind | M (the 75) |
| --- | ---: |
| operator-flip | 12 |
| boundary-shift | 9 |
| string-change | 15 |
| dropped-branch | 13 |
| swapped-arguments | 16 |
| dropped-effect | 7 |
| changed-return | 3 |
| any later kind | 0 (not offered before 38aff26afd) |
| **all** | **75** |

M doesn't change. The later set's count on the slice's 23 PRs needs `build.py sites --kinds <the eleven>
--only <the 23> --jobs 1` for real (checkouts plus mutate.mjs's typecheck; no lean check, no scoring). I asked the
lead on the channel whether to run it beside the full 75 and got no answer, so it wasn't run. That count is open.

## Open

1. Row 3: the later set's sites on the slice's 23 PRs, for the slice's later-kinds count. It's one command, above,
   waiting for the lead's go. Then `instances --later` and the count per kind.
2. Row 2: a recheck of the 105 pair rows at 547d179767 (w8g's was at 844ddac2). It's a run of 105 mutants, so it was
   left for a time the machine is free.
3. Row 1: the lead's own scripts that run `tests/run.mjs` must export `LC_ALL` (the refusal says so). The Mac's
   `LEAN_Z3` must point at a 4.12.1 build.
4. The DA branch is a separate merge into `lead-da` (`/root/da-lanes/w9z-lean-hygiene/tree`, one commit on
   5832d9c572).
