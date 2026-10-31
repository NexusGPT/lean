# core-regular-expressions: result

Branch `lane/core-regular-expressions` from lean `lead-b5c07450` (b5c074508). Commits: 6284dc02f (the reading, the
pair, the notes), fd6f5a75a (the note's finding stated by its two translations), and the commit of this file and the
census rows.

## What was done and why

Section 6 of `langs/ts/design/heap-stage5.md` (`test`, `replace`, `replaceAll` with g, `search`, `split` by a literal)
was already read at the base (`heap.mjs` `reCall`, pair `heap5_regex`, green). Of the brief's three units (a literal
regex test, a replace with a regex, a match with groups), only the third was still refused: library row `match-groups`
refused every `.groups`. That row is what this lane read.

The reading (one mechanism, `common.mjs`, shared by the lint and the translator):
- `matchOfName`: the match a name holds. This is the test `m.index` already used, factored out of `execMatchMember`: a
  const bound to `re.exec(s)` / `s.match(re)`, re a literal without g and y, s a literal or a name the unit never writes.
- `regexCaptures(text)`: parses the literal into its capture groups, each `{ name, always }`. `always` is false for a
  group in one alternative of a disjunction, under a quantifier of minimum 0, or inside a lookaround. A pattern it
  cannot parse gives null and nothing is read.
- `matchGroupRead`: `m.groups.k` / `m?.groups?.k`, k named once in the pattern and `always`. The translator reads it as
  `regex_group(re, s, "k")`, one bodiless function of the pattern, the string and the name (`Some(..)` / absent behind
  `?.` when m may be null).
- `matchGroups` / `matchGroupsTested`: `m.groups` / `m?.groups` as a presence test (`!`, an equality with null or
  undefined, a condition, a `&&`/`||` operand in one). Read as an object exactly when the pattern names a group
  (`Some(regex_groups(re, s))`, never read through), absent when m is null.

Why the parse: the groups object holds undefined for a group that did not take part, and TypeScript types it `string`.
Reading such a group as a string would let lane A prove a change that differs on that input. Where section 6 is silent,
the choice is the refusal (soundness), written in the note.

## Every element added, and why

- `langs/ts/common.mjs`: `matchOfName` (factored, the existing test); `regexCaptures`; `matchGroups`;
  `matchGroupsTested`; `matchGroupRead`. One decision for the lint and the translator.
- `langs/ts/lint/lint.mjs`: one line in the member check admits a group read, a presence test, and `m.groups` as such a
  read's receiver. Every other `.groups` falls through to the existing `match-groups` refusal.
- `langs/ts/translate/translate.mjs`: `matchGroupsRead`, called first in `propAccess`.
- `langs/ts/library-rows.mjs`: the `match-groups` row's `why` and message now name what is read and what stays refused.
- `langs/ts/readings.mjs`: the `regex` reading's runtime assumption names the group reading; design link added.
- `fixtures/escapes/ts/library_members_match_groups.ts`: its old form (`m?.groups?.host` of `/@(?<host>[a-z.]+)/`) is now
  read. The fixture now holds a group in one alternative, which stays refused (lint and translate). Its expectation
  (refused, `unsupported-member`) is unchanged.
- `langs/ts/tests/pairs/regular_expressions/` (new pair; parent, candidate and expect written red first).
- Notes: `heap-stage5.md` section 6b (dated 2026-10-31); the `design/library-rows.md` row; the `subset.md` row.

## The pair

`regular_expressions`: `isCode` (the same literal on a renamed string compared with true: proved, lane B PASS-bounded),
`tidy` (the same global pattern, another replacement: not proved, WITNESS), `year` (`!m || !m.groups` then
`m.groups.y`, against `m?.groups?.y ?? ""`: proved, PASS-bounded), `month` (another named capture of the same match:
not proved, WITNESS).
Red before: `theorem generated FAIL` (the translator refused `.groups`, so the parent produced no file).
After: `JOBS=2 node langs/ts/tests/run.mjs --pair regular_expressions`: 9 checks, ALL PASS.

## Regression (each `JOBS=2 node langs/ts/tests/run.mjs --pair <p>`, after the reading)

| pair | checks | result |
|---|---:|---|
| regular_expressions | 9 | ALL PASS |
| heap5_regex | 9 | ALL PASS |
| library_members | 19 | ALL PASS |
| library_members_refused | 16 | ALL PASS |
| heap5_strings | 11 | ALL PASS |
| strings | 23 | ALL PASS |
| heap_canonical | 13 | ALL PASS |
| type_tests | 59 | ALL PASS |
| copied_argument | 10 | ALL PASS |

Escape fixtures: `run.mjs` has no option for the escapes section alone. `esc-check.sh` (lane scratch, outside the
tree) replays its two rows (lint exits 1 with the expected rule; translate exits 1) on all 250 fixtures, base snapshot
against this branch. The outputs are identical, every fixture refused by its rule.

Parser check (no model involved): `captures-check.mjs` (lane scratch) generated 19,999 patterns (alternations,
quantifiers, lookarounds, named and numbered groups) and ran them against the engine on 12 strings. Results: 36,388
observations of a group marked `always` in a real match, 0 of them undefined; the group count agreed with the engine's
on every pattern; 0 patterns unparsed.

## Census

Commands: before on a snapshot of the base (`git archive b5c074508`), after on this branch, one root at a time:
`NODE_OPTIONS=--max-old-space-size=<m> node langs/ts/census.mjs /root/da/census/repos/<root> --out <root>-<tag>.json`
(m 12288 before, 8192 after, by the lead's later rule; the heap limit changes no count unless a run fails), then
`node langs/ts/census.mjs --diff <before> <after>` and `groups-units.py` (lane scratch: each unit whose first stop was a
`.groups` finding before, and its first stop after).

| root | units | entered before -> after | language-refused before -> after | units stopped by `.groups` before | after |
|---|---:|---:|---:|---:|---|
| n8n | 9,610 | 2,680 -> 2,680 | 4,941 -> 4,941 | 11 (9 first by `.groups`) | none moved |
| langchainjs | 6,709 | 2,766 -> 2,768 | 3,113 -> 3,111 | 2 | 2 entered |
| nexus, `--include apps/vibe-agent` (partial) | 383 | 213 -> 214 | 145 -> 144 | 2 | 1 entered, 1 to `copied-argument` |

- langchainjs, entered: `libs/langchain-classic/src/experimental/autogpt/output_parser.ts` `preprocessJsonInput` and
  `AutoGPTOutputParser.parse`.
- nexus, entered: `apps/vibe-agent/src/vault/caller-identity.ts` `assumedRoleArnToRoleArn`. Moved to `copied-argument`:
  `StsCallerIdentityResolver.resolveRoleArn`.
- n8n, still stopped, with the form that keeps each out. `useUniqueNodeName` and `Expression.renderExpression` stop
  first by `type-assertion` and `foreach`; `useUniqueNodeName` also writes the matched string (`originalName = ..`).
  The other nine stop by `.groups`: `getDomainBase`, `getDomainPath`, `extractDomain` and `splitExpression` (a
  pattern held in a name); `useJsonFieldCompletions` (destructuring); `JavaScriptSandbox.runCodeEachItem` (a string
  rooted at `this`, and destructuring); the three `ExecutionError` units (a match through `lineNumberRow?.match`).
- The `--diff` of n8n lists no gain and no loss on any reading. The diffs of the other two list gains only (and nexus
  the one move to `mutation` / `copied-argument`).
- nexus whole root: the before run was OOM-killed by the kernel at 15,250 files (exit 137; the machine had 1 to 6 GB
  available). Its journal (14,912 files) has no `.groups` finding. A grep of the copy finds a match's `.groups` in one
  file only (`apps/vibe-agent/src/vault/caller-identity.ts`; the other `.groups` hits are data fields). So the nexus
  row is read under `--include apps/vibe-agent`, before and after, and marked partial.

## Defects met

1. Numbered captures (found, not fixed: they are outside the `.groups` construct, and fixing them refuses reads that
   are admitted today). A match reads as `seq<string>`, so a group that did not take part reads as a string.
   `return m[1] ?? "z"` and `return m[1]` with `m = s.match(/(a)|(b)/)` translate to the same Dafny body (checked by
   diff), while JavaScript returns "z" against undefined on "b". `check.mjs` gives WITNESS here only because lane B
   finds input "b". Lane A alone would prove the change. The fix is the same mechanism (`regexCaptures`) applied to
   `m[i]`, destructuring and the other uses of the match array. It is left to the lead to assign.
2. `execMatchMember` strips `!` from the match name (`m!.index`), so a read of a null match yields a value where
   JavaScript throws. No false proof was constructed. The group reading does not strip `!`.
3. The census gate: from 02:10 my runs waited on MemAvailable >= 16 GB, not on the process count; langchainjs after started at 03:34, before the lead's 20 GB rule arrived. The lead's gate `pgrep -c census.mjs` matches process names only (always 0 here). `pgrep -c -f census.mjs` also
   counts the agents whose brief mentions census.mjs. The count used here is `pgrep -c -f '^node .*census\.mjs'`.
4. The full nexus before-census was OOM-killed by the kernel at 15,250 files (machine at 119 of 122 GB). See Census.

## What is left

- The numbered-capture defect (1).
- `.groups` forms still refused: destructuring (`const { k } = m.groups`, common in n8n), `m.groups["k"]`, a pattern
  held in a name (`s.match(regex)`, common in n8n), a group that may not take part.
