# lean report: 77bcee412bbc40b5be810f974db48e0d9964a7bc → bafa10411906d3a8a5d5601edd10fe0e7175056b

Identity: 7392fa5765953cd1953edbd103727a2a92bb81c9b8f29b3a97b0cd9d156ccbd2; lean 815fc01fec5f51af99003faa686f25330e7c33ad

1 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 1 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/linter.js | `Linter.verifyAndFix` (1207-1263) | **ASK** | refused:ts-strict | ASK |  | parent: unit Linter.verifyAndFix not exported |

## What would make the asks provable

### lib/linter.js · `Linter.verifyAndFix`

- line 725, `ts-strict`: TS2339: Property 'setMaxListeners' does not exist on type 'Linter'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 733, `ts-strict`: TS2339: Property 'removeAllListeners' does not exist on type 'Linter'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 763, `ts-strict`: TS8032: Qualified name 'filenameOrOptions.allowInlineConfig' is not allowed without a leading '@param {object} filenameOrOptions'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 775, `ts-strict`: TS2339: Property 'filename' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 776, `ts-strict`: TS2339: Property 'allowInlineConfig' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 777, `ts-strict`: TS2339: Property 'saveState' does not exist on type 'Object'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 787, `ts-strict`: TS2339: Property 'text' does not exist on type 'string | SourceCode'.   Property 'text' does not exist on type 'string'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.
- line 800, `ts-strict`: TS2696: The 'Object' type is assignable to very few other types. Did you mean to use the 'any' type instead?   Property 'rules' is missing in type 'Object' but required in type 'ESLintConfig'.
  do: [migration] A type error under strict mode; the proof needs the types to hold.


A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 2 = 2 unit + 0 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 025737e2f3e215f488f4cf4f7175e26416d33d298bdc78709b2ec01db49a2698 | lib/linter.js | text | 1213+1 | 1213+0 | unit: Linter.verifyAndFix | old:Linter.verifyAndFix |
| 76cab08413b087c103594d3eb053f725d762f9bdb286a5d22b7ace9865d3b575 | lib/linter.js | text | 1213+0 | 1213+1 | unit: Linter.verifyAndFix | new:Linter.verifyAndFix |

source: {"unit":["025737e2f3e215f488f4cf4f7175e26416d33d298bdc78709b2ec01db49a2698","76cab08413b087c103594d3eb053f725d762f9bdb286a5d22b7ace9865d3b575"],"artifact":[],"unassigned":[]}

Task reconciliation: expected 1; terminal 1; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__325/run-pfT6OV/terminal.json