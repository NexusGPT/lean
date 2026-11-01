# Lane w8g-proved-mutants: result

Branch `lane/w8g-proved-mutants`, cut from `lead-v4` 844ddac2. **Result: of the 107 PASS-proved mutants in the w3b
baseline, all 107 are equivalent mutants (the 93 unread ones and the 14 w3b read). None of the proofs is unsound.** So
no pair, translator fix or `LEAN_BREAK` was owed. Nothing under `langs/ts` changed, so no withdrawal, audit,
conformance, proof-hunt or 30-pair regression run was owed either. This lane adds only study files.

## What landed

| file | what |
| --- | --- |
| `lane/w8g-proved-mutants-result.md` | this file, with the 107-row table |
| `lane/w8g-proved-mutants/sites.txt` | every PASS-proved site re-planted at this head: the unit's text with the edit marked `⟦was ⇒ mutant⟧` (what each class below was read from) |
| `lane/w8g-proved-mutants/show.mjs` | writes `sites.txt` (exec/mutate.mjs `sitesOf` on the pair's candidate, or on the census root's file in `/root/da/census/repos`; checks each site's kind and `was` against the baseline row) |
| `lane/w8g-proved-mutants/reasons.py`, `table.py` | the class and reason per row; the table below |
| `lane/w8g-proved-mutants/pairs-recheck.{json,md}` | `tests/mutants.mjs --recheck` of the 105 pair rows at 844ddac2 |
| `lane/w8g-proved-mutants/census-recheck.json` | the two census rows checked by hand |

## How each mutant was classified

1. Re-plant: `node lane/w8g-proved-mutants/show.mjs > sites.txt` (run from `langs/ts`), exit 0. 107 sites, 0 `SITE-MISMATCH`:
   every baseline row's index still names the same kind and text at 844ddac2.
2. Read the parent unit and the mutant. For every reason that rests on a callee or a declared type, I read that code
   too: `object_accessor_faults` (the `Fault` getter and setter and the `ChangedFault` getter always throw), `adapters`
   `pick` (`flag ? x : 0`), `alias_result` `Box.copy` → `fresh` (`[...this.list]`), `exceptions_across` `parseText`
   (`return 1`), `lane_b_reach` `ONE` (`{ x: 1 }`), `type_tests` `A`/`B` (field initialisers only), the `Headers` index
   signature, `proto_write` `Slot = 'x' | '__proto__'`, `narrow_in` `Bag = Record<string, number>`.
3. Each mutant got one of three reasons: **dead code** (the edit is never reached), **same value** (it is reached and
   computes the parent's value on every input of the declared types) or **no observable effect** (it changes only state
   no result or caller can read).

Over the 107: no observable effect 49, dead code 30, same value 28. Not equivalent: 0.

The subtle ones, worked through:

- #45 dropTwo: `splice(1,1); splice(0,1)` against `splice(0,1)` twice. `box.names` is a parameter, so the array
  matters, not only its length. Both remove the first two elements: [a,b,c] → [a,c] → [c] against [b,c] → [c]. At
  length 1 both end empty.
- #60 rebound `if (!g)`: one branch returns the length of a copy of `merged`, the other the length of `merged`.
- #100 to #103: `lastIndexOf(c, length ± k)`. A 1-char needle cannot start past `length - 1`, and a larger fromIndex is
  clamped to `length`.
- #2 usePick: at n = -0, `n >= 0` gives `pick` = -0 and `n > 0` gives +0. The `+ 1` maps both to 1.
- #83/#84: every operand is +0, so `+` and `-` give +0.
- #12 tallied and #38 nullPrototype: equal on every input of the declared types (a `Map<string, number>` value is not
  nullish; a `{ x: number }` is a non-null object). This is the input space lean compares on.

## The verdict at this head (the runner's --recheck)

    cd langs/ts; export LEAN_WORKER_HEAP_MB=6144
    node tests/mutants.mjs --recheck ../../lane/w3b-mutant-study/baseline.json --source pairs --verdicts PASS-proved \
      --jobs 4 --work $S/re/w --out $S/re/recheck.json --report $S/re/recheck.md --timing $S/re/recheck.timing.json
    -> recheck: 105 open and 0 caught sites of 62 units from ../../lane/w3b-mutant-study/baseline.json
    -> 105 mutants planted; 0 caught; 288 s
    -> exit=0   (load 33.4 at start, 54.5 at the end)

All 105 pair rows are still `PASS-proved` at 844ddac2 (head in the JSON's meta). The two census rows were checked by
hand, because their roots have no install here and w3b's census copies were removed. Each file has no import, so a
single-file copy is faithful: `exec/mutate.mjs <copy> --unit <u> --index <k> --no-project --out <mutant>`, then
`check.mjs --parent <copy> --candidate <mutant> --unit <u> --n 30 --dafny-seconds 30 --no-project`. Both exit 0.
`launcherAnchor` is `PASS-proved` (B PASS-bounded, A PASS-proved). `isSecureField` is `PASS-bounded` (B PASS-bounded,
A `ASK:identity`): without the root's project, lane A no longer proves it. The baseline ran with the project. Either
way the mutant is equivalent.

## Validators

- **93 of 93 classified, with a reason a reader can check.** All 107 PASS-proved rows are in the table, so the 93
  unread ones are covered. w3b names the 14 it read by unit: caller ×1 of 2 rows and freshMap ×3 of 4. The column
  "w3b read" therefore marks the 16 rows of those units, which hold its 14. 107 − 14 = 93.
- **Every unsound proof found: pair red first, green after, break red; regression ALL PASS.** None found, so no step was
  owed. Nothing under `translate/`, `lint/` or `check.mjs` changed (`git diff lead-v4 --stat -- langs` is empty).

## Measured number, before and after

| | before (w3b baseline) | after (this lane) |
| --- | ---: | ---: |
| PASS-proved mutants | 107 (14 read, 93 unread) | 107 (107 read: 107 equivalent, 0 unsound) |
| unsound proofs known | unknown (≤ 93) | 0 |
| pair PASS-proved at the current head | 105 at 5cd25d0d | 105 at 844ddac2 (recheck) |

W3b's ceiling now has a firm number: of the 862 escapes, 107 are equivalent mutants that no lane can or should catch.
On the pairs, the escapes that are not proved equal are 389 of 5,661 planted (494 escaped − 105 proved): at most 6.9 points to catch, plus 0.8 ASK.

## Open

1. `isSecureField` (census:snitch) is PASS-bounded with lane A `ASK:identity` on a `--no-project` single-file copy, but
   PASS-proved with the root's project in the baseline. This is a difference of setup, not of soundness. A rerun with an
   installed snitch root would show whether the project alone makes the difference.
2. mutate.mjs plants equivalent mutants in recognisable shapes: a duplicate `Map.set`, a value read only through
   `.length`, a literal on a dead or overwritten path, `>`/`>=` where both arms agree at the boundary. Not changed here
   (out of scope). A filter that drops them would have to prove equivalence, which is what lean already does.
3. The 30-pair regression was not run: no lean code changed, so there is nothing for it to measure.

## The table (107 rows; # is the row's index among the baseline's PASS-proved rows, `sites.txt` order)

| # | source | where | unit | site | kind | was | mutant | w3b read | class | reason | verdict at this head |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- |
| 0 | census:nexus-chat-embed | src/theme/launcher.ts | launcherAnchor | 0 | string | `""` | `"x"` |  | equivalent | same value: `"x"` includes neither "bottom" nor "right", as `""` does not | PASS-proved (by hand, single-file copy, --no-project) |
| 1 | census:snitch | apps/extension/src/lib/selector.ts | isSecureField | 12 | string | `""` | `"x"` |  | equivalent | same value: `"x"` includes no "password" and is neither "cc-number" nor "cc-csc", as `""` | PASS-bounded, lane A ASK:identity (by hand, single-file copy, --no-project) |
| 2 | pairs | adapters | usePick | 2 | operator | `>` | `>=` | yes | equivalent | same value: at n = 0 (and -0) `pick(n, flag)` is 0 whichever the flag (`flag ? x : 0`), and +1 erases the sign | PASS-proved |
| 3 | pairs | alias_result | Box.grown | 0 | dropped-effect | `s.push(x);` | `` |  | equivalent | no observable effect: `copy()` is `fresh()`, a spread copy of `this.list`; the push lands on a local no one reads | PASS-proved |
| 4 | pairs | alias_result | counts | 0 | dropped-effect | `xs.push(0);` | `` | yes | equivalent | no observable effect: `xs` is `rs.map(..)`, a new array; the result is `k + 1`, k taken before the push | PASS-proved |
| 5 | pairs | alias_result | counts | 1 | boundary | `0` | `1` | yes | equivalent | no observable effect: the pushed value goes to the local copy, never read | PASS-proved |
| 6 | pairs | array_copies_identity | copyPushedA | 0 | dropped-effect | `b.push(x);` | `` | yes | equivalent | no observable effect: `b = a.concat()` is a new array; the function returns `a` | PASS-proved |
| 7 | pairs | array_copies_identity | copyPushedS | 0 | dropped-effect | `b.push(x);` | `` | yes | equivalent | no observable effect: as #6 (sync) | PASS-proved |
| 8 | pairs | asany_record_key | countByString | 0 | dropped-effect | `m.set(String(r1) as any, 1);` | `` |  | equivalent | no observable effect: `m` is local and never read; `String(r1)` of a plain record has no effect; returns 1 | PASS-proved |
| 9 | pairs | asany_record_key | countByString | 2 | boundary | `1` | `2` |  | equivalent | no observable effect: a value in the local map `m`, never read | PASS-proved |
| 10 | pairs | asany_record_key | countByString | 3 | dropped-effect | `m.set(String(r2) as any, 1);` | `` |  | equivalent | no observable effect: as #8 | PASS-proved |
| 11 | pairs | asany_record_key | countByString | 5 | boundary | `1` | `2` |  | equivalent | no observable effect: as #9 | PASS-proved |
| 12 | pairs | builtin_transitions | tallied | 2 | boundary | `0` | `1` |  | equivalent | dead code: after `counts.has(key)` the `get` of a `Map<string, number>` is a number, never nullish, so `?? 0` never applies | PASS-proved |
| 13 | pairs | comma_operator | rootMessage | 0 | boundary | `0` | `1` |  | equivalent | same value: `i = 1` and `i = 0` both fail `i < 0`; the loop never runs | PASS-proved |
| 14 | pairs | comma_operator | rootMessage | 4 | changed-return | `cur.message` | `(cur.message) + "x"` |  | equivalent | dead code: the return inside the loop that never runs (`i < 0`) | PASS-proved |
| 15 | pairs | conditional_expressions | fallback | 1 | boundary | `0` | `1` |  | equivalent | dead code: `n`'s initial value is overwritten on both branches before it is read | PASS-proved |
| 16 | pairs | dynamic_key | putChecked | 0 | string | `"base"` | `"basex"` |  | equivalent | no observable effect: `out` is local; the result reads only `out[k]` after `out[k] = 0` (k = "__proto__" returns earlier) | PASS-proved |
| 17 | pairs | dynamic_key | putChecked | 6 | boundary | `0` | `1` |  | equivalent | same value: `out[k]` is 1 or 0, neither is null; both return 0 | PASS-proved |
| 18 | pairs | dynamic_key | putChecked | 8 | boundary | `1` | `2` |  | equivalent | dead code: `out[k] === null` is never true after `out[k] = 0` | PASS-proved |
| 19 | pairs | dynamic_key | putItem | 0 | string | `"base"` | `"basex"` |  | equivalent | no observable effect: `out` is local; the result reads `out[k]` after `out[k] = null` | PASS-proved |
| 20 | pairs | dynamic_key | putItem | 8 | boundary | `0` | `1` |  | equivalent | dead code: `out[k] === null` is always true after `out[k] = null` | PASS-proved |
| 21 | pairs | dynamic_key_open | agentOf | 0 | string | `"x-agent-id"` | `"x-agent-idx"` |  | equivalent | same value: `copy` holds only `accept`; both keys read undefined (no Object.prototype member of either name) | PASS-proved |
| 22 | pairs | dynamic_key_open | protoText | 2 | boundary | `0` | `1` |  | equivalent | dead code: `d["valueOf"]` is Object.prototype.valueOf, never nullish, so `?? 0` never applies | PASS-proved |
| 23 | pairs | exceptions_across | moved | 3 | string | `"bad"` | `"badx"` |  | equivalent | no observable effect: the thrown value is discarded by `catch (error) { return -2; }` | PASS-proved |
| 24 | pairs | exceptions_across | overrideFault | 0 | string | `"first"` | `"firstx"` |  | equivalent | no observable effect: `finally { throw "finish" }` replaces the thrown value | PASS-proved |
| 25 | pairs | exceptions_across | parseCaller | 1 | changed-return | `0` | `(0) + 1` |  | equivalent | dead code: `parseText` is `return 1`, never throws; the catch never runs | PASS-proved |
| 26 | pairs | exceptions_across | parseCaller | 2 | boundary | `0` | `1` |  | equivalent | dead code: as #25 | PASS-proved |
| 27 | pairs | exceptions_scope | caller | 1 | changed-return | `-1` | `(-1) + 1` | yes | equivalent | dead code: `helper(xs)` (a sum and a map over number[]) never throws; the catch never runs | PASS-proved |
| 28 | pairs | exceptions_scope | caller | 2 | boundary | `1` | `2` | yes | equivalent | dead code: as #27 | PASS-proved |
| 29 | pairs | exceptions_scope | helper | 1 | operator | `*` | `+` | yes | equivalent | no observable effect: `doubled` is read only through `.length` | PASS-proved |
| 30 | pairs | exceptions_scope | helper | 2 | boundary | `2` | `3` | yes | equivalent | no observable effect: as #29 | PASS-proved |
| 31 | pairs | exceptions_scope | switchFallback | 12 | changed-return | `-1` | `(-1) + 1` |  | equivalent | dead code: the try body (comparisons and returns) never throws | PASS-proved |
| 32 | pairs | exceptions_scope | switchFallback | 13 | boundary | `1` | `2` |  | equivalent | dead code: as #31 | PASS-proved |
| 33 | pairs | forin_order | inHeader | 1 | boundary | `1` | `2` |  | equivalent | no observable effect: for-in reads only the keys (y, z), not the value of y | PASS-proved |
| 34 | pairs | forin_order | written | 0 | boundary | `0` | `1` |  | equivalent | no observable effect: `o.a` is overwritten before any read; the key order b, a is the same | PASS-proved |
| 35 | pairs | gen_walk | clampUnit | 6 | operator | `>` | `>=` | yes | equivalent | same value: at t = 1 both return 1 (the guard's 1, or t) | PASS-proved |
| 36 | pairs | generators | counted | 0 | boundary | `0` | `1` |  | equivalent | same value: at i = 0 the loop yields nothing (`if (i > 0)`); both yield n+1, n+2 | PASS-proved |
| 37 | pairs | heap5_conditional | count | 1 | operator | `>` | `>=` | yes | equivalent | same value: `length >= 0` is always true; at length 0 both arms give 0 | PASS-proved |
| 38 | pairs | lane_b_reach | nullPrototype | 3 | operator | `&&` | `\|\|` | yes | equivalent | same value: `a: typeof ONE` is a non-null object, so `typeof a === 'object'` and `a !== null` are both true; && and \|\| agree | PASS-proved |
| 39 | pairs | library_cells | freshMap | 0 | dropped-effect | `m.set("a", 1);` | `` | yes | equivalent | no observable effect: the map is local; a duplicate `set("a", 1)`, the size is 1 either way | PASS-proved |
| 40 | pairs | library_cells | freshMap | 3 | boundary | `1` | `2` | yes | equivalent | no observable effect: the first value is overwritten by the second set; the result reads only the size | PASS-proved |
| 41 | pairs | library_cells | freshMap | 4 | dropped-effect | `m.set("a", 1);` | `` | yes | equivalent | no observable effect: as #39 | PASS-proved |
| 42 | pairs | library_cells | freshMap | 7 | boundary | `1` | `2` | yes | equivalent | no observable effect: the result reads only the size | PASS-proved |
| 43 | pairs | library_cells | tally | 0 | dropped-effect | `counts.set(key, n);` | `` |  | equivalent | no observable effect: `set(key, n)` twice equals once (same entry, same position, same size) | PASS-proved |
| 44 | pairs | library_cells | tally | 2 | dropped-effect | `counts.set(key, n);` | `` |  | equivalent | no observable effect: as #43 | PASS-proved |
| 45 | pairs | library_ops | dropTwo | 2 | boundary | `0` | `1` |  | equivalent | same value: `splice(1,1); splice(0,1)` removes the first two elements as `splice(0,1)` twice does (length 1: both empty it; 0: no-op); same array, same length | PASS-proved |
| 46 | pairs | library_rows | basename | 3 | string | `"index"` | `"indexx"` |  | equivalent | dead code: `split("/")` gives at least one element, so `at(-1)` is never undefined | PASS-proved |
| 47 | pairs | library_rows | cut | 1 | swapped-args | `1, 3` | `3, 1` |  | equivalent | same value: `substring` swaps its arguments when start > end (ECMA-262 22.1.3.25) | PASS-proved |
| 48 | pairs | lint_misfires | assignments | 3 | swapped-args | `"x", "a"` | `"a", "x"` |  | equivalent | no observable effect: `sets` and `params` are local; the result reads only their lengths | PASS-proved |
| 49 | pairs | lint_misfires | assignments | 4 | string | `"x"` | `"xx"` |  | equivalent | no observable effect: as #48 | PASS-proved |
| 50 | pairs | lint_misfires | assignments | 5 | string | `"a"` | `"ax"` |  | equivalent | no observable effect: as #48 | PASS-proved |
| 51 | pairs | lint_misfires | assignments | 6 | string | `""` | `"x"` |  | equivalent | no observable effect: as #48 | PASS-proved |
| 52 | pairs | lint_misfires | assignments | 8 | swapped-args | `"y", "b"` | `"b", "y"` |  | equivalent | no observable effect: as #48 | PASS-proved |
| 53 | pairs | lint_misfires | assignments | 9 | string | `"y"` | `"yx"` |  | equivalent | no observable effect: as #48 | PASS-proved |
| 54 | pairs | lint_misfires | assignments | 10 | string | `"b"` | `"bx"` |  | equivalent | no observable effect: as #48 | PASS-proved |
| 55 | pairs | lint_misfires | assignments | 11 | string | `"::int"` | `"::intx"` |  | equivalent | no observable effect: as #48 | PASS-proved |
| 56 | pairs | lint_misfires | blockShadow | 2 | operator | `>` | `>=` |  | equivalent | dead code: `x` is the constant 2; `2 >= 5` is false as `2 > 5` | PASS-proved |
| 57 | pairs | lint_misfires | blockShadow | 3 | boundary | `5` | `6` |  | equivalent | dead code: `2 > 6` is false as `2 > 5` | PASS-proved |
| 58 | pairs | lint_misfires | blockShadow | 4 | changed-return | `0` | `(0) + 1` |  | equivalent | dead code: the return under `2 > 5` | PASS-proved |
| 59 | pairs | lint_misfires | blockShadow | 5 | boundary | `0` | `1` |  | equivalent | dead code: as #58 | PASS-proved |
| 60 | pairs | lint_misfires | rebound | 0 | negated-if | `g` | `!(g)` |  | equivalent | same value: with g the result is the length of a copy of `merged`, without g the length of `merged`: equal either way | PASS-proved |
| 61 | pairs | lint_misfires | rebound | 2 | operator | `+` | `-` |  | equivalent | no observable effect: the pushed values are read only through `.length` | PASS-proved |
| 62 | pairs | lint_misfires | rebound | 3 | boundary | `1` | `2` |  | equivalent | no observable effect: as #61 | PASS-proved |
| 63 | pairs | map_set_copy | bumpCopy | 4 | boundary | `0` | `1` |  | equivalent | dead code: `m.get(t)` right after `m.set(t, 1)` is 1, never nullish | PASS-proved |
| 64 | pairs | mutation | countOnly | 0 | boundary | `0` | `1` |  | equivalent | no observable effect: `u` is a spread copy; the write lands on it and the function returns `user.visits` | PASS-proved |
| 65 | pairs | narrow_in | inherited | 2 | string | `'toString'` | `"toStringx"` |  | equivalent | same value: `r = { a: n }` owns only `a`; neither "toString" nor "toStringx" is an own key | PASS-proved |
| 66 | pairs | narrow_in | known | 0 | boundary | `1` | `2` |  | equivalent | no observable effect: `in` reads the keys of `r`, not the values | PASS-proved |
| 67 | pairs | narrow_in | known | 1 | boundary | `2` | `3` |  | equivalent | no observable effect: as #66 | PASS-proved |
| 68 | pairs | numbers_bits | infinitySign | 0 | changed-return | `Number.NEGATIVE_INFINITY` | `(Number.NEGATIVE_INFINITY) + 1` |  | equivalent | same value: -Infinity + 1 is -Infinity | PASS-proved |
| 69 | pairs | object_accessor_faults | ChangedFault.read | 0 | changed-return | `this.value + 3` | `(this.value + 3) + 1` |  | equivalent | dead code: the getter `value` always throws (`throw "after"`), so the return expression never completes | PASS-proved |
| 70 | pairs | object_accessor_faults | ChangedFault.read | 1 | operator | `+` | `-` |  | equivalent | dead code: as #69 | PASS-proved |
| 71 | pairs | object_accessor_faults | ChangedFault.read | 2 | boundary | `3` | `4` |  | equivalent | dead code: as #69 | PASS-proved |
| 72 | pairs | object_accessor_faults | Fault.caught | 0 | changed-return | `this.value` | `(this.value) + 1` |  | equivalent | dead code: the getter always throws; the catch returns 4 in both | PASS-proved |
| 73 | pairs | object_accessor_faults | Fault.read | 0 | changed-return | `2` | `(2) + 1` |  | equivalent | dead code: `const n = this.value` always throws before the return | PASS-proved |
| 74 | pairs | object_accessor_faults | Fault.read | 1 | boundary | `2` | `3` |  | equivalent | dead code: as #73 | PASS-proved |
| 75 | pairs | object_accessor_faults | Fault.write | 0 | changed-return | `2` | `(2) + 1` |  | equivalent | dead code: the setter always throws (`throw "setter"`) before the return | PASS-proved |
| 76 | pairs | object_accessor_faults | Fault.write | 1 | boundary | `2` | `3` |  | equivalent | dead code: as #75 | PASS-proved |
| 77 | pairs | object_methods | strategyRefactor | 0 | changed-return | `this.count + x` | `(this.count + x) + 1` |  | equivalent | no observable effect: `strategy` is local and never used; returns n + 2 | PASS-proved |
| 78 | pairs | object_methods | strategyRefactor | 1 | operator | `+` | `-` |  | equivalent | no observable effect: as #77 | PASS-proved |
| 79 | pairs | object_methods | strategyRefactor | 2 | changed-return | `this.count * x` | `(this.count * x) + 1` |  | equivalent | no observable effect: as #77 | PASS-proved |
| 80 | pairs | object_methods | strategyRefactor | 3 | operator | `*` | `+` |  | equivalent | no observable effect: as #77 | PASS-proved |
| 81 | pairs | open_datatype | agentOf | 0 | string | `"x-agent-id"` | `"x-agent-idx"` |  | equivalent | same value: as #21 (the same unit in another pair) | PASS-proved |
| 82 | pairs | operators_values | argumentsInOrder | 0 | boundary | `1` | `2` |  | equivalent | no observable effect: `i` is never read after `i += 1`; returns `sink.put(old, old)` | PASS-proved |
| 83 | pairs | operators_values | chained | 2 | operator | `+` | `-` |  | equivalent | same value: a, b and v are all 0 (+0): `0 - 0 + 0` is +0 as `0 + 0 + 0` | PASS-proved |
| 84 | pairs | operators_values | chained | 3 | operator | `+` | `-` |  | equivalent | same value: `0 + 0 - 0` is +0 | PASS-proved |
| 85 | pairs | operators_values | compound | 0 | boundary | `1` | `2` |  | equivalent | no observable effect: `i` is overwritten (`i = old + old`) before it is read | PASS-proved |
| 86 | pairs | ordered_collections | orderOf | 2 | boundary | `2` | `3` |  | equivalent | no observable effect: the result reads only the keys of `m`, not the values | PASS-proved |
| 87 | pairs | ordered_collections | orderOf | 5 | boundary | `1` | `2` |  | equivalent | no observable effect: as #86 | PASS-proved |
| 88 | pairs | promise_integration | innerCatch | 2 | changed-return | `9` | `(9) + 1` |  | equivalent | dead code: `await Promise.resolve(7)` never rejects; the catch never runs | PASS-proved |
| 89 | pairs | promise_integration | innerCatch | 3 | boundary | `9` | `10` |  | equivalent | dead code: as #88 | PASS-proved |
| 90 | pairs | proto_write | mark | 0 | boundary | `1` | `2` |  | equivalent | no observable effect: `d` is local (on "__proto__" the primitive write is ignored); returns 1 | PASS-proved |
| 91 | pairs | proto_write | named | 0 | string | `'a'` | `"ax"` |  | equivalent | same value: the same const key is written and tested; own key either way, 1 | PASS-proved |
| 92 | pairs | proto_write | named | 3 | boundary | `0` | `1` |  | equivalent | dead code: `hasOwnProperty(d, key)` is always true after `d[key] = ..` | PASS-proved |
| 93 | pairs | proto_write | own | 0 | boundary | `1` | `2` |  | equivalent | no observable effect: the result tests only that the key is own, not its value | PASS-proved |
| 94 | pairs | proto_write | own | 3 | boundary | `0` | `1` |  | equivalent | dead code: a computed key (`[k]`, also "__proto__") always makes an own property, so the else arm never runs | PASS-proved |
| 95 | pairs | pure_globals | chopped | 1 | operator | `<` | `<=` |  | equivalent | same value: at ratio 0 (and -0) `Math.ceil` and `Math.floor` agree; NaN fails both comparisons | PASS-proved |
| 96 | pairs | push_apply | local | 0 | string | `"x"` | `"xx"` |  | equivalent | no observable effect: the result reads only `a.length` | PASS-proved |
| 97 | pairs | read_shaped_inputs | clampLimit | 1 | operator | `>` | `>=` |  | equivalent | same value: at limit = 100 both return 100 | PASS-proved |
| 98 | pairs | signed_zero | positive | 1 | operator | `>=` | `>` |  | equivalent | same value: at n = 1 both return 1 | PASS-proved |
| 99 | pairs | splice_negative | trimEnd | 3 | boundary | `1` | `2` |  | equivalent | same value: from index length-1 at most one element exists, so delete count 2 removes what 1 does (empty: none) | PASS-proved |
| 100 | pairs | string_methods | ext | 2 | operator | `+` | `-` |  | equivalent | same value: `lastIndexOf(".", length - 1)` already covers every start of a 1-char match; length+1 is clamped to length (empty: -1 both) | PASS-proved |
| 101 | pairs | string_methods | ext | 3 | boundary | `1` | `2` |  | equivalent | same value: length+2 is clamped to length as length+1 | PASS-proved |
| 102 | pairs | string_methods_real | tail | 2 | operator | `+` | `-` |  | equivalent | same value: as #100 with "/" | PASS-proved |
| 103 | pairs | string_methods_real | tail | 3 | boundary | `1` | `2` |  | equivalent | same value: as #101 with "/" | PASS-proved |
| 104 | pairs | string_union_order | dropped | 0 | boundary | `0` | `1` |  | equivalent | no observable effect: `t.n` is never read; the result compares `level` | PASS-proved |
| 105 | pairs | ts_strict_values | isAdaTag | 0 | string | `""` | `"x"` |  | equivalent | same value: `"X"` (the upper case of "x") is not "ADA", as `""` is not | PASS-proved |
| 106 | pairs | type_tests | refactor | 0 | operator | `===` | `!==` |  | equivalent | no observable effect: `x` is never read; `new A()` and `new B()` only initialise fields | PASS-proved |
