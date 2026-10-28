# lean report: 56a662b4ebccf9e50acddcec38816060c89e8f5b → 760ade5f1360357d00d2aeb94e9314a6e6073a46

Identity: d7e09d4cd353db5680440f5f0814d619d4140cc018958a401d606e29b47df67d; lean 815fc01fec5f51af99003faa686f25330e7c33ad

3 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 3 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-useless-return.js | `(edit 4c06040d1c10)` (257-257) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-return.js | `(edit 4bce6c1ff58c)` (258-258) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-useless-return.js | `(edit e941637fdba4)` (259-259) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 3 = 0 unit + 0 artifact + 3 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 4c06040d1c10c7ff2f78ac388af2ef44ab3ce937e21853931bebe8cc04528549 | lib/rules/no-useless-return.js | text | 256+0 | 257+1 | unassigned: object-literal member |  |
| 4bce6c1ff58c52632563786cddc5d83fb0228e27a001d99b70de8d83d688587e | lib/rules/no-useless-return.js | text | 256+0 | 258+1 | unassigned: object-literal member |  |
| e941637fdba4e4b92dab13d43358e4081e7afa6d5239164da5d7dcc765e3a165 | lib/rules/no-useless-return.js | text | 256+0 | 259+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["4c06040d1c10c7ff2f78ac388af2ef44ab3ce937e21853931bebe8cc04528549","4bce6c1ff58c52632563786cddc5d83fb0228e27a001d99b70de8d83d688587e","e941637fdba4e4b92dab13d43358e4081e7afa6d5239164da5d7dcc765e3a165"]}

Task reconciliation: expected 3; terminal 3; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__165/run-EVDABB/terminal.json