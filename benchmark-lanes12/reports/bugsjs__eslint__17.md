# lean report: ea1b15d3f996f10b63fcaec2efb44efdb7cda3a0 → 52badc0bbbbb55896d4153af53d37d10e64e6340

Identity: 87ae3ea7c676b33766faf608e5bcd397571a7036169ccdf431da121a1225f840; lean 815fc01fec5f51af99003faa686f25330e7c33ad

3 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 1 PASS-bounded · 2 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/indent.js | `OffsetStorage.getDesiredIndent` (415-456) | **PASS-bounded** | refused:ts-strict | PASS-bounded |  | TS2531: Object is possibly 'null'. |
| lib/rules/indent.js | `(edit f3e39d22609f)` (839-839) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 6da60cb63159)` (840-840) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

## What would make the asks provable

### lib/rules/indent.js · `OffsetStorage.getDesiredIndent`

- line 254, `ts-strict`: TS2531: Object is possibly 'null'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 261, `unresolved-module`: TS2304: Cannot find name 'Token'.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 262, `unresolved-module`: TS2304: Cannot find name 'Token'.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 329, `unresolved-module`: TS2304: Cannot find name 'Token'.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 330, `unresolved-module`: TS2304: Cannot find name 'Token'.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 335, `ts-strict`: TS2554: Expected 4 arguments, but got 3.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 359, `unresolved-module`: TS2304: Cannot find name 'Token'.
  do: [migration] The project cannot resolve this import; the proof reads it as opaque.
- line 383, `ts-strict`: TS2531: Object is possibly 'null'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 3 = 1 unit + 0 artifact + 2 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 24187915a8643dca4db20bc1ba317757fbb344a80d920d87a469b443edd3df6d | lib/rules/indent.js | text | 444+0 | 445+1 | unit: OffsetStorage.getDesiredIndent | new:OffsetStorage.getDesiredIndent |
| f3e39d22609fd6d71d142e73b9be8947c09a32e0bb036f3bb8370a5a667e55d6 | lib/rules/indent.js | text | 839+1 | 840+0 | unassigned: object-literal member |  |
| 6da60cb631591385b0a1e51848b57f8cdee5c335a12a856a995b215a1647a50d | lib/rules/indent.js | text | 839+0 | 840+1 | unassigned: object-literal member |  |

source: {"unit":["24187915a8643dca4db20bc1ba317757fbb344a80d920d87a469b443edd3df6d"],"artifact":[],"unassigned":["f3e39d22609fd6d71d142e73b9be8947c09a32e0bb036f3bb8370a5a667e55d6","6da60cb631591385b0a1e51848b57f8cdee5c335a12a856a995b215a1647a50d"]}

Task reconciliation: expected 3; terminal 3; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__17/run-v95aWs/terminal.json