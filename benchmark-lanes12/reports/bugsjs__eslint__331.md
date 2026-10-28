# lean report: 5122f738dc6bdc85c602758b2fa3560c1ac5dceb → a4a0fb0aca75812e70ae878c413069af27903270

Identity: 265115d7ebd5ef1dd8852223032ea8172d68e3455ede8390f7678dc4a42f8c74; lean 815fc01fec5f51af99003faa686f25330e7c33ad

2 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 2 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/config/config-file.js | `(edit 485866e2f15b)` (385-385) | **ASK** | artifact:config |  |  | config |
| lib/config/config-file.js | `(edit 05529fa17210)` (385-385) | **ASK** | artifact:config |  |  | config |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 2 = 0 unit + 2 artifact + 0 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 485866e2f15bc68fbc6a0dc8137ab86d89c88b86027d31009b4c4619621f8303 | lib/config/config-file.js | text | 385+1 | 385+0 | artifact: config | old:applyExtends |
| 05529fa172100ef3de36b4fcecf6f2df0940d5021e0e6dbf55173028e386a65e | lib/config/config-file.js | text | 385+0 | 385+1 | artifact: config | new:applyExtends |

config: {"unit":[],"artifact":["485866e2f15bc68fbc6a0dc8137ab86d89c88b86027d31009b4c4619621f8303","05529fa172100ef3de36b4fcecf6f2df0940d5021e0e6dbf55173028e386a65e"],"unassigned":[]}

Task reconciliation: expected 2; terminal 2; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__331/run-nzREMD/terminal.json