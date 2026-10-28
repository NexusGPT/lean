# lean report: 100c6e123ed4522f7e0378c9fb2035d45f30984e → 39aea6119a2940e268281ce696c46aec8523c778

Identity: f7a9f41fc9818bdc634c82c741854bc802ed6cda04e73e4e7acf08be8d8e2fed; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 4 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/indent.js | `(edit 675e12615670)` (267-267) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 6e9237b2c69e)` (267-267) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 95fa8a37debd)` (270-270) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 196c648fe79d)` (270-270) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 0 unit + 0 artifact + 4 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 675e1261567033157f32aab2c4205852bc57c5930a7c124b5f77eac7a0c30cd0 | lib/rules/indent.js | text | 267+1 | 267+0 | unassigned: object-literal member |  |
| 6e9237b2c69e77bd18b9e8010879e989909a528d24fbe7f65f61cc58cf874e1b | lib/rules/indent.js | text | 267+0 | 267+1 | unassigned: object-literal member |  |
| 95fa8a37debd024f6cc94a61838150fc53d65f0aaca2a6f5b08d1d701b676365 | lib/rules/indent.js | text | 270+1 | 270+0 | unassigned: object-literal member |  |
| 196c648fe79d858247d05220c5326f2f4500e3670cea308215505fa35d1ba9c9 | lib/rules/indent.js | text | 270+0 | 270+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["675e1261567033157f32aab2c4205852bc57c5930a7c124b5f77eac7a0c30cd0","6e9237b2c69e77bd18b9e8010879e989909a528d24fbe7f65f61cc58cf874e1b","95fa8a37debd024f6cc94a61838150fc53d65f0aaca2a6f5b08d1d701b676365","196c648fe79d858247d05220c5326f2f4500e3670cea308215505fa35d1ba9c9"]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__319/run-NvoiPE/terminal.json