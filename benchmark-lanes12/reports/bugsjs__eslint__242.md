# lean report: dbff37a680217a0034518398cf467540b651e735 → 04354d2541e925a9a8ddd6fc3dae6eabaef63bed

Identity: 1273a3b225b11fafb0f53f8341eac1114670c7f8b139ec2e7258d22210156e4d; lean 815fc01fec5f51af99003faa686f25330e7c33ad

3 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 3 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-useless-return.js | `(edit cf6f85a5c389)` (110-110) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-return.js | `(edit 0066b96fd3fd)` (179-179) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-return.js | `(edit 1d7d2796f84c)` (182-182) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 3 = 0 unit + 0 artifact + 3 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| cf6f85a5c389bd45dacb63335c9c2ee75cfe1bf2607cceee4a30e8f92e43f398 | lib/rules/no-useless-return.js | text | 109+0 | 110+1 | unassigned: object-literal member |  |
| 0066b96fd3fd83bb5cf998c9d667ff7a768a743a7e754a8ebe970ca727dd713f | lib/rules/no-useless-return.js | text | 177+0 | 179+1 | unassigned: object-literal member |  |
| 1d7d2796f84c7c8a85e51dee3fff432e9a33fc99bb1ea82777bad217b39ece51 | lib/rules/no-useless-return.js | text | 179+0 | 182+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["cf6f85a5c389bd45dacb63335c9c2ee75cfe1bf2607cceee4a30e8f92e43f398","0066b96fd3fd83bb5cf998c9d667ff7a768a743a7e754a8ebe970ca727dd713f","1d7d2796f84c7c8a85e51dee3fff432e9a33fc99bb1ea82777bad217b39ece51"]}

Task reconciliation: expected 3; terminal 3; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__242/run-5x0uWV/terminal.json