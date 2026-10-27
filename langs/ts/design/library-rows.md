# Library rows: built-ins of stage 5 read from rows of the library table

**Construct.** `pop`, `shift`, `splice` used as values; `fill`, `toSorted`, `toReversed`, `findLast`, `findLastIndex`,
`lastIndexOf`; `toString` on arrays and primitives; `toLocaleString`; `substr`, `search`, `matchAll`,
`toLocaleLowerCase`, `toLocaleUpperCase`. Each is a row of `translate/library.json` with `lane: ordinary`: its ECMA-262
section, its `result` fact (fresh, receiver, element-or-undefined, primitive), whether it changes its receiver, and its
reading (`exact`, `uninterpreted`, `world-read`) with the Dafny text. `pop`, `shift`, `splice` keep their heap rows
and gain an `ordinary` field. `langs/ts/library-rows.mjs` holds the predicates the lint and the translator share.

**JavaScript meaning and reading.**
- `pop`/`shift` (23.1.3.22, .27) remove and return the last or first element, undefined on an empty array: the value
  is `At(xs, -1)` or `At(xs, 0)`. `splice` (.31) returns the removed run: a negative start counts from the end, the
  count is clamped to the rest. On a fresh array (a literal, a copy, `split`, `Array.from`, `Object.keys`) only the
  value is read. On a local array the function owns, the array is rebound before the statement:

      var lx1_ := parts; var t2_: Option<string> := At_string(lx1_, -1);
      var parts: seq<string> := (if |lx1_| > 0 then lx1_[..|lx1_| - 1] else lx1_); var last: Option<string> := t2_;
- `fill` (.7) on a fresh array: `seq(|xs|, i => if lo <= i < hi then v else xs[i])`. `toReversed` (.33) is `Reverse`.
  `findLast` (.11) is `Find(Reverse(xs), p)`; `findLastIndex`, `lastIndexOf` count back from `|xs| - 1`.
- `toSorted` (.34) is the uninterpreted `sort_<E>(xs, cmp)` that `[...xs].sort(cmp)` already reads, so the two prove.
- `x.toString()` on a string is `x`, on a boolean `"true"`/`"false"`, on a number, bigint or a primitive union the
  template literal's `to_string` (21.1.3.6, 21.2.3.3: ToString with no radix); under `?.` the same on the present
  value. On an array it is `join()` (23.1.3.36). `substr` (B.2.2.1) is the exact `StrSubstr`.
- `search` (22.1.3.21) is uninterpreted in the string and the pattern: `@@search` saves lastIndex, starts at 0 and
  restores it. `matchAll` (22.1.3.14) starts at the pattern's lastIndex: a `g` literal (a new object) or a string
  pattern starts at 0, so it is uninterpreted in both; a for-of reads the iterator through its uninterpreted `to_seq`.
- `toLocaleString`, `toLocaleLowerCase`, `toLocaleUpperCase` depend on the host's locale data (ECMA-402): a world
  read, a transition `int_toLocaleString(world, n)`, `bigint_…`, `str_…`, ordered with the unit's other effects.

**What stays refused.** A mutator value on a parameter (`param-mutation`), on an alias (`alias-mutation`), in a
callback (`closure-mutation`), under a condition, a short circuit, an optional chain or a loop header, or in a
statement that reads the array again (`mutator-value`, advice conditional); `fill` on a name (`in-place-mutation`: it
returns its receiver); a `findLast` callback with an index (`callback-form`); `lastIndexOf` on objects or with a start;
`toString` with a radix on a bigint, or on a union with an object member; a locale read inside a callback; `matchAll`
with a named pattern or without `g`; `[...s.matchAll(re)]` (the `spread` rule). Each has an escape fixture
`fixtures/escapes/ts/library_*.ts`.

**Soundness.** A mutator value is rebound before its statement, which is the JavaScript order only when the call runs
on every path and nothing else in the statement reads the array: the lint checks both (`unconditionalSite`,
`readsOf`), and in a loop the rebinding is threaded like the statement forms (`isMutCall`). A fresh receiver has no
other name, so dropping its change loses nothing. `toString` and the template literal are both ToString by the spec,
so one function for both is the same function on both sides. A locale read as a pure function would prove two runs
under two locales equal; as a transition it never does. `matchAll` on a named pattern could see a lastIndex an earlier
`exec` moved, which an uninterpreted function of the pattern value would hide: refused.

**What lane B sees.** Real built-ins on generated inputs. Its recorder (exec/transitions.mjs) patches push to filter,
Map, Set and Object.assign: pop, shift and splice records are checked (pair `library_rows`: 0 defects). The new rows
are not recorded until the recorder patches them; a scratch copy that patched every new row recorded all of them with
0 Array defects. It classed string results equal to their receiver as `receiver` (a recorder artifact for primitives),
and a fill or reverse that changes nothing would need the `noopAllowed` case push already has.

**Five real instances (W/work/bench, lint of base faae106 against this lane).**
| file:line | unit | construct | now |
|---|---|---|---|
| nexus apps/backend/src/documents/processors/implementations/website.processor.ts:487 | WebsiteProcessor.getPageName | `split("/").pop()` | enters, translates |
| nexus apps/frontend/src/modules/Admin/pages/observability/utils/formatTokenCount.ts:13 | formatTokenCount | `toLocaleString()` | enters, translates |
| nexus apps/backend/src/_common/redis/redis-client.service.ts:55 | RedisService.bigIntReplacer | bigint `toString()` | enters, translates |
| n8n packages/nodes-base/nodes/Elastic/ElasticSecurity/GenericFunctions.ts:14 | tolerateTrailingSlash | `substr` | enters, translates |
| driftbench tools/docs/check-links.ts:201 | unreachablePages | `queue.shift()` in a loop | enters; translation waits on its callee `markdownFiles` |
| nexus .../htmlTemplates/utils/extractHandlebarsPlaceholders.ts:95 | extractHandlebarsPlaceholders | `matchAll(TOKEN_REGEX)` | stays out: a named pattern |
