# union-discriminant-hypothesis: result (2026-10-31)

Base: lean `lead-09032a59` (09032a594). Branch `lane/union-discriminant-hypothesis`.

## Commits

- `007bfefc9` heap core: a field declared as one literal is its primitive holding that value (`heap.mjs` `shapeOf`,
  `literals` of one type), so a union alternative's hypothesis states its discriminant; pair `wider_record_argument`
  `circ` not proved -> proved (expect row and reason).
- `aceb7304a` `design/heap-stage5.md` section 12b (dated line under 12); 17d's `circ` note points to it.
- this file.

The mechanism. The hypothesis already stated a reference parameter's literal fields (`fieldsIn`/`member`), but only
for a union of two or more literals: `literals` returned null for one type, so `kind: 'c'` read as a plain string and
`IsR_<Circle>(hw_, c)` said nothing about `kind`. Shapes are views, so the constructor alone does not tell the
alternatives apart, and `size(c)` could take the `Square` branch. Now one string literal, or one non-negative integer
literal, is `{ kind: 'prim', d, values: [v] }`. The key is still the primitive's, so no constructor, prelude or
calling convention changes. `values` is read only by `member`, the hypothesis. The rule is the type's, keyed on no
name: `circ`'s hypothesis is now `IsR_750c02ac(hw_, c) && (Get_R_750c02ac_kind(hw_, c) == "c")`. Soundness: the
hypothesis is about the inputs on entry, where TypeScript's type gives the value. Section 12's guards (no discriminant
write, no outside call in a file with a union) are unchanged.

## Pairs

- `wider_record_argument` 9 checks. With the new expect at base (heap.mjs of 09032a594): 1 FAILED, `Equal_circ proved`
  (not proved). After: ALL PASS.

## Regression

Each `JOBS=2 node langs/ts/tests/run.mjs --pair <p>` at 007bfefc9, ALL PASS: wider_record_argument 9,
discriminated_unions 15, destructured_aliases 21, branch_types 14, type_tests 59, heap_canonical 13, copied_argument 10,
callback_units 9.

Beyond the list: every pair side (`tests/pairs/*/{parent,candidate}.ts`) was translated with
`translate.mjs --core --heap` from a `git archive` of 09032a594 and of the head, and the outputs were compared byte for
byte. The exit codes are the same everywhere. Five files differ, and each difference is one `// HYP` line:
`wider_record_argument` (both sides, `kind == "c"`), `type_tests` candidate `structural` (`kind == "public"`) and
`callback_units` (both sides, `offset == 2`: a captured `const offset = 2` has the literal type `2`). type_tests and
callback_units pass (above). No prelude and no unit body changed.

## Census

n8n, `NODE_OPTIONS=--max-old-space-size=12288 node <git archive>/langs/ts/census.mjs /root/da/census/repos/n8n`, base
09032a594 against head 007bfefc9. Each started with the gate open (fewer than 6 `^node .*census.mjs`, at least 12 GB
available). The two JSON files are identical apart from `date` and `seconds`:
```text
base: {"complete":true,"units":9610,"entered":2752,"share":28.6,"refused":6858,"environmentBlocked":603,"languageRefused":4634,"failedFiles":0,"seconds":704}
head: {"complete":true,"units":9610,"entered":2752,"share":28.6,"refused":6858,"environmentBlocked":603,"languageRefused":4634,"failedFiles":0,"seconds":258}
```
This is as expected: the change touches only hypothesis text, and census.mjs counts the lint's stops. langchainjs:
not run (the brief asked for n8n). nexus: not run, memory.

## What is left

- Nothing in this lane's scope. The hypothesis still states literal fields only at the parameter's own level (one
  level, as before): a nested record's literal field is not stated. That is conservative, and unchanged.
