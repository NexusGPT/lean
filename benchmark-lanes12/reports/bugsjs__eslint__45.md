# lean report: 660e0918933e6e7fede26bc675a0763a6b357c94 → 16620d12828e70c83b1165d06de6c72ae3af302b

Identity: 143e97463559fda395ef91d2456fe110619977249a0a3e7c173456340edfd5f3; lean 815fc01fec5f51af99003faa686f25330e7c33ad

5 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 5 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/max-len.js | `(edit cda9e3102ffe)` (238-238) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/max-len.js | `(edit d6585a04fbd3)` (239-239) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/max-len.js | `(edit 5a1616ebf336)` (238-238) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/max-len.js | `(edit 8e01881e1a48)` (239-239) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/max-len.js | `(edit 867fac271d1c)` (240-240) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 5 = 0 unit + 0 artifact + 5 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| cda9e3102ffe588d57a210ce429a47d36765065cacf9e53c329047345a81756a | lib/rules/max-len.js | text | 238+1 | 238+0 | unassigned: object-literal member |  |
| d6585a04fbd3c14a9faa8978d637992394a7467f87c38622c5d4342dae5df0cc | lib/rules/max-len.js | text | 239+1 | 238+0 | unassigned: object-literal member |  |
| 5a1616ebf3364ef0c4e1250759db2e774291aec9a4ba2a6443a862d7eec0ed61 | lib/rules/max-len.js | text | 238+0 | 238+1 | unassigned: object-literal member |  |
| 8e01881e1a48e6cfab46d1a090c83802d34af38e9e616abdbe617fe8bfe736a0 | lib/rules/max-len.js | text | 238+0 | 239+1 | unassigned: object-literal member |  |
| 867fac271d1cebb75a210317930f7bde8f1c25c045252e1bf3dc736c625d1ae8 | lib/rules/max-len.js | text | 238+0 | 240+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["cda9e3102ffe588d57a210ce429a47d36765065cacf9e53c329047345a81756a","d6585a04fbd3c14a9faa8978d637992394a7467f87c38622c5d4342dae5df0cc","5a1616ebf3364ef0c4e1250759db2e774291aec9a4ba2a6443a862d7eec0ed61","8e01881e1a48e6cfab46d1a090c83802d34af38e9e616abdbe617fe8bfe736a0","867fac271d1cebb75a210317930f7bde8f1c25c045252e1bf3dc736c625d1ae8"]}

Task reconciliation: expected 5; terminal 5; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__45/run-j4gWQh/terminal.json