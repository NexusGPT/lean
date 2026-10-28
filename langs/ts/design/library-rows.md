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

### 2026-10-28 library members: the member table grows from the census

**Construct.** The census at 6661006 names the library members the lint stops on: `unsupported-member` 209 findings on the
nexus tree and 576 on the n8n tree, `unsupported-call` 162 and 162. `LIBRARY_MEMBER_ROWS` in `langs/ts/library-rows.mjs` is the
table of the eleven members with the most findings that no other lane owns. Each row has its census count, its ECMA-262
section (or the TypeScript fact), `status` (`admitted` with its reading, or `refused` with the rule) and the message the
lint prints; the lint takes the messages of these members from the table, so a refusal and its row cannot drift apart.

| row | members | status | findings (nexus, n8n) |
|---|---|---|---|
| push-apply-value | `a.push.apply(a, b)`, `a.push.call(a, x)` | refused, `unsupported-member`; write `a.push(...b)` | 0, 234 |
| incomplete-type-member | `req.params`, `req.body`, `message.id` on a type that reaches an unresolved module | admitted, an accessor of the value, reads only | 138, 174 |
| tostring-object | `v.toString()` on a value that may be an object | refused, `unsupported-call`; narrow with `typeof` | 4, 55 |
| locale-in-callback | `toLocaleLowerCase`, `toLocaleUpperCase`, `toLocaleString` in a map, filter, find, findIndex, some, every, flatMap or reduce callback | admitted, a transition per element | 8, 29 |
| match-index | `m.index` of a global, exec-loop or matchAll match | refused, `unsupported-member`; the non-global literal match stays read | 24, 4 |
| match-groups | `m.groups` | refused, `unsupported-member`; name the capture by position | 3, 25 |
| method-on-union | `v.indexOf(x)` on `string | string[]` | refused, `unsupported-call`; narrow first | 0, 21 |
| matchall-named | `s.matchAll(RE)` with a const g pattern nothing in the file advances, or `new RegExp(src, "g")` | admitted, uninterpreted | 15, 2 |
| sort-default-statement | `c.sort()` as a statement | refused; write `c = [...c].sort()` | 3, 6 |
| optional-chain-mutator | `c?.pop()`, `c?.shift()`, `c?.splice()` | refused | 4, 3 |
| world-field-mutator | `this.items.shift()` as a value | refused | 5, 4 |

**Readings and their ground.**
- A locale read depends on the host's locale data (ECMA-402): a world read, the transition the translator already emits for
  a locale read outside a callback. `map`, `filter`, `find`, `findIndex`, `some`, `every`, `flatMap` and `reduce` call their
  callback once per element in index order, and `some`, `every`, `find` and `findIndex` stop at the deciding element. The translator
  reads such a callback as a loop that threads the world (the effectful callback reading), so the lint only had to stop
  refusing it. A locale read in a sort comparator, in a `.then` callback or in a callback nested in one of those stays
  refused: the comparator's transitions have no defined order, and the translator refuses them too. `callbackNeedsLoop`
  now counts a locale read as an effect, so the callback takes the loop-body checks (the parameter forms) the other
  effectful callbacks take.
- `matchAll` (22.1.3.14) copies its pattern and starts the copy at the original's `lastIndex`; it leaves the original
  unchanged. `match` and `replace(All)` with the g flag set `lastIndex` to 0 first and end at 0, `split` builds a copy and
  `search` saves and restores it. A `const` g pattern that is a fresh literal or `new RegExp(source, "<flags>")`, that the
  file does not export, and whose every mention in the file is the first argument of one of those six String methods keeps
  `lastIndex` 0, so the matches are one function of the pattern and the string, read through the same uninterpreted
  `matchAll` the literal form uses. `regexNeverAdvanced` decides it.
- A type whose declaration reaches a module the program cannot resolve (`AuthenticatedRequest<...> = Omit<express.Request,
  "user"> & {...}` with `express` missing) has members that are unknown, not absent. A read of a member its visible part does
  not declare is the accessor the translator already emits for a value of type any, `ext_<Type>_<member>_<Type>(value)`, one
  function of the value, the same on both sides. `incompleteType` finds the error type in an alias argument, a union or
  intersection part, or an `extends` clause. The reading serves reads only: `onWritePath` keeps a member on the path of a
  write refused, and `writesThroughIncomplete` keeps every read refused in a function that writes through such a value
  (the translator does not write an undeclared field). The missing module stays a finding of its own rule.

```
var (wld, t0_) := ext_Module_file_get_TOKEN_84vwit_World(wld);
var (wld, out) := tokens_loop0(ext_Ext_RegExpStringIterator_to_seq_..(ext_call_args_str_matchAll_string_Ext_RegExp(html, t0_)), 0, wld, out);
var providerName: Any := ext_Any_provider_Any(ext_SetProviderSettings_params_SetProviderSettings(req));
```

**What stays refused, and why.**
- A pattern that is a parameter, an imported name, an exported const, or any name that `exec`, `test` or a `lastIndex`
  write touches: its `lastIndex` is state the unit does not own (`library_matchall_named`, `library_members_matchall_exec`,
  `library_members_matchall_exported`). A member a complete type does not declare (`library_members_undeclared_member`).
- `c?.pop()`: the translator reads it as an uninterpreted call on the present value and does not rebind `c` (probe: a
  reduced unit whose lint was relaxed translated, and its Dafny kept the old `c`), so a later read of `c` would see the old
  array. `this.items.shift()` as a value: the array lives in the world and the translator rebinds a local only.
- `toString()` on an object reads `Object.prototype.toString` or the object's own method (validated: `{}`, an object with
  its own `toString`, and `Object.create(null)` which throws). A prototype the unit does not own stays refused.
- `a.push.apply(a, b)` is `a.push(...b)` (validated on four inputs), but nine analyses key on the mutator's name as the
  callee: the lint's `MUT_NAMES` and `PARAM_MUTATORS`, the translator's `MUTATOR_NAMES`, `MUTATORS` and `MUT`, the heap
  core's `MUTATORS`, and `BUCKET_MUTATORS`, `CHANGERS` and `RECEIVER_WRITERS` in `common.mjs`. A scratch reading that
  taught the lint, `isMutCall` and `isEffectCall` the form translated it to `a + b` and still left a mutated parameter
  out of `syntacticMutations`, which would have treated the parameter as unchanged. The form is read only when all nine
  agree, in a lane that owns `translate.mjs`; until then it is refused with the escape `a.push(...b)`.
- Match fields: `m.index` is a function of the pattern and the string for a non-global literal only; `m.groups` is an
  object the match builds, which the sequence reading of a match does not carry.

**Soundness.** An admitted row never makes two different behaviours equal. The locale read is a transition keyed by the
value, so two runs under two locales are never equal. The `matchAll` reading is sound exactly when `lastIndex` stays 0,
which the predicate checks over the whole file and the export list; the cases considered: a pattern advanced by `exec`
in another unit of the file, an `export { RE }` and an `export const`, a script file whose top-level const is a global,
a `y` flag, a pattern passed on or stored (all refused, fixtures above). The unknown-member accessor has the soundness of
the any-typed read it copies: it assumes the member is a plain property, as every opaque read does; a getter with a side
effect would break that for any opaque value alike. Two types of the same name with different declarations read through
the same accessor name, as for every opaque type.

**What lane B sees.** Real code on generated inputs: the locale read runs under the host's locale, so a change from lower
case to upper case is a WITNESS (pair `library_members`, `lowerAll`); a change of what a match contributes
(`wordLetters`) and a change of a fallback value read from `req.params` (`providerOf`) are WITNESSes. The refused rows are
judged by lane B alone in `library_members_refused`: each changed use a WITNESS, each untouched use PASS-bounded.

**Validation by run.** `tests/pairs/library_members/validate.mjs` runs each row on three inputs or more on the engine
(`node validate.mjs --log <dir>`; the logs of this lane are in `results-library-members/validation/`).

**Measure** (census at 6661006 against this lane; `node langs/ts/census.mjs <tree> --out <json> --report <md>`, runs in `results-library-members/`).

| tree | inside the subset before | after | `unsupported-call` findings (units) before | after | `unsupported-member` findings (units) before | after |
|---|---|---|---|---|---|---|
| nexus (26,520 units) | 23,753 | 23,784 | 162 (120) | 146 (109) | 209 (66) | 71 (35) |
| n8n (6,337 units) | 4,314 | 4,378 | 162 (101) | 161 (100) | 576 (351) | 402 (257) |

95 units enter on the two trees (31 and 64). Translated with `--core --tolerant` in project mode, 84 of the 95 translate; the
11 that do not stop on `type nesting too deep` (9) or on a callee that did not translate (2), a limit of the translator
on large unions that the unsupported-member finding hid before. The `reads the host's locale` findings that remain (29 on n8n, 2 on nexus,
from 29 and 8) are sort comparators and a call outside a callback loop.

**Real instances (W/work/bench, units that enter now and translate with `--core --tolerant`).**
| file:line | unit | construct | now |
|---|---|---|---|
| nexus apps/backend/src/notification-preferences/infrastructure/templates/notification-template.service.ts:299 | NotificationTemplateService.renderWeeklyAgentPerformanceReport | `a.conversations.toLocaleString()` in a `.map` callback | enters, translates |
| nexus apps/frontend/src/common/components/Pickers/PluginPicker/CategoryChips.tsx:15 | CategoryChips | `facet.count.toLocaleString()` in a `.map` callback of the JSX | enters, translates |
| nexus apps/frontend/src/modules/AgentCreation/utils/documentExtractor.ts:27 | extractDocuments | `content.matchAll(uploadedDocumentsRegex)` | enters, translates |
| nexus apps/frontend/src/modules/Analytics/export/inline-css-variables.ts:105 | collectCssVariableNames | `markup.matchAll(VAR_CALL)` | enters, translates |
| n8n packages/cli/src/services/curl.service.ts:220 | lowerCaseContentTypeKey | `key.matchAll(regex)`, a local `new RegExp(KEY, 'gi')` | enters, translates |
| n8n packages/cli/src/ExternalSecrets/ExternalSecrets.controller.ee.ts:55 | ExternalSecretsController.setProviderSettings | `req.params.provider`, `req.body` on `AuthenticatedRequest<...>` | enters, translates |
| n8n packages/cli/src/controllers/mfa.controller.ts:52 | MFAController.activateMFA | `req.body` on `AuthenticatedRequest<...>` | enters, translates |
| nexus packages/shared/src/modules/chat/utils/authorType.ts:39 | getAuthorType | `message.type` on `Message & {...}`, with `Message` from an unresolved module | enters, translates |

Four stay out by the bound: n8n `packages/nodes-base/nodes/Jira/GenericFunctions.ts:220` (a locale read in a sort comparator),
`ParameterPolicyRow.tsx:39` (its pattern is also run with `test`), `resolve-template.ts:17` (the pattern is exported) and
`sandbox-url-extractor.ts:18` (the pattern comes from another file's function).
