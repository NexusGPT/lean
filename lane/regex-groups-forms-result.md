# regex-groups-forms: result

Branch `lane/regex-groups-forms` from lean `lead-09032a59` (09032a594).

## Commits

- 35b793c51: the red units of pair `regular_expressions` (`second`, `first`, `day`, `keyed`, `held`, `either`).
- e32b5ae94: the mechanism. A capture of a group that may not take part is present or absent, never a string. The
  `.groups` forms are read by the same rule. Adds row `match-captures` and its validation; the escape fixture moves to
  the form that stays refused.
- c209fab74: the item classifier reads `new RegExp("src"[, "flags"])` of written strings and `x.match(re) || []`.
- 38f690408: `matchOfName` counts only `++` and `--` as writes, not `!t` (pair unit `tested`).
- the commit of this file: the dated note under heap-stage5.md 6b, with its census.

## What was done

The false proof is closed. Item i of a match is undefined when group i did not take part (ECMA-262 22.2.7.2), and the
match, read as `seq<string>`, made it a string. At the base, `second` (`m[2] ?? "z"` against `m[2] ?? "y"` of
`/(a)|(b)/`) was proved while lane B found the WITNESS on "a". The red run was a scratch pair holding `second` and
`first`; it gave `Equal_second not proved: FAIL (proved)`. At the head `second` is not proved, lane B WITNESS.

Mechanism (`langs/ts/common.mjs`, one decision for the lint and the translator):
- `matchItemKind(r, i)`: whether item i of the match r is a string. It reads the pattern of every call that may make r:
  r itself, a const or a `let` whose declaration and every assignment in the file is such a call, the variable of a
  for-of over `matchAll`, or `x || []`. The pattern is a literal, `new RegExp` of written strings, or a const of the
  file holding one (`regexLiteralOf`), and its `regexCaptures` decides. Item 0 is always a string, and so is every
  item of a g match by `String.prototype.match`.
- `matchCapture`: `m[i]` (i a literal) on a const match `matchOfName` reads is `regex_capture(re, s, i)` when its group
  takes part in every match, else `regex_capture_may(re, s, i)` (Option). A string item elsewhere keeps the list's
  reading. Any other item that may be undefined, or whose pattern is not known, is refused (row `match-captures`).
- `absenceRead`: a value that may be undefined is read only as present or absent. That means the left of `??` or `||`,
  a test, an equality with null or undefined, or a place whose expected type holds undefined. Otherwise the lint
  refuses it, and the translator's `convertToD` refuses the conversion as a backstop.
- Forms: `m.groups["k"]` is `m.groups.k`. `const { k } = m.groups` binds each name as the group read (a group that may
  not take part only with a default). A group that may not take part is read as an Option everywhere, at the same
  function as its number (`m.groups.b` and `m[2]` are one value). A pattern held in a const is read as its literal
  (`heldRegexLiteral`), and the translator writes the literal for the name at its calls (`ident`).
- `const [, a] = m`: each item must be a string by `matchItemKind`.

Every form the brief names is now read. Still refused, each with its reason in the note: a capture that may be undefined
read as a string; `m.groups` held or passed; an item of a match whose pattern is not known; an exported or passed held
pattern; a held g or y pattern in a group read.

## Pairs (each `JOBS=2 node langs/ts/tests/run.mjs --pair <p>`, at 38f690408)

| pair | checks | result |
|---|---:|---|
| regular_expressions | 23 | ALL PASS (red at the base: theorem generated FAIL; `second` proved in the scratch pair) |
| library_members | 19 | ALL PASS |
| library_members_refused | 16 | ALL PASS |
| heap5_regex | 9 | ALL PASS |
| heap5_strings | 11 | ALL PASS |
| strings | 23 | ALL PASS |
| heap_canonical | 13 | ALL PASS |
| type_tests | 59 | ALL PASS |
| copied_argument | 10 | ALL PASS |
| hash_keys (uses matches) | 14 | ALL PASS |
| cause_callee_pattern (uses matches) | 3 | ALL PASS |
| lint_misfires (uses matches) | 15 | ALL PASS |
| library_rows (uses matches) | 35 | ALL PASS |

Also checked:
- `library_members/validate.mjs`: rows 12, cases 48, failed 0 (6 cases for `match-captures`).
- Escape fixtures: the lint replayed on all 250, base snapshot against the head (lane script `esc.sh`), 0 differ. The
  changed fixture `library_members_match_groups` keeps its rule `unsupported-member` in lint and translate.

## Regression list

None. The pair list changed only in `regular_expressions`: 7 units added, and the earlier 4 are unchanged.

## Census

`NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs /root/da/census/repos/n8n --out ...`. The before run
used a `git archive 09032a594` snapshot, the after run this head, one root at a time, gated on fewer than 6
`^node .*census.mjs` processes and 12 GB available. Then `census.mjs --diff`.

```text
n8n before: {"files":7812,"units":9610,"entered":2752,"languageRefused":4634}
n8n after:  {"files":7812,"units":9610,"entered":2752,"languageRefused":4634}
```

- Entered: `packages/workflow/src/Extensions/StringExtensions.ts:extractDomain` (a pattern held in a const).
- Lost: `packages/core/src/ExtractValue.ts:executeRegexExtractValue`. It returns `regex.exec(value)[1]` of a caller's
  `RegExp` as a string, which is undefined when the group does not take part (`/(a)?/`). This is the false-proof class
  this lane closes, so the loss is the refusal the soundness fix requires, not a regression of a sound reading.
- Moved, still out: `useJsonFieldCompletions` now reads its destructured groups and stops first at `type-assertion`.
  `splitName` was refused before; it now stops first at `match-captures` (`const [_, fullName] = match` of `(.+)?`).
- The first after run (at e32b5ae94) lost 6 more units. Five of them
  (`compareOperationFunctions.regex`/`.notRegex`, `extractID`, `parseRegexPattern`, `GoogleSheet.splitCellRange`)
  were gaps in the classifier, `new RegExp("…")` and `x.match(re) || []`, closed at c209fab74, and are entered again.
  The sixth, `GoogleSheet.getDecodedSheetRange`, is also back in.
- langchainjs: not run (the brief asks n8n). nexus: not run, memory.

## Found, not fixed

- `re.exec(s)` of a literal is a world transition (`ext_call_args_Ext_RegExp_exec_World`). Dafny then does not prove
  two functions equal when each begins `var (wld, t0_) := ...`: bodies equal up to the order of an if's arms fail, and
  the same bodies with a plain let verify (lane scratch `dx/t*.dfy`). So the pair's `first` uses `s.match`.
- The whole match array used as a value (`m.slice(1)`, `m.join`, a for-of over m, a spread) still reads its items as
  strings when a group may not take part. This is the same defect in a construct this lane did not read.

## What is left

- The whole-array uses of a match above.
- The exec world transition and the tuple-let proof weakness.
- Forms still out by their reasons: a pattern in a parameter default or a `let` (`getDomainBase`, `splitExpression`),
  a matched string rooted at `this` (`runCodeEachItem`), a match through `?.match` (the `ExecutionError` units).
