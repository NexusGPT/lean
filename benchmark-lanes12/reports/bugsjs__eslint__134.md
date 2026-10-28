# lean report: 9106964d176c9ee46dba9fa5857fba507cde350a → a394a9fb59f36867072b9224c38da80ec2712cbd

Identity: ecc619544420f5554beb684c9b672c1d549b1659800eb6992c75c62541862089; lean 815fc01fec5f51af99003faa686f25330e7c33ad

6 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 6 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-useless-escape.js | `(edit db5b19633b06)` (135-135) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 9666660c28d2)` (136-136) | **ASK** | unassigned:whitespace |  |  | whitespace |
| lib/rules/no-useless-escape.js | `(edit ae24d41d2bf7)` (137-137) | **ASK** | unassigned:comment |  |  | comment |
| lib/rules/no-useless-escape.js | `(edit 9c01ed69e709)` (138-138) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 3b5dae4b8bb2)` (139-139) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-escape.js | `(edit 2fcc004a7ed7)` (140-140) | **ASK** | unassigned:whitespace |  |  | whitespace |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 6 = 0 unit + 0 artifact + 6 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| db5b19633b066e219cc9cae4c8846f97c5a200c7dafaba6b3fc5e212bab27aef | lib/rules/no-useless-escape.js | text | 134+0 | 135+1 | unassigned: object-literal member |  |
| 9666660c28d27181a5bad5957ab2fa3f8e86e57cebc21e00f398840bb407e798 | lib/rules/no-useless-escape.js | text | 134+0 | 136+1 | unassigned: whitespace |  |
| ae24d41d2bf7a3ab76736b08dfedd8dff5bb3cda4c840d5772379e3ee4b32c75 | lib/rules/no-useless-escape.js | text | 134+0 | 137+1 | unassigned: comment |  |
| 9c01ed69e709633287b5a667045b003521d6578b386a07cb769abb888e2b1905 | lib/rules/no-useless-escape.js | text | 134+0 | 138+1 | unassigned: object-literal member |  |
| 3b5dae4b8bb251a0730b12fa0947290707a5fbca444800417a2f36d869da0845 | lib/rules/no-useless-escape.js | text | 134+0 | 139+1 | unassigned: object-literal member |  |
| 2fcc004a7ed76efc85143b51eda3864d6d3ca722fd00c2c3f7afaa75e07f287f | lib/rules/no-useless-escape.js | text | 134+0 | 140+1 | unassigned: whitespace |  |

source: {"unit":[],"artifact":[],"unassigned":["db5b19633b066e219cc9cae4c8846f97c5a200c7dafaba6b3fc5e212bab27aef","9666660c28d27181a5bad5957ab2fa3f8e86e57cebc21e00f398840bb407e798","ae24d41d2bf7a3ab76736b08dfedd8dff5bb3cda4c840d5772379e3ee4b32c75","9c01ed69e709633287b5a667045b003521d6578b386a07cb769abb888e2b1905","3b5dae4b8bb251a0730b12fa0947290707a5fbca444800417a2f36d869da0845","2fcc004a7ed76efc85143b51eda3864d6d3ca722fd00c2c3f7afaa75e07f287f"]}

Task reconciliation: expected 6; terminal 6; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__134/run-wUentR/terminal.json