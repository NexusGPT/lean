# lean report: 931e0a298c7d5c4caabb8407f1c2ee8714115fa6 → 78513dcc40e0bc129dc94148e171ab8cf23d51b2

Identity: 56d6bea41e7b9b9179dcbdd26948e42d69b89c527265638ba3afffa37f6dce12; lean 815fc01fec5f51af99003faa686f25330e7c33ad

5 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 5 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-undef.js | `(edit 43731643f524)` (65-65) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/rules/no-undef.js | `(edit 9a129bd28bc1)` (66-66) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/rules/no-undef.js | `(edit b5d8930b9513)` (65-65) | **ASK** | unassigned:exported property assignment |  |  | exported property assignment |
| lib/rules/no-undef.js | `(edit b704be701837)` (87-87) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-undef.js | `(edit fa2252418c0a)` (88-88) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 5 = 0 unit + 0 artifact + 5 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 43731643f5240d328b1942407c17fbc17749fbff7dbf12f413a9efbdd3163a3c | lib/rules/no-undef.js | text | 65+1 | 65+0 | unassigned: exported property assignment |  |
| 9a129bd28bc16c0284a2b79066aa64b359b887df5609bc372b57d19d4c281524 | lib/rules/no-undef.js | text | 66+1 | 65+0 | unassigned: exported property assignment |  |
| b5d8930b9513a63f5a0a2e7ae0b2ed6f85c62e56763cf194f36e7eba7ac9a5e7 | lib/rules/no-undef.js | text | 65+0 | 65+1 | unassigned: exported property assignment |  |
| b704be70183706aec45a418fb7cbbf05a7c6e6d8d47ec5f119f601c5a2e41d35 | lib/rules/no-undef.js | text | 87+1 | 85+0 | unassigned: object-literal member |  |
| fa2252418c0a2dabf5d6d62a0ab905ddc37828caabe3a7003fbb135e0a0a0537 | lib/rules/no-undef.js | text | 88+1 | 85+0 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["43731643f5240d328b1942407c17fbc17749fbff7dbf12f413a9efbdd3163a3c","9a129bd28bc16c0284a2b79066aa64b359b887df5609bc372b57d19d4c281524","b5d8930b9513a63f5a0a2e7ae0b2ed6f85c62e56763cf194f36e7eba7ac9a5e7","b704be70183706aec45a418fb7cbbf05a7c6e6d8d47ec5f119f601c5a2e41d35","fa2252418c0a2dabf5d6d62a0ab905ddc37828caabe3a7003fbb135e0a0a0537"]}

Task reconciliation: expected 5; terminal 5; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__187/run-xLlBZD/terminal.json