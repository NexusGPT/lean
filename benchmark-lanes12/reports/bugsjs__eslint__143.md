# lean report: c794f86ee9c83cb08c18e093c00af1debf7e6953 → be4ffb4bfea42f91555e1d53d0eeaca286f024f0

Identity: 10b549d198c31d9473848155e0b5f63d020cddcb4e38ca71000e73cfa554b2e6; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 4 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-extra-parens.js | `(edit 114fada8eaf3)` (421-421) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-extra-parens.js | `(edit ba7593de6cad)` (430-430) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-extra-parens.js | `(edit 949632268757)` (431-431) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-extra-parens.js | `(edit e173ca1c6b69)` (432-432) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 0 unit + 0 artifact + 4 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 114fada8eaf3c02f2d7e425e0b0a88b5245d1327a89d7c62feda6dc1c39b71f2 | lib/rules/no-extra-parens.js | text | 420+0 | 421+1 | unassigned: object-literal member |  |
| ba7593de6cada5e3609675e857c5ab41d8d8eac20184afe4b7ee85a26c58240e | lib/rules/no-extra-parens.js | text | 430+1 | 431+0 | unassigned: object-literal member |  |
| 94963226875722555127575bd29b4ec6aa2cee1e328aff904898e35b21794a3c | lib/rules/no-extra-parens.js | text | 430+0 | 431+1 | unassigned: object-literal member |  |
| e173ca1c6b6988e3d23bc721afaeac57d28f28f042396496a18b917172e806bd | lib/rules/no-extra-parens.js | text | 430+0 | 432+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["114fada8eaf3c02f2d7e425e0b0a88b5245d1327a89d7c62feda6dc1c39b71f2","ba7593de6cada5e3609675e857c5ab41d8d8eac20184afe4b7ee85a26c58240e","94963226875722555127575bd29b4ec6aa2cee1e328aff904898e35b21794a3c","e173ca1c6b6988e3d23bc721afaeac57d28f28f042396496a18b917172e806bd"]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__143/run-Swqjfr/terminal.json