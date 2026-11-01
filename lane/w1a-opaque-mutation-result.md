# w1a-opaque-mutation: result (2026-11-01)

Branch `lane/w1a-opaque-mutation`, cut from `lead-vm` 4747022f. Design note: `langs/ts/design/w1a-opaque-mutation.md`.

## What landed

- The opaque column (A7): `lint/lint.mjs` `OPAQUE_ROWS` (`block | statement | expression | none`), the thirteen
  mutation-family rules graded `block`; a graded finding keeps its rule and message and carries `opaque: "block"`.
  The lint lists graded findings labelled `[opaque: block]` (or `[opaque: block; the unit stops on another refusal]`);
  they refuse nothing.
- `lower.mjs`: a graded finding stops no unit when the translator runs; a unit it reads holds its graded findings
  (`opaque: [...]`) and the reading `opaque` (readings.mjs, new entry, owning no rule and no kind).
- `translate/opaque.mjs` (the shared helper; schema commit 29a0acc082 sent to the group): the key (`opaqueText`,
  tokens), `opaqueKey`, the step (`opaqueForm`), the certificate row (`opaqueEntry`, `opaqueLine`, `opaqueLines`),
  `statementCount`, and the mutation family's block start (`heapOperation`, `prefixDeclaration`, `blockStart`).
- `translate/translate.mjs`: a unit with sites emits its block as one step `Opaque(id, reads) -> (world', result,
  outputs)`; translator refusals of a graded rule become sites (`translateGraded`); a write through a const alias of a
  handed node in a unit the value reading emits is refused (alias-mutation, so graded): the value reading lost that
  write before (the A2 pair's own unit: model 1 against Node 2, withheld only by the identity guard).
- The certificate: `lanes.A.opaque = { steps: [{ rule, line, id, reads, writes, construct, span, findings,
  statements }], fraction, statements, covered, parent }`; `pr.mjs` shows `(opaque N)` beside lane A.
- `tests/break.mjs` (A6): `LEAN_BREAK=<mechanism>`, `broken(name)`, the registry, the `break` rows of a pair.
  Mechanisms: `opaque-drop-read`, `opaque-drop-write`, `opaque-drop-callees`.
- Pairs: `opaque_<rule>` for the thirteen rules plus `opaque_callee` (A3).

RESULTS_BELOW
