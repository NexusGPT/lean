# lean report: 6a5cd32e5a75b23558ad0282e080ffbb6affcad0 → 2a83dbcb770bc26a31fc9a3fa75ed57ddcbf48f5

Identity: f31cd8bdce94e74ef3b99c661535435a737584c3cbc7c6e3cddc7068ccdd949a; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 4 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/indent.js | `(edit d43926110ece)` (1097-1097) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 6ea7b437ca4e)` (1098-1098) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 73b046111a0a)` (1097-1097) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/indent.js | `(edit 27acf2001f52)` (1098-1098) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 0 unit + 0 artifact + 4 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| d43926110ecee130abecd087d46e1001bcaac3d2dfe857c6c4a30d30b069eb01 | lib/rules/indent.js | text | 1097+1 | 1097+0 | unassigned: object-literal member |  |
| 6ea7b437ca4eea36e8a51afa414fdddf200220896aaf326742dffb81a0c7cb3e | lib/rules/indent.js | text | 1098+1 | 1097+0 | unassigned: object-literal member |  |
| 73b046111a0ab2d1f0aac0f11919f22fda7aee1bf863c42e887e98081006ee7e | lib/rules/indent.js | text | 1097+0 | 1097+1 | unassigned: object-literal member |  |
| 27acf2001f529dbcccf3f5c95ce0fb24be3180a21125b154085d9d22c2aaaeea | lib/rules/indent.js | text | 1097+0 | 1098+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["d43926110ecee130abecd087d46e1001bcaac3d2dfe857c6c4a30d30b069eb01","6ea7b437ca4eea36e8a51afa414fdddf200220896aaf326742dffb81a0c7cb3e","73b046111a0ab2d1f0aac0f11919f22fda7aee1bf863c42e887e98081006ee7e","27acf2001f529dbcccf3f5c95ce0fb24be3180a21125b154085d9d22c2aaaeea"]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__212/run-j5ta6t/terminal.json