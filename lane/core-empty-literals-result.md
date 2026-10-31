# core-empty-literals: result

Lane of the night wave of 2026-10-31. Branch `lane/core-empty-literals` from `lead-b5c07450` (b5c074508).
Commits: `2c7d8d2b2` (pair, red), `fe67d02f4` (pair revised, still red on the base), `e1fe093cc` (the reading and the
design note), `776f55c7b` (`madeT`, the fix of the census regression e1fe093cc caused; the coverage row), then this
file with the census numbers (see `git log`).

## What was read, and why

The specification, `langs/ts/design/heap-stage5.md` section 2, was already implemented in the heap core (`arrShape`,
`litShape`, pair `heap5_literals`). Probing every place an empty literal can be written (a declaration, a parameter,
a default, a return, a field, a call argument, both branches of `?:`, both sides of `||` and `??`, an
expression-bodied arrow) found the one mechanism that did not hold the section's invariant: the translator's own
`typeOf`, which both lanes ask, still gave `[]` its own type `never[]` and `{}` the type `{}`. Wherever an operand is
converted to the type of its expression (the right operand of `??`, `translate.mjs` near line 2933), the empty literal
was cast from that own type:

- `(xs ?? []).length` read `|ext_cast_seq_Any_seq_string_seq_Any([])|`, an unknown number where JavaScript gives 0;
- `(o ?? {}).width` cast the `Opts` value the literal had already built through a function taking `Ext_T3hn1f`, a
  Dafny type error, so no lemma of the whole file was proved (the untouched `named` too);
- `Object.keys(d ?? {})` the same with a dictionary.

The fix (`translate.mjs` `emptyLiteralT`, beside `emptyCollectionT`, the same reading for `new Map()`): an empty array
or object literal takes the contextual type of its place, less null and undefined, when that is one array type of a
known element, or one record every key of which is optional, or a dictionary of a known value type. An operand of
`??`, `||` or `?:` whose contextual type is none of those (`Object.keys(d ?? {})`, where the place is the parameter's
`{}`) takes the type the checker gives the expression it is an operand of, by the same rule. No unit, file or project
is named. The soundness argument and what stays refused are in the design note (heap-stage5.md section 2b).

## Every element added

- `langs/ts/translate/translate.mjs`: `emptyLiteralT`, asked first in `typeOf` beside `emptyCollectionT`. Why: the
  mechanism that typed an empty literal by its own type in both lanes.
- `langs/ts/translate/heap.mjs` `litShape`: an empty `{}` whose only shape is a dictionary place stays out of the
  heap core, as on the base. Why: the new `typeOf` let `const d: Record<string, number> = {}` into the heap core, whose
  `Object.keys` of a dictionary cell is the bodiless `DictKeysJs`, while the ordinary lane reads the order exactly
  (`DictIns`). Pair `dict_order`'s `index_first` went from proved to unproved. I asked the lead (A: give `DictKeysJs`
  the `DictIns` fold as its body, outside this construct; B: keep the dictionary place out); no answer within 120 s,
  so B, as announced.
- `langs/ts/translate/translate.mjs` `madeT`: the two checks that ask what a new object holds where it is made
  (`copied-argument` in `handedArg`, and `freshAlone`, the fresh argument `read-after-call` lets pass) read an empty
  `{}` by its own type, as before. Why: with its place's type, a `{}` handed straight to an outside callee whose
  parameter is a dictionary of objects read as a new object that may hold objects (8 n8n units left entered with
  e1fe093cc). An empty `[]` keeps its place's element type there: it bounds every element the array can be given,
  where `never[]` said nothing; an empty array of primitives handed to a call now passes, one of objects is refused
  as before.
- `langs/ts/tests/pairs/empty_literals/`: the pair (below).
- `langs/ts/design/heap-stage5.md` section 2b: the dated note. `langs/ts/COVERAGE.md`: an `empty literal` row.

## The pair

`JOBS=2 node langs/ts/tests/run.mjs --pair empty_literals`:

- on the base (the pair copied into a detached checkout of b5c074508): `| TOTAL | 15 checks | 6 FAILED |`, with
  Equal_count, Equal_width, Equal_total, Equal_tags_of, Equal_blank and Equal_named not proved;
- on this branch: `| TOTAL | 15 checks | ALL PASS |`.

Units: `count` (`(xs ?? []).length`), `width` (`(o ?? {}).width ?? 0`), `total` (a loop over `xs ?? []`), `bumped`
(`xs ?? [0]` for `xs ?? []`, the planted difference: unproved, WITNESS), `tagsOf` (an expression-bodied arrow over
`t?.tags ?? []`), `blank` (`Object.keys(d ?? {}).length`), `named` (untouched expression body). Each candidate tests
`== null`.

## Regression pairs (each `JOBS=2 node langs/ts/tests/run.mjs --pair <p>`, on 776f55c7b)

| pair | checks | result |
| --- | ---: | --- |
| empty_literals | 15 | ALL PASS |
| computed_literal_keys | 11 | ALL PASS |
| copied_argument | 10 | ALL PASS |
| empty_collection_type | 9 | ALL PASS |
| heap5_literals | 11 | ALL PASS |
| heap_canonical | 13 | ALL PASS |
| mixed_vs_literal | 17 | ALL PASS |
| narrow_in | 11 | ALL PASS |
| promise_module_nullish | 17 | ALL PASS |
| type_tests | 59 | ALL PASS |
| unreached_body | 10 | ALL PASS |
| dict_order | 16 | ALL PASS |
| cause_callee_pattern | 3 | ALL PASS |

To choose more than the name rule: on 776f55c7b, every pair's (260) parent and candidate translated with the base and with this branch
(`--core --no-project`, `--heap` unless the pair says `"heap": false`; no Dafny), the outputs compared with only the
output file names normalized. Four pairs differ: `empty_literals` (this pair), `cause_callee_pattern` (one cast of
`[]` on the right of `??` gone, the pair green), `type_tests` (the boxing of a `let value: number[] = []` overwritten
the next line is `ext_Any_of_seq_int_seq_int([])` for `ext_Any_of_seq_Any_seq_Any([])`, the pair green), and before
the heap.mjs change `dict_order` (above; now identical to the base). No other pair's translation changed, so their
lane A input is the base's.

## Census

Commands (each root alone; the base is a detached checkout of b5c074508 at `/root/lanes/core-empty-literals/base`,
the lane is this branch at 776f55c7b):

```text
NODE_OPTIONS=--max-old-space-size=12288 node <checkout>/langs/ts/census.mjs /root/da/census/repos/<root> --out <root>-<before|after>.json --report <root>-<before|after>.md
node langs/ts/census.mjs --diff <root>-before.json <root>-after.json          # gains and losses per reading
python3 -I /root/lanes/core-empty-literals/census/units-diff.py <before.json> <after.json>   # each unit's stop: entered, environment, or its first language rule
```

| root | units | entered before | entered after | language-refused before | after | losses |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| n8n | 9,610 | 2,680 | 2,683 | 4,941 | 4,939 | 0 |
| langchainjs | 6,709 | 2,766 | 2,767 | 3,113 | 3,112 | 0 |
| nexus (53 of 54 pieces, 19,557 files) | 31,162 | 16,724 | 16,729 | 10,521 | 10,519 | 0 |

nexus: the whole-root run of the base was killed by the kernel's OOM killer at 13,650 files (the machine at 117 of
122 GB, not the 12 GB cap), so nexus is run in pieces: `census/prefixes.py /root/da/census/repos/nexus 8000` splits
its 31,002 source files (node_modules and .git left out) into 54 path prefixes, each a prefix split on its next
character while it holds over 8,000 files, so `--include <prefix>` (a `startsWith`) puts every file under exactly one
piece; each piece is `census.mjs /root/da/census/repos/nexus --include <prefix> --out <tag>-<i>.json`, with the base
and with the lane, and `units-diff.py --before before-*.json --after after-*.json` sums them. Piece 39
(`apps/frontend/src/m`, 6,389 files) runs last, about two hours a side under tonight's load; the row above is the
other 53 pieces, both sides complete. The pieces' files and logs are under `/root/lanes/core-empty-literals/census/nexus-pieces/`.

Units moved (`units-diff.py`, by stop reason):

- n8n: `copied-argument` -> entered: 2 (`GoogleSheet.structureArrayDataByColumn` in Google/Sheet v1 and v2: `const
  keys: string[] = []` handed to a same-file method, judged as holding objects while its type was `never[]`); one
  nested unit with them (nested entered 274 -> 275). No other unit moved.
- langchainjs: `copied-argument` -> entered: 1 (`WatsonxLLM.checkValidProperties`, langchain-ibm `llms/ibm.ts`);
  `copied-argument` -> `read-after-call`: 1 (`WatsonxLLM.constructor`: its first stop was raised in
  `checkValidProperties`, now entered, which leaves its next stop, `fields` read after `super(fields)`, outside this
  construct).
- nexus (53 pieces): `copied-argument` -> entered: 1 (`UserPermissions.admin`, `new UserPermissions(userId,
  "org:admin", [])`); `read-after-call` -> entered: 1 (`computeVerdict`: `const reasons: string[] = []` handed to
  `createRunVerdict`, judged by never[] as holding objects); nested entered 1,664 -> 1,667. No other unit moved.

An intermediate run, with commit e1fe093cc (before `madeT`), moved 8 n8n units the other way: entered ->
`copied-argument` (6) and entered -> `read-after-call` (2), each a `{}` handed straight to an outside callee whose
parameter is a dictionary of objects (`get(url, path, {}, headers)`, `createPool(credentials, {}, sshClient)`,
`new NodeApiError(node, {}, {...})`). That is the defect `madeT` (commit 776f55c7b) fixes; the rows above are the final
code. Reproduction: `/root/lanes/core-empty-literals/probe/h.ts` with `h-api.d.ts`, `node langs/ts/lint/lint.mjs
probe/h.ts --no-project`: two `copied-argument` findings with e1fe093cc, none with the base or 776f55c7b.

## Defects met

- Found by the lane and fixed: the cast of an empty literal on the right of `??` (unknown length), a Dafny type error
  for `o ?? {}` with a record place (every lemma of the file unproved).
- Outside the construct, reported, not fixed: the heap core's `DictKeysJs` (Object.keys of a dictionary cell) is
  bodiless where the ordinary lane's `DictIns` is exact. That is why an empty `{}` at a dictionary place stays out of
  the heap core here; `heap.mjs` already holds a reading of `{}` as an empty dictionary cell (`litShape(e)?.kind ===
  'dict'`, near lines 586 and 1047) that no `{}` reaches on the base or on this branch, and that would work once
  `DictKeysJs` has its body.
- Outside the construct, met while writing the pair: lane B draws `null` for an `X | undefined` parameter, so
  `o ?? {}` against `o === undefined ? ...` is a genuine WITNESS at null; the candidates test `== null`. A unit that
  returns `t?.tags ?? []` (an input's array) is withheld by the identity guard ("result may carry an input or shared
  reference"); `tagsOf` returns its length instead.
- Tooling: `run.mjs --tmp <dir>` removes the directory after the run, so I reproduced lane A by hand
  (`/root/lanes/core-empty-literals/lemma.sh`: translate, `spec/theorem.py`, `dafny verify`, without agreeCore) to
  read Dafny's errors.

## What is left

- The heap's `DictKeysJs` body (the dictionary lane), after which the `litShape` exception can go.
- Section 2's Out stays out: `const xs = []` (the evolving array) and an object literal at a place of a union, of a
  type parameter, or of a record with a required key.
