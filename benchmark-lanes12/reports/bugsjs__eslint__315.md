# lean report: 3e9936371df8235c1dfe5f7d58fad4632e45e975 → 7debeb21011e32691a7185d6631b596115dd3bb3

Identity: 6ff583439d9ee0a5978d7efefae05150bfb47e4294c6b2f798d6db9af78d051a; lean 815fc01fec5f51af99003faa686f25330e7c33ad

2 changed function(s): **0 in scope · 0 WITNESS · 0 PASS-proved · 0 PASS-decided · 0 PASS-bounded · 2 ASK · 0 REFUSE · 0 NEW**

| file | function | verdict | coverage | lane B | lane A | note |
|---|---|---|---|---|---|---|
| lib/rules/no-await-in-loop.js | `(edit 4f1810bb9c0e)` (87-87) | **ASK** | unassigned:object-literal member |  |  | object-literal member |
| lib/rules/no-await-in-loop.js | `(edit 6e07aaf86a61)` (87-87) | **ASK** | unassigned:object-literal member |  |  | object-literal member |

A WITNESS is an input on which the two versions differ; PASS-proved is a theorem checked by Dafny; PASS-decided is a finite component explored over every event sequence; PASS-bounded is no difference found within the stated bound; ASK is undecided with its reason; REFUSE(load) names a local source linkage failure; candidate-only evaluation failures are ASK with their environment class; NEW records a standalone run and makes no equality claim.

## Change ledger

Edit reconciliation: 2 = 0 unit + 0 artifact + 2 unassigned; identities complete.

| edit | file | kind | old span | new span | primary | secondary units |
|---|---|---|---|---|---|---|
| 4f1810bb9c0e2967683c42f96932af70d9eab7d60d1ac50fdb0172fe81a5868c | lib/rules/no-await-in-loop.js | text | 87+1 | 87+0 | unassigned: object-literal member |  |
| 6e07aaf86a6131a3b4c835e73f13640f3a4b43f350616b965008d106cf3a452a | lib/rules/no-await-in-loop.js | text | 87+0 | 87+1 | unassigned: object-literal member |  |

source: {"unit":[],"artifact":[],"unassigned":["4f1810bb9c0e2967683c42f96932af70d9eab7d60d1ac50fdb0172fe81a5868c","6e07aaf86a6131a3b4c835e73f13640f3a4b43f350616b965008d106cf3a452a"]}

Task reconciliation: expected 2; terminal 2; missing 0; unexpected 0; identities complete.
Durable ledger: /Users/assem/nexus/nexus-organisation/work/lean-lanes/change-ledger/benchmark-lanes12/lean-runs/bugsjs__eslint__315/run-Ot77s6/terminal.json