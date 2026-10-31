# withdrawal-catalogue: result (2026-10-31)

Base lean `09032a594` (lead-09032a59). Row `runtime | withdrawal` was FAIL: `withdrawal.mjs:72`, 9 uncatalogued sites.

## The nine (listed by the test's own audit, `node langs/ts/lower.mjs --audit`)
They belong to two readings, not nine. Neither entry had `translate` patterns.

| site | reading | design note | fallback when withdrawn |
| --- | --- | --- | --- |
| translate.mjs:2822 raw parts the parser did not keep | tagged-template | heap-stage5.md 1b | unit refused `withdrawn` at the gate (kind TaggedTemplateExpression) |
| translate.mjs:2825 invalid escape | tagged-template | 1b (lint: `template`) | same |
| translate.mjs:2832 tag not a name or a member | tagged-template | 1b | same |
| translate.mjs:2833 tag may write a handed object, no world | tagged-template | 1b | same |
| translate.mjs:2834 method tag may write its receiver, no world | tagged-template | 1b | same |
| translate.mjs:2836 no TemplateStringsArray type | tagged-template | 1b | same |
| translate.mjs:3990 `.groups` of a pattern naming no group | regex | heap-stage5.md 6b | unit refused `withdrawn` (kind RegularExpressionLiteral); outside 6b the lint refuses by row `match-groups`, `unsupported-member` |
| translate.mjs:3993 named capture of a possibly-null match without `?.` | regex | 6b | same |
| translate.mjs:3994 named capture read as another type | regex | 6b | same |

None needed `no withdrawal: <reason>`.

## Change (readings.mjs, design/admission-contract.md)
- `tagged-template.translate`: six anchored patterns; `regex.translate`: three. The `refusal` sentences now state the design notes' Out lists.
- The tagged-template entry still described the v1 reading (one pure function of the cooked parts, holes as Any). Lane core-template-literals replaced that reading in place (1b found it proving changed behaviour equal). The entry now describes the current reading, records v1 withdrawn with that reason, and v2 current. No test or expect.json pins the version.
- admission-contract.md: dated paragraph under Withdrawal; the two rows of the readings table (refusal counts 6 and 3, versions).

## Evidence
- `node langs/ts/tests/withdrawal.mjs`: exit 0, "audit 588 site rows, 0 uncatalogued" (before: AssertionError 9 !== 0).
- Audit JSON before/after: exactly these nine rows changed reading (null -> tagged-template / regex); the other 579 are unchanged.
- Withdrawn by LEAN_WITHDRAW, check.mjs: template_literals `tagged`, `path` and regular_expressions `year` are PASS-bounded (lane A ASK, "withdrawn"); without it, PASS-proved.
- Pairs (JOBS=2): heap_canonical 13, type_tests 59, copied_argument 10, template_literals 19, regular_expressions 9 checks, ALL PASS.

## Regressions
None in the pairs run. The full suite has not been run (the lead runs it at the merge).

## Left
- The audit site table in admission-contract.md (line numbers) is stale from earlier lanes; not regenerated here, to avoid churn.
