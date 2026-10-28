# lean report: 6f914160209c16c640d36db8565a968c4e63d3dc → 8eddcfe9472d14858831efccd8f707f7076a6d6a

Identity: 1e31e62b8b2d4b2c0f777d93f3909aa15761b86d31d2d66d774597785395a029; lean 815fc01fec5f51af99003faa686f25330e7c33ad

4 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 4 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/response.js | `(edit 552a26a8e799)` (821-821) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/response.js | `(edit f76fc063acd5)` (821-821) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/response.js | `(edit 7d7f890a7b17)` (825-825) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/response.js | `(edit 9001bb582a02)` (825-825) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 4 = 0 unit + 0 artifact + 4 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 552a26a8e799d32c8f6c57c523ff85f364715f67795297e1466c6779af053f1e | lib/response.js | text | 821+1 | 821+0 | unassigned: object-literal member |  |
| f76fc063acd52a535d818627643ab549f78ab30f63d1ef80b96ac2f9bc4faa9e | lib/response.js | text | 821+0 | 821+1 | unassigned: object-literal member |  |
| 7d7f890a7b1790ff7408edc5d26aec32fc438a3aed772cc6c25e9ef2dfbb1c30 | lib/response.js | text | 825+1 | 825+0 | unassigned: object-literal member |  |
| 9001bb582a02ef8b9af98e5bf4b36b49a580bca10e75a014af64654d90bcc104 | lib/response.js | text | 825+0 | 825+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["552a26a8e799d32c8f6c57c523ff85f364715f67795297e1466c6779af053f1e","f76fc063acd52a535d818627643ab549f78ab30f63d1ef80b96ac2f9bc4faa9e","7d7f890a7b1790ff7408edc5d26aec32fc438a3aed772cc6c25e9ef2dfbb1c30","9001bb582a02ef8b9af98e5bf4b36b49a580bca10e75a014af64654d90bcc104"]}

Task reconciliation: expected 4; terminal 4; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__express__16/run-fcmPNB/terminal.json