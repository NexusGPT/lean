# Lane types-form5-6-primitives: result (2026-10-31)

Branch `lane/types-form5-6-primitives`, from lean `b5c074508` (lead-b5c07450). Commits, oldest first:

| Commit | What |
| --- | --- |
| d078d7301 | pair `types_symbol_bigint`, red: the translator refuses the parent at line 8 (`union type string \| unique symbol is not translatable`) |
| 027eeeae9 | the pair's bigint union takes Intl's shape (several string members: refused on base; `number \| bigint \| \`${number}\`` alone is a sum on base and did not exercise form 6), `rem` replaces `half` so the file reads its numbers as int |
| 6d55a238c | the pair's `orElse` (`a \|\| b` over bigints) |
| 273cc7d3b | the reading (translate.mjs, common.mjs, spec/theorem.py) |
| 3d3cf709d | design note: types-inventory.md "Forms 5 and 6, read (2026-10-31)", the forms table rows, coverage-matrix.md's BigIntLiteral row |
| 04a570832 | this file, with the n8n census |
| (this commit) | the langchainjs census; nexus not run (memory) |

## What I did and why

Design sections 5 and 6 of `langs/ts/design/types-inventory.md` ask for one change: `unionType`'s list of members an
opaque union may hold takes `ESSymbolLike` and `BigIntLike`, so a union with a symbol or bigint member that no sum
reads is read opaque (Any), as a lone symbol is. That is the first element. Making those units admissible exposed two
defects, each a soundness or reading defect of exactly the constructs named (a bigint, a symbol-keyed record), each
fixed at its mechanism and each with its own pair row that fails without it:

1. **`ESSymbolLike | BigIntLike` in `unionType`'s opaque-member list** (translate.mjs). Without it: the theorem is not
   generated (the translator refuses the file).
2. **A bigint is read as `BigInt`, a Dafny synonym of `int`** (`type BigInt = int`, declared in the prelude when used;
   translate.mjs `dtypeOf`). A bigint and an integer number were both Dafny `int` in a file that reads its numbers as
   int; every conversion is named by its Dafny type, so `0n` and `0` into an opaque value (and into a
   `number | bigint` sum) were one injection. Without it lane A **proves** `amountOr` (`zero ? 0 : v` against
   `zero ? 0n : v`), which lane B witnesses as different: an unsound proof. The same text already came out of base for
   a lone bigint returned as `unknown`. The sites that test a Dafny type for int and must hold for a bigint take
   `BigInt` too: `valueTruth` (without it a captured bigint's truthiness read `true`: `a || b` became
   `if true then a else b`; the pair's `orElse` row fails), the JSX text conversion, a loop's nonnegative hints, the
   readonly-tuple scalar test, and theorem.py's `PRIMS` (the canonical walk's bound would count a `BigInt` field as a
   reference).
3. **A symbol-keyed field is named by its key's declared name** (common.mjs `stableKey`, used by `dn` and by
   `recordType`'s field list). The checker names it `__@TAG@<id>`, the id counting the program's symbols in order of
   meeting, so a candidate declaring another symbol before `TAG` gave one record two datatypes. Without it: the theorem
   is refused (`prelude block Tagged differs between parent and candidate`). The checker writes a string key that looks
   the same with one more underscore, so only symbol keys take this form.

No rule names a repository, file or unit.

## The pair `types_symbol_bigint` (19 checks, ALL PASS)

`JOBS=2 node langs/ts/tests/run.mjs --pair types_symbol_bigint`

| Unit | Construct | Lane A | Lane B |
| --- | --- | --- | --- |
| settle | `string \| unique symbol`, bound to a local | proved | PASS-bounded |
| mark | the same union, `'!'` appended on the string arm | not proved | WITNESS |
| keyLabel | `string \| number \| symbol` | proved | PASS-bounded |
| tagName | a record keyed by a unique symbol; the candidate declares two symbols first | proved | PASS-bounded |
| fee | bigint arithmetic commuted | proved | PASS-bounded |
| rem | `(a + b) % 3n` against `a % 3n + b % 3n` | not proved | WITNESS |
| orElse | `a \|\| b` against `a !== 0n ? a : b` | proved | PASS-bounded |
| amount | Intl's `number \| bigint \| \`${number}\` \| "Infinity" \| ...`, bound to a local | proved | PASS-bounded |
| amountOr | `zero ? 0 : v` against `zero ? 0n : v` | not proved | WITNESS |

Each element's failing row, the same command with that element removed (`/tmp/t56/abl-*.log`):
- base translator: `theorem generated` FAIL (1 check, 1 failed).
- without the `BigInt` synonym: `Equal_amount_or not proved` FAIL (got: proved).
- without `stableKey`: `theorem generated` FAIL (`prelude block Tagged differs between parent and candidate`).
- without `BigInt` in `valueTruth`: `Equal_or_else proved` FAIL (got: not proved).

## Regression pairs (all green, at 273cc7d3b)

`JOBS=2 node langs/ts/tests/run.mjs --pair <p>`, one at a time:

| Pair | Checks | Why it was run |
| --- | ---: | --- |
| types_symbol_bigint | 19 | this lane's pair |
| types_depth | 17 | `types` |
| types_enclosing_params | 24 | `types` |
| type_tests | 59 | brief; `type` |
| type_assertions | 45 | `type` |
| heap_unions | 9 | `union` |
| heap5_unions | 9 | `union` |
| branch_types | 14 | `types` (union branches) |
| comma_operator | 21 | holds a bigint |
| library_rows | 35 | holds a bigint |
| branded_keys | 11 | holds a `Symbol`; `key` |
| computed_literal_keys | 11 | `key` (computed keys) |
| dynamic_key | 11 | `key` |
| dynamic_key_open | 4 | `key` |
| open_key_read | 11 | `key` |
| jsx_handlers_symbolic | 22 | `symbol` |
| record_ops | 9 | `record` (field names) |
| open_datatype | 25 | record fields and slots |
| heap_canonical | 13 | brief (and theorem.py's `PRIMS`) |
| copied_argument | 10 | brief |

Also: `tests/cases/calls.ts` (`bigint_add`, `ensures result == a + b`) translated at head and the ensures verified by
hand with `dafny verify` (1 verified, 0 errors); that case section runs only in the full suite.

## Census

Base is `b5c074508` and head `273cc7d3b`, each a `git archive` in its own folder
(`/root/lanes/types-form5-6-primitives/{base,head}`). Every census, from each folder, one at a time, and only with at
least 25 GB available (the machine is shared): `NODE_OPTIONS=--max-old-space-size=12288 node langs/ts/census.mjs
/root/da/census/repos/<root> [--include <dir>/] --out <root>-<base|head>.json`. Each unit is attributed as census.mjs
does (environment-blocked first, then its first non-environment finding), and forms 5 and 6 are told apart by
types-inventory.mjs's own union test: `node /root/lanes/types-form5-6-primitives/census/moves.mjs <base.json>
<head.json>`. JSONs and logs are in `/root/lanes/types-form5-6-primitives/census/`.

| Root | Units | Form 5 | Form 6 | Stopped by `types` | Entered | Where the form 5/6 units went | Other units whose stop changed |
| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: |
| n8n | 9,610 | 5 → 0 | 0 → 0 | 37 → 32 | 4,308 → 4,313 | entered 5 | 0 |
| langchainjs | 6,709 | 37 → 0 | 0 → 0 | 96 → 59 | 3,504 → 3,506 | entered 2; `reference-key` 35 (a Map keyed by `ZodTypeDef`, another reading's refusal) | 0 |
| nexus (41 directories) | not run: see below | | | | | | |

No unit entered at base is stopped at head (the script's "entered at base, stopped at head": 0 on every root run).

The nexus census did not run. A full nexus census ran past two hours on the inventory's run, so nexus was to be
censused in the 41 top directories that hold every form 5 or 6 finding of that run (the A3 journal
`/root/lanes/A3-types-inventory/census/nexus.json.records.jsonl`: 91 findings in 46 directories, folded to 41), base
and head, one `--include <dir>/` run each. From 01:05 the machine had 1 to 16 GB available, below the 25 GB a census
may start under (the lead's broadcast rule, adopted here), and the background runner reached its two-hour limit
waiting at that gate. `/root/lanes/types-form5-6-primitives/census/nexus_one.sh <i>` runs directory i, base then head, when memory allows.

Every form 5 and 6 unit of the two roots left `types`; what `types` still stops at head (32 on n8n, 59 on
langchainjs) holds no form 5 or 6 message.

## What is left

- A sum with a `symbol` arm (`typeof` separates it at run time), the refinement section 5 names; a symbol-keyed member
  read by its key (`t[TAG]`) stays the lint's `dynamic-key` refusal.
- Lane B draws no symbol, so a planted difference reached only on a symbol arm is not witnessed by drawing.
- Seen, not mine to fix: any `/` makes a file real (`fileUsesReals`), a bigint division included. `xs.filter((x) => x)`
  over a sequence of numbers writes a callback whose result is not a bool (`Filter_int(xs, (x: int) => x)`), as over
  bigints. A bigint in JSX now converts through `text_of_number_BigInt`, its own uninterpreted function, apart from a
  number's.

## Defects met

- Base, unsound: a bigint and an integer number were one Dafny type, so their conversions coincided (`return 0n` and
  `return 0` as `unknown`, both `ext_Any_of_int_int(0)`). Fixed (element 2).
- Base: a symbol-keyed field named by the checker's symbol id. Fixed (element 3).
- Mine, during the run: `node langs/ts/tests/run.mjs --help` started the whole suite (the script takes no `--help`); I
  stopped it after a few seconds by its task, and checked that no process of it was left.
