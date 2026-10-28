# lean report: 1260e60bfcbdd7f44ae3c877b8a737c55cb02667 → a2d8bd4eeed522e16476a2ea7283f7047346baa5

Identity: 62fcb30015d327d26bcee45b63a0154fd78e52a53416a971693cb3cae1c45a7d; lean 815fc01fec5f51af99003faa686f25330e7c33ad

2 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 2 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-unused-vars.js | `(edit c829a2e753e8)` (65-65) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/rules/no-unused-vars.js | `(edit 024edb5dae65)` (65-65) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 2 = 0 unit + 0 artifact + 2 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| c829a2e753e8948c338091f3b0e89d3cd673193ef7bd9c430089aa43c67669b4 | lib/rules/no-unused-vars.js | text | 65+1 | 65+0 | unassigned: exported property assignment |  |
| 024edb5dae658298d1475c649c43b8549262f97bd942cef07e55d78f40b4ebd8 | lib/rules/no-unused-vars.js | text | 65+0 | 65+1 | unassigned: exported property assignment |  |

source: {"unit":[],"artifact":[],"unassigned":["c829a2e753e8948c338091f3b0e89d3cd673193ef7bd9c430089aa43c67669b4","024edb5dae658298d1475c649c43b8549262f97bd942cef07e55d78f40b4ebd8"]}

Task reconciliation: expected 2; terminal 2; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__323/run-4YjTGf/terminal.json